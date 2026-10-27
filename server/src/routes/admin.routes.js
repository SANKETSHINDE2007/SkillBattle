import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import User from '../models/user.js';
import Question from '../models/Question.js';
import BattleHistory from '../models/BattleHistory.js';
import Skill from '../models/Skill.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import { onlineUsers } from '../services/presence.service.js';
import { isAdminUser, publicUser } from '../controllers/auth.controller.js';

const router = express.Router();

const DEFAULT_SKILLS = [
  { name: 'Programming', description: 'C, C++, Python, JavaScript', icon: '💻' },
  { name: 'DBMS', description: 'SQL, MongoDB and database concepts', icon: '🗄️' },
  { name: 'Networking', description: 'Networks, protocols and security', icon: '🌐' },
  { name: 'Aptitude', description: 'Logical, quantitative and reasoning', icon: '🧠' },
  { name: 'Computer Science', description: 'OS, data structures and algorithms', icon: '⚙️' },
  { name: 'Web Development', description: 'HTML, CSS, JavaScript and React', icon: '🚀' },
];

const ensureDefaultSkills = async () => {
  for (const skill of DEFAULT_SKILLS) {
    await Skill.updateOne(
      { name: skill.name },
      { $setOnInsert: skill },
      { upsert: true }
    );
  }
};

const safeUser = (user) => ({
  ...publicUser(user),
  online: onlineUsers.has(String(user._id)),
});

const parseId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateQuestionPayload = (body) => {
  const {
    skill,
    questionText,
    options,
    correctAnswer,
    difficulty,
    explanation,
    xpReward,
  } = body;

  if (!skill || !questionText || !Array.isArray(options) || options.length !== 4) {
    return 'Skill, question text and exactly 4 options are required';
  }

  const answer = Number(correctAnswer);
  if (!Number.isInteger(answer) || answer < 0 || answer > 3) {
    return 'Correct answer must be between 0 and 3';
  }

  if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
    return 'Invalid difficulty';
  }

  if (options.some((option) => !String(option).trim())) {
    return 'All four options are required';
  }

  if (xpReward !== undefined && (Number(xpReward) < 0 || Number.isNaN(Number(xpReward)))) {
    return 'XP reward must be a valid positive number';
  }

  return null;
};

// ==========================================
// SYSTEM HEALTH
// ==========================================

router.get('/health', requireAdmin, async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    res.json({
      success: true,
      health: {
        api: 'operational',
        database: dbState === 1 ? 'connected' : 'disconnected',
        databaseState: dbState,
        onlineUsers: onlineUsers.size,
        uptimeSeconds: Math.round(process.uptime()),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load system health',
    });
  }
});

// ==========================================
// DASHBOARD STATS
// ==========================================

router.get('/stats', requireAdmin, async (req, res) => {
  try {
    await ensureDefaultSkills();

    const [
      users,
      bannedUsers,
      adminsCount,
      questions,
      battles,
      battlesToday,
      usersToday,
      activeBattles,
      skillRows,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ isAdmin: true }),
      Question.countDocuments(),
      BattleHistory.countDocuments(),
      BattleHistory.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
      User.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
      Promise.resolve(globalThis.__skillBattleActiveBattles || 0),
      Question.aggregate([
        { $group: { _id: '$skill', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const configuredAdmin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const configuredAdminCount = configuredAdmin
      ? await User.countDocuments({
          email: configuredAdmin,
          isAdmin: { $ne: true },
        })
      : 0;

    res.json({
      success: true,
      stats: {
        users,
        activeUsers: onlineUsers.size,
        bannedUsers,
        admins: adminsCount + configuredAdminCount,
        questions,
        battles,
        battlesToday,
        usersToday,
        activeBattles,
        skills: skillRows,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load admin statistics',
    });
  }
});

// ==========================================
// USER MANAGEMENT
// ==========================================

router.get('/users', requireAdmin, async (req, res) => {
  try {
    const {
      search = '',
      status = 'all',
      page = 1,
      limit = 25,
    } = req.query;

    const filter = {};
    const safeSearch = String(search).trim();

    if (safeSearch) {
      filter.$or = [
        { fullName: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
      ];

      if (mongoose.Types.ObjectId.isValid(safeSearch)) {
        filter.$or.push({ _id: safeSearch });
      }
    }

    if (status === 'banned') filter.isBanned = true;
    if (status === 'active') filter.isBanned = { $ne: true };
    if (status === 'admins') filter.isAdmin = true;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(limit) || 25, 1), 100);

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      users: users.map((user) => ({
        ...user,
        isAdmin: isAdminUser(user),
        online: onlineUsers.has(String(user._id)),
      })),
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load users',
    });
  }
});

router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    if (!parseId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findById(req.params.id).select('-password').lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const battles = await BattleHistory.find({
      $or: [
        { userId: user._id },
        { opponentId: user._id },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      user: safeUser(user),
      battles,
    });
  } catch (error) {
    console.error('Admin user detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to load user details' });
  }
});

