import os
import pathlib
import logging
import asyncio
import datetime
from pathlib import Path
from typing import List, Union, Optional, Any

import playwright.async_api as pw  # type: ignore
from playwright.sync_api import sync_playwright  # type: ignore

IS_PRODUCTION = os.environ.get('PYTHONANYWHERE_DOMAIN') is not None
BASE_DIR = Path(__file__).resolve().parent.parent

def get_browser_config():
    """Returns suitable Playwright launch arguments based on environment."""
    config = {
        "headless": bool(IS_PRODUCTION)
    }
    if IS_PRODUCTION:
        config["args"] = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    else:
        # Check if local Google Chrome or Edge is installed on the host machine
        chrome_paths = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            "/usr/bin/google-chrome",
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        ]
        edge_paths = [
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            "/usr/bin/microsoft-edge"
        ]
        if any(os.path.exists(p) for p in chrome_paths):
            config["channel"] = "chrome"
        elif any(os.path.exists(p) for p in edge_paths):
            config["channel"] = "msedge"

    return config

_standard_logger = logging.getLogger("AutoFlow")
_standard_logger.setLevel(logging.INFO)

class CustomFormatter(logging.Formatter):
    def format(self, record):
        dt = datetime.datetime.fromtimestamp(record.created)
        return f"[{dt.strftime('%I:%M:%S %p')}] {record.getMessage()}"

DOWNLOAD_PATH = BASE_DIR / "Downloads"
LOG_FILES_PATH = DOWNLOAD_PATH / "logfiles"
LOG_FILES_PATH.mkdir(parents=True, exist_ok=True)

class LoguruCompatibilityWrapper:
    """A wrapper to allow standard logging to respond to Loguru-style calls."""
    def __init__(self, logger_obj: logging.Logger):
        self._logger = logger_obj
        self.current_log_file = None
        self.on_log_file_change = None

    def __getattr__(self, name: str) -> Any:
        return getattr(self._logger, name)

    def success(self, msg: str, *args: Any, **kwargs: Any) -> None:
        self._logger.info(f"✅ {msg}", *args, **kwargs)

    def log(self, level_or_msg: Any, msg: Optional[str] = None, *args: Any, **kwargs: Any) -> None:
        if isinstance(level_or_msg, str) and msg is None:
            self._logger.info(level_or_msg, *args, **kwargs)
        elif isinstance(level_or_msg, str) and isinstance(msg, str):
            lvl = getattr(logging, level_or_msg.upper(), logging.INFO)
            self._logger.log(lvl, msg, *args, **kwargs)
        else:
            self._logger.log(level_or_msg, msg or "", *args, **kwargs)

    def start_file_logging(self, name_prefix: str = "automation"):
        """Initialize a new log file for the session."""
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"{name_prefix}_{timestamp}.log"
        log_path = LOG_FILES_PATH / filename
        
        for handler in self._logger.handlers[:]:
            if isinstance(handler, logging.FileHandler):
                self._logger.removeHandler(handler)
        
        fh = logging.FileHandler(log_path, encoding='utf-8')
        fh.setFormatter(CustomFormatter())
        self._logger.addHandler(fh)
        
        if not any(isinstance(h, logging.StreamHandler) for h in self._logger.handlers):
            sh = logging.StreamHandler()
            sh.setFormatter(CustomFormatter())
            self._logger.addHandler(sh)
            
        self.current_log_file = str(log_path)
        self._logger.info(f"Log session started: {filename}")

        if self.on_log_file_change:
            try:
                self.on_log_file_change(self.current_log_file)
            except Exception:
                pass

        return self.current_log_file

logger: Any = LoguruCompatibilityWrapper(_standard_logger)

from email.message import EmailMessage
try:
    import aiosmtplib  # type: ignore
except ImportError:  # pragma: no cover
    aiosmtplib = None

WEBSITE_B_URL = os.getenv("WEBSITE_B_URL", "https://strdjrb-pramaan-appraisal.hf.space/")
WEBSITE_B_USERNAME = os.getenv("WEBSITE_B_USERNAME", "strdjrbservices")
WEBSITE_B_PASSWORD = os.getenv("WEBSITE_B_PASSWORD", "Admin")

