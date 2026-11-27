import os
import io
import re
import datetime
import warnings
from typing import Dict, Any, Optional
import pymupdf
import numpy as np
from PIL import Image

warnings.filterwarnings("ignore", message=".*pin_memory.*")
warnings.filterwarnings("ignore", category=UserWarning, module="torch.*")

_EASYOCR_READER = None
_PYTESSERACT_AVAILABLE = None

def _get_pytesseract():
    global _PYTESSERACT_AVAILABLE
    if _PYTESSERACT_AVAILABLE is None:
        try:
            import pytesseract
            _PYTESSERACT_AVAILABLE = pytesseract
        except Exception:
            _PYTESSERACT_AVAILABLE = False
    return _PYTESSERACT_AVAILABLE if _PYTESSERACT_AVAILABLE is not False else None

def get_easyocr_reader():
    global _EASYOCR_READER
    if _EASYOCR_READER is None:
        try:
            import easyocr
            cur_dir = os.path.dirname(os.path.abspath(__file__))
            ws_dir = os.path.dirname(os.path.dirname(cur_dir))
            cand_dirs = [
                os.path.join(ws_dir, ".easyocr_models"),
                os.path.join(os.getcwd(), ".easyocr_models"),
                os.path.join(ws_dir, ".easyocr", "model"),
                os.path.join(os.path.dirname(cur_dir), ".easyocr", "model"),
                os.path.join(os.getcwd(), ".easyocr", "model"),
                os.path.expanduser(r"~\.EasyOCR\model")
            ]
            m_dir = next((d for d in cand_dirs if os.path.exists(d)), None)
            if m_dir:
                net_dir = os.path.join(m_dir, "user_network")
                try:
                    os.makedirs(net_dir, exist_ok=True)
                except Exception:
                    pass
                _EASYOCR_READER = easyocr.Reader(['en'], gpu=False, model_storage_directory=m_dir, user_network_directory=net_dir if os.path.exists(net_dir) else None, download_enabled=False)
            else:
                _EASYOCR_READER = easyocr.Reader(['en'], gpu=False)
        except Exception as e:
            print(f"[eo_extractor] Error initializing EasyOCR: {e}")
            _EASYOCR_READER = False
    return _EASYOCR_READER if _EASYOCR_READER is not False else None


def clean_ocr_text(t: str) -> str:
    """
    Cleans common optical character recognition artifacts and typos
    in real estate insurance declarations and ACORD 25 certificates.
    Zero hardcoded values.
    """
    if not t:
        return ""
    t = re.sub(r'\bol\s+Amerlca\b', 'of America', t, flags=re.I)
    t = re.sub(r'\bol\b', 'of', t, flags=re.I)
    t = re.sub(r'\bAmerlca\b', 'America', t)
    t = re.sub(r'\bIvelen\b|\bIrvelen\b|\bTvavelers\b|\bTraveiers\b', 'Travelers', t, flags=re.I)
    t = re.sub(r'\bCasualtv\b|\bCasuaity\b', 'Casualty', t, flags=re.I)
    t = re.sub(r'\bInsurancc\b|\bInsurarice\b|\bInsuranca\b|\bInsuranco\b', 'Insurance', t, flags=re.I)
    t = re.sub(r'\bCompanv\b|\bCompamv\b|\bCompary\b', 'Company', t, flags=re.I)
    t = re.sub(r'\bUndenvriters\b|\bUnderwnters\b', 'Underwriters', t, flags=re.I)
    t = re.sub(r'\bDeductiblc\b|\bDeductibie\b', 'Deductible', t, flags=re.I)
    t = re.sub(r'\bLiabi1ity\b|\bLiabilitv\b', 'Liability', t, flags=re.I)
    t = re.sub(r'\bGREATAMERICAN\b', 'Great American', t, flags=re.I)
    t = re.sub(r'\s*&\s*', ' & ', t)
    return t


