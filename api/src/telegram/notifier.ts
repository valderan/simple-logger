import TelegramBot from 'node-telegram-bot-api';
import { validate as uuidValidate } from 'uuid';
import { ProjectDocument, ProjectModel } from '../api/models/Project';
import { writeSystemLog } from '../api/utils/systemLogger';

type Language = 'ru' | 'en';

type BotUrlSource = 'env' | 'telegram' | 'inactive' | 'unknown';

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  ru: {
    addSuccess: 'Вы подписаны на проект {{name}} ({{uuid}}).',
    addExists: 'Вы уже подписаны на проект {{name}} ({{uuid}}).',
    addInvalid: 'Проект с указанным UUID не найден или формат неверный.',
    deleteSuccess: 'Подписка на проект {{name}} ({{uuid}}) отменена.',
    deleteMissing: 'Подписка на проект не найдена.',
    invalidFormat: 'Некорректная команда. Используйте ADD:UUID или DELETE:UUID.',
    blocked: 'Вы 10 раз отправили неверный UUID. Бот перестанет принимать ваши сообщения на 1 час.',
    stillBlocked: 'Вы временно заблокированы. Попробуйте снова через час.',
    subscriptionsEmpty: 'У вас нет активных подписок.',
    subscriptionsHeader: 'Ваши подписки:',
    subscriptionsAction: 'Отписаться от {{name}}',
    info: 'Ваши идентификаторы:\nUSERID: {{userId}}\nCHATID: {{chatId}}',
    languagePrompt: 'Выберите язык интерфейса:',
    languageSetRu: 'Язык переключен на русский.',
    languageSetEn: 'Язык переключен на английский.',
    commandSubscriptions: 'Мои подписки',
    commandInfo: 'Информация',
    commandLanguage: 'Сменить язык',
    unknownProject: 'Проект с UUID {{uuid}} не найден.',
    unsubscribeConfirmation: 'Подписка отменена.',
    unsubscribeDisabled: 'Уведомления для проекта {{name}} отключены. Подписка удалена.',
    unsubscribeDeleted: 'Проект {{name}} удалён. Подписка удалена.',
    botStarted: 'Телеграм-бот запущен и принимает сообщения.',
    systemSubscribeForbidden: 'Подписка на Logger Core через чат недоступна.'
  },
  en: {
    addSuccess: 'You are subscribed to project {{name}} ({{uuid}}).',
    addExists: 'You are already subscribed to project {{name}} ({{uuid}}).',
    addInvalid: 'Project not found or UUID format is invalid.',
    deleteSuccess: 'Subscription for project {{name}} ({{uuid}}) was removed.',
    deleteMissing: 'Subscription not found.',
    invalidFormat: 'Invalid command. Use ADD:UUID or DELETE:UUID.',
    blocked: 'You have entered an invalid UUID 10 times. The bot will ignore messages for 1 hour.',
    stillBlocked: 'You are temporarily blocked. Try again later.',
    subscriptionsEmpty: 'You have no active subscriptions.',
    subscriptionsHeader: 'Your subscriptions:',
    subscriptionsAction: 'Unsubscribe from {{name}}',
    info: 'Your identifiers:\nUSERID: {{userId}}\nCHATID: {{chatId}}',
    languagePrompt: 'Choose interface language:',
    languageSetRu: 'Language switched to Russian.',
    languageSetEn: 'Language switched to English.',
    commandSubscriptions: 'Subscriptions',
    commandInfo: 'Info',
    commandLanguage: 'Change language',
    unknownProject: 'Project with UUID {{uuid}} not found.',
    unsubscribeConfirmation: 'Subscription removed.',
    unsubscribeDisabled: 'Notifications for project {{name}} have been disabled. Subscription removed.',
    unsubscribeDeleted: 'Project {{name}} has been deleted. Subscription removed.',
    botStarted: 'Telegram bot started and listens for messages.',
    systemSubscribeForbidden: 'Subscribing to Logger Core via chat is not allowed.'
  }
};

