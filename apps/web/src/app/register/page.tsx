'use client';
import { useFormState } from 'react-dom';
import Link from 'next/link';
import { registerAction } from './actions';

export default function RegisterPage() {
  const [state, action] = useFormState(registerAction, undefined);
  return (
    <div className="authwrap">
      <h1>Create your account</h1>
      <form className="card" action={action}>
        <div className="field"><label>Name (optional)</label><input name="name" /></div>
        <div className="field"><label>Email</label><input name="email" type="email" required /></div>
        <div className="field"><label>Password</label><input name="password" type="password" required minLength={8} /></div>
        <button className="primary" type="submit">Create account</button>
        {state?.error && <div className="err">{state.error}</div>}
      </form>
      <div className="linkrow">Already have an account? <Link href="/login">Sign in</Link></div>
    </div>
  );
}
