import crypto from 'crypto';

// DNS Namespace UUID (RFC 4122)
const NAMESPACE_UUID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Generates a deterministic RFC 4122 version 5 UUID from a namespace and a name.
 * Uses SHA-1 hashing.
 * 
 * @param {string} name - The name string to hash.
 * @param {string} [namespace=NAMESPACE_UUID] - The namespace UUID string.
 * @returns {string} Fully formatted UUIDv5 (36 characters).
 */
export function uuidv5(name, namespace = NAMESPACE_UUID) {
  const cleanNamespace = namespace.replace(/-/g, '');
  if (cleanNamespace.length !== 32) {
    throw new Error('Invalid namespace UUID: must contain 32 hex digits');
  }

  const nsBytes = Buffer.from(cleanNamespace, 'hex');
  const nameBytes = Buffer.from(name, 'utf8');

  // Compute SHA-1 hash of namespace + name
  const hash = crypto.createHash('sha1')
    .update(Buffer.concat([nsBytes, nameBytes]))
    .digest();

  // Set RFC 4122 fields:
  // 1. Set the four most significant bits of the time_hi_and_version field to 5 (0101)
  hash[6] = (hash[6] & 0x0f) | 0x50;

  // 2. Set the two most significant bits of the clock_seq_hi_and_reserved to 1 and 0 (variant 1)
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = hash.toString('hex');
  
  // Format as 8-4-4-4-12
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32)
  ].join('-');
}

export default uuidv5;
