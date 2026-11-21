#![no_std]

mod escrow;
mod model;
pub use model::{Error, Outcome, Rules, Settings, Team, Tournament, Verification};

use model::*;
use soroban_sdk::{contract, contractimpl, token, xdr::ToXdr, Address, BytesN, Env, Vec};

fn get<V: soroban_sdk::TryFromVal<Env, soroban_sdk::Val>>(e: &Env, key: &Key) -> Option<V> {
    let storage = e.storage().persistent();
    let value = storage.get(key);
    if value.is_some() {
        storage.extend_ttl(key, 120_000, e.storage().max_ttl());
    }
    value
}

fn save<V: soroban_sdk::IntoVal<Env, soroban_sdk::Val>>(e: &Env, key: &Key, value: &V) {
    let storage = e.storage().persistent();
    storage.set(key, value);
    storage.extend_ttl(key, 120_000, e.storage().max_ttl());
}

fn settings(e: &Env) -> Settings {
    get(e, &Key::Settings).unwrap()
}

fn load(e: &Env, id: &BytesN<32>) -> Result<Tournament, Error> {
    get(e, &Key::Tournament(id.clone())).ok_or(Error::Unknown)
}

fn open(t: &Tournament, now: u64) -> bool {
    !t.cancelled && t.roster_hash.is_none() && now < t.rules.deadline
}

fn team(e: &Env, id: &BytesN<32>, name: &BytesN<32>) -> Result<Team, Error> {
    get(e, &Key::Team(id.clone(), name.clone())).ok_or(Error::Unknown)
}

fn is_winner(e: &Env, id: &BytesN<32>, outcome: &Outcome, member: &Address) -> bool {
    let key = Key::Member(id.clone(), member.clone());
    get::<BytesN<32>>(e, &key).is_some_and(|slot| outcome.places.contains(&slot))
}

fn new_outcome(
    e: &Env,
    t: &Tournament,
    places: Vec<BytesN<32>>,
    evidence: BytesN<32>,
    revision: u32,
) -> Result<Outcome, Error> {
    if places.len() != t.rules.place_weights.len() || evidence == BytesN::from_array(e, &[0; 32]) {
        return Err(Error::Invalid);
    }
    let mut visited = Vec::new(e);
    for place in places.iter() {
        if visited.contains(&place) || !t.locked_teams.contains(&place) {
            return Err(Error::Invalid);
        }
        visited.push_back(place);
    }
    Ok(Outcome {
        places,
        evidence,
        challenge_ends: e
            .ledger()
            .timestamp()
            .checked_add(WINDOW)
            .ok_or(Error::Invalid)?,
        approved: false,
        disputed: false,
        revision,
    })
}

fn cancelled(e: &Env, id: &BytesN<32>, t: &mut Tournament, automatic: bool) {
    t.cancelled = true;
    save(e, &Key::Tournament(id.clone()), t);
    Cancelled {
        id: id.clone(),
        automatic,
    }
    .publish(e);
}

#[contract]
pub struct SutikaCoreV3;

#[contractimpl]
impl SutikaCoreV3 {
    pub fn __constructor(e: Env, config: Settings) {
        save(&e, &Key::Settings, &config);
    }

    pub fn create(e: Env, id: BytesN<32>, rules: Rules) -> Result<(), Error> {
        rules.organizer.require_auth();
        let config = settings(&e);
        let me = e.current_contract_address();
        let now = e.ledger().timestamp();
        if rules.mode > MIXED
            || ![1, 5].contains(&rules.team_size)
            || rules.min_teams < 4
            || rules.max_teams < rules.min_teams
            || rules.max_teams > 16
            || rules.referee == rules.organizer
            || rules.referee == rules.sponsor
            || rules.referee == config.escrow_admin
            || rules.organizer == me
            || [me.clone(), config.platform, config.protocol].contains(&rules.sponsor)
            || rules.referee == me
            || rules.deadline <= now
            || rules.deadline - now > 30 * WINDOW
            || ![1, 3].contains(&rules.place_weights.len())
            || !valid_weights(&rules.place_weights)
            || (rules.mode == SPONSORED && rules.entry_fee != 0)
            || (rules.mode != SPONSORED && !(MIN_ENTRY..=MAX_AMOUNT).contains(&rules.entry_fee))
            || (rules.mode == ENTRY && !rules.sponsor_parts.is_empty())
            || (rules.mode != ENTRY
                && (rules.sponsor_parts.len() != rules.place_weights.len()
                    || rules
                        .sponsor_parts
                        .iter()
                        .any(|n| !(1_000..=MAX_AMOUNT * 2).contains(&n))))
        {
            return Err(Error::Invalid);
        }
        let key = Key::Tournament(id.clone());
        if e.storage().persistent().has(&key) {
            return Err(Error::Exists);
        }
        let organizer = rules.organizer.clone();
        save(
            &e,
            &key,
            &Tournament {
                rules,
                escrow: None,
                teams: Vec::new(&e),
                locked_teams: Vec::new(&e),
                roster_hash: None,
                entry_gross: 0,
                entry_locked: 0,
                outcome: Vec::new(&e),
                cancelled: false,
                paid_slots: Vec::new(&e),
                sponsor_refunded: false,
            },
        );
        Created { id, organizer }.publish(&e);
        Ok(())
    }

