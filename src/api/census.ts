import { Wallet, Signer } from "ethers"
import { Gateway, IGateway, IDvoteRequestParameters } from "../net/gateway"
import { IGatewayPool, GatewayPool } from "../net/gateway-pool"
import { sha3_256 } from 'js-sha3'
// import ContentURI from "../wrappers/content-uri"
import { hashBuffer } from "../util/hashing"
import { hexStringToBuffer } from "../util/encoding"
// import { Buffer } from "buffer/"
import { CENSUS_MAX_BULK_SIZE } from "../constants"


/**
 * A census ID consists of the Entity Address and the hash of the name.
 * This function returns the full Census ID
 */
export function generateCensusId(censusName: string, entityAddress: string) {
    const prefix = "0x" + entityAddress.toLowerCase().substr(2)
    const suffix = generateCensusIdSuffix(censusName)
    return prefix + "/" + suffix
}

/**
 * A census ID consists of the Entity Address and the hash of the name.
 * This function computes the second term
 */
export function generateCensusIdSuffix(censusName: string) {
    // A census ID consists of the Entity Address and the hash of the name
    // Now computing the second term
    return "0x" + sha3_256(censusName.toLowerCase().trim())
}

/**
 * Hashes the given hex string ECDSA public key and returns the
 * base 64 litte-endian representation of the Poseidon hash big int
 */
export function digestHexClaim(publicKey: string): string {
    const pubKeyBytes = hexStringToBuffer(publicKey)
    let hashNumHex: string = hashBuffer(pubKeyBytes).toString(16)
    if (hashNumHex.length % 2 != 0) {
        hashNumHex = "0" + hashNumHex
    }

    // Using big-endian, pad any missing bytes until we get 32 bytes
    while (hashNumHex.length < 64) {
        hashNumHex = "00" + hashNumHex
    }
    // Convert to Little-endian
    const hashNumBuffer = hexStringToBuffer(hashNumHex)
    hashNumBuffer.reverse()

    // Encode in base64
    return hashNumBuffer.toString("base64")
}

/**
 * Asks the Gateway to create a new census and set the given public key as the ones who can manage it
 * @param censusName Name given to the census. Will be used to generate the census ID by trimming spaces and converting text to lowercase
 * @param managerPublicKeys ECDSA public key(s) that can manage this census
 * @param gateway A Gateway instance connected to a remote Gateway
 * @param walletOrSigner
 * @returns Promise resolving with the new merkleRoot
 */
export async function addCensus(censusName: string, managerPublicKeys: string[], gateway: IGateway | IGatewayPool, walletOrSigner: Wallet | Signer): Promise<{ censusId: string, merkleRoot: string }> {
    if (!censusName || !managerPublicKeys || !managerPublicKeys.length || !gateway) return Promise.reject(new Error("Invalid parameters"))
    else if (!(gateway instanceof Gateway || gateway instanceof GatewayPool)) return Promise.reject(new Error("Invalid Gateway object"))
    else if (!walletOrSigner || !(walletOrSigner instanceof Wallet || walletOrSigner instanceof Signer)) return Promise.reject(new Error("Invalid WalletOrSinger object"))

    const censusId = generateCensusId(censusName, await walletOrSigner.getAddress())

    // Check if the census already exists
    let existingRoot
    try {
        // TODO: normalize the `censusId` parameter value
        // Pass the full censusId instead of the second term only
        existingRoot = await getRoot(censusId, gateway)
        if (typeof existingRoot == "string" && existingRoot.match(/^0x[0-9a-zA-Z]+$/)) return { censusId, merkleRoot: existingRoot }
    } catch (error) {
        // If it errors because it doesn't exist, we continue below
    }

    try {
        const censusIdSuffix = generateCensusIdSuffix(censusName)
        const response = await gateway.sendRequest({ method: "addCensus", censusId: censusIdSuffix, pubKeys: managerPublicKeys }, walletOrSigner)
        const merkleRoot = await getRoot(response.censusId, gateway)
        return { censusId: response.censusId, merkleRoot }
    } catch (error) {
        const message = (error.message) ? "The census could not be created: " + error.message : "The census could not be created "
        throw new Error(message)
    }
}

