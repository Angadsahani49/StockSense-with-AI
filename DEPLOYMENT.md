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

### Step 2: Set GitHub Pages Source to `gh-pages` Branch
1. On GitHub, navigate to your repository `StockSense-with-AI`.
2. Click **Settings** (top tab) &rarr; **Pages** (in the left sidebar menu).
3. Under **Build and deployment** &rarr; **Source**:
   - Keep or select **Deploy from a branch**.
   - Under **Branch**, select **`gh-pages`** and folder **`/ (root)`**.
   - Click **Save**.
4. The workflow will push the built website to the `gh-pages` branch, bypassing all environment protection rule restrictions.
5. In ~30 seconds, your site is live at:
   ```
   https://angadsahani49.github.io/StockSense-with-AI/
   ```

*(Alternative fix for environment protection rule: If you want to use GitHub Actions native deployment instead, go to **Settings &rarr; Environments &rarr; github-pages &rarr; Deployment branches** and click **Add deployment branch rule** &rarr; type `main` &rarr; click **Add rule**).*

*(Note: `vite.config.ts` is configured with `base: './'`, ensuring all assets load without 404s on any GitHub Pages subpath).*

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
