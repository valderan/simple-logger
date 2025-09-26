export function normalizeIp(rawIp: string | undefined | null): string {
  if (!rawIp) {
    return '';
  }
  return rawIp.replace('::ffff:', '');
}

export function isLoopback(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1';
}
