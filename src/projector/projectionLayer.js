import _ from 'lodash';
import { z } from 'zod';
import logger from '../utils/logger.js';

/**
 * Recursively compiles a structural helper object into a Zod schema object.
 * 
 * @param {Object|z.ZodType} obj - Struct node.
 * @returns {z.ZodType} Compiled Zod schema.
 */
function compileStructure(obj, onMissing) {
  if (obj instanceof z.ZodType) {
    return obj;
  }
  
  const shape = {};
  for (const key of Object.keys(obj)) {
    shape[key] = compileStructure(obj[key], onMissing);
  }
  
  let schema = z.object(shape);
  if (onMissing === 'omit') {
    schema = schema.optional();
  } else if (onMissing === 'null') {
    schema = schema.nullable().optional();
  }
  return schema;
}

/**
 * Builds a dynamic Zod schema based on the configuration fields structure and on_missing directive.
 * 
 * @param {Array<Object>} fields - Configuration fields array.
 * @param {'null'|'omit'|'error'} onMissing - Missing value behavior.
 * @returns {z.ZodObject} Compiled Zod validation schema.
 */
export function buildZodSchema(fields, onMissing) {
  const nestedStructure = {};

  for (const field of fields) {
    let baseSchema;
    const fieldType = field.type || 'any';

    switch (fieldType) {
      case 'string':
        baseSchema = z.string();
        break;
      case 'number':
        baseSchema = z.number();
        break;
      case 'boolean':
        baseSchema = z.boolean();
        break;
      case 'array':
        baseSchema = z.array(z.any());
        break;
      case 'object':
        baseSchema = z.record(z.any());
        break;
      default:
        baseSchema = z.any();
    }

    // Configure schema modifiers based on missing-value policies
    if (onMissing === 'null') {
      baseSchema = baseSchema.nullable();
    } else if (onMissing === 'omit') {
      baseSchema = baseSchema.nullable().optional();
    }

    // Map target path (handling dot notation recursively)
    const pathParts = field.target_path.split('.');
    let current = nestedStructure;
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      if (i === pathParts.length - 1) {
        current[part] = baseSchema;
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
  }

  return compileStructure(nestedStructure, onMissing);
}

/**
 * Projects and reshapes a single canonical record based on a runtime configuration.
 * 
 * @param {Object} record - The internal canonical candidate profile.
 * @param {Object} config - The runtime output configuration.
 * @returns {Object} rescaled, mapped, and schema-verified object.
 * @throws {Error} If fields are missing (on_missing = error) or if schema validation fails.
 */
export function projectRecord(record, config) {
  if (!record || typeof record !== 'object') {
    throw new Error('Invalid input: record must be an object');
  }
  if (!config || !Array.isArray(config.fields)) {
    throw new Error('Invalid configuration: fields array is required');
  }

  const onMissing = config.on_missing || 'omit';
  const output = {};

  for (const field of config.fields) {
    const { source_path, target_path } = field;
    if (!source_path || !target_path) {
      throw new Error('Configuration error: each field mapping must specify source_path and target_path');
    }

    const value = _.get(record, source_path);

    if (value === undefined) {
      if (onMissing === 'error') {
        const err = new Error(`Missing required field: source path '${source_path}' is not present in candidate record`);
        logger.error('Projection Failed - Missing required path', err, { source_path, candidate_id: record.candidate_id });
        throw err;
      } else if (onMissing === 'null') {
        _.set(output, target_path, null);
      }
      // If 'omit', key remains unset in output.
    } else {
      _.set(output, target_path, value);
    }
  }

  // Runtime Zod validation against configuration constraints
  try {
    const schema = buildZodSchema(config.fields, onMissing);
    return schema.parse(output);
  } catch (err) {
    const validationErr = new Error(`Schema compliance failure: ${err.message}`);
    logger.error('Projection Failed - Zod verification error', validationErr, { candidate_id: record.candidate_id });
    throw validationErr;
  }
}

/**
 * Projects a collection of candidate records.
 * Returns the final results as a stringified JSON array.
 * 
 * @param {Array<Object>} records - Canonical candidate records.
 * @param {Object} config - Output schema configuration.
 * @returns {string} Stringified JSON list of projected candidates.
 */
export function projectRecords(records, config) {
  if (!Array.isArray(records)) {
    throw new Error('Invalid input: records must be an array');
  }
  const projected = records.map(r => projectRecord(r, config));
  return JSON.stringify(projected, null, 2);
}

export default {
  buildZodSchema,
  projectRecord,
  projectRecords
};
