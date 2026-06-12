/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Note-role palette (shared by Fretboard, Piano, Legend)
        role: {
          root: "#ef4444", // red-500
          third: "#f59e0b", // amber-500
          fifth: "#3b82f6", // blue-500
          seventh: "#a855f7", // purple-500
          tension: "#10b981", // emerald-500
          color: "#ec4899", // pink-500 (modal characteristic)
          avoid: "#6b7280", // gray-500
        },
      },
    },
  },
  plugins: [],
};
