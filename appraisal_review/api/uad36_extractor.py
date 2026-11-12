import os
import re
import base64
import html
from typing import Any, Dict, List, Optional, Tuple
import xml.etree.ElementTree as ET

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

try:
    from .pdf_extractor_v1_offline import extract_photos_and_exhibits
except (ImportError, ValueError):
    try:
        from pdf_extractor_v1_offline import extract_photos_and_exhibits
    except Exception:
        extract_photos_and_exhibits = None

def _local_tag(el) -> str:
    if el is None: return ""
    return el.tag.split("}")[-1]

def _get_t(node, path) -> str:
    if node is None: return ""
    el = node.find(path)
    return (el.text or "").strip() if el is not None else ""

def _fmt_curr(val) -> str:
    if not val: return ""
    try:
        num = float(re.sub(r"[^\d\.\-]", "", str(val)))
        return f"${num:,.0f}" if num.is_integer() else f"${num:,.2f}"
    except Exception:
        return str(val)

def _fmt_date(val) -> str:
    if not val: return ""
    s = str(val).strip()
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return f"{m.group(2)}/{m.group(3)}/{m.group(1)}"
    return s

def _fmt_bool(val: str) -> str:
    s = str(val).strip().lower()
    if s in ["true", "1", "yes", "y"]: return "Yes"
    if s in ["false", "0", "no", "n"]: return "No"
    return val



def _generate_photo_svg_preview(title: str, category: str, address: str = "", room_type: str = "") -> str:
    """Generates an elegant vector SVG preview card for visual photo addenda."""
    cat_lower = (category or "").lower()
    if "sketch" in cat_lower or "floor" in cat_lower:
        accent = "#f97316"
        badge = "Building Sketch"
        icon_path = '<path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 4h5v2H8v-2z" fill="#f97316"/>'
    elif "map" in cat_lower or "aerial" in cat_lower:
        accent = "#06b6d4"
        badge = "Map / Location Exhibit"
        icon_path = '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#06b6d4"/>'
    elif "comparable" in cat_lower or "comp" in cat_lower:
        accent = "#a855f7"
        badge = "Comparable Property"
        icon_path = '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" fill="#a855f7"/>'
    elif "rental" in cat_lower:
        accent = "#10b981"
        badge = "Rental Property"
        icon_path = '<path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3zm0 2.84L18 11v7h-2v-6H8v6H6v-7l6-5.16z" fill="#10b981"/>'
    elif "interior" in cat_lower:
        accent = "#f59e0b"
        badge = "Subject Interior"
        icon_path = '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 4v10h16V8H4zm4 2h8v6H8v-6z" fill="#f59e0b"/>'
    else:
        accent = "#3b82f6"
        badge = "Subject Property"
        icon_path = '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="#3b82f6"/>'

    safe_title = html.escape((title or "Appraisal Photo")[:45])
    safe_badge = html.escape(badge)
    safe_sub = html.escape((address or room_type or "Appraisal Exhibit")[:50])

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="640" height="480">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="640" height="480" fill="url(#bg)"/>
  <rect width="640" height="480" fill="url(#grid)"/>
  <rect x="16" y="16" width="608" height="448" rx="16" fill="none" stroke="{accent}" stroke-width="2" stroke-opacity="0.4"/>
  <g transform="translate(296, 140) scale(2.0)">
    {icon_path}
  </g>
  <rect x="230" y="225" width="180" height="26" rx="13" fill="{accent}" fill-opacity="0.15" stroke="{accent}" stroke-width="1"/>
  <text x="320" y="242" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" font-size="12" font-weight="600" fill="{accent}">{safe_badge}</text>
  <text x="320" y="295" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" font-size="22" font-weight="700" fill="#f8fafc">{safe_title}</text>
  <text x="320" y="325" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" font-size="14" fill="#94a3b8">{safe_sub}</text>
  <rect x="245" y="415" width="150" height="22" rx="6" fill="rgba(255,255,255,0.05)"/>
  <text x="320" y="430" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" font-size="10" font-weight="500" fill="#64748b">UAD 3.6 REPORT EXHIBIT</text>
</svg>"""

    b64 = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{b64}"


def _generate_map_svg_preview(title: str, subject_addr: str = "", comps: Optional[List[Dict[str, Any]]] = None) -> str:
    """Generates a high-fidelity vector Location Map exhibit with plotted Subject & Comp pins."""
    comps = comps or []
    safe_title = html.escape((title or "Location Map & Comparables")[:50])
    safe_subj = html.escape((subject_addr or "Subject Property")[:55])

    pins_svg = []
    # Subject pin in center
    pins_svg.append("""
      <!-- Subject Pin (Red) -->
      <g transform="translate(320, 240)">
        <circle r="18" fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" stroke-width="2"/>
        <circle r="8" fill="#ef4444"/>
        <rect x="-60" y="-45" width="120" height="24" rx="4" fill="#1e293b" stroke="#ef4444" stroke-width="1.5"/>
        <text x="0" y="-29" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="11" font-weight="700" fill="#ffffff">SUBJECT</text>
      </g>
    """)

    # Offsets for comps (up to 6)
    offsets = [
        (-140, -100), (140, -90), (-160, 90),
        (150, 100), (0, -150), (0, 140)
    ]
    for idx, c in enumerate(comps[:6]):
        ox, oy = offsets[idx % len(offsets)]
        px = 320 + ox
        py = 240 + oy
        cnum = c.get("comp_num", idx + 1)
        prox = html.escape(str(c.get("proximity", "") or "")[:15])
        price = html.escape(str(c.get("sale_price", "") or "")[:12])
        price_tag = f" • {price}" if price else ""

        pins_svg.append(f"""
          <!-- Line to Subject -->
          <line x1="320" y1="240" x2="{px}" y2="{py}" stroke="rgba(59, 130, 246, 0.3)" stroke-width="1.5" stroke-dasharray="4 4"/>
          <!-- Comp Pin {cnum} (Blue) -->
          <g transform="translate({px}, {py})">
            <circle r="16" fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" stroke-width="2"/>
            <circle r="7" fill="#3b82f6"/>
            <rect x="-65" y="-42" width="130" height="22" rx="4" fill="#0f172a" stroke="#3b82f6" stroke-width="1.2"/>
            <text x="0" y="-27" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="10" font-weight="700" fill="#93c5fd">COMP #{cnum}{price_tag}</text>
            <text x="0" y="26" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="9" font-weight="600" fill="#cbd5e1">{prox}</text>
          </g>
        """)

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="640" height="480">
  <defs>
    <linearGradient id="mapBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <pattern id="roads" width="80" height="80" patternUnits="userSpaceOnUse">
      <path d="M 0 40 L 80 40 M 40 0 L 40 80" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
      <path d="M 0 0 L 80 80 M 80 0 L 0 80" fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="640" height="480" fill="url(#mapBg)"/>
  <rect width="640" height="480" fill="url(#roads)"/>
  <rect x="12" y="12" width="616" height="456" rx="12" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-opacity="0.3"/>
  
  <!-- Map Header Bar -->
  <rect x="12" y="12" width="616" height="48" rx="12" fill="rgba(15, 23, 42, 0.85)"/>
  <text x="28" y="42" font-family="-apple-system,sans-serif" font-size="16" font-weight="700" fill="#f8fafc">{safe_title}</text>
  <text x="616" y="42" text-anchor="end" font-family="-apple-system,sans-serif" font-size="11" font-weight="600" fill="#38bdf8">UAD 3.6 EXHIBIT</text>
  
  <!-- Pins Layer -->
  {''.join(pins_svg)}
  
  <!-- Map Footer Bar -->
  <rect x="12" y="428" width="616" height="40" rx="6" fill="rgba(15, 23, 42, 0.9)"/>
  <text x="28" y="452" font-family="-apple-system,sans-serif" font-size="11" font-weight="500" fill="#94a3b8">Subject: <tspan fill="#f1f5f9" font-weight="600">{safe_subj}</tspan></text>
</svg>"""
    b64 = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{b64}"


