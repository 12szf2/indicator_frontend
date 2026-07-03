import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import { useEffect, useMemo, useState } from "react";
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
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  getCurrentSchoolYear,
  generateSchoolYears,
} from "../../../utils/schoolYears";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoIntezményiNevelesiMutatok from "./info_intezmenyi_nevelesi_mutatok";
import TitleIntezményiNevelesiMutatok from "./title_intezmenyi_nevelesi_mutatok";
import { useSelector } from "react-redux";
import { selectSelectedSchool } from "../../../store/slices/authSlice";

import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import {
  useGetIntezmenyiNeveltsegiMutatokByYearQuery,
  useGetTanugyiAdatokQuery,
  useBulkSaveIntezmenyiNeveltsegMutation,
} from "../../../store/api/apiSlice";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

const categories = [
  {
    name: "dicséret",
    subcategories: [
      "Összesen",
      "Oktatói",
      "Osztályfőnöki",
      "Igazgatói",
      "Oktató testületi",
    ],
  },
  {
    name: "büntetés",
    subcategories: [
      "Összesen",
      "Oktatói figyelmeztetés",
      "Osztályfőnöki figyelmeztetés",
      "Osztályfőnöki intés",
      "Osztályfőnöki megrovás",
      "Igazgatói figyelmeztetés",
      "Igazgatói intés",
      "Igazgatói megrovás",
      "Oktató testületi figyelmeztetés",
      "Fegyelmi eljárás",
    ],
  },
];

const apiFieldMap = {
  igazolatlanOra: "igazolatlan_ora",
  dicséret: {
    Összesen: "dicseret_osszesen",
    Oktatói: "dicseret_oktatoi",
    Osztályfőnöki: "dicseret_osztalyfonoki",
    Igazgatói: "dicseret_igazgatoi",
    "Oktató testületi": "dicseret_oktato_testuleti",
  },
  büntetés: {
    Összesen: "buntetes_osszesen",
    "Oktatói figyelmeztetés": "buntetes_oktatoi_figyelmeztetes",
    "Osztályfőnöki figyelmeztetés": "buntetes_osztalyfonoki_figyelmeztetes",
    "Osztályfőnöki intés": "buntetes_osztalyfonoki_intes",
    "Osztályfőnöki megrovás": "buntetes_osztalyfonoki_megrovas",
    "Igazgatói figyelmeztetés": "buntetes_igazgatoi_figyelmeztetes",
    "Igazgatói intés": "buntetes_igazgatoi_intes",
    "Igazgatói megrovás": "buntetes_igazgatoi_megrovas",
    "Oktató testületi figyelmeztetés":
      "buntetes_oktato_testuleti_figyelmeztetes",
    "Fegyelmi eljárás": "buntetes_fegyelmi_eljaras",
  },
};

const getRecordClassLabel = (record) =>
  normalizeClassLabel(record?.osztaly_jele || record?.osztaly || "");

const normalizeClassLabel = (label) =>
  String(label || "")
    .replace(/\s+/g, " ")
    .trim();

const parseClassLabel = (label) => {
  const normalized = normalizeClassLabel(label);

  const regularMatch = normalized.match(/^(\d+)\.\s*(.+)$/);
  if (regularMatch) {
    return {
      kind: "regular",
      year: Number(regularMatch[1]),
      section: regularMatch[2],
    };
  }

  const fractionMatch = normalized.match(/^(\d+)\/(\d+)\.\s*(.+)$/);
  if (fractionMatch) {
    return {
      kind: "fraction",
      year: Number(fractionMatch[2]),
      stage: Number(fractionMatch[1]),
      section: fractionMatch[3],
    };
  }

  return { kind: "other", raw: normalized };
};

const compareClasses = (a, b) => {
  const parsedA = parseClassLabel(a);
  const parsedB = parseClassLabel(b);

  const kindOrder = { regular: 0, fraction: 1, other: 2 };
  if (kindOrder[parsedA.kind] !== kindOrder[parsedB.kind]) {
    return kindOrder[parsedA.kind] - kindOrder[parsedB.kind];
  }

  if (parsedA.kind === "regular") {
    if (parsedA.year !== parsedB.year) {
      return parsedA.year - parsedB.year;
    }
    return parsedA.section.localeCompare(parsedB.section, "hu", {
      numeric: true,
      sensitivity: "base",
    });
  }

  if (parsedA.kind === "fraction") {
    if (parsedA.year !== parsedB.year) {
      return parsedA.year - parsedB.year;
    }
    if (parsedA.stage !== parsedB.stage) {
      return parsedA.stage - parsedB.stage;
    }
    return parsedA.section.localeCompare(parsedB.section, "hu", {
      numeric: true,
      sensitivity: "base",
    });
  }

  return parsedA.raw.localeCompare(parsedB.raw, "hu", {
    numeric: true,
    sensitivity: "base",
  });
};

const toNonNegativeInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const normalizeInputValue = (value) => {
  if (value === "") {
    return "";
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return "0";
  }

  return String(parsed);
};

const createEmptyRow = () => {
  const row = {
    igazolatlanOra: "0",
  };

  categories.forEach((category) => {
    row[category.name] = {};
    category.subcategories.forEach((subcategory) => {
      row[category.name][subcategory] = "0";
    });
  });

  return row;
};

const getCategoryTotal = (row, categoryName) => {
  const category = categories.find((item) => item.name === categoryName);
  if (!category) {
    return 0;
  }

  return category.subcategories
    .filter((subcategory) => subcategory !== "Összesen")
    .reduce(
      (sum, subcategory) =>
        sum + toNonNegativeInt(row?.[categoryName]?.[subcategory]),
      0,
    );
};

const getFromApiRecord = (record, key) => {
  if (!record || !key) {
    return 0;
  }

  const directValue = record[key];
  if (directValue !== undefined && directValue !== null) {
    return toNonNegativeInt(directValue);
  }

  const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
  const camelValue = record[camelKey];
  if (camelValue !== undefined && camelValue !== null) {
    return toNonNegativeInt(camelValue);
  }

  return 0;
};

const mapApiRecordToRow = (record) => {
  const row = createEmptyRow();
  row.igazolatlanOra = String(
    getFromApiRecord(record, apiFieldMap.igazolatlanOra),
  );

  categories.forEach((category) => {
    category.subcategories.forEach((subcategory) => {
      const apiKey = apiFieldMap[category.name]?.[subcategory];
      row[category.name][subcategory] = String(
        getFromApiRecord(record, apiKey),
      );
    });
  });

  if (record?.id) {
    row._recordId = record.id;
  }

  return row;
};

const hasAnyRowData = (row) => {
  if (!row) {
    return false;
  }

  if (toNonNegativeInt(row.igazolatlanOra) > 0) {
    return true;
  }

  return categories.some((category) =>
    category.subcategories.some(
      (subcategory) =>
        subcategory !== "Összesen" &&
        toNonNegativeInt(row[category.name]?.[subcategory]) > 0,
    ),
  );
};

const schoolYears = generateSchoolYears();

