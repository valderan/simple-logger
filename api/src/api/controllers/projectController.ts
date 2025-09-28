import { Request, Response } from 'express';
import { z } from 'zod';
import { ProjectDocument, ProjectModel, TelegramRecipient } from '../models/Project';
import { LogModel } from '../models/Log';
import { buildLogFilter } from '../utils/logFilters';
import { PingServiceModel } from '../models/PingService';
import { defaultPingMonitor } from '../../ping/monitor';
import { defaultNotifier } from '../../telegram/notifier';

type BotUrlInfo = Awaited<ReturnType<typeof defaultNotifier.getBotUrlInfo>>;

const extractChatIds = (recipients: TelegramRecipient[]): Set<string> =>
  new Set(recipients.map((recipient) => recipient.chatId));

async function buildProjectResponse(project: ProjectDocument, botInfo?: BotUrlInfo) {
  const json = project.toJSON();
  const info = botInfo ?? (await defaultNotifier.getBotUrlInfo());
  const commands: { subscribe: string | null; unsubscribe: string | null } = json.telegramNotify?.enabled
    ? {
        subscribe: defaultNotifier.buildCommand('ADD', json.uuid),
        unsubscribe: defaultNotifier.buildCommand('DELETE', json.uuid)
      }
    : {
        subscribe: null,
        unsubscribe: null
      };

  return {
    ...json,
    telegramCommands: commands,
    telegramBot: info
  };
}

const projectSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  logFormat: z.record(z.any()),
  defaultTags: z.array(z.string()).default(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']),
  customTags: z.array(z.string()).default([]),
  accessLevel: z.enum(['global', 'whitelist', 'docker']).default('global'),
  telegramNotify: z.object({
    enabled: z.boolean().default(false),
    recipients: z.array(z.object({ chatId: z.string(), tags: z.array(z.string()).default([]) })).default([]),
    antiSpamInterval: z.number().min(1).default(15)
  }).default({ enabled: false, recipients: [], antiSpamInterval: 15 }),
  debugMode: z.boolean().default(false),
  maxLogEntries: z.number().int().min(0).default(0)
});

const pingSchema = z.object({
  name: z.string().min(2),
  url: z.string().url(),
  interval: z.number().min(5).max(3600).default(60),
  telegramTags: z.array(z.string()).default([])
});

const pingUpdateSchema = pingSchema.partial().refine(data => Object.keys(data).length > 0, {
  message: 'Необходимо указать хотя бы одно поле для обновления'
});

/**
 * Создает новый проект логирования.
 */
export async function createProject(req: Request, res: Response): Promise<Response> {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Неверный формат данных', details: parsed.error.flatten() });
  }
  const data = parsed.data;
  if (data.maxLogEntries < 0) {
    data.maxLogEntries = 0;
  }
  const project = await ProjectModel.create(data);
  if (project.telegramNotify.enabled) {
    await defaultNotifier.logAction('telegram_notifications_enabled', {
      projectUuid: project.uuid,
      recipients: project.telegramNotify.recipients.length
    });
  }
  const response = await buildProjectResponse(project);
  return res.status(201).json(response);
}

/**
 * Возвращает список проектов.
 */
export async function listProjects(_req: Request, res: Response): Promise<Response> {
  const projects = await ProjectModel.find().sort({ createdAt: -1 });
  const botInfo = await defaultNotifier.getBotUrlInfo();
  const result = await Promise.all(projects.map((project) => buildProjectResponse(project, botInfo)));
  return res.json(result);
}

/**
 * Возвращает информацию о конкретном проекте.
 */
export async function getProject(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params;
  const project = await ProjectModel.findOne({ uuid });
  if (!project) {
    return res.status(404).json({ message: 'Проект не найден' });
  }
  const response = await buildProjectResponse(project);
  return res.json(response);
}

/**
 * Возвращает логи проекта с фильтрами.
 */
