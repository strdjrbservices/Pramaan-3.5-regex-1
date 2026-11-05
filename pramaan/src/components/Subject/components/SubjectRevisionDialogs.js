import React from 'react';
import { RevisionLanguageDialog } from './dialogs';
import {
  SUBJECT_REVISION_PROMPTS,
  CONTRACT_REVISION_PROMPTS,
  NEIGHBORHOOD_REVISION_PROMPTS,
  SITE_REVISION_PROMPTS,
  IMPROVEMENTS_REVISION_PROMPTS,
  SALES_GRID_REVISION_PROMPTS,
  RECONCILIATION_REVISION_PROMPTS,
  COST_APPROACH_REVISION_PROMPTS,
  CERTIFICATION_REVISION_PROMPTS,
  ADDENDUM_GENERAL_REVISION_PROMPTS,
  FORM_1007_REVISION_PROMPTS
} from '../../tools/revisionPrompts';

export const SubjectRevisionDialogs = ({
  data = {},
  setNotification,
  setNotes,
  isContractRevisionLangDialogOpen,
  setContractRevisionLangDialogOpen,
  isNeighborhoodRevisionLangDialogOpen,
  setNeighborhoodRevisionLangDialogOpen,
  isSiteRevisionLangDialogOpen,
  setSiteRevisionLangDialogOpen,
  isImprovementsRevisionLangDialogOpen,
  setImprovementsRevisionLangDialogOpen,
  isSalesGridRevisionLangDialogOpen,
  setSalesGridRevisionLangDialogOpen,
  isReconciliationRevisionLangDialogOpen,
  setReconciliationRevisionLangDialogOpen,
  isCostApproachRevisionLangDialogOpen,
  setCostApproachRevisionLangDialogOpen,
  isCertificationRevisionLangDialogOpen,
  setCertificationRevisionLangDialogOpen,
  isAddendumRevisionLangDialogOpen,
  setAddendumRevisionLangDialogOpen,
  is1007RevisionLangDialogOpen,
  set1007RevisionLangDialogOpen,
  isRevisionLangDialogOpen,
  setRevisionLangDialogOpen,
  isPropertyAddressRevisionLangDialogOpen,
  setPropertyAddressRevisionLangDialogOpen,
  isLenderClientRevisionLangDialogOpen,
  setLenderClientRevisionLangDialogOpen,
  isFinancialAssistanceRevisionLangDialogOpen,
  setFinancialAssistanceRevisionLangDialogOpen,
  isDateOfContractRevisionLangDialogOpen,
  setDateOfContractRevisionLangDialogOpen,
  isHoaRevisionLangDialogOpen,
  setHoaRevisionLangDialogOpen,
  isonewithAccessoryUnitRevisionLangDialogOpen,
  setOneWithAccessoryUnitRevisionLangDialogOpen,
  isLenderClientAddressRevisionLangDialogOpen,
  setLenderClientAddressRevisionLangDialogOpen,
  isContractPriceRevisionLangDialogOpen,
  setContractPriceRevisionLangDialogOpen,
  isNeighborhoodBoundariesRevisionLangDialogOpen,
  setNeighborhoodBoundariesRevisionLangDialogOpen,
  isOtherLandUseRevisionLangDialogOpen,
  setOtherLandUseRevisionLangDialogOpen,
  isZoningComplianceRevisionLangDialogOpen,
  setZoningComplianceRevisionLangDialogOpen,
  isAreaRevisionLangDialogOpen,
  setAreaRevisionLangDialogOpen,
  isFemaHazardRevisionLangDialogOpen,
  setFemaHazardRevisionLangDialogOpen
}) => {
  return (
    <>
      <RevisionLanguageDialog
        open={isContractRevisionLangDialogOpen}
        onClose={() => setContractRevisionLangDialogOpen(false)}
        title="Contract Section Revision Language"
        prompts={CONTRACT_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isNeighborhoodRevisionLangDialogOpen}
        onClose={() => setNeighborhoodRevisionLangDialogOpen(false)}
        title="Neighborhood Section Revision Language"
        prompts={NEIGHBORHOOD_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });

        }}
      />
      <RevisionLanguageDialog
        open={isSiteRevisionLangDialogOpen}
        onClose={() => setSiteRevisionLangDialogOpen(false)}
        title="Site Section Revision Language"
        prompts={SITE_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });

        }}
      />
      <RevisionLanguageDialog
        open={isImprovementsRevisionLangDialogOpen}
        onClose={() => setImprovementsRevisionLangDialogOpen(false)}
        title="Improvements Section Revision Language"
        prompts={IMPROVEMENTS_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isSalesGridRevisionLangDialogOpen}
        onClose={() => setSalesGridRevisionLangDialogOpen(false)}
        title="Sales Comparison Grid Revision Language"
        prompts={SALES_GRID_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isReconciliationRevisionLangDialogOpen}
        onClose={() => setReconciliationRevisionLangDialogOpen(false)}
        title="Reconciliation Section Revision Language"
        prompts={RECONCILIATION_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isCostApproachRevisionLangDialogOpen}
        onClose={() => setCostApproachRevisionLangDialogOpen(false)}
        title="Cost Approach Section Revision Language"
        prompts={COST_APPROACH_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isCertificationRevisionLangDialogOpen}
        onClose={() => setCertificationRevisionLangDialogOpen(false)}
        title="Certification Section Revision Language"
        prompts={CERTIFICATION_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isAddendumRevisionLangDialogOpen}
        onClose={() => setAddendumRevisionLangDialogOpen(false)}
        title="General / Addendum Revision Language"
        prompts={ADDENDUM_GENERAL_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
          setAddendumRevisionLangDialogOpen(false);
        }}
      />
      <RevisionLanguageDialog
        open={is1007RevisionLangDialogOpen}
        onClose={() => set1007RevisionLangDialogOpen(false)}
        title="1007 / Rent Schedule Revision Language"
        prompts={FORM_1007_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isRevisionLangDialogOpen}
        onClose={() => setRevisionLangDialogOpen(false)}
        title="Subject Section Revision Language"
        prompts={SUBJECT_REVISION_PROMPTS}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isPropertyAddressRevisionLangDialogOpen}
        onClose={() => setPropertyAddressRevisionLangDialogOpen(false)}
        title="Property Address Revision Language"
        prompts={[
          `The subject's street name should reflect as "${data['Property Address'] || '...'}", please verify and revise.`,
          `Please verify and revise the subject's street name and suffix in the Property Address ("${data['Property Address'] || '...'}").`,
          `Please update the Property Address ("${data['Property Address'] || '...'}") to match legal and title documentation.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isLenderClientRevisionLangDialogOpen}
        onClose={() => setLenderClientRevisionLangDialogOpen(false)}
        title="Lender/Client Revision Language"
        prompts={[
          `Please revise the lender/client name ("${data['Lender/Client'] || '...'}") to match the engagement letter and order form.`,
          `Please revise the spelling and legal entity designator (e.g. Inc, LLC, NA) of the lender/client name ("${data['Lender/Client'] || '...'}").`,
          `Please verify the lender/client name ("${data['Lender/Client'] || '...'}") and update to match legal documentation.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isFinancialAssistanceRevisionLangDialogOpen}
        onClose={() => setFinancialAssistanceRevisionLangDialogOpen(false)}
        title="Financial Assistance Revision Language"
        prompts={[
          "The report indicates 'Is there any financial assistance to be paid by any party on behalf of the borrower?' as YES; however, the concession amount is noted as $0. Please revise.",
          `Please verify the financial assistance concession amount ("${data['Financial Assistance $'] || data['Concession $'] || '$0'}") and match with the purchase agreement.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isDateOfContractRevisionLangDialogOpen}
        onClose={() => setDateOfContractRevisionLangDialogOpen(false)}
        title="Date of Contract Revision Language"
        prompts={[
          `The 'Date of Contract' ("${data['Date of Contract'] || '...'}") noted in the contract section does not match the purchase agreement; please verify and revise.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isHoaRevisionLangDialogOpen}
        onClose={() => setHoaRevisionLangDialogOpen(false)}
        title="HOA Revision Language"
        prompts={[
          "In the subject section, the HOA amount is noted; however, the payment frequency (per year or per month) is missing. Please revise.",
          "The PUD box is marked in the subject section; however, the HOA amount is noted as $0. Please verify and update."
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
          setHoaRevisionLangDialogOpen(false);
        }}
      />
      <RevisionLanguageDialog
        open={isonewithAccessoryUnitRevisionLangDialogOpen}
        onClose={() => setOneWithAccessoryUnitRevisionLangDialogOpen(false)}
        title="One with Accessory Unit Revision Language"
        prompts={[
          "Photos and sketches indicate the subject has an ADU; however, the 'One with Accessory Unit' box is not marked in the Improvements section. Please revise.",
          "The guest house does not have a kitchen; however, it is marked as an accessory unit. Please verify/revise qualifications as an ADU.",
          "Photos and sketches do not indicate an ADU; however, the 'One with Accessory Unit' box is marked in the Improvements section. Please verify and revise."
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
          setOneWithAccessoryUnitRevisionLangDialogOpen(false);
        }}
      />
      <RevisionLanguageDialog
        open={isLenderClientAddressRevisionLangDialogOpen}
        onClose={() => setLenderClientAddressRevisionLangDialogOpen(false)}
        title="Lender/Client Address Revision Language"
        prompts={[
          `Please update the lender address to the new address, as it was not updated in the system:\n3232 E Cesar Chavez St, Suite 1-320, Austin, TX 78702.`,
          `Please update the lender/client address ("${data['Address (Lender/Client)'] || '...'}") in the subject section to match the order form.`,
          `Please revise the lender/client address ("${data['Address (Lender/Client)'] || '...'}") to ensure street, city, state, and zip code match the engagement letter.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isContractPriceRevisionLangDialogOpen}
        onClose={() => setContractPriceRevisionLangDialogOpen(false)}
        title="Contract Price Revision Language"
        prompts={[
          "The 'Contract Price' noted in the report does not match the purchase agreement; please verify and revise.",
          `The report shows the 'Contract Price' as "${data['Contract Price $'] || '...'}"; please verify and reconcile with the purchase contract.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isNeighborhoodBoundariesRevisionLangDialogOpen}
        onClose={() => setNeighborhoodBoundariesRevisionLangDialogOpen(false)}
        title="Neighborhood Boundaries Revision Language"
        prompts={[
          "Please provide complete neighborhood boundaries for North, South, East, and West directions in the neighborhood section.",
          `Neighborhood boundaries ("${data['Neighborhood Boundaries'] || '...'}") appear incomplete or missing specific directional boundaries. Please revise.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isOtherLandUseRevisionLangDialogOpen}
        onClose={() => setOtherLandUseRevisionLangDialogOpen(false)}
        title="Other Land Use Revision Language"
        prompts={[
          "Please revise the 'Present Land Use' percentages in the neighborhood section so that the total equals 100%.",
          "Please provide explanation and comment for the 'Other' land use percentage noted in the neighborhood section."
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isZoningComplianceRevisionLangDialogOpen}
        onClose={() => setZoningComplianceRevisionLangDialogOpen(false)}
        title="Zoning Compliance Revision Language"
        prompts={[
          "The 'Zoning Compliance' is marked as 'Legal Nonconforming (Grandfathered Use)'; please comment whether the subject can be rebuilt if destroyed.",
          "The 'Zoning Compliance' is marked as 'No Zoning'; please comment whether the subject can be rebuilt if destroyed."
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isAreaRevisionLangDialogOpen}
        onClose={() => setAreaRevisionLangDialogOpen(false)}
        title="Area Revision Language"
        prompts={[
          `Please state the site area ("${data['Area'] || '...'}") in square feet (sf) or acres (ac) in the site section.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
      <RevisionLanguageDialog
        open={isFemaHazardRevisionLangDialogOpen}
        onClose={() => setFemaHazardRevisionLangDialogOpen(false)}
        title="FEMA Hazard Revision Language"
        prompts={[
          `'FEMA Special Flood Hazard Area' is marked as NO; however, FEMA Flood Zone is "${data['FEMA Flood Zone'] || '...'}". Please reconcile and revise.`
        ]}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setNotification({ open: true, message: 'Copied to clipboard!', severity: 'success' });
        }}
        onAddToNotepad={(text) => {
          setNotes(prev => `${prev}\n- ${text}`);
          setNotification({ open: true, message: 'Added to notepad!', severity: 'success' });
        }}
      />
    </>
  );
};

export default SubjectRevisionDialogs;
