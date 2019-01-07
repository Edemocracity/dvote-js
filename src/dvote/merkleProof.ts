export default class MerkleProof {

    public root: string;
    public siblings: string[];
    public leaf: string;

    constructor(proof: string[]) {
        this.root = proof[0];
        this.siblings = proof.slice(1, proof.length - 2);
        this.leaf = proof[proof.length - 1];
    }

}