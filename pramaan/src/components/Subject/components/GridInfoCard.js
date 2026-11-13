import React from 'react';
import { Paper, Box, Typography, Tooltip, IconButton, LinearProgress } from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { PlaylistAdd as PlaylistAddIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { EditableField } from './EditableField';



export const GridInfoCard = ({ id, title, fields, data, cardClass = 'bg-secondary', usePre = false, extractionAttempted, onDataChange, editingField, setEditingField, highlightedFields = [], allData, loading, loadingSection, manualValidations, handleManualValidation, onRevisionButtonClick, revisionHandlers, showBlankValidation = false, hideEmptyFields = false, isEditable = true }) => {



  const renderNeighborhoodTotal = () => {

    if (id !== 'neighborhood-section' || !data) return null;



    const usageFields = ["One-Unit", "2-4 Unit", "Multi-Family", "Commercial", "Other"];

    const values = usageFields.map(f => {

      const val = String(data[f] || '0').replace('%', '').trim();

      return parseFloat(val) || 0;

    });

    const total = values.reduce((sum, v) => sum + v, 0);



    const totalStyle = {

      fontWeight: 'bold',

      padding: '2px 8px',

      borderRadius: '4px',

      color: total === 100 ? '#000000' : '#721c24',

      backgroundColor: total === 100 ? '#91ff00ff' : '#f8d7da',

    };



    return <span style={totalStyle}>Total: {total}%</span>;

  };



  const getDynamicFields = () => {

    if (!data) return fields;



    let dynamicFields = [...fields];

    if (id === 'site-section' || id === 'project-site-section') {

      const zoningComplianceRaw = data?.['Zoning Compliance']

        ?? data?.SITE?.['Zoning Compliance']

        ?? allData?.SITE?.['Zoning Compliance']

        ?? allData?.['Zoning Compliance'];

      const zoningComplianceValue = (typeof zoningComplianceRaw === 'object' && zoningComplianceRaw !== null

        ? (zoningComplianceRaw.choice || zoningComplianceRaw.value || '')

        : String(zoningComplianceRaw || '')).trim().toLowerCase();

      const complianceIndex = dynamicFields.indexOf('Zoning Compliance');



      if (complianceIndex !== -1) {

        const isNonconforming = zoningComplianceValue.includes('nonconforming') || zoningComplianceValue.includes('grandfathered');

        if (isNonconforming && !dynamicFields.includes('Legal Nonconforming (Grandfathered Use) comment')) {

          dynamicFields.splice(complianceIndex + 1, 0, 'Legal Nonconforming (Grandfathered Use) comment');

        } else if (zoningComplianceValue.includes('no zoning') && !dynamicFields.includes('No Zoning comment')) {

          dynamicFields.splice(complianceIndex + 1, 0, 'No Zoning comment');

        }

      }

    }



    if (id === 'reconciliation-section' || title === 'RECONCILIATION') {

      const reconConditionField = 'This appraisal is made "as is", subject to completion per plans and specifications on the basis of a hypothetical condition that the improvements have been completed, subject to the following repairs or alterations on the basis of a hypothetical condition that the repairs or alterations have been completed, or subject to the following required inspection based on the extraordinary assumption that the condition or deficiency does not require alteration or repair:';

      let conditionIndex = dynamicFields.indexOf(reconConditionField);

      if (conditionIndex === -1) {

        conditionIndex = dynamicFields.findIndex(f => typeof f === 'string' && f.toLowerCase().includes('this appraisal is made'));

      }



      const reconConditionRaw = data?.[reconConditionField]

        ?? data?.RECONCILIATION?.[reconConditionField]

        ?? allData?.RECONCILIATION?.[reconConditionField]

        ?? allData?.[reconConditionField]

        ?? data?.['Reconciliation Status']

        ?? allData?.['Reconciliation Status']

        ?? '';

      const reconConditionValue = (typeof reconConditionRaw === 'object' && reconConditionRaw !== null

        ? (reconConditionRaw.choice || reconConditionRaw.value || '')

        : String(reconConditionRaw || '')).trim().toLowerCase();



      const isSubjectTo = reconConditionValue.includes('subject');

      const conditionsCommentRaw = data?.['Conditions Comment']

        ?? data?.['Subject To Comment']

        ?? data?.RECONCILIATION?.['Conditions Comment']

        ?? data?.RECONCILIATION?.['Subject To Comment']

        ?? allData?.RECONCILIATION?.['Conditions Comment']

        ?? allData?.RECONCILIATION?.['Subject To Comment']

        ?? allData?.['Conditions Comment']

        ?? allData?.['Subject To Comment']

        ?? '';



      if (isSubjectTo || String(conditionsCommentRaw || '').trim() !== '') {

        if (!dynamicFields.includes('Conditions Comment')) {

          if (conditionIndex !== -1) {

            dynamicFields.splice(conditionIndex + 1, 0, 'Conditions Comment');

          } else {

            dynamicFields.push('Conditions Comment');

          }

        }

      }

    }



    return dynamicFields;

  };

  const cardHeaderColors = {

    'bg-primary': 'primary.main',

    'bg-secondary': 'secondary.main',

    'bg-info': 'info.main',

    'bg-warning': 'warning.main',

    'bg-success': 'success.main',

    'bg-danger': 'error.main',

    'bg-dark': 'grey.900',

  };



  const borderColor = cardHeaderColors[cardClass] || 'primary.main';



  const renderValue = (value) => {

    if (typeof value === 'object' && value !== null) {

      if (value.hasOwnProperty('choice')) {

        return value.choice || '';

      }

      return Object.entries(value).map(([key, val]) => `${key}: ${val}`).join(', ');

    }

    return value || '';

  };



  const renderGridItemValue = (field) => {

    if (field === 'Garage Att./Det./Built-in') {

      const att = data?.['Garage Att.'] || data?.IMPROVEMENTS?.['Garage Att.'] || allData?.['Garage Att.'] || '';

      const det = data?.['Garage Detached'] || data?.IMPROVEMENTS?.['Garage Detached'] || allData?.['Garage Detached'] || '';

      const builtin = data?.['Garage Built-in'] || data?.IMPROVEMENTS?.['Garage Built-in'] || allData?.['Garage Built-in'] || '';

      return [att, det, builtin].filter(Boolean).join(' / ');

    }

    if (field === 'as of' || (typeof field === 'string' && field.trim().toLowerCase() === 'as of')) {

      const asOfVal = data?.['as of']

        ?? data?.['as of date']

        ?? data?.['Appraisal Effective Date']

        ?? data?.['Effective Date of Appraisal']

        ?? data?.['Effective Date']

        ?? data?.RECONCILIATION?.['as of']

        ?? data?.RECONCILIATION?.['as of date']

        ?? data?.RECONCILIATION?.['Appraisal Effective Date']

        ?? data?.RECONCILIATION?.['Effective Date of Appraisal']

        ?? data?.Reconciliation?.['as of']

        ?? data?.Reconciliation?.['as of date']

        ?? data?.Reconciliation?.['Appraisal Effective Date']

        ?? data?.Reconciliation?.['Effective Date of Appraisal']

        ?? allData?.['as of']

        ?? allData?.['as of date']

        ?? allData?.RECONCILIATION?.['as of']

        ?? allData?.RECONCILIATION?.['as of date']

        ?? allData?.RECONCILIATION?.['Appraisal Effective Date']

        ?? allData?.RECONCILIATION?.['Effective Date of Appraisal']

        ?? allData?.Reconciliation?.['as of']

        ?? allData?.Reconciliation?.['as of date']

        ?? allData?.Reconciliation?.['Appraisal Effective Date']

        ?? allData?.Reconciliation?.['Effective Date of Appraisal']

        ?? allData?.CERTIFICATION?.['Effective Date of Appraisal']

        ?? allData?.CERTIFICATION?.['Effective Date']

        ?? allData?.Certification?.['Effective Date of Appraisal']

        ?? allData?.Certification?.['Effective Date']

        ?? allData?.['Appraisal Effective Date']

        ?? allData?.['Effective Date of Appraisal']

        ?? allData?.['Effective Date'];

      if (asOfVal) return renderValue(asOfVal);

    }

    if (field === 'FHA Case #' || field === 'FHA Case No.' || field === 'FHA Case Number') {

      const fhaVal = data?.['FHA Case No.']

        ?? data?.['FHA Case #']

        ?? data?.['FHA Case Number']

        ?? data?.SUBJECT?.['FHA Case No.']

        ?? data?.SUBJECT?.['FHA Case #']

        ?? data?.Subject?.['FHA Case No.']

        ?? allData?.['FHA Case No.']

        ?? allData?.['FHA Case #']

        ?? allData?.['FHA Case Number']

        ?? allData?.SUBJECT?.['FHA Case No.']

        ?? allData?.SUBJECT?.['FHA Case #']

        ?? allData?.Subject?.['FHA Case No.'];

      if (fhaVal) return renderValue(fhaVal);

    }

    if (field === 'Appraiser Credential Level') {
      const credVal = data?.['Appraiser Credential Level']
        ?? data?.CONTACT?.['Appraiser Credential Level']
        ?? data?.['Contact Information']?.['Appraiser Credential Level']
        ?? data?.CERTIFICATION?.['Appraiser Credential Level']
        ?? data?.CERTIFICATION?.['Credential Level']
        ?? data?.CERTIFICATION?.['License Type']
        ?? allData?.['Appraiser Credential Level']
        ?? allData?.CONTACT?.['Appraiser Credential Level']
        ?? allData?.['Contact Information']?.['Appraiser Credential Level']
        ?? allData?.CERTIFICATION?.['Appraiser Credential Level']
        ?? allData?.CERTIFICATION?.['Credential Level'];
      if (credVal) return renderValue(credVal);
    }

    if (field === 'Appraiser ID') {
      const idVal = data?.['Appraiser ID']
        ?? data?.CONTACT?.['Appraiser ID']
        ?? data?.['Contact Information']?.['Appraiser ID']
        ?? data?.CERTIFICATION?.['Appraiser ID']
        ?? data?.CERTIFICATION?.['License Number']
        ?? data?.CERTIFICATION?.['Appraiser License #']
        ?? allData?.['Appraiser ID']
        ?? allData?.CONTACT?.['Appraiser ID']
        ?? allData?.['Contact Information']?.['Appraiser ID']
        ?? allData?.CERTIFICATION?.['Appraiser ID']
        ?? allData?.CERTIFICATION?.['License Number'];
      if (idVal) return renderValue(idVal);
    }

    if (field === 'Appraiser State') {
      const stVal = data?.['Appraiser State']
        ?? data?.CONTACT?.['Appraiser State']
        ?? data?.['Contact Information']?.['Appraiser State']
        ?? data?.CERTIFICATION?.['Appraiser State']
        ?? data?.CERTIFICATION?.['State']
        ?? allData?.['Appraiser State']
        ?? allData?.CONTACT?.['Appraiser State']
        ?? allData?.['Contact Information']?.['Appraiser State']
        ?? allData?.CERTIFICATION?.['Appraiser State']
        ?? allData?.CERTIFICATION?.['State'];
      if (stVal) return renderValue(stVal);
    }

    if (field === 'Appraiser License Expiration Date') {
      const expVal = data?.['Appraiser License Expiration Date']
        ?? data?.CONTACT?.['Appraiser License Expiration Date']
        ?? data?.['Contact Information']?.['Appraiser License Expiration Date']
        ?? data?.CERTIFICATION?.['Appraiser License Expiration Date']
        ?? data?.CERTIFICATION?.['Expiration Date of License']
        ?? data?.CERTIFICATION?.['License Expiration Date']
        ?? allData?.['Appraiser License Expiration Date']
        ?? allData?.CONTACT?.['Appraiser License Expiration Date']
        ?? allData?.['Contact Information']?.['Appraiser License Expiration Date']
        ?? allData?.CERTIFICATION?.['Appraiser License Expiration Date']
        ?? allData?.CERTIFICATION?.['Expiration Date of License'];
      if (expVal) return renderValue(expVal);
    }

    if (field === 'Appraiser Company Name') {
      const compVal = data?.['Appraiser Company Name']
        ?? data?.CONTACT?.['Appraiser Company Name']
        ?? data?.['Contact Information']?.['Appraiser Company Name']
        ?? data?.['Company Name']
        ?? data?.CERTIFICATION?.['Company Name']
        ?? allData?.['Appraiser Company Name']
        ?? allData?.CONTACT?.['Appraiser Company Name']
        ?? allData?.['Contact Information']?.['Appraiser Company Name']
        ?? allData?.['Company Name']
        ?? allData?.CERTIFICATION?.['Company Name'];
      if (compVal) return renderValue(compVal);
    }

    if (field === 'Appraiser Company Address') {
      const addrVal = data?.['Appraiser Company Address']
        ?? data?.CONTACT?.['Appraiser Company Address']
        ?? data?.['Contact Information']?.['Appraiser Company Address']
        ?? data?.['Company Address']
        ?? data?.CERTIFICATION?.['Company Address']
        ?? allData?.['Appraiser Company Address']
        ?? allData?.CONTACT?.['Appraiser Company Address']
        ?? allData?.['Contact Information']?.['Appraiser Company Address']
        ?? allData?.['Company Address']
        ?? allData?.CERTIFICATION?.['Company Address'];
      if (addrVal) return renderValue(addrVal);
    }

    if (field === 'Client/Lender Company Name') {
      const clNameVal = data?.['Client/Lender Company Name']
        ?? data?.CONTACT?.['Client/Lender Company Name']
        ?? data?.['Contact Information']?.['Client/Lender Company Name']
        ?? data?.['Lender/Client']
        ?? data?.['LENDER/CLIENT']
        ?? data?.SUBJECT?.['Lender/Client']
        ?? allData?.['Client/Lender Company Name']
        ?? allData?.CONTACT?.['Client/Lender Company Name']
        ?? allData?.['Contact Information']?.['Client/Lender Company Name']
        ?? allData?.['Lender/Client']
        ?? allData?.SUBJECT?.['Lender/Client'];
      if (clNameVal) return renderValue(clNameVal);
    }

    if (field === 'Client/Lender Company Address') {
      const clAddrVal = data?.['Client/Lender Company Address']
        ?? data?.CONTACT?.['Client/Lender Company Address']
        ?? data?.['Contact Information']?.['Client/Lender Company Address']
        ?? data?.['Address (Lender/Client)']
        ?? data?.['ADDRESS (LENDER/CLIENT)']
        ?? data?.SUBJECT?.['Address (Lender/Client)']
        ?? allData?.['Client/Lender Company Address']
        ?? allData?.CONTACT?.['Client/Lender Company Address']
        ?? allData?.['Contact Information']?.['Client/Lender Company Address']
        ?? allData?.['Address (Lender/Client)']
        ?? allData?.SUBJECT?.['Address (Lender/Client)'];
      if (clAddrVal) return renderValue(clAddrVal);
    }

    if (field === 'Attachment Type') {
      const attVal = data?.['Attachment Type']
        ?? data?.SUMMARY?.['Attachment Type']
        ?? data?.SUBJECT?.['Attachment Type']
        ?? data?.IMPROVEMENTS?.['Attachment Type']
        ?? allData?.['Attachment Type']
        ?? allData?.SUMMARY?.['Attachment Type']
        ?? allData?.SUBJECT?.['Attachment Type']
        ?? allData?.IMPROVEMENTS?.['Attachment Type']
        ?? data?.['Attached / Detached']
        ?? allData?.['Attached / Detached'];
      if (attVal) return renderValue(attVal);
    }

    if (field === 'Zoning Compliance') {
      const zcVal = data?.['Zoning Compliance']
        ?? data?.SUMMARY?.['Zoning Compliance']
        ?? data?.SITE?.['Zoning Compliance']
        ?? allData?.['Zoning Compliance']
        ?? allData?.SUMMARY?.['Zoning Compliance']
        ?? allData?.SITE?.['Zoning Compliance'];
      if (zcVal) return renderValue(zcVal);
    }

    if (field === 'Topography' || field === 'TOPOGRAPHY') {
      const topoVal = data?.['Topography']
        ?? data?.['TOPOGRAPHY']
        ?? data?.PROJECT_SITE?.['Topography']
        ?? data?.['Project Site']?.['Topography']
        ?? data?.SITE?.['Topography']
        ?? allData?.['Topography']
        ?? allData?.PROJECT_SITE?.['Topography']
        ?? allData?.['Project Site']?.['Topography']
        ?? allData?.SITE?.['Topography']
        ?? allData?.clean_data?.['Project Site']?.['Topography']
        ?? allData?.clean_data?.['Topography'];
      if (topoVal !== undefined && topoVal !== null && topoVal !== '') return renderValue(topoVal);
    }

    if (field === 'Size' || field === 'SIZE') {
      const sizeVal = data?.['Size']
        ?? data?.['SIZE']
        ?? data?.PROJECT_SITE?.['Size']
        ?? data?.['Project Site']?.['Size']
        ?? data?.SITE?.['Size']
        ?? allData?.['Size']
        ?? allData?.PROJECT_SITE?.['Size']
        ?? allData?.['Project Site']?.['Size']
        ?? allData?.SITE?.['Size']
        ?? allData?.clean_data?.['Project Site']?.['Size']
        ?? allData?.clean_data?.['Size']
        ?? data?.['Total Site Size']
        ?? data?.['Site Size']
        ?? allData?.['Total Site Size']
        ?? allData?.['Site Size'];
      if (sizeVal !== undefined && sizeVal !== null && sizeVal !== '') return renderValue(sizeVal);
    }

    if (field === 'Density' || field === 'DENSITY') {
      const densVal = data?.['Density']
        ?? data?.['DENSITY']
        ?? data?.PROJECT_SITE?.['Density']
        ?? data?.['Project Site']?.['Density']
        ?? data?.SITE?.['Density']
        ?? allData?.['Density']
        ?? allData?.PROJECT_SITE?.['Density']
        ?? allData?.['Project Site']?.['Density']
        ?? allData?.SITE?.['Density']
        ?? allData?.clean_data?.['Project Site']?.['Density']
        ?? allData?.clean_data?.['Density'];
      if (densVal !== undefined && densVal !== null && densVal !== '') return renderValue(densVal);
    }

    if (field === "Appraiser's Fee" || field === "Appraiser Fee" || field === "Appraisal Fee") {

      const feeVal = data?.["Appraiser's Fee"]

        ?? data?.["Appraiser Fee"]

        ?? data?.["Appraisal Fee"]

        ?? data?.SUBJECT?.["Appraiser's Fee"]

        ?? data?.SUBJECT?.["Appraiser Fee"]

        ?? data?.CERTIFICATION?.["Appraiser's Fee"]

        ?? data?.CERTIFICATION?.["Appraiser Fee"]

        ?? allData?.["Appraiser's Fee"]

        ?? allData?.["Appraiser Fee"]

        ?? allData?.["Appraisal Fee"]

        ?? allData?.SUBJECT?.["Appraiser's Fee"]

        ?? allData?.CERTIFICATION?.["Appraiser's Fee"];

      if (feeVal) return renderValue(feeVal);

    }

    if (field === "1004MC Addendum" || field === "1004MC Present" || field === "1004MC") {

      const mcVal = data?.["1004MC Addendum"]

        ?? data?.["1004MC Present"]

        ?? data?.SUBJECT?.["1004MC Addendum"]

        ?? data?.SUBJECT?.["1004MC Present"]

        ?? allData?.["1004MC Addendum"]

        ?? allData?.["1004MC Present"]

        ?? allData?.SUBJECT?.["1004MC Addendum"]

        ?? (allData?.has_1004mc ? "Present" : "");

      if (mcVal) return renderValue(mcVal);

    }

    if (

      field === "UAD pages present in the report" ||

      field === "UAD Pages Present in the Report" ||

      field === "UAD Pages Present" ||

      field === "UAD Pages" ||

      field === "UAD Definitions Addendum"

    ) {

      const uadPresentVal = data?.[field]

        ?? data?.["UAD pages present in the report"]

        ?? data?.["UAD Pages Present in the Report"]

        ?? data?.["UAD Pages Present"]

        ?? data?.["UAD Pages"]

        ?? data?.["UAD Definitions Addendum"]

        ?? data?.SUBJECT?.["UAD pages present in the report"]

        ?? data?.SUBJECT?.["UAD Pages Present in the Report"]

        ?? allData?.["UAD pages present in the report"]

        ?? allData?.["UAD Pages Present in the Report"]

        ?? allData?.SUBJECT?.["UAD pages present in the report"]

        ?? (allData?.has_uad_pages ? "Present" : "");

      if (uadPresentVal) return renderValue(uadPresentVal);

    }

    if (

      field === "Limiting Conditions" ||

      field === "Statement of Assumptions and Limiting Conditions" ||

      field === "Limiting Conditions Presence"

    ) {

      const limVal = data?.[field]

        ?? data?.["Limiting Conditions"]

        ?? data?.["Statement of Assumptions and Limiting Conditions"]

        ?? data?.SUBJECT?.["Limiting Conditions"]

        ?? allData?.["Limiting Conditions"]

        ?? allData?.["Statement of Assumptions and Limiting Conditions"]

        ?? allData?.uad_details?.limiting_conditions_presence

        ?? (allData?.limiting_conditions_pages?.length ? `Present (Pages ${allData.limiting_conditions_pages.join(', ')})` : "Not Present");

      if (limVal) return renderValue(limVal);

    }

    if (

      field === "Appraiser's Certification" ||

      field === "Appraiser Certification" ||

      field === "Certification Pages" ||

      field === "Certification Presence"

    ) {

      const certVal = data?.[field]

        ?? data?.["Appraiser's Certification"]

        ?? data?.["Appraiser Certification"]

        ?? data?.SUBJECT?.["Appraiser's Certification"]

        ?? allData?.["Appraiser's Certification"]

        ?? allData?.["Appraiser Certification"]

        ?? allData?.uad_details?.certification_presence

        ?? (allData?.certification_pages?.length ? `Present (Pages ${allData.certification_pages.join(', ')})` : "Not Present");

      if (certVal) return renderValue(certVal);

    }

    if (field === "UAD Details" || field === "uad_details") {

      const detailsVal = data?.["UAD Details"]

        ?? allData?.["UAD Details"]

        ?? allData?.uad_details?.details_summary;

      if (detailsVal) return renderValue(detailsVal);

    }

    if (

      field === "USPAP / Appraisal and Report Identification" ||

      field === "Appraisal and Report Identification" ||

      field === "USPAP Addendum" ||

      field === "USPAP"

    ) {

      const uspapPresentVal = data?.[field]

        ?? data?.["USPAP / Appraisal and Report Identification"]

        ?? data?.["Appraisal and Report Identification"]

        ?? data?.["USPAP Addendum"]

        ?? data?.SUBJECT?.["USPAP / Appraisal and Report Identification"]

        ?? data?.SUBJECT?.["Appraisal and Report Identification"]

        ?? allData?.["USPAP / Appraisal and Report Identification"]

        ?? allData?.["Appraisal and Report Identification"]

        ?? allData?.SUBJECT?.["USPAP / Appraisal and Report Identification"]

        ?? (allData?.has_uspap_identification ? "Present" : "");

      if (uspapPresentVal) return renderValue(uspapPresentVal);

    }

    if (

      field === "USPAP Reporting Option" ||

      field === "This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b)." ||

      (typeof field === "string" && field.includes("USPAP reporting option"))

    ) {

      const uspapVal = data?.[field]

        ?? data?.["This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b)."]

        ?? data?.["This report was prepared under the following USPAP reporting option:"]

        ?? data?.["USPAP Reporting Option"]

        ?? data?.["USPAP Reporting Options"]

        ?? data?.SUBJECT?.["USPAP Reporting Option"]

        ?? data?.CERTIFICATION?.["USPAP Reporting Option"]

        ?? allData?.["USPAP Reporting Option"]

        ?? allData?.["This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b)."]

        ?? allData?.CERTIFICATION?.["USPAP Reporting Option"]

        ?? "";

      if (uspapVal) return renderValue(uspapVal);

    }

    if (field === "Comments on Appraisal and Report Identification" || field === "Restricted Appraisal Report Comment") {

      const commVal = data?.["Comments on Appraisal and Report Identification"]

        ?? data?.["Restricted Appraisal Report Comment"]

        ?? data?.CERTIFICATION?.["Comments on Appraisal and Report Identification"]

        ?? data?.Subject?.["Comments on Appraisal and Report Identification"]

        ?? allData?.["Comments on Appraisal and Report Identification"]

        ?? allData?.["Restricted Appraisal Report Comment"]

        ?? allData?.CERTIFICATION?.["Comments on Appraisal and Report Identification"];

      if (commVal) return renderValue(commVal);

    }

    if (field === "E&O" || field === "E&O Present" || field === "E/O" || field === "E/O Present" || field === "E&O Insurance" || field === "E/O Insurance") {

      const eoVal = data?.["E&O"]

        ?? data?.["E&O Present"]

        ?? data?.["E/O"]

        ?? data?.["E/O Present"]

        ?? data?.["E&O Insurance"]

        ?? data?.["E/O Insurance"]

        ?? data?.CERTIFICATION?.["E&O"]

        ?? data?.CERTIFICATION?.["E&O Present"]

        ?? data?.CERTIFICATION?.["E/O"]

        ?? data?.CERTIFICATION?.["E/O Present"]

        ?? data?.CERTIFICATION?.["E&O Insurance"]

        ?? data?.CERTIFICATION?.["E/O Insurance"]

        ?? allData?.["E&O"]

        ?? allData?.["E&O Present"]

        ?? allData?.["E/O"]

        ?? allData?.["E/O Present"]

        ?? allData?.["E&O Insurance"]

        ?? allData?.["E/O Insurance"]

        ?? allData?.CERTIFICATION?.["E&O"]

        ?? allData?.CERTIFICATION?.["E&O Present"]

        ?? allData?.CERTIFICATION?.["E/O"]

        ?? allData?.CERTIFICATION?.["E/O Present"]

        ?? allData?.CERTIFICATION?.["E&O Insurance"]

        ?? allData?.CERTIFICATION?.["E/O Insurance"];

      if (eoVal) return renderValue(eoVal);

    }

    if (

      field === 'Legal Nonconforming (Grandfathered Use) comment' ||

      field === 'Legal Nonconforming comment' ||

      field === 'Nonconforming comment' ||

      field === 'Zoning Compliance comment'

    ) {

      const commentVal = data?.['Legal Nonconforming (Grandfathered Use) comment']

        ?? data?.['Legal Nonconforming comment']

        ?? data?.['Nonconforming comment']

        ?? data?.['Zoning Compliance comment']

        ?? data?.SITE?.['Legal Nonconforming (Grandfathered Use) comment']

        ?? data?.SITE?.['Legal Nonconforming comment']

        ?? data?.SITE?.['Nonconforming comment']

        ?? data?.SITE?.['Zoning Compliance comment']

        ?? allData?.SITE?.['Legal Nonconforming (Grandfathered Use) comment']

        ?? allData?.SITE?.['Legal Nonconforming comment']

        ?? allData?.SITE?.['Nonconforming comment']

        ?? allData?.SITE?.['Zoning Compliance comment']

        ?? allData?.['Legal Nonconforming (Grandfathered Use) comment']

        ?? allData?.['Legal Nonconforming comment']

        ?? allData?.['Nonconforming comment']

        ?? allData?.['Zoning Compliance comment'];

      if (commentVal) return renderValue(commentVal);

    }

    if (field === 'Invoice Attached' || field === 'Invoice Present') {

      const invVal = data?.['Invoice Attached'] ?? data?.['Invoice Present'] ?? data?.CERTIFICATION?.['Invoice Attached'] ?? data?.CERTIFICATION?.['Invoice Present'] ?? data?.SUBJECT?.['Invoice Attached'] ?? data?.SUBJECT?.['Invoice Present'] ?? data?.INVOICE?.['Invoice Attached'] ?? allData?.['Invoice Attached'] ?? allData?.['Invoice Present'] ?? allData?.CERTIFICATION?.['Invoice Attached'] ?? allData?.CERTIFICATION?.['Invoice Present'] ?? allData?.SUBJECT?.['Invoice Attached'] ?? allData?.INVOICE?.['Invoice Attached'];

      if (invVal) return renderValue(invVal);

    }

    if (field === 'Conditions Comment' || field === 'Subject To Comment') {

      const condVal = data?.['Conditions Comment']

        ?? data?.['Subject To Comment']

        ?? data?.RECONCILIATION?.['Conditions Comment']

        ?? data?.RECONCILIATION?.['Subject To Comment']

        ?? data?.Reconciliation?.['Conditions Comment']

        ?? data?.Reconciliation?.['Subject To Comment']

        ?? allData?.RECONCILIATION?.['Conditions Comment']

        ?? allData?.RECONCILIATION?.['Subject To Comment']

        ?? allData?.['Conditions Comment']

        ?? allData?.['Subject To Comment'];

      if (condVal !== undefined && condVal !== null) return renderValue(condVal);

    }

    const val = data?.[field]

      ?? data?.SUMMARY?.[field]

      ?? data?.Summary?.[field]

      ?? data?.CONTRACT?.[field]

      ?? data?.NEIGHBORHOOD?.[field]

      ?? data?.IMPROVEMENTS?.[field]

      ?? data?.COST_APPROACH?.[field]

      ?? data?.INCOME_APPROACH?.[field]

      ?? data?.PUD_INFO?.[field]

      ?? data?.PROJECT_INFO?.[field]

      ?? data?.['Project Information']?.[field]

      ?? data?.PROJECT_ANALYSIS?.[field]

      ?? data?.['Project Analysis']?.[field]

      ?? data?.clean_data?.['Project Information']?.[field]

      ?? data?.clean_data?.['Project Analysis']?.[field]

      ?? data?.UNIT_DESCRIPTIONS?.[field]

      ?? data?.['Unit Descriptions']?.[field]

      ?? data?.PRIOR_SALE_HISTORY?.[field]

      ?? data?.['Prior Sale History']?.[field]

      ?? data?.PROJECT_SITE?.[field]

      ?? data?.['Project Site']?.[field]

      ?? data?.clean_data?.['Unit Descriptions']?.[field]

      ?? data?.clean_data?.['Prior Sale History']?.[field]

      ?? data?.clean_data?.PRIOR_SALE_HISTORY?.[field]

      ?? data?.clean_data?.['Project Site']?.[field]

      ?? data?.SITE?.[field]

      ?? data?.SUBJECT?.[field]

      ?? data?.CONTACT?.[field]

      ?? data?.['Contact Information']?.[field]

      ?? data?.clean_data?.['Contact Information']?.[field]

      ?? data?.ASSIGNMENT?.[field]

      ?? data?.Assignment?.[field]

      ?? data?.RECONCILIATION?.[field]

      ?? data?.Reconciliation?.[field]

      ?? data?.CERTIFICATION?.[field]

      ?? allData?.[field]

      ?? allData?.SUMMARY?.[field]

      ?? allData?.Summary?.[field]

      ?? allData?.CONTRACT?.[field]

      ?? allData?.NEIGHBORHOOD?.[field]

      ?? allData?.IMPROVEMENTS?.[field]

      ?? allData?.PROJECT_INFO?.[field]

      ?? allData?.['Project Information']?.[field]

      ?? allData?.PROJECT_ANALYSIS?.[field]

      ?? allData?.['Project Analysis']?.[field]

      ?? allData?.clean_data?.['Project Information']?.[field]

      ?? allData?.clean_data?.['Project Analysis']?.[field]

      ?? allData?.UNIT_DESCRIPTIONS?.[field]

      ?? allData?.['Unit Descriptions']?.[field]

      ?? allData?.PRIOR_SALE_HISTORY?.[field]

      ?? allData?.['Prior Sale History']?.[field]

      ?? allData?.PROJECT_SITE?.[field]

      ?? allData?.['Project Site']?.[field]

      ?? allData?.clean_data?.['Unit Descriptions']?.[field]

      ?? allData?.clean_data?.['Prior Sale History']?.[field]

      ?? allData?.clean_data?.PRIOR_SALE_HISTORY?.[field]

      ?? allData?.clean_data?.['Project Site']?.[field]

      ?? allData?.SITE?.[field]

      ?? allData?.SUBJECT?.[field]

      ?? allData?.CONTACT?.[field]

      ?? allData?.['Contact Information']?.[field]

      ?? allData?.clean_data?.['Contact Information']?.[field]

      ?? allData?.ASSIGNMENT?.[field]

      ?? allData?.Assignment?.[field]

      ?? allData?.RECONCILIATION?.[field]

      ?? allData?.Reconciliation?.[field]

      ?? allData?.CERTIFICATION?.[field];

    return renderValue(val);

  };



  const renderGridItem = (field) => {

    if (id === 'neighborhood-section' && field === 'Present Land Use for other') {

      const otherValue = String(data?.['Other'] || allData?.NEIGHBORHOOD?.['Other'] || allData?.['Other'] || '0').replace('%', '').trim();

      const otherNumericValue = parseFloat(otherValue);



      if (isNaN(otherNumericValue) || otherNumericValue <= 0) {

        return null;

      }

    }



    const isHighlighted = highlightedFields.includes(field);

    let isItemMissing = false;

    const computedFieldPath = (() => {

      const baseFieldPath = Array.isArray(field) ? field : [field];

      return onDataChange && onDataChange.length === 2 ? baseFieldPath : [id.replace('-section', '').toUpperCase(), ...baseFieldPath];

    })();



    if (field === 'Conditions Comment' || field === 'Subject To Comment') {

      return (

        <div

          key={field}

          className={`subject-grid-item ${isHighlighted ? 'highlighted-field' : ''}`}



        >

          <span

            className="field-label"

            onClick={() => setEditingField && setEditingField(computedFieldPath)}

            style={{ cursor: 'pointer', userSelect: 'none', color: '#b45309', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}

          >

            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>

            Subject To / Conditions Comment

          </span>

          <EditableField

            fieldPath={computedFieldPath}

            value={renderGridItemValue(field)}

            onDataChange={onDataChange}

            editingField={editingField}

            setEditingField={setEditingField}

            usePre={true}

            isMissing={isItemMissing}

            inputClassName="form-control form-control-sm field-value-pre"

            isEditable={true}

            allData={allData}

            manualValidations={manualValidations}

            handleManualValidation={handleManualValidation}

            revisionHandlers={revisionHandlers}

            showBlankValidation={showBlankValidation || id === 'info-of-sales-section' || id === 'project-info-section' || id === 'project-analysis-section' || id === 'unit-descriptions-section' || id === 'prior-sale-history-section' || title === 'Project Information' || title === 'Project Analysis' || title === 'Unit Descriptions' || title === 'Prior Sale History'}

            inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, height: 'auto', resize: 'vertical', fontSize: '0.9rem', color: '#1f2937' }}

          />

        </div>

      );

    }



    return (

      <div key={field} className={`subject-grid-item ${isHighlighted ? 'highlighted-field' : ''}`}>

        <span

          className="field-label"

          onClick={() => setEditingField && setEditingField(computedFieldPath)}

          style={{ cursor: 'pointer', userSelect: 'none' }}

        >

          {field}

        </span>

        <EditableField

          fieldPath={computedFieldPath}

          value={renderGridItemValue(field)}

          onDataChange={onDataChange}

          editingField={editingField}

          setEditingField={setEditingField}

          usePre={usePre}

          isMissing={isItemMissing}

          inputClassName={`form-control form-control-sm ${usePre ? "field-value-pre" : "field-value"}`}

          isEditable={true}

          allData={allData}

          manualValidations={manualValidations}

          handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers}

          showBlankValidation={showBlankValidation || id === 'info-of-sales-section' || id === 'project-info-section' || id === 'project-analysis-section' || id === 'unit-descriptions-section' || id === 'prior-sale-history-section' || title === 'Project Information' || title === 'Project Analysis' || title === 'Unit Descriptions' || title === 'Prior Sale History'}

          inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, height: 'auto', resize: usePre ? 'vertical' : 'none' }}

        />

      </div>

    );

  };



  const renderCertField = (label, fieldPath, isCheckbox = false) => {

    if (isCheckbox) {

      const isChecked = data && (data[fieldPath] === 'Yes' || data[fieldPath] === true || String(data[fieldPath]).toLowerCase() === 'x');

      const handleToggle = () => {

        const newValue = isChecked ? 'No' : 'Yes';

        onDataChange([fieldPath], newValue);

      };

      return (

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>

          <input

            type="checkbox"

            checked={isChecked}

            onChange={handleToggle}

            style={{ width: '14px', height: '14px', cursor: 'pointer' }}

          />

          <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#495057' }}>{label}</span>

        </div>

      );

    }



    let certVal = data ? renderValue(data[fieldPath]) : '';

    if ((certVal === undefined || certVal === null || certVal === '') && fieldPath === 'Date Signed') {

      certVal = renderValue(data?.["Date Signed"] ?? data?.["Date of Signature and Report"] ?? data?.["Date of Signature"] ?? data?.["Report Signed Date"] ?? allData?.["Date Signed"] ?? allData?.["Date of Signature and Report"] ?? allData?.["Report Signed Date"] ?? allData?.CERTIFICATION?.["Date of Signature and Report"] ?? '');

    }

    if ((certVal === undefined || certVal === null || certVal === '') && fieldPath === 'Effective Date of Appraisal') {

      certVal = renderValue(data?.["Effective Date of Appraisal"] ?? data?.["Effective Date"] ?? allData?.["Effective Date of Appraisal"] ?? allData?.["Effective Date"] ?? allData?.CERTIFICATION?.["Effective Date of Appraisal"] ?? '');

    }

    if ((certVal === undefined || certVal === null || certVal === '') && fieldPath === 'Supervisory Date Signed') {

      certVal = renderValue(data?.["Supervisory Date Signed"] ?? data?.["Supervisory Date of Signature"] ?? allData?.["Supervisory Date Signed"] ?? allData?.["Supervisory Date of Signature"] ?? allData?.CERTIFICATION?.["Supervisory Date of Signature"] ?? '');

    }

    if ((certVal === undefined || certVal === null || certVal === '') && fieldPath === 'State') {

      certVal = renderValue(data?.["State"] ?? allData?.["State"] ?? allData?.CERTIFICATION?.["State"] ?? '');

    }

    if ((certVal === undefined || certVal === null || certVal === '') && fieldPath === 'Supervisory State') {

      certVal = renderValue(data?.["Supervisory State"] ?? allData?.["Supervisory State"] ?? allData?.CERTIFICATION?.["Supervisory State"] ?? '');

    }

    if ((certVal === undefined || certVal === null || certVal === '') && (fieldPath === 'State Certification #' || fieldPath === 'or State License #')) {

      certVal = renderValue(data?.[fieldPath] ?? allData?.[fieldPath] ?? allData?.CERTIFICATION?.[fieldPath] ?? '');

    }

    if ((certVal === undefined || certVal === null || certVal === '') && (fieldPath === 'Supervisory State Certification #' || fieldPath === 'Supervisory or State License #')) {

      certVal = renderValue(data?.[fieldPath] ?? allData?.[fieldPath] ?? allData?.CERTIFICATION?.[fieldPath] ?? '');

    }

    if ((certVal === undefined || certVal === null || certVal === '') && (fieldPath === 'Expiration Date of Certification or License' || fieldPath === 'Expiration Date')) {

      certVal = renderValue(data?.["Expiration Date of Certification or License"] ?? data?.["Expiration Date"] ?? allData?.["Expiration Date of Certification or License"] ?? allData?.["Expiration Date"] ?? allData?.CERTIFICATION?.["Expiration Date of Certification or License"] ?? '');

    }

    if ((certVal === undefined || certVal === null || certVal === '') && fieldPath === 'Supervisory Expiration Date of Certification or License') {

      certVal = renderValue(data?.["Supervisory Expiration Date of Certification or License"] ?? allData?.["Supervisory Expiration Date of Certification or License"] ?? allData?.CERTIFICATION?.["Supervisory Expiration Date of Certification or License"] ?? '');

    }

    if ((certVal === undefined || certVal === null || certVal === '') && (fieldPath === 'E&O' || fieldPath === 'E&O Present' || fieldPath === 'E/O' || fieldPath === 'E/O Present' || fieldPath === 'E&O Insurance' || fieldPath === 'E/O Insurance')) {

      certVal = renderValue(data?.['E&O'] ?? data?.['E&O Present'] ?? data?.['E/O'] ?? data?.['E/O Present'] ?? data?.['E&O Insurance'] ?? data?.['E/O Insurance'] ?? data?.CERTIFICATION?.['E&O'] ?? data?.CERTIFICATION?.['E&O Present'] ?? data?.CERTIFICATION?.['E/O'] ?? data?.CERTIFICATION?.['E/O Present'] ?? allData?.['E&O'] ?? allData?.['E&O Present'] ?? allData?.['E/O'] ?? allData?.['E/O Present'] ?? allData?.CERTIFICATION?.['E&O'] ?? allData?.CERTIFICATION?.['E&O Present'] ?? allData?.CERTIFICATION?.['E/O'] ?? allData?.CERTIFICATION?.['E/O Present'] ?? '');

    }

    if ((certVal === undefined || certVal === null || certVal === '') && (fieldPath === 'Invoice Attached' || fieldPath === 'Invoice Present')) {

      certVal = renderValue(data?.['Invoice Attached'] ?? data?.['Invoice Present'] ?? data?.CERTIFICATION?.['Invoice Attached'] ?? data?.CERTIFICATION?.['Invoice Present'] ?? data?.SUBJECT?.['Invoice Attached'] ?? data?.SUBJECT?.['Invoice Present'] ?? data?.INVOICE?.['Invoice Attached'] ?? allData?.['Invoice Attached'] ?? allData?.['Invoice Present'] ?? allData?.CERTIFICATION?.['Invoice Attached'] ?? allData?.CERTIFICATION?.['Invoice Present'] ?? allData?.SUBJECT?.['Invoice Attached'] ?? allData?.INVOICE?.['Invoice Attached'] ?? '');

    }

    if ((certVal === undefined || certVal === null || certVal === '') && (

      fieldPath === 'USPAP / Appraisal and Report Identification' ||

      fieldPath === 'Appraisal and Report Identification'

    )) {

      certVal = renderValue(

        data?.["USPAP / Appraisal and Report Identification"]

        ?? data?.["Appraisal and Report Identification"]

        ?? data?.["USPAP Addendum"]

        ?? data?.SUBJECT?.["USPAP / Appraisal and Report Identification"]

        ?? allData?.["USPAP / Appraisal and Report Identification"]

        ?? (data?.has_uspap_identification ? "Present" : "")

      );

    }

    if ((certVal === undefined || certVal === null || certVal === '') && (

      fieldPath === 'USPAP Reporting Option' ||

      fieldPath === 'This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b).' ||

      (typeof fieldPath === 'string' && fieldPath.includes('USPAP reporting option'))

    )) {

      certVal = renderValue(

        data?.["This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b)."]

        ?? data?.["This report was prepared under the following USPAP reporting option:"]

        ?? data?.["USPAP Reporting Option"]

        ?? data?.CERTIFICATION?.["USPAP Reporting Option"]

        ?? data?.SUBJECT?.["USPAP Reporting Option"]

        ?? allData?.["USPAP Reporting Option"]

        ?? allData?.["This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b)."]

        ?? allData?.CERTIFICATION?.["USPAP Reporting Option"]

        ?? ""

      );

    }

    if ((certVal === undefined || certVal === null || certVal === '') && (

      fieldPath === 'Comments on Appraisal and Report Identification' ||

      fieldPath === 'Restricted Appraisal Report Comment'

    )) {

      certVal = renderValue(

        data?.["Comments on Appraisal and Report Identification"]

        ?? data?.["Restricted Appraisal Report Comment"]

        ?? data?.CERTIFICATION?.["Comments on Appraisal and Report Identification"]

        ?? data?.Subject?.["Comments on Appraisal and Report Identification"]

        ?? allData?.["Comments on Appraisal and Report Identification"]

        ?? allData?.["Restricted Appraisal Report Comment"]

        ?? allData?.CERTIFICATION?.["Comments on Appraisal and Report Identification"]

        ?? ""

      );

    }

    if ((certVal === undefined || certVal === null || certVal === '') && typeof fieldPath === 'string' && fieldPath.startsWith('Supervisory ')) {

      const subKey = fieldPath.replace('Supervisory ', '');

      const altKey = `Supervisory Appraiser ${subKey}`;

      if (data?.[altKey]) certVal = renderValue(data[altKey]);

      else if (data?.SUPERVISORY_APPRAISER?.[subKey]) certVal = renderValue(data.SUPERVISORY_APPRAISER[subKey]);

      else if (data?.SUPERVISORY_APPRAISER?.[fieldPath]) certVal = renderValue(data.SUPERVISORY_APPRAISER[fieldPath]);

    }

    if ((certVal === undefined || certVal === null || certVal === '') && typeof fieldPath === 'string') {

      if (data?.CERTIFICATION?.[fieldPath]) certVal = renderValue(data.CERTIFICATION[fieldPath]);

      else if (allData?.CERTIFICATION?.[fieldPath]) certVal = renderValue(allData.CERTIFICATION[fieldPath]);

      else if (allData?.[fieldPath]) certVal = renderValue(allData[fieldPath]);

    }



    if (fieldPath === 'E&O' || fieldPath === 'E&O Present' || fieldPath === 'E/O' || fieldPath === 'E/O Present') {

      const isPresent = String(certVal || '').trim().toLowerCase() === 'present';

      return (

        <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

            <span

              onClick={() => setEditingField && setEditingField([fieldPath])}

              style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', minWidth: '100px', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}

            >

              {label}

            </span>

            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>

              <span

                style={{

                  display: 'inline-block',

                  padding: '2px 8px',

                  borderRadius: '12px',

                  fontSize: '0.72rem',

                  fontWeight: 'bold',

                  backgroundColor: isPresent ? '#e8f5e9' : '#ffebee',

                  color: isPresent ? '#1b5e20' : '#c62828',

                  border: `1px solid ${isPresent ? '#a5d6a7' : '#ef9a9a'}`

                }}

              >

                {isPresent ? '● Present' : '○ Absent'}

              </span>

              <div style={{ flexGrow: 1 }}>

                <EditableField

                  fieldPath={[fieldPath]}

                  value={certVal || 'Absent'}

                  onDataChange={onDataChange}

                  editingField={editingField}

                  setEditingField={setEditingField}

                  isMissing={false}

                  isEditable={true}

                  allData={allData}

                  manualValidations={manualValidations}

                  handleManualValidation={handleManualValidation}

                  revisionHandlers={revisionHandlers}

                  inputClassName="form-control form-control-sm field-value"

                  inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}

                />

              </div>

            </div>

          </div>

        </div>

      );

    }



    if (fieldPath === 'Invoice Attached' || fieldPath === 'Invoice Present') {

      const isAttached = ['yes', 'true', 'attached', 'included', '1', 'present'].includes(String(certVal || '').trim().toLowerCase());

      return (

        <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

            <span

              onClick={() => setEditingField && setEditingField([fieldPath])}

              style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', minWidth: '100px', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}

            >

              {label}

            </span>

            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>

              <span

                style={{

                  display: 'inline-block',

                  padding: '2px 8px',

                  borderRadius: '12px',

                  fontSize: '0.72rem',

                  fontWeight: 'bold',

                  backgroundColor: isAttached ? '#e8f5e9' : '#ffebee',

                  color: isAttached ? '#1b5e20' : '#c62828',

                  border: `1px solid ${isAttached ? '#a5d6a7' : '#ef9a9a'}`

                }}

              >

                {isAttached ? '● Attached' : '○ Not Attached'}

              </span>

              <div style={{ flexGrow: 1 }}>

                <EditableField

                  fieldPath={[fieldPath]}

                  value={certVal || (isAttached ? 'Yes' : 'No')}

                  onDataChange={onDataChange}

                  editingField={editingField}

                  setEditingField={setEditingField}

                  isMissing={false}

                  isEditable={true}

                  allData={allData}

                  manualValidations={manualValidations}

                  handleManualValidation={handleManualValidation}

                  revisionHandlers={revisionHandlers}

                  inputClassName="form-control form-control-sm field-value"

                  inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}

                />

              </div>

            </div>

          </div>

        </div>

      );

    }



    return (

      <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>

          <span

            onClick={() => setEditingField && setEditingField([fieldPath])}

            style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', minWidth: '100px', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}

          >

            {label}

          </span>

          <div style={{ flexGrow: 1 }}>

            <EditableField

              fieldPath={[fieldPath]}

              value={certVal}

              onDataChange={onDataChange}

              editingField={editingField}

              setEditingField={setEditingField}

              isMissing={false}

              isEditable={true}

              allData={allData}

              manualValidations={manualValidations}

              handleManualValidation={handleManualValidation}

              revisionHandlers={revisionHandlers}

              inputClassName="form-control form-control-sm field-value"

              inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}

            />

          </div>

        </div>

      </div>

    );

  };



  const renderCostField = (label, fieldPath) => {

    const costData = data?.COST_APPROACH || data || {};

    let val = costData?.[fieldPath] ?? costData?.[label] ?? data?.COST_APPROACH?.[fieldPath] ?? data?.COST_APPROACH?.[label] ?? data?.[fieldPath] ?? data?.[label] ?? '';

    const isOpinionOfSite = label === 'OPINION OF SITE VALUE' || fieldPath.includes('OPINION OF SITE VALUE');

    const isEconomicLife = label === 'Remaining Economic Life' || fieldPath.includes('Remaining Economic Life');



    if ((val === undefined || val === null || String(val).trim() === '') && isOpinionOfSite) {

      val = costData?.['Opinion of Site Value']

        ?? costData?.['Opinion of Site Value $']

        ?? costData?.['OPINION OF SITE VALUE $']

        ?? allData?.COST_APPROACH?.['OPINION OF SITE VALUE = $ ................................................']

        ?? allData?.COST_APPROACH?.['OPINION OF SITE VALUE']

        ?? allData?.COST_APPROACH?.['Opinion of Site Value']

        ?? allData?.COST_APPROACH?.['Opinion of Site Value $']

        ?? allData?.['OPINION OF SITE VALUE = $ ................................................']

        ?? allData?.['OPINION OF SITE VALUE']

        ?? allData?.['Opinion of Site Value']

        ?? '';

    }

    if ((val === undefined || val === null || String(val).trim() === '') && isEconomicLife) {

      val = costData?.['Remaining Economic Life']

        ?? costData?.['Estimated Remaining Economic Life (HUD and VA only)']

        ?? costData?.['Estimated Remaining Economic Life']

        ?? allData?.COST_APPROACH?.['Estimated Remaining Economic Life (HUD and VA only)']

        ?? allData?.COST_APPROACH?.['Remaining Economic Life']

        ?? allData?.COST_APPROACH?.['Estimated Remaining Economic Life']

        ?? allData?.['Estimated Remaining Economic Life (HUD and VA only)']

        ?? allData?.['Remaining Economic Life']

        ?? allData?.['Estimated Remaining Economic Life']

        ?? '';

    }

    const valStr = renderValue(val);

    const targetPath = ['COST_APPROACH', fieldPath];



    return (

      <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>

          <span

            onClick={() => setEditingField && setEditingField(targetPath)}

            style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', minWidth: '120px', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}

          >

            {label}

            {(isOpinionOfSite || isEconomicLife) && <span style={{ color: '#d32f2f', marginLeft: '3px', fontWeight: 'bold' }}>*</span>}

          </span>

          <div style={{ flexGrow: 1 }}>

            <EditableField

              fieldPath={targetPath}

              value={valStr}

              onDataChange={onDataChange}

              editingField={editingField}

              setEditingField={setEditingField}

              isMissing={false}

              isEditable={true}

              allData={allData}

              manualValidations={manualValidations}

              handleManualValidation={handleManualValidation}

              revisionHandlers={revisionHandlers}

              inputClassName="form-control form-control-sm field-value"

              inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}

            />

          </div>

        </div>

      </div>

    );

  };



  const getImpValue = (keys) => {

    const keyList = Array.isArray(keys) ? keys : [keys];

    for (const key of keyList) {

      const val = data?.IMPROVEMENTS?.[key]

        ?? data?.Improvements?.[key]

        ?? data?.[key]

        ?? allData?.IMPROVEMENTS?.[key]

        ?? allData?.Improvements?.[key]

        ?? allData?.[key];

      if (val !== undefined && val !== null && String(val).trim() !== '') {

        return { value: val, actualKey: key };

      }

    }

    return { value: '', actualKey: keyList[0] };

  };



  const getFieldPath = (actualKey) => {

    if (data?.IMPROVEMENTS && actualKey in data.IMPROVEMENTS) {

      return ['IMPROVEMENTS', actualKey];

    }

    if (data?.Improvements && actualKey in data.Improvements) {

      return ['Improvements', actualKey];

    }

    if (allData?.IMPROVEMENTS && actualKey in allData.IMPROVEMENTS) {

      return ['IMPROVEMENTS', actualKey];

    }

    if (allData?.Improvements && actualKey in allData.Improvements) {

      return ['Improvements', actualKey];

    }

    if (data && actualKey in data) {

      return [actualKey];

    }

    if (allData && actualKey in allData) {

      return [actualKey];

    }

    if (data?.Improvements || allData?.Improvements) {

      return ['Improvements', actualKey];

    }

    return ['IMPROVEMENTS', actualKey];

  };



  const checkOptionMatches = (valStr, opt) => {

    if (!valStr || !opt) return false;

    const v = String(valStr).trim().toLowerCase();

    const optLower = opt.trim().toLowerCase();

    const o = optLower.replace(/\./g, '');



    // Handle Units special case: "One" should NOT match "One with Accessory Unit"

    if (opt === 'One') {

      return v === 'one' || (/\bone\b/i.test(v) && !v.includes('accessory'));

    }

    if (opt === 'One with Accessory Unit') {

      return v.includes('accessory');

    }



    // Exact string match

    if (v === optLower || v === o) return true;



    // Split by commas, slashes, or semicolons

    const tokens = v.split(/[,;/]+/).map(t => t.trim()).filter(Boolean);

    for (const token of tokens) {

      const t = token.toLowerCase();

      const tClean = t.replace(/\./g, '').trim();



      if (t === optLower || tClean === o) return true;

      if (o === 'det' && (tClean === 'detached' || tClean === 'det')) return true;

      if (o === 'att' && (tClean === 'attached' || tClean === 'att')) return true;

      if ((o.includes('s-det') || o.includes('end unit')) && (tClean.includes('semi') || tClean.includes('s-det') || tClean.includes('end unit'))) return true;

      if (o === 'existing' && tClean === 'existing') return true;

      if (o === 'proposed' && tClean === 'proposed') return true;

      if (o.includes('under') && tClean.includes('under')) return true;

      if (o === 'concrete slab' && (tClean.includes('slab') || tClean === 'concrete slab')) return true;

      if (o === 'crawl space' && (tClean.includes('crawl') || tClean === 'crawl space')) return true;

      if (o === 'full basement' && (tClean.includes('full') || tClean === 'full basement')) return true;

      if (o === 'partial basement' && (tClean.includes('partial') || tClean === 'partial basement')) return true;

      if (o.includes('outside') && (tClean.includes('outside') || tClean.includes('entry'))) return true;

      if (o.includes('sump') && (tClean.includes('sump') || tClean.includes('pump'))) return true;

      if (o === 'none' && tClean === 'none') return true;

      if (o.includes('refrigerator') && tClean.includes('refrigerator')) return true;

      if (o.includes('range') && (tClean.includes('range') || tClean.includes('oven'))) return true;

      if (o.includes('dishwasher') && tClean.includes('dishwasher')) return true;

      if (o.includes('disposal') && tClean.includes('disposal')) return true;

      if (o.includes('microwave') && tClean.includes('microwave')) return true;

      if (o.includes('washer') && (tClean.includes('washer') || tClean.includes('dryer'))) return true;

      if (o.includes('fwa') && tClean === 'fwa') return true;

      if (o.includes('hwbb') && tClean === 'hwbb') return true;

      if (o.includes('radiant') && tClean === 'radiant') return true;

      if (o.includes('central') && (tClean.includes('central') || tClean.includes('central air'))) return true;

      if (o.includes('woodstove') && tClean.includes('woodstove')) return true;

      if (o.includes('fireplace') && tClean.includes('fireplace')) return true;

      if (o.includes('fence') && tClean.includes('fence')) return true;

      if (o.includes('patio') && (tClean.includes('patio') || tClean.includes('deck'))) return true;

      if (o.includes('porch') && tClean.includes('porch')) return true;

      if (o.includes('pool') && tClean.includes('pool')) return true;

      if (o === 'driveway' && (tClean.includes('driveway') || tClean === 'driveway')) return true;

      if (o === 'garage' && (tClean.includes('garage') || tClean === 'garage')) return true;

      if (o === 'carport' && (tClean.includes('carport') || tClean === 'carport')) return true;

      if (o.includes('other') && (tClean.includes('other') || tClean.startsWith('other') || tClean === 'none' || tClean === 'no')) return true;

    }

    return false;

  };



  const renderImpField = (label, keys, options = []) => {

    const { value: rawVal, actualKey } = getImpValue(keys);

    const valStr = renderValue(rawVal);

    const targetPath = getFieldPath(actualKey);



    return (

      <div style={{ borderBottom: '1px solid #e9ecef', paddingBottom: '3px', marginBottom: '4px' }}>

        <div

          onClick={() => setEditingField && setEditingField(targetPath)}

          style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', marginBottom: '2px', cursor: 'pointer', userSelect: 'none' }}

        >

          {label}

        </div>

        {options.length > 0 && (

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', marginBottom: '3px' }}>

            {options.map(opt => {

              const isChecked = checkOptionMatches(valStr, opt);

              const handleToggle = () => {

                let items = valStr ? valStr.split(',').map(s => s.trim()).filter(Boolean) : [];

                if (isChecked) {

                  items = items.filter(item => !checkOptionMatches(item, opt));

                } else {

                  items.push(opt);

                }

                const newVal = items.join(', ');

                onDataChange(targetPath, newVal);

                if (keys.includes('Foundation Type') || keys.includes('Foundation')) {

                  const altKey = actualKey === 'Foundation Type' ? 'Foundation' : 'Foundation Type';

                  onDataChange(getFieldPath(altKey), newVal);

                  const isFull = newVal.toLowerCase().includes('full basement') || (newVal.toLowerCase().includes('basement') && !newVal.toLowerCase().includes('partial'));

                  const isPartial = newVal.toLowerCase().includes('partial');

                  const isSlab = newVal.toLowerCase().includes('slab');

                  const isCrawl = newVal.toLowerCase().includes('crawl');

                  onDataChange(getFieldPath('Full Basement'), isFull ? 'Yes' : 'No');

                  onDataChange(getFieldPath('Partial Basement'), isPartial ? 'Yes' : 'No');

                  onDataChange(getFieldPath('Concrete Slab'), isSlab ? 'Yes' : 'No');

                  onDataChange(getFieldPath('Crawl Space'), isCrawl ? 'Yes' : 'No');


                }

              };

              return (

                <label key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '0.7rem', userSelect: 'none', margin: 0 }}>

                  <input type="checkbox" checked={isChecked} onChange={handleToggle} style={{ margin: 0, width: '12px', height: '12px' }} />

                  <span>{opt}</span>

                </label>

              );

            })}

          </div>

        )}

        <EditableField

          fieldPath={targetPath}

          value={valStr}

          onDataChange={onDataChange}

          editingField={editingField}

          setEditingField={setEditingField}

          isEditable={true}

          allData={allData}

          manualValidations={manualValidations}

          handleManualValidation={handleManualValidation}

          revisionHandlers={revisionHandlers}

          inputClassName="form-control form-control-sm field-value"

          inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.75rem', height: 'auto' }}

        />

      </div>

    );

  };



  const renderImpNarrativeField = (keys) => {

    const { value: rawVal, actualKey } = getImpValue(keys);

    const valStr = renderValue(rawVal);

    const targetPath = getFieldPath(actualKey);

    return (

      <EditableField

        fieldPath={targetPath}

        value={valStr}

        onDataChange={onDataChange}

        editingField={editingField}

        setEditingField={setEditingField}

        usePre={true}

        isEditable={true}

        allData={allData}

        manualValidations={manualValidations}

        handleManualValidation={handleManualValidation}

        revisionHandlers={revisionHandlers}

        inputClassName="form-control form-control-sm field-value-pre"

        inputStyle={{ width: '100%', border: '1px solid #ced4da', background: '#fff', padding: '4px', fontSize: '0.8rem', height: 'auto', minHeight: '40px', resize: 'vertical' }}

      />

    );

  };

  // =============================================================
  // NEIGHBORHOOD SECTION - FANNIE MAE 1004 / 1073 / 1025 GRID
  // =============================================================
  if (id === 'neighborhood-section' || title === 'Neighborhood Section' || title === 'Neighborhood') {
    const nbData = (data && typeof data === 'object' && ('Location' in data || 'Built-Up' in data || 'One-Unit' in data || 'one unit housing price(high,low,pred)' in data))
      ? data
      : (data?.NEIGHBORHOOD || allData?.NEIGHBORHOOD || allData?.clean_data?.Neighborhood || allData || {});

    const currentFormType = String(allData?.form_type || allData?.['Form Type'] || allData?.selectedFormType || allData?.['From Type'] || allData?.formType || '').toLowerCase();
    const isCondo = currentFormType.includes('1073') || Boolean(allData?.clean_data?.['Unit Descriptions'] || allData?.UNIT_DESCRIPTIONS || allData?.clean_data?.['Project Information'] || allData?.PROJECT_INFO || nbData['condominium housing price(high,low,pred)']);
    const isMultiFamily = currentFormType.includes('1025');

    const housingTrendsTitle = isCondo
      ? "Condominium Unit Housing Trends"
      : (isMultiFamily ? "2-4 Unit Housing Trends" : "One-Unit Housing Trends");

    const housingTitle = isCondo
      ? "Condominium Housing"
      : (isMultiFamily ? "2-4 Unit Housing" : "One-Unit Housing");

    // Helper to get raw string value
    const getNbRawVal = (key) => {
      const v = nbData[key] !== undefined ? nbData[key] : (allData?.NEIGHBORHOOD?.[key] ?? allData?.[key] ?? '');
      return renderValue(v);
    };

    // Helper to render an EditableField for a narrative or text field
    const renderNbEditable = (fieldKey, placeholder = '', customStyle = {}, usePre = false) => {
      const valStr = getNbRawVal(fieldKey);
      return (
        <EditableField
          fieldPath={[fieldKey]}
          value={valStr}
          onDataChange={onDataChange}
          editingField={editingField}
          setEditingField={setEditingField}
          usePre={usePre}
          isEditable={isEditable}
          allData={allData}
          manualValidations={manualValidations}
          handleManualValidation={handleManualValidation}
          revisionHandlers={revisionHandlers}
          showBlankValidation={true}
          inputClassName="form-control form-control-sm field-value-pre"
          placeholder={placeholder}
          inputStyle={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            padding: '2px 4px',
            fontSize: '0.82rem',
            color: '#1f2937',
            height: 'auto',
            ...customStyle
          }}
        />
      );
    };

    // Helper to check if a specific option is checked
    const isNbOptionChecked = (fieldKey, optionLabel) => {
      const currentVal = String(getNbRawVal(fieldKey) || '').trim().toLowerCase();
      const targetLabel = optionLabel.trim().toLowerCase();
      if (!currentVal) return false;

      if (currentVal === targetLabel) return true;

      // Marketing Time matching
      if (targetLabel.includes('3 m') || targetLabel.includes('3-6') || targetLabel.includes('over 6')) {
        if (targetLabel.includes('under 3') && (currentVal.includes('under 3') || currentVal.includes('under3') || currentVal.includes('underthree'))) return true;
        if (targetLabel.includes('3-6') && (currentVal.includes('3-6') || currentVal.includes('threetosix'))) return true;
        if (targetLabel.includes('over 6') && (currentVal.includes('over 6') || currentVal.includes('oversix'))) return true;
      }

      // Built-Up matching
      if (targetLabel.includes('75') && currentVal.includes('75')) {
        if (targetLabel.includes('over') && currentVal.includes('over')) return true;
        if (targetLabel.includes('25-75') && currentVal.includes('25-75')) return true;
        if (targetLabel.includes('under') && currentVal.includes('under')) return true;
      }

      // Demand/Supply matching
      if (targetLabel === 'in balance' && (currentVal === 'in balance' || currentVal === 'inbalance')) return true;
      if (targetLabel === 'over supply' && (currentVal === 'over supply' || currentVal === 'oversupply')) return true;
      if (targetLabel === 'shortage' && currentVal === 'shortage') return true;

      // Location matching
      if (targetLabel === 'urban' && currentVal === 'urban') return true;
      if (targetLabel === 'suburban' && currentVal === 'suburban') return true;
      if (targetLabel === 'rural' && currentVal === 'rural') return true;

      // Growth matching
      if (targetLabel === 'rapid' && currentVal === 'rapid') return true;
      if (targetLabel === 'stable' && currentVal === 'stable') return true;
      if (targetLabel === 'slow' && currentVal === 'slow') return true;

      // Property Values matching
      if (targetLabel === 'increasing' && currentVal === 'increasing') return true;
      if (targetLabel === 'stable' && currentVal === 'stable') return true;
      if (targetLabel === 'declining' && currentVal === 'declining') return true;

      return false;
    };

    const handleNbToggleOption = (fieldKey, optionLabel) => {
      if (!isEditable) return;
      const isCurrentlyChecked = isNbOptionChecked(fieldKey, optionLabel);
      const newVal = isCurrentlyChecked ? '' : optionLabel;
      if (onDataChange) {
        onDataChange([fieldKey], newVal);
        onDataChange(['NEIGHBORHOOD', fieldKey], newVal);
      }
    };

    // Helper to render interactive single-choice row with green/red validation highlight
    const renderNbChoiceRow = (fieldKey, label, options, labelWidth = '75px') => {
      const isAnyChecked = options.some(opt => isNbOptionChecked(fieldKey, opt));
      const fieldPath = [fieldKey];
      const isManuallyValidated = manualValidations && (
        manualValidations[JSON.stringify(fieldPath)] ||
        manualValidations[fieldKey]
      );
      const isValid = isAnyChecked;
      const bg = isManuallyValidated ? '#87ceeb' : (isValid ? '#91ff00ff' : '#ff0015ff');
      const textColor = (isValid || isManuallyValidated) ? '#000000' : '#ffffff';
      const borderColor = isManuallyValidated ? '#4682b4' : (isValid ? '#70d600' : '#721c24');
      const tooltipMsg = isManuallyValidated
        ? 'Manually validated'
        : (isValid ? `${label} is validated.` : `'${label}' in Neighborhood section must not be blank. Please select one option.`);

      return (
        <div style={{ display: 'flex', alignItems: 'center', margin: '2px 0' }}>
          <span style={{ fontWeight: 600, width: labelWidth, flexShrink: 0, fontSize: '0.76rem', color: '#212529' }}>
            {label}
          </span>
          <Tooltip title={tooltipMsg} arrow placement="top">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flex: 1,
                backgroundColor: bg,
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '4px',
                padding: '2px 6px',
                minHeight: '25px',
                transition: 'background-color 0.2s ease, border-color 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                {options.map((opt) => {
                  const checked = isNbOptionChecked(fieldKey, opt);
                  return (
                    <div
                      key={opt}
                      onClick={() => handleNbToggleOption(fieldKey, opt)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        cursor: isEditable ? 'pointer' : 'default',
                        userSelect: 'none',
                        fontSize: '0.76rem',
                        lineHeight: 1.2
                      }}
                      title={isEditable ? `Select ${opt}` : opt}
                    >
                      <div
                        style={{
                          width: '13px',
                          height: '13px',
                          border: checked ? '1.5px solid #000' : (isValid ? '1.5px solid #212529' : '1.5px solid #fff'),
                          borderRadius: '2px',
                          backgroundColor: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '4px',
                          fontWeight: 900,
                          fontSize: '10px',
                          color: '#000',
                          lineHeight: 1,
                          flexShrink: 0
                        }}
                      >
                        {checked ? '✕' : ''}
                      </div>
                      <span style={{ color: textColor, fontWeight: checked ? 700 : 500 }}>
                        {opt}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Revision / Manual Validation Icon buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: 'auto' }} onClick={(e) => e.stopPropagation()}>
                {revisionHandlers && revisionHandlers.onAddRevision && (
                  <Tooltip title="Add to Revision">
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        const currentChecked = options.find(opt => isNbOptionChecked(fieldKey, opt)) || '';
                        const text = currentChecked
                          ? `Please review and revise '${label}' (Current Value: "${currentChecked}") in the Neighborhood section.`
                          : `Please provide '${label}' in the Neighborhood section.`;
                        if (navigator.clipboard) navigator.clipboard.writeText(text);
                        if (window.dispatchEvent) {
                          window.dispatchEvent(new CustomEvent('showNotification', { detail: `'${label}' revision text copied to clipboard!` }));
                        }
                      }}
                      size="small"
                      sx={{ padding: '1px', color: textColor }}
                    >
                      <PlaylistAddIcon sx={{ fontSize: '0.95rem' }} />
                    </IconButton>
                  </Tooltip>
                )}
                {handleManualValidation && (
                  <Tooltip title={isManuallyValidated ? "Remove Manual Validation" : "Mark as Validated"}>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleManualValidation(fieldPath);
                      }}
                      size="small"
                      sx={{ padding: '1px', color: isManuallyValidated ? '#155724' : textColor }}
                    >
                      <CheckCircleIcon sx={{ fontSize: '0.95rem' }} />
                    </IconButton>
                  </Tooltip>
                )}
              </div>
            </div>
          </Tooltip>
        </div>
      );
    };

    // Parse housing price: High / Low / Pred
    let rawPrice = String(
      (isCondo ? (nbData['condominium housing price(high,low,pred)'] || nbData['CONDOMINIUM HOUSING PRICE(HIGH,LOW,PRED)']) : '') ||
      nbData['one unit housing price(high,low,pred)'] ||
      nbData['ONE UNIT HOUSING PRICE(HIGH,LOW,PRED)'] ||
      nbData['condominium housing price(high,low,pred)'] ||
      nbData['CONDOMINIUM HOUSING PRICE(HIGH,LOW,PRED)'] ||
      ''
    ).trim();
    let priceHigh = String(nbData['Housing Price High'] ?? nbData['Condominium Housing Price High'] ?? nbData['Price High'] ?? nbData['High Price'] ?? '').trim();
    let priceLow = String(nbData['Housing Price Low'] ?? nbData['Condominium Housing Price Low'] ?? nbData['Price Low'] ?? nbData['Low Price'] ?? '').trim();
    let pricePred = String(nbData['Housing Price Pred'] ?? nbData['Condominium Housing Price Pred'] ?? nbData['Price Pred'] ?? nbData['Pred Price'] ?? nbData['Predominant Price'] ?? '').trim();

    if (rawPrice && (!priceHigh || !priceLow || !pricePred)) {
      const pParts = rawPrice.split(/[/,;]+/).map(s => s.trim().replace(/,/g, '')).filter(Boolean);
      if (pParts.length >= 3) {
        if (!priceHigh) priceHigh = pParts[0];
        if (!priceLow) priceLow = pParts[1];
        if (!pricePred) pricePred = pParts[2];
      }
    }

    // Parse housing age: Oldest (High) / Newest (Low) / Pred
    let rawAge = String(
      (isCondo ? (nbData['condominium housing age(high,low,pred)'] || nbData['CONDOMINIUM HOUSING AGE(HIGH,LOW,PRED)']) : '') ||
      nbData['one unit housing age(high,low,pred)'] ||
      nbData['ONE UNIT HOUSING AGE(HIGH,LOW,PRED)'] ||
      nbData['condominium housing age(high,low,pred)'] ||
      nbData['CONDOMINIUM HOUSING AGE(HIGH,LOW,PRED)'] ||
      ''
    ).trim();
    let ageHigh = String(nbData['Housing Age High'] ?? nbData['Condominium Housing Age High'] ?? nbData['Age High'] ?? nbData['High Age'] ?? '').trim();
    let ageLow = String(nbData['Housing Age Low'] ?? nbData['Condominium Housing Age Low'] ?? nbData['Age Low'] ?? nbData['Low Age'] ?? '').trim();
    let agePred = String(nbData['Housing Age Pred'] ?? nbData['Condominium Housing Age Pred'] ?? nbData['Age Pred'] ?? nbData['Pred Age'] ?? nbData['Predominant Age'] ?? '').trim();

    if (rawAge && (!ageHigh || !ageLow || !agePred)) {
      const aParts = rawAge.split(/[/,;]+/).map(s => s.trim().replace(/,/g, '')).filter(Boolean);
      if (aParts.length >= 3) {
        if (!ageHigh) ageHigh = aParts[0];
        if (!ageLow) ageLow = aParts[1];
        if (!agePred) agePred = aParts[2];
      }
    }

    const updatePrice = (type, val) => {
      if (!isEditable || !onDataChange) return;
      const cleanVal = val.replace(/[^0-9.]/g, '');
      const newHigh = type === 'high' ? cleanVal : priceHigh;
      const newLow = type === 'low' ? cleanVal : priceLow;
      const newPred = type === 'pred' ? cleanVal : pricePred;
      const combined = `${newHigh || '0'} / ${newLow || '0'} / ${newPred || '0'}`;
      onDataChange(['one unit housing price(high,low,pred)'], combined);
      if (isCondo) {
        onDataChange(['condominium housing price(high,low,pred)'], combined);
        if (type === 'high') onDataChange(['Condominium Housing Price High'], cleanVal);
        if (type === 'low') onDataChange(['Condominium Housing Price Low'], cleanVal);
        if (type === 'pred') onDataChange(['Condominium Housing Price Pred'], cleanVal);
      }
      if (type === 'high') onDataChange(['Housing Price High'], cleanVal);
      if (type === 'low') onDataChange(['Housing Price Low'], cleanVal);
      if (type === 'pred') onDataChange(['Housing Price Pred'], cleanVal);
    };

    const updateAge = (type, val) => {
      if (!isEditable || !onDataChange) return;
      const cleanVal = val.replace(/[^0-9.]/g, '');
      const newHigh = type === 'high' ? cleanVal : ageHigh;
      const newLow = type === 'low' ? cleanVal : ageLow;
      const newPred = type === 'pred' ? cleanVal : agePred;
      const combined = `${newHigh || '0'} / ${newLow || '0'} / ${newPred || '0'}`;
      onDataChange(['one unit housing age(high,low,pred)'], combined);
      if (isCondo) {
        onDataChange(['condominium housing age(high,low,pred)'], combined);
        if (type === 'high') onDataChange(['Condominium Housing Age High'], cleanVal);
        if (type === 'low') onDataChange(['Condominium Housing Age Low'], cleanVal);
        if (type === 'pred') onDataChange(['Condominium Housing Age Pred'], cleanVal);
      }
      if (type === 'high') onDataChange(['Housing Age High'], cleanVal);
      if (type === 'low') onDataChange(['Housing Age Low'], cleanVal);
      if (type === 'pred') onDataChange(['Housing Age Pred'], cleanVal);
    };

    // Calculate Land Use Total
    const landUseFields = ["One-Unit", "2-4 Unit", "Multi-Family", "Commercial", "Other"];
    const landUseValues = landUseFields.map(f => {
      const raw = String(nbData[f] || '0').replace('%', '').trim();
      return parseFloat(raw) || 0;
    });
    const landUseTotal = landUseValues.reduce((sum, v) => sum + v, 0);
    const otherValNum = landUseValues[4] || 0;

    return (
      <Paper id={id} elevation={1} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: borderColor }}>
        {/* Card Header */}
        <Box
          sx={{
            p: 1.5,
            bgcolor: 'grey.50',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'grey.200',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Typography variant="h6" component="h5" sx={{ fontSize: '1.05rem', fontWeight: 'bold' }}>
            {title || "Neighborhood Section"}
          </Typography>
          {onRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'text.secondary', ml: 'auto' }}>
                <LibraryBooksIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {loading && loadingSection === id && (
          <Box sx={{ width: '100%' }}><LinearProgress /></Box>
        )}

        <div className="card-body p-2" style={{ backgroundColor: '#fff', fontSize: '0.78rem', overflowX: 'auto' }}>
          {/* Note above table */}
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#212529', marginBottom: '4px', fontStyle: 'italic' }}>
            Note: Race and the racial composition of the neighborhood are not appraisal factors.
          </div>

          {/* Fannie Mae Grid Table */}
          <div style={{ display: 'flex', border: '1.5px solid #212529', borderRadius: '2px', backgroundColor: '#fff', minWidth: '850px' }}>
            {/* Left Vertical Black Banner */}
            <div style={{
              backgroundColor: '#000',
              color: '#fff',
              width: '32px',
              minWidth: '32px',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '0.85rem',
              letterSpacing: '3px',
              padding: '8px 0',
              userSelect: 'none',
              flexShrink: 0
            }}>
              NEIGHBORHOOD
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Top 4 Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1.5fr 1.35fr 1fr', borderBottom: '1.5px solid #212529' }}>
                {/* COLUMN 1: Neighborhood Characteristics */}
                <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #212529' }}>
                  <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.78rem', textAlign: 'center', borderBottom: '1px solid #212529' }}>
                    Neighborhood Characteristics
                  </div>
                  <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'space-around', flex: 1, minHeight: '115px' }}>
                    {renderNbChoiceRow('Location', 'Location', ['Urban', 'Suburban', 'Rural'], '65px')}
                    {renderNbChoiceRow('Built-Up', 'Built-Up', ['Over 75%', '25-75%', 'Under 25%'], '65px')}
                    {renderNbChoiceRow('Growth', 'Growth', ['Rapid', 'Stable', 'Slow'], '65px')}
                  </div>
                </div>

                {/* COLUMN 2: Housing Trends */}
                <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #212529' }}>
                  <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.78rem', textAlign: 'center', borderBottom: '1px solid #212529' }}>
                    {housingTrendsTitle}
                  </div>
                  <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'space-around', flex: 1, minHeight: '115px' }}>
                    {renderNbChoiceRow('Property Values', 'Property Values', ['Increasing', 'Stable', 'Declining'], '92px')}
                    {renderNbChoiceRow('Demand/Supply', 'Demand/Supply', ['Shortage', 'In Balance', 'Over Supply'], '92px')}
                    {renderNbChoiceRow('Marketing Time', 'Marketing Time', ['Under 3 mths', '3-6 mths', 'Over 6 mths'], '92px')}
                  </div>
                </div>

                {/* COLUMN 3: Housing Price & Age */}
                <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #212529' }}>
                  <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.78rem', textAlign: 'center', borderBottom: '1px solid #212529' }}>
                    {housingTitle}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 1fr', backgroundColor: '#f8f9fa', borderBottom: '1px solid #212529', fontSize: '0.7rem', fontWeight: 600, textAlign: 'center', padding: '2px 0' }}>
                    <div>PRICE<br /><span style={{ fontSize: '0.65rem', fontWeight: 400 }}>$ (000)</span></div>
                    <div style={{ borderLeft: '1px solid #dee2e6', borderRight: '1px solid #dee2e6' }}></div>
                    <div>AGE<br /><span style={{ fontSize: '0.65rem', fontWeight: 400 }}>(yrs)</span></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 1fr', flex: 1, minHeight: '90px' }}>
                    {/* Row 1: Low */}
                    <div style={{ borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 4px' }}>
                      <input
                        type="text"
                        value={priceLow}
                        onChange={(e) => updatePrice('low', e.target.value)}
                        disabled={!isEditable}
                        placeholder="Low"
                        style={{ width: '100%', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px', padding: '2px 4px', fontSize: '0.78rem', background: '#fff' }}
                      />
                    </div>
                    <div style={{ borderLeft: '1px solid #dee2e6', borderRight: '1px solid #dee2e6', borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.72rem', backgroundColor: '#f8f9fa' }}>
                      Low
                    </div>
                    <div style={{ borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 4px' }}>
                      <input
                        type="text"
                        value={ageLow}
                        onChange={(e) => updateAge('low', e.target.value)}
                        disabled={!isEditable}
                        placeholder="Low"
                        style={{ width: '100%', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px', padding: '2px 4px', fontSize: '0.78rem', background: '#fff' }}
                      />
                    </div>

                    {/* Row 2: High */}
                    <div style={{ borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 4px' }}>
                      <input
                        type="text"
                        value={priceHigh}
                        onChange={(e) => updatePrice('high', e.target.value)}
                        disabled={!isEditable}
                        placeholder="High"
                        style={{ width: '100%', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px', padding: '2px 4px', fontSize: '0.78rem', background: '#fff' }}
                      />
                    </div>
                    <div style={{ borderLeft: '1px solid #dee2e6', borderRight: '1px solid #dee2e6', borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.72rem', backgroundColor: '#f8f9fa' }}>
                      High
                    </div>
                    <div style={{ borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 4px' }}>
                      <input
                        type="text"
                        value={ageHigh}
                        onChange={(e) => updateAge('high', e.target.value)}
                        disabled={!isEditable}
                        placeholder="High"
                        style={{ width: '100%', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px', padding: '2px 4px', fontSize: '0.78rem', background: '#fff' }}
                      />
                    </div>

                    {/* Row 3: Pred. */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 4px' }}>
                      <input
                        type="text"
                        value={pricePred}
                        onChange={(e) => updatePrice('pred', e.target.value)}
                        disabled={!isEditable}
                        placeholder="Pred."
                        style={{ width: '100%', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px', padding: '2px 4px', fontSize: '0.78rem', background: '#fff' }}
                      />
                    </div>
                    <div style={{ borderLeft: '1px solid #dee2e6', borderRight: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.72rem', backgroundColor: '#f8f9fa' }}>
                      Pred.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 4px' }}>
                      <input
                        type="text"
                        value={agePred}
                        onChange={(e) => updateAge('pred', e.target.value)}
                        disabled={!isEditable}
                        placeholder="Pred."
                        style={{ width: '100%', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px', padding: '2px 4px', fontSize: '0.78rem', background: '#fff' }}
                      />
                    </div>
                  </div>

                  {/* Status row for Housing Price & Age */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 1fr', borderTop: '1px solid #dee2e6', backgroundColor: '#f8f9fa', padding: '2px 4px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <EditableField
                        fieldPath={[isCondo ? 'condominium housing price(high,low,pred)' : 'one unit housing price(high,low,pred)']}
                        value={rawPrice}
                        onDataChange={onDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={false}
                        allData={allData}
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                        revisionHandlers={revisionHandlers}
                        showBlankValidation={true}
                        inputStyle={{ display: 'none' }}
                        valueStyle={{ fontSize: '0.68rem', fontWeight: 600 }}
                      />
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.65rem', color: '#6c757d', fontWeight: 600 }}>Status</div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <EditableField
                        fieldPath={[isCondo ? 'condominium housing age(high,low,pred)' : 'one unit housing age(high,low,pred)']}
                        value={rawAge}
                        onDataChange={onDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={false}
                        allData={allData}
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                        revisionHandlers={revisionHandlers}
                        showBlankValidation={true}
                        inputStyle={{ display: 'none' }}
                        valueStyle={{ fontSize: '0.68rem', fontWeight: 600 }}
                      />
                    </div>
                  </div>
                </div>

                {/* COLUMN 4: Present Land Use % */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.78rem', textAlign: 'center', borderBottom: '1px solid #212529' }}>
                    Present Land Use %
                  </div>
                  <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, justifyContent: 'space-between' }}>
                    {/* One-Unit */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500, fontSize: '0.75rem' }}>One-Unit</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', width: '55px' }}>
                        <input
                          type="text"
                          value={String(nbData['One-Unit'] || '').replace('%', '').trim()}
                          onChange={(e) => onDataChange && onDataChange(['One-Unit'], `${e.target.value.replace(/[^0-9.]/g, '')}%`)}
                          disabled={!isEditable}
                          style={{ width: '38px', textAlign: 'right', border: '1px solid #ced4da', borderRadius: '2px', padding: '1px 3px', fontSize: '0.75rem', background: '#fff' }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#495057' }}>%</span>
                      </div>
                    </div>

                    {/* 2-4 Unit */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500, fontSize: '0.75rem' }}>2-4 Unit</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', width: '55px' }}>
                        <input
                          type="text"
                          value={String(nbData['2-4 Unit'] || '').replace('%', '').trim()}
                          onChange={(e) => onDataChange && onDataChange(['2-4 Unit'], `${e.target.value.replace(/[^0-9.]/g, '')}%`)}
                          disabled={!isEditable}
                          style={{ width: '38px', textAlign: 'right', border: '1px solid #ced4da', borderRadius: '2px', padding: '1px 3px', fontSize: '0.75rem', background: '#fff' }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#495057' }}>%</span>
                      </div>
                    </div>

                    {/* Multi-Family */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500, fontSize: '0.75rem' }}>Multi-Family</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', width: '55px' }}>
                        <input
                          type="text"
                          value={String(nbData['Multi-Family'] || '').replace('%', '').trim()}
                          onChange={(e) => onDataChange && onDataChange(['Multi-Family'], `${e.target.value.replace(/[^0-9.]/g, '')}%`)}
                          disabled={!isEditable}
                          style={{ width: '38px', textAlign: 'right', border: '1px solid #ced4da', borderRadius: '2px', padding: '1px 3px', fontSize: '0.75rem', background: '#fff' }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#495057' }}>%</span>
                      </div>
                    </div>

                    {/* Commercial */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500, fontSize: '0.75rem' }}>Commercial</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', width: '55px' }}>
                        <input
                          type="text"
                          value={String(nbData['Commercial'] || '').replace('%', '').trim()}
                          onChange={(e) => onDataChange && onDataChange(['Commercial'], `${e.target.value.replace(/[^0-9.]/g, '')}%`)}
                          disabled={!isEditable}
                          style={{ width: '38px', textAlign: 'right', border: '1px solid #ced4da', borderRadius: '2px', padding: '1px 3px', fontSize: '0.75rem', background: '#fff' }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#495057' }}>%</span>
                      </div>
                    </div>

                    {/* Other */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500, fontSize: '0.75rem' }}>Other</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', width: '55px' }}>
                        <input
                          type="text"
                          value={String(nbData['Other'] || '').replace('%', '').trim()}
                          onChange={(e) => onDataChange && onDataChange(['Other'], `${e.target.value.replace(/[^0-9.]/g, '')}%`)}
                          disabled={!isEditable}
                          style={{ width: '38px', textAlign: 'right', border: '1px solid #ced4da', borderRadius: '2px', padding: '1px 3px', fontSize: '0.75rem', background: '#fff' }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#495057' }}>%</span>
                      </div>
                    </div>

                    {/* Present Land Use for other (if other > 0) */}
                    {otherValNum > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px', borderTop: '1px dashed #dee2e6', paddingTop: '2px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6c757d' }}>Other Description:</span>
                        {renderNbEditable('Present Land Use for other', 'Describe other land use...', { fontSize: '0.72rem', border: '1px solid #ced4da', borderRadius: '2px', background: '#fff', padding: '1px 4px' })}
                      </div>
                    )}

                    {/* Total Land Use Badge */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px', paddingTop: '2px', borderTop: '1px solid #dee2e6' }}>
                      <span style={{
                        fontWeight: 'bold',
                        fontSize: '0.72rem',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        color: landUseTotal === 100 ? '#155724' : '#721c24',
                        backgroundColor: landUseTotal === 100 ? '#d4edda' : '#f8d7da',
                        border: `1px solid ${landUseTotal === 100 ? '#c3e6cb' : '#f5c6cb'}`
                      }}>
                        Total: {landUseTotal}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Narrative Rows */}
              {/* Row 1: Neighborhood Boundaries */}
              <div style={{ borderBottom: '1px solid #212529', display: 'flex' }}>
                <div style={{
                  width: '160px',
                  minWidth: '160px',
                  backgroundColor: '#e9ecef',
                  padding: '6px 8px',
                  fontWeight: 'bold',
                  fontSize: '0.78rem',
                  borderRight: '1px solid #212529',
                  display: 'flex',
                  alignItems: 'flex-start'
                }}>
                  Neighborhood Boundaries
                </div>
                <div style={{ flex: 1, padding: '4px', backgroundColor: '#fff' }}>
                  {renderNbEditable('Neighborhood Boundaries', 'Enter neighborhood boundaries (North, South, East, West)...', { minHeight: '52px' }, true)}
                </div>
              </div>

              {/* Row 2: Neighborhood Description */}
              <div style={{ borderBottom: '1px solid #212529', display: 'flex' }}>
                <div style={{
                  width: '160px',
                  minWidth: '160px',
                  backgroundColor: '#e9ecef',
                  padding: '6px 8px',
                  fontWeight: 'bold',
                  fontSize: '0.78rem',
                  borderRight: '1px solid #212529',
                  display: 'flex',
                  alignItems: 'flex-start'
                }}>
                  Neighborhood Description
                </div>
                <div style={{ flex: 1, padding: '4px', backgroundColor: '#fff' }}>
                  {renderNbEditable('Neighborhood Description', 'Enter neighborhood description...', { minHeight: '65px' }, true)}
                </div>
              </div>

              {/* Row 3: Market Conditions */}
              <div style={{ display: 'flex' }}>
                <div style={{
                  width: '160px',
                  minWidth: '160px',
                  backgroundColor: '#e9ecef',
                  padding: '6px 8px',
                  fontWeight: 'bold',
                  fontSize: '0.78rem',
                  borderRight: '1px solid #212529',
                  display: 'flex',
                  alignItems: 'flex-start'
                }}>
                  Market Conditions (including support for the above conclusions)
                </div>
                <div style={{ flex: 1, padding: '4px', backgroundColor: '#fff' }}>
                  {renderNbEditable(
                    nbData['Market Conditions'] !== undefined ? 'Market Conditions' : 'Market Conditions:',
                    'Enter market conditions and support for conclusions...',
                    { minHeight: '65px' },
                    true
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Paper>
    );
  }

  // =============================================================
  // PROJECT INFORMATION SECTION - FANNIE MAE 1073 GRID
  // =============================================================
  if (id === 'project-info-section' || title === 'Project Information') {
    const piData = (data && typeof data === 'object' && ('# of Stories' in data || 'Project Description' in data || 'Data source(s) for project information' in data))
      ? data
      : (data?.PROJECT_INFO || data?.['Project Information'] || allData?.PROJECT_INFO || allData?.['Project Information'] || allData?.clean_data?.['Project Information'] || allData || {});

    // Helper to get raw string value
    const getPiRawVal = (key, fallbackKey = null) => {
      let v = piData[key];
      if (v === undefined && fallbackKey) v = piData[fallbackKey];
      if (v === undefined) v = allData?.PROJECT_INFO?.[key] ?? allData?.['Project Information']?.[key] ?? allData?.[key];
      if (v === undefined && fallbackKey) v = allData?.PROJECT_INFO?.[fallbackKey] ?? allData?.['Project Information']?.[fallbackKey] ?? allData?.[fallbackKey];
      return renderValue(v ?? '');
    };

    // Helper to render an EditableField
    const renderPiEditable = (fieldKey, placeholder = '', customStyle = {}, usePre = false, multiline = false, fallbackKey = null) => {
      const valStr = getPiRawVal(fieldKey, fallbackKey);
      return (
        <EditableField
          fieldPath={[fieldKey]}
          value={valStr}
          onDataChange={onDataChange}
          editingField={editingField}
          setEditingField={setEditingField}
          usePre={usePre}
          isEditable={isEditable}
          allData={allData}
          manualValidations={manualValidations}
          handleManualValidation={handleManualValidation}
          revisionHandlers={revisionHandlers}
          showBlankValidation={true}
          inputClassName="form-control form-control-sm field-value-pre"
          placeholder={placeholder}
          inputStyle={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            padding: '2px 4px',
            fontSize: '0.80rem',
            color: '#1f2937',
            height: 'auto',
            ...(multiline ? { minHeight: '44px' } : {}),
            ...customStyle
          }}
        />
      );
    };

    // Helper to render interactive checkbox
    const renderPiCheckbox = (fieldKey, optionLabel, flexStyle = {}) => {
      const currentVal = String(getPiRawVal(fieldKey) || '').trim().toLowerCase();
      const targetLabel = optionLabel.trim().toLowerCase();

      const isChecked = currentVal === targetLabel || (
        targetLabel === 'yes' && (currentVal === 'y' || currentVal === 'true' || currentVal.startsWith('yes'))
      ) || (
        targetLabel === 'no' && (currentVal === 'n' || currentVal === 'false' || currentVal.startsWith('no'))
      ) || (
        targetLabel.includes('row') && (currentVal.includes('townhouse') || currentVal.includes('row'))
      ) || (
        targetLabel.includes('garden') && currentVal.includes('garden')
      ) || (
        targetLabel.includes('detached') && currentVal.includes('detached')
      ) || (
        targetLabel.includes('mid-rise') && currentVal.includes('mid')
      ) || (
        targetLabel.includes('high-rise') && currentVal.includes('high')
      ) || (
        targetLabel.includes('other') && currentVal.includes('other')
      ) || (
        targetLabel.includes('existing') && (currentVal === 'existing' || currentVal.startsWith('exist'))
      ) || (
        targetLabel.includes('proposed') && currentVal.includes('proposed')
      ) || (
        targetLabel.includes('under construction') && currentVal.includes('under const')
      ) || (
        targetLabel.includes('principal') && (currentVal.includes('principle') || currentVal.includes('primary') || currentVal.includes('principal'))
      ) || (
        targetLabel.includes('second home') && (currentVal.includes('second') || currentVal.includes('recreational'))
      ) || (
        targetLabel === 'tenant' && currentVal.includes('tenant')
      ) || (
        targetLabel.includes("homeowners") && (currentVal.includes("homeowner") || currentVal.startsWith("hoa"))
      ) || (
        targetLabel.includes("developer") && currentVal.includes("developer") && !currentVal.includes("control")
      ) || (
        targetLabel.includes("management agent") && (currentVal.includes("agent") || currentVal.includes("management agent") || (!currentVal.includes("homeowner") && !currentVal.includes("developer") && currentVal.length > 0))
      );

      const handleToggle = () => {
        if (!isEditable) return;
        const newVal = isChecked ? '' : optionLabel;
        if (onDataChange) {
          onDataChange([fieldKey], newVal);
        }
      };

      return (
        <div
          onClick={handleToggle}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            cursor: isEditable ? 'pointer' : 'default',
            userSelect: 'none',
            fontSize: '0.78rem',
            marginRight: '10px',
            lineHeight: 1.2,
            ...flexStyle
          }}
          title={isEditable ? `Toggle ${optionLabel}` : optionLabel}
        >
          <div
            style={{
              width: '14px',
              height: '14px',
              border: '1.5px solid #212529',
              borderRadius: '2px',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '5px',
              fontWeight: '900',
              fontSize: '11px',
              color: '#000',
              lineHeight: 1,
              flexShrink: 0
            }}
          >
            {isChecked ? '✕' : ''}
          </div>
          <span style={{ color: '#212529', fontWeight: isChecked ? 600 : 400 }}>{optionLabel}</span>
        </div>
      );
    };

    return (
      <Paper id={id} elevation={1} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: borderColor }}>
        {/* Card Header */}
        <Box
          sx={{
            p: 1.5,
            bgcolor: 'grey.50',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'grey.200',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Typography variant="h6" component="h5" sx={{ fontSize: '1.05rem', fontWeight: 'bold' }}>
            {title || "Project Information"}
          </Typography>
          {onRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'text.secondary', ml: 'auto' }}>
                <LibraryBooksIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {loading && loadingSection === id && (
          <Box sx={{ width: '100%' }}><LinearProgress /></Box>
        )}

        <div className="card-body p-2" style={{ backgroundColor: '#fff', fontSize: '0.78rem', overflowX: 'auto' }}>
          {/* Fannie Mae Grid Table */}
          <div style={{ display: 'flex', border: '1.5px solid #212529', borderRadius: '2px', backgroundColor: '#fff', minWidth: '920px' }}>
            {/* Left Vertical Black Banner */}
            <div style={{
              backgroundColor: '#000',
              color: '#fff',
              width: '32px',
              minWidth: '32px',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '0.85rem',
              letterSpacing: '3px',
              padding: '8px 0',
              userSelect: 'none',
              flexShrink: 0
            }}>
              PROJECT INFORMATION
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Row 1: Data source(s) */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #212529' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '10px', whiteSpace: 'nowrap' }}>
                  Data source(s) for project information
                </span>
                <div style={{ flex: 1 }}>
                  {renderPiEditable("Data source(s) for project information", "Enter data source(s)")}
                </div>
              </div>

              {/* Row 2: Project Description */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1.5px solid #212529', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '16px' }}>Project Description</span>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', flex: 1 }}>
                  {renderPiCheckbox('Project Description', 'Detached')}
                  {renderPiCheckbox('Project Description', 'Row or Townhouse')}
                  {renderPiCheckbox('Project Description', 'Garden')}
                  {renderPiCheckbox('Project Description', 'Mid-Rise')}
                  {renderPiCheckbox('Project Description', 'High-Rise')}
                  {renderPiCheckbox('Project Description', 'Other (describe)')}
                  {String(getPiRawVal('Project Description') || '').toLowerCase().includes('other') && (
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      {renderPiEditable('Project Description Other', 'Describe other')}
                    </div>
                  )}
                </div>
              </div>

              {/* 5-Column Table Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.35fr 1fr 1.15fr 1.3fr', borderBottom: '1.5px solid #212529' }}>
                {/* COLUMN 1: General Description (Building details) */}
                <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #212529' }}>
                  <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.76rem', textAlign: 'center', borderBottom: '1px solid #212529' }}>
                    General Description
                  </div>
                  {/* Row 1: # of Stories */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Stories</span>
                    <div style={{ flex: 1, minWidth: '40px' }}>
                      {renderPiEditable('# of Stories')}
                    </div>
                  </div>
                  {/* Row 2: # of Elevators */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Elevators</span>
                    <div style={{ flex: 1, minWidth: '40px' }}>
                      {renderPiEditable('# of Elevators')}
                    </div>
                  </div>
                  {/* Row 3: Existing / Proposed / Under Construction */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', padding: '3px 6px', borderBottom: '1px solid #212529', minHeight: '44px', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {renderPiCheckbox('Existing/Proposed/Under Const.', 'Existing')}
                      {renderPiCheckbox('Existing/Proposed/Under Const.', 'Proposed')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {renderPiCheckbox('Existing/Proposed/Under Const.', 'Under Construction')}
                    </div>
                  </div>
                  {/* Row 4: Year Built */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}>Year Built</span>
                    <div style={{ flex: 1, minWidth: '40px' }}>
                      {renderPiEditable('Year Built')}
                    </div>
                  </div>
                  {/* Row 5: Effective Age */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}>Effective Age</span>
                    <div style={{ flex: 1, minWidth: '40px' }}>
                      {renderPiEditable('Effective Age')}
                    </div>
                  </div>
                  {/* Row 6: Spacer */}
                  <div style={{ minHeight: '26px', backgroundColor: '#fcfcfc', flex: 1 }} />
                </div>

                {/* COLUMN 2: General Description (Materials & Parking) */}
                <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #212529' }}>
                  <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.76rem', textAlign: 'center', borderBottom: '1px solid #212529' }}>
                    General Description
                  </div>
                  {/* Row 1: Exterior Walls */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}>Exterior Walls</span>
                    <div style={{ flex: 1, minWidth: '50px' }}>
                      {renderPiEditable('Exterior Walls')}
                    </div>
                  </div>
                  {/* Row 2: Roof Surface */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}>Roof Surface</span>
                    <div style={{ flex: 1, minWidth: '50px' }}>
                      {renderPiEditable('Roof Surface')}
                    </div>
                  </div>
                  {/* Row 3: Total # Parking */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '44px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}>Total # Parking</span>
                    <div style={{ flex: 1, minWidth: '40px' }}>
                      {renderPiEditable('Total # Parking')}
                    </div>
                  </div>
                  {/* Row 4: Ratio (spaces/units) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}>Ratio (spaces/units)</span>
                    <div style={{ flex: 1, minWidth: '40px' }}>
                      {renderPiEditable('Ratio (spaces/units)')}
                    </div>
                  </div>
                  {/* Row 5: Type */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}>Type</span>
                    <div style={{ flex: 1, minWidth: '40px' }}>
                      {renderPiEditable('Type')}
                    </div>
                  </div>
                  {/* Row 6: Guest Parking */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', minHeight: '26px', flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}>Guest Parking</span>
                    <div style={{ flex: 1, minWidth: '40px' }}>
                      {renderPiEditable('Guest Parking')}
                    </div>
                  </div>
                </div>

                {/* COLUMN 3: Subject Phase */}
                <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #212529' }}>
                  <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.76rem', textAlign: 'center', borderBottom: '1px solid #212529' }}>
                    Subject Phase
                  </div>
                  {/* Row 1: # of Units */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Units</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Units')}
                    </div>
                  </div>
                  {/* Row 2: # of Units Completed */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Units Completed</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Units Completed')}
                    </div>
                  </div>
                  {/* Row 3: # of Units For Sale */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '44px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Units For Sale</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Units For Sale')}
                    </div>
                  </div>
                  {/* Row 4: # of Units Sold */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Units Sold</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Units Sold')}
                    </div>
                  </div>
                  {/* Row 5: # of Units Rented */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Units Rented</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Units Rented')}
                    </div>
                  </div>
                  {/* Row 6: # of Owner Occupied Units */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', minHeight: '26px', flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Owner Occupied Units</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Owner Occupied Units')}
                    </div>
                  </div>
                </div>

                {/* COLUMN 4: If Project Completed */}
                <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #212529' }}>
                  <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.76rem', textAlign: 'center', borderBottom: '1px solid #212529' }}>
                    If Project Completed
                  </div>
                  {/* Row 1: # of Phases */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Phases</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Phases')}
                    </div>
                  </div>
                  {/* Row 2: # of Units */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Units</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Units (Project Completed)', '', {}, false, false, '# of Units')}
                    </div>
                  </div>
                  {/* Row 3: # of Units for Sale */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '44px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Units for Sale</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Units for Sale')}
                    </div>
                  </div>
                  {/* Row 4: # of Units Sold */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Units Sold</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Units Sold')}
                    </div>
                  </div>
                  {/* Row 5: # of Units Rented */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Units Rented</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Units Rented')}
                    </div>
                  </div>
                  {/* Row 6: # of Owner Occupied Units */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', minHeight: '26px', flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Owner Occupied Units</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Owner Occupied Units')}
                    </div>
                  </div>
                </div>

                {/* COLUMN 5: If Project Incomplete */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.76rem', textAlign: 'center', borderBottom: '1px solid #212529' }}>
                    If Project Incomplete
                  </div>
                  {/* Row 1: # of Planned Phases */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Planned Phases</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Planned Phases')}
                    </div>
                  </div>
                  {/* Row 2: # of Planned Units */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Planned Units</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Planned Units')}
                    </div>
                  </div>
                  {/* Row 3: # of Planned Units For Sale */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '44px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Planned Units for Sale</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Planned Units for Sale')}
                    </div>
                  </div>
                  {/* Row 4: # of Planned Units Sold */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Planned Units Sold</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Planned Units Sold')}
                    </div>
                  </div>
                  {/* Row 5: # of Planned Units Rented */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Planned Units Rented</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Planned Units Rented')}
                    </div>
                  </div>
                  {/* Row 6: # of Planned Owner Occupied Units */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', minHeight: '26px', flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Planned Owner Occupied Units</span>
                    <div style={{ flex: 1, minWidth: '35px' }}>
                      {renderPiEditable('# of Planned Owner Occupied Units')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Below-Table Questions */}
              {/* Question 1: Project Primary Occupancy */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #212529', flexWrap: 'wrap', minHeight: '28px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '16px' }}>Project Primary Occupancy</span>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  {renderPiCheckbox('Project Primary Occupancy', 'Principal Residence')}
                  {renderPiCheckbox('Project Primary Occupancy', 'Second Home or Recreational')}
                  {renderPiCheckbox('Project Primary Occupancy', 'Tenant')}
                </div>
              </div>

              {/* Question 2: Developer Control */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #212529', flexWrap: 'wrap', minHeight: '28px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '16px' }}>
                  Is the developer/builder in control of the Homeowners' Association (HOA)?
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {renderPiCheckbox("Is the developer/builder in control of the Homeowners' Association (HOA)?", 'Yes')}
                  {renderPiCheckbox("Is the developer/builder in control of the Homeowners' Association (HOA)?", 'No')}
                </div>
              </div>

              {/* Question 3: Management Group */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #212529', flexWrap: 'wrap', minHeight: '28px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '12px' }}>Management Group -</span>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', flex: 1 }}>
                  {renderPiCheckbox('Management Group', "Homeowners' Association")}
                  {renderPiCheckbox('Management Group', 'Developer')}
                  {renderPiCheckbox('Management Group', 'Management Agent - Provide name of management company.')}
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    {renderPiEditable('Management Group', 'Provide name of management company / contact info')}
                  </div>
                </div>
              </div>

              {/* Question 4: 10% Ownership */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #212529', flexWrap: 'wrap', minHeight: '28px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '12px', flexShrink: 0 }}>
                  Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project?
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
                  {renderPiCheckbox("Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project?", 'Yes')}
                  {renderPiCheckbox("Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project?", 'No')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.74rem', marginRight: '6px', whiteSpace: 'nowrap' }}>If Yes, Describe</span>
                  <div style={{ flex: 1 }}>
                    {renderPiEditable(
                      "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project? If Yes, describe",
                      "Describe 10% ownership"
                    )}
                  </div>
                </div>
              </div>

              {/* Question 5: Conversion */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #212529', flexWrap: 'wrap', minHeight: '28px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '12px', flexShrink: 0 }}>
                  Was the project created by the conversion of existing building(s) into a condominium?
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
                  {renderPiCheckbox("Was the project created by the conversion of existing building(s) into a condominium?", 'Yes')}
                  {renderPiCheckbox("Was the project created by the conversion of existing building(s) into a condominium?", 'No')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.74rem', marginRight: '6px', whiteSpace: 'nowrap' }}>If Yes, describe the original use and date of conversion</span>
                  <div style={{ flex: 1 }}>
                    {renderPiEditable(
                      "Was the project created by the conversion of existing building(s) into a condominium? If Yes,describe the original use and date of conversion",
                      "Describe original use & date"
                    )}
                  </div>
                </div>
              </div>

              {/* Question 6: Facilities complete */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #212529', flexWrap: 'wrap', minHeight: '28px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '12px', flexShrink: 0 }}>
                  Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)?
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
                  {renderPiCheckbox("Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)?", 'Yes')}
                  {renderPiCheckbox("Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)?", 'No')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.74rem', marginRight: '6px', whiteSpace: 'nowrap' }}>If No, describe</span>
                  <div style={{ flex: 1 }}>
                    {renderPiEditable("If No, describe", "Describe incomplete facilities")}
                  </div>
                </div>
              </div>

              {/* Question 7: Commercial space */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #212529', flexWrap: 'wrap', minHeight: '28px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '12px', flexShrink: 0 }}>
                  Is there any commercial space in the project?
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
                  {renderPiCheckbox("Is there any commercial space in the project?", 'Yes')}
                  {renderPiCheckbox("Is there any commercial space in the project?", 'No')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.74rem', marginRight: '6px', whiteSpace: 'nowrap' }}>If Yes, describe and indicate the overall percentage of the commercial space.</span>
                  <div style={{ flex: 1 }}>
                    {renderPiEditable("If Yes, describe and indicate the overall percentage of the commercial space.", "Describe commercial space & %")}
                  </div>
                </div>
              </div>

              {/* Question 8: Condition and quality narrative */}
              <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 8px', borderBottom: '1px solid #212529' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginBottom: '2px' }}>
                  Describe the condition of the project and quality of construction.
                </span>
                {renderPiEditable("Describe the condition of the project and quality of construction.", "Describe condition & quality...", {}, true, true)}
              </div>

              {/* Question 9: Common elements narrative */}
              <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 8px', borderBottom: '1px solid #212529' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginBottom: '2px' }}>
                  Describe the common elements and recreational facilities.
                </span>
                {renderPiEditable("Describe the common elements and recreational facilities.", "Describe common elements & amenities...", {}, true, true)}
              </div>

              {/* Question 10: Leased common elements */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #212529', flexWrap: 'wrap', minHeight: '28px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '12px', flexShrink: 0 }}>
                  Are any common elements leased to or by the Homeowners' Association?
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
                  {renderPiCheckbox("Are any common elements leased to or by the Homeowners' Association?", 'Yes')}
                  {renderPiCheckbox("Are any common elements leased to or by the Homeowners' Association?", 'No')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.74rem', marginRight: '6px', whiteSpace: 'nowrap' }}>If Yes, describe the rental terms and options.</span>
                  <div style={{ flex: 1 }}>
                    {renderPiEditable("If Yes, describe the rental terms and options.", "Describe rental terms & options")}
                  </div>
                </div>
              </div>

              {/* Question 11: Ground rent */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #212529', flexWrap: 'wrap', minHeight: '28px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '12px', flexShrink: 0 }}>
                  Is the project subject to a ground rent?
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
                  {renderPiCheckbox("Is the project subject to a ground rent?", 'Yes')}
                  {renderPiCheckbox("Is the project subject to a ground rent?", 'No')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.74rem', marginRight: '6px', whiteSpace: 'nowrap' }}>If Yes, $ per year (describe terms and conditions)</span>
                  <div style={{ flex: 1 }}>
                    {renderPiEditable("If Yes, $ per year (describe terms and conditions)", "Enter $ per year and terms")}
                  </div>
                </div>
              </div>

              {/* Question 12: Adequate parking */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', flexWrap: 'wrap', minHeight: '28px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '12px', flexShrink: 0 }}>
                  Are the parking facilities adequate for the project size and type?
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
                  {renderPiCheckbox("Are the parking facilities adequate for the project size and type?", 'Yes')}
                  {renderPiCheckbox("Are the parking facilities adequate for the project size and type?", 'No')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.74rem', marginRight: '6px', whiteSpace: 'nowrap' }}>If No, describe and comment on the effect on value and marketability.</span>
                  <div style={{ flex: 1 }}>
                    {renderPiEditable("If No, describe and comment on the effect on value and marketability.", "Describe effect on value & marketability")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Paper>
    );
  }

  // =============================================================
  // UNIT DESCRIPTIONS SECTION - FANNIE MAE 1073 GRID
  // =============================================================
  if (id === 'unit-descriptions-section' || title === 'Unit Descriptions') {
    const udData = (data && typeof data === 'object' && ('Floor #' in data || 'Unit Charge$' in data || 'Floors' in data))
      ? data
      : (data?.UNIT_DESCRIPTIONS || data?.['Unit Descriptions'] || allData?.UNIT_DESCRIPTIONS || allData?.['Unit Descriptions'] || allData?.clean_data?.['Unit Descriptions'] || allData || {});

    // Helper to get raw string value
    const getUdRawVal = (key, fallbackKey = null) => {
      let v = udData[key];
      if (v === undefined && fallbackKey) v = udData[fallbackKey];
      if (v === undefined) v = allData?.UNIT_DESCRIPTIONS?.[key] ?? allData?.['Unit Descriptions']?.[key] ?? allData?.[key];
      if (v === undefined && fallbackKey) v = allData?.UNIT_DESCRIPTIONS?.[fallbackKey] ?? allData?.['Unit Descriptions']?.[fallbackKey] ?? allData?.[fallbackKey];
      return renderValue(v ?? '');
    };

    // Helper to render an EditableField
    const renderUdEditable = (fieldKey, placeholder = '', customStyle = {}, usePre = false, multiline = false) => {
      const valStr = getUdRawVal(fieldKey);
      return (
        <EditableField
          fieldPath={[fieldKey]}
          value={valStr}
          onDataChange={onDataChange}
          editingField={editingField}
          setEditingField={setEditingField}
          usePre={usePre}
          isEditable={isEditable}
          allData={allData}
          manualValidations={manualValidations}
          handleManualValidation={handleManualValidation}
          revisionHandlers={revisionHandlers}
          showBlankValidation={true}
          inputClassName="form-control form-control-sm field-value-pre"
          placeholder={placeholder}
          inputStyle={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            padding: '2px 4px',
            fontSize: '0.80rem',
            color: '#1f2937',
            height: 'auto',
            ...(multiline ? { minHeight: '44px' } : {}),
            ...customStyle
          }}
        />
      );
    };

    // Helper to render interactive checkbox
    const renderUdCheckbox = (fieldKey, optionLabel, flexStyle = {}) => {
      const currentVal = String(getUdRawVal(fieldKey) || '').trim().toLowerCase();
      const targetLabel = optionLabel.trim().toLowerCase();

      const isChecked = currentVal === targetLabel || (
        targetLabel === 'yes' && (currentVal === 'y' || currentVal === 'true' || currentVal.startsWith('yes'))
      ) || (
        targetLabel === 'no' && (currentVal === 'n' || currentVal === 'false' || currentVal.startsWith('no'))
      ) || (
        targetLabel === 'none' && currentVal === 'none'
      ) || (
        targetLabel === 'garage' && currentVal.includes('garage')
      ) || (
        targetLabel === 'covered' && currentVal.includes('covered')
      ) || (
        targetLabel === 'open' && currentVal.includes('open')
      ) || (
        targetLabel === 'assigned' && currentVal.includes('assigned')
      ) || (
        targetLabel === 'owned' && currentVal.includes('owned')
      ) || (
        targetLabel === 'central ac' && (currentVal.includes('central') || currentVal.includes('central ac'))
      ) || (
        targetLabel === 'individual ac' && (currentVal.includes('individual') || currentVal.includes('indiv'))
      ) || (
        targetLabel.startsWith('other') && currentVal.includes('other')
      );

      const handleToggle = () => {
        if (!isEditable) return;
        let newVal = '';
        if (fieldKey === 'None/Garage/Covered/Open') {
          let items = currentVal ? currentVal.split(',').map(s => s.trim()).filter(Boolean) : [];
          if (targetLabel === 'none') {
            newVal = isChecked ? '' : 'None';
          } else {
            items = items.filter(s => s.toLowerCase() !== 'none');
            if (isChecked) {
              items = items.filter(s => !s.toLowerCase().includes(targetLabel));
            } else {
              items.push(optionLabel);
            }
            newVal = items.join(', ');
          }
        } else {
          newVal = isChecked ? '' : optionLabel;
        }

        if (onDataChange) {
          onDataChange([fieldKey], newVal);
        }
      };

      return (
        <div
          onClick={handleToggle}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            cursor: isEditable ? 'pointer' : 'default',
            userSelect: 'none',
            fontSize: '0.78rem',
            marginRight: '8px',
            lineHeight: 1.2,
            ...flexStyle
          }}
          title={isEditable ? `Toggle ${optionLabel}` : optionLabel}
        >
          <div
            style={{
              width: '13px',
              height: '13px',
              border: '1.5px solid #212529',
              borderRadius: '2px',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '4px',
              fontWeight: '900',
              fontSize: '10px',
              color: '#000',
              lineHeight: 1,
              flexShrink: 0
            }}
          >
            {isChecked ? '✕' : ''}
          </div>
          <span style={{ color: '#212529', fontWeight: isChecked ? 600 : 400 }}>{optionLabel}</span>
        </div>
      );
    };

    // Helper for Utilities included checkboxes
    const renderUtilCheckbox = (optionLabel) => {
      const utilKey = "Utilities included in the unit monthly assessment [None/Heat/Air/Conditioning/Electricity/Gas/Water/Sewer/Cable/Other (describe)]";
      const currentVal = String(getUdRawVal(utilKey) || '').trim().toLowerCase();
      const targetLabel = optionLabel.trim().toLowerCase();

      const isChecked = currentVal === targetLabel || currentVal.includes(targetLabel) || (
        targetLabel === 'air conditioning' && (currentVal.includes('air') || currentVal.includes('ac'))
      );

      const handleToggle = () => {
        if (!isEditable) return;
        let items = currentVal ? currentVal.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (targetLabel === 'none') {
          items = isChecked ? [] : ['None'];
        } else {
          items = items.filter(s => s.toLowerCase() !== 'none');
          if (isChecked) {
            items = items.filter(s => !s.toLowerCase().includes(targetLabel));
          } else {
            items.push(optionLabel);
          }
        }
        if (onDataChange) {
          onDataChange([utilKey], items.join(', '));
        }
      };

      return (
        <div
          onClick={handleToggle}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            cursor: isEditable ? 'pointer' : 'default',
            userSelect: 'none',
            fontSize: '0.75rem',
            marginRight: '8px',
            lineHeight: 1.2
          }}
          title={isEditable ? `Toggle ${optionLabel}` : optionLabel}
        >
          <div
            style={{
              width: '13px',
              height: '13px',
              border: '1.5px solid #212529',
              borderRadius: '2px',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '4px',
              fontWeight: '900',
              fontSize: '10px',
              color: '#000',
              lineHeight: 1,
              flexShrink: 0
            }}
          >
            {isChecked ? '✕' : ''}
          </div>
          <span style={{ color: '#212529', fontWeight: isChecked ? 600 : 400 }}>{optionLabel}</span>
        </div>
      );
    };

    // Helper for Appliances checkboxes
    const renderApplianceItem = (label, keyword) => {
      const appKey = "Refrigerator/Range/Oven/Disp Microwave/Dishwasher/Washer/Dryer";
      const fullVal = String(getUdRawVal(appKey) || '');
      const isChecked = fullVal.toLowerCase().includes(keyword.toLowerCase());

      const handleToggle = () => {
        if (!isEditable) return;
        let items = fullVal ? fullVal.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (isChecked) {
          items = items.filter(s => !s.toLowerCase().includes(keyword.toLowerCase()));
        } else {
          items.push(label);
        }
        if (onDataChange) {
          onDataChange([appKey], items.join(', '));
        }
      };

      return (
        <div
          onClick={handleToggle}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            cursor: isEditable ? 'pointer' : 'default',
            userSelect: 'none',
            fontSize: '0.73rem',
            lineHeight: 1.2
          }}
          title={isEditable ? `Toggle ${label}` : label}
        >
          <div
            style={{
              width: '13px',
              height: '13px',
              border: '1.5px solid #212529',
              borderRadius: '2px',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '4px',
              fontWeight: '900',
              fontSize: '10px',
              color: '#000',
              lineHeight: 1,
              flexShrink: 0
            }}
          >
            {isChecked ? '✕' : ''}
          </div>
          <span style={{ color: '#212529', fontWeight: isChecked ? 600 : 400 }}>{label}</span>
        </div>
      );
    };

    // Helper for Amenities rows
    const renderAmenityRow = (label, keyword, defaultDesc = '') => {
      const amKey = "Fireplace(s) #/Woodstove(s) #/Deck/Patio/Porch/Balcony/Other";
      const fullVal = String(getUdRawVal(amKey) || '');
      const isChecked = fullVal.toLowerCase().includes(keyword.toLowerCase());

      const handleToggle = () => {
        if (!isEditable) return;
        let items = fullVal ? fullVal.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (isChecked) {
          items = items.filter(s => !s.toLowerCase().includes(keyword.toLowerCase()));
        } else {
          items.push(defaultDesc ? `${label} ${defaultDesc}` : label);
        }
        if (onDataChange) {
          onDataChange([amKey], items.join(', '));
        }
      };

      // Extract specific detail if present
      let matchDesc = '';
      if (isChecked) {
        const item = fullVal.split(',').map(s => s.trim()).find(s => s.toLowerCase().includes(keyword.toLowerCase()));
        if (item) {
          matchDesc = item.replace(new RegExp(`^${label}\\s*`, 'i'), '').trim();
        }
      }

      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
          <div
            onClick={handleToggle}
            style={{ display: 'inline-flex', alignItems: 'center', cursor: isEditable ? 'pointer' : 'default', userSelect: 'none' }}
            title={isEditable ? `Toggle ${label}` : label}
          >
            <div style={{ width: '13px', height: '13px', border: '1.5px solid #212529', borderRadius: '2px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px', fontWeight: '900', fontSize: '10px' }}>
              {isChecked ? '✕' : ''}
            </div>
            <span style={{ fontSize: '0.73rem', fontWeight: isChecked ? 600 : 400 }}>{label}</span>
          </div>
          {matchDesc && (
            <span style={{ fontSize: '0.70rem', color: '#4b5563', fontStyle: 'italic', marginLeft: '4px' }}>{matchDesc}</span>
          )}
        </div>
      );
    };

    return (
      <Paper id={id} elevation={1} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: borderColor }}>
        {/* Card Header */}
        <Box
          sx={{
            p: 1.5,
            bgcolor: 'grey.50',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'grey.200',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Typography variant="h6" component="h5" sx={{ fontSize: '1.05rem', fontWeight: 'bold' }}>
            {title || "Unit Descriptions"}
          </Typography>
          {onRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'text.secondary', ml: 'auto' }}>
                <LibraryBooksIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {loading && loadingSection === id && (
          <Box sx={{ width: '100%' }}><LinearProgress /></Box>
        )}

        <div className="card-body p-2" style={{ backgroundColor: '#fff', fontSize: '0.78rem', overflowX: 'auto' }}>
          {/* Fannie Mae Grid Table */}
          <div style={{ display: 'flex', border: '1.5px solid #212529', borderRadius: '2px', backgroundColor: '#fff', minWidth: '920px' }}>
            {/* Left Vertical Black Banner */}
            <div style={{
              backgroundColor: '#000',
              color: '#fff',
              width: '32px',
              minWidth: '32px',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '0.85rem',
              letterSpacing: '3px',
              padding: '8px 0',
              userSelect: 'none',
              flexShrink: 0
            }}>
              UNIT DESCRIPTIONS
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Row 1: Unit Assessment Charges */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #212529', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem' }}>Unit Charge $</span>
                <div style={{ width: '70px' }}>
                  {renderUdEditable('Unit Charge$', '0')}
                </div>
                <span style={{ fontSize: '0.74rem', whiteSpace: 'nowrap' }}>per month X 12 = $</span>
                <div style={{ width: '85px' }}>
                  {renderUdEditable('per month X 12 = $', '0')}
                </div>
                <span style={{ fontSize: '0.74rem', marginRight: '16px' }}>per year</span>

                <span style={{ fontWeight: 600, fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                  Annual assessment charge per year per square feet of gross living area = $
                </span>
                <div style={{ width: '75px' }}>
                  {renderUdEditable('Annual assessment charge per year per square feet of gross living area = $', '0.00')}
                </div>
              </div>

              {/* Row 2: Utilities Included in Assessment */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1.5px solid #212529', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '12px' }}>
                  Utilities included in the unit monthly assessment:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', flex: 1 }}>
                  {renderUtilCheckbox('None')}
                  {renderUtilCheckbox('Heat')}
                  {renderUtilCheckbox('Air Conditioning')}
                  {renderUtilCheckbox('Electricity')}
                  {renderUtilCheckbox('Gas')}
                  {renderUtilCheckbox('Water')}
                  {renderUtilCheckbox('Sewer')}
                  {renderUtilCheckbox('Cable')}
                  {renderUtilCheckbox('Other')}
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    {renderUdEditable(
                      "Utilities included in the unit monthly assessment [None/Heat/Air/Conditioning/Electricity/Gas/Water/Sewer/Cable/Other (describe)]",
                      "Describe utilities / other maintenance included"
                    )}
                  </div>
                </div>
              </div>

              {/* 5-Column Table Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1.2fr 1.1fr 1.25fr 1.15fr', borderBottom: '1.5px solid #212529' }}>
                {/* COLUMN 1: General Description */}
                <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #212529' }}>
                  <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.76rem', textAlign: 'center', borderBottom: '1px solid #212529' }}>
                    General Description
                  </div>
                  {/* Row 1: Floor # */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}>Floor #</span>
                    <div style={{ flex: 1, minWidth: '40px' }}>
                      {renderUdEditable('Floor #')}
                    </div>
                  </div>
                  {/* Row 2: # of Levels */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Levels</span>
                    <div style={{ flex: 1, minWidth: '40px' }}>
                      {renderUdEditable('# of Levels')}
                    </div>
                  </div>
                  {/* Row 3: Heating Type / Fuel */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.73rem', whiteSpace: 'nowrap', marginRight: '4px' }}>Heating Type / Fuel</span>
                    <div style={{ flex: 1, minWidth: '50px' }}>
                      {renderUdEditable('Heating Type/Fuel', 'Type / Fuel')}
                    </div>
                  </div>
                  {/* Row 4: Central AC / Individual AC */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    {renderUdCheckbox('Central AC/Individual AC/Other (describe)', 'Central AC')}
                    {renderUdCheckbox('Central AC/Individual AC/Other (describe)', 'Individual AC')}
                  </div>
                  {/* Row 5: Other (describe) */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', minHeight: '26px', flex: 1 }}>
                    {renderUdCheckbox('Central AC/Individual AC/Other (describe)', 'Other (describe)')}
                    {String(getUdRawVal('Central AC/Individual AC/Other (describe)') || '').toLowerCase().includes('other') && (
                      <div style={{ flex: 1, minWidth: '60px' }}>
                        {renderUdEditable('Central AC/Individual AC/Other (describe)', 'Describe AC')}
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUMN 2: Interior materials/condition */}
                <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #212529' }}>
                  <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.76rem', textAlign: 'center', borderBottom: '1px solid #212529' }}>
                    Interior &nbsp;&nbsp;&nbsp;&nbsp; materials/condition
                  </div>
                  {/* Row 1: Floors */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}>Floors</span>
                    <div style={{ flex: 1, minWidth: '50px' }}>
                      {renderUdEditable('Floors')}
                    </div>
                  </div>
                  {/* Row 2: Walls */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}>Walls</span>
                    <div style={{ flex: 1, minWidth: '50px' }}>
                      {renderUdEditable('Walls')}
                    </div>
                  </div>
                  {/* Row 3: Trim/Finish */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}>Trim/Finish</span>
                    <div style={{ flex: 1, minWidth: '50px' }}>
                      {renderUdEditable('Trim/Finish')}
                    </div>
                  </div>
                  {/* Row 4: Bath Wainscot */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}>Bath Wainscot</span>
                    <div style={{ flex: 1, minWidth: '50px' }}>
                      {renderUdEditable('Bath Wainscot')}
                    </div>
                  </div>
                  {/* Row 5: Doors */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', minHeight: '26px', flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}>Doors</span>
                    <div style={{ flex: 1, minWidth: '50px' }}>
                      {renderUdEditable('Doors')}
                    </div>
                  </div>
                </div>

                {/* COLUMN 3: Amenities */}
                <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #212529' }}>
                  <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.76rem', textAlign: 'center', borderBottom: '1px solid #212529' }}>
                    Amenities
                  </div>
                  {/* Row 1: Fireplace(s) # */}
                  {renderAmenityRow('Fireplace(s) #', 'fireplace', '# 0')}
                  {/* Row 2: WoodStove(s) # */}
                  {renderAmenityRow('WoodStove(s) #', 'woodstove', '# 0')}
                  {/* Row 3: Deck/Patio */}
                  {renderAmenityRow('Deck/Patio', 'deck')}
                  {/* Row 4: Porch/Balcony */}
                  {renderAmenityRow('Porch/Balcony', 'porch')}
                  {/* Row 5: Other */}
                  <div style={{ flex: 1 }}>
                    {renderAmenityRow('Other', 'other')}
                  </div>
                </div>

                {/* COLUMN 4: Appliances */}
                <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #212529' }}>
                  <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.76rem', textAlign: 'center', borderBottom: '1px solid #212529' }}>
                    Appliances
                  </div>
                  {/* Row 1: Refrigerator */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    {renderApplianceItem('Refrigerator', 'refrigerator')}
                  </div>
                  {/* Row 2: Range/Oven */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    {renderApplianceItem('Range/Oven', 'range')}
                  </div>
                  {/* Row 3: Disp & Microwave */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    {renderApplianceItem('Disp', 'disp')}
                    {renderApplianceItem('Microwave', 'microwave')}
                  </div>
                  {/* Row 4: Dishwasher */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    {renderApplianceItem('Dishwasher', 'dishwasher')}
                  </div>
                  {/* Row 5: Washer/Dryer */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', minHeight: '26px', flex: 1 }}>
                    {renderApplianceItem('Washer/Dryer', 'washer')}
                  </div>
                </div>

                {/* COLUMN 5: Car Storage */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.76rem', textAlign: 'center', borderBottom: '1px solid #212529' }}>
                    Car Storage
                  </div>
                  {/* Row 1: None */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    {renderUdCheckbox('None/Garage/Covered/Open', 'None')}
                  </div>
                  {/* Row 2: Garage / Covered / Open */}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    {renderUdCheckbox('None/Garage/Covered/Open', 'Garage')}
                    {renderUdCheckbox('None/Garage/Covered/Open', 'Covered')}
                    {renderUdCheckbox('None/Garage/Covered/Open', 'Open')}
                  </div>
                  {/* Row 3: # of Cars */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}># of Cars</span>
                    <div style={{ flex: 1, minWidth: '40px' }}>
                      {renderUdEditable('# of Cars')}
                    </div>
                  </div>
                  {/* Row 4: Assigned / Owned */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderBottom: '1px solid #212529', minHeight: '26px' }}>
                    {renderUdCheckbox('Assigned/Owned', 'Assigned')}
                    {renderUdCheckbox('Assigned/Owned', 'Owned')}
                  </div>
                  {/* Row 5: Parking Space # */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', minHeight: '26px', flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.74rem', whiteSpace: 'nowrap', marginRight: '6px' }}>Parking Space #</span>
                    <div style={{ flex: 1, minWidth: '40px' }}>
                      {renderUdEditable('Parking Space #')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Finished Area Above Grade Row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #212529', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '6px' }}>
                  Finished area <b>above grade</b> contains:
                </span>
                <div style={{ width: '45px' }}>
                  {renderUdEditable('Rooms', '0')}
                </div>
                <span style={{ fontSize: '0.74rem', marginRight: '10px' }}>Rooms</span>

                <div style={{ width: '45px' }}>
                  {renderUdEditable('Bedrooms', '0')}
                </div>
                <span style={{ fontSize: '0.74rem', marginRight: '10px' }}>Bedrooms</span>

                <div style={{ width: '50px' }}>
                  {renderUdEditable('Bath(s)', '0.0')}
                </div>
                <span style={{ fontSize: '0.74rem', marginRight: '10px' }}>Bath(s)</span>

                <div style={{ width: '70px' }}>
                  {renderUdEditable('Square Feet of Gross Living Area Above Grade', '0')}
                </div>
                <span style={{ fontSize: '0.74rem' }}>Square Feet of Gross Living Area Above Grade</span>
              </div>

              {/* Separately Metered Heating & Cooling Row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #212529', flexWrap: 'wrap', minHeight: '28px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '12px', flexShrink: 0 }}>
                  Are the heating and cooling for the individual units separately metered?
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
                  {renderUdCheckbox("Are the heating and cooling for the individual units separately metered?", 'Yes')}
                  {renderUdCheckbox("Are the heating and cooling for the individual units separately metered?", 'No')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.74rem', marginRight: '6px', whiteSpace: 'nowrap' }}>
                    If No, describe and comment on compatibility to other projects in the market area.
                  </span>
                  <div style={{ flex: 1 }}>
                    {renderUdEditable(
                      "If No, describe and comment on compatibility to other projects in the market area.",
                      "Describe compatibility"
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Features Narrative */}
              <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 8px', borderBottom: '1px solid #212529' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginBottom: '2px' }}>
                  Additional features (special energy efficient items, etc.)
                </span>
                {renderUdEditable("Additional features (special energy efficient items, etc.)", "Enter additional features...", {}, true, true)}
              </div>

              {/* Property Condition Narrative */}
              <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 8px', borderBottom: '1px solid #212529' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginBottom: '2px' }}>
                  Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)
                </span>
                {renderUdEditable("Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)", "Describe property condition...", {}, true, true)}
              </div>

              {/* Physical Deficiencies Row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #212529', flexWrap: 'wrap', minHeight: '28px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '12px', flexShrink: 0 }}>
                  Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property?
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
                  {renderUdCheckbox("Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property?", 'Yes')}
                  {renderUdCheckbox("Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property?", 'No')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.74rem', marginRight: '6px', whiteSpace: 'nowrap' }}>If Yes, describe</span>
                  <div style={{ flex: 1 }}>
                    {renderUdEditable("If Yes, describe", "Describe physical deficiencies")}
                  </div>
                </div>
              </div>

              {/* Neighborhood Conformance Row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', flexWrap: 'wrap', minHeight: '28px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '12px', flexShrink: 0 }}>
                  Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
                  {renderUdCheckbox("Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?", 'Yes')}
                  {renderUdCheckbox("Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?", 'No')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.74rem', marginRight: '6px', whiteSpace: 'nowrap' }}>If No, describe</span>
                  <div style={{ flex: 1 }}>
                    {renderUdEditable("If No, describe", "Describe non-conformance")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Paper>
    );
  }

  // =============================================================
  // PRIOR SALE HISTORY SECTION - FANNIE MAE 1073 / 1004 GRID
  // =============================================================
  if (id === 'prior-sale-history-section' || title === 'Prior Sale History') {
    const pshData = (data && typeof data === 'object' && (
      'Prior Sale History: Date of Prior Sale/Transfer' in data ||
      'Date of Prior Sale/Transfer' in data ||
      'My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.' in data
    ))
      ? data
      : (data?.PRIOR_SALE_HISTORY || data?.['Prior Sale History'] || allData?.PRIOR_SALE_HISTORY || allData?.['Prior Sale History'] || allData?.clean_data?.['Prior Sale History'] || allData?.clean_data?.PRIOR_SALE_HISTORY || allData?.SALES_TRANSFER || allData || {});

    // Helper to get raw value from prior sale data or fallbacks
    const getPshRawVal = (fieldKey, fallbackKeys = []) => {
      const keys = [fieldKey, ...(Array.isArray(fallbackKeys) ? fallbackKeys : [fallbackKeys])];
      const sources = [
        pshData,
        data?.PRIOR_SALE_HISTORY,
        data?.['Prior Sale History'],
        data?.clean_data?.['Prior Sale History'],
        data?.clean_data?.PRIOR_SALE_HISTORY,
        data?.SALES_TRANSFER,
        data?.SALES_GRID,
        data?.RECONCILIATION,
        data,
        allData?.PRIOR_SALE_HISTORY,
        allData?.['Prior Sale History'],
        allData?.clean_data?.['Prior Sale History'],
        allData?.clean_data?.PRIOR_SALE_HISTORY,
        allData?.SALES_TRANSFER,
        allData?.SALES_GRID,
        allData?.RECONCILIATION,
        allData?.Subject,
        allData?.SUBJECT,
        allData
      ];
      for (const src of sources) {
        if (src && typeof src === 'object') {
          for (const k of keys) {
            if (src[k] !== undefined && src[k] !== null && String(src[k]).trim() !== '') {
              return renderValue(src[k]);
            }
          }
          const srcKeys = Object.keys(src);
          for (const k of keys) {
            const normK = k.toLowerCase().replace(/[\s\r\n\t]+/g, ' ').trim();
            const matchedKey = srcKeys.find(sk => sk.toLowerCase().replace(/[\s\r\n\t]+/g, ' ').trim() === normK);
            if (matchedKey && src[matchedKey] !== undefined && src[matchedKey] !== null && String(src[matchedKey]).trim() !== '') {
              return renderValue(src[matchedKey]);
            }
          }
        }
      }
      return '';
    };

    // Helper for EditableField in top/bottom areas
    const renderPshEditable = (fieldKey, placeholder = '', customStyle = {}, usePre = false, multiline = false, fallbackKeys = []) => {
      const valStr = getPshRawVal(fieldKey, fallbackKeys);
      return (
        <EditableField
          fieldPath={[fieldKey]}
          value={valStr}
          onDataChange={onDataChange}
          editingField={editingField}
          setEditingField={setEditingField}
          usePre={usePre}
          isEditable={isEditable}
          allData={allData}
          manualValidations={manualValidations}
          handleManualValidation={handleManualValidation}
          revisionHandlers={revisionHandlers}
          showBlankValidation={true}
          inputClassName="form-control form-control-sm field-value-pre"
          placeholder={placeholder}
          inputStyle={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            padding: '2px 4px',
            fontSize: '0.80rem',
            color: '#1f2937',
            height: 'auto',
            ...(multiline ? { minHeight: '44px' } : {}),
            ...customStyle
          }}
        />
      );
    };

    // Helper for interactive Did / Did Not checkbox
    const renderPshCheckbox = (fieldKey, optionLabel) => {
      const currentVal = String(getPshRawVal(fieldKey) || '').trim().toLowerCase();
      const isDidNot = optionLabel.toLowerCase() === 'did not';
      let isChecked = false;

      if (isDidNot) {
        isChecked = currentVal.includes('did not') || currentVal === 'n' || currentVal === 'false' || currentVal === 'no';
      } else {
        isChecked = (currentVal.includes('did') && !currentVal.includes('did not')) || currentVal === 'y' || currentVal === 'true' || currentVal === 'yes';
      }

      const handleToggle = () => {
        if (!isEditable) return;
        const newVal = isChecked ? '' : optionLabel;
        if (onDataChange) {
          onDataChange([fieldKey], newVal);
        }
      };

      return (
        <div
          onClick={handleToggle}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            cursor: isEditable ? 'pointer' : 'default',
            userSelect: 'none',
            fontSize: '0.78rem',
            marginRight: '12px',
            lineHeight: 1.2
          }}
          title={isEditable ? `Toggle ${optionLabel}` : optionLabel}
        >
          <div
            style={{
              width: '14px',
              height: '14px',
              border: '1.5px solid #212529',
              borderRadius: '2px',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '5px',
              fontWeight: '900',
              fontSize: '11px',
              color: '#000',
              lineHeight: 1,
              flexShrink: 0
            }}
          >
            {isChecked ? '✕' : ''}
          </div>
          <span style={{ color: '#212529', fontWeight: isChecked ? 600 : 400 }}>{optionLabel}</span>
        </div>
      );
    };

    // Helper to get comps list (first 3 comps for Fannie Mae grid)
    const compsList = (Array.isArray(allData?.comparableSales) && allData.comparableSales.length > 0)
      ? allData.comparableSales.slice(0, 3)
      : (Array.isArray(data?.comparableSales) && data.comparableSales.length > 0)
      ? data.comparableSales.slice(0, 3)
      : ['COMPARABLE SALE #1', 'COMPARABLE SALE #2', 'COMPARABLE SALE #3'];

    // Helper to get Subject values for table rows
    const getSubjectRowVal = (feature, fallbackKeys = []) => {
      const keys = [feature, ...(Array.isArray(fallbackKeys) ? fallbackKeys : [fallbackKeys])];
      const sources = [
        data?.Subject,
        data?.SUBJECT,
        allData?.Subject,
        allData?.SUBJECT,
        data?.SALES_GRID?.Subject,
        allData?.SALES_GRID?.Subject,
        allData?.['Sales Grid']?.Subject,
        data?.PRIOR_SALE_HISTORY,
        data?.['Prior Sale History'],
        data,
        allData
      ];
      for (const src of sources) {
        if (src && typeof src === 'object') {
          for (const k of keys) {
            if (src[k] !== undefined && src[k] !== null && String(src[k]).trim() !== '') {
              return renderValue(src[k]);
            }
          }
        }
      }
      return '';
    };

    // Helper to get Comp values for table rows
    const getCompRowVal = (compKey, feature, fallbackKeys = []) => {
      const keys = [feature, ...(Array.isArray(fallbackKeys) ? fallbackKeys : [fallbackKeys])];
      const compSources = [
        data?.[compKey],
        allData?.[compKey],
        allData?.SALES_GRID?.[compKey],
        allData?.['Sales Grid']?.[compKey],
        data?.SALES_GRID?.[compKey],
        allData?.clean_data?.[compKey],
        allData?.clean_data?.SALES_GRID?.[compKey]
      ];
      for (const src of compSources) {
        if (src && typeof src === 'object') {
          for (const k of keys) {
            if (src[k] !== undefined && src[k] !== null && String(src[k]).trim() !== '') {
              return renderValue(src[k]);
            }
          }
        }
      }
      const compNumMatch = String(compKey).match(/(\d+)/);
      if (compNumMatch) {
        const num = compNumMatch[1];
        for (const k of keys) {
          const direct = data?.[`Comp ${num} ${k}`] ?? allData?.[`Comp ${num} ${k}`] ?? data?.[`Comparable Sale #${num} ${k}`] ?? allData?.[`Comparable Sale #${num} ${k}`];
          if (direct !== undefined && direct !== null && String(direct).trim() !== '') {
            return renderValue(direct);
          }
        }
      }
      return '';
    };

    const tableRows = [
      {
        label: 'Date of Prior Sale/Transfer',
        key: 'Date of Prior Sale/Transfer',
        fallbacks: ['Prior Sale History: Date of Prior Sale/Transfer'],
        placeholder: 'MM/DD/YYYY'
      },
      {
        label: 'Price of Prior Sale/Transfer',
        key: 'Price of Prior Sale/Transfer',
        fallbacks: ['Prior Sale History: Price of Prior Sale/Transfer'],
        placeholder: '$'
      },
      {
        label: 'Data Source(s)',
        key: 'Data Source(s)',
        fallbacks: ['Data source(s)', 'Data Source(s) for prior sale/transfer', 'Prior Sale History: Data Source(s) for prior sale/transfer', 'Data Source', 'Data source'],
        placeholder: 'e.g. Realist, MLS'
      },
      {
        label: 'Effective Date of Data Source(s)',
        key: 'Effective Date of Data Source(s)',
        fallbacks: ['Effective date of data source(s)', 'Prior Sale History: Effective Date of Data Source(s)', 'Effective Date of Data Source(s) for prior sale'],
        placeholder: 'MM/DD/YYYY'
      }
    ];

    return (
      <Paper id={id} elevation={1} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: borderColor }}>
        {/* Card Header */}
        <Box
          sx={{
            p: 1.5,
            bgcolor: 'grey.50',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'grey.200',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Typography variant="h6" component="h5" sx={{ fontSize: '1.05rem', fontWeight: 'bold' }}>
            {title || "Prior Sale History"}
          </Typography>
          {onRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'text.secondary', ml: 'auto' }}>
                <LibraryBooksIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {loading && loadingSection === id && (
          <Box sx={{ width: '100%' }}><LinearProgress /></Box>
        )}

        <div className="card-body p-2" style={{ backgroundColor: '#fff', fontSize: '0.78rem', overflowX: 'auto' }}>
          {/* Fannie Mae Grid Table */}
          <div style={{ display: 'flex', border: '1.5px solid #212529', borderRadius: '2px', backgroundColor: '#fff', minWidth: '920px' }}>
            {/* Left Vertical Black Banner */}
            <div style={{
              backgroundColor: '#000',
              color: '#fff',
              width: '32px',
              minWidth: '32px',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '0.85rem',
              letterSpacing: '2px',
              padding: '8px 0',
              borderRight: '1px solid #212529'
            }}>
              PRIOR SALE HISTORY
            </div>

            {/* Right Main Grid */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Row 1: Research statement & explain */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #212529', flexWrap: 'wrap', minHeight: '28px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.78rem', marginRight: '6px' }}>I</span>
                {renderPshCheckbox(
                  "I did did not research the sale or transfer history of the subject property and comparable sales. If not, explain",
                  "did"
                )}
                {renderPshCheckbox(
                  "I did did not research the sale or transfer history of the subject property and comparable sales. If not, explain",
                  "did not"
                )}
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '8px' }}>
                  research the sale or transfer history of the subject property and comparable sales. If not, explain
                </span>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  {renderPshEditable(
                    "If not, explain",
                    "Explain if not researched",
                    {},
                    false,
                    false,
                    [
                      "I did did not research the sale or transfer history of the subject property and comparable sales. If not, explain",
                      "Prior Sale History: If not, explain",
                      "Prior Sale History: I did did not research the sale or transfer history of the subject property and comparable sales"
                    ]
                  )}
                </div>
              </div>

              {/* Row 2: Subject research & data source */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #212529', flexWrap: 'wrap', minHeight: '28px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.78rem', marginRight: '6px' }}>My research</span>
                {renderPshCheckbox(
                  "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.",
                  "did"
                )}
                {renderPshCheckbox(
                  "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.",
                  "did not"
                )}
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '16px' }}>
                  reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.
                </span>
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', minWidth: '240px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '6px', whiteSpace: 'nowrap' }}>Data source(s)</span>
                  <div style={{ flex: 1 }}>
                    {renderPshEditable(
                      "Data Source(s) for subject property research",
                      "e.g. Realist, Public Records",
                      {},
                      false,
                      false,
                      [
                        "Data source(s) for subject",
                        "Prior Sale History: Data source(s) for subject",
                        "Subject Transfer History Data Source",
                        "Data source(s) for subject property research"
                      ]
                    )}
                  </div>
                </div>
              </div>

              {/* Row 3: Comparables research & data source */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #212529', flexWrap: 'wrap', minHeight: '28px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.78rem', marginRight: '6px' }}>My research</span>
                {renderPshCheckbox(
                  "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.",
                  "did"
                )}
                {renderPshCheckbox(
                  "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.",
                  "did not"
                )}
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '16px' }}>
                  reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.
                </span>
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', minWidth: '240px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.76rem', marginRight: '6px', whiteSpace: 'nowrap' }}>Data source(s)</span>
                  <div style={{ flex: 1 }}>
                    {renderPshEditable(
                      "Data Source(s) for comparable sales research",
                      "e.g. Realist, MLS",
                      {},
                      false,
                      false,
                      [
                        "Data source(s) for comparables",
                        "Prior Sale History: Data source(s) for comparables",
                        "Data Source(s) for comparable sales research"
                      ]
                    )}
                  </div>
                </div>
              </div>

              {/* Row 4: Subtitle instruction banner */}
              <div style={{ padding: '3px 8px', borderBottom: '1px solid #212529', backgroundColor: '#f8f9fa', fontSize: '0.74rem', fontWeight: 600, color: '#333' }}>
                Report the results of the research and analysis of the prior sale or transfer history of the subject property and comparable sales (report additional prior sales on page 3).
              </div>

              {/* Table Header */}
              <div style={{ display: 'flex', borderBottom: '1px solid #212529', backgroundColor: '#e9ecef', fontWeight: 700, fontSize: '0.76rem', textAlign: 'center' }}>
                <div style={{ width: '220px', minWidth: '220px', padding: '4px 8px', borderRight: '1px solid #212529', textAlign: 'left' }}>
                  ITEM
                </div>
                <div style={{ flex: 1, minWidth: '160px', padding: '4px 8px', borderRight: '1px solid #212529' }}>
                  SUBJECT
                </div>
                {compsList.map((compKey, idx) => (
                  <div key={idx} style={{ flex: 1, minWidth: '160px', padding: '4px 8px', borderRight: idx === compsList.length - 1 ? 'none' : '1px solid #212529' }}>
                    {compKey.toUpperCase()}
                  </div>
                ))}
              </div>

              {/* Table Data Rows */}
              {tableRows.map((rowItem, rIdx) => (
                <div key={rIdx} style={{ display: 'flex', borderBottom: '1px solid #212529', alignItems: 'center', minHeight: '26px' }}>
                  <div style={{ width: '220px', minWidth: '220px', padding: '3px 8px', fontWeight: 600, fontSize: '0.76rem', borderRight: '1px solid #212529', backgroundColor: '#fcfcfc' }}>
                    {rowItem.label}
                  </div>
                  <div style={{ flex: 1, minWidth: '160px', padding: '2px 4px', borderRight: '1px solid #212529' }}>
                    <EditableField
                      fieldPath={['Subject', rowItem.key]}
                      value={getSubjectRowVal(rowItem.key, rowItem.fallbacks)}
                      onDataChange={onDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData}
                      saleName="Subject"
                      manualValidations={manualValidations}
                      handleManualValidation={handleManualValidation}
                      revisionHandlers={revisionHandlers}
                      showBlankValidation={true}
                      inputClassName="form-control form-control-sm field-value-pre"
                      placeholder={rowItem.placeholder}
                      inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '2px 4px', fontSize: '0.80rem', color: '#1f2937' }}
                    />
                  </div>
                  {compsList.map((compKey, cIdx) => (
                    <div key={cIdx} style={{ flex: 1, minWidth: '160px', padding: '2px 4px', borderRight: cIdx === compsList.length - 1 ? 'none' : '1px solid #212529' }}>
                      <EditableField
                        fieldPath={[compKey, rowItem.key]}
                        value={getCompRowVal(compKey, rowItem.key, rowItem.fallbacks)}
                        onDataChange={onDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData}
                        saleName={compKey}
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                        revisionHandlers={revisionHandlers}
                        showBlankValidation={true}
                        inputClassName="form-control form-control-sm field-value-pre"
                        placeholder={rowItem.placeholder}
                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '2px 4px', fontSize: '0.80rem', color: '#1f2937' }}
                      />
                    </div>
                  ))}
                </div>
              ))}

              {/* Bottom Row: Analysis narrative */}
              <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.76rem', marginBottom: '2px' }}>
                  Analysis of prior sale or transfer history of the subject property and comparable sales.
                </span>
                {renderPshEditable(
                  "Analysis of prior sale or transfer history of the subject property and comparable sales",
                  "e.g. Please refer to Property History Page.",
                  {},
                  false,
                  true,
                  [
                    "Prior Sale History: Analysis of prior sale or transfer history of the subject property and comparable sales",
                    "Analysis of prior sale or transfer history of the subject property and comparable sales."
                  ]
                )}
              </div>

              {/* Bottom Row: Indicated Value by Sales Comparison Approach $ */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderTop: '1px solid #ced4da',
                backgroundColor: '#fff'
              }}>
                <span style={{ fontWeight: 600, fontSize: '0.78rem', color: '#212529' }}>
                  Indicated Value by Sales Comparison Approach $
                </span>
                <div style={{ width: '220px', minWidth: '180px' }}>
                  {renderPshEditable(
                    "Indicated Value by Sales Comparison Approach $",
                    "e.g. 1,200,000",
                    { textAlign: 'right' },
                    false,
                    false,
                    [
                      "Indicated Value by Sales Comparison Approach",
                      "Sales Comparison Approach Indicated Value",
                      "Indicated Value by: Sales Comparison Approach $",
                      "Indicated Value by Sales Comparison Approach Indicated",
                      "Final Value $",
                      "Final Value"
                    ]
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Paper>
    );
  }

  if (id === 'improvements-section') {
    return (

      <Paper id={id} elevation={1} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: borderColor }}>

        <Box

          sx={{

            p: 1.5,

            bgcolor: 'grey.50',

            color: 'text.primary',

            borderBottom: '1px solid',

            borderColor: 'grey.200',

            display: 'flex',

            justifyContent: 'space-between',

            alignItems: 'center',

          }}>

          <Typography variant="h6" component="h5" sx={{ fontSize: '1.05rem', fontWeight: 'bold' }}>{title || "Improvements Section"}</Typography>

          {onRevisionButtonClick && (

            <Tooltip title="Revision Language">

              <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'text.secondary', ml: 'auto' }}><LibraryBooksIcon /></IconButton>

            </Tooltip>

          )}

        </Box>

        {loading && loadingSection === id && (

          <Box sx={{ width: '100%' }}><LinearProgress /></Box>

        )}

        <div className="card-body p-2" style={{ fontSize: '0.78rem', backgroundColor: '#fff', overflowX: 'auto' }}>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(220px, 1fr))', gap: '8px', border: '1px solid #ced4da', borderRadius: '4px', padding: '4px' }}>



            {/* COLUMN 1: GENERAL DESCRIPTION */}

            <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden' }}>

              <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.75rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>

                GENERAL DESCRIPTION

              </div>

              <div style={{ padding: '4px' }}>

                {renderImpField("Units", ["Units", "One with Accessory Unit"], ["One", "One with Accessory Unit"])}

                {renderImpField("# of Stories", ["# of Stories"])}

                {renderImpField("Type", ["Type", "Property Type"], ["Det.", "Att.", "S-Det./End Unit"])}

                {renderImpField("Status", ["Existing/Proposed/Under Const.", "Construction Status"], ["Existing", "Proposed", "Under Const."])}

                {renderImpField("Design (Style)", ["Design (Style)", "Design Style"])}

                {renderImpField("Year Built", ["Year Built"])}

                {renderImpField("Effective Age (Yrs)", ["Effective Age (Yrs)", "Effective Age"])}

                {renderImpField("Attic", ["Attic"], ["None", "Drop Stair", "Stairs", "Floor", "Scuttle", "Finished", "Heated"])}

                {renderImpField("Appliances", ["Appliances"], ["Refrigerator", "Range/Oven", "Dishwasher", "Disposal", "Microwave", "Washer/Dryer", "Other (describe)"])}

              </div>

            </div>



            {/* COLUMN 2: FOUNDATION */}

            <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden' }}>

              <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.75rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>

                FOUNDATION

              </div>

              <div style={{ padding: '4px' }}>

                {renderImpField("Foundation", ["Foundation Type", "Foundation"], ["Concrete Slab", "Crawl Space", "Full Basement", "Partial Basement"])}

                {renderImpField("Basement Area", ["Basement Area sq.ft.", "Basement Area"])}

                {renderImpField("Basement Finish", ["Basement Finish %", "Basement Finish"])}

                {renderImpField("Details", ["Basement Details"], ["Outside Entry/Exit", "Sump Pump"])}

                {renderImpField("Evidence of", ["Evidence of (Foundation)", "Evidence of"], ["Infestation", "Dampness", "Settlement", "None"])}

                {renderImpField("Heating", ["Heating Type"], ["FWA", "HWBB", "Radiant", "Other"])}

                {renderImpField("Fuel", ["Fuel", "Heating Fuel"])}

                {renderImpField("Cooling", ["Cooling Type"], ["Central Air Conditioning", "Individual", "Other"])}

              </div>

            </div>



            {/* COLUMN 3: EXTERIOR DESCRIPTION */}

            <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden' }}>

              <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.75rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>

                EXTERIOR DESCRIPTION <span style={{ fontWeight: 'normal', fontSize: '0.65rem' }}>materials/condition</span>

              </div>

              <div style={{ padding: '4px' }}>

                {renderImpField("Foundation Walls", ["Foundation Walls (Material/Condition)", "Foundation Walls"])}

                {renderImpField("Exterior Walls", ["Exterior Walls (Material/Condition)", "Exterior Walls"])}

                {renderImpField("Roof Surface", ["Roof Surface (Material/Condition)", "Roof Surface"])}

                {renderImpField("Gutters & Downspouts", ["Gutters & Downspouts (Material/Condition)", "Gutters & Downspouts"])}

                {renderImpField("Window Type", ["Window Type (Material/Condition)", "Window Type"])}

                {renderImpField("Storm Sash/Insulated", ["Storm Sash/Insulated"])}

                {renderImpField("Screens", ["Screens"])}

                {renderImpField("Amenities", ["Amenities", "Patio/Deck", "Fence", "Porch", "Pool", "Other Amenities"], ["WoodStove", "Fireplace", "Fence", "Patio/Deck", "Porch", "Pool", "Other"])}

              </div>

            </div>



            {/* COLUMN 4: INTERIOR */}

            <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden' }}>

              <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.75rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>

                INTERIOR <span style={{ fontWeight: 'normal', fontSize: '0.65rem' }}>materials/condition</span>

              </div>

              <div style={{ padding: '4px' }}>

                {renderImpField("Floors", ["Floors (Material/Condition)", "Floors"])}

                {renderImpField("Walls", ["Walls (Material/Condition)", "Walls"])}

                {renderImpField("Trim/Finish", ["Trim/Finish (Material/Condition)", "Trim/Finish"])}

                {renderImpField("Bath Floor", ["Bath Floor (Material/Condition)", "Bath Floor"])}

                {renderImpField("Bath Wainscot", ["Bath Wainscot (Material/Condition)", "Bath Wainscot"])}



                {/* CAR STORAGE STRUCTURED SECTION */}

                <div style={{ marginTop: '8px', border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#fcfcfc' }}>

                  {/* Row 1: Header + None */}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f3f5', padding: '3px 6px', borderBottom: '1px solid #dee2e6' }}>

                    <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.72rem' }}>Car Storage</span>

                    {(() => {

                      const { value: csVal, actualKey: csKey } = getImpValue(["Car Storage", "CAR STORAGE", "Car Storage None", "Vehicle Storage"]);

                      const { value: csNoneFlag } = getImpValue(["Car Storage None", "Car Storage - None"]);


const isNoneChecked = (

                        checkOptionMatches(csVal, "None") ||

                        checkOptionMatches(csNoneFlag, "Yes") ||

                        checkOptionMatches(csNoneFlag, "None") ||

                        checkOptionMatches(csNoneFlag, "true")

                      );



                      const toggleNone = () => {

                        const targetKey = csKey || "Car Storage";

                        if (isNoneChecked) {

                          onDataChange(getFieldPath(targetKey), "");

                        } else {

                          onDataChange(getFieldPath(targetKey), "None");

                        }

                      };

                      return (

                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem', margin: 0, fontWeight: '500' }}>

                          <input type="checkbox" checked={Boolean(isNoneChecked)} onChange={toggleNone} style={{ margin: 0, width: '13px', height: '13px', cursor: 'pointer' }} />

                          <span>None</span>

                        </label>

                      );

                    })()}

                  </div>



                  <div style={{ padding: '4px 6px' }}>

                    {/* Row 2: [ ] Driveway   # of Cars [ 1 ] */}

                    {(() => {

                      const { value: csVal } = getImpValue(["Car Storage"]);

                      const isDriveChecked = checkOptionMatches(csVal, "Driveway");

                      const toggleDrive = () => {

                        let items = csVal ? String(csVal).split(',').map(s => s.trim()).filter(Boolean) : [];

                        if (isDriveChecked) {

                          items = items.filter(i => !checkOptionMatches(i, "Driveway"));

                        } else {

                          items = items.filter(i => !checkOptionMatches(i, "None"));

                          items.push("Driveway");

                        }

                        onDataChange(getFieldPath("Car Storage"), items.join(', '));

                      };

                      const { value: driveCarsVal, actualKey: driveCarsKey } = getImpValue(["Driveway # of Cars", "Driveway Cars", "# of Cars"]);

                      return (

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dashed #e9ecef' }}>

                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem', margin: 0, minWidth: '75px' }}>

                            <input type="checkbox" checked={isDriveChecked} onChange={toggleDrive} style={{ margin: 0, width: '13px', height: '13px', cursor: 'pointer' }} />

                            <span>Driveway</span>

                          </label>

                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>

                            <span style={{ fontSize: '0.68rem', color: '#6c757d', whiteSpace: 'nowrap' }}># of Cars</span>

                            <div style={{ width: '65px', borderBottom: '1px solid #495057' }}>

                              <EditableField

                                fieldPath={getFieldPath(driveCarsKey || "Driveway # of Cars")}

                                value={renderValue(driveCarsVal)}

                                onDataChange={onDataChange}

                                editingField={editingField}

                                setEditingField={setEditingField}

                                isEditable={true}

                                allData={allData}

                                manualValidations={manualValidations}

                                handleManualValidation={handleManualValidation}

                                revisionHandlers={revisionHandlers}

                                inputClassName="form-control form-control-sm text-center"

                                inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '0 2px', fontSize: '0.75rem', height: 'auto', textAlign: 'center', fontWeight: 'bold' }}

                              />

                            </div>

                          </div>

                        </div>

                      );

                    })()}



                    {/* Row 3: Driveway Surface [ Asphalt ] */}

                    {(() => {

                      const { value: surfVal, actualKey: surfKey } = getImpValue(["Driveway Surface"]);

                      return (

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dashed #e9ecef' }}>

                          <span style={{ fontSize: '0.7rem', color: '#495057' }}>Driveway Surface</span>

                          <div style={{ width: '95px', borderBottom: '1px solid #495057' }}>

                            <EditableField

                              fieldPath={getFieldPath(surfKey || "Driveway Surface")}

                              value={renderValue(surfVal)}

                              onDataChange={onDataChange}

                              editingField={editingField}

                              setEditingField={setEditingField}

                              isEditable={true}

                              allData={allData}

                              manualValidations={manualValidations}

                              handleManualValidation={handleManualValidation}

                              revisionHandlers={revisionHandlers}

                              inputClassName="form-control form-control-sm text-center"

                              inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '0 2px', fontSize: '0.75rem', height: 'auto', textAlign: 'center', fontWeight: 'bold' }}

                            />

                          </div>

                        </div>

                      );

                    })()}



                    {/* Row 4: [ ] Garage   # of Cars [ 1 ] */}

                    {(() => {

                      const { value: csVal } = getImpValue(["Car Storage"]);

                      const isGarageChecked = checkOptionMatches(csVal, "Garage");

                      const toggleGarage = () => {

                        let items = csVal ? String(csVal).split(',').map(s => s.trim()).filter(Boolean) : [];

                        if (isGarageChecked) {

                          items = items.filter(i => !checkOptionMatches(i, "Garage"));

                        } else {

                          items = items.filter(i => !checkOptionMatches(i, "None"));

                          items.push("Garage");

                        }

                        onDataChange(getFieldPath("Car Storage"), items.join(', '));

                      };

                      const { value: garageCarsVal, actualKey: garageCarsKey } = getImpValue(["Garage # of Cars", "Garage Cars"]);

                      return (

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dashed #e9ecef' }}>

                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem', margin: 0, minWidth: '75px' }}>

                            <input type="checkbox" checked={isGarageChecked} onChange={toggleGarage} style={{ margin: 0, width: '13px', height: '13px', cursor: 'pointer' }} />

                            <span>Garage</span>

                          </label>

                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>

                            <span style={{ fontSize: '0.68rem', color: '#6c757d', whiteSpace: 'nowrap' }}># of Cars</span>

                            <div style={{ width: '65px', borderBottom: '1px solid #495057' }}>

                              <EditableField

                                fieldPath={getFieldPath(garageCarsKey || "Garage # of Cars")}

                                value={renderValue(garageCarsVal)}

                                onDataChange={onDataChange}

                                editingField={editingField}

                                setEditingField={setEditingField}

                                isEditable={true}

                                allData={allData}

                                manualValidations={manualValidations}

                                handleManualValidation={handleManualValidation}

                                revisionHandlers={revisionHandlers}

                                inputClassName="form-control form-control-sm text-center"

                                inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '0 2px', fontSize: '0.75rem', height: 'auto', textAlign: 'center', fontWeight: 'bold' }}

                              />

                            </div>

                          </div>

                        </div>

                      );

                    })()}



                    {/* Row 5: [ ] Carport   # of Cars [ 0 ] */}

                    {(() => {

                      const { value: csVal } = getImpValue(["Car Storage"]);

                      const isCarportChecked = checkOptionMatches(csVal, "Carport");

                      const toggleCarport = () => {

                        let items = csVal ? String(csVal).split(',').map(s => s.trim()).filter(Boolean) : [];

                        if (isCarportChecked) {

                          items = items.filter(i => !checkOptionMatches(i, "Carport"));

                        } else {

                          items = items.filter(i => !checkOptionMatches(i, "None"));

                          items.push("Carport");

                        }

                        onDataChange(getFieldPath("Car Storage"), items.join(', '));

                      };

                      const { value: carportCarsVal, actualKey: carportCarsKey } = getImpValue(["Carport # of Cars", "Carport Cars"]);

                      return (

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dashed #e9ecef' }}>

                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem', margin: 0, minWidth: '75px' }}>

                            <input type="checkbox" checked={isCarportChecked} onChange={toggleCarport} style={{ margin: 0, width: '13px', height: '13px', cursor: 'pointer' }} />

                            <span>Carport</span>

                          </label>

                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>

                            <span style={{ fontSize: '0.68rem', color: '#6c757d', whiteSpace: 'nowrap' }}># of Cars</span>

                            <div style={{ width: '65px', borderBottom: '1px solid #495057' }}>

                              <EditableField

                                fieldPath={getFieldPath(carportCarsKey || "Carport # of Cars")}

                                value={renderValue(carportCarsVal)}

                                onDataChange={onDataChange}

                                editingField={editingField}

                                setEditingField={setEditingField}

                                isEditable={true}

                                allData={allData}

                                manualValidations={manualValidations}

                                handleManualValidation={handleManualValidation}

                                revisionHandlers={revisionHandlers}

                                inputClassName="form-control form-control-sm text-center"

                                inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '0 2px', fontSize: '0.75rem', height: 'auto', textAlign: 'center', fontWeight: 'bold' }}

                              />

                            </div>

                          </div>

                        </div>

                      );

                    })()}



                    {/* Row 6: [ ] Att.   [ ] Det.   [ ] Built-in */}

                    {(() => {

                      const { value: attVal, actualKey: attKey } = getImpValue([

                        "Att./Det./Built-in",

                        "Garage Att./Det./Built-in",

                        "Car Storage Att/Det",

                        "Garage Type",

                        "Vehicle Storage Detail",

                        "ATT./DET./BUILT-IN"

                      ]);

                      const { value: csVal } = getImpValue(["Car Storage", "CAR STORAGE", "Vehicle Storage"]);

                      const { value: garVal } = getImpValue(["Garage", "Garage # of Cars", "Garage Cars"]);

                      const { value: garAttFlag } = getImpValue(["Garage Att.", "Garage Att"]);

                      const { value: garDetFlag } = getImpValue(["Garage Detached", "Garage Det"]);

                      const { value: garBuiltFlag } = getImpValue(["Garage Built-in", "Garage Built-In", "Garage Builtin"]);

                      const { value: carportVal } = getImpValue(["Carport", "Carport # of Cars", "Carport Cars"]);

                      const isNoneChecked = checkOptionMatches(csVal, "None");

                      const hasGarage = checkOptionMatches(csVal, "Garage") || (parseInt(garVal, 10) > 0);

                      const hasCarport = checkOptionMatches(csVal, "Carport") || (parseInt(carportVal, 10) > 0);

                      const canHaveAttachment = !isNoneChecked && (hasGarage || hasCarport);

                      const combinedStr = `${attVal} ${garAttFlag} ${garDetFlag} ${garBuiltFlag}`.toLowerCase();



                      const isAtt = canHaveAttachment && (

                        checkOptionMatches(attVal, "Att") ||

                        checkOptionMatches(attVal, "Attached") ||

                        checkOptionMatches(garAttFlag, "Yes") ||

                        checkOptionMatches(garAttFlag, "true") ||

                        /\b(?:att|attached|\d+ga)\b/i.test(combinedStr)

                      );



                      const isDet = canHaveAttachment && (

                        checkOptionMatches(attVal, "Det") ||

                        checkOptionMatches(attVal, "Detached") ||

                        checkOptionMatches(garDetFlag, "Yes") ||

                        checkOptionMatches(garDetFlag, "true") ||

                        /\b(?:det|detached|\d+gd)\b/i.test(combinedStr)

                      );



                      const isBuiltin = canHaveAttachment && (

                        checkOptionMatches(attVal, "Built-in") ||

                        checkOptionMatches(attVal, "Built") ||

                        checkOptionMatches(attVal, "BuiltIn") ||

                        checkOptionMatches(garBuiltFlag, "Yes") ||

                        checkOptionMatches(garBuiltFlag, "true") ||

                        /\b(?:built[\s-]?in|\d+gbi)\b/i.test(combinedStr)

                      );



                      const setType = (typeVal) => {

                        const targetKey = attKey || "Att./Det./Built-in";

                        onDataChange(getFieldPath(targetKey), typeVal);

                      };



                      return (

                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginTop: '4px', paddingTop: '4px' }}>

                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem', margin: 0 }}>

                            <input type="checkbox" checked={Boolean(isAtt)} onChange={() => setType(isAtt ? '' : 'Attached')} style={{ margin: 0, width: '13px', height: '13px', cursor: 'pointer' }} />

                            <span>Att.</span>

                          </label>

                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem', margin: 0 }}>

                            <input type="checkbox" checked={Boolean(isDet)} onChange={() => setType(isDet ? '' : 'Detached')} style={{ margin: 0, width: '13px', height: '13px', cursor: 'pointer' }} />

                            <span>Det.</span>

                          </label>

                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem', margin: 0 }}>

                            <input type="checkbox" checked={Boolean(isBuiltin)} onChange={() => setType(isBuiltin ? '' : 'Built-in')} style={{ margin: 0, width: '13px', height: '13px', cursor: 'pointer' }} />

                            <span>Built-in</span>

                          </label>

                        </div>

                      );

                    })()}

                  </div>

                </div>

              </div>

            </div>



          </div>



          {/* FINISHED AREA ABOVE GRADE & ADDITIONAL FEATURES */}

          <div style={{ marginTop: '10px', border: '1px solid #ced4da', borderRadius: '4px', padding: '10px 12px', backgroundColor: '#fcfcfc' }}>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px', fontSize: '0.78rem', borderBottom: '1px solid #e9ecef', paddingBottom: '10px', marginBottom: '10px' }}>

              <span style={{ fontWeight: 'bold', color: '#343a40', whiteSpace: 'nowrap', marginRight: '4px' }}>

                Finished area above grade contains:

              </span>



              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>

                <div style={{ minWidth: '85px', width: '85px', borderBottom: '1.5px solid #495057' }}>

                  {(() => {

                    const { value: rawVal, actualKey } = getImpValue(["Finished area above grade Rooms", "Rooms"]);

                    const targetPath = getFieldPath(actualKey);

                    return (

                      <EditableField

                        fieldPath={targetPath}

                        value={renderValue(rawVal)}

                        onDataChange={onDataChange}

                        editingField={editingField}

                        setEditingField={setEditingField}

                        isEditable={true}

                        allData={allData}

                        manualValidations={manualValidations}

                        handleManualValidation={handleManualValidation}

                        revisionHandlers={revisionHandlers}

                        inputClassName="form-control form-control-sm text-center"

                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '0 4px', fontSize: '0.82rem', height: 'auto', textAlign: 'center', fontWeight: 'bold' }}

                      />

                    );

                  })()}

                </div>

                <span style={{ color: '#495057', fontWeight: '500' }}>Rooms</span>

              </div>



              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>

                <div style={{ minWidth: '85px', width: '85px', borderBottom: '1.5px solid #495057' }}>

                  {(() => {

                    const { value: rawVal, actualKey } = getImpValue(["Finished area above grade Bedrooms", "Bedrooms"]);

                    const targetPath = getFieldPath(actualKey);

                    return (

                      <EditableField

                        fieldPath={targetPath}

                        value={renderValue(rawVal)}

                        onDataChange={onDataChange}

                        editingField={editingField}

                        setEditingField={setEditingField}

                        isEditable={true}

                        allData={allData}

                        manualValidations={manualValidations}

                        handleManualValidation={handleManualValidation}

                        revisionHandlers={revisionHandlers}

                        inputClassName="form-control form-control-sm text-center"

                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '0 4px', fontSize: '0.82rem', height: 'auto', textAlign: 'center', fontWeight: 'bold' }}

                      />

                    );

                  })()}

                </div>

                <span style={{ color: '#495057', fontWeight: '500' }}>Bedrooms</span>

              </div>



              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>

                <div style={{ minWidth: '85px', width: '85px', borderBottom: '1.5px solid #495057' }}>

                  {(() => {

                    const { value: rawVal, actualKey } = getImpValue(["Finished area above grade Bath(s)", "Bath(s)", "Finished area above grade Baths", "Baths"]);

                    const targetPath = getFieldPath(actualKey);

                    return (

                      <EditableField

                        fieldPath={targetPath}

                        value={renderValue(rawVal)}

                        onDataChange={onDataChange}

                        editingField={editingField}

                        setEditingField={setEditingField}

                        isEditable={true}

                        allData={allData}

                        manualValidations={manualValidations}

                        handleManualValidation={handleManualValidation}

                        revisionHandlers={revisionHandlers}

                        inputClassName="form-control form-control-sm text-center"

                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '0 4px', fontSize: '0.82rem', height: 'auto', textAlign: 'center', fontWeight: 'bold' }}

                      />

                    );

                  })()}

                </div>

                <span style={{ color: '#495057', fontWeight: '500' }}>Bath(s)</span>

              </div>



              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>

                <div style={{ minWidth: '120px', width: '120px', borderBottom: '1.5px solid #495057' }}>

                  {(() => {

                    const { value: rawVal, actualKey } = getImpValue(["Square Feet of Gross Living Area Above Grade", "Gross Living Area", "Gross Living Area: square feet", "Square Feet of Gross Living Area"]);

                    const targetPath = getFieldPath(actualKey);

                    return (

                      <EditableField

                        fieldPath={targetPath}

                        value={renderValue(rawVal)}

                        onDataChange={onDataChange}

                        editingField={editingField}

                        setEditingField={setEditingField}

                        isEditable={true}

                        allData={allData}

                        manualValidations={manualValidations}

                        handleManualValidation={handleManualValidation}

                        revisionHandlers={revisionHandlers}

                        inputClassName="form-control form-control-sm text-center"

                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '0 4px', fontSize: '0.82rem', height: 'auto', textAlign: 'center', fontWeight: 'bold' }}

                      />

                    );

                  })()}

                </div>

                <span style={{ color: '#495057', fontWeight: '500' }}>Square Feet of Gross Living Area Above Grade</span>

              </div>

            </div>



            {/* Additional features */}

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', fontSize: '0.78rem' }}>

              <span style={{ fontWeight: 'bold', color: '#343a40', whiteSpace: 'nowrap' }}>

                Additional features (special energy efficient items, etc.):

              </span>

              <div style={{ flexGrow: 1 }}>

                {(() => {

                  const { value: rawVal, actualKey } = getImpValue(["Additional features", "Additional features (special energy efficient items, etc.)", "Additional features (special energy efficient items, etc.)."]);

                  const targetPath = getFieldPath(actualKey);

                  return (

                    <EditableField

                      fieldPath={targetPath}

                      value={renderValue(rawVal)}

                      onDataChange={onDataChange}

                      editingField={editingField}

                      setEditingField={setEditingField}

                      isEditable={true}

                      allData={allData}

                      manualValidations={manualValidations}

                      handleManualValidation={handleManualValidation}

                      revisionHandlers={revisionHandlers}

                      inputClassName="form-control form-control-sm field-value"

                      inputStyle={{ width: '100%', border: 'none', borderBottom: '1px solid #dee2e6', background: 'transparent', padding: '0 4px', fontSize: '0.78rem', height: 'auto' }}

                    />

                  );

                })()}

              </div>

            </div>

          </div>



          {/* SUMMARY COMMENTS AT BOTTOM */}

          <div style={{ marginTop: '12px', borderTop: '1px dashed #dee2e6', paddingTop: '8px' }}>

            <div style={{ marginBottom: '8px' }}>

              <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', marginBottom: '2px' }}>

                Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.):

              </div>

              {renderImpNarrativeField(["Describe the condition of the property", "Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)"])}

            </div>

            <div style={{ marginBottom: '8px' }}>

              <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', marginBottom: '2px' }}>

                Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe:

              </div>

              {renderImpNarrativeField(["Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe", "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property?"])}

            </div>

            <div>

              <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', marginBottom: '2px' }}>

                Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)? If No, describe:

              </div>

              {renderImpNarrativeField(["Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?", "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)? If No, describe"])}

            </div>

          </div>

        </div>

      </Paper>

    );

  }



  if (id === 'cost-approach-section') {

    const costData = data?.COST_APPROACH || data || {};

    return (

      <Paper id={id} elevation={1} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: borderColor }}>

        <Box

          sx={{

            p: 1.5,

            bgcolor: 'grey.50',

            color: 'text.primary',

            borderBottom: '1px solid',

            borderColor: 'grey.200',

            display: 'flex',

            justifyContent: 'space-between',

            alignItems: 'center',

          }}>

          <Typography variant="h6" component="h5" sx={{ fontSize: '1.05rem', fontWeight: 'bold' }}>{title || "Cost Approach"}</Typography>

          {onRevisionButtonClick && (

            <Tooltip title="Revision Language">

              <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'text.secondary', ml: 'auto' }}><LibraryBooksIcon /></IconButton>

            </Tooltip>

          )}

        </Box>

        {loading && loadingSection === id && (

          <Box sx={{ width: '100%' }}><LinearProgress /></Box>

        )}

        <div className="card-body p-3" style={{ fontSize: '0.8rem', backgroundColor: '#fff' }}>



          <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '12px', marginBottom: '16px' }}>

            <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', marginBottom: '4px' }}>

              Provide adequate information for the lender/client to replicate the below cost figures and calculations.

            </div>

            <div style={{ minHeight: '40px', marginBottom: '12px' }}>

              <EditableField

                fieldPath={["COST_APPROACH", "Provide adequate information for the lender/client to replicate the below cost figures and calculations."]}

                value={renderValue(costData["Provide adequate information for the lender/client to replicate the below cost figures and calculations."] || '')}

                onDataChange={onDataChange}

                editingField={editingField}

                setEditingField={setEditingField}

                usePre={true}

                isMissing={false}

                isEditable={true}

                allData={allData}

                manualValidations={manualValidations}

                handleManualValidation={handleManualValidation}

                revisionHandlers={revisionHandlers}

                inputClassName="form-control form-control-sm field-value-pre"

                inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto', minHeight: '40px', resize: 'vertical' }}

              />

            </div>



            <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', marginBottom: '4px' }}>

              Support for the opinion of site value (summary of comparable land sales or other methods for estimating site value)

            </div>

            <div style={{ minHeight: '40px' }}>

              <EditableField

                fieldPath={["COST_APPROACH", "Support for the opinion of site value (summary of comparable land sales or other methods for estimating site value)"]}

                value={renderValue(costData["Support for the opinion of site value (summary of comparable land sales or other methods for estimating site value)"] || '')}

                onDataChange={onDataChange}

                editingField={editingField}

                setEditingField={setEditingField}

                usePre={true}

                isMissing={false}

                isEditable={true}

                allData={allData}

                manualValidations={manualValidations}

                handleManualValidation={handleManualValidation}

                revisionHandlers={revisionHandlers}

                inputClassName="form-control form-control-sm field-value-pre"

                inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto', minHeight: '40px', resize: 'vertical' }}

              />

            </div>

          </div>



          <div style={{ display: 'flex', gap: '24px' }}>

            <div style={{ flex: 1, minWidth: 0, borderRight: '1px solid #dee2e6', paddingRight: '16px' }}>

              <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '12px', borderBottom: '2px solid #343a40', paddingBottom: '4px' }}>

                SUPPORT & DETAILS

              </div>



              {renderCostField("ESTIMATED COST NEW TYPE", "Estimated")}

              {renderCostField("Source of Cost Data", "Source of cost data")}



              <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>

                  <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', minWidth: '80px', whiteSpace: 'nowrap' }}>Quality Rating</span>

                  <div style={{ flexGrow: 1 }}>

                    <EditableField

                      fieldPath={["COST_APPROACH", "Quality rating from cost service "]}

                      value={renderValue(costData["Quality rating from cost service "] || costData["Quality rating from cost service"] || costData["Quality Rating"] || '')}

                      onDataChange={onDataChange}

                      editingField={editingField}

                      setEditingField={setEditingField}

                      isEditable={true}

                      allData={allData}

                      manualValidations={manualValidations}

                      handleManualValidation={handleManualValidation}

                      revisionHandlers={revisionHandlers}

                      inputClassName="form-control form-control-sm field-value"

                      inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}

                    />

                  </div>

                  <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Effective Date</span>

                  <div style={{ width: '80px' }}>

                    <EditableField

                      fieldPath={["COST_APPROACH", "Effective date of cost data "]}

                      value={renderValue(costData["Effective date of cost data "] || costData["Effective date of cost data"] || costData["Effective Date"] || '')}

                      onDataChange={onDataChange}

                      editingField={editingField}

                      setEditingField={setEditingField}

                      isEditable={true}

                      allData={allData}

                      manualValidations={manualValidations}

                      handleManualValidation={handleManualValidation}

                      revisionHandlers={revisionHandlers}

                      inputClassName="form-control form-control-sm field-value"

                      inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}

                    />

                  </div>

                </div>

              </div>



              <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>

                <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', marginBottom: '4px' }}>

                  Comments on Cost Approach (gross living area calculations, depreciation, etc.)

                </div>

                <div style={{ minHeight: '60px', marginTop: '4px' }}>

                  <EditableField

                    fieldPath={["COST_APPROACH", "Comments on Cost Approach (gross living area calculations, depreciation, etc.)"]}

                    value={renderValue(costData["Comments on Cost Approach (gross living area calculations, depreciation, etc.)"] || '')}

                    onDataChange={onDataChange}

                    editingField={editingField}

                    setEditingField={setEditingField}

                    usePre={true}

                    isMissing={false}

                    isEditable={true}

                    allData={allData}

                    manualValidations={manualValidations}

                    handleManualValidation={handleManualValidation}

                    revisionHandlers={revisionHandlers}

                    inputClassName="form-control form-control-sm field-value-pre"

                    inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto', minHeight: '60px', resize: 'vertical' }}

                  />

                </div>

              </div>



              {renderCostField("Remaining Economic Life", "Estimated Remaining Economic Life (HUD and VA only)")}

            </div>



            <div style={{ flex: 1, minWidth: 0, paddingLeft: '16px' }}>

              <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '12px', borderBottom: '2px solid #343a40', paddingBottom: '4px' }}>

                COST CALCULATIONS

              </div>



              {renderCostField("OPINION OF SITE VALUE", "OPINION OF SITE VALUE = $ ................................................")}

              {renderCostField("DWELLING", "Dwelling")}

              {renderCostField("Basement", "Basement")}

              {renderCostField("Deck", "Deck")}

              {renderCostField("Garage/Carport", "Garage/Carport ")}

              {renderCostField("Total Estimate Cost-New", "Total Estimate of Cost-New = $ ...................")}



              <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>

                <div style={{ fontWeight: 'bold', color: '#6c757d', fontSize: '0.65rem', marginBottom: '2px' }}>

                  Less: Physical | Functional | External

                </div>

                {renderCostField("Depreciation", "Depreciation ")}

              </div>



              {renderCostField("Depreciated Cost of Improvements", "Depreciated Cost of Improvements......................................................=$ ")}

              {renderCostField("As-is Value Site Improvements", "“As-is” Value of Site Improvements......................................................=$")}



              <div style={{ marginTop: '12px', backgroundColor: '#e9ecef', padding: '6px', borderRadius: '4px' }}>

                {renderCostField("INDICATED VALUE BY COST APPROACH", "Indicated Value By Cost Approach......................................................=$")}

              </div>

            </div>

          </div>



        </div>

      </Paper>

    );

  }



  if (id === 'income-approach-section') {

    const incData = data?.INCOME_APPROACH || data || {};

    const rentVal = renderValue(incData["Estimated Monthly Market Rent $"] || incData["Estimated Monthly Market Rent"] || data?.["Estimated Monthly Market Rent $"] || '');

    const grmVal = renderValue(incData["X Gross Rent Multiplier  = $"] || incData["X Gross Rent Multiplier = $"] || incData["Gross Rent Multiplier"] || incData["X GROSS RENT MULTIPLIER = $"] || data?.["X Gross Rent Multiplier  = $"] || '');

    const indIncVal = renderValue(incData["Indicated Value by Income Approach"] || incData["Indicated Value by Income Approach $"] || incData["INDICATED VALUE BY INCOME APPROACH"] || data?.["Indicated Value by Income Approach"] || '');

    const sumVal = renderValue(incData["Summary of Income Approach (including support for market rent and GRM) "] || incData["Summary of Income Approach (including support for market rent and GRM)"] || incData["SUMMARY OF INCOME APPROACH"] || data?.["Summary of Income Approach (including support for market rent and GRM) "] || '');



    return (

      <Paper id={id} elevation={1} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: borderColor }}>

        <Box

          sx={{

            p: 1.5,

            bgcolor: 'grey.50',

            color: 'text.primary',

            borderBottom: '1px solid',

            borderColor: 'grey.200',

            display: 'flex',

            justifyContent: 'space-between',

            alignItems: 'center',

          }}>

          <Typography variant="h6" component="h5" sx={{ fontSize: '1.05rem', fontWeight: 'bold' }}>{title || "Income Approach"}</Typography>

          {onRevisionButtonClick && (

            <Tooltip title="Revision Language">

              <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'text.secondary', ml: 'auto' }}><LibraryBooksIcon /></IconButton>

            </Tooltip>

          )}

        </Box>

        {loading && loadingSection === id && (

          <Box sx={{ width: '100%' }}><LinearProgress /></Box>

        )}

        <div className="card-body p-3" style={{ fontSize: '0.8rem', backgroundColor: '#fff' }}>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px', borderBottom: '1px solid #dee2e6', paddingBottom: '12px' }}>

            <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px' }}>

              <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>Estimated Monthly Market Rent $</span>

              <EditableField

                fieldPath={["INCOME_APPROACH", "Estimated Monthly Market Rent $"]}

                value={rentVal}

                onDataChange={onDataChange}

                editingField={editingField}

                setEditingField={setEditingField}

                isEditable={true}

                allData={allData}

                manualValidations={manualValidations}

                handleManualValidation={handleManualValidation}

                revisionHandlers={revisionHandlers}

                inputClassName="form-control form-control-sm field-value"

                inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}

              />

            </div>

            <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px' }}>

              <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>X Gross Rent Multiplier = $</span>

              <EditableField

                fieldPath={["INCOME_APPROACH", "X Gross Rent Multiplier  = $"]}

                value={grmVal}

                onDataChange={onDataChange}

                editingField={editingField}

                setEditingField={setEditingField}

                isEditable={true}

                allData={allData}

                manualValidations={manualValidations}

                handleManualValidation={handleManualValidation}

                revisionHandlers={revisionHandlers}

                inputClassName="form-control form-control-sm field-value"

                inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}

              />

            </div>

            <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', backgroundColor: '#e9ecef', padding: '6px', borderRadius: '4px' }}>

              <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>Indicated Value by Income Approach</span>

              <EditableField

                fieldPath={["INCOME_APPROACH", "Indicated Value by Income Approach"]}

                value={indIncVal}

                onDataChange={onDataChange}

                editingField={editingField}

                setEditingField={setEditingField}

                isEditable={true}

                allData={allData}

                manualValidations={manualValidations}

                handleManualValidation={handleManualValidation}

                revisionHandlers={revisionHandlers}

                inputClassName="form-control form-control-sm field-value"

                inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}

              />

            </div>

          </div>



          <div>

            <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', marginBottom: '4px' }}>

              Summary of Income Approach (including support for market rent and GRM)

            </div>

            <EditableField

              fieldPath={["INCOME_APPROACH", "Summary of Income Approach (including support for market rent and GRM) "]}

              value={sumVal}

              onDataChange={onDataChange}

              editingField={editingField}

              setEditingField={setEditingField}

              usePre={true}

              isMissing={false}

              isEditable={true}

              allData={allData}

              manualValidations={manualValidations}

              handleManualValidation={handleManualValidation}

              revisionHandlers={revisionHandlers}

              inputClassName="form-control form-control-sm field-value-pre"

              inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto', minHeight: '60px', resize: 'vertical' }}

            />

          </div>

        </div>

      </Paper>

    );

  }



  if (id === 'uspap-identification-section' || id === 'uspap-section' || title === 'USPAP / Report Identification' || title === 'USPAP / Appraisal and Report Identification') {
    const uspapStatus = data?.["USPAP / Appraisal and Report Identification"] || data?.["Appraisal and Report Identification"] || allData?.["USPAP / Appraisal and Report Identification"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["USPAP / Appraisal and Report Identification"] || (allData?.has_uspap_identification ? 'Present' : (allData ? 'Not Present' : ''));
    const isPresent = String(uspapStatus).includes('Present') && !String(uspapStatus).toLowerCase().includes('not');

    const uspapRepOpt = data?.["USPAP Reporting Option"] || data?.["This report was prepared under the following USPAP reporting option:"] || allData?.["USPAP Reporting Option"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["USPAP Reporting Option"] || (isPresent ? 'Appraisal Report' : '');
    const exposureTime = data?.["Reasonable Exposure Time"] || data?.["Reasonable Exposure Time Comment"] || data?.["Exposure Comment"] || allData?.["Reasonable Exposure Time"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["Reasonable Exposure Time"] || allData?.clean_data?.Subject?.["Exposure comment"] || allData?.clean_data?.Subject?.["Reasonable Exposure Time"] || '';
    const priorServices = data?.["Prior Service Statement"] || data?.["Prior service comment"] || data?.["Prior Service Comment"] || allData?.["Prior Service Statement"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["Prior Service Statement"] || (isPresent ? 'I have NOT performed services, as an appraiser or in any other capacity, regarding the property that is the subject of this report within the three-year period immediately preceding acceptance of this assignment.' : '');
    const uspapComments = data?.["Comments on Appraisal and Report Identification"] || data?.["Restricted Appraisal Report Comment"] || allData?.["Comments on Appraisal and Report Identification"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["Comments on Appraisal and Report Identification"] || '';

    const hasAppraiserInspection = Boolean(
      (
        data?.has_appraiser_inspection ??
        allData?.clean_data?.USPAP_IDENTIFICATION?.has_appraiser_inspection ??
        allData?.USPAP_IDENTIFICATION?.has_appraiser_inspection ??
        (
          (data?.["Appraiser Did not inspect subject property"] && data?.["Appraiser Did not inspect subject property"] === 'Yes') ||
          (data?.["Appraiser Did inspect exterior of subject property from street"] && data?.["Appraiser Did inspect exterior of subject property from street"] === 'Yes') ||
          (data?.["Appraiser Did inspect interior and exterior of subject property"] && data?.["Appraiser Did inspect interior and exterior of subject property"] === 'Yes')
        )
      ) ||
      isPresent
    );

    const isBlankOrNone = (v) => {
      if (v === undefined || v === null) return true;
      const s = String(v).trim().toLowerCase();
      return (
        s === '' ||
        s === 'none' ||
        s === 'n/a' ||
        s === 'na' ||
        s === 'not present' ||
        s === 'null' ||
        s === 'undefined' ||
        s === 'false' ||
        s === 'no'
      );
    };

    const hasAppraiserFilled = Boolean(
      !isBlankOrNone(data?.["Name"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["Name"] || allData?.clean_data?.CERTIFICATION?.["Name"]) ||
      !isBlankOrNone(data?.["Signature"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["Signature"] || allData?.clean_data?.CERTIFICATION?.["Signature"]) ||
      !isBlankOrNone(data?.["State Certification #"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["State Certification #"] || allData?.clean_data?.CERTIFICATION?.["State Certification #"])
    );

    const hasSupervisory = Boolean(
      !isBlankOrNone(data?.["Supervisory Name"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["Supervisory Name"]) ||
      !isBlankOrNone(data?.["Supervisory Signature"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["Supervisory Signature"]) ||
      !isBlankOrNone(data?.["Supervisory State Certification #"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["Supervisory State Certification #"]) ||
      !isBlankOrNone(data?.["Supervisory or State License #"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["Supervisory or State License #"]) ||
      !isBlankOrNone(data?.["Supervisory Date Signed"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["Supervisory Date Signed"]) ||
      !isBlankOrNone(data?.["Supervisory State"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["Supervisory State"]) ||
      !isBlankOrNone(data?.["Supervisory Expiration Date of Certification or License"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["Supervisory Expiration Date of Certification or License"])
    );

    const sigImg = data?.["Signature Image"] || data?.["Appraiser Signature Image"] || allData?.USPAP_IDENTIFICATION?.["Signature Image"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["Signature Image"] || allData?.clean_data?.CERTIFICATION?.["Signature Image"] || allData?.clean_data?.["Signature Image"] || allData?.["Signature Image"] || '';
    const supSigImg = data?.["Supervisory Signature Image"] || allData?.["Supervisory Signature Image"] || allData?.USPAP_IDENTIFICATION?.["Supervisory Signature Image"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["Supervisory Signature Image"] || allData?.clean_data?.CERTIFICATION?.["Supervisory Signature Image"] || '';

    const isCorruptUspapVal = (val) => {
      if (!val) return false;
      const s = String(val).trim();
      return (
        s.startsWith('#: #:') ||
        /^[:#-]+$/.test(s) ||
        /^Date of (Certification|Appraisal|Signature|Inspection)/i.test(s) ||
        /^Report:\s*/i.test(s) ||
        /^Exterior-Only$/i.test(s) ||
        /^None$/i.test(s) ||
        /^Interior and Exterior$/i.test(s) ||
        /by a la mode/i.test(s) ||
        /1-800-ALAMODE/i.test(s)
      );
    };

    const renderUspapField = (label, fieldKey, isCheckbox = false, altKeys = []) => {
      if (isCheckbox) {
        const checkKeys = [fieldKey, ...(Array.isArray(altKeys) ? altKeys : [altKeys])];
        let isChecked = false;
        let matchedKey = fieldKey;
        for (const k of checkKeys) {
          const isApprInspKey = k.toLowerCase().includes('appraiser did') || k.toLowerCase().includes('did not inspect subject property (appraiser)');
          const v = data?.[k] ??
                    allData?.clean_data?.USPAP_IDENTIFICATION?.[k] ??
                    allData?.USPAP_IDENTIFICATION?.[k] ??
                    (!isApprInspKey ? (allData?.clean_data?.CERTIFICATION?.[k] ?? allData?.clean_data?.Certification?.[k] ?? allData?.CERTIFICATION?.[k] ?? allData?.[k]) : undefined);
          if (v === 'Yes' || v === true || String(v).toLowerCase() === 'x' || String(v).toLowerCase() === 'yes') {
            isChecked = true;
            matchedKey = k;
            break;
          }
        }

        // Default to "Interior and Exterior" if neither Did Not nor Exterior is marked
        if (!isChecked && (fieldKey.toLowerCase().includes('interior and exterior') && fieldKey.toLowerCase().includes('appraiser'))) {
          const didNotVal = data?.["Appraiser Did not inspect subject property"] ?? allData?.clean_data?.USPAP_IDENTIFICATION?.["Appraiser Did not inspect subject property"];
          const extVal = data?.["Appraiser Did inspect exterior of subject property from street"] ?? allData?.clean_data?.USPAP_IDENTIFICATION?.["Appraiser Did inspect exterior of subject property from street"];
          const didNotChecked = didNotVal === 'Yes' || didNotVal === true || String(didNotVal).toLowerCase() === 'x';
          const extChecked = extVal === 'Yes' || extVal === true || String(extVal).toLowerCase() === 'x';
          if (!didNotChecked && !extChecked && isPresent) {
            isChecked = true;
          }
        }

        const handleToggle = () => {
          const newValue = isChecked ? 'No' : 'Yes';
          onDataChange([fieldKey], newValue);
          if (matchedKey !== fieldKey) {
            onDataChange([matchedKey], newValue);
          }
          if (newValue === 'Yes') {
            const isApprInspection = fieldKey.toLowerCase().includes('appraiser did') || altKeys.some(k => String(k).toLowerCase().includes('appraiser'));
            const isSupInspection = (fieldKey.toLowerCase().includes('inspect') && !isApprInspection) || fieldKey.toLowerCase().includes('supervisory did');

            if (isApprInspection) {
              const apprGroup = [
                "Appraiser Did not inspect subject property",
                "Appraiser Did inspect exterior of subject property from street",
                "Appraiser Did inspect interior and exterior of subject property"
              ];
              apprGroup.forEach(k => {
                if (k !== fieldKey && k !== matchedKey) {
                  onDataChange([k], 'No');
                }
              });
            } else if (isSupInspection) {
              const supGroup = [
                "Did not inspect subject property",
                "Did inspect exterior of subject property from street",
                "Did inspect interior and exterior of subject property"
              ];
              supGroup.forEach(k => {
                if (k !== fieldKey && k !== matchedKey) {
                  onDataChange([k], 'No');
                }
              });
            }
          }
        };

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={handleToggle}
              style={{ width: '14px', height: '14px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#495057' }}>{label}</span>
          </div>
        );
      }

      let rawVal = data?.[fieldKey];
      if (rawVal === undefined || rawVal === null || isCorruptUspapVal(rawVal)) {
        rawVal = allData?.clean_data?.USPAP_IDENTIFICATION?.[fieldKey] ??
                 allData?.USPAP_IDENTIFICATION?.[fieldKey] ??
                 allData?.clean_data?.CERTIFICATION?.[fieldKey] ??
                 allData?.clean_data?.Certification?.[fieldKey] ??
                 allData?.CERTIFICATION?.[fieldKey] ??
                 allData?.[fieldKey] ?? '';
        if (isCorruptUspapVal(rawVal)) {
          rawVal = '';
        }
      }

      // Appraiser-specific fallback mappings
      if (!rawVal) {
        if (fieldKey === 'Name') {
          rawVal = allData?.clean_data?.CERTIFICATION?.['Name'] || allData?.clean_data?.Certification?.['Name'] || allData?.clean_data?.Subject?.['Appraiser Name'] || allData?.['Appraiser Name'] || allData?.['Name'] || '';
        } else if (fieldKey === 'Date Signed') {
          rawVal = allData?.clean_data?.CERTIFICATION?.['Date of Signature and Report'] || allData?.clean_data?.CERTIFICATION?.['Date of Signature'] || allData?.clean_data?.Certification?.['Date of Signature and Report'] || allData?.clean_data?.Certification?.['Date of Signature'] || allData?.clean_data?.Certification?.['Report Signed Date'] || allData?.['Date Signed'] || '';
        } else if (fieldKey === 'State Certification #') {
          rawVal = allData?.clean_data?.CERTIFICATION?.['State Certification #'] || allData?.clean_data?.CERTIFICATION?.['Appraiser License'] || allData?.clean_data?.Certification?.['State Certification #'] || allData?.clean_data?.Certification?.['Appraiser License'] || allData?.['State Certification #'] || '';
        } else if (fieldKey === 'or State License #') {
          rawVal = allData?.clean_data?.CERTIFICATION?.['or State License #'] || allData?.clean_data?.Certification?.['or State License #'] || allData?.['or State License #'] || '';
        } else if (fieldKey === 'State') {
          rawVal = allData?.clean_data?.CERTIFICATION?.['State'] || allData?.clean_data?.Certification?.['State'] || allData?.['State'] || '';
        } else if (fieldKey === 'Expiration Date of Certification or License') {
          rawVal = allData?.clean_data?.CERTIFICATION?.['Expiration Date of Certification or License'] || allData?.clean_data?.CERTIFICATION?.['Expiration Date'] || allData?.clean_data?.Certification?.['Expiration Date of Certification or License'] || allData?.clean_data?.Certification?.['Expiration Date'] || allData?.['Expiration Date'] || '';
        } else if (fieldKey === 'Effective Date of Appraisal') {
          rawVal = allData?.clean_data?.CERTIFICATION?.['Effective Date of Appraisal'] || allData?.clean_data?.CERTIFICATION?.['Effective Date'] || allData?.clean_data?.Certification?.['Effective Date of Appraisal'] || allData?.clean_data?.Certification?.['Effective Date'] || allData?.clean_data?.Subject?.['Effective Date of Appraisal'] || allData?.['Effective Date of Appraisal'] || '';
        }
      }

      // If supervisory field and not present in XML/PDF, ensure it is completely blank (no hardcoded fallback)
      if (String(fieldKey).toLowerCase().includes('supervisory') && (isCorruptUspapVal(rawVal) || rawVal === 'Not Present' || rawVal === 'N/A' || rawVal === 'NA')) {
        rawVal = '';
      }

      const val = renderValue(rawVal);
      return (
        <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '4px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', minWidth: '95px', whiteSpace: 'nowrap' }}>
              {label}:
            </span>
            <div style={{ flexGrow: 1 }}>
              <EditableField
                fieldPath={[fieldKey]}
                value={val}
                onDataChange={onDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={true}
                allData={allData}
                manualValidations={manualValidations}
                handleManualValidation={handleManualValidation}
                revisionHandlers={revisionHandlers}
                inputClassName="form-control form-control-sm field-value"
                inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.85rem', height: 'auto' }}
              />
            </div>
          </div>
        </div>
      );
    };

    return (
      <Paper id={id} elevation={1} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: borderColor }}>
        <Box
          sx={{
            p: 1.5,
            bgcolor: 'grey.50',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'grey.200',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" component="h5" sx={{ fontSize: '1.05rem', fontWeight: 'bold' }}>
              {title || "USPAP / Appraisal and Report Identification"}
            </Typography>
            {uspapStatus && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: isPresent ? '#d4edda' : '#f8d7da',
                color: isPresent ? '#155724' : '#721c24'
              }}>
                {uspapStatus}
              </span>
            )}
          </Box>
          {onRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'text.secondary', ml: 'auto' }}>
                <LibraryBooksIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        {loading && loadingSection === id && (
          <Box sx={{ width: '100%' }}><LinearProgress /></Box>
        )}
        <div className="card-body p-3" style={{ fontSize: '0.8rem', backgroundColor: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {/* USPAP Reporting Option */}
            <div style={{ borderBottom: '1px solid #f1f3f5', paddingBottom: '6px' }}>
              <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>
                This report was prepared under the following USPAP reporting option:
              </span>
              <EditableField
                fieldPath={["USPAP Reporting Option"]}
                value={renderValue(uspapRepOpt)}
                onDataChange={onDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={true}
                allData={allData}
                manualValidations={manualValidations}
                handleManualValidation={handleManualValidation}
                revisionHandlers={revisionHandlers}
                inputClassName="form-control form-control-sm field-value"
                inputStyle={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            {/* Reasonable Exposure Time */}
            <div style={{ borderBottom: '1px solid #f1f3f5', paddingBottom: '6px' }}>
              <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>
                Reasonable Exposure Time:
              </span>
              <EditableField
                fieldPath={["Reasonable Exposure Time"]}
                value={renderValue(exposureTime)}
                onDataChange={onDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={true}
                allData={allData}
                manualValidations={manualValidations}
                handleManualValidation={handleManualValidation}
                revisionHandlers={revisionHandlers}
                inputClassName="form-control form-control-sm field-value"
                inputStyle={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            {/* Prior Services Statement (3-Year Period) */}
            <div style={{ borderBottom: '1px solid #f1f3f5', paddingBottom: '6px' }}>
              <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>
                Prior Services (3-Year Period Disclosure):
              </span>
              <EditableField
                fieldPath={["Prior Service Statement"]}
                value={renderValue(priorServices)}
                onDataChange={onDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={true}
                allData={allData}
                manualValidations={manualValidations}
                handleManualValidation={handleManualValidation}
                revisionHandlers={revisionHandlers}
                inputClassName="form-control form-control-sm field-value"
                inputStyle={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            {/* Comments on Appraisal and Report Identification */}
            <div>
              <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>
                Comments on Appraisal and Report Identification:
              </span>
              <EditableField
                fieldPath={["Comments on Appraisal and Report Identification"]}
                value={renderValue(uspapComments)}
                onDataChange={onDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={true}
                allData={allData}
                manualValidations={manualValidations}
                handleManualValidation={handleManualValidation}
                revisionHandlers={revisionHandlers}
                inputClassName="form-control form-control-sm field-value"
                inputStyle={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            {/* Bottom Section: Two-Column Signature Block (APPRAISER & SUPERVISORY APPRAISER) */}
            <div style={{ display: 'flex', gap: '24px', marginTop: '16px', borderTop: '1px solid #dee2e6', paddingTop: '16px' }}>
              {/* Left Column: APPRAISER */}
              <div style={{
                flex: 1,
                minWidth: 0,
                border: hasAppraiserFilled ? '2px solid #dc3545' : '1px solid #ced4da',
                borderRadius: '4px',
                padding: '14px',
                backgroundColor: hasAppraiserFilled ? '#fffcfc' : '#fcfcfc'
              }}>
                <div style={{
                  fontWeight: 'bold',
                  fontSize: '0.95rem',
                  marginBottom: '14px',
                  borderBottom: hasAppraiserFilled ? '2px solid #dc3545' : '2px solid #343a40',
                  paddingBottom: '4px',
                  color: hasAppraiserFilled ? '#dc3545' : '#212529',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>APPRAISER:</span>
                  {hasAppraiserFilled && (
                    <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#dc3545', color: '#ffffff', fontWeight: 'bold' }}>
                      Appraiser Section Filled
                    </span>
                  )}
                </div>

                {/* Signature Line */}
                <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '4px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', minWidth: '95px', whiteSpace: 'nowrap' }}>Signature:</span>
                    <div style={{ flexGrow: 1 }}>
                      {sigImg && (
                        <div style={{ marginBottom: '4px' }}>
                          <img src={sigImg} alt="Appraiser Signature" style={{ maxHeight: '48px', maxWidth: '100%', objectFit: 'contain' }} />
                        </div>
                      )}
                      <EditableField
                        fieldPath={["Signature"]}
                        value={renderValue(data?.["Signature"] || data?.["Name"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["Signature"] || allData?.clean_data?.CERTIFICATION?.["Signature"] || allData?.clean_data?.CERTIFICATION?.["Name"] || allData?.["Name"] || '')}
                        onDataChange={onDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={true}
                        allData={allData}
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                        revisionHandlers={revisionHandlers}
                        inputClassName="form-control form-control-sm field-value"
                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.85rem', height: 'auto' }}
                        valueStyle={{ fontFamily: "'Caveat', 'Dancing Script', 'Brush Script MT', cursive, sans-serif", fontSize: '1.25rem', color: '#1a252c', fontStyle: 'italic' }}
                      />
                    </div>
                  </div>
                </div>

                {renderUspapField("Name", "Name")}
                {renderUspapField("Date Signed", "Date Signed")}
                {renderUspapField("State Certification #", "State Certification #")}
                {renderUspapField("or State License #", "or State License #")}
                {renderUspapField("State", "State")}
                {renderUspapField("Expiration Date of Certification or License", "Expiration Date of Certification or License")}
                {renderUspapField("Effective Date of Appraisal", "Effective Date of Appraisal")}

                {/* Appraiser Inspection of Subject Property - Only rendered if present in the USPAP report */}
                {hasAppraiserInspection && (
                  <div style={{ marginTop: '14px', borderTop: '1px dashed #dee2e6', paddingTop: '10px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#495057', marginBottom: '6px' }}>
                      Appraiser Inspection of Subject Property:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      {renderUspapField("Did Not", "Appraiser Did not inspect subject property", true, [
                        "Did not inspect subject property (Appraiser)",
                        "Appraiser Did Not Inspect"
                      ])}
                      {renderUspapField("Exterior-only from Street", "Appraiser Did inspect exterior of subject property from street", true, [
                        "Did inspect exterior of subject property from street (Appraiser)",
                        "Appraiser Did Inspect Exterior"
                      ])}
                      {renderUspapField("Interior and Exterior", "Appraiser Did inspect interior and exterior of subject property", true, [
                        "Did inspect interior and exterior of subject property (Appraiser)",
                        "Appraiser Did Inspect Interior and Exterior"
                      ])}
                    </div>
                    {(data?.["Appraiser Date of Inspection"] || data?.["Date of Inspection (if applicable)"] || data?.["Date of Inspection"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["Appraiser Date of Inspection"]) && (
                      <div style={{ marginTop: '8px' }}>
                        {renderUspapField("Date of Inspection (if applicable)", "Appraiser Date of Inspection", false, [
                          "Date of Inspection (if applicable)",
                          "Date of Inspection",
                          "Appraiser Inspection Date"
                        ])}
                      </div>
                    )}
                  </div>
                )}


              </div>

              {/* Right Column: SUPERVISORY APPRAISER (only if required) */}
              <div style={{
                flex: 1,
                minWidth: 0,
                border: hasSupervisory ? '2px solid #dc3545' : '1px solid #ced4da',
                borderRadius: '4px',
                padding: '14px',
                backgroundColor: hasSupervisory ? '#fff8f8' : '#fcfcfc'
              }}>
                <div style={{
                  fontWeight: 'bold',
                  fontSize: '0.95rem',
                  marginBottom: '14px',
                  borderBottom: hasSupervisory ? '2px solid #dc3545' : '2px solid #343a40',
                  paddingBottom: '4px',
                  color: hasSupervisory ? '#dc3545' : '#212529',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    SUPERVISORY APPRAISER: <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: hasSupervisory ? '#dc3545' : '#6c757d' }}>(only if required)</span>
                  </div>
                  {hasSupervisory && (
                    <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#dc3545', color: '#ffffff', fontWeight: 'bold' }}>
                      Supervisory Appraiser Filled (Review Required)
                    </span>
                  )}
                </div>

                {/* Signature Line */}
                <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '4px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', minWidth: '95px', whiteSpace: 'nowrap' }}>Signature:</span>
                    <div style={{ flexGrow: 1 }}>
                      {supSigImg && (
                        <div style={{ marginBottom: '4px' }}>
                          <img src={supSigImg} alt="Supervisory Signature" style={{ maxHeight: '48px', maxWidth: '100%', objectFit: 'contain' }} />
                        </div>
                      )}
                      <EditableField
                        fieldPath={["Supervisory Signature"]}
                        value={renderValue(data?.["Supervisory Signature"] || data?.["Supervisory Name"] || allData?.clean_data?.USPAP_IDENTIFICATION?.["Supervisory Signature"] || allData?.clean_data?.CERTIFICATION?.["Supervisory Signature"] || allData?.CERTIFICATION?.["Supervisory Signature"] || '')}
                        onDataChange={onDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={true}
                        allData={allData}
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                        revisionHandlers={revisionHandlers}
                        inputClassName="form-control form-control-sm field-value"
                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.85rem', height: 'auto' }}
                        valueStyle={{ fontFamily: "'Caveat', 'Dancing Script', 'Brush Script MT', cursive, sans-serif", fontSize: '1.25rem', color: '#1a252c', fontStyle: 'italic' }}
                      />
                    </div>
                  </div>
                </div>

                {renderUspapField("Name", "Supervisory Name")}
                {renderUspapField("Date Signed", "Supervisory Date Signed")}
                {renderUspapField("State Certification #", "Supervisory State Certification #")}
                {renderUspapField("or State License #", "Supervisory or State License #")}
                {renderUspapField("State", "Supervisory State")}
                {renderUspapField("Expiration Date of Certification or License", "Supervisory Expiration Date of Certification or License")}

                {/* Supervisory Inspection of Subject Property */}
                <div style={{ marginTop: '14px', borderTop: '1px dashed #dee2e6', paddingTop: '10px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#495057', marginBottom: '6px' }}>
                    Supervisory Appraiser Inspection of Subject Property:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {renderUspapField("Did Not", "Did not inspect subject property", true, [
                      "Supervisory Did not inspect subject property",
                      "Supervisory Did Not Inspect"
                    ])}
                    {renderUspapField("Exterior-only from Street", "Did inspect exterior of subject property from street", true, [
                      "Supervisory Did inspect exterior of subject property from street",
                      "Supervisory Did Inspect Exterior"
                    ])}
                    {renderUspapField("Interior and Exterior", "Did inspect interior and exterior of subject property", true, [
                      "Supervisory Did inspect interior and exterior of subject property",
                      "Supervisory Did Inspect Interior and Exterior"
                    ])}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Paper>
    );
  }

  if (id === 'appraiser-section') {

    const isBlankOrNoneCert = (v) => {
      if (v === undefined || v === null) return true;
      const s = String(v).trim().toLowerCase();
      return (
        s === '' ||
        s === 'none' ||
        s === 'n/a' ||
        s === 'na' ||
        s === 'not present' ||
        s === 'null' ||
        s === 'undefined' ||
        s === 'false' ||
        s === 'no'
      );
    };

    const hasCertAppraiserFilled = Boolean(
      !isBlankOrNoneCert(data?.["Name"]) ||
      !isBlankOrNoneCert(data?.["Signature"]) ||
      !isBlankOrNoneCert(data?.["State Certification #"]) ||
      !isBlankOrNoneCert(data?.["Company Name"])
    );

    const hasCertSupervisory = Boolean(
      !isBlankOrNoneCert(data?.["Supervisory Name"]) ||
      !isBlankOrNoneCert(data?.["Supervisory Signature"]) ||
      !isBlankOrNoneCert(data?.["Supervisory Appraiser Name"]) ||
      !isBlankOrNoneCert(data?.["Supervisory Appraiser Signature"]) ||
      !isBlankOrNoneCert(data?.["Supervisory State Certification #"]) ||
      !isBlankOrNoneCert(data?.["Supervisory or State License #"])
    );

    const hasAppraisedValue = data && data["APPRAISED VALUE OF SUBJECT PROPERTY $"] && String(data["APPRAISED VALUE OF SUBJECT PROPERTY $"]).trim() !== '';

    const hasSubjectInspection = data && (data["Did not inspect subject property"] === 'Yes' || data["Did inspect exterior of subject property from street"] === 'Yes' || data["Did inspect interior and exterior of subject property"] === 'Yes');

    const hasCompInspection = data && (data["Did not inspect exterior of comparable sales from street"] === 'Yes' || data["Did inspect exterior of comparable sales from street"] === 'Yes');

    const hasLenderData = data && (data["LENDER/CLIENT Name"] || data["Lender/Client Company Name"] || data["Lender/Client Company Address"] || data["Lender/Client Email Address"]);



    return (

      <Paper id={id} elevation={1} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: borderColor }}>

        <Box

          sx={{

            p: 1.5,

            bgcolor: 'grey.50',

            color: 'text.primary',

            borderBottom: '1px solid',

            borderColor: 'grey.200',

            display: 'flex',

            justifyContent: 'space-between',

            alignItems: 'center',

          }}>

          <Typography variant="h6" component="h5" sx={{ fontSize: '1.05rem', fontWeight: 'bold' }}>{title}</Typography>

          {onRevisionButtonClick && (

            <Tooltip title="Revision Language">

              <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'text.secondary', ml: 'auto' }}><LibraryBooksIcon /></IconButton>

            </Tooltip>

          )}

        </Box>

        {loading && loadingSection === id && (

          <Box sx={{ width: '100%' }}><LinearProgress /></Box>

        )}

        <div className="card-body p-3" style={{ fontSize: '0.8rem', backgroundColor: '#fff' }}>



          <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>

            <div style={{ flex: 1, minWidth: 0, border: hasCertAppraiserFilled ? '2px solid #dc3545' : '1px solid #ced4da', borderRadius: '4px', padding: '14px', backgroundColor: hasCertAppraiserFilled ? '#fffcfc' : '#fcfcfc' }}>

              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '12px', borderBottom: hasCertAppraiserFilled ? '2px solid #dc3545' : '2px solid #343a40', paddingBottom: '4px', color: hasCertAppraiserFilled ? '#dc3545' : '#212529', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                <span>APPRAISER</span>
                {hasCertAppraiserFilled && (
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#dc3545', color: '#ffffff', fontWeight: 'bold' }}>
                    Appraiser Section Filled
                  </span>
                )}

              </div>

              {data && data["Signature"] && String(data["Signature"]).trim() !== '' && (

                <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>

                    <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', minWidth: '100px', whiteSpace: 'nowrap' }}>Signature</span>

                    <div style={{ flexGrow: 1 }}>

                      <EditableField

                        fieldPath={["Signature"]}

                        value={data ? renderValue(data["Signature"]) : ''}

                        onDataChange={onDataChange}

                        editingField={editingField}

                        setEditingField={setEditingField}

                        isEditable={true}

                        allData={allData}

                        manualValidations={manualValidations}

                        handleManualValidation={handleManualValidation}

                        revisionHandlers={revisionHandlers}

                        inputClassName="form-control form-control-sm field-value"

                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}

                        valueStyle={{ fontFamily: "'Caveat', 'Dancing Script', 'Brush Script MT', cursive, sans-serif", fontSize: '1.25rem', color: '#1a252c', fontStyle: 'italic' }}

                      />

                    </div>

                  </div>

                </div>

              )}

              {renderCertField("Name", "Name")}

              {renderCertField("Company Name", "Company Name")}

              {renderCertField("Company Address", "Company Address")}

              {renderCertField("Telephone Number", "Telephone Number")}

              {renderCertField("Email Address", "Email Address")}

              {renderCertField("Date of Signature", "Date of Signature and Report")}

              {renderCertField("Effective Date of Appraisal", "Effective Date of Appraisal")}

              {renderCertField("State Certification #", "State Certification #")}

              {renderCertField("or State License #", "or State License #")}





              {(!hideEmptyFields || (data && (data["or Other (describe)"] || data["State #"]))) && (

                <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>

                    <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', minWidth: '100px', whiteSpace: 'nowrap' }}>or Other (describe)</span>

                    <div style={{ flexGrow: 1 }}>

                      <EditableField

                        fieldPath={["or Other (describe)"]}

                        value={data ? renderValue(data["or Other (describe)"]) : ''}

                        onDataChange={onDataChange}

                        editingField={editingField}

                        setEditingField={setEditingField}

                        isEditable={true}

                        allData={allData}

                        manualValidations={manualValidations}

                        handleManualValidation={handleManualValidation}

                        revisionHandlers={revisionHandlers}

                        inputClassName="form-control form-control-sm field-value"

                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}

                      />

                    </div>

                    <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem' }}>State #</span>

                    <div style={{ width: '80px' }}>

                      <EditableField

                        fieldPath={["State #"]}

                        value={data ? renderValue(data["State #"]) : ''}

                        onDataChange={onDataChange}

                        editingField={editingField}

                        setEditingField={setEditingField}

                        isEditable={true}

                        allData={allData}

                        manualValidations={manualValidations}

                        handleManualValidation={handleManualValidation}

                        revisionHandlers={revisionHandlers}

                        inputClassName="form-control form-control-sm field-value"

                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}

                      />

                    </div>

                  </div>

                </div>

              )}



              {renderCertField("State", "State")}

              {renderCertField("Expiration Date", "Expiration Date of Certification or License")}

            </div>



            {/* Right: SUPERVISORY APPRAISER */}

            <div style={{ flex: 1, minWidth: 0, border: hasCertSupervisory ? '2px solid #dc3545' : '1px solid #ced4da', borderRadius: '4px', padding: '14px', backgroundColor: hasCertSupervisory ? '#fff8f8' : '#fcfcfc' }}>

              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '12px', borderBottom: hasCertSupervisory ? '2px solid #dc3545' : '2px solid #343a40', paddingBottom: '4px', color: hasCertSupervisory ? '#dc3545' : '#212529', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                <div>
                  SUPERVISORY APPRAISER <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: hasCertSupervisory ? '#dc3545' : '#6c757d' }}>(ONLY IF REQUIRED)</span>
                </div>
                {hasCertSupervisory && (
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#dc3545', color: '#ffffff', fontWeight: 'bold' }}>
                    Supervisory Appraiser Filled (Review Required)
                  </span>
                )}

              </div>

              <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>

                  <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', minWidth: '100px', whiteSpace: 'nowrap' }}>Signature</span>

                  <div style={{ flexGrow: 1 }}>

                    <EditableField

                      fieldPath={["Supervisory Signature"]}

                      value={data ? renderValue(data["Supervisory Signature"] || data["Supervisory Appraiser Signature"] || '') : ''}

                      onDataChange={onDataChange}

                      editingField={editingField}

                      setEditingField={setEditingField}

                      isEditable={true}

                      allData={allData}

                      manualValidations={manualValidations}

                      handleManualValidation={handleManualValidation}

                      revisionHandlers={revisionHandlers}

                      inputClassName="form-control form-control-sm field-value"

                      inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}

                      valueStyle={{ fontFamily: "'Caveat', 'Dancing Script', 'Brush Script MT', cursive, sans-serif", fontSize: '1.25rem', color: '#1a252c', fontStyle: 'italic' }}

                    />

                  </div>

                </div>

              </div>

              {renderCertField("Name", "Supervisory Name")}

              {renderCertField("Company Name", "Supervisory Company Name")}

              {renderCertField("Company Address", "Supervisory Company Address")}

              {renderCertField("Telephone Number", "Supervisory Telephone Number")}

              {renderCertField("Email Address", "Supervisory Email Address")}

              {renderCertField("Date of Signature", "Supervisory Date of Signature")}

              {renderCertField("State Certification #", "Supervisory State Certification #")}

              {renderCertField("or State License #", "Supervisory or State License #")}

              {renderCertField("State", "Supervisory State")}

              {renderCertField("Expiration Date", "Supervisory Expiration Date of Certification or License")}

            </div>

          </div>



          <div style={{ display: 'flex', gap: '24px', borderTop: '2px solid #495057', paddingTop: '16px' }}>

            <div style={{ flex: 1, minWidth: 0 }}>

              <div style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '8px', color: '#343a40' }}>

                ADDRESS OF PROPERTY APPRAISED

              </div>

              {renderCertField("Address", "ADDRESS OF PROPERTY APPRAISED")}



              {(!hideEmptyFields || hasAppraisedValue) && (

                <>

                  <div style={{ fontWeight: 'bold', fontSize: '0.8rem', marginTop: '16px', marginBottom: '8px', color: '#343a40' }}>

                    APPRAISED VALUE OF SUBJECT PROPERTY

                  </div>

                  {renderCertField("Appraised Value $", "APPRAISED VALUE OF SUBJECT PROPERTY $")}

                </>

              )}



              {(!hideEmptyFields || hasLenderData) && (

                <>

                  <div style={{ fontWeight: 'bold', fontSize: '0.8rem', marginTop: '16px', marginBottom: '8px', color: '#343a40' }}>

                    LENDER/CLIENT

                  </div>

                  {renderCertField("Name", "LENDER/CLIENT Name")}

                  {renderCertField("Company Name", "Lender/Client Company Name")}

                  {renderCertField("Company Address", "Lender/Client Company Address")}

                  {renderCertField("Email Address", "Lender/Client Email Address")}

                </>

              )}

            </div>



            {(!hideEmptyFields || hasSubjectInspection || hasCompInspection) && (

              <div style={{ flex: 1, minWidth: 0 }}>

                {(!hideEmptyFields || hasSubjectInspection) && (

                  <>

                    <div style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '8px', color: '#343a40' }}>

                      SUBJECT PROPERTY

                    </div>

                    {renderCertField("Did not inspect subject property", "Did not inspect subject property", true)}

                    {renderCertField("Did inspect exterior of subject property from street", "Did inspect exterior of subject property from street", true)}

                    <div style={{ paddingLeft: '24px' }}>

                      {renderCertField("Date of Inspection", "Subject Property Date of Inspection (Exterior)")}

                    </div>

                    {renderCertField("Did inspect interior and exterior of subject property", "Did inspect interior and exterior of subject property", true)}

                    <div style={{ paddingLeft: '24px' }}>

                      {renderCertField("Date of Inspection", "Subject Property Date of Inspection (Interior/Exterior)")}

                    </div>

                  </>

                )}



                {(!hideEmptyFields || hasCompInspection) && (

                  <>

                    <div style={{ fontWeight: 'bold', fontSize: '0.8rem', marginTop: '16px', marginBottom: '8px', color: '#343a40' }}>

                      COMPARABLE SALES

                    </div>

                    {renderCertField("Did not inspect exterior of comparable sales from street", "Did not inspect exterior of comparable sales from street", true)}

                    {renderCertField("Did inspect exterior of comparable sales from street", "Did inspect exterior of comparable sales from street", true)}

                    <div style={{ paddingLeft: '24px' }}>

                      {renderCertField("Date of Inspection", "Comparable Sales Date of Inspection")}

                    </div>

                  </>

                )}

              </div>

            )}

          </div>





          <div style={{ borderTop: '1px dashed #dee2e6', marginTop: '20px', paddingTop: '12px' }}>

            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#6c757d', marginBottom: '8px' }}>

              Additional Info & E&O Insurance

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>

              {renderCertField("E&O", "E&O")}

              {renderCertField("Invoice Attached", "Invoice Attached")}

              {renderCertField("USPAP Reporting Option", "USPAP Reporting Option")}

              {renderCertField("E&O Insurance", "E&O Insurance")}

              {renderCertField("Policy Period From", "Policy Period From")}

              {renderCertField("Policy Period To", "Policy Period To")}

              {renderCertField("E&O Insured", "E&O Insured")}

              {renderCertField("E&O Carrier", "E&O Carrier")}

              {renderCertField("E&O Limit", "E&O Limit")}

              {renderCertField("E&O Deductible", "E&O Deductible")}

              {renderCertField("Appraiser License", "Appraiser License")}

              {renderCertField("License Valid To", "License Valid To")}

              {renderCertField("License # / Reg #", "LICENSE/REGISTRATION/CERTIFICATION #")}

            </div>

          </div>



        </div>

      </Paper>

    );

  }



  return (

    <Paper id={id} elevation={1} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: borderColor }}>

      <Box

        sx={{

          p: 1.5,

          bgcolor: 'grey.50',

          color: 'text.primary',

          borderBottom: '1px solid',

          borderColor: 'grey.200',

          display: 'flex',

          justifyContent: 'space-between',

          alignItems: 'center',

        }}>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>

          <Typography variant="h6" component="h5" sx={{ fontSize: '1.05rem', fontWeight: 'bold' }}>{title}</Typography>

          {renderNeighborhoodTotal()}

        </Box>

        {onRevisionButtonClick && (

          <Tooltip title="Revision Language">

            <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'text.secondary', ml: 'auto' }}><LibraryBooksIcon /></IconButton>

          </Tooltip>

        )}

      </Box>

      {loading && loadingSection === id && (

        <Box sx={{ width: '100%' }}><LinearProgress /></Box>

      )}

      <div className="card-body subject-grid-container">

        {getDynamicFields().map(field => renderGridItem(field))}

      </div>

    </Paper>

  );

};

