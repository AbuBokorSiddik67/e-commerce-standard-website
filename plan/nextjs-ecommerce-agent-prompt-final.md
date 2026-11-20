# AI Agent Prompt: Build a Custom Next.js E-commerce Store

## Role

You are a senior full-stack engineer and product designer. Build a production-ready, secure, modular, and visually attractive e-commerce website for a small Bangladeshi online store.

The primary business owner must be able to control the entire storefront from an Admin Dashboard, including logo, brand colors, store name, homepage content, products, categories, banners, delivery charges, and store policies.

Do not build unnecessary enterprise features in version 1. Focus on a clean, fast, mobile-first, conversion-focused MVP.

## Business Context

- Country: Bangladesh.
- Language: The user interface should support Bangla and English where appropriate. Use Bangla for customer-facing labels by default unless otherwise specified.
- Currency: BDT (৳).
- Payment method for version 1: Cash on Delivery (COD) only.
- Do not integrate bKash, Nagad, SSLCommerz, Stripe, or any other online payment gateway yet.
- Delivery: Manual delivery management in version 1. Do not integrate courier APIs yet.
- The owner is an ACCA student and values clear accounting, profit tracking, order management, and simple business controls.

## Required Tech Stack

Use exactly this stack:

- Next.js App Router with TypeScript.
- React Server Components where appropriate.
- Tailwind CSS for styling.
- shadcn/ui components for accessible, modern UI.
- PostgreSQL database hosted on Neon.
- Prisma ORM.
- NextAuth/Auth.js for admin authentication.
- Zod for request and form validation.
- Zustand for lightweight client-side cart state if needed.
- React Hook Form for forms.
- Cloudinary or UploadThing for product and banner image uploads.
- Vercel for deployment.
- ESLint, Prettier, and TypeScript strict mode.

Do not use unsupported, deprecated, or invented packages. If a package is needed, choose a widely used, maintained package and explain the choice.

## Project Requirements

### 1. Modular Architecture

Create a clean, modular project structure. Separate concerns clearly:

```text
src/
  app/
    (customer)/
      page.tsx
      products/
      product/[slug]/
      cart/
      checkout/
      order-success/
      track-order/
      about/
      contact/
      policies/
    admin/
      layout.tsx
      login/
      dashboard/
      products/
      categories/
      orders/
      customers/
      banners/
      coupons/
      settings/
      homepage/
      reports/
    api/
  components/
    ui/
    customer/
    admin/
    shared/
  lib/
    prisma.ts
    auth.ts
    utils.ts
    validations/
    constants.ts
  server/
    services/
    repositories/
    actions/
  hooks/
  types/
  config/
prisma/
  schema.prisma
public/
```

Rules:

- Keep business logic out of React components.
- Use server actions or API route handlers for mutations.
- Use service/repository functions for database operations.
- Use Zod validation on both client forms and server inputs.
- Never expose database details, secrets, internal IDs, or admin-only data to the client.
- Use environment variables for all secrets.
- Do not hardcode credentials, API keys, database URLs, or admin passwords.

### 2. Database Schema

Use Prisma with PostgreSQL. Create a normalized, scalable schema.

Required models:

- `StoreSetting`
- `User`
- `AdminUser` or role-based `User`
- `Customer`
- `Product`
- `ProductImage`
- `ProductVariant`
- `Category`
- `Collection` or `Tag`
- `Banner`
- `HomepageSection`
- `Cart` and `CartItem` if server-side cart is used
- `Order`
- `OrderItem`
- `Coupon`
- `Review`
- `WishlistItem`
- `Address`
- `DeliveryZone`
- `AuditLog`

Include fields such as:

