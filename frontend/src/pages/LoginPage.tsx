import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Stack,
  TextField,
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

export const LoginPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const { t } = useTranslation();
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

  return (
    <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
      <Stack spacing={2} sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Tooltip title={mode === 'light' ? t('auth.themeDark') : t('auth.themeLight')}>
            <IconButton
              onClick={toggleMode}
              color="primary"
              aria-label={mode === 'light' ? t('auth.themeDark') : t('auth.themeLight')}
            >
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
        </Box>
        <Paper elevation={6} sx={{ p: 5, width: '100%', borderRadius: 4 }}>
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
    </Container>
  );
};
