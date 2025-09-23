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
  Typography
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

export const PingServicesPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '', interval: 60, telegramTags: '' });
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
      { field: 'name', headerName: 'Название', flex: 1 },
      {
        field: 'url',
        headerName: 'URL',
        flex: 1.4,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {params.row.url}
          </Typography>
        )
      },
      { field: 'interval', headerName: 'Интервал (сек)', width: 150 },
      {
        field: 'lastStatus',
        headerName: 'Статус',
        width: 160,
        renderCell: (params) => {
          const status = params.row.lastStatus ?? 'unknown';
          const color = status === 'ok' ? 'success' : status === 'degraded' ? 'warning' : status === 'down' ? 'error' : 'info';
          const label = status === 'ok' ? 'OK' : status === 'degraded' ? 'Проблемы' : status === 'down' ? 'Недоступен' : '—';
          return <Alert severity={color}>{label}</Alert>;
        }
      },
      {
        field: 'lastCheckedAt',
        headerName: 'Последняя проверка',
        width: 200,
        renderCell: (params) => (
          <Stack>
            <Typography variant="body2">{formatDateTime(params.row.lastCheckedAt)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.lastCheckedAt ? formatRelative(params.row.lastCheckedAt) : '—'}
            </Typography>
          </Stack>
        )
      },
      {
        field: 'telegramTags',
        headerName: 'Теги Telegram',
        flex: 1,
        renderCell: (params) => (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {params.row.telegramTags.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                Нет тегов
              </Typography>
            ) : (
              params.row.telegramTags.map((tag) => <Chip key={tag} label={tag} size="small" />)
            )}
          </Stack>
        )
      }
    ],
    []
  );

  if (projectsLoading || servicesLoading) {
    return <LoadingState />;
  }

  if (projectsError) {
    return <ErrorState message="Не удалось загрузить список проектов" onRetry={() => refetchProjects()} />;
  }

  if (servicesError) {
    return <ErrorState message="Не удалось загрузить ping-сервисы" onRetry={() => refetchServices()} />;
  }

  const handleProjectChange = (event: SelectChangeEvent) => {
    setSearchParams({ uuid: event.target.value });
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Ping-мониторинг
      </Typography>
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              <FormControl sx={{ minWidth: 260 }}>
                <InputLabel id="project-select-label">Проект</InputLabel>
                <Select
                  labelId="project-select-label"
                  label="Проект"
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
              >
                {triggerMutation.isPending ? 'Проверка...' : 'Запустить проверку'}
              </Button>
              <Button variant="contained" onClick={() => setDialogOpen(true)} disabled={!selectedUuid}>
                Добавить сервис
              </Button>
            </Stack>
            <Box sx={{ height: 500, width: '100%' }}>
              <DataGrid
                rows={services ?? []}
                columns={columns}
                getRowId={(row) => row._id}
                pageSizeOptions={[5, 10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                disableRowSelectionOnClick
                localeText={{ noRowsLabel: 'Сервисы не настроены' }}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Новый ping-сервис</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Название"
              value={formData.name}
              onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <TextField
              label="URL"
              value={formData.url}
              onChange={(event) => setFormData((prev) => ({ ...prev, url: event.target.value }))}
              required
            />
            <TextField
              label="Интервал (сек)"
              type="number"
              value={formData.interval}
              onChange={(event) => setFormData((prev) => ({ ...prev, interval: Number(event.target.value) }))}
              inputProps={{ min: 5, max: 3600 }}
            />
            <TextField
              label="Telegram теги (через запятую)"
              value={formData.telegramTags}
              onChange={(event) => setFormData((prev) => ({ ...prev, telegramTags: event.target.value }))}
              helperText="Например: PING_DOWN,CRITICAL"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={() => addServiceMutation.mutate()}
            disabled={addServiceMutation.isPending || !formData.name || !formData.url}
          >
            {addServiceMutation.isPending ? 'Сохранение...' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
