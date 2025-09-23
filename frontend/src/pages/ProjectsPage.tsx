import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { fetchProjects } from '../api';
import { Project } from '../api/types';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { formatDateTime } from '../utils/formatters';

export const ProjectsPage = (): JSX.Element => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const {
    data: projects,
    isLoading,
    isError,
    refetch
  } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });

  const filteredProjects = useMemo(() => {
    const term = search.toLowerCase();
    return (projects ?? []).filter((project) =>
      [project.name, project.description, project.uuid].some((field) => field?.toLowerCase().includes(term))
    );
  }, [projects, search]);

  const columns = useMemo<GridColDef<Project>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Название',
        flex: 1.2,
        renderCell: (params) => (
          <Stack spacing={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {params.row.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {params.row.description ?? 'Описание не задано'}
            </Typography>
          </Stack>
        )
      },
      {
        field: 'uuid',
        headerName: 'UUID',
        flex: 1,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {params.row.uuid}
          </Typography>
        )
      },
      {
        field: 'tags',
        headerName: 'Теги',
        flex: 1,
        renderCell: (params) => (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {params.row.defaultTags.map((tag) => (
              <Chip key={tag} label={tag} size="small" sx={{ mb: 0.5 }} />
            ))}
            {params.row.customTags.map((tag) => (
              <Chip key={tag} label={tag} color="primary" size="small" sx={{ mb: 0.5 }} />
            ))}
          </Stack>
        )
      },
      {
        field: 'telegram',
        headerName: 'Telegram',
        width: 160,
        renderCell: (params) =>
          params.row.telegramNotify.enabled ? (
            <Stack spacing={1}>
              <Chip label="Включено" color="success" size="small" />
              <Typography variant="caption" color="text.secondary">
                Получателей: {params.row.telegramNotify.recipients.length}
              </Typography>
            </Stack>
          ) : (
            <Chip label="Отключено" size="small" />
          )
      },
      {
        field: 'accessLevel',
        headerName: 'Доступ',
        width: 150,
        valueGetter: (value) => value,
        renderCell: (params) => <Chip label={params.row.accessLevel} size="small" color="info" />
      },
      {
        field: 'createdAt',
        headerName: 'Создан',
        width: 180,
        renderCell: (params) => <Typography variant="body2">{formatDateTime(params.row.createdAt)}</Typography>
      },
      {
        field: 'actions',
        headerName: 'Действия',
        width: 220,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={() => navigate(`/logs?uuid=${params.row.uuid}`)}>
              Логи
            </Button>
            <Button size="small" variant="outlined" onClick={() => navigate(`/ping-services?uuid=${params.row.uuid}`)}>
              Ping
            </Button>
          </Stack>
        )
      }
    ],
    [navigate]
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState message="Не удалось загрузить проекты" onRetry={() => refetch()} />;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Проекты
      </Typography>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
              <TextField
                label="Поиск по названию, описанию или UUID"
                fullWidth
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button variant="contained" onClick={() => navigate('/projects/new')}>
                Добавить проект
              </Button>
            </Stack>
            <Box sx={{ height: 520, width: '100%' }}>
              <DataGrid
                rows={filteredProjects}
                columns={columns}
                getRowId={(row) => row.uuid}
                pageSizeOptions={[5, 10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                disableRowSelectionOnClick
                localeText={{
                  noRowsLabel: 'Нет проектов',
                  columnMenuLabel: 'Меню',
                  footerTotalVisibleRows: (visibleCount, totalCount) => `${visibleCount.toLocaleString()} из ${totalCount.toLocaleString()}`
                }}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};
