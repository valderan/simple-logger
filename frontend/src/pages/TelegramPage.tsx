import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { fetchProjects } from '../api';
import { Project } from '../api/types';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { useTranslation } from '../hooks/useTranslation';

export const TelegramPage = (): JSX.Element => {
  const {
    data: projects,
    isLoading,
    isError,
    refetch
  } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
  const { t } = useTranslation();

  const enabledProjects = useMemo(() => (projects ?? []).filter((project) => project.telegramNotify.enabled), [projects]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState message={t('telegram.loadError')} onRetry={() => refetch()} />;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {t('telegram.title')}
      </Typography>
      <Alert severity="info">{t('telegram.info')}</Alert>
      <Grid container spacing={3}>
        {(projects ?? []).map((project: Project) => (
          <Grid size={{ xs: 12, md: 6 }} key={project.uuid}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {project.name}
                    </Typography>
                    <Chip
                      label={
                        project.telegramNotify.enabled
                          ? t('telegram.notificationsEnabled')
                          : t('telegram.notificationsDisabled')
                      }
                      color={project.telegramNotify.enabled ? 'success' : 'default'}
                      size="small"
                    />
                    {project.debugMode && <Chip label={t('common.debug')} color="warning" size="small" />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    UUID: {project.uuid}
                  </Typography>
                  {project.telegramNotify.enabled ? (
                    <Stack spacing={1}>
                      <Typography variant="subtitle2">
                        {t('telegram.recipients', { count: project.telegramNotify.recipients.length })}
                      </Typography>
                      {project.telegramNotify.recipients.length === 0 && (
                        <Typography variant="caption" color="text.secondary">
                          {t('telegram.noRecipients')}
                        </Typography>
                      )}
                      {project.telegramNotify.recipients.map((recipient) => (
                        <Box key={recipient.chatId} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            Chat ID: {recipient.chatId}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {recipient.tags.length > 0
                              ? t('projectForm.recipientTags', { tags: recipient.tags.join(', ') })
                              : t('telegram.receivesAll')}
                          </Typography>
                        </Box>
                      ))}
                      <Typography variant="caption" color="text.secondary">
                        {t('telegram.antiSpam', { interval: project.telegramNotify.antiSpamInterval })}
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {t('telegram.disabledInfo')}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {enabledProjects.length === 0 && (
        <Alert severity="warning">{t('telegram.noProjectsWarning')}</Alert>
      )}
    </Stack>
  );
};
