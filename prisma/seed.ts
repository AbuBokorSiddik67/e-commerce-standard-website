import { BANGLADESH_DISTRICTS } from "../src/lib/constants";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (process.env.NODE_ENV === "production" || process.env.SHOPBD_ALLOW_DEMO_SEED !== "1" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !/^\/shopbd_(?:dev|demo|security_test)$/.test(url.pathname)) {
    throw new Error("Demo seed requires explicit opt-in and a disposable loopback shopbd_dev, shopbd_demo or shopbd_security_test database");
  }
  console.log("Seeding demo database (no admin credentials)...");

  // Store settings (singleton)
  await prisma.storeSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      storeName: "ShopBD",
      primaryColor: "#0F172A",
      secondaryColor: "#1E293B",
      accentColor: "#2563EB",
      buttonColor: "#2563EB",
      textColor: "#0F172A",
      backgroundColor: "#FFFFFF",
      fontFamily: "Inter",
      currencySymbol: "৳",
      contactPhone: "+880 1700-000000",
      contactEmail: "contact@shopbd.com",
      storeAddress: "Dhaka, Bangladesh",
      footerText: "Your trusted online store in Bangladesh. Quality products, fast delivery, cash on delivery available.",
      returnPolicy: "Products can be returned within 7 days of delivery if unused and in original packaging.",
      privacyPolicy: "We respect your privacy and never share your personal information with third parties.",
      termsConditions: "By placing an order, you agree to our terms and conditions.",
      shippingPolicy: "We deliver across Bangladesh within 2-5 business days depending on your location.",
      codEnabled: true,
    },
  });
  console.log("Store settings created");

  // Delivery zones
  await prisma.deliveryZone.create({
    data: { name: "Inside Dhaka", districts: ["Dhaka"], charge: 60, estimatedDays: "1-2 days", isActive: true },
  });
  await prisma.deliveryZone.create({
    data: { name: "Outside Dhaka", districts: BANGLADESH_DISTRICTS.filter((district) => district !== "Dhaka"), charge: 120, estimatedDays: "3-5 days", isActive: true },
  });
  console.log("Delivery zones created");

  // Categories
  const studyCat = await prisma.category.create({
    data: { name: "Study Essentials", slug: "study-essentials", showOnHome: true, sortOrder: 1, isActive: true },
  });
  const officeCat = await prisma.category.create({
    data: { name: "Office Supplies", slug: "office-supplies", showOnHome: true, sortOrder: 2, isActive: true },
  });
  const techCat = await prisma.category.create({
    data: { name: "Tech Accessories", slug: "tech-accessories", showOnHome: true, sortOrder: 3, isActive: true },
  });
  const giftCat = await prisma.category.create({
    data: { name: "Gift Items", slug: "gift-items", showOnHome: true, sortOrder: 4, isActive: true },
  });
  console.log("Categories created");

  // Products
  const products = [
    {
      name: "Premium Leather Notebook A5",
      slug: "premium-leather-notebook-a5",
      shortDesc: "Genuine leather cover, 200 dotted pages",
      description: "A premium A5 notebook with genuine leather cover, 200 dotted pages, ribbon bookmark, and elastic closure. Perfect for journaling, note-taking, and planning.",
      price: 850,
      compareAtPrice: 1200,
      costPrice: 450,
      stock: 50,
      isFeatured: true,
      images: ["/uploads/products/premium-leather-notebook-a5.jpg"],
      categories: [studyCat.id, officeCat.id],
    },
    {
      name: "Minimalist Desk Planner 2026",
      slug: "minimalist-desk-planner-2026",
      shortDesc: "Daily, weekly & monthly planner",
      description: "A minimalist desk planner for 2026 with daily, weekly, and monthly sections. Hardcover, lay-flat binding, and premium paper.",
      price: 1200,
      compareAtPrice: 1500,
      costPrice: 600,
      stock: 30,
      isFeatured: true,
      images: ["/uploads/products/minimalist-desk-planner-2026.jpg"],
      categories: [studyCat.id, officeCat.id],
    },
    {
      name: "Wireless Mouse Silent Click",
      slug: "wireless-mouse-silent-click",
      shortDesc: "2.4GHz, USB receiver, 18-month battery",
      description: "Ultra-quiet wireless mouse with 2.4GHz connectivity, USB nano receiver, and up to 18 months battery life. Ergonomic design for comfortable use.",
      price: 650,
      compareAtPrice: 900,
      costPrice: 350,
      stock: 80,
      isFeatured: false,
      images: ["/uploads/products/wireless-mouse-silent-click.jpg"],
      categories: [techCat.id],
    },
    {
      name: "Stainless Steel Water Bottle 500ml",
      slug: "stainless-steel-water-bottle-500ml",
      shortDesc: "Insulated, keeps cold 24h / hot 12h",
      description: "Double-wall insulated stainless steel water bottle. Keeps drinks cold for 24 hours and hot for 12 hours. 500ml capacity, leak-proof lid.",
      price: 550,
      compareAtPrice: 750,
      costPrice: 280,
      stock: 100,
      isFeatured: true,
      images: ["/uploads/products/stainless-steel-water-bottle-500ml.jpg"],
      categories: [giftCat.id],
    },
    {
      name: "Set of 6 Gel Pens Black",
      slug: "set-of-6-gel-pens-black",
      shortDesc: "0.5mm, smooth writing, quick-dry ink",
      description: "Set of 6 black gel pens with 0.5mm tip. Smooth writing, quick-dry ink, comfortable grip. Ideal for exams and daily writing.",
      price: 180,
      compareAtPrice: 250,
      costPrice: 90,
      stock: 200,
      isFeatured: false,
      images: ["/uploads/products/set-of-6-gel-pens-black.jpg"],
      categories: [studyCat.id],
    },
    {
      name: "Desk Organizer Wood",
      slug: "desk-organizer-wood",
      shortDesc: "Bamboo, 5 compartments",
      description: "Natural bamboo desk organizer with 5 compartments for pens, scissors, rulers, and other office supplies. Eco-friendly and durable.",
      price: 750,
      compareAtPrice: 1000,
      costPrice: 380,
      stock: 40,
      isFeatured: false,
      images: ["/uploads/products/desk-organizer-wood.jpg"],
      categories: [officeCat.id],
    },
    {
      name: "USB-C Fast Charger 20W",
      slug: "usb-c-fast-charger-20w",
      shortDesc: "PD 3.0, compatible with iPhone & Android",
      description: "20W USB-C power delivery fast charger. Compatible with iPhone 12+ and Android devices. Compact design with safety protection.",
      price: 480,
      compareAtPrice: 650,
      costPrice: 220,
      stock: 60,
      isFeatured: false,
      images: ["/uploads/products/usb-c-fast-charger-20w.jpg"],
      categories: [techCat.id],
    },
    {
      name: "Gift Box Set - Stationery",
      slug: "gift-box-set-stationery",
      shortDesc: "Notebook + pen + bookmark gift set",
      description: "Beautifully packaged gift box containing an A5 notebook, premium pen, and leather bookmark. Perfect gift for students and professionals.",
      price: 1100,
      compareAtPrice: 1400,
      costPrice: 550,
      stock: 25,
      isFeatured: true,
      images: ["/uploads/products/gift-box-set-stationery.jpg"],
      categories: [giftCat.id, studyCat.id],
    },
  ];

  for (const p of products) {
    const { categories: catIds, images: imgs, ...data } = p;
    const product = await prisma.product.create({
      data: {
        ...data,
        price: data.price as any,
        compareAtPrice: (data.compareAtPrice ?? null) as any,
        costPrice: (data.costPrice ?? null) as any,
        categories: { connect: catIds.map((id: string) => ({ id })) },
        images: {
          create: imgs.map((url: string, i: number) => ({
            url,
            altText: p.name,
            sortOrder: i,
          })),
        },
      },
    });
    console.log("Product created:", product.name);
  }

  // Homepage sections
  const sections = [
    { sectionKey: "HERO", title: "Premium Study & Office Essentials", subtitle: "Curated stationery, planners and productivity tools for focused students.", isActive: true, sortOrder: 1, settings: { primaryCtaText: "Shop Best Sellers", primaryCtaLink: "/products?sort=best_selling", secondaryCtaText: "", secondaryCtaLink: "" } },
    { sectionKey: "TRUST_STRIP", title: null, subtitle: null, isActive: true, sortOrder: 2, settings: { items: [{ icon: "Truck", title: "Fast Delivery", desc: "Across Bangladesh" }, { icon: "Banknote", title: "Cash on Delivery", desc: "Pay when you receive" }, { icon: "RotateCcw", title: "Easy Returns", desc: "7-day return policy" }, { icon: "ShieldCheck", title: "100% Authentic", desc: "Quality checked" }] } },
    { sectionKey: "SHOP_BY_CATEGORY", title: "Shop by Category", subtitle: "Browse our curated collections", isActive: true, sortOrder: 3, categoryIds: [studyCat.id, officeCat.id, techCat.id, giftCat.id], settings: { limit: 6 } },
    { sectionKey: "NEW_ARRIVALS", title: "New Arrivals", subtitle: "Latest products in our store", isActive: true, sortOrder: 4, settings: { limit: 8, viewAllText: "View All", viewAllHref: "/products?sort=newest" } },
    { sectionKey: "BEST_SELLERS", title: "Best Sellers", subtitle: "Our most popular products", isActive: true, sortOrder: 5, settings: { limit: 8, viewAllText: "View All", viewAllHref: "/products?sort=best_selling" } },
    { sectionKey: "OFFER_BANNER", title: null, subtitle: null, isActive: false, sortOrder: 6, settings: {} },
    { sectionKey: "FEATURED_COLLECTION", title: "Featured Collection", subtitle: "Handpicked favorites", isActive: true, sortOrder: 7, settings: { limit: 4, viewAllText: "View All", viewAllHref: "/products" } },
    { sectionKey: "WHY_SHOP", title: "Why Shop With Us", subtitle: null, isActive: true, sortOrder: 8, settings: { items: [{ icon: "PackageCheck", title: "Quality Checked", desc: "Every product is inspected before shipping" }, { icon: "Truck", title: "Nationwide Delivery", desc: "We deliver to all 64 districts" }, { icon: "Banknote", title: "Cash on Delivery", desc: "Pay only when you receive your order" }, { icon: "Headset", title: "Customer Support", desc: "Responsive support via WhatsApp" }] } },
    { sectionKey: "REVIEWS", title: "Customer Reviews", subtitle: "What our customers say", isActive: true, sortOrder: 9, settings: { limit: 6 } },
    { sectionKey: "SOCIAL_FEED", title: null, subtitle: null, isActive: false, sortOrder: 10, settings: {} },
    { sectionKey: "NEWSLETTER_CTA", title: null, subtitle: null, isActive: false, sortOrder: 11, settings: {} },
  ];

  for (const s of sections) {
    await prisma.homepageSection.create({
      data: {
        sectionKey: s.sectionKey as any,
        title: s.title,
        subtitle: s.subtitle,
        isActive: s.isActive,
        sortOrder: s.sortOrder,
        settings: s.settings as any,
        categoryIds: s.categoryIds ?? [],
        productIds: [],
      },
    });
  }
  console.log("Homepage sections created");

  // A coupon
  await prisma.coupon.create({
    data: {
      code: "WELCOME10",
      type: "PERCENTAGE",
      value: 10,
      minOrderAmount: 500,
      isActive: true,
    },
  });
  console.log("Coupon created: WELCOME10");

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
