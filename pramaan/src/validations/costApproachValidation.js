import { checkCostApproachMatchConsistency } from './form1004And1007Validation';

export const isBplClient = (data) => {
    if (!data || typeof data !== 'object') return false;

    const checkString = (val) => {
        if (!val || typeof val !== 'string') return false;
        return /\bBPL\b/i.test(val) || /bpl\s*mortgage/i.test(val) || /\bcoast\s*2\s*coast\b/i.test(val) || /\bcoast2coast\b/i.test(val);
    };

    const candidates = [
        data.selectedClient,
        data.client,
        data.Client,
        data['Client Name'],
        data.client_name,
        data['Lender/Client'],
        data['LENDER/CLIENT'],
        data['Lender / Client'],
        data['Lender/Client Company Name'],
        data['LENDER/CLIENT Name'],
        data['Client/Lender Company Name'],
        data['Client/Lender on Report'],
        data['CLIENT/LENDER ON REPORT'],
        data['Lender Name'],
        data['Lender'],
        data.Subject?.['Lender/Client'],
        data.Subject?.['LENDER/CLIENT'],
        data.Subject?.['Lender / Client'],
        data.Subject?.['Lender/Client Company Name'],
        data.Subject?.['LENDER/CLIENT Name'],
        data.Subject?.['Client / Lender'],
        data.Subject?.['Client/Lender'],
        data.Subject?.['Client Name'],
        data.Subject?.['Client'],
        data.SUBJECT?.['Lender/Client'],
        data.SUBJECT?.['LENDER/CLIENT'],
        data.SUBJECT?.['Lender/Client Company Name'],
        data.SUBJECT?.['LENDER/CLIENT Name'],
        data.CERTIFICATION?.['Lender/Client Company Name'],
        data.CERTIFICATION?.['Lender/Client'],
        data.CERTIFICATION?.['LENDER/CLIENT Name'],
        data.clean_data?.selectedClient,
        data.clean_data?.client,
        data.clean_data?.['Lender/Client'],
        data.clean_data?.['Lender/Client Company Name'],
        data.clean_data?.Subject?.['Lender/Client'],
        data.clean_data?.Subject?.['Lender/Client Company Name'],
        data.html_data?.['Client/Lender on Report'],
        data.html_data?.['CLIENT/LENDER ON REPORT'],
        data.html_data?.['Client/Lender Company Name'],
        data.html_data?.['Lender/Client'],
        data.html_data?.['Client Name'],
        data.html_data?.['Client'],
        data.order_data?.client,
        data.order_data?.Client,
        data.order_data?.lender,
        data.order_data?.Lender,
        data.order_data?.['Lender/Client'],
        data.allData?.selectedClient,
        data.allData?.client,
        data.allData?.['Lender/Client'],
        data.allData?.Subject?.['Lender/Client']
    ];

    for (const cand of candidates) {
        if (checkString(cand)) return true;
    }

    return false;
};

export const checkCostNew = (field, text, data) => {
    const validFields = [
        'ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW',
        'Estimated',
        'ESTIMATED COST NEW TYPE'
    ];
    if (!validFields.includes(field)) return null;

    const value = String(text || '').trim().toLowerCase();
    const isBpl = isBplClient(data);

    if (!value) {
        return {
            isError: true,
            skipBlankFilter: isBpl,
            message: "'ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW' cannot be blank. One option must be selected."
        };
    }

    const hasReproduction = value.includes('reproduction');
    const hasReplacement = value.includes('replacement');

    if (hasReproduction && hasReplacement) {
        return { isError: true, skipBlankFilter: isBpl, message: "Only one of 'Reproduction' or 'Replacement' can be selected." };
    }

    if (!hasReproduction && !hasReplacement) {
        return { isError: true, skipBlankFilter: isBpl, message: "Either 'Reproduction' or 'Replacement' must be selected." };
    }

    return { isMatch: true, skipBlankFilter: isBpl, message: "Estimated cost new type is valid." };
};

