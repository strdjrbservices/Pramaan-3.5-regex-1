const normalizeForCompare = (val) =>
    String(val || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

export const parseAdjustmentValue = (adjStr) => {
    if (adjStr === null || adjStr === undefined) return 0;
    const str = String(adjStr).trim();
    if (!str) return 0;

    // Check if explicitly negative via minus sign (-) or parentheses like (5000)
    const isNegative = str.includes('-') || /^\s*\(\s*\d+/.test(str);

    // Extract numeric value
    const digits = str.replace(/[^0-9.]/g, '');
    const num = parseFloat(digits);
    if (isNaN(num)) return 0;

    // If sign is not present or explicit +, treat as positive. If -, treat as negative.
    return isNegative ? -num : num;
};

const getSubjectGridData = (allData) => {
    if (!allData || typeof allData !== 'object') return {};
    return (
        allData.SALES_GRID?.Subject ||
        allData['Sales Grid']?.Subject ||
        allData.SALES_GRID?.SUBJECT ||
        allData['Sales Grid']?.SUBJECT ||
        allData.Subject ||
        allData.SUBJECT ||
        {}
    );
};

const getComparableGridData = (allData, saleName) => {
    if (!allData || !saleName || typeof allData !== 'object') return {};
    if (allData[saleName] && typeof allData[saleName] === 'object') return allData[saleName];
    if (allData.SALES_GRID?.[saleName] && typeof allData.SALES_GRID[saleName] === 'object') return allData.SALES_GRID[saleName];
    if (allData['Sales Grid']?.[saleName] && typeof allData['Sales Grid'][saleName] === 'object') return allData['Sales Grid'][saleName];
    if (allData.sales_grid?.[saleName] && typeof allData.sales_grid[saleName] === 'object') return allData.sales_grid[saleName];

    const str = String(saleName);
    const noSpace = str.replace('# ', '#');
    const withSpace = str.replace('#', '# ');
    const numMatch = str.match(/\d+/);
    const num = numMatch ? numMatch[0] : null;

    const candidates = [
        noSpace,
        withSpace,
        num ? `Comparable ${num}` : null,
        num ? `Comparable #${num}` : null,
        num ? `Comparable # ${num}` : null,
        num ? `Comp ${num}` : null,
        num ? `#${num}` : null,
        num ? `# ${num}` : null
    ].filter(Boolean);

    for (const c of candidates) {
        if (allData[c] && typeof allData[c] === 'object') return allData[c];
        if (allData.SALES_GRID?.[c] && typeof allData.SALES_GRID[c] === 'object') return allData.SALES_GRID[c];
        if (allData['Sales Grid']?.[c] && typeof allData['Sales Grid'][c] === 'object') return allData['Sales Grid'][c];
        if (allData.sales_grid?.[c] && typeof allData.sales_grid[c] === 'object') return allData.sales_grid[c];
    }
    return {};
};

const normalizeCheckArgs = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let saleName = null;
    let textVal = null;

    if (arg3 && typeof arg3 === 'object' && !arg3.hasOwnProperty('prototype') && !Array.isArray(arg3)) {
        allData = arg3;
        saleName = arg5;
        textVal = arg2;
    } else {
        allData = arg2;
        saleName = arg3;
        if (typeof arg4 === 'string') saleName = arg4;
    }
    return { allData, saleName, textVal };
};

export const checkConditionAdjustment = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let saleName = null;
    let textVal = null;

    if (arg3 && typeof arg3 === 'object' && !arg3.hasOwnProperty('prototype') && !Array.isArray(arg3)) {
        allData = arg3;
        saleName = arg5;
        textVal = arg2;
    } else {
        allData = arg2;
        saleName = arg3;
    }

    const isConditionField = field === 'Condition';
    const isAdjustmentField = field === 'Condition Adjustment';

    if ((!isConditionField && !isAdjustmentField) || !saleName || saleName === 'Subject' || !allData) return null;

    const subjGrid = getSubjectGridData(allData);
    const subjectCondition = String(
        subjGrid['Condition'] ||
        allData['Condition'] ||
        allData.Subject?.['Condition'] ||
        ''
    ).trim().toUpperCase();

    const compIndexMatch = String(saleName).match(/\d+/);
    const compIndex = compIndexMatch ? compIndexMatch[0] : '';

    let compCondition = '';
    if (isConditionField && textVal !== null && textVal !== undefined) {
        compCondition = String(textVal).trim().toUpperCase();
    } else {
        compCondition = String(
            allData[saleName]?.['Condition'] ||
            (compIndex ? allData[`Comp ${compIndex} Condition`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Condition`] : '') ||
            ''
        ).trim().toUpperCase();
    }

    let adjustmentStr = '';
    if (isAdjustmentField && textVal !== null && textVal !== undefined) {
        adjustmentStr = String(textVal).trim();
    } else {
        adjustmentStr = String(
            allData[saleName]?.['Condition Adjustment'] ||
            (compIndex ? allData[`Comp ${compIndex} Condition Adjustment`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Condition Adjustment`] : '') ||
            ''
        ).trim();
    }

    if (!subjectCondition || !compCondition) return null;

    const getConditionRating = (condStr) => {
        const match = condStr.match(/C([1-5])/i);
        return match ? parseInt(match[1], 10) : NaN;
    };

    const subjectConditionNum = getConditionRating(subjectCondition);
    const compConditionNum = getConditionRating(compCondition);

    const is1025 = allData?.['Form Type'] === '1025' || allData?.['From Type'] === '1025';
    if (isNaN(subjectConditionNum) || isNaN(compConditionNum)) {
        if (is1025 || (isNaN(subjectConditionNum) && isNaN(compConditionNum))) {
            const adjustmentValue = parseAdjustmentValue(adjustmentStr);
            if (normalizeForCompare(subjectCondition) === normalizeForCompare(compCondition)) {
                if (adjustmentValue !== 0) {
                    return { isError: true, message: `Warning: Condition is the same (${subjectCondition}), so no adjustment is required.` };
                }
                return { isMatch: true };
            }
        }
        if (isNaN(subjectConditionNum)) {
            return { isError: true, message: `Subject condition must be between C1-C5. Got '${subjectCondition}'.` };
        }
        if (isNaN(compConditionNum)) {
            return { isError: true, message: `Comp condition must be between C1-C5. Got '${compCondition}'.` };
        }
    }

    const adjustmentValue = parseAdjustmentValue(adjustmentStr);

    if (subjectConditionNum === compConditionNum) {
        if (adjustmentValue !== 0) {
            return { isError: true, message: `Warning: Condition is the same (${subjectCondition}), so no adjustment is required.` };
        }
    } else if (compConditionNum < subjectConditionNum) {
        if (!adjustmentStr) {
            return { isError: true, message: `Warning: Comp condition (${compCondition}) is superior to Subject (${subjectCondition}), so a negative adjustment is required.` };
        }
        if (adjustmentValue > 0) {
            return { isError: true, message: `Warning: Comp condition (${compCondition}) is superior to Subject (${subjectCondition}), so a negative adjustment or $0 is expected.` };
        }
    } else {
        if (!adjustmentStr) {
            return { isError: true, message: `Warning: Comp condition (${compCondition}) is inferior to Subject (${subjectCondition}), so a positive adjustment is required.` };
        }
        if (adjustmentValue < 0) {
            return { isError: true, message: `Warning: Comp condition (${compCondition}) is inferior to Subject (${subjectCondition}), so a positive adjustment or $0 is expected.` };
        }
    }
    return { isMatch: true };
};

export const checkBedroomsAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName, textVal } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isBedroomField = field === 'Bedrooms';
    const isAdjustmentField = field === 'Bedrooms Adjustment';

    if ((!isBedroomField && !isAdjustmentField) || !allData || !saleName || saleName === 'Subject') return null;

    const subjGrid = getSubjectGridData(allData);
    const subjectBedrooms = parseInt(String(subjGrid['Bedrooms'] || allData.Subject?.['Bedrooms'] || '0').trim(), 10);
    const compBedrooms = parseInt(String(allData[saleName]?.['Bedrooms'] || '0').trim(), 10);

    const compIndexMatch = String(saleName).match(/\d+/);
    const compIndex = compIndexMatch ? compIndexMatch[0] : '';

    let adjustmentText = '';
    if (isAdjustmentField && textVal !== null && textVal !== undefined) {
        adjustmentText = String(textVal).trim();
    } else {
        const directBedAdj = allData[saleName]?.['Bedrooms Adjustment'] ??
            (compIndex ? allData[`Comp ${compIndex} Bedrooms Adjustment`] : undefined) ??
            (compIndex ? allData[`Comparable ${compIndex} Bedrooms Adjustment`] : undefined);
        if (directBedAdj !== undefined && directBedAdj !== null) {
            adjustmentText = String(directBedAdj).trim();
        } else {
            const subjectBathsStr = String(subjGrid['Baths'] || allData.Subject?.['Baths'] || '').trim();
            const compBathsStr = String(allData[saleName]?.['Baths'] || '').trim();
            if (compBedrooms !== subjectBedrooms && subjectBathsStr && compBathsStr && subjectBathsStr === compBathsStr) {
                adjustmentText = String(
                    allData[saleName]?.['Above Grade Room Count Adjustment'] ||
                    (compIndex ? allData[`Comp ${compIndex} Above Grade Room Count Adjustment`] : '') ||
                    ''
                ).trim();
            }
        }
    }
    const adjustmentValue = parseAdjustmentValue(adjustmentText);

    if (isNaN(subjectBedrooms) || isNaN(compBedrooms)) return null;

    if (subjectBedrooms === compBedrooms) {
        if (adjustmentValue !== 0 && adjustmentText !== '') {
            return { isError: true, message: `Warning: Bedroom count is the same (${subjectBedrooms}), but adjustment is not $0 or blank.` };
        }
    } else if (compBedrooms > subjectBedrooms) {
        if (adjustmentValue > 0) {
            return { isError: true, message: `Warning: Comp has more bedrooms (${compBedrooms}) than Subject (${subjectBedrooms}), so a negative adjustment is expected.` };
        }
    } else {
        if (adjustmentValue < 0) {
            return { isError: true, message: `Warning: Comp has fewer bedrooms (${compBedrooms}) than Subject (${subjectBedrooms}), so a positive adjustment is expected.` };
        }
    }
    return { isMatch: true };
};

