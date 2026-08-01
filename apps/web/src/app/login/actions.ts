'use server';
import { AuthError } from 'next-auth';
import { signIn } from '@/lib/auth.js';

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dashboard',
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: 'Invalid email or password.' };
    throw e; // re-throw redirect signal
  }
}
