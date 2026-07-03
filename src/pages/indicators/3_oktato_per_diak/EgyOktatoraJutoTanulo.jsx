import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Stack,
  Alert,
  Chip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Tabs,
  Tab,
  Container,
  Fade,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import AssessmentIcon from "@mui/icons-material/Assessment";
import BarChartIcon from "@mui/icons-material/BarChart";
import { generateSchoolYears } from "../../../utils/schoolYears";
import {
  useGetAllEgyOktatoraJutoTanuloQuery,
  useAddEgyOktatoraJutoTanuloMutation,
  useUpdateEgyOktatoraJutoTanuloMutation,
  useDeleteEgyOktatoraJutoTanuloMutation,
  useGetAllAlapadatokQuery,
} from "../../../store/api/apiSlice";
import GenericYearlyChart from "../../../components/GenericYearlyChart";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoEgyOktatoraJutoTanulo from "./info_oktato_per_diak";
import TitleEgyOktatoraJutoTanulo from "./title_oktato_per_diak";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

export default function EgyOktatoraJutoTanulo() {
  const schoolYears = generateSchoolYears();

  // API hooks
  const {
    data: apiTeacherRatioData,
    error: fetchError,
    isLoading: isFetching,
  } = useGetAllEgyOktatoraJutoTanuloQuery();

  const { data: schoolsData, isLoading: isLoadingSchools } =
    useGetAllAlapadatokQuery();

  const [addTeacherRatioData, { isLoading: isAdding }] =
    useAddEgyOktatoraJutoTanuloMutation();
  const [updateTeacherRatioData, { isLoading: isUpdating }] =
    useUpdateEgyOktatoraJutoTanuloMutation();
  const [deleteTeacherRatioData, { isLoading: isDeleting }] =
    useDeleteEgyOktatoraJutoTanuloMutation();

  const [teacherRatioData, setTeacherRatioData] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [modifiedIds, setModifiedIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState(0);

  // UI state
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    id: null,
    schoolName: "",
    year: "",
  });
  const [addDialog, setAddDialog] = useState({
    open: false,
    newRecord: {
      alapadatok_id: "",
      selectedSchool: null,
      tanev_kezdete: "",
      tanulok_szama: 0,
      oktatok_szama: 0,
    },
  });

  const handleTabChange = (_event, newValue) => {
    setActiveTab(newValue);
  };

  // Transform and organize API data
  const organizedData = useMemo(() => {
    if (!teacherRatioData || !Array.isArray(teacherRatioData)) {
      return {};
    }

    const organized = {};

    teacherRatioData.forEach((item) => {
      const schoolName = item.alapadatok?.iskola_neve || "Ismeretlen iskola";
      const year = `${item.tanev_kezdete}/${item.tanev_kezdete + 1}`;

      if (!organized[schoolName]) {
        organized[schoolName] = {};
      }

      organized[schoolName][year] = {
        ...item,
        oktato_per_tanulo_arany:
          item.oktatok_szama > 0 && item.tanulok_szama > 0
            ? (item.tanulok_szama / item.oktatok_szama).toFixed(2)
            : 0,
      };
    });

    return organized;
  }, [teacherRatioData]);

  // Load data from API
  useEffect(() => {
    if (apiTeacherRatioData && Array.isArray(apiTeacherRatioData)) {
      setTeacherRatioData(apiTeacherRatioData);
    }
  }, [apiTeacherRatioData]);

  // Handle data changes
  const handleDataChange = (id, field, value) => {
    setTeacherRatioData((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          // Recalculate ratio when either field changes
          if (field === "tanulok_szama" || field === "oktatok_szama") {
            const tanulok =
              field === "tanulok_szama"
                ? parseInt(value) || 0
                : parseInt(item.tanulok_szama) || 0;
            const oktatok =
              field === "oktatok_szama"
                ? parseInt(value) || 0
                : parseInt(item.oktatok_szama) || 0;

            updatedItem.oktato_per_tanulo_arany =
              oktatok > 0 && tanulok > 0 ? (tanulok / oktatok).toFixed(2) : 0;
          }

          return updatedItem;
        }
        return item;
      }),
    );
    setIsModified(true);
    setModifiedIds((prev) => new Set([...prev, id]));
  };

  const handleSave = async () => {
    try {
      const itemsToUpdate = teacherRatioData.filter((item) =>
        modifiedIds.has(item.id),
      );

      for (const item of itemsToUpdate) {
        await updateTeacherRatioData({
          id: item.id,
          tanulok_szama: parseInt(item.tanulok_szama),
          oktatok_szama: parseInt(item.oktatok_szama),
        }).unwrap();
      }

      setIsModified(false);
      setModifiedIds(new Set());

      setNotification({
        open: true,
        message: `Sikeresen mentve: ${itemsToUpdate.length} rekord frissítve`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error saving teacher ratio data:", error);
      setNotification({
        open: true,
        message: `Hiba történt a mentés során: ${error.data?.message || error.message
          }`,
        severity: "error",
      });
    }
  };

  const handleReset = () => {
    if (apiTeacherRatioData) {
      setTeacherRatioData([...apiTeacherRatioData]);
      setIsModified(false);
      setModifiedIds(new Set());
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTeacherRatioData(id).unwrap();

      setTeacherRatioData((prev) => prev.filter((item) => item.id !== id));

      setNotification({
        open: true,
        message: `Sikeresen törölve: ${deleteDialog.schoolName} - ${deleteDialog.year}`,
        severity: "success",
      });

      setDeleteDialog({ open: false, id: null, schoolName: "", year: "" });
    } catch (error) {
      console.error("Error deleting teacher ratio data:", error);
      setNotification({
        open: true,
        message: `Hiba történt a törlés során: ${error.data?.message || error.message
          }`,
        severity: "error",
      });
    }
  };

  const openDeleteDialog = (id, schoolName, year) => {
    setDeleteDialog({ open: true, id, schoolName, year });
  };

  const handleNotificationClose = () => {
    setNotification({ ...notification, open: false });
  };

  const openAddDialog = () => {
    const currentYear = new Date().getFullYear();
    const currentSchoolYear =
      new Date().getMonth() >= 8 ? currentYear : currentYear - 1;

    setAddDialog({
      open: true,
      newRecord: {
        alapadatok_id: "",
        selectedSchool: null,
        tanev_kezdete: currentSchoolYear,
        tanulok_szama: 0,
        oktatok_szama: 0,
      },
    });
  };

  const closeAddDialog = () => {
    setAddDialog({
      open: false,
      newRecord: {
        alapadatok_id: "",
        selectedSchool: null,
        tanev_kezdete: "",
        tanulok_szama: 0,
        oktatok_szama: 0,
      },
    });
  };

  const handleNewRecordChange = (field, value) => {
    setAddDialog((prev) => ({
      ...prev,
      newRecord: { ...prev.newRecord, [field]: value },
    }));
  };

  const handleAddNewRecord = async () => {
    try {
      const newRecord = {
        alapadatok_id:
          addDialog.newRecord.selectedSchool?.id ||
          parseInt(addDialog.newRecord.alapadatok_id),
        tanev_kezdete: parseInt(addDialog.newRecord.tanev_kezdete),
        tanulok_szama: parseInt(addDialog.newRecord.tanulok_szama) || 0,
        oktatok_szama: parseInt(addDialog.newRecord.oktatok_szama) || 0,
      };

      await addTeacherRatioData(newRecord).unwrap();

      setNotification({
        open: true,
        message: `Új oktató/tanuló arány rekord sikeresen hozzáadva: ${addDialog.newRecord.selectedSchool?.iskola_neve || "Ismeretlen iskola"
          } - ${newRecord.tanev_kezdete}/${newRecord.tanev_kezdete + 1}`,
        severity: "success",
      });

      closeAddDialog();
    } catch (error) {
      console.error("Error adding new teacher ratio data:", error);
      setNotification({
        open: true,
        message: `Hiba történt az új rekord hozzáadása során: ${error.data?.message || error.message
          }`,
        severity: "error",
      });
    }
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const stats = {};

    teacherRatioData.forEach((item) => {
      const year = `${item.tanev_kezdete}/${item.tanev_kezdete + 1}`;
      if (!stats[year]) {
        stats[year] = {
          totalTanulok: 0,
          totalOktatok: 0,
          count: 0,
        };
      }
      stats[year].totalTanulok += parseInt(item.tanulok_szama) || 0;
      stats[year].totalOktatok += parseInt(item.oktatok_szama) || 0;
      stats[year].count += 1;
    });

    // Calculate average ratio
    Object.keys(stats).forEach((year) => {
      const yearStats = stats[year];
      yearStats.atlagArany =
        yearStats.totalOktatok > 0
          ? (yearStats.totalTanulok / yearStats.totalOktatok).toFixed(2)
          : 0;
    });

    return stats;
  }, [teacherRatioData]);

  return (
    <PageWrapper
      titleContent={<TitleEgyOktatoraJutoTanulo />}
      infoContent={<InfoEgyOktatoraJutoTanulo />}
    >
      <Box sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mb: 2 }}>
          <ExportDOMTableToExcel
            tableId=".MuiTable-root"
            fileName="egy_oktatora_juto_tanulo"
          />
          <LockStatusIndicator tableName="egy_oktatora_juto_tanulo" />
        </Stack>

        {/* Loading State */}
        <PageLoadingOverlay isLoading={isFetching} />

        {/* Error State */}
        {fetchError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Hiba történt az adatok betöltése során: {fetchError.message}
          </Alert>
        )}

        {/* Summary Statistics */}
        <Card sx={{ mb: 3, backgroundColor: "#f5f5f5" }}>
          <CardContent>
            <Typography variant="h6" component="h3" gutterBottom>
              Összesített statisztikák
            </Typography>
            {Object.keys(summaryStats).length === 0 ? (
              <Box sx={{ textAlign: "center", py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Nincs statisztikai adat megjelenítésre
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell sx={{ fontWeight: "bold" }}>Tanév</TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: "bold", backgroundColor: "#e8f5e8" }}
                      >
                        Összes tanuló (fő)
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: "bold", backgroundColor: "#f0f8ff" }}
                      >
                        Összes oktató (fő)
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: "bold", backgroundColor: "#fff3e0" }}
                      >
                        Átlagos arány (tanuló/oktató)
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: "bold" }}>
                        Intézmények száma
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(summaryStats).map(([year, stats]) => (
                      <TableRow key={year}>
                        <TableCell sx={{ fontWeight: "medium" }}>
                          {year}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ backgroundColor: "#e8f5e840" }}
                        >
                          {stats.totalTanulok}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ backgroundColor: "#f0f8ff40" }}
                        >
                          {stats.totalOktatok}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            backgroundColor: "#fff3e040",
                            fontWeight: "bold",
                            color: "primary.main",
                          }}
                        >
                          {stats.atlagArany}
                        </TableCell>
                        <TableCell align="center">{stats.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <Card sx={{ mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="Oktató-tanuló arány tabs"
              variant="fullWidth"
            >
              <Tab
                icon={<AssessmentIcon />}
                label="Adatok és táblázatok"
                sx={{ fontWeight: "bold", fontSize: "1rem" }}
              />
              <Tab
                icon={<BarChartIcon />}
                label="Grafikon nézet"
                sx={{ fontWeight: "bold", fontSize: "1rem" }}
              />
            </Tabs>
          </Box>
        </Card>

        {/* Tab Content */}
        {activeTab === 0 && (
          <Box>
            {/* Instructions Card */}
            <Card sx={{ mb: 3, backgroundColor: "#f5f5f5" }}>
              <CardContent>
                <Typography variant="h6" component="h3" gutterBottom>
                  Oktató-tanuló arány értelmezése
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>
                    <Typography variant="body2">
                      <strong>Optimális arány:</strong> Általában 15-25 tanuló
                      juthat egy oktatóra a hatékony oktatás érdekében
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2">
                      <strong>Alacsony arány (10 alatt):</strong> Kis
                      csoportméret, intenzívebb figyelem, de nagyobb költség
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2">
                      <strong>Magas arány (30 felett):</strong> Nagy
                      csoportméret, megnövekedett oktató terhelés
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2">
                      <strong>Szakmai képzésben:</strong> A gyakorlati
                      oktatásnál alacsonyabb arány szükséges
                    </Typography>
                  </li>
                </Box>

                <Box
                  sx={{
                    mt: 3,
                    p: 2,
                    backgroundColor: "#fff3e0",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                    <strong>Számítási módszer:</strong>
                    <br />
                    Egy oktatóra jutó tanulók száma = Összes tanuló száma /
                    Összes oktató száma
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Detailed Data by School */}
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  Részletes oktató-tanuló arány adatok iskolák szerint
                </Typography>

                {/* Show empty state if no data */}
                {!teacherRatioData || teacherRatioData.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      gutterBottom
                    >
                      📊 Nincs megjeleníthető adat
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isFetching
                        ? "Adatok betöltése folyamatban..."
                        : "Nincsenek oktató-tanuló arány adatok a kiválasztott időszakra."}
                    </Typography>
                  </Box>
                ) : (
                  Object.entries(organizedData).map(
                    ([schoolName, schoolData]) => (
                      <Accordion key={schoolName} sx={{ mb: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                            {schoolName}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                                  <TableCell sx={{ fontWeight: "bold" }}>
                                    Tanév
                                  </TableCell>
                                  <TableCell
                                    align="center"
                                    sx={{
                                      fontWeight: "bold",
                                      backgroundColor: "#e8f5e8",
                                    }}
                                  >
                                    Tanulók száma (fő)
                                  </TableCell>
                                  <TableCell
                                    align="center"
                                    sx={{
                                      fontWeight: "bold",
                                      backgroundColor: "#f0f8ff",
                                    }}
                                  >
                                    Oktatók száma (fő)
                                  </TableCell>
                                  <TableCell
                                    align="center"
                                    sx={{
                                      fontWeight: "bold",
                                      backgroundColor: "#fff3e0",
                                    }}
                                  >
                                    Egy oktatóra jutó tanulók
                                  </TableCell>
                                  <TableCell
                                    align="center"
                                    sx={{ fontWeight: "bold" }}
                                  >
                                    Műveletek
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {Object.entries(schoolData).map(
                                  ([year, data]) => (
                                    <TableRow key={year}>
                                      <TableCell sx={{ fontWeight: "medium" }}>
                                        {year}
                                      </TableCell>
                                      <TableCell
                                        align="center"
                                        sx={{ backgroundColor: "#e8f5e840" }}
                                      >
                                        <ZeroHidingTextField
                                          type="number"
                                          value={data.tanulok_szama || 0}
                                          onChange={(e) =>
                                            handleDataChange(
                                              data.id,
                                              "tanulok_szama",
                                              e.target.value,
                                            )
                                          }
                                          size="small"
                                          inputProps={{
                                            min: 0,
                                            style: { textAlign: "center" },
                                          }}
                                          sx={{ width: "80px" }}
                                          placeholder="0" />
                                      </TableCell>
                                      <TableCell
                                        align="center"
                                        sx={{ backgroundColor: "#f0f8ff40" }}
                                      >
                                        <ZeroHidingTextField
                                          type="number"
                                          value={data.oktatok_szama || 0}
                                          onChange={(e) =>
                                            handleDataChange(
                                              data.id,
                                              "oktatok_szama",
                                              e.target.value,
                                            )
                                          }
                                          size="small"
                                          inputProps={{
                                            min: 0,
                                            style: { textAlign: "center" },
                                          }}
                                          sx={{ width: "80px" }}
                                          placeholder="0" />
                                      </TableCell>
                                      <TableCell
                                        align="center"
                                        sx={{
                                          backgroundColor: "#fff3e040",
                                          fontWeight: "bold",
                                          color: "primary.main",
                                        }}
                                      >
                                        {data.oktato_per_tanulo_arany}
                                      </TableCell>
                                      <TableCell align="center">
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() =>
                                            openDeleteDialog(
                                              data.id,
                                              schoolName,
                                              year,
                                            )
                                          }
                                          title={`Törlés: ${schoolName} - ${year}`}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </TableCell>
                                    </TableRow>
                                  ),
                                )}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </AccordionDetails>
                      </Accordion>
                    ),
                  )
                )}

                {/* Action Buttons */}
                <Stack direction="row" spacing={2} sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mt: 3 }}>
                  <ExportDOMTableToExcel
                    tableId=".MuiTable-root"
                    fileName="export_adatok"
                  />
                  <LockedTableWrapper tableName="egy_oktatora_juto_tanulo">
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                      disabled={
                        !isModified || isAdding || isUpdating || isDeleting
                      }
                    >
                      {isAdding || isUpdating ? "Mentés..." : "Mentés"}
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => setHistoryOpen(true)}
                      startIcon={<HistoryIcon />}
                      sx={{ ml: 2 }}
                    >
                      Előzmények
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={handleReset}
                      disabled={
                        !isModified || isAdding || isUpdating || isDeleting
                      }
                    >
                      Visszaállítás
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<AddIcon />}
                      onClick={openAddDialog}
                      disabled={isAdding || isUpdating || isDeleting}
                    >
                      Új rekord hozzáadása
                    </Button>
                  </LockedTableWrapper>
                </Stack>

                {/* Status Messages */}
                {isModified && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Mentetlen módosítások vannak. Ne felejtsd el menteni a
                    változtatásokat!
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card sx={{ mt: 3, backgroundColor: "#f5f5f5" }}>
              <CardContent>
                <Typography variant="h6" component="h3" gutterBottom>
                  Jelmagyarázat
                </Typography>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ mb: 2 }}
                  flexWrap="wrap"
                >
                  <Chip
                    label="Tanulók száma"
                    variant="outlined"
                    sx={{ backgroundColor: "#e8f5e8" }}
                  />
                  <Chip
                    label="Oktatók száma"
                    variant="outlined"
                    sx={{ backgroundColor: "#f0f8ff" }}
                  />
                  <Chip
                    label="Oktató-tanuló arány"
                    variant="outlined"
                    sx={{ backgroundColor: "#fff3e0" }}
                  />
                </Stack>
                <Typography variant="body2">
                  A táblázat az oktató-tanuló arányt jeleníti meg iskolák és
                  tanévek szerint. Az arány automatikusan számítódik a tanulók
                  és oktatók száma alapján. Alacsonyabb érték kisebb
                  csoportméretet jelent.
                </Typography>
              </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog
              open={deleteDialog.open}
              onClose={() =>
                setDeleteDialog({
                  open: false,
                  id: null,
                  schoolName: "",
                  year: "",
                })
              }
            >
              <DialogTitle>Törlés megerősítése</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  Biztosan törölni szeretnéd a következő oktató-tanuló arány
                  adatokat?
                  <br />
                  <strong>Iskola:</strong> {deleteDialog.schoolName}
                  <br />
                  <strong>Tanév:</strong> {deleteDialog.year}
                  <br />
                  <br />
                  Ez a művelet nem vonható vissza!
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() =>
                    setDeleteDialog({
                      open: false,
                      id: null,
                      schoolName: "",
                      year: "",
                    })
                  }
                >
                  Mégse
                </Button>
                <Button
                  onClick={() => handleDelete(deleteDialog.id)}
                  color="error"
                  variant="contained"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Törlés..." : "Törlés"}
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}

        {/* Chart Tab Content */}
        {activeTab === 1 && (
          <Box>
            {(() => {
              // Prepare chart data - aggregate by year
              const chartData = schoolYears.map((year) => {
                let totalStudents = 0;
                let totalTeachers = 0;

                // Aggregate data across all schools for this year
                Object.values(organizedData).forEach((schoolData) => {
                  if (schoolData[year]) {
                    totalStudents += schoolData[year].tanulok_szama || 0;
                    totalTeachers += schoolData[year].oktatok_szama || 0;
                  }
                });

                const ratio =
                  totalTeachers > 0 ? totalStudents / totalTeachers : 0;

                return {
                  year: year,
                  studentTeacherRatio: parseFloat(ratio.toFixed(2)),
                  totalStudents: totalStudents,
                  totalTeachers: totalTeachers,
                };
              });

              const chartDataKeys = ["studentTeacherRatio"];
              const chartKeyLabels = {
                studentTeacherRatio: "Egy oktatóra jutó tanulók száma",
              };

              return (
                <GenericYearlyChart
                  data={chartData}
                  dataKeys={chartDataKeys}
                  keyLabels={chartKeyLabels}
                  yAxisLabel="Oktató-tanuló arány"
                  height={450}
                  title="Oktató-tanuló arány alakulása"
                />
              );
            })()}
          </Box>
        )}

        {/* Add New Record Dialog */}
        <Dialog
          open={addDialog.open}
          onClose={closeAddDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Új oktató-tanuló arány rekord hozzáadása</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Iskola *</InputLabel>
                  <Select
                    value={addDialog.newRecord.selectedSchool?.id || ""}
                    label="Iskola *"
                    onChange={(e) => {
                      const selectedSchool = schoolsData?.find(
                        (school) => school.id === e.target.value,
                      );
                      handleNewRecordChange("selectedSchool", selectedSchool);
                      handleNewRecordChange("alapadatok_id", e.target.value);
                    }}
                    disabled={isLoadingSchools}
                    required
                  >
                    {schoolsData?.map((school) => (
                      <MenuItem key={school.id} value={school.id}>
                        {school.iskola_neve}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tanév kezdete</InputLabel>
                  <Select
                    value={addDialog.newRecord.tanev_kezdete}
                    label="Tanév kezdete"
                    onChange={(e) =>
                      handleNewRecordChange("tanev_kezdete", e.target.value)
                    }
                    required
                  >
                    {schoolYears.map((year) => {
                      const startYear = parseInt(year.split("/")[0]);
                      return (
                        <MenuItem key={startYear} value={startYear}>
                          {year}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <ZeroHidingTextField
                  fullWidth
                  label="Tanulók száma (fő)"
                  type="number"
                  value={addDialog.newRecord.tanulok_szama || 0}
                  onChange={(e) =>
                    handleNewRecordChange("tanulok_szama", e.target.value)
                  }
                  inputProps={{ min: 0 }}
                  helperText="Az intézményben tanuló diákok száma"
                  placeholder="0" />
              </Grid>

              <Grid item xs={12} md={6}>
                <ZeroHidingTextField
                  fullWidth
                  label="Oktatók száma (fő)"
                  type="number"
                  value={addDialog.newRecord.oktatok_szama || 0}
                  onChange={(e) =>
                    handleNewRecordChange("oktatok_szama", e.target.value)
                  }
                  inputProps={{ min: 0 }}
                  helperText="Az intézményben dolgozó oktatók száma"
                  placeholder="0" />
              </Grid>

              <Grid item xs={12}>
                <Typography
                  variant="body2"
                  sx={{
                    mt: 2,
                    p: 2,
                    backgroundColor: "#fff3e0",
                    borderRadius: 1,
                  }}
                >
                  <strong>Számított oktató-tanuló arány:</strong>{" "}
                  {addDialog.newRecord.oktatok_szama > 0
                    ? (
                      addDialog.newRecord.tanulok_szama /
                      addDialog.newRecord.oktatok_szama
                    ).toFixed(2)
                    : 0}{" "}
                  tanuló/oktató
                </Typography>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeAddDialog}>Mégse</Button>
            <Button
              onClick={handleAddNewRecord}
              variant="contained"
              color="success"
              disabled={
                !addDialog.newRecord.selectedSchool ||
                !addDialog.newRecord.tanev_kezdete ||
                isAdding
              }
            >
              {isAdding ? "Hozzáadás..." : "Hozzáadás"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleNotificationClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={handleNotificationClose}
            severity={notification.severity}
            sx={{ width: "100%" }}
            action={
              <IconButton
                size="small"
                color="inherit"
                onClick={handleNotificationClose}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>

      <HistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        alapadatokId={selectedSchool?.id}
        tableName="egyOktatoraJutoTanulo"
        onRollbackSuccess={() => {
          setSnackbarMessage("Sikeres visszaállítás az előzményekből!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        }}
      />
    </PageWrapper>
  );
}
