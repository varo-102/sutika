use super::*;
use soroban_sdk::IntoVal;
use soroban_sdk::{
    contract, contractimpl,
    testutils::{Address as _, Ledger},
};

#[contract]
struct TestEscrow;
#[contractimpl]
impl TestEscrow {
    pub fn __constructor(env: Env, token: Address, net: i128) {
        env.storage().instance().set(&0u32, &token);
        env.storage().instance().set(&1u32, &net);
    }
    pub fn setup(
        env: Env,
        id: BytesN<32>,
        org: Address,
        sponsor: Address,
        resolver: Address,
        core: Address,
    ) {
        let mut data: Map<Symbol, Val> = Map::new(&env);
        let mut roles: Map<Symbol, Val> = Map::new(&env);
        for (k, v) in [
            ("approvers", sponsor),
            ("service_providers", org),
            ("dispute_resolvers", resolver),
            ("release_signers", core.clone()),
        ] {
            roles.set(Symbol::new(&env, k), vec![&env, v].into_val(&env));
        }
        let mut token: Map<Symbol, Val> = Map::new(&env);
        token.set(
            Symbol::new(&env, "address"),
            env.storage()
                .instance()
                .get::<_, Address>(&0u32)
                .unwrap()
                .into_val(&env),
        );
        let mut m: Map<Symbol, Val> = Map::new(&env);
        m.set(Symbol::new(&env, "receiver"), core.into_val(&env));
        m.set(Symbol::new(&env, "amount"), FUNDED_AMOUNT.into_val(&env));
        data.set(
            Symbol::new(&env, "platform_fee"),
            PLATFORM_FEE_BPS.into_val(&env),
        );
        data.set(
            Symbol::new(&env, "milestones"),
            vec![&env, m].into_val(&env),
        );
        data.set(Symbol::new(&env, "roles"), roles.into_val(&env));
        data.set(Symbol::new(&env, "trustline"), token.into_val(&env));
        data.set(
            Symbol::new(&env, "engagement_id"),
            engagement(&env, &id).into_val(&env),
        );
        env.storage().instance().set(&2u32, &data);
    }
    pub fn get_escrow(env: Env) -> Map<Symbol, Val> {
        env.storage().instance().get(&2u32).unwrap()
    }
    pub fn release_funds(env: Env, signer: Address, _indices: Vec<u32>) {
        signer.require_auth();
        let asset: Address = env.storage().instance().get(&0u32).unwrap();
        let amount: i128 = env.storage().instance().get(&1u32).unwrap();
        token::Client::new(&env, &asset).transfer(
            &env.current_contract_address(),
            &signer,
            &amount,
        );
    }
}

struct Fixture {
    env: Env,
    core: Address,
    token: Address,
    escrow: Address,
    id: BytesN<32>,
    teams: Vec<Vec<Address>>,
}

impl Fixture {
    fn new(size: u32, transfer: i128) -> Self {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let token = env.register_stellar_asset_contract_v2(admin).address();
        let core = env.register(SutikaCore, (&token,));
        let escrow = env.register(TestEscrow, (&token, transfer));
        token::StellarAssetClient::new(&env, &token).mint(&escrow, &FUNDED_AMOUNT);
        let client = SutikaCoreClient::new(&env, &core);
        let id = BytesN::from_array(&env, &[1; 32]);
        let organizer = Address::generate(&env);
        let sponsor = Address::generate(&env);
        let resolver = Address::generate(&env);
        client.create(&id, &organizer, &sponsor, &resolver, &size);
        let fixture_escrow = TestEscrowClient::new(&env, &escrow);
        fixture_escrow.setup(
            &BytesN::from_array(&env, &[9; 32]),
            &organizer,
            &sponsor,
            &resolver,
            &core,
        );
        assert_eq!(
            client.try_bind_escrow(&id, &escrow),
            Err(Ok(Error::Invalid))
        );
        fixture_escrow.setup(&id, &organizer, &sponsor, &resolver, &core);
        client.bind_escrow(&id, &escrow);
        let mut teams = Vec::new(&env);
        for _ in 0..2 {
            let mut team = Vec::new(&env);
            for _ in 0..size {
                team.push_back(Address::generate(&env));
            }
            teams.push_back(team);
        }
        Self {
            env,
            core,
            token,
            escrow,
            id,
            teams,
        }
    }
    fn client(&self) -> SutikaCoreClient<'_> {
        SutikaCoreClient::new(&self.env, &self.core)
    }
    fn declare(&self) {
        let c = self.client();
        c.freeze(&self.id, &self.teams);
        c.declare(&self.id, &vec![&self.env, 0], &vec![&self.env, WINNER_NET]);
    }
    fn advance(&self) {
        self.env.ledger().with_mut(|l| l.timestamp += WINDOW);
    }
    fn captain(&self) -> Address {
        self.teams.get(0).unwrap().get(0).unwrap()
    }
}

