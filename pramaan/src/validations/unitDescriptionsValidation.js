import { checkProjectAndPropertyCondition, isPropertyConditionField } from './form1073Validation';

export const UNIT_DESCRIPTIONS_FIELDS_TO_CHECK = [
    "Unit Charge$",
    "Unit Charge $",
    "per month X 12 = $",
    " per month X 12 = $",
    "per year",
    "Annual assessment charge per year per square feet of gross living area = $",
    "Utilities included in the unit monthly assessment [None/Heat/Air/Conditioning/Electricity/Gas/Water/Sewer/Cable/Other (describe)]",
    "Floor #",
    "# of Levels",
    "Heating Type/Fuel",
    "Central AC/Individual AC/Other (describe)",
    "Fireplace(s) #/Woodstove(s) #/Deck/Patio/Porch/Balcony/Other",
    "Refrigerator/Range/Oven/Disp Microwave/Dishwasher/Washer/Dryer",
    "Floors",
    "Walls",
    "Trim/Finish",
    "Bath Wainscot",
    "Doors",
    "None/Garage/Covered/Open",
    "Assigned/Owned",
    "# of Cars",
    "Parking Space #",
    "Finished area above grade contains:",
    "Rooms",
    "Bedrooms",
    "Bath(s)",
    "Square Feet of Gross Living Area Above Grade",
    "Are the heating and cooling for the individual units separately metered?",
    "If No, describe and comment on compatibility to other projects in the market area.",
    "Additional features (special energy efficient items, etc.)",
    "Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)",
    "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property?",
    "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? ",
    "If Yes, describe",
    "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?",
    "If No, describe"
];

const isUnitChargeField = (fieldName) => {
    const clean = String(fieldName || '').trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' ');
    return clean === 'unit charge$' || clean === 'unit charge $' || clean === 'unit charge' || clean === 'monthly unit charge';
};

const isYearlyUnitChargeField = (fieldName) => {
    const clean = String(fieldName || '').trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' ');
    return clean === 'per month x 12 = $' ||
           clean === 'per month x 12 =$' ||
           clean === 'per month x 12 =' ||
           clean === 'per month x 12' ||
           clean === 'annual unit charge';
};

const parseNumericValue = (val) => {
    if (val === undefined || val === null) return null;
    const clean = String(val).replace(/[$,\s]/g, '').trim();
    if (clean === '' || isNaN(Number(clean))) return null;
    return parseFloat(clean);
};

const getUnitDescValue = (allData, candidateKeys) => {
    if (!allData || typeof allData !== 'object') return null;

    const containers = [
        allData?.UNIT_DESCRIPTIONS,
        allData?.['Unit Descriptions'],
        allData?.clean_data?.['Unit Descriptions'],
        allData?.clean_data?.UNIT_DESCRIPTIONS,
        allData?.data?.['Unit Descriptions'],
        allData?.data?.UNIT_DESCRIPTIONS,
        allData
    ].filter(c => c && typeof c === 'object');

    for (const container of containers) {
        for (const k of candidateKeys) {
            if (container[k] !== undefined && container[k] !== null && String(container[k]).trim() !== '') {
                return String(container[k]).trim();
            }
        }
        const entries = Object.entries(container);
        for (const k of candidateKeys) {
            const normKey = k.toLowerCase().replace(/[\s$]/g, '');
            for (const [entryKey, val] of entries) {
                if (entryKey.toLowerCase().replace(/[\s$]/g, '') === normKey) {
                    if (val !== undefined && val !== null && String(val).trim() !== '') {
                        return String(val).trim();
                    }
                }
            }
        }
    }
    return null;
};

export const checkUnitChargeCalculation = (field, text, allData) => {
    const isUnitCharge = isUnitChargeField(field);
    const isYearlyCharge = isYearlyUnitChargeField(field);

    if (!isUnitCharge && !isYearlyCharge) {
        return null;
    }

    if (!text || String(text).trim() === '') {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `'${field}' must not be blank.`
        };
    }

    if (!allData || typeof allData !== 'object') {
        return {
            isMatch: true,
            message: "Validation successful!"
        };
    }

    const unitChargeCandidates = [
        'Unit Charge$', 'Unit Charge $', 'Unit Charge', 'Monthly Amount', 'Monthly Unit Charge'
    ];
    const yearlyCandidates = [
        'per month X 12 = $', ' per month X 12 = $', 'per month X 12 =$', 'per month X 12 =', 'per month x 12 = $', 'per month X 12', 'Annual Unit Charge'
    ];

    let unitChargeRaw = isUnitCharge ? text : getUnitDescValue(allData, unitChargeCandidates);
    let yearlyRaw = isYearlyCharge ? text : getUnitDescValue(allData, yearlyCandidates);

    if (!unitChargeRaw || !yearlyRaw || String(unitChargeRaw).trim() === '' || String(yearlyRaw).trim() === '') {
        return {
            isMatch: true,
            message: "Validation successful!"
        };
    }

    const monthlyNum = parseNumericValue(unitChargeRaw);
    const yearlyNum = parseNumericValue(yearlyRaw);

    if (monthlyNum === null || isNaN(monthlyNum)) {
        return {
            isError: true,
            message: `'Unit Charge $' must be a valid number (received '${unitChargeRaw}').`
        };
    }

    if (yearlyNum === null || isNaN(yearlyNum)) {
        return {
            isError: true,
            message: `'per month X 12 = $' must be a valid number (received '${yearlyRaw}').`
        };
    }

    const expectedYearly = monthlyNum * 12;
    const isCalculationMatch = Math.abs(expectedYearly - yearlyNum) < 0.05;

    const formattedMonthly = monthlyNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedYearly = yearlyNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedExpected = expectedYearly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (!isCalculationMatch) {
        return {
            isError: true,
            message: `Calculation mismatch: 'per month X 12 = $' ($${formattedYearly}) must equal 'Unit Charge $' ($${formattedMonthly}) * 12 ($${formattedExpected}).`
        };
    }

    return {
        isMatch: true,
        message: `Valid: 'per month X 12 = $' ($${formattedYearly}) equals 'Unit Charge $' ($${formattedMonthly}) * 12.`
    };
};

export const checkUnitDescriptionsFieldsNotBlank = (field, text, allData) => {
    const cleanField = String(field || '').trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' ');
    const isMatch = UNIT_DESCRIPTIONS_FIELDS_TO_CHECK.some(
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

    if (isPropertyConditionField(field)) {
        return checkProjectAndPropertyCondition(field, text, allData);
    }

    if (isUnitChargeField(field) || isYearlyUnitChargeField(field)) {
        return checkUnitChargeCalculation(field, text, allData);
    }

    return {
        isMatch: true,
        message: "Validation successful!"
    };
};
