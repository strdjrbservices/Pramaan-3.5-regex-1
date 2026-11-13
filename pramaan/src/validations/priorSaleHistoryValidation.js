import {
  checkResearchHistory,
  checkSubjectPriorSales,
  checkComparablePriorSales,
  checkDataSourceNotBlank,
  checkEffectiveDateIsCurrentYear,
  checkSubjectPriorSaleDate,
  checkCompPriorSaleDate
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
                if (res) return res;
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

        if (cleanField.includes('price of prior sale')) {
            const isSubj = saleName === 'Subject' || (Array.isArray(fieldPath) && fieldPath[0] === 'Subject');
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
