/**
 * Milo Motion Design Tools
 *
 * Motion design tools: CSS animations, SVG path generation.
 */

// ─── generate_css_animation ──────────────────────────────────────

export interface GenerateCssAnimationInput {
  type: 'fadeIn' | 'bounce' | 'slideUp' | 'pulse' | 'shake' | 'rotate' | 'scaleIn' | 'flipIn';
  duration?: string;
  easing?: string;
}

export interface CssAnimationResult {
  type: string;
  css_code: string;
  usage_example: string;
  duration: string;
  easing: string;
  keyframes_count: number;
}

export const GENERATE_CSS_ANIMATION_TOOL = {
  name: 'generate_css_animation',
  description: 'Generiere eine CSS @keyframes Animation. Unterstuetzt fadeIn, bounce, slideUp, pulse, shake, rotate, scaleIn und flipIn.',
  input_schema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['fadeIn', 'bounce', 'slideUp', 'pulse', 'shake', 'rotate', 'scaleIn', 'flipIn'],
        description: 'Art der Animation',
      },
      duration: {
        type: 'string',
        description: 'Dauer (z.B. "0.5s", "1s", "300ms"). Default: "0.6s"',
      },
      easing: {
        type: 'string',
        description: 'Easing-Funktion (z.B. "ease-in-out", "cubic-bezier(0.4,0,0.2,1)"). Default: "ease-out"',
      },
    },
    required: ['type'],
  },
};

const ANIMATION_TEMPLATES: Record<string, { keyframes: string; keyframesCount: number }> = {
  fadeIn: {
    keyframes: `@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}`,
    keyframesCount: 2,
  },
  bounce: {
    keyframes: `@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-20px); }
  60% { transform: translateY(-10px); }
}`,
    keyframesCount: 6,
  },
  slideUp: {
    keyframes: `@keyframes slideUp {
  0% { transform: translateY(30px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}`,
    keyframesCount: 2,
  },
  pulse: {
    keyframes: `@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}`,
    keyframesCount: 3,
  },
  shake: {
    keyframes: `@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}`,
    keyframesCount: 11,
  },
  rotate: {
    keyframes: `@keyframes rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`,
    keyframesCount: 2,
  },
  scaleIn: {
    keyframes: `@keyframes scaleIn {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}`,
    keyframesCount: 3,
  },
  flipIn: {
    keyframes: `@keyframes flipIn {
  0% { transform: perspective(400px) rotateY(90deg); opacity: 0; }
  40% { transform: perspective(400px) rotateY(-10deg); }
  70% { transform: perspective(400px) rotateY(10deg); }
  100% { transform: perspective(400px) rotateY(0deg); opacity: 1; }
}`,
    keyframesCount: 4,
  },
};

export async function generateCssAnimation(input: GenerateCssAnimationInput): Promise<CssAnimationResult> {
  const { type, duration = '0.6s', easing = 'ease-out' } = input;

  const template = ANIMATION_TEMPLATES[type] || ANIMATION_TEMPLATES.fadeIn;

  const cssCode = `${template.keyframes}

.animate-${type} {
  animation: ${type} ${duration} ${easing};
  animation-fill-mode: both;
}`;

  const usageExample = `<div class="animate-${type}">
  Animierter Inhalt
</div>

/* Oder direkt im Style: */
.my-element {
  animation: ${type} ${duration} ${easing} both;
}`;

  return {
    type,
    css_code: cssCode,
    usage_example: usageExample,
    duration,
    easing,
    keyframes_count: template.keyframesCount,
  };
}

// ─── generate_svg_path ───────────────────────────────────────────

export interface GenerateSvgPathInput {
  shape: 'circle' | 'star' | 'heart' | 'arrow' | 'wave' | 'hexagon' | 'diamond' | 'checkmark';
  size?: number;
}

export interface SvgPathResult {
  shape: string;
  size: number;
  svg_path: string;
  full_svg: string;
  viewBox: string;
  download_url?: string;
}

export const GENERATE_SVG_PATH_TOOL = {
  name: 'generate_svg_path',
  description: 'Generiere SVG-Pfaddaten fuer verschiedene Formen: circle, star, heart, arrow, wave, hexagon, diamond, checkmark.',
  input_schema: {
    type: 'object',
    properties: {
      shape: {
        type: 'string',
        enum: ['circle', 'star', 'heart', 'arrow', 'wave', 'hexagon', 'diamond', 'checkmark'],
        description: 'Die gewuenschte Form',
      },
      size: {
        type: 'number',
        description: 'Groesse in Pixeln (default: 100)',
      },
    },
    required: ['shape'],
  },
};

const SVG_PATHS: Record<string, { path: string; viewBox: string }> = {
  circle: {
    path: 'M50,5 A45,45 0 1,1 49.99,5 Z',
    viewBox: '0 0 100 100',
  },
  star: {
    path: 'M50,5 L61.8,38.2 L97.6,38.2 L68.9,59.3 L80.7,92.5 L50,73.6 L19.3,92.5 L31.1,59.3 L2.4,38.2 L38.2,38.2 Z',
    viewBox: '0 0 100 100',
  },
  heart: {
    path: 'M50,88 C25,65 5,50 5,30 A22.5,22.5 0 0,1 50,25 A22.5,22.5 0 0,1 95,30 C95,50 75,65 50,88 Z',
    viewBox: '0 0 100 100',
  },
  arrow: {
    path: 'M10,50 L70,50 L70,30 L95,55 L70,80 L70,60 L10,60 Z',
    viewBox: '0 0 100 100',
  },
  wave: {
    path: 'M0,50 C15,30 35,30 50,50 C65,70 85,70 100,50 L100,100 L0,100 Z',
    viewBox: '0 0 100 100',
  },
  hexagon: {
    path: 'M50,5 L93.3,27.5 L93.3,72.5 L50,95 L6.7,72.5 L6.7,27.5 Z',
    viewBox: '0 0 100 100',
  },
  diamond: {
    path: 'M50,5 L95,50 L50,95 L5,50 Z',
    viewBox: '0 0 100 100',
  },
  checkmark: {
    path: 'M15,55 L35,75 L85,25',
    viewBox: '0 0 100 100',
  },
};

export async function generateSvgPath(input: GenerateSvgPathInput): Promise<SvgPathResult> {
  const { shape, size = 100 } = input;

  const template = SVG_PATHS[shape] || SVG_PATHS.circle;

  const isCheckmark = shape === 'checkmark';
  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${template.viewBox}">
  <path d="${template.path}" ${isCheckmark
    ? 'fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"'
    : 'fill="currentColor"'} />
</svg>`;

  // Save SVG artifact
  let download_url: string | undefined;
  try {
    const { artifactService } = await import('@/server/services/ArtifactService');
    const artifact = await artifactService.saveArtifact('milo', `${shape}-${size}px.svg`, fullSvg);
    download_url = artifact.url;
  } catch (err) {
    console.error('[MILO] SVG artifact save failed (non-fatal):', err);
  }

  return {
    shape,
    size,
    svg_path: template.path,
    full_svg: fullSvg,
    viewBox: template.viewBox,
    download_url,
  };
}
