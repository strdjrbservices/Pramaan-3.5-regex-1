import json
import re
from typing import Any, Dict, List, Optional

ACTIVE_API_KEY = None

def _check_for_api_error_message(response_text, prompt_feedback=None):
    """Legacy check - Gemini API is removed."""
    return False

def clean_sublabels(s: str) -> str:
    if not s:
        return ""
    sub_labels = [
        r"^(?:Client\s*)?File\s*#?\s*[:\-]?",
        r"^(?:Appraiser\s*)?File\s*#?\s*[:\-]?",
        r"^(?:Subject\s*Property\s*|Client\s*|Appraiser\s*)?Address\s*[:\-]?",
        r"^(?:Subject\s*|Client\s*|Appraiser\s*)?City\s*[:\-]?",
        r"^(?:Subject\s*|Client\s*|Appraiser\s*)?State\s*[:\-]?",
        r"^(?:Subject\s*|Client\s*|Appraiser\s*Zip\s*)?(?:Zip\s*)?Code\s*[:\-]?",
        r"^(?:Subject\s*)?County\s*[:\-]?",
        r"^(?:Subject\s*)?Unit\s*[:\-]?",
        r"^(?:Appraiser\s*Company\s*)?Name\s*[:\-]?",
        r"^(?:Data\s*)?Source\s*[:\-]?",
        r"^Tax\s*Year\s*[:\-]?",
        r"^(?:Monthly\s*HOA\s*)?Fees?\s*[:\-]?",
        r"^(?:Original\s*List\s*|Current\s*List\s*|Last\s*Sale\s*)?Price\s*[:\-]?",
        r"^(?:Date\s*of\s*Last\s*Price\s*)?Revision\s*[:\-]?",
        r"^Days[\-\s]on[\-\s]market\s*[:\-]?",
        r"^(?:Listing\s*)?Company\s*\/\s*Agent\s*[:\-]?",
        r"^(?:Appraiser\s*)?Ph(?:one|\.)?\s*#?\s*[:\-]?",
        r"^(?:Appraiser\s*)?Fax\s*#?\s*[:\-]?",
        r"^(?:Appraiser\s*)?E-?mail\s*[:\-]?",
        r"^(?:Last\s*Sale\s*|Closing\s*)?Date\s*[:\-]?",
    ]
    for pat in sub_labels:
        s = re.sub(pat, "", s, flags=re.IGNORECASE).strip()
    return s.strip()


def sanitize_extracted_data(data):
    """Recursively cleans up boolean mapping and removes checkbox/checkmark formatting prefixes (e.g. 'X One' -> 'One')."""
    if isinstance(data, dict):
        return {k: sanitize_extracted_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_extracted_data(item) for item in data]
    elif isinstance(data, bool):
        return "Yes" if data else "No"
    elif isinstance(data, str):
        cleaned = data.strip()
        if cleaned.lower().startswith(("x ", "[x] ", "[ ] ")):
            cleaned = cleaned.split(maxsplit=1)[-1]
        elif cleaned.startswith(("☒ ", "☑ ")):
            cleaned = cleaned.split(maxsplit=1)[-1]
        if len(cleaned) > 1 and cleaned[0].upper() == 'X' and cleaned[1].isupper():
            cleaned = cleaned[1:]
        cleaned = clean_sublabels(cleaned)
        return " ".join(cleaned.split())
    return data

SUBJECT_FIELDS = [
    'ADU File Check','From Type','Exposure comment','Prior service comment','ANSI','FHA Case No.','Full Address','Property Address', 'City', 'County', 'State', 'Zip Code', 'Borrower', 'Owner of Public Record',
    'Legal Description', "Assessor's Parcel #", 'Tax Year', 'R.E. Taxes $', 'Neighborhood Name', 'Map Reference',
    'Census Tract', 'Occupant','Occupant Comment', 'Special Assessments $', 'Special Assessments Comment', 'PUD', 'HOA $', 'HOA(per year)', 'HOA(per month)',
    'Property Rights Appraised', 'Assignment Type', 'Lender/Client', 'Address (Lender/Client)',
    'Offered for Sale in Last 12 Months', 'Report data source(s) used, offering price(s), and date(s)',"Appraiser's Fee","AMC License #","Smoke detector comment","CO detector comment","Water heater double-strapped comment"
]
CONTRACT_FIELDS = [
    'I did did not analyze the contract for sale for the subject purchase transaction. Explain the results of the analysis of the contract for sale or why the analysis was not performed.',
    'Contract Price $', 'Date of Contract', 'Is property seller owner of public record?', 'Data Source(s)',
    'Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?',
    'If Yes, report the total dollar amount and describe the items to be paid',
    'If Yes, report the total dollar amount and describe the items to be paid.',
]
NEIGHBORHOOD_FIELDS = [
    "Location", "Built-Up", "Growth", "Property Values", "Demand/Supply",
    "Marketing Time", "One-Unit", "2-4 Unit", "Multi-Family", "Commercial", "Other", "Present Land Use for other", "one unit housing price(high,low,pred)", "one unit housing age(high,low,pred)",
    "Neighborhood Boundaries", "Neighborhood Description", "Market Conditions:"
]
SITE_FIELDS = [
    "Dimensions", "Area", "Shape", "View", "Specific Zoning Classification", "Zoning Description",
    "Zoning Compliance", "Is the highest and best use of subject property as improved (or as proposed per plans and specifications) the present use?",
    "Electricity", "Electricity comment", "Gas", "Gas comment",  "Water", "Water comment", "Sanitary Sewer", "Sanitary Sewer comment", "Street","Street comment", "Alley","Alley comment", "FEMA Special Flood Hazard Area",
    "FEMA Flood Zone", "FEMA Map #", "FEMA Map Date", "Are the utilities and off-site improvements typical for the market area? If No, describe","Are the utilities and off-site improvements typical for the market area?",
    "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? If Yes, describe", "Legal Nonconforming (Grandfathered Use) comment"," No Zoning comment"
]
IMPROVEMENTS_FIELDS = [
    "One with Accessory Unit","Units", "# of Stories", "Type", "Existing/Proposed/Under Const.",
    "Design (Style)", "Year Built", "Effective Age (Yrs)", "Foundation Type",
    "Basement Area sq.ft.", "Basement Finish %",
    "Evidence of (Foundation)", "Foundation Walls (Material/Condition)",
    "Exterior Walls (Material/Condition)", "Roof Surface (Material/Condition)",
    "Gutters & Downspouts (Material/Condition)", "Window Type (Material/Condition)",
    "Storm Sash/Insulated", "Screens", "Floors (Material/Condition)", "Walls (Material/Condition)",
    "Trim/Finish (Material/Condition)", "Bath Floor (Material/Condition)", "Bath Wainscot (Material/Condition)",
    "Attic", "Heating Type", "Fuel", "Cooling Type",
    "Fireplace(s) #", "Patio/Deck", "Pool", "Woodstove(s) #", "Fence", "Porch", "Other in Amenities",
    "Car Storage", "Driveway # of Cars", "Driveway Surface", "Garage # of Cars", "Carport # of Cars","Att./Det./Built-in",
     "Appliances",
    "Finished area above grade Rooms", "Finished area above grade Bedrooms",
    "Finished area above grade Bath(s)", "Square Feet of Gross Living Area Above Grade",
    "Additional features", "Describe the condition of the property",
    "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe",
    "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?",
    "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?If Yes, describe",
    "Amenity Category"
]
RECONCILIATION_FIELDS = [
    'Indicated Value by: Sales Comparison Approach $',
    'Cost Approach (if developed)',
    'Income Approach (if developed) $',
    'Income Approach (if developed) $ Comment',
    'This appraisal is made "as is", subject to completion per plans and specifications on the basis of a hypothetical condition that the improvements have been completed, subject to the following repairs or alterations on the basis of a hypothetical condition that the repairs or alterations have been completed, or subject to the following required inspection based on the extraordinary assumption that the condition or deficiency does not require alteration or repair:',
    "opinion of the market value, as defined, of the real property that is the subject of this report is $",
    "as of"
]
COST_APPROACH_FIELDS = [
    "Provide adequate information for the lender/client to replicate the below cost figures and calculations.",
    "Support for the opinion of site value (summary of comparable land sales or other methods for estimating site value)",
    "Estimated",
    "Source of cost data",
    "Quality rating from cost service ",
    "Effective date of cost data ",
    "Comments on Cost Approach (gross living area calculations, depreciation, etc.)",
    "Estimated Remaining Economic Life (HUD and VA only)",
    "OPINION OF SITE VALUE = $ ................................................",
    "Dwelling",
    "Basement",
    "Deck",
    "Garage/Carport ",
    " Total Estimate of Cost-New  = $ ...................",
    "Depreciation ",
    "Depreciated Cost of Improvements......................................................=$ ",
    "“As-is” Value of Site Improvements......................................................=$",
    "Indicated Value By Cost Approach......................................................=$",
    "Indicated Value by Cost Approach",
    "Depreciated Cost of Dwellings",
    "As Is Value of Site Improvements",
    "Opinion of Site Value"
]
SUBJECT_RENT_SCHEDULE=["Unit # Lease Date  Begin Date 1","Unit # Lease Date  Begin Date 2","Unit # Lease Date  Begin Date 3","Unit # Lease Date  Begin Date 4",
    "Unit # Lease Date End Date 1","Unit # Lease Date End Date 2","Unit # Lease Date End Date 3","Unit # Lease Date End Date 4",
    "Actual Rents Unit # 1  Per Unit Unfurnished","Actual Rents Unit # 2  Per Unit Unfurnished","Actual Rents Unit # 3  Per Unit Unfurnished","Actual Rents Unit # 4  Per Unit Unfurnished",
    "Actual Rents Unit # 1  Per Unit Furnished","Actual Rents Unit # 2  Per Unit Furnished","Actual Rents Unit # 3  Per Unit Furnished","Actual Rents Unit # 4  Per Unit Furnished",
    "Actual Rents Unit # 1 Total Rents","Actual Rents Unit # 2 Total Rents","Actual Rents Unit # 3 Total Rents","Actual Rents Unit # 4 Total Rents",
    "Opinion Of Market Rent Unit # 1 Per Unit Unfurnished","Opinion Of Market Rent Unit # 2 Per Unit Unfurnished","Opinion Of Market Rent Unit # 3 Per Unit Unfurnished","Opinion Of Market Rent Unit # 4 Per Unit Unfurnished",
    "Opinion Of Market Rent Unit # 1 Per Unit Furnished","Opinion Of Market Rent Unit # 2 Per Unit Furnished","Opinion Of Market Rent Unit # 3 Per Unit Furnished","Opinion Of Market Rent Unit # 4 Per Unit Furnished",
    "Opinion Of Market Rent Unit # 1 Total Rents","Opinion Of Market Rent Unit # 2 Total Rents","Opinion Of Market Rent Unit # 3 Total Rents","Opinion Of Market Rent Unit # 4 Total Rents",
    "Comment on lease data","Total Actual Monthly Rent","Other Monthly Income (itemize)","Total Actual Monthly Income"," Total Gross Monthly Rent","Other Monthly Income (itemize)",
    "Total Estimated Monthly Income"," Utilities included in estimated rents","Comments on actual or estimated rents and other monthly income (including personal property)",
]

