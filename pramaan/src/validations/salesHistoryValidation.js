export const checkResearchHistory = (field, text) => {
  if (field !== "I did did not research the sale or transfer history of the subject property and comparable sales. If not, explain") return null;
  const value = String(text || '').trim().toLowerCase();
  if (value.includes('did not')) {
    return { isError: true, message: "Critical Error: Research on sale/transfer history must be performed. 'did not' is not acceptable." };
  }
  if (!value.includes('did')) {
    return { isError: true, message: "This field must state whether research 'did' or 'did not' occur." };
  }
  return { isMatch: true };
};

const getSubjectPriorSaleDetails = (data) => {
  if (!data) return { researchValue: '', priorSaleDateStr: '', priorSalePriceStr: '', asOfDateStr: '' };

  const researchKeys = [
    "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.",
    "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal"
  ];
  let researchValue = '';
  for (const key of researchKeys) {
    if (data[key] !== undefined && data[key] !== null) { researchValue = String(data[key]); break; }
    if (data.Subject?.[key] !== undefined && data.Subject?.[key] !== null) { researchValue = String(data.Subject[key]); break; }
    if (data.SALES_TRANSFER?.[key] !== undefined && data.SALES_TRANSFER?.[key] !== null) { researchValue = String(data.SALES_TRANSFER[key]); break; }
    if (data.PRIOR_SALE_HISTORY?.[key] !== undefined && data.PRIOR_SALE_HISTORY?.[key] !== null) { researchValue = String(data.PRIOR_SALE_HISTORY[key]); break; }
  }
  if (!researchValue) {
    const allKeys = [
      ...Object.keys(data),
      ...(data.Subject ? Object.keys(data.Subject) : []),
      ...(data.SALES_TRANSFER ? Object.keys(data.SALES_TRANSFER) : []),
      ...(data.PRIOR_SALE_HISTORY ? Object.keys(data.PRIOR_SALE_HISTORY) : [])
    ];
    const matchKey = allKeys.find(k => k.includes("My research did did not reveal any prior sales or transfers of the subject property"));
    if (matchKey) {
      if (data[matchKey] !== undefined && data[matchKey] !== null) researchValue = String(data[matchKey]);
      else if (data.Subject?.[matchKey] !== undefined && data.Subject?.[matchKey] !== null) researchValue = String(data.Subject[matchKey]);
      else if (data.SALES_TRANSFER?.[matchKey] !== undefined && data.SALES_TRANSFER?.[matchKey] !== null) researchValue = String(data.SALES_TRANSFER[matchKey]);
      else if (data.PRIOR_SALE_HISTORY?.[matchKey] !== undefined && data.PRIOR_SALE_HISTORY?.[matchKey] !== null) researchValue = String(data.PRIOR_SALE_HISTORY[matchKey]);
    }
  }

  const dateKeys = [
    "Date of Prior Sale/Transfer",
    "Prior Sale History: Date of Prior Sale/Transfer"
  ];
  let priorSaleDateStr = '';
  for (const key of dateKeys) {
    if (data[key] !== undefined && data[key] !== null) { priorSaleDateStr = String(data[key]); break; }
    if (data.Subject?.[key] !== undefined && data.Subject?.[key] !== null) { priorSaleDateStr = String(data.Subject[key]); break; }
    if (data.SALES_TRANSFER?.[key] !== undefined && data.SALES_TRANSFER?.[key] !== null) { priorSaleDateStr = String(data.SALES_TRANSFER[key]); break; }
    if (data.PRIOR_SALE_HISTORY?.[key] !== undefined && data.PRIOR_SALE_HISTORY?.[key] !== null) { priorSaleDateStr = String(data.PRIOR_SALE_HISTORY[key]); break; }
  }

  const priceKeys = [
    "Price of Prior Sale/Transfer",
    "Prior Sale History: Price of Prior Sale/Transfer"
  ];
  let priorSalePriceStr = '';
  for (const key of priceKeys) {
    if (data[key] !== undefined && data[key] !== null) { priorSalePriceStr = String(data[key]); break; }
    if (data.Subject?.[key] !== undefined && data.Subject?.[key] !== null) { priorSalePriceStr = String(data.Subject[key]); break; }
    if (data.SALES_TRANSFER?.[key] !== undefined && data.SALES_TRANSFER?.[key] !== null) { priorSalePriceStr = String(data.SALES_TRANSFER[key]); break; }
    if (data.PRIOR_SALE_HISTORY?.[key] !== undefined && data.PRIOR_SALE_HISTORY?.[key] !== null) { priorSalePriceStr = String(data.PRIOR_SALE_HISTORY[key]); break; }
  }

  const asOfKeys = ["as of", "as of date"];
  let asOfDateStr = '';
  for (const key of asOfKeys) {
    if (data[key] !== undefined && data[key] !== null) { asOfDateStr = String(data[key]); break; }
    if (data.RECONCILIATION?.[key] !== undefined && data.RECONCILIATION?.[key] !== null) { asOfDateStr = String(data.RECONCILIATION[key]); break; }
    if (data.Subject?.[key] !== undefined && data.Subject?.[key] !== null) { asOfDateStr = String(data.Subject[key]); break; }
  }
  if (!asOfDateStr) {
    const reconKeys = data.RECONCILIATION ? Object.keys(data.RECONCILIATION) : [];
    const matchKey = reconKeys.find(k => k.toLowerCase().includes("as of"));
    if (matchKey) {
      asOfDateStr = String(data.RECONCILIATION[matchKey]);
    }
  }

  return {
    researchValue: researchValue.trim().toLowerCase(),
    priorSaleDateStr: priorSaleDateStr.trim(),
    priorSalePriceStr: priorSalePriceStr.trim(),
    asOfDateStr: asOfDateStr.trim()
  };
};

