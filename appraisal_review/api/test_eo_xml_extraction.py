import unittest
import xml.etree.ElementTree as ET
from appraisal_review.api.xml_extractor import _detect_eo_in_xml_tags, extract_fields_from_xml
from appraisal_review.api.eo_extractor import parse_eo_text

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

if __name__ == "__main__":
    unittest.main()