/**
 * Asks the Gateway to add the given public key to a census previously registered on it.
 * NOTE: This function is intended to be called from NodeJS 10+
 *
 * @param censusId Full Census ID containing the Entity ID and the hash of the original name
 * @param claimData A string containing a base64 encoded Public Key or the base64 encoded Poseidon Hash of it
 * @param digested Set to true if the claim is already hashed using Poseidon Hash. False otherwise.
 * @param gateway A Gateway instance pointing to a remote Gateway
 * @param walletOrSigner
 * @returns Promise resolving with the new merkleRoot
 */
export function addClaim(censusId: string, claimData: string, digested: boolean, gateway: IGateway | IGatewayPool, walletOrSigner: Wallet | Signer): Promise<string> {
    if (!censusId || !claimData || !claimData.length || !gateway) return Promise.reject(new Error("Invalid parameters"))
    else if (!(gateway instanceof Gateway || gateway instanceof GatewayPool)) return Promise.reject(new Error("Invalid Gateway object"))
    else if (!walletOrSigner || !(walletOrSigner instanceof Wallet || walletOrSigner instanceof Signer)) return Promise.reject(new Error("Invalid WalletOrSinger object"))

    return gateway.sendRequest({ method: "addClaim", censusId, digested, claimData }, walletOrSigner)
        .then((response) => {
            return getRoot(censusId, gateway)
        })
        .catch((error) => {
            const message = (error.message) ? "The claim could not be added: " + error.message : "The claim could not be added."
            throw new Error(message)
        })
}

/**
 * Asks the Gateway to add the given public key to a census previously registered on it
 * NOTE: This function is intended to be called from NodeJS 10+
 *
 * @param censusId Full Census ID containing the Entity ID and the hash of the original name
 * @param claimsData A string array containing base64 encoded Public Keys or the base64 encoded Poseidon Hashes of them
 * @param digested Set to true if the claims are already hashed using Poseidon Hash. False otherwise.
 * @param gateway A Gateway instance pointing to a remote Gateway
 * @param walletOrSigner
 * @returns Promise resolving with the new merkleRoot
 */
export async function addClaimBulk(censusId: string, claimsData: string[], digested: boolean, gateway: IGateway | IGatewayPool, walletOrSigner: Wallet | Signer): Promise<{ merkleRoot: string, invalidClaims: any[] }> {
    if (!censusId || !claimsData || !claimsData.length || !gateway) return Promise.reject(new Error("Invalid parameters"))
    else if (!(gateway instanceof Gateway || gateway instanceof GatewayPool)) return Promise.reject(new Error("Invalid Gateway object"))
    else if (!walletOrSigner || !(walletOrSigner instanceof Wallet || walletOrSigner instanceof Signer)) return Promise.reject(new Error("Invalid WalletOrSinger object"))

    let invalidClaims = []
    let addedClaims = 0
    while (addedClaims < claimsData.length) {
        let claims = claimsData.slice(addedClaims, addedClaims+CENSUS_MAX_BULK_SIZE)
        addedClaims += CENSUS_MAX_BULK_SIZE
        const partialInvalidClaims = await addClaimChunk(censusId, claims, digested, gateway, walletOrSigner)
        invalidClaims = invalidClaims.concat(partialInvalidClaims)
    }

    const merkleRoot = await getRoot(censusId, gateway)

    return { merkleRoot, invalidClaims }
}

