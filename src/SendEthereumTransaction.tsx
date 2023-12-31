import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/ethers-v5";
import { useQuery } from "@tanstack/react-query";
import { ethers } from "ethers";
import { useState } from "react";

export function SendEthereumTransaction({
  ethWallet,
}: {
  ethWallet: PierMpcEthereumWallet | null;
}) {
  const balance = useQuery({
    queryKey: ["ethereum", "balance", ethWallet?.address.toLowerCase()],
    queryFn: async () => {
      if (!ethWallet) {
        return "";
      }
      const balance = await ethWallet.getBalance();
      return `${ethers.utils.formatEther(balance)} ETH`;
    },
  });
  const [receiver, setReceiver] = useState("");
  const [ethAmount, setEthAmount] = useState("0.0001");
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
        <a href="https://sepoliafaucet.com/" target="_blank">
          Fund wallet via a Sepolia faucet
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
          Amount (ETH):
          <input
            type="number"
            value={ethAmount}
            onChange={(e) => setEthAmount(e.target.value)}
          />
        </label>
        <br />
        <button
          disabled={!ethWallet}
          onClick={async () => {
            if (!ethWallet) {
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
              const tx = await ethWallet.sendTransaction({
                to: receiver,
                value: weiAmount,
              });
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
