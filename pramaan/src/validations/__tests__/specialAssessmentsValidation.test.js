import { checkSpecialAssessments } from '../subjectValidation';

describe('checkSpecialAssessments', () => {
    test('returns null for unrelated fields', () => {
        expect(checkSpecialAssessments('Tax Year', '100')).toBeNull();
        expect(checkSpecialAssessments('R.E. Taxes $', '0')).toBeNull();
    });

    test('accepts various field name representations', () => {
        const fields = [
            'Special Assessments $',
            'Special Assessments',
            'Special Assessment',
            'Special Assessment $',
            'special assessment',
            'special assessments',
            'special assessments $'
        ];
        fields.forEach(f => {
            const res = checkSpecialAssessments(f, '0');
            expect(res).toEqual({ isMatch: true });
        });
    });

    test('validates successfully when value is 0 or equivalent (not more than 0)', () => {
        const validValues = ['0', '$0', '0.00', '$0.00', '', null, undefined, 'None', 'NONE', 'N/A', 'n/a', 'na', 'No', 'no'];
        validValues.forEach(val => {
            const res = checkSpecialAssessments('Special Assessments $', val);
            expect(res).toEqual({ isMatch: true });
        });
    });

    test('returns error when value is more than 0', () => {
        const invalidValues = ['1', '$1', '0.01', '$50', '100', '1,200', '$1,200.50', 'yes', 'Yes', 'TRUE'];
        invalidValues.forEach(val => {
            const res = checkSpecialAssessments('Special Assessments $', val);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('must not be more than 0');
        });
    });

    test('returns error when value is negative', () => {
        const res = checkSpecialAssessments('Special Assessments $', '-10');
        expect(res.isError).toBe(true);
        expect(res.message).toContain('must be at least 0');
    });

    test('returns error for invalid non-numeric text', () => {
        const res = checkSpecialAssessments('Special Assessments $', 'abc');
        expect(res.isError).toBe(true);
        expect(res.message).toContain('must only contain numbers and currency symbols');
    });
});
