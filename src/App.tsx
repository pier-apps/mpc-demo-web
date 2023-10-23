import { PierMpcWallet, SessionKind } from "@pier-wallet/mpc-lib";
import { PierBitcoinMpcWallet } from "@pier-wallet/mpc-lib/bitcoin";
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
  const [ethWallet, setEthWallet] = useState<PierMpcWallet | null>(null);
  const [ethSignature, setEthSignature] = useState<string | null>(null);

  const [btcWallet, setBtcWallet] = useState<PierBitcoinMpcWallet | null>(null);
  const [btcTxHash, setBtcTxHash] = useState<string | null>(null);

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
    const signConnection = await establishConnection(SessionKind.SIGN);
    const wallet = pierMpcSdk.walletFromKeyShare(keyShare, signConnection);
    const btcWallet = new PierBitcoinMpcWallet(
      keyShare,
      "testnet",
      signConnection,
      pierMpcSdk,
    );
    console.log(
      "local key share generated.",
      wallet.address,
      btcWallet.address.toString(),
    );
    setEthWallet(wallet);
    setBtcWallet(btcWallet);
  };

  const signMessageWithEth = async () => {
    if (!ethWallet) {
      console.error("wallet not generated");
      return;
    }

    const message = "hello world";
    api.signMessage
      .mutate({
        signerAddress: ethWallet.address,
        message,
        sessionId: ethWallet.connection.sessionId,
      })
      .then(() => console.log("server finished signing message"));
    const signature = await ethWallet.signMessage(message);
    console.log(`local signature generated: ${signature}`);
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    console.log(
      "signature verification:",
      message,
      recoveredAddress,
      ethWallet.address,
      recoveredAddress.toLowerCase() === ethWallet.address.toLowerCase(),
    );
    setEthSignature(signature);
  };

  const sendBitcoinTransaction = async () => {
    const faucetAddress = "tb1qw2c3lxufxqe2x9s4rdzh65tpf4d7fssjgh8nv6";

    if (!btcWallet) {
      console.error("wallet not generated");
      return;
    }
    const tx = await btcWallet.createTransaction({
      to: faucetAddress,
      value: 800n,
      feePerByte: 1n,
    });
    api.bitcoin.sendTransaction
      .mutate({
        sessionId: btcWallet.connection.sessionId,
        signerAddress: ethWallet!.address,
        transaction: tx.toObject(),
      })
      .then((res: unknown) =>
        console.log(
          `server finished sending transaction: "${JSON.stringify(res)}"`,
        ),
      );
    const hash = await btcWallet.sendTransaction(tx);
    setBtcTxHash(hash);
    console.log("btc hash", hash);
  };

  return (
    <>
      <h1>Pier Wallet MPC Demo</h1>
      <h2>Step 1: Create connection & Join Session</h2>
      {
        <p>
          Wallet addresses
          <br />
          ETH: {ethWallet?.address}
          <br />
          BTC: {btcWallet?.address.toString()}
        </p>
      }
      <button onClick={generateKeyShare}>Create wallet</button>
      <p>
        <button onClick={signMessageWithEth}>Sign message</button>
        ETH Signature: {ethSignature}
      </p>

      <p>
        <button onClick={sendBitcoinTransaction}>Send BTC to faucet</button>
        BTC tx hash: {btcTxHash}
      </p>
    </>
  );
}
