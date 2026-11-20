import {
    checkPriorSaleHistoryFieldsNotBlank,
    checkSubjectPriorSaleValueIncrease,
    extractYearFromDateStr,
    getAppraisalCurrentYear,
    isPriorSaleIncreaseOver15,
    extractIncreaseComment,
    hasValidIncreaseComment
} from '../priorSaleHistoryValidation';

describe('priorSaleHistoryValidation - checkPriorSaleHistoryFieldsNotBlank', () => {
    test('returns error with skipBlankFilter: true when a prior sale history field is empty or blank', () => {
        const fieldsToTest = [
            "Prior Sale History: I did did not research the sale or transfer history of the subject property and comparable sales",
            "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal",
            "Prior Sale History: Data source(s) for subject",
            "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale",
            "Prior Sale History: Data source(s) for comparables",
            "Prior Sale History: Report the results of the research and analysis of the prior sale or transfer history of the subject property and comparable sales",
            "Prior Sale History: Date of Prior Sale/Transfer",
            "Prior Sale History: Price of Prior Sale/Transfer",
            "Prior Sale History: Data Source(s) for prior sale/transfer",
            "Prior Sale History: Effective Date of Data Source(s)",
            "Prior Sale History: Analysis of prior sale or transfer history of the subject property and comparable sales",
            "Prior Sales or Transfers",
            "Subject Transfer History Data Source",
            "Comparable Number",
            "Comparable Transfer Terms",
            "Comparable Transfer Date",
            "Comparable Transfer Amount",
            "Comparable Transfer Data Source",
            "Analysis of Prior Sale and Transfer History of Subject Property",
            "Analysis of Prior Sale and Transfer History of Comparable Sales"
        ];

        fieldsToTest.forEach(field => {
            const blankRes = checkPriorSaleHistoryFieldsNotBlank(field, '');
            expect(blankRes).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: `'${field}' must not be blank.`
            });

            const nullRes = checkPriorSaleHistoryFieldsNotBlank(field, null);
            expect(nullRes).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: `'${field}' must not be blank.`
            });

            const whitespaceRes = checkPriorSaleHistoryFieldsNotBlank(field, '   ');
            expect(whitespaceRes).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: `'${field}' must not be blank.`
            });
        });
    });

    test('returns isMatch: true when a prior sale history field has a valid value', () => {
        const resResearch = checkPriorSaleHistoryFieldsNotBlank(
            "Prior Sale History: I did did not research the sale or transfer history of the subject property and comparable sales",
            "did"
        );
        expect(resResearch).toEqual({
            isMatch: true,
            message: 'Validation successful!'
        });

        const resSubjPrior = checkPriorSaleHistoryFieldsNotBlank(
            "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal",
            "did"
        );
        expect(resSubjPrior).toEqual({
            isMatch: true,
            message: 'Validation successful!'
        });

        const resDate = checkPriorSaleHistoryFieldsNotBlank(
            "Prior Sale History: Date of Prior Sale/Transfer",
            "09/24/2026"
        );
        expect(resDate).toEqual({
            isMatch: true,
            message: 'Validation successful!'
        });

        const resPrice = checkPriorSaleHistoryFieldsNotBlank(
            "Prior Sale History: Price of Prior Sale/Transfer",
            "$599,900"
        );
        expect(resPrice).toEqual({
            isMatch: true,
            message: 'Validation successful!'
        });
    });

    test('matches field names case-insensitively and handles whitespace variations', () => {
        const lowerRes = checkPriorSaleHistoryFieldsNotBlank('prior sales or transfers', '');
        expect(lowerRes).toEqual({
            isError: true,
            skipBlankFilter: true,
            message: "'prior sales or transfers' must not be blank."
        });

        const upperRes = checkPriorSaleHistoryFieldsNotBlank('SUBJECT TRANSFER HISTORY DATA SOURCE', 'Tax Records');
        expect(upperRes).toEqual({
            isMatch: true,
            message: 'Validation successful!'
        });
    });

    test('returns null for unmonitored fields', () => {
        const unmonitored = checkPriorSaleHistoryFieldsNotBlank('Unrelated Field', '');
        expect(unmonitored).toBeNull();
    });
});

