import os
import re
import sys
import json
import time
import shutil
import base64
import difflib
import argparse
from datetime import datetime
from playwright.sync_api import sync_playwright
try:
    from .utils import (
        logger,
        check_pause_state_sync,
        FULL_FILE_PATH,
        HTML_FILES_PATH,
        NEW_FILES_REVISED_PATH,
        OLD_FILES_REVISED_PATH,
        LETTERS_PATH,
        get_browser_config,
    )
except ImportError:
    from utils import (
        logger,
        check_pause_state_sync,
        FULL_FILE_PATH,
        HTML_FILES_PATH,
        NEW_FILES_REVISED_PATH,
        OLD_FILES_REVISED_PATH,
        LETTERS_PATH,
        get_browser_config,
    )


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_DIR = str(FULL_FILE_PATH)
REVISED_DIR = str(NEW_FILES_REVISED_PATH)
OLD_DIR = str(OLD_FILES_REVISED_PATH)
LETTERS_DIR = str(LETTERS_PATH)

for d in [PDF_DIR, REVISED_DIR, OLD_DIR, str(HTML_FILES_PATH), LETTERS_DIR]:
    os.makedirs(d, exist_ok=True)

def update_status(status, message, progress=0, mode='full_file'):
    """Updates the automation status in a JSON file for monitoring."""
    data = {
        "status": status,
        "message": message,
        "progress": progress,
        "last_update": datetime.now().isoformat()
    }
    status_file = os.path.join(BASE_DIR, f"fastapp_status_{mode}.json")
    try:
        with open(status_file, 'w') as f:
            json.dump(data, f)
    except Exception as e:
        logger.error(f"Failed to update status file: {e}")

def classify_reports_table_links(table_locator):
    """
    Finds XML and PDF report links in the reportsTable, excluding utility/action links
    like 'GET PDF FROM XML', 'Run RealView', 'Run CrossCheck', etc.
    """
    links = table_locator.locator("a").all()
    xml_links = []
    pdf_links = []

    for link in links:
        href = (link.get_attribute("href") or "").strip()
        text = link.inner_text().strip()
        href_lower = href.lower()
        text_lower = text.lower()

        # Skip utility / action links
        if any(kw in href_lower or kw in text_lower for kw in [
            "optype=extractpdf", "extractpdf", "realview", "crosscheck", "generateapo", "javascript:"
        ]):
            continue

        # Check XML link
        if "reporttype=xml" in href_lower or text_lower.endswith(".xml"):
            xml_links.append((link, text, href))
        # Check PDF link
        elif text_lower.endswith(".pdf") or ("openreport.aspx" in href_lower and "reporttype=xml" not in href_lower):
            pdf_links.append((link, text, href))

    return xml_links, pdf_links

