import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  addWhitelistEntry,
  fetchProjects,
  fetchRateLimitSettings,
  fetchWhitelist,
  filterLogs,
  logSystemEvent,
  removeWhitelistEntry,
  updateRateLimitSettings
} from '../api';
import { WhitelistEntry } from '../api/types';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { formatDateTime } from '../utils/formatters';
import { useTranslation } from '../hooks/useTranslation';

export const SettingsPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const [ipInput, setIpInput] = useState({ ip: '', description: '' });
  const [rateLimitInput, setRateLimitInput] = useState('');
  const [rateLimitDialogOpen, setRateLimitDialogOpen] = useState(false);
  const [rateLimitDialogAction, setRateLimitDialogAction] = useState<'update' | 'reset'>('update');
  const [pendingRateLimit, setPendingRateLimit] = useState<number | null>(null);
  const [rateLimitFeedback, setRateLimitFeedback] = useState<{
    severity: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);
  const whitelistQuery = useQuery({ queryKey: ['whitelist'], queryFn: fetchWhitelist });
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
  const rateLimitQuery = useQuery({ queryKey: ['rate-limit'], queryFn: fetchRateLimitSettings });
  const systemLogsQuery = useQuery({
    queryKey: ['logs', 'system'],
    queryFn: () => filterLogs({ uuid: 'logger-system' }),
    staleTime: 60_000
  });

  useEffect(() => {
    if (rateLimitQuery.data) {
      setRateLimitInput(String(rateLimitQuery.data.rateLimitPerMinute));
    }
  }, [rateLimitQuery.data]);

  const addMutation = useMutation({
    mutationFn: () => addWhitelistEntry(ipInput),
    onSuccess: () => {
      setIpInput({ ip: '', description: '' });
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
    }
  });

  const removeMutation = useMutation({
    mutationFn: (ip: string) => removeWhitelistEntry(ip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
    }
  });

  const updateRateLimitMutation = useMutation({
    mutationFn: (value: number) => updateRateLimitSettings({ rateLimitPerMinute: value }),
    onSuccess: async (data) => {
      setRateLimitFeedback({ severity: 'success', message: t('settings.rateLimitUpdated') });
      setRateLimitDialogOpen(false);
      setPendingRateLimit(null);
      setRateLimitInput(String(data.rateLimitPerMinute));
      queryClient.invalidateQueries({ queryKey: ['rate-limit'] });
      try {
        await logSystemEvent({
          level: 'WARNING',
          tags: ['SECURITY', 'SETTINGS', 'RATE_LIMIT'],
          message: `Rate limit changed to ${data.rateLimitPerMinute} requests per minute`,
          metadata: { rateLimitPerMinute: data.rateLimitPerMinute }
        });
      } catch (error) {
        console.error('Failed to log rate limit change', error);
      }
    },
    onError: () => {
      setRateLimitFeedback({ severity: 'error', message: t('settings.rateLimitUpdateError') });
      setRateLimitDialogOpen(false);
      setPendingRateLimit(null);
    }
  });

  const { t } = useTranslation();
  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));

  const whitelistColumns = useMemo<GridColDef<WhitelistEntry>[]>(
    () => [
      { field: 'ip', headerName: t('settings.ipLabel'), flex: 1 },
      {
        field: 'description',
        headerName: t('settings.descriptionLabel'),
        flex: 1,
        renderCell: (params) => params.row.description ?? t('common.notAvailable')
      },
      {
        field: 'createdAt',
        headerName: t('settings.addedAt'),
        minWidth: 180,
        renderCell: (params) => formatDateTime(params.row.createdAt)
      },
      {
        field: 'actions',
        headerName: t('settings.actions'),
        minWidth: isSmDown ? 140 : 160,
        sortable: false,
        renderCell: (params) => (
          <Button
            color="error"
            size="small"
            onClick={() => removeMutation.mutate(params.row.ip)}
            fullWidth={isSmDown}
          >
            {t('settings.remove')}
          </Button>
        )
      }
    ],
    [isSmDown, removeMutation, t]
  );

  const columnVisibilityModel = useMemo(
    () => ({
      createdAt: !isSmDown
    }),
    [isSmDown]
  );

  if (whitelistQuery.isLoading || projectsQuery.isLoading || rateLimitQuery.isLoading) {
    return <LoadingState />;
  }

  if (whitelistQuery.isError || projectsQuery.isError || rateLimitQuery.isError) {
    return (
      <ErrorState
        message={t('settings.loadError')}
        onRetry={() => {
          whitelistQuery.refetch();
          projectsQuery.refetch();
          rateLimitQuery.refetch();
        }}
      />
    );
  }

  const currentRateLimit = rateLimitQuery.data?.rateLimitPerMinute ?? 120;
  const parsedRateLimit = Number(rateLimitInput);
  const rateLimitInvalid = !rateLimitInput || Number.isNaN(parsedRateLimit) || parsedRateLimit <= 0;

  const openRateLimitDialog = (action: 'update' | 'reset', value: number) => {
    if (Number.isNaN(value) || value <= 0) {
      return;
    }
    const normalized = Math.round(value);
    setRateLimitDialogAction(action);
    setPendingRateLimit(normalized);
    setRateLimitDialogOpen(true);
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {t('settings.title')}
      </Typography>
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant="h6">{t('settings.rateLimitTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('settings.rateLimitDescription', { value: currentRateLimit })}
              </Typography>
            </Stack>
            {rateLimitFeedback && (
              <Alert severity={rateLimitFeedback.severity} onClose={() => setRateLimitFeedback(null)}>
                {rateLimitFeedback.message}
              </Alert>
            )}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                label={t('settings.rateLimitLabel')}
                type="number"
                value={rateLimitInput}
                onChange={(event) => setRateLimitInput(event.target.value)}
                helperText={t('settings.rateLimitHelper')}
                inputProps={{ min: 1, step: 1 }}
                fullWidth
              />
              <Button
                variant="contained"
                onClick={() => openRateLimitDialog('update', parsedRateLimit)}
                disabled={updateRateLimitMutation.isPending || rateLimitInvalid}
                fullWidth={isSmDown}
              >
                {updateRateLimitMutation.isPending ? t('settings.saving') : t('settings.saveRateLimit')}
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => openRateLimitDialog('reset', 120)}
                disabled={updateRateLimitMutation.isPending || currentRateLimit === 120}
                fullWidth={isSmDown}
              >
                {t('settings.resetRateLimit')}
              </Button>
            </Stack>
            <Alert severity="warning">{t('settings.rateLimitWarning')}</Alert>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant="h6">{t('settings.whitelistTitle')}</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                label={t('settings.ipLabel')}
                value={ipInput.ip}
                onChange={(event) => setIpInput((prev) => ({ ...prev, ip: event.target.value }))}
                fullWidth
              />
              <TextField
                label={t('settings.descriptionLabel')}
                value={ipInput.description}
                onChange={(event) => setIpInput((prev) => ({ ...prev, description: event.target.value }))}
                fullWidth
              />
              <Button
                variant="contained"
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending || !ipInput.ip}
                fullWidth={isSmDown}
              >
                {addMutation.isPending ? t('common.savingWhitelist') : t('settings.add')}
              </Button>
            </Stack>
            <Box
              sx={{
                width: '100%',
                height: isSmDown ? 'auto' : 360,
                overflowX: 'auto'
              }}
            >
              <DataGrid
                rows={whitelistQuery.data ?? []}
                columns={whitelistColumns}
                getRowId={(row) => row.ip}
                columnVisibilityModel={columnVisibilityModel}
                autoHeight={isSmDown}
                pageSizeOptions={[5, 10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                disableRowSelectionOnClick
                localeText={{ noRowsLabel: t('settings.whitelistEmpty') }}
                sx={{
                  minWidth: isSmDown ? 520 : undefined,
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
      <Dialog
        open={rateLimitDialogOpen}
        onClose={() => {
          if (!updateRateLimitMutation.isPending) {
            setRateLimitDialogOpen(false);
            setPendingRateLimit(null);
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('settings.rateLimitDialogTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {rateLimitDialogAction === 'reset'
              ? t('settings.rateLimitResetConfirm', { value: 120 })
              : t('settings.rateLimitConfirm', { value: pendingRateLimit ?? '' })}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {t('settings.rateLimitDialogWarning')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (!updateRateLimitMutation.isPending) {
                setRateLimitDialogOpen(false);
                setPendingRateLimit(null);
              }
            }}
            disabled={updateRateLimitMutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              if (pendingRateLimit !== null) {
                updateRateLimitMutation.mutate(pendingRateLimit);
              }
            }}
            disabled={updateRateLimitMutation.isPending || pendingRateLimit === null}
          >
            {updateRateLimitMutation.isPending ? t('settings.saving') : t('settings.confirmRateLimit')}
          </Button>
        </DialogActions>
      </Dialog>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">{t('settings.systemTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('settings.systemDescription')}
            </Typography>
            {systemLogsQuery.isLoading && <LoadingState label={t('common.loadingSystemLogs')} />}
            {systemLogsQuery.isError && <Alert severity="error">{t('settings.loadSystemError')}</Alert>}
            {systemLogsQuery.data && (
              <Box sx={{ maxHeight: 320, overflow: 'auto', bgcolor: 'grey.50', borderRadius: 2, p: 2 }}>
                <Stack spacing={1.5}>
                  {systemLogsQuery.data.logs.slice(0, 20).map((log) => {
                    const metadata = log.metadata ?? {};
                    return (
                      <Box key={log._id} sx={{ borderBottom: '1px solid', borderColor: 'grey.200', pb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(log.timestamp)} · {log.level}
                        </Typography>
                        <Typography variant="body2">{log.message}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('settings.systemLogMeta', {
                            ip: metadata.ip ?? t('common.notAvailable'),
                            service: metadata.service ?? t('common.notAvailable')
                          })}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};
