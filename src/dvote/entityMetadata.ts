import DvoteContracts = require("dvote-smart-contracts")
import EntityResolver from "./entityResolver"
import Utils from "./utils"

interface IEntityReference {
    entityId: string
    resolverAdress: string
}

export default class EntityMetadata {

    private entityId: string
    private resolverAddress: string
    private entityResolver: EntityResolver

    constructor(web3Provider: any, entityReference: IEntityReference) {

        this.entityId = entityReference.entityId
        this.resolverAddress = entityReference.resolverAdress

        this.entityResolver = new EntityResolver(
            web3Provider,
            this.resolverAddress,
            DvoteContracts.EntityResolver.abi)
    }

}
