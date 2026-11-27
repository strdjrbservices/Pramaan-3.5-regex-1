import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, IconButton, Tooltip, Chip, Stack, Typography, Divider, Paper } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import PanToolIcon from '@mui/icons-material/PanTool';
import CreateIcon from '@mui/icons-material/Create';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import UndoIcon from '@mui/icons-material/Undo';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Moveable Red Marker Sub-component
 * Renders a draggable pin with number/label and target pulse at the pin tip.
 */
const MoveableMarker = ({
  marker,
  index,
  onDragStart,
  onDelete,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => onDragStart(e, marker.id)}
      sx={{
        position: 'absolute',
        left: `${marker.x}%`,
        top: `${marker.y}%`,
        transform: 'translate(-50%, -100%)',
        cursor: 'grab',
        zIndex: hovered ? 30 : 20,
        userSelect: 'none',
        pointerEvents: 'auto',
        transition: 'transform 0.1s ease',
        '&:active': {
          cursor: 'grabbing',
          transform: 'translate(-50%, -100%) scale(1.15)',
        },
      }}
    >
      {/* Delete button on hover */}
      {hovered && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(marker.id);
          }}
          title="Delete marker"
          sx={{
            position: 'absolute',
            top: -12,
            right: -12,
            bgcolor: '#1e293b',
            color: '#fff',
            p: 0.25,
            width: 18,
            height: 18,
            border: '1px solid #ef4444',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            zIndex: 40,
            '&:hover': { bgcolor: '#ef4444' },
          }}
        >
          <CloseIcon sx={{ fontSize: 12 }} />
        </IconButton>
      )}

      {/* Red Marker Teardrop Pin */}
      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            bgcolor: '#dc2626',
            borderRadius: '50% 50% 50% 0',
            transform: 'rotate(-45deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.7), 0 2px 6px rgba(0,0,0,0.4)',
            border: '2px solid #ffffff',
            transition: 'background-color 0.15s ease',
            '&:hover': {
              bgcolor: '#ef4444',
            },
          }}
        >
          <Typography
            sx={{
              transform: 'rotate(45deg)',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {marker.number || index + 1}
          </Typography>
        </Box>

        {/* Pulsing Target Dot / Pointer Ring at the pinpoint tip */}
        <Box
          sx={{
            width: 8,
            height: 5,
            borderRadius: '50%',
            bgcolor: 'rgba(239, 68, 68, 0.9)',
            boxShadow: '0 0 10px 4px rgba(239, 68, 68, 0.7)',
            mt: '-1px',
          }}
        />
      </Box>
    </Box>
  );
};

/**
 * DraggableDialogPaper
 * Makes any MUI Dialog window/frame draggable by its title bar (#draggable-dialog-title or .MuiDialogTitle-root).
 * Features:
 * - Smooth 60fps direct transform
 * - Header grab/grabbing cursor
 * - Double-click title bar to reset to center
 * - Safe bounds (cannot lose window off-screen)
 * - Ignores button/input clicks inside the header
 */
