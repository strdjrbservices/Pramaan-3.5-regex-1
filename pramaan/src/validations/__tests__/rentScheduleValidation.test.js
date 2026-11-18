import {
    checkOtherBasement,
    checkRentOtherBasementAdjustment,
    checkMinimumRentalComparables,
    checkRentalComparableAddressDuplicates,
    getPresentRentalCompsCount,
    checkRentScheduleToBeBracketing,
    checkCompIndicatedMonthlyMarketRentBracketing,
    checkRentProximityToSubject,
    checkLeaseDates,
    isValidLeaseDateFormat,
    isLeaseExpired,
    checkSubjectMonthlyRental,
    checkSubjectAdjustedMonthlyRent,
    checkSubjectUtilities,
    checkSubjectFurniture
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

describe('checkRentProximityToSubject validation', () => {
    const mockData = {
        'COMPARABLE NO. 1': {
            'Proximity to Subject': '5.2 miles NW'
        },
        'COMPARABLE NO. 2': {
            'Proximity to Subject': '12.5 miles S'
        },
        'COMPARABLE Rental No #1': {
            'Proximity to Subject': '8.0 miles'
        },
        'COMPARABLE Rental No #2': {
            'Proximity to Subject': '11.2 miles NE'
        }
    };

    test('validates rental comparable with <= 10 miles as match', () => {
        const res = checkRentProximityToSubject('Proximity to Subject', '5.2 miles NW', mockData, ['COMPARABLE NO. 1', 'Proximity to Subject'], 'COMPARABLE NO. 1');
        expect(res).not.toBeNull();
        expect(res.isMatch).toBe(true);
        expect(res.message).toContain('The miles of rental is not more than 10 miles (5.2 miles NW)');
    });

    test('validates exactly 10.0 miles as match', () => {
        const res = checkRentProximityToSubject('Proximity to Subject', '10.0 miles', mockData, ['COMPARABLE NO. 1', 'Proximity to Subject'], 'COMPARABLE NO. 1');
        expect(res).not.toBeNull();
        expect(res.isMatch).toBe(true);
        expect(res.message).toContain('not more than 10 miles');
    });

    test('flags error when rental comparable exceeds 10 miles', () => {
        const res = checkRentProximityToSubject('Proximity to Subject', '12.5 miles S', mockData, ['COMPARABLE NO. 2', 'Proximity to Subject'], 'COMPARABLE NO. 2');
        expect(res).not.toBeNull();
        expect(res.isError).toBe(true);
        expect(res.message).toContain('The miles of rental should be not more than 10 miles (current: 12.5 miles S).');
    });

    test('works with Form 1025 rental naming (COMPARABLE Rental No #1)', () => {
        const resValid = checkRentProximityToSubject('Proximity to Subject', '8.0 miles', mockData, ['COMPARABLE Rental No #1', 'Proximity to Subject'], 'COMPARABLE Rental No #1');
        expect(resValid).not.toBeNull();
        expect(resValid.isMatch).toBe(true);

        const resInvalid = checkRentProximityToSubject('Proximity to Subject', '11.2 miles NE', mockData, ['COMPARABLE Rental No #2', 'Proximity to Subject'], 'COMPARABLE Rental No #2');
        expect(resInvalid).not.toBeNull();
        expect(resInvalid.isError).toBe(true);
        expect(resInvalid.message).toContain('The miles of rental should be not more than 10 miles');
    });

    test('skips Subject property', () => {
        const res = checkRentProximityToSubject('Proximity to Subject', '5.0 miles', mockData, ['Subject', 'Proximity to Subject'], 'Subject');
        expect(res).toBeNull();
    });

    test('skips Sales grid comparable (COMPARABLE SALE #1)', () => {
        const res = checkRentProximityToSubject('Proximity to Subject', '12.0 miles', mockData, ['COMPARABLE SALE #1', 'Proximity to Subject'], 'COMPARABLE SALE #1');
        expect(res).toBeNull();
    });

    test('works with fallback call signature (field, allData, saleName)', () => {
        const res = checkRentProximityToSubject('Proximity to Subject', mockData, 'COMPARABLE NO. 1');
        expect(res).not.toBeNull();
        expect(res.isMatch).toBe(true);
    });
});

describe('Rental Comparable Address Duplicate Validation (checkRentalComparableAddressDuplicates)', () => {
    const threeDistinctRentalData = {
        formType: '1004 + 1007',
        'Subject': { 'Address': '10 Parkside Ct, Wayne, NJ 07470' },
        'Comparable Rental Data': {
            'COMPARABLE NO. 1': {
                'Address': '4 Parkside Ct, Wayne, NJ 07470',
                'Monthly Rental': '2,500'
            },
            'COMPARABLE NO. 2': {
                'Address': '710 Brittany Dr, Wayne, NJ 07470',
                'Monthly Rental': '2,200'
            },
            'COMPARABLE NO. 3': {
                'Address': '36 Parkside Ct, Wayne, NJ 07470',
                'Monthly Rental': '2,000'
            }
        }
    };

    const duplicateRentalData = {
        formType: '1004 + 1007',
        'Subject': { 'Address': '10 Parkside Ct, Wayne, NJ 07470' },
        'Comparable Rental Data': {
            'COMPARABLE NO. 1': {
                'Address': '4 Parkside Ct, Wayne, NJ 07470',
                'Monthly Rental': '2,500'
            },
            'COMPARABLE NO. 2': {
                'Address': '4 Parkside Ct, Wayne, NJ 07470',
                'Monthly Rental': '2,200'
            },
            'COMPARABLE NO. 3': {
                'Address': '36 Parkside Ct, Wayne, NJ 07470',
                'Monthly Rental': '2,000'
            }
        }
    };

    test('passes (isMatch: true) when all rental comps have distinct addresses (like Image 2)', () => {
        const res1 = checkRentalComparableAddressDuplicates(
            'Address',
            '4 Parkside Ct, Wayne, NJ 07470',
            threeDistinctRentalData,
            ['COMPARABLE NO. 1', 'Address'],
            'COMPARABLE NO. 1',
            '1004 + 1007'
        );
        expect(res1).toEqual(expect.objectContaining({ isMatch: true }));
        expect(res1.message).toContain('Valid');

        const res2 = checkRentalComparableAddressDuplicates(
            'Address',
            '710 Brittany Dr, Wayne, NJ 07470',
            threeDistinctRentalData,
            ['COMPARABLE NO. 2', 'Address'],
            'COMPARABLE NO. 2',
            '1004 + 1007'
        );
        expect(res2).toEqual(expect.objectContaining({ isMatch: true }));
    });

    test('fails (isError: true) when two rental comparables share the same address', () => {
        const resComp1 = checkRentalComparableAddressDuplicates(
            'Address',
            '4 Parkside Ct, Wayne, NJ 07470',
            duplicateRentalData,
            ['COMPARABLE NO. 1', 'Address'],
            'COMPARABLE NO. 1',
            '1004 + 1007'
        );
        expect(resComp1).toEqual(expect.objectContaining({
            isError: true,
            message: expect.stringContaining('COMPARABLE NO. 2')
        }));

        const resComp2 = checkRentalComparableAddressDuplicates(
            'Address',
            '4 Parkside Ct, Wayne, NJ 07470',
            duplicateRentalData,
            ['COMPARABLE NO. 2', 'Address'],
            'COMPARABLE NO. 2',
            '1004 + 1007'
        );
        expect(resComp2).toEqual(expect.objectContaining({
            isError: true,
            message: expect.stringContaining('COMPARABLE NO. 1')
        }));

        const resComp3 = checkRentalComparableAddressDuplicates(
            'Address',
            '36 Parkside Ct, Wayne, NJ 07470',
            duplicateRentalData,
            ['COMPARABLE NO. 3', 'Address'],
            'COMPARABLE NO. 3',
            '1004 + 1007'
        );
        expect(resComp3).toEqual(expect.objectContaining({ isMatch: true }));
    });

    test('checkMinimumRentalComparables also returns error if duplicate address exists', () => {
        const res = checkMinimumRentalComparables(
            'Address',
            '4 Parkside Ct, Wayne, NJ 07470',
            duplicateRentalData,
            ['COMPARABLE NO. 1', 'Address'],
            'COMPARABLE NO. 1',
            '1004 + 1007'
        );
        expect(res).toEqual(expect.objectContaining({
            isError: true,
            message: expect.stringContaining('COMPARABLE NO. 2')
        }));
    });

    test('detects rental duplicates with Court vs Ct and formatting differences', () => {
        const data = {
            formType: '1007',
            'Comparable Rental Data': {
                'COMPARABLE NO. 1': { 'Address': '4 Parkside Court, Wayne, NJ 07470' },
                'COMPARABLE NO. 2': { 'Address': '4 Parkside Ct, Wayne,\nNJ 07470' }
            }
        };
        const res = checkRentalComparableAddressDuplicates(
            'Address',
            '4 Parkside Court, Wayne, NJ 07470',
            data,
            ['COMPARABLE NO. 1', 'Address'],
            'COMPARABLE NO. 1',
            '1007'
        );
        expect(res).toEqual(expect.objectContaining({ isError: true }));
    });

    test('skips Subject property (returns null)', () => {
        const res = checkRentalComparableAddressDuplicates(
            'Address',
            '10 Parkside Ct, Wayne, NJ 07470',
            threeDistinctRentalData,
            ['Subject', 'Address'],
            'Subject'
        );
        expect(res).toBeNull();
    });

    test('skips sales comps (returns null)', () => {
        const res = checkRentalComparableAddressDuplicates(
            'Address',
            '11 Parkside Ct, Wayne, NJ 07470',
            threeDistinctRentalData,
            ['COMPARABLE SALE #1', 'Address'],
            'COMPARABLE SALE #1'
        );
        expect(res).toBeNull();
    });

    test('returns null when address is blank or empty', () => {
        const res = checkRentalComparableAddressDuplicates(
            'Address',
            '',
            threeDistinctRentalData,
            ['COMPARABLE NO. 1', 'Address'],
            'COMPARABLE NO. 1'
        );
        expect(res).toBeNull();
    });

    test('works with fallback call signature (field, allData, saleName)', () => {
        const res = checkRentalComparableAddressDuplicates(
            'Address',
            threeDistinctRentalData,
            'COMPARABLE NO. 1'
        );
        expect(res).toEqual(expect.objectContaining({ isMatch: true }));
    });
});

describe('checkLeaseDates - Date Lease Begins and Date Lease Expires Formats', () => {
    describe('isValidLeaseDateFormat', () => {
        test('validates MM/dd/yyyy format (with / and -)', () => {
            expect(isValidLeaseDateFormat('05/11/2026')).toBe(true);
            expect(isValidLeaseDateFormat('5/11/2026')).toBe(true);
            expect(isValidLeaseDateFormat('11/30/2025')).toBe(true);
            expect(isValidLeaseDateFormat('05-11-2026')).toBe(true);
            expect(isValidLeaseDateFormat('11-30-2025')).toBe(true);
        });

        test('validates yyyy/mm/dd format (with / and -)', () => {
            expect(isValidLeaseDateFormat('2026-05-11')).toBe(true);
            expect(isValidLeaseDateFormat('2027-05-11')).toBe(true);
            expect(isValidLeaseDateFormat('2026-02-05')).toBe(true);
            expect(isValidLeaseDateFormat('2025-11-30')).toBe(true);
            expect(isValidLeaseDateFormat('2026/05/11')).toBe(true);
            expect(isValidLeaseDateFormat('2025/11/30')).toBe(true);
        });

        test('validates mm/yyyy format (with / and -)', () => {
            expect(isValidLeaseDateFormat('05/2026')).toBe(true);
            expect(isValidLeaseDateFormat('5/2026')).toBe(true);
            expect(isValidLeaseDateFormat('11/2025')).toBe(true);
            expect(isValidLeaseDateFormat('05-2026')).toBe(true);
        });

        test('validates yyyy/yyyy format (with / and -)', () => {
            expect(isValidLeaseDateFormat('2025/2026')).toBe(true);
            expect(isValidLeaseDateFormat('2026/2027')).toBe(true);
            expect(isValidLeaseDateFormat('2025-2026')).toBe(true);
            expect(isValidLeaseDateFormat('2026-2027')).toBe(true);
        });

        test('rejects invalid formats and non-calendar dates', () => {
            expect(isValidLeaseDateFormat('2026-15-01')).toBe(false);
            expect(isValidLeaseDateFormat('2026-02-31')).toBe(false);
            expect(isValidLeaseDateFormat('02/31/2026')).toBe(false);
            expect(isValidLeaseDateFormat('13/01/2026')).toBe(false);
            expect(isValidLeaseDateFormat('11-MAY-2026')).toBe(false);
            expect(isValidLeaseDateFormat('2026')).toBe(false);
            expect(isValidLeaseDateFormat('invalid')).toBe(false);
            expect(isValidLeaseDateFormat('')).toBe(false);
            expect(isValidLeaseDateFormat(null)).toBe(false);
        });
    });

    describe('checkLeaseDates for Comparable Rentals', () => {
        const mockAllData = {
            'Comparable Rental Data': {
                'COMPARABLE NO. 1': {
                    'Date Lease Begins': '2026-05-11',
                    'Date Lease Expires': '2027-05-11'
                },
                'COMPARABLE NO. 2': {
                    'Date Lease Begins': '2026-02-05',
                    'Date Lease Expires': '2027-02-05'
                },
                'COMPARABLE NO. 3': {
                    'Date Lease Begins': '2025-11-30',
                    'Date Lease Expires': '2026-11-30'
                }
            }
        };

        test('validates yyyy-mm-dd dates from screenshot as valid', () => {
            const res1 = checkLeaseDates('Date Lease Begins', '2026-05-11', mockAllData, ['COMPARABLE NO. 1', 'Date Lease Begins'], 'COMPARABLE NO. 1');
            expect(res1).toEqual({ isMatch: true });

            const res1Exp = checkLeaseDates('Date Lease Expires', '2027-05-11', mockAllData, ['COMPARABLE NO. 1', 'Date Lease Expires'], 'COMPARABLE NO. 1');
            expect(res1Exp).toEqual({ isMatch: true });

            const res2 = checkLeaseDates('Date Lease Begins', '2026-02-05', mockAllData, ['COMPARABLE NO. 2', 'Date Lease Begins'], 'COMPARABLE NO. 2');
            expect(res2).toEqual({ isMatch: true });

            const res3 = checkLeaseDates('Date Lease Begins', '2025-11-30', mockAllData, ['COMPARABLE NO. 3', 'Date Lease Begins'], 'COMPARABLE NO. 3');
            expect(res3).toEqual({ isMatch: true });
        });

        test('validates MM/dd/yyyy dates', () => {
            const data = {
                'Comparable Rental Data': {
                    'COMPARABLE NO. 1': {
                        'Date Lease Begins': '05/11/2026',
                        'Date Lease Expires': '05/11/2027'
                    }
                }
            };
            const res = checkLeaseDates('Date Lease Begins', '05/11/2026', data, ['COMPARABLE NO. 1', 'Date Lease Begins'], 'COMPARABLE NO. 1');
            expect(res).toEqual({ isMatch: true });
        });

        test('validates mm/yyyy dates', () => {
            const data = {
                'Comparable Rental Data': {
                    'COMPARABLE NO. 1': {
                        'Date Lease Begins': '05/2026',
                        'Date Lease Expires': '05/2027'
                    }
                }
            };
            const res = checkLeaseDates('Date Lease Begins', '05/2026', data, ['COMPARABLE NO. 1', 'Date Lease Begins'], 'COMPARABLE NO. 1');
            expect(res).toEqual({ isMatch: true });
        });

        test('validates yyyy/yyyy dates', () => {
            const data = {
                'Comparable Rental Data': {
                    'COMPARABLE NO. 1': {
                        'Date Lease Begins': '2025/2026',
                        'Date Lease Expires': '2026/2027'
                    }
                }
            };
            const res = checkLeaseDates('Date Lease Begins', '2025/2026', data, ['COMPARABLE NO. 1', 'Date Lease Begins'], 'COMPARABLE NO. 1');
            expect(res).toEqual({ isMatch: true });
        });

        test('returns error when date format is invalid', () => {
            const data = {
                'Comparable Rental Data': {
                    'COMPARABLE NO. 1': {
                        'Date Lease Begins': '11-MAY-2026',
                        'Date Lease Expires': '2027-05-11'
                    }
                }
            };
            const res = checkLeaseDates('Date Lease Begins', '11-MAY-2026', data, ['COMPARABLE NO. 1', 'Date Lease Begins'], 'COMPARABLE NO. 1');
            expect(res.isError).toBe(true);
            expect(res.message).toContain('must be in MM/dd/yyyy, yyyy/yyyy, mm/yyyy, or yyyy/mm/dd format');
        });

        test('returns error when Date Lease Begins is after Date Lease Expires', () => {
            const data = {
                'Comparable Rental Data': {
                    'COMPARABLE NO. 1': {
                        'Date Lease Begins': '2027-05-11',
                        'Date Lease Expires': '2026-05-11'
                    }
                }
            };
            const res = checkLeaseDates('Date Lease Begins', '2027-05-11', data, ['COMPARABLE NO. 1', 'Date Lease Begins'], 'COMPARABLE NO. 1');
            expect(res.isError).toBe(true);
            expect(res.message).toContain('must be before');
        });

        test('accepts N/A values', () => {
            const data = {
                'Comparable Rental Data': {
                    'COMPARABLE NO. 1': {
                        'Date Lease Begins': 'N/A',
                        'Date Lease Expires': 'N/A'
                    }
                }
            };
            const res = checkLeaseDates('Date Lease Begins', 'N/A', data, ['COMPARABLE NO. 1', 'Date Lease Begins'], 'COMPARABLE NO. 1');
            expect(res).toEqual({ isMatch: true });
        });

        test('returns error when Date Lease Expires is expired (previous to current date) for comparable', () => {
            const data = {
                'Comparable Rental Data': {
                    'COMPARABLE NO. 1': {
                        'Date Lease Begins': '2023-01-01',
                        'Date Lease Expires': '2024-01-01'
                    }
                }
            };
            const res = checkLeaseDates('Date Lease Expires', '2024-01-01', data, ['COMPARABLE NO. 1', 'Date Lease Expires'], 'COMPARABLE NO. 1');
            expect(res.isError).toBe(true);
            expect(res.message).toContain('cannot be expired / previous to current date');
        });

        test('returns error when only Date Lease Expires is entered and expired', () => {
            const data = {
                'Comparable Rental Data': {
                    'COMPARABLE NO. 1': {
                        'Date Lease Expires': '2020-05-11'
                    }
                }
            };
            const res = checkLeaseDates('Date Lease Expires', '2020-05-11', data, ['COMPARABLE NO. 1', 'Date Lease Expires'], 'COMPARABLE NO. 1');
            expect(res.isError).toBe(true);
            expect(res.message).toContain('cannot be expired / previous to current date');
        });

        test('passes when Date Lease Expires is unexpired (in the future)', () => {
            const data = {
                'Comparable Rental Data': {
                    'COMPARABLE NO. 1': {
                        'Date Lease Begins': '2026-05-11',
                        'Date Lease Expires': '2027-05-11'
                    }
                }
            };
            const res = checkLeaseDates('Date Lease Expires', '2027-05-11', data, ['COMPARABLE NO. 1', 'Date Lease Expires'], 'COMPARABLE NO. 1');
            expect(res).toEqual({ isMatch: true });
        });

        test('validates Subject Date Lease Expires cannot be expired', () => {
            const expiredSubjectData = {
                Subject: {
                    'Occupant': 'Tenant'
                },
                'Single Family Rent Schedule': {
                    'Date Lease Begins': '01/01/2023',
                    'Date Lease Expires': '01/01/2024'
                }
            };
            const resExpired = checkLeaseDates('Date Lease Expires', '01/01/2024', expiredSubjectData, ['Subject', 'Date Lease Expires'], 'Subject');
            expect(resExpired.isError).toBe(true);
            expect(resExpired.message).toContain('cannot be expired / previous to current date');

            const futureSubjectData = {
                Subject: {
                    'Occupant': 'Tenant'
                },
                'Single Family Rent Schedule': {
                    'Date Lease Begins': '05/11/2026',
                    'Date Lease Expires': '05/11/2027'
                }
            };
            const resFuture = checkLeaseDates('Date Lease Expires', '05/11/2027', futureSubjectData, ['Subject', 'Date Lease Expires'], 'Subject');
            expect(resFuture).toEqual({ isMatch: true });
        });
    });

    describe('isLeaseExpired helper', () => {
        const refDate = new Date('2026-11-18T12:00:00Z');

        test('checks yyyy/mm/dd and yyyy-mm-dd', () => {
            expect(isLeaseExpired('2025-11-30', refDate)).toBe(true);
            expect(isLeaseExpired('2026-11-17', refDate)).toBe(true);
            expect(isLeaseExpired('2026-11-18', refDate)).toBe(false);
            expect(isLeaseExpired('2027-05-11', refDate)).toBe(false);
        });

        test('checks MM/dd/yyyy and MM-dd-yyyy', () => {
            expect(isLeaseExpired('11/30/2025', refDate)).toBe(true);
            expect(isLeaseExpired('11/17/2026', refDate)).toBe(true);
            expect(isLeaseExpired('11/18/2026', refDate)).toBe(false);
            expect(isLeaseExpired('05/11/2027', refDate)).toBe(false);
        });

        test('checks mm/yyyy (expires end of month)', () => {
            expect(isLeaseExpired('10/2026', refDate)).toBe(true);
            expect(isLeaseExpired('11/2026', refDate)).toBe(false);
            expect(isLeaseExpired('05/2027', refDate)).toBe(false);
        });

        test('checks yyyy/yyyy (expires end of expiration year)', () => {
            expect(isLeaseExpired('2024/2025', refDate)).toBe(true);
            expect(isLeaseExpired('2025/2026', refDate)).toBe(false);
            expect(isLeaseExpired('2026/2027', refDate)).toBe(false);
        });

        test('returns false for empty or N/A values', () => {
            expect(isLeaseExpired('', refDate)).toBe(false);
            expect(isLeaseExpired('N/A', refDate)).toBe(false);
            expect(isLeaseExpired(null, refDate)).toBe(false);
        });
    });

    describe('Owner / Vacant validations for Monthly Rental and Adjusted Monthly Rent', () => {
        const ownerData = {
            formType: '1004 + 1007',
            Subject: {
                Occupant: 'Owner'
            },
            'Single Family Rent Schedule': {}
        };

        const vacantData = {
            formType: '1004 + 1007',
            Subject: {
                Occupant: 'Vacant'
            },
            'Single Family Rent Schedule': {}
        };

        const tenantData = {
            formType: '1004 + 1007',
            Subject: {
                Occupant: 'Tenant'
            },
            'Single Family Rent Schedule': {}
        };

        describe('checkSubjectMonthlyRental', () => {
            test('returns error when Occupant is Owner and Monthly Rental has a positive value (e.g. 100 from screenshot)', () => {
                const res = checkSubjectMonthlyRental('Monthly Rental', '100', ownerData, ['Subject', 'Monthly Rental'], 'Subject');
                expect(res.isError).toBe(true);
                expect(res.message).toBe("For Subject, 'Monthly Rental' must be blank or zero when Occupant is Owner.");
            });

            test('passes when Occupant is Owner and Monthly Rental is zero (0 or $ 0)', () => {
                const res0 = checkSubjectMonthlyRental('Monthly Rental', '0', ownerData, ['Subject', 'Monthly Rental'], 'Subject');
                expect(res0).toEqual({ isMatch: true });

                const resDollar0 = checkSubjectMonthlyRental('Monthly Rental', '$ 0', ownerData, ['Subject', 'Monthly Rental'], 'Subject');
                expect(resDollar0).toEqual({ isMatch: true });
            });

            test('passes when Occupant is Owner and Monthly Rental is blank', () => {
                const res = checkSubjectMonthlyRental('Monthly Rental', '', ownerData, ['Subject', 'Monthly Rental'], 'Subject');
                expect(res).toEqual({ isMatch: true });
            });

            test('passes when Occupant is Owner and Monthly Rental is N/A', () => {
                const res = checkSubjectMonthlyRental('Monthly Rental', 'N/A', ownerData, ['Subject', 'Monthly Rental'], 'Subject');
                expect(res).toEqual({ isMatch: true });
            });

            test('returns error when Occupant is Vacant and Monthly Rental has a value > 0', () => {
                const res = checkSubjectMonthlyRental('Monthly Rental', '1200', vacantData, ['Subject', 'Monthly Rental'], 'Subject');
                expect(res.isError).toBe(true);
                expect(res.message).toBe("For Subject, 'Monthly Rental' must be blank or zero when Occupant is Vacant.");
            });

            test('passes when Occupant is Vacant and Monthly Rental is blank or zero', () => {
                const resBlank = checkSubjectMonthlyRental('Monthly Rental', '', vacantData, ['Subject', 'Monthly Rental'], 'Subject');
                expect(resBlank).toEqual({ isMatch: true });

                const resZero = checkSubjectMonthlyRental('Monthly Rental', '0', vacantData, ['Subject', 'Monthly Rental'], 'Subject');
                expect(resZero).toEqual({ isMatch: true });
            });

            test('validates Tenant requires positive Monthly Rental', () => {
                const resValid = checkSubjectMonthlyRental('Monthly Rental', '1500', tenantData, ['Subject', 'Monthly Rental'], 'Subject');
                expect(resValid).toEqual({ isMatch: true });

                const resBlank = checkSubjectMonthlyRental('Monthly Rental', '', tenantData, ['Subject', 'Monthly Rental'], 'Subject');
                expect(resBlank.isError).toBe(true);
                expect(resBlank.message).toContain('must be present when Occupant is Tenant');
            });
        });

        describe('checkSubjectAdjustedMonthlyRent', () => {
            test('passes when Occupant is Owner and Adjusted Monthly Rent has 0 or $ 0 (from screenshot)', () => {
                const res0 = checkSubjectAdjustedMonthlyRent('Adjusted Monthly Rent', '0', ownerData, ['Subject', 'Adjusted Monthly Rent'], 'Subject');
                expect(res0).toEqual({ isMatch: true });

                const resDollar0 = checkSubjectAdjustedMonthlyRent('Adjusted Monthly Rent', '$ 0', ownerData, ['Subject', 'Adjusted Monthly Rent'], 'Subject');
                expect(resDollar0).toEqual({ isMatch: true });
            });

            test('returns error when Occupant is Owner and Adjusted Monthly Rent has a non-zero value', () => {
                const res = checkSubjectAdjustedMonthlyRent('Adjusted Monthly Rent', '1500', ownerData, ['Subject', 'Adjusted Monthly Rent'], 'Subject');
                expect(res.isError).toBe(true);
                expect(res.message).toBe("For Subject, 'Adjusted Monthly Rent' must be blank or zero when Occupant is Owner.");
            });

            test('passes when Occupant is Owner and Adjusted Monthly Rent is blank', () => {
                const res = checkSubjectAdjustedMonthlyRent('Adjusted Monthly Rent', '', ownerData, ['Subject', 'Adjusted Monthly Rent'], 'Subject');
                expect(res).toEqual({ isMatch: true });
            });

            test('passes when Occupant is Owner and Adjusted Monthly Rent is N/A', () => {
                const res = checkSubjectAdjustedMonthlyRent('Adjusted Monthly Rent', 'N/A', ownerData, ['Subject', 'Adjusted Monthly Rent'], 'Subject');
                expect(res).toEqual({ isMatch: true });
            });

            test('passes when Occupant is Vacant and Adjusted Monthly Rent is zero or blank', () => {
                const res0 = checkSubjectAdjustedMonthlyRent('Adjusted Monthly Rent', '0', vacantData, ['Subject', 'Adjusted Monthly Rent'], 'Subject');
                expect(res0).toEqual({ isMatch: true });

                const resBlank = checkSubjectAdjustedMonthlyRent('Adjusted Monthly Rent', '', vacantData, ['Subject', 'Adjusted Monthly Rent'], 'Subject');
                expect(resBlank).toEqual({ isMatch: true });
            });

            test('returns error when Occupant is Vacant and Adjusted Monthly Rent has a non-zero value', () => {
                const res = checkSubjectAdjustedMonthlyRent('Adjusted Monthly Rent', '500', vacantData, ['Subject', 'Adjusted Monthly Rent'], 'Subject');
                expect(res.isError).toBe(true);
                expect(res.message).toBe("For Subject, 'Adjusted Monthly Rent' must be blank or zero when Occupant is Vacant.");
            });

            test('validates Tenant requires positive Adjusted Monthly Rent', () => {
                const resValid = checkSubjectAdjustedMonthlyRent('Adjusted Monthly Rent', '1400', tenantData, ['Subject', 'Adjusted Monthly Rent'], 'Subject');
                expect(resValid).toEqual({ isMatch: true });

                const resZero = checkSubjectAdjustedMonthlyRent('Adjusted Monthly Rent', '0', tenantData, ['Subject', 'Adjusted Monthly Rent'], 'Subject');
                expect(resZero.isError).toBe(true);
                expect(resZero.message).toContain('must be a valid amount greater than 0');
            });
        });

        describe('checkSubjectUtilities (Owner, Vacant, or Tenant blank or zero allowed)', () => {
            test('passes when Occupant is Owner and Less: Utilities is zero ($ 0 or 0 from screenshot)', () => {
                const resDollar0 = checkSubjectUtilities('Less: Utilities', '$ 0', ownerData, ['Subject', 'Less: Utilities'], 'Subject');
                expect(resDollar0).toEqual({ isMatch: true });

                const res0 = checkSubjectUtilities('Less: Utilities', '0', ownerData, ['Subject', 'Less: Utilities'], 'Subject');
                expect(res0).toEqual({ isMatch: true });
            });

            test('passes when Occupant is Owner and Less: Utilities is blank or N/A', () => {
                const resBlank = checkSubjectUtilities('Less: Utilities', '', ownerData, ['Subject', 'Less: Utilities'], 'Subject');
                expect(resBlank).toEqual({ isMatch: true });

                const resNA = checkSubjectUtilities('Less: Utilities', 'N/A', ownerData, ['Subject', 'Less: Utilities'], 'Subject');
                expect(resNA).toEqual({ isMatch: true });
            });

            test('returns error when Occupant is Owner and Less: Utilities has a positive non-zero value', () => {
                const res = checkSubjectUtilities('Less: Utilities', '100', ownerData, ['Subject', 'Less: Utilities'], 'Subject');
                expect(res.isError).toBe(true);
                expect(res.message).toBe("For Subject, 'Less: Utilities' must be blank or zero when Occupant is Owner.");
            });

            test('passes when Occupant is Vacant and Less: Utilities is blank or zero', () => {
                const resBlank = checkSubjectUtilities('Less: Utilities', '', vacantData, ['Subject', 'Less: Utilities'], 'Subject');
                expect(resBlank).toEqual({ isMatch: true });

                const res0 = checkSubjectUtilities('Less: Utilities', '0', vacantData, ['Subject', 'Less: Utilities'], 'Subject');
                expect(res0).toEqual({ isMatch: true });
            });

            test('returns error when Occupant is Vacant and Less: Utilities has a positive non-zero value', () => {
                const res = checkSubjectUtilities('Less: Utilities', '50', vacantData, ['Subject', 'Less: Utilities'], 'Subject');
                expect(res.isError).toBe(true);
                expect(res.message).toBe("For Subject, 'Less: Utilities' must be blank or zero when Occupant is Vacant.");
            });

            test('passes when Occupant is Tenant and Less: Utilities is blank, zero, or a positive amount', () => {
                const resBlank = checkSubjectUtilities('Less: Utilities', '', tenantData, ['Subject', 'Less: Utilities'], 'Subject');
                expect(resBlank).toEqual({ isMatch: true });

                const res0 = checkSubjectUtilities('Less: Utilities', '0', tenantData, ['Subject', 'Less: Utilities'], 'Subject');
                expect(res0).toEqual({ isMatch: true });

                const resDollar0 = checkSubjectUtilities('Less: Utilities', '$ 0', tenantData, ['Subject', 'Less: Utilities'], 'Subject');
                expect(resDollar0).toEqual({ isMatch: true });

                const resPos = checkSubjectUtilities('Less: Utilities', '75', tenantData, ['Subject', 'Less: Utilities'], 'Subject');
                expect(resPos).toEqual({ isMatch: true });
            });

            test('returns error when Occupant is Tenant and Less: Utilities is negative', () => {
                const resNeg = checkSubjectUtilities('Less: Utilities', '-20', tenantData, ['Subject', 'Less: Utilities'], 'Subject');
                expect(resNeg.isError).toBe(true);
                expect(resNeg.message).toContain('must be a valid amount (0 or greater) or blank');
            });
        });

        describe('checkSubjectFurniture (Owner, Vacant, or Tenant blank or zero allowed)', () => {
            test('passes when Occupant is Owner and Furniture is zero (0 from screenshot)', () => {
                const res0 = checkSubjectFurniture('Furniture', '0', ownerData, ['Subject', 'Furniture'], 'Subject');
                expect(res0).toEqual({ isMatch: true });
            });

            test('passes when Occupant is Owner and Furniture is blank or N/A', () => {
                const resBlank = checkSubjectFurniture('Furniture', '', ownerData, ['Subject', 'Furniture'], 'Subject');
                expect(resBlank).toEqual({ isMatch: true });

                const resNA = checkSubjectFurniture('Furniture', 'N/A', ownerData, ['Subject', 'Furniture'], 'Subject');
                expect(resNA).toEqual({ isMatch: true });
            });

            test('returns error when Occupant is Owner and Furniture has a positive non-zero value', () => {
                const res = checkSubjectFurniture('Furniture', '100', ownerData, ['Subject', 'Furniture'], 'Subject');
                expect(res.isError).toBe(true);
                expect(res.message).toBe("For Subject, 'Furniture' must be blank or zero when Occupant is Owner.");
            });

            test('passes when Occupant is Vacant and Furniture is blank or zero', () => {
                const resBlank = checkSubjectFurniture('Furniture', '', vacantData, ['Subject', 'Furniture'], 'Subject');
                expect(resBlank).toEqual({ isMatch: true });

                const res0 = checkSubjectFurniture('Furniture', '0', vacantData, ['Subject', 'Furniture'], 'Subject');
                expect(res0).toEqual({ isMatch: true });
            });

            test('returns error when Occupant is Vacant and Furniture has a positive non-zero value', () => {
                const res = checkSubjectFurniture('Furniture', '50', vacantData, ['Subject', 'Furniture'], 'Subject');
                expect(res.isError).toBe(true);
                expect(res.message).toBe("For Subject, 'Furniture' must be blank or zero when Occupant is Vacant.");
            });

            test('passes when Occupant is Tenant and Furniture is blank, zero, or a positive amount', () => {
                const resBlank = checkSubjectFurniture('Furniture', '', tenantData, ['Subject', 'Furniture'], 'Subject');
                expect(resBlank).toEqual({ isMatch: true });

                const res0 = checkSubjectFurniture('Furniture', '0', tenantData, ['Subject', 'Furniture'], 'Subject');
                expect(res0).toEqual({ isMatch: true });

                const resPos = checkSubjectFurniture('Furniture', '150', tenantData, ['Subject', 'Furniture'], 'Subject');
                expect(resPos).toEqual({ isMatch: true });
            });

            test('returns error when Occupant is Tenant and Furniture is negative', () => {
                const resNeg = checkSubjectFurniture('Furniture', '-10', tenantData, ['Subject', 'Furniture'], 'Subject');
                expect(resNeg.isError).toBe(true);
                expect(resNeg.message).toContain('must be a valid amount (0 or greater) or blank');
            });
        });
    });
});
