#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, BytesN, Env,
    String, Symbol,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum SutikaError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidStanding = 4,
    WinnersNotDeclared = 5,
    AlreadyClaimed = 6,
    DeadlineNotPassed = 7,
    DeadlinePassed = 8,
    IdentityMismatch = 9,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    Open = 0,
    WinnersDeclared = 1,
    Completed = 2,
    Refunded = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PodiumPrize {
    pub standing: u32,
    pub amount_usdc: i128,
    pub is_voucher: bool,
    pub claimed: bool,
    pub recipient: Option<Address>,
    pub identity_hash: Option<BytesN<32>>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TournamentEscrow {
    pub tournament_id: String,
    pub organizer: Address,
    pub sponsor: Address,
    pub deadline_ledger: u32,
    pub status: EscrowStatus,
    pub prize_1: PodiumPrize,
    pub prize_2: PodiumPrize,
    pub prize_3: PodiumPrize,
}

#[contracttype]
pub enum DataKey {
    Escrow(String),
}

const TOPIC_PRIZE: Symbol = symbol_short!("prize");
const EVENT_INIT: Symbol = symbol_short!("init");
const EVENT_WINNERS: Symbol = symbol_short!("winners");
const EVENT_CLAIM: Symbol = symbol_short!("claim");
const EVENT_VOUCHER: Symbol = symbol_short!("voucher");
const EVENT_REFUND: Symbol = symbol_short!("refund");

#[contract]
pub struct SutikaEscrowContract;

#[contractimpl]
impl SutikaEscrowContract {
    /// Inicializa un escrow para un torneo en modo ON_CHAIN_ESCROW.
    /// Bloquea el compromiso de premios para 1er, 2do y 3er puesto.
    pub fn init_tournament_escrow(
        env: Env,
        tournament_id: String,
        organizer: Address,
        sponsor: Address,
        deadline_ledger: u32,
        prize_1_amount: i128,
        prize_1_is_voucher: bool,
        prize_2_amount: i128,
        prize_2_is_voucher: bool,
        prize_3_amount: i128,
        prize_3_is_voucher: bool,
    ) -> Result<(), SutikaError> {
        sponsor.require_auth();

        let key = DataKey::Escrow(tournament_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(SutikaError::AlreadyInitialized);
        }

        let current_ledger = env.ledger().sequence();
        if deadline_ledger <= current_ledger {
            return Err(SutikaError::DeadlinePassed);
        }

        let escrow = TournamentEscrow {
            tournament_id: tournament_id.clone(),
            organizer,
            sponsor,
            deadline_ledger,
            status: EscrowStatus::Open,
            prize_1: PodiumPrize {
                standing: 1,
                amount_usdc: prize_1_amount,
                is_voucher: prize_1_is_voucher,
                claimed: false,
                recipient: None,
                identity_hash: None,
            },
            prize_2: PodiumPrize {
                standing: 2,
                amount_usdc: prize_2_amount,
                is_voucher: prize_2_is_voucher,
                claimed: false,
                recipient: None,
                identity_hash: None,
            },
            prize_3: PodiumPrize {
                standing: 3,
                amount_usdc: prize_3_amount,
                is_voucher: prize_3_is_voucher,
                claimed: false,
                recipient: None,
                identity_hash: None,
            },
        };

        env.storage().persistent().set(&key, &escrow);

        env.events().publish(
            (TOPIC_PRIZE, EVENT_INIT),
            (tournament_id, escrow.organizer, escrow.sponsor, deadline_ledger),
        );

        Ok(())
    }

    /// El organizador declara los ganadores del podio una vez finalizado el torneo.
    pub fn declare_winners(
        env: Env,
        tournament_id: String,
        organizer: Address,
    ) -> Result<(), SutikaError> {
        organizer.require_auth();

        let key = DataKey::Escrow(tournament_id.clone());
        let mut escrow: TournamentEscrow = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(SutikaError::NotInitialized)?;

        if escrow.organizer != organizer {
            return Err(SutikaError::Unauthorized);
        }

        escrow.status = EscrowStatus::WinnersDeclared;
        env.storage().persistent().set(&key, &escrow);

        env.events().publish(
            (TOPIC_PRIZE, EVENT_WINNERS),
            (tournament_id, organizer),
        );

        Ok(())
    }

    /// El Capitán o Delegado del equipo ganador reclama el premio USDC.
    /// Valida el reclamo, registra el IdentityHash y emite el recibo en Stellar (Proof of Prize Delivery).
    pub fn claim_podium_prize(
        env: Env,
        tournament_id: String,
        standing: u32,
        captain: Address,
        identity_hash: BytesN<32>,
    ) -> Result<i128, SutikaError> {
        captain.require_auth();

        let key = DataKey::Escrow(tournament_id.clone());
        let mut escrow: TournamentEscrow = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(SutikaError::NotInitialized)?;

        if escrow.status != EscrowStatus::WinnersDeclared {
            return Err(SutikaError::WinnersNotDeclared);
        }

        let prize_amount: i128;

        match standing {
            1 => {
                if escrow.prize_1.claimed {
                    return Err(SutikaError::AlreadyClaimed);
                }
                escrow.prize_1.claimed = true;
                escrow.prize_1.recipient = Some(captain.clone());
                escrow.prize_1.identity_hash = Some(identity_hash.clone());
                prize_amount = escrow.prize_1.amount_usdc;
            }
            2 => {
                if escrow.prize_2.claimed {
                    return Err(SutikaError::AlreadyClaimed);
                }
                escrow.prize_2.claimed = true;
                escrow.prize_2.recipient = Some(captain.clone());
                escrow.prize_2.identity_hash = Some(identity_hash.clone());
                prize_amount = escrow.prize_2.amount_usdc;
            }
            3 => {
                if escrow.prize_3.claimed {
                    return Err(SutikaError::AlreadyClaimed);
                }
                escrow.prize_3.claimed = true;
                escrow.prize_3.recipient = Some(captain.clone());
                escrow.prize_3.identity_hash = Some(identity_hash.clone());
                prize_amount = escrow.prize_3.amount_usdc;
            }
            _ => return Err(SutikaError::InvalidStanding),
        }

        if escrow.prize_1.claimed && escrow.prize_2.claimed && escrow.prize_3.claimed {
            escrow.status = EscrowStatus::Completed;
        }

        env.storage().persistent().set(&key, &escrow);

        // Publica evento oficial de Proof of Prize Delivery en Stellar
        env.events().publish(
            (TOPIC_PRIZE, EVENT_CLAIM),
            (tournament_id, standing, captain, identity_hash, prize_amount),
        );

        Ok(prize_amount)
    }

    /// El comercio auspiciador o representante canjea el Voucher QR en mostrador (Nivel 1 KYC).
    pub fn redeem_prize_voucher(
        env: Env,
        tournament_id: String,
        standing: u32,
        merchant: Address,
        captain_identity_hash: BytesN<32>,
    ) -> Result<(), SutikaError> {
        merchant.require_auth();

        let key = DataKey::Escrow(tournament_id.clone());
        let mut escrow: TournamentEscrow = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(SutikaError::NotInitialized)?;

        match standing {
            1 => {
                if escrow.prize_1.claimed {
                    return Err(SutikaError::AlreadyClaimed);
                }
                escrow.prize_1.claimed = true;
                escrow.prize_1.identity_hash = Some(captain_identity_hash.clone());
            }
            2 => {
                if escrow.prize_2.claimed {
                    return Err(SutikaError::AlreadyClaimed);
                }
                escrow.prize_2.claimed = true;
                escrow.prize_2.identity_hash = Some(captain_identity_hash.clone());
            }
            3 => {
                if escrow.prize_3.claimed {
                    return Err(SutikaError::AlreadyClaimed);
                }
                escrow.prize_3.claimed = true;
                escrow.prize_3.identity_hash = Some(captain_identity_hash.clone());
            }
            _ => return Err(SutikaError::InvalidStanding),
        }

        if escrow.prize_1.claimed && escrow.prize_2.claimed && escrow.prize_3.claimed {
            escrow.status = EscrowStatus::Completed;
        }

        env.storage().persistent().set(&key, &escrow);

        env.events().publish(
            (TOPIC_PRIZE, EVENT_VOUCHER),
            (tournament_id, standing, merchant, captain_identity_hash),
        );

        Ok(())
    }

    /// Reembolso al patrocinador si expira el plazo límite sin que se reclamen los premios.
    pub fn refund_sponsor(
        env: Env,
        tournament_id: String,
        sponsor: Address,
    ) -> Result<(), SutikaError> {
        sponsor.require_auth();

        let key = DataKey::Escrow(tournament_id.clone());
        let mut escrow: TournamentEscrow = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(SutikaError::NotInitialized)?;

        if escrow.sponsor != sponsor {
            return Err(SutikaError::Unauthorized);
        }

        let current_ledger = env.ledger().sequence();
        if current_ledger < escrow.deadline_ledger {
            return Err(SutikaError::DeadlineNotPassed);
        }

        if escrow.status == EscrowStatus::Completed || escrow.status == EscrowStatus::Refunded {
            return Err(SutikaError::AlreadyClaimed);
        }

        escrow.status = EscrowStatus::Refunded;
        env.storage().persistent().set(&key, &escrow);

        env.events().publish(
            (TOPIC_PRIZE, EVENT_REFUND),
            (tournament_id, sponsor),
        );

        Ok(())
    }

    /// Consulta el estado completo del escrow de un torneo.
    pub fn get_escrow(env: Env, tournament_id: String) -> Result<TournamentEscrow, SutikaError> {
        let key = DataKey::Escrow(tournament_id);
        env.storage()
            .persistent()
            .get(&key)
            .ok_or(SutikaError::NotInitialized)
    }
}
