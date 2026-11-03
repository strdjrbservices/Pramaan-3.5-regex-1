import { checkInfoOfSalesFieldsNotBlank } from '../infoOfSalesValidation';

describe('Sales Comparison Approach - Info of Sales Blank & Format Validation', () => {
    const offeredFieldStandard = "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from$ ___to $___";
    const salesFieldStandard = "There are ___comparable sales in the subject neighborhoodwithin the past twelvemonths ranging in sale price from$___ to $____";
    const offeredFieldScreenshot = "THERE ARE ___ COMPARABLE PROPERTIES CURRENTLY OFFERED FOR SALE IN THE SUBJECT NEIGHBORHOOD RANGING IN PRICE FROM$ ___TO $___";
    const salesFieldScreenshot = "THERE ARE ___COMPARABLE SALES IN THE SUBJECT NEIGHBORHOODWITHIN THE PAST TWELVEMONTHS RANGING IN SALE PRICE FROM$___ TO $___";

    describe('Blank field validation', () => {
        test('fails when offered field is empty string', () => {
            const res = checkInfoOfSalesFieldsNotBlank(offeredFieldStandard, "");
            expect(res.isError).toBe(true);
            expect(res.skipBlankFilter).toBe(true);
            expect(res.message).toContain('should not be blank');
        });

        test('fails when offered field is null or undefined', () => {
            const resNull = checkInfoOfSalesFieldsNotBlank(offeredFieldScreenshot, null);
            expect(resNull.isError).toBe(true);
            expect(resNull.skipBlankFilter).toBe(true);

            const resUndef = checkInfoOfSalesFieldsNotBlank(offeredFieldScreenshot, undefined);
            expect(resUndef.isError).toBe(true);
            expect(resUndef.skipBlankFilter).toBe(true);
        });

        test('fails when sales field is empty string or whitespace', () => {
            const res = checkInfoOfSalesFieldsNotBlank(salesFieldStandard, "   ");
            expect(res.isError).toBe(true);
            expect(res.skipBlankFilter).toBe(true);
            expect(res.message).toContain('should not be blank');
        });

        test('fails when sales field is only placeholder text with no numbers', () => {
            const res = checkInfoOfSalesFieldsNotBlank(salesFieldScreenshot, "There are ___ comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $___ to $___");
            expect(res.isError).toBe(true);
            expect(res.skipBlankFilter).toBe(true);
            expect(res.message).toContain('should not be blank');
        });

        test('fails when offered field is only placeholder text with no numbers', () => {
            const res = checkInfoOfSalesFieldsNotBlank(offeredFieldScreenshot, "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from $___ to $___");
            expect(res.isError).toBe(true);
            expect(res.skipBlankFilter).toBe(true);
            expect(res.message).toContain('should not be blank');
        });
    });

    describe('Number format and range validation', () => {
        test('fails when fewer than 3 numbers are provided', () => {
            const res = checkInfoOfSalesFieldsNotBlank(offeredFieldStandard, "There are 4 comparable properties currently offered for sale ranging in price from $250,000 to $___");
            expect(res.isError).toBe(true);
            expect(res.skipBlankFilter).toBe(true);
            expect(res.message).toContain('three values (count, low price, and high price) are compulsory');
        });

        test('fails when low price is greater than high price', () => {
            const res = checkInfoOfSalesFieldsNotBlank(offeredFieldStandard, "There are 4 comparable properties currently offered for sale ranging in price from $500,000 to $300,000");
            expect(res.isError).toBe(true);
            expect(res.skipBlankFilter).toBe(true);
            expect(res.message).toContain('price range should be low to high');
        });

        test('fails when sales field low price is greater than high price', () => {
            const res = checkInfoOfSalesFieldsNotBlank(salesFieldStandard, "There are 6 comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $600,000 to $400,000");
            expect(res.isError).toBe(true);
            expect(res.skipBlankFilter).toBe(true);
            expect(res.message).toContain('sale price range should be low to high');
        });

        test('passes when offered field has 3 valid numbers and low <= high', () => {
            const res = checkInfoOfSalesFieldsNotBlank(offeredFieldScreenshot, "There are 3 comparable properties currently offered for sale in the subject neighborhood ranging in price from $350,000 to $450,000");
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
            expect(res.message).toBe("Validation successful!");
        });

        test('passes when sales field has 3 valid numbers (ignoring "twelve months") and low <= high', () => {
            const res = checkInfoOfSalesFieldsNotBlank(salesFieldScreenshot, "There are 8 comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $320,000 to $500,000");
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
            expect(res.message).toBe("Validation successful!");
        });

        test('passes compact format: "5 : $300,000 to $400,000"', () => {
            const res = checkInfoOfSalesFieldsNotBlank(offeredFieldStandard, "5 : $300,000 to $400,000");
            expect(res.isMatch).toBe(true);
            expect(res.message).toBe("Validation successful!");
        });
    });

    describe('Unrelated fields', () => {
        test('returns null for unrelated fields', () => {
            expect(checkInfoOfSalesFieldsNotBlank("Borrower", "")).toBeNull();
            expect(checkInfoOfSalesFieldsNotBlank("City", "Dallas")).toBeNull();
        });
    });
});

