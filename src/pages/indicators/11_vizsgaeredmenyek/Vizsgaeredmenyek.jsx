import { formatHuNum } from "../../../utils/formatters";
import React, { useState, useEffect, useMemo, Fragment } from "react";
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
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import { generateSchoolYears } from "../../../utils/schoolYears";
import {
  useGetVizsgaeredmenyekBySchoolAndYearQuery,
  useAddVizsgaeredmenyekMutation,
  useUpdateVizsgaeredmenyekMutation,
  useGetAllAlapadatokQuery,
} from "../../../store/api/apiSlice";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoVizsgaeredmenyek from "./info_vizsgaeredmenyek";
import TitleVizsgaeredmenyek from "./title_vizsgaeredmenyek";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

export default function Vizsgaeredmenyek() {
  const selectedSchool = useSelector(selectSelectedSchool);
  const { data: schoolsData } = useGetAllAlapadatokQuery();

  const currentYear = new Date().getFullYear();
  const schoolYear = new Date().getMonth() >= 8 ? currentYear : currentYear - 1;

  // API hooks
  const {
    data: apiData,
    isLoading,
    error,
  } = useGetVizsgaeredmenyekBySchoolAndYearQuery(
    { alapadatokId: selectedSchool?.id, tanev: schoolYear },
    { skip: !selectedSchool?.id },
  );
  const [addVizsgaeredmenyek] = useAddVizsgaeredmenyekMutation();
  const [updateVizsgaeredmenyek] = useUpdateVizsgaeredmenyekMutation();

  const schoolYears = useMemo(() => generateSchoolYears(), []);

  const dynamicCategories = useMemo(() => {
    if (!schoolsData || !Array.isArray(schoolsData) || !selectedSchool)
      return [];

    let relevantSchool = schoolsData.find(
      (school) => school.id === selectedSchool.id,
    );
    if (!relevantSchool) return [];

    const szakmaSubjects = [];
    const szakiranySubjects = [];

    if (
      relevantSchool.alapadatok_szakirany &&
      Array.isArray(relevantSchool.alapadatok_szakirany)
    ) {
      relevantSchool.alapadatok_szakirany.forEach((szakiranyData) => {
        const szakirany = szakiranyData.szakirany;
        if (szakirany && szakirany.nev) {
          // Add to szakiranySubjects
          if (!szakiranySubjects.some((s) => s.key === szakirany.id)) {
            szakiranySubjects.push({
              key: szakirany.id,
              label: szakirany.nev,
              szakirany_id: szakirany.id,
              szakirany_nev: szakirany.nev,
              isSzakirany: true,
            });
          }

          if (szakirany.szakma && Array.isArray(szakirany.szakma)) {
            szakirany.szakma.forEach((szakmaData) => {
              if (szakmaData.szakma?.nev) {
                // Check if already added
                if (
                  !szakmaSubjects.some((s) => s.key === szakmaData.szakma.id)
                ) {
                  szakmaSubjects.push({
                    key: szakmaData.szakma.id,
                    label: szakmaData.szakma.nev,
                    szakirany_id: szakirany.id,
                    szakma_id: szakmaData.szakma.id,
                    szakirany_nev: szakirany.nev,
                    isSzakirany: false,
                  });
                }
              }
            });
          }
        }
      });
    }

    return [
      {
        category: "szakmai_vizsga_eredmeny",
        title: "szakmai vizsgaeredmények",
        subjects: szakmaSubjects,
        color: "#e8f5e8",
      },
      {
        category: "agazati_alapvizsga_eredmeny",
        title: "ágazati alapvizsga",
        subjects: szakiranySubjects,
        color: "#fff3e0",
      },
      {
        category: "magyar_nyelv_eretsegi_eredmeny",
        title: "magyar nyelv és irodalom érettségi vizsgaeredmény",
        subjects: szakiranySubjects,
        color: "#f0f8ff",
      },
      {
        category: "matematika_eretsegi_eredmeny",
        title: "matematika érettségi vizsgaeredmény",
        subjects: szakiranySubjects,
        color: "#fff3e0",
      },
      {
        category: "tortenelem_eretsegi_eredmeny",
        title: "történelem érettségi vizsgaeredmény",
        subjects: szakiranySubjects,
        color: "#f3e5f5",
      },
      {
        category: "angol_nyelv_eretsegi_eredmeny",
        title: "angol nyelv érettségi vizsgaeredmény",
        subjects: szakiranySubjects,
        color: "#e8f5e8",
      },
      {
        category: "agazati_szakmai_eretsegi_eredmeny",
        title: "ágazati szakmai érettségi vizsgaeredmény",
        subjects: szakiranySubjects,
        color: "#f3e5f5",
      },
    ];
  }, [schoolsData, selectedSchool]);

  // Initialize data structure
  const [examData, setExamData] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);

  const [savedData, setSavedData] = useState(null);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // Load data from API when component mounts or API data changes
  useEffect(() => {
    if (dynamicCategories.length > 0 && apiData && Array.isArray(apiData)) {
      const transformedData = {};

      // Initialize structure
      dynamicCategories.forEach((category) => {
        transformedData[category.category] = {};
        category.subjects.forEach((subject) => {
          transformedData[category.category][subject.key] = {};
          schoolYears.forEach((yearStr) => {
            const startYear = parseInt(yearStr.split("/")[0], 10).toString();
            transformedData[category.category][subject.key][startYear] = "0";
          });
        });
      });

      // Transform API data to match frontend structure
      apiData.forEach((item) => {
        const year = item.tanev_kezdete?.toString();
        if (year) {
          dynamicCategories.forEach((category) => {
            const categoryKey = category.category;
            const isSzakiranyCategory =
              category.subjects.length > 0 && category.subjects[0].isSzakirany;
            const subjectKey = isSzakiranyCategory
              ? item.szakirany_id
              : item.szakma_id;

            if (
              transformedData[categoryKey] &&
              transformedData[categoryKey][subjectKey]
            ) {
              // Only overwrite if it's "0" or if the new item has a non-zero value
              if (
                transformedData[categoryKey][subjectKey][year] === "0" ||
                (item[categoryKey] && item[categoryKey].toString() !== "0")
              ) {
                transformedData[categoryKey][subjectKey][year] =
                  item[categoryKey]?.toString() || "0";
              }
            }
          });
        }
      });

      setExamData(transformedData);
      setSavedData(JSON.parse(JSON.stringify(transformedData)));
      setIsModified(false);
    }
  }, [apiData, dynamicCategories, schoolYears]);

  // Handle data changes
  const handleDataChange = (category, subject, startYear, value) => {
    setExamData((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subject]: {
          ...prev[category][subject],
          [startYear]: value,
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

      const recordsToSave = {};
      let hasChanges = false;

      Object.keys(examData).forEach((examType) => {
        Object.keys(examData[examType]).forEach((subjectKey) => {
          Object.keys(examData[examType][subjectKey]).forEach((yearStr) => {
            const value = examData[examType][subjectKey][yearStr];
            const savedValue = savedData[examType][subjectKey][yearStr];

            if (value !== savedValue) {
              hasChanges = true;
              const year = parseInt(yearStr);
              const parsedVal = parseFloat(value);
              const numericValue = isNaN(parsedVal) ? 0 : parsedVal;

              // Find the subject definition
              let subjectDef = null;
              for (const cat of dynamicCategories) {
                const found = cat.subjects.find((s) => s.key === subjectKey);
                if (found) {
                  subjectDef = found;
                  break;
                }
              }

              if (subjectDef) {
                let szakmaIdsToUpdate = [];
                if (subjectDef.isSzakirany) {
                  // Get all szakma_ids for this szakirany
                  const szakmaSubjects = dynamicCategories[0].subjects.filter(
                    (s) =>
                      !s.isSzakirany &&
                      s.szakirany_id === subjectDef.szakirany_id,
                  );
                  szakmaIdsToUpdate = szakmaSubjects.map((s) => s.szakma_id);
                } else {
                  szakmaIdsToUpdate = [subjectDef.szakma_id];
                }

                szakmaIdsToUpdate.forEach((szakmaId) => {
                  const recordKey = `${year}_${szakmaId}`;
                  if (!recordsToSave[recordKey]) {
                    recordsToSave[recordKey] = {
                      alapadatok_id: selectedSchool.id,
                      tanev_kezdete: year,
                      szakma_id: szakmaId,
                      szakirany_id: subjectDef.szakirany_id,
                      szakmai_vizsga_eredmeny: 0,
                      agazati_alapvizsga_eredmeny: 0,
                      magyar_nyelv_eretsegi_eredmeny: 0,
                      matematika_eretsegi_eredmeny: 0,
                      tortenelem_eretsegi_eredmeny: 0,
                      angol_nyelv_eretsegi_eredmeny: 0,
                      agazati_szakmai_eretsegi_eredmeny: 0,
                    };

                    // Populate with existing DB values so we don't overwrite them with 0
                    const existingRecord = apiData?.find(
                      (r) =>
                        r.tanev_kezdete === year && r.szakma_id === szakmaId,
                    );
                    if (existingRecord) {
                      recordsToSave[recordKey].szakmai_vizsga_eredmeny =
                        existingRecord.szakmai_vizsga_eredmeny
                          ? parseFloat(existingRecord.szakmai_vizsga_eredmeny)
                          : 0;
                      recordsToSave[recordKey].agazati_alapvizsga_eredmeny =
                        existingRecord.agazati_alapvizsga_eredmeny
                          ? parseFloat(
                            existingRecord.agazati_alapvizsga_eredmeny,
                          )
                          : 0;
                      recordsToSave[recordKey].magyar_nyelv_eretsegi_eredmeny =
                        existingRecord.magyar_nyelv_eretsegi_eredmeny
                          ? parseFloat(
                            existingRecord.magyar_nyelv_eretsegi_eredmeny,
                          )
                          : 0;
                      recordsToSave[recordKey].matematika_eretsegi_eredmeny =
                        existingRecord.matematika_eretsegi_eredmeny
                          ? parseFloat(
                            existingRecord.matematika_eretsegi_eredmeny,
                          )
                          : 0;
                      recordsToSave[recordKey].tortenelem_eretsegi_eredmeny =
                        existingRecord.tortenelem_eretsegi_eredmeny
                          ? parseFloat(
                            existingRecord.tortenelem_eretsegi_eredmeny,
                          )
                          : 0;
                      recordsToSave[recordKey].angol_nyelv_eretsegi_eredmeny =
                        existingRecord.angol_nyelv_eretsegi_eredmeny
                          ? parseFloat(
                            existingRecord.angol_nyelv_eretsegi_eredmeny,
                          )
                          : 0;
                      recordsToSave[
                        recordKey
                      ].agazati_szakmai_eretsegi_eredmeny =
                        existingRecord.agazati_szakmai_eretsegi_eredmeny
                          ? parseFloat(
                            existingRecord.agazati_szakmai_eretsegi_eredmeny,
                          )
                          : 0;
                    }
                  }

                  recordsToSave[recordKey][examType] = numericValue;
                });
              }
            }
          });
        });
      });

      if (!hasChanges) {
        setSnackbarMessage("Nincsenek mentendő változások.");
        setSnackbarSeverity("info");
        setSnackbarOpen(true);
        setIsSaving(false);
        return;
      }

      const dataToSave = Object.values(recordsToSave);
      let savedCount = 0;
      let updatedCount = 0;

      // Update or create operations
      const promises = dataToSave.map((item) => {
        if (!item.szakirany_id) return Promise.resolve();

        const existingRecord = apiData?.find(
          (record) =>
            record.tanev_kezdete === item.tanev_kezdete &&
            record.szakma_id === item.szakma_id,
        );

        if (existingRecord && existingRecord.id) {
          // Update existing record
          updatedCount++;
          return updateVizsgaeredmenyek({
            id: existingRecord.id,
            ...item,
          }).unwrap();
        } else {
          // If creating a new record, but all values are 0, skip it
          const allZeros =
            item.szakmai_vizsga_eredmeny === 0 &&
            item.agazati_alapvizsga_eredmeny === 0 &&
            item.magyar_nyelv_eretsegi_eredmeny === 0 &&
            item.matematika_eretsegi_eredmeny === 0 &&
            item.tortenelem_eretsegi_eredmeny === 0 &&
            item.angol_nyelv_eretsegi_eredmeny === 0 &&
            item.agazati_szakmai_eretsegi_eredmeny === 0;

          if (allZeros) return Promise.resolve();

          savedCount++;
          // Create new record
          return addVizsgaeredmenyek(item).unwrap();
        }
      });
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
      const errorMessage =
        error.data?.message || error.message || "Hiba történt a mentés során";

      // Show error snackbar
      setSnackbarMessage(errorMessage);
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
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  if (isLoading) {
    return <PageLoadingOverlay isLoading={true} />;
  }

  return (
    <Container maxWidth="xl">
      <PageWrapper
        titleContent={<TitleVizsgaeredmenyek />}
        infoContent={<InfoVizsgaeredmenyek />}
      >
        <Fade in={true} timeout={800}>
          <Box sx={{ minHeight: "calc(100vh - 120px)" }}>
            <LockStatusIndicator tableName="vizsgaeredmenyek" />

            {/* Error State */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                Hiba történt az adatok betöltése során: {error.message}
              </Alert>
            )}

            {/* Status Messages */}
            {isModified && (
              <Alert severity="warning" sx={{ mt: 2 }}>
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
              <LockedTableWrapper tableName="vizsgaeredmenyek">
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
                  disabled={!isModified || !savedData || isSaving}
                >
                  Visszaállítás
                </Button>
              </LockedTableWrapper>
            </Stack>

            {/* Main Data Table */}
            <TableContainer
              component={Paper}
              sx={{ maxWidth: "100%", overflowX: "auto" }}
            >
              <Table size="small" sx={{ minWidth: 400 }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      rowSpan={2}
                      sx={{
                        fontWeight: "bold",
                        minWidth: 250,
                        maxWidth: 350,
                        borderRight: "2px solid #e0e0e0",
                        position: "sticky",
                        left: 0,
                        backgroundColor: "#ffffff",
                        zIndex: 3,
                        verticalAlign: "middle",
                        boxShadow: "2px 0 5px -2px rgba(0,0,0,0.1)",
                      }}
                    ></TableCell>
                    <TableCell
                      colSpan={schoolYears.length}
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        backgroundColor: "#ffcdd2",
                        borderBottom: "2px solid #e0e0e0",
                      }}
                    >
                      Vizsgaeredmények (átlag)
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    {schoolYears.map((year) => (
                      <TableCell
                        key={year}
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          backgroundColor: "#ffcdd240",
                          fontSize: "0.75rem",
                        }}
                      >
                        {year}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dynamicCategories.map((categoryData, categoryIndex) => (
                    <React.Fragment
                      key={`category-${categoryData.category}-${categoryIndex}`}
                    >
                      {/* Category header row */}
                      <TableRow key={`header-${categoryData.category}`}>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            backgroundColor: categoryData.color,
                            borderBottom: "2px solid #e0e0e0",
                            borderRight: "2px solid #e0e0e0",
                            position: "sticky",
                            left: 0,
                            zIndex: 2,
                            textTransform: "capitalize",
                            boxShadow: "2px 0 5px -2px rgba(0,0,0,0.1)",
                          }}
                        >
                          {formatHuNum(categoryData.title)}
                        </TableCell>
                        {schoolYears.map((year) => (
                          <TableCell
                            key={year}
                            sx={{
                              backgroundColor: categoryData.color,
                              borderBottom: "2px solid #e0e0e0",
                            }}
                          />
                        ))}
                      </TableRow>

                      {/* Subject rows */}
                      {categoryData.subjects.map((subject) => (
                        <TableRow
                          key={`${categoryData.category}-${subject.key}`}
                        >
                          <TableCell
                            sx={{
                              fontWeight: "normal",
                              pl: 4,
                              borderRight: "1px solid #e0e0e0",
                              position: "sticky",
                              left: 0,
                              backgroundColor: "#ffffff",
                              zIndex: 1,
                              fontSize: "0.85rem",
                              boxShadow: "2px 0 5px -2px rgba(0,0,0,0.1)",
                            }}
                          >
                            {formatHuNum(subject.label)}
                          </TableCell>

                          {schoolYears.map((yearStr, yearIdx) => {
                            const startYear = parseInt(
                              yearStr.split("/")[0],
                              10,
                            ).toString();
                            return (
                              <TableCell
                                key={`${subject.key}-${yearStr}`}
                                align="center"
                                sx={{
                                  backgroundColor: "#e8f5e820",
                                  borderRight:
                                    yearIdx === schoolYears.length - 1
                                      ? "2px solid #e0e0e0"
                                      : "1px solid #e0e0e0",
                                  p: 0.5,
                                }}
                              >
                                <ZeroHidingTextField
                                  size="small"
                                  value={examData[categoryData.category]?.[
                                    subject.key
                                  ]?.[startYear] || 0}
                                  onChange={(e) =>
                                    handleDataChange(
                                      categoryData.category,
                                      subject.key,
                                      startYear,
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
                                    width: "60px",
                                    backgroundColor: "#fff",
                                  }}
                                  placeholder="0" />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Loading Overlay */}
            {isSaving && (
              <Backdrop
                sx={{
                  position: "fixed",
                  zIndex: 1300,
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  color: "primary.main",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
                open={isSaving}
              >
                <CircularProgress size={50} />
                <Box sx={{ textAlign: "center", fontWeight: "medium" }}>
                  Adatok mentése folyamatban, kérjük várjon...
                </Box>
              </Backdrop>
            )}

            {/* Snackbar for save notifications */}
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
                sx={{ width: "100%" }}
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
          tableName="vizsgaEredmenyek"
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
