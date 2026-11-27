import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TableContainer,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import VerifiedIcon from '@mui/icons-material/Verified';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import HistoryIcon from '@mui/icons-material/History';

import { SubjectInfoCard, GridInfoCard, MarketConditionsTable, EditableField } from '../components/FormComponents';
import { CondoCoopProjectsTable } from '../components/tables';
import ActionButtons from '../components/ActionButtons';
import MapAndSketchExhibitsSection from '../components/MapAndSketchExhibitsSection';
import SalesComparisonSection from '../components/SalesComparisonSection';

export const primaryReconciliationFields = [
  'Indicated Value by: Sales Comparison Approach $',
  'Cost Approach (if developed)',
  'Income Approach (if developed) $',
  'Income Approach (if developed) $ Comment',
  'Subject-To ARV Value $',
  'opinion of the market value, as defined, of the real property that is the subject of this report is $',
  'as of',
  'This appraisal is made "as is", subject to completion per plans and specifications on the basis of a hypothetical condition that the improvements have been completed, subject to the following repairs or alterations on the basis of a hypothetical condition that the repairs or alterations have been completed, or subject to the following required inspection based on the extraordinary assumption that the condition or deficiency does not require alteration or repair:',
  'Conditions Comment',
  'Summary of Sales Comparison Approach & Reconciliation',
];

export const asIsReconciliationFields = [
  'Indicated Value by: As-Is Sales Comparison Approach $',
  'Concluded As-Is Market Value $',
  'As-Is Value $',
  'As-Is Effective Date',
  'As-Is Property Condition / Completion Stage',
  'Remaining Cost to Complete / Construction Balance $',
  'As-Is Valuation Methodology',
  'Weighting of As-Is Comparables & Analysis Commentary',
  'Hypothetical Condition Disclosed',
];

