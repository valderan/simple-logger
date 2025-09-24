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

export const LoginPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => loginRequest(credentials.username, credentials.password),
    onSuccess: (data) => {
      login(data.token);
      navigate('/');
    },
    onError: (error: unknown) => {
      const { status, message } = parseApiError(error);
      if (status === 423) {
        setErrorMessage(message ?? 'IP временно заблокирован.');
        return;
      }
      setErrorMessage(message ?? 'Не удалось выполнить вход');
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (field: 'username' | 'password') => (event: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    mutation.mutate();
  };

  return (
    <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
      <Stack spacing={2} sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Tooltip title={mode === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}>
            <IconButton onClick={toggleMode} color="primary" aria-label="Переключатель темы">
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
        </Box>
        <Paper elevation={6} sx={{ p: 5, width: '100%', borderRadius: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Авторизация Logger
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Введите учетные данные администратора. При пяти неудачных попытках IP блокируется на 1 час.
          </Typography>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                label="Логин"
                required
                value={credentials.username}
                onChange={handleChange('username')}
                autoComplete="username"
              />
              <TextField
                label="Пароль"
                type="password"
                required
                value={credentials.password}
                onChange={handleChange('password')}
                autoComplete="current-password"
              />
              {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
              <Button type="submit" variant="contained" size="large" disabled={mutation.isPending}>
                {mutation.isPending ? 'Вход...' : 'Войти'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Stack>
    </Container>
  );
};
