import {
  getNeighborhoodTwelveMonthSalesRange,
  checkCompSalePriceWithinNeighborhoodRange,
  checkSalePrice,
  checkProximityToSubject,
  checkComparableAddressDuplicates
} from '../salesComparisonValidation';

describe('Neighborhood 12-Month Comparable Sales Range Extraction', () => {
  const sampleNeighborhoodField = "THERE ARE ___COMPARABLE SALES IN THE SUBJECT NEIGHBORHOODWITHIN THE PAST TWELVEMONTHS RANGING IN SALE PRICE FROM$___ TO $____";

  test('extracts min and max from standard full sentence string', () => {
    const allData = {
      [sampleNeighborhoodField]: "There are 27 comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $275,500 to $490,000"
    };
    const res = getNeighborhoodTwelveMonthSalesRange(allData);
    expect(res).not.toBeNull();
    expect(res.minPrice).toBe(275500);
    expect(res.maxPrice).toBe(490000);
  });

  test('extracts from nested NEIGHBORHOOD object', () => {
    const allData = {
      NEIGHBORHOOD: {
        "There are ___comparable sales in the subject neighborhoodwithin the past twelvemonths ranging in sale price from$___ to $____":
          "There are 15 comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $300,000 to $650,000"
      }
    };
    const res = getNeighborhoodTwelveMonthSalesRange(allData);
    expect(res).not.toBeNull();
    expect(res.minPrice).toBe(300000);
    expect(res.maxPrice).toBe(650000);
  });

  test('extracts from compact format "27 : $275,500 to $490,000"', () => {
    const allData = {
      "Comparable Sales in Subject Neighborhood Past 12 Months": "27 : $275,500 to $490,000"
    };
    const res = getNeighborhoodTwelveMonthSalesRange(allData);
    expect(res).not.toBeNull();
    expect(res.minPrice).toBe(275500);
    expect(res.maxPrice).toBe(490000);
  });

  test('returns null when field is empty or only placeholder underscores', () => {
    const allData = {
      [sampleNeighborhoodField]: "There are ___ comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $___ to $___"
    };
    expect(getNeighborhoodTwelveMonthSalesRange(allData)).toBeNull();
    expect(getNeighborhoodTwelveMonthSalesRange({})).toBeNull();
    expect(getNeighborhoodTwelveMonthSalesRange(null)).toBeNull();
  });
});

