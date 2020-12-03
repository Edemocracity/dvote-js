import { Gateway, IDvoteRequestParameters } from "./gateway"
import { dvoteApis, DVoteSupportedApi, WsGatewayMethod } from "../models/gateway"
import { discoverGateways, IGatewayDiscoveryParameters } from "./gateway-discovery"
import { Wallet, Signer, providers } from "ethers"
import { IProcessContract, IEnsPublicResolverContract, INamespaceContract } from "./contracts"

const SEQUENTIAL_METHODS = ['addClaimBulk', 'publishCensus'] //generateProof and vote?
const ERROR_SKIP_METHODS = ['getRoot']
const GATEWAY_UPDATE_ERRORS = [
    "Request timed out",
    "read ECONNRESET",
    "censusId not valid or not found"
]
const MAX_POOL_REFRESH_COUNT = 10

export type IGatewayPool = InstanceType<typeof GatewayPool>

// GLOBAL

/**
 * This is wrapper class Gateway, pooling many gateways together and allowing for automatic recconection
 */
export class GatewayPool {
    private pool: Gateway[] = []
    private params: IGatewayDiscoveryParameters = null
    private errorCount: number = 0
    private refreshPoolCount: number = 0
    public supportedApis() { return this.activeGateway().getSupportedApis() }

    constructor(newPool: Gateway[], p: IGatewayDiscoveryParameters) {
        this.pool = newPool
        this.params = p
        // set active
        // gw1.subscribe(() => this.shiftGateway())
    }

    // factory
    static discover(params: IGatewayDiscoveryParameters): Promise<GatewayPool> {
        let pool: GatewayPool
        return discoverGateways(params)
            .then((bestNodes: Gateway[]) => {
                pool = new GatewayPool(bestNodes, params)

                return pool.connect()
            }).then(() => {
                return pool
            }).catch(error => {
                throw new Error(error)
            })
    }

    public refresh(): Promise<boolean> {
        this.refreshPoolCount += 1
        if (this.refreshPoolCount > MAX_POOL_REFRESH_COUNT) return Promise.reject(new Error("No gateway currently available"))
        console.log("Refreshing Gateway Pool")
        return discoverGateways(this.params)
            .then((bestNodes: Gateway[]) => {
                this.pool = bestNodes
                return this.connect()
            }).then(() => {
                this.errorCount = 0
                return true
            }).catch(error => {
                throw new Error(error)
            })
    }

    /**
     * Disconnects the currently active gateway and connects using the next one
     */
    public shiftGateway(): Promise<boolean> {
        this.disconnect()
        console.log("Disconected from Gateway: ", this.pool[0].publicKey)

        if (this.errorCount > this.pool.length) {
            return this.refresh()
        }

        this.pool.push(this.pool.shift())
        return this.connect()
            .then(() => {
                console.log("Changed to gateway: ", this.pool[0].publicKey)
                return true
            }).catch(err => {
                this.errorCount += 1
                return this.shiftGateway()
            })  // setTimeout(1s)
    }

    activeGateway(): Gateway {
        if (!this.pool || !this.pool.length) throw new Error("The pool has no gateways")
        return this.pool[0]
    }

    public connect(): Promise<boolean> {
        return this.activeGateway().isConnected()
            .then(connected => {
                if (connected) return true
                return this.activeGateway().connect()
            }).catch(error => {
                return this.shiftGateway()
            })
    }

    public disconnect() {
        this.activeGateway().disconnect()
    }

    public isConnected(): Promise<boolean> {
        return this.activeGateway().isConnected()
    }

    // DVOTE

    public getDVoteUri(): Promise<string> {
        return this.activeGateway().getDVoteUri()
    }

    public sendRequest(requestBody: IDvoteRequestParameters, wallet: Wallet | Signer = null, timeout: number = 50): Promise<any> {
        if (!isMethodSupported(this.supportedApis(), requestBody.method)) {
            this.errorCount += 1
            return this.shiftGateway()
                .then(() => {
                    // Retry with the new one
                    return this.sendRequest(requestBody, wallet, timeout)
                })   // next gw
        }

        return this.activeGateway().sendRequest(requestBody, wallet, timeout) // => capture time out exceptions
            .then(response => {
                this.errorCount = 0
                this.refreshPoolCount = 0
                return response
            })
            .catch((err: Error) => {
                // console.error("requestError", err)

                if (ERROR_SKIP_METHODS.includes(requestBody.method)) {
                    throw err
                }

                if (SEQUENTIAL_METHODS.includes(requestBody.method))
                    throw new Error("Connection to gateway lost. The process needs to be reinitiated. Reason:" + err.message)

                // Check also for the census does not exist
                const result = GATEWAY_UPDATE_ERRORS.filter(msg => err.message.includes(msg))

                if (result.length) {
                    this.errorCount += 1
                    return this.shiftGateway()
                        .then(() => {
                            // Retry with the new one
                            return this.sendRequest(requestBody, wallet, timeout)
                        })   // next gw
                }
                throw err
            })
    }

    // WEB3

    public getProvider(): providers.BaseProvider { return this.activeGateway().getProvider() }

    public getChainId(): Promise<number> {
        return this.getProvider().getNetwork().then(network => network.chainId)
    }

    public getEnsPublicResolverInstance(walletOrSigner?: Wallet | Signer): IEnsPublicResolverContract {
        return this.activeGateway().getEnsPublicResolverInstance(walletOrSigner)
    }

    public getProcessInstance(walletOrSigner?: Wallet | Signer): IProcessContract {
        return this.activeGateway().getProcessInstance(walletOrSigner)
    }

    public getNamespaceInstance(walletOrSigner?: Wallet | Signer): Promise<INamespaceContract> {
        return this.activeGateway().getNamespaceInstance(walletOrSigner)
    }
}

function isMethodSupported(supportedApis: DVoteSupportedApi[], method: WsGatewayMethod): boolean {
    for (let api of supportedApis) {
        if (dvoteApis[api].includes(method)) return true
    }
    return false
}
