/**@type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,html}'],
    theme: {
        extend: {
            fontFamily: {
                display: ['"Cormorant Garamond"', 'ui-serif', 'serif'],
            },
        },
    },
    plugins: [require('daisyui')],
    daisyui: {
        themes: ['valentine'],
    },
}
