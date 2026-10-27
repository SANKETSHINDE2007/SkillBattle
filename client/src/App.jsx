import React from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import AIQuestionGenerator from './pages/AIQuestionGenerator';
import Practice from './pages/Practice';
import Battle from './pages/Battle';
import BattleRoom from './pages/BattleRoom';
import BattleHistory from './pages/BattleHistory';

function Home() {
  const navigate = useNavigate();
  const isLoggedIn = Boolean(localStorage.getItem('token'));

  return (
    <div className="landing-page">
      <div className="landing-glow landing-glow-one" />
      <div className="landing-glow landing-glow-two" />
      <div className="landing-grid" />

      <header className="landing-nav">
        <Link to="/" className="landing-brand">
          Skill<span>Battle</span>
        </Link>

        <nav className="landing-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
        </nav>

        <div className="landing-nav-actions">
          {isLoggedIn ? (
            <button className="landing-login" onClick={() => navigate('/dashboard')}>
              Dashboard
            </button>
          ) : (
            <>
              <Link to="/login" className="landing-login">
                Login
              </Link>
              <Link to="/register" className="landing-nav-cta">
                Create account
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <div className="hero-badge">
              <span className="pulse-dot" />
              COMPETE • LEARN • LEVEL UP
            </div>

            <h1>
              Turn your skills into your <span>next victory.</span>
            </h1>

            <p className="hero-lead">
              Practice technical skills, challenge real players in 1v1 battles,
              earn XP and build your rating — all in one competitive platform.
            </p>

            <div className="hero-actions">
              <Link to="/register" className="hero-primary">
                Start competing <span>→</span>
              </Link>
              <Link to="/login" className="hero-secondary">
                I already have an account
              </Link>
            </div>

            <div className="hero-trust">
              <div><strong>6+</strong><span>Skill categories</span></div>
              <div><strong>1v1</strong><span>Live battles</span></div>
              <div><strong>XP</strong><span>Progress system</span></div>
            </div>
          </div>

          <div className="battle-preview" aria-hidden="true">
            <div className="preview-topbar">
              <div className="preview-dots"><i /><i /><i /></div>
              <span>LIVE BATTLE</span>
              <b>02:18</b>
            </div>

            <div className="preview-players">
              <div className="player-card active-player">
                <div className="player-avatar">S</div>
                <div><small>YOU</small><strong>120 XP</strong></div>
              </div>
              <div className="vs">VS</div>
              <div className="player-card">
                <div className="player-avatar opponent-avatar">A</div>
                <div><small>OPPONENT</small><strong>105 XP</strong></div>
              </div>
            </div>

            <div className="preview-question">
              <div className="question-label">QUESTION 04 / 10</div>
              <h3>Which data structure follows the LIFO principle?</h3>
              <div className="preview-options">
                <div><span>A</span> Queue</div>
                <div className="correct-option"><span>B</span> Stack <b>✓</b></div>
                <div><span>C</span> Tree</div>
                <div><span>D</span> Graph</div>
              </div>
            </div>

            <div className="preview-progress"><span /></div>
          </div>
        </section>

        <section className="landing-section" id="features">
          <div className="section-intro">
            <p className="section-kicker">WHY SKILLBATTLE</p>
            <h2>More than a quiz. <span>A competitive skill arena.</span></h2>
            <p>Designed to make learning feel like competition — without losing the learning.</p>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Practice smarter</h3>
              <p>Timed questions across Programming, DBMS, Networking, Aptitude and more.</p>
            </article>
            <article className="feature-card featured-feature">
              <div className="feature-icon">⚔️</div>
              <h3>Battle 1v1</h3>
              <p>Match with another player, answer under pressure and prove your skills.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">🏆</div>
              <h3>Earn & level up</h3>
              <p>Gain XP, improve your rating, collect wins and track your progress.</p>
            </article>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-intro compact-intro">
            <p className="section-kicker">HOW IT WORKS</p>
            <h2>Three steps. <span>One better version of you.</span></h2>
          </div>
          <div className="steps-grid">
            <div className="step-card"><span>01</span><h3>Create your profile</h3><p>Join SkillBattle and start with your own skill profile.</p></div>
            <div className="step-card"><span>02</span><h3>Practice or battle</h3><p>Sharpen your knowledge or jump into a live 1v1 match.</p></div>
            <div className="step-card"><span>03</span><h3>Earn your rank</h3><p>Build XP, rating and wins as you keep improving.</p></div>
          </div>
        </section>

        <section className="landing-cta">
          <div>
            <p className="section-kicker">READY?</p>
            <h2>Your next win starts here.</h2>
            <p>Create your account and enter the arena.</p>
          </div>
          <Link to="/register" className="hero-primary">Create free account <span>→</span></Link>
        </section>
      </main>

      <footer className="landing-footer">
        <span>Skill<span>Battle</span></span>
        <p>Test your skills. Battle the best.</p>
        <small>© {new Date().getFullYear()} SkillBattle</small>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/practice" element={<Practice />} />
      <Route path="/battle" element={<Battle />} />
      <Route path="/battle/room" element={<BattleRoom />} />
      <Route path="/battle-history" element={<BattleHistory />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/ai-generator" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default App;
