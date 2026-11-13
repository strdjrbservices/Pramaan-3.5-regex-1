import { checkUnitDescriptionsFieldsNotBlank, checkUnitChargeCalculation, UNIT_DESCRIPTIONS_FIELDS_TO_CHECK } from '../unitDescriptionsValidation';

describe('unitDescriptionsValidation - checkUnitDescriptionsFieldsNotBlank', () => {
    test('returns error with skipBlankFilter: true when a unit description field is empty or blank', () => {
        const fieldsToTest = [
            "Unit Charge$",
            "per month X 12 = $",
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
            "If Yes, describe",
            "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?",
            "If No, describe"
        ];

        fieldsToTest.forEach(field => {
            const blankRes = checkUnitDescriptionsFieldsNotBlank(field, '');
            expect(blankRes).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: `'${field}' must not be blank.`
            });

            const nullRes = checkUnitDescriptionsFieldsNotBlank(field, null);
            expect(nullRes).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: `'${field}' must not be blank.`
            });

            const whitespaceRes = checkUnitDescriptionsFieldsNotBlank(field, '   ');
            expect(whitespaceRes).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: `'${field}' must not be blank.`
            });
        });
    });

    test('returns isMatch: true when a unit description field has a valid value', () => {
        const roomsRes = checkUnitDescriptionsFieldsNotBlank('Rooms', '5');
        expect(roomsRes).toEqual({
            isMatch: true,
            message: 'Validation successful!'
        });

        const bedRes = checkUnitDescriptionsFieldsNotBlank('Bedrooms', '2');
        expect(bedRes).toEqual({
            isMatch: true,
            message: 'Validation successful!'
        });

        const bathRes = checkUnitDescriptionsFieldsNotBlank('Bath(s)', '2.0');
        expect(bathRes).toEqual({
            isMatch: true,
            message: 'Validation successful!'
        });

        const glaRes = checkUnitDescriptionsFieldsNotBlank('Square Feet of Gross Living Area Above Grade', '1250');
        expect(glaRes).toEqual({
            isMatch: true,
            message: 'Validation successful!'
        });
    });

    test('matches field names case-insensitively and handles whitespace variations', () => {
        const lowerRes = checkUnitDescriptionsFieldsNotBlank('unit charge$', '');
        expect(lowerRes).toEqual({
            isError: true,
            skipBlankFilter: true,
            message: "'unit charge$' must not be blank."
        });

        const upperRes = checkUnitDescriptionsFieldsNotBlank('BEDROOMS', '3');
        expect(upperRes).toEqual({
            isMatch: true,
            message: 'Validation successful!'
        });

        const descRes = checkUnitDescriptionsFieldsNotBlank('if no, describe', '');
        expect(descRes).toEqual({
            isError: true,
            skipBlankFilter: true,
            message: "'if no, describe' must not be blank."
        });
    });

    test('returns null for unrelated fields', () => {
        expect(checkUnitDescriptionsFieldsNotBlank('Random Unknown Field', '')).toBeNull();
        expect(checkUnitDescriptionsFieldsNotBlank('Random Unknown Field', 'Some Value')).toBeNull();
    });

    describe('checkUnitChargeCalculation', () => {
        test('validates when "per month X 12 = $" equals "Unit Charge $" * 12 (376 * 12 = 4512)', () => {
            const allData = {
                'Unit Descriptions': {
                    'Unit Charge$': '376',
                    'per month X 12 = $': '4,512.00'
                }
            };

            const yearlyRes = checkUnitChargeCalculation('per month X 12 = $', '4,512.00', allData);
            expect(yearlyRes).not.toBeNull();
            expect(yearlyRes.isMatch).toBe(true);
            expect(yearlyRes.message).toContain("equals 'Unit Charge $' ($376.00) * 12");

            const monthlyRes = checkUnitChargeCalculation('Unit Charge$', '376', allData);
            expect(monthlyRes).not.toBeNull();
            expect(monthlyRes.isMatch).toBe(true);

            // Also via checkUnitDescriptionsFieldsNotBlank
            const viaGeneralYearly = checkUnitDescriptionsFieldsNotBlank('per month X 12 = $', '4,512.00', allData);
            expect(viaGeneralYearly.isMatch).toBe(true);

            const viaGeneralMonthly = checkUnitDescriptionsFieldsNotBlank('Unit Charge$', '376', allData);
            expect(viaGeneralMonthly.isMatch).toBe(true);
        });

        test('handles currency symbols and commas ($376.00 and $4,512.00)', () => {
            const allData = {
                UNIT_DESCRIPTIONS: {
                    'Unit Charge $': '$376.00',
                    'per month X 12 = $': '$4,512.00'
                }
            };

            const res = checkUnitChargeCalculation('per month X 12 = $', '$4,512.00', allData);
            expect(res.isMatch).toBe(true);
        });

        test('returns error when "per month X 12 = $" does not equal "Unit Charge $" * 12', () => {
            const allData = {
                'Unit Descriptions': {
                    'Unit Charge$': '376',
                    'per month X 12 = $': '4,000.00'
                }
            };

            const yearlyRes = checkUnitChargeCalculation('per month X 12 = $', '4,000.00', allData);
            expect(yearlyRes).not.toBeNull();
            expect(yearlyRes.isError).toBe(true);
            expect(yearlyRes.message).toContain('Calculation mismatch');
            expect(yearlyRes.message).toContain('$4,000.00');
            expect(yearlyRes.message).toContain('$4,512.00');

            const monthlyRes = checkUnitChargeCalculation('Unit Charge$', '376', allData);
            expect(monthlyRes).not.toBeNull();
            expect(monthlyRes.isError).toBe(true);
            expect(monthlyRes.message).toContain('Calculation mismatch');
        });

        test('returns error when text is blank or non-numeric', () => {
            expect(checkUnitChargeCalculation('Unit Charge$', '')).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: "'Unit Charge$' must not be blank."
            });

            expect(checkUnitChargeCalculation('per month X 12 = $', '')).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: "'per month X 12 = $' must not be blank."
            });

            const allData = {
                'Unit Descriptions': {
                    'Unit Charge$': 'abc',
                    'per month X 12 = $': '4,512.00'
                }
            };
            const errRes = checkUnitChargeCalculation('per month X 12 = $', '4,512.00', allData);
            expect(errRes.isError).toBe(true);
            expect(errRes.message).toContain('must be a valid number');
        });

        test('returns null for fields that are not unit charge fields', () => {
            expect(checkUnitChargeCalculation('Rooms', '5', {})).toBeNull();
        });
    });
});

