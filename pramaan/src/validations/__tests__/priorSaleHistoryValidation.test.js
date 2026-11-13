import { checkPriorSaleHistoryFieldsNotBlank, PRIOR_SALE_HISTORY_FIELDS_TO_CHECK } from '../priorSaleHistoryValidation';

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
});

