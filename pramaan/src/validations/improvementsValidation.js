import { checkProjectAndPropertyCondition } from './form1073Validation';

export const checkUnits = (field, text) => {
    if (field !== 'Units') return null;
    const value = String(text || '').trim();
    if (!value) {
        return { isError: true, message: "'Units' cannot be blank. If 1 unit, it should be marked '1'." };
    }
    if (value !== '1' && !value.toLowerCase().includes('one')) {
        return { isError: true, message: "For a single unit property, 'Units' must be '1'." };
    }
    return { isMatch: true };
};

export const calculateFinishedBasementArea = (area, finishPct) => {
    const areaNum = typeof area === 'number' ? area : parseFloat(String(area || '').replace(/[^0-9.]/g, ''));
    const pctNum = typeof finishPct === 'number' ? finishPct : parseFloat(String(finishPct || '').replace(/[^0-9.]/g, ''));
    if (isNaN(areaNum) || areaNum <= 0 || isNaN(pctNum) || pctNum <= 0) return 0;
    return Math.round(areaNum * (pctNum / 100));
};

export const getFoundationStatus = (data = {}) => {
    const checkIsYes = (val) => {
        if (!val) return false;
        const s = String(val).trim().toLowerCase();
        return s === 'yes' || s === 'true' || s === '1' || s === 'checked' || s === 'x' || s === '[x]' || s === 'y';
    };

    const getVal = (key) => (
        data[key] ??
        data?.Subject?.[key] ??
        data?.IMPROVEMENTS?.[key] ??
        data?.Improvements?.[key] ??
        data?.FOUNDATION?.[key] ??
        data?.Foundation?.[key] ??
        null
    );

    let hasFullBasement = checkIsYes(getVal('Full Basement'));
    let hasPartialBasement = checkIsYes(getVal('Partial Basement'));
    let hasConcreteSlab = checkIsYes(getVal('Concrete Slab'));
    let hasCrawlSpace = checkIsYes(getVal('Crawl Space'));

    const foundStr = String(
        getVal('Foundation Type') ||
        getVal('Foundation') ||
        ''
    ).toLowerCase();

    if (foundStr) {
        if (foundStr.includes('full basement') || (foundStr.includes('basement') && !foundStr.includes('partial'))) {
            hasFullBasement = true;
        }
        if (foundStr.includes('partial')) {
            hasPartialBasement = true;
        }
        if (foundStr.includes('slab')) {
            hasConcreteSlab = true;
        }
        if (foundStr.includes('crawl')) {
            hasCrawlSpace = true;
        }
    }

    return { hasFullBasement, hasPartialBasement, hasConcreteSlab, hasCrawlSpace };
};

export const checkBasementDetails = (field, text, data = {}) => {
    const basementAreaFields = ['Basement Area sq.ft.', 'Basement Area'];
    const basementFinishFields = ['Basement Finish %', 'Basement Finish'];
    if (!basementAreaFields.includes(field) && !basementFinishFields.includes(field)) return null;

    const currentData = { ...data, [field]: text };
    const { hasFullBasement, hasPartialBasement } = getFoundationStatus(currentData);

    if (hasFullBasement && hasPartialBasement) {
        return { isError: true, field, message: "Only one of 'Full Basement' or 'Partial Basement' can be selected. Both checkmarks are not allowed." };
    }

    const { hasConcreteSlab, hasCrawlSpace } = getFoundationStatus(currentData);

    if (basementAreaFields.includes(field)) {
        const rawStr = String(text ?? '').trim();
        const numStr = rawStr.replace(/[^0-9.]/g, '');
        const area = numStr === '' ? NaN : parseFloat(numStr);

        if (hasFullBasement || hasPartialBasement) {
            if (isNaN(area) || area <= 1) {
                return {
                    isError: true,
                    field,
                    message: `'Basement Area' cannot be 0 and must be greater than 1 when ${hasFullBasement ? 'Full Basement' : 'Partial Basement'} is selected.`
                };
            }
            return {
                isMatch: true,
                field,
                message: `Valid: Basement Area (${area.toLocaleString()} sq.ft.) is greater than 1.`
            };
        } else {
            const isZero = area === 0 || rawStr === '0' || rawStr.toLowerCase() === '0 sq.ft.' || rawStr.toLowerCase() === '0 sq ft';
            if (!isZero) {
                const specificFoundation = (hasConcreteSlab || hasCrawlSpace)
                    ? "when Concrete Slab or Crawl Space is selected"
                    : "when neither Full Basement nor Partial Basement is selected";
                return {
                    isError: true,
                    field,
                    message: `'Basement Area' must be '0' ${specificFoundation}.`
                };
            }
            return {
                isMatch: true,
                field,
                message: "Valid: Basement Area is '0' when no basement is selected."
            };
        }
    }

    if (basementFinishFields.includes(field)) {
        const rawStr = String(text ?? '').trim();
        const numStr = rawStr.replace(/[^0-9.]/g, '');
        const finish = numStr === '' ? NaN : parseFloat(numStr);

        if (hasFullBasement || hasPartialBasement) {
            if (rawStr === '' || isNaN(finish)) {
                return {
                    isError: true,
                    field,
                    message: `'Basement Finish' cannot be blank when ${hasFullBasement ? 'Full Basement' : 'Partial Basement'} is selected (enter 0% if unfinished).`
                };
            }
            if (finish === 0) {
                return {
                    isMatch: true,
                    field,
                    message: "Valid: Basement Finish is 0% (unfinished basement)."
                };
            }
            const areaRaw = String(
                currentData['Basement Area sq.ft.'] ??
                currentData['Basement Area'] ??
                currentData?.Subject?.['Basement Area sq.ft.'] ??
                currentData?.Subject?.['Basement Area'] ??
                currentData?.IMPROVEMENTS?.['Basement Area sq.ft.'] ??
                currentData?.IMPROVEMENTS?.['Basement Area'] ??
                ''
            ).replace(/[^0-9.]/g, '');
            const areaNum = areaRaw ? parseFloat(areaRaw) : NaN;
            const finishedArea = (!isNaN(areaNum) && areaNum > 0) ? Math.round(areaNum * (finish / 100)) : null;

            return {
                isMatch: true,
                field,
                message: finishedArea !== null
                    ? `Valid: Basement Finish is ${finish}% (calculated finished area: ${finishedArea.toLocaleString()} sq.ft. based on ${areaNum.toLocaleString()} sq.ft. basement).`
                    : `Valid: Basement Finish is ${finish}%.`
            };
        } else {
            const isZero = finish === 0 || rawStr === '0' || rawStr === '0%' || rawStr.toLowerCase() === '0 %';
            if (!isZero) {
                return {
                    isError: true,
                    field,
                    message: "'Basement Finish' must be 0% when neither Full Basement nor Partial Basement is selected."
                };
            }
            return {
                isMatch: true,
                field,
                message: "Valid: Basement Finish is 0% when no basement is selected."
            };
        }
    }

    return { isMatch: true };
};

