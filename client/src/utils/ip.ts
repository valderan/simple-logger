export const isValidIpAddress = (value: string): boolean => {
  const input = value.trim();
  if (!input) {
    return false;
  }

  const hasColon = input.includes(':');
  const hasDot = input.includes('.');
  try {
    if (hasColon && !hasDot) {
      const url = new URL(`http://[${input}]`);
      return stripIpv6Brackets(url.hostname) === stripIpv6Brackets(input) && isUrlClean(url);
    }

    const url = new URL(`http://${input}`);
    return url.hostname === input && isUrlClean(url);
  } catch {
    return false;
  }
};

const stripIpv6Brackets = (value: string): string => value.replace(/^\[/, '').replace(/\]$/, '');

const isUrlClean = (url: URL): boolean =>
  !url.username &&
  !url.password &&
  !url.port &&
  (url.pathname === '/' || url.pathname === '') &&
  !url.search &&
  !url.hash;
