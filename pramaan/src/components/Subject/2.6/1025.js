import React from 'react';

import { SubjectInfoCard, GridInfoCard, MarketConditionsTable, EditableField } from '../components/FormComponents';

import { Tooltip, IconButton } from '@mui/material';

import { CondoCoopProjectsTable, SubjectRentScheduleTable } from '../components/tables';

import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

import SalesComparisonSection from '../components/SalesComparisonSection';

import ActionButtons from '../components/ActionButtons';

import PhotosGallerySection from '../components/PhotosGallerySection';

import MapAndSketchExhibitsSection from '../components/MapAndSketchExhibitsSection';

const defaultRentAdjustments = [

    "COMPARABLE Rental No #1",

    "COMPARABLE Rental No #2",

    "COMPARABLE Rental No #3",

    "COMPARABLE Rental No #4",

    "COMPARABLE Rental No #5",

    "COMPARABLE Rental No #6",

    "COMPARABLE Rental No #7",

    "COMPARABLE Rental No #8",

    "COMPARABLE Rental No #9",

];



const Form1025 = ({

    data = {}, allData, extractionAttempted, handleDataChange, editingField, setEditingField,

    highlightedSubjectFields, highlightedContractFields, highlightedSiteFields,

    condoCoopProjectsRows, condoForeclosureFields, subjectFields, contractFields,

    neighborhoodFields, siteFields, improvementsFields, salesGridRows, salesGridRows1025, comparableSales,

    salesHistoryFields, priorSaleHistoryFields, salesComparisonAdditionalInfoFields,

    marketConditionsRows, marketConditionsFields, reconciliationFields, costApproachFields,

    incomeApproachFields, pudInformationFields, appraiserFields, appraisalAndReportIdentificationFields, formType, comparisonData,

    getComparisonStyle, infoOfSalesFields, loading, loadingSection, handleStateRequirementCheck,

    stateReqLoading, handleClientRequirementCheck, clientReqLoading, handleEscalationCheck,

    escalationLoading, manualValidations, handleManualValidation, onSubjectRevisionButtonClick,

    onContractRevisionButtonClick, onNeighborhoodRevisionButtonClick, onSiteRevisionButtonClick,

    onImprovementsRevisionButtonClick, onSalesGridRevisionButtonClick, onReconciliationRevisionButtonClick,

    onCostApproachRevisionButtonClick, onCertificationRevisionButtonClick, on1007RevisionButtonClick,

    ComparableRentAdjustments, COMPARABLE_RENTAL_DATA, SUBJECT_RENT_SCHEDULE, selectedFile, revisionHandlers

}) => {

    const rentAdjustments = (ComparableRentAdjustments && ComparableRentAdjustments.length > 0)

        ? ComparableRentAdjustments

        : defaultRentAdjustments;



    const getRentalCompData = (rent, cidx) => {
        const num = cidx !== undefined ? (cidx + 1) : (rent.match(/\d+/) ? rent.match(/\d+/)[0] : null);
        if (data && data[rent] && typeof data[rent] === 'object' && Object.keys(data[rent]).length > 0) {
            if (data[rent]['Current Monthly Rent'] !== undefined || data[rent]['Rent/Gross Bldg. Area'] !== undefined || data[rent]['Date of Lease(s)'] !== undefined) {
                return data[rent];
            }
        }
        if (num) {
            const candidates = [
                data?.[`COMPARABLE Rental No #${num}`],
                data?.[`COMPARABLE Rental No. #${num}`],
                data?.[`Comparable Rental No #${num}`],
                allData?.[`COMPARABLE Rental No #${num}`],
                allData?.['Comparable Rental Data']?.[rent],
                allData?.['Comparable Rental Data']?.[`Rental ${num}`],
                allData?.['Comparable Rental Data']?.[`COMPARABLE Rental No #${num}`],
                allData?.clean_data?.['Comparable Rental Data']?.[rent],
                allData?.clean_data?.['Comparable Rental Data']?.[`Rental ${num}`],
                allData?.clean_data?.['Comparable Rental Data']?.[`COMPARABLE Rental No #${num}`],
                data?.[`Rental ${num}`],
                allData?.[`Rental ${num}`],
            ];
            for (const cand of candidates) {
                if (cand && typeof cand === 'object' && Object.keys(cand).length > 0) {
                    if (cand['Current Monthly Rent'] !== undefined || cand['Rent/Gross Bldg. Area'] !== undefined || cand['Date of Lease(s)'] !== undefined) {
                        return cand;
                    }
                }
            }
        }
        return {};
    };

    // Show only active rental comps (minimum 3, plus any additional rental comps present in data)
    const activeRentalComps = rentAdjustments.filter((rent, idx) => {
        if (idx < 3) return true;
        const compData = getRentalCompData(rent, idx);
        return Boolean(compData && (compData.Address || compData['Current Monthly Rent'] || compData['Gross Building Area']));
    });

    const getSubjectRentalData = () => {

        const subj = (data && data.Subject) || (allData && allData.Subject) || (allData?.clean_data?.Subject) || {};

        const subjRent = (data && data['Subject Rental']) || 

                         (allData && allData['Subject Rental']) || 

                         (allData?.['Comparable Rental Data']?.['Subject Rental']) ||

                         (allData?.clean_data?.['Comparable Rental Data']?.['Subject Rental']) || {};

        return { ...subjRent, ...subj };

    };



    const subjectRentalObj = getSubjectRentalData();

    const effectiveSubjectFields = React.useMemo(() => {
        let f = [...(subjectFields || [])];
        if (!f.includes('Unit #')) {
            const idx = f.indexOf('Property Address');
            if (idx !== -1) {
                f.splice(idx + 1, 0, 'Unit #');
            } else {
                f.push('Unit #');
            }
        }
        return f;
    }, [subjectFields]);

    return (



    <>

        <ActionButtons

            handleStateRequirementCheck={handleStateRequirementCheck}

            stateReqLoading={stateReqLoading}

            handleClientRequirementCheck={handleClientRequirementCheck}

            clientReqLoading={clientReqLoading}

            handleEscalationCheck={handleEscalationCheck}

            escalationLoading={escalationLoading}

        />

        <SubjectInfoCard id="subject-info" title="Subject Information" fields={effectiveSubjectFields} data={data} extractionAttempted={extractionAttempted} onDataChange={handleDataChange} isEditable={true} editingField={editingField} setEditingField={setEditingField} highlightedFields={highlightedSubjectFields} allData={allData} comparisonData={comparisonData} getComparisonStyle={getComparisonStyle} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onSubjectRevisionButtonClick} revisionHandlers={revisionHandlers} />



        <GridInfoCard id="contract-section" title="Contract Section" fields={contractFields} data={data.CONTRACT} cardClass="bg-secondary" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['CONTRACT', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} highlightedFields={highlightedContractFields} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onContractRevisionButtonClick} revisionHandlers={revisionHandlers} />



        <GridInfoCard id="neighborhood-section" title="Neighborhood Section" fields={neighborhoodFields} data={data.NEIGHBORHOOD} cardClass="bg-info" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['NEIGHBORHOOD', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onNeighborhoodRevisionButtonClick} revisionHandlers={revisionHandlers} />

        <GridInfoCard id="site-section" title="Site Section" fields={siteFields} data={data} cardClass="bg-warning" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} highlightedFields={highlightedSiteFields} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onSiteRevisionButtonClick} revisionHandlers={revisionHandlers} />



        <GridInfoCard id="improvements-section" title="Improvements Section" fields={improvementsFields} data={data} cardClass="bg-success" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onImprovementsRevisionButtonClick} revisionHandlers={revisionHandlers} />



        <GridInfoCard id="info-of-sales-section" title="Sales Comparison Approach" fields={infoOfSalesFields} data={data.INFO_OF_SALES} cardClass="bg-primary" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['INFO_OF_SALES', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />



        <SalesComparisonSection

            data={data}

            extractionAttempted={extractionAttempted}

            handleDataChange={handleDataChange}

            editingField={editingField}



            setEditingField={setEditingField}

            salesGridRows={salesGridRows1025 || salesGridRows}

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

        <div id="comparable-rental-data" style={{ marginBottom: '1rem', marginTop: '1rem' }} className="card shadow mb-4">

            <div className="card-header CAR1 bg-info text-white" style={{ position: 'sticky', top: 0, zIndex: 10 }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                    <strong>COMPARABLE RENTAL DATA</strong>

                    {on1007RevisionButtonClick && (

                        <Tooltip title="Revision Language">

                            <IconButton onClick={on1007RevisionButtonClick} size="small" sx={{ color: 'white', marginLeft: 'auto' }}><LibraryBooksIcon /></IconButton>

                        </Tooltip>

                    )}

                </div>

            </div>

            <div className="card-body p-2 table-container" style={{ overflowX: 'auto' }}>

                <table className="table table-hover mb-0" style={{ fontSize: '0.8rem', minWidth: '1000px', border: '1px solid #ccc', borderCollapse: 'collapse', width: '100%' }}>

                    <thead className="table-light">
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                            <th colSpan={2} className="border border-gray-400 p-1 font-bold" style={{ border: '1px solid #ccc', width: '150px' }}>FEATURE</th>
                            <th colSpan={4} className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc' }}>SUBJECT</th>
                            {activeRentalComps.map((rent, idx) => {
                                const headerText = rent.replace(/COMPARABLE\s*Rental\s*No\s*#/i, 'COMPARABLE RENTAL # ');
                                return (
                                    <th key={idx} colSpan={5} className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc' }}>
                                        {headerText}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            "Address",
                            "Proximity to Subject",
                            "Current Monthly Rent",
                            "Rent/Gross Bldg. Area",
                            "Rent Control",
                            "Data Source(s)",
                            "Date of Lease(s)",
                            "Location",
                            "Actual Age",
                            "Condition",
                            "Gross Building Area"
                        ].map((feature, idx) => {
                            const isMissingSubject = extractionAttempted && (!subjectRentalObj || !subjectRentalObj[feature]);
                            const subjectVal = (data?.Subject && data.Subject[feature] !== undefined && data.Subject[feature] !== '')
                                ? data.Subject[feature]
                                : (subjectRentalObj[feature] || '');
                            return (
                                <tr key={idx}>
                                    <td colSpan={2} className="border border-gray-400 p-1 font-medium" style={{ border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#fafafa' }}>{feature}</td>
                                    <td colSpan={4} className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                        <EditableField
                                            fieldPath={['Subject', feature]}
                                            value={subjectVal}
                                            onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                            isMissing={isMissingSubject}
                                            isEditable={true}
                                            manualValidations={manualValidations} handleManualValidation={handleManualValidation} allData={allData} />
                                    </td>
                                    {activeRentalComps.map((rent, cidx) => {
                                        const compData = getRentalCompData(rent, cidx);
                                        const compVal = (data?.[rent] && data[rent][feature] !== undefined && data[rent][feature] !== '')
                                            ? data[rent][feature]
                                            : (compData[feature] || '');
                                        const hasComp = Boolean(compData && (compData.Address || compData['Current Monthly Rent'] || compData['Gross Building Area']));
                                        const isMissingComp = extractionAttempted && hasComp && (!compVal);
                                        return (
                                            <td key={cidx} colSpan={5} className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                                <EditableField
                                                    fieldPath={[rent, feature]}
                                                    value={compVal}
                                                    onDataChange={handleDataChange}
                                                    editingField={editingField} setEditingField={setEditingField}
                                                    isMissing={isMissingComp} saleName={rent}
                                                    isEditable={true} manualValidations={manualValidations} handleManualValidation={handleManualValidation} allData={allData}
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}

                        <tr style={{ backgroundColor: '#f9fafb' }}>
                            <td rowSpan={6} className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', verticalAlign: 'middle', writingMode: 'vertical-rl', transform: 'rotate(180deg)', width: '40px', backgroundColor: '#f3f4f6' }}>
                                Unit Breakdown
                            </td>
                            <td className="border border-gray-400 p-1 font-bold" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}>Unit #</td>

                            <td colSpan={3} className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#f3f4f6' }}>Rm Count</td>
                            <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#f3f4f6' }}>Size Sq. Ft.</td>

                            {activeRentalComps.map((rent, idx) => (
                                <React.Fragment key={idx}>
                                    <td colSpan={3} className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#f3f4f6' }}>Rm Count</td>
                                    <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#f3f4f6' }}>Size Sq. Ft.</td>
                                    <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#f3f4f6' }}>Monthly Rent</td>
                                </React.Fragment>
                            ))}
                        </tr>

                        <tr style={{ backgroundColor: '#f9fafb' }}>
                            <td className="border border-gray-400 p-1 font-bold" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}></td>
                            <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}>Tot</td>
                            <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}>Br</td>
                            <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}>Ba</td>
                            <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}>
                                {subjectRentalObj['Gross Building Area'] || ''}
                            </td>
                            {activeRentalComps.map((rent, idx) => {
                                const cData = getRentalCompData(rent, idx);
                                return (
                                    <React.Fragment key={idx}>
                                        <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}>Tot</td>
                                        <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}>Br</td>
                                        <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}>Ba</td>
                                        <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}>
                                            {cData['Gross Building Area'] || ''}
                                        </td>
                                        <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}>
                                            {cData['Current Monthly Rent'] || ''}
                                        </td>
                                    </React.Fragment>
                                );
                            })}
                        </tr>

                        {[1, 2, 3, 4].map((u) => {
                            const totKey = `Unit Breakdown Rm Count Tot Unit # ${u}`;
                            const brKey = `Unit Breakdown Rm Count Br Unit # ${u}`;
                            const baKey = `Unit Breakdown Rm Count Ba Unit # ${u}`;
                            const sizeKey = `Unit Breakdown Size Unit # ${u}`;
                            const rentKey = `Unit Breakdown Monthly Rent Unit # ${u}`;

                            const subjTot = (data?.Subject && data.Subject[totKey] !== undefined && data.Subject[totKey] !== '') ? data.Subject[totKey] : (subjectRentalObj[totKey] || '');
                            const subjBr = (data?.Subject && data.Subject[brKey] !== undefined && data.Subject[brKey] !== '') ? data.Subject[brKey] : (subjectRentalObj[brKey] || '');
                            const subjBa = (data?.Subject && data.Subject[baKey] !== undefined && data.Subject[baKey] !== '') ? data.Subject[baKey] : (subjectRentalObj[baKey] || '');
                            const subjSize = (data?.Subject && data.Subject[sizeKey] !== undefined && data.Subject[sizeKey] !== '') ? data.Subject[sizeKey] : (subjectRentalObj[sizeKey] || '');

                            return (
                                <tr key={u}>
                                    <td className="border border-gray-400 p-1 font-medium" style={{ border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#fafafa' }}>Unit #{u}</td>

                                    <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                        <EditableField fieldPath={['Subject', totKey]} value={subjTot} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                    </td>
                                    <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                        <EditableField fieldPath={['Subject', brKey]} value={subjBr} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                    </td>
                                    <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                        <EditableField fieldPath={['Subject', baKey]} value={subjBa} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                    </td>
                                    <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                        <EditableField fieldPath={['Subject', sizeKey]} value={subjSize} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                    </td>

                                    {activeRentalComps.map((rent, cidx) => {
                                        const compData = getRentalCompData(rent, cidx);
                                        const cTot = (data?.[rent] && data[rent][totKey] !== undefined && data[rent][totKey] !== '') ? data[rent][totKey] : (compData[totKey] || '');
                                        const cBr = (data?.[rent] && data[rent][brKey] !== undefined && data[rent][brKey] !== '') ? data[rent][brKey] : (compData[brKey] || '');
                                        const cBa = (data?.[rent] && data[rent][baKey] !== undefined && data[rent][baKey] !== '') ? data[rent][baKey] : (compData[baKey] || '');
                                        const cSize = (data?.[rent] && data[rent][sizeKey] !== undefined && data[rent][sizeKey] !== '') ? data[rent][sizeKey] : (compData[sizeKey] || '');
                                        const cRent = (data?.[rent] && data[rent][rentKey] !== undefined && data[rent][rentKey] !== '') ? data[rent][rentKey] : (compData[rentKey] || '');
                                        return (
                                            <React.Fragment key={cidx}>
                                                <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                                    <EditableField fieldPath={[rent, totKey]} value={cTot} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                                </td>
                                                <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                                    <EditableField fieldPath={[rent, brKey]} value={cBr} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                                </td>
                                                <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                                    <EditableField fieldPath={[rent, baKey]} value={cBa} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                                </td>
                                                <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                                    <EditableField fieldPath={[rent, sizeKey]} value={cSize} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                                </td>
                                                <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                                    <EditableField fieldPath={[rent, rentKey]} value={cRent} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                                </td>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            );
                        })}

                        <tr>
                            <td colSpan={2} className="border border-gray-400 p-1 font-medium" style={{ border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#fafafa' }}>Utilities Included</td>
                            <td colSpan={4} className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                <EditableField
                                    fieldPath={['Subject', 'Utilities Included']}
                                    value={(data?.Subject && data.Subject['Utilities Included'] !== undefined && data.Subject['Utilities Included'] !== '') ? data.Subject['Utilities Included'] : (subjectRentalObj['Utilities Included'] || '')}
                                    onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                    isEditable={true} allData={allData} />
                            </td>
                            {activeRentalComps.map((rent, cidx) => {
                                const compData = getRentalCompData(rent, cidx);
                                const compUtil = (data?.[rent] && data[rent]['Utilities Included'] !== undefined && data[rent]['Utilities Included'] !== '')
                                    ? data[rent]['Utilities Included']
                                    : (compData['Utilities Included'] || '');
                                return (
                                    <td key={cidx} colSpan={5} className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                        <EditableField
                                            fieldPath={[rent, 'Utilities Included']}
                                            value={compUtil}
                                            onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                            isEditable={true} allData={allData} />
                                    </td>
                                );
                            })}
                        </tr>

                        <tr>
                            <td colSpan={2} className="border border-gray-400 p-1 font-medium" style={{ border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#fafafa' }}>Parking</td>
                            <td colSpan={4} className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                <EditableField
                                    fieldPath={['Subject', 'Parking']}
                                    value={(data?.Subject && data.Subject['Parking'] !== undefined && data.Subject['Parking'] !== '') ? data.Subject['Parking'] : (subjectRentalObj['Parking'] || '')}
                                    onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                    isEditable={true} allData={allData} />
                            </td>
                            {activeRentalComps.map((rent, cidx) => {
                                const compData = getRentalCompData(rent, cidx);
                                const compParking = (data?.[rent] && data[rent]['Parking'] !== undefined && data[rent]['Parking'] !== '')
                                    ? data[rent]['Parking']
                                    : (compData['Parking'] || '');
                                return (
                                    <td key={cidx} colSpan={5} className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                        <EditableField
                                            fieldPath={[rent, 'Parking']}
                                            value={compParking}
                                            onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                            isEditable={true} allData={allData} />
                                    </td>
                                );
                            })}
                        </tr>

                        <tr>
                            <td colSpan={2} className="border border-gray-400 p-1 font-medium" style={{ border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#fafafa' }}>Other</td>
                            <td colSpan={4} className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                <EditableField
                                    fieldPath={['Subject', 'Other']}
                                    value={(data?.Subject && data.Subject['Other'] !== undefined && data.Subject['Other'] !== '') ? data.Subject['Other'] : (subjectRentalObj['Other'] || '')}
                                    onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                    isEditable={true} allData={allData} />
                            </td>
                            {activeRentalComps.map((rent, cidx) => {
                                const compData = getRentalCompData(rent, cidx);
                                const compOther = (data?.[rent] && data[rent]['Other'] !== undefined && data[rent]['Other'] !== '')
                                    ? data[rent]['Other']
                                    : (compData['Other'] || '');
                                return (
                                    <td key={cidx} colSpan={5} className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                        <EditableField
                                            fieldPath={[rent, 'Other']}
                                            value={compOther}
                                            onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                            isEditable={true} allData={allData} />
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="p-3 border-top" style={{ backgroundColor: '#f9fafb' }}>
                <label className="font-bold mb-1 d-block" style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                    Analysis of rental data and support for estimated market rents for the individual subject units reported below (including the adequacy of the comparables, rental concessions, etc.)
                </label>
                <EditableField
                    fieldPath={['Rental Data Analysis Comment']}
                    value={data?.['Rental Data Analysis Comment'] || allData?.['Rental Data Analysis Comment'] || ''}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={true}
                    allData={allData}
                    multiline={true}
                />
            </div>
        </div>
                <SubjectRentScheduleTable data={data} onDataChange={(field, value) => handleDataChange(['SUBJECT_RENT_SCHEDULE', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} extractionAttempted={extractionAttempted} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />

        <div id="prior-sale-history-section" style={{ marginBottom: '1rem', marginTop: '1rem' }} className="card shadow mb-4">

            <div className="card-header bg-dark text-white" style={{ position: 'sticky', top: 0, zIndex: 10 }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                    <strong>Prior Sale History</strong>

                </div>

            </div>

            <div className="card-body">

                <div className="row mb-3">

                    {[

                        "Prior Sale History: I did did not research the sale or transfer history of the subject property and comparable sales",

                        "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal",

                        "Prior Sale History: Data source(s) for subject",

                        "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale",

                        "Prior Sale History: Data source(s) for comparables",

                        "Prior Sale History: Report the results of the research and analysis of the prior sale or transfer history of the subject property and comparable sales",

                        "Prior Sale History: Analysis of prior sale or transfer history of the subject property and comparable sales"

                    ].map((field, idx) => (

                        <div className="col-12 col-md-6 mb-2" key={idx}>

                            <label className="form-label font-bold" style={{ fontSize: '0.75rem', color: '#555' }}>{field}</label>

                            <EditableField

                                fieldPath={[field]}

                                value={data[field] || ''}

                                onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}

                                isEditable={true} allData={allData} />

                        </div>

                    ))}

                </div>



                <div className="table-container" style={{ overflowX: 'auto', marginTop: '1.5rem' }}>

                    <table className="table table-hover mb-0" style={{ fontSize: '0.8rem', minWidth: '1000px', border: '1px solid #ccc', borderCollapse: 'collapse', width: '100%' }}>

                        <thead className="table-light">

                            <tr style={{ backgroundColor: '#f3f4f6' }}>

                                <th className="border border-gray-400 p-1 font-bold" style={{ border: '1px solid #ccc', width: '250px' }}>ITEM</th>

                                <th className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc' }}>SUBJECT</th>

                                {comparableSales.map((sale, idx) => (

                                    <th key={idx} className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc' }}>{sale}</th>

                                ))}

                            </tr>

                        </thead>

                        <tbody>

                            {[

                                { label: "Date of Prior Sale/Transfer", key: "Date of Prior Sale/Transfer" },

                                { label: "Price of Prior Sale/Transfer", key: "Price of Prior Sale/Transfer" },

                                { label: "Data Source(s)", key: "Data Source(s) for prior sale" },

                                { label: "Effective Date of Data Source(s)", key: "Effective Date of Data Source(s) for prior sale" }

                            ].map((row, idx) => (

                                <tr key={idx}>

                                    <td className="border border-gray-400 p-1 font-medium" style={{ border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#fafafa' }}>{row.label}</td>



                                    <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>

                                        <EditableField

                                            fieldPath={['Subject', row.key]}

                                            value={

                                                (data.Subject && data.Subject[row.key]) ||

                                                (data.SUBJECT && data.SUBJECT[row.key]) ||

                                                (data['Sales Grid']?.Subject && data['Sales Grid'].Subject[row.key]) ||

                                                (data.SALES_GRID?.Subject && data.SALES_GRID.Subject[row.key]) ||

                                                (data.sales_grid?.Subject && data.sales_grid.Subject[row.key]) ||

                                                data[row.key] ||

                                                data[`Prior Sale History: ${row.key}`] ||

                                                ''

                                            }

                                            onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}

                                            isEditable={true} allData={allData} />

                                    </td>



                                    {comparableSales.map((sale, sidx) => {

                                        const compVal =

                                            (data[sale] && data[sale][row.key]) ||

                                            (data.SALES_GRID && data.SALES_GRID[sale] && data.SALES_GRID[sale][row.key]) ||

                                            (data['Sales Grid'] && data['Sales Grid'][sale] && data['Sales Grid'][sale][row.key]) ||

                                            data[`${sale} ${row.key}`] ||

                                            '';

                                        return (

                                            <td key={sidx} className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>

                                                <EditableField

                                                    fieldPath={[sale, row.key]}

                                                    value={compVal}

                                                    onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}

                                                    isEditable={true} allData={allData} />

                                            </td>

                                        );

                                    })}

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

            </div>

        </div>



        <GridInfoCard id="reconciliation-section" title="RECONCILIATION" fields={reconciliationFields} data={data.RECONCILIATION} cardClass="bg-secondary" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['RECONCILIATION', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onReconciliationRevisionButtonClick} revisionHandlers={revisionHandlers} />

        <GridInfoCard id="cost-approach-section" title="Cost Approach" fields={costApproachFields} data={data} cardClass="bg-dark" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onCostApproachRevisionButtonClick} revisionHandlers={revisionHandlers} />

        <GridInfoCard id="income-approach-section" title="Income Approach" fields={incomeApproachFields} data={data} cardClass="bg-danger" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />

        <GridInfoCard id="pud-info-section" title="PUD Information" fields={pudInformationFields} data={data} cardClass="bg-secondary" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />

        <GridInfoCard id="market-conditions-summary" title="Market Conditions Narrative" fields={marketConditionsFields} data={{ ...data, ...(data?.MARKET_CONDITIONS || {}) }} cardClass="bg-warning" usePre={true} extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['MARKET_CONDITIONS', field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />

        <MarketConditionsTable id="market-conditions-section" data={data} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} marketConditionsRows={marketConditionsRows} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />

        <CondoCoopProjectsTable id="condo-coop-section" title="CONDO/CO-OP PROJECTS" data={data} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} condoCoopProjectsRows={condoCoopProjectsRows} extractionAttempted={extractionAttempted} revisionHandlers={revisionHandlers} />

        <GridInfoCard id="condo-foreclosure-section" fields={condoForeclosureFields} data={data.CONDO_FORECLOSURE} usePre={true} extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['CONDO_FORECLOSURE', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />

        <GridInfoCard id="appraiser-section" title="CERTIFICATION" fields={appraiserFields} data={data.CERTIFICATION} cardClass="bg-info" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['CERTIFICATION', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onCertificationRevisionButtonClick} revisionHandlers={revisionHandlers} />



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



        <MapAndSketchExhibitsSection id="map-sketch-exhibits-section" data={data} allData={allData} selectedFile={selectedFile} />

        <PhotosGallerySection id="photos-exhibits-section" data={data} allData={allData} extractedPhotos={allData?.EXTRACTED_PHOTOS || data?.EXTRACTED_PHOTOS || []} />

    </>

    );

};



export default Form1025;

