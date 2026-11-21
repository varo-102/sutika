use soroban_sdk::{contracterror, contractevent, contracttype, Address, BytesN, Vec};

pub const SPONSORED: u32 = 0;
pub const ENTRY: u32 = 1;
pub const MIXED: u32 = 2;
pub const WINDOW: u64 = 86_400;
pub const MIN_ENTRY: i128 = 2_500_000;
pub const MAX_AMOUNT: i128 = 10_000_000_000_000;
pub const BPS: i128 = 10_000;
pub const PROTOCOL_BPS: i128 = 30;

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
    Unauthorized = 7,
    Paid = 8,
    TransferMismatch = 9,
    NotVerified = 10,
    NotReady = 11,
}

#[contracttype]
#[derive(Clone)]
pub struct Settings {
    pub token: Address,
    pub platform: Address,
    pub protocol: Address,
    pub factory: Address,
    pub escrow_admin: Address,
}

#[contracttype]
#[derive(Clone)]
pub struct Rules {
    pub organizer: Address,
    pub sponsor: Address,
    pub referee: Address,
    pub mode: u32,
    pub team_size: u32,
    pub min_teams: u32,
    pub max_teams: u32,
    pub deadline: u64,
    pub entry_fee: i128,
    pub place_weights: Vec<u32>,
    pub sponsor_parts: Vec<i128>,
}

#[contracttype]
#[derive(Clone)]
pub struct Team {
    pub members: Vec<Address>,
    pub weights: Vec<u32>,
    pub payer: Address,
    pub contribution: i128,
    pub refunded: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct Outcome {
    pub places: Vec<BytesN<32>>,
    pub evidence: BytesN<32>,
    pub challenge_ends: u64,
    pub approved: bool,
    pub disputed: bool,
    pub revision: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct Tournament {
    pub rules: Rules,
    pub escrow: Option<Address>,
    pub teams: Vec<BytesN<32>>,
    pub locked_teams: Vec<BytesN<32>>,
    pub roster_hash: Option<BytesN<32>>,
    pub entry_gross: i128,
    pub entry_locked: i128,
    pub outcome: Vec<Outcome>,
    pub cancelled: bool,
    pub paid_slots: Vec<u32>,
    pub sponsor_refunded: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct Verification {
    pub evidence: BytesN<32>,
    pub expires: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum Key {
    Settings,
    Tournament(BytesN<32>),
    Team(BytesN<32>, BytesN<32>),
    Member(BytesN<32>, Address),
    Challenged(BytesN<32>, Address),
    Verified(BytesN<32>, Address),
    Ready(BytesN<32>, Address),
    Escrow(Address),
}

#[contractevent(topics = ["created"], data_format = "single-value")]
pub struct Created {
    #[topic]
    pub id: BytesN<32>,
    pub organizer: Address,
}

#[contractevent(topics = ["funded"], data_format = "vec")]
pub struct Funded {
    #[topic]
    pub id: BytesN<32>,
    pub sponsor: Address,
    pub escrow: Address,
    pub amount: i128,
}

#[contractevent(topics = ["joined"], data_format = "vec")]
pub struct Joined {
    #[topic]
    pub id: BytesN<32>,
    pub team: BytesN<32>,
    pub member: Address,
    pub amount: i128,
}

#[contractevent(topics = ["frozen"], data_format = "single-value")]
pub struct Frozen {
    #[topic]
    pub id: BytesN<32>,
    pub roster_hash: BytesN<32>,
}

#[contractevent(topics = ["result"], data_format = "vec")]
pub struct ResultPosted {
    #[topic]
    pub id: BytesN<32>,
    pub challenge_ends: u64,
    pub revision: u32,
}

#[contractevent(topics = ["paid"], data_format = "vec")]
pub struct Payment {
    #[topic]
    pub id: BytesN<32>,
    #[topic]
    pub place: u32,
    pub recipients: Vec<Address>,
    pub amounts: Vec<i128>,
}

#[contractevent(topics = ["refund"], data_format = "vec")]
pub struct Refund {
    #[topic]
    pub id: BytesN<32>,
    pub team: BytesN<32>,
    pub payer: Address,
    pub amount: i128,
}

#[contractevent(topics = ["cancelled"], data_format = "single-value")]
pub struct Cancelled {
    #[topic]
    pub id: BytesN<32>,
    pub automatic: bool,
}

pub fn platform_bps(mode: u32) -> i128 {
    match mode {
        SPONSORED => 250,
        ENTRY => 470,
        _ => 320,
    }
}

pub fn valid_weights(weights: &Vec<u32>) -> bool {
    weights.iter().all(|b| (100..=10_000).contains(&b)) && weights.iter().sum::<u32>() == 10_000
}

pub fn part(total: i128, weights: &Vec<u32>, slot: u32) -> i128 {
    let previous: i128 = weights.iter().take(slot as usize).map(i128::from).sum();
    let end = previous + i128::from(weights.get(slot).unwrap());
    total * end / BPS - total * previous / BPS
}

pub fn quote(gross: i128, mode: u32) -> (i128, i128, i128) {
    let platform = gross * platform_bps(mode) / BPS;
    let protocol = gross * PROTOCOL_BPS / BPS;
    (gross - platform - protocol, platform, protocol)
}
