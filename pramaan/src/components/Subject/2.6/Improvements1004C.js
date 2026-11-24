import React from 'react';
import {
  Paper, Box, Typography, Tooltip, IconButton, LinearProgress
} from '@mui/material';
import HomeRepairServiceIcon from '@mui/icons-material/HomeRepairService';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { PlaylistAdd as PlaylistAddIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { EditableField } from '../components/EditableField';
import { checkUnits, checkManufacturedHomeConditionalField } from '../../../validations/improvementsValidation';

export const Improvements1004C = ({
  id = 'improvements-section',
  title = 'Improvements Section',
  data = {},
  allData = {},
  onDataChange,
  editingField,
  setEditingField,
  isEditable = true,
  loading = false,
  loadingSection = '',
  manualValidations,
  handleManualValidation,
  onRevisionButtonClick,
  revisionHandlers,
}) => {
  const getImpValue = (keys) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const k of keyList) {
      const candidates = [
        data?.[k],
        data?.IMPROVEMENTS?.[k],
        data?.Improvements?.[k],
        data?.['Manufactured Home']?.[k],
        data?.MANUFACTURED_HOME?.[k],
        allData?.clean_data?.Improvements?.[k],
        allData?.clean_data?.['Manufactured Home']?.[k],
        allData?.IMPROVEMENTS?.[k],
        allData?.Improvements?.[k],
        allData?.['Manufactured Home']?.[k],
        allData?.MANUFACTURED_HOME?.[k],
        allData?.[k],
      ];
      for (const val of candidates) {
        if (val !== undefined && val !== null && val !== '') {
          const extracted = typeof val === 'object' && val !== null ? (val.value ?? val.choice ?? '') : val;
          if (extracted !== undefined && extracted !== null && extracted !== '') {
            return { value: extracted, actualKey: k };
          }
        }
      }
    }
    return { value: '', actualKey: keyList[0] };
  };

  const renderValue = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return val.value ?? val.choice ?? JSON.stringify(val);
    return String(val);
  };

  const getFieldPath = (actualKey) => ['IMPROVEMENTS', actualKey];

  const handleFieldChange = (actualKey, value) => {
    if (!onDataChange) return;
    const keysToUpdate = [actualKey];
    if (actualKey === '# of Units' || actualKey === 'Units' || actualKey === 'Number of Units') {
      keysToUpdate.push('# of Units', 'Units', 'Number of Units');
    }
    const uniqueKeys = [...new Set(keysToUpdate)];
    for (const k of uniqueKeys) {
      onDataChange(['IMPROVEMENTS', k], value);
      onDataChange(['Improvements', k], value);
      onDataChange(['Manufactured Home', k], value);
      onDataChange([k], value);
    }
  };

  const checkOptionMatches = (valStr, opt) => {
    if (!valStr || !opt) return false;
    const v = String(valStr).trim().toLowerCase();
    const optLower = opt.trim().toLowerCase();
    const o = optLower.replace(/\./g, '');

    if (opt === 'One') return v === 'one' || v === '1' || (/\b(one|1)\b/i.test(v) && !v.includes('addition') && !v.includes('accessory'));
    if (opt === 'Additions') return v.includes('addition');
    if (opt === '1') return v === '1' || v === 'one';
    if (opt === '2') return v === '2' || v === 'two';
    if (opt === '3') return v === '3' || v === 'three';
    if (opt === 'Other') return v.includes('other');
    if (v === optLower || v === o) return true;

    const tokens = v.split(/[,;/]+/).map(t => t.trim()).filter(Boolean);
    for (const token of tokens) {
      const t = token.toLowerCase();
      const tClean = t.replace(/\./g, '').trim();
      if (t === optLower || tClean === o) return true;
      if (o === 'det' && (tClean === 'detached' || tClean === 'det')) return true;
      if (o === 'att' && (tClean === 'attached' || tClean === 'att')) return true;
      if (o.includes('s-det') && (tClean.includes('semi') || tClean.includes('s-det') || tClean.includes('end unit'))) return true;
      if (o === 'existing' && tClean === 'existing') return true;
      if (o === 'proposed' && tClean === 'proposed') return true;
      if (o.includes('under') && tClean.includes('under')) return true;
      if (o.includes('poured') && (tClean.includes('poured') || tClean.includes('pouredconcrete'))) return true;
      if (o.includes('runners') && (tClean.includes('runner') || tClean.includes('runners') || tClean.includes('concreterunner'))) return true;
      if (o.includes('block') && (tClean.includes('block') || tClean.includes('pier') || tClean.includes('blockpier') || tClean.includes('blockandpier'))) return true;
      if (o.includes('other') && tClean.includes('other')) return true;
      if (o.includes('full') && (tClean.includes('full') || tClean === 'full basement')) return true;
      if (o.includes('partial') && (tClean.includes('partial') || tClean === 'partial basement')) return true;
      if (o.includes('outside') && (tClean.includes('outside') || tClean.includes('entry'))) return true;
      if (o.includes('sump') && (tClean.includes('sump') || tClean.includes('pump'))) return true;
      if (o === 'none' && tClean === 'none') return true;
      if (o.includes('refrigerator') && tClean.includes('refrigerator')) return true;
      if (o.includes('range') && (tClean.includes('range') || tClean.includes('oven'))) return true;
      if (o.includes('dishwasher') && tClean.includes('dishwasher')) return true;
      if (o.includes('disposal') && tClean.includes('disposal')) return true;
      if (o.includes('microwave') && tClean.includes('microwave')) return true;
      if (o.includes('washer') && (tClean.includes('washer') || tClean.includes('dryer'))) return true;
      if (o.includes('fwa') && tClean === 'fwa') return true;
      if (o.includes('hwbb') && tClean === 'hwbb') return true;
      if (o.includes('radiant') && tClean === 'radiant') return true;
      if (o.includes('central') && (tClean.includes('central') || tClean.includes('central air'))) return true;
      if (o.includes('driveway') && tClean.includes('driveway')) return true;
      if (o.includes('garage') && tClean.includes('garage')) return true;
      if (o.includes('carport') && tClean.includes('carport')) return true;
      if (o.includes('good') && tClean.includes('good')) return true;
      if (o.includes('average') && tClean.includes('average')) return true;
      if (o.includes('fair') && tClean.includes('fair')) return true;
      if (o.includes('poor') && tClean.includes('poor')) return true;
      if (o.includes('excellent') && tClean.includes('excellent')) return true;
    }
    return false;
  };

  const renderImpField = (label, keys, options = [], showTextInput = true) => {
    const { value: rawVal, actualKey } = getImpValue(keys);
    const valStr = renderValue(rawVal);
    const targetPath = getFieldPath(actualKey);

    const isUnitsField = label === '# of Units' || keys.includes('# of Units') || keys.includes('Units');
    const isManuallyValidated = Boolean(manualValidations && manualValidations[JSON.stringify(targetPath)]);
    let validationResult = null;
    if (isUnitsField) {
      validationResult = checkUnits(actualKey, valStr, allData);
    }

    let statusStyle = {};
    let statusTooltip = '';
    if (isManuallyValidated) {
      statusStyle = { backgroundColor: '#87ceeb', borderRadius: '4px', padding: '1px 3px' };
      statusTooltip = 'Manually validated.';
    } else if (validationResult?.isError) {
      statusStyle = {
        backgroundColor: '#ffebee',
        border: '1px solid #d32f2f',
        borderRadius: '4px',
        padding: '2px 4px'
      };
      statusTooltip = validationResult.message;
    } else if (validationResult?.isMatch) {
      statusStyle = {
        backgroundColor: '#91ff00ff',
        borderRadius: '4px',
        padding: '1px 3px'
      };
      statusTooltip = validationResult.message || 'Validation successful!';
    }

    return (
      <div style={{ borderBottom: '1px solid #e9ecef', paddingBottom: '3px', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
          <div
            onClick={() => setEditingField && setEditingField(targetPath)}
            style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', cursor: 'pointer', userSelect: 'none' }}
          >
            {label}
          </div>
          {!showTextInput && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Tooltip title="Revision Language">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    const text = valStr
                      ? `Please review and revise '${label}' (Current Value: "${valStr}") in the Improvements section.`
                      : `Please provide '${label}' in the Improvements section.`;
                    if (navigator.clipboard) navigator.clipboard.writeText(text);
                    if (window.dispatchEvent) {
                      window.dispatchEvent(new CustomEvent('showNotification', { detail: `'${label}' revision text copied to clipboard!` }));
                    }
                  }}
                  size="small"
                  sx={{ padding: '2px' }}
                >
                  <PlaylistAddIcon sx={{ fontSize: '0.85rem' }} />
                </IconButton>
              </Tooltip>
              {handleManualValidation && (
                <Tooltip title={isManuallyValidated ? "Remove Manual Validation" : "Mark as Validated"}>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleManualValidation(targetPath);
                    }}
                    size="small"
                    sx={{
                      opacity: isManuallyValidated ? 1 : 0.6,
                      transition: 'opacity 0.2s ease-in-out',
                      '&:hover': { opacity: 1 },
                      padding: '2px',
                      color: isManuallyValidated ? 'green' : 'inherit'
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: '0.85rem' }} />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          )}
        </div>

        {options.length > 0 && (
          <Tooltip title={statusTooltip} placement="top" arrow disableHoverListener={!statusTooltip}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 8px', marginBottom: '2px', ...statusStyle }}>
              {options.map((opt) => {
                const isChecked = checkOptionMatches(valStr, opt);
                const handleToggle = () => {
                  let items = valStr ? valStr.split(',').map(s => s.trim()).filter(Boolean) : [];
                  if (isChecked) {
                    items = items.filter(item => !checkOptionMatches(item, opt));
                  } else {
                    items.push(opt);
                  }
                  const newVal = items.join(', ');
                  handleFieldChange(actualKey, newVal);
                };

                return (
                  <label key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '0.69rem', userSelect: 'none', margin: 0, fontWeight: isChecked ? 600 : 'normal' }}>
                    <input type="checkbox" checked={isChecked} onChange={handleToggle} style={{ margin: 0, width: '12px', height: '12px' }} />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          </Tooltip>
        )}

        {!showTextInput && validationResult?.isError && (
          <div style={{ color: '#d32f2f', fontSize: '0.65rem', marginTop: '2px', fontWeight: 500 }}>
            {validationResult.message}
          </div>
        )}

        {showTextInput && (
          <EditableField
            fieldPath={targetPath}
            value={valStr}
            onDataChange={(path, val) => handleFieldChange(actualKey, val)}
            editingField={editingField}
            setEditingField={setEditingField}
            isEditable={isEditable}
            allData={allData}
            manualValidations={manualValidations}
            handleManualValidation={handleManualValidation}
            revisionHandlers={revisionHandlers}
            inputClassName="form-control form-control-sm field-value"
            inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.75rem', height: 'auto' }}
          />
        )}
      </div>
    );
  };

  const renderYesNoQuestionRow = (questionLabel, questionKeys, explainLabel, explainKeys) => {
    const { value: qVal, actualKey: qKey } = getImpValue(questionKeys);
    const { value: expVal, actualKey: expKey } = getImpValue(explainKeys);
    const qStr = renderValue(qVal);
    const expStr = renderValue(expVal);

    const isYes = qStr.toLowerCase().startsWith('y') || qStr.toLowerCase() === 'true';
    const isNo = qStr.toLowerCase().startsWith('n') || qStr.toLowerCase() === 'false';
    const isMissingExplain = isNo && !expStr.trim();

    const handleYesToggle = () => {
      handleFieldChange(qKey, isYes ? '' : 'Yes');
    };
    const handleNoToggle = () => {
      handleFieldChange(qKey, isNo ? '' : 'No');
    };

    return (
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 8px',
        borderBottom: '1px solid #dee2e6',
        backgroundColor: '#fff',
        gap: '6px',
        fontSize: '0.75rem'
      }}>
        <div style={{ flex: '1 1 45%', fontWeight: '600', color: '#212529', lineHeight: 1.3 }}>
          {questionLabel}
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', minWidth: '120px' }}>
          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            margin: 0,
            fontWeight: isYes ? '700' : 'normal',
            color: isYes ? '#2e7d32' : 'inherit'
          }}>
            <input type="checkbox" checked={isYes} onChange={handleYesToggle} style={{ margin: 0, width: '13px', height: '13px' }} />
            <span>Yes</span>
          </label>
          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            margin: 0,
            fontWeight: isNo ? '700' : 'normal',
            color: isNo ? (isMissingExplain ? '#d32f2f' : '#2e7d32') : 'inherit'
          }}>
            <input type="checkbox" checked={isNo} onChange={handleNoToggle} style={{ margin: 0, width: '13px', height: '13px' }} />
            <span>No</span>
          </label>
        </div>

        <div style={{ flex: '1 1 35%', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          {explainLabel && (
            <span style={{
              fontSize: '0.72rem',
              color: isMissingExplain ? '#d32f2f' : '#495057',
              fontWeight: isMissingExplain ? 'bold' : 'normal',
              whiteSpace: 'nowrap'
            }}>
              {explainLabel}:
            </span>
          )}
          <div style={{
            flexGrow: 1,
            borderBottom: isNo ? (isMissingExplain ? '2px solid #d32f2f' : '2px solid #2e7d32') : '1px solid #adb5bd',
            borderRadius: '2px'
          }}>
            <EditableField
              fieldPath={getFieldPath(expKey)}
              value={expStr}
              onDataChange={(path, val) => handleFieldChange(expKey, val)}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={isEditable}
              isMissing={isMissingExplain}
              allData={allData}
              customValidation={(f, t, d) => checkManufacturedHomeConditionalField(f, t, allData || d || data)}
              manualValidations={manualValidations}
              handleManualValidation={handleManualValidation}
              revisionHandlers={revisionHandlers}
              inputClassName="form-control form-control-sm"
              inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '1px 4px', fontSize: '0.75rem', height: 'auto' }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Paper
      id={id}
      elevation={1}
      sx={{
        mb: 3,
        borderRadius: 2,
        overflow: 'hidden',
        borderTop: '3px solid',
        borderTopColor: 'success.main',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}
    >
      {/* CARD HEADER */}
      <Box
        sx={{
          bgcolor: 'grey.50',
          color: 'text.primary',
          borderBottom: '1px solid #dee2e6',
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HomeRepairServiceIcon sx={{ color: 'success.main', fontSize: '1.25rem' }} />
          <Typography variant="h6" component="h5" sx={{ fontSize: '1.02rem', fontWeight: 'bold' }}>
            {title}
          </Typography>
        </Box>
        {onRevisionButtonClick && (
          <Tooltip title="Revision Language">
            <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'text.secondary' }}>
              <LibraryBooksIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {loading && loadingSection === id && (
        <Box sx={{ width: '100%' }}>
          <LinearProgress />
        </Box>
      )}

      <div className="card-body p-2" style={{ fontSize: '0.78rem', backgroundColor: '#fff', overflowX: 'auto' }}>

        {/* 4 COLUMNS TOP GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(220px, 1fr))', gap: '8px', border: '1px solid #ced4da', borderRadius: '4px', padding: '4px' }}>

          {/* COLUMN 1: GENERAL DESCRIPTION */}
          <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.75rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
              GENERAL DESCRIPTION
            </div>
            <div style={{ padding: '4px' }}>
              {renderImpField('# of Units', ['# of Units', 'Units'], ['One', 'Additions'], false)}
              {renderImpField('# of Stories', ['# of Stories', 'Stories'], ['1', '2', 'Other'], true)}
              {renderImpField('Design (Style)', ['Design (Style)', 'Design Style'])}
              {renderImpField('# of Sections', ['# of Sections', 'Number of Sections', 'Section Count'], ['1', '2', '3', 'Other'], true)}
              {renderImpField('Type', ['Type', 'Property Type'], ['Det.', 'Att.', 'S-Det./End Unit'], true)}
              {renderImpField('Status', ['Existing/Proposed/Under Const.', 'Construction Status', 'Status'], ['Existing', 'Proposed', 'Under Const.'], false)}

              {/* Year Built & Effective Age Inline */}
              <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #e9ecef', paddingBottom: '3px', marginBottom: '4px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', marginBottom: '2px' }}>Year Built</div>
                  <EditableField
                    fieldPath={getFieldPath('Year Built')}
                    value={renderValue(getImpValue(['Year Built']).value)}
                    onDataChange={(p, val) => handleFieldChange('Year Built', val)}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData}
                    inputClassName="form-control form-control-sm"
                    inputStyle={{ width: '100%', border: '1px solid #ced4da', background: '#fff', padding: '2px 4px', fontSize: '0.75rem', height: 'auto' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', marginBottom: '2px' }}>Effective Age (Yrs)</div>
                  <EditableField
                    fieldPath={getFieldPath('Effective Age (Yrs)')}
                    value={renderValue(getImpValue(['Effective Age (Yrs)', 'Effective Age']).value)}
                    onDataChange={(p, val) => handleFieldChange('Effective Age (Yrs)', val)}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData}
                    inputClassName="form-control form-control-sm"
                    inputStyle={{ width: '100%', border: '1px solid #ced4da', background: '#fff', padding: '2px 4px', fontSize: '0.75rem', height: 'auto' }}
                  />
                </div>
              </div>

              {renderImpField('Attic', ['Attic'], ['None', 'Drop Stair', 'Stairs', 'Floor', 'Scuttle', 'Finished', 'Heated'], true)}
              {renderImpField('Appliances', ['Appliances'], ['Refrigerator', 'Range/Oven', 'Dishwasher', 'Disposal', 'Microwave', 'Washer/Dryer', 'Other (describe)'], true)}
            </div>
          </div>

          {/* COLUMN 2: FOUNDATION */}
          <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.75rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
              FOUNDATION
            </div>
            <div style={{ padding: '4px' }}>
              {renderImpField('Foundation Type', [
                'Poured Concrete / Concrete Runners / Block & Pier / Other-att. description / Full Basement / Partial Basement',
                'Foundation Type',
                'Foundation'
              ], ['Poured Concrete', 'Concrete Runners', 'Block & Pier', 'Other-att. description', 'Full Basement', 'Partial Basement'], true)}

              <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #e9ecef', paddingBottom: '3px', marginBottom: '4px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', marginBottom: '2px' }}>Basement Area sq.ft.</div>
                  <EditableField
                    fieldPath={getFieldPath('Basement Area sq.ft.')}
                    value={renderValue(getImpValue(['Basement Area sq.ft.', 'Basement Area']).value || '0')}
                    onDataChange={(p, val) => handleFieldChange('Basement Area sq.ft.', val)}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData}
                    inputClassName="form-control form-control-sm"
                    inputStyle={{ width: '100%', border: '1px solid #ced4da', background: '#fff', padding: '2px 4px', fontSize: '0.75rem', height: 'auto' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', marginBottom: '2px' }}>Basement Finish %</div>
                  <EditableField
                    fieldPath={getFieldPath('Basement Finish %')}
                    value={renderValue(getImpValue(['Basement Finish %', 'Basement Finish']).value || '0')}
                    onDataChange={(p, val) => handleFieldChange('Basement Finish %', val)}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData}
                    inputClassName="form-control form-control-sm"
                    inputStyle={{ width: '100%', border: '1px solid #ced4da', background: '#fff', padding: '2px 4px', fontSize: '0.75rem', height: 'auto' }}
                  />
                </div>
              </div>

              {renderImpField('Basement Details', ['Basement Details'], ['Outside Entry/Exit', 'Sump Pump'], false)}
              {renderImpField('Evidence of', ['Evidence of (Foundation)', 'Evidence of'], ['Infestation', 'Dampness', 'Settlement', 'None'], false)}
              {renderImpField('Heating', ['Heating Type', 'Heating'], ['FWA', 'HWBB', 'Radiant', 'Other'], true)}
              {renderImpField('Fuel', ['Fuel', 'Heating Fuel'])}
              {renderImpField('Cooling', ['Cooling Type', 'Cooling'], ['Central Air Conditioning', 'Individual', 'Other'], true)}
            </div>
          </div>

          {/* COLUMN 3: EXTERIOR DESCRIPTION */}
          <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.75rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
              EXTERIOR DESCRIPTION <span style={{ fontWeight: 'normal', fontSize: '0.65rem' }}>materials/condition</span>
            </div>
            <div style={{ padding: '4px' }}>
              {renderImpField('Skirting', ['Skirting', 'Skirting (Material/Condition)'])}
              {renderImpField('Exterior Walls', ['Exterior Walls (Material/Condition)', 'Exterior Walls'])}
              {renderImpField('Roof Surface', ['Roof Surface (Material/Condition)', 'Roof Surface'])}
              {renderImpField('Gutters & Downspouts', ['Gutters & Downspouts (Material/Condition)', 'Gutters & Downspouts'])}
              {renderImpField('Window Type', ['Window Type (Material/Condition)', 'Window Type'])}
              {renderImpField('Storm Sash/Insulated', ['Storm Sash/Insulated', 'Storm Sash', 'Storm Sash/Insulated (Material/Condition)'])}
              {renderImpField('Screens', ['Screens', 'Screens (Material/Condition)'])}
              {renderImpField('Doors', ['Doors', 'Doors (Material/Condition)'])}
              {renderImpField('Amenities', [
                'Amenities', 'Amenities Description', 'Patio/Deck', 'Fence', 'Porch', 'Pool'
              ], ['Fireplace(s) #', 'Woodstove(s) #', 'Patio/Deck', 'Fence', 'Porch', 'Pool', 'Other'], true)}
            </div>
          </div>

          {/* COLUMN 4: INTERIOR & CAR STORAGE */}
          <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.75rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
              INTERIOR <span style={{ fontWeight: 'normal', fontSize: '0.65rem' }}>materials/condition</span>
            </div>
            <div style={{ padding: '4px' }}>
              {renderImpField('Floors', ['Floors (Material/Condition)', 'Floors'])}
              {renderImpField('Walls', ['Walls (Material/Condition)', 'Walls'])}
              {renderImpField('Trim/Finish', ['Trim/Finish (Material/Condition)', 'Trim/Finish'])}
              {renderImpField('Bath Floor', ['Bath Floor (Material/Condition)', 'Bath Floor'])}
              {renderImpField('Bath Wainscot', ['Bath Wainscot (Material/Condition)', 'Bath Wainscot'])}

              {/* CAR STORAGE */}
              <div style={{ marginTop: '6px', border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#fcfcfc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f3f5', padding: '3px 6px', borderBottom: '1px solid #dee2e6' }}>
                  <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.72rem' }}>Car Storage</span>
                  {(() => {
                    const { value: csVal } = getImpValue(['Car Storage', 'Vehicle Storage']);
                    const isNone = checkOptionMatches(csVal, 'None');
                    const toggleNone = () => {
                      handleFieldChange('Car Storage', isNone ? '' : 'None');
                    };
                    return (
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '0.69rem', margin: 0 }}>
                        <input type="checkbox" checked={Boolean(isNone)} onChange={toggleNone} style={{ margin: 0, width: '12px', height: '12px' }} />
                        <span>None</span>
                      </label>
                    );
                  })()}
                </div>

                <div style={{ padding: '4px' }}>
                  {/* Driveway */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dashed #e9ecef' }}>
                    {(() => {
                      const { value: csVal } = getImpValue(['Car Storage']);
                      const isDrive = checkOptionMatches(csVal, 'Driveway');
                      const toggleDrive = () => {
                        let items = csVal ? String(csVal).split(',').map(s => s.trim()).filter(Boolean) : [];
                        items = isDrive ? items.filter(i => !checkOptionMatches(i, 'Driveway')) : [...items.filter(i => !checkOptionMatches(i, 'None')), 'Driveway'];
                        handleFieldChange('Car Storage', items.join(', '));
                      };
                      return (
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '0.7rem', margin: 0 }}>
                          <input type="checkbox" checked={isDrive} onChange={toggleDrive} style={{ margin: 0, width: '12px', height: '12px' }} />
                          <span>Driveway</span>
                        </label>
                      );
                    })()}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.68rem', color: '#6c757d' }}># Cars</span>
                      <div style={{ width: '50px', borderBottom: '1px solid #495057' }}>
                        <EditableField
                          fieldPath={getFieldPath('Driveway # of Cars')}
                          value={renderValue(getImpValue(['Driveway # of Cars', 'Driveway Cars', '# of Cars']).value)}
                          onDataChange={(p, val) => handleFieldChange('Driveway # of Cars', val)}
                          editingField={editingField}
                          setEditingField={setEditingField}
                          isEditable={isEditable}
                          allData={allData}
                          inputStyle={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Driveway Surface */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dashed #e9ecef' }}>
                    <span style={{ fontSize: '0.68rem', color: '#495057' }}>Driveway Surface</span>
                    <div style={{ width: '85px', borderBottom: '1px solid #495057' }}>
                      <EditableField
                        fieldPath={getFieldPath('Driveway Surface')}
                        value={renderValue(getImpValue(['Driveway Surface']).value)}
                        onDataChange={(p, val) => handleFieldChange('Driveway Surface', val)}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData}
                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}
                      />
                    </div>
                  </div>

                  {/* Garage */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dashed #e9ecef' }}>
                    {(() => {
                      const { value: csVal } = getImpValue(['Car Storage']);
                      const isGarage = checkOptionMatches(csVal, 'Garage');
                      const toggleGarage = () => {
                        let items = csVal ? String(csVal).split(',').map(s => s.trim()).filter(Boolean) : [];
                        items = isGarage ? items.filter(i => !checkOptionMatches(i, 'Garage')) : [...items.filter(i => !checkOptionMatches(i, 'None')), 'Garage'];
                        handleFieldChange('Car Storage', items.join(', '));
                      };
                      return (
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '0.7rem', margin: 0 }}>
                          <input type="checkbox" checked={isGarage} onChange={toggleGarage} style={{ margin: 0, width: '12px', height: '12px' }} />
                          <span>Garage</span>
                        </label>
                      );
                    })()}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.68rem', color: '#6c757d' }}># Cars</span>
                      <div style={{ width: '50px', borderBottom: '1px solid #495057' }}>
                        <EditableField
                          fieldPath={getFieldPath('Garage # of Cars')}
                          value={renderValue(getImpValue(['Garage # of Cars', 'Garage Cars']).value)}
                          onDataChange={(p, val) => handleFieldChange('Garage # of Cars', val)}
                          editingField={editingField}
                          setEditingField={setEditingField}
                          isEditable={isEditable}
                          allData={allData}
                          inputStyle={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Carport */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dashed #e9ecef' }}>
                    {(() => {
                      const { value: csVal } = getImpValue(['Car Storage']);
                      const isCarport = checkOptionMatches(csVal, 'Carport');
                      const toggleCarport = () => {
                        let items = csVal ? String(csVal).split(',').map(s => s.trim()).filter(Boolean) : [];
                        items = isCarport ? items.filter(i => !checkOptionMatches(i, 'Carport')) : [...items.filter(i => !checkOptionMatches(i, 'None')), 'Carport'];
                        handleFieldChange('Car Storage', items.join(', '));
                      };
                      return (
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '0.7rem', margin: 0 }}>
                          <input type="checkbox" checked={isCarport} onChange={toggleCarport} style={{ margin: 0, width: '12px', height: '12px' }} />
                          <span>Carport</span>
                        </label>
                      );
                    })()}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.68rem', color: '#6c757d' }}># Cars</span>
                      <div style={{ width: '50px', borderBottom: '1px solid #495057' }}>
                        <EditableField
                          fieldPath={getFieldPath('Carport # of Cars')}
                          value={renderValue(getImpValue(['Carport # of Cars', 'Carport Cars']).value)}
                          onDataChange={(p, val) => handleFieldChange('Carport # of Cars', val)}
                          editingField={editingField}
                          setEditingField={setEditingField}
                          isEditable={isEditable}
                          allData={allData}
                          inputStyle={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Attached / Detached / Built-in */}
                  {(() => {
                    const { value: attVal } = getImpValue(['Att./Det./Built-in', 'Garage Att./Det./Built-in', 'Car Storage Att/Det', 'Garage Type']);
                    const isAtt = checkOptionMatches(attVal, 'Attached') || checkOptionMatches(attVal, 'Att');
                    const isDet = checkOptionMatches(attVal, 'Detached') || checkOptionMatches(attVal, 'Det');
                    const isBuilt = checkOptionMatches(attVal, 'Built-in') || checkOptionMatches(attVal, 'BuiltIn');
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginTop: '3px', paddingTop: '3px' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '0.68rem', margin: 0 }}>
                          <input type="checkbox" checked={isAtt} onChange={() => handleFieldChange('Att./Det./Built-in', isAtt ? '' : 'Attached')} style={{ margin: 0, width: '12px', height: '12px' }} />
                          <span>Attached</span>
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '0.68rem', margin: 0 }}>
                          <input type="checkbox" checked={isDet} onChange={() => handleFieldChange('Att./Det./Built-in', isDet ? '' : 'Detached')} style={{ margin: 0, width: '12px', height: '12px' }} />
                          <span>Detached</span>
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '0.68rem', margin: 0 }}>
                          <input type="checkbox" checked={isBuilt} onChange={() => handleFieldChange('Att./Det./Built-in', isBuilt ? '' : 'Built-in')} style={{ margin: 0, width: '12px', height: '12px' }} />
                          <span>Built-in</span>
                        </label>
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* FINISHED AREA ABOVE GRADE CONTAINS */}
        <div style={{ marginTop: '8px', border: '1px solid #ced4da', borderRadius: '4px', padding: '8px 12px', backgroundColor: '#fcfcfc' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', fontSize: '0.78rem' }}>
            <span style={{ fontWeight: 'bold', color: '#343a40', whiteSpace: 'nowrap' }}>
              Finished area above grade contains:
            </span>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '65px', borderBottom: '1.5px solid #495057' }}>
                <EditableField
                  fieldPath={getFieldPath('Finished area above grade Rooms')}
                  value={renderValue(getImpValue(['Finished area above grade Rooms', 'Rooms']).value)}
                  onDataChange={(p, val) => handleFieldChange('Finished area above grade Rooms', val)}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={isEditable}
                  allData={allData}
                  inputStyle={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}
                />
              </div>
              <span style={{ color: '#495057', fontWeight: 500 }}>Rooms</span>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '65px', borderBottom: '1.5px solid #495057' }}>
                <EditableField
                  fieldPath={getFieldPath('Finished area above grade Bedrooms')}
                  value={renderValue(getImpValue(['Finished area above grade Bedrooms', 'Bedrooms']).value)}
                  onDataChange={(p, val) => handleFieldChange('Finished area above grade Bedrooms', val)}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={isEditable}
                  allData={allData}
                  inputStyle={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}
                />
              </div>
              <span style={{ color: '#495057', fontWeight: 500 }}>Bedrooms</span>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '65px', borderBottom: '1.5px solid #495057' }}>
                <EditableField
                  fieldPath={getFieldPath('Finished area above grade Bath(s)')}
                  value={renderValue(getImpValue(['Finished area above grade Bath(s)', 'Bath(s)', 'Baths']).value)}
                  onDataChange={(p, val) => handleFieldChange('Finished area above grade Bath(s)', val)}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={isEditable}
                  allData={allData}
                  inputStyle={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}
                />
              </div>
              <span style={{ color: '#495057', fontWeight: 500 }}>Bath(s)</span>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '90px', borderBottom: '1.5px solid #495057' }}>
                <EditableField
                  fieldPath={getFieldPath('Square Feet of Gross Living Area Above Grade')}
                  value={renderValue(getImpValue(['Square Feet of Gross Living Area Above Grade', 'Gross Living Area', 'GLA']).value)}
                  onDataChange={(p, val) => handleFieldChange('Square Feet of Gross Living Area Above Grade', val)}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={isEditable}
                  allData={allData}
                  inputStyle={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}
                />
              </div>
              <span style={{ color: '#495057', fontWeight: 500 }}>Square Feet of Gross Living Area Above Grade</span>
            </div>
          </div>
        </div>

        {/* DESCRIBE ANY ADDITIONS OR MODIFICATIONS */}
        <div style={{ marginTop: '8px', border: '1px solid #ced4da', borderRadius: '4px', padding: '8px 10px', backgroundColor: '#fff' }}>
          <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.74rem', marginBottom: '3px' }}>
            Describe any additions or modifications (decks, rooms, remodeling, etc.):
          </div>
          <EditableField
            fieldPath={getFieldPath('Describe any additions or modifications (decks, rooms, remodeling, etc.):')}
            value={renderValue(getImpValue([
              'Describe any additions or modifications (decks, rooms, remodeling, etc.):',
              'Describe any additions or modifications (decks, rooms, remodeling, etc.)',
              'Describe any additions or modifications (decks, rooms, remodeling, etc.',
              'Additions/Modifications Description',
              'Additions or Modifications'
            ]).value)}
            onDataChange={(p, val) => {
              handleFieldChange('Describe any additions or modifications (decks, rooms, remodeling, etc.):', val);
              handleFieldChange('Describe any additions or modifications (decks, rooms, remodeling, etc.)', val);
              handleFieldChange('Describe any additions or modifications (decks, rooms, remodeling, etc.', val);
            }}
            editingField={editingField}
            setEditingField={setEditingField}
            usePre={true}
            isEditable={isEditable}
            allData={allData}
            inputClassName="form-control form-control-sm field-value-pre"
            inputStyle={{ width: '100%', border: '1px solid #dee2e6', background: '#fafafa', padding: '4px', fontSize: '0.76rem', height: 'auto', minHeight: '38px' }}
          />
        </div>

        {/* MANUFACTURED HOME SPECIFIC QUESTIONS BOX */}
        <div style={{ marginTop: '8px', border: '1px solid #ced4da', borderRadius: '4px', overflow: 'hidden' }}>

          {/* INSTALLER / DATE INSTALLED / MODEL YEAR ROW */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            padding: '6px 10px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #dee2e6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.74rem', color: '#495057', whiteSpace: 'nowrap' }}>Installer’s Name:</span>
              <div style={{ flexGrow: 1, borderBottom: '1px solid #495057' }}>
                <EditableField
                  fieldPath={getFieldPath('Installer’s Name')}
                  value={renderValue(getImpValue(['Installer’s Name', "Installer's Name", 'Installer Name']).value)}
                  onDataChange={(p, val) => handleFieldChange('Installer’s Name', val)}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={isEditable}
                  allData={allData}
                  inputStyle={{ width: '100%', border: 'none', background: 'transparent', fontSize: '0.75rem', fontWeight: 'bold' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.74rem', color: '#495057', whiteSpace: 'nowrap' }}>Date Installed:</span>
              <div style={{ flexGrow: 1, borderBottom: '1px solid #495057' }}>
                <EditableField
                  fieldPath={getFieldPath('Date Installed')}
                  value={renderValue(getImpValue(['Date Installed', 'Installation Date', 'Installed Date']).value)}
                  onDataChange={(p, val) => handleFieldChange('Date Installed', val)}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={isEditable}
                  allData={allData}
                  inputStyle={{ width: '100%', border: 'none', background: 'transparent', fontSize: '0.75rem', fontWeight: 'bold' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.74rem', color: '#495057', whiteSpace: 'nowrap' }}>Model Year:</span>
              <div style={{ flexGrow: 1, borderBottom: '1px solid #495057' }}>
                <EditableField
                  fieldPath={getFieldPath('Model Year')}
                  value={renderValue(getImpValue(['Model Year', 'Year Built']).value)}
                  onDataChange={(p, val) => handleFieldChange('Model Year', val)}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={isEditable}
                  allData={allData}
                  inputStyle={{ width: '100%', border: 'none', background: 'transparent', fontSize: '0.75rem', fontWeight: 'bold' }}
                />
              </div>
            </div>
          </div>

          {/* PERMANENT FOUNDATION QUESTION */}
          {renderYesNoQuestionRow(
            'Is the manufactured home attached to a permanent foundation system?',
            [
              'Is the manufactured home attached to a permanent foundation system? Yes No If No, describe the foundation sytem and the manner of attachment.',
              'Is the manufactured home attached to a permanent foundation system?',
              'Permanent Foundation'
            ],
            'If No, describe the foundation sytem and the manner of attachment',
            [
              'If No, describe the foundation system and the manner of attachment.',
              'Foundation Attachment Description'
            ]
          )}

          {/* TOWING HITCH, WHEELS & AXLES QUESTION */}
          {renderYesNoQuestionRow(
            'Have the towing hitch, wheels, and axles been removed?',
            [
              'Have the towing hitch, wheels, and axles been removed? Yes No If No, explain',
              'Have the towing hitch, wheels, and axles been removed?',
              'Wheels/Axles Removed'
            ],
            'If No, explain',
            [
              'Have the towing hitch, wheels, and axles been removed? explain',
              'Wheels/Axles Removed Comment'
            ]
          )}

          {/* UTILITIES QUESTION */}
          {renderYesNoQuestionRow(
            'Is the manufactured home permanently connected to a septic tank or sewage system and other utilities?',
            [
              'Is the manufactured home permanently connected to a septic tank or sewage system and other utilities? Yes No If No, explain',
              'Is the manufactured home permanently connected to a septic tank or sewage system and other utilities?',
              'Connected to Utilities'
            ],
            'If No, explain',
            [
              'Is the manufactured home permanently connected to a septic tank or sewage system and other utilities? explain',
              'Connected to Utilities Comment'
            ]
          )}

          {/* MARKET ACCEPTABILITY QUESTION */}
          {renderYesNoQuestionRow(
            'Does the dwelling have sufficient gross living area and room dimensions to be acceptable to the market?',
            [
              'Does the dwelling have sufficient gross living area and room dimensions to be acceptable to the market? Yes No If No, explain',
              'Does the dwelling have sufficient gross living area and room dimensions to be acceptable to the market?',
              'Market Acceptability'
            ],
            'If No, explain',
            [
              'Does the dwelling have sufficient gross living area and room dimensions to be acceptable to the market? explain',
              'Market Acceptability Comment'
            ]
          )}

        </div>

        {/* ADDITIONAL FEATURES */}
        <div style={{ marginTop: '8px', border: '1px solid #ced4da', borderRadius: '4px', padding: '8px 10px', backgroundColor: '#fff' }}>
          <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.74rem', marginBottom: '3px' }}>
            Additional features (special energy efficient items, non-realty items, etc.):
          </div>
          <EditableField
            fieldPath={getFieldPath('Additional features (special energy efficient items, non-realty items, etc.)')}
            value={renderValue(getImpValue([
              'Additional features (special energy efficient items, non-realty items, etc.)',
              'Additional features',
              'Additional features (special energy efficient items, etc.)'
            ]).value)}
            onDataChange={(p, val) => handleFieldChange('Additional features (special energy efficient items, non-realty items, etc.)', val)}
            editingField={editingField}
            setEditingField={setEditingField}
            usePre={true}
            isEditable={isEditable}
            allData={allData}
            inputClassName="form-control form-control-sm field-value-pre"
            inputStyle={{ width: '100%', border: '1px solid #dee2e6', background: '#fafafa', padding: '4px', fontSize: '0.76rem', height: 'auto', minHeight: '36px' }}
          />
        </div>

        {/* QUALITY RATING SECTION */}
        <div style={{ marginTop: '8px', border: '1px solid #ced4da', borderRadius: '4px', padding: '8px 10px', backgroundColor: '#fcfcfc' }}>
          <div style={{ fontSize: '0.72rem', color: '#495057', marginBottom: '6px', lineHeight: 1.35, fontStyle: 'italic' }}>
            The appraiser must rate the quality of construction for the subject unit based on objective criteria (such as N.A.D.A. Manufactured Housing Appraisal Guide®, Marshall & Swift Residential Cost Handbook®, or other published cost service). The appraiser must also report the source used for this quality of construction rating determination.
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#212529' }}>Quality:</span>
              {(() => {
                const { value: qVal, actualKey: qKey } = getImpValue([
                  'Quality Poor Fair Average Good Excellent Identify source of quality rating',
                  'Quality Rating (Cost Service)',
                  'The appraiser must rate the quality of construction for the subject unit based on objective criteria (such as N.A.D.A. Manufactured Housing Appraisal Guide®, Marshall & Swift Residential Cost Handbook®, or other published cost service).'
                ]);
                const qStr = renderValue(qVal);
                const options = ['Poor', 'Fair', 'Average', 'Good', 'Excellent'];
                return (
                  <div style={{ display: 'inline-flex', gap: '10px' }}>
                    {options.map((opt) => {
                      const isChecked = checkOptionMatches(qStr, opt);
                      const handleToggle = () => {
                        const newVal = isChecked ? '' : opt;
                        handleFieldChange(qKey, newVal);
                        handleFieldChange('Quality Poor Fair Average Good Excellent Identify source of quality rating', newVal);
                      };
                      return (
                        <label key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '0.72rem', margin: 0, fontWeight: isChecked ? 700 : 500 }}>
                          <input type="checkbox" checked={isChecked} onChange={handleToggle} style={{ margin: 0, width: '13px', height: '13px' }} />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flex: '1 1 300px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.74rem', color: '#495057', whiteSpace: 'nowrap' }}>
                Identify source of quality rating:
              </span>
              <div style={{ flexGrow: 1, borderBottom: '1px solid #495057' }}>
                <EditableField
                  fieldPath={getFieldPath('Identify source of quality rating')}
                  value={renderValue(getImpValue([
                    'Identify source of quality rating',
                    'Quality Rating Source',
                    'Quality Poor Fair Average Good Excellent Identify source of quality rating'
                  ]).value)}
                  onDataChange={(p, val) => handleFieldChange('Identify source of quality rating', val)}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={isEditable}
                  allData={allData}
                  inputStyle={{ width: '100%', border: 'none', background: 'transparent', fontSize: '0.75rem', fontWeight: 'bold' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CONDITION OF THE PROPERTY NARRATIVE */}
        <div style={{ marginTop: '8px', border: '1px solid #ced4da', borderRadius: '4px', padding: '8px 10px', backgroundColor: '#fff' }}>
          <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.74rem', marginBottom: '3px' }}>
            Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.):
          </div>
          <EditableField
            fieldPath={getFieldPath('Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.).')}
            value={renderValue(getImpValue([
              'Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.).',
              'Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)',
              'Describe the condition of the property',
              'Comments on Improvements'
            ]).value)}
            onDataChange={(p, val) => {
              handleFieldChange('Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.).', val);
              handleFieldChange('Describe the condition of the property', val);
            }}
            editingField={editingField}
            setEditingField={setEditingField}
            usePre={true}
            isEditable={isEditable}
            allData={allData}
            inputClassName="form-control form-control-sm field-value-pre"
            inputStyle={{ width: '100%', border: '1px solid #dee2e6', background: '#fafafa', padding: '4px', fontSize: '0.76rem', height: 'auto', minHeight: '44px' }}
          />
        </div>

        {/* BOTTOM QUESTIONS: PHYSICAL DEFICIENCIES & NEIGHBORHOOD CONFORMANCE */}
        <div style={{ marginTop: '8px', border: '1px solid #ced4da', borderRadius: '4px', overflow: 'hidden' }}>
          {renderYesNoQuestionRow(
            'Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property?',
            [
              'Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe',
              'Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property?'
            ],
            'If Yes, describe',
            [
              'Physical Deficiencies Description',
              'Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe'
            ]
          )}

          {renderYesNoQuestionRow(
            'Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?',
            [
              'Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)? If No, describe',
              'Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?'
            ],
            'If No, describe',
            [
              'Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)? comment',
              'Neighborhood Conformance Comment',
              'If No, describe'
            ]
          )}
        </div>

      </div>
    </Paper>
  );
};

export default Improvements1004C;
