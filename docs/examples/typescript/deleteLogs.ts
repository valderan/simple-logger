import { LoggerApiClient } from './loggerClient';

/**
 * Deletes logs in bulk using a filter similar to the query parameters of the GET /logs endpoint.
 */
async function main(): Promise<void> {
  const client = new LoggerApiClient({ baseUrl: 'http://localhost:3000/api', token: '<token>' });

  try {
    const result = await client.deleteLogs('<project-uuid>', {
      level: 'DEBUG',
      endDate: '2024-05-01T00:00:00.000Z'
    });

    console.log('Deleted logs count:', result.deleted);
  } catch (error) {
    console.error('Failed to delete logs:', error);
  }
}

void main();
