import {
    checkProjectInfoFieldsNotBlank,
    checkProjectAndPropertyCondition,
    checkProjectUnitsConsistency,
    checkProjectUnitsBreakdownSum,
    checkCondoConditionalQuestionPair,
    findCondoConditionalConfig,
    isAnswerAffirmative,
    isAnswerNegative,
    extractConditionRating,
    PROJECT_INFO_FIELDS_TO_CHECK
} from '../form1073Validation';

describe('form1073Validation - checkProjectInfoFieldsNotBlank', () => {
    test('returns error with skipBlankFilter: true when a project info field is empty or blank', () => {
        const fieldsToTest = [
            'Data source(s) for project information',
            'Project Description',
            '# of Stories',
            '# of Elevators',
            'Existing/Proposed/Under Const.',
            'Year Built',
            'Effective Age',
            'Exterior Walls',
            'Roof Surface',
            'Total # Parking',
            'Ratio (spaces/units)',
            'Type',
            'Guest Parking',
            '# of Units',
            '# of Units Completed',
            '# of Units For Sale',
            '# of Units Sold',
            '# of Units Rented',
            '# of Owner Occupied Units',
            '# of Phases',
            '# of Planned Phases',
            '# of Planned Units',
            '# of Planned Units for Sale',
            '# of Planned Units Sold',
            '# of Planned Units Rented',
            '# of Planned Owner Occupied Units',
            'Project Primary Occupancy',
            "Is the developer/builder in control of the Homeowners' Association (HOA)?",
            'Management Group',
            'Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project?',
            'Was the project created by the conversion of existing building(s) into a condominium?',
            'Was the project created by the conversion of existing building(s) into a condominium? If Yes,describe the original use and date of conversion',
            'Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)?',
            'If No, describe',
            'Is there any commercial space in the project?',
            'If Yes, describe and indicate the overall percentage of the commercial space.',
            'Describe the condition of the project and quality of construction.',
            'Describe the common elements and recreational facilities.',
            'Are any common elements leased to or by the Homeowners\' Association?',
            'If Yes, describe the rental terms and options.',
            'Is the project subject to a ground rent?',
            'If Yes, $ per year (describe terms and conditions)',
            'Are the parking facilities adequate for the project size and type?',
            'If No, describe and comment on the effect on value and marketability.'
        ];

        fieldsToTest.forEach(field => {
            const blankRes = checkProjectInfoFieldsNotBlank(field, '');
            expect(blankRes).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: `'${field}' must not be blank.`
            });

            const nullRes = checkProjectInfoFieldsNotBlank(field, null);
            expect(nullRes).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: `'${field}' must not be blank.`
            });

            const whitespaceRes = checkProjectInfoFieldsNotBlank(field, '   ');
            expect(whitespaceRes).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: `'${field}' must not be blank.`
            });
        });
    });

    test('returns isMatch: true when a project info field has a valid value', () => {
        const result = checkProjectInfoFieldsNotBlank('Project Description', 'Mid-rise condo');
        expect(result).toEqual({
            isMatch: true,
            message: 'Validation successful!'
        });

        const numResult = checkProjectInfoFieldsNotBlank('# of Stories', '4');
        expect(numResult).toEqual({
            isMatch: true,
            message: 'Validation successful!'
        });

        const statusResult = checkProjectInfoFieldsNotBlank('Existing/Proposed/Under Const.', 'Existing');
        expect(statusResult).toEqual({
            isMatch: true,
            message: 'Validation successful!'
        });
    });

    test('matches field names case-insensitively', () => {
        const lowerRes = checkProjectInfoFieldsNotBlank('project description', '');
        expect(lowerRes).toEqual({
            isError: true,
            skipBlankFilter: true,
            message: "'project description' must not be blank."
        });

        const upperRes = checkProjectInfoFieldsNotBlank('TYPE', '');
        expect(upperRes).toEqual({
            isError: true,
            skipBlankFilter: true,
            message: "'TYPE' must not be blank."
        });

        const validUpper = checkProjectInfoFieldsNotBlank('TYPE', 'Detached');
        expect(validUpper).toEqual({
            isMatch: true,
            message: 'Validation successful!'
        });
    });

    test('returns null for fields not in Project Information', () => {
        expect(checkProjectInfoFieldsNotBlank('Some Nonexistent Field', '')).toBeNull();
        expect(checkProjectInfoFieldsNotBlank('Some Nonexistent Field', 'Value')).toBeNull();
    });
});

