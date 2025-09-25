import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  createPingService,
  deletePingService,
  fetchPingServices,
  fetchProjects,
  logSystemEvent,
  triggerPingCheck,
  updatePingService
} from '../api';
import { PingService, Project } from '../api/types';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { formatDateTime, formatRelative } from '../utils/formatters';
import { useTranslation } from '../hooks/useTranslation';
import { parseApiError } from '../utils/apiError';

export const PingServicesPage = (): JSX.Element => {
  const MIN_INTERVAL = 120;
  const MAX_INTERVAL = 3600;
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingService, setEditingService] = useState<PingService | null>(null);
  const [formData, setFormData] = useState(() => ({
    name: '',
    url: '',
    interval: MIN_INTERVAL,
    telegramTags: ''
  }));
  const [feedback, setFeedback] = useState<{ message: string; severity: 'success' | 'error' | 'info' | 'warning' } | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<PingService | null>(null);
  const { t } = useTranslation();
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'));
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));
  const {
    data: projects,
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects
  } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });

  const selectedUuid = searchParams.get('uuid') || projects?.[0]?.uuid;
  const selectedProject = useMemo(
    () => (projects ?? []).find((project) => project.uuid === selectedUuid) ?? null,
    [projects, selectedUuid]
  );

  const {
    data: services,
    isLoading: servicesLoading,
    isError: servicesError,
    refetch: refetchServices
  } = useQuery({
    queryKey: ['ping-services', selectedUuid],
    queryFn: () => fetchPingServices(selectedUuid as string),
    enabled: Boolean(selectedUuid)
  });

  useEffect(() => {
    if (!selectedUuid && projects?.length) {
      setSearchParams({ uuid: projects[0].uuid });
    }
  }, [projects, selectedUuid, setSearchParams]);

  useEffect(() => {
    if (!selectedUuid) {
      return;
    }
    const scheduleRefresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['ping-services', selectedUuid] });
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', scheduleRefresh);
    }
    const intervalId = window.setInterval(scheduleRefresh, 120_000);

    return () => {
      window.clearInterval(intervalId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', scheduleRefresh);
      }
    };
  }, [queryClient, selectedUuid]);

  const parseTags = useCallback((input: string) => {
    return input
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }, []);

  const resetForm = useCallback(() => {
    setFormData({ name: '', url: '', interval: MIN_INTERVAL, telegramTags: '' });
    setEditingService(null);
    setDialogMode('create');
  }, []);

  const addServiceMutation = useMutation({
    mutationFn: () =>
      createPingService(selectedUuid as string, {
        name: formData.name,
        url: formData.url,
        interval: Math.max(MIN_INTERVAL, Math.min(MAX_INTERVAL, Number(formData.interval))),
        telegramTags: parseTags(formData.telegramTags)
      }),
    onSuccess: async (service) => {
      setDialogOpen(false);
      resetForm();
      setFeedback({ severity: 'success', message: t('ping.serviceCreated') });
      queryClient.invalidateQueries({ queryKey: ['ping-services', selectedUuid] });
      try {
        await logSystemEvent({
          message: `Ping service "${service.name}" created for project ${selectedProject?.name ?? selectedUuid}`,
          tags: ['PING_SERVICE', 'ADMIN_ACTION', 'CREATE'],
          metadata: {
            projectUuid: selectedUuid,
            serviceId: service._id,
            interval: service.interval,
            url: service.url
          }
        });
      } catch (error) {
        console.error('Failed to log ping service creation', error);
      }
    },
    onError: (error: unknown) => {
      const { message } = parseApiError(error);
      setFeedback({ severity: 'error', message: message ?? t('ping.saveError') });
    }
  });

  const updateServiceMutation = useMutation({
    mutationFn: () => {
      if (!editingService) {
        throw new Error('No service selected for update');
      }
      return updatePingService(selectedUuid as string, editingService._id, {
        name: formData.name,
        url: formData.url,
        interval: Math.max(MIN_INTERVAL, Math.min(MAX_INTERVAL, Number(formData.interval))),
        telegramTags: parseTags(formData.telegramTags)
      });
    },
    onSuccess: async (service) => {
      setDialogOpen(false);
      resetForm();
      setFeedback({ severity: 'success', message: t('ping.serviceUpdated') });
      queryClient.invalidateQueries({ queryKey: ['ping-services', selectedUuid] });
      try {
        await logSystemEvent({
          message: `Ping service "${service.name}" updated for project ${selectedProject?.name ?? selectedUuid}`,
          tags: ['PING_SERVICE', 'ADMIN_ACTION', 'UPDATE'],
          metadata: {
            projectUuid: selectedUuid,
            serviceId: service._id,
            interval: service.interval,
            url: service.url
          }
        });
      } catch (error) {
        console.error('Failed to log ping service update', error);
      }
    },
    onError: (error: unknown) => {
      const { message } = parseApiError(error);
      setFeedback({ severity: 'error', message: message ?? t('ping.updateError') });
    }
  });

  const handleDialogClose = useCallback(() => {
    if (addServiceMutation.isPending || updateServiceMutation.isPending) {
      return;
    }
    setDialogOpen(false);
    resetForm();
  }, [addServiceMutation.isPending, resetForm, updateServiceMutation.isPending]);

  const deleteServiceMutation = useMutation({
    mutationFn: (service: PingService) => deletePingService(selectedUuid as string, service._id),
    onSuccess: async (_, service) => {
      setFeedback({ severity: 'success', message: t('ping.serviceDeleted') });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['ping-services', selectedUuid] });
      try {
        await logSystemEvent({
          message: `Ping service "${service.name}" deleted from project ${selectedProject?.name ?? selectedUuid}`,
          tags: ['PING_SERVICE', 'ADMIN_ACTION', 'DELETE'],
          metadata: {
            projectUuid: selectedUuid,
            serviceId: service._id,
            interval: service.interval,
            url: service.url
          }
        });
      } catch (error) {
        console.error('Failed to log ping service deletion', error);
      }
    },
    onError: (error: unknown) => {
      const { message } = parseApiError(error);
      setFeedback({ severity: 'error', message: message ?? t('ping.deleteError') });
    }
  });

  const triggerMutation = useMutation({
    mutationFn: () => triggerPingCheck(selectedUuid as string),
    onSuccess: async (data) => {
      queryClient.setQueryData(['ping-services', selectedUuid], data);
      setFeedback({ severity: 'success', message: t('ping.projectCheckTriggered') });
      try {
        await logSystemEvent({
          message: `Manual ping check triggered for project ${selectedProject?.name ?? selectedUuid}`,
          tags: ['PING_SERVICE', 'ADMIN_ACTION', 'CHECK'],
          metadata: { projectUuid: selectedUuid }
        });
      } catch (error) {
        console.error('Failed to log project ping check', error);
      }
    },
    onError: (error: unknown) => {
      const { message } = parseApiError(error);
      setFeedback({ severity: 'error', message: message ?? t('ping.triggerError') });
    }
  });

  const singleCheckMutation = useMutation({
    mutationFn: (serviceId: string) => {
      void serviceId;
      return triggerPingCheck(selectedUuid as string);
    },
    onSuccess: async (data, serviceId) => {
      queryClient.setQueryData(['ping-services', selectedUuid], data);
      const updatedService = data.find((service) => service._id === serviceId);
      setFeedback({ severity: 'success', message: t('ping.serviceCheckTriggered') });
      if (updatedService) {
        try {
          await logSystemEvent({
            message: `Manual ping check triggered for service "${updatedService.name}" in project ${selectedProject?.name ?? selectedUuid}`,
            tags: ['PING_SERVICE', 'ADMIN_ACTION', 'CHECK'],
            metadata: {
              projectUuid: selectedUuid,
              serviceId: updatedService._id,
              interval: updatedService.interval,
              url: updatedService.url
            }
          });
        } catch (error) {
          console.error('Failed to log ping service check', error);
        }
      }
    },
    onError: (error: unknown) => {
      const { message } = parseApiError(error);
      setFeedback({ severity: 'error', message: message ?? t('ping.triggerError') });
    }
  });

  const pendingDeleteId = (deleteServiceMutation.variables as PingService | undefined)?._id;
  const pendingSingleCheckId = singleCheckMutation.variables as string | undefined;

  const columns = useMemo<GridColDef<PingService>[]>(
    () => [
      { field: 'name', headerName: t('ping.name'), flex: 1 },
      {
        field: 'url',
        headerName: t('ping.url'),
        flex: 1.4,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {params.row.url}
          </Typography>
        )
      },
      {
        field: 'interval',
        headerName: t('ping.intervalHeader'),
        minWidth: isSmDown ? 120 : 140,
        flex: isMdDown ? 0.7 : 0.5
      },
      {
        field: 'lastStatus',
        headerName: t('ping.statusHeader'),
        minWidth: isSmDown ? 140 : 160,
        flex: isMdDown ? 0.9 : 0.6,
        renderCell: (params) => {
          const status = params.row.lastStatus ?? 'unknown';
          const color = status === 'ok' ? 'success' : status === 'degraded' ? 'warning' : status === 'down' ? 'error' : 'info';
          const label =
            status === 'ok'
              ? t('ping.status.ok')
              : status === 'degraded'
                ? t('ping.status.degraded')
                : status === 'down'
                  ? t('ping.status.down')
                  : t('ping.status.unknown');
          return (
            <Alert severity={color} sx={{ width: '100%', px: 1.5, py: 1 }}>
              {label}
            </Alert>
          );
        }
      },
      {
        field: 'lastCheckedAt',
        headerName: t('ping.lastCheckHeader'),
        minWidth: isSmDown ? 180 : 200,
        flex: isMdDown ? 1 : 0.7,
        renderCell: (params) => (
          <Stack>
            <Typography variant="body2">{formatDateTime(params.row.lastCheckedAt)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.lastCheckedAt
                ? formatRelative(params.row.lastCheckedAt)
                : t('common.notAvailable')}
            </Typography>
          </Stack>
        )
      },
      {
        field: 'telegramTags',
        headerName: t('ping.telegramTagsHeader'),
        flex: 1,
        renderCell: (params) => (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {params.row.telegramTags.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                {t('ping.noTags')}
              </Typography>
            ) : (
              params.row.telegramTags.map((tag) => <Chip key={tag} label={tag} size="small" />)
            )}
          </Stack>
        )
      },
      {
        field: 'actions',
        headerName: t('ping.actionsHeader'),
        minWidth: isSmDown ? 220 : 260,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const isServicePending = singleCheckMutation.isPending && pendingSingleCheckId === params.row._id;
          return (
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ width: '100%' }}
            >
              <Button
                size="small"
                variant="outlined"
                onClick={() => singleCheckMutation.mutate(params.row._id)}
                disabled={!selectedUuid || isServicePending}
                fullWidth={isSmDown}
              >
                {isServicePending ? t('ping.triggering') : t('ping.checkAction')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setDialogMode('edit');
                  setEditingService(params.row);
                  setFormData({
                    name: params.row.name,
                    url: params.row.url,
                    interval: Math.max(MIN_INTERVAL, params.row.interval),
                    telegramTags: params.row.telegramTags.join(', ')
                  });
                  setDialogOpen(true);
                }}
                fullWidth={isSmDown}
              >
                {t('ping.editService')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => setDeleteTarget(params.row)}
                disabled={deleteServiceMutation.isPending && pendingDeleteId === params.row._id}
                fullWidth={isSmDown}
                aria-label={t('ping.deleteService')}
              >
                {deleteServiceMutation.isPending && pendingDeleteId === params.row._id
                  ? t('ping.deleting')
                  : 'X'}
              </Button>
            </Stack>
          );
        }
      }
    ],
    [
      deleteServiceMutation.isPending,
      isMdDown,
      isSmDown,
      pendingDeleteId,
      pendingSingleCheckId,
      selectedUuid,
      singleCheckMutation,
      t
    ]
  );

  const columnVisibilityModel = useMemo(
    () => ({
      telegramTags: !isSmDown
    }),
    [isSmDown]
  );

  if (projectsLoading || servicesLoading) {
    return <LoadingState />;
  }

  if (projectsError) {
    return <ErrorState message={t('ping.loadProjectsError')} onRetry={() => refetchProjects()} />;
  }

  if (servicesError) {
    return <ErrorState message={t('ping.loadServicesError')} onRetry={() => refetchServices()} />;
  }

  const handleProjectChange = (event: SelectChangeEvent) => {
    setSearchParams({ uuid: event.target.value });
  };

  const handleIntervalChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (Number.isNaN(value)) {
      return;
    }
    setFormData((prev) => ({ ...prev, interval: Math.max(MIN_INTERVAL, Math.min(MAX_INTERVAL, value)) }));
  };

  const handleSubmit = () => {
    if (!selectedUuid) {
      return;
    }
    if (dialogMode === 'create') {
      addServiceMutation.mutate();
    } else {
      updateServiceMutation.mutate();
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteServiceMutation.mutate(deleteTarget);
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {t('ping.title')}
      </Typography>
      {feedback && (
        <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <FormControl sx={{ minWidth: { xs: '100%', md: 260 } }}>
                <InputLabel id="project-select-label">{t('ping.project')}</InputLabel>
                <Select
                  labelId="project-select-label"
                  label={t('ping.project')}
                  value={selectedUuid ?? ''}
                  onChange={handleProjectChange}
                >
                  {(projects ?? []).map((project: Project) => (
                    <MenuItem key={project.uuid} value={project.uuid}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                onClick={() => triggerMutation.mutate()}
                disabled={!selectedUuid || triggerMutation.isPending}
                fullWidth={isSmDown}
              >
                {triggerMutation.isPending ? t('ping.triggering') : t('ping.trigger')}
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  resetForm();
                  setDialogMode('create');
                  setDialogOpen(true);
                }}
                disabled={!selectedUuid}
                fullWidth={isSmDown}
              >
                {t('ping.addService')}
              </Button>
            </Stack>
            <Box
              sx={{
                width: '100%',
                height: isSmDown ? 'auto' : 500,
                overflowX: 'auto'
              }}
            >
              <DataGrid
                rows={services ?? []}
                columns={columns}
                getRowId={(row) => row._id}
                columnVisibilityModel={columnVisibilityModel}
                autoHeight={isSmDown}
                pageSizeOptions={[5, 10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                disableRowSelectionOnClick
                localeText={{ noRowsLabel: t('ping.noServices') }}
                sx={{
                  minWidth: isSmDown ? 560 : undefined,
                  '& .MuiDataGrid-cell': {
                    alignItems: 'center',
                    py: 1.25,
                    fontSize: { xs: '0.875rem', sm: '0.95rem' }
                  },
                  '& .MuiDataGrid-cellContent': {
                    whiteSpace: 'normal',
                    width: '100%'
                  },
                  '& .MuiDataGrid-columnHeaderTitle': {
                    whiteSpace: 'normal',
                    lineHeight: 1.2,
                    fontSize: { xs: '0.8rem', sm: '0.875rem' }
                  },
                  '& .MuiDataGrid-footerContainer': {
                    flexWrap: 'wrap',
                    gap: 1,
                    justifyContent: { xs: 'center', sm: 'space-between' }
                  }
                }}
                density={isSmDown ? 'comfortable' : 'standard'}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={handleDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>{dialogMode === 'create' ? t('ping.newService') : t('ping.editService')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('ping.name')}
              value={formData.name}
              onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              required
              fullWidth
            />
            <TextField
              label={t('ping.url')}
              value={formData.url}
              onChange={(event) => setFormData((prev) => ({ ...prev, url: event.target.value }))}
              required
              fullWidth
            />
            <TextField
              label={t('ping.interval')}
              type="number"
              value={formData.interval}
              onChange={handleIntervalChange}
              inputProps={{ min: MIN_INTERVAL, max: MAX_INTERVAL }}
              fullWidth
              helperText={t('ping.intervalHint', { min: MIN_INTERVAL })}
            />
            <TextField
              label={t('ping.telegramTags')}
              value={formData.telegramTags}
              onChange={(event) => setFormData((prev) => ({ ...prev, telegramTags: event.target.value }))}
              helperText={t('ping.telegramTagsHint')}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={addServiceMutation.isPending || updateServiceMutation.isPending}>
            {t('ping.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={
              addServiceMutation.isPending ||
              updateServiceMutation.isPending ||
              !formData.name ||
              !formData.url ||
              !selectedUuid
            }
          >
            {dialogMode === 'create'
              ? addServiceMutation.isPending
                ? t('ping.saving')
                : t('ping.save')
              : updateServiceMutation.isPending
                ? t('ping.saving')
                : t('ping.update')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t('ping.deleteDialogTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t('ping.deleteDialogDescription', { name: deleteTarget?.name ?? '' })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteServiceMutation.isPending}>
            {t('ping.cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleteServiceMutation.isPending}
          >
            {deleteServiceMutation.isPending ? t('ping.deleting') : t('ping.deleteService')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
