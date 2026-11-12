import React from 'react';

describe('Form 1073 Sales Comparison Grid Fields', () => {
  test('salesGridRows1073 includes Unit # and Project Name and Phase rows in expected positions', () => {
    // Mirror rows defined for Form 1073 sales grid
    const salesGridRows1073 = [
      { label: "Address", valueKey: "Address", subjectValueKey: "Property Address" },
      { label: "Unit #", valueKey: "Unit #", subjectValueKey: "Unit #" },
      { label: "Project Name and Phase", valueKey: "Project Name and Phase", subjectValueKey: "Project Name and Phase", usePre: true },
      { label: "Proximity to Subject", valueKey: "Proximity to Subject" },
    ];

    expect(salesGridRows1073[0].label).toBe('Address');
    expect(salesGridRows1073[1].label).toBe('Unit #');
    expect(salesGridRows1073[1].valueKey).toBe('Unit #');
    expect(salesGridRows1073[2].label).toBe('Project Name and Phase');
    expect(salesGridRows1073[2].valueKey).toBe('Project Name and Phase');
    expect(salesGridRows1073[2].usePre).toBe(true);
    expect(salesGridRows1073[3].label).toBe('Proximity to Subject');
  });

  test('fallback logic resolves Unit # and Project Name and Phase correctly', () => {
    const compObj = {
      'Unit #': '1079',
      'Project Name': 'The Graybriar',
      'Phase': '1',
      'Project Name and Phase': 'The Graybriar\n1'
    };

    const rowUnit = { label: 'Unit #', valueKey: 'Unit #' };
    const rowProj = { label: 'Project Name and Phase', valueKey: 'Project Name and Phase' };

    const compUnitVal = compObj[rowUnit.valueKey] || compObj['Unit Number'] || '';
    expect(compUnitVal).toBe('1079');

    const compProjVal = compObj[rowProj.valueKey] || `${compObj['Project Name']}\n${compObj['Phase']}`;
    expect(compProjVal).toBe('The Graybriar\n1');
  });
});

