import { checkPriorServicesDisclosure } from '../subjectValidation';

describe('Prior Services (3-Year Period Disclosure) Validation', () => {
    const fullPositive = "I HAVE performed services, as an appraiser or in another capacity, regarding the property that is the subject of this report within the three-year period immediately preceding acceptance of this assignment.";
    const fullNegative = "I have not performed services, as an appraiser or in another capacity, regarding the property that is the subject of this report within the three-year period immediately preceding acceptance of this assignment.";
    const userNegativeExample = "I not HAVE performed";

    describe('Valid positive disclosures ("I HAVE performed")', () => {
        test('validates standard full positive statement from appraisal report', () => {
            const res = checkPriorServicesDisclosure('Prior Service Statement', fullPositive);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeUndefined();
            expect(res.message).toContain('confirms services were performed');
        });

        test('validates case-insensitive "i have performed"', () => {
            const res = checkPriorServicesDisclosure('Prior service comment', 'i have performed services on this property');
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeUndefined();
        });

        test('validates appraiser has performed / have performed', () => {
            const res1 = checkPriorServicesDisclosure('Prior Services (3-Year Period Disclosure)', 'Appraiser has performed prior services');
            expect(res1.isMatch).toBe(true);

            const res2 = checkPriorServicesDisclosure('Prior Services (3-Year Period Disclosure):', 'I have performed');
            expect(res2.isMatch).toBe(true);

            const res3 = checkPriorServicesDisclosure('Prior Service Statement', 'performed prior services within the last 3 years');
            expect(res3.isMatch).toBe(true);
        });
    });

    describe('Invalid / Error negative disclosures ("I not HAVE performed", "have not performed")', () => {
        test('shows error when text contains "I not HAVE performed"', () => {
            const res = checkPriorServicesDisclosure('Prior Service Statement', userNegativeExample);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('services were not performed');
        });

        test('shows error when text contains standard full negative statement', () => {
            const res = checkPriorServicesDisclosure('Prior Service Statement', fullNegative);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('services were not performed');
        });

        test('shows error for other negative phrasing variations', () => {
            const variations = [
                'I HAVE NOT performed services',
                'I did not perform any services',
                'Never performed any services on this property',
                'No prior services were performed',
                'Appraiser has not performed services',
                'Not Present'
            ];

            variations.forEach(text => {
                const res = checkPriorServicesDisclosure('Prior Services Statement', text);
                expect(res.isError).toBe(true);
            });
        });
    });

    describe('Empty, missing or unrecognized input', () => {
        test('shows error for blank or empty string', () => {
            const resEmpty = checkPriorServicesDisclosure('Prior Service Statement', '');
            expect(resEmpty.isError).toBe(true);
            expect(resEmpty.skipBlankFilter).toBe(true);

            const resWhitespace = checkPriorServicesDisclosure('Prior Service Statement', '   ');
            expect(resWhitespace.isError).toBe(true);
            expect(resWhitespace.skipBlankFilter).toBe(true);
        });

        test('shows error for null or undefined', () => {
            const resNull = checkPriorServicesDisclosure('Prior Service Statement', null);
            expect(resNull.isError).toBe(true);
            expect(resNull.skipBlankFilter).toBe(true);

            const resUndef = checkPriorServicesDisclosure('Prior Service Statement', undefined);
            expect(resUndef.isError).toBe(true);
            expect(resUndef.skipBlankFilter).toBe(true);
        });

        test('shows error for non-matching or arbitrary comment text', () => {
            const res = checkPriorServicesDisclosure('Prior Service Statement', 'N/A - see comments section.');
            expect(res.isError).toBe(true);
            expect(res.message).toContain('must state');
        });
    });
});

