import React from 'react';
import { Tooltip, IconButton } from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { EditableField } from './EditableField';
import {
  checkRentScheduleToBeBracketing,
  getRentScheduleToBeValue,
  parseRentalAmount
} from '../../../validations/rentScheduleValidation';

const ComparableRentScheduleSection = ({
  data = {},
  allData = {},
  extractionAttempted = false,
  handleDataChange,
  editingField,
  setEditingField,
  comparableRents = [
    'COMPARABLE NO. 1',
    'COMPARABLE NO. 2',
    'COMPARABLE NO. 3',
    'COMPARABLE NO. 4',
    'COMPARABLE NO. 5',
    'COMPARABLE NO. 6',
    'COMPARABLE NO. 7',
    'COMPARABLE NO. 8',
    'COMPARABLE NO. 9'
  ],
  on1007RevisionButtonClick,
  manualValidations,
  handleManualValidation,
  revisionHandlers,
  isEditable = true,
}) => {
  const getFieldAliases = (field) => {
    if (!field) return [];
    const aliases = [field];
    if (field === 'Other:') {
      aliases.push('Other', 'Other Feature', 'Other Description');
    } else if (field === 'Other') {
      aliases.push('Other:', 'Other Feature', 'Other Description');
    } else if (field === 'Other: Adjustment') {
      aliases.push('Other Adjustment', 'Other: Adj', 'Other Adj');
    } else if (field === 'Other Adjustment') {
      aliases.push('Other: Adjustment', 'Other: Adj', 'Other Adj');
    } else if (field === 'Design and Appeal') {
      aliases.push('Design & Appeal', 'Design (Style)', 'Design and Appeal (Subject)', 'Design/Appeal');
    } else if (field === 'Design and Appeal Adjustment') {
      aliases.push('Design and Appeal Adj', 'Design & Appeal Adjustment', 'Design & Appeal Adj', 'Design (Style) Adjustment');
    } else if (field === 'Other (e.g., basement, etc.)') {
      aliases.push(
        'Other (e.g., basement)',
        'Other (e.g., basement etc.)',
        'Other Basement',
        'Basement (Other)',
        'Other (Basement)',
        'Basement & Finished Rooms Below Grade'
      );
    } else if (field === 'Other (e.g., basement, etc.) Adjustment') {
      aliases.push(
        'Other (e.g., basement) Adjustment',
        'Other Basement Adjustment',
        'Other (e.g., basement, etc.) Adj',
        'Other (e.g., basement) Adj',
        'Other Basement Adj'
      );
    } else if (field === 'Location/View') {
      aliases.push('Location / View', 'Location', 'View');
    } else if (field === 'Location/View Adjustment') {
      aliases.push('Location / View Adjustment', 'Location Adjustment', 'View Adjustment', 'Location/View Adj');
    } else if (field === 'Age') {
      aliases.push('Actual Age', 'Age (Yrs)', 'Age (Years)');
    } else if (field === 'Age Adjustment') {
      aliases.push('Actual Age Adjustment', 'Age Adj', 'Age/Condition Adjustment', 'Age / Condition Adjustment');
    } else if (field === 'Condition') {
      aliases.push('Overall Condition', 'Condition Rating');
    } else if (field === 'Condition Adjustment') {
      aliases.push('Overall Condition Adjustment', 'Condition Adj', 'Age/Condition Adjustment', 'Age / Condition Adjustment');
    } else if (field === 'Room Count Total') {
      aliases.push('Total Rooms', 'Total', 'Rooms', 'Above Grade Room Count Total');
    } else if (field === 'Room Count Bdrms') {
      aliases.push('Bedrooms', 'Bdrms', 'Bedrooms Above Grade');
    } else if (field === 'Room Count Baths') {
      aliases.push('Baths', 'Bathrooms', 'Bath(s)', 'Bath(s) Above Grade');
    } else if (field === 'Room Count Total Adjustment') {
      aliases.push('Room Count Adjustment', 'Total Rooms Adjustment', 'Bedrooms Adjustment', 'Baths Adjustment');
    } else if (field === 'Gross Living Area') {
      aliases.push('Gross Living Area (GLA)', 'Square Feet of Gross Living Area Above Grade', 'GLA');
    } else if (field === 'Gross Living Area Adjustment') {
      aliases.push('Gross Living Area Adj', 'GLA Adjustment');
    }
    return [...new Set(aliases)];
  };

  const getRentKeyAliases = (rentKey) => {
    if (!rentKey) return [];
    const aliases = [rentKey];
    const numMatch = rentKey.match(/(\d+)/);
    if (numMatch) {
      const n = numMatch[1];
      aliases.push(
        `COMPARABLE NO. ${n}`,
        `COMPARABLE NO ${n}`,
        `COMPARABLE RENTAL #${n}`,
        `Comparable Rental #${n}`,
        `Comparable Rental No #${n}`,
        `COMPARABLE Rental No #${n}`,
        `Comparable Rental ${n}`,
        `Rental ${n}`,
        `Rental #${n}`,
        `RENTAL_${n}`,
        `COMPARABLE NO. 0${n}`,
        `COMPARABLE NO 0${n}`
      );
    }
    return [...new Set(aliases)];
  };

  const getRentalCompObject = (rentKey) => {
    const rentAliases = getRentKeyAliases(rentKey);
    const containers = [
      data?.['Comparable Rent Schedule'],
      allData?.['Comparable Rent Schedule'],
      data?.clean_data?.['Comparable Rent Schedule'],
      allData?.clean_data?.['Comparable Rent Schedule'],
      data?.['RENT_SCHEDULE_GRID'],
      allData?.['RENT_SCHEDULE_GRID'],
      data?.['Comparable Rental Data'],
      allData?.['Comparable Rental Data'],
      data?.clean_data?.['Comparable Rental Data'],
      allData?.clean_data?.['Comparable Rental Data'],
      data?.['Single Family Rent Schedule'],
      allData?.['Single Family Rent Schedule'],
      data?.clean_data?.['Single Family Rent Schedule'],
      allData?.clean_data?.['Single Family Rent Schedule'],
      data?.RENTAL_GRID,
      allData?.RENTAL_GRID,
      data?.fields?.['Comparable Rental Data'],
      allData?.fields?.['Comparable Rental Data']
    ];

    for (const container of containers) {
      if (container && typeof container === 'object') {
        for (const r of rentAliases) {
          if (container[r] && typeof container[r] === 'object') {
            return container[r];
          }
        }
      }
    }

    // Top-level fallback ONLY for explicit rental keys (never generic "Comparable #N" or "Comp N")
    for (const r of rentAliases) {
      if (/^(?:rental\b|comparable\s*no\.?|comparable\s*rental)/i.test(r)) {
        if (data?.[r] && typeof data[r] === 'object') return data[r];
        if (allData?.[r] && typeof allData[r] === 'object') return allData[r];
      }
    }

    return null;
  };

  const getSubjectVal = (field) => {
    const aliases = getFieldAliases(field);
    for (const f of aliases) {
      const val =
        (data?.['Single Family Rent Schedule'] && data['Single Family Rent Schedule'][f]) ??
        (allData?.['Single Family Rent Schedule'] && allData['Single Family Rent Schedule'][f]) ??
        (data?.clean_data?.['Single Family Rent Schedule'] && data.clean_data['Single Family Rent Schedule'][f]) ??
        (allData?.clean_data?.['Single Family Rent Schedule'] && allData.clean_data['Single Family Rent Schedule'][f]) ??
        (data?.['Subject Rent Schedule'] && data['Subject Rent Schedule'][f]) ??
        (allData?.['Subject Rent Schedule'] && allData['Subject Rent Schedule'][f]) ??
        (data?.clean_data?.['Subject Rent Schedule'] && data.clean_data['Subject Rent Schedule'][f]) ??
        (allData?.clean_data?.['Subject Rent Schedule'] && allData.clean_data['Subject Rent Schedule'][f]) ??
        (data?.Subject && data.Subject[f]) ??
        (allData?.Subject && allData.Subject[f]) ??
        (data?.clean_data?.Subject && data.clean_data.Subject[f]) ??
        (allData?.clean_data?.Subject && allData.clean_data.Subject[f]);

      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return val;
      }
    }

    // Top-level fallback for non-ambiguous fields (exclude 'Other' to avoid neighborhood land use clash)
    for (const f of aliases) {
      if (f !== 'Other' && f !== 'Other:') {
        const val = data?.[f] ?? allData?.[f];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return val;
        }
      }
    }

    return '';
  };

  const getRentVal = (rentKey, field) => {
    const rentObj = getRentalCompObject(rentKey);
    if (!rentObj) return '';
    const fieldAliases = getFieldAliases(field);

    for (const f of fieldAliases) {
      const val = rentObj[f];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return val;
      }
    }

    return '';
  };

  const isCompDataPresent = (rent) => {
    const rentData = getRentalCompObject(rent);
    if (!rentData || typeof rentData !== 'object') return false;
    const addr = String(rentData['Address'] || rentData['Street Address'] || rentData['PropertyStreetAddress'] || '').trim();
    if (addr && addr !== '0' && addr !== '-' && addr.toLowerCase() !== 'n/a') return true;
    const rentVal = String(rentData['Monthly Rental'] || rentData['Adjusted Monthly Rent'] || rentData['MonthlyRentAmount'] || '').trim();
    if (rentVal && rentVal !== '0' && rentVal !== '$0' && rentVal !== '-' && rentVal.toLowerCase() !== 'n/a') return true;
    return Object.values(rentData).some(
      (val) => val !== undefined && val !== null && typeof val !== 'object' && String(val).trim() !== ''
    );
  };

  const presentCompsCount = (comparableRents || []).filter(rent => isCompDataPresent(rent)).length;

  const activeComparableRents = (comparableRents || []).filter((rent, idx) => {
    return isCompDataPresent(rent) || idx < 3;
  });

  return (
    <div id="rent-schedule-section" style={{ marginBottom: '1rem', marginTop: '1rem' }} className="card shadow mb-4">
      <div className="card-header CAR1 bg-info text-white" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Comparable Rent Schedule</strong>
          {on1007RevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={on1007RevisionButtonClick} size="small" sx={{ color: 'white', marginLeft: 'auto' }}>
                <LibraryBooksIcon />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </div>
      {presentCompsCount < 3 && (
        <div
          className="alert alert-danger m-3 mb-2"
          role="alert"
          style={{
            fontWeight: 600,
            fontSize: '0.875rem',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            padding: '10px 14px'
          }}
        >
          <span style={{ marginRight: '8px' }}>⚠️</span>
          <span>minimum 3 rental comparables will be present</span>
        </div>
      )}
      <div className="card-body p-0 table-container" style={{ overflowX: 'auto' }}>
        <table className="table table-bordered mb-0" style={{ fontSize: '0.8rem', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead className="table-light">
            <tr>
              <th className="border border-gray-400 p-1 bg-gray-200 align-middle" style={{ width: '18%' }}>ITEM</th>
              <th className="border border-gray-400 p-1 bg-gray-200 align-middle" style={{ width: '18%' }}>SUBJECT</th>
              {activeComparableRents.map((rent, idx) => {
                const isPresent = isCompDataPresent(rent);
                const isMissingRequired = idx < 3 && !isPresent;

                return (
                  <th
                    key={idx}
                    colSpan={2}
                    className="border border-gray-400 p-1 bg-gray-200 text-center align-middle"
                    style={isMissingRequired ? { backgroundColor: '#f8d7da', color: '#721c24' } : {}}
                  >
                    <div>{rent}</div>
                    {isMissingRequired && (
                      <div style={{ fontSize: '0.7rem', color: '#dc3545', fontWeight: 'bold' }}>
                        (Missing - Required)
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Address */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Address</td>
              <td className="border border-gray-400 p-1">
                <EditableField
                  fieldPath={['Subject', 'Address']}
                  value={getSubjectVal('Address')}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isMissing={extractionAttempted && !getSubjectVal('Address')}
                  isEditable={isEditable}
                  manualValidations={manualValidations}
                  revisionHandlers={revisionHandlers}
                  handleManualValidation={handleManualValidation}
                  allData={allData}
                  saleName="Subject"
                />
              </td>
              {activeComparableRents.map((rent, idx) => (
                <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                  <EditableField
                    fieldPath={[rent, 'Address']}
                    value={getRentVal(rent, 'Address')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !getRentVal(rent, 'Address')}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName={rent}
                  />
                </td>
              ))}
            </tr>

            {/* Proximity to Subject */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Proximity to Subject</td>
              <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
              {activeComparableRents.map((rent, idx) => (
                <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                  <EditableField
                    fieldPath={[rent, 'Proximity to Subject']}
                    value={getRentVal(rent, 'Proximity to Subject')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !getRentVal(rent, 'Proximity to Subject')}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName={rent}
                  />
                </td>
              ))}
            </tr>

            {/* Date Lease Begins / Date Lease Expires */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">
                <div>Date Lease Begins</div>
                <div className="text-muted" style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                  Date Lease Expires
                </div>
              </td>
              <td className="border border-gray-400 p-1">
                <div>
                  <EditableField
                    fieldPath={['Subject', 'Date Lease Begins']}
                    value={getSubjectVal('Date Lease Begins')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !getSubjectVal('Date Lease Begins')}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName="Subject"
                  />
                </div>
                <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                  <EditableField
                    fieldPath={['Subject', 'Date Lease Expires']}
                    value={getSubjectVal('Date Lease Expires')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !getSubjectVal('Date Lease Expires')}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName="Subject"
                  />
                </div>
              </td>
              {activeComparableRents.map((rent, idx) => (
                <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                  <div>
                    <EditableField
                      fieldPath={[rent, 'Date Lease Begins']}
                      value={getRentVal(rent, 'Date Lease Begins')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Date Lease Begins')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </div>
                  <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                    <EditableField
                      fieldPath={[rent, 'Date Lease Expires']}
                      value={getRentVal(rent, 'Date Lease Expires')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Date Lease Expires')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </div>
                </td>
              ))}
            </tr>

            {/* Monthly Rental */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Monthly Rental</td>
              <td className="border border-gray-400 p-1">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>If Currently Rented: $</span>
                  <EditableField
                    fieldPath={['Subject', 'Monthly Rental']}
                    value={getSubjectVal('Monthly Rental')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !getSubjectVal('Monthly Rental')}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName="Subject"
                  />
                </div>
              </td>
              {activeComparableRents.map((rent, idx) => (
                <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>$</span>
                    <EditableField
                      fieldPath={[rent, 'Monthly Rental']}
                      value={getRentVal(rent, 'Monthly Rental')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Monthly Rental')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </div>
                </td>
              ))}
            </tr>

            {/* Less: Utilities / Furniture */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">
                <div>Less: Utilities</div>
                <div className="text-muted" style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                  Furniture
                </div>
              </td>
              <td className="border border-gray-400 p-1">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>$</span>
                  <EditableField
                    fieldPath={['Subject', 'Less: Utilities']}
                    value={getSubjectVal('Less: Utilities')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !getSubjectVal('Less: Utilities')}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName="Subject"
                  />
                </div>
                <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <EditableField
                    fieldPath={['Subject', 'Furniture']}
                    value={getSubjectVal('Furniture')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !getSubjectVal('Furniture')}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName="Subject"
                  />
                </div>
              </td>
              {activeComparableRents.map((rent, idx) => (
                <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>$</span>
                    <EditableField
                      fieldPath={[rent, 'Less: Utilities']}
                      value={getRentVal(rent, 'Less: Utilities')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Less: Utilities')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </div>
                  <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <EditableField
                      fieldPath={[rent, 'Furniture']}
                      value={getRentVal(rent, 'Furniture')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Furniture')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </div>
                </td>
              ))}
            </tr>

            {/* Adjusted Monthly Rent */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Adjusted Monthly Rent</td>
              <td className="border border-gray-400 p-1">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>$</span>
                  <EditableField
                    fieldPath={['Subject', 'Adjusted Monthly Rent']}
                    value={getSubjectVal('Adjusted Monthly Rent')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !getSubjectVal('Adjusted Monthly Rent')}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName="Subject"
                  />
                </div>
              </td>
              {activeComparableRents.map((rent, idx) => (
                <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>$</span>
                    <EditableField
                      fieldPath={[rent, 'Adjusted Monthly Rent']}
                      value={getRentVal(rent, 'Adjusted Monthly Rent')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Adjusted Monthly Rent')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </div>
                </td>
              ))}
            </tr>

            {/* Data Source */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Data Source</td>
              <td className="border border-gray-400 p-1">
                <EditableField
                  fieldPath={['Subject', 'Data Source']}
                  value={getSubjectVal('Data Source')}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isMissing={extractionAttempted && !getSubjectVal('Data Source')}
                  isEditable={isEditable}
                  manualValidations={manualValidations}
                  revisionHandlers={revisionHandlers}
                  handleManualValidation={handleManualValidation}
                  allData={allData}
                  saleName="Subject"
                />
              </td>
              {activeComparableRents.map((rent, idx) => (
                <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                  <EditableField
                    fieldPath={[rent, 'Data Source']}
                    value={getRentVal(rent, 'Data Source')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !getRentVal(rent, 'Data Source')}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName={rent}
                  />
                </td>
              ))}
            </tr>

            {/* RENT ADJUSTMENTS Header */}
            <tr className="bg-light">
              <td className="border border-gray-400 p-2 font-bold" style={{ backgroundColor: '#f8f9fa' }}>RENT ADJUSTMENTS</td>
              <td className="border border-gray-400 p-2 font-bold" style={{ backgroundColor: '#f8f9fa' }}>DESCRIPTION</td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-2 font-bold text-center" style={{ width: '13%', backgroundColor: '#f8f9fa' }}>DESCRIPTION</td>
                  <td className="border border-gray-400 p-2 font-bold text-center" style={{ width: '8%', backgroundColor: '#f8f9fa' }}>+(-)$ Adjust.</td>
                </React.Fragment>
              ))}
            </tr>

            {/* Rent */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Rent</td>
              <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Rent']}
                      value={getRentVal(rent, 'Rent')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Rent')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                  <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                </React.Fragment>
              ))}
            </tr>

            {/* Concessions */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Concessions</td>
              <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Concessions']}
                      value={getRentVal(rent, 'Concessions')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Concessions')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                  <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                </React.Fragment>
              ))}
            </tr>

            {/* Location/View */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Location/View</td>
              <td className="border border-gray-400 p-1">
                <EditableField
                  fieldPath={['Subject', 'Location/View']}
                  value={getSubjectVal('Location/View')}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isMissing={extractionAttempted && !getSubjectVal('Location/View')}
                  isEditable={isEditable}
                  manualValidations={manualValidations}
                  revisionHandlers={revisionHandlers}
                  handleManualValidation={handleManualValidation}
                  allData={allData}
                  saleName="Subject"
                />
              </td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Location/View']}
                      value={getRentVal(rent, 'Location/View')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Location/View')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Location/View Adjustment']}
                      value={getRentVal(rent, 'Location/View Adjustment')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Location/View Adjustment')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                </React.Fragment>
              ))}
            </tr>

            {/* Design and Appeal */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Design and Appeal</td>
              <td className="border border-gray-400 p-1">
                <EditableField
                  fieldPath={['Subject', 'Design and Appeal']}
                  value={getSubjectVal('Design and Appeal')}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isMissing={extractionAttempted && !getSubjectVal('Design and Appeal')}
                  isEditable={isEditable}
                  manualValidations={manualValidations}
                  revisionHandlers={revisionHandlers}
                  handleManualValidation={handleManualValidation}
                  allData={allData}
                  saleName="Subject"
                />
              </td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Design and Appeal']}
                      value={getRentVal(rent, 'Design and Appeal')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Design and Appeal')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Design and Appeal Adjustment']}
                      value={getRentVal(rent, 'Design and Appeal Adjustment')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Design and Appeal Adjustment')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                </React.Fragment>
              ))}
            </tr>

            {/* Age/Condition */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Age/Condition</td>
              <td className="border border-gray-400 p-1">
                <div>
                  <EditableField
                    fieldPath={['Subject', 'Age']}
                    value={getSubjectVal('Age')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !getSubjectVal('Age')}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName="Subject"
                  />
                </div>
                <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                  <EditableField
                    fieldPath={['Subject', 'Condition']}
                    value={getSubjectVal('Condition')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !getSubjectVal('Condition')}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName="Subject"
                  />
                </div>
              </td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <div>
                      <EditableField
                        fieldPath={[rent, 'Age']}
                        value={getRentVal(rent, 'Age')}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && !getRentVal(rent, 'Age')}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                    </div>
                    <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                      <EditableField
                        fieldPath={[rent, 'Condition']}
                        value={getRentVal(rent, 'Condition')}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && !getRentVal(rent, 'Condition')}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                    </div>
                  </td>
                  <td className="border border-gray-400 p-1">
                    <div>
                      <EditableField
                        fieldPath={[rent, 'Age Adjustment']}
                        value={getRentVal(rent, 'Age Adjustment')}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && !getRentVal(rent, 'Age Adjustment')}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                    </div>
                    <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                      <EditableField
                        fieldPath={[rent, 'Condition Adjustment']}
                        value={getRentVal(rent, 'Condition Adjustment')}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && !getRentVal(rent, 'Condition Adjustment')}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                    </div>
                  </td>
                </React.Fragment>
              ))}
            </tr>

            {/* Above Grade Room Count */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">
                <div>Above Grade Room Count</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#6c757d', borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                  <span>Total</span>
                  <span>Bdrms</span>
                  <span>Baths</span>
                </div>
              </td>
              <td className="border border-gray-400 p-1">
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <EditableField
                    fieldPath={['Subject', 'Room Count Total']}
                    value={getSubjectVal('Room Count Total')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !getSubjectVal('Room Count Total')}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName="Subject"
                  />
                  <span>:</span>
                  <EditableField
                    fieldPath={['Subject', 'Room Count Bdrms']}
                    value={getSubjectVal('Room Count Bdrms')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !getSubjectVal('Room Count Bdrms')}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName="Subject"
                  />
                  <span>:</span>
                  <EditableField
                    fieldPath={['Subject', 'Room Count Baths']}
                    value={getSubjectVal('Room Count Baths')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !getSubjectVal('Room Count Baths')}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName="Subject"
                  />
                </div>
              </td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <EditableField
                        fieldPath={[rent, 'Room Count Total']}
                        value={getRentVal(rent, 'Room Count Total')}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && !getRentVal(rent, 'Room Count Total')}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                      <span>:</span>
                      <EditableField
                        fieldPath={[rent, 'Room Count Bdrms']}
                        value={getRentVal(rent, 'Room Count Bdrms')}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && !getRentVal(rent, 'Room Count Bdrms')}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                      <span>:</span>
                      <EditableField
                        fieldPath={[rent, 'Room Count Baths']}
                        value={getRentVal(rent, 'Room Count Baths')}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && !getRentVal(rent, 'Room Count Baths')}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                    </div>
                  </td>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Room Count Total Adjustment']}
                      value={getRentVal(rent, 'Room Count Total Adjustment')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Room Count Total Adjustment')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                </React.Fragment>
              ))}
            </tr>

            {/* Gross Living Area */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Gross Living Area</td>
              <td className="border border-gray-400 p-1">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <EditableField
                    fieldPath={['Subject', 'Gross Living Area']}
                    value={getSubjectVal('Gross Living Area')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !getSubjectVal('Gross Living Area')}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName="Subject"
                  />
                  <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Sq. Ft.</span>
                </div>
              </td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <EditableField
                        fieldPath={[rent, 'Gross Living Area']}
                        value={getRentVal(rent, 'Gross Living Area')}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && !getRentVal(rent, 'Gross Living Area')}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                      <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Sq. Ft.</span>
                    </div>
                  </td>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Gross Living Area Adjustment']}
                      value={getRentVal(rent, 'Gross Living Area Adjustment')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Gross Living Area Adjustment')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                </React.Fragment>
              ))}
            </tr>

            {/* Other (e.g., basement, etc.) */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Other (e.g., basement, etc.)</td>
              <td className="border border-gray-400 p-1">
                <EditableField
                  fieldPath={['Subject', 'Other (e.g., basement, etc.)']}
                  value={getSubjectVal('Other (e.g., basement, etc.)')}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isMissing={extractionAttempted && !getSubjectVal('Other (e.g., basement, etc.)')}
                  isEditable={isEditable}
                  manualValidations={manualValidations}
                  revisionHandlers={revisionHandlers}
                  handleManualValidation={handleManualValidation}
                  allData={allData}
                  saleName="Subject"
                />
              </td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Other (e.g., basement, etc.)']}
                      value={getRentVal(rent, 'Other (e.g., basement, etc.)')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Other (e.g., basement, etc.)')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Other (e.g., basement, etc.) Adjustment']}
                      value={getRentVal(rent, 'Other (e.g., basement, etc.) Adjustment')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Other (e.g., basement, etc.) Adjustment')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                </React.Fragment>
              ))}
            </tr>

            {/* Other: */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Other:</td>
              <td className="border border-gray-400 p-1">
                <EditableField
                  fieldPath={['Subject', 'Other:']}
                  value={getSubjectVal('Other:')}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isMissing={extractionAttempted && !getSubjectVal('Other:')}
                  isEditable={isEditable}
                  manualValidations={manualValidations}
                  revisionHandlers={revisionHandlers}
                  handleManualValidation={handleManualValidation}
                  allData={allData}
                  saleName="Subject"
                />
              </td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Other:']}
                      value={getRentVal(rent, 'Other:')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Other:')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Other: Adjustment']}
                      value={getRentVal(rent, 'Other: Adjustment')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && !getRentVal(rent, 'Other: Adjustment')}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                </React.Fragment>
              ))}
            </tr>

            {/* Net Adj. (total) */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Net Adj. (total)</td>
              <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
              {activeComparableRents.map((rent, idx) => {
                const rawVal = String(getRentVal(rent, 'Net Adj. (total)') || '').trim();
                const isPlus = rawVal.startsWith('+') || (parseFloat(rawVal.replace(/,/g, '')) > 0 && !rawVal.startsWith('-'));
                const isMinus = rawVal.startsWith('-') || parseFloat(rawVal.replace(/,/g, '')) < 0;
                const cleanDisplay = rawVal.replace(/[+-]/g, '').trim();

                return (
                  <React.Fragment key={idx}>
                    <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                    <td className="border border-gray-400 p-1">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <input type="checkbox" checked={isPlus} readOnly disabled style={{ transform: 'scale(0.8)', margin: 0 }} />+
                          <input type="checkbox" checked={isMinus} readOnly disabled style={{ transform: 'scale(0.8)', margin: 0 }} />-
                        </span>
                        <span>$</span>
                        <EditableField
                          fieldPath={[rent, 'Net Adj. (total)']}
                          value={cleanDisplay}
                          onDataChange={handleDataChange}
                          editingField={editingField}
                          setEditingField={setEditingField}
                          isMissing={extractionAttempted && !rawVal}
                          isEditable={isEditable}
                          manualValidations={manualValidations}
                          revisionHandlers={revisionHandlers}
                          handleManualValidation={handleManualValidation}
                          allData={allData}
                          saleName={rent}
                        />
                      </div>
                    </td>
                  </React.Fragment>
                );
              })}
            </tr>

            {/* Indicated Monthly Market Rent */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Indicated Monthly Market Rent</td>
              <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                  <td className="border border-gray-400 p-1">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>$</span>
                      <EditableField
                        fieldPath={[rent, 'Indicated Monthly Market Rent']}
                        value={getRentVal(rent, 'Indicated Monthly Market Rent')}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && !getRentVal(rent, 'Indicated Monthly Market Rent')}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                    </div>
                  </td>
                </React.Fragment>
              ))}
            </tr>

            {/* Reconciliation TO BE $ (Bracketing) Row */}
            {(() => {
              const fullData = (allData && Object.keys(allData).length > 0) ? allData : (data || {});
              const toBeVal =
                fullData?.['Comparable Rent Schedule Reconciliation']?.['TO BE $'] ??
                fullData?.clean_data?.['Comparable Rent Schedule Reconciliation']?.['TO BE $'] ??
                fullData?.RENT_SCHEDULE_RECONCILIATION?.['TO BE $'] ??
                fullData?.clean_data?.RENT_SCHEDULE_RECONCILIATION?.['TO BE $'] ??
                fullData?.['Rent Schedule Reconciliation']?.['TO BE $'] ??
                fullData?.clean_data?.['Rent Schedule Reconciliation']?.['TO BE $'] ??
                fullData?.['Single Family Rent Schedule']?.['TO BE $'] ??
                fullData?.clean_data?.['Single Family Rent Schedule']?.['TO BE $'] ??
                fullData?.['Comparable Rent Schedule']?.['TO BE $'] ??
                fullData?.clean_data?.['Comparable Rent Schedule']?.['TO BE $'] ??
                fullData?.['TO BE $'] ??
                fullData?.clean_data?.['TO BE $'] ??
                data?.['TO BE $'] ??
                '';

              const toBeRent = getRentScheduleToBeValue(fullData, toBeVal);
              const bracketingResult = checkRentScheduleToBeBracketing('TO BE $', toBeRent, fullData);
              const isError = bracketingResult?.isError;

              return (
                <tr
                  style={{
                    backgroundColor: isError ? '#ffebee' : '#f1f8e9',
                    borderTop: '2px solid #005A9C'
                  }}
                >
                  <td className="border border-gray-400 p-2 font-bold bg-light" style={{ fontWeight: 'bold' }}>
                    <div>TO BE $</div>
                    <div style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 'normal' }}>
                      (Reconciliation Bracketing)
                    </div>
                  </td>
                  <td
                    className="border border-gray-400 p-1"
                    style={{
                      backgroundColor: isError ? '#ffcdd2' : '#c8e6c9',
                      verticalAlign: 'middle'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>$</span>
                      <EditableField
                        fieldPath={['Comparable Rent Schedule Reconciliation', 'TO BE $']}
                        value={toBeVal}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && !toBeVal}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={fullData}
                        saleName="Subject"
                      />
                    </div>
                    {bracketingResult && (
                      <div
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          marginTop: '2px',
                          color: isError ? '#b71c1c' : '#1b5e20'
                        }}
                      >
                        {isError ? '⚠️ Unbracketed' : '✓ Bracketed'}
                      </div>
                    )}
                  </td>
                  {activeComparableRents.map((rent, idx) => {
                    const compObj = getRentalCompObject(rent);
                    const rawCompRent = compObj ? (
                      compObj['Indicated Monthly Market Rent'] ||
                      compObj['Indicated Monthly Market Rent $'] ||
                      compObj['INDICATED MONTHLY MARKET RENT'] ||
                      compObj['Indicated Market Rent'] ||
                      compObj['Adjusted Monthly Rent'] ||
                      ''
                    ) : '';
                    const compRent = parseRentalAmount(rawCompRent);
                    let pctInfo = null;
                    if (toBeRent && compRent && compRent > 0) {
                      const pct = ((compRent - toBeRent) / toBeRent) * 100;
                      const sign = pct > 0 ? '+' : '';
                      pctInfo = `${sign}${pct.toFixed(1)}%`;
                    }

                    return (
                      <td
                        key={idx}
                        colSpan={2}
                        className="border border-gray-400 p-2 text-center align-middle"
                        style={{
                          backgroundColor: isError ? '#fff5f5' : '#f9fbf9',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        <Tooltip
                          title={
                            compRent
                              ? `${rent} Indicated Monthly Market Rent: $${compRent.toLocaleString()}${pctInfo ? ` (${pctInfo} vs TO BE $)` : ''}`
                              : `${rent} Indicated Monthly Market Rent not available`
                          }
                          arrow
                        >
                          <div>
                            {compRent ? (
                              <>
                                <div>${compRent.toLocaleString()}</div>
                                {pctInfo && (
                                  <div
                                    style={{
                                      fontSize: '0.72rem',
                                      color: pctInfo.startsWith('+') ? '#0d6efd' : '#495057',
                                      fontWeight: 'normal'
                                    }}
                                  >
                                    ({pctInfo})
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </div>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComparableRentScheduleSection;
