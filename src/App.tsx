import { PierMpcWallet, SessionKind } from "@pier-wallet/mpc-lib";
import { createPierMpcSdkWasm } from "@pier-wallet/mpc-lib/wasm";
import { ethers } from "ethers";
import { useState } from "react";
import { api } from "./trpc";

const supabaseTestUser = {
  id: "11062eb7-60ad-493c-84b6-116bdda7a7c3",
  email: "mpc-lib-test@example.com",
  password: "123456",
};
const pierMpcSdk = createPierMpcSdkWasm({
  credentials: supabaseTestUser,
});

export default function App() {
  const [wallet, setWallet] = useState<PierMpcWallet | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  async function establishConnection<T extends SessionKind>(sessionKind: T) {
    const { sessionId } = await api.createSession.mutate({
      sessionKind,
    });
    const transport = await pierMpcSdk.establishConnection(sessionKind, {
      type: "join",
      sessionId,
    });
    return transport;
  }

  const generateKeyShare = async () => {
    const connection = await establishConnection(SessionKind.KEYGEN);
    api.generateKeyShare
      .mutate({
        sessionId: connection.sessionId,
      })
      .then((res: unknown) =>
        console.log(
          `server finished generating key share: "${JSON.stringify(res)}"`,
        ),
      );
    const keyShare = await pierMpcSdk.generateKeyShare(connection);
    const wallet = pierMpcSdk.walletFromKeyShare(
      keyShare,
      await establishConnection(SessionKind.SIGN),
    );
    console.log("local key share generated.", wallet.address);
    setWallet(wallet);
  };

  const signMessage = async () => {
    if (!wallet) {
      console.error("wallet not generated");
      return;
    }

    const message = "hello world";
    api.signMessage
      .mutate({
        signerAddress: wallet.address,
        message,
        sessionId: wallet.connection.sessionId,
      })
      .then(() => console.log("server finished signing message"));
    const signature = await wallet.signMessage(message);
    console.log(`local signature generated: ${signature}`);
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    console.log(
      "signature verification:",
      message,
      recoveredAddress,
      wallet.address,
      recoveredAddress.toLowerCase() === wallet.address.toLowerCase(),
    );
    setSignature(signature);
  };

  return (
    <>
      <h1>Pier Wallet MPC Demo</h1>
      <h2>Step 1: Create connection & Join Session</h2>
      {wallet && <p>Wallet address: {wallet.address}</p>}
      <button onClick={generateKeyShare}>Create first share of wallet</button>
      <button onClick={signMessage}>Sign message</button>
      {signature && <p>Signature: {signature}</p>}
    </>
  );
}
