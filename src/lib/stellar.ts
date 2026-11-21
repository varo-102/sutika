import deployment from "./deployment.json";
export { deployment };
export const SUTIKA_CONTRACT_ID = deployment.contractId;
export const getExplorerTxUrl = (hash: string) =>
  "https://stellar.expert/explorer/testnet/tx/" + encodeURIComponent(hash);
export const getExplorerContractUrl = (id = SUTIKA_CONTRACT_ID) =>
  "https://stellar.expert/explorer/testnet/contract/" + encodeURIComponent(id);
