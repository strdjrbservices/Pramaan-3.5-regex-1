/**
 * Architectural Floor Plan & Building Sketch Extractor & Normalizer
 * Provides room label classification, floor/level breakdown, and Gross Living Area (GLA) calculations.
 */

export const ROOM_THEMES = {
  bedrooms: { label: 'Bedrooms', color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe', iconType: 'bed' },
  bathrooms: { label: 'Bathrooms', color: '#0e7490', bg: '#ecfeff', border: '#a5f3fc', iconType: 'bath' },
  living: { label: 'Living Areas', color: '#b45309', bg: '#fffbeb', border: '#fde68a', iconType: 'living' },
  kitchen_dining: { label: 'Kitchen & Dining', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0', iconType: 'kitchen' },
  utility_laundry: { label: 'Utility & Laundry', color: '#334155', bg: '#f8fafc', border: '#cbd5e1', iconType: 'laundry' },
  garage_parking: { label: 'Garage & Parking', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe', iconType: 'garage' },
  openings_outdoor: { label: 'Openings & Outdoor', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', iconType: 'outdoor' },
  basement: { label: 'Basement', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', iconType: 'basement' }
};

export const DEFAULT_ROOM_THEME = { label: 'Room', color: '#334155', bg: '#f1f5f9', border: '#cbd5e1', iconType: 'room' };

export const LEVEL_PATTERNS = [
  { regex: /\blower\s*level\b/i, name: 'Lower Level' },
  { regex: /\bmain\s*level\b/i, name: 'Main Level' },
  { regex: /\bupper\s*level\b/i, name: 'Upper Level' },
  { regex: /\b(?:first|1st)\s*(?:floor|flcor|level)\b/i, name: '1st Floor' },
  { regex: /\b(?:second|2nd)\s*(?:floor|flcor|foor|level)\b/i, name: '2nd Floor' },
  { regex: /\b(?:third|3rd)\s*(?:floor|flcor|level)\b/i, name: '3rd Floor' },
  { regex: /\b(?:fourth|4th)\s*(?:floor|flcor|level)\b/i, name: '4th Floor' },
  { regex: /\bbasement\b/i, name: 'Basement' },
  { regex: /\battic\b/i, name: 'Attic' }
];

export const CATEGORY_RULES = {
  bedrooms: [
    { regex: /\b(?:main|master|primary|m)\s*(?:bed(?:room)?|bed\s*room|bed\s*rm|br|b\/r|bdrm)\b/i, name: 'Main Bedroom' },
    { regex: /\bguest\s*(?:bed(?:room)?|bed\s*room|bed\s*rm|br|b\/r|bdrm)\b/i, name: 'Guest Bedroom' },
    { regex: /\b(?:mbr|pbr)\b/i, name: 'Main Bedroom' },
    { regex: /\b(?:bed\s*room|bed\s*rm|bedroom|bdrm)\s*\d*\b/i, name: 'Bedroom' },
    { regex: /\b(?:be[cd]r[oc0-9]+m|eedroom|bacroom|becrcem|becrc-m)\b/i, name: 'Bedroom' },
    { regex: /\b(?:b\/r|b-r|br|bed)\s*\d*\b/i, name: 'Bedroom' },
    { regex: /\bbed\s*\d+\b/i, name: 'Bedroom' }
  ],
  bathrooms: [
    // Half bath rules must precede full bath rules
    { regex: /(?<![\d.])(?:0?\.5|1\/2)\s*(?:bath(?:room)?|bth\b|ba\b|b\b|hf\b|hb\b|hba\b)/i, name: 'Half Bath' },
    { regex: /(?<![\d.])1(?:\.0)?\s*(?:hb\b|h\/b\b|hba\b|h\/ba\b|half\s*b(?:ath)?\b|half\s*ba\b)/i, name: 'Half Bath' },
    { regex: /\b(?:half[\s-]*(?:bath(?:room)?|bth|ba|b)|h\/b|hb|hba|h\/ba)\b/i, name: 'Half Bath' },
    { regex: /\b(?:powder(?:\s*room|\s*rm)?|pw[\s/.]*d?(?:\s*hb|\s*ba)?|pwd)\b/i, name: 'Half Bath' },
    { regex: /\b(?:lav(?:atory)?|wc|w\.c\.)\b/i, name: 'Half Bath' },
    { regex: /\b(?:bath(?:room)?|bth|ba)\s*(?:\(\s*)?(?:half|1\/2|0?\.5)(?:\s*\))?/i, name: 'Half Bath' },

    // Full bath rules
    { regex: /\b(?:main|master|primary|m)\s*(?:bath(?:room)?|bth|ba|fb|f\/b)\b/i, name: 'Main Bath' },
    { regex: /\bmba\b/i, name: 'Main Bath' },
    { regex: /(?<![\d.])(?:[1-9](?:\.0)?)\s*(?:fb\b|f\/b\b|fba\b|f\/ba\b|full\s*b(?:ath)?\b|full\s*ba\b)/i, name: 'Full Bath' },
    { regex: /(?<![\d.])(?:[1-9](?:\.0)?)\s*(?:bath(?:room)?|bth|ba)\b/i, name: 'Full Bath' },
    { regex: /\b(?:full\s*bath(?:room)?|full\s*bth|full\s*ba|full\s*b)\b/i, name: 'Full Bath' },
    { regex: /\b(?:fb|f\/b|f-b|fba|f\/ba)\s*\d*\b/i, name: 'Full Bath' },
    { regex: /\b(?:full\s+)?bath(?:room)?\s*\d*\b/i, name: 'Bath' },
    { regex: /(?<!fin\s)(?<!finished\s)(?<!unfin\s)(?<!unfinished\s)\b(?:bth|ba)\s*\d*\b/i, name: 'Bath' }
  ],
  basement: [
    { regex: /\b(?:fin(?:ished)?\s*(?:basement|base|bsmt|bmst|ba))\b/i, name: 'Finished Basement' },
    { regex: /\b(?:unfin(?:ished)?\s*(?:basement|base|bsmt|bmst|ba))\b/i, name: 'Unfinished Basement' },
    { regex: /\b(?:walk[\s-]*out\s*basement|daylight\s*basement|cellar|basement|bsmt)\b/i, name: 'Basement' }
  ],
  living: [
    { regex: /\b(?:formal\s+)?(?:living(?:\s*room|\s*rm|\s*r|\s*area)?|livira|lr\b|l\/r\b|l\.r\.?)\b/i, name: 'Living Room' },
    { regex: /\b(?:family(?:\s*room|\s*rm|\s*r|\s*area)?|fam(?:\s*room|\s*rm)?|fr\b|f\/r\b)\b/i, name: 'Family Room' },
    { regex: /\bgreat\s*room\b/i, name: 'Great Room' },
    { regex: /\b(?:rec(?:reation)?(?:\s*room|\s*rm)?)\b/i, name: 'Rec Room' },
    { regex: /\b(?:game\s*room|game\s*rm|media\s*room|theater|theatre|billiard\s*room|playing\s*room|play\s*room|playroom)\b/i, name: 'Game / Media Room' },
    { regex: /\b(?:den|study)\b/i, name: 'Den / Study' },
    { regex: /\bloft\b/i, name: 'Loft' },
    { regex: /\b(?:office|home\s*office|library)\b/i, name: 'Office' },
    { regex: /\b(?:sitting(?:\s*room|\s*rm|\s*area)?)\b/i, name: 'Sitting Area' },
    { regex: /\b(?:sun\s*room|sunroom)\b/i, name: 'Sun Room' },
    { regex: /\bbonus\s*(?:room|rm)\b/i, name: 'Bonus Room' },
    { regex: /\bconverted(?:\s+(?:area|garage|space|room|rm))?\b/i, name: 'Converted Area' },
    { regex: /\b(?:adu|a\.d\.u\.|accessory\s*dwelling(?:\s*unit)?)\b/i, name: 'ADU' }
  ],
  kitchen_dining: [
    { regex: /\bkitchenette\b/i, name: 'Kitchenette' },
    { regex: /\b(?:kitchen|kitch|kteten|kit|ki)\b/i, name: 'Kitchen' },
    { regex: /\b(?:dining\s*area|dinning\s*area)\b/i, name: 'Dining Area' },
    { regex: /\b(?:formal\s+)?(?:dining(?:\s*room|\s*rm)?|dinning(?:\s*room|\s*rm)?|diring|dr\b|d\/r\b|d\.r\.?)\b/i, name: 'Dining Room' },
    { regex: /\b(?:brkfst|brkfast|break\s*fast|breakfast|brk)(?:\s*(?:room|rm|nook|area))?\b/i, name: 'Breakfast Room' },
    { regex: /\b(?:dining\s*nook|dinette|nook)\b/i, name: 'Dining Nook' },
    { regex: /\bpantry\b/i, name: 'Pantry' },
    { regex: /\b(?:wet\s*bar|wetbar|bar)\b/i, name: 'Bar' }
  ],
  openings_outdoor: [
    { regex: /\bopen\s+to\s+below\b/i, name: 'Open to Below' },
    { regex: /\b(?:open\s*porch|op\s*,\s*ep|op\/ep)\b/i, name: 'Open Porch' },
    { regex: /\b(?:c(?:o)?v(?:ere)?d\s*p(?:o)?rc?h|cvd\s*porch|cov\s*porch|c\/p|cp)\b/i, name: 'Covered Porch' },
    { regex: /\b(?:closed\s*porch|uncover(?:ed)?\s*porch|screened?\s*porch|front\s*porch|rear\s*porch|porch)\b/i, name: 'Porch' },
    { regex: /\b(?:un(?:cov(?:ered)?|cvd)\s*deck)\b/i, name: 'Uncovered Deck' },
    { regex: /\b(?:wood(?:en)?|composite|trex)\s*deck\b/i, name: 'Wood Deck' },
    { regex: /\bdeck\b/i, name: 'Deck' },
    { regex: /\bpatio\b/i, name: 'Patio' },
    { regex: /\bbalcony\b/i, name: 'Balcony' },
    { regex: /\b(?:terrace|veranda|lanai)\b/i, name: 'Terrace / Lanai' },
    { regex: /\b(?:courtyard|breezeway)\b/i, name: 'Courtyard / Breezeway' },
    { regex: /\bworkshop\b/i, name: 'Workshop' },
    { regex: /\boutbuilding\b/i, name: 'Outbuilding' },
    { regex: /\blean[\s-]*to\b/i, name: 'Lean-to' },
    { regex: /\b(?:shed|storage\s*shed|tool\s*shed|barn)\b/i, name: 'Shed' }
  ],
  garage_parking: [
    { regex: /\b1\s*car\s*attached(?:\s*garage)?\b/i, name: '1 Car Attached' },
    { regex: /\b2\s*car\s*attached(?:\s*garage)?\b/i, name: '2 Car Attached' },
    { regex: /\b3\s*car\s*attached(?:\s*garage)?\b/i, name: '3 Car Attached' },
    { regex: /\b1\s*car\s*(?:detached|de-?attached)(?:\s*garage)?\b/i, name: '1 Car Detached' },
    { regex: /\b2\s*car\s*(?:detached|de-?attached)(?:\s*garage)?\b/i, name: '2 Car Detached' },
    { regex: /\b3\s*car\s*(?:detached|de-?attached)(?:\s*garage)?\b/i, name: '3 Car Detached' },
    { regex: /\b(?:\d+\s*)?(?:car\s*built[\s-]*in|built[\s-]*in\s*(?:\d+\s*car\s*)?garage)\b/i, name: 'Built-in Garage' },
    { regex: /\b\d+[\s-]*car\s*(?:\/|\s+)?(?:attached|detached|de-?attached)?\s*(?:car\s*port|garage)?\b/i, name: 'Carport / Garage' },
    { regex: /\b\d+\s*car\s*(?:attached|detached|de-?attached)?(?:\s*garage)?\b/i, name: 'Car Garage' },
    { regex: /\b(?:car\s*(?:detached|de-?attached)|(?:detached|de-?attached)\s*car)\b/i, name: 'Car Detached' },
    { regex: /\b(?:car\s*attached|attached\s*car)\b/i, name: 'Car Attached' },
    { regex: /\b(?:attached|detached|de-?attached)\s*garage\b/i, name: 'Garage' },
    { regex: /\bgarage\b/i, name: 'Garage' },
    { regex: /\bcar\s*port\b/i, name: 'Carport' }
  ],
  utility_laundry: [
    { regex: /\b(?:w\s*\/\s*d(?:\s*area|\s*rm|\s*room)?|washer\s*(?:&|and|\/)?\s*dryer(?:\s*area)?)\b/i, name: 'W/D Area' },
    { regex: /\b(?:laundry(?:\s*room|\s*rm|\s*area)?|laundary|launda|laund|laun|lndry|ldy|la)\b/i, name: 'Laundry' },
    { regex: /\butility(?:\s*room|\s*rm|\s*area)?\b/i, name: 'Utility Room' },
    { regex: /\b(?:mud\s*room|mudroom|mud\s*rm)\b/i, name: 'Mud Room' },
    { regex: /\b(?:hall(?:way)?|corridor)\b/i, name: 'Hall' },
    { regex: /\b(?:foyer|entry(?:way)?|vestibule)\b/i, name: 'Foyer / Entry' },
    { regex: /\b(?:entrance\s*stairs|entry\s*stairs|stairs|stairway|stair|staircase)\b/i, name: 'Stairs' },
    { regex: /\b(?:walk[\s-]*in\s*closet|wic)\b/i, name: 'Walk-in Closet' },
    { regex: /\bcl(?:o)?se[td]s?(?!\s*porch)\b/i, name: 'Closet' },
    { regex: /\battic\b/i, name: 'Attic' },
    { regex: /\bunfinished(?:\s+(?:area|space|room))?\b/i, name: 'Unfinished' },
    { regex: /\bfinished(?:\s+(?:area|space|room))?\b/i, name: 'Finished' },
    { regex: /\b(?:mech\.?|mechanical|furnace|hvac|boiler|storage)\b/i, name: 'Storage / Mech' }
  ]
};

/**
 * Normalizes raw abbreviation strings into clean readable labels
 */
export const normalizeRoomLabelString = (label) => {
  if (!label || typeof label !== 'string') return '';
  const s = label.trim();
  if (/^op\s*,\s*ep$/i.test(s) || /^op\/ep$/i.test(s) || /^op$/i.test(s)) return 'Open Porch';
  if (/^ep$/i.test(s)) return 'Enclosed Porch';
  if (/^cp$/i.test(s) || /^cvd\s*p(?:o)?rc?h$/i.test(s) || /^cov\s*porch$/i.test(s)) return 'Covered Porch';
  if (/^sp$/i.test(s)) return 'Screened Porch';
  if (/^p\/d$/i.test(s) || /^p\/p\/d$/i.test(s)) return 'Porch / Patio';
  if (/^driveway,\s*garage$/i.test(s) || /^driveway$/i.test(s)) return 'Driveway & Garage';
  if (/^front$/i.test(s) || /^front\s*porch$/i.test(s)) return 'Front Porch';
  if (/^rear$/i.test(s) || /^rear\s*porch$/i.test(s)) return 'Rear Porch';
  if (/^br$/i.test(s) || /^b\/r$/i.test(s) || /^bed\s*room$/i.test(s)) return 'Bedroom';
  if (/^ba$/i.test(s)) return 'Bath';
  if (/^fb$/i.test(s) || /^f\/b$/i.test(s) || /^fba$/i.test(s) || /^f\/ba$/i.test(s)) return 'Full Bath';
  if (/^hb$/i.test(s) || /^h\/b$/i.test(s) || /^hba$/i.test(s) || /^h\/ba$/i.test(s) || /^pw[\s/.]*d?(?:\s*hb)?$/i.test(s) || /^pwd$/i.test(s)) return 'Half Bath';
  if (/^dr$/i.test(s) || /^d\/r$/i.test(s) || /^d\.r\.?$/i.test(s) || /^dinning(?:\s*room)?$/i.test(s)) return 'Dining Room';
  if (/^lr$/i.test(s) || /^l\/r$/i.test(s) || /^l\.r\.?$/i.test(s)) return 'Living Room';
  if (/^kit$/i.test(s) || /^ki$/i.test(s)) return 'Kitchen';
  if (/^brk$/i.test(s) || /^brkfst$/i.test(s) || /^break\s*fast$/i.test(s)) return 'Breakfast Room';
  if (/^laun$/i.test(s) || /^launda$/i.test(s) || /^la$/i.test(s) || /^laundary$/i.test(s)) return 'Laundry';
  if (/^w\s*\/\s*d(?:\s*area)?$/i.test(s)) return 'W/D Area';
  if (/^uncvd\s*deck$/i.test(s)) return 'Uncovered Deck';
  if (/^bonus\s*rm$/i.test(s)) return 'Bonus Room';
  if (/^primary\s*b\/r$/i.test(s)) return 'Primary Bedroom';
  if (/^\.?5\s*bth$/i.test(s)) return 'Half Bath';
  if (/^fin(?:ished)?\s*(?:base|basement|ba|bsmt)$/i.test(s)) return 'Finished Basement';
  if (/^unfin(?:ished)?\s*(?:base|basement|ba|bsmt)$/i.test(s)) return 'Unfinished Basement';
  if (/^car\s*de-?attached$/i.test(s)) return 'Car Detached';
  if (/^adu$/i.test(s)) return 'ADU';
  if (/^mech\.?$/i.test(s)) return 'Mechanical';
  return s;
};

/**
 * Normalizes category name for a room label string
 */
export const classifyRoomLabel = (label) => {
  if (!label || typeof label !== 'string') return { category: 'living', standardName: 'Room' };
  const cleaned = normalizeRoomLabelString(label);
  for (const [catKey, rules] of Object.entries(CATEGORY_RULES)) {
    for (const r of rules) {
      if (r.regex.test(cleaned)) {
        return { category: catKey, standardName: r.name };
      }
    }
  }
  return { category: 'living', standardName: cleaned };
};

/**
 * Returns theme object for a room label or category
 */
export const getRoomTheme = (category, label) => {
  if (category && ROOM_THEMES[category]) return ROOM_THEMES[category];
  if (label) {
    const classified = classifyRoomLabel(label);
    if (ROOM_THEMES[classified.category]) return ROOM_THEMES[classified.category];
  }
  return DEFAULT_ROOM_THEME;
};

/**
 * Extracts and normalizes Sketch Gross Living Area (GLA)
 */
export const getSketchGLA = (sketchItem, data = null, allData = null) => {
  if (sketchItem?.gla) {
    const clean = String(sketchItem.gla).replace(/,/g, '').trim();
    if (clean && !isNaN(Number(clean)) && Number(clean) > 0) return clean;
  }

  // Check sketchItem.areas
  const areas = sketchItem?.areas || [];
  if (areas.length > 0) {
    for (const ar of areas) {
      const nm = (ar?.name || '').toLowerCase();
      if (/total\s*(?:sketch|living|area)|gross\s*living\s*area|\bgla\b/i.test(nm)) {
        const m = String(ar?.area || ar?.sqft || '').replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)/);
        if (m) return m[1];
      }
    }

    let livingSum = 0;
    let foundLiving = false;
    for (const ar of areas) {
      const nm = (ar?.name || '').toLowerCase();
      if (
        /first|second|third|fourth|1st|2nd|3rd|4th|floor|level|main|upper|living/i.test(nm) &&
        !/garage|carport|porch|deck|patio|basement|non-living/i.test(nm)
      ) {
        const m = String(ar?.area || ar?.sqft || '').replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)/);
        if (m) {
          livingSum += parseFloat(m[1]);
          foundLiving = true;
        }
      }
    }
    if (foundLiving && livingSum > 0) {
      return String(Math.round(livingSum));
    }

    const firstM = String(areas[0]?.area || areas[0]?.sqft || '').replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)/);
    if (firstM) return firstM[1];
  }

  if (sketchItem?.raw_text_sample) {
    const m = sketchItem.raw_text_sample.replace(/,/g, '').match(/(?:total\s*(?:living\s*area|sketch|area)|gross\s*living\s*area|\bgla\b)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (m) return m[1];
  }

  // Fallback to data / allData
  const root = { ...(allData || {}), ...(data || {}) };
  const imp = root.IMPROVEMENTS || root.Improvements || root.improvements || root.clean_data?.Improvements || {};
  const grid = root.SALES_GRID?.Subject || root['Sales Grid']?.Subject || root.Subject || {};
  const fieldsImp = root.fields?.IMPROVEMENTS || root.fields?.Improvements || {};
  const fieldsGrid = root.fields?.SALES_GRID?.Subject || root.fields?.Subject || {};

  const candidates = [
    imp['Square Feet of Gross Living Area Above Grade'],
    imp['Above Grade Finished Area'],
    imp['GLA / GBA'],
    imp['Finished area above grade GLA'],
    grid['Gross Living Area'],
    fieldsImp['Square Feet of Gross Living Area Above Grade'],
    fieldsImp['Above Grade Finished Area'],
    fieldsGrid['Gross Living Area'],
    root.STRUCTURE?.GrossLivingAreaSquareFeetCount
  ];

  for (const c of candidates) {
    if (c !== undefined && c !== null) {
      const m = String(c).replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)/);
      if (m && Number(m[1]) > 0) return m[1];
    }
  }

  return '';
};

