import React from 'react';
import {
  Paper, Box, Typography, TableContainer, Table, TableBody, TableRow, TableCell
} from '@mui/material';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import { EditableField } from '../components/EditableField';

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

export const ManufacturedHomeTable = ({
  id = 'manufactured-home-section',
  title = 'HUD Data Plate & Compliance Certificate / Certification Label',
  data = {},
  allData = {},
  onDataChange,
  editingField,
  setEditingField,
  isEditable = true,
  manualValidations,
  handleManualValidation,
}) => {
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
