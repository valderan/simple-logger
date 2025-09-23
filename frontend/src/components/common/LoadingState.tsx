import { Box, CircularProgress, Typography } from '@mui/material';

type LoadingStateProps = {
  label?: string;
};

export const LoadingState = ({ label = 'Загрузка данных...' }: LoadingStateProps): JSX.Element => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 5 }}>
    <CircularProgress />
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
  </Box>
);