/**
 * Extracts area sections from sketch raw text callouts
 */
export const extractAreasFromSketchText = (text) => {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/[\n|]+/).map(l => l.trim()).filter(Boolean);
  const areas = [];
  const seenNames = new Set();
  let inSummary = false;
  let isNonLiving = false;

  // 1. Parse Area Calculations Summary table
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\barea\s*calculations\s*summary\b/i.test(line)) {
      inSummary = true;
      continue;
    }
    if (inSummary) {
      if (/\bnon[- ]*living\s*area\b/i.test(line)) {
        isNonLiving = true;
        continue;
      }
      if (/\bliving\s*area\b/i.test(line) && !/total/i.test(line)) {
        isNonLiving = false;
        continue;
      }
      const mSf = line.match(/^([0-9,]+(?:\.[0-9]+)?)\s*(?:sq\s*ft|ft[²2]|sf)\b/i);
      if (mSf) {
        const num = parseFloat(mSf[1].replace(/,/g, ''));
        let name = '';
        for (let back = 1; back <= 3; back++) {
          if (i - back >= 0) {
            const cand = lines[i - back];
            if (!/(?:sq\s*ft|ft[²2]|sf|calculation\s*details|area\s*calculations|\b\d+\s*[×x]\s*\d+)/i.test(cand) && !/^[0-9.]+$/.test(cand)) {
              name = cand;
              break;
            }
          }
        }
        if (name && !isNaN(num) && num > 0) {
          const cleanName = name.replace(/[:=-]+$/, '').trim();
          const isTotal = /total\s*(?:living|sketch|area)|gross\s*living|\bgla\b/i.test(cleanName);
          if (!seenNames.has(cleanName.toLowerCase())) {
            areas.push({
              name: cleanName,
              sqft: num,
              area: `${num.toLocaleString()} Sq Ft`,
              isGLA: (!isNonLiving && !isTotal),
              isTotalGLA: isTotal,
              isNonLiving: isNonLiving
            });
            seenNames.add(cleanName.toLowerCase());
          }
        }
      }
    }
  }

  // 2. Parse Bracketed Area Callouts in floorplan drawings: e.g. "First Floor [805.57 Sq ft]" or "Second Floor [446.6 Sq ft]"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const mComb = line.match(/^([A-Za-z0-9\s/,-]+?)\s*\[\s*(?:Area:\s*)?([0-9,]+(?:\.[0-9]+)?)\s*(?:sq\s*ft|ft[²2]|sf)?\s*\]/i);
    if (mComb) {
      const name = mComb[1].trim();
      const num = parseFloat(mComb[2].replace(/,/g, ''));
      const cleanName = name.replace(/[:=-]+$/, '').trim();
      if (!seenNames.has(cleanName.toLowerCase()) && !isNaN(num) && num > 0) {
        const isNon = /garage|carport|porch|deck|patio|balcony|basement|non-living/i.test(cleanName);
        const isTot = /total\s*(?:living|sketch|area)|gross\s*living|\bgla\b/i.test(cleanName);
        areas.push({
          name: cleanName,
          sqft: num,
          area: `${num.toLocaleString()} Sq Ft`,
          isGLA: (!isNon && !isTot),
          isTotalGLA: isTot,
          isNonLiving: isNon
        });
        seenNames.add(cleanName.toLowerCase());
      }
      continue;
    }

    const mBracket = line.match(/^\[\s*(?:Area:\s*)?([0-9,]+(?:\.[0-9]+)?)\s*(?:sq\s*ft|ft[²2]|sf)?\s*\]/i);
    if (mBracket && i > 0) {
      const num = parseFloat(mBracket[1].replace(/,/g, ''));
      let name = '';
      for (let back = 1; back <= 3; back++) {
        if (i - back >= 0) {
          const cand = lines[i - back];
          if (!/(?:sq\s*ft|ft[²2]|sf|calculation\s*details|area\s*calculations|property address|borrower|lender)/i.test(cand) && cand.length < 40 && !/^[0-9.]+$/.test(cand)) {
            name = cand;
            break;
          }
        }
      }
      if (name && !isNaN(num) && num > 0) {
        const cleanName = name.replace(/[:=-]+$/, '').trim();
        if (!seenNames.has(cleanName.toLowerCase())) {
          const isNon = /garage|carport|porch|deck|patio|balcony|basement|non-living/i.test(cleanName);
          const isTot = /total\s*(?:living|sketch|area)|gross\s*living|\bgla\b/i.test(cleanName);
          areas.push({
            name: cleanName,
            sqft: num,
            area: `${num.toLocaleString()} Sq Ft`,
            isGLA: (!isNon && !isTot),
            isTotalGLA: isTot,
            isNonLiving: isNon
          });
          seenNames.add(cleanName.toLowerCase());
        }
      }
    }
  }

  return areas;
};

