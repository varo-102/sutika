use soroban_sdk::{
    contractclient, token, vec, Address, BytesN, Env, Map, String, Symbol, TryFromVal, Val, Vec,
};

use crate::model::{platform_bps, quote, Error, Settings, Tournament};

#[allow(dead_code)]
#[contractclient(name = "TrustlessClient")]
pub trait TrustlessWork {
    fn get_escrow(env: Env) -> Map<Symbol, Val>;
    fn fund_escrow(env: Env, signer: Address, expected_escrow: Map<Symbol, Val>, amount: i128);
    fn approve_milestones(env: Env, milestone_indices: Vec<u32>, approver: Address);
    fn release_funds(
        env: Env,
        release_signer: Address,
        trustless_work_address: Address,
        milestone_indices: Vec<u32>,
    );
    fn dispute_milestones(env: Env, signer: Address, milestone_indices: Vec<u32>, reason: String);
    fn resolve_dispute(
        env: Env,
        dispute_resolver: Address,
        trustless_work_address: Address,
        milestone_indices: Vec<u32>,
        distributions: Map<Address, i128>,
    );
}

fn field<T: TryFromVal<Env, Val>>(e: &Env, map: &Map<Symbol, Val>, key: &str) -> Result<T, Error> {
    let v = map
        .get(Symbol::new(e, key))
        .ok_or(Error::TransferMismatch)?;
    T::try_from_val(e, &v).map_err(|_| Error::TransferMismatch)
}

pub fn terms(
    e: &Env,
    t: &Tournament,
    settings: &Settings,
    escrow: &Address,
) -> Result<Map<Symbol, Val>, Error> {
    let data = TrustlessClient::new(e, escrow).get_escrow();
    let roles: Map<Symbol, Val> = field(e, &data, "roles")?;
    let trustline: Map<Symbol, Val> = field(e, &data, "trustline")?;
    let milestones: Vec<Map<Symbol, Val>> = field(e, &data, "milestones")?;
    let core = e.current_contract_address();
    if field::<Address>(e, &trustline, "address")? != settings.token
        || field::<u32>(e, &data, "platform_fee")? != platform_bps(t.rules.mode) as u32
        || field::<u32>(e, &data, "receiver_memo")? != 0
        || field::<Vec<Address>>(e, &roles, "approvers")? != vec![e, core.clone()]
        || field::<Vec<Address>>(e, &roles, "service_providers")? != vec![e, core.clone()]
        || field::<Vec<Address>>(e, &roles, "release_signers")? != vec![e, core.clone()]
        || field::<Vec<Address>>(e, &roles, "dispute_resolvers")?
            != vec![e, t.rules.referee.clone()]
        || field::<Address>(e, &roles, "platform")? != core
        || field::<Address>(e, &roles, "admin")? != settings.escrow_admin
        || milestones.len() != t.rules.sponsor_parts.len()
    {
        return Err(Error::TransferMismatch);
    }
    for (i, m) in milestones.iter().enumerate() {
        let approvals: Map<Symbol, Val> = field(e, &m, "approvals")?;
        if field::<i128>(e, &m, "amount")? != t.rules.sponsor_parts.get(i as u32).unwrap()
            || field::<Address>(e, &m, "receiver")? != core
            || field::<u32>(e, &approvals, "target")? != 1
        {
            return Err(Error::TransferMismatch);
        }
    }
    Ok(data)
}

pub fn fund(
    e: &Env,
    t: &Tournament,
    settings: &Settings,
    escrow: &Address,
    salt: BytesN<32>,
) -> Result<i128, Error> {
    if e.deployer()
        .with_address(settings.factory.clone(), salt)
        .deployed_address()
        != *escrow
    {
        return Err(Error::TransferMismatch);
    }
    let expected = terms(e, t, settings, escrow)?;
    let milestones: Vec<Map<Symbol, Val>> = field(e, &expected, "milestones")?;
    for m in milestones.iter() {
        let dispute: Map<Symbol, Val> = field(e, &m, "dispute")?;
        let approvals: Map<Symbol, Val> = field(e, &m, "approvals")?;
        if field::<bool>(e, &m, "released")?
            || field::<bool>(e, &dispute, "is_disputed")?
            || field::<bool>(e, &dispute, "resolved")?
            || field::<u32>(e, &approvals, "approval_count")? != 0
        {
            return Err(Error::TransferMismatch);
        }
    }
    let amount = t.rules.sponsor_parts.iter().sum();
    let token = token::TokenClient::new(e, &settings.token);
    let before = token.balance(escrow);
    TrustlessClient::new(e, escrow).fund_escrow(&t.rules.sponsor, &expected, &amount);
    if token.balance(escrow) - before != amount {
        return Err(Error::TransferMismatch);
    }
    Ok(amount)
}

