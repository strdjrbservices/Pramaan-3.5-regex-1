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
        FULL_FILE_REVIEW_URL,
        FULL_FILE_REVIEW_BUTTON_SELECTOR,
        PDF_UPLOAD_SELECTOR,
        XML_UPLOAD_SELECTOR,
        XML_UPLOAD_JSPATH_USER,
        HTML_UPLOAD_SELECTOR,
        HTML_UPLOAD_XPATH_USER,
        HTML_UPLOAD_JSPATH_USER,
        ENGAGEMENT_LETTER_UPLOAD_SELECTOR,
        ENGAGEMENT_LETTER_JSPATH_USER,
        ENGAGEMENT_LETTER_XPATH_USER,
        LETTERS_PATH,
        HTML_FILES_PATH,
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
        FULL_FILE_REVIEW_URL,
        FULL_FILE_REVIEW_BUTTON_SELECTOR,
        PDF_UPLOAD_SELECTOR,
        XML_UPLOAD_SELECTOR,
        XML_UPLOAD_JSPATH_USER,
        HTML_UPLOAD_SELECTOR,
        HTML_UPLOAD_XPATH_USER,
        HTML_UPLOAD_JSPATH_USER,
        ENGAGEMENT_LETTER_UPLOAD_SELECTOR,
        ENGAGEMENT_LETTER_JSPATH_USER,
        ENGAGEMENT_LETTER_XPATH_USER,
        LETTERS_PATH,
        HTML_FILES_PATH,
    )  # pyre-ignore


