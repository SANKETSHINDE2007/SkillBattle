import { GoogleGenAI } from '@google/genai';

export const generateQuestionsWithAI = async ({
  skill,
  topic,
  difficulty,
  count,
}) => {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const prompt = `
You are an expert question creator for a competitive learning platform called SkillBattle.

Generate exactly ${count} multiple-choice questions.

Skill: ${skill}
Topic: ${topic || 'General'}
Difficulty: ${difficulty}

Rules:
- Generate exactly ${count} questions.
- Each question must have exactly 4 options.
- Only one option must be correct.
- correctAnswer must be an integer from 0 to 3.
- 0 means the first option.
- 1 means the second option.
- 2 means the third option.
- 3 means the fourth option.
- Questions must be technically accurate.
- Questions should be suitable for college students.
- Avoid duplicate questions.
- Include a useful explanation for every answer.
- Do not include markdown.
- Return ONLY valid JSON.

Return exactly this structure:

{
  "questions": [
    {
      "questionText": "Question here",
      "options": [
        "Option 1",
        "Option 2",
        "Option 3",
        "Option 4"
      ],
      "correctAnswer": 0,
      "explanation": "Explanation here"
    }
  ]
}
`;

let response;

for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    break;
  } catch (error) {
    console.error(
      `Gemini attempt ${attempt} failed:`,
      error.status || error.message
    );

    if (attempt === 3) {
      throw error;
    }

    const delay = 2000 * Math.pow(2, attempt - 1);

    console.log(`Retrying Gemini in ${delay / 1000} seconds...`);

    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

  const output = response.text;

  try {
    return JSON.parse(output);
  } catch (error) {
    console.error('Gemini returned invalid JSON:', output);
    throw new Error('AI returned invalid question format');
  }
};