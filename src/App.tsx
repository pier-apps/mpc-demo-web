import {
  PierMpcTransport,
  PierMpcWallet,
  SessionKind,
  WebSocketClient,
} from "@pier-wallet/mpc-lib";
import { ethers } from "ethers";
import { useState } from "react";

const PIER_MPC_SERVER_URL = "ws://localhost:3030/mpc"; // TODO: replace with pier MPC server URL

const websocket = new WebSocketClient();
websocket.connect(PIER_MPC_SERVER_URL);

export default function App() {
  const [wallet, setWallet] = useState<PierMpcWallet | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  async function establishConnection<T extends SessionKind>(sessionKind: T) {
    // will create a new groupID & sessionID
    const { groupId, sessionId } = await api.createGroup({
      sessionKind,
    });
    const transport = await PierMpcTransport.establishConnection(
      websocket,
      sessionKind,
      {
        type: "join",
        groupId,
        sessionId,
      }
    );
    return transport;
  }

  const generateKeyShare = async () => {
    const transport = await establishConnection(SessionKind.KEYGEN);
    api
      .generateKeyShare({
        groupId: transport.group.uuid,
        sessionId: transport.session.uuid,
      })
      .then(() => console.log("server finished generating key share"));
    const keyShare = await PierMpcWallet.generateKeyShare(transport);
    const wallet = new PierMpcWallet(
      keyShare,
      await establishConnection(SessionKind.SIGN)
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
        groupId: wallet.transport.group.uuid,
        sessionId: wallet.transport.session.uuid,
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
      recoveredAddress.toLowerCase() === wallet.address.toLowerCase()
    );
    setSignature(signature);
  };

  return (
    <>
      <h1>Pier Wallet MPC Demo</h1>
      <h2>Step 1: Create connection & Join Group</h2>
      {wallet && <p>Wallet address: {wallet.address}</p>}
      <button onClick={generateKeyShare}>Create first share of wallet</button>
      <button onClick={signMessage}>Sign message</button>
      {signature && <p>Signature: {signature}</p>}
    </>
  );
}

class Api {
  constructor(private readonly apiUrl: string) {}

  async createGroup({
    sessionKind,
  }: {
    sessionKind: SessionKind;
  }): Promise<{ groupId: string; sessionId: string }> {
    const { groupId, sessionId } = await fetch(
      `${this.apiUrl}/createGroupAndSession`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionKind,
        }),
      }
    ).then((res) => res.json());
    return { groupId, sessionId };
  }

  async generateKeyShare(data: { groupId: string; sessionId: string }) {
    await fetch(`${this.apiUrl}/generateKeyShare`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  }

  async signMessage(data: {
    signerAddress: string;
    message: string;
    groupId: string;
    sessionId: string;
  }) {
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
