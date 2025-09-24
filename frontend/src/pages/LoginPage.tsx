import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  Link as MuiLink,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeIcon from '@mui/icons-material/LightModeOutlined';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { loginRequest } from '../api';
import { useAuth } from '../hooks/useAuth';
import { parseApiError } from '../utils/apiError';
import { useThemeMode } from '../hooks/useThemeMode';
import { getApiBaseUrl, setApiBaseUrl } from '../api/client';
import { useTranslation } from '../hooks/useTranslation';
import { LOGGER_PAGE_URL, LOGGER_VERSION } from '../config';

export const LoginPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const { t, language, setLanguage } = useTranslation();
  const [formState, setFormState] = useState({ username: '', password: '', apiUrl: getApiBaseUrl() });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  type LoginPayload = typeof formState;

  const mutation = useMutation({
    mutationFn: ({ username, password, apiUrl }: LoginPayload) => {
      setApiBaseUrl(apiUrl);
      return loginRequest(username, password);
    },
    onSuccess: (data) => {
      login(data.token);
      navigate('/');
    },
    onError: (error: unknown) => {
      const { status, message } = parseApiError(error);
      if (status === 423) {
        setErrorMessage(message ?? t('auth.blocked'));
        return;
      }
      setErrorMessage(message ?? t('auth.failed'));
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (field: keyof LoginPayload) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    const payload: LoginPayload = {
      username: formState.username,
      password: formState.password,
      apiUrl: formState.apiUrl.trim()
    };
    mutation.mutate(payload);
  };

  const showVersionInfo = Boolean(LOGGER_VERSION && LOGGER_PAGE_URL);
  const logoSrc = mode === 'light' ? '/logo_light.png' : '/logo_dark.png';

  return (
    <Container
      maxWidth="sm"
      sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh', py: 6 }}
    >
      <Stack spacing={4} sx={{ width: '100%' }}>
        <Stack direction="row" spacing={1.5} justifyContent="flex-end" alignItems="center">
          <Tooltip title={t('auth.languageToggle')}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={language}
              onChange={(_, value) => {
                if (value) {
                  setLanguage(value);
                }
              }}
              aria-label={t('auth.languageToggle')}
              sx={{
                borderRadius: 2,
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 1.5,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText'
                  }
                }
              }}
            >
              <ToggleButton value="en">EN</ToggleButton>
              <ToggleButton value="ru">RU</ToggleButton>
            </ToggleButtonGroup>
          </Tooltip>
          <Tooltip title={mode === 'light' ? t('auth.themeDark') : t('auth.themeLight')}>
            <IconButton
              onClick={toggleMode}
              color="primary"
              aria-label={mode === 'light' ? t('auth.themeDark') : t('auth.themeLight')}
            >
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box
            component="img"
            src={logoSrc}
            alt={t('auth.logoAlt')}
            sx={{
              width: { xs: 180, sm: 220 },
              maxWidth: '100%',
              height: 'auto',
              objectFit: 'contain'
            }}
          />
        </Box>
        <Paper elevation={6} sx={{ p: { xs: 4, sm: 5 }, width: '100%', borderRadius: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            {t('auth.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {t('auth.description')}
          </Typography>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                label={t('auth.username')}
                required
                value={formState.username}
                onChange={handleChange('username')}
                autoComplete="username"
              />
              <TextField
                label={t('auth.password')}
                type="password"
                required
                value={formState.password}
                onChange={handleChange('password')}
                autoComplete="current-password"
              />
              <TextField
                label={t('auth.apiUrlLabel')}
                value={formState.apiUrl}
                onChange={handleChange('apiUrl')}
                autoComplete="url"
                placeholder={t('auth.apiUrlPlaceholder')}
                helperText={t('auth.apiUrlHelp')}
              />
              {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
              <Button type="submit" variant="contained" size="large" disabled={mutation.isPending}>
                {mutation.isPending ? t('auth.submitting') : t('auth.submit')}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Stack>
      {showVersionInfo && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Stack spacing={0.5} alignItems="center">
            <MuiLink href={LOGGER_PAGE_URL} target="_blank" rel="noopener noreferrer" underline="hover">
              {LOGGER_PAGE_URL}
            </MuiLink>
            <Typography variant="caption" color="text.secondary">
              {t('navigation.versionLabel', { version: LOGGER_VERSION })}
            </Typography>
          </Stack>
        </Box>
      )}
    </Container>
  );
};
