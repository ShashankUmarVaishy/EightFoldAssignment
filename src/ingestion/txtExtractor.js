import logger from '../utils/logger.js';

/**
 * Safely extracts text from a text buffer or string.
 * Falls back to an empty string on parsing errors (fail-soft).
 * 
 * @param {Buffer|string} content - Raw txt file content or string.
 * @param {string} sourceId - Immutable source identifier.
 * @returns {string} Extracted text, or empty string on failure.
 */
export function extractTXT(content, sourceId) {
  if (content === null || content === undefined) {
    const error = new Error('Invalid input: content is null or undefined');
    logger.error('TXT Extraction Failed - Empty content reference', error, { source_id: sourceId });
    return '';
  }

  try {
    let text = '';
    if (Buffer.isBuffer(content)) {
      text = content.toString('utf8');
    } else if (typeof content === 'string') {
      text = content;
    } else {
      throw new Error('Unsupported input type: must be Buffer or string');
    }
    return text.trim();
  } catch (err) {
    logger.error('TXT Extraction Failed - Decoding error', err, { source_id: sourceId });
    // Fail-soft fallback
    return '';
  }
}

export default extractTXT;
