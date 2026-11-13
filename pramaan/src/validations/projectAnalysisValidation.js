export const PROJECT_ANALYSIS_FIELDS_TO_CHECK = [
    "I did did not analyze the condominium project budget for the current year. Explain the results of the analysis of the budget (adequacy of fees, reserves, etc.), or why the analysis was not performed.",
    "I did / did not analyze the condominium project budget for the current year. Explain the results of the analysis of the budget (adequacy of fees, reserves, etc.), or why the analysis was not performed.",
    "I did/did not analyze the condominium project budget for the current year. Explain the results of the analysis of the budget (adequacy of fees, reserves, etc.), or why the analysis was not performed.",
    "Are there any other fees (other than regular HOA charges) for the use of the project facilities?",
    "If Yes, report the charges and describe.",
    "Are there any other fees (other than regular HOA charges) for the use of the project facilities? If Yes, report the charges and describe.",
    "Compared to other competitive projects of similar quality and design, the subject unit charge appears",
    "If High or Low, describe",
    "Compared to other competitive projects of similar quality and design, the subject unit charge appears If High or Low, describe",
    "Are there any special or unusual characteristics of the project (based on the condominium documents, HOA meetings, or other information) known to the appraiser?",
    "If Yes, describe and explain the effect on value and marketability.",
    "Are there any special or unusual characteristics of the project (based on the condominium documents, HOA meetings, or other information) known to the appraiser? If Yes, describe and explain the effect on value and marketability."
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

export const isUnitChargeHighOrLow = (val) => {
    if (val === null || val === undefined) return false;
    const s = String(val).trim().toLowerCase();
    return s.includes('high') || s.includes('low');
};

export const isUnitChargeAverage = (val) => {
    if (val === null || val === undefined) return false;
    const s = String(val).trim().toLowerCase();
    return s.includes('avg') || s.includes('average');
};

export const PROJECT_ANALYSIS_CONDITIONAL_CONFIGS = [
    {
        id: 'other_fees',
        type: 'yes_no',
        triggerLabel: 'Yes',
        nonTriggerLabel: 'No',
        questionLabel: 'Are there any other fees (other than regular HOA charges) for the use of the project facilities?',
        questionKeys: [
            "Are there any other fees (other than regular HOA charges) for the use of the project facilities?",
            "Are there any other fees for the use of the project facilities?",
            "Other fees (other than regular HOA charges)",
            "Other fees"
        ],
        commentLabel: 'If Yes, report the charges and describe.',
        commentKeys: [
            "If Yes, report the charges and describe.",
            "Are there any other fees (other than regular HOA charges) for the use of the project facilities? If Yes, report the charges and describe.",
            "Report the charges and describe"
        ]
    },
    {
        id: 'unit_charge_comparison',
        type: 'high_low_average',
        triggerLabel: 'High or Low',
        nonTriggerLabel: 'Average',
        questionLabel: 'Compared to other competitive projects of similar quality and design, the subject unit charge appears',
        questionKeys: [
            "Compared to other competitive projects of similar quality and design, the subject unit charge appears",
            "Subject unit charge appears",
            "Unit charge appears"
        ],
        commentLabel: 'If High or Low, describe',
        commentKeys: [
            "If High or Low, describe",
            "Compared to other competitive projects of similar quality and design, the subject unit charge appears If High or Low, describe"
        ]
    },
    {
        id: 'special_characteristics',
        type: 'yes_no',
        triggerLabel: 'Yes',
        nonTriggerLabel: 'No',
        questionLabel: 'Are there any special or unusual characteristics of the project (based on the condominium documents, HOA meetings, or other information) known to the appraiser?',
        questionKeys: [
            "Are there any special or unusual characteristics of the project (based on the condominium documents, HOA meetings, or other information) known to the appraiser?",
            "Are there any special or unusual characteristics of the project known to the appraiser?",
            "Special or unusual characteristics of the project",
            "Special characteristics"
        ],
        commentLabel: 'If Yes, describe and explain the effect on value and marketability.',
        commentKeys: [
            "If Yes, describe and explain the effect on value and marketability.",
            "Are there any special or unusual characteristics of the project (based on the condominium documents, HOA meetings, or other information) known to the appraiser? If Yes, describe and explain the effect on value and marketability.",
            "If Yes, describe and explain the effect on value & marketability"
        ]
    }
];

export const getProjectAnalysisValue = (allData, fieldKeys) => {
    if (!allData || typeof allData !== 'object') return '';
    const keys = Array.isArray(fieldKeys) ? fieldKeys : [fieldKeys];

    const sources = [
        allData,
        allData.PROJECT_ANALYSIS,
        allData['Project Analysis'],
        allData.clean_data?.['Project Analysis'],
        allData.clean_data?.PROJECT_ANALYSIS,
        allData.fields?.['Project Analysis'],
        allData.fields?.PROJECT_ANALYSIS,
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

export const findProjectAnalysisConditionalConfig = (field) => {
    if (!field) return null;
    const clean = String(field).trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' ');

    for (const cfg of PROJECT_ANALYSIS_CONDITIONAL_CONFIGS) {
        const matchesComment = cfg.commentKeys.some(k => clean === k.trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' '));
        if (matchesComment) {
            return { config: cfg, isComment: true, isQuestion: false };
        }
        const matchesQuestion = cfg.questionKeys.some(k => clean === k.trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' '));
        if (matchesQuestion) {
            return { config: cfg, isComment: false, isQuestion: true };
        }
    }

    // Flexible fallback patterns
    for (const cfg of PROJECT_ANALYSIS_CONDITIONAL_CONFIGS) {
        if (cfg.id === 'other_fees') {
            if (clean.includes('report the charges and describe') || (clean.includes('other fees') && clean.includes('if yes'))) {
                return { config: cfg, isComment: true, isQuestion: false };
            }
            if (clean.includes('other fees') && clean.includes('project facilities')) {
                return { config: cfg, isComment: false, isQuestion: true };
            }
        } else if (cfg.id === 'unit_charge_comparison') {
            if (clean.includes('if high or low') || clean === 'if high or low, describe') {
                return { config: cfg, isComment: true, isQuestion: false };
            }
            if (clean.includes('unit charge appears') || clean.includes('subject unit charge')) {
                return { config: cfg, isComment: false, isQuestion: true };
            }
        } else if (cfg.id === 'special_characteristics') {
            if ((clean.includes('special') || clean.includes('unusual')) && (clean.includes('describe') || clean.includes('if yes'))) {
                return { config: cfg, isComment: true, isQuestion: false };
            }
            if (clean === 'if yes, describe and explain the effect on value and marketability.') {
                return { config: cfg, isComment: true, isQuestion: false };
            }
            if (clean.includes('special or unusual characteristics')) {
                return { config: cfg, isComment: false, isQuestion: true };
            }
        }
    }

    return null;
};