export const checkSourceOfCostData = (field, text, data) => {
    if (field !== 'Source of cost data' && field !== 'Source of Cost Data' && field !== 'Cost Data Source') return null;
    const isBpl = isBplClient(data);
    if (!text || String(text).trim() === '') {
        return { isError: true, skipBlankFilter: isBpl, message: "'Source of cost data' cannot be blank." };
    }
    return { isMatch: true, skipBlankFilter: isBpl, message: "'Source of cost data' is present." };
};

export const isNotDevelopedComment = (val) => {
    if (!val) return false;
    const str = String(val).toLowerCase().trim();
    if (!str) return false;

    if (
        str.includes('not developed') ||
        str.includes('not be developed') ||
        str.includes('was not developed') ||
        str.includes('is not developed') ||
        str.includes('not been developed') ||
        str.includes('cannot be developed') ||
        str.includes('could not be developed') ||
        str.includes('not applicable') ||
        str.includes('not performed') ||
        str.includes('not completed') ||
        str.includes('not utilized') ||
        str.includes('was not utilized') ||
        str.includes('not analyzed') ||
        str.includes('limits the reliability') ||
        str.includes('limits reliability') ||
        str.includes('unreliable') ||
        str.includes('less reliable') ||
        str.includes('why cost approach cannot be developed')
    ) {
        return true;
    }

    const pattern = /\b(?:not\s+(?:being\s+|been\s+|be\s+|was\s+|is\s+|are\s+)?(?:developed|applicable|performed|completed|utilized|analyzed)|cannot\s+be\s+developed|could\s+not\s+be\s+developed|limits\s+(?:the\s+)?reliability|omitted)\b/i;
    return pattern.test(str);
};

export const getMissingCostApproachFields = (data) => {
    if (!data || typeof data !== 'object') {
        return ['Cost Approach data'];
    }

    const parseNum = (val) => {
        if (val === undefined || val === null) return 0;
        const clean = String(val).replace(/[^0-9.]/g, '');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    };

    const hasText = (fieldNames) => {
        const sources = [
            data.COST_APPROACH,
            data['Cost Approach'],
            data.Cost_Approach,
            data.clean_data?.COST_APPROACH,
            data.clean_data?.['Cost Approach'],
            data.allData?.COST_APPROACH,
            data.allData?.['Cost Approach'],
            data.allData,
            data
        ];
        for (const src of sources) {
            if (!src || typeof src !== 'object') continue;
            for (const name of fieldNames) {
                if (src[name] !== undefined && src[name] !== null && String(src[name]).trim() !== '') {
                    return true;
                }
            }
        }
        return false;
    };

    const hasNum = (fieldNames) => {
        const sources = [
            data.COST_APPROACH,
            data['Cost Approach'],
            data.Cost_Approach,
            data.clean_data?.COST_APPROACH,
            data.clean_data?.['Cost Approach'],
            data.RECONCILIATION,
            data.allData?.COST_APPROACH,
            data.allData?.['Cost Approach'],
            data.allData,
            data
        ];
        for (const src of sources) {
            if (!src || typeof src !== 'object') continue;
            for (const name of fieldNames) {
                if (src[name] !== undefined && src[name] !== null) {
                    const num = parseNum(src[name]);
                    if (num > 0) return true;
                }
            }
        }
        return false;
    };

    const missing = [];

    // 1. Indicated Value by Cost Approach
    if (!hasNum([
        "Indicated Value By Cost Approach......................................................=$",
        "Indicated Value by Cost Approach",
        "Indicated Value By Cost Approach",
        "Cost Approach (if developed)",
        "Cost Approach (if developed) $"
    ])) {
        missing.push("Indicated Value by Cost Approach");
    }

    // 2. Opinion of Site Value
    if (!hasNum([
        "OPINION OF SITE VALUE = $ ................................................",
        "OPINION OF SITE VALUE",
        "Opinion of Site Value",
        "Opinion of Site Value $",
        "OPINION OF SITE VALUE $"
    ])) {
        missing.push("Opinion of Site Value");
    }

    // 3. Dwelling
    if (!hasNum(["Dwelling", "DWELLING"])) {
        missing.push("Dwelling");
    }

    // 4. Total Estimate of Cost-New
    if (!hasNum([
        "Total Estimate of Cost-New  = $ ...................",
        "Total Estimate of Cost-New = $ ...................",
        "Total Estimate of Cost-New",
        "Total Estimate Cost-New"
    ])) {
        missing.push("Total Estimate of Cost-New");
    }

    // 5. Source of cost data
    if (!hasText(["Source of cost data", "Source of Cost Data", "Cost Data Source"])) {
        missing.push("Source of cost data");
    }

    // 6. Quality rating from cost service
    if (!hasText([
        "Quality rating from cost service ",
        "Quality rating from cost service",
        "Quality Rating",
        "Quality rating"
    ])) {
        missing.push("Quality rating");
    }

    // 7. Effective date of cost data
    if (!hasText([
        "Effective date of cost data ",
        "Effective date of cost data",
        "Effective Date",
        "Effective date"
    ])) {
        missing.push("Effective date of cost data");
    }

    // 8. Remaining Economic Life
    if (!hasNum([
        "Estimated Remaining Economic Life (HUD and VA only)",
        "Remaining Economic Life",
        "Estimated Remaining Economic Life",
        "Estimated Remaining Economic Life Years"
    ])) {
        missing.push("Remaining Economic Life");
    }

    // 9. Depreciated Cost of Improvements
    if (!hasNum([
        "Depreciated Cost of Improvements......................................................=$ ",
        "Depreciated Cost of Improvements......................................................=$",
        "Depreciated Cost of Improvements",
        "Depreciated Cost of Dwellings"
    ])) {
        missing.push("Depreciated Cost of Improvements");
    }

    return missing;
};

