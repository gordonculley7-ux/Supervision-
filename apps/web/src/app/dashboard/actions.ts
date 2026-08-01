'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findRequirementSets } from '@supervision-tracker/core';

async function requireUser(): Promise<string> {
  const s = await auth();
  if (!s?.user) redirect('/login');
  return (s.user as any).id as string;
}

export async function saveCredential(formData: FormData) {
  const userId = await requireUser();
  const profession = String(formData.get('profession'));
  const state = String(formData.get('state'));
  const pathway = String(formData.get('pathway'));
  const set =
    findRequirementSets({ profession: profession as any, state, purpose: 'initial_licensure', pathway })[0] ??
    findRequirementSets({ profession: profession as any, state, purpose: 'initial_licensure' })[0];
  await prisma.credential.deleteMany({ where: { userId } });
  await prisma.credential.create({
    data: { userId, profession, state, pathway, requirementSetId: set?.id ?? '' },
  });
  revalidatePath('/dashboard');
}

export async function addPractice(formData: FormData) {
  const userId = await requireUser();
  await prisma.practiceEntry.create({
    data: {
      userId, date: new Date(String(formData.get('date'))),
      totalHours: Number(formData.get('totalHours')),
      directContactHours: Number(formData.get('directContactHours') || 0),
      relationalHours: Number(formData.get('relationalHours') || 0),
    },
  });
  revalidatePath('/dashboard');
}

export async function addSupervision(formData: FormData) {
  const userId = await requireUser();
  await prisma.supervisionEntry.create({
    data: {
      userId, date: new Date(String(formData.get('date'))),
      durationHours: Number(formData.get('durationHours')),
      format: String(formData.get('format')), setting: String(formData.get('setting')),
    },
  });
  revalidatePath('/dashboard');
}

export async function addCeu(formData: FormData) {
  const userId = await requireUser();
  await prisma.ceuEntry.create({
    data: {
      userId, date: new Date(String(formData.get('date'))),
      hours: Number(formData.get('hours')), category: String(formData.get('category')),
      title: String(formData.get('title') || '') || null,
    },
  });
  revalidatePath('/dashboard');
}

export async function deleteEntry(formData: FormData) {
  const userId = await requireUser();
  const kind = String(formData.get('kind'));
  const id = String(formData.get('id'));
  if (kind === 'practice') await prisma.practiceEntry.deleteMany({ where: { id, userId } });
  else if (kind === 'supervision') await prisma.supervisionEntry.deleteMany({ where: { id, userId } });
  else await prisma.ceuEntry.deleteMany({ where: { id, userId } });
  revalidatePath('/dashboard');
}

export async function signOutAction() {
  await signOut({ redirectTo: '/login' });
}