export const DraggableDialogPaper = React.forwardRef((props, ref) => {
  const paperRef = useRef(null);
  const posRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const setCombinedRef = useCallback((node) => {
    paperRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }, [ref]);

  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;

    const handle = paper.querySelector('#draggable-dialog-title') || paper.querySelector('.MuiDialogTitle-root') || paper.querySelector('[data-drag-handle="true"]');
    if (!handle) return;

    handle.style.cursor = 'grab';
    handle.style.userSelect = 'none';

    const onMouseDown = (e) => {
      // Don't drag if clicking buttons, links, or inputs in the header
      if (e.target.closest('button, a, input, select, textarea, .no-drag')) {
        return;
      }
      e.preventDefault();
      isDraggingRef.current = true;
      handle.style.cursor = 'grabbing';
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      const startPos = { ...posRef.current };

      const onMouseMove = (moveEvent) => {
        if (!isDraggingRef.current) return;
        const dx = moveEvent.clientX - dragStartRef.current.x;
        const dy = moveEvent.clientY - dragStartRef.current.y;

        const maxOffset = Math.max(window.innerWidth, window.innerHeight);
        const clampedX = Math.max(-maxOffset, Math.min(maxOffset, startPos.x + dx));
        const clampedY = Math.max(-maxOffset, Math.min(maxOffset, startPos.y + dy));

        posRef.current = { x: clampedX, y: clampedY };
        paper.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
      };

      const onMouseUp = () => {
        isDraggingRef.current = false;
        if (handle) handle.style.cursor = 'grab';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    const onDoubleClick = (e) => {
      if (e.target.closest('button, a, input, select, textarea, .no-drag')) return;
      posRef.current = { x: 0, y: 0 };
      paper.style.transform = 'translate(0px, 0px)';
    };

    handle.addEventListener('mousedown', onMouseDown);
    handle.addEventListener('dblclick', onDoubleClick);

    return () => {
      handle.removeEventListener('mousedown', onMouseDown);
      handle.removeEventListener('dblclick', onDoubleClick);
    };
  }, []);

  return (
    <Paper
      {...props}
      ref={setCombinedRef}
      sx={{
        ...props.sx,
        position: 'relative',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.14)',
        transition: isDraggingRef.current ? 'none' : 'box-shadow 0.2s ease',
      }}
    />
  );
});

DraggableDialogPaper.displayName = 'DraggableDialogPaper';

/**
 * InteractiveZoomImageViewer
 * Provides pan-and-zoom capabilities, freehand red pen drawing,
 * and moveable red markers/pins for extracted photos, maps, and sketch exhibits.
 */
