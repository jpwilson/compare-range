import { useState } from 'react';
import type { SessionInfo } from '../auth/useSession';
import { X } from './icons';

interface Props {
  session: SessionInfo | null;
  onSignIn: (email: string) => Promise<string | null>;
  onSignOut: () => Promise<void>;
}

/** Topbar sign-in / account control. Only rendered when auth is configured. */
export function AccountButton({ session, onSignIn, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const addr = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(addr)) { setPhase('error'); setError('That doesn’t look like an email address.'); return; }
    setPhase('sending');
    const err = await onSignIn(addr);
    if (err) { setPhase('error'); setError(err); }
    else setPhase('sent');
  };

  if (session) {
    return (
      <div className="account">
        <button className="account__chip" onClick={() => setOpen(o => !o)} aria-expanded={open} title={session.email ?? 'Account'}>
          {(session.email ?? '?').slice(0, 1).toUpperCase()}
        </button>
        {open ? (
          <div className="account__pop">
            <div className="account__email">{session.email}</div>
            <button className="btn btn--small" onClick={() => { setOpen(false); void onSignOut(); }}>Sign out</button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="account">
      <button className="linkbtn" onClick={() => { setOpen(o => !o); setPhase('idle'); }} aria-expanded={open}>Sign in</button>
      {open ? (
        <div className="account__pop">
          <button className="account__close" onClick={() => setOpen(false)} aria-label="Close"><X /></button>
          {phase === 'sent' ? (
            <p className="account__note">Check your email — the sign-in link brings you back here. Your evlineup.org account works too.</p>
          ) : (
            <form onSubmit={submit}>
              <p className="account__note">Sign in to save your own vehicles. We’ll email you a link — no password.</p>
              <input
                className="account__input" type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} autoFocus
              />
              <button className="btn btn--small" type="submit" disabled={phase === 'sending'}>
                {phase === 'sending' ? 'Sending…' : 'Email me a link'}
              </button>
              {phase === 'error' ? <p className="account__err">{error}</p> : null}
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
