import { Alert, AlertTitle, Box, Button } from '@mui/material';
import { useTranslation } from '../../hooks/useTranslation';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState = ({ message, onRetry }: ErrorStateProps): JSX.Element => {
  const { t } = useTranslation();
  return (
    <Box sx={{ py: 4 }}>
      <Alert
        severity="error"
        action={
          onRetry ? (
            <Button color="inherit" size="small" onClick={onRetry}>
              {t('common.retry')}
            </Button>
          ) : null
        }
      >
        <AlertTitle>{t('common.error')}</AlertTitle>
        {message}
      </Alert>
    </Box>
  );
};
