import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography
} from '@mui/material';

export interface ProjectDeleteDialogProps {
  open: boolean;
  projectName: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export const ProjectDeleteDialog = ({
  open,
  projectName,
  onClose,
  onConfirm,
  isLoading = false,
  error
}: ProjectDeleteDialogProps): JSX.Element => {
  const [confirmation, setConfirmation] = useState('');

  useEffect(() => {
    if (!open) {
      setConfirmation('');
    }
  }, [open]);

  const canDelete = confirmation.trim() === projectName;

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Удалить проект</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <DialogContentText>
          Это действие удалит проект{' '}
          <Typography component="span" fontWeight={600}>
            "{projectName}"
          </Typography>{' '}
          и все связанные логи. Для подтверждения введите полное название проекта.
        </DialogContentText>
        <TextField
          autoFocus
          label="Название проекта"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          disabled={isLoading}
        />
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Отмена
        </Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={!canDelete || isLoading}>
          {isLoading ? 'Удаление...' : 'Удалить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