INCOME_APPROACH_FIELDS = [
    "Estimated Monthly Market Rent $",
    "X Gross Rent Multiplier  = $",
    "Indicated Value by Income Approach",
    "Summary of Income Approach (including support for market rent and GRM) ",
]
PUD_INFO_FIELDS = [
    "PUD Fees $",
    "PUD Fees (per month)",
    "PUD Fees (per year)",
    "Is the developer/builder in control of the Homeowners' Association (HOA)?", "Unit type(s)",
    "Provide the following information for PUDs ONLY if the developer/builder is in control of the HOA and the subject property is an attached dwelling unit.",
    "Legal Name of Project", "Total number of phases", "Total number of units", "Total number of units sold",
    "Total number of units rented", "Total number of units for sale", "Data source(s)", "Was the project created by the conversion of existing building(s) into a PUD?", " If Yes, date of conversion", "Does the project contain any multi-dwelling units? Yes No Data", "Are the units, common elements, and recreation facilities complete?", "If No, describe the status of completion.", "Are the common elements leased to or by the Homeowners' Association?",
    "If Yes, describe the rental terms and options.", "Describe common elements and recreational facilities."
]
CERTIFICATION_FIELDS = [
    "Signature", "Name", "Company Name", "Company Address", "Telephone Number", "Email Address", "Date of Signature and Report",
    "Effective Date of Appraisal","State Certification #","or State License #","or Other (describe)","State #", "State", "Expiration Date of Certification or License", "ADDRESS OF PROPERTY APPRAISED", "APPRAISED VALUE OF SUBJECT PROPERTY $",
    "LENDER/CLIENT Name",
    "Lender/Client Company Name",
    "Lender/Client Company Address",
    "Lender/Client Email Address","Appraiser License", "E&O Insurance","Policy Period From","License Valid To","LICENSE/REGISTRATION/CERTIFICATION #",
    "License # / Reg #:", "License # / Reg #",
    "Policy Period To",
    "Appraiser Certifications",
    "Appraiser Signature",
    "Appraiser Name",
    "Appraiser Credential Level",
    "Appraiser ID",
    "Appraiser State",
    "Appraiser License Expiration Date",
    "Appraiser's Fee", "AMC License #",
    "Supervisory Signature",
    "Supervisory Name",
    "Supervisory Company Name",
    "Supervisory Company Address",
    "Supervisory Telephone Number",
    "Supervisory Email Address",
    "Supervisory Date of Signature",
    "Supervisory State Certification #",
    "Supervisory or State License #",
    "Supervisory State",
    "Supervisory Expiration Date of Certification or License",
    "Did not inspect subject property",
    "Did inspect exterior of subject property from street",
    "Subject Property Date of Inspection (Exterior)",
    "Did inspect interior and exterior of subject property",
    "Subject Property Date of Inspection (Interior/Exterior)",
    "Did not inspect exterior of comparable sales from street",
    "Did inspect exterior of comparable sales from street",
    "Comparable Sales Date of Inspection"
]

