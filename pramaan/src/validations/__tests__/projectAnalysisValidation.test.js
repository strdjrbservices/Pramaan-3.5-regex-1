import { checkProjectAnalysisFieldsNotBlank, PROJECT_ANALYSIS_FIELDS_TO_CHECK } from '../projectAnalysisValidation';

describe('projectAnalysisValidation - checkProjectAnalysisFieldsNotBlank', () => {
    test('returns error with skipBlankFilter: true when a project analysis field is empty or blank', () => {
        const fieldsToTest = [
            "I did did not analyze the condominium project budget for the current year. Explain the results of the analysis of the budget (adequacy of fees, reserves, etc.), or why the analysis was not performed.",
            "Are there any other fees (other than regular HOA charges) for the use of the project facilities?",
            "If Yes, report the charges and describe.",
            "Compared to other competitive projects of similar quality and design, the subject unit charge appears",
            "If High or Low, describe",
            "Are there any special or unusual characteristics of the project (based on the condominium documents, HOA meetings, or other information) known to the appraiser?",
            "If Yes, describe and explain the effect on value and marketability."
        ];

        fieldsToTest.forEach(field => {
            const blankRes = checkProjectAnalysisFieldsNotBlank(field, '');
            expect(blankRes).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: `'${field}' must not be blank.`
            });

            const nullRes = checkProjectAnalysisFieldsNotBlank(field, null);
            expect(nullRes).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: `'${field}' must not be blank.`
            });

            const whitespaceRes = checkProjectAnalysisFieldsNotBlank(field, '   ');
            expect(whitespaceRes).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: `'${field}' must not be blank.`
            });
        });
    });

    test('returns isMatch: true when a project analysis field has a valid value', () => {
        const budgetRes = checkProjectAnalysisFieldsNotBlank(
            "I did did not analyze the condominium project budget for the current year. Explain the results of the analysis of the budget (adequacy of fees, reserves, etc.), or why the analysis was not performed.",
            "Budget was analyzed and found adequate with sufficient reserves."
        );
        expect(budgetRes).toEqual({
            isMatch: true,
            message: 'Validation successful!'
        });

        const feeRes = checkProjectAnalysisFieldsNotBlank(
            "Are there any other fees (other than regular HOA charges) for the use of the project facilities?",
            "No"
        );
        expect(feeRes).toEqual({
            isMatch: true,
            message: 'Validation successful!'
        });
    });

    test('matches field names case-insensitively and handles whitespace differences', () => {
        const lowerRes = checkProjectAnalysisFieldsNotBlank('if high or low, describe', '');
        expect(lowerRes).toEqual({
            isError: true,
            skipBlankFilter: true,
            message: "'if high or low, describe' must not be blank."
        });

        const upperRes = checkProjectAnalysisFieldsNotBlank('IF HIGH OR LOW, DESCRIBE', 'Appropriate for market');
        expect(upperRes).toEqual({
            isMatch: true,
            message: 'Validation successful!'
        });
    });

    test('returns null for unrelated fields', () => {
        expect(checkProjectAnalysisFieldsNotBlank('Unrelated Field', '')).toBeNull();
        expect(checkProjectAnalysisFieldsNotBlank('Unrelated Field', 'Some Value')).toBeNull();
    });
});

