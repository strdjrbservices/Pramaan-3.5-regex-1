import {
    checkStateRequirements,
    checkCoDetectorInstalled,
    checkGeorgiaAmcNumber,
    checkGeorgiaCoDetector,
    checkIllinoisMandatoryStatement,
    checkAmcLicense,
    checkAmcFee
} from '../stateValidation';

describe('State-Wise Appraisal Report Validation', () => {
    describe('Wisconsin (WI)', () => {
        test('WI with both invoice and CO detector installed should pass', () => {
            const data = {
                'Subject': {
                    'State': 'WI',
                    'CO detector comment': 'Smoke and carbon monoxide detectors are installed and operable.'
                },
                'has_invoice': true
            };
            const res = checkStateRequirements('State', 'WI', data);
            expect(res).toEqual({
                isMatch: true,
                message: 'All state requirements for WI appear to be met.'
            });
        });

        test('WI missing CO detector should report "Appraiser to confirm CO detector(s) are installed."', () => {
            const data = {
                'Subject': {
                    'State': 'WI'
                },
                'has_invoice': true
            };
            const res = checkStateRequirements('State', 'WI', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Appraiser to confirm CO detector(s) are installed');
            expect(res.message).not.toContain('Please attach a copy of invoice');
        });

        test('WI missing invoice should report "Please attach a copy of invoice to the report."', () => {
            const data = {
                'Subject': {
                    'State': 'WI',
                    'CO detector comment': 'CO detector installed in hallway.'
                }
            };
            const res = checkStateRequirements('State', 'WI', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Please attach a copy of invoice to the report');
            expect(res.message).not.toContain('Appraiser to confirm CO detector(s) are installed');
        });

        test('WI missing both invoice and CO detector should report both', () => {
            const data = {
                'Subject': {
                    'State': 'WI'
                }
            };
            const res = checkStateRequirements('State', 'WI', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Please attach a copy of invoice to the report');
            expect(res.message).toContain('Appraiser to confirm CO detector(s) are installed');
        });

        test('WI with negative comment (not installed) should fail CO detector requirement', () => {
            const data = {
                'Subject': {
                    'State': 'WI',
                    'CO detector comment': 'Carbon monoxide detector not installed at inspection.'
                },
                'has_invoice': true
            };
            expect(checkCoDetectorInstalled(data)).toBe(false);
            const res = checkStateRequirements('State', 'WI', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Appraiser to confirm CO detector(s) are installed');
        });
    });

    describe('Georgia (GA)', () => {
        test('GA with AMC # 289 and appraiser fee should pass if built <= 2008', () => {
            const data = {
                'Subject': {
                    'State': 'GA',
                    'Appraiser Fee': '$450.00',
                    'AMC #': '289',
                    'Year Built': '2005'
                }
            };
            expect(checkGeorgiaAmcNumber(data)).toBe(true);
            expect(checkGeorgiaCoDetector(data)).toBe(true);
            const res = checkStateRequirements('State', 'GA', data);
            expect(res).toEqual({
                isMatch: true,
                message: 'All state requirements for GA appear to be met.'
            });
        });

        test('GA built after 2008 requires CO detectors in general sleeping areas', () => {
            const data = {
                'Subject': {
                    'State': 'GA',
                    'Appraiser Fee': '$450.00',
                    'AMC #': '289',
                    'Year Built': '2015'
                }
            };
            expect(checkGeorgiaCoDetector(data)).toBe(false);
            const res = checkStateRequirements('State', 'GA', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('For properties built after 2008, Georgia requires carbon monoxide detectors');
        });

        test('GA missing AMC # 289 should reject', () => {
            const data = {
                'Subject': {
                    'State': 'GA',
                    'Appraiser Fee': '$450.00',
                    'AMC #': '558000312',
                    'Year Built': '2005'
                }
            };
            expect(checkGeorgiaAmcNumber(data)).toBe(false);
            const res = checkStateRequirements('State', 'GA', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Please include AMC Number 289 in the report');
        });
    });

    describe('Illinois (IL)', () => {
        test('IL missing AMC License # 558000312 / 12/31/2026 should reject with exact comment', () => {
            const data = {
                'Subject': {
                    'State': 'IL',
                    'Appraiser Fee': '$450',
                    'CO detector comment': 'Carbon monoxide detector present'
                },
                'raw': 'Home Inspector License Act [225 ILCS 441]'
            };
            const res = checkStateRequirements('State', 'IL', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Please include our AMC License # 558000312 and Expiration date 12/31/2026 in the report');
        });

        test('IL missing mandatory statement should report 225 ILCS 441 missing', () => {
            const data = {
                'Subject': {
                    'State': 'IL',
                    'Appraiser Fee': '$450',
                    'AMC License #': '558000312',
                    'Expiration Date of Certification or License': '12/31/2026',
                    'CO detector comment': 'Carbon monoxide detector present'
                }
            };
            expect(checkIllinoisMandatoryStatement(data)).toBe(false);
            const res = checkStateRequirements('State', 'IL', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Mandatory Illinois statement regarding Home Inspector License Act [225 ILCS 441]');
        });
    });

    describe('Oklahoma (OK)', () => {
        test('OK passes without rejection regardless of invoice', () => {
            const data = { 'Subject': { 'State': 'OK' } };
            const res = checkStateRequirements('State', 'OK', data);
            expect(res.isMatch).toBe(true);
            expect(res.message).toContain('Invoice included or omitted without rejection');
        });
    });

    describe('New York (NY)', () => {
        test('NY Plaza Home Mortgage is exempt from invoice requirement', () => {
            const data = {
                'Subject': {
                    'State': 'NY',
                    'Lender/Client': 'Plaza Home Mortgage, Inc.'
                }
            };
            const res = checkStateRequirements('State', 'NY', data);
            expect(res.isMatch).toBe(true);
        });

        test('NY non-Plaza without invoice should reject', () => {
            const data = {
                'Subject': {
                    'State': 'NY',
                    'Lender/Client': 'Chase Bank'
                }
            };
            const res = checkStateRequirements('State', 'NY', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Please attach a copy of the invoice to the report');
        });
    });

    describe('AMC License Validation', () => {
        test('rejects false-positive keywords like tration or istration', () => {
            expect(checkAmcLicense({ 'Subject': { 'AMC License #': 'tration' } })).toBe(false);
            expect(checkAmcLicense({ 'Subject': { 'AMC License #': 'istration' } })).toBe(false);
            expect(checkAmcLicense({ 'Subject': { 'AMC License #': 'registration' } })).toBe(false);
        });

        test('accepts valid AMC License / Registration numbers like 42AC00012300 or 558000312', () => {
            expect(checkAmcLicense({ 'Subject': { 'AMC License #': '42AC00012300' } })).toBe(true);
            expect(checkAmcLicense({ 'Subject': { 'AMC License #': '558000312' } })).toBe(true);
            expect(checkAmcLicense({ 'Subject': { 'AMC Reg. Number': 'AMC.0245' } })).toBe(true);
        });
    });

    describe('Utah (UT), Nevada (NV), New Mexico (NM) - AMC Fee Disclosure', () => {
        test('UT passes when AMC Fee and Appraiser Fee are present', () => {
            const data = {
                'Subject': {
                    'State': 'UT',
                    'Appraiser Fee': '600.00',
                    'AMC Fee': '200.00'
                }
            };
            expect(checkAmcFee(data)).toBe(true);
            const res = checkStateRequirements('State', 'UT', data);
            expect(res.isMatch).toBe(true);
            expect(res.message).toContain('All state requirements for UT appear to be met');
        });

        test('UT fails when AMC Fee is missing and returns exact rejection comment', () => {
            const data = {
                'Subject': {
                    'State': 'UT',
                    'Appraiser Fee': '600.00'
                }
            };
            expect(checkAmcFee(data)).toBe(false);
            const res = checkStateRequirements('State', 'UT', data);
            expect(res.isError).toBe(true);
            expect(res.message).toBe('Missing for UT: AMC Fee disclosure.');
        });

        test('UT passes when AMC Fee is disclosed in comments / narrative', () => {
            const data = {
                'Subject': {
                    'State': 'UT',
                    'Appraiser Fee': '600.00',
                    'Clarification Comment': 'The appraisal management company (Fastapp Appraisal Management Company) will retain $200 for managing the assignment.'
                }
            };
            expect(checkAmcFee(data)).toBe(true);
            const res = checkStateRequirements('State', 'UT', data);
            expect(res.isMatch).toBe(true);
        });

        test('NV and NM pass with AMC Fee', () => {
            const nvData = { 'Subject': { 'State': 'NV', 'Appraiser Fee': '500.00', 'AMC Fee': '150.00' } };
            const nmData = { 'Subject': { 'State': 'NM', 'Appraiser Fee': '550.00', 'AMC Fee': '175.00' } };
            expect(checkStateRequirements('State', 'NV', nvData).isMatch).toBe(true);
            expect(checkStateRequirements('State', 'NM', nmData).isMatch).toBe(true);
        });
    });
});
