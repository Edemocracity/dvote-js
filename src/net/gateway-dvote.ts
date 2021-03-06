import { parseURL } from 'universal-parse-url'
import { Buffer } from 'buffer/'
import { Wallet, Signer } from "ethers"
import { GatewayInfo } from "../wrappers/gateway-info"
import { DVoteSupportedApi, DVoteGatewayMethod, dvoteGatewayApiMethods, dvoteApis } from "../models/gateway"
import { GATEWAY_SELECTION_TIMEOUT } from "../constants"
import { JsonSignature, BytesSignature } from "../util/data-signing"
import axios, { AxiosInstance, AxiosResponse } from "axios"
import { extractUint8ArrayJSONValue } from "../util/uint8array"
import { readBlobText, readBlobArrayBuffer } from "../util/blob"
import { promiseWithTimeout } from '../util/timeout'
import { Random } from '../util/random'


///////////////////////////////////////////////////////////////////////////////
// DVOTE GATEWAY
///////////////////////////////////////////////////////////////////////////////

// Export the class typings as an interface
export type IDVoteGateway = InstanceType<typeof DVoteGateway>


/** Parameters sent by the function caller */
export interface IDvoteRequestParameters {
    // Common
    method: DVoteGatewayMethod,
    timestamp?: number,

    [k: string]: any
}

/** What is actually sent by sendRequest() to the Gateway */
type MessageRequestContent = {
    id: string,
    request: IDvoteRequestParameters,
    signature?: string
}

export type DVoteGatewayResponseBody = {
    ok: boolean,
    request: string,
    message?: string,
    timestamp?: number,

    // the rest of fields
    [k: string]: any
}
type DVoteGatewayResponse = {
    id: string,
    response: DVoteGatewayResponseBody,
    signature?: string,
    // responseBytes?: Uint8Array,
}

/**
 * This class provides access to Vocdoni Gateways sending JSON payloads over Web Sockets
 * intended to interact within voting processes
 */
export class DVoteGateway {
    private _supportedApis: DVoteSupportedApi[] = []
    private _pubKey: string = ""
    private _health: number = 0
    private _uri: string
    private client: AxiosInstance = null

    /**
     * Returns a new DVote Gateway web socket client
     * @param gatewayOrParams Either a GatewayInfo instance or a JSON object with the service URI, the supported API's and the public key
     */
    constructor(gatewayOrParams: GatewayInfo | { uri: string, supportedApis: DVoteSupportedApi[], publicKey?: string }) {
        if (gatewayOrParams instanceof GatewayInfo) {
            this.client = axios.create({ baseURL: gatewayOrParams.dvote, method: "post" })
            this._uri = gatewayOrParams.dvote
            this._supportedApis = gatewayOrParams.supportedApis
            this._pubKey = gatewayOrParams.publicKey
        } else {
            const { uri, supportedApis, publicKey } = gatewayOrParams
            if (!uri) throw new Error("Invalid gateway URI")

            this.client = axios.create({ baseURL: uri, method: "post" })
            this._uri = uri
            this._supportedApis = supportedApis
            this._pubKey = publicKey || ""
        }
    }

    /** Checks the gateway status and updates the currently available API's. Same as calling `isUp()` */
    public init(requiredApis: DVoteSupportedApi[] = []): Promise<void> {
        return this.isUp().then(() => {
            if (!this.supportedApis) return
            else if (!requiredApis.length) return
            const missingApi = requiredApis.find(api => !this.supportedApis.includes(api))
            
            if (missingApi) throw new Error("A required API is not available: " + missingApi)
        })
    }

    /** Check whether the client is connected to a Gateway */
    public get isReady(): boolean {
        return this.client && this._uri && this.supportedApis && this.supportedApis.length > 0
    }

    /** Get the current URI of the Gateway */
    public get uri() { return this._uri || null }
    public get supportedApis() { return this._supportedApis }
    public get publicKey() { return this._pubKey }
    public get health() { return this._health }

