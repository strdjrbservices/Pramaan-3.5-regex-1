export const normalizeLenderAddress = (str) => {
    if (!str || str === 'N/A') return '';
    let s = String(str || '').toLowerCase();
    s = s.replace(/#\s*([0-9a-z]+)/g, 'apt$1')
        .replace(/\bstreet\b|\bst\./g, 'st')
        .replace(/\bavenue\b|\bave\./g, 'ave')
        .replace(/\broad\b|\brd\./g, 'rd')
        .replace(/\bdrive\b|\bdr\./g, 'dr')
        .replace(/\bboulevard\b|\bblvd\./g, 'blvd')
        .replace(/\blane\b|\bln\./g, 'ln')
        .replace(/\bplace\b|\bpl\./g, 'pl')
        .replace(/\bcircle\b|\bcir\./g, 'cir')
        .replace(/\bcourt\b|\bct\./g, 'ct')
        .replace(/\bsuite\b|\bste\./g, 'ste')
        .replace(/\bste\b/g, 'ste')
        .replace(/\bapt\b|\bapt\./g, 'apt')
        .replace(/\bapartment\b/g, 'apt')
        .replace(/\bunit\b/g, 'unit')
        .replace(/\bnorth\b|\bn\./g, 'n')
        .replace(/\bsouth\b|\bs\./g, 's')
        .replace(/\beast\b|\be\./g, 'e')
        .replace(/\bwest\b|\bw\./g, 'w');
    // Remove all spaces, commas, and any special characters
    return s.replace(/[^a-z0-9]/g, '');
};

export const areLenderAddressesMatching = (addr1, addr2) => {
    if (!addr1 || !addr2) return false;
    const s1 = String(addr1).trim();
    const s2 = String(addr2).trim();
    if (s1 === 'N/A' || s2 === 'N/A' || !s1 || !s2) return false;

    // Helper: strip all spaces, commas, and any special characters
    const stripAll = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const clean1 = stripAll(s1);
    const clean2 = stripAll(s2);
    if (!clean1 || !clean2) return false;

    // 1. Direct match ignoring spaces, commas, and all special characters
    if (clean1 === clean2) return true;

    // 2. Normalized road and suite abbreviations comparison
    const n1 = normalizeLenderAddress(s1);
    const n2 = normalizeLenderAddress(s2);
    if (n1 && n2 && n1 === n2) return true;

    // 3. Direct match with unit/apt/suite keywords stripped
    const stripUnitWords = (s) => String(s || '').toLowerCase()
        .replace(/\b(suite|ste|unit|apartment|apt)\b/g, '')
        .replace(/[^a-z0-9]/g, '');
    const noUnit1 = stripUnitWords(n1);
    const noUnit2 = stripUnitWords(n2);
    if (noUnit1 && noUnit2 && noUnit1 === noUnit2) return true;

    // 4. Inclusion check (e.g. suite number or zip code differences) if house/street numbers match
    const nums1 = (n1.match(/\d+/g) || clean1.match(/\d+/g)) || [];
    const nums2 = (n2.match(/\d+/g) || clean2.match(/\d+/g)) || [];

    // If zip codes exist at the end and they are of equal length but different (e.g. 60181 vs 60182) or extra digit (601811 vs 60181), do not match
    if (nums1.length > 0 && nums2.length > 0) {
        const last1 = nums1[nums1.length - 1];
        const last2 = nums2[nums2.length - 1];
        if (last1.length >= 5 && last2.length >= 5 && last1 !== last2) {
            return false;
        }
    }

    if ((clean1.includes(clean2) || clean2.includes(clean1) || (n1 && n2 && (n1.includes(n2) || n2.includes(n1)))) &&
        (nums1.length === 0 || nums2.length === 0 || nums1[0] === nums2[0])) {
        return true;
    }

    return false;
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
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const stripTrailingLegalSuffix = (s) => {
    let cur = String(s || '').trim();
    cur = cur.replace(/,?\s*(?:its\s+successors.*|isaoa.*|atima.*)$/i, '').trim();
    let prev = '';
    while (cur !== prev) {
        prev = cur;
        cur = cur.replace(/\b(llc|inc|corp|corporation|co|company|ltd|na|n a|fsb)\b$/i, '').trim();
    }
    return cur;
};

export const areLenderNamesMatching = (name1, name2) => {
    if (!name1 || !name2) return false;
    const s1 = String(name1).trim();
    const s2 = String(name2).trim();
    if (!s1 || !s2 || s1 === 'N/A' || s2 === 'N/A') return false;

    // Helper: strip all spaces, commas, and any special characters
    const stripAll = (s) => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

    const clean1 = stripAll(s1);
    const clean2 = stripAll(s2);
    if (!clean1 || !clean2) return false;

    // 1. Direct equality ignoring spaces, commas, and all special characters
    if (clean1 === clean2) return true;

    // 2. Normalized word equality
    const n1 = normalizeLenderName(s1);
    const n2 = normalizeLenderName(s2);
    if (n1 === n2) return true;

    // 3. Direct equality ignoring spaces from normalized form
    const noSpace1 = n1.replace(/[^a-z0-9]/g, '');
    const noSpace2 = n2.replace(/[^a-z0-9]/g, '');
    if (noSpace1 === noSpace2) return true;

    // Also check with parentheses content stripped (e.g. "(PRMG)")
    const noParen1 = stripAll(s1.replace(/\([^)]*\)/g, ' '));
    const noParen2 = stripAll(s2.replace(/\([^)]*\)/g, ' '));
    if (noParen1 && noParen2 && noParen1 === noParen2) return true;

    // 4. Match with trailing legal suffix stripped (e.g. "BPL Mortgage, LLC" vs "BPL Mortgage")
    const base1 = stripTrailingLegalSuffix(n1);
    const base2 = stripTrailingLegalSuffix(n2);
    if (base1 && base2) {
        if (base1 === base2) return true;
        if (stripAll(base1) === stripAll(base2)) return true;
    }

    const rawBase1 = stripTrailingLegalSuffix(s1);
    const rawBase2 = stripTrailingLegalSuffix(s2);
    if (rawBase1 && rawBase2) {
        if (stripAll(rawBase1) === stripAll(rawBase2)) return true;
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
        fieldLower === 'lender/client company name' ||
        fieldLower === 'client/lender company name'
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

export const parseAppraisalType = (str) => {
    if (!str || str === 'N/A') return null;
    const s = String(str).trim();
    if (!s) return null;
    const upper = s.toUpperCase();

    // Check for 1007 presence (e.g. "w/ 1007", "with 1007", "+ 1007", "/ 1007", "Rent Schedule")
    const has1007 = /\b1007\b|SINGLE\s*FAMILY\s*(?:COMPARABLE\s*)?RENT|RENT\s*SCHEDULE|W\s*\/\s*1007|WITH\s+1007|\+\s*1007|\/\s*1007/i.test(s);

    // Identify primary form code
    let primary = null;
    if (/\b1004C\b|MANUFACTURED/i.test(upper)) {
        primary = '1004C';
    } else if (/\b1004D\b|COMPLETION/i.test(upper)) {
        primary = '1004D';
    } else if (/\b1004MC\b|MARKET\s*CONDITIONS/i.test(upper)) {
        primary = '1004MC';
    } else if (/\b1025\b|SMALL\s*RESIDENTIAL|2-4\s*UNIT|MULTI[-\s]*FAMILY/i.test(upper)) {
        primary = '1025';
    } else if (/\b1073\b|CONDO|CONDOMINIUM|FRE\s*465/i.test(upper)) {
        primary = '1073';
    } else if (/\b1075\b/i.test(upper)) {
        primary = '1075';
    } else if (/\b2055\b|EXTERIOR/i.test(upper)) {
        primary = '2055';
    } else if (/\b2090\b/i.test(upper)) {
        primary = '2090';
    } else if (/\b2095\b/i.test(upper)) {
        primary = '2095';
    } else if (/\b203K\b/i.test(upper)) {
        primary = '203k-FHA';
    } else if (/\b(?:VERSION\s*#?1|APPRAISAL\s*VERSION\s*#?1)\b/i.test(upper)) {
        primary = 'Appraisal Version #1';
    } else if (/\b(?:ERC|ECR)\b/i.test(upper)) {
        primary = 'ERC';
    } else if (/\b216\b|OPERATING\s*INCOME/i.test(upper)) {
        primary = '216';
    } else if (/\b1004\b|URAR|FRE\s*70/i.test(upper)) {
        primary = '1004';
    } else if (has1007) {
        primary = '1007';
    }

    if (!primary) {
        const match = upper.match(/\b(\d{4}[A-Z]?)\b/);
        if (match) {
            primary = match[1];
        } else {
            primary = upper.replace(/[^A-Z0-9]/g, '');
        }
    }

    const canonical = (primary && primary !== '1007' && has1007)
        ? `${primary} + 1007`
        : primary;

    return {
        primary,
        has1007: primary === '1007' ? true : has1007,
        canonical
    };
};

export const areAppraisalTypesMatching = (type1, type2) => {
    if (!type1 || !type2) return false;
    const parsed1 = typeof type1 === 'object' && type1 !== null ? type1 : parseAppraisalType(type1);
    const parsed2 = typeof type2 === 'object' && type2 !== null ? type2 : parseAppraisalType(type2);
    if (!parsed1 || !parsed2) return false;

    if (parsed1.canonical && parsed2.canonical) {
        if (parsed1.canonical.toUpperCase() === parsed2.canonical.toUpperCase()) {
            return true;
        }
    }

    if (parsed1.primary && parsed2.primary) {
        if (parsed1.primary.toUpperCase() === parsed2.primary.toUpperCase()) {
            if (parsed1.primary === '1007') return true;
            return parsed1.has1007 === parsed2.has1007;
        }
    }

    return false;
};

export const checkAppraisalTypeHtmlConsistency = (field, text, allData) => {
    if (!allData) return null;

    const fieldLower = String(field || '').trim().toLowerCase();
    const isHtmlSide = fieldLower === 'appraisal type' || fieldLower === 'appraisal_type';
    const isReportSide = (
        fieldLower === 'from type' ||
        fieldLower === 'form type' ||
        fieldLower === 'form_type'
    );

    if (!isHtmlSide && !isReportSide) {
        return null;
    }

    const compData = allData?.comparisonData || allData?.clean_data?.comparisonData || (allData?.['Appraisal Type'] || allData?.['APPRAISAL TYPE'] ? allData : null) || {};

    const getHtmlAppraisalType = () => {
        return String(
            compData['Appraisal Type'] ||
            compData['APPRAISAL TYPE'] ||
            compData['appraisal_type'] ||
            compData['appraisal type'] ||
            compData?.Subject?.['Appraisal Type'] ||
            compData?.Subject?.['APPRAISAL TYPE'] ||
            allData?.['Appraisal Type'] ||
            allData?.['APPRAISAL TYPE'] ||
            ''
        ).trim();
    };

    const getReportFormType = () => {
        return String(
            allData?.['From Type'] ||
            allData?.['Form Type'] ||
            allData?.formType ||
            allData?.selectedFormType ||
            allData?.clean_data?.['From Type'] ||
            allData?.clean_data?.['Form Type'] ||
            allData?.clean_data?.formType ||
            allData?.Subject?.['Form Type'] ||
            allData?.Subject?.['From Type'] ||
            allData?.data?.['From Type'] ||
            allData?.data?.['Form Type'] ||
            ''
        ).trim();
    };

    const htmlRaw = isHtmlSide
        ? (text !== undefined && text !== null && String(text).trim() !== '' ? String(text).trim() : getHtmlAppraisalType())
        : getHtmlAppraisalType();

    const reportRaw = isReportSide
        ? (text !== undefined && text !== null && String(text).trim() !== '' ? String(text).trim() : getReportFormType())
        : getReportFormType();

    if (!htmlRaw || htmlRaw === 'N/A' || !reportRaw || reportRaw === 'N/A') {
        return null;
    }

    const matches = areAppraisalTypesMatching(htmlRaw, reportRaw);

    if (!matches) {
        return {
            isError: true,
            message: `Appraisal Type mismatch. HTML: '${htmlRaw}', XML/Report Form Type: '${reportRaw}'.`
        };
    }

    return {
        isMatch: true,
        message: isHtmlSide
            ? `Valid: Appraisal Type matches XML Form Type '${reportRaw}'.`
            : `Valid: Form Type matches HTML Appraisal Type '${htmlRaw}'.`
    };
};

export const checkFormTypeHtmlConsistency = checkAppraisalTypeHtmlConsistency;

export const normalizeCounty = (val) => {
    if (!val || val === 'N/A') return '';
    let s = String(val).toLowerCase().trim();
    // Remove trailing or standalone "county", "co.", "co", "parish", "borough"
    s = s.replace(/\bcounty\b/gi, '')
        .replace(/\bco\.?\b/gi, '')
        .replace(/\bparish\b/gi, '')
        .replace(/\bborough\b/gi, '');
    // Normalize punctuation to spaces
    s = s.replace(/[\s.,#\-_/\\()']/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return s;
};

export const areCountiesMatching = (c1, c2) => {
    if (!c1 || !c2) return false;
    const n1 = normalizeCounty(c1);
    const n2 = normalizeCounty(c2);
    if (!n1 || !n2) return false;

    // 1. Direct equality
    if (n1 === n2) return true;

    // 2. Direct equality ignoring spaces
    const noSpace1 = n1.replace(/\s/g, '');
    const noSpace2 = n2.replace(/\s/g, '');
    if (noSpace1 === noSpace2) return true;

    // 3. Substring check if length >= 3
    if (n1.length >= 3 && n2.length >= 3) {
        if (n1.includes(n2) || n2.includes(n1)) return true;
    }

    return false;
};

export const checkCountyHtmlConsistency = (field, text, allData) => {
    if (!allData) return null;

    const fieldLower = String(field || '').trim().toLowerCase();
    const isHtmlSide = fieldLower === 'property county' || fieldLower === 'property_county';
    const isSubjectSide = fieldLower === 'county';

    if (!isHtmlSide && !isSubjectSide) {
        return null;
    }

    const compData = allData?.comparisonData || allData?.clean_data?.comparisonData || (
        allData?.['Property County'] || allData?.['PROPERTY COUNTY'] || allData?.County || allData?.COUNTY ? allData : null
    ) || {};

    const getHtmlCounty = () => {
        return String(
            compData['Property County'] ||
            compData['PROPERTY COUNTY'] ||
            compData['property county'] ||
            compData['property_county'] ||
            compData['County'] ||
            compData['COUNTY'] ||
            compData['county'] ||
            compData?.Subject?.['Property County'] ||
            compData?.Subject?.['County'] ||
            allData?.['Property County'] ||
            allData?.['PROPERTY COUNTY'] ||
            ''
        ).trim();
    };

    const getSubjectCounty = () => {
        return String(
            allData?.Subject?.County ||
            allData?.Subject?.COUNTY ||
            allData?.Subject?.county ||
            allData?.['County'] ||
            allData?.['COUNTY'] ||
            allData?.county ||
            allData?.clean_data?.Subject?.County ||
            allData?.clean_data?.Subject?.COUNTY ||
            allData?.clean_data?.['County'] ||
            allData?.clean_data?.['COUNTY'] ||
            allData?.data?.Subject?.County ||
            allData?.data?.['County'] ||
            ''
        ).trim();
    };

    const htmlRaw = isHtmlSide
        ? (text !== undefined && text !== null && String(text).trim() !== '' ? String(text).trim() : getHtmlCounty())
        : getHtmlCounty();

    const subjectRaw = isSubjectSide
        ? (text !== undefined && text !== null && String(text).trim() !== '' ? String(text).trim() : getSubjectCounty())
        : getSubjectCounty();

    if (!htmlRaw || htmlRaw === 'N/A' || !subjectRaw || subjectRaw === 'N/A') {
        return null;
    }

    const matches = areCountiesMatching(htmlRaw, subjectRaw);

    if (!matches) {
        return {
            isError: true,
            message: `County mismatch. HTML: '${htmlRaw}', Subject: '${subjectRaw}'.`
        };
    }

    return {
        isMatch: true,
        message: isHtmlSide
            ? `Valid: Property County matches Subject County '${subjectRaw}'.`
            : `Valid: County matches HTML Property County '${htmlRaw}'.`
    };
};

export const checkPropertyCountyHtmlConsistency = checkCountyHtmlConsistency;

export const cleanHtmlAddress = (addr) => {
    if (!addr || addr === 'N/A') return '';
    let s = String(addr).trim();
    // Strip trailing Map, Zillow, View Map, Google Map, Directions, etc.
    s = s.replace(/[\s,.-]*(?:map\s*zillow|zillow\s*map|view\s*map|google\s*map|map|zillow|directions)\s*$/gi, '').trim();
    s = s.replace(/[\s,.-]+$/, '').trim();
    return s;
};

export const normalizeAddress = (addr) => {
    if (!addr || addr === 'N/A') return '';
    let s = cleanHtmlAddress(addr).toLowerCase();

    // Standard road and direction abbreviations
    s = s.replace(/\bstreet\b|\bst\./g, 'st')
        .replace(/\bavenue\b|\bave\./g, 'ave')
        .replace(/\broad\b|\brd\./g, 'rd')
        .replace(/\bdrive\b|\bdr\./g, 'dr')
        .replace(/\bboulevard\b|\bblvd\./g, 'blvd')
        .replace(/\blane\b|\bln\./g, 'ln')
        .replace(/\bplace\b|\bpl\./g, 'pl')
        .replace(/\bcircle\b|\bcir\./g, 'cir')
        .replace(/\bcourt\b|\bct\./g, 'ct')
        .replace(/\bparkway\b|\bpkwy\./g, 'pkwy')
        .replace(/\bterrace\b|\bter\./g, 'ter')
        .replace(/\bhighway\b|\bhwy\./g, 'hwy')
        .replace(/\bway\b/g, 'way')
        .replace(/\btrail\b|\btrl\./g, 'trl')
        .replace(/\bsuite\b|\bste\./g, 'ste')
        .replace(/\bapt\b|\bapt\./g, 'apt')
        .replace(/\bapartment\b/g, 'apt')
        .replace(/\bunit\b/g, 'unit')
        .replace(/\bnorth\b|\bn\./g, 'n')
        .replace(/\bsouth\b|\bs\./g, 's')
        .replace(/\beast\b|\be\./g, 'e')
        .replace(/\bwest\b|\bw\./g, 'w');

    // Remove all spaces, commas, and any special characters
    return s.replace(/[^a-z0-9]/g, '');
};

export const getSubjectAddressInfo = (allData) => {
    const subj = allData?.Subject || allData?.clean_data?.Subject || allData?.data?.Subject || {};

    const street = String(
        subj['Property Address'] ||
        subj['PROPERTY ADDRESS'] ||
        subj['Street Address'] ||
        subj['Address'] ||
        allData?.['Property Address'] ||
        allData?.['PROPERTY ADDRESS'] ||
        allData?.clean_data?.['Property Address'] ||
        allData?.clean_data?.['PROPERTY ADDRESS'] ||
        ''
    ).trim();

    const full = String(
        subj['Full Address'] ||
        subj['FULL ADDRESS'] ||
        allData?.['Full Address'] ||
        allData?.['FULL ADDRESS'] ||
        allData?.clean_data?.['Full Address'] ||
        allData?.clean_data?.['FULL ADDRESS'] ||
        ''
    ).trim();

    const city = String(
        subj['City'] ||
        subj['CITY'] ||
        allData?.['City'] ||
        allData?.['CITY'] ||
        allData?.clean_data?.['City'] ||
        ''
    ).trim();

    const state = String(
        subj['State'] ||
        subj['STATE'] ||
        allData?.['State'] ||
        allData?.['STATE'] ||
        allData?.clean_data?.['State'] ||
        ''
    ).trim();

    const zip = String(
        subj['Zip Code'] ||
        subj['Zip'] ||
        subj['ZIP CODE'] ||
        subj['ZIP'] ||
        allData?.['Zip Code'] ||
        allData?.['Zip'] ||
        allData?.['ZIP CODE'] ||
        allData?.clean_data?.['Zip Code'] ||
        ''
    ).trim();

    const parts = [];
    if (street) parts.push(street);
    const cityState = [city, state].filter(Boolean).join(', ');
    const cityStateZip = cityState + (zip ? (cityState ? ' ' : '') + zip : '');
    if (cityStateZip) parts.push(cityStateZip);
    const constructed = parts.join(', ');

    return {
        street,
        city,
        state,
        zip,
        full: full || constructed,
        constructed
    };
};

export const getHtmlPropertyAddress = (allData) => {
    const compData = allData?.comparisonData || allData?.clean_data?.comparisonData || (
        allData?.['Property Address'] || allData?.['PROPERTY ADDRESS'] ? allData : null
    ) || {};

    return String(
        compData['Property Address'] ||
        compData['PROPERTY ADDRESS'] ||
        compData['property address'] ||
        compData['property_address'] ||
        compData?.Subject?.['Property Address'] ||
        compData?.Subject?.['PROPERTY ADDRESS'] ||
        allData?.['Property Address'] ||
        allData?.['PROPERTY ADDRESS'] ||
        ''
    ).trim();
};

export const arePropertyAddressesMatching = (htmlAddr, subjectInput) => {
    if (!htmlAddr || htmlAddr === 'N/A') return false;
    const cleanHtml = cleanHtmlAddress(htmlAddr);
    if (!cleanHtml) return false;

    // Helper: strip all spaces, commas, and any special characters
    const stripAll = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanRawHtml = stripAll(cleanHtml);
    if (!cleanRawHtml) return false;

    const normHtml = normalizeAddress(cleanHtml);

    if (typeof subjectInput === 'string') {
        const cleanRawSubj = stripAll(subjectInput);
        if (!cleanRawSubj) return false;

        // 1. Direct equality ignoring spaces, commas, and any special characters
        if (cleanRawHtml === cleanRawSubj) return true;

        const normSubj = normalizeAddress(subjectInput);
        if (normSubj && normHtml && normHtml === normSubj) return true;

        const htmlNums = (normHtml ? normHtml.match(/\d+/g) : null) || cleanRawHtml.match(/\d+/g) || [];
        const subjNums = (normSubj ? normSubj.match(/\d+/g) : null) || cleanRawSubj.match(/\d+/g) || [];

        if ((normSubj && normHtml && (normHtml.includes(normSubj) || normSubj.includes(normHtml))) ||
            cleanRawHtml.includes(cleanRawSubj) || cleanRawSubj.includes(cleanRawHtml)) {
            if (htmlNums.length > 0 && subjNums.length > 0) {
                if (htmlNums[0] !== subjNums[0]) return false;
            }
            return true;
        }
        return false;
    }

    const info = subjectInput;
    if (!info) return false;

    const cleanRawFull = stripAll(info.full);
    const cleanRawConstructed = stripAll(info.constructed);
    const cleanRawStreet = stripAll(info.street);

    // Direct equality ignoring all spaces, commas, and special characters
    if (cleanRawFull && cleanRawHtml === cleanRawFull) return true;
    if (cleanRawConstructed && cleanRawHtml === cleanRawConstructed) return true;
    if (cleanRawStreet && cleanRawHtml === cleanRawStreet) return true;

    // 1. Check Full Address
    if (info.full) {
        const normFull = normalizeAddress(info.full);
        if ((normFull && normHtml && (normHtml === normFull || normHtml.includes(normFull) || normFull.includes(normHtml))) ||
            (cleanRawFull && (cleanRawHtml === cleanRawFull || cleanRawHtml.includes(cleanRawFull) || cleanRawFull.includes(cleanRawHtml)))) {
            const htmlNums = (normHtml ? normHtml.match(/\d+/g) : null) || cleanRawHtml.match(/\d+/g) || [];
            const fullNums = (normFull ? normFull.match(/\d+/g) : null) || cleanRawFull.match(/\d+/g) || [];
            if (htmlNums.length === 0 || fullNums.length === 0 || htmlNums[0] === fullNums[0]) {
                return true;
            }
        }
    }

    // 2. Check Constructed Address (street + city + state + zip)
    if (info.constructed) {
        const normConstructed = normalizeAddress(info.constructed);
        if ((normConstructed && normHtml && (normHtml === normConstructed || normHtml.includes(normConstructed) || normConstructed.includes(normHtml))) ||
            (cleanRawConstructed && (cleanRawHtml === cleanRawConstructed || cleanRawHtml.includes(cleanRawConstructed) || cleanRawConstructed.includes(cleanRawHtml)))) {
            const htmlNums = (normHtml ? normHtml.match(/\d+/g) : null) || cleanRawHtml.match(/\d+/g) || [];
            const constNums = (normConstructed ? normConstructed.match(/\d+/g) : null) || cleanRawConstructed.match(/\d+/g) || [];
            if (htmlNums.length === 0 || constNums.length === 0 || htmlNums[0] === constNums[0]) {
                return true;
            }
        }
    }

    // 3. Check Street component against HTML address
    if (info.street) {
        const normStreet = normalizeAddress(info.street);
        const streetMatch = (normStreet && normHtml && normHtml.includes(normStreet)) || (cleanRawStreet && cleanRawHtml.includes(cleanRawStreet));
        if (streetMatch) {
            const htmlNums = (normHtml ? normHtml.match(/\d+/g) : null) || cleanRawHtml.match(/\d+/g) || [];
            const streetNums = (normStreet ? normStreet.match(/\d+/g) : null) || cleanRawStreet.match(/\d+/g) || [];
            if (htmlNums.length > 0 && streetNums.length > 0 && htmlNums[0] !== streetNums[0]) {
                return false;
            }
            let conflict = false;
            if (info.city && (!normHtml || !normHtml.includes(normalizeAddress(info.city))) && !cleanRawHtml.includes(stripAll(info.city))) {
                conflict = true;
            }
            if (info.state && (!normHtml || !normHtml.includes(normalizeAddress(info.state))) && !cleanRawHtml.includes(stripAll(info.state))) {
                conflict = true;
            }
            if (info.zip && (!normHtml || !normHtml.includes(normalizeAddress(info.zip))) && !cleanRawHtml.includes(stripAll(info.zip))) {
                conflict = true;
            }
            if (!conflict) {
                return true;
            }
        }
    }

    return false;
};

export const checkPropertyAddressHtmlConsistency = (field, text, allData, fieldPath) => {
    if (!allData) return null;

    const compData = allData?.comparisonData || allData?.clean_data?.comparisonData || {};
    const htmlRaw = getHtmlPropertyAddress(allData);
    const subjectInfo = getSubjectAddressInfo(allData);

    const stripAll = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const fieldLower = String(field || '').trim().toLowerCase();
    const isHtmlField = (
        (fieldPath && fieldPath[0] === 'comparisonData') ||
        (text !== undefined && text !== null && stripAll(cleanHtmlAddress(text)) === stripAll(cleanHtmlAddress(htmlRaw)) && stripAll(cleanHtmlAddress(htmlRaw)) !== '') ||
        (fieldPath && fieldPath.length === 1 && (fieldPath[0] === 'PROPERTY ADDRESS' || fieldPath[0] === 'Property Address') && compData[fieldPath[0]] !== undefined)
    );

    const currentHtml = isHtmlField
        ? (text !== undefined && text !== null && String(text).trim() !== '' ? String(text).trim() : htmlRaw)
        : htmlRaw;

    if (!isHtmlField) {
        if (fieldLower.includes('property')) {
            if (text !== undefined && text !== null && String(text).trim() !== '') {
                subjectInfo.street = String(text).trim();
                const parts = [subjectInfo.street];
                const cityState = [subjectInfo.city, subjectInfo.state].filter(Boolean).join(', ');
                const cityStateZip = cityState + (subjectInfo.zip ? (cityState ? ' ' : '') + subjectInfo.zip : '');
                if (cityStateZip) parts.push(cityStateZip);
                subjectInfo.constructed = parts.join(', ');
            }
        } else if (fieldLower.includes('full')) {
            if (text !== undefined && text !== null && String(text).trim() !== '') {
                subjectInfo.full = String(text).trim();
            }
        }
    }

    if (!currentHtml || currentHtml === 'N/A' || (!subjectInfo.full && !subjectInfo.street && !subjectInfo.constructed)) {
        return null;
    }

    const matches = arePropertyAddressesMatching(currentHtml, subjectInfo);
    const displayHtml = cleanHtmlAddress(currentHtml);
    const displaySubj = subjectInfo.full || subjectInfo.constructed || subjectInfo.street;

    if (!matches) {
        return {
            isError: true,
            message: `Property Address mismatch. HTML: '${displayHtml}', Subject: '${displaySubj}'.`
        };
    }

    return {
        isMatch: true,
        message: isHtmlField
            ? `Valid: Property Address matches Subject Address '${displaySubj}'.`
            : `Valid: Address matches HTML Property Address '${displayHtml}'.`
    };
};

export const normalizeAppraiserName = (name) => {
    if (!name || name === 'N/A') return '';
    return String(name)
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

export const areAppraiserVendorNamesMatching = (vendorName, appraiserName) => {
    if (!vendorName || !appraiserName) return false;
    if (vendorName === 'N/A' || appraiserName === 'N/A') return false;

    const normVendor = normalizeAppraiserName(vendorName);
    const normAppraiser = normalizeAppraiserName(appraiserName);

    if (!normVendor || !normAppraiser) return false;

    // 1. Direct equality
    if (normVendor === normAppraiser) return true;

    // 2. Direct equality ignoring spaces
    if (normVendor.replace(/\s+/g, '') === normAppraiser.replace(/\s+/g, '')) return true;

    // 3. Substring inclusion
    if (normVendor.includes(normAppraiser) || normAppraiser.includes(normVendor)) return true;

    // 4. Token-based matching (handles "Airhart, Michael S" vs "Michael S. Airhart")
    const vendorTokens = normVendor.split(' ').filter(t => t.length > 0 && t !== 'and');
    const appraiserTokens = normAppraiser.split(' ').filter(t => t.length > 0 && t !== 'and');

    if (vendorTokens.length > 0 && appraiserTokens.length > 0) {
        const allAppraiserInVendor = appraiserTokens.every(t => vendorTokens.includes(t));
        const allVendorInAppraiser = vendorTokens.every(t => appraiserTokens.includes(t));
        if (allAppraiserInVendor || allVendorInAppraiser) return true;

        const vFirst = vendorTokens[0];
        const vLast = vendorTokens[vendorTokens.length - 1];
        const aFirst = appraiserTokens[0];
        const aLast = appraiserTokens[appraiserTokens.length - 1];

        // Normal order: first == first, last == last (e.g. "Michael S Airhart" vs "Michael Airhart")
        if ((vFirst === aFirst && vLast === aLast) ||
            // Inverted order: "Airhart Michael" vs "Michael Airhart"
            (vFirst === aLast && vLast === aFirst)) {
            return true;
        }
    }

    // 5. Multiple vendors in vendorName (e.g. "Michael S Airhart / Appraisal Group" or "Michael S Airhart, Jane Doe")
    const subVendors = String(vendorName).split(/[/;|]|\band\b/i).map(s => s.trim()).filter(Boolean);
    if (subVendors.length > 1) {
        for (const sub of subVendors) {
            if (areAppraiserVendorNamesMatching(sub, appraiserName)) {
                return true;
            }
        }
    }

    return false;
};

export const getHtmlVendorName = (allData) => {
    const compData = allData?.comparisonData || allData?.clean_data?.comparisonData || (
        allData?.['Assigned to Vendor(s)'] || allData?.['ASSIGNED TO VENDOR(S)'] ||
        allData?.['Assigned to Vendor'] || allData?.['ASSIGNED TO VENDOR'] ? allData : null
    ) || {};

    return String(
        compData['Assigned to Vendor(s)'] ||
        compData['ASSIGNED TO VENDOR(S)'] ||
        compData['Assigned to Vendor'] ||
        compData['ASSIGNED TO VENDOR'] ||
        compData['assigned to vendor(s)'] ||
        compData['assigned to vendor'] ||
        compData['assigned_to_vendor'] ||
        compData['Vendor'] ||
        compData['VENDOR'] ||
        compData?.Subject?.['Assigned to Vendor(s)'] ||
        compData?.Subject?.['ASSIGNED TO VENDOR(S)'] ||
        allData?.['Assigned to Vendor(s)'] ||
        allData?.['ASSIGNED TO VENDOR(S)'] ||
        allData?.['Assigned to Vendor'] ||
        allData?.['ASSIGNED TO VENDOR'] ||
        allData?.clean_data?.['Assigned to Vendor(s)'] ||
        allData?.clean_data?.['ASSIGNED TO VENDOR(S)'] ||
        ''
    ).trim();
};

export const getCertificationAppraiserName = (allData) => {
    const cert = allData?.CERTIFICATION ||
        allData?.Certification ||
        allData?.clean_data?.CERTIFICATION ||
        allData?.clean_data?.Certification ||
        allData?.data?.CERTIFICATION ||
        allData?.data?.Certification ||
        {};

    return String(
        cert['Name'] ||
        cert['NAME'] ||
        cert['Appraiser Name'] ||
        cert['APPRAISER Name'] ||
        cert['APPRAISER NAME'] ||
        cert?.Appraiser?.Name ||
        allData?.['Appraiser Name'] ||
        allData?.['APPRAISER NAME'] ||
        allData?.['Name'] ||
        allData?.clean_data?.['Appraiser Name'] ||
        allData?.appraiserName ||
        ''
    ).trim();
};

export const checkAppraiserVendorNameConsistency = (field, text, allData, fieldPath) => {
    if (!allData) return null;

    const fieldStr = String(field || '').trim();
    const fieldLower = fieldStr.toLowerCase();

    // Check if supervisory
    const isSupervisory = fieldLower.includes('supervisory') ||
        (Array.isArray(fieldPath) && fieldPath.some(p => String(p).toLowerCase().includes('supervisory')));
    if (isSupervisory) return null;

    // Avoid Lender/Client or Borrower name fields
    if (fieldLower.includes('lender') || fieldLower.includes('client') || fieldLower.includes('borrower')) {
        return null;
    }

    const isHtmlSide = (
        fieldLower.includes('assigned to vendor') ||
        fieldLower === 'vendor' ||
        fieldLower === 'assigned_to_vendor' ||
        (Array.isArray(fieldPath) && fieldPath[0] === 'comparisonData')
    );

    const isReportSide = (
        fieldLower === 'name' ||
        fieldLower === 'appraiser name' ||
        fieldLower === 'appraiser_name' ||
        (Array.isArray(fieldPath) && (fieldPath[0] === 'CERTIFICATION' || fieldPath[0] === 'Certification') && fieldLower === 'name')
    );

    if (!isHtmlSide && !isReportSide) {
        return null;
    }

    const compData = allData?.comparisonData || allData?.clean_data?.comparisonData || (
        allData?.['Assigned to Vendor(s)'] || allData?.['ASSIGNED TO VENDOR(S)'] ||
        allData?.['Assigned to Vendor'] || allData?.['ASSIGNED TO VENDOR'] ? allData : null
    );

    if (!compData || Object.keys(compData).length === 0) {
        return null;
    }

    const htmlVendorRaw = isHtmlSide
        ? (text !== undefined && text !== null && String(text).trim() !== '' ? String(text).trim() : getHtmlVendorName(allData))
        : getHtmlVendorName(allData);

    const certAppraiserRaw = isReportSide
        ? (text !== undefined && text !== null && String(text).trim() !== '' ? String(text).trim() : getCertificationAppraiserName(allData))
        : getCertificationAppraiserName(allData);

    // If HTML vendor name is not present or N/A, return null so normal blank validation applies without false error
    if (!htmlVendorRaw || htmlVendorRaw === 'N/A') {
        return null;
    }

    // If report appraiser name is not present, return null
    if (!certAppraiserRaw || certAppraiserRaw === 'N/A') {
        return null;
    }

    const matches = areAppraiserVendorNamesMatching(htmlVendorRaw, certAppraiserRaw);

    if (!matches) {
        return {
            isError: true,
            message: `Appraiser Name mismatch. HTML (Assigned to Vendor): '${htmlVendorRaw}', Certification Appraiser: '${certAppraiserRaw}'.`
        };
    }

    return {
        isMatch: true,
        message: isHtmlSide
            ? `Valid: Assigned to Vendor matches Certification Appraiser Name '${certAppraiserRaw}'.`
            : `Valid: Appraiser Name matches HTML Assigned to Vendor '${htmlVendorRaw}'.`
    };
};

export const checkAssignedToVendorHtmlConsistency = checkAppraiserVendorNameConsistency;
export const checkVendorNameHtmlConsistency = checkAppraiserVendorNameConsistency;
