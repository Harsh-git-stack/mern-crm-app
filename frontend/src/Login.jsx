import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from './context/AuthContextValue';
import './FormStyles.css'; // Using our shared styles

function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { email, password } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- This function now contains the correct submission logic ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const responseBody = await response.text();
      let data;
      try {
        data = responseBody ? JSON.parse(responseBody) : {};
      } catch {
        if (!response.ok) {
          throw new Error(
            `Login failed with HTTP ${response.status}. Check that the backend is running and connected to MongoDB.`
          );
        }
        throw new Error('The login service returned an invalid response. Please try again or check the backend.');
      }

      if (!response.ok) {
        throw new Error(
          data.msg ||
          data.errors?.[0]?.msg ||
          `Login failed with HTTP ${response.status}. Check that the backend is running.`
        );
      }
      if (!data.token || !data.user) {
        throw new Error('The login service response was incomplete. Please check the backend logs.');
      }

      // On successful login, update the global state via context
      login(data.user, data.token);

      // Redirect to the dashboard
      navigate('/dashboard');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="form-box">
        <div className="auth-brand"><span className="brand-mark">P</span><span>Pathway CRM</span></div>
        <p className="auth-eyebrow">WELCOME BACK</p>
        <h2>Sign in to your workspace</h2>
        <p className="auth-description">Manage customers, track leads, and keep your pipeline moving.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={onChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={onChange}
              required
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="form-buttons">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
        <div className="form-link">
          <span>New to Pathway? </span>
          <Link to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