WEBSITE_B_USERNAME_SELECTOR = "xpath=//label[contains(., 'Username')]/following-sibling::div/input | //input[@label='Username'] | //input[@name='username']"
WEBSITE_B_PASSWORD_SELECTOR = "xpath=//label[contains(., 'Password')]/following-sibling::div/input | //input[@type='password']"
WEBSITE_B_LOGIN_BUTTON_SELECTOR = "button[type='submit'], button:has-text('LOG IN'), button:has-text('Log In')"
PDF_UPLOAD_SELECTOR = "xpath=//div[contains(@class, 'MuiPaper-root') and .//*[contains(., 'PDF')]]//input[@type='file'] | //input[@type='file'][contains(@accept, '.pdf')]"
XML_UPLOAD_SELECTOR = "xpath=//div[contains(@class, 'MuiPaper-root') and .//*[contains(., 'XML')]]//input[@type='file'] | //input[@type='file'][contains(@accept, '.xml')]"
NEW_FILE_UPLOAD_SELECTOR_REVISED = "xpath=//label[contains(., 'New') or contains(., 'NEW')]//input[@type='file']"
HTML_UPLOAD_SELECTOR_REVISED = "xpath=//label[contains(., 'HTML') or contains(., 'Html') or contains(., 'html')]//input[@type='file']"
HTML_UPLOAD_SELECTOR = "xpath=//div[contains(@class, 'MuiPaper-root') and .//*[contains(., 'HTML')]]//input[@type='file'] | //input[@type='file'][contains(@accept, '.html')] | //label[contains(., 'Upload HTML')]//input[@type='file'] | //button[contains(., 'Upload HTML')]//input[@type='file']"
SUBMIT_BUTTON_SELECTOR = '#submit-form-button'
MAIN_LOADING_INDICATOR_SELECTOR = "xpath=//*[contains(@class, 'MuiCircularProgress-root') or contains(@class, 'MuiLoadingButton-loadingIndicator')]"
FULL_FILE_REVIEW_BUTTON_SELECTOR = "xpath=//a[contains(., 'Full File Review')] | //button[contains(., 'Full File Review')] | //div[contains(., 'Full File Review')]"
REVISED_FILE_REVIEW_BUTTON_SELECTOR = (
    "xpath=//p[normalize-space()='Revised File Review'] "
    "| //p[contains(text(), 'Revised File Review')] "
    "| //a[contains(@href, 'compare')] "
    "| //a[contains(@href, '/compare')] "
    "| /html/body/div[2]/div[3]/div[1]/div[5]/div[4]/a[1]/div[1] "
    "| //body/div[2]/div[3]/div[1]/div[5]/div[4]/a[1]/div[1]"
)
REVISED_FILE_REVIEW_CSS_SELECTOR = "body > div:nth-child(2) > div:nth-child(3) > div:nth-child(1) > div:nth-child(5) > div:nth-child(4) > a:nth-child(1) > div:nth-child(1)"
VERIFY_SUBJECT_ADDRESS_BUTTON_SELECTOR = "xpath=//button[contains(., 'Run Full Analysis')]"
VERIFY_state_requriment_seector = "xpath=//button[contains(., 'Check State Requirements')]"
verify_Check_Client_Requirements = "xpath=//button[contains(., 'Check Client Requirements')]"
verify_Run_Escalation_Check = "xpath=//button[contains(., 'Run Escalation Check')]"
REVISED_PROCESS_BUTTON_SELECTOR = (
    "xpath=//button[contains(., 'VERIFY REVISIONS') or contains(., 'Verify Revisions') or contains(., 'Verify')] "
    "| //button[@type='submit' and contains(., 'Verify')]"
)
CONFIRMATION_CHECKLIST_BUTTON_SELECTOR = (
    "xpath=//button[@value='checklist'] "
    "| //button[contains(., 'CONFIRMATION CHECKLIST') or contains(., 'Confirmation Checklist')] "
    "| //*[contains(@class, 'MuiToggleButton-root') and contains(., 'Checklist')]"
)
PDF_HTML_TOGGLE_BUTTON_SELECTOR = (
    "xpath=//button[@value='pdf-html'] "
    "| //button[contains(., 'NEW XML / PDF TO HTML') or contains(., 'PDF to HTML') or contains(., 'PDF/HTML')] "
    "| //*[contains(@class, 'MuiToggleButton-root') and contains(., 'HTML')]"
)
PDF_PDF_TOGGLE_BUTTON_SELECTOR = (
    "xpath=//button[@value='pdf-pdf'] "
    "| //button[contains(., 'PDF/PDF')] "
    "| //*[contains(@class, 'MuiToggleButton-root') and contains(., 'PDF/PDF')]"
)
OLD_PDF_UPLOAD_SELECTOR = "xpath=//label[contains(., 'Old') or contains(., 'OLD')]//input[@type='file']"
PIN_SIDEBAR_BUTTON_SELECTOR = "xpath=//button[contains(@class, 'sidebar-toggle-btn')] | //button[@aria-label='Pin Sidebar'] | //button[@title='Pin Sidebar']"
DOWNLOAD_PATH = BASE_DIR / "Downloads"

