import { FilterQuery, Types } from 'mongoose';
import { WhitelistDocument, WhitelistModel } from '../models/Whitelist';
import { normalizeIp } from '../utils/ipUtils';

function resolveAdminIp(): string | null {
  const value = normalizeIp(process.env.ADMIN_IP ?? '').trim();
  return value ? value : null;
}

export function getAdminIp(): string | null {
  return resolveAdminIp();
}

export async function ensureAdminIpInWhitelist(): Promise<void> {
  const adminIp = resolveAdminIp();
  if (!adminIp) {
    return;
  }
  await WhitelistModel.findOneAndUpdate(
    { ip: adminIp },
    { $setOnInsert: { ip: adminIp } } as FilterQuery<WhitelistDocument>,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export interface WhitelistInput {
  ip: string;
  description?: string;
}

export interface WhitelistResponse {
  _id: string;
  ip: string;
  description?: string;
  createdAt: Date;
  isProtected: boolean;
}

function isAdminIp(value: string): boolean {
  const adminIp = resolveAdminIp();
  return Boolean(adminIp) && normalizeIp(value) === adminIp;
}

function toWhitelistResponse(document: WhitelistDocument): WhitelistResponse {
  const ip = document.ip;
  return {
    _id: (document._id as unknown as Types.ObjectId).toString(),
    ip,
    description: document.description,
    createdAt: document.createdAt,
    isProtected: isAdminIp(ip)
  };
}

export async function upsertWhitelistEntry(payload: WhitelistInput): Promise<WhitelistResponse> {
  const ip = normalizeIp(payload.ip);
  const update: Record<string, unknown> = { ip };
  if (payload.description !== undefined) {
    update.description = payload.description;
  }
  const document = await WhitelistModel.findOneAndUpdate(
    { ip },
    update as FilterQuery<WhitelistDocument>,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (!document) {
    throw new Error('Failed to upsert whitelist entry');
  }
  return toWhitelistResponse(document);
}

export type RemoveWhitelistResult =
  | { status: 'deleted' }
  | { status: 'protected' }
  | { status: 'not_found' };

export async function removeWhitelistEntry(ip: string): Promise<RemoveWhitelistResult> {
  const normalized = normalizeIp(ip);
  const adminIp = resolveAdminIp();
  if (adminIp && normalized === adminIp) {
    return { status: 'protected' };
  }
  const document = await WhitelistModel.findOneAndDelete({ ip: normalized });
  if (!document) {
    return { status: 'not_found' };
  }
  return { status: 'deleted' };
}

export async function listWhitelistEntries(): Promise<WhitelistResponse[]> {
  const entries = await WhitelistModel.find().sort({ createdAt: -1 }).lean();
  const mapped = entries.map((entry) => ({
    _id: (entry._id as Types.ObjectId).toString(),
    ip: entry.ip,
    description: entry.description,
    createdAt: entry.createdAt as Date,
    isProtected: isAdminIp(entry.ip)
  }));
  const admin = getAdminIp();
  if (admin && !mapped.some((entry) => normalizeIp(entry.ip) === admin)) {
    mapped.push({
      _id: admin,
      ip: admin,
      description: undefined,
      createdAt: new Date(0),
      isProtected: true
    });
  }
  return mapped;
}
