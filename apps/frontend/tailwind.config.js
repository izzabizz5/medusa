/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        /* ── Medusa Palette (Flower Gradients) ── */
        void:       '#0d1614',
        deep:       '#1b3422',
        moss:       '#3d6b38',
        lime:       '#8fc832',
        chartreuse: '#b8e040',
        cream:      '#ede5cf',
        blush:      '#ddb8b8',
        coral:      '#d96858',
        lavender:   '#b8a8cc',
        violet:     '#7b6898',
        amber:      '#e89828',
        gold:       '#f0c040',
        /* Legacy — keep existing code from breaking */
        primary: { 50: '#fdf2f8', 100: '#fce7f3', 500: '#8fc832', 600: '#3d6b38', 700: '#1b3422' },
        danger:  { 500: '#d96858', 600: '#c05040' },
        success: { 500: '#8fc832', 600: '#3d6b38' },
      },
      fontFamily: {
        display:  ['Cormorant Garamond', 'Georgia', 'serif'],
        body:     ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono:     ['IBM Plex Mono', 'Courier New', 'monospace'],
        syne:     ['Syne', 'system-ui', 'sans-serif'],
        fraunces: ['Fraunces', 'Georgia', 'serif'],
        outfit:   ['Outfit', 'system-ui', 'sans-serif'],
        bebas:    ['Bebas Neue', 'Impact', 'sans-serif'],
        playfair: ['Playfair Display', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'grad-botanical': 'radial-gradient(ellipse at 30% 40%, #8fc832 0%, #1b3422 45%, #0d1614 100%)',
        'grad-twilight':  'radial-gradient(ellipse at 60% 30%, #b8a8cc 0%, #7b6898 40%, #0d1614 100%)',
        'grad-ember':     'radial-gradient(ellipse at 50% 60%, #e89828 0%, #d96858 40%, #1b3422 100%)',
        'grad-forest':    'linear-gradient(135deg, #0d1614 0%, #1b3422 30%, #3d6b38 60%, #8fc832 100%)',
        'grad-petal':     'linear-gradient(135deg, #ddb8b8 0%, #b8a8cc 50%, #7b6898 100%)',
        'grad-bloom':     'radial-gradient(ellipse at 20% 80%, #b8e040 0%, #8fc832 25%, #1b3422 60%, #0d1614 100%)',
      },
    },
  },
  plugins: [],
};
