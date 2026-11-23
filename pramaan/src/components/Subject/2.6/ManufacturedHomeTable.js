import React, { useState, useMemo } from 'react';
import {
  Paper, Box, Typography, TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, Card, CardMedia, CardContent, Dialog, DialogTitle, DialogContent, IconButton, Stack,
  Alert, AlertTitle, Collapse, Button, CircularProgress
} from '@mui/material';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { EditableField } from '../components/EditableField';
import { InteractiveZoomImageViewer } from '../components/InteractiveZoomImageViewer.js';

export const MANUFACTURED_HOME_SECTIONS = [
  {
    groupTitle: 'HUD Data Plate & Certification Label',
    fields: [
      'Is the HUD Data Plate/Compliance Certificate attached to the dwelling?',
      'If Yes, identify the location. If No, provide the data source(s) for the HUD Data Plate/Compliance Certificate information.',
      'Is a HUD Certification Label attached to the exterior of each section of the dwelling?',
      'If No, provide the data source(s) for the HUD Certification Label #’s',
      'HUD Certification Label #(s)',
      'Manufacturer’s Serial #(s)/VIN #(s)',
      "Manufacturer's Name",
      'Trade/Model',
      'Date of Manufacture',
      'Do the Wind, Roof Load, and Thermal Zones meet the minimum HUD requirements for the location of the subject property? Yes No If No, explain',
    ],
  },
];

const PRE_FORMATTED_FIELDS = new Set([
  'If Yes, identify the location. If No, provide the data source(s) for the HUD Data Plate/Compliance Certificate information.',
  'If No, provide the data source(s) for the HUD Certification Label #’s',
  'Do the Wind, Roof Load, and Thermal Zones meet the minimum HUD requirements for the location of the subject property? Yes No If No, explain',
]);

