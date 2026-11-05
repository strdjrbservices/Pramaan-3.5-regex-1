import {
    checkOtherBasement,
    checkRentOtherBasementAdjustment,
    checkMinimumRentalComparables,
    getPresentRentalCompsCount,
    isRentalCompPresent,
    getComparableIndicatedMonthlyMarketRents,
    getRentScheduleToBeValue,
    checkRentScheduleToBeBracketing,
    checkCompIndicatedMonthlyMarketRentBracketing
} from '../rentScheduleValidation';

describe('checkOtherBasement validation', () => {
    const mockAllData = {
        'Single Family Rent Schedule': {
            'Other (e.g., basement, etc.)': '1500sf1500sfwo 1rr3br2.0ba1o'
        },
        'Comparable Rental Data': {
            'COMPARABLE NO. 1': {
                'Other (e.g., basement, etc.)': '0sf',
                'Other (e.g., basement, etc.) Adjustment': '500'
            },
            'COMPARABLE NO. 2': {
                'Other (e.g., basement, etc.)': '0sf',
                'Other (e.g., basement, etc.) Adjustment': '+500'
            },
            'COMPARABLE NO. 3': {
                'Other (e.g., basement, etc.)': '630sf0sfin',
                'Other (e.g., basement, etc.) Adjustment': '250'
            },
            'COMPARABLE NO. 4': {
                'Other (e.g., basement, etc.)': '0sf',
                'Other (e.g., basement, etc.) Adjustment': ''
            },
            'COMPARABLE NO. 5': {
                'Other (e.g., basement, etc.)': '1500sf1500sfwo 1rr3br2.0ba1o',
                'Other (e.g., basement, etc.) Adjustment': ''
            },
            'COMPARABLE NO. 6': {
                'Other (e.g., basement, etc.)': '1500sf1500sfwo 1rr3br2.0ba1o',
                'Other (e.g., basement, etc.) Adjustment': '500'
            },
            'COMPARABLE NO. 7': {
                'Other (e.g., basement, etc.)': '0sf',
                'Other (e.g., basement, etc.) Adjustment': '0'
            },
            'COMPARABLE NO. 8': {
                'Other (e.g., basement, etc.)': '0sf',
                'Other (e.g., basement, etc.) Adjustment': '-350'
            }
        }
    };

    test('should return null for non-basement fields', () => {
        const res = checkOtherBasement('Address', '123 Main St', mockAllData, ['COMPARABLE NO. 1', 'Address'], 'COMPARABLE NO. 1');
        expect(res).toBeNull();
    });

    test('should return null for Subject', () => {
        const res = checkOtherBasement('Other (e.g., basement, etc.)', '1500sf1500sfwo 1rr3br2.0ba1o', mockAllData, ['Subject', 'Other (e.g., basement, etc.)'], 'Subject');
        expect(res).toBeNull();
    });

    test('Comp 1: basement is different and adjustment is +500 -> isMatch: true', () => {
        const resDesc = checkOtherBasement(
            'Other (e.g., basement, etc.)',
            '0sf',
            mockAllData,
            ['COMPARABLE NO. 1', 'Other (e.g., basement, etc.)'],
            'COMPARABLE NO. 1'
        );
        expect(resDesc).toEqual(expect.objectContaining({ isMatch: true }));

        const resAdj = checkRentOtherBasementAdjustment(
            'Other (e.g., basement, etc.) Adjustment',
            '500',
            mockAllData,
            ['COMPARABLE NO. 1', 'Other (e.g., basement, etc.) Adjustment'],
            'COMPARABLE NO. 1'
        );
        expect(resAdj).toEqual(expect.objectContaining({ isMatch: true }));
    });

    test('Comp 3: basement is different (630sf0sfin) and adjustment is 250 -> isMatch: true', () => {
        const res = checkOtherBasement(
            'Other (e.g., basement, etc.)',
            '630sf0sfin',
            mockAllData,
            ['COMPARABLE NO. 3', 'Other (e.g., basement, etc.)'],
            'COMPARABLE NO. 3'
        );
        expect(res).toEqual(expect.objectContaining({ isMatch: true }));
    });

    test('Comp 7: basement is different and adjustment is 0 -> isMatch: true', () => {
        const res = checkOtherBasement(
            'Other (e.g., basement, etc.)',
            '0sf',
            mockAllData,
            ['COMPARABLE NO. 7', 'Other (e.g., basement, etc.)'],
            'COMPARABLE NO. 7'
        );
        expect(res).toEqual(expect.objectContaining({ isMatch: true }));
    });

    test('Comp 8: basement is different and adjustment is negative (-350) -> isMatch: true', () => {
        const res = checkOtherBasement(
            'Other (e.g., basement, etc.)',
            '0sf',
            mockAllData,
            ['COMPARABLE NO. 8', 'Other (e.g., basement, etc.)'],
            'COMPARABLE NO. 8'
        );
        expect(res).toEqual(expect.objectContaining({ isMatch: true }));
    });

    test('Comp 4: basement is different and adjustment is blank -> isError: true with adjustment required message', () => {
        const res = checkOtherBasement(
            'Other (e.g., basement, etc.)',
            '0sf',
            mockAllData,
            ['COMPARABLE NO. 4', 'Other (e.g., basement, etc.)'],
            'COMPARABLE NO. 4'
        );
        expect(res).toEqual(expect.objectContaining({ isError: true }));
        expect(res.message).toMatch(/adjustment is required/i);
    });

    test('Comp 5: basement is the SAME as Subject and adjustment is blank -> isMatch: true', () => {
        const res = checkOtherBasement(
            'Other (e.g., basement, etc.)',
            '1500sf1500sfwo 1rr3br2.0ba1o',
            mockAllData,
            ['COMPARABLE NO. 5', 'Other (e.g., basement, etc.)'],
            'COMPARABLE NO. 5'
        );
        expect(res).toEqual(expect.objectContaining({ isMatch: true }));
    });

    test('Comp 6: basement is the SAME as Subject but adjustment is 500 (non-zero) -> isError: true', () => {
        const res = checkOtherBasement(
            'Other (e.g., basement, etc.)',
            '1500sf1500sfwo 1rr3br2.0ba1o',
            mockAllData,
            ['COMPARABLE NO. 6', 'Other (e.g., basement, etc.)'],
            'COMPARABLE NO. 6'
        );
        expect(res).toEqual(expect.objectContaining({ isError: true }));
        expect(res.message).toMatch(/same as subject.*not \$0/i);
    });
});


