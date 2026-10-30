import edaData from '../../data/eda_summary.json';
import metadataData from '../../data/dataset_metadata.json';
import modelData from '../../models/model_metadata.json';

export const STATIC_DATA = {
  metadata: metadataData,
  eda: edaData,
  forecast: modelData.future_forecast || [],
  actualVsPred: modelData.actual_vs_predicted || [],
  metrics: modelData.metrics,
  features: modelData.feature_importance || [],
  explanations: modelData.metric_explanations || {},
  trainPeriod: modelData.train_period || '2024-01-15 to 2025-08-08',
  testPeriod: modelData.test_period || '2025-08-09 to 2025-12-30',
  trainingSamples: modelData.training_samples || 572,
  testSamples: modelData.test_samples || 144
};
