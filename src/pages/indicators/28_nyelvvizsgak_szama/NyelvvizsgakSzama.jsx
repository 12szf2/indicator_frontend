import { formatHuNum } from "../../../utils/formatters";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import {
  useGetNyelvvizsgakSzamaQuery,
  useAddNyelvvizsgakSzamaMutation,
  useUpdateNyelvvizsgakSzamaMutation,
} from "../../../store/api/apiSlice";
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
  Snackbar,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import { generateSchoolYears } from "../../../utils/schoolYears";
import PageWrapper from "../../PageWrapper";
import InfoNyelvvizsgakSzama from "./info_nyelvvizsgak_szama";
import TitleNyelvvizsgakSzama from "./title_nyelvvizsgak_szama";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

// Fixed class list
const FIXED_CLASSES = [
  "9.A",
  "9.B",
  "10.A",
  "10.B",
  "11.A",
  "11.B",
  "12.A",
  "12.B",
  "13.A",
  "13.B",
];

const NUM_FIELDS = [
  "kozepfoku_angol",
  "felsofoku_angol",
  "kozepfoku_nemet",
  "felsofoku_nemet",
  "egyeb_fo",
];
const ALL_FIELDS = [...NUM_FIELDS, "egyeb_nyelv"];

export default function NyelvvizsgakSzama() {
  const schoolYears = useMemo(() => generateSchoolYears(), []);
  const selectedSchool = useSelector(selectSelectedSchool);

  const [addData] = useAddNyelvvizsgakSzamaMutation();
  const [updateData] = useUpdateNyelvvizsgakSzamaMutation();

  // Fetch data for all years
  const queries = schoolYears.map((yearRange) => {
    const startYear = parseInt(yearRange.split("/")[0]);
    return useGetNyelvvizsgakSzamaQuery(
      { alapadatok_id: selectedSchool?.id, tanev: startYear },
      { skip: !selectedSchool },
    );
  });

  const dbData = useMemo(() => {
    return queries.flatMap((query) => query.data || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.map((q) => q.fulfilledTimeStamp).join(","), selectedSchool?.id]);

  const isLoading = useMemo(
    () => queries.some((q) => q.isLoading),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queries.map((q) => q.isLoading).join(",")],
  );
  const isFetching = useMemo(
    () => queries.some((q) => q.isFetching),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queries.map((q) => q.isFetching).join(",")],
  );

  // State: { [osztaly]: { [yearRange]: { id, kozepfoku_angol, felsofoku_angol, kozepfoku_nemet, felsofoku_nemet, egyeb_nyelv, egyeb_fo } } }
  const [tableData, setTableData] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [originalData, setOriginalData] = useState({});
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const createEmptyYearData = () => ({
    kozepfoku_angol: "",
    felsofoku_angol: "",
    kozepfoku_nemet: "",
    felsofoku_nemet: "",
    egyeb_nyelv: "",
    egyeb_fo: "",
  });

  useEffect(() => {
    if (dbData && !isFetching) {
      // Initialize all fixed classes with empty data
      const newData = {};
      const origData = {};

      FIXED_CLASSES.forEach((cls) => {
        newData[cls] = {};
        origData[cls] = {};
        schoolYears.forEach((year) => {
          newData[cls][year] = createEmptyYearData();
          origData[cls][year] = createEmptyYearData();
        });
      });

      // Populate with actual data from API
      if (Array.isArray(dbData)) {
        dbData.forEach((item) => {
          const name = item.osztaly;
          if (!name || !FIXED_CLASSES.includes(name)) return;
          const yearRange = `${item.tanev_kezdete}/${item.tanev_kezdete + 1}`;
          if (!schoolYears.includes(yearRange)) return;

          const yearData = {
            id: item.id,
            kozepfoku_angol: item.kozepfoku_angol ?? "",
            felsofoku_angol: item.felsofoku_angol ?? "",
            kozepfoku_nemet: item.kozepfoku_nemet ?? "",
            felsofoku_nemet: item.felsofoku_nemet ?? "",
            egyeb_nyelv: item.egyeb_nyelv || "",
            egyeb_fo: item.egyeb_fo ?? "",
          };

          newData[name][yearRange] = { ...yearData };
          origData[name][yearRange] = { ...yearData };
        });
      }

      setTableData(newData);
      setOriginalData(origData);
      setIsModified(false);
    }
  }, [dbData, isFetching, schoolYears]);

  const handleDataChange = useCallback((name, year, field, value) => {
    setTableData((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        [year]: {
          ...prev[name]?.[year],
          [field]: value,
        },
      },
    }));
    setIsModified(true);
  }, []);

  const isFieldModified = (name, year, field) => {
    const orig = originalData[name]?.[year]?.[field] ?? "";
    const curr = tableData[name]?.[year]?.[field] ?? "";
    return String(orig) !== String(curr);
  };

  const isRowModified = (name, year) => {
    return ALL_FIELDS.some((field) => isFieldModified(name, year, field));
  };

  const hasData = (name, year) => {
    return ALL_FIELDS.some((field) => {
      const val = tableData[name]?.[year]?.[field];
      return val !== "" && val !== null && val !== undefined && val !== 0;
    });
  };

  const getNumericValue = (name, year, field) => {
    const val = tableData[name]?.[year]?.[field];
    if (val === "" || val === null || val === undefined) return 0;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  const calculateRowTotal = (name, year) => {
    return NUM_FIELDS.reduce(
      (sum, f) => sum + getNumericValue(name, year, f),
      0,
    );
  };

  const calculateColumnTotal = (year, field) => {
    return FIXED_CLASSES.reduce(
      (sum, cls) => sum + getNumericValue(cls, year, field),
      0,
    );
  };

  const calculateYearGrandTotal = (year) => {
    return FIXED_CLASSES.reduce(
      (sum, cls) => sum + calculateRowTotal(cls, year),
      0,
    );
  };

  const handleSave = async () => {
    if (!selectedSchool) return;
    setIsSaving(true);
    let updatedCount = 0;
    let savedCount = 0;

    try {
      const promises = [];

      FIXED_CLASSES.forEach((name) => {
        schoolYears.forEach((year) => {
          const isNew = !originalData[name]?.[year]?.id;
          let shouldSave = false;

          if (!isNew) {
            if (isRowModified(name, year)) shouldSave = true;
          } else {
            if (hasData(name, year)) shouldSave = true;
          }

          if (shouldSave) {
            const yearData = tableData[name]?.[year];
            const id = originalData[name]?.[year]?.id;

            const recordData = {
              alapadatok_id: selectedSchool.id,
              tanev_kezdete: parseInt(year.split("/")[0]),
              osztaly: name,
              kozepfoku_angol: getNumericValue(name, year, "kozepfoku_angol"),
              felsofoku_angol: getNumericValue(name, year, "felsofoku_angol"),
              kozepfoku_nemet: getNumericValue(name, year, "kozepfoku_nemet"),
              felsofoku_nemet: getNumericValue(name, year, "felsofoku_nemet"),
              egyeb_nyelv: yearData?.egyeb_nyelv || "",
              egyeb_fo: getNumericValue(name, year, "egyeb_fo"),
            };

            if (id) {
              promises.push(
                updateData({ id, ...recordData })
                  .unwrap()
                  .then(() => {
                    updatedCount++;
                  }),
              );
            } else {
              promises.push(
                addData(recordData)
                  .unwrap()
                  .then(() => {
                    savedCount++;
                  }),
              );
            }
          }
        });
      });

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
      setIsModified(false);
    } catch (error) {
      console.error("Hiba mentés közben:", error);
      setSnackbarMessage("Hiba történt a mentés során!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = useCallback(() => {
    setTableData(JSON.parse(JSON.stringify(originalData)));
    setIsModified(false);
  }, [originalData]);

  if (isLoading) {
    return <PageLoadingOverlay isLoading={true} />;
  }

  // Styling matching indicator 29 (Projektek)
  const tableHeaderSx = {
    fontWeight: "bold",
    backgroundColor: "#f0f8ff",
    borderBottom: "2px solid #e0e0e0",
    borderRight: "1px solid #e0e0e0",
    textAlign: "center",
  };

  const yearHeaderSx = {
    fontWeight: "bold",
    backgroundColor: "#fff3e0",
    borderBottom: "2px solid #e0e0e0",
    textAlign: "center",
    fontSize: "1.1rem",
    py: 1,
  };

  const cellSx = {
    borderBottom: "1px solid #f5f5f5",
    borderRight: "1px solid #f5f5f5",
    p: 0.5,
  };

  const getFieldSx = (name, year, field) => ({
    "& .MuiOutlinedInput-root": {
      backgroundColor: isFieldModified(name, year, field)
        ? "#fff9c4"
        : "inherit",
      transition: "background-color 0.3s ease",
    },
  });

  return (
    <PageWrapper
      titleContent={<TitleNyelvvizsgakSzama />}
      infoContent={<InfoNyelvvizsgakSzama />}
    >
      <Box sx={{ p: 3 }}>
        {!selectedSchool && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Kérjük, válasszon egy intézményt a fenti legördülő menüből az adatok
            szerkesztéséhez és megtekintéséhez.
          </Alert>
        )}

        <Box sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mb: 3 }}>
          <Stack
            direction="row"
            spacing={2}
            justifyContent="space-between"
            alignItems="center"
          >
            <ExportDOMTableToExcel
              tableId=".MuiTable-root"
              fileName="nyelvvizsgak_szama_export"
            />
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<RefreshIcon />}
                onClick={handleReset}
                disabled={!isModified || isSaving}
              >
                Visszaállítás
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!isModified || isSaving || !selectedSchool}
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
            </Stack>
          </Stack>
        </Box>

        {schoolYears.map((year) => {
          const shortYear = `${year.split("/")[0]}/${year.split("/")[1].slice(2)}`;

          return (
            <TableContainer
              key={year}
              component={Paper}
              sx={{ maxWidth: "100%", overflowX: "auto", mb: 4 }}
            >
              <Table
                size="small"
                sx={{ minWidth: 1000, border: "2px solid #e0e0e0" }}
              >
                <TableHead>
                  {/* Row 1: Year spanning all data columns */}
                  <TableRow>
                    <TableCell
                      rowSpan={3}
                      sx={{
                        ...tableHeaderSx,
                        minWidth: 140,
                        verticalAlign: "middle",
                      }}
                    >
                      Osztály megnevezése
                    </TableCell>
                    <TableCell colSpan={7} sx={yearHeaderSx}>
                      {shortYear}
                    </TableCell>
                  </TableRow>
                  {/* Row 2: Main column headers */}
                  <TableRow>
                    <TableCell
                      rowSpan={2}
                      sx={{ ...tableHeaderSx, minWidth: 100 }}
                    >
                      Középfokú angol
                      <br />
                      nyelvvizsgával rendelkezők
                      <br />
                      száma (fő)
                    </TableCell>
                    <TableCell
                      rowSpan={2}
                      sx={{ ...tableHeaderSx, minWidth: 100 }}
                    >
                      Felsőfokú angol
                      <br />
                      nyelvvizsgával rendelkezők
                      <br />
                      száma (fő)
                    </TableCell>
                    <TableCell
                      rowSpan={2}
                      sx={{ ...tableHeaderSx, minWidth: 100 }}
                    >
                      Középfokú német
                      <br />
                      nyelvvizsgával rendelkezők
                      <br />
                      száma (fő)
                    </TableCell>
                    <TableCell
                      rowSpan={2}
                      sx={{ ...tableHeaderSx, minWidth: 100 }}
                    >
                      Felsőfokú német
                      <br />
                      nyelvvizsgával rendelkezők
                      <br />
                      száma (fő)
                    </TableCell>
                    <TableCell colSpan={2} sx={tableHeaderSx}>
                      Egyéb
                    </TableCell>
                    <TableCell
                      rowSpan={2}
                      sx={{
                        ...tableHeaderSx,
                        backgroundColor: "#e8f5e8",
                        minWidth: 100,
                      }}
                    >
                      Osztályban nyelvvizsgával
                      <br />
                      rendelkezők száma összesen
                    </TableCell>
                  </TableRow>
                  {/* Row 3: Egyéb sub-headers */}
                  <TableRow>
                    <TableCell
                      sx={{
                        ...tableHeaderSx,
                        minWidth: 140,
                        fontSize: "0.8rem",
                      }}
                    >
                      nyelv és fokozat
                      <br />
                      megnevezéssel
                    </TableCell>
                    <TableCell
                      sx={{
                        ...tableHeaderSx,
                        minWidth: 60,
                        fontSize: "0.8rem",
                      }}
                    >
                      fő
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {FIXED_CLASSES.map((cls) => (
                    <TableRow key={cls} hover>
                      <TableCell
                        sx={{
                          ...cellSx,
                          fontWeight: 500,
                          backgroundColor: "#f5f5f5",
                          textAlign: "center",
                        }}
                      >
                        {cls}
                      </TableCell>

                      {/* Középfokú angol */}
                      <TableCell sx={cellSx}>
                        <ZeroHidingTextField
                          size="small"
                          type="number"
                          fullWidth
                          value={tableData[cls]?.[year]?.kozepfoku_angol || 0}
                          onChange={(e) =>
                            handleDataChange(
                              cls,
                              year,
                              "kozepfoku_angol",
                              e.target.value,
                            )
                          }
                          inputProps={{
                            min: 0,
                            style: { textAlign: "center" },
                          }}
                          disabled={!selectedSchool}
                          sx={getFieldSx(cls, year, "kozepfoku_angol")}
                          placeholder="0" />
                      </TableCell>

                      {/* Felsőfokú angol */}
                      <TableCell sx={cellSx}>
                        <ZeroHidingTextField
                          size="small"
                          type="number"
                          fullWidth
                          value={tableData[cls]?.[year]?.felsofoku_angol || 0}
                          onChange={(e) =>
                            handleDataChange(
                              cls,
                              year,
                              "felsofoku_angol",
                              e.target.value,
                            )
                          }
                          inputProps={{
                            min: 0,
                            style: { textAlign: "center" },
                          }}
                          disabled={!selectedSchool}
                          sx={getFieldSx(cls, year, "felsofoku_angol")}
                          placeholder="0" />
                      </TableCell>

                      {/* Középfokú német */}
                      <TableCell sx={cellSx}>
                        <ZeroHidingTextField
                          size="small"
                          type="number"
                          fullWidth
                          value={tableData[cls]?.[year]?.kozepfoku_nemet || 0}
                          onChange={(e) =>
                            handleDataChange(
                              cls,
                              year,
                              "kozepfoku_nemet",
                              e.target.value,
                            )
                          }
                          inputProps={{
                            min: 0,
                            style: { textAlign: "center" },
                          }}
                          disabled={!selectedSchool}
                          sx={getFieldSx(cls, year, "kozepfoku_nemet")}
                          placeholder="0" />
                      </TableCell>

                      {/* Felsőfokú német */}
                      <TableCell sx={cellSx}>
                        <ZeroHidingTextField
                          size="small"
                          type="number"
                          fullWidth
                          value={tableData[cls]?.[year]?.felsofoku_nemet || 0}
                          onChange={(e) =>
                            handleDataChange(
                              cls,
                              year,
                              "felsofoku_nemet",
                              e.target.value,
                            )
                          }
                          inputProps={{
                            min: 0,
                            style: { textAlign: "center" },
                          }}
                          disabled={!selectedSchool}
                          sx={getFieldSx(cls, year, "felsofoku_nemet")}
                          placeholder="0" />
                      </TableCell>

                      {/* Egyéb nyelv megnevezés */}
                      <TableCell sx={cellSx}>
                        <ZeroHidingTextField
                          size="small"
                          type="text"
                          fullWidth
                          value={tableData[cls]?.[year]?.egyeb_nyelv || 0}
                          onChange={(e) =>
                            handleDataChange(
                              cls,
                              year,
                              "egyeb_nyelv",
                              e.target.value,
                            )
                          }
                          disabled={!selectedSchool}
                          inputProps={{ style: { textAlign: "center" } }}
                          sx={getFieldSx(cls, year, "egyeb_nyelv")}
                          placeholder="0" />
                      </TableCell>

                      {/* Egyéb fő */}
                      <TableCell sx={cellSx}>
                        <ZeroHidingTextField
                          size="small"
                          type="number"
                          fullWidth
                          value={tableData[cls]?.[year]?.egyeb_fo || 0}
                          onChange={(e) =>
                            handleDataChange(
                              cls,
                              year,
                              "egyeb_fo",
                              e.target.value,
                            )
                          }
                          inputProps={{
                            min: 0,
                            style: { textAlign: "center" },
                          }}
                          disabled={!selectedSchool}
                          sx={getFieldSx(cls, year, "egyeb_fo")}
                          placeholder="0" />
                      </TableCell>

                      {/* Row total */}
                      <TableCell
                        sx={{
                          ...cellSx,
                          textAlign: "center",
                          fontWeight: "bold",
                          backgroundColor: "#e8f5e8",
                        }}
                      >
                        {formatHuNum(calculateRowTotal(cls, year))}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Total row */}
                  <TableRow sx={{ backgroundColor: "#ffcdd2" }}>
                    <TableCell
                      colSpan={7}
                      sx={{
                        fontWeight: "bold",
                        textAlign: "center",
                        borderBottom: "2px solid #e0e0e0",
                      }}
                    >
                      Iskolában nyelvvizsgával rendelkezők összesen
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        textAlign: "center",
                        borderBottom: "2px solid #e0e0e0",
                        fontSize: "1.1rem",
                      }}
                    >
                      {formatHuNum(calculateYearGrandTotal(year))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          );
        })}

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarSeverity}
            sx={{ width: "100%" }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>

      <HistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        alapadatokId={selectedSchool?.id}
        tableName="nyelvvizsgak_szama"
        onRollbackSuccess={() => {
          setSnackbarMessage("Sikeres visszaállítás az előzményekből!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        }}
      />
    </PageWrapper>
  );
}
