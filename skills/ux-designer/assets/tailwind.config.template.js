/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Semantic Aliases
        canvas: 'var(--color-bg-canvas)',
        surface: 'var(--color-bg-surface)',
        subtle: 'var(--color-bg-subtle)',
        
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          fg: 'var(--color-on-primary)',
        },

        // Text Aliases
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
        },

        // Border Aliases
        border: {
          subtle: 'var(--color-border-subtle)',
          DEFAULT: 'var(--color-border-default)',
        },

        // Status
        danger: 'var(--color-danger)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',

        // Raw Scales (optional usage)
        gray: {
          50: 'var(--color-gray-50)',
          100: 'var(--color-gray-100)',
          200: 'var(--color-gray-200)',
          300: 'var(--color-gray-300)',
          400: 'var(--color-gray-400)',
          500: 'var(--color-gray-500)',
          600: 'var(--color-gray-600)',
          700: 'var(--color-gray-700)',
          800: 'var(--color-gray-800)',
          900: 'var(--color-gray-900)',
        }
      },
      spacing: {
        '2': 'var(--space-2)',
        '4': 'var(--space-4)',
        '8': 'var(--space-8)',
        '12': 'var(--space-12)',
        '16': 'var(--space-16)',
        '24': 'var(--space-24)',
        '32': 'var(--space-32)',
        '48': 'var(--space-48)',
        '64': 'var(--space-64)',
        '96': 'var(--space-96)',
        '128': 'var(--space-128)',
      },
      fontSize: {
        'xs': ['var(--text-xs)', { lineHeight: '1rem' }],
        'sm': ['var(--text-sm)', { lineHeight: '1.25rem' }],
        'base': ['var(--text-base)', { lineHeight: '1.5rem' }],
        'lg': ['var(--text-lg)', { lineHeight: '1.75rem' }],
        'xl': ['var(--text-xl)', { lineHeight: '1.75rem' }],
        '2xl': ['var(--text-2xl)', { lineHeight: '2rem' }],
        '3xl': ['var(--text-3xl)', { lineHeight: '2.25rem' }],
        '4xl': ['var(--text-4xl)', { lineHeight: '2.5rem' }],
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        'full': 'var(--radius-full)',
      },
      zIndex: {
        '0': 'var(--z-0)',
        '10': 'var(--z-10)',
        '20': 'var(--z-20)',
        '30': 'var(--z-30)',
        '40': 'var(--z-40)',
        '50': 'var(--z-50)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        // Refactoring UI specific naming
        'raised': 'var(--shadow-md)',
        'overlay': 'var(--shadow-lg)',
        'modal': 'var(--shadow-xl)',
      }
    },
  },
}
