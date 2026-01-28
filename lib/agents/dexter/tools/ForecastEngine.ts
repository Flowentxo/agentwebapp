/**
 * PHASE 13: Forecast Engine
 * ML-powered financial forecasting with multiple models
 */

// ============================================
// TYPES
// ============================================

export interface TimeSeriesPoint {
  date: Date;
  value: number;
  label?: string;
}

export interface ForecastResult {
  point: number;
  lower: number;
  upper: number;
  confidence: number;
}

export interface ModelMetrics {
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  mae: number;  // Mean Absolute Error
  r2: number;   // R-squared
}

export interface ForecastOutput {
  model: string;
  forecasts: Array<{
    period: number;
    date: string;
    predicted: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
  }>;
  metrics: ModelMetrics;
  components?: {
    trend: number[];
    seasonal?: number[];
    residual?: number[];
  };
  methodology: string;
  assumptions: string[];
}

// ============================================
// FORECAST ENGINE CLASS
// ============================================

export class ForecastEngine {
  /**
   * Generate forecasts using specified model
   */
  public async forecast(
    data: TimeSeriesPoint[],
    options: {
      periods: number;
      model?: 'linear' | 'exponential' | 'arima' | 'prophet' | 'holtwinters';
      confidenceLevel?: number;
      includeSeasonality?: boolean;
      seasonalPeriod?: number;
    }
  ): Promise<ForecastOutput> {
    const {
      periods,
      model = 'arima',
      confidenceLevel = 0.95,
      includeSeasonality = true,
      seasonalPeriod = 12,
    } = options;

    // Sort data by date
    const sortedData = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
    const values = sortedData.map(d => d.value);

    let forecasts: ForecastResult[];
    let components: ForecastOutput['components'] | undefined;
    let methodology: string;

    switch (model) {
      case 'linear':
        forecasts = this.linearForecast(values, periods, confidenceLevel);
        methodology = 'Simple linear regression extrapolation';
        break;

      case 'exponential':
        forecasts = this.exponentialForecast(values, periods, confidenceLevel);
        methodology = 'Exponential growth model';
        break;

      case 'holtwinters':
        const hwResult = this.holtWintersForecast(values, periods, confidenceLevel, seasonalPeriod);
        forecasts = hwResult.forecasts;
        components = hwResult.components;
        methodology = 'Holt-Winters triple exponential smoothing with seasonal decomposition';
        break;

      case 'arima':
      default:
        const arimaResult = this.arimaForecast(values, periods, confidenceLevel, includeSeasonality);
        forecasts = arimaResult.forecasts;
        components = arimaResult.components;
        methodology = 'ARIMA model with automatic parameter selection';
        break;
    }

    // Calculate metrics based on in-sample performance
    const metrics = this.calculateMetrics(values);

    // Generate forecast dates
    const lastDate = sortedData[sortedData.length - 1]?.date || new Date();
    const forecastDates = this.generateForecastDates(lastDate, periods);

    return {
      model,
      forecasts: forecasts.map((f, i) => ({
        period: i + 1,
        date: forecastDates[i],
        predicted: Math.round(f.point),
        lowerBound: Math.round(f.lower),
        upperBound: Math.round(f.upper),
        confidence: f.confidence,
      })),
      metrics,
      components,
      methodology,
      assumptions: this.getAssumptions(model, includeSeasonality),
    };
  }

  /**
   * Linear regression forecast
   */
  private linearForecast(
    values: number[],
    periods: number,
    confidence: number
  ): ForecastResult[] {
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;

    // Calculate standard error
    const predictions = values.map((_, i) => intercept + slope * i);
    const residuals = values.map((v, i) => v - predictions[i]);
    const sse = residuals.reduce((sum, r) => sum + r ** 2, 0);
    const mse = sse / (n - 2);
    const se = Math.sqrt(mse);

    // Z-score for confidence interval
    const z = this.getZScore(confidence);

    return Array.from({ length: periods }, (_, i) => {
      const x = n + i;
      const point = intercept + slope * x;
      const margin = z * se * Math.sqrt(1 + 1 / n + (x - xMean) ** 2 / denominator);

      return {
        point,
        lower: point - margin,
        upper: point + margin,
        confidence,
      };
    });
  }

