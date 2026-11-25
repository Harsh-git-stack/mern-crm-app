import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContextValue';
import '../FormStyles.css'; // Using our shared styles

function Register() {
  const { login } = useContext(AuthContext); // Get the login function from our context
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { name, email, password } = formData;
  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  // --- This function now contains the submission logic ---
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If the server returns an error (e.g., user already exists)
        throw new Error(data.msg || data.errors?.[0]?.msg || 'Registration failed');
      }

      // On successful registration, the backend sends back a token and user object.
      // We use our context's login function to set the user state globally.
      login(data.user, data.token);
      
      // Redirect to the main dashboard after successful registration and login.
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
        <p className="auth-eyebrow">GET STARTED</p>
        <h2>Create your account</h2>
        <p className="auth-description">Set up your workspace and start building stronger customer relationships.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input type="text" id="name" name="name" value={name} onChange={onChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" value={email} onChange={onChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" value={password} onChange={onChange} required minLength="6" />
          </div>
          
          {error && <p className="error-message">{error}</p>}
          
          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <div className="form-link">
          <span>Already have an account? </span>
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