- Product: name, slug, description, short description, price, compare-at price, cost price, SKU, stock, isFeatured, isActive, SEO title, SEO description, images, categories, variants.
- Order: order number, customer info, shipping address, subtotal, discount, delivery charge, total, payment method, payment status, order status, notes, placed-at, delivered-at.
- Order status: `PENDING`, `CONFIRMED`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED`.
- StoreSetting: store name, logo URL, favicon URL, primary color, secondary color, accent color, font choice, contact phone, email, address, social links, homepage hero content, footer text, policy pages, delivery charge settings, COD enabled flag.
- HomepageSection: section key, title, subtitle, image, CTA text, CTA link, display order, isActive, settings JSON, selected products/categories, start date, end date.

Use database enums where appropriate. Add indexes for slug, order number, email, phone, product status, and order status.

Use Prisma migrations. Seed only demo/sample data if explicitly requested.

## Customer-Facing Features

Build a beautiful, responsive, mobile-first storefront.

### Homepage

- Dynamic hero banner controlled from Admin.
- Featured products.
- New arrivals.
- Best-selling products.
- Category showcase.
- Promotional banners.
- Newsletter signup.
- Customer testimonials, optional.
- Footer with contact info, policies, and social links.

### Product Experience

- Product listing page with category, price, availability, and search filters.
- Product sorting: newest, price low to high, price high to low, best selling.
- Pagination or infinite scroll.
- Product detail page with image gallery, price, discount, stock status, description, specifications, variants, related products, and reviews.
- Add to cart.
- Quantity selector.
- Out-of-stock handling.
- Wishlist.
- Product reviews and ratings.
- Related products.

### Cart and Checkout

- Cart page with quantity update, remove item, subtotal, discount, and estimated delivery charge.
- Coupon code field.
- Checkout form with:
  - Full name.
  - Phone number.
  - Email, optional.
  - Full address.
  - District, city/area, postal code.
  - Delivery zone.
  - Order notes.
- COD-only checkout.
- Order summary.
- Order placement confirmation.
- Order success page with order number.
- Order tracking page using order number and phone number.
- Guest checkout must be supported.

### Customer Account

- Register and login using email/password.
- Google login is optional; do not add it unless explicitly required.
- Profile page.
- Address book.
- Order history.
- Order details.
- Wishlist.
- Password reset flow.

## Homepage Design and Sections

Build a beautiful, modern, premium, mobile-first homepage. The homepage must feel trustworthy, clean, and conversion-focused. Avoid a cluttered layout; use generous whitespace, strong typography, clear hierarchy, and high-quality product imagery.

The homepage must be fully controlled from the Admin Dashboard. The owner must be able to change section visibility, section order, titles, subtitles, images, CTAs, featured products, categories, banners, and colors without editing code.

Use Next.js ISR or revalidation for homepage content so updates from Admin appear without requiring a full manual redeploy.

### Homepage Section Order

Use this default section order:

1. Header
2. Hero Banner
3. Trust Strip
4. Shop by Category
5. New Arrivals
6. Best Sellers
7. Offer / Campaign Banner
8. Featured Collection
9. Why Shop With Us
10. Customer Reviews
11. Instagram / Social Feed
12. Newsletter / WhatsApp CTA
13. Footer

For the MVP, implement sections 1, 2, 3, 4, 5, 6, 8, 9, 10, and 13. Sections 7, 11, and 12 should be built as reusable, admin-controlled components but can remain disabled by default.

### Header

Create a sticky, responsive header with:

- Store logo.
- Store name, optional.
- Main navigation: Home, Shop, Categories, About, Contact, Track Order.
- Search icon and expanding search bar.
- Wishlist icon.
- Cart icon with item count.
- Account icon.
- Mobile hamburger menu.
- Mobile bottom navigation with Home, Categories, Cart, Account.

The header must remain readable on mobile and must not overlap page content.

### 1. Hero Banner

The hero is the first section visitors see. It must communicate what the store sells and why customers should buy within five seconds.

Include:

- Large, high-quality background or product image.
- Benefit-driven headline.
- Short supporting subtitle.
- One primary CTA button.
- Optional secondary CTA button.
- Optional product image or lifestyle image.
- Mobile-optimized layout.

Example content:

```text
Premium Study & Office Essentials
Curated stationery, planners and productivity tools for focused students.

[ Shop Best Sellers ]
```

Admin-controllable fields:

- Hero image.
- Headline.
- Subtitle.
- Primary button text.
- Primary button link.
- Secondary button text.
- Secondary button link.
- Text alignment.
- Overlay opacity.
- Active/inactive toggle.

### 2. Trust Strip

Place a compact trust strip directly below the hero.

Show 3–4 short trust points using icons:

- Cash on Delivery available.
- Fast delivery across Bangladesh.
- Easy return policy.
- 100% authentic products.
- Responsive customer support.

Admin-controllable fields:

- Trust item icon.
- Trust item title.
- Trust item description.
- Show/hide each item.
- Section active/inactive toggle.

Only display claims that are true for the business.

### 3. Shop by Category

Show 3–6 category tiles. This helps returning customers quickly find what they need.

Each category tile must include:

- Category image.
- Category name.
- Optional product count.
- Hover effect.
- Clickable link to the category page.

Example categories:

- Study Essentials.
- Office Supplies.
- Tech Accessories.
- Gift Items.
- New Arrivals.
- Best Sellers.

Admin-controllable fields:

- Select categories.
- Set category display order.
- Show/hide section.
- Section title and subtitle.
- Number of categories to display.

### 4. New Arrivals

Show 4–8 newest products in a responsive product grid.

Each product card must include:

- Product image with hover image swap, if a second image exists.
- Product name.
- Price.
- Compare-at price and discount badge, if applicable.
- “New” badge.
- Stock status.
- Add to Cart button.
- Quick view button.
- Wishlist icon.

Admin-controllable fields:

- Number of products.
- Section title and subtitle.
- “View All” link.
- Section active/inactive toggle.

### 5. Best Sellers

Show 4–8 best-selling products.

Each product card must include:

- Product image.
- Product name.
- Price.
- Discount badge, if applicable.
- Best Seller / Trending / Limited Stock badge.
- Add to Cart button.
- Quick view button.
- Wishlist icon.

Admin-controllable fields:

- Select products manually or use automatic best-selling logic.
- Number of products.
- Section title and subtitle.
- “View All” link.
- Section active/inactive toggle.

### 6. Offer / Campaign Banner

Add one large promotional banner in the middle of the homepage.

Example:

```text
Back to School Sale
Up to 20% off on selected study essentials

