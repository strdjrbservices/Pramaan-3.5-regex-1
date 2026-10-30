#!/usr/bin/env python3
"""
Subject Photo Extractor (subject_photo_extractor.py)
===================================================
Automated high-precision extraction pipeline for mandatory Subject property photos
from MISMO XML 2.6 appraisal reports and standalone PDF appraisal documents.

Mandatory Views Targeted:
-------------------------
1. Subject Front View (Front View / Subject Front / Front of Subject)
2. Subject Rear View (Rear View / Subject Rear / Rear of Subject)
3. Subject Side View (Side View / Subject Side / Left Side / Right Side)
4. Subject Street Scene (Subject Street / Street Scene / Street View)

Capabilities:
-------------
- Automatically decodes Base64 embedded PDFs from MISMO XML (<DOCUMENT>, <EMBEDDED_FILE>).
- Parses native XML image attachments (<IMAGE>, <PHOTO>, <ATTACHMENT>) if present.
- Processes standalone PDF appraisal files directly (Form 1004, 1073, 1025, 2055, etc.).
- Multi-software strip reconstruction (TOTAL by a la mode, ACI, ClickFORMS, Bradford).
- Intelligent multi-directional spatial label pairing (Right, Below, Above, Multi-column).
- Extracts high-resolution cropped images, coordinates, page numbers, and exact labels.
- Validates mandatory fulfillment and reports missing photos with complete audit trail.
- CLI and Python API with JSON, CSV, and image export.
"""

import os
import sys
import re
import csv
import json
import base64
import argparse
from typing import List, Dict, Any, Optional, Tuple, Union

fitz: Any = None
try:
    import fitz  # PyMuPDF
except ImportError:
    try:
        import pymupdf as fitz
    except ImportError:
        fitz = None

try:
    import xml.etree.ElementTree as ET
except ImportError:
    ET = None


MANDATORY_SUBJECT_VIEWS = [
    "Subject Front View",
    "Subject Rear View",
    "Subject Side View",
    "Subject Street Scene"
]

