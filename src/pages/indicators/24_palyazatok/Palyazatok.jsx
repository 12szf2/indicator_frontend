import { formatHuNum } from "../../../utils/formatters";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import {
  useGetPalyazatokQuery,
  useAddPalyazatokMutation,
  useUpdatePalyazatokMutation,
  useDeletePalyazatokMutation,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Snackbar,
  Card,
  CardContent,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { generateSchoolYears } from "../../../utils/schoolYears";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoPalyazatok from "./info_palyazatok";
import TitlePalyazatok from "./title_palyazatok";
import ExportToExcel from "../../../components/ExportToExcel";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

const formatMoney = (val) => {
  if (val === undefined || val === null) return "0";
  const numStr = val.toString().replace(/\D/g, "");
  if (!numStr) return "";
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export default function Palyazatok() {
  const palyazatCategories = [
    "Szakmai fejlesztést támogató pályázatok",
    "Infrastrukturális fejlesztést támogató",
    "Energetikai megújulást, zöldátállást támogató",
    "Digitális fejlesztést támogató pályázatok",
    "Konzorciumi partnerként megvalósuló pályázat",
    "Kiemelt projekt intézményi megvalósulása",
    "Egyéb",
  ];

  const defaultPalyazatok = {
    "Szakmai fejlesztést támogató pályázatok": [
      "Apáczai",
      "Erasmus-tanulói",
      "Erasmus-oktatói",
      "NTP",
      "Határon átnyúló-nemzeti",
      "Hazai forrásból",
      "EU forrásból",
    ],
    "Infrastrukturális fejlesztést támogató": [
      "Hazai forrásból",
      "EU forrásból",
    ],
    "Energetikai megújulást, zöldátállást támogató": [
      "Hazai forrásból",
      "EU forrásból",
    ],
    "Digitális fejlesztést támogató pályázatok": [
      "Hazai forrásból",
      "EU forrásból",
    ],
    "Konzorciumi partnerként megvalósuló pályázat": [
      "Hazai forrásból",
      "EU forrásból",
    ],
    "Kiemelt projekt intézményi megvalósulása": ["NSZFH", "IKK", "Egyéb"],
    Egyéb: ["Egyéb"],
  };

  const schoolYears = useMemo(() => generateSchoolYears(), []);
  const metrics = [
    { key: "beadott_db", label: "beadott (db)", color: "#f5f5f5" },
    { key: "elnyert_db", label: "elnyert (db)", color: "#ffcdd2" },
    { key: "osszeg_ft", label: "összeg (Ft)", color: "#ffffff" },
    { key: "erintett", label: "érintett", color: "#f5f5f5" },
  ];

  const createInitialData = () => ({});

  const selectedSchool = useSelector(selectSelectedSchool);
  const [palyazatokData, setPalyazatokData] = useState(createInitialData());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [originalData, setOriginalData] = useState(createInitialData());
  const [allIdsMap, setAllIdsMap] = useState({});
  const [eloiranyzatData, setEloiranyzatData] = useState({});
  const [originalEloiranyzatData, setOriginalEloiranyzatData] = useState({});

  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [palyazatToDelete, setPalyazatToDelete] = useState(null);

  // States for "Add Dialog"
  const [newPalyazatCategory, setNewPalyazatCategory] = useState("");
  const [newPalyazatSelectionType, setNewPalyazatSelectionType] =
    useState("existing");
  const [newPalyazatName, setNewPalyazatName] = useState("");
  const [customPalyazatName, setCustomPalyazatName] = useState("");

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const {
    data: palyazatokDbDataRaw,
    isLoading,
    isFetching,
  } = useGetPalyazatokQuery(
    { alapadatokId: selectedSchool?.id },
    { skip: !selectedSchool },
  );

  const palyazatokDbData = useMemo(
    () => palyazatokDbDataRaw || [],
    [palyazatokDbDataRaw],
  );

  const [addPalyazatok] = useAddPalyazatokMutation();
  const [updatePalyazatok] = useUpdatePalyazatokMutation();
  const [deletePalyazatok] = useDeletePalyazatokMutation();

  const categoryOrderMap = useMemo(() => {
    const orderMap = {};
    palyazatCategories.forEach((category, index) => {
      orderMap[category] = index;
    });
    return orderMap;
  }, []);

  useEffect(() => {
    if (palyazatokDbData && !isFetching) {
      const newData = createInitialData();
      const origData = createInitialData();
      const newEloiranyzat = {};
      const origEloiranyzat = {};
      const idsMap = {};

      if (Array.isArray(palyazatokDbData)) {
        palyazatokDbData.forEach((item) => {
          const category = item.kategoria || "Egyéb";
          const name = item.palyazat_neve || "Ismeretlen";
          const yearRange = `${item.tanev_kezdete}/${item.tanev_kezdete + 1}`;

          if (category === "Költségvetés" && name === "Előirányzat") {
            if (!newEloiranyzat[yearRange]) newEloiranyzat[yearRange] = {};
            if (!origEloiranyzat[yearRange]) origEloiranyzat[yearRange] = {};

            const dataObj = {
              id: item.id,
              osszeg_ft: item.osszeg_ft?.toString() || "0",
            };
            newEloiranyzat[yearRange] = { ...dataObj };
            origEloiranyzat[yearRange] = { ...dataObj };
            return;
          }

          // Collect all IDs for this key (handles duplicates)
          const mapKey = `${category}::${name}`;
          if (!idsMap[mapKey]) idsMap[mapKey] = [];
          if (item.id) idsMap[mapKey].push(item.id);

          if (!newData[category]) newData[category] = {};
          if (!newData[category][name]) {
            newData[category][name] = {};
            schoolYears.forEach((year) => {
              newData[category][name][year] = {
                beadott_db: "0",
                elnyert_db: "0",
                osszeg_ft: "0",
                erintett: "0",
              };
            });
          }

          const yearData = {
            id: item.id,
            beadott_db: item.beadott_db?.toString() || "0",
            elnyert_db: item.elnyert_db?.toString() || "0",
            osszeg_ft: item.osszeg_ft?.toString() || "0",
            erintett: item.erintett?.toString() || "0",
          };

          newData[category][name][yearRange] = { ...yearData };

          if (!origData[category]) origData[category] = {};
          if (!origData[category][name]) origData[category][name] = {};
          origData[category][name][yearRange] = { ...yearData };
        });
      }

      setPalyazatokData(newData);
      setOriginalData(origData);
      setAllIdsMap(idsMap);
      setEloiranyzatData(newEloiranyzat);
      setOriginalEloiranyzatData(origEloiranyzat);
      setIsModified(false);
    }
  }, [palyazatokDbData, isFetching, schoolYears]);

  const handleDataChange = useCallback(
    (category, name, year, metric, value) => {
      setPalyazatokData((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          [name]: {
            ...prev[category][name],
            [year]: {
              ...prev[category][name][year],
              [metric]: value,
            },
          },
        },
      }));
      setIsModified(true);
    },
    [],
  );

  const handleEloiranyzatChange = useCallback((year, value) => {
    setEloiranyzatData((prev) => ({
      ...prev,
      [year]: {
        ...prev[year],
        osszeg_ft: value,
      },
    }));
    setIsModified(true);
  }, []);

  const handleAddPalyazat = useCallback(async () => {
    const nameToUse =
      newPalyazatSelectionType === "existing"
        ? newPalyazatName
        : customPalyazatName;
    if (!newPalyazatCategory || !nameToUse || !selectedSchool) return;

    if (palyazatokData[newPalyazatCategory] && palyazatokData[newPalyazatCategory][nameToUse]) {
      setSnackbarMessage("Ezzel a névvel már létezik pályázat ebben a kategóriában!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    try {
      const availableYears = schoolYears
        .map((year) => parseInt(year.split("/")[0], 10))
        .filter((year) => !Number.isNaN(year));
      const defaultStartYear =
        availableYears.length > 0
          ? Math.max(...availableYears)
          : new Date().getFullYear();

      const recordData = {
        alapadatok_id: selectedSchool.id,
        palyazat_neve: nameToUse,
        kategoria: newPalyazatCategory,
        tanev_kezdete: defaultStartYear,
        beadott_db: 0,
        elnyert_db: 0,
        osszeg_ft: 0,
        erintett: 0,
      };

      await addPalyazatok(recordData).unwrap();

      setOpenAddDialog(false);
      setNewPalyazatCategory("");
      setNewPalyazatName("");
      setCustomPalyazatName("");
      setNewPalyazatSelectionType("existing");
      setSnackbarMessage("Pályázat sikeresen hozzáadva!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Hiba hozzáadáskor:", error);
      setSnackbarMessage("Hiba történt a hozzáadás során!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [
    newPalyazatCategory,
    newPalyazatName,
    customPalyazatName,
    newPalyazatSelectionType,
    selectedSchool,
    addPalyazatok,
    schoolYears,
  ]);

  const handleRemovePalyazat = useCallback((category, name) => {
    setPalyazatToDelete({ category, name });
    setOpenDeleteDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!palyazatToDelete) return;

    const { category, name } = palyazatToDelete;

    try {
      // Delete all IDs associated with this key (including duplicates)
      const mapKey = `${category}::${name}`;
      const idsToDelete = allIdsMap[mapKey] || [];
      const promises = idsToDelete.map((id) => deletePalyazatok(id).unwrap());
      if (promises.length > 0) await Promise.all(promises);

      const updatedData = { ...palyazatokData };
      delete updatedData[category][name];
      setPalyazatokData(updatedData);

      const updatedOriginal = { ...originalData };
      if (updatedOriginal[category]) delete updatedOriginal[category][name];
      setOriginalData(updatedOriginal);

      const updatedIdsMap = { ...allIdsMap };
      delete updatedIdsMap[mapKey];
      setAllIdsMap(updatedIdsMap);

      setSnackbarMessage("Sikeresen törölve!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setOpenDeleteDialog(false);
      setPalyazatToDelete(null);
    } catch (error) {
      console.error("Hiba törlés közben:", error);
      setSnackbarMessage("Hiba történt a törlés során!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [
    palyazatokData,
    originalData,
    allIdsMap,
    deletePalyazatok,
    palyazatToDelete,
  ]);

  const isFieldModified = (category, name, year, metric) => {
    const orig = originalData[category]?.[name]?.[year]?.[metric] || "0";
    const curr = palyazatokData[category]?.[name]?.[year]?.[metric] || "0";
    return orig !== curr;
  };

  const isEloiranyzatModified = (year) => {
    const orig = originalEloiranyzatData[year]?.osszeg_ft || "0";
    const curr = eloiranyzatData[year]?.osszeg_ft || "0";
    return orig !== curr;
  };

  const handleSave = async () => {
    if (!selectedSchool) return;
    setIsSaving(true);
    let updatedCount = 0;
    let savedCount = 0;

    try {
      const promises = [];

      Object.keys(palyazatokData).forEach((category) => {
        Object.keys(palyazatokData[category]).forEach((name) => {
          schoolYears.forEach((year) => {
            let rowModified = false;
            const isNew = !originalData[category]?.[name];

            if (!isNew) {
              metrics.forEach((metric) => {
                if (isFieldModified(category, name, year, metric.key))
                  rowModified = true;
              });
            }

            if (rowModified) {
              const yearData = palyazatokData[category][name][year];
              const id = originalData[category]?.[name]?.[year]?.id;

              const recordData = {
                alapadatok_id: selectedSchool.id,
                tanev_kezdete: parseInt(year.split("/")[0]),
                beadott_db: parseInt(yearData.beadott_db || 0),
                elnyert_db: parseInt(yearData.elnyert_db || 0),
                osszeg_ft: parseInt(yearData.osszeg_ft || 0),
                erintett: parseInt(yearData.erintett || 0),
              };

              if (id) {
                promises.push(
                  updatePalyazatok({ id, ...recordData })
                    .unwrap()
                    .then(() => {
                      updatedCount++;
                    }),
                );
              } else {
                promises.push(
                  addPalyazatok({
                    ...recordData,
                    palyazat_neve: name,
                    kategoria: category,
                  })
                    .unwrap()
                    .then(() => {
                      savedCount++;
                    }),
                );
              }
            }
          });
        });
      });

      // Mentés Előirányzat
      schoolYears.forEach((year) => {
        if (isEloiranyzatModified(year)) {
          const val = eloiranyzatData[year]?.osszeg_ft || "0";
          const id = originalEloiranyzatData[year]?.id;
          const recordData = {
            alapadatok_id: selectedSchool.id,
            tanev_kezdete: parseInt(year.split("/")[0]),
            beadott_db: 0,
            elnyert_db: 0,
            osszeg_ft: parseInt(val || 0),
            erintett: 0,
            palyazat_neve: "Előirányzat",
            kategoria: "Költségvetés",
          };
          if (id) {
            promises.push(
              updatePalyazatok({ id, ...recordData })
                .unwrap()
                .then(() => {
                  updatedCount++;
                }),
            );
          } else {
            promises.push(
              addPalyazatok(recordData)
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
    setPalyazatokData(JSON.parse(JSON.stringify(originalData)));
    setEloiranyzatData(JSON.parse(JSON.stringify(originalEloiranyzatData)));
    setIsModified(false);
  }, [originalData, originalEloiranyzatData]);

  const totals = useMemo(() => {
    const calculatedTotals = {};
    schoolYears.forEach((year) => {
      calculatedTotals[year] = {};
      metrics.forEach((metric) => {
        let sum = 0;
        Object.keys(palyazatokData).forEach((category) => {
          Object.keys(palyazatokData[category]).forEach((name) => {
            sum += parseInt(
              palyazatokData[category][name][year]?.[metric.key] || 0,
              10,
            );
          });
        });
        calculatedTotals[year][metric.key] = sum;
      });
    });
    return calculatedTotals;
  }, [palyazatokData, schoolYears, metrics]);

  const exportRows = useMemo(() => {
    const rows = [];

    // Kategóriák rendezése
    const sortedCategories = Object.keys(palyazatokData).sort((a, b) => {
      const aOrder = categoryOrderMap[a] ?? Number.MAX_SAFE_INTEGER;
      const bOrder = categoryOrderMap[b] ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.localeCompare(b, "hu");
    });

    // Adat sorok
    sortedCategories.forEach((category) => {
      const names = Object.keys(palyazatokData[category]).sort((a, b) =>
        a.localeCompare(b, "hu"),
      );
      names.forEach((name) => {
        const row = { kategoria: category, palyazat: name };
        schoolYears.forEach((year) => {
          metrics.forEach((m) => {
            row[`${year}__${m.key}`] = Number(
              palyazatokData[category][name][year]?.[m.key] || 0,
            );
          });
        });
        rows.push(row);
      });
    });

    // Összesítő sor
    const totalRow = { kategoria: "Összes pályázat, projekt", palyazat: "" };
    schoolYears.forEach((year) => {
      metrics.forEach((m) => {
        totalRow[`${year}__${m.key}`] = Number(totals[year]?.[m.key] || 0);
      });
    });
    rows.push(totalRow);

    // Előirányzat sor
    const eloiranyzatRow = {
      kategoria: "Az iskola eredeti előirányzata (Ft)",
      palyazat: "",
    };
    schoolYears.forEach((year) => {
      metrics.forEach((m) => {
        eloiranyzatRow[`${year}__${m.key}`] =
          m.key === "osszeg_ft"
            ? Number(eloiranyzatData[year]?.osszeg_ft || 0)
            : null;
      });
    });
    rows.push(eloiranyzatRow);

    // Arány sor
    const aranyRow = {
      kategoria: "Elnyert forrás aránya az előirányzathoz (%)",
      palyazat: "",
    };
    schoolYears.forEach((year) => {
      metrics.forEach((m) => {
        if (m.key === "osszeg_ft") {
          const elnyertOsszeg = Number(totals[year]?.osszeg_ft || 0);
          const eloiranyzat = Number(eloiranyzatData[year]?.osszeg_ft || 0);
          let arany = 0;
          if (eloiranyzat > 0) {
            arany = Number(((elnyertOsszeg / eloiranyzat) * 100).toFixed(2));
          }
          aranyRow[`${year}__${m.key}`] = arany;
        } else {
          aranyRow[`${year}__${m.key}`] = null;
        }
      });
    });
    rows.push(aranyRow);

    return rows;
  }, [
    palyazatokData,
    categoryOrderMap,
    schoolYears,
    metrics,
    totals,
    eloiranyzatData,
  ]);

  if (isLoading) {
    return <PageLoadingOverlay isLoading={true} />;
  }

  return (
    <PageWrapper
      titleContent={<TitlePalyazatok />}
      infoContent={<InfoPalyazatok />}
    >
      <Box>
        <LockStatusIndicator tableName="palyazatok" />

        {!selectedSchool && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Kérjük, válasszon egy intézményt a fenti legördülő menüből az adatok
            szerkesztéséhez és megtekintéséhez.
          </Alert>
        )}

        <Stack direction="row" spacing={2} sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mb: 3 }}>
          <LockedTableWrapper tableName="palyazatok">
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setOpenAddDialog(true)}
            >
              Új pályázat hozzáadása
            </Button>
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
            fileName="palyazatok"
            sheetName="Pályázatok"
            columns={[
              { header: "Kategória", key: "kategoria", width: 40 },
              { header: "Pályázat neve", key: "palyazat", width: 40 },
              ...schoolYears.flatMap((year) =>
                metrics.map((m) => ({
                  header: `${year} – ${m.label}`,
                  key: `${year}__${m.key}`,
                  width: 20,
                })),
              ),
            ]}
            rows={exportRows}
            buttonLabel="Export Táblázatba"
          />
        </Stack>

        <TableContainer
          component={Paper}
          sx={{ maxWidth: "100%", overflowX: "auto" }}
        >
          <Table size="small" sx={{ minWidth: 1000, border: "2px solid #e0e0e0" }}>
            <TableHead>
              <TableRow>
                <TableCell
                  rowSpan={2}
                  sx={{
                    fontWeight: "bold",
                    minWidth: 300,
                    borderRight: "2px solid #e0e0e0",
                    borderBottom: "2px solid #e0e0e0",
                    backgroundColor: "#fff",
                    position: "sticky",
                    left: 0,
                    zIndex: 3,
                  }}
                >
                  Kategória / Pályázat
                </TableCell>
                {schoolYears.map((year, i) => (
                  <TableCell
                    key={`${year}-header`}
                    align="center"
                    colSpan={4}
                    sx={{
                      fontWeight: "bold",
                      backgroundColor: "#fff3e0",
                      borderBottom: "1px solid #e0e0e0",
                      borderRight:
                        i === schoolYears.length - 1
                          ? "none"
                          : "2px solid #e0e0e0",
                    }}
                  >
                    {year}
                  </TableCell>
                ))}
                <TableCell
                  rowSpan={2}
                  sx={{
                    fontWeight: "bold",
                    width: 60,
                    borderBottom: "2px solid #e0e0e0",
                    position: "sticky",
                    right: 0,
                    backgroundColor: "#f5f5f5",
                    zIndex: 3,
                    boxShadow: "-2px 0 5px -2px rgba(0,0,0,0.1)",
                  }}
                >
                  Művelet
                </TableCell>
              </TableRow>
              <TableRow>
                {schoolYears.map((year, i) => (
                  <React.Fragment key={`${year}-metric-head`}>
                    {metrics.map((m, j) => (
                      <TableCell
                        key={`head-${year}-${m.key}`}
                        align="center"
                        sx={{
                          fontWeight: 600,
                          backgroundColor: m.color,
                          borderBottom: "2px solid #e0e0e0",
                          borderRight:
                            j === metrics.length - 1 &&
                              i !== schoolYears.length - 1
                              ? "2px solid #e0e0e0"
                              : "1px solid #e0e0e0",
                          minWidth: 90,
                          fontSize: "0.8rem",
                        }}
                      >
                        {formatHuNum(m.label)}
                      </TableCell>
                    ))}
                  </React.Fragment>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.keys(palyazatokData)
                .sort((a, b) => {
                  const aOrder = categoryOrderMap[a] ?? Number.MAX_SAFE_INTEGER;
                  const bOrder = categoryOrderMap[b] ?? Number.MAX_SAFE_INTEGER;
                  if (aOrder !== bOrder) return aOrder - bOrder;
                  return a.localeCompare(b, "hu");
                })
                .map((category) => {
                  const names = Object.keys(palyazatokData[category]).sort(
                    (a, b) => a.localeCompare(b, "hu"),
                  );
                  return names.map((name, index) => (
                    <TableRow key={`${category}-${name}`} hover>
                      <TableCell
                        sx={{
                          borderRight: "2px solid #e0e0e0",
                          borderBottom: "1px solid #e0e0e0",
                          position: "sticky",
                          left: 0,
                          backgroundColor: "#fff",
                          zIndex: 1,
                        }}
                      >
                        {index === 0 && (
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: "bold", mb: 0.5 }}
                          >
                            {category}
                          </Typography>
                        )}
                        <Box sx={{ pl: 3, fontSize: "0.875rem" }}>{name}</Box>
                      </TableCell>
                      {schoolYears.map((year, i) =>
                        metrics.map((m, j) => {
                          const isMoney = m.key === "osszeg_ft";
                          const rawVal =
                            palyazatokData[category][name][year]?.[m.key] ||
                            "0";
                          const displayVal = isMoney
                            ? formatMoney(rawVal)
                            : rawVal;

                          return (
                            <TableCell
                              key={`${year}-${m.key}`}
                              align="center"
                              sx={{
                                borderBottom: "1px solid #e0e0e0",
                                borderRight:
                                  j === metrics.length - 1 &&
                                    i !== schoolYears.length - 1
                                    ? "2px solid #e0e0e0"
                                    : "1px solid #f5f5f5",
                                backgroundColor: isFieldModified(
                                  category,
                                  name,
                                  year,
                                  m.key,
                                )
                                  ? "#fff9c4"
                                  : "inherit",
                              }}
                            >
                              <ZeroHidingTextField
                                type={isMoney ? "text" : "number"}
                                value={displayVal || 0}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  if (isMoney) val = val.replace(/\s/g, "");
                                  handleDataChange(
                                    category,
                                    name,
                                    year,
                                    m.key,
                                    val,
                                  );
                                }}
                                size="small"
                                inputProps={{
                                  min: 0,
                                  style: { textAlign: "center" },
                                }}
                                sx={{ width: isMoney ? "110px" : "70px" }}
                                placeholder="0" />
                            </TableCell>
                          );
                        }),
                      )}
                      <TableCell
                        align="center"
                        sx={{
                          position: "sticky",
                          right: 0,
                          backgroundColor: "#fff",
                          boxShadow: "-2px 0 5px -2px rgba(0,0,0,0.1)",
                          zIndex: 1,
                        }}
                      >
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemovePalyazat(category, name)}
                          disabled={!selectedSchool}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ));
                })}

              {/* Összes pályázat */}
              <TableRow sx={{ backgroundColor: "#fff3e0", fontWeight: "bold" }}>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    borderRight: "2px solid #e0e0e0",
                    position: "sticky",
                    left: 0,
                    backgroundColor: "#fff3e0",
                    zIndex: 1,
                  }}
                >
                  Összes pályázat, projekt
                </TableCell>
                {schoolYears.map((year, i) =>
                  metrics.map((m, j) => {
                    const isMoney = m.key === "osszeg_ft";
                    const val = totals[year]?.[m.key] || 0;
                    return (
                      <TableCell
                        key={`total-${year}-${m.key}`}
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          borderRight:
                            j === metrics.length - 1 &&
                              i !== schoolYears.length - 1
                              ? "2px solid #e0e0e0"
                              : "1px solid #e0e0e0",
                        }}
                      >
                        {formatHuNum(isMoney ? formatMoney(val) : val)}
                      </TableCell>
                    );
                  }),
                )}
                <TableCell
                  sx={{
                    position: "sticky",
                    right: 0,
                    backgroundColor: "#fff3e0",
                    zIndex: 1,
                  }}
                ></TableCell>
              </TableRow>

              {/* Előirányzat */}
              <TableRow sx={{ backgroundColor: "#e0e0e0", fontWeight: "bold" }}>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    borderRight: "2px solid #e0e0e0",
                    position: "sticky",
                    left: 0,
                    backgroundColor: "#e0e0e0",
                    zIndex: 1,
                  }}
                >
                  Az iskola eredeti előirányzata (Ft)
                </TableCell>
                {schoolYears.map((year, i) => (
                  <React.Fragment key={`elo-${year}`}>
                    <TableCell
                      colSpan={2}
                      sx={{ backgroundColor: "gray" }}
                    ></TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        backgroundColor: isEloiranyzatModified(year)
                          ? "#fff9c4"
                          : "inherit",
                      }}
                    >
                      <ZeroHidingTextField
                        type="text"
                        value={formatMoney(
                          eloiranyzatData[year]?.osszeg_ft || "0",
                        ) || 0}
                        onChange={(e) =>
                          handleEloiranyzatChange(
                            year,
                            e.target.value.replace(/\s/g, ""),
                          )
                        }
                        size="small"
                        inputProps={{
                          min: 0,
                          style: { textAlign: "center", fontWeight: "bold" },
                        }}
                        sx={{ width: "110px" }}
                        placeholder="0" />
                    </TableCell>
                    <TableCell
                      sx={{
                        borderRight:
                          i !== schoolYears.length - 1
                            ? "2px solid #e0e0e0"
                            : "none",
                        backgroundColor: "gray",
                      }}
                    ></TableCell>
                  </React.Fragment>
                ))}
                <TableCell
                  sx={{
                    position: "sticky",
                    right: 0,
                    backgroundColor: "#e0e0e0",
                    zIndex: 1,
                  }}
                ></TableCell>
              </TableRow>

              {/* Arány */}
              <TableRow sx={{ backgroundColor: "#fff", fontWeight: "bold" }}>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    borderRight: "2px solid #e0e0e0",
                    position: "sticky",
                    left: 0,
                    backgroundColor: "#fff",
                    zIndex: 1,
                  }}
                >
                  A pályázaton elnyert forrás költségvetéshez kapcsolódó aránya
                </TableCell>
                {schoolYears.map((year, i) => {
                  const elnyertOsszeg = parseInt(
                    totals[year]?.osszeg_ft || 0,
                    10,
                  );
                  const eloiranyzat = parseInt(
                    eloiranyzatData[year]?.osszeg_ft || 0,
                    10,
                  );
                  let arany = 0;
                  if (eloiranyzat > 0) {
                    arany = ((elnyertOsszeg / eloiranyzat) * 100).toFixed(2);
                  }
                  return (
                    <React.Fragment key={`arany-${year}`}>
                      <TableCell
                        colSpan={2}
                        sx={{ backgroundColor: "#fff" }}
                      ></TableCell>
                      <TableCell
                        align="center"
                        sx={{ backgroundColor: "#fff3e0", fontWeight: "bold" }}
                      >
                        {arany} %
                      </TableCell>
                      <TableCell
                        sx={{
                          borderRight:
                            i !== schoolYears.length - 1
                              ? "2px solid #e0e0e0"
                              : "none",
                        }}
                      ></TableCell>
                    </React.Fragment>
                  );
                })}
                <TableCell
                  sx={{
                    position: "sticky",
                    right: 0,
                    backgroundColor: "#fff",
                    zIndex: 1,
                  }}
                ></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Új pályázat Dialog */}
        <Dialog
          open={openAddDialog}
          onClose={() => setOpenAddDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Új pályázat hozzáadása</DialogTitle>
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
            >
              <FormControl fullWidth>
                <InputLabel>Kategória</InputLabel>
                <Select
                  value={newPalyazatCategory}
                  onChange={(e) => {
                    setNewPalyazatCategory(e.target.value);
                    setNewPalyazatName("");
                    setNewPalyazatSelectionType("existing");
                  }}
                  label="Kategória"
                >
                  {palyazatCategories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {newPalyazatCategory && (
                <FormControl fullWidth>
                  <InputLabel>Megadás módja</InputLabel>
                  <Select
                    value={newPalyazatSelectionType}
                    onChange={(e) =>
                      setNewPalyazatSelectionType(e.target.value)
                    }
                    label="Megadás módja"
                  >
                    <MenuItem value="existing">Választás a listából</MenuItem>
                    <MenuItem value="custom">
                      Egyéni megnevezés megadása
                    </MenuItem>
                  </Select>
                </FormControl>
              )}

              {newPalyazatCategory &&
                newPalyazatSelectionType === "existing" && (
                  <FormControl fullWidth>
                    <InputLabel>Pályázat megnevezése</InputLabel>
                    <Select
                      value={newPalyazatName}
                      onChange={(e) => setNewPalyazatName(e.target.value)}
                      label="Pályázat megnevezése"
                    >
                      {defaultPalyazatok[newPalyazatCategory]?.map((name) => (
                        <MenuItem key={name} value={name}>
                          {name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

              {newPalyazatCategory && newPalyazatSelectionType === "custom" && (
                <ZeroHidingTextField
                  fullWidth
                  label="Egyéni pályázat megnevezése"
                  value={customPalyazatName || 0}
                  onChange={(e) => setCustomPalyazatName(e.target.value)}
                  placeholder="0" />
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)}>Mégse</Button>
            <Button
              variant="contained"
              onClick={handleAddPalyazat}
              disabled={
                !newPalyazatCategory ||
                (newPalyazatSelectionType === "existing" && !newPalyazatName) ||
                (newPalyazatSelectionType === "custom" && !customPalyazatName)
              }
            >
              Hozzáadás
            </Button>
          </DialogActions>
        </Dialog>

        {/* Törlés megerősítő dialog */}
        <Dialog
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
        >
          <DialogTitle>Törlés megerősítése</DialogTitle>
          <DialogContent>
            Biztosan törölni szeretné ezt a pályázatot minden tanévből?
            <br />
            <strong>{palyazatToDelete?.name}</strong>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteDialog(false)}>Mégse</Button>
            <Button
              color="error"
              variant="contained"
              onClick={handleConfirmDelete}
            >
              Törlés
            </Button>
          </DialogActions>
        </Dialog>

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
        tableName="palyazatok"
        onRollbackSuccess={() => {
          setSnackbarMessage("Sikeres visszaállítás az előzményekből!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        }}
      />
    </PageWrapper>
  );
}
