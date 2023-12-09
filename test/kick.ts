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
  deleteStream,
  signAndSend,
  fundRandomWallet,
  kick,
  hexStrings
} from "./txTypes";
import { HDNodeWallet } from "ethers";

const run = async () => {

  let wallet = new ethers.Wallet(hexStrings[0]);

  // pick a random wallet

  for(let i = 0; i < 10000; i++) {
    await signAndSend(wallet, kick(wallet.address));
    await delay(800);
  }

};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// let sent = 0;

await run();
