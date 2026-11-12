import { getSubjectRentFieldVal, parseMMDDYYYY, is1007Active, isBlankOrNA, isNA } from './rentScheduleValidation';

const checkNotBlank = (field, text, fieldName) => {
    if (field === fieldName) {
        if (!text || String(text).trim() === '') {
            return { isError: true, message: `'${fieldName}' should not be blank.` };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkTaxYear = (field, text) => {
    if (field !== 'Tax Year') return null;
    const taxYearValue = String(text || '').trim();
    if (!taxYearValue) {
        return { isError: true, message: 'Tax Year should not be blank.' };
    }
    const taxYear = parseInt(taxYearValue, 10);
    if (isNaN(taxYear)) {
        return { isError: true, message: 'Tax Year must be a valid year.' };
    }
    const currentYear = new Date().getFullYear();
    if (taxYear > currentYear || taxYear < currentYear - 1) {
        return { isError: true, message: `Tax Year must be the current year (${currentYear}) or the previous year (${currentYear - 1}).` };
    }
    return { isMatch: true };
};

export const checkSubjectFieldsNotBlank = (field, text) => {
    const fieldsToCheck = [
        'Property Address',
        'County',
        'Borrower',
        'City',
        'Zip Code',
        'Owner of Public Record',
        'Legal Description',
        "Assessor's Parcel #",
        'Neighborhood Name',
        'Map Reference',
        'Census Tract',
        'Occupant',
        'Property Rights Appraised',
        'Lender/Client',
        'Address (Lender/Client)',
        'Report data source(s) used, offering price(s), and date(s)'
    ];
    return checkNotBlank(field, text, fieldsToCheck.find(f => f === field));
};

export const checkAssignmentTypeConsistency = (field, text, data) => {
    if (field !== 'Assignment Type') return null;

    const assignmentType = String(text || data?.['Assignment Type'] || data?.Subject?.['Assignment Type'] || data?.CONTRACT?.['Assignment Type'] || '').trim().toLowerCase();
    const contractData = data?.CONTRACT || {};

    if (assignmentType.includes('purchase')) {
        const isAssistanceYes = String(contractData["Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?"] || '').trim().toLowerCase().includes('yes');
        
        const isContractIncomplete = [
            "I did did not analyze the contract for sale for the subject purchase transaction. Explain the results of the analysis of the contract for sale or why the analysis was not performed.",
            "Contract Price $",
            "Date of Contract",
            "Is property seller owner of public record?",
            "Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?"
        ].some(f => !contractData[f] || String(contractData[f]).trim() === '') ||
        (!contractData["Data Source(s)"] && !contractData["Data Source(s) (Contract)"]) ||
        (isAssistanceYes && (!contractData["If Yes, report the total dollar amount and describe the items to be paid"] || String(contractData["If Yes, report the total dollar amount and describe the items to be paid"]).trim() === ''));

        if (isContractIncomplete) {
            return { isError: true, message: `Assignment Type is 'Purchase Transaction' then contract fields must be filled.` };
        }
        return { isMatch: true };
    }

    if (assignmentType.includes('refinance')) {
        const contractFields = [
            "I did did not analyze the contract for sale for the subject purchase transaction. Explain the results of the analysis of the contract for sale or why the analysis was not performed.",
            "Contract Price $",
            "Date of Contract",
            "Is property seller owner of public record?",
            "Data Source(s)",
            "Data Source(s) (Contract)",
            "Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?",
            "If Yes, report the total dollar amount and describe the items to be paid"
        ];
        const invalidFieldsExist = contractFields.some(f => {
            const val = String(contractData[f] || '').trim().toLowerCase();
            return val !== '' && val !== 'did not' && val !== 'no' && val !== 'n/a';
        });

        if (invalidFieldsExist) {
            return { isError: true, message: `Assignment Type is 'Refinance Transaction' then all contract fields must be blank, 'No', 'N/A', or 'Did not'.` };
        }
        return { isMatch: true };
    }

    if (assignmentType.includes('other')) {
        return { isError: true, message: `need to find the comment` };
    }

    return { isError: true, message: `Assignment Type is required or invalid.` };
};
export const checkRETaxes = (field, text) => {
    if (field !== 'R.E. Taxes $') return null;
    const taxesValue = String(text || '').trim();
    if (!taxesValue) {
        return { isError: true, message: 'R.E. Taxes $ should not be blank.' };
    }
    if (/[a-zA-Z]/.test(taxesValue)) {
        return { isError: true, message: 'R.E. Taxes $ must only contain numbers and currency symbols.' };
    }
    return { isMatch: true };
};

export const checkSpecialAssessments = (field, text) => {
    if (field !== 'Special Assessments $') return null;
    const value = parseFloat(String(text || '0').replace(/[^0-9.-]+/g, ""));
    if (isNaN(value) || value < 0) {
        return { isError: true, message: 'Special Assessments $ must be at least 0.' };
    }
    return { isMatch: true };
};

export const checkPUD = (field, text) => {
    if (field !== 'PUD' && field !== 'Planned Unit Development (PUD)') return null;
    let value = String(text || '').trim().toLowerCase();
    if (value.startsWith('yes')) value = 'yes';
    else if (value.startsWith('no')) value = 'no';
    if (value !== 'yes' && value !== 'no') {
        return { isError: true, message: "PUD must be 'Yes' or 'No'." };
    }
    return { isMatch: true };
};

export const checkHOA = (field, text, data) => {
    if (field !== 'HOA $' && field !== 'HOA') return null;
    const pudValue = String(data?.['PUD'] || data?.['Planned Unit Development (PUD)'] || '').trim().toLowerCase();
    if (pudValue.startsWith('yes')) {
        const hoaValue = parseFloat(String(text || '').replace(/[^0-9.-]+/g, ""));
        if (isNaN(hoaValue) || hoaValue <= 0) {
            return { isError: true, message: 'HOA $ must be greater than 0 if PUD is Yes.' };
        }
        const hasPerYear = data?.['HOA(per year)'] || data?.['HOA (per year)'] || data?.['PUD Fees (per year)'];
        const hasPerMonth = data?.['HOA(per month)'] || data?.['HOA (per month)'] || data?.['PUD Fees (per month)'];
        if (!hasPerYear && !hasPerMonth) {
            return { isError: true, message: "If PUD is 'Yes', at least one of 'HOA (per year)' or 'HOA (per month)' must be specified." };
        }
    }
    return { isMatch: true };
};

export const checkHOAFrequency = (field, text, data) => {
    if (field !== 'HOA(per month)' && field !== 'HOA (per month)' && field !== 'HOA(per year)' && field !== 'HOA (per year)') return null;
    const val = String(text || '').trim();
    if (!val) return null;
    return { isMatch: true };
};
export const checkOfferedForSale = (field, text, data) => {
    if (field === 'Offered for Sale in Last 12 Months') {
        const value = String(text || '').trim().toLowerCase();
        if (value !== 'yes' && value !== 'no') {
            return { isError: true, message: "This field must be 'Yes' or 'No'." };
        }
        if (value === 'yes') {
            const detailsField = data['Report data source(s) used, offering price(s), and date(s)'];
            if (!detailsField) {
                return { isError: true, message: "If 'Yes', details must be provided in the data source field below." };
            }
            const detailsValue = String(detailsField || '').toLowerCase();
            const keywords = ['dom', 'listed', 'listing', 'mls', 'multiple listing service'];
            const hasKeyword = keywords.some(keyword => detailsValue.includes(keyword));

            if (!hasKeyword) {
                return { isError: true, message: `If 'Yes', details must include one of: ${keywords.join(', ')}.` };
            }
        }
    }
    return { isMatch: true };
};

export const checkReportDataSourceOfferingPriceDate = (field, text, data) => {
    const cleanField = String(field || '').trim().toLowerCase().replace(/\.+$/, '');
    if (cleanField !== 'report data source(s) used, offering price(s), and date(s)') {
        return null;
    }

    const val = String(text || '').trim();
    if (!val) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: "'Report data source(s) used, offering price(s), and date(s)' must not be blank."
        };
    }

    const upperVal = val.toUpperCase();

    // Check if property is NOT currently listed for sale
    const isNotListed = (
        upperVal.includes('NOT CURRENTLY LISTED FOR SALE') ||
        upperVal.includes('NOT CURRENTLY LISTED') ||
        upperVal.includes('NOT BEEN LISTED FOR SALE') ||
        upperVal.includes('NOT LISTED FOR SALE') ||
        upperVal.includes('NOT BEEN LISTED') ||
        upperVal.includes('NOT OFFERED FOR SALE') ||
        upperVal.includes('NOT LISTED') ||
        upperVal.includes('NO LISTINGS') ||
        upperVal.includes('NO CURRENT LISTING') ||
        upperVal.includes('NO LISTING HISTORY') ||
        upperVal.includes('NEVER LISTED')
    );

    if (isNotListed) {
        return {
            isMatch: true,
            message: "Validation successful: Subject is not currently listed for sale."
        };
    }

    // Check if property is LISTED / OFFERED for sale
    const isListed = (
        upperVal.includes('LISTED FOR SALE') ||
        upperVal.includes('OFFERED FOR SALE') ||
        upperVal.includes('FOR SALE') ||
        upperVal.includes('WAS LISTED') ||
        upperVal.includes('WAS OFFERED') ||
        String(data?.['Offered for Sale in Last 12 Months'] || '').trim().toLowerCase() === 'yes'
    );

    if (isListed) {
        // 1. sale on date: offering date e.g. "offered for sale on 10/05/2026" or "sale on 10/05/2026"
        const hasSaleOnDate = /(?:offered\s+for\s+sale\s+on|listed\s+(?:for\s+sale\s+)?on|sale\s+on|offered\s+on)\s*[:-]?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i.test(val);

        // 2. for: offering price e.g. "for $1,189,900"
        const hasForPrice = /\bfor\s+\$[\d,]+(?:\.\d+)?/i.test(val) || /\bfor\s+[\d,]{4,}/i.test(val);

        // 3. law / CLAW / MLS data source
        const hasLawOrMls = (
            /\b(?:claw|law|mls)\b/i.test(val) ||
            /#\s*[A-Z0-9]+/i.test(val) ||
            upperVal.includes('CLAW') ||
            upperVal.includes('LAW') ||
            upperVal.includes('MLS') ||
            upperVal.includes('DATA SOURCE')
        );

        // 4. list price
        const hasListPrice = (
            /\b(?:list\s+price|listing\s+price|offering\s+price)\b/i.test(val) ||
            upperVal.includes('LIST PRICE') ||
            upperVal.includes('LISTING PRICE')
        );

        // 5. mls contract date
        const hasContractDate = (
            /(?:mls\s+)?contract\s+date/i.test(val) ||
            (/\bcontract\b/i.test(val) && /\bdate\b/i.test(val) && /\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/.test(val))
        );

        const missing = [];
        if (!hasSaleOnDate) missing.push("sale on date");
        if (!hasForPrice) missing.push("for [price]");
        if (!hasLawOrMls) missing.push("CLAW/MLS data source");
        if (!hasListPrice) missing.push("list price");
        if (!hasContractDate) missing.push("MLS contract date");

        if (missing.length > 0) {
            return {
                isError: true,
                message: `Listed for sale missing required items: ${missing.join(', ')}.`
            };
        }

        return {
            isMatch: true,
            message: "Validation successful: All listing details verified."
        };
    }

    // Neither listed nor not listed
    return {
        isError: true,
        message: "Must state whether the property is 'LISTED FOR SALE' (with sale on date, for [price], CLAW/MLS, list price, and MLS contract date) or 'NOT CURRENTLY LISTED FOR SALE'."
    };
};

export const checkPropertyRightsInconsistency = (field, text, data) => {
    if (field !== 'Property Rights Appraised' || !data.Subject) return null;
    const subjectPropertyRights = String(text || '').trim();
    const salesGridPropertyRights = String(data.SALES_GRID?.Subject?.['Leasehold/Fee Simple'] || data['Sales Grid']?.Subject?.['Leasehold/Fee Simple'] || data.Subject?.['Leasehold/Fee Simple'] || '').trim();
    if (subjectPropertyRights && salesGridPropertyRights && subjectPropertyRights !== salesGridPropertyRights) {
        return { isError: true, message: `Property Rights mismatch: Subject section has '${subjectPropertyRights}', but Sales Comparison has '${salesGridPropertyRights}'.` };
    }
    return { isMatch: true };
};

export const checkAnsi = (field, text, data) => {
    if (field !== 'ANSI') return null;
    const isFha = data && (
        (data['FHA Case No.'] && String(data['FHA Case No.']).trim() !== '') ||
        (data['FHA Case #'] && String(data['FHA Case #']).trim() !== '') ||
        (data['FHA Case Number'] && String(data['FHA Case Number']).trim() !== '') ||
        (data?.Subject?.['FHA Case No.'] && String(data.Subject['FHA Case No.']).trim() !== '') ||
        (data?.Subject?.['FHA Case #'] && String(data.Subject['FHA Case #']).trim() !== '') ||
        (data?.Subject?.['FHA Case Number'] && String(data.Subject['FHA Case Number']).trim() !== '') ||
        (data?.SUBJECT?.['FHA Case No.'] && String(data.SUBJECT['FHA Case No.']).trim() !== '') ||
        (data?.SUBJECT?.['FHA Case #'] && String(data.SUBJECT['FHA Case #']).trim() !== '') ||
        (data?.SUBJECT?.['FHA Case Number'] && String(data.SUBJECT['FHA Case Number']).trim() !== '')
    );
    const ansiComment = String(text || '').trim();
    if (ansiComment.toUpperCase().includes('GX001')) {
        return { isError: true, message: "ANSI comment must not include code 'GX001'." };
    }

    if (!isFha && !ansiComment) {
        return { isError: true, message: "ANSI comment is mandatory for conventional loans." };
    }

    return { isMatch: true };
};

export const checkCensusTract = (field, text) => {
    if (field !== 'Census Tract') return null;
    const value = String(text || '').trim();
    if (!value) return null;

    if (!/^\d+(\.\d+)?$/.test(value)) {
        return { isError: true, message: 'Census Tract must only contain numbers.' };
    }
    return { isMatch: true };
};

export const checkFullAddressConsistency = (field, text) => {
    if (field !== 'Full Address') return null;
    const value = String(text || '').trim();
    if (value.includes('Inconsistent')) {
        return { isError: true, message: "Full Address is inconsistent." };
    }
    return { isMatch: true };
};

export const checkPresence = (field, text) => {
    const value = String(text || '').trim();
    if (!value) return { isError: true, message: `${field} is empty.` };

    const lowerValue = value.toLowerCase();
    if (lowerValue.includes('not present')) {
        return { isError: true, message: `${field} is marked as not present.` };
    }
    return { isMatch: true };
};

export const checkPriorServicesDisclosure = (field, text) => {
    const value = String(text || '').trim();
    if (!value) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: "Prior Services (3-Year Period Disclosure) must not be blank."
        };
    }

    // 1. Negative phrasing: "not have performed", "have not performed", "did not perform", "never performed", "not performed", "no services", etc.
    const isNegative = (
        /\b(?:not\s+have\s+performed|have\s+not\s+performed|have\s+not\s+provided|not\s+performed|did\s+not\s+perform|never\s+performed|no\s+prior\s+services?|no\s+services|not\s+provided)\b/i.test(value) ||
        /\b(?:i|appraiser)\s+(?:have\s+|has\s+)?not\b/i.test(value) ||
        /\b(?:i|appraiser)\s+did\s+not\b/i.test(value) ||
        /\bperformed\s+no\s+services\b/i.test(value) ||
        /\bnot\s+present\b/i.test(value)
    );

    if (isNegative) {
        return {
            isMatch: true,
            message: "Verified: Prior services disclosure confirms no services were performed ('I have NOT performed services...')."
        };
    }

    // 2. Positive phrasing: "I HAVE performed", "have performed", "performed services", "has performed"
    const isPositive = (
        /\b(?:i|appraiser)?\s*(?:have|has)\s+performed\b/i.test(value) ||
        /\bperformed\s+(?:prior\s+)?services\b/i.test(value)
    );

    if (isPositive) {
        return {
            isMatch: true,
            message: "Prior services were performed on subject within 3 years ('I HAVE performed services') - verify supporting explanation in report comments."
        };
    }

    // 3. Compliant if statement contains standard disclosure text
    if (value.toLowerCase().includes('three-year period') || value.toLowerCase().includes('prior services')) {
        return {
            isMatch: true,
            message: "Verified: Prior services disclosure present."
        };
    }

    return {
        isError: true,
        message: "Invalid Prior Services disclosure format."
    };
};

