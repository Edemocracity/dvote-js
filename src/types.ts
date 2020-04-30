// Allow consumers to type their code

// DATA TYPES

export * from "./models/common"
export { EntityMetadata } from "./models/entity"
export { ProcessMetadata, ProcessResults, ProcessType, ProcessResultItem, VochainProcessState } from "./models/voting-process"
export {
    DVoteSupportedApi,
    FileApiMethod,
    VoteApiMethod,
    CensusApiMethod,
    WsGatewayMethod,
    GatewayBootNodes
} from "./models/gateway"
export {
    JsonFeed,
    JsonFeedPost
} from "./models/json-feed"

// CLASS INTERFACES

export {
    IDvoteRequestParameters,
    IDVoteGateway,
    IWeb3Gateway,
    IGateway
} from "./net/gateway"
export {
    IEntityResolverContract,
    IVotingProcessContract
} from "./net/contracts"

export {
    GatewayDiscoveryParameters
} from "./net/gateway-discovery"

export {
    IGatewayPool
} from "./net/gateway-pool"