export const checkSubjectPriorSales = (field, text, data) => {
  const fieldName1 = "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.";
  const fieldName2 = "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal";
  if (field !== fieldName1 && field !== fieldName2) return null;
  if (!data) return null;

  const { priorSaleDateStr, priorSalePriceStr, asOfDateStr } = getSubjectPriorSaleDetails(data);

  const value = String(text || '').trim().toLowerCase();
  if (!value.includes('did') && !value.includes('did not')) {
    return { isError: true, message: "This field cannot be blank. Please indicate 'did' or 'did not'." };
  }

  const isDidNot = value.includes('did not');
  const isDid = value.includes('did') && !isDidNot;

  if (isDidNot) {
    const hasDate = priorSaleDateStr !== '';
    const hasPrice = priorSalePriceStr !== '';

    if (hasDate || hasPrice) {
      if (!hasDate || !hasPrice) {
        return { isError: true, message: "If prior sales were revealed, 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' for the Subject must blank or three years prior " };
      }
      if (asOfDateStr) {
        const priorSaleDate = new Date(priorSaleDateStr);
        const asOfDate = new Date(asOfDateStr);
        if (!isNaN(priorSaleDate.getTime()) && !isNaN(asOfDate.getTime())) {
          const threeYears = 3 * 365 * 24 * 60 * 60 * 1000;
          if (asOfDate - priorSaleDate <= threeYears || priorSaleDate > asOfDate) {
            return { isError: true, message: "If prior sales were revealed, 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' for the Subject must blank or three years prior " };
          }
        }
      }
    }
  } else if (isDid) {
    const hasDate = priorSaleDateStr !== '';
    const hasPrice = priorSalePriceStr !== '';

    if (!hasDate || !hasPrice) {
      return { isError: true, message: "If prior sales were revealed, 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' for the Subject must greater than or less than  three years prior " };
    }

    if (asOfDateStr) {
      const priorSaleDate = new Date(priorSaleDateStr);
      const asOfDate = new Date(asOfDateStr);
      if (!isNaN(priorSaleDate.getTime()) && !isNaN(asOfDate.getTime())) {
        const threeYears = 3 * 365 * 24 * 60 * 60 * 1000;
        if (asOfDate - priorSaleDate > threeYears || priorSaleDate > asOfDate) {
          return { isError: true, message: "If prior sales were revealed, 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' for the Subject must greater than or less than  three years prior " };
        }
      }
    }
  }

  return { isMatch: true };
};

