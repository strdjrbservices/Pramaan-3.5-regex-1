import {
  checkResearchHistory,
  checkSubjectPriorSales,
  checkComparablePriorSales,
  checkDataSourceNotBlank,
  checkEffectiveDateIsCurrentYear,
  checkSubjectPriorSaleDate,
  checkCompPriorSaleDate,
  checkPriorSalePrice
} from './salesHistoryValidation';

export const PRIOR_SALE_HISTORY_FIELDS_TO_CHECK = [
    "Prior Sale History: I did did not research the sale or transfer history of the subject property and comparable sales",
    "I did did not research the sale or transfer history of the subject property and comparable sales. If not, explain",
    "I did did not research the sale or transfer history of the subject property and comparable sales",
    "If not, explain",
    "Prior Sale History: If not, explain",
    "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal",
    "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.",
    "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal",
    "Prior Sale History: Data source(s) for subject",
    "Data Source(s) for subject property research",
    "Data source(s) for subject property research",
    "Data source(s) for subject",
    "Subject Transfer History Data Source",
    "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale",
    "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.",
    "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale",
    "Prior Sale History: Data source(s) for comparables",
    "Data Source(s) for comparable sales research",
    "Data source(s) for comparable sales research",
    "Data source(s) for comparables",
    "Prior Sale History: Report the results of the research and analysis of the prior sale or transfer history of the subject property and comparable sales",
    "Report the results of the research and analysis of the prior sale or transfer history of the subject property and comparable sales",
    "Report the results of the research and analysis of the prior sale or transfer history of the subject property and comparable sales (report additional prior sales on page 3).",
    "Prior Sale History: Date of Prior Sale/Transfer",
    "Date of Prior Sale/Transfer",
    "Prior Sale History: Price of Prior Sale/Transfer",
    "Price of Prior Sale/Transfer",
    "Prior Sale History: Data Source(s) for prior sale/transfer",
    "Prior Sale History: Data source(s) for prior sale",
    "Data Source(s) for prior sale/transfer",
    "Data Source(s)",
    "Data source(s)",
    "Prior Sale History: Effective Date of Data Source(s)",
    "Prior Sale History: Effective date of data source(s)",
    "Effective Date of Data Source(s) for prior sale",
    "Effective Date of Data Source(s)",
    "Effective date of data source(s)",
    "Prior Sale History: Analysis of prior sale or transfer history of the subject property and comparable sales",
    "Analysis of prior sale or transfer history of the subject property and comparable sales",
    "Analysis of prior sale or transfer history of the subject property and comparable sales.",
    "Prior Sales or Transfers",
    "Comparable Number",
    "Comparable Transfer Terms",
    "Comparable Transfer Date",
    "Comparable Transfer Amount",
    "Comparable Transfer Data Source",
    "Analysis of Prior Sale and Transfer History of Subject Property",
    "Analysis of Prior Sale and Transfer History of Comparable Sales",
    "Indicated Value by Sales Comparison Approach $",
    "Indicated Value by Sales Comparison Approach",
    "Prior Sale History: Indicated Value by Sales Comparison Approach $",
    "Prior Sale History: Indicated Value by Sales Comparison Approach"
];

export const isPriorSaleHistoryField = (field) => {
    if (!field || typeof field !== 'string') return false;
    const clean = field.trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' ');
    return clean.startsWith('prior sale history') ||
           clean.includes('prior sale') ||
           clean.includes('prior sales') ||
           clean.includes('transfer history') ||
           clean.includes('indicated value by sales comparison approach');
};

export const getSubjectResearchValue = (data) => {
    if (!data || typeof data !== 'object') return '';
    const keys = [
        "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.",
        "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal",
        "My research did did not reveal any prior sales or transfers of the subject property"
    ];
    const sources = [
        data.PRIOR_SALE_HISTORY,
        data['Prior Sale History'],
        data.clean_data?.['Prior Sale History'],
        data.clean_data?.PRIOR_SALE_HISTORY,
        data.SALES_TRANSFER,
        data.Subject,
        data.SUBJECT,
        data
    ];
    for (const src of sources) {
        if (src && typeof src === 'object') {
            for (const k of keys) {
                if (src[k] !== undefined && src[k] !== null && String(src[k]).trim() !== '') {
                    return String(src[k]).toLowerCase();
                }
            }
        }
    }
    return '';
};

