/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        '5': '20rpx',
      },
      boxShadow: {
        'soft': '0 4rpx 12rpx rgba(0,0,0,0.05)',
      },
      colors: {
        'accent-blue': '#007AFF',
        'accent-green': '#34C759',
      }
    },
  },
  plugins: [],
}
