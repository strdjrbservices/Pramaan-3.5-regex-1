import os
import sys
import unittest

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if WORKSPACE_DIR not in sys.path:
    sys.path.insert(0, WORKSPACE_DIR)

try:
    from appraisal_review.api.xml_extractor import extract_fields_from_xml
    from appraisal_review.api.pdf_extractor_offline import extract_fields_from_pdf_offline
except ModuleNotFoundError:
    from api.xml_extractor import extract_fields_from_xml
    from api.pdf_extractor_offline import extract_fields_from_pdf_offline
XML_FILE = os.path.join(WORKSPACE_DIR, "5580 Paradise Dr.xml")
PDF_FILE = os.path.join(WORKSPACE_DIR, "5580 Paradise Dr.pdf")


class Test1004CExtraction(unittest.TestCase):

    def test_xml_1004c_extraction(self):
        if not os.path.exists(XML_FILE):
            self.skipTest(f"XML sample file not found: {XML_FILE}")

        data = extract_fields_from_xml(XML_FILE, extract_images=False)
        self.assertIsNotNone(data)

        # 1. Verify detected Form Type
        form_type = data.get("form_type")
        self.assertEqual(form_type, "1004C", f"Expected form_type '1004C', got {form_type}")

        # 2. Verify Reconciliation Market Value
        clean_data = data.get("clean_data", {})
        recon = clean_data.get("Reconciliation", {})
        market_val = recon.get("opinion of the market value, as defined, of the real property that is the subject of this report is $") or recon.get("Final Value $")
        self.assertIn("214,000", str(market_val), f"Expected market value '$214,000', got {market_val}")

        # 3. Verify Manufactured Home Fields in clean_data
        mh = clean_data.get("Manufactured Home", {})
        self.assertTrue(len(mh) > 10, f"Expected >10 manufactured home keys, got {len(mh)}")
        self.assertIn("CMH MANUFACTURING", mh.get("Manufacturer's Name", "").upper())
        self.assertIn("HWC411638", mh.get("HUD Certification Label #(s)", ""))
        self.assertEqual(mh.get("# of Sections"), "2")
        self.assertEqual(mh.get("Is the manufactured home attached to a permanent foundation system?"), "Yes")
        self.assertEqual(mh.get("Have the towing hitch, wheels, and axles been removed?"), "Yes")

        # 4. Verify Improvements section contains manufactured home fields
        imp = clean_data.get("Improvements", {})
        self.assertEqual(imp.get("# of Sections"), "2")
        self.assertEqual(imp.get("Is the manufactured home attached to a permanent foundation system?"), "Yes")
        self.assertEqual(imp.get("Skirting"), "Synthetic Panel / C3")
        self.assertEqual(imp.get("Foundation Type"), "Concrete Runners")
        self.assertEqual(imp.get("Concrete Runners"), "Yes")
        self.assertEqual(imp.get("# of Units"), "1")
        self.assertIn("Covered Porch", imp.get("Describe any additions or modifications (decks, rooms, remodeling, etc.):", ""))
        self.assertIn("Covered Porch", imp.get("Describe any additions or modifications (decks, rooms, remodeling, etc.)", ""))
        self.assertTrue(imp.get("Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?", "").startswith("Yes"))

        # 5. Verify 3 Site questions for 1004C
        site = clean_data.get("Site", {})
        self.assertEqual(site.get("Is the site size, shape and topography generally conforming to and acceptable in the market area? Yes No If No, explain"), "Yes")
        self.assertEqual(site.get("Is there adequate vehicular access to the subject property? Yes No If No, describe"), "Yes")
        self.assertEqual(site.get("Is the street properly maintained? Yes No If No, describe"), "Yes")

        # 6. Verify Project Type in Subject for 1004C
        subj = clean_data.get("Subject", {})
        self.assertIn("Project Type (if applicable):-  PUD  / Condominium / Cooperative / Other (describe)", subj)

        # 7. Verify Contract 1004C Fields
        contract = clean_data.get("Contract", {})
        mfg_inv_q = "I did did not analyze the manufacturer’s invoice. Explain the results of the analysis of the manufacturer’s invoice or why the analysis was not performed."
        self.assertIn(mfg_inv_q, contract)
        self.assertIn("in Place", contract.get(mfg_inv_q, ""))
        self.assertEqual(contract.get("Retailer's Name (New Construction)"), "Unknown")

        # 8. Verify Cost Approach 1004C Fields in XML
        cost = clean_data.get("Cost Approach", {})
        self.assertEqual(cost.get("Source of cost data"), "Known Local Business Cost")
        self.assertEqual(cost.get("Effective date of cost data"), "11/26")
        self.assertEqual(cost.get("Quality rating from cost service"), "Good")
        self.assertEqual(cost.get("OPINION OF SITE VALUE"), "10,000")
        self.assertEqual(cost.get("Section One Cost $"), "121,440")
        self.assertEqual(cost.get("Section Two Cost $"), "121,440")
        self.assertEqual(cost.get("Indicated Value by Cost Approach"), "218,225")
        self.assertIn(cost.get("Total Gross Living Area"), ["2,111.8", "2,112"])
        self.assertEqual(clean_data.get("Improvements", {}).get("Square Feet of Gross Living Area Above Grade"), "2,112")
        self.assertEqual(clean_data.get("Sales Grid", {}).get("Subject", {}).get("Gross Living Area"), "2,112")

    def test_pdf_1004c_extraction(self):
        if not os.path.exists(PDF_FILE):
            self.skipTest(f"PDF sample file not found: {PDF_FILE}")

        data = extract_fields_from_pdf_offline(PDF_FILE)
        self.assertIsNotNone(data)

        # 1. Verify detected Form Type
        form_type = data.get("form_type")
        self.assertEqual(form_type, "1004C", f"Expected form_type '1004C', got {form_type}")

        # 2. Verify Reconciliation Market Value
        clean_data = data.get("clean_data", {})
        recon = clean_data.get("Reconciliation", {})
        market_val = recon.get("opinion of the market value, as defined, of the real property that is the subject of this report is $") or recon.get("Final Value $")
        self.assertIn("214,000", str(market_val), f"Expected market value '$214,000', got {market_val}")

        # 3. Verify Manufactured Home Fields in clean_data
        mh = clean_data.get("Manufactured Home", {})
        self.assertTrue(len(mh) > 10, f"Expected >10 manufactured home keys, got {len(mh)}")
        self.assertIn("CMH MANUFACTURING", mh.get("Manufacturer's Name", "").upper())
        self.assertIn("HWC411638", mh.get("HUD Certification Label #(s)", ""))
        self.assertEqual(mh.get("# of Sections"), "2")
        self.assertEqual(mh.get("Is the manufactured home attached to a permanent foundation system?"), "Yes")
        self.assertEqual(mh.get("Have the towing hitch, wheels, and axles been removed?"), "Yes")

        # 4. Verify Contract 1004C Fields in PDF
        contract = clean_data.get("Contract", {})
        mfg_inv_q = "I did did not analyze the manufacturer’s invoice. Explain the results of the analysis of the manufacturer’s invoice or why the analysis was not performed."
        self.assertIn(mfg_inv_q, contract)
        self.assertIn("in Place", contract.get(mfg_inv_q, ""))
        self.assertEqual(contract.get("Retailer's Name (New Construction)"), "Unknown")

        # 5. Verify Cost Approach 1004C Fields in PDF
        cost = clean_data.get("Cost Approach", {})
        self.assertEqual(cost.get("Source of cost data"), "Known Local Business Cost")
        self.assertEqual(cost.get("Effective date of cost data"), "11/26")
        self.assertEqual(cost.get("Quality rating from cost service"), "Good")
        self.assertEqual(cost.get("OPINION OF SITE VALUE"), "10,000")
        self.assertEqual(cost.get("Section One Cost $"), "121,440")
        self.assertEqual(cost.get("Section Two Cost $"), "121,440")
        self.assertEqual(cost.get("Indicated Value by Cost Approach"), "218,225")
        self.assertIn(cost.get("Total Gross Living Area"), ["2,111.8", "2,112"])


if __name__ == "__main__":
    unittest.main()