export const checkBathsAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName, textVal } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isBathField = field === 'Baths';
    const isAdjustmentField = field === 'Baths Adjustment';

    if ((!isBathField && !isAdjustmentField) || !saleName || saleName === 'Subject' || !allData) return null;

    const subjGrid = getSubjectGridData(allData);
    const subjectBathsStr = String(
        subjGrid['Baths'] ||
        allData['Baths'] ||
        allData.Subject?.['Baths'] ||
        ''
    ).trim();

    const compIndexMatch = String(saleName).match(/\d+/);
    const compIndex = compIndexMatch ? compIndexMatch[0] : '';

    let compBathsStr = '';
    if (isBathField && textVal !== null && textVal !== undefined) {
        compBathsStr = String(textVal).trim();
    }
    if (!compBathsStr) {
        compBathsStr = String(
            allData[saleName]?.['Baths'] ||
            (compIndex ? allData[`Comp ${compIndex} Baths`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Baths`] : '') ||
            ''
        ).trim();
    }

    if (!subjectBathsStr || !compBathsStr) return null;

    const parseBaths = (bathStr) => {
        const numericVal = parseFloat(bathStr.replace(/[^0-9.]/g, ''));
        return isNaN(numericVal) ? NaN : numericVal;
    };

    const subjectBaths = parseBaths(subjectBathsStr);
    const compBaths = parseBaths(compBathsStr);

    if (isNaN(subjectBaths) || isNaN(compBaths)) return null;

    let adjustmentStr = '';
    if (isAdjustmentField && textVal !== null && textVal !== undefined) {
        adjustmentStr = String(textVal).trim();
    } else {
        const directBathAdj = allData[saleName]?.['Baths Adjustment'] ??
            allData[saleName]?.['Bathrooms Adjustment'] ??
            (compIndex ? allData[`Comp ${compIndex} Baths Adjustment`] : undefined) ??
            (compIndex ? allData[`Comparable ${compIndex} Baths Adjustment`] : undefined);
        if (directBathAdj !== undefined && directBathAdj !== null) {
            adjustmentStr = String(directBathAdj).trim();
        } else {
            const subjectBedStr = String(subjGrid['Bedrooms'] || allData.Subject?.['Bedrooms'] || '').trim();
            const compBedStr = String(allData[saleName]?.['Bedrooms'] || (compIndex ? allData[`Comp ${compIndex} Bedrooms`] : '') || '').trim();
            if (compBaths !== subjectBaths && subjectBedStr && compBedStr && subjectBedStr === compBedStr) {
                adjustmentStr = String(
                    allData[saleName]?.['Above Grade Room Count Adjustment'] ||
                    (compIndex ? allData[`Comp ${compIndex} Above Grade Room Count Adjustment`] : '') ||
                    ''
                ).trim();
            }
        }
    }

    const adjustmentValue = parseAdjustmentValue(adjustmentStr);

    if (compBaths === subjectBaths) {
        if (adjustmentValue !== 0 && adjustmentStr !== '') {
            return { isError: true, message: `Warning: Bath count is the same (${subjectBaths}), so no adjustment is required.` };
        }
    } else if (compBaths > subjectBaths) {
        if (!adjustmentStr) {
            return { isError: true, message: `Warning: Comp has more baths (${compBaths}) than Subject (${subjectBaths}), so a negative adjustment is required.` };
        }
        if (adjustmentValue > 0) {
            return { isError: true, message: `Warning: Comp has more baths (${compBaths}) than Subject (${subjectBaths}), so a negative adjustment or $0 is expected.` };
        }
    } else {
        if (!adjustmentStr) {
            return { isError: true, message: `Warning: Comp has fewer baths (${compBaths}) than Subject (${subjectBaths}), so a positive adjustment is required.` };
        }
        if (adjustmentValue < 0) {
            return { isError: true, message: `Warning: Comp has fewer baths (${compBaths}) than Subject (${subjectBaths}), so a positive adjustment or $0 is expected.` };
        }
    }
    return { isMatch: true };
};

export const checkQualityOfConstructionAdjustment = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let saleName = null;
    let textVal = null;

    if (arg3 && typeof arg3 === 'object' && !arg3.hasOwnProperty('prototype') && !Array.isArray(arg3)) {
        allData = arg3;
        saleName = arg5;
        textVal = arg2;
    } else {
        allData = arg2;
        saleName = arg3;
    }

    const isQualityField = field === 'Quality of Construction';
    const isAdjustmentField = field === 'Quality of Construction Adjustment';

    if ((!isQualityField && !isAdjustmentField) || !saleName || saleName === 'Subject' || !allData) return null;

    const subjGrid = getSubjectGridData(allData);
    const subjectQoCStr = String(
        subjGrid['Quality of Construction'] ||
        allData['Quality of Construction'] ||
        allData.Subject?.['Quality of Construction'] ||
        ''
    ).trim().toUpperCase();

    const compIndexMatch = String(saleName).match(/\d+/);
    const compIndex = compIndexMatch ? compIndexMatch[0] : '';

    let compQoCStr = '';
    if (isQualityField && textVal !== null && textVal !== undefined) {
        compQoCStr = String(textVal).trim().toUpperCase();
    } else {
        compQoCStr = String(
            allData[saleName]?.['Quality of Construction'] ||
            (compIndex ? allData[`Comp ${compIndex} Quality of Construction`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Quality of Construction`] : '') ||
            ''
        ).trim().toUpperCase();
    }

    let adjustmentStr = '';
    if (isAdjustmentField && textVal !== null && textVal !== undefined) {
        adjustmentStr = String(textVal).trim();
    } else {
        adjustmentStr = String(
            allData[saleName]?.['Quality of Construction Adjustment'] ||
            (compIndex ? allData[`Comp ${compIndex} Quality of Construction Adjustment`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Quality of Construction Adjustment`] : '') ||
            ''
        ).trim();
    }

    if (!subjectQoCStr || !compQoCStr) return null;

    const getQualityRating = (qocStr) => {
        const match = qocStr.match(/Q([1-5])/i);
        return match ? parseInt(match[1], 10) : NaN;
    };

    const subjectQualityNum = getQualityRating(subjectQoCStr);
    const compQualityNum = getQualityRating(compQoCStr);

    const is1025 = allData?.['Form Type'] === '1025' || allData?.['From Type'] === '1025';
    if (isNaN(subjectQualityNum) || isNaN(compQualityNum)) {
        if (is1025 || (isNaN(subjectQualityNum) && isNaN(compQualityNum))) {
            const adjustmentValue = parseAdjustmentValue(adjustmentStr);
            if (normalizeForCompare(subjectQoCStr) === normalizeForCompare(compQoCStr)) {
                if (adjustmentValue !== 0) {
                    return { isError: true, message: `Warning: Quality of Construction is the same (${subjectQoCStr}), so no adjustment is required.` };
                }
                return { isMatch: true };
            }
        }
        if (isNaN(subjectQualityNum)) {
            return { isError: true, message: `Subject Quality of Construction must be between Q1-Q5. Got '${subjectQoCStr}'.` };
        }
        if (isNaN(compQualityNum)) {
            return { isError: true, message: `Comp Quality of Construction must be between Q1-Q5. Got '${compQoCStr}'.` };
        }
    }

    const adjustmentValue = parseAdjustmentValue(adjustmentStr);

    if (subjectQualityNum === compQualityNum) {
        if (adjustmentValue !== 0) {
            return { isError: true, message: `Warning: Quality of Construction is the same (${subjectQoCStr}), so no adjustment is required.` };
        }
    } else if (compQualityNum < subjectQualityNum) {
        if (!adjustmentStr) {
            return { isError: true, message: `Warning: Comp Quality of Construction (${compQoCStr}) is superior to Subject (${subjectQoCStr}), so a negative adjustment is required.` };
        }
        if (adjustmentValue > 0) {
            return { isError: true, message: `Warning: Comp Quality of Construction (${compQoCStr}) is superior to Subject (${subjectQoCStr}), so a negative adjustment or $0 is expected.` };
        }
    } else {
        if (!adjustmentStr) {
            return { isError: true, message: `Warning: Comp Quality of Construction (${compQoCStr}) is inferior to Subject (${subjectQoCStr}), so a positive adjustment is required.` };
        }
        if (adjustmentValue < 0) {
            return { isError: true, message: `Warning: Comp Quality of Construction (${compQoCStr}) is inferior to Subject (${subjectQoCStr}), so a positive adjustment or $0 is expected.` };
        }
    }
    return { isMatch: true };
};

export const checkProximityToSubject = (field, text, allData, arg4, arg5) => {
    let saleName = arg4;
    if (Array.isArray(arg4)) saleName = arg5;

    if (field !== 'Proximity to Subject' || !allData || !allData.Subject || !saleName || saleName === 'Subject') return null;
    const proximityText = String(text || '').trim();
    if (!proximityText) return null;

    const proximityValue = parseFloat(proximityText);
    if (isNaN(proximityValue)) return null;

    const neighborhoodSection = allData.NEIGHBORHOOD || allData.Neighborhood || allData.neighborhood || {};
    const location = String(neighborhoodSection.Location || neighborhoodSection.location || '').trim().toLowerCase();

    const comment = String(
        allData[saleName]?.['Proximity to Subject comment'] ||
        allData['Summary of Sales Comparison Approach'] ||
        allData['Sales Comparison Commentary'] ||
        allData.Subject?.['Summary of Sales Comparison Approach'] ||
        ''
    ).trim();

    const overrideField = 'Proximity to Subject comment';

    if (location === 'urban') {
        if (proximityValue > 1 && !comment) {
            return { isError: true, field: overrideField, message: `Proximity to Subject (${proximityText}) is greater than 1.0 miles for an Urban location. A comment is required.` };
        }
    } else if (location === 'suburban') {
        if (proximityValue > 3 && !comment) {
            return { isError: true, field: overrideField, message: `Proximity to Subject (${proximityText}) is greater than 3.0 miles for a Suburban location. A comment is required.` };
        }
    } else if (location === 'rural') {
        if (proximityValue > 5 && !comment) {
            return { isError: true, field: overrideField, message: `Proximity to Subject (${proximityText}) is greater than 5.0 miles for a Rural location. A comment is required.` };
        }
    } else if (!['urban', 'suburban', 'rural'].includes(location)) {
        return { isError: true, message: `Location in Neighborhood section must be Urban, Suburban, or Rural to validate proximity.` };
    }

    return { isMatch: true };
};

export const parseAreaToSqFt = (areaStr) => {
    const str = String(areaStr || '').trim().toLowerCase();
    const value = parseFloat(str.replace(/[^0-9.-]+/g, ""));
    if (isNaN(value)) return NaN;
    if (str.includes('ac') || str.includes('acre')) {
        return value * 43560;
    }
    return value;
};

export const checkSiteAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isSiteField = field === 'Site';
    const isAdjustmentField = field === 'Site Adjustment';

    if ((!isSiteField && !isAdjustmentField) || !allData || !saleName || saleName === 'Subject') return null;

    const subjGrid = getSubjectGridData(allData);
    const subjectSiteText = String(subjGrid['Site'] || allData.Subject?.['Site'] || '').trim();
    const compSiteText = String(allData[saleName]?.['Site'] || '').trim();
    const adjustmentText = String(allData[saleName]?.['Site Adjustment'] || '').trim();

    if (!subjectSiteText || !compSiteText) return null;

    const subjectSiteValue = parseAreaToSqFt(subjectSiteText);
    const compSiteValue = parseAreaToSqFt(compSiteText);
    const adjustmentValue = parseAdjustmentValue(adjustmentText);

    if (isNaN(subjectSiteValue) || isNaN(compSiteValue)) return null;

    if (compSiteValue > subjectSiteValue && (isNaN(adjustmentValue) || adjustmentValue > 0)) {
        return { isError: true, message: `Warning: Comp site value (${compSiteText}) is superior to Subject (${subjectSiteText}), but adjustment is not negative.` };
    }
    if (compSiteValue < subjectSiteValue && (isNaN(adjustmentValue) || adjustmentValue < 0)) {
        return { isError: true, message: `Warning: Comp site value (${compSiteText}) is inferior to Subject (${subjectSiteText}), but adjustment is not positive.` };
    }
    return { isMatch: true };
};

export const checkGrossLivingAreaAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isGlaField = field === 'Gross Living Area';
    const isAdjustmentField = field === 'Gross Living Area Adjustment';

    if ((!isGlaField && !isAdjustmentField) || !allData || !saleName || saleName === 'Subject') return null;

    const subjGrid = getSubjectGridData(allData);
    const subjectGlaText = String(subjGrid['Gross Living Area'] || allData.Subject?.['Gross Living Area'] || '').trim();
    const compGlaText = String(allData[saleName]?.['Gross Living Area'] || '').trim();
    const adjustmentText = String(allData[saleName]?.['Gross Living Area Adjustment'] || '').trim();

    if (!subjectGlaText || !compGlaText) return null;

    const subjectGlaValue = parseAreaToSqFt(subjectGlaText);
    const compGlaValue = parseAreaToSqFt(compGlaText);

    if (isNaN(subjectGlaValue) || isNaN(compGlaValue)) return null;

    if (adjustmentText === '') {
        return { isError: true, message: `Warning: Gross Living Area Adjustment cannot be blank.` };
    }

    const adjustmentValue = parseAdjustmentValue(adjustmentText);

    if (isNaN(adjustmentValue)) {
        return { isError: true, message: `Warning: Gross Living Area Adjustment must be a valid number.` };
    }

    if (adjustmentValue === 0) {
        return { isMatch: true };
    }
    if (compGlaValue === subjectGlaValue) {
        return { isError: true, message: `Warning: Gross Living Area is the same (${subjectGlaText}), but adjustment is not $0.` };
    }

    if (compGlaValue > subjectGlaValue && adjustmentValue > 0) {
        return { isError: true, message: `Warning: Comp GLA (${compGlaText}) is superior to Subject (${subjectGlaText}), but adjustment is not negative.` };
    }
    if (compGlaValue < subjectGlaValue && adjustmentValue < 0) {
        return { isError: true, message: `Warning: Comp GLA (${compGlaText}) is inferior to Subject (${subjectGlaText}), but adjustment is not positive.` };
    }

    return { isMatch: true };
};

export const checkSubjectAddressInconsistency = (
    field,
    text,
    data,
    fieldPath
) => {
    if ((field !== 'Property Address' && field !== 'Address') || !data?.Subject) {
        return null;
    }
    if (field === 'Address' && fieldPath[0] !== 'Subject') {
        return null;
    }

    const normalize = (val) =>
        String(val || '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');

    const propertyAddress = normalize(data['Property Address']);
    const subjectGridAddress = normalize(data.Subject?.Address);

    if (!propertyAddress || !subjectGridAddress) {
        return null;
    }

    if (subjectGridAddress === propertyAddress) {
        return { isMatch: true };
    }
    const fullAddress = normalize(
        `${data['Property Address']} ${data.Subject?.City} ${data.Subject?.State} ${data.Subject?.['Zip Code']}`
    );

    if (subjectGridAddress === fullAddress) {
        return { isMatch: true };
    }

    return {
        isError: true,
        message: `Subject Address mismatch.
Expected:
1) '${data['Property Address']}'
OR
2) '${data['Property Address']} ${data.Subject?.City} ${data.Subject?.State} ${data.Subject?.['Zip Code']}'
But found '${data.Subject?.Address}'.`
    };
};

export const checkDesignStyleAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isDesignField = field === 'Design (Style)';
    const isAdjustmentField = field === 'Design (Style) Adjustment';

    if ((!isDesignField && !isAdjustmentField) || !allData || !saleName || saleName === 'Subject') return null;

    const subjGrid = getSubjectGridData(allData);
    const subjectDesign = String(subjGrid['Design (Style)'] || allData.Subject?.['Design (Style)'] || '').trim();
    const compDesign = String(allData[saleName]?.['Design (Style)'] || '').trim();
    const adjustmentText = String(allData[saleName]?.['Design (Style) Adjustment'] || '').trim();

    if (subjectDesign && compDesign) {
        const designsAreDifferent = normalizeForCompare(subjectDesign) !== normalizeForCompare(compDesign);
        const adjustmentIsPresent = adjustmentText !== '';

        if (designsAreDifferent && !adjustmentIsPresent) {
            return { isError: true, message: `Design/Style mismatch (Subject: '${subjectDesign}', Comp: '${compDesign}'). An adjustment is required, even if $0.` };
        }
    }
    return { isMatch: true };
};

export const checkLocationConsistency = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let saleName = null;

    if (arg3 && typeof arg3 === 'object' && !arg3.hasOwnProperty('prototype') && !Array.isArray(arg3)) {
        allData = arg3;
        saleName = arg5;
    } else {
        allData = arg2;
        saleName = arg3;
    }

    const isLocationField = field === 'Location';
    const isAdjustmentField = field === 'Location Adjustment';

    if ((!isLocationField && !isAdjustmentField) || !allData || !saleName || saleName === 'Subject') {
        return null;
    }

    const subjGrid = getSubjectGridData(allData);
    const subjectLocation = String(subjGrid['Location'] || allData.Subject?.['Location'] || '').trim();
    const compLocation = String(allData[saleName]?.['Location'] || '').trim();
    const adjustmentText = String(allData[saleName]?.['Location Adjustment'] || '').trim();

    if (!subjectLocation || !compLocation) {
        return null;
    }

    if (normalizeForCompare(subjectLocation) === normalizeForCompare(compLocation)) {
        if (adjustmentText && adjustmentText !== '0' && adjustmentText !== '$0') {
            return { isError: true, message: `Warning: Location is the same (${subjectLocation}), but adjustment is not $0.` };
        }
    } else {
        if (!adjustmentText) {
            return { isError: true, message: `Warning: Location differs (Subject: '${subjectLocation}', Comp: '${compLocation}'), but no adjustment is made. An adjustment is required, even if 0.` };
        }
    }
    return { isMatch: true };
};

export const checkFunctionalUtilityAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isFunctionalUtilityField = field === 'Functional Utility';
    const isAdjustmentField = field === 'Functional Utility Adjustment';

    if ((!isFunctionalUtilityField && !isAdjustmentField) || !allData || !saleName || saleName === 'Subject') return null;

    const subjGrid = getSubjectGridData(allData);
    const subjectFunctionalUtility = String(subjGrid['Functional Utility'] || allData.Subject?.['Functional Utility'] || '').trim();
    const compFunctionalUtility = String(allData[saleName]?.['Functional Utility'] || '').trim();
    const adjustmentText = String(allData[saleName]?.['Functional Utility Adjustment'] || '').trim();

    if (!subjectFunctionalUtility || !compFunctionalUtility) return null;

    if (normalizeForCompare(subjectFunctionalUtility) === normalizeForCompare(compFunctionalUtility)) {
        if (adjustmentText && adjustmentText !== '0' && adjustmentText !== '$0') {
            return { isError: true, message: `Warning: Functional Utility is the same (${subjectFunctionalUtility}), but adjustment is not $0.` };
        }
    } else {
        if (!adjustmentText) {
            return { isError: true, message: `Warning: Functional Utility differs (Subject: '${subjectFunctionalUtility}', Comp: '${compFunctionalUtility}'), but no adjustment is made.` };
        }
    }
    return { isMatch: true };
};

export const checkEnergyEfficientItemsAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isItemField = field === 'Energy Efficient Items';
    const isAdjustmentField = field === 'Energy Efficient Items Adjustment';

    if ((!isItemField && !isAdjustmentField) || !allData || !saleName || saleName === 'Subject') return null;

    const subjGrid = getSubjectGridData(allData);
    const subjectItems = String(subjGrid['Energy Efficient Items'] || allData.Subject?.['Energy Efficient Items'] || '').trim();
    const compItems = String(allData[saleName]?.['Energy Efficient Items'] || '').trim();
    const adjustmentText = String(allData[saleName]?.['Energy Efficient Items Adjustment'] || '').trim();

    if (!subjectItems && !compItems) return null;

    if (normalizeForCompare(subjectItems) === normalizeForCompare(compItems)) {
        if (adjustmentText && adjustmentText !== '0' && adjustmentText !== '$0') {
            return { isError: true, message: `Warning: Energy Efficient Items are the same, but adjustment is not $0.` };
        }
    } else {
        if (!adjustmentText) {
            return { isError: true, message: `Warning: Energy Efficient Items differ (Subject: '${subjectItems}', Comp: '${compItems}'), but no adjustment is made.` };
        }
    }
    return { isMatch: true };
};

export const checkPorchPatioDeckAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isItemField = field === 'Porch/Patio/Deck';
    const isAdjustmentField = field === 'Porch/Patio/Deck Adjustment';

    if ((!isItemField && !isAdjustmentField) || !allData || !saleName || saleName === 'Subject') return null;

    const subjGrid = getSubjectGridData(allData);
    const subjectItems = String(subjGrid['Porch/Patio/Deck'] || allData.Subject?.['Porch/Patio/Deck'] || '').trim();
    const compItems = String(allData[saleName]?.['Porch/Patio/Deck'] || '').trim();
    const adjustmentText = String(allData[saleName]?.['Porch/Patio/Deck Adjustment'] || '').trim();

    if (!subjectItems && !compItems && !adjustmentText) return null;

    if (normalizeForCompare(subjectItems) === normalizeForCompare(compItems)) {
        if (adjustmentText && adjustmentText !== '0' && adjustmentText !== '$0') {
            return { isError: true, message: `Warning: Porch/Patio/Deck are the same, but adjustment is not $0.` };
        }
    } else {
        if (!adjustmentText) {
            return { isError: true, message: `Warning: Porch/Patio/Deck differ (Subject: '${subjectItems}', Comp: '${compItems}'), but no adjustment is made.` };
        }
    }
    return { isMatch: true };
};

export const checkHeatingCoolingAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isHeatingCoolingField = field === 'Heating/Cooling' || field === 'Heating/Cooling Adjustment';
    if (!isHeatingCoolingField || !allData || !saleName || saleName === 'Subject') return null;

    const subjGrid = getSubjectGridData(allData);
    const subjectHeatingCooling = String(subjGrid['Heating/Cooling'] || allData.Subject?.['Heating/Cooling'] || '').trim();
    const compHeatingCooling = String(allData[saleName]?.['Heating/Cooling'] || '').trim();
    const adjustmentText = String(allData[saleName]?.['Heating/Cooling Adjustment'] || '').trim();

    if (!subjectHeatingCooling || !compHeatingCooling) return null;

    if (normalizeForCompare(subjectHeatingCooling) === normalizeForCompare(compHeatingCooling)) {
        if (adjustmentText && adjustmentText !== '0' && adjustmentText !== '$0') {
            return { isError: true, message: `Heating/Cooling is the same (${compHeatingCooling}), but an adjustment of '${adjustmentText}' is present.` };
        }
    } else {
        if (!adjustmentText) {
            return { isError: true, message: `Heating/Cooling mismatch (Subject: '${subjectHeatingCooling}', Comp: '${compHeatingCooling}'). An adjustment is required.` };
        }
    }
    return { isMatch: true };
};


export const checkBasementAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName, textVal } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    if (!allData || !saleName || String(saleName).toLowerCase() === 'subject') return null;

    const subjGrid = getSubjectGridData(allData);
    const subjectBasement = String(
        subjGrid['Basement & Finished Rooms Below Grade'] ||
        subjGrid['Basement Description'] ||
        subjGrid['Basement & Finished Rooms'] ||
        subjGrid['Basement Finished Rooms'] ||
        allData.Subject?.['Basement & Finished Rooms Below Grade'] ||
        allData.Subject?.['Basement Description'] ||
        allData.SUBJECT?.['Basement & Finished Rooms Below Grade'] ||
        allData['Basement & Finished Rooms Below Grade'] ||
        ''
    ).trim();

    const compObj = (typeof getComparableGridData === 'function')
        ? getComparableGridData(allData, saleName)
        : (allData[saleName] || allData.SALES_GRID?.[saleName] || allData['Sales Grid']?.[saleName] || {});

    const isAdjustmentField = String(field || '').toLowerCase().includes('adjustment');

    let compBasement = '';
    let adjustmentText = '';

    if (isAdjustmentField) {
        adjustmentText = String(textVal !== null && textVal !== undefined ? textVal : (
            compObj['Basement & Finished Rooms Below Grade Adjustment'] ??
            compObj['Basement & Finished Rooms Adjustment'] ??
            compObj['Basement Adjustment'] ??
            compObj['Basement Description Adjustment'] ??
            compObj['Basement Finished Rooms Adjustment'] ??
            ''
        )).trim();
        compBasement = String(
            compObj['Basement & Finished Rooms Below Grade'] ??
            compObj['Basement & Finished Rooms'] ??
            compObj['Basement Description'] ??
            compObj['Basement Finished Rooms'] ??
            ''
        ).trim();
    } else {
        compBasement = String(textVal !== null && textVal !== undefined ? textVal : (
            compObj['Basement & Finished Rooms Below Grade'] ??
            compObj['Basement & Finished Rooms'] ??
            compObj['Basement Description'] ??
            compObj['Basement Finished Rooms'] ??
            ''
        )).trim();
        adjustmentText = String(
            compObj['Basement & Finished Rooms Below Grade Adjustment'] ??
            compObj['Basement & Finished Rooms Adjustment'] ??
            compObj['Basement Adjustment'] ??
            compObj['Basement Description Adjustment'] ??
            compObj['Basement Finished Rooms Adjustment'] ??
            ''
        ).trim();
    }

    if (!subjectBasement || !compBasement) return null;

    const normalizeBasement = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const isSame = normalizeBasement(subjectBasement) === normalizeBasement(compBasement);

    const parseAdjNum = (adjStr) => {
        if (adjStr === undefined || adjStr === null) return null;
        const str = String(adjStr).trim();
        if (!str || str === '$' || str === '-') return null;
        const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? null : num;
    };

    const targetField = isAdjustmentField ? 'Basement & Finished Rooms Below Grade Adjustment' : 'Basement & Finished Rooms Below Grade';

    if (isSame) {
        // If subject and comparable basement match:
        // $0 or blank is valid. A non-zero adjustment is invalid.
        const num = parseAdjNum(adjustmentText);
        if (num !== null && num !== 0) {
            return {
                isError: true,
                section: 'Sales Comparison',
                field: targetField,
                message: `Basement & Finished Rooms Below Grade is the same as Subject (${compBasement}), but an adjustment of '${adjustmentText}' is present. Adjustment should be $0 or blank.`
            };
        }
        return {
            isMatch: true,
            section: 'Sales Comparison',
            field: targetField,
            message: `Basement & Finished Rooms Below Grade is the same as Subject (${compBasement}). Validated with $0 / no adjustment.`
        };
    } else {
        // If subject and comparable basement differ:
        // An adjustment is required: 0, $0, positive, or negative are all valid adjustments.
        // If blank/empty, show error that an adjustment is required.
        const isBlank = adjustmentText === undefined || adjustmentText === null || String(adjustmentText).trim() === '' || String(adjustmentText).trim() === '$';
        if (isBlank) {
            return {
                isError: true,
                section: 'Sales Comparison',
                field: targetField,
                message: `Basement & Finished Rooms Below Grade differs from Subject (Subject: '${subjectBasement}', Comp: '${compBasement}'). An adjustment is required, even if 0.`
            };
        }

        const num = parseAdjNum(adjustmentText);
        return {
            isMatch: true,
            section: 'Sales Comparison',
            field: targetField,
            message: (num === 0 || adjustmentText.trim() === '0' || adjustmentText.trim() === '$0')
                ? `Basement & Finished Rooms Below Grade differs from Subject (Subject: '${subjectBasement}', Comp: '${compBasement}'), validated with $0 adjustment.`
                : `Adjustment of ${adjustmentText} is provided for difference in Basement & Finished Rooms Below Grade (Subject: '${subjectBasement}', Comp: '${compBasement}').`
        };
    }
};

export const checkDataSourceDOM = (field, text, arg3, arg4, arg5) => {
    let saleName = arg3;
    if (typeof arg3 === 'object') saleName = arg5;

    if (field !== 'Data Source(s)' || !saleName || saleName === 'Subject') return null;

    const textValue = String(text || '').trim();
    if (!textValue) return null;

    const domIndex = textValue.toLowerCase().indexOf('dom');

    if (domIndex !== -1) {
        const restOfString = textValue.substring(domIndex + 3).trim();
        if (restOfString.replace(/[:\s]/g, '') === '') {
            return { isError: true, message: `Value for 'DOM' is missing in Data Source(s).` };
        }
    }
    return { isMatch: true };
};

export const checkActualAgeAdjustment = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let saleName = null;
    let textVal = null;

    if (arg3 && typeof arg3 === 'object' && !arg3.hasOwnProperty('prototype') && !Array.isArray(arg3)) {
        allData = arg3;
        saleName = arg5;
        textVal = arg2;
    } else {
        allData = arg2;
        saleName = arg3;
    }

    const isAgeField = field === 'Actual Age';
    const isAdjustmentField = field === 'Actual Age Adjustment';

    if ((!isAgeField && !isAdjustmentField) || !saleName || saleName === 'Subject' || !allData) return null;

    const subjGrid = getSubjectGridData(allData);
    const subjectAgeStr = String(
        subjGrid['Actual Age'] ||
        allData['Actual Age'] ||
        allData.Subject?.['Actual Age'] ||
        ''
    ).trim();

    const compIndexMatch = String(saleName).match(/\d+/);
    const compIndex = compIndexMatch ? compIndexMatch[0] : '';

    let compAgeStr = '';
    if (isAgeField && textVal !== null && textVal !== undefined) {
        compAgeStr = String(textVal).trim();
    } else {
        compAgeStr = String(
            allData[saleName]?.['Actual Age'] ||
            (compIndex ? allData[`Comp ${compIndex} Actual Age`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Actual Age`] : '') ||
            ''
        ).trim();
    }

    let adjustmentStr = '';
    if (isAdjustmentField && textVal !== null && textVal !== undefined) {
        adjustmentStr = String(textVal).trim();
    } else {
        adjustmentStr = String(
            allData[saleName]?.['Actual Age Adjustment'] ||
            (compIndex ? allData[`Comp ${compIndex} Actual Age Adjustment`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Actual Age Adjustment`] : '') ||
            ''
        ).trim();
    }

    if (!subjectAgeStr || !compAgeStr) return null;

    let subjectAge = parseInt(subjectAgeStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(subjectAge) && subjectAgeStr.toLowerCase().includes('new')) {
        subjectAge = 0;
    }
    let compAge = parseInt(compAgeStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(compAge) && compAgeStr.toLowerCase().includes('new')) {
        compAge = 0;
    }

    if (isNaN(subjectAge) || isNaN(compAge)) return null;

    const adjustmentValue = parseAdjustmentValue(adjustmentStr);

    if (compAge === subjectAge) {
        if (adjustmentValue !== 0) {
            return { isError: true, message: `Subject and Comp Actual Age are the same (${subjectAge}), so no adjustment is required.` };
        }
    } else if (compAge > subjectAge) {
        if (adjustmentValue < 0) {
            return { isError: true, message: `Comp is older (${compAge} yrs) than Subject (${subjectAge} yrs), so a positive adjustment or $0 is expected.` };
        }
    } else {
        if (adjustmentValue > 0) {
            return { isError: true, message: `Comp is newer (${compAge} yrs) than Subject (${subjectAge} yrs), so a negative adjustment or $0 is expected.` };
        }
    }
    return { isMatch: true };
};


export const checkLeaseholdFeeSimpleConsistency = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let saleName = null;
    let textVal = null;

    if (arg3 && typeof arg3 === 'object' && !arg3.hasOwnProperty('prototype') && !Array.isArray(arg3)) {
        allData = arg3;
        saleName = arg5;
        textVal = arg2;
    } else {
        allData = arg2;
        saleName = arg3;
    }

    const isLeaseholdField = field === 'Leasehold/Fee Simple';
    const isAdjustmentField = field === 'Leasehold/Fee Simple Adjustment';

    if ((!isLeaseholdField && !isAdjustmentField) || !saleName || !allData) return null;

    if (saleName === 'Subject') {
        const subjectSectionPropertyRights = String(allData['Property Rights Appraised'] || allData.Subject?.['Property Rights Appraised'] || '').trim();
        const subjGrid = getSubjectGridData(allData);
        const salesGridPropertyRights = String(
            textVal !== null && textVal !== undefined ? textVal : (subjGrid['Leasehold/Fee Simple'] || allData['Leasehold/Fee Simple'] || '')
        ).trim();

        if (salesGridPropertyRights && subjectSectionPropertyRights && normalizeForCompare(salesGridPropertyRights) !== normalizeForCompare(subjectSectionPropertyRights)) {
            return { isError: true, message: `Property Rights mismatch: Subject section has '${subjectSectionPropertyRights}', but Sales Comparison has '${salesGridPropertyRights}'.` };
        }
        return { isMatch: true };
    }


    const subjGrid = getSubjectGridData(allData);
    const subjectValStr = String(
        subjGrid['Property Rights Appraised'] ||
        subjGrid['Leasehold/Fee Simple'] ||
        allData['Property Rights Appraised'] ||
        allData['Leasehold/Fee Simple'] ||
        ''
    ).trim();

    const compIndexMatch = String(saleName).match(/\d+/);
    const compIndex = compIndexMatch ? compIndexMatch[0] : '';

    let compValStr = '';
    if (isLeaseholdField && textVal !== null && textVal !== undefined) {
        compValStr = String(textVal).trim();
    } else {
        compValStr = String(
            allData[saleName]?.['Leasehold/Fee Simple'] ||
            (compIndex ? allData[`Comp ${compIndex} Leasehold/Fee Simple`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Leasehold/Fee Simple`] : '') ||
            ''
        ).trim();
    }

    let adjustmentStr = '';
    if (isAdjustmentField && textVal !== null && textVal !== undefined) {
        adjustmentStr = String(textVal).trim();
    } else {
        adjustmentStr = String(
            allData[saleName]?.['Leasehold/Fee Simple Adjustment'] ||
            (compIndex ? allData[`Comp ${compIndex} Leasehold/Fee Simple Adjustment`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Leasehold/Fee Simple Adjustment`] : '') ||
            ''
        ).trim();
    }

    if (!subjectValStr || !compValStr) return null;

    const adjustmentValue = parseAdjustmentValue(adjustmentStr);

    const normSubject = normalizeForCompare(subjectValStr);
    const normComp = normalizeForCompare(compValStr);

    if (normComp === normSubject) {
        if (adjustmentValue !== 0) {
            return { isError: true, message: `Warning: Leasehold/Fee Simple is the same (${compValStr}), so no adjustment is required.` };
        }
    } else {
        if (!adjustmentStr) {
            return { isError: true, message: `Warning: Property rights mismatch (Subject: '${subjectValStr}', Comp: '${compValStr}'), so an adjustment is required.` };
        }
    }
    return { isMatch: true };
};

export const checkCompDesignStyle = (field, text, allData, saleName) => {
    if (field !== 'Design (Style)' || !saleName || saleName === 'Subject' || !allData || !allData.Subject) return null;
    return null;
};

export const checkDateOfSale = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName, textVal } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);

    if (saleName && String(saleName).toLowerCase() === 'subject') return null;

    const rawText = String(
        textVal !== null && textVal !== undefined && String(textVal).trim() !== ''
            ? textVal
            : (allData?.[saleName]?.['Date of Sale/Time'] || allData?.SALES_GRID?.[saleName]?.['Date of Sale/Time'] || '')
    ).trim();

    if (!rawText) return null;

    // 1. If value indicates an active listing, it is considered valid
    const lowerText = rawText.toLowerCase();
    const isActive = lowerText.includes('active') || /^(?:act\b|act\.|act;)/i.test(rawText);
    if (isActive) {
        return {
            isMatch: true,
            section: 'Sales Comparison',
            field: 'Date of Sale/Time',
            message: `Active listing is a valid value (${rawText}).`
        };
    }

    // 2. Helper to parse date part with prefix 's' (settlement/sale date) or 'c' (contract date)
    const parseDatePart = (str, prefix) => {
        const regex = new RegExp(`(?:^|[^a-zA-Z0-9])${prefix}\\s*:?\\s*(\\d{1,2})\\s*[/.-]\\s*(\\d{2,4})`, 'i');
        const match = str.match(regex);
        if (!match) return null;
        const month = parseInt(match[1], 10);
        let year = parseInt(match[2], 10);
        if (isNaN(month) || month < 1 || month > 12) return null;
        if (year < 100) {
            year = year >= 70 ? 1900 + year : 2000 + year;
        }
        const formatted = `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
        return {
            month,
            year,
            formatted,
            totalMonths: year * 12 + month
        };
    };

    const sPart = parseDatePart(rawText, 's');
    const cPart = parseDatePart(rawText, 'c');

    // 3. When both 's' and 'c' exist, validate that 's' (sale date) is greater than or equal to 'c' (contract date)
    if (sPart && cPart) {
        if (sPart.totalMonths < cPart.totalMonths) {
            return {
                isError: true,
                section: 'Sales Comparison',
                field: 'Date of Sale/Time',
                message: `'s' value (s${sPart.formatted}) cannot be earlier than 'c' value (c${cPart.formatted}). Contract date cannot be after sale date.`
            };
        }
        if (sPart.totalMonths === cPart.totalMonths) {
            return {
                isMatch: true,
                section: 'Sales Comparison',
                field: 'Date of Sale/Time',
                message: `'s' value (s${sPart.formatted}) is equal to 'c' value (c${cPart.formatted}) (same month/year).`
            };
        }
        return {
            isMatch: true,
            section: 'Sales Comparison',
            field: 'Date of Sale/Time',
            message: `'s' value (s${sPart.formatted}) is greater than 'c' value (c${cPart.formatted}).`
        };
    }

    // 4. If only 's' is present (contract date unknown or not recorded)
    if (sPart && !cPart) {
        return {
            isMatch: true,
            section: 'Sales Comparison',
            field: 'Date of Sale/Time',
            message: `Sale date (s${sPart.formatted}) is valid.`
        };
    }

    // 5. Standard date fallback
    const parsedDate = new Date(rawText);
    if (!isNaN(parsedDate.getTime())) {
        return {
            isMatch: true,
            section: 'Sales Comparison',
            field: 'Date of Sale/Time',
            message: `Sale date (${rawText}) is valid.`
        };
    }

    return null;
};


const extractConcessionAmount = (str) => {
    if (!str || typeof str !== 'string') return null;
    const trimmed = str.trim();

    // Check for Listing or Active
    if (/^(?:listing|active|act\b|act\.)/i.test(trimmed)) {
        return { isListing: true, amount: 0, raw: trimmed };
    }

    // Check for "None", "No", "N/A"
    if (/^(?:none|no|n\/a|na)$/i.test(trimmed)) {
        return { isNone: true, amount: 0, raw: trimmed };
    }

    // UAD format typically has 3 parts separated by ';' or ':' e.g. "ArmLth; Conv;2800" or "ArmLth; Cash;0"
    if (trimmed.includes(';') || trimmed.includes(':')) {
        const parts = trimmed.split(/[;:]/).map(p => p.trim());
        if (parts.length >= 3) {
            const lastPart = parts[2];
            if (/^(?:none|unk|unknown|no|n\/a)$/i.test(lastPart)) {
                return { amount: 0, raw: lastPart };
            }
            const num = parseFloat(lastPart.replace(/[^0-9.-]/g, ''));
            if (!isNaN(num)) {
                return { amount: Math.abs(num), raw: lastPart };
            }
        } else if (parts.length === 2) {
            const lastPart = parts[1];
            if (/^(?:none|unk|unknown|no|n\/a)$/i.test(lastPart)) {
                return { amount: 0, raw: lastPart };
            }
            const num = parseFloat(lastPart.replace(/[^0-9.-]/g, ''));
            if (!isNaN(num)) {
                return { amount: Math.abs(num), raw: lastPart };
            }
        }
    }

    // Match numbers at the end of the string e.g. "Conv 2800" or "; 2800" or "$2,800"
    const matchEndNum = trimmed.match(/[;:\s]\$?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+)\s*$/);
    if (matchEndNum) {
        const num = parseFloat(matchEndNum[1].replace(/,/g, ''));
        if (!isNaN(num)) {
            return { amount: Math.abs(num), raw: matchEndNum[1] };
        }
    }

    return null;
};

const parseConcessionAdjustment = (adjStr) => {
    if (adjStr === undefined || adjStr === null) return 0;
    const str = String(adjStr).trim();
    if (!str || str === '$' || str === '-') return 0;

    const isNegative = str.includes('-') || (str.startsWith('(') && str.endsWith(')'));
    const cleanNum = parseFloat(str.replace(/[^0-9.]/g, ''));
    if (isNaN(cleanNum)) return 0;

    return isNegative ? -Math.abs(cleanNum) : cleanNum;
};

const getCompConcessionsData = (allData, saleName) => {
    if (!allData || !saleName) return { desc: '', adj: '' };
    const compObj = allData[saleName] || allData.SALES_GRID?.[saleName] || allData['Sales Grid']?.[saleName] || {};
    const desc = compObj['Sales or Financing Concessions']
        ?? compObj['Sales Concessions']
        ?? compObj['Sale or Financing']
        ?? compObj['Sales or Financing']
        ?? '';
    const adj = compObj['Sales or Financing Concessions Adjustment']
        ?? compObj['Sales Concessions Adjustment']
        ?? compObj['Sale or Financing Adjustment']
        ?? compObj['Sales Concession Adjustment']
        ?? '';
    return { desc: String(desc || '').trim(), adj: String(adj || '').trim() };
};

export const checkSalesConcessions = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName, textVal } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    if (saleName && String(saleName).toLowerCase() === 'subject') return null;

    const compData = getCompConcessionsData(allData, saleName);
    const descStr = String(textVal !== null && textVal !== undefined && String(textVal).trim() !== '' ? textVal : compData.desc).trim();
    const adjStr = compData.adj;

    if (!descStr) return null;

    const parsed = extractConcessionAmount(descStr);
    if (!parsed) return null;

    const adjNum = parseConcessionAdjustment(adjStr);

    // Case 1: Listing
    if (parsed.isListing) {
        if (adjNum !== 0) {
            return {
                isError: true,
                section: 'Sales Comparison',
                field: 'Sales or Financing Concessions',
                message: `Listing should not have a sales concession adjustment (found: ${adjStr}).`
            };
        }
        return {
            isMatch: true,
            section: 'Sales Comparison',
            field: 'Sales or Financing Concessions',
            message: `Listing is a valid value with no sales concession adjustment required.`
        };
    }

    // Case 2: Concession amount is 0 (e.g. ArmLth; Conv;0, ArmLth; Cash;0, None)
    if (parsed.amount === 0) {
        if (adjNum !== 0) {
            return {
                isError: true,
                section: 'Sales Comparison',
                field: 'Sales or Financing Concessions',
                message: `Sales Concessions indicates $0 concession, but adjustment is ${adjStr}. Adjustment should be $0 or blank.`
            };
        }
        return {
            isMatch: true,
            section: 'Sales Comparison',
            field: 'Sales or Financing Concessions',
            message: `Sales Concessions (${descStr}) has no concessions; adjustment is correctly $0 or blank.`
        };
    }

    // Case 3: Concession amount > 0 (e.g. ArmLth; Conv;2800)
    const expectedAdj = -parsed.amount;
    if (adjNum === expectedAdj) {
        return {
            isMatch: true,
            section: 'Sales Comparison',
            field: 'Sales or Financing Concessions',
            message: `Sales Concessions of $${parsed.amount.toLocaleString()} is correctly adjusted by -$${parsed.amount.toLocaleString()}.`
        };
    }

    return {
        isError: true,
        section: 'Sales Comparison',
        field: 'Sales or Financing Concessions',
        message: `Sales Concessions indicates $${parsed.amount.toLocaleString()}, but adjustment is ${adjStr || '$0'}. Expected adjustment is -$${parsed.amount.toLocaleString()}.`
    };
};

