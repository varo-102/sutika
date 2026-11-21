# SUTIKA

SUTIKA ayuda a organizadores y jugadores bolivianos a verificar premios de torneos comunitarios de **Clash Royale 1v1** y **Mobile Legends 5v5** en Stellar Testnet.

- **Pozos por inscripción.** Se puede usar patrocinio, cuotas de inscripción o una combinación. Una cuota de prueba vuelve a su remitente si el torneo se cancela.
- **Premio para cinco titulares.** El reparto de Mobile Legends es 20 % por titular por defecto. El equipo puede acordar sus porcentajes al inscribirse.
- **Confirmaciones en Stellar.** Sutika Core aplica el cierre de listas y 24 horas para impugnar. Trustless Work guarda el aporte patrocinado. Pollar ofrece el acceso con correo y Freighter conecta una cuenta de prueba existente.

## Demostración

La [demo pública del evento](https://sutika.vercel.app/evaluator) mantiene los registros confirmados de las dos copas originales. El código de la V3 ofrece un recorrido en `/create`, publica las fichas en `/c/[slug]` y conserva los comprobantes históricos en sus URLs originales. Las copas de la portada conservan un premio previsto de 5 USDC de prueba para el primer lugar.

| Evidencia | Prueba pública |
| --- | --- |
| Registro de Clash Royale en la demo original | [Transacción](https://stellar.expert/explorer/testnet/tx/5a4bab909fc45b02928cd981057822ddf65f8e6a0709ef5e4ded24b1ec7b6c77) |
| Registro de Mobile Legends en la demo original | [Transacción](https://stellar.expert/explorer/testnet/tx/79844f95778626c03242355d4758f9bfd557fb5ad301dda170b3c4d18d07734c) |
| Sutika Core V3 | [Instancia de Testnet](https://stellar.expert/explorer/testnet/contract/CDFRSOJSCRGVLWVSQDZUQWMKEDEC2JIRNLDDIJN2IDSLQHJXJRFUEAMK) |
| V3, carga y despliegue | [Carga del WASM](https://stellar.expert/explorer/testnet/tx/b9fb44b26b7e2bc8363bb95861d2330b3135d258683d0f0ddee99bee50c9d18f) · [Despliegue](https://stellar.expert/explorer/testnet/tx/ab8267144e764bf16fdbc9e6fd8a3750db829efee241d1a9063c327f1275ae95) |
| SHA-256 del WASM V3 | `c6ccbf7db1c640260506488bdac8c8a0068e04171ab13a8509a94477f48b28bd` |

Stellar registra los movimientos. Testnet usa activos de prueba. Soroban ejecuta las reglas del contrato Rust. El ID identifica una instancia y el hash de una transferencia permite verificar su importe y destino.

## Arquitectura

| Componente | Responsabilidad |
| --- | --- |
| Next.js, React y TypeScript | Creación, inscripción, firma y consulta de comprobantes. Región Vercel `gru1` en São Paulo. |
| Pollar y Freighter | Acceso por código de correo o billetera en Testnet. El usuario firma la intención SEP-53 y la operación de Stellar. |
| PostgreSQL 19, Prisma y Neon | Fichas, operaciones, cuotas y reembolsos confirmados. Región `aws-sa-east-1` en São Paulo. |
| Trustless Work Multi-Release V2 | El escrow patrocinado se crea en la fábrica pública de Testnet con un hito por posición. Su API prepara el depósito y Sutika Core vincula la custodia y fondea en la misma transacción. |
| Sutika Core V3 | Inmoviliza cuotas, calcula reembolsos, congela plantillas, registra resultados y permite el reparto una vez cumplidas las condiciones de cobro. |

El organizador fija los cupos y la fecha de cierre. En Mobile Legends, la cuota corresponde al equipo y el capitán firma el aporte. Cada titular acepta su posición y reparto. Si falta el mínimo al cierre, cualquiera puede habilitar devoluciones. El contrato devuelve el principal de cada cuota a quien lo aportó, una sola vez.

El resultado requiere aprobación del patrocinador cuando existe aporte patrocinado y el árbitro aprueba en la modalidad por inscripción. El resultado puede impugnarse durante 24 horas. El árbitro puede mantenerlo o publicar una corrección que inicia un nuevo plazo. Cada ganador completa una verificación ligera de prueba y firma el cobro con su billetera. El pago de un puesto envía todos los importes de sus titulares en una transacción. La web exige que el hash confirmado coincida con los eventos de Sutika y las transferencias de USDC esperadas antes de mostrar un premio pagado.

[Tarifas, configuración de proveedores y recorrido V3](docs/v3.md) · [Modelo de negocio y plan de 30 días para Atlas](docs/atlas.md)

## Ejecutar

Usa Node 26.13.1 LTS y npm 12.2.3. Copia `.env.example` a `.env.local` y carga las conexiones de desarrollo. Aplica las migraciones en una rama de base de datos de prueba. `npm run seed` es opcional y carga las copas originales.

```sh
npm ci
npm run migrate:deploy
npm run dev
```

Freighter necesita una cuenta activa en Testnet. Para transferir o recibir USDC, la cuenta necesita una línea de confianza con el activo de prueba. Las claves privadas de cuentas permanecen en sus billeteras. Configura las claves privadas de proveedor en el entorno del servidor.

## Verificar

```sh
npm run typecheck
npm test
npm audit --audit-level=high
npm run build
cd contracts/sutika-core
cargo test --locked
stellar contract build
```

El repositorio fija Rust 1.100.0, Soroban SDK 29.0.1, Stellar CLI 30.0.1 y Stellar SDK para JavaScript 17.4.0. GitHub Actions coteja los dos WASM con sus manifiestos. La V3 consulta Stellar Testnet y usa el protocolo de la red vigente. [Guía de Bell, protocolo 30](https://stellar.org/es/blog/desarrolladores/bell-protocol-30-upgrade-guide)
