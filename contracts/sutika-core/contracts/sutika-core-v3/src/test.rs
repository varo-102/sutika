use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    vec,
};

struct Cup {
    env: Env,
    core: Address,
    token: Address,
    studio: Address,
    protocol: Address,
    organizer: Address,
    referee: Address,
    id: BytesN<32>,
}

impl Cup {
    fn new(size: u32) -> Self {
        let e = Env::default();
        e.cost_estimate().budget().reset_unlimited();
        e.mock_all_auths();
        e.ledger().with_mut(|l| l.timestamp = 1000);
        let token = e
            .register_stellar_asset_contract_v2(Address::generate(&e))
            .address();
        let studio = Address::generate(&e);
        let protocol = Address::generate(&e);
        let organizer = Address::generate(&e);
        let referee = Address::generate(&e);
        let config = Settings {
            token: token.clone(),
            platform: studio.clone(),
            protocol: protocol.clone(),
            factory: Address::generate(&e),
            escrow_admin: Address::generate(&e),
        };
        let core = e.register(SutikaCoreV3, (config,));
        let id = BytesN::from_array(&e, &[1; 32]);
        let client = SutikaCoreV3Client::new(&e, &core);
        client.create(
            &id,
            &Rules {
                organizer: organizer.clone(),
                sponsor: organizer.clone(),
                referee: referee.clone(),
                mode: ENTRY,
                team_size: size,
                min_teams: 4,
                max_teams: 8,
                deadline: 2000,
                entry_fee: 10_000_000,
                place_weights: vec![&e, 10_000],
                sponsor_parts: Vec::new(&e),
            },
        );
        Self {
            env: e,
            core,
            token,
            studio,
            protocol,
            organizer,
            referee,
            id,
        }
    }

    fn client(&self) -> SutikaCoreV3Client<'_> {
        SutikaCoreV3Client::new(&self.env, &self.core)
    }

    fn balance(&self, a: &Address) -> i128 {
        token::TokenClient::new(&self.env, &self.token).balance(a)
    }

    fn time(&self, timestamp: u64) {
        self.env.ledger().with_mut(|l| l.timestamp = timestamp);
    }

    fn join(&self, index: u8, count: u32, shares: &Vec<u32>) -> (BytesN<32>, Vec<Address>) {
        let e = &self.env;
        let team = BytesN::from_array(e, &[index; 32]);
        let mut members = Vec::new(e);
        for i in 0..count {
            let player = Address::generate(e);
            token::StellarAssetClient::new(e, &self.token).mint(&player, &10_000_000);
            self.client()
                .join(&self.id, &team, &player, shares, &(i == 0), &i);
            members.push_back(player);
        }
        (team, members)
    }

    fn verify(&self, players: &Vec<Address>, expires: u64) {
        for player in players.iter() {
            self.client().verify(
                &self.id,
                &player,
                &BytesN::from_array(&self.env, &[2; 32]),
                &expires,
            );
            self.client().ready(
                &self.id,
                &player,
                &self
                    .client()
                    .tournament(&self.id)
                    .outcome
                    .get(0)
                    .unwrap()
                    .revision,
            );
        }
    }
}

#[test]
fn absent_minimum_unlocks_one_exact_refund_to_the_original_payer() {
    let c = Cup::new(1);
    let (team, people) = c.join(1, 1, &vec![&c.env, 10_000]);
    let payer = people.get(0).unwrap();
    assert_eq!(c.balance(&payer), 0);
    assert_eq!(c.client().try_freeze(&c.id), Err(Ok(Error::Waiting)));
    assert_eq!(
        c.client().try_refund(&c.id, &team),
        Err(Ok(Error::WrongPhase))
    );
    c.time(2000);
    c.client().freeze(&c.id);
    assert!(c.client().tournament(&c.id).cancelled);
    c.client().refund(&c.id, &team);
    assert_eq!(c.balance(&payer), 10_000_000);
    assert_eq!(c.balance(&c.studio), 0);
    assert_eq!(c.balance(&c.protocol), 0);
    assert_eq!(c.client().try_refund(&c.id, &team), Err(Ok(Error::Paid)));
}