export const checkSalesConcessionsAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName, textVal } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    if (saleName && String(saleName).toLowerCase() === 'subject') return null;

    const compData = getCompConcessionsData(allData, saleName);
    const descStr = compData.desc;
    const adjStr = String(textVal !== null && textVal !== undefined && String(textVal).trim() !== '' ? textVal : compData.adj).trim();

    if (!descStr) return null;

    const parsed = extractConcessionAmount(descStr);
    if (!parsed) return null;

    const adjNum = parseConcessionAdjustment(adjStr);

    // Case 1: Listing
    if (parsed.isListing) {
        if (adjNum !== 0) {
            return {
                isError: true,
                section: 'Sales Comparison',
                field: 'Sales or Financing Concessions Adjustment',
                message: `Listing should not have a sales concession adjustment (found: ${adjStr}).`
            };
        }
        return {
            isMatch: true,
            section: 'Sales Comparison',
            field: 'Sales or Financing Concessions Adjustment',
            message: `Listing adjustment is valid ($0 or blank).`
        };
    }

    // Case 2: Concession amount is 0
    if (parsed.amount === 0) {
        if (adjNum !== 0) {
            return {
                isError: true,
                section: 'Sales Comparison',
                field: 'Sales or Financing Concessions Adjustment',
                message: `Sales Concessions indicates $0 concession, but adjustment is ${adjStr}. Adjustment should be $0 or blank.`
            };
        }
        return {
            isMatch: true,
            section: 'Sales Comparison',
            field: 'Sales or Financing Concessions Adjustment',
            message: `Sales Concessions adjustment is valid ($0 or blank).`
        };
    }

    // Case 3: Concession amount > 0
    const expectedAdj = -parsed.amount;
    if (adjNum === expectedAdj) {
        return {
            isMatch: true,
            section: 'Sales Comparison',
            field: 'Sales or Financing Concessions Adjustment',
            message: `Sales Concessions adjustment of -$${parsed.amount.toLocaleString()} matches concession amount of $${parsed.amount.toLocaleString()}.`
        };
    }

    return {
        isError: true,
        section: 'Sales Comparison',
        field: 'Sales or Financing Concessions Adjustment',
        message: `Sales Concessions indicates $${parsed.amount.toLocaleString()}, but adjustment is ${adjStr || '$0'}. Expected adjustment is -$${parsed.amount.toLocaleString()}.`
    };
};