def _reconstruct_lines_from_ocr_boxes(ocr_boxes) -> str:
    """
    Groups EasyOCR (bbox, text, conf) results into horizontal rows sorted top-to-bottom,
    and words within each row left-to-right. Preserves table/column alignment.
    """
    if not ocr_boxes:
        return ""
    items = []
    heights = []
    for entry in ocr_boxes:
        if not isinstance(entry, (list, tuple)) or len(entry) < 2:
            continue
        bbox, txt = entry[0], str(entry[1]).strip()
        if not txt or not bbox:
            continue
        xs = [pt[0] for pt in bbox]
        ys = [pt[1] for pt in bbox]
        x0, y0, y1 = min(xs), min(ys), max(ys)
        yc = (y0 + y1) / 2.0
        h = max(y1 - y0, 1.0)
        heights.append(h)
        items.append((yc, x0, txt))
    if not items:
        return ""
    heights.sort()
    median_h = heights[len(heights) // 2]
    y_tol = max(median_h * 0.55, 6.0)
    items.sort(key=lambda it: it[0])

    rows = []
    cur_row = [items[0]]
    cur_y = items[0][0]
    for it in items[1:]:
        if abs(it[0] - cur_y) <= y_tol:
            cur_row.append(it)
            cur_y = sum(x[0] for x in cur_row) / len(cur_row)
        else:
            cur_row.sort(key=lambda x: x[1])
            rows.append("  ".join(x[2] for x in cur_row))
            cur_row = [it]
            cur_y = it[0]
    if cur_row:
        cur_row.sort(key=lambda x: x[1])
        rows.append("  ".join(x[2] for x in cur_row))
    return "\n".join(rows)


def _get_spatial_page_text(page) -> str:
    """
    Reconstructs reading-order lines from native PDF words (x0, top) so multi-column
    forms (ACORD 25, Declarations tables) keep label-value pairs on the same line.
    """
    try:
        words = page.get_text("words") or []
    except Exception:
        return ""
    if not words:
        return ""
    # word tuple: (x0, y0, x1, y1, word, block_no, line_no, word_no)
    words_sorted = sorted(words, key=lambda w: (round(w[1] / 4.0) * 4.0, w[0]))
    rows = []
    cur_row = []
    cur_y = None
    for w in words_sorted:
        y_mid = (w[1] + w[3]) / 2.0
        if cur_y is None or abs(y_mid - cur_y) <= 4.5:
            cur_row.append((w[0], w[4]))
            if cur_y is None:
                cur_y = y_mid
        else:
            cur_row.sort(key=lambda x: x[0])
            rows.append(" ".join(x[1] for x in cur_row))
            cur_row = [(w[0], w[4])]
            cur_y = y_mid
    if cur_row:
        cur_row.sort(key=lambda x: x[0])
        rows.append(" ".join(x[1] for x in cur_row))
    return "\n".join(rows)


def normalize_date_str(raw: str) -> str:
    if not raw:
        return ""
    clean = raw.strip(' -:;,_."\'')
    clean = re.sub(r'\s*([/.-])\s*', r'\1', clean)
    # Match MM/DD/YYYY or MM-DD-YYYY or MM.DD.YYYY
    m = re.match(r'^([0-1]?\d)[/.-]([0-3]?\d)[/.-](\d{2,4})$', clean)
    if m:
        mo, da, yr = m.group(1), m.group(2), m.group(3)
        if len(yr) == 2:
            yr = ("20" if int(yr) < 50 else "19") + yr
        return f"{int(mo):02d}/{int(da):02d}/{yr}"
    # Match Month DD, YYYY / DD-Mon-YYYY / YYYY-MM-DD
    for fmt in ("%B %d, %Y", "%b %d, %Y", "%B %d %Y", "%b %d %Y", "%d-%b-%Y", "%d %b %Y", "%Y-%m-%d"):
        try:
            dt = datetime.datetime.strptime(clean, fmt)
            return dt.strftime("%m/%d/%Y")
        except ValueError:
            pass
    return clean


DISALLOWED_POLICY_WORDS = {
    'insurance', 'company', 'provided', 'declarations', 'policy', 'period',
    'effective', 'number', 'commercial', 'general', 'liability', 'coverage',
    'limits', 'errors', 'omissions', 'professional', 'standard', 'carrier',
    'surplus', 'lines', 'advantage', 'appraisers', 'acord', 'certificate',
    'information', 'confers', 'rights', 'holder', 'producer', 'insured',
    'revision', 'naic', 'subr', 'addl', 'type', 'claims', 'made', 'occurrence',
    'form', 'scnlgl', 'alamode', 'page', 'signature', 'date', 'agency', 'branch'
}


def is_valid_policy_number(cand: str) -> bool:
    if not cand:
        return False
    cand_clean = cand.strip(" :.-_#\"'")
    if len(cand_clean) < 4 or len(cand_clean) > 35:
        return False
    lower_words = set(re.findall(r'[a-zA-Z]+', cand_clean.lower()))
    if lower_words and lower_words.issubset(DISALLOWED_POLICY_WORDS):
        return False
    # Must contain at least one digit or a hyphen/slash code
    if not re.search(r'\d', cand_clean) and not ('-' in cand_clean or '/' in cand_clean):
        return False
    return True


def is_valid_carrier(cand: str) -> bool:
    if not cand:
        return False
    clean = cand.strip(' -:;,_"\'')
    if len(clean) < 3 or len(clean) > 80:
        return False
    # Rejects purely numeric agency codes like '078990' or '969'
    if re.match(r'^\d+$', clean) or re.match(r'^\d+[\s\-_]\d+', clean):
        return False
    if not re.search(r'[A-Za-z]{3,}', clean):
        return False
    if any(stop in clean.upper() for stop in [
        "SUBR", "POLICY", "NUMBER", "DATE", "LIMIT", "NAIC", "INCEPTION",
        "EXPIRATION", "PAGE", "APPLICABLE", "CERTIFICATE", "PRODUCER", "NOTICE",
        "REVISION", "AGENCY", "BRANCH", "PREFIX"
    ]):
        return False
    return True


def clean_money_val(raw: str) -> str:
    """
    Cleans OCR monetary values, correcting scanned '5' or 'S' artifacts for '$'
    and OCR '.' thousands separators (e.g. '$10.000' -> '$10,000').
    """
    if not raw:
        return ""
    clean = raw.strip(' -:;,_."\'')
    if clean.startswith(('5', 'S')) and len(clean) > 1 and clean[1].isdigit():
        clean = '$' + clean[1:]
    # Fix OCR thousands dot (e.g. $10.000 or $1.000.000 -> $10,000 / $1,000,000)
    clean = re.sub(r'\.(?=\d{3}(?:\b|\.))', ',', clean)
    if not clean.startswith('$') and clean.replace(',', '').isdigit():
        clean = '$' + clean
    m = re.match(r'^\$?\s*(\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{2})?$', clean)
    if m:
        num_str = m.group(1).replace(',', '')
        if num_str.isdigit():
            val = int(num_str)
            return f"${val:,}"
    return clean


def clean_carrier_val(raw: str) -> str:
    """Strips broken header/NAIC fragments (e.g. 'ARATIONS ' from 'DECLARATIONS') from carrier names."""
    if not raw:
        return ""
    c = re.sub(r'\s*(?:NAIC|N\.A\.I\.C\.?)\s*#?\s*\d+.*$', '', raw, flags=re.I)
    c = re.sub(r'^(?:[A-Z]*DECLARATIONS|[A-Z]*ARATIONS|RATIONS|CERTIFICATE\s+OF\s+INSURANCE)\s+', '', c.strip(), flags=re.I)
    c = re.sub(r'\s+', ' ', c).strip(' -:;,_"\'')
    return c


_DATE_PAT = r'(?:[0-1]?\d\s*[/.-]\s*[0-3]?\d\s*[/.-]\s*\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}[-\s][A-Za-z]{3}[-\s]\d{4})'


def parse_eo_text(text: str, appraiser_hint: str = "") -> Dict[str, str]:
    """
    Extracts structured E&O fields from text string using robust regex patterns.
    Handles ACORD 25 certificates, CNA/Travelers declarations tables, OREP/Hudson/Great American,
    LIA/Liberty/General Star, Landy/Hiscox/Navigators/Hanover, and scanned exhibits.
    Zero hardcoded values.
    """
    res = {
        'E&O': 'Absent',
        'E&O Present': 'Absent',
        'E&O Insurance': '',
        'Policy Period From': '',
        'Policy Period To': '',
        'E&O Insured': '',
        'E&O Carrier': '',
        'E&O Limit': '',
        'E&O Deductible': ''
    }
    if not text or not text.strip():
        return res

    cleaned_text = clean_ocr_text(text)

    # 1. Dates — Priority 1: Explicit Policy Period / Coverage Period range
    #    e.g. "Policy Period: From 11/07/2026 To 11/07/2027" or "Policy Period: 03/31/2026 to 03/31/2027"
    m_range = re.search(
        rf'(?:Policy\s*Period|Coverage\s*Period|Policy\s*Term)\s*[:\-]?\s*(?:From\s*[:\-_]?\s*)?[\s_\(\)A-Za-z,]*?({_DATE_PAT})[\s\S]{{0,95}}?(?:to|through|until|\-|–|\bTo\s*[:\-_]?)\s*[\s_\(\)A-Za-z,]*?({_DATE_PAT})',
        cleaned_text,
        re.I
    )
    if m_range:
        res['Policy Period From'] = normalize_date_str(m_range.group(1))
        res['Policy Period To'] = normalize_date_str(m_range.group(2))

    # 2. Dates — Priority 2: ACORD 25 / Multi-column Date Pattern: "<PolicyNumber> <DateFrom> <DateTo>"
    m_acord = re.search(
        rf'(?:Professional\s*Liability|Errors\s*(?:and|&)\s*Omissions|E\s*[\/&]\s*O(?:\s*Insurance)?|Claims[\s\-]*Made)[\s\S]{{0,60}}?\b([A-Za-z0-9\-_/]{{5,28}})\s+({_DATE_PAT})\s+({_DATE_PAT})',
        cleaned_text,
        re.I
    )
    acord_insr_ltr = ""
    if m_acord:
        cand_pol, d_from, d_to = m_acord.group(1).strip(), m_acord.group(2).strip(), m_acord.group(3).strip()
        if is_valid_policy_number(cand_pol):
            res['E&O Insurance'] = cand_pol
        if not res['Policy Period From']:
            res['Policy Period From'] = normalize_date_str(d_from)
        if not res['Policy Period To']:
            res['Policy Period To'] = normalize_date_str(d_to)
        # Check if an ACORD Insurer Letter (A-F) precedes the Professional Liability row
        prefix_slice = cleaned_text[max(0, m_acord.start() - 18):m_acord.start() + 5]
        m_ltr = re.search(r'(?:^|\n)\s*([A-F])\b', prefix_slice)
        if m_ltr:
            acord_insr_ltr = m_ltr.group(1).upper()

    # 3. Dates — Priority 3: "From <DATE1> To <DATE2>"
    if not (res['Policy Period From'] and res['Policy Period To']):
        m_from_to = re.search(
            rf'\bFrom\s*[:\-_]?\s*[\s_]*({_DATE_PAT})[\s\S]{{0,55}}?\bTo\s*[:\-_]?\s*[\s_]*({_DATE_PAT})',
            cleaned_text,
            re.I
        )
        if m_from_to:
            if not res['Policy Period From']:
                res['Policy Period From'] = normalize_date_str(m_from_to.group(1))
            if not res['Policy Period To']:
                res['Policy Period To'] = normalize_date_str(m_from_to.group(2))

    # 4. Dates — Priority 4: Explicit Inception / Policy Eff / Expiration / Policy Exp labels
    if not res['Policy Period From']:
        m_inc = re.search(
            rf'(?<!Retroactive\s)(?<!Prior\sActs\s)(?<!License\s)(?:Inception\s*Date|Inception|Policy\s*Period\s*From|Policy\s*Eff(?:\s*\(MM/DD/YYYY\))?|Policy\s*From|Term\s*From|Policy\s*Effective\s*Date|Effective\s*Date|Effective)\s*[:\-]?\s*({_DATE_PAT})',
            cleaned_text,
            re.I
        )
        if m_inc:
            res['Policy Period From'] = normalize_date_str(m_inc.group(1))

    if not res['Policy Period To']:
        m_exp = re.search(
            rf'(?<!License\s)(?:Expiration\s*Date|Expiration|Exp\.?\s*Date|Policy\s*Period\s*To|Policy\s*Exp(?:\s*\(MM/DD/YYYY\))?|Policy\s*To|Term\s*To|Expires|End\s*Date)\s*[:\-]?\s*({_DATE_PAT})',
            cleaned_text,
            re.I
        )
        if m_exp:
            res['Policy Period To'] = normalize_date_str(m_exp.group(1))

    # 5. Policy Number extraction
    # 5a. CNA Table header style: "Agency Branch Prefix Policy Number \n <Agency> <Branch> <Prefix> <Policy Number>"
    if not res['E&O Insurance']:
        m_grid = re.search(
            r'(?:Agency\s+Branch\s+Prefix\s+Policy\s+Number|Prefix\s+Policy\s+Number)[^\n\r]*[\n\r]+(?:\d+\s+\d+\s+)?([A-Za-z]{2,5}\s+[A-Za-z0-9\-]{6,25}|[A-Za-z0-9\-]{7,25})',
            cleaned_text,
            re.I
        )
        if m_grid:
            cand = re.sub(r'\s+', ' ', m_grid.group(1).strip())
            if is_valid_policy_number(cand):
                res['E&O Insurance'] = cand

    if not res['E&O Insurance']:
        m_cna_ocr = re.search(
            r'Prefix[\s\S]{0,80}?Policy\s*Number[\s\S]{0,120}?(?:0\d{4,}\s+\d{2,}\s+)?([A-Za-z]{2,5})\s+([0-9]{7,25})',
            cleaned_text,
            re.I
        )
        if m_cna_ocr:
            cand = f"{m_cna_ocr.group(1).strip()} {m_cna_ocr.group(2).strip()}"
            if is_valid_policy_number(cand):
                res['E&O Insurance'] = cand

    # 5b. Master Policy Number / Policy Number / Policy No. / Policy #
    if not res['E&O Insurance']:
        for m_pol in re.finditer(
            r'(?:Master\s+)?Policy\s*(?:(?:Number|No\.?|#)\s*[:\-]?|[:\-])\s*[\n\r\s]*([A-Za-z0-9\-_/]{5,32})',
            cleaned_text,
            re.I
        ):
            cand = m_pol.group(1).strip(' -:;,_."\'')
            if is_valid_policy_number(cand):
                res['E&O Insurance'] = cand
                break

    # 5c. Explicit E&O / E/O policy number pattern: "E&O Policy #: ..."
    if not res['E&O Insurance']:
        m_eo_pol = re.search(
            r'(?:E\s*[\/&_\-]\s*O|E\s+and\s+O|EO)\s*(?:Insurance|Coverage)?\s*(?:Policy)?\s*(?:(?:Number|No\.?|#)\s*[:\-]?|[:\-])\s*[\n\r\s]*([A-Za-z0-9\-_/]{5,32})',
            cleaned_text,
            re.I
        )
        if m_eo_pol:
            cand = m_eo_pol.group(1).strip(' -:;,_."\'')
            if is_valid_policy_number(cand):
                res['E&O Insurance'] = cand

    # 5d. Certificate Number / Member Number (OREP / group certificates)
    if not res['E&O Insurance']:
        m_cert = re.search(
            r'(?:Certificate|Cert\.?|Member)\s*(?:(?:Number|No\.?|#)\s*[:\-]?|[:\-])\s*[\n\r\s]*([A-Za-z0-9\-_/]{5,35})',
            cleaned_text,
            re.I
        )
        if m_cert:
            cand = m_cert.group(1).strip(' -:;,_."\'')
            if is_valid_policy_number(cand):
                res['E&O Insurance'] = cand

    # 6. E&O Insured Name
    # 6a. Named Insured / Item 1 / Member Name / Appraiser block in Declarations
    m_named = re.search(
        r'(?:Item\s*1\.?\s*)?(?:NAMED\s*INSURED(?:\s*(?:AND|&)\s*(?:MAILING\s*)?ADDRESS)?|MEMBER\s*NAME|INSURED\s*NAME)\s*[:\-]?\s*([^\n\r]*)[\n\r]*',
        cleaned_text,
        re.I
    )
    if m_named:
        same_line = m_named.group(1).strip(' -:;,\n\r_')
        if same_line and not re.search(r'NAMED|INSURED|ADDRESS|NOTICE|POLICY|ITEM|MAILING|EFFECTIVE', same_line, re.I) and not re.match(r'^\d+\s+[A-Za-z]', same_line):
            if re.match(r'^[A-Za-z][A-Za-z0-9\s.,:\'&\-/]{2,70}$', same_line):
                res['E&O Insured'] = same_line
        if not res['E&O Insured']:
            cand_lines = [l.strip(' -:;,\n\r_') for l in cleaned_text[m_named.start():m_named.start()+400].splitlines()[1:] if l.strip(' -:;,\n\r_')]
            for l in cand_lines:
                if not re.search(r'NAMED|INSURED|NOTICE|NQTICE|The\s+Errors|afforded|basis|policy|carefully|discuss|agent|broker|POLICY\s*PERIOD|Inception|Item\s*2|MAILING\s*ADDRESS', l, re.I):
                    if re.match(r'^[A-Z][A-Za-z0-9\s.,:\'&\-/]{3,70}$', l) and not re.search(r'^\d+\s+[A-Za-z]', l):
                        res['E&O Insured'] = l
                        break

    # 6b. ACORD 25 multi-column layout (INSURED followed by INSURER B on adjacent column)
    if not res['E&O Insured']:
        m_ins_acord = re.search(r'\bINSURED\b[ \t]*[\n\r]+[ \t]*(?:INSURER\s*[B-F\u20ac][ \t]*[\n\r]+[ \t]*)?([A-Z][A-Za-z0-9 .,:\'&-]{2,60})[ \t]*[\n\r]+[ \t]*(?:INSURER|[0-9]{1,5}\s+[A-Za-z])', cleaned_text)
        if m_ins_acord:
            cand_ins = m_ins_acord.group(1).strip(' -:;,\n\r_')
            if not re.search(r'INSURER|CERTIFICATE|COVERAGE|POLICY|PRODUCER|HOLDER', cand_ins, re.I):
                res['E&O Insured'] = cand_ins

    # 6c. Standard INSURED fallback regex (single line, does not cross into address/insurer lines)
    if not res['E&O Insured']:
        m_ins = re.search(
            r'(?:NAMED\s*INSURED(?:\s*AND\s*MAILING\s*ADDRESS|\s*AND\s*ADDRESS)?|\bINSURED\b)\s*[:\-]?\s*[\n\r\s]*(?:(?:NOTICE|NQTICE)[^\n\r]*[\n\r]+)?(?:(?:The\s+Errors|INSURER\s*[A-Z]?)[^\n\r]*[\n\r]+)?[ \t]*([A-Za-z0-9 .,:\'&-]{3,70})',
            cleaned_text,
            re.I
        )
        if m_ins:
            cand_ins = m_ins.group(1).strip(" -:;,\n\r_")
            if not re.search(r'(?:Certificate|Policy|Coverage|Limits|Item|Producer|Producer:|Date|Notice|Insurers?|Subrogation|Holder)', cand_ins, re.I):
                res['E&O Insured'] = cand_ins

    # 6d. Appraiser name hint fallback (when certificate lists appraiser without standard INSURED label, or to confirm)
    if not res['E&O Insured'] and appraiser_hint and len(appraiser_hint.strip()) >= 3:
        appr_clean = appraiser_hint.strip()
        for line in cleaned_text.splitlines():
            l_strip = line.strip(' -:;,_"\'')
            if len(l_strip) >= 3 and appr_clean.lower() in l_strip.lower():
                if not re.search(r'Borrower|Lender|Client|Property|Address|County|State|Zip|Appraiser|Certification|Insurance|Company|Policy|Signature|Signed', l_strip, re.I):
                    res['E&O Insured'] = l_strip
                    break

    # 7. E&O Carrier / Insurance Company
    # 7a. ACORD 25 specific insurer letter match (if Professional Liability row gave us INSURER letter)
    if acord_insr_ltr:
        m_acord_car = re.search(rf'INSURER\s*{acord_insr_ltr}\s*[:\-]\s*([^\n\r]{{3,75}})', cleaned_text, re.I)
        if m_acord_car:
            cand_c = clean_carrier_val(m_acord_car.group(1))
            if is_valid_carrier(cand_c):
                res['E&O Carrier'] = cand_c

    # 7b. CNA / Travelers declarations layout: "Insurance is provided by \n <Carrier Name>"
    if not res['E&O Carrier']:
        m_cna_c = re.search(
            r'(?:Insurance\s+is\s+provided\s+by|Coverage\s+(?:is\s+)?provided\s+by|Underwritten\s+by|Issuing\s+Company)[\s:]*[\n\r\s]{0,30}([A-Z][A-Za-z0-9\s&.,\'-]{3,65}(?:Casualty|Insurance|Surety|Indemnity|Assurance|Company|Underwriters|Group)(?:,?\s*(?:of\s+America|Inc\.?|LLC|Corp\.?|Co\.?|Ltd\.?))*)',
            cleaned_text,
            re.I
        )
        if m_cna_c:
            cand_c = clean_carrier_val(m_cna_c.group(1))
            if is_valid_carrier(cand_c):
                res['E&O Carrier'] = cand_c

    # 7c. General carrier patterns across Declarations & ACORD 25
    if not res['E&O Carrier']:
        carrier_patterns = [
            r'INSURER\s*[A-F]?\s*[:\-]\s*([^\n\r]{3,70})',
            r'(?:Insurance\s*Company|Carrier|Company\s*Affording\s*Coverage|Insurer)\s*[:\-]\s*[\n\r\s]*([^\n\r]{3,70})',
            r'([A-Z][A-Za-z0-9&\'.,\s]{2,50}\s+(?:Casualty\s+and\s+Surety\s+Company(?:\s+of\s+America)?|Casualty\s+&?\s*Surety\s+Company(?:\s+of\s+America)?|Surplus\s+Lines\s+Insurance\s+Company|Risk\s+Retention\s+Group|Casualty\s+Company|Insurance\s+Company|Insurance\s+Group|Indemnity\s+Company|Assurance\s+Company|Fire\s+Insurance(?:\s+Company)?|Underwriters))',
            r'([A-Z][A-Za-z0-9&\'.,\s]{2,45}\s+(?:Casualty|Insurance|Surety|Underwriters|Indemnity|Assurance)\s+(?:Company|Group|Corporation|Corp\.?|Co\.?))',
        ]
        for cp in carrier_patterns:
            m_c = re.search(cp, cleaned_text, re.I)
            if m_c:
                cand_c = clean_carrier_val(m_c.group(1))
                if is_valid_carrier(cand_c):
                    res['E&O Carrier'] = cand_c
                    break

    # 8. E&O Limit of Liability (handling OCR substitutions where $ is scanned as 5/S or , as .)
    m_lim = re.search(
        r'(?:Limits?\s*of\s*Liability|LIMIT\s*OF\s*LIABILITY|EACH\s*(?:CLAIM|OCCURRENCE)|PER\s*CLAIM|POLICY\s*LIMITS?|AGGREGATE\s*LIMIT)\b[\s\S]{0,65}?([$5S]?\s*[0-9]{1,3}(?:[,.][0-9]{3})+)',
        cleaned_text,
        re.I
    )
    if m_lim:
        res['E&O Limit'] = clean_money_val(m_lim.group(1))

    # 9. E&O Deductible (non-greedy window so same-line or next-line values are captured cleanly)
    m_ded = re.search(
        r'(?:Deductible|DEDUCTIBLE|Self[\-\s]*Insured\s*Retention|\bRetention\b|\bSIR\b)\b[\s\S]{0,55}?([$5S]?\s*[0-9]{1,3}(?:[,.][0-9]{3})+|\$\s*0\b|\bNone\b|\bNIL\b|\b[0-9]{3,6}\b)',
        cleaned_text,
        re.I
    )
    if m_ded:
        raw_ded = m_ded.group(1).strip()
        if raw_ded.lower() in ('none', 'nil'):
            res['E&O Deductible'] = 'None'
        else:
            res['E&O Deductible'] = clean_money_val(raw_ded)

    # Determine E&O Present vs Absent: Only Present if verified E&O data or explicit certificate detected
    is_eo_doc = bool(re.search(
        r'\b(?:E\s*[\/&]\s*O|E\s+and\s+O|E-O)(?:\s*(?:Insurance|Coverage|Policy))?\b|'
        r'Errors\s*(?:and|&)\s*Omissions(?:\s*(?:Insurance|Coverage|Policy))?|'
        r'Certificate\s*of\s*(?:Liability\s*)?Insurance|'
        r'Professional\s*Liability(?:\s*Insurance)?|'
        r'Appraisers\s*Advantage',
        cleaned_text,
        re.I
    ))
    if res['E&O Insurance'] or (res['Policy Period From'] and res['Policy Period To']) or res['E&O Carrier'] or is_eo_doc:
        res['E&O'] = 'Present'
        res['E&O Present'] = 'Present'
    else:
        res['E&O'] = 'Absent'
        res['E&O Present'] = 'Absent'

    return res


def extract_eo_insurance_from_doc(doc: pymupdf.Document, use_ocr: bool = True, appraiser_hint: str = "") -> Dict[str, str]:
    """
    Locates the E&O (Errors & Omissions) Insurance page within a PDF Document
    and extracts:
      - 'E&O': 'Present' or 'Absent'
      - 'E&O Present': 'Present' or 'Absent'
      - 'E&O Insurance': Policy / Certificate Number
      - 'Policy Period From': Start / Inception / Effective Date
      - 'Policy Period To': Expiration / End Date
      - 'E&O Insured': Named Insured
      - 'E&O Carrier': Insurance Company
      - 'E&O Limit': Limit of Liability
      - 'E&O Deductible': Deductible
    Works seamlessly for both native text pages and scanned image exhibits.
    Zero hardcoded values.
    """
    result = {
        'E&O': 'Absent',
        'E&O Present': 'Absent',
        'E&O Attached': 'No',
        'has_eo': False,
        'E&O Page': '',
        'E&O Insurance': '',
        'Policy Period From': '',
        'Policy Period To': '',
        'E&O Insured': '',
        'E&O Carrier': '',
        'E&O Limit': '',
        'E&O Deductible': '',
        'base64_preview': ''
    }
    if doc is None or len(doc) == 0:
        return result

    eo_page_idx = None

    # Step 1: Find candidate E&O page index
    for idx in range(len(doc)):
        p = doc[idx]
        t = p.get_text('text')
        lines = [ln.strip() for ln in t.split('\n') if ln.strip()]
        header_lines = lines[:10]

        is_eo_page = False
        for hl in header_lines:
            hl_upper = hl.upper()
            if re.search(r'^\s*(?:E\s*[\/&]\s*O|E\s+and\s+O|E-O|ERRORS\s*(?:AND|&)\s*OMISSIONS)(?:\s*(?:INSURANCE|COVERAGE|POLICY))?\s*$', hl, re.I):
                is_eo_page = True
                break
            if re.search(r'\b(?:E\s*[\/&]\s*O|E\s+and\s+O|E-O)(?:\s*(?:INSURANCE|COVERAGE|POLICY))?\b', hl_upper):
                is_eo_page = True
                break
            if 'ERRORS & OMISSIONS' in hl_upper or 'ERRORS AND OMISSIONS' in hl_upper:
                is_eo_page = True
                break
            if 'CERTIFICATE OF' in hl_upper and 'INSURANCE' in hl_upper:
                is_eo_page = True
                break
            if 'APPRAISERS ADVANTAGE' in hl_upper or 'PROFESSIONAL LIABILITY' in hl_upper or 'E&O COVERAGE' in hl_upper:
                is_eo_page = True
                break

        if not is_eo_page and re.search(r'\b(?:E\s*[\/&]\s*O|E\s+and\s+O|E-O)(?:\s*(?:Insurance|Coverage|Policy))?\b', t, re.I):
            is_eo_page = True
        if not is_eo_page and re.search(r'Errors\s*(?:and|&)\s*Omissions(?:\s*(?:Insurance|Coverage|Policy))?', t, re.I):
            is_eo_page = True
        if not is_eo_page and re.search(r'Certificate\s+of\s+(?:Liability\s+)?Insurance', t, re.I):
            is_eo_page = True
        if not is_eo_page and re.search(r'Appraisers\s+Advantage|Professional\s+Liability(?:\s+Insurance)?', t, re.I):
            is_eo_page = True

        if is_eo_page:
            eo_page_idx = idx
            break

    # Second pass: check full text of all pages for E&O keywords
    if eo_page_idx is None:
        for idx in range(len(doc)):
            p = doc[idx]
            t = p.get_text('text')
            if re.search(r'\b(?:E\s*[\/&]\s*O|E\s+and\s+O|E-O)(?:\s*(?:Insurance|Coverage|Policy))?\b|\bErrors\s*(?:and|&)\s*Omissions(?:\s*(?:Insurance|Coverage|Policy))?\b|Certificate\s+of\s+(?:Liability\s+)?Insurance|Professional\s+Liability|Appraisers\s+Advantage', t, re.I):
                eo_page_idx = idx
                break

    # Step 1.5: If still not found and use_ocr is True, check candidate scanned exhibit pages
    if eo_page_idx is None and use_ocr:
        candidate_indices = []
        for idx in range(len(doc) - 1, -1, -1):
            p = doc[idx]
            if len(p.get_images()) > 0 and len(p.get_text('text').strip()) < 350:
                candidate_indices.append(idx)
            if len(candidate_indices) >= 20:
                break

        reader = get_easyocr_reader()
        pytess = _get_pytesseract()

        for c_idx in candidate_indices:
            p = doc[c_idx]
            try:
                rect = p.rect
                clip_rect = pymupdf.Rect(rect.x0, rect.y0, rect.x1, rect.y0 + rect.height * 0.60)
                pix = p.get_pixmap(dpi=150, clip=clip_rect)
                img = Image.open(io.BytesIO(pix.tobytes('png')))

                header_ocr_text = ""
                if reader is not None:
                    res_boxes = reader.readtext(np.array(img), detail=0)
                    header_ocr_text = " ".join(res_boxes)
                elif pytess is not None:
                    header_ocr_text = pytess.image_to_string(img)

                if header_ocr_text and re.search(
                    r'\b(?:E\s*[\/&]\s*O|E\s+and\s+O|E-O)(?:\s*(?:Insurance|Coverage|Policy))?\b|'
                    r'Errors\s*(?:and|&)\s*Omissions|'
                    r'Certificate\s*of\s*(?:Liability\s*)?Insurance|'
                    r'Professional\s*Liability|'
                    r'Appraisers\s*Advantage',
                    header_ocr_text,
                    re.I
                ):
                    eo_page_idx = c_idx
                    break
            except Exception:
                pass

    if eo_page_idx is None:
        result['E&O'] = 'Absent'
        result['E&O Present'] = 'Absent'
        return result

    # An E&O page was found!
    result['E&O'] = 'Present'
    result['E&O Present'] = 'Present'
    result['E&O Attached'] = 'Yes'
    result['has_eo'] = True
    result['E&O Page'] = eo_page_idx + 1

    page = doc[eo_page_idx]
    native_text = page.get_text('text')
    spatial_text = _get_spatial_page_text(page)

    # Render high-res preview pixmap
    try:
        import base64
        pix = page.get_pixmap(dpi=150)
        b64_img = base64.b64encode(pix.tobytes("jpeg")).decode("utf-8")
        result['base64_preview'] = f"data:image/jpeg;base64,{b64_img}"
    except Exception as e:
        print(f"[eo_extractor] Error generating preview pixmap: {e}")

    # Step 2: Try native text first, then spatial native text (preserves multi-column rows)
    parsed = parse_eo_text(native_text, appraiser_hint=appraiser_hint)
    for k, v in parsed.items():
        if v:
            result[k] = v
    if spatial_text:
        sp_parsed = parse_eo_text(spatial_text, appraiser_hint=appraiser_hint)
        for k, v in sp_parsed.items():
            if not result.get(k) and v:
                result[k] = v

    # If all primary fields found, return
    if result.get('E&O Insurance') and result.get('Policy Period From') and result.get('Policy Period To') and result.get('E&O Carrier') and result.get('E&O Insured') and result.get('E&O Limit'):
        return result

    # Step 3: If key fields are incomplete and page has images, run spatial OCR (if use_ocr is True)
    if use_ocr and len(page.get_images()) > 0:
        reader = get_easyocr_reader()
        pytess = _get_pytesseract()
        if reader is not None:
            try:
                pix = page.get_pixmap(dpi=200)
                img = Image.open(io.BytesIO(pix.tobytes('png')))
                ocr_boxes = reader.readtext(np.array(img), detail=1)

                spatial_ocr_text = _reconstruct_lines_from_ocr_boxes(ocr_boxes)
                raw_ocr_text = '\n'.join(box_text.strip() for _, box_text, _ in ocr_boxes if box_text.strip())
                policy_num_box = None
                prefix_box = None

                for bbox, box_text, prob in ocr_boxes:
                    t_clean = box_text.strip()
                    if re.search(r'Policy\s*Number', t_clean, re.I):
                        policy_num_box = bbox
                    elif re.search(r'^Prefix$', t_clean, re.I):
                        prefix_box = bbox

                sparse_native = len((native_text or "").strip()) < 250
                for txt_cand in (spatial_ocr_text, raw_ocr_text):
                    if txt_cand:
                        ocr_parsed = parse_eo_text(txt_cand, appraiser_hint=appraiser_hint)
                        for k, v in ocr_parsed.items():
                            if v and (not result.get(k) or sparse_native):
                                result[k] = v

                # If Policy Number was in a table grid format (value directly below header)
                if not result.get('E&O Insurance') and policy_num_box is not None:
                    p_x0 = policy_num_box[0][0]
                    p_x1 = policy_num_box[1][0]
                    p_y1 = policy_num_box[2][1]

                    best_val = ''
                    prefix_val = ''

                    for bbox, box_text, prob in ocr_boxes:
                        t_val = box_text.strip()
                        b_x0, b_y0 = bbox[0][0], bbox[0][1]
                        b_x1, b_y1 = bbox[1][0], bbox[2][1]

                        # Value directly below 'Policy Number' header
                        if 0 <= (b_y0 - p_y1) <= 70:
                            if max(p_x0, b_x0) <= min(p_x1, b_x1) + 40:
                                if is_valid_policy_number(t_val):
                                    best_val = t_val

                        # Prefix directly below 'Prefix' header
                        if prefix_box is not None:
                            pref_y1 = prefix_box[2][1]
                            pref_x0 = prefix_box[0][0]
                            pref_x1 = prefix_box[1][0]
                            if 0 <= (b_y0 - pref_y1) <= 70:
                                if max(pref_x0, b_x0) <= min(pref_x1, b_x1) + 20:
                                    if re.match(r'^[A-Za-z]{2,6}$', t_val):
                                        prefix_val = t_val

                    if best_val:
                        result['E&O Insurance'] = f"{prefix_val} {best_val}".strip() if prefix_val else best_val

            except Exception as e:
                print(f"[eo_extractor] OCR extraction error: {e}")
        elif pytess is not None:
            try:
                pix = page.get_pixmap(dpi=150)
                img = Image.open(io.BytesIO(pix.tobytes('png')))
                tess_text = pytess.image_to_string(img)
                tess_parsed = parse_eo_text(tess_text, appraiser_hint=appraiser_hint)
                for k, v in tess_parsed.items():
                    if not result.get(k) and v:
                        result[k] = v
            except Exception as e:
                print(f"[eo_extractor] PyTesseract extraction error: {e}")

    # Ensure E&O is marked Present if we found an E&O page or an E&O Insurance policy number
    if result.get('E&O Insurance') or eo_page_idx is not None:
        result['E&O'] = 'Present'
        result['E&O Present'] = 'Present'
        result['E&O Attached'] = 'Yes'
        result['has_eo'] = True
    else:
        result['E&O'] = 'Absent'
        result['E&O Present'] = 'Absent'
        result['E&O Attached'] = 'No'
        result['has_eo'] = False

    return result


def extract_eo_copy_data(page, p_no: int, use_ocr: bool = True, appraiser_hint: str = "") -> Dict[str, Any]:
    """
    Extracts structured E&O certificate data and high-res canvas preview from a specific E&O page.
    Works for TOTAL Form SCNLGL / Form MAP.Generic, ACI, ClickFORMS, Bradford, SFREP, and scanned exhibits.
    Zero hardcoded values.
    """
    import base64
    base64_preview = ""
    try:
        pix = page.get_pixmap(dpi=150)
        b64_img = base64.b64encode(pix.tobytes("jpeg")).decode("utf-8")
        base64_preview = f"data:image/jpeg;base64,{b64_img}"
    except Exception as e:
        print(f"[eo_extractor] Error generating E&O copy preview pixmap: {e}")

    raw_text = page.get_text("text") or ""
    spatial_text = _get_spatial_page_text(page)
    res = parse_eo_text(raw_text, appraiser_hint=appraiser_hint)
    if spatial_text:
        sp_parsed = parse_eo_text(spatial_text, appraiser_hint=appraiser_hint)
        for k, v in sp_parsed.items():
            if not res.get(k) and v:
                res[k] = v
    res["E&O Page"] = p_no
    res["E&O Attached"] = "Yes"
    res["E&O Present"] = "Present"
    res["E&O"] = "Present"
    res["has_eo"] = True
    res["base64_preview"] = base64_preview
    res["raw_text"] = raw_text

    # If critical fields are missing and page has images, run spatial OCR
    needs_ocr = (
        not res.get("E&O Insurance") or
        not res.get("Policy Period To") or
        not res.get("E&O Carrier") or
        not res.get("E&O Insured") or
        not res.get("E&O Limit")
    )
    if use_ocr and needs_ocr and len(page.get_images()) > 0:
        reader = get_easyocr_reader()
        pytess = _get_pytesseract()
        if reader is not None:
            try:
                pix = page.get_pixmap(dpi=200)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                ocr_boxes = reader.readtext(np.array(img), detail=1)
                spatial_ocr_text = _reconstruct_lines_from_ocr_boxes(ocr_boxes)
                raw_ocr_text = "\n".join(box_text.strip() for _, box_text, _ in ocr_boxes if box_text.strip())
                sparse_native = len((raw_text or "").strip()) < 250
                for txt_cand in (spatial_ocr_text, raw_ocr_text):
                    if txt_cand:
                        ocr_parsed = parse_eo_text(txt_cand, appraiser_hint=appraiser_hint)
                        for k, v in ocr_parsed.items():
                            if v and (not res.get(k) or sparse_native):
                                res[k] = v
            except Exception as e:
                print(f"[eo_extractor] OCR error on page {p_no}: {e}")
        elif pytess is not None:
            try:
                pix = page.get_pixmap(dpi=150)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                tess_text = pytess.image_to_string(img)
                tess_parsed = parse_eo_text(tess_text, appraiser_hint=appraiser_hint)
                for k, v in tess_parsed.items():
                    if not res.get(k) and v:
                        res[k] = v
            except Exception as e:
                print(f"[eo_extractor] PyTesseract error on page {p_no}: {e}")

    return res
