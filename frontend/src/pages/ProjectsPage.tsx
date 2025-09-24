import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { deleteProject, fetchProjects } from '../api';
import { Project } from '../api/types';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { formatDateTime } from '../utils/formatters';
import { ProjectDeleteDialog } from '../components/projects/ProjectDeleteDialog';
import { parseApiError } from '../utils/apiError';

export const ProjectsPage = (): JSX.Element => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const {
    data: projects,
    isLoading,
    isError,
    refetch
  } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });

  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => deleteProject(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleteTarget(null);
    },
    onError: (error: unknown) => {
      const { message } = parseApiError(error);
      setDeleteError(message ?? 'Не удалось удалить проект');
    }
  });

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
        flex: 1,
        minWidth: 320,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ width: '100%' }}>
            <Button size="small" variant="outlined" onClick={() => navigate(`/projects/${params.row.uuid}/edit`)}>
              Изменить
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => {
                setDeleteError(null);
                setDeleteTarget(params.row);
              }}
            >
              Удалить
            </Button>
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
                getRowHeight={() => 'auto'}
                getEstimatedRowHeight={() => 160}
                pageSizeOptions={[5, 10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                disableRowSelectionOnClick
                localeText={{
                  noRowsLabel: 'Нет проектов',
                  columnMenuLabel: 'Меню',
                  footerTotalVisibleRows: (visibleCount, totalCount) => `${visibleCount.toLocaleString()} из ${totalCount.toLocaleString()}`
                }}
                sx={{
                  '& .MuiDataGrid-row': {
                    maxHeight: 'none !important'
                  },
                  '& .MuiDataGrid-cell': {
                    display: 'flex',
                    alignItems: 'flex-start',
                    whiteSpace: 'normal',
                    py: 1.5
                  }
                }}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>
      <ProjectDeleteDialog
        open={Boolean(deleteTarget)}
        projectName={deleteTarget?.name ?? ''}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => {
          if (deleteTarget) {
            setDeleteError(null);
            deleteMutation.mutate(deleteTarget.uuid);
          }
        }}
        isLoading={deleteMutation.isPending}
        error={deleteError}
      />
    </Stack>
  );
};
