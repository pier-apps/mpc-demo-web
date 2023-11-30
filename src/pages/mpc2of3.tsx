import { useLocalStorage } from "usehooks-ts";
import { WalletButtons } from "../WalletButtons";
import { useStoredKeyShare } from "../helpers";
import { pierMpc } from "../mpc";

export default function Mpc2of3() {
  const [activeKeyShareName, setActiveKeyShareName] = useLocalStorage<
    "main" | "backup"
  >("2Of3-keyShare-activeName", "main");
  const mainKeyShare = useStoredKeyShare("2Of3-main");
  const backupKeyShare = useStoredKeyShare("2Of3-backup");
  const activeKeyShare =
    activeKeyShareName === "main"
      ? mainKeyShare.keyShare
      : activeKeyShareName === "backup"
        ? backupKeyShare.keyShare
        : (activeKeyShareName satisfies never);

  const generateKeyShares = async () => {
    const [main, backup] = await pierMpc.generateKeyShare2Of3();
    mainKeyShare.storeKeyShare(main);
    backupKeyShare.storeKeyShare(backup);
    setActiveKeyShareName("main");
    console.log("local key share generated.", main.publicKey);
  };

  const deleteKeyShares = () => {
    mainKeyShare.storeKeyShare(null);
    backupKeyShare.storeKeyShare(null);
    setActiveKeyShareName("main");
  };

  return (
    <>
      <button disabled={!!activeKeyShare} onClick={generateKeyShares}>
        Create wallet
      </button>
      <button
        disabled={!activeKeyShare}
        style={{ backgroundColor: "red", color: "white" }}
        onClick={deleteKeyShares}
      >
        Delete wallet
      </button>
      {activeKeyShare ? (
        <div>
          Using <strong>{activeKeyShareName.toUpperCase()}</strong> key share
          <button
            onClick={() => {
              setActiveKeyShareName(
                activeKeyShareName === "main"
                  ? "backup"
                  : activeKeyShareName === "backup"
                    ? "main"
                    : (activeKeyShareName satisfies never),
              );
            }}
          >
            Switch to{" "}
            {activeKeyShareName === "main"
              ? "backup"
              : activeKeyShareName === "backup"
                ? "main"
                : (activeKeyShareName satisfies never)}
          </button>
        </div>
      ) : undefined}
      <WalletButtons keyShare={activeKeyShare} />
    </>
  );
}
