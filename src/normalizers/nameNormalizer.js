/**
 * Normalizes a candidate's full name.
 * Strips non-alphabetic noise characters (preserving letters, spaces, and hyphens),
 * collapses multiple spaces, and formats words to Title Case.
 * 
 * @param {string} name - Raw candidate name.
 * @returns {string} Normalized name.
 */
export function normalizeName(name) {
  if (name === null || name === undefined || typeof name !== 'string') {
    return '';
  }

  // Strip non-alphabetic noise characters (preserving letters across languages, spaces, and hyphens)
  const cleaned = name.replace(/[^\p{L}\s-]/gu, '');

  // Collapse whitespace, title-case words
  const words = cleaned.trim().split(/\s+/);
  const titleCased = words
    .map(word => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(' ');

  return titleCased;
}

export default normalizeName;
