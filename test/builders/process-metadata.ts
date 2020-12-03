import { ProcessMetadataTemplate, ProcessMetadata } from "../../src/models/process"
import { URI } from "../../src/models/common"
import {
    DEFAULT_PROCESS_MODE,
    DEFAULT_ENVELOPE_TYPE,
    DEFAULT_MERKLE_ROOT,
    DEFAULT_MERKLE_TREE_CONTENT_HASHED_URI,
    DEFAULT_BLOCK_COUNT,
    DEFAULT_START_BLOCK
} from "./process"
import { ProcessMode, ProcessEnvelopeType } from "dvote-solidity"

//BUILDER
export default class ProcessMetadataBuilder {
    private metadata: ProcessMetadata = null
    constructor() {
        this.metadata = JSON.parse(JSON.stringify(ProcessMetadataTemplate))
    }

    get() {
        return this.metadata
    }

    build() {
        this.metadata.mode = DEFAULT_PROCESS_MODE
        this.metadata.envelopeType = DEFAULT_ENVELOPE_TYPE
        this.metadata.blockCount = DEFAULT_BLOCK_COUNT
        this.metadata.startBlock = DEFAULT_START_BLOCK
        this.metadata.census.merkleRoot = DEFAULT_MERKLE_ROOT
        this.metadata.census.merkleTree = DEFAULT_MERKLE_TREE_CONTENT_HASHED_URI
        const details = this.metadata.details
        details.entityId = "0x180dd5765d9f7ecef810b565a2e5bd14a3ccd536c442b3de74867df552855e85"
        details.title = { default: "My Entity" }
        details.description = { default: "Description" }
        details.questions.map(
            (question, index) => {
                question.question = {
                    default: "Question " +
                        String(index)
                }
                question.description = {
                    default: "Description " +
                        String(index)
                }
                question.voteOptions.map(
                    (option, index) => {
                        option.title = { default: "Yes " + String(index) }
                    }
                )
            }
        )
        return this.metadata
    }

    withStreamUrl(url: string) {
        this.metadata.details.streamUrl = url as URI
        return this
    }

    withMode(mode: number) {
        new ProcessMode(mode) // fail is invalid
        this.metadata.mode = mode
        return this
    }

    withEnvelopetype(envelopeType: number) {
        new ProcessEnvelopeType(envelopeType) // fail is invalid
        this.metadata.envelopeType = envelopeType
        return this
    }

    withIntegerVoteValues() {
        this.metadata.details.questions.map(
            (question, questionIndex) => {
                question.voteOptions.map(
                    (voteOption, voteIndex) => {
                        voteOption.value = voteIndex
                    })
            }
        )
        return this
    }

    withStringVoteValues() {
        this.metadata.details.questions.map(
            (question, questionIndex) => {
                question.voteOptions.map(
                    (voteOption, voteIndex) => {
                        voteOption.value = String(voteIndex) as any
                    })
            }
        )
        return this
    }

    withNumberOfQuestions(size: number) {
        const questions = this.metadata.details.questions
        const questionTemplate = JSON.stringify(questions[0])
        for (let i = 0; i < size - 1; i++) {
            questions.push(JSON.parse(questionTemplate))
        }
        return this
    }

    withNumberOfOptions(size: number) {
        // to be used without build
        this.build()
        let options = this.metadata.details.questions[0].voteOptions
        const optionTemplate = JSON.stringify(options[0])
        for (let i = 2; i < size; i++) {
            const option = JSON.parse(optionTemplate)
            option.title = { default: "Yes " + String(i) }
            option.value = i
            options.push(option)
        }
        return this.metadata
    }
}
