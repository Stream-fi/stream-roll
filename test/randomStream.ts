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
  for (let i = 0; i < 5; i++) {
    activeWallets.push(await fundRandomWallet(1000));
  }

  const from = activeWallets[Math.floor(Math.random() * activeWallets.length)];
  // pick a random wallet
  const to = activeWallets[Math.floor(Math.random() * activeWallets.length)];

  let request;
  try{
    request = await signAndSend(from, createStream(from.address, to.address, Math.floor(Math.random() * 100)));
  } catch (e) {
    console.log(e);
    request = await signAndSend(from, updateStream(from.address, to.address, Math.floor(Math.random() * 100)));
  }
  console.log(request);
  
  for(let i = 0; i < 200; i++) {
    await signAndSend(from, kick(from.address));
    await delay(1000);
  }

};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// let sent = 0;

await run();