def download_pdfs_for_order(page, appr_id, mode='full_file', download_pref='appr_id', appraisal_no=None):
    """Navigates to the order detail page and downloads XML and PDF reports."""
    name_id = appraisal_no if appraisal_no else appr_id

    if mode == 'update_review':
        has_revised = (
            os.path.exists(os.path.join(REVISED_DIR, f"{name_id}_revised.xml")) or
            os.path.exists(os.path.join(REVISED_DIR, f"{name_id}_revised.pdf"))
        )
        has_old = (
            os.path.exists(os.path.join(OLD_DIR, f"{name_id}.xml")) or
            os.path.exists(os.path.join(OLD_DIR, f"{name_id}.pdf"))
        )
        has_html = os.path.exists(os.path.join(str(HTML_FILES_PATH), f"{name_id}.html"))

        if has_revised and has_old and has_html:
            logger.info(f"Order {name_id} already fully processed locally (revised, old, and html exist). Skipping.")
            return -1

    elif mode == 'full_file':
        has_report = (
            os.path.exists(os.path.join(PDF_DIR, f"{name_id}.xml")) or
            os.path.exists(os.path.join(PDF_DIR, f"{name_id}.pdf"))
        )
        if not has_report and os.path.exists(PDF_DIR):
            has_report = any(name_id.lower() in f.lower() for f in os.listdir(PDF_DIR) if f.lower().endswith(('.xml', '.pdf')))

        has_html = os.path.exists(os.path.join(str(HTML_FILES_PATH), f"{name_id}.html"))

        el_patterns = [
            f"{name_id}_engagement_letter.pdf",
            f"{name_id}_engagement_letter.docx",
            f"{name_id}_engagement_letter.doc",
            f"{name_id}.pdf",
            f"{name_id}.docx",
            f"{name_id}.doc",
            f"{name_id}_engagement.pdf",
            f"{name_id}_el.pdf",
            f"{name_id}_letter.pdf",
        ]
        has_letter = any(os.path.exists(os.path.join(LETTERS_DIR, pat)) for pat in el_patterns)
        if not has_letter and os.path.exists(LETTERS_DIR):
            has_letter = any(name_id.lower() in f.lower() for f in os.listdir(LETTERS_DIR) if f.lower().endswith(('.pdf', '.doc', '.docx')))

        if has_report and has_html and has_letter:
            logger.info(f"Order {name_id} already fully processed locally (report, HTML, and engagement letter exist). Skipping.")
            return -1

    try:
        url = f"https://fastapp.spurams.com/ViewAppraisal.aspx?ApprID={appr_id}"
        page.goto(url)
        page.wait_for_load_state("networkidle")

        count = 0
        if mode == 'update_review':
            revised_base_name = ""
            table_selector = "div#lnkDivReports + div table.reportsTable, table.reportsTable"
            try:
                page.wait_for_selector(table_selector, timeout=5000)
                reports_table = page.locator(table_selector).first
                xml_links, pdf_links = classify_reports_table_links(reports_table)
                logger.info(f"Found {len(xml_links)} revised XML link(s) and {len(pdf_links)} revised PDF link(s) for {name_id}")

                # 1. Download revised XML reports
                for i, (link, text, href) in enumerate(xml_links):
                    if not revised_base_name:
                        revised_base_name = text.lower().replace('.pdf', '').replace('.xml', '').strip()
                    logger.info(f"Targeting revised XML report: {text}")

                    if download_pref == 'appr_id':
                        filename = f"{name_id}_revised.xml" if i == 0 else f"{name_id}_revised_{i}.xml"
                    else:
                        filename = text if text.lower().endswith(".xml") else f"{text}.xml"

                    dest = os.path.join(REVISED_DIR, filename)
                    if os.path.exists(dest):
                        logger.info(f"Revised XML report already exists: {dest}")
                    else:
                        with page.expect_download(timeout=20000) as download_info:
                            link.click()
                        download = download_info.value
                        download.save_as(dest)
                        logger.info(f"Saved revised XML report: {dest}")
                        count += 1

                # 2. Download revised PDF reports
                for i, (link, text, href) in enumerate(pdf_links):
                    if not revised_base_name:
                        revised_base_name = text.lower().replace('.pdf', '').replace('.xml', '').strip()
                    logger.info(f"Targeting revised PDF report: {text}")

                    if download_pref == 'appr_id':
                        filename = f"{name_id}_revised.pdf" if i == 0 else f"{name_id}_revised_{i}.pdf"
                    else:
                        filename = text if text.lower().endswith(".pdf") else f"{text}.pdf"

                    dest = os.path.join(REVISED_DIR, filename)
                    if os.path.exists(dest):
                        logger.info(f"Revised PDF report already exists: {dest}")
                    else:
                        with page.expect_download(timeout=20000) as download_info:
                            link.click()
                        download = download_info.value
                        download.save_as(dest)
                        logger.info(f"Saved revised PDF report: {dest}")
                        count += 1

            except Exception as e:
                logger.warning(f"Failed to get revised report for {appr_id}: {e}")

            # 3. Download old report from Other Supporting Documents (grdDocs)
            try:
                other_docs_table = page.locator("#ctl00_cphBody_grdDocs, table:has(th:has-text('Document Type')):visible").first
                links = other_docs_table.locator("a").filter(has_text=re.compile(r'\.(xml|pdf)$', re.IGNORECASE))
                link_count = links.count()

                logger.info(f"Found {link_count} potential XML/PDF links in 'Other Supporting Documents' for {name_id}")

                old_xml_downloaded = False
                old_pdf_downloaded = False

                for i in range(link_count - 1, -1, -1):
                    link = links.nth(i)
                    raw_text = link.inner_text().strip()
                    link_text = raw_text.lower().replace('.pdf', '').replace('.xml', '').strip()

                    if revised_base_name:
                        similarity = difflib.SequenceMatcher(None, revised_base_name, link_text).ratio()
                        logger.info(f"Checking link: '{raw_text}' (Similarity: {similarity:.2f})")
                        if similarity < 0.6 and revised_base_name not in link_text and link_text not in revised_base_name:
                            continue
                        logger.info(f"✅ Matched old file candidate: '{raw_text}'")

                    is_xml = raw_text.lower().endswith(".xml")
                    is_pdf = raw_text.lower().endswith(".pdf")

                    if is_xml and not old_xml_downloaded:
                        dest = os.path.join(OLD_DIR, f"{name_id}.xml") if download_pref == 'appr_id' else os.path.join(OLD_DIR, raw_text)
                        if os.path.exists(dest):
                            logger.info(f"Old XML report already exists at: {dest}")
                        else:
                            with page.expect_download(timeout=20000) as download_info:
                                link.click()
                            download = download_info.value
                            download.save_as(dest)
                            logger.info(f"Successfully saved old XML report: {dest}")
                            count += 1
                        old_xml_downloaded = True

                    elif is_pdf and not old_pdf_downloaded:
                        dest = os.path.join(OLD_DIR, f"{name_id}.pdf") if download_pref == 'appr_id' else os.path.join(OLD_DIR, raw_text)
                        if os.path.exists(dest):
                            logger.info(f"Old PDF report already exists at: {dest}")
                        else:
                            with page.expect_download(timeout=20000) as download_info:
                                link.click()
                            download = download_info.value
                            download.save_as(dest)
                            logger.info(f"Successfully saved old PDF report: {dest}")
                            count += 1
                        old_pdf_downloaded = True

            except Exception as e:
                logger.warning(f"Failed to get old report for {appr_id}: {e}")

            # 4. Save Order Form HTML
            try:
                html_dest = os.path.join(str(HTML_FILES_PATH), f"{name_id}.html")
                if os.path.exists(html_dest):
                    logger.info(f"Order form HTML already exists: {html_dest}")
                else:
                    content = page.content()
                    with open(html_dest, "w", encoding="utf-8") as f:
                        f.write(content)
                    logger.info(f"Saved order form HTML: {html_dest}")
                    count += 1
            except Exception as e:
                logger.warning(f"Failed to save order form HTML for {appr_id}: {e}")
            return count

        else:
            # mode == 'full_file'
            # 1. Download Primary XML and Fallback PDF reports from reportsTable
            table_selector = "div#lnkDivReports + div table.reportsTable, table.reportsTable"
            try:
                page.wait_for_selector(table_selector, timeout=5000)
                reports_table = page.locator(table_selector).first
                xml_links, pdf_links = classify_reports_table_links(reports_table)
                logger.info(f"Found {len(xml_links)} XML report link(s) and {len(pdf_links)} PDF report link(s) for {name_id}")

                # Download XML reports
                for i, (link, text, href) in enumerate(xml_links):
                    if download_pref == 'appr_id':
                        filename = f"{name_id}.xml" if i == 0 else f"{name_id}_{i}.xml"
                    else:
                        filename = text if text.lower().endswith(".xml") else f"{name_id}.xml"

                    dest = os.path.join(PDF_DIR, filename)
                    if os.path.exists(dest):
                        logger.info(f"XML report '{filename}' already exists. Skipping.")
                    else:
                        with page.expect_download(timeout=20000) as download_info:
                            link.click()
                        download = download_info.value
                        download.save_as(dest)
                        logger.info(f"Saved XML report as {filename}: {dest}")
                        count += 1

                # Download PDF reports
                for i, (link, text, href) in enumerate(pdf_links):
                    if download_pref == 'appr_id':
                        filename = f"{name_id}.pdf" if i == 0 else f"{name_id}_{i}.pdf"
                    else:
                        filename = text if text.lower().endswith(".pdf") else f"{name_id}.pdf"

                    dest = os.path.join(PDF_DIR, filename)
                    if os.path.exists(dest):
                        logger.info(f"PDF report '{filename}' already exists. Skipping.")
                    else:
                        with page.expect_download(timeout=20000) as download_info:
                            link.click()
                        download = download_info.value
                        download.save_as(dest)
                        logger.info(f"Saved PDF report as {filename}: {dest}")
                        count += 1

            except Exception as e:
                logger.warning(f"Failed to download reports for {appr_id}: {e}")

            # 2. Download Engagement Letter from Other Supporting Documents (grdDocs)
            try:
                docs_table = page.locator("#ctl00_cphBody_grdDocs, table:has(th:has-text('Document Type')):visible").first
                if docs_table.is_visible(timeout=3000):
                    rows = docs_table.locator("tr").all()
                    candidates = []
                    for row in rows:
                        link = row.locator("a[id*='lnkDocumentName'], a[href*='OpenDocument.aspx']").first
                        if link.count() == 0:
                            continue

                        raw_text = (link.inner_text() or "").strip()
                        href = (link.get_attribute("href") or "").strip()
                        if not raw_text and not href:
                            continue

                        doc_type_elem = row.locator(".lblDocumentType, .hdnDocTypeName, span[id*='lblDocumentType'], input[id*='hdnDocTypeName']").first
                        doc_type_text = ""
                        if doc_type_elem.count() > 0:
                            doc_type_text = (doc_type_elem.inner_text() or doc_type_elem.get_attribute("value") or "").strip()

                        raw_lower = raw_text.lower()
                        doc_lower = doc_type_text.lower()

                        is_engagement_letter = False
                        if any(kw in doc_lower for kw in [
                            "statement of engagement", "engagement letter", "engagement", "letter of engagement"
                        ]):
                            is_engagement_letter = True
                        elif any(kw in raw_lower for kw in [
                            "engagementletter", "engagement_letter", "engagement-letter", "statement_of_engagement"
                        ]):
                            is_engagement_letter = True
                        elif "engagement" in raw_lower and raw_lower.endswith(('.pdf', '.doc', '.docx')):
                            is_engagement_letter = True
                        elif any(raw_lower.endswith(sfx) for sfx in ['_el.pdf', '-el.pdf', ' el.pdf']):
                            is_engagement_letter = True
                        elif "letter" in doc_lower and not any(bad in doc_lower for bad in ["rejection", "closing", "welcome", "acknowledgment"]):
                            if raw_lower.endswith(('.pdf', '.doc', '.docx')):
                                is_engagement_letter = True

                        if is_engagement_letter:
                            sub_date_elem = row.locator("span[id*='lblSubmittedOn']").first
                            sub_date = parse_datetime(sub_date_elem.inner_text().strip()) if sub_date_elem.count() > 0 else None
                            candidates.append((link, raw_text, doc_type_text, sub_date))

                    if candidates:
                        candidates.sort(key=lambda x: x[3] or datetime.min, reverse=True)
                        logger.info(f"Found {len(candidates)} Engagement Letter candidate(s) for {name_id}")

                        for i, (link, raw_text, doc_type_text, _) in enumerate(candidates):
                            ext = os.path.splitext(raw_text)[1] if "." in raw_text else ".pdf"
                            if not ext or ext.lower() not in ['.pdf', '.doc', '.docx']:
                                ext = ".pdf"

                            if download_pref == 'appr_id':
                                letter_filename = f"{name_id}_engagement_letter{ext}" if i == 0 else f"{name_id}_engagement_letter_{i}{ext}"
                            else:
                                clean_name = raw_text if raw_text.lower().endswith(('.pdf', '.doc', '.docx')) else f"{raw_text}{ext}"
                                letter_filename = clean_name if clean_name.lower().startswith(name_id.lower()) else f"{name_id}_{clean_name}"

                            dest = os.path.join(LETTERS_DIR, letter_filename)
                            if os.path.exists(dest):
                                logger.info(f"Engagement Letter '{letter_filename}' already exists: {dest}")
                            else:
                                logger.info(f"Targeting Engagement Letter: '{raw_text}' (Type: '{doc_type_text}') -> {letter_filename}")
                                with page.expect_download(timeout=25000) as download_info:
                                    link.click()
                                download = download_info.value
                                download.save_as(dest)
                                logger.info(f"Saved Engagement Letter as {letter_filename}: {dest}")
                                count += 1

                            # Primary (most recent) engagement letter downloaded
                            if i == 0:
                                break
                    else:
                        logger.info(f"No Engagement Letter found in supporting documents for {name_id}")
            except Exception as el_err:
                logger.warning(f"Failed to check/download Engagement Letter for {name_id}: {el_err}")

            # 3. Save Order Form HTML
            try:
                html_dest = os.path.join(str(HTML_FILES_PATH), f"{name_id}.html")
                if os.path.exists(html_dest):
                    logger.info(f"Order form HTML already exists: {html_dest}")
                else:
                    content = page.content()
                    with open(html_dest, "w", encoding="utf-8") as f:
                        f.write(content)
                    logger.info(f"Saved order form HTML: {html_dest}")
                    count += 1
            except Exception as he:
                logger.warning(f"Failed to save order form HTML for {name_id}: {he}")

            logger.info(f"Completed download sequence for {name_id} (New items saved: {count})")
            return count
    except Exception as e:
        logger.error(f"Error downloading for ApprID {appr_id}: {e}")
        return 0

