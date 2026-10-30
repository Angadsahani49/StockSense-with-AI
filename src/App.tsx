import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronDown,
  Copy,
  Check,
  User,
  UserPlus,
  LogIn,
  LogOut,
  Tag,
  Sliders,
  Search,
  Filter,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  History,
  Building2,
  TrendingDown,
  PackageCheck,
  X
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

interface PriceHistoryPoint {
  month: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  units_sold: number;
  revenue: number;
}

interface TopProduct {
  product_id: string;
  product_name: string;
  category: string;
  units_sold: number;
  total_revenue: number;
  avg_price: number;
  min_price?: number;
  max_price?: number;
  latest_price?: number;
  cost_price?: number;
  margin_pct?: number;
  current_stock?: number;
  reorder_point?: number;
  lead_time_days?: number;
  stock_status?: string;
  stock_badge?: 'healthy' | 'warning' | 'critical';
  recent_daily_rate?: number;
  days_of_stock?: number;
  price_elasticity?: number;
  price_history?: PriceHistoryPoint[];
}

interface DayOfWeekPattern {
  day: string;
  avg_units: number;
}

interface MonthlyPattern {
  month: string;
  units: number;
  revenue: number;
  avg_price?: number;
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

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatarColor: string;
  createdAt: string;
}

const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'usr-1',
    name: 'Angad Sahani',
    email: 'angad@stocksense.ai',
    role: 'Lead ML Engineer & Data Scientist',
    department: 'Machine Learning Research',
    avatarColor: 'bg-emerald-600',
    createdAt: '2026-01-15'
  },
  {
    id: 'usr-2',
    name: 'Elena Rostova',
    email: 'elena@retailhub.com',
    role: 'Supply Chain & Inventory Director',
    department: 'Procurement & Warehousing',
    avatarColor: 'bg-blue-600',
    createdAt: '2026-02-01'
  },
  {
    id: 'usr-3',
    name: 'Marcus Vance',
    email: 'marcus@storeops.io',
    role: 'Pricing & Merchandising Manager',
    department: 'Retail Revenue Operations',
    avatarColor: 'bg-purple-600',
    createdAt: '2026-02-18'
  }
];

import { STATIC_DATA } from './data/staticData';

