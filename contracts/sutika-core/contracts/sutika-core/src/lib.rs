#![no_std]

use soroban_sdk::{
    contract, contractclient, contracterror, contractevent, contractimpl, contracttype, token, vec,
    Address, BytesN, Env, Map, String, Symbol, TryFromVal, Val, Vec,
};

const WINDOW: u64 = 24 * 60 * 60;
const MAX_TEAMS: u32 = 16;

#[contractclient(name = "MultiReleaseClient")]
pub trait MultiRelease {
    fn get_escrow(env: Env) -> Map<Symbol, Val>;
    fn release_funds(env: Env, release_signer: Address, milestone_indices: Vec<u32>);
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    Unknown = 1,
    Exists = 2,
    Invalid = 3,
    WrongPhase = 4,
    Waiting = 5,
    Disputed = 6,
    WrongWallet = 7,
    Paid = 8,
    TransferMismatch = 9,
    Overflow = 10,
}

#[contracttype]
#[derive(Clone)]
pub struct Tournament {
    pub organizer: Address,
    pub sponsor: Address,
    pub resolver: Address,
    pub team_size: u32,
    pub escrow: Option<Address>,
    pub roster: Vec<Vec<Address>>,
    pub podium: Vec<u32>,
    pub net: Vec<i128>,
    pub release_at: u64,
    pub approved: bool,
    pub disputed: bool,
    pub paid: u32,
}

#[contracttype]
enum Key {
    Token,
    Tournament(BytesN<32>),
    Escrow(Address),
}

#[contractevent(topics = ["payout"])]
pub struct Payout {
    #[topic]
    pub tournament: BytesN<32>,
    #[topic]
    pub place: u32,
    pub recipients: Vec<Address>,
    pub amounts: Vec<i128>,
}

fn field<T: TryFromVal<Env, Val>>(
    env: &Env,
    map: &Map<Symbol, Val>,
    key: &str,
) -> Result<T, Error> {
    T::try_from_val(env, &map.get(Symbol::new(env, key)).ok_or(Error::Invalid)?)
        .map_err(|_| Error::Invalid)
}

fn engagement(env: &Env, id: &BytesN<32>) -> String {
    let mut hex = [0u8; 64];
    let alphabet = b"0123456789abcdef";
    for (i, byte) in id.to_array().iter().enumerate() {
        hex[2 * i] = alphabet[usize::from(byte >> 4)];
        hex[2 * i + 1] = alphabet[usize::from(byte & 15)];
    }
    String::from_bytes(env, &hex)
}

fn verify_binding(
    env: &Env,
    id: &BytesN<32>,
    t: &Tournament,
    escrow: &Address,
) -> Result<(), Error> {
    let data = MultiReleaseClient::new(env, escrow).get_escrow();
    let roles: Map<Symbol, Val> = field(env, &data, "roles")?;
    let asset: Map<Symbol, Val> = field(env, &data, "trustline")?;
    let token: Address = env
        .storage()
        .instance()
        .get(&Key::Token)
        .ok_or(Error::Unknown)?;
    let core = env.current_contract_address();
    if field::<String>(env, &data, "engagement_id")? != engagement(env, id)
        || field::<Address>(env, &asset, "address")? != token
        || field::<Vec<Address>>(env, &roles, "approvers")? != vec![env, t.sponsor.clone()]
        || field::<Vec<Address>>(env, &roles, "service_providers")?
            != vec![env, t.organizer.clone()]
        || field::<Vec<Address>>(env, &roles, "dispute_resolvers")? != vec![env, t.resolver.clone()]
        || field::<Vec<Address>>(env, &roles, "release_signers")? != vec![env, core.clone()]
    {
        return Err(Error::Invalid);
    }
    let milestones: Vec<Map<Symbol, Val>> = field(env, &data, "milestones")?;
    if milestones.len() != 3 {
        return Err(Error::Invalid);
    }
    for milestone in milestones.iter() {
        if field::<Address>(env, &milestone, "receiver")? != core {
            return Err(Error::Invalid);
        }
    }
    Ok(())
}

