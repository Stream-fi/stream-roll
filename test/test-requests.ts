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

const actionSchemaType = {
  from: "String",
  type: {
    move: "String",
    stream: "String",
  },
  params: {
    move: {
      amount: "Uint",
    },
    stream: {
      flowRate: "Uint",
    },
    to: "String",
  },
  nonce: "Uint",
};

const actionInput = new ActionSchema("update-flowup", actionSchemaType);

const getData = async (nonce: number) => {
  const wallet = new ethers.Wallet(
    "8bc97316dc6e535d41f94965495644310227b157e7b48a3f3c7acd1aaf77864c"
  );

  const data = {
    type: {
      move: "",
      stream: "create",
    },
    from: wallet.address,
    params: {
      move: {
        amount: 0,
      },
      stream: {
        flowRate: 1,
      },
      to: "0x73f843E9bCE620DF3BEf5d3A53076c14C131A7d0",
    },
    nonce: nonce,
  };

  const darta = {
    type: {
      move: "",
      stream: "delete",
    },
    from: wallet.address,
    params: {
      move: {
        amount: 0,
      },
      stream: {
        flowRate: 0,
      },
      to: "0x73f843E9bCE620DF3BEf5d3A53076c14C131A7d0",
    },
    nonce: nonce,
  };

  console.log(data);

  const sign = await wallet.signTypedData(
    stackrConfig.domain,
    actionInput.EIP712TypedData.types,
    data
  );
  console.log(actionInput.EIP712TypedData.types);

  const payload = JSON.stringify({
    msgSender: wallet.address,
    signature: sign,
    payload: data,
  });

  console.log(payload);

  return payload;
};

const run = async () => {
  const start = Date.now();
  const payload = await getData(start);

  const res = await fetch("http://localhost:3000/", {
    method: "POST",
    body: payload,
    headers: {
      "Content-Type": "application/json",
    },
  });

  const json = await res.json();

  console.log("response : ", json);
};

// function delay(ms: number) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// let sent = 0;

await run();
