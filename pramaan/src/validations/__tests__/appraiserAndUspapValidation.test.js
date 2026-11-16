import {
    checkSupervisoryAppraiserFields,
    checkReasonableExposureTime,
    checkAppraiserInspection,
    checkUspapReportingOption,
    checkSignatureDateVsEffectiveDate,
    checkUadAndCertificationAddenda,
    extractPageNumbers
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

    describe('checkSignatureDateVsEffectiveDate', () => {
        const certData = {
            CERTIFICATION: {
                'Date of Signature and Report': '11/12/2026',
                'Effective Date of Appraisal': '11/10/2026'
            }
        };

        test('returns null for irrelevant fields or when dates are missing', () => {
            expect(checkSignatureDateVsEffectiveDate('Appraiser Name', 'John Doe', certData)).toBeNull();
            expect(checkSignatureDateVsEffectiveDate('Date of Signature and Report', '', {})).toBeNull();
            expect(checkSignatureDateVsEffectiveDate('Date of Signature and Report', '11/12/2026', {})).toBeNull();
        });

        test('passes when signature date is strictly greater than effective date', () => {
            const sigRes = checkSignatureDateVsEffectiveDate('Date of Signature and Report', '11/12/2026', certData);
            expect(sigRes.isMatch).toBe(true);
            expect(sigRes.isError).toBeFalsy();
            expect(sigRes.message).toContain('greater than Effective Date');

            const effRes = checkSignatureDateVsEffectiveDate('Effective Date of Appraisal', '11/10/2026', certData);
            expect(effRes.isMatch).toBe(true);
            expect(effRes.isError).toBeFalsy();
        });

        test('fails when signature date is earlier than effective date', () => {
            const invalidData = {
                CERTIFICATION: {
                    'Date of Signature and Report': '11/08/2026',
                    'Effective Date of Appraisal': '11/10/2026'
                }
            };
            const res = checkSignatureDateVsEffectiveDate('Date of Signature and Report', '11/08/2026', invalidData);
            expect(res.isError).toBe(true);
            expect(res.message).toBe("The signature date (11/08/2026) should always be greater than the effective date (11/10/2026) in the certification section.");
        });

        test('fails when signature date is equal to effective date', () => {
            const sameDateData = {
                CERTIFICATION: {
                    'Date of Signature and Report': '11/10/2026',
                    'Effective Date of Appraisal': '11/10/2026'
                }
            };
            const res = checkSignatureDateVsEffectiveDate('Date of Signature and Report', '11/10/2026', sameDateData);
            expect(res.isError).toBe(true);
            expect(res.message).toBe("The signature date (11/10/2026) should always be greater than the effective date (11/10/2026) in the certification section.");
        });

        test('supports various date formats including ISO and 2-digit years', () => {
            const isoData = {
                CERTIFICATION: {
                    'Date of Signature and Report': '2026-11-15',
                    'Effective Date of Appraisal': '11/10/26'
                }
            };
            const res = checkSignatureDateVsEffectiveDate('Date of Signature and Report', '2026-11-15', isoData);
            expect(res.isMatch).toBe(true);
        });
    });

    describe('UAD & Certification Addenda Compulsory Pages Validation', () => {
        test('extractPageNumbers parses arrays, single page strings, and multi-page strings', () => {
            expect(extractPageNumbers(null, [6])).toEqual([6]);
            expect(extractPageNumbers('Present (Page 6)', [])).toEqual([6]);
            expect(extractPageNumbers('Present (Pages 7, 8)', [])).toEqual([7, 8]);
            expect(extractPageNumbers('Present (Pages 33, 34, 35)', [])).toEqual([33, 34, 35]);
            expect(extractPageNumbers('Not Present', [])).toEqual([]);
            expect(extractPageNumbers('', [])).toEqual([]);
        });

        test('passes when UAD & Certification Addenda is not present', () => {
            const notPresentData = {
                'UAD pages present in the report': 'Not Present',
                has_uad_pages: false
            };
            const res = checkUadAndCertificationAddenda('UAD pages present in the report', 'Not Present', notPresentData);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
            expect(res.message).toContain('not present');
        });

        test('passes when all 3 compulsory items are present with required page counts', () => {
            const validData = {
                has_uad_pages: true,
                'UAD pages present in the report': 'Present (Pages 33, 34, 35)',
                uad_details: {
                    limiting_conditions_pages: [6],
                    certification_pages: [7, 8],
                    uad_pages: [33, 34, 35]
                }
            };
            const res = checkUadAndCertificationAddenda('UAD pages present in the report', 'Present (Pages 33, 34, 35)', validData);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
            expect(res.message).toContain('is valid');
            expect(res.message).toContain('Limiting Conditions (1 page)');
            expect(res.message).toContain('Appraiser Certification (2 pages)');
            expect(res.message).toContain('UAD Definitions Addendum (3 pages)');
        });

        test('passes using string metadata without raw arrays', () => {
            const validStringData = {
                'UAD pages present in the report': 'Present (Pages 33, 34, 35)',
                'Limiting Conditions': 'Present (Page 6)',
                'Appraiser Certification': 'Present (Pages 7, 8)',
                'UAD Definitions Addendum': 'Present (Pages 33, 34, 35)'
            };
            const res = checkUadAndCertificationAddenda('UAD pages present in the report', 'Present (Pages 33, 34, 35)', validStringData);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
        });

        test('fails when Limiting Conditions is missing (0 pages)', () => {
            const missingLimitingData = {
                has_uad_pages: true,
                'UAD pages present in the report': 'Present (Pages 33, 34, 35)',
                uad_details: {
                    limiting_conditions_pages: [],
                    certification_pages: [7, 8],
                    uad_pages: [33, 34, 35]
                }
            };
            const res = checkUadAndCertificationAddenda('UAD pages present in the report', 'Present', missingLimitingData);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Limiting Conditions requires 1 page (not present)');
        });

        test('fails when Appraiser Certification has only 1 page (requires 2)', () => {
            const oneCertPageData = {
                has_uad_pages: true,
                'UAD pages present in the report': 'Present (Pages 33, 34, 35)',
                uad_details: {
                    limiting_conditions_pages: [6],
                    certification_pages: [7],
                    uad_pages: [33, 34, 35]
                }
            };
            const res = checkUadAndCertificationAddenda('UAD pages present in the report', 'Present', oneCertPageData);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Appraiser Certification requires 2 pages (found 1 page)');
        });

        test('fails when UAD Definitions Addendum has only 2 pages (requires 3)', () => {
            const twoUadPagesData = {
                has_uad_pages: true,
                'UAD pages present in the report': 'Present (Pages 33, 34)',
                uad_details: {
                    limiting_conditions_pages: [6],
                    certification_pages: [7, 8],
                    uad_pages: [33, 34]
                }
            };
            const res = checkUadAndCertificationAddenda('UAD pages present in the report', 'Present', twoUadPagesData);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('UAD Definitions Addendum requires 3 pages (found 2 pages)');
        });

        test('fails with all errors when all 3 sections are missing while UAD is marked present', () => {
            const allMissingData = {
                has_uad_pages: true,
                'UAD pages present in the report': 'Present',
                uad_details: {
                    limiting_conditions_pages: [],
                    certification_pages: [],
                    uad_pages: []
                }
            };
            const res = checkUadAndCertificationAddenda('UAD pages present in the report', 'Present', allMissingData);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Limiting Conditions requires 1 page');
            expect(res.message).toContain('Appraiser Certification requires 2 pages');
            expect(res.message).toContain('UAD Definitions Addendum requires 3 pages');
        });
    });
});

