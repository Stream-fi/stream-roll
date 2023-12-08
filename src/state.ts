import { RollupState, STF } from "@stackr/stackr-js/execution";
import { ethers } from "ethers";

export type StateVariable = {
  address: string;
  balance: number;
}[];

interface StateTransport {
  allAccounts: StateVariable;
}

export interface KeeperActionInput {
  type: "mint" | "burn" | "transfer" | "createAccount";
  from: string;
  to?: string;
  amount?: number;
  nonce: number;
}

export class KeeperNetwork extends RollupState<StateVariable, StateTransport> {
  constructor(accounts: StateVariable) {
    super(accounts);
  }

  createTransport(state: StateVariable): StateTransport {
    return { allAccounts: state };
  }

  getState(): StateVariable {
    return this.transport.allAccounts;
  }

  calculateRoot(): ethers.BytesLike {
    return ethers.solidityPackedKeccak256(
      ["string"],
      [JSON.stringify(this.transport.allAccounts)]
    );
  }
}

export const keeperSTF: STF<KeeperNetwork, KeeperActionInput> = {
  identifier: "keeperSTF",

  apply(inputs: KeeperActionInput, state: KeeperNetwork): void {
    let newState = state.getState();
    const senderIndex = newState.findIndex(
      (account) => account.address === inputs.from
    );
    if (senderIndex === -1) {
      throw new Error("Account not found");
    }
    switch (inputs.type) {
      case "mint":
        newState[senderIndex].balance += inputs.amount!;
        break;
      case "burn":
        newState[senderIndex].balance -= inputs.amount!;
        break;
      case "transfer":
        const receiverIndex = newState.findIndex(
          (account) => account.address === inputs.to
        );
        if (receiverIndex === -1) {
          throw new Error("Reciever account not found");
        }
        if (newState[senderIndex].balance < inputs.amount!) {
          throw new Error("Insufficient balance");
        }
        newState[senderIndex].balance -= inputs.amount!;
        newState[receiverIndex].balance += inputs.amount!;
        break;
      case "createAccount":
        newState.push({
          address: inputs.from,
          balance: 0,
        });
        break;
    }
    state.transport.allAccounts = newState;
  },
};