/**
 * Returns structured Living / Non-Living Area calculations breakdown for the sketch.
 * Dynamically populated directly from sketch extraction data without hardcoded values.
 */
export const getSketchAreasBreakdown = (sketchItem, data = null, allData = null) => {
  const root = { ...(allData || {}), ...(data || {}) };
  const imp = root.IMPROVEMENTS || root.Improvements || root.improvements || root.clean_data?.Improvements || {};
  const rawAreas = Array.isArray(sketchItem?.areas) ? sketchItem.areas : [];
  const resultAreas = [];

  const addArea = (name, sqft, isGLA, isNonLiving = false, exactAreaStr = null) => {
    const num = Number(sqft) || 0;
    const cleanName = normalizeRoomLabelString(name).replace(/^\[|\]$/g, '').trim();
    if (!cleanName) return;
    const formattedArea = exactAreaStr || (num > 0 ? `${Number(num).toLocaleString(undefined, { maximumFractionDigits: 1 })} Sq Ft` : 'Exterior / Non-GLA');
    resultAreas.push({
      name: cleanName,
      area: formattedArea,
      sqft: num,
      isGLA: Boolean(isGLA),
      isTotalGLA: false,
      isNonLiving: Boolean(isNonLiving)
    });
  };

  // 1. Process provided areas from sketchItem if available
  if (rawAreas.length > 0) {
    rawAreas.forEach(ar => {
      const name = ar?.name || ar?.label || 'Living Area';
      const areaStr = String(ar?.area || (ar?.sqft ? `${Number(ar.sqft).toLocaleString()} Sq Ft` : ''));
      const mSf = (areaStr || String(ar?.sqft || '')).replace(/,/g, '').match(/([\d]+(?:\.\d+)?)/);
      const sfNum = mSf ? parseFloat(mSf[1]) : (typeof ar?.sqft === 'number' ? ar.sqft : 0);
      const nameLow = name.toLowerCase();
      const isNonLiving = ar?.is_non_living !== undefined ? ar.is_non_living : /garage|carport|porch|deck|patio|balcony|basement|non-living|driveway|front|rear|unfinished/i.test(nameLow);
      const isTotal = ar?.is_total_gla !== undefined ? ar.is_total_gla : /total\s*(?:sketch|living|area)|gross\s*living\s*area|\bgla\b/i.test(nameLow);

      if (!isTotal) {
        addArea(name, sfNum, !isNonLiving, isNonLiving, ar?.area);
      }
    });
  }

  // 2. Parse text callouts if resultAreas is empty
  if (resultAreas.length === 0) {
    const txtCandidates = [sketchItem?.raw_text, sketchItem?.raw_text_sample, sketchItem?.extracted_text, sketchItem?.text].filter(Boolean).join('\n');
    const textAreas = extractAreasFromSketchText(txtCandidates);
    if (textAreas.length > 0) {
      textAreas.forEach(ta => {
        if (!ta.isTotalGLA) {
          addArea(ta.name, ta.sqft, ta.isGLA, ta.isNonLiving);
        }
      });
    }
  }

  // 3. Fallback to Improvements Level Rows if available in XML: Level in Unit Row 1..8
  if (resultAreas.length === 0) {
    for (let rIdx = 1; rIdx <= 8; rIdx++) {
      const lvl = imp[`Level in Unit Row ${rIdx}`];
      if (!lvl) break;
      const grd = imp[`Grade Level Detail Row ${rIdx}`] || '';
      const fin = imp[`Finish Row ${rIdx}`] || 'Finished';
      const aStr = imp[`Area Row ${rIdx}`] || '';
      const mSf = aStr.replace(/,/g, '').match(/([\d]+(?:\.\d+)?)/);
      const sfNum = mSf ? parseFloat(mSf[1]) : 0;
      const isFinished = /finished/i.test(fin) && !/unfinished/i.test(fin);
      addArea(`${lvl}${grd ? ` (${grd})` : ''} - ${fin}`, sfNum, isFinished, !isFinished);
    }
  }

  // 4. Ensure totalGLA accurately reflects the living levels
  const livingTotal = resultAreas
    .filter(a => a.isGLA && !a.isNonLiving)
    .reduce((acc, cur) => acc + (cur.sqft || 0), 0);

  const glaVal = getSketchGLA(sketchItem, data, allData);
  const numGla = glaVal ? Math.round(Number(glaVal)) : 0;
  const effectiveTotal = livingTotal > 0 ? livingTotal : numGla;

  // If resultAreas is still empty but GLA is known, display Above Grade Finished Living Area
  if (resultAreas.length === 0 && effectiveTotal > 0) {
    addArea('Above Grade Finished Living Area', effectiveTotal, true, false);
  }

  return {
    areas: resultAreas,
    totalGLA: effectiveTotal,
    glaFormatted: effectiveTotal > 0 ? `${effectiveTotal.toLocaleString()} Sq Ft` : '—'
  };
};