export const getCompResearchValue = (data) => {
    if (!data || typeof data !== 'object') return '';
    const keys = [
        "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.",
        "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale",
        "My research did did not reveal any prior sales or transfers of the comparable sales"
    ];
    const sources = [
        data.PRIOR_SALE_HISTORY,
        data['Prior Sale History'],
        data.clean_data?.['Prior Sale History'],
        data.clean_data?.PRIOR_SALE_HISTORY,
        data.SALES_TRANSFER,
        data
    ];
    for (const src of sources) {
        if (src && typeof src === 'object') {
            for (const k of keys) {
                if (src[k] !== undefined && src[k] !== null && String(src[k]).trim() !== '') {
                    return String(src[k]).toLowerCase();
                }
            }
        }
    }
    return '';
};

export const extractYearFromDateStr = (dateStr) => {
    if (!dateStr) return null;
    const s = String(dateStr).trim();
    if (['none', 'n/a', '0', '-', 'unknown'].includes(s.toLowerCase())) return null;

    // 1. 4-digit year (19xx or 20xx)
    const m4 = s.match(/\b(19\d\d|20\d\d)\b/);
    if (m4) return parseInt(m4[1], 10);

    // 2. 2-digit year in formats like MM/DD/YY, MM/YY, sMM/YY:cMM/YY
    const m2 = s.match(/(?:^|[^\d])(\d{1,2})\/(\d{1,2})\/(\d{2})\b/) ||
               s.match(/(?:^|[^\d])(\d{1,2})\/(\d{2})\b/) ||
               s.match(/[sc](\d{1,2})\/(\d{2})/i);
    if (m2) {
        const yy = parseInt(m2[m2.length - 1], 10);
        return yy >= 50 ? 1900 + yy : 2000 + yy;
    }

    // 3. Fallback to Date.parse
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        if (y >= 1950 && y <= 2100) return y;
    }

    return null;
};

export const getAppraisalCurrentYear = (data) => {
    if (!data || typeof data !== 'object') return new Date().getFullYear();

    const asOfKeys = [
        "as of", "as of date", "as of Date", "Effective Date of Appraisal", "Effective Date",
        "Date of Signature and Report", "Appraisal Effective Date"
    ];
    const sources = [
        data.RECONCILIATION,
        data['RECONCILIATION'],
        data.clean_data?.RECONCILIATION,
        data.CERTIFICATION,
        data.clean_data?.CERTIFICATION,
        data.Subject,
        data.SUBJECT,
        data
    ];

    for (const src of sources) {
        if (src && typeof src === 'object') {
            for (const k of asOfKeys) {
                if (src[k] !== undefined && src[k] !== null && String(src[k]).trim() !== '') {
                    const y = extractYearFromDateStr(src[k]);
                    if (y) return y;
                }
            }
            const srcKeys = Object.keys(src);
            const matched = srcKeys.find(k => {
                const lower = k.toLowerCase();
                return lower.includes('as of') || lower.includes('effective date');
            });
            if (matched && src[matched]) {
                const y = extractYearFromDateStr(src[matched]);
                if (y) return y;
            }
        }
    }

    return new Date().getFullYear();
};

export const getSubjectPriorSalePriceVal = (data) => {
    if (!data || typeof data !== 'object') return null;
    const priceKeys = [
        "Price of Prior Sale/Transfer",
        "Prior Sale History: Price of Prior Sale/Transfer",
        "Prior Sale Price",
        "prior sale price"
    ];
    const sources = [
        data.SALES_TRANSFER,
        data.Subject,
        data.SUBJECT,
        data.PRIOR_SALE_HISTORY,
        data['Prior Sale History'],
        data.clean_data?.['Prior Sale History'],
        data.clean_data?.PRIOR_SALE_HISTORY,
        data.SALES_GRID?.Subject,
        data['Sales Grid']?.Subject,
        data
    ];
    for (const src of sources) {
        if (src && typeof src === 'object') {
            for (const k of priceKeys) {
                if (src[k] !== undefined && src[k] !== null && String(src[k]).trim() !== '') {
                    const num = parseFloat(String(src[k]).replace(/[$,\s]/g, ''));
                    if (!isNaN(num)) return num;
                }
            }
        }
    }
    return null;
};

