import json
from typing import Any, Dict, List, Optional

SUMMARY_FIELDS = [
    'ADU File Check','From Type','Exposure comment','Prior service comment','ANSI','FHA Case No.','Opinion of Market Value', 'Market Value Condition', 'Effective Date of Appraisal', 'Assignment Reason',
    'Borrower Name', 'Current Owner of Public Record', 'Listing Status', 'Property Valuation Method',
    'Appraiser Name', 'Construction Method', 'Attachment Type', 'Overall Quality', 'Overall Condition',
    'Planned Unit Development (PUD)', 'Condominium', 'Cooperative', 'Condop', 'Subject Site Owned in Common',
    'Units Excluding ADUs', 'Accessory Dwelling Units (ADUs)', 'Property Rights Appraised',
    'Highest and Best Use as Present Use', 'Zoning Compliance', 'Apparent Defects, Damages, Deficiencies Requiring Action',
    'Appraisal Version', 'Appraiser Reference ID', 'Property Data Report Used in Lieu of Inspection',
    'Client/Lender Company Name', 'Client/Lender Company Address', 'Appraisal Management Company Name',
    'Appraisal Management Company Address', 'Appraiser Company Name', 'Appraiser Company Address',
    'Subject Property Inspection', 'Exterior Physical Inspection', 'Interior Physical Inspection', 'Inspection Date',
    'Appraiser Credential Level', 'Appraiser ID', 'Appraiser State', 'Appraiser License Expiration Date', 'Appraiser ASC Identifier',
    'Physical Address', 'County', 'Neighborhood Name', 'Property on Native American Lands',
    'Homeowner Responsible for All Exterior Maintenance of Dwelling(s)', 'New Construction',
    'Special Tax Assessments', 'All Rights Included in Appraisal', 'Legal Description', 'Subject Property Commentary','Indicated Value by Sales Comparison Approach Indicated'
]

CONTRACT_FIELDS = [
    'Assignment Reason', 'Borrower Name', 'Current Owner of Public Record', 'Property Valuation Method',
    'Property Data Report Used in Lieu of Inspection'
]

SUBJECT_FIELDS = [
    'Client/Lender Company Name', 'Client/Lender Company Address', 'Appraisal Management Company Name',
    'Appraisal Management Company Address', 'Appraiser Name', 'Appraiser Company Name', 'Appraiser Company Address',
    'Subject Property Inspection', 'Exterior Physical Inspection', 'Interior Physical Inspection', 'Inspection Date',
    'Appraiser Credential Level', 'Appraiser ID', 'Appraiser State', 'Appraiser License Expiration Date', 'Appraiser ASC Identifier',
    'Physical Address', 'County', 'Neighborhood Name', 'Planned Unit Development (PUD)', 'Condominium',
    'Cooperative', 'Condop', 'Property on Native American Lands', 'Subject Site Owned in Common',
    'Homeowner Responsible for All Exterior Maintenance of Dwelling(s)', 'New Construction', 'Attachment Type',
    'Units Excluding ADUs', 'Accessory Dwelling Units (ADUs)', 'Special Tax Assessments', 'Property Rights Appraised',
    'All Rights Included in Appraisal', 'Legal Description', 'Subject Property Commentary'
]

SITE_FIELDS = [
    'Total Site Size', 'Number of Parcels', 'Assessor Parcel Number (APN)', 'APN Description', 'Parcel Size',
    'Zoning Compliance', 'Zoning Classification Code', 'Zoning Classification Description', 'Primary Access',
    'Street Type and Surface', 'Typical for Market', 'Non-Residential Use',
    'Site Influence', 'Site Influence Proximity', 'Site Influence Detail', 'Site Influence Impact', 'Site Influence Comment',
    'View', 'Range of View', 'View Impact',
    'Site Feature', 'Site Feature Detail', 'Site Feature Impact', 'Site Feature Comment',
    'Broadband Internet Available',
    'Electricity', 'Electricity Detail', 'Electricity Private Utility Impact', 'Electricity Comment',
    'Sanitary Sewer', 'Sanitary Sewer Detail', 'Sanitary Sewer Private Utility Impact', 'Sanitary Sewer Comment',
    'Water', 'Water Detail', 'Water Private Utility Impact', 'Water Comment',
    'Utility Type (Public/Private)', 'Utility Detail', 'Utility Impact', 'Utility Comment',
    'Apparent Defects, Damages, Deficiencies (Site)', 'Site Influence Commentary', 'View Commentary', 'Site Features Commentary', 'Site Commentary',
    'Property Access (Street Scene)', 'Renewable Energy Components', 'Ownership', 'Financing Arrangement',
    'Known Building Certifications', 'Known Efficiency Ratings',
    'Energy Efficient and Green Features Impact to Value/Marketability', 'Energy Efficient and Green Features Exhibits',
    'Legally Permissible', 'Physically Possible', 'Financially Feasible', 'Maximally Productive',
    'Highest and Best Use as Improved (Present Use)', 'Highest and Best Use Commentary'
]

