import { z } from "zod";

export const checkoutSchema = z.object({
  fullName: z.string().min(2, "Full name is required").max(100),
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, "Enter a valid Bangladeshi phone number (01XXXXXXXXX)"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().min(5, "Full address is required").max(500),
  district: z.string().min(1, "District is required"),
  city: z.string().min(1, "City/Area is required").max(100),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  zoneId: z.string().min(1, "Delivery zone is required"),
  notes: z.string().max(500).optional().or(z.literal("")),
  couponCode: z.string().max(50).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
        variantId: z.string().optional().or(z.literal("")),
      }),
    )
    .min(1, "Cart is empty"),
  idempotencyKey: z.string().min(1, "Missing idempotency key"),
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
