import { useEffect, useState } from "react";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "./firebaseClient";

// Rendered instead of the normal app when the URL carries a Firebase
// password-reset action link (?mode=resetPassword&oobCode=...) -- used both
// for admin-invited new accounts (invite email = a reset-password email
// under the hood) and for the "Forgot password?" flow.
export default function ResetPassword({ oobCode }) {
  const [status, setStatus] = useState("verifying"); // verifying | ready | invalid | saving | done | error
  const [email, setEmail] = useState(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    verifyPasswordResetCode(auth, oobCode)
      .then((e) => { setEmail(e); setStatus("ready"); })
      .catch(() => setStatus("invalid"));
  }, [oobCode]);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setStatus("saving");
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus("done");
    } catch (err) {
      setError(String(err));
      setStatus("ready");
    }
  }

  function goToLogin() {
    window.location.href = window.location.origin;
  }

  return (
    <div className="app">
      <div className="brand-logo">
        <img src="/zarni-logo.png" alt="Zarni Electronics" />
      </div>
      <div className="admin-login">
        {status === "verifying" && <p className="hint">Checking your link…</p>}

        {status === "invalid" && (
          <>
            <h2>Link expired</h2>
            <p className="hint">This password link is invalid or has expired. Ask an admin to resend your invite, or use "Forgot password?" on the sign-in page.</p>
            <button onClick={goToLogin}>Back to sign in</button>
          </>
        )}

        {(status === "ready" || status === "saving") && (
          <form onSubmit={submit}>
            <h2>Set your password</h2>
            <p className="hint">for {email}</p>
            <label>
              <span>New password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            </label>
            <label>
              <span>Confirm password</span>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={status === "saving"}>{status === "saving" ? "Saving…" : "Set password"}</button>
          </form>
        )}

        {status === "done" && (
          <>
            <h2>Password set</h2>
            <p className="hint">Please sign in again with your new password.</p>
            <button onClick={goToLogin}>Go to sign in</button>
          </>
        )}
      </div>
    </div>
  );
}
