import { getOpinionOfMarketValue } from './salesComparisonValidation';
import { parseStandardDate } from './appraiserLenderValidation';

export const getAssignmentType = (data) => {
    if (!data) return '';
    const raw = data['Assignment Type'] || data?.Subject?.['Assignment Type'] || data?.CONTRACT?.['Assignment Type'] || data?.data?.['Assignment Type'] || '';
    return String(raw).trim();
};

export const checkContractFieldsMandatory = (field, text, data, fieldPath) => {
    if (fieldPath && fieldPath[0] !== 'CONTRACT' && fieldPath[0] !== 'Subject') return null;

    const assignmentType = getAssignmentType(data).toLowerCase();

    if (assignmentType.includes('purchase')) {
        const isIfYesField = field === "If Yes, report the total dollar amount and describe the items to be paid";
        let isRequired = true;
        if (isIfYesField) {
            const assistanceField = "Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?";
            const assistanceValue = String(data?.CONTRACT?.[assistanceField] || data?.[assistanceField] || '').trim().toLowerCase();
            isRequired = assistanceValue.includes('yes');
        }

        if (isRequired && (!text || String(text).trim() === '')) {
            return { isError: true, skipBlankFilter: true, message: `This field is required and must not be blank when Assignment Type is 'Purchase Transaction'.` };
        }
        return { isMatch: true };
    } else if (assignmentType.includes('refinance')) {
        const val = String(text || '').trim().toLowerCase();
        if (val !== '' && val !== 'did not' && val !== 'no' && val !== 'n/a') {
            return { isError: true, message: `This field should be blank, 'No', 'N/A', or 'Did not' when Assignment Type is 'Refinance Transaction'.` };
        }
        return { isMatch: true };
    } else if (assignmentType.includes('other')) {
        return { isError: true, message: `need to find the comment` };
    }

    return { isError: true, message: `Assignment Type is required or invalid.` };
};

export const checkContractAnalysisConsistency = (field, text, data) => {
    if (!data) return null;

    const assignmentType = getAssignmentType(data).toLowerCase();

    if (!assignmentType.includes('purchase')) {
        return null;
    }

    const contractData = data.CONTRACT || data;
    const analysisField = "I did did not analyze the contract for sale for the subject purchase transaction. Explain the results of the analysis of the contract for sale or why the analysis was not performed.";
    const analysisValue = String(contractData[analysisField] || '').trim().toLowerCase();

    if (!analysisValue) return null;

    if (!analysisValue.includes('did') && !analysisValue.includes('did not')) {
        if (field === analysisField) return { isError: true, message: "This field must include 'did' or 'did not'." };
    }

    return null;
};

export const checkFinancialAssistanceInconsistency = (field, data) => {
    const assistanceQuestionField =
        'Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?';

    const assistanceAmountField =
        'If Yes, report the total dollar amount and describe the items to be paid';

    if (field !== assistanceQuestionField && field !== assistanceAmountField) return null;

    const assignmentType = getAssignmentType(data).toLowerCase();
    if (!assignmentType.includes('purchase')) {
        return { isMatch: true };
    }

    const contractData = data?.CONTRACT || data || {};

    const assistanceAnswer = String(
        contractData[assistanceQuestionField] || ''
    ).toLowerCase();

    const amountText = String(
        contractData[assistanceAmountField] || ''
    ).trim();

    const validNoValues = ['', '0', '$0', '0;', '$0;;', '$0;', '0;;'];

    const isZeroOrNoConcessionsText = (t) => {
        if (!t) return true;
        if (validNoValues.includes(t)) return true;
        if (/^\$?0[;\s,]/.test(t)) return true;
        const lower = t.toLowerCase();
        if (lower.startsWith('no ') || lower.startsWith('none') || lower.startsWith('n/a') || lower.startsWith('not applicable')) return true;
        return false;
    };

    if (assistanceAnswer.includes('yes')) {
        if (isZeroOrNoConcessionsText(amountText)) {
            return {
                isError: true,
                message:
                    "Financial assistance is marked 'Yes', so the amount and description must be specified."
            };
        }
    }

    if (assistanceAnswer.includes('no')) {
        if (!isZeroOrNoConcessionsText(amountText)) {
            return {
                isError: true,
                message:
                    "Financial assistance is marked 'No', so the value must be 0, $0, or a no-concession note."
            };
        }
    }

    return { isMatch: true };
};