fn read(env: &Env, id: &BytesN<32>) -> Result<Tournament, Error> {
    env.storage()
        .persistent()
        .get(&Key::Tournament(id.clone()))
        .ok_or(Error::Unknown)
}

fn extend(env: &Env, key: &Key) {
    let lifetime = env.storage().max_ttl().min(500_000);
    env.storage()
        .persistent()
        .extend_ttl(key, lifetime / 2, lifetime);
    env.storage().instance().extend_ttl(lifetime / 2, lifetime);
}

fn save(env: &Env, id: &BytesN<32>, state: &Tournament) {
    let key = Key::Tournament(id.clone());
    env.storage().persistent().set(&key, state);
    extend(env, &key);
}

#[contract]
pub struct SutikaCore;

#[contractimpl]
impl SutikaCore {
    pub fn __constructor(env: Env, token: Address) {
        env.storage().instance().set(&Key::Token, &token);
    }

    pub fn create(
        env: Env,
        id: BytesN<32>,
        organizer: Address,
        sponsor: Address,
        resolver: Address,
        team_size: u32,
    ) -> Result<(), Error> {
        organizer.require_auth();
        if env.storage().persistent().has(&Key::Tournament(id.clone())) {
            return Err(Error::Exists);
        }
        if (team_size != 1 && team_size != 5)
            || organizer == sponsor
            || organizer == resolver
            || sponsor == resolver
        {
            return Err(Error::Invalid);
        }
        save(
            &env,
            &id,
            &Tournament {
                organizer,
                sponsor,
                resolver,
                team_size,
                escrow: None,
                roster: Vec::new(&env),
                podium: Vec::new(&env),
                net: Vec::new(&env),
                release_at: 0,
                approved: false,
                disputed: false,
                paid: 0,
            },
        );
        Ok(())
    }

    pub fn bind_escrow(env: Env, id: BytesN<32>, escrow: Address) -> Result<(), Error> {
        let mut t = read(&env, &id)?;
        t.sponsor.require_auth();
        let key = Key::Escrow(escrow.clone());
        if t.escrow.is_some() || env.storage().persistent().has(&key) {
            return Err(Error::Exists);
        }
        verify_binding(&env, &id, &t, &escrow)?;
        env.storage().persistent().set(&key, &id);
        extend(&env, &key);
        t.escrow = Some(escrow);
        save(&env, &id, &t);
        Ok(())
    }

    pub fn freeze(env: Env, id: BytesN<32>, teams: Vec<Vec<Address>>) -> Result<(), Error> {
        let mut t = read(&env, &id)?;
        t.organizer.require_auth();
        if !t.roster.is_empty() || t.escrow.is_none() {
            return Err(Error::WrongPhase);
        }
        if teams.len() < 3 || teams.len() > MAX_TEAMS {
            return Err(Error::Invalid);
        }
        let mut seen: Map<Address, bool> = Map::new(&env);
        for team in teams.iter() {
            if team.len() != t.team_size {
                return Err(Error::Invalid);
            }
            for wallet in team.iter() {
                if seen.contains_key(wallet.clone()) {
                    return Err(Error::Invalid);
                }
                seen.set(wallet, true);
            }
        }
        t.roster = teams;
        save(&env, &id, &t);
        Ok(())
    }

    pub fn declare(
        env: Env,
        id: BytesN<32>,
        podium: Vec<u32>,
        net: Vec<i128>,
    ) -> Result<(), Error> {
        let mut t = read(&env, &id)?;
        t.organizer.require_auth();
        if t.roster.is_empty() || !t.podium.is_empty() || t.paid != 0 {
            return Err(Error::WrongPhase);
        }
        if podium.len() != 3 || net.len() != 3 {
            return Err(Error::Invalid);
        }
        let mut selected: Vec<u32> = Vec::new(&env);
        for (index, amount) in podium.iter().zip(net.iter()) {
            if index >= t.roster.len()
                || selected.contains(&index)
                || amount < i128::from(t.team_size)
            {
                return Err(Error::Invalid);
            }
            selected.push_back(index);
        }
        t.podium = podium;
        t.net = net;
        t.release_at = env
            .ledger()
            .timestamp()
            .checked_add(WINDOW)
            .ok_or(Error::Overflow)?;
        save(&env, &id, &t);
        Ok(())
    }