describe('checkMinimumRentalComparables validation', () => {
    const valid3CompsData = {
        formType: '1004 + 1007',
        'Comparable Rental Data': {
            'COMPARABLE NO. 1': {
                'Address': '123 Main St, Park City, UT',
                'Monthly Rental': '2,500'
            },
            'COMPARABLE NO. 2': {
                'Address': '456 Elm St, Park City, UT',
                'Monthly Rental': '2,200'
            },
            'COMPARABLE NO. 3': {
                'Address': '789 Oak Ave, Park City, UT',
                'Monthly Rental': '2,000'
            }
        }
    };

    const only2CompsData = {
        formType: '1073 + 1007',
        'Comparable Rental Data': {
            'COMPARABLE NO. 1': {
                'Address': '123 Main St, Park City, UT',
                'Monthly Rental': '2,500'
            },
            'COMPARABLE NO. 2': {
                'Address': '456 Elm St, Park City, UT',
                'Monthly Rental': '2,200'
            },
            'COMPARABLE NO. 3': {
                'Address': ''
            }
        }
    };

    const zeroCompsData = {
        formType: '1007',
        'Comparable Rental Data': {}
    };

    const standard1004Data = {
        formType: '1004',
        'Comparable Rental Data': {}
    };

    test('should count 3 present rental comparables correctly', () => {
        expect(getPresentRentalCompsCount(valid3CompsData)).toBe(3);
    });

    test('should count 2 present rental comparables when Comp 3 is blank', () => {
        expect(getPresentRentalCompsCount(only2CompsData)).toBe(2);
    });

    test('should count 0 present rental comparables when none present', () => {
        expect(getPresentRentalCompsCount(zeroCompsData)).toBe(0);
    });

    test('should pass validation when 3 rental comparables are present', () => {
        const res = checkMinimumRentalComparables(
            'Address',
            '123 Main St, Park City, UT',
            valid3CompsData,
            ['COMPARABLE NO. 1', 'Address'],
            'COMPARABLE NO. 1',
            '1004 + 1007'
        );
        expect(res).toEqual(expect.objectContaining({ isMatch: true }));
    });

    test('should return error "minimum 3 rental comparables will be present" when only 2 are present', () => {
        const resComp3 = checkMinimumRentalComparables(
            'Address',
            '',
            only2CompsData,
            ['COMPARABLE NO. 3', 'Address'],
            'COMPARABLE NO. 3',
            '1073 + 1007'
        );
        expect(resComp3).toEqual(expect.objectContaining({
            isError: true,
            message: expect.stringContaining('Minimum 3 rental comparables are required in the report.')
        }));
    });

    test('should return error when 0 rental comparables are present', () => {
        const res = checkMinimumRentalComparables(
            'Address',
            '',
            zeroCompsData,
            ['COMPARABLE NO. 1', 'Address'],
            'COMPARABLE NO. 1',
            '1007'
        );
        expect(res).toEqual(expect.objectContaining({
            isError: true,
            message: expect.stringContaining('Minimum 3 rental comparables are required in the report.')
        }));
    });

    test('should return null when Form 1007 is NOT active (e.g. plain 1004)', () => {
        const res = checkMinimumRentalComparables(
            'Address',
            '',
            standard1004Data,
            ['COMPARABLE NO. 1', 'Address'],
            'COMPARABLE NO. 1',
            '1004'
        );
        expect(res).toBeNull();
    });
});