export const isCostApproachFulfilled = (data) => {
    const missing = getMissingCostApproachFields(data);
    return missing.length === 0;
};

export const checkBplCostApproachReplication = (field, text, data) => {
    const replicationFields = [
        "Provide adequate information for the lender/client to replicate the below cost figures and calculations.",
        "Provide adequate information for the lender/client to replicate the below cost figures and calculations"
    ];

    const isReplicationField = typeof field === 'string' && (
        replicationFields.includes(field) ||
        field.toLowerCase().includes('replicate the below cost figures')
    );

    if (!isReplicationField) return null;

    if (!isBplClient(data)) {
        return null;
    }

    let valStr = '';
    if (text !== undefined && text !== null) {
        valStr = String(text).trim();
    } else if (data) {
        const costData = data.COST_APPROACH || data['Cost Approach'] || data.Cost_Approach || data;
        const candidate = costData?.[field]
            ?? costData?.["Provide adequate information for the lender/client to replicate the below cost figures and calculations."]
            ?? costData?.["Provide adequate information for the lender/client to replicate the below cost figures and calculations"]
            ?? data?.[field]
            ?? data?.["Provide adequate information for the lender/client to replicate the below cost figures and calculations."]
            ?? data?.["Provide adequate information for the lender/client to replicate the below cost figures and calculations"];
        if (candidate !== undefined && candidate !== null) {
            valStr = String(candidate).trim();
        }
    }

    const comments = String(
        data?.['Comments on Cost Approach (gross living area calculations, depreciation, etc.)'] || 
        data?.COST_APPROACH?.['Comments on Cost Approach (gross living area calculations, depreciation, etc.)'] || 
        data?.clean_data?.COST_APPROACH?.['Comments on Cost Approach (gross living area calculations, depreciation, etc.)'] ||
        data?.RECONCILIATION?.['Cost Approach (if developed) Comment'] || ''
    ).toLowerCase();

    if (isNotDevelopedComment(valStr) || isNotDevelopedComment(comments)) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: "the take the advise from the team"
        };
    }

    const missing = getMissingCostApproachFields(data);
    if (missing.length > 0) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: "Cost Approach section must be full filled for BPL client. All cost approach values must be present."
        };
    }

    if (!valStr) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: "Provide adequate information for the lender/client to replicate the below cost figures and calculations cannot be blank for BPL client."
        };
    }

    return {
        isMatch: true,
        skipBlankFilter: true,
        message: "Cost Approach section is fulfilled for BPL client."
    };
};

