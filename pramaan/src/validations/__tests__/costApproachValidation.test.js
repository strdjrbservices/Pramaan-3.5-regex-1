import {
    checkCostNew,
    checkSourceOfCostData,
    checkOpinionOfSiteValue,
    checkRemainingEconomicLife,
    checkCostApproachFieldsNotBlank,
    checkIndicatedValueByCostApproach,
    isBplClient,
    isNotDevelopedComment,
    getMissingCostApproachFields,
    isCostApproachFulfilled,
    checkBplCostApproachReplication
} from '../costApproachValidation';

describe('costApproachValidation - BPL & Replication Validations', () => {
    describe('isBplClient', () => {
        test('identifies BPL across various client/lender fields', () => {
            expect(isBplClient({ selectedClient: 'BPL Mortgage, LLC' })).toBe(true);
            expect(isBplClient({ client: 'BPL' })).toBe(true);
            expect(isBplClient({ Client: 'bpl mortgage' })).toBe(true);
            expect(isBplClient({ 'Client Name': 'BPL Mortgage LLC' })).toBe(true);
            expect(isBplClient({ 'Lender/Client': 'BPL Mortgage, LLC' })).toBe(true);
            expect(isBplClient({ 'Lender/Client Company Name': 'BPL' })).toBe(true);
            expect(isBplClient({ Subject: { 'Lender/Client': 'BPL Mortgage, LLC' } })).toBe(true);
            expect(isBplClient({ clean_data: { 'Lender/Client': 'BPL' } })).toBe(true);
            expect(isBplClient({ html_data: { 'Client/Lender on Report': 'BPL Mortgage, LLC' } })).toBe(true);
            expect(isBplClient({ order_data: { client: 'BPL' } })).toBe(true);
            expect(isBplClient({ selectedClient: 'Coast2Coast Mortgage' })).toBe(true);
        });

        test('returns false for non-BPL clients or empty data', () => {
            expect(isBplClient(null)).toBe(false);
            expect(isBplClient({})).toBe(false);
            expect(isBplClient({ selectedClient: 'Chase Bank' })).toBe(false);
            expect(isBplClient({ 'Lender/Client': 'Plaza Home Mortgage, Inc.' })).toBe(false);
            expect(isBplClient({ client: 'Visio Financial' })).toBe(false);
        });
    });

    describe('isNotDevelopedComment', () => {
        test('identifies comments indicating cost approach was not developed or limits reliability', () => {
            expect(isNotDevelopedComment('not developed')).toBe(true);
            expect(isNotDevelopedComment('The Cost Approach was not developed for this property.')).toBe(true);
            expect(isNotDevelopedComment('Cost approach is not developed')).toBe(true);
            expect(isNotDevelopedComment('was not developed')).toBe(true);
            expect(isNotDevelopedComment('cannot be developed')).toBe(true);
            expect(isNotDevelopedComment('could not be developed')).toBe(true);
            expect(isNotDevelopedComment('not applicable')).toBe(true);
            expect(isNotDevelopedComment('not performed')).toBe(true);
            expect(isNotDevelopedComment('not completed')).toBe(true);
            expect(isNotDevelopedComment('not utilized')).toBe(true);
            expect(isNotDevelopedComment('omitted')).toBe(true);
            expect(isNotDevelopedComment('The cost approach was considered, however estimating accrued depreciation limits the reliability of this approach.')).toBe(true);
            expect(isNotDevelopedComment('limits the reliability of this approach to value')).toBe(true);
            expect(isNotDevelopedComment('less reliable')).toBe(true);
        });

        test('returns false for valid replication comments or empty text', () => {
            expect(isNotDevelopedComment('')).toBe(false);
            expect(isNotDevelopedComment(null)).toBe(false);
            expect(isNotDevelopedComment(undefined)).toBe(false);
            expect(isNotDevelopedComment('Cost data obtained from Marshall & Swift Residential Handbook.')).toBe(false);
            expect(isNotDevelopedComment('Calculated based on local building contractor estimates.')).toBe(false);
        });
    });

    describe('isCostApproachFulfilled & getMissingCostApproachFields', () => {
        const fullCostApproachData = {
            COST_APPROACH: {
                'Indicated Value by Cost Approach': '$350,000',
                'OPINION OF SITE VALUE = $ ................................................': '$85,000',
                'Dwelling': '$250,000',
                'Total Estimate of Cost-New = $ ...................': '$320,000',
                'Source of cost data': 'Marshall & Swift',
                'Quality rating from cost service ': 'Q4',
                'Effective date of cost data ': '01/2026',
                'Estimated Remaining Economic Life (HUD and VA only)': '60',
                'Depreciated Cost of Improvements......................................................=$ ': '$265,000'
            }
        };

        test('returns true when all Cost Approach values are present', () => {
            expect(isCostApproachFulfilled(fullCostApproachData)).toBe(true);
            expect(getMissingCostApproachFields(fullCostApproachData)).toEqual([]);
        });

        test('returns false if only Opinion of Site Value is present (e.g. user screenshot)', () => {
            const partialData = {
                COST_APPROACH: {
                    'OPINION OF SITE VALUE = $ ................................................': '$15,000',
                    'Estimated Remaining Economic Life (HUD and VA only)': '60',
                    'Dwelling': '0',
                    'Total Estimate of Cost-New = $ ...................': '0',
                    'Depreciated Cost of Improvements......................................................=$ ': '0',
                    'Indicated Value by Cost Approach': '0',
                    'Source of cost data': '',
                    'Quality rating from cost service ': '',
                    'Effective date of cost data ': ''
                }
            };
            expect(isCostApproachFulfilled(partialData)).toBe(false);
            const missing = getMissingCostApproachFields(partialData);
            expect(missing).toContain('Indicated Value by Cost Approach');
            expect(missing).toContain('Dwelling');
            expect(missing).toContain('Total Estimate of Cost-New');
            expect(missing).toContain('Source of cost data');
            expect(missing).toContain('Quality rating');
            expect(missing).toContain('Effective date of cost data');
            expect(missing).toContain('Depreciated Cost of Improvements');
        });

        test('returns false when Cost Approach data is null or empty', () => {
            expect(isCostApproachFulfilled(null)).toBe(false);
            expect(isCostApproachFulfilled({})).toBe(false);
        });
    });

    describe('checkBplCostApproachReplication', () => {
        const fieldWithDot = "Provide adequate information for the lender/client to replicate the below cost figures and calculations.";
        const fieldWithoutDot = "Provide adequate information for the lender/client to replicate the below cost figures and calculations";

        const completedCostData = {
            selectedClient: 'BPL Mortgage, LLC',
            COST_APPROACH: {
                'Indicated Value by Cost Approach': '$380,000',
                'OPINION OF SITE VALUE = $ ................................................': '$75,000',
                'Dwelling': '$280,000',
                'Total Estimate of Cost-New = $ ...................': '$310,000',
                'Source of cost data': 'Marshall & Swift',
                'Quality rating from cost service ': 'Q3',
                'Effective date of cost data ': '10/2026',
                'Estimated Remaining Economic Life (HUD and VA only)': '55',
                'Depreciated Cost of Improvements......................................................=$ ': '$305,000'
            }
        };

        test('returns null for unrelated fields', () => {
            const bplData = { selectedClient: 'BPL Mortgage, LLC' };
            expect(checkBplCostApproachReplication('Random Field', 'not developed', bplData)).toBeNull();
        });

        test('returns null when client is not BPL', () => {
            const nonBplData = { selectedClient: 'Wells Fargo' };
            expect(checkBplCostApproachReplication(fieldWithDot, 'not developed', nonBplData)).toBeNull();
            expect(checkBplCostApproachReplication(fieldWithDot, '', nonBplData)).toBeNull();
        });

        test('returns error "the take the advise from the team" when value contains "not developed"', () => {
            const bplData = { selectedClient: 'BPL Mortgage, LLC' };
            const result1 = checkBplCostApproachReplication(fieldWithDot, 'Cost approach was not developed.', bplData);
            expect(result1).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: "the take the advise from the team"
            });

            const result2 = checkBplCostApproachReplication(fieldWithoutDot, 'not developed', bplData);
            expect(result2).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: "the take the advise from the team"
            });

            const result3 = checkBplCostApproachReplication(fieldWithDot, 'Cost approach not applicable for this appraisal', bplData);
            expect(result3).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: "the take the advise from the team"
            });

            const result4 = checkBplCostApproachReplication(
                fieldWithDot,
                'The cost approach to value was considered, however estimating accrued depreciation from all causes limits the reliability of this approach to value. The cost approach was in this appraisal.',
                bplData
            );
            expect(result4).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: "the take the advise from the team"
            });
        });

        test('returns error "the take the advise from the team" when Comments on Cost Approach contains "not developed"', () => {
            const bplDataWithComment = {
                selectedClient: 'BPL Mortgage, LLC',
                COST_APPROACH: {
                    'Comments on Cost Approach (gross living area calculations, depreciation, etc.)': 'The cost approach was not developed in this appraisal.'
                }
            };
            const result = checkBplCostApproachReplication(
                fieldWithDot,
                'Cost figures replicated from Marshall & Swift handbook.',
                bplDataWithComment
            );
            expect(result).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: "the take the advise from the team"
            });
        });

        test('returns error when client is BPL and Cost Approach section is NOT fulfilled', () => {
            const bplDataUnfulfilled = {
                selectedClient: 'BPL Mortgage, LLC',
                COST_APPROACH: {
                    'OPINION OF SITE VALUE = $ ................................................': '15000',
                    'Dwelling': '0',
                    'Indicated Value by Cost Approach': '0'
                }
            };

            const resultWithText = checkBplCostApproachReplication(
                fieldWithDot,
                'Replication details using local cost data',
                bplDataUnfulfilled
            );
            expect(resultWithText.isError).toBe(true);
            expect(resultWithText.skipBlankFilter).toBe(true);
            expect(resultWithText.message).toContain("Cost Approach section must be full filled for BPL client");
            expect(resultWithText.message).toContain("All cost approach values must be present");
        });

        test('returns valid when client is BPL, replication text is valid, and ALL Cost Approach values are present', () => {
            const result = checkBplCostApproachReplication(
                fieldWithDot,
                'Marshall & Swift Residential Cost Handbook used for replacement costs.',
                completedCostData
            );
            expect(result).toEqual({
                isMatch: true,
                skipBlankFilter: true,
                message: "Cost Approach section is fulfilled for BPL client."
            });
        });

        test('returns error when client is BPL, Cost Approach is fulfilled, but replication field itself is blank', () => {
            const result = checkBplCostApproachReplication(fieldWithDot, '', completedCostData);
            expect(result).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: "Provide adequate information for the lender/client to replicate the below cost figures and calculations cannot be blank for BPL client."
            });
        });
    });

    describe('checkIndicatedValueByCostApproach', () => {
        const fieldName = 'Indicated Value by Cost Approach';

        test('returns error "the take the advise from the team" for BPL client when comments indicate "not developed"', () => {
            const bplData = {
                selectedClient: 'BPL Mortgage, LLC',
                COST_APPROACH: {
                    'Provide adequate information for the lender/client to replicate the below cost figures and calculations.': 'Cost approach not developed.'
                }
            };
            const result = checkIndicatedValueByCostApproach(fieldName, '', bplData);
            expect(result).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: "the take the advise from the team"
            });
        });

        test('returns error "Cost Approach section must be full filled for BPL client..." when blank for BPL client', () => {
            const bplData = {
                selectedClient: 'BPL Mortgage, LLC',
                COST_APPROACH: {}
            };
            const result = checkIndicatedValueByCostApproach(fieldName, '', bplData);
            expect(result.isError).toBe(true);
            expect(result.skipBlankFilter).toBe(true);
            expect(result.message).toContain("Cost Approach section must be full filled for BPL client");
        });

        test('standard validation for non-BPL client when blank without explanation', () => {
            const regularData = {
                selectedClient: 'Chase Bank',
                COST_APPROACH: {}
            };
            const result = checkIndicatedValueByCostApproach(fieldName, '', regularData);
            expect(result.isError).toBe(true);
            expect(result.message).toContain("If 'Indicated Value by Cost Approach' is blank");
        });
    });

    describe('checkCostApproachFieldsNotBlank for BPL vs non-BPL', () => {
        const bplData = { selectedClient: 'BPL Mortgage, LLC' };
        const regularData = { selectedClient: 'Chase Bank' };

        test('flags zero or blank for Dwelling when BPL', () => {
            const resultZero = checkCostApproachFieldsNotBlank('Dwelling', '0', bplData);
            expect(resultZero).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: "'Dwelling' is required and must not be blank or zero for BPL client."
            });

            const resultBlank = checkCostApproachFieldsNotBlank('Dwelling', '', bplData);
            expect(resultBlank).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: "'Dwelling' is required and must not be blank or zero for BPL client."
            });

            const resultValid = checkCostApproachFieldsNotBlank('Dwelling', '250,000', bplData);
            expect(resultValid).toEqual({
                isMatch: true,
                skipBlankFilter: true,
                message: "'Dwelling' is present."
            });
        });

        test('flags zero or blank for Total Estimate of Cost-New when BPL', () => {
            const resultZero = checkCostApproachFieldsNotBlank('Total Estimate of Cost-New = $ ...................', '0', bplData);
            expect(resultZero).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: "'Total Estimate of Cost-New = $ ...................' is required and must not be blank or zero for BPL client."
            });
        });

        test('flags "the take the advise from the team" if Comments on Cost Approach has "not developed" for BPL', () => {
            const result = checkCostApproachFieldsNotBlank(
                'Comments on Cost Approach (gross living area calculations, depreciation, etc.)',
                'The cost approach was not developed in this appraisal.',
                bplData
            );
            expect(result).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: "the take the advise from the team"
            });
        });

        test('standard behavior for non-BPL client', () => {
            expect(checkCostApproachFieldsNotBlank('Dwelling', '', regularData)).toEqual({
                isError: true,
                message: "'Dwelling' should not be blank."
            });
            expect(checkCostApproachFieldsNotBlank('Dwelling', '$200,000', regularData)).toBeNull();
        });
    });

    describe('other existing Cost Approach validations', () => {
        test('checkCostNew requires either Reproduction or Replacement', () => {
            expect(checkCostNew('ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW', '')).toEqual({
                isError: true,
                skipBlankFilter: false,
                message: "'ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW' cannot be blank. One option must be selected."
            });
            expect(checkCostNew('ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW', 'Replacement')).toEqual({
                isMatch: true,
                skipBlankFilter: false,
                message: "Estimated cost new type is valid."
            });
        });

        test('checkSourceOfCostData requires non-blank value', () => {
            expect(checkSourceOfCostData('Source of cost data', '')).toEqual({
                isError: true,
                skipBlankFilter: false,
                message: "'Source of cost data' cannot be blank."
            });
            expect(checkSourceOfCostData('Source of cost data', 'Marshall & Swift')).toEqual({
                isMatch: true,
                skipBlankFilter: false,
                message: "'Source of cost data' is present."
            });
        });

        test('checkOpinionOfSiteValue requires value', () => {
            expect(checkOpinionOfSiteValue('OPINION OF SITE VALUE', '', {})).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: "'OPINION OF SITE VALUE' in Cost Calculations is mandatory and must not be blank."
            });
            expect(checkOpinionOfSiteValue('OPINION OF SITE VALUE', '100,000', {})).toEqual({
                isMatch: true,
                skipBlankFilter: true,
                message: "'OPINION OF SITE VALUE' is present."
            });
        });

        test('checkRemainingEconomicLife requires value', () => {
            expect(checkRemainingEconomicLife('Remaining Economic Life', '', {})).toEqual({
                isError: true,
                skipBlankFilter: true,
                message: "'Remaining Economic Life' in Cost Approach is mandatory and must not be blank."
            });
            expect(checkRemainingEconomicLife('Remaining Economic Life', '50', {})).toEqual({
                isMatch: true,
                skipBlankFilter: true,
                message: "'Remaining Economic Life' is present."
            });
        });
    });
});
