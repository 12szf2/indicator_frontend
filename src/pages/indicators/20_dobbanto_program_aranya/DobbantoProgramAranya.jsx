import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Box,
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
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import { generateSchoolYears } from "../../../utils/schoolYears";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import {
  useGetTanuloLetszamQuery,
  useAddDobbantoMutation,
  useUpdateDobbantoMutation,
  useGetDobbantoQuery,
} from "../../../store/api/apiSlice";
import {
  TableLoadingOverlay,
  NotificationSnackbar,
} from "../../../components/shared";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoDobbantoProgramAranya from "./info_dobbanto_program_aranya";
import TitleDobbantoProgramAranya from "./title_dobbanto_program_aranya";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

export default function DobbantoProgramAránya() {
  const schoolYears = generateSchoolYears();
  const selectedSchool = useSelector(selectSelectedSchool);

  // Fetch student data from API
  const { data: apiStudentData, isLoading: isFetching } =
    useGetTanuloLetszamQuery(
      { alapadatok_id: selectedSchool?.id },
      { skip: !selectedSchool?.id }, // Skip the query if no school is selected
    );

  // Fetch existing dobbanto data from API for all years
  const dobbantoQueries = schoolYears.map((yearRange) => {
    const startYear = parseInt(yearRange.split("/")[0]);
    return useGetDobbantoQuery(
      {
        alapadatok_id: selectedSchool?.id,
        tanev: startYear,
      },
      { skip: !selectedSchool?.id },
    );
  });

  // Memoize combined dobbanto data and loading states to prevent infinite loops
  const existingDobbantoData = useMemo(() => {
    return dobbantoQueries.flatMap((query) => query.data || []);
  }, [
    dobbantoQueries.map((q) => q.data?.length).join(","),
    selectedSchool?.id,
  ]);

  const isDobbantoFetching = useMemo(() => {
    return dobbantoQueries.some((query) => query.isLoading);
  }, [dobbantoQueries.map((q) => q.isLoading).join(",")]);

  // Mutations for saving dobbanto data
  const [addDobbanto, { isLoading: isAdding, error: addError }] =
    useAddDobbantoMutation();
  const [updateDobbanto, { isLoading: isUpdating, error: updateError }] =
    useUpdateDobbantoMutation();

  const isSaving = isAdding || isUpdating;
  const saveError = addError || updateError;

  const [historyOpen, setHistoryOpen] = useState(false);

  // Data structure for the three main sections
  const [dobbantoData, setDobbantoData] = useState(() => {
    const initialData = {
      percentage_overall: {},
      dobbanto_students: {},
      total_students: {},
    };

    // Initialize all sections with school years
    Object.keys(initialData).forEach((section) => {
      schoolYears.forEach((year) => {
        initialData[section][year] = "0";
      });
    });

    return initialData;
  });

  const [savedData, setSavedData] = useState(null);
  const [isModified, setIsModified] = useState(false);

  // Snackbar state for notifications
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // Extract total student data (all jogv_tipus) from API response
  const extractTotalStudentData = (apiData) => {
    const totalStudentData = {};
    schoolYears.forEach((yearRange) => {
      const startYear = parseInt(yearRange.split("/")[0]);
      totalStudentData[yearRange] = 0;

      if (apiData && Array.isArray(apiData)) {
        // Find all records for this year (all jogv_tipus)
        const yearRecords = apiData.filter(
          (record) => record.tanev_kezdete === startYear,
        );

        // Sum up all the student counts
        const totalCount = yearRecords.reduce((sum, record) => {
          return sum + (record.letszam || 0);
        }, 0);

        totalStudentData[yearRange] = totalCount;
      }
    });
    return totalStudentData;
  };

  // Load total student data from API when available
  useEffect(() => {
    if (apiStudentData && Array.isArray(apiStudentData)) {
      console.log(
        "Loading student data from API for Dobbantó:",
        apiStudentData,
      );

      // Extract total student data (all jogv_tipus combined)
      const totalStudentData = extractTotalStudentData(apiStudentData);

      // Update the total_students in dobbantoData
      setDobbantoData((prev) => ({
        ...prev,
        total_students: totalStudentData,
      }));

      // Also update savedData with total students
      setSavedData((prev) => {
        const newSavedData = prev || {
          percentage_overall: {},
          dobbanto_students: {},
          total_students: {},
        };
        return {
          ...newSavedData,
          total_students: totalStudentData,
        };
      });

      console.log("Total student data for Dobbantó:", totalStudentData);
    }
  }, [apiStudentData]);

  // Load existing dobbanto data from API when available
  useEffect(() => {
    if (existingDobbantoData && existingDobbantoData.length > 0) {
      console.log("Loading existing dobbanto data:", existingDobbantoData);

      const dobbantoStudentsData = {};

      // Process existing dobbanto data
      existingDobbantoData.forEach((record) => {
        const yearRange = `${record.tanev_kezdete}/${record.tanev_kezdete + 1}`;
        dobbantoStudentsData[yearRange] = record.dobbanto_szama || 0;
      });

      // Update dobbanto_students with existing data
      setDobbantoData((prev) => ({
        ...prev,
        dobbanto_students: dobbantoStudentsData,
      }));

      // Set as saved data since this is loaded from server
      setSavedData((prev) => {
        const newSavedData = prev || {
          percentage_overall: {},
          dobbanto_students: {},
          total_students: {},
        };
        return {
          ...newSavedData,
          dobbanto_students: dobbantoStudentsData,
        };
      });

      console.log("Loaded dobbanto students data:", dobbantoStudentsData);
    }
  }, [existingDobbantoData.length, selectedSchool?.id]);

  // Handle data changes - csak a dobbanto_students módosítható
  const handleDataChange = (section, year, value) => {
    // Csak a dobbanto_students szerkeszthető
    if (section !== "dobbanto_students") return;

    // Validation: Dobbantó students cannot exceed total students
    const numericValue = parseInt(value) || 0;
    const totalStudents = parseInt(dobbantoData.total_students[year]) || 0;

    if (numericValue > totalStudents && totalStudents > 0) {
      setSnackbarMessage(
        `A Dobbantó programban résztvevők száma (${numericValue}) nem lehet több, mint a tanulói összlétszám (${totalStudents}) a ${year} tanévben!`,
      );
      setSnackbarSeverity("warning");
      setSnackbarOpen(true);
      return;
    }

    setDobbantoData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [year]: value,
      },
    }));
    setIsModified(true);
  };

  // Calculate percentage automatically
  const calculatePercentage = (year) => {
    const dobbantoStudents = parseFloat(
      dobbantoData.dobbanto_students[year] || 0,
    );
    const total = parseFloat(dobbantoData.total_students[year] || 0);

    if (total > 0) {
      const percentage = ((dobbantoStudents / total) * 100).toFixed(1);
      return percentage;
    }
    return "0.0";
  };

  // Check if there are any validation errors (percentage > 100%)
  const hasValidationErrors = () => {
    return schoolYears.some((year) => {
      const percentage = parseFloat(
        dobbantoData.percentage_overall[year] || "0.0",
      );
      return percentage > 100;
    });
  };

  // Auto-calculate percentages when dobbanto_students or total_students change
  useEffect(() => {
    const newPercentages = {};
    schoolYears.forEach((year) => {
      newPercentages[year] = calculatePercentage(year);
    });

    setDobbantoData((prev) => ({
      ...prev,
      percentage_overall: newPercentages,
    }));
  }, [
    JSON.stringify(dobbantoData.dobbanto_students),
    JSON.stringify(dobbantoData.total_students),
  ]);

  const handleSave = async () => {
    if (!selectedSchool?.id) {
      setSnackbarMessage("Kérjük, válasszon ki egy iskolát a mentés előtt!");
      setSnackbarSeverity("warning");
      setSnackbarOpen(true);
      return;
    }

    // Check for validation errors before saving
    if (hasValidationErrors()) {
      setSnackbarMessage(
        "A mentés nem lehetséges, mert vannak validációs hibák. Javítsa ki a hibákat a mentés előtt!",
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    try {
      // Mentés minden tanévre külön-külön
      const savePromises = schoolYears.map(async (yearRange) => {
        const startYear = parseInt(yearRange.split("/")[0]);
        const dobbantoStudents = parseInt(
          dobbantoData.dobbanto_students[yearRange] || 0,
        );
        const totalStudents = parseInt(
          dobbantoData.total_students[yearRange] || 0,
        );

        // Ensure we're sending valid numbers, not NaN
        const validDobbantoStudents = isNaN(dobbantoStudents)
          ? 0
          : dobbantoStudents;
        const validTotalStudents = isNaN(totalStudents) ? 0 : totalStudents;

        console.log(
          `Mentés ${yearRange}: dobbanto=${validDobbantoStudents}, total=${validTotalStudents}`,
        );

        // Check if data already exists for this year
        const existingRecord = existingDobbantoData?.find(
          (record) => record.tanev_kezdete === startYear,
        );

        const payload = {
          alapadatok_id: selectedSchool.id,
          tanev_kezdete: startYear,
          dobbanto_szama: validDobbantoStudents,
          tanulok_osszesen: validTotalStudents,
        };

        if (existingRecord) {
          // Update existing record (PUT)
          console.log(
            `Updating existing record for ${yearRange}, ID: ${existingRecord.id}`,
          );
          return await updateDobbanto({
            id: existingRecord.id,
            ...payload,
          }).unwrap();
        } else {
          // Create new record (POST)
          console.log(`Creating new record for ${yearRange}`);
          return await addDobbanto(payload).unwrap();
        }
      });

      await Promise.all(savePromises);

      setSavedData(JSON.parse(JSON.stringify(dobbantoData)));
      setIsModified(false);
      console.log("Dobbantó program adatok sikeresen mentve!");

      // Show success notification
      setSnackbarMessage("Dobbantó program adatok sikeresen mentve!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Hiba a mentés során:", error);
      const errorMessage =
        error?.data?.message || error.message || "Hiba történt a mentés során";

      // Show error notification
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleReset = () => {
    if (savedData) {
      // Ensure we have all required sections in savedData
      const completeData = {
        percentage_overall: savedData.percentage_overall || {},
        dobbanto_students: savedData.dobbanto_students || {},
        total_students: savedData.total_students || {},
      };

      // Fill in missing years with default values
      schoolYears.forEach((year) => {
        if (!completeData.percentage_overall[year])
          completeData.percentage_overall[year] = "0.0";
        if (!completeData.dobbanto_students[year])
          completeData.dobbanto_students[year] = "0";
        if (!completeData.total_students[year])
          completeData.total_students[year] = "0";
      });

      setDobbantoData(JSON.parse(JSON.stringify(completeData)));
      setIsModified(false);
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <Container maxWidth="xl">
      <PageWrapper
        titleContent={<TitleDobbantoProgramAranya />}
        infoContent={<InfoDobbantoProgramAranya />}
      >
        <Fade in={true} timeout={800}>
          <Box sx={{ minHeight: "calc(100vh - 120px)" }}>
            <LockStatusIndicator tableName="dobbanto" />
            <PageLoadingOverlay isLoading={isFetching} />

            {/* Loading State */}
            {(isFetching || isDobbantoFetching) && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {/* Content - only show when not loading */}
            {!isFetching && !isDobbantoFetching && (
              <>
                {/* Selected School Alert */}
                {!selectedSchool && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Nincs iskola kiválasztva - válasszon ki egy iskolát a
                    mentéshez!
                  </Alert>
                )}

                {selectedSchool && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Kiválasztott iskola:{" "}
                    <strong>{selectedSchool.iskola_neve}</strong>
                  </Alert>
                )}

                {/* Main Data Tables */}
                {/* Action Buttons */}
                <Stack direction="row" spacing={2} sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mt: 3, mb: 2 }}>
                  <ExportDOMTableToExcel
                    tableId=".MuiTable-root"
                    fileName="export_adatok"
                  />
                  <LockedTableWrapper tableName="dobbanto">
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                      disabled={
                        !isModified ||
                        !selectedSchool?.id ||
                        isSaving ||
                        hasValidationErrors()
                      }
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

                {/* Status Messages */}
                {isModified && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Mentetlen módosítások vannak. Ne felejtsd el menteni a
                    változtatásokat!
                  </Alert>
                )}

                {/* Percentage over 100% warning */}
                {hasValidationErrors() && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    ⚠️ Figyelem: Egy vagy több tanévben a Dobbantó programban
                    résztvevők aránya meghaladja a 100%-ot! Ellenőrizze, hogy a
                    résztvevők száma nem haladja meg a tanulói összlétszámot. A
                    mentés le van tiltva, amíg a hibák fennállnak.
                  </Alert>
                )}
                {/* Percentage Overview Table */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography
                      variant="h6"
                      component="h2"
                      gutterBottom
                      sx={{
                        color: "#d32f2f",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Dobbantó programban tanulók aránya
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2, textAlign: "center" }}
                    >
                      Tanulói és felnőttképzési jogviszony (%) - Automatikusan
                      kalkulált
                    </Typography>

                    <TableContainer
                      component={Paper}
                      variant="outlined"
                      sx={{ overflowX: "auto", position: "relative" }}
                    >
                      <TableLoadingOverlay
                        isLoading={isSaving}
                        message="Dobbantó program adatok mentése folyamatban..."
                      />
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: "#ffcdd2" }}>
                            {schoolYears.map((year) => (
                              <TableCell
                                key={year}
                                align="center"
                                sx={{
                                  fontWeight: "bold",
                                  minWidth: 120,
                                  backgroundColor: "#f0f8ff",
                                }}
                              >
                                {year}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow sx={{ backgroundColor: "#fff3e0" }}>
                            {schoolYears.map((year) => {
                              const percentage = parseFloat(
                                dobbantoData.percentage_overall[year] || "0.0",
                              );
                              const isOver100 = percentage > 100;

                              return (
                                <TableCell
                                  key={year}
                                  align="center"
                                  sx={{
                                    backgroundColor: isOver100
                                      ? "#ffcdd2"
                                      : "#e8f5e8",
                                    fontWeight: "medium",
                                    fontSize: "1.1rem",
                                    color: isOver100 ? "#d32f2f" : "inherit",
                                  }}
                                >
                                  {dobbantoData.percentage_overall[year] ||
                                    "0.0"}
                                  %{isOver100 && " ⚠️"}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>

                {/* Dobbantó Students Count Table */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography
                      variant="h6"
                      component="h2"
                      gutterBottom
                      sx={{
                        color: "#1976d2",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Dobbantó programban tanulók száma
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2, textAlign: "center" }}
                    >
                      Tanulói és felnőttképzési jogviszony (fő)
                    </Typography>

                    <TableContainer
                      component={Paper}
                      variant="outlined"
                      sx={{ overflowX: "auto", position: "relative" }}
                    >
                      <TableLoadingOverlay
                        isLoading={isSaving}
                        message="Dobbantó program adatok mentése folyamatban..."
                      />
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: "#f0f8ff" }}>
                            {schoolYears.map((year) => (
                              <TableCell
                                key={year}
                                align="center"
                                sx={{
                                  fontWeight: "bold",
                                  minWidth: 120,
                                  backgroundColor: "#f0f8ff",
                                }}
                              >
                                {year}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                            {schoolYears.map((year) => (
                              <TableCell key={year} align="center">
                                <ZeroHidingTextField
                                  type="number"
                                  value={dobbantoData.dobbanto_students[year] || 0}
                                  onChange={(e) =>
                                    handleDataChange(
                                      "dobbanto_students",
                                      year,
                                      e.target.value,
                                    )
                                  }
                                  size="small"
                                  inputProps={{
                                    min: 0,
                                    step: 1,
                                    style: { textAlign: "center" },
                                  }}
                                  sx={{ width: "80px" }}
                                  placeholder="0"
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>

                {/* Total Students Table */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography
                      variant="h6"
                      component="h2"
                      gutterBottom
                      sx={{
                        color: "#1976d2",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Tanulói összlétszám
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2, textAlign: "center" }}
                    >
                      Tanulói és felnőttképzési jogviszony (fő)
                    </Typography>

                    <TableContainer
                      component={Paper}
                      variant="outlined"
                      sx={{ overflowX: "auto", position: "relative" }}
                    >
                      <TableLoadingOverlay
                        isLoading={isSaving}
                        message="Dobbantó program adatok mentése folyamatban..."
                      />
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: "#e8f5e8" }}>
                            {schoolYears.map((year) => (
                              <TableCell
                                key={year}
                                align="center"
                                sx={{
                                  fontWeight: "bold",
                                  minWidth: 120,
                                  backgroundColor: "#f0f8ff",
                                }}
                              >
                                {year}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                            {schoolYears.map((year) => (
                              <TableCell
                                key={year}
                                align="center"
                                sx={{
                                  backgroundColor: "#f5f5f5",
                                  fontWeight: "medium",
                                  fontSize: "1.1rem",
                                }}
                              >
                                {dobbantoData.total_students[year] || 0}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>

                {/* Notification Snackbar */}
                <NotificationSnackbar
                  open={snackbarOpen}
                  message={snackbarMessage}
                  severity={snackbarSeverity}
                  onClose={handleSnackbarClose}
                  autoHideDuration={6000}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                />
              </>
            )}
          </Box>
        </Fade>

        <HistoryDialog
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          alapadatokId={selectedSchool?.id}
          tableName="dobbanto"
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
