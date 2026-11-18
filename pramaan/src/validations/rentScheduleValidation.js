import { parseDesignStyle } from './improvementsValidation';
import { is1004And1007Form } from './form1004And1007Validation';

export const isValidLeaseDateFormat = (str) => {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (!trimmed) return false;

    // 1. MM/dd/yyyy or MM-dd-yyyy
    const m1 = trimmed.match(/^(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](\d{4})$/);
    if (m1) {
        const month = parseInt(m1[1], 10);
        const day = parseInt(m1[2], 10);
        const year = parseInt(m1[3], 10);
        const d = new Date(year, month - 1, day);
        return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
    }

    // 2. yyyy/mm/dd or yyyy-mm-dd
    const m2 = trimmed.match(/^(\d{4})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])$/);
    if (m2) {
        const year = parseInt(m2[1], 10);
        const month = parseInt(m2[2], 10);
        const day = parseInt(m2[3], 10);
        const d = new Date(year, month - 1, day);
        return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
    }

    // 3. mm/yyyy or mm-yyyy
    const m3 = trimmed.match(/^(0?[1-9]|1[0-2])[-/](\d{4})$/);
    if (m3) {
        const month = parseInt(m3[1], 10);
        const year = parseInt(m3[2], 10);
        return month >= 1 && month <= 12 && year >= 1900 && year <= 2100;
    }

    // 4. yyyy/yyyy or yyyy-yyyy
    const m4 = trimmed.match(/^(\d{4})[-/](\d{4})$/);
    if (m4) {
        const y1 = parseInt(m4[1], 10);
        const y2 = parseInt(m4[2], 10);
        return y1 >= 1900 && y1 <= 2100 && y2 >= 1900 && y2 <= 2100;
    }

    return false;
};

export const parseMMDDYYYY = (str, isExpiry = false) => {
    if (!str || typeof str !== 'string') return null;
    const trimmed = str.trim();
    if (!trimmed) return null;

    // 1. MM/dd/yyyy or MM-dd-yyyy
    const m1 = trimmed.match(/^(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](\d{4})$/);
    if (m1) {
        const month = parseInt(m1[1], 10);
        const day = parseInt(m1[2], 10);
        const year = parseInt(m1[3], 10);
        const dateObj = new Date(year, month - 1, day);
        if (dateObj.getFullYear() === year && dateObj.getMonth() === month - 1 && dateObj.getDate() === day) {
            return dateObj;
        }
        return null;
    }

    // 2. yyyy/mm/dd or yyyy-mm-dd
    const m2 = trimmed.match(/^(\d{4})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])$/);
    if (m2) {
        const year = parseInt(m2[1], 10);
        const month = parseInt(m2[2], 10);
        const day = parseInt(m2[3], 10);
        const dateObj = new Date(year, month - 1, day);
        if (dateObj.getFullYear() === year && dateObj.getMonth() === month - 1 && dateObj.getDate() === day) {
            return dateObj;
        }
        return null;
    }

    // 3. mm/yyyy or mm-yyyy
    const m3 = trimmed.match(/^(0?[1-9]|1[0-2])[-/](\d{4})$/);
    if (m3) {
        const month = parseInt(m3[1], 10);
        const year = parseInt(m3[2], 10);
        return new Date(year, month - 1, 1);
    }

    // 4. yyyy/yyyy or yyyy-yyyy
    const m4 = trimmed.match(/^(\d{4})[-/](\d{4})$/);
    if (m4) {
        const y1 = parseInt(m4[1], 10);
        const y2 = parseInt(m4[2], 10);
        const targetYear = isExpiry ? y2 : y1;
        return new Date(targetYear, 0, 1);
    }

    return null;
};

export const isLeaseExpired = (str, refDate = new Date()) => {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (!trimmed || isNA(trimmed)) return false;

    const today = new Date(refDate);
    today.setHours(0, 0, 0, 0);

    // 1. MM/dd/yyyy or MM-dd-yyyy
    const m1 = trimmed.match(/^(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](\d{4})$/);
    if (m1) {
        const month = parseInt(m1[1], 10);
        const day = parseInt(m1[2], 10);
        const year = parseInt(m1[3], 10);
        const dateObj = new Date(year, month - 1, day);
        dateObj.setHours(0, 0, 0, 0);
        return dateObj < today;
    }

    // 2. yyyy/mm/dd or yyyy-mm-dd
    const m2 = trimmed.match(/^(\d{4})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])$/);
    if (m2) {
        const year = parseInt(m2[1], 10);
        const month = parseInt(m2[2], 10);
        const day = parseInt(m2[3], 10);
        const dateObj = new Date(year, month - 1, day);
        dateObj.setHours(0, 0, 0, 0);
        return dateObj < today;
    }

    // 3. mm/yyyy or mm-yyyy (expires at the end of the specified month)
    const m3 = trimmed.match(/^(0?[1-9]|1[0-2])[-/](\d{4})$/);
    if (m3) {
        const month = parseInt(m3[1], 10);
        const year = parseInt(m3[2], 10);
        const lastDayOfMonth = new Date(year, month, 0);
        lastDayOfMonth.setHours(0, 0, 0, 0);
        return lastDayOfMonth < today;
    }

    // 4. yyyy/yyyy or yyyy-yyyy (expires at the end of the expiration year)
    const m4 = trimmed.match(/^(\d{4})[-/](\d{4})$/);
    if (m4) {
        const y2 = parseInt(m4[2], 10);
        const lastDayOfYear = new Date(y2, 11, 31);
        lastDayOfYear.setHours(0, 0, 0, 0);
        return lastDayOfYear < today;
    }

    return false;
};

export const parseRentalAmount = (val) => {
    if (val === undefined || val === null) return null;
    const str = String(typeof val === 'object' && val !== null ? (val.value ?? '') : val).trim();
    if (str === '') return null;
    const cleaned = str.replace(/[^0-9.-]+/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return NaN;
    const num = parseFloat(cleaned);
    return isNaN(num) ? NaN : num;
};

export const getSubjectRentFieldVal = (allData, fieldName) => {
    if (!allData) return '';
    const aliases = [fieldName];
    if (fieldName === 'Less: Utilities') {
        aliases.push('Less Utilities', 'Utilities', 'Less: Utilities $');
    } else if (fieldName === 'Monthly Rental') {
        aliases.push('Monthly Rent', 'If Currently Rented: $', 'If Currently Rented');
    } else if (fieldName === 'Adjusted Monthly Rent') {
        aliases.push('Adjusted Monthly', 'Adjusted Rent');
    } else if (fieldName === 'Design and Appeal') {
        aliases.push('Design & Appeal', 'Design and Appeal (Subject)', 'Design (Style)', 'Design/Appeal');
    } else if (fieldName === 'Location/View') {
        aliases.push('Location / View', 'Location', 'View');
    } else if (fieldName === 'Age') {
        aliases.push('Actual Age', 'Age (Yrs)', 'Age (Years)');
    } else if (fieldName === 'Condition') {
        aliases.push('Overall Condition', 'Condition Rating');
    } else if (fieldName === 'Room Count Total') {
        aliases.push('Total Rooms', 'Total', 'Rooms', 'Above Grade Room Count Total');
    } else if (fieldName === 'Room Count Bdrms') {
        aliases.push('Bedrooms', 'Bdrms', 'Bedrooms Above Grade');
    } else if (fieldName === 'Room Count Baths') {
        aliases.push('Baths', 'Bathrooms', 'Bath(s)', 'Bath(s) Above Grade');
    } else if (fieldName === 'Gross Living Area') {
        aliases.push('Gross Living Area (GLA)', 'Square Feet of Gross Living Area Above Grade', 'GLA');
    } else if (fieldName === 'Other:') {
        aliases.push('Other', 'Other Feature', 'Other Description');
    } else if (fieldName === 'Other (e.g., basement, etc.)' || fieldName === 'Other (e.g., basement)' || fieldName === 'Other Basement') {
        aliases.push(
            'Other (e.g., basement, etc.)',
            'Other (e.g., basement)',
            'Other (e.g., basement etc.)',
            'Other Basement',
            'Basement (Other)',
            'Other (Basement)',
            'Basement & Finished Rooms Below Grade'
        );
    }

    for (const f of aliases) {
        const val =
            allData?.['Single Family Rent Schedule']?.[f] ??
            allData?.clean_data?.['Single Family Rent Schedule']?.[f] ??
            allData?.['Subject Rent Schedule']?.[f] ??
            allData?.clean_data?.['Subject Rent Schedule']?.[f] ??
            allData?.Subject?.[f] ??
            allData?.clean_data?.Subject?.[f] ??
            allData?.SALES_GRID?.Subject?.[f] ??
            allData?.['Sales Grid']?.Subject?.[f] ??
            allData?.[f];

        if (val !== undefined && val !== null) {
            const strVal = typeof val === 'object' && val !== null ? (val.value ?? '') : val;
            if (String(strVal).trim() !== '') {
                return String(strVal).trim();
            }
        }
    }
    return '';
};

export const getSubjectOccupant = (allData) => {
    if (!allData) return '';
    const raw = (
        allData?.['Occupant'] ??
        allData?.Subject?.['Occupant'] ??
        allData?.clean_data?.['Occupant'] ??
        allData?.clean_data?.Subject?.['Occupant'] ??
        allData?.['Occupancy'] ??
        allData?.Subject?.['Occupancy'] ??
        allData?.clean_data?.['Occupancy'] ??
        allData?.clean_data?.Subject?.['Occupancy'] ??
        ''
    );
    const strVal = typeof raw === 'object' && raw !== null ? (raw.value ?? '') : raw;
    const lower = String(strVal || '').trim().toLowerCase();
    if (lower === 'tenant' || lower.includes('tenant')) return 'Tenant';
    if (lower === 'owner' || lower.includes('owner')) return 'Owner';
    if (lower === 'vacant' || lower.includes('vacant')) return 'Vacant';
    return '';
};

export const is1007Active = (allData, selectedFormType) => {
    const raw = String(
        selectedFormType ||
        allData?.formType ||
        allData?.selectedFormType ||
        allData?.['Form Type'] ||
        allData?.['From Type'] ||
        allData?.clean_data?.formType ||
        allData?.clean_data?.['Form Type'] ||
        ''
    ).toLowerCase();

    const normalized = raw.replace(/\s+/g, '');

    // If form type is 1004 (and not 1004+1007), it is strictly NOT 1004+1007
    if (normalized.includes('1004') && !normalized.includes('1007')) {
        return false;
    }

    return (
        normalized.includes('1004+1007') ||
        normalized.includes('1007') ||
        normalized.includes('1025') ||
        Boolean(allData?.RENTAL_GRID || allData?.['Comparable Rental Data'] || allData?.clean_data?.['Comparable Rental Data'] ||
            allData?.['Comparable Rent Schedule'] || allData?.clean_data?.['Comparable Rent Schedule'] ||
            allData?.['Single Family Rent Schedule'] || allData?.clean_data?.['Single Family Rent Schedule'])
    );
};

export const checkRentProximityToSubject = (field, text, allData, path, saleName) => {
    let actualText = text;
    let actualAllData = allData;
    let actualPath = path;
    let actualSaleName = saleName;

    // Handle (field, allData, saleName) call signature
    if (text && typeof text === 'object' && !Array.isArray(text) && typeof allData === 'string') {
        actualAllData = text;
        actualSaleName = allData;
        actualText = null;
    }

    if (!actualSaleName && Array.isArray(actualPath) && actualPath.length > 0) {
        actualSaleName = actualPath[0];
    }
    if (!actualSaleName && typeof actualPath === 'string') {
        actualSaleName = actualPath;
    }

    const normField = String(field || '').trim().toLowerCase();
    if (normField !== 'proximity to subject') return null;

    if (!actualSaleName || String(actualSaleName).trim().toLowerCase() === 'subject') {
        return null;
    }

    const normSale = String(actualSaleName).toUpperCase();
    if (normSale.includes('SALE') && !normSale.includes('RENT')) {
        return null;
    }

    const isRentComp = normSale.startsWith('COMPARABLE NO') ||
        normSale.includes('RENT') ||
        normSale.startsWith('RENTAL') ||
        (Array.isArray(actualPath) && actualPath.some(p => {
            const s = String(p).toUpperCase();
            return s.includes('RENT') || s.startsWith('COMPARABLE NO') || s.startsWith('RENTAL');
        }));

    if (!isRentComp) return null;

    let proximityText = (actualText !== null && actualText !== undefined) ? String(actualText).trim() : '';

    if (!proximityText && actualAllData && typeof actualAllData === 'object') {
        const compData = actualAllData[actualSaleName] ||
            actualAllData['Comparable Rental Data']?.[actualSaleName] ||
            actualAllData.clean_data?.['Comparable Rental Data']?.[actualSaleName] ||
            actualAllData['Single Family Rent Schedule']?.[actualSaleName] ||
            actualAllData.RENTAL_GRID?.[actualSaleName] ||
            {};
        proximityText = String(compData['Proximity to Subject'] || compData['Proximity'] || '').trim();
    }

    if (!proximityText) return null;

    const match = proximityText.match(/\d*\.?\d+/);
    const proximityValue = match ? parseFloat(match[0]) : NaN;
    if (isNaN(proximityValue)) return null;

    if (proximityValue > 10) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `The miles of rental should be not more than 10 miles (current: ${proximityText}).`
        };
    }

    return {
        isMatch: true,
        message: `Valid: The miles of rental is not more than 10 miles (${proximityText}).`
    };
};

