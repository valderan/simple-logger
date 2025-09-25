import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography
} from '@mui/material';
import type { SxProps } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  Tooltip
} from 'chart.js';
import { fetchPingServices, fetchProjectLogs, fetchProjects, fetchRateLimitSettings } from '../api';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { formatDateTime, formatRelative } from '../utils/formatters';
import { LogEntry, Project } from '../api/types';
import { useTranslation } from '../hooks/useTranslation';
import { API_URL } from '../config';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const criticalLevels = ['ERROR', 'CRITICAL'];

export const DashboardPage = (): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    data: projects,
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects
  } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
  const rateLimitQuery = useQuery({ queryKey: ['rate-limit'], queryFn: fetchRateLimitSettings });

  const logsQueries = useQueries({
    queries: (projects ?? []).map((project) => ({
      queryKey: ['project-logs', project.uuid],
      queryFn: () => fetchProjectLogs(project.uuid),
      enabled: Boolean(projects?.length)
    }))
  });

  const pingQueries = useQueries({
    queries: (projects ?? []).map((project) => ({
      queryKey: ['ping-services', project.uuid],
      queryFn: () => fetchPingServices(project.uuid),
      enabled: Boolean(projects?.length)
    }))
  });

  const projectNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (projects ?? []).forEach((project) => {
      map.set(project.uuid, project.name);
    });
    return map;
  }, [projects]);

  const latestIncidents = useMemo(() => {
    const allLogs = logsQueries
      .flatMap((query) => query.data?.logs ?? [])
      .filter((log) => criticalLevels.includes(log.level) || log.tags.some((tag) => tag.includes('ERROR')))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return allLogs.slice(0, 8);
  }, [logsQueries]);

  const handleIncidentClick = (log: LogEntry) => {
    const params = new URLSearchParams();
    params.set('uuid', log.projectUuid);
    params.set('projectUuid', log.projectUuid);
    params.set('level', log.level);
    navigate({ pathname: '/logs', search: `?${params.toString()}` });
  };

  const logLevelsDistribution = useMemo(() => {
    const levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
    const counts = levels.map((level) =>
      logsQueries
        .flatMap((query) => query.data?.logs ?? [])
        .filter((log) => log.level === level).length
    );
    return {
      labels: levels,
      datasets: [
        {
          label: t('dashboard.logsDatasetLabel'),
          data: counts,
          backgroundColor: ['#6c757d', '#0f6efd', '#f0ad4e', '#dc3545', '#6f42c1']
        }
      ]
    };
  }, [logsQueries, t]);

  const isLoading =
    projectsLoading ||
    rateLimitQuery.isLoading ||
    logsQueries.some((query) => query.isLoading) ||
    pingQueries.some((query) => query.isLoading);
  const hasError =
    projectsError ||
    rateLimitQuery.isError ||
    logsQueries.some((query) => query.isError) ||
    pingQueries.some((query) => query.isError);

  if (isLoading) {
    return <LoadingState />;
  }

  if (hasError) {
    return <ErrorState message={t('dashboard.loadError')} onRetry={() => refetchProjects()} />;
  }

  const totalPingServices = pingQueries.reduce((acc, query) => acc + (query.data?.length ?? 0), 0);
  const projectsWithAlerts = projects?.filter((project) => project.telegramNotify.enabled).length ?? 0;

  const apiBaseUrl = API_URL?.trim() ? API_URL : '';

  const rateLimitPerMinute = rateLimitQuery.data?.rateLimitPerMinute;

  const summaryCards: {
    key: string;
    title: string;
    value: string | number;
    description?: string;
    valueVariant: 'h3' | 'body1';
    valueStyles?: SxProps;
    extra?: string;
    extraVariant?: 'caption' | 'body2';
    extraStyles?: SxProps;
  }[] = [
    {
      key: 'total-projects',
      title: t('dashboard.totalProjects'),
      value: projects?.length ?? 0,
      description: t('dashboard.totalProjectsDescription'),
      valueVariant: 'h3'
    },
    {
      key: 'ping-monitoring',
      title: t('dashboard.pingMonitoring'),
      value: totalPingServices,
      description: t('dashboard.pingMonitoringDescription'),
      valueVariant: 'h3'
    },
    {
      key: 'telegram-enabled',
      title: t('dashboard.telegramEnabled'),
      value: projectsWithAlerts,
      description: t('dashboard.telegramEnabledDescription'),
      valueVariant: 'h3'
    },
    {
      key: 'api-url',
      title: t('dashboard.apiUrlLabel'),
      value: apiBaseUrl || t('dashboard.apiUrlNotConfigured'),
      description: undefined,
      valueVariant: 'body1',
      valueStyles: { fontFamily: 'monospace', wordBreak: 'break-all' },
      extra: rateLimitPerMinute
        ? t('dashboard.rateLimitInfo', { value: rateLimitPerMinute })
        : t('dashboard.rateLimitUnknown'),
      extraVariant: 'body2',
      extraStyles: rateLimitPerMinute ? { fontWeight: 600 } : undefined
    }
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {t('dashboard.title')}
      </Typography>
      <Grid container spacing={3}>
        {summaryCards.map((card) => (
          <Grid key={card.key} size={{ xs: 12, md: 3 }} sx={{ display: 'flex' }}>
            <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {card.title}
                </Typography>
                <Typography
                  variant={card.valueVariant}
                  sx={{ fontWeight: card.valueVariant === 'h3' ? 700 : 600, ...card.valueStyles }}
                >
                  {card.value}
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                {card.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 'auto' }}>
                    {card.description}
                  </Typography>
                )}
                {card.extra && (
                  <Typography
                    variant={card.extraVariant ?? 'caption'}
                    color="text.secondary"
                    sx={{ mt: card.description ? 0 : 'auto', ...card.extraStyles }}
                  >
                    {card.extra}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {t('dashboard.logDistribution')}
              </Typography>
              <Bar
                data={logLevelsDistribution}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                  }
                }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {t('dashboard.incidents')}
              </Typography>
              {latestIncidents.length === 0 ? (
                <Alert severity="success">{t('dashboard.noIncidents')}</Alert>
              ) : (
                <List>
                  {latestIncidents.map((log) => {
                    const metadata = log.metadata ?? {};
                    const ip = metadata.ip ?? t('common.notAvailable');
                    const service = metadata.service ?? t('common.notAvailable');
                    const user = metadata.user ?? t('common.notAvailable');
                    const projectName = projectNameMap.get(log.projectUuid) ?? log.projectUuid;
                    return (
                      <ListItem key={log._id} divider disablePadding>
                        <ListItemButton alignItems="flex-start" onClick={() => handleIncidentClick(log)} sx={{ py: 1.5 }}>
                          <ListItemText
                            primary={
                              <Stack spacing={0.5}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    {log.level}
                                  </Typography>
                                  <Chip label={projectName} size="small" color="primary" />
                                </Stack>
                                <Stack
                                  direction={{ xs: 'column', sm: 'row' }}
                                  spacing={1}
                                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                                >
                                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                    {log.projectUuid}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatRelative(log.timestamp)}
                                  </Typography>
                                </Stack>
                              </Stack>
                            }
                            secondary={
                              <>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  {log.message}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {t('dashboard.incidentMeta', { ip, service, user })}
                                </Typography>
                              </>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            {t('dashboard.activeProjects')}
          </Typography>
          <List>
            {(projects ?? []).map((project: Project) => (
              <ListItem key={project.uuid} divider>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {project.name}
                      </Typography>
                      {project.telegramNotify.enabled && <Chip label={t('common.telegram')} color="primary" size="small" />}
                      {project.debugMode && <Chip label={t('common.debug')} color="warning" size="small" />}
                    </Stack>
                  }
                  secondary={t('dashboard.createdAt', {
                    uuid: project.uuid,
                    date: formatDateTime(project.createdAt),
                    access: project.accessLevel
                  })}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Stack>
  );
};
