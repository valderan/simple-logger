import { useMemo, useState } from 'react';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  Stack
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
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../hooks/useThemeMode';
import { APP_VERSION } from '../../config';

const drawerWidth = 260;
const collapsedDrawerWidth = 80;

type NavigationItem = {
  label: string;
  path: string;
  icon: JSX.Element;
};

const navigationItems: NavigationItem[] = [
  { label: 'Дашборд', path: '/', icon: <DashboardIcon /> },
  { label: 'Проекты', path: '/projects', icon: <FolderIcon /> },
  { label: 'Просмотр логов', path: '/logs', icon: <AssignmentIcon /> },
  { label: 'Ping-мониторинг', path: '/ping-services', icon: <WifiIcon /> },
  { label: 'Добавить проект', path: '/projects/new', icon: <AddCircleIcon /> },
  { label: 'Telegram', path: '/telegram', icon: <TelegramIcon /> },
  { label: 'Настройки', path: '/settings', icon: <SettingsIcon /> }
];

export const AppLayout = (): JSX.Element => {
  const location = useLocation();
  const { logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const activePath = useMemo(() => {
    if (location.pathname === '/') {
      return '/';
    }
    const item = navigationItems.find((nav) => location.pathname.startsWith(nav.path));
    return item?.path ?? '/';
  }, [location.pathname]);

  const isDrawerExpanded = !isCollapsed || isHovered;
  const currentDrawerWidth = isDrawerExpanded ? drawerWidth : collapsedDrawerWidth;

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ justifyContent: isDrawerExpanded ? 'flex-start' : 'center' }}>
        {isDrawerExpanded ? (
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Logger
          </Typography>
        ) : (
          <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
            L
          </Typography>
        )}
      </Toolbar>
      <Divider />
      <List>
        {navigationItems.map((item) => {
          const button = (
            <ListItemButton
              key={item.path}
              component={RouterLink}
              to={item.path}
              selected={activePath === item.path}
              onClick={() => setMobileOpen(false)}
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
              {isDrawerExpanded && <ListItemText primary={item.label} />}
            </ListItemButton>
          );
          if (isDrawerExpanded) {
            return button;
          }
          return (
            <Tooltip key={item.path} title={item.label} placement="right">
              <Box component="span" sx={{ display: 'block' }}>
                {button}
              </Box>
            </Tooltip>
          );
        })}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      {isDrawerExpanded && (
        <Box sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Версия {APP_VERSION}
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Панель управления Logger
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title={isCollapsed ? 'Развернуть меню' : 'Свернуть меню'}>
              <span>
                <IconButton
                  color="inherit"
                  onClick={() => setIsCollapsed((prev) => !prev)}
                  sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={mode === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}>
              <IconButton color="inherit" onClick={toggleMode}>
                {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Выйти">
              <IconButton color="inherit" onClick={logout}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Stack>
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
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', sm: 'block' } }}
          PaperProps={{
            onMouseEnter: () => {
              if (isCollapsed) {
                setIsHovered(true);
              }
            },
            onMouseLeave: () => {
              if (isCollapsed) {
                setIsHovered(false);
              }
            },
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
          p: 3,
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
