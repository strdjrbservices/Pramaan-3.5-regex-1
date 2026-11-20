import React from 'react';
import { Paper, Box, Typography, Button } from '@mui/material';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

// Configurable URL for image & photo verification:
// You can update this string with your URL or pass it via window.VERIFY_IMAGES_URL or verifyImagesUrl prop
export const VERIFY_IMAGES_URL = 'https://appraisalqc-strdjrbservices2.pythonanywhere.com/';

export const ImageVerificationBanner = ({
  verifyImagesUrl,
  onVerifyImagesClick,
}) => {
  const handleVerify = () => {
    if (typeof onVerifyImagesClick === 'function') {
      onVerifyImagesClick();
      return;
    }
    const targetUrl = verifyImagesUrl || window.VERIFY_IMAGES_URL || VERIFY_IMAGES_URL;
    if (targetUrl && targetUrl !== '#') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      alert('Redirect URL for image verification will be configured shortly.');
    }
  };

  return (
    <Box sx={{ mb: 2.5, width: '100%' }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          border: '1px solid #bfdbfe',
          background: 'linear-gradient(135deg, #000000ff 0%, #000000ff 100%)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Box
            sx={{
              p: 0.8,
              borderRadius: 1.5,
              bgcolor: '#000000ff',
              color: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mt: 0.25,
            }}
          >
            <PhotoLibraryIcon sx={{ fontSize: '1.4rem' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: '#1e3a8a',
                fontSize: '0.92rem',
                lineHeight: 1.4,
              }}
            >
              To verify images/ photo, blank pages, duplicate photo, etc click below button
            </Typography>
            <Typography variant="body2" sx={{ color: '#005bdbff', fontSize: '0.78rem', mt: 0.25 }}>
              Launch image &amp; photo audit review tools to inspect exhibits, duplicate images, and blank pages.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ pl: { xs: 0, sm: 5 } }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleVerify}
            startIcon={<PhotoLibraryIcon />}
            endIcon={<OpenInNewIcon sx={{ fontSize: '1rem' }} />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              py: 0.75,
              px: 2.5,
              borderRadius: 1.5,
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
              bgcolor: '#2563eb',
              '&:hover': {
                bgcolor: '#1d4ed8',
                boxShadow: '0 4px 6px rgba(37, 99, 235, 0.3)',
              },
            }}
          >
            Verify the images/ photos
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ImageVerificationBanner;
