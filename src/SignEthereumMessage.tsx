import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/ethers-v5";
import { ethers } from "ethers";
import { useState } from "react";

export function SignEthereumMessage({
  ethWallet,
}: {
  ethWallet: PierMpcEthereumWallet | null;
}) {
  const [ethSignature, setEthSignature] = useState<string | null>(null);
  const [messageToSign, setMessageToSign] = useState("hello world");

  const signMessageWithEth = async () => {
    if (!ethWallet) {
      console.error("wallet not generated");
      return;
    }

    setEthSignature(null);
    const signature = await ethWallet.signMessage(messageToSign);
    console.log(`local signature generated: ${signature}`);
    const recoveredAddress = ethers.utils.verifyMessage(
      messageToSign,
      signature,
    );
    console.log(
      "signature verification:",
      messageToSign,
      recoveredAddress,
      ethWallet.address,
      recoveredAddress.toLowerCase() === ethWallet.address.toLowerCase(),
    );
    setEthSignature(signature);
  };

  return (
    <div>
      <h2>Sign Ethereum message</h2>
      <input
        value={messageToSign}
        onChange={(e) => setMessageToSign(e.target.value)}
      />
      <button disabled={!ethWallet} onClick={signMessageWithEth}>
        Sign message
      </button>
      ETH Signature: {ethSignature}
    </div>
  );
}