IMPROVEMENTS_FIELDS = [
    'Units in Structure', 'Floors in Building', 'Dwelling Style', 'Front Door Elevation', 'Year Built',
    'Construction Method', 'Converted Area', 'Exterior Quality Rating', 'Exterior Condition Rating',
    'Exterior Walls and Trim', 'Exterior Walls and Trim Quality Comment', 'Exterior Walls and Trim Condition Status', 'Exterior Walls and Trim Condition Comment',
    'Foundation', 'Foundation Quality Comment', 'Foundation Condition Status', 'Foundation Condition Comment',
    'Roof', 'Roof Estimated Age', 'Roof Quality Comment', 'Roof Condition Status', 'Roof Condition Comment',
    'Windows', 'Windows Quality Comment', 'Windows Condition Status', 'Windows Condition Comment',
    'Heating System', 'Heating Fuel', 'Cooling System', 'Core Heating System Below Grade', 'Other Mechanical Systems', 'Exterior Features',
    'Apparent Defects, Damages, Deficiencies (Dwelling Exterior)', 'Dwelling Exterior Commentary', 'Dwelling Exterior Exhibits',
    'Amenity Category', 'Subject Property Amenity', 'Amenity Material', 'Amenity Detail',
    'Apparent Defects, Damages, Deficiencies (Subject Property Amenities)', 'Subject Property Amenities Exhibits',
    'Overall Quality', 'Exterior Quality', 'Overall Condition',
    'Exterior Condition', 'Reconciliation of Overall Quality and Condition',

    'Finished Above Grade', 'Unfinished Above Grade', 'Finished Below Grade', 'Unfinished Below Grade', 'Area Data Source',
    'Levels in Unit', 'Occupancy', 'Total Bedrooms', 'Total Bathrooms - Full', 'Total Bathrooms - Half',
    'Level in Unit Row 1', 'Grade Level Detail Row 1', 'Finish Row 1', 'Area Row 1', 'Room Summary Row 1',
    'Level in Unit Row 2', 'Grade Level Detail Row 2', 'Finish Row 2', 'Area Row 2', 'Room Summary Row 2',
    'Level in Unit Row 3', 'Grade Level Detail Row 3', 'Finish Row 3', 'Area Row 3', 'Room Summary Row 3',
    'Interior Quality Rating', 'Interior Condition Rating',

    'Kitchen/Bath Row 1 Room', 'Kitchen/Bath Row 1 Update Status', 'Kitchen/Bath Row 1 Time Frame', 'Kitchen/Bath Row 1 Quality Comment', 'Kitchen/Bath Row 1 Condition Status', 'Kitchen/Bath Row 1 Condition Comment',
    'Kitchen/Bath Row 2 Room', 'Kitchen/Bath Row 2 Update Status', 'Kitchen/Bath Row 2 Time Frame', 'Kitchen/Bath Row 2 Quality Comment', 'Kitchen/Bath Row 2 Condition Status', 'Kitchen/Bath Row 2 Condition Comment',
    'Kitchen/Bath Row 3 Room', 'Kitchen/Bath Row 3 Update Status', 'Kitchen/Bath Row 3 Time Frame', 'Kitchen/Bath Row 3 Quality Comment', 'Kitchen/Bath Row 3 Condition Status', 'Kitchen/Bath Row 3 Condition Comment',
    'Overall Update Status for Bathrooms',

    'Flooring Detail', 'Flooring Quality Comment', 'Flooring Condition Status', 'Flooring Condition Comment',
    'Walls and Ceiling Detail', 'Walls and Ceiling Quality Comment', 'Walls and Ceiling Condition Status', 'Walls and Ceiling Condition Comment',
    'Overall Update Status for Flooring',
    'Apparent Defects, Damages, Deficiencies (Unit Interior)'
]

