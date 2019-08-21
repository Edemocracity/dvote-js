import { getVotingProcessContractInstance } from "../net/contracts"
import GatewayInfo from "../util/gateway-info"
import { DVoteGateway, Web3Gateway } from "../net/gateway"
import { fetchFileString } from "./file"
// import { utils, Wallet, Signer } from "ethers"

export {
    deployVotingProcessContract,
    getVotingProcessContractInstance
} from "../net/contracts"

/**
 * Fetch the JSON metadata for the given processId using the given gateway
 * @param processId 
 * @param votingProcessContractAddress
 * @param gateway
 */
export async function getVoteMetadata(processId: string, votingProcessContractAddress: string, gatewayInfo: GatewayInfo): Promise<string> {
    if (!processId) throw new Error("Invalid processId")
    else if (!votingProcessContractAddress) throw new Error("Invalid votingProcessContractAddress")
    else if (!gatewayInfo || !(gatewayInfo instanceof GatewayInfo)) throw new Error("Invalid Gateway Info object")

    const web3 = new Web3Gateway(gatewayInfo)
    const processInstance = getVotingProcessContractInstance({ provider: web3.getProvider() }, votingProcessContractAddress)

    try {
        const data = await processInstance.get(processId)

        if (!data.metadata) throw new Error("The given voting process has no metadata")

        const gw = new DVoteGateway(gatewayInfo)
        await gw.connect()
        const jsonBuffer = await fetchFileString(data.metadata, gw)
        gw.disconnect()

        return JSON.parse(jsonBuffer.toString())
    }
    catch (err) {
        console.error(err)
        throw new Error("Could not fetch the process data")
    }
}

/**
 * Submit the vote envelope to a Gateway
 * @param voteEnvelope
 * @param processId 
 * @param gateway 
 */
export async function submitEnvelope(voteEnvelope: VoteEnvelopeSnark, processId: string, gateway: GatewayInfo): Promise<boolean> {
    //     throw new Error("unimplemented")

    //     if (voteEnvelope.type == "lrs-envelope") {

    //     }
    //     else { // snark-envelope

    //     }

    //     // TODO: Encode in base64
    //     // TODO: Encrypt vote envelope with the public key of the Relay
    //     const encryptedEnvelope = JSON.stringify(voteEnvelope)

    //     // Ensure we are connected to the right Gateway
    //     if (!this.gateway) this.gateway = new Gateway(gateway)
    //     else if (await this.gateway.getUri() != gateway) await this.gateway.connect(gateway)

    //     return this.gateway.request({
    //         method: "submitEnvelope",
    //         processId,
    //         encryptedEnvelope,
    //     }).then(strData => JSON.parse(strData))

    throw new Error("TODO: unimplemented")
}

/**
 * 
 * @param processId 
 * @param gateway 
 * @param nullifier
 */
export async function getEnvelopeStatus(processId: string, gateway: GatewayInfo, nullifier: string): Promise<boolean> {
    //     // Ensure we are connected to the right Gateway
    //     if (!this.gateway) this.gateway = new Gateway(gateway)
    //     else if (await this.gateway.getUri() != gateway) await this.gateway.connect(gateway)

    //     return this.gateway.request({
    //         method: "getEnvelopeStatus",
    //         processId,
    //         nullifier
    //     }).then(strData => JSON.parse(strData))

    throw new Error("TODO: unimplemented")
}

/**
 * Fetches the vote envelope for a given processId
 * @param processId 
 * @param gateway 
 * @param batchNumber
 */
export async function getEnvelope(processId: string, gateway: GatewayInfo, batchNumber: number): Promise<string> {

    throw new Error("TODO: unimplemented")

}

/**
 * Fetches the number of vote envelopes for a given processId
 * @param processId 
 * @param gateway 
 * @param batchNumber
 */
export async function getEnvelopeHeight(processId: string, gateway: GatewayInfo, batchNumber: number): Promise<string> {

    throw new Error("TODO: unimplemented")

}

/**
 * Fetches the list pf processes for a given entity
 * @param processId 
 * @param gateway 
 * @param batchNumber
 */
export async function getProcessList(processId: string, gateway: GatewayInfo, batchNumber: number): Promise<string> {

    throw new Error("TODO: unimplemented")
    
}

/**
 * Fetches the list of envelopes for a given processId
 * @param processId 
 * @param gateway 
 * @param batchNumber
 */
export async function getEnvelopeList(processId: string, gateway: GatewayInfo, batchNumber: number): Promise<string> {
    
    throw new Error("TODO: unimplemented")

}

// COMPUTATION

// export function packageVote(votePkg: VotePackageLRS | VotePackageSnark, relayPublicKey: string): VoteEnvelopeLRS | VoteEnvelopeSnark {
//     if (votePkg.type == "lrs-package") {
//         return this.packageLrsVote(votePkg, relayPublicKey)
//     }
//     else if (votePkg.type == "snark-package") {
//         return this.packageSnarkVote(votePkg, relayPublicKey)
//     }
//     throw new Error("Unsupported vote type")
// }

// // LRS OUTDATED FUNCTIONS

// /**
//  * Compute the derived public key given a processId
//  * @param publicKey 
//  * @param processId 
//  */
// export function derivePublicKey(publicKey: string, processId: string): string {
//     throw new Error("TODO: unimplemented")
// }

// /**
//  * Compute the derived private key given a processId
//  * @param privateKey 
//  * @param processId 
//  */
// export function derivePrivateKey(privateKey: string, processId: string): string {
//     throw new Error("TODO: unimplemented")
// }

// /**
//  * Fetch the modulus group of the given process census using the given gateway
//  * @param processId 
//  * @param gateway 
//  * @param publicKeyModulus
//  */
// export async function getVotingRing(processId: string, gateway: GatewayInfo, publicKeyModulus: number): Promise<boolean> {
//     // Ensure we are connected to the right Gateway
//     if (!this.gateway) this.gateway = new Gateway(gateway)
//     else if (await this.gateway.getUri() != gateway) await this.gateway.connect(gateway)

//     return this.gateway.request({
//         method: "getVotingRing",
//         processId,
//         publicKeyModulus
//     }).then(strData => JSON.parse(strData))
// }

// INTERNAL HELPERS

function packageSnarkVote(votePkg: VotePackageSnark, relayPublicKey: string): VoteEnvelopeSnark {
    throw new Error("unimplemented")
}

// function packageLrsVote(votePkg: VotePackageLRS, relayPublicKey: string): VoteEnvelopeLRS {
//     throw new Error("unimplemented")
// }


// TYPES

export type VotePackageSnark = {
    type: "snark-package"
}
// export type VotePackageLRS = {
//     type: "lrs-package"
// }
export type VoteEnvelopeSnark = {
    type: "snark-envelope"
}
// export type VoteEnvelopeLRS = {
//     type: "lrs-envelope"
// }
