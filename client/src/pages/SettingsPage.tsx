import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { addWhitelistEntry, fetchProjects, fetchWhitelist, filterLogs, removeWhitelistEntry } from '../api';
import { WhitelistEntry } from '../api/types';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { formatDateTime } from '../utils/formatters';
import { useTranslation } from '../hooks/useTranslation';

export const SettingsPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const [ipInput, setIpInput] = useState({ ip: '', description: '' });
  const whitelistQuery = useQuery({ queryKey: ['whitelist'], queryFn: fetchWhitelist });
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
  const systemLogsQuery = useQuery({
    queryKey: ['logs', 'system'],
    queryFn: () => filterLogs({ uuid: 'logger-system' }),
    staleTime: 60_000
  });

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

  if (whitelistQuery.isLoading || projectsQuery.isLoading) {
    return <LoadingState />;
  }

  if (whitelistQuery.isError || projectsQuery.isError) {
    return (
      <ErrorState
        message={t('settings.loadError')}
        onRetry={() => {
          whitelistQuery.refetch();
          projectsQuery.refetch();
        }}
      />
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {t('settings.title')}
      </Typography>
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
