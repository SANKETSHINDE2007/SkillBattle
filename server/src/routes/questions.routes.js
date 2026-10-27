import express from 'express';
import Question from '../models/Question.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get random practice questions
router.get('/practice', requireAuth, async (req, res) => {
  try {
    const {
      skill,
      difficulty,
      count = 5,
    } = req.query;

    if (!skill) {
      return res.status(400).json({
        success: false,
        message: 'Skill is required',
      });
    }

    if (
      difficulty &&
      !['Easy', 'Medium', 'Hard'].includes(difficulty)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid difficulty',
      });
    }

    const questionCount = Math.min(
      Math.max(Number(count) || 5, 1),
      20
    );

    const filter = {
      skill,
    };

    if (difficulty) {
      filter.difficulty = difficulty;
    }

    const questions = await Question.aggregate([
      { $match: filter },
      { $sample: { size: questionCount } },
    ]);

    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No questions found for this selection',
      });
    }

    res.json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (error) {
    console.error('Practice questions error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch practice questions',
    });
  }
});

export default router;