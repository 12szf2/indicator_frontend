import { formatHuNum } from "../../../utils/formatters";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import {
  useGetIntézményiElismeresekBySchoolQuery,
  useAddIntézményiElismeresekMutation,
  useUpdateIntézményiElismeresekMutation,
  useDeleteIntézményiElismeresekMutation,
  useGetMunkavallalokElismeresekBySchoolQuery,
  useUpsertMunkavallalokElismeresekMutation,
} from "../../../store/api/apiSlice";
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
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Chip,
  Tooltip,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoIntézményiElismeresek from "./info_intezmenyi_elismeresek";
import TitleIntézményiElismeresek from "./title_intezmenyi_elismeresek";
import { generateSchoolYears } from "../../../utils/schoolYears";
import ExportToExcel from "../../../components/ExportToExcel";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

// Fix munkavállalói kategóriák (a képernyőkép alapján)
const MUNKAVALLALOI_KATEGORIAK = [
  {
    key: "itm_miniszteri_elismero_oklevel",
    label: "ITM Miniszteri Elismerő Oklevél",
  },
  { key: "itm_szakkepzesert_dij", label: "ITM Szakképzésért díj" },
  {
    key: "kim_miniszter_elismero_oklevele",
    label: "KIM Miniszter Elismerő Oklevele",
  },
  { key: "kim_szakkepzesert_dij", label: "KIM Szakképzésért díj" },
  {
    key: "kim_oktatoi_szolgalati_emlekazerem",
    label: "KIM Oktatói szolgálati Emlékérem",
  },
  {
    key: "pedagogus_szolgalati_emlekazerem",
    label: "Pedagógus Szolgálati Emlékérem",
  },
  { key: "hszc_kivalosagi_dij", label: "HSZC Kiválósági díj" },
];

// Stabil üres tömb referencia – megakadályozza a végtelen useEffect hurkot
const EMPTY_ARRAY = [];