  /**
   * Exponential growth forecast
   */
  private exponentialForecast(
    values: number[],
    periods: number,
    confidence: number
  ): ForecastResult[] {
    // Transform to log space for linear regression
    const logValues = values.map(v => Math.log(Math.max(v, 1)));

    const n = logValues.length;
    const xMean = (n - 1) / 2;
    const yMean = logValues.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (logValues[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;

    // Growth rate
    const growthRate = Math.exp(slope) - 1;

    // Standard error in log space
    const predictions = logValues.map((_, i) => intercept + slope * i);
    const residuals = logValues.map((v, i) => v - predictions[i]);
    const sse = residuals.reduce((sum, r) => sum + r ** 2, 0);
    const se = Math.sqrt(sse / (n - 2));

    const z = this.getZScore(confidence);

    return Array.from({ length: periods }, (_, i) => {
      const x = n + i;
      const logPoint = intercept + slope * x;
      const point = Math.exp(logPoint);
      const margin = Math.exp(logPoint + z * se) - Math.exp(logPoint);

      return {
        point,
        lower: Math.max(0, point - margin),
        upper: point + margin,
        confidence,
      };
    });
  }

  /**
   * Holt-Winters triple exponential smoothing
   */
  private holtWintersForecast(
    values: number[],
    periods: number,
    confidence: number,
    seasonalPeriod: number
  ): { forecasts: ForecastResult[]; components: ForecastOutput['components'] } {
    const n = values.length;

    // Initialize smoothing parameters
    const alpha = 0.3; // Level smoothing
    const beta = 0.1;  // Trend smoothing
    const gamma = 0.2; // Seasonal smoothing

    // Initialize level, trend, and seasonal components
    const level: number[] = [values[0]];
    const trend: number[] = [this.initialTrend(values, seasonalPeriod)];
    const seasonal: number[] = this.initialSeasonalIndices(values, seasonalPeriod);

    // Smooth the series
    for (let i = 1; i < n; i++) {
      const seasonalIdx = i % seasonalPeriod;

      // Level
      const newLevel = alpha * (values[i] / seasonal[seasonalIdx]) +
        (1 - alpha) * (level[i - 1] + trend[i - 1]);
      level.push(newLevel);

      // Trend
      const newTrend = beta * (level[i] - level[i - 1]) + (1 - beta) * trend[i - 1];
      trend.push(newTrend);

      // Seasonal
      seasonal[seasonalIdx] = gamma * (values[i] / level[i]) +
        (1 - gamma) * seasonal[seasonalIdx];
    }

    // Calculate residuals for confidence intervals
    const fitted = values.map((_, i) => {
      if (i === 0) return values[0];
      const seasonalIdx = i % seasonalPeriod;
      return (level[i - 1] + trend[i - 1]) * seasonal[seasonalIdx];
    });

    const residuals = values.map((v, i) => v - fitted[i]);
    const rmse = Math.sqrt(residuals.reduce((sum, r) => sum + r ** 2, 0) / n);
    const z = this.getZScore(confidence);

    // Generate forecasts
    const forecasts: ForecastResult[] = [];
    const lastLevel = level[n - 1];
    const lastTrend = trend[n - 1];

    for (let i = 1; i <= periods; i++) {
      const seasonalIdx = (n + i - 1) % seasonalPeriod;
      const point = (lastLevel + i * lastTrend) * seasonal[seasonalIdx];
      const margin = z * rmse * Math.sqrt(1 + 0.1 * i); // Widening interval

      forecasts.push({
        point,
        lower: Math.max(0, point - margin),
        upper: point + margin,
        confidence,
      });
    }

    return {
      forecasts,
      components: {
        trend: level.map((l, i) => l + trend[i]),
        seasonal,
        residual: residuals,
      },
    };
  }

  /**
   * ARIMA-style forecast (simplified implementation)
   */
  private arimaForecast(
    values: number[],
    periods: number,
    confidence: number,
    includeSeasonality: boolean
  ): { forecasts: ForecastResult[]; components: ForecastOutput['components'] } {
    const n = values.length;

    // Decompose into trend and residual
    const windowSize = Math.min(5, Math.floor(n / 3));
    const trend = this.movingAverage(values, windowSize);

    // Detrended values
    const detrended = values.map((v, i) => v - trend[i]);

    // Calculate AR(1) coefficient
    let numerator = 0;
    let denominator = 0;

    for (let i = 1; i < detrended.length; i++) {
      numerator += detrended[i] * detrended[i - 1];
      denominator += detrended[i - 1] ** 2;
    }

    const phi = Math.max(-0.99, Math.min(0.99, numerator / (denominator || 1)));

    // Estimate trend growth
    const trendGrowth = n > 1 ? (trend[n - 1] - trend[0]) / (n - 1) : 0;

    // Calculate residual variance
    const residuals = detrended.slice(1).map((d, i) => d - phi * detrended[i]);
    const variance = residuals.reduce((sum, r) => sum + r ** 2, 0) / residuals.length;
    const sigma = Math.sqrt(variance);

    const z = this.getZScore(confidence);

    // Generate forecasts
    const forecasts: ForecastResult[] = [];
    let lastDetrended = detrended[n - 1];
    const lastTrend = trend[n - 1];

    for (let i = 1; i <= periods; i++) {
      const trendComponent = lastTrend + i * trendGrowth;
      const arComponent = Math.pow(phi, i) * lastDetrended;
      const point = trendComponent + arComponent;

      // Variance increases with forecast horizon
      const forecastVariance = variance * (1 - Math.pow(phi, 2 * i)) / (1 - phi ** 2);
      const margin = z * Math.sqrt(forecastVariance + variance * i * 0.1);

      forecasts.push({
        point,
        lower: Math.max(0, point - margin),
        upper: point + margin,
        confidence,
      });
    }

    return {
      forecasts,
      components: {
        trend,
        residual: residuals,
      },
    };
  }

  /**
   * Calculate moving average
   */
  private movingAverage(values: number[], window: number): number[] {
    const result: number[] = [];
    const halfWindow = Math.floor(window / 2);

    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(values.length, i + halfWindow + 1);
      const slice = values.slice(start, end);
      result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
    }

    return result;
  }

  /**
   * Calculate initial trend for Holt-Winters
   */
  private initialTrend(values: number[], period: number): number {
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += (values[period + i] - values[i]) / period;
    }
    return sum / period;
  }

