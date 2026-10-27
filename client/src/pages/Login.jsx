import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Login failed');
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
          <p className="eyebrow">WELCOME BACK / PLAYER</p>
          <h1>Return to the <span>arena.</span></h1>
          <p>Pick up where you left off. Practice, compete and keep building your rating.</p>
          <div className="auth-feature"><span>⚔</span><div><b>Live 1v1 battles</b><small>Real-time competitive matchmaking</small></div></div>
          <div className="auth-feature"><span>✦</span><div><b>XP & rating progression</b><small>Your performance stays with you</small></div></div>
          <div className="auth-feature"><span>◈</span><div><b>Battle history</b><small>Every result, score and reward recorded</small></div></div>
        </div>
        <div className="auth-card">
          <div className="auth-card-top"><span className="auth-mini-icon">↗</span><span>SECURE LOGIN</span></div>
          <h2>Welcome back.</h2>
          <p>Sign in to access your SkillBattle dashboard.</p>
          <form onSubmit={handleSubmit}>
            <label>Email<input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></label>
            <label>Password<input type="password" name="password" placeholder="Your password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required /></label>
            <button className="primary-btn full-btn" type="submit" disabled={loading}>{loading ? 'Authenticating...' : 'Sign in'} <b>→</b></button>
          </form>
          {message && <div className="auth-message error">{message}</div>}
          <p className="auth-switch">New to SkillBattle? <Link to="/register">Create an account</Link></p>
          <Link to="/" className="auth-home-link">← Back to home</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
