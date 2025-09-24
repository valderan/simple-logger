import { Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from '../../hooks/useTranslation';

type LoadingStateProps = {
  label?: string;
};

export const LoadingState = ({ label }: LoadingStateProps): JSX.Element => {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 5 }}>
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        {label ?? t('common.loading')}
      </Typography>
    </Box>
  );
};
