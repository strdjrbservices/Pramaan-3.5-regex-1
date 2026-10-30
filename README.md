---
title: Pramaan Appraisal
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: gradio
app_file: app.py
suggested_hardware: cpu-basic
pinned: false
---

# Pramaan 3.5 — Full Stack Appraisal Review System (Regex Pipeline)

Unified Full-Stack Deployment: **React Frontend** + **Django REST Backend** + **Playwright Headless Browser** + **Computer Vision Map & Subject Photo Extractor** running inside a single **Hugging Face Space** using the **Free Gradio SDK** (16 GB RAM + 2 vCPUs).

---

## 🏗️ Architecture

- **Frontend**: React 19 SPA (`pramaan/build/`) with Material UI.
- **Backend**: Django 5.1 REST framework (`appraisal_review/`) with JWT authentication, PyMuPDF, and robust offline regex pipelines.
- **Image & Map Extraction**: OpenCV, EasyOCR, and PyTesseract for subject photos and map pin detection (`map_extractor_cli.py`, `subject_photo_extractor.py`).
- **Database & Persistence**: MongoDB Atlas cloud synchronization with dual-write fallback to SQLite.
- **Automation**: Playwright Chromium headless engine (`appraisal_review/api/automation*.py`).
- **Unified ASGI Server**: `app.py` running Uvicorn on port `7860`.
  - Routes `/api/*`, `/admin/*`, and `/token/*` directly to Django ASGI.
  - Serves static assets (`/static/*`) and media files (`/media/*`).
  - Serves the React single-page application at `/` and all client-side routes.
  - Mounts a status UI at `/status` for health checks.

---

## 🚀 Deployment

Deployed on Hugging Face Spaces with 16 GB RAM and 2 vCPUs.
