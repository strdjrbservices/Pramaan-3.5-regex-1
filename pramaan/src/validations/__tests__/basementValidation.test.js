import {
    calculateFinishedBasementArea,
    checkBasementDetails,
    checkFoundationType
} from '../improvementsValidation';

import {
    parseBasementGridString,
    checkSubjectBasementGrid,
    checkBasementAdjustment,
    checkBasementAreaBracketing,
    checkBasementFinishedAreaBracketing,
    getSubjectBasementArea,
    getComparableBasementAreas,
    getSubjectBasementFinishedArea,
    getComparableBasementFinishedAreas
} from '../salesComparisonValidation';

describe('Basement Validation - Phase 1 & Phase 2', () => {

    describe('calculateFinishedBasementArea', () => {
        test('calculates finished basement area with rounding to nearest sq ft', () => {
            // User example: 1,349 sq ft @ 75% = 1011.75 -> 1012 sq ft
            expect(calculateFinishedBasementArea(1349, 75)).toBe(1012);
            expect(calculateFinishedBasementArea('1,349 sq.ft.', '75%')).toBe(1012);
            expect(calculateFinishedBasementArea(1544, 0)).toBe(0);
            expect(calculateFinishedBasementArea(0, 50)).toBe(0);
            expect(calculateFinishedBasementArea('', '')).toBe(0);
        });
    });

    describe('Phase 1: Improvements Section Validations', () => {
        test('Rule 1 & 3: Neither Full nor Partial Basement checked -> Basement Area & Finish must be 0', () => {
            const dataSlab = { 'Concrete Slab': 'checked', 'Full Basement': '', 'Partial Basement': '' };
            
            // Area 0 is valid
            const resAreaZero = checkBasementDetails('Basement Area', '0', dataSlab);
            expect(resAreaZero.isMatch).toBe(true);

            // Area > 0 is an error
            const resAreaNonZero = checkBasementDetails('Basement Area', '500', dataSlab);
            expect(resAreaNonZero.isError).toBe(true);

            // Finish 0% is valid
            const resFinishZero = checkBasementDetails('Basement Finish', '0', dataSlab);
            expect(resFinishZero.isMatch).toBe(true);

            // Finish > 0% is an error
            const resFinishNonZero = checkBasementDetails('Basement Finish', '50', dataSlab);
            expect(resFinishNonZero.isError).toBe(true);
        });

        test('Rule 2 & 5: Full or Partial Basement checked -> Basement Area > 0, Finish can be 0% or non-zero', () => {
            // Image 2: Full Basement checked, Area 1544, Finish 0% (unfinished)
            const dataFullUnfinished = {
                'Full Basement': 'checked',
                'Partial Basement': '',
                'Basement Area': '1544',
                'Basement Finish': '0'
            };
            const resArea1544 = checkBasementDetails('Basement Area', '1544', dataFullUnfinished);
            expect(resArea1544.isMatch).toBe(true);

            const resFinish0 = checkBasementDetails('Basement Finish', '0', dataFullUnfinished);
            expect(resFinish0.isMatch).toBe(true);

            // Area = 0 is an error
            const resArea0Err = checkBasementDetails('Basement Area', '0', dataFullUnfinished);
            expect(resArea0Err.isError).toBe(true);

            // Blank finish is an error
            const resFinishBlank = checkBasementDetails('Basement Finish', '', dataFullUnfinished);
            expect(resFinishBlank.isError).toBe(true);

            // Image 4: Full Basement checked, Area 1349, Finish 75%
            const dataFullFinished = {
                'Full Basement': 'checked',
                'Partial Basement': '',
                'Basement Area': '1349',
                'Basement Finish': '75'
            };
            const resArea1349 = checkBasementDetails('Basement Area', '1349', dataFullFinished);
            expect(resArea1349.isMatch).toBe(true);

            const resFinish75 = checkBasementDetails('Basement Finish', '75', dataFullFinished);
            expect(resFinish75.isMatch).toBe(true);
            expect(resFinish75.message).toContain('1,012 sq.ft.');
        });

        test('Rule 4: Both Full and Partial checked is NOT allowed', () => {
            const dataBoth = {
                'Full Basement': 'checked',
                'Partial Basement': 'checked',
                'Basement Area': '1349',
                'Basement Finish': '75'
            };
            const resBothDetails = checkBasementDetails('Basement Area', '1349', dataBoth);
            expect(resBothDetails.isError).toBe(true);

            const resBothType = checkFoundationType('Full Basement', 'checked', dataBoth);
            expect(resBothType.isError).toBe(true);
            expect(resBothType.message).toContain("Only one of 'Full Basement' or 'Partial Basement' can be selected");
        });
    });

    describe('Phase 1 Flow to Subject Grid Value', () => {
        test('decodes grid string: {totalArea}sf{finishedArea}sf{exit} and {rr}rr{br}br{ba}ba{o}o', () => {
            const parsed = parseBasementGridString('1349sf1012sfwo\n1rr0br1.0ba2o');
            expect(parsed.totalArea).toBe(1349);
            expect(parsed.finishedArea).toBe(1012);
            expect(parsed.exit).toBe('wo');
            expect(parsed.rooms.rr).toBe(1);
            expect(parsed.rooms.br).toBe(0);
            expect(parsed.rooms.ba).toBe(1.0);
            expect(parsed.rooms.o).toBe(2);
            expect(parsed.rooms.total).toBe(4);
        });

        test('validates Subject grid values match Improvements section', () => {
            const allData = {
                'Full Basement': 'checked',
                'Basement Area': '1349',
                'Basement Finish': '75',
                Subject: {
                    'Basement & Finished Rooms Below Grade': '1349sf1012sfwo\n1rr0br1.0ba2o',
                    'Basement Area': '1349',
                    'Basement Finish': '75'
                },
                'Comparable Sale # 1': {
                    'Basement & Finished Rooms Below Grade': '1248sf600sfwo\n1rr0br0.0ba0o',
                    'Basement & Finished Rooms Below Grade Adjustment': '+12,360\n+8,000'
                },
                'Comparable Sale # 2': {
                    'Basement & Finished Rooms Below Grade': '1170sf585sfwo 1rr0br0.0ba1o',
                    'Basement & Finished Rooms Below Grade Adjustment': '+12,810\n+8,000'
                },
                'Comparable Sale # 3': {
                    'Basement & Finished Rooms Below Grade': '1350sf675sfwo 1rr0br0.1ba1o',
                    'Basement & Finished Rooms Below Grade Adjustment': '+10,110\n+4,000'
                }
            };

            const res = checkSubjectBasementGrid('Basement & Finished Rooms Below Grade', '1349sf1012sfwo\n1rr0br1.0ba2o', allData);
            expect(res.isMatch).toBe(true);
            expect(res.message).toContain('matches Improvements section');

            // Total area mismatch fails
            const resAreaMismatch = checkSubjectBasementGrid('Basement & Finished Rooms Below Grade', '1400sf1012sfwo\n1rr0br1.0ba2o', allData);
            expect(resAreaMismatch.isError).toBe(true);
            expect(resAreaMismatch.message).toContain('does not match Improvements Basement Area');

            // Finished area mismatch fails
            const resFinishMismatch = checkSubjectBasementGrid('Basement & Finished Rooms Below Grade', '1349sf900sfwo\n1rr0br1.0ba2o', allData);
            expect(resFinishMismatch.isError).toBe(true);
            expect(resFinishMismatch.message).toContain('does not match calculated finished area');

            // Finished area > 0 but missing room count fails
            const resNoRooms = checkSubjectBasementGrid('Basement & Finished Rooms Below Grade', '1349sf1012sfwo', allData);
            expect(resNoRooms.isError).toBe(true);
            expect(resNoRooms.message).toContain('below grade room count is missing or 0');
        });
    });

    describe('Phase 2: Bracketing Validations', () => {
        const fullData = {
            Subject: {
                'Basement & Finished Rooms Below Grade': '1349sf1012sfwo\n1rr0br1.0ba2o'
            },
            'Comparable Sale # 1': {
                'Basement & Finished Rooms Below Grade': '1248sf600sfwo\n1rr0br0.0ba0o'
            },
            'Comparable Sale # 2': {
                'Basement & Finished Rooms Below Grade': '1170sf585sfwo 1rr0br0.0ba1o'
            },
            'Comparable Sale # 3': {
                'Basement & Finished Rooms Below Grade': '1350sf675sfwo 1rr0br0.1ba1o'
            }
        };

        test('a. actual basement area bracketing: 1349 is bracketed by 1170 and 1350', () => {
            const subjArea = getSubjectBasementArea(fullData);
            expect(subjArea).toBe(1349);

            const compAreas = getComparableBasementAreas(fullData);
            expect(compAreas).toEqual([1248, 1170, 1350]);

            const res = checkBasementAreaBracketing('Basement & Finished Rooms Below Grade', '1349sf1012sfwo\n1rr0br1.0ba2o', fullData, ['Subject', 'Basement & Finished Rooms Below Grade'], 'Subject');
            expect(res.isBracketed).toBe(true);
            expect(res.isMatch).toBe(true);
            expect(res.message).toContain('bracketed by comparables');
        });

        test('b. finished basement area bracketing: 1012 is unbracketed (all comps smaller: 585-675)', () => {
            const subjFinish = getSubjectBasementFinishedArea(fullData);
            expect(subjFinish).toBe(1012);

            const compFinishes = getComparableBasementFinishedAreas(fullData);
            expect(compFinishes).toEqual([600, 585, 675]);

            const res = checkBasementFinishedAreaBracketing('Basement & Finished Rooms Below Grade', '1349sf1012sfwo\n1rr0br1.0ba2o', fullData, ['Subject', 'Basement & Finished Rooms Below Grade'], 'Subject');
            expect(res.isBracketed).toBe(false);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('unbracketed (all comparables have less finished area)');
        });
    });

    describe('Phase 2: Adjustment with Comps and Room Count Breakdown', () => {
        const fullData = {
            Subject: {
                'Basement & Finished Rooms Below Grade': '1349sf1012sfwo\n1rr0br1.0ba2o'
            },
            'Comparable Sale # 1': {
                'Basement & Finished Rooms Below Grade': '1248sf600sfwo\n1rr0br0.0ba0o',
                'Basement & Finished Rooms Below Grade Adjustment': '+12,360\n+8,000'
            },
            'Comparable Sale # 2': {
                'Basement & Finished Rooms Below Grade': '1170sf585sfwo 1rr0br0.0ba1o',
                'Basement & Finished Rooms Below Grade Adjustment': '+12,810\n+8,000'
            },
            'Comparable Sale # 3': {
                'Basement & Finished Rooms Below Grade': '1350sf675sfwo 1rr0br0.1ba1o',
                'Basement & Finished Rooms Below Grade Adjustment': '+10,110\n+4,000'
            }
        };

        test('validates Comps 1, 2, and 3 from Image 5 with detailed difference breakdown', () => {
            // Comp 1: inferior -> positive adjustment is valid
            const res1 = checkBasementAdjustment('Basement & Finished Rooms Below Grade', '1248sf600sfwo\n1rr0br0.0ba0o', fullData, ['Comparable Sale # 1', 'Basement & Finished Rooms Below Grade'], 'Comparable Sale # 1');
            expect(res1.isMatch).toBe(true);
            expect(res1.message).toContain('Actual Area: 1248 vs 1349 sf (-101 sf)');
            expect(res1.message).toContain('Finished Area: 600 vs 1012 sf (-412 sf)');
            expect(res1.message).toContain('Baths: 0.0 vs 1.0 (-1.0)');
            expect(res1.message).toContain('Other Rooms: 0 vs 2 (-2)');

            // Comp 2
            const res2 = checkBasementAdjustment('Basement & Finished Rooms Below Grade', '1170sf585sfwo 1rr0br0.0ba1o', fullData, ['Comparable Sale # 2', 'Basement & Finished Rooms Below Grade'], 'Comparable Sale # 2');
            expect(res2.isMatch).toBe(true);
            expect(res2.message).toContain('Actual Area: 1170 vs 1349 sf (-179 sf)');
            expect(res2.message).toContain('Finished Area: 585 vs 1012 sf (-427 sf)');

            // Comp 3: half bath diff -> positive adjustment is valid
            const res3 = checkBasementAdjustment('Basement & Finished Rooms Below Grade', '1350sf675sfwo 1rr0br0.1ba1o', fullData, ['Comparable Sale # 3', 'Basement & Finished Rooms Below Grade'], 'Comparable Sale # 3');
            expect(res3.isMatch).toBe(true);
            expect(res3.message).toContain('Baths: 0.1 vs 1.0 (-0.9)');
        });

        test('flags error when inferior comp has a negative adjustment', () => {
            const badData = {
                Subject: { 'Basement & Finished Rooms Below Grade': '1349sf1012sfwo\n1rr0br1.0ba2o' },
                'Comparable Sale # 1': {
                    'Basement & Finished Rooms Below Grade': '1248sf600sfwo\n1rr0br0.0ba0o',
                    'Basement & Finished Rooms Below Grade Adjustment': '-12,000'
                }
            };
            const res = checkBasementAdjustment('Basement & Finished Rooms Below Grade', '1248sf600sfwo\n1rr0br0.0ba0o', badData, ['Comparable Sale # 1', 'Basement & Finished Rooms Below Grade'], 'Comparable Sale # 1');
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Comparable is inferior to Subject in basement');
            expect(res.message).toContain('adjustment is negative');
        });

        test('flags error when differing comp has blank adjustment', () => {
            const blankData = {
                Subject: { 'Basement & Finished Rooms Below Grade': '1349sf1012sfwo\n1rr0br1.0ba2o' },
                'Comparable Sale # 1': {
                    'Basement & Finished Rooms Below Grade': '1248sf600sfwo\n1rr0br0.0ba0o',
                    'Basement & Finished Rooms Below Grade Adjustment': ''
                }
            };
            const res = checkBasementAdjustment('Basement & Finished Rooms Below Grade', '1248sf600sfwo\n1rr0br0.0ba0o', blankData, ['Comparable Sale # 1', 'Basement & Finished Rooms Below Grade'], 'Comparable Sale # 1');
            expect(res.isError).toBe(true);
            expect(res.message).toContain('An adjustment is required, even if 0');
        });

        test('flags error when identical comp has non-zero adjustment, but passes with $0 or blank', () => {
            const identicalBadData = {
                Subject: { 'Basement & Finished Rooms Below Grade': '1349sf1012sfwo\n1rr0br1.0ba2o' },
                'Comparable Sale # 1': {
                    'Basement & Finished Rooms Below Grade': '1349sf1012sfwo\n1rr0br1.0ba2o',
                    'Basement & Finished Rooms Below Grade Adjustment': '+5,000'
                }
            };
            const resBad = checkBasementAdjustment('Basement & Finished Rooms Below Grade', '1349sf1012sfwo\n1rr0br1.0ba2o', identicalBadData, ['Comparable Sale # 1', 'Basement & Finished Rooms Below Grade'], 'Comparable Sale # 1');
            expect(resBad.isError).toBe(true);
            expect(resBad.message).toContain('Adjustment should be $0 or blank');

            const identicalGoodData = {
                Subject: { 'Basement & Finished Rooms Below Grade': '1349sf1012sfwo\n1rr0br1.0ba2o' },
                'Comparable Sale # 1': {
                    'Basement & Finished Rooms Below Grade': '1349sf1012sfwo\n1rr0br1.0ba2o',
                    'Basement & Finished Rooms Below Grade Adjustment': '$0'
                }
            };
            const resGood = checkBasementAdjustment('Basement & Finished Rooms Below Grade', '1349sf1012sfwo\n1rr0br1.0ba2o', identicalGoodData, ['Comparable Sale # 1', 'Basement & Finished Rooms Below Grade'], 'Comparable Sale # 1');
            expect(resGood.isMatch).toBe(true);
            expect(resGood.message).toContain('Validated with $0 / no adjustment');
        });
    });
});
