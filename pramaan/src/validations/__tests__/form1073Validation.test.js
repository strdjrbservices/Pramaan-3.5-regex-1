import { checkProjectInfoFieldsNotBlank, PROJECT_INFO_FIELDS_TO_CHECK } from '../form1073Validation';

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

