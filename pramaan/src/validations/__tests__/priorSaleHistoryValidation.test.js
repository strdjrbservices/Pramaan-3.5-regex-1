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

