import { LoggerApiClient } from './loggerClient';

/**
 * Retrieves the most recent logs for a project.
 */
async function main(): Promise<void> {
  const client = new LoggerApiClient({ baseUrl: 'http://localhost:3000/api', token: '<token>' });

  try {
    const { project, logs } = await client.getProjectLogs('<project-uuid>', {
      level: 'ERROR',
      startDate: '2024-05-01T00:00:00.000Z'
    });

    console.log('Project:', project.name, 'has', logs.length, 'logs matching the filter.');
    console.log('Latest log entry:', logs[0]);
  } catch (error) {
    console.error('Failed to load project logs:', error);
  }
}

void main();
