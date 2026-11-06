import { checkPriorServicesDisclosure } from '../subjectValidation';

describe('Prior Services (3-Year Period Disclosure) Validation', () => {
    const fullPositive = "I HAVE performed services, as an appraiser or in another capacity, regarding the property that is the subject of this report within the three-year period immediately preceding acceptance of this assignment.";
    const fullNegative = "I have not performed services, as an appraiser or in another capacity, regarding the property that is the subject of this report within the three-year period immediately preceding acceptance of this assignment.";
    const standardNoServices = "Unless otherwise indicated, I have performed no services, as an appraiser or in any other capacity, regarding the property that is the subject of this report within the three-year";

    describe('Valid disclosures ("I have not performed" and "I HAVE performed")', () => {
        test('validates standard full negative statement (most common compliant USPAP disclosure)', () => {
            const res = checkPriorServicesDisclosure('Prior Service Statement', fullNegative);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeUndefined();
            expect(res.message).toContain('confirms no services were performed');
        });

        test('validates standard no services comment', () => {
            const res = checkPriorServicesDisclosure('Prior service comment', standardNoServices);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeUndefined();
        });

        test('validates standard full positive statement when services were performed', () => {
            const res = checkPriorServicesDisclosure('Prior Service Statement', fullPositive);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeUndefined();
            expect(res.message).toContain('Prior services were performed');
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
            expect(res.message).toContain('Invalid Prior Services disclosure format');
        });
    });
});