export const getSubjectPriorSaleDateVal = (data) => {
    if (!data || typeof data !== 'object') return '';
    const dateKeys = [
        "Date of Prior Sale/Transfer",
        "Prior Sale History: Date of Prior Sale/Transfer",
        "Prior Sale Date",
        "prior sale date"
    ];
    const sources = [
        data.SALES_TRANSFER,
        data.Subject,
        data.SUBJECT,
        data.PRIOR_SALE_HISTORY,
        data['Prior Sale History'],
        data.clean_data?.['Prior Sale History'],
        data.clean_data?.PRIOR_SALE_HISTORY,
        data.SALES_GRID?.Subject,
        data['Sales Grid']?.Subject,
        data
    ];
    for (const src of sources) {
        if (src && typeof src === 'object') {
            for (const k of dateKeys) {
                if (src[k] !== undefined && src[k] !== null && String(src[k]).trim() !== '') {
                    return String(src[k]).trim();
                }
            }
        }
    }
    return '';
};

export const getFinalAppraisedValue = (data, text, field) => {
    const cleanField = String(field || '').trim().toLowerCase();
    if (cleanField.includes('opinion of') || cleanField.includes('final value') || cleanField.includes('indicated value by sales comparison')) {
        const num = parseFloat(String(text || '').replace(/[$,\s]/g, ''));
        if (!isNaN(num) && num > 0) return num;
    }
    if (!data || typeof data !== 'object') return null;

    const valKeys = [
        "Opinion of Market Value",
        "Final Value",
        "Final Value $",
        "opinion of the market value, as defined, of the real property that is the subject of this report is $",
        "OPINION OF THE MARKET VALUE, AS DEFINED, OF THE REAL PROPERTY THAT IS THE SUBJECT OF THIS REPORT IS $",
        "Indicated Value by Sales Comparison Approach $",
        "Indicated Value by Sales Comparison Approach",
        "Indicated Value by: Sales Comparison Approach $",
        "Prior Sale History: Indicated Value by Sales Comparison Approach $",
        "Prior Sale History: Indicated Value by Sales Comparison Approach"
    ];
    const sources = [
        data.RECONCILIATION,
        data['RECONCILIATION'],
        data.clean_data?.RECONCILIATION,
        data.PRIOR_SALE_HISTORY,
        data['Prior Sale History'],
        data.clean_data?.['Prior Sale History'],
        data.clean_data?.PRIOR_SALE_HISTORY,
        data.Subject,
        data.SUBJECT,
        data
    ];
    for (const src of sources) {
        if (src && typeof src === 'object') {
            for (const k of valKeys) {
                if (src[k] !== undefined && src[k] !== null && String(src[k]).trim() !== '') {
                    const num = parseFloat(String(src[k]).replace(/[$,\s]/g, ''));
                    if (!isNaN(num) && num > 0) return num;
                }
            }
        }
    }
    return null;
};

export const getSubjectPriorSaleComment = (data) => {
    if (!data || typeof data !== 'object') return '';
    const commentKeys = [
        "Analysis of prior sale or transfer history of the subject property and comparable sales",
        "Prior Sale History: Analysis of prior sale or transfer history of the subject property and comparable sales",
        "Analysis of prior sale or transfer history of the subject property and comparable sales.",
        "Analysis of Prior Sale and Transfer History of Subject Property",
        "Report the results of the research and analysis of the prior sale or transfer history of the subject property and comparable sales",
        "Prior Sale History: Report the results of the research and analysis of the prior sale or transfer history of the subject property and comparable sales",
        "Analysis of Prior Sale and Transfer History of Comparable Sales",
        "SubjectPriorSalesAndTransferHistory",
        "_CurrentSalesAgreementAnalysisComment",
        "_PriorSalesAnalysisComment",
        "GSEPriorSaleComment"
    ];
    const sources = [
        data.PRIOR_SALE_HISTORY,
        data['Prior Sale History'],
        data.clean_data?.['Prior Sale History'],
        data.clean_data?.PRIOR_SALE_HISTORY,
        data.SALES_TRANSFER,
        data.RECONCILIATION,
        data
    ];
    for (const src of sources) {
        if (src && typeof src === 'object') {
            for (const k of commentKeys) {
                if (src[k] !== undefined && src[k] !== null && String(src[k]).trim() !== '') {
                    return String(src[k]).trim();
                }
            }
        }
    }
    return '';
};

