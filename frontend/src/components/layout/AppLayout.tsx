import { useMemo } from 'react';
import { AppBar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import FolderIcon from '@mui/icons-material/FolderOutlined';
import AssignmentIcon from '@mui/icons-material/AssignmentOutlined';
import AddCircleIcon from '@mui/icons-material/AddCircleOutline';
import WifiIcon from '@mui/icons-material/WifiTethering';
import TelegramIcon from '@mui/icons-material/Telegram';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import MenuIcon from '@mui/icons-material/MenuOutlined';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useState } from 'react';
import { APP_VERSION } from '../../config';

const drawerWidth = 260;

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
  const [mobileOpen, setMobileOpen] = useState(false);

  const activePath = useMemo(() => {
    if (location.pathname === '/') {
      return '/';
    }
    const item = navigationItems.find((nav) => location.pathname.startsWith(nav.path));
    return item?.path ?? '/';
  }, [location.pathname]);

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          Logger
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navigationItems.map((item) => (
          <ListItemButton
            key={item.path}
            component={RouterLink}
            to={item.path}
            selected={activePath === item.path}
            onClick={() => setMobileOpen(false)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Версия {APP_VERSION}
        </Typography>
      </Box>
    </div>
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
          <IconButton color="inherit" onClick={logout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
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
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};
