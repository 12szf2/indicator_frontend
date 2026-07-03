import { formatHuNum } from "../../../utils/formatters";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import {
  useGetEgyuttmukodesekSzamaQuery,
  useAddEgyuttmukodesekSzamaMutation,
  useUpdateEgyuttmukodesekSzamaMutation,
  useDeleteEgyuttmukodesekSzamaMutation,
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
  Divider,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { generateSchoolYears } from "../../../utils/schoolYears";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoEgyuttmukodesekSzama from "./info_egyuttmukudesek_szama";
import TitleEgyuttmukodesekSzama from "./title_egyuttmukudesek_szama";
import ExportToExcel from "../../../components/ExportToExcel";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

// Táblázat 1 mezői: felsőoktatási intézménnyel való együttműködések
// Táblázat 2 mezői: felsőoktatásba továbbtanulók

export default function EgyuttmukodesekSzama() {
  const schoolYears = useMemo(() => generateSchoolYears(), []);

  const selectedSchool = useSelector(selectSelectedSchool);

  // === Table 1: Együttműködések ===
  // Structure: { [intezmenynev]: { [year]: { id, egyuttmukodes_formaja, erintett_evfolyam, erintett_tanulok_szama } } }
  const [table1Data, setTable1Data] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [originalTable1Data, setOriginalTable1Data] = useState({});

  // === Table 2: Felsőoktatásba lépők ===
  // Structure: { [intezmenynev]: { [year]: { id, felsooktataba_lepo_szama, vegzos_technikumi_szama, tovabbtanulok_aranya } } }
  const [table2Data, setTable2Data] = useState({});
  const [originalTable2Data, setOriginalTable2Data] = useState({});

  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [addDialogTable, setAddDialogTable] = useState(1);
  const [newRowName, setNewRowName] = useState("");

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { table, name }

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const queries = schoolYears.map((yearRange) => {
    const startYear = parseInt(yearRange.split("/")[0]);
    return useGetEgyuttmukodesekSzamaQuery(
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

  const [addData] = useAddEgyuttmukodesekSzamaMutation();
  const [updateData] = useUpdateEgyuttmukodesekSzamaMutation();
  const [deleteData] = useDeleteEgyuttmukodesekSzamaMutation();

  useEffect(() => {
    if (dbData && !isFetching) {
      const newTable1 = {};
      const origTable1 = {};
      const newTable2 = {};
      const origTable2 = {};

      if (Array.isArray(dbData)) {
        dbData.forEach((item) => {
          const yearRange = `${item.tanev_kezdete}/${item.tanev_kezdete + 1}`;
          const name = item.felsooktatasi_intezmeny_neve || "Ismeretlen";
          const tableno = item.tablazat_szam || 1;

          if (tableno === 1) {
            if (!newTable1[name]) {
              newTable1[name] = {};
              schoolYears.forEach((y) => {
                newTable1[name][y] = {
                  id: null,
                  egyuttmukodes_formaja: "",
                  erintett_evfolyam: "",
                  erintett_tanulok_szama: "",
                };
              });
            }
            const yearData = {
              id: item.id,
              egyuttmukodes_formaja: item.egyuttmukodes_formaja || "",
              erintett_evfolyam: item.erintett_evfolyam || "",
              erintett_tanulok_szama: item.erintett_tanulok_szama || "",
            };
            newTable1[name][yearRange] = { ...yearData };
            if (!origTable1[name]) origTable1[name] = {};
            origTable1[name][yearRange] = { ...yearData };
          } else {
            if (!newTable2[name]) {
              newTable2[name] = {};
              schoolYears.forEach((y) => {
                newTable2[name][y] = {
                  id: null,
                  felsooktataba_lepo_szama: "",
                  vegzos_technikumi_szama: "",
                  tovabbtanulok_aranya: "",
                };
              });
            }
            const yearData2 = {
              id: item.id,
              felsooktataba_lepo_szama: item.felsooktataba_lepo_szama || "",
              vegzos_technikumi_szama: item.vegzos_technikumi_szama || "",
              tovabbtanulok_aranya: item.tovabbtanulok_aranya || "",
            };
            newTable2[name][yearRange] = { ...yearData2 };
            if (!origTable2[name]) origTable2[name] = {};
            origTable2[name][yearRange] = { ...yearData2 };
          }
        });
      }

      setTable1Data(newTable1);
      setOriginalTable1Data(origTable1);
      setTable2Data(newTable2);
      setOriginalTable2Data(origTable2);
      setIsModified(false);
    }
  }, [dbData, isFetching, schoolYears]);

  // ─── Table 1 handlers ────────────────────────────────────────────────────
  const handleTable1Change = useCallback((name, year, field, value) => {
    setTable1Data((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        [year]: { ...prev[name][year], [field]: value },
      },
    }));
    setIsModified(true);
  }, []);

  const isTable1FieldModified = (name, year, field) => {
    const orig = originalTable1Data[name]?.[year]?.[field] || "";
    const curr = table1Data[name]?.[year]?.[field] || "";
    return orig !== curr;
  };

  const isTable1RowModified = (name, year) =>
    isTable1FieldModified(name, year, "egyuttmukodes_formaja") ||
    isTable1FieldModified(name, year, "erintett_evfolyam") ||
    isTable1FieldModified(name, year, "erintett_tanulok_szama");

  // ─── Table 2 handlers ────────────────────────────────────────────────────
  const handleTable2Change = useCallback((name, year, field, value) => {
    setTable2Data((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        [year]: { ...prev[name][year], [field]: value },
      },
    }));
    setIsModified(true);
  }, []);

  const isTable2FieldModified = (name, year, field) => {
    const orig = originalTable2Data[name]?.[year]?.[field] || "";
    const curr = table2Data[name]?.[year]?.[field] || "";
    return orig !== curr;
  };

  const isTable2RowModified = (name, year) =>
    isTable2FieldModified(name, year, "felsooktataba_lepo_szama") ||
    isTable2FieldModified(name, year, "vegzos_technikumi_szama") ||
    isTable2FieldModified(name, year, "tovabbtanulok_aranya");

  // ─── Add Row ─────────────────────────────────────────────────────────────
  const openAddRowDialog = (tableNum) => {
    setAddDialogTable(tableNum);
    setNewRowName("");
    setOpenAddDialog(true);
  };

  const handleAddRow = useCallback(async () => {
    if (!newRowName.trim() || !selectedSchool) return;

    const availableYears = schoolYears
      .map((y) => parseInt(y.split("/")[0], 10))
      .filter((y) => !Number.isNaN(y));
    const defaultStartYear =
      availableYears.length > 0
        ? Math.max(...availableYears)
        : new Date().getFullYear();

    try {
      const recordData = {
        alapadatok_id: selectedSchool.id,
        felsooktatasi_intezmeny_neve: newRowName.trim(),
        tanev_kezdete: defaultStartYear,
        tablazat_szam: addDialogTable,
      };

      if (addDialogTable === 1) {
        recordData.egyuttmukodes_formaja = "";
        recordData.erintett_evfolyam = "";
        recordData.erintett_tanulok_szama = "";
      } else {
        recordData.felsooktataba_lepo_szama = "";
        recordData.vegzos_technikumi_szama = "";
        recordData.tovabbtanulok_aranya = "";
      }

      await addData(recordData).unwrap();
      setOpenAddDialog(false);
      setNewRowName("");
      setSnackbarMessage("Sor sikeresen hozzáadva!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Hiba hozzáadáskor:", error);
      setSnackbarMessage("Hiba történt a hozzáadás során!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [newRowName, selectedSchool, addData, addDialogTable, schoolYears]);

  // ─── Delete Row ───────────────────────────────────────────────────────────
  const handleRemoveRow = useCallback((tableNum, name) => {
    setDeleteTarget({ table: tableNum, name });
    setOpenDeleteDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const { table, name } = deleteTarget;
    const origData = table === 1 ? originalTable1Data : originalTable2Data;

    try {
      const promises = [];
      schoolYears.forEach((year) => {
        const id = origData[name]?.[year]?.id;
        if (id) promises.push(deleteData(id).unwrap());
      });
      if (promises.length > 0) await Promise.all(promises);

      if (table === 1) {
        const updated = { ...table1Data };
        delete updated[name];
        setTable1Data(updated);
        const updatedOrig = { ...originalTable1Data };
        delete updatedOrig[name];
        setOriginalTable1Data(updatedOrig);
      } else {
        const updated = { ...table2Data };
        delete updated[name];
        setTable2Data(updated);
        const updatedOrig = { ...originalTable2Data };
        delete updatedOrig[name];
        setOriginalTable2Data(updatedOrig);
      }

      setSnackbarMessage("Sikeresen törölve!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setOpenDeleteDialog(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Hiba törlés közben:", error);
      setSnackbarMessage("Hiba történt a törlés során!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [
    deleteTarget,
    originalTable1Data,
    originalTable2Data,
    table1Data,
    table2Data,
    deleteData,
    schoolYears,
  ]);

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedSchool) return;
    setIsSaving(true);
    let updatedCount = 0;
    let savedCount = 0;

    try {
      const promises = [];

      // Table 1
      Object.keys(table1Data).forEach((name) => {
        schoolYears.forEach((year) => {
          if (isTable1RowModified(name, year)) {
            const yearData = table1Data[name][year];
            const id = originalTable1Data[name]?.[year]?.id;
            const recordData = {
              alapadatok_id: selectedSchool.id,
              tanev_kezdete: parseInt(year.split("/")[0]),
              felsooktatasi_intezmeny_neve: name,
              tablazat_szam: 1,
              egyuttmukodes_formaja: yearData.egyuttmukodes_formaja || "",
              erintett_evfolyam: yearData.erintett_evfolyam || "",
              erintett_tanulok_szama: yearData.erintett_tanulok_szama || "",
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

      // Table 2
      Object.keys(table2Data).forEach((name) => {
        schoolYears.forEach((year) => {
          if (isTable2RowModified(name, year)) {
            const yearData = table2Data[name][year];
            const id = originalTable2Data[name]?.[year]?.id;
            const recordData = {
              alapadatok_id: selectedSchool.id,
              tanev_kezdete: parseInt(year.split("/")[0]),
              felsooktatasi_intezmeny_neve: name,
              tablazat_szam: 2,
              felsooktataba_lepo_szama: yearData.felsooktataba_lepo_szama || "",
              vegzos_technikumi_szama: yearData.vegzos_technikumi_szama || "",
              tovabbtanulok_aranya: yearData.tovabbtanulok_aranya || "",
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
    setTable1Data(JSON.parse(JSON.stringify(originalTable1Data)));
    setTable2Data(JSON.parse(JSON.stringify(originalTable2Data)));
    setIsModified(false);
  }, [originalTable1Data, originalTable2Data]);

  // ─── Export konfiguráció ─────────────────────────────────────────────────────────
  const exportSheets = useMemo(() => {
    // 1. Táblázat adatai
    const rowsTable1 = [];
    Object.keys(table1Data)
      .sort((a, b) => a.localeCompare(b, "hu"))
      .forEach((name) => {
        const row = { intezmeny: name };
        schoolYears.forEach((year) => {
          row[`${year}__formaja`] = table1Data[name][year]?.egyuttmukodes_formaja || "";
          row[`${year}__evfolyam`] = table1Data[name][year]?.erintett_evfolyam || "";
          row[`${year}__tanulok`] = table1Data[name][year]?.erintett_tanulok_szama || "";
        });
        rowsTable1.push(row);
      });

    const columnsTable1 = [
      { header: "Felsőoktatási intézmény", key: "intezmeny", width: 45 },
      ...schoolYears.flatMap((year) => [
        { header: `${year} - Együttműk. formája`, key: `${year}__formaja`, width: 30 },
        { header: `${year} - Érintett évfolyam`, key: `${year}__evfolyam`, width: 22 },
        { header: `${year} - Érintett tanulók száma`, key: `${year}__tanulok`, width: 22 },
      ]),
    ];

    // 2. Táblázat adatai
    const rowsTable2 = [];
    Object.keys(table2Data)
      .sort((a, b) => a.localeCompare(b, "hu"))
      .forEach((name) => {
        const row = { intezmeny: name };
        schoolYears.forEach((year) => {
          row[`${year}__lepo`] = table2Data[name][year]?.felsooktataba_lepo_szama || "";
          row[`${year}__vegzos`] = table2Data[name][year]?.vegzos_technikumi_szama || "";
          row[`${year}__arany`] = table2Data[name][year]?.tovabbtanulok_aranya || "";
        });
        rowsTable2.push(row);
      });

    const columnsTable2 = [
      { header: "Felsőoktatási intézmény", key: "intezmeny", width: 45 },
      ...schoolYears.flatMap((year) => [
        { header: `${year} - Felsőokt. lépő`, key: `${year}__lepo`, width: 20 },
        { header: `${year} - Végzős technikumi`, key: `${year}__vegzos`, width: 22 },
        { header: `${year} - Továbbtanulók aránya`, key: `${year}__arany`, width: 22 },
      ]),
    ];

    return [
      {
        sheetName: "Együttműködések",
        columns: columnsTable1,
        rows: rowsTable1,
      },
      {
        sheetName: "Felsőoktatásba lépők",
        columns: columnsTable2,
        rows: rowsTable2,
      }
    ];
  }, [table1Data, table2Data, schoolYears]);

  if (isLoading) {
    return <PageLoadingOverlay isLoading={true} />;
  }

  const commonHeaderCell = (label, extraSx = {}) => (
    <TableCell
      sx={{
        fontWeight: "bold",
        backgroundColor: "#fff3e0",
        borderBottom: "2px solid #e0e0e0",
        borderRight: "1px solid #e0e0e0",
        minWidth: 140,
        ...extraSx,
      }}
    >
      {formatHuNum(label)}
    </TableCell>
  );

  return (
    <PageWrapper
      titleContent={<TitleEgyuttmukodesekSzama />}
      infoContent={<InfoEgyuttmukodesekSzama />}
    >
      <Box>
        <LockStatusIndicator tableName="egyuttmukudesek_szama" />

        {!selectedSchool && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Kérjük, válasszon egy intézményt a fenti legördülő menüből az adatok
            szerkesztéséhez és megtekintéséhez.
          </Alert>
        )}

        <Stack direction="row" spacing={2} sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mb: 3 }}>
          <LockedTableWrapper tableName="egyuttmukudesek_szama">
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
            fileName="egyuttmukudesek_szama"
            sheets={exportSheets}
            buttonLabel="Export Táblázatba"
          />
        </Stack>

        {/* ══════════════════════════════════════════════════════════
            1. TÁBLÁZAT: Felsőoktatási együttműködések
        ══════════════════════════════════════════════════════════ */}
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
          1. táblázat – Felsőoktatási intézményekkel való együttműködések
        </Typography>

        <LockedTableWrapper tableName="egyuttmukudesek_szama">
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => openAddRowDialog(1)}
            disabled={!selectedSchool}
            sx={{ mb: 2 }}
          >
            Új intézmény hozzáadása (1. táblázat)
          </Button>
        </LockedTableWrapper>

        <TableContainer
          component={Paper}
          sx={{ maxWidth: "100%", overflowX: "auto", mb: 4 }}
        >
          <Table size="medium" sx={{ minWidth: 600, border: "2px solid #e0e0e0" }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: 260,
                    borderRight: "2px solid #e0e0e0",
                    borderBottom: "2px solid #e0e0e0",
                    backgroundColor: "#f5f5f5",
                    position: "sticky",
                    left: 0,
                    zIndex: 3,
                  }}
                >
                  Felsőoktatási intézmény megnevezése
                </TableCell>
                {schoolYears.map((year, i) => (
                  <TableCell
                    key={`t1-${year}-header`}
                    colSpan={3}
                    align="center"
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
                  sx={{
                    fontWeight: "bold",
                    width: 60,
                    borderBottom: "2px solid #e0e0e0",
                    borderLeft: "2px solid #e0e0e0",
                    position: "sticky",
                    right: 0,
                    backgroundColor: "#f5f5f5",
                    zIndex: 3,
                  }}
                >
                  Műv.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell
                  sx={{
                    borderRight: "2px solid #e0e0e0",
                    borderBottom: "2px solid #e0e0e0",
                    backgroundColor: "#f5f5f5",
                    position: "sticky",
                    left: 0,
                    zIndex: 3,
                  }}
                />
                {schoolYears.map((year, i) => (
                  <React.Fragment key={`t1-sub-${year}`}>
                    {commonHeaderCell(
                      "Együttműködés formája (tevékenység megnevezése)",
                      { minWidth: 200 },
                    )}
                    {commonHeaderCell("Érintett tanulók évfolyama", {
                      minWidth: 160,
                    })}
                    {commonHeaderCell("Érintett tanulók száma", {
                      minWidth: 140,
                      borderRight:
                        i === schoolYears.length - 1
                          ? "none"
                          : "2px solid #e0e0e0",
                    })}
                  </React.Fragment>
                ))}
                <TableCell
                  sx={{
                    borderLeft: "2px solid #e0e0e0",
                    borderBottom: "2px solid #e0e0e0",
                    backgroundColor: "#f5f5f5",
                    position: "sticky",
                    right: 0,
                    zIndex: 3,
                  }}
                />
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.keys(table1Data).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={schoolYears.length * 3 + 2}
                    align="center"
                    sx={{ py: 3, fontStyle: "italic", color: "text.secondary" }}
                  >
                    Nincs rögzített adat. Kattintson az „Új intézmény
                    hozzáadása" gombra!
                  </TableCell>
                </TableRow>
              ) : (
                Object.keys(table1Data)
                  .sort((a, b) => a.localeCompare(b, "hu"))
                  .map((name) => (
                    <TableRow key={`t1-${name}`} hover>
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
                        {formatHuNum(name)}
                      </TableCell>
                      {schoolYears.map((year, i) => (
                        <React.Fragment key={`t1-${name}-${year}`}>
                          <TableCell
                            align="center"
                            sx={{
                              borderBottom: "1px solid #e0e0e0",
                              borderRight: "1px solid #f5f5f5",
                              backgroundColor: isTable1FieldModified(
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
                              value={table1Data[name][year]?.egyuttmukodes_formaja || 0}
                              onChange={(e) =>
                                handleTable1Change(
                                  name,
                                  year,
                                  "egyuttmukodes_formaja",
                                  e.target.value,
                                )
                              }
                              size="small"
                              multiline
                              minRows={1}
                              placeholder="pl. közös képzés"
                              inputProps={{ style: { textAlign: "center" } }}
                              sx={{ width: "100%", maxWidth: "200px" }}
                              placeholder="0" />
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              borderBottom: "1px solid #e0e0e0",
                              borderRight: "1px solid #f5f5f5",
                              backgroundColor: isTable1FieldModified(
                                name,
                                year,
                                "erintett_evfolyam",
                              )
                                ? "#fff9c4"
                                : "inherit",
                            }}
                          >
                            <ZeroHidingTextField
                              type="text"
                              value={table1Data[name][year]?.erintett_evfolyam || 0}
                              onChange={(e) =>
                                handleTable1Change(
                                  name,
                                  year,
                                  "erintett_evfolyam",
                                  e.target.value,
                                )
                              }
                              size="small"
                              placeholder="pl. 9-10-11"
                              inputProps={{ style: { textAlign: "center" } }}
                              sx={{ width: "100%", maxWidth: "130px" }}
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
                              backgroundColor: isTable1FieldModified(
                                name,
                                year,
                                "erintett_tanulok_szama",
                              )
                                ? "#fff9c4"
                                : "inherit",
                            }}
                          >
                            <ZeroHidingTextField
                              type="number"
                              value={table1Data[name][year]
                                ?.erintett_tanulok_szama || 0}
                              onChange={(e) =>
                                handleTable1Change(
                                  name,
                                  year,
                                  "erintett_tanulok_szama",
                                  e.target.value,
                                )
                              }
                              size="small"
                              inputProps={{
                                style: { textAlign: "center" },
                                min: 0,
                              }}
                              sx={{ width: "90px" }}
                              placeholder="0" />
                          </TableCell>
                        </React.Fragment>
                      ))}
                      <TableCell
                        align="center"
                        sx={{
                          borderLeft: "2px solid #e0e0e0",
                          borderBottom: "1px solid #e0e0e0",
                          position: "sticky",
                          right: 0,
                          backgroundColor: "#fff",
                          zIndex: 1,
                        }}
                      >
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveRow(1, name)}
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

        <Divider sx={{ my: 3 }} />

        {/* ══════════════════════════════════════════════════════════
            2. TÁBLÁZAT: Felsőoktatásba továbbtanulók
        ══════════════════════════════════════════════════════════ */}
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
          2. táblázat – Felsőoktatásba továbbtanulók
        </Typography>

        <LockedTableWrapper tableName="egyuttmukudesek_szama">
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => openAddRowDialog(2)}
            disabled={!selectedSchool}
            sx={{ mb: 2 }}
          >
            Új intézmény hozzáadása (2. táblázat)
          </Button>
        </LockedTableWrapper>

        <TableContainer
          component={Paper}
          sx={{ maxWidth: "100%", overflowX: "auto", mb: 4 }}
        >
          <Table size="medium" sx={{ minWidth: 900, border: "2px solid #e0e0e0" }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: 260,
                    borderRight: "2px solid #e0e0e0",
                    borderBottom: "2px solid #e0e0e0",
                    backgroundColor: "#f5f5f5",
                    position: "sticky",
                    left: 0,
                    zIndex: 3,
                  }}
                >
                  Felsőoktatási intézmények megnevezése
                </TableCell>
                {schoolYears.map((year, i) => (
                  <TableCell
                    key={`t2-${year}-header`}
                    colSpan={3}
                    align="center"
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
                  sx={{
                    fontWeight: "bold",
                    width: 60,
                    borderBottom: "2px solid #e0e0e0",
                    borderLeft: "2px solid #e0e0e0",
                    position: "sticky",
                    right: 0,
                    backgroundColor: "#f5f5f5",
                    zIndex: 3,
                  }}
                >
                  Műv.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell
                  sx={{
                    borderRight: "2px solid #e0e0e0",
                    borderBottom: "2px solid #e0e0e0",
                    backgroundColor: "#f5f5f5",
                    position: "sticky",
                    left: 0,
                    zIndex: 3,
                  }}
                />
                {schoolYears.map((year, i) => (
                  <React.Fragment key={`t2-sub-${year}`}>
                    {commonHeaderCell(
                      "Felsőoktatásba lépő tanulók száma (fő)",
                      { minWidth: 180 },
                    )}
                    {commonHeaderCell("Végzős technikumi tanulók száma (fő)", {
                      minWidth: 180,
                    })}
                    {commonHeaderCell(
                      "Felsőoktatásba továbbtanulók aránya az intézmény végzős technikumi tanulói létszámához viszonyítva",
                      {
                        minWidth: 220,
                        borderRight:
                          i === schoolYears.length - 1
                            ? "none"
                            : "2px solid #e0e0e0",
                      },
                    )}
                  </React.Fragment>
                ))}
                <TableCell
                  sx={{
                    borderLeft: "2px solid #e0e0e0",
                    borderBottom: "2px solid #e0e0e0",
                    backgroundColor: "#f5f5f5",
                    position: "sticky",
                    right: 0,
                    zIndex: 3,
                  }}
                />
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.keys(table2Data).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={schoolYears.length * 3 + 2}
                    align="center"
                    sx={{ py: 3, fontStyle: "italic", color: "text.secondary" }}
                  >
                    Nincs rögzített adat. Kattintson az „Új intézmény
                    hozzáadása" gombra!
                  </TableCell>
                </TableRow>
              ) : (
                Object.keys(table2Data)
                  .sort((a, b) => a.localeCompare(b, "hu"))
                  .map((name) => (
                    <TableRow key={`t2-${name}`} hover>
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
                        {formatHuNum(name)}
                      </TableCell>
                      {schoolYears.map((year, i) => (
                        <React.Fragment key={`t2-${name}-${year}`}>
                          <TableCell
                            align="center"
                            sx={{
                              borderBottom: "1px solid #e0e0e0",
                              borderRight: "1px solid #f5f5f5",
                              backgroundColor: isTable2FieldModified(
                                name,
                                year,
                                "felsooktataba_lepo_szama",
                              )
                                ? "#fff9c4"
                                : "inherit",
                            }}
                          >
                            <ZeroHidingTextField
                              type="number"
                              value={table2Data[name][year]
                                ?.felsooktataba_lepo_szama || 0}
                              onChange={(e) =>
                                handleTable2Change(
                                  name,
                                  year,
                                  "felsooktataba_lepo_szama",
                                  e.target.value,
                                )
                              }
                              size="small"
                              inputProps={{
                                style: { textAlign: "center" },
                                min: 0,
                              }}
                              sx={{ width: "90px" }}
                              placeholder="0" />
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              borderBottom: "1px solid #e0e0e0",
                              borderRight: "1px solid #f5f5f5",
                              backgroundColor: isTable2FieldModified(
                                name,
                                year,
                                "vegzos_technikumi_szama",
                              )
                                ? "#fff9c4"
                                : "inherit",
                            }}
                          >
                            <ZeroHidingTextField
                              type="number"
                              value={table2Data[name][year]
                                ?.vegzos_technikumi_szama || 0}
                              onChange={(e) =>
                                handleTable2Change(
                                  name,
                                  year,
                                  "vegzos_technikumi_szama",
                                  e.target.value,
                                )
                              }
                              size="small"
                              inputProps={{
                                style: { textAlign: "center" },
                                min: 0,
                              }}
                              sx={{ width: "90px" }}
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
                              backgroundColor: isTable2FieldModified(
                                name,
                                year,
                                "tovabbtanulok_aranya",
                              )
                                ? "#fff9c4"
                                : "inherit",
                            }}
                          >
                            <ZeroHidingTextField
                              type="text"
                              value={table2Data[name][year]?.tovabbtanulok_aranya || 0}
                              onChange={(e) =>
                                handleTable2Change(
                                  name,
                                  year,
                                  "tovabbtanulok_aranya",
                                  e.target.value,
                                )
                              }
                              size="small"
                              placeholder="pl. 49%"
                              inputProps={{ style: { textAlign: "center" } }}
                              sx={{ width: "90px" }}
                              placeholder="0" />
                          </TableCell>
                        </React.Fragment>
                      ))}
                      <TableCell
                        align="center"
                        sx={{
                          borderLeft: "2px solid #e0e0e0",
                          borderBottom: "1px solid #e0e0e0",
                          position: "sticky",
                          right: 0,
                          backgroundColor: "#fff",
                          zIndex: 1,
                        }}
                      >
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveRow(2, name)}
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

        {/* ─── Add Dialog ─────────────────────────────────────────── */}
        <Dialog
          open={openAddDialog}
          onClose={() => setOpenAddDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Új felsőoktatási intézmény hozzáadása – {addDialogTable}. táblázat
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
            >
              <ZeroHidingTextField
                fullWidth
                label="Felsőoktatási intézmény megnevezése"
                value={newRowName || 0}
                onChange={(e) => setNewRowName(e.target.value)}
                placeholder="Pl. Neumann János Egyetem"
                autoFocus
                placeholder="0" />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={() => setOpenAddDialog(false)}>Mégse</Button>
            <Button
              variant="contained"
              onClick={handleAddRow}
              disabled={!newRowName.trim()}
            >
              Hozzáadás
            </Button>
          </DialogActions>
        </Dialog>

        {/* ─── Delete Dialog ───────────────────────────────────────── */}
        <Dialog
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
        >
          <DialogTitle>Törlés megerősítése</DialogTitle>
          <DialogContent>
            <Typography>
              Biztosan törölni szeretné a következő intézményt minden évből:{" "}
              <strong>{deleteTarget?.name}</strong>?
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
        tableName="egyuttmukudesek_szama"
        onRollbackSuccess={() => {
          setSnackbarMessage("Sikeres visszaállítás az előzményekből!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        }}
      />
    </PageWrapper>
  );
}