export async function getProjectLogs(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params;
  const project = await ProjectModel.findOne({ uuid });
  if (!project) {
    return res.status(404).json({ message: 'Проект не найден' });
  }
  const filter = buildLogFilter(uuid, req.query as Record<string, string>);
  const logs = await LogModel.find(filter).sort({ timestamp: -1 }).limit(5000);
  const responseProject = await buildProjectResponse(project);
  return res.json({ project: responseProject, logs });
}

/**
 * Обновляет параметры проекта, кроме UUID.
 */
export async function updateProject(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params;

  if (typeof req.body?.uuid === 'string' && req.body.uuid !== uuid) {
    return res.status(400).json({ message: 'UUID проекта нельзя изменять' });
  }

  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Неверный формат данных', details: parsed.error.flatten() });
  }

  const project = await ProjectModel.findOne({ uuid });
  if (!project) {
    return res.status(404).json({ message: 'Проект не найден' });
  }

  const previousEnabled = project.telegramNotify.enabled;
  const previousChatIds = extractChatIds(project.telegramNotify.recipients);

  const updatedData = parsed.data;
  if (uuid === 'logger-system') {
    updatedData.maxLogEntries = 0;
  }
  project.set(updatedData);

  if (!project.telegramNotify.enabled) {
    project.telegramNotify.recipients = [];
  }

  const newChatIds = extractChatIds(project.telegramNotify.recipients);
  const removedChatIds: string[] = [];
  previousChatIds.forEach((chatId) => {
    if (!newChatIds.has(chatId)) {
      removedChatIds.push(chatId);
    }
  });

  const addedChatIds: string[] = [];
  newChatIds.forEach((chatId) => {
    if (!previousChatIds.has(chatId)) {
      addedChatIds.push(chatId);
    }
  });

  await project.save();

  if (!previousEnabled && project.telegramNotify.enabled) {
    await defaultNotifier.logAction('telegram_notifications_enabled', {
      projectUuid: project.uuid,
      recipients: project.telegramNotify.recipients.length
    });
  }

  if (previousEnabled && !project.telegramNotify.enabled) {
    await defaultNotifier.logAction('telegram_notifications_disabled', {
      projectUuid: project.uuid,
      removedRecipients: removedChatIds.length
    });
  }

  for (const chatId of addedChatIds) {
    await defaultNotifier.logAction('telegram_subscription_added_manual', {
      chatId,
      projectUuid: project.uuid,
      userId: chatId
    });
  }

  if (removedChatIds.length > 0) {
    const reason: 'manual' | 'project_disabled' = project.telegramNotify.enabled ? 'manual' : 'project_disabled';
    for (const chatId of removedChatIds) {
      await defaultNotifier.notifyUnsubscribed(project, chatId, reason);
    }
  }

  const response = await buildProjectResponse(project);
  return res.json(response);
}

/**
 * Удаляет проект и связанные данные.
 */
export async function deleteProject(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params;

  if (uuid === 'logger-system') {
    return res.status(400).json({ message: 'Нельзя удалить системный проект' });
  }

  const project = await ProjectModel.findOneAndDelete({ uuid });
  if (!project) {
    return res.status(404).json({ message: 'Проект не найден' });
  }

  const removedChats = project.telegramNotify.recipients.map((recipient) => recipient.chatId);

  if (removedChats.length > 0) {
    for (const chatId of removedChats) {
      await defaultNotifier.notifyUnsubscribed(project, chatId, 'project_deleted');
    }
  }

  if (project.telegramNotify.enabled) {
    await defaultNotifier.logAction('telegram_project_deleted', {
      projectUuid: project.uuid,
      removedRecipients: removedChats.length
    });
  }

  const [logsResult, pingResult] = await Promise.all([
    LogModel.deleteMany({ projectUuid: uuid }),
    PingServiceModel.deleteMany({ projectUuid: uuid })
  ]);

  return res.json({
    message: 'Проект удален',
    deletedLogs: logsResult.deletedCount ?? 0,
    deletedPingServices: pingResult.deletedCount ?? 0
  });
}

/**
 * Добавляет ping-сервис в проект.
 */
