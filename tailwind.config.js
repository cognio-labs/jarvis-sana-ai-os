/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // Include if using App Router
  ],
  theme: {
    extend: {
      // Add custom theme extensions here
      // Example: colors, fonts, spacing
      colors: {
        'jarvis-primary': '#0f172a', // Dark blue/purple for JARVIS theme
        'jarvis-secondary': '#3b82f6', // Blue accent
        'jarvis-accent': '#6366f1',    // Purple accent
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      }
    },
  },
  plugins: [
  ],
  // Prefix for Tailwind CSS classes (optional)
  // prefix: 'tw-',
  // CorePlugins configuration (optional)
  // corePlugins: {
  //   preflight: false, // Disable Tailwind's base styles if you want full control
  // },
};