export default function IntezményiNevelesiMutatok() {
  const selectedSchool = useSelector(selectSelectedSchool);
  const [selectedYear, setSelectedYear] = useState(getCurrentSchoolYear());
  const [historyOpen, setHistoryOpen] = useState(false);
  const currentSchoolYearStart = Number.parseInt(
    selectedYear.split("/")[0],
    10,
  );

  const {
    data: intezmenyiNeveltsegiMutatokData,
    refetch,
    isLoading: isLoadingNeveltsegi,
    isFetching: isRefreshing,
  } = useGetIntezmenyiNeveltsegiMutatokByYearQuery(
    {
      alapadatok_id: selectedSchool?.id,
      tanev: currentSchoolYearStart,
    },
    {
      skip: !selectedSchool?.id,
    },
  );

  const [bulkSaveIntezmenyiNeveltseg, { isLoading: isSaving }] =
    useBulkSaveIntezmenyiNeveltsegMutation();

  const {
    data: tanugyiData,
    isLoading: isLoadingTanugyi,
    isFetching: isFetchingTanugyi,
  } = useGetTanugyiAdatokQuery({
    alapadatok_id: selectedSchool?.id,
    ev: currentSchoolYearStart,
  });

  const [classes, setClasses] = useState([]);
  const [classRows, setClassRows] = useState({});
  const [savedData, setSavedData] = useState(null);
  const [isModified, setIsModified] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);


  const hasHydratedRows =
    classes.length === 0 || Object.keys(classRows).length === classes.length;
  const isInitialLoading =
    Boolean(selectedSchool?.id) &&
    !isSaving &&
    (isLoadingTanugyi ||
      isLoadingNeveltsegi ||
      isFetchingTanugyi ||
      isRefreshing ||
      !hasHydratedRows);

  useEffect(() => {
    const classList = new Set();
    if (tanugyiData) {
      tanugyiData.forEach((item) => {
        if (item.osztaly) {
          classList.add(normalizeClassLabel(item.osztaly));
        }
      });
      setClasses(Array.from(classList).sort(compareClasses));
    }
  }, [tanugyiData]);

  useEffect(() => {
    if (!classes.length) {
      setClassRows({});
      setSavedData({});
      setIsModified(false);
      return;
    }

    const apiRows = Array.isArray(intezmenyiNeveltsegiMutatokData)
      ? intezmenyiNeveltsegiMutatokData
      : [];

    const nextRows = {};
    classes.forEach((className) => {
      const existingRecord = apiRows.find(
        (item) => getRecordClassLabel(item) === className,
      );
      nextRows[className] = mapApiRecordToRow(existingRecord);
    });

    setClassRows(nextRows);
    setSavedData(JSON.parse(JSON.stringify(nextRows)));
    setIsModified(false);
  }, [classes, intezmenyiNeveltsegiMutatokData]);

  const summaryData = useMemo(() => {
    const summary = createEmptyRow();

    classes.forEach((className) => {
      const row = classRows[className];
      if (!row) {
        return;
      }

      summary.igazolatlanOra = String(
        toNonNegativeInt(summary.igazolatlanOra) +
        toNonNegativeInt(row.igazolatlanOra),
      );

      categories.forEach((category) => {
        category.subcategories.forEach((subcategory) => {
          if (subcategory === "Összesen") {
            return;
          }

          const currentValue = toNonNegativeInt(
            summary[category.name][subcategory],
          );
          const rowValue = toNonNegativeInt(row[category.name]?.[subcategory]);
          summary[category.name][subcategory] = String(currentValue + rowValue);
        });

        summary[category.name]["Összesen"] = String(
          getCategoryTotal(summary, category.name),
        );
      });
    });

    return summary;
  }, [classRows, classes]);

  const handleIgazolatlanChange = (className, value) => {
    const normalizedValue = normalizeInputValue(value);
    setClassRows((prev) => ({
      ...prev,
      [className]: {
        ...prev[className],
        igazolatlanOra: normalizedValue === "" ? "0" : normalizedValue,
      },
    }));
    setStatusMessage(null);
    setIsModified(true);
  };

  const handleDataChange = (className, category, subcategory, value) => {
    const normalizedValue = normalizeInputValue(value);
    setClassRows((prev) => ({
      ...prev,
      [className]: {
        ...prev[className],
        [category]: {
          ...prev[className]?.[category],
          [subcategory]: normalizedValue === "" ? "0" : normalizedValue,
        },
      },
    }));
    setStatusMessage(null);
    setIsModified(true);
  };

  const handleSave = async () => {
    if (!selectedSchool?.id) {
      setStatusMessage({
        severity: "error",
        text: "Nincs kiválasztott intézmény, a mentés nem indítható.",
      });
      return;
    }

    const apiRows = Array.isArray(intezmenyiNeveltsegiMutatokData)
      ? intezmenyiNeveltsegiMutatokData
      : [];

    const rowsToSave = classes.filter((className) => {
      const currentRow = classRows[className];
      const initialRow = savedData?.[className];
      const existingRecord = apiRows.find(
        (item) => getRecordClassLabel(item) === className,
      );

      const currentHasData = hasAnyRowData(currentRow);
      const initialHasData = hasAnyRowData(initialRow);
      const hasExistingRecord = Boolean(
        currentRow?._recordId || initialRow?._recordId || existingRecord?.id,
      );

      if (currentHasData) {
        return true;
      }

      // Existing rows that originally had data must be updatable to all zeros.
      if (hasExistingRecord && initialHasData) {
        return true;
      }

      // Skip all-zero rows only when they were originally all zero.
      return false;
    });

    if (rowsToSave.length === 0) {
      setStatusMessage({
        severity: "info",
        text: "Nincs mentendő változás. Az eleve 0-s sorok nem kerülnek mentésre.",
      });
      return;
    }

    try {
      const recordsToSave = rowsToSave.map((className) => {
        const row = classRows[className];
        const payload = {
          alapadatok_id: selectedSchool.id,
          tanev: currentSchoolYearStart,
          tanev_kezdete: currentSchoolYearStart,
          osztaly_jele: className,
          [apiFieldMap.igazolatlanOra]: toNonNegativeInt(row?.igazolatlanOra),
        };

        categories.forEach((category) => {
          category.subcategories.forEach((subcategory) => {
            // Az "Összesen" mezők csak frontend-összesítők, nincs DB mezőjük
            if (subcategory === "Összesen") return;
            const apiKey = apiFieldMap[category.name][subcategory];
            payload[apiKey] = toNonNegativeInt(
              row?.[category.name]?.[subcategory],
            );
          });
        });

        const existingRecord = apiRows.find(
          (item) => getRecordClassLabel(item) === className,
        );
        const recordId = row?._recordId || existingRecord?.id;

        if (recordId) {
          payload.id = recordId;
        }

        return payload;
      });

      await bulkSaveIntezmenyiNeveltseg(recordsToSave).unwrap();

      await refetch();
      setSavedData(JSON.parse(JSON.stringify(classRows)));
      setIsModified(false);
      setStatusMessage({
        severity: "success",
        text: "Az adatok sikeresen mentve!",
      });
    } catch (error) {
      console.error("Hiba a nevelési mutatók mentésekor:", error);
      setStatusMessage({
        severity: "error",
        text: "Hiba történt a mentés során. Kérjük, próbáld újra.",
      });
    }
  };

  const handleReset = () => {
    if (savedData) {
      setClassRows(JSON.parse(JSON.stringify(savedData)));
      setIsModified(false);
      setStatusMessage(null);
    }
  };

  return (
    <PageWrapper
      titleContent={<TitleIntezményiNevelesiMutatok />}
      infoContent={<InfoIntezményiNevelesiMutatok />}
    >
      <Box>
        <LockStatusIndicator tableName="intezmenyi_nevelesi_mutatok" />
        <PageLoadingOverlay isLoading={isRefreshing || isFetchingTanugyi} />

        {isInitialLoading && (
          <Card sx={{ mt: 2, mb: 3 }}>
            <CardContent>
              <Box
                sx={{
                  minHeight: 420,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                }}
              >
                <CircularProgress />
                <Typography variant="body1" color="text.secondary">
                  Adatok betöltése folyamatban...
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {!isInitialLoading && (
          <>
            {/* Instructions Card */}

            {isModified && (
              <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                Mentetlen módosítások vannak. Ne felejtsd el menteni a
                változtatásokat!
              </Alert>
            )}

            {statusMessage && (
              <Alert severity={statusMessage.severity} sx={{ mt: 2, mb: 2 }}>
                {statusMessage.text}
              </Alert>
            )}

            {savedData && !isModified && !statusMessage && (
              <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                Az adatok sikeresen mentve!
              </Alert>
            )}
            <Card sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mb: 3, p: 2 }}>
              <ExportDOMTableToExcel
                tableId=".MuiTable-root"
                fileName="export_adatok"
              />
              <LockedTableWrapper tableName="intezmenyi_nevelesi_mutatok">
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={!isModified || isSaving || isRefreshing}
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
                  disabled={!isModified || !savedData || isSaving}
                >
                  Visszaállítás
                </Button>
              </LockedTableWrapper>
            </Card>

            {/* Status Messages */}

            {/* Main Data Table */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box
                  sx={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 3,
                  }}
                >
                  <FormControl
                    size="small"
                    sx={{ position: "absolute", left: 0, minWidth: 140 }}
                  >
                    <Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                      {schoolYears.map((year) => (
                        <MenuItem key={year} value={year}>
                          {year}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography
                    variant="h6"
                    component="h2"
                    sx={{
                      color: "#1976d2",
                      fontWeight: "bold",
                      textAlign: "center",
                    }}
                  >
                    {selectedYear} (db)
                  </Typography>
                </Box>

                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ overflowX: "auto" }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "#f0f8ff" }}>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            minWidth: 150,
                            textAlign: "center",
                            backgroundColor: "#f0f8ff",
                          }}
                        >
                          Osztály jele
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            minWidth: 120,
                            textAlign: "center",
                            backgroundColor: "#ffcdd2",
                          }}
                        >
                          Igazolatlan óra
                        </TableCell>
                        {categories.map((category) => (
                          <TableCell
                            key={category.name}
                            colSpan={category.subcategories.length}
                            sx={{
                              fontWeight: "bold",
                              textAlign: "center",
                              backgroundColor:
                                category.name === "dicséret"
                                  ? "#e8f5e8"
                                  : "#ffcdd2",
                              color:
                                category.name === "dicséret"
                                  ? "#2e7d32"
                                  : "#d32f2f",
                            }}
                          >
                            {category.name}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                        <TableCell
                          sx={{ backgroundColor: "#f0f8ff" }}
                        ></TableCell>
                        <TableCell
                          sx={{ backgroundColor: "#ffcdd2" }}
                        ></TableCell>
                        {categories.map((category) =>
                          category.subcategories.map((subcategory) => (
                            <TableCell
                              key={`${category.name}-${subcategory}`}
                              sx={{
                                fontWeight: "bold",
                                fontSize: "0.7rem",
                                textAlign: "center",
                                minWidth: 80,
                                backgroundColor:
                                  category.name === "dicséret"
                                    ? "#e8f5e8"
                                    : "#fff3e0",

                                whiteSpace: "nowrap",
                                height: "80px",
                                verticalAlign: "bottom",
                              }}
                            >
                              <Box sx={{ mt: 2 }}>{subcategory}</Box>
                            </TableCell>
                          )),
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Dynamically render one row per class */}
                      {classes.map((className, index) => (
                        <TableRow
                          key={`${className}-${index}`}
                          sx={{ backgroundColor: "#f5f5f5" }}
                        >
                          <TableCell
                            sx={{ textAlign: "center", color: "#666" }}
                          >
                            {className}
                          </TableCell>
                          <TableCell align="center">
                            <ZeroHidingTextField
                              type="number"
                              value={classRows[className]?.igazolatlanOra || 0}
                              onChange={(e) =>
                                handleIgazolatlanChange(
                                  className,
                                  e.target.value,
                                )
                              }
                              size="small"
                              inputProps={{
                                min: 0,
                                style: { textAlign: "center" },
                              }}
                              sx={{ width: "60px" }}
                              disabled={isSaving}
                              placeholder="0" />
                          </TableCell>
                          {categories.map((category) =>
                            category.subcategories.map((subcategory) => {
                              const isTotalCell = subcategory === "Összesen";
                              return (
                                <TableCell
                                  key={`${category.name}-${subcategory}-${index}`}
                                  align="center"
                                >
                                  <ZeroHidingTextField
                                    type="number"
                                    value={isTotalCell
                                      ? String(
                                        getCategoryTotal(
                                          classRows[className],
                                          category.name,
                                        ),
                                      )
                                      : classRows[className]?.[
                                      category.name
                                      ]?.[subcategory] || 0}
                                    onChange={
                                      isTotalCell
                                        ? undefined
                                        : (e) =>
                                          handleDataChange(
                                            className,
                                            category.name,
                                            subcategory,
                                            e.target.value,
                                          )
                                    }
                                    size="small"
                                    inputProps={{
                                      min: 0,
                                      style: { textAlign: "center" },
                                    }}
                                    sx={{ width: "60px" }}
                                    disabled={isSaving || isTotalCell}
                                    placeholder="0" />
                                </TableCell>
                              );
                            }),
                          )}
                        </TableRow>
                      ))}

                      {/* Summary Row */}
                      <TableRow
                        sx={{ backgroundColor: "#fff3e0", fontWeight: "bold" }}
                      >
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            textAlign: "center",
                            backgroundColor: "#fff3e0",
                          }}
                        >
                          összesen
                        </TableCell>
                        <TableCell align="center">
                          <ZeroHidingTextField

                            value={summaryData.igazolatlanOra || 0}
                            size="small"
                            inputProps={{
                              min: 0,
                              style: {
                                textAlign: "center",
                                fontWeight: "bold",
                              },
                            }}
                            sx={{ width: "60px" }}
                            disabled
                            placeholder="0" />
                        </TableCell>
                        {categories.map((category) =>
                          category.subcategories.map((subcategory) => (
                            <TableCell
                              key={`${category.name}-${subcategory}-summary`}
                              align="center"
                            >
                              <ZeroHidingTextField

                                value={summaryData[category.name]?.[subcategory] || 0}
                                size="small"
                                inputProps={{
                                  min: 0,
                                  style: {
                                    textAlign: "center",
                                    fontWeight: "bold",
                                  },
                                }}
                                sx={{ width: "60px" }}
                                disabled
                                placeholder="0" />
                            </TableCell>
                          )),
                        )}
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </>
        )}
      </Box>

      <HistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        alapadatokId={selectedSchool?.id}
        tableName="IntezmenyiNeveltsegiMutatok"
        onRollbackSuccess={() => {
          setStatusMessage({
            severity: "success",
            text: "Sikeres visszaállítás az előzményekből!",
          });
        }}
      />
    </PageWrapper>
  );
}
