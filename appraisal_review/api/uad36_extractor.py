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

    site_data = {
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
    combined_fields["Project Information"] = project_info_data

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
        "Improvements": improvements_data,
        "Sales Grid": clean_sales_grid,
        "Reconciliation": reconciliation_data,
        "Cost Approach": {},
        "Certification": reconciliation_data,
        "Prior Sale History": prior_sale_history_data,
        "PRIOR_SALE_HISTORY": prior_sale_history_data,
        "Project Information": project_info_data,
        "PROJECT_INFO": project_info_data,
    }

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

    return {
        "status": "success",
        "form_type": form_type,
        "fields": combined_fields,
        "clean_data": clean_section_data,
        "extracted_photos": extracted_photos,
        "EXTRACTED_PHOTOS": extracted_photos,
        "mandatory_subject_photos": mandatory_subject_photos,
        "MANDATORY_SUBJECT_PHOTOS": mandatory_subject_photos,
        "photo_room_counts": photo_room_counts,
        "PHOTO_ROOM_COUNTS": photo_room_counts,
    }
