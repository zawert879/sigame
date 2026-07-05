import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'blue-extra': '#108ee9',
        'first-color-from': '#AF9307',
        'first-color-to': '#FDD306',
        'second-color-from': '#09979B',
        'second-color-to': '#0ACBD1',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      keyframes: {
        themePulse: {
          '0%, 100%': { fontSize: '0px' },
          '30%, 70%': { fontSize: 'calc(1em + 4vw)' },
        },
        selectQuestion: {
          '0%, 100%': {},
          '50%': { background: 'white' },
        },
        rotateText: {
          '0%': { transform: 'rotateY(0deg);', opacity: '1' },
          '48%': { opacity: '1' },
          '49%': { transform: 'rotateY(90deg);', opacity: '0' },
          '50%': { transform: 'rotateY(-90deg);' },
          '51%': { opacity: '0' },
          '52%': { opacity: '1' },
          '100%': { transform: 'rotateY(0deg);' },
        }
      },
      animation: {
        selectQuestion: 'selectQuestion 200ms 3',
        themePulse: 'themePulse 1.6s linear infinite',
        rotateText: 'rotateText 3s linear infinite'
      }
    },
  },
  plugins: [],
  corePlugins: {
    // preflight: false
  }
}
export default config
