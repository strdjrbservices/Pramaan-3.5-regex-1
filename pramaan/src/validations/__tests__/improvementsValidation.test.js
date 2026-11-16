import { checkBasementDetails, checkFoundationType, getFoundationStatus, checkExistingProposedUnderConst, checkEffectiveAge } from '../improvementsValidation';
import { getReconAsOfYear, getYearBuiltFromImprovements, getSubjectExpectedActualAge, checkSubjectAgeConsistency } from '../salesComparisonValidation';

describe('Improvements Validation - Foundation & Basement Area', () => {
    describe('getFoundationStatus', () => {
        test('detects Full Basement from flags or string', () => {
            expect(getFoundationStatus({ 'Full Basement': 'Yes' }).hasFullBasement).toBe(true);
            expect(getFoundationStatus({ 'Foundation Type': 'Full Basement' }).hasFullBasement).toBe(true);
            expect(getFoundationStatus({ 'Foundation': 'Basement' }).hasFullBasement).toBe(true);
        });

        test('detects Partial Basement from flags or string', () => {
            expect(getFoundationStatus({ 'Partial Basement': 'Yes' }).hasPartialBasement).toBe(true);
            expect(getFoundationStatus({ 'Foundation Type': 'Partial Basement' }).hasPartialBasement).toBe(true);
        });

        test('detects Concrete Slab and Crawl Space', () => {
            expect(getFoundationStatus({ 'Concrete Slab': 'Yes' }).hasConcreteSlab).toBe(true);
            expect(getFoundationStatus({ 'Foundation': 'Concrete Slab' }).hasConcreteSlab).toBe(true);
            expect(getFoundationStatus({ 'Crawl Space': 'Yes' }).hasCrawlSpace).toBe(true);
            expect(getFoundationStatus({ 'Foundation': 'Crawl Space' }).hasCrawlSpace).toBe(true);
        });
    });

    describe('checkBasementDetails - Full Basement / Partial Basement', () => {
        test('passes when Full Basement is selected and Basement Area > 1', () => {
            const data = { 'Foundation Type': 'Full Basement' };
            const res = checkBasementDetails('Basement Area sq.ft.', '1,968', data);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();

            const res2 = checkBasementDetails('Basement Area', '806', data);
            expect(res2.isMatch).toBe(true);
        });

        test('passes when Partial Basement is selected and Basement Area > 1', () => {
            const data = { 'Partial Basement': 'Yes' };
            const res = checkBasementDetails('Basement Area sq.ft.', '500', data);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
        });

        test('fails when Full Basement is selected and Basement Area <= 1 or empty', () => {
            const data = { 'Foundation Type': 'Full Basement' };
            
            const resZero = checkBasementDetails('Basement Area sq.ft.', '0', data);
            expect(resZero.isError).toBe(true);
            expect(resZero.message).toContain("must be greater than 1");

            const resOne = checkBasementDetails('Basement Area', '1', data);
            expect(resOne.isError).toBe(true);
            expect(resOne.message).toContain("must be greater than 1");

            const resEmpty = checkBasementDetails('Basement Area sq.ft.', '', data);
            expect(resEmpty.isError).toBe(true);
            expect(resEmpty.message).toContain("must be greater than 1");
        });

        test('fails when Partial Basement is selected and Basement Area <= 1 or empty', () => {
            const data = { 'Foundation': 'Partial Basement' };
            
            const resZero = checkBasementDetails('Basement Area sq.ft.', '0', data);
            expect(resZero.isError).toBe(true);
            expect(resZero.message).toContain("must be greater than 1");

            const resEmpty = checkBasementDetails('Basement Area', '', data);
            expect(resEmpty.isError).toBe(true);
            expect(resEmpty.message).toContain("must be greater than 1");
        });

        test('fails when both Full Basement and Partial Basement are selected', () => {
            const data = { 'Full Basement': 'Yes', 'Partial Basement': 'Yes' };
            const res = checkBasementDetails('Basement Area sq.ft.', '1,000', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("Only one of 'Full Basement' or 'Partial Basement' can be selected");
        });
    });

    describe('checkBasementDetails - Concrete Slab / Crawl Space', () => {
        test("passes when Concrete Slab is selected and Basement Area is '0'", () => {
            const data = { 'Foundation Type': 'Concrete Slab' };
            const res = checkBasementDetails('Basement Area sq.ft.', '0', data);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();

            const res2 = checkBasementDetails('Basement Area', '0 sq.ft.', data);
            expect(res2.isMatch).toBe(true);
        });

        test("passes when Crawl Space is selected and Basement Area is '0'", () => {
            const data = { 'Foundation Type': 'Crawl Space' };
            const res = checkBasementDetails('Basement Area sq.ft.', '0', data);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
        });

        test("fails when Concrete Slab is selected and Basement Area is not '0'", () => {
            const data = { 'Foundation Type': 'Concrete Slab' };
            const res = checkBasementDetails('Basement Area sq.ft.', '500', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("must be '0' when Concrete Slab or Crawl Space is selected");

            const resEmpty = checkBasementDetails('Basement Area', '', data);
            expect(resEmpty.isError).toBe(true);
            expect(resEmpty.message).toContain("must be '0' when Concrete Slab or Crawl Space is selected");
        });

        test("fails when Crawl Space is selected and Basement Area is not '0'", () => {
            const data = { 'Foundation': 'Crawl Space' };
            const res = checkBasementDetails('Basement Area sq.ft.', '1,200', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("must be '0' when Concrete Slab or Crawl Space is selected");
        });
    });

    describe('checkFoundationType', () => {
        test('validates Full Basement consistency with Basement Area', () => {
            const dataValid = { 'Basement Area sq.ft.': '1,968' };
            const resValid = checkFoundationType('Foundation Type', 'Full Basement', dataValid);
            expect(resValid.isMatch).toBe(true);

            const dataInvalid = { 'Basement Area sq.ft.': '0' };
            const resInvalid = checkFoundationType('Foundation Type', 'Full Basement', dataInvalid);
            expect(resInvalid.isError).toBe(true);
            expect(resInvalid.message).toContain("must be greater than 1");
        });

        test('validates Concrete Slab consistency with Basement Area', () => {
            const dataValid = { 'Basement Area sq.ft.': '0' };
            const resValid = checkFoundationType('Foundation', 'Concrete Slab', dataValid);
            expect(resValid.isMatch).toBe(true);

            const dataInvalid = { 'Basement Area sq.ft.': '800' };
            const resInvalid = checkFoundationType('Foundation', 'Concrete Slab', dataInvalid);
            expect(resInvalid.isError).toBe(true);
            expect(resInvalid.message).toContain("must be '0'");
        });
    });

    describe('Building Sketch Half Bath regex patterns', () => {
        const halfBathRegex = /(?:^|[\s\b])(?:half[\s-]*(?:bath(?:room)?|ba)|1\/2[\s-]*(?:bath(?:room)?|ba)|0?\.5[\s-]*(?:bath(?:room)?|ba)|(?:bath(?:room)?|ba)\s*(?:\(\s*)?(?:half|1\/2|0?\.5)(?:\s*\))?|powder(?:\s*room)?|lav(?:atory)?|wc)\b/i;

        const testCases = [
            'half bath',
            'Half Bath',
            '1/2 bath',
            '1/2 Bath',
            '0.5 bath',
            '0.5 Bath',
            '1/2Ba',
            '1/2ba',
            '1/2 BA',
            '0.5BA',
            '0.5ba',
            '0.5 Ba',
            '.5 bath',
            '.5ba',
            'half ba',
            'Half-Bath',
            'Bath (1/2)',
            'Bath 1/2',
            'BA 0.5',
            'powder room',
            'lavatory',
            'WC'
        ];

        testCases.forEach(term => {
            test(`matches "${term}" as Half Bath`, () => {
                expect(halfBathRegex.test(term)).toBe(true);
            });
        });
    });

    describe('checkExistingProposedUnderConst - Existing / Under Construction / Proposed', () => {
        test('passes when exactly one valid option is selected: Existing', () => {
            const res = checkExistingProposedUnderConst('Status', 'Existing', { 'Reconciliation Status': 'As Is' });
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
        });

        test('passes when exactly one valid option is selected: Proposed', () => {
            const res = checkExistingProposedUnderConst('Existing/Proposed/Under Const.', 'Proposed', { 'Reconciliation Status': 'Subject to Completion' });
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
        });

        test('passes when exactly one valid option is selected: Under Construction / Under Const.', () => {
            const res = checkExistingProposedUnderConst('Construction Status', 'Under Construction', { 'Reconciliation Status': 'Subject to Repairs' });
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();

            const res2 = checkExistingProposedUnderConst('Status', 'Under Const.', { 'Reconciliation Status': 'Subject to Repairs' });
            expect(res2.isMatch).toBe(true);
        });

        test('fails when blank or empty', () => {
            const res = checkExistingProposedUnderConst('Status', '');
            expect(res.isError).toBe(true);
            expect(res.skipBlankFilter).toBe(true);
            expect(res.message).toBe("One of 'Existing', 'Under Construction', or 'Proposed' must be selected.");
        });

        test('fails when multiple options are selected', () => {
            const res = checkExistingProposedUnderConst('Status', 'Existing, Proposed');
            expect(res.isError).toBe(true);
            expect(res.message).toBe("Only one of 'Existing', 'Under Construction', or 'Proposed' must be selected.");
        });

        test('fails when an invalid option is provided', () => {
            const res = checkExistingProposedUnderConst('Status', 'Unknown Status');
            expect(res.isError).toBe(true);
            expect(res.message).toBe("One of 'Existing', 'Under Construction', or 'Proposed' must be selected.");
        });
    });

    describe('Actual Age and Effective Age Calculations & Validations', () => {
        test('getReconAsOfYear correctly extracts year from reconciliation date', () => {
            expect(getReconAsOfYear({ RECONCILIATION: { 'as of': '11/10/2026' } })).toBe(2026);
            expect(getReconAsOfYear({ RECONCILIATION: { 'as of': '11/10/26' } })).toBe(2026);
            expect(getReconAsOfYear({ RECONCILIATION: { 'as of date': '2026-11-10' } })).toBe(2026);
            expect(getReconAsOfYear({ Reconciliation: { 'as of': 'November 10, 2026' } })).toBe(2026);
            expect(getReconAsOfYear({ 'as of': '11/10/2026' })).toBe(2026);
            expect(getReconAsOfYear({ CERTIFICATION: { 'Effective Date of Appraisal': '10/05/2026' } })).toBe(2026);
        });

        test('getYearBuiltFromImprovements extracts year built', () => {
            expect(getYearBuiltFromImprovements({ IMPROVEMENTS: { 'Year Built': '2000' } })).toBe(2000);
            expect(getYearBuiltFromImprovements({ Improvements: { 'Year Built': '1995 Est' } })).toBe(1995);
            expect(getYearBuiltFromImprovements({ 'Year Built': '2010' })).toBe(2010);
        });

        test('getSubjectExpectedActualAge calculates recon as of DATE minus year built', () => {
            const allData = {
                RECONCILIATION: { 'as of': '11/10/2026' },
                IMPROVEMENTS: { 'Year Built': '2006' }
            };
            expect(getSubjectExpectedActualAge(allData)).toBe(20);
        });

        test('checkSubjectAgeConsistency validates Subject Actual Age matches expected calculation', () => {
            const allData = {
                RECONCILIATION: { 'as of': '11/10/2026' },
                IMPROVEMENTS: { 'Year Built': '2006', 'Effective Age (Yrs)': '15' }
            };

            const passRes = checkSubjectAgeConsistency('Actual Age', '20', allData, ['Subject', 'Actual Age'], 'Subject');
            expect(passRes.isMatch).toBe(true);
            expect(passRes.isError).toBeFalsy();

            const failRes = checkSubjectAgeConsistency('Actual Age', '22', allData, ['Subject', 'Actual Age'], 'Subject');
            expect(failRes.isError).toBe(true);
            expect(failRes.message).toContain('Subject Actual Age (22) in Sales Grid should be 20');
        });

        test('checkSubjectAgeConsistency fails when Effective Age >= Actual Age', () => {
            const allData = {
                RECONCILIATION: { 'as of': '11/10/2026' },
                IMPROVEMENTS: { 'Year Built': '2006', 'Effective Age (Yrs)': '20' }
            };

            const failRes = checkSubjectAgeConsistency('Actual Age', '20', allData, ['Subject', 'Actual Age'], 'Subject');
            expect(failRes.isError).toBe(true);
            expect(failRes.message).toBe('Effective Age (20) must be less than Actual Age (20).');

            const allDataHigher = {
                ...allData,
                IMPROVEMENTS: { 'Year Built': '2006', 'Effective Age (Yrs)': '25' }
            };
            const failResHigher = checkSubjectAgeConsistency('Actual Age', '20', allDataHigher, ['Subject', 'Actual Age'], 'Subject');
            expect(failResHigher.isError).toBe(true);
            expect(failResHigher.message).toBe('Effective Age (25) must be less than Actual Age (20).');
        });

        test('checkEffectiveAge enforces effective age is strictly less than actual age', () => {
            const allData = {
                RECONCILIATION: { 'as of': '11/10/2026' },
                IMPROVEMENTS: { 'Year Built': '2006' }
            };

            const blankRes = checkEffectiveAge('Effective Age (Yrs)', '', allData);
            expect(blankRes.isError).toBe(true);
            expect(blankRes.message).toContain('cannot be blank');

            const passRes = checkEffectiveAge('Effective Age (Yrs)', '15', allData);
            expect(passRes.isMatch).toBe(true);
            expect(passRes.isError).toBeFalsy();

            const equalRes = checkEffectiveAge('Effective Age (Yrs)', '20', allData);
            expect(equalRes.isError).toBe(true);
            expect(equalRes.message).toBe('Effective Age (20) must be less than Actual Age (20).');

            const greaterRes = checkEffectiveAge('Effective Age', '25', allData);
            expect(greaterRes.isError).toBe(true);
            expect(greaterRes.message).toBe('Effective Age (25) must be less than Actual Age (20).');
        });
    });
});

