import axios from 'axios';
import { PingServiceDocument, PingServiceModel } from '../api/models/PingService';
import { ProjectModel } from '../api/models/Project';
import { writeSystemLog } from '../api/utils/systemLogger';
import { defaultNotifier } from '../telegram/notifier';

/**
 * Менеджер ping-сервисов с ручным запуском проверок.
 */
export class PingMonitor {
  /**
   * Выполняет проверку конкретного ping-сервиса и обновляет его статус.
   */
  async checkService(service: PingServiceDocument): Promise<PingServiceDocument> {
    try {
      const response = await axios.get(service.url, { timeout: service.interval * 1000 });
      const status = response.status >= 200 && response.status < 300 ? 'ok' : 'degraded';
      service.lastStatus = status;
    } catch (error) {
      service.lastStatus = 'down';
    }
    service.lastCheckedAt = new Date();
    await service.save();

    const project = await ProjectModel.findOne({ uuid: service.projectUuid });
    if (service.lastStatus === 'down') {
      await writeSystemLog(`Ping-сервис ${service.name} недоступен`, {
        level: 'ERROR',
        tags: ['PING', 'MONITOR'],
        metadata: {
          service: 'ping-monitor',
          extra: {
            projectUuid: service.projectUuid,
            pingServiceId: service.id,
            url: service.url,
            intervalSeconds: service.interval
          }
        }
      });
      if (project) {
        await defaultNotifier.notify(project, `Ping-сервис ${service.name} недоступен`, 'PING_DOWN');
      }
    }
    return service;
  }

  /**
   * Запускает проверку всех сервисов проекта.
   */
  async checkProjectServices(projectUuid: string): Promise<PingServiceDocument[]> {
    const services = await PingServiceModel.find({ projectUuid });
    const results: PingServiceDocument[] = [];
    for (const service of services) {
      results.push(await this.checkService(service));
    }
    return results;
  }
}

export const defaultPingMonitor = new PingMonitor();
