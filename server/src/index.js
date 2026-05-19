import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { demojisRouter } from './routes/demojis.js';
import { logError, logInfo } from './services/logger.js';

const app = express();

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'demomojis-api' });
});

app.use('/api/demojis', demojisRouter);

app.use((err, _req, res, _next) => {
  logError('request.failed', err);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong.'
  });
});

connectDb()
  .then(() => {
    app.listen(env.port, () => {
      logInfo('server.ready', {
        port: env.port,
        clientOrigin: env.clientOrigin,
        falConfigured: Boolean(env.falKey),
        falModelId: env.falModelId,
        falTimeoutMs: env.falTimeoutMs
      });
    });
  })
  .catch((error) => {
    logError('server.start_failed', error);
    process.exit(1);
  });
