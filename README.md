# SUTIKA

SUTIKA ayuda a las comunidades bolivianas de **Clash Royale 1v1** y **Mobile Legends 5v5** a reservar premios en USDC y comprobar su entrega. El organizador publica resultados, el patrocinador puede verificar su aporte y cada jugador consulta cuánto le corresponde.

Proyecto de Álvaro Tapia y Federico para la **National Startups Hackathon by Stellar**. La demo utiliza Stellar Testnet y activos de prueba.

[Abrir evaluador](https://sutika.vercel.app/evaluator) · [Evaluator in English](https://sutika.vercel.app/en/evaluator) · [Guía de uso](https://sutika.vercel.app/guia)

## Demostración para el jurado

1. Abre el evaluador sin iniciar sesión. Compara el depósito, el resultado aprobado y una devolución en el explorador de Stellar.
2. Abre la copa de Clash Royale para ver el premio individual. En Mobile Legends, revisa el reparto del 20 % por cada uno de los cinco titulares.
3. Explora el formulario en tres pasos para comprobar los cupos, las modalidades y el desglose antes de firmar. [Crear un torneo de prueba](https://sutika.vercel.app/create)

| Ensayo V3 | Comprobantes de Stellar Testnet |
| --- | --- |
| [Clash Royale 1v1 · copa patrocinada](https://sutika.vercel.app/c/copa-de-la-corona-ensayo-1v1-72e254dbffd3) | [Depósito](https://stellar.expert/explorer/testnet/tx/e24f6a2416c90331b8110ee2969b3c2dc1a93adce6f375d9151dc620f1ecda3e) · [Cierre de plantillas](https://stellar.expert/explorer/testnet/tx/3df9b066a11b5de344c49403cc9eb39eae2c5b50cfdad29ae475613343170280) · [Resultado](https://stellar.expert/explorer/testnet/tx/90ba69c3f61071861983685c768cd975a7b9864e9b037118d34c1c99c8dfe423) · [Aprobación](https://stellar.expert/explorer/testnet/tx/ae56c01bac6be6e3e8bcb3ca89ba89c9a28d82f92646c69a90cd5742b63614a9) |
| [Mobile Legends 5v5 · copa mixta](https://sutika.vercel.app/c/copa-del-alba-ensayo-5v5-8f1a673c83eb) | [Aporte patrocinado](https://stellar.expert/explorer/testnet/tx/8145bd66edcfb55300ec9399bf7414093425d33f3f578a739af864a03f5abd55) · [Cuota de equipo](https://stellar.expert/explorer/testnet/tx/b42bb016cf520e2d9e3d9fd8870ee0bdec075921fff165046f963e8e43a80602) · [Cierre de plantillas](https://stellar.expert/explorer/testnet/tx/da866ac5534c45c41025255037249c349490afaf4a8bf2cc2032c3fe847c8681) · [Resultado](https://stellar.expert/explorer/testnet/tx/58bac18d26afd5c4a40950135cbfb370e3992f6d19bd40a4269a7bb3c084b3f7) · [Aprobación](https://stellar.expert/explorer/testnet/tx/c05069b4a7291096771e543869a1d2a3563915db5046ad1046f6ac1bdd43fb12) |
| Devoluciones en ensayos separados | [5 USDC devueltos al patrocinador](https://stellar.expert/explorer/testnet/tx/ec4f35f864dc09a5736da68027eea26b462532a1c050dad7da11a8012771e4a3) · [0,25 USDC de cuota devueltos a la cuenta de origen](https://stellar.expert/explorer/testnet/tx/0991f942c719fbd3df6a8233c59665a6b95ef09eaa072a8459150b8b3648c472) |

**Estado de la demo.** Las dos copas muestran el resultado aprobado y el premio reservado. El pago 1v1, el reparto 5v5 y la identidad en Sumsub Sandbox siguen en validación. El alta por correo está integrada y su prueba en Android físico depende de la activación de billeteras Stellar en Pollar Testnet. [Seguimiento de cobro](https://github.com/varo-102/sutika/issues/9) · [Seguimiento móvil](https://github.com/varo-102/sutika/issues/10)

### Contrato en Stellar Testnet

| Dato | Valor |
| --- | --- |
| ID de Sutika Core V3 | [`CDFRSOJSCRGVLWVSQDZUQWMKEDEC2JIRNLDDIJN2IDSLQHJXJRFUEAMK`](https://stellar.expert/explorer/testnet/contract/CDFRSOJSCRGVLWVSQDZUQWMKEDEC2JIRNLDDIJN2IDSLQHJXJRFUEAMK) |
| SHA-256 del WASM V3 | `c6ccbf7db1c640260506488bdac8c8a0068e04171ab13a8509a94477f48b28bd` |
| Publicación | [Carga del WASM](https://stellar.expert/explorer/testnet/tx/b9fb44b26b7e2bc8363bb95861d2330b3135d258683d0f0ddee99bee50c9d18f) · [Despliegue](https://stellar.expert/explorer/testnet/tx/ab8267144e764bf16fdbc9e6fd8a3750db829efee241d1a9063c327f1275ae95) · [Manifiesto del repositorio](src/lib/v3/deployment.json) |

Stellar confirma los movimientos y Soroban ejecuta el contrato. La demo usa **USDC de prueba** para premios y cuotas y **XLM de prueba** para las tarifas de red. El evaluador consulta en vivo el protocolo de Testnet.

## Cómo funciona

1. El **organizador** define los cupos, el cierre y cómo se financia el premio. Puede elegir patrocinio, cuotas o una combinación.
2. El **patrocinador** firma su depósito en custodia. Si hay cuota, cada jugador de Clash Royale o el capitán de Mobile Legends firma el aporte. Cuando se cancela el torneo, la cuota se puede devolver íntegra a la billetera que la pagó.
3. El **organizador** cierra las plantillas y publica el resultado. El patrocinador aprueba si hubo aporte patrocinado y el árbitro aprueba si hubo solo cuotas. El contrato aplica una ventana de 24 horas para impugnar.
4. Los **ganadores** confirman su billetera después de la verificación de prueba. La liquidación transfiere en una sola transacción el premio de un puesto a sus titulares. La ficha muestra «Pagado» al verificar los destinatarios y los importes en Stellar.

Organizar es gratis en el modelo propuesto. La tarifa total es 2,8 % para un pozo patrocinado, 5 % por inscripciones o 3,5 % para uno mixto. El formulario muestra los importes antes de firmar. La disposición de pago y los precios se validarán con comunidades y patrocinadores. [Modelo de negocio y plan de 30 días](docs/atlas.md) · [Validación comercial](https://github.com/varo-102/sutika/issues/3)

## Arquitectura y estructura

| Carpeta | Qué contiene |
| --- | --- |
| [`src/app`](src/app) · [`src/components`](src/components) | Web Next.js en TypeScript, rutas públicas ES/EN, API y componentes. Pollar ofrece correo y firma cuando se habilitan las billeteras. Varial (Freighter) conecta billeteras compatibles. |
| [`src/lib/v3`](src/lib/v3) | Reglas V3, preparación de operaciones, validación de comprobantes y conexión con Stellar, Trustless Work y Sumsub Sandbox. |
| [`contracts/sutika-core`](contracts/sutika-core) | Workspace Rust y Soroban con el contrato original y V3. Trustless Work custodia el patrocinio con un hito por puesto. Sutika Core guarda las cuotas y aplica las reglas de devolución y reparto. |
| [`prisma`](prisma) | Esquema y migraciones. Neon PostgreSQL guarda fichas, operaciones y referencias a las transacciones confirmadas. |
| [`public`](public) · [`docs`](docs) | Imágenes y marca de SUTIKA, guía técnica de V3 y ficha del proyecto para Atlas. |
| [`tests`](tests) · [GitHub Actions](.github/workflows/verify.yml) | Pruebas de cálculo, recorrido y comprobantes. CI también ejecuta las pruebas Rust y comprueba las dos compilaciones WASM. |

Las funciones de Vercel (`gru1`) y PostgreSQL 19 en Neon (`aws-sa-east-1`) operan en São Paulo. Las fichas V3 viven en `/c/[slug]` y las copas originales en `/tournaments/[slug]`. El selector ES/EN conserva la invitación al cambiar de idioma.

## Ejecutar en local

Usa Node.js 26.13.1 y npm 12.2.3. Instala las dependencias y copia [`.env.example`](.env.example) a `.env.local`. Para crear torneos, configura `DATABASE_URL` y `DIRECT_URL` de una base de desarrollo antes de migrar.

```sh
npm ci
npm run migrate:deploy
npm run dev
```

Abre `http://localhost:3000/evaluator` para explorar los comprobantes. `npm run seed` es opcional y carga ejemplos del contrato original en la base de desarrollo. Para firmar usa una cuenta Stellar Testnet activa. Los depósitos, cuotas y cobros requieren habilitar el activo USDC de prueba en la billetera. Mantén las claves de proveedor en variables privadas. [Configuración de Pollar, Trustless Work y Sumsub](docs/v3.md#pollar-y-los-secretos)

## Verificar

```sh
npm run typecheck
npm test
npm audit --audit-level=high
npm run build
```

Desde `contracts/sutika-core`, ejecuta `cargo test --locked` y `stellar contract build`. El workspace fija Rust 1.100.0 y Soroban SDK 29.0.1. CI usa Stellar CLI 30.0.1 y compara los hashes del WASM con ambos manifiestos. [Verificación en GitHub Actions](https://github.com/varo-102/sutika/actions/workflows/verify.yml)
