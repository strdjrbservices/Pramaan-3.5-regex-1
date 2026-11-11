import {
    checkFiveValuesConsistency,
    checkVersion1UtilitySubfields,
    checkZoningClassificationDescription,
    checkSiteSizesConsistency,
    checkVersion1EffectiveDatesConsistency,
    checkAboveGradeFinishedAreaConsistency,
    checkYearBuiltConsistency,
    checkAppraiserNameConsistency,
    checkVersion1ComparableListingStatusConsistency,
    checkVersion1ComparableTransferTermsConsistency,
    checkVersion1YearBuiltAdjustmentConsistency,
    checkVersion1ConstructionMethodAdjustmentConsistency,
    checkVersion1SiteSizeAdjustmentConsistency,
    checkVersion1LocationAdjustmentConsistency,
    checkVersion1AttachedDetachedAdjustmentConsistency,
    checkVersion1HeatingAdjustmentConsistency,
    checkVersion1AmenitiesAdjustmentConsistency,
    checkVersion1QualityConditionConsistency,
    checkVersion1AreaAdjustmentConsistency,
    checkVersion1OverallQualityConditionAdjustmentConsistency,
    checkVersion1VehicleStorageAdjustmentConsistency
} from '../appraisalVersion1Validation';

describe('appraisalVersion1Validation', () => {
    describe('checkFiveValuesConsistency', () => {
        test('returns match when all 5 values match for Version 1', () => {
            const data = {
                formType: 'Appraisal Version #1',
                RECONCILIATION: {
                    'Sales Comparison Approach Indicated Value': '$350,000',
                    'Opinion of Market Value': '$350,000'
                },
                SUMMARY: {
                    'Opinion of Market Value': '$350,000',
                    'Median Sale Price': '$350,000'
                },
                SALES_TRANSFER: {
                    'Indicated Value by Sales Comparison Approach $': '$350,000'
                }
            };
            const res = checkFiveValuesConsistency('Opinion of Market Value', '$350,000', data);
            expect(res).toEqual({ isMatch: true, message: 'validated' });
        });

        test('returns error when values mismatch', () => {
            const data = {
                formType: 'Appraisal Version #1',
                RECONCILIATION: {
                    'Sales Comparison Approach Indicated Value': '$350,000',
                    'Opinion of Market Value': '$350,000'
                },
                SUMMARY: {
                    'Opinion of Market Value': '$360,000',
                    'Median Sale Price': '$350,000'
                },
                SALES_TRANSFER: {
                    'Indicated Value by Sales Comparison Approach $': '$350,000'
                }
            };
            const res = checkFiveValuesConsistency('Opinion of Market Value', '$360,000', data);
            expect(res?.isError).toBe(true);
            expect(res?.message).toContain('values is not same');
        });

        test('returns null for non-V1 form', () => {
            const data = { formType: '1004' };
            expect(checkFiveValuesConsistency('Opinion of Market Value', '300000', data)).toBeNull();
        });
    });

    describe('checkZoningClassificationDescription', () => {
        test('flags agricultural keywords as critical error', () => {
            const res = checkZoningClassificationDescription('Zoning Classification Description', 'Agricultural use only');
            expect(res?.isError).toBe(true);
            expect(res?.message).toContain('Critical Field');
        });

        test('returns match for standard residential zoning', () => {
            const res = checkZoningClassificationDescription('Zoning Classification Description', 'R-1 Single Family Residential');
            expect(res?.isMatch).toBe(true);
        });
    });

    describe('checkSiteSizesConsistency', () => {
        test('matches equivalent site sizes with formatting differences', () => {
            const data = {
                Subject: { 'Site Size': '10,000 sq ft' },
                SITE: {
                    'Total Site Size': '10000 sf',
                    'Parcel Size': '10,000 square feet'
                }
            };
            const res = checkSiteSizesConsistency('Site Size', '10,000 sq ft', data);
            expect(res).toEqual({ isMatch: true });
        });

        test('flags error when site sizes differ', () => {
            const data = {
                Subject: { 'Site Size': '10,000 sq ft' },
                SITE: {
                    'Total Site Size': '12,000 sq ft',
                    'Parcel Size': '10,000 sq ft'
                }
            };
            const res = checkSiteSizesConsistency('Site Size', '10,000 sq ft', data);
            expect(res?.isError).toBe(true);
        });
    });

    describe('checkAboveGradeFinishedAreaConsistency', () => {
        test('matches GLA between Improvements and Subject in Sales Grid', () => {
            const data = {
                'Above Grade Finished Area': '2,450 sq ft',
                Subject: { 'Finished Area Above Grade': '2450 sf' }
            };
            const res = checkAboveGradeFinishedAreaConsistency('Finished Area Above Grade', '2450 sf', data);
            expect(res).toEqual({ isMatch: true });
        });

        test('flags mismatch in GLA', () => {
            const data = {
                'Above Grade Finished Area': '2,450 sq ft',
                Subject: { 'Finished Area Above Grade': '2600 sf' }
            };
            const res = checkAboveGradeFinishedAreaConsistency('Finished Area Above Grade', '2600 sf', data);
            expect(res?.isError).toBe(true);
        });
    });

    describe('checkYearBuiltConsistency', () => {
        test('matches year built between sections', () => {
            const data = {
                'Year Built': '2005',
                Subject: { 'Year Built': '2005' }
            };
            const res = checkYearBuiltConsistency('Year Built', '2005', data);
            expect(res).toEqual({ isMatch: true });
        });

        test('flags mismatch in Year Built', () => {
            const data = {
                'Year Built': '2005',
                Subject: { 'Year Built': '2008' }
            };
            const res = checkYearBuiltConsistency('Year Built', '2008', data);
            expect(res?.isError).toBe(true);
        });
    });

    describe('checkAppraiserNameConsistency', () => {
        test('matches appraiser names across Contact and Certification', () => {
            const data = {
                'Appraiser Name': 'John Doe',
                CERTIFICATION: { 'Appraiser Name': 'John Doe' }
            };
            const res = checkAppraiserNameConsistency('Appraiser Name', 'John Doe', data);
            expect(res).toEqual({ isMatch: true });
        });

        test('flags error when appraiser names differ', () => {
            const data = {
                'Appraiser Name': 'John Doe',
                CERTIFICATION: { 'Appraiser Name': 'Jane Smith' }
            };
            const res = checkAppraiserNameConsistency('Appraiser Name', 'John Doe', data);
            expect(res?.isError).toBe(true);
        });
    });

    describe('checkVersion1UtilitySubfields', () => {
        test('requires subfield when utility is private and field is blank', () => {
            const data = { SITE: { Water: 'Private' } };
            const res = checkVersion1UtilitySubfields('Water Detail', '', data);
            expect(res?.isError).toBe(true);
            expect(res?.message).toContain('should not be blank');
        });

        test('returns null when utility is public', () => {
            const data = { SITE: { Water: 'Public' } };
            const res = checkVersion1UtilitySubfields('Water Detail', '', data);
            expect(res).toBeNull();
        });
    });

    describe('Comparable Adjustments', () => {
        test('Year Built: matches when adjustment is present for different year built', () => {
            const data = {
                Subject: { 'Year Built': '2000' },
                'COMPARABLE SALE #1': { 'Year Built': '1995', 'Year Built Adjustment': '-5000' }
            };
            const res = checkVersion1YearBuiltAdjustmentConsistency('Year Built', '1995', data, ['COMPARABLE SALE #1', 'Year Built'], 'COMPARABLE SALE #1');
            expect(res).toEqual({ isMatch: true });
        });

        test('Year Built: requires adjustment when year differs and adjustment is blank', () => {
            const data = {
                Subject: { 'Year Built': '2000' },
                'COMPARABLE SALE #1': { 'Year Built': '1995', 'Year Built Adjustment': '' }
            };
            const res = checkVersion1YearBuiltAdjustmentConsistency('Year Built', '1995', data, ['COMPARABLE SALE #1', 'Year Built'], 'COMPARABLE SALE #1');
            expect(res?.isError).toBe(true);
        });

        test('Site Size: requires adjustment when size differs and adjustment is blank', () => {
            const data = {
                Subject: { 'Site Size': '10000' },
                'COMPARABLE SALE #1': { 'Site Size': '15000', 'Site Size Adjustment': '' }
            };
            const res = checkVersion1SiteSizeAdjustmentConsistency('Site Size', '15000', data, ['COMPARABLE SALE #1', 'Site Size'], 'COMPARABLE SALE #1');
            expect(res?.isError).toBe(true);
        });

        test('Construction Method: matches when methods match without adjustment', () => {
            const data = {
                Subject: { 'Construction Method': 'Site Built' },
                'COMPARABLE SALE #1': { 'Construction Method': 'Site Built', 'Construction Method Adjustment': '' }
            };
            const res = checkVersion1ConstructionMethodAdjustmentConsistency('Construction Method', 'Site Built', data, ['COMPARABLE SALE #1', 'Construction Method'], 'COMPARABLE SALE #1');
            expect(res).toEqual({ isMatch: true });
        });

        test('Vehicle Storage: requires adjustment when spaces or type differ', () => {
            const data = {
                Subject: { 'Vehicle Storage Type': 'Garage', 'Vehicle Storage Spaces': '2' },
                'COMPARABLE SALE #1': { 'Vehicle Storage Type': 'Garage', 'Vehicle Storage Spaces': '1', 'Vehicle Storage Adjustment': '' }
            };
            const res = checkVersion1VehicleStorageAdjustmentConsistency('Vehicle Storage Spaces', '1', data, ['COMPARABLE SALE #1', 'Vehicle Storage Spaces'], 'COMPARABLE SALE #1');
            expect(res?.isError).toBe(true);
        });
    });
});

