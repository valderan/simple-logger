import { LoggerApiClient } from './loggerClient';

/**
 * Demonstrates how to authenticate against the Simple Logger API.
 *
 * The login endpoint issues a JWT-like token that must be attached to all
 * subsequent administrator requests through the Authorization header.
 */
async function main(): Promise<void> {
  const client = new LoggerApiClient({ baseUrl: 'http://localhost:3000/api' });

  try {
    const response = await client.login('admin', 'secret');
    console.log('Received token:', response.token);
  } catch (error) {
    console.error('Login failed:', error);
  }
}

void main();
