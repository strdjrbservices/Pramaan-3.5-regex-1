import os
import asyncio
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright  # pyre-ignore
import shutil

try:
    from .utils import (
        logger,
        check_pause_state_sync,
        get_browser_config,
        FULL_FILE_LOGS_PATH,
        send_email,
        ERROR_FILES_PATH,
        WEBSITE_B_URL,
        PDF_UPLOAD_SELECTOR,
        XML_UPLOAD_SELECTOR,
        HTML_UPLOAD_SELECTOR,
    )  # pyre-ignore
except ImportError:
    from utils import (
        logger,
        check_pause_state_sync,
        get_browser_config,
        FULL_FILE_LOGS_PATH,
        send_email,
        ERROR_FILES_PATH,
        WEBSITE_B_URL,
        PDF_UPLOAD_SELECTOR,
        XML_UPLOAD_SELECTOR,
        HTML_UPLOAD_SELECTOR,
    )  # pyre-ignore


def run_automation(pdf_path="1423 Country Club Cir.pdf", username=None, password=None, xml_path=None):
    save_path = None

    # Resolve PDF, XML, and HTML paths
    resolved_pdf = str(pdf_path) if pdf_path and os.path.exists(pdf_path) and not str(pdf_path).lower().endswith('.xml') else None
    resolved_xml = str(xml_path) if xml_path and os.path.exists(xml_path) else None

    # If pdf_path is actually an XML file and xml_path was not explicitly provided
    if pdf_path and str(pdf_path).lower().endswith('.xml') and not resolved_xml:
        resolved_xml = str(pdf_path)
        candidate_pdf = Path(pdf_path).with_suffix('.pdf')
        if candidate_pdf.exists():
            resolved_pdf = str(candidate_pdf)

    # If resolved_xml is still None, look for an XML file with the same stem next to pdf_path
    if not resolved_xml and pdf_path:
        candidate_xml = Path(pdf_path).with_suffix('.xml')
        if candidate_xml.exists():
            resolved_xml = str(candidate_xml)
        else:
            base_stem = Path(pdf_path).stem
            dir_name = Path(pdf_path).parent
            candidate_xml2 = dir_name / f"{base_stem}.xml"
            if candidate_xml2.exists():
                resolved_xml = str(candidate_xml2)

    # Look for matching HTML file if present
    candidate_html = None
    target_base = resolved_pdf or resolved_xml or pdf_path
    if target_base:
        h = Path(target_base).with_suffix('.html')
        if h.exists():
            candidate_html = str(h)

    with sync_playwright() as p:
        launch_config = get_browser_config()
        try:
            browser = p.chromium.launch(**launch_config)
        except Exception as launch_err:
            logger.warning(f"Initial browser launch failed ({launch_err}). Attempting fallback launch...")
            if "channel" in launch_config:
                fallback_config = {k: v for k, v in launch_config.items() if k != "channel"}
                try:
                    browser = p.chromium.launch(**fallback_config)
                except Exception:
                    browser = p.chromium.launch(channel="msedge", **fallback_config)
            else:
                try:
                    browser = p.chromium.launch(channel="chrome", **launch_config)
                except Exception:
                    browser = p.chromium.launch(channel="msedge", **launch_config)
        context = browser.new_context()
        page = context.new_page()

        target_url = "https://strdjrb-pramaan-appraisal.hf.space/"
        logger.info(f"Navigating to {target_url}...")
        page.goto(target_url)

        page.wait_for_load_state("networkidle")

        logger.info(f"Page loaded successfully! Title is: '{page.title()}'")

        logger.info("Filling in login credentials...")
        page.get_by_label("Username").fill(username or "strdjrbservices")
        page.get_by_label("Password", exact=False).fill(password or "Admin")

        logger.info("Clicking Log In button...")
        check_pause_state_sync()
        page.locator("button[type='submit'], button:has-text('LOG IN'), button:has-text('Log In')").first.click()

        logger.info("Initiating step-by-step execution for Full File Review...")

        def move_to_error_dir(primary_file):
            try:
                targets = set(filter(None, [primary_file, resolved_pdf, resolved_xml, candidate_html]))
                for f_path in targets:
                    if os.path.exists(f_path):
                        filename = Path(f_path).name
                        dest = os.path.join(str(ERROR_FILES_PATH), filename)
                        shutil.move(f_path, dest)
                        logger.info(f"Moved {filename} to {dest}")
            except Exception as e:
                logger.error(f"Failed to move files to error directory: {e}")

        def wait_for_spinner(action_name):
            logger.info(f"     Waiting up to 4 mins for spinner to disappear for {action_name}...")
            spinner = page.locator(".MuiCircularProgress-root, [role='progressbar'], .spinner, .loader").first
            try:
                check_pause_state_sync()
                spinner.wait_for(state="visible", timeout=2000)
            except Exception:
                pass
            try:
                check_pause_state_sync()
                spinner.wait_for(state="hidden", timeout=240000)
            except Exception:
                logger.info(f"     (Timeout or no spinner found for {action_name}, proceeding...)")
            page.wait_for_timeout(1000)

        steps = []

        def step_nav_full_file():
            logger.info("Waiting for Dashboard to load...")
            page.get_by_text("Full File Review").first.wait_for(state="visible", timeout=30000)
            logger.info("Navigating to Full File Review...")
            check_pause_state_sync()
            page.get_by_text("Full File Review").first.click()
            logger.info("Waiting for Full File Review page to load...")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)
        steps.append(("Navigate Full File Review", step_nav_full_file))

        def step_upload_pdf():
            if resolved_pdf and os.path.exists(resolved_pdf):
                logger.info(f"Uploading PDF file '{resolved_pdf}'...")
                check_pause_state_sync()
                page.locator(PDF_UPLOAD_SELECTOR).first.set_input_files(resolved_pdf)
                wait_for_spinner("PDF Upload / Extraction")
                page.wait_for_timeout(3000)
            else:
                logger.info(f"No PDF file found to upload for '{pdf_path}'. Skipping PDF upload.")
        steps.append(("Upload PDF", step_upload_pdf))

        def step_upload_xml():
            if resolved_xml and os.path.exists(resolved_xml):
                logger.info(f"Uploading XML file '{resolved_xml}'...")
                check_pause_state_sync()
                page.locator(XML_UPLOAD_SELECTOR).first.set_input_files(resolved_xml)
                wait_for_spinner("XML Upload / Extraction")
                page.wait_for_timeout(3000)
            else:
                logger.info(f"No corresponding XML file found for '{pdf_path}'. Skipping XML upload.")
        steps.append(("Upload XML", step_upload_xml))

        def step_upload_html():
            if candidate_html and os.path.exists(candidate_html):
                logger.info(f"Uploading corresponding HTML file '{candidate_html}'...")
                check_pause_state_sync()
                page.locator(HTML_UPLOAD_SELECTOR).first.set_input_files(candidate_html)
                wait_for_spinner("HTML Upload / Extraction")
                page.wait_for_timeout(3000)
            else:
                logger.info("No corresponding HTML file found. Skipping HTML upload.")
        steps.append(("Upload HTML", step_upload_html))

        # Analysis Pipeline (as it is)
        def step_check_state():
            logger.info("Clicking Check State Requirements...")
            page.get_by_role("button", name="Check State Requirements").click()
            wait_for_spinner("Check State Requirements")
        steps.append(("Check State Requirements", step_check_state))

        def step_check_client():
            logger.info("Clicking Check Client Requirements...")
            page.get_by_role("button", name="Check Client Requirements").click()
            wait_for_spinner("Check Client Requirements")
        steps.append(("Check Client Requirements", step_check_client))

        def step_run_escalation():
            logger.info("Clicking Run Escalation Check...")
            page.get_by_role("button", name="Run Escalation Check").click()
            wait_for_spinner("Run Escalation Check")
        steps.append(("Run Escalation Check", step_run_escalation))

        def step_run_full_analysis():
            logger.info("Clicking Run Full Analysis...")
            page.get_by_role("button", name="Run Full Analysis").click()
            wait_for_spinner("Run Full Analysis")
        steps.append(("Run Full Analysis", step_run_full_analysis))

        # Save & Export (as it is)
        def step_save():
            logger.info("Clicking Save...")
            save_btn = page.locator("button:has-text('Save'), button:has-text('SAVE')").first
            save_btn.click()
            page.wait_for_timeout(1000)
        steps.append(("Save", step_save))

        def step_download_log():
            nonlocal save_path
            logger.info("Clicking Log and waiting for download...")
            with page.expect_download() as download_info:
                log_btn = page.locator("button:has-text('Log'), button:has-text('LOG')").first
                log_btn.click()
            download = download_info.value
            save_path = os.path.join(str(FULL_FILE_LOGS_PATH), download.suggested_filename)
            download.save_as(save_path)
            logger.info(f"Log file successfully saved to: {save_path}")
        steps.append(("Download Log", step_download_log))

        # Error & Retry Handling (as it is)
        step_index = 0
        while step_index < len(steps):
            step_name, step_func = steps[step_index]
            attempts = 0
            success = False
            while attempts <= 1:
                try:
                    step_func()
                    success = True
                    break
                except Exception as e:
                    attempts += 1
                    if attempts > 1:
                        logger.error(f"Step '{step_name}' failed after 2 attempts. Error: {e}")
                        move_to_error_dir(pdf_path)
                        browser.close()
                        return None
                    logger.warning(f"Step '{step_name}' failed. Waiting 1.5 minutes before retrying (Attempt {attempts + 1})... Error: {e}")
                    page.wait_for_timeout(90000)
            if not success:
                break
            step_index += 1

        logger.info("Initiating site logout sequence...")
        try:
            check_pause_state_sync()
            logout_btn = page.get_by_role("button", name="Log Out").first
            if logout_btn.is_visible():
                logout_btn.click()
                page.wait_for_load_state("networkidle")
                logger.success("Securely logged out from the portal.")
        except Exception as e:
            logger.warning(f"Portal logout skipped/failed: {str(e)}")

        page.wait_for_timeout(2000)
        browser.close()

    try:
        status = "Analysis Completed"
        terminal_log = logger.current_log_file
        attachments = []
        if save_path and os.path.exists(save_path):
            attachments.append(str(save_path))
        if resolved_pdf and os.path.exists(resolved_pdf):
            attachments.append(resolved_pdf)
        if resolved_xml and os.path.exists(resolved_xml):
            attachments.append(resolved_xml)

        if terminal_log and os.path.exists(terminal_log):
            attachments.append(str(terminal_log))

        display_name = Path(pdf_path).name if pdf_path else (Path(xml_path).name if xml_path else "report")
        logger.info(f"Sending completion email for {display_name}...")

        email_ok = asyncio.run(send_email(
            subject=f"PRAMAAN Output: {status} - {display_name} - {datetime.now().strftime('%c')}",
            body_text=f"The Full File Review for {display_name} has completed successfully.\n\nAttached:\n1. Downloaded Site Log\n2. Original File(s)\n3. Terminal execution log",
            attachment_paths=attachments
        ))
        if email_ok:
            logger.success("Completion email sent successfully.")
        else:
            logger.warning("Completion email could not be delivered (see error above).")
    except Exception as e:
        logger.error(f"Failed to send completion email: {str(e)}")

    return save_path if 'save_path' in locals() else None


if __name__ == "__main__":
    run_automation()
