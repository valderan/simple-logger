import { useMemo, useState } from 'react';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteProject, fetchProject, fetchRateLimitSettings, updateProject } from '../api';
import { CreateProjectPayload, Project } from '../api/types';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { ProjectForm } from '../components/projects/ProjectForm';
import { ProjectDeleteDialog } from '../components/projects/ProjectDeleteDialog';
import { parseApiError } from '../utils/apiError';
import { useTranslation } from '../hooks/useTranslation';

const projectToFormValues = (project: Project): CreateProjectPayload => ({
  name: project.name,
  description: project.description ?? '',
  logFormat: JSON.stringify(project.logFormat, null, 2),
  defaultTags: project.defaultTags,
  customTags: project.customTags,
  accessLevel: project.accessLevel,
  telegramNotify: {
    ...project.telegramNotify,
    recipients: project.telegramNotify.recipients ?? []
  },
  debugMode: project.debugMode
});

export const EditProjectPage = (): JSX.Element => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const projectQuery = useQuery({
    queryKey: ['project', uuid],
    queryFn: () => fetchProject(uuid!),
    enabled: Boolean(uuid),
    retry: false
  });
  const rateLimitQuery = useQuery({ queryKey: ['rate-limit'], queryFn: fetchRateLimitSettings });

  const updateMutation = useMutation({
    mutationFn: (values: CreateProjectPayload) => updateProject(uuid!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', uuid] });
      navigate('/projects');
    },
    onError: (error: unknown) => {
      const { message } = parseApiError(error);
      setFormError(message ?? t('editProject.error'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(uuid!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleteDialogOpen(false);
      navigate('/projects');
    },
    onError: (error: unknown) => {
      const { message } = parseApiError(error);
      setDeleteError(message ?? t('editProject.deleteError'));
    }
  });

  const formInitialValues = useMemo(() => {
    if (!projectQuery.data) {
      return null;
    }
    return projectToFormValues(projectQuery.data);
  }, [projectQuery.data]);

  if (!uuid) {
    return <ErrorState message={t('editProject.missingUuid')} />;
  }

  if (projectQuery.isLoading) {
    return <LoadingState label={t('editProject.loadInProgress')} />;
  }

  if (projectQuery.isError || !projectQuery.data || !formInitialValues) {
    return <ErrorState message={t('editProject.loadError')} onRetry={() => projectQuery.refetch()} />;
  }

  const handleSubmit = (values: CreateProjectPayload) => {
    setFormError(null);
    updateMutation.mutate(values);
  };

  const handleDelete = () => {
    setDeleteError(null);
    deleteMutation.mutate();
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {t('editProject.title')}
      </Typography>
      <Card>
        <CardContent>
          <ProjectForm
            initialValues={formInitialValues}
            submitLabel={t('editProject.submit')}
            isSubmitting={updateMutation.isPending}
            onSubmit={handleSubmit}
            error={formError}
            rateLimitPerMinute={rateLimitQuery.data?.rateLimitPerMinute}
            telegramLinks={projectQuery.data.telegramLinks}
            telegramBotInfo={projectQuery.data.telegramBot}
            secondaryActions={[
              <Button key="cancel" variant="text" onClick={() => navigate('/projects')}>
                {t('common.cancel')}
              </Button>,
              <Button key="delete" variant="outlined" color="error" onClick={() => setDeleteDialogOpen(true)}>
                {t('editProject.delete')}
              </Button>
            ]}
          />
        </CardContent>
      </Card>
      {updateMutation.isPending && <LoadingState label={t('editProject.loading')} />}
      <ProjectDeleteDialog
        open={deleteDialogOpen}
        projectName={projectQuery.data.name}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteDialogOpen(false);
          }
        }}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        error={deleteError}
        translationNamespace="projects"
      />
    </Stack>
  );
};