describe('form1073Validation - checkProjectAndPropertyCondition', () => {
    const projectField = "Describe the condition of the project and quality of construction.";
    const propertyField = "Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)";

    test('extractConditionRating accurately extracts condition rating numbers and codes', () => {
        expect(extractConditionRating("The subject's overall quality construction was concluded as C5.")).toEqual({
            ratingCode: 'C5',
            ratingNum: 5
        });
        expect(extractConditionRating("Condition is C4.")).toEqual({
            ratingCode: 'C4',
            ratingNum: 4
        });
        expect(extractConditionRating("C1")).toEqual({
            ratingCode: 'C1',
            ratingNum: 1
        });
        expect(extractConditionRating("C6 deferred maintenance")).toEqual({
            ratingCode: 'C6',
            ratingNum: 6
        });
        expect(extractConditionRating("CBS/STUCCO with average finish")).toBeNull();
        expect(extractConditionRating("")).toBeNull();
    });

    test('validates condition C1 to C5 as acceptable (isMatch: true)', () => {
        ['C1', 'C2', 'C3', 'C4', 'C5'].forEach(code => {
            const res = checkProjectAndPropertyCondition(
                projectField,
                `The subject's overall quality construction was concluded as ${code}.`,
                {}
            );
            expect(res).not.toBeNull();
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeUndefined();
        });
    });

    test('fails when condition is greater than C5 (e.g. C6)', () => {
        const res = checkProjectAndPropertyCondition(
            projectField,
            "The subject's overall quality construction was concluded as C6.",
            {}
        );
        expect(res).toEqual({
            isError: true,
            message: "Condition must not be greater than C5. Found 'C6'."
        });

        const propRes = checkProjectAndPropertyCondition(
            propertyField,
            "Property condition is C6 due to extensive structural damage.",
            {}
        );
        expect(propRes).toEqual({
            isError: true,
            message: "Condition must not be greater than C5. Found 'C6'."
        });
    });

    test('validates successfully when Project and Property conditions match (e.g. both C5)', () => {
        const allData = {
            [projectField]: "The subject's overall quality construction was concluded as C5.",
            [propertyField]: "The subject property condition is concluded as C5."
        };

        const projRes = checkProjectAndPropertyCondition(
            projectField,
            allData[projectField],
            allData
        );
        expect(projRes).toEqual({
            isMatch: true,
            message: "Condition 'C5' validated successfully."
        });

        const propRes = checkProjectAndPropertyCondition(
            propertyField,
            allData[propertyField],
            allData
        );
        expect(propRes).toEqual({
            isMatch: true,
            message: "Condition 'C5' validated successfully."
        });
    });

    test('fails with mismatch error when Project and Property conditions differ (e.g. C5 vs C4)', () => {
        const allData = {
            [projectField]: "The subject's overall quality construction was concluded as C5.",
            [propertyField]: "The subject property condition is concluded as C4."
        };

        const projRes = checkProjectAndPropertyCondition(
            projectField,
            allData[projectField],
            allData
        );
        expect(projRes).toEqual({
            isError: true,
            message: "Condition mismatch: Project condition (C5) and Property condition (C4) must contain the same condition (C1 to C5)."
        });

        const propRes = checkProjectAndPropertyCondition(
            propertyField,
            allData[propertyField],
            allData
        );
        expect(propRes).toEqual({
            isError: true,
            message: "Condition mismatch: Property condition (C4) and Project condition (C5) must contain the same condition (C1 to C5)."
        });
    });

    test('fails when no C1-C5 rating is found in text', () => {
        const res = checkProjectAndPropertyCondition(
            projectField,
            "Construction is average quality with no specific rating.",
            {}
        );
        expect(res).toEqual({
            isError: true,
            message: "Condition rating (C1-C5) not found in description."
        });
    });

    test('returns blank error when value is empty', () => {
        const res = checkProjectAndPropertyCondition(projectField, '', {});
        expect(res).toEqual({
            isError: true,
            skipBlankFilter: true,
            message: `'${projectField}' must not be blank.`
        });
    });

    test('returns null for unrelated fields', () => {
        expect(checkProjectAndPropertyCondition("Project Description", "Garden", {})).toBeNull();
    });
});

