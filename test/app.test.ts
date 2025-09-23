import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app, { bootstrap } from '../src/app';
import { ProjectModel } from '../src/api/models/Project';
import { LogModel } from '../src/api/models/Log';

jest.setTimeout(30000);

describe('Logger API', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  const adminUser = 'admin';
  const adminPass = 'secret';

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongoServer.getUri();
    process.env.ADMIN_USER = adminUser;
    process.env.ADMIN_PASS = adminPass;
    await bootstrap();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('авторизует администратора и возвращает токен', async () => {
    const response = await request(app).post('/api/auth/login').send({ username: adminUser, password: adminPass });
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    authToken = response.body.token;
  });

  it('создает новый проект', async () => {
    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Orders Service',
        logFormat: { level: 'string', message: 'string' },
        customTags: ['PAYMENT'],
        telegramNotify: { enabled: false, recipients: [], antiSpamInterval: 15 },
        debugMode: true
      });
    expect(response.status).toBe(201);
    expect(response.body.uuid).toBeDefined();
  });

  it('сохраняет лог и позволяет выполнить фильтрацию', async () => {
    const project = await ProjectModel.findOne({ name: 'Orders Service' });
    expect(project).not.toBeNull();
    const uuid = project!.uuid;

    const logResponse = await request(app).post('/api/logs').send({
      uuid,
      log: {
        level: 'ERROR',
        message: 'Ошибка оплаты',
        tags: ['PAYMENT'],
        metadata: { ip: '10.0.0.1', service: 'billing', user: 'user-1' }
      }
    });
    expect(logResponse.status).toBe(201);

    const filterResponse = await request(app)
      .get('/api/logs')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ uuid, tag: 'PAYMENT' });
    expect(filterResponse.status).toBe(200);
    expect(filterResponse.body.logs).toHaveLength(1);
    expect(filterResponse.body.logs[0].message).toBe('Ошибка оплаты');
  });

  it('управляет белым списком IP', async () => {
    const createResponse = await request(app)
      .post('/api/settings/whitelist')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ip: '192.168.0.1' });
    expect(createResponse.status).toBe(201);

    const listResponse = await request(app)
      .get('/api/settings/whitelist')
      .set('Authorization', `Bearer ${authToken}`);
    expect(listResponse.body).toEqual(expect.arrayContaining([expect.objectContaining({ ip: '192.168.0.1' })]));
  });

  it('удаляет логи по фильтру', async () => {
    const project = await ProjectModel.findOne({ name: 'Orders Service' });
    const uuid = project!.uuid;
    const deleteResponse = await request(app)
      .delete(`/api/logs/${uuid}`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ level: 'ERROR' });
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.deleted).toBeGreaterThanOrEqual(1);
    const count = await LogModel.countDocuments({ projectUuid: uuid });
    expect(count).toBe(0);
  });
});