export async function addPingService(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params;
  const parsed = pingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Неверный формат данных', details: parsed.error.flatten() });
  }
  const project = await ProjectModel.findOne({ uuid });
  if (!project) {
    return res.status(404).json({ message: 'Проект не найден' });
  }
  const service = await PingServiceModel.create({ ...parsed.data, projectUuid: uuid });
  await defaultPingMonitor.checkService(service);
  return res.status(201).json(service.toJSON());
}

/**
 * Возвращает ping-сервисы проекта.
 */
export async function listPingServices(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params;
  const services = await PingServiceModel.find({ projectUuid: uuid });
  return res.json(services);
}

/**
 * Принудительно запускает проверку всех ping-сервисов проекта.
 */
export async function triggerPingCheck(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params;
  const services = await defaultPingMonitor.checkProjectServices(uuid);
  return res.json(services);
}

/**
 * Обновляет ping-сервис проекта.
 */
export async function updatePingService(req: Request, res: Response): Promise<Response> {
  const { uuid, serviceId } = req.params as { uuid: string; serviceId: string };
  const parsed = pingUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Неверный формат данных', details: parsed.error.flatten() });
  }

  const updated = await PingServiceModel.findOneAndUpdate(
    { _id: serviceId, projectUuid: uuid },
    parsed.data,
    { new: true, runValidators: true }
  );

  if (!updated) {
    return res.status(404).json({ message: 'Ping-сервис не найден' });
  }

  await defaultPingMonitor.checkService(updated);
  return res.json(updated.toJSON());
}

/**
 * Удаляет ping-сервис проекта.
 */
export async function deletePingService(req: Request, res: Response): Promise<Response> {
  const { uuid, serviceId } = req.params as { uuid: string; serviceId: string };
  const deleted = await PingServiceModel.findOneAndDelete({ _id: serviceId, projectUuid: uuid });

  if (!deleted) {
    return res.status(404).json({ message: 'Ping-сервис не найден' });
  }

  return res.json({ message: 'Ping-сервис удален', serviceId: deleted._id });
}

/**
 * Возвращает детальную информацию об интеграции проекта с Telegram.
 */
export async function getProjectTelegramInfo(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params;
  const project = await ProjectModel.findOne({ uuid });
  if (!project) {
    return res.status(404).json({ message: 'Проект не найден' });
  }

  const botInfo = await defaultNotifier.getBotUrlInfo();
  const commands = project.telegramNotify.enabled
    ? {
        subscribe: defaultNotifier.buildCommand('ADD', project.uuid),
        unsubscribe: defaultNotifier.buildCommand('DELETE', project.uuid)
      }
    : { subscribe: null, unsubscribe: null };

  return res.json({
    projectUuid: project.uuid,
    enabled: project.telegramNotify.enabled,
    antiSpamInterval: project.telegramNotify.antiSpamInterval,
    recipients: project.telegramNotify.recipients,
    commands,
    bot: botInfo
  });
}

/**
 * Удаляет подписчика Telegram и уведомляет его об отписке.
 */
export async function removeTelegramRecipient(req: Request, res: Response): Promise<Response> {
  const { uuid, chatId } = req.params as { uuid: string; chatId: string };
  const project = await ProjectModel.findOne({ uuid });
  if (!project) {
    return res.status(404).json({ message: 'Проект не найден' });
  }

  const exists = project.telegramNotify.recipients.find((recipient) => recipient.chatId === chatId);
  if (!exists) {
    return res.status(404).json({ message: 'Подписчик не найден' });
  }

  project.telegramNotify.recipients = project.telegramNotify.recipients.filter((recipient) => recipient.chatId !== chatId);
  await project.save();

  const reason: 'manual' | 'project_disabled' = project.telegramNotify.enabled ? 'manual' : 'project_disabled';
  await defaultNotifier.notifyUnsubscribed(project, chatId, reason);
  await defaultNotifier.logAction('telegram_recipient_removed_api', {
    projectUuid: project.uuid,
    chatId,
    userId: chatId,
    reason
  });

  const response = await buildProjectResponse(project);
  return res.json({ message: 'Получатель удален', chatId, project: response });
}
