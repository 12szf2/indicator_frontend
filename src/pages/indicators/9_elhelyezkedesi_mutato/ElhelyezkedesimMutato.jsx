import { formatHuNum } from "../../../utils/formatters";
import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
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
  Container,
  Fade,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import { generateSchoolYears } from "../../../utils/schoolYears";
import {
  useGetAllElhelyezkedesQuery,
  useAddElhelyezkedesMutation,
  useUpdateElhelyezkedesMutation,
  useGetAllAlapadatokQuery,
} from "../../../store/api/apiSlice";
import PageWrapper from "../../PageWrapper";
import InfoElhelyezkedes from "./info_elhelyezkedesi_mutato";
import TitleElhelyezkedes from "./title_elhelyezkedesi_mutato";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

const evszamok = generateSchoolYears();

export default function ElhelyezkedesimMutato() {
  const selectedSchool = useSelector(selectSelectedSchool);

  // API Hooks
  const { data: schoolsData, isLoading: isLoadingSchools } =
    useGetAllAlapadatokQuery();
  const {
    data: apiEmploymentData,
    error: fetchError,
    isLoading: isFetching,
    refetch,
  } = useGetAllElhelyezkedesQuery();
  const [addElhelyezkedes, { isLoading: isAdding }] =
    useAddElhelyezkedesMutation();
  const [updateElhelyezkedes, { isLoading: isUpdating }] =
    useUpdateElhelyezkedesMutation();

  // Component State
  const [tableData, setTableData] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savedData, setSavedData] = useState(null);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // Generate categories based on selectedSchool
  const { categories, programMap } = useMemo(() => {
    if (!schoolsData) return { categories: [], programMap: {} };

    let relevantSchools = selectedSchool
      ? schoolsData.filter((s) => s.id === selectedSchool.id)
      : schoolsData;

    const generatedCategories = [];
    const generatedProgramMap = {};

    const institutionTypes = [
      ...new Set(relevantSchools.map((s) => s.intezmeny_tipus)),
    ].filter(Boolean);

    if (institutionTypes.length > 0) {
      const allInstTypesStr = institutionTypes.join("+");
      const allSubTypes = [];

      institutionTypes.forEach((instType) => {
        const subTypes = [];

        relevantSchools
          .filter((s) => s.intezmeny_tipus === instType)
          .forEach((school) => {
            if (
              school.alapadatok_szakirany &&
              Array.isArray(school.alapadatok_szakirany)
            ) {
              school.alapadatok_szakirany.forEach((sz) => {
                const szakiranyId = sz.szakirany_id || sz.szakirany?.id;

                if (
                  sz.szakirany?.szakma &&
                  Array.isArray(sz.szakirany.szakma) &&
                  sz.szakirany.szakma.length > 0
                ) {
                  sz.szakirany.szakma.forEach((szm) => {
                    const szakmaId = szm.szakma_id || szm.szakma?.id;
                    const szakmaNev = szm.szakma?.nev;
                    if (szakmaNev) {
                      const key = `szakma_${szakmaId}_${szakiranyId}`;
                      if (!subTypes.includes(key)) {
                        subTypes.push(key);
                        allSubTypes.push(key);
                        generatedProgramMap[key] = {
                          szakirany_id: szakiranyId,
                          szakma_id: szakmaId,
                          szakma_nev: szakmaNev,
                          alapadatok_id: school.id,
                        };
                      }
                    }
                  });
                } else if (szakiranyId) {
                  const key = `szakirany_${szakiranyId}`;
                  if (!subTypes.includes(key)) {
                    subTypes.push(key);
                    allSubTypes.push(key);
                    generatedProgramMap[key] = {
                      szakirany_id: szakiranyId,
                      szakma_id: null,
                      szakma_nev: `Szakirány: ${sz.szakirany?.nev || "Ismeretlen"}`,
                      alapadatok_id: school.id,
                    };
                  }
                }
              });
            }
          });

        if (subTypes.length > 0) {
          generatedCategories.push({
            isInstitutionType: true,
            titleCol1: "intézménytípusonként",
            titleCol2: `ebből: ${instType.toLowerCase()}`,
            subTypes,
          });
        }
      });

      // Add "Összesen" row at the very beginning if we have any valid subtypes
      if (allSubTypes.length > 0) {
        generatedCategories.unshift({
          isTotal: true,
          titleCol1: "összesen",
          titleCol2: allInstTypesStr.toLowerCase(),
          subTypes: allSubTypes,
        });
      }
    }

    return { categories: generatedCategories, programMap: generatedProgramMap };
  }, [schoolsData, selectedSchool]);

  // Load API data into tableData state
  useEffect(() => {
    if (apiEmploymentData) {
      const initialData = {};

      const relevantData = selectedSchool
        ? apiEmploymentData.filter(
          (item) => item.alapadatok_id === selectedSchool.id,
        )
        : apiEmploymentData;

      relevantData.forEach((item) => {
        const year = item.tanev_kezdete;
        const szakmaId = item.szakma_id || item.szakma?.id;
        const szakiranyId = item.szakirany_id || item.szakirany?.id;
        const key = szakmaId
          ? `szakma_${szakmaId}_${szakiranyId}`
          : `szakirany_${szakiranyId}`;

        if (!initialData[key]) initialData[key] = {};
        initialData[key][year] = {
          id: item.id,
          elhelyezkedok_szama: item.elhelyezkedok_szama || 0,
          szakmai_okatatasban_sikeresen_vegzettek_szama:
            item.szakmai_okatatasban_sikeresen_vegzettek_szama || 0,
        };
      });

      setTableData(initialData);
      setSavedData(JSON.parse(JSON.stringify(initialData)));
      setIsModified(false);
    }
  }, [apiEmploymentData, selectedSchool]);

  // Handle Input Changes
  const handleDataChange = (key, yearStr, field, value) => {
    const year = parseInt(yearStr, 10);
    const numValue = parseInt(value, 10);

    setTableData((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [year]: {
          ...(prev[key]?.[year] || {}),
          [field]: isNaN(numValue) ? 0 : numValue,
        },
      },
    }));
    setIsModified(true);
  };

  const handleResetData = () => {
    if (savedData) {
      setTableData(JSON.parse(JSON.stringify(savedData)));
      setIsModified(false);
    }
  };

  // Calculation Helpers
  const getCellData = (key, year) => {
    const startYear = parseInt(year.split("/")[0], 10);
    return (
      tableData[key]?.[startYear] || {
        elhelyezkedok_szama: 0,
        szakmai_okatatasban_sikeresen_vegzettek_szama: 0,
      }
    );
  };

  const calculateRowArany = (key, year) => {
    const data = getCellData(key, year);
    if (!data.szakmai_okatatasban_sikeresen_vegzettek_szama) return "0.0";
    return (
      (data.elhelyezkedok_szama /
        data.szakmai_okatatasban_sikeresen_vegzettek_szama) *
      100
    ).toFixed(1);
  };

  const calculateTotalElhelyezkedok = (cat, year) => {
    return cat.subTypes.reduce(
      (sum, key) => sum + (getCellData(key, year).elhelyezkedok_szama || 0),
      0,
    );
  };

  const calculateTotalVegzettek = (cat, year) => {
    return cat.subTypes.reduce(
      (sum, key) =>
        sum +
        (getCellData(key, year).szakmai_okatatasban_sikeresen_vegzettek_szama ||
          0),
      0,
    );
  };

  const calculateTotalArany = (cat, year) => {
    const elhelyezkedok = calculateTotalElhelyezkedok(cat, year);
    const vegzettek = calculateTotalVegzettek(cat, year);
    if (!vegzettek) return "0.0";
    return ((elhelyezkedok / vegzettek) * 100).toFixed(1);
  };

  // Save Logic
  const handleSaveData = async () => {
    try {
      setIsSaving(true);
      let savedCount = 0;
      let updatedCount = 0;

      for (const [key, yearData] of Object.entries(tableData)) {
        if (!programMap[key]) continue; // Skip if no mapping exists for this category

        for (const [yearStr, fields] of Object.entries(yearData)) {
          const year = parseInt(yearStr, 10);

          // Check if it's different from savedData
          const savedFields = savedData[key]?.[yearStr] || {
            elhelyezkedok_szama: 0,
            szakmai_okatatasban_sikeresen_vegzettek_szama: 0,
          };

          if (
            fields.elhelyezkedok_szama !== savedFields.elhelyezkedok_szama ||
            fields.szakmai_okatatasban_sikeresen_vegzettek_szama !==
            savedFields.szakmai_okatatasban_sikeresen_vegzettek_szama
          ) {
            const payload = {
              alapadatok_id: programMap[key].alapadatok_id,
              szakirany_id: programMap[key].szakirany_id,
              szakma_id: programMap[key].szakma_id,
              tanev_kezdete: year,
              elhelyezkedok_szama: fields.elhelyezkedok_szama,
              szakmai_okatatasban_sikeresen_vegzettek_szama:
                fields.szakmai_okatatasban_sikeresen_vegzettek_szama,
            };

            if (fields.id) {
              await updateElhelyezkedes({ id: fields.id, ...payload }).unwrap();
              updatedCount++;
            } else {
              await addElhelyezkedes(payload).unwrap();
              savedCount++;
            }
          }
        }
      }

      // Update saved data reference
      setSavedData(JSON.parse(JSON.stringify(tableData)));
      setIsModified(false);
      refetch();

      setSnackbarMessage(
        `Sikeresen mentve: ${savedCount} új rekord és ${updatedCount} frissített rekord`,
      );
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Hiba a mentés során:", error);
      setSnackbarMessage(error.data?.message || "Hiba történt a mentés során");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  if (isFetching || isLoadingSchools) {
    return <PageLoadingOverlay isLoading={true} />;
  }

  return (
    <Container maxWidth="xl">
      <PageWrapper
        titleContent={<TitleElhelyezkedes />}
        infoContent={<InfoElhelyezkedes />}
      >
        <Fade in={true} timeout={800}>
          <Box sx={{ minHeight: "calc(100vh - 120px)" }}>
            {fetchError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Hiba történt az adatok betöltése során:{" "}
                {fetchError.message || "Ismeretlen hiba"}
              </Alert>
            )}

            {!selectedSchool && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Nincs iskola kiválasztva - az összes iskola adatait összegzi a
                rendszer.
              </Alert>
            )}

            {isModified && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Mentetlen módosítások vannak. Ne felejtsd el menteni a
                változtatásokat!
              </Alert>
            )}

            {/* Action Buttons */}
            <Stack direction="row" spacing={2} sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mb: 3, ml: 2 }}>
              <ExportDOMTableToExcel
                tableId=".MuiTable-root"
                fileName="elhelyezkedesi_mutato"
              />
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveData}
                disabled={!isModified || isSaving || isAdding || isUpdating}
              >
                {isSaving || isAdding || isUpdating ? "Mentés..." : "Mentés"}
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
                onClick={handleResetData}
                disabled={
                  !isModified ||
                  !savedData ||
                  isSaving ||
                  isAdding ||
                  isUpdating
                }
              >
                Visszaállítás
              </Button>
            </Stack>

            {categories.length === 0 ? (
              <Alert severity="warning" sx={{ m: 2 }}>
                Nincsenek megjeleníthető kategóriák. Kérjük válasszon intézményt
                vagy rendeljen hozzá szakmákat az intézményekhez.
              </Alert>
            ) : (
              <TableContainer
                component={Paper}
                sx={{ maxWidth: "100%", overflowX: "auto" }}
              >
                <Table size="small" sx={{ minWidth: 1400 }}>
                  <TableHead>
                    {/* Top Level Headers */}
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        sx={{
                          backgroundColor: "#f5f5f5",
                          borderRight: "2px solid #e0e0e0",
                          zIndex: 3,
                        }}
                      />
                      <TableCell
                        colSpan={evszamok.length}
                        align="center"
                        sx={{
                          backgroundColor: "#fff3e0",
                          fontWeight: "bold",
                          borderRight: "2px solid #e0e0e0",
                          borderBottom: "1px solid #e0e0e0",
                        }}
                      >
                        szakmai oktatásban végzettek elhelyezkedési aránya (%)
                      </TableCell>
                      <TableCell
                        colSpan={evszamok.length}
                        align="center"
                        sx={{
                          backgroundColor: "#f0f8ff",
                          fontWeight: "bold",
                          borderRight: "2px solid #e0e0e0",
                          borderBottom: "1px solid #e0e0e0",
                        }}
                      >
                        elhelyezkedők száma (fő)
                      </TableCell>
                      <TableCell
                        colSpan={evszamok.length}
                        align="center"
                        sx={{
                          backgroundColor: "#e8f5e8",
                          fontWeight: "bold",
                          borderBottom: "1px solid #e0e0e0",
                        }}
                      >
                        szakmai oktatásban sikeresen végzettek száma (fő)
                      </TableCell>
                    </TableRow>

                    {/* Years Headers */}
                    <TableRow>
                      <TableCell
                        sx={{
                          backgroundColor: "#f5f5f5",
                          fontWeight: "bold",
                          borderBottom: "2px solid #e0e0e0",
                          minWidth: 150,
                          zIndex: 3,
                          top: 40,
                          position: "sticky",
                          left: 0,
                        }}
                      >
                        Kategória
                      </TableCell>
                      <TableCell
                        sx={{
                          backgroundColor: "#f5f5f5",
                          fontWeight: "bold",
                          borderRight: "2px solid #e0e0e0",
                          borderBottom: "2px solid #e0e0e0",
                          minWidth: 250,
                          zIndex: 3,
                          top: 40,
                          position: "sticky",
                          left: 150,
                        }}
                      >
                        Megnevezés
                      </TableCell>

                      {/* Arány years */}
                      {evszamok.map((year, i) => (
                        <TableCell
                          key={`arany-${year}`}
                          align="center"
                          sx={{
                            backgroundColor: "#fff3e0",
                            fontWeight: "bold",
                            borderBottom: "2px solid #e0e0e0",
                            borderRight:
                              i === evszamok.length - 1
                                ? "2px solid #e0e0e0"
                                : "1px solid #e0e0e0",
                            minWidth: 80,
                            top: 40,
                            position: "sticky",
                            zIndex: 2,
                          }}
                        >
                          {year}
                        </TableCell>
                      ))}

                      {/* Elhelyezkedők years */}
                      {evszamok.map((year, i) => (
                        <TableCell
                          key={`elh-${year}`}
                          align="center"
                          sx={{
                            backgroundColor: "#f0f8ff",
                            fontWeight: "bold",
                            borderBottom: "2px solid #e0e0e0",
                            borderRight:
                              i === evszamok.length - 1
                                ? "2px solid #e0e0e0"
                                : "1px solid #e0e0e0",
                            minWidth: 80,
                            top: 40,
                            position: "sticky",
                            zIndex: 2,
                          }}
                        >
                          {year}
                        </TableCell>
                      ))}

                      {/* Végzettek years */}
                      {evszamok.map((year, i) => (
                        <TableCell
                          key={`veg-${year}`}
                          align="center"
                          sx={{
                            backgroundColor: "#e8f5e8",
                            fontWeight: "bold",
                            borderBottom: "2px solid #e0e0e0",
                            borderRight:
                              i === evszamok.length - 1
                                ? "none"
                                : "1px solid #e0e0e0",
                            minWidth: 80,
                            top: 40,
                            position: "sticky",
                            zIndex: 2,
                          }}
                        >
                          {year}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {categories.map((cat, i) => (
                      <React.Fragment key={i}>
                        {/* Total / InstType Row */}
                        <TableRow
                          hover
                          sx={{
                            backgroundColor: cat.isTotal
                              ? "#f0f8ff"
                              : "#fff3e0",
                          }}
                        >
                          <TableCell
                            sx={{
                              fontWeight: "bold",
                              borderRight: "1px solid #e0e0e0",
                              borderBottom: cat.isTotal
                                ? "2px solid #f0f8ff"
                                : "1px solid #e0e0e0",
                              position: "sticky",
                              left: 0,
                              backgroundColor: "inherit",
                              zIndex: 1,
                            }}
                          >
                            {formatHuNum(cat.titleCol1)}
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: "bold",
                              borderRight: "2px solid #e0e0e0",
                              borderBottom: cat.isTotal
                                ? "2px solid #f0f8ff"
                                : "1px solid #e0e0e0",
                              position: "sticky",
                              left: 150,
                              backgroundColor: "inherit",
                              zIndex: 1,
                            }}
                          >
                            {formatHuNum(cat.titleCol2)}
                          </TableCell>

                          {/* Arány */}
                          {evszamok.map((year, idx) => (
                            <TableCell
                              key={`cat-arany-${year}`}
                              align="center"
                              sx={{
                                fontWeight: "bold",
                                color: "primary.main",
                                borderRight:
                                  idx === evszamok.length - 1
                                    ? "2px solid #e0e0e0"
                                    : "1px solid #e0e0e0",
                                borderBottom: cat.isTotal
                                  ? "2px solid #f0f8ff"
                                  : "1px solid #e0e0e0",
                              }}
                            >
                              {formatHuNum(calculateTotalArany(cat, year))}
                            </TableCell>
                          ))}

                          {/* Elhelyezkedők */}
                          {evszamok.map((year, idx) => (
                            <TableCell
                              key={`cat-elh-${year}`}
                              align="center"
                              sx={{
                                fontWeight: "bold",
                                borderRight:
                                  idx === evszamok.length - 1
                                    ? "2px solid #e0e0e0"
                                    : "1px solid #e0e0e0",
                                borderBottom: cat.isTotal
                                  ? "2px solid #f0f8ff"
                                  : "1px solid #e0e0e0",
                              }}
                            >
                              {formatHuNum(calculateTotalElhelyezkedok(cat, year))}
                            </TableCell>
                          ))}

                          {/* Végzettek */}
                          {evszamok.map((year, idx) => (
                            <TableCell
                              key={`cat-veg-${year}`}
                              align="center"
                              sx={{
                                fontWeight: "bold",
                                borderRight:
                                  idx === evszamok.length - 1
                                    ? "none"
                                    : "1px solid #e0e0e0",
                                borderBottom: cat.isTotal
                                  ? "2px solid #f0f8ff"
                                  : "1px solid #e0e0e0",
                              }}
                            >
                              {formatHuNum(calculateTotalVegzettek(cat, year))}
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* Szakma rows for non-total categories */}
                        {!cat.isTotal &&
                          cat.subTypes.map((key) => (
                            <TableRow hover key={key}>
                              <TableCell
                                sx={{
                                  borderRight: "1px solid #e0e0e0",
                                  position: "sticky",
                                  left: 0,
                                  backgroundColor: "#fff",
                                  zIndex: 1,
                                }}
                              >
                                szakmánként
                              </TableCell>
                              <TableCell
                                sx={{
                                  borderRight: "2px solid #e0e0e0",
                                  position: "sticky",
                                  left: 150,
                                  backgroundColor: "#fff",
                                  zIndex: 1,
                                }}
                              >
                                {formatHuNum(programMap[key].szakma_nev)}
                              </TableCell>

                              {/* Arány */}
                              {evszamok.map((year, idx) => (
                                <TableCell
                                  key={`row-arany-${year}`}
                                  align="center"
                                  sx={{
                                    borderRight:
                                      idx === evszamok.length - 1
                                        ? "2px solid #e0e0e0"
                                        : "1px solid #e0e0e0",
                                  }}
                                >
                                  {formatHuNum(calculateRowArany(key, year))}
                                </TableCell>
                              ))}

                              {/* Elhelyezkedők Input */}
                              {evszamok.map((year, idx) => {
                                const startYear = parseInt(
                                  year.split("/")[0],
                                  10,
                                );
                                return (
                                  <TableCell
                                    key={`row-elh-${year}`}
                                    align="center"
                                    sx={{
                                      backgroundColor: "#f0f8ff20",
                                      borderRight:
                                        idx === evszamok.length - 1
                                          ? "2px solid #e0e0e0"
                                          : "1px solid #e0e0e0",
                                      p: 0.5,
                                    }}
                                  >
                                    <ZeroHidingTextField
                                      size="small"
                                      value={tableData[key]?.[startYear]
                                        ?.elhelyezkedok_szama || 0}
                                      onChange={(e) =>
                                        handleDataChange(
                                          key,
                                          startYear,
                                          "elhelyezkedok_szama",
                                          e.target.value,
                                        )
                                      }
                                      inputProps={{
                                        min: 0,
                                        style: {
                                          textAlign: "center",
                                          padding: "4px",
                                        },
                                      }}
                                      sx={{
                                        width: "60px",
                                        backgroundColor: "#fff",
                                      }}
                                      placeholder="0" />
                                  </TableCell>
                                );
                              })}

                              {/* Végzettek Input */}
                              {evszamok.map((year, idx) => {
                                const startYear = parseInt(
                                  year.split("/")[0],
                                  10,
                                );
                                return (
                                  <TableCell
                                    key={`row-veg-${year}`}
                                    align="center"
                                    sx={{
                                      backgroundColor: "#e8f5e820",
                                      borderRight:
                                        idx === evszamok.length - 1
                                          ? "none"
                                          : "1px solid #e0e0e0",
                                      p: 0.5,
                                    }}
                                  >
                                    <ZeroHidingTextField
                                      size="small"
                                      value={tableData[key]?.[startYear]
                                        ?.szakmai_okatatasban_sikeresen_vegzettek_szama || 0}
                                      onChange={(e) =>
                                        handleDataChange(
                                          key,
                                          startYear,
                                          "szakmai_okatatasban_sikeresen_vegzettek_szama",
                                          e.target.value,
                                        )
                                      }
                                      inputProps={{
                                        min: 0,
                                        style: {
                                          textAlign: "center",
                                          padding: "4px",
                                        },
                                      }}
                                      sx={{
                                        width: "60px",
                                        backgroundColor: "#fff",
                                      }}
                                      placeholder="0" />
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Snackbar
              open={snackbarOpen}
              autoHideDuration={6000}
              onClose={handleSnackbarClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
              <Alert
                onClose={handleSnackbarClose}
                severity={snackbarSeverity}
                variant="filled"
              >
                {snackbarMessage}
              </Alert>
            </Snackbar>
          </Box>
        </Fade>

        <HistoryDialog
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          alapadatokId={selectedSchool?.id}
          tableName="elhelyezkedes"
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
