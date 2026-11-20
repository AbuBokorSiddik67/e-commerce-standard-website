export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const;

export const PAYMENT_STATUSES = ["PENDING", "PAID", "REFUNDED", "FAILED"] as const;

export const ORDER_STATUS_LABELS: Record<string, { en: string; bn: string }> = {
  PENDING: { en: "Pending", bn: "অপেক্ষমাণ" },
  CONFIRMED: { en: "Confirmed", bn: "নিশ্চিত" },
  PACKED: { en: "Packed", bn: "প্যাক করা হয়েছে" },
  SHIPPED: { en: "Shipped", bn: "পাঠানো হয়েছে" },
  DELIVERED: { en: "Delivered", bn: "ডেলিভার হয়েছে" },
  CANCELLED: { en: "Cancelled", bn: "বাতিল করা হয়েছে" },
  RETURNED: { en: "Returned", bn: "ফেরত এসেছে" },
};

export const PAYMENT_STATUS_LABELS: Record<string, { en: string; bn: string }> = {
  PENDING: { en: "Unpaid", bn: "অর্থপ্রদান বাকি" },
  PAID: { en: "Paid", bn: "পরিশোধিত" },
  REFUNDED: { en: "Refunded", bn: "ফেরত দেওয়া হয়েছে" },
  FAILED: { en: "Failed", bn: "ব্যর্থ" },
};

export const BANGLADESH_DISTRICTS = [
  "Bagerhat", "Bandarban", "Barguna", "Barishal", "Bhola", "Bogura", "Brahmanbaria",
  "Chandpur", "Chattogram", "Chuadanga", "Comilla", "Cox's Bazar", "Dhaka", "Dinajpur",
  "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj", "Habiganj", "Jamalpur",
  "Jashore", "Jhalokati", "Jhenaidah", "Joypurhat", "Khagrachhari", "Khulna",
  "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur",
  "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", "Mymensingh",
  "Naogaon", "Narail", "Narayanganj", "Narsingdi", "Natore", "Nawabganj", "Netrokona",
  "Nilphamari", "Noakhali", "Pabna", "Panchagarh", "Patuakhali", "Pirojpur",
  "Rajbari", "Rajshahi", "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur",
  "Sirajganj", "Sunamganj", "Sylhet", "Tangail", "Thakurgaon",
] as const;

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "best_selling", label: "Best Selling" },
] as const;

export const ITEMS_PER_PAGE = 12;

export const HOMEPAGE_SECTIONS = [
  { key: "HERO", label: "Hero Banner", defaultActive: true, defaultOrder: 1 },
  { key: "TRUST_STRIP", label: "Trust Strip", defaultActive: true, defaultOrder: 2 },
  { key: "SHOP_BY_CATEGORY", label: "Shop by Category", defaultActive: true, defaultOrder: 3 },
  { key: "NEW_ARRIVALS", label: "New Arrivals", defaultActive: true, defaultOrder: 4 },
  { key: "BEST_SELLERS", label: "Best Sellers", defaultActive: true, defaultOrder: 5 },
  { key: "OFFER_BANNER", label: "Offer Banner", defaultActive: false, defaultOrder: 6 },
  { key: "FEATURED_COLLECTION", label: "Featured Collection", defaultActive: true, defaultOrder: 7 },
  { key: "WHY_SHOP", label: "Why Shop With Us", defaultActive: true, defaultOrder: 8 },
  { key: "REVIEWS", label: "Customer Reviews", defaultActive: true, defaultOrder: 9 },
  { key: "SOCIAL_FEED", label: "Social Feed", defaultActive: false, defaultOrder: 10 },
  { key: "NEWSLETTER_CTA", label: "Newsletter CTA", defaultActive: false, defaultOrder: 11 },
] as const;

export const IMAGE_MAX_SIZE = 4 * 1024 * 1024; // 4MB
export const IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export const RATE_LIMITS = {
  LOGIN: { max: 5, windowMs: 60_000 },
  REGISTER: { max: 3, windowMs: 60_000 },
  PASSWORD_RESET: { max: 3, windowMs: 60_000 },
  CHECKOUT: { max: 5, windowMs: 60_000 },
  REVIEW: { max: 3, windowMs: 60_000 },
} as const;