export const checkYesNoOnly = (field, text, data, fieldConfig) => {
    if (field !== fieldConfig.name) return null;

    const assignmentType = getAssignmentType(data).toLowerCase();

    if (assignmentType.includes('refinance') || assignmentType.includes('other')) {
        return { isMatch: true };
    }

    const value = String(text || '').trim().toLowerCase();

    if (!value) {
        return { isError: true, message: `'${field}' must be 'Yes' or 'No'.` };
    }

    if (value !== 'yes' && value !== 'no') {
        return { isError: true, message: `Invalid value for '${field}'. It must be 'Yes' or 'No'.` };
    }

    return { isMatch: true };
};

export const checkContractPriceVsFinalValue = (field, text, data) => {
    if (!field) return null;
    const cleanField = String(field).trim().toLowerCase();
    const isContractPriceField =
        cleanField === 'contract price $' ||
        cleanField === 'contract price' ||
        cleanField === 'purchase price $' ||
        cleanField === 'purchase price' ||
        cleanField.includes('contract price');

    if (!isContractPriceField) return null;

    const assignmentType = getAssignmentType(data).toLowerCase();
    if (assignmentType.includes('refinance')) {
        return null;
    }

    let rawVal = text;
    if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
        rawVal = data?.CONTRACT?.['Contract Price $'] ??
                 data?.CONTRACT?.['Contract Price'] ??
                 data?.['Contract Price $'] ??
                 data?.['Contract Price'] ??
                 data?.Subject?.['Contract Price $'] ??
                 data?.Subject?.['Contract Price'];
    }

    const valStr = typeof rawVal === 'object' && rawVal !== null ? (rawVal.value ?? '') : String(rawVal || '');
    const cleanText = valStr.trim();
    if (!cleanText) return null;

    const contractPrice = parseFloat(cleanText.replace(/[^0-9.]/g, ''));
    if (isNaN(contractPrice) || contractPrice <= 0) return null;

    let finalValue = getOpinionOfMarketValue(data);
    if (!finalValue && data) {
        const rawFv = data['final value'] ??
                      data['Final Value'] ??
                      data['Final Value $'] ??
                      data?.RECONCILIATION?.['final value'] ??
                      data?.RECONCILIATION?.['Final Value $'] ??
                      data?.RECONCILIATION?.['Final Value'] ??
                      data?.RECONCILIATION?.['opinion of the market value, as defined, of the real property that is the subject of this report is $'] ??
                      data?.['opinion of the market value, as defined, of the real property that is the subject of this report is $'];
        if (rawFv !== undefined && rawFv !== null && String(rawFv).trim() !== '') {
            const num = parseFloat(String(rawFv).replace(/[^0-9.]/g, ''));
            if (!isNaN(num) && num > 0) finalValue = num;
        }
    }

    if (!finalValue || isNaN(finalValue) || finalValue <= 0) return null;

    // Rule 2: If the contract price is higher than the final value it should be highlighted.
    if (contractPrice > finalValue) {
        const diff = contractPrice - finalValue;
        const percentHigher = (((contractPrice - finalValue) / finalValue) * 100).toFixed(1);
        return {
            isError: true,
            message: `Contract Price ($${contractPrice.toLocaleString()}) is higher than final appraised value ($${finalValue.toLocaleString()}) by $${diff.toLocaleString()} (${percentHigher}% higher).`
        };
    }

    // Rule 1: The contract price should be within 10% lower than final value.
    // 1a. If it is over than it, it should be highlighted.
    const lowerBound = finalValue * 0.9;
    if (contractPrice < lowerBound - 0.01) {
        const diff = finalValue - contractPrice;
        const percentLower = ((diff / finalValue) * 100).toFixed(1);
        return {
            isError: true,
            message: `Contract Price ($${contractPrice.toLocaleString()}) is more than 10% lower (${percentLower}% lower) than final appraised value ($${finalValue.toLocaleString()}). Contract price should be within 10% lower than final value (minimum $${Math.round(lowerBound).toLocaleString()}).`
        };
    }

    if (contractPrice === finalValue) {
        return {
            isMatch: true,
            message: `Contract Price ($${contractPrice.toLocaleString()}) matches final appraised value ($${finalValue.toLocaleString()}).`
        };
    }

    const percentLower = (((finalValue - contractPrice) / finalValue) * 100).toFixed(1);
    return {
        isMatch: true,
        message: `Contract Price ($${contractPrice.toLocaleString()}) is within 10% lower than final appraised value ($${finalValue.toLocaleString()}) (${percentLower}% lower).`
    };
};