SALES_TRANSFER_FIELDS = [
    "I did did not research the sale or transfer history of the subject property and comparable sales. If not, explain",
    "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.",
    "Data Source(s) for subject property research",
    "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.",
    "Data Source(s) for comparable sales research",
    "Analysis of prior sale or transfer history of the subject property and comparable sales",
    "Summary of Sales Comparison Approach", "Indicated Value by Sales Comparison Approach $",
    "Indicated Value by Sales Comparison Approach",
    "Reconciliation of Sales Comparison Approach",
    "Sales Comparison Map",
    "Sales Comparison Approach Exhibits"
]
INFO_OF_SALES_FIELDS = [
    "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from$ ___to $___",
    "There are ___comparable sales in the subject neighborhoodwithin the past twelvemonths ranging in sale price from$___ to $____"
]
MARKET_CONDITIONS_FIELDS = [
    "Instructions:",
    "Inventory Analysis Total # of Comparable Sales (Settled)",
    "Inventory Analysis Total # of Comparable Sales (Settled) (Prior 7-12 Months)",
    "Inventory Analysis Total # of Comparable Sales (Settled) (Prior 4-6 Months)",
    "Inventory Analysis Total # of Comparable Sales (Settled) (Current-3 Months)",
    "Inventory Analysis Total # of Comparable Sales (Settled) (Overall Trend)",
    "Inventory Analysis Absorption Rate (Total Sales/Months)",
    "Inventory Analysis Absorption Rate (Total Sales/Months) (Prior 7-12 Months)",
    "Inventory Analysis Absorption Rate (Total Sales/Months) (Prior 4-6 Months)",
    "Inventory Analysis Absorption Rate (Total Sales/Months) (Current-3 Months)",
    "Inventory Analysis Absorption Rate (Total Sales/Months) (Overall Trend)",
    "Inventory Analysis Total # of Comparable Active Listings",
    "Inventory Analysis Total # of Comparable Active Listings (Prior 7-12 Months)",
    "Inventory Analysis Total # of Comparable Active Listings (Prior 4-6 Months)",
    "Inventory Analysis Total # of Comparable Active Listings (Current-3 Months)",
    "Inventory Analysis Total # of Comparable Active Listings (Overall Trend)",
    "Inventory Analysis Months of Housing Supply (Total Listings/Ab.Rate)",
    "Inventory Analysis Months of Housing Supply (Total Listings/Ab.Rate) (Prior 7-12 Months)",
    "Inventory Analysis Months of Housing Supply (Total Listings/Ab.Rate) (Prior 4-6 Months)",
    "Inventory Analysis Months of Housing Supply (Total Listings/Ab.Rate) (Current-3 Months)",
    "Inventory Analysis Months of Housing Supply (Total Listings/Ab.Rate) (Overall Trend)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Sale Price (Prior 7-12 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Sale Price (Prior 4-6 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Sale Price (Current-3 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Sale Price (Overall Trend)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Sales Days on Market (Prior 7-12 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Sales Days on Market (Prior 4-6 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Sales Days on Market (Current-3 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Sales Days on Market (Overall Trend)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable List Price (Prior 7-12 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable List Price (Prior 4-6 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable List Price (Current-3 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable List Price (Overall Trend)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Listings Days on Market (Prior 7-12 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Listings Days on Market (Prior 4-6 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Listings Days on Market (Current-3 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Listings Days on Market (Overall Trend)",
    "Median Sale & List Price, DOM, Sale/List % Median Sale Price as % of List Price (Prior 7-12 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Sale Price as % of List Price (Prior 4-6 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Sale Price as % of List Price (Current-3 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Sale Price as % of List Price (Overall Trend)",
    "Instructions:",
    "Seller-(developer, builder, etc.)paid financial assistance prevalent?",
    "Explain in detail the seller concessions trends for the past 12 months (e.g., seller contributions increased from 3% to 5%, increasing use of buydowns, closing costs, condo fees, options, etc.).",
    "Are foreclosure sales (REO sales) a factor in the market?", "If yes, explain (including the trends in listings and sales of foreclosed properties).",
    "Cite data sources for above information.", "Summarize the above information as support for your conclusions in the Neighborhood section of the appraisal report form. If you used any additional information, such as an analysis of pending sales and/or expired and withdrawn listings, to formulate your conclusions, provide both an explanation and support for your conclusions."
]
CONDO_FIELDS = [
    "Subject Project Data Total # of Comparable Sales (Settled) (Prior 7–12 Months)",
    "Subject Project Data Total # of Comparable Sales (Settled) (Prior 4–6 Months)",
    "Subject Project Data Total # of Comparable Sales (Settled) (Current – 3 Months)",
    "Subject Project Data Total # of Comparable Sales (Settled) (Overall Trend)",
    "Subject Project Data Absorption Rate (Total Sales/Months) (Prior 7–12 Months)",
    "Subject Project Data Absorption Rate (Total Sales/Months) (Prior 4–6 Months)",
    "Subject Project Data Absorption Rate (Total Sales/Months) (Current – 3 Months)",
    "Subject Project Data Absorption Rate (Total Sales/Months) (Overall Trend)",
    "Subject Project Data Total # of Comparable Active Listings (Prior 7–12 Months)",
    "Subject Project Data Total # of Comparable Active Listings (Prior 4–6 Months)",
    "Subject Project Data Total # of Comparable Active Listings (Current – 3 Months)",
    "Subject Project Data Total # of Comparable Active Listings (Overall Trend)",
    "Subject Project Data Months of Unit Supply (Total Listings/Ab.Rate) (Prior 7–12 Months)",
    "Subject Project Data Months of Unit Supply (Total Listings/Ab.Rate) (Prior 4–6 Months)",
    "Subject Project Data Months of Unit Supply (Total Listings/Ab.Rate) (Current – 3 Months)",
    "Subject Project Data Months of Unit Supply (Total Listings/Ab.Rate) (Overall Trend)",
]
CONDO_FORECLOSURE_FIELDS = [
    "Are foreclosure sales (REO sales) a factor in the project?",
    "If yes, indicate the number of REO listings and explain the trends in listings and sales of foreclosed properties.",
    "Summarize the above trends and address the impact on the subject unit and project.",
]
RENT_SCHEDULE_RECONCILIATION_FIELDS = [
    "Comments on market data, including the range of rents for single family properties, an estimate of vacancy for single family rental properties, the general trend of rents and vacancy, and support for the above adjustments. (Rent concessions should be adjusted to the market, not to the subject property.)",
    "Final Reconciliation of Market Rent:",
    "I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF",
    "TO BE $",
]
SalesGridFIELDS2 = [
        "Address",
        "Proximity to Subject",
        "Proximity to Subject comment",
        "Sale Price",
        "Sale Price/Gross Liv. Area",
        "Data Source(s)",
        "Verification Source(s)",
        "Sales or Financing Concessions",
        "Sales or Financing Concessions Adjustment",
        "Date of Sale/Time",
        "Date of Sale/Time Adjustment",
        "Location",
        "Location Adjustment",
        "Leasehold/Fee Simple",
        "Leasehold/Fee Simple Adjustment",
        "Site",
        "Site Adjustment",
        "View",
        "View Adjustment",
        "Design (Style)",
        "Design (Style) Adjustment",
        "Quality of Construction",
        "Quality of Construction Adjustment",
        "Actual Age",
        "Actual Age Adjustment",
        "Condition",
        "Condition Adjustment",
        "Total Rooms",
        "Bedrooms",
        "Bedrooms Adjustment",
        "Baths",
        "Baths Adjustment",
        "Above Grade Room Count Adjustment",
        "Gross Living Area",
        "Gross Living Area Adjustment",
        "Basement & Finished Rooms Below Grade",
        "Basement & Finished Rooms Below Grade Adjustment",
        "Functional Utility",
        "Functional Utility Adjustment",
        "Heating/Cooling",
        "Heating/Cooling Adjustment",
        "Energy Efficient Items",
        "Energy Efficient Items Adjustment",
        "Garage/Carport",
        "Garage/Carport Adjustment",
        "Porch/Patio/Deck",
        "Porch/Patio/Deck Adjustment",
        "Net Adjustment (Total)",
        "Adjusted Sale Price of Comparable",
        "Date of Prior Sale/Transfer",
        "Price of Prior Sale/Transfer",
        "Data Source(s) for prior sale",
        "Effective Date of Data Source(s) for prior sale",

]
RentSchedulesFIELDS2 = [
        "Address",
        "Proximity to Subject",
        "Date Lease Begins",
        "Date Lease Expires",
        "Monthly Rental",
        "Less: Utilities",
        "Furniture",
        "Adjusted Monthly Rent",
        "Data Source",
        "Rent",
        "Concessions",
        "Location/View",
        "Location/View Adjustment",
        "Design and Appeal",
        "Design and Appeal Adjustment",
        "Age",
        "Age Adjustment",
        "Condition",
        "Condition Adjustment",
        "Room Count Total",
        "Room Count Total Adjustment",
        "Room Count Bdrms",
        "Room Count Bdrms Adjustment",
        "Room Count Baths",
        "Room Count Baths Adjustment",
        "Gross Living Area",
        "Gross Living Area Adjustment",
        "Other (e.g., basement, etc.)",
        "Other (e.g., basement, etc.) Adjustment",
        "Other:",
        "Net Adj. (total)",
        "Indicated Monthly Market Rent",
]
Project_SITE_FIELDS = [
    "Topography", "Size", "Density", "View", "Specific Zoning Classification", "Zoning Description",
    "Zoning Compliance", "Is the highest and best use of subject property as improved (or as proposed per plans and specifications) the present use?",
    "Electricity", "Gas", "Water", "Sanitary Sewer", "Street", "Alley", "FEMA Special Flood Hazard Area","Are the utilities and off-site improvements typical for the market area?",
    "FEMA Flood Zone", "FEMA Map #", "FEMA Map Date", "Are the utilities and off-site improvements typical for the market area?",
    "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)?",
    "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? If Yes, describe",
]
Project_Info_FIELDS = [
    "Data source(s) for project information", "Project Description", "# of Stories",
    "# of Elevators", "Existing/Proposed/Under Const.", "Year Built",
    "Effective Age", "Exterior Walls",
    "Roof Surface", "Total # Parking", "Ratio (spaces/units)", "Type", "Guest Parking", "# of Units", "# of Units Completed",
    "# of Units For Sale", "# of Units Sold", "# of Units Rented", "# of Owner Occupied Units",
    "# of Phases","# of Units","# of Units for Sale","# of Units Sold","# of Units Rented","# of Owner Occupied Units","# of Planned Phases",
    "# of Planned Units","# of Planned Units for Sale","# of Planned Units Sold","# of Planned Units Rented","# of Planned Owner Occupied Units",
    "Project Primary Occupancy","Is the developer/builder in control of the Homeowners' Association (HOA)?",
    "Management Group","Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project?"
    ,"Was the project created by the conversion of existing building(s) into a condominium?",
    "Was the project created by the conversion of existing building(s) into a condominium? If Yes,describe the original use and date of conversion",
    "Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)?","If No, describe",
    "Is there any commercial space in the project?",
    "If Yes, describe and indicate the overall percentage of the commercial space.","Describe the condition of the project and quality of construction.",
    "Describe the common elements and recreational facilities.","Are any common elements leased to or by the Homeowners' Association?",
    "If Yes, describe the rental terms and options.","Is the project subject to a ground rent?",
    "If Yes, $ per year (describe terms and conditions)",
    "Are the parking facilities adequate for the project size and type?","If No, describe and comment on the effect on value and marketability."
]
Project_Analysis_FIELDS = [
    "I did did not analyze the condominium project budget for the current year. Explain the results of the analysis of the budget (adequacy of fees, reserves, etc.), or why the analysis was not performed.",
    "Are there any other fees (other than regular HOA charges) for the use of the project facilities?",
    "If Yes, report the charges and describe.",
    "Compared to other competitive projects of similar quality and design, the subject unit charge appears",
    "If High or Low, describe",
    "Are there any special or unusual characteristics of the project (based on the condominium documents, HOA meetings, or other information) known to the appraiser?",
    "If Yes, describe and explain the effect on value and marketability.",
]
UNIT_DESCRIPTIONS_FIELDS = [
    "Unit Charge$"," per month X 12 = $", "per year",
    "Annual assessment charge per year per square feet of gross living area = $",
    "Utilities included in the unit monthly assessment [None/Heat/Air/Conditioning/Electricity/Gas/Water/Sewer/Cable/Other (describe)]",
    "Floor #",
    "# of Levels",
    "Heating Type/Fuel",
    "Central AC/Individual AC/Other (describe)",
    "Fireplace(s) #/Woodstove(s) #/Deck/Patio/Porch/Balcony/Other",
    "Refrigerator/Range/Oven/Disp Microwave/Dishwasher/Washer/Dryer",
    "Floors",
    "Walls",
    "Trim/Finish",
    "Bath Wainscot",
    "Doors",
    "None/Garage/Covered/Open",
    "Assigned/Owned",
    "# of Cars",
    "Parking Space #",
    "Finished area above grade contains:",
    "Rooms",
    "Bedrooms",
    "Bath(s)",
    "Square Feet of Gross Living Area Above Grade",
    "Are the heating and cooling for the individual units separately metered?", "If No, describe and comment on compatibility to other projects in the market area.",
    "Additional features (special energy efficient items, etc.)",
    "Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)",
    "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe",
    "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)? If No, describe"
]

