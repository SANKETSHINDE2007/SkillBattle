import express from 'express';
import BattleHistory from '../models/BattleHistory.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const history = await BattleHistory.find({
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error('Battle history error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to load battle history',
    });
  }
});

export default router;
