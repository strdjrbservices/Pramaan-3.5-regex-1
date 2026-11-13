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
    "# of Units (Project Completed)",
    "# of Units (If Project Completed)",
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
    "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project? If Yes, describe",
    "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project? If Yes, Describe",
    "If Yes, Describe",
    "If Yes, describe",
    "If Yes, describe (10% ownership)",
    "Was the project created by the conversion of existing building(s) into a condominium?",
    "Was the project created by the conversion of existing building(s) into a condominium? If Yes,describe the original use and date of conversion",
    "Was the project created by the conversion of existing building(s) into a condominium? If Yes, describe the original use and date of conversion",
    "If Yes,describe the original use and date of conversion",
    "If Yes, describe the original use and date of conversion",
    "Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)?",
    "Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)? If No, describe",
    "If No, describe",
    "Is there any commercial space in the project?",
    "Is there any commercial space in the project? If Yes, describe and indicate the overall percentage of the commercial space.",
    "If Yes, describe and indicate the overall percentage of the commercial space.",
    "Describe the condition of the project and quality of construction.",
    "Describe the common elements and recreational facilities.",
    "Are any common elements leased to or by the Homeowners' Association?",
    "Are any common elements leased to or by the Homeowners' Association? If Yes, describe the rental terms and options.",
    "If Yes, describe the rental terms and options.",
    "Is the project subject to a ground rent?",
    "Is the project subject to a ground rent? If Yes, $ per year (describe terms and conditions)",
    "If Yes, $ per year (describe terms and conditions)",
    "Are the parking facilities adequate for the project size and type?",
    "Are the parking facilities adequate for the project size and type? If No, describe and comment on the effect on value and marketability.",
    "If No, describe and comment on the effect on value and marketability."
];

export const isAnswerAffirmative = (val) => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'boolean') return val;
    const s = String(val).trim().toLowerCase();
    return s === 'yes' || s === 'y' || s === 'true' || s === '1' || s.startsWith('yes');
};

export const isAnswerNegative = (val) => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'boolean') return !val;
    const s = String(val).trim().toLowerCase();
    return s === 'no' || s === 'n' || s === 'false' || s === '0' || s.startsWith('no');
};

