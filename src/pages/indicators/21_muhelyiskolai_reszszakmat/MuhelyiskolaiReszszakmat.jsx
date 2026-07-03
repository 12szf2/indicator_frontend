import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
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
  Container,
  Fade,
  CircularProgress,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import { generateSchoolYears } from "../../../utils/schoolYears";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import {
  useGetTanuloLetszamQuery,
  useAddMuhelyiskolaMutation,
  useUpdateMuhelyiskolaMutation,
  useGetMuhelyiskolaQuery,
} from "../../../store/api/apiSlice";
import {
  TableLoadingOverlay,
  NotificationSnackbar,
} from "../../../components/shared";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoMuhelyiskolaiReszszakmat from "./info_muhelyiskolai_reszszakmat";
import TitleMuhelyiskolaiReszszakmat from "./title_muhelyiskolai_reszszakmat";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

export default function MuhelyiskolaiReszszakmat() {
  const schoolYears = generateSchoolYears();
  const selectedSchool = useSelector(selectSelectedSchool);

  // Fetch student data from API
  const { data: apiStudentData, isLoading: isFetching } =
    useGetTanuloLetszamQuery(
      { alapadatok_id: selectedSchool?.id },
      { skip: !selectedSchool?.id }, // Skip the query if no school is selected
    );

  // Fetch existing workshop data from API for all years
  const workshopQueries = schoolYears.map((yearRange) => {
    const startYear = parseInt(yearRange.split("/")[0]);
    return useGetMuhelyiskolaQuery(
      {
        alapadatok_id: selectedSchool?.id,
        tanev: startYear,
      },
      { skip: !selectedSchool?.id },
    );
  });

  // Memoize combined workshop data and loading states to prevent infinite loops
  const existingWorkshopData = useMemo(() => {
    return workshopQueries.flatMap((query) => query.data || []);
  }, [
    workshopQueries.map((q) => JSON.stringify(q.data)).join(","),
    selectedSchool?.id,
  ]);

  const isWorkshopFetching = useMemo(() => {
    return workshopQueries.some((query) => query.isLoading || query.isFetching);
  }, [workshopQueries.map((q) => q.isLoading || q.isFetching).join(",")]);

  // Mutations for saving workshop data
  const [addWorkshop, { isLoading: isAdding, error: addError }] =
    useAddMuhelyiskolaMutation();
  const [updateWorkshop, { isLoading: isUpdating, error: updateError }] =
    useUpdateMuhelyiskolaMutation();

  const isSaving = isAdding || isUpdating;
  const saveError = addError || updateError;

  const [historyOpen, setHistoryOpen] = useState(false);

  // Data structure for the three main sections
  const [workshopData, setWorkshopData] = useState(() => {
    const initialData = {
      percentage_overall: {},
      participants_count: {},
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
        "Loading student data from API for Workshop School:",
        apiStudentData,
      );

      // Extract total student data (all jogv_tipus combined)
      const totalStudentData = extractTotalStudentData(apiStudentData);

      // Update the total_students in workshopData
      setWorkshopData((prev) => ({
        ...prev,
        total_students: totalStudentData,
      }));

      // Also update saved data to include total students for proper reset functionality
      setSavedData((prev) => ({
        ...prev,
        total_students: totalStudentData,
        participants_count: prev?.participants_count || {},
        percentage_overall: prev?.percentage_overall || {},
      }));

      console.log("Total student data for Workshop School:", totalStudentData);
    }
  }, [apiStudentData]);

  // Load existing workshop data from API when available
  useEffect(() => {
    if (existingWorkshopData) {
      console.log("Loading existing workshop data:", existingWorkshopData);

      const participantsCountData = {};

      // Initialize all years to 0 first
      schoolYears.forEach((year) => {
        participantsCountData[year] = "0";
      });

      // Process existing workshop data
      existingWorkshopData.forEach((record) => {
        const yearRange = `${record.tanev_kezdete}/${record.tanev_kezdete + 1}`;
        participantsCountData[yearRange] =
          record.reszszakmat_szerezok_szama || 0;
      });

      // Update participants_count with existing data
      setWorkshopData((prev) => ({
        ...prev,
        participants_count: participantsCountData,
      }));

      // Set as saved data since this is loaded from server
      setSavedData((prev) => ({
        ...prev,
        participants_count: participantsCountData,
        total_students: prev?.total_students || {},
        percentage_overall: prev?.percentage_overall || {},
      }));

      setIsModified(false);

      console.log("Loaded workshop participants data:", participantsCountData);
    }
  }, [existingWorkshopData, selectedSchool?.id]);

  // Handle data changes - only participants_count is editable
  const handleDataChange = (section, year, value) => {
    // Only participants_count is editable
    if (section !== "participants_count") return;

    // Validate that participants don't exceed total students
    const totalStudents = parseInt(workshopData.total_students[year] || 0);
    const participantsValue = parseInt(value || 0);

    if (participantsValue > totalStudents && totalStudents > 0) {
      setSnackbarMessage(
        `A részszakmát szerző tanulók száma (${participantsValue}) nem lehet nagyobb az összlétszámnál (${totalStudents}) a(z) ${year} tanévben!`,
      );
      setSnackbarSeverity("warning");
      setSnackbarOpen(true);
      return;
    }

    setWorkshopData((prev) => ({
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
    const participants = parseFloat(workshopData.participants_count[year] || 0);
    const total = parseFloat(workshopData.total_students[year] || 0);

    if (total > 0) {
      const percentage = ((participants / total) * 100).toFixed(1);
      return percentage;
    }
    return "0.0";
  };

  // Check if percentage exceeds 100% for any year
  const hasPercentageWarning = () => {
    return schoolYears.some((year) => {
      const percentage = parseFloat(calculatePercentage(year));
      return percentage > 100;
    });
  };

  // Auto-calculate percentages when participants_count or total_students change
  useEffect(() => {
    const newPercentages = {};
    schoolYears.forEach((year) => {
      newPercentages[year] = calculatePercentage(year);
    });

    setWorkshopData((prev) => ({
      ...prev,
      percentage_overall: newPercentages,
    }));
  }, [
    JSON.stringify(workshopData.participants_count),
    JSON.stringify(workshopData.total_students),
  ]);

  const handleSave = async () => {
    if (!selectedSchool?.id) {
      setSnackbarMessage("Kérjük, válasszon ki egy iskolát a mentés előtt!");
      setSnackbarSeverity("warning");
      setSnackbarOpen(true);
      return;
    }

    try {
      // Save for each school year separately
      const savePromises = schoolYears.map(async (yearRange) => {
        const startYear = parseInt(yearRange.split("/")[0]);
        const participants = parseInt(
          workshopData.participants_count[yearRange] || 0,
        );
        const totalStudents = parseInt(
          workshopData.total_students[yearRange] || 0,
        );

        // Ensure we're sending valid numbers, not NaN
        const validParticipants = isNaN(participants)
          ? 0
          : Math.max(0, participants);
        const validTotalStudents = isNaN(totalStudents)
          ? 0
          : Math.max(0, totalStudents);

        // Ensure the numbers are integers
        const finalParticipants = parseInt(validParticipants);
        const finalTotalStudents = parseInt(validTotalStudents);

        console.log(
          `Mentés ${yearRange}: participants=${finalParticipants}, total=${finalTotalStudents}`,
        );
        console.log(
          `Raw data - participants: "${workshopData.participants_count[yearRange]}", total: "${workshopData.total_students[yearRange]}"`,
        );

        // Always save the data, even if values are 0

        // Check if data already exists for this year
        const existingRecord = existingWorkshopData?.find(
          (record) => record.tanev_kezdete === startYear,
        );

        const payload = {
          alapadatok_id: selectedSchool.id,
          tanev_kezdete: startYear,
          reszszakmat_szerezok_szama: finalParticipants,
          muhelyiskola_tanuloi_osszletszam: finalTotalStudents,
        };

        console.log(`Payload for ${yearRange}:`, payload);

        if (existingRecord) {
          // Update existing record (PUT)
          console.log(
            `Updating existing record for ${yearRange}, ID: ${existingRecord.id}`,
          );
          return await updateWorkshop({
            id: existingRecord.id,
            ...payload,
          }).unwrap();
        } else {
          // Create new record (POST)
          console.log(`Creating new record for ${yearRange}`);
          console.log(`Full POST payload:`, payload);
          return await addWorkshop(payload).unwrap();
        }
      });

      await Promise.all(savePromises);

      setSavedData(JSON.parse(JSON.stringify(workshopData)));
      setIsModified(false);
      console.log("Műhelyiskolai adatok sikeresen mentve!");

      // Show success notification
      setSnackbarMessage("Műhelyiskolai adatok sikeresen mentve!");
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
      setWorkshopData(JSON.parse(JSON.stringify(savedData)));
      setIsModified(false);
      setSnackbarMessage("Adatok visszaállítva az utolsó mentett állapotra!");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
    } else {
      // If no saved data, reset to initial state with zeros
      const initialData = {
        percentage_overall: {},
        participants_count: {},
        total_students: workshopData.total_students, // Keep total students from API
      };

      Object.keys(initialData).forEach((section) => {
        if (section !== "total_students") {
          schoolYears.forEach((year) => {
            initialData[section][year] = "0";
          });
        }
      });

      setWorkshopData(initialData);
      setIsModified(false);
      setSnackbarMessage("Adatok visszaállítva az alapértelmezett állapotra!");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
    }
  };

  return (
    <Container maxWidth="xl">
      <PageWrapper
        titleContent={<TitleMuhelyiskolaiReszszakmat />}
        infoContent={<InfoMuhelyiskolaiReszszakmat />}
      >
        <Fade in={true} timeout={800}>
          <Box sx={{ minHeight: "calc(100vh - 120px)" }}>
            <LockStatusIndicator tableName="muhelyiskola" />
            <PageLoadingOverlay isLoading={isFetching} />

            {/* Loading overlay */}

            {/* Content - only show when not loading */}

            <>
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  mt: 3,
                  mb: 3,
                  position: "sticky",
                  top: 2,
                  zIndex: 10,
                  backgroundColor: "white",
                  padding: 1,
                  borderRadius: 1,
                }}
              >
                <ExportDOMTableToExcel
                  tableId=".MuiTable-root"
                  fileName="export_adatok"
                />
                <LockedTableWrapper tableName="muhelyiskola">
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
                    disabled={!isModified || isSaving}
                  >
                    Visszaállítás
                  </Button>
                </LockedTableWrapper>
              </Stack>

              {/* Instructions Card */}

              {/* Status Messages */}
              {!selectedSchool && (
                <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                  Kérjük, válasszon ki egy iskolát az adatok betöltéséhez és
                  mentéséhez.
                </Alert>
              )}

              {hasPercentageWarning() && (
                <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                  Figyelem! A részszakmát szerző tanulók száma meghaladja az
                  összlétszámot egy vagy több tanévben. Az arány 100% felett
                  van! Kérjük, ellenőrizze az adatokat.
                </Alert>
              )}

              {isModified && (
                <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                  Mentetlen módosítások vannak. Ne felejtsd el menteni a
                  változtatásokat!
                </Alert>
              )}

              {/* Main Data Tables */}

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
                    Műhelyiskolában részszakmát szerzők aránya (%)
                  </Typography>

                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ overflowX: "auto" }}
                  >
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
                              calculatePercentage(year),
                            );
                            const isOverLimit = percentage > 100;

                            return (
                              <TableCell key={year} align="center">
                                <ZeroHidingTextField

                                  value={workshopData.percentage_overall[year] || 0}
                                  size="small"
                                  inputProps={{
                                    min: 0,
                                    max: 100,
                                    step: 0.1,
                                    style: {
                                      textAlign: "center",
                                      color: isOverLimit
                                        ? "#d32f2f"
                                        : "inherit",
                                      fontWeight: isOverLimit
                                        ? "bold"
                                        : "normal",
                                    },
                                  }}
                                  sx={{
                                    width: "80px",
                                    "& .MuiOutlinedInput-root": {
                                      backgroundColor: isOverLimit
                                        ? "#ffcdd2"
                                        : "inherit",
                                      "& fieldset": {
                                        borderColor: isOverLimit
                                          ? "#d32f2f"
                                          : "inherit",
                                      },
                                    },
                                  }}
                                  disabled // Auto-calculated field
                                  placeholder="0" />
                                {isOverLimit && (
                                  <Typography
                                    variant="caption"
                                    color="error"
                                    sx={{ display: "block", mt: 0.5 }}
                                  >
                                    Túllépi!
                                  </Typography>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Participant Count Table */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography
                    variant="h6"
                    component="h2"
                    gutterBottom
                    sx={{
                      color: "#1976d2",
                      fontWeight: "bold",
                    }}
                  >
                    Részszakmát szerző tanulók száma
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Tanulói és felnőttképzési jogviszony (fő)
                  </Typography>

                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ overflowX: "auto" }}
                  >
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
                                value={workshopData.participants_count[year] || 0}
                                onChange={(e) =>
                                  handleDataChange(
                                    "participants_count",
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
                    }}
                  >
                    Műhelyiskolai tanulói összlétszám
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Tanulói és felnőttképzési jogviszony (fő)
                  </Typography>

                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ overflowX: "auto" }}
                  >
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
                            <TableCell key={year} align="center">
                              <ZeroHidingTextField

                                value={workshopData.total_students[year] || 0}
                                size="small"
                                inputProps={{
                                  min: 0,
                                  step: 1,
                                  style: { textAlign: "center" },
                                }}
                                sx={{ width: "80px" }}
                                placeholder="0"
                                disabled // Read-only field from API
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
              <Card sx={{ mb: 3, backgroundColor: "#fff9c4" }}>
                <CardContent>
                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: "#f0f8ff",
                      borderRadius: 1,
                      border: "1px solid #f0f8ff",
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontStyle: "italic", flex: 1 }}
                    >
                      <strong>Számítási képlet:</strong>
                      <br />
                      (Részszakmát szerző tanulók és felnőttképzési jogviszonyú
                      tanulók száma / Műhelyiskolai tanulói és felnőttképzési
                      jogviszonyú tanulók összlétszáma) × 100
                    </Typography>
                    <Box
                      sx={{
                        fontSize: "2rem",
                        fontWeight: "bold",
                        color: "#1976d2",
                        textAlign: "center",
                        minWidth: "100px",
                      }}
                    >
                      = %
                    </Box>
                  </Box>
                </CardContent>
              </Card>
              {/* Action Buttons */}

              {/* Notification Snackbar */}
              <NotificationSnackbar
                open={snackbarOpen}
                message={snackbarMessage}
                severity={snackbarSeverity}
                onClose={() => setSnackbarOpen(false)}
              />
            </>
          </Box>
        </Fade>

        <HistoryDialog
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          alapadatokId={selectedSchool?.id}
          tableName="muhelyiskola"
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
