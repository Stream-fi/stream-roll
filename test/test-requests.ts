import { ethers } from "ethers";
import { stackrConfig } from "../stackr.config";
import { ActionSchema } from "@stackr/stackr-js";
import {
  burn,
  transfer,
  createStream,
  updateStream,
  actionSchemaType,
  setStream,
  deleteStream,
  signAndSend,
  fundRandomWallet,
  hexStrings,
} from "./txTypes";

const actionInput = new ActionSchema("update-keeper", actionSchemaType);

const getData = async (nonce: number) => {
  const wallet = new ethers.Wallet(
    "<TEST_OPERATOR_KEY>"
  );

  const data = burn(wallet.address, 100);

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

  const res = await fetch("http://localhost:3000/burn", {
    method: "POST",
    body: payload,
    headers: {
      "Content-Type": "application/json",
    },
  });

  console.log(res);
};

await run();