export const isNA = (val) => {
    if (val === undefined || val === null) return false;
    const str = String(typeof val === 'object' && val !== null ? (val.value ?? '') : val).trim().toLowerCase();
    return ['n/a', 'na', 'n / a', 'none', 'not applicable', '-', '--'].includes(str);
};

export const isBlankOrNA = (val) => {
    if (val === undefined || val === null) return true;
    const str = String(typeof val === 'object' && val !== null ? (val.value ?? '') : val).trim();
    if (str === '') return true;
    return isNA(str);
};

export const isBlankOrZeroOrNA = (val) => {
    if (val === undefined || val === null) return true;
    const str = String(typeof val === 'object' && val !== null ? (val.value ?? '') : val).trim();
    if (str === '' || isNA(str)) return true;
    const num = parseRentalAmount(str);
    return num === 0;
};

export const checkLeaseDates = (field, text, allData, path, saleName) => {
    if (field !== 'Date Lease Begins' && field !== 'Date Lease Expires') {
        return null;
    }

    const activeName = saleName || (path && path[0]) || '';
    const upperName = String(activeName).toUpperCase();
    const isSubject = upperName === 'SUBJECT' || (!activeName && !path);
    const isComparable = upperName.includes('COMPARABLE') || upperName.includes('COMP');

    if (!isSubject && !isComparable) {
        return null;
    }

    if (isSubject) {
        if (!is1007Active(allData)) {
            return null;
        }

        const occupant = getSubjectOccupant(allData);

        const currentVal = String(text ?? '').trim();
        const storedBegins = getSubjectRentFieldVal(allData, 'Date Lease Begins');
        const storedExpires = getSubjectRentFieldVal(allData, 'Date Lease Expires');

        const leaseBeginsStr = (field === 'Date Lease Begins') ? currentVal : storedBegins;
        const leaseExpiresStr = (field === 'Date Lease Expires') ? currentVal : storedExpires;
        const thisDateStr = (field === 'Date Lease Begins') ? leaseBeginsStr : leaseExpiresStr;

        // If Occupant is Owner or Vacant, lease dates MUST be blank or N/A
        if (occupant === 'Owner' || occupant === 'Vacant') {
            if (!isBlankOrNA(thisDateStr)) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `For Subject, '${field}' must be blank or N/A when Occupant is ${occupant}.`
                };
            }
            if (isNA(thisDateStr)) {
                return { isMatch: true };
            }
            return null;
        }

        // If Occupant is Tenant, lease dates MUST be present and valid
        if (occupant === 'Tenant') {
            if (!thisDateStr || isNA(thisDateStr)) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `For Subject, '${field}' must be present when Occupant is Tenant.`
                };
            }

            if (!isValidLeaseDateFormat(thisDateStr)) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `For Subject, '${field}' (${thisDateStr}) must be in MM/dd/yyyy, yyyy/yyyy, mm/yyyy, or yyyy/mm/dd format.`
                };
            }

            const thisDateObj = parseMMDDYYYY(thisDateStr, field === 'Date Lease Expires');
            if (!thisDateObj) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `For Subject, '${field}' (${thisDateStr}) is not a valid calendar date.`
                };
            }

            const beginsDateObj = parseMMDDYYYY(leaseBeginsStr, false);
            const expiresDateObj = parseMMDDYYYY(leaseExpiresStr, true);

            // Logical check: Date Lease Expires cannot be expired / previous to current date
            if (field === 'Date Lease Expires') {
                if (isLeaseExpired(thisDateStr)) {
                    return {
                        isError: true,
                        skipBlankFilter: true,
                        message: `For Subject, 'Date Lease Expires' (${thisDateStr}) cannot be expired / previous to current date.`
                    };
                }
            }

            // Logical check: End date should be greater than start date
            if (beginsDateObj && expiresDateObj) {
                if (beginsDateObj >= expiresDateObj) {
                    if (field === 'Date Lease Begins') {
                        return {
                            isError: true,
                            skipBlankFilter: true,
                            message: `For Subject, 'Date Lease Begins' (${leaseBeginsStr}) must be before 'Date Lease Expires' (${leaseExpiresStr}).`
                        };
                    } else {
                        return {
                            isError: true,
                            skipBlankFilter: true,
                            message: `For Subject, 'Date Lease Expires' (${leaseExpiresStr}) must be greater than 'Date Lease Begins' (${leaseBeginsStr}).`
                        };
                    }
                }
            }

            return { isMatch: true };
        }

        // If Occupant is not specified, but user entered lease dates
        if (!occupant && !isBlankOrNA(thisDateStr)) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `When lease dates are present in Rental Grid, 'Occupant' in Subject section must be 'Tenant'.`
            };
        }
        if (!occupant && isNA(thisDateStr)) {
            return { isMatch: true };
        }

        return null;
    }

    // Comparable Rental Dates
    const currentVal = String(text ?? '').trim();
    const compData = allData?.[activeName] ||
        allData?.['Comparable Rental Data']?.[activeName] ||
        allData?.clean_data?.['Comparable Rental Data']?.[activeName] ||
        allData?.clean_data?.[activeName] || {};
    const storedBegins = String(compData['Date Lease Begins'] || '').trim();
    const storedExpires = String(compData['Date Lease Expires'] || '').trim();

    const leaseBeginsStr = (field === 'Date Lease Begins') ? currentVal : storedBegins;
    const leaseExpiresStr = (field === 'Date Lease Expires') ? currentVal : storedExpires;

    if (!leaseBeginsStr || !leaseExpiresStr || isNA(leaseBeginsStr) || isNA(leaseExpiresStr)) {
        if (isNA(currentVal)) {
            return { isMatch: true };
        }
        if (currentVal) {
            if (!isValidLeaseDateFormat(currentVal)) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `For ${activeName}, '${field}' (${currentVal}) must be in MM/dd/yyyy, yyyy/yyyy, mm/yyyy, or yyyy/mm/dd format.`
                };
            }
            if (field === 'Date Lease Expires') {
                if (isLeaseExpired(currentVal)) {
                    return {
                        isError: true,
                        skipBlankFilter: true,
                        message: `For ${activeName}, 'Date Lease Expires' (${currentVal}) cannot be expired / previous to current date.`
                    };
                }
            }
            return { isMatch: true };
        }
        return null;
    }

    if (!isValidLeaseDateFormat(leaseBeginsStr)) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `For ${activeName}, 'Date Lease Begins' (${leaseBeginsStr}) must be in MM/dd/yyyy, yyyy/yyyy, mm/yyyy, or yyyy/mm/dd format.`
        };
    }
    if (!isValidLeaseDateFormat(leaseExpiresStr)) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `For ${activeName}, 'Date Lease Expires' (${leaseExpiresStr}) must be in MM/dd/yyyy, yyyy/yyyy, mm/yyyy, or yyyy/mm/dd format.`
        };
    }

    const leaseBeginsDate = parseMMDDYYYY(leaseBeginsStr, false);
    const leaseExpiresDate = parseMMDDYYYY(leaseExpiresStr, true);

    if (!leaseBeginsDate) {
        return { isError: true, skipBlankFilter: true, message: `For ${activeName}, 'Date Lease Begins' (${leaseBeginsStr}) is not a valid calendar date.` };
    }
    if (!leaseExpiresDate) {
        return { isError: true, skipBlankFilter: true, message: `For ${activeName}, 'Date Lease Expires' (${leaseExpiresStr}) is not a valid calendar date.` };
    }

    if (field === 'Date Lease Expires') {
        if (isLeaseExpired(leaseExpiresStr)) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `For ${activeName}, 'Date Lease Expires' (${leaseExpiresStr}) cannot be expired / previous to current date.`
            };
        }
    }

    if (leaseBeginsDate >= leaseExpiresDate) {
        return { isError: true, skipBlankFilter: true, message: `For ${activeName}, 'Date Lease Begins' (${leaseBeginsStr}) must be before 'Date Lease Expires' (${leaseExpiresStr}).` };
    }

    const isYearRange = (s) => /^\d{4}[-/]\d{4}$/.test(String(s || '').trim());
    const isMonthYear = (s) => /^(0?[1-9]|1[0-2])[-/]\d{4}$/.test(String(s || '').trim());
    if (!isYearRange(leaseBeginsStr) && !isYearRange(leaseExpiresStr)) {
        if (isMonthYear(leaseBeginsStr) && isMonthYear(leaseExpiresStr)) {
            const mBegins = leaseBeginsStr.trim().match(/^(0?[1-9]|1[0-2])[-/](\d{4})$/);
            const mExpires = leaseExpiresStr.trim().match(/^(0?[1-9]|1[0-2])[-/](\d{4})$/);
            const monthsDiff = (parseInt(mExpires[2], 10) - parseInt(mBegins[2], 10)) * 12 + (parseInt(mExpires[1], 10) - parseInt(mBegins[1], 10));
            if (monthsDiff !== 11 && monthsDiff !== 12) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `For ${activeName}, the lease duration between 'Date Lease Begins' (${leaseBeginsStr}) and 'Date Lease Expires' (${leaseExpiresStr}) must be one year.`
                };
            }
        } else {
            const diffTime = leaseExpiresDate.getTime() - leaseBeginsDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 364 || diffDays > 366) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `For ${activeName}, the lease duration between 'Date Lease Begins' (${leaseBeginsStr}) and 'Date Lease Expires' (${leaseExpiresStr}) must be one year.`
                };
            }
        }
    }

    return { isMatch: true };
};

export const checkSubjectMonthlyRental = (field, text, allData, path, saleName) => {
    if (field !== 'Monthly Rental') return null;
    const isSubject = saleName === 'Subject' || (path && path[0] === 'Subject') || (!saleName && !path);
    if (!isSubject) return null;
    if (!is1007Active(allData)) return null;

    const occupant = getSubjectOccupant(allData);
    if (occupant === 'Tenant') {
        const amt = parseRentalAmount(text);
        if (amt === null) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "For Subject, 'Monthly Rental' must be present when Occupant is Tenant."
            };
        }
        if (isNaN(amt) || amt <= 0) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "For Subject, 'Monthly Rental' must be a valid amount greater than 0."
            };
        }
        return { isMatch: true };
    }

    if (occupant === 'Owner' || occupant === 'Vacant') {
        if (!isBlankOrZeroOrNA(text)) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `For Subject, 'Monthly Rental' must be blank or zero when Occupant is ${occupant}.`
            };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkSubjectUtilities = (field, text, allData, path, saleName) => {
    if (field !== 'Less: Utilities' && field !== 'Less Utilities' && field !== 'Utilities') return null;
    const isSubject = saleName === 'Subject' || (path && path[0] === 'Subject') || (!saleName && !path);
    if (!isSubject) return null;
    if (!is1007Active(allData)) return null;

    const occupant = getSubjectOccupant(allData);

    if (occupant === 'Owner' || occupant === 'Vacant') {
        if (!isBlankOrZeroOrNA(text)) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `For Subject, 'Less: Utilities' must be blank or zero when Occupant is ${occupant}.`
            };
        }
        return { isMatch: true };
    }

    if (occupant === 'Tenant') {
        if (isBlankOrZeroOrNA(text)) {
            return { isMatch: true };
        }
        const amt = parseRentalAmount(text);
        if (isNaN(amt) || amt < 0) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "For Subject, 'Less: Utilities' must be a valid amount (0 or greater) or blank."
            };
        }
        return { isMatch: true };
    }

    if (isBlankOrZeroOrNA(text)) {
        return { isMatch: true };
    }
    const amt = parseRentalAmount(text);
    if (isNaN(amt) || amt < 0) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: "For Subject, 'Less: Utilities' must be a valid amount (0 or greater) or blank."
        };
    }
    return { isMatch: true };
};