PRIOR_SALE_HISTORY_FIELDS =[
    "Prior Sale History: I did did not research the sale or transfer history of the subject property and comparable sales",
    "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal",
    "Prior Sale History: Data source(s) for subject",
    "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale",
    "Prior Sale History: Data source(s) for comparables",
    "Prior Sale History: Report the results of the research and analysis of the prior sale or transfer history of the subject property and comparable sales",
    "Prior Sale History: Date of Prior Sale/Transfer",
    "Prior Sale History: Price of Prior Sale/Transfer",
    "Prior Sale History: Data Source(s) for prior sale/transfer",
    "Prior Sale History: Effective Date of Data Source(s)",
    "Prior Sale History: Analysis of prior sale or transfer history of the subject property and comparable sales",
    "Prior Sales or Transfers",
    "Subject Transfer History Data Source",
    "Comparable Number",
    "Comparable Transfer Terms",
    "Comparable Transfer Date",
    "Comparable Transfer Amount",
    "Comparable Transfer Data Source",
    "Analysis of Prior Sale and Transfer History of Subject Property",
    "Analysis of Prior Sale and Transfer History of Comparable Sales"
]
COMPARABLE_RENTAL_DATA_FIELDS = [
    "Address",
    "Proximity to Subject",
    "Current Monthly Rent",
    "Rent/Gross Bldg. Area",
    "Rent Control",
    "Data Source(s)",
    " Date of Lease(s)",
    "Location"," Actual Age",
    "Condition","Gross Building Area",
    "Unit Breakdown Rm Count Tot Unit # 1","Unit Breakdown Rm Count Br Unit # 1","Unit Breakdown Rm Count Ba Unit # 1","Unit Breakdown Size Unit # 1","Unit Breakdown Monthly Rent Unit # 1",
    "Unit Breakdown Rm Count Tot Unit # 2","Unit Breakdown Rm Count Br Unit # 2","Unit Breakdown Rm Count Ba Unit # 2","Unit Breakdown Size Unit # 2","Unit Breakdown Monthly Rent Unit # 2",
    "Unit Breakdown Rm Count Tot Unit # 3","Unit Breakdown Rm Count Br Unit # 3","Unit Breakdown Rm Count Ba Unit # 3","Unit Breakdown Size Unit # 3","Unit Breakdown Monthly Rent Unit # 3",
    "Unit Breakdown Rm Count Tot Unit # 4","Unit Breakdown Rm Count Br Unit # 4","Unit Breakdown Rm Count Ba Unit # 4","Unit Breakdown Size Unit # 4","Unit Breakdown Monthly Rent Unit # 4","Utilities Included"
]
FORM_TYPE_CATEGORIES = {
    "1004": [
        "SUBJECT", "CONTRACT", "NEIGHBORHOOD", "SITE", "IMPROVEMENTS", "SALES_GRID", "SALES_TRANSFER",
        "INFO_OF_SALES", "RECONCILIATION", "COST_APPROACH", "INCOME_APPROACH", "CONDO_FORECLOSURE",
        "PUD_INFO", "MARKET_CONDITIONS", "CONDO", "CERTIFICATION"
    ],
    "1073": [
        "SUBJECT", "CONTRACT", "NEIGHBORHOOD", "PROJECT_SITE", "PROJECT_INFO", "PROJECT_ANALYSIS",
        "UNIT_DESCRIPTIONS", "PRIOR_SALE_HISTORY", "SALES_GRID", "CONDO_FORECLOSURE", "SALES_TRANSFER",
        "INFO_OF_SALES", "RECONCILIATION", "COST_APPROACH", "INCOME_APPROACH", "CONDO",
        "CERTIFICATION"
        
    ],
    "1007": [
        "SUBJECT", "CONTRACT", "NEIGHBORHOOD", "SITE", "IMPROVEMENTS", "SALES_GRID", "SALES_TRANSFER",
        "INFO_OF_SALES", "RENT_SCHEDULE_GRID", "RENT_SCHEDULE_RECONCILIATION", "RECONCILIATION",
        "COST_APPROACH", "INCOME_APPROACH", "PUD_INFO", "CONDO_FORECLOSURE", "MARKET_CONDITIONS",
        "CONDO", "CERTIFICATION"
    ],
    "1025": [
        "SUBJECT", "CONTRACT", "NEIGHBORHOOD", "SITE", "IMPROVEMENTS", "SALES_GRID", "SALES_TRANSFER",
        "INFO_OF_SALES", "RECONCILIATION", "COST_APPROACH", "INCOME_APPROACH", "CONDO_FORECLOSURE",
        "PUD_INFO", "MARKET_CONDITIONS", "CONDO", "CERTIFICATION","COMPARABLE_RENTAL_DATA","SUBJECT_RENT_SCHEDULE"
    ],
    "ECR": [
        "SUMMARY", "SUBJECT", "NEIGHBORHOOD", "SITE", "IMPROVEMENTS",
        "MARKET_TRENDS", "SALES_COMPARISON", "ANTICIPATED_SALES_PRICE", "CERTIFICATION"
    ],
    "ERC": [
        "SUMMARY", "SUBJECT", "NEIGHBORHOOD", "SITE", "IMPROVEMENTS",
        "MARKET_TRENDS", "SALES_COMPARISON", "ANTICIPATED_SALES_PRICE", "CERTIFICATION"
    ]
}
DEFAULT_CATEGORIES = [
    "SUBJECT", "CONTRACT", "NEIGHBORHOOD", "SITE", "IMPROVEMENTS", "SALES_GRID",
    "SALES_TRANSFER", "RECONCILIATION", "COST_APPROACH", "INCOME_APPROACH", "CONDO_FORECLOSURE",
    "PUD_INFO", "MARKET_CONDITIONS", "CONDO", "CERTIFICATION","COMPARABLE_RENTAL_DATA","SUBJECT_RENT_SCHEDULE"
]
GENERAL_INSTRUCTIONS = (
    "\n--- General Instructions ---\n"
    """1.  **CHOICE FIELDS (e.g., "Yes/No", "did/did not")**: For fields with choices, you MUST determine which option is selected (e.g., by a checked box [X], [x], [•], [o], [v], ☒, ☑, or a plain 'x'/'X' next to or inside the option, e.g. "x did" or "did x not"). The returned value MUST start with the selected choice. If there is explanatory text immediately following the choice, append it with a colon.
        - **Example (did/did not):** For "I did did not research...", if 'did not' is checked and followed by "If not, explain: Not required", the value must be "did not: Not required".
        - **Example (Yes/No):** For "Is property seller owner of public record?", if 'Yes' is checked, the value must be "Yes".
        - **CRITICAL:**
            * Checkmarks can be represented in text as brackets containing characters (like `[X]`, `[x]`, `[o]`), unicode check boxes (☒, ☑, 🗹), or just a lone `x` / `X` positioned before, after, or between the choices (e.g., `x did did not` means `did` is checked, `did x did not` or `did did not x` means `did not` is checked).
            * If no checkbox character is visible in the raw text, look at the contextual sentences that follow. For example, if the subsequent text says "did not reveal any sales" or "no prior transfers found", the checkmark is "did not". If it says "prior sales are detailed below", then the checkmark is "did".
            * The response must begin with the selected option ("did" or "did not" or "Yes" or "No"). Do NOT return only the explanatory text. If you cannot determine the choice, return an empty string "".
    2.  **Monetary Values**: For all monetary fields (ending in '$' or 'price'), extract only the numeric value without currency symbols, commas, or decimals (e.g., '$1,250,000.50' becomes '1250000').
    3.  **Dates**: Extract all dates in 'MM/DD/YYYY' format.
    4.  **Empty Values**: If a field's value is not found or is not applicable, use an empty string `''`.
    5.  **Address Fields**: For 'Property Address', 'City', 'State', 'Zip Code', extract them as separate, distinct fields. Do not merge them.
    6.  **See attached addendum.**: for 'See attached addendum.'if the value is 'See attached addendum.' then find the comment for the relative fieldand extract it.
    7.  **Utilities**: if the Utilities like Electricity, Gas, Water, Sanitary Sewer, Street, Alley consist of the is clicked as Other (describe) or Private then find the related word and extract the value as the Private/value.
    8.  **'License Valid To'**: Check License Valid To / expiration date on the Appraiser License copy or certification page across all PDF pages (including scanned image attachments). Format as MM/DD/YYYY.
    9.  **'Policy Period From'**: Check Policy Period From (effective/start date) on the E&O Insurance policy document or certificate across all PDF pages (including scanned image attachments). Format as MM/DD/YYYY.
    10. **'Policy Period To'**: Check Policy Period To (expiration/end date) on the E&O Insurance policy document or certificate across all PDF pages (including scanned image attachments). Format as MM/DD/YYYY.
    11. **'Appraiser License'**: Check Appraiser License number on the License copy or certification page across all PDF pages (including scanned image attachments).
    12. **'E&O Insurance'**: Check E&O Insurance policy number on the E&O Insurance policy document, declaration page, or certificate across all PDF pages (including scanned image attachments).
    13. **'License # / Reg #:'**: Check Appraiser License / Registration Number on the License copy or certification page across all PDF pages (including scanned image attachments).
    """
)
CATEGORY_SPECIFIC_INSTRUCTIONS = {
    "SUBJECT": (
        "--- SUBJECT Section Instructions ---\n"
        "1. **'From Type'**: STRICTLY identify the primary appraisal form type and any additional forms present in all the pages the PDF. Scan ALL headers and footers for form numbers ON THE ALL PAGES OF THE REPORT. Combine multiple forms with ' + ' (e.g., '1004 + 1007'). Primary Types: 1004 (URAR), 1073 (Condo), 1025 (Multi-family), 2055 (Exterior), 1004C (Manufactured), 2090, 1075. Additional Types: 1007 (Rent Schedule), 1004D (Update/Completion), 92051, Compliance Inspection. Allowed Values: [1025, 1073, 1004, 1007, 1004D, 2090, 1007, 92051, 2055, As-is + ARV Reports, 203K FHA, 1075, 71A/71B, 1004C, ACE + PDR, Appraisal Version #1, ERC, ECR].\n"
        "2. **'ADU File Check'**: If the 'One with Accessory Unit' checkbox is checked, set this value to 'Yes', otherwise 'No'.\n"
        "2. **'Exposure comment'**: Please find out the comment from the report for the Exposure comment using the wording/keywords 'Exposure', 'expo days', 'exposure time', 'expo', 'time', 'marketing time'. If present extract the full sentence/narrative comment, otherwise 'Not Present'.\n"
        "2. **'Prior service comment'**: If the 'Prior service comment' is present the value , otherwise 'Not Present'.\n"
        "2. **'ANSI'**: If the 'ANSI' is present the value , otherwise 'Not Present'.\n"
        "3. **'Full Address'**: The Full Address validation verifies that the property address, city, state, and ZIP code are consistently present and identical across all pages of the report.If all values match, the system displays “Address verified on all pages.” If any inconsistency is detected, the system identifies and reports the specific page(s) and field(s) where the mismatch occurs. "
        "3. **'PUD'**: If the 'PUD' checkbox is checked, set this value to 'Yes', otherwise 'No'.\n"
        "4. **'HOA $'**: If the value is greater than 0, check if 'per year' or 'per month' is selected and include that in the response.\n"
        "5. **'FHA Case No.'**:plz confirm the Format as '000-0000000', otherwise 'Not Present'.\n"
        "6. **'Offered for Sale in Last 12 Months'**: The value must be ONLY 'Yes' or 'No'. Do not include any associated text.\n"
        "7. **'Smoke detector comment'**: Please find out the comment from the report for the Smoke detector comment using the wording/keywords 'Smoke', 'detector', 'detectors', 'alarm'. If the comment is not found in the narrative text, check if photos are present for the Smoke detector (e.g. 'Photo present: Smoke detector (Page X)').\n"
        "8. **'CO detector comment'**: Please find out the comment from the report for the CO detector comment using the wording/keywords 'carbon', 'co', 'detector', 'detectors', 'monoxide', 'alarm'. If the comment is not found in the narrative text, check if photos are present for the CO detector (e.g. 'Photo present: CO detector (Page X)').\n"
        "9. **'Water heater double-strapped comment'**: Please find out the comment from the report for the Water heater double-strapped comment using the wording/keywords 'water heater', 'double-strapped', 'strapped', 'strap', 'brace'. If the comment is not found, check if photos are present for the Water heater.\n"
        "10. **'Special Assessments Comment'**: Please find out the comment from the report for the Special Assessments Comment for finding the comment use word 'Assessment'\n"
        "11. **'Occupant Comment'**:Please find out the comment from the report for the Occupant Commentfor finding the comment use the words as Occupied, Owner, Tenant, Vacant, stages of construction, Rent, Rent-Ready, Uninhabitable\n"
        "12. **'Occupant'**: Strictly extract the checked option from ['Owner', 'Tenant', 'Vacant'].\n"
        "13. **'Property Rights Appraised'**: Strictly extract the checked option from ['Fee Simple', 'Leasehold', 'Other'].\n"
        "14. **'Assignment Type'**: Strictly extract the checked option from ['Purchase Transaction', 'Refinance Transaction', 'Other'].\n"
        "15. **'Appraiser\'s Fee'**: Search all pages of the report for the Appraiser Fee using keywords like 'Appraiser Fee', 'Appraiser\'s Fee', 'Appraisal Fee', 'Total Fee', 'Agreed Fee', 'Fee', 'Invoice Amount' (e.g., 'Appraiser Fee; $525.00 dollars', 'Appraiser Fee: $525.00', 'Fee: $525'). Extract the clean numeric or currency fee amount (e.g. '$525.00' or '525.00'). If not found, output 'Not Disclosed'.\n"
    ),
    "CONTRACT": (
        "--- CONTRACT Section Instructions ---\n"
        "1. **'I did did not analyze the contract for sale for the subject purchase transaction...'**: Meticulously inspect the check boxes visually next to 'did' and 'did not'. If 'did' has a mark/X, output 'did'. If 'did not' has a mark/X, output 'did not'. Append any analysis explanation that follows with a colon (e.g. 'did: Arms length sale; ...' or 'did not: Refinance; contract not applicable').\n"
        "2. **'If Yes, report the total dollar amount and describe the items to be paid'**: Extract the dollar amount and any descriptive comment (e.g., '$0; comment text')."
    ),
    "NEIGHBORHOOD": (
        "--- NEIGHBORHOOD Section Instructions ---\n"
        "1. **'one unit housing price(high,low,pred)'**: Format as a single string 'high / low / pred' (e.g., '500000 / 400000 / 450000').\n"
        "2. **'one unit housing age(high,low,pred)'**: Format as a single string 'high / low / pred' (e.g., '50 / 5 / 25').\n"
        "3. **'Present Land Use for other'**: If the 'Other' land use percentage is > 0, find the description for it and place it in this field.\n"
        "4. **'Market Conditions:'**: Strictly extract the comment associated with this field.\n"
        "5. **'Location'**: Strictly extract the checked option from ['Urban', 'Suburban', 'Rural'].\n"
        "6. **'Built-Up'**: Strictly extract the checked option from ['Over 75%', '25-75%', 'Under 25%'].\n"
        "7. **'Growth'**: Strictly extract the checked option from ['Rapid', 'Stable', 'Slow'].\n"
        "8. **'Property Values'**: Strictly extract the checked option from ['Increasing', 'Stable', 'Declining'].\n"
        "9. **'Demand/Supply'**: Strictly extract the checked option from ['Shortage', 'In Balance', 'Over Supply'].\n"
        "10. **'Marketing Time'**: Strictly extract the checked option from ['Under 3 mths', '3-6 mths', 'Over 6 mths']."
    ),
    "Improvements": (
        "--- Improvements Section Instructions ---\n"
        "1. **'Att./Det./Built-in'**: Strictly extract for field 'Att./Det./Built-in' the which one checked along 'Att./Det./Built-in'"
    ),
    "SITE": (
        "--- SITE Section Instructions ---\n"
        "1. **'Dimensions'**: Extract the dimensions value from the SITE section.\n"
        "2. **'Area'**: The value must include units like 'sf' or 'Ac' (e.g., '4353 sf').\n"
        "3. **'Zoning Compliance'**: Strictly extract the selected option ('Legal', 'Legal Nonconforming (Grandfathered Use)', 'No Zoning', or 'Illegal (describe)')."
    ),
    "PROJECT_INFO": (
        "--- PROJECT_INFO Section Instructions ---\n"
        "1. **'Project Description'**: Identify which option is checked from [Detached, Row or Townhouse, Garden, Mid-Rise, High-Rise, Other (describe)] and return that value."
        "2. **'Existing/Proposed/Under Const.'** : Identify which option is checked from 'Existing/Proposed/Under Const.' and return that value"
    ),
    "CERTIFICATION": (
        "--- CERTIFICATION Section Instructions ---\n"
        "1. **'Signature'**: Check only if a signature is present and return 'Present' or 'Not Present'.\n"
        "2. **'LENDER/CLIENT Name'**: In the certification section, find the LENDER/CLIENT Name on the signature page and also extract 'Lender/Client Company Name', 'Lender/Client Company Address', and 'Lender/Client Email Address'.\n"
        "3. **'Appraiser License' & 'License # / Reg #:' & 'LICENSE/REGISTRATION/CERTIFICATION #'**: Search the appraiser signature page and any attached state license document/certificate (including image/scanned pages) for the license/registration number (e.g., '30029137', 'RD8290', '45000054959'). Extract the exact license number.\n"
        "4. **'License Valid To'**: Search the appraiser certification section and any attached state license certificate for the license expiration date. Format as MM/DD/YYYY.\n"
        "5. **'E&O Insurance'**: Search any attached Errors & Omissions (E&O) insurance policy document, declaration page, or certificate image for the policy or certificate number.\n"
        "6. **'Policy Period From' & 'Policy Period To'**: Search any attached E&O insurance document or certificate for the policy start date ('Policy Period From') and expiration date ('Policy Period To'). Format dates as MM/DD/YYYY."

    ),"PROJECT_SITE": (
        "--- PROJECT_SITE Section Instructions ---\n"
        "1. **'Zoning Description'**: FOR THE FIELD Zoning Description PLEASE CHECK THE VALUE OF THE FIELD & return that value."
    ),
    "UNIT_DESCRIPTIONS":(
        "--- CERTIFICATION Section Instructions ---\n"
        "1. **'None/Garage/Covered/Open'**: Identify which option is checked from 'Existing/Proposed/Under Const.' and return that value "
    ),
    "SALES_TRANSFER": (
        "--- SALES_TRANSFER Section Instructions ---\n"
        "1. **'I did did not research the sale or transfer history of the subject property and comparable sales...'**: Locate the checkboxes next to 'did' and 'did not'. If 'did' has a mark/X, output 'did'. If 'did not' has a mark/X, output 'did not'. Append any comments or explanation with a colon.\n"
        "2. **'My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.'**: Locate the checkboxes next to 'did' and 'did not'. If 'did' has a mark/X, output 'did'. If 'did not' has a mark/X, output 'did not'.\n"
        "3. **'My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.'**: Locate the checkboxes next to 'did' and 'did not'. If 'did' has a mark/X, output 'did'. If 'did not' has a mark/X, output 'did not'."
    ),
    "PRIOR_SALE_HISTORY": (
        "--- PRIOR_SALE_HISTORY Section Instructions ---\n"
        "1. **'Prior Sale History: I did did not research the sale or transfer history of the subject property and comparable sales'**: Locate the checkboxes next to 'did' and 'did not'. If 'did' has a mark/X, output 'did'. If 'did not' has a mark/X, output 'did not'. Append any comments or explanation with a colon.\n"
        "2. **'Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal'**: Locate the checkboxes next to 'did' and 'did not'. If 'did' has a mark/X, output 'did'. If 'did not' has a mark/X, output 'did not'.\n"
        "3. **'Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale'**: Locate the checkboxes next to 'did' and 'did not'. If 'did' has a mark/X, output 'did'. If 'did not' has a mark/X, output 'did not'."
    ),
    "SUMMARY": (
        "--- SUMMARY Section Instructions ---\n"
        "1. Extract the overview fields of the appraisal report summary section.\n"
        "2. For choice fields (e.g. Condominium, Cooperative, PUD), return 'Yes' if checked/applicable, 'No' otherwise.\n"
        "3. **'Opinion of Market Value'**: Extract the numeric market value without currency symbols or commas.\n"
        "4. **'Effective Date of Appraisal'**: Format as MM/DD/YYYY."
    ),
    "PUD_INFO": (
        "--- PUD_INFO Section Instructions ---\n"
        "1. **PUD Information Extraction**: Look at the 'PROJECT INFORMATION FOR PUDs (if applicable)' section on Page 3 of the appraisal form (or Form 1004).\n"
        "2. **Checkboxes**: For questions like 'Is the developer/builder in control of the Homeowners\\' Association (HOA)?', 'Was the project created by the conversion of existing building(s) into a PUD?', 'Are the units, common elements, and recreation facilities complete?', and 'Are the common elements leased to or by the Homeowners\\' Association?', ONLY return 'Yes' or 'No' IF the corresponding checkbox has an actual mark/check/X inside it. If neither checkbox is checked, return \"\".\n"
        "3. **Non-PUD Properties**: If the property is NOT a PUD or the PUD section is left blank/unfilled by the appraiser, return empty strings \"\" for all PUD fields. Do NOT invent or default to Yes/No when checkboxes are empty."
    )
}

