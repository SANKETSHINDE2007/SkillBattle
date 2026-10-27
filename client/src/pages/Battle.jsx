import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5000/api';

function Battle() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState([]);
  const [skill, setSkill] = useState('Programming');
  const [difficulty, setDifficulty] = useState('Medium');
  const [count, setCount] = useState(5);

  useEffect(() => {
    axios.get(`${API}/skills`)
      .then((response) => {
        const active = response.data.skills || [];
        setSkills(active);
        if (active.length && !active.some((item) => item.name === skill)) {
          setSkill(active[0].name);
        }
      })
      .catch(() => {
        setSkills([
          { name: 'Programming' }, { name: 'DBMS' }, { name: 'Networking' },
          { name: 'Aptitude' }, { name: 'Computer Science' }, { name: 'Web Development' },
        ]);
      });
  }, []);

  const handleStartBattle = () => {
    navigate('/battle/room', { state: { skill, difficulty, count } });
  };

  return (
    <div className="battle-page">
      <div className="page-grid" /><div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="battle-header">
        <div className="battle-icon">⚔️</div>
        <p className="eyebrow">LIVE COMPETITION / 1V1</p>
        <h1>Enter the <span>arena.</span></h1>
        <p>Configure your challenge and find an opponent with the same settings.</p>
      </header>
      <section className="battle-card reveal">
        <div className="battle-card-heading"><div><p className="eyebrow">MATCH SETTINGS</p><h2>Choose your rules</h2></div><span className="live-badge"><i /> MATCHMAKING LIVE</span></div>
        <div className="form-group"><label>Skill</label><select value={skill} onChange={(e) => setSkill(e.target.value)}>{skills.map((item) => <option key={item.name}>{item.name}</option>)}</select></div>
        <div className="form-group"><label>Difficulty</label><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
        <div className="form-group"><label>Questions</label><select value={count} onChange={(e) => setCount(Number(e.target.value))}><option value={5}>5 Questions</option><option value={10}>10 Questions</option><option value={15}>15 Questions</option><option value={20}>20 Questions</option></select></div>
        <div className="battle-info"><div><span>⚡</span><strong>Fast correct answers score more points.</strong></div><div><span>🏆</span><strong>Win to gain XP and competitive rating.</strong></div><div><span>🛡</span><strong>Questions are validated server-side.</strong></div></div>
        <button className="battle-button" onClick={handleStartBattle}>Find an opponent <b>→</b></button>
        <button className="back-button" onClick={() => navigate('/dashboard')}>← Back to dashboard</button>
      </section>
    </div>
  );
}

export default Battle;
