"""
Gemma Verification Engine for Appraisal Revision Review.
Supports:
1. Local Ollama (e.g. gemma3:4b, gemma4:e4b, gemma2:2b / 9b on localhost:11434) - Fastest & zero setup
2. Local Hugging Face Transformers (AutoModelForCausalLM / AutoTokenizer in-process PyTorch)
3. Local llama-cpp-python (GGUF in-process)
"""

import json
import logging
import os
import re
import urllib.request
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_MODEL_ID = os.environ.get("GEMMA_MODEL_ID", "google/gemma-2-2b-it")
DEFAULT_GGUF_PATH = os.environ.get("GEMMA_GGUF_PATH", "")
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")

_GLOBAL_GEMMA_VERIFIER: Optional["GemmaVerifier"] = None


class GemmaVerifier:
    def __init__(
        self,
        model_id: str = DEFAULT_MODEL_ID,
        gguf_path: str = DEFAULT_GGUF_PATH,
        ollama_url: str = OLLAMA_BASE_URL,
        device: Optional[str] = None,
        max_new_tokens: int = 512,
        temperature: float = 0.1,
    ):
        self.model_id = model_id
        self.gguf_path = gguf_path
        self.ollama_url = ollama_url.rstrip("/")
        self.device = device
        self.max_new_tokens = max_new_tokens
        self.temperature = temperature

        self._backend = None  # 'ollama', 'transformers', or 'llama_cpp'
        self._ollama_model = None
        self._model = None
        self._tokenizer = None
        self._llama = None
        self._is_loaded = False
        self._load_error = None

    def load_model(self) -> bool:
        """Loads or connects to Gemma (lazy loaded on first request)."""
        if self._is_loaded:
            return True

        is_hf_space = bool(os.environ.get("SPACE_ID") or os.environ.get("HF_SPACE_ID"))

        # -------------------------------------------------------------
        # 1. Local Ollama (only when running locally outside HF Space)
        # -------------------------------------------------------------
        if not is_hf_space:
            try:
                req = urllib.request.Request(f"{self.ollama_url}/api/tags")
                with urllib.request.urlopen(req, timeout=2) as resp:
                    data = json.loads(resp.read().decode())
                    models = [m.get("name", "") for m in data.get("models", [])]
                    chosen = None
                    for m in models:
                        m_low = m.lower()
                        if "gemma3" in m_low or "gemma2" in m_low or "gemma" in m_low:
                            chosen = m
                            break
                    if chosen:
                        self._ollama_model = chosen
                        self._backend = "ollama"
                        self._is_loaded = True
                        logger.info(f"Connected to local Ollama using model: {chosen}")
                        return True
            except Exception as e:
                logger.debug(f"Ollama connection check note: {e}")

        # -------------------------------------------------------------
        # 2. Check local GGUF path via llama-cpp-python
        # -------------------------------------------------------------
        if self.gguf_path and os.path.exists(self.gguf_path):
            try:
                import llama_cpp
                logger.info(f"Loading Gemma from local GGUF: {self.gguf_path}")
                self._llama = llama_cpp.Llama(
                    model_path=self.gguf_path,
                    n_ctx=4096,
                    n_threads=os.cpu_count() or 4,
                    verbose=False,
                )
                self._backend = "llama_cpp"
                self._is_loaded = True
                logger.info("Successfully loaded Gemma via llama-cpp-python.")
                return True
            except Exception as e:
                logger.warning(f"Failed to load GGUF via llama-cpp-python: {e}")

        # -------------------------------------------------------------
        # 3. In-process Hugging Face Transformers (PyTorch Native Option B)
        # -------------------------------------------------------------
        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer

            chosen_device = self.device
            if not chosen_device:
                chosen_device = "cuda" if torch.cuda.is_available() else "cpu"

            hf_token = os.environ.get("HF_TOKEN") or None
            target_model_id = self.model_id

            # If no HF_TOKEN is provided and default gated model is requested, fallback to identical un-gated mirror
            if not hf_token and target_model_id == "google/gemma-2-2b-it":
                target_model_id = "unsloth/gemma-2-2b-it"

            logger.info(f"Loading Gemma model '{target_model_id}' via Transformers on {chosen_device}...")

            torch_dtype = torch.float32
            if chosen_device == "cuda":
                torch_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16

            try:
                self._tokenizer = AutoTokenizer.from_pretrained(target_model_id, token=hf_token)
            except Exception as e_tok:
                # If gated error on google/gemma-2-2b-it, retry with un-gated mirror
                if target_model_id != "unsloth/gemma-2-2b-it":
                    logger.warning(f"Gated model access note ({e_tok}); attempting un-gated mirror 'unsloth/gemma-2-2b-it'...")
                    target_model_id = "unsloth/gemma-2-2b-it"
                    self._tokenizer = AutoTokenizer.from_pretrained(target_model_id)
                else:
                    raise

            if chosen_device == "cuda":
                self._model = AutoModelForCausalLM.from_pretrained(
                    target_model_id,
                    token=hf_token,
                    torch_dtype=torch_dtype,
                    device_map="auto",
                )
            else:
                self._model = AutoModelForCausalLM.from_pretrained(
                    target_model_id,
                    token=hf_token,
                    torch_dtype=torch_dtype,
                    low_cpu_mem_usage=True,
                )
                self._model.to("cpu")

            self._model.eval()
            self._model_id_loaded = target_model_id
            self._backend = "transformers"
            self._is_loaded = True
            logger.info(f"Successfully loaded Gemma model '{target_model_id}' on {chosen_device}.")
            return True

        except Exception as e:
            logger.warning(f"In-process Transformers load note: {e}")

        # -------------------------------------------------------------
        # 4. Fallback: Google Generative AI API (if APIKEY is set on HF)
        # -------------------------------------------------------------
        api_key = os.environ.get("APIKEY") or os.environ.get("GEMINI_API_KEY")
        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                self._genai_model = genai.GenerativeModel("gemini-1.5-flash")
                self._backend = "google_api"
                self._is_loaded = True
                logger.info("Using Google Generative AI API on Hugging Face Spaces.")
                return True
            except Exception as e:
                logger.warning(f"Google Generative AI fallback note: {e}")

        self._load_error = "No Gemma backend available."
        return False

    def is_available(self) -> bool:
        if self._is_loaded:
            return True
        return self.load_model()

    def get_backend_name(self) -> str:
        if self._backend == "ollama":
            return f"Gemma ({self._ollama_model} via Ollama)"
        if self._backend == "llama_cpp":
            return "Gemma (GGUF via llama-cpp)"
        if self._backend == "transformers":
            loaded_id = getattr(self, "_model_id_loaded", self.model_id)
            return f"Gemma ({loaded_id} via Transformers)"
        if self._backend == "google_api":
            return "Gemini/Gemma (Cloud API on HF)"
        return "Gemma"

    def _extract_targeted_context(
        self,
        revision_item: str,
        new_rep: Dict[str, Any],
        old_rep: Optional[Dict[str, Any]] = None,
        candidate_evidence: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Gathers high-relevance evidence excerpts from the report pages and fields
        matching the specific revision item terms (e.g., fee amounts, registration numbers, comp addresses).
        """
        context_parts = []
        pages = new_rep.get("pages_text", [])

        # Extract specific search keywords and identifier tokens (e.g. '500', '42AC00012300', 'fee', 'amc')
        raw_tokens = re.findall(r"[A-Za-z0-9\$\#\-\.]{2,}", revision_item)
        stop_tokens = {"please", "comment", "provide", "report", "the", "in", "and", "for", "with", "that", "this"}
        search_terms = [t.lower() for t in raw_tokens if t.lower() not in stop_tokens]

        # 1. Search across all pages for lines/paragraphs containing the search terms
        exact_matches = []
        for p in pages:
            txt = p.get("text", "")
            p_no = p.get("page_no", 1)
            lines = txt.split("\n")
            for idx, line in enumerate(lines):
                l_low = line.lower()
                # Check if this line contains any significant token (especially numbers/codes)
                matched_in_line = [t for t in search_terms if t in l_low]
                if matched_in_line:
                    # Capture surrounding 2 lines for full sentence context
                    start_i = max(0, idx - 1)
                    end_i = min(len(lines), idx + 2)
                    snippet = " ".join(lines[start_i:end_i]).strip()
                    exact_matches.append(f"[Page {p_no}]: \"{snippet}\"")

        if exact_matches:
            # Dedup and limit
            unique_matches = list(dict.fromkeys(exact_matches))[:5]
            context_parts.append("Report Content Matching Request Terms:\n" + "\n".join(unique_matches))
        else:
            context_parts.append("Note: The specific identifiers/values requested were NOT found verbatim in the report text.")

        # 2. Candidate evidence if detected by heuristic extractor (excluding preprinted boilerplate)
        if candidate_evidence and candidate_evidence.get("excerpt"):
            c_exc = candidate_evidence["excerpt"]
            c_low = c_exc.lower()
            is_boilerplate = any(b in c_low for b in [
                "withholding or threatening", "limiting conditions", "appraiser's certification",
                "scope of work requirements stated in this", "timely payment or partial payment",
                "supervisory appraiser's certification"
            ])
            if not is_boilerplate and (any(t in c_low for t in search_terms) or len(c_exc) > 15):
                context_parts.append(
                    f"Candidate Addenda Evidence:\n"
                    f"\"{c_exc}\"\n"
                    f"(Source: {candidate_evidence.get('source', 'Addenda')}, Page: {candidate_evidence.get('page_no', 'N/A')})"
                )

        # 3. Form fields matching revision item terms (e.g. Assignment Type, Contract Price, Flood Zone, etc.)
        fields = new_rep.get("fields", {})
        old_fields = old_rep.get("fields", {}) if old_rep else {}
        matched_fields = []

        for sec_name, sec_dict in fields.items():
            if not isinstance(sec_dict, dict):
                continue
            old_sec_dict = old_fields.get(sec_name, {}) if isinstance(old_fields.get(sec_name), dict) else {}
            for field_name, field_val in sec_dict.items():
                if not field_val:
                    continue
                fn_lower = field_name.lower()
                fv_lower = str(field_val).lower()
                if any(t in fn_lower or t in fv_lower for t in search_terms):
                    old_v = old_sec_dict.get(field_name, "")
                    diff_str = f" [UPDATED from Prior Report value: '{old_v}']" if (old_v and str(old_v).strip().lower() != str(field_val).strip().lower()) else ""
                    matched_fields.append(f"- [{sec_name}] {field_name}: \"{field_val}\"{diff_str}")

        if matched_fields:
            context_parts.append("Report Form Fields Matching Revision Terms:\n" + "\n".join(matched_fields[:12]))

        # 4. Subject summary & assignment type
        subject = fields.get("SUBJECT", {})
        if subject:
            addr = subject.get("Property Address", "")
            borrower = subject.get("Borrower", "")
            assign = subject.get("Assignment Type", "") or subject.get("Transaction Type", "")
            context_parts.append(f"Subject Summary: Address='{addr}', Borrower='{borrower}'" + (f", Assignment Type='{assign}'" if assign else ""))

        return "\n\n".join(context_parts)

    def verify_item(
        self,
        item_no: int,
        revision_item: str,
        new_rep: Dict[str, Any],
        old_rep: Optional[Dict[str, Any]] = None,
        candidate_evidence: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Runs Gemma semantic evaluation for an appraisal revision request item.
        """
        if not self.load_model():
            return None

        context = self._extract_targeted_context(revision_item, new_rep, old_rep, candidate_evidence)

        system_instruction = (
            "You are an expert Real Estate Appraisal Quality Control (QC) Underwriter.\n"
            "Your objective is to verify whether the appraiser has fulfilled the revision request in the revised report.\n\n"
            "Evaluation Rules:\n"
            "1. 'Fulfilled': ONLY if the revised report actually contains the requested comment, disclosure, correction, or specific value.\n"
            "2. 'Not Fulfilled': If the requested data, comment, number, or explanation is absent, missing, or still incorrect in the report.\n"
            "3. 'Needs Review': If partially addressed, ambiguous, or requires human underwriter judgment.\n"
            "4. Do NOT assume an item is fulfilled just because general text exists. If a specific number or disclosure is requested (e.g. fee: 500, AMC #), verify if that exact disclosure is present.\n"
            "5. Section must be one of: 'Appraiser & Certifications', 'Subject', 'Sales Comparison', 'Reconciliation', 'Site', 'Improvements', or 'Addenda & Commentary'.\n"
            "6. Output MUST be ONLY valid JSON matching the schema below."
        )

        user_content = (
            f"Revision Request Item #{item_no}:\n"
            f"\"{revision_item}\"\n\n"
            f"Report Context / Evidence Found in Report:\n"
            f"\"\"\"{context}\"\"\"\n\n"
            "Respond ONLY with a JSON object in this format:\n"
            "{\n"
            '  "status": "Fulfilled" | "Not Fulfilled" | "Needs Review",\n'
            '  "section": "Appropriate Section Name",\n'
            '  "page_no": "Page number where fulfilled, or Page N/A",\n'
            '  "revised_finding": "Concise summary of what was found in the revised report (or \'Not Found in Report\')",\n'
            '  "finding": "1-2 sentence confirmation details explaining why it is fulfilled or not fulfilled",\n'
            '  "comment": "Reasoning explaining why this fulfills or fails the request",\n'
            '  "excerpt": "Exact quote from report text showing the disclosure/correction, or empty string if not found"\n'
            "}"
        )

        response_text = ""
        try:
            if self._backend == "ollama":
                prompt = f"{system_instruction}\n\n{user_content}"
                payload = json.dumps({
                    "model": self._ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": self.temperature,
                        "num_predict": self.max_new_tokens,
                    }
                }).encode("utf-8")
                req = urllib.request.Request(
                    f"{self.ollama_url}/api/generate",
                    data=payload,
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=45) as resp:
                    res = json.loads(resp.read().decode())
                    response_text = res.get("response", "").strip()

            elif self._backend == "llama_cpp" and self._llama:
                prompt = f"<start_of_turn>user\n{system_instruction}\n\n{user_content}<end_of_turn>\n<start_of_turn>model\n"
                output = self._llama(
                    prompt,
                    max_tokens=self.max_new_tokens,
                    temperature=self.temperature,
                    stop=["<end_of_turn>", "</s>"],
                )
                response_text = output["choices"][0]["text"].strip()

            elif self._backend == "transformers" and self._model and self._tokenizer:
                import torch

                messages = [
                    {"role": "user", "content": f"{system_instruction}\n\n{user_content}"}
                ]
                if hasattr(self._tokenizer, "apply_chat_template") and self._tokenizer.chat_template:
                    prompt = self._tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
                else:
                    prompt = f"<start_of_turn>user\n{system_instruction}\n\n{user_content}<end_of_turn>\n<start_of_turn>model\n"

                inputs = self._tokenizer(prompt, return_tensors="pt")
                if next(self._model.parameters()).is_cuda:
                    inputs = {k: v.to("cuda") for k, v in inputs.items()}

                with torch.no_grad():
                    outputs = self._model.generate(
                        **inputs,
                        max_new_tokens=self.max_new_tokens,
                        max_length=None,
                        temperature=self.temperature,
                        do_sample=False,
                        pad_token_id=self._tokenizer.eos_token_id,
                    )
                generated_ids = outputs[0][inputs["input_ids"].shape[1] :]
                response_text = self._tokenizer.decode(generated_ids, skip_special_tokens=True).strip()

            elif self._backend == "google_api" and getattr(self, "_genai_model", None):
                prompt = f"{system_instruction}\n\n{user_content}"
                res = self._genai_model.generate_content(prompt)
                response_text = (getattr(res, "text", "") or "").strip()

        except Exception as e:
            logger.error(f"Inference error with Gemma for item #{item_no}: {e}", exc_info=True)
            return None

        return self._parse_json_result(response_text)

    def _parse_json_result(self, raw_text: str) -> Optional[Dict[str, Any]]:
        if not raw_text:
            return None

        try:
            return json.loads(raw_text)
        except Exception:
            pass

        m = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", raw_text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(1))
            except Exception:
                pass

        m_brace = re.search(r"(\{[\s\S]*\})", raw_text, re.DOTALL)
        if m_brace:
            try:
                return json.loads(m_brace.group(1))
            except Exception:
                pass

        logger.warning(f"Could not parse JSON from Gemma response: {raw_text[:200]}")
        return None


def get_gemma_verifier() -> GemmaVerifier:
    global _GLOBAL_GEMMA_VERIFIER
    if _GLOBAL_GEMMA_VERIFIER is None:
        _GLOBAL_GEMMA_VERIFIER = GemmaVerifier()
    return _GLOBAL_GEMMA_VERIFIER
