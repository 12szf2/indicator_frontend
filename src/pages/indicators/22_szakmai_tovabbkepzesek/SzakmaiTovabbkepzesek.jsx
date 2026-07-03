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
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import {
  useGetSzakmaiTovabbkepzesekBySchoolQuery,
  useUpsertSzakmaiTovabbkepzesekMutation,
} from "../../../store/api/apiSlice";
import { generateSchoolYears } from "../../../utils/schoolYears";
import PageWrapper from "../../PageWrapper";
import InfoSzakmaiTovabbkepzesek from "./info_szakmai_tovabbkepzesek";
import TitleSzakmaiTovabbkepzesek from "./title_szakmai_tovabbkepzesek";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import ExportToExcel from "../../../components/ExportToExcel";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";

const evszamok = generateSchoolYears();

// Stabil üres tömb
const EMPTY_ARRAY = [];

export default function SzakmaiTovabbkepzesek() {
  const selectedSchool = useSelector(selectSelectedSchool);

  const [tableData, setTableData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [isModified, setIsModified] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [isSaving, setIsSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [upsertSzakmaiTovabbkepzesek] =
    useUpsertSzakmaiTovabbkepzesekMutation();

  const {
    data: tovabbkepzesData = EMPTY_ARRAY,
    isLoading: isDataLoading,
    isFetching,
  } = useGetSzakmaiTovabbkepzesekBySchoolQuery(selectedSchool?.id, {
    skip: !selectedSchool,
  });

  const initializeDataStore = () => {
    const struct = {
      oktatok_letszama: "",
      veztok_letszama: "",
      ikk_10_alatt: "",
      ikk_10: "",
      ikk_20: "",
      ikk_30: "",
      ikk_40: "",
      ikk_50: "",
      ikk_60: "",
      ikk_90: "",
      ikk_120: "",
      vallalati_tovabbkepzes: "",
      egyedi_oraszam: "",
      ujabb_diploma: "",
      alapkepesites_mesterfokozat: "",
      pedagogus_szakvizsga: "",
      egyeb_posztgradualis: "",
      forditott_osszeg: "",
    };
    return struct;
  };

  useEffect(() => {
    if (!isFetching) {
      const byYear = {};

      evszamok.forEach((yearStr) => {
        const startYear = parseInt(yearStr.split("/")[0], 10);
        byYear[startYear] = { ...initializeDataStore(), tanev: startYear };
      });

      if (Array.isArray(tovabbkepzesData)) {
        tovabbkepzesData.forEach((apiRecord) => {
          if (byYear[apiRecord.tanev]) {
            byYear[apiRecord.tanev] = {
              ...byYear[apiRecord.tanev],
              id: apiRecord.id,
              oktatok_letszama: apiRecord.oktatok_letszama ?? "",
              veztok_letszama: apiRecord.veztok_letszama ?? "",
              ikk_10_alatt: apiRecord.ikk_10_alatt ?? "",
              ikk_10: apiRecord.ikk_10 ?? "",
              ikk_20: apiRecord.ikk_20 ?? "",
              ikk_30: apiRecord.ikk_30 ?? "",
              ikk_40: apiRecord.ikk_40 ?? "",
              ikk_50: apiRecord.ikk_50 ?? "",
              ikk_60: apiRecord.ikk_60 ?? "",
              ikk_90: apiRecord.ikk_90 ?? "",
              ikk_120: apiRecord.ikk_120 ?? "",
              vallalati_tovabbkepzes: apiRecord.vallalati_tovabbkepzes ?? "",
              egyedi_oraszam: apiRecord.egyedi_oraszam ?? "",
              ujabb_diploma: apiRecord.ujabb_diploma ?? "",
              alapkepesites_mesterfokozat:
                apiRecord.alapkepesites_mesterfokozat ?? "",
              pedagogus_szakvizsga: apiRecord.pedagogus_szakvizsga ?? "",
              egyeb_posztgradualis: apiRecord.egyeb_posztgradualis ?? "",
              forditott_osszeg: apiRecord.forditott_osszeg ?? "",
            };
          }
        });
      }

      setTableData(byYear);
      setOriginalData(JSON.parse(JSON.stringify(byYear)));
      setIsModified(false);
    }
  }, [tovabbkepzesData, isFetching]);

  const handleReset = () => {
    setTableData(JSON.parse(JSON.stringify(originalData)));
    setIsModified(false);
  };

  const isFieldModified = (year, field) => {
    const orig = originalData[year]?.[field] ?? "";
    const curr = tableData[year]?.[field] ?? "";
    return orig !== curr;
  };

  const getFieldSx = (year, field) => ({
    "& input": {
      textAlign: "center",
      p: 1,
      backgroundColor: isFieldModified(year, field) ? "#fff9c4" : "inherit",
    },
  });

  const handleDataChange = (year, field, value) => {
    if (value && isNaN(value)) return;
    setTableData((prev) => ({
      ...prev,
      [year]: {
        ...prev[year],
        [field]: value === "" ? "" : parseFloat(value),
      },
    }));
    setIsModified(true);
  };

  // Calculations
  const getNum = (val) => (val ? parseFloat(val) : 0);

  const calcData = useMemo(() => {
    const fieldsToSum = [
      "veztok_letszama",
      "ikk_10_alatt",
      "ikk_10",
      "ikk_20",
      "ikk_30",
      "ikk_40",
      "ikk_50",
      "ikk_60",
      "ikk_90",
      "ikk_120",
      "vallalati_tovabbkepzes",
      "egyedi_oraszam",
      "ujabb_diploma",
      "alapkepesites_mesterfokozat",
      "pedagogus_szakvizsga",
      "egyeb_posztgradualis",
    ];

    const results = {};
    evszamok.forEach((yearStr) => {
      const year = parseInt(yearStr.split("/")[0], 10);
      const row = tableData[year] || {};
      const resztvevokOsszesen = fieldsToSum.reduce(
        (acc, field) => acc + getNum(row[field]),
        0,
      );
      const oktatokLetszama = getNum(row.oktatok_letszama);
      const forditottOsszeg = getNum(row.forditott_osszeg);

      let arany = 0;
      if (oktatokLetszama > 0) {
        arany = (resztvevokOsszesen / oktatokLetszama) * 100;
      }

      let fKoltseg = 0;
      if (oktatokLetszama > 0) {
        fKoltseg = forditottOsszeg / oktatokLetszama;
      }

      results[year] = {
        resztvevokOsszesen,
        oktatokLetszama,
        forditottOsszeg,
        aranyText: arany > 0 ? arany.toFixed(1) + "%" : "0%",
        fKoltsegText: fKoltseg > 0 ? fKoltseg.toFixed(2) : 0,
      };
    });
    return results;
  }, [tableData]);

  const handleSaveData = async () => {
    setIsSaving(true);
    try {
      const payloads = [];
      evszamok.forEach((yearStr) => {
        const year = parseInt(yearStr.split("/")[0], 10);
        const row = tableData[year];

        payloads.push({
          id: row.id || undefined,
          alapadatok_id: selectedSchool.id,
          tanev: year,
          oktatok_letszama:
            row.oktatok_letszama === ""
              ? null
              : parseFloat(row.oktatok_letszama),
          veztok_letszama:
            row.veztok_letszama === "" ? null : parseFloat(row.veztok_letszama),
          ikk_10_alatt:
            row.ikk_10_alatt === "" ? null : parseFloat(row.ikk_10_alatt),
          ikk_10: row.ikk_10 === "" ? null : parseFloat(row.ikk_10),
          ikk_20: row.ikk_20 === "" ? null : parseFloat(row.ikk_20),
          ikk_30: row.ikk_30 === "" ? null : parseFloat(row.ikk_30),
          ikk_40: row.ikk_40 === "" ? null : parseFloat(row.ikk_40),
          ikk_50: row.ikk_50 === "" ? null : parseFloat(row.ikk_50),
          ikk_60: row.ikk_60 === "" ? null : parseFloat(row.ikk_60),
          ikk_90: row.ikk_90 === "" ? null : parseFloat(row.ikk_90),
          ikk_120: row.ikk_120 === "" ? null : parseFloat(row.ikk_120),
          vallalati_tovabbkepzes:
            row.vallalati_tovabbkepzes === ""
              ? null
              : parseFloat(row.vallalati_tovabbkepzes),
          egyedi_oraszam:
            row.egyedi_oraszam === "" ? null : parseFloat(row.egyedi_oraszam),
          ujabb_diploma:
            row.ujabb_diploma === "" ? null : parseFloat(row.ujabb_diploma),
          alapkepesites_mesterfokozat:
            row.alapkepesites_mesterfokozat === ""
              ? null
              : parseFloat(row.alapkepesites_mesterfokozat),
          pedagogus_szakvizsga:
            row.pedagogus_szakvizsga === ""
              ? null
              : parseFloat(row.pedagogus_szakvizsga),
          egyeb_posztgradualis:
            row.egyeb_posztgradualis === ""
              ? null
              : parseFloat(row.egyeb_posztgradualis),
          forditott_osszeg:
            row.forditott_osszeg === ""
              ? null
              : parseFloat(row.forditott_osszeg),
        });
      });

      const res = await upsertSzakmaiTovabbkepzesek(payloads).unwrap();

      setSnackbarMessage(`Sikeresen mentve!`);
      setSnackbarSeverity("success");
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
    backgroundColor: "#1976d2",
    color: "#fff",
    border: "1px solid rgba(224, 224, 224, 1)",
  };

  const cellSx = {
    border: "1px solid rgba(224, 224, 224, 1)",
  };

  const rowLabels = [
    { key: "veztok_letszama", label: "Vezetők létszáma" },
    {
      key: "ikk_10_alatt",
      label: "10 óránál kevesebb",
      group: "IKK által szervezett",
    },
    { key: "ikk_10", label: "10 óra", group: "IKK által szervezett" },
    { key: "ikk_20", label: "20 óra", group: "IKK által szervezett" },
    { key: "ikk_30", label: "30 óra", group: "IKK által szervezett" },
    { key: "ikk_40", label: "40 óra", group: "IKK által szervezett" },
    { key: "ikk_50", label: "50 óra", group: "IKK által szervezett" },
    { key: "ikk_60", label: "60 óra", group: "IKK által szervezett" },
    { key: "ikk_90", label: "90 óra", group: "IKK által szervezett" },
    { key: "ikk_120", label: "120 óra", group: "IKK által szervezett" },
    {
      key: "vallalati_tovabbkepzes",
      label: "vállalati továbbképzés",
      isGroupLabel: false,
    },
    { key: "egyedi_oraszam", label: "egyedi óraszám" },
    { key: "ujabb_diploma", label: "újabb diploma" },
    {
      key: "alapkepesites_mesterfokozat",
      label: "alapképesítés magasabb szintű elsajátítása-mesterfokozat",
    },
    { key: "pedagogus_szakvizsga", label: "pedagógus szakvizsga" },
    { key: "egyeb_posztgradualis", label: "egyéb posztgraduális" },
  ];

  const exportRows = useMemo(() => {
    let output = [];
    rowLabels.forEach((rowItem, idx) => {
      let mainCat =
        rowItem.group ||
        (idx === 0 ? "" : "Továbbképzésen résztvevők létszáma");
      let subCat = rowItem.label;
      if (idx === 0) {
        mainCat = rowItem.label;
        subCat = "";
      }
      const exportRow = { mainCat, subCat };
      evszamok.forEach((yearStr) => {
        const year = parseInt(yearStr.split("/")[0], 10);
        exportRow[yearStr] = tableData[year]?.[rowItem.key] ?? "";
      });
      output.push(exportRow);
    });

    // Add calc rows
    const sumRow = { mainCat: "Összesen:", subCat: "" };
    const oktatokRow = { mainCat: "Oktatók létszáma (fő):", subCat: "" };
    const aranyRow = {
      mainCat: "Szakmai továbbképzésen résztvevő oktatók aránya:",
      subCat: "",
    };
    const osszegRow = {
      mainCat: "Továbbképzésre fordított összeg az intézményben (Ft):",
      subCat: "",
    };
    const koltsegRow = {
      mainCat: "Szakmai képzésre fordított, egy főre jutó költség (Ft/fő):",
      subCat: "",
    };

    evszamok.forEach((yearStr) => {
      const year = parseInt(yearStr.split("/")[0], 10);
      sumRow[yearStr] = calcData[year]?.resztvevokOsszesen || 0;
      oktatokRow[yearStr] = tableData[year]?.oktatok_letszama || 0;
      aranyRow[yearStr] = calcData[year]?.aranyText || "0%";
      osszegRow[yearStr] = tableData[year]?.forditott_osszeg || 0;
      koltsegRow[yearStr] = calcData[year]?.fKoltsegText || 0;
    });

    output.push(sumRow, oktatokRow, aranyRow, osszegRow, koltsegRow);
    return output;
  }, [tableData, calcData]);

  return (
    <PageWrapper
      titleContent={<TitleSzakmaiTovabbkepzesek />}
      infoContent={<InfoSzakmaiTovabbkepzesek />}
      isLoading={isDataLoading}
    >
      <Box sx={{ mb: 3 }}>
        <LockStatusIndicator tableName="szakmai_tovabbkepzes" />
        <PageLoadingOverlay isLoading={isFetching} />

        {!selectedSchool && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Kérjük, válasszon egy intézményt a fenti legördülő menüből az adatok
            megtekintéséhez és szerkesztéséhez.
          </Alert>
        )}

        <Stack
          direction="row"
          spacing={2}
          sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mb: 2 }}
          flexWrap="wrap"
        >
          <LockedTableWrapper tableName="szakmai_tovabbkepzes">
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveData}
              disabled={!isModified || isSaving || !selectedSchool}
            >
              Mentés
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setHistoryOpen(true)}
              startIcon={<HistoryIcon />}
              sx={{ ml: 2, mr: 2 }}
            >
              Előzmények
            </Button>
            <Button
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={handleReset}
              disabled={!isModified || isSaving || !selectedSchool}
            >
              Visszaállítás
            </Button>
          </LockedTableWrapper>
          <ExportToExcel
            fileName="szakmai_tovabbkepzesek"
            sheetName="Szakmai Továbbképzések"
            columns={[
              { header: "Kategória", key: "mainCat", width: 40 },
              { header: "Alkategória", key: "subCat", width: 40 },
              ...evszamok.map((yr) => ({ header: yr, key: yr, width: 15 })),
            ]}
            rows={exportRows}
            buttonLabel="Export"
          />
        </Stack>

        <TableContainer
          component={Paper}
          elevation={3}
          sx={{ overflowX: "auto", mt: 3, border: "1px solid #e0e0e0" }}
        >
          <Table
            size="small"
            sx={{ minWidth: 800, borderCollapse: "collapse" }}
          >
            <TableHead>
              <TableRow>
                <TableCell colSpan={3} sx={headerSx}>
                  Kategóriák
                </TableCell>
                {evszamok.map((yearStr) => (
                  <TableCell
                    key={yearStr}
                    align="center"
                    sx={{ ...headerSx, width: 140 }}
                  >
                    {yearStr.split("/")[0]}. október 1. (fő)
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rowLabels.map((rowItem, idx) => {
                return (
                  <TableRow
                    key={rowItem.key}
                    sx={{
                      backgroundColor: idx % 2 === 0 ? "#f5f5f5" : "white",
                    }}
                  >
                    {idx === 0 && (
                      <TableCell
                        colSpan={3}
                        sx={{ ...cellSx, fontWeight: "bold" }}
                      >
                        {rowItem.label}
                      </TableCell>
                    )}

                    {idx === 1 && (
                      <>
                        <TableCell
                          rowSpan={15}
                          sx={{
                            ...cellSx,
                            width: 40,
                            p: 0,
                            position: "relative",
                          }}
                        >
                          <Box
                            sx={{
                              position: "absolute",
                              top: 0,
                              bottom: 0,
                              left: 0,
                              right: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              writingMode: "vertical-rl",
                              transform: "rotate(180deg)",
                              fontWeight: "bold",
                            }}
                          >
                            Továbbképzésen résztvevők létszáma
                          </Box>
                        </TableCell>
                        <TableCell
                          rowSpan={9}
                          sx={{
                            ...cellSx,
                            width: 40,
                            p: 0,
                            position: "relative",
                          }}
                        >
                          <Box
                            sx={{
                              position: "absolute",
                              top: 0,
                              bottom: 0,
                              left: 0,
                              right: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              writingMode: "vertical-rl",
                              transform: "rotate(180deg)",
                            }}
                          >
                            IKK által szervezett
                          </Box>
                        </TableCell>
                        <TableCell sx={cellSx}>{rowItem.label}</TableCell>
                      </>
                    )}

                    {idx > 1 && idx <= 9 && (
                      <TableCell sx={cellSx}>{rowItem.label}</TableCell>
                    )}

                    {idx >= 10 && (
                      <TableCell colSpan={2} sx={cellSx}>
                        {rowItem.label}
                      </TableCell>
                    )}

                    {evszamok.map((yearStr) => {
                      const year = parseInt(yearStr.split("/")[0], 10);
                      return (
                        <TableCell key={yearStr} align="center" sx={cellSx}>
                          <ZeroHidingTextField
                            variant="outlined"
                            size="small"
                            fullWidth
                            value={tableData[year]?.[rowItem.key] || 0}
                            onChange={(e) =>
                              handleDataChange(
                                year,
                                rowItem.key,
                                e.target.value,
                              )
                            }
                            sx={getFieldSx(year, rowItem.key)}
                            disabled={!selectedSchool}
                            placeholder="0"
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}

              <TableRow sx={{ backgroundColor: "#fff3e0" }}>
                <TableCell colSpan={3} sx={{ ...cellSx, fontWeight: "bold" }}>
                  Összesen:
                </TableCell>
                {evszamok.map((yearStr) => {
                  const year = parseInt(yearStr.split("/")[0], 10);
                  return (
                    <TableCell
                      key={yearStr}
                      align="center"
                      sx={{ ...cellSx, fontWeight: "bold" }}
                    >
                      {calcData[year]?.resztvevokOsszesen || 0}
                    </TableCell>
                  );
                })}
              </TableRow>

              <TableRow sx={{ backgroundColor: "#f0f8ff" }}>
                <TableCell colSpan={3} sx={{ ...cellSx, fontWeight: "bold" }}>
                  Oktatók létszáma (fő):
                </TableCell>
                {evszamok.map((yearStr) => {
                  const year = parseInt(yearStr.split("/")[0], 10);
                  return (
                    <TableCell key={yearStr} align="center" sx={cellSx}>
                      <ZeroHidingTextField
                        variant="outlined"
                        size="small"
                        fullWidth
                        value={tableData[year]?.oktatok_letszama || 0}
                        onChange={(e) =>
                          handleDataChange(
                            year,
                            "oktatok_letszama",
                            e.target.value,
                          )
                        }
                        sx={getFieldSx(year, "oktatok_letszama")}
                        disabled={!selectedSchool}
                        placeholder="0"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>

              <TableRow sx={{ backgroundColor: "#ffcdd2" }}>
                <TableCell
                  colSpan={3}
                  sx={{ ...cellSx, fontWeight: "bold", color: "#d32f2f" }}
                >
                  Szakmai továbbképzésen résztvevő oktatók aránya:
                </TableCell>
                {evszamok.map((yearStr) => {
                  const year = parseInt(yearStr.split("/")[0], 10);
                  return (
                    <TableCell
                      key={yearStr}
                      align="center"
                      sx={{ ...cellSx, fontWeight: "bold", color: "#d32f2f" }}
                    >
                      {calcData[year]?.aranyText || "0%"}
                    </TableCell>
                  );
                })}
              </TableRow>

              <TableRow sx={{ backgroundColor: "#f0f8ff" }}>
                <TableCell colSpan={3} sx={{ ...cellSx, fontWeight: "bold" }}>
                  Továbbképzésre fordított összeg az intézményben (Ft):
                </TableCell>
                {evszamok.map((yearStr) => {
                  const year = parseInt(yearStr.split("/")[0], 10);
                  return (
                    <TableCell key={yearStr} align="center" sx={cellSx}>
                      <ZeroHidingTextField
                        variant="outlined"
                        size="small"
                        fullWidth
                        value={tableData[year]?.forditott_osszeg || 0}
                        onChange={(e) =>
                          handleDataChange(
                            year,
                            "forditott_osszeg",
                            e.target.value,
                          )
                        }
                        sx={getFieldSx(year, "forditott_osszeg")}
                        disabled={!selectedSchool}
                        placeholder="0"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>

              <TableRow sx={{ backgroundColor: "#fff3e0" }}>
                <TableCell
                  colSpan={3}
                  sx={{ ...cellSx, fontWeight: "bold", color: "#d32f2f" }}
                >
                  Szakmai képzésre fordított, egy főre jutó költség (Ft/fő):
                </TableCell>
                {evszamok.map((yearStr) => {
                  const year = parseInt(yearStr.split("/")[0], 10);
                  return (
                    <TableCell
                      key={yearStr}
                      align="center"
                      sx={{ ...cellSx, fontWeight: "bold" }}
                    >
                      {calcData[year]?.fKoltsegText || 0}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <HistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        alapadatokId={selectedSchool?.id}
        tableName="szakmai_tovabbkepzes"
        onRollbackSuccess={() => {
          setSnackbarMessage("Sikeres visszaállítás az előzményekből!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        }}
      />

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
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </PageWrapper>
  );
}
