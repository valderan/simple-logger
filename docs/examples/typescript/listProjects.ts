import { LoggerApiClient } from './loggerClient';

/**
 * Requests the list of projects.  This endpoint requires administrator authorization.
 */
async function main(): Promise<void> {
  const client = new LoggerApiClient({ baseUrl: 'http://localhost:3000/api', token: '<token>' });

  try {
    const projects = await client.listProjects();
    for (const project of projects) {
      console.log(`[${project.uuid}] ${project.name} -> ${project.description}`);
    }
  } catch (error) {
    console.error('Failed to list projects:', error);
  }
}

void main();
