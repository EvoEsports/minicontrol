/**
 * Plugin manifest JSON schema and TypeScript types
 *
 * This module exports a JSON Schema for validating plugin `manifest.json` files
 * and TypeScript runtime types + a small validator helper using AJV.
 */
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

/** JSON Schema for the plugin manifest.json */
export const ManifestSchema = {
    $id: 'https://example.com/minicontrol/plugin-manifest.json',
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'minicontrol plugin manifest',
    type: 'object',
    required: ['id', 'name', 'version', 'requiresMinicontrolVersion', 'date'],
    additionalProperties: false,
    properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        authors: { type: 'string' },
        // Accept either simple date (YYYY-MM-DD) or full date-time (RFC3339) formats
        date: {
            oneOf: [
                { type: 'string', format: 'date' },
                { type: 'string', format: 'date-time' }
            ]
        },
        // Optional field to indicate the game(s) the plugin supports. Null means supports any game.
        requiresGame: { type: ['string', 'null'], enum: ['Trackmania', 'Maniplanet', 'TmForever', null] },
        version: { type: 'string', minLength: 1 },
        requiresMinicontrolVersion: { type: 'string', minLength: 1 },
        depends: {
            type: 'array',
            items: {
                type: 'object',
                required: ['id', 'range'],
                additionalProperties: false,
                properties: {
                    id: { type: 'string', minLength: 1 },
                    range: { type: 'string', minLength: 1 },
                    optional: { type: 'boolean' }
                }
            },
            uniqueItems: true
        }
    }
} as const;

/**
 * TypeScript interface for a dependency entry in the manifest
 */
export interface DependencyEntry {
    /** plugin id */
    id: string;
    /** semver range, e.g. ^1.0.0 */
    range: string;
    /** optional dependency flag */
    optional?: boolean;
}

/**
 * TypeScript interface describing a plugin manifest
 */
export interface PluginManifest {
    id: string;
    name: string;
    description?: string;
    authors?: string;
    date: string; // ISO date string
    version: string; // semver
    requiresMinicontrolVersion: string; // semver range
    /** optional: which product or engine versions the plugin supports; null indicates no specific requirement */
    requiresGame?: 'Trackmania' | 'Maniplanet' | 'TmForever' | null;
    depends?: DependencyEntry[];
}

const ajv = new Ajv({ allErrors: true });
// add common format validators (date, date-time etc.)
addFormats(ajv);
let validator: ValidateFunction | null = null;

/**
 * validateManifest - runtime validator for objects that should match PluginManifest
 *
 * @param manifest unknown JSON-like object
 * @returns manifest is PluginManifest
 */
export function validateManifest(manifest: unknown): manifest is PluginManifest {
    if (!validator) {
        validator = ajv.compile(ManifestSchema as any);
    }
    return Boolean(validator(manifest));
}

export default {
    ManifestSchema,
    validateManifest,
};
