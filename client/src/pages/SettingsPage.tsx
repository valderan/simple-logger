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
  useTheme,
  type AlertColor
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { isAxiosError } from 'axios';
import {
  addWhitelistEntry,
  createBlacklistEntry,
  deleteBlacklistEntry,
  fetchProjects,
  fetchRateLimitSettings,
  fetchBlacklist,
  fetchWhitelist,
  filterLogs,
  logSystemEvent,
  updateBlacklistEntry,
  removeWhitelistEntry,
  updateRateLimitSettings
} from '../api';
import { BlacklistEntry, WhitelistEntry, type WhitelistPayload } from '../api/types';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { formatDateTime } from '../utils/formatters';
import { useTranslation } from '../hooks/useTranslation';
import { isValidIpAddress } from '../utils/ip';

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
  const [whitelistFeedback, setWhitelistFeedback] = useState<{ severity: AlertColor; message: string } | null>(null);
  const [blacklistForm, setBlacklistForm] = useState({ ip: '', reason: '', expiresAt: '' });
  const [blacklistFeedback, setBlacklistFeedback] = useState<{ severity: AlertColor; message: string } | null>(null);
  const [editBlacklistDialogOpen, setEditBlacklistDialogOpen] = useState(false);
  const [editingBlacklist, setEditingBlacklist] = useState<BlacklistEntry | null>(null);
  const [editBlacklistForm, setEditBlacklistForm] = useState({ ip: '', reason: '', expiresAt: '' });
  const [deletingBlacklistId, setDeletingBlacklistId] = useState<string | null>(null);
  const whitelistQuery = useQuery({ queryKey: ['whitelist'], queryFn: fetchWhitelist });
  const blacklistQuery = useQuery({ queryKey: ['blacklist'], queryFn: fetchBlacklist });
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
  const rateLimitQuery = useQuery({ queryKey: ['rate-limit'], queryFn: fetchRateLimitSettings });
  const { t } = useTranslation();
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

  const toIsoString = (value: string): string | null => {
    if (!value) {
      return null;
    }
    return new Date(value).toISOString();
  };

  const toInputValue = (iso: string | null): string => {
    if (!iso) {
      return '';
    }
    const date = new Date(iso);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 16);
  };

  const trimmedWhitelistIp = ipInput.ip.trim();
  const whitelistIpInvalid = trimmedWhitelistIp.length > 0 && !isValidIpAddress(trimmedWhitelistIp);
  const trimmedBlacklistIp = blacklistForm.ip.trim();
  const blacklistIpInvalid = trimmedBlacklistIp.length > 0 && !isValidIpAddress(trimmedBlacklistIp);
  const trimmedEditBlacklistIp = editBlacklistForm.ip.trim();
  const editBlacklistIpInvalid =
    trimmedEditBlacklistIp.length > 0 && !isValidIpAddress(trimmedEditBlacklistIp);

  const getWhitelistErrorMessage = (error: unknown): string => {
    if (isAxiosError(error)) {
      const data = error.response?.data as { message?: string; code?: string } | undefined;
      if (data?.code === 'WHITELIST_PROTECTED') {
        return t('settings.whitelistProtectedMessage');
      }
      if (typeof data?.message === 'string' && data.message.trim().length > 0) {
        return data.message;
      }
    }
    return t('common.unexpectedError');
  };

  const [removingWhitelistIp, setRemovingWhitelistIp] = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: (payload: WhitelistPayload) => addWhitelistEntry(payload),
    onMutate: () => {
      setWhitelistFeedback(null);
    },
    onSuccess: () => {
      setIpInput({ ip: '', description: '' });
      setWhitelistFeedback({ severity: 'success', message: t('settings.whitelistAdded') });
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
    },
    onError: (error: unknown) => {
      setWhitelistFeedback({ severity: 'error', message: getWhitelistErrorMessage(error) });
    }
  });

  const removeMutation = useMutation({
    mutationFn: (ip: string) => removeWhitelistEntry(ip),
    onMutate: (ip: string) => {
      setWhitelistFeedback(null);
      setRemovingWhitelistIp(ip);
    },
    onSuccess: () => {
      setWhitelistFeedback({ severity: 'success', message: t('settings.whitelistRemoved') });
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
    },
    onError: (error: unknown) => {
      setWhitelistFeedback({ severity: 'error', message: getWhitelistErrorMessage(error) });
    },
    onSettled: () => {
      setRemovingWhitelistIp(null);
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

  const createBlacklistMutation = useMutation({
    mutationFn: (payload: { ip: string; reason: string; expiresAt: string | null }) =>
      createBlacklistEntry(payload),
    onSuccess: () => {
      setBlacklistFeedback({ severity: 'success', message: t('settings.blacklistCreateSuccess') });
      setBlacklistForm({ ip: '', reason: '', expiresAt: '' });
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
    },
    onError: () => {
      setBlacklistFeedback({ severity: 'error', message: t('settings.blacklistOperationError') });
    }
  });

  const updateBlacklistMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { ip: string; reason: string; expiresAt: string | null } }) =>
      updateBlacklistEntry(id, payload),
    onSuccess: () => {
      setBlacklistFeedback({ severity: 'success', message: t('settings.blacklistUpdateSuccess') });
      setEditBlacklistDialogOpen(false);
      setEditingBlacklist(null);
      setEditBlacklistForm({ ip: '', reason: '', expiresAt: '' });
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
    },
    onError: () => {
      setBlacklistFeedback({ severity: 'error', message: t('settings.blacklistOperationError') });
    }
  });

  const deleteBlacklistMutation = useMutation({
    mutationFn: (id: string) => deleteBlacklistEntry(id),
    onMutate: (id) => {
      setDeletingBlacklistId(id);
    },
    onSuccess: () => {
      setBlacklistFeedback({ severity: 'success', message: t('settings.blacklistDeleteSuccess') });
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
    },
    onError: () => {
      setBlacklistFeedback({ severity: 'error', message: t('settings.blacklistOperationError') });
    },
    onSettled: () => {
      setDeletingBlacklistId(null);
    }
  });

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
        renderCell: (params) => {
          if (params.row.isProtected) {
            return (
              <Typography variant="body2" color="text.secondary">
                {t('settings.whitelistProtectedLabel')}
              </Typography>
            );
          }
          const deleting = removingWhitelistIp === params.row.ip && removeMutation.isPending;
          return (
            <Button
              color="error"
              size="small"
              onClick={() => removeMutation.mutate(params.row.ip)}
              disabled={deleting}
              fullWidth={isSmDown}
            >
              {deleting ? t('common.removing') : t('settings.remove')}
            </Button>
          );
        }
      }
    ],
    [isSmDown, removeMutation, removingWhitelistIp, t]
  );

  const columnVisibilityModel = useMemo(
    () => ({
      createdAt: !isSmDown
    }),
    [isSmDown]
  );

  const handleCreateBlacklist = () => {
    const ip = trimmedBlacklistIp;
    if (!ip || blacklistIpInvalid) {
      return;
    }
    const reason = blacklistForm.reason.trim();
    if (!ip || !reason) {
      return;
    }
    const expiresAt = toIsoString(blacklistForm.expiresAt);
    createBlacklistMutation.mutate({ ip, reason, expiresAt });
  };

  const openEditBlacklistDialog = (entry: BlacklistEntry) => {
    setEditingBlacklist(entry);
    setEditBlacklistForm({
      ip: entry.ip,
      reason: entry.reason,
      expiresAt: toInputValue(entry.expiresAt)
    });
    setEditBlacklistDialogOpen(true);
  };

  const handleDeleteBlacklist = (id: string) => {
    deleteBlacklistMutation.mutate(id);
  };

  const blacklistColumns = useMemo<GridColDef<BlacklistEntry>[]>(
    () => [
      { field: 'ip', headerName: t('settings.ipLabel'), flex: 1 },
      {
        field: 'reason',
        headerName: t('settings.blacklistReasonLabel'),
        flex: 1.5,
        renderCell: (params) => params.row.reason
      },
      {
        field: 'expiresAt',
        headerName: t('settings.blacklistExpiresAtColumn'),
        minWidth: 190,
        renderCell: (params) =>
          params.row.expiresAt ? formatDateTime(params.row.expiresAt) : t('settings.blacklistPermanent')
      },
      {
        field: 'updatedAt',
        headerName: t('settings.blacklistUpdatedAt'),
        minWidth: 180,
        renderCell: (params) => formatDateTime(params.row.updatedAt)
      },
      {
        field: 'actions',
        headerName: t('settings.actions'),
        minWidth: isSmDown ? 180 : 220,
        sortable: false,
        renderCell: (params) => {
          const deleting = deletingBlacklistId === params.row._id && deleteBlacklistMutation.isPending;
          return (
            <Stack direction={isSmDown ? 'column' : 'row'} spacing={1} width="100%">
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  openEditBlacklistDialog(params.row);
                }}
                fullWidth={isSmDown}
              >
                {t('common.edit')}
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => handleDeleteBlacklist(params.row._id)}
                disabled={deleting}
                fullWidth={isSmDown}
              >
                {deleting ? t('settings.deleting') : t('settings.remove')}
              </Button>
            </Stack>
          );
        }
      }
    ],
    [deleteBlacklistMutation.isPending, deletingBlacklistId, handleDeleteBlacklist, isSmDown, openEditBlacklistDialog, t]
  );

  const blacklistColumnVisibilityModel = useMemo(
    () => ({
      updatedAt: !isSmDown
    }),
    [isSmDown]
  );

  const closeEditBlacklistDialog = () => {
    if (updateBlacklistMutation.isPending) {
      return;
    }
    setEditBlacklistDialogOpen(false);
    setEditingBlacklist(null);
    setEditBlacklistForm({ ip: '', reason: '', expiresAt: '' });
  };

  const handleUpdateBlacklist = () => {
    if (!editingBlacklist) {
      return;
    }
    const ip = trimmedEditBlacklistIp;
    const reason = editBlacklistForm.reason.trim();
    if (!ip || !reason || editBlacklistIpInvalid) {
      return;
    }
    const expiresAt = toIsoString(editBlacklistForm.expiresAt);
    updateBlacklistMutation.mutate({ id: editingBlacklist._id, payload: { ip, reason, expiresAt } });
  };

  if (whitelistQuery.isLoading || blacklistQuery.isLoading || projectsQuery.isLoading || rateLimitQuery.isLoading) {
    return <LoadingState />;
  }

  if (whitelistQuery.isError || blacklistQuery.isError || projectsQuery.isError || rateLimitQuery.isError) {
    return (
      <ErrorState
        message={t('settings.loadError')}
        onRetry={() => {
          whitelistQuery.refetch();
          blacklistQuery.refetch();
          projectsQuery.refetch();
          rateLimitQuery.refetch();
        }}
      />
    );
  }

  const currentRateLimit = rateLimitQuery.data?.rateLimitPerMinute ?? 120;
  const parsedRateLimit = Number(rateLimitInput);
  const rateLimitInvalid = !rateLimitInput || Number.isNaN(parsedRateLimit) || parsedRateLimit <= 0;
  const blacklistCreateDisabled =
    !trimmedBlacklistIp ||
    !blacklistForm.reason.trim() ||
    createBlacklistMutation.isPending ||
    blacklistIpInvalid;
  const blacklistEditInvalid =
    !trimmedEditBlacklistIp || !editBlacklistForm.reason.trim() || editBlacklistIpInvalid;

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
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
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
            <Stack spacing={1}>
              <Typography variant="h6">{t('settings.blacklistTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('settings.blacklistDescription')}
              </Typography>
            </Stack>
            {blacklistFeedback && (
              <Alert severity={blacklistFeedback.severity} onClose={() => setBlacklistFeedback(null)}>
                {blacklistFeedback.message}
              </Alert>
            )}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
              <TextField
                label={t('settings.ipLabel')}
                value={blacklistForm.ip}
                onChange={(event) => setBlacklistForm((prev) => ({ ...prev, ip: event.target.value }))}
                error={blacklistIpInvalid}
                helperText={blacklistIpInvalid ? t('settings.invalidIp') : ' '}
                fullWidth
              />
              <TextField
                label={t('settings.blacklistReasonLabel')}
                value={blacklistForm.reason}
                onChange={(event) => setBlacklistForm((prev) => ({ ...prev, reason: event.target.value }))}
                fullWidth
              />
              <TextField
                label={t('settings.blacklistExpiresAtLabel')}
                type="datetime-local"
                value={blacklistForm.expiresAt}
                onChange={(event) => setBlacklistForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
                helperText={t('settings.blacklistExpiresHelper')}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <Button
                variant="contained"
                onClick={handleCreateBlacklist}
                disabled={blacklistCreateDisabled}
                fullWidth={isSmDown}
              >
                {createBlacklistMutation.isPending ? t('settings.saving') : t('settings.blacklistAddButton')}
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
                rows={blacklistQuery.data ?? []}
                columns={blacklistColumns}
                getRowId={(row) => row._id}
                columnVisibilityModel={blacklistColumnVisibilityModel}
                autoHeight={isSmDown}
                pageSizeOptions={[5, 10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                disableRowSelectionOnClick
                localeText={{ noRowsLabel: t('settings.blacklistEmpty') }}
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
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant="h6">{t('settings.whitelistTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('settings.whitelistDescription')}
              </Typography>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
              <TextField
                label={t('settings.ipLabel')}
                value={ipInput.ip}
                onChange={(event) => setIpInput((prev) => ({ ...prev, ip: event.target.value }))}
                error={whitelistIpInvalid}
                helperText={whitelistIpInvalid ? t('settings.invalidIp') : ' '}
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
                onClick={() => {
                  if (whitelistIpInvalid || !trimmedWhitelistIp) {
                    return;
                  }
                  addMutation.mutate({
                    ip: trimmedWhitelistIp,
                    description: ipInput.description.trim() ? ipInput.description.trim() : undefined
                  });
                }}
                disabled={addMutation.isPending || !trimmedWhitelistIp || whitelistIpInvalid}
                fullWidth={isSmDown}
              >
                {addMutation.isPending ? t('common.savingWhitelist') : t('settings.add')}
              </Button>
            </Stack>
            {whitelistFeedback && (
              <Alert
                severity={whitelistFeedback.severity}
                onClose={() => setWhitelistFeedback(null)}
                sx={{ maxWidth: 640 }}
              >
                {whitelistFeedback.message}
              </Alert>
            )}
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
      <Dialog open={editBlacklistDialogOpen} onClose={closeEditBlacklistDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('settings.blacklistEditDialogTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('settings.ipLabel')}
              value={editBlacklistForm.ip}
              onChange={(event) => setEditBlacklistForm((prev) => ({ ...prev, ip: event.target.value }))}
              error={editBlacklistIpInvalid}
              helperText={editBlacklistIpInvalid ? t('settings.invalidIp') : ' '}
              fullWidth
            />
            <TextField
              label={t('settings.blacklistReasonLabel')}
              value={editBlacklistForm.reason}
              onChange={(event) => setEditBlacklistForm((prev) => ({ ...prev, reason: event.target.value }))}
              fullWidth
            />
            <TextField
              label={t('settings.blacklistExpiresAtLabel')}
              type="datetime-local"
              value={editBlacklistForm.expiresAt}
              onChange={(event) => setEditBlacklistForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
              helperText={t('settings.blacklistExpiresHelper')}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditBlacklistDialog} disabled={updateBlacklistMutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateBlacklist}
            disabled={updateBlacklistMutation.isPending || blacklistEditInvalid}
          >
            {updateBlacklistMutation.isPending ? t('settings.saving') : t('settings.blacklistSaveChanges')}
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
              <Box
                sx={(theme) => ({
                  maxHeight: 320,
                  overflow: 'auto',
                  bgcolor:
                    theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[50],
                  color:
                    theme.palette.mode === 'dark'
                      ? theme.palette.getContrastText(theme.palette.grey[900])
                      : 'inherit',
                  borderRadius: 2,
                  p: 2,
                  border: '1px solid',
                  borderColor:
                    theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200]
                })}
              >
                <Stack spacing={1.5}>
                  {systemLogsQuery.data.logs.slice(0, 20).map((log) => {
                    const metadata = log.metadata ?? {};
                    return (
                      <Box
                        key={log._id}
                        sx={(theme) => ({
                          borderBottom: '1px solid',
                          borderColor:
                            theme.palette.mode === 'dark'
                              ? theme.palette.grey[800]
                              : theme.palette.grey[200],
                          pb: 1
                        })}
                      >
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