export const checkSalePrice = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    if (field !== 'Sale Price' || !allData || !saleName || saleName === 'Subject') {
        return null;
    }

    const subjGrid = getSubjectGridData(allData);
    const subjectSalePriceText = String(subjGrid['Sale Price'] || allData.Subject?.['Sale Price'] || '').trim();
    const compSalePriceText = String(allData[saleName]?.['Sale Price'] || '').trim();

    if (!subjectSalePriceText || !compSalePriceText) {
        return null;
    }

    const subjectPrice = parseFloat(subjectSalePriceText.replace(/[^0-9.-]+/g, ""));
    const compPrice = parseFloat(compSalePriceText.replace(/[^0-9.-]+/g, ""));

    if (isNaN(subjectPrice) || isNaN(compPrice) || subjectPrice === 0) {
        return null;
    }

    const difference = Math.abs(subjectPrice - compPrice);
    const percentageDifference = (difference / subjectPrice) * 100;

    if (percentageDifference > 25) {
        return { isError: true, message: `Warning: Comp sale price ($${compPrice.toLocaleString()}) differs from Subject sale price ($${subjectPrice.toLocaleString()}) by more than 25%.` };
    }

    return { isMatch: true };
};

export const checkSubjectAgeConsistency = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let saleName = null;
    let actualAgeVal = null;

    if (arg3 && typeof arg3 === 'object' && !arg3.hasOwnProperty('prototype') && !Array.isArray(arg3)) {
        allData = arg3;
        saleName = arg5;
        actualAgeVal = arg2;
    } else {
        allData = arg2;
        saleName = arg3;
    }

    if (field !== 'Actual Age' || saleName !== 'Subject' || !allData) return null;

    let actualAgeStr = String(actualAgeVal || '').trim();
    if (!actualAgeStr) {
        const subjGrid = getSubjectGridData(allData);
        actualAgeStr = String(
            subjGrid['Actual Age'] ||
            allData['Actual Age'] ||
            allData.Subject?.['Actual Age'] ||
            ''
        ).trim();
    }

    const yearBuiltStr = String(
        allData.IMPROVEMENTS?.['Year Built'] ||
        allData['Year Built'] ||
        allData.Subject?.['Year Built'] ||
        allData['Subject']?.['Year Built'] ||
        allData.SITE?.['Year Built'] ||
        ''
    ).trim();

    if (!actualAgeStr || !yearBuiltStr) return null;

    let actualAge = parseInt(actualAgeStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(actualAge) && actualAgeStr.toLowerCase().includes('new')) {
        actualAge = 0;
    }
    const yearBuilt = parseInt(yearBuiltStr.replace(/[^0-9]/g, ''), 10);

    if (isNaN(actualAge) || isNaN(yearBuilt)) return null;

    let currentYear = new Date().getFullYear();
    const effectiveDateStr = String(
        allData.CERTIFICATION?.['Effective Date of Appraisal'] ||
        allData['Effective Date of Appraisal'] ||
        allData['Effective Date'] ||
        allData.CERTIFICATION?.['Date of Signature and Report'] ||
        allData['Date of Signature and Report'] ||
        ''
    ).trim();

    if (effectiveDateStr) {
        const yearMatch = effectiveDateStr.match(/\b(19\d\d|20\d\d)\b/);
        if (yearMatch) {
            currentYear = parseInt(yearMatch[1], 10);
        }
    }

    const calculatedAge = currentYear - yearBuilt;

    if (Math.abs(calculatedAge - actualAge) > 1) {
        return { isError: true, message: `Subject Actual Age (${actualAge}) in Sales Grid does not match Year Built (${yearBuilt}). Expected ~${calculatedAge}.` };
    }

    return { isMatch: true };
};