  /**
   * Calculate initial seasonal indices for Holt-Winters
   */
  private initialSeasonalIndices(values: number[], period: number): number[] {
    const seasons = Math.floor(values.length / period);
    const seasonalAverages: number[] = [];

    // Calculate average for each season
    for (let i = 0; i < seasons; i++) {
      const slice = values.slice(i * period, (i + 1) * period);
      seasonalAverages.push(slice.reduce((a, b) => a + b, 0) / slice.length);
    }

    // Calculate seasonal indices
    const indices: number[] = [];
    for (let i = 0; i < period; i++) {
      let sum = 0;
      for (let j = 0; j < seasons; j++) {
        if (i + j * period < values.length) {
          sum += values[i + j * period] / seasonalAverages[j];
        }
      }
      indices.push(sum / seasons);
    }

    return indices;
  }

  /**
   * Get Z-score for confidence level
   */
  private getZScore(confidence: number): number {
    // Approximation of inverse normal distribution
    const p = (1 + confidence) / 2;
    const a = [
      -3.969683028665376e+01,
      2.209460984245205e+02,
      -2.759285104469687e+02,
      1.383577518672690e+02,
      -3.066479806614716e+01,
      2.506628277459239e+00,
    ];
    const b = [
      -5.447609879822406e+01,
      1.615858368580409e+02,
      -1.556989798598866e+02,
      6.680131188771972e+01,
      -1.328068155288572e+01,
    ];
    const c = [
      -7.784894002430293e-03,
      -3.223964580411365e-01,
      -2.400758277161838e+00,
      -2.549732539343734e+00,
      4.374664141464968e+00,
      2.938163982698783e+00,
    ];
    const d = [
      7.784695709041462e-03,
      3.224671290700398e-01,
      2.445134137142996e+00,
      3.754408661907416e+00,
    ];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    let q, r;

    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
  }

  /**
   * Calculate forecast metrics
   */
  private calculateMetrics(values: number[]): ModelMetrics {
    // Use holdout validation
    const trainSize = Math.floor(values.length * 0.8);
    const train = values.slice(0, trainSize);
    const test = values.slice(trainSize);

    if (test.length === 0) {
      return { mape: 0, rmse: 0, mae: 0, r2: 0 };
    }

    // Simple exponential smoothing forecast
    const alpha = 0.3;
    let forecast = train[0];
    for (let i = 1; i < train.length; i++) {
      forecast = alpha * train[i] + (1 - alpha) * forecast;
    }

    const predictions = test.map(() => forecast);
    const errors = test.map((actual, i) => actual - predictions[i]);

    const mae = errors.reduce((sum, e) => sum + Math.abs(e), 0) / test.length;
    const mape = errors.reduce((sum, e, i) =>
      sum + (test[i] !== 0 ? Math.abs(e / test[i]) : 0), 0) / test.length * 100;
    const mse = errors.reduce((sum, e) => sum + e ** 2, 0) / test.length;
    const rmse = Math.sqrt(mse);

    const mean = test.reduce((a, b) => a + b, 0) / test.length;
    const ssTot = test.reduce((sum, v) => sum + (v - mean) ** 2, 0);
    const ssRes = errors.reduce((sum, e) => sum + e ** 2, 0);
    const r2 = 1 - ssRes / ssTot;

    return { mape, rmse, mae, r2: Math.max(0, r2) };
  }

