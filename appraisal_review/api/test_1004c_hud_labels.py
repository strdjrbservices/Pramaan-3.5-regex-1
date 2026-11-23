import os
import sys
import unittest

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if WORKSPACE_DIR not in sys.path:
    sys.path.insert(0, WORKSPACE_DIR)

try:
    from appraisal_review.api.xml_extractor import (
        classify_subject_view_label,
        _classify_photo_category,
        extract_photos_from_xml,
    )
    from appraisal_review.api.pdf_extractor_offline import (
        extract_photos_and_captions,
        extract_fields_from_pdf_offline,
    )
except ModuleNotFoundError:
    from api.xml_extractor import (
        classify_subject_view_label,
        _classify_photo_category,
        extract_photos_from_xml,
    )
    from api.pdf_extractor_offline import (
        extract_photos_and_captions,
        extract_fields_from_pdf_offline,
    )

try:
    import fitz
except ImportError:
    import pymupdf as fitz

PDF_FILE = os.path.join(WORKSPACE_DIR, "5580 Paradise Dr.pdf")
XML_FILE = os.path.join(WORKSPACE_DIR, "5580 Paradise Dr.xml")


class Test1004CHUDLabels(unittest.TestCase):

    def test_classify_subject_view_label_hud_labels(self):
        """Verifies all user-specified 1004C HUD labels and variants are classified correctly."""
        # 1. User specified labels: "HUD Plate 1, HUD Plate 2, plate 1, plate 2, HUD certificate , HUD Certification Label"
        self.assertEqual(
            classify_subject_view_label("HUD Plate 1")[0],
            "HUD Certification Label"
        )
        self.assertEqual(
            classify_subject_view_label("HUD Plate 2")[0],
            "HUD Certification Label"
        )
        self.assertEqual(
            classify_subject_view_label("plate 1")[0],
            "HUD Certification Label"
        )
        self.assertEqual(
            classify_subject_view_label("plate 2")[0],
            "HUD Certification Label"
        )
        self.assertEqual(
            classify_subject_view_label("HUD certificate")[0],
            "HUD Data Plate / Compliance Certificate"
        )
        self.assertEqual(
            classify_subject_view_label("HUD Certification Label")[0],
            "HUD Certification Label"
        )

        # 2. Address-prefixed labels (e.g. from user uploaded Image 3)
        self.assertEqual(
            classify_subject_view_label("34 Starling Court HUD Plate 1")[0],
            "HUD Certification Label"
        )
        self.assertEqual(
            classify_subject_view_label("34 Starling Court HUD Plate 2")[0],
            "HUD Certification Label"
        )

        # 3. Data plate labels (e.g. from user uploaded Image 2)
        self.assertEqual(
            classify_subject_view_label("HUD Plate Data")[0],
            "HUD Data Plate / Compliance Certificate"
        )
        self.assertEqual(
            classify_subject_view_label("Data Plate")[0],
            "HUD Data Plate / Compliance Certificate"
        )
        self.assertEqual(
            classify_subject_view_label("HUD Data Plate")[0],
            "HUD Data Plate / Compliance Certificate"
        )

        # 4. Contextual labels (e.g. "Label 1", "Label 2" under "HUD Certification Label" header)
        self.assertEqual(
            classify_subject_view_label("Label 1", page_context="HUD Certification Label")[0],
            "HUD Certification Label"
        )
        self.assertEqual(
            classify_subject_view_label("Label 2", page_context="HUD Certification Label")[0],
            "HUD Certification Label"
        )

    def test_classify_photo_category_hud(self):
        """Verifies HUD plates and certificates are classified under 'Subject property'."""
        self.assertEqual(_classify_photo_category("HUD Plate 1", ""), "Subject property")
        self.assertEqual(_classify_photo_category("HUD Plate 2", ""), "Subject property")
        self.assertEqual(_classify_photo_category("HUD Certification Label", ""), "Subject property")
        self.assertEqual(_classify_photo_category("HUD Plate Data", ""), "Subject property")
        self.assertEqual(_classify_photo_category("Data Plate", ""), "Subject property")
        self.assertEqual(_classify_photo_category("plate 1", ""), "Subject property")
        self.assertEqual(_classify_photo_category("plate 2", ""), "Subject property")
        self.assertEqual(_classify_photo_category("HUD certificate", ""), "Subject property")

    def test_pdf_extraction_hud_photos(self):
        """Verifies 1004C HUD photos from 5580 Paradise Dr.pdf are correctly extracted."""
        if not os.path.exists(PDF_FILE):
            self.skipTest(f"PDF file not found: {PDF_FILE}")

        doc = fitz.open(PDF_FILE)
        photos = extract_photos_and_captions(doc, PDF_FILE)

        hud_cert_photos = [
            p for p in photos
            if p.get("view_type") == "HUD Certification Label"
            or any(k in (p.get("caption") or "").upper() for k in ["HUD CERTIFICATION", "HUD PLATE", "PLATE 1", "PLATE 2"])
        ]
        self.assertTrue(len(hud_cert_photos) >= 2, f"Expected at least 2 HUD Certification Label photos, got {len(hud_cert_photos)}")

        hud_data_plate_photos = [
            p for p in photos
            if p.get("view_type") == "HUD Data Plate / Compliance Certificate"
            or any(k in (p.get("caption") or "").upper() for k in ["HUD PLATE DATA", "HUD DATA PLATE", "DATA PLATE"])
        ]
        self.assertTrue(len(hud_data_plate_photos) >= 1, f"Expected at least 1 HUD Data Plate photo, got {len(hud_data_plate_photos)}")
        self.assertEqual(hud_data_plate_photos[0].get("page"), 28)

    def test_xml_extraction_hud_photos(self):
        """Verifies 1004C HUD photos from 5580 Paradise Dr.xml are correctly extracted and categorized."""
        if not os.path.exists(XML_FILE):
            self.skipTest(f"XML file not found: {XML_FILE}")

        photos = extract_photos_from_xml(XML_FILE, include_images=False, companion_pdf_path=PDF_FILE if os.path.exists(PDF_FILE) else None)
        hud_photos = [
            p for p in photos
            if p.get("view_type") in ("HUD Certification Label", "HUD Data Plate / Compliance Certificate")
        ]
        self.assertTrue(len(hud_photos) >= 2, f"Expected at least 2 HUD photos in XML extraction, got {len(hud_photos)}")


if __name__ == "__main__":
    unittest.main()
