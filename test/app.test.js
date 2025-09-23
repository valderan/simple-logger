"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importStar(require("../src/app"));
const Project_1 = require("../src/api/models/Project");
const Log_1 = require("../src/api/models/Log");
jest.setTimeout(30000);
describe('Logger API', () => {
    let mongoServer;
    let authToken;
    const adminUser = 'admin';
    const adminPass = 'secret';
    beforeAll(async () => {
        mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
        process.env.MONGO_URI = mongoServer.getUri();
        process.env.ADMIN_USER = adminUser;
        process.env.ADMIN_PASS = adminPass;
        await (0, app_1.bootstrap)();
    });
    afterAll(async () => {
        await mongoose_1.default.disconnect();
        await mongoServer.stop();
    });
    it('авторизует администратора и возвращает токен', async () => {
        const response = await (0, supertest_1.default)(app_1.default).post('/api/auth/login').send({ username: adminUser, password: adminPass });
        expect(response.status).toBe(200);
        expect(response.body.token).toBeDefined();
        authToken = response.body.token;
    });
    it('создает новый проект', async () => {
        const response = await (0, supertest_1.default)(app_1.default)
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
        const project = await Project_1.ProjectModel.findOne({ name: 'Orders Service' });
        expect(project).not.toBeNull();
        const uuid = project.uuid;
        const logResponse = await (0, supertest_1.default)(app_1.default).post('/api/logs').send({
            uuid,
            log: {
                level: 'ERROR',
                message: 'Ошибка оплаты',
                tags: ['PAYMENT'],
                metadata: { ip: '10.0.0.1', service: 'billing', user: 'user-1' }
            }
        });
        expect(logResponse.status).toBe(201);
        const filterResponse = await (0, supertest_1.default)(app_1.default)
            .get('/api/logs')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ uuid, tag: 'PAYMENT' });
        expect(filterResponse.status).toBe(200);
        expect(filterResponse.body.logs).toHaveLength(1);
        expect(filterResponse.body.logs[0].message).toBe('Ошибка оплаты');
    });
    it('управляет белым списком IP', async () => {
        const createResponse = await (0, supertest_1.default)(app_1.default)
            .post('/api/settings/whitelist')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ ip: '192.168.0.1' });
        expect(createResponse.status).toBe(201);
        const listResponse = await (0, supertest_1.default)(app_1.default)
            .get('/api/settings/whitelist')
            .set('Authorization', `Bearer ${authToken}`);
        expect(listResponse.body).toEqual(expect.arrayContaining([expect.objectContaining({ ip: '192.168.0.1' })]));
    });
    it('удаляет логи по фильтру', async () => {
        const project = await Project_1.ProjectModel.findOne({ name: 'Orders Service' });
        const uuid = project.uuid;
        const deleteResponse = await (0, supertest_1.default)(app_1.default)
            .delete(`/api/logs/${uuid}`)
            .set('Authorization', `Bearer ${authToken}`)
            .query({ level: 'ERROR' });
        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.deleted).toBeGreaterThanOrEqual(1);
        const count = await Log_1.LogModel.countDocuments({ projectUuid: uuid });
        expect(count).toBe(0);
    });
});