OLD_FILES_REVISED_PATH = DOWNLOAD_PATH / "old_files_revised"
NEW_FILES_REVISED_PATH = DOWNLOAD_PATH / "new_files_revised"
HTML_FILES_PATH = DOWNLOAD_PATH / "HTMLFiles"
LOG_FILES_PATH = DOWNLOAD_PATH / "logfiles"
ERROR_SCREENSHOTS_PATH = DOWNLOAD_PATH / "error_screenshots"
PROCESSED_FILES_PATH = DOWNLOAD_PATH / "Processed"
ERROR_FILES_PATH = DOWNLOAD_PATH / "Errors"
FULL_FILE_LOGS_PATH = DOWNLOAD_PATH / "full_file_logs"
FULL_FILE_PATH = DOWNLOAD_PATH / "Full File"

for folder in [DOWNLOAD_PATH, OLD_FILES_REVISED_PATH, NEW_FILES_REVISED_PATH, HTML_FILES_PATH, LOG_FILES_PATH, ERROR_SCREENSHOTS_PATH, PROCESSED_FILES_PATH, ERROR_FILES_PATH, FULL_FILE_PATH, FULL_FILE_LOGS_PATH]:
    folder.mkdir(parents=True, exist_ok=True)

PAUSE_LOCK_FILE = BASE_DIR / "pause.lock"
TERMINATION_LOCK_FILE = BASE_DIR / "stop.lock"

async def check_pause_state() -> None:
    """Block execution while a pause lock file exists or raise if killed."""
    if TERMINATION_LOCK_FILE.exists():
        logger.error('🛑 Automation termination signal detected. Halted.')
        raise InterruptedError("Automation terminated by user request.")

    if PAUSE_LOCK_FILE.exists():
        logger.warning('⏸ Automation paused. Waiting for resume...')
        while PAUSE_LOCK_FILE.exists():
            if TERMINATION_LOCK_FILE.exists():
                logger.error('🛑 Automation termination signal detected during pause. Halted.')
                raise InterruptedError("Automation terminated by user request.")
            await asyncio.sleep(0.5)
        logger.info('▶ Automation resumed.')

def check_pause_state_sync() -> None:
    """Synchronous version of check_pause_state."""
    import time
    if TERMINATION_LOCK_FILE.exists():
        logger.error('🛑 Automation termination signal detected. Halted.')
        raise InterruptedError("Automation terminated by user request.")

    if PAUSE_LOCK_FILE.exists():
        logger.warning('⏸ Automation paused. Waiting for resume...')
        while PAUSE_LOCK_FILE.exists():
            if TERMINATION_LOCK_FILE.exists():
                logger.error('🛑 Automation termination signal detected during pause. Halted.')
                raise InterruptedError("Automation terminated by user request.")
            time.sleep(0.5)
        logger.info('▶ Automation resumed.')

async def wait_for_download(
    context: pw.BrowserContext,
    expected_file_type: str,
    timeout_ms: int = 180_000,
) -> str:
    """Wait for a download to finish and return the file path.

    Playwright emits a ``download`` event on the ``Page`` object. Here we listen on
    the *context* level because the original JS listened to the CDP session.
    """
    logger.info(f"Waiting for {expected_file_type} download to complete…")
    try:
        download = await context.wait_for_event('download', timeout=timeout_ms)
        file_path = await download.path()
        logger.info(f"{expected_file_type} download completed: {file_path}")
        return str(file_path) if file_path else ""
    except Exception as e:
        raise TimeoutError(
            f"Timeout waiting for {expected_file_type} download (after {timeout_ms} ms)."
        ) from e