describe('form1073Validation - checkProjectUnitsConsistency', () => {
    test('passes when # of Units matches # of Units Completed and If Project Completed', () => {
        const allData = {
            '# of Units': '118',
            '# of Units Completed': '118',
            '# of Units (Project Completed)': '118'
        };

        const res1 = checkProjectUnitsConsistency('# of Units', '118', allData);
        expect(res1.isMatch).toBe(true);
        expect(res1.message).toContain("matches '# of Units Completed'");

        const res2 = checkProjectUnitsConsistency('# of Units Completed', '118', allData);
        expect(res2.isMatch).toBe(true);
    });

    test('fails when # of Units does not match # of Units Completed', () => {
        const allData = {
            '# of Units': '118',
            '# of Units Completed': '110'
        };

        const res = checkProjectUnitsConsistency('# of Units', '118', allData);
        expect(res.isError).toBe(true);
        expect(res.message).toBe("'# of Units' (118) does not match '# of Units Completed' (110).");
    });

    test('fails when # of Units does not match # of Units in If Project Completed', () => {
        const allData = {
            '# of Units': '118',
            '# of Units Completed': '118',
            '# of Units (Project Completed)': '125'
        };

        const res = checkProjectUnitsConsistency('# of Units', '118', allData);
        expect(res.isError).toBe(true);
        expect(res.message).toBe("'# of Units' (118) does not match '# of Units' in If Project Completed (125).");
    });
});

describe('form1073Validation - checkProjectUnitsBreakdownSum', () => {
    test('passes when # of Units For Sale + # of Units Rented + # of Owner Occupied Units === # of Units', () => {
        const allData = {
            '# of Units': '118',
            '# of Units For Sale': '2',
            '# of Units Rented': '8',
            '# of Owner Occupied Units': '108'
        };

        const res = checkProjectUnitsBreakdownSum('# of Units', '118', allData);
        expect(res.isMatch).toBe(true);
        expect(res.message).toContain("= 118 ('# of Units')");

        const resForSale = checkProjectUnitsBreakdownSum('# of Units For Sale', '2', allData);
        expect(resForSale.isMatch).toBe(true);
    });

    test('fails when the sum does not equal # of Units', () => {
        const allData = {
            '# of Units': '118',
            '# of Units For Sale': '5',
            '# of Units Rented': '8',
            '# of Owner Occupied Units': '108'
        };

        const res = checkProjectUnitsBreakdownSum('# of Units', '118', allData);
        expect(res.isError).toBe(true);
        expect(res.message).toBe("Units sum mismatch: '# of Units For Sale' (5) + '# of Units Rented' (8) + '# of Owner Occupied Units' (108) = 121, which must equal '# of Units' (118).");
    });

    test('works with lowercase # of Units for Sale in project completed context', () => {
        const allData = {
            '# of Units (Project Completed)': '118',
            '# of Units for Sale': '2',
            '# of Units Rented': '8',
            '# of Owner Occupied Units': '108'
        };

        const res = checkProjectUnitsBreakdownSum('# of Units for Sale', '2', allData);
        expect(res.isMatch).toBe(true);
    });
});

describe('form1073Validation - checkProjectInfoFieldsNotBlank integration', () => {
    test('validates units consistency and breakdown sum on # of Units', () => {
        const validData = {
            '# of Units': '118',
            '# of Units Completed': '118',
            '# of Units (Project Completed)': '118',
            '# of Units For Sale': '2',
            '# of Units Rented': '8',
            '# of Owner Occupied Units': '108'
        };
        const res = checkProjectInfoFieldsNotBlank('# of Units', '118', validData);
        expect(res.isMatch).toBe(true);

        const invalidSumData = {
            ...validData,
            '# of Units For Sale': '10'
        };
        const sumErr = checkProjectInfoFieldsNotBlank('# of Units', '118', invalidSumData);
        expect(sumErr.isError).toBe(true);
        expect(sumErr.message).toContain('Units sum mismatch');
    });
});