describe('priorSaleHistoryValidation - Sales or Transfer History Rules Integration', () => {
    test('checkResearchHistory integration: "did" is valid, "did not" is critical error', () => {
        const field = "I did did not research the sale or transfer history of the subject property and comparable sales. If not, explain";
        const validRes = checkPriorSaleHistoryFieldsNotBlank(field, "did", {});
        expect(validRes.isMatch).toBe(true);

        const invalidRes = checkPriorSaleHistoryFieldsNotBlank(field, "did not", {});
        expect(invalidRes.isError).toBe(true);
        expect(invalidRes.message).toContain('Critical Error');
    });

    test('Subject Prior Sales: "did not reveal" makes empty date/price valid', () => {
        const dataDidNot = {
            "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.": "did not"
        };
        const dateRes = checkPriorSaleHistoryFieldsNotBlank("Date of Prior Sale/Transfer", "", dataDidNot, ['Subject', 'Date of Prior Sale/Transfer'], 'Subject');
        expect(dateRes).toBeNull();

        const priceRes = checkPriorSaleHistoryFieldsNotBlank("Price of Prior Sale/Transfer", "", dataDidNot, ['Subject', 'Price of Prior Sale/Transfer'], 'Subject');
        expect(priceRes).toBeNull();
    });

    test('Comparable Prior Sales: "did not reveal" makes empty comp date/price valid', () => {
        const dataDidNot = {
            "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.": "did not"
        };
        const dateRes = checkPriorSaleHistoryFieldsNotBlank("Date of Prior Sale/Transfer", "", dataDidNot, ['COMPARABLE SALE #1', 'Date of Prior Sale/Transfer'], 'COMPARABLE SALE #1');
        expect(dateRes).toBeNull();

        const priceRes = checkPriorSaleHistoryFieldsNotBlank("Price of Prior Sale/Transfer", "", dataDidNot, ['COMPARABLE SALE #1', 'Price of Prior Sale/Transfer'], 'COMPARABLE SALE #1');
        expect(priceRes).toBeNull();
    });

    test('Data Source cannot be blank when data is provided', () => {
        const blankSrc = checkPriorSaleHistoryFieldsNotBlank("Data Source(s) for subject property research", "", {});
        expect(blankSrc.isError).toBe(true);
        expect(blankSrc.message).toContain('cannot be blank');

        const validSrc = checkPriorSaleHistoryFieldsNotBlank("Data Source(s) for subject property research", "Realist", {});
        expect(validSrc.isMatch).toBe(true);
    });

    test('Effective date must be valid and in current year', () => {
        const currentYear = new Date().getFullYear();
        const validEff = checkPriorSaleHistoryFieldsNotBlank("Effective Date of Data Source(s) for prior sale", `11/09/${currentYear}`, {});
        expect(validEff.isMatch).toBe(true);

        const invalidEff = checkPriorSaleHistoryFieldsNotBlank("Effective Date of Data Source(s) for prior sale", "11/09/1990", {});
        expect(invalidEff.isError).toBe(true);
        expect(invalidEff.message).toContain('must be the current year');
    });

    test('Indicated Value by Sales Comparison Approach $ is monitored in prior sale history', () => {
        const blankVal = checkPriorSaleHistoryFieldsNotBlank("Indicated Value by Sales Comparison Approach $", "");
        expect(blankVal.isError).toBe(true);
        expect(blankVal.message).toContain('must not be blank');

        const validVal = checkPriorSaleHistoryFieldsNotBlank("Indicated Value by Sales Comparison Approach $", "1,200,000");
        expect(validVal.isMatch).toBe(true);
    });

    test('Subject Prior Sale Price: 0 fails without comment stating "family transfer" or "sold to family member"', () => {
        const dataWithoutComment = {
            "Date of Prior Sale/Transfer": "02/09/2026",
            "Price of Prior Sale/Transfer": "0"
        };
        const res = checkPriorSaleHistoryFieldsNotBlank(
            "Price of Prior Sale/Transfer",
            "0",
            dataWithoutComment,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res.isError).toBe(true);
        expect(res.message).toBe("If prior sale is present, 'Price of Prior Sale/Transfer' for Subject must be greater than 0 or include a comment stating 'family transfer' or 'sold to family member'.");
    });

    test('Subject Prior Sale Price: 0 passes when comment states "family transfer"', () => {
        const dataWithComment = {
            "Date of Prior Sale/Transfer": "02/09/2026",
            "Price of Prior Sale/Transfer": "0",
            "Analysis of prior sale or transfer history of the subject property and comparable sales": "The prior deed transfer was a family transfer between mother and son."
        };
        const res = checkPriorSaleHistoryFieldsNotBlank(
            "Price of Prior Sale/Transfer",
            "0",
            dataWithComment,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res.isMatch).toBe(true);
        expect(res.message).toContain("Family transfer");
    });

    test('Subject Prior Sale Price: 0 passes when comment states "sold to family member"', () => {
        const dataWithComment = {
            "Date of Prior Sale/Transfer": "02/09/2026",
            "Price of Prior Sale/Transfer": "0",
            "Analysis of prior sale or transfer history of the subject property and comparable sales": "Subject property was sold to family member with nominal consideration."
        };
        const res = checkPriorSaleHistoryFieldsNotBlank(
            "Price of Prior Sale/Transfer",
            "$0",
            dataWithComment,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res.isMatch).toBe(true);
        expect(res.message).toContain("Family transfer");
    });

    test('Subject Prior Sale Price: passes when price is > 0', () => {
        const res = checkPriorSaleHistoryFieldsNotBlank(
            "Price of Prior Sale/Transfer",
            "$325,000",
            {},
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res.isMatch).toBe(true);
    });

    test('Subject Prior Sale Price: passes when "family transfer" is written directly in the field', () => {
        const res = checkPriorSaleHistoryFieldsNotBlank(
            "Price of Prior Sale/Transfer",
            "0 - family transfer",
            {},
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res.isMatch).toBe(true);
    });

    test('Comp Prior Sale Price: 0 fails without comment and mentions comparable in message', () => {
        const compDataWithoutComment = {
            'COMPARABLE SALE #1': {
                'Date of Prior Sale/Transfer': '05/12/2025',
                'Price of Prior Sale/Transfer': '0'
            }
        };
        const res = checkPriorSaleHistoryFieldsNotBlank(
            "Price of Prior Sale/Transfer",
            "0",
            compDataWithoutComment,
            ['COMPARABLE SALE #1', 'Price of Prior Sale/Transfer'],
            'COMPARABLE SALE #1'
        );
        expect(res.isError).toBe(true);
        expect(res.message).toBe("If prior sale is present, 'Price of Prior Sale/Transfer' for COMPARABLE SALE #1 must be greater than 0 or include a comment stating 'family transfer' or 'sold to family member'.");
    });

    test('Comp Prior Sale Price: 0 passes when comment states "sold to family member" or "family transfer"', () => {
        const compDataWithComment = {
            'COMPARABLE SALE #1': {
                'Date of Prior Sale/Transfer': '05/12/2025',
                'Price of Prior Sale/Transfer': '0'
            },
            'Analysis of prior sale or transfer history of the subject property and comparable sales': 'Comp 1 was transferred to family member.'
        };
        const res = checkPriorSaleHistoryFieldsNotBlank(
            "Price of Prior Sale/Transfer",
            "0",
            compDataWithComment,
            ['COMPARABLE SALE #1', 'Price of Prior Sale/Transfer'],
            'COMPARABLE SALE #1'
        );
        expect(res.isMatch).toBe(true);
    });

    test('Comp Prior Sale Price: passes when price is > 0', () => {
        const res = checkPriorSaleHistoryFieldsNotBlank(
            "Price of Prior Sale/Transfer",
            "450,000",
            {},
            ['COMPARABLE SALE #1', 'Price of Prior Sale/Transfer'],
            'COMPARABLE SALE #1'
        );
        expect(res.isMatch).toBe(true);
    });
});