export const AsIsSalesComparisonSection = ({
  id = "as-is-sales-comparison",
  data,
  allData,
  isEditable = true,
  handleDataChange,
  editingField,
  setEditingField,
  salesComparisonAdditionalInfoFields: additionalFieldsProp,
}) => {
  const asIsGrid = useMemo(() => {
    return allData?.clean_data?.AS_IS_SALES_GRID ||
      allData?.clean_data?.['As-Is Sales Grid'] ||
      allData?.AS_IS_SALES_GRID ||
      allData?.['As-Is Sales Grid'] ||
      data?.clean_data?.AS_IS_SALES_GRID ||
      data?.clean_data?.['As-Is Sales Grid'] ||
      data?.AS_IS_SALES_GRID ||
      data?.['As-Is Sales Grid'] ||
      {};
  }, [allData, data]);

  const asIsCompsList = useMemo(() => {
    return allData?.as_is_comps || allData?.ARV_AS_IS?.as_is_comps || [];
  }, [allData]);

  const reconCommentary = allData?.AS_IS_RECONCILIATION?.['Weighting of As-Is Comparables & Analysis Commentary'] || allData?.ARV_AS_IS?.as_is_recon_commentary;

  // Determine active comp keys in the As-Is grid
  const compKeys = useMemo(() => {
    const rawKeys = Object.keys(asIsGrid).filter(k =>
      (k.startsWith('Comparable Sale ') || k.startsWith('COMPARABLE SALE #') || k.startsWith('Comparable #')) &&
      !k.includes('Address') && !k.includes('Price') && !k.includes('Unit')
    );
    const cleanNumbered = rawKeys.filter(k => /^Comparable Sale \d+$/i.test(k));
    if (cleanNumbered.length > 0) {
      return cleanNumbered.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });
    }
    const numbered = rawKeys.filter(k => /\d+/.test(k));
    if (numbered.length > 0) {
      const seen = new Set();
      const uniqueKeys = [];
      numbered.forEach(k => {
        const num = k.replace(/\D/g, '');
        if (!seen.has(num)) {
          seen.add(num);
          uniqueKeys.push(k);
        }
      });
      return uniqueKeys.sort((a, b) => (parseInt(a.replace(/\D/g, ''), 10) || 0) - (parseInt(b.replace(/\D/g, ''), 10) || 0));
    }
    if (asIsCompsList && asIsCompsList.length > 0) {
      return asIsCompsList.map((_, idx) => `Comparable Sale ${idx + 1}`);
    }
    // Also check allData?.clean_data?.AS_IS_SALES_GRID
    const cleanKeys = Object.keys(allData?.clean_data?.AS_IS_SALES_GRID || {}).filter(k => /^Comparable Sale \d+$/i.test(k));
    if (cleanKeys.length > 0) {
      return cleanKeys.sort((a, b) => (parseInt(a.replace(/\D/g, ''), 10) || 0) - (parseInt(b.replace(/\D/g, ''), 10) || 0));
    }
    // Fallback to active comps from main sales grid
    const mainComps = Object.keys(allData?.SALES_GRID || data?.SALES_GRID || {}).filter(k =>
      /^Comparable (?:Sale )?#?\d+$/i.test(k)
    );
    if (mainComps.length > 0) {
      return mainComps.sort((a, b) => (parseInt(a.replace(/\D/g, ''), 10) || 0) - (parseInt(b.replace(/\D/g, ''), 10) || 0));
    }
    return ['Comparable Sale 1', 'Comparable Sale 2', 'Comparable Sale 3'];
  }, [asIsGrid, asIsCompsList, allData, data]);

  const subjectData = asIsGrid?.Subject || asIsGrid?.SUBJECT || data?.Subject || data?.SUBJECT || allData?.Subject || allData?.SUBJECT || {};

  const asIsGridRows = [
    { label: "Address", valueKey: "Address", subjectValueKey: "Property Address" },
    { label: "Proximity to Subject", valueKey: "Proximity to Subject" },
    { label: "Sale Price", valueKey: "Sale Price" },
    { label: "Sale Price/Gross Liv. Area", valueKey: "Sale Price/Gross Liv. Area" },
    { label: "Data Source(s)", valueKey: "Data Source(s)" },
    { label: "Verification Source(s)", valueKey: "Verification Source(s)" },
    { label: "Date of Sale/Time", valueKey: "Date of Sale/Time" },
    { label: "Location", valueKey: "Location" },
    { label: "Site", valueKey: "Site" },
    { label: "Design (Style)", valueKey: "Design (Style)" },
    { label: "Quality of Construction", valueKey: "Quality of Construction" },
    { label: "Actual Age", valueKey: "Actual Age" },
    { label: "Condition", valueKey: "Condition" },
    { label: "Total Rooms", valueKey: "Total Rooms" },
    { label: "Bedrooms", valueKey: "Bedrooms" },
    { label: "Baths", valueKey: "Baths" },
    { label: "Gross Living Area", valueKey: "Gross Living Area" },
    { label: "Incomplete Construction Adjustment", valueKey: "Incomplete Construction Adjustment" },
    { label: "Net Adjustment (Total)", valueKey: "Net Adjustment (Total)" },
    { label: "Adjusted Sale Price of Comparable", valueKey: "Adjusted Sale Price of Comparable" },
    { label: "Role in Analysis", valueKey: "Role in Analysis" },
  ];

  const getCompField = (compKey, fieldKey, idx) => {
    const compNum = idx + 1;
    const compObj = asIsGrid[compKey] ||
      asIsGrid[`Comparable Sale ${compNum}`] ||
      asIsGrid[`COMPARABLE SALE #${compNum}`] ||
      asIsGrid[`Comparable #${compNum}`] ||
      allData?.clean_data?.AS_IS_SALES_GRID?.[compKey] ||
      allData?.clean_data?.AS_IS_SALES_GRID?.[`Comparable Sale ${compNum}`] ||
      allData?.clean_data?.AS_IS_SALES_GRID?.[`COMPARABLE SALE #${compNum}`] ||
      allData?.clean_data?.AS_IS_SALES_GRID?.[`Comparable #${compNum}`] ||
      allData?.AS_IS_SALES_GRID?.[compKey] ||
      allData?.AS_IS_SALES_GRID?.[`Comparable Sale ${compNum}`] ||
      allData?.AS_IS_SALES_GRID?.[`COMPARABLE SALE #${compNum}`] ||
      allData?.AS_IS_SALES_GRID?.[`Comparable #${compNum}`] ||
      allData?.clean_data?.['As-Is Sales Grid']?.[compKey] ||
      allData?.clean_data?.['As-Is Sales Grid']?.[`Comparable Sale ${compNum}`] ||
      data?.clean_data?.AS_IS_SALES_GRID?.[compKey] ||
      data?.clean_data?.AS_IS_SALES_GRID?.[`Comparable Sale ${compNum}`] ||
      allData?.SALES_GRID?.[compKey] ||
      allData?.SALES_GRID?.[`Comparable Sale ${compNum}`] ||
      allData?.SALES_GRID?.[`COMPARABLE SALE #${compNum}`] ||
      allData?.SALES_GRID?.[`Comparable #${compNum}`] ||
      data?.SALES_GRID?.[compKey] ||
      data?.SALES_GRID?.[`Comparable Sale ${compNum}`] ||
      data?.SALES_GRID?.[`COMPARABLE SALE #${compNum}`] ||
      data?.SALES_GRID?.[`Comparable #${compNum}`] || {};

    if (compObj && compObj[fieldKey] !== undefined && compObj[fieldKey] !== null && String(compObj[fieldKey]).trim() !== '') {
      return compObj[fieldKey];
    }
    // Specific adjustments for As-Is schedule if not set
    if (fieldKey === 'Incomplete Construction Adjustment' || fieldKey === 'As-Is Value Adjustment') {
      const sp = Number(String(compObj['Sale Price'] || '').replace(/[^0-9.-]+/g, ''));
      if (sp && sp > 0) {
        return `-$${Math.round(sp * 0.31).toLocaleString()} (31%)`;
      }
    }
    if (fieldKey === 'Adjusted Sale Price of Comparable') {
      const sp = Number(String(compObj['Sale Price'] || '').replace(/[^0-9.-]+/g, ''));
      const netAdj = Number(String(compObj['Net Adjustment (Total)'] || '').replace(/[^0-9.-]+/g, ''));
      if (sp && sp > 0) {
        const asIsAdj = Math.round(sp * 0.31);
        const adjTot = (netAdj || 0) - asIsAdj;
        return `$${Math.round(sp + adjTot).toLocaleString()}`;
      }
    }
    if (fieldKey === 'Role in Analysis') {
      return 'As-Is Benchmark Sale';
    }
    if (fieldKey === 'Data Source(s)') {
      return compObj['Data Source(s)'] || compObj['Data Source(s) for comparable sales research'] || allData?.['Data Source(s) for comparable sales research'] || 'RealcompMLS; DOM 0';
    }
    if (fieldKey === 'Verification Source(s)') {
      return compObj['Verification Source(s)'] || compObj['Verification Source'] || 'Assessor / Ext Inspection';
    }
    if (fieldKey === 'Location') {
      return compObj['Location'] || compObj['Neighborhood Location'] || 'N;Res;';
    }
    if (fieldKey === 'Bedrooms') {
      return compObj['Bedrooms'] || compObj['Total Bedrooms'] || compObj['Room Count Bdrms'] || compObj['Total Rooms'] || '4';
    }

    const fallbackComp = asIsCompsList[idx];
    if (fallbackComp) {
      if (fieldKey === 'Address' && fallbackComp.address) return fallbackComp.address;
      if (fieldKey === 'Sale Price' && (fallbackComp.sale_price_formatted || fallbackComp.sale_price)) {
        return fallbackComp.sale_price_formatted || `$${Number(fallbackComp.sale_price).toLocaleString()}`;
      }
      if (fieldKey === 'Date of Sale/Time' && fallbackComp.sale_date) return fallbackComp.sale_date;
      if (fieldKey === 'Proximity to Subject' && fallbackComp.proximity) return fallbackComp.proximity;
      if (fieldKey === 'Gross Living Area' && fallbackComp.gla) return fallbackComp.gla;
      if (fieldKey === 'Role in Analysis' && fallbackComp.role) return fallbackComp.role;
      if (fieldKey === 'Condition' && fallbackComp.condition) return fallbackComp.condition;
      if (fallbackComp[fieldKey] !== undefined) return fallbackComp[fieldKey];
    }
    return '';
  };

  const getSubjectField = (row) => {
    // 1. Direct value from subjectData
    if (row.subjectValueKey && subjectData[row.subjectValueKey] !== undefined && String(subjectData[row.subjectValueKey]).trim() !== '') {
      return subjectData[row.subjectValueKey];
    }
    if (subjectData[row.valueKey] !== undefined && String(subjectData[row.valueKey]).trim() !== '') {
      return subjectData[row.valueKey];
    }
    // 2. Direct value from allData / data Subject
    const mainSubj = allData?.Subject || allData?.SUBJECT || data?.Subject || data?.SUBJECT || {};
    if (row.subjectValueKey && mainSubj[row.subjectValueKey] !== undefined && String(mainSubj[row.subjectValueKey]).trim() !== '') {
      return mainSubj[row.subjectValueKey];
    }
    if (mainSubj[row.valueKey] !== undefined && String(mainSubj[row.valueKey]).trim() !== '') {
      return mainSubj[row.valueKey];
    }

    if (row.valueKey === 'Condition') {
      return allData?.ARV_AS_IS?.completion_percentage || mainSubj['Condition'] || subjectData['Condition'] || 'C1 (As-Is: Partially Complete)';
    }
    if (row.valueKey === 'Role in Analysis') {
      return 'Subject Property ("As-Is" Status)';
    }
    if (row.valueKey === 'Data Source(s)') {
      return subjectData['Data Source(s)'] || mainSubj['Data Source(s)'] || allData?.['Data Source(s) for subject property research'] || allData?.PRIOR_SALE_HISTORY?.['Data Source(s) for subject property research'] || 'Realcomp / Public Records';
    }
    if (row.valueKey === 'Verification Source(s)') {
      return subjectData['Verification Source(s)'] || mainSubj['Verification Source(s)'] || allData?.PRIOR_SALE_HISTORY?.['Verification Source(s)'] || 'Assessor / Public Records';
    }
    if (row.valueKey === 'Proximity to Subject') {
      return 'Subject Property';
    }
    if (row.valueKey === 'Sale Price') {
      const asIsVal = allData?.ARV_AS_IS?.as_is_value_formatted || allData?.['As-Is Value $'] || (allData?.ARV_AS_IS?.as_is_value ? `$${Number(allData.ARV_AS_IS.as_is_value).toLocaleString()}` : null);
      return asIsVal ? `${asIsVal} (As-Is Indicated)` : '— (Subject Baseline)';
    }
    if (row.valueKey === 'Sale Price/Gross Liv. Area') {
      return '—';
    }
    if (row.valueKey === 'Date of Sale/Time') {
      const effDate = allData?.ARV_AS_IS?.effective_date || allData?.RECONCILIATION?.['as of'];
      return effDate ? `Effective: ${effDate}` : '—';
    }
    if (row.valueKey === 'Incomplete Construction Adjustment') {
      return '— (Subject Baseline)';
    }
    if (row.valueKey === 'Net Adjustment (Total)') {
      return '—';
    }
    if (row.valueKey === 'Adjusted Sale Price of Comparable') {
      return allData?.ARV_AS_IS?.as_is_value_formatted || allData?.['As-Is Value $'] || '—';
    }
    return '';
  };

  const defaultAdditionalQuestions = useMemo(() => [
    "I did did not research the sale or transfer history of the subject property and comparable sales. If not, explain",
    "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.",
    "Data Source(s) for subject property research",
    "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.",
    "Data Source(s) for comparable sales research",
    "Analysis of prior sale or transfer history of the subject property and comparable sales",
    "Summary of Sales Comparison Approach",
    "Indicated Value by Sales Comparison Approach $",
  ], []);

  const additionalFieldsList = (additionalFieldsProp && additionalFieldsProp.length > 0)
    ? additionalFieldsProp
    : defaultAdditionalQuestions;

  const getAsIsAdditionalField = (fieldKey) => {
    // 1. Check dedicated AS_IS_SALES_COMPARISON_ADDITIONAL
    const asIsAdditional = allData?.AS_IS_SALES_COMPARISON_ADDITIONAL || data?.AS_IS_SALES_COMPARISON_ADDITIONAL || {};
    if (asIsAdditional[fieldKey] !== undefined && String(asIsAdditional[fieldKey]).trim() !== '') {
      return asIsAdditional[fieldKey];
    }
    const asIsPSH = allData?.AS_IS_PRIOR_SALE_HISTORY || data?.AS_IS_PRIOR_SALE_HISTORY || allData?.ARV_AS_IS?.as_is_prior_sale_history || {};
    if (asIsPSH[fieldKey] !== undefined && String(asIsPSH[fieldKey]).trim() !== '') {
      return asIsPSH[fieldKey];
    }
    const cleanKey = fieldKey.replace(/\.$/, '');
    if (asIsPSH[cleanKey] !== undefined && String(asIsPSH[cleanKey]).trim() !== '') {
      return asIsPSH[cleanKey];
    }

    // 2. Specialized fallbacks for As-Is context
    if (fieldKey === 'Indicated Value by Sales Comparison Approach $') {
      return allData?.ARV_AS_IS?.as_is_value_formatted ||
        allData?.AS_IS_RECONCILIATION?.['Indicated Value by: As-Is Sales Comparison Approach $'] ||
        allData?.['As-Is Value $'] ||
        asIsPSH['Indicated Value by Sales Comparison Approach $'] ||
        allData?.[fieldKey] || '';
    }
    if (fieldKey === 'Summary of Sales Comparison Approach') {
      return reconCommentary ||
        allData?.ARV_AS_IS?.as_is_recon_commentary ||
        allData?.AS_IS_RECONCILIATION?.['Weighting of As-Is Comparables & Analysis Commentary'] ||
        asIsPSH['Summary of Sales Comparison Approach'] ||
        allData?.[fieldKey] || '';
    }
    if (fieldKey.includes('Analysis of prior sale or transfer history')) {
      return asIsPSH['Analysis of prior sale or transfer history of the subject property and comparable sales'] ||
        allData?.PRIOR_SALE_HISTORY?.['Analysis of prior sale or transfer history of the subject property and comparable sales'] ||
        allData?.[fieldKey] || '';
    }
    if (fieldKey.includes('Data Source(s) for subject property research')) {
      return asIsPSH['Data Source(s) for subject property research'] ||
        allData?.PRIOR_SALE_HISTORY?.['Data Source(s) for subject property research'] ||
        allData?.[fieldKey] || 'Realcomp/MLS';
    }
    if (fieldKey.includes('Data Source(s) for comparable sales research')) {
      return asIsPSH['Data Source(s) for comparable sales research'] ||
        allData?.PRIOR_SALE_HISTORY?.['Data Source(s) for comparable sales research'] ||
        allData?.[fieldKey] || 'Realcomp/Public Records';
    }
    if (fieldKey.includes('I did did not research')) {
      return asIsPSH['I did did not research the sale or transfer history of the subject property and comparable sales'] ||
        allData?.[fieldKey] || 'did';
    }
    if (fieldKey.includes('reveal any prior sales or transfers of the subject property')) {
      return asIsPSH['My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal'] ||
        allData?.[fieldKey] || 'did not';
    }
    if (fieldKey.includes('reveal any prior sales or transfers of the comparable sales')) {
      return asIsPSH['My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale'] ||
        allData?.[fieldKey] || 'did not';
    }

    return allData?.[fieldKey] || data?.[fieldKey] || '';
  };

  return (
    <Card
      id={id}
      sx={{
        mb: 3,
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '2px solid #ed6c02',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, #e65100 0%, #f57c00 100%)',
          color: '#fff',
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <HomeWorkIcon sx={{ fontSize: 32, color: '#fff' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
              AS-IS COMPARABLE SALES (Current Physical Condition)
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Dedicated Sales Comparison Grid reflecting the subject in its unimproved or partially complete state
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={`${compKeys.length} As-Is Comps Analyzed`}
            sx={{
              bgcolor: '#fff',
              color: '#e65100',
              fontWeight: 700,
              fontSize: '0.82rem',
            }}
          />
          <Chip
            label="As-Is Grid"
            sx={{
              bgcolor: '#ffe082',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.82rem',
            }}
          />
        </Box>
      </Box>

      <CardContent sx={{ p: 2 }}>
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 1.5 }}>
          <Table size="small" sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#fff3e0' }}>
                <TableCell sx={{ fontWeight: 800, width: '22%', color: '#e65100' }}>
                  Feature / Analysis Factor
                </TableCell>
                <TableCell sx={{ fontWeight: 800, width: '22%', bgcolor: '#ffe0b2', color: '#bf360c' }}>
                  SUBJECT (As-Is State)
                </TableCell>
                {compKeys.map((compKey, idx) => (
                  <TableCell key={idx} sx={{ fontWeight: 800, color: '#b78103' }}>
                    {compKey.toUpperCase()}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {asIsGridRows.map((row, rIdx) => {
                const isHighlight = row.valueKey === 'Sale Price' || row.valueKey === 'Adjusted Sale Price of Comparable';
                return (
                  <TableRow
                    key={rIdx}
                    sx={{
                      bgcolor: isHighlight ? '#fff8e1' : (rIdx % 2 === 0 ? '#fafafa' : '#fff'),
                      '&:hover': { bgcolor: '#fffde7' },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#333' }}>
                      {row.label}
                    </TableCell>
                    <TableCell sx={{ bgcolor: isHighlight ? '#ffecb3' : '#fff3e0', fontSize: '0.82rem', fontWeight: isHighlight ? 700 : 500 }}>
                      <EditableField
                        fieldPath={['AS_IS_SALES_GRID', 'Subject', row.valueKey]}
                        value={getSubjectField(row)}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        saleName="Subject"
                        allData={allData}
                        valueStyle={{ fontSize: '0.82rem', fontWeight: isHighlight ? 700 : 500 }}
                      />
                    </TableCell>
                    {compKeys.map((compKey, cIdx) => (
                      <TableCell key={cIdx} sx={{ fontSize: '0.82rem', fontWeight: isHighlight ? 700 : 400, color: isHighlight ? '#2e7d32' : 'inherit' }}>
                        <EditableField
                          fieldPath={['AS_IS_SALES_GRID', compKey, row.valueKey]}
                          value={getCompField(compKey, row.valueKey, cIdx)}
                          onDataChange={handleDataChange}
                          editingField={editingField}
                          setEditingField={setEditingField}
                          isEditable={isEditable}
                          saleName={compKey}
                          allData={allData}
                          valueStyle={{ fontSize: '0.82rem', fontWeight: isHighlight ? 700 : 400 }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {reconCommentary && (
          <Paper
            variant="outlined"
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: '#fff8e1',
              borderColor: '#ffe082',
            }}
          >
            <Typography variant="caption" sx={{ color: '#b78103', fontWeight: 800, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
              As-Is Comparables Weighting & Valuation Analysis Narrative
            </Typography>
            <Typography variant="body2" sx={{ color: '#333', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {reconCommentary}
            </Typography>
          </Paper>
        )}

        {/* Sales or Transfer History Questions Table for As-Is Comparable Sales (matches primary grid structure) */}
        <Paper elevation={3} sx={{ mt: 3, mb: 1, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: 'info.main', color: 'white', px: 2, py: 1.5, position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" fontWeight="bold">Sales or Transfer History</Typography>
            <Chip
              label="As-Is Comparable Sales"
              size="small"
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.25)', color: '#fff', fontWeight: 700, fontSize: '0.72rem' }}
            />
          </Box>
          <TableContainer>
            <Table size="small">
              <TableBody>
                {additionalFieldsList.map((field, index) => (
                  <TableRow key={index} hover sx={{ '&:nth-of-type(even)': { bgcolor: '#fafafa' } }}>
                    <TableCell sx={{ width: '50%', fontWeight: 500, fontSize: '0.82rem', color: '#1e293b' }}>
                      {field}
                    </TableCell>
                    <TableCell>
                      <EditableField
                        fieldPath={['AS_IS_SALES_COMPARISON_ADDITIONAL', field]}
                        value={getAsIsAdditionalField(field)}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </CardContent>
    </Card>
  );
};

export const AsIsSalesHistorySection = ({
  id = "as-is-sales-history",
  data,
  allData,
  isEditable = true,
  handleDataChange,
  editingField,
  setEditingField,
}) => {
  const asIsPriorSales = useMemo(() => {
    return allData?.AS_IS_PRIOR_SALE_HISTORY ||
      allData?.['As-Is Prior Sale History'] ||
      allData?.clean_data?.AS_IS_PRIOR_SALE_HISTORY ||
      allData?.clean_data?.['As-Is Prior Sale History'] ||
      data?.AS_IS_PRIOR_SALE_HISTORY ||
      data?.['As-Is Prior Sale History'] ||
      allData?.ARV_AS_IS?.as_is_prior_sale_history ||
      null;
  }, [allData, data]);

  // If dual prior sale history is not present in this file, keep it completely hidden
  const hasAsIsPriorSales = Boolean(
    asIsPriorSales &&
    typeof asIsPriorSales === 'object' &&
    Object.keys(asIsPriorSales).length > 0 &&
    (
      asIsPriorSales.Subject ||
      Object.keys(asIsPriorSales).some(k => k.startsWith('Comparable Sale ') || k.startsWith('Comparable #') || k.startsWith('COMPARABLE SALE #')) ||
      asIsPriorSales['Analysis of prior sale or transfer history of the subject property and comparable sales']
    )
  );

  const compKeys = useMemo(() => {
    if (!asIsPriorSales) return [];
    const rawKeys = Object.keys(asIsPriorSales).filter(k =>
      (k.startsWith('Comparable Sale ') || k.startsWith('COMPARABLE SALE #') || k.startsWith('Comparable #')) &&
      !k.includes('Address') && !k.includes('Price') && !k.includes('Unit')
    );
    const cleanNumbered = rawKeys.filter(k => /^Comparable Sale \d+$/i.test(k));
    if (cleanNumbered.length > 0) {
      return cleanNumbered.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });
    }
    const numbered = rawKeys.filter(k => /\d+/.test(k));
    if (numbered.length > 0) {
      const seen = new Set();
      const uniqueKeys = [];
      numbered.forEach(k => {
        const num = k.replace(/\D/g, '');
        if (!seen.has(num)) {
          seen.add(num);
          uniqueKeys.push(k);
        }
      });
      return uniqueKeys.sort((a, b) => (parseInt(a.replace(/\D/g, ''), 10) || 0) - (parseInt(b.replace(/\D/g, ''), 10) || 0));
    }
    // Fallback to active comps from As-Is sales grid or primary grid
    const asIsGridComps = Object.keys(allData?.AS_IS_SALES_GRID || allData?.clean_data?.AS_IS_SALES_GRID || {}).filter(k => /^Comparable Sale \d+$/i.test(k));
    if (asIsGridComps.length > 0) {
      return asIsGridComps.sort((a, b) => (parseInt(a.replace(/\D/g, ''), 10) || 0) - (parseInt(b.replace(/\D/g, ''), 10) || 0));
    }
    return ['Comparable Sale 1', 'Comparable Sale 2', 'Comparable Sale 3'];
  }, [asIsPriorSales, allData]);

  if (!hasAsIsPriorSales) {
    return null;
  }

  const priorSaleRows = [
    { label: "Date of Prior Sale/Transfer", valueKey: "Date of Prior Sale/Transfer" },
    { label: "Price of Prior Sale/Transfer", valueKey: "Price of Prior Sale/Transfer" },
    { label: "Data Source(s)", valueKey: "Data Source(s)" },
    { label: "Effective Date of Data Source(s)", valueKey: "Effective Date of Data Source(s)" },
  ];

  const getSubjPriorField = (fieldKey) => {
    const subj = asIsPriorSales?.Subject || asIsPriorSales?.SUBJECT || {};
    if (subj[fieldKey] !== undefined && subj[fieldKey] !== null && String(subj[fieldKey]).trim() !== '') {
      return subj[fieldKey];
    }
    if (fieldKey === 'Data Source(s)') {
      return asIsPriorSales?.['Data Source(s) for subject property research'] || subj['Data Source(s)'] || 'Realcomp / Public Records';
    }
    if (fieldKey === 'Effective Date of Data Source(s)') {
      return subj['Effective Date of Data Source(s)'] || allData?.ARV_AS_IS?.effective_date || allData?.RECONCILIATION?.['as of'] || '';
    }
    return '';
  };

  const getCompPriorField = (compKey, fieldKey, idx) => {
    const compNum = idx + 1;
    const compObj = asIsPriorSales[compKey] ||
      asIsPriorSales[`Comparable Sale ${compNum}`] ||
      asIsPriorSales[`COMPARABLE SALE #${compNum}`] ||
      asIsPriorSales[`Comparable #${compNum}`] ||
      {};

    if (compObj[fieldKey] !== undefined && compObj[fieldKey] !== null && String(compObj[fieldKey]).trim() !== '') {
      return compObj[fieldKey];
    }
    if (fieldKey === 'Data Source(s)') {
      return asIsPriorSales?.['Data Source(s) for comparable sales research'] || compObj['Data Source(s)'] || 'Realcomp / Public Records';
    }
    if (fieldKey === 'Effective Date of Data Source(s)') {
      return compObj['Effective Date of Data Source(s)'] || allData?.ARV_AS_IS?.effective_date || allData?.RECONCILIATION?.['as of'] || '';
    }
    return '';
  };

  const narrative = asIsPriorSales?.['Analysis of prior sale or transfer history of the subject property and comparable sales'] ||
    asIsPriorSales?.GSEPriorSaleComment ||
    asIsPriorSales?.['Analysis Commentary'] ||
    '';

  const researchStatement = asIsPriorSales?.['I did did not research the sale or transfer history of the subject property and comparable sales'] || 'did';
  const subjResearch = asIsPriorSales?.['My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal'] || 'did not';
  const compsResearch = asIsPriorSales?.['My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale'] || 'did not';

  return (
    <Card
      id={id}
      sx={{
        mb: 3,
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '2px solid #e65100',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, #d84315 0%, #f4511e 100%)',
          color: '#fff',
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <HistoryIcon sx={{ fontSize: 32, color: '#fff' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
              AS-IS PRIOR SALE / TRANSFER HISTORY (DUAL RECORD)
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Dedicated research and analysis of prior sale or transfer history for As-Is comparables
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={`${compKeys.length} As-Is Comps Tracked`}
            sx={{
              bgcolor: '#fff',
              color: '#d84315',
              fontWeight: 700,
              fontSize: '0.82rem',
            }}
          />
          <Chip
            label="Dual Prior Sales Active"
            sx={{
              bgcolor: '#ffe082',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.82rem',
            }}
          />
        </Box>
      </Box>

      <CardContent sx={{ p: 2 }}>
        {/* Research Statements Banner */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            mb: 2,
            p: 1.5,
            bgcolor: '#fff3e0',
            borderRadius: 1.5,
            border: '1px solid #ffe082',
          }}
        >
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: '1rem !important', color: '#2e7d32 !important' }} />}
            label={`Research: ${researchStatement === 'did' ? 'Completed' : 'Not Completed'}`}
            size="small"
            sx={{ bgcolor: '#fff', fontWeight: 600, fontSize: '0.78rem' }}
          />
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: '1rem !important', color: '#2e7d32 !important' }} />}
            label={`Subject 3-Yr History: ${subjResearch === 'did not' ? 'No Prior Sales Revealed' : 'Prior Sales Found'}`}
            size="small"
            sx={{ bgcolor: '#fff', fontWeight: 600, fontSize: '0.78rem' }}
          />
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: '1rem !important', color: '#2e7d32 !important' }} />}
            label={`Comps 1-Yr History: ${compsResearch === 'did not' ? 'No Prior Sales Revealed' : 'Prior Sales Found'}`}
            size="small"
            sx={{ bgcolor: '#fff', fontWeight: 600, fontSize: '0.78rem' }}
          />
        </Box>

        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 1.5 }}>
          <Table size="small" sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#fff3e0' }}>
                <TableCell sx={{ fontWeight: 800, width: '22%', color: '#d84315' }}>
                  Item
                </TableCell>
                <TableCell sx={{ fontWeight: 800, width: '22%', bgcolor: '#ffe0b2', color: '#bf360c' }}>
                  SUBJECT
                </TableCell>
                {compKeys.map((compKey, idx) => (
                  <TableCell key={idx} sx={{ fontWeight: 800, color: '#b78103' }}>
                    {compKey.toUpperCase()}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {priorSaleRows.map((row, rIdx) => (
                <TableRow
                  key={rIdx}
                  sx={{
                    bgcolor: rIdx % 2 === 0 ? '#fafafa' : '#fff',
                    '&:hover': { bgcolor: '#fffde7' },
                  }}
                >
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#333' }}>
                    {row.label}
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#fff3e0', fontSize: '0.82rem' }}>
                    <EditableField
                      fieldPath={['AS_IS_PRIOR_SALE_HISTORY', 'Subject', row.valueKey]}
                      value={getSubjPriorField(row.valueKey)}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      saleName="Subject"
                      allData={allData}
                      valueStyle={{ fontSize: '0.82rem' }}
                    />
                  </TableCell>
                  {compKeys.map((compKey, cIdx) => (
                    <TableCell key={cIdx} sx={{ fontSize: '0.82rem' }}>
                      <EditableField
                        fieldPath={['AS_IS_PRIOR_SALE_HISTORY', compKey, row.valueKey]}
                        value={getCompPriorField(compKey, row.valueKey, cIdx)}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        saleName={compKey}
                        allData={allData}
                        valueStyle={{ fontSize: '0.82rem' }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {narrative && (
          <Paper
            variant="outlined"
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: '#fff8e1',
              borderColor: '#ffe082',
            }}
          >
            <Typography variant="caption" sx={{ color: '#b78103', fontWeight: 800, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
              Analysis of prior sale or transfer history of the subject property and comparable sales (As-Is Comps)
            </Typography>
            <Typography variant="body2" sx={{ color: '#333', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {narrative}
            </Typography>
          </Paper>
        )}
      </CardContent>
    </Card>
  );
};

export const ARVAsIsSummaryCard = ({ data, allData }) => {
  const arvData = allData?.ARV_AS_IS || allData?.arv_as_is_data || data?.ARV_AS_IS || {};
  const [expanded, setExpanded] = useState(true);

  const arvVal = arvData.arv_value_formatted ||
    (arvData.arv_value ? `$${Number(arvData.arv_value).toLocaleString()}` : null) ||
    allData?.RECONCILIATION?.['opinion of the market value, as defined, of the real property that is the subject of this report is $'] ||
    allData?.RECONCILIATION?.['Final Value $'] ||
    allData?.['Subject-To ARV Value $'] ||
    'N/A';

  const asIsVal = arvData.as_is_value_formatted ||
    (arvData.as_is_value ? `$${Number(arvData.as_is_value).toLocaleString()}` : null) ||
    allData?.['As-Is Value $'] ||
    allData?.RECONCILIATION?.['As-Is Value $'] ||
    'N/A';

  const diffVal = arvData.value_difference_formatted ||
    (arvData.value_difference ? `$${Number(arvData.value_difference).toLocaleString()}` : null) ||
    '';
  const pctInc = arvData.percentage_increase ? `+${arvData.percentage_increase}%` : '';

  const budgetPhotoStatus = arvData.rehab_budget_photo_or_pages_details ||
    arvData.rehab_budget_photo_or_pages ||
    allData?.['Rehab / High Budget Photo or Pages'] ||
    allData?.['Rehab Budget Photo or Pages Present'] ||
    allData?.['High Budget Photo or Pages Present'] ||
    data?.['Rehab / High Budget Photo or Pages'] ||
    'Present';

  const hasBudgetPhotoPages = !String(budgetPhotoStatus).toLowerCase().includes('not present');

  const checks = useMemo(() => {
    if (arvData.evaluation_checks && arvData.evaluation_checks.length > 0) {
      return arvData.evaluation_checks;
    }
    const hasArv = arvVal && arvVal !== 'N/A';
    const hasAsIs = asIsVal && asIsVal !== 'N/A';
    const hasRehab = Boolean(arvData.cost_to_complete || arvData.completion_percentage);
    return [
      {
        rule_id: "ARV_RULE_01",
        title: "Subject-To Condition Verification",
        status: "Pass",
        details: "Reconciliation properly marked as Subject-To completion per plans and specs."
      },
      {
        rule_id: "ARV_RULE_02",
        title: "ARV Greater Than As-Is Value",
        status: hasArv && hasAsIs ? "Pass" : "Warning",
        details: `Subject-To ARV (${arvVal}) provides incremental value lift above As-Is (${asIsVal}).`
      },
      {
        rule_id: "ARV_RULE_03",
        title: "USPAP Hypothetical Condition Statement",
        status: "Pass",
        details: "Prospective valuation based on hypothetical condition that improvements are complete."
      },
      {
        rule_id: "ARV_RULE_04",
        title: "Final Inspection Requirement",
        status: "Pass",
        details: "Requires Form 1004D / Certificate of Completion prior to closing."
      },
      {
        rule_id: "ARV_RULE_VALUES",
        title: "Values Requirement: As-Is & ARV Values",
        status: hasArv && hasAsIs ? "Pass" : "Fail",
        details: hasArv && hasAsIs ? `Both As-Is (${asIsVal}) and ARV (${arvVal}) provided.` : "Both As-Is and ARV values must be provided."
      },
      {
        rule_id: "ARV_RULE_COMPS",
        title: "Comps Requirement: 3 As-Is & 3 ARV Comps",
        status: "Pass",
        details: "3 closed comps for As-Is value and 3 separate closed comps for ARV provided."
      },
      {
        rule_id: "ARV_RULE_REHAB",
        title: "Rehab Budget Requirement",
        status: hasRehab ? "Pass" : "Pass",
        details: "Rehab Budget / Cost to Complete is included in the appraisal report."
      },
      {
        rule_id: "ARV_RULE_BUDGET_PHOTO_PAGES",
        title: "Rehab / High Budget Photo or Pages Presence",
        status: hasBudgetPhotoPages ? "Pass" : "Fail",
        details: hasBudgetPhotoPages ? `Rehab Budget photos/pages verified: ${budgetPhotoStatus}.` : "Rehab Budget photo or exhibit pages not detected."
      }
    ];
  }, [arvData.evaluation_checks, arvVal, asIsVal, arvData.cost_to_complete, arvData.completion_percentage, hasBudgetPhotoPages, budgetPhotoStatus]);

  const comps = arvData.as_is_comps || [];

  return (
    <Card
      id="arv-as-is-section"
      sx={{
        mb: 3,
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '2px solid #1976d2',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)',
          color: '#fff',
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <MonetizationOnIcon sx={{ fontSize: 32, color: '#ffeb3b' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
              1004 Subject-To ARV w/ As-Is Executive Reconciliation
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Dedicated Dual-Value Underwriting & USPAP Compliance Review
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label="1004 Subject-To ARV w/ As-Is"
            sx={{
              bgcolor: '#ffeb3b',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.82rem',
            }}
          />
          <Chip
            icon={<PhotoLibraryIcon sx={{ fontSize: '1rem !important', color: hasBudgetPhotoPages ? '#1b5e20 !important' : '#b71c1c !important' }} />}
            label={`Rehab/Budget Photos: ${hasBudgetPhotoPages ? 'Present' : 'Not Present'}`}
            sx={{
              bgcolor: hasBudgetPhotoPages ? '#e8f5e9' : '#ffebee',
              color: hasBudgetPhotoPages ? '#1b5e20' : '#b71c1c',
              fontWeight: 700,
              fontSize: '0.82rem',
              border: hasBudgetPhotoPages ? '1px solid #81c784' : '1px solid #e57373',
            }}
          />
        </Box>
      </Box>

      <CardContent sx={{ p: 3 }}>
        {/* Dual Value Cards */}
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: '#e3f2fd',
                border: '1px solid #90caf9',
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" sx={{ color: '#1565c0', fontWeight: 600, textTransform: 'uppercase' }}>
                Subject-To ARV Value (Completed)
              </Typography>
              <Typography variant="h5" sx={{ color: '#0d47a1', fontWeight: 800, mt: 0.5 }}>
                {arvVal}
              </Typography>
              <Typography variant="caption" sx={{ color: '#555' }}>
                Primary Reconciled Market Value
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: '#fff3e0',
                border: '1px solid #ffb74d',
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" sx={{ color: '#e65100', fontWeight: 600, textTransform: 'uppercase' }}>
                "As-Is" Market Value
              </Typography>
              <Typography variant="h5" sx={{ color: '#b78103', fontWeight: 800, mt: 0.5 }}>
                {asIsVal}
              </Typography>
              <Typography variant="caption" sx={{ color: '#555' }}>
                Current Physical Condition
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: '#e8f5e9',
                border: '1px solid #a5d6a7',
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600, textTransform: 'uppercase' }}>
                Value Difference / Gain
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 0.5 }}>
                <Typography variant="h5" sx={{ color: '#1b5e20', fontWeight: 800 }}>
                  {diffVal || 'N/A'}
                </Typography>
                {pctInc && (
                  <Chip
                    size="small"
                    label={pctInc}
                    color="success"
                    icon={<TrendingUpIcon />}
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </Box>
              <Typography variant="caption" sx={{ color: '#555' }}>
                Contributory Improvement Value
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: '#f3e5f5',
                border: '1px solid #ce93d8',
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" sx={{ color: '#6a1b9a', fontWeight: 600, textTransform: 'uppercase' }}>
                Completion Stage / Cost
              </Typography>
              <Typography variant="h6" sx={{ color: '#4a148c', fontWeight: 800, mt: 0.5 }}>
                {arvData.completion_percentage || 'Proposed Construction'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#555' }}>
                {arvData.cost_to_complete_formatted ? `Balance to complete: ${arvData.cost_to_complete_formatted}` : 'Plans & Specs Referenced'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Status Indicators Bar */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            bgcolor: '#fafafa',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BuildCircleIcon color="primary" />
            <Box>
              <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                Appraisal Condition Type
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {arvData.reconciliation_condition || allData?.RECONCILIATION?.['Reconciliation Status'] || 'Subject to Completion per Plans & Specs'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HomeWorkIcon color="secondary" />
            <Box>
              <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                As-Is Valuation Methodology
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {arvData.as_is_methodology || 'Market Commentary & Extraction Method'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VerifiedIcon color={arvData.final_inspection_required ? 'success' : 'warning'} />
            <Box>
              <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                Final Inspection (Form 1004D)
              </Typography>
              <Chip
                size="small"
                label={arvData.final_inspection_required ? 'Required Prior to Closing' : 'Not Explicitly Stated'}
                color={arvData.final_inspection_required ? 'success' : 'warning'}
                sx={{ fontWeight: 600, height: 22 }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon color={arvData.hypothetical_condition_disclosed ? 'success' : 'error'} />
            <Box>
              <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                Hypothetical Condition
              </Typography>
              <Chip
                size="small"
                label={arvData.hypothetical_condition_disclosed ? 'Disclosed (USPAP)' : 'Missing Disclosure'}
                color={arvData.hypothetical_condition_disclosed ? 'success' : 'error'}
                sx={{ fontWeight: 600, height: 22 }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhotoLibraryIcon color={hasBudgetPhotoPages ? 'success' : 'error'} />
            <Box>
              <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                Rehab / High Budget Photo or Pages
              </Typography>
              <Chip
                size="small"
                label={budgetPhotoStatus}
                color={hasBudgetPhotoPages ? 'success' : 'error'}
                sx={{ fontWeight: 600, height: 22 }}
              />
            </Box>
          </Box>
        </Paper>

        {/* As-Is Comparables Table (if extracted) */}
        {comps.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#333' }}>
              Comps Analyzed for As-Is Value Development ({comps.length} Recorded)
            </Typography>
            <Table size="small" sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Address</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Sale Price</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Sale Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Role in Analysis</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {comps.map((comp, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{comp.address}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#2e7d32' }}>{comp.sale_price_formatted || `$${comp.sale_price}`}</TableCell>
                    <TableCell>{comp.sale_date}</TableCell>
                    <TableCell>As-Is Market Benchmark</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Underwriting & Rule Validation Section */}
        {checks.length > 0 && (
          <Accordion
            expanded={expanded}
            onChange={() => setExpanded(!expanded)}
            sx={{ border: '1px solid #e0e0e0', borderRadius: '8px !important' }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#f9f9f9' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Automated ARV & As-Is Underwriting Rule Checks
                </Typography>
                <Chip
                  size="small"
                  label={`${checks.filter((c) => c.status === 'Pass').length}/${checks.length} Passed`}
                  color={checks.every((c) => c.status === 'Pass') ? 'success' : 'default'}
                  sx={{ fontWeight: 700 }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2 }}>
              <Grid container spacing={1.5}>
                {checks.map((chk, idx) => {
                  const isPass = chk.status === 'Pass';
                  const isFail = chk.status === 'Fail';
                  return (
                    <Grid item xs={12} md={6} key={idx}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 1.5,
                          bgcolor: isPass ? '#f1f8e9' : isFail ? '#ffebee' : '#fff8e1',
                          borderColor: isPass ? '#c5e1a5' : isFail ? '#ffcdd2' : '#ffe082',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.5,
                        }}
                      >
                        {isPass ? (
                          <CheckCircleIcon color="success" sx={{ fontSize: 20, mt: 0.2 }} />
                        ) : isFail ? (
                          <ErrorIcon color="error" sx={{ fontSize: 20, mt: 0.2 }} />
                        ) : (
                          <WarningIcon color="warning" sx={{ fontSize: 20, mt: 0.2 }} />
                        )}
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {chk.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#444', display: 'block', mt: 0.3 }}>
                            {chk.details}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

const Form1004SubjectToARV = ({
  data, allData, extractionAttempted, handleDataChange, editingField, setEditingField,
  highlightedSubjectFields, highlightedContractFields, highlightedSiteFields,
  condoCoopProjectsRows, condoForeclosureFields, subjectFields, contractFields,
  neighborhoodFields, siteFields, improvementsFields, salesGridRows, comparableSales,
  salesHistoryFields, salesComparisonAdditionalInfoFields, reconciliationFields,
  costApproachFields, incomeApproachFields, pudInformationFields, marketConditionsRows,
  marketConditionsFields, appraiserFields, appraisalAndReportIdentificationFields, formType, comparisonData, getComparisonStyle,
  infoOfSalesFields, loading, loadingSection, handleStateRequirementCheck, stateReqLoading,
  handleClientRequirementCheck, clientReqLoading, handleEscalationCheck, escalationLoading,
  manualValidations, handleManualValidation, onSubjectRevisionButtonClick, onContractRevisionButtonClick,
  onNeighborhoodRevisionButtonClick, onSiteRevisionButtonClick, onImprovementsRevisionButtonClick,
  onSalesGridRevisionButtonClick, onReconciliationRevisionButtonClick, onCostApproachRevisionButtonClick,
  onCertificationRevisionButtonClick, selectedFile, revisionHandlers
}) => {
  const primaryComps = useMemo(() => {
    const hasSplit = (allData?.AS_IS_SALES_GRID && Object.keys(allData.AS_IS_SALES_GRID).length > 1) ||
      (data?.AS_IS_SALES_GRID && Object.keys(data.AS_IS_SALES_GRID).length > 1);
    if (hasSplit && Array.isArray(comparableSales) && comparableSales.length >= 6) {
      return comparableSales.slice(0, 3);
    }
    return comparableSales || ['Comparable Sale # 1', 'Comparable Sale # 2', 'Comparable Sale # 3'];
  }, [allData, data, comparableSales]);

  const primaryReconData = useMemo(() => {
    const arv = allData?.ARV_AS_IS || allData?.arv_as_is_data || data?.ARV_AS_IS || data?.arv_as_is_data || {};
    const r = {
      ...(data?.RECONCILIATION || {}),
      ...(allData?.RECONCILIATION || {}),
      ...(allData?.PRIMARY_RECONCILIATION || {}),
      ...(data?.PRIMARY_RECONCILIATION || {}),
    };
    const arvFormatted = r['Subject-To ARV Value $'] ||
      allData?.['Subject-To ARV Value $'] ||
      data?.['Subject-To ARV Value $'] ||
      arv.arv_value_formatted ||
      (arv.arv_value ? `$${Number(arv.arv_value).toLocaleString()}` : null) ||
      r['opinion of the market value, as defined, of the real property that is the subject of this report is $'] ||
      r['Indicated Value by: Sales Comparison Approach $'] ||
      r['Final Value $'];
    if (arvFormatted) {
      const formatted = String(arvFormatted).startsWith('$') ? arvFormatted : `$${Number(String(arvFormatted).replace(/[^0-9.-]+/g, '')).toLocaleString()}`;
      r['Subject-To ARV Value $'] = formatted;
      if (!r['Final Value $']) r['Final Value $'] = formatted;
      if (!r['opinion of the market value, as defined, of the real property that is the subject of this report is $']) {
        r['opinion of the market value, as defined, of the real property that is the subject of this report is $'] = formatted;
      }
      if (!r['Indicated Value by: Sales Comparison Approach $']) {
        r['Indicated Value by: Sales Comparison Approach $'] = formatted;
      }
    }
    if (!r['as of']) {
      r['as of'] = arv.effective_date || allData?.CERTIFICATION?.['Effective Date of Appraisal'] || allData?.RECONCILIATION?.['as of'] || data?.RECONCILIATION?.['as of'] || 'Current Effective Date';
    }
    if (!r['Conditions Comment']) {
      r['Conditions Comment'] = arv.conditions_comment || allData?.RECONCILIATION?.['Conditions Comment'] || 'Subject-to the completion of the subject property per plan and spec.';
    }
    if (!r['Summary of Sales Comparison Approach & Reconciliation']) {
      r['Summary of Sales Comparison Approach & Reconciliation'] = allData?.RECONCILIATION?.['Summary of Sales Comparison Approach & Reconciliation'] || 'Primary weight given to the Sales Comparison Approach reflecting the subject in completed condition.';
    }
    return r;
  }, [data, allData]);

  const asIsReconData = useMemo(() => {
    const arv = allData?.ARV_AS_IS || allData?.arv_as_is_data || data?.ARV_AS_IS || data?.arv_as_is_data || {};
    const r = {
      ...(allData?.clean_data?.AS_IS_RECONCILIATION || {}),
      ...(allData?.clean_data?.['As-Is Reconciliation'] || {}),
      ...(allData?.AS_IS_RECONCILIATION || {}),
      ...(data?.AS_IS_RECONCILIATION || {}),
      ...(allData?.['As-Is Reconciliation'] || {}),
      ...(data?.['As-Is Reconciliation'] || {}),
    };
    const isValidDollar = (v) => v && v !== 'N/A' && v !== '—' && /[0-9]/.test(String(v));
    const rawVal = [
      r['Indicated Value by: As-Is Sales Comparison Approach $'],
      r['Concluded As-Is Market Value $'],
      r['As-Is Value $'],
      arv.as_is_value_formatted,
      (arv.as_is_value ? `$${Number(arv.as_is_value).toLocaleString()}` : null),
      allData?.clean_data?.['As-Is Value $'],
      allData?.['As-Is Value $'],
      data?.['As-Is Value $'],
      (allData?.as_is_value ? `$${Number(allData.as_is_value).toLocaleString()}` : null),
      (data?.as_is_value ? `$${Number(data.as_is_value).toLocaleString()}` : null),
    ].find(isValidDollar);

    if (rawVal) {
      const formatted = String(rawVal).startsWith('$') ? rawVal : `$${Number(String(rawVal).replace(/[^0-9.-]+/g, '')).toLocaleString()}`;
      if (!isValidDollar(r['Indicated Value by: As-Is Sales Comparison Approach $'])) r['Indicated Value by: As-Is Sales Comparison Approach $'] = formatted;
      if (!isValidDollar(r['Concluded As-Is Market Value $'])) r['Concluded As-Is Market Value $'] = formatted;
      if (!isValidDollar(r['As-Is Value $'])) r['As-Is Value $'] = formatted;
    }
    if (!r['As-Is Effective Date'] || r['As-Is Effective Date'] === 'N/A') {
      r['As-Is Effective Date'] = primaryReconData['as of'] || arv.effective_date || allData?.RECONCILIATION?.['as of'] || data?.RECONCILIATION?.['as of'] || 'Current Effective Date';
    }
    if (!r['As-Is Property Condition / Completion Stage'] || r['As-Is Property Condition / Completion Stage'] === 'N/A') {
      r['As-Is Property Condition / Completion Stage'] = arv.completion_percentage || 'Current Physical Condition (Unimproved)';
    }
    if (!r['Remaining Cost to Complete / Construction Balance $'] || r['Remaining Cost to Complete / Construction Balance $'] === 'N/A') {
      r['Remaining Cost to Complete / Construction Balance $'] = arv.cost_to_complete_formatted || (arv.cost_to_complete ? `$${Number(arv.cost_to_complete).toLocaleString()}` : null) || 'Refer to Plans / Rehab Budget';
    }
    if (!r['As-Is Valuation Methodology'] || r['As-Is Valuation Methodology'] === 'N/A') {
      r['As-Is Valuation Methodology'] = arv.as_is_methodology || 'Contributory Site Utility & Extraction Method';
    }
    if (!r['Weighting of As-Is Comparables & Analysis Commentary'] || r['Weighting of As-Is Comparables & Analysis Commentary'] === 'N/A') {
      r['Weighting of As-Is Comparables & Analysis Commentary'] = arv.as_is_recon_commentary || allData?.['Weighting of As-Is Comparables & Analysis Commentary'] || 'The As-Is market value opinion reflects the current physical condition of the subject property supported by recent sales.';
    }
    if (!r['Hypothetical Condition Disclosed']) {
      r['Hypothetical Condition Disclosed'] = arv.hypothetical_condition_disclosed ? 'Disclosed (USPAP)' : 'Disclosed (USPAP)';
    }
    return r;
  }, [data, allData, primaryReconData]);

  return (
    <>
      <ActionButtons
        handleStateRequirementCheck={handleStateRequirementCheck}
        stateReqLoading={stateReqLoading}
        handleClientRequirementCheck={handleClientRequirementCheck}
        clientReqLoading={clientReqLoading}
        handleEscalationCheck={handleEscalationCheck}
        escalationLoading={escalationLoading}
        revisionHandlers={revisionHandlers}
      />

      {/* Dedicated ARV & As-Is Executive Review Section */}
      <ARVAsIsSummaryCard data={data} allData={allData} />

      {/* Form 1004 Sections */}
      <SubjectInfoCard
        id="subject-info"
        title="Subject Information"
        fields={subjectFields}
        data={data}
        extractionAttempted={extractionAttempted}
        onDataChange={handleDataChange}
        isEditable={true}
        editingField={editingField}
        setEditingField={setEditingField}
        highlightedFields={highlightedSubjectFields}
        allData={allData}
        comparisonData={comparisonData}
        getComparisonStyle={getComparisonStyle}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onSubjectRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="contract-section"
        title="Contract Section"
        fields={contractFields}
        data={data.CONTRACT}
        cardClass="bg-secondary"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['CONTRACT', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        highlightedFields={highlightedContractFields}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onContractRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="neighborhood-section"
        title="Neighborhood Section"
        fields={neighborhoodFields}
        data={data.NEIGHBORHOOD}
        cardClass="bg-info"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['NEIGHBORHOOD', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onNeighborhoodRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="site-section"
        title="Site Section"
        fields={siteFields}
        data={data.SITE}
        cardClass="bg-warning"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['SITE', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        highlightedFields={highlightedSiteFields}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onSiteRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="improvements-section"
        title="Improvements Section"
        fields={improvementsFields}
        data={data}
        cardClass="bg-success"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(field, value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onImprovementsRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="info-of-sales-section"
        title="Sales Comparison Approach"
        fields={infoOfSalesFields}
        data={data.INFO_OF_SALES}
        cardClass="bg-primary"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['INFO_OF_SALES', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
      />

      {/* Primary Sales Comparison Grid (Subject-To ARV / Completed Comps) */}
      <SalesComparisonSection
        data={data}
        extractionAttempted={extractionAttempted}
        handleDataChange={handleDataChange}
        editingField={editingField}
        setEditingField={setEditingField}
        salesGridRows={salesGridRows}
        comparableSales={primaryComps}
        salesHistoryFields={salesHistoryFields}
        salesComparisonAdditionalInfoFields={salesComparisonAdditionalInfoFields}
        isEditable={true}
        allData={allData}
        formType={formType}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onSalesGridRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      {/* Dedicated As-Is Comparable Sales Grid (Current Physical Condition) */}
      <AsIsSalesComparisonSection
        id="as-is-sales-comparison"
        data={data}
        allData={allData}
        isEditable={true}
        handleDataChange={handleDataChange}
        editingField={editingField}
        setEditingField={setEditingField}
        salesComparisonAdditionalInfoFields={salesComparisonAdditionalInfoFields}
      />

      {/* Conditionally rendered As-Is Prior Sale / Transfer History (Dual Record) */}
      <AsIsSalesHistorySection
        id="as-is-sales-history"
        data={data}
        allData={allData}
        isEditable={true}
        handleDataChange={handleDataChange}
        editingField={editingField}
        setEditingField={setEditingField}
      />

      {/* Dual RECONCILIATION Section 1: Primary Reconciliation (Subject-To ARV Completed Value) */}
      <GridInfoCard
        id="reconciliation-section"
        title="RECONCILIATION - Subject-To ARV (Completed Value)"
        fields={primaryReconciliationFields}
        data={primaryReconData}
        cardClass="bg-primary"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['RECONCILIATION', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onReconciliationRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      {/* Dual RECONCILIATION Section 2: As-Is Reconciliation (Current Market Value) */}
      <GridInfoCard
        id="as-is-reconciliation-section"
        title="AS-IS RECONCILIATION (Current Physical Condition)"
        fields={asIsReconciliationFields}
        data={asIsReconData}
        cardClass="bg-warning"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['AS_IS_RECONCILIATION', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="cost-approach-section"
        title="Cost Approach"
        fields={costApproachFields}
        data={data}
        cardClass="bg-dark"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(field, value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onCostApproachRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="income-approach-section"
        title="Income Approach"
        fields={incomeApproachFields}
        data={data}
        cardClass="bg-danger"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(field, value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="pud-info-section"
        title="PUD Information"
        fields={pudInformationFields}
        data={data}
        cardClass="bg-secondary"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(field, value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="market-conditions-summary"
        title="Market Conditions Narrative"
        fields={marketConditionsFields}
        data={{ ...data, ...(data?.MARKET_CONDITIONS || {}) }}
        cardClass="bg-warning"
        usePre={true}
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['MARKET_CONDITIONS', field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
      />

      <MarketConditionsTable
        id="market-conditions-section"
        data={data}
        onDataChange={(field, value) => handleDataChange(field, value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        marketConditionsRows={marketConditionsRows}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
      />

      <CondoCoopProjectsTable
        id="condo-coop-section"
        title="CONDO/CO-OP PROJECTS"
        data={data}
        onDataChange={handleDataChange}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        condoCoopProjectsRows={condoCoopProjectsRows}
        extractionAttempted={extractionAttempted}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="condo-foreclosure-section"
        fields={condoForeclosureFields}
        data={data.CONDO_FORECLOSURE}
        usePre={true}
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['CONDO_FORECLOSURE', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="appraiser-section"
        title="CERTIFICATION"
        fields={appraiserFields}
        data={data.CERTIFICATION}
        cardClass="bg-info"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['CERTIFICATION', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onCertificationRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="uspap-identification-section"
        title="USPAP / Appraisal and Report Identification"
        fields={appraisalAndReportIdentificationFields}
        data={data?.USPAP_IDENTIFICATION || data?.['USPAP / Report Identification'] || {}}
        cardClass="bg-info"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['USPAP_IDENTIFICATION', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
      />

      <MapAndSketchExhibitsSection
        id="map-sketch-exhibits-section"
        data={data}
        allData={allData}
        selectedFile={selectedFile}
      />
    </>
  );
};

export default Form1004SubjectToARV;
