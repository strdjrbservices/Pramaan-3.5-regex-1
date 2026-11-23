import React, { useState, useMemo } from 'react';

import {

  Paper,

  Box,

  Typography,

  Chip,

  Grid,

  Card,

  CardMedia,

  CardContent,

  Dialog,

  DialogTitle,

  DialogContent,

  IconButton,

  Tooltip,

  Alert,

  Stack

} from '@mui/material';

import {

  PhotoLibrary as PhotoLibraryIcon,

  ZoomIn as ZoomInIcon,

  Close as CloseIcon,

  CheckCircle as CheckCircleIcon,

  WarningAmber as WarningIcon,

  Collections as CollectionsIcon,

  ImageSearch as ImageSearchIcon,

  RotateRight as RotateRightIcon

} from '@mui/icons-material';

import { InteractiveZoomImageViewer } from './InteractiveZoomImageViewer.js';



export const PhotosGallerySection = ({

  id = 'photos-exhibits-section',

  data = {},

  allData = {},

  extractedPhotos = []

}) => {

  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const [previewPhoto, setPreviewPhoto] = useState(null);

  const [rotation, setRotation] = useState(0);



  // Combine photos from props or from data/allData

  const photosList = useMemo(() => {

    if (Array.isArray(extractedPhotos) && extractedPhotos.length > 0) {

      return extractedPhotos;

    }

    if (data?.EXTRACTED_PHOTOS && Array.isArray(data.EXTRACTED_PHOTOS)) {

      return data.EXTRACTED_PHOTOS;

    }

    if (data?.extracted_photos && Array.isArray(data.extracted_photos)) {

      return data.extracted_photos;

    }

    if (allData?.EXTRACTED_PHOTOS && Array.isArray(allData.EXTRACTED_PHOTOS)) {

      return allData.EXTRACTED_PHOTOS;

    }

    if (allData?.extracted_photos && Array.isArray(allData.extracted_photos)) {

      return allData.extracted_photos;

    }

    return [];

  }, [extractedPhotos, data, allData]);



  // Normalize category names

  const normalizeCategory = (cat, p = {}) => {
    if (!cat && !p) return 'General';
    const c = String(cat || '').trim().toLowerCase();
    const vt = String(p?.view_type || '').toLowerCase();
    const cap = String(p?.caption || p?.title || p?.original_caption || '').toLowerCase();

    if (
      c.includes('hud') || c.includes('plate') || c.includes('certification label') ||
      vt.includes('hud') || vt.includes('plate') || vt.includes('data plate') ||
      cap.includes('hud') ||
      /\b(?:data\s+hud(?:\s+id)?|hud\s+info|hud\s*plate|plate\s*[1-9]|hud\s*cert(?:ification)?(?:\s*label)?|hud\s*label|label\s*[1-9]|data\s*plate|compliance\s*cert)\b/i.test(cap)
    ) {
      return 'HUD Plate & Certification';
    }

    if (c === 'subject interior' || c === 'interior') return 'Subject interior';
    if (c === 'subject property' || c === 'subject') return 'Subject property';
    if (c === 'comparable property' || c === 'comparable' || c === 'comp') return 'Comparable property';
    if (c === 'rental property' || c === 'rental') return 'Rental property';
    if (c.includes('sketch') || c.includes('floor')) return 'Building Sketch';
    if (c.includes('map') || c.includes('aerial')) return 'Maps & Aerials';

    return cat || 'General';
  };



  // Categories and counts

  const categoryCounts = useMemo(() => {

    const counts = {

      ALL: photosList.length,

      'Subject property': 0,

      'Subject interior': 0,

      'Comparable property': 0,

      'Rental property': 0,

      'Needs Review': 0,

      'Building Sketch': 0,

      'Maps & Aerials': 0,

      'HUD Plate & Certification': 0,

      General: 0

    };

    photosList.forEach(p => {
      const norm = normalizeCategory(p.category, p);
      if (p.match_status === 'unmatched' || p.match_confidence === 'low' || p.caption === 'Caption not found') {
        counts['Needs Review']++;
      }
      if (counts[norm] !== undefined) {
        counts[norm]++;
      } else {
        counts.General++;
      }
    });
    return counts;
  }, [photosList]);

  const [searchTerm, setSearchTerm] = useState('');

  // Filtered photos by Category AND Search Term
  const filteredPhotos = useMemo(() => {
    return photosList.filter(p => {
      const normCat = normalizeCategory(p.category, p);

      let matchCat = true;

      if (selectedCategory === 'ALL') {

        matchCat = true;

      } else if (selectedCategory === 'Needs Review') {

        matchCat = p.match_status === 'unmatched' || p.match_confidence === 'low' || p.caption === 'Caption not found';

      } else {

        matchCat = normCat === selectedCategory;

      }

      const matchSearch = !searchTerm.trim() ||

        (p.caption && p.caption.toLowerCase().includes(searchTerm.toLowerCase())) ||

        (p.original_caption && p.original_caption.toLowerCase().includes(searchTerm.toLowerCase())) ||

        (normCat && normCat.toLowerCase().includes(searchTerm.toLowerCase())) ||

        (`page ${p.page}`.includes(searchTerm.toLowerCase()));

      return matchCat && matchSearch;

    });

  }, [photosList, selectedCategory, searchTerm]);



  // Requirement Verification Checks

  const verificationStatus = useMemo(() => {

    const hasFront = photosList.some(p => /front/i.test(p.caption || '') || /front/i.test(p.category || ''));

    const hasRear = photosList.some(p => /rear/i.test(p.caption || '') || /rear/i.test(p.category || ''));

    const hasStreet = photosList.some(p => /street/i.test(p.caption || '') || /street/i.test(p.category || ''));

    const compPhotosCount = photosList.filter(p => /comparable/i.test(p.category || '') || /comp/i.test(p.caption || '')).length;

    const is1004C = Boolean(
      (typeof data?.form_type === 'string' && data.form_type.includes('1004C')) ||
      (typeof allData?.form_type === 'string' && allData.form_type.includes('1004C')) ||
      (typeof data?.formType === 'string' && data.formType.includes('1004C')) ||
      (typeof allData?.formType === 'string' && allData.formType.includes('1004C')) ||
      (typeof data?.['Form Type'] === 'string' && data['Form Type'].includes('1004C')) ||
      (typeof allData?.['Form Type'] === 'string' && allData['Form Type'].includes('1004C')) ||
      photosList.some(p => /hud|data\s*plate/i.test(p.caption || '') || /hud|data\s*plate/i.test(p.original_caption || ''))
    );

    const hasHudPlate = photosList.some(p =>
      p.view_type === 'HUD Certification Label' ||
      /\b(?:hud\s*plate|plate\s*[1-9]|hud\s*cert(?:ification)?(?:\s*label)?|hud\s*label(?:\s*[1-9]\d*)?(?:\s+illegible)?|label\s*[1-9])\b/i.test(p.caption || '') ||
      /\b(?:hud\s*plate|plate\s*[1-9]|hud\s*cert(?:ification)?(?:\s*label)?|hud\s*label(?:\s*[1-9]\d*)?(?:\s+illegible)?|label\s*[1-9])\b/i.test(p.original_caption || '')
    );

    const hasHudDataPlate = photosList.some(p =>
      p.view_type === 'HUD Data Plate / Compliance Certificate' ||
      /\b(?:data\s+hud(?:\s+id)?|hud\s+info|hud\s*data\s*plate|hud\s*plate\s*data|data\s*plate|hud\s*cert(?:ificate)?|compliance\s*cert(?:ificate)?)\b/i.test(p.caption || '') ||
      /\b(?:data\s+hud(?:\s+id)?|hud\s+info|hud\s*data\s*plate|hud\s*plate\s*data|data\s*plate|hud\s*cert(?:ificate)?|compliance\s*cert(?:ificate)?)\b/i.test(p.original_caption || '')
    );

    const checks = [
      { label: 'Subject Front View', pass: hasFront },
      { label: 'Subject Rear View', pass: hasRear },
      { label: 'Subject Street Scene', pass: hasStreet },
    ];

    if (is1004C) {
      checks.push(
        { label: 'HUD Plate / Certification Label', pass: hasHudPlate },
        { label: 'HUD Data Plate / Certificate', pass: hasHudDataPlate }
      );
    }

    checks.push({ label: `Comparable Photos (${compPhotosCount} Found)`, pass: compPhotosCount >= 3 });

    return checks;

  }, [photosList, data, allData]);



  const getCategoryColor = (cat) => {

    const norm = normalizeCategory(cat);

    switch (norm) {

      case 'Subject property': return { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' };

      case 'Subject interior': return { bg: '#fff3e0', color: '#e65100', border: '#ffcc80' };

      case 'Comparable property': return { bg: '#f3e5f5', color: '#7b1fa2', border: '#ce93d8' };

      case 'Rental property': return { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' };

      case 'Building Sketch': return { bg: '#fbe9e7', color: '#d84315', border: '#ffab91' };

      case 'Maps & Aerials': return { bg: '#e0f2f1', color: '#00695c', border: '#80cbc4' };

      case 'HUD Plate & Certification': return { bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc' };

      default: return { bg: '#f5f5f5', color: '#424242', border: '#e0e0e0' };

    }

  };



  return (

    <Paper

      id={id}

      elevation={2}

      sx={{

        p: 2.5,

        my: 2.5,

        borderRadius: 2.5,

        border: '1px solid',

        borderColor: 'divider',

        backgroundColor: 'background.paper',

        transition: 'all 0.3s ease'

      }}

    >

      {/* Section Header */}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>

          <Box

            sx={{

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              width: 40,

              height: 40,

              borderRadius: 2,

              backgroundColor: 'primary.main',

              color: 'primary.contrastText',

              boxShadow: '0 4px 10px rgba(0,0,0,0.15)'

            }}

          >

            <PhotoLibraryIcon />

          </Box>

          <Box>

            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>

              Extracted Photos, Exhibits & Visual Addenda

            </Typography>

            <Typography variant="caption" color="text.secondary">

              100% Deterministic Photo Extraction paired with report page coordinates and labeled captions

            </Typography>

          </Box>

        </Box>



        <Chip

          icon={<CollectionsIcon fontSize="small" />}

          label={`${photosList.length} Photos / Exhibits`}

          color="primary"

          variant="outlined"

          sx={{ fontWeight: 600 }}

        />

      </Box>



      {/* Verification Checklist Bar */}

      <Paper

        variant="outlined"

        sx={{

          p: 1.5,

          mb: 2.5,

          borderRadius: 2,

          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',

          border: '1px dashed',

          borderColor: 'divider'

        }}

      >

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>

          <CheckCircleIcon color="success" fontSize="small" />

          Photo Addenda Compliance Checklist

        </Typography>

        <Grid container spacing={1}>

          {verificationStatus.map((item, idx) => (

            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>

              <Box

                sx={{

                  display: 'flex',

                  alignItems: 'center',

                  gap: 1,

                  p: 0.75,

                  borderRadius: 1.5,

                  backgroundColor: item.pass ? 'rgba(46, 125, 50, 0.08)' : 'rgba(237, 108, 2, 0.08)',

                  border: `1px solid ${item.pass ? 'rgba(46, 125, 50, 0.25)' : 'rgba(237, 108, 2, 0.25)'}`

                }}

              >

                {item.pass ? (

                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18 }} />

                ) : (

                  <WarningIcon sx={{ color: 'warning.main', fontSize: 18 }} />

                )}

                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem', color: item.pass ? 'success.dark' : 'warning.dark' }}>

                  {item.label}

                </Typography>

              </Box>

            </Grid>

          ))}

        </Grid>

      </Paper>



      {photosList.some(p => p.base64_preview && p.base64_preview.includes('data:image/svg+xml')) && (
        <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
          <strong>UAD 3.6 XML Visual Addenda:</strong> 60 photo records were extracted from the XML report. In MISMO 3.6, photographic binaries are stored in the companion PDF. Upload the companion PDF using the <strong>PDF</strong> button above to render the real photographic images.
        </Alert>
      )}

      {/* Filter and Search Bar */}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>

        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>

          {[

            { key: 'ALL', label: 'All Exhibits' },

            { key: 'Subject property', label: 'Subject Property' },

            { key: 'Subject interior', label: 'Subject Interior' },

            { key: 'Comparable property', label: 'Comparable Property' },

            { key: 'Rental property', label: 'Rental Property' },

            { key: 'Needs Review', label: 'Needs Review' },

            { key: 'Building Sketch', label: 'Building Sketch' },

            { key: 'Maps & Aerials', label: 'Maps & Aerials' },

            { key: 'General', label: 'Other Exhibits' }

          ].map(({ key, label }) => {

            const count = categoryCounts[key] || 0;

            if (count === 0 && key !== 'ALL') return null;

            const isSelected = selectedCategory === key;

            const isReview = key === 'Needs Review';

            return (

              <Chip

                key={key}

                label={`${label} (${count})`}

                onClick={() => setSelectedCategory(key)}

                color={isSelected ? (isReview ? 'warning' : 'primary') : 'default'}

                variant={isSelected ? 'filled' : 'outlined'}

                sx={{

                  fontWeight: isSelected ? 700 : 500,

                  cursor: 'pointer',

                  borderColor: isReview ? 'warning.main' : undefined,

                  color: !isSelected && isReview ? 'warning.dark' : undefined,

                  transition: 'all 0.2s',

                  '&:hover': { transform: 'translateY(-1px)' }

                }}

              />

            );

          })}

        </Stack>



        <input

          type="text"

          placeholder="Search by label or room..."

          value={searchTerm}

          onChange={(e) => setSearchTerm(e.target.value)}

          style={{

            padding: '6px 12px',

            borderRadius: '6px',

            border: '1px solid #ccc',

            fontSize: '0.85rem',

            outline: 'none',

            minWidth: '220px'

          }}

        />

      </Box>



      {/* Gallery Grid */}

      {filteredPhotos.length === 0 ? (

        <Alert severity="info" sx={{ borderRadius: 2 }}>

          No extracted photos found matching your filter or search.

        </Alert>

      ) : (

        <Grid container spacing={2}>

          {filteredPhotos.map((photo, index) => {

            const catStyle = getCategoryColor(photo.category);

            const imgSrc = photo.base64_preview || '';



            return (

              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={index}>

                <Card

                  variant="outlined"

                  sx={{

                    borderRadius: 2,

                    overflow: 'hidden',

                    transition: 'transform 0.2s, box-shadow 0.2s',

                    cursor: 'pointer',

                    display: 'flex',

                    flexDirection: 'column',

                    height: '100%',

                    '&:hover': {

                      transform: 'translateY(-4px)',

                      boxShadow: '0 8px 20px rgba(0,0,0,0.12)',

                      '& .photo-overlay': { opacity: 1 }

                    }

                  }}

                  onClick={() => {

                    setRotation(0);

                    setPreviewPhoto(photo);

                  }}

                >

                  <Box sx={{ position: 'relative', width: '100%', height: 180, backgroundColor: '#0f172a' }}>

                    {imgSrc ? (

                      <CardMedia

                        component="img"

                        image={imgSrc}

                        alt={photo.caption}

                        sx={{

                          width: '100%',

                          height: '100%',

                          objectFit: 'contain',

                          backgroundColor: '#1e293b'

                        }}

                      />

                    ) : (

                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'grey.500' }}>

                        <ImageSearchIcon sx={{ fontSize: 40 }} />

                      </Box>

                    )}



                    {/* Category Badge Top Left */}

                    <Chip

                      size="small"

                      label={normalizeCategory(photo.category) || 'Exhibit'}

                      sx={{

                        position: 'absolute',

                        top: 8,

                        left: 8,

                        fontWeight: 700,

                        fontSize: '0.7rem',

                        backgroundColor: catStyle.bg,

                        color: catStyle.color,

                        border: `1px solid ${catStyle.border}`

                      }}

                    />



                    {/* Uncertain / Unmatched Review Badge Bottom Left */}

                    {(photo.match_status === 'unmatched' || photo.match_confidence === 'low' || photo.caption === 'Caption not found') && (

                      <Chip

                        size="small"

                        icon={<WarningIcon sx={{ fontSize: '13px !important', color: '#fff !important' }} />}

                        label="Review"

                        sx={{

                          position: 'absolute',

                          bottom: 8,

                          left: 8,

                          fontWeight: 700,

                          fontSize: '0.65rem',

                          backgroundColor: '#ed6c02',

                          color: '#fff',

                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'

                        }}

                      />

                    )}



                    {/* Page Number Top Right */}

                    <Chip

                      size="small"

                      label={`Page ${photo.page}`}

                      sx={{

                        position: 'absolute',

                        top: 8,

                        right: 8,

                        fontWeight: 600,

                        fontSize: '0.7rem',

                        backgroundColor: 'rgba(0,0,0,0.75)',

                        color: '#fff'

                      }}

                    />



                    {/* Hover Zoom Overlay */}

                    <Box

                      className="photo-overlay"

                      sx={{

                        position: 'absolute',

                        top: 0,

                        left: 0,

                        right: 0,

                        bottom: 0,

                        backgroundColor: 'rgba(0, 0, 0, 0.45)',

                        display: 'flex',

                        alignItems: 'center',

                        justifyContent: 'center',

                        opacity: 0,

                        transition: 'opacity 0.2s',

                        color: '#fff'

                      }}

                    >

                      <ZoomInIcon sx={{ fontSize: 36 }} />

                    </Box>

                  </Box>



                  <CardContent sx={{ p: 1.5, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                    <Box>

                      <Typography

                        variant="body2"

                        sx={{

                          fontWeight: 700,

                          color: photo.caption === 'Caption not found' ? 'warning.main' : 'text.primary',

                          lineHeight: 1.3,

                          mb: 0.5,

                          display: '-webkit-box',

                          WebkitLineClamp: 2,

                          WebkitBoxOrient: 'vertical',

                          overflow: 'hidden'

                        }}

                        title={photo.caption}

                      >

                        {photo.caption || 'Caption not found'}

                      </Typography>



                      {photo.original_caption && photo.original_caption !== photo.caption && (

                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontStyle: 'italic', fontSize: '0.72rem' }}>

                          Doc label: "{photo.original_caption}"

                        </Typography>

                      )}



                      {photo.match_status === 'unmatched' && (

                        <Typography variant="caption" sx={{ color: 'warning.dark', fontWeight: 600, display: 'block', mb: 0.5, fontSize: '0.72rem' }}>

                          ⚠️ Uncertain match — check report

                        </Typography>

                      )}



                      {photo.address && (

                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#0369a1', display: 'block', mb: 0.5 }}>

                          📍 {photo.address}

                        </Typography>

                      )}



                      {(photo.sale_price || photo.rent_amount || photo.monthly_rent || photo.proximity || photo.gla) && (

                        <Box sx={{ mt: 0.5, mb: 1, p: 0.75, borderRadius: 1, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#334155', lineHeight: 1.4 }}>

                          {(photo.sale_price || photo.rent_amount || photo.monthly_rent) && (

                            <div>

                              <strong>{photo.is_rental || photo.category === 'Rental' ? 'Rent:' : 'Price:'}</strong> ${photo.rent_amount || photo.monthly_rent || photo.sale_price}{photo.is_rental || photo.category === 'Rental' ? '/mo' : ''}

                            </div>

                          )}

                          {photo.proximity && <div><strong>Prox:</strong> {photo.proximity}</div>}

                          {(photo.gla || photo.bedrooms) && (

                            <div>

                              {photo.gla ? `${photo.gla} sf` : ''}

                              {photo.bedrooms ? ` • ${photo.bedrooms} Bed` : ''}

                              {photo.bathrooms ? ` / ${photo.bathrooms} Bath` : ''}

                            </div>

                          )}

                        </Box>

                      )}

                    </Box>



                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>

                      Page {photo.page} • {photo.width} × {photo.height} pt

                    </Typography>

                  </CardContent>

                </Card>

              </Grid>

            );

          })}

        </Grid>

      )}



      {/* Fullscreen Preview Lightbox Modal */}

      <Dialog

        open={Boolean(previewPhoto)}

        onClose={() => setPreviewPhoto(null)}

        maxWidth="lg"

        fullWidth

        PaperProps={{

          sx: {

            borderRadius: 3,

            backgroundColor: '#0f172a',

            color: '#fff',

            overflow: 'hidden'

          }

        }}

      >

        <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>

            <Chip label={previewPhoto?.category || 'Exhibit'} color="primary" size="small" sx={{ fontWeight: 700 }} />

            <Typography component="span" variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>

              {previewPhoto?.caption || 'Photo Preview'}

            </Typography>

          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>

            <Tooltip title="Rotate 90°">

              <IconButton onClick={() => setRotation((prev) => (prev + 90) % 360)} sx={{ color: '#fff' }}>

                <RotateRightIcon />

              </IconButton>

            </Tooltip>

            <IconButton onClick={() => setPreviewPhoto(null)} sx={{ color: '#fff' }}>

              <CloseIcon />

            </IconButton>

          </Box>

        </DialogTitle>



        <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#090d16' }}>

          {(previewPhoto?.base64_preview || previewPhoto?.image_data || previewPhoto?.url) ? (

            <InteractiveZoomImageViewer

              src={previewPhoto.base64_preview || previewPhoto.image_data || previewPhoto.url}

              alt={previewPhoto.caption || 'Photo Preview'}

              maxHeight="65vh"

              initialRotation={rotation}

            />

          ) : (

            <Typography variant="body1" color="grey.400" sx={{ py: 6 }}>

              No high-resolution preview available.

            </Typography>

          )}



          {/* Structured Comparable Photo Metadata Details */}

          {(previewPhoto?.address || previewPhoto?.metadata) && (

            <Box sx={{ mt: 2.5, width: '100%', maxWidth: 700, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#38bdf8', mb: 1.5 }}>

                Photo Addendum Metadata (Extracted from Appraisal Page {previewPhoto?.page})

              </Typography>

              <Grid container spacing={1.5}>

                {previewPhoto?.address && (

                  <Grid size={{ xs: 12, sm: 6 }}>

                    <span style={{ color: '#94a3b8' }}>Address:</span> <strong style={{ color: '#fff' }}>{previewPhoto.address}</strong>

                  </Grid>

                )}

                {previewPhoto?.proximity && (

                  <Grid size={{ xs: 12, sm: 6 }}>

                    <span style={{ color: '#94a3b8' }}>Prox. to Subject:</span> <strong style={{ color: '#fff' }}>{previewPhoto.proximity}</strong>

                  </Grid>

                )}

                {(previewPhoto?.sale_price || previewPhoto?.rent_amount || previewPhoto?.monthly_rent) && (

                  <Grid size={{ xs: 12, sm: 6 }}>

                    <span style={{ color: '#94a3b8' }}>{previewPhoto.is_rental || previewPhoto.category === 'Rental' ? 'Monthly Rent:' : 'Sale Price:'}</span>{' '}

                    <strong style={{ color: '#4ade80' }}>${previewPhoto.rent_amount || previewPhoto.monthly_rent || previewPhoto.sale_price}{previewPhoto.is_rental || previewPhoto.category === 'Rental' ? '/mo' : ''}</strong>

                  </Grid>

                )}

                {previewPhoto?.gla && (

                  <Grid size={{ xs: 12, sm: 6 }}>

                    <span style={{ color: '#94a3b8' }}>Gross Living Area:</span> <strong style={{ color: '#fff' }}>{previewPhoto.gla} sq ft</strong>

                  </Grid>

                )}

                {previewPhoto?.bedrooms && (

                  <Grid size={{ xs: 12, sm: 6 }}>

                    <span style={{ color: '#94a3b8' }}>Rooms / Beds / Baths:</span> <strong style={{ color: '#fff' }}>{previewPhoto.total_rooms || '—'} / {previewPhoto.bedrooms} / {previewPhoto.bathrooms || '—'}</strong>

                  </Grid>

                )}

                {previewPhoto?.site && (

                  <Grid size={{ xs: 12, sm: 6 }}>

                    <span style={{ color: '#94a3b8' }}>Site:</span> <strong style={{ color: '#fff' }}>{previewPhoto.site}</strong>

                  </Grid>

                )}

                {previewPhoto?.quality && (

                  <Grid size={{ xs: 12, sm: 6 }}>

                    <span style={{ color: '#94a3b8' }}>Quality:</span> <strong style={{ color: '#fff' }}>{previewPhoto.quality}</strong>

                  </Grid>

                )}

                {previewPhoto?.age && (

                  <Grid size={{ xs: 12, sm: 6 }}>

                    <span style={{ color: '#94a3b8' }}>Age:</span> <strong style={{ color: '#fff' }}>{previewPhoto.age} yrs</strong>

                  </Grid>

                )}

              </Grid>

            </Box>

          )}



          <Box sx={{ mt: 2, display: 'flex', gap: 3, color: 'grey.400', fontSize: '0.85rem' }}>

            <span><strong>Page:</strong> {previewPhoto?.page}</span>

            <span><strong>Dimensions:</strong> {previewPhoto?.width} × {previewPhoto?.height} pt</span>

            <span><strong>Format:</strong> {previewPhoto?.format?.toUpperCase()}</span>

          </Box>

        </DialogContent>

      </Dialog>

    </Paper>

  );

};



export default PhotosGallerySection;

