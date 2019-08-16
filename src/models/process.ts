// This file provides:
// - Typescript type definitions for ProcessMetadata objects
// - Metadata JSON validation checker
// - A metadata JSON template

import {
    HexString,
    // ContractAddress,
    // PublicKey,
    // PrivateKey,
    // ProcessId,
    MultiLanguage,
    URI
} from "./common"
import * as Joi from "joi-browser"
import { by639_1 } from 'iso-language-codes'

// LOCAL TYPE ALIASES
type ContentUriString = string
type ContentHashedUriString = string
type MessagingUriString = string

///////////////////////////////////////////////////////////////////////////////
// VALIDATION
///////////////////////////////////////////////////////////////////////////////

/**
 * Asserts that the given metadata is valid.
 * Throws an exception if it is not.
 */
export function checkValidProcessMetadata(voteMetadata: ProcessMetadata) {
    if (typeof voteMetadata != "object") throw new Error("The metadata must be a JSON object")

    const result = Joi.validate(voteMetadata, voteMetadataSchema)
    if (!result || result.error) {
        throw new Error("Metadata validation error: " + result.error.toString())
    }
}

// INTERMEDIATE SCHEMAS

// Like { en: Joi.string(), fr: Joi.string, it: Joi.string, ... }
const strLangCodes = Object.keys(by639_1).reduce((prev, cur) => {
    prev[cur] = Joi.string()
    return prev
}, {})

const multiLanguageStringKeys = {
    ...strLangCodes,
    default: Joi.string().optional()
}

// MAIN ENTITY SCHEMA

const processTypes = ["snark-vote", "snark-poll", "snark-petition"]
const questionTypes = ["single-choice"]

const voteMetadataSchema = Joi.object().keys({
    version: Joi.string().regex(/^[0-9]\.[0-9]$/).required(),
    type: Joi.string().valid(...processTypes).required(),
    startBlock: Joi.number().integer().min(0).required(),
    numberOfBlocks: Joi.number().integer().min(0).required(),
    census: Joi.object().keys({
        id: Joi.string().regex(/^0x[a-z0-9]+$/).required(),
        merkleRoot: Joi.string().regex(/^0x[a-z0-9]+$/).required(),
        messagingUris: Joi.array().items(Joi.string().required())
    }),
    details: {
        entityId: Joi.string().regex(/^0x[a-z0-9]+$/).required(),
        encryptionPublicKey: Joi.string().required(),
        title: Joi.object().keys(multiLanguageStringKeys).required(),
        description: Joi.object().keys(multiLanguageStringKeys).required(),
        headerImage: Joi.string().required(),
        questions: Joi.array().items(
            Joi.object().keys({
                type: Joi.string().valid(...questionTypes).required(),
                question: Joi.object().keys(multiLanguageStringKeys).required(),
                description: Joi.object().keys(multiLanguageStringKeys).required(),
                voteOptions: Joi.array().items(
                    Joi.object().keys({
                        title: Joi.object().keys(multiLanguageStringKeys).required(),
                        value: Joi.string().required()
                    })
                ).required()
            })
        ).required()
    }
}).unknown(true) // allow deprecated or unknown fields beyond the required ones

///////////////////////////////////////////////////////////////////////////////
// TYPE DEFINITIONS
///////////////////////////////////////////////////////////////////////////////

type ProtocolVersion = "1.0"
type ProcessType = "snark-vote" | "snark-poll" | "snark-petition"
type QuestionType = "single-choice"

/**
 * JSON metadata. Intended to be stored on IPFS or similar.
 * More info: https://vocdoni.io/docs/#/architecture/components/process?id=process-metadata-json
 */
export interface ProcessMetadata {
    version: ProtocolVersion, // Version of the metadata schema used
    type: ProcessType, // details depends on the type
    startBlock: number, // Block number on the votchain since the process will be open
    numberOfBlocks: number,
    census: {
        id: HexString, // Census ID to use for the vote
        merkleRoot: HexString,
        messagingUris: MessagingUriString[] // Messaging URI of the Census Services to request data from
    },
    details: {
        entityId: HexString,
        encryptionPublicKey: HexString,
        title: MultiLanguage<string>,
        description: MultiLanguage<string>,
        headerImage: ContentUriString,
        questions: {
            type: QuestionType, // Defines how the UI should allow to choose among the votingOptions.
            question: MultiLanguage<string>,
            description: MultiLanguage<string>,
            voteOptions: {
                title: MultiLanguage<string>,
                value: string
            }[]
        }[]
    }
}

///////////////////////////////////////////////////////////////////////////////
// JSON TEMPLATE
///////////////////////////////////////////////////////////////////////////////

export const ProcessMetadataTemplate: ProcessMetadata = {
    version: "1.0",
    type: "snark-vote",
    startBlock: 10000, // Block number on the votchain since the process will be open
    numberOfBlocks: 400,
    census: {
        id: "0x1234...", // Census ID to use for the vote
        merkleRoot: "0x1234...",
        messagingUris: [
            "<messaging uri>",
            "..."
        ] // Messaging URI of the Census Services to request data from
    },
    details: {
        entityId: "0x1234",
        encryptionPublicKey: "12345678",
        title: {
            default: "Universal Basic Income"
        },
        description: {
            default: "## Markdown text goes here\n### Abstract"
        },
        headerImage: "<content uri>",
        questions: [
            {
                type: "single-choice",
                question: {
                    default: "Should universal basic income become a human right?"
                },
                description: {
                    default: "## Markdown text goes here\n### Abstract"
                },
                voteOptions: [
                    {
                        title: {
                            default: "Yes",
                        },
                        value: "1"
                    },
                    {
                        title: {
                            default: "No",
                        },
                        value: "2"
                    }
                ]
            }
        ]
    }
}