import React, { useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Box,
  Alert,
  Chip,
  Slide
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import { useGetFormHistoryQuery, useRollbackFormHistoryMutation } from '../store/api/apiSlice';
import { useDispatch } from 'react-redux';
import { indicatorApi } from '../store/api/apiSlice';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function HistoryDialog({ open, onClose, alapadatokId, tableName, onRollbackSuccess }) {
  const dispatch = useDispatch();
  const { data: historyList, isLoading, isFetching, isError, refetch } = useGetFormHistoryQuery(
    { alapadatok_id: alapadatokId, table_name: tableName },
    { 
      skip: !open || !alapadatokId || !tableName, 
      refetchOnMountOrArgChange: true,
      pollingInterval: open ? 3000 : 0 
    }
  );

  const [rollbackFormHistory, { isLoading: isRollingBack }] = useRollbackFormHistoryMutation();
  const [errorMsg, setErrorMsg] = React.useState("");
  
  const [activeHistoryId, setActiveHistoryId] = React.useState(null);
  const [lastSeenLatestId, setLastSeenLatestId] = React.useState(null);

  const storageKeyActive = alapadatokId && tableName ? `history_active_${alapadatokId}_${tableName}` : null;
  const storageKeyLatest = alapadatokId && tableName ? `history_latest_${alapadatokId}_${tableName}` : null;

  // Reset states if table changes (reading from localStorage to persist across reloads)
  useEffect(() => {
    if (storageKeyActive && storageKeyLatest) {
      const savedActive = localStorage.getItem(storageKeyActive);
      const savedLatest = localStorage.getItem(storageKeyLatest);
      setActiveHistoryId(savedActive || null);
      setLastSeenLatestId(savedLatest || null);
    } else {
      setActiveHistoryId(null);
      setLastSeenLatestId(null);
    }
  }, [storageKeyActive, storageKeyLatest]);

  // Refetch when dialog opens
  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  // Sort history descending by created_at
  const sortedHistoryList = useMemo(() => {
    if (!historyList) return [];
    return [...historyList].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [historyList]);

  // Smart active state management
  useEffect(() => {
    if (sortedHistoryList.length > 0 && storageKeyActive && storageKeyLatest) {
      const currentLatestId = String(sortedHistoryList[0].id);
      
      // If we see a BRAND NEW record (or it's the first load for this table and we have nothing in localStorage),
      // we reset the active state to this newest record.
      if (currentLatestId !== String(lastSeenLatestId)) {
        setLastSeenLatestId(currentLatestId);
        localStorage.setItem(storageKeyLatest, currentLatestId);
        
        setActiveHistoryId(currentLatestId);
        localStorage.setItem(storageKeyActive, currentLatestId);
      }
    }
  }, [sortedHistoryList, lastSeenLatestId, storageKeyActive, storageKeyLatest]);

  const handleRollback = async (historyId) => {
    if (!window.confirm("Biztosan visszaállítod az adatokat erre az állapotra? A jelenlegi adatok felülíródnak!")) {
      return;
    }
    
    try {
      setErrorMsg("");
      await rollbackFormHistory(historyId).unwrap();
      setActiveHistoryId(String(historyId)); // Update the active history to the restored one
      if (alapadatokId && tableName) {
        localStorage.setItem(`history_active_${alapadatokId}_${tableName}`, String(historyId));
      }
      
      // Invalidate all relevant tags so the UI automatically updates without a page reload
      dispatch(indicatorApi.util.invalidateTags([
        'Alapadatok', 'TanugyiAdatok', 'Kompetencia', 'TanuloLetszam', 'FelvettekSzama', 
        'Alkalmazottak', 'OktatokEgyebTev', 'Elhelyezkedes', 'VegzettekElegedettsege', 
        'Vizsgaeredmenyek', 'SzakmaiVizsgaEredmenyek', 'SzakmaiRendezvenyek', 'SzakkepzesiMunszerzodesArany', 
        'Muhelyiskola', 'Lemorzsolodas', 'NSZFH', 'SZMSZ', 'EgyOktatoraJutoTanulo', 
        'IntezmenyiNeveltsegiMutatok', 'Dobbanto', 'SzakmaiTovabbkepzesek', 'Versenyek', 
        'Elegedettseg', 'ElegedettsegMeres', 'IntezményiElismeresek', 'Palyazatok', 
        'Szervezetfejlesztes', 'DualisKepzohelyek', 'InnovaciosTevekenysegek', 'SzakkepzesZolditese', 
        'DigitalisKompetencia', 'TanulmanyiEredmeny', 'PalyaOrientacio', 'EgyuttmukodesekSzama', 
        'NyelvvizsgakSzama', 'HHesHHHNevelesuTanulok', 'SajatosNevelesuTanulok'
      ]));

      // Optionally refetch history list
      refetch();

      if (onRollbackSuccess) onRollbackSuccess();
    } catch (err) {
      console.error("Visszaállítási hiba:", err);
      setErrorMsg(err?.data?.error || err?.message || "Hiba történt a visszaállítás során.");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 2.5, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default'
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ 
            bgcolor: 'primary.main', 
            color: 'primary.contrastText',
            p: 1, 
            borderRadius: 2,
            display: 'flex'
          }}>
            <HistoryIcon />
          </Box>
          <Typography variant="h5" fontWeight="600">Változásnapló</Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ 
            color: 'text.secondary',
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3, bgcolor: '#f8fafc' }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{errorMsg}</Alert>
        )}

        {isLoading ? (
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={6} gap={2}>
            <CircularProgress size={48} thickness={4} />
            <Typography color="text.secondary">Előzmények betöltése...</Typography>
          </Box>
        ) : isError ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>Hiba történt az előzmények lekérdezésekor.</Alert>
        ) : !sortedHistoryList || sortedHistoryList.length === 0 ? (
          <Box py={8} textAlign="center">
            <HistoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Nincsenek elérhető előzmények
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Ehhez az űrlaphoz még nem történt mentés.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sortedHistoryList.map((item, index) => {
              const isActive = String(item.id) === String(activeHistoryId);
              const isFirst = index === 0;

              return (
                <Box
                  key={item.id}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: '2px solid',
                    borderColor: isActive ? 'success.main' : 'transparent',
                    bgcolor: 'background.paper',
                    boxShadow: isActive ? '0 4px 20px rgba(46, 125, 50, 0.15)' : '0 2px 8px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: 2,
                    transition: 'all 0.2s ease-in-out',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: isActive ? '0 6px 24px rgba(46, 125, 50, 0.2)' : '0 6px 16px rgba(0,0,0,0.1)',
                      borderColor: isActive ? 'success.main' : 'divider',
                    }
                  }}
                >
                  {isActive && (
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        left: 0, 
                        top: 0, 
                        bottom: 0, 
                        width: 6, 
                        bgcolor: 'success.main' 
                      }} 
                    />
                  )}
                  
                  <Box sx={{ pl: isActive ? 2 : 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                      <Typography variant="h6" sx={{ 
                        fontWeight: isActive || isFirst ? 700 : 500,
                        color: isActive ? 'success.dark' : 'text.primary',
                        fontSize: '1.1rem'
                      }}>
                        {formatDate(item.created_at)}
                      </Typography>
                      {isActive && (
                        <Chip 
                          size="small" 
                          color="success" 
                          label={isFirst ? "Aktív Állapot (Legújabb)" : "Aktív Állapot (Visszaállított)"} 
                          sx={{ fontWeight: 'bold' }} 
                        />
                      )}
                      {!isActive && isFirst && (
                        <Chip 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                          label="Legújabb Verzió" 
                          sx={{ fontWeight: 'bold', bgcolor: 'primary.50' }} 
                        />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {isActive 
                        ? isFirst 
                          ? "Ezt az állapotot látod jelenleg, ez a legutoljára mentett verzió."
                          : "Ezt az állapotot látod jelenleg, mert visszaállítottad erre."
                        : isFirst 
                          ? "Ez a legutoljára mentett változat a rendszerben (de nem ez az aktív)." 
                          : "Egy korábbi mentés az adatbázisból."}
                    </Typography>
                  </Box>
                  
                  <Button 
                    variant={isActive ? "contained" : "outlined"} 
                    color={isActive ? "success" : "primary"} 
                    startIcon={!isActive && <RestoreIcon />}
                    onClick={() => handleRollback(item.id)}
                    disabled={isRollingBack || isActive}
                    sx={{ 
                      minWidth: { xs: '100%', sm: 160 },
                      borderRadius: 2,
                      py: 1,
                      fontWeight: 'bold',
                      textTransform: 'none',
                      fontSize: '0.95rem',
                      boxShadow: isActive ? 'none' : undefined
                    }}
                  >
                    {isActive ? "Jelenleg aktív" : "Visszaállítás"}
                  </Button>
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2.5, bgcolor: 'background.default', borderTop: '1px solid', borderColor: 'divider' }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          color="inherit"
          sx={{ 
            borderRadius: 2, 
            px: 3, 
            fontWeight: 'bold',
            color: 'text.secondary',
            borderColor: 'divider',
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          Bezárás
        </Button>
      </DialogActions>
    </Dialog>
  );
}

