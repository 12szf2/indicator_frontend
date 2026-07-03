import React, { useState, useEffect, useMemo } from "react";
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
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import { generateSchoolYears } from "../../../utils/schoolYears";
import {
  useAddElegedettsegMutation,
  useUpdateElegedettsegMutation,
  useGetAllAlapadatokQuery,
  useGetElegedettsegQuery,
} from "../../../store/api/apiSlice";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoVegzettekElegedettsege from "./info_vegzettek_elegedettsege";
import TitleVegzettekElegedettsege from "./title_vegzettek_elegedettsege";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

const evszamok = generateSchoolYears();

export default function VegzettekElegedettsege() {
  const selectedSchool = useSelector(selectSelectedSchool);

  // API Hooks
  const {
    data: schoolsData,
    isLoading: isLoadingSchools,
    isFetching,
    error: fetchError,
  } = useGetAllAlapadatokQuery();

  const {
    data: apiData,
    isLoading: isLoadingElegedettseg,
    isFetching: isFetchingElegedettseg,
    refetch: refetchElegedettseg,
  } = useGetElegedettsegQuery({ alapadatok_id: selectedSchool?.id });

  const [addElegedettseg, { isLoading: isAdding }] =
    useAddElegedettsegMutation();
  const [updateElegedettseg, { isLoading: isUpdating }] =
    useUpdateElegedettsegMutation();

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
              const szakmaNev = szm.szakma?.nev;
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
    const initialData = {};
    const relevantData = apiData || [];
    const sumData = {};

    relevantData.forEach((item) => {
      const year = item.tanev_kezdete;
      const szakmaId = item.szakma_id || item.szakma?.id;
      const szakiranyId = item.szakirany_id || item.szakirany?.id;
      const key = szakmaId
        ? `szakma_${szakmaId}_${szakiranyId}`
        : `szakirany_${szakiranyId}`;

      if (!initialData[key]) {
        initialData[key] = {};
        sumData[key] = {};
      }
      if (!initialData[key][year]) {
        initialData[key][year] = { id: item.id, munkaadok_elegedettsege: "" };
        sumData[key][year] = { sum: 0, count: 0 };
      }

      const val = item.munkaadok_elegedettsege;
      if (val !== undefined && val !== null && val !== "") {
        sumData[key][year].sum += Number(val);
        sumData[key][year].count += 1;
        initialData[key][year].munkaadok_elegedettsege = val;
      }
    });

    if (!selectedSchool) {
      Object.keys(sumData).forEach((key) => {
        Object.keys(sumData[key]).forEach((year) => {
          const entry = sumData[key][year];
          if (entry.count > 0) {
            initialData[key][year].munkaadok_elegedettsege = Number(
              (entry.sum / entry.count).toFixed(2),
            );
          }
        });
      });
    }

    setTableData(initialData);
    setSavedData(JSON.parse(JSON.stringify(initialData)));
    setIsModified(false);
  }, [apiData, selectedSchool]);

  // Handle Input Changes
  const handleDataChange = (key, yearStr, value) => {
    const year = parseInt(yearStr, 10);

    // Allow empty string, numbers, dots, and commas
    if (value !== "" && !/^[0-9.,]*$/.test(value)) return;

    // Prevent multiple dots/commas
    const dotsAndCommas = value.match(/[.,]/g);
    if (dotsAndCommas && dotsAndCommas.length > 1) return;

    setTableData((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [year]: {
          ...(prev[key]?.[year] || {}),
          munkaadok_elegedettsege: value,
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

  // Get cell value helper
  const getCellValue = (key, year) => {
    const startYear = parseInt(year.split("/")[0], 10);
    return tableData[key]?.[startYear]?.munkaadok_elegedettsege ?? "";
  };

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
            munkaadok_elegedettsege: "",
          };

          if (
            fields.munkaadok_elegedettsege !==
            savedFields.munkaadok_elegedettsege
          ) {
            const payload = {
              alapadatok_id: programMap[key].alapadatok_id,
              szakirany_id: programMap[key].szakirany_id,
              szakma_id: programMap[key].szakma_id,
              tanev_kezdete: year,
              munkaadok_elegedettsege:
                parseFloat(String(fields.munkaadok_elegedettsege).replace(',', '.')) || 0,
            };

            if (fields.id) {
              await updateElegedettseg({ id: fields.id, ...payload }).unwrap();
              updatedCount++;
            } else {
              await addElegedettseg(payload).unwrap();
              savedCount++;
            }
          }
        }
      }

      setSavedData(JSON.parse(JSON.stringify(tableData)));
      setIsModified(false);
      refetchElegedettseg();

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

  const _shouldShowOverlay = isFetching || isLoadingSchools || isLoadingElegedettseg || isFetchingElegedettseg;

  return (
    <Container maxWidth="xl">
      <PageLoadingOverlay isLoading={_shouldShowOverlay} />
      <PageWrapper
        titleContent={<TitleVegzettekElegedettsege />}
        infoContent={<InfoVegzettekElegedettsege />}
      >
        <Fade in={true} timeout={800}>
          <Box sx={{ minHeight: "calc(100vh - 120px)" }}>
            <LockStatusIndicator tableName="elegedettseg" />

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
              <LockedTableWrapper tableName="elegedettseg">
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
              Végzetteket foglalkoztató munkaadók elégedettsége (%)
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
                <Table size="small" sx={{ minWidth: 800 }}>
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
                        Képzési terület / Szakma
                      </TableCell>
                      <TableCell
                        colSpan={evszamok.length}
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          backgroundColor: "#fff3e0",
                          borderBottom: "1px solid #e0e0e0",
                        }}
                      >
                        végzetteket foglalkoztató munkaadók elégedettsége (%)
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      {evszamok.map((year, i) => (
                        <TableCell
                          key={year}
                          align="center"
                          sx={{
                            fontWeight: "bold",
                            backgroundColor: "#fff3e0",
                            borderBottom: "2px solid #e0e0e0",
                            borderRight:
                              i === evszamok.length - 1
                                ? "none"
                                : "1px solid #e0e0e0",
                            minWidth: 100,
                          }}
                        >
                          {year}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {szakmaRows.map((row, index) => (
                      <TableRow
                        key={row.key}
                        hover
                        sx={{
                          backgroundColor:
                            index % 2 === 0 ? "#f5f5f5" : "white",
                        }}
                      >
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            borderRight: "2px solid #e0e0e0",
                            position: "sticky",
                            left: 0,
                            backgroundColor:
                              index % 2 === 0 ? "#f5f5f5" : "#fff",
                            zIndex: 1,
                          }}
                        >
                          {row.label}
                        </TableCell>
                        {evszamok.map((year, i) => {
                          const startYear = parseInt(year.split("/")[0], 10);
                          return (
                            <TableCell
                              key={year}
                              align="center"
                              sx={{
                                borderRight:
                                  i === evszamok.length - 1
                                    ? "none"
                                    : "1px solid #e0e0e0",
                                p: 0.5,
                              }}
                            >
                              <ZeroHidingTextField
                                type="text"
                                size="small"
                                disabled={!selectedSchool}
                                value={String(
                                  tableData[row.key]?.[startYear]?.munkaadok_elegedettsege ?? ""
                                ).replace(".", ",") || 0}
                                onChange={(e) =>
                                  handleDataChange(
                                    row.key,
                                    startYear,
                                    e.target.value.replace(",", "."),
                                  )
                                }
                                slotProps={{
                                  input: {
                                    inputMode: "decimal",
                                    style: {
                                      textAlign: "center",
                                      padding: "4px",
                                    },
                                  },
                                }}
                                sx={{
                                  width: "80px",
                                  backgroundColor: !selectedSchool
                                    ? "#f5f5f5"
                                    : "#fff",
                                }}
                                placeholder=""
                                placeholder="0" />
                            </TableCell>
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
          tableName="elegedettseg"
          onRollbackSuccess={() => {
            setSnackbarMessage("Sikeres visszaállítás az előzményekből!");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
            refetchElegedettseg();
          }}
        />
      </PageWrapper>
    </Container>
  );
}
