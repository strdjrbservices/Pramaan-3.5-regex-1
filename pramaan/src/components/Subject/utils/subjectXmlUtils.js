/**
 * XML and form type detection utilities for Subject.
 */

export const detectFormTypeFromXmlString = (xmlString) => {
  if (!xmlString) return null;
  try {
    // 0. Check UAD 3.6 / Appraisal Version #1
    if (
      /MISMOReferenceModelIdentifier\s*=\s*["']3\.6/i.test(xmlString) ||
      /<AboutVersionIdentifier>\s*1\s*<\/AboutVersionIdentifier>/i.test(xmlString) ||
      /URAR\s+Delivery\s+Specification/i.test(xmlString) ||
      /Appraisal\s+Version\s+#?1/i.test(xmlString) ||
      (/<DocumentType>AppraisalReport<\/DocumentType>/i.test(xmlString) && /FNM_FRE/i.test(xmlString))
    ) {
      return 'Appraisal Version #1';
    }

    const reportMatch = xmlString.match(/<REPORT\b([^>]*)/i);
    const reportAttrs = reportMatch ? reportMatch[1] : '';

    const formNameRegex = /<FORM\b[^>]*\bAppraisalReportContentName="([^"]+)"/gi;
    const formMatches = [];
    let match;
    while ((match = formNameRegex.exec(xmlString)) !== null) {
      formMatches.push(match[1]);
    }

    const formIdRegex = /<FORM\b[^>]*\bAppraisalReportContentIdentifier="([^"]+)"/gi;
    const formIdentifiers = [];
    while ((match = formIdRegex.exec(xmlString)) !== null) {
      formIdentifiers.push(match[1]);
    }

    const combined = (reportAttrs + ' ' + formMatches.join(' ') + ' ' + formIdentifiers.join(' ')).toUpperCase();
    const hasRentTag = /<(?:RESIDENTIAL_RENT_SCHEDULE|SINGLE_FAMILY_RENT_SCHEDULE)\b/i.test(xmlString);
    const has1007 = [...formMatches, ...formIdentifiers].some(f =>
      /\b(?:1007|FNM\s*1007|FRE\s*1000|SRX)\b|SINGLE\s*FAMILY\s*(?:COMPARABLE\s*)?RENT/i.test(f)
    ) || (hasRentTag && !combined.includes('1025') && !combined.includes('SMALL RESIDENTIAL'));

    if (combined.includes('1025') || combined.includes('SMALL RESIDENTIAL') || combined.includes('2-4 UNIT') || combined.includes('FRE72')) {
      return has1007 ? '1025 + 1007' : '1025';
    }
    if (combined.includes('1073') || combined.includes('CONDOMINIUM') || combined.includes('FRE465')) {
      return has1007 ? '1073 + 1007' : '1073';
    }
    if (combined.includes('1004C') || combined.includes('MANUFACTURED')) {
      return '1004C';
    }
    if (combined.includes('1004D')) {
      return '1004D';
    }
    if (combined.includes('2055')) {
      return '2055';
    }
    if (combined.includes('1075')) {
      return '1075';
    }
    if (combined.includes('2090')) {
      return '2090';
    }
    if (combined.includes('2095')) {
      return '2095';
    }
    if (combined.includes('203K')) {
      return '203k-FHA';
    }
    if (combined.includes('1004') || combined.includes('URAR') || combined.includes('FRE70')) {
      return has1007 ? '1004 + 1007' : '1004';
    }
    if (combined.includes('ERC') || combined.includes('ECR')) {
      return 'ERC';
    }
    if (combined.includes('1007') || combined.includes('RENT SCHEDULE')) {
      return '1007';
    }
    if (combined.includes('216')) {
      return '216';
    }
    if (combined.includes('1004MC') || combined.includes('MARKET CONDITIONS ADDENDUM')) {
      return '1004MC';
    }
    return '1004';
  } catch (e) {
    console.error('Error detecting XML form type:', e);
    return null;
  }
};

export const normalizeExtractedFormType = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  const upper = s.toUpperCase();
  if ((upper.includes('1004') && upper.includes('1007')) || upper === '1004 + 1007') return '1004 + 1007';
  if ((upper.includes('1025') && upper.includes('1007')) || upper === '1025 + 1007') return '1025 + 1007';
  if ((upper.includes('1073') && upper.includes('1007')) || upper === '1073 + 1007') return '1073 + 1007';
  if (upper.includes('1025') || upper.includes('SMALL RESIDENTIAL')) return '1025';
  if (upper.includes('1073') || upper.includes('465') || upper.includes('CONDOMINIUM')) return '1073';
  if (upper.includes('1004C') || upper.includes('MANUFACTURED')) return '1004C';
  if (upper.includes('1004D')) return '1004D';
  if (upper.includes('2055')) return '2055';
  if (upper.includes('1075')) return '1075';
  if (upper.includes('2090')) return '2090';
  if (upper.includes('2095')) return '2095';
  if (upper.includes('203K')) return '203k-FHA';
  if (upper.includes('1007')) return '1007';
  if (upper.includes('216')) return '216';
  if (upper.includes('1004MC')) return '1004MC';
  if (upper.includes('1004') || upper.includes('URAR') || upper.includes('FRE70')) return '1004';
  if (upper.includes('ERC') || upper.includes('ECR')) return 'ERC';
  if (upper.includes('VERSION 1') || upper.includes('VERSION #1') || upper.includes('APPRAISAL VERSION') || upper.includes('UAD 3.6') || upper.includes('3.6')) return 'Appraisal Version #1';
  return s;
};

