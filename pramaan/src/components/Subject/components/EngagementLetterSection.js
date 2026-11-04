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

export const EngagementLetterSection = ({
  engagementLetterFile,
  loading,
  result,
  error,
  onCompare,
  onClose,
  onPreview,
  canCompare
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!engagementLetterFile) return null;

  const mismatchCount = (result || []).filter(item => item.status !== 'Match').length;

  return (
    <Paper
      id="engagement-letter-section"
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
              Engagement Letter Comparison
            </Typography>
          </Box>

          <Chip
            label={engagementLetterFile.name}
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
              onClick={() => onPreview(engagementLetterFile)}
              title="Preview Engagement Letter PDF"
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
            title="Close / Remove Engagement Letter"
            sx={{ p: 0.5, color: '#64748b', '&:hover': { color: '#ef4444' } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* Collapsible Content */}
      {!isMinimized && (
        <Box sx={{ mt: 2 }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4, gap: 1.5 }}>
              <CircularProgress size={24} sx={{ color: '#0284c7' }} />
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                Comparing main report with engagement letter...
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
                      <TableCell sx={{ fontWeight: 700, width: '18%', color: '#334155' }}>Field</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '37%', color: '#334155' }}>Main Report</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '37%', color: '#334155' }}>Engagement Letter</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '8%', color: '#334155' }} align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.map((item, index) => {
                      const isMatch = item.status === 'Match';
                      return (
                        <TableRow
                          key={index}
                          sx={{
                            bgcolor: isMatch ? '#ffffff' : '#fff5f5',
                            '&:hover': { bgcolor: isMatch ? '#f8fafc' : '#fee2e2' },
                            '&:last-child td, &:last-child th': { border: 0 }
                          }}
                        >
                          <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {item.field}
                          </TableCell>
                          <TableCell sx={{ color: '#334155', fontWeight: 500 }}>
                            {item.main_report_value || item.old_value || 'N/A'}
                          </TableCell>
                          <TableCell sx={{ color: '#334155', fontWeight: 500 }}>
                            {item.engagement_letter_value || item.new_value || 'N/A'}
                          </TableCell>
                          <TableCell align="center">
                            {isMatch ? (
                              <CheckCircleOutlineIcon sx={{ color: '#16a34a', verticalAlign: 'middle', fontSize: 22 }} />
                            ) : (
                              <ErrorOutlineIcon sx={{ color: '#dc2626', verticalAlign: 'middle', fontSize: 22 }} />
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
                Click 'Compare' to check for consistency in Property Address, Vendor's Fee, Lender Name, and Lender Address between the main report and the engagement letter.
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
export default EngagementLetterSection;

