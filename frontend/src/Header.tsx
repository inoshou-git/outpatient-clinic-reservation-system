import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import { AppBar, Toolbar, Typography, Button, Box, Menu, MenuItem } from '@mui/material';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { openReservationForm } = useUI();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  const handleOpenReservationForm = () => {
    openReservationForm(); // 引数なしで呼び出す
    handleMenuClose();
  };

  const handleOpenBlockedSlotForm = () => {
    navigate('/blocked');
    handleMenuClose();
  };

  const handleUserManagement = () => {
    navigate('/users');
    handleMenuClose();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            外来診療予約システム
          </Link>
        </Typography>
        {isAuthenticated ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              color="inherit"
              id="basic-button"
              aria-controls={open ? 'basic-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
              onClick={handleMenuClick}
            >
              {user?.name}様
            </Button>
            <Menu
              id="basic-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              MenuListProps={{
                'aria-labelledby': 'basic-button',
              }}
            >
              {user?.role !== 'viewer' && (
                <MenuItem onClick={handleOpenReservationForm}>新規予約登録</MenuItem>
              )}
              {user?.role !== 'viewer' && (
                <MenuItem onClick={handleOpenBlockedSlotForm}>予約不可設定</MenuItem>
              )}
              {user?.role === 'admin' && (
                <MenuItem onClick={handleUserManagement}>ユーザー管理</MenuItem>
              )}
              {user?.role !== 'viewer' && user?.role !== 'admin' && (
                <MenuItem onClick={() => { navigate('/manual/general'); handleMenuClose(); }}>一般ユーザーマニュアル</MenuItem>
              )}
              {user?.role === 'admin' && (
                <MenuItem onClick={() => { navigate('/manual/admin'); handleMenuClose(); }}>管理者マニュアル</MenuItem>
              )}
              {user?.role === 'viewer' && (
                <MenuItem onClick={() => { navigate('/manual/viewer'); handleMenuClose(); }}>閲覧ユーザーマニュアル</MenuItem>
              )}
              <MenuItem onClick={handleLogout}>ログアウト</MenuItem>
            </Menu>
          </Box>
        ) : (
          <Button color="inherit" component={Link} to="/login">ログイン</Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
