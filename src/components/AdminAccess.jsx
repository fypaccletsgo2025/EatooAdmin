import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AdminAccess() {
  const { login } = useAuth();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = passcode.trim();
    if (!trimmed) {
      setError("Passcode is required.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await Promise.resolve(login(trimmed));
    if (!result.ok) {
      setError(result.message || "Could not verify admin passcode.");
    }
    setBusy(false);
  };

  return (
    <div className="auth-wall">
      <div className="auth-card">
        <p className="eyebrow">Restricted</p>
        <h1>Eatoo Admin console</h1>
        <p className="page-description">
          Enter the admin passcode to review statistics and pending restaurants.
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Admin passcode</span>
            <input
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              placeholder="Enter your passcode"
              autoComplete="current-password"
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Verifying..." : "Unlock dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
