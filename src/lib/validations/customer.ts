import { z } from "zod";
import { BANGLADESH_DISTRICTS } from "@/lib/constants";

const id = z.string().trim().min(1).max(100);
const couponCode = z.string().trim().max(50).toUpperCase().optional();
const cartLines = z.array(z.object({
  productId: id,
  quantity: z.number().int().min(1).max(100),
  variantId: id.optional().or(z.literal("")),
})).min(1, "Cart is empty").max(50);

export const cartQuoteSchema = z.object({ items: cartLines, couponCode });
export const checkoutQuoteSchema = cartQuoteSchema.extend({
  district: z.enum(BANGLADESH_DISTRICTS, { error: "Select a valid district" }),
  zoneId: id,
});

export const checkoutSchema = checkoutQuoteSchema.extend({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  phone: z.string().trim().regex(/^01[3-9]\d{8}$/, "Enter a valid Bangladeshi phone number (01XXXXXXXXX)"),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254).or(z.literal(""))).optional(),
  address: z.string().trim().min(5, "Full address is required").max(500),
  city: z.string().trim().min(1, "City/Area is required").max(100),
  postalCode: z.string().trim().regex(/^\d{4}$/, "Enter a valid four-digit postal code").or(z.literal("")).optional(),
  notes: z.string().trim().max(500).optional(),
  idempotencyKey: z.uuid(),
  expectedQuote: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});

export const trackOrderSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, "Enter a valid phone number"),
});

export const reviewSchema = z.object({
  productId: z.string().min(1),
  customerName: z.string().min(2, "Name is required").max(100),
  city: z.string().max(100).optional().or(z.literal("")),
  rating: z.coerce.number().int().min(1, "Rating is required").max(5),
  title: z.string().max(200).optional().or(z.literal("")),
  body: z.string().min(5, "Review must be at least 5 characters").max(2000),
});

export const newsletterSchema = z.object({
  email: z.string().email("Invalid email"),
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, "Invalid phone")
    .optional()
    .or(z.literal("")),
  consent: z.boolean(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type TrackOrderInput = z.infer<typeof trackOrderSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type NewsletterInput = z.infer<typeof newsletterSchema>;
