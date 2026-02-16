// Design Tokens for the Epstein Archive Investigation Tool
// These tokens establish a consistent design language across the application

// Color Palette
export const colors = {
  // Background colors
  bg: {
    elevated: '#1e293b', // Slightly lighter than base for elevated surfaces
    surface: '#0f172a', // Base background color
    subtle: '#1e293b', // Subtle background for sections
  },

  // Border colors
  border: {
    subtle: '#334155', // Subtle borders for cards and dividers
    strong: '#475569', // Stronger borders for emphasis
  },

  // Accent colors
  accent: {
    primary: '#2f96ee', // Primary action accent
    secondary: '#5fb8ff', // Secondary action accent
    danger: '#ff6b6b', // Danger accent
    warning: '#f4b549', // Warning accent
    success: '#2dcf96', // Success accent
  },

  // Soft accent variations
  accentSoft: {
    primary: '#3b82f620', // Primary with transparency
    secondary: '#8b5cf620', // Secondary with transparency
    danger: '#ef444420', // Danger with transparency
  },

  // Text colors
  text: {
    primary: '#ffffff', // Primary text color (improved contrast)
    secondary: '#e2e8f0', // Secondary text (improved contrast)
    tertiary: '#cbd5e1', // Tertiary text (improved contrast)
    disabled: '#94a3b8', // Disabled text (improved contrast)
  },

  // Semantic mappings
  semantic: {
    risk: {
      high: '#ff4d4d',
      medium: '#fbbf24',
      low: '#10b981',
    },
    confidence: {
      high: '#8b5cf6',
      subtle: '#c084fc',
    },
    provenance: {
      direct: '#22c55e',
      derived: '#eab308',
      inferred: '#a855f7',
    },
  },
};

// Typography
export const typography = {
  fonts: {
    sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
  sizes: {
    h1: '2rem', // 32px
    h2: '1.5rem', // 24px
    h3: '1.25rem', // 20px
    h4: '1.125rem', // 18px
    body: '1rem', // 16px
    caption: '0.875rem', // 14px
    small: '0.75rem', // 12px
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

// Spacing Scale (based on 4px grid)
export const spacing = {
  space1: '0.25rem', // 4px
  space2: '0.5rem', // 8px
  space3: '0.75rem', // 12px
  space4: '1rem', // 16px
  space5: '1.25rem', // 20px
  space6: '1.5rem', // 24px
  space8: '2rem', // 32px
  space10: '2.5rem', // 40px
  space12: '3rem', // 48px
};

// Border Radius
export const radii = {
  sm: '0.5rem', // 8px
  md: '0.75rem', // 12px
  lg: '1rem', // 16px
};

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

// Motion / Easing (Liquid Feel)
export const motion = {
  easings: {
    liquid: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    swift: 'cubic-bezier(0.4, 0, 0.2, 1)',
    gentle: 'cubic-bezier(0, 0, 0.2, 1)',
  },
  durations: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
};

// Advanced Elevation (Glassmorphism)
export const elevation = {
  glass: {
    border: 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
    shine: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%)',
    blur: '12px',
  },
};

// Z-index scale
export const zIndex = {
  auto: 'auto',
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};

// Breakpoints
export const breakpoints = {
  sm: '576px',
  md: '768px',
  lg: '992px',
  xl: '1200px',
  xxl: '1400px',
};

// Export as CSS variables for use in stylesheets
export const cssVariables = `
  :root {
    /* Colors */
    --bg-elevated: ${colors.bg.elevated};
    --bg-surface: ${colors.bg.surface};
    --bg-subtle: ${colors.bg.subtle};
    
    --border-subtle: ${colors.border.subtle};
    --border-strong: ${colors.border.strong};
    
    --accent-primary: ${colors.accent.primary};
    --accent-secondary: ${colors.accent.secondary};
    --accent-danger: ${colors.accent.danger};
    --accent-warning: ${colors.accent.warning};
    --accent-success: ${colors.accent.success};
    
    --accent-soft-primary: ${colors.accentSoft.primary};
    --accent-soft-secondary: ${colors.accentSoft.secondary};
    --accent-soft-danger: ${colors.accentSoft.danger};
    
    --text-primary: ${colors.text.primary};
    --text-secondary: ${colors.text.secondary};
    --text-tertiary: ${colors.text.tertiary};
    --text-disabled: ${colors.text.disabled};
    
    /* Typography */
    --font-sans: ${typography.fonts.sans};
    --font-mono: ${typography.fonts.mono};
    
    --font-size-h1: ${typography.sizes.h1};
    --font-size-h2: ${typography.sizes.h2};
    --font-size-h3: ${typography.sizes.h3};
    --font-size-h4: ${typography.sizes.h4};
    --font-size-body: ${typography.sizes.body};
    --font-size-caption: ${typography.sizes.caption};
    --font-size-small: ${typography.sizes.small};
    
    --font-weight-regular: ${typography.weights.regular};
    --font-weight-medium: ${typography.weights.medium};
    --font-weight-semibold: ${typography.weights.semibold};
    --font-weight-bold: ${typography.weights.bold};
    
    /* Spacing */
    --space-1: ${spacing.space1};
    --space-2: ${spacing.space2};
    --space-3: ${spacing.space3};
    --space-4: ${spacing.space4};
    --space-5: ${spacing.space5};
    --space-6: ${spacing.space6};
    --space-8: ${spacing.space8};
    --space-10: ${spacing.space10};
    --space-12: ${spacing.space12};
    
    /* Radii */
    --radius-sm: ${radii.sm};
    --radius-md: ${radii.md};
    --radius-lg: ${radii.lg};
    
    /* Shadows */
    --shadow-sm: ${shadows.sm};
    --shadow-md: ${shadows.md};
    --shadow-lg: ${shadows.lg};
    --shadow-xl: ${shadows.xl};

    /* Motion */
    --easing-liquid: ${motion.easings.liquid};
    --easing-swift: ${motion.easings.swift};
    --easing-gentle: ${motion.easings.gentle};
    --duration-fast: ${motion.durations.fast};
    --duration-normal: ${motion.durations.normal};
    --duration-slow: ${motion.durations.slow};

    /* Elevation */
    --glass-border: ${elevation.glass.border};
    --glass-shine: ${elevation.glass.shine};
    --glass-blur: ${elevation.glass.blur};

    /* Semantic */
    --risk-high: ${colors.semantic.risk.high};
    --risk-medium: ${colors.semantic.risk.medium};
    --risk-low: ${colors.semantic.risk.low};
    --confidence-high: ${colors.semantic.confidence.high};
    --confidence-subtle: ${colors.semantic.confidence.subtle};
    --provenance-direct: ${colors.semantic.provenance.direct};
    --provenance-derived: ${colors.semantic.provenance.derived};
    --provenance-inferred: ${colors.semantic.provenance.inferred};
  }
`;

export default {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  motion,
  elevation,
  zIndex,
  breakpoints,
  cssVariables,
};
