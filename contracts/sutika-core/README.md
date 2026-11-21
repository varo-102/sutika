# Sutika Core

Registro de torneos y reparto de premios en Stellar Testnet. El constructor fija el contrato del token. Cada torneo vincula el escrow a su identificador y a sus roles, congela las plantillas, registra un único ganador con un premio neto de 5 USDC e impone una ventana de impugnación de 24 horas. El proceso de liberación y el reparto se ejecutan en una sola transacción.

Desde este directorio:

```sh
cargo test --locked
stellar contract build
```

El toolchain de Rust está fijado en `rust-toolchain.toml`. Usa Stellar CLI 30.0.1. Consulta el [README del proyecto](../../README.md) para la arquitectura, la instancia desplegada y los comprobantes públicos.
