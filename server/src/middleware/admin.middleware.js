import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import { isAdminUser } from '../controllers/auth.controller.js';

export const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Banned accounts cannot access administration',
      });
    }

    if (!isAdminUser(user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin authentication error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};
