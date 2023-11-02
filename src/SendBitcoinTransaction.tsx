import { PierMpcBitcoinWallet } from "@pier-wallet/mpc-lib/bitcoin";
import { useState } from "react";
import { ethers } from "ethers";
import { useQuery } from "@tanstack/react-query";

export const BTC_DECIMALS = 8;

export function SendBitcoinTransaction({
  btcWallet,
}: {
  btcWallet: PierMpcBitcoinWallet | null;
}) {
  const balance = useQuery({
    queryKey: ["bitcoin", "balance", btcWallet?.address],
    queryFn: async () => {
      if (!btcWallet) {
        return "";
      }
      const balance = await btcWallet.getBalance();
      return `${ethers.utils.formatUnits(balance, BTC_DECIMALS)} BTC`;
    },
  });
  const [sendBtcResult, setSendBtcResult] = useState("");
  const [receiver, setReceiver] = useState(
    "tb1qw2c3lxufxqe2x9s4rdzh65tpf4d7fssjgh8nv6", // faucet
  );
  const [btcAmount, setBtcAmount] = useState("0.000008");

  const sendBitcoinTransaction = async () => {
    if (!btcWallet) {
      console.error("no btc wallet");
      return;
    }

    let satoshis: bigint;
    try {
      satoshis = ethers.utils.parseUnits(btcAmount, BTC_DECIMALS).toBigInt();
    } catch {
      alert("Invalid amount");
      return;
    }
    const minSatoshi = 800n;
    if (satoshis < minSatoshi) {
      alert(`Amount must be greater than ${minSatoshi} satoshis`);
      return;
    }

    setSendBtcResult("");
    try {
      const tx = await btcWallet.createTransaction({
        to: receiver,
        value: satoshis,
        feePerByte: 1n,
      });
      const hash = await btcWallet.sendTransaction(tx);
      console.log("btc hash", hash);
      setSendBtcResult(`Tx hash: ${hash}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error(e);
      setSendBtcResult(`Error: ${e.message}`);
    }
  };
  return (
    <div>
      <h2>Send Bitcoin transaction</h2>
      Balance:{" "}
      {balance.isLoading
        ? "Loading..."
        : balance.isError
        ? `Error: ${balance.error.message}`
        : balance.data}
      <div>
        <a href="https://bitcoinfaucet.uo1.net/send.php" target="_blank">
          Fund wallet via a faucet
        </a>
      </div>
      <div>
        <label>
          Receiver address:
          <input
            type="text"
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
          />
        </label>
        <label>
          Amount (BTC):
          <input
            type="number"
            value={btcAmount}
            onChange={(e) => setBtcAmount(e.target.value)}
          />
        </label>
        <br />
        <button onClick={sendBitcoinTransaction} disabled={!btcWallet}>
          Send BTC
        </button>
        {sendBtcResult}
      </div>
    </div>
  );
}