/**
 * Parses all room labels, categories, floor levels, and features directly from sketchItem and report data.
 * 100% dynamic - no hardcoded numbers or synthetic fake rooms.
 */
export const parseSketchRooms = (sketchItem, data = null, allData = null) => {
  const root = { ...(allData || {}), ...(data || {}) };
  const imp = root.IMPROVEMENTS || root.Improvements || root.improvements || root.clean_data?.Improvements || {};
  const rawSum = sketchItem?.room_summary || {};

  const byCategory = {
    bedrooms: [],
    bathrooms: [],
    living: [],
    kitchen_dining: [],
    utility_laundry: [],
    garage_parking: [],
    openings_outdoor: [],
    basement: [],
    other: []
  };
  const byLevel = {};
  const directLabels = [];

  // 1. Populate from sketchItem.rooms_by_level if present
  if (sketchItem?.rooms_by_level && typeof sketchItem.rooms_by_level === 'object') {
    Object.entries(sketchItem.rooms_by_level).forEach(([lvl, itms]) => {
      if (Array.isArray(itms) && itms.length > 0) {
        byLevel[lvl] = itms.map(it => {
          const rawLbl = typeof it === 'string' ? it : it?.label || '';
          const normLbl = normalizeRoomLabelString(rawLbl);
          const classified = classifyRoomLabel(normLbl);
          if (normLbl && !directLabels.includes(normLbl)) directLabels.push(normLbl);
          const fullItem = { label: normLbl, standard_name: it?.standard_name || classified.standardName, category: it?.category || classified.category, level: lvl };
          byCategory[fullItem.category]?.push(fullItem);
          return fullItem;
        });
      }
    });
  }

  // 2. Populate from sketchItem.rooms_by_category if present
  if (sketchItem?.rooms_by_category && typeof sketchItem.rooms_by_category === 'object') {
    Object.entries(sketchItem.rooms_by_category).forEach(([catKey, items]) => {
      if (Array.isArray(items)) {
        items.forEach(itm => {
          const rawLbl = typeof itm === 'string' ? itm : itm?.label || '';
          const normLbl = normalizeRoomLabelString(rawLbl);
          if (normLbl && !directLabels.includes(normLbl)) directLabels.push(normLbl);
          const lvl = itm?.level || '1st Floor';
          const fullItem = { label: normLbl, standard_name: itm?.standard_name || normLbl, category: catKey, level: lvl };
          if (byCategory[catKey] && !byCategory[catKey].some(x => x.label === normLbl && x.level === lvl)) {
            byCategory[catKey].push(fullItem);
          }
          if (!byLevel[lvl]) byLevel[lvl] = [];
          if (!byLevel[lvl].some(x => x.label === normLbl)) {
            byLevel[lvl].push(fullItem);
          }
        });
      }
    });
  }

  // 3. Normalize any provided sketchItem.room_labels
  if (Array.isArray(sketchItem?.room_labels) && sketchItem.room_labels.length > 0) {
    sketchItem.room_labels.forEach(rl => {
      const norm = normalizeRoomLabelString(rl);
      if (norm && !directLabels.includes(norm)) {
        directLabels.push(norm);
        const classified = classifyRoomLabel(norm);
        const item = { label: norm, standard_name: classified.standardName, category: classified.category, level: '1st Floor' };
        if (byCategory[classified.category]) byCategory[classified.category].push(item);
        if (!byLevel['1st Floor']) byLevel['1st Floor'] = [];
        byLevel['1st Floor'].push(item);
      }
    });
  }

  // 4. Fallback to XML Level in Unit Row room summaries if available
  if (directLabels.length === 0) {
    for (let rIdx = 1; rIdx <= 8; rIdx++) {
      const lvl = imp[`Level in Unit Row ${rIdx}`];
      if (!lvl) break;
      const rSum = imp[`Room Summary Row ${rIdx}`] || '';
      if (rSum) {
        if (!byLevel[lvl]) byLevel[lvl] = [];
        rSum.split(',').forEach(pt => {
          const ptTrim = pt.trim();
          if (!ptTrim) return;
          const mCnt = ptTrim.match(/(\d+)\s*-\s*(.*)/);
          const cnt = mCnt ? parseInt(mCnt[1], 10) : 1;
          const rName = mCnt ? mCnt[2].trim() : ptTrim;
          for (let ci = 0; ci < cnt; ci++) {
            const lItem = normalizeRoomLabelString(cnt > 1 ? `${rName} ${ci + 1}` : rName);
            if (!directLabels.includes(lItem)) directLabels.push(lItem);
            const classified = classifyRoomLabel(lItem);
            const entry = { label: lItem, standard_name: classified.standardName, category: classified.category, level: lvl };
            byCategory[classified.category]?.push(entry);
            byLevel[lvl].push(entry);
          }
        });
      }
    }
  }

  // 5. Dynamic fallback: parse raw sketch text if still no labels
  if (directLabels.length === 0) {
    const rawTxt = [sketchItem?.raw_text, sketchItem?.raw_text_sample, sketchItem?.extracted_text, sketchItem?.text]
      .filter(Boolean)
      .join('\n');
    if (rawTxt) {
      let curLvl = '1st Floor';
      const lines = rawTxt.split(/[\n|]+/).map(l => l.trim()).filter(Boolean);
      for (const rawLine of lines) {
        if (/\b(?:area\s*calculations\s*summary|calculation\s*details)\b/i.test(rawLine)) break;
        const cleaned = rawLine
          .replace(/\[?\s*-?\d+(?:\.\d+)?\s*(?:sq\s*ft|sf|ft2)\s*\]?/gi, '')
          .replace(/\s+\d+(?:\.\d+)?['"]?\s*[x×]\s*\d+(?:\.\d+)?['"]?$/i, '')
          .trim();
        if (!cleaned || cleaned.length < 2 || cleaned.length > 60 || /^[\d.\s'"x=+\-/]+$/i.test(cleaned)) continue;
        if (/^(?:borrower|file\s*no|property\s*address|case\s*no|lender|appraiser|client|scale|date|page\s*\d|total\s*sketch|living\s*area|non-living\s*area|gross\s*living\s*area|gla)\b/i.test(cleaned)) continue;
        const lvlMatch = LEVEL_PATTERNS.find(lp => lp.regex.test(cleaned));
        if (lvlMatch) {
          curLvl = lvlMatch.name;
          if (!byLevel[curLvl]) byLevel[curLvl] = [];
          if (!/\b(?:basement|attic)\b/i.test(cleaned)) continue;
        }
        const norm = normalizeRoomLabelString(cleaned);
        let matchedCat = null;
        let stdName = norm;
        for (const [catKey, rules] of Object.entries(CATEGORY_RULES)) {
          const hit = rules.find(r => r.regex.test(norm));
          if (hit) {
            matchedCat = catKey;
            stdName = hit.name;
            break;
          }
        }
        const isDynamicLabel = matchedCat || (/[a-zA-Z]{2,}/.test(norm) && norm.split(/\s+/).length <= 8 && !/^\d+\s+[A-Za-z]/.test(norm));
        if (isDynamicLabel) {
          if (!directLabels.includes(norm)) directLabels.push(norm);
          const cat = matchedCat || 'other';
          const entry = { label: norm, standard_name: stdName, category: cat, level: curLvl };
          if (byCategory[cat]) byCategory[cat].push(entry);
          if (!byLevel[curLvl]) byLevel[curLvl] = [];
          byLevel[curLvl].push(entry);
        }
      }
    }
  }

  const uniqueLabels = Array.from(new Set(directLabels));

  const isBsmtItem = (it) => /basement|bsmt|lower\s*level|below\s*grade|cellar/i.test(`${it?.level || ''} ${it?.label || ''} ${it?.standard_name || ''}`);
  const hasBasementLevel = Object.keys(byLevel).some(k => /basement|bsmt|lower\s*level|below\s*grade|cellar/i.test(k))
    || uniqueLabels.some(l => /basement|bsmt|below\s*grade|cellar/i.test(l));

  const aboveBeds = byCategory.bedrooms.filter(b => !isBsmtItem(b));
  const aboveBaths = byCategory.bathrooms.filter(b => !isBsmtItem(b));
  const aboveLiving = byCategory.living.filter(b => !isBsmtItem(b));
  const aboveKd = byCategory.kitchen_dining.filter(b => !isBsmtItem(b));
  const aboveUtil = byCategory.utility_laundry.filter(b => !isBsmtItem(b));

  const bedCount = hasBasementLevel
    ? (aboveBeds.length > 0 ? aboveBeds.length : null)
    : (rawSum.bedroom_count ?? (aboveBeds.length > 0 ? aboveBeds.length : null));
  const fullBaths = aboveBaths.filter(b => b.standard_name !== 'Half Bath').length;
  const halfBaths = aboveBaths.filter(b => b.standard_name === 'Half Bath').length;
  const calcBathCount = fullBaths + (0.5 * halfBaths);
  const calcBathDisplay = calcBathCount > 0 ? `${fullBaths} Full${halfBaths ? `, ${halfBaths} Half` : ''}` : '';
  const bathCount = hasBasementLevel
    ? (calcBathCount > 0 ? calcBathCount : null)
    : (rawSum.bathroom_count ?? (calcBathCount > 0 ? calcBathCount : null));
  const bathDisplay = (!hasBasementLevel && rawSum.bathroom_display && rawSum.bathroom_display !== '0' && rawSum.bathroom_display !== '—')
    ? rawSum.bathroom_display
    : (calcBathCount > 0 ? calcBathDisplay : (bathCount ? `${bathCount} Bath(s)` : ''));
  const livingCount = hasBasementLevel ? aboveLiving.length : (rawSum.living_rooms_count ?? aboveLiving.length);
  const hasKitchen = hasBasementLevel
    ? aboveKd.some(k => /kitchen/i.test(k.label || k.standard_name))
    : (rawSum.has_kitchen ?? aboveKd.some(k => /kitchen/i.test(k.label || k.standard_name)));
  const hasDining = hasBasementLevel
    ? aboveKd.some(k => /dining|nook|breakfast|brk/i.test(k.label || k.standard_name))
    : (rawSum.has_dining ?? aboveKd.some(k => /dining|nook|breakfast|brk/i.test(k.label || k.standard_name)));
  const garageName = rawSum.garage || byCategory.garage_parking[0]?.label || null;
  const totalRooms = hasBasementLevel
    ? ((bedCount || 0) + livingCount + (hasKitchen ? 1 : 0) + (hasDining ? 1 : 0) || null)
    : (rawSum.total_rooms ?? ((bedCount || 0) + livingCount + (hasKitchen ? 1 : 0) + (hasDining ? 1 : 0) || (uniqueLabels.length > 0 ? uniqueLabels.length : null)));

  // Below-grade (Basement) room counts matching Sales Grid UAD format: rr, br, ba, o
  const bsmtBeds = byCategory.bedrooms.filter(isBsmtItem);
  const bsmtBaths = byCategory.bathrooms.filter(isBsmtItem);
  const bsmtLiving = byCategory.living.filter(isBsmtItem);
  const bsmtKd = byCategory.kitchen_dining.filter(isBsmtItem);
  const bsmtOtherCat = (byCategory.other || []).filter(isBsmtItem);

  const bsmtRr = bsmtLiving.filter(l => /rec|family|game|media|play/i.test(l.standard_name || l.label || '')).length;
  const bsmtNonRrLiving = bsmtLiving.length - bsmtRr;
  const bsmtBr = bsmtBeds.length;
  const bsmtFullBa = bsmtBaths.filter(b => b.standard_name !== 'Half Bath').length;
  const bsmtHalfBa = bsmtBaths.filter(b => b.standard_name === 'Half Bath').length;
  const bsmtBa = bsmtFullBa + (0.5 * bsmtHalfBa);
  const bsmtO = bsmtKd.length + bsmtNonRrLiving + bsmtOtherCat.length;
  const bsmtBaStr = (bsmtFullBa > 0 || bsmtHalfBa > 0) ? `${bsmtFullBa}.${bsmtHalfBa}` : '0';

  const basementRooms = rawSum.basement_rooms && !hasBasementLevel
    ? rawSum.basement_rooms
    : {
        rr: bsmtRr,
        br: bsmtBr,
        ba: bsmtBa,
        full_ba: bsmtFullBa,
        half_ba: bsmtHalfBa,
        o: bsmtO,
        uad: `${bsmtRr}rr${bsmtBr}br${bsmtBaStr}ba${bsmtO}o`,
        hasAny: (bsmtRr + bsmtBr + bsmtFullBa + bsmtHalfBa + bsmtO) > 0
      };

  return {
    labels: uniqueLabels,
    byCategory,
    byLevel,
    summary: {
      bedroom_count: bedCount,
      bathroom_count: bathCount,
      bathroom_display: bathDisplay || (bathCount ? `${bathCount} Bath(s)` : '—'),
      living_rooms_count: livingCount,
      has_kitchen: hasKitchen,
      has_dining: hasDining,
      has_laundry: aboveUtil.length > 0 || (rawSum.has_laundry ?? false),
      garage: garageName ? normalizeRoomLabelString(garageName) : null,
      total_rooms: totalRooms,
      total_room_labels: uniqueLabels.length,
      basement_rooms: {
        ...basementRooms,
        hasAny: (basementRooms.rr + basementRooms.br + basementRooms.ba + basementRooms.o) > 0
      }
    }
  };
};

/**
 * Dynamically calls backend API to extract sketch GLA, square footages, room labels,
 * and level breakdown directly from a base64 string (PDF or image).
 */
export const extractSketchFromBase64 = async (base64Str) => {
  if (!base64Str || typeof base64Str !== 'string') return null;
  const API_BASE_URL = process.env.REACT_APP_API_URL || (
    typeof window !== 'undefined' && (
      window.location.port === '3000' ||
      window.location.port === '5173'
    )
      ? `http://${window.location.hostname || '127.0.0.1'}:8000`
      : (typeof window !== 'undefined' && window.location.origin ? window.location.origin : '')
  );
  try {
    const res = await fetch(`${API_BASE_URL}/api/extract-sketch-base64/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: base64Str })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (err) {
    return null;
  }
};

const sketchPdfExtractor = {
  ROOM_THEMES,
  DEFAULT_ROOM_THEME,
  LEVEL_PATTERNS,
  CATEGORY_RULES,
  normalizeRoomLabelString,
  classifyRoomLabel,
  getRoomTheme,
  getSketchGLA,
  extractAreasFromSketchText,
  getSketchAreasBreakdown,
  parseSketchRooms,
  extractSketchFromBase64
};

export default sketchPdfExtractor;
