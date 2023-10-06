import { PierMpcWallet, SessionKind } from "@pier-wallet/mpc-lib";
import { createPierMpcSdkWasm } from "@pier-wallet/mpc-lib/wasm";
import { ethers } from "ethers";
import { useState } from "react";

const PIER_MPC_SERVER_URL = "ws://127.0.0.1:3030/mpc"; // TODO: replace with pier MPC server URL
const pierMpcSdk = createPierMpcSdkWasm(PIER_MPC_SERVER_URL);

export default function App() {
  const [wallet, setWallet] = useState<PierMpcWallet | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  async function establishConnection<T extends SessionKind>(sessionKind: T) {
    const { sessionId } = await api.createSession({
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
    api
      .generateKeyShare({
        sessionId: connection.sessionId,
      })
      .then(() => console.log("server finished generating key share"));
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
    api
      .signMessage({
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

type SessionInfo = {
  sessionId: string;
};

class Api {
  constructor(private readonly apiUrl: string) {}

  async createSession({
    sessionKind,
  }: {
    sessionKind: SessionKind;
  }): Promise<SessionInfo> {
    const { sessionId } = await fetch(`${this.apiUrl}/createSession`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionKind,
      }),
    }).then((res) => res.json());
    return { sessionId };
  }

  async generateKeyShare(data: SessionInfo) {
    await fetch(`${this.apiUrl}/generateKeyShare`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  }

  async signMessage(
    data: {
      signerAddress: string;
      message: string;
    } & SessionInfo,
  ) {
    await fetch(`${this.apiUrl}/signMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  }
}

const api = new Api("http://localhost:8080");
