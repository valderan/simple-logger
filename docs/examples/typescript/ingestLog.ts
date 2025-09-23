import { LoggerApiClient } from './loggerClient';

/**
 * Sends an application log entry to the collector.  This endpoint does not require
 * administrator authentication because it is intended for services emitting logs.
 */
async function main(): Promise<void> {
  const client = new LoggerApiClient({ baseUrl: 'http://localhost:3000/api' });

  try {
    const log = await client.ingestLog({
      uuid: '<project-uuid>',
      log: {
        level: 'ERROR',
        message: 'Payment gateway returned non-200 response',
        tags: ['PAYMENT'],
        metadata: {
          service: 'billing-service',
          user: 'user-42',
          ip: '10.0.0.12',
          extra: { orderId: 'A-42' }
        }
      }
    });

    console.log('Stored log with id:', log._id);
  } catch (error) {
    console.error('Failed to send log:', error);
  }
}

void main();