VIEW_ALIASES = {
    "Subject Front View": ["front", "subject front", "front view", "subject front view"],
    "Subject Rear View": ["rear", "subject rear", "rear view", "subject rear view"],
    "Subject Side View": ["side", "subject side", "side view", "subject side view", "left side", "right side"],
    "Subject Street Scene": ["street", "subject street", "street scene", "street view", "subject street scene"]
}


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

    # 1. Noise Rejection (Form boilerplate, appraisal metadata, comp labels)
    if any(k in lbl_upper for k in [
        "FORM PIC", "TOTAL APPRAISAL", "1-800-ALAMODE", "BORROWER", "LENDER", "CLIENT",
        "FILE NO", "APPRAISED VALUE", "APPRAISED DATE", "PRODUCED USING ACI", "WWW.ACIWEB",
        "CASE NO", "PROPERTY ADDRESS", "COUNTY", "ZIP CODE", "INSPECTION DATE",
        "DID INSPECT", "DID NOT INSPECT", "FROM STREET", "COMPARABLE SALE", "RENTAL #"
    ]):
        return None

    # Exclude map / zoning street labels
    if "CITY STREET VIEW" in lbl_upper and any(k in ctx_upper for k in ["MAP", "LOCATION", "AERIAL", "FLOOD", "TAX"]):
        return None

    # Exclude comparable / rental photos
    if re.search(r'\b(?:COMPARABLE|COMP\s*#?\s*\d+|RENTAL\s*#?\s*\d+|LISTING\s*#?\s*\d+)\b', lbl_upper):
        return None

    # Exclude interior rooms (unless labeled as side/rear view with interior note)
    if any(k in lbl_upper for k in [
        "KITCHEN", "BATHROOM", "BEDROOM", "DINING", "LIVING ROOM", "FAMILY ROOM",
        "ATTIC", "CRAWL SPACE", "HVAC", "WATER HEATER", "FURNACE", "ELECTRICAL PANEL",
        "SMOKE", "CARBON MONOXIDE", "DETECTOR"
    ]) and not any(k in lbl_upper for k in ["FRONT", "REAR", "SIDE", "STREET"]):
        return None

    # 2. Subject Front View
    if re.search(r'\b(?:SUBJECT\s+FRONT(?:\s+VIEW)?|FRONT\s+VIEW(?:\s+OF\s+SUBJECT(?:\s+PROPERTY)?)?|DWELLING\s+FRONT|FRONT\s+OF\s+SUBJECT|FRONT\s+ELEVATION)\b', lbl_upper):
        return ("Subject Front View", lbl)
    if lbl_upper in ["FRONT", "FRONT VIEW", "SUBJECT FRONT", "SUBJECT FRONT ENTRANCE"]:
        return ("Subject Front View", lbl)

    # 3. Subject Rear View
    if re.search(r'\b(?:SUBJECT\s+REAR(?:\s+VIEW)?|REAR\s+VIEW(?:\s+OF\s+SUBJECT(?:\s+PROPERTY)?)?|DWELLING\s+REAR|REAR\s+OF\s+SUBJECT|REAR\s+ELEVATION)\b', lbl_upper):
        return ("Subject Rear View", lbl)
    if lbl_upper in ["REAR", "REAR VIEW", "SUBJECT REAR"]:
        return ("Subject Rear View", lbl)

    # 4. Subject Side View (Including Left / Right / Front-Side / Rear-Side)
    if re.search(r'\b(?:SUBJECT\s+SIDE(?:\s+VIEW)?|(?:LEFT|RIGHT)\s+SIDE\s+VIEW|SIDE\s+VIEW(?:\s+OF\s+SUBJECT(?:\s+PROPERTY)?)?|SUBJECT\s+(?:LEFT|RIGHT)\s+SIDE|(?:LEFT|RIGHT)\s+SIDE|SIDE\s+ELEVATION|FRONT/SIDE\s+VIEW|REAR/SIDE\s+VIEW|SIDE\s+&\s+FRONT\s+VIEW|SIDE\s+VIEW,\s*PANEL)\b', lbl_upper):
        return ("Subject Side View", lbl)
    if lbl_upper in ["SIDE", "SIDE VIEW", "SUBJECT SIDE", "RIGHT SIDE", "LEFT SIDE", "LEFT SIDE VIEW", "RIGHT SIDE VIEW"]:
        return ("Subject Side View", lbl)

    # 5. Subject Street Scene
    if re.search(r'\b(?:SUBJECT\s+STREET(?:\s+SCENE|\s+VIEW)?|STREET\s+SCENE(?:\s+OF\s+SUBJECT(?:\s+PROPERTY)?)?|SUBJECT\s+STREET|STREET\s+VIEW(?:\s+OF\s+SUBJECT(?:\s+PROPERTY)?)?|NEIGHBORHOOD\s+STREET\s+SCENE|ALTERNATE\s+STREET\s+SCENE|PROPERTY\s+ACCESS\s*\(STREET\s*SCENE\))\b', lbl_upper):
        return ("Subject Street Scene", lbl)
    if lbl_upper in ["STREET", "STREET SCENE", "STREET VIEW", "SUBJECT STREET"]:
        return ("Subject Street Scene", lbl)

    return None


