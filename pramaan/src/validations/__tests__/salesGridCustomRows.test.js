describe('Sales Grid Custom Rows Extraction and Display logic', () => {
  const baseRows = [
    { label: "Address", valueKey: "Address" },
    { label: "Sale Price", valueKey: "Sale Price" },
    { label: "Garage/Carport", valueKey: "Garage/Carport", adjustmentKey: "Garage/Carport Adjustment" },
    { label: "Porch/Patio/Deck", valueKey: "Porch/Patio/Deck", adjustmentKey: "Porch/Patio/Deck Adjustment" },
    { label: "Net Adjustment (Total)", valueKey: "Net Adjustment (Total)" },
    { label: "Adjusted Sale Price of Comparable", valueKey: "Adjusted Sale Price of Comparable" },
  ];

  const computeEffectiveRows = (salesGridRows, data, comparableSales) => {
    const subjectObj = {
      ...(data?.SUBJECT || {}),
      ...(data?.Subject || {}),
      ...(data?.SALES_GRID?.Subject || {}),
      ...(data?.['Sales Grid']?.Subject || {})
    };

    const getCompData = (sale) => {
      return data?.[sale] || data?.SALES_GRID?.[sale] || data?.['Sales Grid']?.[sale] || {};
    };

    const backendCustomRows = data?.sales_grid_custom_rows || data?.SALES_GRID?.custom_rows || [];

    const candidateList = [
      ...backendCustomRows,
      { label: "Fireplace (s), etc.", valueKey: "Fireplace (s), etc.", adjustmentKey: "Fireplace (s), etc. Adjustment" },
      { label: "Fence, Pool, etc.", valueKey: "Fence, Pool, etc.", adjustmentKey: "Fence, Pool, etc. Adjustment" },
      { label: "Other", valueKey: "Other", adjustmentKey: "Other Adjustment" },
      { label: "ADU", valueKey: "ADU", adjustmentKey: "ADU Adjustment" },
      { label: "Woodstove", valueKey: "Woodstove", adjustmentKey: "Woodstove Adjustment" },
      { label: "Additional Description", valueKey: "Additional Description", adjustmentKey: "Additional Adjustment" },
    ];

    const seen = new Set();
    const uniqueCandidates = [];
    candidateList.forEach(cand => {
      if (!cand || !cand.label) return;
      const norm = cand.label.trim().toLowerCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        uniqueCandidates.push({
          label: cand.label,
          valueKey: cand.valueKey || cand.label,
          adjustmentKey: cand.adjustmentKey || `${cand.label} Adjustment`
        });
      }
    });

    const existingKeys = new Set(salesGridRows.map(r => (r.valueKey || r.label || '').trim().toLowerCase()));

    const extractedCustomRows = uniqueCandidates.filter(cand => {
      const normVal = (cand.valueKey || cand.label || '').trim().toLowerCase();
      if (existingKeys.has(normVal)) return false;

      const valKey = cand.valueKey;
      const adjKey = cand.adjustmentKey;

      const subjVal = subjectObj[valKey] ?? subjectObj[normVal] ?? '';
      const subjAdj = adjKey ? (subjectObj[adjKey] ?? subjectObj[adjKey.toLowerCase()] ?? '') : '';
      if (String(subjVal).trim() !== '' || String(subjAdj).trim() !== '') {
        return true;
      }

      return comparableSales.some(sale => {
        const comp = getCompData(sale);
        const compVal = comp[valKey] ?? comp[normVal] ?? '';
        const compAdj = adjKey ? (comp[adjKey] ?? comp[adjKey.toLowerCase()] ?? '') : '';
        return String(compVal).trim() !== '' || String(compAdj).trim() !== '';
      });
    });

    if (extractedCustomRows.length === 0) {
      return salesGridRows;
    }

    const porchIdx = salesGridRows.findIndex(r =>
      r.label === "Porch/Patio/Deck" ||
      r.valueKey === "Porch/Patio/Deck" ||
      (typeof r.label === 'string' && r.label.toLowerCase().includes("porch"))
    );

    if (porchIdx !== -1) {
      const result = [...salesGridRows];
      result.splice(porchIdx + 1, 0, ...extractedCustomRows);
      return result;
    }

    return [...salesGridRows, ...extractedCustomRows];
  };

  test('does not add any extra rows when no custom fields are present in data', () => {
    const data = {
      Subject: { "Porch/Patio/Deck": "Covered Porch" },
      "Comparable #1": { "Porch/Patio/Deck": "Deck", "Porch/Patio/Deck Adjustment": "+5,000" }
    };
    const rows = computeEffectiveRows(baseRows, data, ["Comparable #1"]);
    expect(rows.length).toBe(baseRows.length);
    expect(rows.map(r => r.label)).toEqual(baseRows.map(r => r.label));
  });

  test('adds extracted custom fields directly below Porch/Patio/Deck', () => {
    const data = {
      sales_grid_custom_rows: [
        { label: "Fireplace (s), etc.", valueKey: "Fireplace (s), etc.", adjustmentKey: "Fireplace (s), etc. Adjustment" },
        { label: "Fence, Pool, etc.", valueKey: "Fence, Pool, etc.", adjustmentKey: "Fence, Pool, etc. Adjustment" },
        { label: "Other", valueKey: "Other", adjustmentKey: "Other Adjustment" }
      ],
      Subject: {
        "Fireplace (s), etc.": "Fireplace (1)",
        "Fence, Pool, etc.": "Prch@Creek/RV",
        "Other": "1/1ADU (552SF)"
      },
      "Comparable #1": {
        "Fireplace (s), etc.": "Fireplace (3)",
        "Fireplace (s), etc. Adjustment": "-10,000",
        "Fence, Pool, etc.": "WetBar/OdKitch",
        "Fence, Pool, etc. Adjustment": "0",
        "Other": "None Noted",
        "Other Adjustment": "+145,000"
      }
    };
    const rows = computeEffectiveRows(baseRows, data, ["Comparable #1"]);
    expect(rows.length).toBe(baseRows.length + 3);

    const porchIndex = rows.findIndex(r => r.label === "Porch/Patio/Deck");
    expect(rows[porchIndex + 1].label).toBe("Fireplace (s), etc.");
    expect(rows[porchIndex + 2].label).toBe("Fence, Pool, etc.");
    expect(rows[porchIndex + 3].label).toBe("Other");
    expect(rows[porchIndex + 4].label).toBe("Net Adjustment (Total)");
  });

  test('adds ADU and Woodstove only if extracted in Subject or Comps', () => {
    const data = {
      Subject: {
        ADU: "Detached Studio"
      },
      "Comparable #1": {
        Woodstove: "Pellet Stove",
        "Woodstove Adjustment": "+2,000"
      }
    };
    const rows = computeEffectiveRows(baseRows, data, ["Comparable #1"]);
    const labels = rows.map(r => r.label);

    expect(labels).toContain("ADU");
    expect(labels).toContain("Woodstove");
    expect(labels).not.toContain("Fireplace (s), etc.");
    expect(labels).not.toContain("Fence, Pool, etc.");
  });
});
