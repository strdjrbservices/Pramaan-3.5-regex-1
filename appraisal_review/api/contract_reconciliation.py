"""
Real Estate Contract Copy Extraction & Appraisal Reconciliation Engine.

Production-grade, 100% deterministic Python module that extracts the Purchase Price
and Contract Date(s) from real estate purchase contract copies (digital vector text,
flattened DocuSign, or scanned paper copies) and reconciles them against an Appraisal
Report (provided as MISMO 2.6 / 3.x XML or Fannie Mae / Freddie Mac appraisal PDF
like Form 1004 / 1025 / 1073 / UAD 3.6).
"""

import os
import re
import sys
import json
import argparse
from typing import Dict, Any, List, Optional, Union
import xml.etree.ElementTree as ET
import pymupdf as fitz


# ==============================================================================
# 1. Utility Normalizers
# ==============================================================================

def clean_currency(val: Union[str, int, float, None]) -> Optional[float]:
    """
    Cleans and normalizes currency strings into floats.
    Handles OCR letter-for-digit confusions (u, U, o, O, D misread as 0)
    and removes extraneous formatting.
    """
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)

    s = str(val).strip().rstrip('.,;:!?')
    if not s:
        return None

    # Remove currency symbol and standard whitespace
    s = re.sub(r'[\$\s]', '', s)

    # Normalize common OCR letter-for-digit confusions (e.g., 92u.0uu.uu -> 920.000.00)
    s = re.sub(r'(?<=\d)[uUoOD](?=\d|\.|$)', '0', s)
    s = re.sub(r'(?<=[\d,.])[uUoO](?=[\d,.])', '0', s)
    s = s.replace('u', '0').replace('U', '0').replace('o', '0').replace('O', '0')

    # Remove anything that isn't a digit or a period
    cleaned = re.sub(r"[^\d.]", "", s).rstrip('.')
    if not cleaned:
        return None

    # Handle multiple periods (common in OCR misreading commas as periods, e.g. 920.000.00)
    parts = cleaned.split('.')
    if len(parts) > 2:
        val_str = ''.join(parts[:-1]) + '.' + parts[-1]
    else:
        val_str = cleaned

    try:
        return float(val_str)
    except ValueError:
        return None


def parse_date_to_iso(date_str: Optional[str]) -> Optional[str]:
    """
    Parses diverse contractual and appraisal date formats into standard ISO (YYYY-MM-DD).
    Supports ISO (YYYY-MM-DD), US (MM/DD/YYYY, MM/DD/YY), European/Military (DD/MM/YYYY),
    and full/abbreviated textual dates (e.g. October 23, 2026 or 23-Oct-2026).
    """
    if not date_str:
        return None

    s = str(date_str).strip()
    # Remove leading/trailing non-alphanumeric punctuation (brackets, quotes, colons)
    s = re.sub(r'^[^\w]+|[^\w]+$', '', s)
    if not s:
        return None

    # Replace OCR letter-for-digit confusions in date numbers (e.g., 1O/23/2O26 -> 10/23/2026)
    s = re.sub(r'(?<=\d)[oO](?=\d|\b|[-/.])', '0', s)
    s = re.sub(r'(?<=/)[oO](?=/)', '0', s)
    s = re.sub(r'\b[oO](?=\d)', '0', s)

    # 1. ISO: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    m1 = re.match(r"^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$", s)
    if m1:
        y, m, d = int(m1.group(1)), int(m1.group(2)), int(m1.group(3))
        if 1 <= m <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{m:02d}-{d:02d}"

    # 2. Slash/Dash/Dot format: MM/DD/YYYY or DD/MM/YYYY or MM/DD/YY
    m2 = re.match(r"^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$", s)
    if m2:
        p1, p2, p3 = int(m2.group(1)), int(m2.group(2)), int(m2.group(3))
        y = p3 + 2000 if p3 < 100 else p3

        # Check if first part is month or day
        if p1 > 12 and p2 <= 12:
            # DD/MM/YYYY
            d, m = p1, p2
        else:
            # MM/DD/YYYY (Standard US)
            m, d = p1, p2

        if 1 <= m <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{m:02d}-{d:02d}"

    # 3. Textual Month Names
    months = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    }

    # Month Day, Year (e.g. "October 23, 2026", "Oct 23 2026", "October 23rd, 2026")
    m3 = re.search(r"([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{2,4})", s)
    if m3:
        p = m3.group(1).lower()[:3]
        if p in months:
            y = int(m3.group(3))
            y = y + 2000 if y < 100 else y
            d = int(m3.group(2))
            m = months[p]
            if 1 <= d <= 31:
                return f"{y:04d}-{m:02d}-{d:02d}"

    # Day Month Year (e.g. "23rd October 2026", "23 Oct 2026")
    m4 = re.search(r"(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]{3,9}),?\s+(\d{2,4})", s)
    if m4:
        p = m4.group(2).lower()[:3]
        if p in months:
            y = int(m4.group(3))
            y = y + 2000 if y < 100 else y
            d = int(m4.group(1))
            m = months[p]
            if 1 <= d <= 31:
                return f"{y:04d}-{m:02d}-{d:02d}"

    return None


# ==============================================================================
# 2. Offline OCR Helper
# ==============================================================================

