import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { acceptInvite, declineInvite, signEntry } from './actions';

export const dynamic = 'force-dynamic';

export default async function SupervisorPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const me = { id: (session.user as any).id as string, email: String(session.user.email) };
  const myName = session.user.name ?? session.user.email ?? '';

  const invites = await prisma.supervisionLink.findMany({
    where: { supervisorEmail: me.email.toLowerCase(), status: 'pending' },
    include: { trainee: true },
    orderBy: { createdAt: 'desc' },
  });

  const activeLinks = await prisma.supervisionLink.findMany({
    where: { supervisorId: me.id, status: 'active' },
    include: { trainee: true },
    orderBy: { startDate: 'desc' },
  });

  const supervisees = await Promise.all(activeLinks.map(async (link: any) => {
    const entries = await prisma.supervisionEntry.findMany({
      where: { userId: link.traineeId },
      include: { attestation: true },
      orderBy: { date: 'desc' },
    });
    return { link, entries };
  }));

  return (
    <div className="app">
      <div className="topbar">
        <div><strong style={{ color: 'var(--blue)' }}>Supervisor view</strong> <span className="badge">Web</span></div>
        <div className="who"><Link href="/dashboard">My tracking</Link> · {me.email}</div>
      </div>

      {invites.length > 0 && (
        <div className="card">
          <h2>Pending invitations</h2>
          <div className="sub">A trainee has asked you to be their supervisor.</div>
          {invites.map((inv: any) => (
            <div key={inv.id} className="row" style={{ alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 10 }}>
              <span>{inv.trainee.name ?? inv.trainee.email}</span>
              <span style={{ display: 'flex', gap: 8 }}>
                <form action={acceptInvite}><input type="hidden" name="linkId" value={inv.id} /><button className="primary" type="submit">Accept</button></form>
                <form action={declineInvite}><input type="hidden" name="linkId" value={inv.id} /><button className="ghost" type="submit">Decline</button></form>
              </span>
            </div>
          ))}
        </div>
      )}

      {supervisees.length === 0 && invites.length === 0 && (
        <div className="card"><div className="empty">No supervisees yet. When a trainee invites you and you accept, they’ll appear here.</div></div>
      )}

      {supervisees.map(({ link, entries }) => {
        const unsigned = entries.filter((e: any) => !e.attestation);
        const signed = entries.filter((e: any) => e.attestation);
        return (
          <div className="card" key={link.id}>
            <h2>{link.trainee.name ?? link.trainee.email}</h2>
            <div className="sub">{signed.length} signed · {unsigned.length} awaiting your sign-off</div>

            {unsigned.length === 0 ? (
              <div className="empty">Nothing awaiting sign-off.</div>
            ) : unsigned.map((e: any) => (
              <div key={e.id} className="metric" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                <div className="lab"><span>{e.date.toISOString().slice(0, 10)} · {e.durationHours}h · {e.format}, {String(e.setting).replace('_', ' ')}</span></div>
                <form action={signEntry} className="row" style={{ alignItems: 'flex-end', marginTop: 6 }}>
                  <input type="hidden" name="entryId" value={e.id} />
                  <div className="field"><label>Your name (signature)</label><input name="signedName" defaultValue={myName} required /></div>
                  <div className="field"><label>Credential (optional)</label><input name="credentialTitle" placeholder="e.g. LPCC, Board-approved supervisor" /></div>
                  <button className="primary" type="submit">Sign off</button>
                </form>
              </div>
            ))}

          </div>
        );
      })}

      <p className="disclaimer">
        Signing attests that you provided the supervision recorded. Each sign-off is stored with a
        timestamp and a tamper-evident hash of the exact entry signed.
      </p>
    </div>
  );
}
