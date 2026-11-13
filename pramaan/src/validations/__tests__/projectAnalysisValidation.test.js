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

describe('projectAnalysisValidation - Condo Project Analysis Conditional Question Validations', () => {
    test('1. Other Fees: if Yes, description required; if No, optional', () => {
        const qField = "Are there any other fees (other than regular HOA charges) for the use of the project facilities?";
        const cField = "If Yes, report the charges and describe.";

        // When question is Yes and comment is empty -> error
        const dataYes = { [qField]: 'Yes' };
        const errRes = checkProjectAnalysisFieldsNotBlank(cField, '', dataYes);
        expect(errRes.isError).toBe(true);
        expect(errRes.skipBlankFilter).toBe(true);
        expect(errRes.message).toContain('is required when');

        // When question is Yes and comment is filled -> valid
        const validRes = checkProjectAnalysisFieldsNotBlank(cField, '$50/mo parking fee', dataYes);
        expect(validRes.isMatch).toBe(true);

        // When question is No and comment is empty -> null (clean/optional)
        const dataNo = { [qField]: 'No' };
        const optionalRes = checkProjectAnalysisFieldsNotBlank(cField, '', dataNo);
        expect(optionalRes).toBeNull();

        // When question is No and comment is filled -> valid
        const filledNoRes = checkProjectAnalysisFieldsNotBlank(cField, 'None', dataNo);
        expect(filledNoRes.isMatch).toBe(true);
    });

    test('2. Subject Unit Charge: if High or Low, description required; if Average, optional', () => {
        const qField = "Compared to other competitive projects of similar quality and design, the subject unit charge appears";
        const cField = "If High or Low, describe";

        // When question is High and comment is empty -> error
        const dataHigh = { [qField]: 'High' };
        const highErr = checkProjectAnalysisFieldsNotBlank(cField, '', dataHigh);
        expect(highErr.isError).toBe(true);
        expect(highErr.skipBlankFilter).toBe(true);
        expect(highErr.message).toContain('is required when');

        // When question is Low and comment is empty -> error
        const dataLow = { [qField]: 'Low' };
        const lowErr = checkProjectAnalysisFieldsNotBlank(cField, '', dataLow);
        expect(lowErr.isError).toBe(true);
        expect(lowErr.skipBlankFilter).toBe(true);

        // When question is High and comment is filled -> valid
        const highValid = checkProjectAnalysisFieldsNotBlank(cField, 'Higher due to luxury amenities & 24hr concierge', dataHigh);
        expect(highValid.isMatch).toBe(true);

        // When question is Average and comment is empty -> null (clean/optional)
        const dataAvg = { [qField]: 'Average' };
        const avgRes = checkProjectAnalysisFieldsNotBlank(cField, '', dataAvg);
        expect(avgRes).toBeNull();

        // When question is Average and comment is filled -> valid
        const avgFilled = checkProjectAnalysisFieldsNotBlank(cField, 'Appropriate for market', dataAvg);
        expect(avgFilled.isMatch).toBe(true);
    });

    test('3. Special or Unusual Characteristics: if Yes, description required; if No, optional', () => {
        const qField = "Are there any special or unusual characteristics of the project (based on the condominium documents, HOA meetings, or other information) known to the appraiser?";
        const cField = "If Yes, describe and explain the effect on value and marketability.";

        // When question is Yes and comment is empty -> error
        const dataYes = { [qField]: 'Yes' };
        const errRes = checkProjectAnalysisFieldsNotBlank(cField, '', dataYes);
        expect(errRes.isError).toBe(true);
        expect(errRes.skipBlankFilter).toBe(true);
        expect(errRes.message).toContain('is required when');

        // When question is Yes and comment is filled -> valid
        const validRes = checkProjectAnalysisFieldsNotBlank(cField, 'Special assessment planned for roof replacement', dataYes);
        expect(validRes.isMatch).toBe(true);

        // When question is No and comment is empty -> null (clean/optional)
        const dataNo = { [qField]: 'No' };
        const optionalRes = checkProjectAnalysisFieldsNotBlank(cField, '', dataNo);
        expect(optionalRes).toBeNull();

        // When question is No and comment is filled -> valid
        const filledNoRes = checkProjectAnalysisFieldsNotBlank(cField, 'N/A', dataNo);
        expect(filledNoRes.isMatch).toBe(true);
    });

    test('Question field validation checks that comment is filled when answered with trigger answer', () => {
        const qField = "Are there any other fees (other than regular HOA charges) for the use of the project facilities?";
        const cField = "If Yes, report the charges and describe.";

        // Question is Yes, but comment is missing from allData -> error on question
        const dataMissingComment = { [qField]: 'Yes', [cField]: '' };
        const res = checkProjectAnalysisFieldsNotBlank(qField, 'Yes', dataMissingComment);
        expect(res.isError).toBe(true);
        expect(res.message).toContain('required when');

        // Question is Yes, and comment is provided in allData -> valid
        const dataWithComment = { [qField]: 'Yes', [cField]: 'Pool fee $20/mo' };
        const resValid = checkProjectAnalysisFieldsNotBlank(qField, 'Yes', dataWithComment);
        expect(resValid.isMatch).toBe(true);

        // Question is No -> valid without comment
        const dataNo = { [qField]: 'No', [cField]: '' };
        const resNo = checkProjectAnalysisFieldsNotBlank(qField, 'No', dataNo);
        expect(resNo.isMatch).toBe(true);
    });
});