export default function IntézményiElismeresek() {
  const schoolYears = useMemo(() => generateSchoolYears(), []);
  const selectedSchool = useSelector(selectSelectedSchool);

  // ─── Snackbar ────────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const showSnackbar = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // ─── API hooks ────────────────────────────────────────────────────────────────
  const {
    data: intezményiRawData = EMPTY_ARRAY,
    isLoading: intezményiLoading,
    isFetching: intezményiFetching,
    refetch: refetchIntézményiElismeresek,
  } = useGetIntézményiElismeresekBySchoolQuery(selectedSchool?.id, {
    skip: !selectedSchool?.id,
  });

  const {
    data: munkavallalokRawData = EMPTY_ARRAY,
    isLoading: munkavallalokLoading,
    isFetching: munkavallalokFetching,
    refetch: refetchMunkavallalokElismeresek,
  } = useGetMunkavallalokElismeresekBySchoolQuery(selectedSchool?.id, {
    skip: !selectedSchool?.id,
  });

  const [addIntézményiElismeresek] = useAddIntézményiElismeresekMutation();
  const [updateIntézményiElismeresek] =
    useUpdateIntézményiElismeresekMutation();
  const [deleteIntézményiElismeresek] =
    useDeleteIntézményiElismeresekMutation();
  const [upsertMunkavallalok] = useUpsertMunkavallalokElismeresekMutation();

  // ─── Intézményi adatok state (Csoportosítva dij_neve alapján) ────────────────
  // Formátum: { [groupId]: { groupId, dij_neve, years: { [startYear]: { id, darabszam } } } }
  const [intezményiData, setIntezményiData] = useState({});
  const [intezményiOriginal, setIntezményiOriginal] = useState({});
  const [intezményiModified, setIntezményiModified] = useState(false);

  // Díj hozzáadás dialog
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newDijNeve, setNewDijNeve] = useState("");

  const [historyIntezmenyiOpen, setHistoryIntezmenyiOpen] = useState(false);
  const [historyMunkavallalokOpen, setHistoryMunkavallalokOpen] = useState(false);

  useEffect(() => {
    if (!intezményiFetching && intezményiRawData) {
      const grouped = {};

      intezményiRawData.forEach((item) => {
        const key = item.dij_neve;
        if (!grouped[key]) {
          grouped[key] = {
            groupId: key,
            dij_neve: item.dij_neve,
            years: {},
          };
          schoolYears.forEach((yearStr) => {
            const startYear = parseInt(yearStr.split("/")[0], 10);
            grouped[key].years[startYear] = { id: null, darabszam: 0 };
          });
        }

        // Ha olyan tanévről van adat ami esetleg nincs a megjelenített schoolYears-ben
        if (!grouped[key].years[item.tanev_kezdete]) {
          grouped[key].years[item.tanev_kezdete] = { id: null, darabszam: 0 };
        }

        grouped[key].years[item.tanev_kezdete] = {
          id: item.id,
          darabszam: item.darabszam ?? 0,
        };
      });

      setIntezményiData(grouped);
      setIntezményiOriginal(JSON.parse(JSON.stringify(grouped)));
      setIntezményiModified(false);
    }
  }, [intezményiRawData, intezményiFetching, schoolYears]);

  // ─── Munkavállalói adatok state ───────────────────────────────────────────────
  const [munkavallalokData, setMunkavallalokData] = useState({});
  const [munkavallalokOriginal, setMunkavallalokOriginal] = useState({});
  const [munkavallalokModified, setMunkavallalokModified] = useState(false);

  useEffect(() => {
    const byYear = {};
    schoolYears.forEach((yearStr) => {
      const startYear = parseInt(yearStr.split("/")[0], 10);
      byYear[startYear] = { tanev_kezdete: startYear };
      MUNKAVALLALOI_KATEGORIAK.forEach((k) => {
        byYear[startYear][k.key] = 0;
      });
    });

    if (Array.isArray(munkavallalokRawData)) {
      munkavallalokRawData.forEach((rec) => {
        if (byYear[rec.tanev_kezdete]) {
          byYear[rec.tanev_kezdete] = { ...byYear[rec.tanev_kezdete], ...rec };
        }
      });
    }

    setMunkavallalokData(byYear);
    setMunkavallalokOriginal(JSON.parse(JSON.stringify(byYear)));
    setMunkavallalokModified(false);
  }, [munkavallalokRawData, schoolYears]);

  // ─── Handlers: Intézményi ────────────────────────────────────────────────────
  const handleIntezményiNameChange = useCallback((groupId, value) => {
    setIntezményiData((prev) => ({
      ...prev,
      [groupId]: { ...prev[groupId], dij_neve: value },
    }));
    setIntezményiModified(true);
  }, []);

  const handleIntezményiCountChange = useCallback(
    (groupId, startYear, value) => {
      setIntezményiData((prev) => ({
        ...prev,
        [groupId]: {
          ...prev[groupId],
          years: {
            ...prev[groupId].years,
            [startYear]: {
              ...prev[groupId].years[startYear],
              darabszam: parseInt(value) || 0,
            },
          },
        },
      }));
      setIntezményiModified(true);
    },
    [],
  );

  const handleAddDij = useCallback(() => {
    if (!newDijNeve.trim() || !selectedSchool) return;

    // Check if name already exists
    const exists = Object.values(intezményiData).some(
      (g) => g.dij_neve.toLowerCase() === newDijNeve.trim().toLowerCase(),
    );
    if (exists) {
      showSnackbar("Ez a díj már létezik a listában!", "warning");
      return;
    }

    const groupId = `local_${Date.now()}`;
    const group = {
      groupId,
      dij_neve: newDijNeve.trim(),
      years: {},
    };
    schoolYears.forEach((yearStr) => {
      const startYear = parseInt(yearStr.split("/")[0], 10);
      group.years[startYear] = { id: null, darabszam: 0 };
    });

    setIntezményiData((prev) => ({ ...prev, [groupId]: group }));
    setIntezményiModified(true);
    setOpenAddDialog(false);
    setNewDijNeve("");
  }, [newDijNeve, selectedSchool, intezményiData, schoolYears, showSnackbar]);

  const handleDeleteDij = useCallback(
    async (groupId) => {
      try {
        const group = intezményiData[groupId];
        const idsToDelete = Object.values(group.years)
          .map((y) => y.id)
          .filter((id) => id);

        if (idsToDelete.length > 0) {
          const promises = idsToDelete.map((id) =>
            deleteIntézményiElismeresek(id).unwrap(),
          );
          await Promise.all(promises);
        } else {
          // Only local, remove immediately
          setIntezményiData((prev) => {
            const next = { ...prev };
            delete next[groupId];
            return next;
          });
        }
        showSnackbar("Díj kategória sikeresen törölve!");
      } catch (err) {
        console.error(err);
        showSnackbar("Hiba a törlés során!", "error");
      }
    },
    [intezményiData, deleteIntézményiElismeresek, showSnackbar],
  );

  const handleIntezményiSave = useCallback(async () => {
    try {
      const promises = [];

      Object.values(intezményiData).forEach((group) => {
        const origGroup = intezményiOriginal[group.groupId];
        let hasAnySaved = false;

        Object.entries(group.years).forEach(([startYearStr, yearData]) => {
          const startYear = parseInt(startYearStr, 10);
          const origYearData = origGroup?.years[startYear];

          if (yearData.id) {
            // Már a DB-ben van: frissítés, ha a darabszám vagy a név változott
            if (
              yearData.darabszam !== origYearData?.darabszam ||
              group.dij_neve !== origGroup?.dij_neve
            ) {
              promises.push(
                updateIntézményiElismeresek({
                  id: yearData.id,
                  darabszam: yearData.darabszam,
                  dij_neve: group.dij_neve,
                }).unwrap(),
              );
            }
            hasAnySaved = true;
          } else {
            // Nincs a DB-ben: beszúrás ha a darabszám > 0
            if (yearData.darabszam > 0) {
              promises.push(
                addIntézményiElismeresek({
                  alapadatok_id: selectedSchool.id,
                  tanev_kezdete: startYear,
                  dij_neve: group.dij_neve,
                  darabszam: yearData.darabszam,
                }).unwrap(),
              );
              hasAnySaved = true;
            }
          }
        });

        // Ha ez egy teljesen új sor, és az összes év 0, entsünk legalább egyet a DB-be, hogy a sor megmaradjon.
        const hasDbIds = Object.values(group.years).some((y) => y.id);
        if (!hasDbIds && !hasAnySaved && !origGroup) {
          const latestYear = parseInt(schoolYears[0].split("/")[0], 10);
          promises.push(
            addIntézményiElismeresek({
              alapadatok_id: selectedSchool.id,
              tanev_kezdete: latestYear,
              dij_neve: group.dij_neve,
              darabszam: 0,
            }).unwrap(),
          );
        }
      });

      if (promises.length > 0) {
        await Promise.all(promises);
        showSnackbar(`Változások mentve!`);
      } else {
        showSnackbar("Nincs menteni való módosítás.", "info");
      }
      setIntezményiModified(false);
    } catch (err) {
      console.error(err);
      showSnackbar("Hiba a mentés során!", "error");
    }
  }, [
    intezményiData,
    intezményiOriginal,
    selectedSchool,
    schoolYears,
    addIntézményiElismeresek,
    updateIntézményiElismeresek,
    showSnackbar,
  ]);

  const handleIntezményiReset = useCallback(() => {
    setIntezményiData(JSON.parse(JSON.stringify(intezményiOriginal)));
    setIntezményiModified(false);
  }, [intezményiOriginal]);

  // ─── Handlers: Munkavállalók ─────────────────────────────────────────────────
  const handleMunkavallalokChange = useCallback((startYear, key, value) => {
    setMunkavallalokData((prev) => ({
      ...prev,
      [startYear]: { ...prev[startYear], [key]: parseInt(value) || 0 },
    }));
    setMunkavallalokModified(true);
  }, []);

  const handleMunkavallalokSave = useCallback(async () => {
    if (!selectedSchool) return;
    try {
      const promises = schoolYears.map((yearStr) => {
        const startYear = parseInt(yearStr.split("/")[0], 10);
        const rec = munkavallalokData[startYear] ?? {};
        return upsertMunkavallalok({
          alapadatok_id: selectedSchool.id,
          tanev_kezdete: startYear,
          ...Object.fromEntries(
            MUNKAVALLALOI_KATEGORIAK.map((k) => [k.key, rec[k.key] ?? 0]),
          ),
        }).unwrap();
      });
      await Promise.all(promises);
      showSnackbar("Munkavállalói adatok mentve!");
      setMunkavallalokModified(false);
    } catch (err) {
      console.error(err);
      showSnackbar("Hiba a mentés során!", "error");
    }
  }, [
    selectedSchool,
    munkavallalokData,
    schoolYears,
    upsertMunkavallalok,
    showSnackbar,
  ]);

  const handleMunkavallalokReset = useCallback(() => {
    setMunkavallalokData(JSON.parse(JSON.stringify(munkavallalokOriginal)));
    setMunkavallalokModified(false);
  }, [munkavallalokOriginal]);

  // ─── Csoportosított intézményi adatok tanév szerint ──────────────────────────
  const intezményiByYear = useMemo(() => {
    const result = {};
    schoolYears.forEach((yearStr) => {
      const startYear = parseInt(yearStr.split("/")[0], 10);
      result[startYear] = 0;
    });
    Object.values(intezményiData).forEach((group) => {
      schoolYears.forEach((yearStr) => {
        const startYear = parseInt(yearStr.split("/")[0], 10);
        if (group.years[startYear]) {
          result[startYear] += group.years[startYear].darabszam;
        }
      });
    });
    return result;
  }, [intezményiData, schoolYears]);

  // ─── Export adatok ────────────────────────────────────────────────────────────
  const intezményiExportRows = useMemo(() => {
    return Object.values(intezményiData).map((group) => {
      const row = { dij_neve: group.dij_neve };
      schoolYears.forEach((yearStr) => {
        const startYear = parseInt(yearStr.split("/")[0], 10);
        row[yearStr] = group.years[startYear]?.darabszam ?? 0;
      });
      return row;
    });
  }, [intezményiData, schoolYears]);

  const munkavallalokExportRows = useMemo(() => {
    return MUNKAVALLALOI_KATEGORIAK.map((kat) => {
      const row = { kategoriak: kat.label };
      schoolYears.forEach((yearStr) => {
        const startYear = parseInt(yearStr.split("/")[0], 10);
        row[yearStr] = munkavallalokData[startYear]?.[kat.key] ?? 0;
      });
      return row;
    });
  }, [munkavallalokData, schoolYears]);

  const _shouldShowOverlay = intezményiLoading || munkavallalokLoading || intezményiFetching || munkavallalokFetching;

  return (
    <PageWrapper
      titleContent={<TitleIntézményiElismeresek />}
      infoContent={<InfoIntézményiElismeresek />}
    >
      <PageLoadingOverlay isLoading={_shouldShowOverlay} />
      <Box>
        <LockStatusIndicator tableName="intezmenyi_nevelesi_mutatok" />

        {!selectedSchool && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Kérjük, válasszon egy intézményt a fenti legördülő menüből az adatok
            megtekintéséhez és szerkesztéséhez.
          </Alert>
        )}

        {/* ──────────────────────────────────────────────────────────────────────
            SZEKCIÓ 1: Intézmény által elnyert díjak (dinamikus)
        ─────────────────────────────────────────────────────────────────────── */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
              flexWrap="wrap"
              gap={1}
            >
              <Typography
                variant="h6"
                component="h2"
                sx={{ color: "#1976d2", fontWeight: "bold" }}
              >
                Intézmény által elnyert díjak, elismerések
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", }}>
                <LockedTableWrapper tableName="intezmenyi_nevelesi_mutatok">
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenAddDialog(true)}
                    disabled={!selectedSchool}
                    size="small"
                  >
                    Új díj hozzáadása
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleIntezményiSave}
                    disabled={!intezményiModified || !selectedSchool}
                    size="small"
                  >
                    Mentés
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<HistoryIcon />}
                    onClick={() => setHistoryIntezmenyiOpen(true)}
                    disabled={!selectedSchool}
                    size="small"
                  >
                    Előzmények
                  </Button>
                </LockedTableWrapper>
                <ExportToExcel
                  fileName="intezmenyi_dijak"
                  sheetName="Intézményi díjak"
                  columns={[
                    { header: "Díj neve", key: "dij_neve", width: 45 },
                    ...schoolYears.map((yr) => ({
                      header: yr,
                      key: yr,
                      width: 14,
                    })),
                  ]}
                  rows={intezményiExportRows}
                  buttonLabel="Export"
                  buttonSx={{ height: 30, fontSize: "0.75rem" }}
                />
              </Stack>
            </Stack>

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ overflowX: "auto" }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#e8f5e8" }}>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 200 }}>
                      Témakörök
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        minWidth: 120,
                        backgroundColor: "#f0f8ff",
                        textAlign: "center",
                      }}
                    >
                      Információk
                    </TableCell>
                    {schoolYears.map((year) => (
                      <TableCell
                        key={year}
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          minWidth: 100,
                          backgroundColor: "#f0f8ff",
                        }}
                      >
                        {year}
                      </TableCell>
                    ))}
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        width: 60,
                        textAlign: "center",
                      }}
                    >
                      Töröl
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Összesítő sor (csak olvasható, automatikusan számolt) */}
                  <TableRow sx={{ backgroundColor: "#fff3e0" }}>
                    <TableCell sx={{ fontWeight: "bold", color: "#d32f2f" }}>
                      Intézmény által elnyert díjak, elismerések – összesen
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ backgroundColor: "#f0f8ff" }}
                    >
                      <Chip
                        label="Összesen"
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    {schoolYears.map((yearStr) => {
                      const startYear = parseInt(yearStr.split("/")[0], 10);
                      const sum = intezményiByYear[startYear] || 0;
                      return (
                        <TableCell
                          key={yearStr}
                          align="center"
                          sx={{ fontWeight: "bold" }}
                        >
                          {formatHuNum(sum)}
                        </TableCell>
                      );
                    })}
                    <TableCell />
                  </TableRow>

                  {/* Dinamikus sorok */}
                  {Object.values(intezményiData).length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={schoolYears.length + 3}
                        align="center"
                        sx={{ color: "text.secondary", py: 3 }}
                      >
                        Még nincs felvett díj. Kattintson az „Új díj hozzáadása"
                        gombra!
                      </TableCell>
                    </TableRow>
                  )}
                  {Object.values(intezményiData)
                    .sort((a, b) => a.dij_neve.localeCompare(b.dij_neve, "hu"))
                    .map((group, idx) => {
                      return (
                        <TableRow
                          key={group.groupId}
                          sx={{
                            backgroundColor:
                              idx % 2 === 0 ? "#f5f5f5" : "white",
                            "&:hover": { backgroundColor: "#f5f5f5" },
                          }}
                        >
                          <TableCell>
                            <ZeroHidingTextField
                              value={group.dij_neve || 0}
                              onChange={(e) =>
                                handleIntezményiNameChange(
                                  group.groupId,
                                  e.target.value,
                                )
                              }
                              size="small"
                              variant="standard"
                              fullWidth
                              inputProps={{ style: { fontSize: "0.875rem" } }}
                              disabled={!selectedSchool}
                              placeholder="0" />
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ backgroundColor: "#f0f8ff" }}
                          >
                            <Chip
                              label="Darab"
                              size="small"
                              variant="outlined"
                              sx={{
                                fontSize: "0.7rem",
                                backgroundColor: "white",
                                borderColor: "#1976d2",
                                color: "#1976d2",
                              }}
                            />
                          </TableCell>
                          {schoolYears.map((yr) => {
                            const startYear = parseInt(yr.split("/")[0], 10);
                            const val = group.years[startYear]?.darabszam ?? 0;
                            return (
                              <TableCell key={yr} align="center">
                                <ZeroHidingTextField
                                  type="number"
                                  value={val || 0}
                                  onChange={(e) =>
                                    handleIntezményiCountChange(
                                      group.groupId,
                                      startYear,
                                      e.target.value,
                                    )
                                  }
                                  size="small"
                                  inputProps={{
                                    min: 0,
                                    style: { textAlign: "center" },
                                  }}
                                  sx={{ width: 70 }}
                                  disabled={!selectedSchool}
                                  placeholder="0" />
                              </TableCell>
                            );
                          })}
                          <TableCell align="center">
                            <LockedTableWrapper tableName="intezmenyi_nevelesi_mutatok">
                              <Tooltip title="Díj törlése">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteDij(group.groupId)}
                                  disabled={!selectedSchool}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </LockedTableWrapper>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* ──────────────────────────────────────────────────────────────────────
            SZEKCIÓ 2: Munkavállalók díjai (fix 7 sor)
        ─────────────────────────────────────────────────────────────────────── */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
              flexWrap="wrap"
              gap={1}
            >
              <Typography
                variant="h6"
                component="h2"
                sx={{ color: "#1976d2", fontWeight: "bold" }}
              >
                Munkavállalók által elnyert díjak, elismerések, kitüntetésre
                való felterjesztések
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", }}>
                <LockedTableWrapper tableName="intezmenyi_nevelesi_mutatok">
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleMunkavallalokSave}
                    disabled={!munkavallalokModified || !selectedSchool}
                    size="small"
                  >
                    Mentés
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<HistoryIcon />}
                    onClick={() => setHistoryMunkavallalokOpen(true)}
                    disabled={!selectedSchool}
                    size="small"
                  >
                    Előzmények
                  </Button>
                </LockedTableWrapper>
                <ExportToExcel
                  fileName="munkavallalok_elismeresek"
                  sheetName="Munkavállalói díjak"
                  columns={[
                    {
                      header: "Elismerés típusa",
                      key: "kategoriak",
                      width: 40,
                    },
                    ...schoolYears.map((yr) => ({
                      header: yr,
                      key: yr,
                      width: 16,
                    })),
                  ]}
                  rows={munkavallalokExportRows}
                  buttonLabel="Export"
                  buttonSx={{ height: 30, fontSize: "0.75rem" }}
                />
              </Stack>
            </Stack>

            {munkavallalokModified && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Mentetlen módosítások vannak!
              </Alert>
            )}

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ overflowX: "auto" }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#fff3e0" }}>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 260 }}>
                      Elismerés típusa
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        minWidth: 100,
                        backgroundColor: "#f0f8ff",
                      }}
                    >
                      Információk
                    </TableCell>
                    {schoolYears.map((year) => (
                      <TableCell
                        key={year}
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          minWidth: 110,
                          backgroundColor: "#f0f8ff",
                        }}
                      >
                        {year}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Összesítő sor a munkavállalóknál is */}
                  <TableRow sx={{ backgroundColor: "#fff3e0" }}>
                    <TableCell sx={{ fontWeight: "bold", color: "#d32f2f" }}>
                      Munkavállalók által elnyert díjak, elismerések – összesen
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ backgroundColor: "#f0f8ff" }}
                    >
                      <Chip
                        label="Összesen"
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    {schoolYears.map((yearStr) => {
                      const startYear = parseInt(yearStr.split("/")[0], 10);
                      const rec = munkavallalokData[startYear] ?? {};
                      const sum = MUNKAVALLALOI_KATEGORIAK.reduce(
                        (acc, k) => acc + (rec[k.key] || 0),
                        0,
                      );
                      return (
                        <TableCell
                          key={yearStr}
                          align="center"
                          sx={{ fontWeight: "bold" }}
                        >
                          {formatHuNum(sum)}
                        </TableCell>
                      );
                    })}
                  </TableRow>

                  {/* Fix 7 sor */}
                  {MUNKAVALLALOI_KATEGORIAK.map((kat, idx) => (
                    <TableRow
                      key={kat.key}
                      sx={{
                        backgroundColor: idx % 2 === 0 ? "#f5f5f5" : "white",
                        "&:hover": { backgroundColor: "#f5f5f5" },
                      }}
                    >
                      <TableCell sx={{ pl: 3 }}>{formatHuNum(kat.label)}</TableCell>
                      <TableCell
                        align="center"
                        sx={{ backgroundColor: "#f0f8ff" }}
                      >
                        <Chip
                          label="Darab"
                          size="small"
                          variant="outlined"
                          sx={{
                            backgroundColor: "white",
                            borderColor: "#1976d2",
                            color: "#1976d2",
                            fontSize: "0.75rem",
                          }}
                        />
                      </TableCell>
                      {schoolYears.map((yearStr) => {
                        const startYear = parseInt(yearStr.split("/")[0], 10);
                        const val =
                          munkavallalokData[startYear]?.[kat.key] ?? 0;
                        return (
                          <TableCell key={yearStr} align="center">
                            <ZeroHidingTextField
                              type="number"
                              value={val || 0}
                              onChange={(e) =>
                                handleMunkavallalokChange(
                                  startYear,
                                  kat.key,
                                  e.target.value,
                                )
                              }
                              size="small"
                              inputProps={{
                                min: 0,
                                step: 1,
                                style: { textAlign: "center" },
                              }}
                              sx={{ width: 75 }}
                              placeholder="0"
                              disabled={!selectedSchool}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      {/* ─── Díj hozzáadása dialog ──────────────────────────────────────────── */}
      <Dialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Új intézményi díj / elismerés hozzáadása</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <ZeroHidingTextField
              label="Díj / elismerés neve"
              value={newDijNeve || 0}
              onChange={(e) => setNewDijNeve(e.target.value)}
              fullWidth
              required
              autoFocus
              placeholder="pl. Szakképzési Kiválóság Díja" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenAddDialog(false);
              setNewDijNeve("");
            }}
          >
            Mégsem
          </Button>
          <Button
            variant="contained"
            onClick={handleAddDij}
            disabled={!newDijNeve.trim()}
          >
            Hozzáadás
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Snackbar ─────────────────────────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <HistoryDialog
        open={historyIntezmenyiOpen}
        onClose={() => setHistoryIntezmenyiOpen(false)}
        alapadatokId={selectedSchool?.id}
        tableName="intezmenyi_elismeresek"
        onRollbackSuccess={() => {
          showSnackbar("Sikeres visszaállítás az előzményekből!");
          refetchIntézményiElismeresek();
        }}
      />

      <HistoryDialog
        open={historyMunkavallalokOpen}
        onClose={() => setHistoryMunkavallalokOpen(false)}
        alapadatokId={selectedSchool?.id}
        tableName="munkavallalok_elismeresek"
        onRollbackSuccess={() => {
          showSnackbar("Sikeres visszaállítás az előzményekből!");
          refetchMunkavallalokElismeresek();
        }}
      />
    </PageWrapper>
  );
}
