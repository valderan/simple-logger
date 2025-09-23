import { Alert, AlertTitle, Box, Button } from '@mui/material';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState = ({ message, onRetry }: ErrorStateProps): JSX.Element => (
  <Box sx={{ py: 4 }}>
    <Alert severity="error" action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Повторить</Button> : null}>
      <AlertTitle>Ошибка</AlertTitle>
      {message}
    </Alert>
  </Box>
);
