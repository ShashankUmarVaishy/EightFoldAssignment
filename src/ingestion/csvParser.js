import { parse } from 'csv-parse/sync';
import logger from '../utils/logger.js';

/**
 * Safely parses CSV content into structured objects.
 * Uses the header row as keys.
 * 
 * @param {string} content - Raw CSV string.
 * @param {string} sourceId - Immutable source identifier.
 * @returns {Array<Object>} List of row objects.
 * @throws {Error} If CSV parsing fails, or if columns are inconsistent.
 */
export function parseCSV(content, sourceId) {
  if (content === null || content === undefined || typeof content !== 'string') {
    const error = new Error('Invalid input: content must be a string');
    logger.error('CSV Ingestion Failed - Invalid input type', error, { source_id: sourceId });
    throw error;
  }

  const trimmed = content.trim();
  if (trimmed === '') {
    const error = new Error('Invalid input: content is empty');
    logger.error('CSV Ingestion Failed - Empty content', error, { source_id: sourceId });
    throw error;
  }

  try {
    const records = parse(trimmed, {
      columns: true,               // use the first line as column names
      skip_empty_lines: true,      // skip empty lines
      trim: true,                  // trim whitespace around fields
      relax_column_count: false,   // throw error if column counts are inconsistent
    });
    return records;
  } catch (err) {
    logger.error('CSV Ingestion Failed - Malformed CSV', err, { source_id: sourceId });
    throw new Error(`Malformed CSV structure: ${err.message}`);
  }
}

export default parseCSV;
