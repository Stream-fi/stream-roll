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
  liquidationTime: number;
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
    to: string; // this is mandatory. If mint/burn, use same address as from
  }
  nonce: number;
  actualTimestamp: number; // this is the timestamp of the block that the action is included in
}

const emptyUser: (address: string) => User = (address: string) => ({
  address,
  staticBalance: 0,
  netFlow: 0,
  lastUpdate: 0,
  liquidationTime: 10000000000000,
  streams: []
});

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
    // this sorts the users array by liquidation time. In place.
    function sortUsers() {
      newState.users.sort((a, b) => a.liquidationTime - b.liquidationTime);
    }
    function findOrCreateUser(address: string) : number {
      let index = newState.users.findIndex(
        (account) => account.address === address
      );
      if (index === -1) {
        index = newState.users.push(emptyUser(address)) -1;
      }
      return index;
    }
    
    let senderIndex = findOrCreateUser(inputs.from);
    let receiverIndex = senderIndex;
    if(inputs.from !== inputs.params.to) receiverIndex = findOrCreateUser(inputs.params.to);

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
      // check that sender has sufficient balance
      if (balanceOf(senderIndex) < flowRate) {
        throw new Error("Insufficient balance");
      };

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
    function updateLiquidationTimestamp(index: number) {
      const account = newState.users[index];
      const netFlow = account.netFlow;
      const balance = balanceOf(index);
      let liquidationTime = newState.users[index].liquidationTime;
      if (netFlow < 0){
        // user is losing money, set liquidation time to the time when balance will be 0
        liquidationTime = newState.localTimestamp + Math.floor(balance / -netFlow);
        newState.users[index].liquidationTime = liquidationTime;
      }
      if(liquidationTime < 0) {
        throw new Error("Liquidation time cannot be negative");
      }
    }
    
    // here we should check that we can move time forward to the actualTimestamp
    // if we can't, we have to cleanup the state first
    console.log("localTimestamp: ", newState.localTimestamp);
    console.log("actualTimestamp: ", inputs.actualTimestamp);
    // in theory, actualTimestamp should always be greater than localTimestamp
    if(newState.localTimestamp > inputs.actualTimestamp) {
      throw new Error("Cannot move time backwards");
    }
    // if actualTimestamp is greater than the liquidation time of the first account in the array, we have to cleanup the state
    do {
      console.log("liquidation time: ", newState.users[0].liquidationTime);
      if(newState.users[0].liquidationTime < inputs.actualTimestamp) {
        console.log("INSOLVENT ACCOUNT");
        console.log("insolvent account: ", newState.users[0].address, " liquidation time: ", newState.users[0].liquidationTime);
        // closes all of the streams of the account
        newState.users[0].streams.forEach((stream) => {
          let toIndex = findOrCreateUser(stream.to);
          deleteStream(0, toIndex);
          updateLiquidationTimestamp(toIndex);
        });
        updateLiquidationTimestamp(0);
        // sorts the array again
        sortUsers();
      }
    } while(newState.users[0].liquidationTime < inputs.actualTimestamp);

    newState.localTimestamp = inputs.actualTimestamp;

    if(inputs.type.stream == "create" || inputs.type.stream == "update" || inputs.type.stream == "delete") {
      const flowRate = inputs.params.stream?.flowRate || 0;
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
    else if(inputs.type.move == "mint" || inputs.type.move == "burn" || inputs.type.move == "transfer") {
      // @ts-ignore
      let amount = inputs.params.move.amount;
      console.log("AMOUNT: ", amount);
      if (inputs.type.move == "mint") {
        console.log("MINTEEEING, ", amount, " to ", inputs.from, " index: ", senderIndex);
        newState.users[senderIndex].staticBalance += amount;
      } else if(inputs.type.move == "burn") {
        newState.users[senderIndex].staticBalance -= amount;
      } else if(inputs.type.move == "transfer") {
        if (balanceOf(senderIndex) < amount) {
          throw new Error("Insufficient balance");
        }
        newState.users[senderIndex].staticBalance -= amount;
        newState.users[receiverIndex].staticBalance += amount!;
      }
    }
    // update liquidation time
    updateLiquidationTimestamp(senderIndex);
    receiverIndex !== senderIndex && updateLiquidationTimestamp(receiverIndex);
    sortUsers();
    state.transport.allAccounts = newState;
  },
};
