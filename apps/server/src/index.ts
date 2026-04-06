import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { aiAnalystRouter } from './routes/ai-analyst';

// Load shared defaults from monorepo root first,
// then override with package-level env (apps/server/.env takes precedence).
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/analyze', aiAnalystRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[TokenSense Server] Running at http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.info(
      '[TokenSense Server] OPENAI_API_KEY not set — deterministic-only mode. ' +
        'Set it in apps/server/.env to enable the server-key tier (BYOK users unaffected).'
    );
  }
});