    pub fn fund_sponsor(
        e: Env,
        id: BytesN<32>,
        escrow_address: Address,
        salt: BytesN<32>,
    ) -> Result<(), Error> {
        let mut t = load(&e, &id)?;
        if !open(&t, e.ledger().timestamp()) || t.rules.mode == ENTRY || t.escrow.is_some() {
            return Err(Error::WrongPhase);
        }
        t.rules.sponsor.require_auth();
        let escrow_key = Key::Escrow(escrow_address.clone());
        if e.storage().persistent().has(&escrow_key) {
            return Err(Error::Exists);
        }
        let amount = escrow::fund(&e, &t, &settings(&e), &escrow_address, salt)?;
        t.escrow = Some(escrow_address.clone());
        save(&e, &escrow_key, &id);
        save(&e, &Key::Tournament(id.clone()), &t);
        Funded {
            id,
            sponsor: t.rules.sponsor,
            escrow: escrow_address,
            amount,
        }
        .publish(&e);
        Ok(())
    }

    pub fn join(
        e: Env,
        id: BytesN<32>,
        team_id: BytesN<32>,
        member: Address,
        shares: Vec<u32>,
        captain: bool,
        slot: u32,
    ) -> Result<(), Error> {
        member.require_auth();
        let mut t = load(&e, &id)?;
        let config = settings(&e);
        if !open(&t, e.ledger().timestamp()) || (t.rules.mode != ENTRY && t.escrow.is_none()) {
            return Err(Error::WrongPhase);
        }
        if [
            e.current_contract_address(),
            t.rules.referee.clone(),
            config.platform,
            config.protocol,
        ]
        .contains(&member)
            || shares.len() != t.rules.team_size
            || !valid_weights(&shares)
        {
            return Err(Error::Invalid);
        }
        let membership = Key::Member(id.clone(), member.clone());
        if e.storage().persistent().has(&membership) {
            return Err(Error::Exists);
        }
        let team_key = Key::Team(id.clone(), team_id.clone());
        let mut roster = if captain {
            if t.teams.len() == t.rules.max_teams || e.storage().persistent().has(&team_key) {
                return Err(Error::Exists);
            }
            t.teams.push_back(team_id.clone());
            Team {
                payer: member.clone(),
                members: Vec::new(&e),
                weights: shares.clone(),
                contribution: t.rules.entry_fee,
                refunded: false,
            }
        } else {
            team(&e, &id, &team_id)?
        };
        if slot != roster.members.len() || slot >= t.rules.team_size || roster.weights != shares {
            return Err(Error::Invalid);
        }
        let amount = if captain { roster.contribution } else { 0 };
        t.entry_gross += amount;
        roster.members.push_back(member.clone());
        if amount > 0 {
            token::TokenClient::new(&e, &config.token).transfer(
                &member,
                &e.current_contract_address(),
                &amount,
            );
        }
        save(&e, &membership, &team_id);
        save(&e, &team_key, &roster);
        save(&e, &Key::Tournament(id.clone()), &t);
        Joined {
            id,
            team: team_id,
            member,
            amount,
        }
        .publish(&e);
        Ok(())
    }

    pub fn freeze(e: Env, id: BytesN<32>) -> Result<(), Error> {
        let mut t = load(&e, &id)?;
        if t.cancelled || t.roster_hash.is_some() {
            return Err(Error::WrongPhase);
        }
        let now = e.ledger().timestamp();
        let mut snapshots = Vec::new(&e);
        for name in t.teams.iter() {
            let r = team(&e, &id, &name)?;
            if r.members.len() == t.rules.team_size {
                t.entry_locked += r.contribution;
                t.locked_teams.push_back(name.clone());
                snapshots.push_back((name, r.members, r.weights));
            }
        }
        if t.locked_teams.len() < t.rules.min_teams {
            if now < t.rules.deadline {
                return Err(Error::Waiting);
            }
            cancelled(&e, &id, &mut t, true);
            return Ok(());
        }
        t.rules.organizer.require_auth();
        if t.locked_teams.len() < t.rules.max_teams && now < t.rules.deadline {
            return Err(Error::Waiting);
        }
        let roster_hash = e.crypto().sha256(&snapshots.to_xdr(&e)).to_bytes();
        t.roster_hash = Some(roster_hash.clone());
        save(&e, &Key::Tournament(id.clone()), &t);
        Frozen { id, roster_hash }.publish(&e);
        Ok(())
    }

