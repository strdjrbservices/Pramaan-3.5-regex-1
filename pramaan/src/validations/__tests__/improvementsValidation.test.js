import { checkBasementDetails, checkFoundationType, getFoundationStatus, checkExistingProposedUnderConst, checkEffectiveAge, checkUnits, checkAccessoryUnit, isPositiveAdu, isNegativeAdu, isOneWithAccessoryUnit, isAduPresentInSalesGrid, checkAduSalesGridPresence } from '../improvementsValidation';
import { checkAduFileCheck } from '../subjectValidation';
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

    describe('ADU File Check vs Improvements Units Validation', () => {
        test('checkUnits passes when ADU is marked Yes and Units is One with Accessory Unit', () => {
            const data = { 'ADU File Check': 'Yes' };
            const res = checkUnits('Units', 'One with Accessory Unit', data);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
            expect(res.message).toContain("ADU is marked 'Yes'");
        });

        test('checkUnits fails when ADU is marked Yes but Units is marked One', () => {
            const data = { 'ADU File Check': 'Yes' };
            const res = checkUnits('Units', 'One', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("must be marked on 'One with Accessory Unit'");
        });

        test('checkUnits fails when ADU is marked Yes but Units is marked 1', () => {
            const data = { 'ADU File Check': 'Yes' };
            const res = checkUnits('Units', '1', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("must be marked on 'One with Accessory Unit'");
        });

        test('checkUnits fails when ADU is marked No but Units is marked One with Accessory Unit', () => {
            const data = { 'ADU File Check': 'No' };
            const res = checkUnits('Units', 'One with Accessory Unit', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("ADU is marked 'No'");
        });

        test('checkUnits passes when ADU is marked No and Units is marked One or 1', () => {
            const data = { 'ADU File Check': 'No' };
            const resOne = checkUnits('Units', 'One', data);
            expect(resOne.isMatch).toBe(true);
            expect(resOne.isError).toBeFalsy();

            const res1 = checkUnits('Units', '1', data);
            expect(res1.isMatch).toBe(true);
            expect(res1.isError).toBeFalsy();
        });

        test('checkUnits handles nested data structure (e.g. data.Subject)', () => {
            const data = {
                Subject: {
                    'ADU File Check': 'Yes'
                }
            };
            const res = checkUnits('Units', 'One with Accessory Unit', data);
            expect(res.isMatch).toBe(true);

            const resFail = checkUnits('Units', 'One', data);
            expect(resFail.isError).toBe(true);
        });

        test('checkAduFileCheck passes when ADU is Yes, Units is One with Accessory Unit, and ADU is in Sales Grid', () => {
            const data = {
                'Units': 'One with Accessory Unit',
                'sales_grid_custom_rows': [{ label: 'ADU', valueKey: 'ADU' }]
            };
            const res = checkAduFileCheck('ADU File Check', 'Yes', data);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
            expect(res.message).toContain("ADU is marked 'Yes'");
            expect(res.message).toContain("ADU is present in the Sales Grid");
        });

        test('checkAduFileCheck fails when ADU is Yes and Units is One with Accessory Unit but ADU is NOT in Sales Grid', () => {
            const data = { 'Units': 'One with Accessory Unit' };
            const res = checkAduFileCheck('ADU File Check', 'Yes', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("not present in the Sales Comparison Grid");
        });

        test('checkAduFileCheck fails when ADU is Yes but Units is One or 1', () => {
            const data = { 'Units': 'One' };
            const res = checkAduFileCheck('ADU File Check', 'Yes', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("must be marked on 'One with Accessory Unit'");
        });

        test('checkAduFileCheck fails when ADU is No but Units is One with Accessory Unit', () => {
            const data = { 'Units': 'One with Accessory Unit' };
            const res = checkAduFileCheck('ADU File Check', 'No', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("ADU is marked 'No'");
        });

        test('checkAduFileCheck passes when ADU is No and Units is One', () => {
            const data = { 'Units': 'One' };
            const res = checkAduFileCheck('ADU File Check', 'No', data);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
            expect(res.message).toContain("ADU is marked 'No'");
        });

        test('checkAduFileCheck fails when ADU File Check is empty', () => {
            const res = checkAduFileCheck('ADU File Check', '', {});
            expect(res.isError).toBe(true);
            expect(res.message).toContain('empty');
        });

        test('checkAccessoryUnit passes when ADU is Yes', () => {
            const data = { 'ADU File Check': 'Yes', 'Units': 'One with Accessory Unit' };
            const res = checkAccessoryUnit('Units', 'One with Accessory Unit', data);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
        });

        test('checkAccessoryUnit fails when ADU is No', () => {
            const data = { 'ADU File Check': 'No', 'Units': 'One with Accessory Unit' };
            const res = checkAccessoryUnit('Units', 'One with Accessory Unit', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("ADU is marked 'No'");
        });

        test('handles dynamic manual changes between Yes/No and One/One with Accessory Unit', () => {
            const state = {
                'ADU File Check': 'Yes',
                'Units': 'One with Accessory Unit',
                'sales_grid_custom_rows': [{ label: 'ADU', valueKey: 'ADU' }]
            };

            // Initially valid
            expect(checkAduFileCheck('ADU File Check', state['ADU File Check'], state).isMatch).toBe(true);
            expect(checkUnits('Units', state['Units'], state).isMatch).toBe(true);

            // User manually changes Units to 'One'
            state['Units'] = 'One';
            const unitErr = checkUnits('Units', state['Units'], state);
            expect(unitErr.isError).toBe(true);
            expect(unitErr.message).toContain("must be marked on 'One with Accessory Unit'");

            const aduErr = checkAduFileCheck('ADU File Check', state['ADU File Check'], state);
            expect(aduErr.isError).toBe(true);
            expect(aduErr.message).toContain("must be marked on 'One with Accessory Unit'");

            // User manually changes ADU File Check to 'No'
            state['ADU File Check'] = 'No';
            expect(checkAduFileCheck('ADU File Check', state['ADU File Check'], state).isMatch).toBe(true);
            expect(checkUnits('Units', state['Units'], state).isMatch).toBe(true);

            // User manually changes Units back to 'One with Accessory Unit' while ADU is 'No'
            state['Units'] = 'One with Accessory Unit';
            expect(checkUnits('Units', state['Units'], state).isError).toBe(true);
            expect(checkAduFileCheck('ADU File Check', state['ADU File Check'], state).isError).toBe(true);

            // User manually changes ADU File Check back to 'Yes'
            state['ADU File Check'] = 'Yes';
            expect(checkUnits('Units', state['Units'], state).isMatch).toBe(true);
            expect(checkAduFileCheck('ADU File Check', state['ADU File Check'], state).isMatch).toBe(true);
        });
    });

    describe('Sales Grid ADU Presence Validation', () => {
        test('isAduPresentInSalesGrid detects ADU in custom rows array', () => {
            expect(isAduPresentInSalesGrid({ sales_grid_custom_rows: [{ label: 'ADU' }] })).toBe(true);
            expect(isAduPresentInSalesGrid({ sales_grid_custom_rows: [{ label: 'Accessory Unit' }] })).toBe(true);
            expect(isAduPresentInSalesGrid({ SALES_GRID: { sales_grid_custom_rows: [{ valueKey: 'ADU' }] } })).toBe(true);
            expect(isAduPresentInSalesGrid({ sales_grid_custom_rows: [{ label: 'Woodstove' }] })).toBe(false);
            expect(isAduPresentInSalesGrid({})).toBe(false);
        });

        test('isAduPresentInSalesGrid detects ADU in Subject or Comps columns', () => {
            expect(isAduPresentInSalesGrid({ Subject: { 'ADU': '1 Unit' } })).toBe(true);
            expect(isAduPresentInSalesGrid({ SALES_GRID: { Subject: { 'Accessory Unit': 'Yes' } } })).toBe(true);
            expect(isAduPresentInSalesGrid({ SALES_GRID: { 'COMPARABLE SALE #1': { 'ADU': 'None', 'ADU Adjustment': '+$10,000' } } })).toBe(true);
        });

        test('checkAduSalesGridPresence passes when ADU is Yes and ADU is present in Sales Grid', () => {
            const data = {
                'ADU File Check': 'Yes',
                'Units': 'One with Accessory Unit',
                'sales_grid_custom_rows': [{ label: 'ADU', valueKey: 'ADU' }]
            };
            const res = checkAduSalesGridPresence('ADU File Check', 'Yes', data);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
            expect(res.message).toContain("ADU is marked 'Yes'");
            expect(res.message).toContain("present in the Sales Comparison Grid");
        });

        test('checkAduSalesGridPresence fails when ADU is Yes but ADU is NOT present in Sales Grid', () => {
            const data = {
                'ADU File Check': 'Yes',
                'Units': 'One with Accessory Unit'
            };
            const res = checkAduSalesGridPresence('ADU File Check', 'Yes', data);
            expect(res.isError).toBe(true);
            expect(res.message).toBe("ADU is marked 'Yes', but 'ADU' or 'Accessory Unit' field is not present in the Sales Comparison Grid.");
        });

        test('checkAduSalesGridPresence passes when ADU is No', () => {
            const data = {
                'ADU File Check': 'No',
                'Units': 'One'
            };
            const res = checkAduSalesGridPresence('ADU File Check', 'No', data);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
        });
    });
});

