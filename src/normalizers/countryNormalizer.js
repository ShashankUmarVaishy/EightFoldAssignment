import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json' with { type: 'json' };

// Register English locale
countries.registerLocale(enLocale);

/**
 * Standardizes country input to strict ISO-3166 alpha-2 format (e.g. US, GB, IN).
 * Supports alpha-3 code conversions and fallback parsing for regional address strings.
 * 
 * @param {string} locationString - Raw location/country string.
 * @returns {string|null} ISO alpha-2 country code, or null if unknown.
 */
export function normalizeCountry(locationString) {
  if (locationString === null || locationString === undefined || typeof locationString !== 'string') {
    return null;
  }

  const cleaned = locationString.trim();
  if (cleaned === '') return null;

  // 1. Direct check: Is it already a valid ISO alpha-2?
  const upper = cleaned.toUpperCase();
  if (upper.length === 2 && countries.isValid(upper)) {
    return upper;
  }

  // 2. Check: Is it a valid ISO alpha-3?
  if (upper.length === 3 && countries.isValid(upper)) {
    const converted = countries.alpha3ToAlpha2(upper);
    if (converted) return converted;
  }

  // 3. Exact English name lookup
  const exactCode = countries.getAlpha2Code(cleaned, 'en');
  if (exactCode) return exactCode;

  // 4. Token-based regional lookup:
  // If the location string is composite (e.g., "San Francisco, CA, United States"),
  // split by comma, reverse tokens, and try matching each token.
  if (cleaned.includes(',')) {
    const tokens = cleaned.split(',').map(t => t.trim()).reverse();
    for (const token of tokens) {
      if (token === '') continue;
      
      const tokenUpper = token.toUpperCase();
      if (tokenUpper.length === 2 && countries.isValid(tokenUpper)) {
        return tokenUpper;
      }
      if (tokenUpper.length === 3 && countries.isValid(tokenUpper)) {
        const converted = countries.alpha3ToAlpha2(tokenUpper);
        if (converted) return converted;
      }
      
      const tokenCode = countries.getAlpha2Code(token, 'en');
      if (tokenCode) return tokenCode;
    }
  }

  // Common manual overrides for countries with abbreviation mismatches
  const lowercase = cleaned.toLowerCase();
  if (lowercase === 'usa') return 'US';
  if (lowercase === 'uk' || lowercase === 'united kingdom') return 'GB';

  return null;
}

export default normalizeCountry;