[ Shop the Offer ]
```

Admin-controllable fields:

- Banner image.
- Title.
- Subtitle.
- CTA text.
- CTA link.
- Start date.
- End date.
- Display order.
- Active/inactive toggle.

The banner must automatically hide after its end date.

### 7. Featured Collection

Show a curated collection with 4–8 products.

Examples:

- Exam Season Essentials.
- Desk Setup.
- Gifts Under ৳1000.
- New Student Bundle.

Admin-controllable fields:

- Collection title.
- Collection description.
- Select collection or products.
- Number of products.
- “View Collection” button text and link.
- Section active/inactive toggle.

### 8. Why Shop With Us

Show 3–4 business benefits using icons and short descriptions.

Possible benefits:

- Quality-checked products.
- Cash on Delivery.
- Fast nationwide delivery.
- Easy returns.
- Secure ordering.
- Responsive customer support.

Admin-controllable fields:

- Benefit icon.
- Benefit title.
- Benefit description.
- Display order.
- Show/hide each benefit.
- Section active/inactive toggle.

### 9. Customer Reviews

Show real customer reviews only. Do not create fake reviews.

Each review card must include:

- Customer name.
- City, optional.
- Star rating.
- Short review text.
- Product image, optional.
- Verified purchase badge, optional.

Admin-controllable fields:

- Approve or reject reviews.
- Feature selected reviews on homepage.
- Set number of reviews.
- Section title and subtitle.
- Section active/inactive toggle.

If there are no approved reviews, hide this section automatically.

### 10. Instagram / Social Feed

This section is optional and disabled by default.

It can display:

- Instagram posts.
- Reels.
- Customer photos.
- Latest social content.
- “Follow us” CTA.

Admin-controllable fields:

- Instagram profile link.
- Embedded posts or manually curated images.
- Section title and subtitle.
- Section active/inactive toggle.

### 11. Newsletter / WhatsApp CTA

Create a simple section to bring customers back.

Example:

```text
Get new arrivals & exclusive offers
Join our WhatsApp community or subscribe for updates.

