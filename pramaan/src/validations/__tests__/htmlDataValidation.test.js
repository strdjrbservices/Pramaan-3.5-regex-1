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
    checkLenderAddressInconsistency
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
});

