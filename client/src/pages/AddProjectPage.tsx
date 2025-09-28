import { useState } from 'react';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createProject, fetchRateLimitSettings } from '../api';
import { CreateProjectPayload } from '../api/types';
import { ProjectForm } from '../components/projects/ProjectForm';
import { LoadingState } from '../components/common/LoadingState';
import { parseApiError } from '../utils/apiError';
import { useTranslation } from '../hooks/useTranslation';

const defaultLogFormat = JSON.stringify(
  {
    level: 'INFO|ERROR|CRITICAL',
    message: 'string',
    tags: ['INFO'],
    timestamp: 'ISO8601',
    metadata: {
      ip: 'string',
      service: 'string',
      user: 'string'
    }
  },
  null,
  2
);

const emptyProjectForm: CreateProjectPayload = {
  name: '',
  description: '',
  logFormat: defaultLogFormat,
  defaultTags: ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
  customTags: [],
  accessLevel: 'global',
  telegramNotify: { enabled: false, recipients: [], antiSpamInterval: 15 },
  debugMode: false,
  maxLogEntries: 0
};

export const AddProjectPage = (): JSX.Element => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const rateLimitQuery = useQuery({ queryKey: ['rate-limit'], queryFn: fetchRateLimitSettings });
  const mutation = useMutation({
    mutationFn: (payload: CreateProjectPayload) => createProject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/projects');
    },
    onError: (error: unknown) => {
      const { message } = parseApiError(error);
      setFormError(message ?? t('addProject.error'));
    }
  });
  const handleSubmit = (values: CreateProjectPayload) => {
    setFormError(null);
    mutation.mutate(values);
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {t('addProject.title')}
      </Typography>
      <Card>
        <CardContent>
          <ProjectForm
            initialValues={emptyProjectForm}
            submitLabel={t('addProject.submit')}
            isSubmitting={mutation.isPending}
            onSubmit={handleSubmit}
            error={formError}
            rateLimitPerMinute={rateLimitQuery.data?.rateLimitPerMinute}
            secondaryActions={[
              <Button key="cancel" variant="text" onClick={() => navigate('/projects')}>
                {t('addProject.cancel')}
              </Button>
            ]}
          />
        </CardContent>
      </Card>
      {mutation.isPending && <LoadingState label={t('addProject.loading')} />}
    </Stack>
  );
};
