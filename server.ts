import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json({ limit: '2mb' }));

const port = process.env.PORT || 3001;

app.post('/api/gemini', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(400).json({
        error: 'GEMINI_API_KEY is not configured in environment secrets.'
      });
    }

    const { prompt, systemInstruction, model } = req.body;
    const ai = new GoogleGenAI({ apiKey });

    const selectedModel = model || 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined,
    });

    return res.json({ text: response.text });
  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    return res.status(500).json({ error: error.message || 'Failed to process request' });
  }
});

// Middleware for local dev or express runner
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
  app.get('*', (_req, res) => {
    res.sendFile('dist/index.html', { root: '.' });
  });
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
