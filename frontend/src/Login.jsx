import { useState } from "react";
import { api } from "./api";

export default function Login({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await api.login(email, password);
      onLoggedIn(user);
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setBusy(false);
    }
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
      </form>
    </div>
  );
}