describe('Comparable Rent Schedule TO BE $ Bracketing Validation', () => {
    const bracketedData = {
        'Comparable Rent Schedule Reconciliation': {
            'TO BE $': '1,000'
        },
        'Comparable Rent Schedule': {
            'Comparable Rent Schedule Comp #1': {
                'Indicated Monthly Market Rent': '950'
            },
            'Comparable Rent Schedule Comp #2': {
                'Indicated Monthly Market Rent': '1,050'
            },
            'Comparable Rent Schedule Comp #3': {
                'Indicated Monthly Market Rent': '1,100'
            }
        }
    };

    test('should return isBracketed: true and isMatch: true when TO BE $ (1,000) is bracketed by 950 and 1,100', () => {
        const res = checkRentScheduleToBeBracketing('TO BE $', '1,000', bracketedData);
        expect(res).not.toBeNull();
        expect(res.isBracketed).toBe(true);
        expect(res.isMatch).toBe(true);
        expect(res.message).toContain('bracketed');
        expect(res.message).toContain('1,000');
        expect(res.message).toContain('950');
        expect(res.message).toContain('1,100');
    });

    test('should return isBracketed: false and isError: true when TO BE $ (900) is lower than all comparables', () => {
        const unbracketedLowData = {
            'Comparable Rent Schedule Reconciliation': {
                'TO BE $': '900'
            },
            'Comparable Rent Schedule': {
                'Comparable Rent Schedule Comp #1': {
                    'Indicated Monthly Market Rent': '950'
                },
                'Comparable Rent Schedule Comp #2': {
                    'Indicated Monthly Market Rent': '1,050'
                }
            }
        };
        const res = checkRentScheduleToBeBracketing('TO BE $', '900', unbracketedLowData);
        expect(res).not.toBeNull();
        expect(res.isBracketed).toBe(false);
        expect(res.isError).toBe(true);
        expect(res.message).toContain('unbracketed');
        expect(res.message).toContain('all comparables are higher');
        expect(res.message).toContain('Lowest is $950');
    });

    test('should return isBracketed: false and isError: true when TO BE $ (1,200) is higher than all comparables', () => {
        const unbracketedHighData = {
            'Comparable Rent Schedule Reconciliation': {
                'TO BE $': '1,200'
            },
            'Comparable Rent Schedule': {
                'Comparable Rent Schedule Comp #1': {
                    'Indicated Monthly Market Rent': '950'
                },
                'Comparable Rent Schedule Comp #2': {
                    'Indicated Monthly Market Rent': '1,050'
                }
            }
        };
        const res = checkRentScheduleToBeBracketing('TO BE $', '1,200', unbracketedHighData);
        expect(res).not.toBeNull();
        expect(res.isBracketed).toBe(false);
        expect(res.isError).toBe(true);
        expect(res.message).toContain('unbracketed');
        expect(res.message).toContain('all comparables are lower');
        expect(res.message).toContain('Highest is $1,050');
    });

    test('should validate comparable Indicated Monthly Market Rent against TO BE $', () => {
        const resComp1 = checkCompIndicatedMonthlyMarketRentBracketing(
            'Indicated Monthly Market Rent',
            '1,050',
            bracketedData,
            ['Comparable Rent Schedule Comp #2', 'Indicated Monthly Market Rent'],
            'Comparable #2'
        );
        expect(resComp1).not.toBeNull();
        expect(resComp1.isMatch).toBe(true);
        expect(resComp1.message).toContain('Comparable #2 Indicated Monthly Market Rent ($1,050, +5.0%) vs TO BE $ ($1,000)');
    });

    test('should return null when comparables are missing or empty', () => {
        const emptyData = {
            'Comparable Rent Schedule Reconciliation': {
                'TO BE $': '1,000'
            }
        };
        const res = checkRentScheduleToBeBracketing('TO BE $', '1,000', emptyData);
        expect(res).toBeNull();
    });
});
