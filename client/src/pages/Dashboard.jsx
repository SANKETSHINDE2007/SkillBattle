import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://skillbattle.onrender.com/api';

const fallbackSkills = [
  { name: 'Programming', icon: '💻', description: 'C, C++, Python, JavaScript' },
  { name: 'DBMS', icon: '🗄️', description: 'SQL, MongoDB and database concepts' },
  { name: 'Networking', icon: '🌐', description: 'Networks, protocols and security' },
  { name: 'Aptitude', icon: '🧠', description: 'Logical, quantitative and reasoning' },
  { name: 'Computer Science', icon: '⚙️', description: 'OS, data structures and algorithms' },
  { name: 'Web Development', icon: '🚀', description: 'HTML, CSS, JavaScript and React' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });
  const [skills, setSkills] = useState(fallbackSkills);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    const loadUser = async () => {
      try {
        const [userResponse, skillsResponse] = await Promise.all([
          axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API}/skills`),
        ]);

        setUser(userResponse.data.user);
        localStorage.setItem('user', JSON.stringify(userResponse.data.user));

        if (skillsResponse.data.skills?.length) {
          setSkills(skillsResponse.data.skills);
        }
      } catch (error) {
        console.error('Dashboard load error:', error);

        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login', { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading && !user) {
    return (
      <div className="app-loading">
        <div className="loading-orb">✦</div>
        <p>Loading your arena...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="dashboard">
      <div className="page-grid" />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <nav className="dashboard-nav glass-nav">
        <button className="logo" onClick={() => navigate('/')}>
          Skill<span>Battle</span>
        </button>

        <div className="nav-actions">
          {user.isAdmin && (
            <button className="nav-pill admin-pill" onClick={() => navigate('/admin')}>
              ⚙ Admin
            </button>
          )}
          <button className="nav-pill" onClick={() => navigate('/battle-history')}>
            History
          </button>
          <div className="profile-chip">
            <span>{user.fullName?.charAt(0).toUpperCase()}</span>
            <div><b>{user.fullName}</b><small>Level {user.level}</small></div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <main className="dashboard-main">
        <section className="dashboard-hero reveal">
          <div>
            <p className="eyebrow">PLAYER DASHBOARD / ONLINE</p>
            <h1>Welcome back, <span>{user.fullName.split(' ')[0]}</span>.</h1>
            <p className="welcome-text">Your arena is ready. Practice precision or enter a live battle.</p>
            <div className="hero-action-row">
              <button className="primary-btn" onClick={() => navigate('/battle')}>⚔ Enter Battle <b>→</b></button>
              <button className="ghost-btn" onClick={() => navigate('/practice')}>🎯 Practice</button>
            </div>
          </div>
          <div className="player-level-card">
            <div className="level-ring"><span>LVL</span><strong>{user.level}</strong></div>
            <div><small>RATING</small><b>{user.rating}</b><span>{user.wins} wins · {user.losses} losses</span></div>
          </div>
        </section>

        <section className="stats-grid dashboard-stats reveal-delay">
          <div className="stat-card"><span className="stat-icon">⭐</span><div><p>XP</p><h2>{user.xp}</h2><small>earned progress</small></div></div>
          <div className="stat-card"><span className="stat-icon">🏆</span><div><p>Rating</p><h2>{user.rating}</h2><small>competitive rank</small></div></div>
          <div className="stat-card"><span className="stat-icon">⚔️</span><div><p>Wins</p><h2>{user.wins}</h2><small>victories</small></div></div>
          <div className="stat-card"><span className="stat-icon">📊</span><div><p>Losses</p><h2>{user.losses}</h2><small>keep improving</small></div></div>
        </section>

        <section className="battle-section reveal">
          <div className="section-heading"><div><p className="eyebrow">GAME MODES</p><h2>Choose your challenge</h2></div></div>
          <div className="mode-grid">
            <article className="mode-card practice-card">
              <div className="mode-glow" />
              <div className="mode-icon">🎯</div>
              <span className="mode-kicker">SOLO / TIMED</span>
              <h3>Practice Arena</h3>
              <p>Sharpen your skills with timed questions, score tracking and detailed answer explanations.</p>
              <button onClick={() => navigate('/practice')}>Open practice <b>→</b></button>
            </article>
            <article className="mode-card battle-card">
              <div className="mode-glow" />
              <div className="mode-icon">⚔️</div>
              <span className="mode-kicker">LIVE / 1v1</span>
              <h3>Battle Arena</h3>
              <p>Match with another player, answer under pressure and fight for XP, rating and the win.</p>
              <button onClick={() => navigate('/battle')}>Find opponent <b>→</b></button>
            </article>
          </div>
        </section>

        <section className="history-shortcut-section reveal">
          <div className="history-shortcut">
            <div><p className="eyebrow">YOUR RECORD</p><h2>Every battle leaves a mark.</h2><p>Review opponents, scores, results, XP and rating changes from your completed battles.</p></div>
            <button className="ghost-btn" onClick={() => navigate('/battle-history')}>Open battle history →</button>
          </div>
        </section>

        <section className="skills-section reveal">
          <div className="section-heading"><div><p className="eyebrow">SKILL LIBRARY</p><h2>Choose what to master</h2></div></div>
          <div className="skills-grid">
            {skills.map((skill) => (
              <button className="skill-card" key={skill.name} onClick={() => navigate('/practice')}>
                <div className="skill-icon">{skill.icon}</div>
                <div><h3>{skill.name}</h3><p>{skill.description}</p></div>
                <span className="arrow">↗</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
