import type { FormEvent } from 'react';

import './LoginPage.css';

/**
 * The login screen: an email field, a masked password field and a Login button.
 *
 * UI only (SDLC-49). Submitting does nothing: there is no API call,
 * authentication or navigation behind the form.
 */
export function LoginPage() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <main className="login-page">
      <form className="login-card" aria-labelledby="login-title" noValidate onSubmit={handleSubmit}>
        <h1 id="login-title" className="login-title">
          Sign in
        </h1>
        <p className="login-subtitle">Enter your email and password to continue.</p>

        <div className="login-field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>

        <div className="login-field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
          />
        </div>

        <button type="submit" className="login-button">
          Login
        </button>
      </form>
    </main>
  );
}