router.patch('/users/:id', requireAdmin, async (req, res) => {
  try {
    if (!parseId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { fullName, email, xp, level, rating, wins, losses, isAdmin } = req.body;

    if (fullName !== undefined) {
      const value = String(fullName).trim();
      if (!value) return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      user.fullName = value;
    }

    if (email !== undefined) {
      const normalized = String(email).trim().toLowerCase();
      if (!normalized) return res.status(400).json({ success: false, message: 'Email cannot be empty' });

      const duplicate = await User.findOne({
        email: normalized,
        _id: { $ne: user._id },
      });

      if (duplicate) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }

      user.email = normalized;
    }

    for (const field of ['xp', 'level', 'rating', 'wins', 'losses']) {
      if (req.body[field] !== undefined) {
        const value = Number(req.body[field]);
        if (!Number.isFinite(value) || value < 0) {
          return res.status(400).json({ success: false, message: `${field} must be a valid non-negative number` });
        }
        user[field] = Math.round(value);
      }
    }

    if (isAdmin !== undefined) {
      if (String(user._id) === String(req.user._id) && !Boolean(isAdmin)) {
        return res.status(400).json({ success: false, message: 'You cannot remove your own admin access' });
      }
      user.isAdmin = Boolean(isAdmin);
    }

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      user: safeUser(user),
    });
  } catch (error) {
    console.error('Admin user update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

router.post('/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    if (!parseId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot ban yourself' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isBanned = true;
    user.banReason = String(req.body.reason || 'Account restricted by administrator').trim();
    user.bannedAt = new Date();
    await user.save();

    const presence = onlineUsers.get(String(user._id));
    if (presence?.socket) {
      presence.socket.emit('account_banned', {
        message: user.banReason || 'Your account has been banned.',
      });
      presence.socket.disconnect(true);
      onlineUsers.delete(String(user._id));
    }

    res.json({
      success: true,
      message: 'User banned successfully',
      user: safeUser(user),
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ success: false, message: 'Failed to ban user' });
  }
});

router.post('/users/:id/unban', requireAdmin, async (req, res) => {
  try {
    if (!parseId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isBanned = false;
    user.banReason = '';
    user.bannedAt = null;
    await user.save();

    res.json({
      success: true,
      message: 'User unbanned successfully',
      user: safeUser(user),
    });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ success: false, message: 'Failed to unban user' });
  }
});

router.post('/users/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    if (!parseId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const newPassword = String(req.body.newPassword || '');
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    if (!parseId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account from admin' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await Promise.all([
      User.deleteOne({ _id: user._id }),
      BattleHistory.deleteMany({
        $or: [{ userId: user._id }, { opponentId: user._id }],
      }),
    ]);

    onlineUsers.delete(String(user._id));

    res.json({
      success: true,
      message: 'User and associated battle records deleted',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// ==========================================
// BATTLE / USER REPORTS
// ==========================================

router.get('/battles', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);

    const battles = await BattleHistory.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, battles });
  } catch (error) {
    console.error('Admin battles error:', error);
    res.status(500).json({ success: false, message: 'Failed to load battle records' });
  }
});

// ==========================================
// QUESTION MANAGEMENT
// ==========================================

router.get('/questions', requireAdmin, async (req, res) => {
  try {
    const { search = '', skill = 'all', difficulty = 'all' } = req.query;
    const filter = {};

    if (skill !== 'all') filter.skill = skill;
    if (difficulty !== 'all') filter.difficulty = difficulty;

    if (String(search).trim()) {
      filter.$or = [
        { questionText: { $regex: String(search).trim(), $options: 'i' } },
        { skill: { $regex: String(search).trim(), $options: 'i' } },
      ];
    }

    const questions = await Question.find(filter)
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    res.json({ success: true, questions });
  } catch (error) {
    console.error('Admin questions error:', error);
    res.status(500).json({ success: false, message: 'Failed to load questions' });
  }
});