def make_flat_schema(fields_list):
    return {
        "type": "object",
        "properties": {
            field: {"type": "string"} for field in fields_list
        },
        "required": fields_list
    }

sales_grid_item_schema = {
    "type": "object",
    "properties": {
        field: {"type": "string"} for field in SalesGridFIELDS2
    },
    "required": SalesGridFIELDS2
}

sales_grid_schema = {
    "type": "object",
    "properties": {
        "Subject": sales_grid_item_schema,
        "COMPARABLE SALE #1": sales_grid_item_schema,
        "COMPARABLE SALE #2": sales_grid_item_schema,
        "COMPARABLE SALE #3": sales_grid_item_schema,
        "COMPARABLE SALE #4": sales_grid_item_schema,
        "COMPARABLE SALE #5": sales_grid_item_schema,
        "COMPARABLE SALE #6": sales_grid_item_schema,
        "COMPARABLE SALE #7": sales_grid_item_schema,
        "COMPARABLE SALE #8": sales_grid_item_schema,
        "COMPARABLE SALE #9": sales_grid_item_schema,
    },
    "required": ["Subject", "COMPARABLE SALE #1", "COMPARABLE SALE #2", "COMPARABLE SALE #3"]
}

rent_grid_item_schema = {
    "type": "object",
    "properties": {
        field: {"type": "string"} for field in RentSchedulesFIELDS2
    },
    "required": RentSchedulesFIELDS2
}

