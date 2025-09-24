import { PaletteMode } from '@mui/material';
import { createTheme } from '@mui/material/styles';

export const createAppTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: '#0f6efd'
      },
      secondary: {
        main: '#2e7d32'
      },
      background:
        mode === 'light'
          ? {
              default: '#f5f7fa',
              paper: '#ffffff'
            }
          : {
              default: '#0f1117',
              paper: '#161b26'
            },
      divider: mode === 'light' ? undefined : 'rgba(255, 255, 255, 0.12)',
      text:
        mode === 'light'
          ? undefined
          : {
              primary: '#f5f7fa',
              secondary: '#b0b8c4'
            }
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h5: {
        fontWeight: 600
      }
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 10
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16
          }
        }
      }
    }
  });
