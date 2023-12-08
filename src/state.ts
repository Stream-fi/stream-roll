import { RollupState, STF } from "@stackr/stackr-js/execution";
import { ethers } from "ethers";

export type StateVariable = {
  users: User[];
  localTimestamp: number;
}

type User = {
  address: string;
  staticBalance: number;
  netFlow: number;
  lastUpdate: number;
  liquidationTime?: number;
  streams: Stream[];
}

type Stream = {
  to: string;
  flowRate: number;
  startTime: number;
}

interface StateTransport {
  allAccounts: StateVariable;
}

export interface FlowUpActionInput {
  from: string;
  type: {
    move?: "mint" | "burn" | "transfer";
    stream?: "create" | "update" | "delete";
  };
  params:{
    move?: {
      amount: number;
    };
    stream?: {
      flowRate?: number;
    };
    to: string;
  }
  nonce: number;
  actualTimestamp: number; // this is the timestamp of the block that the action is included in
}

export class FlowUpNetwork extends RollupState<StateVariable, StateTransport> {
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

export const flowupSTF: STF<FlowUpNetwork, FlowUpActionInput> = {
  identifier: "flowUpSTF",

  apply(inputs: FlowUpActionInput, state: FlowUpNetwork): void {
    let newState = state.getState();
    let senderIndex = newState.users.findIndex(
      (account) => account.address === inputs.from
    );
    // this creates a new user if the sender is not found
    if (senderIndex === -1) {
      newState.users.push({
        address: inputs.from,
        staticBalance: 0,
        netFlow: 0,
        lastUpdate: 0, // replace with current timestamp
        streams: []
      });
      senderIndex = newState.users.findIndex(
        (account) => account.address === inputs.from
      );
    }

    function balanceOf(index: number) { //view function
      const account = newState.users[index];
      const timeElapsed = newState.localTimestamp - account.lastUpdate;
      const netFlow = account.netFlow;
      const newBalance = account.staticBalance + netFlow * timeElapsed;
      return newBalance;
    }
    function settleAccount(index: number) {
      newState.users[index].staticBalance = balanceOf(index);
      newState.users[index].lastUpdate = newState.localTimestamp;
    }
    function updateNetFlow(index: number, flowRate: number) {
      const account = newState.users[index];
      const netFlow = account.netFlow;
      const newNetFlow = netFlow + flowRate;
      newState.users[index].netFlow = newNetFlow;
    }
    function sendStream(senderIndex: number, receiverIndex: number, flowRate: number) {
       // check that stream doesn't already exist 
       const streamIndex = newState.users[senderIndex].streams.findIndex(
        (stream) => stream.to === inputs.params.to
      );
      if (streamIndex !== -1) {
        throw new Error("Stream already exists");
      }
      // settle sender account
      settleAccount(senderIndex);
      // settle receiver account
      settleAccount(receiverIndex);
      // update net flow of sender and receiver
      updateNetFlow(senderIndex, -flowRate);
      updateNetFlow(receiverIndex, flowRate);
      // create new stream in database
      newState.users[senderIndex].streams.push({
        to: inputs.params.to,
        flowRate: flowRate,
        startTime: newState.localTimestamp
      });
    }
    function deleteStream(senderIndex: number, receiverIndex: number) {
      // check that stream exists
      const streamIndex = newState.users[senderIndex].streams.findIndex(
        (stream) => stream.to === inputs.params.to
      );
      if (streamIndex === -1) {
        throw new Error("Stream does not exist");
      }
      // settle sender account
      settleAccount(senderIndex);
      // settle receiver account
      settleAccount(receiverIndex);
      // update net flow of sender and receiver
      const flowRate = newState.users[senderIndex].streams[streamIndex].flowRate;
      updateNetFlow(senderIndex, flowRate);
      updateNetFlow(receiverIndex, -flowRate);
      // delete stream from database
      newState.users[senderIndex].streams.splice(streamIndex, 1);
    }

    if(inputs.type.hasOwnProperty("stream")) {
      newState.localTimestamp = inputs.actualTimestamp;
      const flowRate = inputs.params.stream?.flowRate || 0;
      const receiverIndex = newState.users.findIndex(
        (account) => account.address === inputs.params.to
      );
      if (inputs.type.stream == "create") {
        sendStream(senderIndex, receiverIndex, flowRate);
      }
      else if (inputs.type.stream == "update") {
        deleteStream(senderIndex, receiverIndex);
        sendStream(senderIndex, receiverIndex, flowRate);
      } else if (inputs.type.stream == "delete") {
        deleteStream(senderIndex, receiverIndex);
      }
    }
    else if(inputs.type.hasOwnProperty("move")) {
      // @ts-ignore
      let amount = inputs.params.move.amount;
      if (inputs.type.move == "mint") {
        newState.users[senderIndex].staticBalance += amount;
      } else if(inputs.type.move == "burn") {
        newState.users[senderIndex].staticBalance -= amount;
      } else if(inputs.type.move == "transfer") {
        const receiverIndex = newState.users.findIndex(
          (account) => account.address === inputs.params.to
        );
        if (receiverIndex === -1) {
          throw new Error("Receiver account not found");
        }
        if (balanceOf(senderIndex) < amount) {
          throw new Error("Insufficient balance");
        }
        newState.users[senderIndex].staticBalance -= amount;
        newState.users[receiverIndex].staticBalance += amount!;
      }
    }
    state.transport.allAccounts = newState;
  },
};
