import { ethers } from "ethers";
import { stackrConfig } from "../stackr.config";
import { ActionSchema } from "@stackr/stackr-js";

const actionSchemaType = {
  type: "String",
  from: "String",
  to: "String",
  amount: "Uint",
  nonce: "Uint",
};

const actionInput = new ActionSchema("update-keeper", actionSchemaType);

const getData = async (nonce: number) => {
  const wallet = new ethers.Wallet(
    "9833eb6296efad8ca93aad767da40b7eb240511ccf9b8346ef8d1f82e30638bd"
  );

  const data = {
    type: "mint",
    from: wallet.address,
    to: "",
    amount: 20,
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

  // const res = await fetch("http://localhost:3000/", {
  //   method: "POST",
  //   body: payload,
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  // });

  // const end = Date.now();

  // const json = await res.json();

  // const elapsedSeconds = (end - start) / 1000;
  // const requestsPerSecond = 1 / elapsedSeconds;

  // console.log(`Requests per second: ${requestsPerSecond.toFixed(2)}`);
  // console.log("response : ", json);
};

// function delay(ms: number) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// let sent = 0;

await run();
