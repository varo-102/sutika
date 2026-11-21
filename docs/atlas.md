# Sutika para Atlas

**Problema.** En torneos comunitarios de esports en Bolivia, organizadores y jugadores necesitan saber si un premio prometido tiene respaldo y cómo se distribuye. Esta hipótesis está pendiente de entrevistas documentadas.

**Usuario y cliente.** El primer segmento son comunidades bolivianas que organizan torneos de Clash Royale y Mobile Legends por WhatsApp o Discord. El organizador gestiona la competencia y los jugadores reclaman el premio. El cliente de pago propuesto es el patrocinador que financia el premio al ganador. El punto de entrada son los administradores de comunidades, capitanes y clubes universitarios dispuestos a realizar un piloto.

**Alternativas actuales.** El efectivo y las transferencias QR permiten pagar localmente. Hojas de cálculo, chats y organizadores de brackets como start.gg o Battlefy coordinan participantes y resultados. La hipótesis de diferenciación de Sutika es que el patrocinador puede verificar el depósito y el ganador puede comprobar su transferencia individual.

**Referencia comparable.** La portada de Good Game Guild explica con un ejemplo de inscripciones en XLM y reparto 60/30/10. Su formulario beta permite entrada gratuita o de pago, un aporte del organizador, selección de XLM o USDC, reparto personalizable y una revisión previa a firmar. El video ilustra el depósito por QR y una liquidación con importes y enlaces por puesto. Su SDK 0.1.0 documenta distribuciones configurables. Sutika explora un piloto boliviano con patrocinador único, inscripción gratuita y 5 USDC netos exclusivamente al primer puesto. La inscripción de cada jugador, la selección de un patrocinador externo y el reparto por titular siguen el diseño propio de Sutika. [Portada de GGG](https://ggg.quest/) · [Formulario beta](https://beta.app.ggg.quest/tournaments/new) · [Explicador de Artisam Labs](https://www.youtube.com/watch?v=K0GpI1Xg6uk) · [SDK publicado](https://www.npmjs.com/package/@goodgameguild/escrow-sdk)

**Modelo económico.** La creación y gestión del torneo son gratuitas. Se probará una comisión al patrocinador de entre 1 % y 3 % del pozo. La demo usa 2 % más el 0,3 % de protocolo. Para depositar un premio de 5 USDC de prueba, el patrocinador aportaría 5,1177072 USDC. El cálculo reserva 0,1023541 USDC para la plataforma y 0,0153531 USDC para el protocolo. Una página verificada y reportes para patrocinadores recurrentes son opciones comerciales posteriores.

**Evidencia actual.** El repositorio contiene el contrato y sus pruebas. El evaluador enlaza los dos registros confirmados en Testnet y muestra depósito y reparto pendientes. Aún no hay entrevistas citables, cartas de interés ni un tamaño de mercado medido. Los torneos de prueba y los activos de Testnet se reportan aparte de la actividad comercial. El equipo busca entre tres y cinco expresiones escritas de interés con permiso para citarlas.

| Días | Trabajo | Resultado que se medirá |
| --- | --- | --- |
| 1–7 | Entrevistar a 5–10 organizadores, jugadores y patrocinadores, con permiso para citar. Registrar cómo pagan hoy y qué problemas han tenido. | Número de entrevistas y casos documentados de fricción o impago. |
| 8–14 | Ofrecer un piloto de Clash Royale y otro de Mobile Legends. Medir tiempo de registro, fondeo y cobro. | Torneos iniciados, usuarios que completan la inscripción y premios recibidos. |
| 15–21 | Probar la comisión con patrocinadores. Recoger objeciones y cartas de interés voluntarias. | Disposición de pago y número de expresiones escritas. |
| 22–30 | Invitar a los primeros organizadores a repetir. Contrastar volumen, frecuencia y retención con las entrevistas. | Volumen entregado, torneos completados, organizadores que repiten y patrocinadores que vuelven. |

**Condiciones para un evento real.** Las copas presentadas en la hackatón son demostraciones en Testnet con ilustraciones propias. Las directrices de Supercell limitan la promoción de criptomonedas y blockchain en sus eventos. Antes de anunciar un torneo público de Clash Royale con este sistema, contrastar el formato con Supercell. [Directrices para torneos](https://supercell.com/en/tournament-guidelines/) · [Política de material para aficionados](https://supercell.com/en/fan-content-policy/) · [Términos de esports de MOONTON](https://mlbbesports.com/legal/terms)

**Equipo.** Álvaro concibió Sutika y desarrolló el contrato y el despliegue inicial. El prototipo evolucionó de un sistema de verificación de rifas a la custodia de premios para esports. Federico trabaja en el MVP esports, la experiencia web, las integraciones, la base de datos y la verificación técnica. La autoría se puede comprobar en el historial público y en el PR. La entrega en Atlas y la evaluación de IA restante se gestionan desde la cuenta del equipo.

## Alcance del piloto

Los dos formatos de la demo son Clash Royale 1v1 y Mobile Legends 5v5. Dota 2 y fútbol 7 quedan como posibles extensiones tras el piloto. Las personas que juegan y organizan ayudan a validar el uso. Los patrocinadores son la primera hipótesis de cliente.

## Texto para actualizar la ficha

Seleccionar **Pymes** como primer cliente potencial, **Comisión por transacción** como hipótesis de ingresos y **Prototipo** como etapa. En competidores o alternativas, agregar WhatsApp, Discord, hojas de cálculo, QR bancario y Battlefy.

**Pitch.** SUTIKA ayuda a las comunidades bolivianas de esports a comprobar si un premio fue depositado y a quién se pagó.

**Descripción.** SUTIKA es un prototipo de torneos comunitarios para Bolivia. Presentamos dos copas registradas en Stellar Testnet, Clash Royale 1v1 y Mobile Legends 5v5. Cada copa prevé 5 USDC de prueba para el primer puesto. En el Modo Evaluador se pueden abrir ambos comprobantes de registro sin cuenta. El depósito y el reparto de estas copas están pendientes.

**Problema.** Cuando una comunidad coordina un torneo por WhatsApp o Discord, el anuncio del premio, la aprobación del resultado y los comprobantes suelen quedar dispersos. Jugadores y patrocinadores necesitan saber si el premio está reservado y si se pagó. Estamos validando con organizadores bolivianos con qué frecuencia ocurre y cómo lo resuelven hoy.

**Solución.** Cada torneo tiene una ficha que distingue registro, depósito, resultado y pago. Neon guarda las inscripciones. Stellar verifica el depósito firmado por el patrocinador y las transferencias del premio. Después de aprobar al ganador y respetar 24 horas de revisión, el contrato prevé 5 USDC al jugador de 1v1 o 1 USDC para cada uno de los cinco ganadores de 5v5.

**Primer nicho.** Comunidades bolivianas de Clash Royale y Mobile Legends. El primer cliente propuesto es el comercio local que patrocina sus torneos.

**Dónde empiezas.** Bolivia, comunidades de WhatsApp y Discord

**Clientes posibles en ese nicho.** Por medir en entrevistas con organizadores y patrocinadores.

**Quién paga.** El patrocinador cubre el premio y una comisión. El organizador y los jugadores usan la demo gratis.

**Precio.** Comisión propuesta de 1 a 3 % del pozo, por validar.

**Cómo llegas a tus primeros clientes.** El primer canal será el contacto directo con comunidades y clubes universitarios por WhatsApp y Discord. Con ellos buscaremos presentar el piloto a comercios locales, pedir de 3 a 5 expresiones de interés y medir quién vuelve a patrocinar.

**Validación.** Tenemos dos registros verificables en Stellar Testnet y un contrato público. El depósito y el pago de las copas siguen pendientes. Aún no tenemos entrevistas citables, cartas de interés ni ingresos. En los primeros 30 días buscamos conversar con 5 a 10 organizadores y patrocinadores, y medir interés, tiempo del proceso y repetición.

Para la demo, usar la URL pública del evaluador tras comprobarla en incógnito. En el repositorio, usar el enlace público de Sutika. En evidencias, enlazar ambos registros como pruebas técnicas. El video y el pitch deck pueden añadirse después de revisar la web.

- [Repositorio público](https://github.com/varo-102/sutika) · [Código de Sutika Core](https://github.com/varo-102/sutika/tree/main/contracts/sutika-core)
- [Registro de Clash Royale en Testnet](https://stellar.expert/explorer/testnet/tx/5a4bab909fc45b02928cd981057822ddf65f8e6a0709ef5e4ded24b1ec7b6c77)
- [Registro de Mobile Legends en Testnet](https://stellar.expert/explorer/testnet/tx/79844f95778626c03242355d4758f9bfd557fb5ad301dda170b3c4d18d07734c)