export const checkSubjectFurniture = (field, text, allData, path, saleName) => {
    if (field !== 'Furniture') return null;
    const isSubject = saleName === 'Subject' || (path && path[0] === 'Subject') || (!saleName && !path);
    if (!isSubject) return null;
    if (!is1007Active(allData)) return null;

    const occupant = getSubjectOccupant(allData);

    if (occupant === 'Owner' || occupant === 'Vacant') {
        if (!isBlankOrZeroOrNA(text)) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `For Subject, 'Furniture' must be blank or zero when Occupant is ${occupant}.`
            };
        }
        return { isMatch: true };
    }

    if (occupant === 'Tenant') {
        if (isBlankOrZeroOrNA(text)) {
            return { isMatch: true };
        }
        const amt = parseRentalAmount(text);
        if (isNaN(amt) || amt < 0) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "For Subject, 'Furniture' must be a valid amount (0 or greater) or blank."
            };
        }
        return { isMatch: true };
    }

    if (isBlankOrZeroOrNA(text)) {
        return { isMatch: true };
    }
    const amt = parseRentalAmount(text);
    if (isNaN(amt) || amt < 0) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: "For Subject, 'Furniture' must be a valid amount (0 or greater) or blank."
        };
    }
    return { isMatch: true };
};

export const checkSubjectAdjustedMonthlyRent = (field, text, allData, path, saleName) => {
    if (field !== 'Adjusted Monthly Rent') return null;
    const isSubject = saleName === 'Subject' || (path && path[0] === 'Subject') || (!saleName && !path);
    if (!isSubject) return null;
    if (!is1007Active(allData)) return null;

    const occupant = getSubjectOccupant(allData);
    if (occupant === 'Tenant') {
        const amt = parseRentalAmount(text);
        if (amt === null) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "For Subject, 'Adjusted Monthly Rent' must be present when Occupant is Tenant."
            };
        }
        if (isNaN(amt) || amt <= 0) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "For Subject, 'Adjusted Monthly Rent' must be a valid amount greater than 0."
            };
        }
        return { isMatch: true };
    }

    if (occupant === 'Owner' || occupant === 'Vacant') {
        if (!isBlankOrZeroOrNA(text)) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `For Subject, 'Adjusted Monthly Rent' must be blank or zero when Occupant is ${occupant}.`
            };
        }
        return { isMatch: true };
    }
    return null;
};

const normalizeForCompare = (val) =>
    String(val || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

const parseAdjustmentValue = (adjStr) => {
    if (adjStr === null || adjStr === undefined) return 0;
    const str = String(typeof adjStr === 'object' && adjStr !== null ? (adjStr.value ?? '') : adjStr).trim();
    if (!str) return 0;
    const isNegative = str.includes('-') || /^\s*\(\s*\d+/.test(str);
    const digits = str.replace(/[^0-9.]/g, '');
    const num = parseFloat(digits);
    if (isNaN(num)) return 0;
    return isNegative ? -num : num;
};

/**
 * Validates 'Other (e.g., basement, etc.)' and its Adjustment in the Comparable Rent Schedule (Form 1007).
 * Rule:
 * - If Comp basement is the same as Subject: valid (adjustment should be 0 or blank; non-zero adjustment is flagged).
 * - If Comp basement is NOT the same as Subject: an adjustment is required (0, +, -).
 *   - If adjustment is provided: valid.
 *   - If adjustment is blank/missing: error.
 */
export const checkOtherBasement = (field, text, allData, fieldPath, saleName) => {
    const isDescField =
        field === 'Other (e.g., basement, etc.)' ||
        field === 'Other (e.g., basement)' ||
        field === 'Other (e.g., basement etc.)' ||
        field === 'Other Basement' ||
        field === 'Basement (Other)' ||
        field === 'Other (Basement)';

    const isAdjField =
        field === 'Other (e.g., basement, etc.) Adjustment' ||
        field === 'Other (e.g., basement) Adjustment' ||
        field === 'Other Basement Adjustment' ||
        field === 'Other (e.g., basement, etc.) Adj' ||
        field === 'Other (e.g., basement) Adj' ||
        field === 'Other Basement Adj';

    if (!isDescField && !isAdjField) {
        return null;
    }

    if (!saleName || saleName === 'Subject' || !allData) {
        return null;
    }

    // 1. Get Subject basement value
    const subjRent = allData?.['Single Family Rent Schedule'] ||
        allData?.clean_data?.['Single Family Rent Schedule'] ||
        allData?.['Subject Rent Schedule'] ||
        allData?.clean_data?.['Subject Rent Schedule'] ||
        allData?.Subject ||
        allData?.clean_data?.Subject ||
        {};

    const subjAliases = [
        'Other (e.g., basement, etc.)',
        'Other (e.g., basement)',
        'Other (e.g., basement etc.)',
        'Other Basement',
        'Basement (Other)',
        'Other (Basement)',
        'Basement & Finished Rooms Below Grade'
    ];

    let rawSubjVal = getSubjectRentFieldVal(allData, 'Other (e.g., basement, etc.)');
    if (!rawSubjVal) {
        for (const alias of subjAliases) {
            const val =
                subjRent?.[alias] ??
                allData?.Subject?.[alias] ??
                allData?.clean_data?.Subject?.[alias] ??
                allData?.SALES_GRID?.Subject?.[alias] ??
                allData?.['Sales Grid']?.Subject?.[alias];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
                rawSubjVal = val;
                break;
            }
        }
    }

    const subjectValueStr = String(
        typeof rawSubjVal === 'object' && rawSubjVal !== null ? (rawSubjVal.value ?? '') : rawSubjVal
    ).trim();

    // 2. Identify comp and adj containers
    const rentAliases = [saleName];
    const numMatch = String(saleName).match(/(\d+)/);
    if (numMatch) {
        const n = numMatch[1];
        const nPadded = n.padStart(2, '0');
        rentAliases.push(
            `COMPARABLE NO. ${n}`,
            `COMPARABLE NO ${n}`,
            `COMPARABLE NO. ${nPadded}`,
            `COMPARABLE NO ${nPadded}`,
            `COMPARABLE RENTAL #${n}`,
            `Comparable Rental #${n}`,
            `Comparable Rental No #${n}`,
            `COMPARABLE Rental No #${n}`,
            `Comparable Rental ${n}`,
            `Rental ${n}`,
            `Rental #${n}`,
            `RENTAL_${n}`,
            `RENTAL_${nPadded}`,
            `Comparable ${n}`,
            `Comp ${n}`
        );
    }

    const containers = [
        allData?.['Comparable Rent Schedule'],
        allData?.clean_data?.['Comparable Rent Schedule'],
        allData?.fields?.['Comparable Rent Schedule'],
        allData?.['Comparable Rental Data'],
        allData?.clean_data?.['Comparable Rental Data'],
        allData?.['Single Family Rent Schedule'],
        allData?.clean_data?.['Single Family Rent Schedule'],
        allData?.RENTAL_GRID,
        allData?.fields?.['Comparable Rental Data']
    ];

    let compObj = allData?.[saleName] && typeof allData[saleName] === 'object' ? allData[saleName] : {};
    for (const container of containers) {
        if (container && typeof container === 'object') {
            for (const r of rentAliases) {
                if (container[r] && typeof container[r] === 'object') {
                    compObj = container[r];
                    break;
                }
            }
            if (compObj && Object.keys(compObj).length > 0) break;
        }
    }
    if (!compObj || Object.keys(compObj).length === 0) {
        for (const r of rentAliases) {
            if (allData?.[r] && typeof allData[r] === 'object') {
                compObj = allData[r];
                break;
            }
        }
    }

    let adjObj = compObj;
    const adjContainers = [
        allData?.['Comparable Rent Adjustments'],
        allData?.clean_data?.['Comparable Rent Adjustments']
    ];
    for (const container of adjContainers) {
        if (container && typeof container === 'object') {
            for (const r of rentAliases) {
                if (container[r] && typeof container[r] === 'object') {
                    adjObj = container[r];
                    break;
                }
            }
        }
    }
    for (const r of rentAliases) {
        if (allData?.[`${r} Adjustments`] && typeof allData[`${r} Adjustments`] === 'object') {
            adjObj = allData[`${r} Adjustments`];
            break;
        }
    }

    // 3. Extract Comp basement description
    const descAliases = [
        'Other (e.g., basement, etc.)',
        'Other (e.g., basement)',
        'Other (e.g., basement etc.)',
        'Other Basement',
        'Basement (Other)',
        'Other (Basement)',
        'Basement & Finished Rooms Below Grade'
    ];

    let rawCompVal = '';
    if (isDescField && text !== undefined && text !== null) {
        rawCompVal = typeof text === 'object' ? (text.value ?? '') : text;
    } else {
        for (const alias of descAliases) {
            if (compObj[alias] !== undefined && compObj[alias] !== null && String(compObj[alias]).trim() !== '') {
                rawCompVal = compObj[alias];
                break;
            }
        }
    }
    const comparableValueStr = String(
        typeof rawCompVal === 'object' && rawCompVal !== null ? (rawCompVal.value ?? '') : rawCompVal
    ).trim();

    // 4. Extract Comp basement adjustment
    const adjAliases = [
        'Other (e.g., basement, etc.) Adjustment',
        'Other (e.g., basement) Adjustment',
        'Other Basement Adjustment',
        'Other (e.g., basement, etc.) Adj',
        'Other (e.g., basement) Adj',
        'Other Basement Adj'
    ];

    let rawAdjVal = '';
    if (isAdjField && text !== undefined && text !== null) {
        rawAdjVal = typeof text === 'object' ? (text.value ?? '') : text;
    } else {
        for (const alias of adjAliases) {
            const val = adjObj?.[alias] ?? compObj?.[alias];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
                rawAdjVal = val;
                break;
            }
        }
    }
    const adjStr = String(
        typeof rawAdjVal === 'object' && rawAdjVal !== null ? (rawAdjVal.value ?? '') : rawAdjVal
    ).trim();

    // 5. Compare Subject and Comp
    const normSubj = normalizeForCompare(subjectValueStr);
    const normComp = normalizeForCompare(comparableValueStr);

    if (!normSubj && !normComp) {
        return null;
    }

    // Same basement description: valid (adjustment should be 0 or blank)
    if (normSubj === normComp) {
        if (adjStr !== '' && adjStr !== '0' && adjStr !== '$0' && parseAdjustmentValue(adjStr) !== 0) {
            return {
                isError: true,
                message: `Other (e.g., basement, etc.) is the same as Subject (${subjectValueStr}), but adjustment is not $0.`
            };
        }
        return { isMatch: true };
    }

    // Different basement description: adjustment is required (0, -, +)
    if (adjStr === '') {
        return {
            isError: true,
            message: `Other (e.g., basement, etc.) mismatch (Subject: '${subjectValueStr || 'None'}', Comp: '${comparableValueStr || 'None'}'). An adjustment is required (0, +, -).`
        };
    }

    return {
        isMatch: true,
        message: `Other (e.g., basement, etc.) differs from Subject; adjustment provided (${adjStr}).`
    };
};

