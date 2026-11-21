import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";

export const addr = (value: string) => Address.fromString(value).toScVal();
export const bytes = (value: string) => xdr.ScVal.scvBytes(Buffer.from(value, "hex"));
export const u32 = (value: number) => xdr.ScVal.scvU32(value);
export const u64 = (value: number) => nativeToScVal(BigInt(value), { type: "u64" });
export const i128 = (value: bigint) => nativeToScVal(value, { type: "i128" });
export const textVal = (value: string) => xdr.ScVal.scvString(value);
export const sym = (value: string) => xdr.ScVal.scvSymbol(value);
export const vec = (values: xdr.ScVal[]) => xdr.ScVal.scvVec(values);
export const bool = (value: boolean) => xdr.ScVal.scvBool(value);
export function struct(fields: Record<string, xdr.ScVal>) {
  return xdr.ScVal.scvMap(Object.keys(fields).sort().map((key) =>
    new xdr.ScMapEntry({ key: sym(key), val: fields[key] }),
  ));
}
