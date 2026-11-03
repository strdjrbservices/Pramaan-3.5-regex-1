import { checkOtherBasement, checkRentOtherBasementAdjustment, checkMinimumRentalComparables, getPresentRentalCompsCount, isRentalCompPresent } from '../rentScheduleValidation';

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
            message: 'minimum 3 rental comparables will be present'
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
            message: 'minimum 3 rental comparables will be present'
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