    pub fn approve(env: Env, id: BytesN<32>) -> Result<(), Error> {
        let mut t = read(&env, &id)?;
        t.sponsor.require_auth();
        if t.podium.is_empty() || t.disputed {
            return Err(Error::WrongPhase);
        }
        t.approved = true;
        save(&env, &id, &t);
        Ok(())
    }

    pub fn dispute(env: Env, id: BytesN<32>, by: Address) -> Result<(), Error> {
        let mut t = read(&env, &id)?;
        by.require_auth();
        if t.podium.is_empty() || env.ledger().timestamp() >= t.release_at || t.disputed {
            return Err(Error::WrongPhase);
        }
        if by != t.sponsor && by != t.organizer && !t.roster.iter().any(|team| team.contains(&by)) {
            return Err(Error::WrongWallet);
        }
        t.disputed = true;
        save(&env, &id, &t);
        Ok(())
    }

    pub fn resolve(env: Env, id: BytesN<32>, uphold_podium: bool) -> Result<(), Error> {
        let mut t = read(&env, &id)?;
        t.resolver.require_auth();
        if !t.disputed || t.paid != 0 {
            return Err(Error::WrongPhase);
        }
        t.disputed = false;
        if !uphold_podium {
            t.podium = Vec::new(&env);
            t.net = Vec::new(&env);
            t.approved = false;
            t.release_at = 0;
        }
        save(&env, &id, &t);
        Ok(())
    }

    pub fn release(env: Env, id: BytesN<32>, place: u32, claimant: Address) -> Result<(), Error> {
        let mut t = read(&env, &id)?;
        claimant.require_auth();
        if !(1..=3).contains(&place) {
            return Err(Error::Invalid);
        }
        if t.disputed {
            return Err(Error::Disputed);
        }
        if !t.approved || t.podium.len() != 3 {
            return Err(Error::WrongPhase);
        }
        if env.ledger().timestamp() < t.release_at {
            return Err(Error::Waiting);
        }
        let index = place - 1;
        let bit = 1 << index;
        if t.paid & bit != 0 {
            return Err(Error::Paid);
        }
        let team = t
            .roster
            .get(t.podium.get(index).ok_or(Error::Invalid)?)
            .ok_or(Error::Invalid)?;
        if !team.contains(&claimant) {
            return Err(Error::WrongWallet);
        }
        let total = t.net.get(index).ok_or(Error::Invalid)?;
        let escrow = t.escrow.clone().ok_or(Error::WrongPhase)?;
        verify_binding(&env, &id, &t, &escrow)?;
        let token: Address = env
            .storage()
            .instance()
            .get(&Key::Token)
            .ok_or(Error::Unknown)?;
        let usdc = token::Client::new(&env, &token);
        let here = env.current_contract_address();
        let initial = usdc.balance(&here);
        t.paid |= bit;
        save(&env, &id, &t);
        // Direct contract invocation authorizes this registry as the TW release signer.
        MultiReleaseClient::new(&env, &escrow).release_funds(&here, &vec![&env, index]);
        if usdc.balance(&here).checked_sub(initial) != Some(total) {
            return Err(Error::TransferMismatch);
        }
        let count = i128::from(team.len());
        let mut amounts = Vec::new(&env);
        for (i, wallet) in team.iter().enumerate() {
            let amount = total / count + i128::from((i as i128) < total % count);
            usdc.transfer(&here, &wallet, &amount);
            amounts.push_back(amount);
        }
        Payout {
            tournament: id,
            place,
            recipients: team,
            amounts,
        }
        .publish(&env);
        Ok(())
    }

    pub fn tournament(env: Env, id: BytesN<32>) -> Result<Tournament, Error> {
        read(&env, &id)
    }
}

#[cfg(test)]
mod test;
