export interface TournamentDTO {
  id: string;
  name: string;
  category: "FOOTBALL" | "FUTSAL" | "VOLLEYBALL" | "BASKETBALL" | "SCHOOL_EVENT" | "CHESS" | "ESPORTS_DOTA" | "HACKATHON";
  mode: "OFF_CHAIN" | "ON_CHAIN_ESCROW";
  status: "REGISTRATION_OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED_EXPIRED";
  teamMaxSize: number;
  rosterLocked: boolean;
  sorobanContractId?: string;
  sorobanTxHash?: string;
  publicSlug: string;
  createdAt: string;
  organizer: {
    id: string;
    fullName: string;
    whatsappPhone: string;
  };
  prizes: {
    id: string;
    targetStanding: number;
    sponsorName: string;
    prizeType: "USDC_TOKEN" | "MERCHANT_QR_VOUCHER";
    amountUsdc?: number;
    voucherDescription?: string;
    requiredKycLevel: "NONE" | "LEVEL_1_COUNTER" | "LEVEL_2_LIGHT" | "LEVEL_3_FULL";
    claimStatus: "PENDING_TOURNAMENT_END" | "AWAITING_CAPTAIN_KYC" | "READY_TO_CLAIM" | "CLAIMED_VERIFIED";
    winningTeamName?: string;
    claimedByUserName?: string;
    sorobanTxHash?: string;
  }[];
  teams: {
    id: string;
    name: string;
    captainName: string;
    captainPhone: string;
    finalStanding?: number;
    membersCount: number;
    whatsappInviteToken: string;
  }[];
}