pub fn approve(e: &Env, t: &Tournament, settings: &Settings) -> Result<(), Error> {
    if let Some(escrow) = &t.escrow {
        let data = terms(e, t, settings, escrow)?;
        let milestones: Vec<Map<Symbol, Val>> = field(e, &data, "milestones")?;
        let mut pending = Vec::new(e);
        for (i, m) in milestones.iter().enumerate() {
            let approvals: Map<Symbol, Val> = field(e, &m, "approvals")?;
            if field::<u32>(e, &approvals, "approval_count")? == 0 {
                pending.push_back(i as u32);
            }
        }
        if !pending.is_empty() {
            TrustlessClient::new(e, escrow)
                .approve_milestones(&pending, &e.current_contract_address());
        }
    }
    Ok(())
}

pub fn release(
    e: &Env,
    t: &Tournament,
    settings: &Settings,
    place: u32,
) -> Result<(i128, i128), Error> {
    let Some(escrow) = &t.escrow else {
        return Ok((0, 0));
    };
    terms(e, t, settings, escrow)?;
    let me = e.current_contract_address();
    let token = token::TokenClient::new(e, &settings.token);
    let amount = t.rules.sponsor_parts.get(place).ok_or(Error::Invalid)?;
    let (net, platform, protocol) = quote(amount, t.rules.mode);
    let before = token.balance(&me);
    let escrow_before = token.balance(escrow);
    TrustlessClient::new(e, escrow).release_funds(&me, &settings.protocol, &vec![e, place]);
    if token.balance(&me) - before != net + platform
        || escrow_before - token.balance(escrow) != amount
        || net + platform + protocol != amount
    {
        return Err(Error::TransferMismatch);
    }
    Ok((net, platform))
}

fn indices(e: &Env, t: &Tournament) -> Vec<u32> {
    let mut places = Vec::new(e);
    for i in 0..t.rules.sponsor_parts.len() {
        places.push_back(i);
    }
    places
}

pub fn cancel(e: &Env, t: &Tournament, settings: &Settings) -> Result<(), Error> {
    if let Some(escrow) = &t.escrow {
        terms(e, t, settings, escrow)?;
        TrustlessClient::new(e, escrow).dispute_milestones(
            &e.current_contract_address(),
            &indices(e, t),
            &String::from_str(e, "Sutika: tournament cancelled"),
        );
    }
    Ok(())
}

pub fn refund(e: &Env, t: &Tournament, settings: &Settings) -> Result<i128, Error> {
    let escrow = t.escrow.as_ref().ok_or(Error::WrongPhase)?;
    terms(e, t, settings, escrow)?;
    let token = token::TokenClient::new(e, &settings.token);
    let gross = t.rules.sponsor_parts.iter().sum();
    let (net, platform, _) = quote(gross, t.rules.mode);
    let sponsor_before = token.balance(&t.rules.sponsor);
    let me = e.current_contract_address();
    let before = token.balance(&me);
    let mut destinations = Map::new(e);
    destinations.set(t.rules.sponsor.clone(), gross);
    TrustlessClient::new(e, escrow).resolve_dispute(
        &t.rules.referee,
        &settings.protocol,
        &indices(e, t),
        &destinations,
    );
    if token.balance(&t.rules.sponsor) - sponsor_before != net
        || token.balance(&me) - before != platform
    {
        return Err(Error::TransferMismatch);
    }
    if platform > 0 {
        token.transfer(&me, &settings.platform, &platform);
    }
    Ok(net)
}
