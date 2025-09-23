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

export const TelegramPage = (): JSX.Element => {
  const {
    data: projects,
    isLoading,
    isError,
    refetch
  } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });

  const enabledProjects = useMemo(() => (projects ?? []).filter((project) => project.telegramNotify.enabled), [projects]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState message="Не удалось загрузить проекты" onRetry={() => refetch()} />;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Telegram-интеграция
      </Typography>
      <Alert severity="info">
        Для отправки уведомлений необходимо указать токен бота в переменной окружения <strong>BOT_API_KEY</strong> на стороне
        backend. Управление списком получателей производится для каждого проекта отдельно.
      </Alert>
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
                    <Chip label={project.telegramNotify.enabled ? 'Уведомления включены' : 'Уведомления выключены'}
                      color={project.telegramNotify.enabled ? 'success' : 'default'}
                      size="small"
                    />
                    {project.debugMode && <Chip label="Debug" color="warning" size="small" />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    UUID: {project.uuid}
                  </Typography>
                  {project.telegramNotify.enabled ? (
                    <Stack spacing={1}>
                      <Typography variant="subtitle2">Получатели ({project.telegramNotify.recipients.length})</Typography>
                      {project.telegramNotify.recipients.length === 0 && (
                        <Typography variant="caption" color="text.secondary">
                          Получатели не настроены. Добавьте их при создании проекта или через обновление настроек backend.
                        </Typography>
                      )}
                      {project.telegramNotify.recipients.map((recipient) => (
                        <Box key={recipient.chatId} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            Chat ID: {recipient.chatId}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {recipient.tags.length > 0 ? `Теги: ${recipient.tags.join(', ')}` : 'Получает все события'}
                          </Typography>
                        </Box>
                      ))}
                      <Typography variant="caption" color="text.secondary">
                        Анти-спам интервал: {project.telegramNotify.antiSpamInterval} мин.
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Telegram-уведомления отключены. Включите их при создании проекта или обновите конфигурацию в базе данных.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {enabledProjects.length === 0 && (
        <Alert severity="warning">Нет проектов с активными telegram-уведомлениями. Включите уведомления при создании проекта.</Alert>
      )}
    </Stack>
  );
};
