import { type KeyShare, SessionKind } from "@pier-wallet/mpc-lib";
import { PierMpcBitcoinWallet } from "@pier-wallet/mpc-lib/bitcoin";
import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/ethers-v5";
import { createPierMpcSdkWasm } from "@pier-wallet/mpc-lib/wasm";
import { ethers } from "ethers";
import { useState } from "react";
import { api } from "./trpc";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { useLocalStorage } from "usehooks-ts";

const supabaseTestUser = {
  id: "11062eb7-60ad-493c-84b6-116bdda7a7c3",
  email: "mpc-lib-test@example.com",
  password: "123456",
};
const pierMpcSdk = createPierMpcSdkWasm({
  credentials: supabaseTestUser,
});

function App() {
  const [keyShare, setKeyShare] = useLocalStorage<KeyShare | null>(
    "keyShare",
    null,
  );

  const [ethSignature, setEthSignature] = useState<string | null>(null);
  const [btcTxHash, setBtcTxHash] = useState<string | null>(null);

  const wallets = useQuery({
    queryKey: ["keyShare", keyShare?.publicKey],
    queryFn: async () => {
      if (!keyShare) {
        return null;
      }
      const signConnection = await establishConnection(SessionKind.SIGN);
      const ethWallet = new PierMpcEthereumWallet(
        keyShare,
        signConnection,
        pierMpcSdk,
      );
      const btcWallet = new PierMpcBitcoinWallet(
        keyShare,
        "testnet",
        signConnection,
        pierMpcSdk,
      );
      return { ethWallet, btcWallet };
    },
  }).data;
  const { btcWallet, ethWallet } = wallets || {
    btcWallet: null,
    ethWallet: null,
  };

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
    console.log("local key share generated.", keyShare.publicKey);
    setKeyShare(keyShare);
  };

  const signMessageWithEth = async () => {
    if (!ethWallet) {
      console.error("wallet not generated");
      return;
    }

    const message = "hello world";
    api.signMessage
      .mutate({
        publicKey: ethWallet.keyShare.publicKey,
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
        publicKey: btcWallet.keyShare.publicKey,
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
      <button
        onClick={() => {
          setKeyShare(null);
          window.location.reload(); // need to reload to kill 'SIGN' connection.
        }}
      >
        Clear wallet
      </button>
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

const queryClient = new QueryClient();
export default function MyApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