export const checkRentOtherBasementAdjustment = checkOtherBasement;

const parseAreaToSqFt = (areaStr) => {
    if (areaStr === null || areaStr === undefined) return NaN;
    const str = String(typeof areaStr === 'object' && areaStr !== null ? (areaStr.value ?? '') : areaStr).trim();
    if (!str) return NaN;
    const cleaned = str.replace(/,/g, '').replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? NaN : num;
};

const extractConditionRating = (condStr) => {
    if (!condStr) return '';
    const str = String(typeof condStr === 'object' && condStr !== null ? (condStr.value ?? '') : condStr).trim();
    const match = str.match(/\b(C[1-6])\b/i);
    if (match) return match[1].toUpperCase();
    return normalizeForCompare(str);
};

/**
 * Validates consistency for Form Type 1004 + 1007:
 * The Subject's 'Design and Appeal' in the Comparable Rent Schedule (rental grid)
 * must match with 'Design (Style)' from the Improvements section (and Sales Comparison Approach).
 */
export const checkRentSubjectDesignStyleConsistency = (field, text, allData, fieldPath, saleName, formType) => {
    const isDesignField = field === 'Design and Appeal' || field === 'Design & Appeal' || field === 'Design (Style)';
    if (!isDesignField) return null;

    // Only validate the Subject property in the rent schedule
    if (saleName && saleName !== 'Subject') return null;
    if (!allData) return null;

    // Only active when 1007 form or 1004+1007 form is detected
    if (!is1007Active(allData, formType) && !is1004And1007Form(allData, formType)) return null;

    // 1. Get Subject Design & Appeal from Rental Grid
    const isRentSubjectField = saleName === 'Subject' && (
        field === 'Design and Appeal' ||
        field === 'Design & Appeal' ||
        (fieldPath && fieldPath[0] === 'Subject' && (fieldPath[1] === 'Design and Appeal' || fieldPath[1] === 'Design & Appeal'))
    );

    let rentRaw = isRentSubjectField && text !== undefined && text !== null
        ? String(typeof text === 'object' ? (text.value ?? '') : text).trim()
        : String(
            getSubjectRentFieldVal(allData, 'Design and Appeal') ||
            allData['Single Family Rent Schedule']?.['Design and Appeal'] ||
            allData['Subject Rent Schedule']?.['Design and Appeal'] ||
            allData.Subject?.['Design and Appeal'] ||
            allData.clean_data?.['Single Family Rent Schedule']?.['Design and Appeal'] ||
            allData.clean_data?.['Subject Rent Schedule']?.['Design and Appeal'] ||
            allData.clean_data?.Subject?.['Design and Appeal'] ||
            ''
        ).trim();

    // 2. Get Improvements Design (Style)
    const isImprovementsField = fieldPath && (fieldPath[0] === 'IMPROVEMENTS' || fieldPath[0] === 'Improvements');
    let impRaw = isImprovementsField && text !== undefined && text !== null
        ? String(typeof text === 'object' ? (text.value ?? '') : text).trim()
        : String(
            allData.IMPROVEMENTS?.['Design (Style)'] ||
            allData.Improvements?.['Design (Style)'] ||
            allData.clean_data?.IMPROVEMENTS?.['Design (Style)'] ||
            allData.clean_data?.Improvements?.['Design (Style)'] ||
            allData['Design (Style)'] ||
            ''
        ).trim();

    // 3. Get Sales Grid Subject Design (Style) as fallback target
    const isSalesGridField = fieldPath && fieldPath[0] === 'Subject' && field === 'Design (Style)';
    let salesGridRaw = isSalesGridField && text !== undefined && text !== null
        ? String(typeof text === 'object' ? (text.value ?? '') : text).trim()
        : String(
            allData.SALES_GRID?.Subject?.['Design (Style)'] ||
            allData['Sales Grid']?.Subject?.['Design (Style)'] ||
            allData.SALES_GRID?.SUBJECT?.['Design (Style)'] ||
            allData['Sales Grid']?.SUBJECT?.['Design (Style)'] ||
            allData.Subject?.['Design (Style)'] ||
            allData.clean_data?.Subject?.['Design (Style)'] ||
            allData.comparisonData?.Subject?.['Design (Style)'] ||
            ''
        ).trim();

    // If either value is blank, let blank checks handle it
    if (!rentRaw) return null;
    const targetRaw = impRaw || salesGridRaw;
    const targetSource = impRaw ? 'Improvements section' : 'Sales Comparison Grid (Subject)';
    if (!targetRaw) return null;

    // Parse out any UAD prefixes (e.g. "DT1;R Ranch" -> "R Ranch")
    const rentParsed = parseDesignStyle(rentRaw);
    const targetParsed = parseDesignStyle(targetRaw);

    const rentNorm = normalizeForCompare(rentParsed.style);
    const targetNorm = normalizeForCompare(targetParsed.style);

    if (!rentNorm || !targetNorm) return null;

    const isExactMatch = rentNorm === targetNorm;
    const isSubstringMatch = rentNorm.includes(targetNorm) || targetNorm.includes(rentNorm);
    const isAbbrMatch = (
        (rentNorm.includes('rranch') && targetNorm.includes('raisedranch')) ||
        (targetNorm.includes('rranch') && rentNorm.includes('raisedranch')) ||
        (rentNorm.includes('splitlvl') && targetNorm.includes('splitlevel')) ||
        (targetNorm.includes('splitlvl') && rentNorm.includes('splitlevel')) ||
        (rentNorm.includes('contemp') && targetNorm.includes('contemporary')) ||
        (targetNorm.includes('contemp') && rentNorm.includes('contemporary')) ||
        (rentNorm.includes('trad') && targetNorm.includes('traditional')) ||
        (targetNorm.includes('trad') && rentNorm.includes('traditional')) ||
        (rentNorm.includes('col') && targetNorm.includes('colonial')) ||
        (targetNorm.includes('col') && rentNorm.includes('colonial'))
    );

    if (!isExactMatch && !isSubstringMatch && !isAbbrMatch) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Design mismatch: ${targetSource} indicates '${targetRaw}', but Rental Grid (Subject) indicates '${rentRaw}'. Please reconcile and revise.`
        };
    }

    return { isMatch: true, message: "validated" };
};

/**
 * Validates that for comparable rentals in the 1007 Rental Grid,
 * if 'Design and Appeal' differs from the Subject's 'Design and Appeal',
 * an adjustment is required in 'Design and Appeal Adjustment'.
 */
export const checkRentDesignAppealAdjustment = (field, text, allData, fieldPath, rentName) => {
    const isDesignField = field === 'Design and Appeal' || field === 'Design & Appeal';
    const isAdjField = field === 'Design and Appeal Adjustment' || field === 'Design & Appeal Adjustment';
    if (!isDesignField && !isAdjField) return null;

    if (!rentName || rentName === 'Subject') return null;
    if (!allData) return null;

    // Get Subject Design from Rental Grid or Improvements / Sales Grid
    const subjectDesign = String(
        getSubjectRentFieldVal(allData, 'Design and Appeal') ||
        allData['Single Family Rent Schedule']?.['Design and Appeal'] ||
        allData['Subject Rent Schedule']?.['Design and Appeal'] ||
        allData.Subject?.['Design and Appeal'] ||
        allData.IMPROVEMENTS?.['Design (Style)'] ||
        allData.Subject?.['Design (Style)'] ||
        ''
    ).trim();

    // Get Comp Design from the comparable rent entry
    const compObj = allData[rentName] ||
        allData['Comparable Rental Data']?.[rentName] ||
        allData.clean_data?.['Comparable Rental Data']?.[rentName] ||
        {};
    const compDesign = String(
        (isDesignField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : compObj['Design and Appeal']) ||
        compObj['Design & Appeal'] ||
        compObj['Design (Style)'] ||
        ''
    ).trim();

    // Get Adjustment
    const adjObj = allData[rentName] ||
        allData['Comparable Rent Adjustments']?.[rentName] ||
        allData[`${rentName} Adjustments`] ||
        compObj;
    const adjustmentText = String(
        (isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : adjObj['Design and Appeal Adjustment']) ||
        adjObj['Design and Appeal Adj'] ||
        adjObj['Design & Appeal Adjustment'] ||
        ''
    ).trim();

    if (subjectDesign && compDesign) {
        const subjParsed = parseDesignStyle(subjectDesign);
        const compParsed = parseDesignStyle(compDesign);

        const subjNorm = normalizeForCompare(subjParsed.style);
        const compNorm = normalizeForCompare(compParsed.style);

        if (subjNorm && compNorm) {
            const isMatch = subjNorm === compNorm ||
                subjNorm.includes(compNorm) || compNorm.includes(subjNorm) ||
                ((subjNorm.includes('rranch') && compNorm.includes('raisedranch')) || (compNorm.includes('rranch') && subjNorm.includes('raisedranch'))) ||
                ((subjNorm.includes('splitlvl') && compNorm.includes('splitlevel')) || (compNorm.includes('splitlvl') && subjNorm.includes('splitlevel')));

            const designsAreDifferent = !isMatch;
            const adjustmentIsPresent = adjustmentText !== '';

            if (designsAreDifferent && !adjustmentIsPresent) {
                return {
                    isError: true,
                    message: `Design/Appeal mismatch (Subject: '${subjectDesign}', Comp: '${compDesign}'). An adjustment is required, even if $0.`
                };
            }
        }
    }

    return { isMatch: true };
};

/**
 * Validates consistency for Subject 'Location/View' in the 1007 Rental Grid
 * against the Subject's Location and View from Sales Comparison Grid (and Site/Neighborhood).
 */
export const checkRentSubjectLocationViewConsistency = (field, text, allData, fieldPath, saleName, formType) => {
    const isLocViewField = field === 'Location/View' || field === 'Location / View' || field === 'Location' || field === 'View';
    if (!isLocViewField) return null;
    if (saleName && saleName !== 'Subject') return null;
    if (!allData) return null;
    if (!is1007Active(allData, formType) && !is1004And1007Form(allData, formType)) return null;

    const rentRaw = String(
        (text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : '') ||
        getSubjectRentFieldVal(allData, 'Location/View') ||
        allData?.Subject?.['Location/View'] ||
        ''
    ).trim();

    if (!rentRaw) return null;

    const salesLoc = String(
        allData.SALES_GRID?.Subject?.['Location'] ||
        allData['Sales Grid']?.Subject?.['Location'] ||
        allData.Subject?.['Location'] ||
        allData.clean_data?.Subject?.['Location'] ||
        allData.NEIGHBORHOOD?.['Location'] ||
        ''
    ).trim();

    const salesView = String(
        allData.SALES_GRID?.Subject?.['View'] ||
        allData['Sales Grid']?.Subject?.['View'] ||
        allData.Subject?.['View'] ||
        allData.clean_data?.Subject?.['View'] ||
        allData.SITE?.['View'] ||
        ''
    ).trim();

    if (!salesLoc && !salesView) {
        return { isMatch: true, message: "validated" };
    }

    const normRent = normalizeForCompare(rentRaw);
    const normLoc = normalizeForCompare(salesLoc);
    const normView = normalizeForCompare(salesView);

    const locMatches = !normLoc || normRent.includes(normLoc) || normLoc.includes(normRent);
    const viewMatches = !normView || normRent.includes(normView) || normView.includes(normRent);

    if (locMatches && viewMatches) {
        return { isMatch: true, message: "validated" };
    }

    const checkTokensMatch = (source, target) => {
        if (!source || !target) return true;
        const tokens = source.split(/[\s;/\\]+/).map(t => normalizeForCompare(t)).filter(Boolean);
        if (tokens.length === 0) return true;
        return tokens.every(token => target.includes(token));
    };

    if (checkTokensMatch(salesLoc, normRent) && checkTokensMatch(salesView, normRent)) {
        return { isMatch: true, message: "validated" };
    }

    return {
        isError: true,
        skipBlankFilter: true,
        message: `Location/View mismatch: Sales Comparison indicates Location '${salesLoc || 'N/A'}' and View '${salesView || 'N/A'}', but Rental Grid indicates '${rentRaw}'. Please reconcile and revise.`
    };
};

/**
 * Validates Comparable Rentals 'Location/View Adjustment' in the 1007 Rental Grid.
 */
export const checkRentLocationViewAdjustment = (field, text, allData, fieldPath, rentName) => {
    const isField = field === 'Location/View' || field === 'Location / View' || field === 'Location/View Adjustment' || field === 'Location / View Adjustment';
    if (!isField || !rentName || rentName === 'Subject' || !allData) return null;

    const isAdjField = field.includes('Adjustment');
    const subjVal = String(
        getSubjectRentFieldVal(allData, 'Location/View') ||
        allData.SALES_GRID?.Subject?.['Location'] ||
        allData.Subject?.['Location/View'] ||
        allData.Subject?.['Location'] ||
        ''
    ).trim();

    const compObj = allData[rentName] ||
        allData['Comparable Rental Data']?.[rentName] ||
        allData.clean_data?.['Comparable Rental Data']?.[rentName] ||
        {};
    const compVal = String(
        (!isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : compObj['Location/View']) ||
        compObj['Location / View'] ||
        compObj['Location'] ||
        ''
    ).trim();

    const adjObj = allData[rentName] ||
        allData['Comparable Rent Adjustments']?.[rentName] ||
        allData[`${rentName} Adjustments`] ||
        compObj;
    const adjStr = String(
        (isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : adjObj['Location/View Adjustment']) ||
        adjObj['Location / View Adjustment'] ||
        adjObj['Location Adjustment'] ||
        ''
    ).trim();

    if (subjVal && compVal) {
        const normSubj = normalizeForCompare(subjVal);
        const normComp = normalizeForCompare(compVal);

        if (normSubj !== normComp) {
            if (adjStr === '') {
                return {
                    isError: true,
                    message: `Location/View mismatch (Subject: '${subjVal}', Comp: '${compVal}'). An adjustment is required, even if $0.`
                };
            }
        } else {
            if (adjStr !== '' && adjStr !== '0' && adjStr !== '$0' && parseAdjustmentValue(adjStr) !== 0) {
                return {
                    isError: true,
                    message: `Location/View is the same (${subjVal}), but adjustment is not $0.`
                };
            }
        }
    }

    return { isMatch: true };
};

/**
 * Validates consistency for Subject 'Age' in the 1007 Rental Grid
 * against Sales Grid Subject 'Actual Age' and Improvements 'Year Built'.
 */
export const checkRentSubjectAgeConsistency = (field, text, allData, fieldPath, saleName, formType) => {
    const isAgeField = field === 'Age' || field === 'Actual Age';
    if (!isAgeField) return null;
    if (saleName && saleName !== 'Subject') return null;
    if (!allData) return null;
    if (!is1007Active(allData, formType) && !is1004And1007Form(allData, formType)) return null;

    const rentAgeStr = String(
        (text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : '') ||
        getSubjectRentFieldVal(allData, 'Age') ||
        allData?.Subject?.['Age'] ||
        allData?.Subject?.['Actual Age'] ||
        ''
    ).trim();

    if (!rentAgeStr) return null;

    let rentAge = parseInt(rentAgeStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(rentAge) && rentAgeStr.toLowerCase().includes('new')) {
        rentAge = 0;
    }
    if (isNaN(rentAge)) return null;

    const salesAgeStr = String(
        allData.SALES_GRID?.Subject?.['Actual Age'] ||
        allData['Sales Grid']?.Subject?.['Actual Age'] ||
        allData.SALES_GRID?.Subject?.['Age'] ||
        allData['Sales Grid']?.Subject?.['Age'] ||
        allData.Subject?.['Actual Age'] ||
        allData.Subject?.['Age'] ||
        allData.clean_data?.Subject?.['Actual Age'] ||
        ''
    ).trim();
    let salesAge = parseInt(salesAgeStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(salesAge) && salesAgeStr.toLowerCase().includes('new')) {
        salesAge = 0;
    }

    const yearBuiltStr = String(
        allData.IMPROVEMENTS?.['Year Built'] ||
        allData.Improvements?.['Year Built'] ||
        allData['Year Built'] ||
        allData.Subject?.['Year Built'] ||
        ''
    ).trim();
    const yearBuilt = parseInt(yearBuiltStr.replace(/[^0-9]/g, ''), 10);

    let currentYear = new Date().getFullYear();
    const effectiveDateStr = String(
        allData.CERTIFICATION?.['Effective Date of Appraisal'] ||
        allData['Effective Date of Appraisal'] ||
        allData['Effective Date'] ||
        ''
    ).trim();
    if (effectiveDateStr) {
        const ym = effectiveDateStr.match(/\b(19\d\d|20\d\d)\b/);
        if (ym) currentYear = parseInt(ym[1], 10);
    }

    if (!isNaN(salesAge)) {
        if (rentAge === salesAge) {
            return { isMatch: true, message: "validated" };
        }
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Subject Age (${rentAgeStr}) in Rental Grid does not match Sales Grid Subject Actual Age (${salesAgeStr}). Please reconcile and revise.`
        };
    }

    if (!isNaN(yearBuilt)) {
        const calculatedAge = currentYear - yearBuilt;
        if (Math.abs(calculatedAge - rentAge) <= 1) {
            return { isMatch: true, message: "validated" };
        }
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Subject Age (${rentAgeStr}) in Rental Grid does not match Year Built (${yearBuiltStr}, expected ~${calculatedAge}). Please reconcile and revise.`
        };
    }

    return { isMatch: true, message: "validated" };
};

/**
 * Validates Comparable Rentals 'Age Adjustment' in the 1007 Rental Grid.
 */
export const checkRentAgeAdjustment = (field, text, allData, fieldPath, rentName) => {
    const isField = field === 'Age' || field === 'Age Adjustment' || field === 'Actual Age' || field === 'Actual Age Adjustment';
    if (!isField || !rentName || rentName === 'Subject' || !allData) return null;

    const isAdjField = field.includes('Adjustment');
    const subjVal = String(
        getSubjectRentFieldVal(allData, 'Age') ||
        allData.SALES_GRID?.Subject?.['Actual Age'] ||
        allData.Subject?.['Age'] ||
        allData.Subject?.['Actual Age'] ||
        ''
    ).trim();

    const compObj = allData['Comparable Rental Data']?.[rentName] ||
        allData.clean_data?.['Comparable Rental Data']?.[rentName] ||
        allData['Single Family Rent Schedule']?.[rentName] ||
        allData[rentName] ||
        {};
    const compVal = String(
        (!isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : compObj['Age']) ||
        compObj['Actual Age'] ||
        ''
    ).trim();

    const adjObj = allData['Comparable Rental Data']?.[rentName] ||
        allData.clean_data?.['Comparable Rental Data']?.[rentName] ||
        allData['Comparable Rent Adjustments']?.[rentName] ||
        allData[`${rentName} Adjustments`] ||
        allData[rentName] ||
        compObj;
    const adjStr = String(
        (isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : adjObj['Age Adjustment']) ||
        adjObj['Actual Age Adjustment'] ||
        adjObj['Age Adj'] ||
        adjObj['Age/Condition Adjustment'] ||
        adjObj['Age / Condition Adjustment'] ||
        ''
    ).trim();

    if (subjVal && compVal) {
        let subjAge = parseInt(subjVal.replace(/[^0-9]/g, ''), 10);
        let compAge = parseInt(compVal.replace(/[^0-9]/g, ''), 10);
        if (isNaN(subjAge) && subjVal.toLowerCase().includes('new')) subjAge = 0;
        if (isNaN(compAge) && compVal.toLowerCase().includes('new')) compAge = 0;

        if (!isNaN(subjAge) && !isNaN(compAge)) {
            if (subjAge !== compAge) {
                if (adjStr === '') {
                    return {
                        isError: true,
                        message: `Age mismatch (Subject: '${subjVal}', Comp: '${compVal}'). An adjustment is required, even if $0.`
                    };
                }
            } else {
                if (adjStr !== '' && adjStr !== '0' && adjStr !== '$0' && parseAdjustmentValue(adjStr) !== 0) {
                    return {
                        isError: true,
                        message: `Age is the same (${subjVal}), but adjustment is not $0.`
                    };
                }
            }
        }
    }

    return { isMatch: true };
};

/**
 * Validates consistency for Subject 'Condition' in the 1007 Rental Grid
 * against Sales Grid Subject 'Condition' and Improvements Condition.
 */
export const checkRentSubjectConditionConsistency = (field, text, allData, fieldPath, saleName, formType) => {
    if (field !== 'Condition') return null;
    if (saleName && saleName !== 'Subject') return null;
    if (!allData) return null;
    if (!is1007Active(allData, formType) && !is1004And1007Form(allData, formType)) return null;

    const rentCondStr = String(
        (text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : '') ||
        getSubjectRentFieldVal(allData, 'Condition') ||
        allData?.Subject?.['Condition'] ||
        ''
    ).trim();

    if (!rentCondStr) return null;

    const salesCondStr = String(
        allData.SALES_GRID?.Subject?.['Condition'] ||
        allData['Sales Grid']?.Subject?.['Condition'] ||
        allData.Subject?.['Condition'] ||
        allData.clean_data?.Subject?.['Condition'] ||
        ''
    ).trim();

    const impCondStr = String(
        allData.IMPROVEMENTS?.['Overall Condition'] ||
        allData.IMPROVEMENTS?.['Describe the condition of the property'] ||
        allData.Improvements?.['Overall Condition'] ||
        ''
    ).trim();

    const rentRating = extractConditionRating(rentCondStr);
    const targetRating = extractConditionRating(salesCondStr || impCondStr);

    if (targetRating) {
        if (rentRating === targetRating) {
            return { isMatch: true, message: "validated" };
        }
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Condition mismatch: Sales Grid/Improvements indicates '${salesCondStr || impCondStr}', but Rental Grid indicates '${rentCondStr}'. Please reconcile and revise.`
        };
    }

    if (rentRating) {
        return { isMatch: true, message: "validated" };
    }
    return null;
};

