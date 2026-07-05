/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
      },
      colors: {
        // Base Identity Colors
        'logo-rose': '#D2969E', // Core brand identifier - main top-navigation active links, category divider lines, primary brand icons (shopping bag, user profile)
        'logo-black': '#000000', // Anchor - primary body text, main product titles, primary footer backgrounds
        // Functional UI Palette
        'bg-silk-glow': '#FFF5F6', // Main site background - luminous warm white canvas for the entire store
        'action-bordeaux': '#5C061E', // Primary CTA - "Add to Cart", "Buy Now", "Proceed to Checkout" buttons
        'pop-orchid': '#B83280', // Urgency & Highlights - "New Arrivals", "Trending Now" badges, promotional countdown timers, flash sale banners
        'energy-apricot': '#F6AD55', // Discounts & Seasons - "Sale" tags, percentage-off bubbles, summer/spring capsule collections
        'luxury-gold': '#D4AF37', // Premium Accents - loyalty rewards icons, VIP tier badges, "Premium Quality" stamps, star ratings
        'spark-flamingo': '#FF8A9A', // Micro-Interactions & States - wishlist heart icon when clicked, hover states on secondary buttons, notification dots
      }
    },
  },
  plugins: [],
}
