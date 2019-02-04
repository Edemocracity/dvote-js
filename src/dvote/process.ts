import DvoteContracts = require("dvote-smart-contracts");
import Blockchain from "./blockchain";

interface IProcessMetadata {
    id: string
    name: string
    startBlock: number
    endBlock: number
    question: string
    votingOptions: string[]
    voteEncryptionPublicKey: string
}

export default class Process {
    private ProcessInstance: Blockchain;

    constructor(web3Provider: any, votingProcessContractAddress: string) {
        this.ProcessInstance = new Blockchain(web3Provider, votingProcessContractAddress, DvoteContracts.VotingProcess.abi);
    }

    public create(metadata: any, organizerAddress: string): Promise<string> {
        if (!metadata.name) {
            return Promise.reject(new Error("Invalid process name"))
        }
        else if (!metadata.question) {
            return Promise.reject(new Error("Invalid process question"))
        }
        else if (typeof metadata.startBlock !== "number") {
            return Promise.reject(new Error("Invalid process startBlock"))
        }
        else if (typeof metadata.endBlock !== "number") {
            return Promise.reject(new Error("Invalid process endBlock"))
        }
        else if (metadata.startBlock >= metadata.endBlock) {
            return Promise.reject(new Error("The process endBlock must be greater than the startBlock"))
        }
        else if (!metadata.censusMerkleRoot) {
            return Promise.reject(new Error("Invalid process censusMerkleRoot"))
        }
        else if (!metadata.censusProofUrl) {
            return Promise.reject(new Error("Invalid process censusProofUrl"))
        }
        else if (!metadata.votingOptions || metadata.votingOptions.length < 1) {
            return Promise.reject(new Error("Invalid votingOptions"))
        }
        else if (!metadata.voteEncryptionPublicKey) {
            return Promise.reject(new Error("Invalid process voteEncryptionPublicKey"))
        }

        return this.ProcessInstance.exec("createProcess",
            [metadata.name,
            metadata.startBlock,
            metadata.endBlock,
            metadata.censusMerkleRoot,
            metadata.censusProofUrl,
            metadata.censusRequestUrl,
            metadata.question,
            metadata.votingOptions,
            metadata.voteEncryptionPublicKey],
            { type: "send", from: organizerAddress, gas: 999999 });
    }

    public getMetadata(processId: string): Promise<IProcessMetadata> {
        if (!processId) return Promise.reject("processId is required");

        return this.ProcessInstance.exec("getProcessMetadata", [processId]).then((meta: IProcessMetadata) => {
            // Append the processId to itself
            meta.id = processId;
            return meta;
        });
    }

    public getId(name: string, organizerAddress: string): Promise<string> {
        return this.ProcessInstance.exec("getProcessId", [organizerAddress, name]);
    }

    public getProcessesIdsByOrganizer(organizerAddress: string): Promise<string[]> {
        return this.ProcessInstance.exec("getProcessesIdByOrganizer", [organizerAddress]);
    }

    public getMultipleMetadata(processesId: string[]): Promise<IProcessMetadata[]> {
        const promises: Promise<IProcessMetadata>[] = [];
        for (const pid of processesId) {
            promises.push(this.getMetadata(pid));
        }

        return Promise.all(promises);
    }

    public encryptVote(vote: string, votePublicKey: string): string {
        if (!vote) throw Error("Vote is required");
        else if (!votePublicKey) throw Error("VotePublicKey is required");

        // TODO:
        return "";
    }
}
