import mongoose from 'mongoose';

const battleHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    opponentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    opponentName: {
      type: String,
      required: true,
      trim: true,
    },
    result: {
      type: String,
      enum: ['win', 'lose', 'draw'],
      required: true,
    },
    score: { type: Number, required: true },
    opponentScore: { type: Number, required: true },
    correct: { type: Number, required: true },
    opponentCorrect: { type: Number, required: true },
    xpEarned: { type: Number, default: 0 },
    ratingChange: { type: Number, default: 0 },
    skill: { type: String, required: true },
    difficulty: { type: String, required: true },
    questionCount: { type: Number, required: true },
  },
  { timestamps: true }
);

const BattleHistory = mongoose.model('BattleHistory', battleHistorySchema);

export default BattleHistory;
