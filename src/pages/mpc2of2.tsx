import { WalletButtons } from "../WalletButtons";
import { useStoredKeyShare } from "../helpers";
import { pierMpc } from "../mpc";

export default function Mpc2of2() {
  const { keyShare, storeKeyShare } = useStoredKeyShare("2of2-main");
  const generateKeyShare = async () => {
    const keyShare = await pierMpc.generateKeyShare2Of2();
    console.log("local key share generated.", keyShare.publicKey);
    storeKeyShare(keyShare);
  };

  return (
    <>
      <button disabled={!!keyShare} onClick={generateKeyShare}>
        Create wallet
      </button>
      <button
        disabled={!keyShare}
        style={{ backgroundColor: "red", color: "white" }}
        onClick={() => storeKeyShare(null)}
      >
        Delete wallet
      </button>
      <WalletButtons keyShare={keyShare} />
    </>
  );
}