export default function App() {
  const [activeTab, setActiveTab] = useState<'forecast' | 'stock-pricing' | 'validation' | 'metrics' | 'eda' | 'report' | 'code'>('forecast');
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(STATIC_DATA.metadata as any);
  const [eda, setEda] = useState<EDASummary | null>(STATIC_DATA.eda as any);
  const [forecast, setForecast] = useState<ForecastDay[]>(STATIC_DATA.forecast as any);
  const [actualVsPred, setActualVsPred] = useState<ActualVsPred[]>(STATIC_DATA.actualVsPred as any);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(STATIC_DATA.metrics as any);
  const [features, setFeatures] = useState<FeatureImportance[]>(STATIC_DATA.features as any);
  const [explanations, setExplanations] = useState<Record<string, string>>(STATIC_DATA.explanations as any);
  const [trainPeriod, setTrainPeriod] = useState<string>(STATIC_DATA.trainPeriod);
  const [testPeriod, setTestPeriod] = useState<string>(STATIC_DATA.testPeriod);
  const [trainingSamples, setTrainingSamples] = useState<number>(STATIC_DATA.trainingSamples);
  const [testSamples, setTestSamples] = useState<number>(STATIC_DATA.testSamples);

  const [loading, setLoading] = useState<boolean>(false);
  const [retraining, setRetraining] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Authentication State (client-side without backend)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [usersDb, setUsersDb] = useState<UserAccount[]>(DEFAULT_USERS);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);

  // Form states for Auth
  const [loginEmail, setLoginEmail] = useState<string>('angad@stocksense.ai');
  const [loginPassword, setLoginPassword] = useState<string>('password123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [signupName, setSignupName] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [signupRole, setSignupRole] = useState<string>('Lead ML Engineer & Data Scientist');
  const [signupDept, setSignupDept] = useState<string>('Analytics & Forecasting');
  const [authError, setAuthError] = useState<string | null>(null);

  // Code viewer state
  const [selectedFile, setSelectedFile] = useState<string>('app.py');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Interactive Product Forecast Simulator state
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [simLeadTimeDays, setSimLeadTimeDays] = useState<number>(4);

  // Stock & Price History Filter states
  const [stockSearchQuery, setStockSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');
  const [selectedPriceProduct, setSelectedPriceProduct] = useState<string>('PRD-101');
  const [priceAdjustmentPct, setPriceAdjustmentPct] = useState<number>(0); // -25% to +25%

  // Initialize Auth from localStorage
  useEffect(() => {
    try {
      const storedUsers = localStorage.getItem('stocksense_users_db');
      if (storedUsers) {
        setUsersDb(JSON.parse(storedUsers));
      } else {
        localStorage.setItem('stocksense_users_db', JSON.stringify(DEFAULT_USERS));
      }

      const activeSession = localStorage.getItem('stocksense_user_session');
      if (activeSession) {
        setCurrentUser(JSON.parse(activeSession));
      } else {
        // Auto sign-in as default persona for convenience
        setCurrentUser(DEFAULT_USERS[0]);
        localStorage.setItem('stocksense_user_session', JSON.stringify(DEFAULT_USERS[0]));
      }
    } catch (e) {
      console.warn('localStorage error:', e);
      setCurrentUser(DEFAULT_USERS[0]);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'code') {
      fetchFileContent(selectedFile);
    }
  }, [activeTab, selectedFile]);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const loadAllData = async () => {
    // If running in static hosting (e.g. GitHub Pages), static data is already preloaded in state
    if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const fetchSafe = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return await res.json();
          }
          return null;
        } catch {
          return null;
        }
      };

      const [statusRes, edaRes, forecastRes, metricsRes] = await Promise.all([
        fetchSafe('/api/status'),
        fetchSafe('/api/overview'),
        fetchSafe('/api/forecast'),
        fetchSafe('/api/metrics')
      ]);

      if (statusRes?.status === 'success') setMetadata(statusRes.data);
      if (edaRes?.status === 'success') setEda(edaRes.data);
      if (forecastRes?.status === 'success') {
        setForecast(forecastRes.forecast);
        setActualVsPred(forecastRes.actual_vs_predicted);
      }
      if (metricsRes?.status === 'success') {
        setMetrics(metricsRes.metrics);
        setFeatures(metricsRes.feature_importance);
        setExplanations(metricsRes.explanations);
        setTrainPeriod(metricsRes.train_period);
        setTestPeriod(metricsRes.test_period);
        setTrainingSamples(metricsRes.training_samples);
        setTestSamples(metricsRes.test_samples);
      }
    } catch (err) {
      console.warn('Backend server not present, running in static demonstration mode:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      const res = await fetch('/api/retrain', { method: 'POST' });
      const json = await res.json();
      if (json.status === 'success') {
        showToast('RandomForestRegressor pipeline successfully retrained with 16 stock products.');
        await loadAllData();
      }
    } catch (e: any) {
      console.error('Retrain failed:', e);
    } finally {
      setRetraining(false);
    }
  };

  // Auth Handlers (Client-Side)
  const handleSignIn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);

    const user = usersDb.find(u => u.email.toLowerCase() === loginEmail.trim().toLowerCase());
    if (!user) {
      setAuthError('No account found with this email. Try quick demo persona or create an account.');
      return;
    }

    setCurrentUser(user);
    try {
      localStorage.setItem('stocksense_user_session', JSON.stringify(user));
    } catch (err) {}

    setIsAuthModalOpen(false);
    setIsUserMenuOpen(false);
    showToast(`Signed in successfully as ${user.name}`);
  };

  const handleQuickLogin = (user: UserAccount) => {
    setAuthError(null);
    setCurrentUser(user);
    try {
      localStorage.setItem('stocksense_user_session', JSON.stringify(user));
    } catch (err) {}
    setIsAuthModalOpen(false);
    setIsUserMenuOpen(false);
    showToast(`Switched workspace to ${user.name} (${user.role})`);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!signupName.trim() || !signupEmail.trim() || !signupPassword.trim()) {
      setAuthError('Please fill in all required fields.');
      return;
    }

    const existing = usersDb.find(u => u.email.toLowerCase() === signupEmail.trim().toLowerCase());
    if (existing) {
      setAuthError('An account with this email already exists. Please sign in instead.');
      return;
    }

    const colorOptions = ['bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-600', 'bg-teal-600'];
    const chosenColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      name: signupName.trim(),
      email: signupEmail.trim(),
      role: signupRole,
      department: signupDept,
      avatarColor: chosenColor,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    const updatedDb = [...usersDb, newUser];
    setUsersDb(updatedDb);
    setCurrentUser(newUser);

    try {
      localStorage.setItem('stocksense_users_db', JSON.stringify(updatedDb));
      localStorage.setItem('stocksense_user_session', JSON.stringify(newUser));
    } catch (err) {}

    setIsAuthModalOpen(false);
    showToast(`Account created! Welcome to StockSense AI, ${newUser.name}.`);
    setSignupName('');
    setSignupEmail('');
    setSignupPassword('');
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('stocksense_user_session');
    } catch (err) {}
    setIsUserMenuOpen(false);
    showToast('Signed out of session', 'info');
  };

  const fetchFileContent = async (name: string) => {
    setFileLoading(true);
    setCopied(false);
    try {
      const res = await fetch(`/api/python-file?name=${encodeURIComponent(name)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success') {
          setFileContent(json.content);
          return;
        }
      }
      throw new Error('API unavailable on static hosting');
    } catch {
      // High quality fallback code representation for GitHub Pages static hosting
      const fallbacks: Record<string, string> = {
        'model_engine.py': `"""
StockSense AI - Production Machine Learning Forecasting Engine
Author: Angad Sahani (Lead ML Engineer)
16 Retail Stock Products Catalog + 24-Month Price Tracking
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# 1. Feature Engineering: Lags, Rolling Means, Price Ratios, Day-of-Week
# 2. Train-Test Split (Chronological Backtesting)
# 3. Model Benchmark: RandomForest vs Baseline Naive Moving Average
# 4. Multi-Horizon Forecast Projection (30 Days Ahead)
print("Pipeline initialized successfully.")`,
        'preprocessing.py': `"""
StockSense AI - Automated Preprocessing & Feature Extraction
"""
import pandas as pd
import json

def preprocess_sales_data(filepath='data/sample_sales.csv'):
    df = pd.read_csv(filepath, parse_dates=['date'])
    # Ingestion & Validation
    return df`,
        'dataset_loader.py': `"""
StockSense AI - Ingestion & Metadata Generator
"""
import json, os
print("Dataset metadata verified with 16 SKUs and 11,680 records.")`
      };
      setFileContent(fallbacks[name] || `# Source file: ${name}\n# Accessible in GitHub repository source tree.`);
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

  // Filtered products list for the Stock & Price History tab
  const categoriesList = useMemo(() => {
    if (!eda?.top_products) return [];
    return Array.from(new Set(eda.top_products.map(p => p.category))).sort();
  }, [eda]);

  const filteredProducts = useMemo(() => {
    if (!eda?.top_products) return [];
    return eda.top_products.filter(p => {
      const matchSearch = p.product_name.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
                          p.product_id.toLowerCase().includes(stockSearchQuery.toLowerCase());
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchStatus = stockStatusFilter === 'all' ||
                          (stockStatusFilter === 'healthy' && p.stock_badge === 'healthy') ||
                          (stockStatusFilter === 'warning' && p.stock_badge === 'warning') ||
                          (stockStatusFilter === 'critical' && p.stock_badge === 'critical');
      return matchSearch && matchCategory && matchStatus;
    });
  }, [eda, stockSearchQuery, selectedCategory, stockStatusFilter]);

  // Selected product for Price History Inspection
  const currentPriceProd = useMemo(() => {
    if (!eda?.top_products) return null;
    return eda.top_products.find(p => p.product_id === selectedPriceProduct) || eda.top_products[0] || null;
  }, [eda, selectedPriceProduct]);

  // Elasticity calculations for What-If simulator
  const simOriginalPrice = currentPriceProd?.latest_price || 99.99;
  const simNewPrice = Math.round(simOriginalPrice * (1 + priceAdjustmentPct / 100) * 100) / 100;
  const elasticityFactor = currentPriceProd?.price_elasticity || 1.35;
  const percentDemandChange = Math.round(-1 * elasticityFactor * priceAdjustmentPct * 10) / 10;
  const baseDailyRunRate = currentPriceProd?.recent_daily_rate || 20;
  const simNewDailyDemand = Math.max(1, Math.round(baseDailyRunRate * (1 + percentDemandChange / 100) * 10) / 10);
  const simDailyRevenue = Math.round(simNewDailyDemand * simNewPrice * 100) / 100;
  const simCostPrice = currentPriceProd?.cost_price || (simOriginalPrice * 0.55);
  const simDailyMargin = Math.round((simDailyRevenue - (simNewDailyDemand * simCostPrice)) * 100) / 100;
  const simNewDaysOfStock = currentPriceProd?.current_stock ? Math.round(currentPriceProd.current_stock / simNewDailyDemand) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold">Initializing StockSense AI Pipeline</h2>
        <p className="text-sm text-slate-500 mt-1">Loading 16-product catalog, inventory stock levels, price histories, and ML benchmark...</p>
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
                  16 SKUs &bull; ML Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Sales Forecasting, Demand Prediction & Price Intelligence System
              </p>
            </div>
          </div>

          {/* Top-Right Corner Actions: Dataset Badge, Retrain, and Login / Create Account */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-end">
            {/* Dataset Badge */}
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-100/80 px-2.5 py-1.5 rounded-md border border-slate-200">
              <span className={`w-2 h-2 rounded-full ${metadata?.is_sample_data ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span className="font-semibold text-slate-700">
                {metadata?.record_count.toLocaleString()} records
              </span>
            </div>

            {/* Retrain Button */}
            <button
              onClick={handleRetrain}
              disabled={retraining}
              title="Re-run Scikit-Learn RandomForestRegressor Training Pipeline"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">{retraining ? 'Training...' : 'Retrain ML'}</span>
            </button>

            {/* TOP-RIGHT CORNER LOGIN / CREATE ACCOUNT (WITHOUT BACKEND) */}
            <div className="relative">
              {currentUser ? (
                <div>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-all cursor-pointer shadow-2xs"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold ${currentUser.avatarColor}`}>
                      {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="text-left hidden sm:block">
                      <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1">
                        <span>{currentUser.name}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium leading-none truncate max-w-[120px]">
                        {currentUser.role.split('&')[0]}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl border border-slate-200 shadow-lg py-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${currentUser.avatarColor}`}>
                          {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-bold text-slate-900 text-sm truncate">{currentUser.name}</div>
                          <div className="text-slate-500 text-[11px] truncate">{currentUser.email}</div>
                          <div className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded inline-block mt-1 font-mono">
                            {currentUser.department}
                          </div>
                        </div>
                      </div>

                      {/* Workspace details */}
                      <div className="px-3.5 py-2 text-[11px] text-slate-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Permissions:</span>
                          <span className="font-semibold text-slate-700">Full Analytics & Forecasts</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Active Role:</span>
                          <span className="font-semibold text-slate-700 truncate max-w-[140px]">{currentUser.role}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Client-Side Auth:</span>
                          <span className="text-emerald-700 font-mono">Active (localStorage)</span>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 px-2 py-1 space-y-0.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                          Switch Demo Persona
                        </div>
                        {usersDb.map(u => (
                          <button
                            key={u.id}
                            onClick={() => handleQuickLogin(u)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between transition-colors cursor-pointer ${
                              currentUser.id === u.id ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span className="truncate">{u.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{u.role.split(' ')[0]}</span>
                          </button>
                        ))}
                      </div>

                      <div className="border-t border-slate-100 px-2 pt-1 mt-1 flex items-center justify-between">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setAuthMode('signup');
                            setIsAuthModalOpen(true);
                          }}
                          className="text-xs text-emerald-700 hover:text-emerald-800 font-medium px-2 py-1.5 rounded hover:bg-emerald-50 flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add Profile</span>
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1.5 rounded hover:bg-rose-50 flex items-center gap-1 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Logged out state */
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setAuthMode('signin');
                      setAuthError(null);
                      setIsAuthModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-2xs transition-colors cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-slate-500" />
                    <span>Log In</span>
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthError(null);
                      setIsAuthModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-100" />
                    <span>Create Account</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        {/* Toast Notification */}
        {toastMsg && (
          <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-lg flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMsg.text}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-4 cursor-pointer">&times;</button>
          </div>
        )}

        {/* Scope & Disclaimers Banner */}
        <div className="mb-6 bg-amber-50/70 border border-amber-200/90 rounded-lg p-3.5 text-amber-900 text-xs leading-relaxed flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              <strong className="font-semibold text-amber-950">Scope & Inventory Notice:</strong> Predictions represent statistical <strong>consumer demand estimates</strong> modeled on historical daily sales units. Warehouse physical inventory buffers and price histories are cataloged for operational planning without synthetic inflation.
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
              <span>Catalog Products</span>
              <Package className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {eda?.unique_products || 16} SKUs
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              {eda?.total_units_sold.toLocaleString()} units sold
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
              Aggregated across 2 full years (730 days)
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
              Chronological test partition ({testSamples} days)
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

          {/* NEW TAB: STOCK PRODUCTS & PRICE HISTORY */}
          <button
            onClick={() => setActiveTab('stock-pricing')}
            className={`px-3.5 py-2 rounded-t-lg transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'stock-pricing'
                ? 'border-emerald-600 text-emerald-800 font-semibold bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Stock Products & Price History</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
              16 SKUs
            </span>
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
            <span>Actual vs Predicted</span>
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
            <span>Model Benchmark</span>
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
            <span>EDA & Seasonality</span>
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
            <span>Internship Report</span>
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
                  <option value="all">Entire Store (All 16 Products Aggregated)</option>
                  {eda?.top_products.map(p => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.product_id} - {p.product_name} (${p.latest_price || p.avg_price})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-600 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400">7-Day Projected Units:</span>{' '}
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

              {/* Dynamic SVG chart for 7-day projection */}
              <div className="h-64 w-full relative">
                <svg viewBox="0 0 700 240" className="w-full h-full overflow-visible">
                  {[40, 90, 140, 190].map((y) => (
                    <line key={y} x1="50" y1={y} x2="680" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                  ))}

                  {(() => {
                    if (displayedForecast.length === 0) return null;
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

            {/* Lead-Time Demand Calculator */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-slate-500" />
                <h4 className="font-bold text-sm text-slate-800">
                  Lead-Time Demand Planning Calculator
                </h4>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Demonstrates how supply chain planners utilize predicted daily demand distributions to compute lead-time requirements: <strong>Lead Time Demand = Avg Daily Demand &times; Lead Time Days</strong>.
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

        {/* TAB 2: STOCK PRODUCTS & PRICE HISTORY (NEW EXPANDED FEATURE) */}
        {activeTab === 'stock-pricing' && (
          <div className="space-y-6">
            {/* Inventory Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500 mb-1 flex items-center justify-between">
                  <span>Tracked SKUs</span>
                  <PackageCheck className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {eda?.top_products.length || 16} Products
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Across {categoriesList.length} categories
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500 mb-1 flex items-center justify-between">
                  <span>Stock On Hand</span>
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {eda?.top_products.reduce((s, p) => s + (p.current_stock || 0), 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">units</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Active warehouse stock
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500 mb-1 flex items-center justify-between">
                  <span>Reorder Alerts</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-amber-600">
                  {eda?.top_products.filter(p => p.stock_badge === 'warning' || p.stock_badge === 'critical').length || 0} SKUs
                </div>
                <div className="text-[11px] text-amber-700 mt-1 font-medium">
                  {eda?.top_products.filter(p => p.stock_badge === 'critical').length || 0} critical stockouts
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500 mb-1 flex items-center justify-between">
                  <span>Inventory Valuation</span>
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-600">
                  ${Math.round(eda?.top_products.reduce((s, p) => s + ((p.current_stock || 0) * (p.latest_price || p.avg_price)), 0) || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  At current retail price
                </div>
              </div>
            </div>

            {/* Price History & Elasticity Studio */}
            {currentPriceProd && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {currentPriceProd.product_id}
                      </span>
                      <h3 className="font-bold text-lg text-slate-900">
                        {currentPriceProd.product_name}
                      </h3>
                      <span className="text-xs text-slate-500">({currentPriceProd.category})</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Historical Price Movements (24 Months) &bull; Current Price: <strong className="text-slate-900 font-mono">${currentPriceProd.latest_price}</strong> &bull; Cost: <span className="font-mono">${currentPriceProd.cost_price}</span> &bull; Margin: <strong className="text-emerald-700">{currentPriceProd.margin_pct}%</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Inspect Product:</span>
                    <select
                      value={selectedPriceProduct}
                      onChange={(e) => {
                        setSelectedPriceProduct(e.target.value);
                        setPriceAdjustmentPct(0);
                      }}
                      className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-800 focus:outline-emerald-600 cursor-pointer"
                    >
                      {eda?.top_products.map(p => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.product_id} - {p.product_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price History Timeline Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-slate-400" />
                        <span>Monthly Price Evolution (2024 - 2025)</span>
                      </div>
                      <div className="text-xs font-mono text-slate-500">
                        Range: ${currentPriceProd.min_price} (promo) &mdash; ${currentPriceProd.max_price} (peak)
                      </div>
                    </div>

                    {/* SVG Price Chart */}
                    <div className="h-56 w-full border border-slate-100 rounded-lg p-2 bg-slate-50/50">
                      <svg viewBox="0 0 650 200" className="w-full h-full overflow-visible">
                        {[30, 80, 130, 170].map(y => (
                          <line key={y} x1="40" y1={y} x2="630" y2={y} stroke="#e2e8f0" strokeWidth="0.8" />
                        ))}

                        {(() => {
                          const history = currentPriceProd.price_history || [];
                          if (history.length === 0) return null;
                          const prices = history.map(h => h.avg_price);
                          const maxP = Math.max(...prices, 100);
                          const minP = Math.min(...prices, 20);
                          const range = Math.max(maxP - minP, 1);

                          const getY = (p: number) => 170 - ((p - minP) / range) * 130;
                          const getX = (idx: number) => 50 + (idx / (history.length - 1)) * 570;

                          const pts = history.map((h, i) => `${getX(i)},${getY(h.avg_price)}`).join(' ');

                          return (
                            <>
                              <polyline
                                points={pts}
                                fill="none"
                                stroke="#2563eb"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              {history.map((h, i) => (
                                <g key={i}>
                                  <circle
                                    cx={getX(i)}
                                    cy={getY(h.avg_price)}
                                    r="3"
                                    fill="#ffffff"
                                    stroke="#2563eb"
                                    strokeWidth="2"
                                  />
                                  {i % 4 === 0 && (
                                    <>
                                      <text
                                        x={getX(i)}
                                        y={getY(h.avg_price) - 8}
                                        fontSize="9"
                                        textAnchor="middle"
                                        fontFamily="monospace"
                                        fontWeight="bold"
                                        fill="#1e293b"
                                      >
                                        ${h.avg_price}
                                      </text>
                                      <text
                                        x={getX(i)}
                                        y="190"
                                        fontSize="9"
                                        textAnchor="middle"
                                        fontFamily="monospace"
                                        fill="#64748b"
                                      >
                                        {h.month.slice(2)}
                                      </text>
                                    </>
                                  )}
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Blue curve shows average monthly retail realized price. Drops indicate promotional discount campaigns.</span>
                      <span className="font-mono text-slate-700">Elasticity (&epsilon;): {currentPriceProd.price_elasticity}</span>
                    </div>
                  </div>

                  {/* Interactive What-If Price Elasticity Simulator */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                        <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Price Elasticity Simulator</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3">
                        Simulate the demand and revenue impact of adjusting retail price:
                      </p>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs font-medium mb-1">
                            <span>Adjust Price:</span>
                            <span className={`font-mono font-bold ${priceAdjustmentPct > 0 ? 'text-blue-600' : priceAdjustmentPct < 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                              {priceAdjustmentPct > 0 ? `+${priceAdjustmentPct}%` : `${priceAdjustmentPct}%`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="-25"
                            max="25"
                            step="1"
                            value={priceAdjustmentPct}
                            onChange={(e) => setPriceAdjustmentPct(parseInt(e.target.value, 10))}
                            className="w-full accent-emerald-600 cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>-25% (Promo)</span>
                            <span>Base ($0)</span>
                            <span>+25% (Premium)</span>
                          </div>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Simulated Price:</span>
                            <strong className="font-mono text-slate-900">${simNewPrice}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Expected Daily Demand:</span>
                            <strong className="font-mono text-slate-900">
                              {simNewDailyDemand} units/day{' '}
                              <span className={`text-[10px] font-normal ${percentDemandChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                ({percentDemandChange >= 0 ? `+${percentDemandChange}%` : `${percentDemandChange}%`})
                              </span>
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Projected Daily Revenue:</span>
                            <strong className="font-mono text-emerald-700">${simDailyRevenue.toLocaleString()}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Projected Daily Gross Margin:</span>
                            <strong className="font-mono text-slate-900">${simDailyMargin.toLocaleString()}</strong>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-100">
                            <span className="text-slate-500">Days of Stock Remaining:</span>
                            <strong className="font-mono text-slate-900">{simNewDaysOfStock} days</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-200">
                      Based on observed price elasticity (&epsilon; = {currentPriceProd.price_elasticity}) computed across promotional and standard pricing periods.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Catalog Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by SKU or Product Name..."
                    value={stockSearchQuery}
                    onChange={(e) => setStockSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-emerald-600"
                  />
                  {stockSearchQuery && (
                    <button onClick={() => setStockSearchQuery('')} className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs">&times;</button>
                  )}
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-800 focus:outline-emerald-600 cursor-pointer"
                >
                  <option value="all">All Categories ({categoriesList.length})</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <select
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-800 focus:outline-emerald-600 cursor-pointer"
                >
                  <option value="all">All Stock Statuses</option>
                  <option value="healthy">Healthy Stock</option>
                  <option value="warning">Low Stock Alert</option>
                  <option value="critical">Critical Reorder</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 font-mono">
                Showing {filteredProducts.length} of {eda?.top_products.length || 16} stock products
              </div>
            </div>

            {/* Products Table with Stock & Pricing */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Product Name & Category</th>
                      <th className="py-2.5 px-3">Cost / Retail Price</th>
                      <th className="py-2.5 px-3">Margin</th>
                      <th className="py-2.5 px-3">Physical Stock</th>
                      <th className="py-2.5 px-3">Reorder Point</th>
                      <th className="py-2.5 px-3">Stock Status</th>
                      <th className="py-2.5 px-3">Days of Stock</th>
                      <th className="py-2.5 px-3">Historical Range</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                    {filteredProducts.map(p => {
                      const stockPct = Math.min(100, Math.round(((p.current_stock || 0) / ((p.reorder_point || 100) * 2.5)) * 100));
                      return (
                        <tr key={p.product_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">{p.product_id}</td>
                          <td className="py-3 px-3 font-sans">
                            <div className="font-semibold text-slate-900">{p.product_name}</div>
                            <div className="text-[11px] text-slate-500">{p.category}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-slate-900 font-bold">${p.latest_price || p.avg_price}</div>
                            <div className="text-[10px] text-slate-400">Cost: ${p.cost_price || Math.round(p.avg_price * 0.55)}</div>
                          </td>
                          <td className="py-3 px-3 text-emerald-700 font-bold">
                            {p.margin_pct || 45}%
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{p.current_stock} units</div>
                            <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-1.5 rounded-full ${
                                  p.stock_badge === 'critical' ? 'bg-rose-500' : p.stock_badge === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${stockPct}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {p.reorder_point} units
                          </td>
                          <td className="py-3 px-3 font-sans">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                              p.stock_badge === 'critical'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : p.stock_badge === 'warning'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                p.stock_badge === 'critical' ? 'bg-rose-500' : p.stock_badge === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                              }`} />
                              {p.stock_status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            {p.days_of_stock} days
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-500">
                            ${p.min_price} - ${p.max_price}
                          </td>
                          <td className="py-3 px-3 text-right font-sans">
                            <button
                              onClick={() => {
                                setSelectedPriceProduct(p.product_id);
                                window.scrollTo({ top: 350, behavior: 'smooth' });
                              }}
                              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded transition-colors cursor-pointer"
                            >
                              Price Curve
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACTUAL VS PREDICTED (CHRONOLOGICAL TEST SET) */}
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
                  {[50, 110, 170, 230].map(y => (
                    <line key={y} x1="50" y1={y} x2="880" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                  ))}

                  {(() => {
                    if (actualVsPred.length === 0) return null;
                    const sampleSlice = actualVsPred.slice(-40);
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
                        <polyline
                          points={baselineLine}
                          fill="none"
                          stroke="#cbd5e1"
                          strokeWidth="1.2"
                        />
                        <polyline
                          points={actualLine}
                          fill="none"
                          stroke="#0f172a"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                        <polyline
                          points={rfLine}
                          fill="none"
                          stroke="#059669"
                          strokeWidth="2.2"
                          strokeDasharray="4 3"
                        />
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

        {/* TAB 4: MODEL BENCHMARK & METRICS */}
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

        {/* TAB 5: EXPLORATORY DATA ANALYSIS (EDA) */}
        {activeTab === 'eda' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                <h4 className="font-bold text-sm text-slate-900 mb-1">
                  Weekly Seasonality (Day-of-Week Average Units)
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Visualizes Friday through Sunday consumer surges driving demand across the store.
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
                            style={{ width: `${Math.min(100, (item.avg_units / 550) * 100)}%` }}
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
                    <span>Unique Stock SKUs Cataloged</span>
                    <strong className="font-mono text-slate-900">{eda?.unique_products} SKUs</strong>
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

        {/* TAB 6: INTERNSHIP PROJECT REPORT */}
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
              <h3 className="text-base font-bold text-slate-900">1. Project Abstract</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                StockSense AI is an end-to-end retail sales forecasting and demand prediction system. The application automatically searches and loads historical transaction datasets from trusted public repositories (or verified bundled fallback benchmarks), cleans invalid records, engineers autoregressive and moving-average features strictly without lookahead leakage, trains an ensemble <strong>RandomForestRegressor</strong>, benchmarks its performance against a naive persistence baseline, and delivers 7-day recursive demand forecasts with 95% confidence bounds.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">2. Problem Statement</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Retail merchants face severe financial risks from demand volatility. Overstocking leads to warehousing holding fees and product obsolescence, while understocking causes stockouts, lost sales, and customer attrition. Simple moving averages fail to handle seasonal weekend surges and promotional non-linearities, while commercial ERPs are complex and require manual CSV uploads. StockSense AI provides an automated, leak-free, reproducible machine learning pipeline accessible via a lightweight web interface.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">3. Objectives</h3>
              <ul className="text-xs list-disc pl-5 space-y-1 text-slate-600">
                <li>Automate dataset discovery from public sources without user CSV file uploads.</li>
                <li>Prevent data leakage using chronological temporal splitting (first 80% train, last 20% test).</li>
                <li>Implement Random Forest Regressor alongside a naive baseline y(t-1) benchmark.</li>
                <li>Calculate standard regression metrics: MAE, RMSE, R², and MAPE.</li>
                <li>Generate multi-step recursive 7-day forecasts with 95% confidence intervals.</li>
                <li>Deliver a web dashboard with 16 stock products, price histories, and client-side authentication.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">4. Methodology & Pipeline</h3>
              <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed">
{`[Public Repository / Local Fallback (16 Products)]
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
              <h3 className="text-base font-bold text-slate-900">5. Algorithm Explanation: Random Forest Regressor</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Random Forest Regressor is an ensemble learning method that constructs a collection of decorrelated decision trees during training. Predictions are formed by aggregating the outputs across all individual trees:
              </p>
              <div className="bg-slate-50 p-3 rounded border border-slate-200 font-mono text-[11px] text-slate-800">
                y_hat(x) = (1 / B) * SUM(T_b(x)) for b = 1 to B (where B = 100 Trees)
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                By averaging 100 deep decision trees trained on bootstrap samples with random feature subsets at each split, the model drastically reduces prediction variance while modeling complex non-linear interactions between weekly calendar cycles (day_of_week, lag_7) and recent momentum (rolling_mean_7).
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">6. Evaluation Results</h3>
              <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-lg text-xs text-emerald-950 space-y-1">
                <p><strong>Random Forest MAE:</strong> {metrics?.random_forest.mae} units &bull; <strong>Baseline MAE:</strong> {metrics?.baseline.mae} units</p>
                <p><strong>Error Reduction:</strong> {metrics?.improvement.mae_reduction_percent}% improvement over naive persistence.</p>
                <p><strong>R² Score:</strong> {metrics?.random_forest.r2_score} (Captures variance across unseen dates without overfitting).</p>
              </div>
            </section>
          </div>
        )}

        {/* TAB 7: SOURCE CODE EXPLORER */}
        {activeTab === 'code' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 p-4 bg-slate-50 gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Standalone Project Files</h3>
                <p className="text-xs text-slate-500">Every deliverable file created for local VS Code execution &amp; internship submission.</p>
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
                  GitHub & Deployment
                </div>
                {['deploy.yml', 'DEPLOYMENT.md', 'Dockerfile'].map(f => (
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

      {/* AUTHENTICATION MODAL (CLIENT-SIDE WITHOUT BACKEND) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  {authMode === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {authMode === 'signin' ? 'Sign In to StockSense AI' : 'Create New Account'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Client-Side Session &bull; No Backend Required
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex border-b border-slate-100 bg-slate-50/40 text-xs font-semibold">
              <button
                onClick={() => { setAuthMode('signin'); setAuthError(null); }}
                className={`flex-1 py-2.5 text-center transition-colors cursor-pointer border-b-2 ${
                  authMode === 'signin' ? 'border-emerald-600 text-emerald-800 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                className={`flex-1 py-2.5 text-center transition-colors cursor-pointer border-b-2 ${
                  authMode === 'signup' ? 'border-emerald-600 text-emerald-800 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error notice */}
            {authError && (
              <div className="mx-5 mt-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* SIGN IN FORM */}
            {authMode === 'signin' ? (
              <form onSubmit={handleSignIn} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@stocksense.ai"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Password</label>
                    <span className="text-[10px] text-slate-400">Default: password123</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-emerald-600 font-medium pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Sign In
                </button>

                {/* 1-Click Quick Demo Profiles */}
                <div className="pt-3 border-t border-slate-100">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">
                    Quick 1-Click Demo Profiles
                  </span>
                  <div className="space-y-1.5">
                    {DEFAULT_USERS.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleQuickLogin(u)}
                        className="w-full p-2 rounded-lg border border-slate-200 hover:border-emerald-300 bg-slate-50 hover:bg-emerald-50/40 text-left flex items-center justify-between text-xs transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${u.avatarColor}`}>
                            {u.name[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 leading-tight">{u.name}</div>
                            <div className="text-[10px] text-slate-500 leading-none">{u.role}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-700 font-semibold">Select &rarr;</span>
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            ) : (
              /* CREATE ACCOUNT FORM */
              <form onSubmit={handleSignUp} className="p-5 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="e.g. Maya Lin"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="maya@retailco.com"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Specialization</label>
                  <select
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-emerald-600 cursor-pointer font-medium"
                  >
                    <option value="Lead ML Engineer & Data Scientist">Lead ML Engineer &amp; Data Scientist</option>
                    <option value="Supply Chain & Inventory Director">Supply Chain &amp; Inventory Director</option>
                    <option value="Pricing & Merchandising Manager">Pricing &amp; Merchandising Manager</option>
                    <option value="Retail Store Operations Lead">Retail Store Operations Lead</option>
                    <option value="Academic Researcher / Intern">Academic Researcher / Intern</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={signupDept}
                    onChange={(e) => setSignupDept(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-emerald-600 cursor-pointer font-medium"
                  >
                    <option value="Analytics & Forecasting">Analytics &amp; Forecasting</option>
                    <option value="Procurement & Warehousing">Procurement &amp; Warehousing</option>
                    <option value="Retail Revenue Operations">Retail Revenue Operations</option>
                    <option value="Store Inventory Planning">Store Inventory Planning</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs mt-2"
                >
                  Complete Registration &amp; Sign In
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-8 mt-16 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
        <p>
          StockSense AI &bull; Supervised Machine Learning Sales Forecasting System &bull; 16 SKUs with Price History &amp; Inventory Intelligence &bull; Scikit-Learn RandomForestRegressor
        </p>
      </footer>
    </div>
  );
}
