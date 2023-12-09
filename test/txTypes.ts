import { ethers } from "ethers";
import { stackrConfig } from "../stackr.config";
import { ActionSchema } from "@stackr/stackr-js";
import { HDNodeWallet } from "ethers";
import { Wallet } from "ethers";

export const hexStrings = [
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdea',
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdeb',
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdec',
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcded',
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdee'
  ];
export const actionSchemaType = {
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
    actualTimestamp: "Uint"
};
const actionInput = new ActionSchema("update-flowup", actionSchemaType);

export const fundRandomWallet = async (pvt:string, amount: number) => { 
    // create a random wallet
    const wallet = new ethers.Wallet(pvt);
    console.log("wallet created: ", wallet.address);
    // fund it with some tokens
    await signAndSend(wallet, mint(wallet.address, amount));
  
    return wallet;
  }

export const kick = (from: string) => ({
    from: from,
    type: {
        move: "",
        stream: "",
    },
    params: {
        move: {
            amount: 0,
        },
        stream: {
            flowRate: 0,
        },
        to: from,
    },
    nonce: Date.now(),
    actualTimestamp: Math.ceil(Date.now() / 1000)
})

export const mint = (from: string, amount: number) => ({
    from,
    type: {
        move: "mint",
        stream: "",
    },
    params: {
        move: {
            amount,
        },
        stream: {
            flowRate: 0,
        },
        to: from,
    },
    nonce: Date.now(),
    actualTimestamp: Math.ceil(Date.now() / 1000)
});

export const burn = (from: string, amount: number) => ({
    from,
    type: {
        move: "burn",
        stream: "",
    },
    params: {
        move: {
            amount,
        },
        stream: {
            flowRate: 0,
        },
        to: from,
    },
    nonce: Date.now(),
    actualTimestamp: Math.ceil(Date.now() / 1000)
});

export const transfer = (from: string, to: string, amount: number) => ({
    from,
    type: {
        move: "transfer",
        stream: "",
    },
    params: {
        move: {
            amount,
        },
        stream: {
            flowRate: 0,
        },
        to,
    },
    nonce: Date.now(),
    actualTimestamp: Math.ceil(Date.now() / 1000)
});

export const createStream = (from: string, to: string, flowRate: number) => ({
    from,
    type: {
        move: "",
        stream: "create",
    },
    params: {
        move: {
            amount: 0,
        },
        stream: {
            flowRate,
        },
        to,
    },
    nonce: Date.now(),
    actualTimestamp: Math.ceil(Date.now() / 1000)
});

export const updateStream = (from: string, to: string, flowRate: number) => ({
    from,
    type: {
        move: "",
        stream: "update",
    },
    params: {
        move: {
            amount: 0,
        },
        stream: {
            flowRate,
        },
        to,
    },
    nonce: Date.now(),
    actualTimestamp: Math.ceil(Date.now() / 1000)
});

export const setStream = (from: string, to: string, flowRate: number) => ({
    from,
    type: {
        move: "",
        stream: "set",
    },
    params: {
        move: {
            amount: 0,
        },
        stream: {
            flowRate,
        },
        to,
    },
    nonce: Date.now(),
    actualTimestamp: Math.ceil(Date.now() / 1000)
});

export const deleteStream = (from: string, to: string) => ({
    from,
    type: {
        move: "",
        stream: "delete",
    },
    params: {
        move: {
            amount: 0,
        },
        stream: {
            flowRate: 0,
        },
        to,
    },
    nonce: Date.now(),
    actualTimestamp: Math.ceil(Date.now() / 1000)
});

export const signAndSend = async (from: Wallet, data: any) => {
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