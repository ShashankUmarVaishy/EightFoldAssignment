const MONTH_MAP = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', september: '09', sept: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12'
};

/**
 * Standardizes a date string to strict YYYY-MM format.
 * Correctly handles present markers ("Present", "Current") and avoids timezone shift bugs.
 * 
 * @param {string} dateString - Raw date string.
 * @returns {string|null} Normalized date ("YYYY-MM" or "Present"), or null if invalid.
 */
export function normalizeDate(dateString) {
  if (dateString === null || dateString === undefined || typeof dateString !== 'string') {
    return null;
  }

  const cleaned = dateString.trim();
  if (cleaned === '') return null;

  const lower = cleaned.toLowerCase();
  if (['present', 'current', 'now', 'active'].includes(lower)) {
    return 'Present';
  }

  // 1. Check YYYY-MM / YYYY/MM / YYYY.MM
  const yyyyMmMatch = cleaned.match(/^(\d{4})[-/\.](\d{1,2})$/);
  if (yyyyMmMatch) {
    const month = yyyyMmMatch[2].padStart(2, '0');
    // Ensure month is valid (01-12)
    const mNum = parseInt(month, 10);
    if (mNum >= 1 && mNum <= 12) {
      return `${yyyyMmMatch[1]}-${month}`;
    }
  }

  // 2. Check MM-YYYY / MM/YYYY / MM.YYYY
  const mmYyyyMatch = cleaned.match(/^(\d{1,2})[-/\.](\d{4})$/);
  if (mmYyyyMatch) {
    const month = mmYyyyMatch[1].padStart(2, '0');
    const mNum = parseInt(month, 10);
    if (mNum >= 1 && mNum <= 12) {
      return `${mmYyyyMatch[2]}-${month}`;
    }
  }

  // 3. Check Month Name and Year (e.g. "May 2020" or "2020 May")
  const monthWordMatch = cleaned.match(/([a-zA-Z]{3,10})[-,\s]+(\d{4})/);
  if (monthWordMatch) {
    const mKey = monthWordMatch[1].toLowerCase().substring(0, 3);
    const m = MONTH_MAP[mKey];
    if (m) {
      return `${monthWordMatch[2]}-${m}`;
    }
  }

  const reverseMonthWordMatch = cleaned.match(/(\d{4})[-,\s]+([a-zA-Z]{3,10})/);
  if (reverseMonthWordMatch) {
    const mKey = reverseMonthWordMatch[2].toLowerCase().substring(0, 3);
    const m = MONTH_MAP[mKey];
    if (m) {
      return `${reverseMonthWordMatch[1]}-${m}`;
    }
  }

  // 4. Check single YYYY
  const yyyyMatch = cleaned.match(/^(\d{4})$/);
  if (yyyyMatch) {
    return `${yyyyMatch[1]}-01`;
  }

  // 5. Native parse fallback (interpreting via UTC to prevent timezone shifts)
  const timestamp = Date.parse(cleaned);
  if (!isNaN(timestamp)) {
    const d = new Date(timestamp);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  return null;
}

export default normalizeDate;
