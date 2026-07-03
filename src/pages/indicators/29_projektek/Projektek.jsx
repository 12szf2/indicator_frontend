import { formatHuNum } from "../../../utils/formatters";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import {
  useGetProjektekQuery,
  useAddProjektekMutation,
  useUpdateProjektekMutation,
  useDeleteProjektekMutation,
  useGetAllAlapadatokQuery,
} from "../../../store/api/apiSlice";
import {
  Box,
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
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Snackbar,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { generateSchoolYears } from "../../../utils/schoolYears";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoProjektek from "./info_projektek";
import TitleProjektek from "./title_projektek";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

export default function Projektek() {
  const schoolYears = useMemo(() => generateSchoolYears(), []);
  const selectedSchool = useSelector(selectSelectedSchool);

  // Alapadatok for szakirany/szakma
  const { data: schoolsData, isLoading: isLoadingSchools } =
    useGetAllAlapadatokQuery();

  const szakmaOptions = useMemo(() => {
    if (!schoolsData || !selectedSchool) return [];
    const relevantSchool = schoolsData.find((s) => s.id === selectedSchool.id);
    if (!relevantSchool || !relevantSchool.alapadatok_szakirany) return [];

    const options = [];
    relevantSchool.alapadatok_szakirany.forEach((sz) => {
      const szakiranyNev = sz.szakirany?.nev;
      if (!szakiranyNev) return;
      if (sz.szakirany?.szakma && Array.isArray(sz.szakirany.szakma)) {
        sz.szakirany.szakma.forEach((szakmaData) => {
          const szakmaNev = szakmaData.szakma?.nev;
          if (szakmaNev) {
            const combined = `${szakiranyNev}: ${szakmaNev}`;
            if (!options.includes(combined)) options.push(combined);
          }
        });
      } else {
        const combined = `${szakiranyNev}`;
        if (!options.includes(combined)) options.push(combined);
      }
    });
    return options.sort();
  }, [schoolsData, selectedSchool]);

  const [addProjekt] = useAddProjektekMutation();
  const [updateProjekt] = useUpdateProjektekMutation();
  const [deleteProjekt] = useDeleteProjektekMutation();

  const {
    data: dbDataRaw,
    isLoading,
    isFetching,
  } = useGetProjektekQuery(
    { alapadatok_id: selectedSchool?.id },
    { skip: !selectedSchool },
  );

  const dbData = useMemo(() => dbDataRaw || [], [dbDataRaw]);

  // State structure: { [yearRange]: [ { id, agazat_szakma, projekthetek_neve, projekthetek_ora, projektnapok_neve, projektnapok_ora }, ... ] }
  const [tableData, setTableData] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [originalData, setOriginalData] = useState({});
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog state
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [selectionType, setSelectionType] = useState("egy"); // "egy" or "több"
  const [selectedSzakmaSingle, setSelectedSzakmaSingle] = useState("");
  const [selectedSzakmaMultiple, setSelectedSzakmaMultiple] = useState([]);

  // Delete Dialog state
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  useEffect(() => {
    if (dbData && !isFetching) {
      const newData = {};
      schoolYears.forEach((y) => {
        newData[y] = [];
      });

      if (Array.isArray(dbData)) {
        dbData.forEach((item) => {
          const yearRange = `${item.tanev_kezdete}/${item.tanev_kezdete + 1}`;
          if (newData[yearRange]) {
            newData[yearRange].push({
              id: item.id,
              agazat_szakma: item.agazat_szakma || "",
              projekthetek_neve: item.projekthetek_neve || "",
              projekthetek_ora: item.projekthetek_ora?.toString() || "",
              projektnapok_neve: item.projektnapok_neve || "",
              projektnapok_ora: item.projektnapok_ora?.toString() || "",
            });
          }
        });
      }

      setTableData(newData);
      setOriginalData(JSON.parse(JSON.stringify(newData)));
      setIsModified(false);
    }
  }, [dbData, isFetching, schoolYears]);

  const handleDataChange = (year, rowIndex, field, value) => {
    setTableData((prev) => {
      const newYearData = [...prev[year]];
      newYearData[rowIndex] = { ...newYearData[rowIndex], [field]: value };
      return { ...prev, [year]: newYearData };
    });
    setIsModified(true);
  };

  const isFieldModified = (year, rowIndex, field) => {
    const orig = originalData[year]?.[rowIndex]?.[field] ?? "";
    const curr = tableData[year]?.[rowIndex]?.[field] ?? "";
    return orig !== curr;
  };

  const handleAddRow = async () => {
    if (!selectedSchool) return;

    let agazat = "";
    if (selectionType === "egy") {
      agazat = selectedSzakmaSingle;
    } else {
      agazat = selectedSzakmaMultiple.join(", ");
    }

    if (!agazat) return;

    try {
      const promises = [];
      schoolYears.forEach((yearRange) => {
        const startYear = parseInt(yearRange.split("/")[0], 10);
        const recordData = {
          alapadatok_id: selectedSchool.id,
          tanev_kezdete: startYear,
          agazat_szakma: agazat,
          projekthetek_neve: "",
          projekthetek_ora: "",
          projektnapok_neve: "",
          projektnapok_ora: "",
        };
        promises.push(addProjekt(recordData).unwrap());
      });

      await Promise.all(promises);

      setSnackbarMessage("Sor sikeresen hozzáadva!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setOpenAddDialog(false);
      setSelectedSzakmaSingle("");
      setSelectedSzakmaMultiple([]);
      // Data will automatically refetch due to invalidatesTags in apiSlice
    } catch (error) {
      console.error("Hiba hozzáadáskor:", error);
      setSnackbarMessage("Hiba történt a hozzáadás során!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleRemoveRow = (year, rowIndex) => {
    setRowToDelete({ year, rowIndex, id: tableData[year][rowIndex].id });
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!rowToDelete) return;

    try {
      if (rowToDelete.id) {
        await deleteProjekt(rowToDelete.id).unwrap();
      }
      setSnackbarMessage("Sikeresen törölve!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setOpenDeleteDialog(false);
      setRowToDelete(null);
    } catch (error) {
      console.error("Hiba törlés közben:", error);
      setSnackbarMessage("Hiba történt a törlés során!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleSave = async () => {
    if (!selectedSchool) return;
    setIsSaving(true);
    let updatedCount = 0;

    try {
      const promises = [];

      schoolYears.forEach((year) => {
        if (!tableData[year]) return;
        tableData[year].forEach((row, index) => {
          if (row.id) {
            const isRowModified = [
              "agazat_szakma",
              "projekthetek_neve",
              "projekthetek_ora",
              "projektnapok_neve",
              "projektnapok_ora",
            ].some((field) => isFieldModified(year, index, field));

            if (isRowModified) {
              const recordData = {
                id: row.id,
                alapadatok_id: selectedSchool.id,
                tanev_kezdete: parseInt(year.split("/")[0], 10),
                agazat_szakma: row.agazat_szakma,
                projekthetek_neve: row.projekthetek_neve,
                projekthetek_ora: row.projekthetek_ora,
                projektnapok_neve: row.projektnapok_neve,
                projektnapok_ora: row.projektnapok_ora,
              };
              promises.push(
                updateProjekt(recordData)
                  .unwrap()
                  .then(() => {
                    updatedCount++;
                  }),
              );
            }
          }
        });
      });

      if (promises.length > 0) {
        await Promise.all(promises);
        setSnackbarMessage(`Sikeresen mentve: ${updatedCount} frissítve`);
        setSnackbarSeverity("success");
      } else {
        setSnackbarMessage("Nem történt módosítás!");
        setSnackbarSeverity("info");
      }
      setSnackbarOpen(true);
      setIsModified(false);

      // Update originalData locally to reflect save
      setOriginalData(JSON.parse(JSON.stringify(tableData)));
    } catch (error) {
      console.error("Hiba mentés közben:", error);
      setSnackbarMessage("Hiba történt a mentés során!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = useCallback(() => {
    setTableData(JSON.parse(JSON.stringify(originalData)));
    setIsModified(false);
  }, [originalData]);

  const parseNumber = (val) => {
    if (!val) return 0;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const calculateTotal = (year) => {
    if (!tableData[year]) return 0;
    return tableData[year].reduce((sum, row) => {
      return (
        sum +
        parseNumber(row.projekthetek_ora) +
        parseNumber(row.projektnapok_ora)
      );
    }, 0);
  };

  if (isLoading || isLoadingSchools) {
    return <PageLoadingOverlay isLoading={true} />;
  }

  const tableHeaderSx = {
    fontWeight: "bold",
    backgroundColor: "#f0f8ff",
    borderBottom: "2px solid #e0e0e0",
  };

  return (
    <PageWrapper
      titleContent={<TitleProjektek />}
      infoContent={<InfoProjektek />}
    >
      <Box sx={{ p: 3 }}>
        <LockStatusIndicator tableName="projektek" />

        {!selectedSchool && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Kérjük, válasszon egy intézményt a fenti legördülő menüből az adatok
            szerkesztéséhez és megtekintéséhez.
          </Alert>
        )}

        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          mb={3}
          sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", }}>
          <ExportDOMTableToExcel
            tableId=".MuiTable-root"
            fileName="projektek_export"
            excludeColumns={[5]}
          />
          <LockedTableWrapper tableName="projektek">
            <Button
              variant="outlined"
              color="info"
              startIcon={<AddIcon />}
              onClick={() => setOpenAddDialog(true)}
              disabled={!selectedSchool}
            >
              Új sor hozzáadása
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RefreshIcon />}
              onClick={handleReset}
              disabled={!isModified || isSaving}
            >
              Visszaállítás
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!isModified || isSaving || !selectedSchool}
            >
              Mentés
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
          </LockedTableWrapper>
        </Stack>

        <TableContainer
          component={Paper}
          sx={{ maxWidth: "100%", overflowX: "auto" }}
        >
          <Table
            size="small"
            sx={{ minWidth: 1000, border: "2px solid #e0e0e0" }}
            className="MuiTable-root"
          >
            {schoolYears.map((year) => {
              const rows = tableData[year] || [];
              return (
                <React.Fragment key={year}>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          backgroundColor: "#fff3e0",
                          borderBottom: "2px solid #e0e0e0",
                          fontSize: "1.1rem",
                          py: 1,
                        }}
                      >
                        {year}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ ...tableHeaderSx, width: "30%" }}>
                        Projektet érintő ágazat/szakma
                      </TableCell>
                      <TableCell sx={{ ...tableHeaderSx, width: "20%" }}>
                        Projekthetek megnevezése
                      </TableCell>
                      <TableCell sx={{ ...tableHeaderSx, width: "15%" }}>
                        Projektben eltöltött órák száma
                      </TableCell>
                      <TableCell sx={{ ...tableHeaderSx, width: "20%" }}>
                        Projektnapok megnevezése
                      </TableCell>
                      <TableCell sx={{ ...tableHeaderSx, width: "15%" }}>
                        Projektben eltöltött órák száma
                      </TableCell>
                      <TableCell
                        sx={{
                          ...tableHeaderSx,
                          width: "60px",
                          textAlign: "center",
                        }}
                      >
                        Művelet
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          align="center"
                          sx={{
                            py: 3,
                            fontStyle: "italic",
                            color: "text.secondary",
                          }}
                        >
                          Nincsenek rögzített projektek a {year} tanévben.
                          Kattintson az "Új sor hozzáadása" gombra.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row, index) => (
                        <TableRow key={row.id || index} hover>
                          <TableCell
                            sx={{
                              borderBottom: "1px solid #f5f5f5",
                              backgroundColor: "#f5f5f5",
                            }}
                          >
                            {formatHuNum(row.agazat_szakma)}
                          </TableCell>
                          <TableCell sx={{ borderBottom: "1px solid #f5f5f5" }}>
                            <ZeroHidingTextField
                              fullWidth
                              size="small"
                              value={row.projekthetek_neve || 0}
                              onChange={(e) =>
                                handleDataChange(
                                  year,
                                  index,
                                  "projekthetek_neve",
                                  e.target.value,
                                )
                              }
                              disabled={!selectedSchool}
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  backgroundColor: isFieldModified(
                                    year,
                                    index,
                                    "projekthetek_neve",
                                  )
                                    ? "#fff9c4"
                                    : "inherit",
                                  transition: "background-color 0.3s ease",
                                },
                              }}
                              placeholder="0" />
                          </TableCell>
                          <TableCell sx={{ borderBottom: "1px solid #f5f5f5" }}>
                            <ZeroHidingTextField
                              fullWidth
                              size="small"
                              value={row.projekthetek_ora || 0}
                              onChange={(e) =>
                                handleDataChange(
                                  year,
                                  index,
                                  "projekthetek_ora",
                                  e.target.value,
                                )
                              }
                              disabled={!selectedSchool}
                              placeholder="Pl. 40"
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  backgroundColor: isFieldModified(
                                    year,
                                    index,
                                    "projekthetek_ora",
                                  )
                                    ? "#fff9c4"
                                    : "inherit",
                                  transition: "background-color 0.3s ease",
                                },
                              }}
                              placeholder="0" />
                          </TableCell>
                          <TableCell sx={{ borderBottom: "1px solid #f5f5f5" }}>
                            <ZeroHidingTextField
                              fullWidth
                              size="small"
                              value={row.projektnapok_neve || 0}
                              onChange={(e) =>
                                handleDataChange(
                                  year,
                                  index,
                                  "projektnapok_neve",
                                  e.target.value,
                                )
                              }
                              disabled={!selectedSchool}
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  backgroundColor: isFieldModified(
                                    year,
                                    index,
                                    "projektnapok_neve",
                                  )
                                    ? "#fff9c4"
                                    : "inherit",
                                  transition: "background-color 0.3s ease",
                                },
                              }}
                              placeholder="0" />
                          </TableCell>
                          <TableCell sx={{ borderBottom: "1px solid #f5f5f5" }}>
                            <ZeroHidingTextField
                              fullWidth
                              size="small"
                              value={row.projektnapok_ora || 0}
                              onChange={(e) =>
                                handleDataChange(
                                  year,
                                  index,
                                  "projektnapok_ora",
                                  e.target.value,
                                )
                              }
                              disabled={!selectedSchool}
                              placeholder="Pl. 16"
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  backgroundColor: isFieldModified(
                                    year,
                                    index,
                                    "projektnapok_ora",
                                  )
                                    ? "#fff9c4"
                                    : "inherit",
                                  transition: "background-color 0.3s ease",
                                },
                              }}
                              placeholder="0" />
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ borderBottom: "1px solid #f5f5f5" }}
                          >
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveRow(year, index)}
                              disabled={!selectedSchool}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {/* Összesítő sor tanévenként */}
                    <TableRow sx={{ backgroundColor: "#ffcdd2" }}>
                      <TableCell
                        colSpan={4}
                        sx={{
                          fontWeight: "bold",
                          textAlign: "right",
                          borderBottom: "2px solid #e0e0e0",
                        }}
                      >
                        Projektekben eltöltött órák száma összesen
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          borderBottom: "2px solid #e0e0e0",
                          fontSize: "1.1rem",
                        }}
                      >
                        {formatHuNum(calculateTotal(year))}
                      </TableCell>
                      <TableCell
                        sx={{ borderBottom: "2px solid #e0e0e0" }}
                      ></TableCell>
                    </TableRow>
                  </TableBody>
                </React.Fragment>
              );
            })}
          </Table>
        </TableContainer>

        {/* Új sor Dialog */}
        <Dialog
          open={openAddDialog}
          onClose={() => setOpenAddDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Új projekt sor felvétele</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Egy vagy több szakirányt/szakmát szeretne felvenni a sorhoz?
              </Typography>
              <RadioGroup
                row
                value={selectionType}
                onChange={(e) => {
                  setSelectionType(e.target.value);
                  setSelectedSzakmaSingle("");
                  setSelectedSzakmaMultiple([]);
                }}
              >
                <FormControlLabel
                  value="egy"
                  control={<Radio />}
                  label="Egyet"
                />
                <FormControlLabel
                  value="több"
                  control={<Radio />}
                  label="Többet"
                />
              </RadioGroup>

              {selectionType === "egy" ? (
                <FormControl fullWidth sx={{ mt: 3 }}>
                  <InputLabel>Szakirány/Szakma</InputLabel>
                  <Select
                    value={selectedSzakmaSingle}
                    onChange={(e) => setSelectedSzakmaSingle(e.target.value)}
                    label="Szakirány/Szakma"
                  >
                    {szakmaOptions.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <FormControl fullWidth sx={{ mt: 3 }}>
                  <InputLabel>Szakirány/Szakma</InputLabel>
                  <Select
                    multiple
                    value={selectedSzakmaMultiple}
                    onChange={(e) => {
                      const { value } = e.target;
                      setSelectedSzakmaMultiple(
                        typeof value === "string" ? value.split(",") : value,
                      );
                    }}
                    input={<OutlinedInput label="Szakirány/Szakma" />}
                    renderValue={(selected) => selected.join(", ")}
                  >
                    {szakmaOptions.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        <Checkbox
                          checked={selectedSzakmaMultiple.indexOf(opt) > -1}
                        />
                        <ListItemText primary={opt} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)}>Mégse</Button>
            <Button
              variant="contained"
              onClick={handleAddRow}
              disabled={
                (selectionType === "egy" && !selectedSzakmaSingle) ||
                (selectionType === "több" &&
                  selectedSzakmaMultiple.length === 0)
              }
            >
              Hozzáadás
            </Button>
          </DialogActions>
        </Dialog>

        {/* Törlés megerősítő Dialog */}
        <Dialog
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
        >
          <DialogTitle>Sor törlése</DialogTitle>
          <DialogContent>
            <Typography>Biztosan törölni szeretné ezt a sort?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteDialog(false)}>Mégse</Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmDelete}
            >
              Törlés
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarSeverity}
            sx={{ width: "100%" }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>

      <HistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        alapadatokId={selectedSchool?.id}
        tableName="projektek"
        onRollbackSuccess={() => {
          setSnackbarMessage("Sikeres visszaállítás az előzményekből!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        }}
      />
    </PageWrapper>
  );
}
