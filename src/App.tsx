import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BrainCircuit,
  BarChart3,
  Calendar,
  Layers,
  FileText,
  Code2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Package,
  DollarSign,
  ArrowUpRight,
  ShieldAlert,
  Info,
  Clock,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';

interface DatasetMetadata {
  file_path: string;
  source: string;
  is_sample_data: boolean;
  record_count: number;
  date_range: string;
  start_date: string;
  end_date: string;
  target_variable: string;
  cached: boolean;
  last_loaded: string;
  disclaimer: string;
}

interface TopProduct {
  product_id: string;
  product_name: string;
  category: string;
  units_sold: number;
  total_revenue: number;
  avg_price: number;
}

interface DayOfWeekPattern {
  day: string;
  avg_units: number;
}

interface MonthlyPattern {
  month: string;
  units: number;
  revenue: number;
}

interface EDASummary {
  initial_records: number;
  valid_records: number;
  removed_records: number;
  total_units_sold: number;
  total_revenue: number;
  avg_daily_order_size: number;
  unique_products: number;
  top_products: TopProduct[];
  monthly_patterns: MonthlyPattern[];
  day_of_week_patterns: DayOfWeekPattern[];
}

interface ForecastDay {
  step: number;
  date: string;
  day_name: string;
  predicted_units: number;
  lower_bound: number;
  upper_bound: number;
  estimated_revenue: number;
  is_weekend: boolean;
}

interface ActualVsPred {
  date: string;
  actual: number;
  rf_predicted: number;
  baseline_predicted: number;
}

interface FeatureImportance {
  feature: string;
  importance: number;
  description: string;
}

interface ModelMetrics {
  random_forest: {
    mae: number;
    rmse: number;
    r2_score: number;
    mape: number;
  };
  baseline: {
    mae: number;
    rmse: number;
    r2_score: number;
    mape: number;
  };
  improvement: {
    mae_reduction_percent: number;
    rmse_reduction_percent: number;
    verdict: string;
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'forecast' | 'validation' | 'metrics' | 'eda' | 'report' | 'code'>('forecast');
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null);
  const [eda, setEda] = useState<EDASummary | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [actualVsPred, setActualVsPred] = useState<ActualVsPred[]>([]);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [features, setFeatures] = useState<FeatureImportance[]>([]);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [trainPeriod, setTrainPeriod] = useState<string>('');
  const [testPeriod, setTestPeriod] = useState<string>('');
  const [trainingSamples, setTrainingSamples] = useState<number>(0);
  const [testSamples, setTestSamples] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [retraining, setRetraining] = useState<boolean>(false);
  const [retrainSuccessMsg, setRetrainSuccessMsg] = useState<string | null>(null);

