/**
 * ARV & As-Is Validation Rules for Form 1004 Subject-To ARV w/ As-Is.
 */

export const isArvAsIsActive = (allData, selectedFormType) => {
  const fType = String(
    selectedFormType ||
    allData?.formType ||
    allData?.selectedFormType ||
    allData?.['Form Type'] ||
    allData?.['From Type'] ||
    ''
  ).trim();

  return (
    fType === '1004 Subject-To ARV w/ As-Is' ||
    fType.includes('ARV') ||
    (fType.includes('Subject-To') && fType.includes('As-Is'))
  );
};

export const parseCurrencyNumber = (val) => {
  if (val === undefined || val === null || String(val).trim() === '') return null;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

/**
 * Validates that the Subject-To ARV value is strictly greater than the As-Is value.
 */
export const checkArvVsAsIsValue = (field, text, allData) => {
  if (!allData || !isArvAsIsActive(allData)) return null;

  const arvData = allData?.ARV_AS_IS || allData?.arv_as_is_data || {};
  const arvNum = parseCurrencyNumber(
    arvData?.arv_value ||
    allData?.RECONCILIATION?.['opinion of the market value, as defined, of the real property that is the subject of this report is $'] ||
    allData?.['opinion of the market value, as defined, of the real property that is the subject of this report is $'] ||
    allData?.RECONCILIATION?.['Final Value $'] ||
    allData?.['Subject-To ARV Value $']
  );

  const asIsNum = parseCurrencyNumber(
    arvData?.as_is_value ||
    allData?.['As-Is Value $'] ||
    allData?.RECONCILIATION?.['As-Is Value $'] ||
    allData?.['As-Is Value']
  );

  if (arvNum === null && asIsNum === null) return null;

  if (asIsNum === null) {
    return {
      isValid: false,
      severity: 'warning',
      message: '1004 Subject-To ARV reports require an explicit As-Is Market Value.',
      color: '#ed6c02',
    };
  }

  if (arvNum !== null && asIsNum !== null) {
    if (arvNum <= asIsNum) {
      return {
        isValid: false,
        severity: 'error',
        message: `Logical Error: Subject-To ARV ($${arvNum.toLocaleString()}) must be strictly greater than As-Is Value ($${asIsNum.toLocaleString()}).`,
        color: '#d32f2f',
      };
    }
  }

  return {
    isValid: true,
    severity: 'success',
    message: `Valid ARV Relationship: ARV ($${arvNum.toLocaleString()}) > As-Is ($${asIsNum.toLocaleString()}).`,
    color: '#2e7d32',
  };
};

/**
 * Validates that reconciliation is marked Subject-To, not As-Is.
 */
export const checkSubjectToReconciliation = (field, text, allData) => {
  if (!allData || !isArvAsIsActive(allData)) return null;

  const arvData = allData?.ARV_AS_IS || allData?.arv_as_is_data || {};
  const statusStr = String(
    arvData?.reconciliation_condition ||
    allData?.RECONCILIATION?.['Reconciliation Status'] ||
    allData?.RECONCILIATION?.["This appraisal is made \"as is\", subject to completion per plans and specifications on the basis of a hypothetical condition that the improvements have been completed, subject to the following repairs or alterations on the basis of a hypothetical condition that the repairs or alterations have been completed, or subject to the following required inspection based on the extraordinary assumption that the condition or deficiency does not require alteration or repair:"] ||
    text ||
    ''
  ).toLowerCase();

  if (statusStr.includes('as is') && !statusStr.includes('subject')) {
    return {
      isValid: false,
      severity: 'error',
      message: 'Reconciliation Error: Report is marked "As Is". 1004 ARV reports must be marked "Subject to completion" or "Subject to repairs".',
      color: '#d32f2f',
    };
  }

  if (statusStr.includes('subject to') || statusStr.includes('completion') || statusStr.includes('repair')) {
    return {
      isValid: true,
      severity: 'success',
      message: 'Reconciliation properly marked as Subject-To under hypothetical condition.',
      color: '#2e7d32',
    };
  }

  return null;
};
