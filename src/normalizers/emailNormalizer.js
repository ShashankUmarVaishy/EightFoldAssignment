/**
 * Standard email format regex check.
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Normalizes a single email address.
 * 
 * @param {string} email - Raw email.
 * @returns {string|null} Lower-cased, trimmed email, or null if invalid.
 */
export function normalizeEmail(email) {
  if (email === null || email === undefined || typeof email !== 'string') {
    return null;
  }
  const cleaned = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(cleaned)) {
    return null;
  }
  return cleaned;
}

/**
 * Normalizes, deduplicates, and sorts an array of emails alphabetically.
 * 
 * @param {Array<string>} emails - List of raw emails.
 * @returns {Array<string>} Validated, unique, sorted list of normalized emails.
 */
export function normalizeEmails(emails) {
  if (!Array.isArray(emails)) {
    if (typeof emails === 'string') {
      const parsed = normalizeEmail(emails);
      return parsed ? [parsed] : [];
    }
    return [];
  }

  const validSet = new Set();
  for (const rawEmail of emails) {
    const normalized = normalizeEmail(rawEmail);
    if (normalized) {
      validSet.add(normalized);
    }
  }

  return Array.from(validSet).sort();
}

export default {
  normalizeEmail,
  normalizeEmails
};