const FIELD_FALLBACKS = {
  'If Yes, identify the location. If No, provide the data source(s) for the HUD Data Plate/Compliance Certificate information.': [
    'HUD Data Plate Location',
    'HUD Data Plate Location / Source',
    'Location Under Kitchen Sink'
  ],
  'HUD Data Plate Location': [
    'If Yes, identify the location. If No, provide the data source(s) for the HUD Data Plate/Compliance Certificate information.',
  ],
  'Is the HUD Data Plate/Compliance Certificate attached to the dwelling?': [
    'HUD Data Plate Attached',
    'HUD Data Plate'
  ],
  'Is a HUD Certification Label attached to the exterior of each section of the dwelling?': [
    'HUD Certification Label Attached',
    'HUD Certification Label'
  ],
  'If No, provide the data source(s) for the HUD Certification Label #’s': [
    "If No, provide the data source(s) for the HUD Certification Label #'s",
    'HUD Certification Label Data Source',
    'HUD Label Data Source'
  ],
  "If No, provide the data source(s) for the HUD Certification Label #'s": [
    'If No, provide the data source(s) for the HUD Certification Label #’s',
    'HUD Certification Label Data Source'
  ],
  'HUD Certification Label #(s)': [
    'HUD Certification Label',
    'HUD Label #',
    'HUD Certification Label #'
  ],
  "Manufacturer’s Serial #(s)/VIN #(s)": [
    "Manufacturer's Serial #(s)/VIN #(s)",
    'Serial # / VIN',
    'Serial Number / VIN',
    'VIN #'
  ],
  "Manufacturer's Serial #(s)/VIN #(s)": [
    "Manufacturer’s Serial #(s)/VIN #(s)",
    'Serial # / VIN',
    'Serial Number / VIN',
    'VIN #'
  ],
  "Manufacturer's Name": [
    'Manufacturer Name',
    'Manufacturer'
  ],
  'Manufacturer Name': [
    "Manufacturer's Name"
  ],
  'Trade/Model': [
    'Model Name',
    'Trade / Model',
    'Model'
  ],
  'Date of Manufacture': [
    'Manufacture Date',
    'Date of Manufacture (mm/yyyy)'
  ],
  'Do the Wind, Roof Load, and Thermal Zones meet the minimum HUD requirements for the location of the subject property? Yes No If No, explain': [
    'Do the Wind, Roof Load, and Thermal Zones meet the minimum HUD requirements for the location of the subject property? Yes No If No, explain',
    'Do the Wind, Roof Load, and Thermal Zones meet the minimum HUD requirements for the location of the subject property?',
    'Wind, Roof Load, and Thermal Zones Explanation',
    'Meets HUD Requirements For Location Description',
    'Meets HUD Requirements For Location',
    'Wind/Roof/Thermal Zones Meet HUD Requirements'
  ],
  'Do the Wind, Roof Load, and Thermal Zones meet the minimum HUD requirements for the location of the subject property?': [
    'Do the Wind, Roof Load, and Thermal Zones meet the minimum HUD requirements for the location of the subject property? Yes No If No, explain',
    'Wind, Roof Load, and Thermal Zones Explanation',
    'Meets HUD Requirements For Location Description',
    'Meets HUD Requirements For Location',
    'Wind/Roof/Thermal Zones Meet HUD Requirements'
  ],
  '# of Sections': [
    'Number of Sections',
    'Section Count'
  ],
  'Section Dimensions': [
    'Section Dimensions',
    'Section One'
  ],
  'Is the manufactured home attached to a permanent foundation system?': [
    'Permanent Foundation',
    'Attached to Permanent Foundation'
  ],
  'If No, describe the foundation system and the manner of attachment.': [
    'Foundation Attachment Description'
  ],
  'Have the towing hitch, wheels, and axles been removed?': [
    'Wheels/Axles Removed',
    'Towing Hitch/Wheels/Axles Removed'
  ],
  'Describe any additions or modifications (decks, rooms, remodeling, etc.)': [
    'Additions/Modifications Description',
    'Additions or Modifications'
  ],
  'The appraiser must rate the quality of construction for the subject unit based on objective criteria (such as N.A.D.A. Manufactured Housing Appraisal Guide®, Marshall & Swift Residential Cost Handbook, etc.)': [
    'Quality Rating (Cost Service)',
    'Quality Rating'
  ],
  'Quality Rating (Cost Service)': [
    'The appraiser must rate the quality of construction for the subject unit based on objective criteria (such as N.A.D.A. Manufactured Housing Appraisal Guide®, Marshall & Swift Residential Cost Handbook, etc.)'
  ],
  'Installer’s Name': [
    "Installer's Name"
  ],
  'Model Year': [
    'Year Built'
  ],
};

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';

