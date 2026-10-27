import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AIQuestionGenerator from './AIQuestionGenerator';

const API = 'https://skillbattle.onrender.com/api';

const emptyQuestion = {
  skill: 'Programming',
  questionText: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  difficulty: 'Medium',
  explanation: '',
  xpReward: 15,
};

const emptySkill = {
  name: '',
  description: '',
  icon: '◈',
};

function AdminPanel() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [skills, setSkills] = useState([]);
  const [battles, setBattles] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [userSearch, setUserSearch] = useState('');
  const [userStatus, setUserStatus] = useState('all');
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionSkill, setQuestionSkill] = useState('all');
  const [questionDifficulty, setQuestionDifficulty] = useState('all');

  const [editUser, setEditUser] = useState(null);
  const [questionForm, setQuestionForm] = useState(null);
  const [skillForm, setSkillForm] = useState(null);

  const clearMessages = () => {
    setError('');
    setNotice('');
  };

  const handleAuthError = useCallback((err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login', { replace: true });
      return true;
    }
    if (err.response?.status === 403) {
      navigate('/dashboard', { replace: true });
      return true;
    }
    return false;
  }, [navigate]);

  const loadStats = useCallback(async () => {
    const response = await axios.get(`${API}/admin/stats`, { headers });
    setStats(response.data.stats);
  }, [headers]);

  const loadUsers = useCallback(async () => {
    const response = await axios.get(`${API}/admin/users`, {
      headers,
      params: {
        search: userSearch,
        status: userStatus,
        limit: 100,
      },
    });
    setUsers(response.data.users || []);
  }, [headers, userSearch, userStatus]);

  const loadQuestions = useCallback(async () => {
    const response = await axios.get(`${API}/admin/questions`, {
      headers,
      params: {
        search: questionSearch,
        skill: questionSkill,
        difficulty: questionDifficulty,
      },
    });
    setQuestions(response.data.questions || []);
  }, [headers, questionSearch, questionSkill, questionDifficulty]);

  const loadSkills = useCallback(async () => {
    const response = await axios.get(`${API}/admin/skills`, { headers });
    setSkills(response.data.skills || []);
  }, [headers]);

  const loadBattles = useCallback(async () => {
    const response = await axios.get(`${API}/admin/battles`, {
      headers,
      params: { limit: 150 },
    });
    setBattles(response.data.battles || []);
  }, [headers]);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    const boot = async () => {
      try {
        const me = await axios.get(`${API}/auth/me`, { headers });
        localStorage.setItem('user', JSON.stringify(me.data.user));

        if (!me.data.user.isAdmin) {
          navigate('/dashboard', { replace: true });
          return;
        }

        await loadStats();
      } catch (err) {
        if (!handleAuthError(err)) {
          setError(err.response?.data?.message || 'Failed to load administration console.');
        }
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, [token, headers, navigate, loadStats, handleAuthError]);

  useEffect(() => {
    if (loading) return;

    const loadTab = async () => {
      setSectionLoading(true);
      clearMessages();
      try {
        if (tab === 'users') await loadUsers();
        if (tab === 'questions') await loadQuestions();
        if (tab === 'skills') await loadSkills();
        if (tab === 'battles') await loadBattles();
        if (tab === 'overview') await loadStats();
      } catch (err) {
        if (!handleAuthError(err)) {
          setError(err.response?.data?.message || 'Unable to load this section.');
        }
      } finally {
        setSectionLoading(false);
      }
    };

    loadTab();
  }, [tab, loading, loadUsers, loadQuestions, loadSkills, loadBattles, loadStats, handleAuthError]);

  const refreshAll = async () => {
    clearMessages();
    try {
      await loadStats();
      if (tab === 'users') await loadUsers();
      if (tab === 'questions') await loadQuestions();
      if (tab === 'skills') await loadSkills();
      if (tab === 'battles') await loadBattles();
      setNotice('Admin data refreshed.');
    } catch (err) {
      if (!handleAuthError(err)) setError(err.response?.data?.message || 'Refresh failed.');
    }
  };

  const viewUser = async (id) => {
    clearMessages();
    try {
      const response = await axios.get(`${API}/admin/users/${id}`, { headers });
      setSelectedUser(response.data);
    } catch (err) {
      if (!handleAuthError(err)) setError(err.response?.data?.message || 'Unable to load user.');
    }
  };

  const saveUser = async () => {
    clearMessages();
    try {
      const response = await axios.patch(
        `${API}/admin/users/${editUser._id}`,
        {
          fullName: editUser.fullName,
          email: editUser.email,
          xp: editUser.xp,
          level: editUser.level,
          rating: editUser.rating,
          wins: editUser.wins,
          losses: editUser.losses,
          isAdmin: editUser.isAdmin,
        },
        { headers }
      );
      setNotice('User account updated successfully.');
      setEditUser(null);
      setSelectedUser(null);
      await loadUsers();
      await loadStats();
      await viewUser(response.data.user.id);
    } catch (err) {
      if (!handleAuthError(err)) setError(err.response?.data?.message || 'Unable to update user.');
    }
  };

  const toggleBan = async (user) => {
    clearMessages();
    if (user.isBanned) {
      if (!window.confirm(`Unban ${user.fullName}?`)) return;
      try {
        await axios.post(`${API}/admin/users/${user._id || user.id}/unban`, {}, { headers });
        setNotice(`${user.fullName} has been unbanned.`);
      } catch (err) {
        if (!handleAuthError(err)) setError(err.response?.data?.message || 'Unable to unban user.');
        return;
      }
    } else {
      const reason = window.prompt('Ban reason:', 'Account restricted by administrator');
      if (reason === null) return;
      try {
        await axios.post(`${API}/admin/users/${user._id || user.id}/ban`, { reason }, { headers });
        setNotice(`${user.fullName} has been banned.`);
      } catch (err) {
        if (!handleAuthError(err)) setError(err.response?.data?.message || 'Unable to ban user.');
        return;
      }
    }
    await loadUsers();
    await loadStats();
  };

  const resetPassword = async (user) => {
    const newPassword = window.prompt(
      `Set a new password for ${user.fullName}:`,
      'SkillBattle@123'
    );
    if (newPassword === null) return;
    if (newPassword.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    clearMessages();
    try {
      await axios.post(
        `${API}/admin/users/${user._id || user.id}/reset-password`,
        { newPassword },
        { headers }
      );
      setNotice(`Password reset for ${user.fullName}.`);
    } catch (err) {
      if (!handleAuthError(err)) setError(err.response?.data?.message || 'Unable to reset password.');
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.fullName} permanently? Their battle history will also be removed.`)) return;

    clearMessages();
    try {
      await axios.delete(`${API}/admin/users/${user._id || user.id}`, { headers });
      setSelectedUser(null);
      setNotice(`${user.fullName} was permanently deleted.`);
      await loadUsers();
      await loadStats();
    } catch (err) {
      if (!handleAuthError(err)) setError(err.response?.data?.message || 'Unable to delete user.');
    }
  };

  const saveQuestion = async () => {
    clearMessages();
    try {
      const payload = {
        ...questionForm,
        correctAnswer: Number(questionForm.correctAnswer),
        xpReward: Number(questionForm.xpReward),
      };

      if (questionForm._id) {
        await axios.patch(`${API}/admin/questions/${questionForm._id}`, payload, { headers });
        setNotice('Question updated successfully.');
      } else {
        await axios.post(`${API}/admin/questions`, payload, { headers });
        setNotice('Question created successfully.');
      }

      setQuestionForm(null);
      await loadQuestions();
      await loadStats();
    } catch (err) {
      if (!handleAuthError(err)) setError(err.response?.data?.message || 'Unable to save question.');
    }
  };

  const deleteQuestion = async (question) => {
    if (!window.confirm('Delete this question permanently?')) return;
    clearMessages();
    try {
      await axios.delete(`${API}/admin/questions/${question._id}`, { headers });
      setNotice('Question deleted.');
      await loadQuestions();
      await loadStats();
    } catch (err) {
      if (!handleAuthError(err)) setError(err.response?.data?.message || 'Unable to delete question.');
    }
  };

  const saveSkill = async () => {
    clearMessages();
    try {
      if (skillForm._id) {
        await axios.patch(`${API}/admin/skills/${skillForm._id}`, skillForm, { headers });
        setNotice('Skill updated.');
      } else {
        await axios.post(`${API}/admin/skills`, skillForm, { headers });
        setNotice('Skill created.');
      }
      setSkillForm(null);
      await loadSkills();
    } catch (err) {
      if (!handleAuthError(err)) setError(err.response?.data?.message || 'Unable to save skill.');
    }
  };

  const toggleSkill = async (skill) => {
    clearMessages();
    try {
      await axios.patch(
        `${API}/admin/skills/${skill._id}`,
        { active: !skill.active },
        { headers }
      );
      setNotice(`${skill.name} is now ${skill.active ? 'inactive' : 'active'}.`);
      await loadSkills();
    } catch (err) {
      if (!handleAuthError(err)) setError(err.response?.data?.message || 'Unable to update skill.');
    }
  };

  const deleteSkill = async (skill) => {
    if (!window.confirm(`Delete ${skill.name}?`)) return;
    clearMessages();
    try {
      await axios.delete(`${API}/admin/skills/${skill._id}`, { headers });
      setNotice('Skill deleted.');
      await loadSkills();
    } catch (err) {
      if (!handleAuthError(err)) setError(err.response?.data?.message || 'Unable to delete skill.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="admin-page admin-loading-page">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <div className="admin-loader"><span /> Loading command center...</div>
      </div>
    );
  }

  const statCards = [
    ['👥', 'Total Users', stats?.users ?? 0, 'accounts'],
    ['🟢', 'Online Now', stats?.activeUsers ?? 0, 'live sessions'],
    ['🚫', 'Banned', stats?.bannedUsers ?? 0, 'restricted'],
    ['📝', 'Questions', stats?.questions ?? 0, 'question bank'],
    ['⚔️', 'Battles', stats?.battles ?? 0, 'completed records'],
    ['🛡️', 'Admins', stats?.admins ?? 0, 'privileged accounts'],
  ];

  return (
    <div className="admin-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <header className="admin-topbar">
        <button className="admin-brand" onClick={() => navigate('/dashboard')}>
          Skill<span>Battle</span><small>COMMAND CENTER</small>
        </button>

        <div className="admin-top-actions">
          <button className="ghost-btn" onClick={refreshAll}>↻ Refresh</button>
          <button className="ghost-btn" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="admin-avatar" onClick={logout}>A</button>
        </div>
      </header>

      <main className="admin-shell">
        <section className="admin-hero">
          <div>
            <p className="eyebrow">ADMINISTRATION / SYSTEM CONTROL</p>
            <h1>Everything under <span>one roof.</span></h1>
            <p>
              Manage accounts, competitive records, questions, skills and AI-powered content
              from a secure administrator workspace.
            </p>
          </div>
          <div className="admin-status">
            <span className="status-dot" />
            SYSTEM OPERATIONAL
            <small>Protected administrator session</small>
          </div>
        </section>

        <div className="admin-layout">
          <aside className="admin-sidebar">
            {[
              ['overview', '⌂', 'Overview'],
              ['users', '◉', 'Users'],
              ['questions', '▣', 'Questions'],
              ['skills', '◇', 'Skills'],
              ['battles', '⚔', 'Battles'],
              ['ai', '✦', 'AI Generator'],
            ].map(([key, icon, label]) => (
              <button
                key={key}
                className={`admin-nav-item ${tab === key ? 'active' : ''}`}
                onClick={() => setTab(key)}
              >
                <span>{icon}</span>{label}
              </button>
            ))}
          </aside>

          <section className="admin-content">
            {error && <div className="admin-alert error">{error}</div>}
            {notice && <div className="admin-alert success">{notice}</div>}

            {tab === 'overview' && (
              <>
                <div className="admin-stat-grid">
                  {statCards.map(([icon, label, value, hint]) => (
                    <div className="admin-stat-card" key={label}>
                      <span className="admin-stat-icon">{icon}</span>
                      <div>
                        <small>{label}</small>
                        <strong>{value}</strong>
                        <em>{hint}</em>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="admin-overview-grid">
                  <div className="admin-panel-card">
                    <div className="card-heading">
                      <div>
                        <p className="eyebrow">QUESTION DISTRIBUTION</p>
                        <h2>Skill coverage</h2>
                      </div>
                      <button className="mini-btn" onClick={() => setTab('questions')}>Manage</button>
                    </div>
                    <div className="skill-bars">
                      {(stats?.skills || []).map((item) => {
                        const max = Math.max(...(stats?.skills || []).map((x) => x.count), 1);
                        return (
                          <div className="skill-bar-row" key={item._id}>
                            <div><span>{item._id}</span><strong>{item.count}</strong></div>
                            <div className="bar-track"><i style={{ width: `${(item.count / max) * 100}%` }} /></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="admin-panel-card admin-quick-actions">
                    <p className="eyebrow">QUICK CONTROL</p>
                    <h2>Administrative actions</h2>
                    <button onClick={() => setTab('users')}>👥 Manage users <span>→</span></button>
                    <button onClick={() => { setTab('questions'); setQuestionForm({ ...emptyQuestion }); }}>＋ Create question <span>→</span></button>
                    <button onClick={() => setTab('ai')}>✦ Generate with AI <span>→</span></button>
                    <button onClick={() => setTab('battles')}>⚔ Inspect battle records <span>→</span></button>
                  </div>
                </div>
              </>
            )}

            {tab === 'users' && (
              <div className="admin-section">
                <div className="section-title-row">
                  <div><p className="eyebrow">ACCOUNT MANAGEMENT</p><h2>Users</h2><span>Control every account without touching the database manually.</span></div>
                  <div className="section-count">{users.length} shown</div>
                </div>

                <div className="admin-toolbar">
                  <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search name, email or ID..." />
                  <select value={userStatus} onChange={(e) => setUserStatus(e.target.value)}>
                    <option value="all">All accounts</option>
                    <option value="active">Active</option>
                    <option value="banned">Banned</option>
                    <option value="admins">Admins</option>
                  </select>
                  <button className="mini-btn" onClick={loadUsers}>Search</button>
                </div>

                {sectionLoading ? <div className="inline-loader">Loading users...</div> : (
                  <div className="table-card">
                    <table className="admin-table">
                      <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Stats</th><th>Last seen</th><th>Actions</th></tr></thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user._id}>
                            <td>
                              <button className="user-cell" onClick={() => viewUser(user._id)}>
                                <span className="user-avatar">{user.fullName?.charAt(0)?.toUpperCase()}</span>
                                <span><strong>{user.fullName}</strong><small>{user.email}</small></span>
                              </button>
                            </td>
                            <td><span className={`role-pill ${user.isAdmin ? 'admin' : ''}`}>{user.isAdmin ? 'ADMIN' : 'USER'}</span></td>
                            <td><span className={`status-pill ${user.isBanned ? 'banned' : user.online ? 'online' : ''}`}><i />{user.isBanned ? 'Banned' : user.online ? 'Online' : 'Offline'}</span></td>
                            <td><small>{user.xp} XP · {user.rating} R</small><br /><small>{user.wins}W / {user.losses}L</small></td>
                            <td><small>{user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString('en-IN') : '—'}</small></td>
                            <td>
                              <div className="row-actions">
                                <button onClick={() => viewUser(user._id)}>View</button>
                                <button onClick={() => setEditUser({ ...user })}>Edit</button>
                                <button onClick={() => toggleBan(user)}>{user.isBanned ? 'Unban' : 'Ban'}</button>
                                <button onClick={() => resetPassword(user)}>Reset</button>
                                <button className="danger-text" onClick={() => deleteUser(user)}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!users.length && <div className="empty-state">No users match your filters.</div>}
                  </div>
                )}
              </div>
            )}

            {tab === 'questions' && (
              <div className="admin-section">
                <div className="section-title-row">
                  <div><p className="eyebrow">CONTENT MANAGEMENT</p><h2>Question Bank</h2><span>Create, edit, remove and inspect every assessment question.</span></div>
                  <button className="primary-btn" onClick={() => setQuestionForm({ ...emptyQuestion })}>＋ Add Question</button>
                </div>

                <div className="admin-toolbar">
                  <input value={questionSearch} onChange={(e) => setQuestionSearch(e.target.value)} placeholder="Search question text..." />
                  <select value={questionSkill} onChange={(e) => setQuestionSkill(e.target.value)}>
                    <option value="all">All skills</option>
                    {skills.map((skill) => <option key={skill._id} value={skill.name}>{skill.name}</option>)}
                  </select>
                  <select value={questionDifficulty} onChange={(e) => setQuestionDifficulty(e.target.value)}>
                    <option value="all">All levels</option><option>Easy</option><option>Medium</option><option>Hard</option>
                  </select>
                  <button className="mini-btn" onClick={loadQuestions}>Filter</button>
                </div>

                <div className="question-admin-grid">
                  {questions.map((question) => (
                    <article className="question-admin-card" key={question._id}>
                      <div className="question-card-meta"><span>{question.skill}</span><span>{question.difficulty}</span><span>{question.xpReward} XP</span></div>
                      <h3>{question.questionText}</h3>
                      <div className="question-admin-options">
                        {question.options.map((option, index) => <div className={index === question.correctAnswer ? 'correct' : ''} key={index}><b>{String.fromCharCode(65 + index)}</b>{option}</div>)}
                      </div>
                      <div className="question-card-actions"><button onClick={() => setQuestionForm({ ...question, options: [...question.options] })}>Edit</button><button className="danger-text" onClick={() => deleteQuestion(question)}>Delete</button></div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {tab === 'skills' && (
              <div className="admin-section">
                <div className="section-title-row">
                  <div><p className="eyebrow">TAXONOMY</p><h2>Skills & Categories</h2><span>Control which skill categories are available to the platform.</span></div>
                  <button className="primary-btn" onClick={() => setSkillForm({ ...emptySkill })}>＋ Add Skill</button>
                </div>
                <div className="skill-admin-grid">
                  {skills.map((skill) => (
                    <article className={`skill-admin-card ${!skill.active ? 'inactive' : ''}`} key={skill._id}>
                      <div className="skill-admin-icon">{skill.icon}</div>
                      <div><span className="status-pill">{skill.active ? 'ACTIVE' : 'INACTIVE'}</span><h3>{skill.name}</h3><p>{skill.description || 'No description added.'}</p><small>{skill.questionCount} questions</small></div>
                      <div className="skill-admin-actions"><button onClick={() => setSkillForm({ ...skill })}>Edit</button><button onClick={() => toggleSkill(skill)}>{skill.active ? 'Deactivate' : 'Activate'}</button><button className="danger-text" onClick={() => deleteSkill(skill)}>Delete</button></div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {tab === 'battles' && (
              <div className="admin-section">
                <div className="section-title-row">
                  <div><p className="eyebrow">COMPETITIVE RECORDS</p><h2>Battle Records</h2><span>Inspect recent completed battles across the platform.</span></div>
                  <div className="section-count">{battles.length} records</div>
                </div>
                <div className="table-card">
                  <table className="admin-table">
                    <thead><tr><th>Player</th><th>Opponent</th><th>Result</th><th>Score</th><th>Skill</th><th>Played</th></tr></thead>
                    <tbody>
                      {battles.map((battle) => (
                        <tr key={battle._id}>
                          <td><strong>{battle.userId}</strong></td>
                          <td>{battle.opponentName}</td>
                          <td><span className={`result-pill ${battle.result}`}>{battle.result.toUpperCase()}</span></td>
                          <td><strong>{battle.score} — {battle.opponentScore}</strong><small>{battle.correct} / {battle.opponentCorrect} correct</small></td>
                          <td>{battle.skill}<br /><small>{battle.difficulty} · {battle.questionCount}Q</small></td>
                          <td><small>{new Date(battle.createdAt).toLocaleString('en-IN')}</small></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!battles.length && <div className="empty-state">No completed battles yet.</div>}
                </div>
              </div>
            )}

            {tab === 'ai' && (
              <div className="admin-section">
                <div className="section-title-row">
                  <div><p className="eyebrow">INTELLIGENT CONTENT</p><h2>AI Question Studio</h2><span>Generate validated questions and send them directly into the bank.</span></div>
                </div>
                <AIQuestionGenerator embedded />
              </div>
            )}
          </section>
        </div>
      </main>

      {selectedUser && (
        <div className="modal-backdrop" onMouseDown={() => setSelectedUser(null)}>
          <div className="admin-modal user-detail-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedUser(null)}>×</button>
            <div className="modal-user-head">
              <div className="modal-avatar">{selectedUser.user.fullName?.charAt(0)?.toUpperCase()}</div>
              <div><p className="eyebrow">USER PROFILE</p><h2>{selectedUser.user.fullName}</h2><span>{selectedUser.user.email}</span></div>
              <span className={`status-pill ${selectedUser.user.isBanned ? 'banned' : selectedUser.user.online ? 'online' : ''}`}><i />{selectedUser.user.isBanned ? 'BANNED' : selectedUser.user.online ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
            <div className="detail-stat-grid">
              <div><small>XP</small><strong>{selectedUser.user.xp}</strong></div><div><small>LEVEL</small><strong>{selectedUser.user.level}</strong></div><div><small>RATING</small><strong>{selectedUser.user.rating}</strong></div><div><small>RECORD</small><strong>{selectedUser.user.wins}W / {selectedUser.user.losses}L</strong></div>
            </div>
            <div className="detail-meta"><span>Joined <b>{new Date(selectedUser.user.createdAt).toLocaleString('en-IN')}</b></span><span>Last seen <b>{selectedUser.user.lastSeenAt ? new Date(selectedUser.user.lastSeenAt).toLocaleString('en-IN') : '—'}</b></span><span>Role <b>{selectedUser.user.isAdmin ? 'Administrator' : 'User'}</b></span></div>
            {selectedUser.user.isBanned && <div className="ban-note">🚫 <b>Ban reason:</b> {selectedUser.user.banReason || 'No reason supplied.'}</div>}
            <div className="modal-actions"><button className="primary-btn" onClick={() => setEditUser({ ...selectedUser.user })}>Edit account</button><button className="ghost-btn" onClick={() => resetPassword(selectedUser.user)}>Reset password</button><button className="ghost-btn" onClick={() => toggleBan(selectedUser.user)}>{selectedUser.user.isBanned ? 'Unban account' : 'Ban account'}</button><button className="danger-btn" onClick={() => deleteUser(selectedUser.user)}>Delete account</button></div>
            <div className="detail-history"><div className="card-heading"><h3>Recent battle activity</h3><span>{selectedUser.battles?.length || 0} records</span></div>{selectedUser.battles?.slice(0, 8).map((battle) => <div className="detail-battle-row" key={battle._id}><span className={`result-pill ${battle.result}`}>{battle.result.toUpperCase()}</span><strong>vs {battle.opponentName}</strong><span>{battle.score} — {battle.opponentScore}</span><small>{new Date(battle.createdAt).toLocaleString('en-IN')}</small></div>)}</div>
          </div>
        </div>
      )}

      {editUser && (
        <div className="modal-backdrop" onMouseDown={() => setEditUser(null)}>
          <div className="admin-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setEditUser(null)}>×</button>
            <p className="eyebrow">ACCOUNT EDITOR</p><h2>Modify user account</h2>
            <div className="modal-form-grid">
              <label>Full name<input value={editUser.fullName || ''} onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })} /></label>
              <label>Email<input value={editUser.email || ''} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} /></label>
              <label>XP<input type="number" value={editUser.xp ?? 0} onChange={(e) => setEditUser({ ...editUser, xp: e.target.value })} /></label>
              <label>Level<input type="number" value={editUser.level ?? 1} onChange={(e) => setEditUser({ ...editUser, level: e.target.value })} /></label>
              <label>Rating<input type="number" value={editUser.rating ?? 1000} onChange={(e) => setEditUser({ ...editUser, rating: e.target.value })} /></label>
              <label>Wins<input type="number" value={editUser.wins ?? 0} onChange={(e) => setEditUser({ ...editUser, wins: e.target.value })} /></label>
              <label>Losses<input type="number" value={editUser.losses ?? 0} onChange={(e) => setEditUser({ ...editUser, losses: e.target.value })} /></label>
              <label>Role<select value={editUser.isAdmin ? 'admin' : 'user'} onChange={(e) => setEditUser({ ...editUser, isAdmin: e.target.value === 'admin' })}><option value="user">User</option><option value="admin">Administrator</option></select></label>
            </div>
            <div className="modal-actions"><button className="ghost-btn" onClick={() => setEditUser(null)}>Cancel</button><button className="primary-btn" onClick={saveUser}>Save changes</button></div>
          </div>
        </div>
      )}

      {questionForm && (
        <div className="modal-backdrop" onMouseDown={() => setQuestionForm(null)}>
          <div className="admin-modal question-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setQuestionForm(null)}>×</button>
            <p className="eyebrow">QUESTION EDITOR</p><h2>{questionForm._id ? 'Edit question' : 'Create question'}</h2>
            <div className="modal-form-grid">
              <label>Skill<select value={questionForm.skill} onChange={(e) => setQuestionForm({ ...questionForm, skill: e.target.value })}>{skills.map((s) => <option key={s._id}>{s.name}</option>)}</select></label>
              <label>Difficulty<select value={questionForm.difficulty} onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}><option>Easy</option><option>Medium</option><option>Hard</option></select></label>
              <label>XP reward<input type="number" min="0" value={questionForm.xpReward} onChange={(e) => setQuestionForm({ ...questionForm, xpReward: e.target.value })} /></label>
              <label className="full-field">Question<textarea value={questionForm.questionText} onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })} /></label>
              {questionForm.options.map((option, index) => <label key={index}>Option {String.fromCharCode(65 + index)}<input value={option} onChange={(e) => { const options = [...questionForm.options]; options[index] = e.target.value; setQuestionForm({ ...questionForm, options }); }} /></label>)}
              <label>Correct option<select value={questionForm.correctAnswer} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: Number(e.target.value) })}>{questionForm.options.map((_, index) => <option key={index} value={index}>{String.fromCharCode(65 + index)}</option>)}</select></label>
              <label className="full-field">Explanation<textarea value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} /></label>
            </div>
            <div className="modal-actions"><button className="ghost-btn" onClick={() => setQuestionForm(null)}>Cancel</button><button className="primary-btn" onClick={saveQuestion}>Save question</button></div>
          </div>
        </div>
      )}

      {skillForm && (
        <div className="modal-backdrop" onMouseDown={() => setSkillForm(null)}>
          <div className="admin-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSkillForm(null)}>×</button>
            <p className="eyebrow">SKILL EDITOR</p><h2>{skillForm._id ? 'Edit skill' : 'Create skill'}</h2>
            <div className="modal-form-grid">
              <label>Skill name<input value={skillForm.name} onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })} /></label>
              <label>Icon<input value={skillForm.icon} onChange={(e) => setSkillForm({ ...skillForm, icon: e.target.value })} /></label>
              <label className="full-field">Description<textarea value={skillForm.description} onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })} /></label>
            </div>
            <div className="modal-actions"><button className="ghost-btn" onClick={() => setSkillForm(null)}>Cancel</button><button className="primary-btn" onClick={saveSkill}>Save skill</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
