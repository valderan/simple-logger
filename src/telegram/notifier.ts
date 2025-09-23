import TelegramBot from 'node-telegram-bot-api';
import { ProjectDocument } from '../api/models/Project';

/**
 * Простой адаптер для отправки уведомлений в telegram.
 */
export class TelegramNotifier {
  private bot?: TelegramBot;
  private lastSent = new Map<string, number>();

  constructor(private readonly token?: string) {
    if (token) {
      this.bot = new TelegramBot(token, { polling: false });
    }
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
      this.lastSent.set(key, now);
    }
  }
}

export const defaultNotifier = new TelegramNotifier(process.env.BOT_API_KEY);