class SubjectPhotoExtractor:
    """
    Automated extractor for mandatory Subject Property Photos from XML and PDF appraisal reports.
    """

    def __init__(self, dpi: int = 150, output_dir: Optional[str] = None, save_images: bool = False):
        self.dpi = dpi
        self.output_dir = output_dir or "subject_photos_output"
        self.save_images = save_images
        if self.save_images and self.output_dir:
            os.makedirs(self.output_dir, exist_ok=True)

    def extract_from_file(self, file_path_or_bytes: Union[str, bytes, os.PathLike], file_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Main entry point. Automatically detects XML vs PDF format, decodes embedded content,
        and extracts mandatory Subject photos.
        """
        raw_bytes = None
        source_name = file_name or "appraisal_report"

        if isinstance(file_path_or_bytes, (str, os.PathLike)):
            path_str = str(file_path_or_bytes)
            if not os.path.exists(path_str):
                return {
                    "status": "error",
                    "message": f"File not found: {path_str}",
                    "all_mandatory_found": False,
                    "mandatory_photos": {v: [] for v in MANDATORY_SUBJECT_VIEWS},
                    "summary": {v: {"found": False, "count": 0, "original_labels": []} for v in MANDATORY_SUBJECT_VIEWS},
                    "missing_views": MANDATORY_SUBJECT_VIEWS[:]
                }
            source_name = os.path.basename(path_str)
            with open(path_str, "rb") as f:
                raw_bytes = f.read()
        elif isinstance(file_path_or_bytes, bytes):
            raw_bytes = file_path_or_bytes
        else:
            return {
                "status": "error",
                "message": "Invalid input type. Expected file path or bytes.",
                "all_mandatory_found": False,
                "mandatory_photos": {v: [] for v in MANDATORY_SUBJECT_VIEWS},
                "summary": {v: {"found": False, "count": 0, "original_labels": []} for v in MANDATORY_SUBJECT_VIEWS},
                "missing_views": MANDATORY_SUBJECT_VIEWS[:]
            }

        # Check if input is XML
        is_xml = False
        try:
            head = raw_bytes[:1000].strip()
            if head.startswith(b"<?xml") or b"<VALUATION" in head or b"<DOCUMENT" in head or b"<MESSAGE" in head:
                is_xml = True
            elif source_name.lower().endswith(".xml"):
                is_xml = True
        except Exception:
            pass

        if is_xml:
            return self._extract_from_xml_bytes(raw_bytes, source_name=source_name)
        else:
            return self._extract_from_pdf_bytes(raw_bytes, source_name=source_name)

    def _extract_from_xml_bytes(self, xml_bytes: bytes, source_name: str) -> Dict[str, Any]:
        """Extracts mandatory photos from XML via embedded PDF and/or direct XML tags."""
        xml_text = xml_bytes.decode("utf-8", errors="ignore")

        # 1. Check for Embedded PDF inside XML (<DOCUMENT> or <EMBEDDED_FILE>)
        pdf_bytes = None
        m_doc = re.search(r"<DOCUMENT[^>]*>([A-Za-z0-9+/=\s]{1000,})</DOCUMENT>", xml_text)
        if not m_doc:
            m_doc = re.search(r"<EMBEDDED_FILE[^>]*>([A-Za-z0-9+/=\s]{1000,})</EMBEDDED_FILE>", xml_text)

        if m_doc:
            try:
                b64_clean = re.sub(r"\s+", "", m_doc.group(1))
                pdf_bytes = base64.b64decode(b64_clean)
            except Exception:
                pdf_bytes = None

        pdf_result = None
        if pdf_bytes:
            pdf_result = self._extract_from_pdf_bytes(pdf_bytes, source_name=source_name, file_type="xml_embedded_pdf")

        # 2. Check for native XML image tags (e.g. <IMAGE>, <PHOTO>, <ATTACHMENT>)
        xml_tag_photos = self._extract_from_xml_tags(xml_text, source_name=source_name)

        # Merge results if both exist
        if pdf_result and pdf_result.get("status") == "success":
            if xml_tag_photos:
                for v_type, p_list in xml_tag_photos.items():
                    if not pdf_result["mandatory_photos"].get(v_type):
                        pdf_result["mandatory_photos"][v_type].extend(p_list)
                # Recompute summary
                self._recalculate_summary(pdf_result)
            pdf_result["file_type"] = "xml"
            pdf_result["source_file"] = source_name
            return pdf_result

        elif xml_tag_photos and any(len(v) > 0 for v in xml_tag_photos.values()):
            return self._package_results(xml_tag_photos, file_type="xml_tags", source_name=source_name)

        return {
            "status": "error",
            "message": "No embedded PDF or image attachments found in XML.",
            "file_type": "xml",
            "source_file": source_name,
            "all_mandatory_found": False,
            "mandatory_photos": {v: [] for v in MANDATORY_SUBJECT_VIEWS},
            "summary": {v: {"found": False, "count": 0, "original_labels": []} for v in MANDATORY_SUBJECT_VIEWS},
            "missing_views": MANDATORY_SUBJECT_VIEWS[:]
        }

    def _extract_from_xml_tags(self, xml_text: str, source_name: str) -> Dict[str, List[Dict[str, Any]]]:
        """Parses native XML image elements if present without embedded PDF."""
        results: Dict[str, List[Dict[str, Any]]] = {v: [] for v in MANDATORY_SUBJECT_VIEWS}
        if not ET:
            return results

        try:
            root = ET.fromstring(xml_text.encode("utf-8"))
        except Exception:
            return results

        img_nodes = []
        for elem in root.iter():
            tag_name = elem.tag.split("}")[-1].upper()
            if tag_name in ["IMAGE", "PHOTO", "ATTACHMENT", "EMBEDDED_IMAGE", "_IMAGE", "_PHOTO"]:
                img_nodes.append(elem)

        for idx, node in enumerate(img_nodes):
            raw_b64 = node.text.strip() if node.text else ""
            if len(raw_b64) < 100:
                continue

            # Extract label from attributes or child elements
            candidate_labels = []
            for attr_name in ["_Type", "Type", "_Description", "Description", "Name", "Caption", "Title", "_Name"]:
                if attr_name in node.attrib:
                    candidate_labels.append(node.attrib[attr_name])
            for child in node:
                c_tag = child.tag.split("}")[-1].upper()
                if any(k in c_tag for k in ["TYPE", "DESC", "NAME", "CAPTION", "TITLE"]) and child.text:
                    candidate_labels.append(child.text.strip())

            for cl in candidate_labels:
                res = classify_subject_view_label(cl)
                if res:
                    v_type, orig_lbl = res
                    p_id = f"{v_type.lower().replace(' ', '_')}_{len(results[v_type]) + 1}"
                    photo_item = {
                        "id": p_id,
                        "view_type": v_type,
                        "original_label": orig_lbl,
                        "caption": v_type,
                        "category": "Subject",
                        "page": 1,
                        "source": "xml_tag",
                        "base64_image": f"data:image/jpeg;base64,{raw_b64}",
                    }
                    if self.save_images and self.output_dir:
                        photo_item["saved_path"] = self._save_image_to_disk(
                            base64.b64decode(raw_b64), source_name, v_type, 1, len(results[v_type]) + 1
                        )
                    results[v_type].append(photo_item)
                    break

        return results

    def _extract_from_pdf_bytes(self, pdf_bytes: bytes, source_name: str, file_type: str = "pdf") -> Dict[str, Any]:
        """Core extraction engine utilizing PyMuPDF for spatial and visual document parsing."""
        if not fitz:
            return {
                "status": "error",
                "message": "PyMuPDF (fitz) is required for PDF extraction.",
                "file_type": file_type,
                "source_file": source_name,
                "all_mandatory_found": False,
                "mandatory_photos": {v: [] for v in MANDATORY_SUBJECT_VIEWS},
                "summary": {v: {"found": False, "count": 0, "original_labels": []} for v in MANDATORY_SUBJECT_VIEWS},
                "missing_views": MANDATORY_SUBJECT_VIEWS[:]
            }

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to open PDF: {str(e)}",
                "file_type": file_type,
                "source_file": source_name,
                "all_mandatory_found": False,
                "mandatory_photos": {v: [] for v in MANDATORY_SUBJECT_VIEWS},
                "summary": {v: {"found": False, "count": 0, "original_labels": []} for v in MANDATORY_SUBJECT_VIEWS},
                "missing_views": MANDATORY_SUBJECT_VIEWS[:]
            }

        mandatory_photos: Dict[str, List[Dict[str, Any]]] = {v: [] for v in MANDATORY_SUBJECT_VIEWS}

        # Page filtering: Identify pages containing photo addenda
        skip_headers = [
            "UNIFORM RESIDENTIAL APPRAISAL REPORT", "SMALL RESIDENTIAL INCOME PROPERTY",
            "INDIVIDUAL CONDOMINIUM UNIT", "APPRAISER'S CERTIFICATION", "SUPERVISORY APPRAISER",
            "APPRAISER INDEPENDENCE", "INVOICE", "ENGAGEMENT LETTER", "SCOPE OF WORK",
            "PRIVACY NOTICE", "LOCATION MAP", "FLOOD MAP", "AERIAL MAP", "TAX MAP", "PLAT MAP"
        ]
        photo_override_headers = [
            "SUBJECT PROPERTY PHOTO", "SUBJECT PHOTO", "PHOTOGRAPH ADDENDUM",
            "PHOTO ADDENDUM", "ADDITIONAL PHOTOS", "EXTERIOR PHOTO", "PICPIX", "PIC3", "PIC6", "PICINT"
        ]

        photo_pages = []
        for p_idx in range(len(doc)):
            p = doc[p_idx]
            txt = (p.get_text()[:400] or "").upper()
            if any(h in txt for h in photo_override_headers):
                photo_pages.append(p_idx)
            elif not any(h in txt for h in skip_headers) and len(p.get_image_info()) > 0:
                photo_pages.append(p_idx)

        # Iterate through candidate photo pages
        for p_idx in photo_pages:
            page = doc[p_idx]
            img_infos = page.get_image_info()
            if not img_infos:
                continue

            # Collect placed image rects (keep strips >= 5pt for merge)
            rects = []
            for info in img_infos:
                b = info.get("bbox")
                if b:
                    r = fitz.Rect(b)
                    if r.width >= 40 and r.height >= 5:
                        rects.append(r)

            if not rects:
                continue

            # Merge horizontal/vertical strips (TOTAL and ACI tiling)
            clusters: List[Any] = []
            rects.sort(key=lambda r: (round(r.x0 / 20), r.y0))
            for r in rects:
                merged = False
                for c in clusters:
                    is_slice = (c.height < 60 or r.height < 60)
                    overlaps = (r.y0 < c.y1 - 5)
                    if abs(c.x0 - r.x0) < 18 and abs(c.x1 - r.x1) < 18 and (overlaps or (is_slice and r.y0 <= c.y1 + 15)):
                        c.y1 = max(c.y1, r.y1)
                        merged = True
                        break
                if not merged:
                    clusters.append(fitz.Rect(r))

            photo_frames = [c for c in clusters if c.width >= 60 and c.height >= 50 and (c.width * c.height) >= 4000]
            photo_frames.sort(key=lambda r: (round(r.y0 / 30), r.x0))
            page_ctx = page.get_text()[:350]

            for f_idx, frame in enumerate(photo_frames):
                # 1. Right text (TOTAL & ACI 3-photo layouts)
                r_right = fitz.Rect(frame.x1 - 5, max(frame.y0 - 15, 0), min(frame.x1 + 250, page.rect.width), min(frame.y1 + 15, page.rect.height))
                txt_right = page.get_text("text", clip=r_right).strip()

                # 2. Below text (ACI 6-photo & TOTAL PICSIX layouts)
                r_below = fitz.Rect(max(frame.x0 - 10, 0), frame.y1 - 2, min(frame.x1 + 10, page.rect.width), min(frame.y1 + 45, page.rect.height))
                txt_below = page.get_text("text", clip=r_below).strip()

                # 3. Above text
                r_above = fitz.Rect(max(frame.x0 - 10, 0), max(frame.y0 - 35, 0), min(frame.x1 + 10, page.rect.width), frame.y0 + 2)
                txt_above = page.get_text("text", clip=r_above).strip()

                candidate_labels = []
                if txt_right:
                    candidate_labels.extend([l.strip() for l in txt_right.split("\n") if l.strip()][:3])
                if txt_below:
                    candidate_labels.extend([l.strip() for l in txt_below.split("\n") if l.strip()][:2])
                if txt_above:
                    candidate_labels.extend([l.strip() for l in txt_above.split("\n") if l.strip()][:2])

                matched = False
                for cl in candidate_labels:
                    res = classify_subject_view_label(cl, page_context=page_ctx)
                    if res:
                        v_type, orig_lbl = res
                        pix = page.get_pixmap(clip=frame, dpi=self.dpi)
                        img_bytes = pix.tobytes("jpeg")
                        b64_str = base64.b64encode(img_bytes).decode("ascii")

                        p_id = f"{v_type.lower().replace(' ', '_')}_{len(mandatory_photos[v_type]) + 1}"
                        photo_item = {
                            "id": p_id,
                            "view_type": v_type,
                            "original_label": orig_lbl,
                            "caption": v_type,
                            "category": "Subject",
                            "page": p_idx + 1,
                            "rect": [round(frame.x0, 1), round(frame.y0, 1), round(frame.x1, 1), round(frame.y1, 1)],
                            "width": pix.width,
                            "height": pix.height,
                            "base64_image": f"data:image/jpeg;base64,{b64_str}",
                            "source": "page_crop"
                        }
                        if self.save_images and self.output_dir:
                            photo_item["saved_path"] = self._save_image_to_disk(
                                img_bytes, source_name, v_type, p_idx + 1, len(mandatory_photos[v_type]) + 1
                            )

                        mandatory_photos[v_type].append(photo_item)
                        matched = True
                        break

                # 4. Spatial Layout Fallback for standard 3-photo pages (Top = Front, Middle = Rear, Bottom = Street)
                if not matched and len(photo_frames) == 3 and any(h in page_ctx.upper() for h in [
                    "SUBJECT PROPERTY PHOTO", "SUBJECT PHOTO PAGE", "SUBJECT PHOTOS", "SUBJECT PROPERTY"
                ]):
                    pix = page.get_pixmap(clip=frame, dpi=self.dpi)
                    img_bytes = pix.tobytes("jpeg")
                    b64_str = base64.b64encode(img_bytes).decode("ascii")

                    if f_idx == 0 and not mandatory_photos["Subject Front View"]:
                        p_item = self._create_spatial_fallback_item("Subject Front View", "Slot 1 (Top)", p_idx + 1, frame, pix, b64_str, img_bytes, source_name)
                        mandatory_photos["Subject Front View"].append(p_item)
                    elif f_idx == 1 and not mandatory_photos["Subject Rear View"]:
                        p_item = self._create_spatial_fallback_item("Subject Rear View", "Slot 2 (Middle)", p_idx + 1, frame, pix, b64_str, img_bytes, source_name)
                        mandatory_photos["Subject Rear View"].append(p_item)
                    elif f_idx == 2 and not mandatory_photos["Subject Street Scene"]:
                        p_item = self._create_spatial_fallback_item("Subject Street Scene", "Slot 3 (Bottom)", p_idx + 1, frame, pix, b64_str, img_bytes, source_name)
                        mandatory_photos["Subject Street Scene"].append(p_item)

        return self._package_results(mandatory_photos, file_type=file_type, source_name=source_name, page_count=len(doc))

    def _create_spatial_fallback_item(
        self, view_type: str, slot_desc: str, page_num: int, frame: Any, pix: Any, b64_str: str, img_bytes: bytes, source_name: str
    ) -> Dict[str, Any]:
        p_id = f"{view_type.lower().replace(' ', '_')}_1"
        item = {
            "id": p_id,
            "view_type": view_type,
            "original_label": f"{view_type} (Inferred from Standard {slot_desc})",
            "caption": view_type,
            "category": "Subject",
            "page": page_num,
            "rect": [round(frame.x0, 1), round(frame.y0, 1), round(frame.x1, 1), round(frame.y1, 1)],
            "width": pix.width,
            "height": pix.height,
            "base64_image": f"data:image/jpeg;base64,{b64_str}",
            "source": "spatial_slot_inference"
        }
        if self.save_images and self.output_dir:
            item["saved_path"] = self._save_image_to_disk(img_bytes, source_name, view_type, page_num, 1)
        return item

    def _save_image_to_disk(self, img_bytes: bytes, source_name: str, view_type: str, page_num: int, count: int) -> str:
        clean_stem = re.sub(r"[^\w\-]", "_", os.path.splitext(os.path.basename(source_name))[0])
        file_dir = os.path.join(self.output_dir, clean_stem)
        os.makedirs(file_dir, exist_ok=True)

        clean_view = view_type.replace(" ", "_")
        img_name = f"{clean_view}_p{page_num}_{count}.jpg"
        full_path = os.path.join(file_dir, img_name)
        with open(full_path, "wb") as f:
            f.write(img_bytes)
        return full_path

    def _package_results(
        self, mandatory_photos: Dict[str, List[Dict[str, Any]]], file_type: str, source_name: str, page_count: int = 1
    ) -> Dict[str, Any]:
        summary: Dict[str, Any] = {}
        missing_views: List[str] = []
        all_photos: List[Dict[str, Any]] = []

        for mv in MANDATORY_SUBJECT_VIEWS:
            items = mandatory_photos.get(mv, [])
            found = len(items) > 0
            summary[mv] = {
                "found": found,
                "count": len(items),
                "original_labels": [item["original_label"] for item in items],
                "pages": [item["page"] for item in items]
            }
            if not found:
                missing_views.append(mv)
            all_photos.extend(items)

        return {
            "status": "success",
            "file_type": file_type,
            "source_file": source_name,
            "page_count": page_count,
            "all_mandatory_found": len(missing_views) == 0,
            "summary": summary,
            "missing_views": missing_views,
            "mandatory_photos": mandatory_photos,
            "all_extracted_photos": all_photos,
            "total_subject_photos_count": len(all_photos)
        }

    def _recalculate_summary(self, result: Dict[str, Any]):
        mandatory_photos = result.get("mandatory_photos", {})
        summary = {}
        missing_views = []
        all_photos = []
        for mv in MANDATORY_SUBJECT_VIEWS:
            items = mandatory_photos.get(mv, [])
            found = len(items) > 0
            summary[mv] = {
                "found": found,
                "count": len(items),
                "original_labels": [item.get("original_label", "") for item in items],
                "pages": [item.get("page", 1) for item in items]
            }
            if not found:
                missing_views.append(mv)
            all_photos.extend(items)
        result["summary"] = summary
        result["missing_views"] = missing_views
        result["all_mandatory_found"] = len(missing_views) == 0
        result["all_extracted_photos"] = all_photos
        result["total_subject_photos_count"] = len(all_photos)


def extract_mandatory_subject_photos(
    file_path_or_bytes: Union[str, bytes, os.PathLike],
    dpi: int = 150,
    output_dir: Optional[str] = None,
    save_images: bool = False
) -> Dict[str, Any]:
    """
    Convenience functional API to extract mandatory Subject photos from an appraisal XML or PDF file.

    Usage:
    ------
    >>> from subject_photo_extractor import extract_mandatory_subject_photos
    >>> result = extract_mandatory_subject_photos("report.xml", save_images=True, output_dir="photos")
    >>> print(result["all_mandatory_found"])
    True
    >>> for photo in result["mandatory_photos"]["Subject Front View"]:
    ...     print(photo["original_label"], photo["page"])
    """
    extractor = SubjectPhotoExtractor(dpi=dpi, output_dir=output_dir, save_images=save_images)
    return extractor.extract_from_file(file_path_or_bytes)


# -----------------------------------------------------------------------------
# Command-Line Interface (CLI)
# -----------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Mandatory Subject Photo Extractor for XML & PDF Appraisal Reports"
    )
    parser.add_argument("input", help="Path to XML file, PDF file, or directory of reports")
    parser.add_argument("--output-dir", default="subject_photos_output", help="Directory to save extracted images and reports")
    parser.add_argument("--save-images", action="store_true", help="Save extracted images to disk as JPG files")
    parser.add_argument("--dpi", type=int, default=150, help="Image extraction resolution DPI (default: 150)")
    parser.add_argument("--json", action="store_true", help="Print structured JSON result to stdout")
    parser.add_argument("--csv", action="store_true", help="Export summary CSV to output directory")

    args = parser.parse_args()

    input_path = args.input
    if not os.path.exists(input_path):
        print(f"Error: Input path does not exist: {input_path}", file=sys.stderr)
        sys.exit(1)

    files_to_process = []
    if os.path.isdir(input_path):
        for root_dir, _, filenames in os.walk(input_path):
            for fn in filenames:
                if fn.lower().endswith((".xml", ".pdf")):
                    files_to_process.append(os.path.join(root_dir, fn))
    else:
        files_to_process.append(input_path)

    extractor = SubjectPhotoExtractor(
        dpi=args.dpi,
        output_dir=args.output_dir,
        save_images=args.save_images
    )

    all_results = []
    print(f"\nProcessing {len(files_to_process)} appraisal report(s)...")
    print("=" * 80)

    for fp in files_to_process:
        fname = os.path.basename(fp)
        res = extractor.extract_from_file(fp, file_name=fname)
        all_results.append(res)

        status_tag = "ALL 4 FOUND" if res["all_mandatory_found"] else f"MISSING: {', '.join(res['missing_views'])}"
        s = res["summary"]
        f_cnt = s["Subject Front View"]["count"]
        r_cnt = s["Subject Rear View"]["count"]
        sd_cnt = s["Subject Side View"]["count"]
        st_cnt = s["Subject Street Scene"]["count"]

        print(f"[{status_tag}] {fname}")
        print(f"    Front ({f_cnt}): {s['Subject Front View']['original_labels']}")
        print(f"    Rear  ({r_cnt}): {s['Subject Rear View']['original_labels']}")
        print(f"    Side  ({sd_cnt}): {s['Subject Side View']['original_labels']}")
        print(f"    Street({st_cnt}): {s['Subject Street Scene']['original_labels']}")
        print("-" * 80)

    # Save JSON summary
    os.makedirs(args.output_dir, exist_ok=True)
    json_path = os.path.join(args.output_dir, "subject_photos_summary.json")

    # Serialize without heavy base64 for JSON export
    clean_summary_data = []
    for r in all_results:
        item_copy = {
            "source_file": r.get("source_file"),
            "file_type": r.get("file_type"),
            "all_mandatory_found": r.get("all_mandatory_found"),
            "missing_views": r.get("missing_views"),
            "summary": r.get("summary"),
            "total_subject_photos_count": r.get("total_subject_photos_count"),
            "photos": []
        }
        for p in r.get("all_extracted_photos", []):
            p_clean = {k: v for k, v in p.items() if k != "base64_image"}
            item_copy["photos"].append(p_clean)
        clean_summary_data.append(item_copy)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(clean_summary_data, f, indent=2)
    print(f"\nSummary JSON exported to: {json_path}")

    # Save CSV summary if requested
    if args.csv:
        csv_path = os.path.join(args.output_dir, "subject_photos_summary.csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "File Name", "All Mandatory Found", "Front Found", "Front Labels",
                "Rear Found", "Rear Labels", "Side Found", "Side Labels",
                "Street Found", "Street Labels", "Missing Views"
            ])
            for r in all_results:
                s = r.get("summary", {})
                writer.writerow([
                    r.get("source_file"),
                    "YES" if r.get("all_mandatory_found") else "NO",
                    s.get("Subject Front View", {}).get("count", 0),
                    "; ".join(s.get("Subject Front View", {}).get("original_labels", [])),
                    s.get("Subject Rear View", {}).get("count", 0),
                    "; ".join(s.get("Subject Rear View", {}).get("original_labels", [])),
                    s.get("Subject Side View", {}).get("count", 0),
                    "; ".join(s.get("Subject Side View", {}).get("original_labels", [])),
                    s.get("Subject Street Scene", {}).get("count", 0),
                    "; ".join(s.get("Subject Street Scene", {}).get("original_labels", [])),
                    "; ".join(r.get("missing_views", []))
                ])
        print(f"Summary CSV exported to: {csv_path}")

    if args.json:
        print(json.dumps(clean_summary_data, indent=2))


if __name__ == "__main__":
    main()
