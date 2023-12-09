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
  kick
} from "./txTypes";
import { HDNodeWallet } from "ethers";

const activeWallets: HDNodeWallet[] = [];

const run = async () => {
  // fetch all the wallets
  for (let i = 0; i < 4; i++) {
    activeWallets.push(await fundRandomWallet(400));
  }
  const from = activeWallets[0];

  let request;
  request = await signAndSend(from, createStream(from.address, activeWallets[1].address, 50));
  request = await signAndSend(from, createStream(from.address, activeWallets[2].address, 50));
  request = await signAndSend(from, createStream(from.address, activeWallets[3].address, 50));
  
  console.log(request);
  
  for(let i = 0; i < 10; i++) {
    await signAndSend(from, kick(from.address));
    await delay(1000);
  }

};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// let sent = 0;

await run();
