export interface ApiErrorInfo {
  status?: number;
  message?: string;
}

export const parseApiError = (error: unknown): ApiErrorInfo => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { status?: unknown; data?: { message?: unknown } } }).response;
    const status = typeof response?.status === 'number' ? response.status : undefined;
    const message = typeof response?.data?.message === 'string' ? response.data.message : undefined;
    return { status, message };
  }

  return {};
};
