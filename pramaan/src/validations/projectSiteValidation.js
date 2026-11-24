export const checkProjectSiteFieldsNotBlank = (field, text) => {
    const fieldsToCheck = [
        "Topography", "Size", "Density", "View", "Specific Zoning Classification", "Zoning Description",
        "Zoning Compliance", "Is the highest and best use of subject property as improved (or as proposed per plans and specifications) the present use?",
        "Electricity", "Gas", "Water", "Sanitary Sewer", "Street", "Alley",
        "Is the site size, shape and topography generally conforming to and acceptable in the market area? Yes No If No, explain",
        "Is the site size, shape and topography generally conforming to and acceptable in the market area?",
        "Is there adequate vehicular access to the subject property? Yes No If No, describe",
        "Is there adequate vehicular access to the subject property?",
        "Is the street properly maintained? Yes No If No, describe",
        "Is the street properly maintained?",
        "FEMA Special Flood Hazard Area",
        "FEMA Flood Zone", "FEMA Map #", "FEMA Map Date",
        "Are the utilities and off-site improvements typical for the market area?",
        "Are the utilities and off-site improvements typical for the market area? If No, describe",
        "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? If Yes, describe",
        "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? Yes No If Yes, describe",
        "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)?",
    ];
    if (fieldsToCheck.includes(field) && (!text || String(text).trim() === '')) {
        return { isError: true, message: `'${field}' should not be blank.` };
    }
    return null;
};
