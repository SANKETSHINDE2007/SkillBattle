import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const isAdminUser = (user) => {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  return Boolean(
    user?.isAdmin ||
      (adminEmail && user?.email?.toLowerCase() === adminEmail)
  );
};

export const publicUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  xp: user.xp,
  level: user.level,
  rating: user.rating,
  wins: user.wins,
  losses: user.losses,
  isAdmin: isAdminUser(user),
  isBanned: Boolean(user.isBanned),
  banReason: user.banReason || '',
  lastSeenAt: user.lastSeenAt || null,
  createdAt: user.createdAt,
});

// ==========================================
// REGISTER
// ==========================================

export const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      lastSeenAt: new Date(),
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Register error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
};

// ==========================================
// LOGIN
// ==========================================

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: `This account is banned${user.banReason ? `: ${user.banReason}` : '.'}`,
        banned: true,
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    user.lastSeenAt = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

// ==========================================
// GET CURRENT USER
// ==========================================

export const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: `This account is banned${user.banReason ? `: ${user.banReason}` : '.'}`,
        banned: true,
      });
    }

    user.lastSeenAt = new Date();
    await user.save();

    res.json({
      success: true,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Get current user error:', error);

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};