/**
 * Validates Comparable Rentals 'Condition Adjustment' in the 1007 Rental Grid.
 */
export const checkRentConditionAdjustment = (field, text, allData, fieldPath, rentName) => {
    const isField = field === 'Condition' || field === 'Condition Adjustment';
    if (!isField || !rentName || rentName === 'Subject' || !allData) return null;

    const isAdjField = field === 'Condition Adjustment';
    const subjVal = String(
        getSubjectRentFieldVal(allData, 'Condition') ||
        allData.SALES_GRID?.Subject?.['Condition'] ||
        allData.Subject?.['Condition'] ||
        ''
    ).trim();

    const compObj = allData['Comparable Rental Data']?.[rentName] ||
        allData.clean_data?.['Comparable Rental Data']?.[rentName] ||
        allData['Single Family Rent Schedule']?.[rentName] ||
        allData[rentName] ||
        {};
    const compVal = String(
        (!isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : compObj['Condition']) ||
        ''
    ).trim();

    const adjObj = allData['Comparable Rental Data']?.[rentName] ||
        allData.clean_data?.['Comparable Rental Data']?.[rentName] ||
        allData['Comparable Rent Adjustments']?.[rentName] ||
        allData[`${rentName} Adjustments`] ||
        allData[rentName] ||
        compObj;
    const adjStr = String(
        (isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : adjObj['Condition Adjustment']) ||
        adjObj['Condition Adj'] ||
        adjObj['Age/Condition Adjustment'] ||
        adjObj['Age / Condition Adjustment'] ||
        ''
    ).trim();

    if (subjVal && compVal) {
        const subjRating = extractConditionRating(subjVal);
        const compRating = extractConditionRating(compVal);

        if (subjRating && compRating) {
            if (subjRating !== compRating) {
                if (adjStr === '') {
                    return {
                        isError: true,
                        message: `Condition mismatch (Subject: '${subjVal}', Comp: '${compVal}'). An adjustment is required, even if $0.`
                    };
                }
            } else {
                if (adjStr !== '' && adjStr !== '0' && adjStr !== '$0' && parseAdjustmentValue(adjStr) !== 0) {
                    return {
                        isError: true,
                        message: `Condition is the same (${subjVal}), but adjustment is not $0.`
                    };
                }
            }
        }
    }

    return { isMatch: true };
};

