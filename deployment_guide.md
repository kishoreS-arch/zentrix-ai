# 🚀 Zentrix AI Deployment & APK Guide

This plan outlines the steps to deploy your **FastAPI backend (RAG)** and **React frontend**, then convert the application into a professional **Android APK**.

---

## 🛠️ Phase 1: Deploy Backend (FastAPI + Groq)
We recommend **Render.com** for free/easy Python hosting.

### 1. Push Code to GitHub
Ensure your `backend/` folder is part of your GitHub repository.
- Root Repo: `kishoreS-arch/zentrix-ai`
- Create a new branch `deploy` if needed.

### 2. Set Up Render
1.  Log in to [Render.com](https://render.com/).
2.  Click **New +** -> **Web Service**.
3.  Select your repository.
4.  Configure:
    - **Name**: `zentrix-backend`
    - **Root Directory**: `backend` (CRITICAL: Tell Render the app is inside "backend")
    - **Runtime**: `Python`
    - **Build Command**: `pip install -r requirements.txt`
    - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5.  **Environment Variables**:
    - Add `GROQ_API_KEY`: `[Your Groq Key]`
6.  **Deploy**. Once finished, copy your URL (e.g., `https://zentrix-backend.onrender.com`).

---

## 🎨 Phase 2: Deploy Frontend (React + Vite)
We recommend **Firebase Hosting** (since it's already configured) or **Vercel**.

### 1. Update Backend URL
Before building, the frontend needs to know where the backend is.
1.  Open `frontend/.env.local` (or create it).
2.  Add: `VITE_API_URL=https://your-backend-url.onrender.com`

### 2. Build & Deploy (Firebase)
1.  In your terminal:
    ```bash
    cd frontend
    npm install
    npm run build
    firebase deploy
    ```
2.  Copy your site URL (e.g., `https://zentrix-ai.web.app`).

---

## 📱 Phase 3: Convert to APK
Now that your PWA is live, we use **PWABuilder** to wrap it as an APK.

1.  Visit [PWABuilder.com](https://www.pwabuilder.com/).
2.  **Paste your Frontend URL** (e.g., `https://zentrix-ai.web.app`).
3.  Click **Start**.
4.  Click **Package for Store** -> **Android**.
5.  **Configure Options**:
    - **Package ID**: `com.zentrix.ai`
    - **App Name**: `Zentrix AI`
    - **Launcher Name**: `Zentrix`
6.  Click **Download Package**.
    - You will get a `.zip` file containing a `assetlinks.json` (for deep linking) and the `.apk`.
7.  Transfer the `.apk` to your phone and install it.

---

## ✅ Final Checklist
- [ ] Backend status shows **online** in the UI.
- [ ] Chat responds accurately using SEC knowledge.
- [ ] Google/Email login works.
- [ ] Manifest is registered (check DevTools -> Application -> Manifest).

> [!IMPORTANT]
> **Production Optimization**: Once live, updating `allow_origins=["*"]` in `main.py` to your specific frontend URL is recommended for security.