function addClaimChunk(censusId: string, claimsData: string[], digested: boolean, gateway: IGateway | IGatewayPool, walletOrSigner: Wallet | Signer): Promise<any[]> {
    if (!censusId || !claimsData || claimsData.length > CENSUS_MAX_BULK_SIZE || !gateway) return Promise.reject(new Error("Invalid parameters"))
    else if (!(gateway instanceof Gateway || gateway instanceof GatewayPool)) return Promise.reject(new Error("Invalid Gateway object"))
    else if (!claimsData.length) return Promise.resolve([])
    else if (!walletOrSigner || !(walletOrSigner instanceof Wallet || walletOrSigner instanceof Signer)) return Promise.reject(new Error("Invalid WalletOrSinger object"))


    return gateway.sendRequest({ method: "addClaimBulk", censusId, digested, claimsData }, walletOrSigner)
        .then(response => {
            const invalidClaims = ("invalidClaims" in response) ? response.invalidClaims : []
            return invalidClaims
        }).catch(error => {
            const message = (error.message) ? "The given claims could not be added" + error.message : "The given claims could not be added"
            throw new Error(message)
        })
    // try {
    //     const response = await gateway.sendRequest({ method: "addClaimBulk", censusId, digested, claimsData }, walletOrSigner)
    //     const invalidClaims = ("invalidClaims" in response) ? response.invalidClaims : []

    //     return invalidClaims

    // } catch (error) {
    //     const message = (error.message) ? "The given claims could not be added" + error.message : "The given claims could not be added"
    //     throw new Error(message)
    // }
}

/**
 * Asks the Gateway to fetch
 * @param censusId The full Census ID to fetch from the Gateway
 * @param gateway A Gateway instance pointing to a remote Gateway
 * @returns Promise resolving with the merkleRoot
 */
export function getRoot(censusId: string, gateway: IGateway | IGatewayPool): Promise<string> {
    if (!censusId || !gateway) return Promise.reject(new Error("Invalid parameters"))
    else if (!(gateway instanceof Gateway || gateway instanceof GatewayPool)) return Promise.reject(new Error("Invalid Gateway object"))

    return gateway.sendRequest({ method: "getRoot", censusId })
        .then(response => {
            if (!response.root) throw new Error("The census merkle root could not be fetched")
            return response.root
        }).catch(error => {
            const message = (error.message) ? error.message : "The request could not be completed"
            throw new Error(message)
        })
}

/**
 * Get the number of people in the census with the given Merkle Root Hash
 * @param censusMerkleRootHash The Merkle Root of the census to fetch from the Gateway
 * @param dvoteGw A Gateway instance pointing to a remote Gateway
 * @returns Promise resolving with the census size
 */
export function getCensusSize(censusMerkleRootHash: string, gateway: IGateway | IGatewayPool): Promise<string> {
    if (!censusMerkleRootHash || !gateway) return Promise.reject(new Error("Invalid parameters"))
    else if (!(gateway instanceof Gateway || gateway instanceof GatewayPool)) return Promise.reject(new Error("Invalid Gateway object"))

    return gateway.sendRequest({ method: "getSize", censusId: censusMerkleRootHash }).then(response => {
        if (isNaN(response.size)) throw new Error("The census size could not be retrieved")
        return response.size
    }).catch(error => {
        const message = (error.message) ? error.message : "The request could not be completed"
        throw new Error(message)
    })
}

/** Dumps the entire content of the census as an array of hexStrings rady to be imported to another census service
 *
 * @param censusId Full Census ID containing the Entity ID and the hash of the original name
 * @param gateway A Gateway instance pointing to a remote Gateway
 * @param walletOrSigner
 * @returns Promise resolving with the a hex array dump of the census claims
*/
export function dump(censusId: string, gateway: IGateway | IGatewayPool, walletOrSigner: Wallet | Signer, rootHash?: String): Promise<string[]> {
    if (!censusId || !gateway) return Promise.reject(new Error("Invalid parameters"))
    else if (!(gateway instanceof Gateway || gateway instanceof GatewayPool)) return Promise.reject(new Error("Invalid Gateway object"))

    const msg: IDvoteRequestParameters = (rootHash) ? { method: "dump", censusId, rootHash } : { method: "dump", censusId }

    return gateway.sendRequest(msg, walletOrSigner)
        .then(response => {
            return (response.claimsData && response.claimsData.length) ? response.claimsData : []
        }).catch(error => {
            const message = (error.message) ? "The census merkle root could not be fetched: " + error.message : "The census merkle root could not be fetched"
            throw new Error(message)
        })
}

