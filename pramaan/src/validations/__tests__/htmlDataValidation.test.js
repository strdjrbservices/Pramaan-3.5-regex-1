import {
    normalizeTransactionType,
    checkTransactionTypeHtmlConsistency,
    checkAssignmentTypeHtmlConsistency,
    normalizeLenderName,
    areLenderNamesMatching,
    checkSubjectLenderNameVsHtml,
    checkLenderClientHtmlConsistency,
    normalizeLenderAddress,
    areLenderAddressesMatching,
    checkLenderAddressHtmlConsistency,
    checkLenderAddressInconsistency,
    parseAppraisalType,
    areAppraisalTypesMatching,
    checkAppraisalTypeHtmlConsistency,
    checkFormTypeHtmlConsistency,
    normalizeCounty,
    areCountiesMatching,
    checkCountyHtmlConsistency,
    checkPropertyCountyHtmlConsistency,
    cleanHtmlAddress,
    normalizeAddress,
    arePropertyAddressesMatching,
    checkPropertyAddressHtmlConsistency,
    normalizeAppraiserName,
    areAppraiserVendorNamesMatching,
    checkAppraiserVendorNameConsistency,
    checkAssignedToVendorHtmlConsistency
} from '../htmldatavaliadtion';

describe('HTML Transaction Type vs Report Assignment Type Validation', () => {
    describe('normalizeTransactionType', () => {
        test('normalizes refinance variations', () => {
            expect(normalizeTransactionType('re-finance')).toBe('refinance');
            expect(normalizeTransactionType('Refinance Transaction')).toBe('refinance');
            expect(normalizeTransactionType('Refinance')).toBe('refinance');
            expect(normalizeTransactionType('Cash-Out Refinance')).toBe('refinance');
            expect(normalizeTransactionType('No Cash-Out Refinance')).toBe('refinance');
            expect(normalizeTransactionType('Rate/Term Refinance')).toBe('refinance');
            expect(normalizeTransactionType('Streamline Refinance')).toBe('refinance');
            expect(normalizeTransactionType('FHA Refi')).toBe('refinance');
        });

        test('normalizes purchase variations', () => {
            expect(normalizeTransactionType('Purchase')).toBe('purchase');
            expect(normalizeTransactionType('Purchase Transaction')).toBe('purchase');
            expect(normalizeTransactionType('Standard Purchase')).toBe('purchase');
        });

        test('normalizes other variations', () => {
            expect(normalizeTransactionType('Other')).toBe('other');
            expect(normalizeTransactionType('Other (describe)')).toBe('other');
        });

        test('handles empty and N/A values', () => {
            expect(normalizeTransactionType('')).toBe('');
            expect(normalizeTransactionType(null)).toBe('');
            expect(normalizeTransactionType(undefined)).toBe('');
            expect(normalizeTransactionType('N/A')).toBe('');
        });
    });

    describe('checkTransactionTypeHtmlConsistency (Subject Assignment Type field)', () => {
        test('matches when HTML has "re-finance" and report Assignment Type is "Refinance Transaction"', () => {
            const allData = {
                comparisonData: {
                    'Transaction Type': 're-finance'
                }
            };
            const result = checkTransactionTypeHtmlConsistency('Assignment Type', 'Refinance Transaction', allData);
            expect(result).not.toBeNull();
            expect(result.isMatch).toBe(true);
            expect(result.message).toContain('re-finance');
        });

        test('matches when HTML has uppercase TRANSACTION TYPE', () => {
            const allData = {
                comparisonData: {
                    'TRANSACTION TYPE': 're-finance'
                }
            };
            const result = checkTransactionTypeHtmlConsistency('Assignment Type', 'Refinance Transaction', allData);
            expect(result).not.toBeNull();
            expect(result.isMatch).toBe(true);
        });

        test('matches when HTML has "Purchase" and report Assignment Type is "Purchase Transaction"', () => {
            const allData = {
                comparisonData: {
                    'Transaction Type': 'Purchase'
                }
            };
            const result = checkTransactionTypeHtmlConsistency('Assignment Type', 'Purchase Transaction', allData);
            expect(result).not.toBeNull();
            expect(result.isMatch).toBe(true);
        });

        test('fails when HTML is "re-finance" but report Assignment Type is "Purchase Transaction"', () => {
            const allData = {
                comparisonData: {
                    'Transaction Type': 're-finance'
                }
            };
            const result = checkTransactionTypeHtmlConsistency('Assignment Type', 'Purchase Transaction', allData);
            expect(result).not.toBeNull();
            expect(result.isError).toBe(true);
            expect(result.message).toContain('mismatch');
            expect(result.message).toContain('re-finance');
            expect(result.message).toContain('Purchase Transaction');
        });

        test('fails when HTML is "Purchase" but report Assignment Type is "Refinance Transaction"', () => {
            const allData = {
                comparisonData: {
                    'Transaction Type': 'Purchase'
                }
            };
            const result = checkTransactionTypeHtmlConsistency('Assignment Type', 'Refinance Transaction', allData);
            expect(result).not.toBeNull();
            expect(result.isError).toBe(true);
            expect(result.message).toContain('mismatch');
        });

        test('returns null when comparisonData is missing or empty', () => {
            const result = checkTransactionTypeHtmlConsistency('Assignment Type', 'Refinance Transaction', {});
            expect(result).toBeNull();
        });

        test('returns null when HTML Transaction Type is N/A', () => {
            const allData = {
                comparisonData: {
                    'Transaction Type': 'N/A'
                }
            };
            const result = checkTransactionTypeHtmlConsistency('Assignment Type', 'Refinance Transaction', allData);
            expect(result).toBeNull();
        });
    });

    describe('checkTransactionTypeHtmlConsistency (HTML Data Analysis Transaction Type field)', () => {
        test('matches when validating HTML field "Transaction Type" with report data in allData.Subject', () => {
            const allData = {
                Subject: {
                    'Assignment Type': 'Refinance Transaction'
                }
            };
            const result = checkTransactionTypeHtmlConsistency('Transaction Type', 're-finance', allData);
            expect(result).not.toBeNull();
            expect(result.isMatch).toBe(true);
        });

        test('fails when HTML field "Transaction Type" mismatches report data', () => {
            const allData = {
                Subject: {
                    'Assignment Type': 'Purchase Transaction'
                }
            };
            const result = checkTransactionTypeHtmlConsistency('Transaction Type', 're-finance', allData);
            expect(result).not.toBeNull();
            expect(result.isError).toBe(true);
            expect(result.message).toContain('mismatch');
        });
    });

    describe('checkAssignmentTypeHtmlConsistency alias', () => {
        test('is identical to checkTransactionTypeHtmlConsistency', () => {
            expect(checkAssignmentTypeHtmlConsistency).toBe(checkTransactionTypeHtmlConsistency);
        });
    });

    describe('HTML Client/Lender on Report vs Subject Lender/Client Validation', () => {
        describe('normalizeLenderName & areLenderNamesMatching', () => {
            test('normalizes lender name variations', () => {
                expect(normalizeLenderName('BPL Mortgage, LLC')).toBe('bpl mortgage llc');
                expect(normalizeLenderName('BPL Mortgage LLC')).toBe('bpl mortgage llc');
                expect(normalizeLenderName('BPL Mortgage & Co.')).toBe('bpl mortgage and co');
                expect(normalizeLenderName('')).toBe('');
                expect(normalizeLenderName('N/A')).toBe('');
            });

            test('matches identical and formatted variations', () => {
                expect(areLenderNamesMatching('BPL Mortgage, LLC', 'BPL Mortgage, LLC')).toBe(true);
                expect(areLenderNamesMatching('BPL Mortgage, LLC', 'BPL Mortgage LLC')).toBe(true);
                expect(areLenderNamesMatching('BPL Mortgage, LLC', 'bpl mortgage, llc')).toBe(true);
                expect(areLenderNamesMatching('BPL Mortgage, LLC', 'BPL Mortgage')).toBe(true);
            });

            test('returns false for mismatched lenders', () => {
                expect(areLenderNamesMatching('BPL Mortgage, LLC', 'Plaza Home Mortgage, Inc.')).toBe(false);
                expect(areLenderNamesMatching('BPL Mortgage, LLC', 'Chase Bank')).toBe(false);
            });
        });

        describe('checkSubjectLenderNameVsHtml (Subject section: Lender/Client)', () => {
            test('matches when HTML Client/Lender on Report is BPL Mortgage, LLC and Subject Lender/Client is BPL Mortgage, LLC', () => {
                const allData = {
                    comparisonData: {
                        'Client/Lender on Report': 'BPL Mortgage, LLC'
                    }
                };
                const result = checkSubjectLenderNameVsHtml('Lender/Client', 'BPL Mortgage, LLC', allData);
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
                expect(result.message).toContain('BPL Mortgage, LLC');
            });

            test('matches when field is uppercase LENDER/CLIENT and HTML has uppercase CLIENT/LENDER ON REPORT', () => {
                const allData = {
                    comparisonData: {
                        'CLIENT/LENDER ON REPORT': 'BPL Mortgage, LLC'
                    }
                };
                const result = checkSubjectLenderNameVsHtml('LENDER/CLIENT', 'BPL Mortgage, LLC', allData);
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
            });

            test('fails with error when Subject Lender/Client mismatches HTML Client/Lender on Report', () => {
                const allData = {
                    comparisonData: {
                        'Client/Lender on Report': 'BPL Mortgage, LLC'
                    }
                };
                const result = checkSubjectLenderNameVsHtml('Lender/Client', 'Plaza Home Mortgage, Inc.', allData);
                expect(result).not.toBeNull();
                expect(result.isError).toBe(true);
                expect(result.message).toContain('mismatch');
                expect(result.message).toContain('BPL Mortgage, LLC');
                expect(result.message).toContain('Plaza Home Mortgage, Inc.');
            });

            test('fails with error in both places when extra numbers or suffix is typed (e.g. BPL Mortgage, LLC 24323)', () => {
                const allDataSubject = {
                    comparisonData: {
                        'Client/Lender on Report': 'BPL Mortgage, LLC'
                    }
                };
                // 1. Check Subject section:
                const subjectResult = checkSubjectLenderNameVsHtml('Lender/Client', 'BPL Mortgage, LLC 24323', allDataSubject);
                expect(subjectResult).not.toBeNull();
                expect(subjectResult.isError).toBe(true);
                expect(subjectResult.message).toContain('mismatch');

                // 2. Check HTML Data Analysis card:
                const allDataHtml = {
                    Subject: {
                        'Lender/Client': 'BPL Mortgage, LLC 24323'
                    }
                };
                const htmlResult = checkSubjectLenderNameVsHtml('Client/Lender on Report', 'BPL Mortgage, LLC', allDataHtml);
                expect(htmlResult).not.toBeNull();
                expect(htmlResult.isError).toBe(true);
                expect(htmlResult.message).toContain('mismatch');
            });

            test('returns null when comparisonData is empty or missing', () => {
                const result = checkSubjectLenderNameVsHtml('Lender/Client', 'BPL Mortgage, LLC', {});
                expect(result).toBeNull();
            });

            test('returns null when HTML Client/Lender on Report is N/A', () => {
                const allData = {
                    comparisonData: {
                        'Client/Lender on Report': 'N/A'
                    }
                };
                const result = checkSubjectLenderNameVsHtml('Lender/Client', 'BPL Mortgage, LLC', allData);
                expect(result).toBeNull();
            });
        });

        describe('checkSubjectLenderNameVsHtml (HTML Data Analysis: Client/Lender on Report)', () => {
            test('matches when validating HTML field Client/Lender on Report against report allData.Subject', () => {
                const allData = {
                    Subject: {
                        'Lender/Client': 'BPL Mortgage, LLC'
                    }
                };
                const result = checkSubjectLenderNameVsHtml('Client/Lender on Report', 'BPL Mortgage, LLC', allData);
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
            });

            test('matches uppercase CLIENT/LENDER ON REPORT against report allData.Subject', () => {
                const allData = {
                    Subject: {
                        'Lender/Client': 'BPL Mortgage, LLC'
                    }
                };
                const result = checkSubjectLenderNameVsHtml('CLIENT/LENDER ON REPORT', 'BPL Mortgage, LLC', allData);
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
            });

            test('fails with error when HTML Client/Lender on Report mismatches Subject Lender/Client', () => {
                const allData = {
                    Subject: {
                        'Lender/Client': 'Plaza Home Mortgage, Inc.'
                    }
                };
                const result = checkSubjectLenderNameVsHtml('Client/Lender on Report', 'BPL Mortgage, LLC', allData);
                expect(result).not.toBeNull();
                expect(result.isError).toBe(true);
                expect(result.message).toContain('mismatch');
            });

            test('matches when HTML Client/Lender on Report is checked against CERTIFICATION Lender/Client Company Name', () => {
                const allData = {
                    CERTIFICATION: {
                        'Lender/Client Company Name': 'United Mortgage Corp.',
                        'LENDER/CLIENT Name': 'Fastapp Appraisal Management Company'
                    }
                };
                const result = checkSubjectLenderNameVsHtml('Client/Lender on Report', 'United Mortgage Corp.', allData);
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
            });
        });

        describe('Certification Section Lender/Client Validation', () => {
            test('validates Lender/Client Company Name against HTML Client/Lender on Report', () => {
                const allData = {
                    comparisonData: {
                        'Client/Lender on Report': 'United Mortgage Corp.'
                    }
                };
                const result = checkSubjectLenderNameVsHtml('Lender/Client Company Name', 'United Mortgage Corp.', allData);
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
            });

            test('does NOT validate LENDER/CLIENT Name (AMC/contact name) against HTML Client/Lender on Report (returns null)', () => {
                const allData = {
                    comparisonData: {
                        'Client/Lender on Report': 'United Mortgage Corp.'
                    }
                };
                const result = checkSubjectLenderNameVsHtml('LENDER/CLIENT Name', 'Fastapp Appraisal Management Company', allData);
                expect(result).toBeNull();
            });
        });

        describe('checkLenderClientHtmlConsistency alias', () => {
            test('is identical to checkSubjectLenderNameVsHtml', () => {
                expect(checkLenderClientHtmlConsistency).toBe(checkSubjectLenderNameVsHtml);
            });
        });
    });

    describe('HTML Lender Address vs Subject Address (Lender/Client) Validation', () => {
        describe('normalizeLenderAddress & areLenderAddressesMatching', () => {
            test('normalizes standard road and suite abbreviations', () => {
                const a1 = normalizeLenderAddress('1801 S. Meyers Road Suite 400 Oakbrook Terrace IL 60181');
                const a2 = normalizeLenderAddress('1801 S. Meyers Road, Suite 400, Oakbrook Terrace, IL 60181');
                expect(a1).toBe(a2);
                expect(areLenderAddressesMatching(
                    '1801 S. Meyers Road Suite 400 Oakbrook Terrace IL 60181',
                    '1801 S. Meyers Road, Suite 400, Oakbrook Terrace, IL 60181'
                )).toBe(true);
            });

            test('detects address mismatch when zip code has extra digit (601811 vs 60181)', () => {
                expect(areLenderAddressesMatching(
                    '1801 S. Meyers Road Suite 400 Oakbrook Terrace IL 60181',
                    '1801 S. Meyers Road, Suite 400, Oakbrook Terrace, IL 601811'
                )).toBe(false);
            });
        });

        describe('checkLenderAddressHtmlConsistency', () => {
            test('matches in both places when addresses are identical or formatted equivalents', () => {
                const htmlAddress = '1801 S. Meyers Road Suite 400 Oakbrook Terrace IL 60181';
                const subjectAddress = '1801 S. Meyers Road, Suite 400, Oakbrook Terrace, IL 60181';

                // Subject section check:
                const subjectRes = checkLenderAddressHtmlConsistency('Address (Lender/Client)', subjectAddress, {
                    comparisonData: { 'Lender Address': htmlAddress }
                });
                expect(subjectRes).not.toBeNull();
                expect(subjectRes.isMatch).toBe(true);

                // HTML card check:
                const htmlRes = checkLenderAddressHtmlConsistency('Lender Address', htmlAddress, {
                    Subject: { 'Address (Lender/Client)': subjectAddress }
                });
                expect(htmlRes).not.toBeNull();
                expect(htmlRes.isMatch).toBe(true);
            });

            test('fails in both places when addresses mismatch (e.g. 601811 vs 60181)', () => {
                const htmlAddress = '1801 S. Meyers Road Suite 400 Oakbrook Terrace IL 60181';
                const subjectAddressMismatch = '1801 S. Meyers Road, Suite 400, Oakbrook Terrace, IL 601811';

                // Subject section check:
                const subjectRes = checkLenderAddressHtmlConsistency('Address (Lender/Client)', subjectAddressMismatch, {
                    comparisonData: { 'Lender Address': htmlAddress }
                });
                expect(subjectRes).not.toBeNull();
                expect(subjectRes.isError).toBe(true);
                expect(subjectRes.message).toContain('Lender/Client Address mismatch');

                // HTML card check:
                const htmlRes = checkLenderAddressHtmlConsistency('Lender Address', htmlAddress, {
                    Subject: { 'Address (Lender/Client)': subjectAddressMismatch }
                });
                expect(htmlRes).not.toBeNull();
                expect(htmlRes.isError).toBe(true);
                expect(htmlRes.message).toContain('Lender/Client Address mismatch');
            });

            test('handles uppercase field names ADDRESS (LENDER/CLIENT) and LENDER ADDRESS', () => {
                const htmlAddress = '1801 S. Meyers Road Suite 400 Oakbrook Terrace IL 60181';
                const subjectAddress = '1801 S. Meyers Road, Suite 400, Oakbrook Terrace, IL 60181';

                const subjectRes = checkLenderAddressHtmlConsistency('ADDRESS (LENDER/CLIENT)', subjectAddress, {
                    comparisonData: { 'LENDER ADDRESS': htmlAddress }
                });
                expect(subjectRes).not.toBeNull();
                expect(subjectRes.isMatch).toBe(true);

                const htmlRes = checkLenderAddressHtmlConsistency('LENDER ADDRESS', htmlAddress, {
                    Subject: { 'Address (Lender/Client)': subjectAddress }
                });
                expect(htmlRes).not.toBeNull();
                expect(htmlRes.isMatch).toBe(true);
            });

            test('returns null when comparisonData is missing or empty', () => {
                const result = checkLenderAddressHtmlConsistency('Address (Lender/Client)', '1801 S. Meyers Rd', {});
                expect(result).toBeNull();
            });
        });

        describe('checkLenderAddressInconsistency alias', () => {
            test('is identical to checkLenderAddressHtmlConsistency', () => {
                expect(checkLenderAddressInconsistency).toBe(checkLenderAddressHtmlConsistency);
            });
        });
    });

    describe('HTML Appraisal Type vs XML Form Type Validation', () => {
        describe('parseAppraisalType', () => {
            test('parses 1004 variations with and without 1007', () => {
                expect(parseAppraisalType('1004 Single Family w/ 1007')).toEqual({
                    primary: '1004',
                    has1007: true,
                    canonical: '1004 + 1007'
                });
                expect(parseAppraisalType('1004 + 1007')).toEqual({
                    primary: '1004',
                    has1007: true,
                    canonical: '1004 + 1007'
                });
                expect(parseAppraisalType('1004 Single Family')).toEqual({
                    primary: '1004',
                    has1007: false,
                    canonical: '1004'
                });
                expect(parseAppraisalType('1004')).toEqual({
                    primary: '1004',
                    has1007: false,
                    canonical: '1004'
                });
            });

            test('parses other form types correctly', () => {
                expect(parseAppraisalType('1073 Condo')).toEqual({
                    primary: '1073',
                    has1007: false,
                    canonical: '1073'
                });
                expect(parseAppraisalType('1025 Multi-Family')).toEqual({
                    primary: '1025',
                    has1007: false,
                    canonical: '1025'
                });
                expect(parseAppraisalType('1025 + 1007')).toEqual({
                    primary: '1025',
                    has1007: true,
                    canonical: '1025 + 1007'
                });
                expect(parseAppraisalType('2055 Exterior')).toEqual({
                    primary: '2055',
                    has1007: false,
                    canonical: '2055'
                });
            });

            test('returns null for empty or N/A', () => {
                expect(parseAppraisalType('')).toBeNull();
                expect(parseAppraisalType(null)).toBeNull();
                expect(parseAppraisalType(undefined)).toBeNull();
                expect(parseAppraisalType('N/A')).toBeNull();
            });
        });

        describe('areAppraisalTypesMatching', () => {
            test('matches 1004 Single Family w/ 1007 with 1004 + 1007', () => {
                expect(areAppraisalTypesMatching('1004 Single Family w/ 1007', '1004 + 1007')).toBe(true);
                expect(areAppraisalTypesMatching('1004 + 1007', '1004 Single Family w/ 1007')).toBe(true);
            });

            test('matches 1004 Single Family with 1004', () => {
                expect(areAppraisalTypesMatching('1004 Single Family', '1004')).toBe(true);
                expect(areAppraisalTypesMatching('1004', '1004')).toBe(true);
            });

            test('mismatches 1004 Single Family (no 1007) with 1004 + 1007 (has 1007)', () => {
                expect(areAppraisalTypesMatching('1004 Single Family', '1004 + 1007')).toBe(false);
                expect(areAppraisalTypesMatching('1004 Single Family w/ 1007', '1004')).toBe(false);
            });

            test('mismatches different primary forms', () => {
                expect(areAppraisalTypesMatching('1004 Single Family', '1073')).toBe(false);
                expect(areAppraisalTypesMatching('1004 Single Family', '1025')).toBe(false);
            });
        });

        describe('checkAppraisalTypeHtmlConsistency (HTML Data Analysis APPRAISAL TYPE field)', () => {
            test('matches when HTML APPRAISAL TYPE is "1004 Single Family w/ 1007" and XML form type is "1004 + 1007"', () => {
                const allData = {
                    'From Type': '1004 + 1007',
                    comparisonData: {
                        'APPRAISAL TYPE': '1004 Single Family w/ 1007'
                    }
                };
                const result = checkAppraisalTypeHtmlConsistency('APPRAISAL TYPE', '1004 Single Family w/ 1007', allData);
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
                expect(result.message).toContain('Valid: Appraisal Type matches XML Form Type');
            });

            test('matches when field is "Appraisal Type" (mixed case)', () => {
                const allData = {
                    'Form Type': '1004',
                    comparisonData: {
                        'Appraisal Type': '1004 Single Family'
                    }
                };
                const result = checkAppraisalTypeHtmlConsistency('Appraisal Type', '1004 Single Family', allData);
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
            });

            test('fails with error when HTML APPRAISAL TYPE mismatches XML form type', () => {
                const allData = {
                    'From Type': '1073',
                    comparisonData: {
                        'APPRAISAL TYPE': '1004 Single Family'
                    }
                };
                const result = checkAppraisalTypeHtmlConsistency('APPRAISAL TYPE', '1004 Single Family', allData);
                expect(result).not.toBeNull();
                expect(result.isError).toBe(true);
                expect(result.message).toContain('Appraisal Type mismatch');
            });

            test('fails with error when XML has 1007 but HTML order did not specify 1007', () => {
                const allData = {
                    'From Type': '1004 + 1007',
                    comparisonData: {
                        'APPRAISAL TYPE': '1004 Single Family'
                    }
                };
                const result = checkAppraisalTypeHtmlConsistency('APPRAISAL TYPE', '1004 Single Family', allData);
                expect(result).not.toBeNull();
                expect(result.isError).toBe(true);
                expect(result.message).toContain('mismatch');
            });
        });

        describe('checkAppraisalTypeHtmlConsistency (XML/Report Form Type field)', () => {
            test('matches when checking "From Type" against HTML appraisal type', () => {
                const allData = {
                    'From Type': '1004 + 1007',
                    comparisonData: {
                        'APPRAISAL TYPE': '1004 Single Family w/ 1007'
                    }
                };
                const result = checkAppraisalTypeHtmlConsistency('From Type', '1004 + 1007', allData);
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
                expect(result.message).toContain('Valid: Form Type matches HTML Appraisal Type');
            });

            test('fails when checking "From Type" against mismatched HTML appraisal type', () => {
                const allData = {
                    'From Type': '1025',
                    comparisonData: {
                        'Appraisal Type': '1004 Single Family'
                    }
                };
                const result = checkAppraisalTypeHtmlConsistency('From Type', '1025', allData);
                expect(result).not.toBeNull();
                expect(result.isError).toBe(true);
            });

            test('returns null when comparisonData is missing or empty', () => {
                const result = checkAppraisalTypeHtmlConsistency('From Type', '1004', {});
                expect(result).toBeNull();
            });

            test('returns null when HTML Appraisal Type is N/A', () => {
                const allData = {
                    comparisonData: {
                        'Appraisal Type': 'N/A'
                    }
                };
                const result = checkAppraisalTypeHtmlConsistency('From Type', '1004', allData);
                expect(result).toBeNull();
            });
        });

        describe('checkFormTypeHtmlConsistency alias', () => {
            test('is identical to checkAppraisalTypeHtmlConsistency', () => {
                expect(checkFormTypeHtmlConsistency).toBe(checkAppraisalTypeHtmlConsistency);
            });
        });
    });

    describe('HTML Property County vs Subject County Validation', () => {
        describe('normalizeCounty', () => {
            test('normalizes county names by stripping county suffixes', () => {
                expect(normalizeCounty('Westchester County')).toBe('westchester');
                expect(normalizeCounty('Westchester Co.')).toBe('westchester');
                expect(normalizeCounty('Westchester Co')).toBe('westchester');
                expect(normalizeCounty('Westchester')).toBe('westchester');
                expect(normalizeCounty('WESTCHESTER COUNTY')).toBe('westchester');
            });

            test('normalizes hyphenated and complex county names', () => {
                expect(normalizeCounty('Miami-Dade County')).toBe('miami dade');
                expect(normalizeCounty('Miami - Dade')).toBe('miami dade');
                expect(normalizeCounty('St. Louis County')).toBe('st louis');
                expect(normalizeCounty('Cook County')).toBe('cook');
            });

            test('handles empty and N/A values', () => {
                expect(normalizeCounty('')).toBe('');
                expect(normalizeCounty(null)).toBe('');
                expect(normalizeCounty(undefined)).toBe('');
                expect(normalizeCounty('N/A')).toBe('');
            });
        });

        describe('areCountiesMatching', () => {
            test('matches identical and suffix-varying county names', () => {
                expect(areCountiesMatching('Westchester', 'Westchester County')).toBe(true);
                expect(areCountiesMatching('Westchester County', 'Westchester')).toBe(true);
                expect(areCountiesMatching('Cook', 'Cook County')).toBe(true);
                expect(areCountiesMatching('Miami-Dade County', 'Miami Dade')).toBe(true);
            });

            test('mismatches different counties', () => {
                expect(areCountiesMatching('Orange County', 'Los Angeles')).toBe(false);
                expect(areCountiesMatching('Cook', 'Lake')).toBe(false);
                expect(areCountiesMatching('Fulton', 'DeKalb')).toBe(false);
            });

            test('returns false when either value is missing or N/A', () => {
                expect(areCountiesMatching('Westchester', '')).toBe(false);
                expect(areCountiesMatching('', 'Westchester')).toBe(false);
                expect(areCountiesMatching('N/A', 'Westchester')).toBe(false);
            });
        });

        describe('checkCountyHtmlConsistency (HTML Data Analysis: Property County field)', () => {
            test('matches when HTML Property County matches Subject County', () => {
                const allData = {
                    Subject: {
                        County: 'Westchester'
                    },
                    comparisonData: {
                        'Property County': 'Westchester County'
                    }
                };
                const result = checkCountyHtmlConsistency('Property County', 'Westchester County', allData);
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
                expect(result.message).toContain('Valid: Property County matches Subject County');
            });

            test('matches when HTML has uppercase PROPERTY COUNTY', () => {
                const allData = {
                    County: 'Cook',
                    comparisonData: {
                        'PROPERTY COUNTY': 'Cook County'
                    }
                };
                const result = checkCountyHtmlConsistency('PROPERTY COUNTY', 'Cook County', allData);
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
            });

            test('fails with error when HTML Property County mismatches Subject County', () => {
                const allData = {
                    Subject: {
                        County: 'Orange'
                    },
                    comparisonData: {
                        'Property County': 'Los Angeles County'
                    }
                };
                const result = checkCountyHtmlConsistency('Property County', 'Los Angeles County', allData);
                expect(result).not.toBeNull();
                expect(result.isError).toBe(true);
                expect(result.message).toContain('County mismatch');
            });

            test('returns null when comparisonData is missing or empty', () => {
                const result = checkCountyHtmlConsistency('Property County', 'Westchester', {});
                expect(result).toBeNull();
            });

            test('returns null when HTML Property County is N/A', () => {
                const allData = {
                    Subject: { County: 'Westchester' },
                    comparisonData: { 'Property County': 'N/A' }
                };
                const result = checkCountyHtmlConsistency('Property County', 'N/A', allData);
                expect(result).toBeNull();
            });
        });

        describe('checkCountyHtmlConsistency (Subject section: County field)', () => {
            test('matches when Subject County matches HTML Property County', () => {
                const allData = {
                    Subject: {
                        County: 'Westchester'
                    },
                    comparisonData: {
                        'Property County': 'Westchester County'
                    }
                };
                const result = checkCountyHtmlConsistency('County', 'Westchester', allData);
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
                expect(result.message).toContain('Valid: County matches HTML Property County');
            });

            test('matches when field is uppercase COUNTY', () => {
                const allData = {
                    comparisonData: {
                        'Property County': 'Cook County'
                    }
                };
                const result = checkCountyHtmlConsistency('COUNTY', 'Cook', allData);
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
            });

            test('fails with error when Subject County mismatches HTML Property County', () => {
                const allData = {
                    Subject: {
                        County: 'Orange'
                    },
                    comparisonData: {
                        'Property County': 'Los Angeles'
                    }
                };
                const result = checkCountyHtmlConsistency('County', 'Orange', allData);
                expect(result).not.toBeNull();
                expect(result.isError).toBe(true);
                expect(result.message).toContain('County mismatch');
            });

            test('returns null when HTML Property County is missing', () => {
                const result = checkCountyHtmlConsistency('County', 'Westchester', {});
                expect(result).toBeNull();
            });
        });

        describe('checkPropertyCountyHtmlConsistency alias', () => {
            test('is identical to checkCountyHtmlConsistency', () => {
                expect(checkPropertyCountyHtmlConsistency).toBe(checkCountyHtmlConsistency);
            });
        });
    });

    describe('HTML Property Address vs Subject Address Validation', () => {
        describe('cleanHtmlAddress', () => {
            test('strips trailing MapZillow from HTML address', () => {
                expect(cleanHtmlAddress('863 Halesworth Dr Cincinnati OH 45240MapZillow')).toBe('863 Halesworth Dr Cincinnati OH 45240');
            });

            test('strips trailing Map, Zillow, View Map, Google Map', () => {
                expect(cleanHtmlAddress('123 Main St, New York, NY 10001 Map')).toBe('123 Main St, New York, NY 10001');
                expect(cleanHtmlAddress('123 Main St, New York, NY 10001 Zillow')).toBe('123 Main St, New York, NY 10001');
                expect(cleanHtmlAddress('123 Main St, New York, NY 10001 View Map')).toBe('123 Main St, New York, NY 10001');
                expect(cleanHtmlAddress('123 Main St, New York, NY 10001 Directions')).toBe('123 Main St, New York, NY 10001');
            });

            test('handles empty or N/A values', () => {
                expect(cleanHtmlAddress('')).toBe('');
                expect(cleanHtmlAddress(null)).toBe('');
                expect(cleanHtmlAddress(undefined)).toBe('');
                expect(cleanHtmlAddress('N/A')).toBe('');
            });
        });

        describe('normalizeAddress', () => {
            test('normalizes standard street abbreviations and strips punctuation', () => {
                expect(normalizeAddress('863 Halesworth Dr Cincinnati OH 45240MapZillow'))
                    .toBe('863halesworthdrcincinnatioh45240');
                expect(normalizeAddress('863 Halesworth Drive, Cincinnati, OH 45240'))
                    .toBe('863halesworthdrcincinnatioh45240');
                expect(normalizeAddress('100 Main Street, Suite 200, Austin, Texas 78701'))
                    .toBe('100mainstste200austintexas78701');
            });
        });

        describe('arePropertyAddressesMatching', () => {
            test('matches HTML "863 Halesworth Dr Cincinnati OH 45240MapZillow" with Full Address "863 Halesworth Dr, Cincinnati, OH 45240"', () => {
                const subjectInfo = {
                    street: '863 Halesworth Dr',
                    city: 'Cincinnati',
                    state: 'OH',
                    zip: '45240',
                    full: '863 Halesworth Dr, Cincinnati, OH 45240',
                    constructed: '863 Halesworth Dr, Cincinnati, OH 45240'
                };
                expect(arePropertyAddressesMatching('863 Halesworth Dr Cincinnati OH 45240MapZillow', subjectInfo)).toBe(true);
            });

            test('matches HTML address with constructed address when Full Address is missing', () => {
                const subjectInfo = {
                    street: '863 Halesworth Dr',
                    city: 'Cincinnati',
                    state: 'OH',
                    zip: '45240',
                    full: '',
                    constructed: '863 Halesworth Dr, Cincinnati, OH 45240'
                };
                expect(arePropertyAddressesMatching('863 Halesworth Dr Cincinnati OH 45240MapZillow', subjectInfo)).toBe(true);
            });

            test('matches HTML address when street-only matches and city/state/zip are consistent', () => {
                const subjectInfo = {
                    street: '863 Halesworth Dr',
                    city: 'Cincinnati',
                    state: 'OH',
                    zip: '45240',
                    full: '',
                    constructed: '863 Halesworth Dr'
                };
                expect(arePropertyAddressesMatching('863 Halesworth Dr Cincinnati OH 45240MapZillow', subjectInfo)).toBe(true);
            });

            test('mismatches when house number is different', () => {
                const subjectInfo = {
                    street: '864 Halesworth Dr',
                    city: 'Cincinnati',
                    state: 'OH',
                    zip: '45240',
                    full: '864 Halesworth Dr, Cincinnati, OH 45240',
                    constructed: '864 Halesworth Dr, Cincinnati, OH 45240'
                };
                expect(arePropertyAddressesMatching('863 Halesworth Dr Cincinnati OH 45240MapZillow', subjectInfo)).toBe(false);
            });

            test('mismatches when city/state/zip conflicts with HTML address', () => {
                const subjectInfo = {
                    street: '863 Halesworth Dr',
                    city: 'Columbus',
                    state: 'OH',
                    zip: '45240',
                    full: '863 Halesworth Dr, Columbus, OH 45240',
                    constructed: '863 Halesworth Dr, Columbus, OH 45240'
                };
                expect(arePropertyAddressesMatching('863 Halesworth Dr Cincinnati OH 45240MapZillow', subjectInfo)).toBe(false);
            });
        });

        describe('checkPropertyAddressHtmlConsistency (HTML Data Analysis: PROPERTY ADDRESS)', () => {
            test('matches when HTML PROPERTY ADDRESS matches Subject Full Address', () => {
                const allData = {
                    comparisonData: {
                        'PROPERTY ADDRESS': '863 Halesworth Dr Cincinnati OH 45240MapZillow'
                    },
                    Subject: {
                        'Property Address': '863 Halesworth Dr',
                        'City': 'Cincinnati',
                        'State': 'OH',
                        'Zip Code': '45240',
                        'Full Address': '863 Halesworth Dr, Cincinnati, OH 45240'
                    }
                };
                const result = checkPropertyAddressHtmlConsistency(
                    'PROPERTY ADDRESS',
                    '863 Halesworth Dr Cincinnati OH 45240MapZillow',
                    allData,
                    ['comparisonData', 'PROPERTY ADDRESS']
                );
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
                expect(result.message).toContain('Valid: Property Address matches Subject Address');
            });

            test('matches when HTML PROPERTY ADDRESS matches individual subject fields (no Full Address)', () => {
                const allData = {
                    comparisonData: {
                        'PROPERTY ADDRESS': '863 Halesworth Dr Cincinnati OH 45240MapZillow'
                    },
                    Subject: {
                        'Property Address': '863 Halesworth Dr',
                        'City': 'Cincinnati',
                        'State': 'OH',
                        'Zip Code': '45240'
                    }
                };
                const result = checkPropertyAddressHtmlConsistency(
                    'PROPERTY ADDRESS',
                    '863 Halesworth Dr Cincinnati OH 45240MapZillow',
                    allData,
                    ['comparisonData', 'PROPERTY ADDRESS']
                );
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
            });

            test('fails with error when HTML PROPERTY ADDRESS mismatches Subject address', () => {
                const allData = {
                    comparisonData: {
                        'PROPERTY ADDRESS': '863 Halesworth Dr Cincinnati OH 45240MapZillow'
                    },
                    Subject: {
                        'Property Address': '124 Elm St',
                        'City': 'Cincinnati',
                        'State': 'OH',
                        'Zip Code': '45240',
                        'Full Address': '124 Elm St, Cincinnati, OH 45240'
                    }
                };
                const result = checkPropertyAddressHtmlConsistency(
                    'PROPERTY ADDRESS',
                    '863 Halesworth Dr Cincinnati OH 45240MapZillow',
                    allData,
                    ['comparisonData', 'PROPERTY ADDRESS']
                );
                expect(result).not.toBeNull();
                expect(result.isError).toBe(true);
                expect(result.message).toContain('Property Address mismatch');
            });

            test('returns null when comparisonData is missing or empty', () => {
                const allData = {
                    Subject: {
                        'Property Address': '863 Halesworth Dr'
                    }
                };
                const result = checkPropertyAddressHtmlConsistency('PROPERTY ADDRESS', '863 Halesworth Dr', allData);
                expect(result).toBeNull();
            });

            test('returns null when HTML PROPERTY ADDRESS is N/A', () => {
                const allData = {
                    comparisonData: {
                        'PROPERTY ADDRESS': 'N/A'
                    },
                    Subject: {
                        'Property Address': '863 Halesworth Dr'
                    }
                };
                const result = checkPropertyAddressHtmlConsistency('PROPERTY ADDRESS', 'N/A', allData);
                expect(result).toBeNull();
            });
        });

        describe('checkPropertyAddressHtmlConsistency (Subject Section: Property Address / Full Address)', () => {
            test('matches when Subject Property Address is checked against HTML comparisonData', () => {
                const allData = {
                    comparisonData: {
                        'PROPERTY ADDRESS': '863 Halesworth Dr Cincinnati OH 45240MapZillow'
                    },
                    Subject: {
                        'Property Address': '863 Halesworth Dr',
                        'City': 'Cincinnati',
                        'State': 'OH',
                        'Zip Code': '45240'
                    }
                };
                const result = checkPropertyAddressHtmlConsistency(
                    'Property Address',
                    '863 Halesworth Dr',
                    allData,
                    ['Subject', 'Property Address']
                );
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
                expect(result.message).toContain('Valid: Address matches HTML Property Address');
            });

            test('matches when Subject Full Address is checked against HTML comparisonData', () => {
                const allData = {
                    comparisonData: {
                        'PROPERTY ADDRESS': '863 Halesworth Dr Cincinnati OH 45240MapZillow'
                    },
                    Subject: {
                        'Property Address': '863 Halesworth Dr',
                        'City': 'Cincinnati',
                        'State': 'OH',
                        'Zip Code': '45240',
                        'Full Address': '863 Halesworth Dr, Cincinnati, OH 45240'
                    }
                };
                const result = checkPropertyAddressHtmlConsistency(
                    'Full Address',
                    '863 Halesworth Dr, Cincinnati, OH 45240',
                    allData,
                    ['Subject', 'Full Address']
                );
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
            });

            test('fails with error when Subject Property Address mismatches HTML comparisonData', () => {
                const allData = {
                    comparisonData: {
                        'PROPERTY ADDRESS': '863 Halesworth Dr Cincinnati OH 45240MapZillow'
                    },
                    Subject: {
                        'Property Address': '999 Different Rd',
                        'City': 'Cincinnati',
                        'State': 'OH',
                        'Zip Code': '45240'
                    }
                };
                const result = checkPropertyAddressHtmlConsistency(
                    'Property Address',
                    '999 Different Rd',
                    allData,
                    ['Subject', 'Property Address']
                );
                expect(result).not.toBeNull();
                expect(result.isError).toBe(true);
                expect(result.message).toContain('Property Address mismatch');
            });

            test('returns null when Subject has no HTML comparisonData loaded', () => {
                const allData = {
                    Subject: {
                        'Property Address': '863 Halesworth Dr'
                    }
                };
                const result = checkPropertyAddressHtmlConsistency(
                    'Property Address',
                    '863 Halesworth Dr',
                    allData,
                    ['Subject', 'Property Address']
                );
                expect(result).toBeNull();
            });
        });
    });

    describe('HTML Assigned to Vendor vs Certification Appraiser Name Validation', () => {
        describe('normalizeAppraiserName', () => {
            test('normalizes names and strips punctuation', () => {
                expect(normalizeAppraiserName('Michael S. Airhart')).toBe('michael s airhart');
                expect(normalizeAppraiserName('Michael S Airhart')).toBe('michael s airhart');
                expect(normalizeAppraiserName('Airhart, Michael S.')).toBe('airhart michael s');
                expect(normalizeAppraiserName('Michael & Sons')).toBe('michael and sons');
            });

            test('handles empty and N/A values', () => {
                expect(normalizeAppraiserName('')).toBe('');
                expect(normalizeAppraiserName(null)).toBe('');
                expect(normalizeAppraiserName(undefined)).toBe('');
                expect(normalizeAppraiserName('N/A')).toBe('');
            });
        });

        describe('areAppraiserVendorNamesMatching', () => {
            test('matches "Michael S Airhart" with "Michael S. Airhart"', () => {
                expect(areAppraiserVendorNamesMatching('Michael S Airhart', 'Michael S. Airhart')).toBe(true);
            });

            test('matches case-insensitively', () => {
                expect(areAppraiserVendorNamesMatching('MICHAEL S AIRHART', 'michael s. airhart')).toBe(true);
            });

            test('matches token inverted order "Airhart, Michael S" with "Michael S. Airhart"', () => {
                expect(areAppraiserVendorNamesMatching('Airhart, Michael S', 'Michael S. Airhart')).toBe(true);
            });

            test('matches first and last name when middle initial is omitted', () => {
                expect(areAppraiserVendorNamesMatching('Michael S Airhart', 'Michael Airhart')).toBe(true);
            });

            test('matches when HTML lists multiple vendors separated by slash', () => {
                expect(areAppraiserVendorNamesMatching('Michael S Airhart / Appraisal Group', 'Michael S. Airhart')).toBe(true);
            });

            test('returns false when appraiser name does not match', () => {
                expect(areAppraiserVendorNamesMatching('Michael S Airhart', 'David Smith')).toBe(false);
            });

            test('returns false when either value is missing or N/A', () => {
                expect(areAppraiserVendorNamesMatching('Michael S Airhart', '')).toBe(false);
                expect(areAppraiserVendorNamesMatching('', 'Michael S. Airhart')).toBe(false);
                expect(areAppraiserVendorNamesMatching('N/A', 'Michael S. Airhart')).toBe(false);
            });
        });

        describe('checkAppraiserVendorNameConsistency (HTML Data Analysis: ASSIGNED TO VENDOR(S))', () => {
            test('matches when HTML ASSIGNED TO VENDOR(S) matches Certification Name', () => {
                const allData = {
                    comparisonData: {
                        'ASSIGNED TO VENDOR(S)': 'Michael S Airhart'
                    },
                    CERTIFICATION: {
                        'Name': 'Michael S. Airhart'
                    }
                };
                const result = checkAppraiserVendorNameConsistency(
                    'ASSIGNED TO VENDOR(S)',
                    'Michael S Airhart',
                    allData,
                    ['comparisonData', 'ASSIGNED TO VENDOR(S)']
                );
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
                expect(result.message).toContain('Valid: Assigned to Vendor matches Certification Appraiser Name');
            });

            test('matches when HTML has mixed-case "Assigned to Vendor(s)" and Certification has "Appraiser Name"', () => {
                const allData = {
                    comparisonData: {
                        'Assigned to Vendor(s)': 'Michael S Airhart'
                    },
                    CERTIFICATION: {
                        'Appraiser Name': 'Michael S. Airhart'
                    }
                };
                const result = checkAppraiserVendorNameConsistency(
                    'Assigned to Vendor(s)',
                    'Michael S Airhart',
                    allData,
                    ['comparisonData', 'Assigned to Vendor(s)']
                );
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
            });

            test('fails with error when HTML ASSIGNED TO VENDOR(S) mismatches Certification Appraiser', () => {
                const allData = {
                    comparisonData: {
                        'ASSIGNED TO VENDOR(S)': 'Michael S Airhart'
                    },
                    CERTIFICATION: {
                        'Name': 'John Doe'
                    }
                };
                const result = checkAppraiserVendorNameConsistency(
                    'ASSIGNED TO VENDOR(S)',
                    'Michael S Airhart',
                    allData,
                    ['comparisonData', 'ASSIGNED TO VENDOR(S)']
                );
                expect(result).not.toBeNull();
                expect(result.isError).toBe(true);
                expect(result.message).toContain('Appraiser Name mismatch');
            });

            test('returns null when comparisonData is missing or empty', () => {
                const allData = {
                    CERTIFICATION: {
                        'Name': 'Michael S. Airhart'
                    }
                };
                const result = checkAppraiserVendorNameConsistency('ASSIGNED TO VENDOR(S)', 'Michael S Airhart', allData);
                expect(result).toBeNull();
            });

            test('returns null when HTML Assigned to Vendor is N/A', () => {
                const allData = {
                    comparisonData: {
                        'ASSIGNED TO VENDOR(S)': 'N/A'
                    },
                    CERTIFICATION: {
                        'Name': 'Michael S. Airhart'
                    }
                };
                const result = checkAppraiserVendorNameConsistency('ASSIGNED TO VENDOR(S)', 'N/A', allData);
                expect(result).toBeNull();
            });
        });

        describe('checkAppraiserVendorNameConsistency (Certification Section: Name / Appraiser Name)', () => {
            test('matches when Certification Name is checked against HTML comparisonData', () => {
                const allData = {
                    comparisonData: {
                        'ASSIGNED TO VENDOR(S)': 'Michael S Airhart'
                    },
                    CERTIFICATION: {
                        'Name': 'Michael S. Airhart'
                    }
                };
                const result = checkAppraiserVendorNameConsistency(
                    'Name',
                    'Michael S. Airhart',
                    allData,
                    ['CERTIFICATION', 'Name']
                );
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
                expect(result.message).toContain('Valid: Appraiser Name matches HTML Assigned to Vendor');
            });

            test('matches when Certification Appraiser Name is checked against HTML comparisonData', () => {
                const allData = {
                    comparisonData: {
                        'Assigned to Vendor(s)': 'Michael S Airhart'
                    },
                    CERTIFICATION: {
                        'Appraiser Name': 'Michael S. Airhart'
                    }
                };
                const result = checkAppraiserVendorNameConsistency(
                    'Appraiser Name',
                    'Michael S. Airhart',
                    allData,
                    ['CERTIFICATION', 'Appraiser Name']
                );
                expect(result).not.toBeNull();
                expect(result.isMatch).toBe(true);
            });

            test('fails with error when Certification Name mismatches HTML comparisonData', () => {
                const allData = {
                    comparisonData: {
                        'ASSIGNED TO VENDOR(S)': 'Michael S Airhart'
                    },
                    CERTIFICATION: {
                        'Name': 'David Smith'
                    }
                };
                const result = checkAppraiserVendorNameConsistency(
                    'Name',
                    'David Smith',
                    allData,
                    ['CERTIFICATION', 'Name']
                );
                expect(result).not.toBeNull();
                expect(result.isError).toBe(true);
                expect(result.message).toContain('Appraiser Name mismatch');
            });

            test('returns null when field is Supervisory Name (does not interfere with supervisory checks)', () => {
                const allData = {
                    comparisonData: {
                        'ASSIGNED TO VENDOR(S)': 'Michael S Airhart'
                    },
                    CERTIFICATION: {
                        'Supervisory Name': 'Jane Supervisor'
                    }
                };
                const result = checkAppraiserVendorNameConsistency(
                    'Supervisory Name',
                    'Jane Supervisor',
                    allData,
                    ['CERTIFICATION', 'Supervisory Name']
                );
                expect(result).toBeNull();
            });

            test('returns null when Certification has no HTML comparisonData loaded', () => {
                const allData = {
                    CERTIFICATION: {
                        'Name': 'Michael S. Airhart'
                    }
                };
                const result = checkAppraiserVendorNameConsistency(
                    'Name',
                    'Michael S. Airhart',
                    allData,
                    ['CERTIFICATION', 'Name']
                );
                expect(result).toBeNull();
            });
        });

        describe('checkAssignedToVendorHtmlConsistency alias', () => {
            test('is identical to checkAppraiserVendorNameConsistency', () => {
                expect(checkAssignedToVendorHtmlConsistency).toBe(checkAppraiserVendorNameConsistency);
            });
        });
    });
});
