import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    skill: {
      type: String,
      required: true,
      trim: true,
    },

    questionText: {
      type: String,
      required: true,
      trim: true,
    },

    options: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => value.length === 4,
        message: 'A question must have exactly 4 options',
      },
    },

    correctAnswer: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },

    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Easy',
    },

    explanation: {
      type: String,
      default: '',
    },

    xpReward: {
      type: Number,
      default: 10,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Question = mongoose.model('Question', questionSchema);

export default Question;