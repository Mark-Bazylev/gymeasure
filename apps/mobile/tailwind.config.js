/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#0B1F17",
        moss: "#1F6F4A",
        leaf: "#3DDC97",
        sand: "#F2EDE4",
        ember: "#E4572E",
      },
    },
  },
  plugins: [],
};
