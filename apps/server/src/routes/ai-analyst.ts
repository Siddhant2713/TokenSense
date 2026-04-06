import { Router } from 'express';
import { generateAIRecommendations } from '../services/ai-analyst';

export const aiAnalystRouter = Router();

aiAnalystRouter.post('/', async (req, res) => {
    try {
        const result = await generateAIRecommendations(req.body);
        res.json(result);
    } catch (e: any) {
        console.error('API Error:', e);
        res.status(500).json({ error: e.message });
    }
});

