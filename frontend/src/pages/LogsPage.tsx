import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Tooltip,
  Typography
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { deleteLogs, fetchProjects, filterLogs } from '../api';
import { LogEntry, LogFilter, Project } from '../api/types';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { formatDateTime } from '../utils/formatters';
import { useTranslation } from '../hooks/useTranslation';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { copyToClipboard } from '../utils/clipboard';

const defaultFilter: LogFilter = { uuid: '', projectUuid: undefined, logId: undefined };

export const LogsPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterState, setFilterState] = useState<LogFilter>(defaultFilter);
  const [activeFilter, setActiveFilter] = useState<LogFilter | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const { t } = useTranslation();

  const {
    data: projects,
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects
  } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });

  useEffect(() => {
    const projectUuidFromQuery = searchParams.get('projectUuid') || undefined;
    const uuidFromQuery = searchParams.get('uuid') || projectUuidFromQuery || projects?.[0]?.uuid || '';
    const newFilter: LogFilter = {
      uuid: uuidFromQuery,
      projectUuid: projectUuidFromQuery ?? (uuidFromQuery || undefined),
      level: searchParams.get('level') || undefined,
      text: searchParams.get('text') || undefined,
      tag: searchParams.get('tag') || undefined,
      user: searchParams.get('user') || undefined,
      ip: searchParams.get('ip') || undefined,
      service: searchParams.get('service') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      logId: searchParams.get('logId') || undefined
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

  const handleCopyLog = useCallback(async (log: LogEntry) => {
    await copyToClipboard(JSON.stringify(log, null, 2));
  }, []);

  const columns = useMemo<GridColDef<LogEntry>[]>(
    () => [
      {
        field: 'timestamp',
        headerName: t('logs.timestampHeader'),
        width: 220,
        renderCell: (params) => (
          <Stack spacing={0.5}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {formatDateTime(params.row.timestamp)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.level}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {params.row._id}
            </Typography>
          </Stack>
        )
      },
      {
        field: 'message',
        headerName: t('logs.messageHeader'),
        flex: 1.5,
        renderCell: (params) => (
          <Stack spacing={1}>
            <Typography variant="body2">{params.row.message}</Typography>
            {params.row.tags.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                {t('logs.tagsLabel', { tags: params.row.tags.join(', ') })}
              </Typography>
            )}
          </Stack>
        )
      },
      {
        field: 'metadata',
        headerName: t('logs.metadataHeader'),
        flex: 1,
        renderCell: (params) => {
          const metadata = params.row.metadata ?? {};
          const ip = metadata.ip ?? t('common.notAvailable');
          const service = metadata.service ?? t('common.notAvailable');
          const user = metadata.user ?? t('common.notAvailable');
          return (
            <Stack spacing={0.5}>
              <Typography variant="body2">{t('logs.metadata.ip', { value: ip })}</Typography>
              <Typography variant="body2">{t('logs.metadata.service', { value: service })}</Typography>
              <Typography variant="body2">{t('logs.metadata.user', { value: user })}</Typography>
            </Stack>
          );
        }
      },
      {
        field: 'actions',
        headerName: t('logs.actionsHeader'),
        width: 160,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Tooltip title={t('logs.copyLog')}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleCopyLog(params.row)}
              startIcon={<ContentCopyIcon fontSize="small" />}
            >
              {t('common.copy')}
            </Button>
          </Tooltip>
        )
      }
    ],
    [handleCopyLog, t]
  );

  const handleProjectUuidChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFilterState((prev) => ({ ...prev, projectUuid: value || undefined }));
  };

  const handleFilterChange = (field: keyof LogFilter) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterState((prev) => ({ ...prev, [field]: event.target.value || undefined }));
  };

  const handleSelectChange = (field: keyof LogFilter) => (event: SelectChangeEvent) => {
    const value = event.target.value || undefined;
    setFilterState((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'uuid' ? { projectUuid: value } : {})
    }));
  };

  const applyFilter = () => {
    const trimmedProjectUuid = filterState.projectUuid?.trim();
    const trimmedLogId = filterState.logId?.trim();
    const effectiveUuid = trimmedProjectUuid || filterState.uuid;
    if (!effectiveUuid) {
      return;
    }
    const params = new URLSearchParams();
    const nextFilter: LogFilter = {
      ...filterState,
      uuid: effectiveUuid,
      projectUuid: trimmedProjectUuid ?? (effectiveUuid || undefined),
      logId: trimmedLogId || undefined
    };
    Object.entries(nextFilter).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    setFilterState(nextFilter);
    setSearchParams(params);
    setActiveFilter({ ...nextFilter });
  };

  const handleClearFilters = () => {
    const firstProjectUuid = projects?.[0]?.uuid ?? '';
    const baseFilter: LogFilter = firstProjectUuid
      ? { uuid: firstProjectUuid, projectUuid: firstProjectUuid }
      : { uuid: '' };
    setFilterState(baseFilter);
    setActiveFilter(firstProjectUuid ? baseFilter : null);
    setSearchParams(new URLSearchParams());
    setFiltersExpanded(false);
  };

  const displayLogs = useMemo(() => {
    const logs = logsQuery.data?.logs ?? [];
    if (!activeFilter) {
      return logs;
    }
    const projectUuidFilter = activeFilter.projectUuid?.trim().toLowerCase();
    const logIdFilter = activeFilter.logId?.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesProjectUuid = projectUuidFilter
        ? log.projectUuid.toLowerCase().includes(projectUuidFilter)
        : true;
      const matchesLogId = logIdFilter ? log._id.toLowerCase().includes(logIdFilter) : true;
      return matchesProjectUuid && matchesLogId;
    });
  }, [activeFilter, logsQuery.data?.logs]);

  const exportLogs = () => {
    const rows = displayLogs;
    if (rows.length === 0) {
      return;
    }
    const csv = [
      ['timestamp', 'level', 'message', 'tags', 'ip', 'service', 'user', 'projectUuid', '_id'].join(';'),
      ...rows.map((row) =>
        [
          formatDateTime(row.timestamp),
          row.level,
          row.message.replace(/\n/g, ' '),
          row.tags.join(','),
          row.metadata?.ip ?? '',
          row.metadata?.service ?? '',
          row.metadata?.user ?? '',
          row.projectUuid,
          row._id
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
    return <ErrorState message={t('logs.loadError')} onRetry={() => refetchProjects()} />;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {t('logs.title')}
      </Typography>
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel id="project-select">{t('logs.project')}</InputLabel>
                    <Select
                      labelId="project-select"
                      label={t('logs.project')}
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
                  <TextField
                    label={t('logs.projectUuid')}
                    fullWidth
                    value={filterState.projectUuid ?? ''}
                    onChange={handleProjectUuidChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel id="level-select">{t('logs.level')}</InputLabel>
                    <Select
                      labelId="level-select"
                      label={t('logs.level')}
                      value={filterState.level ?? ''}
                      onChange={handleSelectChange('level')}
                    >
                      <MenuItem value="">{t('logs.allLevels')}</MenuItem>
                      <MenuItem value="DEBUG">{t('logs.levelOptions.debug')}</MenuItem>
                      <MenuItem value="INFO">{t('logs.levelOptions.info')}</MenuItem>
                      <MenuItem value="WARNING">{t('logs.levelOptions.warning')}</MenuItem>
                      <MenuItem value="ERROR">{t('logs.levelOptions.error')}</MenuItem>
                      <MenuItem value="CRITICAL">{t('logs.levelOptions.critical')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    label={t('logs.logId')}
                    fullWidth
                    value={filterState.logId ?? ''}
                    onChange={handleFilterChange('logId')}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label={t('logs.tag')}
                    fullWidth
                    value={filterState.tag ?? ''}
                    onChange={handleFilterChange('tag')}
                  />
                </Grid>
              </Grid>
              <Collapse in={filtersExpanded} unmountOnExit>
                <Grid container spacing={2} sx={{ mt: 0 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label={t('logs.text')}
                      fullWidth
                      value={filterState.text ?? ''}
                      onChange={handleFilterChange('text')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label={t('logs.user')}
                      fullWidth
                      value={filterState.user ?? ''}
                      onChange={handleFilterChange('user')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label={t('logs.ip')}
                      fullWidth
                      value={filterState.ip ?? ''}
                      onChange={handleFilterChange('ip')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label={t('logs.service')}
                      fullWidth
                      value={filterState.service ?? ''}
                      onChange={handleFilterChange('service')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label={t('logs.startDate')}
                      type="datetime-local"
                      fullWidth
                      value={filterState.startDate ?? ''}
                      onChange={handleFilterChange('startDate')}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label={t('logs.endDate')}
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
                  {filtersExpanded ? t('logs.hideFilters') : t('logs.showFilters')}
                </Button>
              </Box>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
              <Button
                variant="contained"
                onClick={applyFilter}
                disabled={!(filterState.uuid || filterState.projectUuid?.trim())}
              >
                {t('logs.apply')}
              </Button>
              <Button variant="outlined" onClick={handleClearFilters}>
                {t('logs.clear')}
              </Button>
              <Button variant="outlined" onClick={exportLogs} disabled={!displayLogs.length}>
                {t('logs.export')}
              </Button>
              <Button
                color="error"
                variant="outlined"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending || !filterState.uuid}
              >
                {deleteMutation.isPending ? t('logs.deleting') : t('logs.deleteByFilter')}
              </Button>
            </Stack>
            {logsQuery.isLoading && <LoadingState label={t('common.loadingLogs')} />}
            {logsQuery.isError && <ErrorState message={t('logs.logsLoadError')} onRetry={() => logsQuery.refetch()} />}
            {logsQuery.data && (
              <>
                <Alert severity="info">
                  {t('logs.filtersApplied', {
                    count: displayLogs.length,
                    project: logsQuery.data.project.name
                  })}
                </Alert>
                <Box sx={{ height: 520, width: '100%' }}>
                  <DataGrid
                    rows={displayLogs}
                    columns={columns}
                    getRowId={(row) => row._id}
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
                    disableRowSelectionOnClick
                    localeText={{ noRowsLabel: t('logs.noLogs') }}
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
