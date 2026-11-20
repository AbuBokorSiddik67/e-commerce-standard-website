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
- Homepage section visibility.
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
9. API routes or server actions.
10. Validation schemas.
11. Security middleware and authorization helpers.
12. UI components.
13. Seed script, optional.
14. README with local setup and deployment instructions.
15. A short explanation of how the owner can change branding, products, banners, and settings from the Admin Dashboard.

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
- Add products, categories, banners, and coupons from Admin.
- Receive COD orders.
- Manage order status.
- Track stock.
- View sales and profit reports.
- Run a secure, fast, mobile-friendly online store without editing code for daily operations.

The final website should look professional enough that a customer trusts it immediately and completes an order easily.
