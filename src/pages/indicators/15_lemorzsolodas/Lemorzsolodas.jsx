import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  Backdrop,
  Snackbar,
  Container,
  Fade,
  Card,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import { generateSchoolYears } from "../../../utils/schoolYears";
import {
  useGetLemorzsolodasBySchoolAndYearQuery,
  useAddLemorzsolodasMutation,
  useUpdateLemorzsolodasMutation,
  useGetAllAlapadatokQuery,
  useGetTanuloLetszamQuery,
} from "../../../store/api/apiSlice";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoLemorzsolodas from "./info_lemorzsolodas";
import TitleLemorzsolodas from "./title_lemorzsolodas";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";

export default function Lemorzsolodas() {
  const selectedSchool = useSelector(selectSelectedSchool);
  const { data: schoolsData } = useGetAllAlapadatokQuery();

  const currentYear = new Date().getFullYear();
  const schoolYear = new Date().getMonth() >= 8 ? currentYear : currentYear - 1;

  // API hooks
  const {
    data: apiData,
    isLoading: isLemorzsolodasLoading,
    error,
  } = useGetLemorzsolodasBySchoolAndYearQuery(
    { alapadatokId: selectedSchool?.id, tanev: schoolYear },
    { skip: !selectedSchool?.id },
  );

  const { data: tanuloData, isLoading: isTanuloLoading } =
    useGetTanuloLetszamQuery(
      { alapadatok_id: selectedSchool?.id },
      { skip: !selectedSchool?.id },
    );

  const isLoading = isLemorzsolodasLoading || isTanuloLoading;

  const [addLemorzsolodas] = useAddLemorzsolodasMutation();
  const [updateLemorzsolodas] = useUpdateLemorzsolodasMutation();

  const schoolYears = useMemo(() => generateSchoolYears(), []);

  // Structure: array of { szakirany_id, szakirany_nev, szakmak: [{ szakma_id, szakma_nev }] }
  const dynamicCategories = useMemo(() => {
    if (!schoolsData || !Array.isArray(schoolsData) || !selectedSchool)
      return [];

    let relevantSchool = schoolsData.find(
      (school) => school.id === selectedSchool.id,
    );
    if (!relevantSchool) return [];

    const categories = [];

    if (
      relevantSchool.alapadatok_szakirany &&
      Array.isArray(relevantSchool.alapadatok_szakirany)
    ) {
      relevantSchool.alapadatok_szakirany.forEach((szakiranyData) => {
        const szakirany = szakiranyData.szakirany;
        if (szakirany && szakirany.nev) {
          const category = {
            szakirany_id: szakirany.id,
            szakirany_nev: szakirany.nev,
            szakmak: [],
          };

          if (szakirany.szakma && Array.isArray(szakirany.szakma)) {
            szakirany.szakma.forEach((szakmaData) => {
              if (szakmaData.szakma?.nev) {
                category.szakmak.push({
                  szakma_id: szakmaData.szakma.id,
                  szakma_nev: szakmaData.szakma.nev,
                });
              }
            });
          }
          categories.push(category);
        }
      });
    }

    return categories;
  }, [schoolsData, selectedSchool]);

  const [examData, setExamData] = useState({});
  const [savedData, setSavedData] = useState(null);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [historyOpen, setHistoryOpen] = useState(false);

  // Load data
  useEffect(() => {
    if (
      dynamicCategories.length > 0 &&
      !isLemorzsolodasLoading &&
      !isTanuloLoading
    ) {
      const transformedData = {};

      // Initialize structure for inputs only (szakma level)
      dynamicCategories.forEach((cat) => {
        cat.szakmak.forEach((szakma) => {
          transformedData[szakma.szakma_id] = {};
          schoolYears.forEach((yearStr) => {
            const startYear = parseInt(yearStr.split("/")[0], 10).toString();
            transformedData[szakma.szakma_id][startYear] = {
              lemorzsolodo: "0",
              oktober: "0",
            };
          });
        });
      });

      // Pre-fill with TanuloLetszam data
      if (tanuloData && Array.isArray(tanuloData)) {
        tanuloData.forEach((item) => {
          // jogv_tipus 0 is "Tanulói jogviszony"
          if (item.jogv_tipus === 0 && item.szakma_id && item.tanev_kezdete) {
            const yearStr = item.tanev_kezdete.toString();
            if (
              transformedData[item.szakma_id] &&
              transformedData[item.szakma_id][yearStr]
            ) {
              transformedData[item.szakma_id][yearStr].oktober =
                item.letszam?.toString() || "0";
            }
          }
        });
      }

      // Fill with API data (overwrites defaults with saved Lemorzsolodas data)
      if (apiData && Array.isArray(apiData)) {
        apiData.forEach((item) => {
          const year = item.tanev_kezdete?.toString();
          const szakmaId = item.szakma_id;

          if (
            year &&
            szakmaId &&
            transformedData[szakmaId] &&
            transformedData[szakmaId][year]
          ) {
            transformedData[szakmaId][year] = {
              id: item.id,
              szakirany_id: item.szakirany_id,
              lemorzsolodo: item.lemorzsolodo_tanulok_szama?.toString() || "0",
              oktober:
                item.oktober_es_belepett_tanulok_szama?.toString() || "0",
            };
          }
        });
      }

      setExamData(transformedData);
      setSavedData(JSON.parse(JSON.stringify(transformedData)));
      setIsModified(false);
    }
  }, [
    apiData,
    tanuloData,
    dynamicCategories,
    schoolYears,
    isLemorzsolodasLoading,
    isTanuloLoading,
  ]);

  const handleDataChange = (szakmaId, startYear, field, value) => {
    setExamData((prev) => ({
      ...prev,
      [szakmaId]: {
        ...prev[szakmaId],
        [startYear]: {
          ...prev[szakmaId][startYear],
          [field]: value,
        },
      },
    }));
    setIsModified(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!selectedSchool || !selectedSchool.id) {
        throw new Error("Nincs kiválasztva intézmény.");
      }

      let savedCount = 0;
      let updatedCount = 0;
      let promises = [];

      Object.keys(examData).forEach((szakmaId) => {
        Object.keys(examData[szakmaId]).forEach((yearStr) => {
          const current = examData[szakmaId][yearStr];
          const saved = savedData[szakmaId][yearStr];

          if (
            current.lemorzsolodo !== saved.lemorzsolodo ||
            current.oktober !== saved.oktober
          ) {
            const year = parseInt(yearStr);
            const lemorzsolodoVal = parseInt(current.lemorzsolodo) || 0;
            const oktoberVal = parseInt(current.oktober) || 0;

            // Find szakirany_id
            let szakirany_id = null;
            dynamicCategories.forEach((cat) => {
              if (cat.szakmak.find((s) => s.szakma_id === szakmaId)) {
                szakirany_id = cat.szakirany_id;
              }
            });

            if (szakirany_id) {
              const payload = {
                alapadatok_id: selectedSchool.id,
                tanev_kezdete: year,
                szakma_id: szakmaId,
                szakirany_id: szakirany_id,
                lemorzsolodo_tanulok_szama: lemorzsolodoVal,
                oktober_es_belepett_tanulok_szama: oktoberVal,
              };

              if (current.id) {
                updatedCount++;
                promises.push(
                  updateLemorzsolodas({ id: current.id, ...payload }).unwrap(),
                );
              } else {
                if (lemorzsolodoVal > 0 || oktoberVal > 0) {
                  savedCount++;
                  promises.push(addLemorzsolodas(payload).unwrap());
                }
              }
            }
          }
        });
      });

      if (promises.length === 0) {
        setSnackbarMessage("Nincsenek mentendő változások.");
        setSnackbarSeverity("info");
        setSnackbarOpen(true);
        setIsSaving(false);
        return;
      }

      await Promise.all(promises);

      setSavedData(JSON.parse(JSON.stringify(examData)));
      setIsModified(false);

      setSnackbarMessage(
        `Sikeresen mentve: ${savedCount} új és ${updatedCount} frissített rekord.`,
      );
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error saving exam data:", error);
      setSnackbarMessage(
        error.data?.message || error.message || "Hiba történt a mentés során",
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (savedData) {
      setExamData(JSON.parse(JSON.stringify(savedData)));
      setIsModified(false);
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  // Helper for computing sums
  const calculateTotal = (szakmaIds, yearStr, field) => {
    let sum = 0;
    szakmaIds.forEach((id) => {
      if (examData[id] && examData[id][yearStr]) {
        sum += parseInt(examData[id][yearStr][field]) || 0;
      }
    });
    return sum;
  };

  const calculatePercentage = (lemorzsolodo, oktober) => {
    if (!oktober || oktober === 0) return "0.00";
    return ((lemorzsolodo / oktober) * 100).toFixed(2);
  };

  if (isLoading) {
    return <PageLoadingOverlay isLoading={true} />;
  }

  const allSzakmaIds = dynamicCategories.flatMap((c) =>
    c.szakmak.map((s) => s.szakma_id),
  );

  return (
    <Container maxWidth="xl">
      <PageWrapper
        titleContent={<TitleLemorzsolodas />}
        infoContent={<InfoLemorzsolodas />}
      >
        <Fade in={true} timeout={800}>
          <Box sx={{ minHeight: "calc(100vh - 120px)" }}>
            <LockStatusIndicator tableName="lemorzsolodas" />

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                Hiba történt az adatok betöltése során: {error.message}
              </Alert>
            )}

            <Card
              sx={{
                position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px",
                mb: 3,
                p: 2,
                display: "flex",
                flexDirection: "row",
                gap: 2,
              }}
            >
              <ExportDOMTableToExcel
                tableId=".MuiTable-root"
                fileName="export_adatok"
              />
              <LockedTableWrapper tableName="lemorzsolodas">
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={!isModified || isSaving}
                >
                  {isSaving ? "Mentés..." : "Mentés"}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleReset}
                  disabled={!isModified || !savedData || isSaving}
                >
                  Visszaállítás
                </Button>

                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => setHistoryOpen(true)}
                  startIcon={<HistoryIcon />}
                >
                  Előzmények
                </Button>
              </LockedTableWrapper>
            </Card>

            {isModified && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Mentetlen módosítások vannak. Ne felejtsd el menteni a
                változtatásokat!
              </Alert>
            )}

            <TableContainer
              component={Paper}
              sx={{ maxWidth: "100%", overflowX: "auto" }}
            >
              <Table
                size="small"
                sx={{
                  minWidth: 1400,
                  "& td, & th": { border: "1px solid #e0e0e0" },
                }}
              >
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#fff3e0" }}>
                    <TableCell
                      colSpan={2}
                      sx={{ fontWeight: "bold", border: "1px solid #e0e0e0" }}
                    ></TableCell>
                    <TableCell
                      colSpan={schoolYears.length}
                      align="center"
                      sx={{ fontWeight: "bold", color: "#d32f2f" }}
                    >
                      lemorzsolódás mértéke
                      <br />
                      Tanulói jogviszony (%)
                    </TableCell>
                    <TableCell
                      colSpan={schoolYears.length}
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        backgroundColor: "#e8f5e8",
                        color: "#2e7d32",
                      }}
                    >
                      lemorzsolódó tanulók száma
                      <br />
                      Tanulói jogviszony (fő)
                    </TableCell>
                    <TableCell
                      colSpan={schoolYears.length}
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        backgroundColor: "#ffcdd2",
                        color: "#d32f2f",
                      }}
                    >
                      október 1-jei létszám + belépett tanulók száma
                      <br />
                      Tanulói jogviszony (fő)
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell colSpan={2}></TableCell>
                    {schoolYears.map((year) => (
                      <TableCell
                        key={`perc-${year}`}
                        align="center"
                        sx={{ fontWeight: "bold", fontSize: "0.8rem" }}
                      >
                        {year}
                      </TableCell>
                    ))}
                    {schoolYears.map((year) => (
                      <TableCell
                        key={`lemorzsolodo-${year}`}
                        align="center"
                        sx={{ fontWeight: "bold", fontSize: "0.8rem" }}
                      >
                        {year}
                      </TableCell>
                    ))}
                    {schoolYears.map((year) => (
                      <TableCell
                        key={`oktober-${year}`}
                        align="center"
                        sx={{ fontWeight: "bold", fontSize: "0.8rem" }}
                      >
                        {year}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Összesen Row */}
                  <TableRow sx={{ backgroundColor: "#fff9c4" }}>
                    <TableCell sx={{ fontWeight: "bold" }}>összesen</TableCell>
                    <TableCell>technikum+szakképző iskola</TableCell>

                    {/* % */}
                    {schoolYears.map((yearStr) => {
                      const year = yearStr.split("/")[0];
                      const lem = calculateTotal(
                        allSzakmaIds,
                        year,
                        "lemorzsolodo",
                      );
                      const okt = calculateTotal(allSzakmaIds, year, "oktober");
                      return (
                        <TableCell key={`perc-osszesen-${year}`} align="center">
                          {calculatePercentage(lem, okt)}
                        </TableCell>
                      );
                    })}

                    {/* Lemorzsolodo */}
                    {schoolYears.map((yearStr) => {
                      const year = yearStr.split("/")[0];
                      return (
                        <TableCell key={`lem-osszesen-${year}`} align="center">
                          {calculateTotal(allSzakmaIds, year, "lemorzsolodo")}
                        </TableCell>
                      );
                    })}

                    {/* Oktober */}
                    {schoolYears.map((yearStr) => {
                      const year = yearStr.split("/")[0];
                      return (
                        <TableCell key={`okt-osszesen-${year}`} align="center">
                          {calculateTotal(allSzakmaIds, year, "oktober")}
                        </TableCell>
                      );
                    })}
                  </TableRow>

                  {/* Categories */}
                  {dynamicCategories.map((cat, catIdx) => {
                    const catSzakmaIds = cat.szakmak.map((s) => s.szakma_id);
                    return (
                      <React.Fragment key={cat.szakirany_id}>
                        {/* Intézménytípusonként Row */}
                        <TableRow
                          sx={{
                            backgroundColor:
                              catIdx % 2 === 0 ? "#fff3e0" : "#e8f5e8",
                          }}
                        >
                          <TableCell sx={{ fontWeight: "bold" }}>
                            intézménytípusonként
                          </TableCell>
                          <TableCell sx={{ pl: 3 }}>
                            ebből: {cat.szakirany_nev}
                          </TableCell>

                          {/* % */}
                          {schoolYears.map((yearStr) => {
                            const year = yearStr.split("/")[0];
                            const lem = calculateTotal(
                              catSzakmaIds,
                              year,
                              "lemorzsolodo",
                            );
                            const okt = calculateTotal(
                              catSzakmaIds,
                              year,
                              "oktober",
                            );
                            return (
                              <TableCell
                                key={`perc-cat-${cat.szakirany_id}-${year}`}
                                align="center"
                              >
                                {calculatePercentage(lem, okt)}
                              </TableCell>
                            );
                          })}

                          {/* Lemorzsolodo */}
                          {schoolYears.map((yearStr) => {
                            const year = yearStr.split("/")[0];
                            return (
                              <TableCell
                                key={`lem-cat-${cat.szakirany_id}-${year}`}
                                align="center"
                              >
                                {calculateTotal(
                                  catSzakmaIds,
                                  year,
                                  "lemorzsolodo",
                                )}
                              </TableCell>
                            );
                          })}

                          {/* Oktober */}
                          {schoolYears.map((yearStr) => {
                            const year = yearStr.split("/")[0];
                            return (
                              <TableCell
                                key={`okt-cat-${cat.szakirany_id}-${year}`}
                                align="center"
                              >
                                {calculateTotal(catSzakmaIds, year, "oktober")}
                              </TableCell>
                            );
                          })}
                        </TableRow>

                        {/* Szakmák Rows */}
                        {cat.szakmak.map((szakma) => (
                          <TableRow
                            key={szakma.szakma_id}
                            sx={{ backgroundColor: "#ffffff" }}
                          >
                            <TableCell sx={{ fontWeight: "normal", pl: 3 }}>
                              szakmánként
                            </TableCell>
                            <TableCell sx={{ fontWeight: "bold", pl: 4 }}>
                              {szakma.szakma_nev}
                            </TableCell>

                            {/* % */}
                            {schoolYears.map((yearStr) => {
                              const year = yearStr.split("/")[0];
                              const lem =
                                parseInt(
                                  examData[szakma.szakma_id]?.[year]
                                    ?.lemorzsolodo,
                                ) || 0;
                              const okt =
                                parseInt(
                                  examData[szakma.szakma_id]?.[year]?.oktober,
                                ) || 0;
                              return (
                                <TableCell
                                  key={`perc-szakma-${szakma.szakma_id}-${year}`}
                                  align="center"
                                >
                                  {calculatePercentage(lem, okt)}
                                </TableCell>
                              );
                            })}

                            {/* Lemorzsolodo Inputs */}
                            {schoolYears.map((yearStr) => {
                              const year = yearStr.split("/")[0];
                              return (
                                <TableCell
                                  key={`lem-szakma-${szakma.szakma_id}-${year}`}
                                  align="center"
                                >
                                  <ZeroHidingTextField
                                    size="small"
                                    type="number"
                                    value={examData[szakma.szakma_id]?.[year]
                                      ?.lemorzsolodo || 0}
                                    onChange={(e) =>
                                      handleDataChange(
                                        szakma.szakma_id,
                                        year,
                                        "lemorzsolodo",
                                        e.target.value,
                                      )
                                    }
                                    inputProps={{
                                      min: 0,
                                      style: {
                                        textAlign: "center",
                                        padding: "4px",
                                      },
                                    }}
                                    sx={{
                                      width: "70px",
                                      backgroundColor: "#fff3e0",
                                    }}
                                    placeholder="0" />
                                </TableCell>
                              );
                            })}

                            {/* Oktober Inputs */}
                            {schoolYears.map((yearStr) => {
                              const year = yearStr.split("/")[0];
                              return (
                                <TableCell
                                  key={`okt-szakma-${szakma.szakma_id}-${year}`}
                                  align="center"
                                >
                                  <ZeroHidingTextField
                                    size="small"
                                    type="number"
                                    value={examData[szakma.szakma_id]?.[year]
                                      ?.oktober || 0}
                                    onChange={(e) =>
                                      handleDataChange(
                                        szakma.szakma_id,
                                        year,
                                        "oktober",
                                        e.target.value,
                                      )
                                    }
                                    inputProps={{
                                      min: 0,
                                      style: {
                                        textAlign: "center",
                                        padding: "4px",
                                      },
                                    }}
                                    sx={{
                                      width: "70px",
                                      backgroundColor: "#f0f8ff",
                                    }}
                                    placeholder="0" />
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {isSaving && (
              <Backdrop
                sx={{
                  zIndex: 1300,
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  flexDirection: "column",
                  gap: 2,
                }}
                open={isSaving}
              >
                <CircularProgress size={50} />
                <Box sx={{ fontWeight: "medium" }}>
                  Adatok mentése folyamatban, kérjük várjon...
                </Box>
              </Backdrop>
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
                sx={{ width: "100%" }}
              >
                {snackbarMessage}
              </Alert>
            </Snackbar>
          </Box>
        </Fade>
      </PageWrapper>

      <HistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        tableName="lemorzsolodas"
        alapadatokId={selectedSchool?.id}
      />
    </Container>
  );
}
