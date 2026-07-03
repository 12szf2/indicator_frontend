import React, { useState, useEffect, useMemo, useRef } from "react";
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
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import * as XLSX from "xlsx";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoNszfhMeresek from "./info_nszfh_meresek";
import TitleNszfhMeresek from "./title_nszfh_meresek";
import {
  generateSchoolYears,
  getCurrentSchoolYear,
} from "../../../utils/schoolYears";
import {
  useGetNSZFHBySchoolAndYearQuery,
  useAddNSZFHMutation,
  useUpdateNSZFHMutation,
  useGetAlapadatokQuery,
  useGetFelvettekSzamaByAlapadatokIdAndYearQuery,
} from "../../../store/api/apiSlice";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

export default function NszfhMeresek() {
  const selectedSchool = useSelector(selectSelectedSchool);

  const [selectedYear, setSelectedYear] = useState(getCurrentSchoolYear());
  const [historyOpen, setHistoryOpen] = useState(false);
  const currentSchoolYearStart = Number.parseInt(
    selectedYear.split("/")[0],
    10,
  );
  const schoolYears = generateSchoolYears();

  const { data: alapadatokData, isLoading: isAlapadatokLoading } =
    useGetAlapadatokQuery(
      { id: selectedSchool?.id },
      { skip: !selectedSchool?.id },
    );

  const { data: felvettekAdatok, isLoading: isFelvettekLoading } =
    useGetFelvettekSzamaByAlapadatokIdAndYearQuery(
      {
        alapadatokId: selectedSchool?.id,
        year: currentSchoolYearStart,
      },
      { skip: !selectedSchool?.id || !currentSchoolYearStart },
    );

  const studentCountsPerSzakirany = useMemo(() => {
    const counts = { total: 0 };
    if (!felvettekAdatok || !Array.isArray(felvettekAdatok)) return counts;

    // Deduplicate records by specialization and profession to avoid summing database multiples
    const uniqueRecords = {};
    felvettekAdatok.forEach((record) => {
      if (
        record.tanev_kezdete &&
        parseInt(record.tanev_kezdete) !== currentSchoolYearStart
      ) {
        return;
      }

      const szakiranyKey = record.szakirany?.nev || "Nincs meghatározva";
      const szakmaKey = record.szakma?.nev || "";
      const dedupKey = `${szakiranyKey}_${szakmaKey}`;

      // Always take the latest one (matches behavior of Indicator 2)
      uniqueRecords[dedupKey] = record;
    });

    Object.values(uniqueRecords).forEach((record) => {
      const felvetelCount = parseInt(record.felvett_letszam) || 0;
      if (felvetelCount <= 0) return;

      counts.total += felvetelCount;

      const { szakirany, szakma } = record;
      const rawSzakiranyNev = szakirany?.nev || "Nincs meghatározva";
      const rawSzakmaNev = szakma?.nev || "";

      let kf = "";
      const lowerSzakirany = rawSzakiranyNev.toLowerCase();
      const lowerSzakma = rawSzakmaNev.toLowerCase();

      if (
        lowerSzakirany.includes("technikum") ||
        lowerSzakma.includes("technikum")
      ) {
        kf = "Technikum";
      } else if (
        lowerSzakirany.includes("szakképző") ||
        lowerSzakma.includes("szakképző") ||
        lowerSzakirany.includes("szki") ||
        lowerSzakma.includes("szki")
      ) {
        kf = "Szakképző iskola";
      }

      let normalizedSzakiranyNev = rawSzakiranyNev;
      if (normalizedSzakiranyNev && normalizedSzakiranyNev.includes(" - ")) {
        normalizedSzakiranyNev = normalizedSzakiranyNev.split(" - ")[0].trim();
      }

      if (kf) {
        counts[kf] = (counts[kf] || 0) + felvetelCount;
      }
      if (normalizedSzakiranyNev) {
        counts[normalizedSzakiranyNev] =
          (counts[normalizedSzakiranyNev] || 0) + felvetelCount;
      }
    });

    console.log("NSZFH Deduped studentCounts:", counts);
    return counts;
  }, [felvettekAdatok, currentSchoolYearStart]);

  const szakiranyok = useMemo(() => {
    const items = [];
    if (alapadatokData?.alapadatok_szakirany) {
      alapadatokData.alapadatok_szakirany.forEach((szakiranyData) => {
        const sz = szakiranyData.szakirany;
        if (sz && !items.some((s) => s.id === sz.id)) {
          const szakmaIds = [];
          if (sz.szakma) {
            sz.szakma.forEach((sm) => {
              if (sm.szakma && sm.szakma.id) szakmaIds.push(sm.szakma.id);
            });
          }
          items.push({ id: sz.id, nev: sz.nev, szakmaIds });
        }
      });
    }
    return items;
  }, [alapadatokData]);

  const kepzesForma = useMemo(() => {
    if (!selectedSchool) return "";
    const tipus = selectedSchool.intezmeny_tipus || "";
    if (tipus.toLowerCase().includes("technikum")) return "Technikum";
    if (
      tipus.toLowerCase().includes("szakképző") ||
      tipus.toLowerCase().includes("szakkepzo")
    )
      return "Szakképző";
    return tipus;
  }, [selectedSchool]);

  const layoutStructure = useMemo(() => {
    let rows = [];
    if (szakiranyok.length > 0 && kepzesForma) {
      rows.push({
        key: `${kepzesForma}_összesen`,
        label: `${kepzesForma.toLowerCase()} összesen`,
        kepzes_forma: kepzesForma,
        szakma_id: "osszesen",
        isParent: true,
      });
      szakiranyok.forEach((s) => {
        const repSzakmaId = s.szakmaIds.length > 0 ? s.szakmaIds[0] : null;
        rows.push({
          key: `${kepzesForma}_szakirany_${s.id}`,
          label: s.nev,
          kepzes_forma: kepzesForma,
          szakma_id: repSzakmaId,
          szakma_ids: s.szakmaIds,
          szakirany_id: s.id,
          isParent: false,
        });
      });
    }
    return rows;
  }, [szakiranyok, kepzesForma]);

  const {
    data: apiData,
    isLoading: isNSZFHLoading,
    error,
  } = useGetNSZFHBySchoolAndYearQuery(
    { alapadatokId: selectedSchool?.id, tanev: currentSchoolYearStart },
    { skip: !selectedSchool?.id },
  );

  const [addNSZFH, { isLoading: isAdding }] = useAddNSZFHMutation();
  const [updateNSZFH, { isLoading: isUpdating }] = useUpdateNSZFHMutation();
  const isSaving = isAdding || isUpdating;

  const performanceBands = [
    { key: "1", label: "25 % alatt" },
    { key: "2", label: "25-40" },
    { key: "3", label: "40-60" },
    { key: "4", label: "60-80" },
    { key: "5", label: "80 % fölött" },
  ];

  const dataCols = [
    { subject: "mat", measType: "bemeneti" },
    { subject: "mat", measType: "kimeneti" },
    { subject: "szoveg", measType: "bemeneti" },
    { subject: "szoveg", measType: "kimeneti" },
  ];

  const [tableData, setTableData] = useState({});
  const [isModified, setIsModified] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadAlert, setUploadAlert] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [uploadedExcelData, setUploadedExcelData] = useState(null);
  const fileInputRef = useRef(null);

  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = "";
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (rows.length === 0) {
          setUploadAlert({
            open: true,
            message: "Az Excel fájl üres!",
            severity: "error",
          });
          return;
        }
        const headers = Object.keys(rows[0]);
        const columnMap = {};
        let detectedYear = null;
        headers.forEach((h) => {
          const trimmed = h.trim();
          const match = trimmed.match(
            /^([BK])(\d{2,4})(Matematika|Anyanyelv)$/i,
          );
          if (match) {
            const type =
              match[1].toUpperCase() === "B" ? "bemeneti" : "kimeneti";
            let year = parseInt(match[2]);
            if (year < 100) year += 2000;
            const subject =
              match[3].toLowerCase() === "matematika" ? "mat" : "szoveg";
            const key = `${subject}_${type}`;
            columnMap[key] = h;
            detectedYear = year;
          }
        });
        if (Object.keys(columnMap).length === 0) {
          setUploadAlert({
            open: true,
            message: "Nem található megfelelő oszlop!",
            severity: "error",
          });
          return;
        }
        const getBand = (pct) => {
          if (pct < 25) return "1";
          if (pct < 40) return "2";
          if (pct < 60) return "3";
          if (pct < 80) return "4";
          return "5";
        };
        const rowBandCounts = {};
        const rowTotalCounts = {};
        layoutStructure.forEach((row) => {
          if (row.isParent) return;
          rowBandCounts[row.key] = {};
          rowTotalCounts[row.key] = {};
          Object.keys(columnMap).forEach((key) => {
            rowBandCounts[row.key][key] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            rowTotalCounts[row.key][key] = 0;
          });
        });
        const agazatCol = headers.find((h) =>
          h.trim().toLowerCase().includes("ágazat"),
        );
        const kepzesTipusCol = headers.find((h) =>
          h.trim().toLowerCase().includes("képzés"),
        );
        const matchRow = (excelRow) => {
          let type = "Technikum";
          let agazat = "";
          if (kepzesTipusCol && excelRow[kepzesTipusCol]) {
            const t = excelRow[kepzesTipusCol].toString().toLowerCase();
            if (t.includes("szakképző") || t.includes("szakkepzo"))
              type = "Szakképző";
          }
          if (agazatCol && excelRow[agazatCol]) {
            agazat = excelRow[agazatCol].toString().toLowerCase().trim();
          }
          const matchedRow = layoutStructure.find((r) => {
            if (r.isParent) return false;
            if (r.kepzes_forma !== type) return false;
            const szakiranyNev = r.label.toLowerCase().trim();
            if (
              agazat &&
              (agazat.includes(szakiranyNev) || szakiranyNev.includes(agazat))
            ) {
              return true;
            }
            return false;
          });
          return (
            matchedRow ||
            layoutStructure.find(
              (r) =>
                !r.isParent && r.kepzes_forma === type && r.szakma_id === null,
            )
          );
        };
        rows.forEach((row) => {
          const targetRow = matchRow(row);
          if (!targetRow) return;
          Object.entries(columnMap).forEach(([key, colName]) => {
            const rawVal = row[colName];
            if (rawVal === "" || rawVal === null || rawVal === undefined)
              return;
            let pct = parseFloat(rawVal);
            if (isNaN(pct)) return;
            if (pct >= 0 && pct <= 1 && pct !== 0) pct = pct * 100;
            const band = getBand(pct);
            rowBandCounts[targetRow.key][key][band]++;
            rowTotalCounts[targetRow.key][key]++;
          });
        });
        const parsedData = {};
        layoutStructure.forEach((row) => {
          if (row.isParent) return;
          const rowData = {};
          let hasData = false;
          Object.entries(columnMap).forEach(([key, _]) => {
            const [subject, measType] = key.split("_");
            const total = rowTotalCounts[row.key][key];
            if (total === 0) return;
            performanceBands.forEach((band) => {
              const fieldKey = `kat_${band.key}_${subject}_${measType}`;
              const count = rowBandCounts[row.key][key][band.key];
              rowData[fieldKey] = count;
              hasData = true;
            });
          });
          if (hasData) {
            parsedData[row.key] = rowData;
          }
        });
        if (detectedYear) {
          setUploadedExcelData((prev) => ({
            ...prev,
            [detectedYear]: parsedData,
          }));
          setIsModified(true);
          setSaveSuccess(false);
          const nextYearDigit = detectedYear + 1;
          const formattedYearStr = `${detectedYear}/${nextYearDigit.toString().slice(2)}`;
          const fullYearStr = `${detectedYear}/${nextYearDigit}`;
          const matchedYear = schoolYears.find(
            (y) =>
              y === formattedYearStr ||
              y === fullYearStr ||
              y.startsWith(detectedYear.toString()),
          );
          if (matchedYear) {
            setSelectedYear(matchedYear);
          }
        }
        setUploadAlert({
          open: true,
          message: `Sikeres feltöltés!`,
          severity: "success",
        });
      } catch (err) {
        setUploadAlert({
          open: true,
          message: `Hiba: ${err.message}`,
          severity: "error",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const getEmptyData = () => {
    const data = {};
    layoutStructure.forEach((rowInfo) => {
      data[rowInfo.key] = { id: null };
      performanceBands.forEach((band) => {
        dataCols.forEach((col) => {
          const mk = `kat_${band.key}_${col.subject}_${col.measType}`;
          data[rowInfo.key][mk] = "";
        });
      });
    });
    return data;
  };

  useEffect(() => {
    if (apiData && Array.isArray(apiData) && layoutStructure.length > 0) {
      const initialData = getEmptyData();
      apiData.forEach((record) => {
        if (record.tanev_kezdete !== currentSchoolYearStart) return;
        let formKey = null;
        if (record.kepzes_forma) {
          if (record.szakma_id) {
            const matchingRow = layoutStructure.find(
              (r) => r.szakma_ids && r.szakma_ids.includes(record.szakma_id),
            );
            if (matchingRow) formKey = matchingRow.key;
          }
          if (!formKey) formKey = `${record.kepzes_forma}_nincs`;
        }
        if (formKey && initialData[formKey]) {
          initialData[formKey].id = record.id;
          performanceBands.forEach((band) => {
            dataCols.forEach((col) => {
              const mk = `kat_${band.key}_${col.subject}_${col.measType}`;
              initialData[formKey][mk] = record[mk] ?? "";
            });
          });
        }
      });
      if (uploadedExcelData && uploadedExcelData[currentSchoolYearStart]) {
        const yearExcelData = uploadedExcelData[currentSchoolYearStart];
        Object.keys(yearExcelData).forEach((rowKey) => {
          if (initialData[rowKey]) {
            Object.assign(initialData[rowKey], yearExcelData[rowKey]);
            setIsModified(true);
          }
        });
      }
      setTableData(initialData);
    } else if (!isNSZFHLoading && layoutStructure.length > 0) {
      const emptyData = getEmptyData();
      setTableData(emptyData);
    }
  }, [
    apiData,
    isNSZFHLoading,
    layoutStructure,
    currentSchoolYearStart,
    uploadedExcelData,
  ]);

  const handleDataChange = (rowKey, bandKey, compKey, measKey, value) => {
    if (value < 0) return;
    const mk = `kat_${bandKey}_${compKey}_${measKey}`;
    setTableData((prev) => ({
      ...prev,
      [rowKey]: { ...prev[rowKey], [mk]: value },
    }));
    setIsModified(true);
    setSaveSuccess(false);
  };

  const getValue = (rowInfo, bandKey, compKey, measKey) => {
    const mk = `kat_${bandKey}_${compKey}_${measKey}`;
    if (rowInfo.isParent) {
      const children = layoutStructure.filter(
        (r) => !r.isParent && r.kepzes_forma === rowInfo.kepzes_forma,
      );
      let sum = 0;
      let hasVal = false;
      children.forEach((child) => {
        const val = tableData[child.key]?.[mk];
        if (val !== "" && val !== null && val !== undefined && !isNaN(val)) {
          sum += parseFloat(val);
          hasVal = true;
        }
      });
      return hasVal ? sum : "";
    }
    return tableData[rowInfo.key]?.[mk] ?? "";
  };

  const getPercentage = (rowInfo, countValue) => {
    if (
      countValue === "" ||
      countValue === undefined ||
      countValue === null ||
      isNaN(countValue)
    )
      return "";
    const baseline = getTotalBaseline(rowInfo);
    if (baseline === 0) return "0.0";
    return ((countValue / baseline) * 100).toFixed(1);
  };

  const getTotalBaseline = (rowInfo) => {
    // For parents, we already have the pre-calculated total in our memoized counts object
    if (rowInfo.isParent) {
      if (studentCountsPerSzakirany[rowInfo.kepzes_forma]) {
        return studentCountsPerSzakirany[rowInfo.kepzes_forma];
      }

      // Fallback: sum unique specialization counts from children
      const children = layoutStructure.filter(
        (r) => !r.isParent && r.kepzes_forma === rowInfo.kepzes_forma,
      );
      const uniqueLabels = [...new Set(children.map((c) => c.label))];
      let sum = 0;
      uniqueLabels.forEach((label) => {
        if (studentCountsPerSzakirany[label]) {
          sum += studentCountsPerSzakirany[label];
        }
      });
      return sum;
    }

    const labelLower = rowInfo.label.toLowerCase().trim();
    if (studentCountsPerSzakirany[rowInfo.label]) {
      return studentCountsPerSzakirany[rowInfo.label];
    }

    // Fuzzy matching against Tanügyi adatok mapped strings
    let matchedCount = 0;
    let foundMatch = false;

    for (const [key, count] of Object.entries(studentCountsPerSzakirany)) {
      if (key === "total" || key === "Technikum" || key === "Szakképző iskola")
        continue;

      const keyLower = key.toLowerCase().trim();
      if (keyLower.includes(labelLower) || labelLower.includes(keyLower)) {
        return count; // First match wins to avoid summing duplicates
      }
    }

    return 0;
  };

  const handleSave = async () => {
    if (!selectedSchool?.id) return;
    try {
      const promises = [];
      layoutStructure.forEach((rowInfo) => {
        if (rowInfo.isParent) return;
        const record = tableData[rowInfo.key];
        if (!record) return;
        let hasData = false;
        const payload = {
          alapadatok_id: selectedSchool.id,
          tanev_kezdete: currentSchoolYearStart,
          kepzes_forma: rowInfo.kepzes_forma,
          szakma_id: rowInfo.szakma_id,
        };
        performanceBands.forEach((band) => {
          dataCols.forEach((col) => {
            const mk = `kat_${band.key}_${col.subject}_${col.measType}`;
            const value = record[mk];
            if (value !== "" && value !== null && value !== undefined)
              hasData = true;
            payload[mk] = value === "" ? null : parseFloat(value);
          });
        });
        if (record.id) {
          promises.push(updateNSZFH({ id: record.id, ...payload }).unwrap());
        } else if (hasData) {
          promises.push(addNSZFH(payload).unwrap());
        }
      });
      await Promise.all(promises);
      setSaveSuccess(true);
      setIsModified(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = () => {
    setTableData(getEmptyData());
    setIsModified(false);
    setUploadedExcelData(null);
  };

  if (isNSZFHLoading || isAlapadatokLoading || isFelvettekLoading) {
    return <PageLoadingOverlay isLoading={true} />;
  }

  return (
    <PageWrapper
      titleContent={<TitleNszfhMeresek />}
      infoContent={<InfoNszfhMeresek />}
    >
      <Box>
        <LockStatusIndicator tableName="nszfh" />
        <Card>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mb: 3 }}>
              <ExportDOMTableToExcel
                tableId=".MuiTable-root"
                fileName="export_adatok"
              />
              <LockedTableWrapper tableName="nszfh">
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
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<UploadFileIcon />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Excel feltöltés
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleExcelUpload}
                  accept=".xlsx,.xls,.csv"
                  style={{ display: "none" }}
                />
              </LockedTableWrapper>
            </Stack>
            {uploadAlert.open && (
              <Alert
                severity={uploadAlert.severity}
                sx={{ mb: 2 }}
                onClose={() => setUploadAlert({ ...uploadAlert, open: false })}
              >
                {uploadAlert.message}
              </Alert>
            )}
            {saveSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Sikeres mentés!
              </Alert>
            )}
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              sx={{ position: "relative", mb: 2 }}
            >
              <Box sx={{ position: "absolute", left: 0 }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      setIsModified(false);
                      setSaveSuccess(false);
                    }}
                    displayEmpty
                    sx={{ backgroundColor: "#fff" }}
                  >
                    {schoolYears.slice(0, 4).map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Typography variant="h6" component="h2">
                NSZFH kompetenciamérés eredményei
              </Typography>
            </Box>
            <TableContainer
              component={Paper}
              sx={{
                mt: 3,
                mb: 4,
                overflowX: "auto",
                borderRadius: 2,
                border: "1px solid #fff3e0",
              }}
            >
              <Table
                size="small"
                sx={{
                  minWidth: 1000,
                  "& .MuiTableCell-root": {
                    borderRight: "1px solid rgba(224, 224, 224, 1)",
                  },
                }}
              >
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell
                      colSpan={2}
                      rowSpan={3}
                      sx={{ borderRight: "2px solid #e0e0e0" }}
                    ></TableCell>
                    <TableCell
                      colSpan={2}
                      align="center"
                      sx={{
                        color: "#d32f2f",
                        fontWeight: "bold",
                        borderRight: "1px solid #e0e0e0",
                      }}
                    >
                      matematika
                    </TableCell>
                    <TableCell
                      colSpan={2}
                      align="center"
                      sx={{ color: "#d32f2f", fontWeight: "bold" }}
                    >
                      anyanyelv
                    </TableCell>
                    <TableCell
                      colSpan={2}
                      align="center"
                      sx={{
                        color: "#d32f2f",
                        fontWeight: "bold",
                        borderRight: "1px solid #e0e0e0",
                      }}
                    >
                      matematika
                    </TableCell>
                    <TableCell
                      colSpan={2}
                      align="center"
                      sx={{ color: "#d32f2f", fontWeight: "bold" }}
                    >
                      anyanyelv
                    </TableCell>
                    <TableCell
                      rowSpan={2}
                      align="center"
                      sx={{ fontWeight: "bold" }}
                    >
                      9. évfolyamos tanulói
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell
                      align="center"
                      sx={{ color: "#d32f2f", fontWeight: "bold" }}
                    >
                      bemeneti
                      <br />
                      mérés
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        color: "#d32f2f",
                        fontWeight: "bold",
                        borderRight: "1px solid #e0e0e0",
                      }}
                    >
                      kimeneti
                      <br />
                      mérés
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ color: "#d32f2f", fontWeight: "bold" }}
                    >
                      bemeneti
                      <br />
                      mérés
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ color: "#d32f2f", fontWeight: "bold" }}
                    >
                      kimeneti
                      <br />
                      mérés
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ color: "#d32f2f", fontWeight: "bold" }}
                    >
                      bemeneti
                      <br />
                      mérés
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        color: "#d32f2f",
                        fontWeight: "bold",
                        borderRight: "1px solid #e0e0e0",
                      }}
                    >
                      kimeneti
                      <br />
                      mérés
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ color: "#d32f2f", fontWeight: "bold" }}
                    >
                      bemeneti
                      <br />
                      mérés
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ color: "#d32f2f", fontWeight: "bold" }}
                    >
                      kimeneti
                      <br />
                      mérés
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell
                      colSpan={4}
                      align="center"
                      sx={{ fontWeight: "bold", fontSize: "0.85rem" }}
                    >
                      összlétszámhoz viszonyítva (%)
                    </TableCell>
                    <TableCell
                      colSpan={4}
                      align="center"
                      sx={{ fontWeight: "bold", fontSize: "0.85rem" }}
                    >
                      (fő)
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontWeight: "bold", fontSize: "0.85rem" }}
                    >
                      (fő)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {layoutStructure.map((rowInfo, idx) => {
                    let bgColor = "#ffffff";
                    let hoverColor = "#f5f5f5";
                    if (rowInfo.kepzes_forma === "Technikum") {
                      bgColor = rowInfo.isParent ? "#fff3e0" : "#fff3e0";
                      hoverColor = rowInfo.isParent ? "#fff3e0" : "#fff3e0";
                    } else {
                      bgColor = rowInfo.isParent ? "#f0f8ff" : "#f0f8ff";
                      hoverColor = rowInfo.isParent ? "#f0f8ff" : "#f0f8ff";
                    }

                    const isParent = rowInfo.isParent;
                    const baselineVal = getTotalBaseline(rowInfo);

                    return (
                      <React.Fragment key={rowInfo.key}>
                        {performanceBands.map((band, bIdx) => {
                          const isFirstBand = bIdx === 0;
                          const isLastBand = bIdx === 4;
                          const isLastLogicalRow =
                            idx === layoutStructure.length - 1;

                          return (
                            <TableRow
                              key={`${rowInfo.key}_${band.key}`}
                              sx={{
                                backgroundColor: bgColor,
                                "&:hover": { backgroundColor: hoverColor },
                              }}
                            >
                              {/* Szakma column */}
                              {isFirstBand && (
                                <TableCell
                                  rowSpan={performanceBands.length}
                                  sx={{
                                    fontWeight: isParent ? "bold" : "normal",
                                    textAlign: "center",
                                    borderRight: "1px solid #e0e0e0",
                                    borderBottom: isLastLogicalRow
                                      ? "none"
                                      : "2px solid #e0e0e0",
                                    verticalAlign: "top",
                                    pt: 3,
                                    fontStyle: isParent ? "normal" : "italic",
                                    fontSize: isParent ? "1rem" : "0.85rem",
                                    width: "200px",
                                  }}
                                >
                                  {rowInfo.label}
                                </TableCell>
                              )}
                              {/* Band label column */}
                              <TableCell
                                sx={{
                                  fontWeight: "bold",
                                  textAlign: "center",
                                  borderRight: "2px solid #e0e0e0",
                                  borderBottom:
                                    isLastBand && !isLastLogicalRow
                                      ? "2px solid #e0e0e0"
                                      : "1px solid rgba(224, 224, 224, 1)",
                                  fontSize: "0.85rem",
                                  width: "120px",
                                }}
                              >
                                {band.label}
                              </TableCell>

                              {/* Data columns (%) */}
                              {dataCols.map((col, cIdx) => {
                                const val = getValue(
                                  rowInfo,
                                  band.key,
                                  col.subject,
                                  col.measType,
                                );
                                const percent = getPercentage(rowInfo, val);
                                const isEndBlock = cIdx === 1 || cIdx === 3;
                                return (
                                  <TableCell
                                    key={`${rowInfo.key}_${band.key}_col_pct_${cIdx}`}
                                    align="center"
                                    sx={{
                                      borderBottom:
                                        isLastBand && !isLastLogicalRow
                                          ? "2px solid #e0e0e0"
                                          : "1px solid rgba(224, 224, 224, 1)",
                                      borderRight: isEndBlock
                                        ? "1px solid #e0e0e0"
                                        : "1px solid rgba(224, 224, 224, 1)",
                                      backgroundColor: isParent
                                        ? "rgba(0,0,0,0.03)"
                                        : "inherit",
                                    }}
                                  >
                                    <ZeroHidingTextField
                                      size="small"
                                      variant="outlined"
                                      value={percent || 0}
                                      disabled
                                      inputProps={{
                                        style: {
                                          textAlign: "center",
                                          backgroundColor: isParent
                                            ? "transparent"
                                            : "rgba(255,255,255,0.7)",
                                          color: "#666",
                                          fontWeight: "bold",
                                        },
                                      }}
                                      sx={{
                                        width: "60px",
                                        "& .MuiOutlinedInput-notchedOutline": {
                                          borderColor: "transparent",
                                        },
                                      }}
                                      placeholder="0" />
                                  </TableCell>
                                );
                              })}

                              {/* Data columns (fő) */}
                              {dataCols.map((col, cIdx) => {
                                const val = getValue(
                                  rowInfo,
                                  band.key,
                                  col.subject,
                                  col.measType,
                                );
                                const isEndBlock = cIdx === 1 || cIdx === 3;
                                return (
                                  <TableCell
                                    key={`${rowInfo.key}_${band.key}_col_count_${cIdx}`}
                                    align="center"
                                    sx={{
                                      borderBottom:
                                        isLastBand && !isLastLogicalRow
                                          ? "2px solid #e0e0e0"
                                          : "1px solid rgba(224, 224, 224, 1)",
                                      borderRight: isEndBlock
                                        ? "1px solid #e0e0e0"
                                        : "1px solid rgba(224, 224, 224, 1)",
                                      backgroundColor: isParent
                                        ? "rgba(0,0,0,0.03)"
                                        : "inherit",
                                    }}
                                  >
                                    <ZeroHidingTextField
                                      size="small"
                                      variant="outlined"
                                      value={val || 0}
                                      disabled={isParent}
                                      InputProps={{
                                        readOnly: true,
                                      }}
                                      inputProps={{
                                        min: 0,
                                        style: {
                                          textAlign: "center",
                                          fontWeight: isParent
                                            ? "bold"
                                            : "normal",
                                          color: isParent ? "#666" : "inherit",
                                        },
                                      }}
                                      sx={{
                                        width: "60px",
                                        pointerEvents: "none",
                                        backgroundColor: isParent
                                          ? "transparent"
                                          : "rgba(255,255,255,0.7)",
                                        ...(isParent && {
                                          "& .MuiOutlinedInput-notchedOutline":
                                          {
                                            borderColor: "transparent",
                                          },
                                        }),
                                      }}
                                      placeholder="0" />
                                  </TableCell>
                                );
                              })}

                              {/* 9. évfolyamos tanulói - printed only on the first row of each block */}
                              {isFirstBand && (
                                <TableCell
                                  rowSpan={performanceBands.length}
                                  align="center"
                                  sx={{
                                    borderBottom: isLastLogicalRow
                                      ? "none"
                                      : "2px solid #e0e0e0",
                                  }}
                                >
                                  <Typography sx={{ fontWeight: "bold" }}>
                                    {baselineVal}
                                  </Typography>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {isModified && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Mentetlen módosítások vannak. Ne felejtsd el menteni a
                változtatásokat!
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>

      <HistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        alapadatokId={selectedSchool?.id}
        tableName="nszfhMeresek"
        onRollbackSuccess={() => {
          setSnackbarMessage("Sikeres visszaállítás az előzményekből!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        }}
      />
    </PageWrapper>
  );
}