    pub fn declare(
        e: Env,
        id: BytesN<32>,
        places: Vec<BytesN<32>>,
        evidence: BytesN<32>,
    ) -> Result<(), Error> {
        let mut t = load(&e, &id)?;
        t.rules.organizer.require_auth();
        if t.cancelled || t.roster_hash.is_none() || !t.outcome.is_empty() {
            return Err(Error::WrongPhase);
        }
        let outcome = new_outcome(&e, &t, places, evidence, 1)?;
        ResultPosted {
            id: id.clone(),
            challenge_ends: outcome.challenge_ends,
            revision: outcome.revision,
        }
        .publish(&e);
        t.outcome.push_back(outcome);
        save(&e, &Key::Tournament(id), &t);
        Ok(())
    }

    pub fn approve(e: Env, id: BytesN<32>, revision: u32) -> Result<(), Error> {
        let mut t = load(&e, &id)?;
        if t.rules.mode == ENTRY {
            t.rules.referee.require_auth();
        } else {
            t.rules.sponsor.require_auth();
        }
        let mut o = t.outcome.get(0).ok_or(Error::WrongPhase)?;
        if t.cancelled || o.disputed || o.approved || o.revision != revision {
            return Err(Error::WrongPhase);
        }
        escrow::approve(&e, &t, &settings(&e))?;
        o.approved = true;
        t.outcome.set(0, o);
        save(&e, &Key::Tournament(id), &t);
        Ok(())
    }

    pub fn dispute(e: Env, id: BytesN<32>, by: Address) -> Result<(), Error> {
        by.require_auth();
        let mut t = load(&e, &id)?;
        let mut o = t.outcome.get(0).ok_or(Error::WrongPhase)?;
        if t.cancelled || o.disputed || e.ledger().timestamp() >= o.challenge_ends {
            return Err(Error::WrongPhase);
        }
        let member_team: Option<BytesN<32>> = get(&e, &Key::Member(id.clone(), by.clone()));
        if !member_team.is_some_and(|name| t.locked_teams.contains(&name)) && by != t.rules.sponsor
        {
            return Err(Error::Unauthorized);
        }
        let key = Key::Challenged(id.clone(), by);
        if e.storage().persistent().has(&key) {
            return Err(Error::Exists);
        }
        save(&e, &key, &true);
        o.disputed = true;
        t.outcome.set(0, o);
        save(&e, &Key::Tournament(id), &t);
        Ok(())
    }

    pub fn resolve(
        e: Env,
        id: BytesN<32>,
        replacement: Vec<BytesN<32>>,
        evidence: BytesN<32>,
    ) -> Result<(), Error> {
        let mut t = load(&e, &id)?;
        t.rules.referee.require_auth();
        let mut o = t.outcome.get(0).ok_or(Error::WrongPhase)?;
        if t.cancelled || !o.disputed {
            return Err(Error::WrongPhase);
        }
        if replacement.is_empty() {
            o.disputed = false;
        } else {
            o = new_outcome(
                &e,
                &t,
                replacement,
                evidence,
                o.revision.checked_add(1).ok_or(Error::Invalid)?,
            )?;
            ResultPosted {
                id: id.clone(),
                challenge_ends: o.challenge_ends,
                revision: o.revision,
            }
            .publish(&e);
        }
        t.outcome.set(0, o);
        save(&e, &Key::Tournament(id), &t);
        Ok(())
    }

    pub fn verify(
        e: Env,
        id: BytesN<32>,
        member: Address,
        evidence: BytesN<32>,
        expires: u64,
    ) -> Result<(), Error> {
        let t = load(&e, &id)?;
        t.rules.referee.require_auth();
        let o = t.outcome.get(0).ok_or(Error::WrongPhase)?;
        let now = e.ledger().timestamp();
        if t.cancelled
            || o.disputed
            || !is_winner(&e, &id, &o, &member)
            || expires <= now
            || expires - now > WINDOW
            || evidence == BytesN::from_array(&e, &[0; 32])
        {
            return Err(Error::Invalid);
        }
        save(
            &e,
            &Key::Verified(id, member),
            &Verification { evidence, expires },
        );
        Ok(())
    }

    pub fn ready(e: Env, id: BytesN<32>, member: Address, revision: u32) -> Result<(), Error> {
        member.require_auth();
        let t = load(&e, &id)?;
        let o = t.outcome.get(0).ok_or(Error::WrongPhase)?;
        if t.cancelled || o.disputed || o.revision != revision || !is_winner(&e, &id, &o, &member) {
            return Err(Error::Unauthorized);
        }
        let credential: Verification =
            get(&e, &Key::Verified(id.clone(), member.clone())).ok_or(Error::NotVerified)?;
        if credential.expires <= e.ledger().timestamp() {
            return Err(Error::NotVerified);
        }
        save(&e, &Key::Ready(id, member), &o.revision);
        Ok(())
    }

