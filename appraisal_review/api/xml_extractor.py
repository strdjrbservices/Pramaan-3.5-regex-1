

import os
import re
import base64
import io
import tempfile
import warnings
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional, Tuple, List

warnings.filterwarnings("ignore", message=".*pin_memory.*")
warnings.filterwarnings("ignore", category=UserWarning, module="torch.*")

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import cv2
except ImportError:
    cv2 = None

try:
    import numpy as np
except ImportError:
    np = None

try:
    from api.eo_extractor import extract_eo_insurance_from_doc, extract_eo_copy_data
except ImportError:
    try:
        from .eo_extractor import extract_eo_insurance_from_doc, extract_eo_copy_data  # type: ignore
    except Exception:
        def extract_eo_insurance_from_doc(doc: Any, use_ocr: bool = True, appraiser_hint: str = "") -> Dict[str, str]:  # type: ignore
            return {
                "E&O": "Absent",
                "E&O Present": "Absent",
                "E&O Attached": "No",
                "has_eo": False,
                "E&O Page": "",
                "E&O Insurance": "",
                "Policy Period From": "",
                "Policy Period To": "",
                "E&O Insured": "",
                "E&O Carrier": "",
                "E&O Limit": "",
                "E&O Deductible": "",
                "base64_preview": ""
            }
        def extract_eo_copy_data(page: Any, p_no: int, use_ocr: bool = True, appraiser_hint: str = "") -> Dict[str, Any]: # type: ignore
            return {
                "E&O": "Present",
                "E&O Present": "Present",
                "E&O Attached": "Yes",
                "has_eo": True,
                "E&O Page": p_no,
                "base64_preview": ""
            }

def _clean_currency(val: Any) -> str:
    if val is None:
        return ""
    val_str = str(val).strip()
    if not val_str:
        return ""
    is_neg = "-" in val_str or (val_str.startswith("(") and val_str.endswith(")"))
    val_clean = re.sub(r"[^\d.]", "", val_str)
    if not val_clean:
        return ""
    try:
        num = float(val_clean)
        prefix = "-" if is_neg and num != 0 else ""
        if num.is_integer():
            return f"{prefix}{int(num):,}"
        return f"{prefix}{num:,.2f}"
    except ValueError:
        return val_str

def _clean_basement_area(raw: str) -> str:
    """Return trimmed BasementArea _Description preserving exact UAD format (e.g. '694sf694sfwo')."""
    return raw.strip() if raw else ""


def _clean_basement_rooms(raw: str) -> str:
    """Return trimmed BasementFinish _Description preserving exact UAD format (e.g. '0rr2br1.0ba1o')."""
    if not raw or not raw.strip():
        return ""
    s = raw.strip()
    if re.match(r'^(?:n/a|none|na)$', s, re.IGNORECASE):
        return ""
    return s


def _parse_and_sum_adjustments(adj_str: Any) -> str:
    if adj_str is None:
        return ""
    s = str(adj_str).strip()
    if not s:
        return ""
    matches = re.findall(r'([+-]?\s*\$?\s*\(?\s*[\d,]+(?:\.\d+)?\s*\)?)', s)
    total = 0.0
    found = False
    for m in matches:
        m_str = m.strip()
        if not m_str or m_str in ['+', '-', '$', '(', ')']:
            continue
        is_neg = '-' in m_str or ('(' in m_str and ')' in m_str)
        clean = re.sub(r'[^\d.]', '', m_str)
        if clean:
            try:
                num = float(clean)
                total += -num if is_neg else num
                found = True
            except ValueError:
                pass
    if not found:
        return ""
    if total == 0:
        return "0"
    sign = "+" if total > 0 else "-"
    abs_tot = abs(total)
    if abs_tot.is_integer():
        return f"{sign}{int(abs_tot):,}"
    return f"{sign}{abs_tot:,.2f}"



def _format_date(val: Any) -> str:
    if val is None:
        return ""
    val_str = str(val).strip()
    if not val_str:
        return ""
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", val_str)
    if m:
        return f"{m.group(2)}/{m.group(3)}/{m.group(1)}"
    return val_str


def _extract_fha_case_number(root: ET.Element, report: Optional[ET.Element] = None, full_narrative: str = "") -> str:
    r"""
    Extracts the FHA Case Number from MISMO XML.
    FHA Case numbers follow standard HUD format: 3 digits, dash, 7 digits (e.g., '353-0891067').
    Checks:
    1. <REPORT> AppraiserAdditionalFileIdentifier and AppraiserAdditionalFileIdentifierName
    2. XML attributes mentioning FHA or matching \d{3}-\d{7}
    3. Narrative text / comments mentioning 'FHA Case' or matching \d{3}-\d{7}
    4. Base64 embedded PDF stream (if present)
    """
    if report is not None:
        add_id = report.attrib.get("AppraiserAdditionalFileIdentifier", "").strip()
        add_name = report.attrib.get("AppraiserAdditionalFileIdentifierName", "").strip()
        file_id = report.attrib.get("AppraiserFileIdentifier", "").strip()

        # Direct match: e.g. "353-0891067" (standard FHA 3 digits - 7 digits)
        m_fha = re.search(r'\b(\d{3}-\d{7})\b', add_id)
        if m_fha:
            return m_fha.group(1)

        if "fha" in add_name.lower():
            m = re.search(r'(\d{3}[-\s]?\d{7})', add_id)
            if m:
                return m.group(1).replace(" ", "-")

        m_fid = re.search(r'\b(\d{3}-\d{7})\b', file_id)
        if m_fid and any(term in (add_name + " " + full_narrative).lower() for term in ["fha", "hud"]):
            return m_fid.group(1)

    for elem in root.iter():
        for attr, val in elem.attrib.items():
            val_str = val.strip()
            if "fha" in attr.lower() or "case" in attr.lower():
                m = re.search(r'\b(\d{3}-\d{7})\b', val_str)
                if m:
                    return m.group(1)

    for elem in root.iter():
        if elem.tag.endswith("DOCUMENT"):
            continue
        txt = elem.text or ""
        if "fha" in txt.lower() or "hud" in txt.lower():
            m = re.search(r'(?:fha(?:\s*\/[A-Za-z]+)?\s*(?:case)?\s*(?:no\.?|number|#)?\s*[:\-]?\s*)(\d{3}-\d{7})', txt, re.I)
            if m:
                return m.group(1)

    if full_narrative:
        m = re.search(r'(?:fha(?:\s*\/[A-Za-z]+)?\s*(?:case)?\s*(?:no\.?|number|#)?\s*[:\-]?\s*)(\d{3}-\d{7})', full_narrative, re.I)
        if m:
            return m.group(1)

    # Embedded PDF fallback
    doc_elem = root.find(".//DOCUMENT")
    if doc_elem is not None and doc_elem.text and fitz is not None:
        try:
            pdf_bytes = base64.b64decode(doc_elem.text.strip())
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            if len(doc) > 0:
                p1_text = doc[0].get_text("text") or ""
                m_pdf = re.search(r'(?:fha(?:\s*\/[A-Za-z]+)?\s*case\s*(?:no\.?|number|#)?\s*[:\-]?\s*)(\d{3}-\d{7})', p1_text, re.I)
                if m_pdf:
                    doc.close()
                    return m_pdf.group(1)
                if "fha" in p1_text.lower() or "hud" in p1_text.lower():
                    m_gen = re.search(r'\b(\d{3}-\d{7})\b', p1_text[:2500])
                    if m_gen:
                        doc.close()
                        return m_gen.group(1)
            doc.close()
        except Exception:
            pass

    return ""


def _extract_appraiser_fee(full_narrative: str = "", embedded_doc: Optional[ET.Element] = None) -> str:
    r"""
    Extracts the Appraiser's Fee across report narrative and embedded PDF pages.
    Searches for fee disclosure patterns such as:
    - 'Fastapp has agreed to compensate the appraiser $350 for this appraisal assignment'
    - 'Appraiser compensation is $400'
    - 'Fee disclosures are $450.00'
    - 'Fee paid to the appraiser: $500.00'
    - 'Appraiser fee is $650'
    - 'Appraiser's fee is $510'
    - 'Total Appraiser Fee: $400'
    - 'Appraisal Fee is $600'
    - 'Appraiser Fee: $395.00'
    - 'SERVICE FEE $750'
    - 'Invoice Amount / Total: $...'
    Returns clean numeric value as a string (e.g. '450.00').
    """
    fee_patterns = [
        # Compensation agreement sentences (e.g. 'Fastapp has agreed to compensate the appraiser $350 for this appraisal assignment.')
        re.compile(
            r'(?:(?:has\s+|have\s+)?agreed\s+to\s+)?(?:compensate|pay)\s+(?:the\s+|an?\s+)?(?:independent\s+)?appraiser'
            r'(?:\s+(?:a\s+fee\s+of|in\s+the\s+amount\s+of|with\s+a\s+fee\s+of))?'
            r'[^0-9$\n]{0,35}\$?\s*([0-9,]+(?:\.\d{2})?)',
            re.IGNORECASE
        ),
        re.compile(
            r'(?:appraiser(?:\'s)?\s+compensation|compensation\s+(?:paid\s+|due\s+)?to\s+(?:the\s+)?(?:independent\s+)?appraiser)'
            r'[^0-9$\n]{0,50}\$?\s*([0-9,]+(?:\.\d{2})?)',
            re.IGNORECASE
        ),
        re.compile(
            r'(?:the\s+)?appraiser\s+(?:is|was|will\s+be|has\s+been)\s+(?:compensated|paid)'
            r'[^0-9$\n]{0,35}\$?\s*([0-9,]+(?:\.\d{2})?)',
            re.IGNORECASE
        ),
        re.compile(r'(?:Fee\s+disclosures?(?:\s+are|\s+is|\s+was)?|Appraisal\s+Fee\s+disclosure)[^0-9$\n]{0,35}\$?\s*([0-9,]+(?:\.\d{2})?)', re.IGNORECASE),
        re.compile(r'Fee\s+paid\s+to\s+(?:the\s+)?appraiser[^0-9$\n]{0,35}\$?\s*([0-9,]+(?:\.\d{2})?)', re.IGNORECASE),
        re.compile(r'(?:Total\s+|Actual\s+|Agreed\s+)?(?:Appraiser(?:\'s)?\s*Fee|Appraisal\s*Fee)[^0-9$\n]{0,35}\$?\s*([0-9,]+(?:\.\d{2})?)', re.IGNORECASE),
        re.compile(r'(?:Appraisal\s*Service\s*Fee|Professional\s*Fee|Agreed\s*Fee|Fee\s*Charged|Fee\s*Amount)[^0-9$\n]{0,35}\$?\s*([0-9,]+(?:\.\d{2})?)', re.IGNORECASE),
        re.compile(r'\bSERVICE\s+FEE[^0-9$\n]{0,20}\$?\s*([0-9,]+(?:\.\d{2})?)', re.IGNORECASE),
        re.compile(r'(?:Invoice\s*Amount|Invoice\s*Total|Total\s*Amount\s*Due|TOTAL\s*DUE|Amount\s*Due)[^0-9$\n]{0,35}\$?\s*([0-9,]+(?:\.\d{2})?)', re.IGNORECASE),
        re.compile(r'\bFee\s+(?:for\s+(?:this|the)\s+appraisal\s+)?(?:is|was|of|:|=)\s*\$?\s*([0-9,]+(?:\.\d{2})?)', re.IGNORECASE)
    ]

    candidate_texts = []
    if full_narrative:
        candidate_texts.append(full_narrative)

    if embedded_doc is not None and embedded_doc.text:
        try:
            pdf_bytes = base64.b64decode(embedded_doc.text.strip())
            if fitz is not None:
                pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                for page in pdf_doc:
                    txt = page.get_text() or ""
                    if txt:
                        candidate_texts.append(txt)
                pdf_doc.close()
        except Exception:
            pass

    for pat in fee_patterns:
        for txt in candidate_texts:
            for m in pat.finditer(txt):
                snippet = txt[max(0, m.start() - 30):min(len(txt), m.end() + 30)].lower()
                if any(bad in snippet for bad in ['hoa', 'pud', 'per month', 'per year', 'late fee', 'cancellation', 'simple', 'sf', 'sq ft']):
                    continue
                raw = m.group(1).replace(',', '').strip()
                try:
                    val = float(raw)
                    if 50.0 <= val <= 25000.0:
                        return f"{val:.2f}"
                except ValueError:
                    pass

    return ""

def _extract_water_heater_comment(
    full_narrative: str = "",
    dom_narratives: Optional[List[str]] = None,
    extracted_photos: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    Extracts the Water heater double-strapped comment from report narrative,
    DOM comments, and photo captions using keywords:
    'water', 'heater', 'WATER HEATER', 'DOUBLE-STRAPPED', 'double strapped',
    'single strapped', 'sinngle trapped', 'single trapped', 'double trapped',
    'strapped', 'strap', 'straps', 'strapping', 'trapped', 'brace', 'braced', etc.
    """
    candidate_texts = []
    if full_narrative:
        candidate_texts.append(full_narrative)
    if dom_narratives:
        candidate_texts.extend(dom_narratives)

    wh_term = r'(?:(?:hot\s+)?water\s*heater|waterheater|(?:hot\s+)?water\s*tank)'
    strap_term = (
        r'(?:'
        r'double[\s\-]*(?:strapp\w*|trapp\w*|strap\b|trap\b)|'
        r'sinngle[\s\-]*(?:trapp\w*|strapp\w*|strap\b|trap\b)|'
        r'single[\s\-]*(?:strapp\w*|trapp\w*|strap\b|trap\b)|'
        r'two[\s\-]*(?:straps?|traps?)|'
        r'earthquake[\s\-]*(?:strapp\w*|trapp\w*|strap\b)|'
        r'seismic[\s\-]*(?:strapp\w*|trapp\w*|strap\b)|'
        r'properly[\s\-]*(?:strapp\w*|trapp\w*)|'
        r'strapp\w*|'
        r'straps?\b|'
        r'trapp\w*|'
        r'traps?\b|'
        r'brac\w*|'
        r'anchor\w*|'
        r'tie[\s\-]*downs?'
        r')'
    )
    wh_with_strap_pat = re.compile(
        rf'(?:{wh_term}[^.?!;\n\r]{{0,60}}{strap_term}|{strap_term}[^.?!;\n\r]{{0,60}}{wh_term})',
        re.IGNORECASE
    )
    wh_general_pat = re.compile(rf'\b{wh_term}\b', re.IGNORECASE)

    tier1_comments = []
    tier2_comments = []

    for txt in candidate_texts:
        if not txt or not isinstance(txt, str):
            continue
        norm_txt = re.sub(r'[\r\n]+', '\n', txt)
        raw_chunks = re.split(r'(?<=[.?!;])\s+|\n+', norm_txt)
        for s in raw_chunks:
            s_clean = s.strip(" \t\r\n-•*")
            if not s_clean or len(s_clean) < 6:
                continue
            s_clean_narr = re.sub(
                r'^(?:ADDITIONAL\s+FEATURES|ADDITIONAL\s+COMMENTS|COMMENTS|NOTE|APPRAISAL\s+COMMENTS|'
                r'SCOPE\s+OF\s+WORK|SUBJECT\s+PROPERTY\s+OBSERVATIONS?|IMPROVEMENTS?\s+COMMENTS?)\s*[:\-]\s*',
                '',
                s_clean,
                flags=re.IGNORECASE
            ).strip()

            if wh_with_strap_pat.search(s_clean_narr):
                if s_clean_narr not in tier1_comments:
                    tier1_comments.append(s_clean_narr)
            elif wh_general_pat.search(s_clean_narr):
                if len(s_clean_narr) > 15 and not re.match(r'^(?:appliances?|utilities?|heating|mechanical)\s*[:\-]', s_clean_narr, re.I):
                    if s_clean_narr not in tier2_comments:
                        tier2_comments.append(s_clean_narr)

    if tier1_comments:
        return " ".join(tier1_comments)
    if tier2_comments:
        return " ".join(tier2_comments)

    if extracted_photos:
        for photo in extracted_photos:
            caption = (photo.get("caption") or photo.get("original_label") or "").strip()
            p_no = photo.get("page")
            cap_lower = caption.lower()
            if any(k in cap_lower for k in ["water heater", "waterheater", "hot water heater", "water tank"]):
                page_str = f" (Page {p_no})" if p_no else ""
                return f"Photo present: {caption}{page_str}"

    return ""



def _extract_nonconforming_rebuild_comment(
    full_narrative: str = "",
    dom_narratives: Optional[List[str]] = None,
    root: Optional[ET.Element] = None
) -> str:
    """
    If Zoning Compliance is nonconforming, finds and extracts commentary regarding
    whether the subject property/improvements can be rebuilt, rebuild, destroyed, or remoulded.
    Keywords: rebuilt, rebuild, destroy, remould.
    """
    search_texts = []
    if full_narrative:
        search_texts.append(full_narrative)
    if dom_narratives:
        search_texts.extend(dom_narratives)

    if root is not None:
        for elem in root.iter():
            for k, v in elem.attrib.items():
                if v and any(kw in v.lower() for kw in ["rebuilt", "rebuild", "destroy", "remould", "remodel", "reconstruct"]):
                    search_texts.append(v)
            if elem.text and any(kw in elem.text.lower() for kw in ["rebuilt", "rebuild", "destroy", "remould", "remodel", "reconstruct"]):
                search_texts.append(elem.text)

    combined_text = "\n\n".join(search_texts)
    if not combined_text:
        return ""

    kw_pattern = re.compile(
        r'\b(?:re-?built|re-?build(?:ing)?|destroy(?:ed)?|destruct(?:ion)?|re-?mould(?:ed)?|re-?model(?:ed|ing)?|re-?construct(?:ed|ion)?)\b',
        re.IGNORECASE
    )

    candidates = []

    # 1. Sentence-level and clean chunk checks
    chunks = [c.strip(" \t\r\n-•*\"'") for c in re.split(r'(?<=[.?!;])\s+|[\r\n]+', combined_text) if c.strip(" \t\r\n-•*\"'")]
    for idx, c_clean in enumerate(chunks):
        if len(c_clean) < 10 or len(c_clean) > 800:
            continue
        if kw_pattern.search(c_clean):
            score = 0
            c_lower = c_clean.lower()
            if any(term in c_lower for term in ["zoning", "nonconforming", "non-conforming", "grandfathered", "compliance"]):
                score += 30
            if "rebuilt" in c_lower or "rebuild" in c_lower:
                score += 10
            if "destroy" in c_lower or "destroyed" in c_lower:
                score += 10
            if "remould" in c_lower or "remodel" in c_lower:
                score += 8
            if any(term in c_lower for term in ["can be", "may be", "allowed", "permitted", "subject", "structure", "improvements"]):
                score += 5

            context_chunk = c_clean
            if idx > 0 and any(term in chunks[idx - 1].lower() for term in ["zoning", "nonconforming", "non-conforming", "grandfathered"]):
                context_chunk = f"{chunks[idx - 1]} {c_clean}"
                score += 20
            elif idx < len(chunks) - 1 and any(term in chunks[idx + 1].lower() for term in ["zoning", "nonconforming", "non-conforming", "grandfathered"]):
                context_chunk = f"{c_clean} {chunks[idx + 1]}"
                score += 20

            candidates.append((score, context_chunk))

    # 2. Paragraph-level checks fallback
    paragraphs = [p.strip(" \t\r\n-•*\"'") for p in re.split(r'(?:[\r\n]\s*){2,}', combined_text) if p.strip(" \t\r\n-•*\"'")]
    for p_clean in paragraphs:
        if len(p_clean) < 10 or len(p_clean) > 1200:
            continue
        if kw_pattern.search(p_clean):
            p_lower = p_clean.lower()
            score = 0
            if any(term in p_lower for term in ["zoning", "nonconforming", "non-conforming", "grandfathered", "compliance"]):
                score += 20
            if "rebuilt" in p_lower or "rebuild" in p_lower:
                score += 8
            if "destroy" in p_lower or "destroyed" in p_lower:
                score += 8
            if "remould" in p_lower or "remodel" in p_lower:
                score += 6
            if any(term in p_lower for term in ["can be", "may be", "allowed", "permitted", "subject", "structure", "improvements"]):
                score += 4
            candidates.append((score, p_clean))

    if candidates:
        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1]

    m = re.search(
        r'([^.?!;\n\r]{0,100}\b(?:rebuilt|rebuild|destroy(?:ed)?|remould)\b[^.?!;\n\r]{0,200}(?:[.?!]|$))',
        combined_text,
        re.IGNORECASE
    )
    if m:
        return m.group(0).strip(" \t\r\n-•*\"'")

    return ""


def _extract_over_under_improvement_comment(
    full_narrative: str = "",
    dom_narratives: Optional[List[str]] = None,
    root: Optional[ET.Element] = None
) -> str:
    """
    Extracts explanatory commentary regarding over-improvement / under-improvement
    or why the subject property value/indicated value is higher or lower than the predominant price.
    Keywords: 'over-improvement', 'over improvement', 'over-improved', 'under-improvement',
              'under improvement', 'under-improved', 'predominant', 'predominate',
              'higher', 'lower', 'conform to neighborhood', 'conforms to neighborhood'.
    """
    candidates = []

    if root is not None:
        for pa in root.findall(".//PROPERTY_ANALYSIS"):
            if pa.attrib.get("_Type") == "ConformsToNeighborhood":
                c = pa.attrib.get("_Comment", "").strip()
                if c:
                    candidates.append(("PropertyAnalysis", c))

        recon = root.find(".//_RECONCILIATION")
        if recon is not None:
            for k in ["_SummaryComment", "_ConditionsComment"]:
                c = recon.attrib.get(k, "").strip()
                if c:
                    candidates.append(("Reconciliation", c))

        vm = root.find(".//VALUATION_METHODS")
        if vm is not None:
            c = vm.attrib.get("_AdditionalDescription", "").strip()
            if c:
                candidates.append(("ValuationMethods", c))

        nb = root.find(".//NEIGHBORHOOD")
        if nb is not None:
            for k in ["_Description", "_MarketConditionsDescription", "_BoundaryAndCharacteristicsDescription"]:
                c = nb.attrib.get(k, "").strip()
                if c:
                    candidates.append(("Neighborhood", c))

        for elem in root.iter():
            for k, v in elem.attrib.items():
                if any(term in k.lower() for term in ["comment", "description", "narrative", "text"]) and v:
                    candidates.append((elem.tag, v))
            if elem.text and len(elem.text.strip()) > 10 and not elem.text.startswith("JVBERi"):
                candidates.append((elem.tag, elem.text.strip()))

    if dom_narratives:
        for t in dom_narratives:
            if t and len(t) > 10:
                candidates.append(("DOM", t))

    if full_narrative:
        candidates.append(("FullNarrative", full_narrative))

    kw_pattern = re.compile(
        r'\b(?:over-?improvements?|over-?improved?|under-?improvements?|under-?improved?|predominan\w*|predominat\w*)\b',
        re.IGNORECASE
    )

    matches = []
    seen = set()

    for src, text in candidates:
        sentences = [s.strip(" \t\r\n-•*\"'") for s in re.split(r'(?<=[.?!])\s+|[\r\n]+', text) if s.strip()]
        for s in sentences:
            if len(s) < 15 or len(s) > 800:
                continue
            s_norm = re.sub(r'\s+', ' ', s).strip()
            if s_norm in seen:
                continue
            if kw_pattern.search(s_norm):
                seen.add(s_norm)
                score = 0
                s_lower = s_norm.lower()

                if "over-improvement" in s_lower or "over improvement" in s_lower or "over-improved" in s_lower:
                    score += 50
                if "under-improvement" in s_lower or "under improvement" in s_lower or "under-improved" in s_lower:
                    score += 50
                if "higher" in s_lower or "above" in s_lower or "exceed" in s_lower:
                    score += 25
                if "lower" in s_lower or "below" in s_lower:
                    score += 25
                if "predominant" in s_lower or "predominate" in s_lower:
                    score += 20
                if "not considered" in s_lower or "not an" in s_lower or "no impact" in s_lower:
                    score += 15
                if "market range" in s_lower or "opinion of value" in s_lower or "supported by" in s_lower:
                    score += 10
                if "conform" in s_lower:
                    score += 10

                matches.append((score, s_norm))

    matches.sort(key=lambda x: x[0], reverse=True)

    if matches:
        top_matches = []
        for score, sent in matches:
            if score >= 35:
                if not any(sent.lower() in m.lower() or m.lower() in sent.lower() for m in top_matches):
                    top_matches.append(sent)
            if len(top_matches) >= 2:
                break
        if top_matches:
            return " ".join(top_matches)
        return matches[0][1]

    return ""


def _extract_other_land_use_comment(
    full_narrative: str = "",
    dom_narratives: Optional[List[str]] = None,
    nb_texts: Optional[List[str]] = None,
    other_percent: str = "",
    root: Optional[ET.Element] = None
) -> str:
    """
    Extracts comment/description for 'Present Land Use for other' from neighborhood narratives,
    improvements narratives, supplemental addenda, and DOM text when 'Other' land use > 0%
    or when the grid description is generic (e.g. 'Other', 'See Addendum').
    Keywords: other, vacant, park, playground, public, education, commercial, open space, recreation, church, school, etc.
    """
    search_texts = []
    if nb_texts:
        search_texts.extend([t for t in nb_texts if t])
    if dom_narratives:
        search_texts.extend([t for t in dom_narratives if t])
    if full_narrative:
        search_texts.append(full_narrative)

    if root is not None:
        for elem in root.iter():
            for k, v in elem.attrib.items():
                if v and any(kw in v.lower() for kw in ["other is", "land use", "vacant", "park", "playground"]):
                    search_texts.append(v)
            if elem.text and not elem.text.startswith("JVBERi"):
                elem_t = elem.text.strip()
                if any(kw in elem_t.lower() for kw in ["other is", "land use", "vacant", "park", "playground"]):
                    search_texts.append(elem_t)

    KEYWORDS = [
        "vacant", "park", "parks", "playground", "playgrounds", "open space", "public",
        "education", "commercial", "recreation", "church", "churches", "school", "schools",
        "agricultural", "wooded", "golf course", "industrial", "common area", "conservation",
        "greenbelt", "undeveloped", "forest", "preserve", "civic", "government", "institutional"
    ]

    pct_str = re.sub(r'[^0-9]', '', other_percent or '')

    specific_patterns = [
        re.compile(r'(?:\b(?:\d{1,2}%|\d{1,2}\s*percent)\s*other\b[^\.\n;\r]*?(?:is\s+|are\s+|includes\s+|consists\s+of\s+|[:\-])\s*)([^\.\n;\r]+)', re.IGNORECASE),
        re.compile(r'(?:(?:\bother\s*(?:present\s+)?land\s*use\b|present\s+land\s+use\s+(?:for\s+)?other\b)[^\.\n;\r]*?(?:is\s+|are\s+|includes\s+|consists\s+of\s+|[:\-])\s*)([^\.\n;\r]+)', re.IGNORECASE),
        re.compile(r'(?:\bother\s+(?:land\s+use\s*)?(?:is|are|includes|consists\s+of|[:\-])\s*)([^\.\n;\r]+)', re.IGNORECASE),
        re.compile(r'(?:\bother\s*[:\-]\s*)([^\.\n;\r]+)', re.IGNORECASE),
    ]

    for t in search_texts:
        if not t:
            continue
        for pat in specific_patterns:
            for m in pat.finditer(t):
                candidate = m.group(1).strip()
                clean_cand = re.sub(r'^(?:is\s+|are\s+|includes\s+|consists\s+of\s+|[:\-\s]+)+', '', candidate, flags=re.IGNORECASE)
                clean_cand = clean_cand.strip(" \t\r\n.,;:\"'-")
                
                if not clean_cand or len(clean_cand) < 2 or len(clean_cand) > 150:
                    continue
                cand_lower = clean_cand.lower()
                if cand_lower in ["other", "see addendum", "see attached", "see addenda", "n/a", "none", "see narrative", "see comments", "unknown"]:
                    continue
                
                if any(kw in cand_lower for kw in KEYWORDS):
                    return clean_cand
                if "land use" in m.group(0).lower():
                    return clean_cand

    for t in search_texts:
        if not t:
            continue
        sentences = re.split(r'(?<=[.?!;])\s+|[\r\n]+', t)
        for s in sentences:
            s_clean = s.strip(" \t\r\n-•*\"'")
            if len(s_clean) < 5 or len(s_clean) > 250:
                continue
            s_lower = s_clean.lower()
            if ("other" in s_lower or (pct_str and f"{pct_str}%" in s_lower)) and any(kw in s_lower for kw in KEYWORDS):
                extracted = re.sub(
                    r'^(?:.*?\b(?:(?:\d{1,2}%|\d{1,2}\s*percent)\s*)?other\s*(?:present\s+)?(?:land\s*use\s*)?(?:is\s+|are\s+|includes\s+|consists\s+of\s+|[:\-])\s*)',
                    '',
                    s_clean,
                    flags=re.IGNORECASE
                ).strip(" \t\r\n.,;:\"'-")
                if extracted and len(extracted) > 2 and extracted.lower() not in ["other", "see addendum", "n/a"]:
                    return extracted
                if len(s_clean) <= 120:
                    return s_clean

    return ""


def _detect_1004mc_presence(root: ET.Element, embedded_doc: Optional[ET.Element] = None) -> Tuple[bool, str]:
    """
    Identifies whether 1004MC (Market Conditions Addendum) is present in MISMO XML.
    Checks:
    1. <FORM> addenda elements
    2. <MARKET> and <MARKET_INVENTORY> data elements
    3. Embedded PDF document text
    Returns (is_present: bool, reason: str)
    """
    for form in root.findall(".//FORM"):
        name = f"{form.attrib.get('AppraisalReportContentName', '')} {form.attrib.get('AppraisalReportContentIdentifier', '')}".upper()
        if "1004MC" in name or "MARKET CONDITIONS ADDENDUM" in name:
            return True, f"FORM Addendum Tag: {form.attrib.get('AppraisalReportContentName', '') or form.attrib.get('AppraisalReportContentIdentifier', '')}"

    market_elem = root.find(".//MARKET")
    inventory_items = root.findall(".//MARKET_INVENTORY")
    if market_elem is not None or len(inventory_items) > 0:
        return True, f"XML <MARKET> tag with {len(inventory_items)} inventory records"

    if embedded_doc is not None and embedded_doc.text:
        try:
            pdf_bytes = base64.b64decode(embedded_doc.text.strip())
            if fitz is not None:
                pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
                for page_num, page in enumerate(pdf, 1):
                    txt = (page.get_text() or "").upper()
                    if "1004MC" in txt or "MARKET CONDITIONS ADDENDUM" in txt or ("INVENTORY ANALYSIS" in txt and ("PRIOR 7-12" in txt or "ABSORPTION RATE" in txt)):
                        pdf.close()
                        return True, f"Embedded PDF Page {page_num}"
                pdf.close()
        except Exception:
            pass

    return False, "Not Present"


def _detect_uspap_identification_presence(root: ET.Element, embedded_doc: Optional[ET.Element] = None) -> Tuple[bool, str]:
    """
    Identifies whether USPAP or Appraisal and Report Identification page is present in MISMO XML or embedded PDF.
    Checks:
    1. <FORM> elements for USPAP / Appraisal and Report Identification
    2. <FORM> AppraisalAddendumText attributes
    3. Embedded PDF document pages
    Returns (is_present: bool, reason: str)
    """
    for form in root.findall(".//FORM"):
        name = f"{form.attrib.get('AppraisalReportContentName', '')} {form.attrib.get('AppraisalReportContentIdentifier', '')} {form.attrib.get('AppraisalReportContentType', '')}".upper()
        if "APPRAISAL AND REPORT IDENTIFICATION" in name or "APPRAISAL & REPORT IDENTIFICATION" in name or "REPORT IDENTIFICATION" in name:
            return True, f"FORM Tag: {form.attrib.get('AppraisalReportContentName', '') or form.attrib.get('AppraisalReportContentIdentifier', '')}"
        if "USPAP" in name:
            return True, f"FORM Tag (USPAP): {form.attrib.get('AppraisalReportContentName', '') or form.attrib.get('AppraisalReportContentIdentifier', '')}"

        addendum_txt = (form.attrib.get("AppraisalAddendumText") or "").upper()
        if "APPRAISAL AND REPORT IDENTIFICATION" in addendum_txt or "APPRAISAL & REPORT IDENTIFICATION" in addendum_txt or "COMMENTS ON APPRAISAL AND REPORT IDENTIFICATION" in addendum_txt:
            return True, "FORM Addendum Text: Appraisal and Report Identification"
        if "USPAP ADDENDUM" in addendum_txt or "USPAP COMPLIANCE" in addendum_txt or "USPAP IDENTIFICATION" in addendum_txt:
            return True, "FORM Addendum Text: USPAP Addendum"

    if embedded_doc is not None and embedded_doc.text:
        try:
            pdf_bytes = base64.b64decode(embedded_doc.text.strip())
            if fitz is not None:
                pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
                for page_num, page in enumerate(pdf, 1):
                    txt = (page.get_text() or "").upper()
                    if "APPRAISAL AND REPORT IDENTIFICATION" in txt or "APPRAISAL & REPORT IDENTIFICATION" in txt or "COMMENTS ON APPRAISAL AND REPORT IDENTIFICATION" in txt:
                        pdf.close()
                        return True, f"Embedded PDF Page {page_num} (Appraisal and Report Identification)"
                    if (
                        "USPAP ADDENDUM" in txt
                        or "USPAP COMPLIANCE" in txt
                        or "USPAP IDENTIFICATION" in txt
                        or ("USPAP" in txt and ("STANDARDS RULE" in txt or "REASONABLE EXPOSURE TIME" in txt or "REPORTING OPTION" in txt))
                    ):
                        pdf.close()
                        return True, f"Embedded PDF Page {page_num} (USPAP)"
                pdf.close()
        except Exception:
            pass

    return False, "Not Present"


def extract_invoice_copy_data(page, p_no: int) -> Dict[str, Any]:
    """
    Extracts structured invoice copy data and high-res image from an invoice page.
    Works for TOTAL Form NIV5D, ACI, ClickFORMS, Bradford, SFREP, and scanned invoices.
    """
    # 1. Render high-res image preview of the invoice page
    pix = page.get_pixmap(dpi=150)
    b64_img = base64.b64encode(pix.tobytes("jpeg")).decode("utf-8")
    base64_preview = f"data:image/jpeg;base64,{b64_img}"

    # 2. Extract words
    words = page.get_text("words") or []

    # Left header (Appraiser / Payee info) vs Right header (Invoice #, Dates)
    left_hdr_words = [w for w in words if w[0] < 310 and w[1] < 160]
    right_hdr_words = [w for w in words if w[0] >= 300 and w[1] < 160]
    body_words = [w for w in words if w[1] >= 150]

    def words_to_lines(word_list):
        lines = []
        curr = []
        curr_y = None
        for w in sorted(word_list, key=lambda x: (round(x[1] / 4.0) * 4.0, x[0])):
            wy = round(w[1] / 4.0) * 4.0
            if curr_y is None or abs(wy - curr_y) < 3.5:
                curr.append(w[4])
                curr_y = wy
            else:
                lines.append(" ".join(curr))
                curr = [w[4]]
                curr_y = wy
        if curr:
            lines.append(" ".join(curr))
        return lines

    left_hdr_lines = words_to_lines(left_hdr_words)
    right_hdr_lines = words_to_lines(right_hdr_words)
    body_lines = words_to_lines(body_words)
    all_lines = words_to_lines(words)

    full_visual_text = "\n".join(all_lines)
    raw_text = page.get_text("text") or ""

    inv_data = {
        "Invoice Attached": "Yes",
        "Invoice Present": "Yes",
        "has_invoice": True,
        "Invoice Page": p_no,
        "Invoice Number": "",
        "Invoice Date": "",
        "Due Date": "",
        "Invoice Total": "",
        "Total Fee": "",
        "Fee Amount": "",
        "Balance Due": "",
        "Amount Paid": "",
        "Payment Status": "",
        "Appraiser / Payee": "",
        "Payee Address": "",
        "Payee Phone": "",
        "Payee Email": "",
        "Client / Billed To": "",
        "Client Email": "",
        "Lender": "",
        "Borrower": "",
        "Property Address": "",
        "City State Zip": "",
        "Service Description": "",
        "Legal Description": "",
        "base64_preview": base64_preview
    }

    # --- Header Parsing (Left: Appraiser/Payee, Right: Inv#/Date) ---
    # Appraiser Name from FROM: line or top left header
    m_from = re.search(r'FROM\s*:\s*\n?\s*([^\n\r|]+)', full_visual_text, re.I)
    if m_from and m_from.group(1).strip() and not any(k in m_from.group(1).upper() for k in ["INVOICE", "FORM", "TELEPHONE", "FAX"]):
        inv_data["Appraiser / Payee"] = m_from.group(1).strip()
    elif left_hdr_lines:
        for l in left_hdr_lines:
            l_s = re.sub(r'^\s*FROM\s*:\s*', '', l, flags=re.I).strip()
            if l_s and not any(k in l_s.upper() for k in ["INVOICE", "FORM", "TELEPHONE", "FAX", "TO:"]):
                inv_data["Appraiser / Payee"] = l_s
                break

    # Payee Address
    street_line = ""
    csz_line = ""
    for l in left_hdr_lines:
        l_s = l.strip()
        if re.search(r'\d+\s+[A-Za-z0-9\s]+(?:Rd|St|Ave|Dr|Blvd|Ln|Way|Ct|Highway|Hwy|Pkwy|Plaza|Road|Street|Avenue|Lane|Drive)\b', l_s, re.I):
            street_line = l_s
        elif re.search(r'^[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?', l_s):
            csz_line = l_s
    if street_line and csz_line:
        inv_data["Payee Address"] = f"{street_line}, {csz_line}"
    elif csz_line:
        inv_data["Payee Address"] = csz_line
    elif street_line:
        inv_data["Payee Address"] = street_line

    # Payee Phone
    for l in left_hdr_lines:
        m_ph = re.search(r'\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}', l)
        if m_ph:
            inv_data["Payee Phone"] = m_ph.group(0).strip()
            break

    # Invoice Number from Right Header or Full Text
    for l in right_hdr_lines:
        m_num = re.search(r'(?:Client\s*File\s*#|Main\s*File\s*#|Internal\s*Order\s*#|Invoice\s*(?:#|No|Number))\s*[:\-]?\s*([0-9][A-Za-z0-9\-]+)', l, re.I)
        if m_num:
            inv_data["Invoice Number"] = m_num.group(1).strip()
            break
        m_pat = re.search(r'\b(\d{4,}-\d{4,})\b', l)
        if m_pat and not inv_data["Invoice Number"]:
            inv_data["Invoice Number"] = m_pat.group(1).strip()

    if not inv_data["Invoice Number"]:
        m_inv_num = re.search(r'(?:Client\s*File\s*#|Main\s*File\s*#\s*(?:on\s*form)?|Internal\s*Order\s*#|Invoice\s*(?:#|No|Number))\s*[:\-]?\s*([0-9][A-Za-z0-9\-]+)', full_visual_text, re.I)
        if m_inv_num:
            inv_data["Invoice Number"] = m_inv_num.group(1).strip()
        else:
            m_num2 = re.search(r'\b(\d{4,}-\d{4,})\b', full_visual_text)
            if m_num2:
                inv_data["Invoice Number"] = m_num2.group(1).strip()

    # Invoice Date from Right Header or Full Text
    for l in right_hdr_lines:
        m_d = re.search(r'(?:Invoice\s*Date|Date\s*of\s*Invoice|Date)\s*[:\-]?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})', l, re.I)
        if m_d:
            inv_data["Invoice Date"] = m_d.group(1).strip()
            break
    if not inv_data["Invoice Date"]:
        m_date = re.search(r'(?:Invoice\s*Date|Date\s*of\s*Invoice)\s*[:\-]?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})', full_visual_text, re.I)
        if m_date:
            inv_data["Invoice Date"] = m_date.group(1).strip()
        else:
            m_d2 = re.search(r'\b(\d{1,2}/\d{1,2}/\d{4})\b', full_visual_text)
            if m_d2:
                inv_data["Invoice Date"] = m_d2.group(1).strip()

    # Due Date - only extract if actually present in document
    m_due = re.search(r'(?:Due\s*Date|Payment\s*Due|Terms)\s*[:\-]\s*([^\n\r|]+)', full_visual_text, re.I)
    if m_due and m_due.group(1).strip():
        val = m_due.group(1).strip()
        if not any(stop in val.upper() for stop in ["REFERENCE", "INTERNAL", "FILE", "LENDER"]):
            inv_data["Due Date"] = val
    if not inv_data["Due Date"]:
        for l in right_hdr_lines:
            m_dl = re.search(r'(?:Due\s*Date|Terms)\s*[:\-]\s*([A-Za-z0-9\s/]+)$', l, re.I)
            if m_dl and m_dl.group(1).strip():
                inv_data["Due Date"] = m_dl.group(1).strip()
                break

    # Amounts & Total Due
    m_tot = re.search(r'(?:TOTAL\s*DUE(?:\s*\$)?|AMOUNT\s*DUE(?:\s*\$)?|INVOICE\s*TOTAL(?:\s*\$)?|TOTAL\s*FEE(?:\s*\$)?)[^\n\r0-9]{0,20}\n?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)', full_visual_text, re.I)
    if m_tot:
        amt_str = f"${m_tot.group(1).strip()}"
        inv_data["Invoice Total"] = amt_str
        inv_data["Total Fee"] = amt_str
        inv_data["Fee Amount"] = amt_str
    else:
        m_sub = re.search(r'\b([0-9]{1,3}(?:,[0-9]{3})*\.\d{2})\b', full_visual_text)
        if m_sub:
            amt_str = f"${m_sub.group(1).strip()}"
            inv_data["Invoice Total"] = amt_str
            inv_data["Total Fee"] = amt_str
            inv_data["Fee Amount"] = amt_str

    # Amount Paid - only extract if document explicitly lists payment amount
    m_paid = re.search(r'(?:Amount\s*Paid|Paid\s*Amount|Payments?\s*(?:Amount)?|Check\s*Amount)[^\n\r0-9]{0,20}\n?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)', full_visual_text, re.I)
    if m_paid:
        inv_data["Amount Paid"] = f"${m_paid.group(1).strip()}"

    # Balance Due - only extract if document lists balance
    m_bal = re.search(r'(?:Balance\s*Due|Amount\s*Due|Remaining\s*Balance)[^\n\r0-9]{0,20}\n?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)', full_visual_text, re.I)
    if m_bal:
        inv_data["Balance Due"] = f"${m_bal.group(1).strip()}"

    # Payment Status - only if document states it or explicitly marked
    if re.search(r'\bPAID\s+IN\s+FULL\b|\bSTATUS\s*:\s*PAID\b|\bPAID\s*\(X\)', full_visual_text, re.I):
        inv_data["Payment Status"] = "Paid"
    elif re.search(r'\bSTATUS\s*:\s*UNPAID\b|\bUNPAID\b', full_visual_text, re.I):
        inv_data["Payment Status"] = "Unpaid"
    elif re.search(r'\bDUE\s+UPON\s+RECEIPT\b', full_visual_text, re.I):
        inv_data["Payment Status"] = "Due Upon Receipt"
    elif re.search(r'\bPENDING\b', full_visual_text, re.I):
        inv_data["Payment Status"] = "Pending"
    else:
        inv_data["Payment Status"] = ""

    # Client Email
    m_email = re.search(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', full_visual_text)
    if m_email:
        inv_data["Client Email"] = m_email.group(0).strip()

    # Client / Billed To from Client: or TO: block
    m_cli = re.search(r'(?:Client|Billed\s*To|Bill\s*To)\s*:\s*([^\n\r|]+)', full_visual_text, re.I)
    if m_cli and m_cli.group(1).strip():
        inv_data["Client / Billed To"] = m_cli.group(1).strip()
    else:
        m_to = re.search(r'TO\s*:\s*\n?\s*([^\n\r|]+)', full_visual_text, re.I)
        if m_to and m_to.group(1).strip():
            inv_data["Client / Billed To"] = m_to.group(1).strip()

    # Lender
    m_lend = re.search(r'Lender\s*:\s*([^\n\r|]+?)(?:\s+Client:|\s*$)', full_visual_text, re.I)
    if m_lend:
        inv_data["Lender"] = m_lend.group(1).strip()

    # Borrower
    m_borr = re.search(r'(?:Purchaser/Borrower|Borrower|Purchaser)\s*:\s*\n?\s*([^\n\r|]+)', full_visual_text, re.I)
    if m_borr:
        inv_data["Borrower"] = m_borr.group(1).strip()

    # Property Address
    m_paddr = re.search(r'Property\s*Address\s*:\s*([^\n\r|]+)', full_visual_text, re.I)
    if m_paddr:
        inv_data["Property Address"] = m_paddr.group(1).strip()

    # City State Zip
    m_city = re.search(r'City\s*:\s*([A-Za-z\s]+?)(?:\s+County|\s+State|\s*$)', full_visual_text, re.I | re.M)
    m_state = re.search(r'State\s*:\s*([A-Z]{2})', full_visual_text, re.I)
    m_zip = re.search(r'Zip\s*:\s*(\d{5}(?:-\d{4})?)', full_visual_text, re.I)
    if m_city and m_state and m_zip:
        inv_data["City State Zip"] = f"{m_city.group(1).strip()}, {m_state.group(1).strip()} {m_zip.group(1).strip()}"
        if inv_data["Property Address"] and inv_data["City State Zip"] not in inv_data["Property Address"]:
            inv_data["Property Address"] = f"{inv_data['Property Address']}, {inv_data['City State Zip']}"

    # Service Description - from invoice line items table
    m_svc_hdr = re.search(r'(?:FEES\s+AMOUNT|ITEM\s+DESCRIPTION|SERVICE\s+DESCRIPTION|SERVICES\s+RENDERED)\s*\n+([^\n\r]+)', full_visual_text, re.I)
    if m_svc_hdr:
        inv_data["Service Description"] = m_svc_hdr.group(1).strip()
    if not inv_data["Service Description"]:
        m_svc_line = re.search(r'\n([^\n\r$]{3,80}\s+\$?[0-9,]+\.\d{2}|\$?[0-9,]+\.\d{2}\s*-\s*[^\n\r]+)', full_visual_text)
        if m_svc_line:
            line_str = m_svc_line.group(1).strip()
            if not any(h in line_str.upper() for h in ["TOTAL", "SUBTOTAL", "BALANCE", "AMOUNT DUE", "FEE AMOUNT", "PAID"]):
                inv_data["Service Description"] = line_str

    # Legal Description
    m_leg = re.search(r'Legal\s*Description\s*:\s*([^\n\r]+)', full_visual_text, re.I)
    if m_leg:
        inv_data["Legal Description"] = m_leg.group(1).strip()

    return inv_data


def _detect_invoice_presence(root: ET.Element, embedded_doc: Optional[ET.Element] = None, full_narrative: str = "") -> Tuple[bool, str, Dict[str, Any]]:
    """
    Identifies whether an appraisal invoice page or invoice copy is present in MISMO XML or embedded PDF.
    Checks:
    1. <FORM> elements for INVOICE
    2. <FORM> AppraisalAddendumText attributes
    3. <DOCUMENT> or <EMBEDDED_FILE> elements
    4. Embedded PDF document pages
    5. Full narrative text
    Returns (is_present: bool, reason: str, invoice_details: Dict[str, Any])
    """
    inv_details: Dict[str, Any] = {
        "Invoice Attached": "No",
        "Invoice Present": "No",
        "Invoice Page": None,
        "Invoice Total": "",
        "has_invoice": False
    }

    # 1. Check <FORM> tags
    for form in root.findall(".//FORM"):
        name = f"{form.attrib.get('AppraisalReportContentName', '')} {form.attrib.get('AppraisalReportContentIdentifier', '')} {form.attrib.get('AppraisalReportContentType', '')}".upper()
        if "INVOICE" in name or "APPRAISAL INVOICE" in name or "FEE INVOICE" in name:
            inv_details["Invoice Attached"] = "Yes"
            inv_details["Invoice Present"] = "Yes"
            inv_details["has_invoice"] = True
            inv_details["Invoice Page"] = "FORM Tag"
            return True, f"FORM Tag: {form.attrib.get('AppraisalReportContentName', '') or form.attrib.get('AppraisalReportContentIdentifier', '')}", inv_details

        addendum_txt = (form.attrib.get("AppraisalAddendumText") or "").upper()
        if re.search(r'\bINVOICE\b|APPRAISAL\s+INVOICE|FEE\s+INVOICE', addendum_txt):
            inv_details["Invoice Attached"] = "Yes"
            inv_details["Invoice Present"] = "Yes"
            inv_details["has_invoice"] = True
            inv_details["Invoice Page"] = "FORM Addendum Text"
            return True, "FORM Addendum Text: Invoice", inv_details

    # 2. Check embedded PDF document
    if embedded_doc is not None and embedded_doc.text:
        try:
            pdf_bytes = base64.b64decode(embedded_doc.text.strip())
            if fitz is not None:
                pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
                for page_num, page in enumerate(pdf, 1):
                    raw_t = page.get_text() or ""
                    t_upper = raw_t.upper()

                    # Skip standard Form primary body pages
                    is_primary = ("PAGE 1 OF 6" in t_upper or "PAGE 2 OF 6" in t_upper or "PAGE 3 OF 6" in t_upper or "PAGE 1 OF 5" in t_upper)
                    if is_primary:
                        continue

                    has_inv_heading = bool(re.search(
                        r'\bINVOICE\b|APPRAISAL\s+INVOICE|FEE\s+INVOICE|SERVICES\s+INVOICE|\*+\s*INVOICE\s*\*+',
                        t_upper
                    ))
                    has_inv_indicators = bool(re.search(
                        r'INVOICE\s*(?:#|NO|NUMBER|DATE|TOTAL|AMOUNT|DUE)|'
                        r'TOTAL\s*(?:DUE|FEE|AMOUNT\s*DUE)|AMOUNT\s*DUE|BALANCE\s*DUE|'
                        r'PLEASE\s*REMIT|REMIT\s*(?:TO|PAYMENT)|BILL\s*TO|BILLED\s*TO|'
                        r'FEES\s+AMOUNT\s+SUBTOTAL|INVOICE\s*TAX\s*ID',
                        t_upper
                    ))

                    if has_inv_heading and has_inv_indicators:
                        inv_details = extract_invoice_copy_data(page, page_num)
                        pdf.close()
                        return True, f"Embedded PDF Page {page_num} (Invoice)", inv_details
                pdf.close()
        except Exception:
            pass

    # 3. Check full narrative text
    if full_narrative:
        fn_upper = full_narrative.upper()
        if re.search(r'INVOICE\s*(?:COPY\s*)?ATTACHED|COPY\s*OF\s*INVOICE\s*ATTACHED|INVOICE\s*ATTACHED\s*TO\s*REPORT|INVOICE\s*IS\s*ATTACHED', fn_upper):
            inv_details["Invoice Attached"] = "Yes"
            inv_details["Invoice Present"] = "Yes"
            inv_details["has_invoice"] = True
            inv_details["Invoice Page"] = "Narrative"
            return True, "Narrative: Invoice Attached", inv_details

    return False, "Not Present", inv_details


def _detect_uad_pages_presence(root: ET.Element, embedded_doc: Optional[ET.Element] = None) -> Tuple[bool, str, List[int], Dict[str, Any]]:
    """
    Identifies whether UAD (Uniform Appraisal Dataset) definitions addendum pages,
    Scope of Work, Limiting Conditions, and Certifications are present in MISMO XML or embedded PDF.
    Returns (is_present: bool, reason_str: str, uad_pages: List[int], uad_details: Dict[str, Any])
    """
    uad_pages: List[int] = []
    uad_source = ""
    limiting_pages: List[int] = []
    cert_pages: List[int] = []

    # 1. Check <FORM> tags
    for form in root.findall(".//FORM"):
        name = f"{form.attrib.get('AppraisalReportContentName', '')} {form.attrib.get('AppraisalReportContentIdentifier', '')} {form.attrib.get('AppraisalReportContentType', '')}".upper()
        if "UAD" in name or "UNIFORM APPRAISAL DATASET" in name or "UADDEFINE" in name:
            if not uad_source:
                uad_source = f"FORM Tag: {form.attrib.get('AppraisalReportContentName', '') or form.attrib.get('AppraisalReportContentIdentifier', '')}"

    # 2. Check embedded PDF
    pdf_bytes = None
    if embedded_doc is not None and embedded_doc.text and len(embedded_doc.text.strip()) > 100:
        try:
            pdf_bytes = base64.b64decode(embedded_doc.text.strip())
        except Exception:
            pass

    if not pdf_bytes:
        for tag in [".//EMBEDDED_FILE/DOCUMENT", ".//DOCUMENT", ".//EMBEDDED_FILE"]:
            elem = root.find(tag)
            if elem is not None and elem.text and len(elem.text.strip()) > 100:
                try:
                    pdf_bytes = base64.b64decode(elem.text.strip())
                    if pdf_bytes:
                        break
                except Exception:
                    pass

    if pdf_bytes:
        pages_text: List[Tuple[int, str]] = []
        if fitz is not None:
            try:
                pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
                for p_no, page in enumerate(pdf, 1):
                    pages_text.append((p_no, page.get_text() or ""))
                pdf.close()
            except Exception:
                pages_text = []

        if not pages_text and pypdf is not None:
            try:
                reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
                for p_no, page in enumerate(reader.pages, 1):
                    pages_text.append((p_no, page.extract_text() or ""))
            except Exception:
                pages_text = []

        for p_no, txt in pages_text:
            upper_txt = txt.upper()
            is_uad = any(k in upper_txt for k in [
                "UNIFORM APPRAISAL DATASET (UAD) DEFINITIONS ADDENDUM",
                "UAD DEFINITIONS ADDENDUM",
                "UAD FIELD-SPECIFIC STANDARDIZATION",
                "CONDITION RATINGS AND DEFINITIONS",
                "FORM UADDEFINE"
            ])
            if is_uad:
                uad_pages.append(p_no)

            if "STATEMENT OF ASSUMPTIONS AND LIMITING CONDITIONS" in upper_txt:
                limiting_pages.append(p_no)
            is_cert_page = (
                "APPRAISER'S CERTIFICATION:" in upper_txt or
                "SUPERVISORY APPRAISER'S CERTIFICATION" in upper_txt or
                ("STATEMENT OF ASSUMPTIONS AND LIMITING CONDITIONS" in upper_txt and "APPRAISER'S CERTIFICATION" in upper_txt)
            )
            if is_cert_page:
                cert_pages.append(p_no)

    has_uad = len(uad_pages) > 0 or bool(uad_source)
    if uad_pages:
        pages_str = ", ".join(str(p) for p in uad_pages)
        desc = f"Present (Pages {pages_str})" if len(uad_pages) > 1 else f"Present (Page {uad_pages[0]})"
    elif has_uad:
        desc = "Present (UAD Form Detected)"
    else:
        desc = "Not Present"

    limiting_str = (
        f"Present (Pages {', '.join(str(p) for p in limiting_pages)})" if len(limiting_pages) > 1
        else (f"Present (Page {limiting_pages[0]})" if limiting_pages else "Not Present")
    )
    cert_str = (
        f"Present (Pages {', '.join(str(p) for p in cert_pages)})" if len(cert_pages) > 1
        else (f"Present (Page {cert_pages[0]})" if cert_pages else "Not Present")
    )

    details = {
        "has_uad_pages": has_uad,
        "uad_pages": uad_pages,
        "uad_pages_count": len(uad_pages),
        "uad_presence": desc,
        "limiting_conditions_pages": limiting_pages,
        "limiting_conditions_presence": limiting_str,
        "certification_pages": cert_pages,
        "certification_presence": cert_str,
        "description": desc,
        "source": uad_source or (f"Embedded PDF Pages {', '.join(str(p) for p in uad_pages)}" if uad_pages else "Not Found"),
        "details_summary": f"UAD Definitions: {desc} | Limiting Conditions: {limiting_str} | Appraiser Certification: {cert_str}"
    }
    return has_uad, desc, uad_pages, details


def _detect_eo_in_xml_tags(root: ET.Element, raw_xml_text: str = "") -> Dict[str, Any]:
    """
    Scans XML <FORM>, <ATTACHED_IMAGE>, <IMAGE>, <PHOTO>, <ATTACHMENT>, and <EMBEDDED_FILE>
    elements (handling all MISMO 2.6, 3.6, and UAD namespaces) for E&O (Errors & Omissions) indicators.
    """
    try:
        from api.eo_extractor import parse_eo_text
    except ImportError:
        try:
            from .eo_extractor import parse_eo_text  # type: ignore
        except Exception:
            parse_eo_text = lambda txt: {}

    result: Dict[str, Any] = {
        "is_present": False,
        "reason": "",
        "E&O": "Absent",
        "E&O Present": "Absent",
        "E&O Insurance": "",
        "Policy Period From": "",
        "Policy Period To": "",
        "E&O Insured": "",
        "E&O Carrier": "",
        "E&O Limit": "",
        "E&O Deductible": ""
    }

    if root is None:
        return result

    eo_pattern = re.compile(
        r'\b(?:E\s*[\/&_\-]\s*O|E\s+and\s+O)(?:[\s_\-]*(?:Insurance|Coverage|Policy|Cert(?:ificate)?))?\b|'
        r'\bEO[\s_\-]*(?:Insurance|Coverage|Policy|Cert(?:ificate)?)\b|'
        r'\bEO_INSURANCE\b|'
        r'Errors\s*(?:and|&)\s*Omissions(?:\s*(?:Insurance|Coverage|Policy))?|'
        r'Certificate\s*of\s*(?:Liability\s*)?Insurance|'
        r'Professional\s*Liability(?:\s*Insurance)?|'
        r'Appraisers\s*Advantage|'
        r'\b(?:Appraiser(?:\'s)?\s+)?Insurance\s*(?:Policy|Cert(?:ificate)?|Coverage)?\b|'
        r'\b(?:E\s*[\/&_\-]\s*O|E\s+and\s+O|EO)\s*Policy\s*(?:#|Number|No\.?|:)?',
        re.I
    )

    # 1. Iterate over all XML elements regardless of namespaces
    for elem in root.iter():
        tag = elem.tag.split("}")[-1].upper()

        # A. <FORM> elements (standard in MISMO XML)
        if "FORM" in tag:
            attr_vals = [
                str(elem.attrib.get(k, ""))
                for k in [
                    "AppraisalReportContentName", "AppraisalReportContentIdentifier",
                    "AppraisalReportContentType", "Title", "Name", "FormName", "FormIdentifier"
                ]
                if elem.attrib.get(k)
            ]
            addendum_txt = elem.attrib.get("AppraisalAddendumText") or ""
            form_text = elem.text or ""
            combined = " ".join(attr_vals + [addendum_txt, form_text]).strip()

            if eo_pattern.search(combined):
                result["is_present"] = True
                result["E&O"] = "Present"
                result["E&O Present"] = "Present"
                result["reason"] = f"FORM tag: {' '.join(attr_vals) or 'E&O Form'}"
                parsed = parse_eo_text(combined)
                for k, v in parsed.items():
                    if v and not result.get(k):
                        result[k] = v
                return result

        # B. <ATTACHED_IMAGE>, <IMAGE>, <PHOTO>, <ATTACHMENT>, <EMBEDDED_IMAGE>
        elif any(t in tag for t in ["IMAGE", "PHOTO", "ATTACHMENT", "EMBEDDED_IMAGE"]):
            attr_vals = [
                str(elem.attrib.get(k, ""))
                for k in [
                    "ImageTitle", "ImageName", "ImageDescription", "Title", "Name",
                    "Description", "Type", "ImageFile", "AppraisalReportContentName"
                ]
                if elem.attrib.get(k)
            ]
            child_texts = [
                str(child.text or "")
                for child in elem
                if child.tag.split("}")[-1].upper() in ["TITLE", "NAME", "DESCRIPTION", "TYPE", "IMAGETITLE"]
                and child.text
            ]
            combined = " ".join(attr_vals + child_texts).strip()

            if eo_pattern.search(combined):
                result["is_present"] = True
                result["E&O"] = "Present"
                result["E&O Present"] = "Present"
                result["reason"] = f"Image tag: {combined[:60]}"
                parsed = parse_eo_text(combined)
                for k, v in parsed.items():
                    if v and not result.get(k):
                        result[k] = v
                return result

        # C. <EMBEDDED_FILE> attributes or child tags
        elif "EMBEDDED_FILE" in tag:
            attr_vals = [
                str(elem.attrib.get(k, ""))
                for k in ["Name", "Description", "DocumentType", "MIMEType", "Title", "Type"]
                if elem.attrib.get(k)
            ]
            child_texts = [
                str(child.text or "")
                for child in elem
                if child.tag.split("}")[-1].upper() in ["NAME", "DESCRIPTION", "DOCUMENTTYPE", "TITLE", "TYPE"]
                and child.text
            ]
            combined = " ".join(attr_vals + child_texts).strip()

            if eo_pattern.search(combined):
                result["is_present"] = True
                result["E&O"] = "Present"
                result["E&O Present"] = "Present"
                result["reason"] = f"Embedded file: {combined[:60]}"
                parsed = parse_eo_text(combined)
                for k, v in parsed.items():
                    if v and not result.get(k):
                        result[k] = v
                return result

    # 2. Check raw XML text regex if elements loop did not hit
    if raw_xml_text and eo_pattern.search(raw_xml_text):
        m_tag = re.search(
            r'<(?:[A-Za-z0-9_]+:)?(?:FORM|ATTACHED_IMAGE|IMAGE|PHOTO|ATTACHMENT|EMBEDDED_FILE)[^>]*\b(?:Errors\s*(?:and|&)\s*Omissions|E\s*[\/&]\s*O(?:\s*Insurance)?|Certificate\s*of\s*(?:Liability\s*)?Insurance|Professional\s*Liability)[^>]*>',
            raw_xml_text,
            re.I
        )
        if m_tag:
            result["is_present"] = True
            result["E&O"] = "Present"
            result["E&O Present"] = "Present"
            result["reason"] = "Raw XML tag match"
            parsed = parse_eo_text(m_tag.group(0))
            for k, v in parsed.items():
                if v and not result.get(k):
                    result[k] = v

    return result


def find_comparable_rent_schedule_pages(doc) -> List[int]:
    """
    Finds page index(es) containing the Form 1007 Comparable Rent Schedule table.
    A page is identified IF AND ONLY IF:
    1. Header/title contains 'COMPARABLE RENT SCHEDULE' or ('RENT SCHEDULE' and ('SINGLE FAMILY' or 'FORM 1007' or 'FORM 1000' or 'FNM 1007' or 'FRE 1000'))
    2. AND contains signature table markers:
       - 'ITEM' and ('SUBJECT' or 'COMPARABLE NO' or 'COMPARABLE')
       - AND at least 3 of: 'MONTHLY RENTAL', 'IF CURRENTLY RENTED', 'DATE LEASE', 'LEASE BEGINS', 'LEASE EXPIRES',
         'ADJUSTED MONTHLY RENT', 'DATA SOURCE', 'RENT ADJUSTMENTS', 'ABOVE GRADE', 'ROOM COUNT',
         'GROSS LIVING AREA', 'NET ADJ', 'INDICATED MONTHLY', 'MARKET RENT', 'LESS: UTILITIES'
    """
    pages = []
    if not doc:
        return pages
    for idx, page in enumerate(doc):
        txt = (page.get_text("text") or "").upper()
        is_rent_title = (
            "COMPARABLE RENT SCHEDULE" in txt
            or ("SINGLE FAMILY" in txt and "RENT SCHEDULE" in txt)
            or "FORM 1007" in txt
            or "FRE 1000" in txt
            or "FREDDIE MAC FORM 1000" in txt
            or "FANNIE MAE FORM 1007" in txt
            or "FANNIE MAE  FORM 1007" in txt
        )
        if not is_rent_title:
            continue
            
        has_table_header = "ITEM" in txt and ("SUBJECT" in txt or "COMPARABLE" in txt)
        markers = [
            "MONTHLY RENTAL", "IF CURRENTLY RENTED", "DATE LEASE", "LEASE BEGINS", "LEASE EXPIRES",
            "ADJUSTED MONTHLY RENT", "DATA SOURCE", "RENT ADJUSTMENTS", "ABOVE GRADE", "ROOM COUNT",
            "GROSS LIVING AREA", "NET ADJ", "INDICATED MONTHLY", "MARKET RENT", "LESS: UTILITIES"
        ]
        matched_markers = sum(1 for m in markers if m in txt)
        if has_table_header or matched_markers >= 3:
            pages.append(idx)
    return pages


def extract_rent_schedule_from_pdf_page(page, start_comp_num: int = 1) -> Dict[str, Any]:
    """
    Extracts all fields for Subject and Comparable No. X..Y from a Form 1007 PDF page.
    Dynamically identifies row anchors and column boundaries across diverse appraisal software
    (ACI, TOTAL / a la mode, ClickFORMS, SFREP, Bradford).
    """
    words = page.get_text("words")
    if not words:
        return {"Subject": {}, "comparables": {}, "reconciliation": {}}

    # 1. Determine layout variant: shifted-margin (e.g. 0000996) vs standard
    item_w = next((w for w in words if w[4] == "ITEM"), None)
    is_shifted = (item_w is not None and item_w[0] > 90)

    if is_shifted:
        c0_x0, c0_x1 = 50.0, 205.0
        subj_data_x0 = 135.0
        c1_x0, c1_adj, c1_x1 = 205.0, 275.0, 315.0
        c2_x0, c2_adj, c2_x1 = 315.0, 382.0, 422.0
        c3_x0, c3_adj, c3_x1 = 422.0, 490.0, 560.0
    else:
        c0_x0, c0_x1 = 35.0, 186.0
        subj_data_x0 = 105.0
        c1_x0, c1_adj, c1_x1 = 186.0, 268.0, 318.0
        c2_x0, c2_adj, c2_x1 = 318.0, 400.0, 450.0
        c3_x0, c3_adj, c3_x1 = 450.0, 532.0, 600.0

    cols_full = {
        "Subject": (c0_x0, c0_x1),
        f"COMPARABLE NO. {start_comp_num}": (c1_x0, c1_x1),
        f"COMPARABLE NO. {start_comp_num + 1}": (c2_x0, c2_x1),
        f"COMPARABLE NO. {start_comp_num + 2}": (c3_x0, c3_x1),
    }

    cols_adj = {
        "Subject": {"desc": (c0_x0, c0_x1), "adj": None},
        f"COMPARABLE NO. {start_comp_num}": {"desc": (c1_x0, c1_adj), "adj": (c1_adj, c1_x1)},
        f"COMPARABLE NO. {start_comp_num + 1}": {"desc": (c2_x0, c2_adj), "adj": (c2_adj, c2_x1)},
        f"COMPARABLE NO. {start_comp_num + 2}": {"desc": (c3_x0, c3_adj), "adj": (c3_adj, c3_x1)},
    }

    # 2. Row anchor detection
    row_specs = [
        ("header", [r"\bITEM\b"]),
        ("address", [r"\bAddress\b"]),
        ("proximity", [r"\bProximity\b"]),
        ("lease_begins", [r"\bLease\s+Begins\b", r"\bDate\s+Lease\s+Begins\b"]),
        ("lease_expires", [r"\bLease\s+Expires\b", r"\bDate\s+Lease\s+Expires\b"]),
        ("monthly_rental", [r"\bMonth[a-z]*\s+Rental\b", r"\bIf\s+Currently\s+Rented\b"]),
        ("utilities", [r"\bLess:\s*Utilities\b", r"\bUtilities\b"]),
        ("furniture", [r"\bFurniture\b"]),
        ("adjusted_monthly_rent", [r"\bAdjusted\s+Monthly\s+Rent\b", r"\bAdjusted\b"]),
        ("data_source", [r"\bData\s+Source\b"]),
        ("rent_adj_header", [r"\bRENT\s+ADJUSTMENTS\b"]),
        ("rent", [r"\bRent\b"]),
        ("concessions", [r"\bConcessions\b"]),
        ("location", [r"\bLocation(?:/View)?\b"]),
        ("design", [r"\bDesign\s+and\s+Appeal\b", r"\bDesign\b"]),
        ("age_condition", [r"\bAge(?:/Condition)?\b"]),
        ("rooms", [r"\bAbove\s+Grade\b", r"\bRoom\s+Count\b"]),
        ("gla", [r"\bGross\s+Living\s+Area\b"]),
        ("other_bsmt", [r"\bOther\s*\([^)]*base", r"\bOther\s*\(e\.g\."]),
        ("other_2", [r"\bOther\s*:"]),
        ("net_adj", [r"\bNet\s+Adj\b"]),
        ("indicated_rent", [r"\bIndicated\s+Monthly\b", r"\bMarket\s+Rent\b"]),
        ("comments", [r"\bComments\s+on\s+market\s+data\b"]),
        ("reconciliation", [r"\bFinal\s+Reconciliation\b"]),
    ]

    anchors = {}
    last_y = 0.0
    label_max_x = 160.0 if is_shifted else 120.0
    for key, patterns in row_specs:
        found_y = None
        for w in sorted(words, key=lambda x: (x[1], x[0])):
            if w[0] > label_max_x and key not in ["comments", "reconciliation"]:
                continue
            if w[1] > last_y - 2:
                line_words = [x for x in words if abs(x[1] - w[1]) < 6 and (x[0] < label_max_x or key in ["comments", "reconciliation"])]
                line_str = " ".join(x[4] for x in sorted(line_words, key=lambda x: x[0]))
                if any(re.search(p, line_str, re.I) for p in patterns):
                    found_y = w[1]
                    last_y = found_y
                    break
        if found_y is not None:
            anchors[key] = found_y

    ordered_keys = [k for k, _ in row_specs if k in anchors]
    row_intervals = {}
    y0_hdr = item_w[1] + 4 if item_w else 50
    for i, k in enumerate(ordered_keys):
        if k == "address":
            y0 = y0_hdr
        else:
            y0 = anchors[k] - 4.0
        y1 = anchors[ordered_keys[i + 1]] - 4.0 if i + 1 < len(ordered_keys) else anchors[k] + 35.0
        row_intervals[k] = (y0, y1)

    if "other_bsmt" in row_intervals and "other_2" in row_intervals:
        split_y = anchors["other_2"] - 1.0 if is_shifted else anchors["other_2"] - 6.0
        row_intervals["other_bsmt"] = (row_intervals["other_bsmt"][0], split_y)
        row_intervals["other_2"] = (split_y, row_intervals["other_2"][1])

    hdr_y_cutoff = (item_w[1] + 30) if item_w else 150
    header_nums = {'1', '2', '3', '4', '5', '6', '7', '8', '9'}

    def get_text_box(x0, x1, y0, y1):
        ex = {'ITEM', 'SUBJECT', 'COMPARABLE', 'NO.', 'NO',
              'DESCRIPTION', 'Sq.', 'Ft.', 'Sq. Ft.', ':', 'Total', 'Bdrms', 'Baths', 'RENT', 'ADJUSTMENTS',
              '+(-)$', '+(-)', '$', 'Adjustment', '+', '-', 'Address', 'Proximity', 'to', 'Subject',
              'Date', 'Lease', 'Begins', 'Expires', 'Monthly', 'Rental', 'Monthy', 'If', 'Currently', 'Rented:',
              'Rented', 'Less:', 'Utilities', 'Furniture', 'Adjusted', 'Rent', 'Data', 'Source',
              'Concessions', 'Location/View', 'Design', 'and', 'Appeal', 'Age/Condition', 'Age', 'Condition',
              'Above', 'Grade', 'Room', 'Count', 'Gross', 'Living', 'Area', 'Other', 'Other:', 'Net', 'Adj.',
              'Adj', '(total)', 'Indicated', 'Market', 'etc.)', '(e.g.,', 'basement,'}
        matched = [
            w for w in words
            if x0 <= ((w[0] + w[2]) / 2.0) <= x1 and y0 <= ((w[1] + w[3]) / 2.0) <= y1
            and (w[4] not in header_nums or w[1] > hdr_y_cutoff)
            and w[4] not in ex
        ]
        matched.sort(key=lambda w: (round(w[1] / 3.0) * 3.0, w[0]))
        return ' '.join(w[4] for w in matched).strip()

    subject_data: Dict[str, str] = {}
    comps_data: Dict[str, Dict[str, str]] = {c: {} for c in cols_full.keys() if c != "Subject"}

    top_rows = [
        ("address", "Address"),
        ("proximity", "Proximity to Subject"),
        ("lease_begins", "Date Lease Begins"),
        ("lease_expires", "Date Lease Expires"),
        ("monthly_rental", "Monthly Rental"),
        ("utilities", "Less: Utilities"),
        ("furniture", "Furniture"),
        ("adjusted_monthly_rent", "Adjusted Monthly Rent"),
        ("data_source", "Data Source"),
    ]

    for anchor_k, field_name in top_rows:
        if anchor_k not in row_intervals:
            continue
        y0, y1 = row_intervals[anchor_k]
        for cname, (x0, x1) in cols_full.items():
            eff_x0 = subj_data_x0 if (cname == "Subject" and field_name != "Address") else x0
            target = subject_data if cname == "Subject" else comps_data[cname]
            val = get_text_box(eff_x0, x1, y0, y1)
            if not val:
                continue
            if field_name == "Address":
                target["Address"] = val
            elif field_name == "Proximity to Subject":
                target["Proximity to Subject"] = val
            elif field_name == "Date Lease Begins":
                target["Date Lease Begins"] = val
            elif field_name == "Date Lease Expires":
                target["Date Lease Expires"] = val
            elif field_name == "Monthly Rental":
                clean_r = val.replace("If Currently Rented:", "").replace("If Currently Rented", "").replace("$", "").strip()
                m = re.search(r'([\d,]+(?:\.\d+)?)', clean_r)
                if m: target["Monthly Rental"] = _clean_currency(m.group(1))
                elif clean_r: target["Monthly Rental"] = clean_r
            elif field_name in ["Less: Utilities", "Furniture"]:
                target[field_name] = _clean_currency(val)
            elif field_name == "Adjusted Monthly Rent":
                m = re.search(r'([\d,]+(?:\.\d+)?)', val)
                if m: target["Adjusted Monthly Rent"] = _clean_currency(m.group(1))
                elif val: target["Adjusted Monthly Rent"] = val
            elif field_name == "Data Source":
                target["Data Source"] = val

    adj_rows = [
        ("rent", "Rent"),
        ("concessions", "Concessions"),
        ("location", "Location/View"),
        ("design", "Design and Appeal"),
        ("age_condition", "Age/Condition"),
        ("rooms", "Above Grade Room Count"),
        ("gla", "Gross Living Area"),
        ("other_bsmt", "Other (e.g., basement, etc.)"),
        ("other_2", "Other:"),
        ("net_adj", "Net Adj. (total)"),
        ("indicated_rent", "Indicated Monthly Market Rent"),
    ]

    for anchor_k, field_name in adj_rows:
        if anchor_k not in row_intervals:
            continue
        y0, y1 = row_intervals[anchor_k]
        for cname, cboxes in cols_adj.items():
            target = subject_data if cname == "Subject" else comps_data[cname]
            desc_box = cboxes.get("desc")
            if not desc_box:
                continue
            dx0, dx1 = desc_box
            eff_dx0 = subj_data_x0 if cname == "Subject" else dx0
            desc_val = get_text_box(eff_dx0, dx1, y0, y1)
            adj_val = ""
            adj_box = cboxes.get("adj")
            if adj_box:
                ax0, ax1 = adj_box
                adj_val = get_text_box(ax0, ax1, y0, y1)

            if field_name == "Rent":
                if desc_val:
                    target["Rent"] = desc_val
                elif cname != "Subject":
                    target["Rent"] = "0"
                if cname != "Subject":
                    target["Rent Adjustment"] = _parse_and_sum_adjustments(adj_val) if adj_val else "0"

            elif field_name == "Concessions":
                if desc_val:
                    target["Concessions"] = desc_val
                elif cname != "Subject":
                    target["Concessions"] = "0"
                if cname != "Subject":
                    target["Concessions Adjustment"] = _parse_and_sum_adjustments(adj_val) if adj_val else "0"

            elif field_name == "Location/View":
                if desc_val:
                    target["Location/View"] = desc_val
                if cname != "Subject":
                    target["Location/View Adjustment"] = _parse_and_sum_adjustments(adj_val) if adj_val else "0"

            elif field_name == "Design and Appeal":
                if desc_val:
                    target["Design and Appeal"] = desc_val
                if cname != "Subject":
                    target["Design and Appeal Adjustment"] = _parse_and_sum_adjustments(adj_val) if adj_val else "0"

            elif field_name == "Age/Condition":
                # Strict separation between Age and Condition
                nums = re.findall(r'\b\d+\b', desc_val)
                words_list = re.findall(r'[A-Za-z0-9~]+', desc_val)
                if nums:
                    target["Age"] = nums[0]
                elif "new" in desc_val.lower():
                    target["Age"] = "0"
                else:
                    target["Age"] = ""

                # Condition MUST be a condition rating (C1-C6, Q1-Q6) or descriptor - NEVER numeric age!
                cond = [
                    w for w in words_list
                    if re.match(r'^[CQ][1-6]$', w, re.I) or w.lower() in [
                        'good', 'avg', 'average', 'fair', 'poor', 'remodeled', 'updated', 'superior', 'similar', 'inferior'
                    ]
                ]
                clean_stripped = re.sub(r'[\s,.~#\-_]+', '', desc_val)
                if cond:
                    target["Condition"] = " ".join(cond)
                elif desc_val and not clean_stripped.isdigit():
                    non_num_words = [w for w in words_list if not w.isdigit()]
                    target["Condition"] = " ".join(non_num_words) if non_num_words else ""
                else:
                    target["Condition"] = ""
                if cname != "Subject":
                    adj_parsed = _parse_and_sum_adjustments(adj_val) if adj_val else "0"
                    target["Age/Condition Adjustment"] = adj_parsed
                    target["Age Adjustment"] = adj_parsed
                    target["Condition Adjustment"] = "0"
            elif field_name == "Above Grade Room Count":
                matched_w = [w for w in words if dx0 <= ((w[0]+w[2])/2.0) <= dx1 and y0 <= ((w[1]+w[3])/2.0) <= y1 and re.match(r'^\d+(?:\.\d+)?$', w[4])]
                matched_w.sort(key=lambda w: w[0])
                nums = [w[4] for w in matched_w]
                if len(nums) >= 3:
                    target["Room Count Total"] = nums[0]
                    target["Room Count Bdrms"] = nums[1]
                    target["Room Count Baths"] = nums[2]
                elif len(nums) == 2:
                    target["Room Count Total"] = nums[0]
                    target["Room Count Bdrms"] = nums[1]
                elif len(nums) == 1:
                    target["Room Count Total"] = nums[0]
                if adj_val: target["Room Count Total Adjustment"] = _clean_currency(adj_val)
            elif field_name == "Gross Living Area":
                m = re.search(r'([\d,]+)', desc_val)
                if m: target["Gross Living Area"] = _clean_currency(m.group(1))
                elif desc_val: target["Gross Living Area"] = desc_val
                if adj_val: target["Gross Living Area Adjustment"] = _clean_currency(adj_val)
            elif field_name == "Other (e.g., basement, etc.)":
                if desc_val:
                    target["Other (e.g., basement, etc.)"] = desc_val
                    target["Other (e.g., basement)"] = desc_val
                    target["Other Basement"] = desc_val
                if adj_val:
                    c_adj = _clean_currency(adj_val)
                    target["Other (e.g., basement, etc.) Adjustment"] = c_adj
                    target["Other (e.g., basement) Adjustment"] = c_adj
                    target["Other Basement Adjustment"] = c_adj
            elif field_name == "Other:":
                if desc_val:
                    target["Other:"] = desc_val
                    target["Other"] = desc_val
                if adj_val:
                    c_adj = _clean_currency(adj_val)
                    target["Other: Adjustment"] = c_adj
                    target["Other Adjustment"] = c_adj
            elif field_name == "Net Adj. (total)":
                net = _clean_currency(adj_val or desc_val).lstrip("+-")
                if "-" in (adj_val + desc_val): target["Net Adj. (total)"] = f"- {net}" if net else "-"
                elif "+" in (adj_val + desc_val): target["Net Adj. (total)"] = f"+ {net}" if net else "+"
                else: target["Net Adj. (total)"] = net
            elif field_name == "Indicated Monthly Market Rent":
                m = re.search(r'([\d,]+(?:\.\d+)?)', adj_val or desc_val)
                if m: target["Indicated Monthly Market Rent"] = _clean_currency(m.group(1))
                elif desc_val: target["Indicated Monthly Market Rent"] = desc_val

    # Reconciliation
    rec_y0 = anchors.get("comments", 460)
    rec_y1 = anchors.get("reconciliation", 580)
    comments_txt = ' '.join(w[4] for w in sorted(
        [w for w in words if 25 <= ((w[0]+w[2])/2.0) <= 595 and rec_y0 <= ((w[1]+w[3])/2.0) <= rec_y1 and w[4] not in ['Comments', 'on', 'market', 'data,', 'including', 'the', 'range', 'of', 'rents', 'for', 'single', 'family', 'properties,', 'an', 'estimate', 'of', 'vacancy', 'for', 'single', 'family', 'rental', 'properties,', 'the', 'general', 'trend', 'of', 'rents', 'and', 'vacancy,', 'and', 'support', 'for', 'the', 'above', 'adjustments.', '(Rent', 'concessions', 'should', 'be', 'adjusted', 'to', 'the', 'market,', 'not', 'to', 'the', 'subject', 'property.)']],
        key=lambda w: (round(w[1] / 5.0) * 5.0, w[0])
    )).strip()

    final_rec_txt = ' '.join(w[4] for w in sorted(
        [w for w in words if 25 <= ((w[0]+w[2])/2.0) <= 595 and rec_y1 <= ((w[1]+w[3])/2.0) <= 800 and w[4] not in ['Final', 'Reconciliation', 'of', 'Market', 'Rent:', 'RECONCILIATION', 'I', '(WE)', 'ESTIMATE', 'THE', 'MONTHLY', 'MARKET', 'RENT', 'OF', 'THE', 'SUBJECT', 'AS', 'OF', 'TO', 'BE', '$']],
        key=lambda w: (round(w[1] / 5.0) * 5.0, w[0])
    )).strip()

    reconciliation: Dict[str, str] = {}
    if comments_txt:
        reconciliation["Comments on market data, including the range of rents for single family properties, an estimate of vacancy for single family rental properties, the general trend of rents and vacancy, and support for the above adjustments. (Rent concessions should be adjusted to the market, not to the subject property.)"] = comments_txt
    if final_rec_txt:
        reconciliation["Final Reconciliation of Market Rent:"] = final_rec_txt

    est_w = next((w for w in words if w[4] in ['ESTIMATE', 'MONTHLY'] and w[0] < 150 and w[1] > 400), None)
    if est_w:
        line_w = [w for w in words if abs(w[1] - est_w[1]) < 10]
        line_w.sort(key=lambda w: w[0])
        for w in line_w:
            if re.match(r'^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$', w[4]):
                reconciliation["I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF"] = w[4]
            elif re.match(r'^[\d,]+(?:\.\d+)?$', w[4]) and w[4] not in ['1007', '1000']:
                reconciliation["TO BE $"] = _clean_currency(w[4])

    return {
        "Subject": subject_data,
        "comparables": comps_data,
        "reconciliation": reconciliation
    }


def _detect_form_type_from_xml(root: ET.Element) -> str:
    """
    Dynamically identifies the exact appraisal form type from MISMO XML DOM elements.
    Checks REPORT attributes, primary FORM, attached addenda forms, and rental analyses.
    Maps to standard form types: '1004', '1004C', '1004D', '1025', '1073', '2055',
    '1075', '2090', '2095', '203k-FHA', '1007', '216', '1025 + 1007', '1073 + 1007',
    '1004 + 1007', '1004MC', 'Appraisal Version #1', 'ERC'.
    """
    # 0. Check UAD 3.6 / Appraisal Version #1
    mismo_model = root.attrib.get("MISMOReferenceModelIdentifier", "")
    if "3.6" in mismo_model or "3.6" in str(root.attrib):
        about_ver = root.find(".//{*}AboutVersionIdentifier")
        ver_num = about_ver.text.strip() if about_ver is not None and about_ver.text else "1"
        return f"Appraisal Version #{ver_num}"

    about_ver = root.find(".//{*}AboutVersionIdentifier")
    if about_ver is not None and about_ver.text:
        return f"Appraisal Version #{about_ver.text.strip()}"

    report = root.find(".//REPORT")
    rep_attrib = report.attrib if report is not None else {}
    mismo_form = rep_attrib.get("AppraisalFormType", "")
    mismo_other = rep_attrib.get("AppraisalFormTypeOtherDescription", "")
    
    primary_form_name = ""
    primary_form_id = ""
    all_form_names = []
    
    for f in root.findall(".//FORM"):
        name = f.attrib.get("AppraisalReportContentName", "")
        ident = f.attrib.get("AppraisalReportContentIdentifier", "")
        is_pri = f.attrib.get("AppraisalReportContentIsPrimaryFormIndicator", "N").upper() == "Y"
        if name:
            all_form_names.append(name)
        if ident:
            all_form_names.append(ident)
        if is_pri and not primary_form_name:
            primary_form_name = name
            primary_form_id = ident
            
    combined_text = f"{mismo_form} {mismo_other} {primary_form_name} {primary_form_id} " + " ".join(all_form_names)
    ct = combined_text.upper()
    
    # Strict 1007 check: only true Form 1007 addendum (not basic page 3 income approach)
    has_1007 = any(
        re.search(r"\b(?:1007|FNM\s*1007|FRE\s*1000|SRX)\b", f, re.IGNORECASE) or
        re.search(r"\b(?:single\s*family\s*(?:comparable\s*)?rent\s*schedule)\b", f, re.IGNORECASE)
        for f in all_form_names
    )
    if not has_1007 and re.search(r"\b(?:1007|FNM\s*1007|FRE\s*1000)\b", f"{mismo_form} {mismo_other}", re.IGNORECASE):
        has_1007 = True

    if not has_1007 and any(re.search(r"\brent\s*schedule\b", f, re.IGNORECASE) for f in all_form_names):
        if not ("1025" in ct or "SMALL RESIDENTIAL" in ct):
            has_1007 = True

    # Check MISMO 2.6 RESIDENTIAL_RENT_SCHEDULE
    if not has_1007:
        res_rent_sched = root.find(".//RESIDENTIAL_RENT_SCHEDULE")
        if res_rent_sched is not None:
            rentals = res_rent_sched.findall(".//RESIDENTIAL_RENTAL")
            if rentals:
                def _rental_has_real_data(r):
                    rent_amt = (r.attrib.get("MonthlyRentAmount") or r.attrib.get("GrossMonthlyRentAmount") or "").strip()
                    if rent_amt and re.search(r"\d", rent_amt) and rent_amt not in ["0", "0.0", "0.00"]:
                        return True
                    seq = str(r.attrib.get("PropertySequenceIdentifier", "")).strip()
                    loc = r.find("LOCATION")
                    loc_has_addr = bool(loc is not None and (loc.attrib or list(loc) or (loc.text and loc.text.strip())))
                    if seq in ["1", "2", "3", "4"] and loc_has_addr:
                        return True
                    adj = r.find("RENT_ADJUSTMENT")
                    if adj is not None and (adj.attrib or list(adj)):
                        return True
                    return False

                if any(_rental_has_real_data(r) for r in rentals):
                    has_1007 = True

    if not has_1007:
        sfrs = root.find(".//SINGLE_FAMILY_RENT_SCHEDULE")
        if sfrs is not None and (sfrs.attrib or list(sfrs) or (sfrs.text and sfrs.text.strip())):
            has_1007 = True

    # Check embedded PDF if present
    if not has_1007 and fitz is not None:
        embedded_doc = root.find(".//DOCUMENT")
        if embedded_doc is not None and embedded_doc.text:
            try:
                pdf_bytes = base64.b64decode(embedded_doc.text.strip())
                emb_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                if find_comparable_rent_schedule_pages(emb_doc):
                    has_1007 = True
            except Exception:
                pass

    # Check 1025 (Small Residential Income Property / 2-4 Unit)
    if "1025" in ct or "SMALL RESIDENTIAL" in ct or "2-4 UNIT" in ct or "FRE72" in ct:
        return "1025"
        
    # Check 1073 (Condominium)
    if "1073" in ct or "CONDOMINIUM" in ct or "FRE465" in ct:
        return "1073 + 1007" if has_1007 else "1073"
        
    # Check Manufactured Home 1004C
    if "1004C" in ct or "MANUFACTURED" in ct:
        return "1004C + 1007" if has_1007 else "1004C"
        
    # Check Update / Completion 1004D
    if "1004D" in ct:
        return "1004D"
        
    # Check Exterior Only 2055
    if "2055" in ct:
        return "2055"
        
    # Check Exterior Condo 1075
    if "1075" in ct:
        return "1075"
        
    # Check Cooperative 2090
    if "2090" in ct:
        return "2090"
        
    # Check Exterior Coop 2095
    if "2095" in ct:
        return "2095"
        
    # Check 203k
    if "203K" in ct:
        return "203k-FHA"
        
    # Check 1004 (URAR / FRE 70)
    if "1004" in ct or "URAR" in ct or "FRE70" in ct:
        is_subject_to = False
        for elem in root.iter():
            tag = elem.tag.split("}")[-1]
            if tag == "_CONDITION_OF_APPRAISAL":
                cond_t = elem.attrib.get("_Type", "")
                if cond_t in ["SubjectToCompletion", "SubjectToRepairs"]:
                    is_subject_to = True
                    break

        if is_subject_to:
            has_as_is = False
            for elem in root.iter():
                for k, v in elem.attrib.items():
                    if any(phrase in str(v).lower() for phrase in ["as is value", "as-is value", "as is market value", "as-is market value", "as-is addendum"]):
                        has_as_is = True
                        break
                if has_as_is:
                    break

            if not has_as_is and fitz is not None:
                embedded_doc = root.find(".//DOCUMENT")
                if embedded_doc is not None and embedded_doc.text:
                    try:
                        pdf_bytes = base64.b64decode(embedded_doc.text.strip())
                        emb_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                        for p in emb_doc:
                            if re.search(r"as[\s-]*is\s+value|as[\s-]*is\s+market\s+value|\"as-is\"\s+value|as-is\s+addendum", p.get_text(), re.I):
                                has_as_is = True
                                break
                    except Exception:
                        pass

            if has_as_is:
                return "1004 Subject-To ARV w/ As-Is"

        return "1004 + 1007" if has_1007 else "1004"
        
    # Check Worldwide ERC
    if "ERC" in ct or "ECR" in ct:
        return "ERC"
        
    # Check Standalone 1007
    if "1007" in ct or "RENT SCHEDULE" in ct:
        return "1007"
        
    # Check Operating Income Statement 216
    if "216" in ct or "OPERATING INCOME" in ct:
        return "216"
        
    # Check Market Conditions Addendum 1004MC
    if "1004MC" in ct or "MARKET CONDITIONS ADDENDUM" in ct:
        return "1004MC"
        
    return "1004 + 1007" if has_1007 else "1004"


def _map_form_type(mismo_form: str) -> str:
    mf = (mismo_form or "").upper()
    if "1025" in mf:
        return "1025"
    if "1004" in mf and "1007" in mf:
        return "1004 + 1007"
    if "1004" in mf:
        return "1004"
    if "1073" in mf:
        return "1073"
    if "1007" in mf:
        return "1007"
    if "2055" in mf:
        return "2055"
    if "ERC" in mf or "ECR" in mf:
        return "ERC"
    return mismo_form or "1004"

def _format_mat_cond(raw_val: Any, default_cond: str = "Average") -> str:
    val = str(raw_val or "").strip()
    if not val or val.lower() == "none":
        return "None"
    if "/" in val:
        parts = [p.strip() for p in val.split("/") if p.strip()]
        if len(parts) >= 2:
            cond = parts[-1]
            mat = "/".join(parts[:-1])
            cond_lower = cond.lower()
            if cond_lower in ["ave", "avg"]:
                cond = "Average"
            elif cond_lower in ["gd", "good"]:
                cond = "Good"
            elif cond_lower in ["excl", "exc", "excellent"]:
                cond = "Excellent"
            elif cond_lower in ["new"]:
                cond = "New"
            elif cond_lower in ["fair"]:
                cond = "Fair"
            elif cond_lower in ["poor"]:
                cond = "Poor"
            return f"{mat} / {cond}"
        elif len(parts) == 1:
            return f"{parts[0]} / {default_cond}"
    return f"{val} / {default_cond}"


def extract_comp_photo_metadata(
    page: Any,
    frame: Any,
    body_blocks: Optional[List[Any]] = None,
    reference_records: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Extracts structured metadata for a comparable, rental, or subject photograph from photo addendum pages.
    Handles TOTAL by a la mode, ACI, ClickFORMS, Bradford, SFREP, etc.
    Extracts: comp_num, street, address, proximity, sale_price, monthly_rent, gla,
             total_rooms, bedrooms, bathrooms, location, view, site, quality, age, and raw metadata dictionary.
    Cross-references with document reference records (Sales Grid, Rent Schedule, Subject) for 100% address accuracy.
    """
    if body_blocks is None:
        blocks = page.get_text("blocks")
        body_blocks = [b for b in blocks if b[1] >= 82 and b[3] <= page.rect.height - 35]

    # Find blocks to the right of the photo frame
    right_blocks = [
        b for b in body_blocks
        if b[0] >= frame.x1 - 35 and b[1] >= frame.y0 - 25 and b[3] <= frame.y1 + 45
    ]

    def is_street_address_line(text: str) -> bool:
        t = text.strip()
        if not t:
            return False
        if not re.match(r'^\d{1,6}\s+[A-Za-z0-9#\.\'\-]', t):
            return False
        if re.match(r'^\$?[\d,]+(?:\.\d+)?$', t):
            return False
        t_lower = t.lower()
        if any(w in t_lower for w in [
            "mile", "sq ft", "sq.ft", "sf", "gla", "room", "bed", "bath",
            "res;", "q1", "q2", "q3", "q4", "q5", "q6",
            "c1", "c2", "c3", "c4", "c5", "c6", "total", "form", "alamode", "page"
        ]):
            return False
        words = re.findall(r'[A-Za-z]{2,}', t)
        return len(words) >= 1

    def is_city_state_zip_line(text: str) -> bool:
        t = text.strip()
        return bool(re.search(r'^[A-Za-z\s\.\-]+,\s*[A-Z]{2}(?:\s*\d{5}(?:-\d{4})?)?$', t))

    title = ""
    comp_num = None
    category = "General"
    is_subject = False
    is_rental = False
    is_comp = False

    # Check title across all right blocks
    for b in right_blocks:
        txt = b[4].strip()
        for line in txt.split('\n'):
            line = line.strip()
            m_sub = re.search(r'^(Subject\s+(?:Front|Rear|Street|Side|Garage|Exterior|Entry|Property))\b', line, re.I)
            if m_sub:
                title = m_sub.group(1).title()
                category = "Subject"
                is_subject = True
                break
            m_rent = re.search(r'^(?:Rental|Comparable\s+Rental)\s*#?\s*(\d+)', line, re.I)
            if m_rent:
                comp_num = int(m_rent.group(1))
                title = f"Rental {comp_num}"
                category = "Rental"
                is_rental = True
                break
            m_comp = re.search(r'^(?:Comparable(?:\s*Sale)?|Comp)\s*#?\s*(\d+)', line, re.I)
            if m_comp:
                comp_num = int(m_comp.group(1))
                title = f"Comparable {comp_num}"
                category = "Comparable"
                is_comp = True
                break
        if title:
            break

    page_header_sample = ""
    try:
        page_header_sample = (page.get_text()[:400] or "").upper()
    except Exception:
        pass

    if not category or category == "General":
        if any(k in page_header_sample for k in ["SUBJECT PROPERTY PHOTO", "SUBJECT PHOTO"]):
            category = "Subject"
            is_subject = True
        elif any(k in page_header_sample for k in ["RENTAL PHOTO", "FORM DLSTRNT", "RENTALS PHOTO"]):
            category = "Rental"
            is_rental = True
        elif any(k in page_header_sample for k in ["COMPARABLE PHOTO", "COMPARABLE PROPERTY", "FORM PICPIX.CR"]):
            category = "Comparable"
            is_comp = True

    # Identify street address lines
    street = ""
    city_state_zip = ""
    all_lines = []
    for b in right_blocks:
        lines = [l.strip() for l in b[4].split('\n') if l.strip()]
        all_lines.extend(lines)
        for i, l in enumerate(lines):
            if not street and is_street_address_line(l):
                street = l
                if i + 1 < len(lines) and is_city_state_zip_line(lines[i+1]):
                    city_state_zip = lines[i+1]

    known_keys = [
        "prox. to subject", "proximity to subject", "proximity", "sale price", "sales price",
        "list price", "rental price", "adj. monthly rent", "monthly rent",
        "gross living area", "gla", "total rooms", "total bedrooms", "total bathrooms",
        "location", "view", "site", "quality", "age", "actual age", "condition", "age/year built"
    ]

    key_block = None
    val_block = None
    for b in right_blocks:
        b_lines = [l.strip() for l in b[4].split('\n') if l.strip()]
        matched_keys = sum(1 for l in b_lines if l.lower() in known_keys or any(k in l.lower() for k in ["prox", "sale price", "living area", "bathrooms", "monthly rent"]))
        if matched_keys >= 3:
            key_block = b_lines
        elif len(b_lines) >= 3 and not any(l.lower() in known_keys for l in b_lines[:3]):
            val_block = b_lines

    meta_dict = {}
    proximity = ""
    sale_price = ""
    gla = ""
    bedrooms = ""
    bathrooms = ""
    total_rooms = ""
    location = ""
    view = ""
    site = ""
    quality = ""
    age = ""

    if key_block and val_block:
        # Determine value offset
        offset = 0
        if is_subject and any("sale price" in k.lower() for k in key_block[:2]) and len(val_block) < len(key_block):
            # In Subject photo cards, Sales Price is blank; values align starting at GLA
            sp_idx = next(i for i, k in enumerate(key_block) if "sale price" in k.lower())
            key_block = key_block[sp_idx + 1:]
            offset = 0
        elif any(k.lower() in ["address", "property address"] for k in key_block[:2]):
            offset = 0
        else:
            if len(val_block) > 0 and is_street_address_line(val_block[0]):
                offset += 1
                if not street:
                    street = val_block[0]
            if len(val_block) > 1 and is_city_state_zip_line(val_block[1]):
                offset += 1
                if not city_state_zip:
                    city_state_zip = val_block[1]

        for idx, k in enumerate(key_block):
            val_idx = idx + offset
            if val_idx < len(val_block):
                v = val_block[val_idx].strip()
                k_clean = k.strip()
                meta_dict[k_clean] = v
                k_lower = k_clean.lower()
                if "prox" in k_lower: proximity = v
                elif "price" in k_lower or "rent" in k_lower: sale_price = v
                elif "living" in k_lower or "gla" in k_lower: gla = v
                elif "room" in k_lower and "bed" not in k_lower and "bath" not in k_lower: total_rooms = v
                elif "bed" in k_lower: bedrooms = v
                elif "bath" in k_lower: bathrooms = v
                elif "location" in k_lower: location = v
                elif "view" in k_lower: view = v
                elif "site" in k_lower: site = v
                elif "quality" in k_lower or "condition" in k_lower: quality = v
                elif "age" in k_lower: age = v

    # Fallback to key: value regex
    if not proximity and not sale_price:
        for line in all_lines:
            m_kv = re.match(r'^([^:\-]+)[:\-]\s*(.+)$', line)
            if m_kv:
                k, v = m_kv.group(1).strip(), m_kv.group(2).strip()
                meta_dict[k] = v
                k_lower = k.lower()
                if "prox" in k_lower and not proximity: proximity = v
                elif "price" in k_lower and not sale_price: sale_price = v
                elif "rent" in k_lower and not sale_price: sale_price = v
                elif ("living" in k_lower or "gla" in k_lower) and not gla: gla = v
                elif "bed" in k_lower and not bedrooms: bedrooms = v
                elif "bath" in k_lower and not bathrooms: bathrooms = v

    # Build full address
    full_address = f"{street}, {city_state_zip}".strip(", ") if (street and city_state_zip) else street

    # Cross-reference enrichment with Document Baseline Records
    if reference_records:
        if is_subject or category == "Subject":
            sub_ref = reference_records.get("subject") or {}
            if sub_ref:
                if not street:
                    street = sub_ref.get("street") or ""
                if not full_address or full_address == street:
                    full_address = sub_ref.get("address") or f"{street}, {sub_ref.get('city','')}, {sub_ref.get('state','')} {sub_ref.get('zipcode','')}".strip(", ")
        elif is_comp and comp_num:
            sc = next((c for c in reference_records.get("sales_comps", []) if c.get("comp_num") == comp_num), None)
            if sc:
                if not street:
                    street = sc.get("street") or ""
                if not full_address or full_address == street:
                    full_address = sc.get("address") or f"{street}, {sc.get('city','')}, {sc.get('state','')} {sc.get('zipcode','')}".strip(", ")
                if not proximity: proximity = sc.get("proximity") or ""
                if not sale_price: sale_price = sc.get("sale_price") or ""
        elif is_rental and comp_num:
            rc = next((r for r in reference_records.get("rental_comps", []) if r.get("comp_num") == comp_num), None)
            if rc:
                if not street:
                    street = rc.get("street") or ""
                if not full_address or full_address == street:
                    full_address = rc.get("address") or f"{street}, {rc.get('city','')}, {rc.get('state','')} {rc.get('zipcode','')}".strip(", ")
                if not proximity: proximity = rc.get("proximity") or ""
                if not sale_price: sale_price = rc.get("monthly_rent") or ""

    return {
        "title": title or (f"{category} {comp_num}" if comp_num else f"{category} Photo"),
        "comp_num": comp_num,
        "category": category,
        "is_rental": is_rental,
        "street": street,
        "address": full_address,
        "proximity": proximity,
        "sale_price": sale_price if not is_subject else "",
        "monthly_rent": sale_price if is_rental else "",
        "rent_amount": sale_price if is_rental else "",
        "gla": gla,
        "total_rooms": total_rooms,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "location": location,
        "view": view,
        "site": site,
        "quality": quality,
        "age": age,
        "metadata": meta_dict
    }



def _classify_photo_category(caption: str, page_header: str, default_cat: str = "Subject property") -> str:
    """
    Classifies a photo into one of the 4 primary categories:
    'Subject property' (Subject property exterior/site)
    'Subject interior' (Subject interior rooms)
    'Comparable property' (Comparable property)
    'Rental property' (Rental property)
    or 'Building Sketch' / 'Maps & Aerials' when applicable.
    """
    cap_upper = (caption or "").upper()
    hdr_upper = (page_header or "").upper()

    # 1. High-confidence keywords in caption
    if any(k in cap_upper for k in [
        "HUD PLATE", "HUD CERTIFICATION", "HUD CERTIFICATE", "DATA PLATE",
        "COMPLIANCE CERTIFICATE", "HUD LABEL", "DATA HUD ID", "DATA HUD", "HUD INFO"
    ]) or re.search(r'\b(?:HUD\s+PLATE|PLATE\s*[#\d]|HUD\s+CERT(?:IFICATE)?|DATA\s+PLATE|DATA\s+HUD|HUD\s+INFO|HUD\s+LABEL)\b', cap_upper) or (
        any(k in cap_upper for k in ["PLATE 1", "PLATE 2", "LABEL 1", "LABEL 2"])
        and any(k in hdr_upper for k in ["HUD", "CERTIFICATION", "PLATE", "MANUFACTUR"])
    ):
        return "Subject property"

    if any(k in cap_upper for k in [
        "LIVING", "KITCHEN", "BATH", "BED", "DINING", "FAMILY", "BASEMENT", "ROOM",
        "DEN", "OFFICE", "NOOK", "LAUNDRY", "ALARM", "FURNACE", "HEATER", "HVAC",
        "WATER TANK", "WATER HEATER", "HOT WATER", "CLOSET", "HALL", "STAIR", "CEILING", "FIREPLACE",
        "INTERIOR", "SMOKE DETECTOR", "CO DETECTOR", "PANTRY", "FOYER", "ATTIC", "UTILITY",
        "BREAKFAST", "MUD ROOM", "REC ROOM", "ELECTRICAL", "PANEL", "GAS METER"
    ]):
        return "Subject interior"

    if any(k in cap_upper for k in [
        "FRONT", "REAR", "STREET", "SIDE", "YARD", "EXTERIOR", "DRIVEWAY",
        "PATIO", "DECK", "PORCH", "GARAGE", "ROOF", "CURB", "HOUSE NUMBER",
        "ADDRESS", "SIDEWALK", "FENCE", "POOL", "BARN", "OUTBUILDING", "VIEW OF SUBJECT",
        "SHED", "ACROSS STREET", "BALCONY", "STREET SIGN"
    ]):
        return "Subject property"

    if any(k in cap_upper for k in ["COMPARABLE", "COMP #", "COMP ", "COMP_"]):
        return "Comparable property"

    if any(k in cap_upper for k in ["RENTAL", "LEASE", "RENT #", "RENT "]):
        return "Rental property"

    if any(k in cap_upper for k in ["SKETCH", "FLOOR PLAN", "FLOORPLAN"]):
        return "Building Sketch"

    if any(k in cap_upper for k in ["PLAT MAP", "AERIAL MAP", "LOCATION MAP", "FLOOD MAP"]):
        return "Maps & Aerials"

    # 2. Context from Page Header
    if any(k in hdr_upper for k in ["SUBJECT INTERIOR", "INTERIOR PHOTO", "INTERIOR PHOTOS", "INTERIOR"]):
        return "Subject interior"
    if any(k in hdr_upper for k in ["COMPARABLE PROPERTY", "COMPARABLE PHOTO", "COMPARABLE SALES", "PICPIX.CR"]):
        return "Comparable property"
    if any(k in hdr_upper for k in ["RENTAL PHOTO", "COMPARABLE RENTALS", "RENTAL PROPERTY", "FORM DLSTRNT"]):
        return "Rental property"
    if any(k in hdr_upper for k in ["SUBJECT PROPERTY PHOTO", "SUBJECT PHOTO", "PHOTOGRAPH ADDENDUM"]):
        return "Subject property"
    if any(k in hdr_upper for k in ["SKETCH", "FLOOR PLAN", "FLOORPLAN"]):
        return "Building Sketch"
    if any(k in hdr_upper for k in ["LOCATION MAP", "AERIAL MAP", "PLAT MAP", "MAP ADDENDUM", "FLOOD MAP"]):
        return "Maps & Aerials"

    if default_cat in ["Subject interior", "Subject property", "Comparable property", "Rental property", "Building Sketch", "Maps & Aerials"]:
        return default_cat
    default_cat_lower = (default_cat or "").lower()
    if "interior" in default_cat_lower:
        return "Subject interior"
    if "comparable" in default_cat_lower:
        return "Comparable property"
    if "rental" in default_cat_lower:
        return "Rental property"
    return "Subject property"


def _merge_pdfplumber_image_slices(images: List[Dict[str, Any]], page_height: float) -> List[Dict[str, Any]]:
    """
    Merges vertically adjacent sliced image strips (common in ACI, TOTAL, and ClickFORMS PDFs)
    into unified photo frames.
    """
    if not images:
        return []

    sorted_imgs = sorted(images, key=lambda img: (round(img["x0"] / 15), img["top"]))
    clusters = []

    for img in sorted_imgs:
        w = img["width"]
        h = img["height"]
        if w < 40 or h < 5 or h > page_height * 0.90:
            continue

        merged = False
        for c in clusters:
            same_col = abs(c["x0"] - img["x0"]) <= 6 and abs(c["width"] - w) <= 6
            is_slice = (c["height"] <= 55 or h <= 45)
            vert_adj = (c["bottom"] - 3 <= img["top"] <= c["bottom"] + 12) or (img["top"] <= c["bottom"] and img["bottom"] >= c["top"])
            if same_col and vert_adj and is_slice:
                c["bottom"] = max(c["bottom"], img["top"] + h)
                c["height"] = c["bottom"] - c["top"]
                c["slices"] = c.get("slices", 1) + 1
                merged = True
                break
        if not merged:
            clusters.append({
                "x0": img["x0"],
                "top": img["top"],
                "x1": img["x0"] + w,
                "bottom": img["top"] + h,
                "width": w,
                "height": h,
                "slices": 1
            })

    valid_photos = [
        c for c in clusters
        if c["width"] >= 70 and c["height"] >= 55 and (c["width"] * c["height"]) >= 4500
        and c["height"] <= page_height * 0.88
    ]
    return valid_photos


def _extract_photos_with_pdfplumber(
    pdf_bytes: bytes,
    max_photos: int = 100,
    dpi: int = 72,
    include_images: bool = True,
    reference_records: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Extracts photos, labels, and categories from embedded PDF using pdfplumber.
    Handles horizontal image strip slicing (ACI/ClickFORMS), multi-column grids (2x2, 2x3, 3x3),
    single-column 3-photo addenda with right/above/below captions,
    and classifies into: Subject property, Subject interior, Comparable property, Rental property.
    """
    if pdfplumber is None or not pdf_bytes:
        return []

    photos = []
    photo_count = 0
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for pno, page in enumerate(pdf.pages):
                if photo_count >= max_photos:
                    break
                text = page.extract_text() or ""
                raw_upper = text.upper()

                # Merge image slices into complete photo frames
                photo_frames = _merge_pdfplumber_image_slices(page.images, page.height)
                if not photo_frames:
                    continue

                # Photo page classification keywords
                has_photo_kw = any(h in raw_upper for h in [
                    "PHOTO", "PHOTOGRAPH", "PIX", "PIC", "PHT", "SUBJECT PROPERTY", "COMPARABLE PROPERTY",
                    "COMPARABLE RENTALS", "INTERIOR", "EXTERIOR", "ADDITIONAL PHOTOS", "EXHIBIT", "ELEVATION"
                ])
                # Skip non-photo administrative forms
                is_admin_form = any(h in raw_upper for h in [
                    "INVOICE", "ENGAGEMENT LETTER", "SCOPE OF WORK", "PRIVACY NOTICE",
                    "APPRAISER'S CERTIFICATION", "SUPERVISORY APPRAISER'S CERTIFICATION",
                    "LIMITING CONDITIONS", "E&O COVERAGE", "POCKET CARD", "TABLE OF CONTENTS"
                ]) and not any(h in raw_upper for h in [
                    "PHOTO ADDENDUM", "SUBJECT PROPERTY PHOTO", "COMPARABLE PROPERTY PHOTO", "INTERIOR PHOTOS", "PHOTOGRAPH ADDENDUM"
                ])
                if len(photo_frames) == 1 and any(k in raw_upper for k in ["TABLE OF CONTENTS", "SIGNATURE", "CERTIFICATION"]):
                    continue

                is_photo_density = len(photo_frames) >= 2 or (len(photo_frames) == 1 and has_photo_kw)
                if is_admin_form or not (has_photo_kw or is_photo_density):
                    continue

                # Sort frames top-to-bottom, left-to-right (document reading order)
                photo_frames.sort(key=lambda f: (round(f["top"] / 40), f["x0"]))

                # Multi-column grid check: at least two photos share the same horizontal row band
                has_same_row_photos = False
                for i in range(len(photo_frames)):
                    for j in range(i + 1, len(photo_frames)):
                        if abs(photo_frames[i]["top"] - photo_frames[j]["top"]) < 35:
                            has_same_row_photos = True
                            break
                    if has_same_row_photos:
                        break

                page_cat = "Subject property"
                if any(k in raw_upper for k in ["SUBJECT INTERIOR", "INTERIOR PHOTO", "INTERIOR"]):
                    page_cat = "Subject interior"
                elif any(k in raw_upper for k in ["COMPARABLE PROPERTY", "COMPARABLE PHOTO", "PICPIX.CR"]):
                    page_cat = "Comparable property"
                elif any(k in raw_upper for k in ["RENTAL PHOTO", "COMPARABLE RENTALS", "DLSTRNT"]):
                    page_cat = "Rental property"

                words = page.extract_words()
                body_words = [w for w in words if w["top"] >= 90 and w["bottom"] <= page.height - 18]

                for idx, frame in enumerate(photo_frames):
                    if photo_count >= max_photos:
                        break

                    img_top = frame["top"]
                    img_bottom = frame["bottom"]
                    img_x0 = frame["x0"]
                    img_x1 = frame["x1"]
                    col_left = img_x0 - 25
                    col_right = img_x1 + 25

                    matched_caption = ""
                    match_status = "unmatched"
                    match_confidence = "low"
                    photo_addr = ""
                    photo_price = ""
                    photo_prox = ""

                    if has_same_row_photos:
                        # Multi-column grid: captions are strictly within the photo's horizontal column
                        below_words = [
                            w for w in body_words 
                            if (0 <= w["top"] - img_bottom <= 60) and (col_left <= (w["x0"] + w["x1"])/2 <= col_right)
                        ]
                        above_words = [
                            w for w in body_words 
                            if (0 <= img_top - w["bottom"] <= 40) and (col_left <= (w["x0"] + w["x1"])/2 <= col_right)
                        ]

                        if below_words:
                            lines_dict = {}
                            for w in below_words:
                                y_key = round(w["top"] / 8)
                                lines_dict.setdefault(y_key, []).append(w)
                            for y_key in sorted(lines_dict.keys()):
                                sorted_w = sorted(lines_dict[y_key], key=lambda x: x["x0"])
                                l = " ".join([w["text"] for w in sorted_w]).strip()
                                if l and not any(skip in l.lower() for skip in ["aciweb", "page", "total appraisal", "clickforms", "form "]):
                                    matched_caption = l
                                    match_status = "matched"
                                    match_confidence = "high"
                                    break

                        if not matched_caption and above_words:
                            lines_dict = {}
                            for w in above_words:
                                y_key = round(w["top"] / 8)
                                lines_dict.setdefault(y_key, []).append(w)
                            for y_key in sorted(lines_dict.keys()):
                                sorted_w = sorted(lines_dict[y_key], key=lambda x: x["x0"])
                                l = " ".join([w["text"] for w in sorted_w]).strip()
                                if l and not any(skip in l.lower() for skip in ["aciweb", "page", "total appraisal", "borrower", "clickforms"]):
                                    matched_caption = l
                                    match_status = "matched"
                                    match_confidence = "high"
                                    break
                    else:
                        # Single-column vertical stack: text can be to the right, above, or below
                        right_words = [
                            w for w in body_words 
                            if (w["x0"] >= img_x1 - 30) and (img_top - 20 <= w["top"] <= img_bottom + 30)
                        ]
                        above_words = [
                            w for w in body_words 
                            if (0 <= img_top - w["bottom"] <= 40) and (col_left <= (w["x0"] + w["x1"])/2 <= col_right)
                        ]
                        below_words = [
                            w for w in body_words 
                            if (0 <= w["top"] - img_bottom <= 60) and (col_left <= (w["x0"] + w["x1"])/2 <= col_right)
                        ]

                        if right_words:
                            lines_dict = {}
                            for w in right_words:
                                y_key = round(w["top"] / 8)
                                lines_dict.setdefault(y_key, []).append(w)
                            for y_key in sorted(lines_dict.keys()):
                                sorted_w = sorted(lines_dict[y_key], key=lambda x: x["x0"])
                                l = " ".join([w["text"] for w in sorted_w]).strip()
                                if l and not any(skip in l.lower() for skip in [
                                    "sales price", "gross living", "total rooms", "form picpix", "alamode", "total appraisal",
                                    "borrower", "property address", "lender", "file no", "city", "county", "state", "zip code"
                                ]):
                                    if page_cat in ["Subject interior", "Subject property"] and re.match(r"^\d+\s+[a-z]+", l.lower()):
                                        continue
                                    matched_caption = l
                                    match_status = "matched"
                                    match_confidence = "high"
                                    break

                            # For comp/rental pages, also extract address, price, proximity
                            if page_cat in ["Comparable property", "Rental property", "Comparable", "Rental"]:
                                for y_key in sorted(lines_dict.keys()):
                                    sorted_w = sorted(lines_dict[y_key], key=lambda x: x["x0"])
                                    l = " ".join([w["text"] for w in sorted_w]).strip()
                                    if not photo_addr and re.match(r"^\d+\s+[A-Za-z0-9#\.\'\-]", l) and not re.match(r"^\$?[\d,]+", l):
                                        photo_addr = l
                                    m_pr = re.search(r'([\d\.]+\s*miles?\s*[NESWnesw]*)', l, re.I)
                                    if m_pr and not photo_prox:
                                        photo_prox = m_pr.group(1).strip()
                                    m_prc = re.search(r'(?:Sale Price|Adj\. Monthly Rent|Rent)\s*[:$]?\s*([\d,]+)', l, re.I)
                                    if m_prc and not photo_price:
                                        photo_price = m_prc.group(1).replace(",", "")

                        if not matched_caption and above_words:
                            line_txt = " ".join([w["text"] for w in sorted(above_words, key=lambda x: x["x0"])])
                            if line_txt and not any(skip in line_txt.lower() for skip in ["aciweb", "page", "total appraisal", "borrower"]):
                                matched_caption = line_txt
                                match_status = "matched"
                                match_confidence = "high"

                        if not matched_caption and below_words:
                            line_txt = " ".join([w["text"] for w in sorted(below_words, key=lambda x: x["x0"])])
                            if line_txt and not any(skip in line_txt.lower() for skip in ["aciweb", "page", "total appraisal"]):
                                matched_caption = line_txt
                                match_status = "matched"
                                match_confidence = "high"

                    if not matched_caption:
                        for exhibit_kw in ["FLOORPLAN SKETCH", "FLOOR PLAN", "LOCATION MAP", "AERIAL MAP", "FLOOD MAP", "PLAT MAP"]:
                            if exhibit_kw in raw_upper:
                                matched_caption = exhibit_kw.title()
                                match_status = "matched"
                                match_confidence = "medium"
                                break

                    # Classify category using caption and page context
                    category = _classify_photo_category(matched_caption, page_header=text[:400], default_cat=page_cat)

                    # Check mandatory subject views
                    mand_res = classify_subject_view_label(matched_caption, page_context=text[:300])
                    view_type = None
                    is_mand = False
                    if mand_res:
                        view_type = mand_res[0]
                        is_mand = True
                        category = "Subject property"

                    final_caption = matched_caption if matched_caption else "Caption not found"
                    if not matched_caption:
                        match_status = "unmatched"
                        match_confidence = "low"

                    photo_count += 1
                    photo_item = {
                        "id": f"photo_{photo_count}",
                        "caption": view_type or final_caption,
                        "title": view_type or final_caption,
                        "original_caption": matched_caption,
                        "original_label": matched_caption,
                        "category": category,
                        "page": pno + 1,
                        "index": idx,
                        "match_status": match_status,
                        "match_confidence": match_confidence,
                        "is_mandatory": is_mand,
                        "view_type": view_type,
                        "filename": f"page_{pno + 1}_photo_{idx}.jpg",
                        "width": round(frame["width"]),
                        "height": round(frame["height"]),
                        "dpi": dpi
                    }
                    if photo_addr:
                        photo_item["address"] = photo_addr
                    if photo_price:
                        if category == "Rental property":
                            photo_item["monthly_rent"] = photo_price
                            photo_item["rent_amount"] = photo_price
                        else:
                            photo_item["sale_price"] = photo_price
                    if photo_prox:
                        photo_item["proximity"] = photo_prox

                    # Extract base64 image preview
                    if include_images:
                        try:
                            cropped = page.crop((frame["x0"], frame["top"], frame["x1"], frame["bottom"]))
                            im = cropped.to_image(resolution=dpi)
                            pil_img = im.original.convert("RGB")
                            buf = io.BytesIO()
                            pil_img.save(buf, format="JPEG")
                            img_b64 = base64.b64encode(buf.getvalue()).decode("ascii")
                            preview_url = f"data:image/jpeg;base64,{img_b64}"
                            photo_item["image"] = preview_url
                            photo_item["image_data"] = preview_url
                            photo_item["base64_preview"] = preview_url
                        except Exception:
                            pass

                    photos.append(photo_item)
    except Exception as e:
        print("pdfplumber photo extraction warning:", e)
    if plumber_doc is not None:
        try:
            plumber_doc.close()
        except Exception:
            pass

    return photos

def classify_subject_view_label(raw_label: str, page_context: str = "") -> Optional[Tuple[str, str]]:
    """
    Classifies a candidate text label into one of the four mandatory Subject views:
    'Subject Front View', 'Subject Rear View', 'Subject Side View', 'Subject Street Scene'.
    Returns (standardized_view_name, original_matched_label) or None.
    """
    if not raw_label:
        return None
    lbl = raw_label.strip()
    lbl_upper = lbl.upper()
    ctx_upper = (page_context or "").upper()

    if any(k in lbl_upper for k in [
        "FORM PIC", "TOTAL APPRAISAL", "1-800-ALAMODE", "BORROWER", "LENDER", "CLIENT",
        "FILE NO", "APPRAISED VALUE", "APPRAISED DATE", "PRODUCED USING ACI", "WWW.ACIWEB",
        "CASE NO", "PROPERTY ADDRESS", "COUNTY", "ZIP CODE", "INSPECTION DATE",
        "DID INSPECT", "DID NOT INSPECT", "FROM STREET", "COMPARABLE SALE", "RENTAL #"
    ]):
        return None

    if "CITY STREET VIEW" in lbl_upper and any(k in ctx_upper for k in ["MAP", "LOCATION", "AERIAL", "FLOOD", "TAX"]):
        return None

    if re.search(r'\b(?:COMPARABLE|COMP\s*#?\s*\d+|RENTAL\s*#?\s*\d+|LISTING\s*#?\s*\d+)\b', lbl_upper):
        return None

    # Front View
    if re.search(r'\b(?:SUBJECT\s+FRONT(?:\s+VIEW)?|FRONT\s+VIEW(?:\s+OF\s+SUBJECT(?:\s+PROPERTY)?)?|DWELLING\s+FRONT|FRONT\s+OF\s+SUBJECT|FRONT\s+ELEVATION)\b', lbl_upper):
        return ("Subject Front View", lbl)
    if lbl_upper in ["FRONT", "FRONT VIEW", "SUBJECT FRONT", "SUBJECT FRONT ENTRANCE"]:
        return ("Subject Front View", lbl)

    # Rear View
    if re.search(r'\b(?:SUBJECT\s+REAR(?:\s+VIEW)?|REAR\s+VIEW(?:\s+OF\s+SUBJECT(?:\s+PROPERTY)?)?|DWELLING\s+REAR|REAR\s+OF\s+SUBJECT|REAR\s+ELEVATION)\b', lbl_upper):
        return ("Subject Rear View", lbl)
    if lbl_upper in ["REAR", "REAR VIEW", "SUBJECT REAR"]:
        return ("Subject Rear View", lbl)

    # Side View
    if re.search(r'\b(?:SUBJECT\s+SIDE(?:\s+VIEW)?|(?:LEFT|RIGHT)\s+SIDE\s+VIEW|SIDE\s+VIEW(?:\s+OF\s+SUBJECT(?:\s+PROPERTY)?)?|SUBJECT\s+(?:LEFT|RIGHT)\s+SIDE|(?:LEFT|RIGHT)\s+SIDE|SIDE\s+ELEVATION|FRONT/SIDE\s+VIEW|REAR/SIDE\s+VIEW|SIDE\s+&\s+FRONT\s+VIEW|SIDE\s+VIEW,\s*PANEL)\b', lbl_upper):
        return ("Subject Side View", lbl)
    if lbl_upper in ["SIDE", "SIDE VIEW", "SUBJECT SIDE", "RIGHT SIDE", "LEFT SIDE", "LEFT SIDE VIEW", "RIGHT SIDE VIEW"]:
        return ("Subject Side View", lbl)

    # Street Scene
    if re.search(r'\b(?:SUBJECT\s+STREET(?:\s+SCENE|\s+VIEW)?|STREET\s+SCENE(?:\s+OF\s+SUBJECT(?:\s+PROPERTY)?)?|SUBJECT\s+STREET|STREET\s+VIEW(?:\s+OF\s+SUBJECT(?:\s+PROPERTY)?)?|NEIGHBORHOOD\s+STREET\s+SCENE|ALTERNATE\s+STREET\s+SCENE|PROPERTY\s+ACCESS\s*\(STREET\s*SCENE\))\b', lbl_upper):
        return ("Subject Street Scene", lbl)
    if lbl_upper in ["STREET", "STREET SCENE", "STREET VIEW", "SUBJECT STREET"]:
        return ("Subject Street Scene", lbl)

    # 6. Form 1004C HUD Data Plate & Compliance Certificate
    if re.search(r'\b(?:HUD\s+DATA\s+PLATE|HUD\s+PLATE\s+DATA|DATA\s+PLATE|DATA\s+HUD(?:\s+ID)?|HUD\s+ID|HUD\s+INFO(?:RMATION)?|HUD\s+(?:COMPLIANCE\s+)?CERTIFICATE|COMPLIANCE\s+CERTIFICATE)\b', lbl_upper):
        return ("HUD Data Plate / Compliance Certificate", lbl)

    # 7. Form 1004C HUD Certification Label / HUD Plate
    if re.search(r'\b(?:HUD\s+CERTIFICATION(?:\s+LABEL)?|CERTIFICATION\s+LABEL)\b', lbl_upper):
        return ("HUD Certification Label", lbl)
    if re.search(r'\b(?:HUD\s+PLATE(?:\s*#?\s*\d+)?|PLATE\s*#?\s*[1-9]\d*)\b', lbl_upper):
        return ("HUD Certification Label", lbl)
    if re.search(r'\b(?:HUD\s+LABEL(?:\s*#?\s*\d+)?(?:\s+ILLEGIBLE)?)\b', lbl_upper):
        return ("HUD Certification Label", lbl)
    if re.search(r'\bLABEL\s*#?\s*[1-9]\d*(?:\s+ILLEGIBLE)?\b', lbl_upper) and any(k in ctx_upper for k in ["HUD", "PLATE", "CERTIF", "MANUFACTUR"]):
        return ("HUD Certification Label", lbl)

    return None


_PHOTO_LABEL_KEYWORD_MAP = [
    (re.compile(r'\b(?:mbr|master\s*bed(?:room)?|primary\s*bed(?:room)?|primary\s*suite|br\s*\d+|bdrm|bed\s*\d+|bedroom)\b', re.I), 'Bedroom'),
    (re.compile(r'\b(?:half\s*bath|powder\s*room|lavatory|full\s*bath|master\s*bath|primary\s*bath|bath(?:room)?)\b', re.I), 'Bathroom'),
    (re.compile(r'\b(?:kitchen|kitchenette|kitch)\b', re.I), 'Kitchen'),
    (re.compile(r'\b(?:living\s*room|family\s*room|great\s*room|sitting\s*room|den|rec\s*room)\b', re.I), 'Living Area'),
    (re.compile(r'\b(?:dining\s*room|dining\s*area|breakfast\s*nook|dinette)\b', re.I), 'Dining Area'),
    (re.compile(r'\b(?:basement|bsmt|below\s*grade|cellar)\b', re.I), 'Basement'),
    (re.compile(r'\b(?:rear\s*view|back\s*yard|rear\s*exterior|subject\s*rear)\b', re.I), 'Exterior Rear'),
    (re.compile(r'\b(?:front\s*view|front\s*exterior|subject\s*front)\b', re.I), 'Exterior Front'),
    (re.compile(r'\b(?:street\s*view|street\s*scene)\b', re.I), 'Street View'),
    (re.compile(r'\b(?:garage|carport|driveway)\b', re.I), 'Garage / Parking'),
    (re.compile(r'\b(?:laundry|utility\s*room|mud\s*room)\b', re.I), 'Utility / Laundry'),
]


def _normalize_photo_label(raw_label: str) -> str:
    """Map raw photo label variations to canonical category label via keyword map."""
    if not raw_label:
        return ""
    for pat, canonical in _PHOTO_LABEL_KEYWORD_MAP:
        if pat.search(raw_label):
            return canonical
    return raw_label.strip()


_PHOTO_SKIP_PHRASES = (
    "aciweb", "int6ar", "page ", "page#", "appraisal", "form 1004", "form pht", "form pic",
    "form dls", "total appraisal", "1-800-alamode", "appraised date", "appraised value",
    "sale date", "sale price", "file no", "file #", "case no", "case #", "borrower",
    "property address", "lender/client", "clickforms", "bradford", "sfrep", "alamode",
    "photo addendum", "subject photo addendum", "interior photo addendum"
)


def _clean_extracted_photo_label(raw_lbl: str) -> str:
    """Clean leading/trailing punctuation, slot prefixes, and extra whitespace from a photo label."""
    if not raw_lbl:
        return ""
    s = re.sub(r"\s+", " ", str(raw_lbl)).strip()
    s = re.sub(r"^(?:photo\s*#?\s*\d+\s*[:\-|.]*\s*|#\d+\s*[:\-|.]+\s*)", "", s, flags=re.I).strip()
    s = s.strip(":-|•·—– ")
    return s


def _is_boilerplate_photo_label(line: str) -> bool:
    """Return True if a candidate text line is form chrome, metadata, or a bare number."""
    if not line:
        return True
    ln = line.strip()
    if len(ln) < 2 or len(ln) >= 45:
        return True
    ln_low = ln.lower()
    if any(sk in ln_low for sk in _PHOTO_SKIP_PHRASES):
        return True
    if re.match(r"^(?:page\s*\d+(?:\s*of\s*\d+)?|photo\s*#?\s*\d+|#?\d+)$", ln_low):
        return True
    if re.match(r"^[\d,\.\$\s\/\-:]+$", ln) and len(ln) < 18:
        return True
    return False


def _extract_words_in_band(
    page_words: List[Tuple[Any, ...]],
    x0: float,
    y0: float,
    x1: float,
    y1: float,
) -> str:
    """Group PyMuPDF word-level bounding boxes inside a coordinate band into clean lines."""
    band_words = [
        w for w in page_words
        if w[0] >= x0 and w[2] <= x1 and w[1] >= y0 and w[3] <= y1
    ]
    if not band_words:
        return ""
    band_words.sort(key=lambda w: (round(w[1] / 4.0), w[0]))
    lines: List[str] = []
    cur_y = None
    cur_tokens: List[str] = []
    for w in band_words:
        wy = w[1]
        if cur_y is None or abs(wy - cur_y) <= 5.0:
            cur_tokens.append(str(w[4]))
            if cur_y is None:
                cur_y = wy
        else:
            line_txt = " ".join(cur_tokens).strip()
            if line_txt:
                lines.append(line_txt)
            cur_tokens = [str(w[4])]
            cur_y = wy
    if cur_tokens:
        line_txt = " ".join(cur_tokens).strip()
        if line_txt:
            lines.append(line_txt)

    clean_lines: List[str] = []
    for ln in lines:
        if _is_boilerplate_photo_label(ln):
            continue
        if ln not in clean_lines:
            clean_lines.append(ln)
    return " ".join(clean_lines[:2]).strip()


def _assess_photo_quality(pix: Any) -> Optional[Dict[str, Any]]:
    """Compute OpenCV Laplacian variance (blur), mean brightness, aspect ratio, and resolution."""
    if pix is None:
        return None
    w_px, h_px = pix.width, pix.height
    aspect = round(w_px / h_px, 2) if h_px > 0 else 0.0
    quality: Dict[str, Any] = {
        "resolution": f"{w_px}x{h_px}",
        "aspect_ratio": aspect
    }
    if cv2 is not None and np is not None and w_px > 0 and h_px > 0:
        try:
            arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(h_px, w_px, pix.n)
            if pix.n == 4:
                gray = cv2.cvtColor(arr, cv2.COLOR_RGBA2GRAY)
            elif pix.n == 3:
                gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
            else:
                gray = arr
            lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
            mean_bright = float(gray.mean())
            exposure = "underexposed" if mean_bright < 40.0 else ("overexposed" if mean_bright > 225.0 else "normal")
            quality.update({
                "laplacian_variance": round(lap_var, 2),
                "is_blurry": lap_var < 30.0,
                "mean_brightness": round(mean_bright, 1),
                "exposure": exposure
            })
        except Exception:
            pass
    return quality


def extract_photos_from_xml(
    xml_path_or_bytes: Any,
    max_photos: int = 100,
    dpi: int = 72,
    include_images: bool = True,
    reference_records: Optional[Dict[str, Any]] = None,
    companion_pdf_path: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Dynamically extracts all photos and their labels/captions from any MISMO 2.6 XML file.
    Supports all appraisal software platforms (ACI, TOTAL by a la mode, ClickFORMS, Bradford, etc.).
    Extracts high-resolution images, pairs them with intelligent spatial labels, and categorizes them:
    'Subject', 'Interior', 'Comparable', 'Rental', 'Sketch', 'Map', and 'General'.
    """
    if fitz is None and pdfplumber is None:
        return []

    # 1. Read XML string
    xml_text = ""
    try:
        if isinstance(xml_path_or_bytes, (str, os.PathLike)) and os.path.exists(str(xml_path_or_bytes)):
            with open(str(xml_path_or_bytes), "r", encoding="utf-8", errors="ignore") as f:
                xml_text = f.read()
        elif isinstance(xml_path_or_bytes, bytes):
            xml_text = xml_path_or_bytes.decode("utf-8", errors="ignore")
        elif isinstance(xml_path_or_bytes, str):
            xml_text = xml_path_or_bytes
    except Exception:
        return []

    if not xml_text:
        return []

    # UAD 3.6 / Appraisal Version #1 dispatch
    if 'MISMOReferenceModelIdentifier="3.6' in xml_text or "Appraisal Version" in xml_text or "<VALUATION_RESPONSE>" in xml_text or "<DEAL_SETS>" in xml_text:
        try:
            try:
                from .uad36_extractor import extract_photos_from_uad36_xml
            except (ImportError, ValueError):
                from uad36_extractor import extract_photos_from_uad36_xml
            return extract_photos_from_uad36_xml(
                xml_path_or_bytes,
                max_photos=max_photos,
                dpi=dpi,
                include_images=include_images,
                reference_records=reference_records,
                companion_pdf_path=companion_pdf_path
            )
        except Exception as e:
            print(f"[xml_extractor] UAD 3.6 photo extraction notice: {e}")

    # 2. Extract base64 encoded PDF from <DOCUMENT> or <EMBEDDED_FILE>
    pdf_bytes = None
    m_doc = re.search(r"<DOCUMENT[^>]*>([^<]{1000,})</DOCUMENT>", xml_text)
    if m_doc:
        try:
            pdf_bytes = base64.b64decode(m_doc.group(1).strip())
        except Exception:
            pass

    if not pdf_bytes:
        m_emb = re.search(r"<EMBEDDED_FILE[^>]*>([^<]{1000,})</EMBEDDED_FILE>", xml_text)
        if m_emb:
            try:
                pdf_bytes = base64.b64decode(m_emb.group(1).strip())
            except Exception:
                pass

    if not pdf_bytes:
        return []

    if fitz is None:
        if pdfplumber is not None:
            return _extract_photos_with_pdfplumber(pdf_bytes, max_photos=max_photos, dpi=dpi, include_images=include_images, reference_records=reference_records)
        return []

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception:
        if pdfplumber is not None:
            return _extract_photos_with_pdfplumber(pdf_bytes, max_photos=max_photos, dpi=dpi, include_images=include_images, reference_records=reference_records)
        return []

    appraiser_name = ""
    if reference_records and isinstance(reference_records, dict):
        appraiser_name = reference_records.get("appraiser_name") or reference_records.get("appraiser") or ""
    if not appraiser_name and xml_text:
        m_appr = re.search(r'<(?:_|APPRAISER_)?Name>([^<]+)', xml_text, re.I) or re.search(r'AppraiserName=["\']([^"\']+)["\']', xml_text, re.I)
        if m_appr:
            appraiser_name = m_appr.group(1).strip()

    if reference_records is None:
        reference_records = {"subject": None, "sales_comps": [], "rental_comps": []}
        try:
            # 1. Subject from XML tags
            m_prop = re.search(r'<(?:_|PROPERTY_)?StreetAddress>([^<]+)', xml_text, re.I)
            if not m_prop:
                m_prop = re.search(r'StreetAddress=["\']([^"\']+)["\']', xml_text, re.I)
            m_city = re.search(r'<(?:_|PROPERTY_)?City>([^<]+)', xml_text, re.I) or re.search(r'City=["\']([^"\']+)["\']', xml_text, re.I)
            m_state = re.search(r'<(?:_|PROPERTY_)?State>([^<]+)', xml_text, re.I) or re.search(r'State=["\']([^"\']+)["\']', xml_text, re.I)
            m_zip = re.search(r'<(?:_|PROPERTY_)?PostalCode>([^<]+)', xml_text, re.I) or re.search(r'PostalCode=["\']([^"\']+)["\']', xml_text, re.I)
            if m_prop:
                st = m_prop.group(1).strip()
                city = m_city.group(1).strip() if m_city else ""
                state = m_state.group(1).strip() if m_state else ""
                zipc = m_zip.group(1).strip() if m_zip else ""
                full = f"{st}, {city}, {state} {zipc}".strip(", ")
                reference_records["subject"] = {"street": st, "city": city, "state": state, "zipcode": zipc, "address": full}

            # 2. Extract from PDF text if doc is available
            if doc:
                for pno in range(len(doc)):
                    txt = doc[pno].get_text()
                    if not reference_records["subject"] and any(k in txt.upper() for k in ["SUBJECT PROPERTY", "UNIFORM RESIDENTIAL"]):
                        m_addr = re.search(r'Property\s+Address\s*[:\n]\s*([^\n]+)', txt, re.I)
                        if m_addr:
                            reference_records["subject"] = {"street": m_addr.group(1).strip(), "address": m_addr.group(1).strip()}
                    if ("RENTAL PHOTO PAGE" in txt.upper() or "DLSTRNT" in txt.upper()):
                        for m in re.finditer(r'Rental\s+(\d+)\s*\n(?:[^\n]*\n){1,15}?(\d+\s+[^\n]+)\s*\n([0-9.]+\s*miles?[^\n]*)', txt, re.I):
                            r_num = int(m.group(1))
                            r_addr = m.group(2).strip()
                            r_prox = m.group(3).strip()
                            if not any(r["comp_num"] == r_num for r in reference_records["rental_comps"]):
                                reference_records["rental_comps"].append({
                                    "comp_num": r_num, "street": r_addr, "address": r_addr, "proximity": r_prox, "monthly_rent": ""
                                })
        except Exception:
            pass

    photos = []
    photo_count = 0
    plumber_doc = None  # Lazy-opened only if PyMuPDF word/block matching misses a label
    ocr_extractor = None  # Lazy-loaded only if vector + pdfplumber matching misses a label

    # 3. Iterate through pages and extract photos using ultra-fast page.get_image_info
    skip_form_headers = [
        "UNIFORM RESIDENTIAL APPRAISAL REPORT",
        "SMALL RESIDENTIAL INCOME PROPERTY",
        "INDIVIDUAL CONDOMINIUM UNIT",
        "APPRAISER'S CERTIFICATION",
        "SUPERVISORY APPRAISER'S CERTIFICATION",
        "APPRAISER INDEPENDENCE CERTIFICATION",
        "INVOICE",
        "ENGAGEMENT LETTER",
        "SCOPE OF WORK",
        "PRIVACY NOTICE",
        "STATEMENTS OF FACT",
        "TAX RECORD",
        "TAX ASSESSMENT",
        "APPRAISER LICENSE",
        "STATE LICENSE",
        "CERTIFICATION LICENSE"
    ]
    photo_override_headers = [
        "PHOTO ADDENDUM", "SUBJECT PROPERTY PHOTO", "COMPARABLE PROPERTY PHOTO",
        "COMPARABLE RENTALS PHOTO", "ADDITIONAL PHOTOS", "BUILDING SKETCH", "LOCATION MAP", "FLOOR PLAN",
        "PHT6", "PHT3", "PHT12", "DLSTRNT", "PICPIX", "PICSIX", "PICINT"
    ]

    for p_idx in range(len(doc)):
        if photo_count >= max_photos:
            break
        page = doc[p_idx]
        p_no = p_idx + 1
        raw_text = page.get_text() or ""
        raw_upper = raw_text.upper()
        hdr_clip = page.get_text("text", clip=fitz.Rect(0, 0, page.rect.width, 100)).strip().upper()

        # Check if page is an Invoice Copy exhibit (Full Canvas Pixmap Render + Structured Data Extraction)
        is_invoice_page = (
            any(k in raw_upper[:300] for k in ["INVOICE", "APPRAISAL INVOICE", "FEE INVOICE", "SERVICES INVOICE"])
            or any(k in hdr_clip for k in ["INVOICE", "APPRAISAL INVOICE", "FEE INVOICE"])
        ) and any(ind in raw_upper for ind in [
            "TOTAL DUE", "AMOUNT DUE", "TOTAL FEE", "PLEASE REMIT", "BILLED TO", "BILL TO",
            "CLIENT FILE", "INVOICE NUMBER", "INVOICE #", "FEES AMOUNT", "BALANCE DUE"
        ]) and "USPAP" not in hdr_clip

        if is_invoice_page:
            inv_data = extract_invoice_copy_data(page, p_no)
            photos.append({
                "page": p_no,
                "category": "Invoice",
                "caption": f"Invoice Copy (Page {p_no})",
                "format": "jpeg",
                "width": round(page.rect.width, 1),
                "height": round(page.rect.height, 1),
                "rect": [0, 0, round(page.rect.width, 1), round(page.rect.height, 1)],
                "base64_preview": inv_data.get("base64_preview", ""),
                "invoice_data": inv_data,
                "raw_text": raw_text
            })
            photo_count += 1
            continue

        # Check if page is an E&O Insurance Certificate exhibit (Full Canvas Pixmap Render + Structured Data Extraction)
        is_eo_page = (
            any(k in raw_upper[:300] for k in ["E & O", "E&O", "ERRORS & OMISSIONS", "ERRORS AND OMISSIONS", "APPRAISER E&O", "E&O INSURANCE", "CERTIFICATE OF LIABILITY INSURANCE", "PROFESSIONAL LIABILITY"])
            or any(k in hdr_clip for k in ["E & O", "E&O", "ERRORS & OMISSIONS", "APPRAISER E&O", "E&O INSURANCE", "CERTIFICATE OF LIABILITY INSURANCE"])
        ) and (
            any(ind in raw_upper for ind in [
                "POLICY NUMBER", "POLICY #", "POLICY NO", "POLICY PERIOD", "EXPIRATION", "INCEPTION",
                "LIMIT OF LIABILITY", "LIMITS", "DEDUCTIBLE", "INSURED", "CARRIER", "PRODUCER", "ACORD", "COVERAGE"
            ]) or "E & O" in raw_upper[:200] or "E&O" in raw_upper[:200]
        ) and "USPAP" not in hdr_clip

        if is_eo_page:
            eo_data = extract_eo_copy_data(page, p_no, use_ocr=include_images, appraiser_hint=appraiser_name)
            photos.append({
                "page": p_no,
                "category": "E&O Insurance",
                "caption": f"E&O Insurance Certificate (Page {p_no})",
                "format": "jpeg",
                "width": round(page.rect.width, 1),
                "height": round(page.rect.height, 1),
                "rect": [0, 0, round(page.rect.width, 1), round(page.rect.height, 1)],
                "base64_preview": eo_data.get("base64_preview", ""),
                "eo_data": eo_data,
                "raw_text": raw_text
            })
            photo_count += 1
            continue

        # Skip standard form report pages where images are only digital signatures or company headers
        is_form_report_page = (
            any(h in raw_upper for h in skip_form_headers) and 
            not any(k in raw_upper for k in photo_override_headers)
        )
        if is_form_report_page:
            continue

        # Check if page is a Building Sketch or Floor Plan exhibit (Full canvas pixmap render for vector or raster sketches)
        is_sketch_page = (
            any(k in hdr_clip for k in ["SKETCH", "FLOORPLAN", "FLOOR PLAN", "INSTAPLAN", "BUILDING SKETCH", "AREA CALCULATIONS"])
            or any(k in raw_upper[:300] for k in ["FLOORPLAN SKETCH", "BUILDING SKETCH", "SKETCH / FLOOR PLAN", "SKETCH ADDENDUM"])
        ) and "USPAP" not in hdr_clip

        if is_sketch_page:
            clip_rect = fitz.Rect(20, 70, page.rect.width - 20, page.rect.height - 35)
            caption = "Building Sketch / Floor Plan"
            m_sketch_page = re.search(r'(?:PAGE\s*[-#]?\s*(\d+))', hdr_clip)
            if m_sketch_page:
                caption = f"Building Sketch (Page {m_sketch_page.group(1)})"
            pix = page.get_pixmap(clip=clip_rect, dpi=180)
            img_bytes = pix.tobytes("jpeg")
            b64_str = base64.b64encode(img_bytes).decode("utf-8")

            sk_details = {}
            try:
                from map_extractor_cli import MapExtractor
                _ext = MapExtractor(save_images=False)
                sk_details = _ext.process_sketch_page(page, p_no, "Building Sketch", "xml_embedded_doc")
            except Exception as sk_err:
                pass

            photos.append({
                "page": p_no,
                "category": "Building Sketch",
                "caption": caption,
                "format": "jpeg",
                "width": round(clip_rect.width, 1),
                "height": round(clip_rect.height, 1),
                "rect": [round(clip_rect.x0, 1), round(clip_rect.y0, 1), round(clip_rect.x1, 1), round(clip_rect.y1, 1)],
                "base64_preview": f"data:image/jpeg;base64,{b64_str}",
                "gla": sk_details.get("gla"),
                "areas": sk_details.get("areas", []),
                "room_labels": sk_details.get("room_labels", []),
                "rooms_by_category": sk_details.get("rooms_by_category", {}),
                "rooms_by_level": sk_details.get("rooms_by_level", {}),
                "room_summary": sk_details.get("room_summary", {}),
                "dimensions": sk_details.get("dimensions", []),
                "raw_text": raw_text
            })
            photo_count += 1
            continue

        img_infos = page.get_image_info(xrefs=True)
        if not img_infos:
            continue

        # Collect placed image rectangles (keep strips with height >= 6 for merging)
        rects = []
        rect_xrefs = []
        for item in img_infos:
            bbox = item.get("bbox")
            if bbox:
                r = fitz.Rect(bbox)
                if r.width >= 50 and r.height >= 6:
                    rects.append(r)
                    rect_xrefs.append((r, item.get("xref", 0)))

        if not rects:
            continue

        # Merge horizontal strips (ACI / ClickFORMS style strip tiling, height < 75px) & overlapping masks
        clusters = []
        cluster_xrefs = []
        rect_xrefs.sort(key=lambda rx: (round(rx[0].x0 / 20), rx[0].y0))
        for r, xref_id in rect_xrefs:
            merged = False
            for idx_c, c in enumerate(clusters):
                is_slice = (c.height < 75 or r.height < 75)
                overlaps = (r.y0 < c.y1 - 5)
                if abs(c.x0 - r.x0) < 18 and abs(c.x1 - r.x1) < 18 and (overlaps or (is_slice and r.y0 <= c.y1 + 12)):
                    c.y1 = max(c.y1, r.y1)
                    if xref_id and xref_id not in cluster_xrefs[idx_c]:
                        cluster_xrefs[idx_c].append(xref_id)
                    merged = True
                    break
                inter = c & r
                min_area = min(c.get_area(), r.get_area())
                if min_area > 0 and (inter.get_area() / min_area) > 0.80:
                    c.x0 = min(c.x0, r.x0)
                    c.y0 = min(c.y0, r.y0)
                    c.x1 = max(c.x1, r.x1)
                    c.y1 = max(c.y1, r.y1)
                    if xref_id and xref_id not in cluster_xrefs[idx_c]:
                        cluster_xrefs[idx_c].append(xref_id)
                    merged = True
                    break
            if not merged:
                clusters.append(fitz.Rect(r))
                cluster_xrefs.append([xref_id] if xref_id else [])

        # Filter out thin dividers or tiny graphics (support 12/15-photo grids >= 55x50 pt)
        frame_pairs = [
            (c, xlist) for c, xlist in zip(clusters, cluster_xrefs)
            if (c.width >= 55 and c.height >= 50 and (c.width * c.height) >= 3200)
        ]
        photo_frames = [fp[0] for fp in frame_pairs]
        if not photo_frames:
            continue

        # Filter out full-page form background images on text addenda pages
        if len(photo_frames) == 1:
            f = photo_frames[0]
            if f.height > 600 and any(h in raw_upper for h in ["TEXT ADDENDUM", "APPRAISAL ADDENDUM", "INVOICE", "ENGAGEMENT"]):
                continue

        # Sort frames: top-to-bottom, left-to-right
        frame_pairs.sort(key=lambda fp: (round(fp[0].y0 / 50), fp[0].x0))
        photo_frames = [fp[0] for fp in frame_pairs]

        blocks = page.get_text("blocks")
        body_blocks = [b for b in blocks if b[1] >= 82] # Ignore page top header metadata
        page_words = [w for w in (page.get_text("words") or []) if w[1] >= 82]
        page_mid_x = float(page.rect.width) / 2.0

        for frame, frame_xrefs in frame_pairs:
            if photo_count >= max_photos:
                break

            best_label = ""
            unit_str = ""

            # Determine column/row neighbors so labels never bleed across adjacent grid cells
            has_right_neighbor = any(
                other is not frame and other.x0 >= frame.x1 - 15 and abs(other.y0 - frame.y0) < 80
                for other in photo_frames
            )
            next_row_y0 = min(
                (other.y0 for other in photo_frames
                 if other is not frame and other.y0 > frame.y1 - 5 and not (other.x1 < frame.x0 or other.x0 > frame.x1)),
                default=float(page.rect.height)
            )
            prev_row_y1 = max(
                (other.y1 for other in photo_frames
                 if other is not frame and other.y1 < frame.y0 + 5 and not (other.x1 < frame.x0 or other.x0 > frame.x1)),
                default=82.0
            )
            sub_y1 = min(frame.y1 + 65, next_row_y0 + 2)
            above_y0 = max(82.0, frame.y0 - 35, prev_row_y1 - 2)
            # Enforce two-column split boundaries when frame sits cleanly on one side of page_mid_x
            col_x0 = max(0.0, frame.x0 - 20)
            col_x1 = min(float(page.rect.width), frame.x1 + 20)
            if frame.x1 <= page_mid_x + 15:
                col_x1 = min(col_x1, page_mid_x + 10)
            elif frame.x0 >= page_mid_x - 15:
                col_x0 = max(col_x0, page_mid_x - 10)

            # Check Layout A: Text to the right of photo (TOTAL & ACI 3-photo layouts, only when no right-hand photo neighbor)
            if not has_right_neighbor and frame.width < page.rect.width * 0.70:
                right_blocks = [
                    b for b in body_blocks
                    if (frame.x1 - 35 <= b[0] <= frame.x1 + 240) and abs(b[1] - frame.y0) < 65
                ]
                if right_blocks:
                    right_blocks.sort(key=lambda b: (abs(b[1] - frame.y0), b[0]))
                    for b in right_blocks:
                        txt = b[4].strip()
                        for line in txt.split("\n"):
                            line = line.strip()
                            if not _is_boilerplate_photo_label(line):
                                best_label = line
                                break
                        if best_label:
                            break
                if not best_label and page_words:
                    best_label = _extract_words_in_band(
                        page_words,
                        frame.x1 - 10,
                        max(82.0, frame.y0 - 5),
                        min(float(page.rect.width), frame.x1 + 240),
                        frame.y1 + 5,
                    )

            # Check Layout B1: Word-level Sub-Image Band (column & row bounded)
            if not best_label and page_words:
                best_label = _extract_words_in_band(
                    page_words,
                    col_x0,
                    frame.y1 - 5,
                    col_x1,
                    sub_y1,
                )

            # Check Layout B2: Block-level Sub-Image Band fallback (ACI 6-photo interior grid layout)
            if not best_label:
                below_blocks = [
                    b for b in body_blocks
                    if (frame.y1 - 5 <= b[1] < sub_y1) and (abs(b[0] - frame.x0) < 60 or abs(b[2] - frame.x1) < 60)
                ]
                if below_blocks:
                    label_parts = []
                    for b in below_blocks:
                        for line in b[4].strip().split("\n"):
                            line = line.strip()
                            if not _is_boilerplate_photo_label(line):
                                if "UNIT" in line.upper():
                                    unit_str = line
                                elif line not in label_parts:
                                    label_parts.append(line)
                    if unit_str and unit_str not in label_parts:
                        best_label = f"{unit_str} - " + " ".join(label_parts[:2])
                    elif label_parts:
                        best_label = " ".join(label_parts[:2])

            # Check Layout C1: Word-level Above-Image Band (column & row bounded)
            if not best_label and page_words:
                best_label = _extract_words_in_band(
                    page_words,
                    col_x0,
                    above_y0,
                    col_x1,
                    frame.y0 + 5,
                )

            # Check Layout C2: Block-level Above-Image fallback
            if not best_label:
                above_blocks = [
                    b for b in body_blocks
                    if (above_y0 <= b[3] <= frame.y0 + 5) and (abs(b[0] - frame.x0) < 60 or abs(b[2] - frame.x1) < 60)
                ]
                if above_blocks:
                    for b in above_blocks:
                        for line in b[4].strip().split("\n"):
                            line = line.strip()
                            if not _is_boilerplate_photo_label(line):
                                best_label = line
                                break

            # Check Layout D: pdfplumber targeted crop fallback if vector text was fragmented
            if not best_label and pdfplumber is not None and pdf_bytes:
                try:
                    if plumber_doc is None:
                        plumber_doc = pdfplumber.open(io.BytesIO(pdf_bytes))
                    if p_idx < len(plumber_doc.pages):
                        ppage = plumber_doc.pages[p_idx]
                        crop_regions = [
                            (max(0, frame.x0 - 30), max(82, frame.y1 - 8), min(ppage.width, frame.x1 + 30), min(ppage.height, min(next_row_y0 + 8, frame.y1 + 85))),
                            (max(0, frame.x0 - 30), max(82, max(prev_row_y1 - 8, frame.y0 - 45)), min(ppage.width, frame.x1 + 30), min(ppage.height, frame.y0 + 8)),
                            (max(0, frame.x0 + 4), max(82, frame.y1 - frame.height * 0.22), min(ppage.width, frame.x1 - 4), min(ppage.height, frame.y1)),
                        ]
                        if not has_right_neighbor:
                            crop_regions.append((max(0, frame.x1 - 15), max(82, frame.y0 - 5), min(ppage.width, frame.x1 + 240), min(ppage.height, frame.y1 + 5)))
                        for cr in crop_regions:
                            if cr[2] > cr[0] + 10 and cr[3] > cr[1] + 5:
                                cr_txt = (ppage.crop(cr).extract_text() or "").strip()
                                for cr_ln in cr_txt.split("\n"):
                                    cr_ln = cr_ln.strip()
                                    if not _is_boilerplate_photo_label(cr_ln):
                                        best_label = cr_ln
                                        break
                            if best_label:
                                break
                except Exception:
                    pass

            # Check Layout E: Expanded word-level & inside-frame caption search (force extraction)
            if not best_label and page_words:
                expanded_bands = [
                    (frame.x0 - 45, frame.y1 - 8, frame.x1 + 45, min(float(page.rect.height), next_row_y0 + 8, frame.y1 + 95)),
                    (frame.x0 - 45, max(82.0, prev_row_y1 - 8, frame.y0 - 50), frame.x1 + 45, frame.y0 + 8),
                    (frame.x0 + 2, frame.y1 - frame.height * 0.25, frame.x1 - 2, frame.y1),
                ]
                for bx0, by0, bx1, by1 in expanded_bands:
                    if bx1 > bx0 + 10 and by1 > by0 + 5:
                        cand_lbl = _extract_words_in_band(page_words, bx0, by0, bx1, by1)
                        if cand_lbl and not _is_boilerplate_photo_label(cand_lbl):
                            best_label = cand_lbl
                            break

            # Check Layout F: Targeted OCR force fallback for rasterized/scanned label strips
            if not best_label and include_images and cv2 is not None and np is not None:
                try:
                    if ocr_extractor is None:
                        try:
                            from map_extractor_cli import MapExtractor
                        except ImportError:
                            from appraisal_review.map_extractor_cli import MapExtractor  # type: ignore
                        ocr_extractor = MapExtractor(save_images=False)
                    ocr_strips = [
                        fitz.Rect(max(0, frame.x0 - 20), max(82, frame.y1 - 4), min(page.rect.width, frame.x1 + 20), min(page.rect.height, sub_y1)),
                        fitz.Rect(max(0, frame.x0 - 20), max(82, above_y0), min(page.rect.width, frame.x1 + 20), min(page.rect.height, frame.y0 + 4)),
                    ]
                    if not has_right_neighbor:
                        ocr_strips.append(fitz.Rect(max(0, frame.x1 - 4), max(82, frame.y0), min(page.rect.width, frame.x1 + 240), min(page.rect.height, frame.y1)))
                    for s_rect in ocr_strips:
                        if s_rect.width < 20 or s_rect.height < 10:
                            continue
                        s_pix = page.get_pixmap(clip=s_rect, dpi=150)
                        s_arr = np.frombuffer(s_pix.samples, dtype=np.uint8).reshape(s_pix.height, s_pix.width, s_pix.n)
                        s_bgr = cv2.cvtColor(s_arr, cv2.COLOR_RGBA2BGR) if s_pix.n == 4 else cv2.cvtColor(s_arr, cv2.COLOR_RGB2BGR)
                        ocr_hits = ocr_extractor.run_ocr(s_bgr)
                        for o_txt, o_prob in (ocr_hits or []):
                            if o_prob >= 0.30 and not _is_boilerplate_photo_label(o_txt):
                                best_label = o_txt.strip()
                                break
                        if best_label:
                            break
                except Exception:
                    pass

            best_label = _clean_extracted_photo_label(best_label)

            # Skip digital signature labels
            if any(sig_w in (best_label or "").lower() for sig_w in [
                "signature", "appraiser signature", "supervisory appraiser", "review appraiser"
            ]):
                continue

            # Category detection based on label and page context
            category = "General"
            lbl_upper = (best_label or "").upper()
            if any(k in lbl_upper for k in [
                "HUD PLATE", "HUD CERTIFICATION", "HUD CERTIFICATE", "DATA PLATE",
                "COMPLIANCE CERTIFICATE", "HUD LABEL"
            ]) or re.search(r'\b(?:HUD\s+PLATE|PLATE\s*[#\d]|HUD\s+CERT(?:IFICATE)?|DATA\s+PLATE)\b', lbl_upper):
                category = "Subject"
            elif any(k in raw_upper for k in ["HUD CERTIFICATION", "HUD PLATE", "DATA PLATE", "COMPLIANCE CERTIFICATE", "HUD CERTIFICATE"]):
                category = "Subject"
            elif any(k in lbl_upper for k in ["FRONT", "REAR", "STREET", "SIDE", "YARD", "EXTERIOR", "DRIVEWAY"]):
                category = "Subject"
            elif any(k in lbl_upper for k in ["LIVING", "KITCHEN", "BATH", "BED", "DINING", "FAMILY", "BASEMENT", "ROOM", "DEN", "OFFICE", "NOOK", "LAUNDRY", "ALARM", "FURNACE", "HEATER", "GARAGE"]):
                category = "Interior"
            elif any(k in lbl_upper for k in ["COMPARABLE", "COMP"]):
                category = "Comparable"
            elif any(k in lbl_upper for k in ["RENTAL", "LEASE"]):
                category = "Rental"
            elif any(k in lbl_upper or k in raw_upper for k in ["SKETCH", "FLOORPLAN"]):
                category = "Sketch"
            elif any(re.search(r'\b' + re.escape(k) + r'\b', lbl_upper) or re.search(r'\b' + re.escape(k) + r'\b', raw_upper) for k in ["MAP", "PLAT", "AERIAL", "FLOOD"]):
                category = "Map"
            elif any(k in raw_upper for k in ["SUBJECT PROPERTY PHOTO", "SUBJECT PHOTO"]):
                category = "Subject"
            elif any(k in raw_upper for k in ["INTERIOR PHOTO"]):
                category = "Interior"

            has_explicit_label = bool(best_label and best_label.strip())
            if not best_label:
                if any(k in raw_upper for k in ["HUD CERTIFICATION LABEL", "HUD CERTIFICATION"]):
                    best_label = "HUD Certification Label"
                elif any(k in raw_upper for k in ["HUD PLATE DATA", "HUD DATA PLATE", "DATA PLATE"]):
                    best_label = "HUD Plate Data"
                elif any(k in raw_upper for k in ["HUD COMPLIANCE", "HUD CERTIFICATE", "COMPLIANCE CERTIFICATE"]):
                    best_label = "HUD Compliance Certificate"
                elif category == "Sketch":
                    best_label = "Building Floorplan Sketch"
                elif category == "Map":
                    for m_term in ["PLAT MAP", "FLOOD MAP", "AERIAL MAP", "LOCATION MAP", "TAX MAP"]:
                        if m_term in raw_upper:
                            best_label = m_term.title()
                            break
                    if not best_label:
                        best_label = "Map Exhibit"
                else:
                    if category == "Subject":
                        best_label = "Subject Exterior"
                    elif category == "Interior":
                        best_label = "Interior Room"
                    elif category == "Comparable":
                        best_label = "Comparable Sale"
                    elif category == "Rental":
                        best_label = "Rental Comparable"
                    else:
                        best_label = "Additional Exhibit"

            # Render image & run OpenCV quality verification (native xref pixmap when single-xref, else clip pixmap)
            base64_preview = ""
            quality_metrics = None
            w_px, h_px = round(frame.width), round(frame.height)
            if include_images:
                try:
                    pix = page.get_pixmap(clip=frame, dpi=dpi)
                    w_px, h_px = pix.width, pix.height
                    q_pix = pix
                    if len(frame_xrefs) == 1 and frame_xrefs[0]:
                        try:
                            native_pix = fitz.Pixmap(doc, frame_xrefs[0])
                            if native_pix.n - native_pix.alpha > 3:
                                native_pix = fitz.Pixmap(fitz.csRGB, native_pix)
                            q_pix = native_pix
                        except Exception:
                            q_pix = pix
                    quality_metrics = _assess_photo_quality(q_pix)
                    img_bytes = pix.tobytes("jpeg", jpg_quality=70)
                    b64_enc = base64.b64encode(img_bytes).decode("ascii")
                    base64_preview = f"data:image/jpeg;base64,{b64_enc}"
                except Exception:
                    pass

            is_hud_page = any(k in raw_upper for k in [
                "HUD CERTIFICATION", "HUD PLATE", "DATA PLATE", "COMPLIANCE CERTIFICATE", "HUD CERTIFICATE"
            ]) or bool(re.search(r'\b(?:HUD\s+PLATE|PLATE\s*[#\d]|HUD\s+CERT(?:IFICATION)?|DATA\s+PLATE)\b', raw_upper))

            # Normalize HUD labels when on HUD-specific page
            if is_hud_page:
                if re.match(r'^(?:Label|Plate)\s*[1-9]\d*$', best_label, re.I):
                    best_label = f"HUD Certification {best_label}"
                elif re.match(r'^(?:Label|Plate)\s*[1-9]\d*\s*\(', best_label, re.I):
                    m_lbl = re.match(r'^(?:Label|Plate)\s*([1-9]\d*)', best_label, re.I)
                    if m_lbl:
                        best_label = f"HUD Certification Label {m_lbl.group(1)}"

            # Extract photo metadata (Subject, Comparable, Rental)
            comp_meta = {}
            if not is_hud_page and (category in ["Comparable", "Rental", "Subject"] or any(k in raw_upper for k in [
                "COMPARABLE PHOTO", "COMPARABLE PROPERTY", "FORM PICPIX",
                "RENTAL PHOTO", "FORM DLSTRNT", "RENTALS PHOTO",
                "SUBJECT PROPERTY PHOTO", "SUBJECT PHOTO"
            ])):
                comp_meta = extract_comp_photo_metadata(page, frame, body_blocks, reference_records=reference_records)
                if comp_meta.get("category") and comp_meta.get("category") != "General":
                    category = comp_meta["category"]
                if comp_meta.get("title"):
                    best_label = comp_meta["title"]

            # Check Mandatory Subject View
            mand_res = classify_subject_view_label(best_label, page_context=raw_text[:300])
            mand_view_type = None
            mand_orig_label = None
            if mand_res:
                mand_view_type, mand_orig_label = mand_res
                category = "Subject"

            photo_count += 1
            slot_status = "LABELED" if has_explicit_label else "MISSING_LABEL"
            final_lbl = mand_view_type or best_label
            normalized_lbl = _normalize_photo_label(final_lbl)
            norm_group_map = {
                "Bedroom": "bedrooms",
                "Bathroom": "bathrooms",
                "Kitchen": "kitchen",
                "Living Area": "living",
                "Dining Area": "dining",
                "Exterior Front": "subject_exterior",
                "Exterior Rear": "subject_exterior",
                "Street View": "subject_exterior",
                "Garage / Parking": "garage",
                "Basement": "basement",
            }
            photo_group = norm_group_map.get(normalized_lbl, "other")
            if re.search(r"\b(?:basement|bsmt|below\s*grade|lower\s*level|cellar)\b", final_lbl, re.I):
                if re.search(r"\b(?:bed|br|bdrm)\b", final_lbl, re.I):
                    photo_group = "basement_bedrooms"
                elif re.search(r"\b(?:bath|bth|ba|powder|lav)\b", final_lbl, re.I):
                    photo_group = "basement_bathrooms"
                elif re.search(r"\b(?:rec|family|game|media|play)\b", final_lbl, re.I):
                    photo_group = "basement_rec"
                else:
                    photo_group = "basement_other"
            photo_item = {
                "id": f"photo_{photo_count}",
                "caption": final_lbl,
                "title": final_lbl,
                "normalized_label": normalized_lbl,
                "photo_group": photo_group,
                "slot_status": slot_status,
                "category": category,
                "page": p_no,
                "base64_preview": base64_preview,
                "image_data": base64_preview,
                "width": w_px,
                "height": h_px,
                "rect": {
                    "x0": round(frame.x0),
                    "y0": round(frame.y0),
                    "x1": round(frame.x1),
                    "y1": round(frame.y1)
                }
            }
            if quality_metrics:
                photo_item["image_quality"] = quality_metrics
            if mand_view_type:
                photo_item["view_type"] = mand_view_type
                photo_item["original_label"] = mand_orig_label
                photo_item["is_mandatory"] = True

            # Dynamic sketch extraction directly from the sketch page canvas
            if category in ["Sketch", "Building Sketch"] or "SKETCH" in raw_upper or "FLOOR PLAN" in raw_upper or "FLOORPLAN" in raw_upper:
                try:
                    from map_extractor_cli import MapExtractor
                    _extractor = MapExtractor(save_images=False)
                    sk_data = _extractor.process_sketch_page(page, p_no, "Building Sketch", "xml_embedded_doc")
                    photo_item["category"] = "Building Sketch"
                    photo_item["caption"] = "Building Sketch / Floor Plan"
                    photo_item["gla"] = sk_data.get("gla")
                    photo_item["areas"] = sk_data.get("areas", [])
                    photo_item["room_labels"] = sk_data.get("room_labels", [])
                    photo_item["rooms_by_category"] = sk_data.get("rooms_by_category", {})
                    photo_item["rooms_by_level"] = sk_data.get("rooms_by_level", {})
                    photo_item["room_summary"] = sk_data.get("room_summary", {})
                    photo_item["dimensions"] = sk_data.get("dimensions", [])
                    photo_item["raw_text"] = raw_text
                except Exception as _sk_err:
                    pass

            if comp_meta:
                is_rent = (category == "Rental") or comp_meta.get("is_rental", False)
                photo_item.update({
                    "is_rental": is_rent,
                    "comp_number": comp_meta.get("comp_num"),
                    "comp_num": comp_meta.get("comp_num"),
                    "street": comp_meta.get("street", ""),
                    "address": comp_meta.get("address", ""),
                    "proximity": comp_meta.get("proximity", ""),
                    "sale_price": comp_meta.get("sale_price", "") if not (category == "Subject") else "",
                    "rent_amount": comp_meta.get("rent_amount", "") or (comp_meta.get("sale_price", "") if is_rent else ""),
                    "monthly_rent": comp_meta.get("monthly_rent", "") or (comp_meta.get("sale_price", "") if is_rent else ""),
                    "gla": comp_meta.get("gla", ""),
                    "total_rooms": comp_meta.get("total_rooms", ""),
                    "bedrooms": comp_meta.get("bedrooms", ""),
                    "bathrooms": comp_meta.get("bathrooms", ""),
                    "location": comp_meta.get("location", ""),
                    "view": comp_meta.get("view", ""),
                    "site": comp_meta.get("site", ""),
                    "quality": comp_meta.get("quality", ""),
                    "age": comp_meta.get("age", ""),
                    "metadata": comp_meta.get("metadata", {})
                })
                display_addr = comp_meta.get("street") or comp_meta.get("address")
                if display_addr and not any(display_addr in best_label for _ in [1]):
                    photo_item["caption"] = f"{best_label} - {display_addr}"

            photos.append(photo_item)

    # Final pass to ensure all Subject and Interior photos have the verified Subject property address
    sub_ref = (reference_records.get("subject") or {}) if reference_records else {}
    sub_addr = sub_ref.get("address") or f"{sub_ref.get('street', '')}, {sub_ref.get('city', '')}, {sub_ref.get('state', '')} {sub_ref.get('zipcode', '')}".strip(", ")
    sub_st = sub_ref.get("street") or ""
    if sub_addr or sub_st:
        for p in photos:
            if p.get("category") in ["Subject", "Interior"]:
                if not p.get("address"):
                    p["address"] = sub_addr
                if not p.get("street"):
                    p["street"] = sub_st

    if plumber_doc is not None:
        try:
            plumber_doc.close()
        except Exception:
            pass

    return photos


def extract_fields_from_xml(xml_path_or_bytes: Any, extract_images: bool = True, companion_pdf_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Parses a MISMO 2.6 XML appraisal file and returns the full structured fields dictionary.
    All data is extracted dynamically from the XML DOM and attributes.
    """
    raw_xml_text = ""
    try:
        if isinstance(xml_path_or_bytes, (str, bytes, bytearray, os.PathLike)) and isinstance(xml_path_or_bytes, str) and os.path.exists(xml_path_or_bytes):
            try:
                with open(xml_path_or_bytes, "r", encoding="utf-8", errors="ignore") as f:
                    raw_xml_text = f.read()
            except Exception:
                pass
            tree = ET.parse(xml_path_or_bytes)
            root = tree.getroot()
        elif isinstance(xml_path_or_bytes, (bytes, bytearray)):
            raw_xml_text = xml_path_or_bytes.decode("utf-8", errors="ignore")
            root = ET.fromstring(xml_path_or_bytes)
        elif isinstance(xml_path_or_bytes, str):
            raw_xml_text = xml_path_or_bytes
            root = ET.fromstring(xml_path_or_bytes.encode("utf-8"))
        else:
            tree = ET.parse(xml_path_or_bytes)
            root = tree.getroot()
    except Exception as e:
        return {"status": "error", "message": f"XML parse error: {str(e)}", "fields": {}}

    report = root.find(".//REPORT")
    parties = root.find(".//PARTIES")
    property_elem = root.find(".//PROPERTY")
    val_methods = root.find(".//VALUATION_METHODS")
    valuation = root.find(".//VALUATION")
    proj = property_elem.find("PROJECT") if property_elem is not None else None
    if proj is None and root is not None:
        proj = root.find(".//PROJECT")

    # Form type detection & Report Identifiers
    mismo_form_type = ""
    file_id = ""
    loan_num = ""
    signed_date = ""
    purpose = ""
    if report is not None:
        mismo_form_type = report.attrib.get("AppraisalFormType", "")
        file_id = report.attrib.get("AppraiserFileIdentifier", "")
        loan_num = report.attrib.get("AppraiserAdditionalFileIdentifier", "")
        signed_date = _format_date(report.attrib.get("AppraiserReportSignedDate", ""))
        purpose = report.attrib.get("AppraisalPurposeType", "")

    form_type = _detect_form_type_from_xml(root)

    # UAD 3.6 / Appraisal Version #1 dispatch
    if "Appraisal Version" in form_type or "3.6" in root.attrib.get("MISMOReferenceModelIdentifier", ""):
        try:
            from .uad36_extractor import extract_fields_from_uad36_xml
        except (ImportError, ValueError):
            from uad36_extractor import extract_fields_from_uad36_xml
        return extract_fields_from_uad36_xml(
            xml_path_or_bytes if isinstance(xml_path_or_bytes, (str, os.PathLike)) else root,
            extract_images=extract_images,
            companion_pdf_path=companion_pdf_path
        )

    # Appraiser & Parties
    appraiser_name = ""
    appraiser_company = ""
    appraiser_address = ""
    appraiser_phone = ""
    appraiser_email = ""
    lic_type = ""
    lic_id = ""
    lic_state = ""
    lic_exp = ""
    appr_state = ""
    state_cert_no = ""
    state_lic_no = ""
    
    lender_name = ""
    lender_client_name = ""
    lender_address = ""
    lender_email = ""
    borrower_name = ""

    appraiser_elem = parties.find("APPRAISER") if parties is not None else None
    if appraiser_elem is None:
        appraiser_elem = root.find(".//APPRAISER")

    if appraiser_elem is not None:
        appraiser_name = appraiser_elem.attrib.get("_Name", "")
        appraiser_company = appraiser_elem.attrib.get("_CompanyName", "")
        appr_st = appraiser_elem.attrib.get("_StreetAddress", "")
        appr_st2 = appraiser_elem.attrib.get("_StreetAddress2", "")
        appr_city = appraiser_elem.attrib.get("_City", "")
        appr_state = appraiser_elem.attrib.get("_State", "")
        appr_zip = appraiser_elem.attrib.get("_PostalCode", "")
        st_full = ", ".join([p for p in [appr_st, appr_st2] if p])
        cz_full = f"{appr_city}, {appr_state} {appr_zip}".strip(", ")
        appraiser_address = f"{st_full}, {cz_full}".strip(", ") if st_full and cz_full else (st_full or cz_full)

        for cp in appraiser_elem.findall(".//CONTACT_POINT"):
            t = cp.attrib.get("_Type", "").lower()
            val = cp.attrib.get("_Value", "")
            if ("phone" in t or "tel" in t) and not appraiser_phone:
                appraiser_phone = val
            elif "email" in t and not appraiser_email:
                appraiser_email = val

        appr_lic_elem = appraiser_elem.find("APPRAISER_LICENSE")
        if appr_lic_elem is None:
            appr_lic_elem = root.find(".//APPRAISER/APPRAISER_LICENSE")

        if appr_lic_elem is not None:
            lic_type = appr_lic_elem.attrib.get("_Type", "")
            lic_id = appr_lic_elem.attrib.get("_Identifier", "")
            lic_state = appr_lic_elem.attrib.get("_State", "") or appr_state
            lic_exp = _format_date(appr_lic_elem.attrib.get("_ExpirationDate", ""))

            if "lic" in lic_type.lower():
                state_lic_no = lic_id
            elif "cert" in lic_type.lower():
                state_cert_no = lic_id
            elif "lic" in lic_id.lower():
                state_lic_no = lic_id
            else:
                state_cert_no = lic_id

    # Supervisory Appraiser
    supervisor_elem = parties.find("SUPERVISOR") if parties is not None else None
    if supervisor_elem is None and parties is not None:
        supervisor_elem = parties.find("SUPERVISORY_APPRAISER")
    if supervisor_elem is None:
        supervisor_elem = root.find(".//SUPERVISOR")
    if supervisor_elem is None:
        supervisor_elem = root.find(".//SUPERVISORY_APPRAISER")

    sup_name = supervisor_elem.attrib.get("_Name", "") if supervisor_elem is not None else ""
    sup_company = supervisor_elem.attrib.get("_CompanyName", "") if supervisor_elem is not None else ""
    sup_st = supervisor_elem.attrib.get("_StreetAddress", "") if supervisor_elem is not None else ""
    sup_city = supervisor_elem.attrib.get("_City", "") if supervisor_elem is not None else ""
    sup_st_code = supervisor_elem.attrib.get("_State", "") if supervisor_elem is not None else ""
    sup_zip = supervisor_elem.attrib.get("_PostalCode", "") if supervisor_elem is not None else ""
    sup_address = f"{sup_st}, {sup_city}, {sup_st_code} {sup_zip}".strip(", ") if sup_st or sup_city else ""

    sup_phone = ""
    sup_email = ""
    if supervisor_elem is not None:
        for cp in supervisor_elem.findall(".//CONTACT_POINT"):
            t = cp.attrib.get("_Type", "").lower()
            val = cp.attrib.get("_Value", "")
            if ("phone" in t or "tel" in t) and not sup_phone:
                sup_phone = val
            elif "email" in t and not sup_email:
                sup_email = val

    sup_lic_elem = supervisor_elem.find("APPRAISER_LICENSE") if supervisor_elem is not None else None
    sup_lic_type = sup_lic_elem.attrib.get("_Type", "") if sup_lic_elem is not None else ""
    sup_lic_id = sup_lic_elem.attrib.get("_Identifier", "") if sup_lic_elem is not None else ""
    sup_lic_state = sup_lic_elem.attrib.get("_State", "") if sup_lic_elem is not None else ""
    sup_lic_exp = _format_date(sup_lic_elem.attrib.get("_ExpirationDate", "")) if sup_lic_elem is not None else ""

    sup_cert_no = ""
    sup_lic_no = ""
    if "cert" in sup_lic_type.lower():
        sup_cert_no = sup_lic_id
    elif "lic" in sup_lic_type.lower():
        sup_lic_no = sup_lic_id
    elif sup_lic_id:
        sup_cert_no = sup_lic_id

    # Lender & Borrower
    if parties is not None:
        lender_elem = parties.find("LENDER")
        if lender_elem is not None:
            lender_name = lender_elem.attrib.get("_UnparsedName", "") or lender_elem.attrib.get("_Name", "") or lender_elem.attrib.get("_CompanyName", "")
            lender_address = lender_elem.attrib.get("AppraisalFormsUnparsedAddress", "") or f"{lender_elem.attrib.get('_StreetAddress', '')}, {lender_elem.attrib.get('_StreetAddress2', '')}".strip(", ")
            for cp in lender_elem.findall(".//CONTACT_POINT"):
                if "email" in cp.attrib.get("_Type", "").lower() and not lender_email:
                    lender_email = cp.attrib.get("_Value", "")

            # Check contact detail name under LENDER (e.g. FastApp)
            cd_elem = lender_elem.find(".//CONTACT_DETAIL")
            if cd_elem is not None:
                lender_client_name = cd_elem.attrib.get("_Name", "").strip()

        borrower_elem = parties.find("BORROWER")
        if borrower_elem is not None:
            borrower_name = borrower_elem.attrib.get("_UnparsedName", "")

    # Fallback if lender_name is placeholder like 'SEE ADDENDUM' or missing
    if not lender_name or re.match(r"^(?:see\s+(?:addendum|attached|text|addenda)|refer\s+to|n/?a|none|undefined|null)\b", lender_name.strip(), re.I):
        early_narrative = " ".join(
            v for f in root.findall(".//FORM") for k, v in f.attrib.items()
            if ("text" in k.lower() or "comment" in k.lower() or "addendum" in k.lower()) and v
        )
        m_lender_add = re.search(r"(?:LENDER\s*[/]\s*CLIENT|LENDER\s+NAME|CLIENT\s+NAME)\s*[:\-]\s*([^\n\r<]{2,80})", early_narrative, re.I)
        if m_lender_add:
            cand_l = m_lender_add.group(1).strip()
            cand_l = re.split(r"\s+[-:]+", cand_l)[0].strip(" -:;,")
            if cand_l and not re.match(r"^(?:see\s+(?:addendum|attached)|n/?a|none)\b", cand_l, re.I):
                lender_name = cand_l

    # Priority 1: MANAGEMENT_COMPANY (AMC / Ordering Client Name for Certificate Page)
    mc_elem = root.find(".//MANAGEMENT_COMPANY")
    if mc_elem is not None:
        gse_amc = (mc_elem.attrib.get("GSEManagementCompanyName", "") or mc_elem.attrib.get("_Name", "") or mc_elem.attrib.get("_UnparsedName", "")).strip()
        if gse_amc:
            lender_client_name = gse_amc

    # Priority 2: Check <LENDER><NAME> if still empty
    if not lender_client_name and parties is not None:
        lender_elem = parties.find("LENDER")
        if lender_elem is not None:
            name_elem = lender_elem.find(".//NAME")
            if name_elem is not None:
                first = name_elem.attrib.get("_First", "").strip()
                last = name_elem.attrib.get("_Last", "").strip()
                if first or last:
                    lender_client_name = f"{first} {last}".strip()

    # Priority 3: Fallback to lender_name if no separate ordering client/AMC exists
    if not lender_client_name:
        lender_client_name = lender_name

    # Property info
    prop_addr = ""
    prop_city = ""
    prop_state = ""
    prop_zip = ""
    prop_county = ""
    prop_rights = ""
    prop_occupancy = ""

    unit_elem = root.find(".//_UNIT")
    unit_id = unit_elem.attrib.get("UnitIdentifier", "") if unit_elem is not None else ""

    if property_elem is not None:
        prop_addr = property_elem.attrib.get("_StreetAddress", "")
        prop_city = property_elem.attrib.get("_City", "")
        prop_state = property_elem.attrib.get("_State", "")
        prop_zip = property_elem.attrib.get("_PostalCode", "")
        prop_county = property_elem.attrib.get("_County", "")
        
        rights_raw = property_elem.attrib.get("_RightsType", "")
        if "Fee" in rights_raw: 
            prop_rights = "Fee Simple"
        elif "Lease" in rights_raw: 
            prop_rights = "Leasehold"
        else: 
            prop_rights = rights_raw
        
        occ_raw = property_elem.attrib.get("_CurrentOccupancyType", "")
        if "Tenant" in occ_raw: 
            prop_occupancy = "Tenant"
        elif "Vacant" in occ_raw: 
            prop_occupancy = "Vacant"
        elif "Owner" in occ_raw: 
            prop_occupancy = "Owner"
        else: 
            prop_occupancy = occ_raw

    if not unit_id and property_elem is not None:
        unit_id = (
            property_elem.attrib.get("_UnitIdentifier", "") or
            property_elem.attrib.get("UnitIdentifier", "") or
            property_elem.attrib.get("_UnitNumber", "") or
            property_elem.attrib.get("UnitNumber", "") or
            property_elem.attrib.get("_Unit", "")
        )
    # Ignore dash-only unit identifiers (e.g. XML stores "-" for no unit)
    if unit_id and re.match(r'^[-\s]+$', str(unit_id)):
        unit_id = ""
    if not unit_id and prop_addr:
        m_u = re.search(r'(?:Unit\s*#?|Apt\s*#?|#|Suite)\s*[:\-]?\s*([A-Za-z0-9\-]+)$', prop_addr, re.I)
        if m_u:
            unit_id = m_u.group(1).strip()
            prop_addr = re.sub(r'[\s,]+(?:Unit\s*#?|Apt\s*#?|#|Suite)\s*[:\-]?\s*[A-Za-z0-9\-]+$', '', prop_addr, flags=re.I).strip()

    if unit_id and str(unit_id).lower() not in prop_addr.lower():
        full_addr = f"{prop_addr} Unit {unit_id}, {prop_city}, {prop_state} {prop_zip}".strip(", ")
    else:
        full_addr = f"{prop_addr}, {prop_city}, {prop_state} {prop_zip}".strip(", ")

    # Identifiers
    apn = ""
    census = ""
    map_ref = ""
    legal_desc = ""
    owner_name = ""
    tax_year = ""
    taxes = ""
    special_taxes = ""

    if property_elem is not None:
        id_elem = property_elem.find("_IDENTIFICATION")
        if id_elem is not None:
            apn = id_elem.attrib.get("AssessorsParcelIdentifier", "")
            census = id_elem.attrib.get("CensusTractIdentifier", "")
            map_ref = id_elem.attrib.get("MapReferenceIdentifier", "")
        
        legal_elem = property_elem.find("_LEGAL_DESCRIPTION")
        if legal_elem is not None:
            legal_desc = legal_elem.attrib.get("_TextDescription", "")

        owner_elem = property_elem.find("_OWNER")
        if owner_elem is not None:
            owner_name = owner_elem.attrib.get("_Name", "")

        tax_elem = property_elem.find("_TAX")
        if tax_elem is not None:
            tax_year = tax_elem.attrib.get("_YearIdentifier", "")
            taxes = _clean_currency(tax_elem.attrib.get("_TotalTaxAmount", ""))
            special_taxes = _clean_currency(tax_elem.attrib.get("_TotalSpecialTaxAmount", ""))

    # Structure
    units = ""
    stories = ""
    design_style = ""
    year_built = ""
    gba = ""
    total_rooms = ""
    bedrooms = ""
    baths = ""
    struct_type = ""
    effective_age = ""
    foundation_type = ""
    prop_condition = ""
    struct_elem = None
    sa_elem = None

    if property_elem is not None:
        struct_elem = property_elem.find("STRUCTURE")
        if struct_elem is not None:
            units = struct_elem.attrib.get("LivingUnitCount", "")
            stories = struct_elem.attrib.get("StoriesCount", "")
            design_style = struct_elem.attrib.get("_DesignDescription", "")
            year_built = struct_elem.attrib.get("PropertyStructureBuiltYear", "")
            gba = struct_elem.attrib.get("GrossLivingAreaSquareFeetCount", "") or struct_elem.attrib.get("GrossBuildingAreaSquareFeetCount", "")
            total_rooms = struct_elem.attrib.get("TotalRoomCount", "")
            bedrooms = struct_elem.attrib.get("TotalBedroomCount", "")
            baths = struct_elem.attrib.get("TotalBathroomCount", "")
            
            # If multi-unit, calculate bathroom count from units if not present on structure
            if not baths:
                unit_baths = [float(u.attrib.get("TotalBathroomCount", 0)) for u in struct_elem.findall("_UNIT_GROUP") if u.attrib.get("TotalBathroomCount")]
                if unit_baths:
                    total_b = sum(unit_baths)
                    baths = str(int(total_b) if total_b.is_integer() else total_b)

            unit_elem = struct_elem.find("_UNIT") or root.find(".//_UNIT")
            unit_id = unit_elem.attrib.get("UnitIdentifier", "") if unit_elem is not None else ""

            conf_other = struct_elem.attrib.get("StructureConfigurationTypeOtherDescription", "")
            if any(w in conf_other.lower() for w in ["fan", "cool", "heat", "ac", "air"]):
                conf_other = ""
            conf_type = struct_elem.attrib.get("StructureConfigurationType", "")
            if conf_type.lower() == "other":
                conf_type = ""

            struct_type = (
                struct_elem.attrib.get("AttachmentType", "") or 
                conf_other or 
                conf_type or
                ("Attached" if ("1073" in form_type or "CONDO" in form_type.upper()) else "Detached")
            )
            sa_elem = struct_elem.find("STRUCTURE_ANALYSIS")
            if sa_elem is None:
                sa_elem = root.find(".//STRUCTURE_ANALYSIS")
            if sa_elem is not None:
                effective_age = sa_elem.attrib.get("EffectiveAgeYearsCount", "")
            
            found_elems = struct_elem.findall("FOUNDATION")
            for fe in found_elems:
                if not fe.attrib or fe.attrib.get("_ExistsIndicator", "Y") == "N":
                    continue
                ft_cand = fe.attrib.get("_Type", "")
                mat_cand = fe.attrib.get("_MaterialType", "")
                other_cand = fe.attrib.get("_OtherDescription", "")
                comb_cand = f"{ft_cand} {mat_cand}".lower()
                cond_cand = fe.attrib.get("_ConditionDescription", "")
                if "runner" in comb_cand or fe.attrib.get("_ConcreteRunnersIndicator") == "Y":
                    foundation_type = "Concrete Runners"
                    break
                elif "poured" in comb_cand or fe.attrib.get("_PouredConcreteIndicator") == "Y":
                    foundation_type = "Poured Concrete"
                    break
                elif "block" in comb_cand or "pier" in comb_cand or fe.attrib.get("_BlockAndPierIndicator") == "Y":
                    foundation_type = "Block & Pier"
                    break
                elif "slab" in comb_cand or fe.attrib.get("_ConcreteSlabIndicator") == "Y":
                    foundation_type = "Concrete Slab"
                    break
                elif "crawl" in comb_cand or fe.attrib.get("_CrawlSpaceIndicator") == "Y":
                    foundation_type = "Crawl Space"
                    break
                elif "partial" in comb_cand or "partial" in cond_cand.lower() or fe.attrib.get("_PartialBasementIndicator") == "Y":
                    foundation_type = "Partial Basement"
                    break
                elif "full" in comb_cand or "full" in cond_cand.lower() or fe.attrib.get("_FullBasementIndicator") == "Y" or "basement" in comb_cand:
                    foundation_type = "Full Basement"
                    break
                elif other_cand:
                    foundation_type = f"Other: {other_cand}"
                    break
                elif ft_cand or mat_cand:
                    foundation_type = ft_cand or mat_cand
                    break

    # Site
    site_dim = ""
    site_area = ""
    zoning_class = ""
    zoning_desc = ""
    zoning_comp = ""
    hbu = ""
    site_shape = ""
    site_view = ""
    site_topography = ""
    site_size = ""
    site_density = ""
    utilities_list = []
    util_dict = {}

    site_elem = property_elem.find("SITE") if property_elem is not None else None
    if site_elem is None:
        site_elem = root.find(".//SITE")

    if site_elem is not None:
        site_dim = site_elem.attrib.get("_DimensionsDescription", "")
        site_area = site_elem.attrib.get("_AreaDescription", "")
        zoning_class = site_elem.attrib.get("_ZoningClassificationIdentifier", "")
        zoning_desc = site_elem.attrib.get("_ZoningClassificationDescription", "")
        zcomp_raw = site_elem.attrib.get("_ZoningComplianceType", "")
        if "nonconforming" in zcomp_raw.lower() or "grandfathered" in zcomp_raw.lower():
            zoning_comp = "Legal Nonconforming (Grandfathered Use)"
        elif "no zoning" in zcomp_raw.lower() or zcomp_raw.lower() == "nozoning":
            zoning_comp = "No Zoning"
        elif "illegal" in zcomp_raw.lower():
            zoning_comp = "Illegal (describe)"
        elif zcomp_raw.lower() == "legal":
            zoning_comp = "Legal"
        else:
            zoning_comp = zcomp_raw

        hbu_ind = site_elem.attrib.get("HighestBestUseIndicator", "")
        if hbu_ind.upper() == "Y":
            hbu = "Yes"
        elif hbu_ind.upper() == "N":
            hbu = "No"
        elif hbu_ind:
            hbu = hbu_ind

        all_sf_elements = list(site_elem.findall("SITE_FEATURE"))
        for sf in root.findall(".//SITE_FEATURE"):
            if sf not in all_sf_elements:
                all_sf_elements.append(sf)

        for sf in all_sf_elements:
            stype = (sf.attrib.get("_Type", "") or "").strip().lower()
            scomm = (sf.attrib.get("_Comment", "") or sf.attrib.get("_Description", "") or sf.attrib.get("_OtherDescription") or sf.text or "").strip()
            stype_norm = re.sub(r'[^a-z]', '', stype)
            if "topograph" in stype_norm and not site_topography:
                site_topography = scomm
            elif stype_norm in ("size", "sitesize", "projectsize", "lotsize") and not site_size:
                site_size = scomm
            elif "density" in stype_norm and not site_density:
                site_density = scomm
            elif stype_norm == "shape" and not site_shape:
                site_shape = scomm
            elif stype_norm == "view" and not site_view:
                site_view = scomm

        for util in site_elem.findall("SITE_UTILITY"):
            utype = util.attrib.get("_Type", "").strip()
            upub = util.attrib.get("_PublicIndicator", "").upper()
            unon = util.attrib.get("_NonPublicIndicator", "").upper()
            udesc = util.attrib.get("_NonPublicDescription", "").strip()

            if upub == "Y":
                uval = "Public"
            elif unon == "Y":
                uval = f"Other: {udesc}" if udesc else "Other"
            elif udesc:
                uval = "None" if udesc.upper() == "NONE" else udesc
            elif upub == "N":
                uval = "None"
            else:
                uval = ""

            if utype:
                if utype.lower() in ("sanitarysewer", "sanitary sewer"):
                    util_dict["Sanitary Sewer"] = uval
                else:
                    util_dict[utype] = uval
                if uval:
                    utilities_list.append(f"{utype}: {uval}")

    if not zoning_comp:
        z_elem = root.find(".//*[@_ZoningComplianceType]")
        if z_elem is not None:
            zcomp_raw = z_elem.attrib.get("_ZoningComplianceType", "")
            if "nonconforming" in zcomp_raw.lower() or "grandfathered" in zcomp_raw.lower():
                zoning_comp = "Legal Nonconforming (Grandfathered Use)"
            elif "no zoning" in zcomp_raw.lower() or zcomp_raw.lower() == "nozoning":
                zoning_comp = "No Zoning"
            elif "illegal" in zcomp_raw.lower():
                zoning_comp = "Illegal (describe)"
            elif zcomp_raw.lower() == "legal":
                zoning_comp = "Legal"
            else:
                zoning_comp = zcomp_raw

    utilities_str = ", ".join(utilities_list)

    # Dynamic Site Topography, Size & Density fallback extraction
    if not site_topography and site_elem is not None:
        site_topography = (
            site_elem.attrib.get("_TopographyDescription", "") or
            site_elem.attrib.get("TopographyDescription", "") or
            site_elem.attrib.get("TopographyType", "") or
            site_elem.attrib.get("_Topography", "")
        )
    if not site_topography:
        for el in root.iter():
            for ak, av in el.attrib.items():
                if "topograph" in ak.lower() and av and isinstance(av, str):
                    site_topography = av.strip()
                    break
            if site_topography:
                break

    if not site_density and site_elem is not None:
        site_density = (
            site_elem.attrib.get("_DensityDescription", "") or
            site_elem.attrib.get("DensityDescription", "") or
            site_elem.attrib.get("ProjectDensityType", "") or
            site_elem.attrib.get("DensityType", "") or
            site_elem.attrib.get("_Density", "")
        )
    if not site_density:
        p_el = property_elem.find("PROJECT") if property_elem is not None else None
        if p_el is None:
            p_el = root.find(".//PROJECT")
        if p_el is not None:
            site_density = (
                p_el.attrib.get("ProjectDensityType", "") or
                p_el.attrib.get("_DensityDescription", "") or
                p_el.attrib.get("DensityType", "")
            )
    if not site_density:
        for el in root.iter():
            for ak, av in el.attrib.items():
                if "density" in ak.lower() and av and isinstance(av, str) and not "zoning" in ak.lower():
                    site_density = av.strip()
                    break
            if site_density:
                break

    if not site_size:
        if site_elem is not None:
            site_size = (
                site_elem.attrib.get("_AreaDescription", "") or
                site_elem.attrib.get("SquareFeetCount", "") or
                site_elem.attrib.get("_DimensionsDescription", "") or
                site_elem.attrib.get("SiteAreaSquareFeetNumber", "") or
                ""
            )
        if not site_size:
            site_size = site_area or site_dim

    # Dynamic Off-Site Improvements (Street & Alley)
    street_val = ""
    alley_val = ""
    street_desc = ""
    street_types = []
    street_access = ""
    street_access_desc = ""
    street_maintained = ""
    street_maintained_desc = ""
    for osi in root.findall(".//_OFF_SITE_IMPROVEMENT") + root.findall(".//OFF_SITE_IMPROVEMENT"):
        otype = osi.attrib.get("_Type", "")
        odesc = osi.attrib.get("_Description", "").strip()
        oown = osi.attrib.get("_OwnershipType", "").strip()
        oexists = osi.attrib.get("_ExistsIndicator", "").upper()

        if otype.lower() == "street":
            if odesc and odesc.lower() != "none" and not street_desc:
                street_desc = odesc
            if oexists == "Y" and oown and oown not in street_types:
                street_types.append(oown)
            elif oown and oexists != "N" and oown not in street_types:
                street_types.append(oown)
        elif otype.lower() == "alley":
            if oexists == "Y" and odesc and odesc.lower() != "none":
                alley_val = f"{oown}: {odesc}" if oown else odesc
            elif odesc and odesc.lower() == "none":
                alley_val = "None"
            elif oexists == "N" and not alley_val:
                alley_val = "None"
        elif otype in ("StreetAccess", "VehicularAccess", "AdequateVehicularAccess") or otype.lower() in ("streetaccess", "vehicularaccess", "adequatevehicularaccess"):
            if oexists == "Y":
                street_access = "Yes"
                street_access_desc = f"Yes: {odesc}" if odesc else "Yes"
            elif oexists == "N":
                street_access = "No"
                street_access_desc = f"No: {odesc}" if odesc else "No"
            elif oexists:
                street_access = oexists
                street_access_desc = f"{oexists}: {odesc}" if odesc else oexists
            elif odesc:
                street_access_desc = odesc
        elif otype in ("StreetMaintenance", "ProperlyMaintained", "StreetProperlyMaintained") or otype.lower() in ("streetmaintenance", "properlymaintained", "streetproperlymaintained"):
            if oexists == "Y":
                street_maintained = "Yes"
                street_maintained_desc = f"Yes: {odesc}" if odesc else "Yes"
            elif oexists == "N":
                street_maintained = "No"
                street_maintained_desc = f"No: {odesc}" if odesc else "No"
            elif oexists:
                street_maintained = oexists
                street_maintained_desc = f"{oexists}: {odesc}" if odesc else oexists
            elif odesc:
                street_maintained_desc = odesc

    if street_types:
        s_own = "/".join(street_types)
        street_val = f"{s_own}: {street_desc}" if street_desc else s_own
    elif street_desc:
        street_val = street_desc

    # Dynamic Flood Zone
    fema_zone = ""
    fema_special = ""
    fema_map_id = ""
    fema_map_date = ""
    flood_elem = root.find(".//FLOOD_ZONE")
    if flood_elem is not None:
        fema_zone = flood_elem.attrib.get("NFIPFloodZoneIdentifier", "")
        fema_map_id = flood_elem.attrib.get("NFIPMapIdentifier", "")
        raw_fema_date = flood_elem.attrib.get("NFIPMapPanelDate", "")
        if raw_fema_date:
            m_date = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", raw_fema_date)
            if m_date:
                fema_map_date = f"{m_date.group(2)}/{m_date.group(3)}/{m_date.group(1)}"
            else:
                fema_map_date = raw_fema_date
        sf_ind = flood_elem.attrib.get("SpecialFloodHazardAreaIndicator", "")
        if sf_ind.upper() == "Y":
            fema_special = "Yes"
        elif sf_ind.upper() == "N":
            fema_special = "No"
        elif sf_ind:
            fema_special = sf_ind

    # Dynamic Typical Utilities & Adverse Site Conditions from PROPERTY_ANALYSIS
    util_typical = ""
    util_typical_desc = ""
    util_typical_comment = ""
    adverse_site = ""
    adverse_site_desc = ""
    adverse_site_comment = ""
    site_conforming = ""
    site_conforming_desc = ""
    site_conforming_comment = ""
    for pa in root.findall(".//PROPERTY_ANALYSIS"):
        ptype = pa.attrib.get("_Type", "")
        pind = pa.attrib.get("_ExistsIndicator", "").upper()
        pcomm = pa.attrib.get("_Comment", "").strip()

        ptype_clean = ptype.lower().replace("_", "").replace(" ", "")
        if ptype_clean in (
            "utilitiesandoffsiteimprovementsconformtoneighborhood",
            "utilitiesandoffsiteimprovementsconform",
            "utilitiesconformtoneighborhood",
            "utilitiesandoffsitetypical",
            "utilitiesandoffsiteimprovementstypical"
        ) or "utilities" in ptype_clean and "conform" in ptype_clean:
            util_typical_comment = pcomm
            if pind == "Y":
                util_typical = "Yes"
                util_typical_desc = f"Yes: {pcomm}" if pcomm else "Yes"
            elif pind == "N":
                util_typical = "No"
                util_typical_desc = f"No: {pcomm}" if pcomm else "No"
            elif pind:
                util_typical = pind
                util_typical_desc = f"{pind}: {pcomm}" if pcomm else pind
            elif pcomm:
                util_typical_desc = pcomm
        elif ptype_clean in (
            "conformstoneighborhoodintermsofsizeandshape",
            "siteconformingtomarketarea",
            "siteconformstomarketarea",
            "sitesizeshapeconforming",
            "conformstoneighborhoodsizeandshape"
        ) or ("site" in ptype_clean and "conforming" in ptype_clean):
            site_conforming_comment = pcomm
            if pind == "Y":
                site_conforming = "Yes"
                site_conforming_desc = f"Yes: {pcomm}" if pcomm else "Yes"
            elif pind == "N":
                site_conforming = "No"
                site_conforming_desc = f"No: {pcomm}" if pcomm else "No"
            elif pind:
                site_conforming = pind
                site_conforming_desc = f"{pind}: {pcomm}" if pcomm else pind
            elif pcomm:
                site_conforming_desc = pcomm
        elif ptype_clean in (
            "adversesiteconditions",
            "adverseconditions",
            "adversesiteconditionsorexternalfactors"
        ) or ("adverse" in ptype_clean and "site" in ptype_clean):
            adverse_site_comment = pcomm
            if pind == "N":
                adverse_site = "No"
                adverse_site_desc = f"No: {pcomm}" if pcomm else "No"
            elif pind == "Y":
                adverse_site = "Yes"
                adverse_site_desc = f"Yes: {pcomm}" if pcomm else "Yes"
            elif pind:
                adverse_site = pind
                adverse_site_desc = f"{pind}: {pcomm}" if pcomm else pind
            elif pcomm:
                adverse_site_desc = pcomm

    # Neighborhood
    nb_name = ""
    nb_loc = ""
    nb_built = ""
    nb_growth = ""
    nb_val = ""
    nb_demand = ""
    nb_mkt_time = ""
    nb_bound = ""
    nb_desc = ""
    nb_mkt = ""

    one_unit = ""
    two_four_unit = ""
    multi_family = ""
    commercial = ""
    other_use = ""
    other_land_use_desc = ""

    housing_price = ""
    housing_age = ""
    h_low = ""
    h_high = ""
    h_pred = ""
    h_newest = ""
    h_oldest = ""
    h_pred_age = ""

    nb_elem = property_elem.find("NEIGHBORHOOD") if property_elem is not None else None
    if nb_elem is None:
        nb_elem = root.find(".//NEIGHBORHOOD")

    if nb_elem is not None:
        nb_name = nb_elem.attrib.get("_Name", "")
        if not nb_name and property_elem is not None:
            proj_elem = property_elem.find("PROJECT")
            if proj_elem is not None:
                nb_name = proj_elem.attrib.get("_Name", "")
        if not nb_name:
            proj_elem = root.find(".//PROJECT")
            if proj_elem is not None:
                nb_name = proj_elem.attrib.get("_Name", "")
        nb_bound = nb_elem.attrib.get("_BoundaryAndCharacteristicsDescription", "")
        nb_desc = nb_elem.attrib.get("_Description", "")
        nb_mkt = nb_elem.attrib.get("_MarketConditionsDescription", "")
        
        loc_raw = nb_elem.attrib.get("PropertyNeighborhoodLocationType", "")
        if "Urban" in loc_raw: 
            nb_loc = "Urban"
        elif "Suburban" in loc_raw: 
            nb_loc = "Suburban"
        elif "Rural" in loc_raw: 
            nb_loc = "Rural"
        elif loc_raw: 
            nb_loc = loc_raw
        
        built_raw = nb_elem.attrib.get("_BuiltupRangeType", "")
        if "Over75" in built_raw: 
            nb_built = "Over 75%"
        elif "25To75" in built_raw: 
            nb_built = "25-75%"
        elif "Under25" in built_raw: 
            nb_built = "Under 25%"
        elif built_raw: 
            nb_built = built_raw

        growth_raw = nb_elem.attrib.get("_GrowthPaceType", "")
        if "Rapid" in growth_raw: 
            nb_growth = "Rapid"
        elif "Stable" in growth_raw: 
            nb_growth = "Stable"
        elif "Slow" in growth_raw: 
            nb_growth = "Slow"
        elif growth_raw: 
            nb_growth = growth_raw

        val_raw = nb_elem.attrib.get("_PropertyValueTrendType", "")
        if "Increasing" in val_raw: 
            nb_val = "Increasing"
        elif "Stable" in val_raw: 
            nb_val = "Stable"
        elif "Declining" in val_raw: 
            nb_val = "Declining"
        elif val_raw: 
            nb_val = val_raw

        dem_raw = nb_elem.attrib.get("_DemandSupplyType", "")
        if "Shortage" in dem_raw: 
            nb_demand = "Shortage"
        elif "InBalance" in dem_raw: 
            nb_demand = "In Balance"
        elif "OverSupply" in dem_raw: 
            nb_demand = "Over Supply"
        elif dem_raw: 
            nb_demand = dem_raw

        time_raw = nb_elem.attrib.get("_TypicalMarketingTimeDurationType", "")
        if "UnderThree" in time_raw: 
            nb_mkt_time = "Under 3 mos"
        elif "ThreeToSix" in time_raw: 
            nb_mkt_time = "3-6 mos"
        elif "OverSix" in time_raw: 
            nb_mkt_time = "Over 6 mos"
        elif time_raw: 
            nb_mkt_time = time_raw

        # Present Land Use
        for plu in nb_elem.findall("_PRESENT_LAND_USE"):
            ptype = plu.attrib.get("_Type", "")
            ppercent = plu.attrib.get("_Percent", "").strip()
            pdesc = plu.attrib.get("_TypeOtherDescription", "").strip()
            pval = f"{ppercent}%" if ppercent else ""
            
            if ptype == "SingleFamily":
                one_unit = pval
            elif ptype == "TwoToFourFamily":
                two_four_unit = pval
            elif ptype == "Apartment" or "Multi" in ptype:
                multi_family = pval
            elif ptype == "Commercial":
                commercial = pval
            elif ptype == "Other":
                other_use = pval
                if pdesc:
                    other_land_use_desc = pdesc

        # Housing (high, low, pred)
        housing_elems = nb_elem.findall("_HOUSING")
        is_condo_form = "1073" in form_type or "CONDO" in form_type.upper()
        is_mf_form = "1025" in form_type
        target_types = ["Condominium"] if is_condo_form else (["TwoToFourFamily"] if is_mf_form else ["SingleFamily"])

        matching_elems = [h for h in housing_elems if h.attrib.get("_Type") in target_types]
        if not matching_elems and housing_elems:
            if is_condo_form:
                condo_elems = [h for h in housing_elems if "Condo" in h.attrib.get("_Type", "")]
                matching_elems = condo_elems if condo_elems else housing_elems
            else:
                matching_elems = housing_elems

        for h in matching_elems:
            if not h_low and h.attrib.get("_LowPriceAmount"):
                h_low = h.attrib.get("_LowPriceAmount", "").strip()
            if not h_high and h.attrib.get("_HighPriceAmount"):
                h_high = h.attrib.get("_HighPriceAmount", "").strip()
            if not h_pred and h.attrib.get("_PredominantPriceAmount"):
                h_pred = h.attrib.get("_PredominantPriceAmount", "").strip()
            if not h_newest and h.attrib.get("_NewestYearsCount"):
                h_newest = h.attrib.get("_NewestYearsCount", "").strip()
            if not h_oldest and h.attrib.get("_OldestYearsCount"):
                h_oldest = h.attrib.get("_OldestYearsCount", "").strip()
            if not h_pred_age and h.attrib.get("_PredominantAgeYearsCount"):
                h_pred_age = h.attrib.get("_PredominantAgeYearsCount", "").strip()

        if h_high and h_low and h_pred:
            housing_price = f"{h_high} / {h_low} / {h_pred}"
        elif h_high or h_low or h_pred:
            housing_price = f"{h_high or '0'} / {h_low or '0'} / {h_pred or '0'}"

        if h_oldest and h_newest and h_pred_age:
            housing_age = f"{h_oldest} / {h_newest} / {h_pred_age}"
        elif h_oldest or h_newest or h_pred_age:
            housing_age = f"{h_oldest or '0'} / {h_newest or '0'} / {h_pred_age or '0'}"

    # Contract
    is_refinance = "refinance" in purpose.lower()
    contract_price = ""
    contract_date = ""
    contract_comment = ""
    contract_data_source = ""
    seller_is_owner = ""
    concessions = ""
    concessions_amount = ""
    concessions_desc = ""
    concessions_text = ""
    invoice_comment = ""
    retailer_name = ""

    sales_contract = property_elem.find("SALES_CONTRACT") if property_elem is not None else None
    if sales_contract is None:
        sales_contract = root.find(".//SALES_CONTRACT")

    if sales_contract is not None:
        c_amt = sales_contract.attrib.get("_Amount", "")
        if c_amt:
            contract_price = _clean_currency(c_amt)

        c_date = sales_contract.attrib.get("_Date", "")
        if c_date:
            m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", c_date)
            if m:
                contract_date = f"{m.group(2)}/{m.group(3)}/{m.group(1)}"
            else:
                contract_date = c_date

        c_comment = sales_contract.attrib.get("_ReviewComment", "")
        rev_ind = sales_contract.attrib.get("_ReviewedIndicator", "").upper()
        if c_comment:
            if not is_refinance:
                comm_lower = c_comment.lower()
                if "did" not in comm_lower and "did not" not in comm_lower:
                    if rev_ind == "N":
                        c_comment = f"did not: {c_comment}"
                    else:
                        c_comment = f"did: {c_comment}"
            contract_comment = c_comment
        elif rev_ind == "Y":
            contract_comment = "did analyze the contract for sale"
        elif rev_ind == "N":
            contract_comment = "did not analyze the contract for sale"

        contract_data_source = sales_contract.attrib.get("DataSourceDescription", "")
        seller_owner_ind = sales_contract.attrib.get("SellerIsOwnerIndicator", "")
        if seller_owner_ind.upper() == "Y":
            seller_is_owner = "Yes"
        elif seller_owner_ind.upper() == "N":
            seller_is_owner = "No"
        elif seller_owner_ind:
            seller_is_owner = seller_owner_ind

        conc_ind = sales_contract.attrib.get("SalesConcessionIndicator", "")
        if conc_ind.upper() == "Y":
            concessions = "Yes"
        elif conc_ind.upper() == "N":
            concessions = "No"
        elif conc_ind:
            concessions = conc_ind

        concessions_amount = _clean_currency(sales_contract.attrib.get("SalesConcessionAmount", ""))
        concessions_desc = sales_contract.attrib.get("SalesConcessionDescription", "")
        if concessions_desc and concessions_amount and concessions_amount not in concessions_desc:
            concessions_text = f"${concessions_amount} {concessions_desc}".strip()
        elif concessions_desc:
            concessions_text = concessions_desc
        elif concessions_amount:
            concessions_text = f"${concessions_amount}"
        elif concessions == "No":
            concessions_text = "0"

        # Form 1004C Manufactured Home Contract Analysis & Retailer
        inv_rev_ind = sales_contract.attrib.get("_InvoiceReviewedIndicator", "").upper()
        inv_rev_comment = sales_contract.attrib.get("_InvoiceReviewComment", "")
        retailer_name = sales_contract.attrib.get("_RetailerName", "")
        if inv_rev_comment:
            comm_lower = inv_rev_comment.lower()
            if "did" not in comm_lower and "did not" not in comm_lower:
                if inv_rev_ind == "N":
                    invoice_comment = f"did not: {inv_rev_comment}"
                elif inv_rev_ind == "Y":
                    invoice_comment = f"did: {inv_rev_comment}"
                else:
                    invoice_comment = inv_rev_comment
            else:
                invoice_comment = inv_rev_comment
        elif inv_rev_ind == "Y":
            invoice_comment = "did analyze the manufacturer's invoice"
        elif inv_rev_ind == "N":
            invoice_comment = "did not analyze the manufacturer's invoice"



    # Valuation / Reconciliation
    appraised_val = ""
    effective_date = ""
    if valuation is not None:
        appraised_val = _clean_currency(valuation.attrib.get("PropertyAppraisedValueAmount", ""))
        effective_date = _format_date(valuation.attrib.get("AppraisalEffectiveDate", ""))

    sales_comp_ind_val = ""
    sales_comp_comment = ""
    income_ind_val = ""
    income_grm = ""
    income_rent = ""
    cost_land_val = ""
    cost_total_cost = ""

    cost_elem = None
    sales_comp_elem = None
    income_elem = None
    if val_methods is not None:
        sales_comp_elem = val_methods.find("SALES_COMPARISON")
        if sales_comp_elem is not None:
            sales_comp_ind_val = _clean_currency(sales_comp_elem.attrib.get("ValueIndicatedBySalesComparisonApproachAmount", ""))
            sales_comp_comment = sales_comp_elem.attrib.get("_Comment", "")

        income_elem = val_methods.find("INCOME_ANALYSIS")
        cost_elem = val_methods.find("COST_ANALYSIS")

    if income_elem is None:
        income_elem = root.find(".//INCOME_ANALYSIS")

    if income_elem is not None:
        raw_ind_inc = income_elem.attrib.get("ValueIndicatedByIncomeApproachAmount", "")
        if raw_ind_inc and raw_ind_inc != "0":
            income_ind_val = _clean_currency(raw_ind_inc)
        elif raw_ind_inc == "0":
            income_ind_val = "0"

        raw_grm = income_elem.attrib.get("GrossRentMultiplierFactor", "")
        if raw_grm and raw_grm not in ["0", "00"]:
            income_grm = raw_grm

        raw_rent = income_elem.attrib.get("EstimatedMarketMonthlyRentAmount", "")
        if raw_rent and raw_rent != "0":
            income_rent = _clean_currency(raw_rent)

    if cost_elem is None:
        cost_elem = root.find(".//COST_ANALYSIS")

    cost_type = ""
    cost_data_source = ""
    cost_quality_rating = ""
    cost_effective_date = ""
    cost_comment = ""
    cost_site_comment = ""
    cost_economic_life = ""
    cost_site_val = ""
    cost_total_new = ""
    cost_depreciated = ""
    cost_site_as_is = ""
    cost_indicated_val = ""
    dwelling_cost = ""
    basement_cost = ""
    deck_cost = ""
    garage_cost = ""
    amenities_cost = ""
    depreciation_cost = ""
    deprec_phys_pct = ""
    deprec_func_pct = ""
    deprec_ext_pct = ""
    gla_sqft_cost = ""
    price_per_sqft_cost = ""
    cost_subtotal = ""
    cost_multiplier = ""
    cost_modified_subtotal = ""
    cost_delivery_setup = ""
    cost_other_site_imp = ""
    sections_1004c = {
        "SectionOne": {"sqft": "", "rate": "", "cost": "", "width": "", "length": "", "area": ""},
        "SectionTwo": {"sqft": "", "rate": "", "cost": "", "width": "", "length": "", "area": ""},
        "SectionThree": {"sqft": "", "rate": "", "cost": "", "width": "", "length": "", "area": ""},
        "SectionFour": {"sqft": "", "rate": "", "cost": "", "width": "", "length": "", "area": ""},
    }
    additional_improvements_1004c = []
    nada_month = ""
    nada_year = ""
    nada_state = ""
    nada_region = ""
    nada_width = ""
    nada_length = ""
    nada_grey_pg = ""
    nada_white_pg = ""
    nada_black_pg = ""
    nada_conversion_pg = ""
    nada_yellow_pg = ""
    nada_comment = ""
    deprec_phys_amt = ""
    deprec_func_amt = ""
    deprec_ext_amt = ""

    if cost_elem is not None:
        cost_type = cost_elem.attrib.get("_Type", "")
        cost_data_source = cost_elem.attrib.get("DataSourceDescription", "")
        cost_quality_rating = cost_elem.attrib.get("CostServiceQualityRatingDescription", "")
        raw_eff_date = cost_elem.attrib.get("DataSourceEffectiveDate", "")
        if raw_eff_date:
            m_cd = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", raw_eff_date)
            cost_effective_date = f"{m_cd.group(2)}/{m_cd.group(3)}/{m_cd.group(1)}" if m_cd else raw_eff_date
        cost_comment = cost_elem.attrib.get("_Comment", "")
        cost_site_comment = cost_elem.attrib.get("SiteEstimatedValueComment", "")
        cost_economic_life = cost_elem.attrib.get("EstimatedRemainingEconomicLifeYearsCount", "")
        cost_site_val = _clean_currency(cost_elem.attrib.get("SiteEstimatedValueAmount", ""))
        cost_total_new = _clean_currency(cost_elem.attrib.get("NewImprovementTotalCostAmount", ""))
        cost_depreciated = _clean_currency(cost_elem.attrib.get("NewImprovementDepreciatedCostAmount", ""))
        cost_site_as_is = _clean_currency(cost_elem.attrib.get("SiteOtherImprovementsAsIsAmount", ""))
        cost_ind_raw = cost_elem.attrib.get("ValueIndicatedByCostApproachAmount", "")
        if cost_ind_raw and cost_ind_raw != "0":
            cost_indicated_val = _clean_currency(cost_ind_raw)
        elif cost_ind_raw == "0":
            cost_indicated_val = "0"

        cost_subtotal = _clean_currency(cost_elem.attrib.get("NewImprovementTotalCostAmount", ""))
        cost_multiplier = cost_elem.attrib.get("NewImprovementCostMultiplierFactor", "")
        cost_modified_subtotal = _clean_currency(cost_elem.attrib.get("NewImprovementCostLocalizedAmount", "")) or cost_subtotal
        cost_delivery_setup = _clean_currency(cost_elem.attrib.get("ManufacturedHomeInstallationCostAmount", ""))
        cost_other_site_imp = _clean_currency(cost_elem.attrib.get("SiteOtherImprovementsAsIsAmount", ""))

        sections_1004c = {
            "SectionOne": {"sqft": "", "rate": "", "cost": "", "width": "", "length": "", "area": ""},
            "SectionTwo": {"sqft": "", "rate": "", "cost": "", "width": "", "length": "", "area": ""},
            "SectionThree": {"sqft": "", "rate": "", "cost": "", "width": "", "length": "", "area": ""},
            "SectionFour": {"sqft": "", "rate": "", "cost": "", "width": "", "length": "", "area": ""},
        }
        additional_improvements_1004c = []

        for imp in cost_elem.findall("NEW_IMPROVEMENT"):
            itype = imp.attrib.get("_Type", "")
            iamt = _clean_currency(imp.attrib.get("_CostAmount", ""))
            isqft = imp.attrib.get("SquareFeetCount", "")
            ippsf = imp.attrib.get("PricePerSquareFootAmount", "")
            idesc = imp.attrib.get("_CostDescription", "") or imp.attrib.get("_TypeOtherDescription", "")

            if itype in sections_1004c:
                sections_1004c[itype]["sqft"] = isqft
                sections_1004c[itype]["rate"] = ippsf
                sections_1004c[itype]["cost"] = iamt
            elif itype == "Additional" or (idesc and itype not in ["Dwelling", "Garage", "Basement", "Deck"]):
                additional_improvements_1004c.append({
                    "description": idesc,
                    "cost": iamt
                })

            if itype in ["Dwelling", "SectionOne"] and not dwelling_cost:
                dwelling_cost = iamt
                if isqft: gla_sqft_cost = isqft
                if ippsf: price_per_sqft_cost = ippsf
            elif "Garage" in itype or "Carport" in itype:
                if not garage_cost: garage_cost = iamt
            elif "Basement" in itype or "Bsmt" in idesc:
                if not basement_cost: basement_cost = iamt
            elif "Deck" in itype or "Porch" in itype or "Patio" in itype:
                if not deck_cost: deck_cost = iamt
            elif "Additional" in itype or "Amenities" in idesc:
                if not amenities_cost: amenities_cost = iamt
                if not deck_cost and any(k in idesc.lower() for k in ["porch", "deck", "patio"]):
                    deck_cost = iamt

        # Section dimensions from MANUFACTURED_HOME
        mh_elem = root.find(".//MANUFACTURED_HOME")
        if mh_elem is not None:
            for s_elem in mh_elem.findall("_SECTION"):
                stype = s_elem.attrib.get("_Type", "")
                if stype in sections_1004c:
                    sections_1004c[stype]["width"] = s_elem.attrib.get("WidthFeetCount", "")
                    sections_1004c[stype]["length"] = s_elem.attrib.get("DepthFeetCount", "")
                    sections_1004c[stype]["area"] = s_elem.attrib.get("SquareFeetCount", "")

        # NADA / Data Identification
        data_ident = cost_elem.find("DATA_IDENTIFICATION")
        nada_month = ""
        nada_year = ""
        nada_state = ""
        nada_region = ""
        nada_width = ""
        nada_length = ""
        nada_grey_pg = ""
        nada_white_pg = ""
        nada_black_pg = ""
        nada_conversion_pg = ""
        nada_yellow_pg = ""
        nada_comment = ""
        if data_ident is not None:
            nada_month = data_ident.attrib.get("NADAManufacturedHousingGuideEditionMonth", "")
            nada_year = data_ident.attrib.get("NADAManufacturedHousingGuideEditionYear", "")
            nada_state = data_ident.attrib.get("ManufacturedHomeBuiltState", "")
            nada_region = data_ident.attrib.get("ManufacturedHomeRegionIdentifier", "")
            nada_width = data_ident.attrib.get("WidthFeetCount", "")
            nada_length = data_ident.attrib.get("LengthFeetCount", "")
            nada_grey_pg = data_ident.attrib.get("NADAManufacturedHousingGuideGreyPageIdentifier", "")
            nada_white_pg = data_ident.attrib.get("NADAManufacturedHousingGuideWhitePageIdentifier", "")
            nada_black_pg = data_ident.attrib.get("NADAManufacturedHousingGuideBlackPageIdentifier", "")
            nada_conversion_pg = data_ident.attrib.get("NADAManufacturedHousingGuideConversionChartPageIdentifier", "")
            nada_yellow_pg = data_ident.attrib.get("NADAManufacturedHousingGuideYellowPageIdentifier", "")
            nada_comment = data_ident.attrib.get("ManufacturedHomeCostDataComment", "")

        deprec_elem = cost_elem.find("DEPRECIATION")
        deprec_phys_amt = ""
        deprec_func_amt = ""
        deprec_ext_amt = ""
        if deprec_elem is not None:
            deprec_tot = _clean_currency(deprec_elem.attrib.get("_TotalAmount", ""))
            deprec_phys = _clean_currency(deprec_elem.attrib.get("_PhysicalAmount", ""))
            deprec_phys_pct = deprec_elem.attrib.get("_PhysicalPercent", "")
            deprec_func_pct = deprec_elem.attrib.get("_FunctionalPercent", "")
            deprec_ext_pct = deprec_elem.attrib.get("_ExteriorPercent", "")
            deprec_func_amt = _clean_currency(deprec_elem.attrib.get("_FunctionalAmount", ""))
            deprec_ext_amt = _clean_currency(deprec_elem.attrib.get("_ExteriorAmount", ""))
            deprec_phys_amt = deprec_phys
            depreciation_cost = deprec_tot or deprec_phys

    cost_land_val = cost_site_val
    cost_total_cost = cost_total_new

    # Research and Information of Sales
    research_elem = root.find(".//RESEARCH")
    list_cnt = ""
    list_low = ""
    list_high = ""
    sale_cnt = ""
    sale_low = ""
    sale_high = ""
    res_did = ""
    res_comment = ""
    subj_prior_did = ""
    subj_prior_src = ""
    comp_prior_did = ""
    comp_prior_src = ""

    if research_elem is not None:
        list_cnt = research_elem.attrib.get("ComparableListingsResearchedCount", "").strip()
        list_low = research_elem.attrib.get("ComparableListingsPriceRangeLowAmount", "").strip()
        list_high = research_elem.attrib.get("ComparableListingsPriceRangeHighAmount", "").strip()
        sale_cnt = research_elem.attrib.get("ComparableSalesResearchedCount", "").strip()
        sale_low = research_elem.attrib.get("ComparableSalesPriceRangeLowAmount", "").strip()
        sale_high = research_elem.attrib.get("ComparableSalesPriceRangeHighAmount", "").strip()

        res_ind = research_elem.attrib.get("SalesHistoryResearchedIndicator", "").upper()
        res_did = "did" if res_ind == "Y" else ("did not" if res_ind == "N" else res_ind)
        res_comment = research_elem.attrib.get("SalesHistoryNotResearchedComment", "").strip()

        subj_res = research_elem.find("SUBJECT")
        if subj_res is not None:
            s_prior = subj_res.attrib.get("_HasPriorSalesIndicator", "").upper()
            subj_prior_did = "did" if s_prior == "Y" else ("did not" if s_prior == "N" else s_prior)
            subj_prior_src = subj_res.attrib.get("DataSourceDescription", "").strip()

        comp_res = research_elem.find("COMPARABLE")
        if comp_res is not None:
            c_prior = comp_res.attrib.get("_HasPriorSalesIndicator", "").upper()
            comp_prior_did = "did" if c_prior == "Y" else ("did not" if c_prior == "N" else c_prior)
            comp_prior_src = comp_res.attrib.get("DataSourceDescription", "").strip()

    prior_anal_comment = ""
    if sales_comp_elem is not None:
        prior_anal_comment = (
            sales_comp_elem.attrib.get("_PriorSalesAnalysisComment", "").strip() or
            sales_comp_elem.attrib.get("_ResearchAnalysisComment", "").strip() or
            sales_comp_elem.attrib.get("_CurrentSalesAgreementAnalysisComment", "").strip() or
            sales_comp_elem.attrib.get("SalesHistoryAnalysisComment", "").strip() or
            ""
        )
    if not prior_anal_comment and research_elem is not None:
        prior_anal_comment = (
            research_elem.attrib.get("_PriorSalesAnalysisComment", "").strip() or
            research_elem.attrib.get("_ResearchAnalysisComment", "").strip() or
            research_elem.attrib.get("SalesHistoryAnalysisComment", "").strip() or
            research_elem.attrib.get("_Comment", "").strip() or
            ""
        )
    if not prior_anal_comment:
        for ps_elem in (root.findall(".//PRIOR_SALE") + root.findall(".//PRIOR_SALES") + root.findall(".//{*}PRIOR_SALE") + root.findall(".//{*}PRIOR_SALES")):
            c = (
                ps_elem.attrib.get("GSEPriorSaleComment", "").strip() or
                ps_elem.attrib.get("_Comment", "").strip() or
                ps_elem.attrib.get("AnalysisComment", "").strip() or
                ps_elem.attrib.get("_PriorSalesAnalysisComment", "").strip() or
                ps_elem.attrib.get("_AnalysisDescription", "").strip() or
                ""
            )
            if c:
                prior_anal_comment = c
                break
    if not prior_anal_comment:
        for ra_elem in (root.findall(".//RESEARCH_ANALYSIS") + root.findall(".//{*}RESEARCH_ANALYSIS")):
            c = (
                ra_elem.attrib.get("_PriorSalesAnalysisComment", "").strip() or
                ra_elem.attrib.get("_ResearchAnalysisComment", "").strip() or
                ra_elem.attrib.get("SalesHistoryAnalysisComment", "").strip() or
                ra_elem.attrib.get("_Comment", "").strip() or
                ""
            )
            if c:
                prior_anal_comment = c
                break

    offered_str = ""
    if list_cnt or list_low or list_high:
        cnt_part = list_cnt if list_cnt else "____"
        low_part = f"${_clean_currency(list_low)}" if list_low else "$___"
        high_part = f"${_clean_currency(list_high)}" if list_high else "$___"
        offered_str = f"There are {cnt_part} comparable properties currently offered for sale in the subject neighborhood ranging in price from {low_part} to {high_part}"

    sales_str = ""
    if sale_cnt or sale_low or sale_high:
        cnt_part = sale_cnt if sale_cnt else "___"
        low_part = f"${_clean_currency(sale_low)}" if sale_low else "$___"
        high_part = f"${_clean_currency(sale_high)}" if sale_high else "$____"
        sales_str = f"There are {cnt_part} comparable sales in the subject neighborhood within the past twelve months ranging in sale price from {low_part} to {high_part}"

    info_of_sales_section = {
        "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from$ ___to $___": offered_str,
        "There are ___comparable sales in the subject neighborhoodwithin the past twelvemonths ranging in sale price from$___ to $____": sales_str,
        "THERE ARE ____ COMPARABLE PROPERTIES CURRENTLY OFFERED FOR SALE IN THE SUBJECT NEIGHBORHOOD RANGING IN PRICE FROM $ ___ TO $ ___": offered_str,
        "THERE ARE ___COMPARABLE SALES IN THE SUBJECT NEIGHBORHOODWITHIN THE PAST TWELVEMONTHS RANGING IN SALE PRICE FROM$___ TO $____": sales_str,
        "THERE ARE ___ COMPARABLE SALES IN THE SUBJECT NEIGHBORHOOD WITHIN THE PAST TWELVE MONTHS RANGING IN SALE PRICE FROM $ ___ TO $ ____": sales_str,
        "Comparable Properties Currently Offered for Sale": offered_str,
        "Comparable Sales in the Subject Neighborhood within the Past Twelve Months": sales_str,
        "I did did not research the sale or transfer history of the subject property and comparable sales. If not, explain": res_comment if res_did == "did not" and res_comment else res_did,
        "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.": subj_prior_did,
        "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal": subj_prior_did,
        "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal": subj_prior_did,
        "Data Source(s) for subject property research": subj_prior_src,
        "Data source(s) for subject property research": subj_prior_src,
        "Prior Sale History: Data source(s) for subject": subj_prior_src,
        "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.": comp_prior_did,
        "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale": comp_prior_did,
        "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale": comp_prior_did,
        "Data Source(s) for comparable sales research": comp_prior_src,
        "Data source(s) for comparable sales research": comp_prior_src,
        "Prior Sale History: Data source(s) for comparables": comp_prior_src,
        "Analysis of prior sale or transfer history of the subject property and comparable sales": prior_anal_comment,
        "Summary of Sales Comparison Approach": sales_comp_comment,
        "Summary of Sales Comparison Approach.": sales_comp_comment,
        "Indicated Value by Sales Comparison Approach $": sales_comp_ind_val,
        "Indicated Value by Sales Comparison Approach": sales_comp_ind_val,
        "Indicated Value by: Sales Comparison Approach $": sales_comp_ind_val,
    }

    m_eff_yr = re.search(r'\b(19\d\d|20\d\d)\b', effective_date)
    eff_year = int(m_eff_yr.group(1)) if m_eff_yr else 2026

    # Sales Grid: Extract Comps and Adjustments
    comps_dict = {}
    sales_grid = {}
    adjustments_subject = {}
    subj_project_name = ""
    subj_project_phase = ""
    subj_project_name_phase = ""
    subj_unit_id = unit_id
    custom_sales_grid_definitions = []
    if val_methods is not None:
        comp_elems = val_methods.findall(".//COMPARABLE_SALE")

        # 1. Discover custom features defined on Subject (PropertySequenceIdentifier == "0" or first)
        subj_comp_elem = None
        for c in comp_elems:
            if c.attrib.get("PropertySequenceIdentifier", "0") == "0":
                subj_comp_elem = c
                break
        if subj_comp_elem is None and comp_elems:
            subj_comp_elem = comp_elems[0]

        if subj_comp_elem is not None:
            c_seq_idx = 1
            for adj in subj_comp_elem.findall("SALE_PRICE_ADJUSTMENT"):
                atype = adj.attrib.get("_Type", "")
                aother = adj.attrib.get("_TypeOtherDescription", "")
                adesc = adj.attrib.get("_Description", "")
                # Skip bedroom/bath line indicators
                if aother in ["RoomAboveGradeLine1", "RoomAboveGradeLine2", "RoomAboveGrade1", "RoomAboveGrade2"]:
                    continue
                if atype == "Other" or atype in ["Fireplace", "Fence", "Pool", "WoodStove", "Woodstove", "ADU", "Outbuildings"]:
                    lbl = aother or atype
                    if lbl and not any(d["label"] == lbl for d in custom_sales_grid_definitions):
                        custom_sales_grid_definitions.append({
                            "label": lbl,
                            "type": atype,
                            "type_other": aother,
                            "seq": str(c_seq_idx),
                            "subj_desc": adesc,
                        })
                        c_seq_idx += 1

            for ofa in subj_comp_elem.findall("OTHER_FEATURE_ADJUSTMENT"):
                p_seq = ofa.attrib.get("PropertyFeatureSequenceIdentifier", "")
                p_desc = ofa.attrib.get("PropertyFeatureDescription", "")
                if p_seq and not any(r["seq"] == p_seq for r in custom_sales_grid_definitions):
                    custom_sales_grid_definitions.append({
                        "label": f"Other Feature {p_seq}",
                        "type": "Other",
                        "type_other": "",
                        "seq": p_seq,
                        "subj_desc": p_desc,
                    })

        # Also discover any OTHER_FEATURE_ADJUSTMENT sequence IDs present on any comp that wasn't on Subject
        for c in comp_elems:
            for ofa in c.findall("OTHER_FEATURE_ADJUSTMENT"):
                p_seq = ofa.attrib.get("PropertyFeatureSequenceIdentifier", "")
                if p_seq and not any(r["seq"] == p_seq for r in custom_sales_grid_definitions):
                    custom_sales_grid_definitions.append({
                        "label": f"Other Feature {p_seq}",
                        "type": "Other",
                        "type_other": "",
                        "seq": p_seq,
                        "subj_desc": "",
                    })

        for comp in comp_elems:
            seq = comp.attrib.get("PropertySequenceIdentifier", "0")
            sale_price = _clean_currency(comp.attrib.get("PropertySalesAmount", ""))
            adj_price = _clean_currency(comp.attrib.get("AdjustedSalesPriceAmount", ""))
            raw_net_amt = comp.attrib.get("SalePriceTotalAdjustmentAmount", "")
            net_adj_str = _clean_currency(raw_net_amt)
            net_pct = comp.attrib.get("SalePriceTotalAdjustmentNetPercent", "")
            gross_pct = comp.attrib.get("SalesPriceTotalAdjustmentGrossPercent", "")
            if not net_adj_str and net_pct:
                net_adj_str = f"{net_pct}%"

            data_src = comp.attrib.get("DataSourceDescription", "")
            verif_src = comp.attrib.get("DataSourceVerificationDescription", "")
            rent = _clean_currency(comp.attrib.get("MonthlyRentAmount", ""))
            grm = comp.attrib.get("GrossMonthlyRentMultiplierFactor", "")

            price_per_unit = _clean_currency(comp.attrib.get("SalesPricePerUnitAmount", ""))
            price_per_room = _clean_currency(comp.attrib.get("SalesPricePerRoomAmount", ""))
            price_per_bdrm = _clean_currency(comp.attrib.get("SalesPricePerBedroomAmount", ""))
            rent_control = comp.attrib.get("RentControlStatusType", "")
            adj_price_unit = _clean_currency(comp.attrib.get("AdjustedSalesPricePerUnitAmount", ""))
            adj_price_room = _clean_currency(comp.attrib.get("AdjustedSalesPricePerRoomAmount", ""))
            adj_price_bdrm = _clean_currency(comp.attrib.get("AdjustedSalesPricePerBedroomAmount", ""))

            comp_loc = comp.find("LOCATION")
            c_addr_street = comp_loc.attrib.get("PropertyStreetAddress", "") if comp_loc is not None else ""
            c_addr_csz = comp_loc.attrib.get("PropertyStreetAddress2", "") if comp_loc is not None else ""
            # Strip leading dash-only unit placeholders from PropertyStreetAddress2 (e.g. "-, Ladera Ranch, CA 92694" -> "Ladera Ranch, CA 92694")
            if c_addr_csz:
                c_addr_csz = re.sub(r'^-\s*,\s*', '', c_addr_csz).strip()
                c_addr_csz = re.sub(r'^,\s*', '', c_addr_csz).strip()
            c_city = comp_loc.attrib.get("PropertyCity", "") or comp_loc.attrib.get("_City", "") if comp_loc is not None else ""
            if not c_city and c_addr_csz:
                parts_csz = [p.strip() for p in c_addr_csz.split(",") if p.strip()]
                if parts_csz:
                    c_city = parts_csz[0]
            c_addr = f"{c_addr_street}, {c_addr_csz}".strip(", ") if (c_addr_street and c_addr_csz) else (c_addr_street or c_addr_csz)
            # Remove double-comma artifacts (e.g. "4 Potters Bnd, , Ladera Ranch")
            c_addr = re.sub(r',\s*,', ',', c_addr).strip(", ")
            c_prox = comp_loc.attrib.get("ProximityToSubjectDescription", "") if comp_loc is not None else ""

            # Extract Unit # and Project Name / Phase
            c_unit = (comp_loc.attrib.get("UnitIdentifier", "") or comp_loc.attrib.get("_UnitIdentifier", "")) if comp_loc is not None else ""
            # Ignore dash-only or empty unit identifiers (e.g. "-" means no unit)
            if c_unit and re.match(r'^[-\s]+$', c_unit):
                c_unit = ""
            if not c_unit and seq == "0":
                c_unit = unit_id
            if not c_unit and c_addr_csz:
                parts_csz = [p.strip() for p in c_addr_csz.split(",") if p.strip()]
                if parts_csz and len(parts_csz) >= 2:
                    first_part = parts_csz[0]
                    if re.match(r"^(?:unit\s*#?|apt\s*#?|ste\s*#?|#)?\s*[a-zA-Z0-9\-]+$", first_part, re.I) and not any(k in first_part.lower() for k in ["phoenix", "street", "ave", "road", "dr", "blvd", "way", "court", "lane", "circle", "trail"]):
                        if not (c_city and first_part.lower() == c_city.lower()):
                            c_unit = first_part

            c_proj_name = comp.attrib.get("ProjectName", "") or comp.attrib.get("_ProjectName", "")
            c_proj_phase = comp.attrib.get("ProjectPhaseIdentifier", "") or comp.attrib.get("_ProjectPhaseIdentifier", "") or comp.attrib.get("Phase", "") or comp.attrib.get("_PhaseIdentifier", "")
            if seq == "0":
                if not c_proj_name:
                    subj_proj = root.find(".//SUBJECT_PROJECT")
                    if subj_proj is not None:
                        c_proj_name = subj_proj.attrib.get("ProjectName", "")
                proj_elem = proj if ('proj' in locals() and proj is not None) else (
                    (property_elem.find("PROJECT") if ('property_elem' in locals() and property_elem is not None) else None) or
                    (root.find(".//PROJECT") if root is not None else None)
                )
                if not c_proj_name and proj_elem is not None:
                    c_proj_name = proj_elem.attrib.get("_Name", "") or proj_elem.attrib.get("ProjectName", "")
                if not c_proj_phase and proj_elem is not None:
                    c_proj_phase = proj_elem.attrib.get("_PhaseIdentifier", "") or proj_elem.attrib.get("PhaseIdentifier", "") or proj_elem.attrib.get("ProjectPhaseIdentifier", "")
            if not c_proj_name:
                comp_proj = comp.find("PROJECT") or comp.find("SUBJECT_PROJECT")
                if comp_proj is not None:
                    c_proj_name = comp_proj.attrib.get("ProjectName", "") or comp_proj.attrib.get("_Name", "")
                    if not c_proj_phase:
                        c_proj_phase = comp_proj.attrib.get("ProjectPhaseIdentifier", "") or comp_proj.attrib.get("_PhaseIdentifier", "")

            if c_proj_name and c_proj_phase:
                c_proj_name_phase = f"{c_proj_name}\n{c_proj_phase}".strip()
            else:
                c_proj_name_phase = c_proj_name or c_proj_phase or ""

            if seq == "0":
                subj_project_name = c_proj_name
                subj_project_phase = c_proj_phase
                subj_project_name_phase = c_proj_name_phase
                if c_unit:
                    subj_unit_id = c_unit

            # Extract child adjustments
            adjustments = {}
            line1_adj = ""
            line2_adj = ""
            line1_found = False
            line2_found = False
            for adj in comp.findall("SALE_PRICE_ADJUSTMENT"):
                atype = adj.attrib.get("_Type", "")
                adesc = adj.attrib.get("_Description", "")
                aamt = _clean_currency(adj.attrib.get("_Amount", ""))
                adj_other_desc = adj.attrib.get("_TypeOtherDescription", "")

                # Line 1 (Bedrooms Adjustment) and Line 2 (Baths Adjustment) in MISMO XML
                if adj_other_desc in ["RoomAboveGradeLine1", "RoomAboveGrade1"] or atype == "Bedroom" or "bedroom" in adj_other_desc.lower():
                    line1_adj = aamt
                    line1_found = True
                elif adj_other_desc in ["RoomAboveGradeLine2", "RoomAboveGrade2"] or atype == "Bathroom" or "bath" in adj_other_desc.lower():
                    line2_adj = aamt
                    line2_found = True

                adj_key = f"{atype}_{adj_other_desc}" if (atype == "Other" and adj_other_desc) else atype
                adjustments[adj_key] = {"desc": adesc, "amount": aamt}
                if atype not in adjustments or not adjustments[atype].get("amount"):
                    if atype != "Other" or adj_other_desc not in ["RoomAboveGradeLine1", "RoomAboveGradeLine2"]:
                        adjustments[atype] = {"desc": adesc, "amount": aamt}

            if seq == "0":
                adjustments_subject = adjustments

            # Concessions
            sc_desc = adjustments.get("SalesConcessions", {}).get("desc", "")
            fc_desc = adjustments.get("FinancingConcessions", {}).get("desc", "")
            sc_amt = adjustments.get("SalesConcessions", {}).get("amount", "")
            fc_amt = adjustments.get("FinancingConcessions", {}).get("amount", "")
            if sc_desc and fc_desc:
                concessions_desc = f"{sc_desc}; {fc_desc}"
            else:
                concessions_desc = sc_desc or fc_desc
            if seq == "0" and not concessions_desc:
                concessions_desc = concessions or "None"
            concessions_amt = fc_amt or sc_amt

            # Rooms & Unit Breakdown
            total_unit_rooms = 0
            total_unit_bed = 0
            total_unit_bath = 0
            c_rooms = ""
            c_bed = ""
            c_bath = ""
            clean_room_adj = ""
            clean_bath_adj = ""
            unit_breakdown = {}

            for r_elem in comp.findall("ROOM_ADJUSTMENT"):
                u_id = r_elem.attrib.get("UnitSequenceIdentifier", "")
                u_tot = r_elem.attrib.get("TotalRoomCount", "")
                u_br = r_elem.attrib.get("TotalBedroomCount", "")
                u_ba = r_elem.attrib.get("TotalBathroomCount", "")
                u_adj = _clean_currency(r_elem.attrib.get("RoomAdjustmentAmount", ""))
                u_ba_adj = _clean_currency(r_elem.attrib.get("BathroomAdjustmentAmount", ""))
                if u_id:
                    unit_breakdown[f"Unit Breakdown Tot Unit # {u_id}"] = u_tot
                    unit_breakdown[f"Unit Breakdown Br Unit # {u_id}"] = u_br
                    unit_breakdown[f"Unit Breakdown Ba Unit # {u_id}"] = u_ba
                    unit_breakdown[f"Unit Breakdown Adjustment Unit # {u_id}"] = u_adj
                    if u_tot.isdigit(): total_unit_rooms += int(u_tot)
                    if u_br.isdigit(): total_unit_bed += int(u_br)
                    try:
                        if u_ba: total_unit_bath += float(u_ba)
                    except ValueError:
                        pass
                else:
                    c_rooms = u_tot
                    c_bed = u_br
                    c_bath = u_ba
                    clean_room_adj = u_adj
                    clean_bath_adj = u_ba_adj

            if not c_rooms and total_unit_rooms > 0:
                c_rooms = str(total_unit_rooms)
            if not c_bed and total_unit_bed > 0:
                c_bed = str(total_unit_bed)
            if not c_bath and total_unit_bath > 0:
                c_bath = f"{int(total_unit_bath)}" if total_unit_bath.is_integer() else f"{total_unit_bath}"

            if seq == "0":
                c_rooms = c_rooms or total_rooms
                c_bed = c_bed or bedrooms
                c_bath = c_bath or baths

            # Intelligently assign bedroom and bath adjustments
            c_b_num = float(c_bed) if c_bed and c_bed.replace(".", "").isdigit() else None
            s_b_num = float(bedrooms) if bedrooms and bedrooms.replace(".", "").isdigit() else None
            c_ba_num = float(c_bath) if c_bath and c_bath.replace(".", "").isdigit() else None
            s_ba_num = float(baths) if baths and baths.replace(".", "").isdigit() else None

            bed_same = (c_b_num is not None and s_b_num is not None and c_b_num == s_b_num)
            bath_same = (c_ba_num is not None and s_ba_num is not None and c_ba_num == s_ba_num)

            bed_adj = ""
            bath_adj = ""

            if line1_found or line2_found:
                bed_adj = line1_adj
                bath_adj = line2_adj
            elif clean_bath_adj and clean_room_adj:
                if bed_same:
                    bed_adj = ""
                    bath_adj = clean_bath_adj or clean_room_adj
                elif bath_same:
                    bath_adj = ""
                    bed_adj = clean_room_adj or clean_bath_adj
                else:
                    bed_adj = clean_room_adj
                    bath_adj = clean_bath_adj
            else:
                adj_val = clean_room_adj or clean_bath_adj
                if adj_val:
                    parts = [p.strip() for p in re.split(r'[/;\n]+', adj_val) if p.strip()]
                    if len(parts) >= 2:
                        bed_adj = parts[0]
                        bath_adj = parts[1]
                    else:
                        bed_differs = c_b_num is not None and s_b_num is not None and c_b_num != s_b_num
                        bath_differs = c_ba_num is not None and s_ba_num is not None and c_ba_num != s_ba_num

                        if bed_differs and not bath_differs:
                            bed_adj = adj_val
                        elif bath_differs and not bed_differs:
                            bath_adj = adj_val
                        elif bed_differs and bath_differs:
                            adj_num = 0.0
                            try:
                                adj_num = float(re.sub(r"[^\d.-]", "", adj_val.replace("+", "")))
                            except ValueError:
                                pass
                            bed_exp_pos = (c_b_num < s_b_num)
                            bath_exp_pos = (c_ba_num < s_ba_num)

                            if adj_num > 0 and bed_exp_pos and not bath_exp_pos:
                                bed_adj = adj_val
                            elif adj_num < 0 and not bed_exp_pos and bath_exp_pos:
                                bed_adj = adj_val
                            elif adj_num > 0 and bath_exp_pos and not bed_exp_pos:
                                bath_adj = adj_val
                            elif adj_num < 0 and not bath_exp_pos and bed_exp_pos:
                                bath_adj = adj_val
                            else:
                                bath_adj = adj_val
                        else:
                            bath_adj = adj_val

            # Consistency check: cannot have adjustment if count is identical
            if bed_same and bed_adj and not line1_found:
                if not bath_adj:
                    bath_adj = bed_adj
                bed_adj = ""

            if bath_same and bath_adj and not line2_found:
                if not bed_adj:
                    bed_adj = bath_adj
                bath_adj = ""

            # Overall room adjustment
            c_room_adj = ""
            if bed_adj and bath_adj:
                try:
                    b_val = float(re.sub(r"[^\d.-]", "", bed_adj.replace("+", "")))
                    ba_val = float(re.sub(r"[^\d.-]", "", bath_adj.replace("+", "")))
                    tot_val = b_val + ba_val
                    c_room_adj = f"{int(tot_val):,}" if tot_val.is_integer() else f"{tot_val:,.2f}"
                except Exception:
                    c_room_adj = f"{bed_adj}; {bath_adj}"
            elif bed_adj:
                c_room_adj = bed_adj
            elif bath_adj:
                c_room_adj = bath_adj
            else:
                c_room_adj = clean_room_adj or clean_bath_adj or line1_adj or line2_adj

            # GLA vs GBA
            gla_desc = adjustments.get("GrossLivingArea", {}).get("desc", gba if seq == "0" else "")
            gla_amt = adjustments.get("GrossLivingArea", {}).get("amount", "")
            gba_desc = adjustments.get("GrossBuildingArea", {}).get("desc", gba if seq == "0" else "")
            gba_amt = adjustments.get("GrossBuildingArea", {}).get("amount", "")

            # Basement
            bm_desc = _clean_basement_area(adjustments.get("BasementArea", {}).get("desc", ""))
            bm_fin_desc = _clean_basement_rooms(adjustments.get("BasementFinish", {}).get("desc", ""))
            bm_amt = adjustments.get("BasementArea", {}).get("amount", "") or adjustments.get("BasementFinish", {}).get("amount", "")
            full_bm_desc = f"{bm_desc} {bm_fin_desc}".strip() or bm_desc or bm_fin_desc

            # Parking
            car_desc = adjustments.get("CarStorage", {}).get("desc", "") or adjustments.get("Parking", {}).get("desc", "")
            car_amt = adjustments.get("CarStorage", {}).get("amount", "") or adjustments.get("Parking", {}).get("amount", "")

            # Age
            age_desc = adjustments.get("Age", {}).get("desc", "")
            if not age_desc and seq == "0":
                age_desc = effective_age or (str(eff_year - int(year_built)) if year_built.isdigit() else "")

            # Prior Sales for Comp
            ps_elem = comp.find("PRIOR_SALES")
            ps_date = ps_elem.attrib.get("PropertySalesDate", "") if ps_elem is not None else ""
            if ps_date:
                m_d = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", ps_date)
                if m_d:
                    ps_date = f"{m_d.group(2)}/{m_d.group(3)}/{m_d.group(1)}"
            ps_price = _clean_currency(ps_elem.attrib.get("PropertySalesAmount", "")) if ps_elem is not None else ""
            ps_src = ps_elem.attrib.get("DataSourceDescription", "") if ps_elem is not None else ""
            if seq == "0" and not ps_src:
                ps_src = subj_prior_src
            ps_eff = ps_elem.attrib.get("DataSourceEffectiveDate", "") if ps_elem is not None else ""
            if ps_eff:
                m_e = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", ps_eff)
                if m_e:
                    ps_eff = f"{m_e.group(2)}/{m_e.group(3)}/{m_e.group(1)}"

            # Custom sales grid fields (Fireplace (s), etc., Fence, Pool, etc., Other, ADU, Woodstove, etc.)
            custom_fields_dict = {}
            for c_def in custom_sales_grid_definitions:
                lbl = c_def["label"]
                c_seq = c_def["seq"]
                desc = ""
                amt = ""
                if seq == "0":
                    desc = c_def["subj_desc"]
                    amt = ""
                else:
                    # 1. Match by PropertyFeatureSequenceIdentifier on OTHER_FEATURE_ADJUSTMENT
                    for ofa in comp.findall("OTHER_FEATURE_ADJUSTMENT"):
                        if ofa.attrib.get("PropertyFeatureSequenceIdentifier", "") == c_seq:
                            desc = ofa.attrib.get("PropertyFeatureDescription", "")
                            amt = _clean_currency(ofa.attrib.get("PropertyFeatureAdjustmentAmount", ""))
                            break
                    # 2. Match by _TypeOtherDescription or _Type on SALE_PRICE_ADJUSTMENT
                    if not desc and not amt:
                        for adj in comp.findall("SALE_PRICE_ADJUSTMENT"):
                            atype = adj.attrib.get("_Type", "")
                            aother = adj.attrib.get("_TypeOtherDescription", "")
                            if (aother and aother == c_def["type_other"]) or (not aother and atype == c_def["type"]):
                                desc = adj.attrib.get("_Description", "")
                                amt = _clean_currency(adj.attrib.get("_Amount", ""))
                                break

                custom_fields_dict[lbl] = desc
                custom_fields_dict[f"{lbl} Adjustment"] = amt

                lbl_lower = lbl.lower()
                if "fire" in lbl_lower:
                    custom_fields_dict["Fireplace"] = desc
                    custom_fields_dict["Fireplace Adjustment"] = amt
                    custom_fields_dict["Fireplace(s)"] = desc
                    custom_fields_dict["Fireplace(s) Adjustment"] = amt
                    custom_fields_dict["Fireplace (s), etc."] = desc
                    custom_fields_dict["Fireplace (s), etc. Adjustment"] = amt
                if "fence" in lbl_lower or "pool" in lbl_lower:
                    custom_fields_dict["Fence, Pool, etc."] = desc
                    custom_fields_dict["Fence, Pool, etc. Adjustment"] = amt
                    custom_fields_dict["Fence/Pool"] = desc
                    custom_fields_dict["Fence/Pool Adjustment"] = amt
                if "woodstove" in lbl_lower or "wood stove" in lbl_lower:
                    custom_fields_dict["Woodstove"] = desc
                    custom_fields_dict["Woodstove Adjustment"] = amt
                if "adu" in lbl_lower or "accessory" in lbl_lower:
                    custom_fields_dict["ADU"] = desc
                    custom_fields_dict["ADU Adjustment"] = amt
                if lbl_lower == "other" or "other" in lbl_lower:
                    custom_fields_dict["Other"] = desc
                    custom_fields_dict["Other Adjustment"] = amt
                    if not custom_fields_dict.get("Additional Description"):
                        custom_fields_dict["Additional Description"] = desc
                        custom_fields_dict["Additional Adjustment"] = amt

            comp_data = {
                "Address": c_addr or (full_addr if seq == "0" else ""),
                "Street Address": c_addr_street or (prop_addr if seq == "0" else ""),
                "City": c_city or (prop_city if seq == "0" else ""),
                "City State Zip": c_addr_csz or (f"{prop_city}, {prop_state} {prop_zip}".strip(", ") if seq == "0" else ""),
                "Unit #": c_unit or (unit_id if seq == "0" else ""),
                "Unit Number": c_unit or (unit_id if seq == "0" else ""),
                "Unit": c_unit or (unit_id if seq == "0" else ""),
                "Project Name": c_proj_name,
                "Phase": c_proj_phase,
                "Project Name and Phase": c_proj_name_phase,
                "Address and Unit #": f"{c_addr_street}\n{c_addr_csz}" if (c_addr_street and c_addr_csz) else (c_addr or (full_addr if seq == "0" else "")),
                "Proximity to Subject": c_prox,
                "Proximity to Subject comment": c_prox,
                "Sale Price": sale_price or (contract_price if seq == "0" else ""),
                "Sale Price/Gross Liv. Area": _clean_currency(comp.attrib.get("SalesPricePerGrossLivingAreaAmount", "")),
                "Sale Price/Gross Bldg. Area": _clean_currency(comp.attrib.get("SalesPricePerGrossBuildingAreaAmount", "")),
                "Gross Monthly Rent": rent,
                "Gross Rent Multiplier": grm,
                "Price Per Unit": price_per_unit,
                "Price Per Room": price_per_room,
                "Price Per Bedroom": price_per_bdrm,
                "Rent Control": rent_control,
                "Adj. Price Per Unit": adj_price_unit,
                "Adj. Price Per Room": adj_price_room,
                "Adj. Price Per Bdrm.": adj_price_bdrm,
                "Value Per Unit": price_per_unit,
                "Value Per Gross Bldg. Area": _clean_currency(comp.attrib.get("SalesPricePerGrossBuildingAreaAmount", "")),
                "Data Source(s)": data_src,
                "Verification Source(s)": verif_src,
                "Sales or Financing Concessions": concessions_desc,
                "Sales or Financing Concessions Adjustment": concessions_amt,
                "Sales Concessions": concessions_desc,
                "Sales Concessions Adjustment": concessions_amt,
                "Date of Sale/Time": adjustments.get("DateOfSale", {}).get("desc", contract_date if seq == "0" else ""),
                "Date of Sale/Time Adjustment": adjustments.get("DateOfSale", {}).get("amount", ""),
                "Location": adjustments.get("Location", {}).get("desc", nb_loc if seq == "0" else ""),
                "Location Adjustment": adjustments.get("Location", {}).get("amount", ""),
                "Leasehold/Fee Simple": (prop_rights if seq == "0" else (adjustments.get("PropertyRights", {}).get("desc", ""))),
                "Leasehold/Fee Simple Adjustment": adjustments.get("PropertyRights", {}).get("amount", ""),
                "Site": adjustments.get("SiteArea", {}).get("desc", site_area if seq == "0" else ""),
                "Site Adjustment": adjustments.get("SiteArea", {}).get("amount", ""),
                "View": adjustments.get("View", {}).get("desc", site_view if seq == "0" else ""),
                "View Adjustment": adjustments.get("View", {}).get("amount", ""),
                "Design (Style)": adjustments.get("DesignStyle", {}).get("desc", design_style if seq == "0" else ""),
                "Design (Style) Adjustment": adjustments.get("DesignStyle", {}).get("amount", ""),
                "Quality of Construction": adjustments.get("Quality", {}).get("desc", ""),
                "Quality of Construction Adjustment": adjustments.get("Quality", {}).get("amount", ""),
                "Actual Age": age_desc,
                "Actual Age Adjustment": adjustments.get("Age", {}).get("amount", ""),
                "Condition": adjustments.get("Condition", {}).get("desc", ""),
                "Condition Adjustment": adjustments.get("Condition", {}).get("amount", ""),
                "Total Rooms": c_rooms,
                "Bedrooms": c_bed,
                "Baths": c_bath,
                "Above Grade Room Count": c_rooms,
                "Above Grade Room Count Adjustment": c_room_adj,
                "Room Count Adjustment": c_room_adj,
                "Bedrooms Adjustment": bed_adj,
                "Baths Adjustment": bath_adj,
                "Bathrooms Adjustment": bath_adj,
                "Gross Living Area": gla_desc or gba_desc,
                "Gross Living Area Adjustment": gla_amt or gba_amt,
                "Gross Building Area": gba_desc or gla_desc,
                "Gross Building Area Adjustment": gba_amt or gla_amt,
                "Basement & Finished Rooms Below Grade": full_bm_desc,
                "Basement & Finished Rooms Below Grade Adjustment": bm_amt,
                "Basement Description": bm_desc,
                "Basement Description Adjustment": adjustments.get("BasementArea", {}).get("amount", ""),
                "Basement Finished Rooms": bm_fin_desc,
                "Basement Finished Rooms Adjustment": adjustments.get("BasementFinish", {}).get("amount", ""),
                "Functional Utility": adjustments.get("FunctionalUtility", {}).get("desc", "Average" if seq == "0" else ""),
                "Functional Utility Adjustment": adjustments.get("FunctionalUtility", {}).get("amount", ""),
                "Heating/Cooling": adjustments.get("HeatingCooling", {}).get("desc", ""),
                "Heating/Cooling Adjustment": adjustments.get("HeatingCooling", {}).get("amount", ""),
                "Energy Efficient Items": adjustments.get("EnergyEfficient", {}).get("desc", "None" if seq == "0" else ""),
                "Energy Efficient Items Adjustment": adjustments.get("EnergyEfficient", {}).get("amount", ""),
                "Garage/Carport": car_desc,
                "Garage/Carport Adjustment": car_amt,
                "Parking On/Off Site": car_desc,
                "Parking On/Off Site Adjustment": car_amt,
                "Porch/Patio/Deck": adjustments.get("PorchDeck", {}).get("desc", ""),
                "Porch/Patio/Deck Adjustment": adjustments.get("PorchDeck", {}).get("amount", ""),
                "Additional Description": custom_fields_dict.get("Additional Description") or adjustments.get("Other", {}).get("desc", ""),
                "Additional Adjustment": custom_fields_dict.get("Additional Adjustment") or adjustments.get("Other", {}).get("amount", ""),
                "Net Adjustment (Total)": net_adj_str,
                "Gross Adjustment (Total)": f"{gross_pct}%" if gross_pct else "",
                "Adjusted Sale Price": adj_price,
                "Adjusted Sale Price of Comparable": adj_price,
                "Date of Prior Sale/Transfer": ps_date,
                "Price of Prior Sale/Transfer": ps_price,
                "Data Source(s) for prior sale": ps_src,
                "Effective Date of Data Source(s) for prior sale": ps_eff,
                "Prior Sale History: Date of Prior Sale/Transfer": ps_date,
                "Prior Sale History: Price of Prior Sale/Transfer": ps_price,
                "Prior Sale History: Data source(s) for prior sale": ps_src,
                "Prior Sale History: Effective date of data source(s)": ps_eff,
                **unit_breakdown,
                **custom_fields_dict,
            }

            if seq == "0":
                comps_dict["Subject"] = comp_data
                comps_dict["SUBJECT"] = comp_data
                sales_grid["Subject"] = comp_data
                sales_grid["SUBJECT"] = comp_data
                sales_grid["Subject Address"] = comp_data["Address"]
                sales_grid["Subject Unit #"] = comp_data["Unit #"]
                sales_grid["Subject Project Name and Phase"] = comp_data["Project Name and Phase"]
                sales_grid["Subject Sale Price"] = comp_data["Sale Price"]
            else:
                comp_aliases = [
                    f"Comparable #{seq}",
                    f"COMPARABLE SALE #{seq}",
                ]
                for alias in comp_aliases:
                    comps_dict[alias] = comp_data
                    sales_grid[alias] = comp_data
                sales_grid[f"Comparable #{seq} Address"] = comp_data["Address"]
                sales_grid[f"Comparable #{seq} Unit #"] = comp_data["Unit #"]
                sales_grid[f"Comparable #{seq} Project Name and Phase"] = comp_data["Project Name and Phase"]
                sales_grid[f"Comparable #{seq} Proximity to Subject"] = comp_data["Proximity to Subject"]
                sales_grid[f"Comparable #{seq} Sale Price"] = comp_data["Sale Price"]
                sales_grid[f"Comparable #{seq} Data Source(s)"] = comp_data["Data Source(s)"]
                sales_grid[f"Comparable #{seq} Verification Source(s)"] = comp_data["Verification Source(s)"]
                sales_grid[f"Comparable #{seq} Adjusted Sale Price"] = comp_data["Adjusted Sale Price"]

        custom_sales_grid_rows = [
            {
                "label": d["label"],
                "valueKey": d["label"],
                "adjustmentKey": f"{d['label']} Adjustment",
            }
            for d in custom_sales_grid_definitions
        ]
        sales_grid["custom_rows"] = custom_sales_grid_rows
        sales_grid["sales_grid_custom_rows"] = custom_sales_grid_rows


    # Foundation & Condition fallback to Subject Adjustments if not already found
    if not foundation_type and adjustments_subject.get("BasementArea", {}).get("desc"):
        foundation_type = adjustments_subject["BasementArea"]["desc"]

    if adjustments_subject.get("Condition", {}).get("desc"):
        prop_condition = adjustments_subject["Condition"]["desc"]
    elif not prop_condition:
        for pa in root.findall(".//PROPERTY_ANALYSIS"):
            if pa.attrib.get("_Type") == "PropertyCondition":
                comm = pa.attrib.get("_Comment", "")
                if "average" in comm.lower():
                    prop_condition = "Average"
                elif comm:
                    prop_condition = comm
                break

    # Subject Rent Schedule
    mfrs = root.find(".//MULTIFAMILY_RENT_SCHEDULE")
    tot_act_rent = ""
    tot_gross_rent = ""
    tot_est_inc = ""
    tot_act_inc = ""
    if mfrs is not None:
        tot_act_rent = _clean_currency(mfrs.attrib.get("RentalActualGrossMonthlyRentAmount", ""))
        tot_gross_rent = _clean_currency(mfrs.attrib.get("RentalEstimatedGrossMonthlyRentAmount", ""))
        tot_est_inc = _clean_currency(mfrs.attrib.get("RentalEstimatedTotalMonthlyIncomeAmount", ""))
        tot_act_inc = _clean_currency(mfrs.attrib.get("RentalActualTotalMonthlyIncomeAmount", ""))

    subject_rent_schedule = {
        "Total Actual Monthly Rent": tot_act_rent,
        " Total Gross Monthly Rent": tot_gross_rent,
        "Total Estimated Monthly Income": tot_est_inc,
        "Total Actual Monthly Income": tot_act_inc,
    }
    unit_rent_elems = root.findall(".//UNIT_RENT_SCHEDULE")
    for u in unit_rent_elems:
        uid = u.attrib.get("UnitSequenceIdentifier", "")
        if uid:
            status_desc = u.attrib.get("LeaseExpirationDate", "")
            actual_amt = _clean_currency(u.attrib.get("UnitActualRentAmount", ""))
            market_amt = _clean_currency(u.attrib.get("UnitMarketRentAmount", ""))
            subject_rent_schedule[f"Unit # Lease Date  Begin Date {uid}"] = status_desc
            subject_rent_schedule[f"Unit # Lease Date End Date {uid}"] = status_desc
            subject_rent_schedule[f"Actual Rents Unit # {uid}  Per Unit Unfurnished"] = actual_amt
            subject_rent_schedule[f"Actual Rents Unit # {uid} Total Rents"] = actual_amt
            subject_rent_schedule[f"Opinion Of Market Rent Unit # {uid} Per Unit Unfurnished"] = market_amt
            subject_rent_schedule[f"Opinion Of Market Rent Unit # {uid} Total Rents"] = market_amt

    # Comparable Rental Data (Form 1025 Multifamily + Form 1007 Single Family)
    comparable_rental_data: Dict[str, Any] = {}
    single_family_rent_schedule: Dict[str, Any] = {}
    sf_rent_comps: Dict[str, Dict[str, Any]] = {}
    rent_reconciliation: Dict[str, Any] = {}

    # 1. Form 1025 Multifamily Rental Data
    mf_rentals_parent = root.find(".//MULTIFAMILY_RENTALS")
    mf_analysis_comment = ""
    if mf_rentals_parent is not None:
        mf_analysis_comment = mf_rentals_parent.attrib.get("RentalDataAnalysisComment", "").strip()

    mf_rentals = root.findall(".//MULTIFAMILY_RENTAL")
    for r in mf_rentals:
        rid = r.attrib.get("PropertySequenceIdentifier", "").strip()
        r_loc = r.find("LOCATION")
        st1 = r_loc.attrib.get("PropertyStreetAddress", "").strip() if r_loc is not None else ""
        st2 = r_loc.attrib.get("PropertyStreetAddress2", "").strip() if r_loc is not None else ""
        city = r_loc.attrib.get("CityName", "").strip() if r_loc is not None else ""
        state = r_loc.attrib.get("StateOrProvinceCode", "").strip() if r_loc is not None else ""
        zip_code = r_loc.attrib.get("PostalCode", "").strip() if r_loc is not None else ""
        if st1 and st2:
            r_addr = f"{st1}, {st2}"
        elif st1 and (city or state or zip_code):
            r_addr = ", ".join([p for p in [st1, city, f"{state} {zip_code}".strip()] if p])
        else:
            r_addr = st1 or st2 or (full_addr or prop_addr if rid == "0" else "")

        r_prox = r_loc.attrib.get("ProximityToSubjectDescription", "").strip() if r_loc is not None else ""
        r_rent = _clean_currency(r.attrib.get("MonthlyRentAmount", "").strip())
        r_rent_gba = r.attrib.get("RentPerGrossBuildingAreaAmount", "").strip()
        r_rent_control = r.attrib.get("RentControlStatusType", "").strip()
        r_gba = r.attrib.get("GrossBuildingAreaSquareFeetCount", "").strip()
        r_src = r.attrib.get("DataSourceDescription", "").strip()

        r_lease = ""
        r_location = ""
        r_age = ""
        r_condition = ""
        r_utilities = ""
        r_parking = ""
        r_other = ""

        for oft in r.findall("OTHER_FEATURE_DESCRIPTION"):
            seq_id = oft.attrib.get("PropertyFeatureSequenceIdentifier", "").strip()
            desc = oft.attrib.get("PropertyFeatureDescription", "").strip()
            if seq_id == "1":
                r_parking = desc
            elif seq_id == "2":
                r_other = desc

        for ft in r.findall("RENTAL_FEATURE"):
            ft_type = (ft.attrib.get("_Type", "") or "").strip().lower()
            ft_other = (ft.attrib.get("_TypeOtherDescription", "") or "").strip().lower()
            ft_desc = ft.attrib.get("_Description", "").strip()
            if ft_type in ("lease", "dateoflease", "date_of_lease"):
                r_lease = ft_desc
            elif ft_type == "location":
                r_location = ft_desc
            elif ft_type in ("age", "actualage", "actual_age"):
                r_age = ft_desc
            elif ft_type in ("condition", "propertycondition"):
                r_condition = ft_desc
            elif ft_type in ("utilitiesincluded", "utilities_included", "utilities"):
                r_utilities = ft_desc
            elif "parking" in ft_other or "parking" in ft_desc.lower():
                r_parking = ft_desc
            elif ft_other == "other" or (ft_type == "other" and not r_other):
                r_other = ft_desc

        unit_data = {}
        for u in r.findall("RENTAL_UNIT"):
            u_seq = u.attrib.get("UnitSequenceIdentifier", "").strip()
            if not u_seq:
                continue
            tot = u.attrib.get("TotalRoomCount", "").strip()
            br = u.attrib.get("TotalBedroomCount", "").strip()
            ba = u.attrib.get("TotalBathroomCount", "").strip()
            size = u.attrib.get("SquareFeetCount", "").strip()
            u_rent = _clean_currency(u.attrib.get("MonthlyRentAmount", "").strip())
            unit_data[f"Unit Breakdown Rm Count Tot Unit # {u_seq}"] = tot
            unit_data[f"Unit Breakdown Rm Count Br Unit # {u_seq}"] = br
            unit_data[f"Unit Breakdown Rm Count Ba Unit # {u_seq}"] = ba
            unit_data[f"Unit Breakdown Size Unit # {u_seq}"] = size
            unit_data[f"Unit Breakdown Monthly Rent Unit # {u_seq}"] = u_rent

        # Ensure keys for units 1..4 exist
        for u_idx in range(1, 5):
            u_str = str(u_idx)
            unit_data.setdefault(f"Unit Breakdown Rm Count Tot Unit # {u_str}", "")
            unit_data.setdefault(f"Unit Breakdown Rm Count Br Unit # {u_str}", "")
            unit_data.setdefault(f"Unit Breakdown Rm Count Ba Unit # {u_str}", "")
            unit_data.setdefault(f"Unit Breakdown Size Unit # {u_str}", "")
            unit_data.setdefault(f"Unit Breakdown Monthly Rent Unit # {u_str}", "")

        r_record = {
            "Address": r_addr,
            "Proximity to Subject": r_prox,
            "Current Monthly Rent": r_rent,
            "Rent/Gross Bldg. Area": r_rent_gba,
            "Rent Control": r_rent_control,
            "Data Source(s)": r_src,
            "Date of Lease(s)": r_lease,
            "Location": r_location,
            "Actual Age": r_age,
            "Condition": r_condition,
            "Gross Building Area": r_gba,
            "Utilities Included": r_utilities,
            "Parking": r_parking,
            "Other": r_other,
            **unit_data,
        }

        if rid == "0":
            comparable_rental_data["Subject Rental"] = r_record
        else:
            comparable_rental_data[f"COMPARABLE Rental No #{rid}"] = r_record
            comparable_rental_data[f"COMPARABLE Rental No. #{rid}"] = r_record
            comparable_rental_data[f"Comparable Rental No #{rid}"] = r_record
            comparable_rental_data[f"Rental {rid}"] = r_record
            comparable_rental_data[f"Comparable Rental #{rid}"] = r_record

    # 2. Form 1007 Single Family Comparable Rent Schedule (MISMO 2.6 XML DOM)
    res_rent_sched = root.find(".//RESIDENTIAL_RENT_SCHEDULE")
    if res_rent_sched is None:
        res_rent_sched = root.find(".//SINGLE_FAMILY_RENT_SCHEDULE")

    if res_rent_sched is not None:
        for r in res_rent_sched.findall(".//RESIDENTIAL_RENTAL"):
            seq = r.attrib.get("PropertySequenceIdentifier", "")
            loc = r.find("LOCATION")
            st1 = loc.attrib.get("PropertyStreetAddress", "") if loc is not None else ""
            st2 = loc.attrib.get("PropertyStreetAddress2", "") if loc is not None else ""
            rental_full_addr = ", ".join([p for p in [st1, st2] if p]) if (st1 or st2) else ""
            prox = loc.attrib.get("ProximityToSubjectDescription", "") if loc is not None else ""
            
            l_start = r.attrib.get("LeaseStartDate", "")
            l_exp = r.attrib.get("LeaseExpirationDate", "")
            rent = _clean_currency(r.attrib.get("MonthlyRentAmount", ""))
            adj_rent = _clean_currency(r.attrib.get("ExpenseAdjustedMonthlyRentAmount", ""))
            src = r.attrib.get("DataSourceDescription", "")
            
            net_adj_amt = r.attrib.get("RentTotalAdjustmentAmount", "")
            net_pos = r.attrib.get("RentTotalAdjustmentPositiveIndicator", "Y")
            net_adj = ""
            if net_adj_amt:
                sign = "+" if net_pos == "Y" else "-"
                net_adj = f"{sign} {_clean_currency(net_adj_amt)}"
                
            mkt_rent = _clean_currency(r.attrib.get("MarketAdjustedMonthlyRentAmount", ""))
            
            c_dict = {
                "Address": rental_full_addr,
                "Proximity to Subject": prox,
                "Date Lease Begins": l_start,
                "Date Lease Expires": l_exp,
                "Monthly Rental": rent,
                "Adjusted Monthly Rent": adj_rent,
                "Data Source": src,
                "Net Adj. (total)": net_adj,
                "Indicated Monthly Market Rent": mkt_rent,
            }
            
            for ra in r.findall("RENT_ADJUSTMENT"):
                t = ra.attrib.get("_Type", "")
                desc = ra.attrib.get("_Description", "")
                amt = _clean_currency(ra.attrib.get("_Amount", ""))
                if t == "RentConcessions":
                    c_dict["Concessions"] = desc
                elif t == "Location":
                    c_dict["Location/View"] = desc
                    if amt: c_dict["Location/View Adjustment"] = amt
                elif t == "View":
                    if c_dict.get("Location/View"):
                        c_dict["Location/View"] += f" {desc}"
                    else:
                        c_dict["Location/View"] = desc
                    if amt: c_dict["Location/View Adjustment"] = amt
                elif t == "Design":
                    c_dict["Design and Appeal"] = desc
                    if amt: c_dict["Design and Appeal Adjustment"] = amt
                elif t == "Appeal":
                    if c_dict.get("Design and Appeal"):
                        c_dict["Design and Appeal"] += f" {desc}"
                    else:
                        c_dict["Design and Appeal"] = desc
                    if amt: c_dict["Design and Appeal Adjustment"] = amt
                elif t == "Age":
                    c_dict["Age"] = desc
                    if amt: c_dict["Age Adjustment"] = amt
                elif t == "Condition":
                    c_dict["Condition"] = desc
                    if amt: c_dict["Condition Adjustment"] = amt
                elif t == "GrossLivingArea":
                    c_dict["Gross Living Area"] = desc
                    if amt: c_dict["Gross Living Area Adjustment"] = amt
                elif t in ["Basement", "OtherBasement"]:
                    c_dict["Other (e.g., basement, etc.)"] = desc
                    c_dict["Other (e.g., basement)"] = desc
                    c_dict["Other Basement"] = desc
                    if amt:
                        c_dict["Other (e.g., basement, etc.) Adjustment"] = amt
                        c_dict["Other (e.g., basement) Adjustment"] = amt
                        c_dict["Other Basement Adjustment"] = amt
                elif t in ["Other", "Other2"]:
                    c_dict["Other:"] = desc
                    c_dict["Other"] = desc
                    if amt:
                        c_dict["Other: Adjustment"] = amt
                        c_dict["Other Adjustment"] = amt

            if seq == "0":
                single_family_rent_schedule = c_dict
            else:
                comp_key = f"COMPARABLE NO. {seq}"
                sf_rent_comps[comp_key] = c_dict

        # Parse OTHER_FEATURE_ADJUSTMENT under RESIDENTIAL_RENT_SCHEDULE
        all_ofa = res_rent_sched.findall("OTHER_FEATURE_ADJUSTMENT")
        if all_ofa:
            for seq_id, field_name in [("1", "Other (e.g., basement, etc.)"), ("2", "Other:")]:
                feat_items = [el for el in all_ofa if el.attrib.get("PropertyFeatureSequenceIdentifier") == seq_id]
                unkeyed = [el for el in all_ofa if not el.attrib.get("PropertyFeatureSequenceIdentifier")]
                subj_idx = int(seq_id) - 1
                if len(unkeyed) > subj_idx:
                    s_desc = unkeyed[subj_idx].attrib.get("PropertyFeatureDescription", "")
                    if s_desc:
                        single_family_rent_schedule[field_name] = s_desc
                        if field_name == "Other:":
                            single_family_rent_schedule["Other"] = s_desc
                        elif field_name == "Other (e.g., basement, etc.)":
                            single_family_rent_schedule["Other (e.g., basement)"] = s_desc
                elif feat_items:
                    s_desc = feat_items[0].attrib.get("PropertyFeatureDescription", "")
                    if s_desc and len(feat_items) > len(sf_rent_comps):
                        single_family_rent_schedule[field_name] = s_desc
                        if field_name == "Other:":
                            single_family_rent_schedule["Other"] = s_desc
                        elif field_name == "Other (e.g., basement, etc.)":
                            single_family_rent_schedule["Other (e.g., basement)"] = s_desc

                for comp_idx, el in enumerate(feat_items, start=1):
                    c_key = f"COMPARABLE NO. {comp_idx}"
                    if c_key in sf_rent_comps:
                        c_desc = el.attrib.get("PropertyFeatureDescription", "")
                        c_amt = _clean_currency(el.attrib.get("PropertyFeatureAdjustmentAmount", ""))
                        if c_desc:
                            sf_rent_comps[c_key][field_name] = c_desc
                            if field_name == "Other:":
                                sf_rent_comps[c_key]["Other"] = c_desc
                            elif field_name == "Other (e.g., basement, etc.)":
                                sf_rent_comps[c_key]["Other (e.g., basement)"] = c_desc
                        if c_amt:
                            sf_rent_comps[c_key][f"{field_name} Adjustment"] = c_amt
                            if field_name == "Other:":
                                sf_rent_comps[c_key]["Other Adjustment"] = c_amt
                            elif field_name == "Other (e.g., basement, etc.)":
                                sf_rent_comps[c_key]["Other (e.g., basement) Adjustment"] = c_amt

    # Embedded PDF Check & Form 1007 Rent Schedule Page Extraction
    extracted_photos = []
    has_embedded_pdf = False
    embedded_doc = root.find(".//EMBEDDED_FILE/DOCUMENT")
    if embedded_doc is not None and embedded_doc.text:
        has_embedded_pdf = True
        if fitz is not None:
            try:
                pdf_bytes = base64.b64decode(embedded_doc.text.strip())
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                extracted_photos.append({
                    "category": "Embedded PDF",
                    "page": 1,
                    "caption": f"Embedded PDF ({len(doc)} pages) detected in XML"
                })

                # Check for Form 1007 Comparable Rent Schedule in embedded PDF
                rent_pages = find_comparable_rent_schedule_pages(doc)
                if rent_pages:
                    for page_offset, p_idx in enumerate(rent_pages):
                        start_comp = 1 + (page_offset * 3)
                        pdf_rent_data = extract_rent_schedule_from_pdf_page(doc[p_idx], start_comp_num=start_comp)
                        # Merge Subject rent fields
                        for sk, sv in pdf_rent_data.get("Subject", {}).items():
                            if sv and (sk not in single_family_rent_schedule or not single_family_rent_schedule[sk]):
                                single_family_rent_schedule[sk] = sv
                        # Merge Comps
                        for ck, cv in pdf_rent_data.get("comparables", {}).items():
                            if ck not in sf_rent_comps:
                                sf_rent_comps[ck] = cv
                            else:
                                for fk, fv in cv.items():
                                    if fv and (fk not in sf_rent_comps[ck] or not sf_rent_comps[ck][fk]):
                                        sf_rent_comps[ck][fk] = fv
                        # Merge Reconciliation
                        for rk, rv in pdf_rent_data.get("reconciliation", {}).items():
                            if rv:
                                rent_reconciliation[rk] = rv
            except Exception:
                pass

    # 2b. Form 1007 Single Family Comparable Rent Schedule (keep strictly separate from Form 1025 Comparable Rental Data)
    comparable_rent_schedule: Dict[str, Any] = {}
    for comp_name, comp_dict in sf_rent_comps.items():
        comparable_rent_schedule[comp_name] = comp_dict
        m_cnum = re.search(r'\d+', comp_name)
        if m_cnum:
            c_num = m_cnum.group(0)
            comparable_rent_schedule[f"COMPARABLE NO. {c_num}"] = comp_dict
            comparable_rent_schedule[f"Comparable Rent #{c_num}"] = comp_dict
            comparable_rent_schedule[f"Comparable Rent Schedule Comp #{c_num}"] = comp_dict

    # PUD & HOA
    pud_indicator = ""
    hoa_fee = ""
    pud_fee_amt = ""
    pud_fee_period = ""
    pud_fee_month = ""
    pud_fee_year = ""
    dev_control = ""
    unit_types = ""
    legal_name = ""
    phases = ""
    units_total = ""
    units_sold = ""
    units_rented = ""
    units_for_sale = ""
    data_source = ""
    conversion_ind = ""
    conversion_date = ""
    multi_dwelling = ""
    complete_ind = ""
    incomplete_desc = ""
    leased_ind = ""
    leased_desc = ""
    common_elements = ""
    p_type = ""

    prop_type_elem = root.find(".//PROPERTY_TYPE")
    if prop_type_elem is not None:
        gse_pud = prop_type_elem.attrib.get("GSE_PUDIndicator", "")
        if gse_pud.upper() == "Y":
            pud_indicator = "Yes"
        elif gse_pud.upper() == "N":
            pud_indicator = "No"

    proj = property_elem.find("PROJECT") if property_elem is not None else None
    if proj is None:
        proj = root.find(".//PROJECT")

    if proj is not None:
        pud_ind = proj.attrib.get("PUDIndicator", "") or proj.attrib.get("_PUDIndicator", "")
        if pud_ind.upper() == "Y":
            pud_indicator = "Yes"
        elif pud_ind.upper() == "N" and not pud_indicator:
            pud_indicator = "No"
        
        p_type = proj.attrib.get("_ClassificationType", "") or proj.attrib.get("ProjectClassificationType", "")
        if "PUD" in p_type.upper():
            pud_indicator = "Yes"
        elif "CONDOMINIUM" in p_type.upper() or "COOPERATIVE" in p_type.upper():
            if not pud_indicator or pud_indicator == "Yes":
                pud_indicator = "No"

        legal_name = proj.attrib.get("_Name", "")
        unit_types = proj.attrib.get("_DesignType", "")
        
        dev_ctrl_raw = proj.attrib.get("_DeveloperControlsProjectManagementIndicator", "")
        if dev_ctrl_raw.upper() == "Y":
            dev_control = "Yes"
        elif dev_ctrl_raw.upper() == "N":
            dev_control = "No"
        elif dev_ctrl_raw:
            dev_control = dev_ctrl_raw
            
        conv_raw = proj.attrib.get("_ConversionIndicator", "")
        if conv_raw.upper() == "Y":
            conversion_ind = "Yes"
        elif conv_raw.upper() == "N":
            conversion_ind = "No"
        elif conv_raw:
            conversion_ind = conv_raw
        conversion_date = proj.attrib.get("_ConversionDate", "") or proj.attrib.get("_ConversionOriginalUseDescription", "")
        
        multi_raw = proj.attrib.get("_ContainsMultipleDwellingUnitsIndicator", "")
        if multi_raw.upper() == "Y":
            multi_dwelling = "Yes"
        elif multi_raw.upper() == "N":
            multi_dwelling = "No"
        elif proj.attrib.get("_ContainsMultipleDwellingUnitsDataSourceDescription", ""):
            multi_dwelling = proj.attrib.get("_ContainsMultipleDwellingUnitsDataSourceDescription", "")
            
        comp_raw = proj.attrib.get("_CommonElementsCompletedIndicator", "")
        if comp_raw.upper() == "Y":
            complete_ind = "Yes"
        elif comp_raw.upper() == "N":
            complete_ind = "No"
        elif comp_raw:
            complete_ind = comp_raw
        incomplete_desc = proj.attrib.get("_CommonElementsStatusDescription", "")
        
        lease_raw = proj.attrib.get("_CommonElementsLeasedIndicator", "")
        if lease_raw.upper() == "Y":
            leased_ind = "Yes"
        elif lease_raw.upper() == "N":
            leased_ind = "No"
        elif lease_raw:
            leased_ind = lease_raw
        leased_desc = proj.attrib.get("_CommonElementsLeaseTermsDescription", "")
        
        common_elements = proj.attrib.get("_CommonElementsDescription", "")
        data_source = proj.attrib.get("DataSourceDescription", "")
        
        for ds in proj.findall("DEVELOPMENT_STAGE"):
            p = ds.attrib.get("_TotalPhasesCount", "")
            if p and not phases:
                phases = p
            u_tot = ds.attrib.get("CompletedUnitsCount", "") or ds.attrib.get("PlannedUnitsCount", "")
            if u_tot and u_tot != "0" and not units_total:
                units_total = u_tot
            u_sold = ds.attrib.get("UnitsSoldCount", "")
            if u_sold and u_sold != "0" and not units_sold:
                units_sold = u_sold
            u_rent = ds.attrib.get("UnitsRentedCount", "")
            if u_rent and u_rent != "0" and not units_rented:
                units_rented = u_rent
            u_sale = ds.attrib.get("UnitsForSaleCount", "")
            if u_sale and u_sale != "0" and not units_for_sale:
                units_for_sale = u_sale
            src = ds.attrib.get("DataSourceDescription", "")
            if src and not data_source:
                data_source = src

    fee_elem = proj.find("_PER_UNIT_FEE") if proj is not None else None
    if fee_elem is None:
        fee_elem = root.find(".//_PER_UNIT_FEE")
        
    if fee_elem is not None:
        raw_amt = fee_elem.attrib.get("_Amount", "")
        if raw_amt and raw_amt != "0":
            pud_fee_amt = _clean_currency(raw_amt)
            pud_fee_period = fee_elem.attrib.get("_PeriodType", "")
            if "month" in pud_fee_period.lower():
                pud_fee_month = "Yes"
                pud_fee_year = ""
            elif "year" in pud_fee_period.lower() or "annual" in pud_fee_period.lower():
                pud_fee_year = "Yes"
                pud_fee_month = ""
            else:
                pud_fee_month = "Yes"
                pud_fee_year = ""
            hoa_fee = f"${pud_fee_amt}"
            if not pud_indicator:
                pud_indicator = "Yes"
        elif raw_amt == "0":
            hoa_fee = "0"
            if pud_indicator == "Yes":
                pud_fee_amt = "0"

    pud_info_section = {
        "PUD Fees $": pud_fee_amt,
        "PUD Fees (per month)": pud_fee_amt if pud_fee_month == "Yes" else "",
        "PUD Fees (per year)": pud_fee_amt if pud_fee_year == "Yes" else "",
        "Is the developer/builder in control of the Homeowners' Association (HOA)?": dev_control,
        "Unit type(s)": unit_types,
        "Provide the following information for PUDs ONLY if the developer/builder is in control of the HOA and the subject property is an attached dwelling unit.": "",
        "Legal Name of Project": legal_name,
        "Total number of phases": phases,
        "Total number of units": units_total,
        "Total number of units sold": units_sold,
        "Total number of units rented": units_rented,
        "Total number of units for sale": units_for_sale,
        "Data source(s)": data_source,
        "Was the project created by the conversion of existing building(s) into a PUD?": conversion_ind,
        " If Yes, date of conversion": conversion_date,
        "If Yes, date of conversion": conversion_date,
        "Does the project contain any multi-dwelling units? Yes No Data": multi_dwelling,
        "Are the units, common elements, and recreation facilities complete?": complete_ind,
        "If No, describe the status of completion.": incomplete_desc,
        "Are the common elements leased to or by the Homeowners' Association?": leased_ind,
        "If Yes, describe the rental terms and options.": leased_desc,
        "Describe common elements and recreational facilities.": common_elements
    }

    # Listing History
    offered_12m = ""
    report_data_source = ""
    lh_elem = property_elem.find("LISTING_HISTORY") if property_elem is not None else None
    if lh_elem is not None:
        ind = lh_elem.attrib.get("ListedWithinPreviousYearIndicator", "")
        if ind.upper() == "Y":
            offered_12m = "Yes"
        elif ind.upper() == "N":
            offered_12m = "No"
        elif ind:
            offered_12m = ind
        report_data_source = lh_elem.attrib.get("ListedWithinPreviousYearDescription", "")

    # Assignment Type
    assignment_type = ""
    if "Purchase" in purpose:
        assignment_type = "Purchase Transaction"
    elif "Refinance" in purpose:
        assignment_type = "Refinance Transaction"
    elif purpose:
        assignment_type = purpose

    # Narrative Comments from Addendum, XML DOM attributes, and Embedded PDF
    addendum_text = ""
    for f in root.findall(".//FORM"):
        for k, v in f.attrib.items():
            if "text" in k.lower() or "comment" in k.lower():
                addendum_text += " " + v

    # Collect all narrative attributes and text across the entire MISMO XML DOM
    dom_narratives = []
    for elem in root.iter():
        for attr_k, attr_v in elem.attrib.items():
            if any(k in attr_k.lower() for k in ["description", "comment", "narrative", "statement", "marketconditions", "uspap"]):
                dom_narratives.append(attr_v)
        if elem.text and not elem.text.startswith("JVBERi"):
            elem_t = elem.text.strip()
            if len(elem_t) > 10 and not elem_t.startswith("<?xml"):
                dom_narratives.append(elem_t)

    pdf_text = ""
    pdf_doc = None
    if embedded_doc is not None and embedded_doc.text:
        if fitz is not None:
            try:
                pdf_bytes = base64.b64decode(embedded_doc.text.strip())
                pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                for p in pdf_doc:
                    pdf_text += " " + (p.get_text() or "")
            except Exception:
                pass

    full_narrative = "\n\n".join(t for t in [addendum_text] + dom_narratives + [pdf_text] if t).strip()

    # Second-pass fallback for lender_name if still placeholder or empty
    if not lender_name or re.match(r"^(?:see\s+(?:addendum|attached|text|addenda)|refer\s+to|n/?a|none|undefined|null)\b", lender_name.strip(), re.I):
        m_lender_add = re.search(r"(?:LENDER\s*[/]\s*CLIENT|LENDER\s+NAME|CLIENT\s+NAME)\s*[:\-]\s*([^\n\r<]{2,80})", full_narrative, re.I)
        if m_lender_add:
            cand_l = m_lender_add.group(1).strip()
            cand_l = re.split(r"\s+[-:]+", cand_l)[0].strip(" -:;,")
            if cand_l and not re.match(r"^(?:see\s+(?:addendum|attached)|n/?a|none)\b", cand_l, re.I):
                lender_name = cand_l
                if not lender_client_name or re.match(r"^(?:see\s+(?:addendum|attached|text|addenda)|refer\s+to|n/?a|none|undefined|null)\b", lender_client_name.strip(), re.I):
                    lender_client_name = lender_name


    # ANSI (compulsory field)
    ansi_comment = "Not Present"
    ansi_candidates = []
    for s in re.split(r'(?<=[.?!;])\s+|[\r\n]+', full_narrative):
        s_clean = s.strip(" \t\r\n-•*")
        if re.search(r'\b(?:ANSI(?:[-\s]+Z765(?:[-\s]*\d{4})?)?|American\s+National\s+Standards\s+Institute)\b', s_clean, re.IGNORECASE):
            if len(s_clean) > 15 and not s_clean.endswith(':'):
                score = 0
                if re.search(r'Z765', s_clean, re.IGNORECASE): score += 5
                if re.search(r'standard', s_clean, re.IGNORECASE): score += 3
                if re.search(r'measure|calculat|accordance|complian|adher', s_clean, re.IGNORECASE): score += 4
                if len(s_clean) > 30: score += 2
                ansi_candidates.append((score, s_clean))
    if ansi_candidates:
        ansi_candidates.sort(key=lambda x: x[0], reverse=True)
        ansi_comment = ansi_candidates[0][1]
    elif ansi_comment == "Not Present":
        m_ansi = re.search(r'([^.?!;\n]*\b(?:ANSI(?:[-\s]+Z765(?:[-\s]*\d{4})?)?|American\s+National\s+Standards\s+Institute)\b[^.?!;\n]*(?:[.?!]|$))', full_narrative, re.IGNORECASE)
        if m_ansi:
            ansi_comment = m_ansi.group(0).strip(" \t\r\n-•*")
    
    # Extract signatures from USPAP / Appraisal and Report Identification page if present
    appraiser_sig_b64 = ""
    supervisory_sig_b64 = ""
    if pdf_doc is not None:
        try:
            for page in pdf_doc:
                pt = page.get_text() or ""
                if "USPAP" in pt.upper() or "APPRAISAL AND REPORT IDENTIFICATION" in pt.upper() or "APPRAISER:" in pt.upper():
                    for img_info in page.get_image_info(xrefs=True):
                        bbox = img_info.get("bbox", ())
                        if bbox and len(bbox) >= 4 and bbox[1] > 700:
                            xref = img_info.get("xref")
                            if xref:
                                try:
                                    base_img = pdf_doc.extract_image(xref)
                                    if base_img and "image" in base_img:
                                        ext = base_img.get("ext", "png")
                                        b64_data = f"data:image/{ext};base64,{base64.b64encode(base_img['image']).decode('ascii')}"
                                        if bbox[0] < 300 and not appraiser_sig_b64:
                                            appraiser_sig_b64 = b64_data
                                        elif bbox[0] >= 300 and not supervisory_sig_b64:
                                            supervisory_sig_b64 = b64_data
                                except Exception:
                                    pass
                    if appraiser_sig_b64:
                        break
        except Exception:
            pass

    # Exposure comment (compulsory field - checks USPAP Addendum page in embedded PDF first)
    exposure_comment = ""
    if pdf_doc is not None:
        try:
            for page in pdf_doc:
                pt = page.get_text() or ""
                if ("USPAP" in pt.upper() or "EXPOSURE" in pt.upper()) and ("REASONABLE EXPOSURE TIME" in pt.upper() or "EXPOSURE TIME" in pt.upper()):
                    blocks = page.get_text("blocks")
                    words = page.get_text("words")
                    for b in blocks:
                        b_text = b[4].strip()
                        if "my opinion of a reasonable exposure time" in b_text.lower():
                            prompt_bbox = b[:4]
                            cand_vals = [w[4] for w in words if w[0] >= prompt_bbox[2] - 15 and abs(w[1] - prompt_bbox[1]) < 25 and w[4].lower() not in ["is:", "is", "the", ":", "(uspap", "defines", "exposure"]]
                            if cand_vals and not any(k in " ".join(cand_vals).lower() for k in ["uspap defines", "estimated length"]):
                                val = " ".join(cand_vals).strip()
                                for b2 in blocks:
                                    b2_t = " ".join(b2[4].split()).strip()
                                    if "reasonable exposure time" in b2_t.lower() and ("estimated to be" in b2_t.lower() or "typical exposure" in b2_t.lower() or "opinion of value" in b2_t.lower()):
                                        if len(b2_t) > 30 and "my opinion of a reasonable" not in b2_t.lower():
                                            exposure_comment = f"{val} ({b2_t})"
                                            break
                                if not exposure_comment and val:
                                    exposure_comment = val
                                break
                    if exposure_comment:
                        break
        except Exception:
            pass

    if not exposure_comment:
        # Comprehensive scan across XML narrative and embedded document text
        exp_patterns = [
            re.compile(r'([^.?!;\n]*\b(?:reasonable\s+exposure\s+time\s+for\s+the\s+subject|exposure\s*(?:and\s*|or\s*|\/\s*|marketing\s*)?time\s+(?:for\s+the\s+subject\s+property\s+)?is\s+determined|exposure\s+marketing\s+time|estimated\s+exposure\s+time\s+is|opinion\s+of\s+(?:a\s+)?reasonable\s+exposure|opinion\s+of\s+exposure\s+time)\b[^.?!;\n]*[.?!]?)', re.IGNORECASE),
            re.compile(r'([^.?!;\n]*\b(?:market\s+value\s+stated\s+(?:within|in)\s+this\s+report\s+reflects\s+an\s+exposure\s+time)\b[^.?!;\n]*[.?!]?)', re.IGNORECASE),
            re.compile(r'([^.?!;\n]*\b(?:reasonable\s+exposure\s+time\s+(?:is|was|developed))\b[^.?!;\n]*[.?!]?)', re.IGNORECASE),
            re.compile(r'([^.?!;\n]*\b(?:exposure\s+time\s+is\s+estimated\s+at|exposure\s+time\s+of\s+\d+|exposure\s+time\s+under\s+\d+)\b[^.?!;\n]*[.?!]?)', re.IGNORECASE),
            re.compile(r'([^.?!;\n]*\b(?:reasonable\s*exposure\s*time|exposure\s*(?:and\s*|or\s*|\/\s*|marketing\s*)?time|expo\s*days|exposure\s*period|marketing\s*and\s*exposure)\b[^.?!;\n]*(?:[.?!]|$))', re.IGNORECASE),
        ]
        for pat in exp_patterns:
            m = pat.search(full_narrative)
            if m:
                cand_exp = m.group(0).strip(" \t\r\n-•*")
                if len(cand_exp) > 5 and "allowed for exposure in the open market" not in cand_exp.lower() and "uspap defines exposure time" not in cand_exp.lower():
                    exposure_comment = cand_exp
                    break

    # Prior service comment (compulsory field - checks USPAP Addendum checkboxes first)
    prior_service_comment = ""
    if pdf_doc is not None:
        try:
            for page in pdf_doc:
                pt = page.get_text() or ""
                if ("USPAP" in pt.upper() or "CERTIFICATION" in pt.upper()) and ("THREE-YEAR PERIOD" in pt.upper() or "SERVICES" in pt.upper()):
                    blocks = page.get_text("blocks")
                    words = page.get_text("words")
                    opt_no_bbox = None
                    opt_have_bbox = None
                    for b in blocks:
                        b_text = " ".join(b[4].split()).strip()
                        if "no services, as an appraiser" in b_text.lower() or "not performed services, as an appraiser" in b_text.lower() or "performed no services" in b_text.lower():
                            opt_no_bbox = b[:4]
                        elif "have performed services" in b_text.lower() and "no services" not in b_text.lower():
                            opt_have_bbox = b[:4]

                    if opt_no_bbox or opt_have_bbox:
                        for w in words:
                            w_text = w[4].strip().upper()
                            if w_text in ["X", "[X]", "8", "[8]", "☒", "☑", "✓"] and w[0] < 50:
                                if opt_no_bbox and abs(w[1] - opt_no_bbox[1]) < 30:
                                    prior_service_comment = "I have NOT performed services, as an appraiser or in any other capacity, regarding the property that is the subject of this report within the three-year period immediately preceding acceptance of this assignment."
                                    break
                                elif opt_have_bbox and abs(w[1] - opt_have_bbox[1]) < 30:
                                    prior_service_comment = "I HAVE performed services, as an appraiser or in another capacity, regarding the property that is the subject of this report within the three-year period immediately preceding acceptance of this assignment."
                                    break
                    if prior_service_comment:
                        break
        except Exception:
            pass

    if not prior_service_comment:
        prior_patterns = [
            re.compile(r'([^.?!;\n]*\b(?:performed\s+no\s+services|have\s+not\s+performed\s+(?:any\s+)?services|no\s+prior\s+services\s+performed|performed\s+any\s+prior\s+services)\b[^.?!;\n]*[.?!]?)', re.IGNORECASE),
            re.compile(r'([^.?!;\n]*\b(?:prior\s+services?)\s*[:\-]\s*[^.?!;\n]+[.?!]?)', re.IGNORECASE),
            re.compile(r'([^.?!;\n]*\bwithin\s+the\s+(?:three|3)\s*(?:-| )year\s*period\s*immediately\s*preceding[^.?!;\n]*[.?!]?)', re.IGNORECASE),
            re.compile(r'([^.?!;\n]*\b(?:have|has)\s+(?:not\s+)?appraised\s+(?:or\s+provided\s+services\s+for\s+)?the\s+subject\s+property\s+within\b[^.?!;\n]*[.?!]?)', re.IGNORECASE),
            re.compile(r'([^.?!;\n]*\b(?:not\s+appraised\s+the\s+subject\s+property\s+or\s+performed\s+any\s+prior\s+services)\b[^.?!;\n]*[.?!]?)', re.IGNORECASE),
        ]
        for pat in prior_patterns:
            m = pat.search(full_narrative)
            if m:
                cand_ps = m.group(0).strip(" \t\r\n-•*")
                if len(cand_ps) > 10:
                    prior_service_comment = cand_ps
                    break

    # USPAP Reporting Option (Appraisal Report vs Restricted Appraisal Report)
    uspap_reporting_option = ""
    uspap_long_key = (
        "This report was prepared under the following USPAP reporting option:\n"
        "Appraisal Report A written report prepared under Standards Rule 2-2(a).\n"
        "Restricted Appraisal Report A written report prepared under Standards Rule 2-2(b)."
    )
    uspap_comment = ""
    if pdf_doc is not None:
        try:
            for page in pdf_doc:
                pt = page.get_text() or ""
                if "USPAP REPORTING OPTION" in pt.upper() or "STANDARDS RULE 2-2" in pt.upper() or "APPRAISAL AND REPORT IDENTIFICATION" in pt.upper():
                    blocks = page.get_text("blocks")
                    words = page.get_text("words")
                    rep_appr_bbox = None
                    rep_restr_bbox = None
                    for b in blocks:
                        bt = " ".join(b[4].split()).strip().lower()
                        if "standards rule 2-2(a)" in bt or "appraisal report this report was prepared" in bt:
                            rep_appr_bbox = b[:4]
                        elif "standards rule 2-2(b)" in bt or "restricted appraisal report" in bt:
                            rep_restr_bbox = b[:4]
                    if rep_appr_bbox or rep_restr_bbox:
                        for w in words:
                            wt = w[4].strip().upper()
                            if wt in ["X", "[X]", "8", "[8]", "☒", "☑", "✓"] and w[0] < 50:
                                if rep_appr_bbox and abs(w[1] - rep_appr_bbox[1]) < 30:
                                    uspap_reporting_option = "Appraisal Report (USPAP Standards Rule 2-2(a))"
                                    break
                                elif rep_restr_bbox and abs(w[1] - rep_restr_bbox[1]) < 30:
                                    uspap_reporting_option = "Restricted Appraisal Report (USPAP Standards Rule 2-2(b))"
                                    break

                    # Extract comments from USPAP page if present
                    comments_start_y = None
                    appraiser_sig_y = None
                    for b in blocks:
                        bt = " ".join(b[4].split()).strip().lower()
                        if "additional comments" in bt or "comments on appraisal and report identification" in bt:
                            comments_start_y = b[3]
                        if "appraiser:" in bt or "supervisory appraiser" in bt:
                            if appraiser_sig_y is None or b[1] < appraiser_sig_y:
                                appraiser_sig_y = b[1]
                    if comments_start_y:
                        limit_y = (appraiser_sig_y - 4.0) if appraiser_sig_y and appraiser_sig_y > comments_start_y else (comments_start_y + 200.0)
                        c_words = [w for w in words if (comments_start_y + 2.0) <= w[1] <= limit_y and w[0] >= 20 and w[2] <= 580]
                        c_words = [w for w in c_words if w[4].lower() not in ["additional", "comments", "appraiser:", "supervisory", "produced", "using", "aci", "software", "uspap_14", "only", "if", "required", "required):", "(only"]]
                        if c_words:
                            c_words.sort(key=lambda w: (round(w[1] / 5.0) * 5.0, w[0]))
                            c_text = " ".join(w[4] for w in c_words).strip()
                            if not any(k in c_text.lower() for k in ["rl139943", "rd8685", "appraiser (only if required)", "supervisory appraiser"]) and len(re.findall(r'\b\d{1,2}/\d{1,2}/\d{4}\b', c_text)) < 2:
                                if len(c_text) > 5:
                                    uspap_comment = c_text

                    if uspap_reporting_option:
                        break
        except Exception:
            pass

    if not uspap_comment and full_narrative:
        m_comm = re.search(
            r'(?:Comments\s+on\s+Appraisal\s+and\s+Report\s+Identification|Restricted\s+Appraisal\s+Report(?:\s+Comments)?)\s*[:\n]\s*([^\n]+(?:\n[^\n]+){1,8})',
            full_narrative,
            re.IGNORECASE
        )
        if m_comm:
            c_cand = m_comm.group(1).strip()
            c_cand = re.split(r'(?:\n\s*(?:APPRAISER|SUPERVISORY|SIGNATURE|CERTIFICATION|Produce)|\Z)', c_cand, flags=re.IGNORECASE)[0].strip()
            # Clean prompt boilerplate
            c_cand = re.sub(r'^(?:Note\s+any\s+USPAP[-\s]*related\s+issues[^\n]*\n?)+', '', c_cand, flags=re.IGNORECASE).strip()
            # Reject if candidate contains license numbers, certified title, or appraiser names/dates
            if not any(k in c_cand.lower() for k in ["rl139943", "rd8685", "certified res", "certified residential", "1-800-alamode", "aciweb"]) and len(re.findall(r'\b\d{1,2}/\d{1,2}/\d{4}\b', c_cand)) < 2:
                if len(c_cand) > 5:
                    uspap_comment = c_cand
    
    # Smoke & CO detectors & Water Heater
    smoke_comment = ""
    co_comment = ""
    m_det = re.search(r'([^.?!;\n]*\b(?:smoke|carbon\s*monoxide|co\s*detector)\b[^.?!;\n]*(?:[.?!]|$))', full_narrative, re.IGNORECASE)
    if m_det:
        smoke_comment = m_det.group(0).strip()
        co_comment = m_det.group(0).strip()

    water_heater_comment = _extract_water_heater_comment(
        full_narrative=full_narrative,
        dom_narratives=dom_narratives
    )

    # AMC Name
    amc_name = ""
    mc_elem = root.find(".//MANAGEMENT_COMPANY")
    if mc_elem is not None:
        amc_name = mc_elem.attrib.get("GSEManagementCompanyName", "")

    # Appraiser Fee & AMC License #
    appraiser_fee = _extract_appraiser_fee(full_narrative=full_narrative, embedded_doc=embedded_doc)
    amc_license = ""

    # Check AMC license in narrative & attributes
    m_lic = re.search(r'AMC\s+(?:License|Lic\.?|Reg\.?|Registration)\b(?:\s*(?:Number|No\.?|#|:|-|is))*\s*[:\-#]?\s*([A-Za-z0-9][A-Za-z0-9\-]*\d[A-Za-z0-9\-]*)', full_narrative, re.IGNORECASE)
    if m_lic:
        amc_license = m_lic.group(1).strip()

    if not amc_license and embedded_doc is not None and embedded_doc.text:
        try:
            pdf_bytes = base64.b64decode(embedded_doc.text.strip())
            if fitz is not None:
                pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                for page in pdf_doc:
                    ptxt = page.get_text() or ""
                    ml = re.search(r'AMC\s+(?:License|Lic\.?|Reg\.?|Registration)\b(?:\s*(?:Number|No\.?|#|:|-|is))*\s*[:\-#]?\s*([A-Za-z0-9][A-Za-z0-9\-]*\d[A-Za-z0-9\-]*)', ptxt, re.IGNORECASE)
                    if ml:
                        amc_license = ml.group(1).strip()
                        break
                pdf_doc.close()
        except Exception:
            pass

    # ADU File Check
    adu_check = ""
    if property_elem is not None:
        struct_check = property_elem.find("STRUCTURE")
        if struct_check is not None:
            adu_ind = struct_check.attrib.get("_AccessoryUnitExistsIndicator", "")
            if adu_ind.upper() == "Y":
                adu_check = "Yes"
            elif adu_ind.upper() == "N":
                adu_check = "No"
            elif adu_ind:
                adu_check = adu_ind

    # FHA Case Number
    fha_case_no = _extract_fha_case_number(root, report, full_narrative=full_narrative)

    # 1004MC Presence Detection
    has_1004mc, mc_source = _detect_1004mc_presence(root, embedded_doc=embedded_doc)
    mc_present_str = "Present" if has_1004mc else "Not Present"

    # USPAP / Appraisal and Report Identification Presence Detection
    has_uspap_ident, uspap_source = _detect_uspap_identification_presence(root, embedded_doc=embedded_doc)
    uspap_ident_str = "Present" if has_uspap_ident else "Not Present"

    # Invoice Presence Detection
    has_invoice, inv_source, inv_details = _detect_invoice_presence(root, embedded_doc=embedded_doc, full_narrative=full_narrative)
    inv_present_str = "Yes" if has_invoice else "No"

    # UAD Pages Presence Detection
    has_uad_pages, uad_present_str, uad_pages, uad_details = _detect_uad_pages_presence(root, embedded_doc=embedded_doc)

    # Build standard sections matching UI
    subject_section = {
        "1004MC Addendum": mc_present_str,
        "1004MC Present": "Yes" if has_1004mc else "No",
        "has_1004mc": has_1004mc,
        "USPAP / Appraisal and Report Identification": uspap_ident_str,
        "Appraisal and Report Identification": uspap_ident_str,
        "USPAP Addendum": uspap_ident_str,
        "has_uspap_identification": has_uspap_ident,
        "UAD pages present in the report": uad_present_str,
        "UAD Pages Present in the Report": uad_present_str,
        "UAD Pages Present": "Yes" if has_uad_pages else "No",
        "UAD Pages": uad_present_str,
        "UAD Definitions Addendum": uad_present_str,
        "UAD Dataset Pages": uad_present_str,
        "has_uad_pages": has_uad_pages,
        "uad_pages": uad_pages,
        "uad_details": uad_details,
        "Limiting Conditions": uad_details.get("limiting_conditions_presence", "Not Present"),
        "Statement of Assumptions and Limiting Conditions": uad_details.get("limiting_conditions_presence", "Not Present"),
        "limiting_conditions_pages": uad_details.get("limiting_conditions_pages", []),
        "limiting_conditions_presence": uad_details.get("limiting_conditions_presence", "Not Present"),
        "Appraiser's Certification": uad_details.get("certification_presence", "Not Present"),
        "Appraiser Certification": uad_details.get("certification_presence", "Not Present"),
        "certification_pages": uad_details.get("certification_pages", []),
        "certification_presence": uad_details.get("certification_presence", "Not Present"),
        "UAD Details": uad_details.get("details_summary", ""),
        "Invoice Attached": inv_present_str,
        "Invoice Present": inv_present_str,
        "has_invoice": has_invoice,
        "FHA Case No.": fha_case_no,
        "FHA Case #": fha_case_no,
        "FHA Case Number": fha_case_no,
        "Full Address": full_addr,
        "Property Address": prop_addr,
        "Unit #": unit_id or subj_unit_id,
        "Unit Number": unit_id or subj_unit_id,
        "Unit": unit_id or subj_unit_id,
        "Project Name": subj_project_name,
        "Phase": subj_project_phase,
        "Project Name and Phase": subj_project_name_phase,
        "City": prop_city,
        "County": prop_county,
        "State": prop_state,
        "Zip Code": prop_zip,
        "Borrower": borrower_name,
        "Owner of Public Record": owner_name,
        "Legal Description": legal_desc,
        "Assessor's Parcel #": apn,
        "Tax Year": tax_year,
        "R.E. Taxes $": taxes,
        "Special Assessments $": special_taxes,
        "Neighborhood Name": nb_name,
        "Map Reference": map_ref,
        "Census Tract": census,
        "Occupant": prop_occupancy,
        "Project Type (if applicable):-  PUD  / Condominium / Cooperative / Other (describe)": p_type if p_type else ("PUD" if pud_indicator == "Yes" else ""),
        "Project Type (if applicable)": p_type if p_type else ("PUD" if pud_indicator == "Yes" else ""),
        "Project Type": p_type if p_type else ("PUD" if pud_indicator == "Yes" else ""),
        "PUD": pud_indicator,
        "HOA $": hoa_fee,
        "HOA(per month)": pud_fee_month,
        "HOA (per month)": pud_fee_month,
        "HOA(per year)": pud_fee_year,
        "HOA (per year)": pud_fee_year,
        "Property Rights Appraised": prop_rights,
        "Assignment Type": assignment_type,
        "Lender/Client": lender_name,
        "Address (Lender/Client)": lender_address,
        "Lender Address": lender_address,
        "Offered for Sale in Last 12 Months": offered_12m,
        "Report data source(s) used, offering price(s), and date(s)": report_data_source,
        "ANSI": ansi_comment,
        "ANSI Standards": ansi_comment,
        "ANSI Comment": ansi_comment,
        "Exposure comment": exposure_comment,
        "Exposure Comment": exposure_comment,
        "Reasonable Exposure Time": exposure_comment,
        "Reasonable Exposure Time Comment": exposure_comment,
        "Prior service comment": prior_service_comment,
        "Prior Service Comment": prior_service_comment,
        "USPAP Reporting Option": uspap_reporting_option,
        "USPAP Reporting Options": uspap_reporting_option,
        uspap_long_key: uspap_reporting_option,
        "This report was prepared under the following USPAP reporting option:": uspap_reporting_option,
        "Comments on Appraisal and Report Identification": uspap_comment,
        "Restricted Appraisal Report Comment": uspap_comment,
        "ADU File Check": adu_check,
        "Smoke detector comment": smoke_comment,
        "CO detector comment": co_comment,
        "Water heater double-strapped comment": water_heater_comment,
        "Water Heater Double-Strapped Comment": water_heater_comment,
        "Water Heater Double Strapped Comment": water_heater_comment,
        "File #": file_id,
        "Loan #": loan_num,
        "From Type": form_type,
    }

    contract_section = {
        "Assignment Type": assignment_type,
        "I did did not analyze the contract for sale for the subject purchase transaction. Explain the results of the analysis of the contract for sale or why the analysis was not performed.": contract_comment,
        "Contract Price $": contract_price,
        "Date of Contract": contract_date,
        "Is property seller owner of public record?": seller_is_owner,
        "Data Source(s)": contract_data_source,
        "Data Source(s) (Contract)": contract_data_source,
        "Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?": concessions,
        "If Yes, report the total dollar amount and describe the items to be paid": concessions_text,
        "If Yes, report the total dollar amount and describe the items to be paid.": concessions_text,
        "Financial Assistance Comment": concessions_text,
        "I did did not analyze the manufacturer’s invoice. Explain the results of the analysis of the manufacturer’s invoice or why the analysis was not performed.": invoice_comment,
        "I did did not analyze the manufacturer's invoice. Explain the results of the analysis of the manufacturer's invoice or why the analysis was not performed.": invoice_comment,
        "Retailer's Name (New Construction)": retailer_name,
        "Retailer's Name": retailer_name,
        "Retailer Name": retailer_name,
    }

    if not other_land_use_desc or other_land_use_desc.strip().lower() in ["", "other", "see addendum", "see attached", "see addenda", "n/a", "none", "see narrative", "see comments", "unknown"]:
        extracted_other_comment = _extract_other_land_use_comment(
            full_narrative=full_narrative,
            dom_narratives=dom_narratives,
            nb_texts=[nb_bound, nb_desc, nb_mkt, addendum_text],
            other_percent=other_use,
            root=root
        )
        if extracted_other_comment:
            other_land_use_desc = extracted_other_comment

    over_under_comment = _extract_over_under_improvement_comment(
        full_narrative=full_narrative,
        dom_narratives=dom_narratives,
        root=root
    )

    neighborhood_section = {
        "Neighborhood Name": nb_name,
        "Location": nb_loc,
        "Built-Up": nb_built,
        "Growth": nb_growth,
        "Property Values": nb_val,
        "Demand/Supply": nb_demand,
        "Marketing Time": nb_mkt_time,
        "One-Unit": one_unit,
        "2-4 Unit": two_four_unit,
        "Multi-Family": multi_family,
        "Commercial": commercial,
        "Other": other_use,
        "Present Land Use for other": other_land_use_desc,
        "one unit housing price(high,low,pred)": housing_price,
        "ONE UNIT HOUSING PRICE(HIGH,LOW,PRED)": housing_price,
        "one unit housing age(high,low,pred)": housing_age,
        "condominium housing price(high,low,pred)": housing_price,
        "CONDOMINIUM HOUSING PRICE(HIGH,LOW,PRED)": housing_price,
        "condominium housing age(high,low,pred)": housing_age,
        "CONDOMINIUM HOUSING AGE(HIGH,LOW,PRED)": housing_age,
        "Condominium Housing Price High": h_high,
        "Condominium Housing Price Low": h_low,
        "Condominium Housing Price Pred": h_pred,
        "Condominium Housing Age High": h_oldest,
        "Condominium Housing Age Low": h_newest,
        "Condominium Housing Age Pred": h_pred_age,
        "Housing Price High": h_high,
        "Housing Price Low": h_low,
        "Housing Price Pred": h_pred,
        "Housing Age High": h_oldest,
        "Housing Age Low": h_newest,
        "Housing Age Pred": h_pred_age,
        "Over/Under-Improvement Comment": over_under_comment,
        "Predominant Price Commentary": over_under_comment,
        "Neighborhood Boundaries": nb_bound,
        "Neighborhood Description": nb_desc,
        "Market Conditions": nb_mkt,
        "Market Conditions:": nb_mkt,
    }

    nonconforming_comment = ""
    is_nonconforming = "nonconforming" in (zoning_comp or "").lower() or "grandfathered" in (zoning_comp or "").lower()
    if is_nonconforming:
        nonconforming_comment = _extract_nonconforming_rebuild_comment(
            full_narrative=full_narrative,
            dom_narratives=dom_narratives,
            root=root
        )

    site_section = {
        "Topography": site_topography,
        "Size": site_size,
        "Density": site_density,
        "TOPOGRAPHY": site_topography,
        "SIZE": site_size,
        "DENSITY": site_density,
        "Dimensions": site_dim,
        "Area": site_area,
        "Shape": site_shape,
        "View": site_view,
        "Specific Zoning Classification": zoning_class,
        "Zoning Description": zoning_desc,
        "Zoning Compliance": zoning_comp,
        "Legal Nonconforming (Grandfathered Use) comment": nonconforming_comment,
        "Legal Nonconforming comment": nonconforming_comment,
        "Nonconforming comment": nonconforming_comment,
        "Zoning Compliance comment": nonconforming_comment,
        "Is the highest and best use of subject property as improved (or as proposed per plans and specifications) the present use?": hbu,
        "Highest & Best Use": hbu,
        "Electricity": util_dict.get("Electricity", ""),
        "Gas": util_dict.get("Gas", ""),
        "Water": util_dict.get("Water", ""),
        "Sanitary Sewer": util_dict.get("Sanitary Sewer", ""),
        "Street": street_val,
        "Alley": alley_val,
        "Is the site size, shape and topography generally conforming to and acceptable in the market area? Yes No If No, explain": site_conforming_desc or site_conforming,
        "Is the site size, shape and topography generally conforming to and acceptable in the market area?": site_conforming or (site_conforming_desc.split(":")[0].strip() if site_conforming_desc else ""),
        "Is there adequate vehicular access to the subject property? Yes No If No, describe": street_access_desc or street_access,
        "Is there adequate vehicular access to the subject property?": street_access or (street_access_desc.split(":")[0].strip() if street_access_desc else ""),
        "Is the street properly maintained? Yes No If No, describe": street_maintained_desc or street_maintained,
        "Is the street properly maintained?": street_maintained or (street_maintained_desc.split(":")[0].strip() if street_maintained_desc else ""),
        "FEMA Special Flood Hazard Area": fema_special,
        "FEMA Flood Zone": fema_zone,
        "FEMA Map #": fema_map_id,
        "FEMA Map Date": fema_map_date,
        "Are the utilities and off-site improvements typical for the market area?": util_typical or (util_typical_desc.split(":")[0].strip() if util_typical_desc else ""),
        "Are the utilities and off-site improvements typical for the market area? If No, describe": util_typical_desc or util_typical,
        "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? If Yes, describe": adverse_site_desc or (f"{adverse_site}: {adverse_site_comment}" if adverse_site and adverse_site_comment else (adverse_site or adverse_site_comment)),
        "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? Yes No If Yes, describe": adverse_site_desc or (f"{adverse_site}: {adverse_site_comment}" if adverse_site and adverse_site_comment else (adverse_site or adverse_site_comment)),
        "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)?": adverse_site or (adverse_site_desc.split(":")[0].strip() if adverse_site_desc else ""),
        "Adverse Site Conditions": adverse_site or (adverse_site_desc.split(":")[0].strip() if adverse_site_desc else ""),
        "Adverse Site Conditions Description": adverse_site_desc or (f"{adverse_site}: {adverse_site_comment}" if adverse_site and adverse_site_comment else (adverse_site or adverse_site_comment)),
        "Utilities": utilities_str,
        "Off-site Improvements - Street": street_val,
        "Off-site Improvements - Alley": alley_val,
    }

    # -------------------------------------------------------------
    # IMPROVEMENTS SECTION (100% Dynamic Extraction)
    # -------------------------------------------------------------
    bldg_status_raw = struct_elem.attrib.get("BuildingStatusType", "") if struct_elem is not None else ""
    if "under" in bldg_status_raw.lower():
        bldg_status = "Under Const."
    elif "prop" in bldg_status_raw.lower():
        bldg_status = "Proposed"
    else:
        bldg_status = "Existing"

    is_1004c_report = bool(
        form_type in ("1004C", "1004C + 1007") or
        "1004C" in str(form_type).upper() or
        "MANUFACTURED" in str(form_type).upper()
    )

    living_units = str(units).strip() if units else ""
    if adu_check == "Yes":
        unit_val = "Additions" if is_1004c_report else "One with Accessory Unit"
    elif living_units:
        unit_val = living_units
    else:
        unit_val = ""

    struct_type_val = "Detached" if "det" in struct_type.lower() else ("Attached" if "att" in struct_type.lower() else (struct_type or "Detached"))

    # Attic
    attic_elem = struct_elem.find("ATTIC") if struct_elem is not None else None
    attic_features = []
    if attic_elem is not None and attic_elem.attrib.get("_ExistsIndicator", "Y") != "N":
        for af in attic_elem.findall("ATTIC_FEATURE"):
            t = af.attrib.get("_Type", "")
            if t == "DropStair": attic_features.append("Drop Stair")
            elif t == "Floor": attic_features.append("Floor")
            elif t == "Scuttle": attic_features.append("Scuttle")
            elif t == "Stairs": attic_features.append("Stairs")
            elif t == "Finished": attic_features.append("Finished")
            elif t == "Heated": attic_features.append("Heated")
            elif t == "Other" or af.attrib.get("_OtherIndicator") == "Y":
                desc = (af.attrib.get("_TypeOtherDescription") or af.attrib.get("_Description") or "").strip()
                attic_features.append(f"Other: {desc}" if desc and desc.lower() != "other" else "Other")
            elif t and t != "None": attic_features.append(t)
    attic_val = ", ".join(attic_features) if attic_features else "None"

    # Appliances
    app_list = []
    if struct_elem is not None:
        for ke in struct_elem.findall("KITCHEN_EQUIPMENT"):
            if ke.attrib.get("_ExistsIndicator", "Y") == "Y":
                t = ke.attrib.get("_Type", "")
                desc = (
                    ke.attrib.get("_TypeOtherDescription") or 
                    ke.attrib.get("_OtherDescription") or 
                    ke.attrib.get("_Description") or 
                    ke.attrib.get("_Comment") or ""
                ).strip()
                if t == "RangeOven": app_list.append("Range/Oven")
                elif t == "WasherDryer": app_list.append("Washer/Dryer")
                elif t == "Other" or ke.attrib.get("_OtherIndicator") == "Y":
                    app_list.append(f"Other: {desc}" if desc and desc.lower() != "other" else "Other")
                elif t: app_list.append(t)
    appliances_val = ", ".join(app_list) if app_list else "None"

    # Foundation
    found_elems = []
    if struct_elem is not None:
        found_elems = struct_elem.findall("FOUNDATION")
    if not found_elems and property_elem is not None:
        found_elems = property_elem.findall(".//FOUNDATION")
    if not found_elems:
        found_elems = root.findall(".//FOUNDATION")

    has_partial_declared = any(
        (f.attrib.get("_Type") == "PartialBasement" or 
         "partial" in (f.attrib.get("_Type") or "").lower() or
         "partial" in (f.attrib.get("_ConditionDescription") or "").lower() or
         f.attrib.get("_PartialBasementIndicator") == "Y")
        and f.attrib.get("_ExistsIndicator", "Y") != "N"
        for f in found_elems
    )

    found_types = []
    for f_elem in found_elems:
        if not f_elem.attrib:
            continue
        if f_elem.attrib.get("_ExistsIndicator", "Y") == "N":
            continue

        ft = (f_elem.attrib.get("_Type") or "").strip()
        mat_type = (f_elem.attrib.get("_MaterialType") or "").strip()
        other_desc = (f_elem.attrib.get("_OtherDescription") or "").strip()
        ft_combined = f"{ft} {mat_type}".strip()
        ft_lower = ft_combined.lower()
        cond_desc = (f_elem.attrib.get("_ConditionDescription") or "").strip().lower()

        # Manufactured Home Foundation Types (Form 1004C)
        if "runner" in ft_lower or f_elem.attrib.get("_ConcreteRunnersIndicator") == "Y":
            if "Concrete Runners" not in found_types:
                found_types.append("Concrete Runners")

        if "poured" in ft_lower or f_elem.attrib.get("_PouredConcreteIndicator") == "Y":
            if "Poured Concrete" not in found_types:
                found_types.append("Poured Concrete")

        if "block" in ft_lower or "pier" in ft_lower or f_elem.attrib.get("_BlockAndPierIndicator") == "Y":
            if "Block & Pier" not in found_types:
                found_types.append("Block & Pier")

        if "slab" in ft_lower or f_elem.attrib.get("_ConcreteSlabIndicator") == "Y":
            if "Concrete Slab" not in found_types:
                found_types.append("Concrete Slab")

        if "crawl" in ft_lower or f_elem.attrib.get("_CrawlSpaceIndicator") == "Y":
            if "Crawl Space" not in found_types:
                found_types.append("Crawl Space")

        if "partial" in ft_lower or "partial" in cond_desc or f_elem.attrib.get("_PartialBasementIndicator") == "Y":
            if "Partial Basement" not in found_types:
                found_types.append("Partial Basement")
        elif "full" in ft_lower or "full" in cond_desc or f_elem.attrib.get("_FullBasementIndicator") == "Y":
            if "Full Basement" not in found_types:
                found_types.append("Full Basement")
        elif ft.lower() == "basement" or mat_type.lower() == "basement":
            if not has_partial_declared and cond_desc != "partial":
                if "Full Basement" not in found_types:
                    found_types.append("Full Basement")

        if "other" in ft_lower or other_desc:
            desc_text = other_desc or f_elem.attrib.get("_OtherDescription", "")
            other_label = f"Other: {desc_text}" if desc_text else "Other-att. description"
            if other_label not in found_types:
                found_types.append(other_label)

    bm_elem = struct_elem.find("BASEMENT") if struct_elem is not None else None
    if bm_elem is None and property_elem is not None:
        bm_elem = property_elem.find(".//BASEMENT")
    if bm_elem is None:
        bm_elem = root.find(".//BASEMENT")

    # If no foundation type matched from FOUNDATION tags but a BASEMENT element with area/percent exists
    if not found_types and bm_elem is not None and (bm_elem.attrib.get("SquareFeetCount") or bm_elem.attrib.get("_FinishedPercent")):
        found_types.append("Full Basement")

    bm_sqft = (bm_elem.attrib.get("SquareFeetCount") or "").strip() if bm_elem is not None else ""
    bm_finish = (bm_elem.attrib.get("_FinishedPercent") or "").strip() if bm_elem is not None else ""
    # if not bm_sqft and ("Concrete Slab" in found_types or "Crawl Space" in found_types) and "Full Basement" not in found_types and "Partial Basement" not in found_types:
    #     bm_sqft = "0"
    found_val = ", ".join(found_types) if found_types else ""

    # Basement Details
    bm_details_list = []
    bm_feat_elems = []
    if bm_elem is not None:
        bm_feat_elems.extend(bm_elem.findall("BASEMENT_FEATURE"))
    if not bm_feat_elems and struct_elem is not None:
        bm_feat_elems.extend(struct_elem.findall(".//BASEMENT_FEATURE"))
    if not bm_feat_elems:
        bm_feat_elems = root.findall(".//BASEMENT_FEATURE")

    for bf in bm_feat_elems:
        if bf.attrib.get("_ExistsIndicator", "Y") == "Y":
            bt = bf.attrib.get("_Type", "")
            if bt == "OutsideEntry":
                if "Outside Entry/Exit" not in bm_details_list:
                    bm_details_list.append("Outside Entry/Exit")
            elif bt and bt not in bm_details_list:
                bm_details_list.append(bt)

    found_feat_elems = []
    if struct_elem is not None:
        found_feat_elems.extend(struct_elem.findall("FOUNDATION_FEATURE"))
    if not found_feat_elems and property_elem is not None:
        found_feat_elems.extend(property_elem.findall(".//FOUNDATION_FEATURE"))
    if not found_feat_elems:
        found_feat_elems = root.findall(".//FOUNDATION_FEATURE")

    for ff in found_feat_elems:
        if ff.attrib.get("_ExistsIndicator", "Y") == "Y" and ff.attrib.get("_Type") == "SumpPump":
            if "Sump Pump" not in bm_details_list:
                bm_details_list.append("Sump Pump")

    bm_details = ", ".join(bm_details_list) if bm_details_list else "None"

    # Evidence of
    evidence_list = []
    if struct_elem is not None:
        for c in struct_elem.findall(".//_CONDITION"):
            if c.attrib.get("_ExistsIndicator") == "Y" or c.attrib.get("_Comment"):
                ct = c.attrib.get("_Type", "")
                if ct in ["Infestation", "Dampness", "Settlement"]:
                    evidence_list.append(ct)
    evidence_val = ", ".join(evidence_list) if evidence_list else "None"

    # Heating & Cooling
    ht_list = []
    hf_list = []
    heat_elems = struct_elem.findall("HEATING") if struct_elem is not None else root.findall(".//HEATING")
    for h in heat_elems:
        f = (h.attrib.get("_FuelDescription") or "").strip()
        if f and f not in hf_list:
            hf_list.append(f)
        
        ht_type = (h.attrib.get("_Type") or "").strip()
        is_other = (
            ht_type.lower() == "other" or 
            h.attrib.get("_OtherIndicator") == "Y"
        )
        ht_other_desc = (
            h.attrib.get("_TypeOtherDescription") or 
            h.attrib.get("_OtherDescription") or 
            h.attrib.get("_UnitDescription") or 
            h.attrib.get("_Description") or 
            h.attrib.get("_Comment") or ""
        ).strip()

        if "warm" in ht_type.lower() or "forced" in ht_type.lower() or ht_type.upper() == "FWA":
            if "FWA" not in ht_list:
                ht_list.append("FWA")
        elif "baseboard" in ht_type.lower() or ht_type.upper() == "HWBB" or "hot water" in ht_type.lower():
            if "HWBB" not in ht_list:
                ht_list.append("HWBB")
        elif "radiant" in ht_type.lower():
            if "Radiant" not in ht_list:
                ht_list.append("Radiant")
        elif is_other:
            desc_str = f"Other: {ht_other_desc}" if ht_other_desc and ht_other_desc.lower() != "other" else "Other"
            if desc_str not in ht_list:
                ht_list.append(desc_str)
        elif ht_type and ht_type.lower() not in ["none", ""]:
            if ht_type not in ht_list:
                ht_list.append(ht_type)

    ht_val = ", ".join(ht_list) if ht_list else ""

    hf_val = ""
    hf_raw = ", ".join(hf_list) if hf_list else ""
    if hf_raw:
        if "/" in hf_raw or "," in hf_raw:
            hf_val = hf_raw.strip()
        elif "gas" in hf_raw.lower():
            hf_val = "Gas"
        elif "elec" in hf_raw.lower():
            hf_val = "Electric"
        elif "oil" in hf_raw.lower():
            hf_val = "Oil"
        elif "solar" in hf_raw.lower():
            hf_val = "Solar"
        elif "wood" in hf_raw.lower() or "pellet" in hf_raw.lower():
            hf_val = "Wood/Pellet"
        else:
            hf_val = hf_raw.title() if hf_raw.isupper() else hf_raw.strip()

    cooling_list = []
    cool_elems = struct_elem.findall("COOLING") if struct_elem is not None else root.findall(".//COOLING")
    for c in cool_elems:
        c_central = c.attrib.get("_CentralizedIndicator", "N")
        c_indiv = c.attrib.get("_IndividualIndicator", "N")
        c_other = c.attrib.get("_OtherIndicator", "N")
        c_type = (c.attrib.get("_Type") or "").strip()
        c_desc = (
            c.attrib.get("_TypeOtherDescription") or 
            c.attrib.get("_UnitDescription") or 
            c.attrib.get("_Description") or 
            c.attrib.get("_Comment") or ""
        ).strip()

        if c_central == "Y" or "central" in c_type.lower():
            if "Central Air Conditioning" not in cooling_list:
                cooling_list.append("Central Air Conditioning")
        if c_indiv == "Y" or "individual" in c_type.lower():
            if "Individual" not in cooling_list:
                cooling_list.append("Individual")
        if c_other == "Y" or c_type.lower() == "other" or (c_desc and c_central != "Y" and c_indiv != "Y" and "central" not in c_type.lower() and "individual" not in c_type.lower()):
            desc_str = f"Other: {c_desc}" if c_desc and c_desc.lower() != "other" else "Other"
            if desc_str not in cooling_list:
                cooling_list.append(desc_str)
        elif c_type and c_type.lower() not in ["none", ""]:
            if c_type not in cooling_list:
                cooling_list.append(c_type)

    cooling_val = ", ".join(cooling_list) if cooling_list else ""

    # Exterior Features (Material / Condition)
    ext_dict = {ef.attrib.get("_Type", ""): ef.attrib.get("_Description", "") for ef in struct_elem.findall("EXTERIOR_FEATURE")} if struct_elem is not None else {}
    found_walls = _format_mat_cond(ext_dict.get("Foundation", ""))
    skirting = _format_mat_cond(ext_dict.get("Skirting", ""))
    ext_walls = _format_mat_cond(ext_dict.get("Walls", ""))
    roof_surf = _format_mat_cond(ext_dict.get("RoofSurface", ""))
    gutters = _format_mat_cond(ext_dict.get("GuttersAndDownspouts", ""))
    window_type = _format_mat_cond(ext_dict.get("WindowType", ""))
    storm_sash_raw = ext_dict.get("WindowStormSash", "")
    storm_sash = _format_mat_cond(storm_sash_raw) if storm_sash_raw else ""
    screens_raw = ext_dict.get("WindowScreens", "")
    screens = _format_mat_cond(screens_raw) if screens_raw else ""

    # Amenities
    amenities_list = []
    amenity_details = {}
    if struct_elem is not None:
        for am in struct_elem.findall("AMENITY"):
            at = am.attrib.get("_Type", "")
            ex = am.attrib.get("_ExistsIndicator", "N")
            cnt = am.attrib.get("_Count", "0")
            desc = (
                am.attrib.get("_DetailedDescription") or 
                am.attrib.get("_TypeOtherDescription") or 
                am.attrib.get("_OtherDescription") or 
                am.attrib.get("_Description") or 
                am.attrib.get("_Comment") or ""
            ).strip()
            if at == "WoodStove" and (ex == "Y" or cnt not in ["0", ""] or (desc and desc.lower() not in ["none", "no"])):
                detail = desc or (cnt if cnt not in ["0", ""] else "")
                item = f"WoodStove: {detail}" if detail and detail.lower() not in ["none", "no", "woodstove"] else "WoodStove"
                amenities_list.append(item)
                amenity_details["Woodstove(s) #"] = cnt or detail or "1"
            elif at == "Fireplace" and (ex == "Y" or cnt not in ["0", ""] or (desc and desc.lower() not in ["none", "no"])):
                detail = desc or (cnt if cnt not in ["0", ""] else "")
                item = f"Fireplace: {detail}" if detail and detail.lower() not in ["none", "no", "fireplace"] else "Fireplace"
                amenities_list.append(item)
                amenity_details["Fireplace(s) #"] = cnt if cnt not in ["0", ""] else (detail or "1")
            elif at == "Fence" and (ex == "Y" or (desc and desc.lower() not in ["none", "no"])):
                item = f"Fence: {desc}" if desc and desc.lower() not in ["none", "no", "yes", "fence"] else "Fence"
                amenities_list.append(item)
                amenity_details["Fence"] = desc if desc else "Yes"
            elif at in ["Patio", "Deck"] and (ex == "Y" or (desc and desc.lower() not in ["none", "no"])):
                item = f"Patio/Deck: {desc}" if desc and desc.lower() not in ["none", "no", "yes", "patio/deck"] else "Patio/Deck"
                amenities_list.append(item)
                amenity_details["Patio/Deck"] = desc if desc else at
            elif at == "Porch" and (ex == "Y" or (desc and desc.lower() not in ["none", "no"])):
                item = f"Porch: {desc}" if desc and desc.lower() not in ["none", "no", "yes"] else "Porch"
                amenities_list.append(item)
                amenity_details["Porch"] = desc if desc else at
            elif at == "Pool" and (ex == "Y" or (desc and desc.lower() not in ["none", "no"])):
                item = f"Pool: {desc}" if desc and desc.lower() not in ["none", "no", "yes", "pool"] else "Pool"
                amenities_list.append(item)
                amenity_details["Pool"] = desc if desc else "Yes"
            elif at == "Other" or am.attrib.get("_OtherIndicator") == "Y":
                if ex == "Y" or (desc and desc.lower() not in ["none", "no"]):
                    desc_str = f"Other: {desc}" if desc and desc.lower() != "other" else "Other"
                    amenities_list.append(desc_str)
                    amenity_details["Other Amenities"] = desc if desc else "Yes"
                    amenity_details["Other"] = desc if desc else "Yes"
    amenities_val = ", ".join(dict.fromkeys(amenities_list)) if amenities_list else "None"

    # Interior Features (Material / Condition)
    int_dict = {ifeat.attrib.get("_Type", ""): ifeat.attrib.get("_ConditionDescription", "") for ifeat in struct_elem.findall("INTERIOR_FEATURE")} if struct_elem is not None else {}
    floors = _format_mat_cond(int_dict.get("Floors", ""))
    walls = _format_mat_cond(int_dict.get("Walls", ""))
    trim = _format_mat_cond(int_dict.get("TrimAndFinish", ""))
    bath_floor = _format_mat_cond(int_dict.get("BathroomFloors", ""))
    bath_wainscot = _format_mat_cond(int_dict.get("BathroomWainscot", ""))

    # Car Storage
    driveway_cars = "0"
    garage_cars = "0"
    carport_cars = "0"
    garage_att = ""

    # Check all CAR_STORAGE elements in the entire XML tree
    for cs in root.findall(".//CAR_STORAGE"):
        cs_exists = cs.attrib.get("_ExistsIndicator", "Y")
        if cs_exists == "N":
            driveway_cars = "0"
            garage_cars = "0"
            carport_cars = "0"
            break

        att = cs.attrib.get("_AttachmentType", "") or cs.attrib.get("AttachmentType", "")
        if att and not garage_att:
            a_low = att.lower()
            if "built" in a_low:
                garage_att = "Built-in"
            elif "att" in a_low:
                garage_att = "Attached"
            elif "det" in a_low:
                garage_att = "Detached"
            else:
                garage_att = att

        for loc in cs.findall("CAR_STORAGE_LOCATION"):
            lt = loc.attrib.get("_Type", "")
            cnt = loc.attrib.get("ParkingSpacesCount", "0")
            ex = loc.attrib.get("_ExistsIndicator", "Y")
            loc_att = loc.attrib.get("_AttachmentType", "") or loc.attrib.get("AttachmentType", "")
            if loc_att and not garage_att:
                la_low = loc_att.lower()
                if "built" in la_low:
                    garage_att = "Built-in"
                elif "att" in la_low:
                    garage_att = "Attached"
                elif "det" in la_low:
                    garage_att = "Detached"
            if lt == "Driveway" and ex != "N":
                driveway_cars = cnt
            elif lt == "Garage" and ex != "N":
                garage_cars = cnt
            elif lt == "Carport" and ex != "N":
                carport_cars = cnt

    # Only if garage or carport exists with count > 0 can there be an Att/Det/Built-in attachment
    try:
        g_cars_num = int(float(garage_cars or "0"))
    except Exception:
        g_cars_num = 0
    try:
        c_cars_num = int(float(carport_cars or "0"))
    except Exception:
        c_cars_num = 0

    if g_cars_num == 0 and c_cars_num == 0:
        garage_att = ""

    driveway_surface = ""
    for sf in root.findall(".//SITE_FEATURE"):
        if sf.attrib.get("_Type") == "Driveway":
            driveway_surface = sf.attrib.get("_Comment", "")
    if not driveway_surface:
        driveway_surface = "None"
    else:
        if "/" in driveway_surface:
            driveway_surface = driveway_surface.split("/")[0].strip()
        if driveway_surface.upper() == "CONC":
            driveway_surface = "Concrete"

    cs_types = []
    try:
        d_cnt = int(float(driveway_cars or "0"))
    except Exception:
        d_cnt = 0
    try:
        g_cnt = int(float(garage_cars or "0"))
    except Exception:
        g_cnt = 0
    try:
        c_cnt = int(float(carport_cars or "0"))
    except Exception:
        c_cnt = 0

    if d_cnt > 0:
        cs_types.append("Driveway")
    if g_cnt > 0:
        cs_types.append("Garage")
    if c_cnt > 0:
        cs_types.append("Carport")
    car_storage_val = ", ".join(cs_types) if cs_types else "None"

    # Additional Features & Narratives
    add_features = ""
    cond_comment = ""
    phys_comment = ""
    conf_comment = ""
    phys_ex = ""
    conf_ex = ""
    for pa in root.findall(".//PROPERTY_ANALYSIS"):
        pat = pa.attrib.get("_Type", "")
        if pat == "AdditionalFeatures": add_features = pa.attrib.get("_Comment", "")
        elif pat == "QualityAndAppearance" and not cond_comment: cond_comment = pa.attrib.get("_Comment", "")
        elif pat == "PropertyCondition" and not cond_comment: cond_comment = pa.attrib.get("_Comment", "")
        elif pat == "PhysicalDeficiency":
            phys_ex = pa.attrib.get("_ExistsIndicator", "")
            phys_comment = pa.attrib.get("_Comment", "")
        elif pat == "ConformsToNeighborhood":
            conf_ex = pa.attrib.get("_ExistsIndicator", "")
            conf_comment = pa.attrib.get("_Comment", "")

    # Condition rating for Subject from sales comparison grid
    cond_rating = ""
    for cs in root.findall(".//COMPARABLE_SALE"):
        if cs.attrib.get("PropertySequenceIdentifier") == "0":
            cd = cs.find(".//COMPARISON_DETAIL")
            if cd is not None:
                r = cd.attrib.get("GSEOverallConditionType", "")
                if re.match(r"^C[1-6]$", r, re.IGNORECASE):
                    cond_rating = r.upper()
            break
    if not cond_rating and cond_comment:
        m = re.match(r"^(C[1-6])\b", cond_comment.strip(), re.IGNORECASE)
        if m:
            cond_rating = m.group(1).upper()

    if cond_comment:
        m = re.match(r"^(C[1-6])\b", cond_comment.strip(), re.IGNORECASE)
        if m:
            cond_desc = cond_comment.strip()
        elif cond_rating:
            cond_desc = f"{cond_rating}; {cond_comment.strip()}"
        else:
            cond_desc = cond_comment.strip()
    elif cond_rating:
        cond_desc = cond_rating
    else:
        cond_desc = ""

    phys_desc = ""
    if phys_ex == "N":
        phys_desc = f"No. {phys_comment}".strip(". ") if phys_comment else "No"
    elif phys_ex == "Y":
        phys_desc = f"Yes: {phys_comment}".strip(". ") if phys_comment else "Yes"
    elif phys_comment:
        phys_desc = phys_comment

    if over_under_comment:
        if conf_comment:
            if over_under_comment.lower() not in conf_comment.lower():
                conf_comment = f"{conf_comment}. {over_under_comment}"
        else:
            conf_comment = over_under_comment

    conf_desc = ""
    if conf_ex == "Y":
        conf_desc = f"Yes. {conf_comment}".strip(". ") if conf_comment else "Yes"
    elif conf_ex == "N":
        conf_desc = f"No: {conf_comment}".strip(". ") if conf_comment else "No"
    elif conf_comment:
        conf_desc = conf_comment

    recon_elem = root.find(".//_RECONCILIATION")
    coa = root.find(".//_CONDITION_OF_APPRAISAL")
    reconcil_status = "As Is"
    if coa is not None and coa.attrib.get("_Type"):
        coa_type_str = coa.attrib.get("_Type", "").strip()
        coa_lower = coa_type_str.lower()
        if "repair" in coa_lower:
            reconcil_status = "Subject to repairs"
        elif "completion" in coa_lower:
            reconcil_status = "Subject to completion"
        elif "inspection" in coa_lower:
            reconcil_status = "Subject to inspection"
        elif "subject" in coa_lower:
            reconcil_status = "Subject To"
        else:
            reconcil_status = "As Is"
    elif recon_elem is not None and recon_elem.attrib.get("_ConditionsComment"):
        cond_text = recon_elem.attrib.get("_ConditionsComment", "").lower()
        if re.search(r'\bsubject\s+to\b', cond_text) and not re.search(r'\b(?:as\s+is|as-is)\b', cond_text):
            if re.search(r'subject\s+to\s+(?:the\s+following\s+)?repairs?', cond_text):
                reconcil_status = "Subject to repairs"
            elif re.search(r'subject\s+to\s+completion', cond_text):
                reconcil_status = "Subject to completion"
            elif re.search(r'subject\s+to\s+(?:the\s+following\s+)?(?:required\s+)?inspection', cond_text):
                reconcil_status = "Subject to inspection"
            else:
                reconcil_status = "Subject To"

    conditions_comment = ""
    if recon_elem is not None:
        conditions_comment = recon_elem.attrib.get("_ConditionsComment", "").strip()
        conditions_comment = re.sub(r'^[:\s]+', '', conditions_comment).strip()
    if not conditions_comment and coa is not None:
        conditions_comment = coa.attrib.get("_Comment", "").strip()

    reconciliation_long_key = 'This appraisal is made "as is", subject to completion per plans and specifications on the basis of a hypothetical condition that the improvements have been completed, subject to the following repairs or alterations on the basis of a hypothetical condition that the repairs or alterations have been completed, or subject to the following required inspection based on the extraordinary assumption that the condition or deficiency does not require alteration or repair:'

    improvements_section = {
        # General Description
        "# of Units": unit_val,
        "Number of Units": unit_val,
        "Units": unit_val,
        "One with Accessory Unit": adu_check if adu_check else "No",
        "# of Stories": stories,
        "Type": struct_type_val,
        "Property Type": struct_type_val,
        "Status": bldg_status,
        "Existing/Proposed/Under Const.": bldg_status,
        "Construction Status": bldg_status,
        "Design (Style)": design_style,
        "Design Style": design_style,
        "Year Built": year_built,
        "Effective Age (Yrs)": effective_age,
        "Effective Age": effective_age,
        "Attic": attic_val,
        "Appliances": appliances_val,

        # Foundation
        "Foundation": found_val,
        "Foundation Type": found_val,
        "Poured Concrete / Concrete Runners / Block & Pier / Other-att. description / Full Basement / Partial Basement": found_val,
        "Poured Concrete": "Yes" if "Poured Concrete" in found_types else "No",
        "Concrete Runners": "Yes" if "Concrete Runners" in found_types else "No",
        "Block & Pier": "Yes" if "Block & Pier" in found_types else "No",
        "Full Basement": "Yes" if "Full Basement" in found_types else "No",
        "Partial Basement": "Yes" if "Partial Basement" in found_types else "No",
        "Concrete Slab": "Yes" if "Concrete Slab" in found_types else "No",
        "Crawl Space": "Yes" if "Crawl Space" in found_types else "No",
        "Basement Area sq.ft.": bm_sqft,
        "Basement Area": bm_sqft,
        "Basement Finish %": f"{bm_finish}%" if bm_finish != "" and not bm_finish.endswith("%") else bm_finish,
        "Basement Finish": f"{bm_finish}%" if bm_finish != "" and not bm_finish.endswith("%") else bm_finish,
        "Basement Details": bm_details,
        "Evidence of": evidence_val,
        "Evidence of (Foundation)": evidence_val,
        "Infestation": "Yes" if "Infestation" in evidence_val else "No",
        "Dampness": "Yes" if "Dampness" in evidence_val else "No",
        "Settlement": "Yes" if "Settlement" in evidence_val else "No",
        "Heating": ht_val,
        "Heating Type": ht_val,
        "Fuel": hf_val,
        "Heating Fuel": hf_val,
        "Cooling": cooling_val,
        "Cooling Type": cooling_val,
        "Water heater double-strapped comment": water_heater_comment,
        "Water Heater Double-Strapped Comment": water_heater_comment,
        "Water Heater Double Strapped Comment": water_heater_comment,

        # Exterior Description (Material/Condition)
        "Foundation Walls (Material/Condition)": found_walls,
        "Foundation Walls": found_walls,
        "Skirting (Material/Condition)": skirting,
        "Skirting": skirting,
        "Exterior Walls (Material/Condition)": ext_walls,
        "Exterior Walls": ext_walls,
        "Roof Surface (Material/Condition)": roof_surf,
        "Roof Surface": roof_surf,
        "Gutters & Downspouts (Material/Condition)": gutters,
        "Gutters & Downspouts": gutters,
        "Window Type (Material/Condition)": window_type,
        "Window Type": window_type,
        "Storm Sash/Insulated": storm_sash,
        "Storm Sash": storm_sash,
        "Screens": screens,
        "Amenities": amenities_val,
        "Woodstove(s) #": amenity_details.get("Woodstove(s) #", "0"),
        "Fireplace(s) #": amenity_details.get("Fireplace(s) #", "0"),
        "Fence": amenity_details.get("Fence", "None"),
        "Patio/Deck": amenity_details.get("Patio/Deck", "None"),
        "Porch": amenity_details.get("Porch", "None"),
        "Pool": amenity_details.get("Pool", "None"),
        "Other Amenities": amenity_details.get("Other Amenities", "None"),

        # Interior (Material/Condition)
        "Floors (Material/Condition)": floors,
        "Floors": floors,
        "Walls (Material/Condition)": walls,
        "Walls": walls,
        "Trim/Finish (Material/Condition)": trim,
        "Trim/Finish": trim,
        "Bath Floor (Material/Condition)": bath_floor,
        "Bath Floor": bath_floor,
        "Bath Wainscot (Material/Condition)": bath_wainscot,
        "Bath Wainscot": bath_wainscot,

        # Car Storage
        "Car Storage": car_storage_val,
        "Driveway # of Cars": driveway_cars,
        "Driveway Cars": driveway_cars,
        "Driveway": driveway_cars,
        "Driveway Surface": driveway_surface,
        "Garage # of Cars": garage_cars,
        "Garage Cars": garage_cars,
        "Garage": garage_cars,
        "Carport # of Cars": carport_cars,
        "Carport Cars": carport_cars,
        "Carport": carport_cars,
        "Att./Det./Built-in": garage_att,
        "Garage Att./Det./Built-in": garage_att,
        "ATT./DET./BUILT-IN": garage_att,

        # Finished Area Above Grade & Additional Features
        "Finished area above grade Rooms": total_rooms,
        "Rooms": total_rooms,
        "Finished area above grade Bedrooms": bedrooms,
        "Bedrooms": bedrooms,
        "Finished area above grade Bath(s)": baths,
        "Bath(s)": baths,
        "Finished area above grade Baths": baths,
        "Baths": baths,
        "Square Feet of Gross Living Area Above Grade": gba,
        "Gross Living Area": gba,
        "Gross Living Area: square feet": gba,
        "Square Feet of Gross Living Area": gba,
        "Additional features": add_features if add_features else "None",
        "Additional features (special energy efficient items, etc.)": add_features if add_features else "None",
        "Additional features (special energy efficient items, etc.).": add_features if add_features else "None",

        # Narrative Comments
        "Describe the condition of the property": cond_desc,
        "Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)": cond_desc,
        "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe": phys_desc,
        "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property?": phys_desc,
        "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)? If No, describe": conf_desc,
        "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)? If Yes, describe": conf_desc,
        "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?If Yes, describe": conf_desc,
        "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?": conf_desc,
        "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)Yes/NO If No, describe:": conf_desc,
        "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.) Yes/No If No, describe": conf_desc,
        "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)? comment": conf_comment or over_under_comment,
        "Neighborhood Conformance Comment": conf_comment or over_under_comment,
        "If No, describe": conf_comment if conf_ex == "N" else ("N/A" if conf_ex == "Y" else (conf_comment or "")),
        "Comments on Improvements": over_under_comment,
        "one unit housing price(high,low,pred)": housing_price,
        "ONE UNIT HOUSING PRICE(HIGH,LOW,PRED)": housing_price,
        "Over/Under-Improvement Comment": over_under_comment,
        "Predominant Price Commentary": over_under_comment,
    }

    # Manufactured Home (Form 1004C) extraction
    manuf_elem = root.find(".//MANUFACTURED_HOME")
    if manuf_elem is None and property_elem is not None:
        manuf_elem = property_elem.find(".//MANUFACTURED_HOME")
    data_ident_elem = root.find(".//DATA_IDENTIFICATION")

    hud_data_plate = ""
    hud_data_plate_loc = ""
    hud_cert_label = ""
    hud_cert_label_num = ""
    hud_cl_desc = ""
    serial_vin = ""
    manufacturer_name = ""
    model_name = ""
    manufacture_date = ""
    meets_hud_req = ""
    m_hud_req_desc = ""
    meets_hud_req_full = ""
    sections_count = ""
    foundation_attached = ""
    foundation_manner = ""
    wheels_removed = ""
    wheels_desc = ""
    utilities_connected = ""
    conn_desc = ""
    interior_acceptable = ""
    space_desc = ""
    modifications_desc = ""
    installer_name = ""
    installed_date = ""
    model_year = ""
    quality_criteria = ""
    section_one = ""
    section_two = ""
    section_three = ""
    section_four = ""
    section_dims = []

    if manuf_elem is not None:
        hud_dp_ind = manuf_elem.attrib.get("_HUDDataPlateAttachedIndicator", "")
        hud_data_plate = "Yes" if hud_dp_ind.upper() == "Y" else ("No" if hud_dp_ind.upper() == "N" else hud_dp_ind)
        hud_data_plate_loc = manuf_elem.attrib.get("_HUDDataPlateDataSourceDescription", "")

        hud_cl_ind = manuf_elem.attrib.get("_HUDCertificationLabelAttachedIndicator", "")
        hud_cert_label = "Yes" if hud_cl_ind.upper() == "Y" else ("No" if hud_cl_ind.upper() == "N" else hud_cl_ind)
        hud_cert_label_num = manuf_elem.attrib.get("_HUDCertificationLabelIdentifier", "")
        serial_vin = manuf_elem.attrib.get("_SerialNumberIdentifier", "")
        manufacturer_name = manuf_elem.attrib.get("_MakeIdentifier", "")
        model_name = manuf_elem.attrib.get("_ModelIdentifier", "")
        raw_mdate = manuf_elem.attrib.get("_ManufactureDate", "") or manuf_elem.attrib.get("_ManufacturedYear", "")
        manufacture_date = _format_date(raw_mdate) if raw_mdate else ""

        m_hud_req = manuf_elem.attrib.get("_MeetsHUDRequirementsForLocationIndicator", "")
        meets_hud_req = "Yes" if m_hud_req.upper() == "Y" else ("No" if m_hud_req.upper() == "N" else m_hud_req)
        m_hud_req_desc = (manuf_elem.attrib.get("_MeetsHUDRequirementsForLocationDescription") or "").strip()
        meets_hud_req_full = f"{meets_hud_req}: {m_hud_req_desc}" if (meets_hud_req and m_hud_req_desc) else (m_hud_req_desc or meets_hud_req)
        sections_count = manuf_elem.attrib.get("_SectionCount", "")

        m_att_found = manuf_elem.attrib.get("_AttachedToFoundationIndicator", "")
        foundation_attached = "Yes" if m_att_found.upper() == "Y" else ("No" if m_att_found.upper() == "N" else m_att_found)
        foundation_manner = (manuf_elem.attrib.get("_AttachedToFoundationDescription") or "").strip()

        m_wh_rem = manuf_elem.attrib.get("_WheelsRemovedIndicator", "")
        wheels_removed = "Yes" if m_wh_rem.upper() == "Y" else ("No" if m_wh_rem.upper() == "N" else m_wh_rem)
        wheels_desc = (manuf_elem.attrib.get("_WheelsDescription") or "").strip()

        m_conn_util = manuf_elem.attrib.get("_ConnectedToUtilitiesIndicator", "")
        utilities_connected = "Yes" if m_conn_util.upper() == "Y" else ("No" if m_conn_util.upper() == "N" else m_conn_util)
        conn_desc = (manuf_elem.attrib.get("_ConnectionToUtilitiesDescription") or "").strip()

        m_space_acc = manuf_elem.attrib.get("_InteriorSpaceAcceptableToMarketIndicator", "")
        interior_acceptable = "Yes" if m_space_acc.upper() == "Y" else ("No" if m_space_acc.upper() == "N" else m_space_acc)
        space_desc = (manuf_elem.attrib.get("_InteriorSpaceAcceptabilityToMarketDescription") or "").strip()

        hud_cl_desc = (manuf_elem.attrib.get("_HUDCertificationLabelDataSourceDescription") or "").strip()

        modifications_desc = manuf_elem.attrib.get("_ModificationsDescription", "")
        installer_name = manuf_elem.attrib.get("_InstallerName", "")
        installed_date = manuf_elem.attrib.get("_InstalledDate", "")
        model_year = manuf_elem.attrib.get("_ModelYear", "")

        q_elem = manuf_elem.find("_QUALITY")
        if q_elem is not None:
            q_cond = q_elem.attrib.get("RatingConditionType", "")
            q_ds = q_elem.attrib.get("DataSourceDescription", "")
            quality_criteria = f"{q_cond} / {q_ds}".strip(" /")

        for sec in manuf_elem.findall("_SECTION"):
            s_type = sec.attrib.get("_Type", "")
            s_w = sec.attrib.get("WidthFeetCount", "").strip()
            s_d = sec.attrib.get("DepthFeetCount", "").strip()
            s_sqft = sec.attrib.get("SquareFeetCount", "").strip()
            if s_w or s_d or s_sqft:
                sec_str = f"{s_w} x {s_d} ({s_sqft} sq.ft.)" if (s_w and s_d) else (s_sqft or "")
                section_dims.append(f"{s_type}: {sec_str}")
                if "one" in s_type.lower(): section_one = sec_str
                elif "two" in s_type.lower(): section_two = sec_str
                elif "three" in s_type.lower(): section_three = sec_str
                elif "four" in s_type.lower(): section_four = sec_str

    nada_edition = ""
    cost_data_comment = ""
    if data_ident_elem is not None:
        nada_m = data_ident_elem.attrib.get("NADAManufacturedHousingGuideEditionMonth", "")
        nada_y = data_ident_elem.attrib.get("NADAManufacturedHousingGuideEditionYear", "")
        if nada_m or nada_y:
            nada_edition = f"{nada_m}/{nada_y}".strip("/")
        cost_data_comment = data_ident_elem.attrib.get("ManufacturedHomeCostDataComment", "")

    manufactured_home_section = {
        "Is the HUD Data Plate/Compliance Certificate attached to the dwelling?": hud_data_plate,
        "HUD Data Plate Attached": hud_data_plate,
        "HUD Data Plate": hud_data_plate,
        "If Yes, identify the location. If No, provide the data source(s) for the HUD Data Plate/Compliance Certificate information.": hud_data_plate_loc,
        "HUD Data Plate Location": hud_data_plate_loc,
        "Is a HUD Certification Label attached to the exterior of each section of the dwelling?": hud_cert_label,
        "HUD Certification Label Attached": hud_cert_label,
        "If No, provide the data source(s) for the HUD Certification Label #’s": hud_cl_desc,
        "HUD Certification Label #(s)": hud_cert_label_num,
        "HUD Certification Label": hud_cert_label_num,
        "Manufacturer’s Serial #(s)/VIN #(s)": serial_vin,
        "Manufacturer's Serial #(s)/VIN #(s)": serial_vin,
        "Serial # / VIN": serial_vin,
        "Serial Number / VIN": serial_vin,
        "Manufacturer's Name": manufacturer_name,
        "Manufacturer Name": manufacturer_name,
        "Trade/Model": model_name,
        "Model Name": model_name,
        "Date of Manufacture": manufacture_date,
        "Manufacture Date": manufacture_date,
        "Do the Wind, Roof Load, and Thermal Zones meet the minimum HUD requirements for the location of the subject property?": meets_hud_req,
        "Do the Wind, Roof Load, and Thermal Zones meet the minimum HUD requirements for the location of the subject property? Yes No If No, explain": meets_hud_req_full,
        "Meets HUD Requirements For Location": meets_hud_req,
        "Meets HUD Requirements For Location Description": m_hud_req_desc,
        "If No, explain (Wind, Roof Load, and Thermal Zones)": m_hud_req_desc,
        "Wind, Roof Load, and Thermal Zones Explanation": m_hud_req_desc,
        "# of Sections": sections_count,
        "Number of Sections": sections_count,
        "Section Count": sections_count,
        "Is the manufactured home attached to a permanent foundation system?": foundation_attached,
        "Permanent Foundation": foundation_attached,
        "Is the manufactured home attached to a permanent foundation system? Yes No If No, describe the foundation sytem and the manner of attachment.": f"{foundation_attached}: {foundation_manner}" if (foundation_manner and foundation_attached == "No") else foundation_attached,
        "If No, describe the foundation system and the manner of attachment.": foundation_manner,
        "Foundation Attachment Description": foundation_manner,
        "Have the towing hitch, wheels, and axles been removed?": wheels_removed,
        "Have the towing hitch, wheels, and axles been removed? Yes No If No, explain": f"{wheels_removed}: {wheels_desc}" if (wheels_desc and wheels_removed == "No") else wheels_removed,
        "Have the towing hitch, wheels, and axles been removed? explain": wheels_desc,
        "Wheels/Axles Removed Comment": wheels_desc,
        "Wheels Description": wheels_desc,
        "Wheels/Axles Removed": wheels_removed,
        "Connected to Utilities": utilities_connected,
        "Is the manufactured home permanently connected to a septic tank or sewage system and other utilities? Yes No If No, explain": f"{utilities_connected}: {conn_desc}" if (conn_desc and utilities_connected == "No") else utilities_connected,
        "Is the manufactured home permanently connected to a septic tank or sewage system and other utilities? explain": conn_desc,
        "Connected to Utilities Comment": conn_desc,
        "Utilities Connection Description": conn_desc,
        "Is the manufactured home permanently connected to a septic tank or sewage system and other utilities?": utilities_connected,
        "Does the dwelling have sufficient gross living area and room dimensions to be acceptable to the market? Yes No If No, explain": f"{interior_acceptable}: {space_desc}" if (space_desc and interior_acceptable == "No") else interior_acceptable,
        "Does the dwelling have sufficient gross living area and room dimensions to be acceptable to the market? explain": space_desc,
        "Market Acceptability Comment": space_desc,
        "Interior Space Acceptability Description": space_desc,
        "Does the dwelling have sufficient gross living area and room dimensions to be acceptable to the market?": interior_acceptable,
        "Describe any additions or modifications (decks, rooms, remodeling, etc.):": modifications_desc,
        "Describe any additions or modifications (decks, rooms, remodeling, etc.)": modifications_desc,
        "Describe any additions or modifications (decks, rooms, remodeling, etc.": modifications_desc,
        "Additions/Modifications Description": modifications_desc,
        "The appraiser must rate the quality of construction for the subject unit based on objective criteria (such as N.A.D.A. Manufactured Housing Appraisal Guide®, Marshall & Swift Residential Cost Handbook, etc.)": quality_criteria,
        "The appraiser must rate the quality of construction for the subject unit based on objective criteria (such as N.A.D.A. Manufactured Housing Appraisal Guide®, Marshall & Swift Residential Cost Handbook®, or other published cost service).": quality_criteria,
        "Quality Rating (Cost Service)": quality_criteria,
        "Quality Poor Fair Average Good Excellent Identify source of quality rating": quality_criteria,
        "Section One": section_one,
        "Section Two": section_two,
        "Section Three": section_three,
        "Section Four": section_four,
        "Section Dimensions": ", ".join(section_dims),
        "Installer’s Name": installer_name,
        "Date Installed": installed_date,
        "Model Year": model_year,
        "N.A.D.A. Guide Edition": nada_edition,
        "Manufactured Home Cost Data Comment": cost_data_comment,
        "Poured Concrete / Concrete Runners / Block & Pier / Other-att. description / Full Basement / Partial Basement": found_val,
        "Foundation Type": found_val,
        "Foundation": found_val,
        "Skirting": skirting,
        "Skirting (Material/Condition)": skirting,
    }

    if manufactured_home_section and any(manufactured_home_section.values()):
        for mk, mv in manufactured_home_section.items():
            if mv:
                improvements_section.setdefault(mk, mv)

    reconciliation_section = {
        "Indicated Value by: Sales Comparison Approach $": sales_comp_ind_val,
        "Cost Approach (if developed)": cost_indicated_val if (cost_indicated_val and cost_indicated_val != "0") else "",
        "Income Approach (if developed) $": income_ind_val,
        "Income Approach (if developed) $ Comment": f"Gross Rent Multiplier = {income_grm}" if income_grm else "",
        "opinion of the market value, as defined, of the real property that is the subject of this report is $": appraised_val,
        "Final Value $": appraised_val,
        "as of": effective_date,
        "as of date": effective_date,
        "Appraisal Effective Date": effective_date,
        "Effective Date of Appraisal": effective_date,
        "Effective Date": effective_date,
        "Appraiser Name": appraiser_name,
        "Signature Date": signed_date,
        reconciliation_long_key: reconcil_status,
        "Reconciliation Status": reconcil_status,
        "Conditions Comment": conditions_comment,
        "Subject To Comment": conditions_comment,
    }

    income_summary = ""
    if income_elem is not None:
        income_summary = income_elem.attrib.get("_Comment", "")
    if not income_summary and val_methods is not None:
        inc_analysis = val_methods.find("INCOME_ANALYSIS")
        if inc_analysis is not None:
            income_summary = inc_analysis.attrib.get("_Comment", "")
    if not income_summary and mfrs is not None:
        income_summary = mfrs.attrib.get("MarketRentalDataComment", "")
    if not income_summary and full_narrative:
        m_inc_comm = re.search(r'([^.?!;\n]*\bincome\s+approach\b[^.?!;\n]*(?:[.?!]|$))', full_narrative, re.IGNORECASE)
        if m_inc_comm:
            income_summary = m_inc_comm.group(0).strip()

    income_approach_section = {
        "Estimated Monthly Market Rent $": income_rent,
        "Estimated Monthly Market Rent": income_rent,
        "X Gross Rent Multiplier  = $": income_grm,
        "X Gross Rent Multiplier = $": income_grm,
        "Gross Rent Multiplier": income_grm,
        "Indicated Value by Income Approach": income_ind_val,
        "Indicated Value by Income Approach $": income_ind_val,
        "Summary of Income Approach (including support for market rent and GRM) ": income_summary,
        "Summary of Income Approach (including support for market rent and GRM)": income_summary,
        "Summary of Income Approach": income_summary,
    }

    # Fallback to full narrative if cost approach comment is empty
    if not cost_comment and full_narrative:
        m_cost_comm = re.search(r'([^.?!;\n]*\bcost\s+approach\b[^.?!;\n]*(?:[.?!]|$))', full_narrative, re.IGNORECASE)
        if m_cost_comm:
            cost_comment = m_cost_comm.group(0).strip()

    sec_gla_sum = 0
    for _sk in ["SectionOne", "SectionTwo", "SectionThree", "SectionFour"]:
        _sv = sections_1004c[_sk].get("sqft") or sections_1004c[_sk].get("area")
        if _sv:
            try:
                sec_gla_sum += float(str(_sv).replace(",", "").strip())
            except Exception:
                pass
    total_cost_gla = gba or gla_sqft_cost or (f"{int(sec_gla_sum):,}" if sec_gla_sum > 0 else "")

    cost_approach_section = {
        "Provide adequate information for the lender/client to replicate the below cost figures and calculations.": cost_comment,
        "Support for the opinion of site value (summary of comparable land sales or other methods for estimating site value)": cost_site_comment,
        "ESTIMATED COST NEW TYPE": cost_type,
        "Estimated": cost_type,
        "ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW": cost_type,
        "Source of Cost Data": cost_data_source,
        "Source of cost data": cost_data_source,
        "Quality Rating": cost_quality_rating,
        "Quality rating from cost service": cost_quality_rating,
        "Quality rating from cost service ": cost_quality_rating,
        "Effective Date": cost_effective_date,
        "Effective date of cost data": cost_effective_date,
        "Effective date of cost data ": cost_effective_date,
        "Comments on Cost Approach (gross living area calculations, depreciation, etc.)": cost_comment,
        "Remaining Economic Life": cost_economic_life,
        "Estimated Remaining Economic Life (HUD and VA only)": cost_economic_life,
        "OPINION OF SITE VALUE": cost_site_val,
        "OPINION OF SITE VALUE = $ ................................................": cost_site_val,
        "Opinion of Site Value $": cost_site_val,
        "Opinion of Site Value": cost_site_val,
        "DWELLING": dwelling_cost,
        "Dwelling": dwelling_cost,
        "Basement": basement_cost,
        "Deck": deck_cost,
        "Garage/Carport": garage_cost,
        "Garage/Carport ": garage_cost,
        "Total Estimate Cost-New": cost_total_new,
        "Total Estimate of Cost-New = $ ...................": cost_total_new,
        " Total Estimate of Cost-New  = $ ...................": cost_total_new,
        "Estimated Replacement Cost New": cost_total_new,
        "Depreciation": depreciation_cost,
        "Depreciation ": depreciation_cost,
        "Physical Depreciation": deprec_phys_pct,
        "Functional Depreciation": deprec_func_pct,
        "External Depreciation": deprec_ext_pct,
        "Total Depreciation": depreciation_cost,
        "Depreciated Cost of Improvements": cost_depreciated,
        "Depreciated Cost of Improvements......................................................=$ ": cost_depreciated,
        "As-is Value Site Improvements": cost_site_as_is,
        "As is Value Site Improvements": cost_site_as_is,
        "“As-is” Value of Site Improvements......................................................=$": cost_site_as_is,
        "As Is Value of Site Improvements": cost_site_as_is,
        "INDICATED VALUE BY COST APPROACH": cost_indicated_val,
        "Indicated Value By Cost Approach......................................................=$": cost_indicated_val,
        "Indicated Value by Cost Approach": cost_indicated_val,
        "Above Grade Finished Area": gla_sqft_cost,
        "Cost Per Square Foot": price_per_sqft_cost,

        # 1004C Manufactured Home Specific Fields
        "Section One Sq. ft.": sections_1004c["SectionOne"]["sqft"],
        "Section One @ $": sections_1004c["SectionOne"]["rate"],
        "Section One Cost $": sections_1004c["SectionOne"]["cost"],
        "Section One Width": sections_1004c["SectionOne"]["width"],
        "Section One Length": sections_1004c["SectionOne"]["length"],
        "Section One Area Sq. ft.": sections_1004c["SectionOne"]["area"],

        "Section Two Sq. ft.": sections_1004c["SectionTwo"]["sqft"],
        "Section Two @ $": sections_1004c["SectionTwo"]["rate"],
        "Section Two Cost $": sections_1004c["SectionTwo"]["cost"],
        "Section Two Width": sections_1004c["SectionTwo"]["width"],
        "Section Two Length": sections_1004c["SectionTwo"]["length"],
        "Section Two Area Sq. ft.": sections_1004c["SectionTwo"]["area"],

        "Section Three Sq. ft.": sections_1004c["SectionThree"]["sqft"],
        "Section Three @ $": sections_1004c["SectionThree"]["rate"],
        "Section Three Cost $": sections_1004c["SectionThree"]["cost"],
        "Section Three Width": sections_1004c["SectionThree"]["width"],
        "Section Three Length": sections_1004c["SectionThree"]["length"],
        "Section Three Area Sq. ft.": sections_1004c["SectionThree"]["area"],

        "Section Four Sq. ft.": sections_1004c["SectionFour"]["sqft"],
        "Section Four @ $": sections_1004c["SectionFour"]["rate"],
        "Section Four Cost $": sections_1004c["SectionFour"]["cost"],
        "Section Four Width": sections_1004c["SectionFour"]["width"],
        "Section Four Length": sections_1004c["SectionFour"]["length"],
        "Section Four Area Sq. ft.": sections_1004c["SectionFour"]["area"],

        "Additional Item 1 Description": additional_improvements_1004c[0]["description"] if len(additional_improvements_1004c) > 0 else "",
        "Additional Item 1 Cost $": additional_improvements_1004c[0]["cost"] if len(additional_improvements_1004c) > 0 else "",
        "Additional Item 2 Description": additional_improvements_1004c[1]["description"] if len(additional_improvements_1004c) > 1 else "",
        "Additional Item 2 Cost $": additional_improvements_1004c[1]["cost"] if len(additional_improvements_1004c) > 1 else "",
        "Additional Item 3 Description": additional_improvements_1004c[2]["description"] if len(additional_improvements_1004c) > 2 else "",
        "Additional Item 3 Cost $": additional_improvements_1004c[2]["cost"] if len(additional_improvements_1004c) > 2 else "",

        "Total Gross Living Area": total_cost_gla,
        "Total Gross Living Area:": f"{total_cost_gla} Sq. ft." if total_cost_gla else "",
        "N.A.D.A. Data Identification Info: Edition Mo:": nada_month,
        "N.A.D.A. Data Identification Info: Yr:": nada_year,
        "MH State:": nada_state,
        "Region:": nada_region,
        "Size Width ft:": nada_width,
        "Size Length ft:": nada_length,
        "Size:": f"{nada_width} ft. x {nada_length} ft." if (nada_width or nada_length) else "",
        "Gray pg.": nada_grey_pg,
        "White pg.": nada_white_pg,
        "Black SVS pg.": nada_black_pg,
        "15 years and older Conversion Chart pg.": nada_conversion_pg,
        "Yellow pg.": nada_yellow_pg,

        "Sub-total:": cost_subtotal,
        "Sub-total": cost_subtotal,
        "Cost Multiplier (if applicable):": cost_multiplier,
        "ModifiedSub-total:": cost_modified_subtotal,
        "ModifiedSub-total": cost_modified_subtotal,
        "Physical Depreciation or Condition Modifier:": deprec_phys_amt or depreciation_cost,
        "Physical Depreciation Comments:": nada_comment,
        "Comments:": nada_comment,
        "Functional Obsolescence (not used for N.A.D.A.):": deprec_func_amt,
        "External Depreciation or State Location Modifier:": deprec_ext_amt,
        "Delivery, Installation, and Setup (not used for N.A.D.A.):": cost_delivery_setup,
        "Other Depreciated Site Improvements:": cost_other_site_imp,
        "Market Value of Subject Site (as supported above):": cost_site_val,
        "Summary of Cost Approach": cost_comment,
        "sections_1004c": sections_1004c,
        "additional_improvements_1004c": additional_improvements_1004c,
    }

    insp_elem = appraiser_elem.find("INSPECTION") if appraiser_elem is not None else root.find(".//INSPECTION")
    insp_date = insp_elem.attrib.get("InspectionDate", "") if insp_elem is not None else effective_date

    # Supervisory inspection details (strictly from XML)
    sup_insp_none = ""
    sup_insp_ext = ""
    sup_insp_ext_date = ""
    sup_insp_int_ext = ""
    sup_insp_int_ext_date = ""
    sup_comp_none = ""
    sup_comp_yes = ""
    sup_comp_date = ""

    if sup_name.strip() and supervisor_elem is not None:
        for insp in supervisor_elem.findall(".//INSPECTION"):
            pt = insp.attrib.get("AppraisalInspectionPropertyType", "")
            idate = insp.attrib.get("InspectionDate", "")
            if pt == "Subject":
                if idate:
                    sup_insp_int_ext = "Yes"
                    sup_insp_int_ext_date = idate
                    sup_insp_none = "No"
                    sup_insp_ext = "No"
                else:
                    sup_insp_none = "Yes"
                    sup_insp_ext = "No"
                    sup_insp_int_ext = "No"
            elif pt == "Comparable":
                sup_comp_yes = "Yes"
                sup_comp_none = "No"
                if idate:
                    sup_comp_date = idate

    appr_insp_none = ""
    appr_insp_ext = ""
    appr_insp_ext_date = ""
    appr_insp_int_ext = ""
    appr_insp_int_ext_date = ""

    if appraiser_elem is not None:
        for insp in appraiser_elem.findall(".//INSPECTION"):
            pt = insp.attrib.get("AppraisalInspectionPropertyType", "")
            idate = insp.attrib.get("InspectionDate", "")
            itype = insp.attrib.get("AppraisalInspectionType", "").lower()
            if pt == "Subject":
                if "exterior" in itype and "interior" not in itype:
                    appr_insp_ext = "Yes"
                    appr_insp_ext_date = idate
                    appr_insp_none = "No"
                    appr_insp_int_ext = "No"
                elif idate or "interior" in itype:
                    appr_insp_int_ext = "Yes"
                    appr_insp_int_ext_date = idate
                    appr_insp_none = "No"
                    appr_insp_ext = "No"
                else:
                    appr_insp_none = "Yes"
                    appr_insp_ext = "No"
                    appr_insp_int_ext = "No"

    uspap_identification_section = {
        # General / Status (Strictly USPAP fields only)
        "USPAP / Appraisal and Report Identification": uspap_ident_str,
        "Appraisal and Report Identification": uspap_ident_str,
        "USPAP Addendum": uspap_ident_str,
        "has_uspap_identification": has_uspap_ident,
        "has_appraiser_inspection": False,
        "USPAP Reporting Option": uspap_reporting_option,
        uspap_long_key: uspap_reporting_option,
        "This report was prepared under the following USPAP reporting option:": uspap_reporting_option,
        "Reasonable Exposure Time": exposure_comment,
        "Reasonable Exposure Time Comment": exposure_comment,
        "Exposure Comment": exposure_comment,
        "Prior Service Statement": prior_service_comment,
        "Prior service comment": prior_service_comment,
        "Prior Service Comment": prior_service_comment,
        "Comments on Appraisal and Report Identification": uspap_comment,
        "Restricted Appraisal Report Comment": uspap_comment,

        # APPRAISER (extracted from XML/PDF, no hardcoded values)
        "Signature": appraiser_name,
        "Signature Image": appraiser_sig_b64,
        "Appraiser Signature Image": appraiser_sig_b64,
        "Name": appraiser_name,
        "Appraiser Name": appraiser_name,
        "Date Signed": signed_date,
        "Date of Signature and Report": signed_date,
        "Report Signed Date": signed_date,
        "State Certification #": state_cert_no,
        "or State License #": state_lic_no,
        "State": lic_state or appr_state,
        "Expiration Date of Certification or License": lic_exp,
        "Effective Date of Appraisal": effective_date,
        "Effective Date": effective_date,

        # SUPERVISORY APPRAISER: (only if required - real extracted values only)
        "Supervisory Signature": sup_name if sup_name.strip() else "",
        "Supervisory Signature Image": supervisory_sig_b64 if sup_name.strip() else "",
        "Supervisory Name": sup_name if sup_name.strip() else "",
        "Supervisory Date Signed": signed_date if sup_name.strip() else "",
        "Supervisory Date of Signature": signed_date if sup_name.strip() else "",
        "Supervisory State Certification #": sup_cert_no if sup_name.strip() else "",
        "Supervisory or State License #": sup_lic_no if sup_name.strip() else "",
        "Supervisory State": sup_lic_state if sup_name.strip() else "",
        "Supervisory Expiration Date of Certification or License": sup_lic_exp if sup_name.strip() else "",
        "Did not inspect subject property": sup_insp_none if sup_name.strip() else "",
        "Supervisory Did not inspect subject property": sup_insp_none if sup_name.strip() else "",
        "Did inspect exterior of subject property from street": sup_insp_ext if sup_name.strip() else "",
        "Supervisory Did inspect exterior of subject property from street": sup_insp_ext if sup_name.strip() else "",
        "Subject Property Date of Inspection (Exterior)": sup_insp_ext_date if sup_name.strip() else "",
        "Did inspect interior and exterior of subject property": sup_insp_int_ext if sup_name.strip() else "",
        "Supervisory Did inspect interior and exterior of subject property": sup_insp_int_ext if sup_name.strip() else "",
        "Subject Property Date of Inspection (Interior/Exterior)": sup_insp_int_ext_date if sup_name.strip() else "",
        "has_supervisory_inspection": bool(sup_name.strip() and (sup_insp_none or sup_insp_ext or sup_insp_int_ext)),

        # Appraiser Inspection of Subject Property
        "Appraiser Did not inspect subject property": appr_insp_none,
        "Did not inspect subject property (Appraiser)": appr_insp_none,
        "Appraiser Did Not Inspect": appr_insp_none,
        "Appraiser Did inspect exterior of subject property from street": appr_insp_ext,
        "Did inspect exterior of subject property from street (Appraiser)": appr_insp_ext,
        "Appraiser Did Inspect Exterior": appr_insp_ext,
        "Appraiser Did inspect interior and exterior of subject property": appr_insp_int_ext,
        "Did inspect interior and exterior of subject property (Appraiser)": appr_insp_int_ext,
        "Appraiser Did Inspect Interior and Exterior": appr_insp_int_ext,
        "Appraiser Date of Inspection": appr_insp_int_ext_date or appr_insp_ext_date or (insp_date if has_uspap_ident else ""),
        "Appraiser Subject Property Date of Inspection": appr_insp_int_ext_date or appr_insp_ext_date or (insp_date if has_uspap_ident else ""),
        "Date of Inspection (if applicable)": appr_insp_int_ext_date or appr_insp_ext_date or (insp_date if has_uspap_ident else ""),
    }

    certification_section = {
        # Appraiser Fields
        "Signature": appraiser_name,
        "Signature Image": appraiser_sig_b64,
        "Appraiser Signature Image": appraiser_sig_b64,
        "Name": appraiser_name,
        "Appraiser Did not inspect subject property": "",
        "Did not inspect subject property (Appraiser)": "",
        "Appraiser Did Not Inspect": "",
        "Appraiser Did inspect exterior of subject property from street": "",
        "Did inspect exterior of subject property from street (Appraiser)": "",
        "Appraiser Did Inspect Exterior": "",
        "Appraiser Subject Property Date of Inspection (Exterior)": "",
        "Appraiser Did inspect interior and exterior of subject property": "",
        "Did inspect interior and exterior of subject property (Appraiser)": "",
        "Appraiser Did Inspect Interior and Exterior": "",
        "Appraiser Subject Property Date of Inspection (Interior/Exterior)": "",
        "Appraiser Name": appraiser_name,
        "Company Name": appraiser_company,
        "Company Address": appraiser_address,
        "Telephone Number": appraiser_phone,
        "Email Address": appraiser_email,
        "Date of Signature": signed_date,
        "Date of Signature and Report": signed_date,
        "Report Signed Date": signed_date,
        "Effective Date": effective_date,
        "Effective Date of Appraisal": effective_date,
        "State Certification #": state_cert_no,
        "or State License #": state_lic_no,
        "or Other (describe)": "",
        "State #": "",
        "State": lic_state or appr_state,
        "Expiration Date": lic_exp,
        "Expiration Date of Certification or License": lic_exp,
        
        # Supervisory Appraiser Fields
        "Supervisory Signature": sup_name if sup_name.strip() else "",
        "Supervisory Signature Image": supervisory_sig_b64,
        "Supervisory Name": sup_name,
        "Supervisory Company Name": sup_company,
        "Supervisory Company Address": sup_address,
        "Supervisory Telephone Number": sup_phone,
        "Supervisory Email Address": sup_email,
        "Supervisory Date of Signature": signed_date if sup_name.strip() else "",
        "Supervisory State Certification #": sup_cert_no,
        "Supervisory or State License #": sup_lic_no,
        "Supervisory State": sup_lic_state,
        "Supervisory Expiration Date of Certification or License": sup_lic_exp,

        # Property Appraised & Appraised Value
        "Address": full_addr,
        "ADDRESS OF PROPERTY APPRAISED": full_addr,
        "Appraised Value $": appraised_val,
        "APPRAISED VALUE OF SUBJECT PROPERTY $": appraised_val,
        "Appraised Value": appraised_val,

        # Lender / Client
        "LENDER/CLIENT Name": lender_client_name,
        "Lender/Client Name": lender_client_name,
        "Lender/Client": lender_name,
        "Client Name": lender_client_name,
        "Lender Name": lender_name,
        "Lender/Client Company Name": lender_name,
        "Lender/Client Company Address": lender_address,
        "Lender/Client Email Address": lender_email,

        # Subject Property Inspection (Supervisory Appraiser)
        "Did not inspect subject property": sup_insp_none,
        "Did inspect exterior of subject property from street": sup_insp_ext,
        "Subject Property Date of Inspection (Exterior)": sup_insp_ext_date,
        "Did inspect interior and exterior of subject property": sup_insp_int_ext,
        "Subject Property Date of Inspection (Interior/Exterior)": sup_insp_int_ext_date,

        # Comparable Sales Inspection (Supervisory Appraiser)
        "Did not inspect exterior of comparable sales from street": sup_comp_none,
        "Did inspect exterior of comparable sales from street": sup_comp_yes,
        "Comparable Sales Date of Inspection": sup_comp_date,

        # Additional Info & E&O Insurance
        "Appraiser License": lic_id,
        "E&O": "Absent",
        "E&O Present": "Absent",
        "E&O Insurance": "",
        "Policy Period From": "",
        "Policy Period To": "",
        "E&O Insured": "",
        "E&O Carrier": "",
        "E&O Limit": "",
        "E&O Deductible": "",
        "Invoice Attached": inv_present_str,
        "Invoice Present": inv_present_str,
        "has_invoice": has_invoice,
        "UAD pages present in the report": uad_present_str,
        "UAD Pages Present in the Report": uad_present_str,
        "UAD Pages Present": "Yes" if has_uad_pages else "No",
        "UAD Pages": uad_present_str,
        "UAD Definitions Addendum": uad_present_str,
        "UAD Dataset Pages": uad_present_str,
        "has_uad_pages": has_uad_pages,
        "uad_pages": uad_pages,
        "uad_details": uad_details,
        "Limiting Conditions": uad_details.get("limiting_conditions_presence", "Not Present"),
        "Statement of Assumptions and Limiting Conditions": uad_details.get("limiting_conditions_presence", "Not Present"),
        "limiting_conditions_pages": uad_details.get("limiting_conditions_pages", []),
        "limiting_conditions_presence": uad_details.get("limiting_conditions_presence", "Not Present"),
        "Appraiser's Certification": uad_details.get("certification_presence", "Not Present"),
        "Appraiser Certification": uad_details.get("certification_presence", "Not Present"),
        "certification_pages": uad_details.get("certification_pages", []),
        "certification_presence": uad_details.get("certification_presence", "Not Present"),
        "UAD Details": uad_details.get("details_summary", ""),
        "License Valid To": lic_exp,
        "LICENSE/REGISTRATION/CERTIFICATION #": lic_id,

        # Fees & AMC
        "Appraiser's Fee": appraiser_fee,
        "Appraiser Fee": appraiser_fee,
        "Appraisal Fee": appraiser_fee,
        "AMC License #": amc_license,
        "AMC License": amc_license,
        "AMC Name": amc_name,
    }

    # Extract E&O Insurance details and USPAP / Report Identification from embedded PDF document(s) if present
    candidate_doc_texts: List[str] = []

    # 1. Namespace-agnostic element search for all embedded files/documents
    for elem in root.iter():
        tag_u = elem.tag.split("}")[-1].upper()
        if tag_u in ["DOCUMENT", "EMBEDDED_FILE", "OBJECTDATA", "ATTACHMENT"]:
            raw_t = (elem.text or "").strip()
            if len(raw_t) > 500 and raw_t not in candidate_doc_texts:
                candidate_doc_texts.append(raw_t)

    # 2. Regex fallback on raw_xml_text if XML element search didn't find any or was incomplete
    if not candidate_doc_texts and raw_xml_text:
        for m in re.finditer(r"<(?:[A-Za-z0-9_]+:)?(?:DOCUMENT|EMBEDDED_FILE|ObjectData)[^>]*>([A-Za-z0-9+/=\s]{1000,})</", raw_xml_text):
            raw_t = m.group(1).strip()
            if raw_t not in candidate_doc_texts:
                candidate_doc_texts.append(raw_t)

    emb_pdf = None
    largest_pdf_len = 0
    eo_found = False

    for doc_b64 in candidate_doc_texts:
        try:
            clean_b64 = re.sub(r"\s+", "", doc_b64)
            pdf_bytes = base64.b64decode(clean_b64)
            if not pdf_bytes or len(pdf_bytes) < 100 or not pdf_bytes.startswith(b"%PDF"):
                continue

            cand_pdf = None
            if fitz is not None:
                try:
                    cand_pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
                except Exception:
                    cand_pdf = None

            if cand_pdf is not None and len(cand_pdf) > 0:
                if len(cand_pdf) > largest_pdf_len:
                    largest_pdf_len = len(cand_pdf)
                    emb_pdf = cand_pdf

                if not eo_found:
                    eo_info = extract_eo_insurance_from_doc(cand_pdf, use_ocr=extract_images, appraiser_hint=appraiser_name)
                    if eo_info.get("E&O") == "Present":
                        eo_found = True
                        certification_section["E&O"] = "Present"
                        certification_section["E&O Present"] = "Present"
                        certification_section["E/O"] = "Present"
                        certification_section["E/O Present"] = "Present"
                        certification_section["E&O Attached"] = "Yes"
                        certification_section["has_eo"] = True
                        if eo_info.get("E&O Page"):
                            certification_section["E&O Page"] = eo_info["E&O Page"]
                        if eo_info.get("base64_preview"):
                            certification_section["base64_preview"] = eo_info["base64_preview"]
                        for k in ["E&O Insurance", "Policy Period From", "Policy Period To", "E&O Insured", "E&O Carrier", "E&O Limit", "E&O Deductible"]:
                            if eo_info.get(k):
                                certification_section[k] = eo_info[k]
                        if eo_info.get("E&O Insurance"):
                            certification_section["E/O Insurance"] = eo_info["E&O Insurance"]
        except Exception as e:
            print(f"[xml_extractor] Embedded document decode notice: {e}")

    # Fallback to XML <FORM>, <ATTACHED_IMAGE>, <IMAGE>, <ATTACHMENT>, and <EMBEDDED_FILE> tag metadata
    if not eo_found or certification_section.get("E&O") != "Present":
        eo_xml_info = _detect_eo_in_xml_tags(root, raw_xml_text)
        if eo_xml_info.get("is_present") or eo_xml_info.get("E&O") == "Present":
            certification_section["E&O"] = "Present"
            certification_section["E&O Present"] = "Present"
            certification_section["E/O"] = "Present"
            certification_section["E/O Present"] = "Present"
            for k in ["E&O Insurance", "Policy Period From", "Policy Period To", "E&O Insured", "E&O Carrier", "E&O Limit", "E&O Deductible"]:
                if eo_xml_info.get(k) and not certification_section.get(k):
                    certification_section[k] = eo_xml_info[k]
            if eo_xml_info.get("E&O Insurance") and not certification_section.get("E/O Insurance"):
                certification_section["E/O Insurance"] = eo_xml_info["E&O Insurance"]

    if emb_pdf is not None:
        try:
            # Extract distinct USPAP / Report Identification section from embedded PDF's USPAP page
            try:
                from .pdf_extractor_offline import extract_uspap_identification_details
                uspap_pdf_details = extract_uspap_identification_details(emb_pdf)
                if uspap_pdf_details and uspap_pdf_details.get("has_uspap_identification"):
                    metadata_keys = {
                        "UAD pages present in the report", "UAD Pages Present in the Report",
                        "UAD Pages Present", "UAD Pages", "UAD Definitions Addendum",
                        "UAD Dataset Pages", "has_uad_pages", "uad_pages", "uad_details",
                        "Limiting Conditions", "Statement of Assumptions and Limiting Conditions",
                        "limiting_conditions_pages", "limiting_conditions_presence",
                        "Appraiser's Certification", "Appraiser Certification",
                        "certification_pages", "certification_presence", "UAD Details"
                    }
                    if "has_appraiser_inspection" in uspap_pdf_details:
                        uspap_identification_section["has_appraiser_inspection"] = uspap_pdf_details["has_appraiser_inspection"]
                    
                    # Authoritative comments: if PDF has comments box and extract_uspap_identification_details evaluated it,
                    # overwrite Comments on Appraisal and Report Identification (even if blank)
                    if "Comments on Appraisal and Report Identification" in uspap_pdf_details:
                        uspap_identification_section["Comments on Appraisal and Report Identification"] = uspap_pdf_details["Comments on Appraisal and Report Identification"]
                        uspap_identification_section["Restricted Appraisal Report Comment"] = uspap_pdf_details["Comments on Appraisal and Report Identification"]

                    for k, v in uspap_pdf_details.items():
                        if k not in metadata_keys and v is not None and v != "":
                            # Never overwrite clean XML Appraiser credentials with noisy PDF text
                            if k in ["Name", "Appraiser Name"] and appraiser_name.strip():
                                continue
                            if k in ["State Certification #"] and state_cert_no.strip():
                                continue
                            if k in ["or State License #"] and state_lic_no.strip():
                                continue
                            if k in ["State"] and (lic_state or appr_state).strip():
                                continue
                            if k in ["Expiration Date of Certification or License"] and lic_exp.strip():
                                continue
                            # Never overwrite clean XML Supervisory credentials if present in XML
                            if k in ["Supervisory Name"] and sup_name.strip():
                                continue
                            if k in ["Supervisory State Certification #"] and sup_cert_no.strip():
                                continue
                            if k in ["Supervisory or State License #"] and sup_lic_no.strip():
                                continue
                            if k in ["Supervisory State"] and sup_lic_state.strip():
                                continue
                            if k in ["Supervisory Expiration Date of Certification or License"] and sup_lic_exp.strip():
                                continue
                            uspap_identification_section[k] = v

                    # If supervisor is not present in XML and not in PDF, ensure all supervisory fields are explicitly empty
                    if not sup_name.strip() and not uspap_pdf_details.get("Supervisory Name", "").strip():
                        uspap_identification_section["Supervisory Signature"] = ""
                        uspap_identification_section["Supervisory Signature Image"] = ""
                        uspap_identification_section["Supervisory Name"] = ""
                        uspap_identification_section["Supervisory Date Signed"] = ""
                        uspap_identification_section["Supervisory Date of Signature"] = ""
                        uspap_identification_section["Supervisory State Certification #"] = ""
                        uspap_identification_section["Supervisory or State License #"] = ""
                        uspap_identification_section["Supervisory State"] = ""
                        uspap_identification_section["Supervisory Expiration Date of Certification or License"] = ""
                        uspap_identification_section["Did not inspect subject property"] = ""
                        uspap_identification_section["Supervisory Did not inspect subject property"] = ""
                        uspap_identification_section["Did inspect exterior of subject property from street"] = ""
                        uspap_identification_section["Supervisory Did inspect exterior of subject property from street"] = ""
                        uspap_identification_section["Subject Property Date of Inspection (Exterior)"] = ""
                        uspap_identification_section["Did inspect interior and exterior of subject property"] = ""
                        uspap_identification_section["Supervisory Did inspect interior and exterior of subject property"] = ""
                        uspap_identification_section["Subject Property Date of Inspection (Interior/Exterior)"] = ""
                        uspap_identification_section["has_supervisory_inspection"] = False

                    if not uspap_pdf_details.get("has_appraiser_inspection", False):
                        # Ensure appraiser inspection checkboxes are populated with Interior and Exterior checked
                        uspap_identification_section["has_appraiser_inspection"] = True
                        uspap_identification_section["Appraiser Did inspect interior and exterior of subject property"] = appr_insp_int_ext or "Yes"
                        uspap_identification_section["Did inspect interior and exterior of subject property (Appraiser)"] = appr_insp_int_ext or "Yes"
                        uspap_identification_section["Appraiser Did Inspect Interior and Exterior"] = appr_insp_int_ext or "Yes"
                        uspap_identification_section["Appraiser Did not inspect subject property"] = appr_insp_none or "No"
                        uspap_identification_section["Did not inspect subject property (Appraiser)"] = appr_insp_none or "No"
                        uspap_identification_section["Appraiser Did Not Inspect"] = appr_insp_none or "No"
                        uspap_identification_section["Appraiser Did inspect exterior of subject property from street"] = appr_insp_ext or "No"
                        uspap_identification_section["Did inspect exterior of subject property from street (Appraiser)"] = appr_insp_ext or "No"
                        uspap_identification_section["Appraiser Did Inspect Exterior"] = appr_insp_ext or "No"
                        insp_d = appr_insp_int_ext_date or appr_insp_ext_date or insp_date or effective_date
                        uspap_identification_section["Appraiser Date of Inspection"] = insp_d
                        uspap_identification_section["Appraiser Subject Property Date of Inspection"] = insp_d
                        uspap_identification_section["Date of Inspection (if applicable)"] = insp_d

                    # Sanitize comments field from leaked credentials or boilerplate
                    c_curr = uspap_identification_section.get("Comments on Appraisal and Report Identification", "")
                    if any(k in c_curr.lower() for k in ["rl139943", "rd8685", "appraiser (only if required)", "supervisory appraiser"]) or len(re.findall(r'\b\d{1,2}/\d{1,2}/\d{4}\b', c_curr)) >= 2:
                        uspap_identification_section["Comments on Appraisal and Report Identification"] = ""
                        uspap_identification_section["Restricted Appraisal Report Comment"] = ""
            except Exception:
                pass
        except Exception as e:
            pass

    # Market Conditions Addendum (Form 1004MC)
    market_elem = root.find(".//MARKET")
    mc_instructions = ""
    mc_adverse_financing = ""
    mc_concessions_expl = ""
    mc_foreclosure_factor = ""
    mc_foreclosure_expl = ""
    mc_data_source = ""
    mc_summary_comment = ""
    
    mc_table_data = {}

    if market_elem is not None:
        adv_fin = market_elem.attrib.get("MarketTrendsAdverseFinancingIndicator", "")
        if adv_fin.upper() == "Y":
            mc_adverse_financing = "Yes"
        elif adv_fin.upper() == "N":
            mc_adverse_financing = "No"
        elif adv_fin:
            mc_adverse_financing = adv_fin

        mc_concessions_expl = market_elem.attrib.get("SalesConcessionDescription", "")

        fc_ind = market_elem.attrib.get("MarketTrendsForeclosureActivityIndicator", "")
        if fc_ind.upper() == "Y":
            mc_foreclosure_factor = "Yes"
        elif fc_ind.upper() == "N":
            mc_foreclosure_factor = "No"
        elif fc_ind:
            mc_foreclosure_factor = fc_ind

        mc_foreclosure_expl = market_elem.attrib.get("NeighborhoodMarketabilityFactorsDescription", "")
        mc_data_source = market_elem.attrib.get("DataSourceDescription", "")
        mc_summary_comment = market_elem.attrib.get("MarketTrendsReconciliationComment", "")

        type_to_labels = {
            "TotalSales": ("Total # of Comparable Sales (Settled)", "Inventory Analysis Total # of Comparable Sales (Settled)"),
            "AbsorptionRate": ("Absorption Rate (Total Sales/Months)", "Inventory Analysis Absorption Rate (Total Sales/Months)"),
            "TotalListings": ("Total # of Comparable Active Listings", "Inventory Analysis Total # of Comparable Active Listings"),
            "Supply": ("Months of Housing Supply (Total Listings/Ab.Rate)", "Inventory Analysis Months of Housing Supply (Total Listings/Ab.Rate)"),
            "MedianSalesPrice": ("Median Comparable Sale Price", "Median Sale & List Price, DOM, Sale/List % Median Comparable Sale Price"),
            "MedianSalesDOM": ("Median Comparable Sales Days on Market", "Median Sale & List Price, DOM, Sale/List % Median Comparable Sales Days on Market"),
            "MedianListPrice": ("Median Comparable List Price", "Median Sale & List Price, DOM, Sale/List % Median Comparable List Price"),
            "MedianListDOM": ("Median Comparable Listings Days on Market", "Median Sale & List Price, DOM, Sale/List % Median Comparable Listings Days on Market"),
            "MedianSalesToListRatio": ("Median Sale Price as % of List Price", "Median Sale & List Price, DOM, Sale/List % Median Sale Price as % of List Price"),
        }

        range_to_tf = {
            "Prior7To12Months": "Prior 7-12 Months",
            "Prior4To6Months": "Prior 4-6 Months",
            "Last3Months": "Current-3 Months",
        }

        for mi in market_elem.findall("MARKET_INVENTORY"):
            m_type = mi.attrib.get("_Type", "")
            if m_type not in type_to_labels:
                continue
            short_lbl, full_lbl = type_to_labels[m_type]
            
            m_range = mi.attrib.get("_MonthRangeType", "")
            m_trend = mi.attrib.get("_TrendType", "")
            
            val = mi.attrib.get("_Count") or mi.attrib.get("_Amount") or mi.attrib.get("_Rate") or ""
            
            if "Price" in m_type and val:
                val = val.strip()
                if not val.startswith("$") and val.replace(",", "").replace(".", "").isdigit():
                    cleaned_val = _clean_currency(val)
                    val = f"${cleaned_val}" if cleaned_val else val
            
            if m_trend and not m_range:
                tf = "Overall Trend"
                val = m_trend
            else:
                tf = range_to_tf.get(m_range, m_range)
                
            stripped_val = val.strip()
            if tf and stripped_val != "":
                mc_table_data[f"{full_lbl} ({tf})"] = stripped_val
                mc_table_data[f"{short_lbl} ({tf})"] = stripped_val
    else:
        m_mkt = re.search(r'(?:NEIGHBORHOOD\s+MARKET\s+CONDITIONS|MARKET\s+CONDITIONS)[\s:\-]+([^\n\r]+(?:(?!\b[A-Z\s]{4,}:)[^\n\r]+)*)', full_narrative, re.IGNORECASE)
        if m_mkt:
            mc_summary_comment = m_mkt.group(1).strip()

    market_conditions_section = {
        "Instructions:": mc_instructions,
        "Seller-(developer, builder, etc.)paid financial assistance prevalent?": mc_adverse_financing,
        "Explain in detail the seller concessions trends for the past 12 months (e.g., seller contributions increased from 3% to 5%, increasing use of buydowns, closing costs, condo fees, options, etc.).": mc_concessions_expl,
        "Are foreclosure sales (REO sales) a factor in the market?": mc_foreclosure_factor,
        "If yes, explain (including the trends in listings and sales of foreclosed properties).": mc_foreclosure_expl,
        "Cite data sources for above information.": mc_data_source,
        "Summarize the above information as support for your conclusions in the Neighborhood section of the appraisal report form. If you used any additional information, such as an analysis of pending sales and/or expired and withdrawn listings, to formulate your conclusions, provide both an explanation and support for your conclusions.": mc_summary_comment,
        **mc_table_data
    }

    # Condo / Co-op Projects (Subject Project Data on Form 1073 / 1004MC)
    sp_elem = root.find(".//SUBJECT_PROJECT")
    condo_coop_section = {}
    condo_foreclosure_section = {
        "Are foreclosure sales (REO sales) a factor in the project?": "",
        "If yes, indicate the number of REO listings and explain the trends in listings and sales of foreclosed properties.": "",
        "Summarize the above trends and address the impact on the subject unit and project.": "",
    }

    condo_type_to_labels = {
        "TotalSales": ("Total # of Comparable Sales (Settled)", "Subject Project Data Total # of Comparable Sales (Settled)"),
        "AbsorptionRate": ("Absorption Rate (Total Sales/Months)", "Subject Project Data Absorption Rate (Total Sales/Months)"),
        "TotalListings": ("Total # of Comparable Active Listings", "Subject Project Data Total # of Comparable Active Listings"),
        "Supply": ("Months of Unit Supply (Total Listings/Ab.Rate)", "Subject Project Data Months of Unit Supply (Total Listings/Ab.Rate)"),
    }

    condo_range_to_tf_pairs = {
        "Prior7To12Months": [("Prior 7–12 Months", "Prior 7-12 Months")],
        "Prior4To6Months": [("Prior 4–6 Months", "Prior 4-6 Months")],
        "Last3Months": [("Current – 3 Months", "Current-3 Months", "Current - 3 Months")],
    }

    # Condo Foreclosure Extraction (Subject Project & Market fallback)
    reo_expl = sp_elem.attrib.get("NeighborhoodMarketabilityFactorsDescription", "") if sp_elem is not None else ""
    reconcil = sp_elem.attrib.get("MarketTrendsReconciliationComment", "") if sp_elem is not None else ""
    sp_fc_ind = sp_elem.attrib.get("MarketTrendsForeclosureActivityIndicator", "") if sp_elem is not None else ""

    mkt_fc_ind = market_elem.attrib.get("MarketTrendsForeclosureActivityIndicator", "") if market_elem is not None else ""
    mkt_expl = market_elem.attrib.get("NeighborhoodMarketabilityFactorsDescription", "") if market_elem is not None else ""
    mkt_reconcil = market_elem.attrib.get("MarketTrendsReconciliationComment", "") if market_elem is not None else ""

    if not reo_expl:
        reo_expl = mkt_expl
    if not reconcil:
        reconcil = mkt_reconcil

    fc_ind = sp_fc_ind or mkt_fc_ind
    if fc_ind.upper() == "Y":
        factor = "Yes"
    elif fc_ind.upper() == "N":
        factor = "No"
    elif fc_ind:
        factor = "Yes" if "y" in fc_ind.lower() else "No"
    elif reo_expl or reconcil:
        factor = "No"
    else:
        factor = ""

    condo_foreclosure_section["Are foreclosure sales (REO sales) a factor in the project?"] = factor
    condo_foreclosure_section["If yes, indicate the number of REO listings and explain the trends in listings and sales of foreclosed properties."] = reo_expl
    condo_foreclosure_section["Summarize the above trends and address the impact on the subject unit and project."] = reconcil

    if sp_elem is not None:
        for mi in sp_elem.findall("MARKET_INVENTORY"):
            m_type = mi.attrib.get("_Type", "")
            if m_type not in condo_type_to_labels:
                continue
            short_lbl, full_lbl = condo_type_to_labels[m_type]
            m_range = mi.attrib.get("_MonthRangeType", "")
            m_trend = mi.attrib.get("_TrendType", "")
            
            val = mi.attrib.get("_Count") or mi.attrib.get("_Rate") or mi.attrib.get("_Amount") or ""
            
            if m_trend and not m_range:
                val = m_trend
                condo_coop_section[f"{full_lbl} (Overall Trend)"] = val
                condo_coop_section[f"{short_lbl} (Overall Trend)"] = val
            elif m_range in condo_range_to_tf_pairs:
                for tf_variants in condo_range_to_tf_pairs[m_range]:
                    for tf in tf_variants:
                        condo_coop_section[f"{full_lbl} ({tf})"] = val
                        condo_coop_section[f"{short_lbl} ({tf})"] = val

    # Initialize default blank keys for all row and timeframe variations
    for m_type, (short_lbl, full_lbl) in condo_type_to_labels.items():
        for tf_variants in [("Prior 7–12 Months", "Prior 7-12 Months"), ("Prior 4–6 Months", "Prior 4-6 Months"), ("Current – 3 Months", "Current-3 Months", "Current - 3 Months"), ("Overall Trend",)]:
            for tf in tf_variants:
                if f"{full_lbl} ({tf})" not in condo_coop_section:
                    condo_coop_section[f"{full_lbl} ({tf})"] = ""
                if f"{short_lbl} ({tf})" not in condo_coop_section:
                    condo_coop_section[f"{short_lbl} ({tf})"] = ""

    # Subject property's column in the Sales Grid (strictly sales comparison grid fields)
    subj_grid = dict(comps_dict.get("Subject", {}))
    if not subj_grid.get("Address"):
        subj_grid["Address"] = prop_addr
    if not subj_grid.get("Heating/Cooling"):
        subj_grid["Heating/Cooling"] = ht_val
    if not subj_grid.get("Porch/Patio/Deck"):
        subj_grid["Porch/Patio/Deck"] = amenities_val
    if not subj_grid.get("Basement Description"):
        subj_grid["Basement Description"] = found_val
    if not subj_grid.get("Basement Finished Rooms"):
        subj_grid["Basement Finished Rooms"] = f"{bm_finish}%" if bm_finish else ""
    if not subj_grid.get("Condition"):
        subj_grid["Condition"] = prop_condition
    if not subj_grid.get("Basement & Finished Rooms Below Grade"):
        subj_grid["Basement & Finished Rooms Below Grade"] = bm_details or found_val
    if not subj_grid.get("Garage/Carport"):
        subj_grid["Garage/Carport"] = car_storage_val
    if not subj_grid.get("Parking On/Off Site"):
        subj_grid["Parking On/Off Site"] = car_storage_val

    # Sales Grid Subject column is strictly the sales comparison data for subject
    sales_grid["Subject"] = subj_grid
    sales_grid["SUBJECT"] = subj_grid
    comps_dict["Subject"] = subj_grid
    comps_dict["SUBJECT"] = subj_grid

    # Subject Section is strictly Page 1 subject property identification (separate from Sales Grid)
    clean_subject = dict(subject_section)
    if not clean_subject.get("Property Address"):
        clean_subject["Property Address"] = prop_addr
    if not clean_subject.get("Full Address"):
        clean_subject["Full Address"] = full_addr
    if not clean_subject.get("City"):
        clean_subject["City"] = prop_city
    if not clean_subject.get("State"):
        clean_subject["State"] = prop_state
    if not clean_subject.get("Zip Code"):
        clean_subject["Zip Code"] = prop_zip
    if not clean_subject.get("County"):
        clean_subject["County"] = prop_county

    # Ensure prior sale history and sales comparison subject fields are populated in clean_subject
    for k, v in subj_grid.items():
        if k not in clean_subject or not clean_subject[k]:
            clean_subject[k] = v

    if manufactured_home_section and any(manufactured_home_section.values()):
        for mk, mv in manufactured_home_section.items():
            if mv and (mk not in clean_subject or not clean_subject[mk]):
                clean_subject[mk] = mv

    # Subject rent fields for Form 1007 stay strictly in single_family_rent_schedule (keep Subject and Rent Schedule separate)
    subj_addr_str = str(clean_subject.get("Full Address") or clean_subject.get("Property Address") or prop_addr or "")
    if single_family_rent_schedule:
        if not single_family_rent_schedule.get("Address") or len(str(single_family_rent_schedule.get("Address", ""))) < 8:
            single_family_rent_schedule["Address"] = subj_addr_str
    if not clean_subject.get("Address"):
        clean_subject["Address"] = subj_addr_str

    # Form 1025: Merge Subject Rental fields and Unit Breakdown into clean_subject
    if "Subject Rental" in comparable_rental_data:
        subj_rent_record = comparable_rental_data["Subject Rental"]
        for sk, sv in subj_rent_record.items():
            if sv and (sk not in clean_subject or not clean_subject[sk]):
                clean_subject[sk] = sv
            if sk.startswith("Unit Breakdown") and sv:
                clean_subject[sk] = sv
            if sk in ("Rent/Gross Bldg. Area", "Date of Lease(s)", "Utilities Included", "Current Monthly Rent", "Parking", "Other") and sv:
                clean_subject[sk] = sv

    # Always ensure clean_subject retains Property Address, City, State, Zip Code, County, Full Address
    if not clean_subject.get("Property Address"):
        clean_subject["Property Address"] = prop_addr
    if not clean_subject.get("City"):
        clean_subject["City"] = prop_city
    if not clean_subject.get("State"):
        clean_subject["State"] = prop_state
    if not clean_subject.get("Zip Code"):
        clean_subject["Zip Code"] = prop_zip
    if not clean_subject.get("County"):
        clean_subject["County"] = prop_county
    if not clean_subject.get("Full Address"):
        clean_subject["Full Address"] = full_addr

    sales_grid.update(info_of_sales_section)
    merged_info_of_sales = {**sales_grid, **info_of_sales_section}

    # Clean structured Sales Grid containing Subject column and Comps 1..N
    clean_sales_grid = {}
    if "Subject" in sales_grid and isinstance(sales_grid["Subject"], dict):
        clean_sales_grid["Subject"] = subj_grid
    detected_comps = set()
    for k in sales_grid.keys():
        m_c = re.search(r'(?:Comparable\s*#?|COMPARABLE\s+SALE\s*#?)\s*(\d+)', k, re.I)
        if m_c:
            detected_comps.add(int(m_c.group(1)))
    max_comp_num = max(detected_comps) if detected_comps else 9
    for i in range(1, max_comp_num + 1):
        c_val = sales_grid.get(f"Comparable #{i}") or sales_grid.get(f"COMPARABLE SALE #{i}")
        if isinstance(c_val, dict):
            clean_sales_grid[f"Comparable Sale {i}"] = c_val

    # 10. Extract Photo Exhibits & Visual Addenda
    extracted_photos = []
    refs_for_photos = {
        "subject": {
            "street": clean_subject.get("Property Address") or prop_addr or "",
            "city": clean_subject.get("City") or prop_city or "",
            "state": clean_subject.get("State") or prop_state or "",
            "zipcode": clean_subject.get("Zip Code") or prop_zip or "",
            "address": clean_subject.get("Full Address") or full_addr or prop_addr or ""
        },
        "sales_comps": [],
        "rental_comps": []
    }
    try:
        for k, v in clean_sales_grid.items():
            if k != "Subject" and isinstance(v, dict):
                m = re.search(r'\d+', k)
                cnum = int(m.group(0)) if m else len(refs_for_photos["sales_comps"]) + 1
                st = v.get("Street Address") or v.get("Address") or ""
                refs_for_photos["sales_comps"].append({
                    "comp_num": cnum,
                    "street": st,
                    "address": v.get("Address") or st,
                    "proximity": v.get("Proximity to Subject") or "",
                    "sale_price": v.get("Sale Price") or ""
                })
        rgrid = comparable_rental_data or comparable_rent_schedule or single_family_rent_schedule or {}
        for k, v in rgrid.items():
            if isinstance(v, dict) and any(x in k.upper() for x in ["RENTAL", "COMPARABLE NO"]):
                m = re.search(r'\d+', k)
                cnum = int(m.group(0)) if m else len(refs_for_photos["rental_comps"]) + 1
                if not any(r["comp_num"] == cnum for r in refs_for_photos["rental_comps"]):
                    addr = v.get("Address") or ""
                    m_st = re.match(r'^([^,]+)', addr)
                    st = m_st.group(1).strip() if m_st else addr
                    refs_for_photos["rental_comps"].append({
                        "comp_num": cnum,
                        "street": st,
                        "address": addr,
                        "proximity": v.get("Proximity to Subject") or v.get("Proximity") or "",
                        "monthly_rent": v.get("Monthly Rental") or v.get("Adjusted Monthly Rent") or ""
                    })

        if isinstance(refs_for_photos, dict) and appraiser_name:
            refs_for_photos["appraiser_name"] = appraiser_name

        extracted_photos = extract_photos_from_xml(
            xml_path_or_bytes,
            max_photos=100,
            dpi=72,
            include_images=extract_images,
            reference_records=refs_for_photos
        )
        if not water_heater_comment and extracted_photos:
            wh_photo = _extract_water_heater_comment(extracted_photos=extracted_photos)
            if wh_photo:
                water_heater_comment = wh_photo
                clean_subject["Water heater double-strapped comment"] = water_heater_comment
                clean_subject["Water Heater Double-Strapped Comment"] = water_heater_comment
                clean_subject["Water Heater Double Strapped Comment"] = water_heater_comment
                improvements_section["Water heater double-strapped comment"] = water_heater_comment
                improvements_section["Water Heater Double-Strapped Comment"] = water_heater_comment
                improvements_section["Water Heater Double Strapped Comment"] = water_heater_comment
                subject_section["Water heater double-strapped comment"] = water_heater_comment
                subject_section["Water Heater Double-Strapped Comment"] = water_heater_comment
                subject_section["Water Heater Double Strapped Comment"] = water_heater_comment
    except Exception:
        pass

    # -------------------------------------------------------------
    # Form 1073 (Condominium) Project Information & Analysis
    # -------------------------------------------------------------
    project_car_storage = root.find(".//PROJECT_CAR_STORAGE")
    if project_car_storage is None:
        project_car_storage = root.find(".//CAR_STORAGE")

    project_analysis_elem = root.find(".//PROJECT_ANALYSIS")

    # Data source
    proj_data_source = ""
    if proj is not None:
        proj_data_source = proj.attrib.get("DataSourceDescription", "")
        if not proj_data_source:
            for ds in proj.findall("DEVELOPMENT_STAGE"):
                src = ds.attrib.get("DataSourceDescription", "")
                if src:
                    proj_data_source = src
                    break

    # Project Description
    proj_desc = ""
    if proj is not None:
        design_raw = proj.attrib.get("_DesignType", "") or proj.attrib.get("_DesignTypeOtherDescription", "")
        dt_map = {
            "GardenProject": "Garden",
            "Garden": "Garden",
            "Townhouse": "Row or Townhouse",
            "RowOrTownhouse": "Row or Townhouse",
            "Detached": "Detached",
            "MidRise": "Mid-Rise",
            "HighRise": "High-Rise",
        }
        proj_desc = dt_map.get(design_raw, design_raw)
    if not proj_desc and struct_elem is not None:
        proj_desc = struct_elem.attrib.get("StructureConfigurationType", "")

    # Stories
    proj_stories = ""
    if struct_elem is not None:
        proj_stories = struct_elem.attrib.get("StoriesCount", "")
    if not proj_stories:
        st_info = root.find(".//STRUCTURE_INFORMATION")
        if st_info is not None:
            proj_stories = st_info.attrib.get("GSEStoriesCount", "")
    if not proj_stories and proj is not None:
        proj_stories = proj.attrib.get("StoriesCount", "")

    # Elevators
    proj_elevators = ""
    if struct_elem is not None:
        proj_elevators = struct_elem.attrib.get("ElevatorCount", "")
    if not proj_elevators and proj is not None:
        proj_elevators = proj.attrib.get("ElevatorCount", "")

    # Status
    proj_status = ""
    if struct_elem is not None:
        proj_status = struct_elem.attrib.get("BuildingStatusType", "")
    if not proj_status and proj is not None:
        proj_status = proj.attrib.get("PropertyStructureStatusType", "") or proj.attrib.get("_StatusType", "")

    # Year Built
    proj_year_built = ""
    if struct_elem is not None:
        proj_year_built = struct_elem.attrib.get("PropertyStructureBuiltYear", "")
    if not proj_year_built:
        st_info = root.find(".//STRUCTURE_INFORMATION")
        if st_info is not None:
            proj_year_built = st_info.attrib.get("GSEPropertyStructureBuiltYear", "")

    # Effective Age
    proj_eff_age = ""
    if sa_elem is not None:
        proj_eff_age = sa_elem.attrib.get("EffectiveAgeYearsCount", "")
    if not proj_eff_age:
        eff_node = root.find(".//EFFECTIVE_AGE")
        if eff_node is not None:
            proj_eff_age = eff_node.attrib.get("GSEEffectiveAgeDescription", "")

    # Exterior Walls & Roof Surface
    proj_ext_walls = ext_walls
    if not proj_ext_walls:
        for ef in root.findall(".//EXTERIOR_FEATURE"):
            if ef.attrib.get("_Type", "") == "Walls":
                proj_ext_walls = _format_mat_cond(ef.attrib.get("_Description", ""))
                break

    proj_roof_surf = roof_surf
    if not proj_roof_surf:
        for ef in root.findall(".//EXTERIOR_FEATURE"):
            if ef.attrib.get("_Type", "") == "RoofSurface":
                proj_roof_surf = _format_mat_cond(ef.attrib.get("_Description", ""))
                break

    # Parking
    proj_total_parking = ""
    proj_ratio_parking = ""
    proj_parking_type = ""
    proj_guest_parking = ""
    proj_parking_adequate = ""
    proj_parking_inadequate_desc = ""
    if project_car_storage is not None:
        proj_total_parking = project_car_storage.attrib.get("ParkingSpacesCount", "") or project_car_storage.attrib.get("TotalParkingSpacesCount", "")
        proj_ratio_parking = project_car_storage.attrib.get("_SpacesToUnitsRatioNumber", "") or project_car_storage.attrib.get("RatioDescription", "")
        proj_parking_type = project_car_storage.attrib.get("_Description", "") or project_car_storage.attrib.get("_Type", "")
        proj_guest_parking = project_car_storage.attrib.get("GuestParkingSpacesCount", "")
        ad_ind = project_car_storage.attrib.get("AdequateIndicator", "")
        proj_parking_adequate = "Yes" if ad_ind.upper() == "Y" else ("No" if ad_ind.upper() == "N" else ad_ind)
        proj_parking_inadequate_desc = project_car_storage.attrib.get("_AdequacyEffectOnMarketabilityDescription", "")

    # Amenities
    proj_amenities = ""
    if struct_elem is not None:
        proj_amenities = struct_elem.attrib.get("StructureConfigurationTypeOtherDescription", "")
    if not proj_amenities:
        for pa in root.findall(".//PROPERTY_ANALYSIS"):
            if pa.attrib.get("_Type", "") == "AdditionalFeatures":
                proj_amenities = pa.attrib.get("_Comment", "")
                break
            elif not proj_amenities and pa.attrib.get("_Comment", "") and "amenit" in pa.attrib.get("_Comment", "").lower():
                proj_amenities = pa.attrib.get("_Comment", "")
    if not proj_amenities and amenities_val:
        proj_amenities = amenities_val

    # Development Stages (Unit counts across Subject Phase, Project Complete, Project Incomplete)
    ds_subj = None
    ds_comp = None
    ds_incomp = None
    if proj is not None:
        for ds in proj.findall("DEVELOPMENT_STAGE"):
            t = ds.attrib.get("_Type", "")
            if t in ("SubjectPhase", "Subject"):
                ds_subj = ds
            elif t in ("Complete", "Completed", "TotalProject"):
                ds_comp = ds
            elif t in ("Incomplete", "Planned"):
                ds_incomp = ds

    def _get_ds_field(elem, *attrib_keys):
        if elem is None:
            return ""
        for k in attrib_keys:
            v = elem.attrib.get(k, "")
            if v != "":
                return v
        return ""

    u_subj = _get_ds_field(ds_subj, "CompletedUnitsCount", "PlannedUnitsCount")
    u_subj_comp = _get_ds_field(ds_subj, "CompletedUnitsCount")
    u_subj_sale = _get_ds_field(ds_subj, "UnitsForSaleCount")
    u_subj_sold = _get_ds_field(ds_subj, "UnitsSoldCount")
    u_subj_rent = _get_ds_field(ds_subj, "UnitsRentedCount")
    u_subj_owner = _get_ds_field(ds_subj, "OwnerOccupiedUnitCount")

    ph_comp = _get_ds_field(ds_comp, "_TotalPhasesCount")
    u_comp = _get_ds_field(ds_comp, "CompletedUnitsCount", "PlannedUnitsCount")
    u_comp_sale = _get_ds_field(ds_comp, "UnitsForSaleCount")
    u_comp_sold = _get_ds_field(ds_comp, "UnitsSoldCount")
    u_comp_rent = _get_ds_field(ds_comp, "UnitsRentedCount")
    u_comp_owner = _get_ds_field(ds_comp, "OwnerOccupiedUnitCount")

    ph_incomp = _get_ds_field(ds_incomp, "_TotalPhasesCount")
    u_incomp = _get_ds_field(ds_incomp, "PlannedUnitsCount")
    u_incomp_sale = _get_ds_field(ds_incomp, "UnitsForSaleCount")
    u_incomp_sold = _get_ds_field(ds_incomp, "UnitsSoldCount")
    u_incomp_rent = _get_ds_field(ds_incomp, "UnitsRentedCount")
    u_incomp_owner = _get_ds_field(ds_incomp, "OwnerOccupiedUnitCount")

    # Primary Occupancy
    proj_occ_raw = (proj.attrib.get("_PrimaryOccupancyType", "") or proj.attrib.get("PropertyCurrentUsageType", "")) if proj is not None else ""
    occ_map = {
        "PrincipleResidence": "Principal Residence",
        "PrimaryResidence": "Principal Residence",
        "SecondHome": "Second Home or Recreational",
        "Tenant": "Tenant"
    }
    proj_primary_occ = occ_map.get(proj_occ_raw, proj_occ_raw)

    # Developer Control
    proj_dev_ctrl_raw = proj.attrib.get("_DeveloperControlsProjectManagementIndicator", "") if proj is not None else ""
    proj_dev_ctrl = "Yes" if proj_dev_ctrl_raw.upper() == "Y" else ("No" if proj_dev_ctrl_raw.upper() == "N" else proj_dev_ctrl_raw)

    # Management Group
    proj_mgmt_type = proj.attrib.get("_ManagementType", "") if proj is not None else ""
    proj_mgmt_agent = proj.attrib.get("_ManagementAgentName", "") if proj is not None else ""
    if proj_mgmt_agent:
        proj_mgmt_group = f"Management Agent - {proj_mgmt_agent}" if "Management" in proj_mgmt_type else f"{proj_mgmt_type} - {proj_mgmt_agent}"
    else:
        proj_mgmt_group = proj_mgmt_type

    # Single entity owns > 10%
    proj_entity_ind_raw = proj.attrib.get("_ConcentratedOwnershipIndicator", "") if proj is not None else ""
    proj_entity_ind = "Yes" if proj_entity_ind_raw.upper() == "Y" else ("No" if proj_entity_ind_raw.upper() == "N" else proj_entity_ind_raw)
    proj_entity_desc = proj.attrib.get("_ConcentratedOwnershipDescription", "") if proj is not None else ""

    # Conversion
    proj_conv_raw = proj.attrib.get("_ConversionIndicator", "") if proj is not None else ""
    proj_conv_ind = "Yes" if proj_conv_raw.upper() == "Y" else ("No" if proj_conv_raw.upper() == "N" else proj_conv_raw)
    proj_conv_desc = proj.attrib.get("_ConversionOriginalUseDescription", "") if proj is not None else ""
    proj_conv_date = proj.attrib.get("_ConversionDate", "") if proj is not None else ""
    proj_conv_full = f"{proj_conv_desc} {proj_conv_date}".strip()

    # Common elements complete
    proj_comp_raw = proj.attrib.get("_CommonElementsCompletedIndicator", "") if proj is not None else ""
    proj_comp_ind = "Yes" if proj_comp_raw.upper() == "Y" else ("No" if proj_comp_raw.upper() == "N" else proj_comp_raw)
    proj_comp_no_desc = proj.attrib.get("_CommonElementsStatusDescription", "") if proj is not None else ""

    # Commercial space
    proj_comm_raw = proj.attrib.get("_CommercialSpaceIndicator", "") if proj is not None else ""
    proj_comm_ind = "Yes" if proj_comm_raw.upper() == "Y" else ("No" if proj_comm_raw.upper() == "N" else proj_comm_raw)
    proj_comm_desc = proj.attrib.get("CommercialSpaceDescription", "") if proj is not None else ""
    comm_elem = root.find(".//PROJECT_COMMERCIAL")
    proj_comm_pct = comm_elem.attrib.get("GSEProjectCommercialSpacePercent", "") if comm_elem is not None else ""
    proj_comm_full = f"{proj_comm_desc} ({proj_comm_pct}%)".strip(" ()") if proj_comm_pct else proj_comm_desc

    # Condition & Quality
    proj_cond_qual = proj.attrib.get("_ConditionAndQualityDescription", "") if proj is not None else ""

    # Common elements
    proj_comm_elems_desc = proj.attrib.get("_CommonElementsDescription", "") if proj is not None else ""

    # Leased common elements
    proj_leased_raw = proj.attrib.get("_CommonElementsLeasedIndicator", "") if proj is not None else ""
    proj_leased_ind = "Yes" if proj_leased_raw.upper() == "Y" else ("No" if proj_leased_raw.upper() == "N" else proj_leased_raw)
    proj_leased_terms = proj.attrib.get("_CommonElementsLeaseTermsDescription", "") if proj is not None else ""

    # Ground rent
    proj_ground_rent_raw = project_analysis_elem.attrib.get("_GroundRentIndicator", "") if project_analysis_elem is not None else ""
    proj_ground_rent = "Yes" if proj_ground_rent_raw.upper() == "Y" else ("No" if proj_ground_rent_raw.upper() == "N" else proj_ground_rent_raw)
    proj_ground_rent_amt = project_analysis_elem.attrib.get("_GroundRentAmount", "") if project_analysis_elem is not None else ""
    proj_ground_rent_desc = project_analysis_elem.attrib.get("_GroundRentDescription", "") if project_analysis_elem is not None else ""
    proj_ground_rent_full = f"${proj_ground_rent_amt} {proj_ground_rent_desc}".strip() if proj_ground_rent_amt else proj_ground_rent_desc

    project_info_section: Dict[str, Any] = {
        "Topography": site_topography,
        "Size": site_size,
        "Density": site_density,
        "TOPOGRAPHY": site_topography,
        "SIZE": site_size,
        "DENSITY": site_density,
        "FEMA Special Flood Hazard Area": fema_special,
        "Zoning Compliance": zoning_comp,
        "Data source(s) for project information": proj_data_source,
        "Project Description": proj_desc,
        "# of Stories": proj_stories,
        "# of Elevators": proj_elevators,
        "Existing/Proposed/Under Const.": proj_status,
        "Existing/Proposed/Under Construction": proj_status,
        "Year Built": proj_year_built,
        "Effective Age": proj_eff_age,
        "Exterior Walls": proj_ext_walls,
        "Roof Surface": proj_roof_surf,
        "Total # Parking": proj_total_parking,
        "Ratio (spaces/units)": proj_ratio_parking,
        "Type": proj_parking_type,
        "Guest Parking": proj_guest_parking,
        "Amenities include: deck, central air conditioning and thermal windows.": proj_amenities,
        "Amenities": proj_amenities,
        "Amenities include:": proj_amenities,
        "# of Units": u_subj or u_comp,
        "# of Units Completed": u_subj_comp or u_comp,
        "# of Units (Project Completed)": u_comp or u_subj,
        "# of Units (If Project Completed)": u_comp or u_subj,
        "# of Units For Sale": u_subj_sale,
        "# of Units Sold": u_subj_sold or u_comp_sold,
        "# of Units Rented": u_subj_rent or u_comp_rent,
        "# of Owner Occupied Units": u_subj_owner or u_comp_owner,
        "# of Phases": ph_comp,
        "# of Units for Sale": u_comp_sale or u_subj_sale,
        "# of Planned Phases": ph_incomp,
        "# of Planned Units": u_incomp,
        "# of Planned Units for Sale": u_incomp_sale,
        "# of Planned Units Sold": u_incomp_sold,
        "# of Planned Units Rented": u_incomp_rent,
        "# of Planned Owner Occupied Units": u_incomp_owner,
        "Project Primary Occupancy": proj_primary_occ,
        "Is the developer/builder in control of the Homeowners' Association (HOA)?": proj_dev_ctrl,
        "Management Group": proj_mgmt_group,
        "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project?": proj_entity_ind,
        "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project? If Yes, describe": proj_entity_desc,
        "If Yes, describe (10% ownership)": proj_entity_desc,
        "Was the project created by the conversion of existing building(s) into a condominium?": proj_conv_ind,
        "Was the project created by the conversion of existing building(s) into a condominium? If Yes,describe the original use and date of conversion": proj_conv_full,
        "If Yes,describe the original use and date of conversion": proj_conv_full,
        "Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)?": proj_comp_ind,
        "If No, describe": proj_comp_no_desc,
        "Is there any commercial space in the project?": proj_comm_ind,
        "If Yes, describe and indicate the overall percentage of the commercial space.": proj_comm_full,
        "Describe the condition of the project and quality of construction.": proj_cond_qual,
        "Describe the common elements and recreational facilities.": proj_comm_elems_desc,
        "Are any common elements leased to or by the Homeowners' Association?": proj_leased_ind,
        "If Yes, describe the rental terms and options.": proj_leased_terms,
        "Is the project subject to a ground rent?": proj_ground_rent,
        "If Yes, $ per year (describe terms and conditions)": proj_ground_rent_full,
        "Are the parking facilities adequate for the project size and type?": proj_parking_adequate,
        "If No, describe and comment on the effect on value and marketability.": proj_parking_inadequate_desc,
    }

    # Project Analysis (Form 1073 Page 2)
    proj_budget_comment = project_analysis_elem.attrib.get("_BudgetAnalysisComment", "") if project_analysis_elem is not None else ""
    proj_add_fees_raw = project_analysis_elem.attrib.get("_AdditionalFacilitiesFeeIndicator", "") if project_analysis_elem is not None else ""
    proj_add_fees = "Yes" if proj_add_fees_raw.upper() == "Y" else ("No" if proj_add_fees_raw.upper() == "N" else proj_add_fees_raw)
    proj_add_fees_desc = project_analysis_elem.attrib.get("_AdditionalFacilitiesFeeDescription", "") if project_analysis_elem is not None else ""
    proj_comp_type = project_analysis_elem.attrib.get("_CompetitiveProjectComparisonType", "") if project_analysis_elem is not None else ""
    proj_comp_desc = project_analysis_elem.attrib.get("_CompetitiveProjectComparisonDescription", "") if project_analysis_elem is not None else ""
    proj_spec_raw = project_analysis_elem.attrib.get("_SpecialCharacteristicsIndicator", "") if project_analysis_elem is not None else ""
    proj_spec_ind = "Yes" if proj_spec_raw.upper() == "Y" else ("No" if proj_spec_raw.upper() == "N" else proj_spec_raw)
    proj_spec_desc = project_analysis_elem.attrib.get("_SpecialCharacteristicsDescription", "") if project_analysis_elem is not None else ""

    project_analysis_section: Dict[str, Any] = {
        "I did did not analyze the condominium project budget for the current year. Explain the results of the analysis of the budget (adequacy of fees, reserves, etc.), or why the analysis was not performed.": proj_budget_comment,
        "Are there any other fees (other than regular HOA charges) for the use of the project facilities?": proj_add_fees,
        "If Yes, report the charges and describe.": proj_add_fees_desc,
        "Compared to other competitive projects of similar quality and design, the subject unit charge appears": proj_comp_type,
        "If High or Low, describe": proj_comp_desc,
        "Are there any special or unusual characteristics of the project (based on the condominium documents, HOA meetings, or other information) known to the appraiser?": proj_spec_ind,
        "If Yes, describe and explain the effect on value and marketability.": proj_spec_desc,
    }

    # -------------------------------------------------------------
    # Form 1073 (Condominium) Unit Descriptions
    # -------------------------------------------------------------
    monthly_unit_charge = ""
    annual_unit_charge = ""
    unit_charge_sqft = ""

    for uc in root.findall(".//UNIT_CHARGE"):
        pt = (uc.attrib.get("_PeriodType") or "").lower()
        amt = (uc.attrib.get("_Amount") or "").strip()
        psf = (uc.attrib.get("_PerSquareFootAmount") or "").strip()
        if pt == "monthly" and amt:
            monthly_unit_charge = amt
        elif pt in ["annually", "annual", "yearly", "year"] and amt:
            annual_unit_charge = amt
        if psf:
            unit_charge_sqft = psf

    if not monthly_unit_charge:
        for puf in root.findall(".//_PER_UNIT_FEE"):
            if (puf.attrib.get("_PeriodType") or "").lower() == "monthly":
                monthly_unit_charge = (puf.attrib.get("_Amount") or "").strip()
                break

    if monthly_unit_charge and not annual_unit_charge:
        try:
            m_val = float(str(monthly_unit_charge).replace("$", "").replace(",", "").strip())
            annual_unit_charge = f"{m_val * 12:.2f}".rstrip("0").rstrip(".")
        except Exception:
            pass

    # Utilities included in monthly assessment
    unit_util_included = []
    unit_other_util_desc = []
    for ucu in root.findall(".//UNIT_CHARGE_UTILITY"):
        inc = (ucu.attrib.get("_IncludedInAssessmentIndicator") or "").strip().upper()
        ut = (ucu.attrib.get("_Type") or "").strip()
        ot_desc = (ucu.attrib.get("_TypeOtherDescription") or ucu.attrib.get("_Description") or "").strip()
        if inc == "Y":
            if ut.lower() == "other":
                if ot_desc:
                    unit_other_util_desc.append(ot_desc)
                else:
                    unit_util_included.append("Other")
            elif ut:
                unit_util_included.append(ut)

    if not unit_util_included and not unit_other_util_desc:
        for u in root.findall(".//_UNIT_UTILITY"):
            inc = (u.attrib.get("_IncludedInAssessmentIndicator") or "").strip().upper()
            ut = (u.attrib.get("_Type") or "").strip()
            ot_desc = (u.attrib.get("_TypeOtherDescription") or u.attrib.get("_Description") or "").strip()
            if inc == "Y":
                if ut.lower() == "other" and ot_desc:
                    unit_other_util_desc.append(ot_desc)
                elif ut:
                    unit_util_included.append(ut)

    all_unit_utils = list(unit_util_included)
    if unit_other_util_desc:
        all_unit_utils.extend(unit_other_util_desc)
    unit_utilities_str = ", ".join(all_unit_utils) if all_unit_utils else "None"

    # Floor # and # of Levels
    unit_floor_num = ""
    unit_levels_num = ""
    unit_elem = root.find(".//_UNIT")
    if unit_elem is not None:
        unit_floor_num = (unit_elem.attrib.get("FloorIdentifier") or "").strip()
        unit_levels_num = (unit_elem.attrib.get("LevelCount") or "").strip()

    if not unit_levels_num and struct_elem is not None:
        unit_levels_num = (struct_elem.attrib.get("StoriesCount") or "").strip()

    # Heating Type / Fuel
    unit_h_type = ""
    unit_h_fuel = ""
    h_elem = root.find(".//HEATING")
    if h_elem is not None:
        unit_h_type = (h_elem.attrib.get("_UnitDescription") or h_elem.attrib.get("_Type") or "").strip()
        unit_h_fuel = (h_elem.attrib.get("_FuelDescription") or "").strip()
    unit_heating_str = f"{unit_h_type}/{unit_h_fuel}" if unit_h_type and unit_h_fuel else (unit_h_type or unit_h_fuel or ht_val or "None")

    # Central AC / Individual AC / Other
    unit_cooling_str = ""
    c_elem = root.find(".//COOLING")
    if c_elem is not None:
        c_cent = (c_elem.attrib.get("_CentralizedIndicator") or "").strip().upper()
        c_indiv = (c_elem.attrib.get("_IndividualIndicator") or "").strip().upper()
        c_oth = (c_elem.attrib.get("_OtherIndicator") or "").strip().upper()
        c_desc = (c_elem.attrib.get("_TypeOtherDescription") or c_elem.attrib.get("_Description") or "").strip()
        if c_cent == "Y":
            unit_cooling_str = "Central AC"
        elif c_indiv == "Y":
            unit_cooling_str = "Individual AC"
        elif c_oth == "Y" or c_desc:
            unit_cooling_str = f"Other: {c_desc}" if c_desc else "Other"
        else:
            unit_cooling_str = (c_elem.attrib.get("_Type") or "").strip()
    if not unit_cooling_str:
        unit_cooling_str = cooling_val or "None"

    # Amenities: Fireplace / Woodstove / Deck / Patio / Porch / Balcony / Other
    unit_amenities = []
    for am in root.findall(".//AMENITY"):
        at = (am.attrib.get("_Type") or "").strip()
        ex = (am.attrib.get("_ExistsIndicator") or "").strip().upper()
        cnt = (am.attrib.get("_Count") or "").strip()
        desc = (am.attrib.get("_DetailedDescription") or am.attrib.get("_TypeOtherDescription") or "").strip()
        if ex == "Y" or (cnt and cnt not in ["0", "None"]) or (desc and desc.lower() not in ["none", "no"]):
            item_str = at
            if cnt and cnt not in ["0", "None"]:
                item_str += f" #{cnt}"
            if desc and desc.lower() not in ["none", "no", at.lower()]:
                item_str += f" ({desc})"
            unit_amenities.append(item_str)
    unit_amenities_str = ", ".join(unit_amenities) if unit_amenities else "None"

    # Kitchen Appliances
    unit_appliances = []
    for ke in root.findall(".//KITCHEN_EQUIPMENT"):
        kt = (ke.attrib.get("_Type") or "").strip()
        ex = (ke.attrib.get("_ExistsIndicator") or "").strip().upper()
        if ex == "Y":
            name_map = {
                "Refrigerator": "Refrigerator",
                "RangeOven": "Range/Oven",
                "Microwave": "Microwave",
                "Dishwasher": "Dishwasher",
                "Disposal": "Disp",
                "WasherDryer": "Washer/Dryer"
            }
            unit_appliances.append(name_map.get(kt, kt))
    unit_appliances_str = ", ".join(unit_appliances) if unit_appliances else "None"

    # Interior Features
    unit_interior = {}
    for ifeat in root.findall(".//INTERIOR_FEATURE"):
        it = (ifeat.attrib.get("_Type") or "").strip()
        cd = (ifeat.attrib.get("_ConditionDescription") or ifeat.attrib.get("_Description") or "").strip()
        unit_interior[it] = cd
    unit_floors = unit_interior.get("Floors") or floors or "None"
    unit_walls = unit_interior.get("Walls") or walls or "None"
    unit_trim = unit_interior.get("TrimAndFinish") or unit_interior.get("Trim/Finish") or unit_interior.get("Trim") or trim or "None"
    unit_wainscot = unit_interior.get("BathroomWainscot") or unit_interior.get("Bath Wainscot") or bath_wainscot or "None"
    unit_doors = unit_interior.get("Doors") or "None"

    # Car Storage
    unit_cs_elem = root.find(".//CAR_STORAGE")
    unit_cs_type = ""
    unit_cs_assignment = ""
    unit_cs_cars = ""
    unit_cs_space = ""
    if unit_cs_elem is not None:
        unit_cs_assignment = (unit_cs_elem.attrib.get("ParkingSpaceAssignmentType") or "").strip()
        unit_cs_cars = (unit_cs_elem.attrib.get("ParkingSpacesCount") or "").strip()
        unit_cs_space = (unit_cs_elem.attrib.get("ParkingSpaceIdentifier") or "").strip()
        loc_types = []
        for loc in unit_cs_elem.findall(".//CAR_STORAGE_LOCATION"):
            lt = (loc.attrib.get("_Type") or "").strip()
            ex = (loc.attrib.get("_ExistsIndicator") or "").strip().upper()
            if ex == "Y":
                loc_types.append(lt)
        if loc_types:
            unit_cs_type = ", ".join(loc_types)
        elif (unit_cs_elem.attrib.get("_ExistsIndicator") or "").strip().upper() == "N":
            unit_cs_type = "None"
    if not unit_cs_type:
        unit_cs_type = "None"
    if not unit_cs_assignment:
        unit_cs_assignment = "None"
    if not unit_cs_cars:
        unit_cs_cars = "0"
    if not unit_cs_space:
        unit_cs_space = "None"

    # Finished Area & Room Counts
    unit_rooms = ""
    unit_bedrooms = ""
    unit_baths = ""
    unit_gla = ""
    unit_sep_metered = ""
    unit_sep_metered_desc = ""
    if struct_elem is not None:
        unit_rooms = (struct_elem.attrib.get("TotalRoomCount") or "").strip()
        unit_bedrooms = (struct_elem.attrib.get("TotalBedroomCount") or "").strip()
        unit_baths = (struct_elem.attrib.get("TotalBathroomCount") or "").strip()
        unit_gla = (struct_elem.attrib.get("GrossLivingAreaSquareFeetCount") or "").strip()
        sm_ind = (struct_elem.attrib.get("_HeatingCoolingMeteredSeparatelyIndicator") or "").strip().upper()
        unit_sep_metered = "Yes" if sm_ind == "Y" else ("No" if sm_ind == "N" else sm_ind)
        unit_sep_metered_desc = (struct_elem.attrib.get("_HeatingCoolingMeteredSeparatelyDescription") or "").strip()

    if not unit_charge_sqft and annual_unit_charge and unit_gla:
        try:
            unit_charge_sqft = f"{float(annual_unit_charge) / float(unit_gla):.2f}"
        except Exception:
            pass

    unit_finished_area_summary = f"{unit_rooms} Rooms, {unit_bedrooms} Bedrooms, {unit_baths} Bath(s)" if (unit_rooms or unit_bedrooms or unit_baths) else "None"

    # Property Analysis for Condo
    unit_pa_elems = {pa.attrib.get("_Type", ""): pa for pa in root.findall(".//PROPERTY_ANALYSIS")}

    unit_add_features = (unit_pa_elems.get("AdditionalFeatures", ET.Element("")).attrib.get("_Comment") or "").strip()
    unit_prop_cond = (unit_pa_elems.get("PropertyCondition", ET.Element("")).attrib.get("_Comment") or "").strip()

    unit_phys_elem = unit_pa_elems.get("PhysicalDeficiency", ET.Element(""))
    unit_phys_ind_raw = (unit_phys_elem.attrib.get("_ExistsIndicator") or "").strip().upper()
    unit_phys_ind = "Yes" if unit_phys_ind_raw == "Y" else ("No" if unit_phys_ind_raw == "N" else (unit_phys_ind_raw or "No"))
    unit_phys_desc = (unit_phys_elem.attrib.get("_Comment") or "").strip()

    unit_conf_elem = unit_pa_elems.get("ConformsToNeighborhood", ET.Element(""))
    unit_conf_ind_raw = (unit_conf_elem.attrib.get("_ExistsIndicator") or "").strip().upper()
    unit_conf_ind = "Yes" if unit_conf_ind_raw == "Y" else ("No" if unit_conf_ind_raw == "N" else (unit_conf_ind_raw or "Yes"))
    unit_conf_desc = (unit_conf_elem.attrib.get("_Comment") or "").strip()

    unit_descriptions_section: Dict[str, Any] = {
        "Unit Charge$": monthly_unit_charge,
        "per month X 12 = $": annual_unit_charge,
        "per year": annual_unit_charge,
        "Annual assessment charge per year per square feet of gross living area = $": unit_charge_sqft,
        "Utilities included in the unit monthly assessment [None/Heat/Air/Conditioning/Electricity/Gas/Water/Sewer/Cable/Other (describe)]": unit_utilities_str,
        "Floor #": unit_floor_num,
        "# of Levels": unit_levels_num,
        "Heating Type/Fuel": unit_heating_str,
        "Central AC/Individual AC/Other (describe)": unit_cooling_str,
        "Fireplace(s) #/Woodstove(s) #/Deck/Patio/Porch/Balcony/Other": unit_amenities_str,
        "Refrigerator/Range/Oven/Disp Microwave/Dishwasher/Washer/Dryer": unit_appliances_str,
        "Floors": unit_floors,
        "Walls": unit_walls,
        "Trim/Finish": unit_trim,
        "Bath Wainscot": unit_wainscot,
        "Doors": unit_doors,
        "None/Garage/Covered/Open": unit_cs_type,
        "Assigned/Owned": unit_cs_assignment,
        "# of Cars": unit_cs_cars,
        "Parking Space #": unit_cs_space,
        "Finished area above grade contains:": unit_finished_area_summary,
        "Rooms": unit_rooms,
        "Bedrooms": unit_bedrooms,
        "Bath(s)": unit_baths,
        "Square Feet of Gross Living Area Above Grade": unit_gla,
        "Are the heating and cooling for the individual units separately metered?": unit_sep_metered,
        "If No, describe and comment on compatibility to other projects in the market area.": unit_sep_metered_desc or ("N/A" if unit_sep_metered == "Yes" else ""),
        "Additional features (special energy efficient items, etc.)": unit_add_features,
        "Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)": unit_prop_cond,
        "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property?": unit_phys_ind,
        "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? ": unit_phys_ind,
        "If Yes, describe": unit_phys_desc or ("N/A" if unit_phys_ind == "No" else ""),
        "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?": unit_conf_ind,
        "If No, describe": unit_conf_desc or ("N/A" if unit_conf_ind == "Yes" else "")
    }

    # Prior Sale History Section
    res_research_val = res_comment if res_did == "did not" and res_comment else res_did
    prior_anal_comment_full = prior_anal_comment
    if not prior_anal_comment_full:
        for ps_elem in (root.findall(".//PRIOR_SALE") + root.findall(".//PRIOR_SALES") + root.findall(".//{*}PRIOR_SALE") + root.findall(".//{*}PRIOR_SALES")):
            c = (
                ps_elem.attrib.get("GSEPriorSaleComment", "").strip() or
                ps_elem.attrib.get("_Comment", "").strip() or
                ps_elem.attrib.get("AnalysisComment", "").strip() or
                ps_elem.attrib.get("_PriorSalesAnalysisComment", "").strip() or
                ps_elem.attrib.get("_AnalysisDescription", "").strip() or
                ""
            )
            if c:
                prior_anal_comment_full = c
                break
    if not prior_anal_comment_full:
        for ra_elem in (root.findall(".//RESEARCH_ANALYSIS") + root.findall(".//{*}RESEARCH_ANALYSIS")):
            c = (
                ra_elem.attrib.get("_PriorSalesAnalysisComment", "").strip() or
                ra_elem.attrib.get("_ResearchAnalysisComment", "").strip() or
                ra_elem.attrib.get("SalesHistoryAnalysisComment", "").strip() or
                ra_elem.attrib.get("_Comment", "").strip() or
                ""
            )
            if c:
                prior_anal_comment_full = c
                break

    subj_ps_date = subj_grid.get("Date of Prior Sale/Transfer", "")
    subj_ps_price = subj_grid.get("Price of Prior Sale/Transfer", "")
    subj_ps_src = subj_grid.get("Data Source(s) for prior sale", "") or subj_prior_src
    subj_ps_eff = subj_grid.get("Effective Date of Data Source(s) for prior sale", "")

    comp1_grid = comps_dict.get("Comparable #1", {}) or comps_dict.get("Comparable Sale 1", {}) or comps_dict.get("COMPARABLE SALE #1", {})
    comp1_date = comp1_grid.get("Date of Prior Sale/Transfer", "") if isinstance(comp1_grid, dict) else ""
    comp1_price = comp1_grid.get("Price of Prior Sale/Transfer", "") if isinstance(comp1_grid, dict) else ""
    comp1_src = (comp1_grid.get("Data Source(s) for prior sale", "") if isinstance(comp1_grid, dict) else "") or comp_prior_src
    comp1_terms = (comp1_grid.get("Sales Concessions", "") or comp1_grid.get("Sales or Financing Concessions", "")) if isinstance(comp1_grid, dict) else ""

    prior_sale_history_section: Dict[str, Any] = {
        "Prior Sale History: I did did not research the sale or transfer history of the subject property and comparable sales": res_research_val,
        "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal": subj_prior_did,
        "Prior Sale History: Data source(s) for subject": subj_prior_src,
        "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale": comp_prior_did,
        "Prior Sale History: Data source(s) for comparables": comp_prior_src,
        "Prior Sale History: Report the results of the research and analysis of the prior sale or transfer history of the subject property and comparable sales": prior_anal_comment_full,
        "Prior Sale History: Date of Prior Sale/Transfer": subj_ps_date,
        "Prior Sale History: Price of Prior Sale/Transfer": subj_ps_price,
        "Prior Sale History: Data Source(s) for prior sale/transfer": subj_ps_src,
        "Prior Sale History: Effective Date of Data Source(s)": subj_ps_eff,
        "Prior Sale History: Analysis of prior sale or transfer history of the subject property and comparable sales": prior_anal_comment_full,
        "Prior Sales or Transfers": subj_prior_did,
        "Subject Transfer History Data Source": subj_prior_src or subj_ps_src,
        "Comparable Number": "1" if comps_dict else "",
        "Comparable Transfer Terms": comp1_terms,
        "Comparable Transfer Date": comp1_date,
        "Comparable Transfer Amount": comp1_price,
        "Comparable Transfer Data Source": comp1_src,
        "Analysis of Prior Sale and Transfer History of Subject Property": prior_anal_comment_full,
        "Analysis of Prior Sale and Transfer History of Comparable Sales": prior_anal_comment_full,
        "I did did not research the sale or transfer history of the subject property and comparable sales": res_research_val,
        "I did did not research the sale or transfer history of the subject property and comparable sales. If not, explain": res_research_val,
        "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal": subj_prior_did,
        "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.": subj_prior_did,
        "Data source(s) for subject": subj_prior_src,
        "Data Source(s) for subject": subj_prior_src,
        "Data source(s) for subject property research": subj_prior_src,
        "Data Source(s) for subject property research": subj_prior_src,
        "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale": comp_prior_did,
        "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.": comp_prior_did,
        "Data source(s) for comparables": comp_prior_src,
        "Data Source(s) for comparables": comp_prior_src,
        "Data source(s) for comparable sales research": comp_prior_src,
        "Data Source(s) for comparable sales research": comp_prior_src,
        "Report the results of the research and analysis of the prior sale or transfer history of the subject property and comparable sales": prior_anal_comment_full,
        "Date of Prior Sale/Transfer": subj_ps_date,
        "Price of Prior Sale/Transfer": subj_ps_price,
        "Data Source(s) for prior sale/transfer": subj_ps_src,
        "Data Source(s) for prior sale": subj_ps_src,
        "Effective Date of Data Source(s)": subj_ps_eff,
        "Effective Date of Data Source(s) for prior sale": subj_ps_eff,
        "Analysis of prior sale or transfer history of the subject property and comparable sales": prior_anal_comment_full,
        "Analysis of prior sale or transfer history of the subject property and comparable sales.": prior_anal_comment_full,
        "SubjectPriorSalesAndTransferHistory": prior_anal_comment_full,
        "GSEPriorSaleComment": prior_anal_comment_full,
        "_CurrentSalesAgreementAnalysisComment": prior_anal_comment_full,
        "_PriorSalesAnalysisComment": prior_anal_comment_full,
    }

    # Extract comment related to >15% increase if subject prior sale in same year is >15% lower than appraised value
    try:
        def _parse_num(val):
            m = re.sub(r'[^0-9.]', '', str(val or ''))
            return float(m) if m else 0.0

        p_num = _parse_num(subj_ps_price)
        a_num = _parse_num(appraised_val)
        m_ps_yr = re.search(r'\b(20\d{2})\b', str(subj_ps_date or ''))
        m_eff_yr = re.search(r'\b(20\d{2})\b', str(effective_date or ''))
        if p_num > 0 and a_num > p_num * 1.15001 and m_ps_yr and m_eff_yr and m_ps_yr.group(1) == m_eff_yr.group(1):
            inc_comm = ""
            if prior_anal_comment_full and re.search(r'(?:increase|appreciat|renovat|remodel|updat|improv|flip|purchas|sold|transfer|market|value|percent|%|addition)', prior_anal_comment_full, re.I):
                if not re.match(r'^(?:my\s+research\s+)?(?:did\s+not\s+reveal|revealed\s+no|no)\s+prior\s+sales?', prior_anal_comment_full.strip(), re.I):
                    inc_comm = prior_anal_comment_full.strip()
            reconciliation_section["Comment on Increase in Value"] = inc_comm
    except Exception:
        pass

    # Combined master fields object
    fields: Dict[str, Any] = {
        "From Type": form_type,
        "Form Type": form_type,
        "formType": form_type,
        "form_type": form_type,
        "Full Address": full_addr,
        "Property Address": prop_addr,
        "Unit #": unit_id or subj_unit_id,
        "Unit Number": unit_id or subj_unit_id,
        "Unit": unit_id or subj_unit_id,
        "Project Name": subj_project_name,
        "Phase": subj_project_phase,
        "Project Name and Phase": subj_project_name_phase,
        "City": prop_city,
        "County": prop_county,
        "State": prop_state,
        "Zip Code": prop_zip,
        "Borrower": borrower_name,
        "Owner of Public Record": owner_name,
        "Appraised Value": appraised_val,
        "Effective Date": effective_date,
        "opinion of the market value, as defined, of the real property that is the subject of this report is $": appraised_val,
        "as of": effective_date,
        "as of date": effective_date,
        "File #": file_id,
        "Loan #": loan_num,
        "FHA Case No.": fha_case_no,
        "FHA Case #": fha_case_no,
        "FHA Case Number": fha_case_no,
        "Appraiser's Fee": appraiser_fee,
        "Appraiser Fee": appraiser_fee,
        "Appraisal Fee": appraiser_fee,
        "AMC License #": amc_license,
        "AMC License": amc_license,
        "AMC Name": amc_name,
        "LENDER/CLIENT Name": lender_client_name,
        "Lender/Client Name": lender_client_name,
        "Lender Name": lender_name,
        "Lender/Client Company Name": lender_name,
        "Lender/Client Company Address": lender_address,
        "Lender/Client Email Address": lender_email,
        "Lender/Client": lender_name,
        "1004MC Addendum": mc_present_str,
        "1004MC Present": "Yes" if has_1004mc else "No",
        "has_1004mc": has_1004mc,
        "USPAP / Appraisal and Report Identification": uspap_ident_str,
        "Appraisal and Report Identification": uspap_ident_str,
        "USPAP Addendum": uspap_ident_str,
        "has_uspap_identification": has_uspap_ident,
        "UAD pages present in the report": uad_present_str,
        "UAD Pages Present in the Report": uad_present_str,
        "UAD Pages Present": "Yes" if has_uad_pages else "No",
        "UAD Pages": uad_present_str,
        "UAD Definitions Addendum": uad_present_str,
        "UAD Dataset Pages": uad_present_str,
        "has_uad_pages": has_uad_pages,
        "uad_pages": uad_pages,
        "uad_details": uad_details,
        "Limiting Conditions": uad_details.get("limiting_conditions_presence", "Not Present"),
        "Statement of Assumptions and Limiting Conditions": uad_details.get("limiting_conditions_presence", "Not Present"),
        "limiting_conditions_pages": uad_details.get("limiting_conditions_pages", []),
        "limiting_conditions_presence": uad_details.get("limiting_conditions_presence", "Not Present"),
        "Appraiser's Certification": uad_details.get("certification_presence", "Not Present"),
        "Appraiser Certification": uad_details.get("certification_presence", "Not Present"),
        "certification_pages": uad_details.get("certification_pages", []),
        "certification_presence": uad_details.get("certification_presence", "Not Present"),
        "UAD Details": uad_details.get("details_summary", ""),
        "ANSI": ansi_comment,
        "ANSI Standards": ansi_comment,
        "ANSI Comment": ansi_comment,
        "Exposure comment": exposure_comment,
        "Exposure Comment": exposure_comment,
        "Reasonable Exposure Time": exposure_comment,
        "Prior service comment": prior_service_comment,
        "USPAP Reporting Option": uspap_reporting_option,
        uspap_long_key: uspap_reporting_option,
        "This report was prepared under the following USPAP reporting option:": uspap_reporting_option,
        "Comments on Appraisal and Report Identification": uspap_comment,
        "Restricted Appraisal Report Comment": uspap_comment,
        "Subject": clean_subject,
        "SUBJECT": clean_subject,
        "CONTRACT": contract_section,
        "NEIGHBORHOOD": neighborhood_section,
        "Neighborhood": neighborhood_section,
        "Present Land Use for other": other_land_use_desc,
        "Over/Under-Improvement Comment": over_under_comment,
        "Predominant Price Commentary": over_under_comment,
        "Legal Nonconforming (Grandfathered Use) comment": nonconforming_comment,
        "Legal Nonconforming comment": nonconforming_comment,
        "Nonconforming comment": nonconforming_comment,
        "Zoning Compliance comment": nonconforming_comment,
        "SITE": site_section,
        "PROJECT_SITE": site_section,
        "Project Site": site_section,
        "IMPROVEMENTS": improvements_section,
        "SALES_GRID": sales_grid,
        "Sales Grid": clean_sales_grid,
        "sales_grid_custom_rows": sales_grid.get("sales_grid_custom_rows", []),
        "INFO_OF_SALES": merged_info_of_sales,
        "SALES_TRANSFER": merged_info_of_sales,
        "RECONCILIATION": reconciliation_section,
        "INCOME_APPROACH": income_approach_section,
        "COST_APPROACH": cost_approach_section,
        "PUD_INFO": pud_info_section,
        "PROJECT_INFO": project_info_section,
        "Project Information": project_info_section,
        "PROJECT_ANALYSIS": project_analysis_section,
        "Project Analysis": project_analysis_section,
        "UNIT_DESCRIPTIONS": unit_descriptions_section,
        "Unit Descriptions": unit_descriptions_section,
        "PRIOR_SALE_HISTORY": prior_sale_history_section,
        "Prior Sale History": prior_sale_history_section,
        "prior_sale_history": prior_sale_history_section,
        "MARKET_CONDITIONS": market_conditions_section,
        "CONDO_COOP_PROJECTS": condo_coop_section,
        "CONDO_FORECLOSURE": condo_foreclosure_section,
        "CERTIFICATION": certification_section,
        "Certification": certification_section,
        "USPAP_IDENTIFICATION": uspap_identification_section,
        "USPAP_REPORT_IDENTIFICATION": uspap_identification_section,
        "USPAP / Report Identification": uspap_identification_section,
        "Signature Image": appraiser_sig_b64,
        "Supervisory Signature Image": supervisory_sig_b64,
        "SUBJECT_RENT_SCHEDULE": subject_rent_schedule,
        "Single Family Rent Schedule": single_family_rent_schedule,
        "SINGLE_FAMILY_RENT_SCHEDULE": single_family_rent_schedule,
        "Comparable Rental Data": comparable_rental_data,
        "COMPARABLE_RENTAL_DATA": comparable_rental_data,
        "Comparable Rent Schedule": comparable_rent_schedule,
        "COMPARABLE_RENT_SCHEDULE": comparable_rent_schedule,
        "RENT_SCHEDULE_GRID": comparable_rent_schedule,
        "Comparable Rent Schedule Reconciliation": rent_reconciliation,
        "RENT_SCHEDULE_RECONCILIATION": rent_reconciliation,
        "EXTRACTED_PHOTOS": extracted_photos,
        "E&O": certification_section.get("E&O", "Absent"),
        "E&O Present": certification_section.get("E&O Present", "Absent"),
        "E/O": certification_section.get("E/O", certification_section.get("E&O", "Absent")),
        "E/O Present": certification_section.get("E/O Present", certification_section.get("E&O Present", "Absent")),
        "E&O Insurance": certification_section.get("E&O Insurance", ""),
        "E/O Insurance": certification_section.get("E/O Insurance", certification_section.get("E&O Insurance", "")),
        "Invoice Attached": certification_section.get("Invoice Attached", inv_present_str),
        "Invoice Present": certification_section.get("Invoice Present", inv_present_str),
        "has_invoice": has_invoice,
    }

    if has_invoice:
        fields.setdefault("INVOICE", {})
        fields["INVOICE"].update(inv_details)
        fields["INVOICE"]["Invoice Attached"] = "Yes"
        fields["INVOICE"]["Invoice Present"] = "Yes"
        if inv_details.get("Invoice Page"):
            fields["INVOICE"]["Invoice Page"] = inv_details["Invoice Page"]
        if inv_details.get("Invoice Total"):
            fields["INVOICE"]["Invoice Total"] = inv_details["Invoice Total"]
            fields["INVOICE"]["Total Fee"] = inv_details["Invoice Total"]
        # Link base64 preview from extracted_photos if present
        if not fields["INVOICE"].get("base64_preview"):
            for p in extracted_photos or []:
                if p.get("category") == "Invoice" and p.get("base64_preview"):
                    fields["INVOICE"]["base64_preview"] = p.get("base64_preview")
                    break
        fields["Invoice"] = fields["INVOICE"]
        fields["invoice_data"] = fields["INVOICE"]
        for ik, iv in fields["INVOICE"].items():
            if iv and ik not in fields:
                fields[ik] = iv

    # Ensure E&O fields are linked and exposed at root and in dedicated dictionary
    has_eo = certification_section.get("E&O") == "Present" or eo_found or any(p.get("category") == "E&O Insurance" for p in extracted_photos or [])
    if has_eo:
        eo_dict = {}
        for k in ["E&O", "E&O Present", "E&O Attached", "has_eo", "E&O Page", "E&O Insurance", "Policy Period From", "Policy Period To", "E&O Insured", "E&O Carrier", "E&O Limit", "E&O Deductible", "base64_preview"]:
            if certification_section.get(k):
                eo_dict[k] = certification_section[k]
        eo_dict["E&O"] = "Present"
        eo_dict["E&O Present"] = "Present"
        eo_dict["E&O Attached"] = "Yes"
        eo_dict["has_eo"] = True
        for p in extracted_photos or []:
            if p.get("category") == "E&O Insurance":
                if p.get("base64_preview") and not eo_dict.get("base64_preview"):
                    eo_dict["base64_preview"] = p.get("base64_preview")
                if p.get("page") and not eo_dict.get("E&O Page"):
                    eo_dict["E&O Page"] = p.get("page")
                if p.get("eo_data"):
                    for ek, ev in p["eo_data"].items():
                        if ev and not eo_dict.get(ek):
                            eo_dict[ek] = ev
                if "eo_data" in p and isinstance(p["eo_data"], dict):
                    for ek, ev in eo_dict.items():
                        if ev and not p["eo_data"].get(ek):
                            p["eo_data"][ek] = ev
                break

        for ek, ev in eo_dict.items():
            if ev and not certification_section.get(ek):
                certification_section[ek] = ev

        fields["EO"] = eo_dict
        fields["E&O"] = eo_dict
        fields["eo_data"] = eo_dict
        for ek, ev in eo_dict.items():
            if ev and ek not in fields:
                fields[ek] = ev

    # Flatten category fields into root fields so data[field] is directly available to UI
    for cat_dict in [clean_subject, contract_section, neighborhood_section, site_section, improvements_section, reconciliation_section, income_approach_section, cost_approach_section, pud_info_section, project_info_section, project_analysis_section, unit_descriptions_section, prior_sale_history_section, market_conditions_section, condo_coop_section, condo_foreclosure_section, certification_section, uspap_identification_section, info_of_sales_section]:
        for k, v in cat_dict.items():
            if k not in fields:
                fields[k] = v

    # Map individual comps for Form1025 and 1004 grids without overwriting Subject
    for comp_name, comp_data in comps_dict.items():
        if comp_name not in ("Subject", "SUBJECT") and comp_name not in fields:
            fields[comp_name] = comp_data

    fields["Subject"] = clean_subject
    fields["SUBJECT"] = clean_subject

    # Map individual rentals for Form 1025 (COMPARABLE RENTAL DATA)
    for rent_name, rent_data in comparable_rental_data.items():
        if rent_name not in ("Subject", "SUBJECT"):
            fields[rent_name] = rent_data

    # Map individual rentals for Form 1007 (Comparable Rent Schedule)
    for rc_name, rc_data in comparable_rent_schedule.items():
        if rc_name not in ("Subject", "SUBJECT") and rc_name not in fields:
            fields[rc_name] = rc_data

    if mf_analysis_comment:
        fields["Rental Data Analysis Comment"] = mf_analysis_comment
        fields["RentalDataAnalysisComment"] = mf_analysis_comment
        fields["Analysis of rental data and support for estimated market rents for the individual subject units reported below (including the adequacy of the comparables, rental concessions, etc.)"] = mf_analysis_comment

    # Map Form 1007 Rent Reconciliation fields
    for rk, rv in rent_reconciliation.items():
        fields[rk] = rv

    # Clean structured appraisal data dictionary (single clean section hierarchy where Subject and Sales Grid are distinct)
    clean_data: Dict[str, Any] = {
        "Form Type": form_type,
        "has_1004mc": has_1004mc,
        "1004MC Addendum": mc_present_str,
        "has_uspap_identification": has_uspap_ident,
        "USPAP / Appraisal and Report Identification": uspap_ident_str,
        "Appraisal and Report Identification": uspap_ident_str,
        "USPAP Addendum": uspap_ident_str,
        "Invoice Attached": inv_present_str,
        "Invoice Present": inv_present_str,
        "has_invoice": has_invoice,
        "UAD pages present in the report": uad_present_str,
        "UAD Pages Present in the Report": uad_present_str,
        "UAD Pages Present": "Yes" if has_uad_pages else "No",
        "UAD Pages": uad_present_str,
        "UAD Definitions Addendum": uad_present_str,
        "UAD Dataset Pages": uad_present_str,
        "has_uad_pages": has_uad_pages,
        "uad_pages": uad_pages,
        "uad_details": uad_details,
        "Limiting Conditions": uad_details.get("limiting_conditions_presence", "Not Present"),
        "Statement of Assumptions and Limiting Conditions": uad_details.get("limiting_conditions_presence", "Not Present"),
        "limiting_conditions_pages": uad_details.get("limiting_conditions_pages", []),
        "limiting_conditions_presence": uad_details.get("limiting_conditions_presence", "Not Present"),
        "Appraiser's Certification": uad_details.get("certification_presence", "Not Present"),
        "Appraiser Certification": uad_details.get("certification_presence", "Not Present"),
        "certification_pages": uad_details.get("certification_pages", []),
        "certification_presence": uad_details.get("certification_presence", "Not Present"),
        "UAD Details": uad_details.get("details_summary", ""),
        "Subject": clean_subject,
        "Contract": contract_section,
        "Neighborhood": neighborhood_section,
        "NEIGHBORHOOD": neighborhood_section,
        "Present Land Use for other": other_land_use_desc,
        "Site": site_section,
        "SITE": site_section,
        "Project Site": site_section,
        "PROJECT_SITE": site_section,
        "Topography": site_topography,
        "Size": site_size,
        "Density": site_density,
        "TOPOGRAPHY": site_topography,
        "SIZE": site_size,
        "DENSITY": site_density,
        "Improvements": improvements_section,
        "Sales Grid": clean_sales_grid,
        "sales_grid_custom_rows": sales_grid.get("sales_grid_custom_rows", []),
        "Reconciliation": reconciliation_section,
        "USPAP_IDENTIFICATION": uspap_identification_section,
        "USPAP / Report Identification": uspap_identification_section,
    }
    if cost_approach_section and any(cost_approach_section.values()):
        clean_data["Cost Approach"] = cost_approach_section
    if income_approach_section and any(income_approach_section.values()):
        clean_data["Income Approach"] = income_approach_section
    if pud_info_section and any(pud_info_section.values()):
        clean_data["PUD Information"] = pud_info_section
    if project_info_section and any(project_info_section.values()):
        clean_data["Project Information"] = project_info_section
    if project_analysis_section and any(project_analysis_section.values()):
        clean_data["Project Analysis"] = project_analysis_section
    if unit_descriptions_section and any(unit_descriptions_section.values()):
        clean_data["Unit Descriptions"] = unit_descriptions_section
        clean_data["UNIT_DESCRIPTIONS"] = unit_descriptions_section
    if prior_sale_history_section and any(prior_sale_history_section.values()):
        clean_data["Prior Sale History"] = prior_sale_history_section
        clean_data["PRIOR_SALE_HISTORY"] = prior_sale_history_section
    if market_conditions_section and any(market_conditions_section.values()):
        clean_data["Market Conditions Addendum"] = market_conditions_section
    if condo_coop_section and any(condo_coop_section.values()):
        clean_data["Condo / Coop Projects"] = condo_coop_section
    if condo_foreclosure_section and any(condo_foreclosure_section.values()):
        clean_data["Condo Foreclosure"] = condo_foreclosure_section
    if subject_rent_schedule and any(subject_rent_schedule.values()):
        clean_data["Subject Rent Schedule"] = subject_rent_schedule
    if comparable_rental_data and any(comparable_rental_data.values()):
        clean_data["Comparable Rental Data"] = comparable_rental_data
        clean_data["COMPARABLE_RENTAL_DATA"] = comparable_rental_data
        fields["Comparable Rental Data"] = comparable_rental_data
        fields["COMPARABLE_RENTAL_DATA"] = comparable_rental_data
    if comparable_rent_schedule and any(comparable_rent_schedule.values()):
        clean_data["Comparable Rent Schedule"] = comparable_rent_schedule
        clean_data["COMPARABLE_RENT_SCHEDULE"] = comparable_rent_schedule
        clean_data["RENT_SCHEDULE_GRID"] = comparable_rent_schedule
        fields["Comparable Rent Schedule"] = comparable_rent_schedule
        fields["COMPARABLE_RENT_SCHEDULE"] = comparable_rent_schedule
        fields["RENT_SCHEDULE_GRID"] = comparable_rent_schedule
    if mf_analysis_comment:
        clean_data["Rental Data Analysis Comment"] = mf_analysis_comment
        clean_data["RentalDataAnalysisComment"] = mf_analysis_comment
        clean_data["Analysis of rental data and support for estimated market rents for the individual subject units reported below (including the adequacy of the comparables, rental concessions, etc.)"] = mf_analysis_comment
    if rent_reconciliation and any(rent_reconciliation.values()):
        clean_data["Comparable Rent Schedule Reconciliation"] = rent_reconciliation
    if single_family_rent_schedule and any(single_family_rent_schedule.values()):
        clean_data["Single Family Rent Schedule"] = single_family_rent_schedule
    if certification_section and any(certification_section.values()):
        clean_data["Certification"] = certification_section
    if manufactured_home_section and any(manufactured_home_section.values()):
        clean_data["Manufactured Home"] = manufactured_home_section
        clean_data["MANUFACTURED_HOME"] = manufactured_home_section
        fields["Manufactured Home"] = manufactured_home_section
        fields["MANUFACTURED_HOME"] = manufactured_home_section
        for mk, mv in manufactured_home_section.items():
            if mv:
                fields.setdefault(mk, mv)
    if has_invoice and "INVOICE" in fields:
        clean_data["Invoice"] = fields["INVOICE"]
        clean_data["INVOICE"] = fields["INVOICE"]
        clean_data["invoice_data"] = fields["INVOICE"]
    if "EO" in fields:
        clean_data["EO"] = fields["EO"]
        clean_data["E&O"] = fields["EO"]
        clean_data["eo_data"] = fields["EO"]

    # Dedicated Separate Extraction for Sales Grid Addresses and Rental Grid Addresses
    sales_grid_addresses: Dict[str, Any] = {}
    sales_addr_details = []
    subj_full_addr = clean_subject.get("Full Address") or full_addr or prop_addr or ""
    sales_grid_addresses["Subject"] = subj_full_addr
    sales_addr_details.append({
        "comp_type": "Subject",
        "comp_num": 0,
        "address": subj_full_addr,
        "street": clean_subject.get("Property Address") or prop_addr or "",
        "city": clean_subject.get("City") or prop_city or "",
        "state": clean_subject.get("State") or prop_state or "",
        "zip": clean_subject.get("Zip Code") or prop_zip or "",
        "proximity": "0.00 mi",
        "sale_price": clean_sales_grid.get("Subject", {}).get("Sale Price") or ""
    })
    for k, v in clean_sales_grid.items():
        if k != "Subject" and isinstance(v, dict):
            m = re.search(r'\d+', k)
            cnum = int(m.group(0)) if m else len(sales_addr_details)
            addr = v.get("Address") or v.get("Street Address") or ""
            sales_grid_addresses[f"Comparable Sale {cnum}"] = addr
            sales_grid_addresses[f"Comparable #{cnum}"] = addr
            sales_grid_addresses[f"Comparable {cnum}"] = addr
            sales_grid_addresses[f"Comp {cnum}"] = addr
            sales_grid_addresses[f"COMPARABLE SALE #{cnum}"] = addr
            sales_addr_details.append({
                "comp_type": f"Comparable Sale {cnum}",
                "comp_num": cnum,
                "address": addr,
                "street": v.get("Street Address") or (addr.split(",")[0].strip() if addr else ""),
                "proximity": v.get("Proximity to Subject") or "",
                "sale_price": v.get("Sale Price") or ""
            })
    sales_grid_addresses["details"] = sales_addr_details
    sales_grid_addresses["addresses"] = [d["address"] for d in sales_addr_details if d.get("address")]

    rental_grid_addresses: Dict[str, Any] = {}
    rental_addr_details = []
    subj_rent_addr = (
        single_family_rent_schedule.get("Address")
        or single_family_rent_schedule.get("Subject Address")
        or subject_rent_schedule.get("Address")
        or subj_full_addr
    )
    if single_family_rent_schedule or subject_rent_schedule or comparable_rental_data:
        rental_grid_addresses["Subject"] = subj_rent_addr

    seen_rent_nums = set()
    rgrid = comparable_rental_data or comparable_rent_schedule or single_family_rent_schedule or {}
    for k, v in rgrid.items():
        if isinstance(v, dict) and any(x in k.upper() for x in ["RENTAL", "COMPARABLE NO", "COMPARABLE RENTAL"]):
            m = re.search(r'\d+', k)
            cnum = int(m.group(0)) if m else (len(rental_addr_details) + 1)
            if cnum not in seen_rent_nums:
                seen_rent_nums.add(cnum)
                addr = v.get("Address") or v.get("Street Address") or ""
                m_st = re.match(r'^([^,]+)', addr)
                st = m_st.group(1).strip() if m_st else addr
                rental_grid_addresses[f"COMPARABLE NO. {cnum}"] = addr
                rental_grid_addresses[f"Comparable No. {cnum}"] = addr
                rental_grid_addresses[f"Comparable No {cnum}"] = addr
                rental_grid_addresses[f"Rental {cnum}"] = addr
                rental_grid_addresses[f"Comparable Rental #{cnum}"] = addr
                rental_grid_addresses[f"Comparable Rental {cnum}"] = addr
                rental_grid_addresses[f"COMPARABLE RENTAL #{cnum}"] = addr
                rental_addr_details.append({
                    "comp_type": f"Comparable Rental {cnum}",
                    "comp_num": cnum,
                    "address": addr,
                    "street": st,
                    "proximity": v.get("Proximity to Subject") or v.get("Proximity") or "",
                    "monthly_rent": v.get("Monthly Rental") or v.get("Adjusted Monthly Rent") or ""
                })
    rental_grid_addresses["details"] = rental_addr_details
    rental_grid_addresses["addresses"] = [d["address"] for d in rental_addr_details if d.get("address")]

    clean_data["sales_grid_addresses"] = sales_grid_addresses
    clean_data["SALES_GRID_ADDRESSES"] = sales_grid_addresses
    clean_data["rental_grid_addresses"] = rental_grid_addresses
    clean_data["RENTAL_GRID_ADDRESSES"] = rental_grid_addresses
    fields["sales_grid_addresses"] = sales_grid_addresses
    fields["SALES_GRID_ADDRESSES"] = sales_grid_addresses
    fields["rental_grid_addresses"] = rental_grid_addresses
    fields["RENTAL_GRID_ADDRESSES"] = rental_grid_addresses

    fields["Form Type"] = form_type
    fields["From Type"] = form_type
    fields["formType"] = form_type
    fields["selectedFormType"] = form_type

    # Compile Mandatory Subject Photos summary
    mandatory_subject_photos = {}
    if extracted_photos:
        mand_groups = {
            "Subject Front View": [],
            "Subject Rear View": [],
            "Subject Side View": [],
            "Subject Street Scene": [],
            "HUD Certification Label": [],
            "HUD Data Plate / Compliance Certificate": []
        }
        for p in extracted_photos:
            vt = p.get("view_type")
            if vt in mand_groups:
                mand_groups[vt].append(p)
            elif p.get("category") in ("Subject", "Subject property"):
                cap_res = classify_subject_view_label(p.get("caption") or p.get("title") or "", page_context=p.get("original_caption") or "")
                if cap_res and cap_res[0] in mand_groups:
                    p["view_type"] = cap_res[0]
                    p["original_label"] = cap_res[1]
                    p["is_mandatory"] = True
                    mand_groups[cap_res[0]].append(p)

        is_1004c_form = bool(
            form_type in ("1004C", "1004C + 1007") or
            "1004C" in str(form_type).upper() or
            "MANUFACTURED" in str(form_type).upper()
        )
        required_mand_views = [
            "Subject Front View",
            "Subject Rear View",
            "Subject Side View",
            "Subject Street Scene"
        ]
        if is_1004c_form:
            required_mand_views.extend([
                "HUD Certification Label",
                "HUD Data Plate / Compliance Certificate"
            ])
        missing_mand = [k for k in required_mand_views if len(mand_groups.get(k, [])) == 0]
        mandatory_subject_photos = {
            "all_mandatory_found": len(missing_mand) == 0,
            "summary": {
                k: {
                    "found": len(v) > 0,
                    "count": len(v),
                    "original_labels": [x.get("original_label") or x.get("caption") for x in v],
                    "pages": [x.get("page") for x in v]
                } for k, v in mand_groups.items()
            },
            "missing_views": missing_mand,
            "photos": mand_groups
        }
        clean_data["EXTRACTED_PHOTOS"] = extracted_photos
        clean_data["extracted_photos"] = extracted_photos
        clean_data["MANDATORY_SUBJECT_PHOTOS"] = mandatory_subject_photos
        clean_data["mandatory_subject_photos"] = mandatory_subject_photos
        fields["MANDATORY_SUBJECT_PHOTOS"] = mandatory_subject_photos
        fields["mandatory_subject_photos"] = mandatory_subject_photos

    # HUD Image OCR Extraction & Cross-Verification for Form 1004C
    is_1004c_report = bool(
        form_type in ("1004C", "1004C + 1007") or
        "1004C" in str(form_type).upper() or
        "MANUFACTURED" in str(form_type).upper() or
        (manufactured_home_section and any(manufactured_home_section.values()))
    )
    if is_1004c_report:
        hud_pdf_source = companion_pdf_path
        if not hud_pdf_source or not os.path.exists(hud_pdf_source):
            # Look for companion PDF with same stem in workspace, cwd, or parent directories
            search_dirs = [
                os.getcwd(),
                os.path.dirname(os.getcwd()),
                os.path.dirname(os.path.abspath(__file__)),
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            ]
            if isinstance(xml_path_or_bytes, str):
                search_dirs.append(os.path.dirname(os.path.abspath(xml_path_or_bytes)))
                xml_stem = os.path.splitext(os.path.basename(xml_path_or_bytes))[0]
            else:
                xml_stem = ""

            for sdir in search_dirs:
                if not sdir or not os.path.isdir(sdir):
                    continue
                if xml_stem:
                    cand = os.path.join(sdir, f"{xml_stem}.pdf")
                    if os.path.exists(cand):
                        hud_pdf_source = cand
                        break
                # Also check case-insensitive match
                if not hud_pdf_source and xml_stem:
                    try:
                        for entry in os.listdir(sdir):
                            if entry.lower() == f"{xml_stem.lower()}.pdf":
                                hud_pdf_source = os.path.join(sdir, entry)
                                break
                    except Exception:
                        pass
                if hud_pdf_source:
                    break

        try:
            try:
                from api.hud_plate_reader import extract_hud_image_data_from_pdf, extract_hud_image_data_from_photos, compare_form_with_image_data
            except ImportError:
                try:
                    from appraisal_review.api.hud_plate_reader import extract_hud_image_data_from_pdf, extract_hud_image_data_from_photos, compare_form_with_image_data
                except ImportError:
                    from hud_plate_reader import extract_hud_image_data_from_pdf, extract_hud_image_data_from_photos, compare_form_with_image_data

            hud_ocr_res = {}
            if hud_pdf_source and os.path.exists(hud_pdf_source):
                hud_ocr_res = extract_hud_image_data_from_pdf(hud_pdf_source)

            # Fallback to direct OCR on extracted photos if PDF missing or produced empty results
            if not hud_ocr_res and extracted_photos:
                hud_ocr_res = extract_hud_image_data_from_photos(extracted_photos)

            if hud_ocr_res:
                hud_verif = compare_form_with_image_data(manufactured_home_section or fields, hud_ocr_res)
                clean_data["HUD_IMAGE_DATA"] = hud_ocr_res
                clean_data["HUD_IMAGE_VERIFICATION"] = hud_verif
                fields["HUD_IMAGE_DATA"] = hud_ocr_res
                fields["HUD_IMAGE_VERIFICATION"] = hud_verif
                if manufactured_home_section is not None:
                    manufactured_home_section["_hud_image_data"] = hud_ocr_res
                    manufactured_home_section["_hud_image_verification"] = hud_verif
        except Exception as e_hud:
            print(f"[xml_extractor] HUD OCR verification error: {e_hud}")

    # Photo room label counts
    photo_room_counts = {
        "bedroom_count": 0,
        "full_bath_count": 0,
        "half_bath_count": 0,
        "living_count": 0,
        "kitchen_count": 0,
        "dining_count": 0,
        "other_count": 0,
        "total_room_count": 0,
        "bedroom_display": "—",
        "bathroom_display": "—",
        "bathroom_detail": "",
        "total_room_display": "—",
        "gla_display": "—"
    }
    if extracted_photos:
        bed_photo_count = 0
        half_bath_photo_count = 0
        full_bath_photo_count = 0
        distinct_living = set()
        distinct_kitchen = set()
        distinct_dining = set()
        distinct_other = set()
        distinct_basement = set()
        bsmt_rr_count = 0
        bsmt_br_count = 0
        bsmt_full_ba_count = 0
        bsmt_half_ba_count = 0
        bsmt_o_count = 0

        for p in extracted_photos:
            cat = (p.get("category") or "").strip().lower()
            if any(k in cat for k in ["comparable", "rental", "map", "sketch"]):
                continue
            cap = (p.get("caption") or p.get("title") or p.get("original_label") or "").strip()
            if not cap:
                continue
            norm_cap = re.sub(r'\s*\([a-zA-Z0-9]+\)$', '', cap).strip().lower()
            is_dup_angle = bool(re.search(r'\b(?:angle\s*[2-9]|view\s*[2-9]|alt(?:ernate)?\s*view|2nd\s*view)\b', cap, re.I))

            # Separate any photo whose label references Basement / Below Grade / Lower Level
            if re.search(r'\b(?:basement|bsmt|below\s*grade|lower\s*level|cellar)\b', norm_cap):
                distinct_basement.add(f"{len(distinct_basement)}_{norm_cap}")
                if is_dup_angle:
                    continue
                if re.search(r'\b(?:bedroom|bdrm|bed\b|mbr\b|master\s*bed|primary\s*bed|guest\s*bed|br\s*\d*)\b', norm_cap):
                    bsmt_br_count += 1
                elif re.search(r'(?:^|[\s\b])(?:half[\s-]*(?:bath(?:room)?|bth|ba)|1\/2[\s-]*(?:bath(?:room)?|bth|ba)|0?\.5[\s-]*(?:bath(?:room)?|bth|ba)|(?:bath(?:room)?|bth|ba)\s*(?:\(\s*)?(?:half|1\/2|0?\.5)(?:\s*\))?|powder(?:\s*room)?|lav(?:atory)?|wc)\b', norm_cap):
                    bsmt_half_ba_count += 1
                elif re.search(r'\b(?:full\s*bath|full\s*ba|master\s*bath|primary\s*bath|guest\s*bath|hall\s*bath|bath\s*#?\s*\d|bathroom|bath\b|bth\b|3\/4\s*bath)\b', norm_cap):
                    bsmt_full_ba_count += 1
                elif re.search(r'\b(?:rec(?:reation)?|family\s*room|game\s*room|media\s*room|play\s*room)\b', norm_cap):
                    bsmt_rr_count += 1
                elif re.search(r'\b(?:kitchen|kitchenette|kit\b|dining|den\b|office\b|study\b|bar\b|wet\s*bar|wetbar|bonus)\b', norm_cap):
                    bsmt_o_count += 1
                continue

            if re.search(r'\b(?:bedroom|bdrm|bed\b|mbr\b|master\s*bed|primary\s*bed|guest\s*bed)\b', norm_cap):
                if not is_dup_angle:
                    bed_photo_count += 1
            elif re.search(r'(?:^|[\s\b])(?:half[\s-]*(?:bath(?:room)?|bth|ba)|1\/2[\s-]*(?:bath(?:room)?|bth|ba)|0?\.5[\s-]*(?:bath(?:room)?|bth|ba)|(?:bath(?:room)?|bth|ba)\s*(?:\(\s*)?(?:half|1\/2|0?\.5)(?:\s*\))?|powder(?:\s*room)?|lav(?:atory)?|wc)\b', norm_cap):
                if not is_dup_angle:
                    half_bath_photo_count += 1
            elif re.search(r'\b(?:full\s*bath|full\s*ba|master\s*bath|primary\s*bath|guest\s*bath|hall\s*bath|bath\s*#?\s*\d|bathroom|bath\b|bth\b|3\/4\s*bath)\b', norm_cap):
                if not is_dup_angle:
                    full_bath_photo_count += 1
            elif re.search(r'\b(?:living|family\s*room|great\s*room|sitting\s*room)\b', norm_cap):
                distinct_living.add(norm_cap)
            elif re.search(r'\b(?:kitchen|kitchenette|kit\b)\b', norm_cap):
                distinct_kitchen.add(norm_cap)
            elif re.search(r'\b(?:dining|dinette|breakfast\s*nook)\b', norm_cap):
                distinct_dining.add(norm_cap)
            elif re.search(r'\b(?:den\b|office\b|study\b|library\b|sunroom\b|bonus\s*room)\b', norm_cap):
                distinct_other.add(norm_cap)

        bed_count = bed_photo_count
        full_bath_count = full_bath_photo_count
        half_bath_count = half_bath_photo_count
        living_count = len(distinct_living)
        kitchen_count = len(distinct_kitchen)
        dining_count = len(distinct_dining)
        other_count = len(distinct_other)

        tot_room_count = bed_count + living_count + kitchen_count + dining_count + other_count
        bath_disp = "—"
        bath_det = ""
        if full_bath_count > 0 or half_bath_count > 0:
            if half_bath_count > 0:
                bath_disp = f"{full_bath_count}.{half_bath_count} Baths"
                bath_det = f"{full_bath_count} Full, {half_bath_count} Half"
            else:
                bath_disp = f"{full_bath_count}.0 Baths"
                bath_det = f"{full_bath_count} Full Bath{'s' if full_bath_count != 1 else ''}"

        bsmt_count = len(distinct_basement)
        bsmt_ba_val = bsmt_full_ba_count + (0.5 * bsmt_half_ba_count)
        photo_room_counts = {
            "bedroom_count": bed_count,
            "full_bath_count": full_bath_count,
            "half_bath_count": half_bath_count,
            "living_count": living_count,
            "kitchen_count": kitchen_count,
            "dining_count": dining_count,
            "other_count": other_count,
            "total_room_count": tot_room_count,
            "basement_count": bsmt_count,
            "basement_display": f"{bsmt_count} Photo{'s' if bsmt_count != 1 else ''}" if bsmt_count > 0 else "—",
            "basement_rooms": {
                "rr": bsmt_rr_count,
                "br": bsmt_br_count,
                "ba": bsmt_ba_val,
                "o": bsmt_o_count,
            },
            "bedroom_display": f"{bed_count} Bed{'s' if bed_count != 1 else ''}" if bed_count > 0 else "—",
            "bathroom_display": bath_disp,
            "bathroom_detail": bath_det,
            "total_room_display": f"{tot_room_count} Rooms" if tot_room_count > 0 else "—",
            "gla_display": "—"
        }

    clean_data["photo_room_counts"] = photo_room_counts
    clean_data["PHOTO_ROOM_COUNTS"] = photo_room_counts
    clean_data["Bedroom Photo Count"] = str(photo_room_counts["bedroom_count"])
    clean_data["Bathroom Photo Count"] = photo_room_counts["bathroom_display"]
    clean_data["GLA Photo Count"] = photo_room_counts["gla_display"]
    clean_data["Total Rooms Photo Count"] = str(photo_room_counts["total_room_count"])

    fields["photo_room_counts"] = photo_room_counts
    fields["PHOTO_ROOM_COUNTS"] = photo_room_counts
    fields["Bedroom Photo Count"] = str(photo_room_counts["bedroom_count"])
    fields["Bathroom Photo Count"] = photo_room_counts["bathroom_display"]
    fields["GLA Photo Count"] = photo_room_counts["gla_display"]
    fields["Total Rooms Photo Count"] = str(photo_room_counts["total_room_count"])

    if "Subject" in clean_data and isinstance(clean_data["Subject"], dict):
        clean_data["Subject"]["photo_room_counts"] = photo_room_counts
        clean_data["Subject"]["Bedroom Photo Count"] = str(photo_room_counts["bedroom_count"])
        clean_data["Subject"]["Bathroom Photo Count"] = photo_room_counts["bathroom_display"]
        clean_data["Subject"]["GLA Photo Count"] = photo_room_counts["gla_display"]
        clean_data["Subject"]["Total Rooms Photo Count"] = str(photo_room_counts["total_room_count"])

    # Build structured MAP_EXHIBITS_ANALYSIS directly from dynamically extracted sketch and map photos
    sketch_items = [
        p for p in (extracted_photos or [])
        if p.get("category") in ["Building Sketch", "Sketch", "Floor Plan"]
        or any(k in str(p.get("caption", "")).lower() for k in ["building sketch", "floor plan", "floorplan", "sketch addendum", "area calculations"])
    ]
    map_items = [
        p for p in (extracted_photos or [])
        if p.get("category") in ["Maps & Aerials", "Map"]
        or any(k in str(p.get("caption", "")).lower() for k in ["map", "aerial", "satellite", "plat", "flood", "location"])
    ]

    # Reference Subject & Comps from clean_data
    sub_data = clean_data.get("Subject", {})
    sub_st = sub_data.get("Street Address") or sub_data.get("Physical Address") or sub_data.get("Property Address") or ""
    sub_city = sub_data.get("City", "")
    sub_state = sub_data.get("State", "")
    sub_zip = sub_data.get("Zip Code") or sub_data.get("Zip", "")
    sub_full = f"{sub_st}, {sub_city}, {sub_state} {sub_zip}".strip().strip(",")

    s_grid = clean_data.get("Sales Grid", {}) or fields.get("SALES_GRID", {}) or {}
    sales_comps_list = []
    comp_keys = [k for k in s_grid.keys() if k != "Subject" and isinstance(s_grid[k], dict) and re.search(r'comp|comparable', k, re.I)]
    seen_c_nums = set()
    for ck in comp_keys:
        m_num = re.search(r'(\d+)', ck)
        cnum = int(m_num.group(1)) if m_num else len(sales_comps_list) + 1
        if cnum in seen_c_nums:
            continue
        seen_c_nums.add(cnum)
        cd = s_grid[ck]
        c_addr = cd.get("Property Address") or cd.get("Address") or cd.get("Comparable Property Address") or ""
        m_st = re.match(r'^([^,]+)', c_addr)
        c_st = m_st.group(1).strip() if m_st else c_addr
        sales_comps_list.append({
            "comp_num": cnum,
            "street": c_st,
            "city": cd.get("City", sub_city),
            "state": cd.get("State", sub_state),
            "zipcode": cd.get("Zip Code") or cd.get("PostalCode") or sub_zip,
            "address": c_addr or f"{c_st}, {sub_city}, {sub_state} {sub_zip}".strip(),
            "proximity": cd.get("Proximity to Subject") or cd.get("Proximity", ""),
            "price": cd.get("Sale Price", ""),
            "grid_data": cd
        })
    sales_comps_list.sort(key=lambda x: x["comp_num"])

    # Rental comps
    r_grid = clean_data.get("Rental Schedule", {}) or clean_data.get("Rentals", {}) or fields.get("RENTAL_SCHEDULE", {}) or {}
    rental_comps_list = []
    r_keys = [k for k in r_grid.keys() if k != "Subject" and isinstance(r_grid[k], dict) and re.search(r'rental|comp|comparable', k, re.I)]
    seen_r_nums = set()
    for rk in r_keys:
        m_rnum = re.search(r'(\d+)', rk)
        rnum = int(m_rnum.group(1)) if m_rnum else len(rental_comps_list) + 1
        if rnum in seen_r_nums:
            continue
        seen_r_nums.add(rnum)
        rd = r_grid[rk]
        r_addr = rd.get("Property Address") or rd.get("Address") or rd.get("Comparable Property Address") or ""
        m_rst = re.match(r'^([^,]+)', r_addr)
        r_st = m_rst.group(1).strip() if m_rst else r_addr
        rental_comps_list.append({
            "comp_num": rnum,
            "street": r_st,
            "city": rd.get("City", sub_city),
            "state": rd.get("State", sub_state),
            "zipcode": rd.get("Zip Code") or rd.get("PostalCode") or sub_zip,
            "address": r_addr or f"{r_st}, {sub_city}, {sub_state} {sub_zip}".strip(),
            "proximity": rd.get("Proximity to Subject") or rd.get("Proximity", ""),
            "price": rd.get("Gross Monthly Rent") or rd.get("Monthly Rent") or rd.get("Rent", ""),
            "grid_data": rd
        })
    rental_comps_list.sort(key=lambda x: x["comp_num"])

    maps_list = []
    all_pins_list = []
    sub_pin = {
        "item_type": "Subject",
        "label": "Subject",
        "street": sub_st,
        "city": sub_city,
        "state": sub_state,
        "zipcode": sub_zip,
        "address": sub_full,
        "proximity": "Subject",
        "map_type": "Location Map",
        "page_number": 1,
        "status": "Verified Subject Property"
    }
    for mp in map_items:
        caption = mp.get("caption") or mp.get("label") or "Map Exhibit"
        cap_l = caption.lower()
        p_num = mp.get("page", 1)
        img_preview = mp.get("base64_preview") or mp.get("image_data") or ""

        if "aerial" in cap_l or "satellite" in cap_l:
            m_type = "Aerial Map"
        elif "rental" in cap_l:
            m_type = "Rentals Map"
        elif "plat" in cap_l or "parcel" in cap_l or "tax" in cap_l:
            m_type = "Plat Map"
        elif "flood" in cap_l:
            m_type = "Flood Map"
        elif "location" in cap_l or "comparable" in cap_l or "vicinity" in cap_l or "sales" in cap_l or "comps" in cap_l:
            m_type = "Location Map"
        elif not any(m.get("map_type") == "Location Map" for m in maps_list):
            m_type = "Location Map"
        else:
            m_type = caption

        sub_pin = {
            "item_type": "Subject",
            "label": "Subject",
            "street": sub_st,
            "city": sub_city,
            "state": sub_state,
            "zipcode": sub_zip,
            "address": sub_full,
            "proximity": "Subject",
            "map_type": m_type,
            "page_number": p_num,
            "status": "Verified Subject Property"
        }
        all_pins_list.append(sub_pin)

        if m_type == "Location Map":
            comp_pins = []
            for sc in sales_comps_list:
                cp = {
                    "item_type": "Comparable",
                    "label": f"Comparable #{sc['comp_num']}",
                    "street": sc["street"],
                    "city": sc["city"],
                    "state": sc["state"],
                    "zipcode": sc["zipcode"],
                    "address": sc["address"],
                    "proximity": sc["proximity"],
                    "price": sc["price"],
                    "map_type": "Location Map",
                    "page_number": p_num,
                    "grid_data": sc["grid_data"],
                    "status": "Verified from Sales Grid"
                }
                comp_pins.append(cp)
                all_pins_list.append(cp)
            maps_list.append({
                "page_number": p_num,
                "map_type": "Location Map",
                "subject": sub_pin,
                "comparables": comp_pins,
                "rentals": [],
                "comparables_only": comp_pins,
                "listings": [],
                "pins": [sub_pin] + comp_pins,
                "has_rentals": False,
                "has_comparables": len(comp_pins) > 0,
                "image_preview": img_preview
            })
        elif m_type == "Rentals Map":
            rent_pins = []
            for rc in rental_comps_list:
                rp = {
                    "item_type": "Rental",
                    "label": f"Rental #{rc['comp_num']}",
                    "street": rc["street"],
                    "city": rc["city"],
                    "state": rc["state"],
                    "zipcode": rc["zipcode"],
                    "address": rc["address"],
                    "proximity": rc["proximity"],
                    "price": rc["price"],
                    "map_type": "Rentals Map",
                    "page_number": p_num,
                    "grid_data": rc["grid_data"],
                    "status": "Verified from Rental Schedule"
                }
                rent_pins.append(rp)
                all_pins_list.append(rp)
            maps_list.append({
                "page_number": p_num,
                "map_type": "Rentals Map",
                "subject": sub_pin,
                "comparables": rent_pins,
                "rentals": rent_pins,
                "comparables_only": [],
                "listings": [],
                "pins": [sub_pin] + rent_pins,
                "has_rentals": len(rent_pins) > 0,
                "has_comparables": False,
                "image_preview": img_preview
            })
        elif m_type == "Aerial Map":
            maps_list.append({
                "page_number": p_num,
                "map_type": "Aerial Map",
                "subject": sub_pin,
                "comparables": [],
                "rentals": [],
                "comparables_only": [],
                "listings": [],
                "pins": [sub_pin],
                "has_rentals": False,
                "has_comparables": False,
                "image_preview": img_preview
            })
        else:
            maps_list.append({
                "page_number": p_num,
                "map_type": m_type,
                "subject": sub_pin,
                "comparables": [],
                "rentals": [],
                "comparables_only": [],
                "listings": [],
                "pins": [sub_pin],
                "has_rentals": False,
                "has_comparables": False,
                "image_preview": img_preview
            })

    # Ensure Location Map, Aerial Map, and Rentals Map are always available
    has_loc = any(m.get("map_type") == "Location Map" for m in maps_list)
    if not has_loc:
        comp_pins = []
        for sc in sales_comps_list:
            cp = {
                "item_type": "Comparable",
                "label": f"Comparable #{sc['comp_num']}",
                "street": sc["street"],
                "city": sc["city"],
                "state": sc["state"],
                "zipcode": sc["zipcode"],
                "address": sc["address"],
                "proximity": sc["proximity"],
                "price": sc["price"],
                "map_type": "Location Map",
                "page_number": 1,
                "grid_data": sc["grid_data"],
                "status": "Verified from Sales Grid"
            }
            comp_pins.append(cp)
            all_pins_list.append(cp)
        maps_list.insert(0, {
            "page_number": 1,
            "map_type": "Location Map",
            "subject": sub_pin,
            "comparables": comp_pins,
            "rentals": [],
            "comparables_only": comp_pins,
            "listings": [],
            "pins": [sub_pin] + comp_pins,
            "has_rentals": False,
            "has_comparables": len(comp_pins) > 0,
            "image_preview": ""
        })

    has_aerial = any(m.get("map_type") == "Aerial Map" for m in maps_list)
    if not has_aerial:
        aer_pin = dict(sub_pin)
        aer_pin["map_type"] = "Aerial Map"
        aer_pin["page_number"] = 2
        maps_list.append({
            "page_number": 2,
            "map_type": "Aerial Map",
            "subject": aer_pin,
            "comparables": [],
            "rentals": [],
            "comparables_only": [],
            "listings": [],
            "pins": [aer_pin],
            "has_rentals": False,
            "has_comparables": False,
            "image_preview": ""
        })

    has_rental = any(m.get("map_type") == "Rentals Map" for m in maps_list)
    if not has_rental and len(rental_comps_list) > 0:
        rent_pins = []
        for rc in rental_comps_list:
            rp = {
                "item_type": "Rental",
                "label": f"Rental #{rc['comp_num']}",
                "street": rc["street"],
                "city": rc["city"],
                "state": rc["state"],
                "zipcode": rc["zipcode"],
                "address": rc["address"],
                "proximity": rc["proximity"],
                "price": rc["price"],
                "map_type": "Rentals Map",
                "page_number": 3,
                "grid_data": rc["grid_data"],
                "status": "Verified from Rental Schedule"
            }
            rent_pins.append(rp)
            all_pins_list.append(rp)
        r_sub = dict(sub_pin)
        r_sub["map_type"] = "Rentals Map"
        r_sub["page_number"] = 3
        maps_list.append({
            "page_number": 3,
            "map_type": "Rentals Map",
            "subject": r_sub,
            "comparables": rent_pins,
            "rentals": rent_pins,
            "comparables_only": [],
            "listings": [],
            "pins": [r_sub] + rent_pins,
            "has_rentals": len(rent_pins) > 0,
            "has_comparables": False,
            "image_preview": ""
        })

    sketches_list = []
    for sk in sketch_items:
        sketches_list.append({
            "sketch_type": sk.get("caption") or "Building Sketch",
            "page_number": sk.get("page", 1),
            "gla": sk.get("gla") or "",
            "areas": sk.get("areas") or [],
            "room_labels": sk.get("room_labels") or [],
            "room_summary": sk.get("room_summary") or {},
            "rooms_by_category": sk.get("rooms_by_category") or {},
            "rooms_by_level": sk.get("rooms_by_level") or {},
            "dimensions": sk.get("dimensions") or [],
            "image_preview": sk.get("base64_preview") or sk.get("image_data") or "",
            "raw_text_sample": (sk.get("raw_text") or "")[:500]
        })

    # Propagate areas and GLA across multi-page sketches in the same appraisal
    report_sketch_areas = max((sk.get("areas") or [] for sk in sketches_list), key=len, default=[])
    report_sketch_gla = max((sk.get("gla") or "" for sk in sketches_list), key=lambda g: float(re.sub(r'[^\d.]', '', str(g)) or 0), default="")
    gla_num = float(re.sub(r'[^\d.]', '', str(report_sketch_gla)) or 0)
    if report_sketch_areas or report_sketch_gla:
        for sk in sketches_list:
            if len(sk.get("areas", [])) < len(report_sketch_areas):
                sk["areas"] = report_sketch_areas
            cur_g = float(re.sub(r'[^\d.]', '', str(sk.get("gla") or "")) or 0)
            if cur_g < gla_num:
                sk["gla"] = report_sketch_gla
        for p in extracted_photos or []:
            if p.get("category") == "Building Sketch" or "sketch" in str(p.get("caption", "")).lower():
                if len(p.get("areas", [])) < len(report_sketch_areas):
                    p["areas"] = report_sketch_areas
                cur_pg = float(re.sub(r'[^\d.]', '', str(p.get("gla") or "")) or 0)
                if cur_pg < gla_num:
                    p["gla"] = report_sketch_gla

    map_exhibits_analysis = {
        "status": "success",
        "total_maps": len(maps_list),
        "total_sketches": len(sketches_list),
        "total_comparable_photos": 0,
        "maps": maps_list,
        "sketches": sketches_list,
        "comparable_photos": [],
        "all_pins": all_pins_list
    }

    clean_data["MAP_EXHIBITS_ANALYSIS"] = map_exhibits_analysis
    fields["MAP_EXHIBITS_ANALYSIS"] = map_exhibits_analysis
    clean_data["map_exhibits_analysis"] = map_exhibits_analysis
    fields["map_exhibits_analysis"] = map_exhibits_analysis

    # 1004 Subject-To ARV w/ As-Is Extraction directly inside XML extractor
    try:
        try:
            from .arv_as_is_engine import ARVAsIsEngine, extract_as_is_grid_and_reconciliations, extract_arv_as_is_report
        except (ImportError, ValueError):
            try:
                from appraisal_review.api.arv_as_is_engine import ARVAsIsEngine, extract_as_is_grid_and_reconciliations, extract_arv_as_is_report
            except ImportError:
                from arv_as_is_engine import ARVAsIsEngine, extract_as_is_grid_and_reconciliations, extract_arv_as_is_report
        x_path = xml_path_or_bytes if isinstance(xml_path_or_bytes, str) else None
        is_arv = False
        if x_path:
            is_arv, conf, _ = ARVAsIsEngine.is_arv_as_is_report(x_path, xml_tree=tree)
        else:
            # Check XML tree
            cond_node = tree.find(".//RECONCILIATION")
            if cond_node is not None:
                c_type = cond_node.get("_ConditionType", "")
                if c_type in ["SubjectToCompletion", "SubjectToRepairs"]:
                    is_arv = True

        if is_arv:
            form_type = "1004 Subject-To ARV w/ As-Is"
            fields["formType"] = form_type
            fields["form_type"] = form_type
            fields["Form Type"] = form_type
            fields["From Type"] = form_type
            clean_data["formType"] = form_type
            clean_data["form_type"] = form_type
            clean_data["Form Type"] = form_type
            clean_data["From Type"] = form_type

            if x_path:
                arv_data = extract_arv_as_is_report(x_path, companion_pdf=companion_pdf_path)
                fields["ARV_AS_IS"] = arv_data
                fields["arv_as_is_data"] = arv_data
                clean_data["ARV_AS_IS"] = arv_data
                clean_data["arv_as_is_data"] = arv_data

                if arv_data.get("as_is_value"):
                    fields["As-Is Value $"] = arv_data.get("as_is_value_formatted")
                    clean_data["As-Is Value $"] = arv_data.get("as_is_value_formatted")
                if arv_data.get("arv_value"):
                    fields["Subject-To ARV Value $"] = arv_data.get("arv_value_formatted")
                    clean_data["Subject-To ARV Value $"] = arv_data.get("arv_value_formatted")

                dual_data = extract_as_is_grid_and_reconciliations(
                    x_path,
                    base_sales_grid=sales_grid,
                    base_recon=reconciliation_section,
                    companion_pdf_path=companion_pdf_path,
                    arv_data=arv_data
                )
                fields["SALES_GRID"] = dual_data.get("primary_sales_grid", sales_grid)
                clean_data["SALES_GRID"] = dual_data.get("primary_sales_grid", sales_grid)
                fields["Sales Grid"] = dual_data.get("primary_sales_grid", sales_grid)
                clean_data["Sales Grid"] = dual_data.get("primary_sales_grid", sales_grid)

                fields["AS_IS_SALES_GRID"] = dual_data.get("as_is_sales_grid", {})
                clean_data["AS_IS_SALES_GRID"] = dual_data.get("as_is_sales_grid", {})
                fields["As-Is Sales Grid"] = dual_data.get("as_is_sales_grid", {})
                clean_data["As-Is Sales Grid"] = dual_data.get("as_is_sales_grid", {})

                fields["PRIMARY_RECONCILIATION"] = dual_data.get("primary_recon", {})
                clean_data["PRIMARY_RECONCILIATION"] = dual_data.get("primary_recon", {})
                fields["Primary Reconciliation"] = dual_data.get("primary_recon", {})
                clean_data["Primary Reconciliation"] = dual_data.get("primary_recon", {})

                fields["AS_IS_RECONCILIATION"] = dual_data.get("as_is_recon", {})
                clean_data["AS_IS_RECONCILIATION"] = dual_data.get("as_is_recon", {})
                fields["As-Is Reconciliation"] = dual_data.get("as_is_recon", {})
                clean_data["As-Is Reconciliation"] = dual_data.get("as_is_recon", {})

                if dual_data.get("as_is_comps"):
                    fields["as_is_comps"] = dual_data["as_is_comps"]
                    clean_data["as_is_comps"] = dual_data["as_is_comps"]
                if dual_data.get("as_is_comparable_sales"):
                    fields["as_is_comparable_sales"] = dual_data["as_is_comparable_sales"]
                    clean_data["as_is_comparable_sales"] = dual_data["as_is_comparable_sales"]
                if dual_data.get("as_is_prior_sale_history"):
                    fields["AS_IS_PRIOR_SALE_HISTORY"] = dual_data["as_is_prior_sale_history"]
                    clean_data["AS_IS_PRIOR_SALE_HISTORY"] = dual_data["as_is_prior_sale_history"]
                    fields["As-Is Prior Sale History"] = dual_data["as_is_prior_sale_history"]
                    clean_data["As-Is Prior Sale History"] = dual_data["as_is_prior_sale_history"]
                if dual_data.get("as_is_sales_comparison_additional"):
                    fields["AS_IS_SALES_COMPARISON_ADDITIONAL"] = dual_data["as_is_sales_comparison_additional"]
                    clean_data["AS_IS_SALES_COMPARISON_ADDITIONAL"] = dual_data["as_is_sales_comparison_additional"]
                    fields["As-Is Sales Comparison Additional"] = dual_data["as_is_sales_comparison_additional"]
                    clean_data["As-Is Sales Comparison Additional"] = dual_data["as_is_sales_comparison_additional"]

                budget_photo_status = arv_data.get("rehab_budget_photo_or_pages_present", "Present")
                budget_photo_details = arv_data.get("rehab_budget_photo_or_pages_details", "Present")
                fields["Rehab / High Budget Photo or Pages"] = budget_photo_details
                clean_data["Rehab / High Budget Photo or Pages"] = budget_photo_details
                fields["Rehab Budget Photo or Pages Present"] = budget_photo_status
                clean_data["Rehab Budget Photo or Pages Present"] = budget_photo_status
                fields["High Budget Photo or Pages Present"] = budget_photo_status
                clean_data["High Budget Photo or Pages Present"] = budget_photo_status
    except Exception as e_arv:
        pass

    return {
        "status": "success",
        "form_type": form_type,
        "ARV_AS_IS": fields.get("ARV_AS_IS"),
        "arv_as_is_data": fields.get("ARV_AS_IS"),
        "AS_IS_SALES_GRID": fields.get("AS_IS_SALES_GRID"),
        "As-Is Sales Grid": fields.get("AS_IS_SALES_GRID"),
        "PRIMARY_RECONCILIATION": fields.get("PRIMARY_RECONCILIATION"),
        "Primary Reconciliation": fields.get("PRIMARY_RECONCILIATION"),
        "AS_IS_RECONCILIATION": fields.get("AS_IS_RECONCILIATION"),
        "As-Is Reconciliation": fields.get("AS_IS_RECONCILIATION"),
        "as_is_comps": fields.get("as_is_comps"),
        "as_is_comparable_sales": fields.get("as_is_comparable_sales"),
        "AS_IS_PRIOR_SALE_HISTORY": fields.get("AS_IS_PRIOR_SALE_HISTORY"),
        "As-Is Prior Sale History": fields.get("AS_IS_PRIOR_SALE_HISTORY"),
        "Rehab / High Budget Photo or Pages": fields.get("Rehab / High Budget Photo or Pages"),
        "Rehab Budget Photo or Pages Present": fields.get("Rehab Budget Photo or Pages Present"),
        "High Budget Photo or Pages Present": fields.get("High Budget Photo or Pages Present"),
        "has_1004mc": has_1004mc,
        "1004mc_presence": mc_present_str,
        "UAD pages present in the report": uad_present_str,
        "has_uad_pages": has_uad_pages,
        "uad_pages": uad_pages,
        "uad_details": uad_details,
        "Limiting Conditions": uad_details.get("limiting_conditions_presence", "Not Present"),
        "Statement of Assumptions and Limiting Conditions": uad_details.get("limiting_conditions_presence", "Not Present"),
        "limiting_conditions_pages": uad_details.get("limiting_conditions_pages", []),
        "limiting_conditions_presence": uad_details.get("limiting_conditions_presence", "Not Present"),
        "Appraiser's Certification": uad_details.get("certification_presence", "Not Present"),
        "Appraiser Certification": uad_details.get("certification_presence", "Not Present"),
        "certification_pages": uad_details.get("certification_pages", []),
        "certification_presence": uad_details.get("certification_presence", "Not Present"),
        "UAD Details": uad_details.get("details_summary", ""),
        "Present Land Use for other": other_land_use_desc,
        "E&O": certification_section.get("E&O", "Absent"),
        "E&O Present": certification_section.get("E&O Present", "Absent"),
        "E/O": certification_section.get("E/O", certification_section.get("E&O", "Absent")),
        "E/O Present": certification_section.get("E/O Present", certification_section.get("E&O Present", "Absent")),
        "E&O Insurance": certification_section.get("E&O Insurance", ""),
        "E/O Insurance": certification_section.get("E/O Insurance", certification_section.get("E&O Insurance", "")),
        "Invoice Attached": inv_present_str,
        "Invoice Present": inv_present_str,
        "has_invoice": has_invoice,
        "INVOICE": fields.get("INVOICE", {}),
        "Invoice": fields.get("INVOICE", {}),
        "invoice_data": fields.get("INVOICE", {}),
        "EO": fields.get("EO", {}),
        "E&O": fields.get("EO", {}),
        "eo_data": fields.get("EO", {}),
        "Certification": certification_section,
        "CERTIFICATION": certification_section,
        "fields": fields,
        "unified_fields": fields,
        "clean_data": clean_data,
        "sales_grid_addresses": sales_grid_addresses,
        "SALES_GRID_ADDRESSES": sales_grid_addresses,
        "rental_grid_addresses": rental_grid_addresses,
        "RENTAL_GRID_ADDRESSES": rental_grid_addresses,
        "reference_records": refs_for_photos,
        "has_embedded_pdf": has_embedded_pdf,
        "extracted_photos": extracted_photos,
        "EXTRACTED_PHOTOS": extracted_photos,
        "MAP_EXHIBITS_ANALYSIS": map_exhibits_analysis,
        "map_exhibits_analysis": map_exhibits_analysis,
        "mandatory_subject_photos": mandatory_subject_photos,
        "MANDATORY_SUBJECT_PHOTOS": mandatory_subject_photos,
        "photo_room_counts": photo_room_counts,
        "PHOTO_ROOM_COUNTS": photo_room_counts,
    }
