import { PierMpcVaultSdk } from "@pier-wallet/mpc-lib";
import { createPierMpcSdkWasm } from "@pier-wallet/mpc-lib/wasm";

export const pierMpcSdk = createPierMpcSdkWasm();
export const pierMpcVaultSdk = new PierMpcVaultSdk(pierMpcSdk);
