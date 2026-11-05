import React from 'react';
import { GlobalStyles } from '@mui/system';

export const TooltipStyles = () => (
  <GlobalStyles styles={{
    '.editable-field-container[style*="--tooltip-message"]': {
      position: 'relative',
      cursor: 'pointer',
    },
    '.editable-field-container[style*="--tooltip-message"]:hover::after': {
      content: 'var(--tooltip-message)',
      position: 'absolute',
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#864242ff',
      color: 'white',
      padding: '5px 10px',
      borderRadius: '4px',
      fontSize: '0.8rem',
      whiteSpace: 'nowrap',
      zIndex: 1000,
      marginBottom: '5px',
    },
    '@keyframes eyeBlink': {
      '5%, 100%': { transform: 'scaleY(1)' },
      '50%': { transform: 'scaleY(0.2)' },
    },
    '.animated-eye': {
      animation: 'eyeBlink 3s infinite',
    },
  }} />
);

export default TooltipStyles;

