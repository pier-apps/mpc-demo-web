import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/ethers-v5";
import { useState } from "react";
import { api } from "./trpc";
import { BigNumber, ethers } from "ethers";
import { useQuery } from "@tanstack/react-query";
import _ from "lodash";

export function SendEthereumTransaction({
  wallet,
}: {
  wallet: PierMpcEthereumWallet | null;
}) {
  const balance = useQuery({
    queryKey: ["ethereum", "balance", wallet?.address.toLowerCase()],
    queryFn: async () => {
      if (!wallet) {
        return "";
      }
      const balance = await wallet.getBalance();
      return `${ethers.utils.formatEther(balance)} ETH`;
    },
  });
  const [receiver, setReceiver] = useState("");
  const [ethAmount, setEthAmount] = useState("");
  const [sendEthResult, setSendEthResult] = useState("");

  return (
    <>
      <h2>Send Ethereum transaction</h2>
      Balance:{" "}
      {balance.isLoading
        ? "Loading..."
        : balance.isError
        ? `Error: ${balance.error.message}`
        : balance.data}
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
          Amount (ETH):
          <input
            type="number"
            value={ethAmount}
            onChange={(e) => setEthAmount(e.target.value)}
          />
        </label>
        <br />
        <button
          disabled={!wallet}
          onClick={async () => {
            if (!wallet) {
              console.error("no wallet");
              return;
            }

            try {
              ethers.utils.getAddress(receiver);
            } catch (e) {
              alert("Invalid receiver address");
              return;
            }
            let weiAmount: ethers.BigNumber;
            try {
              weiAmount = ethers.utils.parseEther(ethAmount);
            } catch (e) {
              alert("Invalid amount");
              return;
            }
            try {
              setSendEthResult("");
              const txRequest = await wallet.populateTransaction({
                to: receiver,
                value: weiAmount,
              });
              const [serverResult, tx] = await Promise.all([
                api.ethereum.signTransaction.mutate({
                  sessionId: wallet.connection.sessionId,
                  publicKey: wallet.publicKey,
                  transaction: _.mapValues(txRequest, (v) =>
                    BigNumber.isBigNumber(v) ? v.toString() : v,
                  ),
                }),
                await wallet.sendTransaction(txRequest),
              ]);
              console.log("server finished sending transaction", serverResult);
              console.log("local transaction hash", tx.hash);
              setSendEthResult(`Transaction hash: ${tx.hash}`);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
              setSendEthResult(`Error: ${e?.message}`);
              return;
            }
          }}
        >
          Send
        </button>
        <span>{sendEthResult}</span>
      </div>
    </>
  );
}