export const CONDO_CONDITIONAL_QUESTION_CONFIGS = [
    {
        id: '10_percent_ownership',
        triggerType: 'yes',
        triggerLabel: 'Yes',
        nonTriggerLabel: 'No',
        questionLabel: 'Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project?',
        questionKeys: [
            "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project?",
            "Does any single entity own more than 10% of the total units in the project?",
            "10% ownership",
            "Single entity own more than 10%"
        ],
        commentLabel: 'If Yes, Describe',
        commentKeys: [
            "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project? If Yes, describe",
            "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project? If Yes, Describe",
            "If Yes, Describe",
            "If Yes, describe",
            "If Yes, describe (10% ownership)"
        ]
    },
    {
        id: 'condo_conversion',
        triggerType: 'yes',
        triggerLabel: 'Yes',
        nonTriggerLabel: 'No',
        questionLabel: 'Was the project created by the conversion of existing building(s) into a condominium?',
        questionKeys: [
            "Was the project created by the conversion of existing building(s) into a condominium?",
            "Conversion of existing building(s) into a condominium",
            "Condominium conversion"
        ],
        commentLabel: 'If Yes, describe the original use and date of conversion',
        commentKeys: [
            "Was the project created by the conversion of existing building(s) into a condominium? If Yes,describe the original use and date of conversion",
            "Was the project created by the conversion of existing building(s) into a condominium? If Yes, describe the original use and date of conversion",
            "If Yes,describe the original use and date of conversion",
            "If Yes, describe the original use and date of conversion"
        ]
    },
    {
        id: 'facilities_complete',
        triggerType: 'no',
        triggerLabel: 'No',
        nonTriggerLabel: 'Yes',
        questionLabel: 'Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)?',
        questionKeys: [
            "Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)?",
            "Are the units, common elements, and recreation facilities complete?",
            "Units, common elements, and recreation facilities complete"
        ],
        commentLabel: 'If No, describe',
        commentKeys: [
            "If No, describe",
            "Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)? If No, describe",
            "Are the units, common elements, and recreation facilities complete? If No, describe"
        ]
    },
    {
        id: 'commercial_space',
        triggerType: 'yes',
        triggerLabel: 'Yes',
        nonTriggerLabel: 'No',
        questionLabel: 'Is there any commercial space in the project?',
        questionKeys: [
            "Is there any commercial space in the project?",
            "Commercial space in project",
            "Commercial space"
        ],
        commentLabel: 'If Yes, describe and indicate the overall percentage of the commercial space.',
        commentKeys: [
            "If Yes, describe and indicate the overall percentage of the commercial space.",
            "Is there any commercial space in the project? If Yes, describe and indicate the overall percentage of the commercial space.",
            "If Yes, describe and indicate overall percentage of commercial space"
        ]
    },
    {
        id: 'common_elements_leased',
        triggerType: 'yes',
        triggerLabel: 'Yes',
        nonTriggerLabel: 'No',
        questionLabel: "Are any common elements leased to or by the Homeowners' Association?",
        questionKeys: [
            "Are any common elements leased to or by the Homeowners' Association?",
            "Are any common elements leased to or by the Homeowners Association?",
            "Common elements leased to or by HOA"
        ],
        commentLabel: 'If Yes, describe the rental terms and options.',
        commentKeys: [
            "If Yes, describe the rental terms and options.",
            "Are any common elements leased to or by the Homeowners' Association? If Yes, describe the rental terms and options.",
            "Are any common elements leased to or by the Homeowners Association? If Yes, describe the rental terms and options."
        ]
    },
    {
        id: 'ground_rent',
        triggerType: 'yes',
        triggerLabel: 'Yes',
        nonTriggerLabel: 'No',
        questionLabel: 'Is the project subject to a ground rent?',
        questionKeys: [
            "Is the project subject to a ground rent?",
            "Subject to a ground rent",
            "Ground rent"
        ],
        commentLabel: 'If Yes, $ per year (describe terms and conditions)',
        commentKeys: [
            "If Yes, $ per year (describe terms and conditions)",
            "Is the project subject to a ground rent? If Yes, $ per year (describe terms and conditions)",
            "If Yes, $ per year"
        ]
    },
    {
        id: 'parking_adequate',
        triggerType: 'no',
        triggerLabel: 'No',
        nonTriggerLabel: 'Yes',
        questionLabel: 'Are the parking facilities adequate for the project size and type?',
        questionKeys: [
            "Are the parking facilities adequate for the project size and type?",
            "Parking facilities adequate",
            "Adequate parking"
        ],
        commentLabel: 'If No, describe and comment on the effect on value and marketability.',
        commentKeys: [
            "If No, describe and comment on the effect on value and marketability.",
            "Are the parking facilities adequate for the project size and type? If No, describe and comment on the effect on value and marketability."
        ]
    }
];

