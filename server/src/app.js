import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import generateRoutes from './routes/generateRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'D&D Assistant API' });
});

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'D&D Assistant API is running.',
    health: '/api/health'
  });
});

app.get('/favicon.ico', (_req, res) => {
  res.status(204).end();
});

app.use('/api', generateRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
