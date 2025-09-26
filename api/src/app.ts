import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import apiRouter from './api/routes';
import { rateLimiter } from './api/middlewares/rateLimiter';
import { ipWhitelist } from './api/middlewares/ipWhitelist';
import { blacklistGuard } from './api/middlewares/blacklistGuard';
import { errorHandler } from './api/middlewares/errorHandler';
import { connectMongo } from './api/utils/mongo';
import { ProjectModel } from './api/models/Project';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));
app.use(blacklistGuard);
app.use(rateLimiter);
app.use(ipWhitelist);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', apiRouter);
app.use(errorHandler);

export async function bootstrap(uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/logger'): Promise<void> {
  await connectMongo(uri);
  await ProjectModel.ensureSystemProject();
}

if (require.main === module) {
  bootstrap().then(() => {
    const port = Number(process.env.PORT ?? 3000);
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Logger API запущен на порту ${port}`);
    });
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Ошибка запуска приложения', error);
    process.exit(1);
  });
}

export default app;
