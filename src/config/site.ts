export const DEFAULT_STORE_SETTINGS = {
  storeName: "ShopBD",
  logoUrl: null,
  faviconUrl: null,
  primaryColor: "#0F172A",
  secondaryColor: "#1E293B",
  accentColor: "#2563EB",
  buttonColor: "#2563EB",
  textColor: "#0F172A",
  backgroundColor: "#FFFFFF",
  fontFamily: "Inter",
  currencySymbol: "৳",
  contactPhone: "+880 1XXX-XXXXXX",
  contactEmail: "contact@shopbd.com",
  storeAddress: "Dhaka, Bangladesh",
  facebookUrl: null,
  instagramUrl: null,
  youtubeUrl: null,
  tiktokUrl: null,
  whatsappUrl: null,
  footerText: "Your trusted online store in Bangladesh. Quality products, fast delivery, cash on delivery available.",
  returnPolicy: "Products can be returned within 7 days of delivery if they are unused and in original packaging.",
  privacyPolicy: "We respect your privacy and never share your personal information with third parties.",
  termsConditions: "By placing an order, you agree to our terms and conditions.",
  shippingPolicy: "We deliver across Bangladesh within 2-5 business days depending on your location.",
  codEnabled: true,
  minOrderValue: null,
  socialShareImage: null,
} as const;

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Shop" },
  { href: "/track-order", label: "Track Order" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export const POLICY_PAGES = [
  { slug: "return-policy", label: "Return Policy", field: "returnPolicy" as const },
  { slug: "privacy-policy", label: "Privacy Policy", field: "privacyPolicy" as const },
  { slug: "terms-conditions", label: "Terms & Conditions", field: "termsConditions" as const },
  { slug: "shipping-policy", label: "Shipping Policy", field: "shippingPolicy" as const },
];

export const ADMIN_NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/admin/products", label: "Products", icon: "Package" },
  { href: "/admin/categories", label: "Categories", icon: "FolderTree" },
  { href: "/admin/orders", label: "Orders", icon: "ShoppingBag" },
  { href: "/admin/customers", label: "Customers", icon: "Users" },
  { href: "/admin/banners", label: "Banners", icon: "ImageIcon" },
  { href: "/admin/coupons", label: "Coupons", icon: "Ticket" },
  { href: "/admin/homepage", label: "Homepage", icon: "LayoutTemplate" },
  { href: "/admin/settings", label: "Settings", icon: "Settings" },
  { href: "/admin/reports", label: "Reports", icon: "BarChart3" },
];
