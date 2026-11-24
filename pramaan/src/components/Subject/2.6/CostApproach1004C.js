import React from 'react';
import {
  Paper, Box, Typography, Tooltip, IconButton, LinearProgress
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { EditableField } from '../components/EditableField';

export const CostApproach1004C = ({
  id = 'cost-approach-section',
  title = 'Cost Approach',
  fields = [],
  data = {},
  allData = {},
  extractionAttempted,
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
  const getCostValue = (keys, defaultValue = '') => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const k of keyList) {
      const candidates = [
        data?.[k],
        data?.COST_APPROACH?.[k],
        data?.['Cost Approach']?.[k],
        data?.clean_data?.['Cost Approach']?.[k],
        data?.clean_data?.COST_APPROACH?.[k],
        allData?.clean_data?.['Cost Approach']?.[k],
        allData?.clean_data?.COST_APPROACH?.[k],
        allData?.COST_APPROACH?.[k],
        allData?.['Cost Approach']?.[k],
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
    return { value: defaultValue, actualKey: keyList[0] };
  };

  const getFieldPath = (actualKey) => ['COST_APPROACH', actualKey];

  const renderCellInput = (keys, placeholder = '', customStyle = {}, usePre = false) => {
    const { value, actualKey } = getCostValue(keys);
    const fieldPath = getFieldPath(actualKey);

    return (
      <EditableField
        fieldPath={fieldPath}
        value={value}
        onDataChange={onDataChange}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={isEditable}
        usePre={usePre}
        placeholder={placeholder}
        allData={allData || data}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
        inputStyle={{
          width: '100%',
          fontSize: '0.82rem',
          padding: '2px 4px',
          border: 'none',
          background: 'transparent',
          ...customStyle,
        }}
      />
    );
  };

  const costTypeVal = String(
    getCostValue(['ESTIMATED COST NEW TYPE', 'ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW', 'Estimated', 'Cost Type']).value
  ).toUpperCase();
  const isReproduction = costTypeVal.includes('REPROD');
  const isReplacement = costTypeVal.includes('REPLACE') || (!isReproduction && costTypeVal !== '');

  const isLoadingThis = loading && loadingSection === id;

  return (
    <Paper
      id={id}
      elevation={2}
      sx={{
        mb: 4,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid #d3d3d3ff',
        backgroundColor: '#ffffff'
      }}
    >
      {/* Header Bar */}
      <Box
        sx={{
          bgcolor: '#ffffffff',
          color: '#000000ff',
          px: 2,
          py: 1.25,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalculateIcon sx={{ fontSize: '1.25rem', color: '#38bdf8' }} />
          <Typography variant="h6" component="div" sx={{ fontSize: '1rem', fontWeight: 'bold', letterSpacing: '0.04em' }}>
            COST APPROACH (MANUFACTURED HOME - FORM 1004C)
          </Typography>
        </Box>

        {onRevisionButtonClick && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Submit Revision Request">
              <IconButton
                size="small"
                onClick={onRevisionButtonClick}
                sx={{ color: '#000000ff', '&:hover': { color: '#000000ff', backgroundColor: 'rgba(255,255,255,0.1)' } }}
              >
                <LibraryBooksIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {isLoadingThis && <LinearProgress sx={{ height: 3 }} />}

      <Box sx={{ p: 2 }}>
        {/* Top Notice */}
        {/* <Box sx={{ mb: 1.5, p: 0.75, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1 }}>
          <Typography sx={{ fontSize: '0.78rem', color: '#475569', fontStyle: 'italic' }}>
            Provide adequate information for the lender/client to replicate the below cost figures and calculations.
          </Typography>
        </Box> */}

        {/* 1. Support for the opinion of site value */}
        <Box sx={{ mb: 2, border: '1px solid #cbd5e1', borderRadius: 1, p: 1.25, bgcolor: '#fafafa' }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase', mb: 0.5 }}>
            Support for the opinion of site value (summary of comparable land sales or other methods for estimating site value)
          </Typography>
          <Box sx={{ minHeight: '60px', bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 0.5, p: 0.75 }}>
            {renderCellInput(
              [
                'Support for the opinion of site value (summary of comparable land sales or other methods for estimating site value)',
                'Support for the opinion of site value',
                'SiteEstimatedValueComment'
              ],
              'Enter support for opinion of site value...',
              { fontSize: '0.85rem', color: '#0f172a', minHeight: '50px' },
              true
            )}
          </Box>
        </Box>

        {/* 2. Cost New Type & Source Header Row */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.4fr 1.8fr 1.2fr 1.2fr' },
            gap: 1.5,
            alignItems: 'center',
            p: 1.25,
            bgcolor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 1,
            mb: 2
          }}
        >
          {/* Checkbox / Type */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#334155' }}>
              ESTIMATED:
            </Typography>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isReproduction}
                onChange={(e) => onDataChange && onDataChange(getFieldPath('ESTIMATED COST NEW TYPE'), e.target.checked ? 'REPRODUCTION' : 'REPLACEMENT')}
                disabled={!isEditable}
              />
              REPRODUCTION
            </label>
            <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>OR</Typography>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: isReplacement ? 'bold' : 'normal' }}>
              <input
                type="checkbox"
                checked={isReplacement}
                onChange={(e) => onDataChange && onDataChange(getFieldPath('ESTIMATED COST NEW TYPE'), e.target.checked ? 'REPLACEMENT' : 'REPRODUCTION')}
                disabled={!isEditable}
              />
              REPLACEMENT COST NEW
            </label>
          </Box>

          {/* Source of cost data */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155', whiteSpace: 'nowrap' }}>
              Source of cost data:
            </Typography>
            <Box sx={{ flexGrow: 1, bgcolor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.5 }}>
              {renderCellInput(['Source of Cost Data', 'Source of cost data', 'DataSourceDescription'], 'e.g. Marshall Swift')}
            </Box>
          </Box>

          {/* Effective date of cost data */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155', whiteSpace: 'nowrap' }}>
              Effective date:
            </Typography>
            <Box sx={{ flexGrow: 1, bgcolor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.5 }}>
              {renderCellInput(['Effective date of cost data', 'Effective Date', 'DataSourceEffectiveDate'], 'MM/DD/YYYY')}
            </Box>
          </Box>

          {/* Quality rating from cost service */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155', whiteSpace: 'nowrap' }}>
              Quality rating:
            </Typography>
            <Box sx={{ flexGrow: 1, bgcolor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.5 }}>
              {renderCellInput(['Quality rating from cost service', 'Quality Rating', 'CostServiceQualityRatingDescription'], 'e.g. Average / Good')}
            </Box>
          </Box>
        </Box>

        {/* 3. Main Calculation Table matching Form 1004C */}
        <Box sx={{ border: '2px solid #0f172a', borderRadius: 1, overflow: 'hidden', mb: 2 }}>
          {/* Table Header Row: OPINION OF SITE VALUE & Exterior Dimensions */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '52% 48%' },
              bgcolor: '#e2e8f0',
              borderBottom: '2px solid #0f172a'
            }}
          >
            {/* Left Header */}
            <Box sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, borderRight: { md: '2px solid #0f172a' } }}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#0f172a' }}>
                OPINION OF SITE VALUE
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>$</Typography>
              <Box sx={{ width: '130px', bgcolor: '#ffffff', border: '1px solid #94a3b8', borderRadius: 0.5, px: 0.5 }}>
                {renderCellInput(['OPINION OF SITE VALUE', 'Opinion of Site Value $', 'SiteEstimatedValueAmount'], '0.00', { fontWeight: 'bold', textAlign: 'right' })}
              </Box>
            </Box>

            {/* Right Header */}
            <Box sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#0f172a', letterSpacing: '0.02em' }}>
                Exterior Dimensions of the Subject Unit
              </Typography>
            </Box>
          </Box>

          {/* Section Rows (Section One to Section Four) */}
          {[
            { id: 'SectionOne', label: 'Section One', defaultSqft: '1,056', defaultRate: '115.00' },
            { id: 'SectionTwo', label: 'Section Two', defaultSqft: '1,056', defaultRate: '115.00' },
            { id: 'SectionThree', label: 'Section Three', defaultSqft: '', defaultRate: '' },
            { id: 'SectionFour', label: 'Section Four', defaultSqft: '', defaultRate: '' },
          ].map((sec) => (
            <Box
              key={sec.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '18% 10% 2% 9% 2% 11% 15% 3% 15% 3% 12%' },
                borderBottom: '1px solid #cbd5e1',
                alignItems: 'center',
                p: 0.5,
                bgcolor: '#ffffff',
                '&:hover': { bgcolor: '#f8fafc' }
              }}
            >
              {/* Section Label */}
              <Box sx={{ px: 1 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#1e293b' }}>
                  {sec.label}
                </Typography>
              </Box>

              {/* Sq. ft. */}
              <Box sx={{ bgcolor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.5 }}>
                {renderCellInput([`${sec.label} Sq. ft.`, `${sec.id}SquareFeet`], '', { textAlign: 'right' })}
              </Box>

              <Typography sx={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center' }}>@</Typography>

              {/* Rate ($) */}
              <Box sx={{ bgcolor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.5 }}>
                {renderCellInput([`${sec.label} @ $`, `${sec.id}Rate`, `${sec.id}PricePerSquareFoot`], '', { textAlign: 'right' })}
              </Box>

              <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>$</Typography>

              {/* Section Cost ($) */}
              <Box sx={{ bgcolor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.5, borderRight: '2px solid #0f172a' }}>
                {renderCellInput([`${sec.label} Cost $`, `${sec.id}Cost`, `${sec.id}_CostAmount`], '', { fontWeight: 'bold', textAlign: 'right' })}
              </Box>

              {/* Exterior Dimension Width */}
              <Box sx={{ bgcolor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.5 }}>
                {renderCellInput([`${sec.label} Width`, `${sec.id}Width`, `${sec.id}WidthFeetCount`], '', { textAlign: 'right' })}
              </Box>

              <Typography sx={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>X</Typography>

              {/* Exterior Dimension Length */}
              <Box sx={{ bgcolor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.5 }}>
                {renderCellInput([`${sec.label} Length`, `${sec.id}Length`, `${sec.id}DepthFeetCount`], '', { textAlign: 'right' })}
              </Box>

              <Typography sx={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>=</Typography>

              {/* Section Area Sq. ft. */}
              <Box sx={{ bgcolor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.5 }}>
                {renderCellInput([`${sec.label} Area Sq. ft.`, `${sec.id}Area`, `${sec.id}SquareFeetCount`], '', { textAlign: 'right' })}
              </Box>
            </Box>
          ))}

          {/* Split Block: Left has Additional items + Subtotals, Right has GLA + NADA box + Comments */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '52% 48%' },
              borderTop: '2px solid #0f172a'
            }}
          >
            {/* Left Side: Additional improvements & Cost figures */}
            <Box sx={{ borderRight: { md: '2px solid #0f172a' } }}>
              {/* Additional Item 1 */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '55% 5% 40%', p: 0.5, borderBottom: '1px solid #e2e8f0', alignItems: 'center' }}>
                <Box sx={{ px: 0.5, border: '1px solid #e2e8f0', borderRadius: 0.5, bgcolor: '#ffffff' }}>
                  {renderCellInput(['Additional Item 1 Description', 'AdditionalImprovement1Description'], 'e.g. 20x20 Carport / Well')}
                </Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>$</Typography>
                <Box sx={{ px: 0.5, border: '1px solid #cbd5e1', borderRadius: 0.5, bgcolor: '#f8fafc' }}>
                  {renderCellInput(['Additional Item 1 Cost $', 'AdditionalImprovement1Cost'], '', { textAlign: 'right', fontWeight: '500' })}
                </Box>
              </Box>

              {/* Additional Item 2 */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '55% 5% 40%', p: 0.5, borderBottom: '1px solid #e2e8f0', alignItems: 'center' }}>
                <Box sx={{ px: 0.5, border: '1px solid #e2e8f0', borderRadius: 0.5, bgcolor: '#ffffff' }}>
                  {renderCellInput(['Additional Item 2 Description', 'AdditionalImprovement2Description'], 'e.g. Septic')}
                </Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>$</Typography>
                <Box sx={{ px: 0.5, border: '1px solid #cbd5e1', borderRadius: 0.5, bgcolor: '#f8fafc' }}>
                  {renderCellInput(['Additional Item 2 Cost $', 'AdditionalImprovement2Cost'], '', { textAlign: 'right', fontWeight: '500' })}
                </Box>
              </Box>

              {/* Additional Item 3 */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '55% 5% 40%', p: 0.5, borderBottom: '1px solid #0f172a', alignItems: 'center' }}>
                <Box sx={{ px: 0.5, border: '1px solid #e2e8f0', borderRadius: 0.5, bgcolor: '#ffffff' }}>
                  {renderCellInput(['Additional Item 3 Description', 'AdditionalImprovement3Description'], 'Additional item...')}
                </Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>$</Typography>
                <Box sx={{ px: 0.5, border: '1px solid #cbd5e1', borderRadius: 0.5, bgcolor: '#f8fafc' }}>
                  {renderCellInput(['Additional Item 3 Cost $', 'AdditionalImprovement3Cost'], '', { textAlign: 'right', fontWeight: '500' })}
                </Box>
              </Box>

              {/* Sub-total */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '55% 5% 40%', p: 0.5, borderBottom: '1px solid #e2e8f0', alignItems: 'center', bgcolor: '#f8fafc' }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#0f172a', textAlign: 'right', pr: 1 }}>
                  Sub-total:
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>$</Typography>
                <Box sx={{ px: 0.5, border: '1px solid #cbd5e1', borderRadius: 0.5, bgcolor: '#ffffff' }}>
                  {renderCellInput(['Sub-total:', 'Sub-total', 'NewImprovementTotalCostAmount'], '', { textAlign: 'right', fontWeight: 'bold' })}
                </Box>
              </Box>

              {/* Cost Multiplier */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '55% 5% 40%', p: 0.5, borderBottom: '1px solid #e2e8f0', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '0.75rem', color: '#334155', textAlign: 'right', pr: 1 }}>
                  Cost Multiplier (if applicable):
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', textAlign: 'center', color: '#64748b' }}>x</Typography>
                <Box sx={{ px: 0.5, border: '1px solid #cbd5e1', borderRadius: 0.5, bgcolor: '#ffffff' }}>
                  {renderCellInput(['Cost Multiplier (if applicable):', 'Cost Multiplier', 'NewImprovementCostMultiplierFactor'], '', { textAlign: 'right' })}
                </Box>
              </Box>

              {/* ModifiedSub-total */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '55% 5% 40%', p: 0.5, borderBottom: '1px solid #e2e8f0', alignItems: 'center', bgcolor: '#f8fafc' }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#0f172a', textAlign: 'right', pr: 1 }}>
                  ModifiedSub-total:
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>$</Typography>
                <Box sx={{ px: 0.5, border: '1px solid #cbd5e1', borderRadius: 0.5, bgcolor: '#ffffff' }}>
                  {renderCellInput(['ModifiedSub-total:', 'ModifiedSub-total', 'NewImprovementCostLocalizedAmount'], '', { textAlign: 'right', fontWeight: 'bold' })}
                </Box>
              </Box>

              {/* Physical Depreciation or Condition Modifier */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '55% 5% 40%', p: 0.5, borderBottom: '1px solid #e2e8f0', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '0.75rem', color: '#334155', textAlign: 'right', pr: 1 }}>
                  Physical Depreciation or Condition Modifier:
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', textAlign: 'center' }}>-</Typography>
                <Box sx={{ px: 0.5, border: '1px solid #cbd5e1', borderRadius: 0.5, bgcolor: '#ffffff' }}>
                  {renderCellInput(['Physical Depreciation or Condition Modifier:', 'Physical Depreciation', 'PhysicalDepreciationAmount'], '', { textAlign: 'right', color: '#b91c1c' })}
                </Box>
              </Box>

              {/* Functional Obsolescence */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '55% 5% 40%', p: 0.5, borderBottom: '1px solid #e2e8f0', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '0.75rem', color: '#334155', textAlign: 'right', pr: 1 }}>
                  Functional Obsolescence (not used for N.A.D.A.):
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', textAlign: 'center' }}>-</Typography>
                <Box sx={{ px: 0.5, border: '1px solid #cbd5e1', borderRadius: 0.5, bgcolor: '#ffffff' }}>
                  {renderCellInput(['Functional Obsolescence (not used for N.A.D.A.):', 'Functional Depreciation', 'FunctionalDepreciationAmount'], '', { textAlign: 'right' })}
                </Box>
              </Box>

              {/* External Depreciation */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '55% 5% 40%', p: 0.5, borderBottom: '1px solid #e2e8f0', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '0.75rem', color: '#334155', textAlign: 'right', pr: 1 }}>
                  External Depreciation or State Location Modifier:
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', textAlign: 'center' }}>-</Typography>
                <Box sx={{ px: 0.5, border: '1px solid #cbd5e1', borderRadius: 0.5, bgcolor: '#ffffff' }}>
                  {renderCellInput(['External Depreciation or State Location Modifier:', 'External Depreciation', 'ExternalDepreciationAmount'], '', { textAlign: 'right' })}
                </Box>
              </Box>

              {/* Delivery, Installation, and Setup */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '55% 5% 40%', p: 0.5, borderBottom: '1px solid #e2e8f0', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '0.75rem', color: '#334155', textAlign: 'right', pr: 1 }}>
                  Delivery, Installation, and Setup (not used for N.A.D.A.):
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', textAlign: 'center' }}>$</Typography>
                <Box sx={{ px: 0.5, border: '1px solid #cbd5e1', borderRadius: 0.5, bgcolor: '#ffffff' }}>
                  {renderCellInput(['Delivery, Installation, and Setup (not used for N.A.D.A.):', 'ManufacturedHomeInstallationCostAmount'], '', { textAlign: 'right' })}
                </Box>
              </Box>

              {/* Other Depreciated Site Improvements */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '55% 5% 40%', p: 0.5, borderBottom: '1px solid #e2e8f0', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '0.75rem', color: '#334155', textAlign: 'right', pr: 1 }}>
                  Other Depreciated Site Improvements:
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', textAlign: 'center' }}>$</Typography>
                <Box sx={{ px: 0.5, border: '1px solid #cbd5e1', borderRadius: 0.5, bgcolor: '#ffffff' }}>
                  {renderCellInput(['Other Depreciated Site Improvements:', 'SiteOtherImprovementsAsIsAmount'], '', { textAlign: 'right' })}
                </Box>
              </Box>

              {/* Market Value of Subject Site */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '55% 5% 40%', p: 0.5, borderBottom: '2px solid #0f172a', alignItems: 'center', bgcolor: '#f8fafc' }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#0f172a', textAlign: 'right', pr: 1 }}>
                  Market Value of Subject Site (as supported above):
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>$</Typography>
                <Box sx={{ px: 0.5, border: '1px solid #cbd5e1', borderRadius: 0.5, bgcolor: '#ffffff' }}>
                  {renderCellInput(['Market Value of Subject Site (as supported above):', 'OPINION OF SITE VALUE', 'SiteEstimatedValueAmount'], '', { textAlign: 'right', fontWeight: 'bold' })}
                </Box>
              </Box>
            </Box>

            {/* Right Side: Total GLA, Other Data Identification Box (NADA), and Comments */}
            <Box sx={{ p: 1, bgcolor: '#fafafa', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Total Gross Living Area Row */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, p: 0.5, bgcolor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 0.5 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#1e293b' }}>
                  Total Gross Living Area:
                </Typography>
                <Box sx={{ width: '120px', bgcolor: '#f8fafc', border: '1px solid #94a3b8', borderRadius: 0.5, px: 0.5 }}>
                  {renderCellInput(['Total Gross Living Area', 'Total Gross Living Area:'], '', { textAlign: 'right', fontWeight: 'bold' })}
                </Box>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>Sq. ft.</Typography>
              </Box>

              {/* Other Data Identification Box */}
              <Box sx={{ border: '1px solid #94a3b8', borderRadius: 1, p: 1, bgcolor: '#ffffff' }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#0f172a', borderBottom: '1px solid #e2e8f0', pb: 0.5, mb: 0.75 }}>
                  Other Data Identification
                </Typography>

                {/* N.A.D.A. Edition Mo & Yr */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                  <Typography sx={{ fontSize: '0.72rem', color: '#475569', whiteSpace: 'nowrap' }}>
                    N.A.D.A. Data Identification Info: Edition Mo:
                  </Typography>
                  <Box sx={{ width: '140px', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.25 }}>
                    {renderCellInput(['N.A.D.A. Data Identification Info: Edition Mo:', 'NADAManufacturedHousingGuideEditionMonth'], '', { textAlign: 'center' })}
                  </Box>
                  <Typography sx={{ fontSize: '0.72rem', color: '#475569' }}>Yr:</Typography>
                  <Box sx={{ width: '120px', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.25 }}>
                    {renderCellInput(['N.A.D.A. Data Identification Info: Yr:', 'NADAManufacturedHousingGuideEditionYear'], '', { textAlign: 'center' })}
                  </Box>
                </Box>

                {/* MH State, Region, Size */}
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.75 }}>
                  <Typography sx={{ fontSize: '0.72rem', color: '#475569' }}>MH State:</Typography>
                  <Box sx={{ width: '140px', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.25 }}>
                    {renderCellInput(['MH State:', 'ManufacturedHomeBuiltState'])}
                  </Box>
                  <Typography sx={{ fontSize: '0.72rem', color: '#475569' }}>Region:</Typography>
                  <Box sx={{ width: '140px', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.25 }}>
                    {renderCellInput(['Region:', 'ManufacturedHomeRegionIdentifier'], '', { textAlign: 'center' })}
                  </Box>
                  <Typography sx={{ fontSize: '0.72rem', color: '#475569' }}>Size:</Typography>
                  <Box sx={{ width: '140px', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.25 }}>
                    {renderCellInput(['Size Width ft:', 'WidthFeetCount'], '', { textAlign: 'center' })}
                  </Box>
                  <Typography sx={{ fontSize: '0.72rem', color: '#475569' }}>ft. x</Typography>
                  <Box sx={{ width: '140px', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.25 }}>
                    {renderCellInput(['Size Length ft:', 'LengthFeetCount'], '', { textAlign: 'center' })}
                  </Box>
                  <Typography sx={{ fontSize: '0.72rem', color: '#475569' }}>ft.</Typography>
                </Box>

                {/* Gray pg, White pg, Black SVS pg */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                  <Typography sx={{ fontSize: '0.72rem', color: '#475569' }}>Gray pg.</Typography>
                  <Box sx={{ width: '140px', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.25 }}>
                    {renderCellInput(['Gray pg.', 'NADAManufacturedHousingGuideGreyPageIdentifier'], 'Unk', { textAlign: 'center' })}
                  </Box>
                  <Typography sx={{ fontSize: '0.72rem', color: '#475569' }}>White pg.</Typography>
                  <Box sx={{ width: '140px', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.25 }}>
                    {renderCellInput(['White pg.', 'NADAManufacturedHousingGuideWhitePageIdentifier'], 'Unk', { textAlign: 'center' })}
                  </Box>
                  <Typography sx={{ fontSize: '0.72rem', color: '#475569' }}>Black SVS pg.</Typography>
                  <Box sx={{ width: '140px', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.25 }}>
                    {renderCellInput(['Black SVS pg.', 'NADAManufacturedHousingGuideBlackPageIdentifier'], 'Unk', { textAlign: 'center' })}
                  </Box>
                </Box>

                {/* Conversion Chart & Yellow pg */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '0.72rem', color: '#475569' }}>15 yrs+ Conversion pg.</Typography>
                  <Box sx={{ width: '140px', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.25 }}>
                    {renderCellInput(['15 years and older Conversion Chart pg.', 'NADAManufacturedHousingGuideConversionChartPageIdentifier'], 'Unk', { textAlign: 'center' })}
                  </Box>
                  <Typography sx={{ fontSize: '0.72rem', color: '#475569' }}>Yellow pg.</Typography>
                  <Box sx={{ width: '140px', border: '1px solid #cbd5e1', borderRadius: 0.5, px: 0.25 }}>
                    {renderCellInput(['Yellow pg.', 'NADAManufacturedHousingGuideYellowPageIdentifier'], 'Unk', { textAlign: 'center' })}
                  </Box>
                </Box>
              </Box>

              {/* Comments box (Manufactured Home Cost Data Comments) */}
              <Box sx={{ border: '1px solid #94a3b8', borderRadius: 1, p: 1, bgcolor: '#ffffff', flexGrow: 1 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#0f172a', mb: 0.5 }}>
                  Comments:
                </Typography>
                <Box sx={{ minHeight: '65px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 0.5, p: 0.5 }}>
                  {renderCellInput(
                    [
                      'Physical Depreciation Comments:',
                      'Comments:',
                      'ManufacturedHomeCostDataComment',
                      'Comments on Cost Approach (gross living area calculations, depreciation, etc.)'
                    ],
                    'GLA ANSI / Cost data comments...',
                    { fontSize: '0.78rem', minHeight: '60px' },
                    true
                  )}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Bottom Summary Bar: Indicated Value by Cost Approach & Remaining Economic Life */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '52% 48%' },
              p: 1.25,
              bgcolor: '#ffffffff',
              color: '#000000ff',
              alignItems: 'center'
            }}
          >
            {/* Indicated Value by Cost Approach */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 2, borderRight: { md: '1px solid #334155' } }}>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#000000ff' }}>
                Indicated Value by Cost Approach:
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 'bold' }}>$</Typography>
              <Box sx={{ width: '140px', bgcolor: '#ffffffff', border: '1px solid #38bdf8', borderRadius: 0.5, px: 0.5 }}>
                {renderCellInput(
                  ['Indicated Value by Cost Approach', 'INDICATED VALUE BY COST APPROACH', 'ValueIndicatedByCostApproachAmount'],
                  '0.00',
                  { color: '#000000ff', fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'right' }
                )}
              </Box>
            </Box>

            {/* Estimated Remaining Economic Life */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { md: 'flex-end' }, gap: 1 }}>
              <Typography sx={{ fontSize: '0.78rem', color: '#000000ff' }}>
                Estimated Remaining Economic Life (HUD and VA only):
              </Typography>
              <Box sx={{ width: '420px', bgcolor: '#ffffffff', border: '1px solid #64748b', borderRadius: 0.5, px: 0.5 }}>
                {renderCellInput(['Estimated Remaining Economic Life (HUD and VA only)', 'Remaining Economic Life', 'EstimatedRemainingEconomicLifeYearsCount'], '', { color: '#f8fafc', textAlign: 'center', fontWeight: 'bold' })}
              </Box>
              <Typography sx={{ fontSize: '0.78rem', color: '#000000ff' }}>Years</Typography>
            </Box>
          </Box>
        </Box>

        {/* 4. Summary of Cost Approach Narrative */}
        <Box sx={{ border: '1px solid #cbd5e1', borderRadius: 1, p: 1.25, bgcolor: '#fafafa' }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase', mb: 0.5 }}>
            Summary of Cost Approach
          </Typography>
          <Box sx={{ minHeight: '60px', bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 0.5, p: 0.75 }}>
            {renderCellInput(
              [
                'Summary of Cost Approach',
                'Comments on Cost Approach (gross living area calculations, depreciation, etc.)',
                '_Comment'
              ],
              'Enter summary of cost approach narrative...',
              { fontSize: '0.85rem', color: '#0f172a', minHeight: '55px' },
              true
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default CostApproach1004C;