export const findCondoConditionalConfig = (field) => {
    if (!field) return null;
    const clean = String(field).trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' ');

    for (const cfg of CONDO_CONDITIONAL_QUESTION_CONFIGS) {
        const matchesComment = cfg.commentKeys.some(k => clean === k.trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' '));
        if (matchesComment) {
            return { config: cfg, isComment: true, isQuestion: false };
        }
        const matchesQuestion = cfg.questionKeys.some(k => clean === k.trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' '));
        if (matchesQuestion) {
            return { config: cfg, isComment: false, isQuestion: true };
        }
    }

    // Flexible patterns fallback
    for (const cfg of CONDO_CONDITIONAL_QUESTION_CONFIGS) {
        if (cfg.id === '10_percent_ownership') {
            if (clean.includes('10%') && (clean.includes('describe') || clean.includes('if yes'))) {
                return { config: cfg, isComment: true, isQuestion: false };
            }
            if (clean.includes('10%') && clean.includes('single entity')) {
                return { config: cfg, isComment: false, isQuestion: true };
            }
        } else if (cfg.id === 'condo_conversion') {
            if (clean.includes('conversion') && (clean.includes('original use') || clean.includes('date of conversion') || clean.includes('if yes'))) {
                return { config: cfg, isComment: true, isQuestion: false };
            }
            if (clean.includes('conversion') && clean.includes('condominium')) {
                return { config: cfg, isComment: false, isQuestion: true };
            }
        } else if (cfg.id === 'facilities_complete') {
            if (clean === 'if no, describe' || (clean.includes('if no') && clean.includes('describe') && (clean.includes('facilities') || clean.includes('recreation') || clean.includes('elements')))) {
                return { config: cfg, isComment: true, isQuestion: false };
            }
            if ((clean.includes('facilities') || clean.includes('recreation') || clean.includes('elements')) && clean.includes('complete')) {
                return { config: cfg, isComment: false, isQuestion: true };
            }
        } else if (cfg.id === 'commercial_space') {
            if (clean.includes('commercial space') && (clean.includes('percentage') || clean.includes('if yes'))) {
                return { config: cfg, isComment: true, isQuestion: false };
            }
            if (clean.includes('commercial space')) {
                return { config: cfg, isComment: false, isQuestion: true };
            }
        } else if (cfg.id === 'common_elements_leased') {
            if (clean.includes('rental terms') || (clean.includes('leased') && clean.includes('options'))) {
                return { config: cfg, isComment: true, isQuestion: false };
            }
            if (clean.includes('leased') && (clean.includes('homeowners') || clean.includes('hoa'))) {
                return { config: cfg, isComment: false, isQuestion: true };
            }
        } else if (cfg.id === 'ground_rent') {
            if (clean.includes('per year') || (clean.includes('ground rent') && clean.includes('terms'))) {
                return { config: cfg, isComment: true, isQuestion: false };
            }
            if (clean.includes('ground rent')) {
                return { config: cfg, isComment: false, isQuestion: true };
            }
        } else if (cfg.id === 'parking_adequate') {
            if (clean.includes('effect on value and marketability') || (clean.includes('parking') && clean.includes('marketability'))) {
                return { config: cfg, isComment: true, isQuestion: false };
            }
            if (clean.includes('parking') && clean.includes('adequate')) {
                return { config: cfg, isComment: false, isQuestion: true };
            }
        }
    }

    return null;
};

export const checkCondoConditionalQuestionPair = (field, text, allData, matchInfo) => {
    const { config, isComment, isQuestion } = matchInfo;
    const currentVal = text !== undefined && text !== null ? String(text).trim() : '';

    if (isComment) {
        const questionVal = getProjectInfoValue(allData, config.questionKeys);

        // Standalone fallback when question context is absent in allData
        if (!questionVal) {
            if (!currentVal) {
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
        }

        const isTrigger = config.triggerType === 'yes' ? isAnswerAffirmative(questionVal) : isAnswerNegative(questionVal);
        const isNonTrigger = config.triggerType === 'yes' ? isAnswerNegative(questionVal) : isAnswerAffirmative(questionVal);

        if (isTrigger) {
            if (!currentVal) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `'${field}' is required when '${config.questionLabel}' is answered '${config.triggerLabel}'.`
                };
            }
            return {
                isMatch: true,
                message: "Validation successful!"
            };
        }

        if (isNonTrigger) {
            if (!currentVal) {
                return null;
            }
            return {
                isMatch: true,
                message: "Validation successful!"
            };
        }

        if (!currentVal) {
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
    }

    if (isQuestion) {
        if (!currentVal) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `'${field}' must not be blank.`
            };
        }

        const isTrigger = config.triggerType === 'yes' ? isAnswerAffirmative(currentVal) : isAnswerNegative(currentVal);
        if (isTrigger) {
            const commentVal = getProjectInfoValue(allData, config.commentKeys);
            if (!commentVal) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `'${config.commentLabel}' is required when '${field}' is answered '${config.triggerLabel}'.`
                };
            }
        }

        return {
            isMatch: true,
            message: "Validation successful!"
        };
    }

    return null;
};

export const parseUnitCount = (val) => {
    if (val === null || val === undefined) return null;
    const cleaned = String(val).replace(/,/g, '').trim();
    if (!cleaned) return null;
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
};

