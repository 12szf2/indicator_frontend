import React, { useState, useEffect } from "react";
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
  CircularProgress,
  Chip,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoKompetencia from "./info_kompetencia";
import TitleKompetencia from "./title_kompetencia";
import {
  useGetKompetenciaQuery,
  useAddKompetenciaMutation,
  useUpdateKompetenciaMutation,
} from "../../../store/api/apiSlice";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import { generateSchoolYears } from "../../../utils/schoolYears";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

export default function Kompetencia() {
  const selectedSchool = useSelector(selectSelectedSchool);
  const years = generateSchoolYears().map((y) => parseInt(y.split("/")[0]));

  // Queries
  const {
    data: apiData,
    isLoading,
    isFetching,
    refetch: refetchKompetencia,
    error,
  } = useGetKompetenciaQuery(
    { id: selectedSchool?.id },
    { skip: !selectedSchool?.id },
  );

  const [addKompetencia, { isLoading: isAdding }] = useAddKompetenciaMutation();
  const [updateKompetencia, { isLoading: isUpdating }] =
    useUpdateKompetenciaMutation();
  const isSaving = isAdding || isUpdating;

  // Local state for the grid
  // Structure: { [year]: { technikum: { id: null, ... }, szakkepzo: { id: null, ... } } }
  const [tableData, setTableData] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize data
  useEffect(() => {
    if (apiData && Array.isArray(apiData)) {
      const initialData = {};

      // Pre-fill structure to ensure all cells exist
      years.forEach((year) => {
        initialData[year] = {
          technikum: {
            id: null,
            mat_orsz: "",
            mat_int: "",
            szoveg_orsz: "",
            szoveg_int: "",
          },
          szakkepzo: {
            id: null,
            mat_orsz: "",
            mat_int: "",
            szoveg_orsz: "",
            szoveg_int: "",
          },
        };
      });

      // Fill with API data
      apiData.forEach((item) => {
        // Parse year from date string (e.g. "2024-09-01" -> 2024)
        let year = item.tanev_kezdete;
        if (typeof year === "string") {
          year = parseInt(year.split("-")[0]);
        }

        // Map backend form values to local state keys
        let form = item.kepzes_forma; // "Technikum" or "Szakképző"
        if (form === "Technikum") form = "technikum";
        else if (form === "Szakképző" || form === "Szakkepzo")
          form = "szakkepzo";

        if (initialData[year] && initialData[year][form]) {
          initialData[year][form] = {
            id: item.id, // Store ID for updates
            mat_orsz: item.mat_orsz_p ?? "",
            mat_int: item.mat_int_p ?? "",
            szoveg_orsz: item.szoveg_orsz_p ?? "",
            szoveg_int: item.szoveg_int_p ?? "",
          };
        }
      });
      setTableData(initialData);
    } else if (!isLoading) {
      // Initialize empty if no data yet
      const emptyData = {};
      years.forEach((year) => {
        emptyData[year] = {
          technikum: {
            id: null,
            mat_orsz: "",
            mat_int: "",
            szoveg_orsz: "",
            szoveg_int: "",
          },
          szakkepzo: {
            id: null,
            mat_orsz: "",
            mat_int: "",
            szoveg_orsz: "",
            szoveg_int: "",
          },
        };
      });
      setTableData(emptyData);
    }
    // Reset modified state on load
    setIsModified(false);
  }, [apiData, isLoading]);

  const handleDataChange = (year, form, field, value) => {
    // Prevent negative numbers
    if (value < 0) return;

    setTableData((prev) => ({
      ...prev,
      [year]: {
        ...prev[year],
        [form]: {
          ...prev[year][form],
          [field]: value,
        },
      },
    }));
    setIsModified(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!selectedSchool?.id) return;

    const promises = [];

    // Iterate over years and forms
    Object.keys(tableData).forEach((year) => {
      ["technikum", "szakkepzo"].forEach((form) => {
        const record = tableData[year][form];

        const payload = {
          alapadatok_id: selectedSchool.id,
          tanev_kezdete: parseInt(year),
          kepzes_forma: form === "technikum" ? "Technikum" : "Szakképző",
          mat_orsz_p: record.mat_orsz === "" ? 0 : parseFloat(record.mat_orsz),
          mat_int_p: record.mat_int === "" ? 0 : parseFloat(record.mat_int),
          szoveg_orsz_p:
            record.szoveg_orsz === "" ? 0 : parseFloat(record.szoveg_orsz),
          szoveg_int_p:
            record.szoveg_int === "" ? 0 : parseFloat(record.szoveg_int),
          id: record.id,
        };

        if (record.id) {
          // Update existing record
          console.log("Updating payload:", payload);
          promises.push(updateKompetencia({ ...payload }).unwrap());
        } else {
          // Create new record only if it has meaningful data (optional check, but good practice)
          // Check if any field has data
          const hasData =
            record.mat_orsz !== "" ||
            record.mat_int !== "" ||
            record.szoveg_orsz !== "" ||
            record.szoveg_int !== "";
          if (hasData) {
            console.log("Saving new payload:", payload);
            promises.push(addKompetencia(payload).unwrap());
          }
        }
      });
    });

    try {
      await Promise.all(promises);
      setSaveSuccess(true);
      setIsModified(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save data:", err);
      // Optional: show error message
    }
  };

  const handleReset = () => {
    if (apiData && Array.isArray(apiData)) {
      const initialData = {};
      years.forEach((year) => {
        initialData[year] = {
          technikum: {
            id: null,
            mat_orsz: "",
            mat_int: "",
            szoveg_orsz: "",
            szoveg_int: "",
          },
          szakkepzo: {
            id: null,
            mat_orsz: "",
            mat_int: "",
            szoveg_orsz: "",
            szoveg_int: "",
          },
        };
      });
      apiData.forEach((item) => {
        // Parse year from date string (e.g. "2024-09-01" -> 2024)
        let year = item.tanev_kezdete;
        if (typeof year === "string") {
          year = parseInt(year.split("-")[0]);
        }

        // Map backend form values to local state keys
        let form = item.kepzes_forma; // "Technikum" or "Szakképző"
        if (form === "Technikum") form = "technikum";
        else if (form === "Szakképző" || form === "Szakkepzo")
          form = "szakkepzo";

        if (initialData[year] && initialData[year][form]) {
          initialData[year][form] = {
            id: item.id,
            mat_orsz: item.mat_orsz_p ?? "",
            mat_int: item.mat_int_p ?? "",
            szoveg_orsz: item.szoveg_orsz_p ?? "",
            szoveg_int: item.szoveg_int_p ?? "",
          };
        }
      });
      setTableData(initialData);
      setIsModified(false);
    }
  };

  const _shouldShowOverlay = isLoading || isFetching;

  if (error) {
    return (
      <PageWrapper
        titleContent={<TitleKompetencia />}
        infoContent={<InfoKompetencia />}
      >
        <PageLoadingOverlay isLoading={_shouldShowOverlay} />
        <Alert severity="error">
          Hiba történt az adatok betöltésekor: {JSON.stringify(error)}
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      titleContent={<TitleKompetencia />}
      infoContent={<InfoKompetencia />}
    >
      <Box>
        <LockStatusIndicator tableName="kompetencia" />

        <Card>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mb: 3 }}>
              <ExportDOMTableToExcel
                tableId=".MuiTable-root"
                fileName="export_adatok"
              />
              <LockedTableWrapper tableName="kompetencia">
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

            {saveSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Sikeres mentés!
              </Alert>
            )}

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ overflowX: "auto" }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell
                      rowSpan={2}
                      sx={{
                        fontWeight: "bold",
                        verticalAlign: "middle",
                        textAlign: "center",
                      }}
                    >
                      Mérési terület
                    </TableCell>
                    <TableCell
                      rowSpan={2}
                      sx={{
                        fontWeight: "bold",
                        verticalAlign: "middle",
                        textAlign: "center",
                      }}
                    >
                      Képzési forma
                    </TableCell>
                    {years.map((year) => (
                      <TableCell
                        key={year}
                        colSpan={2}
                        align="center"
                        sx={{ fontWeight: "bold", minWidth: 160 }}
                      >
                        {year}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    {years.map((year) => (
                      <React.Fragment key={year}>
                        <TableCell
                          align="center"
                          sx={{
                            fontWeight: "bold",
                            minWidth: 80,
                            borderLeft: "1px solid #e0e0e0",
                          }}
                        >
                          országos
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            fontWeight: "bold",
                            minWidth: 80,
                            color: "#d32f2f",
                          }}
                        >
                          intézményi
                        </TableCell>
                      </React.Fragment>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Technikum Rows */}
                  <TableRow sx={{ "&:hover": { backgroundColor: "#f5f5f5" } }}>
                    <TableCell sx={{ fontWeight: "medium" }}>
                      matematika
                    </TableCell>
                    <TableCell
                      rowSpan={2}
                      sx={{
                        verticalAlign: "middle",
                        fontWeight: "bold",
                        backgroundColor: "#fff3e0",
                      }}
                    >
                      Technikum
                    </TableCell>
                    {years.map((year) => (
                      <React.Fragment key={`tech-mat-${year}`}>
                        <TableCell
                          align="center"
                          sx={{ borderLeft: "1px solid #e0e0e0" }}
                        >
                          <ZeroHidingTextField
                            type="number"
                            size="small"
                            variant="outlined"
                            value={tableData[year]?.technikum.mat_orsz || 0}
                            onChange={(e) =>
                              handleDataChange(
                                year,
                                "technikum",
                                "mat_orsz",
                                e.target.value,
                              )
                            }
                            sx={{ width: "100px" }}
                            inputProps={{
                              style: { textAlign: "center" },
                              min: 0,
                            }}
                            placeholder="0" />
                        </TableCell>
                        <TableCell align="center">
                          <ZeroHidingTextField
                            type="number"
                            size="small"
                            variant="outlined"
                            value={tableData[year]?.technikum.mat_int || 0}
                            onChange={(e) =>
                              handleDataChange(
                                year,
                                "technikum",
                                "mat_int",
                                e.target.value,
                              )
                            }
                            sx={{
                              width: "100px",
                              "& .MuiInputBase-input": { color: "#d32f2f" },
                            }}
                            inputProps={{
                              style: { textAlign: "center" },
                              min: 0,
                            }}
                            placeholder="0" />
                        </TableCell>
                      </React.Fragment>
                    ))}
                  </TableRow>
                  <TableRow sx={{ "&:hover": { backgroundColor: "#f5f5f5" } }}>
                    <TableCell sx={{ fontWeight: "medium" }}>
                      szövegértés
                    </TableCell>
                    {/* Technikum rowSpan handled above */}
                    {years.map((year) => (
                      <React.Fragment key={`tech-szov-${year}`}>
                        <TableCell
                          align="center"
                          sx={{ borderLeft: "1px solid #e0e0e0" }}
                        >
                          <ZeroHidingTextField
                            type="number"
                            size="small"
                            variant="outlined"
                            value={tableData[year]?.technikum.szoveg_orsz || 0}
                            onChange={(e) =>
                              handleDataChange(
                                year,
                                "technikum",
                                "szoveg_orsz",
                                e.target.value,
                              )
                            }
                            sx={{ width: "100px" }}
                            inputProps={{
                              style: { textAlign: "center" },
                              min: 0,
                            }}
                            placeholder="0" />
                        </TableCell>
                        <TableCell align="center">
                          <ZeroHidingTextField
                            type="number"
                            size="small"
                            variant="outlined"
                            value={tableData[year]?.technikum.szoveg_int || 0}
                            onChange={(e) =>
                              handleDataChange(
                                year,
                                "technikum",
                                "szoveg_int",
                                e.target.value,
                              )
                            }
                            sx={{
                              width: "100px",
                              "& .MuiInputBase-input": { color: "#d32f2f" },
                            }}
                            inputProps={{
                              style: { textAlign: "center" },
                              min: 0,
                            }}
                            placeholder="0" />
                        </TableCell>
                      </React.Fragment>
                    ))}
                  </TableRow>

                  {/* Szakképző Rows */}
                  <TableRow
                    sx={{
                      borderTop: "2px solid #e0e0e0",
                      "&:hover": { backgroundColor: "#f5f5f5" },
                    }}
                  >
                    <TableCell sx={{ fontWeight: "medium" }}>
                      matematika
                    </TableCell>
                    <TableCell
                      rowSpan={2}
                      sx={{
                        verticalAlign: "middle",
                        fontWeight: "bold",
                        backgroundColor: "#f0f8ff",
                      }}
                    >
                      Szakképző
                    </TableCell>
                    {years.map((year) => (
                      <React.Fragment key={`szak-mat-${year}`}>
                        <TableCell
                          align="center"
                          sx={{ borderLeft: "1px solid #e0e0e0" }}
                        >
                          <ZeroHidingTextField
                            type="number"
                            size="small"
                            variant="outlined"
                            value={tableData[year]?.szakkepzo.mat_orsz || 0}
                            onChange={(e) =>
                              handleDataChange(
                                year,
                                "szakkepzo",
                                "mat_orsz",
                                e.target.value,
                              )
                            }
                            sx={{ width: "100px" }}
                            inputProps={{
                              style: { textAlign: "center" },
                              min: 0,
                            }}
                            placeholder="0" />
                        </TableCell>
                        <TableCell align="center">
                          <ZeroHidingTextField
                            type="number"
                            size="small"
                            variant="outlined"
                            value={tableData[year]?.szakkepzo.mat_int || 0}
                            onChange={(e) =>
                              handleDataChange(
                                year,
                                "szakkepzo",
                                "mat_int",
                                e.target.value,
                              )
                            }
                            sx={{
                              width: "100px",
                              "& .MuiInputBase-input": { color: "#d32f2f" },
                            }}
                            inputProps={{
                              style: { textAlign: "center" },
                              min: 0,
                            }}
                            placeholder="0" />
                        </TableCell>
                      </React.Fragment>
                    ))}
                  </TableRow>
                  <TableRow sx={{ "&:hover": { backgroundColor: "#f5f5f5" } }}>
                    <TableCell sx={{ fontWeight: "medium" }}>
                      szövegértés
                    </TableCell>
                    {/* Szakképző rowSpan handled above */}
                    {years.map((year) => (
                      <React.Fragment key={`szak-szov-${year}`}>
                        <TableCell
                          align="center"
                          sx={{ borderLeft: "1px solid #e0e0e0" }}
                        >
                          <ZeroHidingTextField
                            type="number"
                            size="small"
                            variant="outlined"
                            value={tableData[year]?.szakkepzo.szoveg_orsz || 0}
                            onChange={(e) =>
                              handleDataChange(
                                year,
                                "szakkepzo",
                                "szoveg_orsz",
                                e.target.value,
                              )
                            }
                            sx={{ width: "100px" }}
                            inputProps={{
                              style: { textAlign: "center" },
                              min: 0,
                            }}
                            placeholder="0" />
                        </TableCell>
                        <TableCell align="center">
                          <ZeroHidingTextField
                            type="number"
                            size="small"
                            variant="outlined"
                            value={tableData[year]?.szakkepzo.szoveg_int || 0}
                            onChange={(e) =>
                              handleDataChange(
                                year,
                                "szakkepzo",
                                "szoveg_int",
                                e.target.value,
                              )
                            }
                            sx={{
                              width: "100px",
                              "& .MuiInputBase-input": { color: "#d32f2f" },
                            }}
                            inputProps={{
                              style: { textAlign: "center" },
                              min: 0,
                            }}
                            placeholder="0" />
                        </TableCell>
                      </React.Fragment>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Box
              sx={{ mt: 3, p: 2, backgroundColor: "#fff3e0", borderRadius: 1 }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Jelmagyarázat:
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box display="flex" alignItems="center">
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: "1px solid grey",
                      mr: 1,
                    }}
                  ></Box>
                  <Typography variant="body2">Országos átlag</Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: "1px solid red",
                      mr: 1,
                      backgroundColor: "rgba(255,0,0,0.1)",
                    }}
                  ></Box>
                  <Typography variant="body2" color="error">
                    Intézményi eredmény
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <HistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        alapadatokId={selectedSchool?.id}
        tableName="kompetencia"
        onRollbackSuccess={() => {
          setSaveSuccess(true);
          refetchKompetencia();
          setTimeout(() => setSaveSuccess(false), 3000);
        }}
      />
    </PageWrapper>
  );
}
