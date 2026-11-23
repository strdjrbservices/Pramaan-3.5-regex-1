import React from 'react';
import { SubjectInfoCard, GridInfoCard, MarketConditionsTable } from '../components/FormComponents';
import { CondoCoopProjectsTable } from '../components/tables';
import ActionButtons from '../components/ActionButtons';
import MapAndSketchExhibitsSection from '../components/MapAndSketchExhibitsSection';
import SalesComparisonSection from '../components/SalesComparisonSection';
import ComparableRentScheduleSection from '../components/ComparableRentScheduleSection';
import ManufacturedHomeTable from './ManufacturedHomeTable';
import Improvements1004C from './Improvements1004C';
import CostApproach1004C from './CostApproach1004C';

export const MANUFACTURED_HOME_FIELDS = [
  "Is the HUD Data Plate/Compliance Certificate attached to the dwelling?",
  "If Yes, identify the location. If No, provide the data source(s) for the HUD Data Plate/Compliance Certificate information.",
  "HUD Data Plate Location",
  "Is a HUD Certification Label attached to the exterior of each section of the dwelling?",
  "HUD Certification Label #(s)",
  "Manufacturer’s Serial #(s)/VIN #(s)",
  "Manufacturer's Name",
  "Trade/Model",
  "Date of Manufacture",
  "Do the Wind, Roof Load, and Thermal Zones meet the minimum HUD requirements for the location of the subject property? Yes No If No, explain",
];

export const contractFields1004C = [
  "I did did not analyze the contract for sale for the subject purchase transaction. Explain the results of the analysis of the contract for sale or why the analysis was not performed.",
  "Contract Price $",
  "Date of Contract",
  "Is property seller owner of public record?",
  "Data Source(s)",
  "Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?",
  "If Yes, report the total dollar amount and describe the items to be paid",
  "I did did not analyze the manufacturer’s invoice. Explain the results of the analysis of the manufacturer’s invoice or why the analysis was not performed.",
  "Retailer's Name (New Construction)"
];

export const siteFields1004C = [
  "Dimensions",
  "Area",
  "Shape",
  "View",
  "Specific Zoning Classification",
  "Zoning Description",
  "Zoning Compliance",
  "Is the highest and best use of subject property as improved (or as proposed per plans and specifications) the present use?",
  "Electricity",
  "Gas",
  "Water",
  "Sanitary Sewer",
  "Street",
  "Alley",
  "Is the site size, shape and topography generally conforming to and acceptable in the market area? Yes No If No, explain",
  "Is there adequate vehicular access to the subject property? Yes No If No, describe",
  "Is the street properly maintained? Yes No If No, describe",
  "FEMA Special Flood Hazard Area",
  "FEMA Flood Zone",
  "FEMA Map #",
  "FEMA Map Date",
  "Are the utilities and off-site improvements typical for the market area?",
  "Are the utilities and off-site improvements typical for the market area? If No, describe",
  "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? If Yes, describe"
];

