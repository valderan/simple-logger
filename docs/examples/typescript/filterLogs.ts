import { LoggerApiClient } from './loggerClient';

/**
 * Demonstrates advanced filtering features.  The query is identical to the parameters
 * available in the UI and supports filtering by level, tags, user metadata and time range.
 */
async function main(): Promise<void> {
  const client = new LoggerApiClient({ baseUrl: 'http://localhost:3000/api', token: '<token>' });

  try {
    const { logs } = await client.filterLogs({
      uuid: '<project-uuid>',
      level: 'ERROR',
      text: 'payment',
      startDate: '2024-05-01T00:00:00.000Z',
      endDate: '2024-05-31T23:59:59.999Z'
    });

    console.log('Found', logs.length, 'matching logs.');
  } catch (error) {
    console.error('Failed to filter logs:', error);
  }
}

void main();
