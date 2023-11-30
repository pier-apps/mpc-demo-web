import { KeyShare } from "@pier-wallet/mpc-lib";
import { SendBitcoinTransaction } from "./SendBitcoinTransaction";
import { SendEthereumTransaction } from "./SendEthereumTransaction";
import { SignEthereumMessage } from "./SignEthereumMessage";
import { useWallets } from "./helpers";

export function WalletButtons({ keyShare }: { keyShare: KeyShare | null }) {
  const walletLoadingText = keyShare ? "loading..." : "not generated";
  const { btcWallet, ethWallet } = useWallets(keyShare);
  return (
    <>
      <h2>Wallet addresses</h2>
      <div>
        ETH: {ethWallet?.address || walletLoadingText}
        <br />
        BTC: {btcWallet?.address || walletLoadingText}
      </div>

      <hr />
      <SendEthereumTransaction ethWallet={ethWallet} />
      <hr />
      <SendBitcoinTransaction btcWallet={btcWallet} />
      <hr />
      <SignEthereumMessage ethWallet={ethWallet} />
    </>
  );
}
