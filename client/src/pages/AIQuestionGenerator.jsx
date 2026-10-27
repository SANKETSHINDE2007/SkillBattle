import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

function AIQuestionGenerator({ embedded = false }) {
  const navigate = useNavigate();
  const [skill, setSkill] = useState('Programming');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const generateQuestions = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    setQuestions([]);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/ai-questions/generate`,
        { skill, topic, difficulty, count: Number(count) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setQuestions(response.data.questions || []);
      setNotice(response.data.message || 'Questions generated successfully.');
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      if (err.response?.status === 403) {
        navigate('/dashboard');
        return;
      }
      setError(err.response?.data?.message || 'Failed to generate questions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`ai-studio ${embedded ? 'embedded' : ''}`}>
      {!embedded && (
        <button className="ghost-btn ai-back" onClick={() => navigate('/admin')}>
          ← Back to Admin Panel
        </button>
      )}

      <div className="ai-hero">
        <div className="ai-orb">✦</div>
        <div>
          <p className="eyebrow">GEMINI POWERED</p>
          <h1>AI Question Studio</h1>
          <p>Generate validated MCQs and automatically save them to your SkillBattle question bank.</p>
        </div>
      </div>

      <div className="ai-generator-grid">
        <div className="ai-form-card">
          <div className="ai-form-row">
            <label>Skill<select value={skill} onChange={(e) => setSkill(e.target.value)}>
              <option>Programming</option><option>DBMS</option><option>Networking</option>
              <option>Aptitude</option><option>Computer Science</option><option>Web Development</option>
            </select></label>
            <label>Difficulty<select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option>Easy</option><option>Medium</option><option>Hard</option>
            </select></label>
          </div>
          <label>Topic / focus<input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. JavaScript closures, SQL joins..." /></label>
          <label>Number of questions<input type="number" min="1" max="20" value={count} onChange={(e) => setCount(e.target.value)} /></label>
          <button className="primary-btn ai-generate-btn" onClick={generateQuestions} disabled={loading}>
            <span>{loading ? 'Generating...' : '✦ Generate & Save Questions'}</span>
            {!loading && <b>→</b>}
          </button>
          {error && <div className="admin-alert error">{error}</div>}
          {notice && <div className="admin-alert success">{notice}</div>}
        </div>

        <div className="ai-side-card">
          <p className="eyebrow">AUTOMATED VALIDATION</p>
          <h3>Built for the question bank</h3>
          <div className="ai-check">✓ Exactly four options</div>
          <div className="ai-check">✓ Single correct answer</div>
          <div className="ai-check">✓ Difficulty + XP assigned</div>
          <div className="ai-check">✓ Explanation included</div>
          <div className="ai-check">✓ Saved to MongoDB</div>
        </div>
      </div>

      {questions.length > 0 && (
        <div className="ai-results">
          <div className="section-title-row">
            <div><p className="eyebrow">GENERATED OUTPUT</p><h2>{questions.length} new questions</h2></div>
          </div>
          <div className="question-admin-grid">
            {questions.map((question, index) => (
              <article className="question-admin-card ai-result-card" key={question._id || index}>
                <div className="question-card-meta"><span>{skill}</span><span>{difficulty}</span><span>NEW</span></div>
                <h3>{index + 1}. {question.questionText}</h3>
                <div className="question-admin-options">
                  {question.options.map((option, optionIndex) => (
                    <div className={optionIndex === question.correctAnswer ? 'correct' : ''} key={optionIndex}>
                      <b>{String.fromCharCode(65 + optionIndex)}</b>{option}
                    </div>
                  ))}
                </div>
                <p className="ai-explanation"><b>Explanation:</b> {question.explanation || 'No explanation returned.'}</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AIQuestionGenerator;