export const checkEvidenceOf = (field, text) => {
    const evidenceFields = ['Infestation', 'Dampness', 'Settlement'];
    if (!evidenceFields.some(f => field.includes(f))) return null;

    const value = String(text || '').trim().toLowerCase();
    if (value.includes('yes') || value.includes('checked')) {
        return { isError: true, message: `Evidence of '${field}' is checked. Please verify with photos and comments.` };
    }
    return { isMatch: true };
};

export const checkMaterialCondition = (field, text) => {
    const fieldsToCheck = [
        'Foundation Walls (Material/Condition)', 'Exterior Walls (Material/Condition)',
        'Roof Surface (Material/Condition)', 'Gutters & Downspouts (Material/Condition)',
        'Window Type (Material/Condition)', 'Floors (Material/Condition)',
        'Walls (Material/Condition)', 'Trim/Finish (Material/Condition)',
        'Bath Floor (Material/Condition)', 'Bath Wainscot (Material/Condition)'
    ];

    if (!fieldsToCheck.includes(field)) return null;

    const value = String(text || '').trim();
    if (!value) {
        return { isError: true, message: `'${field}' cannot be blank.` };
    }

    if (value.toLowerCase().includes('none')) {
        return { isMatch: true };
    }

    if (!value.includes('/') || value.split('/').length < 2 || value.split('/').some(part => !part.trim())) {
        return { isError: true, message: `Both Material and Condition are required for '${field}', separated by '/'.` };
    }
    return { isMatch: true };
};

export const checkHeatingFuel = (field, text) => {
    if (field !== 'Fuel') return null;
    const value = String(text || '').trim().toLowerCase();
    if (!value) return null;
    const validFuels = ['gas', 'oil', 'propane', 'electric', 'elec', 'ele', 'solar', 'wood', 'pellet', 'coal', 'geo', 'geothermal'];
    const parts = value.split(/[/,\s]+/).map(p => p.trim()).filter(Boolean);
    const allValid = parts.length > 0 && parts.every(part => validFuels.includes(part));
    if (!allValid) {
        return { isError: true, message: `Fuel is '${text}'. Expected 'Propane', 'Gas', 'Electric', or 'Oil'. Please verify.` };
    }
    return { isMatch: true };
};