export const INITIAL_TOURNAMENTS: TournamentDTO[] = [
  {
    id: "tourn-dota-2026",
    name: "Dota 2 Andes Championship (Esports 5v5)",
    category: "ESPORTS_DOTA",
    mode: "ON_CHAIN_ESCROW",
    status: "COMPLETED",
    teamMaxSize: 5,
    rosterLocked: true,
    sorobanContractId: "CDDXP3Q3I3T77BRG65F7FB5Q2CA4WLWO5AKYSLZTOLUTTMWVO5B2TA2T",
    sorobanTxHash: "e0c575cb16c2c4b9e3d5722f21a66ef475dc16497fd11152598162413c5f5103",
    publicSlug: "dota-andes-2026",
    createdAt: "2026-11-10T14:00:00Z",
    organizer: {
      id: "org-1",
      fullName: "Comunidad Gamer Bolivia",
      whatsappPhone: "+591 70011223",
    },
    prizes: [
      {
        id: "prize-dota-1",
        targetStanding: 1,
        sponsorName: "HyperX & CyberCafé Titan",
        prizeType: "USDC_TOKEN",
        amountUsdc: 300,
        requiredKycLevel: "LEVEL_2_LIGHT",
        claimStatus: "READY_TO_CLAIM",
        winningTeamName: "Huayna Picchu Gaming",
        claimedByUserName: "Carlos 'Kunkka' Mendoza",
      },
      {
        id: "prize-dota-2",
        targetStanding: 2,
        sponsorName: "CyberCafé Titan",
        prizeType: "USDC_TOKEN",
        amountUsdc: 150,
        requiredKycLevel: "LEVEL_2_LIGHT",
        claimStatus: "CLAIMED_VERIFIED",
        winningTeamName: "Illimani eSports",
        claimedByUserName: "Jorge 'Viper' Quispe",
        sorobanTxHash: "219bbb5b9e7142199a3618f11933385baab1a187ed0c921f5beb9f8a0de6c95a",
      },
      {
        id: "prize-dota-3",
        targetStanding: 3,
        sponsorName: "Pizzeria Napoli",
        prizeType: "MERCHANT_QR_VOUCHER",
        voucherDescription: "Combo 5 Pizzas Familiares + Bebidas para el equipo",
        requiredKycLevel: "LEVEL_1_COUNTER",
        claimStatus: "CLAIMED_VERIFIED",
        winningTeamName: "Sajama Squad",
        claimedByUserName: "Mateo Suarez",
        sorobanTxHash: "e0c575cb16c2c4b9e3d5722f21a66ef475dc16497fd11152598162413c5f5103",
      },
    ],
    teams: [
      {
        id: "team-1",
        name: "Huayna Picchu Gaming",
        captainName: "Carlos 'Kunkka' Mendoza",
        captainPhone: "+591 71234567",
        finalStanding: 1,
        membersCount: 5,
        whatsappInviteToken: "huayna-pw2",
      },
      {
        id: "team-2",
        name: "Illimani eSports",
        captainName: "Jorge 'Viper' Quispe",
        captainPhone: "+591 72345678",
        finalStanding: 2,
        membersCount: 5,
        whatsappInviteToken: "illimani-dota",
      },
      {
        id: "team-3",
        name: "Sajama Squad",
        captainName: "Mateo Suarez",
        captainPhone: "+591 73456789",
        finalStanding: 3,
        membersCount: 5,
        whatsappInviteToken: "sajama-sq",
      },
    ],
  },
  {
    id: "tourn-copa-futbol7",
    name: "Copa Relámpago La Paz (Fútbol 7 Nocturno)",
    category: "FOOTBALL",
    mode: "ON_CHAIN_ESCROW",
    status: "IN_PROGRESS",
    teamMaxSize: 12,
    rosterLocked: true,
    sorobanContractId: "CDDXP3Q3I3T77BRG65F7FB5Q2CA4WLWO5AKYSLZTOLUTTMWVO5B2TA2T",
    sorobanTxHash: "e0c575cb16c2c4b9e3d5722f21a66ef475dc16497fd11152598162413c5f5103",
    publicSlug: "copa-futbol7-lapaz",
    createdAt: "2026-11-12T18:00:00Z",
    organizer: {
      id: "org-2",
      fullName: "Complejo Deportivo Calacoto",
      whatsappPhone: "+591 77788990",
    },
    prizes: [
      {
        id: "prize-f7-1",
        targetStanding: 1,
        sponsorName: "Cervecería Huari & Gimnasio Fuerza Total",
        prizeType: "USDC_TOKEN",
        amountUsdc: 250,
        requiredKycLevel: "LEVEL_1_COUNTER",
        claimStatus: "PENDING_TOURNAMENT_END",
      },
      {
        id: "prize-f7-2",
        targetStanding: 2,
        sponsorName: "Ferretería El Cóndor",
        prizeType: "MERCHANT_QR_VOUCHER",
        voucherDescription: "Juego Completo de Indumentaria para 12 Jugadores",
        requiredKycLevel: "LEVEL_1_COUNTER",
        claimStatus: "PENDING_TOURNAMENT_END",
      },
      {
        id: "prize-f7-3",
        targetStanding: 3,
        sponsorName: "Churrasquería Los Leños",
        prizeType: "MERCHANT_QR_VOUCHER",
        voucherDescription: "Parrillada Grupal para 12 personas",
        requiredKycLevel: "LEVEL_1_COUNTER",
        claimStatus: "PENDING_TOURNAMENT_END",
      },
    ],
    teams: [
      {
        id: "team-f1",
        name: "Los Amigos FC",
        captainName: "Rodrigo Morales",
        captainPhone: "+591 76543210",
        membersCount: 12,
        whatsappInviteToken: "amigos-fc",
      },
      {
        id: "team-f2",
        name: "Deportivo Murillo",
        captainName: "Javier Vargas",
        captainPhone: "+591 75432109",
        membersCount: 11,
        whatsappInviteToken: "dep-murillo",
      },
      {
        id: "team-f3",
        name: "Real Miraflores",
        captainName: "Alejandro Silva",
        captainPhone: "+591 74321098",
        membersCount: 12,
        whatsappInviteToken: "real-mira",
      },
    ],
  },
  {
    id: "tourn-hackathon-2026",
    name: "Hackathon Stellar & Soroban Builders 2026",
    category: "HACKATHON",
    mode: "ON_CHAIN_ESCROW",
    status: "IN_PROGRESS",
    teamMaxSize: 4,
    rosterLocked: true,
    sorobanContractId: "CDDXP3Q3I3T77BRG65F7FB5Q2CA4WLWO5AKYSLZTOLUTTMWVO5B2TA2T",
    sorobanTxHash: "219bbb5b9e7142199a3618f11933385baab1a187ed0c921f5beb9f8a0de6c95a",
    publicSlug: "stellar-builders-2026",
    createdAt: "2026-11-08T09:00:00Z",
    organizer: {
      id: "org-3",
      fullName: "Comunidad Stellar Latam",
      whatsappPhone: "+591 79988776",
    },
    prizes: [
      {
        id: "prize-hack-1",
        targetStanding: 1,
        sponsorName: "Stellar Development Foundation Community Fund",
        prizeType: "USDC_TOKEN",
        amountUsdc: 1000,
        requiredKycLevel: "LEVEL_3_FULL",
        claimStatus: "PENDING_TOURNAMENT_END",
      },
      {
        id: "prize-hack-2",
        targetStanding: 2,
        sponsorName: "Tech Hub Bolivia",
        prizeType: "USDC_TOKEN",
        amountUsdc: 500,
        requiredKycLevel: "LEVEL_3_FULL",
        claimStatus: "PENDING_TOURNAMENT_END",
      },
      {
        id: "prize-hack-3",
        targetStanding: 3,
        sponsorName: "Coworking Innova",
        prizeType: "MERCHANT_QR_VOUCHER",
        voucherDescription: "6 Meses de Membresía Coworking + Mentoría Técnica",
        requiredKycLevel: "LEVEL_1_COUNTER",
        claimStatus: "PENDING_TOURNAMENT_END",
      },
    ],
    teams: [
      {
        id: "team-h1",
        name: "Sutika Devs",
        captainName: "Álvaro C.",
        captainPhone: "+591 70123456",
        membersCount: 4,
        whatsappInviteToken: "sutika-team",
      },
      {
        id: "team-h2",
        name: "Soroban Pay",
        captainName: "Elena Rocha",
        captainPhone: "+591 71230987",
        membersCount: 3,
        whatsappInviteToken: "soroban-pay",
      },
    ],
  },
  {
    id: "tourn-kermesse-escolar",
    name: "Kermesse San Calixto — Torneo Escolar de Futsal Sub-17",
    category: "SCHOOL_EVENT",
    mode: "OFF_CHAIN",
    status: "REGISTRATION_OPEN",
    teamMaxSize: 10,
    rosterLocked: false,
    publicSlug: "san-calixto-sub17",
    createdAt: "2026-11-13T10:00:00Z",
    organizer: {
      id: "org-4",
      fullName: "Comité de Padres de Familia",
      whatsappPhone: "+591 78877665",
    },
    prizes: [
      {
        id: "prize-sc-1",
        targetStanding: 1,
        sponsorName: "Librería & Papelería Central",
        prizeType: "MERCHANT_QR_VOUCHER",
        voucherDescription: "Vales de $100 USD en material escolar y deportivo",
        requiredKycLevel: "LEVEL_1_COUNTER",
        claimStatus: "PENDING_TOURNAMENT_END",
      },
    ],
    teams: [
      {
        id: "team-sc-1",
        name: "Promo 2026 A",
        captainName: "Daniel Perez",
        captainPhone: "+591 73344556",
        membersCount: 8,
        whatsappInviteToken: "promo-2026-a",
      },
      {
        id: "team-sc-2",
        name: "Promo 2026 B",
        captainName: "Santiago Luna",
        captainPhone: "+591 74455667",
        membersCount: 9,
        whatsappInviteToken: "promo-2026-b",
      },
    ],
  },
];
