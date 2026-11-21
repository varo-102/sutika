# Contratos de SUTIKA

Workspace Rust para Stellar Testnet. Ambos contratos usan Soroban SDK 29.0.1.

| Contrato | Responsabilidad |
| --- | --- |
| [`sutika_core_v3`](contracts/sutika-core-v3) | Admite premios patrocinados, cuotas y pozos mixtos. Integra la custodia patrocinada con Trustless Work y guarda los aportes por inscripción. Aplica la ventana de impugnación de 24 horas y liquida el premio de cada puesto a una o cinco billeteras de la plantilla congelada. |
| [`sutika_core`](contracts/sutika-core) | Contrato de la demo original, con premio configurable por torneo y fichas históricas en `/tournaments/[slug]`. |

Ejecuta los comandos desde este directorio con Stellar CLI 30.0.1.

```sh
cargo test --locked
stellar contract build
```

`rust-toolchain.toml` fija Rust 1.100.0 y el objetivo `wasm32v1-none`. GitHub Actions coteja los artefactos del build con los manifiestos de las instancias de Testnet. [Contrato original](../../src/lib/deployment.json) · [Contrato V3](../../src/lib/v3/deployment.json) · [Recorrido del jurado](../../README.md#demostración-para-el-jurado)
