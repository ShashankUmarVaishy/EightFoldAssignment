import parsePhoneNumberFromString from 'libphonenumber-js';

/**
 * Normalizes a single phone number into strict E.164 format.
 * Drops the token if it cannot be verified as valid.
 * 
 * @param {string} phone - Raw phone number.
 * @param {string} [defaultCountry='US'] - Default ISO-3166-1 alpha-2 country code.
 * @returns {string|null} E.164 formatted number, or null if invalid.
 */
export function normalizePhone(phone, defaultCountry = 'US') {
  if (phone === null || phone === undefined || typeof phone !== 'string') {
    return null;
  }

  const cleaned = phone.trim();
  if (cleaned === '') return null;

  // Try parsing directly (first as international, if + is present)
  let parsed = parsePhoneNumberFromString(cleaned);

  // Fall back to default country if it failed or is not valid
  if (!parsed || !parsed.isValid()) {
    parsed = parsePhoneNumberFromString(cleaned, defaultCountry);
  }

  if (parsed && parsed.isValid()) {
    return parsed.number; // E.164 format (e.g. +14155552671)
  }

  return null;
}

/**
 * Normalizes, filters out invalid, and deduplicates an array of phone numbers.
 * 
 * @param {Array<string>} phones - List of raw phone numbers.
 * @param {string} [defaultCountry='US'] - Default country code.
 * @returns {Array<string>} List of unique, E.164 formatted phone numbers.
 */
export function normalizePhones(phones, defaultCountry = 'US') {
  if (!Array.isArray(phones)) {
    if (typeof phones === 'string') {
      const parsed = normalizePhone(phones, defaultCountry);
      return parsed ? [parsed] : [];
    }
    return [];
  }

  const validSet = new Set();
  for (const rawPhone of phones) {
    const normalized = normalizePhone(rawPhone, defaultCountry);
    if (normalized) {
      validSet.add(normalized);
    }
  }

  return Array.from(validSet).sort();
}

export default {
  normalizePhone,
  normalizePhones
};
