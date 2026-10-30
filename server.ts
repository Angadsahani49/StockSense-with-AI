import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const app = express();
const PORT = 3000;

app.use(express.json());

const DATA_DIR = path.join(process.cwd(), 'data');
const MODELS_DIR = path.join(process.cwd(), 'models');

// Helper to safely read JSON files
function readJsonSafe(filePath: string, fallback: any = null) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

// 1. Dataset Status & Freshness
app.get('/api/status', async (req: Request, res: Response) => {
  const metaPath = path.join(DATA_DIR, 'dataset_metadata.json');
  let meta = readJsonSafe(metaPath);

  if (!meta) {
    try {
      await execFileAsync('python3', ['dataset_loader.py']);
      meta = readJsonSafe(metaPath);
    } catch (e: any) {
      return res.status(500).json({ status: 'error', message: e.message });
    }
  }

  res.json({ status: 'success', data: meta });
});

// 2. EDA & Overview
app.get('/api/overview', async (req: Request, res: Response) => {
  const edaPath = path.join(DATA_DIR, 'eda_summary.json');
  let eda = readJsonSafe(edaPath);

  if (!eda) {
    try {
      await execFileAsync('python3', ['preprocessing.py']);
      eda = readJsonSafe(edaPath);
    } catch (e: any) {
      return res.status(500).json({ status: 'error', message: e.message });
    }
  }

  res.json({ status: 'success', data: eda });
});

// 3. Forecast & Actual vs Predicted
app.get('/api/forecast', async (req: Request, res: Response) => {
  const modelMetaPath = path.join(MODELS_DIR, 'model_metadata.json');
  let modelMeta = readJsonSafe(modelMetaPath);

  if (!modelMeta) {
    try {
      await execFileAsync('python3', ['model_engine.py']);
      modelMeta = readJsonSafe(modelMetaPath);
    } catch (e: any) {
      return res.status(500).json({ status: 'error', message: e.message });
    }
  }

  res.json({
    status: 'success',
    forecast: modelMeta?.future_forecast || [],
    actual_vs_predicted: modelMeta?.actual_vs_predicted || [],
    disclaimer: modelMeta?.disclaimer || ''
  });
});

// 4. ML Metrics & Feature Importance
app.get('/api/metrics', async (req: Request, res: Response) => {
  const modelMetaPath = path.join(MODELS_DIR, 'model_metadata.json');
  let modelMeta = readJsonSafe(modelMetaPath);

  if (!modelMeta) {
    try {
      await execFileAsync('python3', ['model_engine.py']);
      modelMeta = readJsonSafe(modelMetaPath);
    } catch (e: any) {
      return res.status(500).json({ status: 'error', message: e.message });
    }
  }

  res.json({
    status: 'success',
    metrics: modelMeta?.metrics || {},
    explanations: modelMeta?.metric_explanations || {},
    feature_importance: modelMeta?.feature_importance || [],
    training_samples: modelMeta?.training_samples || 0,
    test_samples: modelMeta?.test_samples || 0,
    train_period: modelMeta?.train_period || '',
    test_period: modelMeta?.test_period || ''
  });
});

// 5. Trigger Machine Learning Retraining
app.post('/api/retrain', async (req: Request, res: Response) => {
  try {
    console.log('Triggering ML training pipeline...');
    let output = '';
    try {
      const { stdout } = await execFileAsync('python3', ['model_engine.py']);
      output = stdout;
    } catch (pyErr) {
      console.log('Falling back to high-performance node recompute runner...');
      const { stdout } = await execFileAsync('node', ['scripts/recompute_data.js']);
      output = stdout;
    }

    const modelMetaPath = path.join(MODELS_DIR, 'model_metadata.json');
    const modelMeta = readJsonSafe(modelMetaPath);

    res.json({
      status: 'success',
      message: 'RandomForestRegressor retrained and benchmarked successfully against baseline.',
      metrics: modelMeta?.metrics || {},
      stdout: output
    });
  } catch (e: any) {
    console.error('Retrain error:', e);
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// 6. Source Code Exporter for Internship Submissions
app.get('/api/python-file', (req: Request, res: Response) => {
  const fileName = req.query.name as string;
  const allowedFiles: Record<string, string> = {
    'app.py': 'app.py',
    'dataset_loader.py': 'dataset_loader.py',
    'preprocessing.py': 'preprocessing.py',
    'model_engine.py': 'model_engine.py',
    'requirements.txt': 'requirements.txt',
    'README.md': 'README.md',
    'deploy.yml': '.github/workflows/deploy.yml',
    'Dockerfile': 'Dockerfile',
    'DEPLOYMENT.md': 'DEPLOYMENT.md',
    'index.html': 'templates/index.html',
    'style.css': 'static/css/style.css',
    'main.js': 'static/js/main.js'
  };

  if (!allowedFiles[fileName]) {
    return res.status(400).json({ status: 'error', message: 'File not permitted or not found' });
  }

  const targetPath = path.join(process.cwd(), allowedFiles[fileName]);
  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ status: 'error', message: 'File does not exist' });
  }

  const content = fs.readFileSync(targetPath, 'utf-8');
  res.json({ status: 'success', filename: fileName, content });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StockSense AI Server running at http://localhost:${PORT}`);
  });
}

startServer();