    /**
     * Send a message to a Vocdoni Gateway and return the response
     * @param requestBody Parameters of the request to send. The timestamp (in seconds) will be added to the object.
     * @param wallet (optional) The wallet to use for signing (default: null)
     * @param params (optional) Optional parameters. Timeout in milliseconds.
     */
    public async sendRequest(requestBody: IDvoteRequestParameters, wallet: Wallet | Signer = null, params: { timeout?: number } = { timeout: 15 * 1000 }): Promise<DVoteGatewayResponseBody> {
        if (!this.isReady) throw new Error("Not initialized")
        else if (typeof requestBody != "object") throw new Error("The payload should be a javascript object")
        else if (typeof wallet != "object") throw new Error("The wallet is required")

        // Check API method availability
        if (!dvoteGatewayApiMethods.includes(requestBody.method)) throw new Error("The method is not valid")
        else if (!this.supportsMethod(requestBody.method)) throw new Error(`The method is not available in the Gateway's supported API's (${requestBody.method})`)

        // Append the current timestamp to the body
        if (typeof requestBody.timestamp == "undefined") {
            requestBody.timestamp = Math.floor(Date.now() / 1000)
        }
        const requestId = Random.getHex().substr(2, 10)

        const request: MessageRequestContent = {
            id: requestId,
            request: requestBody,
            signature: ""
        }
        if (wallet) {
            request.signature = await JsonSignature.sign(requestBody, wallet)
        }

        const response = await promiseWithTimeout(
            this.client.post('', JsonSignature.sort(request)),
            params.timeout
        )

        let msg: DVoteGatewayResponse
        let msgBytes: Uint8Array

        // Detect behavior on Browser/NodeJS
        if (!response.data) throw new Error("Invalid response message")
        else if (typeof response.data == "string") {
            try { msg = JSON.parse(response.data) }
            catch (err) {
                console.error("GW response parsing error:", err)
                throw err
            }
            // this.handleGatewayResponse(response.data)
        }
        else if (response.data instanceof Buffer || response.data instanceof Uint8Array) {
            try { msg = JSON.parse(response.data.toString()) }
            catch (err) {
                console.error("GW response parsing error:", err)
                throw err
            }
            msgBytes = extractUint8ArrayJSONValue(response.data, "response")
            // this.handleGatewayResponse(response.data.toString(), responseBytes)
        }
        else if (typeof Blob != "undefined" && response.data instanceof Blob) {
            const responseData = await readBlobText(response.data)
            try { msg = JSON.parse(responseData) }
            catch (err) {
                console.error("GW response parsing error:", err)
                throw err
            }
            const arrayBufferData = await readBlobArrayBuffer(response.data)
            msgBytes = extractUint8ArrayJSONValue(new Uint8Array(arrayBufferData), "response")

            // readBlobText(response.data)
            //     .then(textData => {
            //         return readBlobArrayBuffer(response.data)
            //             .then((arrayBufferData) => [textData, arrayBufferData])
            //     }).then(([textData, arrayBufferData]: [string, ArrayBuffer]) => {
            //         let responseBytes = extractUint8ArrayJSONValue(new Uint8Array(arrayBufferData), "response")
            //         this.handleGatewayResponse(textData, responseBytes)
            //     })
        }
        else if (typeof response.data == "object") {
            msg = response.data
        }
        else {
            throw new Error("Unsupported response: [" + typeof response.data + "] - " + response.data)
        }

        if (!msg.response) throw new Error("Invalid response message")

        const incomingReqId = msg.response.request || null
        if (incomingReqId !== requestId) {
            throw new Error("The signed request ID does not match the expected one")
        }

        // Check the signature of the response
        if (this.publicKey) {
            // const timestamp = msg.response.timestamp || null
            //
            // const from = Math.floor(Date.now() / 1000) - SIGNATURE_TIMESTAMP_TOLERANCE
            // const until = Math.floor(Date.now() / 1000) + SIGNATURE_TIMESTAMP_TOLERANCE
            // if (typeof timestamp != "number" || timestamp < from || timestamp > until) {
            //     throw new Error("The response does not provide a valid timestamp")
            // }
            if (msgBytes) {
                if (!BytesSignature.isValid(msg.signature, this.publicKey, msgBytes)) {
                    throw new Error("The signature of the response does not match the expected one")
                }
            } else if (!JsonSignature.isValid(msg.signature, this.publicKey, msg.response)) {
                throw new Error("The signature of the response does not match the expected one")
            }
        }

        if (!msg.response.ok) {
            if (msg.response.message) throw new Error(msg.response.message)
            else throw new Error("There was an error while handling the request at the gateway")
        }

        return msg.response
    }

