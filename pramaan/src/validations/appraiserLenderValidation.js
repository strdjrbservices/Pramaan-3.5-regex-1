import { findUnpaidLenderMatch } from '../utils/unpaidLenders';
import { areLenderNamesMatching, checkSubjectLenderNameVsHtml, checkLenderAddressHtmlConsistency, checkPropertyAddressHtmlConsistency as checkPropertyAddressHtmlConsistencyImpl, checkAppraiserVendorNameConsistency as checkAppraiserVendorNameConsistencyImpl } from './htmldatavaliadtion';

const checkNotBlank = (field, text, fieldName) => {
    if (field === fieldName) {
        if (!text || String(text).trim() === '') {
            return { isError: true, skipBlankFilter: true, message: `'${fieldName}' must not be blank.` };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkLenderAddressInconsistency = (field, text, data) => {
    const relevantFields = ['Address (Lender/Client)', 'Lender/Client Company Address'];
    if (!relevantFields.includes(field) || !data) return null;

    const normalize = (str) => {
        let s = String(str || '').toLowerCase();
        s = s.replace(/\bstreet\b|\bst\./g, 'st')
            .replace(/\bavenue\b|\bave\./g, 'ave')
            .replace(/\broad\b|\brd\./g, 'rd')
            .replace(/\bdrive\b|\bdr\./g, 'dr')
            .replace(/\bboulevard\b|\bblvd\./g, 'blvd')
            .replace(/\blane\b|\bln\./g, 'ln')
            .replace(/\bplace\b|\bpl\./g, 'pl')
            .replace(/\bcircle\b|\bcir\./g, 'cir')
            .replace(/\bcourt\b|\bct\./g, 'ct')
            .replace(/\bsuite\b|\bste\./g, 'ste');
        return s.replace(/[^a-z0-9]/g, '');
    };

    const subjectLenderAddress = String(data.Subject?.['Address (Lender/Client)'] || '').trim();
    const appraiserLenderAddress = String(data.CERTIFICATION?.['Lender/Client Company Address'] || '').trim();

    if (subjectLenderAddress && appraiserLenderAddress) {
        const normSubject = normalize(subjectLenderAddress);
        const normAppraiser = normalize(appraiserLenderAddress);

        if (normSubject !== normAppraiser && !normSubject.includes(normAppraiser) && !normAppraiser.includes(normSubject)) {
            return { isError: true, message: `Lender Address mismatch: Subject section has '${subjectLenderAddress}', but Appraiser section has '${appraiserLenderAddress}'.` };
        }
    }
    return { isMatch: true };
};

export const checkClientNameHtmlConsistency = (field, text, allData) => {
    return checkSubjectLenderNameVsHtml(field, text, allData);
};

export const checkClientAddressHtmlConsistency = (field, text, allData) => {
    return checkLenderAddressHtmlConsistency(field, text, allData);
};

export const checkBorrowerHtmlConsistency = (field, text, allData) => {
    const normalize = (str) =>
        String(str || '')
            .toLowerCase()
            .replace(/&/g, 'and')
            .replace(/[^a-z0-9]/g, '')
            .trim();

    if (field === 'Borrower') {
        if (!allData.comparisonData || !allData.comparisonData['Borrower (and Co-Borrower)'] || allData.comparisonData['Borrower (and Co-Borrower)'] === 'N/A') {
            return null;
        }

        const reportBorrower = String(text || '').trim();
        const htmlBorrower = String(allData.comparisonData['Borrower (and Co-Borrower)'] || '').trim();

        if (!htmlBorrower || !reportBorrower) {
            return null;
        }

        const normHtml = normalize(htmlBorrower);
        const normReport = normalize(reportBorrower);

        if (!normHtml.includes(normReport) && !normReport.includes(normHtml)) {
            return {
                isError: true,
                message: `Borrower mismatch. HTML: '${htmlBorrower}', Report: '${reportBorrower}'.`
            };
        }
        return { isMatch: true };
    } else if (field === 'Borrower (and Co-Borrower)') {
        const htmlBorrower = String(text || '').trim();
        const reportBorrower = String(allData?.Subject?.['Borrower'] || '').trim();

        if (!htmlBorrower || !reportBorrower || htmlBorrower === 'N/A') return null;

        const normHtml = normalize(htmlBorrower);
        const normReport = normalize(reportBorrower);

        if (!normHtml.includes(normReport) && !normReport.includes(normHtml)) {
            return {
                isError: true,
                message: `Borrower mismatch. HTML: '${htmlBorrower}', Report: '${reportBorrower}'.`
            };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkPropertyAddressHtmlConsistency = (field, text, allData, fieldPath) => {
    return checkPropertyAddressHtmlConsistencyImpl(field, text, allData, fieldPath);
};

export const checkAppraiserLicenseGroup = (field, text, allData, fieldPath) => {
    const isSupervisory = String(field || '').toLowerCase().includes('supervisory') ||
        (Array.isArray(fieldPath) && fieldPath.some(p => String(p).toLowerCase().includes('supervisory')));
    if (isSupervisory) return null;

    const groupFields = [
        "State Certification #",
        "or State License #",
        "or Other (describe)",
        "State #"
    ];

    if (!groupFields.includes(field)) return null;

    const certObj = allData?.CERTIFICATION || allData || {};
    const certNo = String(certObj["State Certification #"] || allData?.["State Certification #"] || '').trim();
    const licNo = String(certObj["or State License #"] || allData?.["or State License #"] || '').trim();
    const otherNo = String(certObj["or Other (describe)"] || allData?.["or Other (describe)"] || '').trim();
    const stateNo = String(certObj["State #"] || allData?.["State #"] || '').trim();

    if (certNo || licNo || otherNo || stateNo) {
        return { isMatch: true };
    }

    return {
        isError: true,
        skipBlankFilter: true,
        message: "At least one of 'State Certification #', 'or State License #', 'or Other (describe)', or 'State #' must be filled."
    };
};

export const checkAppraiserFieldsNotBlank = (field, text, allData, fieldPath) => {
    const isSupervisory = String(field || '').toLowerCase().includes('supervisory') ||
        (Array.isArray(fieldPath) && fieldPath.some(p => String(p).toLowerCase().includes('supervisory')));
    if (isSupervisory) return null;

    const fieldsToCheck = [
        "Signature",
        "Name",
        "Company Name",
        "Appraiser License",
        "Company Address",
        "Telephone Number",
        // "Email Address",
        "Date of Signature and Report",
        "Effective Date of Appraisal",
        "State",
        "Expiration Date of Certification or License",
        "ADDRESS OF PROPERTY APPRAISED",
        "APPRAISED VALUE OF SUBJECT PROPERTY $",
        "LENDER/CLIENT Name",
        "Lender/Client Company Name",
        "Lender/Client Company Address",
        // "Lender/Client Email Address",
        "Appraiser Certifications",
        "Appraiser Signature",
        "Appraiser Name",
        "Appraiser Credential Level",
        "Appraiser ID",
        "Appraiser State",
        "Appraiser License Expiration Date",
        "Policy Period From",
        "Policy Period To",
        "License Valid To",
        "License Vaild To",
        "E&O Insurance",
        "E&O",
        "E&O Present",
        "E/O",
        "E/O Present",
        "E/O Insurance",
        "LICENSE/REGISTRATION/CERTIFICATION #"
    ];
    return checkNotBlank(field, text, fieldsToCheck.find(f => f === field));
};

export const checkLenderNameInconsistency = (field, text, data) => {
    const fLower = String(field || '').toLowerCase().trim();
    if (fLower !== 'lender/client' && fLower !== 'lender/client company name' && fLower !== 'client/lender on report') return null;

    const subjectLenderName = String((fLower === 'lender/client' ? text : null) || data?.Subject?.['Lender/Client'] || data?.['Lender/Client'] || data?.clean_data?.Subject?.['Lender/Client'] || '').trim();
    const appraiserCompanyName = String((fLower === 'lender/client company name' ? text : null) || data?.CERTIFICATION?.['Lender/Client Company Name'] || data?.['Lender/Client Company Name'] || '').trim();
    const appraiserLenderName = appraiserCompanyName;
    const htmlLenderName = String((fLower === 'client/lender on report' ? text : null) || data?.comparisonData?.['Client/Lender on Report'] || data?.comparisonData?.['CLIENT/LENDER ON REPORT'] || data?.comparisonData?.['Client Name'] || '').trim();

    const mismatches = [];

    if (subjectLenderName && appraiserLenderName && !areLenderNamesMatching(subjectLenderName, appraiserLenderName)) {
        mismatches.push(`Subject ('${subjectLenderName}') vs Certification ('${appraiserLenderName}')`);
    }

    if (subjectLenderName && htmlLenderName && htmlLenderName !== 'N/A' && !areLenderNamesMatching(subjectLenderName, htmlLenderName)) {
        mismatches.push(`Subject ('${subjectLenderName}') vs HTML ('${htmlLenderName}')`);
    }

    if (appraiserLenderName && htmlLenderName && htmlLenderName !== 'N/A' && !areLenderNamesMatching(appraiserLenderName, htmlLenderName)) {
        mismatches.push(`Certification ('${appraiserLenderName}') vs HTML ('${htmlLenderName}')`);
    }

    if (mismatches.length > 0) {
        return { isError: true, message: `Lender/Client Company Name mismatch found between: ${mismatches.join('; ')}.` };
    }

    return { isMatch: true };
};

export const checkLicenseNumberConsistency = (field, text, data) => {
    if (field !== 'LICENSE/REGISTRATION/CERTIFICATION #') return null;

    const licenseNumber = String(text || '').trim();
    if (!licenseNumber) return null;

    const certificationData = data?.CERTIFICATION;
    if (!certificationData) return null;

    const stateCert = String(certificationData['State Certification #'] || '').trim();
    const stateLicense = String(certificationData['or State License #'] || '').trim();
    const otherLicense = String(certificationData['or Other (describe)'] || '').trim();
    const stateNumber = String(certificationData['State #'] || '').trim();

    const possibleMatches = [stateCert, stateLicense, otherLicense, stateNumber].filter(Boolean);

    if (possibleMatches.length > 0 && !possibleMatches.includes(licenseNumber)) {
        return { isError: true, message: `License number mismatch. Expected to match one of: State Certification #, State License #, Other, or State #.` };
    }

    return { isMatch: true };
};

export const checkAppraiserVendorNameConsistency = (field, text, allData, fieldPath) => {
    return checkAppraiserVendorNameConsistencyImpl(field, text, allData, fieldPath);
};

export const checkDateGreaterThanToday = (field, text) => {
    const fieldsToCheck = ['Policy Period To', 'License Vaild To', 'License Valid To'];
    if (!fieldsToCheck.includes(field)) return null;

    if (!text || String(text).trim() === '') {
        return null;
    }

    const inputDate = new Date(text);
    if (isNaN(inputDate.getTime())) {
        return { isError: true, skipBlankFilter: true, message: `Invalid date format for '${field}'.` };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (inputDate <= today) {
        return { isError: true, skipBlankFilter: true, message: `'${field}' must be a future date.` };
    }

    return { isMatch: true };
};

export const parseStandardDate = (dateInput) => {
    if (!dateInput && dateInput !== 0) return null;
    const val = typeof dateInput === 'object' && dateInput !== null ? (dateInput.value ?? dateInput.text ?? '') : String(dateInput);
    const trimmed = String(val).trim();
    if (!trimmed) return null;

    // MM/DD/YYYY or M/D/YYYY
    const mdy4 = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (mdy4) {
        const month = parseInt(mdy4[1], 10) - 1;
        const day = parseInt(mdy4[2], 10);
        const year = parseInt(mdy4[3], 10);
        const d = new Date(year, month, day);
        d.setHours(0, 0, 0, 0);
        return isNaN(d.getTime()) ? null : d;
    }

    // MM/DD/YY or M/D/YY
    const mdy2 = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})$/);
    if (mdy2) {
        const month = parseInt(mdy2[1], 10) - 1;
        const day = parseInt(mdy2[2], 10);
        const yy = parseInt(mdy2[3], 10);
        const year = yy >= 70 ? 1900 + yy : 2000 + yy;
        const d = new Date(year, month, day);
        d.setHours(0, 0, 0, 0);
        return isNaN(d.getTime()) ? null : d;
    }

    // YYYY-MM-DD or YYYY/MM/DD
    const ymd = trimmed.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
    if (ymd) {
        const year = parseInt(ymd[1], 10);
        const month = parseInt(ymd[2], 10) - 1;
        const day = parseInt(ymd[3], 10);
        const d = new Date(year, month, day);
        d.setHours(0, 0, 0, 0);
        return isNaN(d.getTime()) ? null : d;
    }

    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) {
        const d = new Date(parsed);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    return null;
};

export const getSignatureDateStr = (allData, text) => {
    if (text !== undefined && text !== null && String(text).trim() !== '') {
        const s = typeof text === 'object' ? (text.value ?? '') : String(text);
        if (s.trim()) return s.trim();
    }
    if (!allData || typeof allData !== 'object') return '';
    const cert = allData.CERTIFICATION || allData.Certification || allData.APPRAISER || allData;
    const candidates = [
        cert?.['Date of Signature and Report'],
        cert?.['Date of Signature'],
        cert?.['Date Signed'],
        cert?.['Report Signed Date'],
        cert?.['Signature Date'],
        allData['Date of Signature and Report'],
        allData['Date of Signature'],
        allData['Date Signed'],
        allData['Report Signed Date']
    ];
    for (const cand of candidates) {
        if (cand !== undefined && cand !== null && String(cand).trim() !== '') {
            const s = typeof cand === 'object' ? (cand.value ?? '') : String(cand);
            if (s.trim()) return s.trim();
        }
    }
    return '';
};

export const getEffectiveDateStr = (allData, text) => {
    if (text !== undefined && text !== null && String(text).trim() !== '') {
        const s = typeof text === 'object' ? (text.value ?? '') : String(text);
        if (s.trim()) return s.trim();
    }
    if (!allData || typeof allData !== 'object') return '';
    const cert = allData.CERTIFICATION || allData.Certification || allData.APPRAISER || allData;
    const candidates = [
        cert?.['Effective Date of Appraisal'],
        cert?.['Effective Date'],
        cert?.['Appraisal Effective Date'],
        allData.RECONCILIATION?.['as of'],
        allData.Reconciliation?.['as of'],
        allData['Effective Date of Appraisal'],
        allData['Effective Date'],
        allData['Appraisal Effective Date'],
        allData['as of']
    ];
    for (const cand of candidates) {
        if (cand !== undefined && cand !== null && String(cand).trim() !== '') {
            const s = typeof cand === 'object' ? (cand.value ?? '') : String(cand);
            if (s.trim()) return s.trim();
        }
    }
    return '';
};

export const checkSignatureDateVsEffectiveDate = (field, text, allData) => {
    const cleanField = String(field || '').trim().toLowerCase();
    const isSignatureField =
        cleanField === 'date of signature and report' ||
        cleanField === 'date of signature' ||
        cleanField === 'date signed' ||
        cleanField === 'report signed date' ||
        cleanField === 'supervisory date of signature' ||
        cleanField === 'supervisory date signed' ||
        cleanField === 'supervisory appraiser date of signature';

    const isEffectiveField =
        cleanField === 'effective date of appraisal' ||
        cleanField === 'effective date';

    if (!isSignatureField && !isEffectiveField) return null;

    let sigDateStr = '';
    let effDateStr = '';

    if (isSignatureField) {
        sigDateStr = (text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : String(text)) : '').trim();
        if (!sigDateStr) {
            sigDateStr = getSignatureDateStr(allData);
        }
        effDateStr = getEffectiveDateStr(allData);
    } else {
        effDateStr = (text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : String(text)) : '').trim();
        if (!effDateStr) {
            effDateStr = getEffectiveDateStr(allData);
        }
        sigDateStr = getSignatureDateStr(allData);
    }

    if (!sigDateStr || !effDateStr) return null;

    const sigDate = parseStandardDate(sigDateStr);
    const effDate = parseStandardDate(effDateStr);

    if (!sigDate) {
        return { isError: true, message: `Invalid Date of Signature format: '${sigDateStr}'.` };
    }
    if (!effDate) {
        return { isError: true, message: `Invalid Effective Date format: '${effDateStr}'.` };
    }

    const sigTime = sigDate.getTime();
    const effTime = effDate.getTime();

    if (sigTime <= effTime) {
        return {
            isError: true,
            message: `The signature date (${sigDateStr}) should always be greater than the effective date (${effDateStr}) in the certification section.`
        };
    }

    return {
        isMatch: true,
        message: `Signature Date (${sigDateStr}) is greater than Effective Date (${effDateStr}) and validated.`
    };
};

export const checkSupervisoryAppraiserFields = (field, text, allData, fieldPath) => {
    const fieldStr = String(field || '').trim();

    const isSupervisoryKey = fieldStr.toLowerCase().includes('supervisory') ||
        (fieldPath && Array.isArray(fieldPath) && fieldPath.some(p => String(p).toUpperCase().includes('SUPERVISORY')));

    if (!isSupervisoryKey) return null;

    // Determine clean display field name
    let displayField = fieldStr;
    if (!displayField.toLowerCase().startsWith('supervisory')) {
        displayField = `Supervisory ${displayField}`;
    }

    const val = String(text || '').trim();

    // Check if value is blank or not present
    const isBlankOrNotPresent = (v) => {
        if (v === undefined || v === null) return true;
        const s = String(v).trim().toLowerCase();
        return (
            s === '' ||
            s === 'not present' ||
            s === 'n/a' ||
            s === 'na' ||
            s === 'none' ||
            s === 'null' ||
            s === 'undefined' ||
            s === 'false' ||
            s === 'no'
        );
    };

    const isNotPresent = isBlankOrNotPresent(val);

    // Supervisory section is (only if required): if blank/not present, no validation error or false green match
    if (isNotPresent) {
        return null;
    }

    // If Supervisory section is filled, flag as RED error/alert requiring review
    return {
        isError: true,
        message: `Supervisory Appraiser is filled: '${displayField}' has value '${val}'. Supervisory Appraiser requires review.`
    };
};

export const checkReasonableExposureTime = (field, text) => {
    const rawVal = String(text || '').trim();
    if (!rawVal) {
        return { isError: true, skipBlankFilter: true, message: "Reasonable Exposure Time must not be blank." };
    }
    if (/^(\[?USPAP\s+defines\b|estimated\s+length\s+of\s+time)/i.test(rawVal)) {
        return { isError: true, message: "Error: Definition boilerplate captured instead of actual exposure time." };
    }
    return { isMatch: true, message: `Reasonable Exposure Time verified ('${rawVal}').` };
};

export const checkAppraiserInspection = (field, text, allData) => {
    const val = String(text || '').trim().toLowerCase();
    if (field.includes('Did not inspect')) {
        if (val === 'yes' || val === 'true') {
            return { isError: true, message: "Warning: Appraiser marked 'Did not inspect subject property'." };
        }
        return { isMatch: true };
    }
    if (field.includes('interior and exterior') || field.includes('Interior and Exterior')) {
        if (val === 'yes' || val === 'true') {
            return { isMatch: true, message: "Verified: Appraiser inspected interior and exterior of subject property." };
        }
    }
    return null;
};

export const checkUnpaidLender = (field, text, data) => {
    const relevantFields = ['Lender/Client', 'Client/Lender Company Name', 'LENDER/CLIENT Name', 'Lender/Client Company Name', 'Client Name', 'Client/Lender on Report'];
    if (!relevantFields.includes(field) || !text) return null;

    const lender = String(text || '').trim();
    if (!lender) return null;

    const match = findUnpaidLenderMatch(lender, data);
    if (match) {
        return {
            isMatch: true,
            message: `Unpaid lender in the list found :- ${match.lenderName || match.configName}`
        };
    }
    return null;
};

export const checkUspapReportingOption = (field, text, allData) => {
    const rawVal = String(text || '').trim();
    if (!rawVal) {
        return { isError: true, message: "USPAP reporting option must not be blank." };
    }

    const valLower = rawVal.toLowerCase();
    const isRestricted = valLower.includes('restricted');
    const isAppraisalReport = valLower.includes('appraisal report') && !isRestricted;

    if (isRestricted) {
        const comment = (
            allData?.['Comments on Appraisal and Report Identification'] ||
            allData?.['Restricted Appraisal Report Comment'] ||
            allData?.['USPAP Reporting Option Comment'] ||
            allData?.CERTIFICATION?.['Comments on Appraisal and Report Identification'] ||
            allData?.CERTIFICATION?.['Restricted Appraisal Report Comment'] ||
            allData?.Subject?.['Comments on Appraisal and Report Identification'] ||
            allData?.Subject?.['Restricted Appraisal Report Comment'] ||
            ''
        ).trim();

        if (comment) {
            return {
                isMatch: true,
                message: `validated (Restricted Appraisal Report with comment: "${comment.length > 50 ? comment.substring(0, 50) + '...' : comment}")`
            };
        } else {
            return {
                isError: true,
                message: "Restricted Appraisal Report is selected: Explanation comment is required under Comments on Appraisal and Report Identification."
            };
        }
    } else if (isAppraisalReport) {
        return {
            isMatch: true,
            message: "validated"
        };
    }

    return {
        isError: true,
        message: "Must be either 'Appraisal Report' or 'Restricted Appraisal Report'."
    };
};

export const extractPageNumbers = (val, pagesArray) => {
    if (Array.isArray(pagesArray) && pagesArray.length > 0) {
        return pagesArray.map(p => typeof p === 'number' ? p : parseInt(p, 10)).filter(n => !isNaN(n));
    }
    if (Array.isArray(val) && val.length > 0) {
        return val.map(p => typeof p === 'number' ? p : parseInt(p, 10)).filter(n => !isNaN(n));
    }
    if (val === null || val === undefined) return [];
    const str = typeof val === 'object' ? (val.value ?? val.text ?? '') : String(val);
    const trimmed = str.trim();
    if (!trimmed || trimmed.toLowerCase() === 'not present' || trimmed.toLowerCase() === 'no') {
        return [];
    }
    const pageMatch = trimmed.match(/page[s]?\s*[:(]?\s*([0-9,\s-]+)\)?/i);
    if (pageMatch) {
        const nums = pageMatch[1].match(/\d+/g);
        if (nums && nums.length > 0) {
            return nums.map(n => parseInt(n, 10));
        }
    }
    if (trimmed.toLowerCase().startsWith('present') || trimmed.toLowerCase().startsWith('yes')) {
        const nums = trimmed.match(/\d+/g);
        if (nums && nums.length > 0) {
            return nums.map(n => parseInt(n, 10));
        }
    }
    return [];
};

export const checkUadAndCertificationAddenda = (field, text, data) => {
    let allData = null;
    let textVal = text;

    if (data && typeof data === 'object') {
        allData = data;
    } else if (text && typeof text === 'object') {
        allData = text;
        textVal = null;
    } else if (field && typeof field === 'object') {
        allData = field;
        textVal = null;
    } else {
        allData = {};
    }

    const uadDetails = allData.uad_details || allData.Subject?.uad_details || allData.comparisonData?.uad_details || {};

    const rawUadVal = String(
        allData['UAD pages present in the report'] ||
        allData['UAD Pages Present in the Report'] ||
        allData['UAD Pages Present'] ||
        allData['UAD & Certification Addenda'] ||
        allData.Subject?.['UAD pages present in the report'] ||
        (allData.has_uad_pages ? 'Present' : '') ||
        (uadDetails.has_uad_pages ? 'Present' : '') ||
        ''
    ).trim();

    const isPresent = Boolean(
        allData.has_uad_pages ||
        allData.Subject?.has_uad_pages ||
        uadDetails.has_uad_pages ||
        rawUadVal.toLowerCase().startsWith('present') ||
        rawUadVal.toLowerCase() === 'yes' ||
        rawUadVal.toLowerCase() === 'true'
    );

    // If UAD & Certification Addenda is not present, then valid
    if (!isPresent) {
        return {
            isMatch: true,
            section: 'Certification & Addenda',
            field: field || 'UAD & Certification Addenda',
            message: 'UAD & Certification Addenda is not present (validation passed).'
        };
    }

    // When present, check compulsory:
    // 1. one page for Limiting Conditions
    const limitingPages = uadDetails.limiting_conditions_pages ||
        allData.limiting_conditions_pages ||
        allData.Subject?.limiting_conditions_pages ||
        [];
    const rawLimitingVal = (field === 'Limiting Conditions' || field === 'Statement of Assumptions and Limiting Conditions') && textVal
        ? textVal
        : (
            allData['Limiting Conditions'] ||
            allData['Statement of Assumptions and Limiting Conditions'] ||
            allData.Subject?.['Limiting Conditions'] ||
            uadDetails.limiting_conditions_presence ||
            ''
        );
    const limitingList = extractPageNumbers(rawLimitingVal, limitingPages);
    const limitingCount = limitingList.length;

    // 2. two pages for Appraiser Certification
    const certPages = uadDetails.certification_pages ||
        allData.certification_pages ||
        allData.Subject?.certification_pages ||
        [];
    const rawCertVal = (field === "Appraiser's Certification" || field === 'Appraiser Certification') && textVal
        ? textVal
        : (
            allData["Appraiser's Certification"] ||
            allData['Appraiser Certification'] ||
            allData.Subject?.["Appraiser's Certification"] ||
            uadDetails.certification_presence ||
            ''
        );
    const certList = extractPageNumbers(rawCertVal, certPages);
    const certCount = certList.length;

    // 3. three pages for UAD Definitions Addendum
    const uadPages = uadDetails.uad_pages ||
        allData.uad_pages ||
        allData.Subject?.uad_pages ||
        [];
    const rawUadDefVal = (field === 'UAD Definitions Addendum') && textVal
        ? textVal
        : (
            allData['UAD Definitions Addendum'] ||
            allData.Subject?.['UAD Definitions Addendum'] ||
            uadDetails.uad_presence ||
            rawUadVal
        );
    const uadList = extractPageNumbers(rawUadDefVal, uadPages);
    const uadCount = uadList.length;

    const isLimitingValid = limitingCount >= 1;
    const isCertValid = certCount >= 2;
    const isUadValid = uadCount >= 3;

    // If validating a specific subfield:
    if (field === 'Limiting Conditions' || field === 'Statement of Assumptions and Limiting Conditions') {
        if (!isLimitingValid) {
            return {
                isError: true,
                section: 'Certification & Addenda',
                field: 'Limiting Conditions',
                message: `Limiting Conditions requires 1 page (${limitingCount === 0 ? 'not present' : `found ${limitingCount} pages`}).`
            };
        }
        return {
            isMatch: true,
            section: 'Certification & Addenda',
            field: 'Limiting Conditions',
            message: `Limiting Conditions is valid (${limitingCount} page present).`
        };
    }

    if (field === "Appraiser's Certification" || field === 'Appraiser Certification') {
        if (!isCertValid) {
            return {
                isError: true,
                section: 'Certification & Addenda',
                field: 'Appraiser Certification',
                message: `Appraiser Certification requires 2 pages (${certCount === 0 ? 'not present' : `found ${certCount} page`}).`
            };
        }
        return {
            isMatch: true,
            section: 'Certification & Addenda',
            field: 'Appraiser Certification',
            message: `Appraiser Certification is valid (${certCount} pages present).`
        };
    }

    if (field === 'UAD Definitions Addendum') {
        if (!isUadValid) {
            return {
                isError: true,
                section: 'Certification & Addenda',
                field: 'UAD Definitions Addendum',
                message: `UAD Definitions Addendum requires 3 pages (${uadCount === 0 ? 'not present' : `found ${uadCount} pages`}).`
            };
        }
        return {
            isMatch: true,
            section: 'Certification & Addenda',
            field: 'UAD Definitions Addendum',
            message: `UAD Definitions Addendum is valid (${uadCount} pages present).`
        };
    }

    // Otherwise, validate the full addenda set
    const errors = [];
    if (!isLimitingValid) {
        errors.push(`Limiting Conditions requires 1 page (${limitingCount === 0 ? 'not present' : `found ${limitingCount} page${limitingCount > 1 ? 's' : ''}`})`);
    }
    if (!isCertValid) {
        errors.push(`Appraiser Certification requires 2 pages (${certCount === 0 ? 'not present' : `found ${certCount} page`})`);
    }
    if (!isUadValid) {
        errors.push(`UAD Definitions Addendum requires 3 pages (${uadCount === 0 ? 'not present' : `found ${uadCount} page${uadCount > 1 ? 's' : ''}`})`);
    }

    if (errors.length > 0) {
        return {
            isError: true,
            section: 'Certification & Addenda',
            field: 'UAD & Certification Addenda',
            message: `UAD & Certification Addenda error: Missing compulsory pages: ${errors.join('; ')}.`
        };
    }

    return {
        isMatch: true,
        section: 'Certification & Addenda',
        field: 'UAD & Certification Addenda',
        message: `UAD & Certification Addenda is valid: Limiting Conditions (${limitingCount} page${limitingCount > 1 ? 's' : ''}), Appraiser Certification (${certCount} pages), and UAD Definitions Addendum (${uadCount} pages) are present.`
    };
};



