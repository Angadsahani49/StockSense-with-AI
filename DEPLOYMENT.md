# Direct GitHub & Cloud Deployment Guide for StockSense AI

This project is pre-configured for **1-click automatic deployment to GitHub Pages** using GitHub Actions, as well as Docker, Vercel, Netlify, and Render.

---

## ⚡ Method 1: Automatic Direct Deployment via GitHub Pages (Recommended)

The repository includes a ready-to-use GitHub Actions workflow located at `.github/workflows/deploy.yml`. When you push to GitHub, it will automatically build and publish the live web application.

### Step 1: Initialize Git and Push to Your GitHub Repository
Run these commands in your VS Code terminal:

```bash
# 1. Initialize git (if not already initialized)
git init

# 2. Add all files
git add .

# 3. Create your initial commit
git commit -m "Initial commit of StockSense AI"

# 4. Set the default branch to main
git branch -M main

# 5. Link your GitHub remote repository (replace with your repo URL)
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git

# 6. Push to GitHub
git push -u origin main
```

## 🚨 Why Did the Blank Screen Occur?

When you selected **Branch: `main`** and **Folder: `/ (root)`**, GitHub Pages served the root `index.html` file.
In standard Vite/React projects, root `index.html` references `<script type="module" src="/src/main.tsx"></script>`.
Web browsers **cannot run raw TypeScript (`.tsx`) files directly** without them first being transpiled into JavaScript. Because GitHub Pages is a static file server and not a compiler, the browser could not run the script and displayed a blank white screen.

---

## 🛠️ How to Fix the Blank Screen (2 Easy Options)

We have now compiled the production build into the **`/docs`** folder and added an automatic redirect script to root `index.html`.

### Option 1 (Recommended – Instant 2-Click Fix on `main` branch):
1. In your GitHub repository (`https://github.com/Angadsahani49/StockSense-with-AI`), go to **Settings** &rarr; **Pages** (in left sidebar).
2. Under **Build and deployment**:
   - **Source:** Keep `Deploy from a branch`
   - **Branch:** Select **`main`**
   - **Folder:** Change the dropdown from `/ (root)` to **`/docs`**
   - Click **Save**
3. Wait 30 seconds and refresh `https://angadsahani49.github.io/StockSense-with-AI/` (press `Ctrl + F5` or `Cmd + Shift + R` to clear browser cache).
4. The entire StockSense AI application will load with all 16 products, price history charts, and authentication!

### Option 2 (Automated `gh-pages` branch deployment):
1. Under **Settings** &rarr; **Pages**:
   - Change **Branch** to **`gh-pages`**
   - Folder: **`/ (root)`**
   - Click **Save**
2. Your GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically builds and pushes the compiled files to this branch on every commit.

*(Even if you leave GitHub Pages set to `main` & `/ (root)`, the root `index.html` now has an automatic redirection script that redirects visitors seamlessly to `/docs/` with `.nojekyll` protection enabled).*

---

## 🚀 Method 2: 1-Click Deployment on Vercel or Netlify

1. Push your code to GitHub.
2. Go to [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
3. Click **Add New Project** &rarr; Select your GitHub repository.
4. Settings are detected automatically:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Click **Deploy**. Your app is live with a free custom SSL domain!

---

## 🐳 Method 3: Container Deployment with Docker

The repository includes a production `Dockerfile`.

### Build and Run Locally:
```bash
# Build the Docker image
docker build -t stocksense-ai .

# Run the container on port 3000
docker run -p 3000:3000 stocksense-ai
```
Visit `http://localhost:3000`.

### Deploy to Cloud (Render / Railway / Fly.io / GCP Cloud Run):
Connect your GitHub repository to [Render](https://render.com) or [Railway](https://railway.app), choose **Docker** or **Web Service**, and it will build and run using `Dockerfile`.

---

## 📁 Repository Structure for GitHub Deployment

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions automated build & deployment workflow
├── Dockerfile                # Production multi-stage Docker container
├── DEPLOYMENT.md             # This guide
├── vite.config.ts            # Vite config with base: './' for GitHub Pages
├── .gitignore                # Excludes node_modules, .venv, logs, etc.
├── package.json              # Web dependencies and build scripts
├── src/                      # React, Tailwind, and Plotly dashboard
├── data/                     # 16-product catalog, inventory & sales datasets
├── models/                   # Pretrained ML models & benchmark metrics
└── server.ts                 # Full-stack Node/Express server
```
