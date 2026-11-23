import os
import json
from contract_reconciliation import (
    compare_contract_to_report,
    extract_appraisal_source,
    ContractPdfExtractor,
    clean_currency,
    parse_date_to_iso,
    names_match,
    addresses_match
)

def test_unit_normalizers():
    print("--- Testing Unit Normalizers ---")
    assert clean_currency("$600,000.00") == 600000.0
    assert clean_currency("92u.0uu.uu") == 920000.0
    assert clean_currency("828.000.00") == 828000.0
    assert clean_currency("1,275,000") == 1275000.0
    assert clean_currency("895,000.00.") == 895000.0
    assert clean_currency(None) is None

    assert parse_date_to_iso("2026-10-22") == "2026-10-22"
    assert parse_date_to_iso("11/04/2026") == "2026-11-04"
    assert parse_date_to_iso("9/28/26") == "2026-09-28"
    assert parse_date_to_iso("23/10/2026") == "2026-10-23"
    assert parse_date_to_iso("October 23, 2026") == "2026-10-23"
    assert parse_date_to_iso("Nov 10, 2026") == "2026-11-10"

    # Name matching tests
    assert names_match("Light Homes LLC", "LIGHT HOMES LLC") is True
    assert names_match("ANA C GALVEZ", "Anna C. Galvez") is True
    assert names_match("Adam Glauberg", "Adam Glauberg, Mara Glauberg") is True
    assert names_match("312 Lovijoy LLC", "Jessica Rodriguez-Fuenmayor") is False

    # Address matching tests
    assert addresses_match("3342 Fairfield Ave, Cincinnati, OH 45207", "3342 Fairfield Ave, Cincinnati, 45207, Hamilton") is True
    assert addresses_match("413 51st St, West New York, NJ 07093", "413 51st Street, West New York, New Jersey 0709") is True
    assert addresses_match("123 Main St", "456 Elm St") is False

    print("✓ Normalizer and party matcher tests passed!")

def run_suite():
    test_unit_normalizers()

    test_cases = [
        {
            "name": "410 Ocean Park Ave (New Jersey Digital)",
            "report_xml": "test_contracts/410OceanParkAveBradleyBeachNJ07720.xml",
            "report_pdf": "test_contracts/410OceanParkAveBradleyBeachNJ07720.pdf",
            "contract": "test_contracts/Purchase Contract 11-05 08_15 PM.pdf",
            "expected_price": 1275000.0,
            "expected_date": "2026-10-27",
        },
        {
            "name": "413 51st St (New Jersey Scanned/OCR)",
            "report_xml": "test_contracts/413 51st St (1).xml",
            "report_pdf": "test_contracts/413 51st St (1).pdf",
            "contract": "test_contracts/Sales Contract.pdf",
            "expected_price": 920000.0,
            "expected_dates": ["2026-09-27", "2026-09-28"],
        },
        {
            "name": "1110 E Rutgers Ln (Texas One to Four Family)",
            "report_xml": "test_contracts/1110ERutgersLnDeerParkTX77536.xml",
            "report_pdf": "test_contracts/1110ERutgersLnDeerParkTX77536.pdf",
            "contract": "test_contracts/Contract_1.pdf",
            "expected_price": 215000.0,
        },
        {
            "name": "North Carolina Standard Form 2-T (COS.pdf)",
            "report_xml": "test_contracts/1917 Roderick Ln.xml",
            "contract": "test_contracts/COS.pdf",
            "expected_price": 579000.0,
            "expected_dates": ["2026-11-06", "2026-11-07"],
        },
        {
            "name": "Generic Bilateral Contract (Purchase Contract.pdf)",
            "report_xml": "test_contracts/1917 Roderick Ln.xml",
            "contract": "test_contracts/Purchase Contract.pdf",
            "expected_price": 262000.0,
            "expected_dates": ["2026-10-23", "2026-10-25"],
        },
        {
            "name": "Addendum to Sales Contract (413 51st St)",
            "report_xml": "test_contracts/413 51st St.xml",
            "report_pdf": "test_contracts/413 51st St.pdf",
            "contract": "test_contracts/Addendum to Sales Contract.pdf",
            "expected_price": 895000.0,
            "expected_date": "2026-11-04",
        },
        {
            "name": "Ohio Contract to Purchase (3342 Fairfield Ave)",
            "report_xml": "test_contracts/3342 Fairfield Ave (1).xml",
            "report_pdf": "test_contracts/3342 Fairfield Ave.pdf",
            "contract": "test_contracts/ContracttoPurchase (1).pdf",
            "expected_price": 525000.0,
            "expected_date": "2026-11-10",
        }
    ]

    for tc in test_cases:
        print("\n" + "=" * 70)
        print(f"RUNNING: {tc['name']}")
        print("=" * 70)

        # 1. Contract Extraction
        extractor = ContractPdfExtractor(tc["contract"])
        c_res = extractor.extract()
        print(f"Contract Family:   {c_res['form_family']}")
        print(f"Contract Price:    ${c_res['price']:,.2f}" if c_res['price'] else "Contract Price:    None")
        print(f"Contract BestDate: {c_res['date']}")
        print(f"Contract AllDates: {c_res['all_dates']}")

        if "expected_price" in tc:
            assert c_res["price"] == tc["expected_price"], f"Expected price {tc['expected_price']}, got {c_res['price']}"
            print("✓ Price extracted correctly!")

        if "expected_date" in tc:
            assert c_res["date"] == tc["expected_date"], f"Expected date {tc['expected_date']}, got {c_res['date']}"
            print("✓ Date extracted correctly!")

        if "expected_dates" in tc:
            assert c_res["date"] in tc["expected_dates"], f"Expected date in {tc['expected_dates']}, got {c_res['date']}"
            print(f"✓ Date extracted correctly ({c_res['date']})!")

        # 2. XML Reconciliation
        if "report_xml" in tc and os.path.exists(tc["report_xml"]):
            res_xml = compare_contract_to_report(tc["report_xml"], tc["contract"])
            print("\nReconciliation against XML:")
            print(json.dumps(res_xml, indent=2))

        # 3. PDF Reconciliation
        if "report_pdf" in tc and os.path.exists(tc["report_pdf"]):
            res_pdf = compare_contract_to_report(tc["report_pdf"], tc["contract"])
            print("\nReconciliation against Appraisal PDF:")
            print(json.dumps(res_pdf, indent=2))

    print("\n" + "#" * 70)
    print("ALL TEST CASES COMPLETED SUCCESSFULLY!")
    print("#" * 70)

if __name__ == "__main__":
    run_suite()
