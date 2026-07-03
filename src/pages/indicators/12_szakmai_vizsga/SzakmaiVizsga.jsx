import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
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
  Snackbar,
  Container,
  Fade,
  Divider,
  Card,
  CardContent,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import { generateSchoolYears } from "../../../utils/schoolYears";
import {
  useGetAllSzakmaiVizsgaEredmenyekQuery,
  useAddSzakmaiVizsgaEredmenyekMutation,
  useUpdateSzakmaiVizsgaEredmenyekMutation,
  useGetAllAlapadatokQuery,
} from "../../../store/api/apiSlice";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoSzakmaiVizsga from "./info_szakmai_vizsga";
import TitleSzakmaiVizsga from "./title_szakmai_vizsga";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

const evszamok = generateSchoolYears();
const numberFormatter = new Intl.NumberFormat("hu-HU");

export default function SzakmaiVizsga() {
  const selectedSchool = useSelector(selectSelectedSchool);

  // API Hooks
  const { data: schoolsData, isLoading: isLoadingSchools } =
    useGetAllAlapadatokQuery();
  const {
    data: apiData,
    error: fetchError,
    isLoading: isFetching,
    refetch,
  } = useGetAllSzakmaiVizsgaEredmenyekQuery();
  const [addData, { isLoading: isAdding }] =
    useAddSzakmaiVizsgaEredmenyekMutation();
  const [updateData, { isLoading: isUpdating }] =
    useUpdateSzakmaiVizsgaEredmenyekMutation();

  // Component State
  const [tableData, setTableData] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savedData, setSavedData] = useState(null);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // Generate categories (szakmák) from the selected school's alapadatok
  const { szakmaRows, programMap } = useMemo(() => {
    if (!schoolsData) return { szakmaRows: [], programMap: {} };

    const relevantSchools = selectedSchool
      ? schoolsData.filter((s) => s.id === selectedSchool.id)
      : schoolsData;

    const rows = [];
    const map = {};

    relevantSchools.forEach((school) => {
      if (
        school.alapadatok_szakirany &&
        Array.isArray(school.alapadatok_szakirany)
      ) {
        school.alapadatok_szakirany.forEach((sz) => {
          const szakiranyId = sz.szakirany_id || sz.szakirany?.id;

          if (
            sz.szakirany?.szakma &&
            Array.isArray(sz.szakirany.szakma) &&
            sz.szakirany.szakma.length > 0
          ) {
            sz.szakirany.szakma.forEach((szm) => {
              const szakmaId = szm.szakma_id || szm.szakma?.id;
              const szakmaNev = szm.szakma?.nev || szm.szakma?.megnevezes;
              if (szakmaNev) {
                const key = `szakma_${szakmaId}_${szakiranyId}`;
                if (!map[key]) {
                  rows.push({ key, label: szakmaNev });
                  map[key] = {
                    szakirany_id: szakiranyId,
                    szakma_id: szakmaId,
                    alapadatok_id: school.id,
                  };
                }
              }
            });
          } else if (szakiranyId) {
            const key = `szakirany_${szakiranyId}`;
            if (!map[key]) {
              rows.push({
                key,
                label: `Szakirány: ${sz.szakirany?.nev || "Ismeretlen"}`,
              });
              map[key] = {
                szakirany_id: szakiranyId,
                szakma_id: null,
                alapadatok_id: school.id,
              };
            }
          }
        });
      }
    });

    rows.sort((a, b) => a.label.localeCompare(b.label));
    return { szakmaRows: rows, programMap: map };
  }, [schoolsData, selectedSchool]);

  // Load API data into tableData state
  useEffect(() => {
    if (apiData) {
      const initialData = {};

      const relevantData = selectedSchool
        ? apiData.filter((item) => item.alapadatok_id === selectedSchool.id)
        : apiData;

      relevantData.forEach((item) => {
        const year = item.tanev_kezdete;
        const szakmaId = item.szakma_id || item.szakma?.id;
        const szakiranyId = item.szakirany_id || item.szakirany?.id;
        const key = szakmaId
          ? `szakma_${szakmaId}_${szakiranyId}`
          : `szakirany_${szakiranyId}`;

        if (!initialData[key]) initialData[key] = {};
        initialData[key][year] = {
          id: item.id,
          vizsgara_bocsathatoak_szama: item.vizsgara_bocsathatoak_szama ?? "",
          sikeres_vizsgazok_szama: item.sikeres_vizsgazok_szama ?? "",
        };
      });

      setTableData(initialData);
      setSavedData(JSON.parse(JSON.stringify(initialData)));
      setIsModified(false);
    }
  }, [apiData, selectedSchool]);

  // Handle Input Changes
  const handleDataChange = (key, yearStr, field, value) => {
    const year = parseInt(yearStr, 10);
    const parsed = parseInt(value, 10);
    const numValue = isNaN(parsed) ? "" : Math.max(0, parsed);

    setTableData((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [year]: {
          ...(prev[key]?.[year] || {}),
          [field]: numValue,
        },
      },
    }));
    setIsModified(true);
  };

  const handleResetData = () => {
    if (savedData) {
      setTableData(JSON.parse(JSON.stringify(savedData)));
      setIsModified(false);
    }
  };

  // Helper functions for summary
  const getNumericValue = useCallback(
    (key, year, field) => {
      if (key === "Összesen") {
        return szakmaRows.reduce((sum, row) => {
          const rawValue = tableData[row.key]?.[year]?.[field];
          const parsed = parseInt(rawValue, 10);
          return sum + (isNaN(parsed) ? 0 : parsed);
        }, 0);
      }
      const rawValue = tableData[key]?.[year]?.[field];
      const parsed = parseInt(rawValue, 10);
      return isNaN(parsed) ? 0 : parsed;
    },
    [szakmaRows, tableData],
  );

  const getRatio = useCallback(
    (key, year) => {
      const success = getNumericValue(key, year, "sikeres_vizsgazok_szama");
      const eligible = getNumericValue(
        key,
        year,
        "vizsgara_bocsathatoak_szama",
      );
      if (!eligible) {
        return "0.00";
      }
      return ((success / eligible) * 100).toFixed(2);
    },
    [getNumericValue],
  );

  const formatCount = (value) => numberFormatter.format(Math.round(value) || 0);

  // Save Logic
  const handleSaveData = async () => {
    try {
      setIsSaving(true);
      let savedCount = 0;
      let updatedCount = 0;

      for (const [key, yearData] of Object.entries(tableData)) {
        if (!programMap[key]) continue;

        for (const [yearStr, fields] of Object.entries(yearData)) {
          const year = parseInt(yearStr, 10);

          const savedFields = savedData?.[key]?.[yearStr] || {
            vizsgara_bocsathatoak_szama: "",
            sikeres_vizsgazok_szama: "",
          };

          if (
            fields.vizsgara_bocsathatoak_szama !==
            savedFields.vizsgara_bocsathatoak_szama ||
            fields.sikeres_vizsgazok_szama !==
            savedFields.sikeres_vizsgazok_szama
          ) {
            const payload = {
              alapadatok_id: programMap[key].alapadatok_id,
              szakirany_id: programMap[key].szakirany_id,
              szakma_id: programMap[key].szakma_id,
              tanev_kezdete: year,
              vizsgara_bocsathatoak_szama:
                parseInt(fields.vizsgara_bocsathatoak_szama) || 0,
              sikeres_vizsgazok_szama:
                parseInt(fields.sikeres_vizsgazok_szama) || 0,
            };

            if (fields.id) {
              await updateData({ id: fields.id, ...payload }).unwrap();
              updatedCount++;
            } else {
              await addData(payload).unwrap();
              savedCount++;
            }
          }
        }
      }

      setSavedData(JSON.parse(JSON.stringify(tableData)));
      setIsModified(false);
      refetch();

      setSnackbarMessage(
        `Sikeresen mentve: ${savedCount} új rekord és ${updatedCount} frissített rekord`,
      );
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Hiba a mentés során:", error);
      setSnackbarMessage(error.data?.message || "Hiba történt a mentés során");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  if (isFetching || isLoadingSchools) {
    return <PageLoadingOverlay isLoading={true} />;
  }

  return (
    <Container maxWidth="xl">
      <PageWrapper
        titleContent={<TitleSzakmaiVizsga />}
        infoContent={<InfoSzakmaiVizsga />}
      >
        <Fade in={true} timeout={800}>
          <Box sx={{ minHeight: "calc(100vh - 120px)" }}>
            <LockStatusIndicator tableName="szakmai_vizsga_eredmenyek" />

            {fetchError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Hiba történt az adatok betöltése során:{" "}
                {fetchError.message || "Ismeretlen hiba"}
              </Alert>
            )}

            {!selectedSchool && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Nincs iskola kiválasztva - az összes iskola adatait összegzi a
                rendszer.
              </Alert>
            )}

            {isModified && (
              <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                Mentetlen módosítások vannak. Ne felejtsd el menteni a
                változtatásokat!
              </Alert>
            )}

            {/* Action Buttons */}
            <Stack direction="row" spacing={2} sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mb: 3, ml: 2 }}>
              <ExportDOMTableToExcel
                tableId=".MuiTable-root"
                fileName="export_adatok"
              />
              <LockedTableWrapper tableName="szakmai_vizsga_eredmenyek">
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveData}
                  disabled={!isModified || isSaving || isAdding || isUpdating}
                >
                  {isSaving || isAdding || isUpdating ? "Mentés..." : "Mentés"}
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
                  onClick={handleResetData}
                  disabled={
                    !isModified ||
                    !savedData ||
                    isSaving ||
                    isAdding ||
                    isUpdating
                  }
                >
                  Visszaállítás
                </Button>
              </LockedTableWrapper>
            </Stack>

            <Typography variant="h6" component="h2" gutterBottom sx={{ ml: 2 }}>
              Szakmai vizsga eredmények
            </Typography>

            {szakmaRows.length === 0 ? (
              <Alert severity="warning" sx={{ m: 2 }}>
                Nincsenek megjeleníthető szakmák. Kérjük válasszon intézményt
                vagy rendeljen hozzá szakmákat az intézményekhez.
              </Alert>
            ) : (
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
                        Szakma
                      </TableCell>
                      {evszamok.map((year, i) => (
                        <TableCell
                          key={`${year}-header`}
                          align="center"
                          colSpan={3}
                          sx={{
                            fontWeight: "bold",
                            backgroundColor: "#fff3e0",
                            borderBottom: "1px solid #e0e0e0",
                            borderRight:
                              i === evszamok.length - 1
                                ? "none"
                                : "2px solid #e0e0e0",
                          }}
                        >
                          {year}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      {evszamok.map((year, i) => (
                        <React.Fragment key={`${year}-metric-head`}>
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: 600,
                              backgroundColor: "#fff3e0",
                              borderBottom: "2px solid #e0e0e0",
                              minWidth: 90,
                            }}
                          >
                            Arány (%)
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: 600,
                              backgroundColor: "#fff3e0",
                              borderBottom: "2px solid #e0e0e0",
                              minWidth: 100,
                            }}
                          >
                            Sikeres (fő)
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: 600,
                              backgroundColor: "#fff3e0",
                              borderBottom: "2px solid #e0e0e0",
                              borderRight:
                                i === evszamok.length - 1
                                  ? "none"
                                  : "2px solid #e0e0e0",
                              minWidth: 110,
                            }}
                          >
                            Vizsgára bocsátható (fő)
                          </TableCell>
                        </React.Fragment>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Total Row */}
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
                      {evszamok.map((year, i) => {
                        const startYear = parseInt(year.split("/")[0], 10);
                        return (
                          <React.Fragment key={`total-${year}-metrics`}>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>
                              {getRatio("Összesen", startYear)}%
                            </TableCell>
                            <TableCell align="center">
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600 }}
                              >
                                {formatCount(
                                  getNumericValue(
                                    "Összesen",
                                    startYear,
                                    "sikeres_vizsgazok_szama",
                                  ),
                                )}
                              </Typography>
                            </TableCell>
                            <TableCell
                              align="center"
                              sx={{
                                borderRight:
                                  i === evszamok.length - 1
                                    ? "none"
                                    : "2px solid #e0e0e0",
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600 }}
                              >
                                {formatCount(
                                  getNumericValue(
                                    "Összesen",
                                    startYear,
                                    "vizsgara_bocsathatoak_szama",
                                  ),
                                )}
                              </Typography>
                            </TableCell>
                          </React.Fragment>
                        );
                      })}
                    </TableRow>

                    {/* Data Rows */}
                    {szakmaRows.map((row, index) => (
                      <TableRow
                        key={row.key}
                        hover
                        sx={{
                          backgroundColor: index % 2 === 0 ? "#fff" : "#f5f5f5",
                        }}
                      >
                        <TableCell
                          sx={{
                            fontWeight: "medium",
                            borderRight: "2px solid #e0e0e0",
                            position: "sticky",
                            left: 0,
                            backgroundColor:
                              index % 2 === 0 ? "#fff" : "#f5f5f5",
                            zIndex: 1,
                          }}
                        >
                          {row.label}
                        </TableCell>
                        {evszamok.map((year, i) => {
                          const startYear = parseInt(year.split("/")[0], 10);
                          return (
                            <React.Fragment key={`${row.key}-${year}-metrics`}>
                              <TableCell
                                align="center"
                                sx={{ fontWeight: 500 }}
                              >
                                {getRatio(row.key, startYear)}%
                              </TableCell>
                              <TableCell align="center">
                                <ZeroHidingTextField
                                  type="number"
                                  size="small"
                                  value={tableData[row.key]?.[startYear]
                                    ?.sikeres_vizsgazok_szama || 0}
                                  onChange={(e) =>
                                    handleDataChange(
                                      row.key,
                                      startYear,
                                      "sikeres_vizsgazok_szama",
                                      e.target.value,
                                    )
                                  }
                                  inputProps={{
                                    min: 0,
                                    step: 1,
                                    style: {
                                      textAlign: "center",
                                      padding: "4px",
                                    },
                                  }}
                                  sx={{
                                    width: "80px",
                                    backgroundColor: "#fff",
                                  }}
                                  placeholder=""
                                  placeholder="0" />
                              </TableCell>
                              <TableCell
                                align="center"
                                sx={{
                                  borderRight:
                                    i === evszamok.length - 1
                                      ? "none"
                                      : "2px solid #e0e0e0",
                                }}
                              >
                                <ZeroHidingTextField
                                  type="number"
                                  size="small"
                                  value={tableData[row.key]?.[startYear]
                                    ?.vizsgara_bocsathatoak_szama || 0}
                                  onChange={(e) =>
                                    handleDataChange(
                                      row.key,
                                      startYear,
                                      "vizsgara_bocsathatoak_szama",
                                      e.target.value,
                                    )
                                  }
                                  inputProps={{
                                    min: 0,
                                    step: 1,
                                    style: {
                                      textAlign: "center",
                                      padding: "4px",
                                    },
                                  }}
                                  sx={{
                                    width: "80px",
                                    backgroundColor: "#fff",
                                  }}
                                  placeholder=""
                                  placeholder="0" />
                              </TableCell>
                            </React.Fragment>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Snackbar
              open={snackbarOpen}
              autoHideDuration={6000}
              onClose={handleSnackbarClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
              <Alert
                onClose={handleSnackbarClose}
                severity={snackbarSeverity}
                variant="filled"
              >
                {snackbarMessage}
              </Alert>
            </Snackbar>
          </Box>
        </Fade>

        <HistoryDialog
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          alapadatokId={selectedSchool?.id}
          tableName="szakmaiVizsgaEredmenyek"
          onRollbackSuccess={() => {
            setSnackbarMessage("Sikeres visszaállítás az előzményekből!");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
          }}
        />
      </PageWrapper>
    </Container>
  );
}
