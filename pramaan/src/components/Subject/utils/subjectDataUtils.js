/**
 * Utilities for normalizing and formatting report data structures in Subject.
 */

export const isFieldValBlank = (val) => {
  if (val === undefined || val === null) return true;
  if (typeof val === 'object') {
    return Object.values(val).every(v => v === undefined || v === null || String(v).trim() === '');
  }
  return String(val).trim() === '';
};

export const getFieldValueByPath = (allData, path) => {
  if (!path || !Array.isArray(path)) return '';
  let current = allData;
  for (const k of path) {
    if (current && typeof current === 'object') {
      current = current[k];
    } else {
      return '';
    }
  }
  if (current === undefined || current === null) return '';
  if (typeof current === 'object') return JSON.stringify(current);
  return String(current);
};

export const normalizeFullFileData = (raw) => {
  if (!raw) return {};

  let target = raw;
  if (typeof target === 'string') {
    try {
      target = JSON.parse(target);
    } catch (e) {
      console.error("Error parsing stringified reportData in subject.js:", e);
    }
  }
  if (typeof target === 'string') {
    try {
      target = JSON.parse(target);
    } catch (e) { }
  }

  if (!target || typeof target !== 'object') return {};

  if (target.data && typeof target.data === 'object' && !Array.isArray(target.data)) {
    target = { ...target.data, ...target };
    delete target.data;
  }

  const normalized = { ...target };

  if (!normalized.Subject || typeof normalized.Subject !== 'object') {
    normalized.Subject = raw.Subject || raw.SUBJECT || raw.clean_data?.Subject || raw.clean_data?.SUBJECT || {};
  }
  if (!normalized.SUBJECT || typeof normalized.SUBJECT !== 'object') {
    normalized.SUBJECT = normalized.Subject;
  }
  if (!normalized.SALES_GRID || typeof normalized.SALES_GRID !== 'object') {
    normalized.SALES_GRID = raw.SALES_GRID || raw['Sales Grid'] || raw.clean_data?.['Sales Grid'] || raw.clean_data?.SALES_GRID || {};
  }
  if (!normalized['Sales Grid'] || typeof normalized['Sales Grid'] !== 'object') {
    normalized['Sales Grid'] = normalized.SALES_GRID;
  }

  if (!normalized.SUMMARY || typeof normalized.SUMMARY !== 'object') {
    normalized.SUMMARY = raw.SUMMARY || raw.Summary || raw.summary || raw.clean_data?.Summary || raw.clean_data?.SUMMARY || {};
  }
  if (!normalized.Summary || typeof normalized.Summary !== 'object') {
    normalized.Summary = normalized.SUMMARY;
  }
  if (!normalized.IMPROVEMENTS || typeof normalized.IMPROVEMENTS !== 'object') {
    normalized.IMPROVEMENTS = raw.IMPROVEMENTS || raw.Improvements || raw.improvements || raw['Dwelling Exterior'] || raw.clean_data?.Improvements || {};
  }
  if (!normalized.RECONCILIATION || typeof normalized.RECONCILIATION !== 'object') {
    normalized.RECONCILIATION = raw.RECONCILIATION || raw.Reconciliation || raw.reconciliation || raw.clean_data?.Reconciliation || {};
  }
  if (!normalized.CERTIFICATION || typeof normalized.CERTIFICATION !== 'object') {
    normalized.CERTIFICATION = raw.CERTIFICATION || raw.Certification || raw.certification || raw.clean_data?.Certification || {};
  }
  if (!normalized.COST_APPROACH || typeof normalized.COST_APPROACH !== 'object') {
    normalized.COST_APPROACH = raw.COST_APPROACH || raw['Cost Approach'] || raw.clean_data?.['Cost Approach'] || {};
  }

  if (!normalized.CONTRACT || typeof normalized.CONTRACT !== 'object') {
    normalized.CONTRACT = raw.CONTRACT || raw.Contract || raw.contract || {};
  }
  if (!normalized.NEIGHBORHOOD || typeof normalized.NEIGHBORHOOD !== 'object') {
    normalized.NEIGHBORHOOD = raw.NEIGHBORHOOD || raw.Neighborhood || raw.neighborhood || {};
  }
  if (!normalized.SITE || typeof normalized.SITE !== 'object') {
    normalized.SITE = raw.SITE || raw.Site || raw.site || {};
  }
  if (!normalized.INFO_OF_SALES || typeof normalized.INFO_OF_SALES !== 'object') {
    normalized.INFO_OF_SALES = raw.INFO_OF_SALES || raw['Sales Comparison'] || raw.sales_comparison || {};
  }
  if (!normalized.PROJECT_INFO || typeof normalized.PROJECT_INFO !== 'object') {
    normalized.PROJECT_INFO = raw.PROJECT_INFO || raw['Project Information'] || raw.clean_data?.['Project Information'] || {};
  }
  if (!normalized['Project Information'] || typeof normalized['Project Information'] !== 'object') {
    normalized['Project Information'] = normalized.PROJECT_INFO;
  }
  if (!normalized.PROJECT_ANALYSIS || typeof normalized.PROJECT_ANALYSIS !== 'object') {
    normalized.PROJECT_ANALYSIS = raw.PROJECT_ANALYSIS || raw['Project Analysis'] || raw.clean_data?.['Project Analysis'] || {};
  }
  if (!normalized['Project Analysis'] || typeof normalized['Project Analysis'] !== 'object') {
    normalized['Project Analysis'] = normalized.PROJECT_ANALYSIS;
  }
  if (!normalized.PROJECT_SITE || typeof normalized.PROJECT_SITE !== 'object') {
    normalized.PROJECT_SITE = raw.PROJECT_SITE || raw['Project Site'] || raw.clean_data?.['Project Site'] || raw.SITE || {};
  }
  if (!normalized['Project Site'] || typeof normalized['Project Site'] !== 'object') {
    normalized['Project Site'] = normalized.PROJECT_SITE;
  }
  if (!normalized.UNIT_DESCRIPTIONS || typeof normalized.UNIT_DESCRIPTIONS !== 'object') {
    normalized.UNIT_DESCRIPTIONS = raw.UNIT_DESCRIPTIONS || raw['Unit Descriptions'] || raw.clean_data?.['Unit Descriptions'] || {};
  }
  if (!normalized['Unit Descriptions'] || typeof normalized['Unit Descriptions'] !== 'object') {
    normalized['Unit Descriptions'] = normalized.UNIT_DESCRIPTIONS;
  }
  if (!normalized.PRIOR_SALE_HISTORY || typeof normalized.PRIOR_SALE_HISTORY !== 'object') {
    normalized.PRIOR_SALE_HISTORY = raw.PRIOR_SALE_HISTORY || raw['Prior Sale History'] || raw.clean_data?.['Prior Sale History'] || raw.clean_data?.PRIOR_SALE_HISTORY || {};
  }
  if (!normalized['Prior Sale History'] || typeof normalized['Prior Sale History'] !== 'object') {
    normalized['Prior Sale History'] = normalized.PRIOR_SALE_HISTORY;
  }
  if (!normalized.CONTACT || typeof normalized.CONTACT !== 'object') {
    normalized.CONTACT = raw.CONTACT || raw.contact || raw['Contact Information'] || raw.clean_data?.['Contact Information'] || raw.clean_data?.CONTACT || {};
  }
  if (!normalized['Contact Information'] || typeof normalized['Contact Information'] !== 'object') {
    normalized['Contact Information'] = normalized.CONTACT;
  }

  const sectionKeyMap = {
    SUMMARY: [
      'Opinion of Market Value',
      'Indicated Value by Sales Comparison Approach Indicated',
      'Indicated Value by Sales Comparison Approach',
      'Market Value Condition',
      'Effective Date of Appraisal',
      'Assignment Reason',
      'Borrower Name',
      'Current Owner of Public Record',
      'Listing Status',
      'Property Valuation Method',
      'Appraiser Name',
      'Construction Method',
      'Attachment Type',
      'Overall Quality',
      'Overall Condition',
      'Planned Unit Development (PUD)',
      'Condominium',
      'Cooperative',
      'Condop',
      'Subject Site Owned in Common',
      'Units Excluding ADUs',
      'Accessory Dwelling Units (ADUs)',
      'Property Rights Appraised',
      'Highest and Best Use as Present Use',
      'Zoning Compliance',
      'Apparent Defects, Damages, Deficiencies Requiring Action',
      'Appraisal Version',
      'Appraiser Reference ID',
      'FHA Case #',
      'Client/Lender Company Name',
      'Client/Lender Company Address',
      'Appraisal Management Company Name',
      'Appraisal Management Company Address',
      'Appraiser Company Name',
      'Appraiser Company Address',
      'Subject Property Inspection',
      'Exterior Physical Inspection',
      'Interior Physical Inspection',
      'Inspection Date',
      'Appraiser Credential Level',
      'Appraiser ID',
      'Appraiser State',
      'Appraiser License Expiration Date',
      'Appraiser ASC Identifier'
    ],
    CONTACT: [
      'Client/Lender Company Name',
      'Client/Lender Company Address',
      'Appraisal Management Company Name',
      'Appraisal Management Company Address',
      'Appraiser Name',
      'Appraiser Company Name',
      'Appraiser Company Address',
      'Subject Property Inspection',
      'Exterior Physical Inspection',
      'Interior Physical Inspection',
      'Inspection Date',
      'Appraiser Credential Level',
      'Appraiser ID',
      'Appraiser State',
      'Appraiser License Expiration Date',
      'Appraiser ASC Identifier'
    ],
    CONTRACT: [
      "I did did not analyze the contract for sale for the subject purchase transaction. Explain the results of the analysis of the contract for sale or why the analysis was not performed.",
      "Contract Price $", "Contract Price", "Date of Contract",
      "Is property seller owner of public record?", "Data Source(s) (Contract)",
      "Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?",
      "If Yes, report the total dollar amount and describe the items to be paid"
    ],
    NEIGHBORHOOD: [
      "Location", "Built-Up", "Growth", "Property Values", "Demand/Supply",
      "Marketing Time", "One-Unit", "2-4 Unit", "Multi-Family", "Commercial", "Other",
      "Present Land Use for other", "one unit housing price(high,low,pred)", "one unit housing age(high,low,pred)",
      "Housing Price High", "Housing Price Low", "Housing Price Pred",
      "Housing Age High", "Housing Age Low", "Housing Age Pred",
      "Neighborhood Boundaries", "Neighborhood Description", "Market Conditions",
      "Market Area Boundary", "Market Area Boundary:", "Search Criteria Description", "Search Criteria Description:",
      "Active Listings", "Median Days on Market", "Lowest List Price", "Median List Price", "Highest List Price",
      "Pending Sales", "Sales in Past 12 Months", "Lowest Sale Price", "Median Sale Price", "Highest Sale Price",
      "Distressed Market Competition", "Price Trend Source", "Price Trend Source (Graph)", "Price Trend Analysis Commentary",
      "Demand/Supply:", "Demand / Supply", "Marketing Time:", "Market Commentary",
      "Current or Relevant Listings", "Data Source", "Subject Listing Information Commentary", "Subject Listing Information Exhibits"
    ],
    SITE: [
      "Dimensions", "Area", "Shape", "View", "Zoning Compliance", "Zoning Description",
      "Specific Zoning Classification", "FEMA Special Flood Hazard Area", "FEMA Flood Zone",
      "FEMA Map #", "FEMA Map Date", "Electricity", "Gas", "Water", "Sanitary Sewer", "Street", "Alley",
      "Total Site Size", "Site Size", "Number of Parcels", "Assessor Parcel Number (APN)", "APN Description",
      "Parcel Size", "Zoning Classification Code", "Zoning Classification Description",
      "Description of Zoning Compliance", "Primary Access", "Street Type and Surface", "Typical for Market",
      "Non-Residential Use", "Apparent Defects, Damages, Deficiencies (Site)",
      "Site Influence", "Site Influence Proximity", "Site Influence Detail", "Site Influence Impact",
      "Site Influence Comment", "Site Influence Commentary", "Range of View", "View Impact", "View Commentary",
      "Site Feature", "Site Feature Detail", "Site Feature Impact", "Site Feature Comment", "Site Features Commentary",
      "Broadband Internet Available",
      "Electricity Detail", "Electricity Private Utility Impact", "Electricity Comment",
      "Sanitary Sewer Detail", "Sanitary Sewer Private Utility Impact", "Sanitary Sewer Comment",
      "Water Detail", "Water Private Utility Impact", "Water Comment",
      "Site Commentary", "Renewable Energy Components", "Ownership", "Financing Arrangement",
      "Known Building Certifications", "Known Efficiency Ratings",
      "Energy Efficient and Green Features Impact to Value/Marketability", "Impact to Value/Marketability",
      "Opinion of Site Value", "Primary Site Valuation Method", "Reconciliation of Site Value",
      "Legally Permissible", "Physically Possible", "Financially Feasible", "Maximally Productive",
      "Highest and Best Use as Improved (Present Use)", "Highest and Best Use Commentary"
    ],
    IMPROVEMENTS: [
      "Subject Property Units in Structure", "Units in Structure", "Floors in Building", "Dwelling Style",
      "Front Door Elevation", "Year Built", "Construction Method", "Converted Area", "Dwelling Exterior Exhibits",
      "Exterior Quality Rating", "Exterior Condition Rating",
      "Exterior Walls and Trim", "Exterior Walls and Trim Quality Comment", "Exterior Walls and Trim Condition Status", "Exterior Walls and Trim Condition Comment",
      "Foundation", "Foundation Quality Comment", "Foundation Condition Status", "Foundation Condition Comment",
      "Roof", "Roof Estimated Age", "Roof Quality Comment", "Roof Condition Status", "Roof Condition Comment",
      "Windows", "Windows Quality Comment", "Windows Condition Status", "Windows Condition Comment",
      "Heating System", "Heating Detail", "Heating Fuel", "Cooling System", "Core Heating System Below Grade",
      "Other Mechanical Systems", "Apparent Defects, Damages, Deficiencies (Dwelling Exterior)", "Dwelling Exterior Commentary",
      "Finished Above Grade", "Unfinished Above Grade", "Finished Below Grade", "Unfinished Below Grade", "Area Data Source",
      "Levels in Unit", "Occupancy", "Total Bedrooms", "Total Bathrooms - Full", "Total Bathrooms - Half",
      "Overall Update Status for Bathrooms",
      "Flooring Detail", "Flooring Quality Comment", "Flooring Condition Status", "Flooring Condition Comment", "Overall Update Status for Flooring",
      "Walls and Ceiling Detail", "Walls and Ceiling Quality Comment", "Walls and Ceiling Condition Status", "Walls and Ceiling Condition Comment",
      "Apparent Defects, Damages, Deficiencies (Unit Interior)", "Interior Quality Rating", "Interior Condition Rating", "Unit Interior Commentary",
      "Level in Unit Row 1", "Grade Level Detail Row 1", "Finish Row 1", "Area Row 1", "Room Summary Row 1",
      "Level in Unit Row 2", "Grade Level Detail Row 2", "Finish Row 2", "Area Row 2", "Room Summary Row 2",
      "Level in Unit Row 3", "Grade Level Detail Row 3", "Finish Row 3", "Area Row 3", "Room Summary Row 3",
      "Kitchen/Bath Row 1 Room", "Kitchen/Bath Row 1 Update Status", "Kitchen/Bath Row 1 Time Frame", "Kitchen/Bath Row 1 Quality Comment", "Kitchen/Bath Row 1 Condition Status", "Kitchen/Bath Row 1 Condition Comment",
      "Kitchen/Bath Row 2 Room", "Kitchen/Bath Row 2 Update Status", "Kitchen/Bath Row 2 Time Frame", "Kitchen/Bath Row 2 Quality Comment", "Kitchen/Bath Row 2 Condition Status", "Kitchen/Bath Row 2 Condition Comment",
      "Kitchen/Bath Row 3 Room", "Kitchen/Bath Row 3 Update Status", "Kitchen/Bath Row 3 Time Frame", "Kitchen/Bath Row 3 Quality Comment", "Kitchen/Bath Row 3 Condition Status", "Kitchen/Bath Row 3 Condition Comment"
    ],
    INFO_OF_SALES: [
      "Sales Comparison Approach Indicated Value", "Data Source(s)", "Verification Source(s)"
    ],
    PRIOR_SALE_HISTORY: [
      'Prior Sales or Transfers',
      'Subject Transfer History Data Source',
      'Data Source',
      'Analysis of Prior Sale and Transfer History of Subject Property',
      'Comparable 1 Transfer Terms',
      'Comparable 1 Transfer Date',
      'Comparable 1 Transfer Amount',
      'Comparable 1 Transfer Data Source',
      'Comparable 2 Transfer Terms',
      'Comparable 2 Transfer Date',
      'Comparable 2 Transfer Amount',
      'Comparable 2 Transfer Data Source',
      'Comparable 3 Transfer Terms',
      'Comparable 3 Transfer Date',
      'Comparable 3 Transfer Amount',
      'Comparable 3 Transfer Data Source',
      'Analysis of Prior Sale and Transfer History of Comparable Sales'
    ],
    PROJECT_INFO: [
      'Planned Unit Development (PUD)',
      'Condominium',
      'Cooperative',
      'Condop',
      'Project Information Data Source',
      'Monthly Amount',
      'Common Amenities / Services Included',
      'Utilities Included',
      'Developer/Sponsor in Control Detail',
      'Developer/Sponsor in Control Impact',
      'Developer/Sponsor in Control Comment',
      'Known Legal Actions Detail',
      'Known Legal Actions Impact',
      'Known Legal Actions Comment',
      'Unit Special Assessments Detail',
      'Unit Special Assessments Impact',
      'Unit Special Assessments Comment',
      'Unit Tax Abatements or Exemptions Detail',
      'Unit Tax Abatements or Exemptions Impact',
      'Unit Tax Abatements or Exemptions Comment',
      'Project Factors Commentary',
      'Project Information Commentary'
    ],
    UNIT_DESCRIPTIONS: [
      "Unit Charge$",
      "per month X 12 = $",
      "per year",
      "Annual assessment charge per year per square feet of gross living area = $",
      "Utilities included in the unit monthly assessment [None/Heat/Air/Conditioning/Electricity/Gas/Water/Sewer/Cable/Other (describe)]",
      "Floor #",
      "# of Levels",
      "Heating Type/Fuel",
      "Central AC/Individual AC/Other (describe)",
      "Fireplace(s) #/Woodstove(s) #/Deck/Patio/Porch/Balcony/Other",
      "Refrigerator/Range/Oven/Disp Microwave/Dishwasher/Washer/Dryer",
      "Floors",
      "Walls",
      "Trim/Finish",
      "Bath Wainscot",
      "Doors",
      "None/Garage/Covered/Open",
      "Assigned/Owned",
      "# of Cars",
      "Parking Space #",
      "Finished area above grade contains:",
      "Rooms",
      "Bedrooms",
      "Bath(s)",
      "Square Feet of Gross Living Area Above Grade",
      "Are the heating and cooling for the individual units separately metered?",
      "If No, describe and comment on compatibility to other projects in the market area.",
      "Additional features (special energy efficient items, etc.)",
      "Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)",
      "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property?",
      "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? ",
      "If Yes, describe",
      "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?",
      "If No, describe"
    ]
  };

  Object.entries(sectionKeyMap).forEach(([sec, keys]) => {
    keys.forEach(k => {
      if (normalized[k] !== undefined && normalized[sec][k] === undefined) {
        normalized[sec][k] = normalized[k];
      }
      if (normalized[sec][k] !== undefined && normalized[k] === undefined) {
        normalized[k] = normalized[sec][k];
      }
    });
  });

  Object.keys(raw).forEach(secKey => {
    if (raw[secKey] && typeof raw[secKey] === 'object' && !Array.isArray(raw[secKey])) {
      // Sales Grid and Subject are two different sections - do not let Sales Grid's 'Subject' column overwrite root Subject
      if (secKey === 'Sales Grid' || secKey === 'SALES_GRID') {
        Object.keys(raw[secKey]).forEach(subKey => {
          if (subKey.toLowerCase() !== 'subject' && normalized[subKey] === undefined) {
            normalized[subKey] = raw[secKey][subKey];
          }
        });
      } else if (secKey === 'Comparable Rental Data' || secKey === 'COMPARABLE_RENTAL_DATA') {
        Object.keys(raw[secKey]).forEach(subKey => {
          if (normalized[subKey] === undefined) {
            normalized[subKey] = raw[secKey][subKey];
          }
          const m = subKey.match(/(\d+)/);
          if (m) {
            const num = m[1];
            if (normalized[`COMPARABLE Rental No #${num}`] === undefined) {
              normalized[`COMPARABLE Rental No #${num}`] = raw[secKey][subKey];
            }
            if (normalized[`COMPARABLE Rental No. #${num}`] === undefined) {
              normalized[`COMPARABLE Rental No. #${num}`] = raw[secKey][subKey];
            }
            if (normalized[`Comparable Rental No #${num}`] === undefined) {
              normalized[`Comparable Rental No #${num}`] = raw[secKey][subKey];
            }
          }
          if (subKey.toLowerCase() === 'subject rental') {
            normalized['Subject Rental'] = raw[secKey][subKey];
          }
        });
      } else if (secKey === 'Comparable Rent Schedule' || secKey === 'RENT_SCHEDULE_GRID') {
        Object.keys(raw[secKey]).forEach(subKey => {
          if (normalized[subKey] === undefined) {
            normalized[subKey] = raw[secKey][subKey];
          }
          const m = subKey.match(/(\d+)/);
          if (m) {
            const num = m[1];
            if (normalized[`COMPARABLE NO. ${num}`] === undefined) {
              normalized[`COMPARABLE NO. ${num}`] = raw[secKey][subKey];
            }
            if (normalized[`Comparable Rent #${num}`] === undefined) {
              normalized[`Comparable Rent #${num}`] = raw[secKey][subKey];
            }
          }
        });
      } else {
        Object.keys(raw[secKey]).forEach(subKey => {
          if (normalized[subKey] === undefined) {
            normalized[subKey] = raw[secKey][subKey];
          }
        });
      }
    }
  });

  return normalized;
};

