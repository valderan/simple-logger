import { LoggerApiClient } from './loggerClient';

/**
 * Updates an existing logging project using its UUID.
 */
async function main(): Promise<void> {
  const client = new LoggerApiClient({ baseUrl: 'http://localhost:3000/api' });
  client.setToken('<paste token from login example>');

  const projectUuid = '<project uuid>';

  try {
    const updated = await client.updateProject(projectUuid, {
      name: 'Orders Service',
      description: 'Updated description with SLA details',
      logFormat: { level: 'string', message: 'string', timestamp: 'ISO8601' },
      defaultTags: ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
      customTags: ['PAYMENT', 'SHIPPING'],
      accessLevel: 'global',
      telegramNotify: {
        enabled: true,
        recipients: [{ chatId: '123456', tags: ['ERROR', 'CRITICAL'] }],
        antiSpamInterval: 20
      },
      debugMode: false,
      maxLogEntries: 0
    });

    console.log('Project updated. New description:', updated.description);
  } catch (error) {
    console.error('Failed to update project:', error);
  }
}

void main();