describe('Comparable Sale Price vs Neighborhood 12-Month Range Validation', () => {
  const neighborhoodText = "There are 27 comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $275,500 to $490,000";
  const neighborhoodField = "THERE ARE ___COMPARABLE SALES IN THE SUBJECT NEIGHBORHOODWITHIN THE PAST TWELVEMONTHS RANGING IN SALE PRICE FROM$___ TO $____";

  const buildTestData = (compSalePrice, compDate, compConcessions) => ({
    [neighborhoodField]: neighborhoodText,
    Subject: {
      'Sale Price': '460,000',
      'Date of Sale/Time': '11/01/2026'
    },
    'COMPARABLE SALE #1': {
      'Sale Price': compSalePrice,
      'Date of Sale/Time': compDate,
      'Sales or Financing Concessions': compConcessions || 'ArmLth; Conv;0'
    }
  });

  test('passes (isMatch: true) when comp sale price is within range and has s;c date', () => {
    const data = buildTestData('394,000', 's09/26;c07/26');
    const res = checkCompSalePriceWithinNeighborhoodRange('Sale Price', '394,000', data, ['COMPARABLE SALE #1', 'Sale Price'], 'COMPARABLE SALE #1');
    expect(res).not.toBeNull();
    expect(res.isMatch).toBe(true);
    expect(res.isError).toBeFalsy();
    expect(res.message).toContain('within the neighborhood 12-month comparable sales range');
  });

  test('passes at the exact lower and upper boundaries', () => {
    const dataLow = buildTestData('275,500', 's09/26;c09/26');
    const resLow = checkCompSalePriceWithinNeighborhoodRange('Sale Price', '275,500', dataLow, null, 'COMPARABLE SALE #1');
    expect(resLow.isMatch).toBe(true);

    const dataHigh = buildTestData('490,000', 's05/26;c05/26');
    const resHigh = checkCompSalePriceWithinNeighborhoodRange('Sale Price', '490,000', dataHigh, null, 'COMPARABLE SALE #1');
    expect(resHigh.isMatch).toBe(true);
  });

  test('fails (isError: true) when comp sale price is below the neighborhood range', () => {
    const data = buildTestData('250,000', 's09/26;c07/26');
    const res = checkCompSalePriceWithinNeighborhoodRange('Sale Price', '250,000', data, null, 'COMPARABLE SALE #1');
    expect(res).not.toBeNull();
    expect(res.isError).toBe(true);
    expect(res.message).toContain('below the neighborhood 12-month comparable sales range');
  });

  test('fails (isError: true) when comp sale price is above the neighborhood range', () => {
    const data = buildTestData('550,000', 's09/26;c07/26');
    const res = checkCompSalePriceWithinNeighborhoodRange('Sale Price', '550,000', data, null, 'COMPARABLE SALE #1');
    expect(res).not.toBeNull();
    expect(res.isError).toBe(true);
    expect(res.message).toContain('exceeds the neighborhood 12-month comparable sales range');
  });

  test('skips validation (returns null) when comp is Active listing', () => {
    const data = buildTestData('550,000', 'Active', 'Listing ;0');
    const res = checkCompSalePriceWithinNeighborhoodRange('Sale Price', '550,000', data, null, 'COMPARABLE SALE #1');
    expect(res).toBeNull();
  });

  test('skips validation (returns null) when concessions indicate Listing', () => {
    const data = buildTestData('150,000', '', 'Listing ;0');
    const res = checkCompSalePriceWithinNeighborhoodRange('Sale Price', '150,000', data, null, 'COMPARABLE SALE #1');
    expect(res).toBeNull();
  });

  test('skips validation (returns null) when no s;c date is present', () => {
    const data = buildTestData('150,000', 'Unknown', 'ArmLth; Conv;0');
    const res = checkCompSalePriceWithinNeighborhoodRange('Sale Price', '150,000', data, null, 'COMPARABLE SALE #1');
    expect(res).toBeNull();
  });

  test('skips validation for Subject property', () => {
    const data = buildTestData('460,000', '11/01/2026');
    const res = checkCompSalePriceWithinNeighborhoodRange('Sale Price', '460,000', data, null, 'Subject');
    expect(res).toBeNull();
  });

  test('fails with error when neighborhood range is not present in report', () => {
    const data = {
      Subject: { 'Sale Price': '460,000' },
      'COMPARABLE SALE #1': {
        'Sale Price': '394,000',
        'Date of Sale/Time': 's09/26;c07/26'
      }
    };
    const res = checkCompSalePriceWithinNeighborhoodRange('Sale Price', '394,000', data, null, 'COMPARABLE SALE #1');
    expect(res).not.toBeNull();
    expect(res.isError).toBe(true);
    expect(res.message).toContain('Neighborhood 12-month comparable sales range');
  });

  test('integrates with checkSalePrice: returns range error when comp is outside range', () => {
    const data = buildTestData('550,000', 's09/26;c07/26');
    const res = checkSalePrice('Sale Price', '550,000', data, null, 'COMPARABLE SALE #1');
    expect(res).not.toBeNull();
    expect(res.isError).toBe(true);
    expect(res.message).toContain('exceeds the neighborhood 12-month comparable sales range');
  });

  test('integrates with checkSalePrice: returns match when comp is within range', () => {
    const data = buildTestData('425,000', 's09/26;c09/26');
    const res = checkSalePrice('Sale Price', '425,000', data, null, 'COMPARABLE SALE #1');
    expect(res).not.toBeNull();
    expect(res.isMatch).toBe(true);
  });
});

