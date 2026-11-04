"""
Appraisal Revision Verification Engine
=======================================
A production-grade verification engine for Real Estate Appraisal reports.
Verifies whether client revision requests/stipulations have been properly
addressed in revised reports.

Libraries utilized:
1. PyMuPDF (pymupdf / fitz): Extract digital text, metadata, page-level rendering.
2. pdfplumber: Precise tabular data extraction from appraisal grids (URAR 1004, 1007, etc.).
3. Tesseract OCR (pytesseract): Optical Character Recognition for scanned pages/addenda.
4. OpenCV (cv2): Advanced image preprocessing (grayscale, noise reduction, thresholding) for OCR.
5. spaCy: Semantic NLP, sentence tokenization, and similarity scoring between client comments & appraiser responses.
6. RapidFuzz: High-performance fuzzy string and token matching.
7. pandas: Tabular alignment and numerical delta detection between reports.
8. difflib: Exact text sequence diffing between original and revised documents.
"""

import os
import re
import difflib
import warnings
from typing import Dict, List, Any, Optional, Tuple, Union
from pathlib import Path

# Suppress harmless spaCy vector warning for small models
warnings.filterwarnings("ignore", message=r".*\[W007\].*")

# --- PyMuPDF ---
try:
    import pymupdf as fitz
except ImportError:
    import fitz

# --- Table Extraction & Data Analysis ---
import pdfplumber
import pandas as pd
import numpy as np

# --- Computer Vision & OCR ---
import cv2
import pytesseract

# --- Fuzzy Matching ---
from rapidfuzz import fuzz

# --- NLP & Semantic Matching ---
try:
    import spacy
    try:
        nlp = spacy.load("en_core_web_sm")
    except Exception:
        try:
            from spacy.cli import download
            download("en_core_web_sm")
            nlp = spacy.load("en_core_web_sm")
        except Exception:
            # Fallback to blank English model for tokenization & sentence splitting
            nlp = spacy.blank("en")
            nlp.add_pipe("sentencizer")
except ImportError:
    nlp = None


# =====================================================================
# 1. OCR & PREPROCESSING (OpenCV + Tesseract OCR)
# =====================================================================

class DocumentImageEnhancer:
    """Uses OpenCV to improve document clarity for Tesseract OCR."""

    @staticmethod
    def preprocess_image(img_bgr: np.ndarray) -> np.ndarray:
        """
        Enhances document image readability:
        - Grayscale conversion
        - Noise reduction using Median Blur
        - Otsu thresholding for crisp contrast
        """
        if len(img_bgr.shape) == 3:
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        else:
            gray = img_bgr

        # Denoise image while preserving edges
        denoised = cv2.medianBlur(gray, 3)

        # Otsu binarization for clean document text separation
        _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return binary

    @classmethod
    def ocr_page(cls, page: fitz.Page, dpi: int = 300) -> str:
        """Renders a PDF page to an image, applies OpenCV enhancement, and OCRs it."""
        pix = page.get_pixmap(dpi=dpi)
        img_np = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)

        if pix.n == 4:
            img_np = cv2.cvtColor(img_np, cv2.COLOR_RGBA2BGR)
        elif pix.n == 1:
            img_np = cv2.cvtColor(img_np, cv2.COLOR_GRAY2BGR)

        enhanced = cls.preprocess_image(img_np)
        ocr_text = pytesseract.image_to_string(enhanced)
        return ocr_text


# =====================================================================
# 2. PDF TEXT EXTRACTION (PyMuPDF with OCR Fallback)
# =====================================================================

