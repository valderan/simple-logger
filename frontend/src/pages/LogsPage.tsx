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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { DataGrid, GridColDef, GridEventListener } from '@mui/x-data-grid';
import { deleteLogs, fetchProjects, filterLogs } from '../api';
import { LogEntry, LogFilter, Project } from '../api/types';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { formatDateTime } from '../utils/formatters';
import { useTranslation } from '../hooks/useTranslation';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { copyToClipboard } from '../utils/clipboard';

const defaultFilter: LogFilter = { uuid: '', projectUuid: undefined, logId: undefined };

export const LogsPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterState, setFilterState] = useState<LogFilter>(defaultFilter);
  const [activeFilter, setActiveFilter] = useState<LogFilter | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [detailsModeEnabled, setDetailsModeEnabled] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
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

  const bulkDeleteMutation = useMutation({
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

  const deleteLogMutation = useMutation<{ deleted: number }, unknown, { projectUuid: string; logId: string }>({
    mutationFn: ({ projectUuid, logId }) => deleteLogs(projectUuid, { logId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    }
  });

  const handleCopyLog = useCallback(async (log: LogEntry) => {
    await copyToClipboard(JSON.stringify(log, null, 2));
  }, []);

  const { 
    mutate: mutateDeleteLog,
    isPending: isDeleteLogPending,
    variables: deleteLogVariables
  } = deleteLogMutation;
  const deletingLogId = deleteLogVariables?.logId;

  useEffect(() => {
    if (!detailsModeEnabled) {
      setSelectedLog(null);
    }
  }, [detailsModeEnabled]);

  const columns = useMemo<GridColDef<LogEntry>[]>(
    () => [
      {
        field: 'timestamp',
        headerName: t('logs.timestampHeader'),
        minWidth: 200,
        flex: isMdDown ? 1.1 : 0.8,
        renderCell: (params) => (
          <Stack spacing={0.5} sx={{ width: '100%' }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {formatDateTime(params.row.timestamp)}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Typography variant="caption" color="text.secondary">
                {params.row.level}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
              >
                {params.row._id}
              </Typography>
            </Stack>
          </Stack>
        )
      },
      {
        field: 'message',
        headerName: t('logs.messageHeader'),
        flex: 1.5,
        renderCell: (params) => (
          <Stack spacing={1} sx={{ width: '100%' }}>
            <Typography
              variant="body2"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                whiteSpace: 'normal'
              }}
            >
              {params.row.message}
            </Typography>
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
            <Stack spacing={0.5} sx={{ width: '100%' }}>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {t('logs.metadata.ip', { value: ip })}
              </Typography>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {t('logs.metadata.service', { value: service })}
              </Typography>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {t('logs.metadata.user', { value: user })}
              </Typography>
            </Stack>
          );
        }
      },
      {
        field: 'actions',
        headerName: t('logs.actionsHeader'),
        minWidth: isSmDown ? 200 : 220,
        flex: isSmDown ? 1.05 : 0.9,
        sortable: false,
        filterable: false,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => {
          const isDeleting = isDeleteLogPending && deletingLogId === params.row._id;
          return (
            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                flexWrap="wrap"
                useFlexGap
                sx={{ width: '100%' }}
              >
                <Tooltip title={t('logs.copyLog')}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleCopyLog(params.row)}
                    startIcon={<ContentCopyIcon fontSize="small" />}
                    fullWidth={isSmDown}
                  >
                    {t('common.copy')}
                  </Button>
                </Tooltip>
                <Tooltip title={t('logs.deleteLog')}>
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      disabled={isDeleting}
                      aria-label={t('logs.deleteLog')}
                      onClick={() => mutateDeleteLog({ projectUuid: params.row.projectUuid, logId: params.row._id })}
                      fullWidth={isSmDown}
                    >
                      {isDeleting ? t('common.deleteInProgress') : 'х'}
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Box>
          );
        }
      }
    ],
    [deletingLogId, handleCopyLog, isDeleteLogPending, isMdDown, isSmDown, mutateDeleteLog, t]
  );

  const columnVisibilityModel = useMemo(
    () => ({
      metadata: !isSmDown
    }),
    [isSmDown]
  );

  const handleDetailsModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDetailsModeEnabled(event.target.checked);
  };

  const handleCellClick = useCallback<GridEventListener<'cellClick'>>(
    (params, event) => {
      if (!detailsModeEnabled || params.field === 'actions') {
        return;
      }
      if (event) {
        event.defaultMuiPrevented = true;
      }
      setSelectedLog(params.row as LogEntry);
    },
    [detailsModeEnabled]
  );

  const handleCloseDetailsDialog = useCallback(() => {
    setSelectedLog(null);
  }, []);

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
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              flexWrap="wrap"
              alignItems={{ xs: 'stretch', md: 'center' }}
              justifyContent="space-between"
            >
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  onClick={applyFilter}
                  disabled={!(filterState.uuid || filterState.projectUuid?.trim())}
                  fullWidth={isSmDown}
                >
                  {t('logs.apply')}
                </Button>
                <Button variant="outlined" onClick={handleClearFilters} fullWidth={isSmDown}>
                  {t('logs.clear')}
                </Button>
                <Button variant="outlined" onClick={exportLogs} disabled={!displayLogs.length} fullWidth={isSmDown}>
                  {t('logs.export')}
                </Button>
                <Button
                  color="error"
                  variant="outlined"
                  onClick={() => bulkDeleteMutation.mutate()}
                  disabled={bulkDeleteMutation.isPending || !filterState.uuid}
                  fullWidth={isSmDown}
                >
                  {bulkDeleteMutation.isPending ? t('logs.deleting') : t('logs.deleteByFilter')}
                </Button>
              </Stack>
              <FormControlLabel
                control={<Switch checked={detailsModeEnabled} onChange={handleDetailsModeChange} color="primary" />}
                label={t('logs.detailsToggleLabel')}
              />
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
                <Box sx={{ height: isSmDown ? 'auto' : 520, width: '100%' }}>
                  <DataGrid
                    rows={displayLogs}
                    columns={columns}
                    getRowId={(row) => row._id}
                    columnVisibilityModel={columnVisibilityModel}
                    autoHeight={isSmDown}
                    getRowHeight={() => 'auto'}
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
                    disableRowSelectionOnClick
                    onCellClick={handleCellClick}
                    localeText={{ noRowsLabel: t('logs.noLogs') }}
                    sx={{
                      '& .MuiDataGrid-cell': {
                        alignItems: 'flex-start',
                        py: 1.5,
                        fontSize: { xs: '0.875rem', sm: '0.95rem' }
                      },
                      '& .MuiDataGrid-cellContent': {
                        whiteSpace: 'normal',
                        lineHeight: 1.4
                      },
                      '& .MuiDataGrid-columnHeaderTitle': {
                        whiteSpace: 'normal',
                        lineHeight: 1.2,
                        fontSize: { xs: '0.8rem', sm: '0.875rem' }
                      },
                      '& .MuiDataGrid-row:hover': {
                        cursor: detailsModeEnabled ? 'pointer' : 'default'
                      },
                      '& .MuiDataGrid-cell[data-field="actions"]': {
                        cursor: 'default'
                      }
                    }}
                    density={isSmDown ? 'comfortable' : 'standard'}
                  />
                </Box>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
      <Dialog
        open={Boolean(selectedLog)}
        onClose={handleCloseDetailsDialog}
        fullWidth
        maxWidth="md"
        aria-labelledby="log-details-dialog"
      >
        <DialogTitle id="log-details-dialog" sx={{ pr: 6 }}>
          {t('logs.detailsDialogTitle')}
          <IconButton
            aria-label={t('common.close')}
            onClick={handleCloseDetailsDialog}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {selectedLog && (
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="subtitle2">{t('logs.project')}</Typography>
                <Typography variant="body2">{logsQuery.data?.project?.name ?? t('common.notAvailable')}</Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                  {t('logs.projectUuid')}: {selectedLog.projectUuid}
                </Typography>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap>
                <Stack spacing={0.5} flex={1}>
                  <Typography variant="subtitle2">{t('logs.logId')}</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {selectedLog._id}
                  </Typography>
                </Stack>
                <Stack spacing={0.5} flex={1}>
                  <Typography variant="subtitle2">{t('logs.timestampHeader')}</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {formatDateTime(selectedLog.timestamp)}
                  </Typography>
                </Stack>
                <Stack spacing={0.5} flex={1}>
                  <Typography variant="subtitle2">{t('logs.level')}</Typography>
                  <Typography variant="body2">{selectedLog.level}</Typography>
                </Stack>
              </Stack>
              <Stack spacing={1}>
                <Typography variant="subtitle2">{t('logs.metadataHeader')}</Typography>
                <Typography variant="body2">
                  {t('logs.metadata.ip', { value: selectedLog.metadata?.ip ?? t('common.notAvailable') })}
                </Typography>
                <Typography variant="body2">
                  {t('logs.metadata.service', { value: selectedLog.metadata?.service ?? t('common.notAvailable') })}
                </Typography>
                <Typography variant="body2">
                  {t('logs.metadata.user', { value: selectedLog.metadata?.user ?? t('common.notAvailable') })}
                </Typography>
              </Stack>
              <Stack spacing={1}>
                <Typography variant="subtitle2">{t('logs.messageHeader')}</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedLog.message}
                </Typography>
              </Stack>
              <Stack spacing={1}>
                <Typography variant="subtitle2">
                  {t('logs.tagsLabel', {
                    tags: selectedLog.tags.length > 0 ? selectedLog.tags.join(', ') : t('common.notAvailable')
                  })}
                </Typography>
              </Stack>
              <Stack spacing={1}>
                <Typography variant="subtitle2">{t('logs.detailsRaw')}</Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 2,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    overflowX: 'auto'
                  }}
                >
                  {JSON.stringify(selectedLog, null, 2)}
                </Box>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Tooltip title={t('logs.copyLog')}>
            <span>
              <Button
                variant="outlined"
                startIcon={<ContentCopyIcon fontSize="small" />}
                onClick={() => {
                  if (selectedLog) {
                    void handleCopyLog(selectedLog);
                  }
                }}
                disabled={!selectedLog}
              >
                {t('common.copy')}
              </Button>
            </span>
          </Tooltip>
          <Button variant="contained" onClick={handleCloseDetailsDialog}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
