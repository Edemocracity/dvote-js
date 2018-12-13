import Blockchain from "./blockchain";

export default class Process {
    private Blockchain: Blockchain;

    constructor(blockchainUrl: string, votingProcessContractPath: string, votingProcessContractAddress: string) {
        this.Blockchain = new Blockchain(blockchainUrl, votingProcessContractPath, votingProcessContractAddress);
    }

    public async create(metadata: object, organizerAddress: string): Promise<string> {
        // TODO: Some input validation

        return await this.Blockchain.createProcess(metadata, organizerAddress);
    }

    public getMetadata(id: string): object {
        if (id.length === 0) {
            throw Error("ID can't be empty");
        }

        return this.Blockchain.getProcessMetadata(id);
    }

    public encryptVote(vote: string, votePublicKey: string): string {
        if (vote.length === 0) {
            throw Error("Vote can't be empty");
        }

        if (votePublicKey.length === 0) {
            throw Error("VotePublicKey can't be empty");
        }

        return "";
    }
}
