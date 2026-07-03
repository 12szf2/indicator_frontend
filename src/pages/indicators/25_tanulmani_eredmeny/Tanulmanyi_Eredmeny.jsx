import { formatHuNum } from "../../../utils/formatters";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import React, { useState, useMemo, useEffect } from "react";
import { useSelector } from "react-redux";
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
  Alert,
  Snackbar,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import {
  useGetAllAlapadatokQuery,
  useGetTanulmanyiEredmenyQuery,
  useAddTanulmanyiEredmenyMutation,
  useUpdateTanulmanyiEredmenyMutation,
} from "../../../store/api/apiSlice";
import { generateSchoolYears } from "../../../utils/schoolYears";
import PageWrapper from "../../PageWrapper";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import InfoTanulmanyiEredmeny from "./info_tanulmani_eredmeny";
import TitleTanulmanyiEredmeny from "./title_tanulmani_eredmeny";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

const evszamok = generateSchoolYears();

export default function TanulmanyiEredmeny() {
  const selectedSchool = useSelector(selectSelectedSchool);
  const { data: schoolsData } = useGetAllAlapadatokQuery();

  const [tableData, setTableData] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [originalData, setOriginalData] = useState({});
  const [isModified, setIsModified] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [isSaving, setIsSaving] = useState(false);

  const [addTanulmanyiEredmeny] = useAddTanulmanyiEredmenyMutation();
  const [updateTanulmanyiEredmeny] = useUpdateTanulmanyiEredmenyMutation();

  // Determine institution types from alapadatok
  const institutionTypes = useMemo(() => {
    if (!schoolsData || !Array.isArray(schoolsData)) return [];

    let relevantSchools = schoolsData;
    if (selectedSchool) {
      relevantSchools = schoolsData.filter(
        (school) => school.id === selectedSchool.id,
      );
    }

    const types = [
      ...new Set(relevantSchools.map((school) => school.intezmeny_tipus)),
    ].filter(Boolean);
    return types;
  }, [schoolsData, selectedSchool]);

  // Fetch data for all years
  const currentYearFormatted =
    evszamok.length > 0
      ? parseInt(evszamok[evszamok.length - 1].split("/")[0])
      : new Date().getFullYear();

  const { data: tanulmanyiData, isFetching: isTanulmanyiFetching } =
    useGetTanulmanyiEredmenyQuery(
      { alapadatok_id: selectedSchool?.id },
      { skip: !selectedSchool },
    );

  // Initialize table data from API response
  useEffect(() => {
    if (tanulmanyiData && !isTanulmanyiFetching) {
      const formattedData = {};
      const originalFormattedData = {};

      // Initialize structure for all years
      evszamok.forEach((yearStr) => {
        formattedData[yearStr] = {};
        originalFormattedData[yearStr] = {};
      });

      if (Array.isArray(tanulmanyiData)) {
        tanulmanyiData.forEach((item) => {
          const {
            intezmeny_tipus,
            jogviszony,
            felev,
            kituno,
            bukott,
            id,
            tanev_kezdete,
          } = item;

          // Find the matching school year string
          const yearStr = evszamok.find(
            (y) => parseInt(y.split("/")[0]) === tanev_kezdete,
          );
          if (!yearStr) return;

          if (!formattedData[yearStr][intezmeny_tipus]) {
            formattedData[yearStr][intezmeny_tipus] = {};
            originalFormattedData[yearStr][intezmeny_tipus] = {};
          }
          if (!formattedData[yearStr][intezmeny_tipus][jogviszony]) {
            formattedData[yearStr][intezmeny_tipus][jogviszony] = {};
            originalFormattedData[yearStr][intezmeny_tipus][jogviszony] = {};
          }

          const semesterData = {
            id,
            kituno:
              kituno !== null && kituno !== undefined ? parseFloat(kituno) : "",
            bukott:
              bukott !== null && bukott !== undefined ? parseFloat(bukott) : "",
          };

          formattedData[yearStr][intezmeny_tipus][jogviszony][felev] = {
            ...semesterData,
          };
          originalFormattedData[yearStr][intezmeny_tipus][jogviszony][felev] = {
            ...semesterData,
          };
        });
      }

      setTableData(formattedData);
      setOriginalData(JSON.parse(JSON.stringify(formattedData)));
      setIsModified(false);
    }
  }, [tanulmanyiData, isTanulmanyiFetching]);

  const handleReset = () => {
    setTableData(JSON.parse(JSON.stringify(originalData)));
    setIsModified(false);
  };

  const isFieldModified = (yearStr, instType, jogv, semester, field) => {
    const orig =
      originalData[yearStr]?.[instType]?.[jogv]?.[semester]?.[field] ?? "";
    const curr =
      tableData[yearStr]?.[instType]?.[jogv]?.[semester]?.[field] ?? "";
    return orig !== curr;
  };

  const getFieldSx = (yearStr, instType, jogv, semester, field) => ({
    "& input": {
      textAlign: "right",
      p: 1,
      backgroundColor: isFieldModified(yearStr, instType, jogv, semester, field)
        ? "#fff9c4"
        : "inherit",
    },
  });

  const handleDataChange = (
    yearStr,
    instType,
    jogviszony,
    semester,
    field,
    value,
  ) => {
    // Prevent negative numbers entirely by sanitizing input
    const sanitizedValue = value.replace(/-/g, "");
    if (sanitizedValue !== "" && isNaN(sanitizedValue)) return;

    setTableData((prev) => {
      const yearData = prev[yearStr] || {};
      const instData = yearData[instType] || {};
      const jogvData = instData[jogviszony] || {};
      const semesterData = jogvData[semester] || {};

      return {
        ...prev,
        [yearStr]: {
          ...yearData,
          [instType]: {
            ...instData,
            [jogviszony]: {
              ...jogvData,
              [semester]: {
                ...semesterData,
                [field]:
                  sanitizedValue === "" ? "" : parseFloat(sanitizedValue),
              },
            },
          },
        },
      };
    });
    setIsModified(true);
  };

  const getCellValue = (yearStr, instType, jogviszony, semester, field) => {
    const val =
      tableData[yearStr]?.[instType]?.[jogviszony]?.[semester]?.[field];
    return val !== undefined ? val : "";
  };

  const getNumericValue = (yearStr, instType, jogviszony, semester, field) => {
    const val = getCellValue(yearStr, instType, jogviszony, semester, field);
    return val === "" ? 0 : parseFloat(val);
  };

  // Calculate grand totals for Összesen row
  const calculateGrandTotal = (yearStr, semester, field) => {
    let total = 0;
    institutionTypes.forEach((instType) => {
      ["Tanulói jogviszony", "Felnőttképzési jogviszony"].forEach((jogv) => {
        total += getNumericValue(yearStr, instType, jogv, semester, field);
      });
    });
    return total;
  };

  const handleSaveData = async () => {
    setIsSaving(true);
    let updatedCount = 0;
    let savedCount = 0;

    try {
      const promises = [];

      for (const yearStr of evszamok) {
        const yearPrefix = parseInt(yearStr.split("/")[0]);

        for (const instType of institutionTypes) {
          for (const jogv of [
            "Tanulói jogviszony",
            "Felnőttképzési jogviszony",
          ]) {
            for (const semester of ["felev1", "felev2"]) {
              // Check if anything was modified in this row
              const kitunoModified = isFieldModified(
                yearStr,
                instType,
                jogv,
                semester,
                "kituno",
              );
              const bukottModified = isFieldModified(
                yearStr,
                instType,
                jogv,
                semester,
                "bukott",
              );
              if (!kitunoModified && !bukottModified) continue;

              const id =
                originalData[yearStr]?.[instType]?.[jogv]?.[semester]?.id;
              const kituno = getNumericValue(
                yearStr,
                instType,
                jogv,
                semester,
                "kituno",
              );
              const bukott = getNumericValue(
                yearStr,
                instType,
                jogv,
                semester,
                "bukott",
              );

              const recordData = {
                alapadatok_id: selectedSchool.id,
                tanev_kezdete: yearPrefix,
                intezmeny_tipusa: instType,
                jogviszony: jogv,
                felev: semester,
                kituno,
                bukott,
              };

              if (id) {
                promises.push(
                  updateTanulmanyiEredmeny({ id, ...recordData })
                    .unwrap()
                    .then(() => {
                      updatedCount++;
                    }),
                );
              } else {
                promises.push(
                  addTanulmanyiEredmeny(recordData)
                    .unwrap()
                    .then(() => {
                      savedCount++;
                    }),
                );
              }
            }
          }
        }
      }

      if (promises.length > 0) {
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

      setOriginalData(JSON.parse(JSON.stringify(tableData)));
      setIsModified(false);
    } catch (error) {
      console.error("Hiba a mentés során:", error);
      setSnackbarMessage(
        error?.data?.message || error?.message || "Hiba történt a mentés során",
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Style definitions matching Tanuloletszam pattern
  const headerSx = {
    fontWeight: "bold",
    backgroundColor: "#f0f8ff",
    color: "#000",
    textAlign: "center",
    borderBottom: "2px solid #e0e0e0",
    borderRight: "1px solid #e0e0e0",
  };

  const subHeaderSx = {
    fontWeight: "bold",
    backgroundColor: "#f0f8ff40",
    color: "#000",
    textAlign: "center",
    borderBottom: "1px solid #e0e0e0",
    borderRight: "1px solid #e0e0e0",
    p: 1,
    fontSize: "0.85rem",
  };

  const cellSx = {
    borderBottom: "1px solid #e0e0e0",
    borderRight: "1px solid #e0e0e0",
    p: 1,
  };

  // Render a single year table
  const renderYearTable = (yearStr) => {
    const shortYear = `${yearStr.split("/")[0]}/${yearStr.split("/")[1].slice(2)}`;

    return (
      <TableContainer
        key={yearStr}
        component={Paper}
        elevation={0}
        sx={{ overflowX: "auto", border: "1px solid #e0e0e0", mb: 4 }}
      >
        <Table size="small" sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell
                rowSpan={2}
                colSpan={2}
                sx={{ ...headerSx, width: "30%" }}
              ></TableCell>
              <TableCell colSpan={2} sx={headerSx}>
                {`${shortYear}-as tanév I. félév utolsó tanítási napja`}
              </TableCell>
              <TableCell colSpan={2} sx={headerSx}>
                {`${shortYear}-as tanév évvége utolsó tanítási napja`}
              </TableCell>
            </TableRow>
            <TableRow>
              {/* Semester 1 */}
              <TableCell sx={subHeaderSx}>
                Kitűnő tanulók
                <br />
                száma
                <br />
                (fő)
              </TableCell>
              <TableCell sx={subHeaderSx}>
                Bukott tanulók
                <br />
                száma
                <br />
                (Fő)
              </TableCell>
              {/* Semester 2 */}
              <TableCell sx={subHeaderSx}>
                Kitűnő tanulók
                <br />
                száma
                <br />
                (fő)
              </TableCell>
              <TableCell sx={subHeaderSx}>
                Bukott tanulók
                <br />
                száma
                <br />
                (Fő)
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {institutionTypes.map((instType) => {
              const jogviszonyTypes = [
                "Tanulói jogviszony",
                "Felnőttképzési jogviszony",
              ];
              return jogviszonyTypes.map((jogv, jogvIndex) => (
                <TableRow key={`${yearStr}-${instType}-${jogv}`}>
                  {jogvIndex === 0 && (
                    <TableCell
                      rowSpan={2}
                      sx={{
                        ...cellSx,
                        fontWeight: "medium",
                        textAlign: "center",
                        backgroundColor: "#f5f5f5",
                        borderRight: "2px solid #e0e0e0",
                      }}
                    >
                      {formatHuNum(instType)}
                    </TableCell>
                  )}
                  <TableCell sx={cellSx}>{formatHuNum(jogv)}</TableCell>

                  {/* Semester 1 inputs */}
                  <TableCell sx={cellSx}>
                    <ZeroHidingTextField
                      size="small"
                      type="number"
                      fullWidth
                      value={getCellValue(
                        yearStr,
                        instType,
                        jogv,
                        "felev1",
                        "kituno",
                      ) || 0}
                      onChange={(e) =>
                        handleDataChange(
                          yearStr,
                          instType,
                          jogv,
                          "felev1",
                          "kituno",
                          e.target.value,
                        )
                      }
                      sx={getFieldSx(
                        yearStr,
                        instType,
                        jogv,
                        "felev1",
                        "kituno",
                      )}
                      inputProps={{ min: 0 }}
                      placeholder="0" />
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <ZeroHidingTextField
                      size="small"
                      type="number"
                      fullWidth
                      value={getCellValue(
                        yearStr,
                        instType,
                        jogv,
                        "felev1",
                        "bukott",
                      ) || 0}
                      onChange={(e) =>
                        handleDataChange(
                          yearStr,
                          instType,
                          jogv,
                          "felev1",
                          "bukott",
                          e.target.value,
                        )
                      }
                      sx={getFieldSx(
                        yearStr,
                        instType,
                        jogv,
                        "felev1",
                        "bukott",
                      )}
                      inputProps={{ min: 0 }}
                      placeholder="0" />
                  </TableCell>

                  {/* Semester 2 inputs */}
                  <TableCell sx={cellSx}>
                    <ZeroHidingTextField
                      size="small"
                      type="number"
                      fullWidth
                      value={getCellValue(
                        yearStr,
                        instType,
                        jogv,
                        "felev2",
                        "kituno",
                      ) || 0}
                      onChange={(e) =>
                        handleDataChange(
                          yearStr,
                          instType,
                          jogv,
                          "felev2",
                          "kituno",
                          e.target.value,
                        )
                      }
                      sx={getFieldSx(
                        yearStr,
                        instType,
                        jogv,
                        "felev2",
                        "kituno",
                      )}
                      inputProps={{ min: 0 }}
                      placeholder="0" />
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <ZeroHidingTextField
                      size="small"
                      type="number"
                      fullWidth
                      value={getCellValue(
                        yearStr,
                        instType,
                        jogv,
                        "felev2",
                        "bukott",
                      ) || 0}
                      onChange={(e) =>
                        handleDataChange(
                          yearStr,
                          instType,
                          jogv,
                          "felev2",
                          "bukott",
                          e.target.value,
                        )
                      }
                      sx={getFieldSx(
                        yearStr,
                        instType,
                        jogv,
                        "felev2",
                        "bukott",
                      )}
                      inputProps={{ min: 0 }}
                      placeholder="0" />
                  </TableCell>
                </TableRow>
              ));
            })}

            {/* Total Row */}
            {institutionTypes.length > 0 && (
              <TableRow>
                <TableCell
                  colSpan={2}
                  sx={{
                    ...cellSx,
                    fontWeight: "bold",
                    textAlign: "right",
                    backgroundColor: "#ffcdd2",
                    borderRight: "2px solid #e0e0e0",
                  }}
                >
                  Összesen (fő)
                </TableCell>
                <TableCell
                  sx={{
                    ...cellSx,
                    fontWeight: "bold",
                    textAlign: "right",
                    backgroundColor: "#ffcdd240",
                  }}
                >
                  {formatHuNum(calculateGrandTotal(yearStr, "felev1", "kituno"))}
                </TableCell>
                <TableCell
                  sx={{
                    ...cellSx,
                    fontWeight: "bold",
                    textAlign: "right",
                    backgroundColor: "#ffcdd240",
                  }}
                >
                  {formatHuNum(calculateGrandTotal(yearStr, "felev1", "bukott"))}
                </TableCell>
                <TableCell
                  sx={{
                    ...cellSx,
                    fontWeight: "bold",
                    textAlign: "right",
                    backgroundColor: "#ffcdd240",
                  }}
                >
                  {formatHuNum(calculateGrandTotal(yearStr, "felev2", "kituno"))}
                </TableCell>
                <TableCell
                  sx={{
                    ...cellSx,
                    fontWeight: "bold",
                    textAlign: "right",
                    backgroundColor: "#ffcdd240",
                  }}
                >
                  {formatHuNum(calculateGrandTotal(yearStr, "felev2", "bukott"))}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <PageWrapper
      titleContent={<TitleTanulmanyiEredmeny />}
      infoContent={<InfoTanulmanyiEredmeny />}
    >
      <Box sx={{ p: 3 }}>
        <Stack
          direction="row"
          spacing={2}
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Box sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", }}>
            <ExportDOMTableToExcel
              tableId=".MuiTable-root"
              fileName="tanulmanyi_eredmeny_export"
            />
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RestartAltIcon />}
              onClick={handleReset}
              disabled={!isModified || isSaving}
            >
              Visszaállítás
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSaveData}
              disabled={!isModified || isSaving}
            >
              Mentés
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setHistoryOpen(true)}
              startIcon={<HistoryIcon />}
            >
              Előzmények
            </Button>
            <ExportDOMTableToExcel
              tableId=".MuiTable-root"
              fileName="tanulmanyi_eredmeny_export"
            />
          </Stack>

          {!selectedSchool ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              Kérjük, válasszon egy intézményt a fenti legördülő menüből az adatok
              megtekintéséhez.
            </Alert>
          ) : institutionTypes.length === 0 ? (
            <Alert severity="warning" sx={{ mb: 3 }}>
              A kiválasztott intézményhez nem tartozik intézménytípus.
            </Alert>
          ) : (
            evszamok.map((yearStr) => renderYearTable(yearStr))
          )}
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
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
        tableName="tanulmanyi_eredmeny"
        onRollbackSuccess={() => {
          setSnackbarMessage("Sikeres visszaállítás az előzményekből!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        }}
      />
    </PageWrapper>
  );
}
