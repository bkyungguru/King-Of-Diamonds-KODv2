/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],
    theme: {
        extend: {
            fontFamily: {
                'heading': ['Cinzel', 'serif'],
                'body': ['Manrope', 'sans-serif'],
            },
            colors: {
                gold: {
                    DEFAULT: '#D4AF37',
                    light: '#F7E7CE',
                    dark: '#996515',
                },
                diamond: '#B9F2FF',
                obsidian: '#0A0A0A',
                platinum: '#E5E4E2',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' }
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' }
                },
                'fade-in': {
                    from: { opacity: '0', transform: 'translateY(20px)' },
                    to: { opacity: '1', transform: 'translateY(0)' }
                },
                'slide-in': {
                    from: { opacity: '0', transform: 'translateX(-20px)' },
                    to: { opacity: '1', transform: 'translateX(0)' }
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in': 'fade-in 0.5s ease-out forwards',
                'slide-in': 'slide-in 0.5s ease-out forwards'
            },
            backgroundImage: {
                'gold-gradient': 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 40%, #B38728 70%, #FBF5B7 100%)',
                'gold-text': 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 50%, #B38728 100%)',
            }
        }
    },
    plugins: [require("tailwindcss-animate")],
};
