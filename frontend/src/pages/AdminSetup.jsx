import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContextValue';

function AdminSetup() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', setupKey: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/users/bootstrap-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-setup-key': formData.setupKey,
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || data.errors?.[0]?.msg || 'Administrator setup failed');
      }

      login(data.user, data.token);
      navigate('/admin', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="form-box">
        <div className="auth-brand"><span className="brand-mark">P</span><span>Pathway CRM</span></div>
        <p className="auth-eyebrow">ONE-TIME WORKSPACE SETUP</p>
        <h2>Initialize administrator</h2>
        <p className="auth-description">
          Create the first admin account using the private setup key configured on your backend.
        </p>
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="admin-name">Full name</label>
            <input id="admin-name" name="name" value={formData.name} onChange={updateField} required autoComplete="name" />
          </div>
          <div className="form-group">
            <label htmlFor="admin-email">Administrator email</label>
            <input id="admin-email" name="email" type="email" value={formData.email} onChange={updateField} required autoComplete="email" />
          </div>
          <div className="form-group">
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" name="password" type="password" value={formData.password} onChange={updateField} required minLength={6} autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label htmlFor="admin-setup-key">Private setup key</label>
            <input id="admin-setup-key" name="setupKey" type="password" value={formData.setupKey} onChange={updateField} required autoComplete="off" />
          </div>
          {error && <p className="error-message" role="alert">{error}</p>}
          <div className="form-buttons">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Setting up…' : 'Create administrator'}
            </button>
          </div>
        </form>
        <div className="form-link"><Link to="/login">Back to sign in</Link></div>
      </section>
    </div>
  );
}

export default AdminSetup;