#[test]
fn rewards_one_and_five_once_after_cosign_and_window() {
    for size in [1u32, 5] {
        let f = Fixture::new(size, WINNER_NET);
        f.declare();
        let c = f.client();
        assert_eq!(
            c.try_release(&f.id, &1, &f.captain()),
            Err(Ok(Error::WrongPhase))
        );
        c.approve(&f.id);
        assert_eq!(
            c.try_release(&f.id, &1, &f.captain()),
            Err(Ok(Error::Waiting))
        );
        f.advance();
        assert_eq!(
            c.try_release(&f.id, &1, &Address::generate(&f.env)),
            Err(Ok(Error::WrongWallet))
        );
        c.release(&f.id, &1, &f.captain());
        let usdc = token::Client::new(&f.env, &f.token);
        for winner in f.teams.get(0).unwrap().iter() {
            assert_eq!(usdc.balance(&winner), WINNER_NET / i128::from(size));
        }
        for runner_up in f.teams.get(1).unwrap().iter() {
            assert_eq!(usdc.balance(&runner_up), 0);
        }
        assert_eq!(
            c.try_release(&f.id, &2, &f.captain()),
            Err(Ok(Error::Invalid))
        );
        assert_eq!(usdc.balance(&f.core), 0);
        assert_eq!(c.try_release(&f.id, &1, &f.captain()), Err(Ok(Error::Paid)));
    }
}

#[test]
fn mismatch_rolls_back_release_and_escrow_transfer() {
    let f = Fixture::new(1, WINNER_NET - 1);
    f.declare();
    let c = f.client();
    c.approve(&f.id);
    f.advance();
    assert_eq!(
        c.try_release(&f.id, &1, &f.captain()),
        Err(Ok(Error::TransferMismatch))
    );
    assert_eq!(
        token::Client::new(&f.env, &f.token).balance(&f.escrow),
        FUNDED_AMOUNT
    );
    assert_eq!(c.tournament(&f.id).paid, 0);
}

#[test]
fn disputes_and_frozen_rosters_are_enforced() {
    let f = Fixture::new(1, WINNER_NET);
    let c = f.client();
    let duplicate = vec![
        &f.env,
        f.teams.get(0).unwrap(),
        f.teams.get(1).unwrap(),
        f.teams.get(0).unwrap(),
    ];
    assert_eq!(c.try_freeze(&f.id, &duplicate), Err(Ok(Error::Invalid)));
    f.declare();
    assert_eq!(c.try_freeze(&f.id, &f.teams), Err(Ok(Error::WrongPhase)));
    c.approve(&f.id);
    c.dispute(&f.id, &f.captain());
    f.advance();
    assert_eq!(
        c.try_release(&f.id, &1, &f.captain()),
        Err(Ok(Error::Disputed))
    );
    c.resolve(&f.id, &false);
    assert!(!c.tournament(&f.id).approved);
    c.declare(&f.id, &vec![&f.env, 1], &vec![&f.env, WINNER_NET]);
    assert_eq!(
        c.tournament(&f.id).release_at,
        f.env.ledger().timestamp() + WINDOW
    );
}

#[test]
fn missing_wallet_signature_is_rejected() {
    let f = Fixture::new(1, WINNER_NET);
    f.declare();
    f.env.set_auths(&[]);
    assert!(f.client().try_approve(&f.id).is_err());
}

#[test]
fn accepts_only_one_winning_team_and_five_usdc() {
    let f = Fixture::new(5, WINNER_NET);
    let c = f.client();
    c.freeze(&f.id, &f.teams);
    assert_eq!(
        c.try_declare(
            &f.id,
            &vec![&f.env, 0, 1],
            &vec![&f.env, WINNER_NET, WINNER_NET]
        ),
        Err(Ok(Error::Invalid))
    );
    assert_eq!(
        c.try_declare(&f.id, &vec![&f.env, 0], &vec![&f.env, WINNER_NET - 1]),
        Err(Ok(Error::Invalid))
    );
    c.declare(&f.id, &vec![&f.env, 1], &vec![&f.env, WINNER_NET]);
}
