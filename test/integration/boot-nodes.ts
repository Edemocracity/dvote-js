import "mocha" // using @types/mocha
import { expect } from "chai"
import { Network } from "../.."

import { DVoteGateway, Web3Gateway } from "../../src/net/gateway"
import {
    getGatewaysFromBootNodeData,
    fetchFromBootNode,
    fetchDefaultBootNode
} from "../../src/net/gateway-bootnodes"

const DEV_BOOTNODES_URL = "https://bootnodes.vocdoni.net/gateways.dev.json"
const STAGE_BOOTNODES_URL = "https://bootnodes.vocdoni.net/gateways.stg.json"
const PRODUCTION_BOOTNODES_URL = "https://bootnodes.vocdoni.net/gateways.json"

describe("Boot nodes", () => {

    it("fetchFromBootNode with getGatewaysFromBootNodeData should provide a gateway list", async () => {
        let bootnodeData = await fetchFromBootNode(DEV_BOOTNODES_URL)
        let bootnodes = await getGatewaysFromBootNodeData(bootnodeData)

        for (let networkId in bootnodes) {
            expect(typeof networkId).to.equal("string")

            expect(bootnodes[networkId].dvote).to.have.length.gte(1)
            expect(bootnodes[networkId].web3).to.have.length.gte(1)

            expect(bootnodes[networkId].dvote[0] instanceof DVoteGateway).to.be.true
            expect(bootnodes[networkId].web3[0] instanceof Web3Gateway).to.be.true

            expect(typeof bootnodes[networkId].dvote[0].connect).to.equal("function")
            expect(typeof bootnodes[networkId].dvote[0].disconnect).to.equal("function")
            expect(typeof bootnodes[networkId].dvote[0].getUri).to.equal("function")
            expect(typeof await bootnodes[networkId].dvote[0].getUri()).to.equal("string")
            expect(typeof bootnodes[networkId].dvote[0].sendMessage).to.equal("function")
            expect(typeof bootnodes[networkId].dvote[0].isConnected).to.equal("function")
            expect(typeof bootnodes[networkId].dvote[0].publicKey).to.equal("string")

            expect(typeof bootnodes[networkId].web3[0].attach).to.equal("function")
            expect(typeof bootnodes[networkId].web3[0].deploy).to.equal("function")
            expect(typeof bootnodes[networkId].web3[0].getProvider).to.equal("function")
        }
        // XDAI

        bootnodeData = await fetchFromBootNode(PRODUCTION_BOOTNODES_URL)
        bootnodes = await getGatewaysFromBootNodeData(bootnodeData)

        for (let networkId in bootnodes) {
            expect(typeof networkId).to.equal("string")
        }

        expect(bootnodes["xdai"].dvote).to.have.length.gte(1)
        expect(bootnodes["xdai"].web3).to.have.length.gte(1)

        expect(bootnodes["xdai"].dvote[0] instanceof DVoteGateway).to.be.true
        expect(bootnodes["xdai"].web3[0] instanceof Web3Gateway).to.be.true

        expect(typeof bootnodes["xdai"].dvote[0].connect).to.equal("function")
        expect(typeof bootnodes["xdai"].dvote[0].disconnect).to.equal("function")
        expect(typeof bootnodes["xdai"].dvote[0].getUri).to.equal("function")
        expect(typeof await bootnodes["xdai"].dvote[0].getUri()).to.equal("string")
        expect(typeof bootnodes["xdai"].dvote[0].sendMessage).to.equal("function")
        expect(typeof bootnodes["xdai"].dvote[0].isConnected).to.equal("function")
        expect(typeof bootnodes["xdai"].dvote[0].publicKey).to.equal("string")

        expect(typeof bootnodes["xdai"].web3[0].attach).to.equal("function")
        expect(typeof bootnodes["xdai"].web3[0].deploy).to.equal("function")
        expect(typeof bootnodes["xdai"].web3[0].getProvider).to.equal("function")

        // XDAI Stage

        bootnodeData = await fetchFromBootNode(STAGE_BOOTNODES_URL)
        const options = {testing:true}
        bootnodes = await getGatewaysFromBootNodeData(bootnodeData, options)

        for (let networkId in bootnodes) {
            expect(typeof networkId).to.equal("string")
        }

        expect(bootnodes["xdai"].dvote).to.have.length.gte(1)
        expect(bootnodes["xdai"].web3).to.have.length.gte(1)

        expect(bootnodes["xdai"].dvote[0] instanceof DVoteGateway).to.be.true
        expect(bootnodes["xdai"].web3[0] instanceof Web3Gateway).to.be.true

        expect(typeof bootnodes["xdai"].dvote[0].connect).to.equal("function")
        expect(typeof bootnodes["xdai"].dvote[0].disconnect).to.equal("function")
        expect(typeof bootnodes["xdai"].dvote[0].getUri).to.equal("function")
        expect(typeof await bootnodes["xdai"].dvote[0].getUri()).to.equal("string")
        expect(typeof bootnodes["xdai"].dvote[0].sendMessage).to.equal("function")
        expect(typeof bootnodes["xdai"].dvote[0].isConnected).to.equal("function")
        expect(typeof bootnodes["xdai"].dvote[0].publicKey).to.equal("string")

        expect(typeof bootnodes["xdai"].web3[0].attach).to.equal("function")
        expect(typeof bootnodes["xdai"].web3[0].deploy).to.equal("function")
        expect(typeof bootnodes["xdai"].web3[0].getProvider).to.equal("function")
    }).timeout(20000)

    it("fetchDefaultBootNode (default) should provide a bootnode JSON structure", async () => {
        let bootnodes = await fetchDefaultBootNode("goerli")

        for (let networkId in bootnodes) {
            expect(typeof networkId).to.equal("string")
        }

        expect(Array.isArray(bootnodes["goerli"].dvote)).to.be.true
        expect(typeof bootnodes["goerli"].dvote[0].uri).to.equal("string")
        expect(typeof bootnodes["goerli"].dvote[0].pubKey).to.equal("string")
        expect(Array.isArray(bootnodes["goerli"].dvote[0].apis)).to.be.true

        expect(typeof bootnodes["goerli"].web3[0].uri).to.equal("string")

        // XDAI Stage
        const options = {testing:true}
        bootnodes = await fetchDefaultBootNode("xdai", options)
        console.log(JSON.stringify(bootnodes, null, 2))
        for (let networkId in bootnodes) {
            expect(typeof networkId).to.equal("string")
        }

        expect(Array.isArray(bootnodes["xdai"].dvote)).to.be.true
        expect(typeof bootnodes["xdai"].dvote[0].uri).to.equal("string")
        expect(typeof bootnodes["xdai"].dvote[0].pubKey).to.equal("string")
        expect(Array.isArray(bootnodes["xdai"].dvote[0].apis)).to.be.true

        expect(typeof bootnodes["xdai"].web3[0].uri).to.equal("string")

        // XDAI
        bootnodes = await fetchDefaultBootNode("xdai")
        console.log(JSON.stringify(bootnodes, null, 2))
        for (let networkId in bootnodes) {
            expect(typeof networkId).to.equal("string")
        }

        expect(Array.isArray(bootnodes["xdai"].dvote)).to.be.true
        expect(typeof bootnodes["xdai"].dvote[0].uri).to.equal("string")
        expect(typeof bootnodes["xdai"].dvote[0].pubKey).to.equal("string")
        expect(Array.isArray(bootnodes["xdai"].dvote[0].apis)).to.be.true

        expect(typeof bootnodes["xdai"].web3[0].uri).to.equal("string")

        // SOKOL
        bootnodes = await fetchDefaultBootNode("sokol")
        console.log(JSON.stringify(bootnodes, null, 2))
        for (let networkId in bootnodes) {
            expect(typeof networkId).to.equal("string")
        }

        expect(Array.isArray(bootnodes["sokol"].dvote)).to.be.true
        expect(typeof bootnodes["sokol"].dvote[0].uri).to.equal("string")
        expect(typeof bootnodes["sokol"].dvote[0].pubKey).to.equal("string")
        expect(Array.isArray(bootnodes["sokol"].dvote[0].apis)).to.be.true

        expect(typeof bootnodes["sokol"].web3[0].uri).to.equal("string")
    }).timeout(20000)

    it("fetchFromBootNode should provide a bootnode JSON structure", async () => {
        let bootnodes = await fetchFromBootNode(DEV_BOOTNODES_URL)

        for (let networkId in bootnodes) {
            expect(typeof networkId).to.equal("string")

            expect(Array.isArray(bootnodes[networkId].dvote)).to.be.true
            expect(typeof bootnodes[networkId].dvote[0].uri).to.equal("string")
            expect(typeof bootnodes[networkId].dvote[0].pubKey).to.equal("string")
            expect(Array.isArray(bootnodes[networkId].dvote[0].apis)).to.be.true

            expect(typeof bootnodes[networkId].web3[0].uri).to.equal("string")
        }

        // XDAI
        bootnodes = await fetchFromBootNode(PRODUCTION_BOOTNODES_URL)

        for (let networkId in bootnodes) {
            expect(typeof networkId).to.equal("string")
        }

        expect(Array.isArray(bootnodes["xdai"].dvote)).to.be.true
        expect(typeof bootnodes["xdai"].dvote[0].uri).to.equal("string")
        expect(typeof bootnodes["xdai"].dvote[0].pubKey).to.equal("string")
        expect(Array.isArray(bootnodes["xdai"].dvote[0].apis)).to.be.true

        expect(typeof bootnodes["xdai"].web3[0].uri).to.equal("string")

         // XDAI Stage
         bootnodes = await fetchFromBootNode(STAGE_BOOTNODES_URL)

         for (let networkId in bootnodes) {
             expect(typeof networkId).to.equal("string")
         }
 
         expect(Array.isArray(bootnodes["xdai"].dvote)).to.be.true
         expect(typeof bootnodes["xdai"].dvote[0].uri).to.equal("string")
         expect(typeof bootnodes["xdai"].dvote[0].pubKey).to.equal("string")
         expect(Array.isArray(bootnodes["xdai"].dvote[0].apis)).to.be.true
 
         expect(typeof bootnodes["xdai"].web3[0].uri).to.equal("string")
    }).timeout(20000)

})