export const improvementsFields1004C = [
  "# of Units",
  "# of Stories",
  "Type",
  "Existing/Proposed/Under Const.",
  "Design (Style)",
  "Year Built",
  "Effective Age (Yrs)",
  "# of Sections",
  "Section Dimensions",
  "Section One",
  "Section Two",
  "Installer’s Name",
  "Date Installed",
  "Model Year",
  "Foundation Type",
  "Poured Concrete / Concrete Runners / Block & Pier / Other-att. description / Full Basement / Partial Basement",
  "Foundation Walls (Material/Condition)",
  "Evidence of (Foundation)",
  "Is the manufactured home attached to a permanent foundation system? Yes No If No, describe the foundation sytem and the manner of attachment.",
  "Is the manufactured home attached to a permanent foundation system?",
  "If No, describe the foundation system and the manner of attachment.",
  "Have the towing hitch, wheels, and axles been removed? Yes No If No, explain",
  "Have the towing hitch, wheels, and axles been removed?",
  "Is the manufactured home permanently connected to a septic tank or sewage system and other utilities? Yes No If No, explain",
  "Does the dwelling have sufficient gross living area and room dimensions to be acceptable to the market? Yes No If No, explain",
  "Exterior Walls (Material/Condition)",
  "Roof Surface (Material/Condition)",
  "Gutters & Downspouts (Material/Condition)",
  "Window Type (Material/Condition)",
  "Storm Sash/Insulated",
  "Screens",
  "Floors (Material/Condition)",
  "Walls (Material/Condition)",
  "Trim/Finish (Material/Condition)",
  "Bath Floor (Material/Condition)",
  "Bath Wainscot (Material/Condition)",
  "Attic",
  "Heating Type",
  "Fuel",
  "Cooling Type",
  "Fireplace(s) #",
  "Patio/Deck",
  "Pool",
  "Woodstove(s) #",
  "Fence",
  "Porch",
  "Other in Amenities",
  "Car Storage",
  "Driveway # of Cars",
  "Driveway Surface",
  "Garage # of Cars",
  "Carport # of Cars",
  "Att./Det./Built-in",
  "Appliances",
  "Finished area above grade Rooms",
  "Finished area above grade Bedrooms",
  "Finished area above grade Bath(s)",
  "Square Feet of Gross Living Area Above Grade",
  "Describe any additions or modifications (decks, rooms, remodeling, etc.)",
  "Additional features (special energy efficient items, non-realty items, etc.)",
  "Additional features",
  "The appraiser must rate the quality of construction for the subject unit based on objective criteria (such as N.A.D.A. Manufactured Housing Appraisal Guide®, Marshall & Swift Residential Cost Handbook®, or other published cost service).",
  "The appraiser must rate the quality of construction for the subject unit based on objective criteria (such as N.A.D.A. Manufactured Housing Appraisal Guide®, Marshall & Swift Residential Cost Handbook, etc.)",
  "Quality Poor Fair Average Good Excellent Identify source of quality rating",
  "Quality Rating (Cost Service)",
  "Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)",
  "Describe the condition of the property",
  "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe",
  "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?",
];

