# ShopBD — Next.js E-commerce Store

Production-ready Cash on Delivery (COD) e-commerce storefront and admin dashboard for a small Bangladeshi online store. Built with Next.js App Router, TypeScript, Prisma, PostgreSQL, NextAuth/Auth.js, Tailwind CSS, and shadcn/ui.

## Features

**Storefront**
- Admin-controlled homepage sections: hero, trust strip, categories, new arrivals, best sellers, offer banner, featured collection, why shop, reviews, social feed, newsletter/WhatsApp CTA.
- Product listing with search, category, price, availability filters and sorting.
- Product detail with image gallery, variants, stock status, reviews, related products, SEO metadata and structured data.
- Cart, coupon codes, COD checkout with server-side totals, order success and order tracking by order number + phone.
- Responsive, mobile-first layout with sticky header, mobile menu and bottom navigation.
- Newsletter/WhatsApp signup, policy pages, about and contact pages.

**Admin Dashboard (`/admin`)**
- Secure credentials login with role-based access control.
- Products, categories, variants, images, stock and low-stock thresholds.
- Order management with status transitions, cancellation, internal notes, invoice and CSV export.
- Customer management (orders, total spend, block/unblock).
- Coupons, homepage banners, homepage section editor (show/hide, order, limits, selected products/categories).
- Store settings: branding, colors, fonts, contact info, social links, policies, delivery zones, COD toggle.
- Reports: revenue, estimated profit, best sellers, low stock, status breakdown, top customers, sales by category.
- Audit log for important admin actions.

**Security**
- Passwords hashed with bcrypt.
- Protected `/admin` routes via middleware and server-side session/role checks.
- Zod validation on all mutations, server-side price/coupon/delivery recalculation.
- Prisma transactions, stock checks, idempotent order submission.
- Rate limiting on sensitive actions, security headers, audit logging.

## Tech Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + shadcn/ui
- PostgreSQL + Prisma ORM
- NextAuth/Auth.js (credentials)
- Zod + React Hook Form
- Zustand (cart state)
- UploadThing/Cloudinary-ready image handling

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables and fill in the values:
   ```bash
   cp .env.example .env
   ```

   Required:
   - `DATABASE_URL` — PostgreSQL (Neon pooler) connection string.
   - `DIRECT_URL` — direct database connection for migrations (if using Neon).
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`.
   - `AUTH_URL` — e.g. `http://localhost:3000`; use the canonical HTTPS origin in production. Set `AUTH_TRUST_HOST=true` behind a trusted ingress.
   - Set `NEXT_PUBLIC_APP_URL` to the public HTTPS origin for canonical URLs, social metadata and the sitemap (no path or query). `AUTH_URL` is the fallback when `NEXT_PUBLIC_APP_URL` is unset.
   - `UPLOADTHING_TOKEN` for production uploads; see `.env.example` for recovery email and additional image hosts.

3. Generate Prisma client and apply migrations:
   ```bash
   npm run db:generate
   npm run db:deploy
   ```

4. Seed demo data (development only):
   ```bash
   SHOPBD_ALLOW_DEMO_SEED=1 npm run db:seed
   ```

   Provision an admin separately with `npm run auth:provision-admin`, an explicit `SHOPBD_ADMIN_EMAIL`, and a 16+ character password piped from a secret manager or hidden prompt. The demo seed creates no admin.

5. Start the dev server:
   ```bash
   npm run dev
   ```

6. Open http://localhost:3000 and http://localhost:3000/admin.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run db:migrate` | Create/apply dev migrations |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

## Deployment (Vercel)

1. Push the repository and import it in Vercel.
2. Add all environment variables from `.env.example`.
3. Provision a PostgreSQL database (Neon recommended) and run:
   ```bash
   npx prisma migrate deploy
   ```
4. Build command: `npm run build`.
5. Do not run the demo seed in deployed environments. It is restricted to opted-in, disposable loopback databases; see `PHASE_3_SECURITY_REPORT.md` for provisioning and rotation.
6. Add your production domain to `NEXT_PUBLIC_APP_URL` and `AUTH_URL`.

## Admin Quick Guide

- **Branding/colors/fonts/contact/policies:** Admin → Settings.
- **Homepage sections, order, visibility, limits, featured products/categories:** Admin → Homepage.
- **Banners (hero/offer):** Admin → Banners.
- **Products, images, variants, stock:** Admin → Products.
- **Delivery charges:** Admin → Settings → Delivery zones.
- **Orders and status updates:** Admin → Orders.
- **Coupons:** Admin → Coupons.
- **Sales/profit reports and CSV export:** Admin → Reports.

## Intentionally Excluded (v1)

- Online payment gateways (bKash, Nagad, SSLCommerz, Stripe).
- Courier API integration.
- Multi-vendor marketplace, subscriptions, ERP features.
- Google/social login.

## Operational Notes

- **Image uploads:** when UploadThing credentials are set, uploads go to UploadThing. Without credentials the app falls back to base64 data URLs so local development still works; configure UploadThing (or Cloudinary) for production to avoid storing large images in PostgreSQL.
- **Password reset:** reset tokens are created server-side with a one-hour expiry. No email provider is bundled, so reset links are returned only in development. Connect your email provider before relying on this flow in production.
- **Rate limiting:** implemented in memory. It works for a single server instance; use Redis/Upstash for multi-instance or serverless production deployments.
- **ISR:** the homepage revalidates every 5 minutes and admin changes call `revalidatePath`, so content updates appear without a redeploy. Admin routes are always dynamic.

# e-commerce-standard-website
