export type SafeProduct = {
  id: string;
  name: string;
  slug: string;
  shortDesc: string | null;
  description: string | null;
  price: string;
  compareAtPrice: string | null;
  costPrice: string | null;
  sku: string | null;
  stock: number;
  lowStockThreshold: number;
  isFeatured: boolean;
  isActive: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  weightGrams: number | null;
  images: { id: string; url: string; altText: string | null; sortOrder: number }[];
  variants: {
    id: string;
    name: string;
    value: string;
    sku: string | null;
    price: string | null;
    stock: number;
  }[];
  categories: { id: string; name: string; slug: string }[];
  _count?: { reviews: number };
};

export type SafeCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  showOnHome: boolean;
  sortOrder: number;
  isActive: boolean;
  _count?: { products: number };
};

export type SafeOrder = {
  id: string;
  orderNumber: string;
  fullName: string;
  phone: string;
  email: string | null;
  shippingAddress: string;
  district: string;
  city: string;
  postalCode: string | null;
  subtotal: string;
  discount: string;
  deliveryCharge: string;
  total: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  customerNotes: string | null;
  adminNotes: string | null;
  placedAt: string;
  deliveredAt: string | null;
  items: {
    id: string;
    name: string;
    sku: string | null;
    variant: string | null;
    price: string;
    quantity: number;
    lineTotal: string;
    product: { id: string; name: string; slug: string } | null;
  }[];
};

export type StoreSettings = {
  storeName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  buttonColor: string;
  textColor: string;
  backgroundColor: string;
  fontFamily: string;
  currencySymbol: string;
  contactPhone: string | null;
  contactEmail: string | null;
  storeAddress: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  whatsappUrl: string | null;
  footerText: string | null;
  returnPolicy: string | null;
  privacyPolicy: string | null;
  termsConditions: string | null;
  shippingPolicy: string | null;
  codEnabled: boolean;
  minOrderValue: string | null;
  socialShareImage: string | null;
};

export type SafeBanner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  image: string;
  position: string;
  sortOrder: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
};

export type SafeCoupon = {
  id: string;
  code: string;
  type: string;
  value: string;
  minOrderAmount: string | null;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
};

export type SafeHomepageSection = {
  id: string;
  sectionKey: string;
  title: string | null;
  subtitle: string | null;
  isActive: boolean;
  sortOrder: number;
  settings: Record<string, unknown> | null;
  productIds: string[];
  categoryIds: string[];
  startDate: string | null;
  endDate: string | null;
};

export type SafeDeliveryZone = {
  id: string;
  name: string;
  charge: string;
  estimatedDays: string | null;
  isActive: boolean;
};

export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  quantity: number;
  variantId?: string;
  variantName?: string;
  maxStock: number;
};
