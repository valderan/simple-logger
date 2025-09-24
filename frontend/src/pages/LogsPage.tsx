import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { deleteLogs, fetchProjects, filterLogs } from '../api';
import { LogEntry, LogFilter, Project } from '../api/types';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { formatDateTime } from '../utils/formatters';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const defaultFilter: LogFilter = { uuid: '' };

export const LogsPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterState, setFilterState] = useState<LogFilter>(defaultFilter);
  const [activeFilter, setActiveFilter] = useState<LogFilter | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const {
    data: projects,
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects
  } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });

  useEffect(() => {
    const uuidFromQuery = searchParams.get('uuid') || projects?.[0]?.uuid || '';
    const newFilter: LogFilter = {
      uuid: uuidFromQuery,
      level: searchParams.get('level') || undefined,
      text: searchParams.get('text') || undefined,
      tag: searchParams.get('tag') || undefined,
      user: searchParams.get('user') || undefined,
      ip: searchParams.get('ip') || undefined,
      service: searchParams.get('service') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined
    };
    setFilterState(newFilter);
    const hasAdvancedFilters = Boolean(
      newFilter.text ||
        newFilter.user ||
        newFilter.ip ||
        newFilter.service ||
        newFilter.startDate ||
        newFilter.endDate
    );
    setFiltersExpanded((prev) => (hasAdvancedFilters ? true : prev));
    setActiveFilter(newFilter.uuid ? newFilter : null);
  }, [projects, searchParams]);

  const logsQuery = useQuery({
    queryKey: ['logs', activeFilter],
    queryFn: () => filterLogs(activeFilter as LogFilter),
    enabled: Boolean(activeFilter?.uuid)
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLogs(filterState.uuid, {
      level: filterState.level,
      text: filterState.text,
      tag: filterState.tag,
      user: filterState.user,
      ip: filterState.ip,
      service: filterState.service,
      startDate: filterState.startDate,
      endDate: filterState.endDate
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    }
  });

  const columns = useMemo<GridColDef<LogEntry>[]>(
    () => [
      {
        field: 'timestamp',
        headerName: 'Время',
        width: 200,
        renderCell: (params) => (
          <Stack>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {formatDateTime(params.row.timestamp)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.level}
            </Typography>
          </Stack>
        )
      },
      {
        field: 'message',
        headerName: 'Сообщение',
        flex: 1.5,
        renderCell: (params) => (
          <Stack spacing={1}>
            <Typography variant="body2">{params.row.message}</Typography>
            {params.row.tags.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                Теги: {params.row.tags.join(', ')}
              </Typography>
            )}
          </Stack>
        )
      },
      {
        field: 'metadata',
        headerName: 'Метаданные',
        flex: 1,
        renderCell: (params) => {
          const metadata = params.row.metadata ?? {};
          return (
            <Stack spacing={0.5}>
              <Typography variant="body2">IP: {metadata.ip ?? '—'}</Typography>
              <Typography variant="body2">Сервис: {metadata.service ?? '—'}</Typography>
              <Typography variant="body2">Пользователь: {metadata.user ?? '—'}</Typography>
            </Stack>
          );
        }
      }
    ],
    []
  );

  const handleFilterChange = (field: keyof LogFilter) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterState((prev) => ({ ...prev, [field]: event.target.value || undefined }));
  };

  const handleSelectChange = (field: keyof LogFilter) => (event: SelectChangeEvent) => {
    const value = event.target.value || undefined;
    setFilterState((prev) => ({ ...prev, [field]: value }));
  };

  const applyFilter = () => {
    if (!filterState.uuid) {
      return;
    }
    const params = new URLSearchParams();
    Object.entries(filterState).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    setSearchParams(params);
    setActiveFilter({ ...filterState });
  };

  const exportLogs = () => {
    const rows = logsQuery.data?.logs ?? [];
    if (rows.length === 0) {
      return;
    }
    const csv = [
      ['timestamp', 'level', 'message', 'tags', 'ip', 'service', 'user'].join(';'),
      ...rows.map((row) =>
        [
          formatDateTime(row.timestamp),
          row.level,
          row.message.replace(/\n/g, ' '),
          row.tags.join(','),
          row.metadata?.ip ?? '',
          row.metadata?.service ?? '',
          row.metadata?.user ?? ''
        ].join(';')
      )
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `logs-${filterState.uuid}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (projectsLoading) {
    return <LoadingState />;
  }

  if (projectsError) {
    return <ErrorState message="Не удалось загрузить проекты" onRetry={() => refetchProjects()} />;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Просмотр логов
      </Typography>
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel id="project-select">Проект</InputLabel>
                    <Select
                      labelId="project-select"
                      label="Проект"
                      value={filterState.uuid}
                      onChange={handleSelectChange('uuid')}
                    >
                      {(projects ?? []).map((project: Project) => (
                        <MenuItem key={project.uuid} value={project.uuid}>
                          {project.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel id="level-select">Уровень</InputLabel>
                    <Select
                      labelId="level-select"
                      label="Уровень"
                      value={filterState.level ?? ''}
                      onChange={handleSelectChange('level')}
                    >
                      <MenuItem value="">Все</MenuItem>
                      <MenuItem value="DEBUG">DEBUG</MenuItem>
                      <MenuItem value="INFO">INFO</MenuItem>
                      <MenuItem value="WARNING">WARNING</MenuItem>
                      <MenuItem value="ERROR">ERROR</MenuItem>
                      <MenuItem value="CRITICAL">CRITICAL</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <TextField label="Тег" fullWidth value={filterState.tag ?? ''} onChange={handleFilterChange('tag')} />
                </Grid>
              </Grid>
              <Collapse in={filtersExpanded} unmountOnExit>
                <Grid container spacing={2} sx={{ mt: 0 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Текст"
                      fullWidth
                      value={filterState.text ?? ''}
                      onChange={handleFilterChange('text')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Пользователь"
                      fullWidth
                      value={filterState.user ?? ''}
                      onChange={handleFilterChange('user')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="IP"
                      fullWidth
                      value={filterState.ip ?? ''}
                      onChange={handleFilterChange('ip')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Сервис"
                      fullWidth
                      value={filterState.service ?? ''}
                      onChange={handleFilterChange('service')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Начало"
                      type="datetime-local"
                      fullWidth
                      value={filterState.startDate ?? ''}
                      onChange={handleFilterChange('startDate')}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Окончание"
                      type="datetime-local"
                      fullWidth
                      value={filterState.endDate ?? ''}
                      onChange={handleFilterChange('endDate')}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
              </Collapse>
              <Box sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setFiltersExpanded((prev) => !prev)}
                  endIcon={filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                >
                  {filtersExpanded ? 'Скрыть дополнительные фильтры' : 'Показать дополнительные фильтры'}
                </Button>
              </Box>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Button variant="contained" onClick={applyFilter} disabled={!filterState.uuid}>
                Применить фильтры
              </Button>
              <Button variant="outlined" onClick={exportLogs} disabled={!(logsQuery.data?.logs?.length)}>
                Экспорт в CSV
              </Button>
              <Button
                color="error"
                variant="outlined"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending || !filterState.uuid}
              >
                {deleteMutation.isPending ? 'Очистка...' : 'Удалить по фильтру'}
              </Button>
            </Stack>
            {logsQuery.isLoading && <LoadingState label="Загрузка логов..." />}
            {logsQuery.isError && <ErrorState message="Не удалось загрузить логи" onRetry={() => logsQuery.refetch()} />}
            {logsQuery.data && (
              <>
                <Alert severity="info">
                  Найдено логов: {logsQuery.data.logs.length}. Проект: {logsQuery.data.project.name}
                </Alert>
                <Box sx={{ height: 520, width: '100%' }}>
                  <DataGrid
                    rows={logsQuery.data.logs}
                    columns={columns}
                    getRowId={(row) => row._id}
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
                    disableRowSelectionOnClick
                    localeText={{ noRowsLabel: 'Логи не найдены по заданным фильтрам' }}
                  />
                </Box>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};
