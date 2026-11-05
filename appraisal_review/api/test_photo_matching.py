import unittest
import os
import sys

# Ensure api module is importable
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)
WORKSPACE_ROOT = os.path.abspath(os.path.join(PARENT_DIR, ".."))
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from api.xml_extractor import (
    extract_photos_from_xml,
    extract_fields_from_xml,
    _classify_photo_category,
    classify_subject_view_label
)

def find_file(filename):
    for path in [
        os.path.join(WORKSPACE_ROOT, filename),
        os.path.join(CURRENT_DIR, filename),
        filename
    ]:
        if os.path.exists(path):
            return path
    return None


class TestPhotoMatchingAndExtraction(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        sample_path = find_file("2922 Jarboe St (1).xml")
        cls.photos_jarboe = extract_photos_from_xml(sample_path, include_images=False) if sample_path else []

    def test_sample_xml_photo_count_and_order(self):
        """Verifies that all 27 photos are extracted in exact document page/reading order."""
        if not self.photos_jarboe:
            self.skipTest("Sample XML 2922 Jarboe St (1).xml not found.")

        self.assertEqual(len(self.photos_jarboe), 27, f"Expected 27 photos, found {len(self.photos_jarboe)}")
        pages = [p["page"] for p in self.photos_jarboe]
        self.assertEqual(pages, sorted(pages), "Photos must preserve document page order")
        expected_pages = [16, 16, 16, 17, 17, 18, 18, 18, 19, 19, 19, 20, 20, 20, 21, 21, 21, 23, 23, 23, 24, 24, 24, 25, 26, 26, 26]
        self.assertEqual(pages, expected_pages)

    def test_duplicate_captions_preserved(self):
        """Verifies duplicate captions (e.g., multiple Side Views or multiple Baths) are preserved as distinct entries."""
        if not self.photos_jarboe:
            self.skipTest("Sample XML not found.")

        side_views = [p for p in self.photos_jarboe if "Side" in p["caption"]]
        self.assertEqual(len(side_views), 2, "Both Subject Side View photos on page 17 must be preserved separately")

        baths = [p for p in self.photos_jarboe if p["caption"] == "Bath"]
        self.assertEqual(len(baths), 2, "Bath photos across pages 18 and 20 must be preserved as separate entries")

    def test_target_categories_classification(self):
        """Verifies photos are classified into Subject property, Subject interior, Comparable property, Rental property."""
        if not self.photos_jarboe:
            self.skipTest("Sample XML not found.")

        categories = set(p["category"] for p in self.photos_jarboe)
        expected_cats = {"Subject property", "Subject interior", "Comparable property", "Rental property"}
        self.assertTrue(categories.issubset(expected_cats), f"Found unexpected categories: {categories - expected_cats}")

        subj_ext = [p for p in self.photos_jarboe if p["page"] in [16, 17]]
        for p in subj_ext:
            self.assertEqual(p["category"], "Subject property")

        subj_int = [p for p in self.photos_jarboe if p["page"] in [18, 19, 20, 21]]
        for p in subj_int:
            self.assertEqual(p["category"], "Subject interior")

        comps = [p for p in self.photos_jarboe if p["page"] in [23, 24, 25]]
        for p in comps:
            self.assertEqual(p["category"], "Comparable property")

        rentals = [p for p in self.photos_jarboe if p["page"] == 26]
        for p in rentals:
            self.assertEqual(p["category"], "Rental property")

    def test_no_general_photo_and_status_fields(self):
        """Verifies zero 'General Photo' fallback labels and presence of confidence/status fields."""
        if not self.photos_jarboe:
            self.skipTest("Sample XML not found.")

        for p in self.photos_jarboe:
            self.assertNotEqual(p["caption"], "General Photo", "Caption must not be silently replaced with 'General Photo'")
            self.assertIn("original_caption", p)
            self.assertIn("match_status", p)
            self.assertIn("match_confidence", p)
            self.assertIn(p["match_status"], ["matched", "unmatched"])
            self.assertIn(p["match_confidence"], ["high", "medium", "low"])

    def test_no_phantom_photos_for_missing_images(self):
        """Verifies that page 25 (having only Comparable 7) extracts 1 photo and does not fabricate entries for Comps 8 & 9."""
        if not self.photos_jarboe:
            self.skipTest("Sample XML not found.")

        p25_photos = [p for p in self.photos_jarboe if p["page"] == 25]
        self.assertEqual(len(p25_photos), 1, "Page 25 should only extract 1 photo (Comparable 7)")
        self.assertIn("7", p25_photos[0]["caption"])

    def test_nine_photo_grid_layout_12_hilltop(self):
        """Tests 3x3 grid layout (TOTAL Form PIC9) from 12 Hilltop Ter.xml."""
        fpath = find_file("12 Hilltop Ter.xml")
        if not fpath:
            self.skipTest("12 Hilltop Ter.xml not found.")

        photos = extract_photos_from_xml(fpath, include_images=False)
        p22 = [p for p in photos if p["page"] == 22]
        self.assertEqual(len(p22), 9, f"Page 22 (Form PIC9) must extract exactly 9 photos, found {len(p22)}")

        expected_captions = [
            "Living Room", "Kitchen", "Dining Room",
            "Balcony", "Bedroom", "Bedroom",
            "Full Bath 1", "Full Bath 2", "CO/Smoke Detector"
        ]
        actual_captions = [p["caption"] for p in p22]
        self.assertEqual(actual_captions, expected_captions, "3x3 grid captions must match exactly in row-by-row reading order")

        for p in p22:
            self.assertEqual(p["match_status"], "matched")
            self.assertEqual(p["match_confidence"], "high")

    def test_six_photo_grid_layout_clickforms(self):
        """Tests 2x3 multi-column grid layout from ClickFORMS 2883 W Devoy Dr."""
        fpath = find_file("26-1037RINV SFR 2883 W DEVOY DR_ ANAHEIM_ CA 92804 FASTAPP.Rev.xml")
        if not fpath:
            self.skipTest("2883 W Devoy Dr XML not found.")

        photos = extract_photos_from_xml(fpath, include_images=False)
        self.assertGreaterEqual(len(photos), 30)

        # Page 12 has 6 interior photos in 2-column grid
        p12 = [p for p in photos if p["page"] == 12]
        self.assertEqual(len(p12), 6, f"Page 12 should extract 6 photos, found {len(p12)}")
        p12_caps = [p["caption"] for p in p12]
        self.assertIn("Entry", p12_caps)
        self.assertIn("Living Room w/Fireplace", p12_caps)
        self.assertIn("Kitchen", p12_caps)
        self.assertIn("Carbon monoxide detector", p12_caps)

        # All matched with high confidence
        for p in p12:
            self.assertEqual(p["match_status"], "matched")

    def test_sliced_image_strip_merging_aci(self):
        """Tests merging of sliced image strips from ACI software (36 Park Ave.XML)."""
        fpath = find_file("36 Park Ave.XML")
        if not fpath:
            self.skipTest("36 Park Ave.XML not found.")

        photos = extract_photos_from_xml(fpath, include_images=False)
        self.assertGreaterEqual(len(photos), 18)

        # Page 16 has 3 photos originally split into 30 strips
        p16 = [p for p in photos if p["page"] == 16]
        self.assertEqual(len(p16), 3, "Page 16 must merge 30 slices into 3 unified photos")
        p16_caps = [p["caption"] for p in p16]
        self.assertEqual(p16_caps[0], "Subject Front View")
        self.assertEqual(p16_caps[1], "Subject Rear View")
        self.assertEqual(p16_caps[2], "Subject Street Scene")

    def test_classify_photo_category_logic(self):
        """Unit test for category classifier logic based on caption keywords and page context."""
        # Interior keywords
        self.assertEqual(_classify_photo_category("Master Bedroom", ""), "Subject interior")
        self.assertEqual(_classify_photo_category("Full Bath 1", ""), "Subject interior")
        self.assertEqual(_classify_photo_category("Kitchen with island", ""), "Subject interior")
        self.assertEqual(_classify_photo_category("Hot Water", ""), "Subject interior")
        self.assertEqual(_classify_photo_category("Electrical", ""), "Subject interior")
        self.assertEqual(_classify_photo_category("Rec Room", ""), "Subject interior")
        self.assertEqual(_classify_photo_category("Breakfast Area", ""), "Subject interior")

        # Subject exterior keywords
        self.assertEqual(_classify_photo_category("Subject Front", ""), "Subject property")
        self.assertEqual(_classify_photo_category("Rear Elevation", ""), "Subject property")
        self.assertEqual(_classify_photo_category("Street View", ""), "Subject property")
        self.assertEqual(_classify_photo_category("Balcony", ""), "Subject property")
        self.assertEqual(_classify_photo_category("Garage", ""), "Subject property")

        # Comparable / Rental
        self.assertEqual(_classify_photo_category("Comparable 1", ""), "Comparable property")
        self.assertEqual(_classify_photo_category("Rental 2", ""), "Rental property")

        # Exhibits
        self.assertEqual(_classify_photo_category("Floorplan Sketch", ""), "Building Sketch")
        self.assertEqual(_classify_photo_category("Location Map", ""), "Maps & Aerials")

    def test_uad_pages_presence_detection(self):
        """Verifies detection of UAD Definitions Addendum pages in XML reports."""
        xml_11001 = find_file("11001 NW 44th St # E.xml")
        if xml_11001:
            data = extract_fields_from_xml(xml_11001)
            self.assertTrue(data.get("has_uad_pages"), "11001 NW 44th St must detect UAD pages")
            self.assertEqual(data.get("uad_pages"), [26, 27, 28])
            self.assertEqual(data.get("UAD pages present in the report"), "Present (Pages 26, 27, 28)")
            self.assertEqual(data.get("clean_data", {}).get("UAD pages present in the report"), "Present (Pages 26, 27, 28)")

        xml_jarboe = find_file("2922 Jarboe St (1).xml")
        if xml_jarboe:
            data_j = extract_fields_from_xml(xml_jarboe)
            self.assertTrue(data_j.get("has_uad_pages"), "2922 Jarboe St must detect UAD pages")
            self.assertIn("Present", data_j.get("UAD pages present in the report", ""))


if __name__ == "__main__":
    unittest.main()
