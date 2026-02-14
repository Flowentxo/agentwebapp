/**
 * Chart Generate Tool
 *
 * Generiert Chart-Konfigurationen (Chart.js / Recharts kompatibel) als JSON
 * fuer die Frontend-Darstellung.
 */

export interface ChartGenerateInput {
  data: Array<{ label: string; value: number }>;
  chart_type?: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
  title?: string;
  color_scheme?: 'default' | 'warm' | 'cool' | 'monochrome';
}

export interface ChartGenerateResult {
  chart_config: object;
  chart_type: string;
  data_points: number;
  formatted_output: string;
}

export const CHART_GENERATE_TOOL = {
  name: 'chart_generate',
  description: 'Generiere eine Chart-Konfiguration (JSON) aus Datenpunkten. Unterstuetzt Bar, Line, Pie, Doughnut und Area Charts mit verschiedenen Farbschemata. Ideal fuer die Visualisierung von Daten und Ergebnissen.',
  input_schema: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', description: 'Beschriftung des Datenpunkts' },
            value: { type: 'number', description: 'Numerischer Wert' },
          },
          required: ['label', 'value'],
        },
        description: 'Datenpunkte mit Label und Wert',
      },
      chart_type: {
        type: 'string',
        enum: ['bar', 'line', 'pie', 'doughnut', 'area'],
        description: 'Chart-Typ (default: bar)',
      },
      title: { type: 'string', description: 'Titel des Charts' },
      color_scheme: {
        type: 'string',
        enum: ['default', 'warm', 'cool', 'monochrome'],
        description: 'Farbschema (default: default)',
      },
    },
    required: ['data'],
  },
};

const COLOR_SCHEMES: Record<string, string[]> = {
  default: [
    'rgba(59, 130, 246, 0.8)',   // blue
    'rgba(34, 197, 94, 0.8)',    // green
    'rgba(249, 115, 22, 0.8)',   // orange
    'rgba(239, 68, 68, 0.8)',    // red
    'rgba(168, 85, 247, 0.8)',   // purple
    'rgba(236, 72, 153, 0.8)',   // pink
    'rgba(20, 184, 166, 0.8)',   // teal
    'rgba(234, 179, 8, 0.8)',    // yellow
    'rgba(107, 114, 128, 0.8)',  // gray
    'rgba(99, 102, 241, 0.8)',   // indigo
  ],
  warm: [
    'rgba(239, 68, 68, 0.8)',    // red
    'rgba(249, 115, 22, 0.8)',   // orange
    'rgba(234, 179, 8, 0.8)',    // yellow
    'rgba(245, 158, 11, 0.8)',   // amber
    'rgba(236, 72, 153, 0.8)',   // pink
    'rgba(220, 38, 38, 0.8)',    // dark red
    'rgba(251, 146, 60, 0.8)',   // light orange
    'rgba(253, 224, 71, 0.8)',   // light yellow
    'rgba(244, 114, 182, 0.8)',  // light pink
    'rgba(190, 18, 60, 0.8)',    // rose
  ],
  cool: [
    'rgba(59, 130, 246, 0.8)',   // blue
    'rgba(20, 184, 166, 0.8)',   // teal
    'rgba(168, 85, 247, 0.8)',   // purple
    'rgba(6, 182, 212, 0.8)',    // cyan
    'rgba(99, 102, 241, 0.8)',   // indigo
    'rgba(37, 99, 235, 0.8)',    // dark blue
    'rgba(45, 212, 191, 0.8)',   // light teal
    'rgba(139, 92, 246, 0.8)',   // light purple
    'rgba(34, 211, 238, 0.8)',   // light cyan
    'rgba(79, 70, 229, 0.8)',    // dark indigo
  ],
  monochrome: [
    'rgba(17, 24, 39, 0.8)',     // gray-900
    'rgba(55, 65, 81, 0.8)',     // gray-700
    'rgba(107, 114, 128, 0.8)',  // gray-500
    'rgba(156, 163, 175, 0.8)',  // gray-400
    'rgba(209, 213, 219, 0.8)',  // gray-300
    'rgba(31, 41, 55, 0.8)',     // gray-800
    'rgba(75, 85, 99, 0.8)',     // gray-600
    'rgba(229, 231, 235, 0.8)',  // gray-200
    'rgba(243, 244, 246, 0.8)',  // gray-100
    'rgba(0, 0, 0, 0.8)',        // black
  ],
};

export async function chartGenerate(input: ChartGenerateInput): Promise<ChartGenerateResult> {
  const { data, chart_type = 'bar', title = 'Chart', color_scheme = 'default' } = input;

  if (!data || data.length === 0) {
    return {
      chart_config: {},
      chart_type,
      data_points: 0,
      formatted_output: '❌ Keine Datenpunkte bereitgestellt.',
    };
  }

  const colors = COLOR_SCHEMES[color_scheme] || COLOR_SCHEMES.default;
  const borderColors = colors.map(c => c.replace('0.8)', '1)'));
  const dataColors = data.map((_, i) => colors[i % colors.length]);
  const dataBorderColors = data.map((_, i) => borderColors[i % borderColors.length]);

  const labels = data.map(d => d.label);
  const values = data.map(d => d.value);

  let chartConfig: object;

  if (chart_type === 'pie' || chart_type === 'doughnut') {
    // Pie / Doughnut config
    chartConfig = {
      type: chart_type,
      data: {
        labels,
        datasets: [
          {
            label: title,
            data: values,
            backgroundColor: dataColors,
            borderColor: dataBorderColors,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: title },
        },
      },
    };
  } else if (chart_type === 'area') {
    // Area chart (line with fill)
    chartConfig = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: title,
            data: values,
            backgroundColor: colors[0].replace('0.8)', '0.3)'),
            borderColor: borderColors[0],
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: title },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    };
  } else {
    // Bar / Line config
    chartConfig = {
      type: chart_type,
      data: {
        labels,
        datasets: [
          {
            label: title,
            data: values,
            backgroundColor: chart_type === 'line' ? 'transparent' : dataColors,
            borderColor: chart_type === 'line' ? borderColors[0] : dataBorderColors,
            borderWidth: 2,
            ...(chart_type === 'line' ? { tension: 0.3, pointRadius: 4, pointHoverRadius: 6 } : {}),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: title },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    };
  }

  const chartTypeLabel: Record<string, string> = {
    bar: 'Balkendiagramm',
    line: 'Liniendiagramm',
    pie: 'Kreisdiagramm',
    doughnut: 'Ringdiagramm',
    area: 'Flaechendiagramm',
  };

  const configJson = JSON.stringify(chartConfig, null, 2);

  const formatted = [
    `📊 **Chart generiert:** ${title}`,
    `**Typ:** ${chartTypeLabel[chart_type] || chart_type}`,
    `**Datenpunkte:** ${data.length}`,
    `**Farbschema:** ${color_scheme}`,
    '',
    '**Daten:**',
    ...data.map(d => `- ${d.label}: ${d.value}`),
    '',
    '**Chart-Konfiguration:**',
    '```json',
    configJson,
    '```',
  ].join('\n');

  return {
    chart_config: chartConfig,
    chart_type,
    data_points: data.length,
    formatted_output: formatted,
  };
}
