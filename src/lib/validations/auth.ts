import { z } from "zod";

/**
 * Shared auth input schemas.
 *
 * `bcrypt` only reads the first 72 bytes of a password and silently ignores the
 * rest, so `MAX_PASSWORD_LENGTH` caps input at that boundary rather than letting
 * two different long passwords hash to the same value.
 */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`);

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * What the Credentials provider's `authorize` receives. Deliberately looser than
 * `registerSchema` — sign-in must not re-apply the registration rules, or
 * tightening them later would lock out existing accounts.
 */
export const signInSchema = z.object({
  email,
  password: z.string().min(1),
});
