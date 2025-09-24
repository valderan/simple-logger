import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography
} from '@mui/material';
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
import { fetchPingServices, fetchProjectLogs, fetchProjects } from '../api';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { formatDateTime, formatRelative } from '../utils/formatters';
import { Project } from '../api/types';
import { useTranslation } from '../hooks/useTranslation';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const criticalLevels = ['ERROR', 'CRITICAL'];

export const DashboardPage = (): JSX.Element => {
  const { t } = useTranslation();
  const {
    data: projects,
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects
  } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });

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

  const latestIncidents = useMemo(() => {
    const allLogs = logsQueries
      .flatMap((query) => query.data?.logs ?? [])
      .filter((log) => criticalLevels.includes(log.level) || log.tags.some((tag) => tag.includes('ERROR')))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return allLogs.slice(0, 8);
  }, [logsQueries]);

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

  const isLoading = projectsLoading || logsQueries.some((query) => query.isLoading) || pingQueries.some((query) => query.isLoading);
  const hasError = projectsError || logsQueries.some((query) => query.isError) || pingQueries.some((query) => query.isError);

  if (isLoading) {
    return <LoadingState />;
  }

  if (hasError) {
    return <ErrorState message={t('dashboard.loadError')} onRetry={() => refetchProjects()} />;
  }

  const totalPingServices = pingQueries.reduce((acc, query) => acc + (query.data?.length ?? 0), 0);
  const projectsWithAlerts = projects?.filter((project) => project.telegramNotify.enabled).length ?? 0;

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {t('dashboard.title')}
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                {t('dashboard.totalProjects')}
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {projects?.length ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.totalProjectsDescription')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                {t('dashboard.pingMonitoring')}
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {totalPingServices}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.pingMonitoringDescription')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                {t('dashboard.telegramEnabled')}
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {projectsWithAlerts}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.telegramEnabledDescription')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
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
                    return (
                      <ListItem key={log._id} divider alignItems="flex-start">
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {log.level}
                              </Typography>
                              <Chip label={log.projectUuid} size="small" />
                              <Typography variant="caption" color="text.secondary">
                                {formatRelative(log.timestamp)}
                              </Typography>
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
