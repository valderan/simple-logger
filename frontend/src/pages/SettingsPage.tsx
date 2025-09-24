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
  Typography
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { addWhitelistEntry, fetchProjects, fetchWhitelist, filterLogs, removeWhitelistEntry } from '../api';
import { WhitelistEntry } from '../api/types';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { formatDateTime } from '../utils/formatters';

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

  const whitelistColumns = useMemo<GridColDef<WhitelistEntry>[]>(
    () => [
      { field: 'ip', headerName: 'IP адрес', flex: 1 },
      {
        field: 'description',
        headerName: 'Описание',
        flex: 1,
        renderCell: (params) => params.row.description ?? '—'
      },
      {
        field: 'createdAt',
        headerName: 'Добавлен',
        width: 180,
        renderCell: (params) => formatDateTime(params.row.createdAt)
      },
      {
        field: 'actions',
        headerName: 'Действия',
        width: 160,
        sortable: false,
        renderCell: (params) => (
          <Button color="error" size="small" onClick={() => removeMutation.mutate(params.row.ip)}>
            Удалить
          </Button>
        )
      }
    ],
    [removeMutation]
  );

  if (whitelistQuery.isLoading || projectsQuery.isLoading) {
    return <LoadingState />;
  }

  if (whitelistQuery.isError || projectsQuery.isError) {
    return <ErrorState message="Не удалось загрузить настройки" onRetry={() => { whitelistQuery.refetch(); projectsQuery.refetch(); }} />;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Настройки безопасности
      </Typography>
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant="h6">Белый список IP</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              <TextField
                label="IP адрес"
                value={ipInput.ip}
                onChange={(event) => setIpInput((prev) => ({ ...prev, ip: event.target.value }))}
              />
              <TextField
                label="Описание"
                value={ipInput.description}
                onChange={(event) => setIpInput((prev) => ({ ...prev, description: event.target.value }))}
              />
              <Button
                variant="contained"
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending || !ipInput.ip}
              >
                {addMutation.isPending ? 'Сохранение...' : 'Добавить'}
              </Button>
            </Stack>
            <Box sx={{ height: 360, width: '100%' }}>
              <DataGrid
                rows={whitelistQuery.data ?? []}
                columns={whitelistColumns}
                getRowId={(row) => row.ip}
                pageSizeOptions={[5, 10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                disableRowSelectionOnClick
                localeText={{ noRowsLabel: 'Белый список пуст' }}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Системный проект Logger</Typography>
            <Typography variant="body2" color="text.secondary">
              Системный проект хранит внутренние события: ошибки авторизации, блокировки IP и другие служебные события.
            </Typography>
            {systemLogsQuery.isLoading && <LoadingState label="Загрузка системных логов..." />}
            {systemLogsQuery.isError && <Alert severity="error">Не удалось загрузить системные логи.</Alert>}
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
                          IP: {metadata.ip ?? '—'} · Сервис: {metadata.service ?? '—'}
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
