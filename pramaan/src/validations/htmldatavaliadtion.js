export const normalizeLenderAddress = (str) => {
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
        .replace(/\bsuite\b/g, 'ste')
        .replace(/\bste\b/g, 'ste')
        .replace(/\bapt\b/g, 'apt')
        .replace(/\bapartment\b/g, 'apt')
        .replace(/\bunit\b/g, 'unit');
    return s.replace(/[^a-z0-9]/g, '');
};

export const areLenderAddressesMatching = (addr1, addr2) => {
    if (!addr1 || !addr2) return false;
    const n1 = normalizeLenderAddress(addr1);
    const n2 = normalizeLenderAddress(addr2);
    if (!n1 || !n2) return false;
    return n1 === n2;
};

export const checkLenderAddressHtmlConsistency = (field, text, allData) => {
    if (!allData) return null;

    const fieldLower = String(field || '').trim().toLowerCase();

    const isSubjectAddressField = (
        fieldLower === 'address (lender/client)' ||
        fieldLower === 'address(lender/client)' ||
        fieldLower === 'lender/client company address' ||
        fieldLower === 'lender/client address'
    );

    const isHtmlAddressField = (
        fieldLower === 'lender address' ||
        fieldLower === 'client address'
    );

    if (!isSubjectAddressField && !isHtmlAddressField) {
        return null;
    }

    const compData = allData?.comparisonData || allData?.clean_data?.comparisonData || (allData?.['Lender Address'] || allData?.['Client Address'] ? allData : null) || {};

    const getHtmlAddress = () => {
        return String(
            compData['Lender Address'] ||
            compData['LENDER ADDRESS'] ||
            compData['Client Address'] ||
            compData['CLIENT ADDRESS'] ||
            compData['lender address'] ||
            compData?.Subject?.['Lender Address'] ||
            compData?.Subject?.['LENDER ADDRESS'] ||
            ''
        ).trim();
    };

    const getSubjectAddress = () => {
        return String(
            allData?.Subject?.['Address (Lender/Client)'] ||
            allData?.Subject?.['ADDRESS (LENDER/CLIENT)'] ||
            allData?.['Address (Lender/Client)'] ||
            allData?.['ADDRESS (LENDER/CLIENT)'] ||
            allData?.clean_data?.Subject?.['Address (Lender/Client)'] ||
            allData?.clean_data?.Subject?.['ADDRESS (LENDER/CLIENT)'] ||
            allData?.clean_data?.['Address (Lender/Client)'] ||
            allData?.clean_data?.['ADDRESS (LENDER/CLIENT)'] ||
            allData?.data?.['Address (Lender/Client)'] ||
            allData?.data?.['ADDRESS (LENDER/CLIENT)'] ||
            allData?.CERTIFICATION?.['Lender/Client Company Address'] ||
            allData?.['Lender/Client Company Address'] ||
            allData?.clean_data?.CERTIFICATION?.['Lender/Client Company Address'] ||
            ''
        ).trim();
    };

    const htmlRaw = isHtmlAddressField
        ? (text !== undefined && text !== null ? String(text).trim() : '')
        : getHtmlAddress();

    const subjectRaw = isSubjectAddressField
        ? (text !== undefined && text !== null ? String(text).trim() : '')
        : getSubjectAddress();

    if (!htmlRaw || htmlRaw === 'N/A' || !subjectRaw || subjectRaw === 'N/A') {
        return null;
    }

    const matches = areLenderAddressesMatching(htmlRaw, subjectRaw);

    if (!matches) {
        return {
            isError: true,
            message: `Lender/Client Address mismatch. HTML: '${htmlRaw}', PDF: '${subjectRaw}'.`
        };
    }

    return {
        isMatch: true,
        message: isHtmlAddressField
            ? `Valid: Lender Address matches Subject Address '${subjectRaw}'.`
            : `Valid: Address (Lender/Client) matches HTML Lender Address '${htmlRaw}'.`
    };
};

export const checkLenderAddressInconsistency = checkLenderAddressHtmlConsistency;

