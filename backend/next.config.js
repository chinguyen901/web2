/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/ui/homepage.html" },
        { source: "/homepage", destination: "/ui/homepage.html" },
        { source: "/products", destination: "/ui/product-listing.html" },
        { source: "/product/:id", destination: "/ui/product-detail.html" },
        { source: "/product-detail", destination: "/ui/product-detail.html" },
        { source: "/cart", destination: "/ui/cart.html" },
        { source: "/checkout", destination: "/ui/checkout.html" },
        { source: "/login", destination: "/ui/login-register.html" },
        { source: "/register", destination: "/ui/login-register.html" },
        { source: "/profile", destination: "/ui/user-profile.html" }
      ],
      afterFiles: [],
      fallback: []
    };
  }
};

module.exports = nextConfig;
