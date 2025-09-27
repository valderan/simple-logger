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
import {
  CreateProjectPayload,
  TelegramBotUrlInfo,
  TelegramCommands,
  TelegramRecipient
} from '../../api/types';
import { useTranslation } from '../../hooks/useTranslation';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export interface ProjectFormProps {
  initialValues: CreateProjectPayload;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: CreateProjectPayload) => void;
  error?: string | null;
  secondaryActions?: ReactNode[];
  rateLimitPerMinute?: number;
  telegramCommands?: TelegramCommands;
  telegramBotInfo?: TelegramBotUrlInfo;
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
  secondaryActions = [],
  rateLimitPerMinute,
  telegramCommands,
  telegramBotInfo
}: ProjectFormProps): JSX.Element => {
  const [formState, setFormState] = useState<CreateProjectPayload>(() => cloneInitialValues(initialValues));
  const [customTagInput, setCustomTagInput] = useState('');
  const [recipientInput, setRecipientInput] = useState({ chatId: '', tags: '' });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const { t } = useTranslation();

  const accessLevelRateLimitMessage = useMemo(() => {
    if (formState.accessLevel === 'global') {
      return typeof rateLimitPerMinute === 'number'
        ? t('projectForm.rateLimitGlobal', { value: rateLimitPerMinute })
        : t('projectForm.rateLimitGlobalUnknown');
    }
    return t('projectForm.rateLimitBypass');
  }, [formState.accessLevel, rateLimitPerMinute, t]);

  useEffect(() => {
    setFormState(cloneInitialValues(initialValues));
    setCopyState(null);
  }, [initialValues]);

  useEffect(() => {
    if (!copyState) {
      return;
    }
    const timer = window.setTimeout(() => setCopyState(null), 4000);
    return () => window.clearTimeout(timer);
  }, [copyState]);

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
      setValidationError(t('projectForm.validationError'));
      return;
    }
    onSubmit(formState);
  };

  const handleCopyLink = async (link: string | null, type: 'subscribe' | 'unsubscribe') => {
    if (!link) {
      setCopyState({ message: t('projectForm.telegramLinkUnavailable'), severity: 'error' });
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopyState({
        message:
          type === 'subscribe'
            ? t('projectForm.telegramLinkCopiedSubscribe')
            : t('projectForm.telegramLinkCopiedUnsubscribe'),
        severity: 'success'
      });
    } catch {
      setCopyState({ message: t('projectForm.telegramLinkCopyError'), severity: 'error' });
    }
  };

  const renderLinkRow = (label: string, link: string | null, type: 'subscribe' | 'unsubscribe') => (
    <Stack
      key={type}
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', md: 'center' }}
    >
      <Typography variant="body2" sx={{ minWidth: { md: 200 }, fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontFamily: 'monospace',
          wordBreak: 'break-all',
          bgcolor: 'background.paper',
          px: 1.5,
          py: 0.75,
          borderRadius: 1,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          flex: 1
        }}
      >
        {link ?? t('projectForm.telegramLinkUnavailableShort')}
      </Typography>
      <Button
        variant="outlined"
        startIcon={<ContentCopyIcon fontSize="small" />}
        onClick={() => handleCopyLink(link, type)}
        disabled={!link}
        sx={{ width: { xs: '100%', md: 'auto' } }}
      >
        {t('projectForm.telegramCopyLink')}
      </Button>
    </Stack>
  );

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={3}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label={t('projectForm.name')}
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              required
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label={t('projectForm.description')}
              value={formState.description ?? ''}
              onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label={t('projectForm.logFormat')}
              value={formState.logFormat}
              onChange={(event) => setFormState((prev) => ({ ...prev, logFormat: event.target.value }))}
              fullWidth
              multiline
              minRows={6}
            />
          </Grid>
        </Grid>

        <Stack spacing={2}>
          <Typography variant="h6">{t('projectForm.tagsTitle')}</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
            <FormControl sx={{ minWidth: { xs: '100%', md: 220 } }}>
              <InputLabel id="access-level-label">{t('projectForm.accessLevel')}</InputLabel>
              <Select
                labelId="access-level-label"
                label={t('projectForm.accessLevel')}
                value={formState.accessLevel}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, accessLevel: event.target.value as CreateProjectPayload['accessLevel'] }))
                }
              >
                <MenuItem value="global">{t('projectForm.accessGlobal')}</MenuItem>
                <MenuItem value="whitelist">{t('projectForm.accessWhitelist')}</MenuItem>
                <MenuItem value="docker">{t('projectForm.accessDocker')}</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formState.debugMode}
                  onChange={(event) => setFormState((prev) => ({ ...prev, debugMode: event.target.checked }))}
                />
              }
              label={t('projectForm.debugMode')}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {accessLevelRateLimitMessage}
          </Typography>
          <Stack spacing={1}>
            <Typography variant="subtitle1">{t('projectForm.customTags')}</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                label={t('projectForm.newTag')}
                value={customTagInput}
                onChange={(event) => setCustomTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addCustomTag();
                  }
                }}
                fullWidth
              />
              <Button variant="outlined" onClick={addCustomTag} sx={{ width: { xs: '100%', md: 'auto' } }}>
                {t('projectForm.addTag')}
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {formState.customTags.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  {t('projectForm.noCustomTags')}
                </Typography>
              )}
              {formState.customTags.map((tag) => (
                <Chip key={tag} label={tag} onDelete={() => removeCustomTag(tag)} sx={{ mb: 0.5 }} />
              ))}
            </Stack>
          </Stack>
        </Stack>

        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
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
              label={t('projectForm.telegramNotifications')}
            />
            <TextField
              label={t('projectForm.antiSpam')}
              type="number"
              sx={{ width: { xs: '100%', sm: 220 } }}
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
              <Typography variant="subtitle1">
                {t('projectForm.recipientsCount', { count: formState.telegramNotify.recipients.length })}
              </Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                <TextField
                  label={t('projectForm.chatId')}
                  value={recipientInput.chatId}
                  onChange={(event) => setRecipientInput((prev) => ({ ...prev, chatId: event.target.value }))}
                  fullWidth
                />
                <TextField
                  label={t('projectForm.telegramTagsLabel')}
                  placeholder={t('projectForm.tagsPlaceholder')}
                  helperText={t('projectForm.telegramTagsHelper')}
                  value={recipientInput.tags}
                  onChange={(event) => setRecipientInput((prev) => ({ ...prev, tags: event.target.value }))}
                  fullWidth
                />
                <Button variant="outlined" onClick={addRecipient} sx={{ width: { xs: '100%', md: 'auto' } }}>
                  {t('projectForm.addRecipient')}
                </Button>
              </Stack>
              <Stack spacing={1}>
                {!hasTelegramRecipients && (
                  <Typography variant="caption" color="text.secondary">
                    {t('projectForm.noRecipients')}
                  </Typography>
                )}
                {formState.telegramNotify.recipients.map((recipient) => (
                  <Stack
                    key={recipient.chatId}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                  >
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {recipient.chatId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {recipient.tags.length > 0
                        ? t('projectForm.recipientTags', { tags: recipient.tags.join(', ') })
                        : t('projectForm.recipientAllTags')}
                    </Typography>
                    <IconButton onClick={() => removeRecipient(recipient.chatId)} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>

              <Stack spacing={1.5}>
                <Typography variant="subtitle1">
                  {t('projectForm.telegramDeepLinksTitle')}
                </Typography>
                {!telegramCommands && (
                  <Alert severity="info">{t('projectForm.telegramLinkSaveNotice')}</Alert>
                )}
                {telegramCommands &&
                  (telegramCommands.subscribe || telegramCommands.unsubscribe ? (
                    <Stack spacing={1.5}>
                      {renderLinkRow(t('projectForm.telegramSubscribeLink'), telegramCommands.subscribe, 'subscribe')}
                      {renderLinkRow(t('projectForm.telegramUnsubscribeLink'), telegramCommands.unsubscribe, 'unsubscribe')}
                    </Stack>
                  ) : (
                    <Alert severity={telegramBotInfo?.botActive === false ? 'warning' : 'info'}>
                      {telegramBotInfo?.botActive === false
                        ? t('projectForm.telegramLinkBotInactive')
                        : t('projectForm.telegramLinkUnavailable')}
                    </Alert>
                  ))}
                {copyState && <Alert severity={copyState.severity}>{copyState.message}</Alert>}
              </Stack>
            </Stack>
          )}
        </Stack>

        {validationError && <Alert severity="error">{validationError}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap" alignItems={{ xs: 'stretch', md: 'center' }}>
          {secondaryActions}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting}
            sx={{ width: { xs: '100%', md: 'auto' } }}
          >
            {isSubmitting ? t('projectForm.submitting') : submitLabel}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};
