import { checkDisallowedPhrases, checkNotBlank, checkPhysicalDeficiencies, checkAssignmentTypeConsistency } from '../generalValidation';

describe('generalValidation - checkDisallowedPhrases', () => {
    test('returns null for undefined, null, or empty values', () => {
        expect(checkDisallowedPhrases('Comments', undefined)).toBeNull();
        expect(checkDisallowedPhrases('Comments', null)).toBeNull();
        expect(checkDisallowedPhrases('Comments', '')).toBeNull();
        expect(checkDisallowedPhrases('Comments', '   ')).toBeNull();
    });

    test('returns null for valid normal appraisal values', () => {
        expect(checkDisallowedPhrases('Legal Description', 'Lot 4 Block B Sunset Addition')).toBeNull();
        expect(checkDisallowedPhrases('Car Storage', 'Attached 2 Car Garage')).toBeNull();
        expect(checkDisallowedPhrases('Property Type', 'Detached Single Family')).toBeNull();
        expect(checkDisallowedPhrases('Occupant', 'Owner')).toBeNull();
        expect(checkDisallowedPhrases('Price', 250000)).toBeNull();
    });

    test('flags "SEE ATTACHED ADDENDUN" (with typo N) as invalid error', () => {
        const result = checkDisallowedPhrases('Legal Description', 'SEE ATTACHED ADDENDUN');
        expect(result).toEqual({
            isError: true,
            skipBlankFilter: true,
            message: "'Legal Description' cannot contain 'SEE ATTACHED ADDENDUN'. Specific details must be provided."
        });

        // Case insensitivity
        const lower = checkDisallowedPhrases('Legal Description', 'see attached addendun');
        expect(lower).not.toBeNull();
        expect(lower.isError).toBe(true);
        expect(lower.message).toContain('SEE ATTACHED ADDENDUN');

        // Extra whitespace
        const spaces = checkDisallowedPhrases('Notes', '  SEE   ATTACHED   ADDENDUN  ');
        expect(spaces).not.toBeNull();
        expect(spaces.isError).toBe(true);
    });

    test('flags "SEE ATTACHED ADDENDUM" (with M) as invalid error', () => {
        const result = checkDisallowedPhrases('Map Reference', 'SEE ATTACHED ADDENDUM');
        expect(result).toEqual({
            isError: true,
            skipBlankFilter: true,
            message: "'Map Reference' cannot contain 'SEE ATTACHED ADDENDUM'. Specific details must be provided."
        });

        const mixed = checkDisallowedPhrases('Comments', 'See Attached Addendum for details');
        expect(mixed).not.toBeNull();
        expect(mixed.isError).toBe(true);
        expect(mixed.message).toContain('SEE ATTACHED ADDENDUM');
    });

    test('flags "SEE PLAT MAP" as invalid error', () => {
        const result = checkDisallowedPhrases('Map Reference', 'SEE PLAT MAP');
        expect(result).toEqual({
            isError: true,
            skipBlankFilter: true,
            message: "'Map Reference' cannot contain 'SEE PLAT MAP'. Specific details must be provided."
        });

        const lower = checkDisallowedPhrases('Site', 'see plat map');
        expect(lower).not.toBeNull();
        expect(lower.isError).toBe(true);

        const platmap = checkDisallowedPhrases('Site', 'SEE PLATMAP');
        expect(platmap).not.toBeNull();
        expect(platmap.isError).toBe(true);
    });

    test('flags "SEE ATTACHED" and "SEE ATTACHED " as invalid error', () => {
        const result1 = checkDisallowedPhrases('Comments', 'SEE ATTACHED ');
        expect(result1).toEqual({
            isError: true,
            skipBlankFilter: true,
            message: "'Comments' cannot contain 'SEE ATTACHED'. Specific details must be provided."
        });

        const result2 = checkDisallowedPhrases('Comments', 'SEE ATTACHED');
        expect(result2).toEqual({
            isError: true,
            skipBlankFilter: true,
            message: "'Comments' cannot contain 'SEE ATTACHED'. Specific details must be provided."
        });

        const result3 = checkDisallowedPhrases('Comments', 'see attached exhibit');
        expect(result3).not.toBeNull();
        expect(result3.isError).toBe(true);
        expect(result3.message).toContain('SEE ATTACHED');
    });

    test('handles object structures with value and comment properties', () => {
        const objVal = { value: 'SEE ATTACHED', comment: '' };
        const resVal = checkDisallowedPhrases('Neighborhood', objVal);
        expect(resVal).not.toBeNull();
        expect(resVal.isError).toBe(true);

        const objComm = { value: 'N/A', comment: 'See attached addendum' };
        const resComm = checkDisallowedPhrases('Neighborhood', objComm);
        expect(resComm).not.toBeNull();
        expect(resComm.isError).toBe(true);
        expect(resComm.message).toContain('SEE ATTACHED ADDENDUM');
    });

    test('handles array of values', () => {
        const arr = ['Valid info', 'SEE PLAT MAP'];
        const res = checkDisallowedPhrases('Site', arr);
        expect(res).not.toBeNull();
        expect(res.isError).toBe(true);
        expect(res.message).toContain('SEE PLAT MAP');
    });

    test('defaults field name to Field if not supplied', () => {
        const res = checkDisallowedPhrases(null, 'SEE ATTACHED');
        expect(res.message).toBe("'Field' cannot contain 'SEE ATTACHED'. Specific details must be provided.");
    });
});
