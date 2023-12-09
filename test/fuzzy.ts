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
} from "./txTypes";
import { HDNodeWallet } from "ethers";

const activeWallets: HDNodeWallet[] = [];

const actionInput = new ActionSchema("update-flowup", actionSchemaType);

async function signAndSend(from: HDNodeWallet, data: any) {
  const sign = await from.signTypedData(
    stackrConfig.domain,
    actionInput.EIP712TypedData.types,
    data
  );

  const payload = JSON.stringify({
    msgSender: from.address,
    signature: sign,
    payload: data,
  });

  const res = await fetch("http://localhost:3000/", {
    method: "POST",
    body: payload,
    headers: {
      "Content-Type": "application/json",
    },
  });

  const json = await res.json();
  
  return json;
}

const createRandomWallet = async () => { 
  // create a random wallet
  const wallet = ethers.Wallet.createRandom();
  // push it to an array
  activeWallets.push(wallet);
  // fund it with some tokens
  await signAndSend(wallet, mint(wallet.address, 1000));
}

const run = async () => {

  for (let i = 0; i < 20; i++) {
    await createRandomWallet();
  }

  for (let i = 0; i < 50; i++) {
    // pick a random wallet
    const from = activeWallets[Math.floor(Math.random() * activeWallets.length)];
    // pick a random wallet
    const to = activeWallets[Math.floor(Math.random() * activeWallets.length)];
    // stream a random amount
    // check if a stream exists
    // if it does, either update or delete it
    // if it doesn't, create it

    // let account, json;
    // try {
    //   account = await fetch(`http://localhost:3000/${from.address}`);
    //   json = await account.json();
    // } catch (e) {
    //   console.log(e);
    // }
    // const hasStreamTo = json.result.streams.length > 0 && json.result.streams.find((stream: any) => stream.to === to.address);
    // if (hasStreamTo) {
      // update or delete
    let res;
    try{
      res = await signAndSend(from, createStream(from.address, to.address, Math.floor(Math.random() * 100)));
    } catch (e) {
      console.log(e);
      const updateOrDelete = Math.random() > 0.5 ? "update" : "delete";
      if (updateOrDelete === "update") {
        // update
        res = await signAndSend(from, updateStream(from.address, to.address, Math.floor(Math.random() * 100)));
      } else {
        // delete
        res = await signAndSend(from, deleteStream(from.address, to.address));
      } 
    }
    console.log(res);
    
    delay(1000);
  }
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// let sent = 0;

await run();
