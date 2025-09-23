import { LoggerApiClient } from './loggerClient';

/**
 * Forces an immediate ping check for all services assigned to a project.
 */
async function main(): Promise<void> {
  const client = new LoggerApiClient({ baseUrl: 'http://localhost:3000/api', token: '<token>' });

  try {
    const services = await client.triggerPingCheck('<project-uuid>');
    console.log('Ping results:', services);
  } catch (error) {
    console.error('Failed to trigger ping check:', error);
  }
}

void main();
