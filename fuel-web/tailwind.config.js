export default {
    content: [
      "./app/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        fontFamily: {
          sans: ["var(--font-main)"],
          boxing: ['Boxing', 'serif'], clash: ['"Clash Grotesk"', 'sans-serif']
        },
      },
    },
    plugins: [],
  };