'use server';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma.js';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export async function registerAction(_prev: { error?: string } | undefined, formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name') || undefined,
  });
  if (!parsed.success) return { error: 'Enter a valid email and a password of at least 8 characters.' };
  const email = parsed.data.email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: 'An account with that email already exists.' };
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({ data: { email, passwordHash, name: parsed.data.name ?? null } });
  redirect('/login?registered=1');
}
