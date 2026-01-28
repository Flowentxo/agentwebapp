module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/agents'],
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'ready on',
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        // Accessibility must be 95%+ (WCAG 2.1 Level AA requirement)
        'categories:accessibility': ['error', { minScore: 0.95 }],

        // Performance should be 85%+ (warning only to avoid blocking builds)
        'categories:performance': ['warn', { minScore: 0.85 }],

        // Best Practices
        'categories:best-practices': ['warn', { minScore: 0.90 }],

        // SEO
        'categories:seo': ['warn', { minScore: 0.90 }],

        // Specific A11y checks (errors block builds)
        'color-contrast': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-viewport': 'error',
        'aria-valid-attr': 'error',
        'aria-valid-attr-value': 'error',
        'button-name': 'error',
        'link-name': 'error',
        'label': 'error',

        // Performance (warnings only)
        'uses-text-compression': 'warn',
        'uses-optimized-images': 'warn',
        'modern-image-formats': 'warn',
        'offscreen-images': 'warn',
        'render-blocking-resources': 'warn',
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn',

        // PWA (off for now, can enable later)
        'categories:pwa': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