export const parseAppraisalDate = (str) => {
  if (!str) return null;
  const s = String(str).trim();
  if (!s) return null;

  const fullDateMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (fullDateMatch) {
    const m = parseInt(fullDateMatch[1], 10);
    const d = parseInt(fullDateMatch[2], 10);
    let y = parseInt(fullDateMatch[3], 10);
    if (y < 100) y += (y < 50 ? 2000 : 1900);
    return new Date(y, m - 1, d);
  }

  const settledMatch = s.match(/[sS]\s*(\d{1,2})\/(\d{2,4})/);
  if (settledMatch) {
    const m = parseInt(settledMatch[1], 10);
    let y = parseInt(settledMatch[2], 10);
    if (y < 100) y += (y < 50 ? 2000 : 1900);
    return new Date(y, m, 0, 23, 59, 59);
  }

  const contractMatch = s.match(/[cC]\s*(\d{1,2})\/(\d{2,4})/);
  if (contractMatch) {
    const m = parseInt(contractMatch[1], 10);
    let y = parseInt(contractMatch[2], 10);
    if (y < 100) y += (y < 50 ? 2000 : 1900);
    return new Date(y, m, 0, 23, 59, 59);
  }

  const myMatch = s.match(/^(\d{1,2})\/(\d{2,4})$/);
  if (myMatch) {
    const m = parseInt(myMatch[1], 10);
    let y = parseInt(myMatch[2], 10);
    if (y < 100) y += (y < 50 ? 2000 : 1900);
    return new Date(y, m, 0, 23, 59, 59);
  }

  const directDate = new Date(s);
  return isNaN(directDate.getTime()) ? null : directDate;
};

