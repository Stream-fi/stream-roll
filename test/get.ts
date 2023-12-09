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

const run = async () => {

    let res = await fetch(`http://localhost:3000/0x7D59e2e55d37229d4E964cDb826d6Da36ca52026`);
    console.log(res);
    console.log(await res.json());

};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// let sent = 0;

await run();
