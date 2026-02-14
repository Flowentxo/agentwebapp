/**
 * Dexter Chart Renderer
 *
 * Generates chart configuration JSON for frontend rendering.
 * Returns Chart.js/Recharts-compatible config that the frontend can render directly.
 */

export interface ChartRenderInput {
  chart_type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
  title: string;
  data: {
    labels: string[];
    datasets: {
      label: string;
      values: number[];
    }[];
  };
  options?: {
    currency?: string;
    percentage?: boolean;
    stacked?: boolean;
    show_legend?: boolean;
    color_scheme?: 'default' | 'financial' | 'warm' | 'cool';
  };
}

export interface ChartRenderResult {
  chart_config: Record<string, any>;
  chart_type: string;
  title: string;
  summary: string;
  formatted_output: string;
}

export const CHART_RENDER_TOOL = {
  name: 'render_chart',
  description: 'Erstellt ein Chart/Diagramm aus Daten. Generiert eine Chart-Konfiguration die im Frontend als interaktives Diagramm angezeigt wird.',
  input_schema: {
    type: 'object',
    properties: {
      chart_type: {
        type: 'string',
        enum: ['bar', 'line', 'pie', 'doughnut', 'area'],
        description: 'Art des Charts (bar, line, pie, doughnut, area)',
      },
      title: { type: 'string', description: 'Titel des Charts' },
      data: {
        type: 'object',
        properties: {
          labels: { type: 'array', items: { type: 'string' }, description: 'X-Achsen-Labels (z.B. Monate, Kategorien)' },
          datasets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', description: 'Name der Datenreihe' },
                values: { type: 'array', items: { type: 'number' }, description: 'Datenwerte' },
              },
              required: ['label', 'values'],
            },
            description: 'Datenreihen',
          },
        },
        required: ['labels', 'datasets'],
      },
      options: {
        type: 'object',
        properties: {
          currency: { type: 'string', description: 'Waehrung fuer Achsen-Labels (z.B. EUR, USD)' },
          percentage: { type: 'boolean', description: 'Werte als Prozent anzeigen' },
          stacked: { type: 'boolean', description: 'Gestapelte Darstellung' },
          show_legend: { type: 'boolean', description: 'Legende anzeigen (default: true)' },
          color_scheme: { type: 'string', enum: ['default', 'financial', 'warm', 'cool'], description: 'Farbschema' },
        },
      },
    },
    required: ['chart_type', 'title', 'data'],
  },
};

const COLOR_SCHEMES: Record<string, string[]> = {
  default: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'],
  financial: ['#059669', '#DC2626', '#2563EB', '#D97706', '#7C3AED', '#DB2777', '#0891B2', '#65A30D'],
  warm: ['#EF4444', '#F97316', '#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#DC2626', '#EA580C'],
  cool: ['#3B82F6', '#6366F1', '#8B5CF6', '#06B6D4', '#14B8A6', '#0EA5E9', '#2563EB', '#7C3AED'],
};