async def wait_and_click(
    page: pw.Page,
    selector: str,
    element_name: str,
    retries: int = 3,
) -> None:
    """Wait for an element, scroll into view, and click it.

    Retries are performed with a 5‑second back‑off, mirroring the original
    implementation. Sidebar items trigger an additional pin action.
    """
    await check_pause_state()
    logger.info(f'Waiting for and clicking "{element_name}"...')
    is_sidebar_item = 'sidebar item' in element_name.lower()

    for attempt in range(retries + 1):
        try:
            if is_sidebar_item:
                sidebar_container_selector = "xpath=//div[contains(@class, 'sidebar')]"
                sidebar = await page.wait_for_selector(sidebar_container_selector, timeout=5000)
                if sidebar:
                    await sidebar.evaluate('el => el.scrollIntoView()')

            element = await page.wait_for_selector(selector, timeout=30_000)
            if not element:
                raise RuntimeError(f'Element "{element_name}" not found with selector "{selector}".')
            await element.evaluate('el => el.scrollIntoView()')
            await element.click()
            logger.info(f'"{element_name}" clicked successfully.')

            if is_sidebar_item:
                try:
                    pin_btn = await page.wait_for_selector(
                        PIN_SIDEBAR_BUTTON_SELECTOR, timeout=2000, state='visible'
                    )
                    if pin_btn:
                        logger.info('Pinning the sidebar…')
                        await pin_btn.click()
                        logger.info('Sidebar pinned.')
                except Exception:
                    logger.info('Sidebar pin button not found – assuming already pinned.')
            return
        except Exception as err:
            logger.warning(
                f'Attempt {attempt + 1} failed for "{element_name}". Error: {err}'
            )
            if attempt < retries:
                delay = 5
                logger.info(f'Retrying in {delay}s…')
                await asyncio.sleep(delay)
            else:
                raise RuntimeError(
                    f'Failed to click "{element_name}" after {retries + 1} attempts.'
                ) from err

async def process_sidebar_item(
    page: pw.Page,
    section_name: str,
    timeout_ms: int,
) -> None:
    """Select a sidebar entry and wait for its processing spinner to finish."""
    await check_pause_state()
    logger.info(
        f'--- Processing Sidebar Item: {section_name} (Timeout: {timeout_ms / 1000}s) ---'
    )
    start = asyncio.get_event_loop().time()

    sidebar_selector = (
        f"xpath=//div[contains(@class, 'sidebar')]//a[.//span["
        f"contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{section_name.lower()}')]]"
    )
    await wait_and_click(page, sidebar_selector, f'{section_name} sidebar item')

    spinner_selector = (
        f"xpath=//div[contains(@class, 'sidebar')]//a[.//span[contains(text(), '{section_name}')]]"
        f"//*[contains(@class, 'MuiCircularProgress-root')]"
    )
    try:
        await page.wait_for_selector(spinner_selector, state='visible', timeout=5_000)
        logger.info(f'Spinner for {section_name} appeared.')
    except Exception:
        logger.warning(
            f'Spinner for {section_name} did not appear. Clicking again to ensure extraction starts.'
        )
        await wait_and_click(page, sidebar_selector, f'{section_name} sidebar item (2nd attempt)', retries=0)

    logger.info(f'Waiting for {section_name} processing to complete…')
    await page.wait_for_selector(spinner_selector, state='hidden', timeout=timeout_ms)
    await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state='hidden', timeout=timeout_ms)

    duration = (asyncio.get_event_loop().time() - start) / 1
    logger.info(
        f'Extraction of {section_name} section completed in {duration:.2f}s.'
    )

