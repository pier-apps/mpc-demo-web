import { KeyShare, SessionKind, RawKeyShare } from "@pier-wallet/mpc-lib";
import {
  PierMpcBitcoinWallet,
  PierMpcBitcoinWalletNetwork,
} from "@pier-wallet/mpc-lib/bitcoin";
import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/ethers-v5";
import { ethers } from "ethers";
import { useMemo, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { useLocalStorage } from "usehooks-ts";
import { SendEthereumTransaction } from "./SendEthereumTransaction";
import { SendBitcoinTransaction } from "./SendBitcoinTransaction";
import { pierMpc } from "./mpc";
import { SignEthereumMessage } from "./SignEthereumMessage";

const testCredentials = {
  email: "mpc-lib-test@example.com",
  password: "123456",
};
const userAuthPromise = pierMpc.auth
  .signInWithPassword(testCredentials)
  .then(() => {
    console.log("signed in");
  });

const ethereumProvider = new ethers.providers.StaticJsonRpcProvider(
  "https://eth-sepolia.g.alchemy.com/v2/BQ_nMljcV-AUx1EgSMzjSiFQLAlIUQvR",
);

function useAuthStatus() {
  const [authStatus, setAuthStatus] = useState<
    "loading" | "signedIn" | "signedOut"
  >("loading");
  pierMpc.auth.supabase.auth.onAuthStateChange((event) => {
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

  const wallets = useQuery({
    queryKey: ["wallets", keyShare?.publicKey],
    queryFn: async () => {
      if (!keyShare) {
        return null;
      }
      await userAuthPromise;
      const signConnection = await pierMpc.establishConnection(
        SessionKind.SIGN,
        keyShare.partiesParameters,
      );
      const ethWallet = new PierMpcEthereumWallet(
        keyShare,
        signConnection,
        pierMpc,
        ethereumProvider,
      );
      const btcWallet = new PierMpcBitcoinWallet(
        keyShare,
        PierMpcBitcoinWalletNetwork.Testnet,
        signConnection,
        pierMpc,
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

  const generateKeyShare = async () => {
    const keyShare = await pierMpc.generateKeyShare2Of2();
    console.log("local key share generated.", keyShare.publicKey);
    setRawKeyShare(keyShare.raw());
  };

  const walletLoadingText = keyShare ? "loading..." : "not generated";
  return (
    <>
      <h1>Pier Wallet MPC Demo</h1>
      <h2>Auth status: {authStatus}</h2>

      <h2>Wallet addresses</h2>
      <div>
        ETH: {ethWallet?.address || walletLoadingText}
        <br />
        BTC: {btcWallet?.address || walletLoadingText}
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
        }}
      >
        Delete wallet
      </button>

      <hr />

      <SendEthereumTransaction ethWallet={ethWallet} />

      <hr />

      <SendBitcoinTransaction btcWallet={btcWallet} />

      <hr />

      <SignEthereumMessage ethWallet={ethWallet} />
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
