/**
 * Revision handler generators for Subject forms.
 */

export const createRevisionHandlers = (data = {}, setNotification = () => {}, setNotes = () => {}, dialogSetters = {}) => {
  const {
    setPropertyAddressRevisionLangDialogOpen = () => {},
    setContractPriceRevisionLangDialogOpen = () => {},
    setFinancialAssistanceRevisionLangDialogOpen = () => {},
    setDateOfContractRevisionLangDialogOpen = () => {},
    setNeighborhoodBoundariesRevisionLangDialogOpen = () => {},
    setOtherLandUseRevisionLangDialogOpen = () => {},
    setZoningComplianceRevisionLangDialogOpen = () => {},
    setAreaRevisionLangDialogOpen = () => {},
    setImprovementsRevisionLangDialogOpen = () => {},
    setSalesGridRevisionLangDialogOpen = () => {},
    setReconciliationRevisionLangDialogOpen = () => {},
    setCostApproachRevisionLangDialogOpen = () => {},
    setCertificationRevisionLangDialogOpen = () => {},
    setOneWithAccessoryUnitRevisionLangDialogOpen = () => {},
    setLenderClientAddressRevisionLangDialogOpen = () => {},
    setLenderClientRevisionLangDialogOpen = () => {},
  } = dialogSetters;

  return {
      onPropertyAddressRevisionButtonClick: () => setPropertyAddressRevisionLangDialogOpen(true),
      onAssessorsParcelNumberRevisionButtonClick: () => {
        const valStr = data["Assessor's Parcel Number"] || data["Assessor's Parcel #"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Assessor's Parcel Number'${valPart} field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Assessor's Parcel Number revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onStreetRevisionButtonClick: () => {
        const valStr = data["On Street"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'On Street'${valPart} field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "On Street revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onNeighborhoodNameRevisionButtonClick: () => {
        const valStr = data["Neighborhood Name"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Neighborhood Name'${valPart} field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Neighborhood Name revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onCensusTractRevisionButtonClick: () => {
        const valStr = data["Census Tract"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Census Tract'${valPart} field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Census Tract revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onSpecialAssessmentsRevisionButtonClick: () => {
        const valStr = data["Special Assessments $"] || data["Special Assessments"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Special Assessments'${valPart} field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Special Assessments revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onContractPriceRevisionButtonClick: () => setContractPriceRevisionLangDialogOpen(true),
      onFinancialAssistanceRevisionButtonClick: () => setFinancialAssistanceRevisionLangDialogOpen(true),
      onDateOfContractRevisionButtonClick: () => setDateOfContractRevisionLangDialogOpen(true),
      onNeighborhoodBoundariesRevisionButtonClick: () => setNeighborhoodBoundariesRevisionLangDialogOpen(true),
      onViewRevisionButtonClick: () => {
        const valStr = data["View"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'View'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "View revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onDimensionsRevisionButtonClick: () => {
        const valStr = data["Dimensions"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Dimensions'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Dimensions revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onZoningRevisionButtonClick: () => {
        const valStr = data["Zoning"] || data["Specific Zoning Classification"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Zoning'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Zoning revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onSpecificZoningClassificationRevisionButtonClick: () => {
        const valStr = data["Specific Zoning Classification"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Specific Zoning Classification'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Specific Zoning Classification revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onShapeRevisionButtonClick: () => {
        const valStr = data["Shape"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Shape'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Shape revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onElectricityRevisionButtonClick: () => {
        const valStr = data["Electricity"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Electricity'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Electricity revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onWaterRevisionButtonClick: () => {
        const valStr = data["Water"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Water'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Water revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGasRevisionButtonClick: () => {
        const valStr = data["Gas"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Gas'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Gas revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFEMAMapDateRevisionButtonClick: () => {
        const valStr = data["FEMA Map Date"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'FEMA Map Date'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "FEMA Map Date revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFEMAFloodZoneRevisionButtonClick: () => {
        const valStr = data["FEMA Flood Zone"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'FEMA Flood Zone'${valPart} field in the Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "FEMA Flood Zone revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onZoningComplianceRevisionButtonClick: () => setZoningComplianceRevisionLangDialogOpen(true),
      onOtherLandUseRevisionButtonClick: () => setOtherLandUseRevisionLangDialogOpen(true),
      onAreaRevisionButtonClick: () => setAreaRevisionLangDialogOpen(true),
      onAdverseSiteConditionsRevisionButtonClick: () => {
        const revisionText = "Please revise the checkbox marked for 'Are there any adverse site conditions or external factors?' as it does not match the commentary.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Adverse Site Conditions revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      // =========================
      // PROJECT SITE
      // =========================
      onTopographyRevisionButtonClick: () => {
        const valStr = data["Topography"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Topography'${valPart} field in the Project Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Topography revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onSizeRevisionButtonClick: () => {
        const valStr = data["Size"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Size'${valPart} field in the Project Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Size revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onDensityRevisionButtonClick: () => {
        const valStr = data["Density"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Density'${valPart} field in the Project Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Density revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFemamapRevisionButtonClick: () => {
        const valStr = data["FEMA Map #"] || data["FEMA Map"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'FEMA Map'${valPart} field in the Project Site section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "FEMA Map revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      // =========================
      // IMPROVEMENTS SECTION
      // =========================
      onImprovementsRevisionButtonClick: () => setImprovementsRevisionLangDialogOpen(true),
      onDesignStyleRevisionButtonClick: () => {
        const valStr = data["Design (Style)"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `The 'Design (Style)'${valPart} in the sales grid does not match the Improvements section. Please reconcile and revise.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Design/Style revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onExteriorWallsRevisionButtonClick: () => {
        const valStr = data["Exterior Walls"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please state the condition and materials for 'Exterior Walls'${valPart} in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Exterior Walls revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onSanitarySewerButtonClick: () => {
        const valStr = data["Sanitary Sewer"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `'Sanitary Sewer'${valPart} is marked as Public; however, comments indicate Septic. Please reconcile and revise.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Sanitary Sewer revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAlleyClick: () => {
        const revisionText = "Photos show an Alley, but the Alley box is not marked in the Site section. Please verify and revise.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Alley revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onHighestAndBestUseClick: () => {
        const revisionText = "Highest and Best Use as Improved is marked 'NO'; please provide explanatory comments.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Highest and Best Use revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      // =========================
      // SALES GRID
      // =========================
      onSalesGridRevisionButtonClick: () => setSalesGridRevisionLangDialogOpen(true),
      onOneWithAccessoryUnitRevisionButtonClick: () => setOneWithAccessoryUnitRevisionLangDialogOpen(true),

      // =========================
      // RECONCILIATION / COST APPROACH / CERTIFICATION
      // =========================
      onReconciliationRevisionButtonClick: () => setReconciliationRevisionLangDialogOpen(true),
      onCostApproachRevisionButtonClick: () => setCostApproachRevisionLangDialogOpen(true),
      onCertificationRevisionButtonClick: () => setCertificationRevisionLangDialogOpen(true),

      // =========================
      // PROPERTY RIGHTS / BORROWER / MISC
      // =========================
      onAddRevision: () => {
        const revisionText = "Please mark whether the subject property is currently offered for sale in the subject section.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAddBorrowerRevision: () => {
        const valStr = data["Borrower"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please add the borrower's middle initial to the borrower name${valPart} in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Borrower revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onYearBuiltRevisionButtonClick: () => {
        const valStr = data["Year Built"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Year Built'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Year Built revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onBasementAreaRevisionButtonClick: () => {
        const valStr = data["Basement Area sq.ft."] || data["Basement Area"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Basement Area sq.ft.'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Basement Area revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGarageAreaRevisionButtonClick: () => {
        const valStr = data["Garage # of Cars"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Garage # of Cars'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Garage # of Cars revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onEvidenceofRevisionButtonClick: () => {
        const valStr = data["Evidence of"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Evidence of'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Evidence of revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFoundationTypeRevisionButtonClick: () => {
        const valStr = data["Foundation Type"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Foundation Type'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Foundation Type revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      onBasementFinishRevisionButtonClick: () => {
        const valStr = data["Basement Finish sq.ft."] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Basement Finish sq.ft.'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Basement Finish revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onEffectiveAgeRevisionButtonClick: () => {
        const valStr = data["Effective Age"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Effective Age'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Effective Age revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onRoofRevisionButtonClick: () => {
        const valStr = data["Roof"] || data["Roof Surface"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Roof'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Roof revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onHeatingSystemRevisionButtonClick: () => {
        const valStr = data["Heating System"] || data["Heating"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Heating System'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Heating System revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFoundationWallsRevisionButtonClick: () => {
        const valStr = data["Foundation Walls"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Foundation Walls'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Foundation Walls revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGuttersDownspoutsRevisionButtonClick: () => {
        const valStr = data["Gutters/Downspouts"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Gutters/Downspouts'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Gutters/Downspouts revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onWindowTypeRevisionButtonClick: () => {
        const valStr = data["Window Type"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Window Type'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Window Type revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onWallsRevisionButtonClick: () => {
        const valStr = data["Walls"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Walls'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Walls revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onTrimRevisionButtonClick: () => {
        const valStr = data["Trim"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Trim'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Trim revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onBsthwainscotRevisionButtonClick: () => {
        const valStr = data["Bsthwainscot"] || data["Bath Wainscot"] || '';
        const valPart = valStr ? ` ("${valStr}")` : '';
        const revisionText = `Please revise the 'Bath Wainscot'${valPart} field in the Improvements section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Bath Wainscot revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onCoolingTypeRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Cooling Type' "${data["Cooling Type"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Cooling Type revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFireplaceRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Fireplace' "${data["Fireplace"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Fireplace revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onPoolRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Pool' "${data["Pool"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Pool revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onCarportRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Carport' "${data["Carport"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Carport revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onDrivewaySurfaceRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Driveway Surface' "${data["Driveway Surface"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Driveway Surface revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAtticRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Attic' "${data["Attic"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Attic revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGarageRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Garage' "${data["Garage"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Garage revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONAppliancesRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Appliances' "${data["Appliances"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Appliances revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFinishedareaRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Finished Area sq.ft.' "${data["Finished Area sq.ft."] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Finished Area revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      ONFenceRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Fence' "${data["Fence"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Fence revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onSquareFeetOfGrossLivingAreaAboveGradeRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Square Feet of Gross Living Area Above Grade' "${data["Square Feet of Gross Living Area Above Grade"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Square Feet of Gross Living Area Above Grade revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAdditionalfeaturesRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Additional Features' "${data["Additional Features"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Additional Features revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onconditionRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Condition' "${data["Condition"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Condition revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ontotaldollaramountRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Total Dollar Amount' "${data["Total Dollar Amount"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Total Dollar Amount revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onBuiltUpRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Built Up' "${data["Built Up"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Built Up revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onPropertyValuesRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Property Values' "${data["Property Values"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Property Values revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onMarketingTimeRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Marketing Time' "${data["Marketing Time"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Marketing Time revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }, ONTwoUnitrevisionButtonClick: () => {
        const revisionText = `Please revise the 'Two Unit' "${data["Two Unit"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Two Unit revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }, ONMultiFamilyrevisionButtonClick: () => {
        const revisionText = `Please revise the 'Multi Family' "${data["Multi Family"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Multi Family revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONTWOUNITAGErevisionButtonClick: () => {
        const revisionText = `Please revise the 'one unit housing age(high,low,pred)' "${data["one unit housing age(high,low,pred)"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Multi Family revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONMarketConditionsrevisionButtonClick: () => {
        const revisionText = `Please revise the 'Market Conditions:' "${data["Market Conditions:"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Market Conditions: revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      ONNeighborhoodDescriptionrevisionButtonClick: () => {
        const revisionText = `Please revise the 'Neighborhood Description' "${data["Neighborhood Description"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Neighborhood Description revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONONEUNITHOUSINGrevisionButtonClick: () => {
        const revisionText = `Please revise the 'One Unit Housing' "${data["One Unit Housing"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "One Unit Housing revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONCommercialrevisionButtonClick: () => {
        const revisionText = `Please revise the 'Commercial' "${data["Commercial"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Commercial revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      ONOneUnitrevisionButtonClick: () => {
        const revisionText = `Please revise the 'One Unit' "${data["One Unit"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "One Unit revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONDemandSupplyRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Demand/Supply' "${data["Demand/Supply"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Demand/Supply revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONGrowthRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Growth' "${data["Growth"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Growth revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onLocationRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Location' "${data["Location"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Location revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      oncontractDataSourceRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Contract Data Source' "${data["Contract Data Source"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Contract Data Source revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      oncontractdiddidnotRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Contract Did/Did Not' "${data["Contract Did/Did Not"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Contract Did/Did Not revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onpropertygenerallyconformRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Property Generally Conform' "${data["Property Generally Conform"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Property Generally Conform revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onpropertygenerallyRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Property Generally' "${data["Property Generally"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Property Generally revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onphysicaldeficienciesRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Physical Deficiencies' "${data["Physical Deficiencies"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Physical Deficiencies revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFinishedAreaAboveGradeBathroomsRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Finished Area Above Grade Bathroom(s)' "${data["Finished Area Above Grade Bathroom(s)"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Finished Area Above Grade Bathroom(s) revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFinishedAreaAboveGradeBathsRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Finished Area Above Grade Bath(s)' "${data["Finished Area Above Grade Bath(s)"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Finished Area Above Grade Bath(s) revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFinishedAreaAboveGradeBedroomsRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Finished Area Above Grade Bedrooms' "${data["Finished Area Above Grade Bedrooms"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Finished Area Above Grade Bedrooms revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },


      onDrivewayRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Driveway' "${data["Driveway"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Driveway revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onCarStorageRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Car Storage' "${data["Car Storage"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Car Storage revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onPatioDeckrevisionButtonClick: () => {
        const revisionText = `Please revise the 'Patio/Deck' "${data["Patio/Deck"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Patio/Deck revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onWoodstoveRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Woodstove' "${data["Woodstove"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Woodstove revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onbathfloorRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Bath Floor (Material/Condition)' "${data["Bath Floor (Material/Condition)"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Bath Floor revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      onFloorsRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Floors' "${data["Floors"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Floors revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onScreensRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Screens' "${data["Screens"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Screens revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onStormSashInsulatedRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Storm Sash/Insulated' "${data["Storm Sash/Insulated"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Storm Sash/Insulated revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onWindowRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Window' "${data["Window"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Window revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFuelRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Fuel' "${data["Fuel"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Fuel revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      onproposedUseRevisionButtonClick: () => {
        const revisionText = "Improvements section: Under general description, the checkbox is marked on ‘Proposed’; however, photos indicate the under-construction property; please revise.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Proposed Use revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onTypeRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Type' "${data["Type"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      onofStoriesRevisionButtonClick: () => {
        const revisionText = `Please revise the '# of Stories' "${data["# of Stories"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Revision text copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAddEmptyBorrowerRevision: () => {
        const revisionText = `Please add the borrower's "${data["borrower's "] || '...'}" to the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Borrower revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAddLegalDescRevision: () => {
        const revisionText = "Legal Description noted as 'see attached addendum'  but missing; please revise.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Legal Description revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onLegalDescriptionUseClick: () => {
        const revisionText = "Please have the ‘Legal Description’ noted in the report.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Legal Description revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAddPropertyRightsRevision: () => {
        const revisionText = "Please revise Property Rights Appraised to fee simple.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Property Rights revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAddParcelNumberRevision: () => {
        const revisionText = `Please have the ‘Assessor's Parcel #’  "${data["Assessor's Parcel #"] || '...'}" noted in the subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Parcel Number revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onAddOwnerOfRecordRevision: () => {
        const revisionText = "Please include an owner of public record on page 1.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Owner of Record revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onLenderClientAddressRevisionButtonClick: () => setLenderClientAddressRevisionLangDialogOpen(true),
      onLenderClientRevisionButtonClick: () => setLenderClientRevisionLangDialogOpen(true),
      onAddAssignmentTypeRevision: () => {
        const revisionText = "Please revise the checkbox for assignment type to refinance transaction.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Assignment revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONCountyRevisionButtonClick: () => {
        const revisionText = `Please revise the 'County' "${data["County"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "County revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONTaxYearRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Tax Year' "${data["Tax Year"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Tax Year revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONZipCodeRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Zip Code' "${data["Zip Code"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Zip Code revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONReportdataRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Report Data' "${data["Report Data"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Report Data revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONPUDRevisionButtonClick: () => {
        const revisionText = `Please revise the 'PUD' "${data["PUD"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "PUD revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONOccupantRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Occupant' "${data["Occupant"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Occupant revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONComparablePropertiesRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Sales Comparison Approach' "${data["Sales Comparison Approach"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Sales Comparison Approach revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONUnitsRevisionButtonClick: () => {
        const revisionText = `Please revise the 'Units' "${data["Units"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Units revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONcomparablepropertyrevisionButtonClick: () => {
        const revisionText = "Please revise the 'Sales Comparison Approach' field in the Subject section.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Sales Comparison Approach revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONMapReferencerevisionButtonClick: () => {
        const revisionText = `Please revise the 'Map Reference' "${data["Map Reference"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Map Reference revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      ONCityRevisionButtonClick: () => {
        const revisionText = `Please revise the 'City' "${data["City"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "City revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onHoaRevisionButtonClick: () => {
        const revisionText = `Please revise the 'HOA Dues' "${data["HOA Dues"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "HOA Dues revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      onStateRevisionButtonClick: () => {
        const revisionText = `Please revise the 'State' "${data["State"] || '...'}" field in the Subject section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "State revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onRETaxesRevisionButtonClick: () => {
        const revisionText = `Please revise the R.E. Taxes $ "${data["R.E. Taxes $"] || '...'}" must only contain numbers and currency symbols.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Real Estate Taxes revision text copied to clipboard!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onFemaHazardRevisionButtonClick: () => {
        const revisionText = `‘FEMA Special Flood Hazard Area' "${data["FEMA Special Flood Hazard Area"] || '...'}"  marked NO but Zone is AE; please revise.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "FEMA Hazard revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onOffSiteImprovementsButtonClick: () => {
        const revisionText = `Please check a box for 'Are the utilities/off-site improvements typical?' "${data["Are the utilities/off-site improvements typical?"] || '...'}" `;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Off-Site Improvements revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      // SALES GRID 
      onGRID1ButtonClick: () => {
        const revisionText = "Critical Error: Research on sale/transfer history must be performed. 'did not' is not acceptable";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "sale/transfer history revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGRID2ButtonClick: () => {
        const checkboxKey1 = "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.";
        const checkboxKey2 = "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal";

        let checkboxVal = "";
        if (data) {
          if (data[checkboxKey1] !== undefined && data[checkboxKey1] !== null) checkboxVal = String(data[checkboxKey1]);
          else if (data[checkboxKey2] !== undefined && data[checkboxKey2] !== null) checkboxVal = String(data[checkboxKey2]);
          else if (data.SALES_TRANSFER?.[checkboxKey1] !== undefined && data.SALES_TRANSFER?.[checkboxKey1] !== null) checkboxVal = String(data.SALES_TRANSFER[checkboxKey1]);
          else if (data.PRIOR_SALE_HISTORY?.[checkboxKey2] !== undefined && data.PRIOR_SALE_HISTORY?.[checkboxKey2] !== null) checkboxVal = String(data.PRIOR_SALE_HISTORY[checkboxKey2]);
          else if (data.Subject?.[checkboxKey1] !== undefined && data.Subject?.[checkboxKey1] !== null) checkboxVal = String(data.Subject[checkboxKey1]);
          else {
            const allKeys = Object.keys(data);
            const matchKey = allKeys.find(k => k.includes("My research did did not reveal any prior sales or transfers of the subject property"));
            if (matchKey) checkboxVal = String(data[matchKey]);
          }
        }

        const normalized = checkboxVal.toLowerCase();
        let revisionText = "";
        if (normalized.includes("did not")) {
          revisionText = "If prior sales were revealed, 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' for the Subject must blank or three years prior ";
        } else {
          revisionText = "If prior sales were revealed, 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' for the Subject must greater than or less than  three years prior ";
        }
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "sale/transfer history revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGRID3ButtonClick: () => {
        const revisionText = "Data Source(s) for subject property research";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "sale/transfer history revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGRID4ButtonClick: () => {
        const checkboxKey1 = "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.";
        const checkboxKey2 = "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale";

        let checkboxVal = "";
        if (data) {
          if (data[checkboxKey1] !== undefined && data[checkboxKey1] !== null) checkboxVal = String(data[checkboxKey1]);
          else if (data[checkboxKey2] !== undefined && data[checkboxKey2] !== null) checkboxVal = String(data[checkboxKey2]);
          else if (data.SALES_TRANSFER?.[checkboxKey1] !== undefined && data.SALES_TRANSFER?.[checkboxKey1] !== null) checkboxVal = String(data.SALES_TRANSFER[checkboxKey1]);
          else if (data.PRIOR_SALE_HISTORY?.[checkboxKey2] !== undefined && data.PRIOR_SALE_HISTORY?.[checkboxKey2] !== null) checkboxVal = String(data.PRIOR_SALE_HISTORY[checkboxKey2]);
          else if (data.Subject?.[checkboxKey1] !== undefined && data.Subject?.[checkboxKey1] !== null) checkboxVal = String(data.Subject[checkboxKey1]);
          else {
            const allKeys = Object.keys(data);
            const matchKey = allKeys.find(k => k.includes("My research did did not reveal any prior sales or transfers of the comparable sales"));
            if (matchKey) checkboxVal = String(data[matchKey]);
          }
        }

        const normalized = checkboxVal.toLowerCase();
        let revisionText = "";
        if (normalized.includes("did not")) {
          revisionText = "If prior sales for comparables were revealed, at least one comparable must have 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' must blank .";
        } else {
          revisionText = "If prior sales for comparables were revealed, at least one comparable must have 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' comparable sales for the year prior .";
        }
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "sale/transfer history revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGRID5ButtonClick: () => {
        const revisionText = "Data Source(s) for comparable sales research.";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "sale/transfer history revision copied!", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGRID6ButtonClick: () => {
        const revisionText = "Analysis of prior sale or transfer history of the subject property and comparable sales";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Analysis of prior sale or transfer history of the subject property and comparable sales", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGRID7ButtonClick: () => {
        const revisionText = "Summary of Sales Comparison Approach";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Summary of Sales Comparison Approach", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGRID8ButtonClick: () => {
        const revisionText = "Indicated Value by Sales Comparison Approach $";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Indicated Value by Sales Comparison Approach $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      // CERTIFICATION

      onSignatureButtonClick: () => {
        const revisionText = "Signature";
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Signature", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onNameButtonClick: () => {
        const revisionText = `Please revise the 'Name' "${data["Name"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Name", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }, onCompanyNameButtonClick: () => {
        const revisionText = `Please revise the 'Company Name' "${data["Company Name"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Company Name", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }, onCompanyAddressButtonClick: () => {
        const revisionText = `Please revise the 'Company Address' "${data["Company Address"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Company Address", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }, onTelephoneNumberButtonClick: () => {
        const revisionText = `Please revise the 'Telephone Number' "${data["Telephone Number"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Telephone Number", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onEmailButtonClick: () => {
        const revisionText = `Please revise the "Email" "${data["Email"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Email", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onDATESignatureButtonClick: () => {
        const revisionText = `Please revise the "Date" "${data["Date of Signature and Report"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Date", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONEffectiveDateofAppraisal: () => {
        const revisionText = `Please revise the Effective Date of Appraisal "${data["Effective Date of Appraisal"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Effective Date of Appraisal", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONSTATE1ofAppraisal: () => {
        const revisionText = `Please revise the "State Certification #/or State License #/or Other (describe)/State #" "${data["State Certification #"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "State Certification #/or State License #/or Other (describe)/State #", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONADDRESSOFPROPERTYAppraisal: () => {
        const revisionText = `Please revise the "ADDRESS OF PROPERTY APPRAISED" "${data["Address of Property Appraised"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "ADDRESS OF PROPERTY APPRAISED ", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONAPPRAISEDVALUEofAppraisal: () => {
        const revisionText = `Please revise the "APPRAISED VALUE OF SUBJECT PROPERTY $" "${data["Appraised Value of Subject Property"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "APPRAISED VALUE OF SUBJECT PROPERTY $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONCLIENTNameAppraisal: () => {
        const revisionText = `Please revise the "LENDER/CLIENT Name" "${data["Lender/Client Name"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "LENDER/CLIENT Name", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONCompanyName: () => {
        const revisionText = `Please revise the "Lender/Client Company NAME" "${data["Lender/Client Company Name"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Lender/Client Company NAME", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      ONCompanyAddress: () => {
        const revisionText = `Please revise the "Lender/Client COMPANY Address" "${data["Lender/Client Company Address"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Lender/Client COMPANY Address", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONEmailAddress: () => {
        const revisionText = `Please revise the "Lender/Client Email Address" "${data["Lender/Client Email Address"] || '...'}" field in the section.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Lender/Client Email Address", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      ONInsurance: () => {
        const revisionText = `Please revise the "Insurance COPY" "${data["Insurance Copy"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Insurance COPY", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONEXP: () => {
        const revisionText = `Please revise the "Expiration Date of Certification or License" "${data["Expiration Date of Certification or License"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Expiration Date of Certification or License", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONPPT: () => {
        const revisionText = `Please revise the "Policy Period To" "${data["Policy Period To"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Policy Period To", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONLVT: () => {
        const revisionText = `Please revise the "License Valid To" "${data["License Valid To"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "License Valid To", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONLVT1: () => {
        const revisionText = `Please revise the "LICENSE/REGISTRATION/CERTIFICATION #" "${data["LICENSE/REGISTRATION/CERTIFICATION #"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "LICENSE/REGISTRATION/CERTIFICATION #", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      // reconciliationFields
      ONIndicated1: () => {
        const revisionText = `Please revise the "Indicated Value by Cost Approach $" "${data["Indicated Value by Cost Approach $"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Indicated Value by Cost Approach $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONcostApproach: () => {
        const revisionText = `Please revise the "COST APPROACH" "${data["COST APPROACH"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "COST APPROACH", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONincomeApproach: () => {
        const revisionText = `Please revise the "INCOME APPROACH" "${data["INCOME APPROACH"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "INCOME APPROACH", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONincomeApproach2: () => {
        const revisionText = `Please revise the "Indicated Value by Income Approach $" "${data["Indicated Value by Income Approach $"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Indicated Value by Income Approach $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONReconciledValue: () => {
        const revisionText = `Please revise the "RECONCILED VALUE $" "${data["RECONCILED VALUE $"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "RECONCILED VALUE $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONReconciledValue1: () => {
        const revisionText = `Please revise the "Reconciled Value $" "${data["Reconciled Value $"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Reconciled Value $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      // Cost Approach

      ONEstimated: () => {
        const revisionText = `Please revise the "Estimated" "${data["Estimated"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Estimated", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onSourceofcostdata: () => {
        const revisionText = `Please revise the "Source of cost data:" "${data["Source of cost data:"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Source of cost data:", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onQuality: () => {
        const revisionText = `Please revise the "Quality rating from cost service" "${data["Quality rating from cost service"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Quality", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onEffectiveDateofcostdata: () => {
        const revisionText = `Please revise the "Effective date of cost data" "${data["Effective date of cost data"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Effective date of cost data", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onCommentsOnCost: () => {
        const revisionText = `Please revise the "Comments on Cost Approach" "${data["Comments on Cost Approach (gross living area calculations, depreciation, etc.)"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Comments on Cost Approach", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onOPINIONOFSITE: () => {
        const revisionText = `Please revise the "OPINION OF SITE VALUE $" "${data["OPINION OF SITE VALUE = $ ................................................"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "OPINION OF SITE VALUE $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onDwelling: () => {
        const revisionText = `Please revise the "Dwelling" "${data["Dwelling"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Dwelling", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onGarageCarport: () => {
        const revisionText = `Please revise the "Garage/Carport" "${data["Garage/Carport "] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Garage/Carport", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onEstimatedRemainingEconomicLife: () => {
        const revisionText = `Please revise the "Estimated Remaining Economic Life" "${data["Estimated Remaining Economic Life (HUD and VA only)"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Estimated Remaining Economic Life", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONTOTALESTIMATE: () => {
        const revisionText = `Please revise the "TOTAL ESTIMATE OF VALUE $ " "${data[" Total Estimate of Cost-New  = $ ..................."] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "TOTAL ESTIMATE OF VALUE $ ", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONDepreciation: () => {
        const revisionText = `Please revise the "Depreciation" "${data["Depreciation"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Depreciation", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONTOTALDEDUCT: () => {
        const revisionText = `Please revise the "TOTAL DEDUCTIONS $ " "${data["Depreciated Cost of Improvements......................................................=$ "] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "TOTAL DEDUCTIONS $ ", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onasisvalueofsiteimprovements: () => {
        const revisionText = `Please revise the "As-is value of site improvements" "${data["As-is” Value of Site Improvements......................................................=$"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "As-is value of site improvements", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onTotalValuebyCostApproach: () => {
        const revisionText = `Please revise the "Indicated Value By Cost Approach" "${data["Indicated Value By Cost Approach......................................................=$"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Indicated Value by Cost Approach $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },

      // Income Approach
      onEffectiveGrossIncome: () => {
        const revisionText = `Please revise the "Estimated Monthly Market Rent $" "${data["Estimated Monthly Market Rent $"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Estimated Monthly Market Rent $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onxgross: () => {
        const revisionText = `Please revise the "X Gross Rent Multiplier" "${data["X Gross Rent Multiplier  = $"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "X Gross Rent Multiplier", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onIndicatedValuebyIncomeApproach: () => {
        const revisionText = `Please revise the "Indicated Value by Income Approach $" "${data["Indicated Value by Income Approach"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Indicated Value by Income Approach $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onIIA: () => {
        const revisionText = `Please revise the "Indicated Value by Income Approach" "${data["Indicated Value by Income Approach"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "INCOME APPROACH", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONSUMMARYOFINCOMEAPPROACH: () => {
        const revisionText = `Please revise the "SUMMARY OF INCOME APPROACH" "${data["Summary of Income Approach (including support for market rent and GRM) "] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "SUMMARY OF INCOME APPROACH", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onPUDFees$: () => {
        const revisionText = `Please revise the "PUD Fees $" "${data["PUD Fees $"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "PUD Fees $", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONPUDFeesM: () => {
        const revisionText = `Please revise the "PUD Fees (per month)" "${data["PUD Fees (per month)"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "PUD Fees", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONPUDFeesy: () => {
        const revisionText = `Please revise the "PUD Fees (per year)" "${data["PUD Fees (per year)"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "PUD Fees", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONdbha: () => {
        const revisionText = `Please revise the "Is the developer/builder in control of the Homeowners' Association (HOA)?" "${data["Is the developer/builder in control of the Homeowners' Association (HOA)?"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Is the developer/builder in control of the Homeowners' Association (HOA)?", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      ONunittypes: () => {
        const revisionText = `Please revise the "Unit Types" "${data["Unit type(s)"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Unit Types", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onProvideThe: () => {
        const revisionText = `Please revise the "Provide the following information for PUDs ONLY if the developer/builder is in control of the HOA and the subject property is an attached dwelling unit." "${data["Provide the following information for PUDs ONLY if the developer/builder is in control of the HOA and the subject property is an attached dwelling unit."] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Provide the following information for PUDs ONLY if the developer/builder is in control of the HOA and the subject property is an attached dwelling unit.", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onLegalNameOfProject: () => {
        const revisionText = `Please revise the "Legal Name of Project" "${data["Legal Name of Project"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Legal Name of Project", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onTotalNumberOfPhases: () => {
        const revisionText = `Please revise the "Total Number of Phases" "${data["Total Number of Phases"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Total Number of Phases", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onTotalNumberOfUnits: () => {
        const revisionText = `Please revise the "Total Number of Units" "${data["Total number of units"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Total Number of Units", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onTotalNumberOfUnitsSold: () => {
        const revisionText = `Please revise the "Total Number of Units Sold" "${data["Total number of units sold"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Total Number of Units Sold", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }, onTotalNumberOfUnitsRented: () => {
        const revisionText = `Please revise the "Total number of units rented" "${data["Total number of units rented"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Total Number of Units Rented", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }, onTotalNumberOfUnitsForSale: () => {
        const revisionText = `Please revise the "Total number of units for sale" "${data["Total number of units for sale"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Total Number of Units for Sale", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }, onDatasourcepi: () => {
        const revisionText = `Please revise the "Data Source(s) for project information" "${data["Data source(s)"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Data Source(s) for project information", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      },
      onprojectcreated: () => {
        const revisionText = `Please revise the "Date Project Created" "${data["Was the project created by the conversion of existing building(s) into a PUD?"] || '...'}" in the report.`;
        navigator.clipboard.writeText(revisionText);
        setNotification({ open: true, message: "Date Project Created", severity: "success" });
        setNotes(prev => `${prev}\n- ${revisionText}`);
      }

  };
};

export default createRevisionHandlers;
