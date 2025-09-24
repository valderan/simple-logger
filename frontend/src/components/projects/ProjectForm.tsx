import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import Grid from '@mui/material/Grid';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { CreateProjectPayload, TelegramRecipient } from '../../api/types';

export interface ProjectFormProps {
  initialValues: CreateProjectPayload;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: CreateProjectPayload) => void;
  error?: string | null;
  secondaryActions?: ReactNode[];
}

const cloneInitialValues = (values: CreateProjectPayload): CreateProjectPayload => ({
  ...values,
  defaultTags: [...values.defaultTags],
  customTags: [...values.customTags],
  telegramNotify: {
    ...values.telegramNotify,
    recipients: values.telegramNotify.recipients.map((recipient) => ({
      ...recipient,
      tags: [...recipient.tags]
    }))
  }
});

export const ProjectForm = ({
  initialValues,
  submitLabel,
  isSubmitting,
  onSubmit,
  error,
  secondaryActions = []
}: ProjectFormProps): JSX.Element => {
  const [formState, setFormState] = useState<CreateProjectPayload>(() => cloneInitialValues(initialValues));
  const [customTagInput, setCustomTagInput] = useState('');
  const [recipientInput, setRecipientInput] = useState({ chatId: '', tags: '' });
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setFormState(cloneInitialValues(initialValues));
  }, [initialValues]);

  const hasTelegramRecipients = useMemo(() => formState.telegramNotify.recipients.length > 0, [formState.telegramNotify.recipients]);

  const addCustomTag = () => {
    const tag = customTagInput.trim();
    if (!tag || formState.customTags.includes(tag)) {
      return;
    }
    setFormState((prev) => ({ ...prev, customTags: [...prev.customTags, tag] }));
    setCustomTagInput('');
  };

  const removeCustomTag = (tag: string) => {
    setFormState((prev) => ({ ...prev, customTags: prev.customTags.filter((item) => item !== tag) }));
  };

  const addRecipient = () => {
    const chatId = recipientInput.chatId.trim();
    if (!chatId) {
      return;
    }
    const tags = recipientInput.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const newRecipient: TelegramRecipient = { chatId, tags };
    setFormState((prev) => ({
      ...prev,
      telegramNotify: {
        ...prev.telegramNotify,
        recipients: [...prev.telegramNotify.recipients, newRecipient]
      }
    }));
    setRecipientInput({ chatId: '', tags: '' });
  };

  const removeRecipient = (chatId: string) => {
    setFormState((prev) => ({
      ...prev,
      telegramNotify: {
        ...prev.telegramNotify,
        recipients: prev.telegramNotify.recipients.filter((recipient) => recipient.chatId !== chatId)
      }
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    try {
      JSON.parse(formState.logFormat);
    } catch (parseError) {
      setValidationError('Лог-формат должен быть валидным JSON.');
      return;
    }
    onSubmit(formState);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={3}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Название проекта"
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              required
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Описание"
              value={formState.description ?? ''}
              onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Лог-формат (JSON)"
              value={formState.logFormat}
              onChange={(event) => setFormState((prev) => ({ ...prev, logFormat: event.target.value }))}
              fullWidth
              multiline
              minRows={6}
            />
          </Grid>
        </Grid>

        <Stack spacing={2}>
          <Typography variant="h6">Теги</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <FormControl sx={{ minWidth: 220 }}>
              <InputLabel id="access-level-label">Уровень доступа</InputLabel>
              <Select
                labelId="access-level-label"
                label="Уровень доступа"
                value={formState.accessLevel}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, accessLevel: event.target.value as CreateProjectPayload['accessLevel'] }))
                }
              >
                <MenuItem value="global">Глобальный</MenuItem>
                <MenuItem value="whitelist">Белый список</MenuItem>
                <MenuItem value="docker">Только Docker</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formState.debugMode}
                  onChange={(event) => setFormState((prev) => ({ ...prev, debugMode: event.target.checked }))}
                />
              }
              label="Режим отладки (без Telegram уведомлений)"
            />
          </Stack>
          <Stack spacing={1}>
            <Typography variant="subtitle1">Пользовательские теги</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Новый тег"
                value={customTagInput}
                onChange={(event) => setCustomTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addCustomTag();
                  }
                }}
              />
              <Button variant="outlined" onClick={addCustomTag}>
                Добавить тег
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {formState.customTags.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  Дополнительные теги не заданы
                </Typography>
              )}
              {formState.customTags.map((tag) => (
                <Chip key={tag} label={tag} onDelete={() => removeCustomTag(tag)} sx={{ mb: 0.5 }} />
              ))}
            </Stack>
          </Stack>
        </Stack>

        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <FormControlLabel
              control={
                <Checkbox
                  checked={formState.telegramNotify.enabled}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      telegramNotify: { ...prev.telegramNotify, enabled: event.target.checked }
                    }))
                  }
                />
              }
              label="Отправлять уведомления в Telegram"
            />
            <TextField
              label="Анти-спам интервал (мин)"
              type="number"
              sx={{ width: 220 }}
              value={formState.telegramNotify.antiSpamInterval}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  telegramNotify: { ...prev.telegramNotify, antiSpamInterval: Number(event.target.value) }
                }))
              }
              inputProps={{ min: 1 }}
            />
          </Stack>
          {formState.telegramNotify.enabled && (
            <Stack spacing={2}>
              <Typography variant="subtitle1">Получатели уведомлений</Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Chat ID"
                  value={recipientInput.chatId}
                  onChange={(event) => setRecipientInput((prev) => ({ ...prev, chatId: event.target.value }))}
                />
                <TextField
                  label="Теги (через запятую)"
                  value={recipientInput.tags}
                  onChange={(event) => setRecipientInput((prev) => ({ ...prev, tags: event.target.value }))}
                />
                <Button variant="outlined" onClick={addRecipient}>
                  Добавить получателя
                </Button>
              </Stack>
              <Stack spacing={1}>
                {!hasTelegramRecipients && (
                  <Typography variant="caption" color="text.secondary">
                    Получатели не добавлены
                  </Typography>
                )}
                {formState.telegramNotify.recipients.map((recipient) => (
                  <Stack key={recipient.chatId} direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {recipient.chatId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {recipient.tags.length > 0 ? `Теги: ${recipient.tags.join(', ')}` : 'Все теги'}
                    </Typography>
                    <IconButton onClick={() => removeRecipient(recipient.chatId)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>

        {validationError && <Alert severity="error">{validationError}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
          {secondaryActions}
          <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение...' : submitLabel}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};