/** Dumps the contents of a census in raw string format. Not valid to use with `importDump`
 *
 * @param censusId Full Census ID containing the Entity ID and the hash of the original name
 * @param gateway A Gateway instance pointing to a remote Gateway
 * @param walletOrSigner
 * @returns Promise resolving with the a raw string dump of the census claims
*/
export function dumpPlain(censusId: string, gateway: IGateway | IGatewayPool, walletOrSigner: Wallet | Signer, rootHash?: String): Promise<string[]> {
    if (!censusId || !gateway) return Promise.reject(new Error("Invalid parameters"))
    else if (!(gateway instanceof Gateway || gateway instanceof GatewayPool)) return Promise.reject(new Error("Invalid Gateway object"))

    const msg: IDvoteRequestParameters = (rootHash) ? { method: "dumpPlain", censusId, rootHash } : { method: "dumpPlain", censusId }

    return gateway.sendRequest(msg, walletOrSigner)
        .then(response => {
            return (response.claimsData && response.claimsData.length) ? response.claimsData : []
        }).catch(error => {
            const message = (error.message) ? "The census merkle root could not be fetched: " + error.message : "The census merkle root could not be fetched"
            throw new Error(message)
        })
}

/** Only works with specific merkletree format used by dump method. To add a list of plain claims use `addClaimBulk` instead */
export function importDump() {
    throw new Error("TODO: Unimplemented")
}

/** Import a previously published remote census. Only valid URIs accepted */
export function importRemote() {
    throw new Error("TODO: Unimplemented")
}

/** Exports and publish the entire census on the storage of the backend (usually IPFS). Returns the URI of the set of claims */
export function publishCensus(censusId: string, gateway: IGateway | IGatewayPool, walletOrSigner: Wallet | Signer): Promise<string> {
    if (!censusId || !gateway) return Promise.reject(new Error("Invalid parameters"))
    else if (!(gateway instanceof Gateway || gateway instanceof GatewayPool)) return Promise.reject(new Error("Invalid Gateway object"))
    else if (!walletOrSigner || !(walletOrSigner instanceof Wallet || walletOrSigner instanceof Signer)) return Promise.reject(new Error("Invalid WalletOrSinger object"))

    return gateway.sendRequest({ method: "publish", censusId }, walletOrSigner)
        .then(response => {
            if (!response.uri) throw new Error("The census claim URI could not be retrieved")
            return response.uri
        })
        .catch((error) => {
            const message = (error.message) ? error.message : "The request could not be completed"
            throw new Error(message)
        })
}

/**
 * Fetch the proof of the given claim on the given census merkleTree using the given gateway
 * @param censusMerkleRoot The Merkle Root of the Census to query
 * @param base64Claim Base64-encoded claim of the leaf to request
 * @param gateway
 */
export function generateProof(censusMerkleRoot: string, base64Claim: string, isDigested: boolean, gateway: IGateway | IGatewayPool): Promise<string> {
    if (!censusMerkleRoot || !base64Claim || !gateway) return Promise.reject(new Error("Invalid parameters"))
    else if (!(gateway instanceof Gateway || gateway instanceof GatewayPool)) return Promise.reject(new Error("Invalid Gateway object"))

    return gateway.sendRequest({
        method: "genProof",
        censusId: censusMerkleRoot,
        digested: isDigested,
        claimData: base64Claim,
    }).then(response => {
        if (typeof response.siblings != "string" || !response.siblings.length) throw new Error("The Merkle Proof could not be fetched")
        return response.siblings
    }).catch((error) => {
        const message = (error.message) ? error.message : "The request could not be completed"
        throw new Error(message)
    })
}

// export function checkProof() {
//     throw new Error("TODO: Unimplemented")
// }
