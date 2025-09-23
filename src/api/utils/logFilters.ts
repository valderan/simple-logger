import { FilterQuery } from 'mongoose';
import { LogDocument } from '../models/Log';

export interface LogFilterParams {
  level?: string;
  text?: string;
  tag?: string;
  user?: string;
  ip?: string;
  service?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Формирует фильтр для выборки логов по параметрам запроса.
 */
export function buildLogFilter(projectUuid: string, params: LogFilterParams): FilterQuery<LogDocument> {
  const query: FilterQuery<LogDocument> = { projectUuid };
  if (params.level) {
    query.level = params.level;
  }
  if (params.tag) {
    query.tags = params.tag;
  }
  if (params.text) {
    query.message = { $regex: params.text, $options: 'i' };
  }
  if (params.user) {
    query['metadata.user'] = params.user;
  }
  if (params.ip) {
    query['metadata.ip'] = params.ip;
  }
  if (params.service) {
    query['metadata.service'] = params.service;
  }
  if (params.startDate || params.endDate) {
    query.timestamp = {};
    if (params.startDate) {
      query.timestamp.$gte = new Date(params.startDate);
    }
    if (params.endDate) {
      query.timestamp.$lte = new Date(params.endDate);
    }
  }
  return query;
}
