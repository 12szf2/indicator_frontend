import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Alert,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  Tooltip,
  Card,
  CardContent,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import VisibilityIcon from "@mui/icons-material/Visibility";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import { useSelector } from "react-redux";
import { format, parseISO } from "date-fns";
import { hu } from "date-fns/locale";
import {
  useGetLogsQuery,
  useGetLogByIdQuery,
  useDeleteLogsMutation,
  useGetFilteredUsersQuery,
  useGetUsersQuery,
} from "../store/api/apiSlice";
import { selectUserPermissions } from "../store/slices/authSlice";
import { toaster } from "../components/ui/toaster";

// Log level colors
const LOG_LEVEL_COLORS = {
  ERROR: "error",
  WARN: "warning",
  INFO: "info",
  DEBUG: "default",
};

// HTTP method colors
const HTTP_METHOD_COLORS = {
  GET: "success",
  POST: "primary",
  PUT: "warning",
  DELETE: "error",
  PATCH: "info",
};

export default function Logs() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [filters, setFilters] = useState({
    level: "Összes",
    method: "Összes",
    userId: "",
    path: "",
    startDate: "",
    endDate: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteFilters, setDeleteFilters] = useState({
    before: "",
    level: "",
    method: "",
  });

  const { data: userData } = useGetFilteredUsersQuery();

  const { data: users } = useGetUsersQuery();

  useEffect(() => {
    console.log("User Data:", userData);
  }, [userData]);

  const userPermissions = useSelector(selectUserPermissions);

  // Check admin permissions
  const isAdmin = userPermissions?.isAdmin || userPermissions?.isSuperadmin;

  // Query for logs with filters and pagination
  const {
    data: logsData,
    isLoading,
    error,
    refetch,
  } = useGetLogsQuery({
    page: page + 1, // API expects 1-based page
    limit: rowsPerPage,
    // Only include filters that are not "Összes" or empty
    ...(filters.level &&
      filters.level !== "Összes" && { level: filters.level }),
    ...(filters.method &&
      filters.method !== "Összes" && { method: filters.method }),
    ...(filters.userId && { userId: filters.userId }),
    ...(filters.path && { path: filters.path }),
    ...(filters.startDate && { startDate: filters.startDate }),
    ...(filters.endDate && { endDate: filters.endDate }),
  });

  // Query for individual log details
  const { data: selectedLog, isLoading: logDetailsLoading } =
    useGetLogByIdQuery(selectedLogId, {
      skip: !selectedLogId,
    });

  // Delete logs mutation
  const [deleteLogsMutation, { isLoading: isDeleting }] =
    useDeleteLogsMutation();

  // Check if user has admin access
  if (!isAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          <Typography variant="h6">Nincs jogosultság</Typography>
          <Typography>
            Csak adminisztrátori jogosultságokkal rendelkező felhasználók
            férhetnek hozzá a rendszer naplókhoz.
          </Typography>
        </Alert>
      </Box>
    );
  }

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
    setPage(0); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      level: "",
      method: "",
      userId: "",
      path: "",
      startDate: "",
      endDate: "",
    });
    setPage(0);
  };

  const handleDeleteFilterChange = (field, value) => {
    setDeleteFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleRowExpansion = (logId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [logId]: !prev[logId],
    }));
  };

  const hasDeleteCriteria =
    !!deleteFilters.before ||
    !!deleteFilters.level ||
    !!deleteFilters.method;

  const handleDeleteLogs = async () => {
    try {
      await deleteLogsMutation(deleteFilters).unwrap();

      toaster.create({
        title: "Sikeres törlés",
        description: "A naplók sikeresen törölve lettek.",
        status: "success",
        duration: 3000,
      });

      setDeleteDialogOpen(false);
      setDeleteFilters({ before: "", level: "", method: "" });
      refetch();
    } catch (error) {
      toaster.create({
        title: "Hiba a törlés során",
        description:
          error?.data?.message || "Váratlan hiba történt a naplók törlésekor.",
        status: "error",
        duration: 5000,
      });
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), "yyyy.MM.dd HH:mm:ss", {
        locale: hu,
      });
    } catch {
      return dateString;
    }
  };

  const renderLogDetails = (log) => {
    // Extract IP from various possible locations
    const getIpAddress = () => {
      if (log.ip) return log.ip;
      if (log.headers?.host) {
        const host = log.headers.host.split(":")[0];
        if (host !== "localhost") return host;
      }
      return "localhost";
    };

    // Extract User Agent from headers
    const getUserAgent = () => {
      if (log.userAgent) return log.userAgent;
      if (log.user_agent) return log.user_agent;
      if (log.headers?.["sec-ch-ua"]) return log.headers["sec-ch-ua"];
      return "N/A";
    };

    const CodeBlock = ({ title, data, color = "#d4d4d4", isError = false }) => (
      <Box mb={3}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: isError ? 'error.main' : 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
          {title}
        </Typography>
        <Box
          sx={{
            backgroundColor: isError ? "#fff0f0" : "#1e1e1e",
            color: isError ? "#d32f2f" : color,
            p: 2,
            borderRadius: 2,
            overflowX: "auto",
            maxHeight: "300px",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)",
            fontFamily: "monospace",
            fontSize: "0.8rem",
            '&::-webkit-scrollbar': { height: 8, width: 8 },
            '&::-webkit-scrollbar-thumb': { backgroundColor: isError ? '#ffb3b3' : '#555', borderRadius: 4 },
            '&::-webkit-scrollbar-track': { backgroundColor: isError ? '#ffe6e6' : '#2d2d2d', borderRadius: 4 },
          }}
        >
          <pre style={{ margin: 0 }}>
            {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
          </pre>
        </Box>
      </Box>
    );

    const DetailItem = ({ label, value }) => (
      <Box sx={{ display: 'flex', py: 1.5, borderBottom: '1px dashed rgba(0,0,0,0.08)', '&:last-child': { borderBottom: 'none' } }}>
        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: '140px', color: 'text.secondary' }}>
          {label}
        </Typography>
        <Box sx={{ flex: 1, wordBreak: 'break-word' }}>
          {typeof value === 'string' ? (
            <Typography variant="body2">{value}</Typography>
          ) : (
            value
          )}
        </Box>
      </Box>
    );

    return (
      <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: "#fafafa", borderRadius: 3, m: 2, boxShadow: "inset 0 2px 10px rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.05)" }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3, color: 'primary.main' }}>
               Általános információk
            </Typography>
            
            <Box sx={{ bgcolor: 'white', p: 2.5, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)' }}>
              <DetailItem label="Útvonal" value={<Chip size="small" label={log.path || "N/A"} sx={{ fontFamily: 'monospace' }} />} />
              <DetailItem label="IP cím" value={getIpAddress()} />
              <DetailItem label="User Agent" value={getUserAgent()} />
              <DetailItem label="Host" value={log.headers?.host || "N/A"} />
              
              {log.headers?.referer && <DetailItem label="Referer" value={log.headers.referer} />}
              {log.headers?.origin && <DetailItem label="Origin" value={log.headers.origin} />}
              
              {log.user && (
                <DetailItem label="Felhasználó" value={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{log.user.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{log.user.email}</Typography>
                  </Box>
                } />
              )}
              
              {log.duration && (
                <DetailItem label="Időtartam" value={
                  <Chip size="small" label={`${log.duration} ms`} color={log.duration > 1000 ? "warning" : "success"} variant={log.duration > 1000 ? "filled" : "outlined"} />
                } />
              )}
              
              {log.statusCode && (
                <DetailItem label="Státusz kód" value={
                  <Chip size="small" label={log.statusCode} color={log.statusCode >= 400 ? "error" : "success"} />
                } />
              )}
              
              {log.correlationId && <DetailItem label="Korrelációs ID" value={<Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(0,0,0,0.05)', p: 0.5, borderRadius: 1 }}>{log.correlationId}</Typography>} />}
              {log.message && <DetailItem label="Üzenet" value={log.message} />}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={7}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3, color: 'primary.main' }}>
               Adatok & Fejlécek
            </Typography>
            
            {log.query && typeof log.query === "object" && Object.keys(log.query).length > 0 && (
              <CodeBlock title="Query paraméterek" data={log.query} color="#9cdcfe" />
            )}
            
            {log.body && typeof log.body === "object" && Object.keys(log.body).length > 0 && (
              <CodeBlock title="Kérés törzs (Body)" data={log.body} color="#ce9178" />
            )}
            
            {log.headers && typeof log.headers === "object" && Object.keys(log.headers).length > 0 && (
              <CodeBlock title="Fejlécek (Headers)" data={log.headers} color="#4ec9b0" />
            )}
            
            {log.error && (
              <CodeBlock title="Hiba részletei" data={log.error} isError={true} />
            )}
            
            <details style={{ marginTop: '24px', cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', color: '#666', marginBottom: '12px', outline: 'none' }}>
                Fejlesztői nézet (Összes elérhető adat)
              </summary>
              <Box mt={2}>
                <CodeBlock title="Raw JSON" data={log} color="#d4d4d4" />
              </Box>
            </details>
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography 
        variant="h4" 
        gutterBottom
        sx={{
          fontWeight: 800,
          background: "linear-gradient(45deg, #1976d2, #9c27b0)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          mb: 1
        }}
      >
        Rendszer Naplók
      </Typography>

      <Typography variant="body1" color="textSecondary" paragraph>
        Ez az oldal a rendszer összes API hívásának naplóját tartalmazza. Csak
        adminisztrátori jogosultságokkal rendelkező felhasználók férhetnek
        hozzá.
      </Typography>

      {/* Filter Section */}
      <Card sx={{ mb: 4, borderRadius: 3, boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.08)" }}>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">Szűrők</Typography>
            <Box>
              <Button
                startIcon={<FilterListIcon />}
                onClick={() => setShowFilters(!showFilters)}
                variant="outlined"
                sx={{ mr: 1 }}
              >
                {showFilters ? "Szűrők elrejtése" : "Szűrők megjelenítése"}
              </Button>
              <Button
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                variant="outlined"
                sx={{ mr: 1 }}
              >
                Szűrők törlése
              </Button>
            </Box>
          </Box>

          <Collapse in={showFilters}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl size="small">
                  <InputLabel>Szint</InputLabel>
                  <Select
                    value={filters.level}
                    onChange={(e) =>
                      handleFilterChange("level", e.target.value)
                    }
                    label="Szint"
                    defaultValue="Összes"
                  >
                    <MenuItem value="Összes">Összes</MenuItem>
                    <MenuItem value="ERROR">ERROR</MenuItem>
                    <MenuItem value="WARN">WARN</MenuItem>
                    <MenuItem value="INFO">INFO</MenuItem>
                    <MenuItem value="DEBUG">DEBUG</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Metódus</InputLabel>
                  <Select
                    value={filters.method}
                    onChange={(e) =>
                      handleFilterChange("method", e.target.value)
                    }
                    label="Metódus"
                    defaultValue="Összes"
                  >
                    <MenuItem value="Összes">Összes</MenuItem>
                    <MenuItem value="GET">GET</MenuItem>
                    <MenuItem value="POST">POST</MenuItem>
                    <MenuItem value="PUT">PUT</MenuItem>
                    <MenuItem value="DELETE">DELETE</MenuItem>
                    <MenuItem value="PATCH">PATCH</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel id="user-select-label">Felhasználó</InputLabel>
                  <Select
                    labelId="user-select-label"
                    id="user-select"
                    value={filters.userId}
                    placeholder="Válasszon felhasználót"
                    onChange={(e) =>
                      handleFilterChange("userId", e.target.value)
                    }
                    sx={{ minWidth: "250px" }}
                  >
                    {users?.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Útvonal"
                  value={filters.path}
                  onChange={(e) => handleFilterChange("path", e.target.value)}
                  placeholder="pl. /api/v1/users"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Kezdő dátum"
                  type="datetime-local"
                  value={filters.startDate}
                  onChange={(e) =>
                    handleFilterChange("startDate", e.target.value)
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Befejező dátum"
                  type="datetime-local"
                  value={filters.endDate}
                  onChange={(e) =>
                    handleFilterChange("endDate", e.target.value)
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

        {/* Log Deletion Section */}
        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.08)" }}>
          <CardContent>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6">Naplók törlése</Typography>
              <Typography variant="body2" color="text.secondary">
                Csak a megadott feltételeknek megfelelő rekordok kerülnek
                törlésre.
              </Typography>
            </Box>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4} md={3}>
                <TextField
                  fullWidth
                  label="Törlés a megadott dátum előtt"
                  type="datetime-local"
                  size="small"
                  value={deleteFilters.before}
                  onChange={(e) =>
                    handleDeleteFilterChange("before", e.target.value)
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Szint</InputLabel>
                  <Select
                    value={deleteFilters.level}
                    label="Szint"
                    onChange={(e) =>
                      handleDeleteFilterChange("level", e.target.value)
                    }
                  >
                    <MenuItem value="">Összes</MenuItem>
                    <MenuItem value="ERROR">ERROR</MenuItem>
                    <MenuItem value="WARN">WARN</MenuItem>
                    <MenuItem value="INFO">INFO</MenuItem>
                    <MenuItem value="DEBUG">DEBUG</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Módszer</InputLabel>
                  <Select
                    value={deleteFilters.method}
                    label="Módszer"
                    onChange={(e) =>
                      handleDeleteFilterChange("method", e.target.value)
                    }
                  >
                    <MenuItem value="">Összes</MenuItem>
                    <MenuItem value="GET">GET</MenuItem>
                    <MenuItem value="POST">POST</MenuItem>
                    <MenuItem value="PUT">PUT</MenuItem>
                    <MenuItem value="DELETE">DELETE</MenuItem>
                    <MenuItem value="PATCH">PATCH</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={12} md={3}>
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  disabled={!hasDeleteCriteria || isDeleting}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  {isDeleting
                    ? "Törlés folyamatban..."
                    : "Kiválasztott naplók törlése"}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

      {/* Logs Table */}
      <Paper sx={{ borderRadius: 3, boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)", overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)" }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Hiba történt a naplók betöltése során:{" "}
            {error?.data?.message || error.message}
          </Alert>
        )}

        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: "rgba(0,0,0,0.02)" }}>
              <TableRow>
                <TableCell />
                <TableCell>Időpont</TableCell>
                <TableCell>Szint</TableCell>
                <TableCell>Metódus</TableCell>
                <TableCell>Útvonal</TableCell>
                <TableCell>Felhasználó</TableCell>
                <TableCell>IP</TableCell>
                <TableCell>Státusz</TableCell>
                <TableCell>Időtartam</TableCell>
                <TableCell>Műveletek</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    Betöltés...
                  </TableCell>
                </TableRow>
              ) : logsData?.data?.length > 0 ? (
                logsData.data.map((log) => (
                  <React.Fragment key={log.id}>
                    <TableRow>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => toggleRowExpansion(log.id)}
                        >
                          {expandedRows[log.id] ? (
                            <ExpandLessIcon />
                          ) : (
                            <ExpandMoreIcon />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell>{formatDate(log.createdAt)}</TableCell>
                      <TableCell>
                        <Chip
                          label={log.level || "UNKNOWN"}
                          color={LOG_LEVEL_COLORS[log.level] || "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.method || "N/A"}
                          color={HTTP_METHOD_COLORS[log.method] || "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{log.path || "N/A"}</TableCell>
                      <TableCell>
                        {log.user ? (
                          <div>
                            <div style={{ fontWeight: "medium" }}>
                              {log.user.name}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#666" }}>
                              {log.user.email}
                            </div>
                          </div>
                        ) : (
                          log.userId || "N/A"
                        )}
                      </TableCell>
                      <TableCell>{log.ip || "N/A"}</TableCell>
                      <TableCell>
                        {log.statusCode && (
                          <Chip
                            label={log.statusCode}
                            color={log.statusCode >= 400 ? "error" : "success"}
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {log.duration ? `${log.duration}ms` : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Részletek megtekintése">
                          <IconButton
                            size="small"
                            onClick={() => setSelectedLogId(log.id)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        style={{ paddingBottom: 0, paddingTop: 0 }}
                      >
                        <Collapse
                          in={expandedRows[log.id]}
                          timeout="auto"
                          unmountOnExit
                        >
                          {renderLogDetails(log)}
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    Nincs találat a megadott szűrőkkel
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={logsData?.pagination?.total || 0}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[25, 50, 100, 200]}
          labelRowsPerPage="Sorok száma oldalanként:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} / ${count !== -1 ? count : `több mint ${to}`}`
          }
        />
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Naplók törlése</DialogTitle>
        <DialogContent dividers>
          <Typography gutterBottom>
            Biztosan törli a megadott feltételeknek megfelelő naplókat?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Feltételek:
          </Typography>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>
              Dátum: {deleteFilters.before ? formatDate(deleteFilters.before) : "Bármikor"}
            </li>
            <li>Szint: {deleteFilters.level || "Összes"}</li>
            <li>Módszer: {deleteFilters.method || "Összes"}</li>
          </ul>
          <Typography variant="caption" color="text.secondary">
            A művelet nem visszavonható.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Mégsem</Button>
          <Button
            onClick={handleDeleteLogs}
            color="error"
            disabled={isDeleting}
          >
            {isDeleting ? "Törlés..." : "Törlés megerősítése"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Log Details Dialog */}
      <Dialog
        open={!!selectedLogId}
        onClose={() => setSelectedLogId(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Napló részletei</DialogTitle>
        <DialogContent>
          {logDetailsLoading ? (
            <Typography>Betöltés...</Typography>
          ) : selectedLog ? (
            renderLogDetails(selectedLog)
          ) : (
            <Typography>Nem található napló</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedLogId(null)}>Bezárás</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
