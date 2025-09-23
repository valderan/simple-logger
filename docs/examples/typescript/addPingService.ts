import { LoggerApiClient } from './loggerClient';

/**
 * Registers a new ping service that will be periodically monitored by the logger.
 */
async function main(): Promise<void> {
  const client = new LoggerApiClient({ baseUrl: 'http://localhost:3000/api', token: '<token>' });

  try {
    const service = await client.addPingService('<project-uuid>', {
      name: 'Billing health-check',
      url: 'https://billing.example.com/health',
      interval: 60,
      telegramTags: ['PING_DOWN']
    });

    console.log('Created ping service:', service);
  } catch (error) {
    console.error('Failed to add ping service:', error);
  }
}

void main();
