import { LoggerApiClient } from './loggerClient';

/**
 * Removes an IP address from the whitelist by issuing a DELETE request.
 */
async function main(): Promise<void> {
  const client = new LoggerApiClient({ baseUrl: 'http://localhost:3000/api', token: '<token>' });

  try {
    const result = await client.removeWhitelistIp('192.168.0.10');
    console.log('Removal status:', result.success);
  } catch (error) {
    console.error('Failed to remove whitelist entry:', error);
  }
}

void main();
