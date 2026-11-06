import {
    checkSupervisoryAppraiserFields,
    checkReasonableExposureTime,
    checkAppraiserInspection,
    checkUspapReportingOption
} from '../appraiserLenderValidation';

describe('Appraiser, Supervisory Appraiser, and USPAP Validations', () => {
    describe('checkSupervisoryAppraiserFields', () => {
        test('returns null when supervisory fields are empty or not present', () => {
            expect(checkSupervisoryAppraiserFields('Supervisory Name', '', {}, ['Supervisory Name'])).toBeNull();
            expect(checkSupervisoryAppraiserFields('Supervisory Name', null, {}, ['Supervisory Name'])).toBeNull();
            expect(checkSupervisoryAppraiserFields('Supervisory Name', 'Not Present', {}, ['Supervisory Name'])).toBeNull();
            expect(checkSupervisoryAppraiserFields('Supervisory Name', 'None', {}, ['Supervisory Name'])).toBeNull();
            expect(checkSupervisoryAppraiserFields('Supervisory Name', 'N/A', {}, ['Supervisory Name'])).toBeNull();
        });

        test('returns isError: true when supervisory fields are filled (requiring review / red)', () => {
            const res = checkSupervisoryAppraiserFields('Supervisory Name', 'August Banach', {}, ['Supervisory Name']);
            expect(res).not.toBeNull();
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Supervisory Appraiser is filled');
            expect(res.message).toContain('August Banach');
            expect(res.message).toContain('requires review');
        });

        test('returns null for non-supervisory fields', () => {
            expect(checkSupervisoryAppraiserFields('Name', 'Amber Vanderstice', {}, ['Name'])).toBeNull();
        });
    });

    describe('checkReasonableExposureTime', () => {
        test('validates valid reasonable exposure time values', () => {
            const res1 = checkReasonableExposureTime('Reasonable Exposure Time', '1 to 90 days');
            expect(res1.isMatch).toBe(true);

            const res2 = checkReasonableExposureTime('Reasonable Exposure Time', '1 - 4 months.');
            expect(res2.isMatch).toBe(true);

            const res3 = checkReasonableExposureTime('Reasonable Exposure Time', '90-220 day(s)');
            expect(res3.isMatch).toBe(true);
        });

        test('returns error when blank', () => {
            const res = checkReasonableExposureTime('Reasonable Exposure Time', '');
            expect(res.isError).toBe(true);
            expect(res.skipBlankFilter).toBe(true);
        });

        test('returns error when definition boilerplate is captured instead of actual time', () => {
            const res = checkReasonableExposureTime('Reasonable Exposure Time', '[USPAP defines Exposure Time as the estimated length of time that the property interest being');
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Definition boilerplate');
        });
    });

    describe('checkAppraiserInspection', () => {
        test('validates interior and exterior inspection as verified', () => {
            const res = checkAppraiserInspection('Appraiser Did inspect interior and exterior of subject property', 'Yes');
            expect(res.isMatch).toBe(true);
            expect(res.message).toContain('inspected interior and exterior');
        });

        test('flags warning if appraiser did not inspect', () => {
            const res = checkAppraiserInspection('Appraiser Did not inspect subject property', 'Yes');
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Did not inspect');
        });

        test('returns isMatch: true when did not inspect is No', () => {
            const res = checkAppraiserInspection('Appraiser Did not inspect subject property', 'No');
            expect(res.isMatch).toBe(true);
        });
    });

    describe('checkUspapReportingOption', () => {
        test('validates Appraisal Report', () => {
            const res = checkUspapReportingOption('USPAP Reporting Option', 'Appraisal Report');
            expect(res.isMatch).toBe(true);
        });

        test('validates Appraisal Report with standard rule 2-2(a)', () => {
            const res = checkUspapReportingOption('USPAP Reporting Option', 'Appraisal Report (USPAP Standards Rule 2-2(a))');
            expect(res.isMatch).toBe(true);
        });

        test('requires explanation comment for Restricted Appraisal Report', () => {
            const resWithoutComment = checkUspapReportingOption('USPAP Reporting Option', 'Restricted Appraisal Report', {});
            expect(resWithoutComment.isError).toBe(true);

            const resWithComment = checkUspapReportingOption('USPAP Reporting Option', 'Restricted Appraisal Report', {
                'Comments on Appraisal and Report Identification': 'This is a restricted appraisal for client only.'
            });
            expect(resWithComment.isMatch).toBe(true);
        });
    });
});

