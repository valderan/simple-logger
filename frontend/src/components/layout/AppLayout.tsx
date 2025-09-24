import { useCallback, useMemo, useState } from 'react';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  Link as MuiLink,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  Stack,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import FolderIcon from '@mui/icons-material/FolderOutlined';
import AssignmentIcon from '@mui/icons-material/AssignmentOutlined';
import AddCircleIcon from '@mui/icons-material/AddCircleOutline';
import WifiIcon from '@mui/icons-material/WifiTethering';
import TelegramIcon from '@mui/icons-material/Telegram';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import MenuIcon from '@mui/icons-material/MenuOutlined';
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeIcon from '@mui/icons-material/LightModeOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRightOutlined';
import HelpIcon from '@mui/icons-material/HelpOutline';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../hooks/useThemeMode';
import { LOGGER_PAGE_URL, LOGGER_VERSION } from '../../config';
import { useTranslation } from '../../hooks/useTranslation';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

const drawerWidth = 260;
const collapsedDrawerWidth = 80;
const MENU_COLLAPSED_STORAGE_KEY = 'logger:menuCollapsed';

type NavigationItem = {
  labelKey: string;
  path: string;
  icon: JSX.Element;
};

const baseNavigationItems: NavigationItem[] = [
  { labelKey: 'navigation.dashboard', path: '/', icon: <DashboardIcon /> },
  { labelKey: 'navigation.projects', path: '/projects', icon: <FolderIcon /> },
  { labelKey: 'navigation.logs', path: '/logs', icon: <AssignmentIcon /> },
  { labelKey: 'navigation.ping', path: '/ping-services', icon: <WifiIcon /> },
  { labelKey: 'navigation.addProject', path: '/projects/new', icon: <AddCircleIcon /> },
  { labelKey: 'navigation.telegram', path: '/telegram', icon: <TelegramIcon /> },
  { labelKey: 'navigation.settings', path: '/settings', icon: <SettingsIcon /> },
  { labelKey: 'navigation.faq', path: '/faq', icon: <HelpIcon /> }
];

