import { LoggerApiClient } from './loggerClient';

/**
 * Adds or updates an IP address in the whitelist.
 */
async function main(): Promise<void> {
  const client = new LoggerApiClient({ baseUrl: 'http://localhost:3000/api', token: '<token>' });

  try {
    const entry = await client.addWhitelistIp({
      ip: '192.168.0.10',
      description: 'VPN gateway'
    });

    console.log('Whitelist entry saved:', entry);
  } catch (error) {
    console.error('Failed to add whitelist entry:', error);
  }
}

void main();
