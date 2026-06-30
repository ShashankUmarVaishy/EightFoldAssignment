import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { parseJSON } from './jsonParser.js';
import { parseCSV } from './csvParser.js';
import { extractPDF } from './pdfExtractor.js';
import { extractTXT } from './txtExtractor.js';

/**
 * Generates an immutable source ID based on SHA-256 of the content and file name/path.
 * 
 * @param {Buffer|string} content - Raw content of the file.
 * @param {string} [filePath] - Optional path to incorporate into the hash.
 * @returns {string} SHA-256 hash identifier.
 */
export function generateSourceId(content, filePath = '') {
  const hash = crypto.createHash('sha256');
  if (Buffer.isBuffer(content)) {
    hash.update(content);
  } else if (typeof content === 'string') {
    hash.update(content, 'utf8');
  } else {
    // Fallback for objects/arrays
    hash.update(JSON.stringify(content), 'utf8');
  }
  
  if (filePath) {
    const base = path.basename(filePath);
    hash.update(base, 'utf8');
  }
  
  return `sha256-${hash.digest('hex')}`;
}

/**
 * Detects the ingestion type based on file path extension.
 * 
 * @param {string} filePath - Absolute or relative path to the file.
 * @returns {'json'|'csv'|'pdf'|'txt'} Detected format.
 * @throws {Error} If extension is unsupported.
 */
export function detectSourceType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.json': return 'json';
    case '.csv': return 'csv';
    case '.pdf': return 'pdf';
    case '.txt': return 'txt';
    default:
      throw new Error(`Unsupported file extension: ${ext}`);
  }
}

/**
 * Ingests content from memory.
 * 
 * @param {Buffer|string} content - Raw file contents.
 * @param {'json'|'csv'|'pdf'|'txt'} sourceType - Explicitly specified source type.
 * @param {string} [filePath] - Optional file path context.
 * @returns {Promise<Object>} Standardized ingestion envelope.
 */
export async function ingestContent(content, sourceType, filePath = '') {
  const sourceId = generateSourceId(content, filePath);
  const timestamp = new Date().toISOString();
  
  let rawContent;
  
  try {
    const stringContent = Buffer.isBuffer(content) ? content.toString('utf8') : content;
    
    switch (sourceType) {
      case 'json':
        rawContent = parseJSON(stringContent, sourceId);
        break;
      case 'csv':
        rawContent = parseCSV(stringContent, sourceId);
        break;
      case 'pdf':
        // PDF extractor takes a raw Buffer
        const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
        rawContent = await extractPDF(buffer, sourceId);
        break;
      case 'txt':
        rawContent = extractTXT(content, sourceId);
        break;
      default:
        throw new Error(`Unknown source type: ${sourceType}`);
    }
  } catch (err) {
    logger.error(`Ingestion processing failed for ${sourceType}`, err, { source_id: sourceId, file_path: filePath });
    throw err;
  }
  
  return {
    source_id: sourceId,
    timestamp,
    source_type: sourceType,
    file_path: filePath || null,
    raw_content: rawContent
  };
}

/**
 * Ingests a file from the filesystem.
 * Reads the file, hashes the content, routes to the appropriate parser, and wraps in an envelope.
 * 
 * @param {string} filePath - Absolute path to the file.
 * @returns {Promise<Object>} Standardized ingestion envelope.
 */
export async function ingestFile(filePath) {
  let fileBuffer;
  try {
    fileBuffer = await fs.readFile(filePath);
  } catch (err) {
    logger.error(`Failed to read file from path: ${filePath}`, err);
    throw new Error(`FileSystem read failure: ${err.message}`);
  }
  
  let sourceType;
  try {
    sourceType = detectSourceType(filePath);
  } catch (err) {
    const mockSourceId = generateSourceId(fileBuffer, filePath);
    logger.error(`Detection failed for file: ${filePath}`, err, { source_id: mockSourceId });
    throw err;
  }
  
  return ingestContent(fileBuffer, sourceType, filePath);
}

export default {
  ingestFile,
  ingestContent,
  generateSourceId,
  detectSourceType
};
