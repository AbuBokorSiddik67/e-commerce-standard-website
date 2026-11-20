import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, "Enter a valid Bangladeshi phone number (e.g. 01XXXXXXXXX)"),
});

export const addressSchema = z.object({
  fullName: z.string().min(2, "Full name is required").max(100),
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, "Enter a valid Bangladeshi phone number (01XXXXXXXXX)"),
  address: z.string().min(5, "Full address is required").max(500),
  district: z.string().min(1, "District is required").max(100),
  city: z.string().min(1, "City/Area is required").max(100),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  isDefault: z.boolean().optional().default(false),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