    /**
     * Checks the health of the current Gateway. Resolves the promise when successful and rejects it otherwise.
     */
    public isUp(timeout: number = GATEWAY_SELECTION_TIMEOUT): Promise<void> {
        if (!this.client) return Promise.reject(new Error("The client is not initialized"))
        const uri = parseURL(this._uri)

        if (uri.host.length === 0) {
            return Promise.reject(new Error("Invalid Gateway URL"))
        }
        return promiseWithTimeout(
            this.checkPing()
                .then((isUp) => {
                    if (isUp !== true) throw new Error("No ping reply")
                    return this.updateGatewayStatus(timeout)
                }),
            timeout || 4 * 1000,
            "The DVote Gateway seems to be down")
    }

    /** Retrieves the status of the gateway and updates the internal status */
    public updateGatewayStatus(timeout?: number): Promise<any> {
        return this.getGatewayInfo(timeout)
            .then((result) => {
                if (!result) throw new Error("Could not update")
                else if (!Array.isArray(result.apiList)) throw new Error("apiList is not an array")
                else if (typeof result.health !== "number") throw new Error("invalid health")
                this._health = result.health
                this._supportedApis = result.apiList
            })
    }

    /**
     * Retrieves the status of the given gateway and returns an object indicating the services it provides.
     * If there is no connection open, the method returns null.
     */
    public async getGatewayInfo(timeout?: number): Promise<{ apiList: DVoteSupportedApi[], health: number }> {
        if (!this.isReady) return null

        try {
            const result = await promiseWithTimeout(
                this.sendRequest({ method: "getGatewayInfo" }, null),
                timeout || 1000
            )
            if (!Array.isArray(result.apiList)) throw new Error("apiList is not an array")
            else if (typeof result.health !== "number") throw new Error("invalid gateway reply")

            return { apiList: result.apiList, health: result.health }
        }
        catch (error) {
            if (error && error.message == "Time out") throw error
            console.error("FAILED", error)
            let message = "The status of the gateway could not be retrieved"
            message = (error.message) ? message + ": " + error.message : message
            throw new Error(message)
        }
    }

    /**
     * Checks the ping response of the gateway
     * @returns A boolean representing wheter the gateway responded correctly or not
     */
    public checkPing(): Promise<boolean> {
        if (!this.client) return Promise.reject(new Error("The client is not initialized"))
        const uri = parseURL(this._uri)
        const pingUrl = `${uri.protocol}//${uri.host}/ping`

        return promiseWithTimeout(axios.get(pingUrl), 4 * 1000)
            .then((response?: AxiosResponse<any>) => (
                response != null && response.status === 200 && response.data === "pong"
            ))
    }

    /**
     * Determines whether the current DVote Gateway supports the API set that includes the given method.
     * NOTE: `updateStatus()` must have been called on the GW instnace previously.
     */
    public supportsMethod(method: DVoteGatewayMethod): boolean {
        if (dvoteApis.file.includes(method))
            return this.supportedApis.includes("file")
        else if (dvoteApis.census.includes(method))
            return this.supportedApis.includes("census")
        else if (dvoteApis.vote.includes(method))
            return this.supportedApis.includes("vote")
        else if (dvoteApis.results.includes(method))
            return this.supportedApis.includes("results")
        else if (dvoteApis.info.includes(method)) return true;
        return false;
    }
}
