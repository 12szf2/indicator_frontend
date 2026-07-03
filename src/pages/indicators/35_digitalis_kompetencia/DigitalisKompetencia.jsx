import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import {
  useGetDigitalisKompetenciaQuery,
  useAddDigitalisKompetenciaMutation,
  useUpdateDigitalisKompetenciaMutation,
} from "../../../store/api/apiSlice";
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
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import { generateSchoolYears } from "../../../utils/schoolYears";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoDigitalisKompetencia from "./info_digitalis_kompetencia";
import TitleDigitalisKompetencia from "./title_digitalis_kompetencia";
import ExportToExcel from "../../../components/ExportToExcel";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

export default function DigitalisKompetencia() {
  const schoolYears = useMemo(() => generateSchoolYears(), []);

  const createInitialData = () => {
    const data = {};
    schoolYears.forEach((year) => {
      data[year] = {
        id: null,
        fejleszto: "",
        hasznalo: "",
      };
    });
    return data;
  };

  const selectedSchool = useSelector(selectSelectedSchool);
  const [tableData, setTableData] = useState(createInitialData());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [originalData, setOriginalData] = useState(createInitialData());

  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const queries = schoolYears.map((yearRange) => {
    const startYear = parseInt(yearRange.split("/")[0]);
    return useGetDigitalisKompetenciaQuery(
      { alapadatokId: selectedSchool?.id, tanev: startYear },
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

  const [addData] = useAddDigitalisKompetenciaMutation();
  const [updateData] = useUpdateDigitalisKompetenciaMutation();

  useEffect(() => {
    if (dbData && !isFetching) {
      const newData = createInitialData();
      const origData = createInitialData();

      if (Array.isArray(dbData)) {
        dbData.forEach((item) => {
          const yearRange = `${item.tanev_kezdete}/${item.tanev_kezdete + 1}`;
          if (newData[yearRange]) {
            const yearData = {
              id: item.id,
              fejleszto: item.fejleszto_oktatok_szama || "",
              hasznalo: item.hasznalo_oktatok_szama || "",
            };

            newData[yearRange] = { ...yearData };
            origData[yearRange] = { ...yearData };
          }
        });
      }

      setTableData(newData);
      setOriginalData(origData);
      setIsModified(false);
    }
  }, [dbData, isFetching, schoolYears]);

  const handleDataChange = useCallback((year, field, value) => {
    setTableData((prev) => ({
      ...prev,
      [year]: {
        ...prev[year],
        [field]: value,
      },
    }));
    setIsModified(true);
  }, []);

  const isFieldModified = (year, field) => {
    const orig = originalData[year]?.[field] || "";
    const curr = tableData[year]?.[field] || "";
    return orig !== curr;
  };

  const handleSave = async () => {
    if (!selectedSchool) return;
    setIsSaving(true);
    let updatedCount = 0;
    let savedCount = 0;

    try {
      const promises = [];

      schoolYears.forEach((year) => {
        let rowModified = false;
        if (
          isFieldModified(year, "fejleszto") ||
          isFieldModified(year, "hasznalo")
        ) {
          rowModified = true;
        }

        if (rowModified) {
          const yearData = tableData[year];
          const id = originalData[year]?.id;

          const recordData = {
            alapadatok_id: selectedSchool.id,
            tanev_kezdete: parseInt(year.split("/")[0]),
            fejleszto_oktatok_szama: yearData.fejleszto || "",
            hasznalo_oktatok_szama: yearData.hasznalo || "",
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

  const exportRows = useMemo(() => {
    const rows = [
      { megnevezes: "Digitális tananyagot fejlesztő oktatók száma (fő)" },
      { megnevezes: "Digitális tananyagot használó oktatók száma (fő)" },
    ];

    schoolYears.forEach((year) => {
      rows[0][year] = tableData[year]?.fejleszto || "";
      rows[1][year] = tableData[year]?.hasznalo || "";
    });

    return rows;
  }, [tableData, schoolYears]);

  if (isLoading) {
    return <PageLoadingOverlay isLoading={true} />;
  }

  return (
    <PageWrapper
      titleContent={<TitleDigitalisKompetencia />}
      infoContent={<InfoDigitalisKompetencia />}
    >
      <Box>
        <LockStatusIndicator tableName="digitalis_kompetencia" />

        {!selectedSchool && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Kérjük, válasszon egy intézményt a fenti legördülő menüből az adatok
            szerkesztéséhez és megtekintéséhez.
          </Alert>
        )}

        <Stack direction="row" spacing={2} sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mb: 3 }}>
          <LockedTableWrapper tableName="digitalis_kompetencia">
            <Button
              variant="contained"
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
          <ExportToExcel
            fileName="digitalis_kompetencia"
            sheetName="Digitális kompetencia"
            columns={[
              { header: "Megnevezés", key: "megnevezes", width: 50 },
              ...schoolYears.map((year) => ({
                header: year,
                key: year,
                width: 20,
              })),
            ]}
            rows={exportRows}
            buttonLabel="Export Táblázatba"
          />
        </Stack>

        <TableContainer
          component={Paper}
          sx={{ maxWidth: "100%", overflowX: "auto" }}
        >
          <Table size="medium" sx={{ minWidth: 800, border: "2px solid #e0e0e0" }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: 350,
                    borderRight: "2px solid #e0e0e0",
                    borderBottom: "2px solid #e0e0e0",
                    backgroundColor: "#f5f5f5",
                  }}
                >
                  Megnevezés
                </TableCell>
                {schoolYears.map((year, i) => (
                  <TableCell
                    key={`${year}-header`}
                    align="center"
                    sx={{
                      fontWeight: "bold",
                      backgroundColor: "#fff3e0",
                      borderBottom: "2px solid #e0e0e0",
                      borderRight:
                        i === schoolYears.length - 1
                          ? "none"
                          : "1px solid #e0e0e0",
                      minWidth: 150,
                    }}
                  >
                    {year}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow hover>
                <TableCell
                  sx={{
                    borderRight: "2px solid #e0e0e0",
                    borderBottom: "1px solid #e0e0e0",
                    fontWeight: 500,
                  }}
                >
                  Digitális tananyagot fejlesztő oktatók száma (fő)
                </TableCell>
                {schoolYears.map((year, i) => (
                  <TableCell
                    key={`${year}-fejleszto`}
                    align="center"
                    sx={{
                      borderBottom: "1px solid #e0e0e0",
                      borderRight:
                        i === schoolYears.length - 1
                          ? "none"
                          : "1px solid #f5f5f5",
                      backgroundColor: isFieldModified(year, "fejleszto")
                        ? "#fff9c4"
                        : "inherit",
                    }}
                  >
                    <ZeroHidingTextField
                      type="number"
                      value={tableData[year]?.fejleszto || 0}
                      onChange={(e) =>
                        handleDataChange(year, "fejleszto", e.target.value)
                      }
                      size="small"
                      inputProps={{ style: { textAlign: "center" }, min: 0 }}
                      sx={{ width: "100px" }}
                      placeholder="0" />
                  </TableCell>
                ))}
              </TableRow>
              <TableRow hover>
                <TableCell
                  sx={{
                    borderRight: "2px solid #e0e0e0",
                    borderBottom: "1px solid #e0e0e0",
                    fontWeight: 500,
                  }}
                >
                  Digitális tananyagot használó oktatók száma (fő)
                </TableCell>
                {schoolYears.map((year, i) => (
                  <TableCell
                    key={`${year}-hasznalo`}
                    align="center"
                    sx={{
                      borderBottom: "1px solid #e0e0e0",
                      borderRight:
                        i === schoolYears.length - 1
                          ? "none"
                          : "1px solid #f5f5f5",
                      backgroundColor: isFieldModified(year, "hasznalo")
                        ? "#fff9c4"
                        : "inherit",
                    }}
                  >
                    <ZeroHidingTextField
                      type="number"
                      value={tableData[year]?.hasznalo || 0}
                      onChange={(e) =>
                        handleDataChange(year, "hasznalo", e.target.value)
                      }
                      size="small"
                      inputProps={{ style: { textAlign: "center" }, min: 0 }}
                      sx={{ width: "100px" }}
                      placeholder="0" />
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

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
        tableName="digitalisKompetencia"
        onRollbackSuccess={() => {
          setSnackbarMessage("Sikeres visszaállítás az előzményekből!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        }}
      />
    </PageWrapper>
  );
}
