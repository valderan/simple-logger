import { format } from 'date-fns';

export const formatDateTime = (dateString?: string) => {
  if (!dateString) {
    return '—';
  }
  try {
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm:ss');
  } catch (error) {
    return dateString;
  }
};

export const formatRelative = (dateString?: string) => {
  if (!dateString) {
    return 'неизвестно';
  }
  const date = new Date(dateString);
  const diff = Date.now() - date.getTime();
  if (diff < 60 * 1000) {
    return 'только что';
  }
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))} мин назад`;
  }
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))} ч назад`;
  }
  return formatDateTime(dateString);
};
