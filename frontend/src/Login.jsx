import { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("signin"); // signin | forgot | sent

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // no further action needed -- App.jsx's onAuthStateChanged picks this up
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setBusy(false);
    }
  }

  async function submitForgot(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/`,
        handleCodeInApp: true,
      });
      setMode("sent");
    } catch (err) {
      // Don't reveal whether the email exists -- same message either way.
      setMode("sent");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "forgot" || mode === "sent") {
    return (
      <div className="app">
        <div className="brand-logo">
          <img src="/zarni-logo.png" alt="Zarni Electronics" />
        </div>
        <div className="admin-login">
          {mode === "sent" ? (
            <>
              <h2>Check your email</h2>
              <p className="hint">If an account exists for {email}, a password reset link has been sent.</p>
              <button onClick={() => { setMode("signin"); setPassword(""); }}>Back to sign in</button>
            </>
          ) : (
            <form onSubmit={submitForgot}>
              <h2>Reset password</h2>
              <label>
                <span>Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
              </label>
              {error && <p className="error">{error}</p>}
              <button type="submit" disabled={busy || !email.trim()}>{busy ? "Sending…" : "Send reset link"}</button>
              <button type="button" className="hint" onClick={() => setMode("signin")}>Back to sign in</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="brand-logo">
        <img src="/zarni-logo.png" alt="Zarni Electronics" />
      </div>
      <form className="admin-login" onSubmit={submit}>
        <h2>Sign in</h2>
        <label>
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </label>
        <label>
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <button type="button" className="login-forgot-link" onClick={() => setMode("forgot")}>Forgot password?</button>
      </form>
    </div>
  );
}