export const checkFhaCaseNo = (field, text) => {
    if (field !== 'FHA Case No.' && field !== 'FHA Case #' && field !== 'FHA Case Number') return null;
    const value = String(text || '').trim();
    if (value === '000-0000000') {
        return { isError: true, message: "FHA Case No. cannot be 000-0000000." };
    }
    return { isMatch: true };
};

export const checkOccupancy = (field, text, allData) => {
    const targetFields = ['Occupant', 'Occupancy'];
    if (!targetFields.includes(field)) return null;

    const value = String(text || '').trim();
    if (!value) return null;

    const validOptions = ['owner', 'tenant', 'vacant'];
    const valueLower = value.toLowerCase();

    const matchedOption = validOptions.find(opt => valueLower === opt || valueLower.includes(opt));

    if (!matchedOption) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Invalid value for '${field}': '${value}'. Expected one of: Owner, Tenant, Vacant.`
        };
    }

    if (!allData) return { isMatch: true };

    if (is1007Active(allData)) {
        const leaseBegins = getSubjectRentFieldVal(allData, 'Date Lease Begins');
        const leaseExpires = getSubjectRentFieldVal(allData, 'Date Lease Expires');

        // If occupant is owner or vacant, lease dates must be blank or N/A and vice versa
        if (matchedOption === 'owner' || matchedOption === 'vacant') {
            if (!isBlankOrNA(leaseBegins) || !isBlankOrNA(leaseExpires)) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `Occupant is '${value}', but lease dates are present in Rental Grid. Lease start and end dates must be blank or N/A.`
                };
            }
        } else if (matchedOption === 'tenant') {
            // If occupant is tenant, start and end date must be present and valid
            if (!leaseBegins || !leaseExpires || isNA(leaseBegins) || isNA(leaseExpires)) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `Occupant is 'Tenant', but lease start and end dates must be present in Rental Grid.`
                };
            }

            const beginsDateObj = parseMMDDYYYY(leaseBegins);
            const expiresDateObj = parseMMDDYYYY(leaseExpires);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (!beginsDateObj || !expiresDateObj) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `Occupant is 'Tenant', but lease dates in Rental Grid must be valid dates in MM/DD/YYYY format.`
                };
            }

            // Logical: end date should be greater than start date
            if (beginsDateObj >= expiresDateObj) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `Occupant is 'Tenant', but in Rental Grid 'Date Lease Expires' (${leaseExpires}) must be greater than 'Date Lease Begins' (${leaseBegins}).`
                };
            }

            // Logical: end date should be greater than current date
            if (expiresDateObj <= today) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `Occupant is 'Tenant', but in Rental Grid 'Date Lease Expires' (${leaseExpires}) must be greater than current date.`
                };
            }

            // Monthly Rental, Less: Utilities (zero allowed), Furniture (zero allowed), Adjusted Monthly Rent should be present
            const monthlyRental = getSubjectRentFieldVal(allData, 'Monthly Rental');
            const utilities = getSubjectRentFieldVal(allData, 'Less: Utilities');
            const furniture = getSubjectRentFieldVal(allData, 'Furniture');
            const adjRent = getSubjectRentFieldVal(allData, 'Adjusted Monthly Rent');

            const missing = [];
            if (!monthlyRental) missing.push('Monthly Rental');
            if (utilities === '' || utilities === undefined || utilities === null) missing.push('Less: Utilities (zero allowed)');
            if (furniture === '' || furniture === undefined || furniture === null) missing.push('Furniture (zero allowed)');
            if (!adjRent) missing.push('Adjusted Monthly Rent');

            if (missing.length > 0) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `Occupant is 'Tenant', but Rental Grid is missing: ${missing.join(', ')}.`
                };
            }
        }
    }

    return { isMatch: true };
};

export { checkTransactionTypeHtmlConsistency, checkAssignmentTypeHtmlConsistency, checkSubjectLenderNameVsHtml, checkLenderAddressHtmlConsistency, checkLenderAddressInconsistency } from './htmldatavaliadtion';