export const checkIndicatedValueByCostApproach = (field, text, data, path, saleName, formType) => {
    if (field !== 'Indicated Value By Cost Approach......................................................=$' && field !== 'Indicated Value by Cost Approach') return null;
    const currentFormType = String(data?.formType || data?.['From Type'] || data?.['Form Type'] || formType || '').trim();
    if (currentFormType === '1073') {
        return { isMatch: true };
    }

    const matchRes = checkCostApproachMatchConsistency(field, text, data, path, saleName, currentFormType);
    if (matchRes && matchRes.isError) {
        return matchRes;
    }

    const value = String(text || '').trim();
    const cleanNum = parseFloat(value.replace(/[^0-9.]/g, ''));
    const comments = String(
        data?.['Comments on Cost Approach (gross living area calculations, depreciation, etc.)'] || 
        data?.COST_APPROACH?.['Comments on Cost Approach (gross living area calculations, depreciation, etc.)'] || 
        data?.RECONCILIATION?.['Cost Approach (if developed) Comment'] || ''
    ).toLowerCase();

    const replicationComment = String(
        data?.['Provide adequate information for the lender/client to replicate the below cost figures and calculations.'] ||
        data?.COST_APPROACH?.['Provide adequate information for the lender/client to replicate the below cost figures and calculations.'] ||
        data?.['Provide adequate information for the lender/client to replicate the below cost figures and calculations'] ||
        data?.COST_APPROACH?.['Provide adequate information for the lender/client to replicate the below cost figures and calculations'] || ''
    ).toLowerCase();

    if (isBplClient(data)) {
        if (isNotDevelopedComment(replicationComment) || isNotDevelopedComment(comments)) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "the take the advise from the team"
            };
        }
        if (!value || isNaN(cleanNum) || cleanNum === 0 || !isCostApproachFulfilled(data)) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "Cost Approach section must be full filled for BPL client. All cost approach values must be present."
            };
        }
    }

    const hasNotDevelopedComment = comments.includes('why cost approach cannot be developed') || 
        (comments.includes('cost approach') && (comments.includes('not') || comments.includes('omitted') || comments.includes('unreliable') || comments.includes('less reliable') || comments.includes('applicable') || comments.includes('developed') || comments.includes('analyzed')));

    if ((!value || value === '0') && !hasNotDevelopedComment) {
        return { isError: true, message: "If 'Indicated Value by Cost Approach' is blank, a comment explaining why it was not developed is required." };
    }

    if (matchRes && matchRes.isMatch) {
        return matchRes;
    }

    return { isMatch: true };
};

