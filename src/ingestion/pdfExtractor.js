import pdf from 'pdf-parse';
import logger from '../utils/logger.js';

/**
 * Safely extracts the text layer from a PDF buffer.
 * If the PDF is corrupt or unparseable, logs the event and returns an empty string (fail-soft).
 * 
 * @param {Buffer} buffer - Raw PDF file buffer.
 * @param {string} sourceId - Immutable source identifier.
 * @returns {Promise<string>} Extracted text, or empty string on failure.
 */
export async function extractPDF(buffer, sourceId) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    const error = new Error('Invalid input: must provide a Buffer');
    logger.error('PDF Extraction Failed - Invalid input type', error, { source_id: sourceId });
    return '';
  }

  try {
    const data = await pdf(buffer);
    const text = data.text || '';
    return text.trim();
  } catch (err) {
    logger.error('PDF Extraction Failed - Corrupted or unparseable PDF stream', err, { source_id: sourceId });
    // Fail-soft: return empty string so it doesn't crash the pipeline
    return '';
  }
}

export default extractPDF;