    pub fn pay(e: Env, id: BytesN<32>, place: u32, revision: u32) -> Result<(), Error> {
        let mut t = load(&e, &id)?;
        let o = t.outcome.get(0).ok_or(Error::WrongPhase)?;
        if t.cancelled || !o.approved || o.revision != revision {
            return Err(Error::WrongPhase);
        }
        if o.disputed {
            return Err(Error::Disputed);
        }
        if t.paid_slots.contains(&place) {
            return Err(Error::Paid);
        }
        let now = e.ledger().timestamp();
        if now < o.challenge_ends {
            return Err(Error::Waiting);
        }
        let r = team(&e, &id, &o.places.get(place).ok_or(Error::Invalid)?)?;
        for member in r.members.iter() {
            let credential: Verification =
                get(&e, &Key::Verified(id.clone(), member.clone())).ok_or(Error::NotVerified)?;
            if credential.expires <= now {
                return Err(Error::NotVerified);
            }
            if get::<u32>(&e, &Key::Ready(id.clone(), member)) != Some(o.revision) {
                return Err(Error::NotReady);
            }
        }

        t.paid_slots.push_back(place);
        save(&e, &Key::Tournament(id.clone()), &t);
        let config = settings(&e);
        let token = token::TokenClient::new(&e, &config.token);
        let me = e.current_contract_address();
        let (entry_net, platform, protocol) = quote(
            part(t.entry_locked, &t.rules.place_weights, place),
            t.rules.mode,
        );
        let (sponsor_net, sponsor_platform) = escrow::release(&e, &t, &config, place)?;
        let mut amounts = Vec::new(&e);
        for (i, member) in r.members.iter().enumerate() {
            let amount = part(entry_net + sponsor_net, &r.weights, i as u32);
            if amount == 0 {
                return Err(Error::TransferMismatch);
            }
            token.transfer(&me, &member, &amount);
            amounts.push_back(amount);
        }
        if platform + sponsor_platform > 0 {
            token.transfer(&me, &config.platform, &(platform + sponsor_platform));
        }
        if protocol > 0 {
            token.transfer(&me, &config.protocol, &protocol);
        }
        Payment {
            id,
            place,
            recipients: r.members,
            amounts,
        }
        .publish(&e);
        Ok(())
    }

    pub fn cancel(e: Env, id: BytesN<32>, actor: Address) -> Result<(), Error> {
        let mut t = load(&e, &id)?;
        actor.require_auth();
        if t.cancelled || !t.paid_slots.is_empty() {
            return Err(Error::WrongPhase);
        }
        if actor != t.rules.referee && (actor != t.rules.organizer || !t.outcome.is_empty()) {
            return Err(Error::Unauthorized);
        }
        cancelled(&e, &id, &mut t, false);
        Ok(())
    }

    pub fn refund(e: Env, id: BytesN<32>, team_id: BytesN<32>) -> Result<(), Error> {
        let t = load(&e, &id)?;
        let mut r = team(&e, &id, &team_id)?;
        if r.refunded || r.contribution == 0 {
            return Err(Error::Paid);
        }
        if !(t.cancelled || (t.roster_hash.is_some() && !t.locked_teams.contains(&team_id))) {
            return Err(Error::WrongPhase);
        }
        r.refunded = true;
        save(&e, &Key::Team(id.clone(), team_id.clone()), &r);
        token::TokenClient::new(&e, &settings(&e).token).transfer(
            &e.current_contract_address(),
            &r.payer,
            &r.contribution,
        );
        Refund {
            id,
            team: team_id,
            payer: r.payer,
            amount: r.contribution,
        }
        .publish(&e);
        Ok(())
    }

    pub fn refund_sponsor(e: Env, id: BytesN<32>) -> Result<i128, Error> {
        let mut t = load(&e, &id)?;
        if !t.cancelled || t.sponsor_refunded || t.escrow.is_none() {
            return Err(Error::WrongPhase);
        }
        t.rules.referee.require_auth();
        let config = settings(&e);
        t.sponsor_refunded = true;
        save(&e, &Key::Tournament(id), &t);
        escrow::cancel(&e, &t, &config)?;
        escrow::refund(&e, &t, &config)
    }

    pub fn tournament(e: Env, id: BytesN<32>) -> Result<Tournament, Error> {
        load(&e, &id)
    }

    pub fn roster(e: Env, id: BytesN<32>, team_id: BytesN<32>) -> Result<Team, Error> {
        team(&e, &id, &team_id)
    }
}

#[cfg(test)]
mod test;