export async function renderChart(input: ChartRenderInput): Promise<ChartRenderResult> {
  const { chart_type, title, data, options = {} } = input;
  const {
    currency,
    percentage = false,
    stacked = false,
    show_legend = true,
    color_scheme = 'default',
  } = options;

  const colors = COLOR_SCHEMES[color_scheme] || COLOR_SCHEMES.default;

  // Build Chart.js compatible config
  const datasets = data.datasets.map((ds, i) => {
    const baseColor = colors[i % colors.length];
    const bgColor = chart_type === 'line' || chart_type === 'area'
      ? `${baseColor}33` // 20% opacity for fill
      : chart_type === 'pie' || chart_type === 'doughnut'
        ? data.labels.map((_, j) => colors[j % colors.length])
        : baseColor;

    return {
      label: ds.label,
      data: ds.values,
      backgroundColor: bgColor,
      borderColor: chart_type === 'pie' || chart_type === 'doughnut'
        ? data.labels.map((_, j) => colors[j % colors.length])
        : baseColor,
      borderWidth: chart_type === 'pie' || chart_type === 'doughnut' ? 2 : 2,
      fill: chart_type === 'area',
      tension: chart_type === 'line' || chart_type === 'area' ? 0.4 : undefined,
      pointRadius: chart_type === 'line' || chart_type === 'area' ? 4 : undefined,
      pointHoverRadius: chart_type === 'line' || chart_type === 'area' ? 6 : undefined,
    };
  });

  const chartConfig: Record<string, any> = {
    type: chart_type === 'area' ? 'line' : chart_type,
    data: {
      labels: data.labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 16, weight: 'bold' },
        },
        legend: {
          display: show_legend,
          position: 'top',
        },
        tooltip: {
          callbacks: currency
            ? { label: `function(ctx) { return ctx.dataset.label + ': ' + ctx.parsed.y.toLocaleString('de-DE') + ' ${currency}'; }` }
            : percentage
              ? { label: `function(ctx) { return ctx.dataset.label + ': ' + ctx.parsed.y + '%'; }` }
              : undefined,
        },
      },
      scales: chart_type !== 'pie' && chart_type !== 'doughnut'
        ? {
            x: {
              stacked,
              grid: { display: false },
            },
            y: {
              stacked,
              beginAtZero: true,
              ticks: currency
                ? { callback: `function(value) { return value.toLocaleString('de-DE') + ' ${currency}'; }` }
                : percentage
                  ? { callback: `function(value) { return value + '%'; }` }
                  : undefined,
            },
          }
        : undefined,
    },
  };

  // Generate text summary
  const allValues = data.datasets.flatMap(ds => ds.values);
  const total = allValues.reduce((s, v) => s + v, 0);
  const avg = total / allValues.length;
  const max = Math.max(...allValues);
  const min = Math.min(...allValues);

  const formatValue = (v: number) => {
    if (currency) return `${v.toLocaleString('de-DE')} ${currency}`;
    if (percentage) return `${v}%`;
    return v.toLocaleString('de-DE');
  };

  const summary = `${chart_type.charAt(0).toUpperCase() + chart_type.slice(1)}-Chart "${title}" mit ${data.datasets.length} Datenreihen, ${data.labels.length} Kategorien`;

  // Text-based representation for the chat
  const textChart = [
    `📊 **${title}** (${chart_type.toUpperCase()})`,
    '',
  ];

  if (chart_type === 'pie' || chart_type === 'doughnut') {
    const ds = data.datasets[0];
    const dsTotal = ds.values.reduce((s, v) => s + v, 0);
    data.labels.forEach((label, i) => {
      const pct = ((ds.values[i] / dsTotal) * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(Number(pct) / 5));
      textChart.push(`${bar} ${label}: ${formatValue(ds.values[i])} (${pct}%)`);
    });
  } else {
    data.datasets.forEach(ds => {
      textChart.push(`**${ds.label}:**`);
      const dsMax = Math.max(...ds.values);
      data.labels.forEach((label, i) => {
        const barLen = dsMax > 0 ? Math.round((ds.values[i] / dsMax) * 20) : 0;
        const bar = '▓'.repeat(barLen) + '░'.repeat(20 - barLen);
        textChart.push(`  ${label.padEnd(12)} ${bar} ${formatValue(ds.values[i])}`);
      });
      textChart.push('');
    });
  }

  textChart.push('**Statistik:**');
  textChart.push(`- Gesamt: ${formatValue(total)}`);
  textChart.push(`- Durchschnitt: ${formatValue(Math.round(avg))}`);
  textChart.push(`- Max: ${formatValue(max)} | Min: ${formatValue(min)}`);

  return {
    chart_config: chartConfig,
    chart_type,
    title,
    summary,
    formatted_output: textChart.join('\n'),
  };
}

// ─── Chart Config Validation ─────────────────────────────────────

export interface ChartValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a Chart.js config for correctness before sending to frontend.
 * Returns errors (invalid config) and warnings (suspicious but renderable).
 */
export function validateChartConfig(config: Record<string, any>): ChartValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const chartType = config.type;
  const labels: any[] = config.data?.labels ?? [];
  const datasets: any[] = config.data?.datasets ?? [];

  // 1. Labels must be a non-empty string array
  if (!Array.isArray(labels) || labels.length === 0) {
    errors.push('labels muss ein nicht-leeres Array sein');
  }

  // 2. Must have at least one dataset
  if (!Array.isArray(datasets) || datasets.length === 0) {
    errors.push('Mindestens ein Dataset ist erforderlich');
  }

  for (let i = 0; i < datasets.length; i++) {
    const ds = datasets[i];
    const dsData: any[] = ds?.data ?? [];

    // 3. Each dataset.data length must match labels length
    if (labels.length > 0 && dsData.length !== labels.length) {
      errors.push(`Dataset "${ds.label || i}": data.length (${dsData.length}) !== labels.length (${labels.length})`);
    }

    // 4. All values must be finite numbers
    for (let j = 0; j < dsData.length; j++) {
      if (typeof dsData[j] !== 'number' || !Number.isFinite(dsData[j])) {
        errors.push(`Dataset "${ds.label || i}" Wert [${j}] ist kein gueltiger Zahlenwert: ${dsData[j]}`);
        break; // one error per dataset is enough
      }
    }

    // 5. Pie/doughnut: no negative values
    if ((chartType === 'pie' || chartType === 'doughnut') && dsData.some((v: number) => v < 0)) {
      errors.push(`Dataset "${ds.label || i}": Pie/Doughnut-Charts erlauben keine negativen Werte`);
    }
  }

  // 6. Stacked charts: all datasets must have same length
  const isStacked = config.options?.scales?.x?.stacked || config.options?.scales?.y?.stacked;
  if (isStacked && datasets.length > 1) {
    const lengths = datasets.map((ds: any) => ds.data?.length ?? 0);
    if (new Set(lengths).size > 1) {
      errors.push(`Gestapelte Charts erfordern gleich lange Datasets: ${lengths.join(', ')}`);
    }
  }

  // 7. Duplicate dataset labels → warning
  const dsLabels = datasets.map((ds: any) => ds.label).filter(Boolean);
  const uniqueLabels = new Set(dsLabels);
  if (uniqueLabels.size < dsLabels.length) {
    warnings.push('Doppelte Dataset-Labels erkannt — koennte Legende verwirren');
  }

  return { valid: errors.length === 0, errors, warnings };
}
