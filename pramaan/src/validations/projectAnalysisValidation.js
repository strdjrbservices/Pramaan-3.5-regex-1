export const PROJECT_ANALYSIS_FIELDS_TO_CHECK = [
    "I did did not analyze the condominium project budget for the current year. Explain the results of the analysis of the budget (adequacy of fees, reserves, etc.), or why the analysis was not performed.",
    "I did / did not analyze the condominium project budget for the current year. Explain the results of the analysis of the budget (adequacy of fees, reserves, etc.), or why the analysis was not performed.",
    "I did/did not analyze the condominium project budget for the current year. Explain the results of the analysis of the budget (adequacy of fees, reserves, etc.), or why the analysis was not performed.",
    "Are there any other fees (other than regular HOA charges) for the use of the project facilities?",
    "If Yes, report the charges and describe.",
    "Compared to other competitive projects of similar quality and design, the subject unit charge appears",
    "If High or Low, describe",
    "Are there any special or unusual characteristics of the project (based on the condominium documents, HOA meetings, or other information) known to the appraiser?",
    "If Yes, describe and explain the effect on value and marketability."
];

export const checkProjectAnalysisFieldsNotBlank = (field, text) => {
    const cleanField = String(field || '').trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' ');
    const isMatch = PROJECT_ANALYSIS_FIELDS_TO_CHECK.some(
        f => f.trim().toLowerCase().replace(/[\s\r\n\t]+/g, ' ') === cleanField
    );

    if (!isMatch) {
        return null;
    }

    if (!text || String(text).trim() === '') {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `'${field}' must not be blank.`
        };
    }

    return {
        isMatch: true,
        message: "Validation successful!"
    };
};