export const InteractiveZoomImageViewer = ({
  src,
  alt = 'Image Preview',
  maxHeight = '72vh',
  minHeight = '450px',
  allowRotate = true,
  initialRotation = 0,
}) => {
  // Navigation State
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(initialRotation);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Tool Modes: 'pan' | 'pen' | 'marker'
  const [toolMode, setToolMode] = useState('pan');

  // Red Pen Drawing State
  const [strokes, setStrokes] = useState([]);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef([]);

  // Moveable Red Markers State
  // Array of { id, x (0-100%), y (0-100%), number }
  const [markers, setMarkers] = useState([]);

  // Element Refs
  const containerRef = useRef(null);
  const imageContainerRef = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  // Reset zoom, position, and annotations whenever src changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setRotation(initialRotation);
    setStrokes([]);
    setMarkers([]);
    setToolMode('pan');
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

  // Double-click to toggle zoom between 1x and 2.2x in Pan mode
  const handleDoubleClick = (e) => {
    if (toolMode !== 'pan') return;
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

  // Drag to pan when in Pan mode
  const handleMouseDown = (e) => {
    if (e.button !== 0 || toolMode !== 'pan') return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging || toolMode !== 'pan') return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // -------------------------------------------------------------
  // Red Pen Canvas Drawing
  // -------------------------------------------------------------
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color || '#ef4444';
      ctx.lineWidth = stroke.width || 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const first = stroke.points[0];
      ctx.moveTo(first.x * canvas.width, first.y * canvas.height);
      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
      }
      ctx.stroke();
    });
  }, [strokes]);

  // Sync canvas size with rendered image size
  const syncCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const w = img.clientWidth || img.naturalWidth || 800;
    const h = img.clientHeight || img.naturalHeight || 600;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    syncCanvasDimensions();
  }, [syncCanvasDimensions, strokes]);

  const handleImageLoad = () => {
    syncCanvasDimensions();
  };

  const handleCanvasMouseDown = (e) => {
    if (toolMode !== 'pen') return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    isDrawingRef.current = true;
    const offsetX = typeof e.nativeEvent.offsetX === 'number' ? e.nativeEvent.offsetX : (e.clientX - canvas.getBoundingClientRect().left);
    const offsetY = typeof e.nativeEvent.offsetY === 'number' ? e.nativeEvent.offsetY : (e.clientY - canvas.getBoundingClientRect().top);

    const pt = {
      x: Math.max(0, Math.min(1, offsetX / canvas.clientWidth)),
      y: Math.max(0, Math.min(1, offsetY / canvas.clientHeight)),
    };
    currentStrokeRef.current = [pt];

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(pt.x * canvas.width, pt.y * canvas.height);
  };

  const handleCanvasMouseMove = (e) => {
    if (toolMode !== 'pen' || !isDrawingRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const offsetX = typeof e.nativeEvent.offsetX === 'number' ? e.nativeEvent.offsetX : (e.clientX - canvas.getBoundingClientRect().left);
    const offsetY = typeof e.nativeEvent.offsetY === 'number' ? e.nativeEvent.offsetY : (e.clientY - canvas.getBoundingClientRect().top);

    const pt = {
      x: Math.max(0, Math.min(1, offsetX / canvas.clientWidth)),
      y: Math.max(0, Math.min(1, offsetY / canvas.clientHeight)),
    };
    currentStrokeRef.current.push(pt);

    const ctx = canvas.getContext('2d');
    ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
    ctx.stroke();
  };

  const handleCanvasMouseUp = () => {
    if (toolMode !== 'pen' || !isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentStrokeRef.current.length > 0) {
      setStrokes(prev => [...prev, {
        color: '#ef4444',
        width: 3,
        points: currentStrokeRef.current,
      }]);
      currentStrokeRef.current = [];
    }
  };

  // -------------------------------------------------------------
  // Moveable Red Marker Placement & Dragging
  // -------------------------------------------------------------
  const handleCanvasClick = (e) => {
    if (toolMode !== 'marker') return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const offsetX = typeof e.nativeEvent.offsetX === 'number' ? e.nativeEvent.offsetX : (e.clientX - canvas.getBoundingClientRect().left);
    const offsetY = typeof e.nativeEvent.offsetY === 'number' ? e.nativeEvent.offsetY : (e.clientY - canvas.getBoundingClientRect().top);

    const xPct = Math.max(0, Math.min(100, (offsetX / canvas.clientWidth) * 100));
    const yPct = Math.max(0, Math.min(100, (offsetY / canvas.clientHeight) * 100));

    setMarkers(prev => [
      ...prev,
      {
        id: `marker-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        x: Math.round(xPct * 10) / 10,
        y: Math.round(yPct * 10) / 10,
        number: prev.length + 1,
      }
    ]);
  };

  const handleAddCenterMarker = useCallback(() => {
    setMarkers(prev => [
      ...prev,
      {
        id: `marker-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        x: 50 + ((prev.length % 5) - 2) * 5,
        y: 50 + ((prev.length % 5) - 2) * 5,
        number: prev.length + 1,
      }
    ]);
  }, []);

  const handleMarkerDragStart = useCallback((e, markerId) => {
    e.stopPropagation();
    e.preventDefault();

    const marker = markers.find(m => m.id === markerId);
    if (!marker) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startMarkerX = marker.x;
    const startMarkerY = marker.y;

    const handleWindowMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      // Compensate for rotation and zoom accurately
      const rad = (-rotation * Math.PI) / 180;
      const unrotatedDx = (dx * Math.cos(rad) - dy * Math.sin(rad)) / zoom;
      const unrotatedDy = (dx * Math.sin(rad) + dy * Math.cos(rad)) / zoom;

      const img = imgRef.current;
      const imgW = img?.clientWidth || 800;
      const imgH = img?.clientHeight || 600;

      const newX = Math.max(0, Math.min(100, startMarkerX + (unrotatedDx / imgW) * 100));
      const newY = Math.max(0, Math.min(100, startMarkerY + (unrotatedDy / imgH) * 100));

      setMarkers(prev => prev.map(m => m.id === markerId ? {
        ...m,
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10
      } : m));
    };

    const handleWindowMouseUp = () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
  }, [markers, rotation, zoom]);

  const handleMarkerDelete = useCallback((markerId) => {
    setMarkers(prev => {
      const filtered = prev.filter(m => m.id !== markerId);
      return filtered.map((m, idx) => ({ ...m, number: idx + 1 }));
    });
  }, []);

  const handleUndo = useCallback(() => {
    setStrokes(prev => prev.slice(0, -1));
  }, []);

  const handleClearAll = useCallback(() => {
    setStrokes([]);
    setMarkers([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0' || e.key === 'Escape') {
        handleReset();
      } else if (e.key === 'r' || e.key === 'R') {
        handleRotate();
      } else if (e.key === 'p' || e.key === 'P') {
        setToolMode(prev => prev === 'pen' ? 'pan' : 'pen');
      } else if (e.key === 'm' || e.key === 'M') {
        setToolMode(prev => prev === 'marker' ? 'pan' : 'marker');
      } else if (e.key === 'v' || e.key === 'V') {
        setToolMode('pan');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleReset, handleRotate, handleUndo]);

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
        spacing={0.75}
        sx={{
          position: 'absolute',
          top: 14,
          right: 14,
          zIndex: 50,
          bgcolor: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
          p: 0.75,
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Tool Mode: Pan & Zoom */}
        <Tooltip title="Pan & Zoom Mode (Key 'V')">
          <IconButton
            size="small"
            onClick={() => setToolMode('pan')}
            sx={{
              color: toolMode === 'pan' ? '#38bdf8' : '#94a3b8',
              bgcolor: toolMode === 'pan' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
              border: toolMode === 'pan' ? '1px solid #38bdf8' : '1px solid transparent',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.15)' },
            }}
          >
            <PanToolIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Tool Mode: Red Pen (Freehand Draw) */}
        <Tooltip title="Red Pen (Draw on image • Key 'P')">
          <IconButton
            size="small"
            onClick={() => setToolMode('pen')}
            sx={{
              color: toolMode === 'pen' ? '#fff' : '#ef4444',
              bgcolor: toolMode === 'pen' ? '#dc2626' : 'rgba(239, 68, 68, 0.12)',
              border: toolMode === 'pen' ? '1px solid #ef4444' : '1px solid transparent',
              boxShadow: toolMode === 'pen' ? '0 0 10px rgba(239, 68, 68, 0.6)' : 'none',
              '&:hover': { bgcolor: toolMode === 'pen' ? '#b91c1c' : 'rgba(239, 68, 68, 0.25)' },
            }}
          >
            <CreateIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Tool Mode: Red Marker Placement */}
        <Tooltip title="Red Marker Mode (Click image to drop pin • Key 'M')">
          <IconButton
            size="small"
            onClick={() => setToolMode('marker')}
            sx={{
              color: toolMode === 'marker' ? '#fff' : '#f87171',
              bgcolor: toolMode === 'marker' ? '#dc2626' : 'rgba(239, 68, 68, 0.12)',
              border: toolMode === 'marker' ? '1px solid #ef4444' : '1px solid transparent',
              boxShadow: toolMode === 'marker' ? '0 0 10px rgba(239, 68, 68, 0.6)' : 'none',
              '&:hover': { bgcolor: toolMode === 'marker' ? '#b91c1c' : 'rgba(239, 68, 68, 0.25)' },
            }}
          >
            <LocationOnIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Quick Add Marker Button */}
        <Tooltip title="Add Moveable Red Marker (+ Pin)">
          <IconButton
            size="small"
            onClick={handleAddCenterMarker}
            sx={{
              color: '#fca5a5',
              bgcolor: 'rgba(239, 68, 68, 0.12)',
              '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.25)' },
            }}
          >
            <AddLocationAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Undo Red Pen Drawing */}
        <Tooltip title="Undo Last Drawing Stroke (Ctrl+Z)">
          <span>
            <IconButton
              size="small"
              onClick={handleUndo}
              disabled={strokes.length === 0}
              sx={{
                color: '#fff',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.15)' },
                '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.25)' },
              }}
            >
              <UndoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        {/* Clear All Drawings & Markers */}
        <Tooltip title="Clear All Drawings & Markers">
          <span>
            <IconButton
              size="small"
              onClick={handleClearAll}
              disabled={strokes.length === 0 && markers.length === 0}
              sx={{
                color: '#f87171',
                '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' },
                '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.25)' },
              }}
            >
              <DeleteSweepIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.2)', mx: 0.5 }} />

        {/* Zoom Level Indicator */}
        <Chip
          label={`${Math.round(zoom * 100)}%`}
          size="small"
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.12)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.75rem',
            height: 24,
            px: 0.5,
          }}
        />

        {/* Zoom In */}
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

        {/* Zoom Out */}
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

        {/* Reset Zoom & Position */}
        <Tooltip title="Reset Zoom (100% / Key '0')">
          <IconButton
            size="small"
            onClick={handleReset}
            sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.18)' } }}
          >
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* 90-Degree Rotation */}
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
          cursor: toolMode === 'pen' ? 'crosshair' : toolMode === 'marker' ? 'crosshair' : (zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'),
          p: 2,
        }}
      >
        {src ? (
          <Box
            ref={imageContainerRef}
            sx={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: isDragging && toolMode === 'pan' ? 'none' : 'transform 0.15s ease-out',
              boxShadow: zoom > 1 ? '0 12px 36px rgba(0,0,0,0.6)' : '0 4px 16px rgba(0,0,0,0.3)',
              borderRadius: 1,
              overflow: 'visible',
            }}
          >
            {/* The Exhibit / Floorplan / Photo Image */}
            <Box
              ref={imgRef}
              component="img"
              src={src}
              alt={alt}
              onLoad={handleImageLoad}
              onDragStart={(e) => e.preventDefault()}
              sx={{
                maxWidth: '100%',
                maxHeight: `calc(${maxHeight} - 32px)`,
                objectFit: 'contain',
                display: 'block',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />

            {/* Red Pen Drawing Canvas Layer */}
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onClick={handleCanvasClick}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: (toolMode === 'pen' || toolMode === 'marker') ? 'auto' : 'none',
                cursor: toolMode === 'pen' ? 'crosshair' : (toolMode === 'marker' ? 'crosshair' : 'default'),
                touchAction: 'none',
                zIndex: 10,
              }}
            />

            {/* Moveable Red Markers Layer */}
            {markers.map((marker, idx) => (
              <MoveableMarker
                key={marker.id}
                marker={marker}
                index={idx}
                onDragStart={handleMarkerDragStart}
                onDelete={handleMarkerDelete}
              />
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            No image available to display.
          </Typography>
        )}
      </Box>

      {/* Interactive Guidance Footer with Active Annotation Badges */}
      <Box
        sx={{
          py: 0.8,
          px: 2,
          width: '100%',
          bgcolor: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
          color: '#94a3b8',
          fontSize: '0.72rem',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.74rem' }}>
            💡 <strong>Active Mode:</strong>{' '}
            {toolMode === 'pen'
              ? '🖊️ Red Pen (Click & drag to draw on image)'
              : toolMode === 'marker'
              ? '📍 Red Marker Mode (Click image to drop pin • Drag to move anywhere)'
              : '✋ Pan & Zoom (Drag to pan • Wheel to zoom)'}
          </Typography>
          {markers.length > 0 && (
            <Chip
              label={`${markers.length} Red Marker${markers.length > 1 ? 's' : ''} (Moveable)`}
              size="small"
              sx={{
                bgcolor: 'rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                border: '1px solid #ef4444',
                height: 20,
                fontSize: '0.68rem',
                fontWeight: 700,
              }}
            />
          )}
          {strokes.length > 0 && (
            <Chip
              label={`${strokes.length} Pen Stroke${strokes.length > 1 ? 's' : ''}`}
              size="small"
              sx={{
                bgcolor: 'rgba(239, 68, 68, 0.15)',
                color: '#fca5a5',
                height: 20,
                fontSize: '0.68rem',
              }}
            />
          )}
        </Stack>

        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
          Zoom: {Math.round(zoom * 100)}% {rotation !== 0 ? `• Rotated: ${rotation}°` : ''}
        </Typography>
      </Box>
    </Box>
  );
};

export default InteractiveZoomImageViewer;