export const getCleanDisplayJson = (data) => {
  if (!data || typeof data !== 'object') return {};
  const excludedGridKeys = new Set([
    'Sale Price', 'Proximity to Subject', 'Proximity to Subject comment', 'Sale Price/Gross Liv. Area', 'Sale Price/Gross Bldg. Area',
    'Gross Monthly Rent', 'Gross Rent Multiplier', 'Price Per Unit', 'Price Per Room', 'Price Per Bedroom',
    'Adj. Price Per Unit', 'Adj. Price Per Room', 'Adj. Price Per Bdrm.', 'Value Per Unit', 'Value Per Gross Bldg. Area',
    'Sales or Financing Concessions', 'Sales Concessions', 'Sales Concessions Adjustment',
    'Date of Sale/Time', 'Date of Sale/Time Adjustment', 'Location Adjustment',
    'Leasehold/Fee Simple Adjustment', 'Site Adjustment', 'View Adjustment',
    'Design (Style) Adjustment', 'Quality of Construction Adjustment', 'Actual Age Adjustment',
    'Condition Adjustment', 'Above Grade Room Count Adjustment', 'Gross Living Area Adjustment',
    'Basement & Finished Rooms Below Grade Adjustment', 'Functional Utility Adjustment',
    'Heating/Cooling Adjustment', 'Energy Efficient Items Adjustment', 'Garage/Carport Adjustment',
    'Porch/Patio/Deck Adjustment', 'Net Adjustment (Total)', 'Net Adj. (total)', 'Adjusted Sale Price'
  ]);

  if (data.clean_data && typeof data.clean_data === 'object' && Object.keys(data.clean_data).length > 0) {
    const cd = { ...data.clean_data };
    if (cd.Subject && typeof cd.Subject === 'object') {
      const cleanSubj = {};
      Object.keys(cd.Subject).forEach(k => {
        if (!excludedGridKeys.has(k)) {
          cleanSubj[k] = cd.Subject[k];
        }
      });
      cd.Subject = cleanSubj;
    }
    return cd;
  }
  const clean = {};
  const formType = data['Form Type'] || data.formType || data['From Type'] || data.selectedFormType;
  if (formType) clean['Form Type'] = formType;

  // 2. Subject Section (strictly Page 1 property identification & assignment info)
  const rawSubj = data.Subject || data.SUBJECT || {};
  if (rawSubj && typeof rawSubj === 'object' && Object.keys(rawSubj).length > 0) {
    const cleanSubj = {};
    Object.keys(rawSubj).forEach(k => {
      if (!excludedGridKeys.has(k)) {
        cleanSubj[k] = rawSubj[k];
      }
    });
    clean['Subject'] = cleanSubj;
  }

  // 3. Contract Section
  const contractObj = data.CONTRACT || data.Contract || {};
  if (contractObj && typeof contractObj === 'object' && Object.keys(contractObj).length > 0) {
    clean['Contract'] = contractObj;
  }

  // 4. Neighborhood Section
  const neighborhoodObj = data.NEIGHBORHOOD || data.Neighborhood || {};
  if (neighborhoodObj && typeof neighborhoodObj === 'object' && Object.keys(neighborhoodObj).length > 0) {
    clean['Neighborhood'] = neighborhoodObj;
  }

  // 5. Site Section
  const siteObj = data.SITE || data.Site || {};
  if (siteObj && typeof siteObj === 'object' && Object.keys(siteObj).length > 0) {
    clean['Site'] = siteObj;
  }

  // 6. Improvements Section
  const improvementsObj = data.IMPROVEMENTS || data.Improvements || {};
  if (improvementsObj && typeof improvementsObj === 'object' && Object.keys(improvementsObj).length > 0) {
    clean['Improvements'] = improvementsObj;
  }

  // 7. Sales Grid Section (Page 2 comparison grid: Subject column and Comps 1..N)
  const salesGridSource = data.clean_data?.['Sales Grid'] || data.clean_data?.['Sales Comparison'] || data['Sales Grid'] || data.SALES_GRID || data.SALES_COMPARISON || data['Sales Comparison'] || {};
  if (salesGridSource && typeof salesGridSource === 'object') {
    const cleanSalesGrid = {};
    if (salesGridSource['Subject'] && typeof salesGridSource['Subject'] === 'object') {
      cleanSalesGrid['Subject'] = salesGridSource['Subject'];
    }
    const compMap = new Map();
    Object.keys(salesGridSource).forEach(k => {
      const val = salesGridSource[k];
      if (typeof val === 'object' && val !== null && !Array.isArray(val) && k.toLowerCase() !== 'subject') {
        const numMatch = k.match(/(\d+)/);
        if (numMatch) {
          const num = parseInt(numMatch[1], 10);
          if (!compMap.has(num)) compMap.set(num, val);
        }
      }
    });
    for (let i = 1; i <= 9; i++) {
      if (!compMap.has(i)) {
        const rootComp = data['COMPARABLE SALE #' + i] || data['Comparable Sale #' + i] || data['Comparable Sale ' + i] || data['Comp ' + i];
        if (rootComp && typeof rootComp === 'object' && !Array.isArray(rootComp)) {
          compMap.set(i, rootComp);
        }
      }
    }
    Array.from(compMap.keys()).sort((a, b) => a - b).forEach(num => {
      cleanSalesGrid['Comparable Sale ' + num] = compMap.get(num);
    });
    if (Object.keys(cleanSalesGrid).length > 0) {
      clean['Sales Grid'] = cleanSalesGrid;
    }
  }

  // 8. Reconciliation
  const reconciliationObj = data.RECONCILIATION || data.Reconciliation || {};
  if (reconciliationObj && typeof reconciliationObj === 'object' && Object.keys(reconciliationObj).length > 0) {
    clean['Reconciliation'] = reconciliationObj;
  }
  const sectionPairs = [
    ['COST_APPROACH', 'Cost Approach'],
    ['INCOME_APPROACH', 'Income Approach'],
    ['PUD_INFO', 'PUD Information'],
    ['PROJECT_INFO', 'Project Information'],
    ['PROJECT_ANALYSIS', 'Project Analysis'],
    ['PROJECT_SITE', 'Project Site'],
    ['UNIT_DESCRIPTIONS', 'Unit Descriptions'],
    ['PRIOR_SALE_HISTORY', 'Prior Sale History'],
    ['MARKET_CONDITIONS', 'Market Conditions Addendum'],
    ['CONDO_COOP_PROJECTS', 'Condo / Coop Projects'],
    ['CONDO_FORECLOSURE', 'Condo Foreclosure'],
    ['SUBJECT_RENT_SCHEDULE', 'Subject Rent Schedule'],
    ['COMPARABLE_RENTAL_DATA', 'Comparable Rental Data'],
    ['CERTIFICATION', 'Certification'],
    ['USPAP_IDENTIFICATION', 'USPAP / Report Identification'],
  ];
  sectionPairs.forEach(([secKey, label]) => {
    const obj = data[secKey] || data[label] || {};
    if (obj && typeof obj === 'object' && Object.keys(obj).length > 0 && Object.values(obj).some(v => v !== '' && v !== null && v !== undefined)) {
      clean[label] = obj;
    }
  });
  if (Object.keys(clean).length > 1) return clean;
  return data;
};

