import * as nodeassert from "assert";
import { assert } from "chai";
import DvoteSmartContracts = require("dvote-smart-contracts");
import * as sinon from "sinon";
import * as dvote from "../../src";

import Web3 = require("web3");
import Web3Personal = require("web3-eth-personal");

import { deployContract } from "../testUtils";

describe("#Unit Process", () => {
    const blockchainUrl: string = process.env.BLOCKCHAIN_URL;
    const web3: Web3 = new Web3(new Web3.providers.HttpProvider(blockchainUrl));
    const web3Personal = new Web3Personal(blockchainUrl);
    // let votingProcessContractAddress: string = null;
    let votingProcess: dvote.Process;

    describe("#GetById", () => {
        it("Should return a valid process Metadata", async () => {
            const contractStub = sinon.stub(dvote.Blockchain.prototype, "getContract").returns(false);
            votingProcess = new dvote.Process(blockchainUrl, "nowhere");
            contractStub.restore();

            const expectedProcessMetadata = {
                censusRoot: "",
                censusUrl: "",
                endBlock: "",
                startBlock: "",
                status: "",
                trustedGateways: "",
                voteEncryptionKeys: "",
                votingOptions: "",
            };

            const getProcessMetadataStub = sinon.stub(dvote.Process.prototype, "getMetadata")
                                                .resolves(expectedProcessMetadata);

            const metadata: object = await votingProcess.getMetadata("identifier");

            getProcessMetadataStub.restore();
            sinon.assert.match(metadata, expectedProcessMetadata);
        });
    }),

        describe("#batchExists", () => {
            it("");
        }),

        describe("#getVotingOptions", () => {
            it("");
        }),

        describe("#encryptVote", () => {
            it("Fails on empty vote", () => {
                const vote: string = "";
                const votePublicKey: string = "123abcdeb";
                assert.throws(() => {
                    votingProcess.encryptVote(vote, votePublicKey);
                }, Error, "Vote can't be empty");
            }),

                it("Fails on empty votePublicKey", () => {
                    const vote: string = "1";
                    const votePublicKey: string = "";
                    assert.throws(() => {
                        votingProcess.encryptVote(vote, votePublicKey);
                    }, Error, "VotePublicKey can't be empty");
                }),

                it("Result is a String", () => {
                    const vote: string = "1";
                    const votePublicKey: string = "123abcdeb";
                    const encryptedVote: string = votingProcess.encryptVote(vote, votePublicKey);
                    assert.isString(encryptedVote);
                });
        }),

        describe("#hashEncryptedVote", () => {
            it("");
        }),

        describe("#getVotingPackage", () => {
            it("");
        });
});