#[test]
fn five_signed_players_receive_custom_amounts_once_and_incomplete_team_gets_a_refund() {
    let c = Cup::new(5);
    let e = &c.env;
    let custom = vec![e, 3000, 2500, 2000, 1500, 1000];
    let even = vec![e, 2000, 2000, 2000, 2000, 2000];
    let (first, roster) = c.join(1, 5, &custom);
    c.join(2, 5, &even);
    c.join(3, 5, &even);
    c.join(4, 5, &even);
    let (incomplete, incomplete_players) = c.join(5, 2, &even);
    let evi = BytesN::from_array(e, &[8; 32]);
    c.time(2000);
    let core = c.client();
    core.freeze(&c.id);
    assert_eq!(core.tournament(&c.id).locked_teams.len(), 4);
    assert!(core.tournament(&c.id).roster_hash.is_some());
    assert!(core
        .try_join(&c.id, &first, &Address::generate(e), &custom, &false, &0)
        .is_err());
    core.refund(&c.id, &incomplete);
    assert_eq!(c.balance(&incomplete_players.get(0).unwrap()), 10_000_000);
    core.declare(&c.id, &vec![e, first], &evi);
    core.approve(
        &c.id,
        &core.tournament(&c.id).outcome.get(0).unwrap().revision,
    );
    assert_eq!(
        core.try_pay(
            &c.id,
            &0,
            &core.tournament(&c.id).outcome.get(0).unwrap().revision
        ),
        Err(Ok(Error::Waiting))
    );
    let stranger = Address::generate(e);
    assert_eq!(
        core.try_verify(&c.id, &stranger, &evi, &3000),
        Err(Ok(Error::Invalid))
    );
    let captain = roster.get(0).unwrap();
    assert_eq!(
        core.try_ready(&c.id, &captain, &1),
        Err(Ok(Error::NotVerified))
    );
    c.time(2000 + WINDOW);
    c.verify(&vec![e, captain.clone()], 2000 + WINDOW + 3600);
    assert_eq!(
        core.try_pay(
            &c.id,
            &0,
            &core.tournament(&c.id).outcome.get(0).unwrap().revision
        ),
        Err(Ok(Error::NotVerified))
    );
    c.verify(&roster, 2000 + WINDOW + 3600);
    core.pay(
        &c.id,
        &0,
        &core.tournament(&c.id).outcome.get(0).unwrap().revision,
    );
    assert_eq!(c.balance(&captain), 11_400_000);
    assert_eq!(c.balance(&roster.get(1).unwrap()), 19_500_000);
    assert_eq!(c.balance(&roster.get(2).unwrap()), 17_600_000);
    assert_eq!(c.balance(&roster.get(3).unwrap()), 15_700_000);
    assert_eq!(c.balance(&roster.get(4).unwrap()), 13_800_000);
    assert_eq!(c.balance(&c.studio), 1_880_000);
    assert_eq!(c.balance(&c.protocol), 120_000);
    assert_eq!(c.balance(&c.core), 0);
    assert_eq!(
        core.try_pay(
            &c.id,
            &0,
            &core.tournament(&c.id).outcome.get(0).unwrap().revision
        ),
        Err(Ok(Error::Paid))
    );
    assert_eq!(
        core.try_cancel(&c.id, &c.referee),
        Err(Ok(Error::WrongPhase))
    );
}

#[test]
fn corrected_winner_requires_new_approval_and_full_review_window() {
    let c = Cup::new(1);
    let e = &c.env;
    let shares = vec![e, 10_000];
    let (first, old) = c.join(1, 1, &shares);
    let (second, next) = c.join(2, 1, &shares);
    c.join(3, 1, &shares);
    c.join(4, 1, &shares);
    c.time(2000);
    let core = c.client();
    core.freeze(&c.id);
    let evi = BytesN::from_array(e, &[3; 32]);
    core.declare(&c.id, &vec![e, first], &evi);
    core.approve(
        &c.id,
        &core.tournament(&c.id).outcome.get(0).unwrap().revision,
    );
    c.verify(&old, 3000);
    core.dispute(&c.id, &next.get(0).unwrap());
    c.time(2000 + WINDOW);
    assert_eq!(
        core.try_pay(
            &c.id,
            &0,
            &core.tournament(&c.id).outcome.get(0).unwrap().revision
        ),
        Err(Ok(Error::Disputed))
    );
    core.resolve(&c.id, &vec![e, second], &evi);
    assert_eq!(
        core.try_ready(&c.id, &old.get(0).unwrap(), &2),
        Err(Ok(Error::Unauthorized))
    );
    assert_eq!(
        core.try_pay(
            &c.id,
            &0,
            &core.tournament(&c.id).outcome.get(0).unwrap().revision
        ),
        Err(Ok(Error::WrongPhase))
    );
    core.approve(
        &c.id,
        &core.tournament(&c.id).outcome.get(0).unwrap().revision,
    );
    assert_eq!(
        core.try_pay(
            &c.id,
            &0,
            &core.tournament(&c.id).outcome.get(0).unwrap().revision
        ),
        Err(Ok(Error::Waiting))
    );
    c.time(2000 + 2 * WINDOW);
    c.verify(&next, 3000 + 2 * WINDOW);
    core.pay(
        &c.id,
        &0,
        &core.tournament(&c.id).outcome.get(0).unwrap().revision,
    );
    assert_eq!(c.balance(&old.get(0).unwrap()), 0);
    assert_eq!(c.balance(&next.get(0).unwrap()), 38_000_000);
}

#[test]
fn creation_and_cancellation_require_the_named_wallet_signature() {
    let c = Cup::new(1);
    assert!(c
        .client()
        .mock_auths(&[])
        .try_cancel(&c.id, &c.organizer)
        .is_err());
    assert_eq!(
        c.client().try_cancel(&c.id, &Address::generate(&c.env)),
        Err(Ok(Error::Unauthorized))
    );
    assert!(!c.client().tournament(&c.id).cancelled);
}