/**
 * Validates consistency for Subject 'Room Count Total', 'Room Count Bdrms', and 'Room Count Baths'
 * in the 1007 Rental Grid against Sales Grid Subject and Improvements room counts.
 */
export const checkRentSubjectRoomCountConsistency = (field, text, allData, fieldPath, saleName, formType) => {
    const isRoomField = field === 'Room Count Total' || field === 'Room Count Bdrms' || field === 'Room Count Baths' || field === 'Above Grade Room Count';
    if (!isRoomField) return null;
    if (saleName && saleName !== 'Subject') return null;
    if (!allData) return null;
    if (!is1007Active(allData, formType) && !is1004And1007Form(allData, formType)) return null;

    const valStr = String(
        (text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : '') ||
        getSubjectRentFieldVal(allData, field) ||
        allData?.Subject?.[field] ||
        ''
    ).trim();

    if (!valStr) return null;

    if (field === 'Room Count Total') {
        const rentNum = parseInt(valStr.replace(/[^0-9]/g, ''), 10);
        const targetVal = String(
            allData.SALES_GRID?.Subject?.['Total'] ||
            allData.SALES_GRID?.Subject?.['Total Rooms'] ||
            allData.Subject?.['Total Rooms'] ||
            allData.Subject?.['Total'] ||
            allData.IMPROVEMENTS?.['Finished area above grade Rooms'] ||
            allData.Improvements?.['Finished area above grade Rooms'] ||
            ''
        ).trim();
        const targetNum = parseInt(targetVal.replace(/[^0-9]/g, ''), 10);

        if (!isNaN(rentNum) && !isNaN(targetNum)) {
            if (rentNum === targetNum) {
                return { isMatch: true, message: "validated" };
            }
            return {
                isError: true,
                skipBlankFilter: true,
                message: `Total room count mismatch: Sales Grid/Improvements indicates '${targetVal}', but Rental Grid indicates '${valStr}'. Please reconcile and revise.`
            };
        }
        if (!isNaN(rentNum)) return { isMatch: true, message: "validated" };
    }

    if (field === 'Room Count Bdrms') {
        const rentNum = parseInt(valStr.replace(/[^0-9]/g, ''), 10);
        const targetVal = String(
            allData.SALES_GRID?.Subject?.['Bedrooms'] ||
            allData.SALES_GRID?.Subject?.['Bdrms'] ||
            allData.Subject?.['Bedrooms'] ||
            allData.Subject?.['Bdrms'] ||
            allData.IMPROVEMENTS?.['Finished area above grade Bedrooms'] ||
            allData.Improvements?.['Finished area above grade Bedrooms'] ||
            ''
        ).trim();
        const targetNum = parseInt(targetVal.replace(/[^0-9]/g, ''), 10);

        if (!isNaN(rentNum) && !isNaN(targetNum)) {
            if (rentNum === targetNum) {
                return { isMatch: true, message: "validated" };
            }
            return {
                isError: true,
                skipBlankFilter: true,
                message: `bath count mismatch: Sales Grid/Improvements indicates '${targetVal}', but Rental Grid indicates '${valStr}'. Please reconcile and revise.`
            };
        }
        if (!isNaN(rentNum)) return { isMatch: true, message: "validated" };
    }

    if (field === 'Room Count Baths') {
        const rentNum = parseFloat(valStr.replace(/[^0-9.]/g, ''));
        const targetVal = String(
            allData.SALES_GRID?.Subject?.['Baths'] ||
            allData.Subject?.['Baths'] ||
            allData.IMPROVEMENTS?.['Finished area above grade Bath(s)'] ||
            allData.Improvements?.['Finished area above grade Bath(s)'] ||
            ''
        ).trim();
        const targetNum = parseFloat(targetVal.replace(/[^0-9.]/g, ''));

        if (!isNaN(rentNum) && !isNaN(targetNum)) {
            if (rentNum === targetNum) {
                return { isMatch: true, message: "validated" };
            }
            return {
                isError: true,
                skipBlankFilter: true,
                message: `Bathroom count mismatch: Sales Grid/Improvements indicates '${targetVal}', but Rental Grid indicates '${valStr}'. Please reconcile and revise.`
            };
        }
        if (!isNaN(rentNum)) return { isMatch: true, message: "validated" };
    }

    return { isMatch: true, message: "validated" };
};

/**
 * Validates Comparable Rentals 'Room Count Total Adjustment' in the 1007 Rental Grid.
 */
export const checkRentRoomCountAdjustment = (field, text, allData, fieldPath, rentName) => {
    const isField = field === 'Room Count Total Adjustment' || field === 'Room Count Total' || field === 'Room Count Bdrms' || field === 'Room Count Baths';
    if (!isField || !rentName || rentName === 'Subject' || !allData) return null;

    const isAdjField = field === 'Room Count Total Adjustment';

    const subjBdrms = parseInt(String(getSubjectRentFieldVal(allData, 'Room Count Bdrms') || allData.SALES_GRID?.Subject?.['Bedrooms'] || allData.Subject?.['Bedrooms'] || '0').replace(/[^0-9]/g, ''), 10);
    const subjBaths = parseFloat(String(getSubjectRentFieldVal(allData, 'Room Count Baths') || allData.SALES_GRID?.Subject?.['Baths'] || allData.Subject?.['Baths'] || '0').replace(/[^0-9.]/g, ''));
    const subjTotal = parseInt(String(getSubjectRentFieldVal(allData, 'Room Count Total') || allData.SALES_GRID?.Subject?.['Total'] || allData.Subject?.['Total Rooms'] || '0').replace(/[^0-9]/g, ''), 10);

    const compObj = allData[rentName] ||
        allData['Comparable Rental Data']?.[rentName] ||
        allData.clean_data?.['Comparable Rental Data']?.[rentName] ||
        {};

    let compBdrms = parseInt(String(compObj['Room Count Bdrms'] || compObj['Bedrooms'] || '0').replace(/[^0-9]/g, ''), 10);
    let compBaths = parseFloat(String(compObj['Room Count Baths'] || compObj['Baths'] || '0').replace(/[^0-9.]/g, ''));
    let compTotal = parseInt(String(compObj['Room Count Total'] || compObj['Total Rooms'] || '0').replace(/[^0-9]/g, ''), 10);

    if (text !== undefined && text !== null && !isAdjField) {
        const num = parseFloat(String(typeof text === 'object' ? (text.value ?? '') : text).replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
            if (field === 'Room Count Bdrms') compBdrms = num;
            if (field === 'Room Count Baths') compBaths = num;
            if (field === 'Room Count Total') compTotal = num;
        }
    }

    const adjObj = allData[rentName] ||
        allData['Comparable Rent Adjustments']?.[rentName] ||
        allData[`${rentName} Adjustments`] ||
        compObj;
    const adjStr = String(
        (isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : adjObj['Room Count Total Adjustment']) ||
        adjObj['Room Count Adjustment'] ||
        ''
    ).trim();

    if (subjTotal > 0 && compTotal > 0) {
        const countsDiffer = compBdrms !== subjBdrms || compBaths !== subjBaths || compTotal !== subjTotal;
        if (countsDiffer) {
            if (adjStr === '') {
                return {
                    isError: true,
                    message: `Bath count mismatch (Subject: ${subjTotal}/${subjBdrms}/${subjBaths}, Comp: ${compTotal}/${compBdrms}/${compBaths}). An adjustment is required, even if $0.`
                };
            }
            const adjVal = parseAdjustmentValue(adjStr);
            if (compBaths > subjBaths && adjVal > 0) {
                return {
                    isError: true,
                    message: `Warning: Comp has more bath (${compBaths}) than Subject (${subjBaths}), so a negative adjustment is expected.`
                };
            }
            if (compBaths < subjBaths && adjVal < 0) {
                return {
                    isError: true,
                    message: `Warning: Comp has fewer barth (${compBaths}) than Subject (${subjBaths}), so a positive adjustment is expected.`
                };
            }
        } else {
            if (adjStr !== '' && adjStr !== '0' && adjStr !== '$0' && parseAdjustmentValue(adjStr) !== 0) {
                return {
                    isError: true,
                    message: `count is the same, but adjustment is not $0.`
                };
            }
        }
    }

    return { isMatch: true };
};

/**
 * Validates consistency for Subject 'Gross Living Area' in the 1007 Rental Grid
 * against Sales Grid Subject GLA and Improvements GLA.
 */
export const checkRentSubjectGrossLivingAreaConsistency = (field, text, allData, fieldPath, saleName, formType) => {
    if (field !== 'Gross Living Area' && field !== 'GLA') return null;
    if (saleName && saleName !== 'Subject') return null;
    if (!allData) return null;
    if (!is1007Active(allData, formType) && !is1004And1007Form(allData, formType)) return null;

    const rentGlaStr = String(
        (text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : '') ||
        getSubjectRentFieldVal(allData, 'Gross Living Area') ||
        allData?.Subject?.['Gross Living Area'] ||
        ''
    ).trim();

    if (!rentGlaStr) return null;
    const rentGla = parseAreaToSqFt(rentGlaStr);
    if (isNaN(rentGla)) return null;

    const salesGlaStr = String(
        allData.SALES_GRID?.Subject?.['Gross Living Area'] ||
        allData['Sales Grid']?.Subject?.['Gross Living Area'] ||
        allData.Subject?.['Gross Living Area'] ||
        allData.clean_data?.Subject?.['Gross Living Area'] ||
        ''
    ).trim();

    const impGlaStr = String(
        allData.IMPROVEMENTS?.['Square Feet of Gross Living Area Above Grade'] ||
        allData.Improvements?.['Square Feet of Gross Living Area Above Grade'] ||
        ''
    ).trim();

    const targetGla = parseAreaToSqFt(salesGlaStr || impGlaStr);

    if (!isNaN(targetGla)) {
        if (rentGla === targetGla) {
            return { isMatch: true, message: "validated" };
        }
        return {
            isError: true,
            skipBlankFilter: true,
            message: `GLA mismatch: Sales Grid/Improvements indicates '${salesGlaStr || impGlaStr}', but Rental Grid indicates '${rentGlaStr}'. Please reconcile and revise.`
        };
    }

    return { isMatch: true, message: "validated" };
};

/**
 * Validates Comparable Rentals 'Gross Living Area Adjustment' in the 1007 Rental Grid.
 */
export const checkRentGrossLivingAreaAdjustment = (field, text, allData, fieldPath, rentName) => {
    const isField = field === 'Gross Living Area' || field === 'Gross Living Area Adjustment' || field === 'GLA' || field === 'GLA Adjustment';
    if (!isField || !rentName || rentName === 'Subject' || !allData) return null;

    const isAdjField = field.includes('Adjustment');
    const subjVal = String(
        getSubjectRentFieldVal(allData, 'Gross Living Area') ||
        allData.SALES_GRID?.Subject?.['Gross Living Area'] ||
        allData.Subject?.['Gross Living Area'] ||
        ''
    ).trim();

    const compObj = allData[rentName] ||
        allData['Comparable Rental Data']?.[rentName] ||
        allData.clean_data?.['Comparable Rental Data']?.[rentName] ||
        {};
    const compVal = String(
        (!isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : compObj['Gross Living Area']) ||
        ''
    ).trim();

    const adjObj = allData[rentName] ||
        allData['Comparable Rent Adjustments']?.[rentName] ||
        allData[`${rentName} Adjustments`] ||
        compObj;
    const adjStr = String(
        (isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : adjObj['Gross Living Area Adjustment']) ||
        adjObj['Gross Living Area Adj'] ||
        adjObj['GLA Adjustment'] ||
        ''
    ).trim();

    const subjGla = parseAreaToSqFt(subjVal);
    const compGla = parseAreaToSqFt(compVal);

    if (!isNaN(subjGla) && !isNaN(compGla)) {
        if (adjStr === '') {
            return {
                isError: true,
                message: "Warning: Gross Living Area Adjustment cannot be blank."
            };
        }
        const adjVal = parseAdjustmentValue(adjStr);
        if (adjVal === 0) {
            return { isMatch: true };
        }
        if (compGla === subjGla) {
            return {
                isError: true,
                message: `Warning: Gross Living Area is the same (${subjVal}), but adjustment is not $0.`
            };
        }
        if (compGla > subjGla && adjVal > 0) {
            return {
                isError: true,
                message: `Warning: Comp GLA (${compVal}) is superior to Subject (${subjVal}), but adjustment is not negative.`
            };
        }
        if (compGla < subjGla && adjVal < 0) {
            return {
                isError: true,
                message: `Warning: Comp GLA (${compVal}) is inferior to Subject (${subjVal}), but adjustment is not positive.`
            };
        }
    }

    return { isMatch: true };
};

