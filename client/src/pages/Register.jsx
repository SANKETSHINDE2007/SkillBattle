import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const response = await axios.post('https://skillbattle.onrender.com/api/auth/register', formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="page-grid" /><div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <Link to="/" className="auth-brand">Skill<span>Battle</span></Link>
      <div className="auth-layout">
        <div className="auth-showcase">
          <p className="eyebrow">CREATE / COMPETE / LEVEL UP</p>
          <h1>Build your <span>competitive edge.</span></h1>
          <p>Create your SkillBattle identity and turn technical knowledge into measurable progress.</p>
          <div className="register-metric"><strong>01</strong><span>Create your profile</span></div>
          <div className="register-metric"><strong>02</strong><span>Practice or challenge</span></div>
          <div className="register-metric"><strong>03</strong><span>Earn XP & rating</span></div>
        </div>
        <div className="auth-card">
          <div className="auth-card-top"><span className="auth-mini-icon">✦</span><span>NEW PLAYER</span></div>
          <h2>Create your account.</h2>
          <p>Start with a profile, then enter the arena.</p>
          <form onSubmit={handleSubmit}>
            <label>Full name<input type="text" name="fullName" placeholder="Your full name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required /></label>
            <label>Email<input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></label>
            <label>Password<input type="password" name="password" placeholder="At least 6 characters" minLength="6" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required /></label>
            <button className="primary-btn full-btn" type="submit" disabled={loading}>{loading ? 'Creating profile...' : 'Create account'} <b>→</b></button>
          </form>
          {message && <div className="auth-message error">{message}</div>}
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
          <Link to="/" className="auth-home-link">← Back to home</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
