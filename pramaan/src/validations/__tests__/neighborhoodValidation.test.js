import {
    checkPredominantPriceVsIndicatedValue,
    getPredominantPriceValue,
    getIndicatedSalesComparisonValue,
    getImprovementsComments
} from '../neighborhoodValidation';

describe('Predominant Price vs Indicated Value Validation', () => {
    describe('getPredominantPriceValue', () => {
        test('parses 3-value slash string "190 / 20 / 70"', () => {
            const pred = getPredominantPriceValue({}, '190 / 20 / 70');
            expect(pred).toBe(70);
        });

        test('parses 3-value space separated string "190 20 70"', () => {
            const pred = getPredominantPriceValue({}, '190 20 70');
            expect(pred).toBe(70);
        });

        test('parses JSON string or object', () => {
            expect(getPredominantPriceValue({}, '{"high": 190, "low": 20, "pred": 70}')).toBe(70);
            expect(getPredominantPriceValue({ 'one unit housing price(high,low,pred)': { pred: '75' } })).toBe(75);
        });

        test('falls back to allData container lookup', () => {
            const allData = {
                NEIGHBORHOOD: {
                    'one unit housing price(high,low,pred)': '250 / 50 / 120'
                }
            };
            expect(getPredominantPriceValue(allData)).toBe(120);
        });
    });

    describe('getIndicatedSalesComparisonValue', () => {
        test('extracts number from currency string', () => {
            expect(getIndicatedSalesComparisonValue({}, '$72,000')).toBe(72000);
            expect(getIndicatedSalesComparisonValue({}, '72000')).toBe(72000);
        });

        test('falls back to allData containers', () => {
            const allData = {
                SALES_TRANSFER: {
                    'Indicated Value by Sales Comparison Approach $': '72,000'
                }
            };
            expect(getIndicatedSalesComparisonValue(allData)).toBe(72000);
        });
    });

    describe('checkPredominantPriceVsIndicatedValue', () => {
        test('passes when Indicated Value is within ±10% (scaled pred 70 -> $70,000, ind $72,000)', () => {
            const allData = {
                NEIGHBORHOOD: {
                    'one unit housing price(high,low,pred)': '190 / 20 / 70'
                },
                SALES_TRANSFER: {
                    'Indicated Value by Sales Comparison Approach $': '$72,000'
                }
            };

            const res = checkPredominantPriceVsIndicatedValue(
                'one unit housing price(high,low,pred)',
                '190 / 20 / 70',
                allData
            );

            expect(res).not.toBeNull();
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
            expect(res.message).toContain('within ±10%');
            expect(res.message).toContain('$72,000');
            expect(res.message).toContain('$70,000');
        });

        test('passes when triggered on Indicated Value field within ±10%', () => {
            const allData = {
                NEIGHBORHOOD: {
                    'one unit housing price(high,low,pred)': '190 / 20 / 70'
                },
                SALES_TRANSFER: {
                    'Indicated Value by Sales Comparison Approach $': '$68,000'
                }
            };

            const res = checkPredominantPriceVsIndicatedValue(
                'Indicated Value by Sales Comparison Approach $',
                '$68,000',
                allData
            );

            expect(res).not.toBeNull();
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
            expect(res.message).toContain('within ±10%');
        });

        test('fails when > +10% and no comment present', () => {
            const allData = {
                NEIGHBORHOOD: {
                    'one unit housing price(high,low,pred)': '190 / 20 / 70'
                },
                SALES_TRANSFER: {
                    'Indicated Value by Sales Comparison Approach $': '$95,000'
                },
                IMPROVEMENTS: {
                    'Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?If Yes, describe': 'Standard residential conformity.'
                }
            };

            const res = checkPredominantPriceVsIndicatedValue(
                'one unit housing price(high,low,pred)',
                '190 / 20 / 70',
                allData
            );

            expect(res).not.toBeNull();
            expect(res.isError).toBe(true);
            expect(res.message).toContain('> +10%');
            expect(res.message).toContain("'higher' or 'over-improvement'");
        });

        test('passes when > +10% and comment with "higher" is present', () => {
            const allData = {
                NEIGHBORHOOD: {
                    'one unit housing price(high,low,pred)': '190 / 20 / 70'
                },
                SALES_TRANSFER: {
                    'Indicated Value by Sales Comparison Approach $': '$95,000'
                },
                IMPROVEMENTS: {
                    'Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?If Yes, describe':
                        'The subject property value is higher than the predominant neighborhood price due to recent extensive luxury renovations.'
                }
            };

            const res = checkPredominantPriceVsIndicatedValue(
                'one unit housing price(high,low,pred)',
                '190 / 20 / 70',
                allData
            );

            expect(res).not.toBeNull();
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
            expect(res.message).toContain('+35.7% above Predominant Price');
            expect(res.message).toContain('Comment found in Improvements');
            expect(res.message).toContain('higher');
        });

        test('passes when > +10% and comment with "over-improvement" is present', () => {
            const allData = {
                NEIGHBORHOOD: {
                    'one unit housing price(high,low,pred)': '190 / 20 / 70'
                },
                SALES_TRANSFER: {
                    'Indicated Value by Sales Comparison Approach $': '$90,000'
                },
                IMPROVEMENTS: {
                    'Additional features': 'The extra garage and in-ground pool represent an over-improvement for this immediate micro-market.'
                }
            };

            const res = checkPredominantPriceVsIndicatedValue(
                'Indicated Value by Sales Comparison Approach $',
                '$90,000',
                allData
            );

            expect(res).not.toBeNull();
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
            expect(res.message).toContain('over-improvement');
        });

        test('fails when < -10% and no comment present', () => {
            const allData = {
                NEIGHBORHOOD: {
                    'one unit housing price(high,low,pred)': '190 / 20 / 70'
                },
                SALES_TRANSFER: {
                    'Indicated Value by Sales Comparison Approach $': '$50,000'
                },
                IMPROVEMENTS: {
                    'Describe the condition of the property': 'Average condition throughout.'
                }
            };

            const res = checkPredominantPriceVsIndicatedValue(
                'one unit housing price(high,low,pred)',
                '190 / 20 / 70',
                allData
            );

            expect(res).not.toBeNull();
            expect(res.isError).toBe(true);
            expect(res.message).toContain('< -10%');
            expect(res.message).toContain("'lower' or 'under improvement'");
        });

        test('passes when < -10% and comment with "under improvement" or "lower" is present', () => {
            const allData = {
                NEIGHBORHOOD: {
                    'one unit housing price(high,low,pred)': '190 / 20 / 70'
                },
                SALES_TRANSFER: {
                    'Indicated Value by Sales Comparison Approach $': '$55,000'
                },
                IMPROVEMENTS: {
                    'Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?If No, describe':
                        'The subject is lower in value compared to predominant due to deferred maintenance and under improvement.'
                }
            };

            const res = checkPredominantPriceVsIndicatedValue(
                'one unit housing price(high,low,pred)',
                '190 / 20 / 70',
                allData
            );

            expect(res).not.toBeNull();
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
            expect(res.message).toContain('below Predominant Price');
            expect(res.message).toContain('Comment found in Improvements');
        });

        test('returns null if either pred or indicated value is missing', () => {
            expect(checkPredominantPriceVsIndicatedValue('one unit housing price(high,low,pred)', '', {})).toBeNull();
            expect(checkPredominantPriceVsIndicatedValue('Indicated Value by Sales Comparison Approach $', '100000', {})).toBeNull();
        });
    });
});

