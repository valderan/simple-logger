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
import { useTranslation } from '../../hooks/useTranslation';

export interface ProjectDeleteDialogProps {
  open: boolean;
  projectName: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  error?: string | null;
  translationNamespace?: string;
}

export const ProjectDeleteDialog = ({
  open,
  projectName,
  onClose,
  onConfirm,
  isLoading = false,
  error,
  translationNamespace
}: ProjectDeleteDialogProps): JSX.Element => {
  const [confirmation, setConfirmation] = useState('');
  const { t } = useTranslation();
  const namespace = translationNamespace ?? 'projects';

  useEffect(() => {
    if (!open) {
      setConfirmation('');
    }
  }, [open]);

  const canDelete = confirmation.trim() === projectName;
  const title = t(`${namespace}.deleteDialogTitle`);
  const description = t(`${namespace}.deleteDialogDescription`, { name: projectName });
  const inputLabel = t(`${namespace}.deleteDialogLabel`);
  const cancelLabel = t(`${namespace}.deleteDialogCancel`);
  const confirmLabel = isLoading ? t(`${namespace}.deleteDialogConfirming`) : t(`${namespace}.deleteDialogConfirm`);
  const warningText = t(`${namespace}.projectDeletionWarning`);

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <DialogContentText>
          {description}
        </DialogContentText>
        <Typography variant="caption" color="text.secondary">
          {warningText}
        </Typography>
        <TextField
          autoFocus
          label={inputLabel}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          disabled={isLoading}
        />
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={!canDelete || isLoading}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