export const getDateOfContractStr = (allData, text) => {
    if (text !== undefined && text !== null && String(text).trim() !== '') {
        const s = typeof text === 'object' ? (text.value ?? text.text ?? '') : String(text);
        if (s.trim()) return s.trim();
    }
    if (!allData || typeof allData !== 'object') return '';

    const contract = allData.CONTRACT || allData.Contract || allData.contract || {};
    const candidates = [
        contract['Date of Contract'],
        contract['Date Of Contract'],
        contract['Contract Date'],
        allData['Date of Contract'],
        allData['Date Of Contract'],
        allData['Contract Date'],
        allData.Subject?.['Date of Contract']
    ];

    for (const cand of candidates) {
        if (cand !== undefined && cand !== null && String(cand).trim() !== '') {
            const s = typeof cand === 'object' ? (cand.value ?? cand.text ?? '') : String(cand);
            if (s.trim()) return s.trim();
        }
    }
    return '';
};

export const getAsOfDateStr = (allData, text) => {
    if (text !== undefined && text !== null && String(text).trim() !== '') {
        const s = typeof text === 'object' ? (text.value ?? text.text ?? '') : String(text);
        if (s.trim()) return s.trim();
    }
    if (!allData || typeof allData !== 'object') return '';

    const recon = allData.RECONCILIATION || allData.Reconciliation || allData.reconciliation || {};
    const candidates = [
        recon['as of'],
        recon['as of date'],
        recon['as of Date'],
        recon['Appraisal Effective Date'],
        recon['Effective Date of Appraisal'],
        recon['Effective Date'],
        allData['as of'],
        allData['as of date'],
        allData['as of Date'],
        allData.Subject?.['as of'],
        allData.Subject?.['as of date'],
        allData['Appraisal Effective Date'],
        allData['Effective Date of Appraisal'],
        allData['Effective Date'],
        allData.CERTIFICATION?.['Effective Date of Appraisal'],
        allData.Certification?.['Effective Date of Appraisal']
    ];

    for (const cand of candidates) {
        if (cand !== undefined && cand !== null && String(cand).trim() !== '') {
            const s = typeof cand === 'object' ? (cand.value ?? cand.text ?? '') : String(cand);
            if (s.trim()) return s.trim();
        }
    }
    return '';
};

export const checkContractDateVsAsOfDate = (field, text, data) => {
    const cleanField = String(field || '').trim().toLowerCase();
    const isContractDateField =
        cleanField === 'date of contract' ||
        cleanField === 'contract date';

    const isAsOfField =
        cleanField === 'as of' ||
        cleanField === 'as of date' ||
        cleanField === 'appraisal effective date';

    if (!isContractDateField && !isAsOfField) return null;

    const contractDateStr = getDateOfContractStr(data, isContractDateField ? text : null);
    const asOfDateStr = getAsOfDateStr(data, isAsOfField ? text : null);

    if (!contractDateStr || !asOfDateStr) return null;

    const contractDate = parseStandardDate(contractDateStr);
    const asOfDate = parseStandardDate(asOfDateStr);

    if (!contractDate) {
        if (isContractDateField) {
            return { isError: true, message: `Invalid Date of Contract format: '${contractDateStr}'.` };
        }
        return null;
    }

    if (!asOfDate) {
        if (isAsOfField) {
            return { isError: true, message: `Invalid 'as of' date format: '${asOfDateStr}'.` };
        }
        return null;
    }

    const contractTime = contractDate.getTime();
    const asOfTime = asOfDate.getTime();

    // The "Date of Contract" should be less than or equal to the "as of date" present at reconciliation section
    if (contractTime > asOfTime) {
        return {
            isError: true,
            section: 'Contract',
            field: field || 'Date of Contract',
            message: `Date of Contract (${contractDateStr}) must be less than or equal to the "as of" date (${asOfDateStr}) in the reconciliation section.`
        };
    }

    if (contractTime === asOfTime) {
        return {
            isMatch: true,
            section: 'Contract',
            field: field || 'Date of Contract',
            message: `Date of Contract (${contractDateStr}) is equal to the "as of" date (${asOfDateStr}) in the reconciliation section.`
        };
    }

    return {
        isMatch: true,
        section: 'Contract',
        field: field || 'Date of Contract',
        message: `Date of Contract (${contractDateStr}) is prior to the "as of" date (${asOfDateStr}) in the reconciliation section.`
    };
};

