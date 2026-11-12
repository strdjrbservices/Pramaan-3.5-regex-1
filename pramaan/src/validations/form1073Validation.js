export const PROJECT_INFO_FIELDS_TO_CHECK = [
    "Data source(s) for project information",
    "Project Description",
    "# of Stories",
    "FEMA Special Flood Hazard Area",
    "Density",
    "Size",
    "Topography",
    "Zoning Compliance",
    "# of Elevators",
    "Existing/Proposed/Under Const.",
    "Existing/Proposed/Under Construction",
    "Year Built",
    "Effective Age",
    "Exterior Walls",
    "Roof Surface",
    "Total # Parking",
    "Ratio (spaces/units)",
    "Type",
    "Guest Parking",
    "# of Units",
    "# of Units Completed",
    "# of Units For Sale",
    "# of Units for Sale",
    "# of Units Sold",
    "# of Units Rented",
    "# of Owner Occupied Units",
    "# of Phases",
    "# of Planned Phases",
    "# of Planned Units",
    "# of Planned Units for Sale",
    "# of Planned Units For Sale",
    "# of Planned Units Sold",
    "# of Planned Units Rented",
    "# of Planned Owner Occupied Units",
    "Project Primary Occupancy",
    "Is the developer/builder in control of the Homeowners' Association (HOA)?",
    "Management Group",
    "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project?",
    "Was the project created by the conversion of existing building(s) into a condominium?",
    "Was the project created by the conversion of existing building(s) into a condominium? If Yes,describe the original use and date of conversion",
    "Was the project created by the conversion of existing building(s) into a condominium? If Yes, describe the original use and date of conversion",
    "If Yes,describe the original use and date of conversion",
    "If Yes, describe the original use and date of conversion",
    "Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)?",
    "If No, describe",
    "Is there any commercial space in the project?",
    "If Yes, describe and indicate the overall percentage of the commercial space.",
    "Describe the condition of the project and quality of construction.",
    "Describe the common elements and recreational facilities.",
    "Are any common elements leased to or by the Homeowners' Association?",
    "If Yes, describe the rental terms and options.",
    "Is the project subject to a ground rent?",
    "If Yes, $ per year (describe terms and conditions)",
    "Are the parking facilities adequate for the project size and type?",
    "If No, describe and comment on the effect on value and marketability."
];

export const checkProjectInfoFieldsNotBlank = (field, text, allData) => {
    const cleanField = String(field || '').trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' ');
    const isMatch = PROJECT_INFO_FIELDS_TO_CHECK.some(
        f => f.trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' ') === cleanField
    );

    if (!isMatch) {
        return null;
    }

    if (!text || String(text).trim() === '') {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `'${field}' must not be blank.`
        };
    }

    if (isProjectConditionField(field)) {
        return checkProjectAndPropertyCondition(field, text, allData);
    }

    return {
        isMatch: true,
        message: "Validation successful!"
    };
};

export const isProjectConditionField = (field) => {
    const f = String(field || '').trim().toLowerCase();
    return f.includes('condition of the project');
};

export const isPropertyConditionField = (field) => {
    const f = String(field || '').trim().toLowerCase();
    return f.includes('condition of the property');
};

export const extractConditionRating = (text) => {
    if (!text || typeof text !== 'string') return null;
    const str = text.trim();
    if (!str) return null;

    // Explicit conclusion/rating pattern first
    const explicitMatch = str.match(/(?:concluded\s+as|concluded\s+to\s+be|condition\s+(?:is|was|rating)?|quality\s+(?:is|was)?|rating\s*[:\s-]*)\s*[:\s-]*C\s*[-]?\s*([1-9])\b/i);
    if (explicitMatch) {
        return {
            ratingCode: `C${explicitMatch[1]}`,
            ratingNum: parseInt(explicitMatch[1], 10)
        };
    }

    // Match any standalone C[1-9] or C-[1-9] with word boundaries
    const allMatches = [...str.matchAll(/\bC\s*[-]?\s*([1-9])\b/gi)];
    if (allMatches.length > 0) {
        const m = allMatches[allMatches.length - 1];
        return {
            ratingCode: `C${m[1]}`,
            ratingNum: parseInt(m[1], 10)
        };
    }

    // Condition [1-9]
    const condWordMatch = str.match(/\bCondition\s*[:\s-]*([1-9])\b/i);
    if (condWordMatch) {
        return {
            ratingCode: `C${condWordMatch[1]}`,
            ratingNum: parseInt(condWordMatch[1], 10)
        };
    }

    return null;
};

