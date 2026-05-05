export const THEME_PRESETS = {
  creamCharcoal: {
    '--color-a': '#262424',
    '--color-b': '#111111',
    '--color-c': '#6B6B6B',
    '--color-d': '#EEE5DA',
    '--color-e': '#E6E6E6',
    '--bg-app': '#EEE5DA',
    '--bg-sidebar': '#262424',
    '--bg-card': '#EEE5DA',
    '--bg-input': '#EEE5DA',
    '--bg-hover': 'rgba(38, 36, 36, 0.06)',
    '--bg-active': 'rgba(38, 36, 36, 0.12)',
    '--text-on-dark': '#EEE5DA',
    '--text-on-light': '#262424',
    '--text-muted': '#6B6B6B',
    '--border-on-dark': 'rgba(238, 229, 218, 0.28)',
    '--border-on-light': '#262424',
    '--border-subtle': 'rgba(38, 36, 36, 0.14)',
    '--btn-primary-bg': '#262424',
    '--btn-primary-text': '#EEE5DA',
    '--btn-primary-hover': '#111111',
    '--btn-secondary-bg': '#EEE5DA',
    '--btn-secondary-text': '#262424',
    '--btn-secondary-border': '#262424',
    '--btn-secondary-hover': '#E6E6E6',
    '--btn-ghost-bg': 'transparent',
    '--btn-ghost-text': '#262424',
    '--btn-ghost-border': '#262424',
    '--btn-ghost-hover': '#E6E6E6',
    '--btn-ghost-dark-bg': 'transparent',
    '--btn-ghost-dark-text': '#EEE5DA',
    '--btn-ghost-dark-border': 'rgba(238, 229, 218, 0.28)',
    '--btn-ghost-dark-hover': 'rgba(238, 229, 218, 0.12)',
    '--status-error': '#262424',
    '--status-success': '#262424',
    '--status-warning': '#6B6B6B',
  },
  navySunburst: {
    '--color-a': '#0A122A',
    '--color-b': '#111111',
    '--color-c': '#6B6B6B',
    '--color-d': '#FFF7E6',
    '--color-e': '#E6E6E6',
    '--bg-app': '#FFF7E6',
    '--bg-sidebar': '#0A122A',
    '--bg-card': '#FFF7E6',
    '--bg-input': '#FFF7E6',
    '--bg-hover': 'rgba(10, 18, 42, 0.08)',
    '--bg-active': 'rgba(10, 18, 42, 0.16)',
    '--text-on-dark': '#FFF7E6',
    '--text-on-light': '#0A122A',
    '--text-muted': '#6B6B6B',
    '--border-on-dark': 'rgba(255, 247, 230, 0.32)',
    '--border-on-light': '#0A122A',
    '--border-subtle': 'rgba(10, 18, 42, 0.16)',
    '--btn-primary-bg': '#0A122A',
    '--btn-primary-text': '#FFF7E6',
    '--btn-primary-hover': '#111C42',
    '--btn-secondary-bg': '#FFF7E6',
    '--btn-secondary-text': '#0A122A',
    '--btn-secondary-border': '#0A122A',
    '--btn-secondary-hover': '#FFF7E6',
    '--btn-ghost-bg': 'transparent',
    '--btn-ghost-text': '#0A122A',
    '--btn-ghost-border': '#0A122A',
    '--btn-ghost-hover': 'rgba(10, 18, 42, 0.08)',
    '--btn-ghost-dark-bg': 'transparent',
    '--btn-ghost-dark-text': '#FFF7E6',
    '--btn-ghost-dark-border': 'rgba(255, 247, 230, 0.32)',
    '--btn-ghost-dark-hover': 'rgba(255, 247, 230, 0.12)',
    '--status-error': '#0A122A',
    '--status-success': '#0A122A',
    '--status-warning': '#6B6B6B',
  },
  forestCream: {
    '--color-a': '#004643',
    '--color-b': '#0B2F2E',
    '--color-c': '#6B6B6B',
    '--color-d': '#F0EDE5',
    '--color-e': '#E6E6E6',
    '--bg-app': '#F0EDE5',
    '--bg-sidebar': '#004643',
    '--bg-card': '#F0EDE5',
    '--bg-input': '#F0EDE5',
    '--bg-hover': 'rgba(0, 70, 67, 0.08)',
    '--bg-active': 'rgba(0, 70, 67, 0.16)',
    '--text-on-dark': '#F0EDE5',
    '--text-on-light': '#004643',
    '--text-muted': '#6B6B6B',
    '--border-on-dark': 'rgba(240, 237, 229, 0.32)',
    '--border-on-light': '#004643',
    '--border-subtle': 'rgba(0, 70, 67, 0.16)',
    '--btn-primary-bg': '#004643',
    '--btn-primary-text': '#F0EDE5',
    '--btn-primary-hover': '#0B2F2E',
    '--btn-secondary-bg': '#F0EDE5',
    '--btn-secondary-text': '#004643',
    '--btn-secondary-border': '#004643',
    '--btn-secondary-hover': '#E3DED3',
    '--btn-ghost-bg': 'transparent',
    '--btn-ghost-text': '#004643',
    '--btn-ghost-border': '#004643',
    '--btn-ghost-hover': 'rgba(0, 70, 67, 0.08)',
    '--btn-ghost-dark-bg': 'transparent',
    '--btn-ghost-dark-text': '#F0EDE5',
    '--btn-ghost-dark-border': 'rgba(240, 237, 229, 0.32)',
    '--btn-ghost-dark-hover': 'rgba(240, 237, 229, 0.12)',
    '--status-error': '#004643',
    '--status-success': '#004643',
    '--status-warning': '#6B6B6B',
  },
};

export function resolveThemePreset(themePreset) {
  if (themePreset === 'forestCream') {
    return 'forestCream';
  }
  if (themePreset === 'navySunburst') {
    return 'navySunburst';
  }
  return 'creamCharcoal';
}

export function applyThemePreset(themePreset) {
  if (typeof document === 'undefined') {
    return;
  }

  const resolved = resolveThemePreset(themePreset);
  const root = document.documentElement;
  const variables = THEME_PRESETS[resolved];

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