export const getProjectInfoValue = (allData, fieldKeys) => {
    if (!allData || typeof allData !== 'object') return '';
    const keys = Array.isArray(fieldKeys) ? fieldKeys : [fieldKeys];

    const sources = [
        allData,
        allData.PROJECT_INFO,
        allData['Project Information'],
        allData.clean_data?.['Project Information'],
        allData.clean_data?.PROJECT_INFO,
        allData.fields?.['Project Information'],
        allData.fields?.PROJECT_INFO,
        allData.IF_PROJECT_COMPLETED,
        allData['If Project Completed'],
        allData['Project Completed'],
        allData.PROJECT_COMPLETED,
        allData.Subject,
        allData.SUBJECT
    ];

    for (const src of sources) {
        if (src && typeof src === 'object') {
            for (const k of keys) {
                if (src[k] !== undefined && src[k] !== null && String(src[k]).trim() !== '') {
                    return String(src[k]).trim();
                }
            }
            const srcKeys = Object.keys(src);
            for (const k of keys) {
                const normK = k.toLowerCase().replace(/[\s\r\n\t]+/g, ' ').trim();
                const matchedKey = srcKeys.find(sk => sk.toLowerCase().replace(/[\s\r\n\t]+/g, ' ').trim() === normK);
                if (matchedKey && src[matchedKey] !== undefined && src[matchedKey] !== null && String(src[matchedKey]).trim() !== '') {
                    return String(src[matchedKey]).trim();
                }
            }
        }
    }
    return '';
};