export const getCarStorageStatus = (data = {}) => {
    const checkIsYes = (val) => {
        if (!val) return false;
        const s = String(val).trim().toLowerCase();
        return s === 'yes' || s === 'true' || s === '1' || s === 'checked' || s === 'x' || s === '[x]' || s === 'y';
    };

    const getVal = (...keys) => {
        for (const k of keys) {
            if (data[k] !== undefined && data[k] !== null && String(data[k]).trim() !== '') return String(data[k]).trim();
            if (data.IMPROVEMENTS?.[k] !== undefined && data.IMPROVEMENTS?.[k] !== null && String(data.IMPROVEMENTS[k]).trim() !== '') return String(data.IMPROVEMENTS[k]).trim();
            if (data.Improvements?.[k] !== undefined && data.Improvements?.[k] !== null && String(data.Improvements[k]).trim() !== '') return String(data.Improvements[k]).trim();
            if (data.Subject?.[k] !== undefined && data.Subject?.[k] !== null && String(data.Subject[k]).trim() !== '') return String(data.Subject[k]).trim();
        }
        return '';
    };

    const csRaw = getVal('Car Storage', 'CAR STORAGE', 'Car Storage None', 'Vehicle Storage');
    const csNoneFlag = getVal('Car Storage None', 'Car Storage - None');

    const checkOptionMatches = (valStr, opt) => {
        if (!valStr || !opt) return false;
        const v = String(valStr).trim().toLowerCase();
        const o = String(opt).trim().toLowerCase();
        if (v === o) return true;
        const tokens = v.split(/[,;/]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
        return tokens.some(t => t === o || t.includes(o));
    };

    // Scenario 1: None is marked
    const isNoneChecked = (
        checkOptionMatches(csRaw, 'none') ||
        checkIsYes(csNoneFlag) ||
        checkIsYes(data['Car Storage None']) ||
        checkIsYes(data.IMPROVEMENTS?.['Car Storage None']) ||
        checkIsYes(data.Improvements?.['Car Storage None'])
    );

    const isDrivewayChecked = (
        checkOptionMatches(csRaw, 'driveway') ||
        checkIsYes(data['Driveway']) ||
        checkIsYes(data.IMPROVEMENTS?.['Driveway']) ||
        checkIsYes(data.Improvements?.['Driveway']) ||
        checkIsYes(data['Driveway Checked'])
    );

    const isGarageChecked = (
        checkOptionMatches(csRaw, 'garage') ||
        checkIsYes(data['Garage']) ||
        checkIsYes(data.IMPROVEMENTS?.['Garage']) ||
        checkIsYes(data.Improvements?.['Garage']) ||
        checkIsYes(data['Garage Checked'])
    );

    const isCarportChecked = (
        checkOptionMatches(csRaw, 'carport') ||
        checkIsYes(data['Carport']) ||
        checkIsYes(data.IMPROVEMENTS?.['Carport']) ||
        checkIsYes(data.Improvements?.['Carport']) ||
        checkIsYes(data['Carport Checked'])
    );

    const driveCarsStr = getVal('Driveway # of Cars', 'Driveway Cars', '# of Cars');
    const garageCarsStr = getVal('Garage # of Cars', 'Garage Cars', 'Garage');
    const carportCarsStr = getVal('Carport # of Cars', 'Carport Cars', 'Carport');
    const drivewaySurface = getVal('Driveway Surface', 'Driveway Surface Material');

    const parseNum = (v) => {
        if (v === undefined || v === null || String(v).trim() === '') return NaN;
        const m = String(v).match(/(\d+)/);
        return m ? parseInt(m[1], 10) : NaN;
    };

    const drivewayCars = parseNum(driveCarsStr);
    const garageCars = parseNum(garageCarsStr);
    const carportCars = parseNum(carportCarsStr);

    const attTypeRaw = getVal(
        'Att./Det./Built-in',
        'Garage Att./Det./Built-in',
        'Car Storage Att/Det',
        'Garage Type',
        'ATT./DET./BUILT-IN',
        'Garage Attachment'
    );
    const garAttFlag = getVal('Garage Att.', 'Garage Att');
    const garDetFlag = getVal('Garage Detached', 'Garage Det');
    const garBuiltFlag = getVal('Garage Built-in', 'Garage Built-In', 'Garage Builtin');

    let attachmentType = '';
    const combAtt = `${attTypeRaw} ${garAttFlag} ${garDetFlag} ${garBuiltFlag}`.toLowerCase();
    if (checkIsYes(garDetFlag) || /\b(?:det|detached)\b/i.test(combAtt)) {
        attachmentType = 'Detached';
    } else if (checkIsYes(garBuiltFlag) || /\b(?:built[\s-]?in|builtin)\b/i.test(combAtt)) {
        attachmentType = 'Built-in';
    } else if (checkIsYes(garAttFlag) || /\b(?:att|attached)\b/i.test(combAtt)) {
        attachmentType = 'Attached';
    }

    return {
        isNoneChecked,
        isDrivewayChecked,
        drivewayCars: isNaN(drivewayCars) ? 0 : drivewayCars,
        hasDrivewayCars: !isNaN(drivewayCars) && drivewayCars > 0,
        drivewayCarsRaw: driveCarsStr,
        drivewaySurface,
        isGarageChecked,
        garageCars: isNaN(garageCars) ? 0 : garageCars,
        hasGarageCars: !isNaN(garageCars) && garageCars > 0,
        garageCarsRaw: garageCarsStr,
        isCarportChecked,
        carportCars: isNaN(carportCars) ? 0 : carportCars,
        hasCarportCars: !isNaN(carportCars) && carportCars > 0,
        carportCarsRaw: carportCarsStr,
        attachmentType
    };
};

export const getSketchGarageCarport = (allData = {}) => {
    if (!allData || typeof allData !== 'object') return null;

    const candidates = [];
    const sketches = allData.sketches || allData.clean_data?.sketches || allData.extracted_sketches || (allData.building_sketch ? [allData.building_sketch] : []);
    if (Array.isArray(sketches)) {
        sketches.forEach(sk => {
            if (Array.isArray(sk?.areas)) {
                sk.areas.forEach(a => { if (a?.name) candidates.push(String(a.name)); });
            }
            if (Array.isArray(sk?.room_labels)) {
                sk.room_labels.forEach(lbl => candidates.push(String(lbl)));
            }
            if (sk?.rooms_by_category?.garage_parking) {
                sk.rooms_by_category.garage_parking.forEach(g => { if (g?.label) candidates.push(String(g.label)); });
            }
            if (sk?.room_summary?.garage) {
                candidates.push(String(sk.room_summary.garage));
            }
            if (sk?.raw_text_sample) {
                candidates.push(...sk.raw_text_sample.split('|').map(s => s.trim()));
            }
        });
    }

    if (Array.isArray(allData.areas)) {
        allData.areas.forEach(a => { if (a?.name) candidates.push(String(a.name)); });
    }
    if (Array.isArray(allData.room_labels)) {
        allData.room_labels.forEach(lbl => candidates.push(String(lbl)));
    }

    if (candidates.length === 0) return null;

    let hasGarage = false;
    let garageType = null;
    let garageCars = 0;
    let hasCarport = false;
    let carportType = null;
    let carportCars = 0;
    const detectedLabels = [];

    for (const cand of candidates) {
        const lower = cand.toLowerCase();
        if (lower.includes('garage') || /\b\d+\s*car\s*(?:att|det|detached|attached)\b/i.test(lower)) {
            hasGarage = true;
            detectedLabels.push(cand);
            if (/\b(?:det|detached)\b/i.test(lower)) garageType = 'Detached';
            else if (/\b(?:built[\s-]?in|builtin)\b/i.test(lower)) garageType = 'Built-in';
            else if (/\b(?:att|attached)\b/i.test(lower)) garageType = 'Attached';

            const mCars = cand.match(/(\d+)\s*car/i);
            if (mCars) garageCars = parseInt(mCars[1], 10);
        }
        if (lower.includes('carport')) {
            hasCarport = true;
            detectedLabels.push(cand);
            if (/\b(?:det|detached)\b/i.test(lower)) carportType = 'Detached';
            else if (/\b(?:att|attached)\b/i.test(lower)) carportType = 'Attached';

            const mCars = cand.match(/(\d+)[\s-]*car/i);
            if (mCars) carportCars = parseInt(mCars[1], 10);
        }
    }

    return {
        hasGarage,
        garageType,
        garageCars,
        hasCarport,
        carportType,
        carportCars,
        detectedLabels
    };
};

export const checkCarStorage = (field, text, data = {}) => {
    const carStorageFields = [
        'Car Storage', 'CAR STORAGE',
        'Driveway # of Cars', 'Driveway Cars', '# of Cars',
        'Driveway Surface',
        'Garage # of Cars', 'Garage Cars', 'Garage',
        'Carport # of Cars', 'Carport Cars', 'Carport',
        'Att./Det./Built-in', 'Garage Att./Det./Built-in', 'Car Storage Att/Det', 'Garage Type', 'ATT./DET./BUILT-IN'
    ];
    if (!carStorageFields.includes(field) && !String(field || '').toLowerCase().includes('car storage')) return null;

    const currentData = { ...(data || {}) };
    if (text !== undefined && text !== null) {
        currentData[field] = text;
    }

    const status = getCarStorageStatus(currentData);
    const {
        isNoneChecked,
        isDrivewayChecked,
        drivewayCars,
        hasDrivewayCars,
        drivewaySurface,
        isGarageChecked,
        garageCars,
        hasGarageCars,
        isCarportChecked,
        carportCars,
        hasCarportCars,
        attachmentType
    } = status;

    // SCENARIO 1: if NONE is marked and so all details should be disregarded
    if (isNoneChecked) {
        return {
            isMatch: true,
            field,
            message: "Valid: Car Storage is marked 'None'. All other parking details disregarded."
        };
    }

    // SCENARIO 2: if none is not marked, then at least a driveway, garage or carport should be checked
    if (!isDrivewayChecked && !isGarageChecked && !isCarportChecked) {
        return {
            isError: true,
            field,
            message: "If 'None' is not marked, at least one of 'Driveway', 'Garage', or 'Carport' must be checked."
        };
    }

    // Individual field: Driveway # of Cars
    if (field === 'Driveway # of Cars' || field === 'Driveway Cars') {
        if (isDrivewayChecked) {
            if (!hasDrivewayCars || drivewayCars <= 0) {
                return {
                    isError: true,
                    field,
                    message: "Driveway is checked; '# of Cars' must be greater than 0 (entered 0 or blank is not allowed)."
                };
            }
            return { isMatch: true, field, message: `Valid: Driveway '# of Cars' is ${drivewayCars}.` };
        } else {
            if (hasDrivewayCars && drivewayCars > 0) {
                return {
                    isError: true,
                    field,
                    message: `Driveway '# of Cars' is ${drivewayCars}, but Driveway checkmark is not checked.`
                };
            }
            return { isMatch: true, field, message: "Valid: Driveway is not checked." };
        }
    }

    // Individual field: Driveway Surface
    if (field === 'Driveway Surface') {
        if (isDrivewayChecked) {
            if (!drivewaySurface || drivewaySurface.trim() === '' || drivewaySurface.toLowerCase() === 'none') {
                return {
                    isError: true,
                    field,
                    message: "Driveway is checked; 'Driveway Surface' is mandatory."
                };
            }
            return { isMatch: true, field, message: `Valid: Driveway Surface is '${drivewaySurface}'.` };
        }
        return { isMatch: true, field, message: "Valid: Driveway is not checked." };
    }

    // Individual field: Garage # of Cars
    if (field === 'Garage # of Cars' || field === 'Garage Cars') {
        if (isGarageChecked) {
            if (!hasGarageCars || garageCars <= 0) {
                return {
                    isError: true,
                    field,
                    message: "Garage is checked; '# of Cars' must be greater than 0 (entered 0 or blank is not allowed)."
                };
            }
            return { isMatch: true, field, message: `Valid: Garage '# of Cars' is ${garageCars}.` };
        } else {
            if (hasGarageCars && garageCars > 0) {
                return {
                    isError: true,
                    field,
                    message: `Garage '# of Cars' is ${garageCars}, but Garage checkmark is not checked.`
                };
            }
            return { isMatch: true, field, message: "Valid: Garage is not checked." };
        }
    }

    // Individual field: Carport # of Cars
    if (field === 'Carport # of Cars' || field === 'Carport Cars') {
        if (isCarportChecked) {
            if (!hasCarportCars || carportCars <= 0) {
                return {
                    isError: true,
                    field,
                    message: "Carport is checked; '# of Cars' must be greater than 0 (entered 0 or blank is not allowed)."
                };
            }
            return { isMatch: true, field, message: `Valid: Carport '# of Cars' is ${carportCars}.` };
        } else {
            if (hasCarportCars && carportCars > 0) {
                return {
                    isError: true,
                    field,
                    message: `Carport '# of Cars' is ${carportCars}, but Carport checkmark is not checked.`
                };
            }
            return { isMatch: true, field, message: "Valid: Carport is not checked." };
        }
    }

    // Individual field: Att./Det./Built-in
    if (field.includes('Att') || field.includes('Type') || field === 'ATT./DET./BUILT-IN') {
        if (isGarageChecked || isCarportChecked) {
            if (!attachmentType) {
                return {
                    isError: true,
                    field,
                    message: `${isGarageChecked ? 'Garage' : 'Carport'} is checked; Attachment type ('Attached', 'Detached', or 'Built-in') is mandatory.`
                };
            }

            // Sketch consistency check
            const sketchInfo = getSketchGarageCarport(currentData);
            if (sketchInfo && sketchInfo.detectedLabels.length > 0) {
                if (isGarageChecked && sketchInfo.hasGarage && sketchInfo.garageType) {
                    if (attachmentType.toLowerCase() !== sketchInfo.garageType.toLowerCase()) {
                        return {
                            isError: true,
                            field,
                            message: `Improvements indicates '${attachmentType}' Garage; however, building sketch depicts '${sketchInfo.garageType}' Garage (${sketchInfo.detectedLabels.join(', ')}). Please reconcile.`
                        };
                    }
                }
                if (isCarportChecked && sketchInfo.hasCarport && sketchInfo.carportType) {
                    if (attachmentType.toLowerCase() !== sketchInfo.carportType.toLowerCase()) {
                        return {
                            isError: true,
                            field,
                            message: `Improvements indicates '${attachmentType}' Carport; however, building sketch depicts '${sketchInfo.carportType}' Carport (${sketchInfo.detectedLabels.join(', ')}). Please reconcile.`
                        };
                    }
                }
            }

            return { isMatch: true, field, message: `Valid: Attachment type is '${attachmentType}'.` };
        }
        return { isMatch: true, field, message: "Valid: No garage or carport checked." };
    }

    // Section field: Car Storage (comprehensive check)
    if (isDrivewayChecked) {
        if (!hasDrivewayCars || drivewayCars <= 0) {
            return {
                isError: true,
                field,
                message: "Driveway is checked; '# of Cars' must be greater than 0 (entered 0 or blank is not allowed)."
            };
        }
        if (!drivewaySurface || drivewaySurface.trim() === '' || drivewaySurface.toLowerCase() === 'none') {
            return {
                isError: true,
                field,
                message: "Driveway is checked; 'Driveway Surface' is mandatory."
            };
        }
    }

    if (isGarageChecked) {
        if (!hasGarageCars || garageCars <= 0) {
            return {
                isError: true,
                field,
                message: "Garage is checked; '# of Cars' must be greater than 0 (entered 0 or blank is not allowed)."
            };
        }
        if (!attachmentType) {
            return {
                isError: true,
                field,
                message: "Garage is checked; Attachment type ('Attached', 'Detached', or 'Built-in') is mandatory."
            };
        }
    }

    if (isCarportChecked) {
        if (!hasCarportCars || carportCars <= 0) {
            return {
                isError: true,
                field,
                message: "Carport is checked; '# of Cars' must be greater than 0 (entered 0 or blank is not allowed)."
            };
        }
        if (!attachmentType) {
            return {
                isError: true,
                field,
                message: "Carport is checked; Attachment type ('Attached', 'Detached', or 'Built-in') is mandatory."
            };
        }
    }

    // Sketch check
    const sketchInfo = getSketchGarageCarport(currentData);
    if (sketchInfo && sketchInfo.detectedLabels.length > 0) {
        if (isGarageChecked && sketchInfo.hasGarage && sketchInfo.garageType) {
            if (attachmentType && attachmentType.toLowerCase() !== sketchInfo.garageType.toLowerCase()) {
                return {
                    isError: true,
                    field,
                    message: `Improvements indicates '${attachmentType}' Garage; however, building sketch depicts '${sketchInfo.garageType}' Garage (${sketchInfo.detectedLabels.join(', ')}). Please reconcile.`
                };
            }
        }
        if (isCarportChecked && sketchInfo.hasCarport && sketchInfo.carportType) {
            if (attachmentType && attachmentType.toLowerCase() !== sketchInfo.carportType.toLowerCase()) {
                return {
                    isError: true,
                    field,
                    message: `Improvements indicates '${attachmentType}' Carport; however, building sketch depicts '${sketchInfo.carportType}' Carport (${sketchInfo.detectedLabels.join(', ')}). Please reconcile.`
                };
            }
        }
    }

    const summaryParts = [];
    if (isGarageChecked) summaryParts.push(`${garageCars} Car ${attachmentType || ''} Garage`.replace(/\s+/g, ' ').trim());
    if (isCarportChecked) summaryParts.push(`${carportCars} Car ${attachmentType || ''} Carport`.replace(/\s+/g, ' ').trim());
    if (isDrivewayChecked) summaryParts.push(`${drivewayCars} Car Driveway (${drivewaySurface || 'Surface specified'})`);

    const sketchVerifiedText = (sketchInfo && ((isGarageChecked && sketchInfo.hasGarage) || (isCarportChecked && sketchInfo.hasCarport)))
        ? ' (verified on sketch)'
        : '';

    return {
        isMatch: true,
        field,
        message: `Valid: Car Storage (${summaryParts.join(', ')})${sketchVerifiedText}.`
    };
};

export const checkAccessoryUnit = (field, data) => {
    if (field !== 'Units') return null;
    const unitValue = String(data['Units'] || '').trim().toLowerCase();
    if (unitValue.includes('one with accessory unit')) {
        const additionalFeatures = String(data['Additional features'] || '').toLowerCase();
        if (!additionalFeatures.includes('adu') && !additionalFeatures.includes('accessory dwelling unit')) {
            return { isError: true, message: "If 'One with Accessory Unit' is indicated, details about the ADU should be in 'Additional features', grid, photos, and sketches." };
        }
    }
    return { isMatch: true };
};

export const checkNumberOfStories = (field, text) => {
    if (field !== '# of Stories') return null;
    const value = String(text || '').trim();
    if (!value || value === '0') {
        return { isError: true, message: "'# of Stories' cannot be blank or 0." };
    }
    return { isMatch: true };
};

export const checkPropertyType = (field, text) => {
    if (field !== 'Type') return null;
    if (!String(text || '').trim()) {
        return { isError: true, message: "A 'Type' (e.g., Detached, Attached) must be selected." };
    }
    return { isMatch: true };
};

export const checkConstructionStatusAndReconciliation = (
    field,
    text,
    data
) => {
    const fLower = String(field || '').trim().toLowerCase();
    const isStatusField =
        fLower === 'existing/proposed/under const.' ||
        fLower === 'status' ||
        fLower === 'construction status' ||
        fLower.includes('existing/proposed');

    if (!isStatusField) return null;

    const normalize = (val) =>
        String(val || '')
            .toLowerCase()
            .replace(/[^a-z]/g, '');

    const statusRaw = normalize(text);

    const reconciliationField =
        'This appraisal is made "as is", subject to completion per plans and specifications on the basis of a hypothetical condition that the improvements have been completed, subject to the following repairs or alterations on the basis of a hypothetical condition that the repairs or alterations have been completed, or subject to the following required inspection based on the extraordinary assumption that the condition or deficiency does not require alteration or repair:';

    const rawReconciliation =
        data?.[reconciliationField] ||
        data?.RECONCILIATION?.[reconciliationField] ||
        data?.Reconciliation?.[reconciliationField] ||
        data?.['Reconciliation Status'] ||
        data?.RECONCILIATION?.['Reconciliation Status'] ||
        data?.Reconciliation?.['Reconciliation Status'] ||
        '';

    const reconciliationRaw = normalize(rawReconciliation);

    let status = null;

    if (statusRaw.startsWith('existing')) status = 'existing';
    else if (statusRaw.startsWith('proposed')) status = 'proposed';
    else if (statusRaw.includes('under') && statusRaw.includes('const'))
        status = 'under const.';

    if (!status) {
        return {
            isError: true,
            message:
                "Construction status must be 'Existing', 'Proposed', or 'Under Const.'."
        };
    }

    const hasAsIs = reconciliationRaw.includes('asis');
    const hasSubjectTo = reconciliationRaw.includes('subject');

    if (status === 'existing' && !hasAsIs) {
        return {
            isError: true,
            message:
                "If construction status is 'Existing', reconciliation must be 'As Is'."
        };
    }

    if (
        (status === 'proposed' || status === 'under const.') &&
        !hasSubjectTo
    ) {
        return {
            isError: true,
            message:
                "If construction status is 'Proposed' or 'Under Const.', reconciliation must be 'Subject To'."
        };
    }

    return { isMatch: true };
};

export const checkDesignStyle = (field, text, allData, fieldPath, saleName) => {
    if (field !== 'Design (Style)') return null;
    if (saleName && saleName !== 'Subject') {
        const comp = allData?.[saleName];
        if (!comp || (!comp.Address && !comp['Sale Price'])) return null;
    }
    if (!String(text || '').trim()) {
        return { isError: true, message: "'Design (Style)' cannot be blank." };
    }
    return { isMatch: true };
};

/**
 * Extracts architectural style from a UAD-formatted Design (Style) string.
 * Example: 'DT1;R Ranch'   -> { prefix: 'DT1', style: 'R Ranch' }
 * Example: 'DT1.5;Colonial' -> { prefix: 'DT1.5', style: 'Colonial' }
 * Example: 'R Ranch'       -> { prefix: '', style: 'R Ranch' }
 */
export const parseDesignStyle = (rawVal) => {
    const str = String(rawVal || '').trim();
    if (!str) return { prefix: '', style: '' };

    if (str.includes(';')) {
        const parts = str.split(';');
        return {
            prefix: parts[0].trim(),
            style: parts.slice(1).join(';').trim()
        };
    }
    return { prefix: '', style: str };
};

const normalizeDesignForCompare = (val) =>
    String(val || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

/**
 * Validates consistency between:
 * 1) IMPROVEMENTS -> Design (Style) (e.g., 'R Ranch')
 * 2) SALES COMPARISON APPROACH -> Subject -> Design (Style) (e.g., 'DT1;R Ranch')
 */
export const checkSubjectDesignStyleConsistency = (field, text, allData, fieldPath, saleName) => {
    if (field !== 'Design (Style)') return null;
    // Only validate the Subject property (comparable sales use checkDesignStyleAdjustment)
    if (saleName && saleName !== 'Subject') return null;
    if (!allData) return null;

    // 1. Retrieve Improvements Design (Style)
    const isImprovementsField = fieldPath && (fieldPath[0] === 'IMPROVEMENTS' || fieldPath[0] === 'Improvements');
    const impRaw = isImprovementsField && text !== undefined && text !== null
        ? String(typeof text === 'object' ? (text.value ?? '') : text).trim()
        : String(
            allData.IMPROVEMENTS?.['Design (Style)'] ||
            allData.Improvements?.['Design (Style)'] ||
            allData.clean_data?.IMPROVEMENTS?.['Design (Style)'] ||
            allData.clean_data?.Improvements?.['Design (Style)'] ||
            allData['Design (Style)'] ||
            ''
        ).trim();

    // 2. Retrieve Sales Comparison Grid (Subject) Design (Style)
    const isGridSubjectField = saleName === 'Subject' || (fieldPath && fieldPath[0] === 'Subject');
    const gridRaw = isGridSubjectField && text !== undefined && text !== null
        ? String(typeof text === 'object' ? (text.value ?? '') : text).trim()
        : String(
            allData.SALES_GRID?.Subject?.['Design (Style)'] ||
            allData['Sales Grid']?.Subject?.['Design (Style)'] ||
            allData.SALES_GRID?.SUBJECT?.['Design (Style)'] ||
            allData['Sales Grid']?.SUBJECT?.['Design (Style)'] ||
            allData.Subject?.['Design (Style)'] ||
            allData.clean_data?.Subject?.['Design (Style)'] ||
            allData.comparisonData?.Subject?.['Design (Style)'] ||
            ''
        ).trim();

    // If either value is blank, allow the blank check validators to handle it
    if (!impRaw || !gridRaw) return null;

    // 3. Extract architectural styles (stripping UAD prefix like 'DT1;')
    const impParsed = parseDesignStyle(impRaw);
    const gridParsed = parseDesignStyle(gridRaw);

    const impStyleNorm = normalizeDesignForCompare(impParsed.style);
    const gridStyleNorm = normalizeDesignForCompare(gridParsed.style);

    if (!impStyleNorm || !gridStyleNorm) return null;

    // 4. Compare styles
    const isExactMatch = impStyleNorm === gridStyleNorm;
    const isSubstringMatch = impStyleNorm.includes(gridStyleNorm) || gridStyleNorm.includes(impStyleNorm);

    // Common architectural style abbreviations / synonyms
    const isAbbrMatch = (
        (impStyleNorm.includes('rranch') && gridStyleNorm.includes('raisedranch')) ||
        (gridStyleNorm.includes('rranch') && impStyleNorm.includes('raisedranch')) ||
        (impStyleNorm.includes('splitlvl') && gridStyleNorm.includes('splitlevel')) ||
        (gridStyleNorm.includes('splitlvl') && impStyleNorm.includes('splitlevel')) ||
        (impStyleNorm.includes('contemp') && gridStyleNorm.includes('contemporary')) ||
        (gridStyleNorm.includes('contemp') && impStyleNorm.includes('contemporary')) ||
        (impStyleNorm.includes('trad') && gridStyleNorm.includes('traditional')) ||
        (gridStyleNorm.includes('trad') && impStyleNorm.includes('traditional')) ||
        (impStyleNorm.includes('col') && gridStyleNorm.includes('colonial')) ||
        (gridStyleNorm.includes('col') && impStyleNorm.includes('colonial'))
    );

    if (!isExactMatch && !isSubstringMatch && !isAbbrMatch) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Design (Style) mismatch: Improvements section indicates '${impRaw}', but Sales Comparison Grid (Subject) indicates '${gridRaw}'. Please reconcile and revise.`
        };
    }

    // In Form Type 1004 + 1007, also cross-check with Rental Grid Subject 'Design and Appeal'
    const formTypeStr = String(allData?.formType || allData?.selectedFormType || allData?.['Form Type'] || allData?.['From Type'] || '').toLowerCase();
    if (formTypeStr.includes('1007')) {
        const rentRaw = String(
            allData['Single Family Rent Schedule']?.['Design and Appeal'] ||
            allData['Subject Rent Schedule']?.['Design and Appeal'] ||
            allData.Subject?.['Design and Appeal'] ||
            allData.clean_data?.['Single Family Rent Schedule']?.['Design and Appeal'] ||
            allData.clean_data?.['Subject Rent Schedule']?.['Design and Appeal'] ||
            allData.clean_data?.Subject?.['Design and Appeal'] ||
            ''
        ).trim();

        if (rentRaw) {
            const rentParsed = parseDesignStyle(rentRaw);
            const rentStyleNorm = normalizeDesignForCompare(rentParsed.style);
            if (rentStyleNorm && impStyleNorm) {
                const rentMatch = impStyleNorm === rentStyleNorm ||
                    impStyleNorm.includes(rentStyleNorm) || rentStyleNorm.includes(impStyleNorm) ||
                    ((impStyleNorm.includes('rranch') && rentStyleNorm.includes('raisedranch')) || (rentStyleNorm.includes('rranch') && impStyleNorm.includes('raisedranch'))) ||
                    ((impStyleNorm.includes('splitlvl') && rentStyleNorm.includes('splitlevel')) || (rentStyleNorm.includes('splitlvl') && impStyleNorm.includes('splitlevel')));

                if (!rentMatch) {
                    return {
                        isError: true,
                        skipBlankFilter: true,
                        message: `Design mismatch: Improvements section indicates '${impRaw}', but Rental Grid (Subject) indicates '${rentRaw}'. Please reconcile and revise.`
                    };
                }
            }
        }
    }

    return { isMatch: true, message: "validated" };
};

export const checkYearBuilt = (field, text) => {
    if (field !== 'Year Built') return null;
    if (!String(text || '').trim()) {
        return { isError: true, message: "'Year Built' cannot be blank." };
    }
    return { isMatch: true };
};

export const checkEffectiveAge = (field, text) => {
    if (field !== 'Effective Age (Yrs)') return null;
    if (!String(text || '').trim()) {
        return { isError: true, message: "'Effective Age (Yrs)' cannot be blank." };
    }
    return { isMatch: true };
};

export const checkAdditionalFeatures = (field, text) => {
    if (field !== 'Additional features') return null;
    if (!String(text || '').trim()) {
        return { isError: true, message: "'Additional features' should not be blank. If none, state 'None'." };
    }
    return { isMatch: true };
};

export const checkPropertyConditionDescription = (field, text, allData) => {
    return checkProjectAndPropertyCondition(field, text, allData);
};

export const checkPhysicalDeficienciesImprovements = (field, text) => {
    const fieldName = "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe";
    if (field !== fieldName) return null;

    const value = String(text || '').trim().toLowerCase();
    if (!value) {
        return { isError: true, message: `'${fieldName}' cannot be blank.` };
    }
    if (value.startsWith('yes') && value.length < 10) {
        return { isError: true, message: "If 'Yes', a description is required." };
    }
    return { isMatch: true };
};

export const checkNeighborhoodConformity = (field, text) => {
    const fieldName = "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)? If No, describe";
    if (field !== fieldName) return null;
    const value = String(text || '').trim().toLowerCase();
    if (!value) {
        return { isError: true, message: `'${fieldName}' cannot be blank.` };
    }
    if (value.startsWith('no') && value.length < 5) {
        return { isError: true, message: "If 'No', a description is required." };
    }
    return { isMatch: true };
};

export const checkFoundationType = (field, text, data = {}) => {
    const targetFields = ['Foundation Type', 'Foundation', 'Full Basement', 'Partial Basement', 'Concrete Slab', 'Crawl Space'];
    if (!targetFields.includes(field)) return null;

    const value = String(text ?? '').trim();
    if ((field === 'Foundation Type' || field === 'Foundation') && !value) {
        return { isError: true, field, message: "'Foundation Type' cannot be blank." };
    }

    const currentData = { ...data, [field]: value };
    const { hasFullBasement, hasPartialBasement, hasConcreteSlab, hasCrawlSpace } = getFoundationStatus(currentData);

    if (hasFullBasement && hasPartialBasement) {
        return { isError: true, field, message: "Only one of 'Full Basement' or 'Partial Basement' can be selected. Both checkmarks are not allowed." };
    }

    const areaRaw = String(
        currentData['Basement Area sq.ft.'] ??
        currentData['Basement Area'] ??
        currentData?.Subject?.['Basement Area sq.ft.'] ??
        currentData?.Subject?.['Basement Area'] ??
        currentData?.IMPROVEMENTS?.['Basement Area sq.ft.'] ??
        currentData?.IMPROVEMENTS?.['Basement Area'] ??
        currentData?.Improvements?.['Basement Area sq.ft.'] ??
        currentData?.Improvements?.['Basement Area'] ??
        ''
    ).trim();
    const numStr = areaRaw.replace(/[^0-9.]/g, '');
    const area = numStr === '' ? NaN : parseFloat(numStr);

    const finishRaw = String(
        currentData['Basement Finish %'] ??
        currentData['Basement Finish'] ??
        currentData?.Subject?.['Basement Finish %'] ??
        currentData?.Subject?.['Basement Finish'] ??
        currentData?.IMPROVEMENTS?.['Basement Finish %'] ??
        currentData?.IMPROVEMENTS?.['Basement Finish'] ??
        currentData?.Improvements?.['Basement Finish %'] ??
        currentData?.Improvements?.['Basement Finish'] ??
        ''
    ).trim();
    const finishNumStr = finishRaw.replace(/[^0-9.]/g, '');
    const finish = finishNumStr === '' ? NaN : parseFloat(finishNumStr);

    if (hasFullBasement || hasPartialBasement) {
        if (isNaN(area) || area <= 1) {
            return {
                isError: true,
                field,
                message: `'Basement Area' cannot be 0 and must be greater than 1 when ${hasFullBasement ? 'Full Basement' : 'Partial Basement'} is selected.`
            };
        }
        if (finishRaw !== '' && isNaN(finish)) {
            return {
                isError: true,
                field,
                message: "'Basement Finish' must be a valid percentage."
            };
        }
        return {
            isMatch: true,
            field,
            message: `Valid: ${hasFullBasement ? 'Full Basement' : 'Partial Basement'} selected.`
        };
    } else {
        if (!isNaN(area) && area !== 0) {
            const specificFoundation = (hasConcreteSlab || hasCrawlSpace)
                ? "when Concrete Slab or Crawl Space is selected"
                : "when neither Full Basement nor Partial Basement is selected";
            return {
                isError: true,
                field,
                message: `'Basement Area' must be '0' ${specificFoundation}.`
            };
        }
        if (!isNaN(finish) && finish !== 0) {
            const specificFoundation = (hasConcreteSlab || hasCrawlSpace)
                ? "when Concrete Slab or Crawl Space is selected"
                : "when neither Full Basement nor Partial Basement is selected";
            return {
                isError: true,
                field,
                message: `'Basement Finish' must be 0% ${specificFoundation}.`
            };
        }
        return {
            isMatch: true,
            field,
            message: `Valid: Foundation (${hasConcreteSlab ? 'Concrete Slab' : hasCrawlSpace ? 'Crawl Space' : 'None'}) with 0 basement area and 0% finish.`
        };
    }
};

export const checkImprovementsFieldsNotBlank = (field, text) => {
    const fieldsToCheck = [
        'Attic',
        'Heating Type',
        'Fuel',
        'Cooling Type',
        'Fireplace(s) #',
        'Patio/Deck',
        'Pool',
        'Woodstove(s) #',
        'Fence',
        'Porch',
        'Other Amenities',
        'Car Storage',
        'Driveway # of Cars',
        'Driveway Surface',
        'Garage # of Cars',
        'Carport # of Cars',
        'Appliances',
        'Finished area above grade Rooms',
        'Finished area above grade Bedrooms',
        'Finished area above grade Bath(s)',
        'Square Feet of Gross Living Area Above Grade',
        'Amenity Category',
        'Subject Property Amenity',
        'Amenity Material',
        'Amenity Detail',
        'Apparent Defects, Damages, Deficiencies (Subject Property Amenities)',
        'Subject Property Amenities Exhibits',
        'Overall Quality',
        'Exterior Quality',
        'Interior Quality',
        'Overall Condition',
        'Exterior Condition',
        'Interior Condition',
        'Reconciliation of Overall Quality and Condition'
    ];

    if (fieldsToCheck.includes(field) && !String(text || '').trim()) {
        return { isError: true, message: `'${field}' should not be blank.` };
    }
    return null;
};

export {
    checkPredominantPriceVsIndicatedValue,
    getPredominantPriceValue,
    getIndicatedSalesComparisonValue,
    getImprovementsComments
} from './neighborhoodValidation';
