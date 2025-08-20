/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg)',
        foreground: 'var(--fg)',
        bubble: 'var(--bubble)',
        'composer-bg': 'var(--composer-bg)',
        'composer-border': 'var(--composer-border)',
        'placeholder-fg': 'var(--placeholder-fg)',
      },
      // ADD THIS ENTIRE SECTION
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': 'var(--fg)',
            '--tw-prose-headings': 'var(--fg)',
            '--tw-prose-lead': 'var(--fg)',
            '--tw-prose-links': 'var(--fg)',
            '--tw-prose-bold': 'var(--fg)',
            '--tw-prose-counters': 'var(--fg)',
            '--tw-prose-bullets': 'var(--fg)',
            '--tw-prose-hr': 'var(--composer-border)',
            '--tw-prose-quotes': 'var(--fg)',
            '--tw-prose-quote-borders': 'var(--composer-border)',
            '--tw-prose-captions': 'var(--placeholder-fg)',
            '--tw-prose-code': 'var(--fg)',
            '--tw-prose-pre-code': 'var(--fg)',
            '--tw-prose-pre-bg': 'var(--bubble)',
            '--tw-prose-th-borders': 'var(--composer-border)',
            '--tw-prose-td-borders': 'var(--composer-border)',
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}