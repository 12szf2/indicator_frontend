import { formatHuNum } from "../../../utils/formatters";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import {
  useGetSzakkepzesZolditeseQuery,
  useAddSzakkepzesZolditeseMutation,
  useUpdateSzakkepzesZolditeseMutation,
  useDeleteSzakkepzesZolditeseMutation,
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { generateSchoolYears } from "../../../utils/schoolYears";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoSzakkepzesZolditese from "./info_szakkepzes_zolditese";
import TitleSzakkepzesZolditese from "./title_szakkepzes_zolditese";
import ExportToExcel from "../../../components/ExportToExcel";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

const CATEGORIES = [
  "A szakképzés zöldítéséhez kapcsolódó rendezvény/tevékenység megnevezése",
  "Ökoiskola program keretében megszervezett tevékenységek megnevezése",
];

export default function SzakkepzesZolditese() {
  const schoolYears = useMemo(() => generateSchoolYears(), []);

  const createInitialData = () => ({});

  const selectedSchool = useSelector(selectSelectedSchool);
  const [tableData, setTableData] = useState(createInitialData());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [originalData, setOriginalData] = useState(createInitialData());
  const [allIdsMap, setAllIdsMap] = useState({});

  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [newActivityCategory, setNewActivityCategory] = useState(CATEGORIES[0]);
  const [newActivityName, setNewActivityName] = useState("");

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const queries = schoolYears.map((yearRange) => {
    const startYear = parseInt(yearRange.split("/")[0]);
    return useGetSzakkepzesZolditeseQuery(
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

  const [addData] = useAddSzakkepzesZolditeseMutation();
  const [updateData] = useUpdateSzakkepzesZolditeseMutation();
  const [deleteData] = useDeleteSzakkepzesZolditeseMutation();

  useEffect(() => {
    if (dbData && !isFetching) {
      const newData = createInitialData();
      const origData = createInitialData();
      const idsMap = {};

      if (Array.isArray(dbData)) {
        dbData.forEach((item) => {
          const category = item.kategoria || CATEGORIES[0];
          const name = item.tevekenyseg_neve || "Ismeretlen";
          const key = `${category}::${name}`;
          const yearRange = `${item.tanev_kezdete}/${item.tanev_kezdete + 1}`;

          // Collect all IDs for this key (handles duplicates)
          if (!idsMap[key]) idsMap[key] = [];
          if (item.id) idsMap[key].push(item.id);

          if (!newData[key]) {
            newData[key] = {};
            schoolYears.forEach((year) => {
              newData[key][year] = { resztvevok_szama: "" };
            });
          }

          const yearData = {
            id: item.id,
            resztvevok_szama: item.resztvevok_szama || "",
          };

          newData[key][yearRange] = { ...yearData };

          if (!origData[key]) origData[key] = {};
          origData[key][yearRange] = { ...yearData };
        });
      }

      setTableData(newData);
      setOriginalData(origData);
      setAllIdsMap(idsMap);
      setIsModified(false);
    }
  }, [dbData, isFetching, schoolYears]);

  const handleDataChange = useCallback((key, year, value) => {
    setTableData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [year]: {
          ...prev[key][year],
          resztvevok_szama: value,
        },
      },
    }));
    setIsModified(true);
  }, []);

  const handleAddActivity = useCallback(async () => {
    if (!newActivityName || !newActivityCategory || !selectedSchool) return;

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
        kategoria: newActivityCategory,
        tevekenyseg_neve: newActivityName,
        tanev_kezdete: defaultStartYear,
        resztvevok_szama: "",
      };

      await addData(recordData).unwrap();

      setOpenAddDialog(false);
      setNewActivityName("");
      setNewActivityCategory(CATEGORIES[0]);
      setSnackbarMessage("Tevékenység sikeresen hozzáadva!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Hiba hozzáadáskor:", error);
      setSnackbarMessage("Hiba történt a hozzáadás során!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [
    newActivityCategory,
    newActivityName,
    selectedSchool,
    addData,
    schoolYears,
  ]);

  const handleRemoveActivity = useCallback((key) => {
    setItemToDelete(key);
    setOpenDeleteDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;

    try {
      // Delete all IDs associated with this key (including duplicates)
      const idsToDelete = allIdsMap[itemToDelete] || [];
      const promises = idsToDelete.map((id) => deleteData(id).unwrap());
      if (promises.length > 0) await Promise.all(promises);

      const updatedData = { ...tableData };
      delete updatedData[itemToDelete];
      setTableData(updatedData);

      const updatedOriginal = { ...originalData };
      delete updatedOriginal[itemToDelete];
      setOriginalData(updatedOriginal);

      const updatedIdsMap = { ...allIdsMap };
      delete updatedIdsMap[itemToDelete];
      setAllIdsMap(updatedIdsMap);

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
  }, [tableData, originalData, allIdsMap, deleteData, itemToDelete]);

  const isFieldModified = (key, year) => {
    const orig = originalData[key]?.[year]?.resztvevok_szama || "";
    const curr = tableData[key]?.[year]?.resztvevok_szama || "";
    return orig !== curr;
  };

  const handleSave = async () => {
    if (!selectedSchool) return;
    setIsSaving(true);
    let updatedCount = 0;
    let savedCount = 0;

    try {
      const promises = [];

      Object.keys(tableData).forEach((key) => {
        const [category, name] = key.split("::");

        schoolYears.forEach((year) => {
          let rowModified = false;
          const isNew = !originalData[key];

          if (!isNew) {
            if (isFieldModified(key, year)) rowModified = true;
          } else {
            if (tableData[key][year]?.resztvevok_szama) rowModified = true;
          }

          if (rowModified) {
            const yearData = tableData[key][year];
            const id = originalData[key]?.[year]?.id;

            const recordData = {
              alapadatok_id: selectedSchool.id,
              tanev_kezdete: parseInt(year.split("/")[0]),
              resztvevok_szama: yearData.resztvevok_szama || "",
              kategoria: category,
              tevekenyseg_neve: name,
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

  const sortedKeys = useMemo(() => {
    return Object.keys(tableData).sort((a, b) => {
      const [catA, nameA] = a.split("::");
      const [catB, nameB] = b.split("::");
      if (catA !== catB) return catA.localeCompare(catB, "hu");
      return nameA.localeCompare(nameB, "hu");
    });
  }, [tableData]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    sortedKeys.forEach((key) => {
      const cat = key.split("::")[0];
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [sortedKeys]);

  const exportRows = useMemo(() => {
    const rows = [];
    sortedKeys.forEach((key) => {
      const [category, name] = key.split("::");
      const row = { kategoria: category, tevekenyseg: name };
      schoolYears.forEach((year) => {
        row[`${year}__resztvevok`] =
          tableData[key][year]?.resztvevok_szama || "";
      });
      rows.push(row);
    });
    return rows;
  }, [tableData, sortedKeys, schoolYears]);

  if (isLoading) {
    return <PageLoadingOverlay isLoading={true} />;
  }

  let currentCategory = null;

  return (
    <PageWrapper
      titleContent={<TitleSzakkepzesZolditese />}
      infoContent={<InfoSzakkepzesZolditese />}
    >
      <Box>
        <LockStatusIndicator tableName="szakkepzes_zolditese" />

        {!selectedSchool && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Kérjük, válasszon egy intézményt a fenti legördülő menüből az adatok
            szerkesztéséhez és megtekintéséhez.
          </Alert>
        )}

        <Stack direction="row" spacing={2} sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mb: 3 }}>
          <LockedTableWrapper tableName="szakkepzes_zolditese">
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setOpenAddDialog(true)}
              disabled={!selectedSchool}
            >
              Új tevékenység hozzáadása
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
            fileName="szakkepzes_zolditese"
            sheetName="Szakképzés zöldítése"
            columns={[
              { header: "Kategória", key: "kategoria", width: 40 },
              {
                header: "Tevékenység megnevezése",
                key: "tevekenyseg",
                width: 40,
              },
              ...schoolYears.map((year) => ({
                header: `${year} - Résztvevők száma`,
                key: `${year}__resztvevok`,
                width: 25,
              })),
            ]}
            rows={exportRows}
            buttonLabel="Export Táblázatba"
          />
        </Stack>

        <TableContainer
          component={Paper}
          sx={{ maxWidth: "100%", overflowX: "auto" }}
        >
          <Table size="medium" sx={{ minWidth: 900, border: "2px solid #e0e0e0" }}>
            <TableHead>
              <TableRow>
                <TableCell
                  colSpan={2}
                  sx={{
                    fontWeight: "bold",
                    minWidth: 350,
                    borderRight: "2px solid #e0e0e0",
                    borderBottom: "2px solid #e0e0e0",
                    backgroundColor: "#fff",
                    position: "sticky",
                    left: 0,
                    zIndex: 3,
                  }}
                >
                  Kategória és Tevékenység megnevezése
                </TableCell>
                {schoolYears.map((year, i) => (
                  <TableCell
                    key={`${year}-header`}
                    align="center"
                    sx={{
                      fontWeight: "bold",
                      backgroundColor: "#fff3e0",
                      borderBottom: "2px solid #e0e0e0",
                      borderRight:
                        i === schoolYears.length - 1
                          ? "none"
                          : "1px solid #e0e0e0",
                      minWidth: 150,
                    }}
                  >
                    <Box>{year}</Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: "text.secondary",
                        mt: 0.5,
                        display: "block",
                      }}
                    >
                      Résztvevők száma (fő)
                    </Typography>
                  </TableCell>
                ))}
                <TableCell
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
                  }}
                >
                  Művelet
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedKeys.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={schoolYears.length + 3}
                    align="center"
                    sx={{ py: 3, fontStyle: "italic", color: "text.secondary" }}
                  >
                    Nincs rögzített adat. Kattintson az "Új tevékenység
                    hozzáadása" gombra!
                  </TableCell>
                </TableRow>
              ) : (
                sortedKeys.map((key) => {
                  const [category, name] = key.split("::");
                  const isFirstInCategory = category !== currentCategory;
                  if (isFirstInCategory) {
                    currentCategory = category;
                  }

                  return (
                    <TableRow key={key} hover>
                      {isFirstInCategory && (
                        <TableCell
                          rowSpan={categoryCounts[category]}
                          sx={{
                            borderRight: "2px solid #e0e0e0",
                            borderBottom: "1px solid #e0e0e0",
                            position: "sticky",
                            left: 0,
                            backgroundColor: "#f5f5f5",
                            zIndex: 1,
                            fontWeight: "bold",
                            width: "30%",
                            verticalAlign: "top",
                          }}
                        >
                          {formatHuNum(category)}
                        </TableCell>
                      )}
                      <TableCell
                        sx={{
                          borderRight: "2px solid #e0e0e0",
                          borderBottom: "1px solid #e0e0e0",
                          position: "sticky",
                          left: isFirstInCategory ? "auto" : 0,
                          backgroundColor: "#fff",
                          zIndex: 1,
                          width: "30%",
                        }}
                      >
                        {formatHuNum(name)}
                      </TableCell>
                      {schoolYears.map((year, i) => {
                        const rawVal =
                          tableData[key][year]?.resztvevok_szama || "";

                        return (
                          <TableCell
                            key={`${year}-val`}
                            align="center"
                            sx={{
                              borderBottom: "1px solid #e0e0e0",
                              borderRight:
                                i === schoolYears.length - 1
                                  ? "none"
                                  : "1px solid #f5f5f5",
                              backgroundColor: isFieldModified(key, year)
                                ? "#fff9c4"
                                : "inherit",
                            }}
                          >
                            <ZeroHidingTextField
                              type="text"
                              value={rawVal || 0}
                              onChange={(e) =>
                                handleDataChange(key, year, e.target.value)
                              }
                              size="small"
                              placeholder="pl. 71"
                              inputProps={{ style: { textAlign: "center" } }}
                              sx={{ width: "100%", maxWidth: "120px" }}
                              placeholder="0" />
                          </TableCell>
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
                          onClick={() => handleRemoveActivity(key)}
                          disabled={!selectedSchool}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
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
          <DialogTitle>Új tevékenység hozzáadása</DialogTitle>
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}
            >
              <FormControl fullWidth>
                <InputLabel>Kategória</InputLabel>
                <Select
                  value={newActivityCategory}
                  label="Kategória"
                  onChange={(e) => setNewActivityCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <ZeroHidingTextField
                fullWidth
                label="Tevékenység megnevezése"
                value={newActivityName || 0}
                onChange={(e) => setNewActivityName(e.target.value)}
                placeholder="Pl. városi szemétgyűjtési akció"
                multiline
                placeholder="0" />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={() => setOpenAddDialog(false)}>Mégse</Button>
            <Button
              variant="contained"
              onClick={handleAddActivity}
              disabled={!newActivityName.trim() || !newActivityCategory}
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
              Biztosan törölni szeretné a következő tevékenységet minden évből:
              <br />
              <strong>{itemToDelete?.split("::")[1]}</strong>?
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
        tableName="szakkepzesZolditese"
        onRollbackSuccess={() => {
          setSnackbarMessage("Sikeres visszaállítás az előzményekből!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        }}
      />
    </PageWrapper>
  );
}
