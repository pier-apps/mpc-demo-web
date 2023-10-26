import { type KeyShare, SessionKind } from "@pier-wallet/mpc-lib";
import { PierMpcBitcoinWallet } from "@pier-wallet/mpc-lib/bitcoin";
import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/ethers-v5";
import { createPierMpcSdkWasm } from "@pier-wallet/mpc-lib/wasm";
import { ethers } from "ethers";
import { useState } from "react";
import { api, supabase } from "./trpc";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { useLocalStorage } from "usehooks-ts";
import { SendEthereumTransaction } from "./SendEthereumTransaction";

const supabaseTestUser = {
  email: "mpc-lib-test@example.com",
  password: "123456",
};
const userAuthPromise = supabase.auth
  .signInWithPassword(supabaseTestUser)
  .then((res) => {
    if (res.error) {
      console.error(res.error);
      return;
    }
    if (!res.data.user) {
      console.error("no user data");
      return;
    }
    console.log("supabase signed in", res.data.user?.id);
  });
const pierMpcSdk = createPierMpcSdkWasm({
  supabase,
});
const ethereumProvider = new ethers.providers.JsonRpcProvider(
  "https://eth-sepolia.g.alchemy.com/v2/BQ_nMljcV-AUx1EgSMzjSiFQLAlIUQvR",
);

function useAuthStatus() {
  const [authStatus, setAuthStatus] = useState<
    "loading" | "signedIn" | "signedOut"
  >("loading");
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") {
      setAuthStatus("signedIn");
    } else if (event === "SIGNED_OUT") {
      setAuthStatus("signedOut");
    }
  });
  return authStatus;
}

function App() {
  const authStatus = useAuthStatus();
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
        ethereumProvider,
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
    await userAuthPromise;
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
    const [serverResult, keyShare] = await Promise.all([
      api.generateKeyShare.mutate({ sessionId: connection.sessionId }),
      pierMpcSdk.generateKeyShare(connection),
    ]);
    console.log("server finished generating key share", serverResult);
    console.log("local key share generated.", keyShare.publicKey);
    setKeyShare(keyShare);
  };

  const signMessageWithEth = async () => {
    if (!ethWallet) {
      console.error("wallet not generated");
      return;
    }

    const message = "hello world";
    api.ethereum.signMessage
      .mutate({
        publicKey: ethWallet.publicKey,
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
        publicKey: btcWallet.publicKey,
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
      <h2>Auth status: {authStatus}</h2>

      <h2>Wallet addresses</h2>
      <div>
        ETH: {ethWallet?.address}
        <br />
        BTC: {btcWallet?.address.toString()}
      </div>

      <button onClick={generateKeyShare}>Create wallet</button>
      <button
        onClick={() => {
          setKeyShare(null);
          window.location.reload(); // need to reload to kill 'SIGN' connection.
        }}
      >
        Clear wallet
      </button>

      <hr />

      {ethWallet && (
        <>
          <div>
            <h2>Sign Ethereum message</h2>
            <button onClick={signMessageWithEth}>Sign message</button>
            ETH Signature: {ethSignature}
          </div>

          <hr />

          <SendEthereumTransaction wallet={ethWallet} />
        </>
      )}

      <hr />

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
