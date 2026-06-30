import logger from '../utils/logger.js';

/**
 * Safely parses ATS JSON content.
 * 
 * @param {string} content - Raw JSON string.
 * @param {string} sourceId - Immutable source identifier for error tracking.
 * @returns {Object|Array} Parsed JSON data.
 * @throws {Error} If parsing fails or input is malformed.
 */
export function parseJSON(content, sourceId) {
  if (content === null || content === undefined || typeof content !== 'string') {
    const error = new Error('Invalid input: content must be a string');
    logger.error('ATS JSON Ingestion Failed - Invalid input type', error, { source_id: sourceId });
    throw error;
  }

  const trimmed = content.trim();
  if (trimmed === '') {
    const error = new Error('Invalid input: content is empty');
    logger.error('ATS JSON Ingestion Failed - Empty content', error, { source_id: sourceId });
    throw error;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return parsed;
  } catch (err) {
    logger.error('ATS JSON Ingestion Failed - Malformed JSON', err, { source_id: sourceId });
    throw new Error(`Malformed JSON structure: ${err.message}`);
  }
}

export default parseJSON;
