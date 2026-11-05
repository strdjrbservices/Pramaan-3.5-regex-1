import { checkBasementDetails, checkFoundationType, getFoundationStatus } from '../improvementsValidation';

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
});