const getAllComps = (d) => {
  if (!d || typeof d !== 'object') return [];
  const comps = [];
  const seen = new Set();

  const searchSources = [
    d.SALES_GRID,
    d['Sales Grid'],
    d.clean_data?.SALES_GRID,
    d.clean_data,
    d.fields,
    d
  ];

  for (const src of searchSources) {
    if (!src || typeof src !== 'object') continue;
    for (const [k, v] of Object.entries(src)) {
      if (!v || typeof v !== 'object') continue;
      const m = k.match(/(?:COMPARABLE\s*(?:SALE)?\s*(?:#|NO\.?)?\s*|Comp\s*)(\d+)/i);
      if (m) {
        const num = m[1];
        if (!seen.has(num)) {
          seen.add(num);
          comps.push({ num, key: k, data: v });
        }
      }
    }
  }
  return comps;
};

export const checkComparablePriorSales = (field, text, data) => {
  const fieldName1 = "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.";
  const fieldName2 = "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale";
  if (field !== fieldName1 && field !== fieldName2) return null;
  if (!data) return null;

  const value = String(text || '').trim().toLowerCase();
  if (!value.includes('did') && !value.includes('did not')) {
    return { isError: true, message: "This field cannot be blank. Please indicate 'did' or 'did not'." };
  }

  const isDidNot = value.includes('did not');
  const isDid = value.includes('did') && !isDidNot;

  const comps = getAllComps(data);

  if (isDidNot) {
    for (const comp of comps) {
      const priorSaleDateStr = String(comp.data['Date of Prior Sale/Transfer'] || comp.data['Prior Sale History: Date of Prior Sale/Transfer'] || data[`Comp ${comp.num} Date of Prior Sale/Transfer`] || '').trim();
      const priorSalePriceStr = String(comp.data['Price of Prior Sale/Transfer'] || comp.data['Prior Sale History: Price of Prior Sale/Transfer'] || data[`Comp ${comp.num} Price of Prior Sale/Transfer`] || '').trim();
      const saleDateStr = String(comp.data['Date of Sale/Time'] || comp.data['Date of Sale'] || data[`Comp ${comp.num} Date of Sale/Time`] || '').trim();

      const hasDate = priorSaleDateStr !== '';
      const hasPrice = priorSalePriceStr !== '';

      if (hasDate || hasPrice) {
        if (!hasDate || !hasPrice) {
          return { isError: true, message: "If prior sales for comparables were revealed, at least one comparable must have 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' must blank ." };
        }
        if (saleDateStr) {
          const priorSaleDate = parseAppraisalDate(priorSaleDateStr);
          const saleDate = parseAppraisalDate(saleDateStr);
          if (priorSaleDate && saleDate) {
            const oneYear = 365 * 24 * 60 * 60 * 1000;
            if (saleDate - priorSaleDate <= oneYear && priorSaleDate <= saleDate) {
              return { isError: true, message: "If prior sales for comparables were revealed, at least one comparable must have 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' must blank ." };
            }
          }
        }
      }
    }
  } else if (isDid) {
    let atLeastOneValid = false;
    for (const comp of comps) {
      const priorSaleDateStr = String(comp.data['Date of Prior Sale/Transfer'] || comp.data['Prior Sale History: Date of Prior Sale/Transfer'] || data[`Comp ${comp.num} Date of Prior Sale/Transfer`] || '').trim();
      const priorSalePriceStr = String(comp.data['Price of Prior Sale/Transfer'] || comp.data['Prior Sale History: Price of Prior Sale/Transfer'] || data[`Comp ${comp.num} Price of Prior Sale/Transfer`] || '').trim();
      const saleDateStr = String(comp.data['Date of Sale/Time'] || comp.data['Date of Sale'] || data[`Comp ${comp.num} Date of Sale/Time`] || '').trim();

      if (priorSaleDateStr && priorSalePriceStr) {
        const priorSaleDate = parseAppraisalDate(priorSaleDateStr);
        const saleDate = parseAppraisalDate(saleDateStr);

        if (priorSaleDate && saleDate) {
          const oneYear = (365 * 24 * 60 * 60 * 1000) + (31 * 24 * 60 * 60 * 1000);
          if (priorSaleDate <= saleDate && (saleDate - priorSaleDate) <= oneYear) {
            atLeastOneValid = true;
            break;
          }
        } else {
          // If sale date is active, pending, or unparseable, having both prior date and price satisfies revelation
          atLeastOneValid = true;
          break;
        }
      }
    }
    if (!atLeastOneValid) {
      return { isError: true, message: "If prior sales for comparables were revealed, at least one comparable must have 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' comparable sales for the year prior ." };
    }
  }

  return { isMatch: true };
};

export const checkDataSourceNotBlank = (field, text) => {
  const fieldsToCheck = ["Data Source(s) for subject property research", "Data Source(s) for comparable sales research", "Summary of Sales Comparison Approach"];
  if (fieldsToCheck.includes(field)) {
    if (!text || String(text).trim() === '') {
      return { isError: true, message: `'${field}' cannot be blank.` };
    }
  }
  return { isMatch: true };
};

export const checkEffectiveDateIsCurrentYear = (field, text) => {
  if (field !== "Effective Date of Data Source(s) for prior sale") return null;
  const value = String(text || '').trim();
  if (!value) return null;

  const year = new Date(value).getFullYear();
  const currentYear = new Date().getFullYear();

  if (year !== currentYear) {
    return { isError: true, message: `The year for '${field}' must be the current year (${currentYear}).` };
  }
  return { isMatch: true };
};

export const checkSubjectPriorSaleDate = (field, text, data, fieldPath, saleName) => {
  if (field !== 'Date of Prior Sale/Transfer' && field !== 'Prior Sale History: Date of Prior Sale/Transfer') return null;
  if (!data) return null;
  if (saleName && saleName !== 'Subject') return null;
  if (Array.isArray(fieldPath) && fieldPath[0] && fieldPath[0] !== 'Subject') return null;

  const { researchValue, priorSaleDateStr: parsedDate, asOfDateStr } = getSubjectPriorSaleDetails(data);

  const priorSaleDateStr = text ? String(text).trim() : parsedDate;

  if (!priorSaleDateStr) return null;

  const isDidNot = researchValue.includes('did not');
  const isDid = researchValue.includes('did') && !isDidNot;

  if (isDidNot) {
    if (asOfDateStr) {
      const priorSaleDate = parseAppraisalDate(priorSaleDateStr);
      const asOfDate = parseAppraisalDate(asOfDateStr);
      if (priorSaleDate && asOfDate) {
        const threeYears = 3 * 365 * 24 * 60 * 60 * 1000;
        if (asOfDate - priorSaleDate <= threeYears || priorSaleDate > asOfDate) {
          return { isError: true, message: "If prior sales were revealed, 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' for the Subject must blank or three years prior " };
        }
      }
    }
  } else if (isDid) {
    if (asOfDateStr) {
      const priorSaleDate = parseAppraisalDate(priorSaleDateStr);
      const asOfDate = parseAppraisalDate(asOfDateStr);
      if (priorSaleDate && asOfDate) {
        const threeYears = 3 * 365 * 24 * 60 * 60 * 1000;
        if (asOfDate - priorSaleDate > threeYears || priorSaleDate > asOfDate) {
          return { isError: true, message: "If prior sales were revealed, 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' for the Subject must greater than or less than  three years prior " };
        }
      }
    }
  }

  return { isMatch: true };
};

export const checkCompPriorSaleDate = (field, text, data, fieldPath, saleName) => {
  if (field !== 'Date of Prior Sale/Transfer' && field !== 'Prior Sale History: Date of Prior Sale/Transfer') return null;
  let targetSale = saleName;
  if ((!targetSale || targetSale === 'Subject') && Array.isArray(fieldPath) && fieldPath[0] && fieldPath[0] !== 'Subject') {
    targetSale = fieldPath[0];
  }
  if (!targetSale || targetSale === 'Subject' || !data) return null;

  const checkboxKeys = [
    "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.",
    "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale"
  ];
  let researchValue = '';
  for (const key of checkboxKeys) {
    if (data[key] !== undefined && data[key] !== null) { researchValue = String(data[key]); break; }
    if (data.Subject?.[key] !== undefined && data.Subject?.[key] !== null) { researchValue = String(data.Subject[key]); break; }
    if (data.SALES_TRANSFER?.[key] !== undefined && data.SALES_TRANSFER?.[key] !== null) { researchValue = String(data.SALES_TRANSFER[key]); break; }
    if (data.PRIOR_SALE_HISTORY?.[key] !== undefined && data.PRIOR_SALE_HISTORY?.[key] !== null) { researchValue = String(data.PRIOR_SALE_HISTORY[key]); break; }
  }
  if (!researchValue) {
    const allKeys = [
      ...Object.keys(data),
      ...(data.Subject ? Object.keys(data.Subject) : []),
      ...(data.SALES_TRANSFER ? Object.keys(data.SALES_TRANSFER) : []),
      ...(data.PRIOR_SALE_HISTORY ? Object.keys(data.PRIOR_SALE_HISTORY) : [])
    ];
    const matchKey = allKeys.find(k => k.includes("My research did did not reveal any prior sales or transfers of the comparable sales"));
    if (matchKey) {
      if (data[matchKey] !== undefined && data[matchKey] !== null) researchValue = String(data[matchKey]);
      else if (data.Subject?.[matchKey] !== undefined && data.Subject?.[matchKey] !== null) researchValue = String(data.Subject[matchKey]);
      else if (data.SALES_TRANSFER?.[matchKey] !== undefined && data.SALES_TRANSFER?.[matchKey] !== null) researchValue = String(data.SALES_TRANSFER[matchKey]);
      else if (data.PRIOR_SALE_HISTORY?.[matchKey] !== undefined && data.PRIOR_SALE_HISTORY?.[matchKey] !== null) researchValue = String(data.PRIOR_SALE_HISTORY[matchKey]);
    }
  }

  const normalized = researchValue.toLowerCase();
  const isDidNot = normalized.includes('did not');
  const isDid = normalized.includes('did') && !isDidNot;

  const priorSaleDateStr = String(text || '').trim();
  const compData = data[targetSale] || data.SALES_GRID?.[targetSale] || data['Sales Grid']?.[targetSale] || {};
  const saleDateStr = String(compData['Date of Sale/Time'] || compData['Date of Sale'] || '').trim();

  if (!priorSaleDateStr) return null;

  const priorSaleDate = parseAppraisalDate(priorSaleDateStr);
  const saleDate = parseAppraisalDate(saleDateStr);

  if (isDid) {
    if (priorSaleDate && saleDate) {
      const oneYear = (365 * 24 * 60 * 60 * 1000) + (31 * 24 * 60 * 60 * 1000);
      if (priorSaleDate > saleDate || (saleDate - priorSaleDate) > oneYear) {
        return { isError: true, message: "If prior sales for comparables were revealed, at least one comparable must have 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' comparable sales for the year prior ." };
      }
    }
  } else if (isDidNot) {
    if (priorSaleDate && saleDate) {
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (saleDate - priorSaleDate <= oneYear && priorSaleDate <= saleDate) {
        return { isError: true, message: "If prior sales for comparables were revealed, at least one comparable must have 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' must blank ." };
      }
    }
  }
  return { isMatch: true };
};
