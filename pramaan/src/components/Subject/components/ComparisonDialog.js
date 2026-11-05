import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../utils/utils';

export const ComparisonDialog = ({ open, onClose, data, onDataChange, pdfFile, htmlFile, setComparisonData }) => {
  const [result, setResult] = useState(null);

  const handleCompare = useCallback(async () => {
    setResult(null);

    const formData = new FormData();
    if (pdfFile) formData.append('pdf_file', pdfFile);
    if (htmlFile) formData.append('html_file', htmlFile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/compare/`, { method: 'POST', body: formData });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'PDF-HTML comparison failed.');
      }
      const apiResult = await res.json();
      setComparisonData(prev => ({ ...prev, ...apiResult }));
    } catch (err) {

    } finally {

    }
  }, [pdfFile, htmlFile, setComparisonData]);

  useEffect(() => {
    if (open && !result) {
      handleCompare();
    }
  }, [open, result, handleCompare]);

  return null;
};

export default ComparisonDialog;