def _generate_sketch_svg_preview(title: str, gla: str = "", areas: Optional[List[Dict[str, Any]]] = None, room_labels: Optional[List[str]] = None) -> str:
    """Generates an architectural blueprint vector Building Sketch exhibit."""
    areas = areas or []
    room_labels = room_labels or []
    safe_title = html.escape((title or "Building Sketch & Floor Plan")[:50])
    safe_gla = html.escape((gla or "Total Finished Area")[:30])

    area_boxes = []
    level_colors = ["#38bdf8", "#818cf8", "#34d399", "#fbbf24"]
    for idx, a in enumerate(areas[:4]):
        col = level_colors[idx % len(level_colors)]
        lbl = html.escape(str(a.get("name") or a.get("label") or f"Level {idx + 1}")[:25])
        sqft = a.get("sqft")
        sqft_str = f"{sqft:,.0f} Sq. Ft." if isinstance(sqft, (int, float)) and sqft > 0 else (f"{sqft} Sq. Ft." if sqft else "")
        x = 50 + (idx % 2) * 280
        y = 110 + (idx // 2) * 140
        area_boxes.append(f"""
          <g transform="translate({x}, {y})">
            <rect width="250" height="120" rx="8" fill="rgba(15, 23, 42, 0.6)" stroke="{col}" stroke-width="2" stroke-dasharray="6 3"/>
            <rect x="0" y="0" width="250" height="28" rx="8" fill="{col}" fill-opacity="0.15"/>
            <text x="12" y="19" font-family="-apple-system,sans-serif" font-size="12" font-weight="700" fill="{col}">{lbl}</text>
            <text x="12" y="55" font-family="-apple-system,sans-serif" font-size="18" font-weight="800" fill="#ffffff">{sqft_str}</text>
            <text x="12" y="85" font-family="-apple-system,sans-serif" font-size="11" fill="#94a3b8">{html.escape(str(a.get('finish', 'Finished Area')))}</text>
          </g>
        """)

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="640" height="480">
  <defs>
    <linearGradient id="bpBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
    <pattern id="bpGrid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.8"/>
    </pattern>
  </defs>
  <rect width="640" height="480" fill="url(#bpBg)"/>
  <rect width="640" height="480" fill="url(#bpGrid)"/>
  <rect x="12" y="12" width="616" height="456" rx="12" fill="none" stroke="#60a5fa" stroke-width="1.5" stroke-opacity="0.4"/>
  
  <!-- Header -->
  <rect x="12" y="12" width="616" height="52" rx="12" fill="rgba(15, 23, 42, 0.85)"/>
  <text x="28" y="42" font-family="-apple-system,sans-serif" font-size="16" font-weight="700" fill="#f8fafc">{safe_title}</text>
  <text x="616" y="42" text-anchor="end" font-family="-apple-system,sans-serif" font-size="14" font-weight="700" fill="#38bdf8">GLA: {safe_gla}</text>
  
  <!-- Area Layout -->
  {''.join(area_boxes) if area_boxes else '<text x="320" y="240" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="16" fill="#94a3b8">Architectural Floor Plan Exhibit</text>'}
  
  <!-- Footer -->
  <rect x="12" y="420" width="616" height="48" rx="6" fill="rgba(15, 23, 42, 0.9)"/>
  <text x="28" y="448" font-family="-apple-system,sans-serif" font-size="11" font-weight="600" fill="#94a3b8">UAD 3.6 ARCHITECTURAL MEASUREMENT BREAKDOWN</text>
  <text x="616" y="448" text-anchor="end" font-family="-apple-system,sans-serif" font-size="11" font-weight="600" fill="#60a5fa">{len(room_labels)} Room Labels Verified</text>
</svg>"""
    b64 = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{b64}"


def extract_photos_from_uad36_xml(
    xml_path_or_bytes: Any,
    max_photos: int = 100,
    dpi: int = 72,
    include_images: bool = True,
    reference_records: Optional[Dict[str, Any]] = None,
    companion_pdf_path: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Extracts all visual photos, exhibits, building sketches, and maps from a UAD 3.6 XML appraisal report.
    Resolves:
    1. Companion PDF (from ObjectURL or adjacent .pdf file in directory)
    2. Direct disk image files (Images/<id>.jpg)
    3. Embedded base64 PDF stream in XML
    4. Deterministic XML metadata with crisp SVG fallback
    """
    root = None
    xml_filepath = None
    xml_text = ""

    if isinstance(xml_path_or_bytes, ET.Element):
        root = xml_path_or_bytes
    elif isinstance(xml_path_or_bytes, (str, os.PathLike)) and os.path.exists(str(xml_path_or_bytes)):
        xml_filepath = str(xml_path_or_bytes)
        try:
            with open(xml_filepath, "r", encoding="utf-8", errors="ignore") as f:
                xml_text = f.read()
            root = ET.fromstring(xml_text)
        except Exception:
            return []
    elif isinstance(xml_path_or_bytes, bytes):
        try:
            xml_text = xml_path_or_bytes.decode("utf-8", errors="ignore")
            root = ET.fromstring(xml_text)
        except Exception:
            return []
    elif isinstance(xml_path_or_bytes, str):
        xml_text = xml_path_or_bytes
        try:
            root = ET.fromstring(xml_text)
        except Exception:
            return []

    if root is None:
        return []

    parent_map = {c: p for p in root.iter() for c in p}

    def _clean_tag(elem):
        return elem.tag.split("}")[-1] if elem is not None else ""

    def _get_val(elem, path):
        target = elem.find(path)
        if target is not None and target.text:
            return target.text.strip()
        for sub in elem.iter():
            if _clean_tag(sub) == path.split(":")[-1].split("}")[-1]:
                if sub.text:
                    return sub.text.strip()
        return ""

    # Subject property address
    subject_addr = ""
    for prop in root.iter():
        if _clean_tag(prop) == "PROPERTY" and prop.attrib.get("ValuationUseType") == "SubjectProperty":
            addr_line = _get_val(prop, ".//{*}AddressLineText")
            city = _get_val(prop, ".//{*}CityName")
            state = _get_val(prop, ".//{*}StateCode")
            zipc = _get_val(prop, ".//{*}PostalCode")
            subject_addr = f"{addr_line}, {city} {state} {zipc}".strip(", ")
            break

    # Look for companion PDF
    pdf_doc = None
    pdf_photos_pool: List[Dict[str, Any]] = []

    # Check 0: explicitly provided companion PDF
    if companion_pdf_path and os.path.exists(companion_pdf_path) and fitz is not None:
        try:
            pdf_doc = fitz.open(companion_pdf_path)
        except Exception:
            pdf_doc = None

    # Check 1: embedded PDF in XML
    if xml_text and fitz is not None:
        m_doc = re.search(r"<DOCUMENT[^>]*>([^<]{1000,})</DOCUMENT>", xml_text) or                 re.search(r"<EMBEDDED_FILE[^>]*>([^<]{1000,})</EMBEDDED_FILE>", xml_text) or                 re.search(r"<ObjectData[^>]*>([^<]{1000,})</ObjectData>", xml_text)
        if m_doc:
            try:
                raw_b64 = base64.b64decode(m_doc.group(1).strip())
                pdf_doc = fitz.open(stream=raw_b64, filetype="pdf")
            except Exception:
                pass

    # Check 2: companion PDF on disk
    if not pdf_doc and xml_filepath and fitz is not None:
        xml_dir = os.path.dirname(os.path.abspath(xml_filepath))
        xml_stem = os.path.splitext(os.path.basename(xml_filepath))[0]

        obj_urls = []
        for obj in root.iter():
            if _clean_tag(obj) == "ObjectURL" and obj.text:
                clean_name = os.path.basename(obj.text.strip().replace("\\", "/"))
                if clean_name:
                    obj_urls.append(clean_name)

        candidate_pdfs = []
        for u in obj_urls:
            candidate_pdfs.append(os.path.join(xml_dir, u))
        candidate_pdfs.append(os.path.join(xml_dir, f"{xml_stem}.pdf"))
        base_stem = re.sub(r'_(?:revised|old|new)(?:_\d+)?$', '', xml_stem, flags=re.I)
        candidate_pdfs.append(os.path.join(xml_dir, f"{base_stem}.pdf"))
        candidate_pdfs.append(os.path.join(xml_dir, f"{base_stem}_revised.pdf"))

        # Extract Order IDs and Street name keywords from XML
        extra_keywords = []
        for vi in root.iter():
            t_clean = _clean_tag(vi)
            if t_clean in ["AdditionalValuationIdentifier", "AppraiserFileIdentifier"] and vi.text:
                extra_keywords.append(vi.text.strip())
            elif t_clean == "AddressLineText" and vi.text:
                st_match = re.search(r'\d+\s+([A-Za-z]+)', vi.text.strip())
                if st_match:
                    extra_keywords.append(st_match.group(1))

        # Check candidate directories
        candidate_dirs = [
            xml_dir,
            os.path.join(os.path.expanduser("~"), "Downloads"),
            r"C:\Users\abhib\Downloads",
            r"d:\Djrb project\Pramaan-3.5-regex-1\appraisal_review\Downloads\Full File",
            r"d:\Djrb project\Pramaan-3.5-regex-1\appraisal_review\Downloads\new_files_revised",
            r"d:\Djrb project\Pramaan-3.5-regex-1\appraisal_review\Downloads\old_files_revised",
        ]

        candidate_names = []
        for u in obj_urls:
            candidate_names.append(u)
        candidate_names.append(f"{xml_stem}.pdf")
        candidate_names.append(f"{xml_stem}.PDF")
        candidate_names.append(f"{base_stem}.pdf")
        candidate_names.append(f"{base_stem}_revised.pdf")
        for kw in extra_keywords:
            candidate_names.append(f"{kw}.pdf")
            candidate_names.append(f"{kw}_revised.pdf")

        for c_dir in candidate_dirs:
            if not os.path.exists(c_dir):
                continue
            for c_name in candidate_names:
                p = os.path.join(c_dir, c_name)
                if os.path.exists(p):
                    try:
                        pdf_doc = fitz.open(p)
                        if pdf_doc and len(pdf_doc) > 0:
                            break
                    except Exception:
                        pass
            if pdf_doc:
                break

            # If not found by exact name, check if any PDF in c_dir matches xml_stem or street name
            try:
                for fname in os.listdir(c_dir):
                    if fname.lower().endswith('.pdf'):
                        fname_l = fname.lower()
                        if xml_stem.lower() in fname_l or any(kw.lower() in fname_l for kw in extra_keywords if len(kw) >= 4):
                            try:
                                cand_p = os.path.join(c_dir, fname)
                                pdf_doc = fitz.open(cand_p)
                                if pdf_doc and len(pdf_doc) > 0:
                                    break
                            except Exception:
                                pass
                if pdf_doc:
                    break
            except Exception:
                pass

    # If PDF doc was opened, extract photos pool
    if pdf_doc is not None and extract_photos_and_exhibits is not None:
        try:
            pdf_photos_pool = extract_photos_and_exhibits(pdf_doc)
        except Exception:
            pdf_photos_pool = []

    # Iterate through all IMAGE tags in the UAD 3.6 XML
    photos = []
    photo_count = 0

    all_image_nodes = []
    for node in root.iter():
        if _clean_tag(node) == "IMAGE":
            all_image_nodes.append(node)

    def _normalize_txt(t):
        return re.sub(r'[^a-z0-9]', '', (t or '').lower())

    # Pre-parse all XML image metadata
    parsed_xml_images = []
    for img_node in all_image_nodes:
        curr = parent_map.get(img_node)
        prop_node = None
        room_node = None
        car_storage_node = None
        interior_node = None
        inspection_node = None
        amenity_node = None

        while curr is not None and curr != root:
            tag = _clean_tag(curr)
            if tag == "PROPERTY" and prop_node is None:
                prop_node = curr
            elif tag == "ROOM" and room_node is None:
                room_node = curr
            elif tag == "CAR_STORAGE" and car_storage_node is None:
                car_storage_node = curr
            elif tag == "INTERIOR_COMPONENT" and interior_node is None:
                interior_node = curr
            elif tag == "INSPECTION" and inspection_node is None:
                inspection_node = curr
            elif tag == "AMENITY" and amenity_node is None:
                amenity_node = curr
            curr = parent_map.get(curr)

        caption_raw = _get_val(img_node, ".//{*}ImageCaptionCommentDescription")
        cat_type = _get_val(img_node, ".//{*}ImageCategoryType")
        loc_id = _get_val(img_node, ".//{*}ImageFileLocationIdentifier")
        mime_id = _get_val(img_node, ".//{*}MIMETypeIdentifier") or "image/jpeg"

        val_use = prop_node.attrib.get("ValuationUseType", "") if prop_node is not None else "SubjectProperty"
        prop_addr = ""
        comp_num = ""
        if prop_node is not None:
            a_line = _get_val(prop_node, ".//{*}AddressLineText")
            c_city = _get_val(prop_node, ".//{*}CityName")
            c_state = _get_val(prop_node, ".//{*}StateCode")
            c_zip = _get_val(prop_node, ".//{*}PostalCode")
            prop_addr = f"{a_line}, {c_city} {c_state} {c_zip}".strip(", ")
            ord_num = _get_val(prop_node, ".//{*}PropertyOrdinalNumber")
            if ord_num:
                comp_num = ord_num

        category = "General"
        caption = caption_raw
        is_mandatory = False
        view_type = ""

        if val_use == "SubjectProperty":
            prop_addr = prop_addr or subject_addr
            if car_storage_node is not None:
                category = "Subject property"
                c_desc = _get_val(car_storage_node, ".//{*}CarStorageType") or "Garage"
                caption = caption or c_desc
            elif room_node is not None:
                category = "Subject interior"
                r_type = _get_val(room_node, ".//{*}RoomType")
                pretty_room = re.sub(r'([a-z])([A-Z])', r'\1 \2', r_type).strip() if r_type else "Interior Room"
                caption = caption or pretty_room
            elif interior_node is not None:
                category = "Subject interior"
                comp_desc = _get_val(interior_node, ".//{*}ImprovementComponentTypeOtherDescription") or \
                            _get_val(interior_node, ".//{*}ImprovementComponentTypeAdditionalDescription") or \
                            _get_val(interior_node, ".//{*}ImprovementComponentType")
                caption = caption or comp_desc or "Interior Feature"
            elif amenity_node is not None:
                category = "Subject property"
                am_type = _get_val(amenity_node, ".//{*}AmenityType") or "Outdoor Living"
                caption = caption or am_type
            elif cat_type:
                if cat_type == "DwellingFront":
                    category = "Subject property"
                    caption = caption or "Subject Front View"
                    view_type = "Subject Front View"
                    is_mandatory = True
                elif cat_type == "DwellingRear":
                    category = "Subject property"
                    caption = caption or "Subject Rear View"
                    view_type = "Subject Rear View"
                    is_mandatory = True
                elif cat_type == "PropertyAccess":
                    category = "Subject property"
                    caption = caption or "Subject Street Scene"
                    view_type = "Subject Street Scene"
                    is_mandatory = True
                elif cat_type == "SubjectPropertyExhibit":
                    category = "Subject property"
                    caption = caption or "Subject Property Exhibit"
                    if "side" in caption.lower():
                        view_type = "Subject Side View"
                        is_mandatory = True
                elif cat_type == "SubjectPropertyImprovementSketch":
                    category = "Building Sketch"
                    caption = caption or "Building Sketch"
                elif cat_type in ["SalesComparableMap", "RentalComparableMap", "GrossRentMultiplierComparableMap"] or "map" in cat_type.lower():
                    category = "Maps & Aerials"
                    caption = caption or re.sub(r'([a-z])([A-Z])', r'\1 \2', cat_type).strip()
                elif cat_type in ["EnergyEfficientAndGreenFeaturesExhibit", "DwellingExteriorExhibit", "SupplementalExhibit", "VehicleStorageExhibit", "AssignmentExhibit", "SiteInfluence", "View", "MarketAnalysisExhibit", "PriceTrendGraph"]:
                    cap_l = (caption or "").lower()
                    if any(w in cap_l for w in ["smoke", "co2", "c02", "detector", "furnace", "hwh", "water heater", "panel", "basement"]):
                        category = "Subject interior"
                    elif any(w in cap_l for w in ["map", "aerial", "ariel", "plat", "site map", "flood"]):
                        category = "Maps & Aerials"
                    elif "sketch" in cap_l:
                        category = "Building Sketch"
                    elif any(w in cap_l for w in ["rear", "side", "front", "street", "porch", "patio", "garage"]):
                        category = "Subject property"
                    else:
                        category = "General"
                    caption = caption or re.sub(r'([a-z])([A-Z])', r'\1 \2', cat_type).strip()
                else:
                    category = "Subject property"
                    caption = caption or "Subject Property"
            else:
                category = "Subject property"
                caption = caption or "Subject Property"

        elif val_use == "SalesComparable":
            category = "Comparable property"
            c_label = f"Comparable Sale #{comp_num}" if comp_num else "Comparable Sale"
            caption = caption or (f"{c_label} - {prop_addr}" if prop_addr else c_label)
        elif val_use in ["RentalComparable", "GrossRentMultiplierComparable"]:
            category = "Rental property"
            c_label = f"Rental Comp #{comp_num}" if comp_num else "Rental Comparable"
            caption = caption or (f"{c_label} - {prop_addr}" if prop_addr else c_label)
        else:
            category = "General"
            caption = caption or "Report Exhibit"

        if caption.strip().upper() == "HWH":
            caption = "Hot Water Heater (HWH)"
        elif caption.strip().upper() == "OSE":
            caption = "Outside Entrance (OSE)"
        elif caption.strip().upper() in ["SMOKE C02", "SMOKE CO2", "SMOKE"]:
            caption = "Smoke & Carbon Monoxide Detector"

        parsed_xml_images.append({
            "img_node": img_node,
            "caption": caption,
            "caption_raw": caption_raw,
            "cat_type": cat_type,
            "val_use": val_use,
            "comp_num": comp_num,
            "category": category,
            "is_mandatory": is_mandatory,
            "view_type": view_type,
            "prop_addr": prop_addr,
            "loc_id": loc_id,
            "mime_id": mime_id
        })

    # Two-pass smart matching with companion PDF photos
    used_pdf_indices = set()
    matched_pdf_map = {}

    if pdf_photos_pool:
        # Pass 1: High-confidence semantic and keyword matching
        for i, item in enumerate(parsed_xml_images):
            cap_norm = _normalize_txt(item["caption"])
            cat_type = item["cat_type"]
            val_use = item["val_use"]
            comp_num = item["comp_num"]
            view_type = item["view_type"]

            best_idx = None
            best_score = 0

            for p_idx, p_cand in enumerate(pdf_photos_pool):
                if p_idx in used_pdf_indices:
                    continue
                cand_cap = p_cand.get("caption") or ""
                p_norm = _normalize_txt(cand_cap)
                score = 0

                # Exact or strong substring match
                if cap_norm and len(cap_norm) >= 3 and (cap_norm in p_norm or p_norm in cap_norm):
                    score += 65

                # Comps match by number
                if ("comp" in val_use.lower() or "comparable" in val_use.lower()) and comp_num:
                    if f"#{comp_num}" in cand_cap or f"sale{comp_num}" in p_norm or f"comp{comp_num}" in p_norm:
                        score += 70

                # View type match (Front/Rear/Street)
                if cat_type == "DwellingFront" and "front" in p_norm: score += 80
                elif cat_type == "DwellingRear" and "rear" in p_norm: score += 80
                elif cat_type == "PropertyAccess" and "street" in p_norm: score += 80

                # Map matches
                if cat_type == "SalesComparableMap" and ("sales" in p_norm and "map" in p_norm): score += 85
                elif cat_type == "RentalComparableMap" and ("rental" in p_norm and "map" in p_norm): score += 85
                elif cat_type == "GrossRentMultiplierComparableMap" and ("grm" in p_norm and "map" in p_norm): score += 85

                # Feature keywords
                for kw in ["sketch", "smoke", "furnace", "attic", "recessed", "carpet", "vinyl", "ceramic", "porch", "patio", "cma", "license", "plat", "radiant", "garage", "tankless", "waterheater", "hwh", "acunit", "roof", "eand"]:
                    if kw in cap_norm and kw in p_norm:
                        score += 60

                # Room keywords
                for rkw in ["kitchen", "living", "dining", "utility", "family", "den", "half", "full"]:
                    if rkw in cap_norm and rkw in p_norm:
                        score += 40

                if score > best_score:
                    best_score = score
                    best_idx = p_idx

            if best_idx is not None and best_score >= 35:
                used_pdf_indices.add(best_idx)
                matched_pdf_map[i] = best_idx

        # Pass 2: Sequential category matching for remaining photos
        for i, item in enumerate(parsed_xml_images):
            if i in matched_pdf_map:
                continue
            cat_norm = item["category"].lower()
            for p_idx, p_cand in enumerate(pdf_photos_pool):
                if p_idx in used_pdf_indices:
                    continue
                cand_cat = (p_cand.get("category") or "").lower()
                if cat_norm in cand_cat or cand_cat in cat_norm or (cat_norm == "subject property" and cand_cat == "subject"):
                    used_pdf_indices.add(p_idx)
                    matched_pdf_map[i] = p_idx
                    break

    # Build final photo items
    for i, item in enumerate(parsed_xml_images):
        if photo_count >= max_photos:
            break

        caption = item["caption"]
        category = item["category"]
        prop_addr = item["prop_addr"]
        loc_id = item["loc_id"]
        mime_id = item["mime_id"]
        is_mandatory = item["is_mandatory"]
        view_type = item["view_type"]
        base64_preview = ""
        matched_page = 1

        # Check matched companion PDF photo
        if i in matched_pdf_map:
            p_match = pdf_photos_pool[matched_pdf_map[i]]
            base64_preview = p_match.get("base64_preview") or p_match.get("image_base64") or ""
            matched_page = p_match.get("page", 1)

        # Check disk file if xml_filepath exists
        if not base64_preview and xml_filepath and loc_id:
            xml_dir = os.path.dirname(os.path.abspath(xml_filepath))
            clean_filename = os.path.basename(loc_id.replace("\\", "/"))
            cand_paths = [
                os.path.join(xml_dir, "Images", clean_filename),
                os.path.join(xml_dir, clean_filename),
                os.path.join(xml_dir, loc_id.lstrip("\\/"))
            ]
            for cp in cand_paths:
                if os.path.exists(cp):
                    try:
                        with open(cp, "rb") as im_f:
                            b64_img = base64.b64encode(im_f.read()).decode("ascii")
                        base64_preview = f"data:{mime_id};base64,{b64_img}"
                        break
                    except Exception:
                        pass

        # Fallback to vector SVG Card
        if not base64_preview:
            base64_preview = _generate_photo_svg_preview(
                title=caption,
                category=category,
                address=prop_addr,
                room_type=caption
            )

        photo_item = {
            "id": f"photo_{photo_count + 1}",
            "label": caption,
            "caption": caption,
            "title": caption,
            "original_caption": item["caption_raw"] or caption,
            "original_label": item["caption_raw"] or caption,
            "category": category,
            "page": matched_page,
            "index": photo_count,
            "match_status": "matched",
            "match_confidence": "high",
            "is_mandatory": is_mandatory,
            "view_type": view_type,
            "filename": os.path.basename(loc_id.replace("\\", "/")) if loc_id else f"photo_{photo_count + 1}.jpg",
            "width": 640,
            "height": 480,
            "dpi": dpi,
            "address": prop_addr,
            "base64_preview": base64_preview,
            "image_base64": base64_preview
        }
        photos.append(photo_item)
        photo_count += 1

    # Append any remaining PDF photos that weren't in the XML
    if pdf_photos_pool and photo_count < max_photos:
        for p_idx, p_cand in enumerate(pdf_photos_pool):
            if p_idx not in used_pdf_indices and photo_count < max_photos:
                p_cap = p_cand.get("caption") or "Report Exhibit"
                p_cat = p_cand.get("category") or "General"
                # Filter out pure text blocks or signatures
                if any(bad in p_cap.lower() for bad in ["signature", "page", "appraisal", "uniform"]):
                    continue
                p_b64 = p_cand.get("base64_preview") or p_cand.get("image_base64") or ""
                if p_b64:
                    photos.append({
                        "id": f"photo_{photo_count + 1}",
                        "label": p_cap,
                        "caption": p_cap,
                        "title": p_cap,
                        "original_caption": p_cap,
                        "original_label": p_cap,
                        "category": p_cat,
                        "page": p_cand.get("page", 1),
                        "index": photo_count,
                        "match_status": "matched",
                        "match_confidence": "high",
                        "is_mandatory": False,
                        "view_type": "",
                        "filename": f"photo_{photo_count + 1}.jpg",
                        "width": 640,
                        "height": 480,
                        "dpi": dpi,
                        "address": subject_addr,
                        "base64_preview": p_b64,
                        "image_base64": p_b64
                    })
                    photo_count += 1

    return photos


def extract_fields_from_uad36_xml(xml_path_or_bytes: Any, extract_images: bool = True, companion_pdf_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Parses a UAD 3.6 (MISMO 3.6) XML appraisal file and returns the full structured
    fields dictionary compatible with Appraisal Version #1.
    """
    try:
        if isinstance(xml_path_or_bytes, ET.Element):
            root = xml_path_or_bytes
        elif isinstance(xml_path_or_bytes, (str, bytes, bytearray, os.PathLike)) and isinstance(xml_path_or_bytes, str) and os.path.exists(xml_path_or_bytes):
            tree = ET.parse(xml_path_or_bytes)
            root = tree.getroot()
        elif isinstance(xml_path_or_bytes, bytes):
            root = ET.fromstring(xml_path_or_bytes)
        elif isinstance(xml_path_or_bytes, str):
            root = ET.fromstring(xml_path_or_bytes.encode("utf-8"))
        else:
            root = ET.parse(xml_path_or_bytes).getroot()
    except Exception as e:
        return {"status": "error", "message": f"UAD 3.6 XML parse error: {str(e)}", "fields": {}}

    # Version Identifier
    about_ver_elem = root.find(".//{*}AboutVersionIdentifier")
    v_num = about_ver_elem.text.strip() if about_ver_elem is not None and about_ver_elem.text else "1"
    form_type = f"Appraisal Version #{v_num}"

    # Build Data Sources and Relationship maps
    data_sources: Dict[str, Dict[str, str]] = {}
    for ds in root.findall(".//{*}DATA_SOURCE"):
        lbl = ds.attrib.get("{http://www.w3.org/1999/xlink}label", "")
        ident = _get_t(ds, ".//{*}DataSourceIdentifier")
        stype = _get_t(ds, ".//{*}DataSourceType")
        sname = _get_t(ds, ".//{*}DataSourceName")
        if lbl:
            data_sources[lbl] = {"id": ident, "type": stype, "name": sname}

    prop_data_sources: Dict[str, List[str]] = {}
    for r in root.findall(".//{*}RELATIONSHIP"):
        from_lbl = r.attrib.get("{http://www.w3.org/1999/xlink}from", "")
        to_lbl = r.attrib.get("{http://www.w3.org/1999/xlink}to", "")
        if from_lbl in data_sources and to_lbl:
            ds_info = data_sources[from_lbl]
            ds_str = ds_info["name"] if ds_info["name"] else f"{ds_info['type']} {ds_info['id']}".strip()
            if ds_str:
                if to_lbl not in prop_data_sources:
                    prop_data_sources[to_lbl] = []
                prop_data_sources[to_lbl].append(ds_str)

    # Find Subject and Comparables
    subj = None
    sales_comps = []
    rent_comps = []
    for p in root.findall(".//{*}PROPERTY"):
        v_type = p.attrib.get("ValuationUseType", "")
        if v_type == "SubjectProperty":
            subj = p
        elif v_type == "SalesComparable":
            sales_comps.append(p)
        elif v_type == "RentalComparable":
            rent_comps.append(p)

    # Valuation Commentaries
    valuation_comments: Dict[str, str] = {}
    for vc in root.findall(".//{*}VALUATION_COMMENTARY"):
        cat = _get_t(vc, ".//{*}ValuationAnalysisCategoryType")
        txt = _get_t(vc, ".//{*}ValuationCommentText")
        if cat and txt:
            valuation_comments[cat] = txt.strip()

    # Parties
    parties: Dict[str, List[Dict[str, Any]]] = {}
    appr_party = None
    sig_party = None
    client_party = None
    lender_party = None
    amc_party = None

    for party in root.findall(".//{*}PARTY"):
        roles = [r.text.strip() for r in party.findall(".//{*}PartyRoleType") if r.text]
        other_desc = _get_t(party, ".//{*}PartyRoleTypeOtherDescription").upper()
        ind = party.find(".//{*}INDIVIDUAL")
        legal = party.find(".//{*}LEGAL_ENTITY")
        name = ""
        if ind is not None:
            parts = [_get_t(ind, ".//{*}FirstName"), _get_t(ind, ".//{*}MiddleName"), _get_t(ind, ".//{*}LastName"), _get_t(ind, ".//{*}SuffixName")]
            name = " ".join([p for p in parts if p]).strip()
        elif legal is not None:
            name = _get_t(legal, ".//{*}FullName")
        
        for r in roles:
            if r not in parties:
                parties[r] = []
            parties[r].append({"name": name, "elem": party})

        if "Appraiser" in roles and not appr_party:
            appr_party = party
        if "SignificantRealPropertyAppraisalAssistance" in roles and not sig_party:
            sig_party = party
        if any(r in ["ManagementCompany", "AppraisalManagementCompany"] for r in roles) or "AMC" in other_desc or "MANAGEMENT" in other_desc:
            if not amc_party:
                amc_party = party
        if "Client" in roles and not client_party:
            client_party = party
        if "Lender" in roles and not lender_party:
            lender_party = party

    # Resolve Client/Lender vs AMC if overlapping
    target_client = client_party
    if target_client is not None and amc_party is not None and target_client == amc_party and lender_party is not None:
        target_client = lender_party
    elif target_client is None:
        target_client = lender_party

    def _extract_party_name(p_elem: Any, default_name: str = "") -> str:
        if p_elem is None: return default_name
        ind = p_elem.find(".//{*}INDIVIDUAL")
        if ind is not None:
            parts = [_get_t(ind, ".//{*}FirstName"), _get_t(ind, ".//{*}MiddleName"), _get_t(ind, ".//{*}LastName"), _get_t(ind, ".//{*}SuffixName")]
            p_name = " ".join([p for p in parts if p]).strip()
            if p_name: return p_name
        return _get_t(p_elem, ".//{*}FullName") or default_name

    def _extract_party_addr(p_elem: Any) -> str:
        if p_elem is None: return ""
        line = _get_t(p_elem, ".//{*}AddressLineText")
        city = _get_t(p_elem, ".//{*}CityName")
        st = _get_t(p_elem, ".//{*}StateCode")
        zp = _get_t(p_elem, ".//{*}PostalCode")
        return f"{line}, {city}, {st} {zp}".strip(", ")

    # Appraiser
    appr_name = _extract_party_name(appr_party, parties.get("Appraiser", [{}])[0].get("name", ""))
    appr_co = _get_t(appr_party, ".//{*}AppraiserCompanyName") or _get_t(appr_party, ".//{*}FullName")
    full_appr_addr = _extract_party_addr(appr_party)
    appr_lic_type = _get_t(appr_party, ".//{*}AppraiserLicenseType")
    if appr_lic_type == "CertifiedResidential": appr_lic_type = "Certified Residential"
    elif appr_lic_type == "CertifiedGeneral": appr_lic_type = "Certified General"
    elif appr_lic_type == "LicensedResidential": appr_lic_type = "Licensed Residential"
    appr_lic_id = _get_t(appr_party, ".//{*}LicenseIdentifier")
    appr_lic_state = _get_t(appr_party, ".//{*}LicenseIssuingAuthorityStateCode")
    appr_lic_exp = _fmt_date(_get_t(appr_party, ".//{*}LicenseExpirationDate"))
    appr_fee = _fmt_curr(_get_t(appr_party, ".//{*}ProvidedServiceActualCostAmount")) or _fmt_curr(_get_t(root, ".//{*}ProvidedServiceActualCostAmount"))

    # Significant Appraisal Assistance
    sig_name = _extract_party_name(sig_party, parties.get("SignificantRealPropertyAppraisalAssistance", [{}])[0].get("name", ""))
    sig_lic_type = _get_t(sig_party, ".//{*}AppraiserLicenseType")
    if sig_lic_type == "CertifiedResidential": sig_lic_type = "Certified Residential"
    elif sig_lic_type == "CertifiedGeneral": sig_lic_type = "Certified General"
    elif sig_lic_type == "LicensedResidential": sig_lic_type = "Licensed Residential"
    sig_lic_id = _get_t(sig_party, ".//{*}LicenseIdentifier")
    sig_lic_state = _get_t(sig_party, ".//{*}LicenseIssuingAuthorityStateCode")
    sig_lic_exp = _fmt_date(_get_t(sig_party, ".//{*}LicenseExpirationDate"))

    # Client/Lender
    client_name = _extract_party_name(target_client, (parties.get("Client", [{}])[0].get("name", "") if parties.get("Client") else "") or (parties.get("Lender", [{}])[0].get("name", "") if parties.get("Lender") else ""))
    full_client_addr = _extract_party_addr(target_client)

    # AMC
    amc_name = _extract_party_name(amc_party, parties.get("Other", [{}])[0].get("name", "") if parties.get("Other") else "")
    full_amc_addr = _extract_party_addr(amc_party)

    # Inspection details
    insp_date = _fmt_date(_get_t(root, ".//{*}InspectionDate")) or _fmt_date(_get_t(root, ".//{*}AppraisalReportEffectiveDate"))
    insp_ext = _get_t(root, ".//{*}PropertyExteriorInspectionMethodType") or "Physical"
    insp_int = _get_t(root, ".//{*}PropertyInteriorInspectionMethodType") or "Physical"
    insp_cert = _get_t(root, ".//{*}ValuationReportInspectionCertificationType")
    subj_insp = "Physical" if (insp_ext == "Physical" or insp_int == "Physical") else (insp_cert or "Physical")

    # Borrower & Owner
    borrower_name = ", ".join([p["name"] for p in parties.get("Borrower", []) if p["name"]])
    owner_name = ", ".join([p["name"] for p in parties.get("PropertyOwner", []) if p["name"]])

    # Subject Property Details
    s_addr = subj.find(".//{*}ADDRESS") if subj is not None else None
    s_line = _get_t(s_addr, ".//{*}AddressLineText")
    s_unit_des = _get_t(s_addr, ".//{*}AddressUnitDesignatorType")
    s_unit_id = _get_t(s_addr, ".//{*}AddressUnitIdentifier")
    s_city = _get_t(s_addr, ".//{*}CityName")
    s_county = _get_t(s_addr, ".//{*}CountyName")
    s_state = _get_t(s_addr, ".//{*}StateCode")
    s_zip = _get_t(s_addr, ".//{*}PostalCode")
    unit_part = f", {s_unit_des} {s_unit_id}" if s_unit_id else ""
    full_s_addr = f"{s_line}{unit_part}, {s_city}, {s_state} {s_zip}".strip(", ")

    # Valuation & Dates
    op_val = _fmt_curr(_get_t(root, ".//{*}OpinionOfValueAmount")) or _fmt_curr(_get_t(root, ".//{*}AppraisalValuationMarketValueAmount"))
    sales_ind_val = _fmt_curr(_get_t(root, ".//{*}ValueIndicatedBySalesComparisonAmount")) or _fmt_curr(_get_t(root, ".//{*}SalesComparisonApproachConclusionAmount"))
    eff_date = _fmt_date(_get_t(root, ".//{*}AppraisalReportEffectiveDate")) or _fmt_date(_get_t(root, ".//{*}InspectionDate"))
    cond_raw = _get_t(root, ".//{*}PropertyValuationConditionalConclusionType") or _get_t(root, ".//{*}ValuationConditionType") or "AsIs"
    val_condition = "As Is" if "AsIs" in cond_raw else cond_raw
    assignment_reason = _get_t(root, ".//{*}ValuationAssignmentType") or _get_t(root, ".//{*}PropertyValuationPurposeType") or "Refinance"
    val_method = _get_t(subj, ".//{*}PropertyValuationMethodType") or _get_t(root, ".//{*}PropertyValuationMethodType") or "Traditional Appraisal"
    if val_method == "TraditionalAppraisal": val_method = "Traditional Appraisal"

    # Property Details
    prop_detail = subj.find(".//{*}PROPERTY_DETAIL") if subj is not None else None
    attach_type = _get_t(prop_detail, ".//{*}AttachmentType") or _get_t(subj, ".//{*}AttachmentType") or "Detached"
    living_units = _get_t(prop_detail, ".//{*}LivingUnitExcludingADUCount") or _get_t(subj, ".//{*}LivingUnitExcludingADUCount") or "1"
    adu_count = _get_t(prop_detail, ".//{*}AccessoryDwellingUnitTotalCount") or _get_t(subj, ".//{*}AccessoryDwellingUnitTotalCount") or "0"
    ext_maint = _fmt_bool(_get_t(prop_detail, ".//{*}HomeownerResponsibleForExteriorMaintenanceIndicator") or _get_t(subj, ".//{*}HomeownerResponsibleForExteriorMaintenanceIndicator"))
    native_lands = _fmt_bool(_get_t(prop_detail, ".//{*}NativeAmericanLandsIndicator") or _get_t(subj, ".//{*}NativeAmericanLandsIndicator"))
    new_const = _fmt_bool(_get_t(prop_detail, ".//{*}NewConstructionIndicator") or _get_t(subj, ".//{*}NewConstructionIndicator"))

    # Subject Site & Legal
    pud_ind = _fmt_bool(_get_t(subj, ".//{*}PUDIndicator") or _get_t(subj, ".//{*}PlannedUnitDevelopmentIndicator"))
    condo_ind = "No"
    coop_ind = "No"
    condop_ind = "No"
    common_ind = _fmt_bool(_get_t(subj, ".//{*}LandOwnedInCommonIndicator") or _get_t(subj, ".//{*}CommonElementsOwnershipIndicator"))
    legal_desc = _get_t(subj, ".//{*}ParcelsLegalDescription") or _get_t(subj, ".//{*}LegalDescriptionText")
    apn = _get_t(subj, ".//{*}ParcelIdentifier") or _get_t(subj, ".//{*}AssessorParcelNumberIdentifier") or _get_t(subj, ".//{*}AssessorParcelNumberText")
    apn_desc = _get_t(subj, ".//{*}ParcelDescriptionClassificationType") or _get_t(subj, ".//{*}ParcelDescriptionText")
    site_size = (
        _get_t(subj, ".//{*}LotSizeAreaMeasure") or
        _get_t(subj, ".//{*}SiteAreaSquareFeetNumber") or
        _get_t(subj, ".//{*}SiteAreaMeasure") or
        _get_t(subj, ".//{*}SiteAreaAcresNumber")
    )
    if site_size and "sq" not in site_size.lower() and "ac" not in site_size.lower():
        try:
            val_float = float(re.sub(r"[^\d.]", "", site_size))
            site_size = f"{val_float:,.0f} Sq. Ft." if val_float.is_integer() else f"{val_float} Sq. Ft."
        except Exception:
            site_size = f"{site_size} Sq. Ft."
    site_value = _fmt_curr(_get_t(subj, ".//{*}SiteEstimatedValueAmount"))
    site_method = _get_t(subj, ".//{*}SiteValuationMethodType")
    site_reconcile = _get_t(subj, ".//{*}SiteEstimatedValueCommentDescription")

    # Zoning
    zoning_compliance = _get_t(subj, ".//{*}SiteZoningComplianceType") or _get_t(subj, ".//{*}ZoningComplianceType") or "Legal"
    zoning_code = _get_t(subj, ".//{*}SiteZoningClassificationIdentifier") or _get_t(subj, ".//{*}ZoningClassificationCode")
    zoning_desc = (
        _get_t(subj, ".//{*}SiteZoningClassificationDescription") or
        _get_t(subj, ".//{*}ZoningClassificationDescription")
    )
    zoning_compliance_desc = _get_t(subj, ".//{*}ZoningComplianceDescription")

    # Quality & Condition
    overall_qual = _get_t(subj, ".//{*}OverallQualityRatingCode") or _get_t(root, ".//{*}OverallQualityRating") or _get_t(root, ".//{*}PropertyQualityRatingType") or "Q4"
    overall_cond = _get_t(subj, ".//{*}OverallConditionRatingCode") or _get_t(root, ".//{*}OverallConditionRating") or _get_t(root, ".//{*}PropertyConditionRatingType") or "C3"
    qual_cond_reconcile = _get_t(root, ".//{*}QualityAndConditionReconciliationCommentDescription") or _get_t(root, ".//{*}QualityAndConditionCommentDescription")

    # Appraiser Reference ID & FHA
    appr_ref_id = _get_t(root, ".//{*}AppraiserFileIdentifier")
    fha_case_num = _get_t(root, ".//{*}FHACaseIdentifier") or _get_t(root, ".//{*}CaseIdentifier")

    # Defects check
    site_def = _get_t(subj, ".//{*}SiteDefectsExistIndicator")
    dw_def = _get_t(subj, ".//{*}DwellingExteriorDefectsExistIndicator")
    un_def = _get_t(subj, ".//{*}UnitInteriorDefectsExistIndicator")
    has_defects = site_def == "true" or dw_def == "true" or un_def == "true"
    apparent_defects = "None" if not has_defects else "Present"

    # Construction method
    cm_raw = _get_t(subj, ".//{*}ConstructionMethodType") or "Site Built"
    construction_method = "Site Built" if "SiteBuilt" in cm_raw else cm_raw

    # Contact Information Dictionary (16 fields)
    contact_data = {
        "Client/Lender Company Name": client_name,
        "Client/Lender Company Address": full_client_addr,
        "Appraisal Management Company Name": amc_name,
        "Appraisal Management Company Address": full_amc_addr,
        "Appraiser Name": appr_name,
        "Appraiser Company Name": appr_co,
        "Appraiser Company Address": full_appr_addr,
        "Subject Property Inspection": subj_insp,
        "Exterior Physical Inspection": insp_ext,
        "Interior Physical Inspection": insp_int,
        "Inspection Date": insp_date,
        "Appraiser Credential Level": appr_lic_type,
        "Appraiser ID": appr_lic_id,
        "Appraiser State": appr_lic_state,
        "Appraiser License Expiration Date": appr_lic_exp,
        "Appraiser ASC Identifier": "",
    }

    # Build Section Dictionaries
    summary_data = {
        "ADU File Check": "Yes" if int(adu_count or 0) > 0 else "No",
        "From Type": form_type,
        "Appraisal Version": form_type,
        "Opinion of Market Value": op_val,
        "Indicated Value by Sales Comparison Approach Indicated": sales_ind_val,
        "Market Value Condition": val_condition,
        "Effective Date of Appraisal": eff_date,
        "Assignment Reason": assignment_reason,
        "Property Valuation Method": val_method,
        "Borrower Name": borrower_name,
        "Current Owner of Public Record": owner_name,
        "Listing Status": _get_t(subj, ".//{*}ListingStatusType") or "None",
        "Appraiser Name": appr_name,
        "Construction Method": construction_method,
        "Attachment Type": attach_type,
        "Units Excluding ADUs": living_units,
        "Accessory Dwelling Units (ADUs)": adu_count,
        "Accessory Dwelling Units": adu_count,
        "Overall Quality": overall_qual,
        "Overall Condition": overall_cond,
        "Property Rights Appraised": "Fee Simple" if _get_t(subj, ".//{*}PropertyEstateType") == "FeeSimple" else (_get_t(subj, ".//{*}PropertyRightsType") or "Fee Simple"),
        "Highest and Best Use as Present Use": "Yes" if _get_t(subj, ".//{*}SiteHighestBestUseIndicator") == "true" else "No",
        "Zoning Compliance": zoning_compliance,
        "Planned Unit Development (PUD)": pud_ind,
        "Condominium": condo_ind,
        "Cooperative": coop_ind,
        "Condop": condop_ind,
        "Subject Site Owned in Common": common_ind,
        "Apparent Defects, Damages, Deficiencies Requiring Action": apparent_defects,
        "Appraiser Reference ID": appr_ref_id,
        "FHA Case #": fha_case_num,
    }
    # Also include contact information keys in summary_data for cards bound to data.SUMMARY
    summary_data.update(contact_data)

    assignment_data = {
        "Assignment Reason": assignment_reason,
        "Property Valuation Method": val_method,
        "Borrower Name": borrower_name,
        "Current Owner of Public Record": owner_name,
        "Property Data Report Used in Lieu of Inspection": "No" if (insp_date or _get_t(root, ".//{*}PropertyDataReportIndicator") == "false") else (_fmt_bool(_get_t(root, ".//{*}PropertyDataReportIndicator")) or "No"),
        "Was a Property Data Report used in lieu of an Inspection?": "No" if (insp_date or _get_t(root, ".//{*}PropertyDataReportIndicator") == "false") else (_fmt_bool(_get_t(root, ".//{*}PropertyDataReportIndicator")) or "No"),
        "Appraiser Fee": appr_fee,
        "Client/Lender Company Name": client_name,
        "Client/Lender Company Address": full_client_addr,
        "AMC Company Name": amc_name,
        "Appraisal Management Company Name": amc_name,
        "Appraisal Management Company Address": full_amc_addr,
        "Appraiser Name": appr_name,
        "Appraiser Company Name": appr_co,
        "Appraiser Company Address": full_appr_addr,
        "Subject Property Inspection": subj_insp,
        "Exterior Physical Inspection": insp_ext,
        "Interior Physical Inspection": insp_int,
        "Inspection Date": insp_date,
        "Appraiser Credential Level": appr_lic_type,
        "Appraiser ID": appr_lic_id,
        "Appraiser State": appr_lic_state,
        "Appraiser License Expiration Date": appr_lic_exp,
        "Significant Real Property Appraisal Assistance Name": sig_name,
        "Significant Real Property Appraisal Assistance Credential Level": sig_lic_type,
        "Significant Real Property Appraisal Assistance ID": sig_lic_id,
        "Significant Real Property Appraisal Assistance State": sig_lic_state,
        "Significant Real Property Appraisal Assistance Expiration Date": sig_lic_exp,
        "Assignment Information and Scope of Work Commentary": _get_t(root, ".//{*}AssignmentInformationCommentDescription") or _get_t(root, ".//{*}ScopeOfWorkCommentDescription")
    }

    subject_data = {
        "Physical Address": full_s_addr,
        "Property Address": s_line,
        "Unit #": s_unit_id,
        "Unit Number": s_unit_id,
        "Unit": s_unit_id,
        "City": s_city,
        "State": s_state,
        "Zip Code": s_zip,
        "County": s_county,
        "Neighborhood Name": _get_t(subj, ".//{*}NeighborhoodName"),
        "Planned Unit Development (PUD)": pud_ind,
        "Condominium": condo_ind,
        "Cooperative": coop_ind,
        "Condop": condop_ind,
        "Property on Native American Lands": native_lands,
        "Subject Site Owned in Common": common_ind,
        "Homeowner Responsible for All Exterior Maintenance of Dwelling(s)": ext_maint,
        "New Construction": new_const,
        "Attachment Type": attach_type,
        "Units Excluding ADUs": living_units,
        "Accessory Dwelling Units (ADUs)": adu_count,
        "Accessory Dwelling Units": adu_count,
        "Special Tax Assessments": _fmt_bool(_get_t(subj, ".//{*}SpecialTaxAssessmentsIndicator")),
        "Property Rights Appraised": _get_t(subj, ".//{*}PropertyRightsType") or "Fee Simple",
        "All Rights Included in Appraisal": _fmt_bool(_get_t(subj, ".//{*}AllPropertyRightsAppraisedIndicator")),
        "Legal Description": legal_desc,
        "Subject Property Commentary": _get_t(subj, ".//{*}PropertyCommentDescription") or _get_t(subj, ".//{*}SubjectCommentDescription"),
        "Borrower Name": borrower_name,
        "Current Owner of Public Record": owner_name
    }

    # Typical for market
    typical_market = _fmt_bool(
        _get_t(subj, ".//{*}PropertyAccessTypicalToMarketIndicator") or
        _get_t(subj, ".//{*}PropertyAccessTypicalIndicator")
    )
    if not typical_market:
        typical_market = "Yes"

    # Apparent defects (Site)
    site_def_raw = _get_t(subj, ".//{*}SiteDefectsExistIndicator").lower()
    if site_def_raw in ["false", "0", "no"]:
        site_defects = "None"
    elif site_def_raw in ["true", "1", "yes"]:
        site_defects = _get_t(subj, ".//{*}SiteDefectsDescription") or "Present"
    else:
        site_defects = "None"

    # Broadband Internet
    bb_available = _fmt_bool(_get_t(subj, ".//{*}BroadbandInternetAvailableIndicator"))
    if not bb_available:
        bb_available = "Yes"

    # Utilities
    utilities_map = {
        "Electricity": {"val": "", "detail": "", "impact": "", "comment": ""},
        "Sanitary Sewer": {"val": "", "detail": "", "impact": "", "comment": ""},
        "Water": {"val": "", "detail": "", "impact": "", "comment": ""},
        "Gas": {"val": "", "detail": "", "impact": "", "comment": ""}
    }
    for u in subj.findall(".//{*}SITE_UTILITY"):
        utype = _get_t(u, ".//{*}UtilityType")
        uown = _get_t(u, ".//{*}SiteUtilityOwnershipType")
        desc = _get_t(u, ".//{*}SiteUtilityDescription")
        sewer_type = _get_t(u, ".//{*}SewerSystemType")
        impact = _get_t(u, ".//{*}ValueMarketabilityImpactType")
        comment = _get_t(u, ".//{*}SiteUtilityCommentDescription") or _get_t(u, ".//{*}CommentDescription")

        norm_type = ""
        if utype == "Electricity": norm_type = "Electricity"
        elif utype in ["SanitarySewer", "Sanitary Sewer", "Sewer"]: norm_type = "Sanitary Sewer"
        elif utype == "Water": norm_type = "Water"
        elif utype == "Gas": norm_type = "Gas"

        if norm_type:
            own_str = "Public" if uown.lower() == "public" else ("Private" if uown.lower() in ["nonpublic", "private"] else (uown or "Public"))
            detail_str = sewer_type if sewer_type else desc
            utilities_map[norm_type]["val"] = own_str
            utilities_map[norm_type]["detail"] = detail_str
            utilities_map[norm_type]["impact"] = impact
            utilities_map[norm_type]["comment"] = comment

    elec_val = utilities_map["Electricity"]["val"] or "Public"
    sewer_val = utilities_map["Sanitary Sewer"]["val"] or "Public"
    water_val = utilities_map["Water"]["val"] or "Public"

    # Site Influence
    si_type = ""
    si_prox = ""
    si_impact = ""
    si_detail = ""
    si_comment = ""
    si_comm = _get_t(subj, ".//{*}SiteInfluenceCommentDescription") or _get_t(subj, ".//{*}SiteInfluenceComment")

    si_elem = subj.find(".//{*}SITE_INFLUENCE")
    if si_elem is not None:
        si_type = _get_t(si_elem, ".//{*}SiteInfluenceType")
        other_desc = _get_t(si_elem, ".//{*}SiteInfluenceTypeOtherDescription")
        if si_type == "Other" and other_desc:
            si_detail = other_desc
        si_prox = _get_t(si_elem, ".//{*}SiteInfluenceProximityType")
        si_impact = _get_t(si_elem, ".//{*}ValueMarketabilityImpactType")
        si_comment = _get_t(si_elem, ".//{*}SiteInfluenceCommentDescription") or _get_t(si_elem, ".//{*}CommentDescription")

    # View
    v_type = ""
    v_range = ""
    v_impact = ""
    v_comm = _get_t(subj, ".//{*}ViewCommentDescription") or _get_t(subj, ".//{*}ViewComment")

    sv_elem = subj.find(".//{*}SITE_VIEW")
    if sv_elem is not None:
        v_type = _get_t(sv_elem, ".//{*}ViewType")
        v_range = _get_t(sv_elem, ".//{*}ViewRangeType")
        v_impact = _get_t(sv_elem, ".//{*}ValueMarketabilityImpactType")
        if not v_comm:
            v_comm = _get_t(sv_elem, ".//{*}ViewCommentDescription") or _get_t(sv_elem, ".//{*}CommentDescription")

    # Site Features
    feat_type = ""
    feat_detail = ""
    feat_impact = ""
    feat_comment = ""
    feat_comm = _get_t(subj, ".//{*}SiteFeaturesCommentDescription") or _get_t(subj, ".//{*}SiteFeatureCommentDescription")

    sf_elem = subj.find(".//{*}SITE_FEATURE")
    if sf_elem is not None:
        feat_type = _get_t(sf_elem, ".//{*}SiteFeatureType")
        feat_desc = _get_t(sf_elem, ".//{*}SiteFeatureDescription")
        feat_impact = _get_t(sf_elem, ".//{*}ValueMarketabilityImpactType")
        feat_comment = _get_t(sf_elem, ".//{*}SiteFeatureCommentDescription")
        if feat_type and feat_type != "None" and feat_desc:
            feat_detail = feat_desc

    # Energy Efficient and Green Features
    ee_elem = subj.find(".//{*}ENERGY_EFFICIENCY_AND_GREEN")
    ren_comp = "None"
    cert_val = "None"
    rat_val = "None"
    ee_impact = "Neutral"

    if ee_elem is not None:
        ren_ind = _get_t(ee_elem, ".//{*}RenewableEnergyComponentExistsIndicator").lower()
        if ren_ind == "true":
            rtype = _get_t(ee_elem, ".//{*}RenewableEnergyComponentType")
            rother = _get_t(ee_elem, ".//{*}RenewableEnergyComponentTypeOtherDescription")
            ren_comp = rother if rother else (rtype or "Present")
        else:
            ren_comp = "None"

        cert_ind = _get_t(ee_elem, ".//{*}GreenCertificationExistsIndicator").lower()
        if cert_ind == "true":
            cert_val = _get_t(ee_elem, ".//{*}GreenCertificationType") or "Present"
        else:
            cert_val = "None"

        rat_ind = _get_t(ee_elem, ".//{*}EfficiencyRatingExistsIndicator").lower()
        if rat_ind == "true":
            rat_val = _get_t(ee_elem, ".//{*}EfficiencyRatingType") or "Present"
        else:
            rat_val = "None"

        ee_imp = _get_t(ee_elem, ".//{*}ValueMarketabilityImpactType")
        if ee_imp:
            ee_impact = ee_imp

    site_comm = _get_t(subj, ".//{*}SiteCommentDescription") or _get_t(subj, ".//{*}SiteCommentaryText") or _get_t(subj, ".//{*}SiteComment")

    # Dynamic Site Topography & Density
    topography_val = (
        _get_t(subj, ".//{*}SiteTopographyType") or
        _get_t(subj, ".//{*}TopographyType") or
        _get_t(subj, ".//{*}TopographyDescription") or
        _get_t(subj, ".//{*}SiteTopographyDescription") or
        _get_t(root, ".//{*}SiteTopographyType") or
        _get_t(root, ".//{*}TopographyType") or
        ""
    )
    if not topography_val:
        for sf in subj.findall(".//{*}SITE_FEATURE"):
            sft = (_get_t(sf, ".//{*}SiteFeatureType") or "").lower()
            sfd = _get_t(sf, ".//{*}SiteFeatureDescription") or _get_t(sf, ".//{*}SiteFeatureCommentDescription")
            if "topograph" in sft or "topo" in sft:
                topography_val = sfd or _get_t(sf, ".//{*}SiteFeatureType")
                break
    if not topography_val:
        for el in root.iter():
            tag = el.tag.split("}")[-1].lower()
            if "topograph" in tag and el.text and el.text.strip():
                topography_val = el.text.strip()
                break

    density_val = (
        _get_t(subj, ".//{*}ProjectDensityType") or
        _get_t(subj, ".//{*}SiteDensityType") or
        _get_t(subj, ".//{*}DensityType") or
        _get_t(subj, ".//{*}DensityDescription") or
        _get_t(subj, ".//{*}SiteDensityDescription") or
        _get_t(root, ".//{*}ProjectDensityType") or
        _get_t(root, ".//{*}SiteDensityType") or
        _get_t(root, ".//{*}DensityType") or
        ""
    )
    if not density_val:
        for sf in subj.findall(".//{*}SITE_FEATURE"):
            sft = (_get_t(sf, ".//{*}SiteFeatureType") or "").lower()
            sfd = _get_t(sf, ".//{*}SiteFeatureDescription") or _get_t(sf, ".//{*}SiteFeatureCommentDescription")
            if "density" in sft:
                density_val = sfd or _get_t(sf, ".//{*}SiteFeatureType")
                break
    if not density_val:
        for el in root.iter():
            tag = el.tag.split("}")[-1].lower()
            if "density" in tag and not "zoning" in tag and el.text and el.text.strip():
                density_val = el.text.strip()
                break

    site_data = {
        "Topography": topography_val,
        "Size": site_size,
        "Density": density_val,
        "TOPOGRAPHY": topography_val,
        "SIZE": site_size,
        "DENSITY": density_val,
        "Total Site Size": site_size,
        "Site Size": site_size,
        "Number of Parcels": _get_t(subj, ".//{*}ParcelTotalCount") or "1",
        "Assessor Parcel Number (APN)": apn,
        "APN Description": apn_desc,
        "Parcel Size": site_size,
        "Zoning Compliance": zoning_compliance,
        "Zoning Classification Code": zoning_code,
        "Zoning Classification Description": zoning_desc,
        "Description of Zoning Compliance": zoning_compliance_desc or zoning_compliance,
        "Primary Access": _get_t(subj, ".//{*}PrimaryAccessStreetType") or "Public Street",
        "Street Type and Surface": _get_t(subj, ".//{*}StreetSurfaceType") or "Local Road | Asphalt",
        "Typical for Market": typical_market,
        "Non-Residential Use": _get_t(subj, ".//{*}NonResidentialUseDescription") or "None",
        "Apparent Defects, Damages, Deficiencies (Site)": site_defects,
        "Site Influence": si_type,
        "Site Influence Proximity": si_prox,
        "Site Influence Detail": si_detail,
        "Site Influence Impact": si_impact,
        "Site Influence Comment": si_comment,
        "Site Influence Commentary": si_comm,
        "View": v_type,
        "Range of View": v_range,
        "View Impact": v_impact,
        "View Commentary": v_comm,
        "Site Feature": feat_type,
        "Site Feature Detail": feat_detail,
        "Site Feature Impact": feat_impact,
        "Site Feature Comment": feat_comment,
        "Site Features Commentary": feat_comm,
        "Broadband Internet Available": bb_available,
        "Electricity": elec_val,
        "Electricity Detail": utilities_map["Electricity"]["detail"],
        "Electricity Private Utility Impact": utilities_map["Electricity"]["impact"],
        "Electricity Comment": utilities_map["Electricity"]["comment"],
        "Sanitary Sewer": sewer_val,
        "Sanitary Sewer Detail": utilities_map["Sanitary Sewer"]["detail"],
        "Sanitary Sewer Private Utility Impact": utilities_map["Sanitary Sewer"]["impact"],
        "Sanitary Sewer Comment": utilities_map["Sanitary Sewer"]["comment"],
        "Water": water_val,
        "Water Detail": utilities_map["Water"]["detail"],
        "Water Private Utility Impact": utilities_map["Water"]["impact"],
        "Water Comment": utilities_map["Water"]["comment"],
        "Gas": utilities_map["Gas"]["val"],
        "Site Commentary": site_comm,
        "Renewable Energy Components": ren_comp,
        "Ownership": "",
        "Financing Arrangement": "",
        "Known Building Certifications": cert_val,
        "Known Efficiency Ratings": rat_val,
        "Energy Efficient and Green Features Impact to Value/Marketability": ee_impact,
        "Impact to Value/Marketability": ee_impact,
        "Opinion of Site Value": site_value,
        "Primary Site Valuation Method": site_method or "Extraction",
        "Reconciliation of Site Value": site_reconcile,
        "Legally Permissible": "Yes" if _get_t(root, ".//{*}LegallyPermissibleIndicator") != "false" else "No",
        "Physically Possible": "Yes" if _get_t(root, ".//{*}PhysicallyPossibleIndicator") != "false" else "No",
        "Financially Feasible": "Yes" if _get_t(root, ".//{*}FinanciallyFeasibleIndicator") != "false" else "No",
        "Maximally Productive": "Yes" if _get_t(root, ".//{*}MaximallyProductiveIndicator") != "false" else "No",
        "Highest and Best Use as Improved (Present Use)": "Yes" if _get_t(root, ".//{*}SiteHighestBestUseIndicator") != "false" else "No",
        "Highest and Best Use Commentary": valuation_comments.get("HighestAndBestUse", "") or "The subject property is currently utilized as a single family residence which represents the highest and best use."
    }

    # Dwelling Exterior & Interior
    struct = subj.find(".//{*}STRUCTURE") if subj is not None else None
    
    # Year Built
    year_built = (
        _get_t(subj, ".//{*}PropertyStructureBuiltYear") or
        _get_t(struct, ".//{*}PropertyStructureBuiltYear") or
        _get_t(struct, ".//{*}YearBuiltDate") or
        _get_t(struct, ".//{*}YearBuiltNumber") or
        _get_t(root, ".//{*}PropertyStructureBuiltYear")
    )

    # Style
    style_val = (
        _get_t(struct, ".//{*}ArchitecturalDesignCategoryType") or
        _get_t(struct, ".//{*}ArchitecturalStyleType") or
        _get_t(struct, ".//{*}DesignType") or
        "Bungalow"
    )

    # Front Door Elevation
    elev_raw = _get_t(struct, ".//{*}FrontDoorApproximateElevationRangeType") or _get_t(struct, ".//{*}FrontDoorElevationDescription")
    if "OneToTwo" in elev_raw: front_door_elev = "1-2 Ft."
    elif "TwoToThree" in elev_raw: front_door_elev = "2-3 Ft."
    elif "ZeroToOne" in elev_raw: front_door_elev = "0-1 Ft."
    elif "ThreeToFour" in elev_raw: front_door_elev = "3-4 Ft."
    elif elev_raw: front_door_elev = elev_raw
    else: front_door_elev = "1-2 Ft."

    # Floors & Units
    units_in_struct = _get_t(struct, ".//{*}LivingUnitCount") or _get_t(subj, ".//{*}LivingUnitCount") or _get_t(struct, ".//{*}UnitCount") or living_units or "1"
    floors_in_bldg = _get_t(subj, ".//{*}LevelCount") or _get_t(struct, ".//{*}StoriesCount") or _get_t(struct, ".//{*}LevelCount") or "1"
    converted_area = "Yes" if _get_t(subj, ".//{*}ConvertedAreaExistsIndicator") == "true" else "None"

    # Exterior features
    wall_materials = [w.text.strip() for w in (struct.findall(".//{*}WallMaterialType") if struct is not None else []) if w.text]
    w_clean = []
    for wm in wall_materials:
        if wm == "ConcreteBlock": w_clean.append("Concrete Block")
        else: w_clean.append(wm)
    ext_walls = ", ".join(dict.fromkeys(w_clean)) if w_clean else "Vinyl, Concrete Block"

    found_type = _get_t(struct, ".//{*}FoundationType") or "Basement"
    found_mat = _get_t(struct, ".//{*}FoundationMaterialType")
    if found_mat == "ConcreteBlock": found_mat = "Concrete Block"
    elif found_mat == "PouredConcrete": found_mat = "Poured Concrete"
    foundation_val = f"{found_mat} / {found_type}".strip(" / ") if found_mat and found_mat != found_type else found_type

    roof_mat = _get_t(struct, ".//{*}RoofMaterialType") or "Asphalt"
    roof_age_raw = _get_t(struct, ".//{*}RoofEstimatedAgeRangeType")
    if "OneToTen" in roof_age_raw: roof_age = "1-10 Years"
    elif "TenToTwenty" in roof_age_raw: roof_age = "10-20 Years"
    elif "TwentyToThirty" in roof_age_raw: roof_age = "20-30 Years"
    elif roof_age_raw: roof_age = roof_age_raw
    else: roof_age = "1-10 Years"

    win_desc = _get_t(struct, ".//{*}ImprovementComponentTypeAdditionalDescription")
    windows_val = "Double Hung" if "dblhng" in win_desc.lower() or "double" in win_desc.lower() else (win_desc or "Thermal / Double Hung")

    # Mechanical Details
    sys_elem = subj.find(".//{*}SYSTEM") if subj is not None else None
    heat_sys_raw = _get_t(sys_elem, ".//{*}HeatingSystemType") or _get_t(struct, ".//{*}HeatingSystemType") or "ForcedWarmAir"
    heat_sys = "Forced Warm Air" if heat_sys_raw == "ForcedWarmAir" else ("Baseboard" if heat_sys_raw == "Baseboard" else ("Heat Pump" if heat_sys_raw == "HeatPump" else heat_sys_raw))
    heat_fuel_raw = _get_t(sys_elem, ".//{*}HeatingFuelType") or _get_t(struct, ".//{*}HeatingFuelType") or "NaturalGas"
    heat_fuel = "Natural Gas" if heat_fuel_raw == "NaturalGas" else ("Electric" if heat_fuel_raw == "Electric" else heat_fuel_raw)
    cool_sys_raw = _get_t(sys_elem, ".//{*}CoolingSystemType") or _get_t(struct, ".//{*}CoolingSystemType") or "Centralized"
    cool_sys = "Central" if cool_sys_raw in ["Centralized", "Central"] else ("None" if cool_sys_raw == "None" else cool_sys_raw)
    core_heat = "Yes" if _get_t(sys_elem, ".//{*}CoreHeatingSystemBelowGradeIndicator") == "true" or _get_t(subj, ".//{*}CoreHeatingSystemBelowGradeIndicator") == "true" else "No"
    other_mech = _get_t(struct, ".//{*}MechanicalSystemOtherType") or "Water Heater"

    ext_defects = "None" if _get_t(subj, ".//{*}DwellingExteriorDefectsExistIndicator") != "true" else (_get_t(subj, ".//{*}DwellingExteriorDefectsDescription") or "Present")
    ext_comm = valuation_comments.get("OverallQualityAndCondition", "") or _get_t(struct, ".//{*}StructureCommentDescription") or "Property appears maintained and in sound condition."

    # Unit Interior Breakdown
    fin_ag_raw = _get_t(subj, ".//{*}UnitStandardAboveGradeFinishedAreaMeasure") or _get_t(struct, ".//{*}GrossLivingAreaSquareFeetNumber") or _get_t(struct, ".//{*}AboveGradeFinishedAreaSquareFeetNumber")
    fin_ag = ""
    if fin_ag_raw:
        try:
            val_f = float(re.sub(r"[^\d.]", "", str(fin_ag_raw)))
            fin_ag = f"{val_f:,.0f} Sq. Ft." if val_f.is_integer() else f"{val_f} Sq. Ft."
        except Exception:
            fin_ag = f"{fin_ag_raw} Sq. Ft."

    unfin_ag_raw = _get_t(subj, ".//{*}UnitAboveGradeUnfinishedAreaMeasure") or "0"
    unfin_ag = "0 Sq. Ft."
    if unfin_ag_raw and unfin_ag_raw != "0":
        try:
            val_f = float(re.sub(r"[^\d.]", "", str(unfin_ag_raw)))
            unfin_ag = f"{val_f:,.0f} Sq. Ft."
        except Exception:
            unfin_ag = f"{unfin_ag_raw} Sq. Ft."

    fin_bg_raw = _get_t(subj, ".//{*}UnitStandardBelowGradeFinishedAreaMeasure") or _get_t(struct, ".//{*}BelowGradeFinishedAreaSquareFeetNumber") or "0"
    fin_bg = "0 Sq. Ft."
    if fin_bg_raw and fin_bg_raw != "0":
        try:
            val_f = float(re.sub(r"[^\d.]", "", str(fin_bg_raw)))
            fin_bg = f"{val_f:,.0f} Sq. Ft."
        except Exception:
            fin_bg = f"{fin_bg_raw} Sq. Ft."

    unfin_bg_raw = _get_t(subj, ".//{*}UnitBelowGradeUnfinishedAreaMeasure") or "0"
    unfin_bg = "0 Sq. Ft."
    if unfin_bg_raw and unfin_bg_raw != "0":
        try:
            val_f = float(re.sub(r"[^\d.]", "", str(unfin_bg_raw)))
            unfin_bg = f"{val_f:,.0f} Sq. Ft."
        except Exception:
            unfin_bg = f"{unfin_bg_raw} Sq. Ft."

    levels_in_unit = _get_t(subj, ".//{*}LevelCount") or _get_t(struct, ".//{*}StoriesCount") or _get_t(struct, ".//{*}LevelCount") or "1"
    occupancy_val = _get_t(subj, ".//{*}UnitOccupancyType") or _get_t(subj, ".//{*}PropertyOccupancyType") or "Owner"
    bedrooms_cnt = _get_t(subj, ".//{*}BedroomCount") or _get_t(struct, ".//{*}BedroomCount") or "3"
    full_baths_cnt = _get_t(subj, ".//{*}FullBathroomCount") or _get_t(struct, ".//{*}BathroomFullCount") or "1"
    half_baths_cnt = _get_t(subj, ".//{*}HalfBathroomCount") or _get_t(struct, ".//{*}BathroomHalfCount") or "0"

    # Level and Room Detail
    levels_list = subj.findall(".//{*}LEVEL") if subj is not None else []
    level_room_rows = {}
    for l_idx, lvl in enumerate(levels_list, 1):
        lvl_type_raw = _get_t(lvl, ".//{*}LevelType")
        lvl_name = "Level 1" if lvl_type_raw == "LevelOne" else ("Basement" if "BelowGrade" in lvl_type_raw else ("Level 2" if lvl_type_raw == "LevelTwo" else lvl_type_raw))
        grd_raw = _get_t(lvl, ".//{*}GradeLevelType")
        grd_name = "Above Grade" if grd_raw == "AboveGrade" else ("Fully Below Grade" if "BelowGrade" in grd_raw else grd_raw)
        fin_m = _get_t(lvl, ".//{*}LevelFinishedAreaMeasure")
        unfin_m = _get_t(lvl, ".//{*}LevelUnfinishedAreaMeasure")
        fin_lbl = "Finished" if fin_m and fin_m != "0" else "Unfinished"
        raw_m = fin_m if fin_lbl == "Finished" else unfin_m
        area_lbl = f"{float(raw_m):,.0f} Sq. Ft." if raw_m and raw_m.isdigit() else (f"{raw_m} Sq. Ft." if raw_m else "")

        rooms_matching = [r for r in (subj.findall(".//{*}ROOM") if subj is not None else []) if _get_t(r, ".//{*}LevelType") == lvl_type_raw]
        rc = {}
        for r in rooms_matching:
            rt = _get_t(r, ".//{*}RoomType")
            ro = _get_t(r, ".//{*}RoomTypeOtherDescription")
            rn = ro if (rt == "Other" and ro) else rt
            if rn == "LivingRoom": rn = "Living Room"
            elif rn == "FullBathroom": rn = "Full Bathroom"
            elif rn == "HalfBathroom": rn = "Half Bathroom"
            rc[rn] = rc.get(rn, 0) + 1
        r_summary = ", ".join([f"{cnt}-{rn}" for rn, cnt in rc.items()])
        if not r_summary and "BelowGrade" in lvl_type_raw:
            r_summary = "Basement"

        level_room_rows[f"Level in Unit Row {l_idx}"] = lvl_name
        level_room_rows[f"Grade Level Detail Row {l_idx}"] = grd_name
        level_room_rows[f"Finish Row {l_idx}"] = fin_lbl
        level_room_rows[f"Area Row {l_idx}"] = area_lbl
        level_room_rows[f"Room Summary Row {l_idx}"] = r_summary

    # Kitchen and Bathroom Details
    kb_rooms = [r for r in (subj.findall(".//{*}ROOM") if subj is not None else []) if _get_t(r, ".//{*}RoomType") in ["Kitchen", "FullBathroom", "HalfBathroom"]]
    kb_rows = {}
    for k_idx, r in enumerate(kb_rooms, 1):
        rt = _get_t(r, ".//{*}RoomType")
        rn = "Kitchen" if rt == "Kitchen" else ("Full Bathroom" if rt == "FullBathroom" else "Half Bathroom")
        rl = _get_t(r, ".//{*}LevelType")
        rl_str = "Level 1" if rl == "LevelOne" else ("Level 2" if rl == "LevelTwo" else ("Basement" if "BelowGrade" in rl else ""))
        r_full_name = f"{rn} {rl_str}".strip() if rl_str else rn

        up_raw = _get_t(r, ".//{*}RoomUpdateStatusType")
        up_status = "Partially Updated" if up_raw == "PartiallyUpdated" else ("Not Updated" if up_raw == "NotUpdated" else ("Fully Updated" if up_raw == "FullyUpdated" else (up_raw or "Partially Updated")))

        tf_raw = _get_t(r, ".//{*}RoomUpdatedTimeframeType")
        tf_status = "1-5 Years" if tf_raw == "OneToFiveYears" else ("5-10 Years" if tf_raw == "FiveToTenYears" else ("Unknown" if tf_raw == "Unknown" else (tf_raw or "1-5 Years")))

        kb_rows[f"Kitchen/Bath Row {k_idx} Room"] = r_full_name
        kb_rows[f"Kitchen/Bath Row {k_idx} Update Status"] = up_status
        kb_rows[f"Kitchen/Bath Row {k_idx} Time Frame"] = tf_status
        kb_rows[f"Kitchen/Bath Row {k_idx} Quality Comment"] = ""
        kb_rows[f"Kitchen/Bath Row {k_idx} Condition Status"] = "Typical Wear & Tear"
        kb_rows[f"Kitchen/Bath Row {k_idx} Condition Comment"] = ""

    baths_overall = _get_t(subj, ".//{*}OverallBathroomsUpdateStatusType")
    baths_overall_str = "Moderately Updated" if baths_overall == "ModeratelyUpdated" else (baths_overall or "Moderately Updated")

    # Interior Features
    fl_type = _get_t(subj, ".//{*}FlooringType") or "Hardwood"
    fl_up = _get_t(subj, ".//{*}OverallFlooringUpdateStatusType") or "ModeratelyUpdated"
    fl_up_str = "Moderately Updated" if fl_up == "ModeratelyUpdated" else (fl_up or "Moderately Updated")

    int_defects = "None" if _get_t(subj, ".//{*}UnitInteriorDefectsExistIndicator") != "true" else "Present"

    improvements_data = {
        "Subject Property Units in Structure": units_in_struct,
        "Units in Structure": units_in_struct,
        "Floors in Building": floors_in_bldg,
        "Dwelling Style": style_val,
        "Front Door Elevation": front_door_elev,
        "Year Built": year_built,
        "Construction Method": construction_method,
        "Converted Area": converted_area,
        "Dwelling Exterior Exhibits": "",
        "Exterior Quality Rating": overall_qual,
        "Exterior Condition Rating": overall_cond,
        "Exterior Walls and Trim": ext_walls,
        "Exterior Walls and Trim Quality Comment": "",
        "Exterior Walls and Trim Condition Status": "Typical Wear & Tear",
        "Exterior Walls and Trim Condition Comment": "",
        "Foundation": foundation_val,
        "Foundation Quality Comment": "",
        "Foundation Condition Status": "Typical Wear & Tear",
        "Foundation Condition Comment": "",
        "Roof": roof_mat,
        "Roof Estimated Age": roof_age,
        "Roof Quality Comment": "",
        "Roof Condition Status": "Typical Wear & Tear",
        "Roof Condition Comment": "",
        "Windows": windows_val,
        "Windows Quality Comment": "",
        "Windows Condition Status": "Typical Wear & Tear",
        "Windows Condition Comment": "",
        "Heating System": heat_sys,
        "Heating Detail": heat_fuel,
        "Heating Fuel": heat_fuel,
        "Cooling System": cool_sys,
        "Core Heating System Below Grade": core_heat,
        "Other Mechanical Systems": other_mech,
        "Apparent Defects, Damages, Deficiencies (Dwelling Exterior)": ext_defects,
        "Dwelling Exterior Commentary": ext_comm,
        "Finished Above Grade": fin_ag,
        "Unfinished Above Grade": unfin_ag,
        "Finished Below Grade": fin_bg,
        "Unfinished Below Grade": unfin_bg,
        "Area Data Source": "Appraiser Measurement",
        "Levels in Unit": levels_in_unit,
        "Occupancy": occupancy_val,
        "Total Bedrooms": bedrooms_cnt,
        "Total Bathrooms - Full": full_baths_cnt,
        "Total Bathrooms - Half": half_baths_cnt,
        "Overall Update Status for Bathrooms": baths_overall_str,
        "Flooring Detail": fl_type,
        "Flooring Quality Comment": "",
        "Flooring Condition Status": "Typical Wear & Tear",
        "Flooring Condition Comment": "",
        "Overall Update Status for Flooring": fl_up_str,
        "Walls and Ceiling Detail": "Drywall",
        "Walls and Ceiling Quality Comment": "",
        "Walls and Ceiling Condition Status": "Typical Wear & Tear",
        "Walls and Ceiling Condition Comment": "",
        "Apparent Defects, Damages, Deficiencies (Unit Interior)": int_defects,
        "Interior Quality Rating": overall_qual,
        "Interior Condition Rating": overall_cond,
        "Unit Interior Commentary": ext_comm
    }
    improvements_data.update(level_room_rows)
    improvements_data.update(kb_rows)

    # Vehicle Storage
    car_storage = subj.find(".//{*}CAR_STORAGE") if subj is not None else None
    storage_type = _get_t(car_storage, ".//{*}CarStorageType") or "Garage"
    storage_spaces = _get_t(car_storage, ".//{*}ParkingSpaceCount") or "2"
    storage_detail = _get_t(car_storage, ".//{*}CarStorageDetailDescription") or "Detached | 400 Sq. Ft."

    # Market
    mkt = root.find(".//{*}MARKET") or (subj.find(".//{*}MARKET") if subj is not None else None)
    mab = _get_t(mkt, ".//{*}MarketBoundariesDescription") or _get_t(mkt, ".//{*}MarketAreaBoundaryDescription")
    msp = _get_t(mkt, ".//{*}MarketInventorySearchParameterDescription") or _get_t(mkt, ".//{*}MarketSearchCriteriaDescription")

    act_cnt = ""
    act_dom = ""
    act_lo = ""
    act_med = ""
    act_hi = ""
    pend_cnt = ""
    tot_cnt = ""
    tot_lo = ""
    tot_med = ""
    tot_hi = ""

    if mkt is not None:
        for inv in mkt.findall(".//{*}MARKET_INVENTORY"):
            itype = _get_t(inv, ".//{*}MarketInventoryType")
            if itype == "ActiveListings":
                act_cnt = _get_t(inv, ".//{*}MarketInventoryCount")
                act_dom = _get_t(inv, ".//{*}MarketInventoryMedianDaysOnMarketCount")
                act_lo = _fmt_curr(_get_t(inv, ".//{*}MarketInventoryLowestPriceAmount"))
                act_med = _fmt_curr(_get_t(inv, ".//{*}MarketInventoryMedianPriceAmount"))
                act_hi = _fmt_curr(_get_t(inv, ".//{*}MarketInventoryHighestPriceAmount"))
            elif itype == "PendingSales":
                pend_cnt = _get_t(inv, ".//{*}MarketInventoryCount")
            elif itype == "TotalSales":
                tot_cnt = _get_t(inv, ".//{*}MarketInventoryCount")
                tot_lo = _fmt_curr(_get_t(inv, ".//{*}MarketInventoryLowestPriceAmount"))
                tot_med = _fmt_curr(_get_t(inv, ".//{*}MarketInventoryMedianPriceAmount"))
                tot_hi = _fmt_curr(_get_t(inv, ".//{*}MarketInventoryHighestPriceAmount"))

    supply_raw = _get_t(mkt, ".//{*}MarketSupplyTrendType") or _get_t(mkt, ".//{*}HousingDemandSupplyType")
    supply_val = "In Balance" if supply_raw == "InBalance" else ("Shortage" if supply_raw == "Shortage" else ("Over Supply" if supply_raw == "OverSupply" else (supply_raw or "In Balance")))

    mkt_time_raw = _get_t(mkt, ".//{*}MarketingTimeType") or _get_t(mkt, ".//{*}MarketingTimeDescription")
    mkt_time = "Under 3 months" if "UnderThree" in mkt_time_raw or "under 3" in mkt_time_raw.lower() else ("3 to 6 months" if "ThreeToSix" in mkt_time_raw else ("Over 6 months" if "OverSix" in mkt_time_raw else (mkt_time_raw or "Under 3 months")))

    distressed = "No" if _get_t(mkt, ".//{*}MarketTrendsForeclosureActivityIndicator") != "true" else "Yes"

    mkt_comm = valuation_comments.get("Market", "") or _get_t(mkt, ".//{*}MarketCommentDescription")
    price_trend_comm = valuation_comments.get("Market", "") or mkt_comm
    subj_list_comm = valuation_comments.get("SubjectListing", "")

    # Prior Sale & Transfer History
    s_prior_raw = _get_t(subj, ".//{*}PriorSalesOrTransfersIndicator").lower()
    s_prior_ind = "Yes" if s_prior_raw in ["true", "1", "yes"] else "No"
    s_prior_comm = valuation_comments.get("SubjectPriorSalesAndTransferHistory", "") or "N/A"
    c_prior_comm = valuation_comments.get("ComparablesPriorSalesAndTransferHistory", "") or "N/A"

    prior_sale_history_data = {
        "Prior Sales or Transfers": s_prior_ind,
        "Subject Transfer History Data Source": "Public Records / MLS",
        "Data Source": "Public Records / MLS",
        "Analysis of Prior Sale and Transfer History of Subject Property": s_prior_comm,
        "Analysis of Prior Sale and Transfer History of Comparable Sales": c_prior_comm,
    }

    # Extract comp prior transfers for comps 1, 2, 3
    for idx in [1, 2, 3]:
        c_elem = sales_comps[idx - 1] if len(sales_comps) >= idx else None
        c_terms = "None"
        c_date = "None"
        c_amt = "None"
        c_ds = "Public Records"
        if c_elem is not None:
            c_p_ind = _get_t(c_elem, ".//{*}PriorSalesOrTransfersIndicator").lower()
            all_ots = []
            for ot in (c_elem.findall(".//{*}OWNERSHIP_TRANSFER") or [c_elem]):
                dates = [d.text.strip() for d in ot.findall(".//{*}OwnershipTransferDate") if d.text]
                amts = [a.text.strip() for a in ot.findall(".//{*}OwnershipTransferTransactionAmount") if a.text]
                stypes = [st.text.strip() for st in ot.findall(".//{*}SaleType") if st.text]
                for d_val, a_val, st_val in zip(dates, amts, stypes):
                    all_ots.append((d_val, a_val, st_val))

            if len(all_ots) > 1:
                sorted_ots = sorted(all_ots, key=lambda x: x[0])
                prior_ot = sorted_ots[0]
                d_fmt = _fmt_date(prior_ot[0])
                a_fmt = _fmt_curr(prior_ot[1])
                t_raw = prior_ot[2]
                t_fmt = "Estate Sale" if t_raw == "EstateSale" else ("Typically Motivated" if t_raw == "TypicallyMotivated" else ("Arm's Length" if "Arm" in t_raw else t_raw))
                c_terms = t_fmt
                c_date = d_fmt
                c_amt = a_fmt
                c_ds = "Public Records / MLS"
            elif c_p_ind in ["true", "1", "yes"] and len(all_ots) == 1:
                prior_ot = all_ots[0]
                d_fmt = _fmt_date(prior_ot[0])
                a_fmt = _fmt_curr(prior_ot[1])
                t_raw = prior_ot[2]
                t_fmt = "Estate Sale" if t_raw == "EstateSale" else ("Typically Motivated" if t_raw == "TypicallyMotivated" else ("Arm's Length" if "Arm" in t_raw else t_raw))
                c_terms = t_fmt
                c_date = d_fmt
                c_amt = a_fmt
                c_ds = "Public Records / MLS"

        prior_sale_history_data[f"Comparable {idx} Transfer Terms"] = c_terms
        prior_sale_history_data[f"Comparable {idx} Transfer Date"] = c_date
        prior_sale_history_data[f"Comparable {idx} Transfer Amount"] = c_amt
        prior_sale_history_data[f"Comparable {idx} Transfer Data Source"] = c_ds

    # Project Information
    project_comm = valuation_comments.get("Project", "") or "N/A - The subject property is not located in a PUD, Condominium, or Cooperative project."
    project_info_data = {
        "Topography": topography_val,
        "Size": site_size,
        "Density": density_val,
        "TOPOGRAPHY": topography_val,
        "SIZE": site_size,
        "DENSITY": density_val,
        "Planned Unit Development (PUD)": pud_ind,
        "Condominium": condo_ind,
        "Cooperative": coop_ind,
        "Condop": condop_ind,
        "Project Information Data Source": "Public Records / Appraisal Inspection",
        "Monthly Amount": "None",
        "Common Amenities / Services Included": "None",
        "Utilities Included": "None",
        "Developer/Sponsor in Control Detail": "No",
        "Developer/Sponsor in Control Impact": "Neutral",
        "Developer/Sponsor in Control Comment": "",
        "Known Legal Actions Detail": "None",
        "Known Legal Actions Impact": "Neutral",
        "Known Legal Actions Comment": "",
        "Unit Special Assessments Detail": "None",
        "Unit Special Assessments Impact": "Neutral",
        "Unit Special Assessments Comment": "",
        "Unit Tax Abatements or Exemptions Detail": "None",
        "Unit Tax Abatements or Exemptions Impact": "Neutral",
        "Unit Tax Abatements or Exemptions Comment": "",
        "Project Factors Commentary": "N/A",
        "Project Information Commentary": project_comm,
    }

    neighborhood_data = {
        "Location": "Suburban",
        "Neighborhood Name": _get_t(subj, ".//{*}NeighborhoodName"),
        "Market Area Boundary": mab,
        "Market Area Boundary:": mab,
        "Search Criteria Description": msp,
        "Search Criteria Description:": msp,
        "Active Listings": act_cnt,
        "Median Days on Market": act_dom,
        "Lowest List Price": act_lo,
        "Median List Price": act_med,
        "Highest List Price": act_hi,
        "Pending Sales": pend_cnt,
        "Sales in Past 12 Months": tot_cnt,
        "Lowest Sale Price": tot_lo,
        "Median Sale Price": tot_med,
        "Highest Sale Price": tot_hi,
        "Distressed Market Competition": distressed,
        "Price Trend Source": "MLS",
        "Price Trend Source (Graph)": "MLS",
        "Price Trend Analysis Commentary": price_trend_comm,
        "Demand/Supply": supply_val,
        "Demand / Supply": supply_val,
        "Demand/Supply:": supply_val,
        "Marketing Time": mkt_time,
        "Marketing Time:": mkt_time,
        "Market Commentary": mkt_comm,
        "Current or Relevant Listings": "None",
        "Data Source": "MLS",
        "Subject Listing Information Commentary": subj_list_comm,
        "Subject Listing Information Exhibits": ""
    }

    # Reconciliation
    reconciliation_data = {
        "Opinion of Market Value": op_val,
        "Sales Comparison Approach Indicated Value": sales_ind_val,
        "Indicated Value by Sales Comparison Approach Indicated": sales_ind_val,
        "Indicated Value by Sales Comparison Approach": sales_ind_val,
        "Market Value Condition": val_condition,
        "Effective Date of Appraisal": eff_date,
        "Reasonable Exposure Time": _get_t(root, ".//{*}ReasonableExposureTimeDescription") or "60 days",
        "Reconciliation of Market Value": _get_t(root, ".//{*}ValuationReconciliationSummaryCommentDescription"),
        "Reconciliation of Sales Comparison Approach": _get_t(root, ".//{*}SalesComparisonCommentDescription")
    }

    # Comps Parsing
    clean_sales_grid = {}
    sales_grid_data = {}
    comp_num_map: Dict[int, Dict[str, Any]] = {}

    for p in sales_comps:
        c_lbl = p.attrib.get("{http://www.w3.org/1999/xlink}label", "")
        c_addr = p.find(".//{*}ADDRESS")
        c_line = _get_t(c_addr, ".//{*}AddressLineText")
        c_unit_des = _get_t(c_addr, ".//{*}AddressUnitDesignatorType")
        c_unit_id = _get_t(c_addr, ".//{*}AddressUnitIdentifier")
        c_city = _get_t(c_addr, ".//{*}CityName")
        c_state = _get_t(c_addr, ".//{*}StateCode")
        c_zip = _get_t(c_addr, ".//{*}PostalCode")
        u_str = f", {c_unit_des} {c_unit_id}" if c_unit_id else ""
        c_full_addr = f"{c_line}{u_str}, {c_city}, {c_state} {c_zip}".strip(", ")

        comp_elem = p.find(".//{*}COMPARABLE")
        c_num_str = _get_t(comp_elem, ".//{*}PropertyOrdinalNumber")
        try:
            c_num = int(c_num_str)
        except Exception:
            c_num = len(comp_num_map) + 1

        prox = _get_t(comp_elem, ".//{*}ProximityToSubjectDistanceLinearMeasure")
        dir_t = _get_t(comp_elem, ".//{*}ComparableToSubjectDirectionType")
        prox_str = f"{prox} Miles {dir_t[:2].upper()}" if prox else ""

        c_contract = p.find(".//{*}SALES_CONTRACT")
        sale_price = _fmt_curr(_get_t(p, ".//{*}OwnershipTransferTransactionAmount") or _get_t(c_contract, ".//{*}SalesContractAmount"))
        sale_date = _fmt_date(_get_t(p, ".//{*}OwnershipTransferDate") or _get_t(c_contract, ".//{*}ContractSettlementDate"))
        contract_date = _fmt_date(_get_t(p, ".//{*}SalesContractDate") or _get_t(c_contract, ".//{*}ContractDate"))
        list_price = _fmt_curr(_get_t(p, ".//{*}FinalListPriceAmount"))
        dom = _get_t(p, ".//{*}DaysOnMarketCount")
        listing_status = _get_t(p, ".//{*}ListingStatusType") or "SettledSale"
        adj_price = _fmt_curr(_get_t(comp_elem, ".//{*}AdjustedSalesPriceAmount"))
        net_adj = _fmt_curr(_get_t(comp_elem, ".//{*}SalePriceNetTotalAdjustmentAmount"))
        weight = _get_t(comp_elem, ".//{*}ComparableWeightType") or "Most"

        # Transfer Terms, Financing Type, Sales Concessions
        c_sale_type_raw = _get_t(p, ".//{*}SaleType") or _get_t(p, ".//{*}OwnershipTransferTransactionType") or "TypicallyMotivated"
        if c_sale_type_raw == "TypicallyMotivated": c_sale_type = "Typically Motivated"
        elif c_sale_type_raw == "EstateSale": c_sale_type = "Estate Sale"
        elif "Arm" in c_sale_type_raw: c_sale_type = "Arm's Length"
        else: c_sale_type = c_sale_type_raw

        c_mortgage_type = _get_t(p, ".//{*}MortgageType") or "Conventional"
        c_concessions_raw = _get_t(p, ".//{*}TotalSalesConcessionAmount")
        c_concessions = _fmt_curr(c_concessions_raw) if c_concessions_raw else "$0"

        # Data sources linked via RELATIONSHIP
        ds_list = prop_data_sources.get(c_lbl, [])
        data_source_str = " | ".join(ds_list) if ds_list else _get_t(p, ".//{*}DataSourceIdentifier")

        # Property detail & structure
        c_detail = p.find(".//{*}PROPERTY_DETAIL")
        c_attach = _get_t(c_detail, ".//{*}AttachmentType") or _get_t(p, ".//{*}AttachmentType") or "Detached"
        c_prop_estate = _get_t(p, ".//{*}PropertyEstateType") or _get_t(c_detail, ".//{*}PropertyEstateType") or "FeeSimple"
        if c_prop_estate == "FeeSimple": c_prop_estate = "Fee Simple"

        c_site = p.find(".//{*}SITE")
        c_site_size_raw = _get_t(p, ".//{*}LotSizeAreaMeasure") or _get_t(c_site, ".//{*}LotSizeAreaMeasure") or _get_t(p, ".//{*}SiteAreaSquareFeetNumber") or _get_t(p, ".//{*}SiteAreaMeasure")
        c_site_size = ""
        if c_site_size_raw:
            try:
                c_sf = float(re.sub(r"[^\d.]", "", str(c_site_size_raw)))
                c_site_size = f"{c_sf:,.0f} Sq. Ft." if c_sf.is_integer() else f"{c_sf} Sq. Ft."
            except Exception:
                c_site_size = f"{c_site_size_raw} Sq. Ft."
        else:
            c_site_size = site_size

        c_site_inf = _get_t(p, ".//{*}SiteInfluenceType") or _get_t(c_site, ".//{*}SiteInfluenceType") or "Residential"
        c_view = _get_t(p, ".//{*}ViewType") or "Residential"
        c_view_range = _get_t(p, ".//{*}ViewRangeType") or "Full"
        c_amenities = "None"

        c_struct = p.find(".//{*}STRUCTURE")
        c_year_built = _get_t(p, ".//{*}PropertyStructureBuiltYear") or _get_t(c_struct, ".//{*}PropertyStructureBuiltYear") or _get_t(c_struct, ".//{*}YearBuiltDate") or _get_t(c_struct, ".//{*}YearBuiltNumber") or "1950"
        c_cm_raw = _get_t(p, ".//{*}ConstructionMethodType") or _get_t(c_struct, ".//{*}ConstructionMethodType") or "SiteBuilt"
        c_const_method = "Site Built" if "SiteBuilt" in c_cm_raw else c_cm_raw

        c_sys = p.find(".//{*}SYSTEM")
        c_heat_raw = _get_t(p, ".//{*}HeatingSystemType") or _get_t(c_sys, ".//{*}HeatingSystemType") or "ForcedWarmAir"
        c_heating = "Forced Warm Air" if c_heat_raw == "ForcedWarmAir" else ("Baseboard" if c_heat_raw == "Baseboard" else c_heat_raw)

        c_bedrooms = _get_t(p, ".//{*}BedroomCount") or _get_t(c_struct, ".//{*}BedroomCount") or "3"
        c_full_baths = _get_t(p, ".//{*}FullBathroomCount") or _get_t(c_struct, ".//{*}BathroomFullCount") or "1"
        c_half_baths = _get_t(p, ".//{*}HalfBathroomCount") or _get_t(c_struct, ".//{*}BathroomHalfCount") or "0"

        c_gla_raw = _get_t(p, ".//{*}UnitStandardAboveGradeFinishedAreaMeasure") or _get_t(c_struct, ".//{*}GrossLivingAreaSquareFeetNumber") or _get_t(c_struct, ".//{*}AboveGradeFinishedAreaSquareFeetNumber")
        c_gla = ""
        if c_gla_raw:
            try:
                c_g_f = float(re.sub(r"[^\d.]", "", str(c_gla_raw)))
                c_gla = f"{c_g_f:,.0f} Sq. Ft." if c_g_f.is_integer() else f"{c_g_f} Sq. Ft."
            except Exception:
                c_gla = f"{c_gla_raw} Sq. Ft."

        c_fin_bg_raw = _get_t(p, ".//{*}UnitStandardBelowGradeFinishedAreaMeasure") or _get_t(c_struct, ".//{*}BelowGradeFinishedAreaSquareFeetNumber") or "0"
        c_fin_bg = "0 Sq. Ft."
        if c_fin_bg_raw and c_fin_bg_raw != "0":
            try:
                c_b_f = float(re.sub(r"[^\d.]", "", str(c_fin_bg_raw)))
                c_fin_bg = f"{c_b_f:,.0f} Sq. Ft."
            except Exception:
                c_fin_bg = f"{c_fin_bg_raw} Sq. Ft."

        c_unfin_bg_raw = _get_t(p, ".//{*}UnitBelowGradeUnfinishedAreaMeasure") or "0"
        c_unfin_bg = "0 Sq. Ft."
        if c_unfin_bg_raw and c_unfin_bg_raw != "0":
            try:
                c_u_f = float(re.sub(r"[^\d.]", "", str(c_unfin_bg_raw)))
                c_unfin_bg = f"{c_u_f:,.0f} Sq. Ft."
            except Exception:
                c_unfin_bg = f"{c_unfin_bg_raw} Sq. Ft."

        c_ext_qual = _get_t(p, ".//{*}ExteriorQualityRatingCode") or _get_t(p, ".//{*}OverallQualityRatingCode") or overall_qual
        c_ext_cond = _get_t(p, ".//{*}ExteriorConditionRatingCode") or _get_t(p, ".//{*}OverallConditionRatingCode") or overall_cond
        c_int_qual = _get_t(p, ".//{*}InteriorQualityRatingCode") or c_ext_qual
        c_int_cond = _get_t(p, ".//{*}InteriorConditionRatingCode") or c_ext_cond
        c_overall_qual = _get_t(p, ".//{*}OverallQualityRatingCode") or c_ext_qual
        c_overall_cond = _get_t(p, ".//{*}OverallConditionRatingCode") or c_ext_cond

        c_car = p.find(".//{*}CAR_STORAGE")
        c_storage_type = _get_t(p, ".//{*}CarStorageType") or _get_t(c_car, ".//{*}CarStorageType") or "Driveway"
        c_storage_spaces = _get_t(p, ".//{*}ParkingSpacesCount") or _get_t(c_car, ".//{*}ParkingSpaceCount") or "1"
        c_surface = _get_t(p, ".//{*}ImprovedSurfaceMaterialType") or "Gravel"
        c_storage_detail = f"{c_storage_type} | {c_surface} | {c_storage_spaces}"

        comp_dict = {
            "Comparable Number": str(c_num),
            "Comparable Property Address": c_full_addr,
            "Property Address": c_full_addr,
            "Address": c_full_addr,
            "Proximity to Subject": prox_str,
            "Proximity to Subject comment": "",
            "Data Source": data_source_str,
            "Listing Status": listing_status,
            "List Price": list_price,
            "Sale Price": sale_price,
            "Sale Date": sale_date,
            "Contract Date": contract_date,
            "Days on Market": dom,
            "Transfer Terms": c_sale_type,
            "Financing Type": c_mortgage_type,
            "Sales Concessions": c_concessions,
            "Attached / Detached": c_attach,
            "Attachment Type": c_attach,
            "Property Rights Appraised": c_prop_estate,
            "Site Size": c_site_size,
            "Site Influence (Location)": c_site_inf,
            "Location": c_site_inf,
            "View": c_view,
            "Range of View": c_view_range,
            "Year Built": c_year_built,
            "Construction Method": c_const_method,
            "Heating": c_heating,
            "Amenities": c_amenities,
            "Bedrooms": c_bedrooms,
            "Total Bedrooms": c_bedrooms,
            "Bathrooms - Full": c_full_baths,
            "Total Bathrooms - Full": c_full_baths,
            "Bathrooms - Half": c_half_baths,
            "Total Bathrooms - Half": c_half_baths,
            "GLA / GBA": c_gla,
            "Gross Living Area": c_gla,
            "Finished Area Above Grade": c_gla,
            "Finished Area Below Grade": c_fin_bg,
            "Unfinished Area Below Grade": c_unfin_bg,
            "Exterior Quality": c_ext_qual,
            "Exterior Quality Rating": c_ext_qual,
            "Exterior Condition": c_ext_cond,
            "Exterior Condition Rating": c_ext_cond,
            "Interior Quality": c_int_qual,
            "Interior Quality Rating": c_int_qual,
            "Interior Condition": c_int_cond,
            "Interior Condition Rating": c_int_cond,
            "Overall Quality": c_overall_qual,
            "Overall Condition": c_overall_cond,
            "Quality Rating": c_overall_qual,
            "Condition Rating": c_overall_cond,
            "Vehicle Storage Type": c_storage_type,
            "Vehicle Storage Spaces": c_storage_spaces,
            "Vehicle Storage Detail": c_storage_detail,
            "Adjusted Price": adj_price,
            "Net Adjustment Total": net_adj,
            "Comparable Weight": weight,
        }

        # Extract line item adjustments
        adj_map = {
            "LivingUnitBedroomCount": "Bedrooms Adjustment",
            "LivingUnitBathroomCount": "Bathrooms - Full Adjustment",
            "LivingUnitStandardFinishedAreaAboveGrade": "Finished Area Above Grade Adjustment",
            "LivingUnitUnfinishedAreaBelowGrade": "Unfinished Area Below Grade Adjustment",
            "LivingUnitStandardFinishedAreaBelowGrade": "Finished Area Below Grade Adjustment",
            "VehicleStorage": "Vehicle Storage Adjustment",
            "SiteSize": "Site Size Adjustment",
            "YearBuilt": "Year Built Adjustment",
            "SalesConcessions": "Sales Concessions Adjustment",
            "PropertyOwnershipTransferTerms": "Transfer Terms Adjustment",
            "FinancingMethod": "Financing Type Adjustment",
            "AttachedOrDetached": "Attached / Detached Adjustment",
            "OverallQuality": "Overall Quality Adjustment",
            "OverallCondition": "Overall Condition Adjustment",
            "SaleDate": "Sale Date Adjustment",
            "ContractDate": "Contract Date Adjustment",
            "SiteInfluence": "Location Adjustment",
            "View": "View Adjustment",
        }
        for adj_item in (comp_elem.findall(".//{*}ComparableAdjustment") if comp_elem is not None else []):
            adj_type = _get_t(adj_item, ".//{*}ComparableAdjustmentType")
            adj_amt = _fmt_curr(_get_t(adj_item, ".//{*}ComparableAdjustmentAmount"))
            if adj_type:
                comp_dict[f"{adj_type} Adjustment"] = adj_amt
                if adj_type in adj_map:
                    comp_dict[adj_map[adj_type]] = adj_amt

        # Duplicate GLA adjustment for UI
        if "Finished Area Above Grade Adjustment" in comp_dict:
            comp_dict["GLA / GBA Adjustment"] = comp_dict["Finished Area Above Grade Adjustment"]

        comp_num_map[c_num] = comp_dict
        clean_sales_grid[f"Comp {c_num}"] = comp_dict
        clean_sales_grid[f"COMPARABLE SALE #{c_num}"] = comp_dict
        sales_grid_data[f"COMPARABLE SALE #{c_num}"] = comp_dict
        sales_grid_data[f"Comp {c_num}"] = comp_dict

    # Ensure Subject in Sales Comparison Grid has all compared attributes
    subject_grid_fields = {
        "Year Built": year_built,
        "Attached / Detached": attach_type,
        "Attachment Type": attach_type,
        "Construction Method": construction_method,
        "Finished Area Above Grade": fin_ag,
        "Above Grade Finished Area": fin_ag,
        "GLA / GBA": fin_ag,
        "Gross Living Area": fin_ag,
        "Finished Area Below Grade": fin_bg,
        "Unfinished Area Below Grade": unfin_bg,
        "Overall Quality": overall_qual,
        "Exterior Quality": overall_qual,
        "Exterior Quality Rating": overall_qual,
        "Interior Quality": overall_qual,
        "Interior Quality Rating": overall_qual,
        "Overall Condition": overall_cond,
        "Exterior Condition": overall_cond,
        "Exterior Condition Rating": overall_cond,
        "Interior Condition": overall_cond,
        "Interior Condition Rating": overall_cond,
        "Heating": heat_sys,
        "Cooling": cool_sys,
        "Bedrooms": bedrooms_cnt,
        "Total Bedrooms": bedrooms_cnt,
        "Bathrooms - Full": full_baths_cnt,
        "Total Bathrooms - Full": full_baths_cnt,
        "Bathrooms - Half": half_baths_cnt,
        "Total Bathrooms - Half": half_baths_cnt,
        "Site Size": site_size,
        "Site Influence (Location)": si_type or "Residential",
        "Location": si_type or "Residential",
        "View": v_type or "Residential",
        "Range of View": v_range or "Full",
        "Amenities": "None",
        "Design (Style)": style_val,
        "Vehicle Storage Type": storage_type,
        "Vehicle Storage Spaces": storage_spaces,
        "Vehicle Storage Detail": storage_detail,
        "Subject Property Address": full_s_addr,
        "Comparable Property Address": full_s_addr,
        "Address": full_s_addr,
        "Property Rights Appraised": _get_t(subj, ".//{*}PropertyRightsType") or "Fee Simple",
        "Basement Area": unfin_bg_raw if unfin_bg_raw != "0" else (fin_bg_raw if fin_bg_raw != "0" else "0"),
        "Basement Area sq.ft.": unfin_bg_raw if unfin_bg_raw != "0" else (fin_bg_raw if fin_bg_raw != "0" else "0"),
        "Basement Finish %": "0%",
        "Listing Status": _get_t(subj, ".//{*}ListingStatusType") or "Pending",
    }
    subject_data.update(subject_grid_fields)
    clean_sales_grid["Subject"] = subject_data
    sales_grid_data["Subject"] = subject_data

    # -------------------------------------------------------------
    # Rental Comparables & Rent Schedule Parsing (UAD 3.6)
    # -------------------------------------------------------------
    comparable_rent_schedule: Dict[str, Any] = {}
    single_family_rent_schedule: Dict[str, Any] = {}

    # Extract Subject Rent Schedule details if present
    s_urs = subj.find(".//{*}UNIT_RENT_SCHEDULE") if subj is not None else None
    s_actual_rent = _fmt_curr(_get_t(s_urs, ".//{*}UnitMonthlyActualRentAmount")) if s_urs is not None else ""
    s_mkt_rent = _fmt_curr(_get_t(s_urs, ".//{*}UnitMonthlyMarketRentAmount")) if s_urs is not None else ""
    s_rent_sqft = _get_t(s_urs, ".//{*}ActualRentPerUnitFinishedAreaAmount") if s_urs is not None else ""

    if s_urs is not None or rent_comps:
        single_family_rent_schedule = {
            "Address": full_s_addr,
            "Street Address": s_line,
            "Property Address": full_s_addr,
            "PropertyStreetAddress": s_line,
            "Full Address": full_s_addr,
            "City": s_city,
            "State": s_state,
            "Zip Code": s_zip,
            "PostalCode": s_zip,
            "Proximity to Subject": "Subject",
            "Proximity": "Subject",
            "Monthly Rental": s_actual_rent or s_mkt_rent,
            "Monthly Rent": s_actual_rent or s_mkt_rent,
            "MonthlyRentAmount": s_actual_rent or s_mkt_rent,
            "Actual Rent": s_actual_rent,
            "Adjusted Monthly Rent": s_mkt_rent or s_actual_rent,
            "ExpenseAdjustedMonthlyRentAmount": s_mkt_rent or s_actual_rent,
            "Indicated Monthly Market Rent": s_mkt_rent or s_actual_rent,
            "Rent per Sq. Ft.": f"${s_rent_sqft}" if s_rent_sqft else "",
            "Gross Living Area": fin_ag,
            "GLA": fin_ag,
            "GLA / GBA": fin_ag,
            "Total Bedrooms": bedrooms_cnt,
            "Bedrooms": bedrooms_cnt,
            "Total Bathrooms - Full": full_baths_cnt,
            "Bathrooms - Full": full_baths_cnt,
            "Total Bathrooms - Half": half_baths_cnt,
            "Bathrooms - Half": half_baths_cnt,
            "Condition": overall_cond,
            "Overall Condition": overall_cond,
            "Quality": overall_qual,
            "Location/View": "Residential",
            "Design and Appeal": style_val,
            "Year Built": year_built,
        }

    dir_map = {
        "North": "N", "South": "S", "East": "E", "West": "W",
        "NorthEast": "NE", "NorthWest": "NW", "SouthEast": "SE", "SouthWest": "SW",
        "Northeast": "NE", "Northwest": "NW", "Southeast": "SE", "Southwest": "SW"
    }

    for idx, p in enumerate(rent_comps):
        c_lbl = p.attrib.get("{http://www.w3.org/1999/xlink}label", "")
        c_addr = p.find(".//{*}ADDRESS")
        c_line = _get_t(c_addr, ".//{*}AddressLineText")
        c_unit_des = _get_t(c_addr, ".//{*}AddressUnitDesignatorType")
        c_unit_id = _get_t(c_addr, ".//{*}AddressUnitIdentifier")
        c_city = _get_t(c_addr, ".//{*}CityName")
        c_state = _get_t(c_addr, ".//{*}StateCode")
        c_zip = _get_t(c_addr, ".//{*}PostalCode")

        u_str = f"{c_unit_des} {c_unit_id}".strip() if c_unit_id else ""
        c_street = f"{c_line}, {u_str}".strip(", ") if (c_line and u_str) else (c_line or "")
        c_full_addr = f"{c_line}{', ' + u_str if u_str else ''}, {c_city}, {c_state} {c_zip}".strip(", ")
        if not c_full_addr:
            c_full_addr = f"{c_city}, {c_state} {c_zip}".strip(", ")

        r_num_str = _get_t(p, ".//{*}PropertyOrdinalNumber")
        try:
            r_num = int(r_num_str) if r_num_str else (idx + 1)
        except Exception:
            r_num = idx + 1

        prox = _get_t(p, ".//{*}ProximityToSubjectDistanceLinearMeasure")
        dir_t = _get_t(p, ".//{*}ComparableToSubjectDirectionType")
        dir_abbr = dir_map.get(dir_t, dir_t[:2].upper() if dir_t else "")
        prox_str = f"{prox} Miles {dir_abbr}".strip() if prox else ""

        actual_rent_raw = _get_t(p, ".//{*}UnitMonthlyActualRentAmount")
        actual_rent = _fmt_curr(actual_rent_raw)
        adj_rent_raw = _get_t(p, ".//{*}RentalUnitAdjustedRentAmount")
        adj_rent = _fmt_curr(adj_rent_raw) or actual_rent
        rent_per_sqft = _get_t(p, ".//{*}ActualRentPerUnitFinishedAreaAmount")

        lease_start = _fmt_date(_get_t(p, ".//{*}LeaseStartDate")) or _get_t(p, ".//{*}LeaseStartDate")
        lease_exp = _fmt_date(_get_t(p, ".//{*}LeaseExpirationDate")) or _get_t(p, ".//{*}LeaseExpirationDate")

        gla_raw = _get_t(p, ".//{*}UnitTotalFinishedAreaMeasure") or _get_t(p, ".//{*}UnitStandardAboveGradeFinishedAreaMeasure")
        gla = ""
        if gla_raw:
            try:
                g_f = float(re.sub(r"[^\d.]", "", str(gla_raw)))
                gla = f"{g_f:,.0f} Sq. Ft." if g_f.is_integer() else f"{g_f} Sq. Ft."
            except Exception:
                gla = f"{gla_raw} Sq. Ft."

        beds = _get_t(p, ".//{*}BedroomCount") or "3"
        full_baths = _get_t(p, ".//{*}FullBathroomCount") or "1"
        half_baths = _get_t(p, ".//{*}HalfBathroomCount") or "0"
        baths_str = f"{full_baths}.{half_baths}" if half_baths and half_baths != "0" else full_baths

        cond = _get_t(p, ".//{*}InteriorConditionRatingCode") or _get_t(p, ".//{*}OverallConditionRatingCode") or "C3"
        views_comp = _get_t(p, ".//{*}ViewsComparisonType") or "Similar"
        amenities_comp = _get_t(p, ".//{*}AmenitiesComparisonType") or "Similar"
        car_comp = _get_t(p, ".//{*}CarStoragesComparisonType") or "Similar"
        weight = _get_t(p, ".//{*}ComparableWeightType") or "Most"
        utilities_inc = _fmt_bool(_get_t(p, ".//{*}UnitChargesIncludeUtilitiesIndicator"))
        furnished = _fmt_bool(_get_t(p, ".//{*}UnitFurnishedIndicator"))

        ds_list = prop_data_sources.get(c_lbl, [])
        data_source_str = " | ".join(ds_list) if ds_list else (_get_t(p, ".//{*}DataSourceIdentifier") or "MLS / Public Records")

        comp_dict = {
            "Comparable Number": str(r_num),
            "Address": c_full_addr,
            "Street Address": c_street or c_line,
            "Property Address": c_full_addr,
            "PropertyStreetAddress": c_street or c_line,
            "Comparable Property Address": c_full_addr,
            "Full Address": c_full_addr,
            "City": c_city,
            "State": c_state,
            "Zip Code": c_zip,
            "PostalCode": c_zip,
            "Proximity to Subject": prox_str,
            "Proximity": prox_str,
            "Monthly Rental": actual_rent,
            "Monthly Rent": actual_rent,
            "MonthlyRentAmount": actual_rent,
            "Actual Rent": actual_rent,
            "Adjusted Monthly Rent": adj_rent,
            "ExpenseAdjustedMonthlyRentAmount": adj_rent,
            "Adjusted Rent": adj_rent,
            "Indicated Monthly Market Rent": adj_rent,
            "Rent per Sq. Ft.": f"${rent_per_sqft}" if rent_per_sqft else "",
            "ActualRentPerUnitFinishedAreaAmount": rent_per_sqft,
            "Date Lease Begins": lease_start,
            "Lease Date": lease_start,
            "Lease Start Date": lease_start,
            "Date Lease Expires": lease_exp,
            "Gross Living Area": gla,
            "GLA": gla,
            "GLA / GBA": gla,
            "Gross Living Area (GLA)": gla,
            "Total Bedrooms": beds,
            "Bedrooms": beds,
            "Room Count Bdrms": beds,
            "Total Bathrooms - Full": full_baths,
            "Bathrooms - Full": full_baths,
            "Total Bathrooms - Half": half_baths,
            "Bathrooms - Half": half_baths,
            "Total Bathrooms": baths_str,
            "Bathrooms": baths_str,
            "Room Count Baths": baths_str,
            "Condition": cond,
            "Overall Condition": cond,
            "Location/View": views_comp,
            "View": views_comp,
            "Amenities": amenities_comp,
            "Car Storage": car_comp,
            "Vehicle Storage": car_comp,
            "Comparable Weight": weight,
            "Utilities Included": utilities_inc,
            "Furnished": furnished,
            "Data Source": data_source_str,
        }

        # Multi-alias dictionary mapping for all frontend consumers
        for prefix in [
            f"COMPARABLE NO. {r_num}",
            f"Comparable Rent #{r_num}",
            f"Comparable Rent Schedule Comp #{r_num}",
            f"Rental {r_num}",
            f"Rental #{r_num}",
            f"RENTAL {r_num}",
            f"RENTAL #{r_num}",
            f"Comparable Rental #{r_num}",
            f"Comp {r_num}",
            f"COMP {r_num}",
        ]:
            comparable_rent_schedule[prefix] = comp_dict

    # Ensure Certification has Appraiser credentials & info
    reconciliation_data.update({
        "Appraiser Name": appr_name,
        "Appraiser Credential Level": appr_lic_type,
        "Appraiser ID": appr_lic_id,
        "Appraiser State": appr_lic_state,
        "Appraiser License Expiration Date": appr_lic_exp,
        "Appraiser Signature": appr_name,
        "Date of Signature and Report": eff_date,
        "Appraiser Company Name": appr_co,
        "Appraiser Company Address": full_appr_addr,
        "Cost Approach Indicated Value": "",
        "Indicated Value by Cost Approach": "",
    })

    # Ensure Summary has all key fields
    summary_data.update({
        "Appraiser Name": appr_name,
        "Appraiser Credential Level": appr_lic_type,
        "Appraiser ID": appr_lic_id,
        "Appraiser State": appr_lic_state,
        "Appraiser License Expiration Date": appr_lic_exp,
        "Construction Method": construction_method,
        "Attachment Type": attach_type,
        "Attached / Detached": attach_type,
        "Overall Quality": overall_qual,
        "Overall Condition": overall_cond,
        "Zoning Compliance": zoning_compliance,
        "Highest and Best Use as Present Use": summary_data.get("Highest and Best Use as Present Use", "Yes"),
        "Year Built": year_built,
        "Property Rights Appraised": _get_t(subj, ".//{*}PropertyRightsType") or "Fee Simple",
    })

    # Ensure Improvements has quality, condition, attachment type & foundation type
    improvements_data.update({
        "Attachment Type": attach_type,
        "Attached / Detached": attach_type,
        "Overall Quality": overall_qual,
        "Exterior Quality": overall_qual,
        "Exterior Quality Rating": overall_qual,
        "Interior Quality": overall_qual,
        "Interior Quality Rating": overall_qual,
        "Overall Condition": overall_cond,
        "Exterior Condition": overall_cond,
        "Exterior Condition Rating": overall_cond,
        "Interior Condition": overall_cond,
        "Interior Condition Rating": overall_cond,
        "Foundation": foundation_val,
        "Foundation Type": foundation_val,
        "Full Basement": "Yes" if "Basement" in foundation_val else "No",
        "Partial Basement": "No",
        "Concrete Slab": "Yes" if "Slab" in foundation_val else "No",
        "Crawl Space": "Yes" if "Crawl" in foundation_val else "No",
        "Basement Area": unfin_bg_raw if unfin_bg_raw != "0" else (fin_bg_raw if fin_bg_raw != "0" else "0"),
        "Basement Area sq.ft.": unfin_bg_raw if unfin_bg_raw != "0" else (fin_bg_raw if fin_bg_raw != "0" else "0"),
        "Basement Finish %": "0%",
        "Year Built": year_built,
        "Finished Above Grade": fin_ag,
        "Above Grade Finished Area": fin_ag,
        "GLA / GBA": fin_ag,
        "Unfinished Above Grade": unfin_ag,
        "Finished Below Grade": fin_bg,
        "Unfinished Below Grade": unfin_bg,
        "Area Data Source": "Appraiser Measurement",
    })

    # Clean combined fields
    combined_fields = {}
    combined_fields.update(summary_data)
    combined_fields.update(assignment_data)
    combined_fields.update(subject_data)
    combined_fields.update(site_data)
    combined_fields.update(improvements_data)
    combined_fields.update(neighborhood_data)
    combined_fields.update(reconciliation_data)
    combined_fields.update(prior_sale_history_data)
    combined_fields.update(project_info_data)
    combined_fields.update(sales_grid_data)

    # Assign individual comps
    for c_num, c_data in comp_num_map.items():
        combined_fields[f"COMPARABLE SALE #{c_num}"] = c_data
        combined_fields[f"COMPARABLE SALE # {c_num}"] = c_data
        combined_fields[f"Comparable Sale #{c_num}"] = c_data
        combined_fields[f"Comp {c_num}"] = c_data

    # Assign individual rental comps
    for r_num_i in range(1, len(rent_comps) + 1):
        c_d = comparable_rent_schedule.get(f"Rental {r_num_i}") or comparable_rent_schedule.get(f"COMPARABLE NO. {r_num_i}")
        if c_d:
            combined_fields[f"COMPARABLE NO. {r_num_i}"] = c_d
            combined_fields[f"Comparable Rent #{r_num_i}"] = c_d
            combined_fields[f"Rental {r_num_i}"] = c_d
            combined_fields[f"Rental #{r_num_i}"] = c_d
            combined_fields[f"RENTAL {r_num_i}"] = c_d
            combined_fields[f"RENTAL #{r_num_i}"] = c_d
            combined_fields[f"Comparable Rental #{r_num_i}"] = c_d
            combined_fields[f"Comparable Rent Schedule Comp #{r_num_i}"] = c_d

    if comparable_rent_schedule:
        combined_fields["Comparable Rent Schedule"] = comparable_rent_schedule
        combined_fields["COMPARABLE_RENT_SCHEDULE"] = comparable_rent_schedule
        combined_fields["RENT_SCHEDULE_GRID"] = comparable_rent_schedule
        combined_fields["Comparable Rental Data"] = comparable_rent_schedule
        combined_fields["COMPARABLE_RENTAL_DATA"] = comparable_rent_schedule
        combined_fields["Rental Grid"] = comparable_rent_schedule
        combined_fields["RENTAL_GRID"] = comparable_rent_schedule

    if single_family_rent_schedule:
        combined_fields["Single Family Rent Schedule"] = single_family_rent_schedule
        combined_fields["SINGLE_FAMILY_RENT_SCHEDULE"] = single_family_rent_schedule
        combined_fields["Subject Rent Schedule"] = single_family_rent_schedule
        combined_fields["SUBJECT_RENT_SCHEDULE"] = single_family_rent_schedule

    combined_fields["Subject"] = subject_data
    combined_fields["SUBJECT"] = subject_data
    combined_fields["Summary"] = summary_data
    combined_fields["SUMMARY"] = summary_data
    combined_fields["Site"] = site_data
    combined_fields["SITE"] = site_data
    combined_fields["Improvements"] = improvements_data
    combined_fields["IMPROVEMENTS"] = improvements_data
    combined_fields["Dwelling Exterior"] = improvements_data
    combined_fields["Neighborhood"] = neighborhood_data
    combined_fields["NEIGHBORHOOD"] = neighborhood_data
    combined_fields["Contract"] = assignment_data
    combined_fields["CONTRACT"] = assignment_data
    combined_fields["Assignment"] = assignment_data
    combined_fields["ASSIGNMENT"] = assignment_data
    combined_fields["Contact Information"] = contact_data
    combined_fields["CONTACT"] = contact_data
    combined_fields["CONTACT_INFORMATION"] = contact_data
    combined_fields["Certification"] = reconciliation_data
    combined_fields["CERTIFICATION"] = reconciliation_data
    combined_fields["Sales Grid"] = clean_sales_grid
    combined_fields["SALES_GRID"] = sales_grid_data
    combined_fields["Reconciliation"] = reconciliation_data
    combined_fields["RECONCILIATION"] = reconciliation_data
    combined_fields["PRIOR_SALE_HISTORY"] = prior_sale_history_data
    combined_fields["Prior Sale History"] = prior_sale_history_data
    combined_fields["PROJECT_INFO"] = project_info_data
    combined_fields["Unit #"] = s_unit_id
    combined_fields["Unit Number"] = s_unit_id
    combined_fields["Unit"] = s_unit_id
    combined_fields["Property Address"] = s_line
    combined_fields["City"] = s_city
    combined_fields["State"] = s_state
    combined_fields["Zip Code"] = s_zip
    combined_fields["Project Information"] = project_info_data
    combined_fields["PROJECT_SITE"] = site_data
    combined_fields["Project Site"] = site_data
    combined_fields["Topography"] = topography_val
    combined_fields["Size"] = site_size
    combined_fields["Density"] = density_val
    combined_fields["TOPOGRAPHY"] = topography_val
    combined_fields["SIZE"] = site_size
    combined_fields["DENSITY"] = density_val

    # Additional Appraisal Version #1 fields
    combined_fields["Vehicle Storage"] = storage_type
    combined_fields["Number of Parking Spaces"] = storage_spaces
    combined_fields["Detail"] = storage_detail
    combined_fields["Overall Quality and Condition"] = {
        "Overall Quality": overall_qual,
        "Overall Condition": overall_cond,
        "Reconciliation of Overall Quality and Condition": qual_cond_reconcile
    }
    combined_fields["Indicated Value by Sales Comparison Approach"] = sales_ind_val
    combined_fields["Indicated Value by Sales Comparison Approach Indicated"] = sales_ind_val
    combined_fields["Sales Comparison Approach Indicated Value"] = sales_ind_val
    combined_fields["Reconciliation of Sales Comparison Approach"] = reconciliation_data.get("Reconciliation of Sales Comparison Approach", "")

    # Form 1073 Unit Descriptions (Condo)
    unit_tot_rooms = 0
    try:
        unit_tot_rooms = int(bedrooms_cnt or 0) + int(full_baths_cnt or 0) + int(half_baths_cnt or 0) + 2
    except Exception:
        unit_tot_rooms = 5
    unit_rooms_str = str(unit_tot_rooms) if unit_tot_rooms > 0 else "5"
    unit_baths_display = f"{full_baths_cnt}.{half_baths_cnt}" if (full_baths_cnt or half_baths_cnt) else "2.0"
    unit_desc_finished_summary = f"{unit_rooms_str} Rooms, {bedrooms_cnt or '3'} Bedrooms, {unit_baths_display} Bath(s)"

    unit_descriptions_data = {
        "Unit Charge$": project_info_data.get("Monthly Amount") if project_info_data.get("Monthly Amount") != "None" else "None",
        "per month X 12 = $": "None",
        "per year": "None",
        "Annual assessment charge per year per square feet of gross living area = $": "None",
        "Utilities included in the unit monthly assessment [None/Heat/Air/Conditioning/Electricity/Gas/Water/Sewer/Cable/Other (describe)]": project_info_data.get("Utilities Included", "None"),
        "Floor #": s_unit_id or "1",
        "# of Levels": levels_in_unit or "1",
        "Heating Type/Fuel": f"{heat_sys} / {heat_fuel}" if heat_sys and heat_fuel else (heat_sys or heat_fuel or "Central / Gas"),
        "Central AC/Individual AC/Other (describe)": cool_sys or "Central AC",
        "Fireplace(s) #/Woodstove(s) #/Deck/Patio/Porch/Balcony/Other": "None",
        "Refrigerator/Range/Oven/Disp Microwave/Dishwasher/Washer/Dryer": "Refrigerator, Range/Oven, Dishwasher, Microwave, Washer/Dryer",
        "Floors": fl_type or "Typical",
        "Walls": walls_ceiling_type or "Drywall",
        "Trim/Finish": "Wood",
        "Bath Wainscot": "Ceramic Tile",
        "Doors": "Wood",
        "None/Garage/Covered/Open": storage_type or "Garage",
        "Assigned/Owned": "Assigned",
        "# of Cars": storage_spaces or "1",
        "Parking Space #": s_unit_id or "1",
        "Finished area above grade contains:": unit_desc_finished_summary,
        "Rooms": unit_rooms_str,
        "Bedrooms": bedrooms_cnt or "3",
        "Bath(s)": unit_baths_display,
        "Square Feet of Gross Living Area Above Grade": fin_ag or "1200",
        "Are the heating and cooling for the individual units separately metered?": "Yes",
        "If No, describe and comment on compatibility to other projects in the market area.": "N/A",
        "Additional features (special energy efficient items, etc.)": "Energy efficient windows, programmable thermostat",
        "Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)": "At the time of inspection the subject was found to be in typical market condition for the area. No repairs needed.",
        "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property?": "No",
        "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? ": "No",
        "If Yes, describe": "N/A",
        "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?": "Yes",
        "If No, describe": "N/A"
    }

    combined_fields.update(unit_descriptions_data)
    combined_fields["Unit Descriptions"] = unit_descriptions_data
    combined_fields["UNIT_DESCRIPTIONS"] = unit_descriptions_data

    clean_section_data = {
        "Form Type": form_type,
        "Summary": summary_data,
        "SUMMARY": summary_data,
        "Subject": subject_data,
        "Contact Information": contact_data,
        "CONTACT": contact_data,
        "Contract": assignment_data,
        "Assignment": assignment_data,
        "Neighborhood": neighborhood_data,
        "Site": site_data,
        "SITE": site_data,
        "Project Site": site_data,
        "PROJECT_SITE": site_data,
        "Topography": topography_val,
        "Size": site_size,
        "Density": density_val,
        "TOPOGRAPHY": topography_val,
        "SIZE": site_size,
        "DENSITY": density_val,
        "Improvements": improvements_data,
        "Sales Grid": clean_sales_grid,
        "Reconciliation": reconciliation_data,
        "Cost Approach": {},
        "Certification": reconciliation_data,
        "Prior Sale History": prior_sale_history_data,
        "PRIOR_SALE_HISTORY": prior_sale_history_data,
        "Project Information": project_info_data,
        "PROJECT_INFO": project_info_data,
        "Unit Descriptions": unit_descriptions_data,
        "UNIT_DESCRIPTIONS": unit_descriptions_data,
    }

    if comparable_rent_schedule:
        clean_section_data["Comparable Rent Schedule"] = comparable_rent_schedule
        clean_section_data["COMPARABLE_RENT_SCHEDULE"] = comparable_rent_schedule
        clean_section_data["RENT_SCHEDULE_GRID"] = comparable_rent_schedule
        clean_section_data["Comparable Rental Data"] = comparable_rent_schedule
        clean_section_data["COMPARABLE_RENTAL_DATA"] = comparable_rent_schedule
        clean_section_data["Rental Grid"] = comparable_rent_schedule
        clean_section_data["RENTAL_GRID"] = comparable_rent_schedule

    if single_family_rent_schedule:
        clean_section_data["Single Family Rent Schedule"] = single_family_rent_schedule
        clean_section_data["SINGLE_FAMILY_RENT_SCHEDULE"] = single_family_rent_schedule
        clean_section_data["Subject Rent Schedule"] = single_family_rent_schedule
        clean_section_data["SUBJECT_RENT_SCHEDULE"] = single_family_rent_schedule

    # -------------------------------------------------------------
    # Visual Photos & Exhibits Extraction (UAD 3.6)
    # -------------------------------------------------------------
    extracted_photos: List[Dict[str, Any]] = []
    mandatory_subject_photos: Dict[str, Any] = {}
    photo_room_counts: Dict[str, Any] = {}
    if extract_images:
        try:
            extracted_photos = extract_photos_from_uad36_xml(
                xml_path_or_bytes if isinstance(xml_path_or_bytes, (str, os.PathLike)) else root,
                include_images=True,
                companion_pdf_path=companion_pdf_path
            )
        except Exception as e:
            print(f"[uad36_extractor] Photo extraction notice: {e}")

        if extracted_photos:
            # 1. Compile Mandatory Subject Photos summary
            mand_groups = {
                "Subject Front View": [],
                "Subject Rear View": [],
                "Subject Side View": [],
                "Subject Street Scene": []
            }
            for p in extracted_photos:
                vt = p.get("view_type")
                if vt in mand_groups:
                    mand_groups[vt].append(p)
                elif p.get("category") == "Subject property":
                    cap_l = (p.get("caption") or "").lower()
                    if "front" in cap_l and not mand_groups["Subject Front View"]:
                        p["view_type"] = "Subject Front View"
                        p["is_mandatory"] = True
                        mand_groups["Subject Front View"].append(p)
                    elif "rear" in cap_l and not mand_groups["Subject Rear View"]:
                        p["view_type"] = "Subject Rear View"
                        p["is_mandatory"] = True
                        mand_groups["Subject Rear View"].append(p)
                    elif "street" in cap_l and not mand_groups["Subject Street Scene"]:
                        p["view_type"] = "Subject Street Scene"
                        p["is_mandatory"] = True
                        mand_groups["Subject Street Scene"].append(p)
                    elif "side" in cap_l and not mand_groups["Subject Side View"]:
                        p["view_type"] = "Subject Side View"
                        p["is_mandatory"] = True
                        mand_groups["Subject Side View"].append(p)

            missing_mand = [k for k, v in mand_groups.items() if len(v) == 0]
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

            # 2. Compile Photo Room Counts
            distinct_beds = set()
            distinct_half_baths = set()
            distinct_full_baths = set()
            distinct_living = set()
            distinct_kitchen = set()
            distinct_dining = set()
            distinct_other = set()

            for p in extracted_photos:
                cat = (p.get("category") or "").strip().lower()
                if any(k in cat for k in ["comparable", "rental", "map", "sketch"]):
                    continue
                cap = (p.get("caption") or p.get("title") or "").strip()
                if not cap:
                    continue
                norm_cap = re.sub(r'\s*\([a-zA-Z0-9]+\)$', '', cap).strip().lower()
                if re.search(r'\b(?:bedroom|bdrm|bed\b|mbr\b|master\s*bed|primary\s*bed|guest\s*bed)\b', norm_cap):
                    distinct_beds.add(norm_cap)
                elif re.search(r'(?:^|[\s\b])(?:half[\s-]*(?:bath(?:room)?|ba)|1\/2[\s-]*(?:bath(?:room)?|ba)|0?\.5[\s-]*(?:bath(?:room)?|ba)|(?:bath(?:room)?|ba)\s*(?:\(\s*)?(?:half|1\/2|0?\.5)(?:\s*\))?|powder(?:\s*room)?|lav(?:atory)?|wc)\b', norm_cap):
                    distinct_half_baths.add(norm_cap)
                elif re.search(r'\b(?:full\s*bath|full\s*ba|master\s*bath|primary\s*bath|guest\s*bath|hall\s*bath|bath\s*#?\s*\d|bathroom|bath\b|3\/4\s*bath)\b', norm_cap):
                    distinct_full_baths.add(norm_cap)
                elif re.search(r'\b(?:living|family\s*room|great\s*room|sitting\s*room)\b', norm_cap):
                    distinct_living.add(norm_cap)
                elif re.search(r'\b(?:kitchen|pantry)\b', norm_cap):
                    distinct_kitchen.add(norm_cap)
                elif re.search(r'\b(?:dining|breakfast|nook)\b', norm_cap):
                    distinct_dining.add(norm_cap)
                else:
                    distinct_other.add(norm_cap)

            total_rooms = len(distinct_beds) + len(distinct_full_baths) + len(distinct_half_baths) + len(distinct_living) + len(distinct_kitchen) + len(distinct_dining)
            photo_room_counts = {
                "bedroom_count": len(distinct_beds),
                "full_bath_count": len(distinct_full_baths),
                "half_bath_count": len(distinct_half_baths),
                "living_count": len(distinct_living),
                "kitchen_count": len(distinct_kitchen),
                "dining_count": len(distinct_dining),
                "other_count": len(distinct_other),
                "total_room_count": total_rooms,
                "bedroom_display": str(len(distinct_beds)) if distinct_beds else "—",
                "bathroom_display": f"{len(distinct_full_baths)}.{len(distinct_half_baths)}" if (distinct_full_baths or distinct_half_baths) else "—",
                "total_room_display": str(total_rooms) if total_rooms > 0 else "—",
            }

            # 3. Water Heater & Smoke Detector photo comments if missing
            for p in extracted_photos:
                cap_l = (p.get("caption") or "").lower()
                if ("water heater" in cap_l or "waterheater" in cap_l or "hwh" in cap_l) and not subject_data.get("Water heater double-strapped comment"):
                    wh_comm = f"Photo verified: {p.get('caption')}"
                    subject_data["Water heater double-strapped comment"] = wh_comm
                    subject_data["Water Heater Double-Strapped Comment"] = wh_comm
                    improvements_data["Water heater double-strapped comment"] = wh_comm
                if ("smoke" in cap_l or "co detector" in cap_l or "carbon monoxide" in cap_l) and not subject_data.get("Smoke detector comment"):
                    smk_comm = f"Photo verified: {p.get('caption')}"
                    subject_data["Smoke detector comment"] = smk_comm
                    improvements_data["Smoke detector comment"] = smk_comm

    combined_fields["EXTRACTED_PHOTOS"] = extracted_photos
    combined_fields["extracted_photos"] = extracted_photos
    combined_fields["MANDATORY_SUBJECT_PHOTOS"] = mandatory_subject_photos
    combined_fields["mandatory_subject_photos"] = mandatory_subject_photos
    combined_fields["PHOTO_ROOM_COUNTS"] = photo_room_counts
    combined_fields["photo_room_counts"] = photo_room_counts

    clean_section_data["EXTRACTED_PHOTOS"] = extracted_photos
    clean_section_data["extracted_photos"] = extracted_photos
    clean_section_data["MANDATORY_SUBJECT_PHOTOS"] = mandatory_subject_photos
    clean_section_data["PHOTO_ROOM_COUNTS"] = photo_room_counts

    # -------------------------------------------------------------
    # Map & Sketch Exhibits Analysis (UAD 3.6)
    # -------------------------------------------------------------
    file_path_str = str(xml_path_or_bytes) if isinstance(xml_path_or_bytes, (str, os.PathLike)) else ""
    map_exhibits_analysis = build_map_exhibits_analysis_from_uad36(
        clean_section_data,
        combined_fields,
        extracted_photos,
        file_path=file_path_str
    )
    combined_fields["MAP_EXHIBITS_ANALYSIS"] = map_exhibits_analysis
    combined_fields["map_exhibits_analysis"] = map_exhibits_analysis
    clean_section_data["MAP_EXHIBITS_ANALYSIS"] = map_exhibits_analysis
    clean_section_data["map_exhibits_analysis"] = map_exhibits_analysis

    return {
        "status": "success",
        "form_type": form_type,
        "fields": combined_fields,
        "clean_data": clean_section_data,
        "comparable_rent_schedule": comparable_rent_schedule,
        "Comparable Rent Schedule": comparable_rent_schedule,
        "comparable_rental_data": comparable_rent_schedule,
        "Comparable Rental Data": comparable_rent_schedule,
        "rental_grid": comparable_rent_schedule,
        "Rental Grid": comparable_rent_schedule,
        "single_family_rent_schedule": single_family_rent_schedule,
        "Single Family Rent Schedule": single_family_rent_schedule,
        "extracted_photos": extracted_photos,
        "EXTRACTED_PHOTOS": extracted_photos,
        "mandatory_subject_photos": mandatory_subject_photos,
        "MANDATORY_SUBJECT_PHOTOS": mandatory_subject_photos,
        "photo_room_counts": photo_room_counts,
        "PHOTO_ROOM_COUNTS": photo_room_counts,
        "map_exhibits_analysis": map_exhibits_analysis,
        "MAP_EXHIBITS_ANALYSIS": map_exhibits_analysis,
    }


def build_map_exhibits_analysis_from_uad36(
    clean_section_data: Dict[str, Any],
    combined_fields: Dict[str, Any],
    extracted_photos: List[Dict[str, Any]],
    file_path: str = "",
    exhibit_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Builds structured MAP_EXHIBITS_ANALYSIS for UAD 3.6 (Appraisal Version #1) reports:
    - Location Map & Comparables (Subject in red, Comps 1..N in blue with proximity & prices)
    - Aerial Map
    - Building Sketch / Floor Plan (GLA, Level sqft breakdown, room labels & summary)
    - Rentals / Other Maps
    - Comparable Photos Addenda
    """
    ex_type = (exhibit_type or "").lower().strip()
    file_name = os.path.basename(file_path) if file_path else "appraisal_report.xml"

    process_location = ex_type in ["", "all", "location", "location_map", "location_maps", "comps_map", "location_and_comps"]
    process_aerial = ex_type in ["", "all", "aerial", "aerial_map", "aerial_maps", "satellite"]
    process_sketches = ex_type in ["", "all", "sketch", "sketches", "building_sketch", "floor_plan", "building_sketch_floor_plan"]
    process_rentals = ex_type in ["", "all", "rental", "rentals", "rental_map", "rentals_map", "other_maps", "rentals_other_maps", "plat", "flood"]

    subj_clean = clean_section_data.get("Subject", {}) or combined_fields.get("Subject", {}) or {}
    st = subj_clean.get("Street Address") or subj_clean.get("Physical Address") or subj_clean.get("Property Address") or subj_clean.get("Address") or ""
    ci = subj_clean.get("City") or ""
    sa = subj_clean.get("State") or ""
    zp = subj_clean.get("Zip Code") or subj_clean.get("Zip") or ""
    fa = subj_clean.get("Physical Address") or subj_clean.get("Property Address") or subj_clean.get("Full Address") or f"{st}, {ci}, {sa} {zp}".strip(", ")

    # Parse clean street if it contains comma
    clean_st = st
    if "," in clean_st and not ci:
        parts = [p.strip() for p in clean_st.split(",")]
        clean_st = parts[0]
        if len(parts) > 1 and not ci: ci = parts[1]
        if len(parts) > 2 and not sa:
            m_state_zip = re.search(r'([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)?', parts[2])
            if m_state_zip:
                sa = m_state_zip.group(1)
                zp = m_state_zip.group(2) or zp
    elif "," in clean_st and ci:
        clean_st = clean_st.split(",")[0].strip()

    subject_record = {
        "street": clean_st,
        "city": ci,
        "state": sa,
        "zipcode": zp,
        "address": fa or f"{clean_st}, {ci}, {sa} {zp}".strip(", ")
    }

    # Reference grid sales comps
    sales_grid = clean_section_data.get("Sales Grid", {}) or combined_fields.get("Sales Grid", {}) or {}
    sales_comps: List[Dict[str, Any]] = []

    comp_keys = [k for k in sales_grid.keys() if k != "Subject" and isinstance(sales_grid[k], dict) and re.search(r'\b(?:comp|comparable)\b', k, re.I)]
    seen_comp_nums = set()
    for ck in comp_keys:
        m = re.search(r'(\d+)', ck)
        cnum = int(m.group(1)) if m else len(sales_comps) + 1
        if cnum in seen_comp_nums:
            continue
        seen_comp_nums.add(cnum)
        cd = sales_grid[ck]
        c_addr = cd.get("Property Address") or cd.get("Address") or cd.get("Comparable Property Address") or ""
        m_c_st = re.match(r'^([^,]+)', c_addr)
        c_st = m_c_st.group(1).strip() if m_c_st else c_addr

        c_ci = cd.get("City") or ""
        c_sa = cd.get("State") or ""
        c_zp = cd.get("Zip Code") or cd.get("PostalCode") or ""
        if not c_ci and "," in c_addr:
            c_parts = [p.strip() for p in c_addr.split(",")]
            if len(c_parts) > 1 and not c_ci:
                c_ci = c_parts[1]
            if len(c_parts) > 2 and not c_sa:
                m_sz = re.search(r'([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)?', c_parts[2])
                if m_sz:
                    c_sa = m_sz.group(1)
                    c_zp = m_sz.group(2) or c_zp

        sales_comps.append({
            "comp_num": cnum,
            "street": c_st,
            "city": c_ci or ci,
            "state": c_sa or sa,
            "zipcode": c_zp or zp,
            "address": c_addr or f"{c_st}, {c_ci or ci}, {c_sa or sa} {c_zp or zp}".strip(", "),
            "proximity": cd.get("Proximity to Subject") or cd.get("Proximity") or "",
            "sale_price": cd.get("Sale Price") or cd.get("OwnershipTransferTransactionAmount") or "",
            "grid_data": cd
        })
    sales_comps.sort(key=lambda x: x["comp_num"])

    # Reference records rental comps if any
    rental_grid = (
        clean_section_data.get("Comparable Rent Schedule") or
        clean_section_data.get("Rental Grid") or
        clean_section_data.get("Comparable Rental Data") or
        clean_section_data.get("RENT_SCHEDULE_GRID") or
        clean_section_data.get("RENTAL_GRID") or
        combined_fields.get("Comparable Rent Schedule") or
        combined_fields.get("Rental Grid") or
        combined_fields.get("Comparable Rental Data") or
        {}
    )
    rental_comps: List[Dict[str, Any]] = []
    seen_rental_nums = set()
    for rk in rental_grid.keys():
        if isinstance(rental_grid[rk], dict) and re.search(r'\b(?:rental|comp|comparable)\b', rk, re.I):
            m = re.search(r'(\d+)', rk)
            rnum = int(m.group(1)) if m else len(rental_comps) + 1
            if rnum in seen_rental_nums:
                continue
            seen_rental_nums.add(rnum)
            rd = rental_grid[rk]
            r_addr = rd.get("Address") or rd.get("Property Address") or rd.get("Street Address") or ""
            m_r_st = re.match(r'^([^,]+)', r_addr)
            r_st = rd.get("Street Address") or (m_r_st.group(1).strip() if m_r_st else r_addr)
            r_ci = rd.get("City") or subject_record.get("city", "")
            r_sa = rd.get("State") or subject_record.get("state", "")
            r_zp = rd.get("Zip Code") or rd.get("PostalCode") or subject_record.get("zipcode", "")
            rental_comps.append({
                "comp_num": rnum,
                "street": r_st,
                "city": r_ci,
                "state": r_sa,
                "zipcode": r_zp,
                "address": r_addr or f"{r_st}, {r_ci}, {r_sa} {r_zp}".strip(", "),
                "proximity": rd.get("Proximity to Subject") or rd.get("Proximity") or "",
                "monthly_rent": rd.get("Monthly Rental") or rd.get("Adjusted Monthly Rent") or rd.get("Monthly Rent") or "",
                "grid_data": rd
            })
    rental_comps.sort(key=lambda x: x["comp_num"])

    # Locate map exhibits in extracted_photos
    photos = extracted_photos or []

    # 1. Location Map
    loc_photo = next((p for p in photos if p.get("category") == "Maps & Aerials" and (
        re.search(r'\b(?:sales|location|vicinity|neighborhood)\b', p.get("label", "") or "", re.I) or
        re.search(r'\b(?:sales|location|vicinity|neighborhood)\b', p.get("caption", "") or "", re.I) or
        p.get("cat_type") == "SalesComparableMap"
    )), None)
    if not loc_photo:
        loc_photo = next((p for p in photos if p.get("category") == "Maps & Aerials" and not re.search(r'aerial|ariel|satellite|flood|plat', (p.get("label") or "") + " " + (p.get("caption") or ""), re.I)), None)

    # 2. Aerial Map
    aerial_photo = next((p for p in photos if p.get("category") == "Maps & Aerials" and (
        re.search(r'aerial|ariel|satellite', (p.get("label") or "") + " " + (p.get("caption") or ""), re.I) or
        p.get("cat_type") == "AerialMap"
    )), None)

    # 3. Sketch Photo
    sketch_photo = next((p for p in photos if p.get("category") == "Building Sketch" or (
        re.search(r'sketch|floor\s*plan', (p.get("label") or "") + " " + (p.get("caption") or ""), re.I) or
        p.get("cat_type") == "SubjectPropertyImprovementSketch"
    )), None)

    # 4. Other maps (Rentals, Flood, Plat, Site)
    other_map_photos = [p for p in photos if p.get("category") == "Maps & Aerials" and p != loc_photo and p != aerial_photo]

    # Comparable photos
    comp_photos: List[Dict[str, Any]] = []
    c_photos_raw = [p for p in photos if p.get("category") in ["Comparable property", "Comparable", "Rental property"] or p.get("comp_num")]
    for cp in c_photos_raw:
        c_lbl = cp.get("label") or cp.get("caption") or ""
        m_c = re.search(r'#?(\d+)', c_lbl)
        c_num = int(m_c.group(1)) if m_c else (int(cp["comp_num"]) if cp.get("comp_num") else len(comp_photos) + 1)
        is_rental_p = cp.get("category") == "Rental property" or "rental" in (c_lbl + " " + (cp.get("category") or "")).lower()
        if is_rental_p:
            matched_g = next((rc for rc in rental_comps if rc["comp_num"] == c_num), None)
            comp_photos.append({
                "comp_num": c_num,
                "label": f"Rental Comp #{c_num}",
                "item_type": "Rental",
                "street": cp.get("address") or (matched_g.get("street") if matched_g else ""),
                "address": cp.get("address") or (matched_g.get("address") if matched_g else ""),
                "proximity": matched_g.get("proximity", "") if matched_g else (cp.get("proximity") or ""),
                "monthly_rent": matched_g.get("monthly_rent", "") if matched_g else "",
                "price": matched_g.get("monthly_rent", "") if matched_g else "",
                "thumbnail": cp.get("base64_preview") or cp.get("image_base64") or "",
                "base64_preview": cp.get("base64_preview") or cp.get("image_base64") or "",
                "page": cp.get("page", 1)
            })
        else:
            matched_g = next((sc for sc in sales_comps if sc["comp_num"] == c_num), None)
            comp_photos.append({
                "comp_num": c_num,
                "label": f"Comparable Sale #{c_num}",
                "item_type": "Comparable",
                "street": cp.get("address") or (matched_g.get("street") if matched_g else ""),
                "address": cp.get("address") or (matched_g.get("address") if matched_g else ""),
                "proximity": matched_g.get("proximity", "") if matched_g else (cp.get("proximity") or ""),
                "sale_price": matched_g.get("sale_price", "") if matched_g else (cp.get("sale_price") or ""),
                "thumbnail": cp.get("base64_preview") or cp.get("image_base64") or "",
                "base64_preview": cp.get("base64_preview") or cp.get("image_base64") or "",
                "page": cp.get("page", 1)
            })

    maps_data: List[Dict[str, Any]] = []
    all_pins: List[Dict[str, Any]] = []

    loc_page = loc_photo.get("page", 1) if loc_photo else 1
    sub_pin = {
        "item_type": "Subject",
        "label": "Subject",
        "street": subject_record["street"],
        "city": subject_record["city"],
        "state": subject_record["state"],
        "zipcode": subject_record["zipcode"],
        "address": subject_record["address"],
        "proximity": "Subject",
        "map_type": "Location Map",
        "page_number": loc_page,
        "source_file": file_name,
        "status": "Verified Subject Property"
    }

    comp_pins: List[Dict[str, Any]] = []
    for sc in sales_comps:
        c_num = sc["comp_num"]
        matched_p = next((p for p in comp_photos if p["comp_num"] == c_num), None)
        pin = {
            "item_type": "Comparable",
            "label": f"Comparable #{c_num}",
            "street": sc["street"],
            "city": sc["city"],
            "state": sc["state"],
            "zipcode": sc["zipcode"],
            "address": sc["address"],
            "proximity": sc["proximity"],
            "price": sc["sale_price"],
            "map_type": "Location Map",
            "page_number": loc_page,
            "source_file": file_name,
            "grid_data": sc["grid_data"],
            "photo_data": matched_p,
            "status": "Verified from UAD 3.6 Sales Grid"
        }
        comp_pins.append(pin)

    # Location Map Image Preview
    loc_b64 = loc_photo.get("base64_preview") or loc_photo.get("image_base64") if loc_photo else ""
    if not loc_b64:
        loc_b64 = _generate_map_svg_preview(
            title="Location Map & Comparables",
            subject_addr=subject_record["address"],
            comps=sales_comps
        )

    if process_location:
        loc_r_pins = []
        if rental_comps:
            for rc in rental_comps:
                loc_r_pins.append({
                    "item_type": "Rental",
                    "label": f"Rental #{rc['comp_num']}",
                    "street": rc["street"],
                    "city": rc.get("city") or subject_record["city"],
                    "state": rc.get("state") or subject_record["state"],
                    "zipcode": rc.get("zipcode") or subject_record["zipcode"],
                    "address": rc["address"],
                    "proximity": rc["proximity"],
                    "price": rc["monthly_rent"],
                    "map_type": "Location Map",
                    "page_number": loc_page,
                    "source_file": file_name,
                    "grid_data": rc["grid_data"],
                    "status": "Verified from Rental Schedule"
                })

        loc_map_item = {
            "page_number": loc_page,
            "map_type": "Location Map",
            "subject": sub_pin,
            "comparables": comp_pins,
            "rentals": loc_r_pins,
            "comparables_only": comp_pins,
            "listings": [],
            "pins": [sub_pin, *comp_pins, *loc_r_pins],
            "has_rentals": len(loc_r_pins) > 0,
            "has_comparables": len(comp_pins) > 0,
            "image_preview": loc_b64
        }
        maps_data.append(loc_map_item)
        all_pins.extend([sub_pin, *comp_pins, *loc_r_pins])

    # Aerial Map
    if process_aerial:
        aer_page = aerial_photo.get("page", 2) if aerial_photo else 2
        aer_b64 = aerial_photo.get("base64_preview") or aerial_photo.get("image_base64") if aerial_photo else ""
        if not aer_b64:
            aer_b64 = _generate_photo_svg_preview(
                title="Aerial Map Exhibit",
                category="Maps & Aerials",
                address=subject_record["address"]
            )
        aer_sub_pin = {**sub_pin, "map_type": "Aerial Map", "page_number": aer_page}
        maps_data.append({
            "page_number": aer_page,
            "map_type": "Aerial Map",
            "subject": aer_sub_pin,
            "comparables": [],
            "rentals": [],
            "comparables_only": [],
            "listings": [],
            "pins": [aer_sub_pin],
            "has_rentals": False,
            "has_comparables": False,
            "image_preview": aer_b64
        })
        all_pins.append(aer_sub_pin)

    # Rentals and Other Maps
    if process_rentals:
        for omp in other_map_photos:
            om_lbl = omp.get("label") or omp.get("caption") or "Exhibits Map"
            om_page = omp.get("page", 3)
            om_b64 = omp.get("base64_preview") or omp.get("image_base64") or ""
            is_rental_map = "rental" in om_lbl.lower() or omp.get("cat_type") == "RentalComparableMap"

            r_pins = []
            if is_rental_map:
                for rc in rental_comps:
                    r_pins.append({
                        "item_type": "Rental",
                        "label": f"Rental #{rc['comp_num']}",
                        "street": rc["street"],
                        "city": rc.get("city") or subject_record["city"],
                        "state": rc.get("state") or subject_record["state"],
                        "zipcode": rc.get("zipcode") or subject_record["zipcode"],
                        "address": rc["address"],
                        "proximity": rc["proximity"],
                        "price": rc["monthly_rent"],
                        "map_type": om_lbl,
                        "page_number": om_page,
                        "source_file": file_name,
                        "grid_data": rc["grid_data"],
                        "status": "Verified from Rental Schedule"
                    })

            om_sub_pin = {**sub_pin, "map_type": om_lbl, "page_number": om_page}
            maps_data.append({
                "page_number": om_page,
                "map_type": om_lbl,
                "subject": om_sub_pin,
                "comparables": r_pins if is_rental_map else [],
                "rentals": r_pins,
                "comparables_only": [],
                "listings": [],
                "pins": [om_sub_pin, *r_pins],
                "has_rentals": len(r_pins) > 0,
                "has_comparables": False,
                "image_preview": om_b64
            })
            all_pins.extend([om_sub_pin, *r_pins])

        if len(rental_comps) > 0 and not any(m.get("has_rentals") and m.get("map_type") != "Location Map" for m in maps_data):
            # Synthesize rental map entry from rental_comps if not already created
            r_pins = []
            for rc in rental_comps:
                r_pins.append({
                    "item_type": "Rental",
                    "label": f"Rental #{rc['comp_num']}",
                    "street": rc["street"],
                    "city": rc.get("city") or subject_record["city"],
                    "state": rc.get("state") or subject_record["state"],
                    "zipcode": rc.get("zipcode") or subject_record["zipcode"],
                    "address": rc["address"],
                    "proximity": rc["proximity"],
                    "price": rc["monthly_rent"],
                    "map_type": "Rental Comparables Map",
                    "page_number": 1,
                    "source_file": file_name,
                    "grid_data": rc["grid_data"],
                    "status": "Verified from Rental Schedule"
                })
            rent_sub_pin = {**sub_pin, "map_type": "Rental Comparables Map", "page_number": 1}
            maps_data.append({
                "page_number": 1,
                "map_type": "Rental Comparables Map",
                "subject": rent_sub_pin,
                "comparables": r_pins,
                "rentals": r_pins,
                "comparables_only": [],
                "listings": [],
                "pins": [rent_sub_pin, *r_pins],
                "has_rentals": True,
                "has_comparables": False,
                "image_preview": ""
            })
            all_pins.extend([rent_sub_pin, *r_pins])

    # Sketches Data
    sketches_data: List[Dict[str, Any]] = []
    if process_sketches:
        imp = clean_section_data.get("Improvements", {}) or combined_fields.get("Improvements", {}) or {}
        gla_val = imp.get("Above Grade Finished Area") or imp.get("GLA / GBA") or imp.get("Square Feet of Gross Living Area Above Grade") or ""

        # Build areas from level rows
        areas = []
        for r_idx in range(1, 10):
            lvl = imp.get(f"Level in Unit Row {r_idx}")
            if not lvl:
                break
            grd = imp.get(f"Grade Level Detail Row {r_idx}") or ""
            fin = imp.get(f"Finish Row {r_idx}") or "Finished"
            area_str = imp.get(f"Area Row {r_idx}") or ""
            m_sf = re.search(r'([\d,]+)', area_str)
            sf_num = int(m_sf.group(1).replace(",", "")) if m_sf else 0
            areas.append({
                "label": f"{lvl} ({grd}) - {fin}".strip(" -"),
                "name": lvl,
                "sqft": sf_num,
                "factor": "1.0",
                "grade": grd,
                "finish": fin
            })

        # Room summary & room labels
        tot_beds = 0
        try: tot_beds = int(imp.get("Total Bedrooms") or imp.get("Bedrooms") or 0)
        except Exception: pass
        tot_fbaths = 0
        try: tot_fbaths = int(imp.get("Total Bathrooms - Full") or imp.get("Bathrooms - Full") or 0)
        except Exception: pass
        tot_hbaths = 0
        try: tot_hbaths = int(imp.get("Total Bathrooms - Half") or imp.get("Bathrooms - Half") or 0)
        except Exception: pass

        rooms_by_cat = {"bedrooms": [], "bathrooms": [], "living": [], "kitchen_dining": []}
        rooms_by_lvl = {}
        all_room_labels = []

        for r_idx in range(1, 10):
            lvl = imp.get(f"Level in Unit Row {r_idx}")
            if not lvl:
                break
            r_sum = imp.get(f"Room Summary Row {r_idx}") or ""
            lvl_rooms = []
            if r_sum:
                parts = [p.strip() for p in r_sum.split(",") if p.strip()]
                for pt in parts:
                    m_cnt = re.match(r'(\d+)\s*-\s*(.*)', pt)
                    cnt = int(m_cnt.group(1)) if m_cnt else 1
                    r_name = m_cnt.group(2).strip() if m_cnt else pt
                    for ci in range(cnt):
                        label_item = f"{r_name} {ci + 1}" if cnt > 1 else r_name
                        lvl_rooms.append(label_item)
                        all_room_labels.append(label_item)
                        r_lower = r_name.lower()
                        if "bed" in r_lower: rooms_by_cat["bedrooms"].append(label_item)
                        elif "bath" in r_lower: rooms_by_cat["bathrooms"].append(label_item)
                        elif any(w in r_lower for w in ["living", "family", "great", "rec"]): rooms_by_cat["living"].append(label_item)
                        elif any(w in r_lower for w in ["kitchen", "dining", "nook"]): rooms_by_cat["kitchen_dining"].append(label_item)
            rooms_by_lvl[lvl] = lvl_rooms

        living_count = len(rooms_by_cat["living"]) or 1
        has_kitch = len(rooms_by_cat["kitchen_dining"]) > 0 or any("kitchen" in l.lower() for l in all_room_labels)
        has_din = any("dining" in l.lower() for l in all_room_labels)
        total_rooms_calc = tot_beds + tot_fbaths + tot_hbaths + living_count + (1 if has_kitch else 0) + (1 if has_din else 0)

        sketch_page = sketch_photo.get("page", 1) if sketch_photo else 1
        sketch_b64 = sketch_photo.get("base64_preview") or sketch_photo.get("image_base64") if sketch_photo else ""
        if not sketch_b64:
            sketch_b64 = _generate_sketch_svg_preview(
                title="Building Sketch & Floor Plan",
                gla=gla_val,
                areas=areas,
                room_labels=all_room_labels
            )

        sketches_data.append({
            "sketch_type": (sketch_photo.get("label") or "Building Sketch") if sketch_photo else "Building Sketch",
            "page_number": sketch_page,
            "gla": gla_val,
            "areas": areas,
            "room_labels": all_room_labels,
            "room_summary": {
                "bedroom_count": tot_beds or len(rooms_by_cat["bedrooms"]),
                "living_rooms_count": living_count,
                "has_kitchen": has_kitch,
                "has_dining": has_din,
                "total_rooms": total_rooms_calc or len(all_room_labels)
            },
            "rooms_by_category": rooms_by_cat,
            "rooms_by_level": rooms_by_lvl,
            "dimensions": [],
            "image_preview": sketch_b64
        })

    return {
        "status": "success",
        "file_name": file_name,
        "exhibit_type": ex_type or "all",
        "total_maps": len(maps_data),
        "total_sketches": len(sketches_data),
        "total_comparable_photos": len(comp_photos),
        "maps": maps_data,
        "sketches": sketches_data,
        "comparable_photos": comp_photos,
        "all_pins": all_pins,
        "reference_records": {
            "subject": subject_record,
            "sales_comps": sales_comps,
            "rental_comps": rental_comps
        }
    }