export const checkViewAdjustment = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let saleName = null;
    let textVal = null;

    if (arg3 && typeof arg3 === 'object' && !arg3.hasOwnProperty('prototype') && !Array.isArray(arg3)) {
        allData = arg3;
        saleName = arg5;
        textVal = arg2;
    } else {
        allData = arg2;
        saleName = arg3;
    }

    const isViewField = field === 'View';
    const isAdjustmentField = field === 'View Adjustment';

    if ((!isViewField && !isAdjustmentField) || !saleName || saleName === 'Subject' || !allData) return null;

    const subjGrid = getSubjectGridData(allData);
    const subjectView = String(
        subjGrid['View'] ||
        allData['View'] ||
        allData.Subject?.['View'] ||
        ''
    ).trim().toUpperCase();

    const compIndexMatch = String(saleName).match(/\d+/);
    const compIndex = compIndexMatch ? compIndexMatch[0] : '';

    let compView = '';
    if (isViewField && textVal !== null && textVal !== undefined) {
        compView = String(textVal).trim().toUpperCase();
    } else {
        compView = String(
            allData[saleName]?.['View'] ||
            (compIndex ? allData[`Comp ${compIndex} View`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} View`] : '') ||
            ''
        ).trim().toUpperCase();
    }

    let adjustmentStr = '';
    if (isAdjustmentField && textVal !== null && textVal !== undefined) {
        adjustmentStr = String(textVal).trim();
    } else {
        adjustmentStr = String(
            allData[saleName]?.['View Adjustment'] ||
            (compIndex ? allData[`Comp ${compIndex} View Adjustment`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} View Adjustment`] : '') ||
            ''
        ).trim();
    }

    if (!subjectView || !compView) return null;

    const adjustmentValue = parseAdjustmentValue(adjustmentStr);

    const normSubjectView = normalizeForCompare(subjectView);
    const normCompView = normalizeForCompare(compView);

    if (normCompView === normSubjectView) {
        if (adjustmentValue !== 0) {
            return { isError: true, message: `Warning: View is the same (${compView}), so no adjustment is required.` };
        }
    } else {
        if (!adjustmentStr) {
            return { isError: true, message: `Warning: View differs (Subject: '${subjectView}', Comp: '${compView}'), so an adjustment is required.` };
        }
    }
    return { isMatch: true };
};


