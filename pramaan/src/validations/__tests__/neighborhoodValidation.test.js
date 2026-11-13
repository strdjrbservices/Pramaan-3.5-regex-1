import {
    checkPredominantPriceVsIndicatedValue,
    getPredominantPriceValue,
    getIndicatedSalesComparisonValue,
    getImprovementsComments,
    checkHousingPriceAndAge,
    checkNeighborhoodBoundaries,
    checkNeighborhoodUsageConsistency,
    checkBuiltUp,
    checkGrowth,
    checkPropertyValues,
    checkDemandSupply,
    checkMarketingTime,
    checkLocation,
    checkOtherLandUse
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

    describe('Form 1004 Neighborhood Validation (Image 5)', () => {
        const form1004Data = {
            Location: 'Suburban',
            'Built-Up': 'Over 75%',
            Growth: 'Stable',
            'Property Values': 'Stable',
            'Demand/Supply': 'In Balance',
            'Marketing Time': 'Under 3 mths',
            'One-Unit': '75%',
            '2-4 Unit': '5%',
            'Multi-Family': '10%',
            'Commercial': '5%',
            'Other': '5%',
            'Present Land Use for other': 'vacant land such as public parks, vacant building sites',
            'one unit housing price(high,low,pred)': '1015 / 120 / 429',
            'one unit housing age(high,low,pred)': '116 / 0 / 1',
            'Neighborhood Boundaries': 'NC-16 to the north; Beatties Ford Rd to the east; Cox Ave to the south; Stewart Creek to the west.'
        };

        test('validates location, built-up, growth, property values, demand/supply, marketing time', () => {
            expect(checkLocation('Location', form1004Data.Location).isMatch).toBe(true);
            expect(checkBuiltUp('Built-Up', form1004Data['Built-Up']).isMatch).toBe(true);
            expect(checkGrowth('Growth', form1004Data.Growth).isMatch).toBe(true);
            expect(checkPropertyValues('Property Values', form1004Data['Property Values']).isMatch).toBe(true);
            expect(checkDemandSupply('Demand/Supply', form1004Data['Demand/Supply']).isMatch).toBe(true);
            expect(checkMarketingTime('Marketing Time', form1004Data['Marketing Time']).isMatch).toBe(true);
        });

        test('validates housing price and age (High >= Low, Low <= Pred <= High)', () => {
            const priceRes = checkHousingPriceAndAge('one unit housing price(high,low,pred)', form1004Data['one unit housing price(high,low,pred)']);
            expect(priceRes.isMatch).toBe(true);

            const ageRes = checkHousingPriceAndAge('one unit housing age(high,low,pred)', form1004Data['one unit housing age(high,low,pred)']);
            expect(ageRes.isMatch).toBe(true);
        });

        test('validates boundaries contain North, South, East, West', () => {
            const boundRes = checkNeighborhoodBoundaries('Neighborhood Boundaries', form1004Data['Neighborhood Boundaries']);
            expect(boundRes.isMatch).toBe(true);
        });

        test('validates land use percentages and other description', () => {
            expect(checkNeighborhoodUsageConsistency('One-Unit', form1004Data['One-Unit']).isMatch).toBe(true);
            expect(checkNeighborhoodUsageConsistency('Other', form1004Data['Other']).isMatch).toBe(true);
            const otherRes = checkOtherLandUse('Other', form1004Data['Other'], { NEIGHBORHOOD: form1004Data });
            expect(otherRes.isMatch).toBe(true);
        });
    });

    describe('Form 1073 Condominium Neighborhood Validation (Image 6)', () => {
        const form1073Data = {
            Location: 'Suburban',
            'Built-Up': 'Over 75%',
            Growth: 'Stable',
            'Property Values': 'Stable',
            'Demand/Supply': 'Shortage',
            'Marketing Time': 'Under 3 mths',
            'One-Unit': '65%',
            '2-4 Unit': '5%',
            'Multi-Family': '25%',
            'Commercial': '5%',
            'Other': '0%',
            'condominium housing price(high,low,pred)': '6100 / 867 / 1589',
            'condominium housing age(high,low,pred)': '53 / 8 / 24',
            'Neighborhood Boundaries': 'Las Flores to the North, Los Patrones Parkway to the East, Rancho Mission Viejo to the South & Mission Viejo to the West.'
        };

        test('validates condo single choice characteristics and trends', () => {
            expect(checkLocation('Location', form1073Data.Location).isMatch).toBe(true);
            expect(checkBuiltUp('Built-Up', form1073Data['Built-Up']).isMatch).toBe(true);
            expect(checkGrowth('Growth', form1073Data.Growth).isMatch).toBe(true);
            expect(checkPropertyValues('Property Values', form1073Data['Property Values']).isMatch).toBe(true);
            expect(checkDemandSupply('Demand/Supply', form1073Data['Demand/Supply']).isMatch).toBe(true);
            expect(checkMarketingTime('Marketing Time', form1073Data['Marketing Time']).isMatch).toBe(true);
        });

        test('validates condominium housing price and age', () => {
            const priceRes = checkHousingPriceAndAge('condominium housing price(high,low,pred)', form1073Data['condominium housing price(high,low,pred)']);
            expect(priceRes.isMatch).toBe(true);

            const ageRes = checkHousingPriceAndAge('condominium housing age(high,low,pred)', form1073Data['condominium housing age(high,low,pred)']);
            expect(ageRes.isMatch).toBe(true);
        });

        test('validates condo boundaries contain North, South, East, West', () => {
            const boundRes = checkNeighborhoodBoundaries('Neighborhood Boundaries', form1073Data['Neighborhood Boundaries']);
            expect(boundRes.isMatch).toBe(true);
        });
    });
});

