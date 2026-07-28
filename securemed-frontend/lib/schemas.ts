import { z } from "zod";

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(150, "Username must be at most 150 characters")
      .regex(
        /^[\w.@+-]+$/,
        "Username may only contain letters, digits, and @/./+/-/_",
      ),
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character",
      ),
    password_confirm: z.string(),
    role: z.enum(["patient", "provider"], {
      required_error: "Please select a role",
    }),
    medicalLicenseNumber: z.string().optional(),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Passwords do not match",
    path: ["password_confirm"],
  })
  .refine(
    (data) => {
      if (data.role === "provider") {
        return !!data.medicalLicenseNumber?.trim();
      }
      return true;
    },
    {
      message: "Medical license number is required for providers",
      path: ["medicalLicenseNumber"],
    },
  );

export type RegisterFormData = z.infer<typeof registerSchema>;
