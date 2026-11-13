import { getTotalSalesGridComps } from '../../components/Subject/components/MapAndSketchExhibitsSection';

describe('getTotalSalesGridComps validation', () => {
  test('counts 8 sales comparables from root COMPARABLE SALE keys', () => {
    const data = {
      'COMPARABLE SALE #1': { 'Address': '123 Main St', 'Sale Price': '500,000' },
      'COMPARABLE SALE #2': { 'Address': '124 Main St', 'Sale Price': '510,000' },
      'COMPARABLE SALE #3': { 'Address': '125 Main St', 'Sale Price': '520,000' },
      'COMPARABLE SALE #4': { 'Address': '126 Main St', 'Sale Price': '530,000' },
      'COMPARABLE SALE #5': { 'Address': '127 Main St', 'Sale Price': '540,000' },
      'COMPARABLE SALE #6': { 'Address': '128 Main St', 'Sale Price': '550,000' },
      'COMPARABLE SALE #7': { 'Address': '129 Main St', 'Sale Price': '560,000' },
      'COMPARABLE SALE #8': { 'Address': '130 Main St', 'Sale Price': '570,000' }
    };
    const res = getTotalSalesGridComps(data, {}, null);
    expect(res.count).toBe(8);
    expect(res.compNums).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test('counts sales comparables from SALES_GRID object', () => {
    const allData = {
      SALES_GRID: {
        'COMPARABLE SALE #1': { 'Property Address': '45 Elm St' },
        'COMPARABLE SALE #2': { 'Property Address': '47 Elm St' },
        'COMPARABLE SALE #3': { 'Property Address': '49 Elm St' }
      }
    };
    const res = getTotalSalesGridComps({}, allData, null);
    expect(res.count).toBe(3);
    expect(res.compNums).toEqual([1, 2, 3]);
  });

  test('ignores unpopulated empty template comp columns', () => {
    const data = {
      'COMPARABLE SALE #1': { 'Address': '10 Park Ave' },
      'COMPARABLE SALE #2': { 'Address': '12 Park Ave' },
      'COMPARABLE SALE #3': { 'Address': '14 Park Ave' },
      'COMPARABLE SALE #4': {},
      'COMPARABLE SALE #5': { 'Address': '' },
      'COMPARABLE SALE #6': null
    };
    const res = getTotalSalesGridComps(data, {}, null);
    expect(res.count).toBe(3);
    expect(res.compNums).toEqual([1, 2, 3]);
  });

  test('includes sales comps from scanResult reference records', () => {
    const scanResult = {
      reference_records: {
        sales_comps: [
          { comp_num: 1, address: '1 Apple St' },
          { comp_num: 2, address: '2 Apple St' },
          { comp_num: 3, address: '3 Apple St' },
          { comp_num: 4, address: '4 Apple St' }
        ]
      }
    };
    const res = getTotalSalesGridComps({}, {}, scanResult);
    expect(res.count).toBe(4);
    expect(res.compNums).toEqual([1, 2, 3, 4]);
  });
});