export const checkProjectAnalysisConditionalPair = (field, text, allData, matchInfo) => {
    const { config, isComment, isQuestion } = matchInfo;
    const currentVal = text !== undefined && text !== null ? String(text).trim() : '';

    if (isComment) {
        const questionVal = getProjectAnalysisValue(allData, config.questionKeys);

        // Fallback for standalone check without question context (e.g. unit tests or empty allData)
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

        let isTrigger = false;
        let isNonTrigger = false;

        if (config.type === 'high_low_average') {
            isTrigger = isUnitChargeHighOrLow(questionVal);
            isNonTrigger = isUnitChargeAverage(questionVal);
        } else {
            isTrigger = isAnswerAffirmative(questionVal);
            isNonTrigger = isAnswerNegative(questionVal);
        }

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

        let isTrigger = false;
        if (config.type === 'high_low_average') {
            isTrigger = isUnitChargeHighOrLow(currentVal);
        } else {
            isTrigger = isAnswerAffirmative(currentVal);
        }

        if (isTrigger) {
            const commentVal = getProjectAnalysisValue(allData, config.commentKeys);
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

export const checkProjectAnalysisFieldsNotBlank = (field, text, allData) => {
    const cleanField = String(field || '').trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' ');

    const condoMatch = findProjectAnalysisConditionalConfig(field);
    if (condoMatch) {
        return checkProjectAnalysisConditionalPair(field, text, allData, condoMatch);
    }

    const isMatch = PROJECT_ANALYSIS_FIELDS_TO_CHECK.some(
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

    return {
        isMatch: true,
        message: "Validation successful!"
    };
};