async def perform_login(page: pw.Page, is_first_run: bool, username: Optional[str] = None, password: Optional[str] = None) -> None:
    """Log in to the application on the first run, otherwise verify the session."""
    user = username or WEBSITE_B_USERNAME
    pwd = password or WEBSITE_B_PASSWORD

    if is_first_run:
        if not (user and pwd):
            raise RuntimeError(
                'Username and password not set in environment variables.'
            )
        logger.info('Attempting to log in…')
        try:
            try:
                await page.wait_for_selector("xpath=//*[contains(text(), 'DJRB Review') or contains(text(), 'Sign in')]", timeout=10_000)
                logger.info('Login page loaded.')
            except Exception:
                pass

            await page.wait_for_selector(WEBSITE_B_USERNAME_SELECTOR, timeout=30_000)
            logger.info('Login form found. Entering credentials…')
            await page.fill(WEBSITE_B_USERNAME_SELECTOR, user)
            await page.fill(WEBSITE_B_PASSWORD_SELECTOR, pwd)
            await page.locator(WEBSITE_B_LOGIN_BUTTON_SELECTOR).first.click()
            logger.info('Login button clicked. Waiting for response…')

            welcome_selector = "xpath=//body//*[self::h1 or self::h2 or self::h3 or self::p or self::span][contains(text(), 'DJRB') or contains(text(), 'Review')]"
            error_selector = "xpath=//body//*[contains(@class, 'MuiAlert-root') and (contains(., 'Invalid') or contains(., 'failed'))]"
            
            welcome_task = asyncio.create_task(page.wait_for_selector(welcome_selector, timeout=60000))
            error_task = asyncio.create_task(page.wait_for_selector(error_selector, timeout=60000))
            
            done, pending = await asyncio.wait(
                [welcome_task, error_task],
                return_when=asyncio.FIRST_COMPLETED,
            )
            
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                except Exception:
                    pass

            if error_task in done:
                raise RuntimeError('Login failed – invalid credentials.')
            
            if welcome_task in done:
                logger.info('Login successful! Welcome text found.')
            else:
                raise RuntimeError('Login failed: Neither welcome nor error message appeared.')
        except Exception as exc:
            raise RuntimeError(f'Login failed: {exc}') from exc
    else:
        logger.info('Skipping login for subsequent run – assuming session is active.')
        try:
            welcome_selector = "xpath=//*[contains(text(), 'DJRB') or contains(text(), 'Review')]"
            await page.wait_for_selector(welcome_selector, timeout=30_000)
            logger.info('Dashboard loaded, session is active.')
        except Exception as exc:
            raise RuntimeError(
                'Could not verify active session on subsequent run.'
            ) from exc

async def send_email(
    subject: str,
    body_text: str,
    attachment_paths: Union[str, List[str], None] = None,
    recipients: Optional[str] = None,
    html_body: Optional[str] = None,
    cc: Optional[Union[str, List[str]]] = None,
) -> None:
    """Send an email with optional attachments.

    Uses SSL on port 465 or STARTTLS on port 587 with automatic fallback to standard smtplib.
    Note: For Gmail, you likely need to use an 'App Password' if 2FA is enabled.
    See: https://support.google.com/mail/answer/185833
    """
    import smtplib

    email_user = os.getenv('EMAIL_USER', 'strdjrbservices@gmail.com')
    email_to = recipients or os.getenv('EMAIL_TO', 'strdjrbservices2@gmail.com')
    email_pass = os.getenv('EMAIL_PASS', 'aqzt opqm rnpr qypr')
    
    raw_cc = cc or os.getenv('EMAIL_CC', 'strdjrbservices3@gmail.com')
    if isinstance(raw_cc, list):
        email_cc = ", ".join(raw_cc)
    else:
        email_cc = raw_cc
    
    if not email_pass:
        logger.warning('EMAIL_PASS not set in environment – skipping email sending.')
        return False

    allowed_attachments = []
    omitted_files = []
    if attachment_paths:
        if isinstance(attachment_paths, str):
            attachment_paths = [attachment_paths]
        
        valid_attachments = []
        for path_str in attachment_paths:
            p = Path(path_str)
            if p.is_file():
                valid_attachments.append((p, p.stat().st_size))
            else:
                logger.warning(f"Attachment file not found: {path_str}")
        
        valid_attachments.sort(key=lambda x: x[1])
        max_total_size = 18 * 1024 * 1024
        total_size = 0
        
        for p, size in valid_attachments:
            if total_size + size <= max_total_size:
                allowed_attachments.append(p)
                total_size += size
            else:
                omitted_files.append((p, size))
                logger.warning(
                    f"Email attachment {p.name} ({size / (1024 * 1024):.2f} MB) omitted "
                    f"to prevent exceeding Gmail size limit."
                )

    if omitted_files:
        omitted_note = (
            "\n\n---\n"
            "⚠️ Note: The following attachment(s) were omitted because they exceeded Google's message size limits:\n"
        )
        for p, size in omitted_files:
            omitted_note += f"- {p.name} ({size / (1024 * 1024):.2f} MB)\n"
        omitted_note += "You can retrieve these files directly from the server or app workspace."
        body_text += omitted_note
        
        if html_body:
            omitted_html = omitted_note.replace('\n', '<br>')
            html_body += f"<br><br><div style='padding: 10px; border: 1px solid #ffcc00; background-color: #fff9e6; color: #665200;'>{omitted_html}</div>"

    msg = EmailMessage()
    msg['From'] = email_user
    msg['To'] = email_to
    if email_cc:
        msg['Cc'] = email_cc
    msg['Subject'] = subject
    msg.set_content(body_text)
    if html_body:
        msg.add_alternative(html_body, subtype='html')

    for p in allowed_attachments:
        with p.open('rb') as f:
            data = f.read()
        msg.add_attachment(
            data,
            maintype='application',
            subtype='octet-stream',
            filename=p.name,
        )

    clean_email_pass = email_pass.replace(" ", "").strip()

    def _send_sync():
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=180) as server:
            server.login(email_user, clean_email_pass)
            server.send_message(msg)

    try:
        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, _send_sync)
        except RuntimeError:
            _send_sync()

        if email_cc:
            logger.info(f'Email sent to {email_to} (CC: {email_cc}).')
        else:
            logger.info(f'Email sent to {email_to}.')
        return True
    except Exception as e:
        err_msg = str(e)
        logger.error(f'Failed to send email: {err_msg}')
        return False