rent_grid_schema = {
    "type": "object",
    "properties": {
        "Subject": rent_grid_item_schema,
        "COMPARABLE Rental #1": rent_grid_item_schema,
        "COMPARABLE Rental #2": rent_grid_item_schema,
        "COMPARABLE Rental #3": rent_grid_item_schema,
        "COMPARABLE Rental #4": rent_grid_item_schema,
        "COMPARABLE Rental #5": rent_grid_item_schema,
    },
    "required": ["Subject", "COMPARABLE Rental #1"]
}

comp_rental_item_schema = {
    "type": "object",
    "properties": {
        field: {"type": "string"} for field in COMPARABLE_RENTAL_DATA_FIELDS
    },
    "required": COMPARABLE_RENTAL_DATA_FIELDS
}

comparable_rental_data_schema = {
    "type": "object",
    "properties": {
        "Subject": comp_rental_item_schema,
        "COMPARABLE Rental No #1": comp_rental_item_schema,
        "COMPARABLE Rental No #2": comp_rental_item_schema,
        "COMPARABLE Rental No #3": comp_rental_item_schema,
        "COMPARABLE Rental No #4": comp_rental_item_schema,
    },
    "required": ["Subject", "COMPARABLE Rental No #1"]
}

custom_checklist_schema = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "comparison_summary": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["Fulfilled", "Not Fulfilled"]},
                    "section": {"type": "string"},
                    "comment": {"type": "string"}
                },
                "required": ["status", "section", "comment"]
            }
        }
    },
    "required": ["summary", "comparison_summary"]
}