export const checkOpinionOfSiteValue = (field, text, data) => {
    const siteValueFields = [
        "OPINION OF SITE VALUE = $ ................................................",
        "OPINION OF SITE VALUE",
        "Opinion of Site Value",
        "Opinion of Site Value $",
        "OPINION OF SITE VALUE $"
    ];
    if (!siteValueFields.includes(field)) return null;

    let valStr = (text !== undefined && text !== null) ? String(text).trim() : '';
    if (!valStr && data) {
        const costData = data.COST_APPROACH || data.Cost_Approach || data;
        const candidate = costData?.["OPINION OF SITE VALUE = $ ................................................"]
            ?? costData?.["OPINION OF SITE VALUE"]
            ?? costData?.["Opinion of Site Value"]
            ?? costData?.["Opinion of Site Value $"]
            ?? costData?.["OPINION OF SITE VALUE $"]
            ?? data?.["OPINION OF SITE VALUE = $ ................................................"]
            ?? data?.["OPINION OF SITE VALUE"]
            ?? data?.["Opinion of Site Value"];
        if (candidate !== undefined && candidate !== null) {
            valStr = String(candidate).trim();
        }
    }

    const cleanNum = valStr.replace(/[^0-9.]/g, '');
    if (!valStr || (cleanNum !== '' && parseFloat(cleanNum) === 0)) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: "'OPINION OF SITE VALUE' in Cost Calculations is mandatory and must not be blank."
        };
    }

    return {
        isMatch: true,
        skipBlankFilter: true,
        message: "'OPINION OF SITE VALUE' is present."
    };
};

export const checkRemainingEconomicLife = (field, text, data) => {
    const economicLifeFields = [
        "Estimated Remaining Economic Life (HUD and VA only)",
        "Remaining Economic Life",
        "Estimated Remaining Economic Life",
        "Estimated Remaining Economic Life Years"
    ];
    if (!economicLifeFields.includes(field)) return null;

    let valStr = (text !== undefined && text !== null) ? String(text).trim() : '';
    if (!valStr && data) {
        const costData = data.COST_APPROACH || data.Cost_Approach || data;
        const candidate = costData?.["Estimated Remaining Economic Life (HUD and VA only)"]
            ?? costData?.["Remaining Economic Life"]
            ?? costData?.["Estimated Remaining Economic Life"]
            ?? data?.["Estimated Remaining Economic Life (HUD and VA only)"]
            ?? data?.["Remaining Economic Life"]
            ?? data?.["Estimated Remaining Economic Life"];
        if (candidate !== undefined && candidate !== null) {
            valStr = String(candidate).trim();
        }
    }

    const cleanNum = valStr.replace(/[^0-9.]/g, '');
    if (!valStr || (cleanNum !== '' && parseFloat(cleanNum) === 0)) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: "'Remaining Economic Life' in Cost Approach is mandatory and must not be blank."
        };
    }

    return {
        isMatch: true,
        skipBlankFilter: true,
        message: "'Remaining Economic Life' is present."
    };
};

