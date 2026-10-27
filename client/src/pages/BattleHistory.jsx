import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BattleHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    const loadHistory = async () => {
      try {
        const response = await axios.get(
          'https://skillbattle.onrender.com/api/battle-history',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setHistory(response.data.history || []);
      } catch (err) {
        console.error('Battle history load error:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login', { replace: true });
          return;
        }
        setError('Unable to load battle history.');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [navigate]);

  const formatDate = (value) =>
    new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="history-page">
      <div className="history-shell">
        <div className="history-header">
          <div>
            <p className="small-label">BATTLE RECORD</p>
            <h1>Battle History</h1>
            <p>Review your previous 1v1 battles and results.</p>
          </div>
          <button className="history-back" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
        </div>

        {loading ? (
          <div className="history-empty">
            <div className="history-empty-icon">⚔️</div>
            <h2>Loading battles...</h2>
          </div>
        ) : error ? (
          <div className="history-empty">
            <div className="history-empty-icon">⚠️</div>
            <h2>{error}</h2>
          </div>
        ) : history.length === 0 ? (
          <div className="history-empty">
            <div className="history-empty-icon">⚔️</div>
            <h2>No battles yet</h2>
            <p>Complete your first 1v1 battle and it will appear here.</p>
            <button onClick={() => navigate('/battle')}>Start a Battle →</button>
          </div>
        ) : (
          <div className="history-list">
            {history.map((battle) => (
              <article className="history-card" key={battle._id}>
                <div className={`history-result ${battle.result}`}>
                  {battle.result === 'win' ? 'W' : battle.result === 'lose' ? 'L' : 'D'}
                </div>

                <div className="history-main">
                  <div className="history-title-row">
                    <h3>vs {battle.opponentName}</h3>
                    <span className={`history-badge ${battle.result}`}>
                      {battle.result.toUpperCase()}
                    </span>
                  </div>
                  <p>
                    {battle.skill} • {battle.difficulty} • {battle.questionCount} questions
                  </p>
                  <small>{formatDate(battle.createdAt)}</small>
                </div>

                <div className="history-score">
                  <span>Score</span>
                  <strong>{battle.score} — {battle.opponentScore}</strong>
                  <small>{battle.correct} correct • {battle.opponentCorrect} correct</small>
                </div>

                <div className="history-reward">
                  <strong>{battle.xpEarned > 0 ? `+${battle.xpEarned}` : battle.xpEarned} XP</strong>
                  <span className={battle.ratingChange >= 0 ? 'positive' : 'negative'}>
                    {battle.ratingChange > 0 ? '+' : ''}{battle.ratingChange} rating
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BattleHistory;