router.post('/questions', requireAdmin, async (req, res) => {
  try {
    const validationError = validateQuestionPayload(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const difficulty = req.body.difficulty;
    const question = await Question.create({
      skill: String(req.body.skill).trim(),
      questionText: String(req.body.questionText).trim(),
      options: req.body.options.map((option) => String(option).trim()),
      correctAnswer: Number(req.body.correctAnswer),
      difficulty,
      explanation: String(req.body.explanation || '').trim(),
      xpReward: Number(req.body.xpReward ?? (difficulty === 'Hard' ? 20 : difficulty === 'Medium' ? 15 : 10)),
    });

    res.status(201).json({ success: true, message: 'Question created', question });
  } catch (error) {
    console.error('Admin question create error:', error);
    res.status(500).json({ success: false, message: 'Failed to create question' });
  }
});

router.patch('/questions/:id', requireAdmin, async (req, res) => {
  try {
    if (!parseId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid question ID' });
    }

    const validationError = validateQuestionPayload(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const question = await Question.findByIdAndUpdate(
      req.params.id,
      {
        skill: String(req.body.skill).trim(),
        questionText: String(req.body.questionText).trim(),
        options: req.body.options.map((option) => String(option).trim()),
        correctAnswer: Number(req.body.correctAnswer),
        difficulty: req.body.difficulty,
        explanation: String(req.body.explanation || '').trim(),
        xpReward: Number(req.body.xpReward),
      },
      { new: true, runValidators: true }
    );

    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

    res.json({ success: true, message: 'Question updated', question });
  } catch (error) {
    console.error('Admin question update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update question' });
  }
});

router.delete('/questions/:id', requireAdmin, async (req, res) => {
  try {
    if (!parseId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid question ID' });
    }

    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Question not found' });

    res.json({ success: true, message: 'Question deleted' });
  } catch (error) {
    console.error('Admin question delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete question' });
  }
});

// ==========================================
// SKILL MANAGEMENT
// ==========================================

router.get('/skills', requireAdmin, async (req, res) => {
  try {
    await ensureDefaultSkills();
    const skills = await Skill.find({}).sort({ active: -1, name: 1 }).lean();

    const counts = await Question.aggregate([
      { $group: { _id: '$skill', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(counts.map((item) => [item._id, item.count]));

    res.json({
      success: true,
      skills: skills.map((skill) => ({
        ...skill,
        questionCount: countMap.get(skill.name) || 0,
      })),
    });
  } catch (error) {
    console.error('Admin skills error:', error);
    res.status(500).json({ success: false, message: 'Failed to load skills' });
  }
});

router.post('/skills', requireAdmin, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const icon = String(req.body.icon || '◈').trim();

    if (!name) return res.status(400).json({ success: false, message: 'Skill name is required' });

    const skill = await Skill.create({ name, description, icon });
    res.status(201).json({ success: true, message: 'Skill created', skill });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Skill already exists' });
    }
    console.error('Admin skill create error:', error);
    res.status(500).json({ success: false, message: 'Failed to create skill' });
  }
});

router.patch('/skills/:id', requireAdmin, async (req, res) => {
  try {
    if (!parseId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid skill ID' });
    }

    const skill = await Skill.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name !== undefined ? String(req.body.name).trim() : undefined,
        description: req.body.description !== undefined ? String(req.body.description).trim() : undefined,
        icon: req.body.icon !== undefined ? String(req.body.icon).trim() : undefined,
        active: req.body.active !== undefined ? Boolean(req.body.active) : undefined,
      },
      { new: true, runValidators: true }
    );

    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });

    res.json({ success: true, message: 'Skill updated', skill });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Skill name already exists' });
    }
    console.error('Admin skill update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update skill' });
  }
});

router.delete('/skills/:id', requireAdmin, async (req, res) => {
  try {
    if (!parseId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid skill ID' });
    }

    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });

    const questionCount = await Question.countDocuments({ skill: skill.name });

    if (questionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete ${skill.name} while ${questionCount} questions use it. Deactivate it instead.`,
      });
    }

    await skill.deleteOne();
    res.json({ success: true, message: 'Skill deleted' });
  } catch (error) {
    console.error('Admin skill delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete skill' });
  }
});

export default router;