export const checkCostApproachFieldsNotBlank = (field, text, data) => {
    const fieldsToCheck = [
        "Estimated", "Source of cost data", "Quality rating from cost service ",
        "Quality rating from cost service", "Quality Rating",
        "Effective date of cost data ", "Effective date of cost data", "Effective Date",
        "Comments on Cost Approach (gross living area calculations, depreciation, etc.)",
        "Support for the opinion of site value (summary of comparable land sales or other methods for estimating site value)",
        "Dwelling", "Garage/Carport ", "Garage/Carport",
        " Total Estimate of Cost-New  = $ ...................",
        "Total Estimate of Cost-New = $ ...................",
        "Total Estimate of Cost-New", "Total Estimate Cost-New",
        "Depreciation ", "Depreciation",
        "Depreciated Cost of Improvements......................................................=$ ",
        "Depreciated Cost of Improvements......................................................=$",
        "Depreciated Cost of Improvements",
        "“As-is” Value of Site Improvements......................................................=$",
        "Indicated Value By Cost Approach......................................................=$",
        "Indicated Value by Cost Approach",
        "Depreciated Cost of Dwellings",
        "As Is Value of Site Improvements",
        "Above Grade Finished Area",
        "Cost Per Square Foot",
        "Depreciated Cost",
        "Physical Depreciation",
        "Functional Depreciation",
        "External Depreciation",
        "Total Depreciation",
        "Effective Age",
        "Site Improvement Description",
        "Site Improvement Amount",
        "Primary Site Valuation Method",
        "Land Comparable Number",
        "Land Comparable Address",
        "Land Comparable County",
        "Land Comparable Data Source",
        "Land Comparable Assessor Parcel Number (APN)",
        "Land Comparable Site Size",
        "Land Comparable Sale Date",
        "Land Comparable Sale Price",
        "Commentary on Remaining Economic Life",
        "Commentary on Effective Age",
        "Reconciliation of Site Value",
        "General Description",
        "Cost Type",
        "Cost Data Source",
        "Quality Rating",
        "Effective Date",
        "Cost Method",
        "Depreciation Method",
        "Cost Approach Commentary",
        "Cost Approach Exhibits"
    ];

    const isBpl = isBplClient(data);
    const trimmedText = String(text || '').trim();

    if (isBpl) {
        if (field === "Comments on Cost Approach (gross living area calculations, depreciation, etc.)" ||
            field === "Cost Approach Commentary") {
            if (isNotDevelopedComment(trimmedText)) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: "the take the advise from the team"
                };
            }
            if (!trimmedText) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `'${field}' should not be blank for BPL client.`
                };
            }
            return {
                isMatch: true,
                skipBlankFilter: true,
                message: `'${field}' is present.`
            };
        }

        const numericRequiredFields = [
            "Dwelling",
            "Total Estimate of Cost-New  = $ ...................",
            "Total Estimate of Cost-New = $ ...................",
            "Total Estimate of Cost-New",
            "Total Estimate Cost-New",
            "Depreciated Cost of Improvements......................................................=$ ",
            "Depreciated Cost of Improvements......................................................=$",
            "Depreciated Cost of Improvements"
        ];

        if (numericRequiredFields.some(nf => nf.trim().toLowerCase() === field.trim().toLowerCase())) {
            const cleanNum = parseFloat(trimmedText.replace(/[^0-9.]/g, ''));
            if (!trimmedText || isNaN(cleanNum) || cleanNum === 0) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `'${field.trim()}' is required and must not be blank or zero for BPL client.`
                };
            }
            return {
                isMatch: true,
                skipBlankFilter: true,
                message: `'${field.trim()}' is present.`
            };
        }

        const textRequiredFields = [
            "Estimated", "Source of cost data", "Quality rating from cost service ",
            "Quality rating from cost service", "Quality Rating",
            "Effective date of cost data ", "Effective date of cost data", "Effective Date",
            "Support for the opinion of site value (summary of comparable land sales or other methods for estimating site value)"
        ];

        if (textRequiredFields.some(tf => tf.trim().toLowerCase() === field.trim().toLowerCase())) {
            if (!trimmedText) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `'${field.trim()}' should not be blank for BPL client.`
                };
            }
            return {
                isMatch: true,
                skipBlankFilter: true,
                message: `'${field.trim()}' is present.`
            };
        }
    }

    if (fieldsToCheck.includes(field) && (!text || String(text).trim() === '')) {
        return { isError: true, message: `'${field}' should not be blank.` };
    }
    return null;
};

