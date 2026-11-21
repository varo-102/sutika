import WalletActions from "@/components/WalletActions";
export const metadata = { title: "Crear torneo" };
export default function Create() {
  return (
    <div className="narrow">
      <p className="eyebrow">Organizadores</p>
      <h1>Crear torneo</h1>
      <p>
        Define el podio y el patrocinador. La custodia aparecerá cuando su
        depósito se confirme en Stellar.
      </p>
      <section className="panel">
        <WalletActions />
      </section>
    </div>
  );
}