describe('checkSubjectPriorSaleValueIncrease (15% rule when subject prior sale year is same as current year)', () => {
    const baseCurrentYearData = {
        'as of': '10/18/2026',
        Subject: {
            'Date of Prior Sale/Transfer': '04/15/2026',
            'Price of Prior Sale/Transfer': '$400,000'
        },
        RECONCILIATION: {
            'Opinion of Market Value': '$500,000'
        }
    };

    test('flags error when final value exceeds prior sale price by > 15% in same year and no comment exists', () => {
        const res = checkSubjectPriorSaleValueIncrease(
            'Price of Prior Sale/Transfer',
            '$400,000',
            baseCurrentYearData,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res).toBeDefined();
        expect(res.isError).toBe(true);
        expect(res.skipBlankFilter).toBe(true);
        expect(res.message).toBe(
            'If the subject has "Price of Prior Sale/Transfer" and the year is same as of current year then the "OPINION OF THE MARKET VALUE, AS DEFINED, OF THE REAL PROPERTY THAT IS THE SUBJECT OF THIS REPORT IS $" should not be more than 15%. Please add comment to check increase in value.'
        );
    });

    test('validates successfully when final value exceeds prior sale price by > 15% in same year but an explanatory comment is provided', () => {
        const dataWithComment = {
            ...baseCurrentYearData,
            PRIOR_SALE_HISTORY: {
                'Analysis of prior sale or transfer history of the subject property and comparable sales':
                    'The subject property was purchased by an investor and underwent substantial renovations prior to resale.'
            }
        };
        const res = checkSubjectPriorSaleValueIncrease(
            'Price of Prior Sale/Transfer',
            '$400,000',
            dataWithComment,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res).toBeDefined();
        expect(res.isMatch).toBe(true);
        expect(res.message).toContain('supported by explanatory comment');
        expect(res.message).toContain('25.0%');
    });

    test('validates successfully when final value is within 15% of prior sale price in same year', () => {
        const dataWithin15 = {
            ...baseCurrentYearData,
            RECONCILIATION: {
                'Opinion of Market Value': '$440,000' // 10% increase <= 15%
            }
        };
        const res = checkSubjectPriorSaleValueIncrease(
            'Price of Prior Sale/Transfer',
            '$400,000',
            dataWithin15,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res).toBeDefined();
        expect(res.isMatch).toBe(true);
        expect(res.message).toContain('within 15% of prior sale');
    });

    test('returns null when prior sale year is different from current year (e.g. prior sale in 2024, current year 2026)', () => {
        const dataDifferentYear = {
            ...baseCurrentYearData,
            Subject: {
                'Date of Prior Sale/Transfer': '04/15/2024',
                'Price of Prior Sale/Transfer': '$400,000'
            }
        };
        const res = checkSubjectPriorSaleValueIncrease(
            'Price of Prior Sale/Transfer',
            '$400,000',
            dataDifferentYear,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res).toBeNull();
    });

    test('returns null when subject prior sale price is 0 or missing', () => {
        const dataNoPriorSale = {
            ...baseCurrentYearData,
            Subject: {
                'Date of Prior Sale/Transfer': '04/15/2026',
                'Price of Prior Sale/Transfer': '$0'
            }
        };
        const res = checkSubjectPriorSaleValueIncrease(
            'Price of Prior Sale/Transfer',
            '$0',
            dataNoPriorSale,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res).toBeNull();
    });

    test('returns null for comparable sales (only validates Subject)', () => {
        const res = checkSubjectPriorSaleValueIncrease(
            'Price of Prior Sale/Transfer',
            '$400,000',
            baseCurrentYearData,
            ['COMPARABLE SALE #1', 'Price of Prior Sale/Transfer'],
            'COMPARABLE SALE #1'
        );
        expect(res).toBeNull();
    });

    test('validates Opinion of Market Value and highlights error when > 15% without comment', () => {
        const res = checkSubjectPriorSaleValueIncrease(
            'Opinion of Market Value',
            '$520,000',
            baseCurrentYearData,
            ['RECONCILIATION', 'Opinion of Market Value']
        );
        expect(res).toBeDefined();
        expect(res.isError).toBe(true);
        expect(res.message).toContain('Please add comment to check increase in value');
    });

    test('validates Prior Sale Analysis comment box and passes when comment is provided', () => {
        const resEmptyComment = checkSubjectPriorSaleValueIncrease(
            'Analysis of prior sale or transfer history of the subject property and comparable sales',
            '',
            baseCurrentYearData,
            ['Analysis of prior sale or transfer history of the subject property and comparable sales']
        );
        expect(resEmptyComment).toBeDefined();
        expect(resEmptyComment.isError).toBe(true);
        expect(resEmptyComment.message).toContain('Please add comment to check increase in value');

        const resFilledComment = checkSubjectPriorSaleValueIncrease(
            'Analysis of prior sale or transfer history of the subject property and comparable sales',
            'Subject property was completely remodeled with a new roof and kitchen.',
            baseCurrentYearData,
            ['Analysis of prior sale or transfer history of the subject property and comparable sales']
        );
        expect(resFilledComment).toBeDefined();
        expect(resFilledComment.isMatch).toBe(true);
        expect(resFilledComment.message).toContain('supported by explanatory comment');
    });

    test('integrates into checkPriorSaleHistoryFieldsNotBlank seamlessly', () => {
        // Price check without comment returns error
        const resErr = checkPriorSaleHistoryFieldsNotBlank(
            'Price of Prior Sale/Transfer',
            '$400,000',
            baseCurrentYearData,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(resErr.isError).toBe(true);
        expect(resErr.message).toContain('Please add comment to check increase in value');

        // Price check with comment returns match
        const dataWithComment = {
            ...baseCurrentYearData,
            'Analysis of prior sale or transfer history of the subject property and comparable sales':
                'Remodeled prior to sale explaining increase.'
        };
        const resMatch = checkPriorSaleHistoryFieldsNotBlank(
            'Price of Prior Sale/Transfer',
            '$400,000',
            dataWithComment,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(resMatch.isMatch).toBe(true);
        expect(resMatch.message).toContain('supported by explanatory comment');
    });

    test('date string and year helper functions correctly extract years from different formats', () => {
        expect(extractYearFromDateStr('07/30/2026')).toBe(2026);
        expect(extractYearFromDateStr('2026-07-30')).toBe(2026);
        expect(extractYearFromDateStr('s09/26:c07/26')).toBe(2026);
        expect(extractYearFromDateStr('04/24')).toBe(2024);
        expect(extractYearFromDateStr('04/15/24')).toBe(2024);
        expect(extractYearFromDateStr('None')).toBeNull();
        expect(extractYearFromDateStr('N/A')).toBeNull();

        expect(getAppraisalCurrentYear(baseCurrentYearData)).toBe(2026);
    });

    test('dynamically re-evaluates validation when values change manually', () => {
        // Initial state: Prior sale $400,000, Final value $500,000 in 2026, no comment -> Error
        let liveData = {
            ...baseCurrentYearData,
            'Price of Prior Sale/Transfer': '$400,000',
            'OPINION OF THE MARKET VALUE, AS DEFINED, OF THE REAL PROPERTY THAT IS THE SUBJECT OF THIS REPORT IS $': '$500,000',
            'Date of Prior Sale/Transfer': '03/15/2026'
        };

        let res = checkSubjectPriorSaleValueIncrease(
            'Price of Prior Sale/Transfer',
            '$400,000',
            liveData,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res.isError).toBe(true);
        expect(res.message).toBe(
            'If the subject has "Price of Prior Sale/Transfer" and the year is same as of current year then the "OPINION OF THE MARKET VALUE, AS DEFINED, OF THE REAL PROPERTY THAT IS THE SUBJECT OF THIS REPORT IS $" should not be more than 15%. Please add comment to check increase in value.'
        );

        // 1. User manually changes final value to $430,000 (within 15% of $400,000 max $460,000) -> Valid / Match
        liveData = {
            ...liveData,
            'OPINION OF THE MARKET VALUE, AS DEFINED, OF THE REAL PROPERTY THAT IS THE SUBJECT OF THIS REPORT IS $': '$430,000',
            RECONCILIATION: {
                'OPINION OF THE MARKET VALUE, AS DEFINED, OF THE REAL PROPERTY THAT IS THE SUBJECT OF THIS REPORT IS $': '$430,000',
                'Opinion of Market Value': '$430,000'
            }
        };
        res = checkSubjectPriorSaleValueIncrease(
            'Price of Prior Sale/Transfer',
            '$400,000',
            liveData,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res.isMatch).toBe(true);
        expect(res.message).toContain('within 15%');

        // 2. User manually changes prior sale price to $480,000 and final value to $500,000 (within 15%) -> Valid / Match
        liveData = {
            ...liveData,
            'Price of Prior Sale/Transfer': '$480,000',
            Subject: {
                ...liveData.Subject,
                'Price of Prior Sale/Transfer': '$480,000'
            },
            'OPINION OF THE MARKET VALUE, AS DEFINED, OF THE REAL PROPERTY THAT IS THE SUBJECT OF THIS REPORT IS $': '$500,000',
            RECONCILIATION: {
                'OPINION OF THE MARKET VALUE, AS DEFINED, OF THE REAL PROPERTY THAT IS THE SUBJECT OF THIS REPORT IS $': '$500,000',
                'Opinion of Market Value': '$500,000'
            }
        };
        res = checkSubjectPriorSaleValueIncrease(
            'Price of Prior Sale/Transfer',
            '$480,000',
            liveData,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res.isMatch).toBe(true);

        // 3. User manually lowers prior sale price to $300,000 (> 15% increase to $500,000) -> Error
        liveData = {
            ...liveData,
            'Price of Prior Sale/Transfer': '$300,000',
            Subject: {
                ...liveData.Subject,
                'Price of Prior Sale/Transfer': '$300,000'
            }
        };
        res = checkSubjectPriorSaleValueIncrease(
            'Price of Prior Sale/Transfer',
            '$300,000',
            liveData,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res.isError).toBe(true);

        // 4. User adds comment explaining the increase -> Valid / Match
        liveData = {
            ...liveData,
            'Analysis of prior sale or transfer history of the subject property and comparable sales':
                'Home underwent a full $150k luxury renovation and addition between sales.',
            PRIOR_SALE_HISTORY: {
                ...liveData.PRIOR_SALE_HISTORY,
                'Analysis of prior sale or transfer history of the subject property and comparable sales':
                    'Home underwent a full $150k luxury renovation and addition between sales.'
            }
        };
        res = checkSubjectPriorSaleValueIncrease(
            'Price of Prior Sale/Transfer',
            '$300,000',
            liveData,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res.isMatch).toBe(true);
        expect(res.message).toContain('supported by explanatory comment');

        // 5. User clears comment -> Error returns
        liveData = {
            ...liveData,
            'Analysis of prior sale or transfer history of the subject property and comparable sales': '',
            PRIOR_SALE_HISTORY: {
                ...liveData.PRIOR_SALE_HISTORY,
                'Analysis of prior sale or transfer history of the subject property and comparable sales': ''
            }
        };
        res = checkSubjectPriorSaleValueIncrease(
            'Price of Prior Sale/Transfer',
            '$300,000',
            liveData,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res.isError).toBe(true);

        // 6. User changes date to previous year (2024 instead of 2026) -> Rule no longer applies
        liveData = {
            ...liveData,
            'Date of Prior Sale/Transfer': '05/20/2024',
            Subject: {
                ...liveData.Subject,
                'Date of Prior Sale/Transfer': '05/20/2024'
            }
        };
        res = checkSubjectPriorSaleValueIncrease(
            'Price of Prior Sale/Transfer',
            '$300,000',
            liveData,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        // 7. When final value is lower than prior sale price (e.g. $875,000 vs $5,800,000 / $500T), rule only checks for MORE than 15% increase, so it is valid
        liveData = {
            ...liveData,
            'Price of Prior Sale/Transfer': '580,0000',
            Subject: {
                ...liveData.Subject,
                'Price of Prior Sale/Transfer': '580,0000',
                'Date of Prior Sale/Transfer': '05/30/2026'
            },
            'Date of Prior Sale/Transfer': '05/30/2026',
            'OPINION OF THE MARKET VALUE, AS DEFINED, OF THE REAL PROPERTY THAT IS THE SUBJECT OF THIS REPORT IS $': '$875,000',
            RECONCILIATION: {
                'OPINION OF THE MARKET VALUE, AS DEFINED, OF THE REAL PROPERTY THAT IS THE SUBJECT OF THIS REPORT IS $': '$875,000',
                'Opinion of Market Value': '$875,000'
            }
        };
        res = checkSubjectPriorSaleValueIncrease(
            'Price of Prior Sale/Transfer',
            '580,0000',
            liveData,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res.isMatch).toBe(true);
        expect(res.message).toContain('is not more than 15% above prior sale');

        // 8. When final value is more than 15% higher (e.g. $500,000 prior vs $875,000 final = 75% increase) without comment -> Error
        liveData = {
            ...liveData,
            'Price of Prior Sale/Transfer': '$500,000',
            Subject: {
                ...liveData.Subject,
                'Price of Prior Sale/Transfer': '$500,000',
                'Date of Prior Sale/Transfer': '05/30/2026'
            },
            'Date of Prior Sale/Transfer': '05/30/2026',
            'OPINION OF THE MARKET VALUE, AS DEFINED, OF THE REAL PROPERTY THAT IS THE SUBJECT OF THIS REPORT IS $': '$875,000',
            RECONCILIATION: {
                'OPINION OF THE MARKET VALUE, AS DEFINED, OF THE REAL PROPERTY THAT IS THE SUBJECT OF THIS REPORT IS $': '$875,000',
                'Opinion of Market Value': '$875,000'
            }
        };
        res = checkSubjectPriorSaleValueIncrease(
            'Price of Prior Sale/Transfer',
            '$500,000',
            liveData,
            ['Subject', 'Price of Prior Sale/Transfer'],
            'Subject'
        );
        expect(res.isError).toBe(true);
        expect(res.message).toBe(
            'If the subject has "Price of Prior Sale/Transfer" and the year is same as of current year then the "OPINION OF THE MARKET VALUE, AS DEFINED, OF THE REAL PROPERTY THAT IS THE SUBJECT OF THIS REPORT IS $" should not be more than 15%. Please add comment to check increase in value.'
        );

        // 9. When Comment on Increase in Value is provided in RECONCILIATION section -> Valid
        liveData = {
            ...liveData,
            RECONCILIATION: {
                ...liveData.RECONCILIATION,
                'Comment on Increase in Value': 'Renovation of kitchen, baths, and roof accounts for the increase in value.'
            }
        };
        res = checkSubjectPriorSaleValueIncrease(
            'Comment on Increase in Value',
            'Renovation of kitchen, baths, and roof accounts for the increase in value.',
            liveData,
            ['RECONCILIATION', 'Comment on Increase in Value']
        );
        expect(res.isMatch).toBe(true);
        expect(res.message).toContain('supported by explanatory comment');
        expect(res.message).toContain('75.0%');
    });

    test('isPriorSaleIncreaseOver15 detects >15% increase only', () => {
        const dataIncrease = {
            'as of': '11/12/2026',
            Subject: {
                'Date of Prior Sale/Transfer': '05/30/2026',
                'Price of Prior Sale/Transfer': '$500,000'
            },
            RECONCILIATION: {
                'Opinion of Market Value': '$875,000'
            }
        };
        expect(isPriorSaleIncreaseOver15(dataIncrease)).toBe(true);

        const dataDecrease = {
            'as of': '11/12/2026',
            Subject: {
                'Date of Prior Sale/Transfer': '05/30/2026',
                'Price of Prior Sale/Transfer': '580,0000'
            },
            RECONCILIATION: {
                'Opinion of Market Value': '$875,000'
            }
        };
        expect(isPriorSaleIncreaseOver15(dataDecrease)).toBe(false);
    });

    test('extractIncreaseComment and hasValidIncreaseComment ignore generic no-sales comments', () => {
        expect(hasValidIncreaseComment('My research did not reveal any prior sales or transfers of the subject property')).toBe(false);
        expect(hasValidIncreaseComment('No prior sales')).toBe(false);
        expect(hasValidIncreaseComment('Subject property underwent complete luxury remodel explaining value increase')).toBe(true);

        const dataWithGenericComment = {
            'as of': '11/12/2026',
            Subject: {
                'Date of Prior Sale/Transfer': '05/30/2026',
                'Price of Prior Sale/Transfer': '$500,000'
            },
            'Analysis of prior sale or transfer history of the subject property and comparable sales':
                'My research did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal'
        };
        expect(extractIncreaseComment(dataWithGenericComment)).toBe('');

        const dataWithRenovationComment = {
            ...dataWithGenericComment,
            RECONCILIATION: {
                'Comment on Increase in Value': 'Property remodeled with new HVAC and kitchen.'
            }
        };
        expect(extractIncreaseComment(dataWithRenovationComment)).toBe('Property remodeled with new HVAC and kitchen.');
    });
});
