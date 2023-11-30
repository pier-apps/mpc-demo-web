import { PierMpcVaultSdk } from "@pier-wallet/mpc-lib";
import { createPierMpcSdkWasm } from "@pier-wallet/mpc-lib/wasm";

const pierMpcSdk = createPierMpcSdkWasm();
export const pierMpc = new PierMpcVaultSdk(pierMpcSdk);