class PDFExtractor:
    """Extracts text page by page with automatic OCR fallback for scanned pages."""

    @classmethod
    def extract_document(cls, pdf_path: str, min_chars_threshold: int = 60) -> Dict[int, Dict[str, Any]]:
        """
        Returns a dictionary of:
        {
            page_number: {
                "text": str,
                "is_scanned": bool,
                "page_count": int
            }
        }
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found at: {pdf_path}")

        doc = fitz.open(pdf_path)
        pages_data = {}
        total_pages = len(doc)

        for page_idx, page in enumerate(doc):
            page_num = page_idx + 1
            raw_text = page.get_text("text").strip()
            is_scanned = False

            # If digital text is missing or extremely sparse, run OCR fallback
            if len(raw_text) < min_chars_threshold:
                try:
                    ocr_text = DocumentImageEnhancer.ocr_page(page).strip()
                    if len(ocr_text) > len(raw_text):
                        raw_text = ocr_text
                        is_scanned = True
                except Exception as e:
                    # If Tesseract binary is not installed in system PATH, preserve raw_text
                    pass

            pages_data[page_num] = {
                "text": raw_text,
                "is_scanned": is_scanned,
                "total_pages": total_pages
            }

        doc.close()
        return pages_data


# =====================================================================
# 3. TABLE EXTRACTION & NUMERICAL DIFF (pdfplumber + pandas)
# =====================================================================

class AppraisalTableAnalyzer:
    """Extracts appraisal grids and compares numerical values."""

    @staticmethod
    def extract_tables(pdf_path: str) -> Dict[int, List[pd.DataFrame]]:
        """Extracts structured tables across pages into pandas DataFrames."""
        if not os.path.exists(pdf_path):
            return {}

        tables_by_page = {}
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for idx, page in enumerate(pdf.pages):
                    page_num = idx + 1
                    extracted = page.extract_tables()
                    dfs = []
                    for table in extracted:
                        if table and len(table) > 1:
                            # Generate clean column headers
                            raw_header = table[0]
                            clean_header = [
                                str(c).replace("\n", " ").strip() if c else f"Col_{c_i}"
                                for c_i, c in enumerate(raw_header)
                            ]
                            rows = [
                                [str(cell).replace("\n", " ").strip() if cell is not None else "" for cell in r]
                                for r in table[1:]
                            ]
                            df = pd.DataFrame(rows, columns=clean_header)
                            dfs.append(df)
                    if dfs:
                        tables_by_page[page_num] = dfs
        except Exception as e:
            print(f"[WARN] Table extraction warning for {pdf_path}: {e}")

        return tables_by_page

    @staticmethod
    def clean_numeric_value(val: Any) -> Optional[float]:
        """Strips $, commas, and non-numeric signs to extract numerical float."""
        if val is None:
            return None
        cleaned = re.sub(r"[^\d.-]", "", str(val).strip())
        try:
            return float(cleaned)
        except (ValueError, TypeError):
            return None

    @classmethod
    def compare_tables(
        cls, orig_tables: Dict[int, List[pd.DataFrame]], rev_tables: Dict[int, List[pd.DataFrame]]
    ) -> List[Dict[str, Any]]:
        """
        Compares tables across pages to detect numerical modifications
        (e.g., changes from $0 to non-zero, GLA adjustments, comp price adjustments).
        """
        deltas = []
        for page_num, r_dfs in rev_tables.items():
            o_dfs = orig_tables.get(page_num, [])
            for r_df in r_dfs:
                for o_df in o_dfs:
                    # Match tables with compatible dimensions or overlapping column names
                    common_cols = [c for c in r_df.columns if c in o_df.columns]
                    if len(common_cols) >= 2 and len(r_df) == len(o_df):
                        for col in common_cols:
                            for row_idx in range(len(r_df)):
                                orig_val = str(o_df.iloc[row_idx][col]).strip()
                                rev_val = str(r_df.iloc[row_idx][col]).strip()

                                if orig_val != rev_val:
                                    num_orig = cls.clean_numeric_value(orig_val)
                                    num_rev = cls.clean_numeric_value(rev_val)
                                    deltas.append({
                                        "page": page_num,
                                        "column": col,
                                        "row": row_idx,
                                        "original_value": orig_val,
                                        "revised_value": rev_val,
                                        "numeric_orig": num_orig,
                                        "numeric_rev": num_rev,
                                        "is_numeric_delta": (num_orig is not None or num_rev is not None)
                                    })
        return deltas


# =====================================================================
# 4. DOCUMENT DIFFING (difflib)
# =====================================================================

class DocumentDiffer:
    """Uses difflib to detect added, removed, or modified paragraphs and lines."""

    @staticmethod
    def compute_added_lines(orig_text: str, rev_text: str) -> List[str]:
        """Extracts newly added lines in the revised text compared to original."""
        orig_lines = [l.strip() for l in orig_text.splitlines() if l.strip()]
        rev_lines = [l.strip() for l in rev_text.splitlines() if l.strip()]

        matcher = difflib.SequenceMatcher(None, orig_lines, rev_lines)
        added_lines = []

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag in ("insert", "replace"):
                for line in rev_lines[j1:j2]:
                    if len(line) >= 8:  # Filter out trivial artifacts
                        added_lines.append(line)

        return added_lines


# =====================================================================
# 5. SEMANTIC & FUZZY VERIFIER (spaCy + RapidFuzz)
# =====================================================================

class NLPRevisionMatcher:
    """Uses spaCy for semantic similarity and RapidFuzz for fuzzy matching."""

    @staticmethod
    def get_sentences(text: str) -> List[str]:
        """Splits document text into clean, contextual sentences."""
        if nlp:
            doc = nlp(text)
            return [sent.text.strip() for sent in doc.sents if len(sent.text.strip()) > 15]
        else:
            # Regex sentence splitting fallback
            return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 15]

    @classmethod
    def find_semantic_match(
        cls, client_comment: str, sentences: List[str]
    ) -> Tuple[float, Optional[str]]:
        """
        Uses spaCy vector similarity or token overlap to score how closely
        an appraiser's sentence matches the client's request intent.
        """
        if not client_comment or not sentences:
            return 0.0, None

        best_score = 0.0
        best_sentence = None

        if nlp and (nlp.has_pipe("ner") or (hasattr(nlp, "vocab") and nlp.vocab.vectors_length > 0)):
            try:
                comment_doc = nlp(client_comment)
                for s in sentences:
                    s_doc = nlp(s)
                    sim = float(comment_doc.similarity(s_doc)) * 100
                    if sim > best_score:
                        best_score = sim
                        best_sentence = s
                return round(best_score, 2), best_sentence
            except Exception:
                pass

        # Robust Fallback: Token overlap + RapidFuzz token set ratio
        for s in sentences:
            ratio = float(fuzz.token_set_ratio(client_comment, s))
            if ratio > best_score:
                best_score = ratio
                best_sentence = s

        return round(best_score, 2), best_sentence


# =====================================================================
# 6. APPRAISAL REVISION VERIFICATION ENGINE (Core Orchestrator)
# =====================================================================

class AppraisalRevisionVerifier:
    """
    Main verification engine that coordinates PyMuPDF, pdfplumber, OpenCV,
    Tesseract, spaCy, RapidFuzz, pandas, and difflib.
    """

    def __init__(self, revised_pdf_path: str, original_pdf_path: Optional[str] = None):
        self.revised_pdf_path = revised_pdf_path
        self.original_pdf_path = original_pdf_path

        # 1. Extract digital & OCR text
        self.revised_pages = PDFExtractor.extract_document(revised_pdf_path)
        self.original_pages = (
            PDFExtractor.extract_document(original_pdf_path)
            if original_pdf_path and os.path.exists(original_pdf_path)
            else {}
        )

        # Precompute sentences per page for fast semantic & fuzzy lookup
        self.revised_sentences_by_page = {
            p_no: NLPRevisionMatcher.get_sentences(p_data["text"])
            for p_no, p_data in self.revised_pages.items()
        }

        # 2. Extract tables
        self.revised_tables = AppraisalTableAnalyzer.extract_tables(revised_pdf_path)
        self.original_tables = (
            AppraisalTableAnalyzer.extract_tables(original_pdf_path)
            if original_pdf_path and os.path.exists(original_pdf_path)
            else {}
        )

        # 3. Calculate text-level added content per page using difflib
        self.added_content_by_page: Dict[int, List[str]] = {}
        if self.original_pages:
            for page_num, rev_info in self.revised_pages.items():
                orig_text = self.original_pages.get(page_num, {}).get("text", "")
                self.added_content_by_page[page_num] = DocumentDiffer.compute_added_lines(
                    orig_text, rev_info["text"]
                )

        # 4. Calculate table numerical deltas using pandas
        self.table_deltas: List[Dict[str, Any]] = []
        if self.original_tables and self.revised_tables:
            self.table_deltas = AppraisalTableAnalyzer.compare_tables(
                self.original_tables, self.revised_tables
            )

    @staticmethod
    def extract_context_window(text: str, match_pos: int, window: int = 150) -> str:
        """Extracts a readable context window centered on the match."""
        start = max(0, match_pos - window)
        end = min(len(text), match_pos + window)
        snippet = text[start:end].replace("\n", " ").strip()
        prefix = "..." if start > 0 else ""
        suffix = "..." if end < len(text) else ""
        return f"{prefix}{snippet}{suffix}"

    def verify_revision(self, revision: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verifies a single revision stipulation item.
        Input format:
        {
            "name": "GLA Bracketing",
            "client_comment": "Subject GLA is higher than comps. Bracket with additional comp.",
            "keywords": ["gross living area", "GLA", "bracketed", "comp 4"]
        }
        """
        rev_name = revision.get("name", "Unnamed Revision")
        keywords = revision.get("keywords", [])
        client_comment = revision.get("client_comment", "")

        evidence_items = []
        is_new_content_detected = False

        # --- A. RapidFuzz & Exact Keyword Matching across all pages ---
        for page_num, page_data in self.revised_pages.items():
            p_text = page_data["text"]
            p_text_lower = p_text.lower()
            added_lines = self.added_content_by_page.get(page_num, [])
            page_sentences = self.revised_sentences_by_page.get(page_num, [])

            for kw in keywords:
                kw_lower = kw.lower()

                # 1. Exact match
                pos = p_text_lower.find(kw_lower)
                if pos != -1:
                    snippet = self.extract_context_window(p_text, pos)
                    # Check difflib sequence to see if this keyword was newly introduced
                    is_new_line = any(kw_lower in line.lower() for line in added_lines)
                    if is_new_line:
                        is_new_content_detected = True

                    evidence_items.append({
                        "type": "EXACT_KEYWORD",
                        "page": page_num,
                        "keyword": kw,
                        "score": 100.0,
                        "is_new_in_revision": is_new_line,
                        "snippet": snippet
                    })
                    continue

                # 2. Fuzzy Token Match via RapidFuzz
                fuzzy_ratio = fuzz.partial_token_set_ratio(kw_lower, p_text_lower)
                if fuzzy_ratio >= 85:
                    matching_sent = None
                    for s in page_sentences:
                        if fuzz.partial_token_set_ratio(kw_lower, s.lower()) >= 85:
                            matching_sent = s
                            break
                    snippet = matching_sent if matching_sent else f"Fuzzy match for '{kw}' (Confidence: {fuzzy_ratio:.1f}%) on Page {page_num}"
                    evidence_items.append({
                        "type": "FUZZY_MATCH",
                        "page": page_num,
                        "keyword": kw,
                        "score": round(float(fuzzy_ratio), 1),
                        "is_new_in_revision": False,
                        "snippet": snippet
                    })

            # --- B. spaCy Semantic Similarity (Client Comment vs Addendum) ---
            if client_comment:
                sem_score, sem_sentence = NLPRevisionMatcher.find_semantic_match(client_comment, page_sentences)
                if sem_score >= 70.0 and sem_sentence:
                    is_sent_new = any(
                        sem_sentence in line or line in sem_sentence for line in added_lines
                    )
                    if is_sent_new:
                        is_new_content_detected = True

                    evidence_items.append({
                        "type": "SEMANTIC_RESPONSE",
                        "page": page_num,
                        "score": sem_score,
                        "is_new_in_revision": is_sent_new,
                        "snippet": sem_sentence
                    })

        # --- C. Table / Numerical Field Checks (pandas) ---
        matched_table_deltas = []
        for delta in self.table_deltas:
            delta_str = f"{delta['column']} {delta['original_value']} {delta['revised_value']}".lower()
            if any(kw.lower() in delta_str for kw in keywords):
                matched_table_deltas.append(delta)
                is_new_content_detected = True

        # --- D. Determine Status & Verification Confidence ---
        if matched_table_deltas:
            status = "VERIFIED (NUMERICAL TABLE DELTA DETECTED)"
            confidence = 95.0
        elif evidence_items and is_new_content_detected:
            status = "VERIFIED (NEW/MODIFIED TEXT CONFIRMED)"
            confidence = max([e.get("score", 80.0) for e in evidence_items])
        elif evidence_items and not self.original_pdf_path:
            status = "EVIDENCE FOUND IN REVISED DOCUMENT"
            confidence = max([e.get("score", 75.0) for e in evidence_items])
        elif evidence_items and not is_new_content_detected:
            status = "WARNING: TEXT PRESENT BUT UNCHANGED FROM ORIGINAL"
            confidence = 50.0
        else:
            status = "NO EVIDENCE FOUND"
            confidence = 0.0

        # Sort evidence items by score
        evidence_items.sort(key=lambda x: x.get("score", 0), reverse=True)

        return {
            "revision": rev_name,
            "status": status,
            "confidence": confidence,
            "is_new_change": is_new_content_detected,
            "evidence_count": len(evidence_items),
            "top_evidence": evidence_items[:3],
            "table_deltas": matched_table_deltas
        }

    def verify_all(self, revisions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Verifies a full list of revision stipulations."""
        return [self.verify_revision(r) for r in revisions]

    def to_dataframe(self, results: List[Dict[str, Any]]) -> pd.DataFrame:
        """Flattens verification results into a clean pandas DataFrame for export."""
        flat_records = []
        for res in results:
            top_ev = res["top_evidence"][0]["snippet"] if res["top_evidence"] else "N/A"
            top_page = res["top_evidence"][0]["page"] if res["top_evidence"] else "N/A"
            flat_records.append({
                "Revision Name": res["revision"],
                "Verification Status": res["status"],
                "Confidence (%)": res["confidence"],
                "Newly Added / Changed": res["is_new_change"],
                "Primary Page": top_page,
                "Evidence Snippet": top_ev,
                "Table Changes Count": len(res["table_deltas"])
            })
        return pd.DataFrame(flat_records)


# =====================================================================
# 7. CONVENIENCE FUNCTION & CLI
# =====================================================================

def verify_appraisal_revisions(
    revised_pdf: str,
    revisions: List[Dict[str, Any]],
    original_pdf: Optional[str] = None
) -> Tuple[List[Dict[str, Any]], pd.DataFrame]:
    """
    Convenience wrapper to run verification and return structured results + DataFrame.
    """
    verifier = AppraisalRevisionVerifier(
        revised_pdf_path=revised_pdf,
        original_pdf_path=original_pdf
    )
    results = verifier.verify_all(revisions)
    df = verifier.to_dataframe(results)
    return results, df


if __name__ == "__main__":
    # Test sample with realistic AMC / Lender Revision Requests
    sample_revisions = [
        {
            "name": "Market Rent",
            "client_comment": "Please explain market rent determination and add comparable rentals.",
            "keywords": [
                "market rent",
                "comparable rentals",
                "monthly rent"
            ]
        },
        {
            "name": "Zero Rental Values",
            "client_comment": "Address zero rental amounts on Form 1007 Rent Schedule.",
            "keywords": [
                "$0",
                "rental amounts",
                "market rent"
            ]
        },
        {
            "name": "GLA Bracketing",
            "client_comment": "Subject GLA is higher than all comps. Please bracket gross living area.",
            "keywords": [
                "gross living area",
                "GLA",
                "gross building area"
            ]
        },
        {
            "name": "Basement Construction",
            "client_comment": "Clarify basement construction and lower level finish.",
            "keywords": [
                "basement",
                "lower level",
                "construction"
            ]
        }
    ]

    # Pick a PDF present in current workspace to test execution
    test_pdf = "416 Arrowwood Dr_embedded.pdf"
    if not os.path.exists(test_pdf):
        test_pdf = "extracted_doc.pdf"

    if os.path.exists(test_pdf):
        print(f"\n[INFO] Running AppraisalRevisionVerifier on: {test_pdf}")
        results, summary_df = verify_appraisal_revisions(
            revised_pdf=test_pdf,
            revisions=sample_revisions,
            original_pdf=None
        )

        print("\n" + "=" * 80)
        print("SUMMARY TABLE (pandas DataFrame):")
        print("=" * 80)
        print(summary_df.to_string(index=False))

        print("\n" + "=" * 80)
        print("DETAILED VERIFICATION RESULTS:")
        print("=" * 80)
        for r in results:
            print(f"\nStipulation: {r['revision']}")
            print(f"Status:      {r['status']} (Confidence: {r['confidence']}%)")
            if r["top_evidence"]:
                print("Evidence:")
                for ev in r["top_evidence"]:
                    print(f"  - Page {ev.get('page')}: {ev.get('snippet')}")
    else:
        print(f"[WARN] No test PDF found at {test_pdf}. Script ready for import.")
