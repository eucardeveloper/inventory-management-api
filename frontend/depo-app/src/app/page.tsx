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
const BASE_URL = 'https://lagerverwaltung-api-production.up.railway.app';

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

interface Produkt {
  id: number;
  artikelnummer: string;
  name: string;
  beschreibung: string;
  einzelpreis: number;
  bestand: number;
  lieferant: Lieferant | null;
}

interface Lieferant {
  id: number;
  firmenname: string;
  kontaktperson: string;
  email: string;
  telefon: string;
}

interface Lagerbewegung {
  id: number;
  produkt: Produkt;
  menge: number;
  bewegungsart: 'EINGANG' | 'AUSGANG';
  datum: string;
}

interface AuthState {
  token: string;
  rolle: string;
  benutzername: string;
}

export default function Home() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [tab, setTab] = useState<'produkte' | 'lieferanten' | 'bewegungen'>('produkte');
  const [produkte, setProdukte] = useState<Produkt[]>([]);
  const [lieferanten, setLieferanten] = useState<Lieferant[]>([]);
  const [bewegungen, setBewegungen] = useState<Lagerbewegung[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bewegungDialogOpen, setBewegungDialogOpen] = useState(false);
  const [lieferantDialogOpen, setLieferantDialogOpen] = useState(false);
  const [lieferantIsEditing, setLieferantIsEditing] = useState(false);
  const [lieferantDeleteDialogOpen, setLieferantDeleteDialogOpen] = useState(false);
  const [lieferantDeleteId, setLieferantDeleteId] = useState<number | null>(null);
  const [editProdukt, setEditProdukt] = useState<Partial<Produkt>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [bewegungForm, setBewegungForm] = useState({ produktId: '', menge: '', art: 'EINGANG' });
  const [lieferantForm, setLieferantForm] = useState({ id: 0, firmenname: '', kontaktperson: '', email: '', telefon: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Login state
  const [loginForm, setLoginForm] = useState({ benutzername: '', passwort: '' });
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
      const res = await fetch(`${BASE_URL}/api/auth/anmelden`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      if (!res.ok) throw new Error('Hatalı kullanıcı adı veya şifre');
      const data = await res.json();
      setAuth({ token: data.token, rolle: data.rolle || 'MITARBEITER', benutzername: loginForm.benutzername });
    } catch (e: unknown) {
      setLoginError(e instanceof Error ? e.message : 'Giriş başarısız');
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchProdukte = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/produkte`, { headers: headers() });
      setProdukte(await res.json());
    } catch { showSnackbar('Ürünler yüklenemedi', 'error'); }
    finally { setLoading(false); }
  }, [headers]);

  const fetchLieferanten = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/lieferanten`, { headers: headers() });
      setLieferanten(await res.json());
    } catch { showSnackbar('Tedarikçiler yüklenemedi', 'error'); }
    finally { setLoading(false); }
  }, [headers]);

  const fetchBewegungen = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/lager/bewegungen`, { headers: headers() });
      setBewegungen(await res.json());
    } catch { showSnackbar('Hareketler yüklenemedi', 'error'); }
    finally { setLoading(false); }
  }, [headers]);

  useEffect(() => {
    if (!auth) return;
    if (tab === 'produkte') fetchProdukte();
    else if (tab === 'lieferanten') fetchLieferanten();
    else fetchBewegungen();
  }, [tab, auth, fetchProdukte, fetchLieferanten, fetchBewegungen]);

  const handleSaveProdukt = async () => {
    if (!editProdukt.lieferant) {
      showSnackbar('Tedarikçi seçmek zorunludur', 'error');
      return;
    }
    try {
      const url = isEditing ? `${BASE_URL}/api/produkte/${editProdukt.id}` : `${BASE_URL}/api/produkte`;
      await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: headers(),
        body: JSON.stringify(editProdukt),
      });
      showSnackbar(isEditing ? 'Ürün güncellendi' : 'Ürün eklendi', 'success');
      setDialogOpen(false);
      fetchProdukte();
    } catch { showSnackbar('İşlem başarısız', 'error'); }
  };

  const handleDelete = async () => {
    try {
      await fetch(`${BASE_URL}/api/produkte/${deleteId}`, { method: 'DELETE', headers: headers() });
      showSnackbar('Ürün silindi', 'success');
      setDeleteDialogOpen(false);
      fetchProdukte();
    } catch { showSnackbar('Silme başarısız', 'error'); }
  };

  const handleBewegung = async () => {
    try {
      await fetch(`${BASE_URL}/api/lager/bewegungen?produktId=${bewegungForm.produktId}&menge=${bewegungForm.menge}&art=${bewegungForm.art}`, {
        method: 'POST',
        headers: headers(),
      });
      showSnackbar('Stok hareketi kaydedildi', 'success');
      setBewegungDialogOpen(false);
      fetchBewegungen();
      fetchProdukte();
    } catch { showSnackbar('İşlem başarısız', 'error'); }
  };

  const handleSaveLieferant = async () => {
    if (!lieferantForm.firmenname.trim()) {
      showSnackbar('Firma adı zorunludur', 'error');
      return;
    }
    try {
      const url = lieferantIsEditing
        ? `${BASE_URL}/api/lieferanten/${lieferantForm.id}`
        : `${BASE_URL}/api/lieferanten`;
      await fetch(url, {
        method: lieferantIsEditing ? 'PUT' : 'POST',
        headers: headers(),
        body: JSON.stringify(lieferantForm),
      });
      showSnackbar(lieferantIsEditing ? 'Tedarikçi güncellendi' : 'Tedarikçi eklendi', 'success');
      setLieferantDialogOpen(false);
      setLieferantForm({ id: 0, firmenname: '', kontaktperson: '', email: '', telefon: '' });
      fetchLieferanten();
    } catch { showSnackbar('İşlem başarısız', 'error'); }
  };

  const handleDeleteLieferant = async () => {
    try {
      await fetch(`${BASE_URL}/api/lieferanten/${lieferantDeleteId}`, { method: 'DELETE', headers: headers() });
      showSnackbar('Tedarikçi silindi', 'success');
      setLieferantDeleteDialogOpen(false);
      fetchLieferanten();
    } catch { showSnackbar('Silme başarısız', 'error'); }
  };

  const isLagerleiter = auth?.rolle === 'ROLE_LAGERLEITER' || auth?.rolle === 'LAGERLEITER';

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
                    Depo Yönetim Sistemi
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Spring Boot · JWT · Railway
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={2}>
                <TextField
                  label="Kullanıcı Adı"
                  fullWidth
                  size="small"
                  value={loginForm.benutzername}
                  onChange={(e) => setLoginForm({ ...loginForm, benutzername: e.target.value })}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment> } }}
                />
                <TextField
                  label="Şifre"
                  type="password"
                  fullWidth
                  size="small"
                  value={loginForm.passwort}
                  onChange={(e) => setLoginForm({ ...loginForm, passwort: e.target.value })}
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
                  {loginLoading ? <CircularProgress size={20} color="inherit" /> : 'Giriş Yap'}
                </Button>
              </Stack>

              <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.06)' }} />

              <Box sx={{ bgcolor: 'rgba(59,130,246,0.08)', borderRadius: 2, p: 2, border: '1px solid rgba(59,130,246,0.15)' }}>
                <Typography variant="caption" color="primary.light" sx={{ fontWeight: 600 }}>Test Kullanıcıları</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                  LAGERLEITER: ENES / 1234
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
                <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>Depo Yönetimi</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  {auth.benutzername} · {isLagerleiter ? 'Lagerleiter' : 'Mitarbeiter'}
                </Typography>
              </Box>
            </Box>
          </Box>

          <List sx={{ px: 1, pt: 1.5, flex: 1 }}>
            {[
              { key: 'produkte', label: 'Ürünler', icon: <InventoryIcon /> },
              { key: 'lieferanten', label: 'Tedarikçiler', icon: <LocalShippingIcon /> },
              { key: 'bewegungen', label: 'Stok Hareketleri', icon: <SwapVertIcon /> },
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
              Çıkış Yap
            </Button>
          </Box>
        </Drawer>

        {/* Main */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <AppBar position="sticky" elevation={0}>
            <Toolbar>
              <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700 }}>
                {tab === 'produkte' ? 'Ürün Yönetimi' : tab === 'lieferanten' ? 'Tedarikçi Yönetimi' : 'Stok Hareketleri'}
              </Typography>
              <Chip label="● Canlı · Railway" size="small" sx={{ bgcolor: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '0.7rem' }} />
            </Toolbar>
          </AppBar>

          <Container maxWidth="xl" sx={{ py: 3, flex: 1 }}>
            {/* Toolbar */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'grey.500' }} /></InputAdornment> } }}
                sx={{ width: 280 }}
              />
              <Box sx={{ flex: 1 }} />
              <Tooltip title="Yenile">
                <IconButton onClick={() => tab === 'produkte' ? fetchProdukte() : tab === 'lieferanten' ? fetchLieferanten() : fetchBewegungen()} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              {isLagerleiter && tab === 'produkte' && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditProdukt({}); setIsEditing(false); fetchLieferanten(); setDialogOpen(true); }} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>
                  Yeni Ürün
                </Button>
              )}
              {isLagerleiter && tab === 'lieferanten' && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setLieferantIsEditing(false); setLieferantForm({ id: 0, firmenname: '', kontaktperson: '', email: '', telefon: '' }); setLieferantDialogOpen(true); }} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>
                  Tedarikçi Ekle
                </Button>
              )}
              {isLagerleiter && tab === 'bewegungen' && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setBewegungDialogOpen(true)} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>
                  Stok Hareketi
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
                      {tab === 'produkte' && (
                        <>
                          <TableCell>Ürün</TableCell>
                          <TableCell>Artikelnummer</TableCell>
                          <TableCell>Fiyat</TableCell>
                          <TableCell>Stok</TableCell>
                          <TableCell>Tedarikçi</TableCell>
                          {isLagerleiter && <TableCell align="right">İşlemler</TableCell>}
                        </>
                      )}
                      {tab === 'lieferanten' && (
                        <>
                          <TableCell>Firma</TableCell>
                          <TableCell>Yetkili</TableCell>
                          <TableCell>E-posta</TableCell>
                          <TableCell>Telefon</TableCell>
                          {isLagerleiter && <TableCell align="right">İşlemler</TableCell>}
                        </>
                      )}
                      {tab === 'bewegungen' && (
                        <>
                          <TableCell>Ürün</TableCell>
                          <TableCell>Hareket</TableCell>
                          <TableCell>Miktar</TableCell>
                          <TableCell>Tarih</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tab === 'produkte' && produkte
                      .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.artikelnummer.toLowerCase().includes(search.toLowerCase()))
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
                          <TableCell><Chip label={p.artikelnummer} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)', fontSize: '0.7rem' }} /></TableCell>
                          <TableCell><Typography variant="body2" color="secondary.main" sx={{ fontWeight: 600 }}>{p.einzelpreis.toFixed(2)} €</Typography></TableCell>
                          <TableCell>
                            <Chip
                              label={p.bestand}
                              size="small"
                              sx={{
                                bgcolor: p.bestand < 10 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                                color: p.bestand < 10 ? '#f87171' : '#34d399',
                                fontWeight: 700,
                              }}
                            />
                          </TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{p.lieferant?.firmenname || '-'}</Typography></TableCell>
                          {isLagerleiter && (
                            <TableCell align="right">
                              <Tooltip title="Düzenle">
                                <IconButton size="small" onClick={() => { setEditProdukt(p); setIsEditing(true); fetchLieferanten(); setDialogOpen(true); }} sx={{ color: 'primary.main' }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Sil">
                                <IconButton size="small" onClick={() => { setDeleteId(p.id); setDeleteDialogOpen(true); }} sx={{ color: 'error.main' }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}

                    {tab === 'lieferanten' && lieferanten
                      .filter(l => l.firmenname.toLowerCase().includes(search.toLowerCase()))
                      .map(l => (
                        <TableRow key={l.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{l.firmenname}</Typography></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{l.kontaktperson}</Typography></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{l.email}</Typography></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{l.telefon}</Typography></TableCell>
                          {isLagerleiter && (
                            <TableCell align="right">
                              <Tooltip title="Düzenle">
                                <IconButton size="small" onClick={() => { setLieferantForm({ id: l.id, firmenname: l.firmenname, kontaktperson: l.kontaktperson, email: l.email, telefon: l.telefon }); setLieferantIsEditing(true); setLieferantDialogOpen(true); }} sx={{ color: 'primary.main' }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Sil">
                                <IconButton size="small" onClick={() => { setLieferantDeleteId(l.id); setLieferantDeleteDialogOpen(true); }} sx={{ color: 'error.main' }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}

                    {tab === 'bewegungen' && bewegungen
                      .filter(b => b.produkt.name.toLowerCase().includes(search.toLowerCase()))
                      .map(b => (
                        <TableRow key={b.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{b.produkt.name}</Typography></TableCell>
                          <TableCell>
                            <Chip
                              icon={b.bewegungsart === 'EINGANG' ? <TrendingUpIcon sx={{ fontSize: '14px !important' }} /> : <TrendingDownIcon sx={{ fontSize: '14px !important' }} />}
                              label={b.bewegungsart === 'EINGANG' ? 'Giriş' : 'Çıkış'}
                              size="small"
                              sx={{
                                bgcolor: b.bewegungsart === 'EINGANG' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                color: b.bewegungsart === 'EINGANG' ? '#34d399' : '#f87171',
                                fontWeight: 600,
                              }}
                            />
                          </TableCell>
                          <TableCell><Typography variant="body2">{b.menge} adet</Typography></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{new Date(b.datum).toLocaleDateString('tr-TR')}</Typography></TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Container>
        </Box>

        {/* Ürün Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>{isEditing ? 'Ürün Düzenle' : 'Yeni Ürün'}</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Artikelnummer" fullWidth size="small" value={editProdukt.artikelnummer || ''} onChange={(e) => setEditProdukt({ ...editProdukt, artikelnummer: e.target.value })} />
                <TextField label="Ürün Adı" fullWidth size="small" value={editProdukt.name || ''} onChange={(e) => setEditProdukt({ ...editProdukt, name: e.target.value })} />
              </Box>
              <TextField label="Açıklama" fullWidth size="small" value={editProdukt.beschreibung || ''} onChange={(e) => setEditProdukt({ ...editProdukt, beschreibung: e.target.value })} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Fiyat (€)" type="number" fullWidth size="small" value={editProdukt.einzelpreis || ''} onChange={(e) => setEditProdukt({ ...editProdukt, einzelpreis: parseFloat(e.target.value) })} />
                <TextField label="Stok" type="number" fullWidth size="small" value={editProdukt.bestand || ''} onChange={(e) => setEditProdukt({ ...editProdukt, bestand: parseInt(e.target.value) })} />
              </Box>
              <FormControl size="small" fullWidth>
                <InputLabel>Tedarikçi</InputLabel>
                <Select
                  value={editProdukt.lieferant?.id?.toString() || ''}
                  label="Tedarikçi"
                  onChange={(e) => {
                    const secilen = lieferanten.find(l => l.id === parseInt(e.target.value));
                    setEditProdukt({ ...editProdukt, lieferant: secilen || null });
                  }}
                >
                  <MenuItem value="">Tedarikçi Seçme</MenuItem>
                  {lieferanten.map(l => (
                    <MenuItem key={l.id} value={l.id.toString()}>{l.firmenname}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>İptal</Button>
            <Button variant="contained" onClick={handleSaveProdukt} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>
              {isEditing ? 'Güncelle' : 'Ekle'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Ürün Sil</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">Bu ürünü silmek istediğinizden emin misiniz?</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none' }}>İptal</Button>
            <Button variant="contained" color="error" onClick={handleDelete} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>Sil</Button>
          </DialogActions>
        </Dialog>

        {/* Stok Hareketi Dialog */}
        <Dialog open={bewegungDialogOpen} onClose={() => setBewegungDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Stok Hareketi Ekle</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Ürün</InputLabel>
                <Select value={bewegungForm.produktId} label="Ürün" onChange={(e) => setBewegungForm({ ...bewegungForm, produktId: e.target.value })}>
                  {produkte.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Miktar" type="number" fullWidth size="small" value={bewegungForm.menge} onChange={(e) => setBewegungForm({ ...bewegungForm, menge: e.target.value })} />
              <FormControl size="small" fullWidth>
                <InputLabel>Hareket Türü</InputLabel>
                <Select value={bewegungForm.art} label="Hareket Türü" onChange={(e) => setBewegungForm({ ...bewegungForm, art: e.target.value })}>
                  <MenuItem value="EINGANG">Giriş (EINGANG)</MenuItem>
                  <MenuItem value="AUSGANG">Çıkış (AUSGANG)</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setBewegungDialogOpen(false)} sx={{ textTransform: 'none' }}>İptal</Button>
            <Button variant="contained" onClick={handleBewegung} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>Kaydet</Button>
          </DialogActions>
        </Dialog>

        {/* Tedarikçi Ekle / Düzenle Dialog */}
        <Dialog open={lieferantDialogOpen} onClose={() => setLieferantDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>{lieferantIsEditing ? 'Tedarikçi Düzenle' : 'Tedarikçi Ekle'}</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Firma Adı *"
                fullWidth
                size="small"
                value={lieferantForm.firmenname}
                onChange={(e) => setLieferantForm({ ...lieferantForm, firmenname: e.target.value })}
              />
              <TextField
                label="Yetkili Kişi"
                fullWidth
                size="small"
                value={lieferantForm.kontaktperson}
                onChange={(e) => setLieferantForm({ ...lieferantForm, kontaktperson: e.target.value })}
              />
              <TextField
                label="E-posta"
                fullWidth
                size="small"
                value={lieferantForm.email}
                onChange={(e) => setLieferantForm({ ...lieferantForm, email: e.target.value })}
              />
              <TextField
                label="Telefon"
                fullWidth
                size="small"
                value={lieferantForm.telefon}
                onChange={(e) => setLieferantForm({ ...lieferantForm, telefon: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setLieferantDialogOpen(false)} sx={{ textTransform: 'none' }}>İptal</Button>
            <Button variant="contained" onClick={handleSaveLieferant} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>
              {lieferantIsEditing ? 'Güncelle' : 'Ekle'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Tedarikçi Sil Dialog */}
        <Dialog open={lieferantDeleteDialogOpen} onClose={() => setLieferantDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Tedarikçi Sil</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">Bu tedarikçiyi silmek istediğinizden emin misiniz?</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setLieferantDeleteDialogOpen(false)} sx={{ textTransform: 'none' }}>İptal</Button>
            <Button variant="contained" color="error" onClick={handleDeleteLieferant} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>Sil</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}