def extract_fields_from_pdf(pdf_path: str, form_type: str = "1004", category: str | None = None, custom_prompt: str | None = None, prompt_type: str = "checklist") -> dict:
    """
    100% Offline pure Python & regex extraction.
    Delegates to appropriate offline extractor without calling any external LLM/Gemini API.
    """
    form_type_clean = (form_type or "").strip()

    # Priority routing for Version 1 / Version 5 URAR
    if form_type_clean in ["Appraisal Version #1", "Appraisal Version #5", "Version 1", "Version 5", "URAR"] or "Appraisal Version" in form_type_clean or "VERSION" in form_type_clean.upper():
        try:
            from api.pdf_extractor_v1 import extract_fields_from_pdf_v1
            res = extract_fields_from_pdf_v1(pdf_path, category=category, custom_prompt=custom_prompt, prompt_type=prompt_type)
            if isinstance(res, dict) and res.get("status") == "success":
                return res
        except Exception as e:
            print(f"[pdf_extractor] Version 1 offline attempt notice: {e}")

    # Priority routing for ECR
    if form_type_clean.upper() in ["ECR", "ERC", "WORLDWIDE ERC"]:
        try:
            try:
                from api.pdf_extractor_ecr import extract_fields_from_pdf_ecr
            except ImportError:
                from .pdf_extractor_ecr import extract_fields_from_pdf_ecr
            res = extract_fields_from_pdf_ecr(pdf_path, category=category, custom_prompt=custom_prompt, prompt_type=prompt_type)
            if isinstance(res, dict) and res.get("status") == "success":
                return res
        except Exception as e:
            print(f"[pdf_extractor] ECR offline attempt notice: {e}")

    # Standard Form 1004 offline extraction
    from api.pdf_extractor_offline import extract_fields_from_pdf_offline
    res = extract_fields_from_pdf_offline(pdf_path)

    # Fallback to Version 1 offline if standard extraction did not succeed
    if not isinstance(res, dict) or res.get("status") != "success":
        try:
            from api.pdf_extractor_v1_offline import extract_fields_from_pdf_v1_offline
            v1_res = extract_fields_from_pdf_v1_offline(pdf_path)
            if isinstance(v1_res, dict) and v1_res.get("status") == "success":
                res = v1_res
        except Exception:
            pass

    # Fallback to ECR offline if other forms did not succeed
    if not isinstance(res, dict) or res.get("status") != "success":
        try:
            from api.pdf_extractor_ecr_offline import extract_fields_from_pdf_ecr_offline
            ecr_res = extract_fields_from_pdf_ecr_offline(pdf_path)
            if isinstance(ecr_res, dict) and ecr_res.get("status") == "success":
                res = ecr_res
        except Exception:
            pass

    if not isinstance(res, dict):
        return {"error": "Extraction Error", "message": "Failed to extract fields offline"}

    raw_fields = res.get("fields")
    extracted_fields: dict[str, Any] = raw_fields if isinstance(raw_fields, dict) else {}

    # Handle category filtering
    if category and extracted_fields:
        cat_upper = category.upper()
        cat_data = extracted_fields.get(cat_upper, {})
        if isinstance(cat_data, dict) and cat_data:
            cat_res = {cat_upper: cat_data, **cat_data}
            return {
                "fields": cat_res,
                "raw": json.dumps(cat_res, indent=2, default=str),
                "status": "success"
            }

    # Handle custom_prompt (queries or revision verification offline)
    if custom_prompt:
        prompt_lower = custom_prompt.lower()

        # Revision checklist
        if any(term in prompt_lower for term in ["revision", "checklist", "verify", "changed", "updated", "compare"]):
            try:
                from api.offline_comparison import verify_revision_request_offline
                return verify_revision_request_offline(pdf_path, custom_prompt)
            except Exception:
                pass

        # Requirement checks
        try:
            from api.offline_requirement_checks import (
                evaluate_state_requirements, evaluate_unpaid_ok, evaluate_client_requirements,
                evaluate_adu_requirements, evaluate_escalation_check, evaluate_fha_requirements
            )
            if any(term in prompt_lower for term in ["escalation check", "escalation rules", "run escalation check"]):
                return evaluate_escalation_check(pdf_path, extracted_data=extracted_fields)
            if any(term in prompt_lower for term in ["state-specific", "state specific", "state requirement", "amc license"]):
                return evaluate_state_requirements(pdf_path, extracted_data=extracted_fields)
            if any(term in prompt_lower for term in ["client requirement", "lender requirement", "homexpress", "logan"]):
                return evaluate_client_requirements(pdf_path, extracted_data=extracted_fields, custom_prompt=custom_prompt)
            if "unpaid ok" in prompt_lower:
                return evaluate_unpaid_ok(pdf_path, extracted_data=extracted_fields)
            if any(term in prompt_lower for term in ["accessory dwelling unit", "adu"]):
                return evaluate_adu_requirements(pdf_path, extracted_data=extracted_fields)
            if any(term in prompt_lower for term in ["fha-specific", "fha requirement", "hud 4000.1"]):
                return evaluate_fha_requirements(pdf_path, extracted_data=extracted_fields)
        except Exception:
            pass

        # General query: search for relevant keys or return extracted data
        query_words = [w.strip() for w in re.findall(r'\b\w{3,}\b', prompt_lower)]
        matched_data: dict[str, Any] = {}
        for k, v in extracted_fields.items():
            k_lower = k.lower()
            if any(qw in k_lower for qw in query_words):
                matched_data[k] = v

        if matched_data:
            return {
                "fields": matched_data,
                "summary": f"Found {len(matched_data)} matching fields for query.",
                "raw": json.dumps(matched_data, indent=2, default=str),
                "status": "success"
            }

        return {
            "fields": extracted_fields,
            "summary": "Document processed offline.",
            "raw": json.dumps(extracted_fields, indent=2, default=str),
            "status": "success"
        }

    return res


def compare_documents(original_path: str, revised_path: str, revision_request: str | None = None, form_type: str | None = None) -> dict:
    from api.offline_comparison import compare_documents_offline
    return compare_documents_offline(original_path, revised_path, revision_request=revision_request, form_type=form_type)



def extract_fields_from_html(html_content: str, fields_to_extract: list[str], custom_prompt: str | None = None) -> dict:
    """
    Extracts specified fields from HTML content 100% offline.
    """
    from api.offline_comparison import extract_fields_from_html_offline
    return extract_fields_from_html_offline(html_content, fields_to_extract)