export const getProjectConditionValue = (allData) => {
    if (!allData || typeof allData !== 'object') return '';
    return (
        allData['Describe the condition of the project and quality of construction.'] ||
        allData['Describe the condition of the project and quality of construction'] ||
        allData.PROJECT_INFO?.['Describe the condition of the project and quality of construction.'] ||
        allData.PROJECT_INFO?.['Describe the condition of the project and quality of construction'] ||
        allData['Project Information']?.['Describe the condition of the project and quality of construction.'] ||
        allData['Project Information']?.['Describe the condition of the project and quality of construction'] ||
        ''
    );
};

export const getPropertyConditionValue = (allData) => {
    if (!allData || typeof allData !== 'object') return '';
    return (
        allData['Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)'] ||
        allData['Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.).'] ||
        allData['Describe the condition of the property'] ||
        allData.UNIT_DESCRIPTIONS?.['Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)'] ||
        allData.UNIT_DESCRIPTIONS?.['Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.).'] ||
        allData.UNIT_DESCRIPTIONS?.['Describe the condition of the property'] ||
        allData['Unit Descriptions']?.['Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)'] ||
        allData.IMPROVEMENTS?.['Describe the condition of the property'] ||
        allData.IMPROVEMENTS?.['Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)'] ||
        allData.Improvements?.['Describe the condition of the property'] ||
        ''
    );
};

export const checkProjectAndPropertyCondition = (field, text, allData) => {
    const isProject = isProjectConditionField(field);
    const isProperty = isPropertyConditionField(field);

    if (!isProject && !isProperty) {
        return null;
    }

    if (!text || String(text).trim() === '') {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `'${field}' must not be blank.`
        };
    }

    const curRating = extractConditionRating(text);
    if (!curRating) {
        return {
            isError: true,
            message: "Condition rating (C1-C5) not found in description."
        };
    }

    if (curRating.ratingNum > 5) {
        return {
            isError: true,
            message: `Condition must not be greater than C5. Found '${curRating.ratingCode}'.`
        };
    }

    // Cross-field comparison between project and property condition
    const otherText = isProject ? getPropertyConditionValue(allData) : getProjectConditionValue(allData);
    if (otherText && String(otherText).trim() !== '') {
        const otherRating = extractConditionRating(otherText);
        if (otherRating) {
            if (otherRating.ratingNum > 5) {
                return {
                    isError: true,
                    message: `Condition must not be greater than C5. Found '${otherRating.ratingCode}' in ${isProject ? "Property condition" : "Project condition"}.`
                };
            }
            if (curRating.ratingCode.toUpperCase() !== otherRating.ratingCode.toUpperCase()) {
                const currentLabel = isProject ? "Project condition" : "Property condition";
                const otherLabel = isProject ? "Property condition" : "Project condition";
                return {
                    isError: true,
                    message: `Condition mismatch: ${currentLabel} (${curRating.ratingCode}) and ${otherLabel} (${otherRating.ratingCode}) must contain the same condition (C1 to C5).`
                };
            }
            return {
                isMatch: true,
                message: `Condition '${curRating.ratingCode}' validated successfully.`
            };
        }
    }

    return {
        isMatch: true,
        message: `Condition '${curRating.ratingCode}' is valid (C1-C5).`
    };
};

export const isGrayCondoProjectCell = (field) => {
    const fieldStr = String(field || '');
    const grayRowKeywords = [
        "Total # of Comparable Active Listings",
        "Total # of Active Comparable Listings",
        "Months of Unit Supply"
    ];
    const isGrayRow = grayRowKeywords.some(kw => fieldStr.includes(kw));
    const isPriorPeriod = fieldStr.includes("Prior 7-12") || fieldStr.includes("Prior 7–12") || fieldStr.includes("Prior 4-6") || fieldStr.includes("Prior 4–6");
    return isGrayRow && isPriorPeriod;
};

export const checkCondoCoopProjectsTableFields = (field, text, allData) => {
    if (isGrayCondoProjectCell(field)) {
        return null;
    }

    const val = String(text || '').trim();
    if (val) {
        return { isMatch: true };
    }

    if (allData) {
        const formType = String(allData.formType || allData['Form Type'] || allData.form_type || '').toLowerCase();
        const isCondoForm = formType.includes('1073') || formType.includes('condo');
        const projectData = allData.CONDO_COOP_PROJECTS || {};
        const hasProjectData = Object.values(projectData).some(v => typeof v === 'string' && v.trim().length > 0);
        if (!isCondoForm && !hasProjectData) {
            return null;
        }
    }

    return null;
};

export const checkCondoForeclosureFieldsNotBlank = (field, text, allData) => {
    const val = String(text || '').trim();
    if (val) {
        return { isMatch: true };
    }
    if (allData) {
        const formType = String(allData.formType || allData['Form Type'] || allData.form_type || '').toLowerCase();
        const isCondoForm = formType.includes('1073') || formType.includes('condo');
        if (!isCondoForm) {
            return null;
        }
    }
    return null;
};