def run_automation(pdf_path="1423 Country Club Cir.pdf", username=None, password=None, xml_path=None, html_path=None, engagement_letter_path=None):
    save_path = None

    # Resolve XML, PDF, HTML, and Engagement Letter paths
    # Note: As per UI workflow, XML is the primary structured report format
    resolved_xml = str(xml_path) if xml_path and os.path.exists(xml_path) else None
    resolved_pdf = str(pdf_path) if pdf_path and os.path.exists(pdf_path) and not str(pdf_path).lower().endswith('.xml') else None

    # If pdf_path is actually an XML file and xml_path was not explicitly provided
    if pdf_path and str(pdf_path).lower().endswith('.xml') and not resolved_xml:
        resolved_xml = str(pdf_path)

    # If xml_path wasn't given, look for an XML file with the same stem next to pdf_path
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
            else:
                candidate_xml3 = dir_name / f"{base_stem}.XML"
                if candidate_xml3.exists():
                    resolved_xml = str(candidate_xml3)

    # If resolved_xml is set and resolved_pdf is not yet set, check if matching PDF exists
    if resolved_xml and not resolved_pdf:
        cand_pdf = Path(resolved_xml).with_suffix('.pdf')
        if cand_pdf.exists():
            resolved_pdf = str(cand_pdf)

    # Target base path for companion file discovery (HTML and Engagement Letter)
    target_base = resolved_xml or resolved_pdf or pdf_path

    # Look for matching HTML file if present
    # Primary Source: Dedicated Downloads/HTMLFiles/ folder (Pramaan-3.5-regex-1\appraisal_review\Downloads\HTMLFiles)
    candidate_html = str(html_path) if html_path and os.path.exists(html_path) else None
    if not candidate_html and target_base:
        base_path = Path(target_base)
        base_stem = base_path.stem
        dir_name = base_path.parent
        html_dir = Path(HTML_FILES_PATH)

        html_patterns = [
            f"{base_stem}.html",
            f"{base_stem}.HTML",
            f"{base_stem}.htm",
            f"{base_stem}.HTM",
            f"{base_stem}.html.html",
            f"{base_stem}_order.html",
            f"{base_stem} order.html",
            f"{base_stem}_instructions.html",
            f"{base_stem} instructions.html",
        ]

        # 1. Search in Downloads/HTMLFiles/ (Primary Folder)
        if html_dir.exists():
            for pat in html_patterns:
                cand = html_dir / pat
                if cand.exists():
                    candidate_html = str(cand)
                    break
            if not candidate_html:
                for f in html_dir.iterdir():
                    if f.is_file() and f.name.lower().endswith(('.html', '.htm')):
                        if base_stem.lower() in f.name.lower():
                            candidate_html = str(f)
                            break
            # Fallback: if still not matched by stem, pick available HTML file from Downloads/HTMLFiles
            if not candidate_html:
                valid_htmls = [f for f in html_dir.iterdir() if f.is_file() and f.name.lower().endswith(('.html', '.htm')) and not f.name.startswith('.')]
                if valid_htmls:
                    order_htmls = [f for f in valid_htmls if 'order' in f.name.lower() or 'instruction' in f.name.lower()]
                    chosen = order_htmls[0] if order_htmls else sorted(valid_htmls, key=lambda x: x.stat().st_mtime, reverse=True)[0]
                    candidate_html = str(chosen)

        # 2. Search next to report file (Secondary fallback)
        if not candidate_html and dir_name.exists():
            for pat in html_patterns:
                cand = dir_name / pat
                if cand.exists():
                    candidate_html = str(cand)
                    break
            if not candidate_html:
                for f in dir_name.iterdir():
                    if f.is_file() and f.name.lower().endswith(('.html', '.htm')):
                        if base_stem.lower() in f.name.lower():
                            candidate_html = str(f)
                            break

    # Look for matching Engagement Letter if present
    # Primary Source: Dedicated Downloads/Letters/ folder (Pramaan-3.5-regex-1\appraisal_review\Downloads\Letters)
    resolved_engagement_letter = str(engagement_letter_path) if engagement_letter_path and os.path.exists(engagement_letter_path) else None
    if not resolved_engagement_letter and target_base:
        base_path = Path(target_base)
        base_stem = base_path.stem
        dir_name = base_path.parent
        letters_dir = Path(LETTERS_PATH)

        el_patterns = [
            f"{base_stem}.pdf",
            f"{base_stem}.docx",
            f"{base_stem}.doc",
            f"{base_stem}_engagement_letter.pdf",
            f"{base_stem}_engagement_letter.pdf.pdf",
            f"{base_stem}_engagement.pdf",
            f"{base_stem}_el.pdf",
            f"{base_stem}_letter.pdf",
            f"{base_stem} Engagement Letter.pdf",
            f"{base_stem} EL.pdf",
            f"{base_stem} letter.pdf",
            f"{base_stem}_engagement_letter.docx",
            f"{base_stem}_engagement_letter.doc",
            f"{base_stem} Engagement Letter.docx",
            f"{base_stem} Engagement Letter.doc",
            f"{base_stem}_letter.docx",
            f"{base_stem}_letter.doc",
        ]

        # 1. Search in Downloads/Letters/ (Primary Folder)
        if letters_dir.exists():
            for pat in el_patterns:
                cand = letters_dir / pat
                if cand.exists():
                    resolved_engagement_letter = str(cand)
                    break
            if not resolved_engagement_letter:
                for f in letters_dir.iterdir():
                    if f.is_file() and f.name.lower().endswith(('.pdf', '.doc', '.docx')):
                        if base_stem.lower() in f.name.lower():
                            resolved_engagement_letter = str(f)
                            break
            # Fallback: if still not matched by stem, pick available letter from Downloads/Letters
            if not resolved_engagement_letter:
                valid_letters = [f for f in letters_dir.iterdir() if f.is_file() and f.name.lower().endswith(('.pdf', '.doc', '.docx')) and not f.name.startswith('.')]
                if valid_letters:
                    el_preferred = [f for f in valid_letters if any(k in f.name.lower() for k in ['letter', 'engagement', 'el'])]
                    chosen = el_preferred[0] if el_preferred else sorted(valid_letters, key=lambda x: x.stat().st_mtime, reverse=True)[0]
                    resolved_engagement_letter = str(chosen)

        # 2. Search in the report directory (Secondary fallback)
        if not resolved_engagement_letter:
            for pat in el_patterns[3:]:  # Skip simple {base_stem}.pdf in dir_name to avoid picking report itself
                cand = dir_name / pat
                if cand.exists():
                    resolved_engagement_letter = str(cand)
                    break

        if not resolved_engagement_letter and dir_name.exists():
            for f in dir_name.iterdir():
                if f.is_file() and f.name.lower().endswith(('.pdf', '.doc', '.docx')):
                    f_lower = f.name.lower()
                    target_lower = base_path.name.lower()
                    if f_lower != target_lower and (
                        'engagement' in f_lower or
                        'letter' in f_lower or
                        f_lower.endswith('_el.pdf') or
                        f_lower.endswith('-el.pdf')
                    ):
                        resolved_engagement_letter = str(f)
                        break

    logger.info("=" * 60)
    logger.info(" AUTOMATION UPLOAD BUNDLE READY ")
    logger.info(f"   [1] XML Report:        {resolved_xml or ('Using PDF: ' + str(resolved_pdf) if resolved_pdf else 'NOT FOUND')}")
    logger.info(f"   [2] HTML Order:        {candidate_html or 'NOT FOUND'}")
    logger.info(f"   [3] Engagement Letter: {resolved_engagement_letter or 'NOT FOUND'}")
    logger.info("=" * 60)

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
                targets = set(filter(None, [primary_file, resolved_pdf, resolved_xml, candidate_html, resolved_engagement_letter]))
                for f_path in targets:
                    if os.path.exists(f_path):
                        filename = Path(f_path).name
                        dest = os.path.join(str(ERROR_FILES_PATH), filename)
                        shutil.move(f_path, dest)
                        logger.info(f"Moved {filename} to {dest}")
            except Exception as e:
                logger.error(f"Failed to move files to error directory: {e}")

        def wait_for_spinner(action_name, timeout_ms=240000):
            if page.is_closed():
                return
            timeout_sec = timeout_ms // 1000
            logger.info(f"     Waiting up to {timeout_sec}s for spinner to disappear for {action_name}...")
            spinner = page.locator(".MuiCircularProgress-root, [role='progressbar'], .spinner, .loader").first
            try:
                check_pause_state_sync()
                if not page.is_closed():
                    spinner.wait_for(state="visible", timeout=2000)
            except Exception:
                pass
            try:
                check_pause_state_sync()
                if not page.is_closed():
                    spinner.wait_for(state="hidden", timeout=timeout_ms)
            except Exception:
                logger.info(f"     (Timeout or no spinner found for {action_name}, proceeding...)")
            if not page.is_closed():
                page.wait_for_timeout(1000)

        steps = []

        def step_nav_full_file():
            logger.info("Waiting for Dashboard to load after login...")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)

            if "/extractor" not in page.url:
                try:
                    full_link = page.locator("a[href*='extractor'], text='Full File Review'").first
                    if full_link.is_visible(timeout=5000):
                        logger.info("Clicking Full File Review link...")
                        check_pause_state_sync()
                        full_link.click()
                except Exception as e:
                    logger.debug(f"Click on Full File Review notice: {e}")

            if "/extractor" not in page.url:
                logger.info(f"Directing browser to Full File Review URL: {FULL_FILE_REVIEW_URL}...")
                page.goto(FULL_FILE_REVIEW_URL)

            logger.info("Waiting for Full File Review page to load...")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)
        steps.append(("Navigate Full File Review", step_nav_full_file))

        # Step 1: Upload Primary Report (XML as shown in UI workflow, with PDF fallback if XML is unavailable)
        def step_upload_report():
            if resolved_xml and os.path.exists(resolved_xml):
                logger.info(f"Uploading XML appraisal report '{resolved_xml}'...")
                check_pause_state_sync()
                uploaded = False

                # 1. Direct input on verified XML file input (Card #2)
                for i_sel in ["input[type='file'][accept='.xml']", XML_UPLOAD_SELECTOR, f"css={XML_UPLOAD_JSPATH_USER} input[type='file']"]:
                    try:
                        loc = page.locator(i_sel).first
                        if loc.count() > 0:
                            loc.set_input_files(resolved_xml)
                            logger.info(f"XML file successfully set via input selector '{i_sel}'")
                            uploaded = True
                            break
                    except Exception as ie:
                        logger.debug(f"Direct XML set_input_files on '{i_sel}' notice: {ie}")

                # 2. File chooser fallback
                if not uploaded:
                    for c_sel in [f"css={XML_UPLOAD_JSPATH_USER}", XML_UPLOAD_JSPATH_USER, "xpath=//div[contains(@class, 'MuiPaper-root') and .//*[contains(., 'XML')]]"]:
                        try:
                            loc = page.locator(c_sel).first
                            if loc.is_visible(timeout=2000):
                                logger.info(f"Triggering XML file chooser on '{c_sel}'...")
                                with page.expect_file_chooser(timeout=4000) as fc_info:
                                    loc.click()
                                fc_info.value.set_files(resolved_xml)
                                logger.info(f"XML file successfully uploaded via file chooser on '{c_sel}'")
                                uploaded = True
                                break
                        except Exception as ce:
                            logger.debug(f"XML file chooser on '{c_sel}' notice: {ce}")

                if not uploaded:
                    logger.error(f"Failed to upload XML file for '{resolved_xml}'")

                wait_for_spinner("XML Upload / Extraction")
                page.wait_for_timeout(3000)
            elif resolved_pdf and os.path.exists(resolved_pdf):
                logger.info(f"No XML found. Uploading PDF appraisal report '{resolved_pdf}'...")
                check_pause_state_sync()
                page.locator(PDF_UPLOAD_SELECTOR).first.set_input_files(resolved_pdf)
                wait_for_spinner("PDF Upload / Extraction")
                page.wait_for_timeout(3000)
            else:
                logger.warning(f"No XML or PDF report file found for '{pdf_path or xml_path}'.")
        steps.append(("Upload XML/Report", step_upload_report))

        # Step 2: Upload HTML (Card #3 'HTML' card)
        def step_upload_html():
            if candidate_html and os.path.exists(candidate_html):
                logger.info(f"Uploading corresponding HTML order/instructions '{candidate_html}'...")
                check_pause_state_sync()
                uploaded = False

                # 1. Direct input on verified HTML file input (Card #3)
                for i_sel in ["input[type='file'][accept='.html']", HTML_UPLOAD_SELECTOR, "xpath=//div[contains(@class, 'MuiPaper-root') and .//*[contains(text(), 'HTML')]]//input[@type='file']"]:
                    try:
                        loc = page.locator(i_sel).first
                        if loc.count() > 0:
                            loc.set_input_files(candidate_html)
                            logger.info(f"HTML file successfully set via input selector '{i_sel}'")
                            uploaded = True
                            break
                    except Exception as ie:
                        logger.debug(f"Direct set_input_files on '{i_sel}' notice: {ie}")

                # 2. File chooser fallback via user's exact XPath or JSPath
                if not uploaded:
                    for c_sel in [f"xpath={HTML_UPLOAD_XPATH_USER}", HTML_UPLOAD_JSPATH_USER, "xpath=//div[contains(@class, 'MuiPaper-root') and .//*[contains(text(), 'HTML')]]"]:
                        try:
                            loc = page.locator(c_sel).first
                            if loc.is_visible(timeout=2000):
                                logger.info(f"Triggering HTML file chooser on '{c_sel}'...")
                                with page.expect_file_chooser(timeout=4000) as fc_info:
                                    loc.click()
                                fc_info.value.set_files(candidate_html)
                                logger.info(f"HTML file successfully uploaded via file chooser on '{c_sel}'")
                                uploaded = True
                                break
                        except Exception as ce:
                            logger.debug(f"File chooser on '{c_sel}' notice: {ce}")

                if not uploaded:
                    logger.error(f"Failed to upload HTML file for '{candidate_html}'")

                # Wait only up to 30 seconds for HTML upload / extraction
                wait_for_spinner("HTML Upload / Extraction", timeout_ms=30000)
                page.wait_for_timeout(1000)
            else:
                logger.info("No corresponding HTML file found. Skipping HTML upload.")
        steps.append(("Upload HTML", step_upload_html))

        # Step 3: Upload Engagement Letter (Card #5 'Letter' card)
        def step_upload_engagement_letter():
            if resolved_engagement_letter and os.path.exists(resolved_engagement_letter):
                logger.info(f"Uploading Engagement Letter '{resolved_engagement_letter}'...")
                check_pause_state_sync()
                uploaded = False

                # 1. Direct input on verified Letter file input (Card #5)
                # Card #4 (Contract) and Card #5 (Letter) accept .doc; Card #5 is the last input accepting .doc
                for i_sel in [
                    "xpath=(//input[@type='file'][contains(@accept, '.doc')])[last()]",
                    "input[type='file'][accept*='.doc']",
                    ENGAGEMENT_LETTER_UPLOAD_SELECTOR,
                    "xpath=//div[contains(@class, 'MuiPaper-root') and .//*[normalize-space()='Letter']]//input[@type='file']",
                ]:
                    try:
                        loc = page.locator(i_sel).last if i_sel == "input[type='file'][accept*='.doc']" else page.locator(i_sel).first
                        if loc.count() > 0:
                            loc.set_input_files(resolved_engagement_letter)
                            logger.info(f"Engagement Letter file successfully set via input selector '{i_sel}'")
                            uploaded = True
                            break
                    except Exception as ie:
                        logger.debug(f"Direct set_input_files on '{i_sel}' notice: {ie}")

                # 2. File chooser fallback via user's exact JSPath or SVG XPath
                if not uploaded:
                    user_click_selectors = [
                        "xpath=//div[contains(@class, 'MuiPaper-root') and .//*[normalize-space()='Letter']]//*[name()='svg']",
                        "xpath=//div[contains(@class, 'MuiPaper-root') and .//*[normalize-space()='Letter']]",
                        f"css={ENGAGEMENT_LETTER_JSPATH_USER}",
                        ENGAGEMENT_LETTER_JSPATH_USER,
                    ]
                    for c_sel in user_click_selectors:
                        try:
                            loc = page.locator(c_sel).first
                            if loc.is_visible(timeout=1500):
                                logger.info(f"Triggering Engagement Letter file chooser on '{c_sel}'...")
                                with page.expect_file_chooser(timeout=3000) as fc_info:
                                    loc.click()
                                fc_info.value.set_files(resolved_engagement_letter)
                                logger.info(f"Engagement Letter successfully uploaded via file chooser on '{c_sel}'")
                                uploaded = True
                                break
                        except Exception as ce:
                            logger.debug(f"File chooser on '{c_sel}' notice: {ce}")

                if not uploaded:
                    logger.error(f"Failed to upload Engagement Letter file for '{resolved_engagement_letter}'")

                wait_for_spinner("Engagement Letter Upload / Compare")
                page.wait_for_timeout(3000)
                try:
                    compare_btn = page.locator("button:has-text('Compare'), button:has-text('COMPARE')").first
                    if compare_btn.is_visible(timeout=1000) and compare_btn.is_enabled():
                        logger.info("Clicking Engagement Letter Compare button...")
                        compare_btn.click()
                        wait_for_spinner("Engagement Letter Comparison")
                        page.wait_for_timeout(2000)
                except Exception as cmp_err:
                    logger.debug(f"Engagement Letter compare button check notice: {cmp_err}")
            else:
                logger.info("No corresponding Engagement Letter file found. Skipping Engagement Letter upload.")
        steps.append(("Upload Engagement Letter", step_upload_engagement_letter))

        # Analysis Pipeline (as it is)
        def step_check_state():
            logger.info("Clicking Check State Requirements...")
            btn = page.locator("button:has-text('CHECK STATE REQUIREMENTS'), button:has-text('Check State Requirements')").first
            btn.click()
            wait_for_spinner("Check State Requirements")
        steps.append(("Check State Requirements", step_check_state))

        def step_check_client():
            logger.info("Clicking Check Client Requirements...")
            btn = page.locator("button:has-text('CHECK CLIENT REQUIREMENTS'), button:has-text('Check Client Requirements')").first
            btn.click()
            wait_for_spinner("Check Client Requirements")
        steps.append(("Check Client Requirements", step_check_client))

        def step_run_escalation():
            logger.info("Clicking Run Escalation Check...")
            btn = page.locator("button:has-text('RUN ESCALATION CHECK'), button:has-text('Run Escalation Check')").first
            btn.click()
            wait_for_spinner("Run Escalation Check")
        steps.append(("Run Escalation Check", step_run_escalation))

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
        if resolved_engagement_letter and os.path.exists(resolved_engagement_letter):
            attachments.append(resolved_engagement_letter)

        if terminal_log and os.path.exists(terminal_log):
            attachments.append(str(terminal_log))

        display_name = Path(pdf_path).name if pdf_path else (Path(xml_path).name if xml_path else "report")
        logger.info(f"Sending completion email for {display_name}...")

        email_ok = asyncio.run(send_email(
            subject=f"PRAMAAN Output: {status} - {display_name} - {datetime.now().strftime('%c')}",
            body_text=f"The Full File Review for {display_name} has completed successfully.\n\nAttached:\n1. Downloaded Site Log\n2. Original File(s) (PDF/XML/Engagement Letter)\n3. Terminal execution log",
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
    import argparse
    parser = argparse.ArgumentParser(description="PRAMAAN Full File Review Automation (XML, HTML, Engagement Letter)")
    parser.add_argument("-x", "--xml", default=None, help="Path to appraisal XML file (Primary)")
    parser.add_argument("-p", "--pdf", default=None, help="Path to appraisal PDF file (Fallback)")
    parser.add_argument("-t", "--html", default=None, help="Path to order/instructions HTML file")
    parser.add_argument("-l", "--letter", "--engagement-letter", dest="engagement_letter", default=None, help="Path to Engagement Letter (PDF/DOCX)")
    parser.add_argument("-u", "--username", default=None, help="Portal username")
    parser.add_argument("-w", "--password", default=None, help="Portal password")
    args = parser.parse_args()

    run_automation(
        pdf_path=args.pdf,
        username=args.username,
        password=args.password,
        xml_path=args.xml,
        html_path=args.html,
        engagement_letter_path=args.engagement_letter
    )