/**
 * Validates consistency for Subject 'Other:' in the 1007 Rental Grid
 * against Sales Grid Subject 'Other:' or 'Other'.
 */
export const checkRentSubjectOtherConsistency = (field, text, allData, fieldPath, saleName, formType) => {
    const isOtherField = field === 'Other:' || field === 'Other';
    if (!isOtherField) return null;
    if (saleName && saleName !== 'Subject') return null;
    if (!allData) return null;
    if (!is1007Active(allData, formType) && !is1004And1007Form(allData, formType)) return null;

    const rentOtherStr = String(
        (text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : '') ||
        getSubjectRentFieldVal(allData, 'Other:') ||
        allData?.Subject?.['Other:'] ||
        allData?.Subject?.['Other'] ||
        ''
    ).trim();

    if (!rentOtherStr) return null;

    const salesOther = String(
        allData.SALES_GRID?.Subject?.['Other:'] ||
        allData['Sales Grid']?.Subject?.['Other:'] ||
        allData.SALES_GRID?.Subject?.['Other'] ||
        allData['Sales Grid']?.Subject?.['Other'] ||
        allData.Subject?.['Other:'] ||
        allData.Subject?.['Other'] ||
        ''
    ).trim();

    if (salesOther) {
        const normSales = normalizeForCompare(salesOther);
        const normRent = normalizeForCompare(rentOtherStr);
        if (normSales === normRent || normRent.includes(normSales) || normSales.includes(normRent)) {
            return { isMatch: true, message: "validated" };
        }
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Other feature mismatch: Sales Grid indicates '${salesOther}', but Rental Grid indicates '${rentOtherStr}'. Please reconcile and revise.`
        };
    }

    return { isMatch: true, message: "validated" };
};

/**
 * Validates Comparable Rentals 'Other: Adjustment' in the 1007 Rental Grid.
 */
export const checkRentOtherAdjustment = (field, text, allData, fieldPath, rentName) => {
    const isField = field === 'Other:' || field === 'Other' || field === 'Other: Adjustment' || field === 'Other Adjustment';
    if (!isField || !rentName || rentName === 'Subject' || !allData) return null;

    const isAdjField = field.includes('Adjustment');
    const subjVal = String(
        getSubjectRentFieldVal(allData, 'Other:') ||
        allData.SALES_GRID?.Subject?.['Other:'] ||
        allData.Subject?.['Other:'] ||
        allData.Subject?.['Other'] ||
        ''
    ).trim();

    const compObj = allData[rentName] ||
        allData['Comparable Rental Data']?.[rentName] ||
        allData.clean_data?.['Comparable Rental Data']?.[rentName] ||
        {};
    const compVal = String(
        (!isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : compObj['Other:']) ||
        compObj['Other'] ||
        ''
    ).trim();

    const adjObj = allData[rentName] ||
        allData['Comparable Rent Adjustments']?.[rentName] ||
        allData[`${rentName} Adjustments`] ||
        compObj;
    const adjStr = String(
        (isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : adjObj['Other: Adjustment']) ||
        adjObj['Other Adjustment'] ||
        ''
    ).trim();

    if (subjVal && compVal) {
        const normSubj = normalizeForCompare(subjVal);
        const normComp = normalizeForCompare(compVal);

        if (normSubj !== normComp) {
            if (adjStr === '') {
                return {
                    isError: true,
                    message: `Other feature mismatch (Subject: '${subjVal}', Comp: '${compVal}'). An adjustment is required, even if $0.`
                };
            }
        } else {
            if (adjStr !== '' && adjStr !== '0' && adjStr !== '$0' && parseAdjustmentValue(adjStr) !== 0) {
                return {
                    isError: true,
                    message: `Other feature is the same (${subjVal}), but adjustment is not $0.`
                };
            }
        }
    }

    return { isMatch: true };
};

export const getRentalCompData = (allData, compNumberOrName) => {
    if (!allData || typeof allData !== 'object') return null;
    let n = null;
    if (typeof compNumberOrName === 'number') {
        n = compNumberOrName;
    } else {
        const match = String(compNumberOrName).match(/\d+/);
        if (match) n = parseInt(match[0], 10);
    }
    if (!n) return null;

    const nPadded = String(n).padStart(2, '0');
    const aliases = [
        `Comparable Rent Schedule Comp #${n}`,
        `Comparable Rent Schedule Comp ${n}`,
        `Comparable Rent #${n}`,
        `Comparable Rent ${n}`,
        `COMPARABLE NO. ${n}`,
        `COMPARABLE NO ${n}`,
        `COMPARABLE NO. ${nPadded}`,
        `COMPARABLE NO ${nPadded}`,
        `COMPARABLE RENTAL #${n}`,
        `Comparable Rental #${n}`,
        `Comparable Rental No #${n}`,
        `COMPARABLE Rental No #${n}`,
        `Comparable Rental ${n}`,
        `Rental ${n}`,
        `Rental #${n}`,
        `RENTAL_${n}`,
        `RENTAL_${nPadded}`,
        `Comparable #${n}`,
        `Comparable ${n}`,
        `Comp #${n}`,
        `Comp ${n}`,
        String(n)
    ];

    const containers = [
        allData?.['Comparable Rent Schedule'],
        allData?.clean_data?.['Comparable Rent Schedule'],
        allData?.fields?.['Comparable Rent Schedule'],
        allData?.['RENT_SCHEDULE_GRID'],
        allData?.clean_data?.['RENT_SCHEDULE_GRID'],
        allData?.['Comparable Rental Data'],
        allData?.clean_data?.['Comparable Rental Data'],
        allData?.['Single Family Rent Schedule'],
        allData?.clean_data?.['Single Family Rent Schedule'],
        allData?.RENTAL_GRID,
        allData?.clean_data?.RENTAL_GRID,
        allData?.fields?.['Comparable Rental Data'],
        allData?.data
    ];

    for (const container of containers) {
        if (container && typeof container === 'object') {
            if (Array.isArray(container)) {
                if (container[n - 1] && typeof container[n - 1] === 'object') {
                    return container[n - 1];
                }
            } else {
                for (const alias of aliases) {
                    if (container[alias] && typeof container[alias] === 'object') {
                        return container[alias];
                    }
                }
                for (const [k, v] of Object.entries(container)) {
                    if (v && typeof v === 'object') {
                        const m = k.match(/(?:comp|rental|comparable|rental_).*?\b0*(${n})\b/i);
                        if (m && parseInt(m[1], 10) === n) {
                            return v;
                        }
                    }
                }
            }
        }
    }

    for (const alias of aliases) {
        if (allData?.[alias] && typeof allData[alias] === 'object') {
            return allData[alias];
        }
    }

    return null;
};

export const getRentalCompAddress = (allData, compNumberOrName) => {
    const comp = getRentalCompData(allData, compNumberOrName);
    if (!comp || typeof comp !== 'object') return '';
    const addr = comp['Address'] || comp['Street Address'] || comp['PropertyStreetAddress'] || comp['Property Address'] || '';
    if (typeof addr === 'object' && addr !== null) {
        return String(addr.value ?? '').trim();
    }
    return String(addr || '').trim();
};

export const isRentalCompPresent = (compObj) => {
    if (!compObj || typeof compObj !== 'object') return false;
    const addr = String(compObj['Address'] || compObj['Street Address'] || compObj['PropertyStreetAddress'] || compObj['Property Address'] || '').trim();
    if (addr && addr !== '0' && addr !== '-' && addr.toLowerCase() !== 'n/a') return true;

    const rent = String(compObj['Monthly Rental'] || compObj['Adjusted Monthly Rent'] || compObj['MonthlyRentAmount'] || compObj['Gross Monthly Rent'] || '').trim();
    if (rent && rent !== '0' && rent !== '$0' && rent !== '-' && rent.toLowerCase() !== 'n/a') return true;

    return Object.entries(compObj).some(([k, val]) => {
        if (val === undefined || val === null) return false;
        const v = typeof val === 'object' ? (val.value ?? '') : val;
        const s = String(v).trim();
        return s !== '' && s !== '-' && s.toLowerCase() !== 'n/a';
    });
};

export const getPresentRentalCompsCount = (allData) => {
    let count = 0;
    for (let i = 1; i <= 20; i++) {
        const comp = getRentalCompData(allData, i);
        if (isRentalCompPresent(comp)) {
            count++;
        }
    }
    return count;
};

export const normalizeAddressForDuplicateCheck = (val) => {
    if (!val) return '';
    let s = String(val).toLowerCase().trim();
    s = s.replace(/\bcourt\b/g, 'ct')
        .replace(/\bstreet\b/g, 'st')
        .replace(/\broad\b/g, 'rd')
        .replace(/\bavenue\b/g, 'ave')
        .replace(/\bdrive\b/g, 'dr')
        .replace(/\blane\b/g, 'ln')
        .replace(/\bboulevard\b/g, 'blvd')
        .replace(/\bcircle\b/g, 'cir')
        .replace(/\bparkway\b/g, 'pkwy')
        .replace(/\bterrace\b/g, 'ter')
        .replace(/\bplace\b/g, 'pl');
    return s.replace(/[^a-z0-9]/g, '');
};