[ Join WhatsApp ]  [ Subscribe ]
```

Admin-controllable fields:

- Title.
- Subtitle.
- WhatsApp number/link.
- Email subscription form.
- Consent checkbox.
- Success and error messages.
- Section active/inactive toggle.

Store email/phone subscriptions securely. Do not send marketing messages without proper consent.

### Footer

Create a complete, responsive footer with:

- Logo and short brand description.
- Quick links: Home, Shop, Categories, About, Contact, Track Order.
- Customer links: Return Policy, Privacy Policy, Terms and Conditions, Shipping Policy.
- Contact information: phone, email, address.
- Social media icons.
- Delivery and payment information.
- Copyright text.

Admin-controllable fields:

- Footer description.
- Footer links.
- Contact information.
- Social links.
- Copyright text.
- Policy page content.

## Homepage UI Rules

- Use a clean, premium, minimal design.
- Use white or off-white background with strong brand accent colors.
- Use rounded corners, subtle shadows, and consistent spacing.
- Use large, readable typography.
- Use high-contrast CTA buttons.
- Use responsive grids: 2 columns on mobile, 3–4 columns on tablet, 4–6 columns on desktop where appropriate.
- Use Next.js Image for optimized images.
- Add skeleton loading states.
- Add empty states when no products, banners, or reviews exist.
- Ensure every section works properly on mobile, tablet, and desktop.
- Do not use fake reviews, fake sales counters, or misleading claims.

## Homepage Admin Controls

Create a `Homepage Settings` area in the Admin Dashboard where the owner can:

- Reorder homepage sections using drag-and-drop or up/down controls.
- Show or hide any section.
- Edit section titles and subtitles.
- Upload or replace images.
- Select featured products and categories.
- Edit CTA text and links.
- Set section display limits.
- Save changes with validation and success feedback.
- Preview changes before publishing, optional.
- Maintain an audit log of homepage changes.

The homepage must never break if a section is disabled, an image is missing, a product is deleted, or a category is empty.

## Admin Dashboard Features

The Admin Dashboard must be secure, clean, and easy to use. Only authenticated users with the `ADMIN` role can access it.

### Branding and Store Settings

The owner must be able to change the following from the Admin Dashboard without touching code:

- Store name.
- Logo.
- Favicon.
- Primary brand color.
- Secondary brand color.
- Accent color.
- Button color.
- Text color.
- Background color.
- Font family.
- Contact phone.
- Contact email.
- Store address.
- Facebook, Instagram, YouTube, TikTok, and WhatsApp links.
- Hero banner title, subtitle, button text, button link, and banner image.
- Homepage section visibility and order.
- Footer text.
- Return policy.
- Privacy policy.
- Terms and conditions.
- Shipping policy.
- COD availability.
- Minimum order value, optional.
- Delivery charges by zone.
- Currency symbol.
- Social sharing image.

Apply the selected colors and fonts dynamically across the entire customer-facing website using CSS variables and Tailwind theme configuration.

### Product Management

- Create, read, update, delete products.
- Product images with drag-and-drop upload and reordering.
- Product categories.
- Product tags/collections.
- Product variants: size, color, weight, SKU, price, stock.
- Regular price and sale price.
- Cost price for profit calculation.
- Stock quantity.
- Low-stock alert threshold.
- Featured product toggle.
- Active/inactive product toggle.
- SEO title and meta description.
- Product slug auto-generation with manual override.
- Bulk actions: activate, deactivate, delete, change category.
- Product search and filters.

### Category Management

- Create, edit, delete categories.
- Parent and child categories.
- Category image.
- Category slug.
- Category description.
- Show/hide category on homepage.
- Sort order.

### Order Management

- View all orders.
- Filter by status, date, customer, and payment method.
- Search by order number, phone number, or customer name.
- View order details.
- Update order status.
- Add internal admin notes.
- Cancel order with reason.
- Mark order as delivered.
- Generate/print invoice.
- Send customer notification manually, optional.
- Prevent unauthorized order status changes.

### Customer Management

- View customers.
- View customer order history.
- Search customers.
- Block/unblock customer.
- View total orders and total spend.

### Coupon Management

- Create percentage or fixed-amount coupons.
- Set minimum order amount.
- Set usage limit.
- Set expiry date.
- Activate/deactivate coupon.
- Apply coupon only during checkout.

### Banner Management

- Create homepage banners.
- Upload banner image.
- Set title, subtitle, CTA text, and CTA link.
- Set banner position.
- Set active/inactive.
- Set display order.

### Reports and Analytics

Show simple, useful business reports:

- Today, last 7 days, last 30 days, and custom-date sales.
- Total orders.
- Pending, delivered, cancelled, and returned orders.
- Revenue.
- Estimated profit using product cost price.
- Best-selling products.
- Low-stock products.
- Order status breakdown.
- Top customers.
- Sales by category.
- Export orders to CSV.

## UI/UX Requirements

Create a modern, premium, trustworthy, and conversion-focused UI.

- Mobile-first responsive design.
- Clean whitespace and strong visual hierarchy.
- Professional typography.
- Consistent spacing, border radius, shadows, and color usage.
- Accessible color contrast.
- Sticky header with logo, navigation, search, cart, and account.
- Mobile bottom navigation or mobile menu.
- Fast-loading image optimization using Next.js Image.
- Skeleton loading states.
- Empty states.
- Clear error messages.
- Toast notifications for successful or failed actions.
- Confirmation dialogs before destructive actions.
- Admin dashboard should use a sidebar layout with clear navigation.
- Customer storefront should feel friendly, premium, and easy to navigate.
- Do not use overly generic or ugly default templates.

## Security Requirements

Treat security as a first-class requirement. Do not create security loopholes.

### Authentication and Authorization

- Use NextAuth/Auth.js.
- Hash passwords using bcrypt or Argon2.
- Use secure HTTP-only, SameSite cookies.
- Protect every `/admin` route with server-side session and role checks.
- Protect every admin API route, server action, and database mutation with authorization checks.
- Use role-based access control.
- Never trust client-side role claims.
- Never expose admin-only endpoints publicly.
- Prevent IDOR: verify that the authenticated user owns the resource before allowing access.
- Prevent privilege escalation: a customer must never be able to become an admin through API input.
- Add rate limiting to login, registration, password reset, and sensitive API endpoints.
- Add CSRF protection for state-changing requests.
- Add secure password reset with single-use, time-limited tokens.

### Input and Data Security

- Validate every input with Zod.
- Sanitize user-generated content.
- Prevent SQL injection by using Prisma parameterized queries.
- Prevent XSS by avoiding raw HTML rendering unless properly sanitized.
- Validate uploaded files: allowed image types, maximum file size, safe filenames, and malware-safe processing.
- Do not allow arbitrary file types.
- Store uploaded images in Cloudinary/UploadThing, not the local filesystem.
- Use server-side validation for price, stock, coupon, and delivery charge. Never trust client-side totals.
- Recalculate all order totals on the server.
- Prevent negative quantities, negative prices, invalid coupons, and stock overselling.
- Use database transactions for order creation and stock deduction.
- Prevent duplicate order submission using idempotency keys or a unique order reference.
- Log important admin actions in an audit log: product changes, order status changes, settings changes, and login events.
- Do not log passwords, tokens, card data, or sensitive personal information.

### Environment and Deployment

- Use `.env.example` with all required variables.
- Never commit `.env` files.
- Use strong database connection security.
- Enable HTTPS in production.
- Set secure security headers.
- Add rate limiting.
- Add error monitoring hooks, optional.
- Add basic SEO: metadata, sitemap, robots.txt, Open Graph tags, canonical URLs, and structured data for products.

## COD Order Flow

Implement this exact flow:

1. Customer adds product to cart.
2. Customer opens checkout.
3. Customer provides delivery information.
4. System calculates subtotal, discount, delivery charge, and total on the server.
5. Customer selects COD.
6. System validates stock and coupon.
7. System creates the order in a database transaction.
8. System reduces product stock.
9. System shows order success page with order number.
10. Admin sees the order in the Admin Dashboard.
11. Admin updates order status manually.
12. Customer can track the order using order number and phone number.

Do not mark an order as paid automatically. COD orders should have payment status `PENDING` until the admin marks them as paid after delivery, if needed.

## Development Rules

- Build only the MVP features listed above.
- Write clean, readable, maintainable TypeScript.
- Use meaningful component and function names.
- Avoid duplicated code.
- Use reusable UI components.
- Use server components by default.
- Use client components only when interactivity is required.
- Handle loading, empty, error, and success states.
- Make all forms accessible.
- Ensure the site works properly on mobile, tablet, and desktop.
- Add seed script only for development/demo data.
- Add README with setup, environment variables, database migration, seeding, and deployment instructions.
- Provide a clear list of implemented features and any intentionally excluded features.

## Deliverables

Provide:

1. Complete project structure.
2. `package.json` dependencies.
3. Prisma schema.
4. Environment variable examples.
5. Database migration commands.
6. Authentication setup.
7. Admin dashboard implementation.
8. Customer storefront implementation.
9. Homepage with all required admin-controlled sections.
10. API routes or server actions.
11. Validation schemas.
12. Security middleware and authorization helpers.
13. UI components.
14. Seed script, optional.
15. README with local setup and deployment instructions.
16. A short explanation of how the owner can change branding, homepage sections, products, banners, and settings from the Admin Dashboard.

## Important Constraints

- Do not add online payment gateways.
- Do not add courier API integration.
- Do not add multi-vendor marketplace functionality.
- Do not add subscription billing.
- Do not add complex ERP features.
- Do not create fake data in production.
- Do not expose secrets.
- Do not bypass authentication or authorization.
- Do not trust client-side calculations.
- Do not create insecure admin routes.
- Do not use deprecated APIs.
- Do not invent package names or APIs.
- If information is missing, choose sensible defaults and clearly document assumptions.

## Success Criteria

The final application should allow the owner to:

- Change logo, colors, fonts, and store information from Admin.
- Change homepage sections, banners, featured products, and section order from Admin.
- Add products, categories, banners, and coupons from Admin.
- Receive COD orders.
- Manage order status.
- Track stock.
- View sales and profit reports.
- Run a secure, fast, mobile-friendly online store without editing code for daily operations.

The final website should look professional enough that a customer trusts it immediately and completes an order easily.