describe('form1073Validation - Condo Project Information Conditional Question Validations', () => {
    test('1. 10% Ownership: if Yes, comment required; if No, comment optional', () => {
        const qField = "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project?";
        const cField = "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project? If Yes, describe";

        // When question is Yes and comment is empty -> error
        const dataYes = { [qField]: 'Yes' };
        const errRes = checkProjectInfoFieldsNotBlank(cField, '', dataYes);
        expect(errRes.isError).toBe(true);
        expect(errRes.skipBlankFilter).toBe(true);
        expect(errRes.message).toContain('is required when');

        // When question is Yes and comment is filled -> valid
        const validRes = checkProjectInfoFieldsNotBlank(cField, 'ABC Holdings LLC owns 15 units', dataYes);
        expect(validRes.isMatch).toBe(true);

        // When question is No and comment is empty -> null (clean/optional)
        const dataNo = { [qField]: 'No' };
        const optionalRes = checkProjectInfoFieldsNotBlank(cField, '', dataNo);
        expect(optionalRes).toBeNull();

        // When question is No and comment is filled -> valid
        const filledNoRes = checkProjectInfoFieldsNotBlank(cField, 'N/A', dataNo);
        expect(filledNoRes.isMatch).toBe(true);
    });

    test('2. Condo Conversion: if Yes, description required; if No, optional', () => {
        const qField = "Was the project created by the conversion of existing building(s) into a condominium?";
        const cField = "Was the project created by the conversion of existing building(s) into a condominium? If Yes,describe the original use and date of conversion";

        // If Yes and blank -> error
        const dataYes = { [qField]: 'Yes' };
        const errRes = checkProjectInfoFieldsNotBlank(cField, '', dataYes);
        expect(errRes.isError).toBe(true);
        expect(errRes.skipBlankFilter).toBe(true);

        // If Yes and filled -> valid
        const validRes = checkProjectInfoFieldsNotBlank(cField, 'Converted from commercial lofts in 2015', dataYes);
        expect(validRes.isMatch).toBe(true);

        // If No and blank -> null (optional)
        const dataNo = { [qField]: 'No' };
        expect(checkProjectInfoFieldsNotBlank(cField, '', dataNo)).toBeNull();
    });

    test('3. Facilities Complete: if No, description required; if Yes, optional', () => {
        const qField = "Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)?";
        const cField = "If No, describe";

        // If No and blank -> error
        const dataNo = { [qField]: 'No' };
        const errRes = checkProjectInfoFieldsNotBlank(cField, '', dataNo);
        expect(errRes.isError).toBe(true);
        expect(errRes.skipBlankFilter).toBe(true);
        expect(errRes.message).toContain('is required when');

        // If No and filled -> valid
        const validRes = checkProjectInfoFieldsNotBlank(cField, 'Swimming pool under renovation until July', dataNo);
        expect(validRes.isMatch).toBe(true);

        // If Yes and blank -> null (optional)
        const dataYes = { [qField]: 'Yes' };
        expect(checkProjectInfoFieldsNotBlank(cField, '', dataYes)).toBeNull();

        // If Yes and filled (e.g. N/A in screenshot) -> valid
        expect(checkProjectInfoFieldsNotBlank(cField, 'N/A', dataYes).isMatch).toBe(true);
    });

    test('4. Commercial Space: if Yes, description & % required; if No, optional', () => {
        const qField = "Is there any commercial space in the project?";
        const cField = "If Yes, describe and indicate the overall percentage of the commercial space.";

        // If Yes and blank -> error
        const dataYes = { [qField]: 'Yes' };
        const errRes = checkProjectInfoFieldsNotBlank(cField, '', dataYes);
        expect(errRes.isError).toBe(true);
        expect(errRes.skipBlankFilter).toBe(true);

        // If Yes and filled -> valid
        const validRes = checkProjectInfoFieldsNotBlank(cField, 'Retail grocery on ground floor, 8%', dataYes);
        expect(validRes.isMatch).toBe(true);

        // If No and blank -> null (optional)
        const dataNo = { [qField]: 'No' };
        expect(checkProjectInfoFieldsNotBlank(cField, '', dataNo)).toBeNull();
    });

    test('5. Leased Common Elements: if Yes, description of terms required; if No, optional', () => {
        const qField = "Are any common elements leased to or by the Homeowners' Association?";
        const cField = "If Yes, describe the rental terms and options.";

        // If Yes and blank -> error
        const dataYes = { [qField]: 'Yes' };
        const errRes = checkProjectInfoFieldsNotBlank(cField, '', dataYes);
        expect(errRes.isError).toBe(true);
        expect(errRes.skipBlankFilter).toBe(true);

        // If Yes and filled -> valid
        const validRes = checkProjectInfoFieldsNotBlank(cField, 'Antenna lease 10 years at $2,000/mo', dataYes);
        expect(validRes.isMatch).toBe(true);

        // If No and blank -> null (optional)
        const dataNo = { [qField]: 'No' };
        expect(checkProjectInfoFieldsNotBlank(cField, '', dataNo)).toBeNull();
    });

    test('6. Ground Rent: if Yes, $ per year & terms required; if No, optional', () => {
        const qField = "Is the project subject to a ground rent?";
        const cField = "If Yes, $ per year (describe terms and conditions)";

        // If Yes and blank -> error
        const dataYes = { [qField]: 'Yes' };
        const errRes = checkProjectInfoFieldsNotBlank(cField, '', dataYes);
        expect(errRes.isError).toBe(true);
        expect(errRes.skipBlankFilter).toBe(true);

        // If Yes and filled -> valid
        const validRes = checkProjectInfoFieldsNotBlank(cField, '$450/year 99-year ground lease expires 2085', dataYes);
        expect(validRes.isMatch).toBe(true);

        // If No and blank -> null (optional)
        const dataNo = { [qField]: 'No' };
        expect(checkProjectInfoFieldsNotBlank(cField, '', dataNo)).toBeNull();
    });

    test('7. Adequate Parking: if No, description & effect required; if Yes, optional', () => {
        const qField = "Are the parking facilities adequate for the project size and type?";
        const cField = "If No, describe and comment on the effect on value and marketability.";

        // If No and blank -> error
        const dataNo = { [qField]: 'No' };
        const errRes = checkProjectInfoFieldsNotBlank(cField, '', dataNo);
        expect(errRes.isError).toBe(true);
        expect(errRes.skipBlankFilter).toBe(true);

        // If No and filled -> valid
        const validRes = checkProjectInfoFieldsNotBlank(cField, '0.5 space/unit causes parking congestion, negatively impacting value', dataNo);
        expect(validRes.isMatch).toBe(true);

        // If Yes and blank -> null (optional)
        const dataYes = { [qField]: 'Yes' };
        expect(checkProjectInfoFieldsNotBlank(cField, '', dataYes)).toBeNull();
    });

    test('Question field validation checks that comment is filled when answered with trigger answer', () => {
        const qField = "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project?";
        const cField = "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project? If Yes, describe";

        // Question is Yes, but comment is missing from allData -> error on question
        const dataMissingComment = { [qField]: 'Yes', [cField]: '' };
        const res = checkProjectInfoFieldsNotBlank(qField, 'Yes', dataMissingComment);
        expect(res.isError).toBe(true);
        expect(res.message).toContain('required when');

        // Question is Yes, and comment is provided in allData -> valid
        const dataWithComment = { [qField]: 'Yes', [cField]: 'Owns 12 units' };
        const resValid = checkProjectInfoFieldsNotBlank(qField, 'Yes', dataWithComment);
        expect(resValid.isMatch).toBe(true);

        // Question is No -> valid without comment
        const dataNo = { [qField]: 'No', [cField]: '' };
        const resNo = checkProjectInfoFieldsNotBlank(qField, 'No', dataNo);
        expect(resNo.isMatch).toBe(true);
    });
});