export const checkProjectUnitsConsistency = (field, text, allData) => {
    const currentVal = text !== undefined && text !== null ? String(text).trim() : '';

    const isUnitsField = /^(?:#\s*of\s*units)$/i.test(String(field || '').trim());
    const unitsRaw = isUnitsField && currentVal !== ''
        ? currentVal
        : getProjectInfoValue(allData, ['# of Units', 'Units', 'Total Units']);

    const isCompletedField = /^(?:#\s*of\s*units\s*completed)$/i.test(String(field || '').trim());
    const unitsCompletedRaw = isCompletedField && currentVal !== ''
        ? currentVal
        : getProjectInfoValue(allData, ['# of Units Completed', 'Units Completed', 'Completed Units']);

    const isProjectCompletedField = /(?:project\s*completed|completed\s*project)/i.test(String(field || '').trim()) && /units/i.test(String(field || '').trim());
    const projectUnitsRaw = isProjectCompletedField && currentVal !== ''
        ? currentVal
        : getProjectInfoValue(allData, [
            '# of Units (Project Completed)',
            '# of Units (If Project Completed)',
            '# of Units (Completed Project)',
            '# of Project Units',
            'Project # of Units'
        ]);

    const units = parseUnitCount(unitsRaw);
    const unitsCompleted = parseUnitCount(unitsCompletedRaw);
    const projectUnits = parseUnitCount(projectUnitsRaw);

    if (units === null && unitsCompleted === null && projectUnits === null) {
        return { isMatch: true, message: "Validation successful!" };
    }

    const errors = [];

    // Validation rule 1: # of Units must match # of Units Completed
    if (units !== null && unitsCompleted !== null && units !== unitsCompleted) {
        errors.push(`'# of Units' (${units}) does not match '# of Units Completed' (${unitsCompleted})`);
    }

    // Validation rule 2: # of Units must match # of Units in If Project Completed
    if (units !== null && projectUnits !== null && units !== projectUnits) {
        errors.push(`'# of Units' (${units}) does not match '# of Units' in If Project Completed (${projectUnits})`);
    }

    // Validation rule 3: # of Units Completed vs If Project Completed (if units was omitted)
    if (units === null && unitsCompleted !== null && projectUnits !== null && unitsCompleted !== projectUnits) {
        errors.push(`'# of Units Completed' (${unitsCompleted}) does not match '# of Units' in If Project Completed (${projectUnits})`);
    }

    if (errors.length > 0) {
        return {
            isError: true,
            message: errors.join('; ') + '.'
        };
    }

    if (units !== null && unitsCompleted !== null) {
        return {
            isMatch: true,
            message: `'# of Units' (${units}) matches '# of Units Completed'${projectUnits !== null ? ` and If Project Completed (${projectUnits})` : ''}.`
        };
    }

    return {
        isMatch: true,
        message: "Validation successful!"
    };
};

export const checkProjectUnitsBreakdownSum = (field, text, allData) => {
    const currentField = String(field || '').trim();
    const currentVal = text !== undefined && text !== null ? String(text).trim() : '';

    const isCompletedContext = /(?:project\s*completed|completed\s*project)/i.test(currentField) || currentField === '# of Units for Sale';

    const getVal = (exactKey, fallbackKeys) => {
        if (currentField.toLowerCase() === exactKey.toLowerCase() && currentVal !== '') {
            return currentVal;
        }
        return getProjectInfoValue(allData, [exactKey, ...fallbackKeys]);
    };

    let forSaleRaw, rentedRaw, ownerRaw, unitsRaw;

    if (isCompletedContext) {
        forSaleRaw = getVal('# of Units for Sale', ['# of Units For Sale', 'Units For Sale', 'Units for Sale']);
        rentedRaw = getVal('# of Units Rented (Project Completed)', ['# of Units Rented', 'Units Rented']);
        ownerRaw = getVal('# of Owner Occupied Units (Project Completed)', ['# of Owner Occupied Units', 'Owner Occupied Units']);
        unitsRaw = getVal('# of Units (Project Completed)', ['# of Units', 'Units']);
    } else {
        forSaleRaw = getVal('# of Units For Sale', ['# of Units for Sale', 'Units For Sale', 'Units for Sale']);
        rentedRaw = getVal('# of Units Rented', ['Units Rented']);
        ownerRaw = getVal('# of Owner Occupied Units', ['Owner Occupied Units']);
        unitsRaw = getVal('# of Units', ['Units', 'Total Units']);
    }

    const forSale = parseUnitCount(forSaleRaw);
    const rented = parseUnitCount(rentedRaw);
    const owner = parseUnitCount(ownerRaw);
    const units = parseUnitCount(unitsRaw);

    if (forSale === null && rented === null && owner === null) {
        return { isMatch: true, message: "Validation successful!" };
    }

    if (units === null) {
        return {
            isError: true,
            message: `Cannot verify units breakdown: '# of Units' is blank or not a valid number.`
        };
    }

    const nForSale = forSale ?? 0;
    const nRented = rented ?? 0;
    const nOwner = owner ?? 0;
    const sum = nForSale + nRented + nOwner;

    if (sum !== units) {
        return {
            isError: true,
            message: `Units sum mismatch: '# of Units For Sale' (${nForSale}) + '# of Units Rented' (${nRented}) + '# of Owner Occupied Units' (${nOwner}) = ${sum}, which must equal '# of Units' (${units}).`
        };
    }

    return {
        isMatch: true,
        message: `Validation successful: '# of Units For Sale' (${nForSale}) + '# of Units Rented' (${nRented}) + '# of Owner Occupied Units' (${nOwner}) = ${units} ('# of Units').`
    };
};

export const checkProjectInfoFieldsNotBlank = (field, text, allData) => {
    const cleanField = String(field || '').trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' ');

    const condoMatch = findCondoConditionalConfig(field);
    if (condoMatch) {
        return checkCondoConditionalQuestionPair(field, text, allData, condoMatch);
    }

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

    if (cleanField === '# of units') {
        const consistencyRes = checkProjectUnitsConsistency(field, text, allData);
        if (consistencyRes && consistencyRes.isError) return consistencyRes;
        const sumRes = checkProjectUnitsBreakdownSum(field, text, allData);
        if (sumRes && sumRes.isError) return sumRes;
        if (consistencyRes && consistencyRes.isMatch && consistencyRes.message !== 'Validation successful!') return consistencyRes;
        if (sumRes && sumRes.isMatch && sumRes.message !== 'Validation successful!') return sumRes;
    }

    if (cleanField === '# of units completed' || cleanField === '# of units (project completed)' || cleanField === '# of units (if project completed)') {
        const consistencyRes = checkProjectUnitsConsistency(field, text, allData);
        if (consistencyRes && consistencyRes.isError) return consistencyRes;
        if (consistencyRes && consistencyRes.isMatch && consistencyRes.message !== 'Validation successful!') return consistencyRes;
    }

    if (cleanField === '# of units for sale' || cleanField === '# of units rented' || cleanField === '# of owner occupied units') {
        const sumRes = checkProjectUnitsBreakdownSum(field, text, allData);
        if (sumRes && sumRes.isError) return sumRes;
        if (sumRes && sumRes.isMatch && sumRes.message !== 'Validation successful!') return sumRes;
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