async def click_and_wait_for_extraction(
    page: pw.Page,
    selector: str,
    element_name: str,
    timeout_ms: int,
) -> None:
    """Click a button and wait for the global loading indicator to disappear."""
    await check_pause_state()
    await wait_and_click(page, selector, element_name)
    logger.info(f'Waiting for "{element_name}" extraction to complete…')
    try:
        await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state='visible', timeout=5_000)
        logger.info(f'Loading indicator appeared for "{element_name}".')
    except Exception:
        logger.warning(
            f'Loading indicator for "{element_name}" did not appear. Clicking again.'
        )
        await wait_and_click(page, selector, f'{element_name} (2nd attempt)')
        try:
            await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state='visible', timeout=5_000)
            logger.info(
                f'Loading indicator appeared for "{element_name}" on 2nd attempt.'
            )
        except Exception:
            logger.warning(
                f'Loading indicator still not visible after retry – proceeding to wait for hidden state.'
            )
    await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state='hidden', timeout=timeout_ms)
    logger.info(f'"{element_name}" operation completed.')

__all__ = [
    'WEBSITE_B_URL',
    'WEBSITE_B_USERNAME',
    'WEBSITE_B_PASSWORD',
    'WEBSITE_B_USERNAME_SELECTOR',
    'WEBSITE_B_PASSWORD_SELECTOR',
    'WEBSITE_B_LOGIN_BUTTON_SELECTOR',
    'PDF_UPLOAD_SELECTOR',
    'XML_UPLOAD_SELECTOR',
    'HTML_UPLOAD_SELECTOR',
    'NEW_FILE_UPLOAD_SELECTOR_REVISED',
    'HTML_UPLOAD_SELECTOR_REVISED',
    'SUBMIT_BUTTON_SELECTOR',
    'MAIN_LOADING_INDICATOR_SELECTOR',
    'FULL_FILE_REVIEW_BUTTON_SELECTOR',
    'REVISED_FILE_REVIEW_BUTTON_SELECTOR',
    'REVISED_FILE_REVIEW_CSS_SELECTOR',
    'VERIFY_SUBJECT_ADDRESS_BUTTON_SELECTOR',
    'VERIFY_state_requriment_seector',
    'verify_Check_Client_Requirements',
    'verify_Run_Escalation_Check',
    'REVISED_PROCESS_BUTTON_SELECTOR',
    'CONFIRMATION_CHECKLIST_BUTTON_SELECTOR',
    'PDF_HTML_TOGGLE_BUTTON_SELECTOR',
    'PDF_PDF_TOGGLE_BUTTON_SELECTOR',
    'OLD_PDF_UPLOAD_SELECTOR',
    'PIN_SIDEBAR_BUTTON_SELECTOR',
    'DOWNLOAD_PATH',
    'OLD_FILES_REVISED_PATH',
    'NEW_FILES_REVISED_PATH',
    'HTML_FILES_PATH',
    'LOG_FILES_PATH',
    'ERROR_SCREENSHOTS_PATH',
    'PROCESSED_FILES_PATH',
    'ERROR_FILES_PATH',
    'FULL_FILE_PATH',
    'FULL_FILE_LOGS_PATH',
    'PAUSE_LOCK_FILE',
    'wait_for_download',
    'wait_and_click',
    'process_sidebar_item',
    'click_and_wait_for_extraction',
    'send_email',
    'perform_login',
    'check_pause_state',
    'check_pause_state_sync',
    'TERMINATION_LOCK_FILE',
    'IS_PRODUCTION',
    'get_browser_config',
    'BASE_DIR',
]
