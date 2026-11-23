import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, IconButton, Tooltip, Chip, Stack, Typography } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RotateRightIcon from '@mui/icons-material/RotateRight';

/**
 * InteractiveZoomImageViewer
 * Provides pan-and-zoom capabilities for extracted photos, HUD exhibits, maps, and sketches.
 * Features:
 * - Zoom in / out buttons & Reset to 100%
 * - Mouse wheel scrolling to zoom in/out smoothly
 * - Double-click to toggle 1x / 2.2x zoom
 * - Mouse drag-to-pan when zoomed in
 * - Keyboard shortcuts (+, -, 0, r)
 * - 90-degree rotation support
 */
export const InteractiveZoomImageViewer = ({
  src,
  alt = 'Image Preview',
  maxHeight = '72vh',
  minHeight = '450px',
  allowRotate = true,
  initialRotation = 0,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(initialRotation);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Reset zoom & position whenever src changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setRotation(initialRotation);
  }, [src, initialRotation]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(5, Math.round((prev + 0.25) * 100) / 100));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const next = Math.max(0.5, Math.round((prev - 0.25) * 100) / 100);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Double-click to toggle zoom between 1x and 2.2x
  const handleDoubleClick = (e) => {
    e.preventDefault();
    if (zoom > 1) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setZoom(2.2);
    }
  };

  // Mouse wheel to zoom in/out smoothly
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setZoom(prev => {
      const next = Math.min(5, Math.max(0.5, Math.round((prev + delta) * 100) / 100));
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Attach wheel listener with passive: false so preventDefault works cleanly
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Drag to pan when zoomed
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0' || e.key === 'Escape') {
        handleReset();
      } else if (e.key === 'r' || e.key === 'R') {
        handleRotate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleReset, handleRotate]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        bgcolor: '#090d16',
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      {/* Floating Toolbar Controls */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: 'absolute',
          top: 14,
          right: 14,
          zIndex: 10,
          bgcolor: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(8px)',
          borderRadius: 2,
          p: 0.6,
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          alignItems: 'center'
        }}
      >
        <Chip
          label={`${Math.round(zoom * 100)}%`}
          size="small"
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.12)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.75rem',
            height: 24,
            px: 0.5
          }}
        />
        <Tooltip title="Zoom In (+ / Wheel Up)">
          <span>
            <IconButton
              size="small"
              onClick={handleZoomIn}
              disabled={zoom >= 5}
              sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.18)' } }}
            >
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Zoom Out (- / Wheel Down)">
          <span>
            <IconButton
              size="small"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.18)' } }}
            >
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Reset Zoom (100% / Key '0')">
          <IconButton
            size="small"
            onClick={handleReset}
            sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.18)' } }}
          >
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {allowRotate && (
          <Tooltip title="Rotate 90° Clockwise (Key 'R')">
            <IconButton
              size="small"
              onClick={handleRotate}
              sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.18)' } }}
            >
              <RotateRightIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {/* Main Interactive Image Viewport */}
      <Box
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        sx={{
          width: '100%',
          height: maxHeight,
          minHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          p: 2,
        }}
      >
        {src ? (
          <Box
            component="img"
            src={src}
            alt={alt}
            onDragStart={(e) => e.preventDefault()}
            sx={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              boxShadow: zoom > 1 ? '0 12px 36px rgba(0,0,0,0.6)' : '0 4px 16px rgba(0,0,0,0.3)',
              borderRadius: 1,
              pointerEvents: 'auto',
            }}
          />
        ) : (
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            No image available to display.
          </Typography>
        )}
      </Box>

      {/* Interactive Guidance Footer */}
      <Box
        sx={{
          py: 0.75,
          px: 2,
          width: '100%',
          bgcolor: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#94a3b8',
          fontSize: '0.72rem',
        }}
      >
        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
          💡 <strong>Controls:</strong> Mouse Wheel to Zoom • Double-Click to toggle 2x • Click &amp; Drag to Pan
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
          Zoom: {Math.round(zoom * 100)}% {rotation !== 0 ? `• Rotated: ${rotation}°` : ''}
        </Typography>
      </Box>
    </Box>
  );
};

export default InteractiveZoomImageViewer;
