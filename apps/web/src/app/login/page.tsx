'use client';
import { useFormState } from 'react-dom';
import Link from 'next/link';
import { loginAction } from './actions';

export default function LoginPage() {
  const [state, action] = useFormState(loginAction, undefined);
  return (
    <div className="authwrap">
      <h1>Sign in</h1>
      <form className="card" action={action}>
        <div className="field"><label>Email</label><input name="email" type="email" required /></div>
        <div className="field"><label>Password</label><input name="password" type="password" required /></div>
        <button className="primary" type="submit">Sign in</button>
        {state?.error && <div className="err">{state.error}</div>}
      </form>
      <div className="linkrow">No account yet? <Link href="/register">Create one</Link></div>
    </div>
  );
}
