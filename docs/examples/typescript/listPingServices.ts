import { LoggerApiClient } from './loggerClient';

/**
 * Displays every ping service registered for the project.
 */
async function main(): Promise<void> {
  const client = new LoggerApiClient({ baseUrl: 'http://localhost:3000/api', token: '<token>' });

  try {
    const services = await client.listPingServices('<project-uuid>');
    services.forEach((service) => {
      console.log(`${service.name} -> ${service.url} (interval ${service.interval}s)`);
    });
  } catch (error) {
    console.error('Failed to list ping services:', error);
  }
}

void main();
