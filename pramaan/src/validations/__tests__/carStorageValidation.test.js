import { checkCarStorage, getSketchGarageCarport } from '../improvementsValidation';
import {
    parseGarageGridString,
    checkSubjectGarageGrid,
    checkGarageCarportBracketing,
    checkGarageCarportAdjustment
} from '../salesComparisonValidation';

describe('Car Storage & Garage/Carport Validation Suite', () => {

    describe('Improvements Section - Scenario 1: None is marked', () => {
        test('passes and disregards other details when None is marked', () => {
            // Even if Driveway or Carport has residual values/checks, None disregards all details
            const data = {
                'Car Storage': 'None',
                'Driveway # of Cars': '1',
                'Driveway Surface': 'Asphalt',
                'Garage # of Cars': '0',
                'Carport # of Cars': '1',
                'Att./Det./Built-in': 'Attached'
            };

            const res = checkCarStorage('Car Storage', 'None', data);
            expect(res.isMatch).toBe(true);
            expect(res.isError).toBeFalsy();
            expect(res.message).toContain("marked 'None'");
            expect(res.message).toContain('disregarded');

            // Individual fields also pass when None is marked
            expect(checkCarStorage('Driveway Surface', '', data).isMatch).toBe(true);
            expect(checkCarStorage('Driveway # of Cars', '0', data).isMatch).toBe(true);
            expect(checkCarStorage('Att./Det./Built-in', '', data).isMatch).toBe(true);
        });

        test('detects None from Car Storage None flag', () => {
            const data = {
                'Car Storage None': 'Yes',
                'Car Storage': ''
            };
            const res = checkCarStorage('Car Storage', '', data);
            expect(res.isMatch).toBe(true);
            expect(res.message).toContain("marked 'None'");
        });
    });

    describe('Improvements Section - Scenario 2: None is not marked', () => {
        test('fails if none of Driveway, Garage, or Carport is checked', () => {
            const data = {
                'Car Storage': '',
                'Driveway # of Cars': '',
                'Garage # of Cars': '',
                'Carport # of Cars': ''
            };
            const res = checkCarStorage('Car Storage', '', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("at least one of 'Driveway', 'Garage', or 'Carport' must be checked");
        });

        test('Driveway: passes when checked, # of cars > 0, and surface provided', () => {
            const data = {
                'Car Storage': 'Driveway',
                'Driveway # of Cars': '2',
                'Driveway Surface': 'Asphalt'
            };
            expect(checkCarStorage('Car Storage', 'Driveway', data).isMatch).toBe(true);
            expect(checkCarStorage('Driveway # of Cars', '2', data).isMatch).toBe(true);
            expect(checkCarStorage('Driveway Surface', 'Asphalt', data).isMatch).toBe(true);
        });

        test('Driveway: fails when # of cars is 0 or blank', () => {
            const dataZero = {
                'Car Storage': 'Driveway',
                'Driveway # of Cars': '0',
                'Driveway Surface': 'Asphalt'
            };
            const resZero = checkCarStorage('Driveway # of Cars', '0', dataZero);
            expect(resZero.isError).toBe(true);
            expect(resZero.message).toContain("must be greater than 0");

            const dataBlank = {
                'Car Storage': 'Driveway',
                'Driveway # of Cars': '',
                'Driveway Surface': 'Asphalt'
            };
            const resBlank = checkCarStorage('Driveway # of Cars', '', dataBlank);
            expect(resBlank.isError).toBe(true);
            expect(resBlank.message).toContain("must be greater than 0");
        });

        test('Driveway: fails when Driveway Surface is blank', () => {
            const dataNoSurf = {
                'Car Storage': 'Driveway',
                'Driveway # of Cars': '1',
                'Driveway Surface': ''
            };
            const resSurf = checkCarStorage('Driveway Surface', '', dataNoSurf);
            expect(resSurf.isError).toBe(true);
            expect(resSurf.message).toContain("'Driveway Surface' is mandatory");

            const resOverall = checkCarStorage('Car Storage', 'Driveway', dataNoSurf);
            expect(resOverall.isError).toBe(true);
            expect(resOverall.message).toContain("'Driveway Surface' is mandatory");
        });

        test('Garage: passes when checked, # of cars > 0, and attachment type provided', () => {
            const data = {
                'Car Storage': 'Garage',
                'Garage # of Cars': '2',
                'Att./Det./Built-in': 'Detached'
            };
            expect(checkCarStorage('Car Storage', 'Garage', data).isMatch).toBe(true);
            expect(checkCarStorage('Garage # of Cars', '2', data).isMatch).toBe(true);
            expect(checkCarStorage('Att./Det./Built-in', 'Detached', data).isMatch).toBe(true);
        });

        test('Garage: fails when # of cars is 0 or blank', () => {
            const data = {
                'Car Storage': 'Garage',
                'Garage # of Cars': '0',
                'Att./Det./Built-in': 'Attached'
            };
            const res = checkCarStorage('Garage # of Cars', '0', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("must be greater than 0");
        });

        test('Garage: fails when attachment type is missing', () => {
            const data = {
                'Car Storage': 'Garage',
                'Garage # of Cars': '2',
                'Att./Det./Built-in': ''
            };
            const res = checkCarStorage('Att./Det./Built-in', '', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("Attachment type ('Attached', 'Detached', or 'Built-in') is mandatory");
        });

        test('Carport: passes when checked, # of cars > 0, and attachment type provided', () => {
            const data = {
                'Car Storage': 'Carport',
                'Carport # of Cars': '1',
                'Att./Det./Built-in': 'Attached'
            };
            expect(checkCarStorage('Car Storage', 'Carport', data).isMatch).toBe(true);
            expect(checkCarStorage('Carport # of Cars', '1', data).isMatch).toBe(true);
            expect(checkCarStorage('Att./Det./Built-in', 'Attached', data).isMatch).toBe(true);
        });

        test('Carport: fails when # of cars is 0 or attachment type missing', () => {
            const dataNoCars = {
                'Car Storage': 'Carport',
                'Carport # of Cars': '0',
                'Att./Det./Built-in': 'Attached'
            };
            expect(checkCarStorage('Carport # of Cars', '0', dataNoCars).isError).toBe(true);

            const dataNoAtt = {
                'Car Storage': 'Carport',
                'Carport # of Cars': '1',
                'Att./Det./Built-in': ''
            };
            expect(checkCarStorage('Att./Det./Built-in', '', dataNoAtt).isError).toBe(true);
            expect(checkCarStorage('Att./Det./Built-in', '', dataNoAtt).message).toContain("Attachment type");
        });

        test('Multiple checkmarks: Driveway + Carport (Image 1 & 2 Scenario)', () => {
            const data = {
                'Car Storage': 'Driveway, Carport',
                'Driveway # of Cars': '1',
                'Driveway Surface': 'Asphalt',
                'Carport # of Cars': '1',
                'Att./Det./Built-in': 'Attached'
            };
            const res = checkCarStorage('Car Storage', 'Driveway, Carport', data);
            expect(res.isMatch).toBe(true);
            expect(res.message).toContain('1 Car Attached Carport');
            expect(res.message).toContain('1 Car Driveway (Asphalt)');
        });

        test('Multiple checkmarks: Driveway + Garage (Image 3 & 4 Scenario)', () => {
            const data = {
                'Car Storage': 'Driveway, Garage',
                'Driveway # of Cars': '2',
                'Driveway Surface': 'Paved Asphalt',
                'Garage # of Cars': '2',
                'Att./Det./Built-in': 'Detached'
            };
            const res = checkCarStorage('Car Storage', 'Driveway, Garage', data);
            expect(res.isMatch).toBe(true);
            expect(res.message).toContain('2 Car Detached Garage');
            expect(res.message).toContain('2 Car Driveway (Paved Asphalt)');
        });
    });

    describe('Sketch Verification for Garage & Carport', () => {
        test('verifies Garage matches sketch (Image 4: 2 Car Detached)', () => {
            const data = {
                'Car Storage': 'Garage',
                'Garage # of Cars': '2',
                'Att./Det./Built-in': 'Detached',
                sketches: [
                    {
                        areas: [{ name: '2 Car Detached', area: '672 Sq ft' }],
                        room_labels: ['2 Car Detached']
                    }
                ]
            };
            const sketchInfo = getSketchGarageCarport(data);
            expect(sketchInfo.hasGarage).toBe(true);
            expect(sketchInfo.garageType).toBe('Detached');

            const res = checkCarStorage('Car Storage', 'Garage', data);
            expect(res.isMatch).toBe(true);
            expect(res.message).toContain('verified on sketch');
        });

        test('fails when Improvements specifies Detached Garage but sketch shows Attached', () => {
            const data = {
                'Car Storage': 'Garage',
                'Garage # of Cars': '2',
                'Att./Det./Built-in': 'Detached',
                sketches: [
                    {
                        areas: [{ name: 'Attached Garage', area: '500 Sq ft' }],
                        room_labels: ['Attached Garage']
                    }
                ]
            };
            const res = checkCarStorage('Att./Det./Built-in', 'Detached', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("Improvements indicates 'Detached' Garage; however, building sketch depicts 'Attached' Garage");
        });

        test('verifies Carport matches sketch (Image 3: 1-Car/Attached Carport)', () => {
            const data = {
                'Car Storage': 'Carport',
                'Carport # of Cars': '1',
                'Att./Det./Built-in': 'Attached',
                sketches: [
                    {
                        areas: [{ name: '1-Car/Attached Carport', area: '299 Sq ft' }],
                        room_labels: ['1-Car/Attached Carport']
                    }
                ]
            };
            const sketchInfo = getSketchGarageCarport(data);
            expect(sketchInfo.hasCarport).toBe(true);
            expect(sketchInfo.carportType).toBe('Attached');

            const res = checkCarStorage('Car Storage', 'Carport', data);
            expect(res.isMatch).toBe(true);
            expect(res.message).toContain('verified on sketch');
        });
    });

    describe('Sales Comparison Grid - Garage/Carport Decoding & Validation', () => {
        test('decodes 1cp1dw (Image 2: 1 carport, 1 driveway)', () => {
            const parsed = parseGarageGridString('1cp1dw');
            expect(parsed.carport.count).toBe(1);
            expect(parsed.carport.exists).toBe(true);
            expect(parsed.driveway.count).toBe(1);
            expect(parsed.driveway.exists).toBe(true);
            expect(parsed.garage.count).toBe(0);
            expect(parsed.totalCoveredCars).toBe(1);
            expect(parsed.totalCars).toBe(2);
        });

        test('decodes 2gd2dw (Image 4: 2 car detached garage, 2 driveway)', () => {
            const parsed = parseGarageGridString('2gd2dw');
            expect(parsed.garage.count).toBe(2);
            expect(parsed.garage.type).toBe('det');
            expect(parsed.garage.exists).toBe(true);
            expect(parsed.driveway.count).toBe(2);
            expect(parsed.driveway.exists).toBe(true);
            expect(parsed.carport.count).toBe(0);
            expect(parsed.totalCoveredCars).toBe(2);
            expect(parsed.totalCars).toBe(4);
        });

        test('decodes 2ga2dw, 2ga, 1gbi, and None', () => {
            const p1 = parseGarageGridString('2ga2dw');
            expect(p1.garage.count).toBe(2);
            expect(p1.garage.type).toBe('att');
            expect(p1.driveway.count).toBe(2);

            const p2 = parseGarageGridString('2ga');
            expect(p2.garage.count).toBe(2);
            expect(p2.garage.type).toBe('att');

            const p3 = parseGarageGridString('1gbi');
            expect(p3.garage.count).toBe(1);
            expect(p3.garage.type).toBe('builtin');

            const p4 = parseGarageGridString('None');
            expect(p4.isNone).toBe(true);
            expect(p4.totalCars).toBe(0);
        });

        test('validates Subject grid 1cp1dw matches Improvements (Carport 1 + Driveway 1)', () => {
            const allData = {
                'Car Storage': 'Driveway, Carport',
                'Driveway # of Cars': '1',
                'Driveway Surface': 'Asphalt',
                'Carport # of Cars': '1',
                'Att./Det./Built-in': 'Attached'
            };
            const res = checkSubjectGarageGrid('Garage/Carport', '1cp1dw', allData);
            expect(res.isMatch).toBe(true);
            expect(res.message).toContain('matches Improvements section');
            expect(res.message).toContain('1 Car Carport');
            expect(res.message).toContain('1 Car Driveway');
        });

        test('validates Subject grid 2gd2dw matches Improvements (Garage 2 Detached + Driveway 2)', () => {
            const allData = {
                'Car Storage': 'Driveway, Garage',
                'Driveway # of Cars': '2',
                'Driveway Surface': 'Paved Asphalt',
                'Garage # of Cars': '2',
                'Att./Det./Built-in': 'Detached'
            };
            const res = checkSubjectGarageGrid('Garage/Carport', '2gd2dw', allData);
            expect(res.isMatch).toBe(true);
            expect(res.message).toContain('matches Improvements section');
            expect(res.message).toContain('2 Car Detached Garage');
        });

        test('fails when Subject grid specifies attached (2ga) but Improvements indicates detached', () => {
            const allData = {
                'Car Storage': 'Garage',
                'Garage # of Cars': '2',
                'Att./Det./Built-in': 'Detached'
            };
            const res = checkSubjectGarageGrid('Garage/Carport', '2ga', allData);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("specifies attached ('a'), but Improvements indicates detached ('d')");
        });

        test('fails when Subject grid has garage count mismatch', () => {
            const allData = {
                'Car Storage': 'Garage',
                'Garage # of Cars': '2',
                'Att./Det./Built-in': 'Detached'
            };
            const res = checkSubjectGarageGrid('Garage/Carport', '1gd', allData);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('specifies 1 garage car(s), but Improvements section specifies 2');
        });

        test('fails when Subject grid has garage while Improvements is None', () => {
            const allData = {
                'Car Storage': 'None'
            };
            const res = checkSubjectGarageGrid('Garage/Carport', '2ga', allData);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("marks Car Storage as 'None'");
        });
    });

    describe('Comparable Sales - Bracketing & Adjustments', () => {
        const gridData = {
            Subject: { 'Garage/Carport': '2gd2dw' },
            'Comparable Sale # 1': { 'Garage/Carport': '1ga1dw', 'Garage/Carport Adjustment': '+5,000' },
            'Comparable Sale # 2': { 'Garage/Carport': '2ga2dw', 'Garage/Carport Adjustment': '0' },
            'Comparable Sale # 3': { 'Garage/Carport': '3ga2dw', 'Garage/Carport Adjustment': '-5,000' }
        };

        test('validates Subject 2gd is bracketed by 1ga and 3ga', () => {
            const res = checkGarageCarportBracketing('Garage/Carport', '2gd2dw', gridData);
            expect(res.isMatch).toBe(true);
            expect(res.message).toContain('bracketed by comps');
        });

        test('validates positive adjustment when Comp has fewer garage cars (1ga vs 2gd)', () => {
            const comp1 = gridData['Comparable Sale # 1'];
            const res = checkGarageCarportAdjustment('Garage/Carport Adjustment', '+5,000', gridData, comp1, 1);
            expect(res.isMatch).toBe(true);
            expect(res.message).toContain('consistent with capacity difference');
        });

        test('validates negative adjustment when Comp has more garage cars (3ga vs 2gd)', () => {
            const comp3 = gridData['Comparable Sale # 3'];
            const res = checkGarageCarportAdjustment('Garage/Carport Adjustment', '-5,000', gridData, comp3, 3);
            expect(res.isMatch).toBe(true);
            expect(res.message).toContain('consistent with capacity difference');
        });

        test('fails when Comp has more garage cars but positive adjustment', () => {
            const compSuperior = { 'Garage/Carport': '3ga2dw', 'Garage/Carport Adjustment': '+5,000' };
            const res = checkGarageCarportAdjustment('Garage/Carport Adjustment', '+5,000', gridData, compSuperior, 3);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Expected negative (-)');
        });

        test('fails when Comp has fewer garage cars but negative adjustment', () => {
            const compInferior = { 'Garage/Carport': '1ga1dw', 'Garage/Carport Adjustment': '-5,000' };
            const res = checkGarageCarportAdjustment('Garage/Carport Adjustment', '-5,000', gridData, compInferior, 1);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('Expected positive (+) ');
        });

        test('fails when Comp values do not match Subject and adjustment is not present', () => {
            const noneGrid = {
                Subject: { 'Garage/Carport': 'NONE' },
                'Comparable Sale # 1': { 'Garage/Carport': '56ga', 'Garage/Carport Adjustment': '' },
                'Comparable Sale # 4': { 'Garage/Carport': '1dw', 'Garage/Carport Adjustment': '' }
            };
            const comp1 = noneGrid['Comparable Sale # 1'];
            const res1 = checkGarageCarportAdjustment('Garage/Carport Adjustment', '', noneGrid, comp1, 1);
            expect(res1.isError).toBe(true);
            expect(res1.message).toContain("differs from Subject ('NONE')");
            expect(res1.message).toContain('no adjustment is present');

            const comp4 = noneGrid['Comparable Sale # 4'];
            const res4 = checkGarageCarportAdjustment('Garage/Carport Adjustment', '', noneGrid, comp4, 4);
            expect(res4.isError).toBe(true);
            expect(res4.message).toContain("differs from Subject ('NONE')");
            expect(res4.message).toContain('no adjustment is present');

            // When adjustment IS present for 56ga (e.g. -$5,000), shows as valid
            const comp1WithAdj = { 'Garage/Carport': '56ga', 'Garage/Carport Adjustment': '-$5,000' };
            const res1WithAdj = checkGarageCarportAdjustment('Garage/Carport Adjustment', '-$5,000', noneGrid, comp1WithAdj, 1);
            expect(res1WithAdj.isMatch).toBe(true);
            expect(res1WithAdj.message).toContain('consistent with capacity difference');

            // When adjustment '0' is entered for 56ga or 1dw, adjustment '0' is a valid adjustment
            const comp1WithZero = { 'Garage/Carport': '56ga', 'Garage/Carport Adjustment': '0' };
            const res1WithZero = checkGarageCarportAdjustment('Garage/Carport Adjustment', '0', noneGrid, comp1WithZero, 1);
            expect(res1WithZero.isMatch).toBe(true);
            expect(res1WithZero.message).toContain('validated with $0 adjustment');
        });

        test('flags unrecognized format like 56 as error (not treated as 0 / None)', () => {
            const parsed = parseGarageGridString('56');
            expect(parsed.isValidFormat).toBe(false);
            expect(parsed.isNone).toBe(false);

            const compWith56 = { 'Garage/Carport': '56', 'Garage/Carport Adjustment': '0' };
            const res = checkGarageCarportAdjustment('Garage/Carport', '56', gridData, compWith56, 1);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("value '56' is not a recognized format");
        });

        test('validates equal capacity when Comp and Subject are both None / 0 with $0 adjustment', () => {
            const noneGrid = {
                Subject: { 'Garage/Carport': 'NONE' },
                'Comparable Sale # 1': { 'Garage/Carport': 'None', 'Garage/Carport Adjustment': '0' }
            };
            const compNone = noneGrid['Comparable Sale # 1'];
            const resAdj = checkGarageCarportAdjustment('Garage/Carport Adjustment', '0', noneGrid, compNone, 1);
            expect(resAdj.isMatch).toBe(true);
            expect(resAdj.message).toContain('equal capacity to Subject');
            expect(resAdj.message).toContain('$0 adjustment');

            const resDesc = checkGarageCarportAdjustment('Garage/Carport', 'None', noneGrid, compNone, 1);
            expect(resDesc.isMatch).toBe(true);
            expect(resDesc.message).toContain('equal capacity to Subject');
        });
    });
});
