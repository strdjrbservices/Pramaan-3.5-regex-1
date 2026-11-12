import { checkReportDataSourceOfferingPriceDate } from '../subjectValidation';

describe('checkReportDataSourceOfferingPriceDate', () => {
    const fieldName = 'Report data source(s) used, offering price(s), and date(s)';
    const fieldNameWithDot = 'Report data source(s) used, offering price(s), and date(s).';

    test('returns null for non-target fields', () => {
        expect(checkReportDataSourceOfferingPriceDate('Other Field', 'some text')).toBeNull();
    });

    test('returns error when text is blank or empty', () => {
        const resEmpty = checkReportDataSourceOfferingPriceDate(fieldName, '');
        expect(resEmpty.isError).toBe(true);
        expect(resEmpty.message).toContain('must not be blank');

        const resNull = checkReportDataSourceOfferingPriceDate(fieldName, null);
        expect(resNull.isError).toBe(true);
    });

    test('validates successfully when property is NOT CURRENTLY LISTED FOR SALE', () => {
        const text1 = 'THE SUBJECT PROPERTY IS NOT CURRENTLY LISTED FOR SALE NOR HAS IT BEEN LISTED IN THE PAST 12 MONTHS.';
        const res1 = checkReportDataSourceOfferingPriceDate(fieldName, text1);
        expect(res1.isMatch).toBe(true);
        expect(res1.message).toContain('not currently listed for sale');

        const text2 = 'NOT CURRENTLY LISTED FOR SALe';
        const res2 = checkReportDataSourceOfferingPriceDate(fieldNameWithDot, text2);
        expect(res2.isMatch).toBe(true);

        const text3 = 'NOT LISTED FOR SALE';
        const res3 = checkReportDataSourceOfferingPriceDate(fieldName, text3);
        expect(res3.isMatch).toBe(true);

        const text4 = 'NO LISTINGS FOUND IN MLS IN THE PAST 12 MONTHS';
        const res4 = checkReportDataSourceOfferingPriceDate(fieldName, text4);
        expect(res4.isMatch).toBe(true);
    });

    test('validates successfully when LISTED FOR SALE and contains all 5 required elements', () => {
        // Example from user attachment
        const textFromImage = 'The subject was offered for sale on 10/05/2026 for $1,189,900, per CLAW #OC26216623. The most recent list price is $1,189,900 and the subject is now under contract with an MLS contract date of 11/03/2026.';
        const resImage = checkReportDataSourceOfferingPriceDate(fieldName, textFromImage);
        expect(resImage.isMatch).toBe(true);
        expect(resImage.message).toContain('All listing details verified');

        const textListed = 'The subject was listed for sale on 05/12/2026 for $450,000, per MLS #12345. List price is $450,000 with contract date of 06/01/2026.';
        const resListed = checkReportDataSourceOfferingPriceDate(fieldName, textListed);
        expect(resListed.isMatch).toBe(true);
    });

    test('returns error when LISTED FOR SALE is missing required elements', () => {
        // Missing MLS/CLAW, list price, and contract date
        const incomplete1 = 'The subject was offered for sale on 10/05/2026 for $1,189,900.';
        const res1 = checkReportDataSourceOfferingPriceDate(fieldName, incomplete1);
        expect(res1.isError).toBe(true);
        expect(res1.message).toContain('CLAW/MLS data source');
        expect(res1.message).toContain('list price');
        expect(res1.message).toContain('MLS contract date');

        // Missing sale on date
        const missingDate = 'The subject was listed for sale for $1,189,900, per CLAW #OC26216623. The list price is $1,189,900 and MLS contract date is 11/03/2026.';
        const res2 = checkReportDataSourceOfferingPriceDate(fieldName, missingDate);
        expect(res2.isError).toBe(true);
        expect(res2.message).toContain('sale on date');

        // Missing for price
        const missingPrice = 'The subject was offered for sale on 10/05/2026 per CLAW #OC26216623. The list price is $1,189,900 and MLS contract date is 11/03/2026.';
        const res3 = checkReportDataSourceOfferingPriceDate(fieldName, missingPrice);
        expect(res3.isError).toBe(true);
        expect(res3.message).toContain('for [price]');
    });

    test('returns error when text is neither LISTED FOR SALE nor NOT CURRENTLY LISTED FOR SALE', () => {
        const arbitraryText = 'Appraiser reviewed property records and deed history.';
        const res = checkReportDataSourceOfferingPriceDate(fieldName, arbitraryText);
        expect(res.isError).toBe(true);
        expect(res.message).toContain("Must state whether the property is 'LISTED FOR SALE'");
    });
});

