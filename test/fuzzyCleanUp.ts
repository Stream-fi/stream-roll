import { ethers } from "ethers";
import { stackrConfig } from "../stackr.config";
import { ActionSchema } from "@stackr/stackr-js";
import {
  actionSchemaType,
  mint,
  burn,
  transfer,
  createStream,
  updateStream,
  setStream,
  deleteStream,
  signAndSend,
  fundRandomWallet,
  hexStrings
} from "./txTypes";
import { HDNodeWallet } from "ethers";
import { Wallet } from "ethers";

const activeWallets: Wallet[] = [];

const run = async () => {

  for (let i = 0; i < 5; i++) {
    activeWallets.push(await fundRandomWallet(hexStrings[i], 1000));
  }

  for (let i = 0; i < 100; i++) {
    // pick a random wallet
    const from = activeWallets[Math.floor(Math.random() * activeWallets.length)];
    // pick a random wallet
    let to;
    do {
      to = activeWallets[Math.floor(Math.random() * activeWallets.length)];
    } while (to.address === from.address);

    const res = await signAndSend(from, setStream(from.address, to.address, Math.floor(Math.random() * 50)));
    console.log("$$: I think I just opened a stream, from: ", from.address, " to: ", to.address);
    console.log(res);
    
    await delay(2500);
  }
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// let sent = 0;

await run();
