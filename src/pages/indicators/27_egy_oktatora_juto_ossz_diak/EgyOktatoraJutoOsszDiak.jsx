import { formatHuNum } from "../../../utils/formatters";
import React, { useState, useEffect } from "react";
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
  Alert,
  Typography,
  Snackbar,
  Stack,
  Button,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import HistoryIcon from "@mui/icons-material/History";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import {
  useLazyGetTanugyiAdatokQuery,
  useLazyGetAlkalmazottAdatokQuery,
  useLazyGetEngedelyezettOratomegQuery,
  useUpsertEngedelyezettOratomegMutation,
} from "../../../store/api/apiSlice";
import { generateSchoolYears } from "../../../utils/schoolYears";
import PageWrapper from "../../PageWrapper";
import InfoEgyOktatoraJutoOsszDiak from "./info_egy_oktatora_juto_ossz_diak";
import TitleEgyOktatoraJutoOsszDiak from "./title_egy_oktatora_juto_ossz_diak";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import HistoryDialog from "../../../components/HistoryDialog";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

const schoolYears = generateSchoolYears();

export default function EgyOktatoraJutoOsszDiak() {
  const selectedSchool = useSelector(selectSelectedSchool);

  const [triggerTanugyi] = useLazyGetTanugyiAdatokQuery();
  const [triggerAlkalmazott] = useLazyGetAlkalmazottAdatokQuery();
  const [triggerOratomeg] = useLazyGetEngedelyezettOratomegQuery();
  const [upsertOratomeg] = useUpsertEngedelyezettOratomegMutation();

  const [yearlyData, setYearlyData] = useState({});
  const [savedData, setSavedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const fetchData = async () => {
    if (!selectedSchool?.id) return;
    setIsLoading(true);
    try {
      const dataPromises = schoolYears.map(async (yearStr) => {
        const year = parseInt(yearStr.split("/")[0]);

        const [tanugyiResponse, alkalmazottResponse, oratomegResponse] =
          await Promise.all([
            triggerTanugyi({ alapadatok_id: selectedSchool.id, ev: year }),
            triggerAlkalmazott({
              alapadatok_id: selectedSchool.id,
              tanev_kezdete: year,
            }),
            triggerOratomeg({
              alapadatok_id: selectedSchool.id,
              tanev_kezdete: year,
            }),
          ]);

        const tanugyiData = tanugyiResponse.data || [];
        const alkalmazottData = alkalmazottResponse.data || [];
        const oratomegData = oratomegResponse.data || {};

        const tanuloi = tanugyiData.filter(
          (s) =>
            s.tanev_kezdete === year &&
            s.tanulo_jogviszonya === "Tanulói jogviszony"
        ).length;

        const felnott = tanugyiData.filter(
          (s) =>
            s.tanev_kezdete === year &&
            s.tanulo_jogviszonya === "Felnőttképzési jogviszony"
        ).length;

        const osszDiak = tanuloi + felnott;

        const oktatoi = alkalmazottData.filter(
          (a) => a.TanevKezdete === year
        ).length;

        const arany =
          oktatoi > 0 ? parseFloat((osszDiak / oktatoi).toFixed(2)) : 0;

        return {
          year: yearStr,
          tanuloi,
          felnott,
          osszDiak,
          oktatoi,
          arany,
          orati_tanuloi: oratomegData.tanuloi_oratomeg ?? "",
          orati_felnott: oratomegData.felnott_oratomeg ?? "",
        };
      });

      const results = await Promise.all(dataPromises);

      const newYearlyData = {};
      results.forEach((res) => {
        newYearlyData[res.year] = res;
      });

      setYearlyData(newYearlyData);
      setSavedData(JSON.parse(JSON.stringify(newYearlyData)));
      setIsModified(false);
    } catch (error) {
      console.error("Hiba az adatok lekérdezésekor:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchool?.id]);

  const handleChange = (year, field, value) => {
    setYearlyData((prev) => ({
      ...prev,
      [year]: {
        ...prev[year],
        [field]: value,
      },
    }));
    setIsModified(true);
  };

  const handleSave = async () => {
    if (!selectedSchool?.id) return;
    setIsSaving(true);

    try {
      // Upsert all modified years (or all years)
      const savePromises = schoolYears.map((yearStr) => {
        const year = parseInt(yearStr.split("/")[0]);
        const data = yearlyData[yearStr];

        return upsertOratomeg({
          alapadatok_id: selectedSchool.id,
          tanev_kezdete: year,
          tanuloi_oratomeg: data.orati_tanuloi,
          felnott_oratomeg: data.orati_felnott,
        }).unwrap();
      });

      await Promise.all(savePromises);

      setSnackbarMessage("Adatok sikeresen mentve!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);

      setSavedData(JSON.parse(JSON.stringify(yearlyData)));
      setIsModified(false);
    } catch (error) {
      console.error("Hiba a mentés során:", error);
      setSnackbarMessage("Hiba a mentés során.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (savedData) {
      setYearlyData(JSON.parse(JSON.stringify(savedData)));
      setIsModified(false);
    }
  };

  // Called when a history snapshot is restored
  const handleHistoryRestore = () => {
    setHistoryOpen(false);
    fetchData(); // Újratöltjük az adatokat, mivel a DB-ben felülírta a visszaállítás
  };

  const renderDataRow = (
    title,
    subtitle,
    dataKey,
    highlight = false,
    isEditable = false
  ) => (
    <TableRow
      hover
      sx={{
        backgroundColor: highlight ? "#f0fdf4" : "inherit",
        "&:last-child td, &:last-child th": { border: 0 },
      }}
    >
      <TableCell component="th" scope="row" sx={{ py: 2 }}>
        <Typography
          variant="body1"
          sx={{ fontWeight: highlight ? 600 : 500 }}
          color={highlight ? "success.dark" : "text.primary"}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mt: 0.5 }}
          >
            {subtitle}
          </Typography>
        )}
      </TableCell>
      {schoolYears.map((year) => (
        <TableCell
          key={year}
          align="center"
          sx={{
            fontWeight: highlight ? 700 : 500,
            fontSize: highlight ? "1.1rem" : "1rem",
            color: highlight ? "success.dark" : "text.primary",
          }}
        >
          {isEditable ? (
            <ZeroHidingTextField
              size="small"
              type="number"
              variant="outlined"
              value={yearlyData[year]?.[dataKey] || 0}
              onChange={(e) => handleChange(year, dataKey, e.target.value)}
              inputProps={{ style: { textAlign: "center" } }}
              sx={{ width: "80px", backgroundColor: "white" }}
              placeholder="0" />
          ) : (
            yearlyData[year]?.[dataKey] ?? ""
          )}
        </TableCell>
      ))}
    </TableRow>
  );

  return (
    <PageWrapper
      titleContent={<TitleEgyOktatoraJutoOsszDiak />}
      infoContent={<InfoEgyOktatoraJutoOsszDiak />}
    >
      <Box sx={{ p: 2, position: "relative" }}>
        <PageLoadingOverlay isLoading={isLoading} />

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity={snackbarSeverity} sx={{ width: "100%" }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>

        {!selectedSchool && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            Kérjük, válasszon intézményt!
          </Alert>
        )}

        {selectedSchool && (
          <>
            <Stack
              direction="row"
              spacing={2}
              sx={{
                mt: 1,
                mb: 3,
                position: "sticky",
                top: 2,
                zIndex: 10,
                backgroundColor: "white",
                padding: 1,
                borderRadius: 1,
              }}
            >

              <LockedTableWrapper tableName="engedelyezettOratomeg">
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={!isModified || isSaving}
                >
                  {isSaving ? "Mentés" : "Mentés"}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleReset}
                  disabled={!isModified || isSaving}
                >
                  Visszaállítás
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
              </LockedTableWrapper>
              <ExportDOMTableToExcel
                tableId=".MuiTable-root"
                fileName="egy_oktatora_juto_diak_export"
              />
            </Stack>

            <TableContainer
              component={Paper}
              elevation={3}
              sx={{ borderRadius: 2, overflow: "hidden", mt: 2 }}
            >
              <Table sx={{ minWidth: 800 }}>
                <TableHead sx={{ backgroundColor: "primary.main" }}>
                  <TableRow>
                    <TableCell
                      sx={{ color: "white", fontWeight: "bold", fontSize: "1rem" }}
                    >
                      Megnevezés
                    </TableCell>
                    {schoolYears.map((year) => (
                      <TableCell
                        key={year}
                        align="center"
                        sx={{
                          color: "white",
                          fontWeight: "bold",
                          fontSize: "1rem",
                        }}
                      >
                        {year}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {/* Main Indicator Row */}
                  <TableRow sx={{ backgroundColor: "#fffbeb" }}>
                    <TableCell sx={{ py: 2.5 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 700, color: "#d97706" }}
                      >
                        Egy oktatóra jutó tanulók száma összesen
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "#d97706", opacity: 0.8 }}
                      >
                        (tanuló/oktató)
                      </Typography>
                    </TableCell>
                    {schoolYears.map((year) => (
                      <TableCell
                        key={year}
                        align="center"
                        sx={{
                          fontWeight: 800,
                          fontSize: "1.25rem",
                          color: "#b45309",
                        }}
                      >
                        {formatHuNum(yearlyData[year]?.arany ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Section Header */}
                  <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                    <TableCell colSpan={schoolYears.length + 1} sx={{ py: 1.5 }}>
                      <Typography
                        variant="overline"
                        sx={{
                          fontWeight: "bold",
                          color: "text.secondary",
                          letterSpacing: 1.2,
                        }}
                      >
                        Részletezés export adatokból
                      </Typography>
                    </TableCell>
                  </TableRow>

                  {/* Data Breakdown Rows */}
                  {renderDataRow(
                    "Tanulói jogviszonyú tanulók száma",
                    "(fő)",
                    "tanuloi"
                  )}
                  {renderDataRow(
                    "Felnőttképzési jogviszonyú tanulók száma",
                    "(felnőttképzési jogviszony) (fő)",
                    "felnott"
                  )}
                  {renderDataRow(
                    "Szakmai oktatásban tanulók összlétszáma",
                    "(tanulói + felnőttképzési jogviszony) (fő)",
                    "osszDiak",
                    true
                  )}
                  {renderDataRow(
                    "Számított oktatói létszám",
                    "(fő)",
                    "oktatoi"
                  )}

                  {/* Section Header for unused DB fields */}
                  <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                    <TableCell colSpan={schoolYears.length + 1} sx={{ py: 1.5 }}>
                      <Typography
                        variant="overline"
                        sx={{
                          fontWeight: "bold",
                          color: "text.secondary",
                          letterSpacing: 1.2,
                        }}
                      >
                        Engedélyezett óratömegek
                      </Typography>
                    </TableCell>
                  </TableRow>

                  {renderDataRow(
                    "Fenntartó által engedélyezett heti óratömeg",
                    "(tanulói jogviszony) (óra)",
                    "orati_tanuloi",
                    false,
                    true // isEditable
                  )}
                  {renderDataRow(
                    "Fenntartó által engedélyezett heti óratömeg",
                    "(felnőttképzési jogviszony) (óra)",
                    "orati_felnott",
                    false,
                    true // isEditable
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* History Dialog */}
            <HistoryDialog
              open={historyOpen}
              onClose={() => setHistoryOpen(false)}
              alapadatokId={selectedSchool?.id}
              tableName="engedelyezettOratomeg"
              onRollbackSuccess={handleHistoryRestore}
            />
          </>
        )}
      </Box>
    </PageWrapper>
  );
}