export const checkRentalComparableAddressDuplicates = (field, text, allData, fieldPath, saleName) => {
    let actualText = text;
    let actualAllData = allData;
    let actualPath = fieldPath;
    let actualSaleName = saleName;

    if (text && typeof text === 'object' && !Array.isArray(text) && typeof allData === 'string') {
        actualAllData = text;
        actualSaleName = allData;
        actualText = null;
        actualPath = fieldPath;
    }

    if (!actualSaleName && Array.isArray(actualPath)) {
        actualSaleName = actualPath.find(p => typeof p === 'string' && (
            p.toUpperCase().includes('RENT') ||
            p.toUpperCase().startsWith('COMPARABLE NO') ||
            /^#?\d+$/.test(String(p).trim())
        ));
        if (!actualSaleName && actualPath.length >= 2 && String(actualPath[actualPath.length - 1]).toLowerCase() === 'address') {
            actualSaleName = actualPath[actualPath.length - 2];
        }
    }

    const normField = String(field || '').trim().toLowerCase();
    if (normField !== 'address' && normField !== 'property address') {
        return null;
    }

    if (!actualSaleName || String(actualSaleName).trim().toLowerCase() === 'subject' ||
        (Array.isArray(actualPath) && String(actualPath[0] || '').trim().toLowerCase() === 'subject')) {
        return null;
    }

    const normSale = String(actualSaleName || '').toUpperCase();
    if (normSale.includes('SALE') && !normSale.includes('RENT')) {
        return null;
    }

    let currentAddr = '';
    if (actualText !== null && actualText !== undefined) {
        currentAddr = String(typeof actualText === 'object' ? (actualText.value ?? '') : actualText).trim();
    } else if (actualAllData) {
        currentAddr = getRentalCompAddress(actualAllData, actualSaleName);
    }

    if (!currentAddr || currentAddr === '-' || currentAddr.toLowerCase() === 'n/a') {
        return null;
    }

    const normCurrent = normalizeAddressForDuplicateCheck(currentAddr);
    if (!normCurrent) return null;

    const currentMatch = String(actualSaleName).match(/\d+/);
    const currentCompNum = currentMatch ? parseInt(currentMatch[0], 10) : null;

    const matchingComps = [];
    const seenCompNums = new Set();
    if (currentCompNum !== null) seenCompNums.add(currentCompNum);

    for (let i = 1; i <= 20; i++) {
        if (i === currentCompNum) continue;
        const otherAddr = getRentalCompAddress(actualAllData, i);
        if (!otherAddr || otherAddr === '-' || otherAddr.toLowerCase() === 'n/a') continue;

        const normOther = normalizeAddressForDuplicateCheck(otherAddr);
        if (normOther && normOther === normCurrent) {
            seenCompNums.add(i);
            matchingComps.push({
                num: i,
                label: `COMPARABLE NO. ${i}`,
                address: otherAddr
            });
        }
    }

    const containers = [
        actualAllData?.['Comparable Rent Schedule'],
        actualAllData?.clean_data?.['Comparable Rent Schedule'],
        actualAllData?.['RENT_SCHEDULE_GRID'],
        actualAllData?.clean_data?.['RENT_SCHEDULE_GRID'],
        actualAllData?.['Comparable Rental Data'],
        actualAllData?.clean_data?.['Comparable Rental Data'],
        actualAllData?.['Single Family Rent Schedule'],
        actualAllData?.clean_data?.['Single Family Rent Schedule'],
        actualAllData?.RENTAL_GRID,
        actualAllData?.clean_data?.RENTAL_GRID
    ];
    containers.forEach(container => {
        if (container && typeof container === 'object') {
            Object.entries(container).forEach(([k, v]) => {
                if (!v || typeof v !== 'object') return;
                if (k.toLowerCase().trim() === 'subject') return;
                const m = k.match(/\d+/);
                const n = m ? parseInt(m[0], 10) : null;
                if (n !== null && seenCompNums.has(n)) return;
                if (k.toLowerCase() === String(actualSaleName).toLowerCase()) return;

                const raw = v['Address'] ?? v['Street Address'] ?? v['Property Address'];
                const addr = String(typeof raw === 'object' && raw !== null ? (raw.value ?? '') : (raw ?? '')).trim();
                if (!addr || addr === '-' || addr.toLowerCase() === 'n/a') return;

                const normOther = normalizeAddressForDuplicateCheck(addr);
                if (normOther && normOther === normCurrent) {
                    if (n !== null) seenCompNums.add(n);
                    matchingComps.push({
                        num: n,
                        label: k,
                        address: addr
                    });
                }
            });
        }
    });

    if (matchingComps.length > 0) {
        const matchesDesc = matchingComps.map(c => `${c.label} ('${c.address}')`).join(', ');
        return {
            isError: true,
            message: `Rental comparable address cannot match another comparable. Matches ${matchesDesc}.`
        };
    }

    return {
        isMatch: true,
        message: 'Valid: Rental comparable address is unique across comparables.'
    };
};

export const checkMinimumRentalComparables = (field, text, allData, fieldPath, saleName, formType) => {
    if (!is1007Active(allData, formType)) {
        return null;
    }

    if (!saleName || saleName === 'Subject') {
        return null;
    }

    const compMatch = String(saleName).match(/\d+/);
    const compNum = compMatch ? parseInt(compMatch[0], 10) : null;

    const presentCount = getPresentRentalCompsCount(allData);

    if (presentCount < 3) {
        if (compNum !== null && compNum <= 3) {
            return {
                isError: true,
                message: `Minimum 3 rental comparables are required in the report. Found only ${presentCount}. Please verify in report.`,
                skipBlankFilter: true
            };
        }
    }

    const dupCheck = checkRentalComparableAddressDuplicates(field, text, allData, fieldPath, saleName, formType);
    if (dupCheck && dupCheck.isError) {
        return dupCheck;
    }

    return {
        isMatch: true,
        message: 'Valid: Minimum 3 rental comparables are present.'
    };
};


export const getComparableIndicatedMonthlyMarketRents = (allData) => {
    if (!allData || typeof allData !== 'object') return [];

    const rentFieldAliases = [
        'Indicated Monthly Market Rent',
        'Indicated Monthly Market Rent $',
        'INDICATED MONTHLY MARKET RENT',
        'Indicated Market Rent',
        'Indicated Market Rent $',
        'Indicated Monthly Rent',
        'Market Adjusted Monthly Rent',
        'MarketAdjustedMonthlyRentAmount',
        'Market Adjusted Monthly Rent Amount',
        'Adjusted Monthly Rent',
        'Adjusted Monthly Rent $'
    ];

    const results = [];
    const seenCompNums = new Set();

    const extractRentFromComp = (compObj) => {
        if (!compObj || typeof compObj !== 'object') return null;
        for (const alias of rentFieldAliases) {
            if (compObj[alias] !== undefined && compObj[alias] !== null) {
                const v = typeof compObj[alias] === 'object' ? (compObj[alias].value ?? '') : compObj[alias];
                if (String(v).trim() !== '') {
                    const num = parseRentalAmount(v);
                    if (num !== null && !isNaN(num) && num > 0) return num;
                }
            }
        }
        for (const [k, v] of Object.entries(compObj)) {
            const kLower = k.toLowerCase();
            if (kLower.includes('indicated') && kLower.includes('rent')) {
                const cleanV = typeof v === 'object' && v !== null ? (v.value ?? '') : v;
                if (String(cleanV).trim() !== '') {
                    const num = parseRentalAmount(cleanV);
                    if (num !== null && !isNaN(num) && num > 0) return num;
                }
            }
        }
        return null;
    };

    for (let i = 1; i <= 20; i++) {
        const comp = getRentalCompData(allData, i);
        if (comp) {
            const num = extractRentFromComp(comp);
            if (num !== null && num > 0 && !seenCompNums.has(i)) {
                seenCompNums.add(i);
                results.push({
                    compNum: i,
                    compLabel: `Comparable #${i}`,
                    rent: num
                });
            }
        }
    }

    return results;
};

export const getRentScheduleToBeValue = (allData, text) => {
    if (text !== undefined && text !== null && String(text).trim() !== '') {
        const num = parseRentalAmount(text);
        if (num !== null && !isNaN(num) && num > 0) return num;
    }

    if (!allData || typeof allData !== 'object') return null;

    const rentSections = [
        "Comparable Rent Schedule Reconciliation",
        "RENT_SCHEDULE_RECONCILIATION",
        "Rent Schedule Reconciliation",
        "rent_schedule_reconciliation",
        "Single Family Rent Schedule",
        "Comparable Rent Schedule"
    ];
    const rentFieldNames = ["TO BE $", "To be $", "TO BE", "To Be $", "TO BE ($)", "to be $"];

    for (const sec of rentSections) {
        const secObj = allData[sec] || allData?.clean_data?.[sec];
        if (secObj && typeof secObj === 'object') {
            for (const f of rentFieldNames) {
                if (secObj[f] !== undefined && secObj[f] !== null) {
                    const num = parseRentalAmount(secObj[f]);
                    if (num !== null && !isNaN(num) && num > 0) return num;
                }
            }
        }
    }

    for (const f of rentFieldNames) {
        if (allData[f] !== undefined && allData[f] !== null) {
            const num = parseRentalAmount(allData[f]);
            if (num !== null && !isNaN(num) && num > 0) return num;
        }
    }

    return null;
};

export const checkRentScheduleToBeBracketing = (field, text, allData, fieldPath, saleName, formType) => {
    let actualText = text;
    let actualData = allData;
    if (actualData === undefined || actualData === null || typeof actualData !== 'object') {
        if (typeof actualText === 'object' && actualText !== null) {
            actualData = actualText;
            actualText = null;
        }
    }

    if (!actualData) return null;

    const fieldLower = String(field || '').toLowerCase().trim();
    const isToBeField = fieldLower === 'to be $' || fieldLower === 'to be' || fieldLower === 'to be ($)';
    if (!isToBeField) return null;

    const toBeRent = getRentScheduleToBeValue(actualData, actualText);
    if (!toBeRent || isNaN(toBeRent) || toBeRent <= 0) {
        return null;
    }

    const comps = getComparableIndicatedMonthlyMarketRents(actualData);
    if (!comps || comps.length === 0) {
        return null;
    }

    const rents = comps.map(c => c.rent);
    const minRent = Math.min(...rents);
    const maxRent = Math.max(...rents);

    const isBracketed = (toBeRent >= minRent && toBeRent <= maxRent);

    const minPct = (((minRent - toBeRent) / toBeRent) * 100).toFixed(1);
    const maxPct = (((maxRent - toBeRent) / toBeRent) * 100).toFixed(1);
    const minSign = Number(minPct) > 0 ? '+' : '';
    const maxSign = Number(maxPct) > 0 ? '+' : '';

    const rangeSummary = `Range: $${minRent.toLocaleString()} (${minSign}${minPct}%) to $${maxRent.toLocaleString()} (${maxSign}${maxPct}%)`;

    if (isBracketed) {
        return {
            isBracketed: true,
            isMatch: true,
            section: 'Comparable Rent Schedule Reconciliation',
            field: 'TO BE $',
            message: `Valid: TO BE $ ($${toBeRent.toLocaleString()}) is bracketed by Indicated Monthly Market Rent of comparables (${rangeSummary}).`
        };
    }

    if (toBeRent < minRent) {
        return {
            isBracketed: false,
            isError: true,
            section: 'Comparable Rent Schedule Reconciliation',
            field: 'TO BE $',
            message: `TO BE $ ($${toBeRent.toLocaleString()}) is unbracketed by Indicated Monthly Market Rent (all comparables are higher). Lowest is $${minRent.toLocaleString()} (${minSign}${minPct}%). ${rangeSummary}.`
        };
    }

    return {
        isBracketed: false,
        isError: true,
        section: 'Comparable Rent Schedule Reconciliation',
        field: 'TO BE $',
        message: `TO BE $ ($${toBeRent.toLocaleString()}) is unbracketed by Indicated Monthly Market Rent (all comparables are lower). Highest is $${maxRent.toLocaleString()} (${maxSign}${maxPct}%). ${rangeSummary}.`
    };
};

export const checkCompIndicatedMonthlyMarketRentBracketing = (field, text, allData, fieldPath, saleName, formType) => {
    let actualText = text;
    let actualData = allData;
    let actualSaleName = saleName;

    if (actualData === undefined || actualData === null || typeof actualData !== 'object') {
        if (typeof actualText === 'object' && actualText !== null) {
            actualData = actualText;
            actualText = null;
            actualSaleName = fieldPath;
        }
    }

    if (!actualData) return null;
    if (actualSaleName && String(actualSaleName).toLowerCase() === 'subject') return null;

    const fieldLower = String(field || '').toLowerCase().trim();
    if (!fieldLower.includes('indicated') && !fieldLower.includes('rent')) return null;

    const toBeRent = getRentScheduleToBeValue(actualData, null);
    if (!toBeRent || isNaN(toBeRent) || toBeRent <= 0) return null;

    const rawCompRent = (actualText !== null && actualText !== undefined && String(actualText).trim() !== '')
        ? actualText
        : null;

    const compRent = parseRentalAmount(rawCompRent);
    if (!compRent || isNaN(compRent) || compRent <= 0) return null;

    const pct = ((compRent - toBeRent) / toBeRent) * 100;
    const sign = pct > 0 ? '+' : '';
    const compLabel = actualSaleName || 'Comparable';

    return {
        isMatch: true,
        section: 'Comparable Rent Schedule',
        field: 'Indicated Monthly Market Rent',
        message: `${compLabel} Indicated Monthly Market Rent ($${compRent.toLocaleString()}, ${sign}${pct.toFixed(1)}%) vs TO BE $ ($${toBeRent.toLocaleString()}).`
    };
};

export {
    checkRentScheduleAsOfDateConsistency,
    checkRentScheduleToBeAmountConsistency,
    checkIncomeApproachIndicatedValueConsistency
} from './form1004And1007Validation';
export { is1004And1007Form };