interface InvalidState {
  attempts: number;
  blockedUntil?: number;
}

/**
 * Простой адаптер для отправки уведомлений в telegram.
 */
export class TelegramNotifier {
  private bot?: TelegramBot;
  private lastSent = new Map<string, number>();
  private readonly userLanguages = new Map<number, Language>();
  private readonly invalidState = new Map<number, InvalidState>();
  private readonly notifiedBlock = new Set<number>();
  private botUrlInfo: { url: string | null; source: BotUrlSource } = { url: null, source: 'unknown' };
  private botUrlPromise?: Promise<void>;

  constructor(private readonly token?: string) {
    this.applyBotUrlFromEnv(process.env.BOT_URL);

    if (!token) {
      return;
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.setupBot();
    void this.logAction('telegram_bot_started', {
      message: TRANSLATIONS.ru.botStarted,
      tokenProvided: Boolean(token),
      userId: null
    });
  }

  /**
   * Возвращает информацию о текущем состоянии Telegram-бота.
   */
  getStatus(): { tokenProvided: boolean; botStarted: boolean } {
    const tokenProvided = Boolean(this.token);
    const botStarted = Boolean(this.bot?.isPolling?.());
    return { tokenProvided, botStarted };
  }

  /**
   * Отправляет уведомление для всех получателей проекта, учитывая анти-спам интервал.
   */
  async notify(project: ProjectDocument, message: string, tag: string): Promise<void> {
    if (!this.bot || !project.telegramNotify.enabled) {
      return;
    }
    const now = Date.now();
    const intervalMs = project.telegramNotify.antiSpamInterval * 60 * 1000;
    for (const recipient of project.telegramNotify.recipients) {
      if (recipient.tags.length && !recipient.tags.includes(tag)) {
        continue;
      }
      const key = `${project.uuid}:${recipient.chatId}:${tag}`;
      const nextAllowed = (this.lastSent.get(key) ?? 0) + intervalMs;
      if (nextAllowed > now) {
        continue;
      }
      await this.bot.sendMessage(recipient.chatId, message);
      await this.logAction('telegram_notification_sent', {
        projectUuid: project.uuid,
        chatId: recipient.chatId,
        tag,
        userId: recipient.chatId
      });
      this.lastSent.set(key, now);
    }
  }

  private setupBot(): void {
    if (!this.bot) {
      return;
    }

    void this.registerCommands();

    this.bot.on('message', (msg) => {
      this.handleMessage(msg).catch((error) => {
        const chatId = msg.chat?.id?.toString();
        const userId = msg.from?.id;
        void this.logAction('telegram_message_error', {
          error: (error as Error).message,
          chatId,
          userId: userId ?? chatId ?? null
        });
      });
    });

    this.bot.on('callback_query', (query) => {
      this.handleCallback(query).catch((error) => {
        const chatId = query.message?.chat?.id?.toString();
        const userId = query.from?.id;
        void this.logAction('telegram_callback_error', {
          error: (error as Error).message,
          chatId,
          userId: userId ?? chatId ?? null
        });
      });
    });
  }

  private async handleMessage(message: TelegramBot.Message): Promise<void> {
    if (!this.bot || !message.chat || !message.text) {
      return;
    }

    const chatId = message.chat.id;
    const chatIdStr = chatId.toString();
    const userId = message.from?.id;
    const language = this.resolveLanguage(chatId, message.from?.language_code);
    const text = message.text.trim();

    if (this.isBlocked(chatId)) {
      if (!this.notifiedBlock.has(chatId)) {
        await this.bot.sendMessage(chatId, TRANSLATIONS[language].stillBlocked);
        this.notifiedBlock.add(chatId);
      }
      await this.logAction('telegram_message_blocked', { chatId: chatIdStr, userId, text });
      return;
    }

    if (text.startsWith('/')) {
      await this.handleCommand(chatId, userId, text, language);
      return;
    }

    if (/^add:/i.test(text)) {
      await this.processAttach(chatId, userId, text, language);
      return;
    }

    if (/^delete:/i.test(text)) {
      await this.processDetach(chatId, userId, text, language);
      return;
    }
  }

  private async handleCommand(chatId: number, userId: number | undefined, text: string, language: Language): Promise<void> {
    const chatIdStr = chatId.toString();
    const command = text.split('@')[0];
    switch (command) {
      case '/subscriptions':
        await this.showSubscriptions(chatId, userId, language);
        await this.logAction('telegram_command_subscriptions', { chatId: chatIdStr, userId });
        break;
      case '/info':
        await this.bot?.sendMessage(chatId, this.interpolate(TRANSLATIONS[language].info, {
          userId: userId ?? 'unknown',
          chatId
        }));
        await this.logAction('telegram_command_info', { chatId: chatIdStr, userId });
        break;
      case '/language':
        await this.askLanguage(chatId, language);
        await this.logAction('telegram_command_language', { chatId: chatIdStr, userId });
        break;
      case '/start': {
        const payload = text.split(' ').slice(1).join(' ').trim();
        await this.logAction('telegram_command_start', { chatId: chatIdStr, userId, payload });
        if (!payload) {
          break;
        }
        if (/^add:/i.test(payload)) {
          await this.processAttach(chatId, userId, payload, language);
          return;
        }
        if (/^delete:/i.test(payload)) {
          await this.processDetach(chatId, userId, payload, language);
          return;
        }
        await this.bot?.sendMessage(chatId, TRANSLATIONS[language].invalidFormat);
        break;
      }
      default:
        break;
    }
  }

  private extractUuid(text: string): string | null {
    const match = text.trim().match(/^[^:]+:\s*(.+)$/);
    if (!match) {
      return null;
    }
    return match[1]?.trim() ?? null;
  }

  private async processAttach(chatId: number, userId: number | undefined, text: string, language: Language): Promise<void> {
    const uuid = this.extractUuid(text);
    if (!uuid || !uuidValidate(uuid)) {
      await this.registerInvalidAttempt(chatId, userId, language, uuid ?? text);
      return;
    }

    const project = await ProjectModel.findOne({ uuid });
    if (!project) {
      await this.registerInvalidAttempt(chatId, userId, language, uuid);
      return;
    }

    const chatIdStr = chatId.toString();
    if (project.uuid === 'logger-system') {
      await this.bot?.sendMessage(chatId, TRANSLATIONS[language].systemSubscribeForbidden);
      await this.logAction('telegram_subscription_forbidden_logger_core', {
        chatId: chatIdStr,
        userId,
        projectUuid: project.uuid
      });
      this.resetInvalid(chatId);
      return;
    }

    const exists = project.telegramNotify.recipients.find((recipient) => recipient.chatId === chatIdStr);
    if (exists) {
      await this.bot?.sendMessage(chatId, this.interpolate(TRANSLATIONS[language].addExists, {
        name: project.name,
        uuid: project.uuid
      }));
      await this.logAction('telegram_subscription_exists', { chatId: chatIdStr, userId, projectUuid: project.uuid });
      this.resetInvalid(chatId);
      return;
    }

    project.telegramNotify.recipients.push({ chatId: chatIdStr, tags: [] });
    await project.save();
    await this.bot?.sendMessage(chatId, this.interpolate(TRANSLATIONS[language].addSuccess, {
      name: project.name,
      uuid: project.uuid
    }));
    await this.logAction('telegram_subscription_added', { chatId: chatIdStr, userId, projectUuid: project.uuid });
    this.resetInvalid(chatId);
  }

  private async processDetach(chatId: number, userId: number | undefined, text: string, language: Language): Promise<void> {
    const uuid = this.extractUuid(text);
    if (!uuid || !uuidValidate(uuid)) {
      await this.registerInvalidAttempt(chatId, userId, language, uuid ?? text);
      return;
    }

    const project = await ProjectModel.findOne({ uuid });
    if (!project) {
      await this.registerInvalidAttempt(chatId, userId, language, uuid);
      return;
    }

    const chatIdStr = chatId.toString();
    const initialLength = project.telegramNotify.recipients.length;
    project.telegramNotify.recipients = project.telegramNotify.recipients.filter((recipient) => recipient.chatId !== chatIdStr);

    if (project.telegramNotify.recipients.length === initialLength) {
      await this.bot?.sendMessage(chatId, TRANSLATIONS[language].deleteMissing);
      await this.logAction('telegram_subscription_missing', { chatId: chatIdStr, userId, projectUuid: project.uuid });
      this.resetInvalid(chatId);
      return;
    }

    await project.save();
    await this.bot?.sendMessage(chatId, this.interpolate(TRANSLATIONS[language].deleteSuccess, {
      name: project.name,
      uuid: project.uuid
    }));
    await this.logAction('telegram_subscription_removed', { chatId: chatIdStr, userId, projectUuid: project.uuid });
    this.resetInvalid(chatId);
  }

  private async showSubscriptions(chatId: number, userId: number | undefined, language: Language): Promise<void> {
    const chatIdStr = chatId.toString();
    const projects = await ProjectModel.find({ 'telegramNotify.recipients.chatId': chatIdStr });
    if (!projects.length) {
      await this.bot?.sendMessage(chatId, TRANSLATIONS[language].subscriptionsEmpty);
      return;
    }

    const lines = [TRANSLATIONS[language].subscriptionsHeader];
    const keyboard = projects.map((project) => [{
      text: this.interpolate(TRANSLATIONS[language].subscriptionsAction, { name: project.name }),
      callback_data: `unsubscribe:${project.uuid}`
    }]);

    for (const project of projects) {
      lines.push(`• ${project.name} (${project.uuid})`);
    }

    await this.bot?.sendMessage(chatId, lines.join('\n'), {
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  }

  private async askLanguage(chatId: number, language: Language): Promise<void> {
    await this.bot?.sendMessage(chatId, TRANSLATIONS[language].languagePrompt, {
      reply_markup: {
        inline_keyboard: [[
          { text: 'Русский', callback_data: 'language:ru' },
          { text: 'English', callback_data: 'language:en' }
        ]]
      }
    });
  }

  private async handleCallback(query: TelegramBot.CallbackQuery): Promise<void> {
    if (!this.bot || !query.message || !query.data) {
      return;
    }

    const chatId = query.message.chat.id;
    const chatIdStr = chatId.toString();
    const userId = query.from.id;
    const language = this.resolveLanguage(chatId, query.from.language_code);
    const [action, value] = query.data.split(':');

    if (action === 'unsubscribe' && value) {
      const project = await ProjectModel.findOne({ uuid: value });
      if (!project) {
        await this.bot.answerCallbackQuery(query.id, { text: this.interpolate(TRANSLATIONS[language].unknownProject, { uuid: value }), show_alert: true });
        await this.logAction('telegram_callback_unknown_project', { chatId: chatIdStr, userId, projectUuid: value });
        return;
      }
      const initialLength = project.telegramNotify.recipients.length;
      project.telegramNotify.recipients = project.telegramNotify.recipients.filter((recipient) => recipient.chatId !== chatIdStr);
      if (project.telegramNotify.recipients.length !== initialLength) {
        await project.save();
        await this.logAction('telegram_subscription_removed', { chatId: chatIdStr, userId, projectUuid: value, via: 'callback' });
        await this.bot.answerCallbackQuery(query.id, { text: TRANSLATIONS[language].unsubscribeConfirmation });
        await this.bot.sendMessage(chatId, this.interpolate(TRANSLATIONS[language].deleteSuccess, {
          name: project.name,
          uuid: project.uuid
        }));
        return;
      }
      await this.bot.answerCallbackQuery(query.id, { text: TRANSLATIONS[language].deleteMissing, show_alert: true });
      await this.bot.sendMessage(chatId, TRANSLATIONS[language].deleteMissing);
      await this.logAction('telegram_subscription_missing', { chatId: chatIdStr, userId, projectUuid: value, via: 'callback' });
      return;
    }

    if (action === 'language' && (value === 'ru' || value === 'en')) {
      this.userLanguages.set(chatId, value);
      this.notifiedBlock.delete(chatId);
      await this.bot.answerCallbackQuery(query.id, { text: value === 'ru' ? TRANSLATIONS.ru.languageSetRu : TRANSLATIONS.en.languageSetEn });
      await this.logAction('telegram_language_changed', { chatId: chatIdStr, userId, language: value });
      await this.bot.sendMessage(chatId, value === 'ru' ? TRANSLATIONS.ru.languageSetRu : TRANSLATIONS.en.languageSetEn);
      return;
    }
  }

  private resolveLanguage(chatId: number, userLanguage?: string): Language {
    const stored = this.userLanguages.get(chatId);
    if (stored) {
      return stored;
    }
    if (userLanguage?.startsWith('en')) {
      this.userLanguages.set(chatId, 'en');
      return 'en';
    }
    this.userLanguages.set(chatId, 'ru');
    return 'ru';
  }

  private async registerInvalidAttempt(chatId: number, userId: number | undefined, language: Language, uuid: string): Promise<void> {
    const chatIdStr = chatId.toString();
    const state = this.invalidState.get(chatId) ?? { attempts: 0 };
    state.attempts += 1;
    this.invalidState.set(chatId, state);

    if (state.attempts >= 10) {
      state.blockedUntil = Date.now() + 60 * 60 * 1000;
      this.notifiedBlock.delete(chatId);
      await this.bot?.sendMessage(chatId, TRANSLATIONS[language].blocked);
      await this.logAction('telegram_user_blocked', { chatId: chatIdStr, userId, invalidUuid: uuid });
      return;
    }

    await this.bot?.sendMessage(chatId, TRANSLATIONS[language].addInvalid);
    await this.logAction('telegram_invalid_uuid', { chatId: chatIdStr, userId, invalidUuid: uuid, attempt: state.attempts });
  }

  private resetInvalid(chatId: number): void {
    this.invalidState.delete(chatId);
    this.notifiedBlock.delete(chatId);
  }

  private isBlocked(chatId: number): boolean {
    const state = this.invalidState.get(chatId);
    if (!state?.blockedUntil) {
      return false;
    }
    if (state.blockedUntil <= Date.now()) {
      this.invalidState.delete(chatId);
      this.notifiedBlock.delete(chatId);
      return false;
    }
    return true;
  }

  private async registerCommands(): Promise<void> {
    if (!this.bot) {
      return;
    }

    const ruCommands: TelegramBot.BotCommand[] = [
      { command: 'subscriptions', description: TRANSLATIONS.ru.commandSubscriptions },
      { command: 'info', description: TRANSLATIONS.ru.commandInfo },
      { command: 'language', description: TRANSLATIONS.ru.commandLanguage }
    ];

    const enCommands: TelegramBot.BotCommand[] = [
      { command: 'subscriptions', description: TRANSLATIONS.en.commandSubscriptions },
      { command: 'info', description: TRANSLATIONS.en.commandInfo },
      { command: 'language', description: TRANSLATIONS.en.commandLanguage }
    ];

    try {
      await this.bot.setMyCommands(ruCommands, { language_code: 'ru' });
      await this.bot.setMyCommands(enCommands, { language_code: 'en' });
      await this.bot.setMyCommands(enCommands);
    } catch (error) {
      await this.logAction('telegram_commands_error', { error: (error as Error).message, userId: null });
    }
  }

  private interpolate(template: string, values: Record<string, unknown>): string {
    return template.replace(/{{(.*?)}}/g, (_, key: string) => {
      const value = values[key.trim()];
      return value !== undefined ? String(value) : '';
    });
  }

  private applyBotUrlFromEnv(botUrl?: string): void {
    if (!botUrl) {
      return;
    }

    if (this.isValidBotUrl(botUrl)) {
      this.botUrlInfo = { url: botUrl, source: 'env' };
      return;
    }

    void this.logAction('telegram_bot_url_invalid', { botUrl, userId: null });
  }

  private isValidBotUrl(botUrl: string): boolean {
    try {
      const parsed = new URL(botUrl);
      return parsed.protocol === 'https:' && parsed.hostname === 't.me' && Boolean(parsed.pathname.replace('/', ''));
    } catch {
      return false;
    }
  }

  private async resolveBotUrl(): Promise<void> {
    if (this.botUrlInfo.source === 'env') {
      return;
    }

    if (!this.bot) {
      this.botUrlInfo = { url: null, source: 'inactive' };
      return;
    }

    if (!this.botUrlPromise) {
      this.botUrlPromise = this.fetchBotUrlFromTelegram();
    }

    await this.botUrlPromise;
  }

  private async fetchBotUrlFromTelegram(): Promise<void> {
    if (!this.bot) {
      this.botUrlInfo = { url: null, source: 'inactive' };
      return;
    }

    try {
      const me = await this.bot.getMe();
      if (me.username) {
        this.botUrlInfo = { url: `https://t.me/${me.username}`, source: 'telegram' };
        return;
      }
      this.botUrlInfo = { url: null, source: 'unknown' };
    } catch (error) {
      this.botUrlInfo = { url: null, source: 'unknown' };
      await this.logAction('telegram_bot_url_fetch_error', { error: (error as Error).message, userId: null });
    }
  }

  async getBotUrlInfo(): Promise<{ url: string | null; source: BotUrlSource; botActive: boolean }> {
    await this.resolveBotUrl();
    return { ...this.botUrlInfo, botActive: Boolean(this.bot) };
  }

  async logAction(message: string, metadata: Record<string, unknown>): Promise<void> {
    try {
      const enriched: Record<string, unknown> = { ...metadata };
      if (!Object.prototype.hasOwnProperty.call(enriched, 'chatId')) {
        enriched.chatId = null;
      }
      if (!Object.prototype.hasOwnProperty.call(enriched, 'userId')) {
        const chatId = enriched.chatId;
        enriched.userId = chatId ?? null;
      }
      await writeSystemLog(message, { tags: ['TELEGRAM'], metadata: enriched });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to write telegram system log', error);
    }
  }

  private resolveLanguageForChat(chatId: string): Language {
    const numericChatId = Number(chatId);
    if (!Number.isNaN(numericChatId) && this.userLanguages.has(numericChatId)) {
      return this.userLanguages.get(numericChatId)!;
    }
    return 'ru';
  }

  async notifyUnsubscribed(
    project: ProjectDocument,
    chatId: string,
    reason: 'manual' | 'project_disabled' | 'project_deleted'
  ): Promise<void> {
    const language = this.resolveLanguageForChat(chatId);
    const numericChatId = Number(chatId);
    const templateKey =
      reason === 'project_disabled'
        ? 'unsubscribeDisabled'
        : reason === 'project_deleted'
          ? 'unsubscribeDeleted'
          : 'deleteSuccess';

    if (!Number.isNaN(numericChatId) && this.bot) {
      try {
        await this.bot.sendMessage(
          numericChatId,
          this.interpolate(TRANSLATIONS[language][templateKey], {
            name: project.name,
            uuid: project.uuid
          })
        );
      } catch (error) {
        await this.logAction('telegram_unsubscribe_notification_error', {
          chatId,
          projectUuid: project.uuid,
          reason,
          error: (error as Error).message,
          userId: chatId
        });
      }
    }

    await this.logAction('telegram_subscription_removed', {
      chatId,
      projectUuid: project.uuid,
      reason,
      userId: chatId
    });
  }

  buildCommand(action: 'ADD' | 'DELETE', projectUuid: string): string {
    return `${action}:${projectUuid}`;
  }
}

export const defaultNotifier = new TelegramNotifier(process.env.BOT_API_KEY);
