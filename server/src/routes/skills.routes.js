import express from 'express';
import Skill from '../models/Skill.js';

const router = express.Router();

const DEFAULT_SKILLS = [
  { name: 'Programming', description: 'C, C++, Python, JavaScript', icon: '💻' },
  { name: 'DBMS', description: 'SQL, MongoDB and database concepts', icon: '🗄️' },
  { name: 'Networking', description: 'Networks, protocols and security', icon: '🌐' },
  { name: 'Aptitude', description: 'Logical, quantitative and reasoning', icon: '🧠' },
  { name: 'Computer Science', description: 'OS, data structures and algorithms', icon: '⚙️' },
  { name: 'Web Development', description: 'HTML, CSS, JavaScript and React', icon: '🚀' },
];

router.get('/', async (req, res) => {
  try {
    for (const skill of DEFAULT_SKILLS) {
      await Skill.updateOne(
        { name: skill.name },
        { $setOnInsert: skill },
        { upsert: true }
      );
    }

    const skills = await Skill.find({ active: true })
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, skills });
  } catch (error) {
    console.error('Skills load error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load skills',
    });
  }
});

export default router;
