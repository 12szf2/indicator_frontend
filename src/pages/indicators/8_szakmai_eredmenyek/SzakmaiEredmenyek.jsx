import { formatHuNum } from "../../../utils/formatters";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import {
  useGetVersenyekQuery,
  useGetVersenyKategoriakQuery,
  useGetTanuloLetszamQuery,
  useAddVersenyekMutation,
  useUpdateVersenyekMutation,
  useDeleteVersenyekMutation,
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
  Container,
  Fade,
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
  Card,
  CardContent,
  Chip,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { generateSchoolYears } from "../../../utils/schoolYears";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoSzakmaiEredmenyek from "./info_szakmai_eredmenyek";
import TitleSzakmaiEredmenyek from "./title_szakmai_eredmenyek";
import ExportToExcel from "../../../components/ExportToExcel";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

export default function SzakmaiEredmenyek() {
  // Predefined competition categories
  const competitionCategories = [
    "Nemzetközi szakmai verseny",
    "Nemzetközi közismereti verseny",
    "Nemzetközi sportverseny",
    "Hazai országos szakmai tanulmányi versenyek",
    "Regionális, megyei szakmai tanulmányi verseny",
    "Országos Közismereti Tanulmányi Verseny",
    "Regionális, megyei közismereti tanulmányi verseny",
    "Emlékévhez kapcsolódó országos műveltségi versenyek",
    "Hazai országos sportversenyek",
    "Hazai, megyei sportversenyek",
  ];

  const schoolYears = useMemo(() => generateSchoolYears(), []);
  const placementTypes = [
    { key: "1_helyezett", label: "1. helyezés", color: "#FFD700" },
    { key: "1-3_helyezett", label: "1-3. helyezés", color: "#C0C0C0" },
    {
      key: "dontobeJutott",
      label: "1-10. helyezés/döntőbe jutás",
      color: "#CD7F32",
    },
    {
      key: "versenyre_nevezettek",
      label: "Versenyre nevezettek száma",
      color: "#E8E8E8",
    },
  ];

  const createInitialData = () => {
    return {};
  };

  const selectedSchool = useSelector(selectSelectedSchool);
  const [competitionData, setCompetitionData] = useState(createInitialData());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [originalData, setOriginalData] = useState(createInitialData());
  const [allIdsMap, setAllIdsMap] = useState({});
  const [competitionCreatedAtMap, setCompetitionCreatedAtMap] = useState({});
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [competitionToDelete, setCompetitionToDelete] = useState(null);
  const [newCompetition, setNewCompetition] = useState({
    category: "",
    name: "",
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const {
    data: rawDbData,
    isLoading,
    isFetching,
    refetch: refetchVersenyek,
  } = useGetVersenyekQuery(
    { alapadatok_id: selectedSchool?.id },
    { skip: !selectedSchool },
  );

  const dbData = useMemo(() => rawDbData || [], [rawDbData]);

  const [addVersenyek] = useAddVersenyekMutation();
  const [updateVersenyek] = useUpdateVersenyekMutation();
  const [deleteVersenyek] = useDeleteVersenyekMutation();

  const { data: kategoriak } = useGetVersenyKategoriakQuery();
  const { data: tanuloLetszamData } = useGetTanuloLetszamQuery(
    { alapadatok_id: selectedSchool?.id },
    { skip: !selectedSchool?.id },
  );

  const categoryOrderMap = useMemo(() => {
    const orderMap = {};
    competitionCategories.forEach((category, index) => {
      orderMap[category] = index;
    });
    return orderMap;
  }, [competitionCategories]);

  // Build UUID -> name map from backend categories
  const kategoriaMap = useMemo(() => {
    if (!kategoriak) return {};
    const map = {};
    kategoriak.forEach((k) => {
      map[k.id] = k.nev;
    });
    return map;
  }, [kategoriak]);

  useEffect(() => {
    if (dbData && !isFetching) {
      const newCompData = createInitialData();
      const originalCompData = createInitialData();
      const createdAtMap = {};
      const idsMap = {};

      if (Array.isArray(dbData)) {
        dbData.forEach((item) => {
          const categoryKey =
            kategoriaMap[item.versenyNev?.kategoria_id] ||
            item.versenyNev?.kategoria_id ||
            "Ismeretlen kategória";
          const competitionName = item.versenyNev?.nev || "Ismeretlen verseny";
          const competitionCreatedAt =
            item.versenyNev?.createAt || item.createAt || "";

          // Collect all IDs for this key (handles duplicates)
          const mapKey = `${categoryKey}::${competitionName}`;
          if (!idsMap[mapKey]) idsMap[mapKey] = [];
          if (item.id) idsMap[mapKey].push(item.id);

          if (!newCompData[categoryKey]) newCompData[categoryKey] = {};
          if (!newCompData[categoryKey][competitionName]) {
            newCompData[categoryKey][competitionName] = {};
            schoolYears.forEach((year) => {
              newCompData[categoryKey][competitionName][year] = {
                "1_helyezett": "0",
                "1-3_helyezett": "0",
                dontobeJutott: "0",
                versenyre_nevezettek: "0",
              };
            });
          }

          if (!createdAtMap[categoryKey]) createdAtMap[categoryKey] = {};
          if (!createdAtMap[categoryKey][competitionName]) {
            createdAtMap[categoryKey][competitionName] = competitionCreatedAt;
          }

          const yearData = {
            id: item.id,
            versenyNev_id: item.versenyNev?.id,
            "1_helyezett": item.helyezett_1?.toString() || "0",
            "1-3_helyezett": item.helyezett_1_3?.toString() || "0",
            dontobeJutott: item.dontobeJutott?.toString() || "0",
            versenyre_nevezettek: item.nevezettekSzama?.toString() || "0",
          };

          const yearRange = `${item.tanev_kezdete}/${item.tanev_kezdete + 1}`;
          newCompData[categoryKey][competitionName][yearRange] = {
            ...yearData,
          };

          if (!originalCompData[categoryKey])
            originalCompData[categoryKey] = {};
          if (!originalCompData[categoryKey][competitionName])
            originalCompData[categoryKey][competitionName] = {};
          originalCompData[categoryKey][competitionName][yearRange] = {
            ...yearData,
          };
        });
      }

      setCompetitionData(newCompData);
      setOriginalData(originalCompData);
      setAllIdsMap(idsMap);
      setCompetitionCreatedAtMap(createdAtMap);
      setIsModified(false);
    }
  }, [dbData, isFetching, kategoriaMap]);

  const handleDataChange = useCallback(
    (category, competition, year, placement, value) => {
      setCompetitionData((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          [competition]: {
            ...prev[category][competition],
            [year]: {
              ...prev[category][competition][year],
              [placement]: value,
            },
          },
        },
      }));
      setIsModified(true);
    },
    [],
  );

  const handleAddCompetition = useCallback(async () => {
    if (!newCompetition.category || !newCompetition.name || !selectedSchool)
      return;

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
        verseny_neve: newCompetition.name,
        kategoria: newCompetition.category,
        tanev_kezdete: defaultStartYear,
        helyezett_1: 0,
        helyezett_1_3: 0,
        dontobeJutott: 0,
        nevezettekSzama: 0,
      };

      await addVersenyek(recordData).unwrap();

      setOpenAddDialog(false);
      setNewCompetition({ category: "", name: "" });
      setSnackbarMessage("Verseny sikeresen hozzáadva!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Hiba verseny hozzáadásakor:", error);
      setSnackbarMessage("Hiba történt a verseny hozzáadása során!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [newCompetition, selectedSchool, addVersenyek, schoolYears]);

  const handleRemoveCompetition = useCallback((category, competition) => {
    setCompetitionToDelete({ category, competition });
    setOpenDeleteDialog(true);
  }, []);

  const handleConfirmDeleteCompetition = useCallback(async () => {
    if (!competitionToDelete) return;

    const { category, competition } = competitionToDelete;

    try {
      // Delete all IDs associated with this key (including duplicates)
      const mapKey = `${category}::${competition}`;
      const idsToDelete = allIdsMap[mapKey] || [];
      const promises = idsToDelete.map((id) => deleteVersenyek(id).unwrap());
      if (promises.length > 0) await Promise.all(promises);

      const updatedData = { ...competitionData };
      delete updatedData[category][competition];
      setCompetitionData(updatedData);

      const updatedOriginal = { ...originalData };
      if (updatedOriginal[category]) {
        delete updatedOriginal[category][competition];
      }
      setOriginalData(updatedOriginal);

      const updatedCreatedAtMap = { ...competitionCreatedAtMap };
      if (updatedCreatedAtMap[category]) {
        delete updatedCreatedAtMap[category][competition];
      }
      setCompetitionCreatedAtMap(updatedCreatedAtMap);

      const updatedIdsMap = { ...allIdsMap };
      delete updatedIdsMap[mapKey];
      setAllIdsMap(updatedIdsMap);

      setSnackbarMessage("Sikeresen törölve!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setOpenDeleteDialog(false);
      setCompetitionToDelete(null);
    } catch (error) {
      console.error("Hiba törlés közben:", error);
      setSnackbarMessage("Hiba történt a törlés során!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [
    competitionData,
    originalData,
    allIdsMap,
    deleteVersenyek,
    competitionToDelete,
    competitionCreatedAtMap,
  ]);

  const isFieldModified = (category, competition, year, placement) => {
    const orig =
      originalData[category]?.[competition]?.[year]?.[placement] || "0";
    const curr =
      competitionData[category]?.[competition]?.[year]?.[placement] || "0";
    return orig !== curr;
  };

  const handleSave = async () => {
    if (!selectedSchool) return;
    setIsSaving(true);
    let updatedCount = 0;
    let savedCount = 0;

    console.log(
      "[handleSave] competitionData keys:",
      Object.keys(competitionData),
    );
    console.log("[handleSave] originalData keys:", Object.keys(originalData));

    try {
      const promises = [];

      Object.keys(competitionData).forEach((category) => {
        Object.keys(competitionData[category]).forEach((competition) => {
          schoolYears.forEach((year) => {
            let rowModified = false;

            // Ha a verseny nincs benne az eredeti adatokban, de mi hozzáadtuk, mentsük el mindet
            const isNewCompetition = !originalData[category]?.[competition];

            if (isNewCompetition) {
              rowModified = false; // Már elmentettük a dialógnál, skip
            } else {
              placementTypes.forEach((placement) => {
                if (isFieldModified(category, competition, year, placement.key))
                  rowModified = true;
              });
            }

            console.log(
              `[handleSave] ${category} / ${competition} / ${year}: isNewCompetition=${isNewCompetition}, rowModified=${rowModified}`,
            );

            if (rowModified) {
              const yearData = competitionData[category][competition][year];
              const id = originalData[category]?.[competition]?.[year]?.id;

              const recordData = {
                alapadatok_id: selectedSchool.id,
                tanev_kezdete: parseInt(year.split("/")[0]),
                helyezett_1: parseInt(yearData["1_helyezett"] || 0),
                helyezett_1_3: parseInt(yearData["1-3_helyezett"] || 0),
                dontobeJutott: parseInt(yearData["dontobeJutott"] || 0),
                nevezettekSzama: parseInt(
                  yearData["versenyre_nevezettek"] || 0,
                ),
              };

              if (id) {
                promises.push(
                  updateVersenyek({ id, ...recordData })
                    .unwrap()
                    .then(() => {
                      updatedCount++;
                    }),
                );
              } else {
                promises.push(
                  addVersenyek({
                    ...recordData,
                    verseny_neve: competition,
                    kategoria: category,
                  })
                    .unwrap()
                    .then(() => {
                      savedCount++;
                    }),
                );
              }
            }
          });
        });
      });

      if (promises.length > 0) {
        console.log("[handleSave] sending", promises.length, "requests");
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

      // We don't manually setOriginalData here because useGetVersenyekQuery will refetch
      // due to invalidatesTags in RTK Query, which will update originalData automatically.
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
    setCompetitionData(JSON.parse(JSON.stringify(originalData)));
    setIsModified(false);
  }, [originalData]);

  // Calculate totals - memoized to prevent recalculation on every render
  const totals = useMemo(() => {
    const calculatedTotals = {};
    schoolYears.forEach((year) => {
      const startYear = parseInt(year.split("/")[0], 10);
      calculatedTotals[startYear] = {};
      placementTypes.forEach((placement) => {
        let sum = 0;
        Object.keys(competitionData).forEach((category) => {
          Object.keys(competitionData[category]).forEach((competition) => {
            sum += parseInt(
              competitionData[category][competition][year]?.[placement.key] ||
              0,
              10,
            );
          });
        });
        calculatedTotals[startYear][placement.key] = sum;
      });
    });
    return calculatedTotals;
  }, [competitionData, schoolYears, placementTypes]);

  const tanuloiLetszamByYear = useMemo(() => {
    const result = {};
    schoolYears.forEach((year) => {
      const startYear = parseInt(year.split("/")[0], 10);
      result[startYear] = 0;
    });

    if (!Array.isArray(tanuloLetszamData)) {
      return result;
    }

    tanuloLetszamData.forEach((record) => {
      const startYear = record?.tanev_kezdete;
      if (typeof startYear !== "number") return;
      if (record?.jogv_tipus !== 0) return;

      const letszam = Number(record?.letszam) || 0;
      result[startYear] = (result[startYear] || 0) + letszam;
    });

    return result;
  }, [schoolYears, tanuloLetszamData]);

  // Show loading state
  return (
    <PageWrapper
      titleContent={<TitleSzakmaiEredmenyek />}
      infoContent={<InfoSzakmaiEredmenyek />}
    >
      <PageLoadingOverlay isLoading={isLoading || isFetching} />
      <Box>
        <LockStatusIndicator tableName="versenyek" />

        {!selectedSchool && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Kérjük, válasszon egy intézményt a fenti legördülő menüből az adatok
            szerkesztéséhez és megtekintéséhez.
          </Alert>
        )}

        {/* Add Competition Button */}
        <Stack direction="row" spacing={2} sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mt: 3, mb: 3 }}>
          <LockedTableWrapper tableName="versenyek">
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setOpenAddDialog(true)}
            >
              Új verseny hozzáadása
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
            fileName="szakmai_eredmenyek"
            sheetName="Versenyek"
            columns={[
              { header: "Kategória", key: "kategoria", width: 35 },
              { header: "Verseny neve", key: "verseny", width: 40 },
              ...schoolYears.flatMap((year) =>
                placementTypes.map((p) => ({
                  header: `${year} – ${p.label}`,
                  key: `${year}__${p.key}`,
                  width: 20,
                })),
              ),
            ]}
            rows={Object.keys(competitionData).flatMap((category) =>
              Object.keys(competitionData[category]).map((competition) => {
                const row = { kategoria: category, verseny: competition };
                schoolYears.forEach((year) => {
                  placementTypes.forEach((p) => {
                    row[`${year}__${p.key}`] =
                      competitionData[category][competition][year]?.[p.key] ??
                      0;
                  });
                });
                return row;
              }),
            )}
            groups={[
              [
                { label: "", colSpan: 2 },
                ...schoolYears.map((year) => ({
                  label: year,
                  colSpan: placementTypes.length,
                })),
              ],
            ]}
            buttonLabel="Export Táblázatba"
          />
        </Stack>

        <Typography variant="h6" component="h2" gutterBottom sx={{ ml: 2 }}>
          Szakmai és Közismereti Versenyek Eredményei
        </Typography>

        <TableContainer
          component={Paper}
          sx={{ maxWidth: "100%", overflowX: "auto" }}
        >
          <Table size="small" sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  rowSpan={2}
                  sx={{
                    fontWeight: "bold",
                    minWidth: 250,
                    borderRight: "2px solid #e0e0e0",
                    position: "sticky",
                    left: 0,
                    backgroundColor: "#ffffff",
                    zIndex: 3,
                    verticalAlign: "middle",
                  }}
                >
                  Verseny megnevezése
                </TableCell>
                {schoolYears.map((year, i) => (
                  <TableCell
                    key={`${year}-header`}
                    align="center"
                    colSpan={4}
                    sx={{
                      fontWeight: "bold",
                      backgroundColor: "#fff3e0",
                      borderBottom: "1px solid #e0e0e0",
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
                    minWidth: 80,
                    backgroundColor: "#ffffff",
                    zIndex: 3,
                    verticalAlign: "middle",
                    minWidth: 60,
                    textAlign: "center",
                    position: "sticky",
                    right: 0,
                    backgroundColor: "#f5f5f5",
                    zIndex: 2,
                    boxShadow: "-2px 0 5px -2px rgba(0,0,0,0.1)",
                  }}
                >
                  Művelet
                </TableCell>
              </TableRow>
              <TableRow>
                {schoolYears.map((year, i) => (
                  <React.Fragment key={`${year}-metric-head`}>
                    {placementTypes.map((placement, j) => (
                      <TableCell
                        key={`head-${year}-${placement.key}`}
                        align="center"
                        sx={{
                          fontWeight: 600,
                          backgroundColor: placement.color,
                          borderBottom: "2px solid #e0e0e0",
                          borderRight:
                            j === placementTypes.length - 1 &&
                              i !== schoolYears.length - 1
                              ? "2px solid #e0e0e0"
                              : "1px solid #e0e0e0",
                          minWidth: 90,
                          fontSize: "0.75rem",
                          lineHeight: 1.2,
                        }}
                      >
                        {formatHuNum(placement.label)}
                      </TableCell>
                    ))}
                  </React.Fragment>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Totals Row */}
              <TableRow sx={{ backgroundColor: "#fff3e0" }}>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    borderRight: "2px solid #e0e0e0",
                    position: "sticky",
                    left: 0,
                    backgroundColor: "#fff3e0",
                    zIndex: 1,
                  }}
                >
                  Összesen
                </TableCell>
                {schoolYears.map((year, i) => {
                  const startYear = parseInt(year.split("/")[0], 10);
                  return (
                    <React.Fragment key={`total-${year}-metrics`}>
                      {placementTypes.map((placement, j) => (
                        <TableCell
                          key={`tot-${year}-${placement.key}`}
                          align="center"
                          sx={{
                            fontWeight: "bold",
                            borderRight:
                              j === placementTypes.length - 1 &&
                                i !== schoolYears.length - 1
                                ? "2px solid #e0e0e0"
                                : "1px solid #e0e0e0",
                          }}
                        >
                          {formatHuNum(totals[startYear]?.[placement.key] || 0)}
                        </TableCell>
                      ))}
                    </React.Fragment>
                  );
                })}
                <TableCell></TableCell>
              </TableRow>

              {/* Data Rows */}
              {Object.keys(competitionData)
                .sort((a, b) => {
                  const aOrder = categoryOrderMap[a] ?? Number.MAX_SAFE_INTEGER;
                  const bOrder = categoryOrderMap[b] ?? Number.MAX_SAFE_INTEGER;
                  if (aOrder !== bOrder) return aOrder - bOrder;
                  return a.localeCompare(b, "hu");
                })
                .map((category) => {
                  const competitions = Object.keys(
                    competitionData[category],
                  ).sort((a, b) => {
                    const aCreatedAt =
                      competitionCreatedAtMap[category]?.[a] || "";
                    const bCreatedAt =
                      competitionCreatedAtMap[category]?.[b] || "";
                    const aTs = Date.parse(aCreatedAt);
                    const bTs = Date.parse(bCreatedAt);
                    const aHasDate = !Number.isNaN(aTs);
                    const bHasDate = !Number.isNaN(bTs);

                    if (aHasDate && bHasDate && aTs !== bTs) return aTs - bTs;
                    if (aHasDate !== bHasDate) return aHasDate ? -1 : 1;
                    return a.localeCompare(b, "hu");
                  });
                  return competitions.map((competition, index) => (
                    <TableRow key={`${category}-${competition}`} hover>
                      <TableCell
                        sx={{
                          borderRight: "2px solid #e0e0e0",
                          position: "sticky",
                          left: 0,
                          backgroundColor: "#fff",
                          zIndex: 1,
                        }}
                      >
                        {index === 0 && (
                          <Typography
                            variant="subtitle2"
                            color="primary"
                            sx={{ fontWeight: "bold", mb: 0.5 }}
                          >
                            {category}
                          </Typography>
                        )}
                        <Box sx={{ pl: 2, fontSize: "0.875rem" }}>
                          {competition}
                        </Box>
                      </TableCell>
                      {schoolYears.map((year) =>
                        placementTypes.map((placement) => (
                          <TableCell
                            key={`${year}-${placement.key}`}
                            align="center"
                          >
                            <ZeroHidingTextField
                              type="number"
                              value={competitionData[category][competition][year]?.[
                                placement.key
                              ] || 0}
                              onChange={(e) =>
                                handleDataChange(
                                  category,
                                  competition,
                                  year,
                                  placement.key,
                                  e.target.value,
                                )
                              }
                              size="small"
                              inputProps={{
                                min: 0,
                                style: { textAlign: "center" },
                              }}
                              sx={{
                                width: "60px",
                                backgroundColor: isFieldModified(
                                  category,
                                  competition,
                                  year,
                                  placement.key,
                                )
                                  ? "#fff9c4"
                                  : "inherit",
                              }}
                              placeholder="0" />
                          </TableCell>
                        )),
                      )}
                      <TableCell
                        align="center"
                        sx={{
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
                          onClick={() =>
                            handleRemoveCompetition(category, competition)
                          }
                          disabled={!selectedSchool}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ));
                })}

              {/* Totals Row */}
              <TableRow sx={{ backgroundColor: "#fff3e0", fontWeight: "bold" }}>
                <TableCell
                  sx={{
                    position: "sticky",
                    left: 0,
                    fontWeight: "bold",

                    backgroundColor: "#fff3e0",
                    boxShadow: "-2px 0 5px -2px rgba(0,0,0,0.1)",
                    zIndex: 10,
                  }}
                >
                  Összesen
                </TableCell>
                {schoolYears.map((year) =>
                  placementTypes.map((placement) => (
                    <TableCell
                      key={`total-${year}-${placement.key}`}
                      align="center"
                      sx={{ fontWeight: "bold" }}
                    >
                      {formatHuNum(totals[parseInt(year.split("/")[0], 10)]?.[
                        placement.key
                      ] || 0)}
                    </TableCell>
                  )),
                )}
                <TableCell
                  sx={{
                    position: "sticky",
                    right: 0,
                    backgroundColor: "#fff3e0",
                    boxShadow: "-2px 0 5px -2px rgba(0,0,0,0.1)",
                    zIndex: 1000,
                  }}
                ></TableCell>
              </TableRow>

              {/* Summary Row */}
              <TableRow sx={{ backgroundColor: "#f0f8ff" }}>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    position: "sticky",
                    left: 0,
                    backgroundColor: "#f0f8ff",
                    boxShadow: "-2px 0 5px -2px rgba(0,0,0,0.1)",
                    zIndex: 1,
                  }}
                >
                  Tanulói jogviszonyban álló tanulók száma (fő)
                </TableCell>
                {schoolYears.map((year, i) => {
                  const startYear = parseInt(year.split("/")[0], 10);
                  return (
                    <TableCell
                      key={`summary-${year}`}
                      align="center"
                      colSpan={placementTypes.length}
                      sx={{
                        borderRight:
                          i === schoolYears.length - 1
                            ? "none"
                            : "2px solid #e0e0e0",
                      }}
                    >
                      <ZeroHidingTextField
                        type="number"
                        size="small"
                        value={tanuloiLetszamByYear[startYear] || 0}
                        inputProps={{
                          readOnly: true,
                          style: { textAlign: "center" },
                        }}
                        sx={{ width: "90px" }}
                        placeholder="0" />
                    </TableCell>
                  );
                })}
                <TableCell
                  sx={{
                    position: "sticky",
                    right: 0,
                    backgroundColor: "#f0f8ff",
                    boxShadow: "-2px 0 5px -2px rgba(0,0,0,0.1)",
                    zIndex: 1,
                  }}
                ></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Action Buttons */}

        {/* Status Messages */}
        {isModified && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Mentetlen módosítások vannak. Ne felejtsd el menteni a
            változtatásokat!
          </Alert>
        )}

        {/* Add Competition Dialog */}
        <Dialog
          open={openAddDialog}
          onClose={() => setOpenAddDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Új verseny hozzáadása</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Kategória</InputLabel>
                <Select
                  value={newCompetition.category}
                  onChange={(e) =>
                    setNewCompetition({
                      ...newCompetition,
                      category: e.target.value,
                    })
                  }
                  label="Kategória"
                >
                  {competitionCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <ZeroHidingTextField
                fullWidth
                label="Verseny neve"
                value={newCompetition.name || 0}
                onChange={(e) =>
                  setNewCompetition({ ...newCompetition, name: e.target.value })
                }
                placeholder="pl. Új verseny neve"
                placeholder="0" />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)}>Mégse</Button>
            <Button
              onClick={handleAddCompetition}
              variant="contained"
              disabled={!newCompetition.category || !newCompetition.name}
            >
              Hozzáadás
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={openDeleteDialog}
          onClose={() => {
            setOpenDeleteDialog(false);
            setCompetitionToDelete(null);
          }}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Verseny törlése</DialogTitle>
          <DialogContent>
            <Typography>
              Biztosan törölni szeretnéd a(z){" "}
              {competitionToDelete?.competition || ""} versenyt?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setOpenDeleteDialog(false);
                setCompetitionToDelete(null);
              }}
            >
              Mégse
            </Button>
            <Button
              onClick={handleConfirmDeleteCompetition}
              color="error"
              variant="contained"
            >
              Törlés
            </Button>
          </DialogActions>
        </Dialog>

        {/* Legend */}
        <Card sx={{ mt: 3, backgroundColor: "#f5f5f5" }}>
          <CardContent>
            <Typography variant="h6" component="h3" gutterBottom>
              Jelmagyarázat
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
              {placementTypes.map((placement) => (
                <Chip
                  key={placement.key}
                  label={placement.label}
                  variant="outlined"
                  sx={{ backgroundColor: placement.color }}
                />
              ))}
            </Stack>
            <Typography variant="body2">
              A táblázat a különböző szintű versenyeken elért eredményeket
              mutatja be tanévenként. Új versenyek hozzáadhatók a "Új verseny
              hozzáadása" gombbal.
            </Typography>
          </CardContent>
        </Card>
      </Box>

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

      <HistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        alapadatokId={selectedSchool?.id}
        tableName="versenyek"
        onRollbackSuccess={() => {
          setSnackbarMessage("Sikeres visszaállítás az előzményekből!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
          refetchVersenyek();
        }}
      />
    </PageWrapper>
  );
}
