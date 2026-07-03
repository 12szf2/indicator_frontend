import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import {
  useGetDualisKepzohelyekQuery,
  useAddDualisKepzohelyekMutation,
  useUpdateDualisKepzohelyekMutation,
  useDeleteDualisKepzohelyekMutation,
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
  IconButton,
  Snackbar,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { generateSchoolYears } from "../../../utils/schoolYears";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import ExportToExcel from "../../../components/ExportToExcel";
import InfoDualisKepzohelyekSzama from "./info_dualis_kepzohelyek_szama";
import TitleDualisKepzohelyekSzama from "./title_dualis_kepzohelyek_szama";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";
export default function DualisKepzohelyekSzama() {
  const schoolYears = useMemo(() => generateSchoolYears(), []);

  const createInitialData = () => ({});

  const selectedSchool = useSelector(selectSelectedSchool);
  const [tableData, setTableData] = useState(createInitialData());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [originalData, setOriginalData] = useState(createInitialData());

  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [newActivityName, setNewActivityName] = useState("");

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const queries = schoolYears.map((yearRange) => {
    const startYear = parseInt(yearRange.split("/")[0]);
    return useGetDualisKepzohelyekQuery(
      { alapadatokId: selectedSchool?.id, tanev: startYear },
      { skip: !selectedSchool },
    );
  });

  const dbData = useMemo(() => {
    return queries.flatMap((query) => query.data || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.map((q) => q.fulfilledTimeStamp).join(","), selectedSchool?.id]);

  const isLoading = useMemo(
    () => queries.some((q) => q.isLoading),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queries.map((q) => q.isLoading).join(",")],
  );
  const isFetching = useMemo(
    () => queries.some((q) => q.isFetching),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queries.map((q) => q.isFetching).join(",")],
  );

  const [addData] = useAddDualisKepzohelyekMutation();
  const [updateData] = useUpdateDualisKepzohelyekMutation();
  const [deleteData] = useDeleteDualisKepzohelyekMutation();

  useEffect(() => {
    if (dbData && !isFetching) {
      const newData = createInitialData();
      const origData = createInitialData();

      if (Array.isArray(dbData)) {
        dbData.forEach((item) => {
          const name = item.kepzohely_neve || "Ismeretlen";
          const yearRange = `${item.tanev_kezdete}/${item.tanev_kezdete + 1}`;

          if (!newData[name]) {
            newData[name] = {};
            schoolYears.forEach((year) => {
              newData[name][year] = {
                egyuttmukodes_formaja: "",
                egyuttmukodes_szama: "",
                egyeb_rendezvenyek: "",
              };
            });
          }

          const yearData = {
            id: item.id,
            egyuttmukodes_formaja: item.egyuttmukodes_formaja || "",
            egyuttmukodes_szama: item.egyuttmukodes_szama || "",
            egyeb_rendezvenyek: item.egyeb_rendezvenyek || "",
          };

          newData[name][yearRange] = { ...yearData };

          if (!origData[name]) origData[name] = {};
          origData[name][yearRange] = { ...yearData };
        });
      }

      setTableData(newData);
      setOriginalData(origData);
      setIsModified(false);
    }
  }, [dbData, isFetching, schoolYears]);

  const handleDataChange = useCallback((name, year, field, value) => {
    setTableData((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        [year]: {
          ...prev[name][year],
          [field]: value,
        },
      },
    }));
    setIsModified(true);
  }, []);

  const handleAddActivity = useCallback(async () => {
    if (!newActivityName || !selectedSchool) return;

    try {
      const availableYears = schoolYears
        .map((year) => parseInt(year.split("/")[0], 10))
        .filter((year) => !Number.isNaN(year));
      const defaultStartYear =
        availableYears.length > 0
          ? Math.max(...availableYears)
          : new Date().getFullYear();

      const recordData = {
        alapadatok_id: selectedSchool.id,
        kepzohely_neve: newActivityName,
        tanev_kezdete: defaultStartYear,
        egyuttmukodes_formaja: "",
        egyuttmukodes_szama: "",
        egyeb_rendezvenyek: "",
      };

      await addData(recordData).unwrap();

      setOpenAddDialog(false);
      setNewActivityName("");
      setSnackbarMessage("Képzőhely sikeresen hozzáadva!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Hiba hozzáadáskor:", error);
      setSnackbarMessage("Hiba történt a hozzáadás során!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [newActivityName, selectedSchool, addData, schoolYears]);

  const handleRemoveActivity = useCallback((name) => {
    setItemToDelete(name);
    setOpenDeleteDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;

    try {
      const promises = [];
      const itemsToRemove = dbData.filter(item => (item.kepzohely_neve || "Ismeretlen") === itemToDelete);

      itemsToRemove.forEach(item => {
        if (item.id) promises.push(deleteData(item.id).unwrap());
      });

      if (promises.length > 0) await Promise.all(promises);

      const updatedData = { ...tableData };
      delete updatedData[itemToDelete];
      setTableData(updatedData);

      const updatedOriginal = { ...originalData };
      delete updatedOriginal[itemToDelete];
      setOriginalData(updatedOriginal);

      setSnackbarMessage("Sikeresen törölve!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setOpenDeleteDialog(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Hiba törlés közben:", error);
      setSnackbarMessage("Hiba történt a törlés során!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [tableData, originalData, deleteData, schoolYears, itemToDelete, dbData]);

  const isFieldModified = (name, year, field) => {
    const orig = originalData[name]?.[year]?.[field] || "";
    const curr = tableData[name]?.[year]?.[field] || "";
    return orig !== curr;
  };

  const isRowModified = (name, year) => {
    return (
      isFieldModified(name, year, "egyuttmukodes_formaja") ||
      isFieldModified(name, year, "egyuttmukodes_szama") ||
      isFieldModified(name, year, "egyeb_rendezvenyek")
    );
  };

  const hasData = (name, year) => {
    return (
      tableData[name]?.[year]?.egyuttmukodes_formaja ||
      tableData[name]?.[year]?.egyuttmukodes_szama ||
      tableData[name]?.[year]?.egyeb_rendezvenyek
    );
  };

  const handleSave = async () => {
    if (!selectedSchool) return;
    setIsSaving(true);
    let updatedCount = 0;
    let savedCount = 0;

    try {
      const promises = [];

      Object.keys(tableData).forEach((name) => {
        schoolYears.forEach((year) => {
          let rowModified = false;
          const isNew = !originalData[name] || !originalData[name][year]?.id;

          if (!isNew) {
            if (isRowModified(name, year)) rowModified = true;
          } else {
            // Ha új és van benne érték
            if (hasData(name, year)) rowModified = true;
          }

          if (rowModified) {
            const yearData = tableData[name][year];
            const id = originalData[name]?.[year]?.id;

            const recordData = {
              alapadatok_id: selectedSchool.id,
              tanev_kezdete: parseInt(year.split("/")[0]),
              kepzohely_neve: name,
              egyuttmukodes_formaja: yearData.egyuttmukodes_formaja || "",
              egyuttmukodes_szama: yearData.egyuttmukodes_szama || "",
              egyeb_rendezvenyek: yearData.egyeb_rendezvenyek || "",
            };

            if (id) {
              promises.push(
                updateData({ id, ...recordData })
                  .unwrap()
                  .then(() => {
                    updatedCount++;
                  }),
              );
            } else {
              promises.push(
                addData(recordData)
                  .unwrap()
                  .then(() => {
                    savedCount++;
                  }),
              );
            }
          }
        });
      });

      if (promises.length > 0) {
        await Promise.all(promises);
        setSnackbarMessage(
          `Sikeresen mentve: ${savedCount} új, ${updatedCount} frissítve`,
        );
        setSnackbarSeverity("success");
      } else {
        setSnackbarMessage("Nem történt módosítás!");
        setSnackbarSeverity("info");
      }
      setSnackbarOpen(true);
      setIsModified(false);
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

  const exportRows = useMemo(() => {
    const rows = [];

    const names = Object.keys(tableData).sort((a, b) =>
      a.localeCompare(b, "hu"),
    );
    names.forEach((name) => {
      const row = { kepzohely: name };
      schoolYears.forEach((year) => {
        row[`${year}__formaja`] =
          tableData[name][year]?.egyuttmukodes_formaja || "";
        row[`${year}__szama`] =
          tableData[name][year]?.egyuttmukodes_szama || "";
        row[`${year}__egyeb`] = tableData[name][year]?.egyeb_rendezvenyek || "";
      });
      rows.push(row);
    });

    return rows;
  }, [tableData, schoolYears]);

  const exportColumns = useMemo(() => {
    const cols = [
      { header: "Duális képzőhely megnevezése", key: "kepzohely", width: 40 },
    ];
    schoolYears.forEach((year) => {
      cols.push({
        header: `${year} - Együttműködés formája`,
        key: `${year}__formaja`,
        width: 25,
      });
      cols.push({
        header: `${year} - Együttműködés száma`,
        key: `${year}__szama`,
        width: 25,
      });
      cols.push({
        header: `${year} - Egyéb rendezvények`,
        key: `${year}__egyeb`,
        width: 35,
      });
    });
    return cols;
  }, [schoolYears]);

  if (isLoading) {
    return <PageLoadingOverlay isLoading={true} />;
  }

  return (
    <PageWrapper
      titleContent={<TitleDualisKepzohelyekSzama />}
      infoContent={<InfoDualisKepzohelyekSzama />}
    >
      <Box>
        <LockStatusIndicator tableName="dualis_kepzohelyek" />

        {!selectedSchool && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Kérjük, válasszon egy intézményt a fenti legördülő menüből az adatok
            szerkesztéséhez és megtekintéséhez.
          </Alert>
        )}

        <Stack direction="row" spacing={2} sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mb: 3 }}>
          <LockedTableWrapper tableName="dualis_kepzohelyek">
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setOpenAddDialog(true)}
              disabled={!selectedSchool}
            >
              Új képzőhely hozzáadása
            </Button>
            <Button
              variant="contained"
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
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleReset}
              disabled={!isModified || isSaving}
            >
              Visszaállítás
            </Button>
          </LockedTableWrapper>
          <ExportToExcel
            fileName="dualis_kepzohelyek"
            sheetName="Duális képzőhelyek"
            columns={exportColumns}
            rows={exportRows}
            buttonLabel="Export Táblázatba"
          />
        </Stack>

        <TableContainer
          component={Paper}
          sx={{ maxWidth: "100%", overflowX: "auto" }}
        >
          <Table
            size="medium"
            sx={{ minWidth: 1000, border: "2px solid #e0e0e0" }}
          >
            <TableHead>
              <TableRow>
                <TableCell
                  rowSpan={2}
                  sx={{
                    fontWeight: "bold",
                    minWidth: 250,
                    borderRight: "2px solid #e0e0e0",
                    borderBottom: "2px solid #e0e0e0",
                    backgroundColor: "#fff",
                    position: "sticky",
                    left: 0,
                    zIndex: 3,
                    verticalAlign: "bottom",
                  }}
                >
                  Duális képzőhely megnevezése
                </TableCell>
                {schoolYears.map((year, i) => (
                  <TableCell
                    key={`${year}-header`}
                    align="center"
                    colSpan={3}
                    sx={{
                      fontWeight: "bold",
                      backgroundColor: "#fff3e0",
                      borderBottom: "2px solid #e0e0e0",
                      borderRight:
                        i === schoolYears.length - 1
                          ? "none"
                          : "2px solid #e0e0e0",
                    }}
                  >
                    {year}
                  </TableCell>
                ))}
                <TableCell
                  rowSpan={2}
                  sx={{
                    fontWeight: "bold",
                    width: 60,
                    borderBottom: "2px solid #e0e0e0",
                    borderLeft: "2px solid #e0e0e0",
                    position: "sticky",
                    right: 0,
                    backgroundColor: "#f5f5f5",
                    zIndex: 3,
                    boxShadow: "-2px 0 5px -2px rgba(0,0,0,0.1)",
                    verticalAlign: "bottom",
                  }}
                >
                  Művelet
                </TableCell>
              </TableRow>
              <TableRow>
                {schoolYears.map((year, i) => (
                  <React.Fragment key={`${year}-subheaders`}>
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        backgroundColor: "#fff3e0",
                        borderBottom: "2px solid #e0e0e0",
                        borderRight: "1px solid #e0e0e0",
                        minWidth: 150,
                      }}
                    >
                      Együttműködés formája
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        backgroundColor: "#fff3e0",
                        borderBottom: "2px solid #e0e0e0",
                        borderRight: "1px solid #e0e0e0",
                        minWidth: 100,
                      }}
                    >
                      Együttműködés száma
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        backgroundColor: "#fff3e0",
                        borderBottom: "2px solid #e0e0e0",
                        borderRight:
                          i === schoolYears.length - 1
                            ? "none"
                            : "2px solid #e0e0e0",
                        minWidth: 200,
                      }}
                    >
                      Egyéb (több duális képzőhelyet érintő) rendezvények
                      felsorolása
                    </TableCell>
                  </React.Fragment>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.keys(tableData).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={schoolYears.length * 3 + 2}
                    align="center"
                    sx={{ py: 3, fontStyle: "italic", color: "text.secondary" }}
                  >
                    Nincs rögzített adat. Kattintson az "Új képzőhely
                    hozzáadása" gombra!
                  </TableCell>
                </TableRow>
              ) : (
                Object.keys(tableData)
                  .sort((a, b) => a.localeCompare(b, "hu"))
                  .map((name) => (
                    <TableRow key={name} hover>
                      <TableCell
                        sx={{
                          borderRight: "2px solid #e0e0e0",
                          borderBottom: "1px solid #e0e0e0",
                          position: "sticky",
                          left: 0,
                          backgroundColor: "#fff",
                          zIndex: 1,
                          fontWeight: 500,
                        }}
                      >
                        {name}
                      </TableCell>
                      {schoolYears.map((year, i) => {
                        const formaja =
                          tableData[name][year]?.egyuttmukodes_formaja || "";
                        const szama =
                          tableData[name][year]?.egyuttmukodes_szama || "";
                        const egyeb =
                          tableData[name][year]?.egyeb_rendezvenyek || "";

                        return (
                          <React.Fragment key={`${year}-inputs`}>
                            <TableCell
                              align="center"
                              sx={{
                                borderBottom: "1px solid #e0e0e0",
                                borderRight: "1px solid #f5f5f5",
                                backgroundColor: isFieldModified(
                                  name,
                                  year,
                                  "egyuttmukodes_formaja",
                                )
                                  ? "#fff9c4"
                                  : "inherit",
                              }}
                            >
                              <ZeroHidingTextField
                                type="text"
                                value={formaja || 0}
                                onChange={(e) =>
                                  handleDataChange(
                                    name,
                                    year,
                                    "egyuttmukodes_formaja",
                                    e.target.value,
                                  )
                                }
                                size="small"
                                placeholder="szakképzési munkaszerződés"
                                inputProps={{ style: { textAlign: "center" } }}
                                sx={{ width: "100%" }}
                                multiline
                                maxRows={3}
                                placeholder="0" />
                            </TableCell>
                            <TableCell
                              align="center"
                              sx={{
                                borderBottom: "1px solid #e0e0e0",
                                borderRight: "1px solid #f5f5f5",
                                backgroundColor: isFieldModified(
                                  name,
                                  year,
                                  "egyuttmukodes_szama",
                                )
                                  ? "#fff9c4"
                                  : "inherit",
                              }}
                            >
                              <ZeroHidingTextField
                                type="text"
                                value={szama || 0}
                                onChange={(e) =>
                                  handleDataChange(
                                    name,
                                    year,
                                    "egyuttmukodes_szama",
                                    e.target.value,
                                  )
                                }
                                size="small"
                                placeholder="10"
                                inputProps={{ style: { textAlign: "center" } }}
                                sx={{ width: "100%" }}
                                placeholder="0" />
                            </TableCell>
                            <TableCell
                              align="center"
                              sx={{
                                borderBottom: "1px solid #e0e0e0",
                                borderRight:
                                  i === schoolYears.length - 1
                                    ? "none"
                                    : "2px solid #e0e0e0",
                                backgroundColor: isFieldModified(
                                  name,
                                  year,
                                  "egyeb_rendezvenyek",
                                )
                                  ? "#fff9c4"
                                  : "inherit",
                              }}
                            >
                              <ZeroHidingTextField
                                type="text"
                                value={egyeb || 0}
                                onChange={(e) =>
                                  handleDataChange(
                                    name,
                                    year,
                                    "egyeb_rendezvenyek",
                                    e.target.value,
                                  )
                                }
                                size="small"
                                placeholder="Skillfest..."
                                inputProps={{ style: { textAlign: "center" } }}
                                sx={{ width: "100%" }}
                                multiline
                                maxRows={3}
                                placeholder="0" />
                            </TableCell>
                          </React.Fragment>
                        );
                      })}
                      <TableCell
                        align="center"
                        sx={{
                          borderLeft: "2px solid #e0e0e0",
                          borderBottom: "1px solid #e0e0e0",
                          position: "sticky",
                          right: 0,
                          backgroundColor: "#fff",
                          boxShadow: "-2px 0 5px -2px rgba(0,0,0,0.1)",
                          zIndex: 1,
                        }}
                      >
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveActivity(name)}
                          disabled={!selectedSchool}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Új tevékenység Dialog */}
        <Dialog
          open={openAddDialog}
          onClose={() => setOpenAddDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Új duális képzőhely hozzáadása</DialogTitle>
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
            >
              <ZeroHidingTextField
                fullWidth
                label="Duális képzőhely megnevezése"
                value={newActivityName || 0}
                onChange={(e) => setNewActivityName(e.target.value)}
                placeholder="Pl. metALCOM Távközlési..."
                autoFocus
                placeholder="0" />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={() => setOpenAddDialog(false)}>Mégse</Button>
            <Button
              variant="contained"
              onClick={handleAddActivity}
              disabled={!newActivityName.trim()}
            >
              Hozzáadás
            </Button>
          </DialogActions>
        </Dialog>

        {/* Törlés Dialog */}
        <Dialog
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
        >
          <DialogTitle>Törlés megerősítése</DialogTitle>
          <DialogContent>
            <Typography>
              Biztosan törölni szeretné a következő képzőhelyet minden évből:{" "}
              <strong>{itemToDelete}</strong>?
            </Typography>
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              Ez a művelet nem vonható vissza, és azonnal törlődik az
              adatbázisból!
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
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
        tableName="dualisKepzohelyek"
        onRollbackSuccess={() => {
          setSnackbarMessage("Sikeres visszaállítás az előzményekből!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        }}
      />
    </PageWrapper>
  );
}
