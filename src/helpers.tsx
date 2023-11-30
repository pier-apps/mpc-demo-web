import { KeyShare, RawKeyShare, SessionKind } from "@pier-wallet/mpc-lib";
import {
  PierMpcBitcoinWallet,
  PierMpcBitcoinWalletNetwork,
} from "@pier-wallet/mpc-lib/bitcoin";
import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/ethers-v5";
import { useQuery } from "@tanstack/react-query";
import { ethers } from "ethers";
import { useMemo, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { pierMpc } from "./mpc";

export function useStoredKeyShare(name: string) {
  const [storedKeyShare, setStoredKeyShare] =
    useLocalStorage<RawKeyShare | null>(`keyShare-${name}`, null);
  const keyShare = useMemo(
    () => (storedKeyShare ? new KeyShare(storedKeyShare) : null),
    [storedKeyShare],
  );
  function storeKeyShare(ks: KeyShare | null) {
    if (ks === null) {
      setStoredKeyShare(null);
      return;
    }
    setStoredKeyShare(ks.raw());
  }
  return { keyShare, storeKeyShare };
}

const ethereumProvider = new ethers.providers.StaticJsonRpcProvider(
  "https://eth-sepolia.g.alchemy.com/v2/BQ_nMljcV-AUx1EgSMzjSiFQLAlIUQvR",
);

const testCredentials = {
  email: "mpc-lib-test@example.com",
  password: "123456",
};
const userAuthPromise = pierMpc.auth
  .signInWithPassword(testCredentials)
  .then(() => {
    console.log("signed in");
  });

export function useAuthStatus() {
  type AuthStatus = "loading" | "signedIn" | "signedOut";
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  pierMpc.auth.supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") {
      setAuthStatus("signedIn");
    } else if (event === "SIGNED_OUT") {
      setAuthStatus("signedOut");
    }
  });
  return authStatus;
}

export function useWallets(keyShare: KeyShare | null) {
  const res = useQuery({
    queryKey: ["wallets", keyShare?.publicKey, keyShare?.partyIndex],
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
  });
  return res.data ?? { ethWallet: null, btcWallet: null };
}
