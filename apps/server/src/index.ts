import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { aiAnalystRouter } from './routes/ai-analyst';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/analyze', aiAnalystRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`[TokenSense Backend] Proxy running securely on http://localhost:${PORT}`);
});
