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
        s = s.replace(/\bstreet\b/g, 'st')
            .replace(/\bavenue\b/g, 'ave')
            .replace(/\broad\b/g, 'rd')
            .replace(/\bdrive\b/g, 'dr')
            .replace(/\bboulevard\b/g, 'blvd')
            .replace(/\blane\b/g, 'ln')
            .replace(/\bplace\b/g, 'pl')
            .replace(/\bcircle\b/g, 'cir')
            .replace(/\bcourt\b/g, 'ct')
            .replace(/\bsuite\b/g, 'ste');
        return s.replace(/[\s.,#\-']/g, '');
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
            .replace(/[.,]/g, '')
            .replace(/\s+/g, ' ')
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

    return {
        isMatch: true,
        message: `'${displayField}' is verified.`
    };
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


