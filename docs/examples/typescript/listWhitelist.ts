import { LoggerApiClient } from './loggerClient';

/**
 * Prints all entries from the whitelist.
 */
async function main(): Promise<void> {
  const client = new LoggerApiClient({ baseUrl: 'http://localhost:3000/api', token: '<token>' });

  try {
    const whitelist = await client.listWhitelist();
    whitelist.forEach((entry) => {
      console.log(`${entry.ip} -> ${entry.description ?? 'no description'}`);
    });
  } catch (error) {
    console.error('Failed to list whitelist entries:', error);
  }
}

void main();
