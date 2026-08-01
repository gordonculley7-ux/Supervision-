'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { attestationHash, ATTESTATION_STATEMENT } from '@/lib/attest';

async function requireUser(): Promise<{ id: string; email: string }> {
  const s = await auth();
  if (!s?.user) redirect('/login');
  return { id: (s.user as any).id as string, email: String(s.user.email) };
}

export async function acceptInvite(formData: FormData) {
  const me = await requireUser();
  const id = String(formData.get('linkId'));
  const link = await prisma.supervisionLink.findUnique({ where: { id } });
  if (!link || link.status !== 'pending') return;
  if (link.supervisorEmail.toLowerCase() !== me.email.toLowerCase()) return;
  await prisma.supervisionLink.update({
    where: { id },
    data: { supervisorId: me.id, status: 'active', startDate: new Date() },
  });
  revalidatePath('/supervisor');
  revalidatePath('/dashboard');
}

export async function declineInvite(formData: FormData) {
  const me = await requireUser();
  const id = String(formData.get('linkId'));
  const link = await prisma.supervisionLink.findUnique({ where: { id } });
  if (!link || link.supervisorEmail.toLowerCase() !== me.email.toLowerCase()) return;
  await prisma.supervisionLink.update({ where: { id }, data: { status: 'ended', endedAt: new Date() } });
  revalidatePath('/supervisor');
}

export async function signEntry(formData: FormData) {
  const me = await requireUser();
  const entryId = String(formData.get('entryId'));
  const signedName = String(formData.get('signedName') ?? '').trim();
  const credentialTitle = String(formData.get('credentialTitle') ?? '').trim() || null;
  if (!signedName) return;

  const entry = await prisma.supervisionEntry.findUnique({ where: { id: entryId }, include: { attestation: true } });
  if (!entry || entry.attestation) return; // already signed or missing

  // Must have an active supervisory link with this trainee.
  const link = await prisma.supervisionLink.findFirst({
    where: { traineeId: entry.userId, supervisorId: me.id, status: 'active' },
  });
  if (!link) return;

  const signedAt = new Date();
  const hash = attestationHash({
    entryId: entry.id,
    date: entry.date.toISOString().slice(0, 10),
    durationHours: entry.durationHours,
    format: entry.format,
    setting: entry.setting,
    traineeId: entry.userId,
    supervisorId: me.id,
    signedName,
    statement: ATTESTATION_STATEMENT,
    signedAt: signedAt.toISOString(),
  });

  await prisma.$transaction([
    prisma.attestation.create({
      data: {
        supervisionEntryId: entry.id, supervisorId: me.id, traineeId: entry.userId,
        signedName, credentialTitle, statement: ATTESTATION_STATEMENT, payloadHash: hash, createdAt: signedAt,
      },
    }),
    prisma.supervisionEntry.update({
      where: { id: entry.id }, data: { signedOff: true, supervisorId: me.id },
    }),
  ]);
  revalidatePath('/supervisor');
  revalidatePath('/dashboard');
}