def get_offline_easyocr_reader():
    """
    Instantiates an offline EasyOCR reader looking in project-local or user directories.
    Ensures download_enabled=False for strictly deterministic, air-gapped execution.
    """
    try:
        import easyocr
    except ImportError:
        return None

    # Candidate model directories
    cand_dirs = [
        os.path.join(os.getcwd(), ".easyocr_models"),
        os.path.join(os.path.dirname(__file__), ".easyocr_models"),
        os.path.expanduser(r"~/.EasyOCR/model"),
        r"C:\Users\INTEL\.EasyOCR\model",
    ]

    model_dir = None
    for d in cand_dirs:
        if os.path.exists(d):
            # Check if models exist in directory
            try:
                files = os.listdir(d)
                if any("craft" in f.lower() or ".pth" in f.lower() for f in files):
                    model_dir = d
                    break
            except Exception:
                pass

    try:
        if model_dir:
            return easyocr.Reader(
                ['en'],
                model_storage_directory=model_dir,
                user_network_directory=model_dir,
                download_enabled=False,
                gpu=False
            )
        else:
            return easyocr.Reader(['en'], download_enabled=False, gpu=False)
    except Exception:
        return None


# ==============================================================================
# 3. Contract PDF Extractor
# ==============================================================================

class ContractPdfExtractor:
    """
    Extracts Purchase Price and Contract Date milestones from real estate purchase contracts.
    Implements dual-pass text ingestion (digital first + OCR fallback), form family
    detection, OCR noise correction, and mathematical invariant verification.
    """

    def __init__(self, pdf_path: str, easyocr_reader=None):
        self.pdf_path = pdf_path
        self.doc = fitz.open(pdf_path)
        self.reader = easyocr_reader
        self._page_cache: Dict[int, str] = {}
        self._reader_attempted = False

    def _ensure_reader(self):
        if self.reader is None and not self._reader_attempted:
            self._reader_attempted = True
            self.reader = get_offline_easyocr_reader()

    def get_text(self, page_num: int) -> str:
        """
        Retrieves text for a 1-based page number.
        Uses digital PyMuPDF extraction first. If the page has fewer than 25 alphanumeric
        characters (indicating scanned image or custom font subset glyphs), triggers OCR.
        """
        if page_num in self._page_cache:
            return self._page_cache[page_num]

        if page_num < 1 or page_num > len(self.doc):
            return ""

        page = self.doc[page_num - 1]
        raw_txt = page.get_text("text").strip()

        # Check alphanumeric characters to detect scanned, empty, or custom-font garbled pages
        alnum_chars = re.findall(r'[a-zA-Z0-9]', raw_txt)
        control_chars = re.findall(r'[\x00-\x1f\x7f-\x9f]', raw_txt)

        # Trigger OCR if < 25 alphanumeric chars or excessive control/glyph characters
        needs_ocr = (len(alnum_chars) < 25) or (len(raw_txt) > 0 and len(control_chars) / len(raw_txt) > 0.3)

        if needs_ocr:
            self._ensure_reader()
            if self.reader:
                try:
                    pix = page.get_pixmap(dpi=150)
                    results = self.reader.readtext(pix.tobytes("png"))
                    ocr_txt = " ".join([r[1] for r in results])
                    if ocr_txt.strip():
                        # Append OCR text to ensure standard English titles and form labels are available
                        raw_txt = f"{raw_txt}\n{ocr_txt}".strip()
                except Exception:
                    pass

        self._page_cache[page_num] = raw_txt
        return raw_txt

    def extract(self) -> Dict[str, Any]:
        """
        Classifies form family and extracts purchase price and contractual date milestones.
        Returns a dict containing:
          - price: float or None
          - date: ISO date string of highest-priority milestone
          - all_dates: dict of milestone -> ISO date string
          - form_family: detected form family
        """
        # Step 1: Detect form family progressively (start with page 1 to save unnecessary OCR passes)
        header = self.get_text(1)
        header_upper = header.upper()

        def _matches_family(h_up: str) -> Optional[str]:
            if "CALIFORNIA RESIDENTIAL PURCHASE AGREEMENT" in h_up or "C.A.R. FORM RPA" in h_up:
                return "California C.A.R. Form RPA"
            if "NEW JERSEY REALTORS" in h_up or "FORM OF REAL ESTATE SALES CONTRACT" in h_up or "FORM 118-STATEWIDE" in h_up:
                return "New Jersey REALTORS Standard Form"
            if "STANDARD FORM 2-T" in h_up or "OFFER TO PURCHASE AND CONTRACT" in h_up or "NC REALTORS" in h_up:
                return "North Carolina Standard Form 2-T"
            if "ONE TO FOUR FAMILY RESIDENTIAL CONTRACT" in h_up or "TREC NO." in h_up or "TEXAS REAL ESTATE COMMISSION" in h_up:
                return "Texas TREC One to Four Family"
            if any(k in h_up for k in [
                "ADDENDUM TO THE CONTRACT", "ADDENDUM TO CONTRACT", "ADDENDUM TO SALES CONTRACT",
                "ADDENDUM TO PURCHASE", "CONTRACT ADDENDUM", "AMENDMENT TO CONTRACT",
                "AMENDMENT TO SALES CONTRACT", "AMENDMENT TO PURCHASE", "ADDENDUM TO THE PURCHASE", "ADDENDUM NO"
            ]):
                return "Contract Addendum / Amendment"
            if "CONTRACT TO PURCHASE" in h_up:
                if "OHIO" in h_up or "OHIO REALTORS" in h_up or "CINCINNATI" in h_up:
                    return "Ohio REALTORS Contract to Purchase"
                return "Contract to Purchase"
            return None

        detected_family = _matches_family(header_upper)

        # If not matched on page 1, check pages 2 and 3
        if not detected_family:
            for p_num in range(2, min(4, len(self.doc) + 1)):
                header += " " + self.get_text(p_num)
            header_upper = header.upper()
            detected_family = _matches_family(header_upper)

        # If still not detected and total text is sparse, try OCR on page 1
        if not detected_family and len(re.findall(r'[a-zA-Z]', header)) < 50:
            self._ensure_reader()
            if self.reader and len(self.doc) > 0:
                try:
                    pix = self.doc[0].get_pixmap(dpi=150)
                    res = self.reader.readtext(pix.tobytes("png"))
                    ocr_hdr = " ".join([r[1] for r in res])
                    header += "\n" + ocr_hdr
                    header_upper = header.upper()
                    detected_family = _matches_family(header_upper)
                except Exception:
                    pass

        price: Optional[float] = None
        dates: Dict[str, str] = {}
        concessions: Optional[float] = None
        form_family = detected_family or "Generic Bilateral Contract"

        # ----------------------------------------------------------------------
        # Form Family 1: California C.A.R. Form RPA
        # ----------------------------------------------------------------------
        if form_family == "California C.A.R. Form RPA":
            for p in range(1, min(5, len(self.doc) + 1)):
                txt = self.get_text(p)
                m_p = re.search(r"PURCHASE\s+PRICE\s+TOTAL.*?\$\s*([\d,]+(?:\.\d{2})?)", txt, re.I | re.DOTALL)
                if not m_p:
                    m_p = re.search(r"PURCHASE\s+PRICE.*?\$?\s*([\d,]+(?:\.\d{2})?)", txt, re.I)
                if m_p and not price:
                    price = clean_currency(m_p.group(1))

                m_d = re.search(r"Date\s+Prepared:\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", txt, re.I)
                if m_d and "date_prepared" not in dates:
                    iso = parse_date_to_iso(m_d.group(1))
                    if iso:
                        dates["date_prepared"] = iso

            # Check signature / acceptance pages for Effective / Acceptance Date
            for p in range(max(1, len(self.doc) - 3), len(self.doc) + 1):
                txt = self.get_text(p)
                m_acc = re.search(r"(?:ACCEPTANCE\s+OF\s+OFFER|Confirmation\s+of\s+Acceptance).*?Date\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", txt, re.I | re.DOTALL)
                if m_acc and "effective_date" not in dates:
                    iso = parse_date_to_iso(m_acc.group(1))
                    if iso:
                        dates["effective_date"] = iso
                m_b = re.search(r"Buyer\s+Signature.*?Date\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", txt, re.I | re.DOTALL)
                if m_b and "buyer_signed" not in dates:
                    iso = parse_date_to_iso(m_b.group(1))
                    if iso:
                        dates["buyer_signed"] = iso

        # ----------------------------------------------------------------------
        # Form Family 2: New Jersey REALTORS Standard Form
        # ----------------------------------------------------------------------
        elif form_family == "New Jersey REALTORS Standard Form":
            p2 = self.get_text(2)

            # Direct regex for Total Purchase Price
            m_p = re.search(r"TOTAL\s+PURCHASE\s+PRICE\s*[:\-.]*\s*([0-9.,uUoOD]+)", p2, re.I)
            if m_p:
                price = clean_currency(m_p.group(1))

            # Mathematical invariant components: Initial Deposit + Additional Deposit + Mortgage = Price
            m_init = re.search(r"INITIAL\s+DEPOSIT\s*[:\-.]*\s*([0-9.,uUoOD]+)", p2, re.I)
            m_dep = re.search(r"ADDITIONAL\s+DEPOSIT\s*[:\-.]*\s*([0-9.,uUoOD]+)", p2, re.I)
            m_mort = re.search(r"MORTGAGE\s*[:\-.]*\s*([0-9.,uUoOD]+)", p2, re.I)

            init_val = clean_currency(m_init.group(1)) if m_init else 0.0
            dep_val = clean_currency(m_dep.group(1)) if m_dep else None
            mort_val = clean_currency(m_mort.group(1)) if m_mort else None

            # Handle contracts (digital or OCR) where values appear in candidate list
            nums = re.findall(r"\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b", p2)
            cands = sorted(list(set(clean_currency(n) for n in nums if clean_currency(n))), reverse=True)

            if not price and cands:
                # Check if largest candidate equals the sum of two or more other candidates
                top = cands[0]
                rest = cands[1:]
                import itertools
                matched_sum = False
                for r in range(1, len(rest) + 1):
                    for combo in itertools.combinations(rest, r):
                        if abs(sum(combo) - top) < 1.0:
                            price = top
                            matched_sum = True
                            break
                    if matched_sum:
                        break
                if not price:
                    price = top

            # Mathematical Invariant Validation: Additional Deposit + Mortgage == Purchase Price
            if dep_val and mort_val:
                comp_sum = (init_val or 0.0) + dep_val + mort_val
                # If price is missing or differs from invariant sum by more than $1000, correct it
                if not price or abs(comp_sum - price) > 1000:
                    price = comp_sum
                elif abs((dep_val + mort_val) - price) <= 1.0:
                    price = dep_val + mort_val

            # Dates: Signature milestones on Page 14 (or last pages)
            sig_page_idx = 14 if len(self.doc) >= 14 else len(self.doc)
            p_sig = self.get_text(sig_page_idx)

            # Seller execution date (Effective Date)
            m_seller = re.search(r"SELLER[^\n\r]*?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", p_sig, re.I)
            if m_seller:
                iso = parse_date_to_iso(m_seller.group(1))
                if iso:
                    dates["effective_date"] = iso
                    dates["seller_signed"] = iso

            # Buyer execution date
            m_buyer = re.search(r"BUYER[^\n\r]*?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", p_sig, re.I)
            if m_buyer:
                iso = parse_date_to_iso(m_buyer.group(1))
                if iso:
                    dates["buyer_signed"] = iso

            # If not found by labels, scan for dates on the signature page
            if not dates:
                found_dates = re.findall(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", p_sig)
                if found_dates:
                    dates["effective_date"] = parse_date_to_iso(found_dates[-1])
                    if len(found_dates) > 1:
                        dates["buyer_signed"] = parse_date_to_iso(found_dates[0])

        # ----------------------------------------------------------------------
        # Form Family 3: North Carolina Standard Form 2-T
        # ----------------------------------------------------------------------
        elif "STANDARD FORM 2-T" in header_upper or "OFFER TO PURCHASE AND CONTRACT" in header_upper or "NC REALTORS" in header_upper:
            form_family = "North Carolina Standard Form 2-T"
            p1 = self.get_text(1)

            # Purchase Price
            m_p = re.search(r'["\']?Purchase\s+Price["\']?\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{2})?)', p1, re.I)
            if m_p:
                price = clean_currency(m_p.group(1))

            # Invariant check for NC 2-T: Due Diligence Fee + Earnest Money + Balance = Purchase Price
            m_dd = re.search(r"Due\s+Diligence\s+Fee.*?\$?\s*([\d,]+(?:\.\d{2})?)", p1, re.I | re.DOTALL)
            m_em = re.search(r"Initial\s+Earnest\s+Money.*?\$?\s*([\d,]+(?:\.\d{2})?)", p1, re.I | re.DOTALL)
            m_bal = re.search(r"BALANCE\s+of\s+the\s+Purchase\s+Price.*?\$?\s*([\d,]+(?:\.\d{2})?)", p1, re.I | re.DOTALL)

            dd_val = clean_currency(m_dd.group(1)) if m_dd else None
            em_val = clean_currency(m_em.group(1)) if m_em else None
            bal_val = clean_currency(m_bal.group(1)) if m_bal else None

            if dd_val and em_val and bal_val:
                inv_sum = dd_val + em_val + bal_val
                if not price or abs(inv_sum - price) > 1000:
                    price = inv_sum

            # If price still missing or < 10000, search for largest currency figure on page 1
            if not price or price < 10000:
                all_nums = re.findall(r"\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b", p1)
                cf_list = [clean_currency(n) for n in all_nums if clean_currency(n) and clean_currency(n) > 10000]
                if cf_list:
                    price = max(cf_list)

            # Dates: Signature milestones on Page 12 (or signature page)
            sig_page_idx = 12 if len(self.doc) >= 12 else len(self.doc)
            p_sig = self.get_text(sig_page_idx)

            # Dates associated with signatures: (Date) MM/DD/YYYY
            d_list = re.findall(r"(?:\(Date\)|Date\s*[:\)]?)\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", p_sig, re.I)
            if not d_list:
                d_list = re.findall(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", p_sig)

            if d_list:
                iso_dates = [parse_date_to_iso(d) for d in d_list if parse_date_to_iso(d)]
                if iso_dates:
                    # Filter out revision date 8/2026
                    valid_iso = [d for d in iso_dates if not d.startswith("2026-08")]
                    dates_to_use = valid_iso if valid_iso else iso_dates
                    dates["effective_date"] = dates_to_use[-1]
                    dates["seller_signed"] = dates_to_use[-1]
                    dates["buyer_signed"] = dates_to_use[0]

        # ----------------------------------------------------------------------
        # Form Family 4: Texas TREC One to Four Family Residential Contract
        # ----------------------------------------------------------------------
        elif "ONE TO FOUR FAMILY RESIDENTIAL CONTRACT" in header_upper or "TREC NO." in header_upper or "TEXAS REAL ESTATE COMMISSION" in header_upper:
            form_family = "Texas TREC One to Four Family"
            p1 = self.get_text(1)

            # 3. SALES PRICE: A. Cash + B. Financing = C. Sales Price
            m_c = re.search(r"Sales\s+Price\s*\(Sum\s+of\s+A\s+and\s+B\)[^\n\r]*?\$?\s*([0-9.,]+)", p1, re.I)
            if m_c:
                price = clean_currency(m_c.group(1))

            # Mathematical Invariant: Cash + Financing = Sales Price
            m_cash = re.search(r"Cash\s+portion\s+of\s+Sales\s+Price[^\n\r]*?\$?\s*([0-9.,]+)", p1, re.I)
            m_fin = re.search(r"Sum\s+of\s+all\s+financing[^\n\r]*?\$?\s*([0-9.,]+)", p1, re.I)

            cash_val = clean_currency(m_cash.group(1)) if m_cash else None
            fin_val = clean_currency(m_fin.group(1)) if m_fin else None

            if not price:
                # Digits at the bottom of the form block
                nums = re.findall(r"\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b", p1)
                cf_list = [clean_currency(n) for n in nums if clean_currency(n)]
                # Check if two sum to a third
                for c1 in cf_list:
                    for c2 in cf_list:
                        if c1 != c2 and (c1 + c2) in cf_list:
                            cash_val, fin_val, price = c1, c2, (c1 + c2)
                            break

            if cash_val and fin_val:
                inv_sum = cash_val + fin_val
                if not price or abs(inv_sum - price) > 1.0:
                    price = inv_sum

            # Dates: Execution / Acceptance date on Page 9 or 10 or Addenda
            for p_idx in range(9, min(len(self.doc) + 1, 15)):
                txt_p = self.get_text(p_idx)
                m_exec = re.search(r"EXECUTED\s+the\s*(\d{1,2})?\s*day\s+of\s*([A-Za-z]+)?,?\s*20(\d{2})", txt_p, re.I)
                if m_exec and m_exec.group(1) and m_exec.group(2):
                    iso = parse_date_to_iso(f"{m_exec.group(2)} {m_exec.group(1)}, 20{m_exec.group(3)}")
                    if iso:
                        dates["effective_date"] = iso
                # Check for generic dates near signatures
                dates_found = re.findall(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", txt_p)
                valid_d = [d for d in dates_found if d not in ("05-04-2026", "11-04-2024", "11-15-18")]
                if valid_d and "effective_date" not in dates:
                    iso = parse_date_to_iso(valid_d[-1])
                    if iso:
                        dates["effective_date"] = iso
                        dates["seller_signed"] = iso

        # ----------------------------------------------------------------------
        # Form Family 5: Contract Addendum / Amendment
        # ----------------------------------------------------------------------
        elif form_family == "Contract Addendum / Amendment":
            all_text = " ".join([self.get_text(p) for p in range(1, len(self.doc) + 1)])

            # 1. Price patterns specific to Addenda & Amendments
            addendum_price_patterns = [
                r'setting\s+(?:the\s+)?(?:contract\s+)?(?:purchase|sales)?\s*price\s+(?:at|to)\s*[$]?\s*([0-9.,uUoOD]+)',
                r'(?:new|amended|revised|agreed)\s+(?:contract\s+)?(?:purchase|sales)\s+price\s*(?:is|shall\s+be|of)?\s*[:\-]?\s*(?:at|to)?\s*[$]?\s*([0-9.,uUoOD]+)',
                r'(?:purchase|sales)\s+price\s+(?:is|shall\s+be)?\s*(?:hereby\s+)?(?:amended|changed|modified|adjusted|set|reduced|increased)\s*(?:to|at)\s*[:\-]?\s*[$]?\s*([0-9.,uUoOD]+)',
                r'from\s+[$]?\s*[\d,.]+\s+to\s+[$]?\s*([0-9.,uUoOD]+)',
                r'(?:Purchase\s+Price|Sales\s+Price|sum\s+of)\s*(?:shall\s+be|is)?\s*[:\-]?\s*[$]?\s*([0-9.,uUoOD]+)',
            ]

            for pat in addendum_price_patterns:
                m_p = re.search(pat, all_text, re.I)
                if m_p:
                    c_val = clean_currency(m_p.group(1))
                    if c_val and c_val > 5000:
                        price = c_val
                        break

            if not price:
                nums = re.findall(r"\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b", all_text)
                cands = [clean_currency(n) for n in nums if clean_currency(n) and clean_currency(n) > 10000]
                if cands:
                    price = max(cands)

            # 2. Date patterns in Addenda
            m_dated = re.search(r'DATED\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', all_text, re.I)
            if m_dated:
                iso = parse_date_to_iso(m_dated.group(1))
                if iso:
                    dates["addendum_date"] = iso
                    dates["effective_date"] = iso
                    dates["date_prepared"] = iso

            m_ad = re.search(r'Addendum\s+dated\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', all_text, re.I)
            if m_ad and "addendum_date" not in dates:
                iso = parse_date_to_iso(m_ad.group(1))
                if iso:
                    dates["addendum_date"] = iso
                    dates["effective_date"] = iso

            for p in range(1, len(self.doc) + 1):
                txt_p = self.get_text(p)
                m_sig_d = re.findall(r'Date\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', txt_p, re.I)
                for sd in m_sig_d:
                    iso = parse_date_to_iso(sd)
                    if iso:
                        if "seller_signed" not in dates:
                            dates["seller_signed"] = iso
                        elif "buyer_signed" not in dates:
                            dates["buyer_signed"] = iso

            # 3. Seller Concessions / Credits
            m_cred = re.search(r'credit.*?[$]\s*([0-9.,]+)', all_text, re.I | re.DOTALL)
            if not m_cred:
                m_cred = re.search(r'seller.*?concession.*?[$]\s*([0-9.,]+)', all_text, re.I | re.DOTALL)
            if m_cred:
                concessions_val = clean_currency(m_cred.group(1))
                if concessions_val:
                    concessions = concessions_val

        # ----------------------------------------------------------------------
        # Form Family 6: Ohio REALTORS Contract to Purchase / Standard Contract to Purchase
        # ----------------------------------------------------------------------
        elif form_family in ("Ohio REALTORS Contract to Purchase", "Contract to Purchase"):
            p1_txt = self.get_text(1)

            # 1. Price extraction on Page 1:
            m_p = re.search(r'Purchase\s+Price[^\n\r]*?\$?\s*([0-9.,]+)', p1_txt, re.I)
            if m_p:
                val = clean_currency(m_p.group(1))
                if val and val > 5000:
                    price = val

            # Check candidate currency numbers on Page 1 (e.g. 525,000.00)
            if not price:
                nums = re.findall(r"\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b", p1_txt)
                cands = [clean_currency(n) for n in nums if clean_currency(n) and clean_currency(n) > 10000]
                if cands:
                    price = max(cands)

            # 2. Dates: Check Buyer Certification (Page 12), Seller Certification (Page 13)
            for p_num in range(max(1, len(self.doc) - 3), len(self.doc) + 1):
                txt_p = self.get_text(p_num)
                m_cad = re.search(r'CONTRACT\s+ACCEPTANCE\s+DATE[^\n\r]*?[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', txt_p, re.I)
                if m_cad:
                    iso = parse_date_to_iso(m_cad.group(1))
                    if iso:
                        dates["effective_date"] = iso

                if "BUYER CERTIFICATION" in txt_p or "Signature of Buyer" in txt_p:
                    d_list = re.findall(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', txt_p)
                    d_text = re.findall(r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b', txt_p, re.I)
                    for d in d_list + d_text:
                        if "May 20, 2025" in d or "Copyright" in d:
                            continue
                        iso = parse_date_to_iso(d)
                        if iso and "buyer_signed" not in dates:
                            dates["buyer_signed"] = iso

                if "ACTION AND CERTIFICATION BY SELLER" in txt_p or "Signature of Seller" in txt_p:
                    d_list = re.findall(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', txt_p)
                    d_text = re.findall(r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b', txt_p, re.I)
                    for d in d_list + d_text:
                        if "May 20, 2025" in d or "Copyright" in d:
                            continue
                        iso = parse_date_to_iso(d)
                        if iso and "seller_signed" not in dates:
                            dates["seller_signed"] = iso

        # ----------------------------------------------------------------------
        # Form Family 7: Generic Bilateral Real Estate Contract
        # ----------------------------------------------------------------------
        else:
            form_family = "Generic Bilateral Contract"
            all_contract_text = " ".join([self.get_text(p) for p in range(1, min(6, len(self.doc) + 1))])

            for pat in [
                r'setting\s+(?:the\s+)?(?:contract\s+)?(?:purchase|sales)?\s*price\s+(?:at|to)\s*[$]?\s*([0-9.,uUoOD]+)',
                r'(?:new|amended|revised|agreed)\s+(?:contract\s+)?(?:purchase|sales)\s+price\s*(?:is|shall\s+be|of)?\s*[:\-]?\s*(?:at|to)?\s*[$]?\s*([0-9.,uUoOD]+)',
                r'(?:purchase|sales)\s+price\s+(?:is|shall\s+be)?\s*(?:hereby\s+)?(?:amended|changed|modified|adjusted|set|reduced|increased)\s*(?:to|at)\s*[:\-]?\s*[$]?\s*([0-9.,uUoOD]+)',
                r'(?:Purchase\s+Price|Sales\s+Price|sum\s+of)\s*(?:shall\s+be|is)?\s*[:\-]?\s*[$]?\s*([0-9.,uUoOD]+)',
            ]:
                m_p = re.search(pat, all_contract_text, re.I)
                if m_p:
                    c_val = clean_currency(m_p.group(1))
                    if c_val and c_val > 5000:
                        price = c_val
                        break

            # If still not found, check currency candidates on first 3 pages
            if not price:
                nums = re.findall(r"\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b", all_contract_text)
                cands = [clean_currency(n) for n in nums if clean_currency(n) and clean_currency(n) > 10000]
                if cands:
                    price = max(cands)

            m_d = re.search(r"(?:contract\s+dated|agreement\s+dated|this\s+contract\s+dated|DATED)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", all_contract_text, re.I)
            if m_d and "contract_dated" not in dates:
                iso = parse_date_to_iso(m_d.group(1))
                if iso:
                    dates["contract_dated"] = iso
                    dates["date_prepared"] = iso

            # Check signature pages for execution dates (both numeric and textual dates)
            for p in range(max(1, len(self.doc) - 4), len(self.doc) + 1):
                txt = self.get_text(p)
                m_s = re.search(r"SELLER:[^\n\r]*?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})", txt, re.I | re.DOTALL)
                if m_s and "seller_signed" not in dates:
                    iso = parse_date_to_iso(m_s.group(1))
                    if iso:
                        dates["seller_signed"] = iso

                m_b = re.search(r"BUYER:[^\n\r]*?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})", txt, re.I | re.DOTALL)
                if m_b and "buyer_signed" not in dates:
                    iso = parse_date_to_iso(m_b.group(1))
                    if iso:
                        dates["buyer_signed"] = iso

                found_dates_num = re.findall(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", txt)
                found_dates_txt = re.findall(r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b", txt, re.I)
                for fd in (found_dates_num + found_dates_txt):
                    if "Copyright" in txt and fd in ("May 20, 2025", "May 20 2025"):
                        continue
                    iso = parse_date_to_iso(fd)
                    if iso:
                        if "buyer_signed" not in dates:
                            dates["buyer_signed"] = iso
                        if "effective_date" not in dates:
                            dates["effective_date"] = iso

        # Sweep all pages for attached Addenda / Amendments overriding the purchase price or date
        if form_family != "Contract Addendum / Amendment":
            for p_idx in range(1, len(self.doc) + 1):
                p_text = self.get_text(p_idx)
                if re.search(r"\b(?:ADDENDUM|AMENDMENT\s+TO)\b", p_text, re.I):
                    m_override = re.search(r'setting\s+(?:the\s+)?(?:contract\s+)?(?:purchase|sales)?\s*price\s+(?:at|to)\s*[$]?\s*([0-9.,uUoOD]+)', p_text, re.I)
                    if not m_override:
                        m_override = re.search(r'(?:new|amended|revised|agreed)\s+(?:contract\s+)?(?:purchase|sales)\s+price\s*(?:is|shall\s+be|of)?\s*[:\-]?\s*(?:at|to)?\s*[$]?\s*([0-9.,uUoOD]+)', p_text, re.I)
                    if not m_override:
                        m_override = re.search(r'(?:purchase|sales)\s+price\s+(?:is|shall\s+be)?\s*(?:hereby\s+)?(?:amended|changed|modified|adjusted|set|reduced|increased)\s*(?:to|at)\s*[:\-]?\s*[$]?\s*([0-9.,uUoOD]+)', p_text, re.I)
                    if m_override:
                        amended_p = clean_currency(m_override.group(1))
                        if amended_p and amended_p > 5000:
                            price = amended_p

                    m_ad_d = re.search(r'DATED\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', p_text, re.I)
                    if m_ad_d:
                        iso_ad = parse_date_to_iso(m_ad_d.group(1))
                        if iso_ad:
                            dates["addendum_date"] = iso_ad

                    if not concessions:
                        m_cred = re.search(r'credit.*?[$]\s*([0-9.,]+)', p_text, re.I | re.DOTALL)
                        if m_cred:
                            concessions = clean_currency(m_cred.group(1))

        # Milestone Priority Hierarchy:
        # Addendum Date / Effective Date > Seller Signed > Buyer Signature Date > Date Prepared / Contract Dated
        best_date = (
            dates.get("addendum_date")
            or dates.get("effective_date")
            or dates.get("seller_signed")
            or dates.get("buyer_signed")
            or dates.get("date_prepared")
            or dates.get("contract_dated")
            or (list(dates.values())[0] if dates else None)
        )

        self.doc.close()
        return {
            "price": price,
            "date": best_date,
            "all_dates": dates,
            "concessions": concessions,
            "form_family": form_family
        }


# ==============================================================================
# 4. Appraisal Ground Truth Extractor (MISMO XML & Appraisal PDF)
# ==============================================================================

def extract_appraisal_source(path: str) -> Dict[str, Any]:
    """
    Extracts Contract Price, Contract Date, and Concessions from an Appraisal Report.
    Supports:
      - MISMO 2.6 GSE XML (<SALES_CONTRACT _Amount="..." _Date="..." ...>)
      - MISMO 3.x XML (<SalesContractAmount>, <SalesContractDate>)
      - Fannie Mae / Freddie Mac URAR PDF Form 1004, 1025, 1073, UAD 3.6
    """
    is_xml = path.lower().endswith(".xml")
    if not is_xml and os.path.exists(path):
        with open(path, "rb") as f:
            header_sample = f.read(200)
            if b"<?xml" in header_sample or b"<VALUATION_RESPONSE" in header_sample:
                is_xml = True

    if is_xml:
        tree = ET.parse(path)
        root = tree.getroot()

        # 1. MISMO 2.6: Search for <SALES_CONTRACT>
        for elem in root.iter():
            tag = elem.tag.split("}")[-1]
            if tag == "SALES_CONTRACT":
                amount_str = elem.attrib.get("_Amount")
                date_str = elem.attrib.get("_Date")
                concession_str = elem.attrib.get("SalesConcessionAmount")
                if amount_str or date_str:
                    return {
                        "price": clean_currency(amount_str),
                        "date": parse_date_to_iso(date_str),
                        "raw_date": date_str,
                        "concessions": clean_currency(concession_str)
                    }

        # 2. MISMO 3.x / UAD 3.6: Search for <SalesContractAmount> and <SalesContractDate>
        mismo3_price = None
        mismo3_date = None
        mismo3_concession = None

        for elem in root.iter():
            tag = elem.tag.split("}")[-1]
            if tag == "SalesContractAmount" and mismo3_price is None:
                mismo3_price = clean_currency(elem.text)
            elif tag == "SalesContractDate" and mismo3_date is None:
                mismo3_date = parse_date_to_iso(elem.text)
            elif tag in ("SalesConcessionAmount", "TotalSalesConcessionAmount") and mismo3_concession is None:
                mismo3_concession = clean_currency(elem.text)

        if mismo3_price is not None or mismo3_date is not None:
            return {
                "price": mismo3_price,
                "date": mismo3_date,
                "raw_date": mismo3_date,
                "concessions": mismo3_concession
            }

        return {"price": None, "date": None, "raw_date": None, "concessions": None}

    # Appraisal PDF Extraction
    doc = fitz.open(path)
    price: Optional[float] = None
    date: Optional[str] = None
    raw_date: Optional[str] = None

    # Pass 1: Layout-aware text blocks in first 5 pages (Form 1004 / 1025 / 1073)
    for p in range(min(5, len(doc))):
        page = doc[p]
        blocks = page.get_text("blocks")

        for b in blocks:
            btxt = b[4]
            if "Contract Price" in btxt or "CONTRACT" in btxt:
                # Search nearby blocks around the same vertical position
                y0, y1 = b[1] - 40, b[3] + 40
                nearby = [nb for nb in blocks if y0 <= nb[1] <= y1 and nb != b]
                for nb in nearby:
                    ntxt = nb[4].strip()
                    # Look for combined tabular pattern: price\ndate\nsource (e.g. 525,000\n11/10/2026\nContract/County)
                    m_tab = re.search(r"(\d{1,3}(?:,\d{3})+)\s*\n\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", ntxt)
                    if m_tab:
                        if not price:
                            price = clean_currency(m_tab.group(1))
                        if not date:
                            raw_date = m_tab.group(2)
                            date = parse_date_to_iso(raw_date)

                # Check analysis narrative comments in the contract section block
                m_narrative_p = re.search(r"(?:selling\s+for|contract\s+price\s+is|purchase\s+price\s+of)\s*\$?\s*([\d,]+)", btxt, re.I)
                m_narrative_d = re.search(r"(?:contract\s+dated|acceptance\s+date\s+of|signing)\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", btxt, re.I)
                if m_narrative_p and not price:
                    price = clean_currency(m_narrative_p.group(1))
                if m_narrative_d and not date:
                    raw_date = m_narrative_d.group(1)
                    date = parse_date_to_iso(raw_date)

        # Direct regex search on page text
        ptxt = page.get_text("text")
        if "Contract Price" in ptxt:
            m_p = re.search(r"Contract\s+Price\s*[:\$]?\s*([\d,]+(?:\.\d{2})?)", ptxt, re.I)
            m_d = re.search(r"Date\s+of\s+Contract\s*[:\-]?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})", ptxt, re.I)
            if m_p and not price:
                price = clean_currency(m_p.group(1))
            if m_d and not date:
                raw_date = m_d.group(1)
                date = parse_date_to_iso(raw_date)

        if price and date:
            break

    # Pass 2: Modern UAD 3.6 URAR Form (Summary on Page 1, Sales Contract section on Pages 16-25)
    if not price or not date:
        for p in range(len(doc)):
            txt = doc[p].get_text("text")
            if "Contract Price" in txt and not price:
                m_p = re.search(r"Contract\s+Price\s*\n\s*\$?\s*([\d,]+(?:\.\d{2})?)", txt, re.I)
                if m_p:
                    price = clean_currency(m_p.group(1))

            if ("Contract Date" in txt or "Sales Contract" in txt) and not date:
                m_d = re.search(r"Contract\s+Date\s*\n\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})", txt, re.I)
                if m_d:
                    raw_date = m_d.group(1)
                    date = parse_date_to_iso(raw_date)

                # Narrative comment check in UAD 3.6 Sales Contract Analysis
                m_comm = re.search(r"(?:acceptance\s+date\s+of|under\s+contract\s+on)\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", txt, re.I)
                if m_comm and not date:
                    raw_date = m_comm.group(1)
                    date = parse_date_to_iso(raw_date)

            if price and date:
                break

    doc.close()
    return {"price": price, "date": date, "raw_date": raw_date}


# ==============================================================================
# 5. Master Comparison & Reconciliation Function
# ==============================================================================

def compare_contract_to_report(
    main_report_path: str,
    contract_path: str,
    easyocr_reader=None
) -> List[Dict[str, Any]]:
    """
    Reconciles Purchase Price and Contract Date between an Appraisal Report
    and a Contract Copy PDF.

    Returns an array of dictionaries matching the exact specification:
    [
      {
        "field": "Contract Price",
        "old_value": "$600,000",
        "new_value": "$600,000",
        "status": "Match"
      },
      {
        "field": "Contract Date",
        "old_value": "2026-10-22",
        "new_value": "2026-09-09",
        "status": "Mismatch"
      }
    ]
    """
    appraisal = extract_appraisal_source(main_report_path)
    extractor = ContractPdfExtractor(contract_path, easyocr_reader=easyocr_reader)
    contract = extractor.extract()

    # Price Match: abs(contract_price - appraisal_price) == 0.0
    price_match = (
        contract["price"] is not None
        and appraisal["price"] is not None
        and abs(contract["price"] - appraisal["price"]) == 0.0
    )

    # Date Match: True if appraisal date matches ANY valid contract milestone
    app_date_iso = appraisal.get("date")
    c_dates = contract.get("all_dates", {})
    contract_date_iso = contract.get("date")

    date_match = False
    if app_date_iso:
        if app_date_iso == contract_date_iso:
            date_match = True
        elif c_dates and app_date_iso in c_dates.values():
            date_match = True

    res = [
        {
            "field": "Contract Price",
            "old_value": f"${appraisal['price']:,.0f}" if appraisal["price"] is not None else "N/A",
            "new_value": f"${contract['price']:,.0f}" if contract["price"] is not None else "N/A",
            "status": "Match" if price_match else "Mismatch",
        },
        {
            "field": "Contract Date",
            "old_value": appraisal.get("raw_date") or appraisal.get("date") or "N/A",
            "new_value": contract.get("date") or "N/A",
            "status": "Match" if date_match else "Mismatch",
        },
    ]

    # Seller Concessions / Closing Cost Credit
    app_conc = appraisal.get("concessions")
    c_conc = contract.get("concessions")
    if app_conc is not None or c_conc is not None:
        conc_match = (
            app_conc is not None
            and c_conc is not None
            and abs(app_conc - c_conc) == 0.0
        )
        res.append({
            "field": "Seller Concessions",
            "old_value": f"${app_conc:,.0f}" if app_conc is not None else "N/A",
            "new_value": f"${c_conc:,.0f}" if c_conc is not None else "N/A",
            "status": "Match" if conc_match else "Mismatch" if (app_conc is not None and c_conc is not None) else "Info",
        })

    return res


# Alias for backward compatibility with existing views
compare_contract_offline = compare_contract_to_report


# ==============================================================================
# 6. Command-Line Interface (CLI)
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Real Estate Contract Copy Extraction & Appraisal Reconciliation Engine"
    )
    parser.add_argument(
        "-r", "--report",
        required=True,
        help="Path to Main Appraisal Report (MISMO 2.6/3.x XML or Appraisal PDF)"
    )
    parser.add_argument(
        "-c", "--contract",
        required=True,
        help="Path to Purchase Contract Copy PDF"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw JSON format"
    )

    args = parser.parse_args()

    if not os.path.exists(args.report):
        print(f"Error: Appraisal report file not found: {args.report}", file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(args.contract):
        print(f"Error: Contract copy file not found: {args.contract}", file=sys.stderr)
        sys.exit(1)

    results = compare_contract_to_report(args.report, args.contract)

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print("\n" + "=" * 60)
        print("REAL ESTATE CONTRACT & APPRAISAL RECONCILIATION REPORT")
        print("=" * 60)
        for item in results:
            field = item["field"]
            old_v = item["old_value"]
            new_v = item["new_value"]
            status = item["status"]
            print(f"Field:     {field}")
            print(f"Appraisal: {old_v}")
            print(f"Contract:  {new_v}")
            print(f"Status:    {status}")
            print("-" * 60)


if __name__ == "__main__":
    main()
