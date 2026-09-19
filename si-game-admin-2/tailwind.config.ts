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
          '0%, 100%': { transform: 'scale(0)', opacity: '0' },
          '30%, 70%': { transform: 'scale(1)', opacity: '1' },
        },
        themeAppear: {
          '0%': { transform: 'translateY(0.6em) scale(0.92)', opacity: '0' },
          '100%': { transform: 'none', opacity: '1' },
        },
        selectQuestion: {
          '0%, 100%': {},
          '50%': { background: 'white' },
        },
        rotateText: {
          '0%': { transform: 'rotateY(0deg)', opacity: '1' },
          '48%': { opacity: '1' },
          '49%': { transform: 'rotateY(90deg)', opacity: '0' },
          '50%': { transform: 'rotateY(-90deg)' },
          '51%': { opacity: '0' },
          '52%': { opacity: '1' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        audioBar: {
          '0%, 100%': { transform: 'scaleY(0.25)' },
          '50%': { transform: 'scaleY(1)' },
        },
        audioRing: {
          '0%': { transform: 'scale(0.82)', opacity: '0.7' },
          '100%': { transform: 'scale(1.18)', opacity: '0' },
        },
      },
      animation: {
        selectQuestion: 'selectQuestion 200ms 3',
        themePulse: 'themePulse 1.6s linear infinite',
        themeAppear: 'themeAppear 450ms ease-out both',
        rotateText: 'rotateText 3s linear infinite',
        audioBar: 'audioBar 1.1s ease-in-out infinite',
        audioRing: 'audioRing 2.2s ease-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
