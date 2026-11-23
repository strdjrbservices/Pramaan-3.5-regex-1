import React, { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import VisibilityTwoToneIcon from '@mui/icons-material/VisibilityTwoTone';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningIcon from '@mui/icons-material/Warning';

export const ContractComparisonSection = ({
  contractFile,
  reportFile,
  loading,
  result,
  error,
  onCompare,
  onClose,
  onPreview,
  canCompare,
  mainData
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!contractFile) return null;

  const mismatchCount = (result || []).filter(item => item.status === 'Mismatch').length;

  return (
    <Paper
      id="contract-comparison-section"
      elevation={2}
      sx={{
        p: 2.5,
        mb: 3,
        bgcolor: '#ffffff',
        borderRadius: 2,
        borderTop: '3px solid #0284c7',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          cursor: 'pointer'
        }}
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
              Contract Comparison
            </Typography>
          </Box>

          <Chip
            label={contractFile.name}
            size="small"
            variant="outlined"
            color="primary"
            sx={{ fontWeight: 600, bgcolor: '#f0f9ff', borderColor: '#bae6fd' }}
            onClick={(e) => e.stopPropagation()}
          />

          {result && (
            <Chip
              label={
                mismatchCount === 0
                  ? 'All Fields Matched'
                  : `${mismatchCount} Discrepanc${mismatchCount === 1 ? 'y' : 'ies'}`
              }
              size="small"
              color={mismatchCount === 0 ? 'success' : 'error'}
              sx={{ fontWeight: 700 }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </Box>

        {/* Header Right Actions */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          onClick={(e) => e.stopPropagation()}
        >
          {result ? (
            <Button
              variant="contained"
              size="small"
              onClick={onCompare}
              disabled={loading}
              sx={{ fontWeight: 700, textTransform: 'uppercase', px: 2 }}
            >
              Reload
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              onClick={onCompare}
              disabled={loading || !canCompare}
              sx={{ fontWeight: 700, textTransform: 'uppercase', px: 2 }}
            >
              Compare
            </Button>
          )}

          {onPreview && (
            <IconButton
              size="small"
              onClick={() => onPreview(contractFile)}
              title="Preview Contract PDF"
              sx={{ p: 0.5, color: '#0284c7' }}
            >
              <VisibilityTwoToneIcon fontSize="small" />
            </IconButton>
          )}

          <IconButton
            size="small"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand Section' : 'Minimize Section'}
          >
            {isMinimized ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
          </IconButton>

          <IconButton
            size="small"
            onClick={onClose}
            title="Close / Remove Contract"
            sx={{ p: 0.5, color: '#64748b', '&:hover': { color: '#ef4444' } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* Collapsible Content */}
      {!isMinimized && (
        <Box sx={{ mt: 2 }}>
          {/* File Indicators */}
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`Main Report: ${reportFile?.name || 'Not selected'}`}
              color={reportFile ? "primary" : "default"}
              variant="outlined"
              size="small"
              sx={{ fontWeight: 600, bgcolor: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}
            />
            <Chip
              label={`Contract Copy: ${contractFile?.name || 'Not selected'}`}
              color={contractFile ? "primary" : "default"}
              variant="outlined"
              size="small"
              sx={{ fontWeight: 600, bgcolor: '#f0f9ff', borderColor: '#bae6fd', color: '#0369a1' }}
            />
          </Box>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4, gap: 1.5 }}>
              <CircularProgress size={24} sx={{ color: '#0284c7' }} />
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                Comparing main report with contract copy...
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ my: 1.5, borderRadius: 1.5 }}>
              {error}
            </Alert>
          )}

          {result ? (
            <Box>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: '22%', color: '#334155' }}>Field</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '34%', color: '#334155' }}>Main Report (Appraisal)</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '34%', color: '#334155' }}>Contract Copy</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '10%', color: '#334155' }} align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {((result && result.length > 0) ? result.map(r => r.field) : ['Contract Price', 'Contract Date']).map(fieldName => {
                      const item = (result || []).find(r => r.field && r.field.toLowerCase() === fieldName.toLowerCase()) ||
                                   (result || []).find(r => r.field && r.field.toLowerCase().includes(fieldName.toLowerCase()));
                      const mainFallback = fieldName === 'Contract Price' 
                        ? (mainData?.CONTRACT?.['Contract Price $'] || mainData?.CONTRACT?.['Contract Price']) 
                        : fieldName === 'Contract Date'
                        ? mainData?.CONTRACT?.['Date of Contract']
                        : null;
                      const isMatch = item?.status === 'Match';
                      const isMismatch = item?.status === 'Mismatch';
                      const isInfo = item?.status === 'Info';
                      const mainVal = item?.old_value || item?.main_report_value || mainFallback || 'N/A';
                      const contractVal = item?.new_value || item?.contract_copy_value || 'N/A';
                      const status = item ? item.status : 'Unknown';

                      return (
                        <TableRow
                          key={fieldName}
                          sx={{
                            bgcolor: isMismatch ? '#fff5f5' : '#ffffff',
                            '&:hover': { bgcolor: isMismatch ? '#fee2e2' : '#f8fafc' },
                            '&:last-child td, &:last-child th': { border: 0 }
                          }}
                        >
                          <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {fieldName}
                          </TableCell>
                          <TableCell sx={{ color: '#334155', fontWeight: 500 }}>
                            {mainVal}
                          </TableCell>
                          <TableCell sx={{ color: '#334155', fontWeight: 500 }}>
                            {contractVal}
                          </TableCell>
                          <TableCell align="center">
                            {item ? (
                              <Chip
                                icon={
                                  isMatch ? (
                                    <CheckCircleOutlineIcon sx={{ fontSize: '18px !important' }} />
                                  ) : isInfo ? (
                                    <InfoOutlinedIcon sx={{ fontSize: '18px !important' }} />
                                  ) : (
                                    <ErrorOutlineIcon sx={{ fontSize: '18px !important' }} />
                                  )
                                }
                                label={status}
                                color={isMatch ? "success" : isInfo ? "default" : "error"}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 700 }}
                              />
                            ) : (
                              <WarningIcon color="warning" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 2 }}>
                <Button onClick={onClose} sx={{ color: '#64748b', fontWeight: 600 }}>
                  Close
                </Button>
                <Button
                  onClick={onCompare}
                  variant="contained"
                  disabled={loading}
                  sx={{ fontWeight: 700, textTransform: 'uppercase', px: 2.5 }}
                >
                  Reload
                </Button>
              </Box>
            </Box>
          ) : !loading && (
            <Box sx={{ py: 1.5 }}>
              <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
                Click 'Compare' to check for consistency in Contract Date and Contract Price between the main report and the contract copy.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                <Button onClick={onClose} sx={{ color: '#64748b', fontWeight: 600 }}>
                  Close
                </Button>
                <Button
                  onClick={onCompare}
                  variant="contained"
                  disabled={loading || !canCompare}
                  sx={{ fontWeight: 700, textTransform: 'uppercase', px: 2.5 }}
                >
                  Compare
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default ContractComparisonSection;