export const hasValidPriorSaleComment = (str) => {
    if (!str || typeof str !== 'string') return false;
    const clean = str.trim().toLowerCase();
    if (clean === '' || clean === 'none' || clean === 'n/a' || clean === 'na' || clean === '0' || clean === '-') {
        return false;
    }
    return clean.length >= 5;
};

const isCompIdentifier = (str) => /^(?:comparable(?:\s*sale)?|comp)\s*#?\d+/i.test(String(str || '').trim());

export const checkSubjectPriorSaleValueIncrease = (field, text, data, fieldPath, saleName) => {
    // 1. Only applies to Subject (exclude comps)
    if (saleName && isCompIdentifier(saleName)) {
        return null;
    }
    if (Array.isArray(fieldPath) && fieldPath.length > 0) {
        const first = String(fieldPath[0]);
        if (isCompIdentifier(first)) {
            return null;
        }
    }

    const cleanField = String(field || '').trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' ');

    // 2. Identify field role
    const isPriceField = cleanField.includes('price of prior sale') || cleanField === 'prior sale price' || cleanField === 'comparable transfer amount';
    const isDateField = cleanField.includes('date of prior sale') || cleanField === 'prior sale date' || cleanField === 'comparable transfer date';
    const isFinalValueField = cleanField.includes('opinion of') || cleanField.includes('final value') || cleanField.includes('indicated value by sales comparison');
    const isCommentField = cleanField.includes('analysis of prior sale') || cleanField.includes('report the results of the research and analysis');

    if (!isPriceField && !isDateField && !isFinalValueField && !isCommentField) {
        return null;
    }

    // 3. Subject Prior Sale Price
    let priorPrice = null;
    if (isPriceField) {
        const pNum = parseFloat(String(text || '').replace(/[$,\s]/g, ''));
        if (!isNaN(pNum)) priorPrice = pNum;
    } else {
        priorPrice = getSubjectPriorSalePriceVal(data);
    }

    // If no prior sale price or price <= 0, rule does not apply
    if (priorPrice === null || priorPrice <= 0) {
        return null;
    }

    // 4. Subject Prior Sale Date
    let priorDateStr = '';
    if (isDateField) {
        priorDateStr = String(text || '').trim();
    } else {
        priorDateStr = getSubjectPriorSaleDateVal(data);
    }

    if (!priorDateStr || ['none', 'n/a', '0', '-'].includes(priorDateStr.toLowerCase())) {
        return null;
    }

    const priorSaleYear = extractYearFromDateStr(priorDateStr);
    if (!priorSaleYear) {
        return null;
    }

    // 5. Current Year
    const currentYear = getAppraisalCurrentYear(data);
    if (priorSaleYear !== currentYear) {
        // Only applies if subject prior sale year is the same as current year
        return null;
    }

    // 6. Final Value
    let finalVal = null;
    if (isFinalValueField) {
        const fNum = parseFloat(String(text || '').replace(/[$,\s]/g, ''));
        if (!isNaN(fNum) && fNum > 0) finalVal = fNum;
    } else {
        finalVal = getFinalAppraisedValue(data, text, field);
    }

    if (finalVal === null || finalVal <= 0) {
        return null;
    }

    // 7. Check 15% increase
    const maxAllowedVal = priorPrice * 1.15;
    const isOver15 = finalVal > (maxAllowedVal + 0.001);
    const diffPct = ((finalVal - priorPrice) / priorPrice) * 100;
    const diffPctStr = `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%`;
    const formattedFinal = `$${Math.round(finalVal).toLocaleString()}`;
    const formattedPrior = `$${Math.round(priorPrice).toLocaleString()}`;

    if (!isOver15) {
        return {
            isMatch: true,
            message: `Subject final value (${formattedFinal}) is within 15% of prior sale (${formattedPrior}) in same year (${currentYear}).`
        };
    }

    // Final value is more than 15% higher: check comment
    let commentStr = '';
    if (isCommentField) {
        commentStr = String(text || '').trim();
    } else {
        commentStr = getSubjectPriorSaleComment(data);
    }

    const hasComment = hasValidPriorSaleComment(commentStr);

    if (!hasComment) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `If the subject has prior sale and the year is same as of current year (${currentYear}), then the final value (${formattedFinal}) should not be more than 15% higher than prior sale (${formattedPrior}, ${diffPctStr}). Please add comment to check increase in value.`
        };
    }

    return {
        isMatch: true,
        message: `Subject final value (${formattedFinal}) increased by ${diffPct.toFixed(1)}% over prior sale (${formattedPrior}) in same year (${currentYear}), supported by explanatory comment.`
    };
};

