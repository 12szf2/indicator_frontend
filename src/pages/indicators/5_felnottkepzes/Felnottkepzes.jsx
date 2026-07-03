import { formatHuNum } from "../../../utils/formatters";
import { useState, useEffect } from "react";
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
  Alert,
  Divider,
  CircularProgress,
  Container,
  Fade,
  Stack,
} from "@mui/material";
import { generateSchoolYears } from "../../../utils/schoolYears";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import { useGetTanuloLetszamQuery } from "../../../store/api/apiSlice";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import InfoFelnottkepzes from "./info_felnottkepzes";
import TitleFelnottkepzes from "./title_felnottkepzes";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";

export default function Felnottkepzes() {
  const years = generateSchoolYears();
  const selectedSchool = useSelector(selectSelectedSchool);

  // Fetch student data from API
  const { data: apiStudentData, isLoading: isFetching } =
    useGetTanuloLetszamQuery(
      { alapadatok_id: selectedSchool?.id },
      { skip: !selectedSchool?.id }, // Skip the query if no school is selected
    );

  // Initialize data objects with dynamic years
  const initializeYearData = (defaultValue = 0) => {
    const data = {};
    years.forEach((year) => {
      data[year] = defaultValue;
    });
    return data;
  };

  // First table data (read-only) - calculated percentages
  const [felnottkepzesiArany, setFelnottkepzesiArany] = useState(() =>
    initializeYearData(0),
  );

  // Second table data (editable) - absolute numbers
  const [szakmaiOktatás, setSzakmaiOktatás] = useState(() =>
    initializeYearData(0),
  );

  // Adult education data from API (jogv_tipus = 1)
  const [felnottkepzesiJogviszony, setFelnottkepzesiJogviszony] = useState(() =>
    initializeYearData(0),
  );

  // Extract adult education data from API response
  const extractAdultEducationData = (apiData) => {
    const adultEducationData = {};
    years.forEach((yearRange) => {
      const startYear = parseInt(yearRange.split("/")[0]);
      adultEducationData[yearRange] = 0;

      if (apiData && Array.isArray(apiData)) {
        // Find records for this year with jogv_tipus = 1 (adult education)
        const yearRecords = apiData.filter(
          (record) =>
            record.jogv_tipus === 1 && record.tanev_kezdete === startYear,
        );
        // Sum up all the student counts for adult education
        const totalCount = yearRecords.reduce((sum, record) => {
          return sum + (record.letszam || 0);
        }, 0);
        console.log(
          `Year: ${yearRange}, Start Year: ${startYear}, Adult Education Count: ${totalCount}, Records found: ${yearRecords.length}`,
        );
        adultEducationData[yearRange] = totalCount;
      }
    });
    return adultEducationData;
  };

  // Extract total student data (all jogv_tipus) for percentage calculation
  const extractTotalStudentData = (apiData) => {
    const totalStudentData = {};
    years.forEach((yearRange) => {
      const startYear = parseInt(yearRange.split("/")[0]);
      totalStudentData[yearRange] = 0;

      if (apiData && Array.isArray(apiData)) {
        // Find all records for this year
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

  // Load data from API when it's available
  useEffect(() => {
    if (apiStudentData && Array.isArray(apiStudentData)) {
      console.log("Loading student data from API:", apiStudentData);

      // Debug: Log unique jogv_tipus values and years
      const uniqueJogvTipus = [
        ...new Set(apiStudentData.map((record) => record.jogv_tipus)),
      ];
      const uniqueYears = [
        ...new Set(apiStudentData.map((record) => record.tanev_kezdete)),
      ];
      console.log("Unique jogv_tipus values:", uniqueJogvTipus);
      console.log("Unique years found:", uniqueYears);

      // Debug: Show sample records
      console.log("Sample records:", apiStudentData.slice(0, 3));

      // Extract adult education data (jogv_tipus = 1)
      const adultEducationData = extractAdultEducationData(apiStudentData);
      setFelnottkepzesiJogviszony(adultEducationData);

      // Extract total student data for calculation base
      const totalStudentData = extractTotalStudentData(apiStudentData);
      setSzakmaiOktatás(totalStudentData);

      console.log("Adult education data:", adultEducationData);
      console.log("Total student data:", totalStudentData);
    }
  }, [apiStudentData]);

  // Calculate percentage for first table based on formula
  const calculatePercentage = (year) => {
    // Formula: (felnőttképzési jogviszonyú tanulók száma / szakmai oktatásban tanulók összlétszáma) * 100
    const szakmaiCount = szakmaiOktatás[year] || 0;
    const felnottkepzesiCount = felnottkepzesiJogviszony[year] || 0;

    if (szakmaiCount === 0) return 0;

    const percentage = (felnottkepzesiCount / szakmaiCount) * 100;
    return Math.round(percentage * 10) / 10; // Round to 1 decimal place
  };

  // Update calculated percentages when data changes
  useEffect(() => {
    const newArany = {};
    years.forEach((year) => {
      newArany[year] = calculatePercentage(year);
    });
    setFelnottkepzesiArany(newArany);
  }, [szakmaiOktatás, felnottkepzesiJogviszony]);

  return (
    <Container maxWidth="xl">
      <PageWrapper
        titleContent={<TitleFelnottkepzes />}
        infoContent={<InfoFelnottkepzes />}
      >
        <Fade in={true} timeout={800}>
          <Box sx={{ minHeight: "calc(100vh - 120px)" }}>
            <Stack direction="row" spacing={2} sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mb: 2 }}>
              <ExportDOMTableToExcel
                tableId=".MuiTable-root"
                fileName="felnottkepzes"
              />
              <LockStatusIndicator tableName="felnottkepzes" />
            </Stack>

            {/* Loading State */}
            <PageLoadingOverlay isLoading={isFetching} />

            {/* Content - only show when not loading */}
            {!isFetching && (
              <>
                {/* Selected School Alert */}
                {selectedSchool && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Kiválasztott iskola:{" "}
                    <strong>{selectedSchool.iskola_neve}</strong>
                  </Alert>
                )}

                {!selectedSchool && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Nincs iskola kiválasztva - az összes iskola adatait összegzi
                    a rendszer.
                  </Alert>
                )}

                {/* First Table - Read Only (Percentages) */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" component="h2" gutterBottom>
                      Felnőttképzési jogviszonyú tanulók aránya (%)
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      Ez a táblázat automatikusan számított értékeket tartalmaz
                      és nem módosítható.
                    </Typography>

                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                            {years.map((year) => (
                              <TableCell
                                key={year}
                                align="center"
                                sx={{ fontWeight: "bold" }}
                              >
                                {year}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            {years.map((year) => (
                              <TableCell key={year} align="center">
                                {felnottkepzesiArany[year]}%
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>

                <Divider sx={{ my: 3 }} />

                {/* Third Table - Adult Education Numbers (Read Only) */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" component="h2" gutterBottom>
                      Felnőttképzési jogviszonyú tanulók száma (fő)
                    </Typography>

                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: "#e8f5e8" }}>
                            {years.map((year) => (
                              <TableCell
                                key={year}
                                align="center"
                                sx={{ fontWeight: "bold" }}
                              >
                                {year}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            {years.map((year) => (
                              <TableCell
                                key={year}
                                align="center"
                                sx={{
                                  backgroundColor: "#e8f5e8",
                                  fontWeight: "medium",
                                }}
                              >
                                {formatHuNum(felnottkepzesiJogviszony[year])}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>

                <Divider sx={{ my: 3 }} />

                {/* Second Table - Total Student Numbers (Read Only from API) */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="h2" gutterBottom>
                      Szakmai oktatásban tanulók összlétszáma (fő)
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                            {years.map((year) => (
                              <TableCell
                                key={year}
                                align="center"
                                sx={{ fontWeight: "bold" }}
                              >
                                {year}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            {years.map((year) => (
                              <TableCell
                                key={year}
                                align="center"
                                sx={{
                                  backgroundColor: "#f5f5f5",
                                  fontWeight: "medium",
                                }}
                              >
                                {formatHuNum(szakmaiOktatás[year])}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>

                {/* Formula Information */}
                <Card sx={{ mt: 3, backgroundColor: "#f5f5f5" }}>
                  <CardContent>
                    <Typography variant="h6" component="h3" gutterBottom>
                      Számítási formula
                    </Typography>
                    <Typography variant="body2" component="div">
                      <strong>
                        Felnőttképzési jogviszonyú tanulók aránya =
                      </strong>
                      <br />
                      (felnőttképzési jogviszonyú rendszerekben tanulók száma /
                      szakmai oktatásban tanulók összlétszáma) × 100
                    </Typography>
                  </CardContent>
                </Card>
              </>
            )}
          </Box>
        </Fade>
      </PageWrapper>
    </Container>
  );
}
