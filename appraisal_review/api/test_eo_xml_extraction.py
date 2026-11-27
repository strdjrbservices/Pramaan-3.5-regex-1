import unittest
import xml.etree.ElementTree as ET
try:
    from appraisal_review.api.xml_extractor import _detect_eo_in_xml_tags, extract_fields_from_xml
    from appraisal_review.api.eo_extractor import parse_eo_text
except ModuleNotFoundError:
    from api.xml_extractor import _detect_eo_in_xml_tags, extract_fields_from_xml
    from api.eo_extractor import parse_eo_text

class TestEoXmlExtraction(unittest.TestCase):
    def test_parse_eo_text_labels(self):
        cases = [
            ("Errors & Omissions Insurance Policy Number: AB-123456 Effective: 01/01/2026 to 01/01/2027", "AB-123456", "Present"),
            ("Errors and Omissions Policy No: EO-998877 Expires: 12/31/2026", "EO-998877", "Present"),
            ("Errors and Omissions Insurance Policy: EO-112233", "EO-112233", "Present"),
            ("Errors & Omissions Policy: EO-443322", "EO-443322", "Present"),
            ("Certificate of Insurance Policy # POL-112233", "POL-112233", "Present"),
            ("Certificate of Liability Insurance Policy # POL-554433", "POL-554433", "Present"),
            ("Professional Liability Insurance Policy: PL-778899", "PL-778899", "Present"),
            ("Professional Liability Policy Number: PL-102030", "PL-102030", "Present"),
            ("Appraisers Advantage E&O Insurance Policy: AA-445566", "AA-445566", "Present"),
            ("E&O Policy #: EOP-112233", "EOP-112233", "Present"),
            ("E & O Policy Number: EOP-998877", "EOP-998877", "Present"),
            ("E/O Policy: EO-334455", "EO-334455", "Present"),
            ("E / O Policy: EO-667788", "EO-667788", "Present"),
            ("E-O Insurance Policy: EO-554411", "EO-554411", "Present"),
            ("E and O Insurance Policy: EO-889900", "EO-889900", "Present"),
            ("E&O Insurance: EOP-778899", "EOP-778899", "Present"),
            ("E/O Insurance: EOP-665544", "EOP-665544", "Present"),
            ("E&O Coverage Present", "", "Present"),
            ("Appraiser Insurance Policy #: AIP-123456", "AIP-123456", "Present"),
        ]
        for text, expected_pol, expected_status in cases:
            res = parse_eo_text(text)
            self.assertEqual(res["E&O"], expected_status, f"Failed for text: {text}")
            if expected_pol:
                self.assertEqual(res["E&O Insurance"], expected_pol, f"Failed policy for text: {text}")

    def test_form_tag_detection(self):
        xml_snippets = [
            '<VALUATION_RESPONSE><FORM AppraisalReportContentName="Errors and Omissions Insurance" /></VALUATION_RESPONSE>',
            '<VALUATION_RESPONSE><FORM Title="Appraiser E&amp;O Insurance" /></VALUATION_RESPONSE>',
            '<VALUATION_RESPONSE><FORM AppraisalReportContentIdentifier="EO_INSURANCE" /></VALUATION_RESPONSE>',
            '<VALUATION_RESPONSE><FORM AppraisalReportContentType="Professional Liability" /></VALUATION_RESPONSE>',
            '<VALUATION_RESPONSE><FORM Name="Appraisers Advantage" /></VALUATION_RESPONSE>',
            '<VALUATION_RESPONSE><FORM AppraisalAddendumText="Errors &amp; Omissions Policy #: EO-12345" /></VALUATION_RESPONSE>',
        ]
        for xml in xml_snippets:
            root = ET.fromstring(xml)
            res = _detect_eo_in_xml_tags(root, xml)
            self.assertTrue(res["is_present"], f"Expected E&O detected in XML: {xml}")
            self.assertEqual(res["E&O"], "Present")

    def test_attached_image_tag_detection(self):
        xml_snippets = [
            '<VALUATION_RESPONSE><ATTACHED_IMAGE ImageTitle="E&amp;O Insurance" /></VALUATION_RESPONSE>',
            '<VALUATION_RESPONSE><IMAGE><TITLE>Certificate of Liability Insurance</TITLE></IMAGE></VALUATION_RESPONSE>',
            '<VALUATION_RESPONSE><PHOTO Description="Errors &amp; Omissions" /></VALUATION_RESPONSE>',
            '<VALUATION_RESPONSE><EMBEDDED_IMAGE Title="E/O Policy Certificate" /></VALUATION_RESPONSE>',
            '<VALUATION_RESPONSE><EMBEDDED_FILE DocumentType="E&amp;O Coverage" /></VALUATION_RESPONSE>',
        ]
        for xml in xml_snippets:
            root = ET.fromstring(xml)
            res = _detect_eo_in_xml_tags(root, xml)
            self.assertTrue(res["is_present"], f"Expected E&O detected in XML: {xml}")
            self.assertEqual(res["E&O"], "Present")

    def test_extract_fields_from_xml_with_eo_form(self):
        xml = '''<?xml version="1.0" encoding="UTF-8"?>
        <VALUATION_RESPONSE xmlns="http://www.mismo.org/residential/2009/schemas">
            <REPORT AppraisalFormType="1004" />
            <FORM AppraisalReportContentName="Errors and Omissions Insurance" AppraisalAddendumText="E&amp;O Policy #: EO-998811" />
        </VALUATION_RESPONSE>'''
        fields = extract_fields_from_xml(xml, extract_images=False)
        self.assertEqual(fields.get("E&O"), "Present")
        self.assertEqual(fields.get("E&O Present"), "Present")
        self.assertEqual(fields.get("E/O"), "Present")
        self.assertEqual(fields.get("Certification", {}).get("E&O"), "Present")

    def test_extract_fields_from_xml_with_embedded_pdf(self):
        import base64
        import pymupdf as fitz
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), "CERTIFICATE OF LIABILITY INSURANCE\nErrors & Omissions Insurance Policy: EO-PDF-9999\nEffective: 01/01/2026 to 01/01/2027")
        pdf_bytes = doc.tobytes()
        doc.close()
        b64_pdf = base64.b64encode(pdf_bytes).decode("ascii")

        xml = f'''<?xml version="1.0" encoding="UTF-8"?>
        <VALUATION_RESPONSE xmlns="http://www.mismo.org/residential/2009/schemas">
            <REPORT AppraisalFormType="1004" />
            <DOCUMENT _Type="PDF">{b64_pdf}</DOCUMENT>
        </VALUATION_RESPONSE>'''
        fields = extract_fields_from_xml(xml, extract_images=False)
        self.assertEqual(fields.get("E&O"), "Present")
        self.assertEqual(fields.get("E&O Insurance"), "EO-PDF-9999")

    def test_diverse_eo_formats(self):
        # 1. LIA / Liberty style Declarations with Item 1..4 & From/To 12:01 AM
        lia_text = """
        REAL ESTATE APPRAISERS PROFESSIONAL LIABILITY DECLARATIONS
        Policy Number: LIA-0098765-26
        Item 1. Named Insured:
        Apex Valuation Services LLC
        123 Main St, Austin, TX 78701
        Item 2. Policy Period: From: 04/15/2026 to 04/15/2027 12:01 A.M. Standard Time
        Item 3. Limits of Liability: $1,000,000 Each Claim / $1,000,000 Aggregate
        Item 4. Deductible: $2,500 Each Claim
        Underwritten by: Liberty Insurance Underwriters Inc.
        """
        r1 = parse_eo_text(lia_text)
        self.assertEqual(r1["E&O"], "Present")
        self.assertEqual(r1["E&O Insurance"], "LIA-0098765-26")
        self.assertEqual(r1["Policy Period From"], "04/15/2026")
        self.assertEqual(r1["Policy Period To"], "04/15/2027")
        self.assertEqual(r1["E&O Insured"], "Apex Valuation Services LLC")
        self.assertEqual(r1["E&O Carrier"], "Liberty Insurance Underwriters Inc.")
        self.assertEqual(r1["E&O Limit"], "$1,000,000")
        self.assertEqual(r1["E&O Deductible"], "$2,500")

        # 2. OREP / Hudson Certificate style
        orep_text = """
        CERTIFICATE OF INSURANCE - REAL ESTATE APPRAISERS E&O
        Certificate Number: OREP-441122
        Member Name: Jane Doe Appraisals
        Effective Date: March 1, 2026
        Expiration Date: March 1, 2027
        Each Claim: $500,000
        Self-Insured Retention: $1,000
        Coverage provided by: Hudson Insurance Company
        """
        r2 = parse_eo_text(orep_text)
        self.assertEqual(r2["E&O"], "Present")
        self.assertEqual(r2["E&O Insurance"], "OREP-441122")
        self.assertEqual(r2["Policy Period From"], "03/01/2026")
        self.assertEqual(r2["Policy Period To"], "03/01/2027")
        self.assertEqual(r2["E&O Insured"], "Jane Doe Appraisals")
        self.assertEqual(r2["E&O Carrier"], "Hudson Insurance Company")
        self.assertEqual(r2["E&O Limit"], "$500,000")
        self.assertEqual(r2["E&O Deductible"], "$1,000")

        # 3. ACORD 25 Certificate with multiple insurers (Insurer B = E&O)
        acord_text = """
        CERTIFICATE OF LIABILITY INSURANCE
        INSURED
        Summit Appraisal Group
        450 Oak Ave
        INSURER A: State Farm Fire and Casualty Company NAIC # 25143
        INSURER B: General Star Indemnity Company NAIC # 37362
        B  Claims-Made  Professional Liability  GS-8877665  05/01/2026  05/01/2027  Each Claim $1,000,000
        Deductible: None
        """
        r3 = parse_eo_text(acord_text)
        self.assertEqual(r3["E&O"], "Present")
        self.assertEqual(r3["E&O Insurance"], "GS-8877665")
        self.assertEqual(r3["Policy Period From"], "05/01/2026")
        self.assertEqual(r3["Policy Period To"], "05/01/2027")
        self.assertEqual(r3["E&O Insured"], "Summit Appraisal Group")
        self.assertEqual(r3["E&O Carrier"], "General Star Indemnity Company")
        self.assertEqual(r3["E&O Limit"], "$1,000,000")
        self.assertEqual(r3["E&O Deductible"], "None")

        # 4. CNA / Travelers OCR-artifact table style
        cna_ocr = """
        ERRORS AND OMISSIONS DECLARATIONS
        Agency Branch Prefix Policy Number
        078990 969 RFB 42313903226
        NAMED INSURED
        Jennifer Leary DBA: Forest Cove Appraisals
        Policy Period: 01/15/26 to 01/15/27
        Insurance is provided by
        Ivelen Casualtv & Surety Company ol Amerlca
        Limits of Liability: 51,000,000
        Deductible: 52,500
        """
        r4 = parse_eo_text(cna_ocr)
        self.assertEqual(r4["E&O"], "Present")
        self.assertEqual(r4["E&O Insurance"], "RFB 42313903226")
        self.assertEqual(r4["Policy Period From"], "01/15/2026")
        self.assertEqual(r4["Policy Period To"], "01/15/2027")
        self.assertEqual(r4["E&O Insured"], "Jennifer Leary DBA: Forest Cove Appraisals")
        self.assertEqual(r4["E&O Carrier"], "Travelers Casualty & Surety Company of America")
        self.assertEqual(r4["E&O Limit"], "$1,000,000")
        self.assertEqual(r4["E&O Deductible"], "$2,500")

        # 5. Competing dates on same page (e.g., Effective/Retroactive/License Expires + Policy Period: From ... To ...)
        competing_text = """
        Effective: 11/24/2026
        License Expires: 12/31/2027
        Policy Period: From 11/07/2026 To 11/07/2027
        (Month, Day, Year) (Month, Day, Year)
        """
        r5 = parse_eo_text(competing_text)
        self.assertEqual(r5["Policy Period From"], "11/07/2026")
        self.assertEqual(r5["Policy Period To"], "11/07/2027")

        # 6. Great American OCR artifacts ($10.000 dot thousands, ARATIONS header bleed, spaces in dates)
        ga_ocr = """
        ARATIONS GREATAMERICAN for REAL ESTATE PROFESSIONAL INSURANCE GROUP
        Policy Number: RAB3873736-26
        Named Insured: Realty Management Services Inc
        Policy Period: From (Month, Day, Year) 11 / 07 / 2026 To (Month, Day, Year) 11 / 07 / 2027
        Limits of Liability: $1,000,000
        Deductible: $10.000
        """
        r6 = parse_eo_text(ga_ocr)
        self.assertEqual(r6["E&O Insurance"], "RAB3873736-26")
        self.assertEqual(r6["E&O Insured"], "Realty Management Services Inc")
        self.assertEqual(r6["Policy Period From"], "11/07/2026")
        self.assertEqual(r6["Policy Period To"], "11/07/2027")
        self.assertEqual(r6["E&O Limit"], "$1,000,000")
        self.assertEqual(r6["E&O Deductible"], "$10,000")
        self.assertEqual(r6["E&O Carrier"], "Great American for REAL ESTATE PROFESSIONAL INSURANCE GROUP")

if __name__ == "__main__":
    unittest.main()