export const checkPriorSaleHistoryFieldsNotBlank = (field, text, data, fieldPath, saleName) => {
    const cleanField = String(field || '').trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' ');
    const isMatch = PRIOR_SALE_HISTORY_FIELDS_TO_CHECK.some(
        f => f.trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' ') === cleanField
    ) || isPriorSaleHistoryField(field);

    if (!isMatch) {
        return null;
    }

    // Contextual Fannie Mae sales history validation when data is passed
    if (data) {
        // Check 15% increase rule for Subject
        const increaseRes = checkSubjectPriorSaleValueIncrease(field, text, data, fieldPath, saleName);
        if (increaseRes) {
            if (increaseRes.isError) {
                return increaseRes;
            }
            if (cleanField.includes('analysis of prior sale') || cleanField.includes('report the results of the research and analysis')) {
                return increaseRes;
            }
        }
    }

    if (cleanField.includes('price of prior sale') || cleanField === 'comparable transfer amount') {
        const priceRes = checkPriorSalePrice(field, text, data, fieldPath, saleName);
        if (priceRes !== undefined) {
            if (priceRes && priceRes.isError) return priceRes;
            // Also check 15% increase if price is valid (> 0)
            if (priceRes && data) {
                const increaseRes = checkSubjectPriorSaleValueIncrease(field, text, data, fieldPath, saleName);
                if (increaseRes) return increaseRes;
            }
            return priceRes;
        }
    }

    // Contextual Fannie Mae sales history validation when data is passed
    if (data) {
        if (cleanField.includes('research the sale or transfer history')) {
            const res = checkResearchHistory(field, text, data);
            if (res) return res;
        }

        if (cleanField.includes('three years prior to the effective date')) {
            const res = checkSubjectPriorSales(field, text, data);
            if (res) return res;
        }

        if (cleanField.includes('year prior to the date of sale of the comparable sale')) {
            const res = checkComparablePriorSales(field, text, data);
            if (res) return res;
        }

        if (cleanField.includes('date of prior sale')) {
            const isSubj = saleName === 'Subject' || (Array.isArray(fieldPath) && fieldPath[0] === 'Subject') || (!saleName && !fieldPath);
            if (isSubj) {
                const res = checkSubjectPriorSaleDate(field, text, data, fieldPath, saleName);
                if (res) {
                    if (res.isError) return res;
                    const increaseRes = checkSubjectPriorSaleValueIncrease(field, text, data, fieldPath, saleName);
                    if (increaseRes && increaseRes.isError) return increaseRes;
                    return res;
                }
            } else {
                const res = checkCompPriorSaleDate(field, text, data, fieldPath, saleName);
                if (res) return res;
            }

            // If research did not reveal prior sales, blank is valid/clean
            if (!text || String(text).trim() === '') {
                if (isSubj) {
                    const subjRes = getSubjectResearchValue(data);
                    if (subjRes.includes('did not')) return null;
                } else {
                    const compRes = getCompResearchValue(data);
                    if (compRes.includes('did not')) return null;
                }
            }
        }

        if (cleanField.includes('effective date of data source')) {
            const res = checkEffectiveDateIsCurrentYear(field, text);
            if (res) return res;
        }

        if (cleanField.includes('data source') && !cleanField.includes('effective date')) {
            const res = checkDataSourceNotBlank(field, text);
            if (res) return res;
        }
    }

    if (!text || String(text).trim() === '') {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `'${field}' must not be blank.`
        };
    }

    return {
        isMatch: true,
        message: "Validation successful!"
    };
};
