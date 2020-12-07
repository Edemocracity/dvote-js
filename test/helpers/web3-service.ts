
import { Wallet, providers } from "ethers"
import { Web3Gateway } from "../../src/net/gateway"
import * as ganache from "ganache-core"

// TYPES

export type TestAccount = {
    privateKey: string,
    address: string,
    provider: providers.BaseProvider,
    wallet: Wallet
}

const defaultPort = 8600
const defaultMnemonic = "myth like bonus scare over problem client lizard pioneer submit female collect"

const wallets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(idx => Wallet.fromMnemonic(defaultMnemonic, `m/44'/60'/0'/0/${idx}`))

export function getWallets() { return wallets }

/**
 * Starts an in-memory disposable Ethereum blockchain and funds 10 accounts with test ether.
 */
export class DevWeb3Service {
    port: number
    rpcServer: any
    accounts: TestAccount[]
    provider: providers.Web3Provider

    constructor(params: { port?: number, mnemonic?: string } = {}) {
        this.port = params.port || defaultPort
        this.accounts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(idx => {
            const wallet = Wallet.fromMnemonic(params.mnemonic || defaultMnemonic, `m/44'/60'/0'/0/${idx}`).connect(this.provider)
            return {
                privateKey: wallet.privateKey,
                address: wallet.address,
                provider: wallet.provider as providers.BaseProvider,
                wallet
            }
        })
        this.provider = new Web3Gateway(this.uri).provider as providers.Web3Provider
    }

    get uri() { return `http://localhost:${this.port}` }

    /** Returns a gateway client that will skip the network checks and will use the given contract addresses as the official ones */
    async getClient(entityResolverAddress: string = "", namespaceAddress: string = "", processAddress: string = ""): Promise<Web3Gateway> {
        const gw = new Web3Gateway(this.uri)

        // Bypass health checks
        gw.isUp = () => Promise.resolve()
        gw.isSyncing = () => Promise.resolve(false)

        // Bypass contract address resolution
        gw.fetchEntityResolverContractAddress = () => Promise.resolve(entityResolverAddress)
        gw.getNamespaceContractAddress = () => Promise.resolve(namespaceAddress)
        gw.fetchProcessContractAddress = () => Promise.resolve(processAddress)
        gw.entityResolverContractAddress = entityResolverAddress
        gw.namespaceContractAddress = namespaceAddress
        gw.processContractAddress = processAddress

        return gw
    }

    start(): Promise<any> {
        this.stop()

        this.rpcServer = (ganache as any).server({ time: new Date(), mnemonic: defaultMnemonic })

        return new Promise((resolve, reject) => this.rpcServer.listen(this.port, (err, info) => {
            if (err) return reject(err)
            resolve(info)
        }))
    }

    stop(): void {
        if (this.rpcServer) this.rpcServer.close()
        this.rpcServer = null
    }

    // UTILS

    /** In development, increments the timestamp by N seconds and returns the new timestamp */
    incrementTimestamp(seconds = 10): Promise<number> {
        return this.provider.send('evm_increaseTime', [seconds])
            .then(() => this.provider.send("evm_mine", []))
            .then(() => this.provider.getBlockNumber())
            .then(blockNumber => this.provider.getBlock(blockNumber))
            .then(block => block.timestamp)
    }

    /** In development, forces the creation of a new block right away */
    mineBlock(): Promise<any> {
        return this.provider.send("evm_mine", [])
    }
}