NEIGHBORHOOD_FIELDS = [
    'Market Area Boundary', 'Active Listings', 'Median Days on Market', 'Lowest List Price',
    'Median List Price', 'Highest List Price', 'Pending Sales', 'Sales in Past 12 Months',
    'Lowest Sale Price', 'Median Sale Price', 'Highest Sale Price', 'Distressed Market Competition',
    'Price Trend Source', 'Demand / Supply', 'Marketing Time', 'Market Commentary',
    'Search Criteria Description', 'Price Trend Analysis Commentary',
    'Current or Relevant Listings', 'Data Source', 'Subject Listing Information Commentary',
    'Subject Listing Information Exhibits'
]

PRIOR_SALE_HISTORY_FIELDS = [
    'Prior Sales or Transfers',
    'Subject Transfer History Data Source',
    'Comparable Number',
    'Comparable Transfer Terms',
    'Comparable Transfer Date',
    'Comparable Transfer Amount',
    'Comparable Transfer Data Source',
    'Analysis of Prior Sale and Transfer History of Subject Property',
    'Analysis of Prior Sale and Transfer History of Comparable Sales',

    'Comparable 1 Transfer Terms', 'Comparable 1 Transfer Date', 'Comparable 1 Transfer Amount', 'Comparable 1 Transfer Data Source',
    'Comparable 2 Transfer Terms', 'Comparable 2 Transfer Date', 'Comparable 2 Transfer Amount', 'Comparable 2 Transfer Data Source',
    'Comparable 3 Transfer Terms', 'Comparable 3 Transfer Date', 'Comparable 3 Transfer Amount', 'Comparable 3 Transfer Data Source'
]

SalesGridFIELDS2 = [
    'Subject Property Address', 'Photo', 'Comparable Property Address', 'Data Source',
    'Proximity to Subject', 'List Price', 'Listing Status', 'Sale Price', 'Transfer Terms',
    'Financing Type', 'Sales Concessions', 'Contract Date', 'Sale Date', 'Days on Market',
    'Attached / Detached', 'Property Rights Appraised', 'Site Size', 'Site Influence (Location)',
    'View', 'Range of View', 'Year Built', 'Construction Method', 'Heating', 'Amenities',
    'Bedrooms', 'Bathrooms - Full', 'Bathrooms - Half', 'Finished Area Above Grade',
    'Finished Area Below Grade', 'Unfinished Area Below Grade', 'Exterior Quality',
    'Exterior Condition', 'Interior Quality', 'Interior Condition', 'Overall Quality',
    'Overall Condition', 'Vehicle Storage Type', 'Vehicle Storage Spaces', 'Vehicle Storage Detail',
    'List Price Adjustment', 'Sale Price Adjustment', 'Transfer Terms Adjustment',
    'Financing Type Adjustment', 'Sales Concessions Adjustment', 'Contract Date Adjustment',
    'Sale Date Adjustment', 'Site Size Adjustment', 'Amenities Adjustment', 'Bedrooms Adjustment',
    'Finished Area Above Grade Adjustment', 'Vehicle Storage Adjustment', 'Net Adjustment Total',
    'Adjusted Price', 'Comparable Weight'
]