def parse_datetime(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    val = str(val).strip()
    if not val:
        return None
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except ValueError:
        pass

    formats = [
        "%m/%d/%Y %I:%M:%S %p",
        "%m/%d/%Y %I:%M %p",
        "%m/%d/%y %I:%M:%S %p",
        "%m/%d/%y %I:%M %p",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y",
        "%m/%d/%y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(val, fmt)
        except ValueError:
            continue
    return None

def find_date_column_index(headers=None, rows=None):
    if headers:
        date_keywords = ["date", "time", "submitted", "received", "created"]
        for idx, h in enumerate(headers):
            h_lower = str(h).lower()
            if any(kw in h_lower for kw in date_keywords):
                return idx

    if rows:
        try:
            row_count = rows.count() if callable(getattr(rows, 'count', None)) else len(rows)
            start_idx = 1 if row_count > 1 else 0
            for r_idx in range(start_idx, row_count):
                row = rows.nth(r_idx) if callable(getattr(rows, 'nth', None)) else rows[r_idx]
                locator = getattr(row, 'locator', None)
                if locator and callable(locator):
                    cols = row.locator("td")
                else:
                    cols = getattr(row, 'cols', None)

                if cols is not None:
                    col_count = cols.count() if callable(getattr(cols, 'count', None)) else len(cols)
                    for c_idx in range(col_count):
                        col_elem = cols.nth(c_idx) if callable(getattr(cols, 'nth', None)) else cols[c_idx]
                        if callable(getattr(col_elem, 'inner_text', None)):
                            col_text = col_elem.inner_text().strip()
                        else:
                            col_text = str(col_elem).strip()
                        if parse_datetime(col_text):
                            return c_idx
        except Exception as e:
            logger.warning(f"Error finding date column in rows: {e}")

    return -1

def extract_orders_from_tab(page, tab_name, submitted_after=None):
    """Extracts ApprIDs from the specified tab.
    For 'Revised Review Orders' tab, accepts any row with an ApprID link (no status filter).
    For other tabs, filters rows where status contains 'File In Review'.
    """
    submitted_after_dt = parse_datetime(submitted_after) if submitted_after else None
    is_revised_tab = "revised" in tab_name.lower()
    try:
        tab = page.locator(f"strong:has-text('{tab_name}'), a:has-text('{tab_name}')").first
        if not tab.is_visible():
            logger.info(f"Tab '{tab_name}' not visible or not found. Skipping.")
            return []

        tab.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(3000)
        table = page.locator("table").filter(has=page.locator("tr:has-text('Order Details')")).filter(has=page.locator("visible=true")).first
        if not table.is_visible():
            logger.info(f"No visible 'Order Details' table found in tab '{tab_name}'.")
            return []

        headers = []
        try:
            header_cells = table.locator("tr").first.locator("th, td")
            for h_idx in range(header_cells.count()):
                headers.append(header_cells.nth(h_idx).inner_text().strip())
        except Exception:
            headers = []

        status_col_idx = -1
        if headers:
            for idx, h in enumerate(headers):
                if 'status' in h.lower():
                    status_col_idx = idx
                    break
        if status_col_idx == -1:
            status_col_idx = 4

        rows = table.locator("tr")
        date_col_idx = find_date_column_index(headers, rows) if submitted_after_dt else -1

        count = rows.count()
        logger.info(f"Tab '{tab_name}': found {count - 1} data row(s) to scan.")
        appr_ids = []
        for i in range(1, count):
            cols = rows.nth(i).locator("td")
            if cols.count() == 0:
                continue

            # Status filter: Revised tab accepts all orders; other tabs require 'File In Review'
            if not is_revised_tab:
                if cols.count() <= status_col_idx:
                    logger.info(f"Skipping row {i} - status column not present (got {cols.count()} cols, needed index {status_col_idx})")
                    continue
                status_text = cols.nth(status_col_idx).inner_text().strip()
                if "file in review" not in status_text.lower():
                    logger.info(f"Skipping row {i} - status is '{status_text}' (not 'File In Review')")
                    continue
            else:
                # For Revised tab: log the status but don't filter it out
                if cols.count() > status_col_idx >= 0:
                    status_text = cols.nth(status_col_idx).inner_text().strip()
                    logger.info(f"Row {i} status: '{status_text}'")

            if cols.count() >= 1:
                link = cols.first.locator("a")
                href = link.get_attribute("href")
                link_text = link.inner_text().strip()
                if href and "ApprID=" in href:
                    internal_id = href.split("ApprID=")[1].split("&")[0]
                    match = re.search(r'\d+-\d+', link_text)
                    appraisal_no = match.group(0) if match else link_text

                    if submitted_after_dt and date_col_idx != -1 and cols.count() > date_col_idx:
                        date_text = cols.nth(date_col_idx).inner_text().strip()
                        row_dt = parse_datetime(date_text)
                        if row_dt and row_dt < submitted_after_dt:
                            logger.info(f"Skipping row {i} (ID: {appraisal_no}) - submitted date {row_dt} is before cutoff {submitted_after_dt}")
                            continue

                    if internal_id:
                        appr_ids.append((internal_id, appraisal_no))
        return list(set(appr_ids))
    except Exception as e:
        logger.error(f"Error extracting from {tab_name}: {e}")
        return []

def run_fastapp_automation(username=None, password=None, mode='full_file', headless=False, download_pref='appr_id', submitted_after=None, order_id=None):
    """
    Automates login to FastApp (https://fastapp.spurams.com/login.aspx)
    and processes report downloads for available orders.
    """
    update_status("running", "Initializing browser...", 5, mode)

    with sync_playwright() as p:

        launch_config = get_browser_config()
        launch_config["headless"] = headless
        browser = p.chromium.launch(**launch_config)
        context = browser.new_context()
        page = context.new_page()

        # Increase default navigation timeout globally (60s)
        page.set_default_navigation_timeout(60000)
        page.set_default_timeout(60000)

        target_url = "https://fastapp.spurams.com/login.aspx?ReturnUrl=%2f"
        logger.info(f"Navigating to {target_url}...")

        # Retry navigation up to 3 times with progressive wait-until strategies
        nav_success = False
        for nav_attempt in range(1, 4):
            try:
                # Use "domcontentloaded" first (faster than "load") then fall back to "commit"
                wait_until = "domcontentloaded" if nav_attempt <= 2 else "commit"
                page.goto(target_url, timeout=60000, wait_until=wait_until)
                nav_success = True
                logger.info(f"Navigation succeeded on attempt {nav_attempt} (wait_until='{wait_until}').")
                break
            except Exception as nav_err:
                logger.warning(f"Navigation attempt {nav_attempt}/3 failed: {nav_err}")
                if nav_attempt < 3:
                    logger.info(f"Retrying in 5 seconds...")
                    time.sleep(5)

        if not nav_success:
            raise RuntimeError(f"Cannot reach FastApp login page after 3 attempts. Check network connectivity to fastapp.spurams.com.")

        try:
            page.wait_for_load_state("networkidle", timeout=30000)
        except Exception:
            logger.warning("networkidle wait timed out — continuing anyway (page may still be usable).")

        logger.info(f"Page loaded successfully! Title is: '{page.title()}'")

        # -------------------------------------------------------------------
        update_status("running", "Logging into FastApp...", 10, mode)
        logger.info("Filling in FastApp login credentials...")

        username_field = page.locator("input#ctl00_cphBody_Login1_UserName")
        password_field = page.locator("input#ctl00_cphBody_Login1_Password")
        login_button = page.locator("input#ctl00_cphBody_Login1_LoginButton")


        user = username or "DJRBREVIEW"
        pwd = password or "DJRB2605!#"

        username_field.fill(user)
        password_field.fill(pwd)

        logger.info(f"Clicking FastApp Log In button as '{user}'...")
        check_pause_state_sync()
        login_button.click()


        logger.info("Waiting for FastApp Dashboard to load...")
        try:
            page.wait_for_url("**/AppraiserDashboard.aspx", timeout=15000)
        except Exception as e:
            logger.warning(f"Timeout waiting for dashboard URL redirection: {e}")
        page.wait_for_load_state("networkidle")

        if "AppraiserDashboard.aspx" in page.url:
             logger.success("Successfully logged into FastApp Dashboard.")


             logger.info("Checking for file counts in 'REVIEW ORDERS' section...")

             categories = [
                 ("#ctl00_cphBody_lnkShowNewReviewOrders", "New Review Orders"),
                 ("#ctl00_cphBody_lnkShowReviewInProgress", "Review Orders In Progress"),
                 ("#ctl00_cphBody_lnkShowReviewRevised", "Revised Review Orders")
             ]


             results = {}
             for selector, label in categories:
                 try:

                     element = page.locator(selector).first

                     count_text = element.locator("span").inner_text().strip()
                     logger.info(f"     -> {label}: {count_text}")
                     results[label] = count_text
                 except Exception as e:
                     logger.warning(f"     -> Could not extract count for {label}: {str(e)}")
                     results[label] = "N/A"

             logger.success(f"Final Count Report - New: {results['New Review Orders']}, In Progress: {results['Review Orders In Progress']}, Revised: {results['Revised Review Orders']}")

             if order_id:
                 logger.info(f"Direct order ID target specified: {order_id}")
                 clean_oid = str(order_id).strip()
                 unique_ids = [(clean_oid, clean_oid)]
             else:
                 tabs = ["Revised Review Orders"] if mode == 'update_review' else ["New Review Orders", "Review Orders In Progress"]
                 all_appr_ids = []

                 for i, tab in enumerate(tabs):
                     update_status("running", f"Scanning {tab}...", 20 + i*10, mode)
                     appr_ids = extract_orders_from_tab(page, tab, submitted_after=submitted_after)
                     all_appr_ids.extend(appr_ids)
                     logger.info(f"Found {len(appr_ids)} orders in {tab}")

                 unique_ids = list(set(all_appr_ids))
             total = len(unique_ids)
             added_count = 0
             skipped_count = 0
             downloaded_files_total = 0

             update_status("running", f"Found {total} unique orders. Processing...", 50, mode)

             for idx, (internal_id, appraisal_no) in enumerate(unique_ids):
                 progress = 50 + int((idx / total) * 45)

                 update_status("running", f"Processing Order {idx+1}/{total} (ID: {appraisal_no})", progress, mode)
                 count = download_pdfs_for_order(page, internal_id, mode, download_pref=download_pref, appraisal_no=appraisal_no)
                 if count == -1:
                     skipped_count += 1
                 else:
                     downloaded_files_total += count
                     added_count += 1

             update_status("completed", f"Import finished. Added: {added_count}, Skipped: {skipped_count}, Files: {downloaded_files_total}", 100, mode)
             logger.success(f"TOTAL: Added {added_count}, Skipped {skipped_count}, Files {downloaded_files_total}")

             logger.info("Initiating FastApp logout sequence...")
             try:
                 check_pause_state_sync()

                 dropdown_toggle = page.locator("a.dropdown-toggle").filter(has=page.locator("img[src='NavResources/Images/icn-nav-settings.png']")).first

                 if dropdown_toggle.is_visible():
                     logger.info("Opening user profile dropdown...")
                     dropdown_toggle.click()
                     page.wait_for_timeout(500)

                 logout_btn = page.locator("#ctl00_TopMenu1_LoginView1_LoginStatus1")

                 if logout_btn.is_visible():
                     logger.info("Clicking visible Sign Out button...")
                     logout_btn.click()
                 else:
                     logger.warning("Logout button not visible in UI, triggering direct JavaScript click...")
                     page.evaluate("document.querySelector('#ctl00_TopMenu1_LoginView1_LoginStatus1')?.click()")

                 page.wait_for_url("**/login.aspx*", timeout=10000)
                 logger.success("FastApp session securely terminated and redirected to login.")

             except Exception as e:
                 logger.warning(f"UI Logout failed: {str(e)}. Attempting direct endpoint logout...")
                 try:
                     page.goto("https://fastapp.spurams.com/login.aspx?mode=logout", timeout=5000)
                     logger.success("Securely force-navigated to logout endpoint.")
                 except Exception as final_err:
                     logger.error(f"Final logout attempt failed: {str(final_err)}")
        else:
             logger.warning(f"Login might have failed. Current URL: {page.url}")
             error_msg = "Unknown login error"
             if page.locator(".error, .failure-text, #ctl00_cphBody_Login1_FailureText").is_visible():
                 error_msg = page.locator("#ctl00_cphBody_Login1_FailureText").inner_text().strip()
                 logger.error(f"Login Error Message: {error_msg}")
             raise RuntimeError(f"Login failed: {error_msg}")

        page.wait_for_timeout(2000)
        browser.close()

        return str(logger.current_log_file)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PRAMAAN FastApp Download Automation (XML, PDF, Letters, HTML)")
    parser.add_argument('--mode', default='full_file', choices=['full_file', 'update_review'])
    parser.add_argument('--headless', action='store_true', default=False)
    parser.add_argument('--download_pref', default='appr_id', choices=['appr_id', 'original'])
    parser.add_argument('--submitted_after', default=None)
    parser.add_argument('--order_id', default=None, help='Target specific ApprID or Appraisal number directly')
    args = parser.parse_args()

    run_fastapp_automation(
        mode=args.mode,
        headless=args.headless,
        download_pref=args.download_pref,
        submitted_after=args.submitted_after,
        order_id=args.order_id
    )