export const ManufacturedHomeTable = ({
  id = 'manufactured-home-section',
  title = 'HUD Data Plate & Compliance Certificate / Certification Label',
  data = {},
  allData = {},
  formType,
  onDataChange,
  editingField,
  setEditingField,
  isEditable = true,
  manualValidations,
  handleManualValidation,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showOcrAudit, setShowOcrAudit] = useState(true);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [customOcrData, setCustomOcrData] = useState(null);
  const [customOcrVerification, setCustomOcrVerification] = useState(null);

  const hudImageData = useMemo(() => {
    return (
      customOcrData ||
      data?.HUD_IMAGE_DATA ||
      data?.clean_data?.HUD_IMAGE_DATA ||
      data?.['Manufactured Home']?._hud_image_data ||
      data?.['Manufactured Home']?.HUD_IMAGE_DATA ||
      data?.MANUFACTURED_HOME?._hud_image_data ||
      allData?.clean_data?.HUD_IMAGE_DATA ||
      allData?.HUD_IMAGE_DATA ||
      allData?.clean_data?.['Manufactured Home']?._hud_image_data ||
      allData?.['Manufactured Home']?._hud_image_data ||
      null
    );
  }, [data, allData, customOcrData]);

  const hudVerification = useMemo(() => {
    if (customOcrVerification && Array.isArray(customOcrVerification) && customOcrVerification.length > 0) {
      return customOcrVerification;
    }
    const vList =
      data?.HUD_IMAGE_VERIFICATION ||
      data?.clean_data?.HUD_IMAGE_VERIFICATION ||
      data?.['Manufactured Home']?._hud_image_verification ||
      data?.['Manufactured Home']?.HUD_IMAGE_VERIFICATION ||
      data?.MANUFACTURED_HOME?._hud_image_verification ||
      allData?.clean_data?.HUD_IMAGE_VERIFICATION ||
      allData?.HUD_IMAGE_VERIFICATION ||
      allData?.clean_data?.['Manufactured Home']?._hud_image_verification ||
      allData?.['Manufactured Home']?._hud_image_verification ||
      [];
    if (Array.isArray(vList) && vList.length > 0) return vList;

    // Fallback: If hudImageData is present, build verification items on the fly
    if (hudImageData && typeof hudImageData === 'object') {
      const keysToCompare = [
        ['HUD Certification Label #(s)', ['HUD Certification Label #(s)', 'HUD Certification Label', 'HUD Label #']],
        ["Manufacturer’s Serial #(s)/VIN #(s)", ["Manufacturer’s Serial #(s)/VIN #(s)", "Manufacturer's Serial #(s)/VIN #(s)", 'Serial # / VIN']],
        ["Manufacturer's Name", ["Manufacturer's Name", 'Manufacturer Name']],
        ['Trade/Model', ['Trade/Model', 'Model Name', 'Trade / Model']],
        ['Date of Manufacture', ['Date of Manufacture', 'Manufacture Date']],
      ];
      const generated = [];
      keysToCompare.forEach(([label, aliases]) => {
        let fVal = '';
        for (const a of [label, ...aliases]) {
          const v = data?.['Manufactured Home']?.[a] ?? data?.[a] ?? allData?.[a];
          if (v) { fVal = String(v); break; }
        }
        let iVal = '';
        for (const a of [label, ...aliases]) {
          const v = hudImageData[a];
          if (v) { iVal = String(v); break; }
        }
        if (fVal || iVal) {
          const cleanF = fVal.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          const cleanI = iVal.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          let status = 'Match';
          let note = 'Form value verified against HUD image.';
          if (!cleanI && cleanF) {
            status = 'Not Detected';
            note = `Present in Form 1004C ('${fVal}'), but not detected in HUD photo OCR.`;
          } else if (cleanI && !cleanF) {
            status = 'Image Only';
            note = `Detected in HUD photo OCR ('${iVal}'), but missing from Form 1004C.`;
          } else if (cleanF === cleanI) {
            status = 'Match';
            note = 'Exact match between Form 1004C and image.';
          } else if (label === 'Date of Manufacture' && cleanF !== cleanI) {
            status = 'Discrepancy';
            note = `Discrepancy detected: Form states '${fVal}', but HUD Data Plate image indicates '${iVal}'.`;
          } else if (cleanI && cleanF && cleanI.length >= 3 && cleanF.length >= 3 && (cleanI.includes(cleanF) || cleanF.includes(cleanI))) {
            status = 'Match';
            note = 'Verified match with minor formatting differences.';
          } else {
            status = 'Discrepancy';
            note = `Discrepancy detected: Form has '${fVal}', but image shows '${iVal}'.`;
          }
          generated.push({ field: label, form_value: fVal, image_value: iVal, status, note });
        }
      });
      return generated;
    }

    return [];
  }, [data, allData, hudImageData, customOcrVerification]);

  const verificationByField = useMemo(() => {
    const map = {};
    hudVerification.forEach(item => {
      if (item && item.field) {
        map[item.field] = item;
        const aliases = FIELD_FALLBACKS[item.field] || [];
        aliases.forEach(a => {
          map[a] = item;
        });
      }
    });
    return map;
  }, [hudVerification]);

  const matchCount = useMemo(() => {
    return hudVerification.filter(v => v.status === 'Match').length;
  }, [hudVerification]);

  const discrepancyCount = useMemo(() => {
    return hudVerification.filter(v => v.status === 'Discrepancy').length;
  }, [hudVerification]);

  const notDetectedCount = useMemo(() => {
    return hudVerification.filter(v => v.status === 'Not Detected' || v.status === 'Form Only').length;
  }, [hudVerification]);

  const discrepancies = useMemo(() => {
    return hudVerification.filter(v => v.status === 'Discrepancy');
  }, [hudVerification]);

  const hudPhotos = useMemo(() => {
    const list =
      data?.EXTRACTED_PHOTOS ||
      data?.extracted_photos ||
      data?.clean_data?.EXTRACTED_PHOTOS ||
      data?.clean_data?.extracted_photos ||
      allData?.EXTRACTED_PHOTOS ||
      allData?.extracted_photos ||
      allData?.clean_data?.EXTRACTED_PHOTOS ||
      allData?.clean_data?.extracted_photos ||
      [];
    if (!Array.isArray(list)) return [];
    return list.filter(p => {
      const cap = (p.caption || '').toLowerCase();
      const origCap = (p.original_caption || '').toLowerCase();
      const vt = (p.view_type || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return (
        vt.includes('hud') ||
        vt.includes('data plate') ||
        vt.includes('certification label') ||
        cat.includes('hud') ||
        cap.includes('hud') ||
        origCap.includes('hud') ||
        /\b(?:data\s+hud(?:\s+id)?|hud\s+id|hud\s+info(?:rmation)?|hud\s*plate(?:\s*#?\s*\d+)?|plate\s*#?\s*[1-9]\d*|hud\s*cert(?:ification)?(?:\s*label)?|hud\s*label(?:\s*#?\s*\d+)?(?:\s+illegible)?|label\s*#?\s*[1-9]\d*(?:\s+illegible)?|data\s*plate|compliance\s*cert(?:ificate)?)\b/i.test(cap) ||
        /\b(?:data\s+hud(?:\s+id)?|hud\s+id|hud\s+info(?:rmation)?|hud\s*plate(?:\s*#?\s*\d+)?|plate\s*#?\s*[1-9]\d*|hud\s*cert(?:ification)?(?:\s*label)?|hud\s*label(?:\s*#?\s*\d+)?(?:\s+illegible)?|label\s*#?\s*[1-9]\d*(?:\s+illegible)?|data\s*plate|compliance\s*cert(?:ificate)?)\b/i.test(origCap)
      );
    });
  }, [data, allData]);

  const getValue = (key) => {
    const fallbacks = FIELD_FALLBACKS[key] || [];
    const allKeys = [key, ...fallbacks];
    for (const k of allKeys) {
      const val =
        data?.['Manufactured Home']?.[k] ??
        data?.MANUFACTURED_HOME?.[k] ??
        data?.clean_data?.['Manufactured Home']?.[k] ??
        data?.clean_data?.MANUFACTURED_HOME?.[k] ??
        allData?.clean_data?.['Manufactured Home']?.[k] ??
        allData?.clean_data?.MANUFACTURED_HOME?.[k] ??
        data?.Improvements?.[k] ??
        data?.IMPROVEMENTS?.[k] ??
        data?.[k] ??
        allData?.[k] ??
        hudImageData?.[k] ??
        '';
      if (val !== undefined && val !== null && val !== '') {
        return typeof val === 'object' && val !== null ? (val.value ?? val.choice ?? '') : String(val);
      }
    }
    return '';
  };

  const handleFieldChange = (fieldKey, value) => {
    if (!onDataChange) return;
    onDataChange(['Manufactured Home', fieldKey], value);
    onDataChange(['IMPROVEMENTS', fieldKey], value);
    onDataChange([fieldKey], value);
  };

  const handleRunHudOcr = async () => {
    setOcrLoading(true);
    setOcrError('');
    try {
      const activeFile = allData?.selectedFile || allData?.xmlFile;
      const formData = new FormData();
      if (activeFile) {
        formData.append('file', activeFile);
      }
      const formFields = {
        'HUD Certification Label #(s)': getValue('HUD Certification Label #(s)'),
        "Manufacturer’s Serial #(s)/VIN #(s)": getValue("Manufacturer’s Serial #(s)/VIN #(s)"),
        "Manufacturer's Name": getValue("Manufacturer's Name"),
        'Trade/Model': getValue('Trade/Model'),
        'Date of Manufacture': getValue('Date of Manufacture'),
      };
      formData.append('form_data', JSON.stringify(formFields));

      if (hudPhotos && hudPhotos.length > 0) {
        const photoPayload = hudPhotos.map(p => ({
          caption: p.caption || '',
          original_caption: p.original_caption || '',
          view_type: p.view_type || '',
          category: p.category || '',
          image_data: p.image_data || p.base64_preview || '',
          base64_preview: p.base64_preview || '',
        }));
        formData.append('photos', JSON.stringify(photoPayload));
      }

      const res = await fetch(`${API_BASE_URL}/api/extract-hud-ocr/`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to extract OCR from HUD photos.');
      }
      const resJson = await res.json();
      if (resJson.status === 'success') {
        const ocrDataRes = resJson.hud_image_data || {};
        const ocrVerifRes = resJson.hud_image_verification || [];
        setCustomOcrData(ocrDataRes);
        setCustomOcrVerification(ocrVerifRes);
        setShowOcrAudit(true);

        if (onDataChange) {
          onDataChange(['HUD_IMAGE_DATA'], ocrDataRes);
          onDataChange(['HUD_IMAGE_VERIFICATION'], ocrVerifRes);
          onDataChange(['Manufactured Home', '_hud_image_data'], ocrDataRes);
          onDataChange(['Manufactured Home', '_hud_image_verification'], ocrVerifRes);
        }
      } else {
        throw new Error(resJson.detail || 'OCR extraction returned no data.');
      }
    } catch (err) {
      console.error('HUD OCR Error:', err);
      setOcrError(err.message || 'Error running OCR extraction.');
    } finally {
      setOcrLoading(false);
    }
  };

  const effectiveFormType = (
    formType ||
    allData?.formType ||
    data?.formType ||
    data?.['Form Type'] ||
    allData?.['Form Type'] ||
    data?.form_type ||
    allData?.form_type ||
    ''
  ).toString().toUpperCase();

  const is1004C = effectiveFormType.includes('1004C');

  if (!is1004C) {
    return null;
  }

  return (
    <Paper
      id={id}
      elevation={1}
      sx={{
        mb: 4,
        mt: 3,
        borderRadius: 2,
        overflow: 'hidden',
        borderTop: '3px solid',
        borderTopColor: 'primary.main',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}
    >
      <Box
        sx={{
          bgcolor: 'grey.50',
          color: 'text.primary',
          borderBottom: '1px solid #e2e8f0',
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <HomeWorkIcon sx={{ color: 'primary.main', fontSize: '1.25rem' }} />
        <Typography variant="h6" component="h5" sx={{ fontSize: '1.02rem', fontWeight: 'bold' }}>
          {title}
        </Typography>
      </Box>

      {/* HUD Plate & Certification Label Photos Preview */}
      <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <PhotoLibraryIcon sx={{ color: 'primary.main', fontSize: '1.1rem' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
              HUD Plate &amp; Certification Photo Exhibits
            </Typography>
            <Chip
              size="small"
              icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
              label={`${hudPhotos.length} Photo${hudPhotos.length === 1 ? '' : 's'} Found`}
              color={hudPhotos.length > 0 ? 'success' : 'default'}
              variant="outlined"
              sx={{ fontWeight: 600, height: 24 }}
            />
            {hudPhotos.length > 0 && (
              <Button
                variant={hudVerification.length > 0 ? 'outlined' : 'contained'}
                color="primary"
                size="small"
                startIcon={ocrLoading ? <CircularProgress size={14} color="inherit" /> : <DocumentScannerIcon sx={{ fontSize: '16px !important' }} />}
                disabled={ocrLoading}
                onClick={handleRunHudOcr}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', height: 26, ml: 1, borderRadius: 1 }}
              >
                {ocrLoading ? 'Reading HUD Photos...' : (hudVerification.length > 0 ? 'Re-scan HUD Photos' : 'Extract Data from Photos')}
              </Button>
            )}
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Target labels: Data HUD ID, HUD Info, HUD Certification Label, Hud Label, Hud Label 1/2 Illegible, HUD Plate 1/2, Plate 1/2, Data Plate, HUD Certificate
          </Typography>
        </Box>

        {hudPhotos.length > 0 && hudVerification.length === 0 && (
          <Alert
            severity="info"
            icon={<DocumentScannerIcon fontSize="small" />}
            action={
              <Button
                color="primary"
                variant="contained"
                size="small"
                onClick={handleRunHudOcr}
                disabled={ocrLoading}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
              >
                {ocrLoading ? 'Scanning...' : 'Extract Data from Photos'}
              </Button>
            }
            sx={{ my: 1.5, borderRadius: 1.5, py: 0.5 }}
          >
            <strong>{hudPhotos.length} HUD photo exhibits detected.</strong> Click &quot;Extract Data from Photos&quot; to read data plate &amp; certification label text and cross-verify with Form 1004C fields.
          </Alert>
        )}

        {ocrError && (
          <Alert severity="error" sx={{ my: 1, borderRadius: 1.5, py: 0.5 }}>
            {ocrError}
          </Alert>
        )}

        {hudPhotos.length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {hudPhotos.map((photo, pIdx) => {
              const previewSrc = photo.base64_preview || photo.image_data || photo.url || '';
              return (
                <Card
                  key={pIdx}
                  variant="outlined"
                  onClick={() => previewSrc && setSelectedPhoto(photo)}
                  sx={{
                    width: 220,
                    cursor: previewSrc ? 'pointer' : 'default',
                    borderRadius: 1.5,
                    border: '1px solid #cbd5e1',
                    transition: 'all 0.2s',
                    '&:hover': previewSrc ? { boxShadow: '0 4px 12px rgba(0,0,0,0.12)', borderColor: 'primary.main', transform: 'translateY(-2px)' } : {}
                  }}
                >
                  {previewSrc ? (
                    <Box sx={{ position: 'relative', height: 130, bgcolor: '#0f172a' }}>
                      <CardMedia
                        component="img"
                        image={previewSrc}
                        alt={photo.caption || 'HUD Photo'}
                        sx={{ height: 130, objectFit: 'contain', width: '100%' }}
                      />
                      <Box sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'rgba(0,0,0,0.6)', borderRadius: '50%', p: 0.4 }}>
                        <ZoomInIcon sx={{ color: '#fff', fontSize: '16px' }} />
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f1f5f9' }}>
                      <PhotoLibraryIcon sx={{ color: '#94a3b8', fontSize: 32 }} />
                    </Box>
                  )}
                  <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b', display: 'block', lineHeight: 1.3 }}>
                      {photo.caption || photo.title || 'HUD Exhibit'}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                      {photo.page && (
                        <Chip size="small" label={`Page ${photo.page}`} sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                      {photo.view_type && (
                        <Chip size="small" label={photo.view_type} color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', fontSize: '0.82rem' }}>
            No HUD Plate / Certification Label photos detected yet. When uploaded, photographs labeled &quot;Data HUD ID&quot;, &quot;HUD Info&quot;, &quot;HUD Certification Label&quot;, &quot;Hud Label&quot;, &quot;Hud Label 1/2 Illegible&quot;, &quot;HUD Plate 1/2&quot;, &quot;Data Plate&quot;, or &quot;HUD Certificate&quot; will display here automatically.
          </Typography>
        )}
      </Box>

      {/* HUD Image OCR & Form 1004C Cross-Verification Panel */}
      {(hudVerification.length > 0 || hudImageData) && (
        <Box sx={{ p: 2, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DocumentScannerIcon sx={{ color: 'primary.main', fontSize: '1.25rem' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                HUD Photo OCR &amp; Form 1004C Cross-Verification
              </Typography>
              {matchCount > 0 && (
                <Chip
                  size="small"
                  icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                  label={`${matchCount} Match${matchCount === 1 ? '' : 'es'}`}
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 600, height: 24 }}
                />
              )}
              {discrepancyCount > 0 && (
                <Chip
                  size="small"
                  icon={<WarningAmberIcon sx={{ fontSize: '14px !important' }} />}
                  label={`${discrepancyCount} Discrepanc${discrepancyCount === 1 ? 'y' : 'ies'}`}
                  color="warning"
                  variant="filled"
                  sx={{ fontWeight: 700, height: 24 }}
                />
              )}
              {notDetectedCount > 0 && (
                <Chip
                  size="small"
                  icon={<HelpOutlineIcon sx={{ fontSize: '14px !important' }} />}
                  label={`${notDetectedCount} Not Detected in OCR`}
                  color="default"
                  variant="outlined"
                  sx={{ fontWeight: 600, height: 24, bgcolor: '#f8fafc', color: '#64748b', borderColor: '#cbd5e1' }}
                />
              )}
            </Box>
            <Button
              size="small"
              onClick={() => setShowOcrAudit(!showOcrAudit)}
              endIcon={showOcrAudit ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
            >
              {showOcrAudit ? 'Hide Verification Audit' : 'Show Verification Audit'}
            </Button>
          </Box>

          <Collapse in={showOcrAudit}>
            {discrepancies.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 1.5, py: 0.5, px: 2 }}>
                <AlertTitle sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 0.25 }}>
                  Quality Control Discrepancy Detected
                </AlertTitle>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }} component="div">
                  {discrepancies.map((d, i) => (
                    <Box key={i} sx={{ my: 0.25 }}>
                      • <strong>{d.field}:</strong> Appraisal Form lists &quot;{d.form_value}&quot;, but physical HUD image indicates &quot;{d.image_value}&quot;. {d.note}
                    </Box>
                  ))}
                </Typography>
              </Alert>
            )}

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, mb: 1, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', py: 0.8, color: '#475569', width: '28%' }}>
                      Field Name
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', py: 0.8, color: '#475569', width: '22%' }}>
                      Form 1004C Value
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', py: 0.8, color: '#475569', width: '22%' }}>
                      Image OCR Read Value
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', py: 0.8, color: '#475569', width: '13%' }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', py: 0.8, color: '#475569', width: '15%' }}>
                      Verification Note
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hudVerification.map((item, idx) => {
                    const isMatch = item.status === 'Match';
                    const isDiscrepancy = item.status === 'Discrepancy';
                    const isNotDetected = item.status === 'Not Detected' || item.status === 'Form Only';
                    return (
                      <TableRow
                        key={idx}
                        sx={{
                          bgcolor: isDiscrepancy ? '#fffbeb' : idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          '&:hover': { bgcolor: isDiscrepancy ? '#fef3c7' : '#f1f5f9' }
                        }}
                      >
                        <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b', py: 0.75 }}>
                          {item.field}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.78rem', color: '#334155', py: 0.75 }}>
                          {item.form_value || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: isDiscrepancy ? '#b45309' : isMatch ? '#0f766e' : '#94a3b8', py: 0.75 }}>
                          {item.image_value || '—'}
                        </TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <Chip
                            size="small"
                            label={item.status}
                            color={isMatch ? 'success' : isDiscrepancy ? 'warning' : 'default'}
                            icon={
                              isMatch ? (
                                <CheckCircleIcon sx={{ fontSize: '13px !important' }} />
                              ) : isDiscrepancy ? (
                                <WarningAmberIcon sx={{ fontSize: '13px !important' }} />
                              ) : (
                                <HelpOutlineIcon sx={{ fontSize: '13px !important' }} />
                              )
                            }
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              ...(isNotDetected ? { bgcolor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' } : {})
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.72rem', color: isDiscrepancy ? '#92400e' : isMatch ? '#15803d' : '#64748b', py: 0.75 }}>
                          {item.note}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Collapse>
        </Box>
      )}

      {/* Full Photo Zoom Dialog */}
      <Dialog
        open={Boolean(selectedPhoto)}
        onClose={() => setSelectedPhoto(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, bgcolor: '#0b1120', color: '#fff', overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, px: 2.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff' }}>
              {selectedPhoto?.caption || selectedPhoto?.title || 'HUD Exhibit Photo'}
            </Typography>
            {selectedPhoto?.page && (
              <Chip size="small" label={`Page ${selectedPhoto.page}`} color="primary" sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }} />
            )}
            {selectedPhoto?.view_type && (
              <Chip size="small" label={selectedPhoto.view_type} variant="outlined" sx={{ height: 22, fontSize: '0.7rem', color: '#94a3b8', borderColor: '#475569' }} />
            )}
          </Box>
          <IconButton size="small" onClick={() => setSelectedPhoto(null)} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: '#090d16' }}>
          {(selectedPhoto?.base64_preview || selectedPhoto?.image_data || selectedPhoto?.url) && (
            <InteractiveZoomImageViewer
              src={selectedPhoto.base64_preview || selectedPhoto.image_data || selectedPhoto.url}
              alt={selectedPhoto.caption || 'HUD Full Exhibit'}
              maxHeight="75vh"
            />
          )}
        </DialogContent>
      </Dialog>

      <TableContainer>
        <Table size="small" aria-label="manufactured-home-table" sx={{ borderCollapse: 'collapse', width: '100%' }}>
          <TableBody>
            {MANUFACTURED_HOME_SECTIONS.map((section, sIdx) => (
              <React.Fragment key={sIdx}>
                <TableRow sx={{ bgcolor: '#e2e8f0' }}>
                  <TableCell
                    colSpan={2}
                    sx={{
                      py: 0.9,
                      px: 2,
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      color: '#1e293b',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      border: '1px solid #cbd5e1'
                    }}
                  >
                    {section.groupTitle}
                  </TableCell>
                </TableRow>
                {section.fields.map((field, fIdx) => {
                  const usePre = PRE_FORMATTED_FIELDS.has(field);
                  return (
                    <TableRow hover key={fIdx} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                      <TableCell
                        sx={{
                          width: '42%',
                          bgcolor: '#f8fafc',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          color: '#334155',
                          border: '1px solid #e2e8f0',
                          py: 1,
                          px: 2,
                          verticalAlign: usePre ? 'top' : 'middle',
                          lineHeight: 1.45,
                        }}
                      >
                        {field}
                      </TableCell>
                      <TableCell
                        sx={{
                          width: '58%',
                          border: '1px solid #e2e8f0',
                          py: 0.75,
                          px: 1.5,
                          verticalAlign: 'middle',
                          bgcolor: '#ffffff'
                        }}
                      >
                        <EditableField
                          fieldPath={['Manufactured Home', field]}
                          value={getValue(field)}
                          onDataChange={(path, val) => handleFieldChange(field, val)}
                          editingField={editingField}
                          setEditingField={setEditingField}
                          isEditable={isEditable}
                          allData={allData}
                          usePre={usePre}
                          manualValidations={manualValidations}
                          handleManualValidation={handleManualValidation}
                        />
                        {verificationByField[field] && (
                          <Box sx={{ mt: 0.5 }}>
                            {verificationByField[field].status === 'Match' && verificationByField[field].image_value ? (
                              <Chip
                                size="small"
                                variant="outlined"
                                color="success"
                                icon={<CheckCircleIcon sx={{ fontSize: '13px !important' }} />}
                                label={`Image OCR Verified: ${verificationByField[field].image_value}`}
                                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 500 }}
                              />
                            ) : verificationByField[field].status === 'Discrepancy' ? (
                              <Box>
                                <Chip
                                  size="small"
                                  variant="filled"
                                  color="warning"
                                  icon={<WarningAmberIcon sx={{ fontSize: '13px !important' }} />}
                                  label={`Image OCR Discrepancy: ${verificationByField[field].image_value || 'None'} (Form: ${verificationByField[field].form_value})`}
                                  sx={{ height: 21, fontSize: '0.7rem', fontWeight: 600 }}
                                />
                                <Typography variant="caption" sx={{ display: 'block', color: 'error.main', fontSize: '0.7rem', mt: 0.25, lineHeight: 1.25 }}>
                                  {verificationByField[field].note}
                                </Typography>
                              </Box>
                            ) : null}
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ManufacturedHomeTable;
