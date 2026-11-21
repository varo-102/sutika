# Sutika

Sutika permite que un patrocinador boliviano fondee premios en USDC de Stellar Testnet para un torneo de Clash Royale (individual) o Mobile Legends: Bang Bang (cinco titulares). El organizador congela las plantillas y declara al ganador. El premio previsto en cada copa es de **5 USDC de prueba para el primer puesto**. En Clash Royale le corresponde a un jugador. En Mobile Legends le corresponde 1 USDC a cada uno de los cinco titulares ganadores.

## Probar y verificar

La portada alterna ilustraciones originales del duelo de torres y del combate 5v5. El carrusel admite pausa, teclado y movimiento reducido.

Abre **Modo evaluador** en `/evaluator`, elige una copa y pulsa **Ver comprobante** en la etapa Registro. Ambos registros están confirmados en Stellar Testnet. El depósito y el reparto siguen pendientes. Las fichas, la guía en `/guia` y los comprobantes se consultan sin cuenta. Si Neon queda temporalmente inaccesible, el evaluador conserva los dos registros confirmados y muestra como desconocidos la inscripción, el depósito y el pago.

| Evidencia de Testnet | Identificador público |
| --- | --- |
| Programa compilado, SHA-256 | `544eed3011d06700e81402670e33100208d0422dbfbd070bbee0239ee9d8c909` |
| Instancia de Sutika Core | [CDNFZLYKPYWPPYZXE6JMLIRHGAVRYAS3MEKBMWGJ7EXAPLXFE52K7QNY](https://stellar.expert/explorer/testnet/contract/CDNFZLYKPYWPPYZXE6JMLIRHGAVRYAS3MEKBMWGJ7EXAPLXFE52K7QNY) |
| Carga del WASM | [Transacción de carga](https://stellar.expert/explorer/testnet/tx/66299c0a6c3370e68ddbd683b6887e2ffc718d63eb0a60be37e22c9eb88c2fcc) |
| Despliegue | [Transacción de despliegue](https://stellar.expert/explorer/testnet/tx/0c451259d13b15303305a3e2e22b9e9448529d61e75d2f4f5f3f352376e8c8b2) |
| Registro de la copa Clash Royale | [5a4bab909fc45b02928cd981057822ddf65f8e6a0709ef5e4ded24b1ec7b6c77](https://stellar.expert/explorer/testnet/tx/5a4bab909fc45b02928cd981057822ddf65f8e6a0709ef5e4ded24b1ec7b6c77) |
| Registro de la copa Mobile Legends | [79844f95778626c03242355d4758f9bfd557fb5ad301dda170b3c4d18d07734c](https://stellar.expert/explorer/testnet/tx/79844f95778626c03242355d4758f9bfd557fb5ad301dda170b3c4d18d07734c) |
| Saldo de la billetera de prueba del patrocinador | [40 USDC de Testnet disponibles para las dos copas](https://stellar.expert/explorer/testnet/tx/0e9efb5e0a2ba7aeaed4e8cde12f90d6e89c64859ea921073822bd7e07923321). El activo sigue en esa billetera hasta la confirmación del fondeo. |
| Depósito y reparto | Consultar el historial de cada torneo. A la publicación de esta revisión, ambos están pendientes. |

**Stellar** es la red donde se verifican los movimientos. **Testnet** usa activos de prueba. **Soroban** ejecuta las reglas escritas en Rust. El **ID del contrato** identifica la instancia que aplica esas reglas. Para comprobar un premio, abre la transacción de pago y coteja los movimientos de USDC hacia cada ganador.

## Arquitectura y recorrido

| Componente | Responsabilidad |
| --- | --- |
| Next.js, React y TypeScript | Portada, inscripción, firma, confirmación y consulta pública. Las funciones de Vercel usan São Paulo (`gru1`). |
| Freighter y Pollar | Freighter conecta una billetera de Testnet en el navegador. Pollar puede ofrecer acceso por código enviado al correo y crear una cuenta Stellar de prueba. La firma SEP-53 acredita el control de la billetera para escribir datos. |
| PostgreSQL 19 y Prisma | Guarda competiciones, equipos, intenciones firmadas y los comprobantes confirmados. El proyecto de Neon usa São Paulo (`aws-sa-east-1`). |
| Trustless Work Multi-Release V2 | API de Testnet para preparar XDR de despliegue, fondeo, hitos y aprobaciones. El primer puesto tiene un único hito y Sutika Core es su destinatario programado. V2 está en beta en Testnet. |
| Sutika Core | Vincula custodia y torneo, congela plantillas, registra al ganador, aplica una ventana de 24 horas y reparte USDC. La operación revierte si el neto recibido difiere del monto aprobado. |

1. El organizador puede preparar y revisar una ficha en `/create` antes de conectarse. Para publicarla conecta Freighter o accede por correo si Pollar está configurado, firma la creación y registra el torneo en Stellar. Cada jugador firma su inscripción. La inscripción es gratuita. Los participantes que firman transacciones necesitan una cuenta activa en Testnet. Los ganadores necesitan una línea de confianza con el USDC de prueba.
2. Con Trustless Work configurado, el patrocinador prepara y vincula la custodia y deposita 5,1177072 USDC de prueba, incluidas las comisiones. Stellar confirma el depósito y el servidor verifica el activo, el importe y el destinatario antes de mostrar «En custodia».
3. El organizador congela al menos dos plantillas completas, declara un ganador y registra el resultado en el hito. El patrocinador aprueba el hito y al ganador. El periodo de impugnación empieza con la declaración en el ledger. El árbitro puede ratificar el resultado o devolverlo para su corrección.
4. Tras 24 horas, un integrante premiado solicita el cobro. Sutika Core invoca al escrow, comprueba el cambio de saldo y transfiere el neto a uno o cinco ganadores dentro de la misma transacción. Los residuos de la división se asignan en el orden que quedó congelado. El servidor verifica el evento de Sutika y todas las transferencias SEP-41 antes de persistir «pago confirmado».
5. Una firma rechazada, un fallo de red o una transacción pendiente dejan un estado visible. La consulta reutiliza el hash guardado. Las cuentas de organizador, patrocinador y árbitro deben ser distintas.

El sistema de disputas propio del proveedor conserva las facultades de sus árbitros. El control de billetera del MVP acredita autorización para reclamar. La comprobación documental de identidad y las rampas fiat son trabajo futuro. [Core API V2](https://docs.trustlesswork.com/trustless-work/v2-en/api-rest/introduction) · [Pollar](https://docs.pollar.xyz/docs/getting-started/quickstart)

## Ejecutar la web

Usa Node 26.13.1 LTS y npm 12.2.3. Copia `.env.example` a `.env.local`. Carga la conexión agrupada de Neon en `DATABASE_URL` y la directa en `DIRECT_URL`. Freighter funciona con una billetera en Testnet. Para mostrar «Entrar con correo» configura `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY` con una clave `pub_testnet_`. Habilita el acceso por código, la creación de cuentas Stellar clásicas y el origen exacto del navegador en Pollar. Para preparar, depositar y aprobar pagos configura `TRUSTLESS_WORK_API_KEY` con la clave de la Core API V2 de prueba. Los identificadores públicos de la demo están en `src/lib/deployment.json`.

```sh
npm ci
npm run migrate:deploy
npm run seed
npm run dev
```

El seed es idempotente y usa roles de prueba predeterminados. Para probar tus propias billeteras, crea un torneo desde la interfaz. El migrador incluye la línea base histórica y una migración aditiva para esports. En una base con datos de la versión original se debe reconciliar la línea base antes de ejecutar las migraciones. En Vercel, configura las conexiones del proyecto de São Paulo, aplica las migraciones por conexión directa y despliega el commit revisado. Las claves de Pollar y Trustless Work habilitan los recorridos de correo y custodia. Verifica en incógnito que `/evaluator` y ambas fichas abran y enlacen al registro en Stellar.

## Verificación de la entrega

```sh
npm run typecheck
npm test
npm audit --audit-level=high
npm run build
cd contracts/sutika-core
cargo test --locked
stellar contract build
```

El proyecto fija Rust 1.100.0, Soroban SDK 29.0.1, Stellar CLI 30.0.1 y Stellar SDK para JavaScript 17.4.0. En el evaluador se consulta el protocolo de Testnet en vivo. El SDK web lee los datos de Bell, protocolo 30. Los pagos utilizan direcciones de cuentas Stellar clásicas. [Guía de Bell](https://stellar.org/es/blog/desarrolladores/bell-protocol-30-upgrade-guide)

El WASM se genera en `target/wasm32v1-none/release/sutika_core.wasm`. El constructor recibe el contrato de USDC de **Testnet** que figura en el manifiesto de despliegue. El contrato anterior queda como referencia histórica; la demo usa la instancia indicada arriba.

El organizador usa Sutika gratis. El patrocinador aporta el pozo bruto, del que se desglosan una comisión de plataforma de prueba del 2 % y una comisión de protocolo del 0,3 %. El primer puesto recibe los 5 USDC íntegros. El aporte del patrocinador cubre el premio más 0,1023541 USDC de plataforma y 0,0153531 USDC de protocolo. La hipótesis de precio de Sutika es del 1–3 %. [Modelo de negocio y plan de 30 días para Atlas](docs/atlas.md)
