import express from 'express';
import { generateQuestionsWithAI } from '../services/aiQuestion.service.js';
import Question from '../models/Question.js';
import { requireAdmin } from '../middleware/admin.middleware.js';

const router = express.Router();

router.post('/generate', requireAdmin, async (req, res) => {
  try {
    const {
      skill,
      topic,
      difficulty = 'Easy',
      count = 5,
    } = req.body;

    if (!skill) {
      return res.status(400).json({
        success: false,
        message: 'Skill is required',
      });
    }

    if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid difficulty',
      });
    }

    if (count < 1 || count > 20) {
      return res.status(400).json({
        success: false,
        message: 'Question count must be between 1 and 20',
      });
    }

    const result = await generateQuestionsWithAI({
      skill,
      topic,
      difficulty,
      count,
    });

    if (
      !result ||
      !Array.isArray(result.questions) ||
      result.questions.length === 0
    ) {
      return res.status(500).json({
        success: false,
        message: 'AI did not return valid questions',
      });
    }

    const validQuestions = result.questions.filter((question) => {
      return (
        question.questionText &&
        Array.isArray(question.options) &&
        question.options.length === 4 &&
        Number.isInteger(question.correctAnswer) &&
        question.correctAnswer >= 0 &&
        question.correctAnswer <= 3
      );
    });

    if (validQuestions.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'AI generated invalid questions',
      });
    }

    const questionsToSave = validQuestions.map((question) => ({
      skill,
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      difficulty,
      explanation: question.explanation || '',
      xpReward:
        difficulty === 'Hard'
          ? 20
          : difficulty === 'Medium'
          ? 15
          : 10,
    }));

    const savedQuestions = await Question.insertMany(
      questionsToSave
    );

    res.status(201).json({
      success: true,
      message: `${savedQuestions.length} questions generated successfully`,
      questions: savedQuestions,
    });
  } catch (error) {
    console.error('AI question generation error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to generate questions',
      error: error.message,
    });
  }
});

export default router;