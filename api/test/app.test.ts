import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app, { bootstrap } from '../src/app';
import { ProjectModel } from '../src/api/models/Project';
import { LogModel } from '../src/api/models/Log';
import { PingServiceModel } from '../src/api/models/PingService';

jest.setTimeout(30000);

describe('Logger API', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  const adminUser = 'admin';
  const adminPass = 'secret';
  let projectUuid = '';

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongoServer.getUri();
    process.env.ADMIN_USER = adminUser;
    process.env.ADMIN_PASS = adminPass;
    process.env.ADMIN_IP = '10.10.10.10';
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
    projectUuid = response.body.uuid;
  });

  it('обновляет проект без изменения uuid', async () => {
    expect(projectUuid).not.toBe('');
    const response = await request(app)
      .put(`/api/projects/${projectUuid}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Orders Service v2',
        description: 'Обновленное описание',
        logFormat: { level: 'string', message: 'string' },
        defaultTags: ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
        customTags: ['PAYMENT', 'INVOICE'],
        telegramNotify: { enabled: false, recipients: [], antiSpamInterval: 15 },
        accessLevel: 'global',
        debugMode: false
      });
    expect(response.status).toBe(200);
    expect(response.body.uuid).toBe(projectUuid);
    expect(response.body.name).toBe('Orders Service v2');
  });

  it('сохраняет лог и позволяет выполнить фильтрацию', async () => {
    const logResponse = await request(app).post('/api/logs').send({
      uuid: projectUuid,
      log: {
        level: 'ERROR',
        message: 'Ошибка оплаты',
        tags: ['PAYMENT'],
        metadata: { ip: '10.0.0.1', service: 'billing', user: 'user-1' }
      }
    });
    expect(logResponse.status).toBe(201);
    expect(logResponse.body.clientIP).toBe('127.0.0.1');
    expect(logResponse.body.rateLimitPerMinute).toBeGreaterThan(0);

    const filterResponse = await request(app)
      .get('/api/logs')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ uuid: projectUuid, tag: 'PAYMENT' });
    expect(filterResponse.status).toBe(200);
    expect(filterResponse.body.logs).toHaveLength(1);
    expect(filterResponse.body.logs[0].message).toBe('Ошибка оплаты');
    expect(filterResponse.body.logs[0].clientIP).toBe('127.0.0.1');
  });

  it('управляет белым списком IP', async () => {
    const createResponse = await request(app)
      .post('/api/settings/whitelist')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ip: '192.168.0.1' });
    expect(createResponse.status).toBe(201);
    expect(createResponse.body.isProtected).toBe(false);

    const listResponse = await request(app)
      .get('/api/settings/whitelist')
      .set('Authorization', `Bearer ${authToken}`);
    expect(listResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ip: '192.168.0.1', isProtected: false }),
        expect.objectContaining({ ip: '10.10.10.10', isProtected: true })
      ])
    );

    const deleteResponse = await request(app)
      .delete('/api/settings/whitelist/192.168.0.1')
      .set('Authorization', `Bearer ${authToken}`);
    expect(deleteResponse.status).toBe(200);

    const protectedDelete = await request(app)
      .delete('/api/settings/whitelist/10.10.10.10')
      .set('Authorization', `Bearer ${authToken}`);
    expect(protectedDelete.status).toBe(403);
    expect(protectedDelete.body.code).toBe('WHITELIST_PROTECTED');
  });

  it('удаляет логи по фильтру', async () => {
    const deleteResponse = await request(app)
      .delete(`/api/logs/${projectUuid}`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ level: 'ERROR' });
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.deleted).toBeGreaterThanOrEqual(1);
    const count = await LogModel.countDocuments({ projectUuid });
    expect(count).toBe(0);
  });

  it('логирует системное событие при неверном формате лога', async () => {
    const response = await request(app).post('/api/logs').send({
      uuid: projectUuid,
      log: {
        level: 'INFO',
        tags: ['TEST']
      }
    });
    expect(response.status).toBe(400);
    const systemLog = await LogModel.findOne({
      projectUuid: 'logger-system',
      'metadata.extra.projectUuid': projectUuid
    })
      .sort({ timestamp: -1 })
      .lean();
    expect(systemLog).not.toBeNull();
    expect(systemLog?.metadata?.extra?.issues).toMatch(/message/);
  });

  it('удаляет проект вместе с логами и ping-сервисами', async () => {
    await LogModel.create({
      projectUuid,
      level: 'INFO',
      message: 'Перед удалением',
      tags: [],
      timestamp: new Date(),
      metadata: {}
    });
    await PingServiceModel.create({
      projectUuid,
      name: 'Healthcheck',
      url: 'http://localhost:9999/health',
      interval: 60,
      telegramTags: []
    });

    const response = await request(app)
      .delete(`/api/projects/${projectUuid}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.deletedLogs).toBeGreaterThanOrEqual(1);

    const project = await ProjectModel.findOne({ uuid: projectUuid });
    expect(project).toBeNull();

    const logs = await LogModel.countDocuments({ projectUuid });
    expect(logs).toBe(0);

    const pingServices = await PingServiceModel.countDocuments({ projectUuid });
    expect(pingServices).toBe(0);
  });
});
