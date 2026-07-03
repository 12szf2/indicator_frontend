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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import {
  useGetAllAlapadatokQuery,
  useGetHianyzasQuery,
  useAddHianyzasMutation,
  useUpdateHianyzasMutation,
  useGetTanugyiAdatokQuery,
} from "../../../store/api/apiSlice";
import {
  generateSchoolYears,
  getCurrentSchoolYear,
} from "../../../utils/schoolYears";
import PageWrapper from "../../PageWrapper";
import InfoHianyzas from "./info_hianyzas";
import TitleHianyzas from "./title_hianyzas";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

const evszamok = generateSchoolYears();

export default function Hianyzas() {
  const selectedSchool = useSelector(selectSelectedSchool);
  const { data: schoolsData, isLoading: isLoadingSchools } =
    useGetAllAlapadatokQuery();

  const [selectedYear, setSelectedYear] = useState(getCurrentSchoolYear());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [tableData, setTableData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [isModified, setIsModified] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [isSaving, setIsSaving] = useState(false);

  const [addHianyzas] = useAddHianyzasMutation();
  const [updateHianyzas] = useUpdateHianyzasMutation();

  const formattedYear = selectedYear
    ? parseInt(selectedYear.split("/")[0])
    : new Date().getFullYear();

  const {
    data: hianyzasData,
    isLoading: isHianyzasLoading,
    isFetching: isHianyzasFetching,
  } = useGetHianyzasQuery(
    { alapadatok_id: selectedSchool?.id, tanev: formattedYear },
    { skip: !selectedSchool || !selectedYear },
  );

  console.log(hianyzasData);

  const { data: tanugyiData, isLoading: isTanugyiLoading } =
    useGetTanugyiAdatokQuery(
      {
        alapadatok_id: selectedSchool?.id,
        ev: formattedYear,
      },
      { skip: !selectedSchool || !selectedYear },
    );

  const studentCounts = useMemo(() => {
    if (!tanugyiData || !Array.isArray(tanugyiData)) return {};
    const counts = {};
    tanugyiData.forEach((student) => {
      const evfolyam = student.evfolyam || "";
      let instType = null;
      if (evfolyam.toLowerCase().includes("technikum")) {
        instType = "Technikum";
      } else if (evfolyam.toLowerCase().includes("szakképző")) {
        instType = "Szakképző iskola";
      }

      if (!instType) return;

      const isFelnottkepzesi =
        student.tanulo_jogviszonya?.toLowerCase().includes("felnőtt") ||
        student.munkarend?.toLowerCase().includes("felnőtt") ||
        student.munkarend?.toLowerCase().includes("levelező") ||
        student.munkarend?.toLowerCase().includes("esti") ||
        evfolyam.toLowerCase().includes("felnőtt") ||
        evfolyam.toLowerCase().includes("levelező") ||
        evfolyam.toLowerCase().includes("esti") ||
        student.kepzes_forma?.toLowerCase().includes("felnőtt");

      const jogvType = isFelnottkepzesi
        ? "Felnőttképzési jogviszony"
        : "Tanulói jogviszony";

      if (!counts[instType]) counts[instType] = {};
      if (!counts[instType][jogvType]) counts[instType][jogvType] = 0;
      counts[instType][jogvType]++;
    });
    return counts;
  }, [tanugyiData]);

  useEffect(() => {
    if (hianyzasData && !isHianyzasFetching) {
      const formattedData = {};
      const originalFormattedData = {};

      formattedData[selectedYear] = {};
      originalFormattedData[selectedYear] = {};

      if (Array.isArray(hianyzasData)) {
        hianyzasData.forEach((item) => {
          // Csak a kiválasztott év adatait dolgozzuk fel, hogy ne írja felül egy korábbi év
          if (item.tanev_kezdete !== formattedYear) return;

          const {
            intezmeny_tipus,
            jogviszony,
            felev,
            igazolt,
            igazolatlan,
            atlag,
            id,
          } = item;
          if (!formattedData[selectedYear][intezmeny_tipus]) {
            formattedData[selectedYear][intezmeny_tipus] = {};
            originalFormattedData[selectedYear][intezmeny_tipus] = {};
          }
          if (!formattedData[selectedYear][intezmeny_tipus][jogviszony]) {
            formattedData[selectedYear][intezmeny_tipus][jogviszony] = {};
            originalFormattedData[selectedYear][intezmeny_tipus][jogviszony] =
              {};
          }

          const semesterData = {
            id,
            igazolt:
              igazolt !== null && igazolt !== undefined
                ? parseFloat(igazolt)
                : "",
            igazolatlan:
              igazolatlan !== null && igazolatlan !== undefined
                ? parseFloat(igazolatlan)
                : "",
            atlag:
              atlag !== null && atlag !== undefined ? parseFloat(atlag) : "",
          };

          formattedData[selectedYear][intezmeny_tipus][jogviszony][felev] = {
            ...semesterData,
          };
          originalFormattedData[selectedYear][intezmeny_tipus][jogviszony][
            felev
          ] = { ...semesterData };
        });
      }

      setTableData((prev) => ({
        ...prev,
        [selectedYear]: formattedData[selectedYear] || {},
      }));
      setOriginalData((prev) => ({
        ...prev,
        [selectedYear]: originalFormattedData[selectedYear] || {},
      }));
      setIsModified(false);
    }
  }, [hianyzasData ? JSON.stringify(hianyzasData) : null, isHianyzasFetching, selectedYear, formattedYear]);

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

  const handleReset = () => {
    setTableData((prev) => ({
      ...prev,
      [selectedYear]: originalData[selectedYear]
        ? JSON.parse(JSON.stringify(originalData[selectedYear]))
        : {},
    }));
    setIsModified(false);
  };

  const isFieldModified = (instType, jogv, semester, field) => {
    const orig =
      originalData[selectedYear]?.[instType]?.[jogv]?.[semester]?.[field] ?? "";
    const curr =
      tableData[selectedYear]?.[instType]?.[jogv]?.[semester]?.[field] ?? "";
    return orig !== curr;
  };

  const isRowModified = (instType, jogv, semester) => {
    return ["igazolt", "igazolatlan"].some((field) =>
      isFieldModified(instType, jogv, semester, field),
    );
  };

  const getFieldSx = (instType, jogv, semester, field) => ({
    "& input": {
      textAlign: "right",
      p: 1,
      backgroundColor: isFieldModified(instType, jogv, semester, field)
        ? "#fff9c4"
        : "inherit",
    },
  });

  const handleDataChange = (instType, jogviszony, semester, field, value) => {
    // Validate number input
    if (value && isNaN(value)) return;

    setTableData((prev) => {
      const yearData = prev[selectedYear] || {};
      const instData = yearData[instType] || {};
      const jogvData = instData[jogviszony] || {};
      const semesterData = jogvData[semester] || {};

      return {
        ...prev,
        [selectedYear]: {
          ...yearData,
          [instType]: {
            ...instData,
            [jogviszony]: {
              ...jogvData,
              [semester]: {
                ...semesterData,
                [field]: value === "" ? "" : parseFloat(value),
              },
            },
          },
        },
      };
    });
    setIsModified(true);
  };

  const getCellValue = (instType, jogviszony, semester, field) => {
    const val =
      tableData[selectedYear]?.[instType]?.[jogviszony]?.[semester]?.[field];
    return val !== undefined ? val : "";
  };

  const getNumericValue = (instType, jogviszony, semester, field) => {
    const val = getCellValue(instType, jogviszony, semester, field);
    return val === "" ? 0 : parseFloat(val);
  };

  const calculateRowTotal = (instType, jogviszony, semester) => {
    const igazolt = getNumericValue(instType, jogviszony, semester, "igazolt");
    const igazolatlan = getNumericValue(
      instType,
      jogviszony,
      semester,
      "igazolatlan",
    );
    return igazolt + igazolatlan;
  };

  const calculateAverage = (instType, jogviszony, semester) => {
    const totalHianyzas = calculateRowTotal(instType, jogviszony, semester);
    const count = studentCounts[instType]?.[jogviszony] || 0;
    if (count === 0) return 0;
    return parseFloat((totalHianyzas / count).toFixed(2));
  };

  const calculateGrandTotal = (semester, field) => {
    if (field === "atlag") return ""; // Ne adjuk össze az átlagokat

    let total = 0;
    institutionTypes.forEach((instType) => {
      ["Tanulói jogviszony", "Felnőttképzési jogviszony"].forEach((jogv) => {
        if (field === "osszes") {
          total += calculateRowTotal(instType, jogv, semester);
        } else {
          total += getNumericValue(instType, jogv, semester, field);
        }
      });
    });
    return total;
  };

  const handleSaveData = async () => {
    setIsSaving(true);
    let updatedCount = 0;
    let savedCount = 0;

    try {
      const yearPrefix = parseInt(selectedYear.split("/")[0]);
      const promises = [];

      for (const instType of institutionTypes) {
        for (const jogv of [
          "Tanulói jogviszony",
          "Felnőttképzési jogviszony",
        ]) {
          for (const semester of ["felev1", "felev2"]) {
            if (!isRowModified(instType, jogv, semester)) continue;

            const id =
              originalData[selectedYear]?.[instType]?.[jogv]?.[semester]?.id;
            const igazolt = getNumericValue(
              instType,
              jogv,
              semester,
              "igazolt",
            );
            const igazolatlan = getNumericValue(
              instType,
              jogv,
              semester,
              "igazolatlan",
            );
            const atlag = calculateAverage(instType, jogv, semester);

            const recordData = {
              alapadatok_id: selectedSchool.id,
              tanev_kezdete: yearPrefix,
              intezmeny_tipusa: instType,
              jogviszony: jogv,
              felev: semester,
              igazolt: igazolt,
              igazolatlan: igazolatlan,
              atlag: atlag,
            };

            if (id) {
              promises.push(
                updateHianyzas({ id, ...recordData })
                  .unwrap()
                  .then(() => {
                    updatedCount++;
                  }),
              );
            } else {
              promises.push(
                addHianyzas(recordData)
                  .unwrap()
                  .then(() => {
                    savedCount++;
                  }),
              );
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

  const headerSx = {
    fontWeight: "bold",
    backgroundColor: "#f0f8ff",
    color: "#000",
    textAlign: "center",
    border: "1px solid #000",
  };

  const subHeaderSx = {
    fontWeight: "bold",
    backgroundColor: "#fff3e0",
    color: "#000",
    textAlign: "center",
    border: "1px solid #000",
    p: 1,
  };

  const cellSx = {
    border: "1px solid #000",
    p: 1,
  };

  return (
    <PageWrapper
      title={<TitleHianyzas />}
      infoContent={<InfoHianyzas />}
      isLoading={isLoadingSchools || isHianyzasLoading || isTanugyiLoading}
    >
      <Box sx={{ p: 3 }}>
        <Stack
          direction="row"
          spacing={2}
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel>Válasszon tanévet</InputLabel>
            <Select
              value={selectedYear}
              label="Válasszon tanévet"
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {evszamok.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RestartAltIcon />}
              onClick={handleReset}
              disabled={!isModified || isSaving}
            >
              Visszállítás
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
              sx={{ ml: 2 }}
            >
              Előzmények
            </Button>
          </Stack>
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
          <TableContainer
            component={Paper}
            elevation={3}
            sx={{ overflowX: "auto", border: "2px solid #000" }}
          >
            <Table size="small" sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    rowSpan={2}
                    colSpan={2}
                    sx={{ ...headerSx, width: "30%" }}
                  ></TableCell>
                  <TableCell
                    colSpan={4}
                    sx={headerSx}
                  >{`${selectedYear.split("/")[0]}/${selectedYear.split("/")[1].slice(2)}-es tanév I. félév utolsó tanítási napja`}</TableCell>
                  <TableCell
                    colSpan={4}
                    sx={headerSx}
                  >{`${selectedYear.split("/")[0]}/${selectedYear.split("/")[1].slice(2)}-es tanév évvége utolsó tanítási napja`}</TableCell>
                </TableRow>
                <TableRow>
                  {/* Semester 1 */}
                  <TableCell sx={subHeaderSx}>
                    Igazolt hiányzás
                    <br />
                    (óra)
                  </TableCell>
                  <TableCell sx={subHeaderSx}>
                    Igazolatlan hiányzás
                    <br />
                    (óra)
                  </TableCell>
                  <TableCell sx={subHeaderSx}>
                    Összes hiányzás
                    <br />
                    (óra)
                  </TableCell>
                  <TableCell sx={subHeaderSx}>
                    1 főre jutó hiányzás
                    <br />
                    átlagosan (óra)
                  </TableCell>
                  {/* Semester 2 */}
                  <TableCell sx={subHeaderSx}>
                    Igazolt hiányzás
                    <br />
                    (óra)
                  </TableCell>
                  <TableCell sx={subHeaderSx}>
                    Igazolatlan hiányzás
                    <br />
                    (óra)
                  </TableCell>
                  <TableCell sx={subHeaderSx}>
                    Összes hiányzás
                    <br />
                    (óra)
                  </TableCell>
                  <TableCell sx={subHeaderSx}>
                    1 főre jutó hiányzás
                    <br />
                    átlagosan (óra)
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
                    <TableRow key={`${instType}-${jogv}`}>
                      {jogvIndex === 0 && (
                        <TableCell
                          rowSpan={2}
                          sx={{
                            ...cellSx,
                            fontWeight: "bold",
                            textAlign: "center",
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
                            instType,
                            jogv,
                            "felev1",
                            "igazolt",
                          ) || 0}
                          onChange={(e) =>
                            handleDataChange(
                              instType,
                              jogv,
                              "felev1",
                              "igazolt",
                              e.target.value,
                            )
                          }
                          sx={getFieldSx(instType, jogv, "felev1", "igazolt")}
                         placeholder="0"/>
                      </TableCell>
                      <TableCell sx={cellSx}>
                        <ZeroHidingTextField
                          size="small"
                          type="number"
                          fullWidth
                          value={getCellValue(
                            instType,
                            jogv,
                            "felev1",
                            "igazolatlan",
                          ) || 0}
                          onChange={(e) =>
                            handleDataChange(
                              instType,
                              jogv,
                              "felev1",
                              "igazolatlan",
                              e.target.value,
                            )
                          }
                          sx={getFieldSx(
                            instType,
                            jogv,
                            "felev1",
                            "igazolatlan",
                          )}
                         placeholder="0"/>
                      </TableCell>
                      <TableCell sx={{ ...cellSx, textAlign: "right" }}>
                        {formatHuNum(calculateRowTotal(instType, jogv, "felev1"))}
                      </TableCell>
                      <TableCell
                        sx={{
                          ...cellSx,
                          textAlign: "right",
                          fontWeight: "bold",
                        }}
                      >
                        {formatHuNum(calculateAverage(instType, jogv, "felev1"))}
                      </TableCell>

                      {/* Semester 2 inputs */}
                      <TableCell sx={cellSx}>
                        <ZeroHidingTextField
                          size="small"
                          type="number"
                          fullWidth
                          value={getCellValue(
                            instType,
                            jogv,
                            "felev2",
                            "igazolt",
                          ) || 0}
                          onChange={(e) =>
                            handleDataChange(
                              instType,
                              jogv,
                              "felev2",
                              "igazolt",
                              e.target.value,
                            )
                          }
                          sx={getFieldSx(instType, jogv, "felev2", "igazolt")}
                         placeholder="0"/>
                      </TableCell>
                      <TableCell sx={cellSx}>
                        <ZeroHidingTextField
                          size="small"
                          type="number"
                          fullWidth
                          value={getCellValue(
                            instType,
                            jogv,
                            "felev2",
                            "igazolatlan",
                          ) || 0}
                          onChange={(e) =>
                            handleDataChange(
                              instType,
                              jogv,
                              "felev2",
                              "igazolatlan",
                              e.target.value,
                            )
                          }
                          sx={getFieldSx(
                            instType,
                            jogv,
                            "felev2",
                            "igazolatlan",
                          )}
                         placeholder="0"/>
                      </TableCell>
                      <TableCell sx={{ ...cellSx, textAlign: "right" }}>
                        {formatHuNum(calculateRowTotal(instType, jogv, "felev2"))}
                      </TableCell>
                      <TableCell
                        sx={{
                          ...cellSx,
                          textAlign: "right",
                          fontWeight: "bold",
                        }}
                      >
                        {formatHuNum(calculateAverage(instType, jogv, "felev2"))}
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
                        backgroundColor: "#fff3e0",
                      }}
                    >
                      Összesen (óra)
                    </TableCell>
                    <TableCell
                      sx={{
                        ...cellSx,
                        fontWeight: "bold",
                        textAlign: "right",
                        backgroundColor: "#fff3e0",
                      }}
                    >
                      {formatHuNum(calculateGrandTotal("felev1", "igazolt"))}
                    </TableCell>
                    <TableCell
                      sx={{
                        ...cellSx,
                        fontWeight: "bold",
                        textAlign: "right",
                        backgroundColor: "#fff3e0",
                      }}
                    >
                      {formatHuNum(calculateGrandTotal("felev1", "igazolatlan"))}
                    </TableCell>
                    <TableCell
                      sx={{
                        ...cellSx,
                        fontWeight: "bold",
                        textAlign: "right",
                        backgroundColor: "#fff3e0",
                      }}
                    >
                      {formatHuNum(calculateGrandTotal("felev1", "osszes"))}
                    </TableCell>
                    <TableCell
                      sx={{
                        ...cellSx,
                        fontWeight: "bold",
                        textAlign: "right",
                        backgroundColor: "#fff3e0",
                      }}
                    >
                      {formatHuNum(calculateGrandTotal("felev1", "atlag"))}
                    </TableCell>
                    <TableCell
                      sx={{
                        ...cellSx,
                        fontWeight: "bold",
                        textAlign: "right",
                        backgroundColor: "#fff3e0",
                      }}
                    >
                      {formatHuNum(calculateGrandTotal("felev2", "igazolt"))}
                    </TableCell>
                    <TableCell
                      sx={{
                        ...cellSx,
                        fontWeight: "bold",
                        textAlign: "right",
                        backgroundColor: "#fff3e0",
                      }}
                    >
                      {formatHuNum(calculateGrandTotal("felev2", "igazolatlan"))}
                    </TableCell>
                    <TableCell
                      sx={{
                        ...cellSx,
                        fontWeight: "bold",
                        textAlign: "right",
                        backgroundColor: "#fff3e0",
                      }}
                    >
                      {formatHuNum(calculateGrandTotal("felev2", "osszes"))}
                    </TableCell>
                    <TableCell
                      sx={{
                        ...cellSx,
                        fontWeight: "bold",
                        textAlign: "right",
                        backgroundColor: "#fff3e0",
                      }}
                    >
                      {formatHuNum(calculateGrandTotal("felev2", "atlag"))}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
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
        tableName="hianyzas"
        onRollbackSuccess={() => {
          setSnackbarMessage("Sikeres visszaállítás az előzményekből!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        }}
      />
    </PageWrapper>
  );
}