describe('Proximity to Subject (Miles) Validation', () => {
  const createReportData = ({ location = 'Suburban', prox = '0.61 miles NW', comment = '', narrative = '' }) => ({
    NEIGHBORHOOD: { Location: location },
    Subject: { 'Property Address': '123 Main St' },
    'Summary of Sales Comparison Approach': narrative,
    'COMPARABLE SALE #1': {
      'Proximity to Subject': prox,
      'Proximity to Subject comment': comment
    }
  });

  describe('Suburban location (<= 3.0 miles)', () => {
    test('passes for comp within 3.0 miles (0.61 miles NW)', () => {
      const data = createReportData({ location: 'Suburban', prox: '0.61 miles NW' });
      const res = checkProximityToSubject('Proximity to Subject', '0.61 miles NW', data, ['COMPARABLE SALE #1', 'Proximity to Subject'], 'COMPARABLE SALE #1');
      expect(res).not.toBeNull();
      expect(res.isMatch).toBe(true);
      expect(res.message).toContain('within the 3.0 mile guideline for a Suburban location');
    });

    test('validates Proximity to Subject comment when distance is within 3.0 miles', () => {
      const data = createReportData({ location: 'Suburban', prox: '0.61 miles NW', comment: '0.61 miles NW' });
      const res = checkProximityToSubject('Proximity to Subject comment', '0.61 miles NW', data, ['COMPARABLE SALE #1', 'Proximity to Subject comment'], 'COMPARABLE SALE #1');
      expect(res).not.toBeNull();
      expect(res.isMatch).toBe(true);
    });

    test('fails when comp exceeds 3.0 miles without explanatory comment', () => {
      const data = createReportData({ location: 'Suburban', prox: '3.8 miles SW', comment: '' });
      const res = checkProximityToSubject('Proximity to Subject', '3.8 miles SW', data, null, 'COMPARABLE SALE #1');
      expect(res).not.toBeNull();
      expect(res.isError).toBe(true);
      expect(res.message).toContain('greater than 3.0 miles for a Suburban location');
    });

    test('comment cell also flags error when distance exceeds 3.0 miles without comment', () => {
      const data = createReportData({ location: 'Suburban', prox: '3.8 miles SW', comment: '' });
      const res = checkProximityToSubject('Proximity to Subject comment', '', data, null, 'COMPARABLE SALE #1');
      expect(res).not.toBeNull();
      expect(res.isError).toBe(true);
      expect(res.message).toContain('exceeds 3.0 miles for a Suburban location');
    });

    test('passes when comp exceeds 3.0 miles but has explanatory comment', () => {
      const data = createReportData({
        location: 'Suburban',
        prox: '3.8 miles SW',
        comment: 'Comp 1 is located 3.8 miles away due to limited competing sales in subdivision.'
      });
      const res = checkProximityToSubject('Proximity to Subject', '3.8 miles SW', data, null, 'COMPARABLE SALE #1');
      expect(res).not.toBeNull();
      expect(res.isMatch).toBe(true);
      expect(res.message).toContain('supported by explanatory comment');

      const commentRes = checkProximityToSubject('Proximity to Subject comment', data['COMPARABLE SALE #1']['Proximity to Subject comment'], data, null, 'COMPARABLE SALE #1');
      expect(commentRes).not.toBeNull();
      expect(commentRes.isMatch).toBe(true);
    });

    test('flags error if comment only repeats the distance when exceeding 3.0 miles', () => {
      const data = createReportData({ location: 'Suburban', prox: '4.2 miles SW', comment: '4.2 miles SW' });
      const res = checkProximityToSubject('Proximity to Subject', '4.2 miles SW', data, null, 'COMPARABLE SALE #1');
      expect(res).not.toBeNull();
      expect(res.isError).toBe(true);
    });
  });

  describe('Urban location (<= 1.0 miles)', () => {
    test('passes for comp within 1.0 mile (0.8 miles N)', () => {
      const data = createReportData({ location: 'Urban', prox: '0.8 miles N' });
      const res = checkProximityToSubject('Proximity to Subject', '0.8 miles N', data, null, 'COMPARABLE SALE #1');
      expect(res).not.toBeNull();
      expect(res.isMatch).toBe(true);
      expect(res.message).toContain('within the 1.0 mile guideline for an Urban location');
    });

    test('fails when comp exceeds 1.0 mile without explanatory comment', () => {
      const data = createReportData({ location: 'Urban', prox: '1.4 miles N', comment: '' });
      const res = checkProximityToSubject('Proximity to Subject', '1.4 miles N', data, null, 'COMPARABLE SALE #1');
      expect(res).not.toBeNull();
      expect(res.isError).toBe(true);
      expect(res.message).toContain('greater than 1.0 mile for an Urban location');
    });

    test('fails when comp is 6.02 miles S in Urban location even if generic narrative exists', () => {
      const data = {
        NEIGHBORHOOD: { Location: 'Urban' },
        'Summary of Sales Comparison Approach': 'The sales comparison approach was utilized based on sales from the MLS. Comps were given equal weight.',
        'COMPARABLE SALE #2': {
          'Proximity to Subject': '6.02 miles S',
          'Proximity to Subject comment': ''
        }
      };
      const res = checkProximityToSubject('Proximity to Subject', '6.02 miles S', data, null, 'COMPARABLE SALE #2');
      expect(res).not.toBeNull();
      expect(res.isError).toBe(true);
      expect(res.message).toContain('greater than 1.0 mile for an Urban location. An explanatory comment is required.');

      const commentRes = checkProximityToSubject('Proximity to Subject comment', '', data, null, 'COMPARABLE SALE #2');
      expect(commentRes).not.toBeNull();
      expect(commentRes.isError).toBe(true);
      expect(commentRes.message).toContain('An explanatory comment is required because Proximity to Subject (6.02 miles S) exceeds 1.0 mile for an Urban location.');
    });

    test('fails when comp is 1.02 miles S in Urban location and comment only repeats the distance', () => {
      const data = {
        NEIGHBORHOOD: { Location: 'Urban' },
        'COMPARABLE SALE #7': {
          'Proximity to Subject': '1.02 miles S',
          'Proximity to Subject comment': '1.02 miles S'
        }
      };
      const res = checkProximityToSubject('Proximity to Subject', '1.02 miles S', data, null, 'COMPARABLE SALE #7');
      expect(res).not.toBeNull();
      expect(res.isError).toBe(true);

      const commentRes = checkProximityToSubject('Proximity to Subject comment', '1.02 miles S', data, null, 'COMPARABLE SALE #7');
      expect(commentRes).not.toBeNull();
      expect(commentRes.isError).toBe(true);
    });

    test('passes when comp exceeds 1.0 mile with explanatory narrative commentary', () => {
      const data = createReportData({
        location: 'Urban',
        prox: '1.4 miles N',
        narrative: 'Due to lack of recent sales in immediate urban cluster, Comp 1 was utilized up to 1.5 miles away.'
      });
      const res = checkProximityToSubject('Proximity to Subject', '1.4 miles N', data, null, 'COMPARABLE SALE #1');
      expect(res).not.toBeNull();
      expect(res.isMatch).toBe(true);
      expect(res.message).toContain('supported by explanatory comment');
    });

    test('passes when comp exceeds 1.0 mile with specific comment in grid cell', () => {
      const data = {
        NEIGHBORHOOD: { Location: 'Urban' },
        'COMPARABLE SALE #2': {
          'Proximity to Subject': '6.02 miles S',
          'Proximity to Subject comment': 'Comp 2 is located 6.02 miles away due to lack of recent similar sales in immediate neighborhood.'
        }
      };
      const res = checkProximityToSubject('Proximity to Subject', '6.02 miles S', data, null, 'COMPARABLE SALE #2');
      expect(res).not.toBeNull();
      expect(res.isMatch).toBe(true);
      expect(res.message).toContain('supported by explanatory comment');

      const commentRes = checkProximityToSubject('Proximity to Subject comment', data['COMPARABLE SALE #2']['Proximity to Subject comment'], data, null, 'COMPARABLE SALE #2');
      expect(commentRes).not.toBeNull();
      expect(commentRes.isMatch).toBe(true);
    });
  });

  describe('Rural location (<= 5.0 miles)', () => {
    test('passes for comp within 5.0 miles (4.8 miles E)', () => {
      const data = createReportData({ location: 'Rural', prox: '4.8 miles E' });
      const res = checkProximityToSubject('Proximity to Subject', '4.8 miles E', data, null, 'COMPARABLE SALE #1');
      expect(res).not.toBeNull();
      expect(res.isMatch).toBe(true);
      expect(res.message).toContain('within the 5.0 mile guideline for a Rural location');
    });

    test('fails when comp exceeds 5.0 miles without comment', () => {
      const data = createReportData({ location: 'Rural', prox: '6.5 miles E', comment: '' });
      const res = checkProximityToSubject('Proximity to Subject', '6.5 miles E', data, null, 'COMPARABLE SALE #1');
      expect(res).not.toBeNull();
      expect(res.isError).toBe(true);
      expect(res.message).toContain('greater than 5.0 miles for a Rural location');
    });
  });

  describe('Input formats and edge cases', () => {
    test('parses various distance formats correctly (.5 miles, 2.5 mi, ~3.5 miles)', () => {
      const data1 = createReportData({ location: 'Suburban', prox: '.5 miles' });
      expect(checkProximityToSubject('Proximity to Subject', '.5 miles', data1, null, 'COMPARABLE SALE #1').isMatch).toBe(true);

      const data2 = createReportData({ location: 'Suburban', prox: '2.5 mi' });
      expect(checkProximityToSubject('Proximity to Subject', '2.5 mi', data2, null, 'COMPARABLE SALE #1').isMatch).toBe(true);

      const data3 = createReportData({ location: 'Suburban', prox: '~3.5 miles' });
      expect(checkProximityToSubject('Proximity to Subject', '~3.5 miles', data3, null, 'COMPARABLE SALE #1').isError).toBe(true);
    });

    test('skips Subject property', () => {
      const data = createReportData({ location: 'Suburban', prox: '' });
      expect(checkProximityToSubject('Proximity to Subject', '', data, null, 'Subject')).toBeNull();
    });

    test('works with fallback call signature (field, allData, saleName)', () => {
      const data = createReportData({ location: 'Suburban', prox: '0.75 miles' });
      const res = checkProximityToSubject('Proximity to Subject', data, 'COMPARABLE SALE #1');
      expect(res).not.toBeNull();
      expect(res.isMatch).toBe(true);
    });
  });

  describe('Comparable Sale Address Duplicate Validation (checkComparableAddressDuplicates)', () => {
    const fiveDistinctCompsData = {
      'Subject': { 'Address': '10 Parkside Ct, Wayne, NJ 07470' },
      'COMPARABLE SALE #1': { 'Address': '11 Parkside Ct, Wayne, NJ 07470' },
      'COMPARABLE SALE #2': { 'Address': '13 Parkside Ct, Wayne, NJ 07470' },
      'COMPARABLE SALE #3': { 'Address': '20 Parkside Ct, Wayne, NJ 07470' },
      'COMPARABLE SALE #4': { 'Address': '45 Parkside Ct, Wayne, NJ 07470' },
      'COMPARABLE SALE #5': { 'Address': '324 Brittany Dr, Wayne, NJ 07470' }
    };

    const duplicateCompsData = {
      'Subject': { 'Address': '10 Parkside Ct, Wayne, NJ 07470' },
      'COMPARABLE SALE #1': { 'Address': '11 Parkside Ct, Wayne, NJ 07470' },
      'COMPARABLE SALE #2': { 'Address': '11 Parkside Ct, Wayne, NJ 07470' },
      'COMPARABLE SALE #3': { 'Address': '20 Parkside Ct, Wayne, NJ 07470' }
    };

    test('passes (isMatch: true) when all comps have distinct addresses (like Image 1)', () => {
      const res1 = checkComparableAddressDuplicates(
        'Address',
        '11 Parkside Ct, Wayne, NJ 07470',
        fiveDistinctCompsData,
        ['COMPARABLE SALE #1', 'Address'],
        'COMPARABLE SALE #1'
      );
      expect(res1).toEqual(expect.objectContaining({ isMatch: true }));
      expect(res1.message).toContain('Valid');

      const res2 = checkComparableAddressDuplicates(
        'Address',
        '13 Parkside Ct, Wayne, NJ 07470',
        fiveDistinctCompsData,
        ['COMPARABLE SALE #2', 'Address'],
        'COMPARABLE SALE #2'
      );
      expect(res2).toEqual(expect.objectContaining({ isMatch: true }));
    });

    test('fails (isError: true) when two comparable sales share the same address', () => {
      const resComp1 = checkComparableAddressDuplicates(
        'Address',
        '11 Parkside Ct, Wayne, NJ 07470',
        duplicateCompsData,
        ['COMPARABLE SALE #1', 'Address'],
        'COMPARABLE SALE #1'
      );
      expect(resComp1).toEqual(expect.objectContaining({
        isError: true,
        message: expect.stringContaining('COMPARABLE SALE #2')
      }));

      const resComp2 = checkComparableAddressDuplicates(
        'Address',
        '11 Parkside Ct, Wayne, NJ 07470',
        duplicateCompsData,
        ['COMPARABLE SALE #2', 'Address'],
        'COMPARABLE SALE #2'
      );
      expect(resComp2).toEqual(expect.objectContaining({
        isError: true,
        message: expect.stringContaining('COMPARABLE SALE #1')
      }));

      const resComp3 = checkComparableAddressDuplicates(
        'Address',
        '20 Parkside Ct, Wayne, NJ 07470',
        duplicateCompsData,
        ['COMPARABLE SALE #3', 'Address'],
        'COMPARABLE SALE #3'
      );
      expect(resComp3).toEqual(expect.objectContaining({ isMatch: true }));
    });

    test('detects duplicates with differences in newlines, spacing, and punctuation', () => {
      const data = {
        'COMPARABLE SALE #1': { 'Address': '11 Parkside Ct, Wayne,\nNJ 07470' },
        'COMPARABLE SALE #2': { 'Address': '11  Parkside  Ct.  Wayne, NJ 07470' }
      };
      const res = checkComparableAddressDuplicates(
        'Address',
        '11 Parkside Ct, Wayne,\nNJ 07470',
        data,
        ['COMPARABLE SALE #1', 'Address'],
        'COMPARABLE SALE #1'
      );
      expect(res).toEqual(expect.objectContaining({ isError: true }));
    });

    test('detects duplicates when street suffix is spelled out (Court vs Ct)', () => {
      const data = {
        'COMPARABLE SALE #1': { 'Address': '11 Parkside Court, Wayne, NJ 07470' },
        'COMPARABLE SALE #2': { 'Address': '11 Parkside Ct, Wayne, NJ 07470' }
      };
      const res = checkComparableAddressDuplicates(
        'Address',
        '11 Parkside Court, Wayne, NJ 07470',
        data,
        ['COMPARABLE SALE #1', 'Address'],
        'COMPARABLE SALE #1'
      );
      expect(res).toEqual(expect.objectContaining({ isError: true }));
    });

    test('skips Subject property (returns null)', () => {
      const res = checkComparableAddressDuplicates(
        'Address',
        '10 Parkside Ct, Wayne, NJ 07470',
        fiveDistinctCompsData,
        ['Subject', 'Address'],
        'Subject'
      );
      expect(res).toBeNull();
    });

    test('skips rental comps (returns null)', () => {
      const res = checkComparableAddressDuplicates(
        'Address',
        '4 Parkside Ct, Wayne, NJ 07470',
        fiveDistinctCompsData,
        ['COMPARABLE NO. 1', 'Address'],
        'COMPARABLE NO. 1'
      );
      expect(res).toBeNull();
    });

    test('returns null when address is blank or empty', () => {
      const res = checkComparableAddressDuplicates(
        'Address',
        '',
        fiveDistinctCompsData,
        ['COMPARABLE SALE #1', 'Address'],
        'COMPARABLE SALE #1'
      );
      expect(res).toBeNull();
    });

    test('works with fallback call signature (field, allData, saleName)', () => {
      const res = checkComparableAddressDuplicates(
        'Address',
        fiveDistinctCompsData,
        'COMPARABLE SALE #1'
      );
      expect(res).toEqual(expect.objectContaining({ isMatch: true }));
    });
  });
});
