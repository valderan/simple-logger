import { FilterQuery } from 'mongoose';
import { BlacklistDocument, BlacklistModel } from '../models/Blacklist';
import { normalizeIp } from '../utils/ipUtils';
import { writeSystemLog } from '../utils/systemLogger';

const CACHE_TTL_MS = 60 * 1000;
let cachedAt = 0;
let cache = new Map<string, { reason: string; expiresAt: Date | null }>();

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
}

function isActiveRecord(record: { expiresAt: Date | null }): boolean {
  if (!record.expiresAt) {
    return true;
  }
  return record.expiresAt.getTime() > Date.now();
}

async function refreshCache(force = false): Promise<void> {
  if (!force && Date.now() - cachedAt < CACHE_TTL_MS) {
    return;
  }
  const records = await BlacklistModel.find();
  const activeRecords: typeof records = [];
  const expiredRecords: typeof records = [];
  const now = Date.now();
  for (const record of records) {
    const expiresAt = record.expiresAt ?? null;
    if (expiresAt && expiresAt.getTime() <= now) {
      expiredRecords.push(record);
    } else {
      activeRecords.push(record);
    }
  }
  if (expiredRecords.length > 0) {
    const ids = expiredRecords.map((record) => record._id);
    const { deletedCount = 0 } = await BlacklistModel.deleteMany({ _id: { $in: ids } });
    if (deletedCount > 0) {
      await Promise.all(
        expiredRecords.map((record) =>
          writeSystemLog(`Automatically lifted IP block ${record.ip}`, {
            level: 'SECURITY',
            tags: ['BLACKLIST', 'SECURITY'],
            metadata: {
              ip: record.ip,
              service: 'blacklist-cleanup',
              extra: {
                reason: record.reason,
                expiredAt: record.expiresAt ? record.expiresAt.toISOString() : null
              }
            }
          })
        )
      );
    }
  }
  cache = new Map(activeRecords.map((record) => [record.ip, { reason: record.reason, expiresAt: record.expiresAt ?? null }]));
  cachedAt = Date.now();
}

export async function invalidateBlacklistCache(): Promise<void> {
  cachedAt = 0;
  cache.clear();
}

export interface BlacklistInput {
  ip: string;
  reason: string;
  expiresAt?: Date | null;
}

export interface BlacklistUpdateInput {
  ip?: string;
  reason?: string;
  expiresAt?: Date | null;
}

export async function createBlacklistEntry(payload: BlacklistInput): Promise<BlacklistDocument> {
  const ip = normalizeIp(payload.ip);
  const expiresAt = toDate(payload.expiresAt);
  const record = await BlacklistModel.create({
    ip,
    reason: payload.reason,
    expiresAt
  });
  await invalidateBlacklistCache();
  await writeSystemLog(`Added IP block ${record.ip}`, {
    level: 'SECURITY',
    tags: ['BLACKLIST', 'SETTINGS'],
    metadata: {
      ip: record.ip,
      service: 'blacklist-settings',
      extra: {
        reason: record.reason,
        expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null
      }
    }
  });
  return record;
}

export async function updateBlacklistEntry(id: string, payload: BlacklistUpdateInput): Promise<BlacklistDocument | null> {
  const update: Record<string, unknown> = {};
  if (payload.ip !== undefined) {
    update.ip = normalizeIp(payload.ip);
  }
  if (payload.reason !== undefined) {
    update.reason = payload.reason;
  }
  if (payload.expiresAt !== undefined) {
    update.expiresAt = toDate(payload.expiresAt);
  }
  const record = await BlacklistModel.findByIdAndUpdate(id, update as FilterQuery<BlacklistDocument>, {
    new: true,
    runValidators: true,
    context: 'query'
  });
  if (!record) {
    return null;
  }
  await invalidateBlacklistCache();
  await writeSystemLog(`Updated IP block ${record.ip}`, {
    level: 'SECURITY',
    tags: ['BLACKLIST', 'SETTINGS'],
    metadata: {
      ip: record.ip,
      service: 'blacklist-settings',
      extra: {
        reason: record.reason,
        expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null
      }
    }
  });
  return record;
}

export async function deleteBlacklistEntry(id: string): Promise<BlacklistDocument | null> {
  const record = await BlacklistModel.findByIdAndDelete(id);
  if (!record) {
    return null;
  }
  await invalidateBlacklistCache();
  await writeSystemLog(`Removed IP block ${record.ip}`, {
    level: 'SECURITY',
    tags: ['BLACKLIST', 'SETTINGS'],
    metadata: {
      ip: record.ip,
      service: 'blacklist-settings',
      extra: {
        reason: record.reason,
        expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null
      }
    }
  });
  return record;
}

export async function listBlacklistEntries(): Promise<BlacklistDocument[]> {
  return BlacklistModel.find().sort({ createdAt: -1 });
}

export async function findActiveBlock(ip: string): Promise<{ reason: string; expiresAt: Date | null } | null> {
  const normalized = normalizeIp(ip);
  await refreshCache();
  const record = cache.get(normalized);
  if (!record) {
    return null;
  }
  if (!isActiveRecord(record)) {
    return null;
  }
  return record;
}