COST_APPROACH_FIELDS = [
    'Indicated Value by Cost Approach', 'Depreciated Cost of Dwellings', 'As Is Value of Site Improvements',
    'Opinion of Site Value', 'Above Grade Finished Area', 'Cost Per Square Foot', 'Depreciated Cost',
    'Physical Depreciation', 'Physical Depreciation Amount', 'Functional Depreciation', 'Functional Depreciation Amount',
    'External Depreciation', 'External Depreciation Amount', 'Total Depreciation',
    'Dwelling Cost Item 1 Description', 'Dwelling Cost Item 1 Size', 'Dwelling Cost Item 1 Rate', 'Dwelling Cost Item 1 Amount',
    'Dwelling Cost Item 2 Description', 'Dwelling Cost Item 2 Size', 'Dwelling Cost Item 2 Rate', 'Dwelling Cost Item 2 Amount',
    'Dwelling Cost Item 3 Description', 'Dwelling Cost Item 3 Size', 'Dwelling Cost Item 3 Rate', 'Dwelling Cost Item 3 Amount',
    'Dwelling Cost Item 4 Description', 'Dwelling Cost Item 4 Size', 'Dwelling Cost Item 4 Rate', 'Dwelling Cost Item 4 Amount',
    'Dwelling Cost Item 5 Description', 'Dwelling Cost Item 5 Size', 'Dwelling Cost Item 5 Rate', 'Dwelling Cost Item 5 Amount',
    'Dwelling Cost Item 6 Description', 'Dwelling Cost Item 6 Size', 'Dwelling Cost Item 6 Rate', 'Dwelling Cost Item 6 Amount',
    'Remaining Economic Life', 'Effective Age', 'Site Improvement Description', 'Site Improvement Amount',
    'Primary Site Valuation Method', 'Land Comparable Number', 'Land Comparable Address', 'Land Comparable County',
    'Land Comparable Data Source', 'Land Comparable Assessor Parcel Number (APN)', 'Land Comparable Site Size',
    'Land Comparable Sale Date', 'Land Comparable Sale Price', 'Commentary on Remaining Economic Life',
    'Commentary on Effective Age', 'Reconciliation of Site Value', 'General Description', 'Cost Type',
    'Cost Data Source', 'Quality Rating', 'Effective Date', 'Cost Method', 'Depreciation Method',
    'Cost Approach Commentary', 'Cost Approach Exhibits',

    'Land Comparable 1 Address', 'Land Comparable 1 County', 'Land Comparable 1 Data Source', 'Land Comparable 1 Assessor Parcel Number (APN)', 'Land Comparable 1 Site Size', 'Land Comparable 1 Sale Date', 'Land Comparable 1 Sale Price',
    'Land Comparable 2 Address', 'Land Comparable 2 County', 'Land Comparable 2 Data Source', 'Land Comparable 2 Assessor Parcel Number (APN)', 'Land Comparable 2 Site Size', 'Land Comparable 2 Sale Date', 'Land Comparable 2 Sale Price',
    'Land Comparable 3 Address', 'Land Comparable 3 County', 'Land Comparable 3 Data Source', 'Land Comparable 3 Assessor Parcel Number (APN)', 'Land Comparable 3 Site Size', 'Land Comparable 3 Sale Date', 'Land Comparable 3 Sale Price'
]

RECONCILIATION_FIELDS = [
    'Sales Comparison Approach Indicated Value', 'Income Approach Indicated Value', 'Cost Approach Indicated Value',
    'Reason for Exclusion (Sales Comparison Approach)', 'Reason for Exclusion (Income Approach)', 'Reason for Exclusion (Cost Approach)',
    'Opinion of Market Value', 'Market Value Condition',
    'Reasonable Exposure Time', 'Effective Date of Appraisal', 'Reconciliation of Market Value',
    'Apparent Defects, Damages, Deficiencies'
]

CERTIFICATION_FIELDS = [
    'Appraiser Certifications',
    'Appraiser Signature',
    'Date of Signature and Report',
    'Appraiser Name',
    'Appraiser Credential Level',
    'Appraiser ID',
    'Appraiser State',
    'Appraiser License Expiration Date'
]



def extract_fields_from_pdf_v1(pdf_path, category: str | None = None, custom_prompt: str | None = None, prompt_type: str = "checklist"):
    """
    Pure Python & Regex-based 100% Offline Extractor for Appraisal Version #1 / Version #5.
    Zero external API calls.
    """
    try:
        from api.pdf_extractor_v1_offline import extract_fields_from_pdf_v1_offline
    except ImportError:
        from .pdf_extractor_v1_offline import extract_fields_from_pdf_v1_offline  # type: ignore

    res = extract_fields_from_pdf_v1_offline(pdf_path)
    if not isinstance(res, dict) or res.get("status") != "success":
        return res

    fields = res.get("fields", {})
    if category and isinstance(fields, dict):
        cat_upper = category.upper()
        cat_data = fields.get(cat_upper, {})
        if isinstance(cat_data, dict) and cat_data:
            cat_res = {cat_upper: cat_data, **cat_data}
            return {
                "fields": cat_res,
                "raw": json.dumps(cat_res, indent=2, default=str),
                "status": "success"
            }
        clean_d = res.get("clean_data", {})
        if isinstance(clean_d, dict) and cat_upper in clean_d:
            cat_data2 = clean_d.get(cat_upper, {})
            if isinstance(cat_data2, dict) and cat_data2:
                cat_res2 = {cat_upper: cat_data2, **cat_data2}
                return {
                    "fields": cat_res2,
                    "raw": json.dumps(cat_res2, indent=2, default=str),
                    "status": "success"
                }

    if custom_prompt:
        prompt_lower = custom_prompt.lower()
        if any(term in prompt_lower for term in ["revision", "checklist", "verify", "changed", "updated", "compare"]):
            try:
                try:
                    from api.offline_comparison import verify_revision_request_offline
                except ImportError:
                    from .offline_comparison import verify_revision_request_offline
                return verify_revision_request_offline(pdf_path, custom_prompt)
            except Exception:
                pass

    return res
