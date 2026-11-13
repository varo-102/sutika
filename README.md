# Sutika — Patrocinios y Premios Verificables en Stellar Soroban

Plataforma de confianza, custodia de premios (*Promotional Escrow*) y activación comercial de sponsors para torneos deportivos (fútbol 7/11, futsal, voleibol, básquetbol), competencias individuales (ajedrez), esports (Dota 2) y hackatones sobre **Stellar** y **Soroban**.

---

## 🚀 Despliegue en Stellar Testnet

- **Contrato Soroban:** [`CDDXP3Q3I3T77BRG65F7FB5Q2CA4WLWO5AKYSLZTOLUTTMWVO5B2TA2T`](https://stellar.expert/explorer/testnet/contract/CDDXP3Q3I3T77BRG65F7FB5Q2CA4WLWO5AKYSLZTOLUTTMWVO5B2TA2T)
- **Cuenta Deployer / Funder:** [`GDTKODWTQGQUJ2RKUB4PIWA54VCEBJTNC3XFYRJMWEQKF7YXL2JYSLDR`](https://stellar.expert/explorer/testnet/account/GDTKODWTQGQUJ2RKUB4PIWA54VCEBJTNC3XFYRJMWEQKF7YXL2JYSLDR)
- **Red:** Stellar Testnet (Protocol 22)
- **RPC:** `https://soroban-testnet.stellar.org`

---

## 🛠️ Tecnologías

- **Smart Contracts:** Rust, Soroban SDK v28, Stellar CLI v28
- **Frontend & Fullstack:** Next.js 14+ (App Router), React 18, Tailwind CSS, Lucide Icons
- **Base de Datos & ORM:** Neon Serverless PostgreSQL + Prisma ORM
- **Identidad & Criptografía:** SHA-256 IdentityCommitmentHash (Claim-Gated KYC), SEP-41 Token & Escrow Events

---

## ⚙️ Variables de Entorno para Vercel y Local

Configura las siguientes variables en tu archivo `.env.local` o en el panel de **Vercel** (`Settings > Environment Variables`):

```env
DATABASE_URL="postgresql://neondb_owner:TU_PASSWORD@ep-TU-ID.us-east-2.aws.neon.tech/neondb?sslmode=require"
NEXT_PUBLIC_STELLAR_NETWORK="TESTNET"
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
NEXT_PUBLIC_SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
NEXT_PUBLIC_SUTIKA_CONTRACT_ID="CDDXP3Q3I3T77BRG65F7FB5Q2CA4WLWO5AKYSLZTOLUTTMWVO5B2TA2T"
SOROBAN_SPONSOR_SECRET="SD5QIDFF6QTJQARP4X4R7UTJB5DMM4QZMMHV3I3WMOBIIYOURTSYKWNN"
```

---

## 📦 Comandos Rápidos

```bash
# Instalar dependencias
npm install

# Generar cliente de Prisma
npx prisma generate

# Sincronizar esquema con la base de datos Neon
npx prisma db push

# Ejecutar seed de prueba
npm run seed

# Ejecutar en desarrollo
npm run dev

# Compilar para producción
npm run build
```

---

## 🏆 Criterios de Evaluación para Hackathons

1. **Modo Evaluador Integrado (`/evaluator`):** Guía interactiva que permite a los jurados auditar los contratos en Stellar Expert y probar el ciclo de vida completo en menos de 2 minutos.
2. **Custodia Criptográfica Real:** La función `claim_podium_prize` y la emisión de recibos (*Proof of Prize Delivery*) se ejecutan de manera verificable en Soroban Testnet.
3. **Privacidad de Identidad (PII Vault):** Los datos personales y documentos no se escriben en texto plano en la blockchain; únicamente se almacena el hash criptográfico `IdentityHash`.
