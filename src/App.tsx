import { KeyShare, SessionKind, RawKeyShare } from "@pier-wallet/mpc-lib";
import { PierMpcBitcoinWallet } from "@pier-wallet/mpc-lib/bitcoin";
import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/ethers-v5";
import { createPierMpcSdkWasm } from "@pier-wallet/mpc-lib/wasm";
import { ethers } from "ethers";
import { useMemo, useState } from "react";
import { api, supabase } from "./trpc";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { useLocalStorage } from "usehooks-ts";
import { SendEthereumTransaction } from "./SendEthereumTransaction";
import { SendBitcoinTransaction } from "./SendBitcoinTransaction";

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
  const [rawKeyShare, setRawKeyShare] = useLocalStorage<RawKeyShare | null>(
    "keyShare",
    null,
  );
  const keyShare = useMemo(
    () => (rawKeyShare ? new KeyShare(rawKeyShare) : null),
    [rawKeyShare],
  );

  const [ethSignature, setEthSignature] = useState<string | null>(null);

  const wallets = useQuery({
    queryKey: ["wallets", keyShare?.publicKey],
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
    refetchInterval: 0,
    retry: false,
    refetchIntervalInBackground: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
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
    setRawKeyShare(keyShare.raw());
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

      <button disabled={!!keyShare} onClick={generateKeyShare}>
        Create wallet
      </button>
      <button
        disabled={!keyShare}
        style={{
          backgroundColor: "red",
          color: "white",
        }}
        onClick={() => {
          setRawKeyShare(null);
          window.location.reload(); // need to reload to kill 'SIGN' connection. Not needed with the latest version of the SDK probably
        }}
      >
        Delete wallet
      </button>

      <hr />

      <div>
        <h2>Sign Ethereum message</h2>
        <button disabled={!ethWallet} onClick={signMessageWithEth}>
          Sign message
        </button>
        ETH Signature: {ethSignature}
      </div>

      <hr />

      <SendEthereumTransaction ethWallet={ethWallet} />

      <hr />

      <SendBitcoinTransaction btcWallet={btcWallet} />
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
