import { checkContractPriceVsFinalValue, checkContractDateVsAsOfDate } from '../contractValidation';

describe('Contract Validation - Contract Price vs Final Value', () => {
    const basePurchaseData = {
        'Assignment Type': 'Purchase Transaction',
        RECONCILIATION: {
            'opinion of the market value, as defined, of the real property that is the subject of this report is $': '500,000'
        }
    };

    describe('checkContractPriceVsFinalValue', () => {
        test('returns null for non-contract price fields', () => {
            const res = checkContractPriceVsFinalValue('Date of Contract', '500,000', basePurchaseData);
            expect(res).toBeNull();
        });

        test('returns null for refinance transactions', () => {
            const refiData = {
                'Assignment Type': 'Refinance Transaction',
                RECONCILIATION: {
                    'Final Value $': '500,000'
                }
            };
            const res = checkContractPriceVsFinalValue('Contract Price $', '550,000', refiData);
            expect(res).toBeNull();
        });

        test('returns null if contract price or final value is missing or 0', () => {
            expect(checkContractPriceVsFinalValue('Contract Price $', '', basePurchaseData)).toBeNull();
            expect(checkContractPriceVsFinalValue('Contract Price $', '0', basePurchaseData)).toBeNull();

            const noFinalVal = { 'Assignment Type': 'Purchase' };
            expect(checkContractPriceVsFinalValue('Contract Price $', '500,000', noFinalVal)).toBeNull();
        });

        test('fails (highlights error) when contract price is higher than final value', () => {
            const res = checkContractPriceVsFinalValue('Contract Price $', '550,000', basePurchaseData);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('higher than final appraised value');
            expect(res.message).toContain('550,000');
            expect(res.message).toContain('500,000');

            const resSlightlyHigher = checkContractPriceVsFinalValue('Contract Price', '500,001', basePurchaseData);
            expect(resSlightlyHigher.isError).toBe(true);
            expect(resSlightlyHigher.message).toContain('higher than final appraised value');
        });

        test('passes when contract price matches final value exactly', () => {
            const res = checkContractPriceVsFinalValue('Contract Price $', '500,000', basePurchaseData);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
            expect(res.message).toContain('matches final appraised value');
        });

        test('passes when contract price is within 10% lower than final value', () => {
            // 4% lower ($480,000 vs $500,000)
            const res4Pct = checkContractPriceVsFinalValue('Contract Price $', '480,000', basePurchaseData);
            expect(res4Pct.isMatch).toBe(true);
            expect(res4Pct.isError).toBeFalsy();
            expect(res4Pct.message).toContain('within 10% lower');

            // Exactly 10% lower ($450,000 vs $500,000)
            const res10Pct = checkContractPriceVsFinalValue('Contract Price $', '$450,000', basePurchaseData);
            expect(res10Pct.isMatch).toBe(true);
            expect(res10Pct.isError).toBeFalsy();
            expect(res10Pct.message).toContain('within 10% lower');
        });

        test('fails (highlights error) when contract price is more than 10% lower than final value', () => {
            // Over 10% lower ($449,999 vs $500,000)
            const resJustOver = checkContractPriceVsFinalValue('Contract Price $', '449,999', basePurchaseData);
            expect(resJustOver.isError).toBe(true);
            expect(resJustOver.message).toContain('more than 10% lower');
            expect(resJustOver.message).toContain('minimum $450,000');

            // 20% lower ($400,000 vs $500,000)
            const res20Pct = checkContractPriceVsFinalValue('Contract Price', '$400,000.00', basePurchaseData);
            expect(res20Pct.isError).toBe(true);
            expect(res20Pct.message).toContain('20.0% lower');
            expect(res20Pct.message).toContain('minimum $450,000');
        });

        test('works with object value and fallback to allData.CONTRACT', () => {
            const dataWithContract = {
                'Assignment Type': 'Purchase',
                CONTRACT: {
                    'Contract Price $': '480,000'
                },
                RECONCILIATION: {
                    'Final Value $': '500,000'
                }
            };
            const res = checkContractPriceVsFinalValue('Contract Price $', { value: '480,000' }, dataWithContract);
            expect(res.isMatch).toBe(true);

            // Using fallback when text is empty
            const resFallback = checkContractPriceVsFinalValue('Contract Price $', '', dataWithContract);
            expect(resFallback.isMatch).toBe(true);
        });
    });

    describe('checkContractDateVsAsOfDate', () => {
        const baseData = {
            CONTRACT: {
                'Date of Contract': '09/15/2026'
            },
            RECONCILIATION: {
                'as of': '10/01/2026'
            }
        };

        test('returns null for unrelated fields', () => {
            expect(checkContractDateVsAsOfDate('Borrower', 'John Doe', baseData)).toBeNull();
            expect(checkContractDateVsAsOfDate('Contract Price', '500,000', baseData)).toBeNull();
        });

        test('returns null when either Date of Contract or as of date is missing', () => {
            const noAsOf = { CONTRACT: { 'Date of Contract': '09/15/2026' } };
            expect(checkContractDateVsAsOfDate('Date of Contract', '09/15/2026', noAsOf)).toBeNull();

            const noContract = { RECONCILIATION: { 'as of': '10/01/2026' } };
            expect(checkContractDateVsAsOfDate('Date of Contract', '', noContract)).toBeNull();
        });

        test('passes when Date of Contract is prior to as of date', () => {
            const res = checkContractDateVsAsOfDate('Date of Contract', '09/15/2026', baseData);
            expect(res).not.toBeNull();
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
            expect(res.message).toContain('is prior to');
            expect(res.message).toContain('09/15/2026');
            expect(res.message).toContain('10/01/2026');
        });

        test('passes when Date of Contract is equal to as of date', () => {
            const sameDateData = {
                CONTRACT: { 'Date of Contract': '10/01/2026' },
                RECONCILIATION: { 'as of': '10/01/2026' }
            };
            const res = checkContractDateVsAsOfDate('Date of Contract', '10/01/2026', sameDateData);
            expect(res).not.toBeNull();
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
            expect(res.message).toContain('is equal to');
        });

        test('fails (isError: true) when Date of Contract is after as of date', () => {
            const invalidData = {
                CONTRACT: { 'Date of Contract': '10/15/2026' },
                RECONCILIATION: { 'as of': '10/01/2026' }
            };
            const res = checkContractDateVsAsOfDate('Date of Contract', '10/15/2026', invalidData);
            expect(res).not.toBeNull();
            expect(res.isError).toBe(true);
            expect(res.message).toContain('must be less than or equal to');
            expect(res.message).toContain('10/15/2026');
            expect(res.message).toContain('10/01/2026');
        });

        test('validates when field is as of date in reconciliation', () => {
            const invalidData = {
                CONTRACT: { 'Date of Contract': '10/15/2026' },
                RECONCILIATION: { 'as of': '10/01/2026' }
            };
            const res = checkContractDateVsAsOfDate('as of', '10/01/2026', invalidData);
            expect(res).not.toBeNull();
            expect(res.isError).toBe(true);
            expect(res.message).toContain('must be less than or equal to');

            const validRes = checkContractDateVsAsOfDate('as of', '10/01/2026', baseData);
            expect(validRes).not.toBeNull();
            expect(validRes.isMatch).toBe(true);
        });

        test('supports multiple date formats and aliases', () => {
            const multiFormatData = {
                'Date of Contract': '2026-08-20',
                'as of': '09/01/26'
            };
            const res = checkContractDateVsAsOfDate('Date of Contract', '2026-08-20', multiFormatData);
            expect(res).not.toBeNull();
            expect(res.isMatch).toBe(true);
        });

        test('reports error for invalid date format', () => {
            const badFormatData = {
                CONTRACT: { 'Date of Contract': 'InvalidDate' },
                RECONCILIATION: { 'as of': '10/01/2026' }
            };
            const res = checkContractDateVsAsOfDate('Date of Contract', 'InvalidDate', badFormatData);
            expect(res).not.toBeNull();
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Invalid Date of Contract format');
        });
    });
});
