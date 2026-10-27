import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://skillbattle.onrender.com/api';

function Practice() {
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [skill, setSkill] = useState('Programming');
  const [skills, setSkills] = useState([]);
  const [difficulty, setDifficulty] = useState('Medium');
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API}/skills`)
      .then((response) => {
        const active = response.data.skills || [];
        setSkills(active);
        if (active.length && !active.some((item) => item.name === skill)) {
          setSkill(active[0].name);
        }
      })
      .catch(() => setSkills([
        { name: 'Programming' }, { name: 'DBMS' }, { name: 'Networking' },
        { name: 'Aptitude' }, { name: 'Computer Science' }, { name: 'Web Development' },
      ]));
  }, []);

  const startPractice = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/questions/practice`, {
        params: { skill, difficulty, count: Number(count) },
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuestions(response.data.questions || []);
      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setAnswers([]);
      setTimeLeft(30);
      setStarted(true);
      setFinished(false);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
        return;
      }
      setError(err.response?.data?.message || 'Failed to load practice questions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!started || finished || selectedAnswer !== null) return;
    if (timeLeft <= 0) {
      const updated = [...answers];
      updated[currentQuestion] = null;
      setAnswers(updated);
      moveToNextQuestion(updated);
      return;
    }
    const timer = setInterval(() => setTimeLeft((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [started, finished, timeLeft, selectedAnswer]);

  const handleAnswer = (index) => {
    if (selectedAnswer !== null) return;
    const updated = [...answers];
    updated[currentQuestion] = index;
    setAnswers(updated);
    setSelectedAnswer(index);
  };

  const moveToNextQuestion = (currentAnswers) => {
    if (currentQuestion === questions.length - 1) {
      setAnswers(currentAnswers);
      setStarted(false);
      setFinished(true);
      return;
    }
    setCurrentQuestion((value) => value + 1);
    setSelectedAnswer(null);
    setTimeLeft(30);
  };

  const calculateScore = () => questions.reduce(
    (score, question, index) => score + (answers[index] === question.correctAnswer ? 1 : 0), 0
  );

  const calculateXP = () => questions.reduce(
    (xp, question, index) => xp + (answers[index] === question.correctAnswer ? question.xpReward || 10 : 0), 0
  );

  const restart = () => {
    setStarted(false);
    setFinished(false);
    setQuestions([]);
    setAnswers([]);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setTimeLeft(30);
    setError('');
  };

  if (finished) {
    const score = calculateScore();
    const accuracy = questions.length ? Math.round((score / questions.length) * 100) : 0;
    const xp = calculateXP();

    return (
      <div className="practice-page">
        <div className="ambient ambient-one" /><div className="ambient ambient-two" />
        <main className="practice-shell result-shell">
          <button className="ghost-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
          <section className="practice-result reveal">
            <div className="result-orb">✦</div>
            <p className="eyebrow">SESSION COMPLETE</p>
            <h1>Practice <span>cleared.</span></h1>
            <p>Here is your performance breakdown for this session.</p>
            <div className="practice-result-stats">
              <div><small>SCORE</small><strong>{score}/{questions.length}</strong></div>
              <div><small>ACCURACY</small><strong>{accuracy}%</strong></div>
              <div><small>XP EARNED</small><strong>+{xp}</strong></div>
            </div>
            <button className="primary-btn" onClick={restart}>Practice again <b>→</b></button>
          </section>

          <section className="practice-review">
            <div className="section-title-row"><div><p className="eyebrow">ANSWER REVIEW</p><h2>Learn from every question</h2></div></div>
            {questions.map((question, index) => {
              const userAnswer = answers[index];
              const correct = userAnswer === question.correctAnswer;
              const unanswered = userAnswer === null || userAnswer === undefined;
              return (
                <article className="review-card" key={question._id || index}>
                  <div className="review-header">
                    <span>QUESTION {String(index + 1).padStart(2, '0')}</span>
                    <b className={correct ? 'review-correct' : 'review-wrong'}>{correct ? '✓ Correct' : unanswered ? '— Unanswered' : '✕ Incorrect'}</b>
                  </div>
                  <h3>{question.questionText}</h3>
                  <div className="review-options">
                    {question.options.map((option, optionIndex) => (
                      <div className={`${optionIndex === question.correctAnswer ? 'correct-option' : ''} ${optionIndex === userAnswer && !correct ? 'wrong-option' : ''}`} key={optionIndex}>
                        <span>{String.fromCharCode(65 + optionIndex)}</span>{option}
                        {optionIndex === question.correctAnswer && <b>✓</b>}
                        {optionIndex === userAnswer && !correct && <b>✕</b>}
                      </div>
                    ))}
                  </div>
                  <div className="answer-summary"><span>Your answer: <b>{unanswered ? 'Not answered' : question.options[userAnswer]}</b></span><span>Correct: <b>{question.options[question.correctAnswer]}</b></span></div>
                  {question.explanation && <div className="explanation-box"><b>💡 Explanation</b><p>{question.explanation}</p></div>}
                </article>
              );
            })}
          </section>
        </main>
      </div>
    );
  }

  if (started && questions.length) {
    const question = questions[currentQuestion];
    return (
      <div className="practice-page">
        <div className="ambient ambient-one" /><div className="ambient ambient-two" />
        <main className="practice-shell question-shell">
          <div className="practice-topbar">
            <button className="ghost-btn" onClick={() => navigate('/dashboard')}>← Exit</button>
            <div><p className="eyebrow">{skill} / {difficulty}</p><span>Question {currentQuestion + 1} of {questions.length}</span></div>
            <div className={`practice-timer ${timeLeft <= 10 ? 'danger' : ''}`}>◷ {timeLeft}s</div>
          </div>
          <div className="progress-track"><i style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }} /></div>
          <section className="practice-question-card reveal">
            <div className="question-index">QUESTION {String(currentQuestion + 1).padStart(2, '0')}</div>
            <h1>{question.questionText}</h1>
            <div className="practice-options">
              {question.options.map((option, index) => (
                <button className={`practice-option ${selectedAnswer === index ? 'selected' : ''}`} disabled={selectedAnswer !== null} onClick={() => handleAnswer(index)} key={index}>
                  <span>{String.fromCharCode(65 + index)}</span><strong>{option}</strong>{selectedAnswer === index && <b>✓</b>}
                </button>
              ))}
            </div>
            <button className="primary-btn full-btn" disabled={selectedAnswer === null} onClick={() => moveToNextQuestion(answers)}>
              {currentQuestion === questions.length - 1 ? 'Finish practice' : 'Next question'} <b>→</b>
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="practice-page">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="page-grid" />
      <main className="practice-shell">
        <button className="ghost-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        <section className="practice-setup reveal">
          <div className="setup-icon">🎯</div>
          <p className="eyebrow">SOLO TRAINING ARENA</p>
          <h1>Practice with <span>purpose.</span></h1>
          <p>Choose your skill, difficulty and session length. Every correct answer earns XP.</p>
          <div className="practice-form">
            <label>Skill<select value={skill} onChange={(e) => setSkill(e.target.value)}>{skills.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
            <label>Difficulty<select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select></label>
            <label>Questions<select value={count} onChange={(e) => setCount(Number(e.target.value))}><option value={5}>5 Questions</option><option value={10}>10 Questions</option><option value={15}>15 Questions</option><option value={20}>20 Questions</option></select></label>
          </div>
          {error && <div className="admin-alert error">{error}</div>}
          <button className="primary-btn full-btn" disabled={loading} onClick={startPractice}>{loading ? 'Loading arena...' : 'Start practice'} <b>→</b></button>
          <div className="practice-note"><span>◷</span> 30 seconds per question <span>✦</span> XP based on accuracy <span>✓</span> Detailed review</div>
        </section>
      </main>
    </div>
  );
}

export default Practice;