export const getOpinionOfMarketValue = (allData) => {
    if (!allData || typeof allData !== 'object') return null;

    const possibleKeys = [
        "opinion of the market value, as defined, of the real property that is the subject of this report is $",
        "Final Value $",
        "Indicated Value by Sales Comparison Approach $",
        "Indicated Value by: Sales Comparison Approach $",
        "APPRAISED VALUE OF SUBJECT PROPERTY Appraised Value $",
        "APPRAISED VALUE OF SUBJECT PROPERTY $",
        "Opinion of Market Value",
        "Final Value",
        "Market Value"
    ];

    const sources = [
        allData.RECONCILIATION,
        allData.Reconciliation,
        allData.SALES_TRANSFER,
        allData.SALES_GRID,
        allData['Sales Grid'],
        allData.CERTIFICATION,
        allData.APPRAISER,
        allData.SUMMARY,
        allData.Subject,
        allData.SUBJECT,
        allData.clean_data?.Reconciliation,
        allData.clean_data?.['Sales Grid'],
        allData
    ];

    for (const src of sources) {
        if (!src || typeof src !== 'object') continue;
        for (const k of possibleKeys) {
            const val = src[k];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
                const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
                if (!isNaN(num) && num > 0) return num;
            }
        }
        for (const [k, val] of Object.entries(src)) {
            if (k.toLowerCase().includes('opinion of the market value')) {
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                    const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
                    if (!isNaN(num) && num > 0) return num;
                }
            }
        }
    }

    return null;
};

export const getComparableSalesPrices = (allData) => {
    const salePrices = [];
    const adjPrices = [];
    const compSaleDetails = [];
    const compAdjDetails = [];
    if (!allData || typeof allData !== 'object') {
        return { salePrices, adjPrices, compSaleDetails, compAdjDetails };
    }

    const seenComps = new Set();
    const processCompObj = (compObj, compIdentifier) => {
        if (!compObj || typeof compObj !== 'object' || Array.isArray(compObj)) return;
        if (compIdentifier && seenComps.has(compIdentifier)) return;
        if (compIdentifier) seenComps.add(compIdentifier);

        // Extract Sale Price
        const rawSale = compObj['Sale Price']
            ?? compObj['Sale Price $']
            ?? compObj['SalePrice']
            ?? compObj['Sale price']
            ?? compObj['SALE PRICE'];
        if (rawSale !== undefined && rawSale !== null && String(rawSale).trim() !== '') {
            const sNum = parseFloat(String(rawSale).replace(/[^0-9.]/g, ''));
            if (!isNaN(sNum) && sNum > 0) {
                salePrices.push(sNum);
                compSaleDetails.push({ name: compIdentifier || 'Comparable', price: sNum, raw: rawSale });
            }
        }

        // Extract Adjusted Sale Price of Comparable
        const rawAdj = compObj['Adjusted Sale Price of Comparable']
            ?? compObj['Adjusted Sale Price of Comparable $']
            ?? compObj['Adjusted Sale Price']
            ?? compObj['AdjustedSalePrice']
            ?? compObj['Adjusted sale price of comparable']
            ?? compObj['ADJUSTED SALE PRICE OF COMPARABLE']
            ?? compObj['Indicated Value by Sales Comparison Approach $']
            ?? compObj['Indicated Value by Sales Comparison Approach']
            ?? compObj['Indicated Value by Sales Comparison']
            ?? compObj['Indicated Value'];
        if (rawAdj !== undefined && rawAdj !== null && String(rawAdj).trim() !== '') {
            const aNum = parseFloat(String(rawAdj).replace(/[^0-9.]/g, ''));
            if (!isNaN(aNum) && aNum > 0) {
                adjPrices.push(aNum);
                compAdjDetails.push({ name: compIdentifier || 'Comparable', price: aNum, raw: rawAdj });
            }
        }
    };

    // 1. Check top-level keys in allData first (user edits in UI are stored at top-level)
    Object.entries(allData).forEach(([key, val]) => {
        if (key.toLowerCase().trim() === 'subject') return;
        const match = key.match(/^(?:comparable(?:\s*sale)?|comp)[\s#]*(\d+)$/i);
        if (match && typeof val === 'object' && val !== null && !Array.isArray(val)) {
            const compId = `comp_${match[1]}`;
            processCompObj(val, compId);
        }
    });

    // 2. Check numbered comps 1 to 9 if not yet captured
    for (let i = 1; i <= 9; i++) {
        const compId = `comp_${i}`;
        if (!seenComps.has(compId)) {
            const compObj = allData[`COMPARABLE SALE #${i}`]
                || allData[`COMPARABLE SALE # ${i}`]
                || allData[`Comparable Sale #${i}`]
                || allData[`Comparable Sale ${i}`]
                || allData[`Comp ${i}`]
                || allData[`COMPARABLE #${i}`];
            if (compObj && typeof compObj === 'object') {
                processCompObj(compObj, compId);
            }
        }
    }

    // 3. Check SALES_GRID / Sales Grid / SALES_COMPARISON containers
    const gridContainers = [
        allData.SALES_GRID,
        allData['Sales Grid'],
        allData.SALES_COMPARISON,
        allData.clean_data?.['Sales Grid'],
        allData.clean_data?.SALES_GRID
    ];

    gridContainers.forEach(container => {
        if (container && typeof container === 'object') {
            Object.entries(container).forEach(([key, val]) => {
                if (key.toLowerCase().trim() === 'subject') return;
                const match = key.match(/(?:comparable(?:\s*sale)?|comp)[\s#]*(\d+)/i);
                const compId = match ? `comp_${match[1]}` : key;
                processCompObj(val, compId);
            });
        }
    });

    return { salePrices, adjPrices, compSaleDetails, compAdjDetails };
};

const _evaluateBracketing = (finalValue, prices, label = 'comparables', compDetails = []) => {
    if (!finalValue || !Array.isArray(prices) || prices.length === 0) {
        return { isBracketed: false, summary: 'No comparable prices available' };
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);

    const minPct = (((min - finalValue) / finalValue) * 100).toFixed(1);
    const maxPct = (((max - finalValue) / finalValue) * 100).toFixed(1);
    const minSign = Number(minPct) > 0 ? '+' : '';
    const maxSign = Number(maxPct) > 0 ? '+' : '';
    const rangeSummary = `Range: $${min.toLocaleString()} (${minSign}${minPct}%) to $${max.toLocaleString()} (${maxSign}${maxPct}%)`;

    // Simple bracketing check: at least one comp <= finalValue and at least one comp >= finalValue
    const isBracketed = (min <= finalValue && max >= finalValue);

    if (isBracketed) {
        return {
            isBracketed: true,
            isMatch: true,
            summary: rangeSummary
        };
    }

    if (min > finalValue) {
        return {
            isBracketed: false,
            isError: true,
            summary: `All ${label} are above Opinion of Market Value ($${finalValue.toLocaleString()}). Lowest is $${min.toLocaleString()} (${minSign}${minPct}%). ${rangeSummary}`
        };
    }

    return {
        isBracketed: false,
        isError: true,
        summary: `All ${label} are below Opinion of Market Value ($${finalValue.toLocaleString()}). Highest is $${max.toLocaleString()} (${maxSign}${maxPct}%). ${rangeSummary}`
    };
};

export const evaluateBracketing = _evaluateBracketing;
export const evaluateBracketing10to20 = _evaluateBracketing;

export const checkFinalValueBracketing = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let textVal = null;

    if (arg3 && typeof arg3 === 'object' && !Array.isArray(arg3)) {
        allData = arg3;
        textVal = arg2;
    } else if (arg2 && typeof arg2 === 'object' && !Array.isArray(arg2)) {
        allData = arg2;
        textVal = null;
    } else if (typeof field === 'object' && field !== null && !Array.isArray(field)) {
        allData = field;
        field = 'opinion of the market value, as defined, of the real property that is the subject of this report is $';
    }

    if (!allData || typeof allData !== 'object') return null;

    const fieldLower = String(field || '').trim().toLowerCase();
    const isTargetField = !field ||
        fieldLower.includes('opinion of the market value') ||
        fieldLower === 'final value' ||
        fieldLower === 'final value $' ||
        fieldLower === 'indicated value by sales comparison approach $' ||
        fieldLower === 'indicated value by: sales comparison approach $' ||
        fieldLower === 'appraised value of subject property $';

    if (!isTargetField) return null;

    let finalValue = null;
    if (textVal !== null && textVal !== undefined && String(textVal).trim() !== '') {
        const parsed = parseFloat(String(textVal).replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
            finalValue = parsed;
        }
    }

    if (finalValue === null) {
        finalValue = getOpinionOfMarketValue(allData);
    }

    if (finalValue === null || isNaN(finalValue) || finalValue <= 0) {
        return null;
    }

    const { salePrices, adjPrices, compSaleDetails, compAdjDetails } = getComparableSalesPrices(allData);

    if (salePrices.length === 0 && adjPrices.length === 0) {
        return null;
    }

    const hasSale = salePrices.length > 0;
    const hasAdj = adjPrices.length > 0;

    const evalSale = _evaluateBracketing(finalValue, salePrices, 'Sale Price', compSaleDetails);
    const evalAdj = _evaluateBracketing(finalValue, adjPrices, 'Adjusted Sale Price of Comparable', compAdjDetails);

    const targetFieldName = (field && String(field).trim()) || "opinion of the market value, as defined, of the real property that is the subject of this report is $";
    const displayLabel = "Opinion of Market Value (Bracketing)";

    if (hasSale && hasAdj) {
        if (!evalAdj.isBracketed) {
            return {
                isError: true,
                section: 'Sales Comparison',
                field: targetFieldName,
                message: `${displayLabel}: $${finalValue.toLocaleString()} is unbracketed by Adjusted Sale Price of Comparable. ${evalAdj.summary}.`
            };
        }
        if (!evalSale.isBracketed) {
            return {
                isError: true,
                section: 'Sales Comparison',
                field: targetFieldName,
                message: `${displayLabel}: $${finalValue.toLocaleString()} is unbracketed by comparable Sale Price. ${evalSale.summary}.`
            };
        }
    } else if (hasAdj && !evalAdj.isBracketed) {
        return {
            isError: true,
            section: 'Sales Comparison',
            field: targetFieldName,
            message: `${displayLabel}: $${finalValue.toLocaleString()} is unbracketed by Adjusted Sale Price of Comparable. ${evalAdj.summary}.`
        };
    } else if (hasSale && !evalSale.isBracketed) {
        return {
            isError: true,
            section: 'Sales Comparison',
            field: targetFieldName,
            message: `${displayLabel}: $${finalValue.toLocaleString()} is unbracketed by comparable Sale Price. ${evalSale.summary}.`
        };
    }

    const details = [];
    if (hasAdj) details.push(`Adjusted: ${evalAdj.summary}`);
    if (hasSale) details.push(`Sale Price: ${evalSale.summary}`);

    return {
        isMatch: true,
        section: 'Sales Comparison',
        field: targetFieldName,
        message: `${displayLabel}: $${finalValue.toLocaleString()} is bracketed by comparable sales (${details.join('; ')}).`
    };
};

export const checkCompSalePriceBracketing = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName, textVal } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    if (!allData || typeof allData !== 'object') return null;
    if (saleName && String(saleName).toLowerCase() === 'subject') return null;

    const finalValue = getOpinionOfMarketValue(allData);
    if (!finalValue || isNaN(finalValue) || finalValue <= 0) return null;

    const compObj = (typeof getComparableGridData === 'function')
        ? getComparableGridData(allData, saleName)
        : (allData[saleName] || allData.SALES_GRID?.[saleName] || {});

    const rawSale = (textVal !== null && textVal !== undefined && String(textVal).trim() !== '')
        ? textVal
        : (compObj['Sale Price'] ?? compObj['Sale Price $'] ?? '');

    if (rawSale === undefined || rawSale === null || String(rawSale).trim() === '') {
        return null;
    }

    const sNum = parseFloat(String(rawSale).replace(/[^0-9.]/g, ''));
    if (isNaN(sNum) || sNum <= 0) {
        return null;
    }

    const pct = ((sNum - finalValue) / finalValue) * 100;
    const sign = pct > 0 ? '+' : '';
    const compLabel = saleName || 'Comparable';

    return {
        isMatch: true,
        section: 'Sales Comparison',
        field: 'Sale Price',
        message: `${compLabel} Sale Price ($${sNum.toLocaleString()}, ${sign}${pct.toFixed(1)}%) vs Opinion of Market Value ($${finalValue.toLocaleString()}).`
    };
};

export const checkCompAdjustedSalePriceBracketing = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName, textVal } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    if (!allData || typeof allData !== 'object') return null;
    if (saleName && String(saleName).toLowerCase() === 'subject') return null;

    const finalValue = getOpinionOfMarketValue(allData);
    if (!finalValue || isNaN(finalValue) || finalValue <= 0) return null;

    const compObj = (typeof getComparableGridData === 'function')
        ? getComparableGridData(allData, saleName)
        : (allData[saleName] || allData.SALES_GRID?.[saleName] || {});

    const rawAdj = (textVal !== null && textVal !== undefined && String(textVal).trim() !== '')
        ? textVal
        : (compObj['Adjusted Sale Price of Comparable']
            ?? compObj['Adjusted Sale Price of Comparable $']
            ?? compObj['Adjusted Sale Price']
            ?? compObj['AdjustedSalePrice']
            ?? compObj['Indicated Value by Sales Comparison Approach $']
            ?? compObj['Indicated Value by Sales Comparison Approach']
            ?? '');

    if (rawAdj === undefined || rawAdj === null || String(rawAdj).trim() === '') {
        return null;
    }

    const aNum = parseFloat(String(rawAdj).replace(/[^0-9.]/g, ''));
    if (isNaN(aNum) || aNum <= 0) {
        return null;
    }

    const pct = ((aNum - finalValue) / finalValue) * 100;
    const sign = pct > 0 ? '+' : '';
    const compLabel = saleName || 'Comparable';

    return {
        isMatch: true,
        section: 'Sales Comparison',
        field: 'Adjusted Sale Price of Comparable',
        message: `${compLabel} Adjusted Sale Price ($${aNum.toLocaleString()}, ${sign}${pct.toFixed(1)}%) vs Opinion of Market Value ($${finalValue.toLocaleString()}).`
    };
};

