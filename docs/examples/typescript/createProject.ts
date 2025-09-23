import { LoggerApiClient } from './loggerClient';

/**
 * Creates a new logging project and prints its UUID.
 */
async function main(): Promise<void> {
  const client = new LoggerApiClient({ baseUrl: 'http://localhost:3000/api' });
  client.setToken('<paste token from login example>');

  try {
    const project = await client.createProject({
      name: 'Orders Service',
      description: 'Handles order processing events',
      logFormat: { level: 'string', message: 'string', timestamp: 'ISO8601' },
      customTags: ['PAYMENT', 'SHIPPING'],
      telegramNotify: {
        enabled: true,
        recipients: [{ chatId: '123456', tags: ['ERROR', 'CRITICAL'] }],
        antiSpamInterval: 30
      },
      debugMode: false
    });

    console.log('Created project UUID:', project.uuid);
  } catch (error) {
    console.error('Failed to create project:', error);
  }
}

void main();
