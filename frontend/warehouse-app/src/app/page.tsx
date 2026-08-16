'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Alert,
  Snackbar,
  CircularProgress,
  InputAdornment,
  Tooltip,
  Divider,
  Stack,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';

const DRAWER_WIDTH = 240;
const BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `https://${process.env.NEXT_PUBLIC_API_URL}`
  : 'https://lagerverwaltung-api-production.up.railway.app';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#3b82f6', dark: '#1d4ed8', light: '#60a5fa' },
    secondary: { main: '#10b981' },
    background: { default: '#0f172a', paper: '#1e293b' },
    error: { main: '#ef4444' },
  },
  typography: { fontFamily: '"Inter", "Roboto", sans-serif' },
  shape: { borderRadius: 10 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#1e293b',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0f172a',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#0f172a',
            color: '#94a3b8',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
});

interface Product {
  id: number;
  articleNumber: string;
  name: string;
  description: string;
  unitPrice: number;
  stock: number;
  supplier: Supplier | null;
}

interface Supplier {
  id: number;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
}

interface StockMovement {
  id: number;
  product: Product;
  quantity: number;
  movementType: 'IN' | 'OUT';
  date: string;
}

interface AuthState {
  token: string;
  role: string;
  username: string;
}

export default function Home() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [tab, setTab] = useState<'products' | 'suppliers' | 'movements'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [supplierIsEditing, setSupplierIsEditing] = useState(false);
  const [supplierDeleteDialogOpen, setSupplierDeleteDialogOpen] = useState(false);
  const [supplierDeleteId, setSupplierDeleteId] = useState<number | null>(null);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [movementForm, setMovementForm] = useState({ productId: '', quantity: '', type: 'IN' });
  const [supplierForm, setSupplierForm] = useState({ id: 0, companyName: '', contactPerson: '', email: '', phone: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Login state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${auth?.token}`,
  }), [auth]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      if (!res.ok) throw new Error('Invalid username or password');
      const data = await res.json();
      setAuth({ token: data.token, role: data.role || 'EMPLOYEE', username: loginForm.username });
    } catch (e: unknown) {
      setLoginError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/products`, { headers: headers() });
      setProducts(await res.json());
    } catch { showSnackbar('Failed to load products', 'error'); }
    finally { setLoading(false); }
  }, [headers]);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/suppliers`, { headers: headers() });
      setSuppliers(await res.json());
    } catch { showSnackbar('Failed to load suppliers', 'error'); }
    finally { setLoading(false); }
  }, [headers]);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/warehouse/movements`, { headers: headers() });
      setMovements(await res.json());
    } catch { showSnackbar('Failed to load movements', 'error'); }
    finally { setLoading(false); }
  }, [headers]);

  useEffect(() => {
    if (!auth) return;
    if (tab === 'products') fetchProducts();
    else if (tab === 'suppliers') fetchSuppliers();
    else fetchMovements();
  }, [tab, auth, fetchProducts, fetchSuppliers, fetchMovements]);

  const handleSaveProduct = async () => {
    if (!editProduct.supplier) {
      showSnackbar('Supplier is required', 'error');
      return;
    }
    try {
      const url = isEditing ? `${BASE_URL}/api/products/${editProduct.id}` : `${BASE_URL}/api/products`;
      await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: headers(),
        body: JSON.stringify(editProduct),
      });
      showSnackbar(isEditing ? 'Product updated' : 'Product added', 'success');
      setDialogOpen(false);
      fetchProducts();
    } catch { showSnackbar('Operation failed', 'error'); }
  };

  const handleDelete = async () => {
    try {
      await fetch(`${BASE_URL}/api/products/${deleteId}`, { method: 'DELETE', headers: headers() });
      showSnackbar('Product deleted', 'success');
      setDeleteDialogOpen(false);
      fetchProducts();
    } catch { showSnackbar('Delete failed', 'error'); }
  };

  const handleMovement = async () => {
    try {
      await fetch(`${BASE_URL}/api/warehouse/movements?productId=${movementForm.productId}&quantity=${movementForm.quantity}&type=${movementForm.type}`, {
        method: 'POST',
        headers: headers(),
      });
      showSnackbar('Stock movement recorded', 'success');
      setMovementDialogOpen(false);
      fetchMovements();
      fetchProducts();
    } catch { showSnackbar('Operation failed', 'error'); }
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.companyName.trim()) {
      showSnackbar('Company name is required', 'error');
      return;
    }
    try {
      const url = supplierIsEditing
        ? `${BASE_URL}/api/suppliers/${supplierForm.id}`
        : `${BASE_URL}/api/suppliers`;
      await fetch(url, {
        method: supplierIsEditing ? 'PUT' : 'POST',
        headers: headers(),
        body: JSON.stringify(supplierForm),
      });
      showSnackbar(supplierIsEditing ? 'Supplier updated' : 'Supplier added', 'success');
      setSupplierDialogOpen(false);
      setSupplierForm({ id: 0, companyName: '', contactPerson: '', email: '', phone: '' });
      fetchSuppliers();
    } catch { showSnackbar('Operation failed', 'error'); }
  };

  const handleDeleteSupplier = async () => {
    try {
      await fetch(`${BASE_URL}/api/suppliers/${supplierDeleteId}`, { method: 'DELETE', headers: headers() });
      showSnackbar('Supplier deleted', 'success');
      setSupplierDeleteDialogOpen(false);
      fetchSuppliers();
    } catch { showSnackbar('Delete failed', 'error'); }
  };

  const isWarehouseManager = auth?.role === 'ROLE_WAREHOUSE_MANAGER' || auth?.role === 'WAREHOUSE_MANAGER';

  // LOGIN SCREEN
  if (!auth) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Card elevation={0} sx={{
            width: 380,
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 3,
            p: 1,
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                <Box sx={{
                  width: 40, height: 40, borderRadius: 2,
                  bgcolor: 'primary.main',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <WarehouseIcon sx={{ fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
                    Warehouse Management System
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Spring Boot · JWT · Railway
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={2}>
                <TextField
                  label="Username"
                  fullWidth
                  size="small"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment> } }}
                />
                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  size="small"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><LockIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment> } }}
                />

                {loginError && <Alert severity="error" sx={{ borderRadius: 2 }}>{loginError}</Alert>}

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleLogin}
                  disabled={loginLoading}
                  disableElevation
                  sx={{ textTransform: 'none', fontWeight: 600, py: 1.2 }}
                >
                  {loginLoading ? <CircularProgress size={20} color="inherit" /> : 'Login'}
                </Button>
              </Stack>

              <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.06)' }} />

              <Box sx={{ bgcolor: 'rgba(59,130,246,0.08)', borderRadius: 2, p: 2, border: '1px solid rgba(59,130,246,0.15)' }}>
                <Typography variant="caption" color="primary.light" sx={{ fontWeight: 600 }}>Test Users</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                  WAREHOUSE_MANAGER: ENES / 1234
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </ThemeProvider>
    );
  }

  // DASHBOARD
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>

        {/* Sidebar */}
        <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
          <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WarehouseIcon sx={{ fontSize: 18 }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>Warehouse Management</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  {auth.username} · {isWarehouseManager ? 'Warehouse Manager' : 'Employee'}
                </Typography>
              </Box>
            </Box>
          </Box>

          <List sx={{ px: 1, pt: 1.5, flex: 1 }}>
            {[
              { key: 'products', label: 'Products', icon: <InventoryIcon /> },
              { key: 'suppliers', label: 'Suppliers', icon: <LocalShippingIcon /> },
              { key: 'movements', label: 'Stock Movements', icon: <SwapVertIcon /> },
            ].map((item) => (
              <ListItem key={item.key} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={tab === item.key}
                  onClick={() => setTab(item.key as typeof tab)}
                  sx={{
                    borderRadius: 2,
                    color: 'rgba(255,255,255,0.5)',
                    '&.Mui-selected': { bgcolor: 'rgba(59,130,246,0.15)', color: 'primary.light', '& .MuiListItemIcon-root': { color: 'primary.light' } },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', color: 'white' },
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} slotProps={{ primary: { style: { fontSize: '0.875rem', fontWeight: 500 } } }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Button
              fullWidth
              startIcon={<LogoutIcon />}
              onClick={() => setAuth(null)}
              sx={{ textTransform: 'none', color: 'text.secondary', justifyContent: 'flex-start', fontSize: '0.875rem' }}
            >
              Logout
            </Button>
          </Box>
        </Drawer>

        {/* Main */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <AppBar position="sticky" elevation={0}>
            <Toolbar>
              <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700 }}>
                {tab === 'products' ? 'Product Management' : tab === 'suppliers' ? 'Supplier Management' : 'Stock Movements'}
              </Typography>
              <Chip label="● Live · Railway" size="small" sx={{ bgcolor: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '0.7rem' }} />
            </Toolbar>
          </AppBar>

          <Container maxWidth="xl" sx={{ py: 3, flex: 1 }}>
            {/* Toolbar */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'grey.500' }} /></InputAdornment> } }}
                sx={{ width: 280 }}
              />
              <Box sx={{ flex: 1 }} />
              <Tooltip title="Refresh">
                <IconButton onClick={() => tab === 'products' ? fetchProducts() : tab === 'suppliers' ? fetchSuppliers() : fetchMovements()} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              {isWarehouseManager && tab === 'products' && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditProduct({}); setIsEditing(false); fetchSuppliers(); setDialogOpen(true); }} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>
                  New Product
                </Button>
              )}
              {isWarehouseManager && tab === 'suppliers' && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setSupplierIsEditing(false); setSupplierForm({ id: 0, companyName: '', contactPerson: '', email: '', phone: '' }); setSupplierDialogOpen(true); }} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>
                  Add Supplier
                </Button>
              )}
              {isWarehouseManager && tab === 'movements' && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setMovementDialogOpen(true)} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>
                  Record Movement
                </Button>
              )}
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress color="primary" />
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      {tab === 'products' && (
                        <>
                          <TableCell>Product</TableCell>
                          <TableCell>Article Number</TableCell>
                          <TableCell>Price</TableCell>
                          <TableCell>Stock</TableCell>
                          <TableCell>Supplier</TableCell>
                          {isWarehouseManager && <TableCell align="right">Actions</TableCell>}
                        </>
                      )}
                      {tab === 'suppliers' && (
                        <>
                          <TableCell>Company</TableCell>
                          <TableCell>Contact Person</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Phone</TableCell>
                          {isWarehouseManager && <TableCell align="right">Actions</TableCell>}
                        </>
                      )}
                      {tab === 'movements' && (
                        <>
                          <TableCell>Product</TableCell>
                          <TableCell>Movement</TableCell>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Date</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tab === 'products' && products
                      .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.articleNumber.toLowerCase().includes(search.toLowerCase()))
                      .map(p => (
                        <TableRow key={p.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.dark', fontSize: '0.75rem' }}>
                                {p.name[0]}
                              </Avatar>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell><Chip label={p.articleNumber} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)', fontSize: '0.7rem' }} /></TableCell>
                          <TableCell><Typography variant="body2" color="secondary.main" sx={{ fontWeight: 600 }}>{p.unitPrice.toFixed(2)} €</Typography></TableCell>
                          <TableCell>
                            <Chip
                              label={p.stock}
                              size="small"
                              sx={{
                                bgcolor: p.stock < 10 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                                color: p.stock < 10 ? '#f87171' : '#34d399',
                                fontWeight: 700,
                              }}
                            />
                          </TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{p.supplier?.companyName || '-'}</Typography></TableCell>
                          {isWarehouseManager && (
                            <TableCell align="right">
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => { setEditProduct(p); setIsEditing(true); fetchSuppliers(); setDialogOpen(true); }} sx={{ color: 'primary.main' }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" onClick={() => { setDeleteId(p.id); setDeleteDialogOpen(true); }} sx={{ color: 'error.main' }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}

                    {tab === 'suppliers' && suppliers
                      .filter(s => s.companyName.toLowerCase().includes(search.toLowerCase()))
                      .map(s => (
                        <TableRow key={s.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{s.companyName}</Typography></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{s.contactPerson}</Typography></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{s.email}</Typography></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{s.phone}</Typography></TableCell>
                          {isWarehouseManager && (
                            <TableCell align="right">
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => { setSupplierForm({ id: s.id, companyName: s.companyName, contactPerson: s.contactPerson, email: s.email, phone: s.phone }); setSupplierIsEditing(true); setSupplierDialogOpen(true); }} sx={{ color: 'primary.main' }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" onClick={() => { setSupplierDeleteId(s.id); setSupplierDeleteDialogOpen(true); }} sx={{ color: 'error.main' }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}

                    {tab === 'movements' && movements
                      .filter(m => m.product.name.toLowerCase().includes(search.toLowerCase()))
                      .map(m => (
                        <TableRow key={m.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{m.product.name}</Typography></TableCell>
                          <TableCell>
                            <Chip
                              icon={m.movementType === 'IN' ? <TrendingUpIcon sx={{ fontSize: '14px !important' }} /> : <TrendingDownIcon sx={{ fontSize: '14px !important' }} />}
                              label={m.movementType === 'IN' ? 'IN' : 'OUT'}
                              size="small"
                              sx={{
                                bgcolor: m.movementType === 'IN' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                color: m.movementType === 'IN' ? '#34d399' : '#f87171',
                                fontWeight: 600,
                              }}
                            />
                          </TableCell>
                          <TableCell><Typography variant="body2">{m.quantity} pcs</Typography></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{new Date(m.date).toLocaleDateString('en-US')}</Typography></TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Container>
        </Box>

        {/* Product Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>{isEditing ? 'Edit Product' : 'New Product'}</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Article Number" fullWidth size="small" value={editProduct.articleNumber || ''} onChange={(e) => setEditProduct({ ...editProduct, articleNumber: e.target.value })} />
                <TextField label="Product Name" fullWidth size="small" value={editProduct.name || ''} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} />
              </Box>
              <TextField label="Description" fullWidth size="small" value={editProduct.description || ''} onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Unit Price (€)" type="number" fullWidth size="small" value={editProduct.unitPrice || ''} onChange={(e) => setEditProduct({ ...editProduct, unitPrice: parseFloat(e.target.value) })} />
                <TextField label="Stock" type="number" fullWidth size="small" value={editProduct.stock || ''} onChange={(e) => setEditProduct({ ...editProduct, stock: parseInt(e.target.value) })} />
              </Box>
              <FormControl size="small" fullWidth>
                <InputLabel>Supplier</InputLabel>
                <Select
                  value={editProduct.supplier?.id?.toString() || ''}
                  label="Supplier"
                  onChange={(e) => {
                    const selected = suppliers.find(s => s.id === parseInt(e.target.value));
                    setEditProduct({ ...editProduct, supplier: selected || null });
                  }}
                >
                  <MenuItem value="">No Supplier</MenuItem>
                  {suppliers.map(s => (
                    <MenuItem key={s.id} value={s.id.toString()}>{s.companyName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveProduct} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>
              {isEditing ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Product Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Delete Product</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">Are you sure you want to delete this product?</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleDelete} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>Delete</Button>
          </DialogActions>
        </Dialog>

        {/* Stock Movement Dialog */}
        <Dialog open={movementDialogOpen} onClose={() => setMovementDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Record Stock Movement</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Product</InputLabel>
                <Select value={movementForm.productId} label="Product" onChange={(e) => setMovementForm({ ...movementForm, productId: e.target.value })}>
                  {products.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Quantity" type="number" fullWidth size="small" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })} />
              <FormControl size="small" fullWidth>
                <InputLabel>Movement Type</InputLabel>
                <Select value={movementForm.type} label="Movement Type" onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value })}>
                  <MenuItem value="IN">IN (Stock In)</MenuItem>
                  <MenuItem value="OUT">OUT (Stock Out)</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setMovementDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" onClick={handleMovement} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>Save</Button>
          </DialogActions>
        </Dialog>

        {/* Add / Edit Supplier Dialog */}
        <Dialog open={supplierDialogOpen} onClose={() => setSupplierDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>{supplierIsEditing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Company Name *"
                fullWidth
                size="small"
                value={supplierForm.companyName}
                onChange={(e) => setSupplierForm({ ...supplierForm, companyName: e.target.value })}
              />
              <TextField
                label="Contact Person"
                fullWidth
                size="small"
                value={supplierForm.contactPerson}
                onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
              />
              <TextField
                label="Email"
                fullWidth
                size="small"
                value={supplierForm.email}
                onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
              />
              <TextField
                label="Phone"
                fullWidth
                size="small"
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSupplierDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveSupplier} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>
              {supplierIsEditing ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Supplier Dialog */}
        <Dialog open={supplierDeleteDialogOpen} onClose={() => setSupplierDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Delete Supplier</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">Are you sure you want to delete this supplier?</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSupplierDeleteDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleDeleteSupplier} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>Delete</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