export const checkCostApproachGlaConsistency = (field, text, data, fieldPath, saleName, formType) => {
    const fLower = String(field || '').trim().toLowerCase();
    const isCostGlaField = (
        fLower === 'total gross living area' ||
        fLower === 'total gross living area:' ||
        (Array.isArray(fieldPath) && (fieldPath[0] === 'COST_APPROACH' || fieldPath[0] === 'Cost Approach') && (fLower.includes('gross living area') || fLower.includes('gla')))
    );
    const isImpGlaField = (
        fLower === 'square feet of gross living area above grade' ||
        fLower === 'above grade finished area' ||
        (Array.isArray(fieldPath) && (fieldPath[0] === 'IMPROVEMENTS' || fieldPath[0] === 'Improvements') && (fLower.includes('gross living area') || fLower.includes('gla')))
    );
    const isSalesGridGlaField = (
        (fLower === 'gross living area' || fLower === 'gross living area sq.ft.' || fLower === 'gla') &&
        (!saleName || saleName === 'Subject')
    );

    if (!isCostGlaField && !isImpGlaField && !isSalesGridGlaField) {
        return null;
    }

    const parseGla = (val) => {
        if (val === undefined || val === null) return NaN;
        const s = String(typeof val === 'object' && val !== null ? (val.value ?? val.choice ?? '') : val).trim();
        if (!s) return NaN;
        const cleaned = s.replace(/,/g, '').replace(/[^0-9.]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? NaN : Math.round(num);
    };

    const currentText = String(text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : '').trim();

    if (isCostGlaField && !currentText) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: "'Total Gross Living Area' cannot be blank. It must match Improvements and Sales Grid."
        };
    }

    const getCostGla = (d) => {
        if (!d || typeof d !== 'object') return '';
        return (
            d.COST_APPROACH?.['Total Gross Living Area'] ||
            d.COST_APPROACH?.['Total Gross Living Area:'] ||
            d['Cost Approach']?.['Total Gross Living Area'] ||
            d['Cost Approach']?.['Total Gross Living Area:'] ||
            d.clean_data?.['Cost Approach']?.['Total Gross Living Area'] ||
            d.clean_data?.['Cost Approach']?.['Total Gross Living Area:'] ||
            d.clean_data?.COST_APPROACH?.['Total Gross Living Area'] ||
            d.clean_data?.COST_APPROACH?.['Total Gross Living Area:'] ||
            d.data?.clean_data?.['Cost Approach']?.['Total Gross Living Area'] ||
            d.data?.clean_data?.['Cost Approach']?.['Total Gross Living Area:'] ||
            d.data?.['Cost Approach']?.['Total Gross Living Area'] ||
            d.data?.['Cost Approach']?.['Total Gross Living Area:'] ||
            d['Total Gross Living Area'] ||
            d['Total Gross Living Area:'] ||
            ''
        );
    };

    const getImprovementsGla = (d) => {
        if (!d || typeof d !== 'object') return '';
        return (
            d.IMPROVEMENTS?.['Square Feet of Gross Living Area Above Grade'] ||
            d.Improvements?.['Square Feet of Gross Living Area Above Grade'] ||
            d.clean_data?.Improvements?.['Square Feet of Gross Living Area Above Grade'] ||
            d.clean_data?.IMPROVEMENTS?.['Square Feet of Gross Living Area Above Grade'] ||
            d.data?.clean_data?.Improvements?.['Square Feet of Gross Living Area Above Grade'] ||
            d.data?.clean_data?.IMPROVEMENTS?.['Square Feet of Gross Living Area Above Grade'] ||
            d.data?.Improvements?.['Square Feet of Gross Living Area Above Grade'] ||
            d.data?.IMPROVEMENTS?.['Square Feet of Gross Living Area Above Grade'] ||
            d.IMPROVEMENTS?.['Gross Living Area'] ||
            d.Improvements?.['Gross Living Area'] ||
            d.clean_data?.Improvements?.['Gross Living Area'] ||
            d.clean_data?.IMPROVEMENTS?.['Gross Living Area'] ||
            d.data?.clean_data?.Improvements?.['Gross Living Area'] ||
            d.data?.clean_data?.IMPROVEMENTS?.['Gross Living Area'] ||
            d['Square Feet of Gross Living Area Above Grade'] ||
            ''
        );
    };

    const getSalesGridSubjectGla = (d) => {
        if (!d || typeof d !== 'object') return '';
        return (
            d.SALES_GRID?.Subject?.['Gross Living Area'] ||
            d.SALES_GRID?.Subject?.['Gross Living Area sq.ft.'] ||
            d.SALES_GRID?.Subject?.['Square Feet of Gross Living Area Above Grade'] ||
            d['Sales Grid']?.Subject?.['Gross Living Area'] ||
            d['Sales Grid']?.Subject?.['Gross Living Area sq.ft.'] ||
            d['Sales Grid']?.Subject?.['Square Feet of Gross Living Area Above Grade'] ||
            d.clean_data?.['Sales Grid']?.Subject?.['Gross Living Area'] ||
            d.clean_data?.['Sales Grid']?.Subject?.['Gross Living Area sq.ft.'] ||
            d.clean_data?.SALES_GRID?.Subject?.['Gross Living Area'] ||
            d.data?.clean_data?.['Sales Grid']?.Subject?.['Gross Living Area'] ||
            d.data?.clean_data?.['Sales Grid']?.Subject?.['Gross Living Area sq.ft.'] ||
            d.Subject?.['Gross Living Area'] ||
            d.Subject?.['Gross Living Area sq.ft.'] ||
            d.clean_data?.Subject?.['Gross Living Area'] ||
            d.data?.clean_data?.Subject?.['Gross Living Area'] ||
            d['Gross Living Area'] ||
            ''
        );
    };

    const costGlaRaw = String(isCostGlaField ? currentText : (getCostGla(data) || '')).trim();
    const impGlaRaw = String(isImpGlaField ? currentText : (getImprovementsGla(data) || '')).trim();
    const salesGlaRaw = String(isSalesGridGlaField ? currentText : (getSalesGridSubjectGla(data) || '')).trim();

    const costNum = parseGla(costGlaRaw);
    const impNum = parseGla(impGlaRaw);
    const salesNum = parseGla(salesGlaRaw);

    const hasCost = !isNaN(costNum) && costNum > 0;
    const hasImp = !isNaN(impNum) && impNum > 0;
    const hasSales = !isNaN(salesNum) && salesNum > 0;

    if (hasCost && hasImp && hasSales) {
        if (costNum === impNum && costNum === salesNum) {
            return {
                isMatch: true,
                message: `Verified: Total Gross Living Area (${costGlaRaw} sq. ft.) matches Improvements (${impGlaRaw}) and Sales Grid (${salesGlaRaw}).`
            };
        }
        const mismatches = [];
        if (costNum !== impNum) mismatches.push(`Improvements indicates '${impGlaRaw}'`);
        if (costNum !== salesNum) mismatches.push(`Sales Grid indicates '${salesGlaRaw}'`);
        return {
            isError: true,
            skipBlankFilter: true,
            message: `GLA mismatch: Cost Approach indicates '${costGlaRaw}', but ${mismatches.join(' and ')}. Gross Living Area must match across Cost Approach, Improvements, and Sales Grid.`
        };
    }

    if (hasCost && hasImp) {
        if (costNum === impNum) {
            return {
                isMatch: true,
                message: `Verified: Total Gross Living Area (${costGlaRaw} sq. ft.) matches Improvements (${impGlaRaw}).`
            };
        }
        return {
            isError: true,
            skipBlankFilter: true,
            message: `GLA mismatch: Cost Approach indicates '${costGlaRaw}', but Improvements indicates '${impGlaRaw}'. Gross Living Area must match.`
        };
    }

    if (hasCost && hasSales) {
        if (costNum === salesNum) {
            return {
                isMatch: true,
                message: `Verified: Total Gross Living Area (${costGlaRaw} sq. ft.) matches Sales Grid (${salesGlaRaw}).`
            };
        }
        return {
            isError: true,
            skipBlankFilter: true,
            message: `GLA mismatch: Cost Approach indicates '${costGlaRaw}', but Sales Grid indicates '${salesGlaRaw}'. Gross Living Area must match.`
        };
    }

    if (hasCost) {
        return {
            isMatch: true,
            message: `Total Gross Living Area is ${costGlaRaw} sq. ft.`
        };
    }

    return null;
};

export { checkCostApproachMatchConsistency } from './form1004And1007Validation';