export const AppLayout = (): JSX.Element => {
  const location = useLocation();
  const { logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(MENU_COLLAPSED_STORAGE_KEY) === 'true';
  });
  const { t, language, setLanguage } = useTranslation();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const mobileDrawerAnchor = isSmallScreen ? 'top' : 'left';
  const handleMobileClose = () => setMobileOpen(false);

  const handleToggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(MENU_COLLAPSED_STORAGE_KEY, next ? 'true' : 'false');
      }

      return next;
    });
  }, []);

  const activePath = useMemo(() => {
    if (location.pathname === '/') {
      return '/';
    }

    return (
      baseNavigationItems
        .filter((nav) => nav.path !== '/')
        .reduce<NavigationItem | undefined>((bestMatch, nav) => {
          if (!location.pathname.startsWith(nav.path)) {
            return bestMatch;
          }

          if (!bestMatch || nav.path.length > bestMatch.path.length) {
            return nav;
          }

          return bestMatch;
        }, undefined)?.path ?? '/' // fallback to dashboard when no match
    );
  }, [location.pathname]);

  const isPermanentDrawer = !isSmallScreen;
  const isDrawerExpanded = isPermanentDrawer ? !isCollapsed : true;
  const currentDrawerWidth = isDrawerExpanded ? drawerWidth : collapsedDrawerWidth;
  const logoSrc = mode === 'light' ? '/logo_light.png' : '/logo_dark.png';

  const desktopControls = (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{
        flexWrap: 'wrap',
        rowGap: 1,
        justifyContent: { xs: 'flex-end', sm: 'flex-start' },
        display: { xs: 'none', sm: 'flex' }
      }}
    >
      <Tooltip title={isCollapsed ? t('navigation.expand') : t('navigation.collapse')}>
        <span>
          <IconButton
            color="inherit"
            onClick={handleToggleCollapsed}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          >
            {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={mode === 'light' ? t('navigation.toggleThemeDark') : t('navigation.toggleThemeLight')}>
        <IconButton color="inherit" onClick={toggleMode}>
          {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton>
      </Tooltip>
      <Tooltip title={t('navigation.language')}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={language}
          onChange={(_, value) => {
            if (value) {
              setLanguage(value);
            }
          }}
          aria-label={t('navigation.language')}
          sx={{
            bgcolor: 'rgba(255,255,255,0.16)',
            borderRadius: 2,
            '& .MuiToggleButton-root': {
              color: 'inherit',
              border: 'none',
              px: 1.5,
              '&.Mui-selected': {
                bgcolor: 'rgba(255,255,255,0.24)'
              }
            }
          }}
        >
          <ToggleButton value="en">EN</ToggleButton>
          <ToggleButton value="ru">RU</ToggleButton>
        </ToggleButtonGroup>
      </Tooltip>
      <Tooltip title={t('navigation.logout')}>
        <IconButton color="inherit" onClick={logout}>
          <LogoutIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  const mobileControls = (
    <Stack spacing={2} alignItems="stretch">
      <Stack direction="row" spacing={1.5} justifyContent="center">
        <Tooltip title={mode === 'light' ? t('navigation.toggleThemeDark') : t('navigation.toggleThemeLight')}>
          <IconButton color="inherit" onClick={toggleMode}>
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title={t('navigation.logout')}>
          <IconButton color="inherit" onClick={logout}>
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      <Tooltip title={t('navigation.language')}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={language}
          onChange={(_, value) => {
            if (value) {
              setLanguage(value);
            }
          }}
          aria-label={t('navigation.language')}
          sx={{
            alignSelf: 'center',
            bgcolor: 'rgba(255,255,255,0.16)',
            borderRadius: 2,
            '& .MuiToggleButton-root': {
              color: 'inherit',
              border: 'none',
              px: 1.5,
              '&.Mui-selected': {
                bgcolor: 'rgba(255,255,255,0.24)'
              }
            }
          }}
        >
          <ToggleButton value="en">EN</ToggleButton>
          <ToggleButton value="ru">RU</ToggleButton>
        </ToggleButtonGroup>
      </Tooltip>
    </Stack>
  );

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ justifyContent: isDrawerExpanded ? 'flex-start' : 'center' }}>
        {isDrawerExpanded ? (
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {t('common.projectName')}
          </Typography>
        ) : (
          <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
            SL
          </Typography>
        )}
      </Toolbar>
      <Divider />
      <List>
        {baseNavigationItems.map((item) => {
          const label = t(item.labelKey);
          const button = (
            <ListItemButton
              key={item.path}
              component={RouterLink}
              to={item.path}
              selected={activePath === item.path}
              onClick={handleMobileClose}
              sx={{
                justifyContent: isDrawerExpanded ? 'flex-start' : 'center',
                px: isDrawerExpanded ? 2 : 1.5
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: isDrawerExpanded ? 40 : 'auto',
                  mr: isDrawerExpanded ? 1.5 : 0,
                  display: 'flex',
                  justifyContent: 'center'
                }}
              >
                {item.icon}
              </ListItemIcon>
              {isDrawerExpanded && <ListItemText primary={label} />}
            </ListItemButton>
          );
          if (isDrawerExpanded) {
            return button;
          }
          return (
            <Tooltip key={item.path} title={label} placement="right">
              <Box component="span" sx={{ display: 'block' }}>
                {button}
              </Box>
            </Tooltip>
          );
        })}
      </List>
      {isSmallScreen && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>{mobileControls}</Box>
        </>
      )}
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      {isDrawerExpanded && (
        <Box sx={{ p: 2 }}>
          <Stack spacing={1.5} alignItems="center" textAlign="center">
            {LOGGER_PAGE_URL ? (
              <MuiLink
                href={LOGGER_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                color="inherit"
                aria-label={t('common.projectName')}
                sx={{ display: 'inline-flex' }}
              >
                <Box
                  component="img"
                  src={logoSrc}
                  alt={t('common.projectName')}
                  sx={{
                    width: '100%',
                    maxWidth: 160,
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block',
                    mx: 'auto'
                  }}
                />
              </MuiLink>
            ) : (
              <Box
                component="img"
                src={logoSrc}
                alt={t('common.projectName')}
                sx={{
                  width: '100%',
                  maxWidth: 160,
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  mx: 'auto'
                }}
              />
            )}
            {LOGGER_VERSION && (
              <Typography variant="caption" color="text.secondary">
                {t('navigation.versionLabel', { version: LOGGER_VERSION })}
              </Typography>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ position: 'relative' }}>
          <IconButton
            color="inherit"
            aria-label={t('navigation.openMenu')}
            onClick={() => setMobileOpen(true)}
            sx={{
              display: { xs: 'flex', sm: 'none' },
              position: { xs: 'absolute', sm: 'static' },
              left: { xs: '50%', sm: 'auto' },
              transform: { xs: 'translateX(-50%)', sm: 'none' }
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: 600, display: { xs: 'none', sm: 'block' } }}
          >
            {t('navigation.appBarTitle')}
          </Typography>
          {desktopControls}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{
          width: { sm: currentDrawerWidth },
          flexShrink: { sm: 0 },
          transition: (theme) => theme.transitions.create('width', { duration: theme.transitions.duration.shorter })
        }}
      >
        <Drawer
          variant="temporary"
          anchor={mobileDrawerAnchor}
          open={mobileOpen}
          onClose={handleMobileClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: mobileDrawerAnchor === 'left' ? drawerWidth : '100%',
              height: mobileDrawerAnchor === 'top' ? 'auto' : '100%',
              maxHeight: mobileDrawerAnchor === 'top' ? '80vh' : undefined
            }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', sm: 'block' } }}
          PaperProps={{
            sx: {
              boxSizing: 'border-box',
              width: currentDrawerWidth,
              overflowX: 'hidden',
              transition: (theme) =>
                theme.transitions.create('width', {
                  duration: theme.transitions.duration.standard
                })
            }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          transition: (theme) => theme.transitions.create('width', { duration: theme.transitions.duration.shorter })
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};