export const getSubjectGLA = (allData, textVal) => {
    if (textVal !== null && textVal !== undefined && String(textVal).trim() !== '') {
        const val = parseAreaToSqFt(textVal);
        if (!isNaN(val) && val > 0) return val;
    }
    if (!allData || typeof allData !== 'object') return null;
    const subjGrid = (typeof getSubjectGridData === 'function') ? getSubjectGridData(allData) : (allData.Subject || {});
    const candidates = [
        subjGrid['Gross Living Area'],
        subjGrid['Gross Living Area (GLA)'],
        subjGrid['GLA'],
        allData.Subject?.['Gross Living Area'],
        allData.Subject?.['GLA'],
        allData.SUBJECT?.['Gross Living Area'],
        allData.SUBJECT?.['GLA'],
        allData.IMPROVEMENTS?.['Gross Living Area'],
        allData.Improvements?.['Gross Living Area'],
        allData.SKETCH?.['Gross Living Area'],
        allData.Sketch?.['Gross Living Area'],
        allData.clean_data?.['Sales Grid']?.Subject?.['Gross Living Area'],
        allData.clean_data?.SALES_GRID?.Subject?.['Gross Living Area']
    ];
    for (const c of candidates) {
        if (c !== undefined && c !== null && String(c).trim() !== '') {
            const val = parseAreaToSqFt(c);
            if (!isNaN(val) && val > 0) return val;
        }
    }
    return null;
};