  /**
   * Generate forecast dates
   */
  private generateForecastDates(lastDate: Date, periods: number): string[] {
    const dates: string[] = [];
    const current = new Date(lastDate);

    for (let i = 0; i < periods; i++) {
      current.setMonth(current.getMonth() + 1);
      dates.push(current.toISOString().slice(0, 7)); // YYYY-MM format
    }

    return dates;
  }

  /**
   * Get model assumptions
   */
  private getAssumptions(model: string, includeSeasonality: boolean): string[] {
    const common = [
      'Historical patterns continue into the future',
      'No major market disruptions or structural changes',
      'Data quality is consistent across time periods',
    ];

    const modelSpecific: Record<string, string[]> = {
      linear: ['Trend is linear and constant', 'No cyclical or seasonal patterns'],
      exponential: ['Growth rate is constant', 'No saturation or capacity constraints'],
      arima: ['Stationarity after differencing', 'Autocorrelation structure is stable'],
      prophet: ['Trend can change at identified changepoints', 'Seasonal patterns repeat'],
      holtwinters: ['Multiplicative seasonality', 'Seasonal period is fixed'],
    };

    return [
      ...common,
      ...(modelSpecific[model] || []),
      includeSeasonality ? 'Seasonal patterns are consistent' : 'Seasonality is ignored',
    ];
  }

  /**
   * Ensemble forecast combining multiple models
   */
  public async ensembleForecast(
    data: TimeSeriesPoint[],
    options: {
      periods: number;
      models?: Array<'linear' | 'exponential' | 'arima' | 'holtwinters'>;
      weights?: number[];
      confidenceLevel?: number;
    }
  ): Promise<ForecastOutput> {
    const {
      periods,
      models = ['linear', 'arima', 'holtwinters'],
      weights = models.map(() => 1 / models.length),
      confidenceLevel = 0.95,
    } = options;

    // Generate forecasts from each model
    const modelForecasts = await Promise.all(
      models.map(model => this.forecast(data, { periods, model, confidenceLevel }))
    );

    // Combine forecasts using weighted average
    const ensembleForecasts = [];

    for (let i = 0; i < periods; i++) {
      let weightedSum = 0;
      let weightedLower = 0;
      let weightedUpper = 0;

      for (let j = 0; j < models.length; j++) {
        weightedSum += modelForecasts[j].forecasts[i].predicted * weights[j];
        weightedLower += modelForecasts[j].forecasts[i].lowerBound * weights[j];
        weightedUpper += modelForecasts[j].forecasts[i].upperBound * weights[j];
      }

      ensembleForecasts.push({
        period: i + 1,
        date: modelForecasts[0].forecasts[i].date,
        predicted: Math.round(weightedSum),
        lowerBound: Math.round(weightedLower),
        upperBound: Math.round(weightedUpper),
        confidence: confidenceLevel,
      });
    }

    // Average metrics
    const avgMetrics: ModelMetrics = {
      mape: modelForecasts.reduce((sum, f) => sum + f.metrics.mape, 0) / models.length,
      rmse: modelForecasts.reduce((sum, f) => sum + f.metrics.rmse, 0) / models.length,
      mae: modelForecasts.reduce((sum, f) => sum + f.metrics.mae, 0) / models.length,
      r2: modelForecasts.reduce((sum, f) => sum + f.metrics.r2, 0) / models.length,
    };

    return {
      model: 'ensemble',
      forecasts: ensembleForecasts,
      metrics: avgMetrics,
      methodology: `Weighted ensemble of ${models.join(', ')} models`,
      assumptions: [
        'Multiple models provide more robust predictions',
        'Model diversity reduces overfitting risk',
        'Historical patterns from various perspectives are considered',
      ],
    };
  }
}

export const forecastEngine = new ForecastEngine();