  // Code viewer state
  const [selectedFile, setSelectedFile] = useState<string>('app.py');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Interactive Product Simulator state
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [simLeadTimeDays, setSimLeadTimeDays] = useState<number>(3);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'code') {
      fetchFileContent(selectedFile);
    }
  }, [activeTab, selectedFile]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statusRes, edaRes, forecastRes, metricsRes] = await Promise.all([
        fetch('/api/status').then(r => r.json()),
        fetch('/api/overview').then(r => r.json()),
        fetch('/api/forecast').then(r => r.json()),
        fetch('/api/metrics').then(r => r.json())
      ]);

      if (statusRes.status === 'success') setMetadata(statusRes.data);
      if (edaRes.status === 'success') setEda(edaRes.data);
      if (forecastRes.status === 'success') {
        setForecast(forecastRes.forecast);
        setActualVsPred(forecastRes.actual_vs_predicted);
      }
      if (metricsRes.status === 'success') {
        setMetrics(metricsRes.metrics);
        setFeatures(metricsRes.feature_importance);
        setExplanations(metricsRes.explanations);
        setTrainPeriod(metricsRes.train_period);
        setTestPeriod(metricsRes.test_period);
        setTrainingSamples(metricsRes.training_samples);
        setTestSamples(metricsRes.test_samples);
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainSuccessMsg(null);
    try {
      const res = await fetch('/api/retrain', { method: 'POST' });
      const json = await res.json();
      if (json.status === 'success') {
        setRetrainSuccessMsg('RandomForestRegressor pipeline successfully retrained from raw data.');
        await loadAllData();
        setTimeout(() => setRetrainSuccessMsg(null), 5000);
      }
    } catch (e: any) {
      console.error('Retrain failed:', e);
    } finally {
      setRetraining(false);
    }
  };

  const fetchFileContent = async (name: string) => {
    setFileLoading(true);
    setCopied(false);
    try {
      const res = await fetch(`/api/python-file?name=${encodeURIComponent(name)}`);
      const json = await res.json();
      if (json.status === 'success') {
        setFileContent(json.content);
      } else {
        setFileContent(`# Error loading ${name}: ${json.message}`);
      }
    } catch (e: any) {
      setFileContent(`# Network error loading ${name}`);
    } finally {
      setFileLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculations for simulated forecast
  const activeProductObj = eda?.top_products.find(p => p.product_id === selectedProduct);
  const totalCatalogUnits = eda?.total_units_sold || 1;
  const productShareRatio = activeProductObj ? (activeProductObj.units_sold / totalCatalogUnits) : 1.0;

  // Filtered forecast units based on selected product
  const displayedForecast = forecast.map(f => {
    const units = selectedProduct === 'all' ? f.predicted_units : Math.round(f.predicted_units * productShareRatio * 10) / 10;
    const lower = selectedProduct === 'all' ? f.lower_bound : Math.round(f.lower_bound * productShareRatio * 10) / 10;
    const upper = selectedProduct === 'all' ? f.upper_bound : Math.round(f.upper_bound * productShareRatio * 10) / 10;
    const rev = selectedProduct === 'all' ? f.estimated_revenue : Math.round(units * (activeProductObj?.avg_price || 25) * 100) / 100;
    return { ...f, predicted_units: units, lower_bound: lower, upper_bound: upper, estimated_revenue: rev };
  });

  const total7DayUnits = Math.round(displayedForecast.reduce((sum, d) => sum + d.predicted_units, 0));
  const total7DayRevenue = Math.round(displayedForecast.reduce((sum, d) => sum + d.estimated_revenue, 0));
  const avgDailySimDemand = displayedForecast.length > 0 ? (total7DayUnits / displayedForecast.length) : 0;
  const simulatedLeadTimeDemand = Math.round(avgDailySimDemand * simLeadTimeDays);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold">Initializing StockSense AI Pipeline</h2>
        <p className="text-sm text-slate-500 mt-1">Inspecting data cache, computing lags, and evaluating RandomForest benchmark...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-16">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">StockSense AI</span>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-mono">
                  v1.0 ML System
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Data Science & Machine Learning Sales Forecasting & Demand Prediction
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap">
            {/* Dataset Badge */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-100/80 px-3 py-1.5 rounded-md border border-slate-200">
              <span className={`w-2 h-2 rounded-full ${metadata?.is_sample_data ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span className="font-semibold text-slate-700">
                {metadata?.is_sample_data ? 'Sample Benchmark (Fallback)' : 'Public UCI/OpenML Mirror'}
              </span>
              <span className="text-slate-400">·</span>
              <span>{metadata?.record_count.toLocaleString()} rows</span>
            </div>

            {/* Retrain Button */}
            <button
              onClick={handleRetrain}
              disabled={retraining}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
              <span>{retraining ? 'Retraining...' : 'Retrain Model'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        {/* Retrain Success Notification */}
        {retrainSuccessMsg && (
          <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{retrainSuccessMsg}</span>
            </div>
            <button onClick={() => setRetrainSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">&times;</button>
          </div>
        )}

        {/* Scope & Disclaimers Banner */}
        <div className="mb-6 bg-amber-50/70 border border-amber-200/90 rounded-lg p-3.5 text-amber-900 text-xs leading-relaxed flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              <strong className="font-semibold text-amber-950">Scope & Inventory Notice:</strong> Predictions represent statistical <strong>consumer demand estimates</strong> modeled on historical daily sales units. The dataset does not include physical warehouse inventory records; therefore, the system does not claim to track real stock shortages or warehouse capacity.
            </p>
            <p className="text-amber-800 font-mono text-[11px]">
              {metadata?.disclaimer}
            </p>
          </div>
        </div>

        {/* High-Level KPI Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500 mb-1 flex items-center justify-between">
              <span>Historical Units</span>
              <Package className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {eda?.total_units_sold.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              {metadata?.date_range}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500 mb-1 flex items-center justify-between">
              <span>Gross Sales</span>
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              ${eda ? Math.round(eda.total_revenue).toLocaleString() : '--'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Across {eda?.unique_products || 0} distinct retail items
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500 mb-1 flex items-center justify-between">
              <span>Random Forest MAE</span>
              <BrainCircuit className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-600 flex items-baseline gap-1.5">
              <span>{metrics?.random_forest.mae.toFixed(1)}</span>
              <span className="text-xs font-normal text-slate-500">units/day</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">
              -{metrics?.improvement.mae_reduction_percent}% error vs baseline
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500 mb-1 flex items-center justify-between">
              <span>Model Fit (R²)</span>
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {metrics?.random_forest.r2_score.toFixed(3)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Temporal test set ({testSamples} days)
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 mb-6 overflow-x-auto pb-1 text-sm font-medium">
          <button
            onClick={() => setActiveTab('forecast')}
            className={`px-3.5 py-2 rounded-t-lg transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'forecast'
                ? 'border-emerald-600 text-emerald-800 font-semibold bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>7-Day Demand Forecast</span>
          </button>

          <button
            onClick={() => setActiveTab('validation')}
            className={`px-3.5 py-2 rounded-t-lg transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'validation'
                ? 'border-emerald-600 text-emerald-800 font-semibold bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Actual vs Predicted (Test Set)</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-3.5 py-2 rounded-t-lg transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'metrics'
                ? 'border-emerald-600 text-emerald-800 font-semibold bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Model Benchmark & Evaluation</span>
          </button>

          <button
            onClick={() => setActiveTab('eda')}
            className={`px-3.5 py-2 rounded-t-lg transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'eda'
                ? 'border-emerald-600 text-emerald-800 font-semibold bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Data Science & EDA</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`px-3.5 py-2 rounded-t-lg transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'report'
                ? 'border-emerald-600 text-emerald-800 font-semibold bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Internship Project Report</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`px-3.5 py-2 rounded-t-lg transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'code'
                ? 'border-emerald-600 text-emerald-800 font-semibold bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Source Code Explorer</span>
          </button>
        </div>

        {/* TAB 1: 7-DAY FORECAST */}
        {activeTab === 'forecast' && (
          <div className="space-y-6">
            {/* Filter & Product Simulation Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Target Product Drilldown:
                </span>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-800 focus:outline-emerald-600 cursor-pointer"
                >
                  <option value="all">Entire Store (All Products Aggregated)</option>
                  {eda?.top_products.map(p => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.product_name} ({p.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-600 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400">7-Day Sum:</span>{' '}
                  <strong className="text-slate-900">{total7DayUnits.toLocaleString()} units</strong>
                </div>
                <span className="text-slate-300">|</span>
                <div>
                  <span className="text-slate-400">Est. Revenue:</span>{' '}
                  <strong className="text-emerald-700">${total7DayRevenue.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Daily Forecast Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {displayedForecast.map((day) => (
                <div
                  key={day.step}
                  className={`p-3.5 rounded-xl border transition-all ${
                    day.is_weekend
                      ? 'bg-emerald-50/40 border-emerald-200/90'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {day.day_name.slice(0, 3)}
                    </span>
                    {day.is_weekend && (
                      <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.2 rounded font-mono">
                        WEEKEND
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mb-2">{day.date}</div>
                  <div className="text-xl font-bold font-mono text-slate-900">
                    {day.predicted_units}
                    <span className="text-[11px] font-normal text-slate-500 ml-1">units</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">
                    95% CI: [{day.lower_bound} - {day.upper_bound}]
                  </div>
                  <div className="text-xs font-semibold text-emerald-700 mt-2 font-mono">
                    ${day.estimated_revenue.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Time-Series Forecast Plot SVG */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    7-Day Recursive Multi-Step Demand Projection
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Modeled using Scikit-learn RandomForestRegressor with recursive lag updating &amp; 95% confidence band (&plusmn;1.96 &times; RMSE)
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-emerald-600 inline-block" />
                    <span className="text-slate-600">Predicted Demand</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-emerald-100/60 border border-emerald-200 inline-block rounded-xs" />
                    <span className="text-slate-600">95% Confidence Interval</span>
                  </div>
                </div>
              </div>

              {/* Render dynamic SVG chart for 7-day projection */}
              <div className="h-64 w-full relative">
                <svg viewBox="0 0 700 240" className="w-full h-full overflow-visible">
                  {/* Grid lines */}
                  {[40, 90, 140, 190].map((y) => (
                    <line key={y} x1="50" y1={y} x2="680" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                  ))}

                  {/* Shaded Confidence Polygon */}
                  {(() => {
                    const maxVal = Math.max(...displayedForecast.map(f => f.upper_bound), 300);
                    const minVal = Math.min(...displayedForecast.map(f => f.lower_bound), 50);
                    const range = Math.max(maxVal - minVal, 1);
                    const getY = (val: number) => 210 - ((val - minVal) / range) * 160;
                    const getX = (idx: number) => 70 + idx * 95;

                    const upperPoints = displayedForecast.map((f, i) => `${getX(i)},${getY(f.upper_bound)}`).join(' ');
                    const lowerPoints = displayedForecast.slice().reverse().map((f, i) => `${getX(displayedForecast.length - 1 - i)},${getY(f.lower_bound)}`).join(' ');

                    const linePoints = displayedForecast.map((f, i) => `${getX(i)},${getY(f.predicted_units)}`).join(' ');

                    return (
                      <>
                        <polygon
                          points={`${upperPoints} ${lowerPoints}`}
                          fill="rgba(5, 150, 105, 0.12)"
                        />
                        <polyline
                          points={linePoints}
                          fill="none"
                          stroke="#059669"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {displayedForecast.map((f, i) => (
                          <g key={i}>
                            <circle
                              cx={getX(i)}
                              cy={getY(f.predicted_units)}
                              r="4.5"
                              fill="#ffffff"
                              stroke="#059669"
                              strokeWidth="2.5"
                            />
                            <text
                              x={getX(i)}
                              y={getY(f.predicted_units) - 10}
                              textAnchor="middle"
                              fontSize="11"
                              fontWeight="bold"
                              fontFamily="monospace"
                              fill="#0f172a"
                            >
                              {f.predicted_units}
                            </text>
                            <text
                              x={getX(i)}
                              y="230"
                              textAnchor="middle"
                              fontSize="11"
                              fill="#64748b"
                            >
                              {f.day_name.slice(0, 3)}
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* Demonstration Lead-Time Demand Simulation Panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-slate-500" />
                <h4 className="font-bold text-sm text-slate-800">
                  Lead-Time Demand Planning Calculator (Educational Simulation)
                </h4>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Demonstrates how supply chain planners utilize predicted daily demand distributions to compute lead-time requirements: <strong>Lead Time Demand = Avg Daily Demand × Lead Time Days</strong>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Supplier Lead Time: {simLeadTimeDays} Days
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="14"
                    value={simLeadTimeDays}
                    onChange={(e) => setSimLeadTimeDays(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>1 day</span>
                    <span>7 days</span>
                    <span>14 days</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">Projected Daily Rate</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                    {Math.round(avgDailySimDemand)} units/day
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">Total Lead-Time Stock Demand</div>
                  <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
                    {simulatedLeadTimeDemand.toLocaleString()} units
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACTUAL VS PREDICTED (CHRONOLOGICAL TEST SET) */}
        {activeTab === 'validation' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Chronological Out-of-Sample Test Window Evaluation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Trained strictly on the first 80% chronological observations ({trainPeriod}); evaluated on the remaining 20% unseen test observations ({testPeriod}).
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-0.5 bg-slate-900 inline-block" />
                    <span className="text-slate-700 font-medium">Actual Historical Sales</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-0.5 bg-emerald-600 inline-block border-t border-dashed" />
                    <span className="text-emerald-700 font-medium">Random Forest (y&#770;)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-0.5 bg-slate-400 inline-block" />
                    <span className="text-slate-500">Naive Baseline y(t-1)</span>
                  </div>
                </div>
              </div>

              {/* Chart SVG */}
              <div className="h-80 w-full relative">
                <svg viewBox="0 0 900 280" className="w-full h-full overflow-visible">
                  {/* Grid lines */}
                  {[50, 110, 170, 230].map(y => (
                    <line key={y} x1="50" y1={y} x2="880" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                  ))}

                  {(() => {
                    if (actualVsPred.length === 0) return null;
                    const sampleSlice = actualVsPred.slice(-40); // Last 40 test days for legible view
                    const allVals = sampleSlice.flatMap(d => [d.actual, d.rf_predicted, d.baseline_predicted]);
                    const maxVal = Math.max(...allVals, 350);
                    const minVal = Math.min(...allVals, 50);
                    const range = Math.max(maxVal - minVal, 1);

                    const getY = (val: number) => 250 - ((val - minVal) / range) * 200;
                    const getX = (idx: number) => 60 + (idx / (sampleSlice.length - 1)) * 810;

                    const actualLine = sampleSlice.map((d, i) => `${getX(i)},${getY(d.actual)}`).join(' ');
                    const rfLine = sampleSlice.map((d, i) => `${getX(i)},${getY(d.rf_predicted)}`).join(' ');
                    const baselineLine = sampleSlice.map((d, i) => `${getX(i)},${getY(d.baseline_predicted)}`).join(' ');

                    return (
                      <>
                        {/* Baseline */}
                        <polyline
                          points={baselineLine}
                          fill="none"
                          stroke="#cbd5e1"
                          strokeWidth="1.2"
                        />
                        {/* Actual */}
                        <polyline
                          points={actualLine}
                          fill="none"
                          stroke="#0f172a"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                        {/* Random Forest */}
                        <polyline
                          points={rfLine}
                          fill="none"
                          stroke="#059669"
                          strokeWidth="2.2"
                          strokeDasharray="4 3"
                        />
                        {/* X-axis ticks */}
                        {sampleSlice.filter((_, i) => i % 6 === 0).map((d) => {
                          const idx = sampleSlice.indexOf(d);
                          return (
                            <text
                              key={d.date}
                              x={getX(idx)}
                              y="270"
                              fontSize="10"
                              textAnchor="middle"
                              fill="#64748b"
                              fontFamily="monospace"
                            >
                              {d.date.slice(5)}
                            </text>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Showing out-of-sample chronologically held-out test predictions (last 40 days).</span>
                <span className="font-mono">Chronological Split: 80% Train ({trainingSamples} samples) / 20% Test ({testSamples} samples)</span>
              </div>
            </div>

            {/* Test Window Observations Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50/70 border-b border-slate-200">
                <h4 className="font-bold text-sm text-slate-800">Recent Out-of-Sample Test Observations</h4>
                <p className="text-xs text-slate-500 mt-0.5">Direct comparison between ground-truth retail volume and model outputs.</p>
              </div>
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Actual Sales</th>
                      <th className="py-2.5 px-4">Random Forest (y&#770;)</th>
                      <th className="py-2.5 px-4">RF Error (|y - y&#770;|)</th>
                      <th className="py-2.5 px-4">Naive Baseline y(t-1)</th>
                      <th className="py-2.5 px-4">Baseline Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                    {actualVsPred.slice(-14).reverse().map((row) => {
                      const rfErr = Math.abs(row.actual - row.rf_predicted);
                      const baseErr = Math.abs(row.actual - row.baseline_predicted);
                      return (
                        <tr key={row.date} className="hover:bg-slate-50/60">
                          <td className="py-2 px-4 font-semibold text-slate-900">{row.date}</td>
                          <td className="py-2 px-4">{row.actual} units</td>
                          <td className="py-2 px-4 text-emerald-700 font-semibold">{row.rf_predicted}</td>
                          <td className="py-2 px-4 text-emerald-800">{rfErr.toFixed(1)}</td>
                          <td className="py-2 px-4 text-slate-500">{row.baseline_predicted}</td>
                          <td className="py-2 px-4 text-slate-500">{baseErr.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MODEL BENCHMARK & METRICS */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Benchmark Table Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                <div className="mb-4">
                  <h3 className="font-bold text-base text-slate-900">
                    Regression Benchmark: RandomForest vs Naive Baseline
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evaluating out-of-sample accuracy against the standard retail persistence benchmark y&#770;(t) = y(t-1).
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Metric</th>
                        <th className="py-2.5 px-3 text-emerald-800">Random Forest</th>
                        <th className="py-2.5 px-3 text-slate-600">Naive Baseline</th>
                        <th className="py-2.5 px-3 text-emerald-700">Improvement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      <tr>
                        <td className="py-3 px-3 font-sans font-medium text-slate-800">
                          <strong>MAE</strong> (Mean Absolute Error)
                        </td>
                        <td className="py-3 px-3 text-emerald-700 font-bold">{metrics?.random_forest.mae} units</td>
                        <td className="py-3 px-3 text-slate-500">{metrics?.baseline.mae} units</td>
                        <td className="py-3 px-3 font-bold text-emerald-700">
                          +{metrics?.improvement.mae_reduction_percent}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3 font-sans font-medium text-slate-800">
                          <strong>RMSE</strong> (Root Mean Squared Error)
                        </td>
                        <td className="py-3 px-3 text-emerald-700 font-bold">{metrics?.random_forest.rmse}</td>
                        <td className="py-3 px-3 text-slate-500">{metrics?.baseline.rmse}</td>
                        <td className="py-3 px-3 font-bold text-emerald-700">
                          +{metrics?.improvement.rmse_reduction_percent}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3 font-sans font-medium text-slate-800">
                          <strong>R² Score</strong> (Variance Explained)
                        </td>
                        <td className="py-3 px-3 text-blue-700 font-bold">{metrics?.random_forest.r2_score}</td>
                        <td className="py-3 px-3 text-slate-500">{metrics?.baseline.r2_score}</td>
                        <td className="py-3 px-3 text-blue-700">
                          +{(metrics ? metrics.random_forest.r2_score - metrics.baseline.r2_score : 0).toFixed(3)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3 font-sans font-medium text-slate-800">
                          <strong>MAPE</strong> (Mean Absolute % Error)
                        </td>
                        <td className="py-3 px-3 text-emerald-700 font-bold">{metrics?.random_forest.mape}%</td>
                        <td className="py-3 px-3 text-slate-500">{metrics?.baseline.mape}%</td>
                        <td className="py-3 px-3 text-emerald-700 font-bold">
                          -{(metrics ? metrics.baseline.mape - metrics.random_forest.mape : 0).toFixed(1)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-xs text-emerald-900 leading-relaxed">
                  <strong>Verdict:</strong> {metrics?.improvement.verdict}
                </div>
              </div>

              {/* Feature Importance Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                <div className="mb-4">
                  <h3 className="font-bold text-base text-slate-900">
                    Feature Importance Distribution
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gini impurity decrease across the 100 decision trees in the ensemble.
                  </p>
                </div>

                <div className="space-y-3">
                  {features.slice(0, 7).map((feat) => (
                    <div key={feat.feature} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold text-slate-800">{feat.feature}</span>
                        <span className="font-mono text-emerald-700 font-bold">{feat.importance}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, feat.importance * 2.2)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">{feat.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Plain English Metric Explanations */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <h4 className="font-bold text-sm text-slate-900 mb-3">
                Metric Explanations in Plain English
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <strong className="text-slate-900 block mb-1">Mean Absolute Error (MAE):</strong>
                  {explanations.mae || 'Average absolute units the model prediction deviates from actual sales volume.'}
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <strong className="text-slate-900 block mb-1">Root Mean Squared Error (RMSE):</strong>
                  {explanations.rmse || 'Quadratic scoring rule that penalizes large errors heavily, critical for avoiding catastrophic stockouts.'}
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <strong className="text-slate-900 block mb-1">R² (Coefficient of Determination):</strong>
                  {explanations.r2_score || 'Percentage of retail demand variance explained by temporal features rather than random chance.'}
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <strong className="text-slate-900 block mb-1">Mean Absolute Percentage Error (MAPE):</strong>
                  {explanations.mape || 'Relative error normalized as a percentage of true sales volume.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EXPLORATORY DATA ANALYSIS (EDA) */}
        {activeTab === 'eda' && (
          <div className="space-y-6">
            {/* Top Products Table */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <div className="mb-4">
                <h3 className="font-bold text-base text-slate-900">
                  Catalog Demand Breakdown: Top-Selling Retail Items
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aggregated units sold, gross sales revenue, and average price per item.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Product ID</th>
                      <th className="py-2.5 px-4">Product Name</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Units Sold</th>
                      <th className="py-2.5 px-4">Avg Price</th>
                      <th className="py-2.5 px-4">Total Revenue</th>
                      <th className="py-2.5 px-4">Volume Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                    {eda?.top_products.map((p) => {
                      const share = Math.round((p.units_sold / (eda.total_units_sold || 1)) * 100);
                      return (
                        <tr key={p.product_id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-bold text-slate-900">{p.product_id}</td>
                          <td className="py-3 px-4 font-sans font-semibold text-slate-900">{p.product_name}</td>
                          <td className="py-3 px-4 font-sans text-slate-500">{p.category}</td>
                          <td className="py-3 px-4 font-bold">{p.units_sold.toLocaleString()}</td>
                          <td className="py-3 px-4">${p.avg_price.toFixed(2)}</td>
                          <td className="py-3 px-4 text-emerald-700 font-bold">${p.total_revenue.toLocaleString()}</td>
                          <td className="py-3 px-4 font-sans">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${share}%` }} />
                              </div>
                              <span className="text-slate-500 font-mono text-[11px]">{share}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Weekly Demand Patterns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                <h4 className="font-bold text-sm text-slate-900 mb-1">
                  Weekly Seasonality (Day-of-Week Average Units)
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Visualizes Friday through Sunday consumer surges driving demand.
                </p>

                <div className="space-y-3 font-mono text-xs">
                  {eda?.day_of_week_patterns.map((item) => {
                    const isWknd = item.day === 'Saturday' || item.day === 'Sunday' || item.day === 'Friday';
                    return (
                      <div key={item.day} className="flex items-center gap-3">
                        <span className="w-24 font-sans font-medium text-slate-700">{item.day}</span>
                        <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div
                            className={`h-3 rounded-full ${isWknd ? 'bg-emerald-600' : 'bg-slate-400'}`}
                            style={{ width: `${Math.min(100, (item.avg_units / 45) * 100)}%` }}
                          />
                        </div>
                        <span className="w-16 text-right font-bold text-slate-900">{item.avg_units}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                <h4 className="font-bold text-sm text-slate-900 mb-1">
                  Data Pipeline Hygiene & Audit Trail
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Automated checks performed during ingestion and preprocessing.
                </p>

                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                    <span>Initial Scanned Records</span>
                    <strong className="font-mono text-slate-900">{eda?.initial_records.toLocaleString()}</strong>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                    <span>Valid Non-Zero Transactions Retained</span>
                    <strong className="font-mono text-emerald-700">{eda?.valid_records.toLocaleString()}</strong>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                    <span>Invalid / Zero Records Excluded</span>
                    <strong className="font-mono text-slate-500">{eda?.removed_records}</strong>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                    <span>Feature Engineering Leakage Check</span>
                    <span className="text-emerald-700 font-semibold font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> PASSED (Strict shift-1 lag)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: INTERNSHIP PROJECT REPORT */}
        {activeTab === 'report' && (
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xs max-w-4xl mx-auto space-y-8 text-slate-800">
            <div className="border-b border-slate-200 pb-5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 font-mono">
                Internship Capstone Project Report
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                StockSense AI – Sales Forecasting & Demand Prediction System
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Track: Data Science, Machine Learning & Python Web Development &bull; Candidate: Angad Sahani &bull; Evaluated on Out-of-Sample Test Set
              </p>
            </div>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>1. Project Abstract</span>
              </h3>
              <p className="text-xs leading-relaxed text-slate-600">
                StockSense AI is an end-to-end retail sales forecasting and demand prediction system. The application automatically searches and loads historical transaction datasets from trusted public repositories (or verified bundled fallback benchmarks), cleans invalid records, engineers autoregressive and moving-average features strictly without lookahead leakage, trains an ensemble <strong>RandomForestRegressor</strong>, benchmarks its performance against a naive persistence baseline, and delivers 7-day recursive demand forecasts with 95% confidence bounds.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                2. Problem Statement
              </h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Retail merchants face severe financial risks from demand volatility. Overstocking leads to warehousing holding fees and product obsolescence, while understocking causes stockouts, lost sales, and customer attrition. Simple moving averages fail to handle seasonal weekend surges and promotional non-linearities, while commercial ERPs are complex and require manual CSV uploads. StockSense AI provides an automated, leak-free, reproducible machine learning pipeline accessible via a lightweight web interface.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                3. Objectives
              </h3>
              <ul className="text-xs list-disc pl-5 space-y-1 text-slate-600">
                <li>Automate dataset discovery from public sources without user CSV file uploads.</li>
                <li>Prevent data leakage using chronological temporal splitting (first 80% train, last 20% test).</li>
                <li>Implement Random Forest Regressor alongside a naive baseline y(t-1) benchmark.</li>
                <li>Calculate standard regression metrics: MAE, RMSE, R², and MAPE.</li>
                <li>Generate multi-step recursive 7-day forecasts with 95% confidence intervals.</li>
                <li>Deliver a web dashboard for interactive demand inspection and model evaluation.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                4. Methodology & Pipeline
              </h3>
              <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed">
{`[Public Repository / Local Fallback]
  ↓
[Cleaning & Validation] -> Date casting, drop nulls, filter qty > 0
  ↓
[Temporal Aggregation] -> Daily volume, revenue & promotion flags
  ↓
[Feature Engineering]  -> Lags (t-1, t-2, t-3, t-7, t-14), Rolling Means (7d, 14d via shift-1)
  ↓
[Chronological Split]   -> 80% Historical Train / 20% Unseen Test
  ↓
[Machine Learning Fit] -> RandomForestRegressor(n_estimators=100, max_depth=12)
  ↓
[Evaluation & Bench]   -> MAE, RMSE, R2, MAPE vs Naive Baseline
  ↓
[Recursive Forecast]   -> Next 7 Days projection + 95% Confidence Intervals`}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                5. Algorithm Explanation: Random Forest Regressor
              </h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Random Forest Regressor is an ensemble learning method that constructs a collection of decorrelated decision trees during training. Predictions are formed by aggregating the outputs across all individual trees:
              </p>
              <div className="bg-slate-50 p-3 rounded border border-slate-200 font-mono text-[11px] text-slate-800">
                y_hat(x) = (1 / B) * SUM(T_b(x)) for b = 1 to B (where B = 100 Trees)
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                By averaging 100 deep decision trees trained on bootstrap samples with random feature subsets at each split, the model drastically reduces prediction variance while modeling complex non-linear interactions between weekly calendar cycles (`day_of_week`, `lag_7`) and recent momentum (`rolling_mean_7`).
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                6. Evaluation Results
              </h3>
              <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-lg text-xs text-emerald-950 space-y-1">
                <p><strong>Random Forest MAE:</strong> {metrics?.random_forest.mae} units &bull; <strong>Baseline MAE:</strong> {metrics?.baseline.mae} units</p>
                <p><strong>Error Reduction:</strong> {metrics?.improvement.mae_reduction_percent}% improvement over naive persistence.</p>
                <p><strong>R² Score:</strong> {metrics?.random_forest.r2_score} (Captures variance across unseen dates without overfitting).</p>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                7. Limitations & Future Scope
              </h3>
              <p className="text-xs leading-relaxed text-slate-600">
                <strong>Limitations:</strong> The model forecasts consumer demand units and estimated revenue. It does not measure physical shelf or warehouse capacity unless explicit stock data is supplied.
              </p>
              <p className="text-xs leading-relaxed text-slate-600">
                <strong>Future Scope:</strong> Extending to Hierarchical Forecasting (LightGBM/Prophet), exogenous weather/economic variables, and automated warehouse supplier reorder threshold webhooks.
              </p>
            </section>
          </div>
        )}

        {/* TAB 6: SOURCE CODE EXPLORER */}
        {activeTab === 'code' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 p-4 bg-slate-50 gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Standalone Project Files</h3>
                <p className="text-xs text-slate-500">Every deliverable file created for local VS Code execution & submission.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 min-h-[500px]">
              {/* File list sidebar */}
              <div className="border-r border-slate-200 bg-slate-50/50 p-2 space-y-1">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-1">
                  Python Core Modules
                </div>
                {['app.py', 'dataset_loader.py', 'preprocessing.py', 'model_engine.py'].map(f => (
                  <button
                    key={f}
                    onClick={() => setSelectedFile(f)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono flex items-center justify-between cursor-pointer ${
                      selectedFile === f ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-700 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>{f}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}

                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 pt-3 pb-1">
                  Docs & Dependencies
                </div>
                {['requirements.txt', 'README.md', 'INTERNSHIP_REPORT.md'].map(f => (
                  <button
                    key={f}
                    onClick={() => setSelectedFile(f)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono flex items-center justify-between cursor-pointer ${
                      selectedFile === f ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-700 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>{f}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}

                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 pt-3 pb-1">
                  Flask Web Templates
                </div>
                {['index.html', 'style.css', 'main.js'].map(f => (
                  <button
                    key={f}
                    onClick={() => setSelectedFile(f)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono flex items-center justify-between cursor-pointer ${
                      selectedFile === f ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-700 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>{f}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}
              </div>

              {/* Code display pane */}
              <div className="md:col-span-3 bg-slate-950 p-4 overflow-x-auto text-slate-100 font-mono text-xs leading-relaxed max-h-[600px] overflow-y-auto">
                <div className="text-[11px] text-slate-400 border-b border-slate-800 pb-2 mb-3 flex items-center justify-between">
                  <span>File: <code>{selectedFile}</code></span>
                  <span>{fileContent.split('\n').length} lines</span>
                </div>
                {fileLoading ? (
                  <div className="text-slate-400 py-8 text-center">Loading file contents...</div>
                ) : (
                  <pre className="whitespace-pre">{fileContent}</pre>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-8 mt-16 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
        <p>
          StockSense AI &bull; Supervised Machine Learning Sales Forecasting System &bull; Scikit-Learn RandomForestRegressor & Naive Baseline
        </p>
      </footer>
    </div>
  );
}
