import { useCallback, useMemo, useState } from 'react';
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
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { deleteProject, fetchProjects } from '../api';
import { Project } from '../api/types';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { formatDateTime } from '../utils/formatters';
import { ProjectDeleteDialog } from '../components/projects/ProjectDeleteDialog';
import { parseApiError } from '../utils/apiError';
import { useTranslation } from '../hooks/useTranslation';

const SYSTEM_PROJECT_NAME = 'Logger Core';

export const ProjectsPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'));
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));
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
      setDeleteError(message ?? t('projects.deleteError'));
    }
  });

  const filteredProjects = useMemo(() => {
    const term = search.toLowerCase();
    return (projects ?? []).filter((project) =>
      [project.name, project.description, project.uuid].some((field) => field?.toLowerCase().includes(term))
    );
  }, [projects, search]);

  const handleCopyUuid = useCallback(async (uuid: string) => {
    try {
      if ('clipboard' in navigator && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(uuid);
        return;
      }
    } catch (error) {
      console.error('Не удалось скопировать UUID через Clipboard API', error);
    }

    const textarea = document.createElement('textarea');
    textarea.value = uuid;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (error) {
      console.error('Не удалось скопировать UUID', error);
    }
    document.body.removeChild(textarea);
  }, []);

  const columns = useMemo<GridColDef<Project>[]>(
    () => [
      {
        field: 'name',
        headerName: t('projects.columns.name'),
        flex: 1.2,
        renderCell: (params) => (
          <Stack spacing={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {params.row.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {params.row.description ?? t('projects.descriptionMissing')}
            </Typography>
          </Stack>
        )
      },
      {
        field: 'uuid',
        headerName: t('projects.columns.uuid'),
        flex: 1,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {params.row.uuid}
          </Typography>
        )
      },
      {
        field: 'telegram',
        headerName: t('projects.columns.telegram'),
        minWidth: 160,
        flex: isMdDown ? 1 : 0.7,
        renderCell: (params) =>
          params.row.telegramNotify.enabled ? (
            <Stack spacing={1}>
              <Chip label={t('projects.telegramEnabled')} color="success" size="small" />
              <Typography variant="caption" color="text.secondary">
                {t('projects.telegramRecipients', { count: params.row.telegramNotify.recipients.length })}
              </Typography>
            </Stack>
          ) : (
            <Chip label={t('projects.telegramDisabled')} size="small" />
          )
      },
      {
        field: 'accessLevel',
        headerName: t('projects.columns.access'),
        minWidth: 140,
        flex: isMdDown ? 0.8 : 0.5,
        valueGetter: (value) => value,
        renderCell: (params) => <Chip label={params.row.accessLevel} size="small" color="info" />
      },
      {
        field: 'createdAt',
        headerName: t('projects.columns.createdAt'),
        minWidth: 180,
        flex: isMdDown ? 0.9 : 0.6,
        renderCell: (params) => <Typography variant="body2">{formatDateTime(params.row.createdAt)}</Typography>
      },
      {
        field: 'actions',
        headerName: t('projects.columns.actions'),
        flex: 1.2,
        minWidth: isSmDown ? 240 : 360,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            sx={{ width: '100%' }}
          >
            <Tooltip title={t('projects.copyUuid')}>
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleCopyUuid(params.row.uuid)}
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  fullWidth={isSmDown}
                >
                  {t('common.uuid')}
                </Button>
              </span>
            </Tooltip>
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate(`/logs?uuid=${params.row.uuid}`)}
              fullWidth={isSmDown}
            >
              {t('projects.logs')}
            </Button>
            {params.row.name !== SYSTEM_PROJECT_NAME && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => navigate(`/projects/${params.row.uuid}/edit`)}
                  fullWidth={isSmDown}
                >
                  {t('projects.edit')}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteTarget(params.row);
                  }}
                  fullWidth={isSmDown}
                >
                  {t('projects.delete')}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => navigate(`/ping-services?uuid=${params.row.uuid}`)}
                  fullWidth={isSmDown}
                >
                  {t('projects.ping')}
                </Button>
              </>
            )}
          </Stack>
        )
      }
    ],
    [handleCopyUuid, isMdDown, isSmDown, navigate, t]
  );

  const columnVisibilityModel = useMemo(
    () => ({
      createdAt: !isSmDown
    }),
    [isSmDown]
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState message={t('projects.loadError')} onRetry={() => refetch()} />;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {t('projects.title')}
      </Typography>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', md: 'center' }}
            >
              <TextField
                label={t('projects.searchPlaceholder')}
                fullWidth
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button variant="contained" onClick={() => navigate('/projects/new')} fullWidth={isSmDown}>
                {t('projects.addProject')}
              </Button>
            </Stack>
            <Box sx={{ height: isSmDown ? 'auto' : 520, width: '100%' }}>
              <DataGrid
                rows={filteredProjects}
                columns={columns}
                getRowId={(row) => row.uuid}
                columnVisibilityModel={columnVisibilityModel}
                autoHeight={isSmDown}
                getRowHeight={() => 'auto'}
                getEstimatedRowHeight={() => 160}
                pageSizeOptions={[5, 10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                disableRowSelectionOnClick
                localeText={{
                  noRowsLabel: t('projects.noProjects'),
                  columnMenuLabel: t('projects.menu'),
                  footerTotalVisibleRows: (visibleCount, totalCount) =>
                    t('projects.totalRows', {
                      visible: visibleCount.toLocaleString(),
                      total: totalCount.toLocaleString()
                    })
                }}
                sx={{
                  '& .MuiDataGrid-row': {
                    maxHeight: 'none !important'
                  },
                  '& .MuiDataGrid-cell': {
                    display: 'flex',
                    alignItems: 'flex-start',
                    whiteSpace: 'normal',
                    py: 1.5,
                    fontSize: { xs: '0.875rem', sm: '0.95rem' }
                  },
                  '& .MuiDataGrid-columnHeaderTitle': {
                    whiteSpace: 'normal',
                    lineHeight: 1.2,
                    fontSize: { xs: '0.8rem', sm: '0.875rem' }
                  }
                }}
                density={isSmDown ? 'comfortable' : 'standard'}
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
        translationNamespace="projects"
      />
    </Stack>
  );
};
