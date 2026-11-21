# Sutika para Atlas

**Problema.** En torneos comunitarios de esports en Bolivia, organizadores y jugadores necesitan saber si un premio prometido tiene respaldo y cómo se distribuye. Esta hipótesis está pendiente de entrevistas documentadas.

**Usuario y cliente.** El primer segmento son comunidades bolivianas que organizan torneos de Clash Royale y Mobile Legends por WhatsApp o Discord. El organizador gestiona la competencia y los jugadores reclaman el premio. El cliente de pago propuesto es el patrocinador que financia el premio al ganador. El punto de entrada son los administradores de comunidades, capitanes y clubes universitarios dispuestos a realizar un piloto.

**Alternativas actuales.** El efectivo y las transferencias QR permiten pagar localmente. Hojas de cálculo, chats y organizadores de brackets como start.gg o Battlefy coordinan participantes y resultados. La hipótesis de diferenciación de Sutika es que el patrocinador puede verificar el depósito y el ganador puede comprobar su transferencia individual.

**Referencia comparable.** Good Game Guild presenta un pozo formado por inscripciones de jugadores en XLM. En su web, el árbitro confirma la clasificación y el contrato reparte el pozo 60/30/10. Su SDK publicado describe distribuciones configurables y comprobación de liquidaciones. Sutika prueba otra hipótesis comercial en Bolivia: un patrocinador financia todo el premio, la inscripción es gratuita y los 5 USDC llegan exclusivamente al ganador. La ficha pública de Sutika permite abrir un comprobante por etapa. [Sitio de GGG](https://ggg.quest/) · [Ficha del SDK](https://www.npmjs.com/package/@goodgameguild/escrow-sdk)

**Modelo económico.** La creación y gestión del torneo son gratuitas. Se probará una comisión al patrocinador de entre 1 % y 3 % del pozo. La demo usa 2 % más el 0,3 % de protocolo. En cada torneo de la demo, el patrocinador aporta 5,1177072 USDC de prueba. El primer puesto recibe 5 USDC netos. La plataforma recibe 0,1023541 USDC y el protocolo 0,0153531 USDC. Una página verificada y reportes para patrocinadores recurrentes son opciones comerciales posteriores.

**Evidencia actual.** El repositorio contiene el contrato y sus pruebas. El evaluador enlaza la red de prueba y distingue registro, depósito y reparto. Aún no hay entrevistas citables, cartas de interés ni un tamaño de mercado medido. Los torneos de prueba y los activos de Testnet se reportan aparte de la actividad comercial. El equipo busca entre tres y cinco expresiones escritas de interés con permiso para citarlas.

| Días | Trabajo | Resultado que se medirá |
| --- | --- | --- |
| 1–7 | Entrevistar a 5–10 organizadores, jugadores y patrocinadores, con permiso para citar. Registrar cómo pagan hoy y qué problemas han tenido. | Número de entrevistas y casos documentados de fricción o impago. |
| 8–14 | Ofrecer un piloto de Clash Royale y otro de Mobile Legends. Medir tiempo de registro, fondeo y cobro. | Torneos iniciados, usuarios que completan la inscripción y premios recibidos. |
| 15–21 | Probar la comisión con patrocinadores. Recoger objeciones y cartas de interés voluntarias. | Disposición de pago y número de expresiones escritas. |
| 22–30 | Invitar a los primeros organizadores a repetir. Contrastar volumen, frecuencia y retención con las entrevistas. | Volumen entregado, torneos completados, organizadores que repiten y patrocinadores que vuelven. |

**Condiciones para un evento real.** Las copas presentadas en la hackatón son demostraciones en Testnet con ilustraciones propias. Las directrices de Supercell limitan la promoción de criptomonedas y blockchain en sus eventos. Antes de anunciar un torneo público de Clash Royale con este sistema, contrastar el formato con Supercell. [Directrices para torneos](https://supercell.com/en/tournament-guidelines/) · [Política de material para aficionados](https://supercell.com/en/fan-content-policy/)

**Equipo.** Álvaro concibió Sutika y desarrolló el prototipo y despliegue inicial. Federico apoya la implementación del MVP esports, integraciones, base de datos y verificación técnica. Antes de editar la ficha, ambos pueden revisar la atribución según el trabajo realizado. La entrega en Atlas y la evaluación de IA restante se gestionan desde la cuenta del equipo.
