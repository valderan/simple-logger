import { useEffect, useMemo, useState } from 'react';
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
  fetchPingServices,
  fetchProjects,
  triggerPingCheck
} from '../api';
import { PingService, Project } from '../api/types';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { formatDateTime, formatRelative } from '../utils/formatters';
import { useTranslation } from '../hooks/useTranslation';

export const PingServicesPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '', interval: 60, telegramTags: '' });
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

  const addServiceMutation = useMutation({
    mutationFn: () =>
      createPingService(selectedUuid as string, {
        name: formData.name,
        url: formData.url,
        interval: Number(formData.interval),
        telegramTags: formData.telegramTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      }),
    onSuccess: () => {
      setDialogOpen(false);
      setFormData({ name: '', url: '', interval: 60, telegramTags: '' });
      queryClient.invalidateQueries({ queryKey: ['ping-services', selectedUuid] });
    }
  });

  const triggerMutation = useMutation({
    mutationFn: () => triggerPingCheck(selectedUuid as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ping-services', selectedUuid] });
    }
  });

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
      }
    ],
    [isMdDown, isSmDown, t]
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

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {t('ping.title')}
      </Typography>
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
              <Button variant="contained" onClick={() => setDialogOpen(true)} disabled={!selectedUuid} fullWidth={isSmDown}>
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
                    alignItems: 'flex-start',
                    whiteSpace: 'normal',
                    py: 1.25,
                    fontSize: { xs: '0.875rem', sm: '0.95rem' }
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('ping.newService')}</DialogTitle>
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
              onChange={(event) => setFormData((prev) => ({ ...prev, interval: Number(event.target.value) }))}
              inputProps={{ min: 5, max: 3600 }}
              fullWidth
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
          <Button onClick={() => setDialogOpen(false)}>{t('ping.cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => addServiceMutation.mutate()}
            disabled={addServiceMutation.isPending || !formData.name || !formData.url}
          >
            {addServiceMutation.isPending ? t('ping.saving') : t('ping.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
