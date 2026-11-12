import {
    checkProjectInfoFieldsNotBlank,
    checkProjectAndPropertyCondition,
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

