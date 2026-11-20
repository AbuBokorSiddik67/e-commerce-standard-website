import { z } from "zod";

const email = z.string().trim().max(254).toLowerCase().pipe(z.email("Invalid email address"));
const byteLimit = (value: string) => new TextEncoder().encode(value).length <= 72;
const bcryptLimit = "Password must be at most 72 UTF-8 bytes";
const existingPassword = z.string().min(1, "Password is required").max(72).refine(byteLimit, bcryptLimit);
export const newPassword = z.string().min(12, "Use at least 12 characters").max(72).refine(byteLimit, bcryptLimit);

export const loginSchema = z.object({ email, password: existingPassword });
export const credentialsSchema = loginSchema.extend({ portal: z.enum(["customer", "admin"]).default("customer") });

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email,
  phone: z.string().trim().regex(/^01[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number"),
  password: newPassword,
  confirmPassword: z.string().max(72),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export const passwordResetRequestSchema = z.object({ email });
export const passwordResetSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/, "This reset link is invalid or has expired"),
  password: newPassword,
  confirmPassword: z.string().max(72),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export const changePasswordSchema = z.object({
  currentPassword: existingPassword,
  password: newPassword,
  confirmPassword: z.string().max(72),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