export const normalizeLenderName = (val) => {
    if (!val || val === 'N/A') return '';
    return String(val)
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[\s.,#\-_/\\()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const stripTrailingLegalSuffix = (s) => {
    return String(s || '')
        .replace(/\b(llc|inc|corp|corporation|co|company|ltd|na|n a|fsb)\b$/i, '')
        .trim();
};

export const areLenderNamesMatching = (name1, name2) => {
    if (!name1 || !name2) return false;
    const n1 = normalizeLenderName(name1);
    const n2 = normalizeLenderName(name2);
    if (!n1 || !n2) return false;

    // 1. Exact match after whitespace and punctuation normalization
    if (n1 === n2) return true;

    // 2. Direct equality ignoring spaces
    const noSpace1 = n1.replace(/\s/g, '');
    const noSpace2 = n2.replace(/\s/g, '');
    if (noSpace1 === noSpace2) return true;

    // 3. Match with trailing legal suffix stripped (e.g. "BPL Mortgage, LLC" vs "BPL Mortgage")
    const base1 = stripTrailingLegalSuffix(n1);
    const base2 = stripTrailingLegalSuffix(n2);
    if (base1 && base2) {
        if (base1 === base2) return true;
        if (base1.replace(/\s/g, '') === base2.replace(/\s/g, '')) return true;
    }

    return false;
};

export const checkSubjectLenderNameVsHtml = (field, text, allData) => {
    if (!allData) return null;

    const fieldLower = String(field || '').trim().toLowerCase();

    const isSubjectSide = (
        fieldLower === 'lender/client' ||
        fieldLower === 'lender / client' ||
        fieldLower === 'client/lender' ||
        fieldLower === 'client / lender' ||
        fieldLower === 'lender/client name' ||
        fieldLower === 'lender/client company name'
    );

    const isHtmlSide = (
        fieldLower === 'client/lender on report' ||
        fieldLower === 'client / lender on report' ||
        fieldLower === 'client name' ||
        fieldLower === 'client/lender on order' ||
        fieldLower === 'lender on report'
    );

    if (!isSubjectSide && !isHtmlSide) {
        return null;
    }

    const compData = allData?.comparisonData || allData?.clean_data?.comparisonData || (allData?.['Client/Lender on Report'] || allData?.['Client Name'] ? allData : null) || {};

    const getHtmlLender = () => {
        return String(
            compData['Client/Lender on Report'] ||
            compData['CLIENT/LENDER ON REPORT'] ||
            compData['Client Name'] ||
            compData['CLIENT NAME'] ||
            compData['Company Name'] ||
            compData['client/lender on report'] ||
            compData?.Subject?.['Client/Lender on Report'] ||
            compData?.Subject?.['CLIENT/LENDER ON REPORT'] ||
            ''
        ).trim();
    };

    const getSubjectLender = () => {
        return String(
            allData?.Subject?.['Lender/Client'] ||
            allData?.Subject?.['LENDER/CLIENT'] ||
            allData?.['Lender/Client'] ||
            allData?.['LENDER/CLIENT'] ||
            allData?.clean_data?.Subject?.['Lender/Client'] ||
            allData?.clean_data?.Subject?.['LENDER/CLIENT'] ||
            allData?.clean_data?.['Lender/Client'] ||
            allData?.clean_data?.['LENDER/CLIENT'] ||
            allData?.data?.['Lender/Client'] ||
            allData?.data?.['LENDER/CLIENT'] ||
            allData?.CERTIFICATION?.['Lender/Client Company Name'] ||
            allData?.['Lender/Client Company Name'] ||
            allData?.clean_data?.CERTIFICATION?.['Lender/Client Company Name'] ||
            allData?.CERTIFICATION?.['LENDER/CLIENT Name'] ||
            ''
        ).trim();
    };

    const htmlRaw = isHtmlSide
        ? (text !== undefined && text !== null ? String(text).trim() : '')
        : getHtmlLender();

    const subjectRaw = isSubjectSide
        ? (text !== undefined && text !== null ? String(text).trim() : '')
        : getSubjectLender();

    if (!htmlRaw || htmlRaw === 'N/A' || !subjectRaw || subjectRaw === 'N/A') {
        return null;
    }

    const matches = areLenderNamesMatching(htmlRaw, subjectRaw);

    if (!matches) {
        return {
            isError: true,
            message: `Lender/Client mismatch. HTML: '${htmlRaw}', Subject Report: '${subjectRaw}'.`
        };
    }

    return {
        isMatch: true,
        message: isHtmlSide
            ? `Valid: Client/Lender on Report matches Subject Lender/Client '${subjectRaw}'.`
            : `Valid: Lender/Client matches HTML Client/Lender on Report '${htmlRaw}'.`
    };
};

export const checkLenderClientHtmlConsistency = checkSubjectLenderNameVsHtml;
export const checkClientLenderOnReportHtmlConsistency = checkSubjectLenderNameVsHtml;

export const checkBorrowerNameVsHtml = (field, text, allData) => {
    if (!allData || !allData.comparisonData || !allData.comparisonData['Borrower (and Co-Borrower)']) {
        return null;
    }

    const htmlBorrower = allData.comparisonData['Borrower (and Co-Borrower)'];
    const pdfBorrower = text;

    if (!htmlBorrower || htmlBorrower === 'N/A' || !pdfBorrower) {
        return null;
    }

    const getWords = (name) =>
        new Set(
            String(name || '')
                .toLowerCase()
                .split(/[^a-z0-9]+/)
                .filter(Boolean)
        );

    const htmlWords = getWords(htmlBorrower);
    const pdfWords = Array.from(getWords(pdfBorrower));

    const isMismatch = !pdfWords.every(word => htmlWords.has(word));

    if (isMismatch) {
        return {
            isError: true,
            message: `Borrower mismatch. HTML: '${htmlBorrower}', PDF: '${pdfBorrower}'.`
        };
    }

    return { isMatch: true };
};

export const normalizeTransactionType = (val) => {
    if (!val || val === 'N/A') return '';
    const clean = String(val)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    if (clean.includes('refinanc') || clean.includes('refi')) {
        return 'refinance';
    }
    if (clean.includes('purchas')) {
        return 'purchase';
    }
    if (clean.includes('other')) {
        return 'other';
    }
    return clean;
};

export const checkTransactionTypeHtmlConsistency = (field, text, allData) => {
    const fieldLower = String(field || '').trim().toLowerCase();
    const isSubjectAssignmentType = fieldLower === 'assignment type' || fieldLower === 'assignment_type';
    const isHtmlTransactionType = fieldLower === 'transaction type' || fieldLower === 'transaction_type';

    if (!isSubjectAssignmentType && !isHtmlTransactionType) {
        return null;
    }

    const compData = allData?.comparisonData || allData?.clean_data?.comparisonData || (allData?.['Transaction Type'] ? allData : null) || {};

    const htmlRaw = isHtmlTransactionType
        ? (text !== undefined && text !== null ? String(text).trim() : '')
        : String(
            compData['Transaction Type'] ||
            compData['TRANSACTION TYPE'] ||
            compData['transaction_type'] ||
            compData['Transaction type'] ||
            compData['transaction type'] ||
            compData?.Subject?.['Transaction Type'] ||
            compData?.Subject?.['TRANSACTION TYPE'] ||
            ''
        ).trim();

    const reportRaw = isSubjectAssignmentType
        ? (text !== undefined && text !== null ? String(text).trim() : '')
        : String(
            allData?.Subject?.['Assignment Type'] ||
            allData?.clean_data?.Subject?.['Assignment Type'] ||
            allData?.['Assignment Type'] ||
            allData?.CONTRACT?.['Assignment Type'] ||
            allData?.clean_data?.CONTRACT?.['Assignment Type'] ||
            allData?.data?.['Assignment Type'] ||
            ''
        ).trim();

    if (!htmlRaw || htmlRaw === 'N/A' || !reportRaw || reportRaw === 'N/A') {
        return null;
    }

    const normHtml = normalizeTransactionType(htmlRaw);
    const normReport = normalizeTransactionType(reportRaw);

    if (!normHtml || !normReport) {
        return null;
    }

    if (normHtml !== normReport) {
        return {
            isError: true,
            message: `Transaction Type mismatch. HTML: '${htmlRaw}', Report: '${reportRaw}'.`
        };
    }

    return {
        isMatch: true,
        message: `Valid: Assignment Type matches HTML Transaction Type '${htmlRaw}'.`
    };
};

export const checkAssignmentTypeHtmlConsistency = checkTransactionTypeHtmlConsistency;