const Form1004C = ({
  data, allData, extractionAttempted, handleDataChange, editingField, setEditingField,
  highlightedSubjectFields, highlightedContractFields, highlightedSiteFields,
  condoCoopProjectsRows, condoForeclosureFields, subjectFields, contractFields,
  neighborhoodFields, siteFields, improvementsFields, salesGridRows, comparableSales,
  salesHistoryFields, salesComparisonAdditionalInfoFields, reconciliationFields,
  costApproachFields, incomeApproachFields, pudInformationFields, marketConditionsRows,
  marketConditionsFields, appraiserFields, appraisalAndReportIdentificationFields, formType, comparisonData, getComparisonStyle,
  infoOfSalesFields, loading, loadingSection, handleStateRequirementCheck, stateReqLoading,
  handleClientRequirementCheck, clientReqLoading, handleEscalationCheck, escalationLoading,
  manualValidations, handleManualValidation, onSubjectRevisionButtonClick, onContractRevisionButtonClick,
  onNeighborhoodRevisionButtonClick, onSiteRevisionButtonClick, onImprovementsRevisionButtonClick,
  onSalesGridRevisionButtonClick, onReconciliationRevisionButtonClick, onCostApproachRevisionButtonClick,
  onCertificationRevisionButtonClick, on1007RevisionButtonClick, selectedFile, revisionHandlers,
  comparableRents, RentSchedulesFIELDS2, rentScheduleReconciliationFields
}) => {
  const is1007Present = Boolean(
    formType === '1004C + 1007' ||
    allData?.formType === '1004C + 1007' ||
    (typeof formType === 'string' && formType.includes('1007')) ||
    (typeof allData?.formType === 'string' && allData?.formType.includes('1007')) ||
    (typeof data?.['Form Type'] === 'string' && data['Form Type'].includes('1007')) ||
    (typeof allData?.['Form Type'] === 'string' && allData['Form Type'].includes('1007')) ||
    data?.has_1007 === true ||
    allData?.has_1007 === true ||
    data?.clean_data?.has_1007 === true ||
    allData?.clean_data?.has_1007 === true
  );

  const effectiveSiteFields = React.useMemo(() => {
    const base = (siteFields && siteFields.length > 0) ? [...siteFields] : [...siteFields1004C];
    const questionsToAdd = [
      "Is the site size, shape and topography generally conforming to and acceptable in the market area? Yes No If No, explain",
      "Is there adequate vehicular access to the subject property? Yes No If No, describe",
      "Is the street properly maintained? Yes No If No, describe"
    ];

    const targetList = [...base];
    const insertIdx = targetList.indexOf('Alley') !== -1
      ? targetList.indexOf('Alley') + 1
      : (targetList.indexOf('Street') !== -1 ? targetList.indexOf('Street') + 1 : targetList.length);

    let offset = 0;
    for (const q of questionsToAdd) {
      if (!targetList.includes(q)) {
        targetList.splice(insertIdx + offset, 0, q);
        offset++;
      }
    }
    return targetList;
  }, [siteFields]);

  const siteData1004C = React.useMemo(() => {
    const merged = {
      ...(data?.SITE || {}),
      ...(data?.Site || {}),
      ...(data?.clean_data?.Site || {}),
      ...(allData?.SITE || {}),
      ...(allData?.Site || {}),
      ...(allData?.clean_data?.Site || {}),
    };

    const q1Key = "Is the site size, shape and topography generally conforming to and acceptable in the market area? Yes No If No, explain";
    if (!merged[q1Key]) {
      const val = merged["Is the site size, shape and topography generally conforming to and acceptable in the market area?"]
        || merged["ConformsToNeighborhoodInTermsOfSizeAndShape"]
        || merged["Site Conforming To Market Area"]
        || "Yes";
      merged[q1Key] = val;
    }

    const q2Key = "Is there adequate vehicular access to the subject property? Yes No If No, describe";
    if (!merged[q2Key]) {
      const val = merged["Is there adequate vehicular access to the subject property?"]
        || merged["StreetAccess"]
        || merged["Vehicular Access"]
        || "Yes";
      merged[q2Key] = val;
    }

    const q3Key = "Is the street properly maintained? Yes No If No, describe";
    if (!merged[q3Key]) {
      const val = merged["Is the street properly maintained?"]
        || merged["StreetMaintenance"]
        || merged["Street Maintained"]
        || "Yes";
      merged[q3Key] = val;
    }

    return merged;
  }, [data, allData]);

  const effectiveSubjectFields = React.useMemo(() => {
    const targetField = "Project Type (if applicable):-  PUD  / Condominium / Cooperative / Other (describe)";
    const base = (subjectFields && subjectFields.length > 0) ? [...subjectFields] : [];
    if (base.includes(targetField)) return base;

    const list = [...base];
    const occIdx = list.indexOf('Occupant');
    if (occIdx !== -1) {
      list.splice(occIdx + 1, 0, targetField);
    } else {
      const pudIdx = list.indexOf('PUD');
      if (pudIdx !== -1) {
        list.splice(pudIdx, 0, targetField);
      } else {
        list.push(targetField);
      }
    }
    return list;
  }, [subjectFields]);

  const effectiveContractFields = React.useMemo(() => {
    const base = (contractFields && contractFields.length > 0) ? [...contractFields] : [...contractFields1004C];
    const fieldsToAdd = [
      "I did did not analyze the manufacturer’s invoice. Explain the results of the analysis of the manufacturer’s invoice or why the analysis was not performed.",
      "Retailer's Name (New Construction)"
    ];
    const targetList = [...base];
    for (const f of fieldsToAdd) {
      if (!targetList.includes(f)) {
        targetList.push(f);
      }
    }
    return targetList;
  }, [contractFields]);

  const contractData1004C = React.useMemo(() => {
    const merged = {
      ...(data?.CONTRACT || {}),
      ...(data?.Contract || {}),
      ...(data?.clean_data?.Contract || {}),
      ...(allData?.CONTRACT || {}),
      ...(allData?.Contract || {}),
      ...(allData?.clean_data?.Contract || {}),
    };

    const invAnalysisKey = "I did did not analyze the manufacturer’s invoice. Explain the results of the analysis of the manufacturer’s invoice or why the analysis was not performed.";
    const invAnalysisKeyStraight = "I did did not analyze the manufacturer's invoice. Explain the results of the analysis of the manufacturer's invoice or why the analysis was not performed.";
    if (!merged[invAnalysisKey]) {
      const val = merged[invAnalysisKeyStraight]
        || merged["ManufacturerInvoiceAnalysis"]
        || merged["Manufacturer Invoice Analysis"]
        || merged["Invoice Analysis"]
        || merged["_InvoiceReviewComment"]
        || merged["InvoiceReviewComment"]
        || "";
      if (val) merged[invAnalysisKey] = val;
    }

    const retailerKey = "Retailer's Name (New Construction)";
    if (!merged[retailerKey]) {
      const val = merged["Retailer's Name"]
        || merged["Retailer Name"]
        || merged["_RetailerName"]
        || merged["RetailerName"]
        || "";
      if (val) merged[retailerKey] = val;
    }

    if (data?.CONTRACT?.[invAnalysisKey] !== undefined) {
      merged[invAnalysisKey] = data.CONTRACT[invAnalysisKey];
    }
    if (data?.CONTRACT?.[retailerKey] !== undefined) {
      merged[retailerKey] = data.CONTRACT[retailerKey];
    }

    return merged;
  }, [data, allData]);

  const improvementsData1004C = {
    ...(data?.IMPROVEMENTS || {}),
    ...(data?.Improvements || {}),
    ...(data?.['Manufactured Home'] || {}),
    ...(data?.MANUFACTURED_HOME || {}),
    ...(data?.clean_data?.Improvements || {}),
    ...(data?.clean_data?.['Manufactured Home'] || {}),
    ...(allData?.['Manufactured Home'] || {}),
    ...(allData?.clean_data?.['Manufactured Home'] || {}),
    ...(allData?.IMPROVEMENTS || {}),
    ...(data || {})
  };

  const foundationVal = improvementsData1004C['Foundation Type'] || improvementsData1004C['Foundation'] || '';
  if (foundationVal && !improvementsData1004C['Poured Concrete / Concrete Runners / Block & Pier / Other-att. description / Full Basement / Partial Basement']) {
    improvementsData1004C['Poured Concrete / Concrete Runners / Block & Pier / Other-att. description / Full Basement / Partial Basement'] = foundationVal;
  }
  const unitsVal = improvementsData1004C['Units'] || improvementsData1004C['# of Units'] || '1';
  improvementsData1004C['# of Units'] = unitsVal;

  const qualityVal = improvementsData1004C['Quality Rating (Cost Service)'] || improvementsData1004C['The appraiser must rate the quality of construction for the subject unit based on objective criteria (such as N.A.D.A. Manufactured Housing Appraisal Guide®, Marshall & Swift Residential Cost Handbook, etc.)'] || '';
  if (qualityVal && !improvementsData1004C['Quality Poor Fair Average Good Excellent Identify source of quality rating']) {
    improvementsData1004C['Quality Poor Fair Average Good Excellent Identify source of quality rating'] = qualityVal;
  }

  const condVal = improvementsData1004C['Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)'] || improvementsData1004C['Describe the condition of the property'] || '';
  if (condVal && !improvementsData1004C['Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.).']) {
    improvementsData1004C['Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.).'] = condVal;
  }

  const permFoundVal = improvementsData1004C['Is the manufactured home attached to a permanent foundation system?'] || improvementsData1004C['Permanent Foundation'] || '';
  if (permFoundVal && !improvementsData1004C['Is the manufactured home attached to a permanent foundation system? Yes No If No, describe the foundation sytem and the manner of attachment.']) {
    improvementsData1004C['Is the manufactured home attached to a permanent foundation system? Yes No If No, describe the foundation sytem and the manner of attachment.'] = permFoundVal;
  }

  const wheelsVal = improvementsData1004C['Have the towing hitch, wheels, and axles been removed?'] || improvementsData1004C['Wheels/Axles Removed'] || '';
  if (wheelsVal && !improvementsData1004C['Have the towing hitch, wheels, and axles been removed? Yes No If No, explain']) {
    improvementsData1004C['Have the towing hitch, wheels, and axles been removed? Yes No If No, explain'] = wheelsVal;
  }

  const utilVal = improvementsData1004C['Connected to Utilities'] || improvementsData1004C['Is the manufactured home permanently connected to a septic tank or sewage system and other utilities?'] || 'Yes';
  if (utilVal && !improvementsData1004C['Is the manufactured home permanently connected to a septic tank or sewage system and other utilities? Yes No If No, explain']) {
    improvementsData1004C['Is the manufactured home permanently connected to a septic tank or sewage system and other utilities? Yes No If No, explain'] = utilVal;
  }

  const marketAccVal = improvementsData1004C['Does the dwelling have sufficient gross living area and room dimensions to be acceptable to the market?'] || 'Yes';
  if (marketAccVal && !improvementsData1004C['Does the dwelling have sufficient gross living area and room dimensions to be acceptable to the market? Yes No If No, explain']) {
    improvementsData1004C['Does the dwelling have sufficient gross living area and room dimensions to be acceptable to the market? Yes No If No, explain'] = marketAccVal;
  }

  return (
    <>
      <ActionButtons
        handleStateRequirementCheck={handleStateRequirementCheck}
        stateReqLoading={stateReqLoading}
        handleClientRequirementCheck={handleClientRequirementCheck}
        clientReqLoading={clientReqLoading}
        handleEscalationCheck={handleEscalationCheck}
        escalationLoading={escalationLoading}
        revisionHandlers={revisionHandlers}
      />

      <SubjectInfoCard
        id="subject-info"
        title="Subject Information"
        fields={effectiveSubjectFields}
        data={data}
        extractionAttempted={extractionAttempted}
        onDataChange={handleDataChange}
        isEditable={true}
        editingField={editingField}
        setEditingField={setEditingField}
        highlightedFields={highlightedSubjectFields}
        allData={allData}
        comparisonData={comparisonData}
        getComparisonStyle={getComparisonStyle}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onSubjectRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="contract-section"
        title="Contract Section"
        fields={effectiveContractFields}
        data={contractData1004C}
        cardClass="bg-secondary"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['CONTRACT', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        highlightedFields={highlightedContractFields}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onContractRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="neighborhood-section"
        title="Neighborhood Section"
        fields={neighborhoodFields}
        data={data.NEIGHBORHOOD}
        cardClass="bg-info"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['NEIGHBORHOOD', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onNeighborhoodRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="site-section"
        title="Site Section"
        fields={effectiveSiteFields}
        data={siteData1004C}
        cardClass="bg-warning"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => {
          handleDataChange(['SITE', ...field], value);
          handleDataChange(['Site', ...field], value);
        }}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        highlightedFields={highlightedSiteFields}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onSiteRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      <ManufacturedHomeTable
        id="manufactured-home-section"
        title="HUD Data Plate & Compliance Certificate / Certification Label"
        data={data}
        allData={allData}
        formType={formType || allData?.formType || '1004C'}
        onDataChange={handleDataChange}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
      />

      <Improvements1004C
        id="improvements-section"
        title="Improvements Section"
        data={improvementsData1004C}
        allData={allData}
        onDataChange={(field, value) => {
          handleDataChange(field, value);
          handleDataChange(['IMPROVEMENTS', ...(Array.isArray(field) ? field : [field])], value);
          handleDataChange(['Manufactured Home', ...(Array.isArray(field) ? field : [field])], value);
        }}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onImprovementsRevisionButtonClick}
      />

      <GridInfoCard
        id="info-of-sales-section"
        title="Sales Comparison Approach"
        fields={infoOfSalesFields}
        data={data.INFO_OF_SALES}
        cardClass="bg-primary"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['INFO_OF_SALES', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
      />

      <SalesComparisonSection
        data={data}
        extractionAttempted={extractionAttempted}
        handleDataChange={handleDataChange}
        editingField={editingField}
        setEditingField={setEditingField}
        salesGridRows={salesGridRows}
        comparableSales={comparableSales}
        salesHistoryFields={salesHistoryFields}
        salesComparisonAdditionalInfoFields={salesComparisonAdditionalInfoFields}
        isEditable={true}
        allData={allData}
        formType={formType}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onSalesGridRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="reconciliation-section"
        title="RECONCILIATION"
        fields={reconciliationFields}
        data={data.RECONCILIATION}
        cardClass="bg-secondary"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['RECONCILIATION', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onReconciliationRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      <CostApproach1004C
        id="cost-approach-section"
        title="Cost Approach"
        fields={costApproachFields}
        data={data?.COST_APPROACH || data?.['Cost Approach'] || data}
        allData={allData}
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => {
          handleDataChange(field, value);
          handleDataChange(['COST_APPROACH', ...(Array.isArray(field) ? field : [field])], value);
          handleDataChange(['Cost Approach', ...(Array.isArray(field) ? field : [field])], value);
        }}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onCostApproachRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="income-approach-section"
        title="Income Approach"
        fields={incomeApproachFields}
        data={data}
        cardClass="bg-danger"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(field, value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="pud-info-section"
        title="PUD Information"
        fields={pudInformationFields}
        data={data}
        cardClass="bg-secondary"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(field, value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="market-conditions-summary"
        title="Market Conditions Narrative"
        fields={marketConditionsFields}
        data={{ ...data, ...(data?.MARKET_CONDITIONS || {}) }}
        cardClass="bg-warning"
        usePre={true}
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['MARKET_CONDITIONS', field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
      />

      <MarketConditionsTable
        id="market-conditions-section"
        data={data}
        onDataChange={(field, value) => handleDataChange(field, value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        marketConditionsRows={marketConditionsRows}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
      />

      <CondoCoopProjectsTable
        id="condo-coop-section"
        title="CONDO/CO-OP PROJECTS"
        data={data}
        onDataChange={handleDataChange}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        condoCoopProjectsRows={condoCoopProjectsRows}
        extractionAttempted={extractionAttempted}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="condo-foreclosure-section"
        fields={condoForeclosureFields}
        data={data.CONDO_FORECLOSURE}
        usePre={true}
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['CONDO_FORECLOSURE', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="appraiser-section"
        title="CERTIFICATION"
        fields={appraiserFields}
        data={data.CERTIFICATION}
        cardClass="bg-info"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['CERTIFICATION', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onCertificationRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="uspap-identification-section"
        title="USPAP / Appraisal and Report Identification"
        fields={appraisalAndReportIdentificationFields}
        data={data?.USPAP_IDENTIFICATION || data?.['USPAP / Report Identification'] || {}}
        cardClass="bg-info"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['USPAP_IDENTIFICATION', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
      />

      {is1007Present && (
        <ComparableRentScheduleSection
          data={data}
          comparableRents={comparableRents}
          RentSchedulesFIELDS2={RentSchedulesFIELDS2}
          rentScheduleReconciliationFields={rentScheduleReconciliationFields}
          extractionAttempted={extractionAttempted}
          handleDataChange={handleDataChange}
          editingField={editingField}
          setEditingField={setEditingField}
          isEditable={true}
          allData={allData}
          loading={loading}
          loadingSection={loadingSection}
          manualValidations={manualValidations}
          handleManualValidation={handleManualValidation}
          onRevisionButtonClick={on1007RevisionButtonClick}
          revisionHandlers={revisionHandlers}
        />
      )}

      <MapAndSketchExhibitsSection
        id="map-sketch-exhibits-section"
        data={data}
        allData={allData}
        selectedFile={selectedFile}
      />
    </>
  );
};

export default Form1004C;
