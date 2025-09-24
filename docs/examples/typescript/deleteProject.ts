import { LoggerApiClient } from './loggerClient';

/**
 * Deletes a logging project together with its logs and ping-services.
 */
async function main(): Promise<void> {
  const client = new LoggerApiClient({ baseUrl: 'http://localhost:3000/api' });
  client.setToken('<paste token from login example>');

  const projectUuid = '<project uuid>';

  try {
    const result = await client.deleteProject(projectUuid);
    console.log('Project removed:', result);
  } catch (error) {
    console.error('Failed to delete project:', error);
  }
}

void main();