export const getComparableGLAs = (allData) => {
    const glas = [];
    const compGlaDetails = [];
    if (!allData || typeof allData !== 'object') {
        return { glas, compGlaDetails };
    }

    const seenComps = new Set();
    const processCompObj = (compObj, compIdentifier) => {
        if (!compObj || typeof compObj !== 'object' || Array.isArray(compObj)) return;
        if (compIdentifier && seenComps.has(compIdentifier)) return;
        if (compIdentifier) seenComps.add(compIdentifier);

        const rawGla = compObj['Gross Living Area']
            ?? compObj['Gross Living Area (GLA)']
            ?? compObj['GLA']
            ?? compObj['GrossLivingArea']
            ?? compObj['GROSS LIVING AREA']
            ?? compObj['Total Gross Living Area'];
        if (rawGla !== undefined && rawGla !== null && String(rawGla).trim() !== '') {
            const gNum = parseAreaToSqFt(rawGla);
            if (!isNaN(gNum) && gNum > 0) {
                glas.push(gNum);
                compGlaDetails.push({ name: compIdentifier || 'Comparable', gla: gNum, raw: rawGla });
            }
        }
    };

    // 1. Check top-level keys in allData first
    Object.entries(allData).forEach(([key, val]) => {
        if (key.toLowerCase().trim() === 'subject') return;
        const match = key.match(/^(?:comparable(?:\s*sale)?|comp)[\s#]*(\d+)$/i);
        if (match && typeof val === 'object' && val !== null && !Array.isArray(val)) {
            const compId = `comp_${match[1]}`;
            processCompObj(val, compId);
        }
    });

    // 2. Check numbered comps 1 to 9 if not yet captured
    for (let i = 1; i <= 9; i++) {
        const compId = `comp_${i}`;
        if (!seenComps.has(compId)) {
            const compObj = allData[`COMPARABLE SALE #${i}`]
                || allData[`COMPARABLE SALE # ${i}`]
                || allData[`Comparable Sale #${i}`]
                || allData[`Comparable Sale ${i}`]
                || allData[`Comp ${i}`]
                || allData[`COMPARABLE #${i}`];
            if (compObj && typeof compObj === 'object') {
                processCompObj(compObj, compId);
            }
        }
    }

    // 3. Check SALES_GRID / Sales Grid / SALES_COMPARISON containers
    const gridContainers = [
        allData.SALES_GRID,
        allData['Sales Grid'],
        allData.SALES_COMPARISON,
        allData.clean_data?.['Sales Grid'],
        allData.clean_data?.SALES_GRID
    ];

    gridContainers.forEach(container => {
        if (container && typeof container === 'object') {
            Object.entries(container).forEach(([key, val]) => {
                if (key.toLowerCase().trim() === 'subject') return;
                const match = key.match(/(?:comparable(?:\s*sale)?|comp)[\s#]*(\d+)/i);
                const compId = match ? `comp_${match[1]}` : key;
                processCompObj(val, compId);
            });
        }
    });

    // 4. Check comparableSales array if present
    if (Array.isArray(allData.comparableSales)) {
        allData.comparableSales.forEach(saleName => {
            if (typeof saleName === 'string') {
                const compObj = (typeof getComparableGridData === 'function')
                    ? getComparableGridData(allData, saleName)
                    : (allData[saleName] || allData.SALES_GRID?.[saleName] || {});
                const match = saleName.match(/\d+/);
                const compId = match ? `comp_${match[0]}` : saleName;
                processCompObj(compObj, compId);
            }
        });
    }

    return { glas, compGlaDetails };
};

export const checkSubjectGLABracketing = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let textVal = null;

    if (arg3 && typeof arg3 === 'object' && !Array.isArray(arg3)) {
        allData = arg3;
        textVal = arg2;
    } else if (arg2 && typeof arg2 === 'object' && !Array.isArray(arg2)) {
        allData = arg2;
        textVal = null;
    } else if (typeof field === 'object' && field !== null && !Array.isArray(field)) {
        allData = field;
    }

    if (!allData || typeof allData !== 'object') return null;

    const subjectGla = getSubjectGLA(allData, textVal);
    if (!subjectGla || isNaN(subjectGla) || subjectGla <= 0) {
        return null;
    }

    const { glas } = getComparableGLAs(allData);
    if (!Array.isArray(glas) || glas.length === 0) {
        return null;
    }

    const min = Math.min(...glas);
    const max = Math.max(...glas);

    const minPct = (((min - subjectGla) / subjectGla) * 100).toFixed(1);
    const maxPct = (((max - subjectGla) / subjectGla) * 100).toFixed(1);
    const minSign = Number(minPct) > 0 ? '+' : '';
    const maxSign = Number(maxPct) > 0 ? '+' : '';
    const rangeSummary = `Range: ${min.toLocaleString()} sq ft (${minSign}${minPct}%) to ${max.toLocaleString()} sq ft (${maxSign}${maxPct}%)`;

    const isBracketed = (min <= subjectGla && max >= subjectGla);

    if (isBracketed) {
        return {
            isBracketed: true,
            isMatch: true,
            section: 'Sales Comparison',
            field: 'Gross Living Area',
            message: `Subject Gross Living Area (${subjectGla.toLocaleString()} sq ft) is bracketed by comparables (${rangeSummary}).`
        };
    }

    if (min > subjectGla) {
        return {
            isBracketed: false,
            isError: true,
            section: 'Sales Comparison',
            field: 'Gross Living Area',
            message: `Subject Gross Living Area (${subjectGla.toLocaleString()} sq ft) is unbracketed (all comparables are larger). Lowest is ${min.toLocaleString()} sq ft (${minSign}${minPct}%). ${rangeSummary}.`
        };
    }

    return {
        isBracketed: false,
        isError: true,
        section: 'Sales Comparison',
        field: 'Gross Living Area',
        message: `Subject Gross Living Area (${subjectGla.toLocaleString()} sq ft) is unbracketed (all comparables are smaller). Highest is ${max.toLocaleString()} sq ft (${maxSign}${maxPct}%). ${rangeSummary}.`
    };
};

export const checkCompGLABracketing = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName, textVal } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    if (!allData || typeof allData !== 'object') return null;
    if (saleName && String(saleName).toLowerCase() === 'subject') return null;

    const subjectGla = getSubjectGLA(allData);
    if (!subjectGla || isNaN(subjectGla) || subjectGla <= 0) return null;

    const compObj = (typeof getComparableGridData === 'function')
        ? getComparableGridData(allData, saleName)
        : (allData[saleName] || allData.SALES_GRID?.[saleName] || {});

    const rawGla = (textVal !== null && textVal !== undefined && String(textVal).trim() !== '')
        ? textVal
        : (compObj['Gross Living Area']
            ?? compObj['Gross Living Area (GLA)']
            ?? compObj['GLA']
            ?? compObj['GrossLivingArea']
            ?? compObj['GROSS LIVING AREA']
            ?? '');

    if (rawGla === undefined || rawGla === null || String(rawGla).trim() === '') {
        return null;
    }

    const gNum = parseAreaToSqFt(rawGla);
    if (isNaN(gNum) || gNum <= 0) {
        return null;
    }

    const pct = ((gNum - subjectGla) / subjectGla) * 100;
    const sign = pct > 0 ? '+' : '';
    const numMatch = String(saleName || '').match(/\d+/);
    const compLabel = numMatch ? `Comp #${numMatch[0]}` : (saleName || 'Comparable');

    return {
        isMatch: true,
        section: 'Sales Comparison',
        field: 'Gross Living Area',
        message: `${compLabel} Gross Living Area (${gNum.toLocaleString()} sq ft, ${sign}${pct.toFixed(1)}%) vs Subject Gross Living Area (${subjectGla.toLocaleString()} sq ft).`
    };
};

export const checkGrossLivingAreaBracketing = (field, arg2, arg3, arg4, arg5) => {
    const { saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isSubject = !saleName || String(saleName).toLowerCase() === 'subject' || (Array.isArray(arg4) && arg4.some(p => String(p).toLowerCase() === 'subject'));
    if (isSubject) {
        return checkSubjectGLABracketing(field, arg2, arg3, arg4, arg5);
    }
    return checkCompGLABracketing(field, arg2, arg3, arg4, arg5);
};

export const getSubjectSite = (allData, textVal) => {
    if (textVal !== null && textVal !== undefined && String(textVal).trim() !== '') {
        const val = parseAreaToSqFt(textVal);
        if (!isNaN(val) && val > 0) return val;
    }
    if (!allData || typeof allData !== 'object') return null;
    const subjGrid = (typeof getSubjectGridData === 'function') ? getSubjectGridData(allData) : (allData.Subject || {});
    const candidates = [
        subjGrid['Site'],
        subjGrid['Site Size'],
        subjGrid['Total Site Size'],
        allData.Subject?.['Site'],
        allData.Subject?.['Site Size'],
        allData.SUBJECT?.['Site'],
        allData.SUBJECT?.['Site Size'],
        allData.SITE?.['Total Site Size'],
        allData.SITE?.['Parcel Size'],
        allData.SITE?.['Area'],
        allData.Site?.['Total Site Size'],
        allData.clean_data?.['Sales Grid']?.Subject?.['Site'],
        allData.clean_data?.SALES_GRID?.Subject?.['Site']
    ];
    for (const c of candidates) {
        if (c !== undefined && c !== null && String(c).trim() !== '') {
            const val = parseAreaToSqFt(c);
            if (!isNaN(val) && val > 0) return val;
        }
    }
    return null;
};

export const getComparableSites = (allData) => {
    const sites = [];
    const compSiteDetails = [];
    if (!allData || typeof allData !== 'object') {
        return { sites, compSiteDetails };
    }

    const seenComps = new Set();
    const processCompObj = (compObj, compIdentifier) => {
        if (!compObj || typeof compObj !== 'object' || Array.isArray(compObj)) return;
        if (compIdentifier && seenComps.has(compIdentifier)) return;
        if (compIdentifier) seenComps.add(compIdentifier);

        const rawSite = compObj['Site']
            ?? compObj['Site Size']
            ?? compObj['Total Site Size']
            ?? compObj['SITE'];
        if (rawSite !== undefined && rawSite !== null && String(rawSite).trim() !== '') {
            const sNum = parseAreaToSqFt(rawSite);
            if (!isNaN(sNum) && sNum > 0) {
                sites.push(sNum);
                compSiteDetails.push({ name: compIdentifier || 'Comparable', site: sNum, raw: rawSite });
            }
        }
    };

    // 1. Check top-level keys in allData first
    Object.entries(allData).forEach(([key, val]) => {
        if (key.toLowerCase().trim() === 'subject') return;
        const match = key.match(/^(?:comparable(?:\s*sale)?|comp)[\s#]*(\d+)$/i);
        if (match && typeof val === 'object' && val !== null && !Array.isArray(val)) {
            const compId = `comp_${match[1]}`;
            processCompObj(val, compId);
        }
    });

    // 2. Check numbered comps 1 to 9 if not yet captured
    for (let i = 1; i <= 9; i++) {
        const compId = `comp_${i}`;
        if (!seenComps.has(compId)) {
            const compObj = allData[`COMPARABLE SALE #${i}`]
                || allData[`COMPARABLE SALE # ${i}`]
                || allData[`Comparable Sale #${i}`]
                || allData[`Comparable Sale ${i}`]
                || allData[`Comp ${i}`]
                || allData[`COMPARABLE #${i}`];
            if (compObj && typeof compObj === 'object') {
                processCompObj(compObj, compId);
            }
        }
    }

    // 3. Check SALES_GRID / Sales Grid / SALES_COMPARISON containers
    const gridContainers = [
        allData.SALES_GRID,
        allData['Sales Grid'],
        allData.SALES_COMPARISON,
        allData.clean_data?.['Sales Grid'],
        allData.clean_data?.SALES_GRID
    ];

    gridContainers.forEach(container => {
        if (container && typeof container === 'object') {
            Object.entries(container).forEach(([key, val]) => {
                if (key.toLowerCase().trim() === 'subject') return;
                const match = key.match(/(?:comparable(?:\s*sale)?|comp)[\s#]*(\d+)/i);
                const compId = match ? `comp_${match[1]}` : key;
                processCompObj(val, compId);
            });
        }
    });

    // 4. Check comparableSales array if present
    if (Array.isArray(allData.comparableSales)) {
        allData.comparableSales.forEach(saleName => {
            if (typeof saleName === 'string') {
                const compObj = (typeof getComparableGridData === 'function')
                    ? getComparableGridData(allData, saleName)
                    : (allData[saleName] || allData.SALES_GRID?.[saleName] || {});
                const match = saleName.match(/\d+/);
                const compId = match ? `comp_${match[0]}` : saleName;
                processCompObj(compObj, compId);
            }
        });
    }

    return { sites, compSiteDetails };
};

export const checkSubjectSiteBracketing = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let textVal = null;

    if (arg3 && typeof arg3 === 'object' && !Array.isArray(arg3)) {
        allData = arg3;
        textVal = arg2;
    } else if (arg2 && typeof arg2 === 'object' && !Array.isArray(arg2)) {
        allData = arg2;
        textVal = null;
    } else if (typeof field === 'object' && field !== null && !Array.isArray(field)) {
        allData = field;
    }

    if (!allData || typeof allData !== 'object') return null;

    const subjectSite = getSubjectSite(allData, textVal);
    if (!subjectSite || isNaN(subjectSite) || subjectSite <= 0) {
        return null;
    }

    const { sites } = getComparableSites(allData);
    if (!Array.isArray(sites) || sites.length === 0) {
        return null;
    }

    const min = Math.min(...sites);
    const max = Math.max(...sites);

    const minPct = (((min - subjectSite) / subjectSite) * 100).toFixed(1);
    const maxPct = (((max - subjectSite) / subjectSite) * 100).toFixed(1);
    const minSign = Number(minPct) > 0 ? '+' : '';
    const maxSign = Number(maxPct) > 0 ? '+' : '';
    const rangeSummary = `Range: ${min.toLocaleString()} sq ft (${minSign}${minPct}%) to ${max.toLocaleString()} sq ft (${maxSign}${maxPct}%)`;

    const isBracketed = (min <= subjectSite && max >= subjectSite);

    if (isBracketed) {
        return {
            isBracketed: true,
            isMatch: true,
            section: 'Sales Comparison',
            field: 'Site',
            message: `Subject Site (${subjectSite.toLocaleString()} sq ft) is bracketed by comparables (${rangeSummary}).`
        };
    }

    if (min > subjectSite) {
        return {
            isBracketed: false,
            isError: true,
            section: 'Sales Comparison',
            field: 'Site',
            message: `Subject Site (${subjectSite.toLocaleString()} sq ft) is unbracketed (all comparables are larger). Lowest is ${min.toLocaleString()} sq ft (${minSign}${minPct}%). ${rangeSummary}.`
        };
    }

    return {
        isBracketed: false,
        isError: true,
        section: 'Sales Comparison',
        field: 'Site',
        message: `Subject Site (${subjectSite.toLocaleString()} sq ft) is unbracketed (all comparables are smaller). Highest is ${max.toLocaleString()} sq ft (${maxSign}${maxPct}%). ${rangeSummary}.`
    };
};

export const checkCompSiteBracketing = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName, textVal } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    if (!allData || typeof allData !== 'object') return null;
    if (saleName && String(saleName).toLowerCase() === 'subject') return null;

    const subjectSite = getSubjectSite(allData);
    if (!subjectSite || isNaN(subjectSite) || subjectSite <= 0) return null;

    const compObj = (typeof getComparableGridData === 'function')
        ? getComparableGridData(allData, saleName)
        : (allData[saleName] || allData.SALES_GRID?.[saleName] || {});

    const rawSite = (textVal !== null && textVal !== undefined && String(textVal).trim() !== '')
        ? textVal
        : (compObj['Site']
            ?? compObj['Site Size']
            ?? compObj['Total Site Size']
            ?? compObj['SITE']
            ?? '');

    if (rawSite === undefined || rawSite === null || String(rawSite).trim() === '') {
        return null;
    }

    const sNum = parseAreaToSqFt(rawSite);
    if (isNaN(sNum) || sNum <= 0) {
        return null;
    }

    const pct = ((sNum - subjectSite) / subjectSite) * 100;
    const sign = pct > 0 ? '+' : '';
    const numMatch = String(saleName || '').match(/\d+/);
    const compLabel = numMatch ? `Comp #${numMatch[0]}` : (saleName || 'Comparable');

    return {
        isMatch: true,
        section: 'Sales Comparison',
        field: 'Site',
        message: `${compLabel} Site (${sNum.toLocaleString()} sq ft, ${sign}${pct.toFixed(1)}%) vs Subject Site (${subjectSite.toLocaleString()} sq ft).`
    };
};

export const checkSiteBracketing = (field, arg2, arg3, arg4, arg5) => {
    const { saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isSubject = !saleName || String(saleName).toLowerCase() === 'subject' || (Array.isArray(arg4) && arg4.some(p => String(p).toLowerCase() === 'subject'));
    if (isSubject) {
        return checkSubjectSiteBracketing(field, arg2, arg3, arg4, arg5);
    }
    return checkCompSiteBracketing(field, arg2, arg3, arg4, arg5);
};

