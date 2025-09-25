import { SystemSettingsDocument, SystemSettingsModel } from '../models/SystemSettings';

const DEFAULT_RATE_LIMIT = 120;
const SETTINGS_ID = 'global';
const CACHE_TTL_MS = 60 * 1000;

let cachedSettings: SystemSettingsDocument | null = null;
let cacheLoadedAt = 0;
let loadingPromise: Promise<SystemSettingsDocument> | null = null;

async function loadSettings(): Promise<SystemSettingsDocument> {
  if (cachedSettings && Date.now() - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedSettings;
  }

  if (!loadingPromise) {
    loadingPromise = (async () => {
      const settings = await SystemSettingsModel.findById(SETTINGS_ID);
      if (settings) {
        cachedSettings = settings;
        cacheLoadedAt = Date.now();
        return settings;
      }
      const created = await SystemSettingsModel.create({ _id: SETTINGS_ID, rateLimitPerMinute: DEFAULT_RATE_LIMIT });
      cachedSettings = created;
      cacheLoadedAt = Date.now();
      return created;
    })();
  }

  try {
    const result = await loadingPromise;
    return result;
  } finally {
    loadingPromise = null;
  }
}

export async function getRateLimitValue(): Promise<number> {
  const settings = await loadSettings();
  return settings.rateLimitPerMinute ?? DEFAULT_RATE_LIMIT;
}

export async function updateRateLimitValue(rateLimitPerMinute: number): Promise<SystemSettingsDocument> {
  const settings = await SystemSettingsModel.findOneAndUpdate(
    { _id: SETTINGS_ID },
    { rateLimitPerMinute },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  cachedSettings = settings;
  cacheLoadedAt = Date.now();
  return settings;
}

export function clearSettingsCache(): void {
  cachedSettings = null;
  cacheLoadedAt = 0;
}
