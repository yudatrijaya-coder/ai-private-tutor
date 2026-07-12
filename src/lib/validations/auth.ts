import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export const studentLoginSchema = z.object({
  studentId: z.string().min(3, "ID siswa minimal 3 karakter"),
  password: z.string().optional(),
});

export const setPasswordSchema = z.object({
  studentId: z.string().min(3, "ID siswa minimal 3 karakter"),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password minimal 6 karakter"),
});

export const resetPasswordSchema = z.object({
  studentId: z.string().min(3, "ID siswa minimal 3 karakter"),
  newPassword: z.string().min(6, "Password minimal 6 karakter"),
});

export const profileSchema = z.object({
  name: z.string().min(1).max(50),
  classLevel: z.enum(["SD5", "SMP1", "SMA2"]),
  character: z.enum(["mbappe", "lisa", "kak_budi"]).optional(),
  studyTime: z.string().regex(/^\d{2}:\d{2}$/),
  studyDays: z.array(z.string()).min(1).max(7),
});
