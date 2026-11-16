import React from 'react';
import {
    Tooltip, IconButton, List, ListItem, ListItemButton, ListItemText, Box,
    CircularProgress, ListItemIcon, Typography, ToggleButton, ToggleButtonGroup, Chip,
} from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { keyframes } from '@mui/system';
import LightModeIcon from '@mui/icons-material/LightMode';
import NightlightRoundIcon from '@mui/icons-material/NightlightRound';
import PremiumLogo from '../../auth/logo';

const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-8px); }
  60% { transform: translateY(-4px); }
`;

const Sidebar = ({
    sections, isOpen, onToggle, isLocked, onLockToggle,
    onSectionClick, onThemeToggle, currentTheme, activeSection, loading,
    loadingSection, extractedSections = new Set(), visibleSections = new Set(),
    onArrowClick, extractionSource = 'pdf', onExtractionSourceChange,
    hasPdfFile = false, hasXmlFile = false, onOpenPdfXmlDiff, diffCount = 0
}) => {
    const handleToggle = onToggle || onLockToggle;

    return (
        <>
            {isOpen && (
                <Box
                    onClick={handleToggle}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(3px)',
                        zIndex: 1100,
                        transition: 'opacity 0.3s ease',
                    }}
                />
            )}

            {!isOpen && (
                <IconButton
                    onClick={handleToggle}
                    aria-label="Open Sidebar"
                    sx={{
                        display: { xs: 'flex', md: 'none' },
                        position: 'fixed',
                        bottom: 24,
                        left: 24,
                        zIndex: 1090,
                        backgroundColor: currentTheme === 'dark' ? '#1e88e5' : '#005A9C',
                        color: '#ffffff',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                        '&:hover': {
                            backgroundColor: currentTheme === 'dark' ? '#1565c0' : '#004070',
                        },
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                    }}
                >
                    <MenuIcon />
                </IconButton>
            )}

            <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
                {isOpen ? (
                    <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 0.75rem' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, overflow: 'hidden' }}>
                            <Box className="sidebar-logo" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: 34, height: 34, flexShrink: 0, m: 0 }}>
                                <PremiumLogo size={34} fullScreen={false} />
                            </Box>
                            <Typography variant="h6" className="sidebar-title" sx={{ fontWeight: 'bold', color: 'primary.main', m: 0, whiteSpace: 'nowrap' }}>
                                DJRB
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                            <Tooltip title="Toggle Dark/Light Theme" placement="bottom">
                                <IconButton onClick={onThemeToggle} size="small" sx={{ color: 'var(--primary-color)' }}>
                                    {currentTheme === 'dark' ? <LightModeIcon fontSize="small" /> : <NightlightRoundIcon fontSize="small" />}
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Close Sidebar" placement="bottom">
                                <IconButton onClick={handleToggle} size="small" sx={{ color: 'var(--primary-color)' }} aria-label="Close Sidebar">
                                    <ChevronLeftIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </div>
                ) : (
                    <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0.85rem 0' }}>
                        <Tooltip title="Open Sidebar" placement="right">
                            <IconButton
                                onClick={handleToggle}
                                size="medium"
                                aria-label="Open Sidebar"
                                sx={{
                                    color: 'primary.main',
                                    width: 40,
                                    height: 40,
                                    '&:hover': {
                                        bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                                    }
                                }}
                            >
                                <MenuIcon />
                            </IconButton>
                        </Tooltip>
                    </div>
                )}

            {isOpen && (
                <Box sx={{ px: 1.5, py: 1.2, borderBottom: '1px solid var(--sidebar-border)', bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.65rem' }}>
                            Extraction Source
                        </Typography>
                        {hasPdfFile && hasXmlFile && onOpenPdfXmlDiff && (
                            <Chip
                                size="small"
                                label={diffCount > 0 ? `${diffCount} Diff` : "Compare"}
                                color={diffCount > 0 ? "error" : "primary"}
                                onClick={onOpenPdfXmlDiff}
                                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}
                            />
                        )}
                    </Box>
                    <ToggleButtonGroup
                        value={extractionSource || 'pdf'}
                        exclusive
                        onChange={(e, val) => {
                            if (val && onExtractionSourceChange) onExtractionSourceChange(val);
                        }}
                        size="small"
                        fullWidth
                        sx={{
                            borderRadius: 1.5,
                            '& .MuiToggleButton-root': {
                                py: 0.4,
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                border: '1px solid var(--sidebar-border)',
                                '&.Mui-selected': {
                                    bgcolor: extractionSource === 'xml' ? '#7b1fa2' : '#005A9C',
                                    color: '#ffffff',
                                    '&:hover': { bgcolor: extractionSource === 'xml' ? '#6a1b9a' : '#004070' }
                                }
                            }
                        }}
                    >
                        <ToggleButton value="pdf" disabled={!hasPdfFile && !hasXmlFile}>
                            PDF {hasPdfFile ? '✓' : ''}
                        </ToggleButton>
                        <ToggleButton value="xml" disabled={!hasXmlFile}>
                            XML {hasXmlFile ? '✓' : ''}
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            )}

            {!isOpen && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.8, borderBottom: '1px solid var(--sidebar-border)' }}>
                    <Tooltip title={`Source: ${(extractionSource || 'pdf').toUpperCase()} (Click to toggle)`} placement="right">
                        <IconButton
                            size="small"
                            onClick={() => {
                                if (onExtractionSourceChange) {
                                    onExtractionSourceChange(extractionSource === 'xml' ? 'pdf' : (hasXmlFile ? 'xml' : 'pdf'));
                                }
                            }}
                            sx={{
                                width: 26,
                                height: 26,
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                bgcolor: extractionSource === 'xml' ? '#7b1fa2' : '#005A9C',
                                color: '#fff',
                                '&:hover': { opacity: 0.85 }
                            }}
                        >
                            {(extractionSource || 'pdf').toUpperCase().slice(0, 3)}
                        </IconButton>
                    </Tooltip>
                </Box>
            )}

            <List dense>
                {sections.map((section) => (
                    <ListItem key={section.id} disablePadding>
                        <Tooltip title={!isOpen ? `${section.title} (${(extractionSource || 'pdf').toUpperCase()})` : ""} placement="right" arrow>
                            <ListItemButton
                                component="a"
                                href={`#${section.id}`}
                                className="sidebar-link"
                                selected={activeSection === section.id}
                                onClick={(e) => { e.preventDefault(); onSectionClick(section); }}
                                disabled={loading}
                                sx={{
                                    '&.Mui-selected': {
                                        backgroundColor: extractionSource === 'xml' ? 'secondary.main' : 'info.main',
                                        color: '#ffffff',
                                        '&:hover': { backgroundColor: extractionSource === 'xml' ? 'secondary.dark' : 'info.dark' },
                                        '& .MuiListItemIcon-root': { color: '#ffffff' },
                                    },
                                }}>
                                {section.icon && (
                                    <ListItemIcon>
                                        {section.icon}
                                    </ListItemIcon>
                                )}
                                <ListItemText
                                    primary={section.title}
                                    secondary={isOpen && extractionSource === 'xml' ? 'Extract from XML' : null}
                                    secondaryTypographyProps={{ fontSize: '0.65rem', color: '#7b1fa2', fontWeight: 600 }}
                                />
                                {loadingSection === section.id && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                                        <CircularProgress size={16} color="inherit" />
                                    </Box>
                                )}
                                {extractedSections.has(section.id) && !visibleSections.has(section.id) && loadingSection !== section.id && (
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onArrowClick(section.id); }} sx={{ rotate: '270deg', animation: `${bounce} 2s infinite`, ml: 'auto' }}>
                                        <ArrowDownwardIcon fontSize="small" />
                                    </IconButton>
                                )}
                            </ListItemButton>
                        </Tooltip>
                    </ListItem>
                ))}
            </List>
            <div className="sidebar-footer">
                Appraisal Extractor {extractionSource ? `(${extractionSource.toUpperCase()})` : ''}
            </div>
        </div>
    </>
    );
};

export default Sidebar;
