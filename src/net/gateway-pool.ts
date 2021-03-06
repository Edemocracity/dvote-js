import { Gateway } from "./gateway"
import { DVoteGatewayResponseBody, IDvoteRequestParameters } from "./gateway-dvote"
// import { dvoteApis, DVoteSupportedApi } from "../models/gateway"
import { GatewayDiscovery, IGatewayDiscoveryParameters } from "./gateway-discovery"
import { Wallet, Signer, providers } from "ethers"
import { IProcessContract, IEnsPublicResolverContract, INamespaceContract, ITokenStorageProofContract } from "./contracts"

const SEQUENTIAL_METHODS = ['addClaimBulk', 'publishCensus'] //generateProof and vote?
const ERROR_SKIP_METHODS = ['getRoot']
const GATEWAY_UPDATE_ERRORS = [
    "Time out",
    "read ECONNRESET",
    "censusId not valid or not found"
]
// const MAX_POOL_REFRESH_COUNT = 10

export type IGatewayPool = InstanceType<typeof GatewayPool>

// GLOBAL

/**
 * This is wrapper class Gateway, pooling many gateways together and allowing for automatic recconection
 */
export class GatewayPool {
    private pool: Gateway[] = []
    private params: IGatewayDiscoveryParameters = null
    private errorCount: number = 0
    public get supportedApis() { return this.activeGateway.supportedApis }

    constructor(newPool: Gateway[], p: IGatewayDiscoveryParameters) {
        this.pool = newPool
        this.params = p
    }

    /** Searches for healthy gateways and initialized them for immediate usage */
    static discover(params: IGatewayDiscoveryParameters): Promise<GatewayPool> {
        return GatewayDiscovery.run(params)
            .then((bestNodes: Gateway[]) => {
                const pool = new GatewayPool(bestNodes, params)

                return pool.init()
                    .then(() => pool)
            })
            .catch(error => {
                throw new Error(error)
            })
    }

    /** Ensures that the current active gateway is available for use */
    public init(): Promise<any> {
        return this.activeGateway.init()
    }

    /** Sets the web3 polling flag to false */
    public disconnect() {
        this.activeGateway.disconnect()
    }

    /** Launches a new discovery process and selects the healthiest gateway pair */
    public refresh(): Promise<void> {
        return GatewayDiscovery.run(this.params)
            .then((bestNodes: Gateway[]) => {
                this.pool = bestNodes
                this.errorCount = 0
            }).catch(error => {
                throw new Error(error)
            })
    }

    /**
     * Skips the currently active gateway and connects using the next one
     */
    public shift(): Promise<void> {
        if (this.errorCount > this.pool.length) {
            return this.refresh()
        }

        this.pool.push(this.pool.shift())
        return Promise.resolve()
    }

    public get activeGateway(): Gateway {
        if (!this.pool || !this.pool.length) throw new Error("The pool has no gateways")
        return this.pool[0]
    }

    public get isReady(): boolean {
        return this.activeGateway.isReady
    }

    // DVOTE

    public get dvoteUri(): string {
        return this.activeGateway.dvoteUri
    }

    public sendRequest(requestBody: IDvoteRequestParameters, wallet: Wallet | Signer = null, params?: { timeout: number }): Promise<DVoteGatewayResponseBody> {
        if (!this.activeGateway.supportsMethod(requestBody.method)) {
            this.errorCount += 1
            return this.shift()
                .then(() => {
                    // Retry with the new one
                    return this.sendRequest(requestBody, wallet, params)
                })   // next gw
        }

        return this.activeGateway.sendRequest(requestBody, wallet, params) // => capture time out exceptions
            .then(response => {
                this.errorCount = 0
                return response
            })
            .catch((err: Error) => {
                if (ERROR_SKIP_METHODS.includes(requestBody.method)) {
                    throw err
                }

                if (SEQUENTIAL_METHODS.includes(requestBody.method))
                    throw new Error("Connection to gateway lost. The process needs to be reinitiated. Reason:" + err.message)

                // Check also for the census does not exist
                const result = GATEWAY_UPDATE_ERRORS.filter(msg => err.message.includes(msg))

                if (result.length) {
                    this.errorCount += 1
                    return this.shift()
                        .then(() => {
                            // Retry with the new one
                            return this.sendRequest(requestBody, wallet, params)
                        })   // next gw
                }
                throw err
            })
    }

    // WEB3

    public get provider(): providers.BaseProvider { return this.activeGateway.provider }
    public get web3Uri(): string { return this.activeGateway.web3Uri }

    public get chainId(): Promise<number> {
        return this.provider.getNetwork().then(network => network.chainId)
    }

    public getEnsPublicResolverInstance(walletOrSigner?: Wallet | Signer, customAddress?: string): Promise<IEnsPublicResolverContract> {
        return this.activeGateway.getEnsPublicResolverInstance(walletOrSigner, customAddress)
    }

    public getProcessesInstance(walletOrSigner?: Wallet | Signer, customAddress?: string): Promise<IProcessContract> {
        return this.activeGateway.getProcessesInstance(walletOrSigner, customAddress)
    }

    public getNamespacesInstance(walletOrSigner?: Wallet | Signer, customAddress?: string): Promise<INamespaceContract> {
        return this.activeGateway.getNamespacesInstance(walletOrSigner, customAddress)
    }

    public getTokenStorageProofInstance(walletOrSigner?: Wallet | Signer, customAddress?: string): Promise<ITokenStorageProofContract> {
        return this.activeGateway.getTokenStorageProofInstance(walletOrSigner, customAddress)
    }
}
