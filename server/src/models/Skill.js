import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 60,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },
    icon: {
      type: String,
      default: '◈',
      trim: true,
      maxlength: 8,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Skill = mongoose.model('Skill', skillSchema);

export default Skill;
