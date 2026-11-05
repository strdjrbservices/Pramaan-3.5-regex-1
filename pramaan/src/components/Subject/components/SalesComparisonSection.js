import React from 'react';
import { EditableField } from './FormComponents';
import { Tooltip, IconButton, Paper, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { getOpinionOfMarketValue, getComparableSalesPrices, evaluateBracketing } from '../../../validations/salesComparisonValidation';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';


const SalesComparisonSection = ({
  id = "sales-comparison",
  data,
  extractionAttempted,
  handleDataChange,
  editingField,
  setEditingField,
  salesGridRows,
  comparableSales,
  salesHistoryFields,
  salesComparisonAdditionalInfoFields,
  formType,
  isEditable = true,
  allData,
  manualValidations,
  handleManualValidation,
  onRevisionButtonClick,
  revisionHandlers
}) => {
  extractionAttempted = false;

  const getCompData = (sale) => {
    if (!data || typeof data !== 'object') return {};
    if (data[sale] && typeof data[sale] === 'object') return data[sale];
    if (data.SALES_GRID && data.SALES_GRID[sale] && typeof data.SALES_GRID[sale] === 'object') return data.SALES_GRID[sale];
    const noSpace = typeof sale === 'string' ? sale.replace('# ', '#') : sale;
    const withSpace = typeof sale === 'string' ? sale.replace('#', '# ') : sale;
    if (data[noSpace] && typeof data[noSpace] === 'object') return data[noSpace];
    if (data[withSpace] && typeof data[withSpace] === 'object') return data[withSpace];
    if (data.SALES_GRID && data.SALES_GRID[noSpace] && typeof data.SALES_GRID[noSpace] === 'object') return data.SALES_GRID[noSpace];
    if (data.SALES_GRID && data.SALES_GRID[withSpace] && typeof data.SALES_GRID[withSpace] === 'object') return data.SALES_GRID[withSpace];
    return {};
  };

  const getSubjectData = () => {
    if (!data || typeof data !== 'object') return {};
    const s1 = (typeof data.Subject === 'object' && data.Subject) || {};
    const s2 = (typeof data.SUBJECT === 'object' && data.SUBJECT) || {};
    const s3 = (data.SALES_GRID && typeof data.SALES_GRID.Subject === 'object' && data.SALES_GRID.Subject) || {};
    const s4 = (data['Sales Grid'] && typeof data['Sales Grid'].Subject === 'object' && data['Sales Grid'].Subject) || {};
    const s5 = (data.sales_grid && typeof data.sales_grid.Subject === 'object' && data.sales_grid.Subject) || {};
    const merged = {};
    [s2, s3, s4, s5, s1].forEach(source => {
      Object.keys(source).forEach(key => {
        if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
          merged[key] = source[key];
        } else if (!(key in merged)) {
          merged[key] = source[key];
        }
      });
    });
    return merged;
  };

  const subjectObj = getSubjectData();
  const fullData = allData || data;

  const getAdditionalFieldValue = (field) => {
    if (data && data[field] !== undefined && data[field] !== null && data[field] !== '') return data[field];
    if (data?.SALES_TRANSFER && data.SALES_TRANSFER[field] !== undefined && data.SALES_TRANSFER[field] !== '') return data.SALES_TRANSFER[field];
    if (data?.SALES_GRID && data.SALES_GRID[field] !== undefined && data.SALES_GRID[field] !== '') return data.SALES_GRID[field];
    if (data?.RECONCILIATION && data.RECONCILIATION[field] !== undefined && data.RECONCILIATION[field] !== '') return data.RECONCILIATION[field];
    const noDollar = typeof field === 'string' ? field.replace(/\s*\$\s*$/, '') : field;
    const withDollar = typeof field === 'string' && !field.endsWith('$') ? `${field} $` : field;
    if (data?.[noDollar] !== undefined && data[noDollar] !== '') return data[noDollar];
    if (data?.[withDollar] !== undefined && data[withDollar] !== '') return data[withDollar];
    if (allData) {
      if (allData[field] !== undefined && allData[field] !== null && allData[field] !== '') return allData[field];
      if (allData.SALES_TRANSFER && allData.SALES_TRANSFER[field] !== undefined && allData.SALES_TRANSFER[field] !== '') return allData.SALES_TRANSFER[field];
      if (allData.SALES_GRID && allData.SALES_GRID[field] !== undefined && allData.SALES_GRID[field] !== '') return allData.SALES_GRID[field];
      if (allData.RECONCILIATION && allData.RECONCILIATION[field] !== undefined && allData.RECONCILIATION[field] !== '') return allData.RECONCILIATION[field];
      if (allData[noDollar] !== undefined && allData[noDollar] !== '') return allData[noDollar];
      if (allData[withDollar] !== undefined && allData[withDollar] !== '') return allData[withDollar];
    }
    return '';
  };

  return (
    <>
      <Paper id={id} elevation={3} sx={{ mb: 4, mt: 4, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <Typography variant="subtitle1" fontWeight="bold">Sales Comparison Approach</Typography>
          {onRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'white', ml: 'auto' }}><LibraryBooksIcon /></IconButton>
            </Tooltip>
          )}
        </Box>
        {/* {bracketingResult && (
          <Box sx={{ p: 1.5, pb: 0 }}>
            <Alert
              severity={bracketingResult.isError ? "error" : "success"}
              sx={{
                fontWeight: 500,
                fontSize: '0.875rem'
              }}
            >
              <strong>{bracketingResult.isError ? "Bracketing Error:" : "Bracketing Status:"}</strong> {bracketingResult.message}
            </Alert>
          </Box>
        )} */}
        <TableContainer>
          <Table size="small" aria-label="sales comparison table" className="sales-comparison-table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', minWidth: '200px', backgroundColor: 'action.hover' }}>Feature</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: '200px', backgroundColor: 'action.hover' }}>Subject</TableCell>
                {comparableSales.map((sale, idx) => (
                  <TableCell key={idx} sx={{ fontWeight: 'bold', minWidth: '200px', backgroundColor: 'action.hover' }}>{sale}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {salesGridRows.map((row, idx) => {
                const isHighlighted = row.label === 'Date of Sale/Time';
                const isFirstAdjustment = row.valueKey === "Sales or Financing Concessions" || row.valueKey === "Sales Concessions";
                const isFirstUnitBreakdown = row.isUnitBreakdown && row.unitNumber === 1;

                const renderRow = () => {
                  if (row.isUnitBreakdown) {
                    const u = row.unitNumber;
                    const totKey = `Unit Breakdown Tot Unit # ${u}`;
                    const brKey = `Unit Breakdown Br Unit # ${u}`;
                    const baKey = `Unit Breakdown Ba Unit # ${u}`;
                    const adjKey = `Unit Breakdown Adjustment Unit # ${u}`;

                    return (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: 'medium', borderRight: '1px solid rgba(224, 224, 224, 1)', pl: 3 }}>
                          Unit #{u}
                        </TableCell>

                        <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <EditableField fieldPath={['Subject', totKey]} value={subjectObj[totKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Tot" />
                            <EditableField fieldPath={['Subject', brKey]} value={subjectObj[brKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Br" />
                            <EditableField fieldPath={['Subject', baKey]} value={subjectObj[baKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Ba" />
                          </div>
                        </TableCell>

                        {comparableSales.map((sale, cidx) => {
                          const compVal = getCompData(sale);
                          return (
                            <TableCell key={cidx} sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <EditableField fieldPath={[sale, totKey]} value={compVal[totKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Tot" />
                                <EditableField fieldPath={[sale, brKey]} value={compVal[brKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Br" />
                                <EditableField fieldPath={[sale, baKey]} value={compVal[baKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Ba" />
                                <EditableField fieldPath={[sale, adjKey]} value={compVal[adjKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} isAdjustment={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Adj" />
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  }

                  let mostCommonLeasehold = null;
                  let leaseholdInconsistent = false;
                  if (row.label === "Leasehold/Fee Simple") {
                    const allValues = [subjectObj[row.valueKey], ...comparableSales.map(sale => getCompData(sale)[row.valueKey])].filter(Boolean);
                    if (allValues.length > 0) {
                      const valueCounts = allValues.reduce((acc, value) => {
                        acc[value] = (acc[value] || 0) + 1;
                        return acc;
                      }, {});
                      mostCommonLeasehold = Object.keys(valueCounts).reduce((a, b) => valueCounts[a] > valueCounts[b] ? a : b);
                      const uniqueValues = new Set(allValues);
                      if (uniqueValues.size > 1) leaseholdInconsistent = true;
                    }
                  }

                  const subjectValue = row.label === "Verification Source(s)"
                    ? (comparableSales.map(sale => getCompData(sale)[row.valueKey]).find(Boolean) || subjectObj[row.valueKey] || '')
                    : (row.subjectValueKey ? (data[row.subjectValueKey] || subjectObj[row.subjectValueKey] || subjectObj[row.valueKey] || '') : (subjectObj[row.valueKey] || data[row.valueKey] || ''));

                  const subjectStyle = {};
                  if (extractionAttempted && !subjectValue) {
                    subjectStyle.border = '2px solid red';
                  }
                  const subjectLeaseholdValue = subjectObj[row.valueKey] || '';
                  if (leaseholdInconsistent && subjectLeaseholdValue && subjectLeaseholdValue !== mostCommonLeasehold) {
                    subjectStyle.backgroundColor = 'red';
                  }

                  return (
                    <TableRow key={idx} sx={isHighlighted ? { backgroundColor: 'action.selected' } : {}}>
                      <TableCell sx={{ fontWeight: 'medium', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{row.label}</TableCell>
                      <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)', ...subjectStyle }}>
                        {!row.isAdjustmentOnly && (
                          <EditableField
                            fieldPath={row.subjectValueKey ? [row.subjectValueKey] : ['Subject', row.valueKey]}
                            value={subjectValue}
                            onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                            isMissing={extractionAttempted && !subjectValue}
                            isEditable={true}
                            allData={allData || data}
                            saleName={'Subject'}
                            manualValidations={manualValidations}
                            handleManualValidation={handleManualValidation}
                            revisionHandlers={revisionHandlers}
                          />
                        )}
                        {row.adjustmentKey && (
                          <EditableField
                            fieldPath={['Subject', row.adjustmentKey]} value={subjectObj[row.adjustmentKey] || ''}
                            onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                            isMissing={extractionAttempted && (!subjectObj[row.adjustmentKey] || subjectObj[row.adjustmentKey] === '')}
                            isEditable={true} isAdjustment={true}
                            allData={allData || data}
                            saleName={'Subject'}
                            manualValidations={manualValidations}
                            handleManualValidation={handleManualValidation}
                            revisionHandlers={revisionHandlers}
                          />
                        )}
                      </TableCell>
                      {comparableSales.map((sale, cidx) => {
                        const compObj = getCompData(sale);
                        const compValue = compObj[row.valueKey] ?? compObj[row.valueKey?.replace('of Comparable', 'of Comparables')] ?? compObj[row.valueKey?.replace('of Comparables', 'of Comparable')] ?? '';
                        const rawAdjValue = compObj[row.adjustmentKey] ?? (row.adjustmentKey === 'Baths Adjustment' ? compObj['Bathrooms Adjustment'] : undefined);
                        let adjValue = (rawAdjValue !== undefined && rawAdjValue !== null) ? String(rawAdjValue) : '';
                        if (!adjValue && compObj['Above Grade Room Count Adjustment']) {
                          const rcAdj = compObj['Above Grade Room Count Adjustment'];
                          const subjBed = String(subjectObj?.['Bedrooms'] || '').trim();
                          const compBed = String(compObj?.['Bedrooms'] || '').trim();
                          const subjBath = String(subjectObj?.['Baths'] || '').trim();
                          const compBath = String(compObj?.['Baths'] || '').trim();
                          if (row.adjustmentKey === 'Bedrooms Adjustment' && compBed && subjBed && compBed !== subjBed && compBath === subjBath) {
                            adjValue = rcAdj;
                          } else if (row.adjustmentKey === 'Baths Adjustment' && compBath && subjBath && compBath !== subjBath && compBed === subjBed) {
                            adjValue = rcAdj;
                          }
                        }
                        const cellStyle = {};
                        if (extractionAttempted && !row.isAdjustmentOnly && (!compObj || (compValue === undefined || compValue === ''))) {
                          cellStyle.border = '2px solid red';
                        }

                        return (
                          <TableCell key={cidx} sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)', ...cellStyle }}>
                            {!row.isAdjustmentOnly && (
                              <EditableField
                                fieldPath={[sale, row.valueKey]}
                                value={compValue}
                                onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                isMissing={extractionAttempted && (!compValue || compValue === '')}
                                isEditable={true}
                                allData={allData || data}
                                saleName={sale}
                                manualValidations={manualValidations}
                                handleManualValidation={handleManualValidation}
                                revisionHandlers={revisionHandlers}
                              />
                            )}
                            {row.adjustmentKey && (
                              <EditableField
                                fieldPath={[sale, row.adjustmentKey]}
                                value={adjValue}
                                onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                isMissing={extractionAttempted && (!adjValue || adjValue === '')}
                                isEditable={true}
                                isAdjustment={true}
                                allData={allData || data}
                                saleName={sale}
                                manualValidations={manualValidations}
                                handleManualValidation={handleManualValidation}
                                revisionHandlers={revisionHandlers}
                              />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                };

                return (
                  <React.Fragment key={idx}>
                    {isFirstAdjustment && (
                      <TableRow key={`adj-header-${idx}`} sx={{ backgroundColor: '#f3f4f6' }}>
                        <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>VALUE ADJUSTMENTS</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)', textAlign: 'center' }}>DESCRIPTION</TableCell>
                        {comparableSales.map((sale, cidx) => (
                          <TableCell key={cidx} sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)', textAlign: 'center' }}>DESCRIPTION / ADJ</TableCell>
                        ))}
                      </TableRow>
                    )}
                    {isFirstUnitBreakdown && (
                      <TableRow key={`unit-header-${idx}`} sx={{ backgroundColor: '#f3f4f6' }}>
                        <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>Unit Breakdown</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)', textAlign: 'center' }}>Total / Br / Ba</TableCell>
                        {comparableSales.map((sale, cidx) => (
                          <TableCell key={cidx} sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)', textAlign: 'center' }}>Total / Br / Ba / Adj</TableCell>
                        ))}
                      </TableRow>
                    )}
                    {renderRow()}
                  </React.Fragment>
                );
              })}
              {(() => {
                const finalVal = getOpinionOfMarketValue(fullData);
                const { salePrices, adjPrices } = getComparableSalesPrices(fullData);
                if (!finalVal && salePrices.length === 0 && adjPrices.length === 0) return null;

                const evalSale = evaluateBracketing ? evaluateBracketing(finalVal, salePrices, 'Sale Price') : { isBracketed: true, summary: '' };
                const evalAdj = evaluateBracketing ? evaluateBracketing(finalVal, adjPrices, 'Adjusted Sale Price') : { isBracketed: true, summary: '' };
                const isSaleError = !evalSale.isBracketed;
                const isAdjError = !evalAdj.isBracketed;

                const getPctData = (val) => {
                  if (!finalVal || !val) return null;
                  const cleanNum = parseFloat(String(val).replace(/[^0-9.]/g, ''));
                  if (isNaN(cleanNum) || cleanNum <= 0) return null;
                  const pct = ((cleanNum - finalVal) / finalVal) * 100;
                  const sign = pct > 0 ? '+' : '';
                  return {
                    cleanNum,
                    pct,
                    str: sign + pct.toFixed(1) + '%'
                  };
                };

                return (
                  <React.Fragment>
                    {/* Row 1: Sale Price (Bracketing) */}
                    <TableRow
                      key="bracketing-sale-row"
                      sx={{
                        backgroundColor: isSaleError ? '#ffebee' : '#f1f8e9',
                        borderTop: '2px solid rgba(224, 224, 224, 1)'
                      }}
                    >
                      <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                        <div>Opinion of Market Value</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isSaleError ? '#c62828' : '#2e7d32' }}>
                          Sale Price (Bracketing)
                        </div>
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 'bold',
                          borderRight: '1px solid rgba(224, 224, 224, 1)',
                          backgroundColor: isSaleError ? '#ffcdd2' : '#c8e6c9',
                          color: isSaleError ? '#b71c1c' : '#1b5e20'
                        }}
                      >
                        <Tooltip title={evalSale?.summary || (isSaleError ? 'Unbracketed by Sale Price' : 'Bracketed by Sale Price')} arrow>
                          <span>
                            {finalVal ? `$${finalVal.toLocaleString()}` : 'N/A'}
                            {isSaleError ? ' ⚠️ (Unbracketed)' : ' ✓ (Bracketed)'}
                          </span>
                        </Tooltip>
                      </TableCell>
                      {comparableSales.map((sale, cidx) => {
                        const compObj = getCompData(sale);
                        const sp = compObj['Sale Price'] || compObj['Sale Price $'] || '';
                        const spData = getPctData(sp);

                        return (
                          <TableCell
                            key={cidx}
                            sx={{
                              borderRight: '1px solid rgba(224, 224, 224, 1)',
                              fontSize: '0.8rem',
                              backgroundColor: isSaleError ? 'rgba(255, 235, 238, 0.4)' : undefined
                            }}
                          >
                            <div><strong>Sale:</strong> {sp || 'N/A'}{spData ? ` (${spData.str})` : ''}</div>
                          </TableCell>
                        );
                      })}
                    </TableRow>

                    {/* Row 2: Adjusted Sale Price (Bracketing) */}
                    <TableRow
                      key="bracketing-adj-row"
                      sx={{
                        backgroundColor: isAdjError ? '#ffebee' : '#f1f8e9',
                        borderTop: '1px solid rgba(224, 224, 224, 0.7)'
                      }}
                    >
                      <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                        <div>Opinion of Market Value</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isAdjError ? '#c62828' : '#2e7d32' }}>
                          Adjusted Sale Price (Bracketing)
                        </div>
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 'bold',
                          borderRight: '1px solid rgba(224, 224, 224, 1)',
                          backgroundColor: isAdjError ? '#ffcdd2' : '#c8e6c9',
                          color: isAdjError ? '#b71c1c' : '#1b5e20'
                        }}
                      >
                        <Tooltip title={evalAdj?.summary || (isAdjError ? 'Unbracketed by Adjusted Sale Price' : 'Bracketed by Adjusted Sale Price')} arrow>
                          <span>
                            {finalVal ? `$${finalVal.toLocaleString()}` : 'N/A'}
                            {isAdjError ? ' ⚠️ (Unbracketed)' : ' ✓ (Bracketed)'}
                          </span>
                        </Tooltip>
                      </TableCell>
                      {comparableSales.map((sale, cidx) => {
                        const compObj = getCompData(sale);
                        const asp = compObj['Adjusted Sale Price of Comparable'] || compObj['Adjusted Sale Price of Comparable $'] || compObj['Adjusted Sale Price'] || '';
                        const aspData = getPctData(asp);

                        return (
                          <TableCell
                            key={cidx}
                            sx={{
                              borderRight: '1px solid rgba(224, 224, 224, 1)',
                              fontSize: '0.8rem',
                              backgroundColor: isAdjError ? 'rgba(255, 235, 238, 0.4)' : undefined
                            }}
                          >
                            <div><strong>Adj:</strong> {asp || 'N/A'}{aspData ? ` (${aspData.str})` : ''}</div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </React.Fragment>
                );
              })()}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {formType !== 'Appraisal Version #1' && (
        <Paper elevation={3} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: 'info.main', color: 'white', px: 2, py: 1.5, position: 'sticky', top: 0, zIndex: 10 }}>
            <Typography variant="subtitle1" fontWeight="bold">Sales or Transfer History</Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableBody>
                {salesComparisonAdditionalInfoFields.map((field, index) => (
                  <TableRow key={index} hover>
                    <TableCell sx={{ width: '50%' }}>{field}</TableCell>
                    <TableCell>
                      <EditableField
                        fieldPath={[field]}
                        value={getAdditionalFieldValue(field)}
                        onDataChange={(path, val) => handleDataChange(path, val)} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[field] || data[field] === '')}
                        allData={allData || data}
                        isEditable={true}
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                        revisionHandlers={revisionHandlers}
                        showBlankValidation={field === 'Indicated Value by Sales Comparison Approach' ? false : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {formType !== 'Appraisal Version #1' && (
        <Paper id="prior-sale-history-grid" elevation={3} sx={{ mb: 4, mt: 4, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: 'grey.900', color: 'white', px: 2, py: 1.5, position: 'sticky', top: 0, zIndex: 10 }}>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>Feature</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>Subject</TableCell>
                  {comparableSales.map((sale, idx) => (
                    <TableCell key={idx} sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>{sale}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {salesHistoryFields.map((feature, idx) => {
                  const subjectVal =
                    subjectObj[feature] ||
                    (data.Subject && data.Subject[feature]) ||
                    (data.SUBJECT && data.SUBJECT[feature]) ||
                    (data['Sales Grid']?.Subject && data['Sales Grid'].Subject[feature]) ||
                    (data.SALES_GRID?.Subject && data.SALES_GRID.Subject[feature]) ||
                    (data.sales_grid?.Subject && data.sales_grid.Subject[feature]) ||
                    data[feature] ||
                    data[`Prior Sale History: ${feature}`] ||
                    '';

                  return (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ fontWeight: 'medium' }}>{feature}</TableCell>
                      <TableCell>
                        <EditableField
                          fieldPath={['Subject', feature]}
                          value={subjectVal}
                          onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                          isMissing={extractionAttempted && !subjectVal}
                          allData={allData || data}
                          isEditable={true}
                          manualValidations={manualValidations}
                          handleManualValidation={handleManualValidation}
                        />
                      </TableCell>
                      {comparableSales.map((sale, cidx) => {
                        const compData = getCompData(sale);
                        const compVal = compData[feature] || (data[sale] && data[sale][feature]) || data[`${sale} ${feature}`] || '';
                        return (
                          <TableCell key={cidx}>
                            <EditableField
                              fieldPath={[sale, feature]}
                              value={compVal}
                              onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                              isMissing={extractionAttempted && !compVal}
                              allData={allData || data}
                              isEditable={true}
                              manualValidations={manualValidations}
                              handleManualValidation={handleManualValidation}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </>
  );
};

export default SalesComparisonSection;
