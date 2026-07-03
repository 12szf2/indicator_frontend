import { formatHuNum } from "../../../utils/formatters";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import {
  Alert,
  Button,
  Stack,
  Container,
  Fade,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import { generateSchoolYears } from "../../../utils/schoolYears";
import { selectSelectedSchool } from "../../../store/slices/authSlice";
import {
  useGetFelvettekSzamaByAlapadatokIdAndYearQuery,
  useAddFelvettekSzamaMutation,
  useGetAllAlapadatokQuery,
  useGetTanugyiAdatokQuery,
} from "../../../store/api/apiSlice";
import {
  TableLoadingOverlay,
  NotificationSnackbar,
} from "../../../components/shared";
import TitleFelvettekSzama from "./title_felvettek_szama";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import PageWrapper from "../../PageWrapper";
import InfoFelvettekSzama from "./info_felvettek_szama";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

const evszamok = generateSchoolYears();

const FelvettekSzama = () => {
  const selectedSchool = useSelector(selectSelectedSchool);

  // API hooks
  const { data: apiAdmissionData, isLoading: _isFetching } =
    useGetFelvettekSzamaByAlapadatokIdAndYearQuery({
      alapadatokId: selectedSchool?.id,
      year:
        new Date().getMonth() < 8
          ? new Date().getFullYear() - 1
          : new Date().getFullYear(),
    });

  const { data: tanugyiData } = useGetTanugyiAdatokQuery({
    alapadatok_id: selectedSchool?.id,
    ev:
      new Date().getMonth() >= 8
        ? new Date().getFullYear()
        : new Date().getFullYear() - 1,
  });

  console.log("Fetched tanügyi adatok:", tanugyiData);

  const { data: schoolsData, isLoading: _isLoadingSchools } =
    useGetAllAlapadatokQuery();

  const [addAdmissionData, { isLoading: isAdding }] =
    useAddFelvettekSzamaMutation();

  // State for the integrated table data
  const [tableData, setTableData] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [originalTableData, setOriginalTableData] = useState({}); // Store original data for reset
  const [isModified, setIsModified] = useState(false);
  const [_saveSuccess, setSaveSuccess] = useState(false);
  const [_saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [dataSource, setDataSource] = useState(null);

  // Track which specific cells have been modified by the user
  const [modifiedCells, setModifiedCells] = useState({});

  console.log("Current data source:", dataSource);

  // Extract admission data calculation logic into a separate function
  // This mimics the approach used in Tanuloletszam.jsx
  const calculateFromTanugyiData = useCallback(() => {
    if (
      !tanugyiData ||
      !Array.isArray(tanugyiData) ||
      tanugyiData.length === 0
    ) {
      return {};
    }

    const calculatedData = {};

    let evfolyamStats = {};

    // Process tanugyi data by szakirany and szakma
    tanugyiData.forEach((student) => {
      // Extract admission year from felvetel_taneve (e.g., "2024/2025" -> 2024)
      const admissionYear = student.felvetel_taneve
        ? parseInt(student.felvetel_taneve.split("/")[0])
        : null;

      if (!admissionYear) {
        return;
      }

      // Track evfolyam distribution for debugging
      const evfolyam = student.evfolyam || "Unknown";
      evfolyamStats[evfolyam] = (evfolyamStats[evfolyam] || 0) + 1;

      // Only count students with "Tanulói jogviszony"
      const jogviszony = student.tanulo_jogviszonya;
      if (jogviszony !== "Tanulói jogviszony") {
        return;
      }

      // Only count students admitted to 9th grade (9. évfolyam)
      // Check if evfolyam contains "1/" or similar patterns indicating first year
      const isFirstYear = evfolyam.includes("1/") || evfolyam.includes("9.");
      if (!isFirstYear) {
        return;
      }

      // Extract szakma name from uj_szkt_szakma_tipusa
      let szakmaNev = student.uj_szkt_szakma_tipusa;
      if (szakmaNev && szakmaNev.includes(" - ")) {
        szakmaNev = szakmaNev.split(" - ")[0].trim();
      }

      // Extract szakirany name from uj_Szkt_agazat_tipusa
      let szakiranyNev = student.uj_Szkt_agazat_tipusa;
      if (szakiranyNev && szakiranyNev.includes(" - ")) {
        szakiranyNev = szakiranyNev.split(" - ")[0].trim();
      }

      // Determine the category name based on szakma availability
      let categoryName;

      // If szakma is "Na" or empty/null, use "Nincs meghatározva" format
      if (!szakmaNev || szakmaNev === "Na" || szakmaNev.trim() === "") {
        if (szakiranyNev) {
          categoryName = `Nincs meghatározva (${szakiranyNev})`;
        } else {
          categoryName = "Nincs meghatározva";
        }
      } else {
        // Use the actual szakma name
        categoryName = szakmaNev;
      }

      // Initialize the category if it doesn't exist
      if (!calculatedData[categoryName]) {
        calculatedData[categoryName] = {};
      }

      // Initialize the year if it doesn't exist
      if (!calculatedData[categoryName][admissionYear]) {
        calculatedData[categoryName][admissionYear] = {
          jelentkezok_szama_9: 0,
          felvettek_szama_9: 0,
          felvettek_letszam_9: 0,
        };
      }

      // Since this is from tanugyi data (already admitted students),
      // we only count them as admitted students, not as applicants
      // Leave jelentkezok_szama_9 as 0 since we don't have applicant data
      calculatedData[categoryName][admissionYear].felvettek_szama_9 += 1;
      // We don't have capacity data from tanugyi records, so leave felvettek_letszam_9 as 0
    });

    return calculatedData;
  }, [tanugyiData]);

  // Utility function to normalize szakirány names (trim whitespace, normalize special chars)
  const normalizeSzakiranyName = (name) => {
    if (!name) return name;
    return name.trim().replace(/\s+/g, " "); // Remove extra whitespace
  };

  // Program types based on the selected school's actual data
  const programTypes = useMemo(() => {
    if (!schoolsData || !Array.isArray(schoolsData)) return [];

    let relevantSchools = schoolsData;
    if (selectedSchool) {
      relevantSchools = schoolsData.filter(
        (school) => school.id === selectedSchool.id,
      );
    }

    const categories = [];

    // Add "Összesen" category with institution types
    const institutionTypes = [
      ...new Set(relevantSchools.map((school) => school.intezmeny_tipus)),
    ];
    if (institutionTypes.length > 0) {
      categories.push({
        category: "Összesen",
        subTypes: institutionTypes,
      });
    }

    // Extract szakirányok and szakmák from the schools
    relevantSchools.forEach((school) => {
      if (
        school.alapadatok_szakirany &&
        Array.isArray(school.alapadatok_szakirany)
      ) {
        school.alapadatok_szakirany.forEach((szakiranyData) => {
          const szakirany = szakiranyData.szakirany;
          if (szakirany) {
            // Add szakirány as category
            categories.push({
              category: "Szakirány",
              subTypes: [szakirany.nev],
            }); // Add szakmák under this szakirány
            if (szakirany.szakma && Array.isArray(szakirany.szakma)) {
              const szakmaNevek = szakirany.szakma
                .map((szakmaData) => szakmaData.szakma?.nev)
                .filter(Boolean);

              // Add "Nincs meghatározva" entry for each szakirány
              const normalizedSzakiranyNev = normalizeSzakiranyName(
                szakirany.nev,
              );
              const subTypes =
                szakmaNevek.length > 0
                  ? [
                    ...szakmaNevek,
                    `Nincs meghatározva (${normalizedSzakiranyNev})`,
                  ]
                  : [`Nincs meghatározva (${normalizedSzakiranyNev})`];

              if (subTypes.length > 0) {
                categories.push({
                  category: `${szakirany.nev} szakmái`,
                  subTypes: subTypes,
                });
              }
            } else {
              // If no szakmák exist, still add "Nincs meghatározva" entry
              const normalizedSzakiranyNev = normalizeSzakiranyName(
                szakirany.nev,
              );
              categories.push({
                category: `${szakirany.nev} szakmái`,
                subTypes: [`Nincs meghatározva (${normalizedSzakiranyNev})`],
              });
            }
          }
        });
      }
    });

    return categories;
  }, [schoolsData, selectedSchool]);

  // Handle data changes
  const handleDataChange = (programType, year, field, value) => {
    const newValue = parseFloat(value) || 0;

    setTableData((prev) => {
      const prevData = prev[programType]?.[year]?.[field] || 0;

      // Only update if the value actually changed
      if (prevData === newValue) {
        return prev;
      }

      return {
        ...prev,
        [programType]: {
          ...(prev[programType] || {}),
          [year]: {
            ...(prev[programType]?.[year] || {}),
            [field]: newValue,
          },
        },
      };
    });

    // Track this specific cell as modified
    const cellKey = `${programType}-${year}-${field}`;
    setModifiedCells((prev) => ({
      ...prev,
      [cellKey]: true,
    }));

    setIsModified(true);
  };

  // Check if a program type is a summary row (read-only)
  const isSummaryRow = (programType) => {
    // Find the category this programType belongs to
    const category = programTypes.find((cat) =>
      cat.subTypes.includes(programType),
    );

    if (!category) return false;

    // Summary rows are "Összesen" and "Szakirány" categories
    return (
      category.category === "Összesen" || category.category === "Szakirány"
    );
  };

  // Calculate summary values for institution types (Összesen category)
  const calculateInstitutionSummary = (institutionType, year, field) => {
    if (!schoolsData) return 0;

    // Find all szakmák and szakirányok that belong to this institution type
    const szakmaNevek = new Set();
    const szakiranyNevek = new Set();

    schoolsData
      .filter((school) => school.intezmeny_tipus === institutionType)
      .forEach((school) => {
        if (
          school.alapadatok_szakirany &&
          Array.isArray(school.alapadatok_szakirany)
        ) {
          school.alapadatok_szakirany.forEach((szakiranyData) => {
            const szakirany = szakiranyData.szakirany;
            if (szakirany) {
              // Collect szakirány names
              szakiranyNevek.add(szakirany.nev);

              // Collect szakma names
              if (szakirany.szakma && Array.isArray(szakirany.szakma)) {
                szakirany.szakma.forEach((szakmaData) => {
                  const szakmaNev = szakmaData.szakma?.nev;
                  if (szakmaNev) {
                    szakmaNevek.add(szakmaNev);
                  }
                });
              }
            }
          });
        }
      });

    // Sum up values from tableData for each unique szakma (only once per szakma)
    let totalValue = 0;
    szakmaNevek.forEach((szakmaNev) => {
      const currentValue = tableData[szakmaNev]?.[year]?.[field] || 0;
      totalValue += currentValue;
    });

    // Also add the "Nincs meghatározva" entries for each szakirány in this institution
    szakiranyNevek.forEach((szakiranyNev) => {
      const nincsMeghatározvaKey = `Nincs meghatározva (${szakiranyNev})`;
      const nincsMeghatározvaValue =
        tableData[nincsMeghatározvaKey]?.[year]?.[field] || 0;
      totalValue += nincsMeghatározvaValue;
    });

    return totalValue;
  };

  // Calculate summary values for szakirány categories
  const calculateSzakiranySummary = (szakiranyNev, year, field) => {
    if (!schoolsData) return 0;

    // Find all szakmák that belong to this szakirány (collect unique szakma names)
    const szakmaNevek = new Set();

    schoolsData.forEach((school) => {
      if (
        school.alapadatok_szakirany &&
        Array.isArray(school.alapadatok_szakirany)
      ) {
        school.alapadatok_szakirany.forEach((szakiranyData) => {
          const szakirany = szakiranyData.szakirany;
          if (szakirany && szakirany.nev === szakiranyNev) {
            if (szakirany.szakma && Array.isArray(szakirany.szakma)) {
              szakirany.szakma.forEach((szakmaData) => {
                const szakmaNev = szakmaData.szakma?.nev;
                if (szakmaNev) {
                  szakmaNevek.add(szakmaNev);
                }
              });
            }
          }
        });
      }
    });

    // Now sum up values from tableData for each unique szakma (only once per szakma)
    let totalValue = 0;
    szakmaNevek.forEach((szakmaNev) => {
      const currentValue = tableData[szakmaNev]?.[year]?.[field] || 0;
      totalValue += currentValue;
    });

    // Also add the "Nincs meghatározva" entry for this szakirány
    const nincsMeghatározvaKey = `Nincs meghatározva (${szakiranyNev})`;
    const nincsMeghatározvaValue =
      tableData[nincsMeghatározvaKey]?.[year]?.[field] || 0;
    totalValue += nincsMeghatározvaValue;

    return totalValue;
  };

  // Get calculated value for summary rows
  const getCalculatedValue = (programType, year, field) => {
    const category = programTypes.find((cat) =>
      cat.subTypes.includes(programType),
    );

    if (!category) return 0;

    if (category.category === "Összesen") {
      return calculateInstitutionSummary(programType, year, field);
    } else if (category.category === "Szakirány") {
      return calculateSzakiranySummary(programType, year, field);
    }

    return 0;
  };

  // Calculate percentage automatically (jelentkezők/felvettek arány)
  const calculatePercentage = (programType, year) => {
    let jelentkezokSzama, felvettekSzama;

    if (isSummaryRow(programType)) {
      // For summary rows, calculate from aggregated data
      jelentkezokSzama = getCalculatedValue(
        programType,
        year,
        "jelentkezok_szama_9",
      );
      felvettekSzama = getCalculatedValue(
        programType,
        year,
        "felvettek_szama_9",
      );
    } else {
      // For regular rows, use table data
      const programData = tableData[programType];
      if (!programData) return "0%";

      const data = programData[year];
      if (!data) return "0%";

      jelentkezokSzama = data.jelentkezok_szama_9 || 0;
      felvettekSzama = data.felvettek_szama_9 || 0;
    }

    // If no applicants, return 0%
    if (!jelentkezokSzama || jelentkezokSzama === 0) return "0%";

    // If no admitted students, return "∞" or a special indicator
    if (!felvettekSzama || felvettekSzama === 0) return "N/A";

    const ratio = jelentkezokSzama / felvettekSzama;
    const percentage = ratio * 100;

    // Handle special cases for display
    if (percentage === 0) return "0%";
    if (percentage < 100) return percentage.toFixed(1) + "%"; // Less than 100%
    if (percentage === 100) return "100%";

    return Math.round(percentage * 10) / 10 + "%"; // Round to 1 decimal place and add %
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      let savedCount = 0;

      // Recreate relevantSchools for institution type lookup
      let relevantSchools = schoolsData;
      if (selectedSchool) {
        relevantSchools = schoolsData.filter(
          (school) => school.id === selectedSchool.id,
        );
      }

      // Convert tableData to API format and save/update
      for (const [programType, yearData] of Object.entries(tableData)) {
        for (const [year, fields] of Object.entries(yearData)) {
          // Check if any field in this row was modified by the user
          const wasModified =
            modifiedCells[`${programType}-${year}-jelentkezok_szama_9`] ||
            modifiedCells[`${programType}-${year}-felvettek_szama_9`] ||
            modifiedCells[`${programType}-${year}-felvettek_letszam_9`];

          // Only save if there's actual data OR if the field was modified (to support saving 0 values)
          if (
            wasModified ||
            fields.jelentkezok_szama_9 > 0 ||
            fields.felvettek_szama_9 > 0 ||
            fields.felvettek_letszam_9 > 0
          ) {
            // Determine szakmaNev and szakiranyNev from programType
            let szakmaNev = "";
            let szakiranyNev = "";

            // Handle "Nincs meghatározva" case - save as null in database
            if (programType.startsWith("Nincs meghatározva")) {
              szakmaNev = null;
              // Extract szakirány name from the programType if it's in format "Nincs meghatározva (szakirányName)"
              const match = programType.match(/Nincs meghatározva \((.+)\)$/);
              if (match) {
                szakiranyNev = normalizeSzakiranyName(match[1]);
                console.log(`🔍 Nincs meghatározva processing:`, {
                  programType,
                  rawExtracted: match[1],
                  normalizedSzakiranyNev: szakiranyNev,
                  szakiranyLength: szakiranyNev.length,
                  szakiranyBytes: [...szakiranyNev].map((c) => c.charCodeAt(0)),
                });
              } else {
                szakiranyNev = "Nincs meghatározva";
                console.warn(
                  `⚠️ Could not extract szakirány from: ${programType}`,
                );
              }
            } else {
              // Find the program type in our categories to get proper names
              const category = programTypes.find((cat) =>
                cat.subTypes.includes(programType),
              );

              if (category) {
                if (category.category === "Szakirány") {
                  szakiranyNev = programType;
                  // For szakirány level, we need a default szakma or skip
                  console.warn(
                    `Skipping szakirány level record: ${programType} - no szakma specified`,
                  );
                  continue; // Skip this iteration as backend requires both szakma and szakirany
                } else if (category.category.includes("szakmái")) {
                  // Extract szakirány name from category
                  szakiranyNev = category.category.replace(" szakmái", "");
                  szakmaNev = programType;
                } else if (category.category === "Összesen") {
                  // For institution types like "Technikum", we need to find actual szakma/szakirany pairs
                  // Let's find all szakma-szakirany combinations for this institution type
                  const institutionSchools = relevantSchools.filter(
                    (school) => school.intezmeny_tipus === programType,
                  );

                  if (institutionSchools.length > 0) {
                    // For now, let's use the first available szakma-szakirany pair
                    // You might want to create separate records for each pair later
                    const firstSchool = institutionSchools[0];
                    if (
                      firstSchool.alapadatok_szakirany &&
                      Array.isArray(firstSchool.alapadatok_szakirany) &&
                      firstSchool.alapadatok_szakirany.length > 0
                    ) {
                      const firstSzakirany =
                        firstSchool.alapadatok_szakirany[0].szakirany;
                      if (firstSzakirany) {
                        szakiranyNev = firstSzakirany.nev;

                        // Try to get the first szakma from this szakirany
                        if (
                          firstSzakirany.szakma &&
                          Array.isArray(firstSzakirany.szakma) &&
                          firstSzakirany.szakma.length > 0
                        ) {
                          const firstSzakma = firstSzakirany.szakma[0].szakma;
                          if (firstSzakma) {
                            szakmaNev = firstSzakma.nev;
                          }
                        }
                      }
                    }
                  }

                  if (!szakmaNev || !szakiranyNev) {
                    console.warn(
                      `Institution type record: ${programType} - could not find valid szakma/szakirany pair`,
                    );
                    continue;
                  } else {
                    console.log(
                      `Institution type record: ${programType} - using szakma: ${szakmaNev}, szakirany: ${szakiranyNev}`,
                    );
                  }
                }
              }
            }

            // Skip if we don't have szakirany name (szakma can be null for "Nincs meghatározva")
            if (!szakiranyNev) {
              console.warn(
                `Skipping record - missing szakirany (${szakiranyNev})`,
              );
              continue;
            }

            const recordData = {
              alapadatok_id: selectedSchool?.id,
              tanev_kezdete: parseInt(year),
              szakmaNev: szakmaNev, // null for "Nincs meghatározva"
              szakiranyNev: szakiranyNev,
              jelentkezo_letszam: fields.jelentkezok_szama_9 || 0,
              felveheto_letszam: fields.felvettek_letszam_9 || 0,
              felvett_letszam: fields.felvettek_szama_9 || 0,
            };

            try {
              // Add upsertMode flag to let backend know this should be create-or-update
              const upsertData = {
                ...recordData,
                upsertMode: true, // Signal to backend to handle duplicates
              };

              console.log(`Saving record:`, {
                programType,
                year,
                szakmaNev: szakmaNev || "Nincs meghatározva",
                szakiranyNev,
                data: upsertData,
              });

              await addAdmissionData(upsertData).unwrap();
              savedCount++;
              console.log(
                `✅ Saved record for ${szakmaNev || "Nincs meghatározva"
                } - ${szakiranyNev} - ${year}`,
              );
            } catch (recordError) {
              console.error(
                `❌ Error saving record for ${szakmaNev || "Nincs meghatározva"
                } - ${szakiranyNev} - ${year}:`,
                recordError,
              );

              // For now, don't throw the error to avoid stopping the entire save process
              // Log the error and continue with other records
              console.log(`Continuing with other records...`);
            }
          }
        }
      }

      setIsModified(false);
      setModifiedCells({}); // Clear modified cells tracking after successful save
      setOriginalTableData(JSON.parse(JSON.stringify(tableData))); // Update original data after save
      setSaveSuccess(true);
      console.log(`Successfully processed ${savedCount} records`);

      // Show success snackbar
      setSnackbarMessage(`Sikeresen mentve: ${savedCount} rekord feldolgozva`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving admission data:", error);
      const errorMessage =
        error.data?.message || error.message || "Hiba történt a mentés során";
      setSaveError(errorMessage);

      // Show error snackbar
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    // Restore original data
    setTableData(JSON.parse(JSON.stringify(originalTableData)));
    setIsModified(false);
    // Clear the modified cells tracking when resetting
    setModifiedCells({});
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  useEffect(() => {
    console.log("📊 Program types:", programTypes);

    // Extract all szakirány names for comparison
    const szakiranyNames = new Set();
    if (schoolsData && Array.isArray(schoolsData)) {
      schoolsData.forEach((school) => {
        if (
          school.alapadatok_szakirany &&
          Array.isArray(school.alapadatok_szakirany)
        ) {
          school.alapadatok_szakirany.forEach((szakiranyData) => {
            if (szakiranyData.szakirany?.nev) {
              szakiranyNames.add(szakiranyData.szakirany.nev);
            }
          });
        }
      });
    }

    console.log(
      "🎯 All available szakirány names:",
      Array.from(szakiranyNames),
    );

    // Show which Nincs meghatározva entries we're creating
    const nincsMeghatározvaEntries = programTypes.flatMap(
      (category) =>
        category.subTypes?.filter((subType) =>
          subType.startsWith("Nincs meghatározva"),
        ) || [],
    );
    console.log(
      "🔧 Generated Nincs meghatározva entries:",
      nincsMeghatározvaEntries,
    );
  }, [programTypes, schoolsData]);

  // Force re-render when tableData changes to update calculated summaries
  useEffect(() => {
    // This effect ensures that summary rows are recalculated when tableData changes
    // The component will re-render automatically due to state change
  }, [tableData]);

  // Load data with priority: apiAdmissionData first, then fallback to calculated tanugyiData
  useEffect(() => {
    const hasAdmissionData =
      apiAdmissionData &&
      Array.isArray(apiAdmissionData) &&
      apiAdmissionData.length > 0;
    const hasTanugyiData =
      tanugyiData && Array.isArray(tanugyiData) && tanugyiData.length > 0;

    console.log("Data loading check:", {
      hasAdmissionData,
      hasTanugyiData,
      apiAdmissionDataLength: apiAdmissionData?.length,
      tanugyiDataLength: tanugyiData?.length,
    });

    if (hasAdmissionData) {
      console.log(
        "Loading existing admission data from API:",
        apiAdmissionData,
      );
      setDataSource("FelvettekSzama");

      const newTableData = {};

      apiAdmissionData.forEach((record) => {
        const {
          tanev_kezdete,
          jelentkezo_letszam,
          felveheto_letszam,
          felvett_letszam,
          szakma,
          szakirany,
        } = record;

        if (szakirany) {
          let programKey;

          if (szakma && szakma.nev) {
            // Regular szakma entry
            programKey = szakma.nev;
            console.log(`📥 Loading regular szakma record:`, {
              programKey,
              szakiranyNev: szakirany.nev,
              year: tanev_kezdete,
            });
          } else {
            // "Nincs meghatározva" entry (szakma is null)
            const normalizedSzakiranyNev = normalizeSzakiranyName(
              szakirany.nev,
            );
            programKey = `Nincs meghatározva (${normalizedSzakiranyNev})`;
            console.log(`📥 Loading Nincs meghatározva record:`, {
              originalSzakiranyNev: szakirany.nev,
              normalizedSzakiranyNev,
              programKey,
              szakiranyLength: normalizedSzakiranyNev?.length,
              szakiranyBytes: normalizedSzakiranyNev
                ? [...normalizedSzakiranyNev].map((c) => c.charCodeAt(0))
                : null,
              year: tanev_kezdete,
            });
          }

          if (!newTableData[programKey]) {
            newTableData[programKey] = {};
          }

          if (!newTableData[programKey][tanev_kezdete]) {
            newTableData[programKey][tanev_kezdete] = {};
          }

          // Map the API field names to our internal field names
          newTableData[programKey][tanev_kezdete] = {
            jelentkezok_szama_9: jelentkezo_letszam || 0,
            felvettek_letszam_9: felveheto_letszam || 0,
            felvettek_szama_9: felvett_letszam || 0,
          };
        }
      });

      console.log("Transformed API table data:", newTableData);
      setTableData(newTableData);
      setOriginalTableData(JSON.parse(JSON.stringify(newTableData))); // Save original for reset
    } else if (hasTanugyiData) {
      console.log("No admission data found, calculating from tanugyi data...");
      setDataSource("TanugyiAdatok");

      const calculatedData = calculateFromTanugyiData();
      console.log("Setting calculated data:", calculatedData);
      setTableData(calculatedData);
      setOriginalTableData(JSON.parse(JSON.stringify(calculatedData))); // Save original for reset
    } else {
      console.log("No data available to load");
      setDataSource(null);
      setTableData({});
      setOriginalTableData({}); // Clear original data when no data available
    }
  }, [apiAdmissionData, tanugyiData, calculateFromTanugyiData]);

  return (
    <Container maxWidth="xl">
      <PageWrapper
        titleContent={<TitleFelvettekSzama />}
        infoContent={<InfoFelvettekSzama />}
      >
        <Fade in={true} timeout={800}>
          <Box sx={{ minHeight: "calc(100vh - 120px)" }}>
            {/* Header Section */}
            <LockStatusIndicator tableName="felvettek_szama" />
            <PageLoadingOverlay isLoading={_isFetching} />

            {!selectedSchool && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Nincs iskola kiválasztva - az összes iskola adatait összegzi a
                rendszer.
              </Alert>
            )}

            {isModified && (
              <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                Mentetlen módosítások vannak. Ne felejtsd el menteni a
                változtatásokat!
              </Alert>
            )}
            <Stack direction="row" spacing={2} sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mb: 3 }}>
              <ExportDOMTableToExcel
                tableId=".MuiTable-root"
                fileName="felvettek_szama"
              />
              <LockedTableWrapper tableName="felvettek_szama">
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={!isModified || isAdding || isSaving}
                >
                  {isAdding || isSaving ? "Mentés..." : "Mentés"}
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
                  disabled={!isModified || isAdding || isSaving}
                >
                  Visszaállítás
                </Button>
              </LockedTableWrapper>
            </Stack>
            <TableContainer
              component={Paper}
              sx={{ maxWidth: "100%", overflowX: "auto", position: "relative" }}
            >
              {/* Loading Overlay */}
              <TableLoadingOverlay
                isLoading={isSaving}
                message="Adatok mentése folyamatban, kérjük várjon..."
              />

              <Table size="small" sx={{ minWidth: 1200 }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      rowSpan={2}
                      sx={{
                        fontWeight: "bold",
                        minWidth: 200,
                        borderRight: "2px solid #e0e0e0",
                        position: "sticky",
                        left: 0,
                        backgroundColor: "#ffffff",
                        zIndex: 3,
                      }}
                    >
                      Intézménytípus/szakma
                    </TableCell>
                    <TableCell
                      colSpan={evszamok.length}
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        backgroundColor: "#f0f8ff",
                        borderRight: "1px solid #e0e0e0",
                      }}
                    >
                      Jelentkezések és felvettek aránya
                    </TableCell>
                    <TableCell
                      colSpan={evszamok.length}
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        backgroundColor: "#f3e5f5",
                        borderRight: "1px solid #e0e0e0",
                      }}
                    >
                      9. évfolyamra jelentkezők száma
                    </TableCell>
                    <TableCell
                      colSpan={evszamok.length}
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        backgroundColor: "#e8f5e8",
                        borderRight: "1px solid #e0e0e0",
                      }}
                    >
                      9. évfolyamra felvettek száma
                    </TableCell>
                    <TableCell
                      colSpan={evszamok.length}
                      align="center"
                      sx={{ fontWeight: "bold", backgroundColor: "#fff3e0" }}
                    >
                      9. évfolyamra felvehető létszám (fő)
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    {/* Jelentkezések és felvettek aránya */}
                    {evszamok.map((year) => (
                      <TableCell
                        key={`jelentkezesek-${year}`}
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          backgroundColor: "#f0f8ff40",
                          fontSize: "0.75rem",
                        }}
                      >
                        {year}
                      </TableCell>
                    ))}
                    {/* 9. évfolyamra jelentkezők száma */}
                    {evszamok.map((year) => (
                      <TableCell
                        key={`jelentkezok-${year}`}
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          backgroundColor: "#f3e5f540",
                          fontSize: "0.75rem",
                        }}
                      >
                        {year}
                      </TableCell>
                    ))}
                    {/* 9. évfolyamra felvettek száma */}
                    {evszamok.map((year) => (
                      <TableCell
                        key={`felvettek-${year}`}
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          backgroundColor: "#e8f5e840",
                          fontSize: "0.75rem",
                        }}
                      >
                        {year}
                      </TableCell>
                    ))}
                    {/* 9. évfolyamra felvettek létszáma */}
                    {evszamok.map((year) => (
                      <TableCell
                        key={`letszam-${year}`}
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          backgroundColor: "#fff3e040",
                          fontSize: "0.75rem",
                        }}
                      >
                        {year}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {programTypes.map((category, categoryIndex) => (
                    <React.Fragment key={categoryIndex}>
                      {/* Category header row */}
                      <TableRow>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            backgroundColor: "#f5f5f5",
                            borderBottom: "2px solid #e0e0e0",
                            borderRight: "2px solid #e0e0e0",
                            position: "sticky",
                            left: 0,
                            zIndex: 2,
                          }}
                        >
                          {formatHuNum(category.category)}
                        </TableCell>
                        {/* Empty cells for years */}
                        {Array(evszamok.length * 4)
                          .fill(0)
                          .map((_, index) => (
                            <TableCell
                              key={index}
                              sx={{ backgroundColor: "#f5f5f5" }}
                            />
                          ))}
                      </TableRow>

                      {/* Sub-type rows */}
                      {category.subTypes.map((subType) => (
                        <TableRow key={subType}>
                          <TableCell
                            sx={{
                              fontWeight: "medium",
                              pl: category.category.includes("szakmái") ? 4 : 2,
                              borderRight: "1px solid #e0e0e0",
                              position: "sticky",
                              left: 0,
                              backgroundColor: "#ffffff",
                              zIndex: 1,
                              fontStyle: subType.startsWith(
                                "Nincs meghatározva",
                              )
                                ? "italic"
                                : "normal",
                              color: subType.startsWith("Nincs meghatározva")
                                ? "#666"
                                : "inherit",
                            }}
                          >
                            {formatHuNum(subType)}
                          </TableCell>

                          {/* Jelentkezések és felvettek aránya - calculated automatically */}
                          {evszamok.map((schoolYear) => {
                            const startYear = parseInt(
                              schoolYear.split("/")[0],
                            );
                            const percentage = calculatePercentage(
                              subType,
                              startYear,
                            );
                            const isReadOnly = isSummaryRow(subType);

                            let hasData, displayValue;

                            if (isReadOnly) {
                              // For summary rows, check if calculated values have data
                              const jelentkezok = getCalculatedValue(
                                subType,
                                startYear,
                                "jelentkezok_szama_9",
                              );
                              const felvettek = getCalculatedValue(
                                subType,
                                startYear,
                                "felvettek_szama_9",
                              );
                              hasData = jelentkezok > 0 || felvettek > 0;
                              displayValue = hasData ? percentage : "0%";
                            } else {
                              // For regular rows, check tableData
                              const data = tableData[subType]?.[startYear];
                              hasData =
                                data &&
                                (data.jelentkezok_szama_9 > 0 ||
                                  data.felvettek_szama_9 > 0);
                              displayValue = hasData ? percentage : "0";
                            }

                            return (
                              <TableCell
                                key={`jelentkezesek-${subType}-${startYear}`}
                                align="center"
                                sx={{
                                  backgroundColor: isReadOnly
                                    ? "#f5f5f5"
                                    : "#f0f8ff20",
                                  fontWeight: "bold",
                                  color: hasData
                                    ? "primary.main"
                                    : "text.disabled",
                                }}
                              >
                                {formatHuNum(displayValue)}
                              </TableCell>
                            );
                          })}

                          {/* 9. évfolyamra jelentkezők száma */}
                          {evszamok.map((schoolYear) => {
                            const startYear = parseInt(
                              schoolYear.split("/")[0],
                            );
                            const data = tableData[subType]?.[startYear];
                            const isReadOnly = isSummaryRow(subType);
                            const displayValue = isReadOnly
                              ? getCalculatedValue(
                                subType,
                                startYear,
                                "jelentkezok_szama_9",
                              )
                              : data?.jelentkezok_szama_9 || 0;

                            // Check if this specific cell has been modified by the user
                            const cellKey = `${subType}-${startYear}-jelentkezok_szama_9`;
                            const isModified =
                              !isReadOnly && modifiedCells[cellKey];

                            return (
                              <TableCell
                                key={`jelentkezok-${subType}-${startYear}`}
                                align="center"
                                sx={{ backgroundColor: "#f3e5f520" }}
                              >
                                <ZeroHidingTextField
                                  type="number"
                                  value={displayValue || 0}
                                  onChange={(e) => {
                                    if (!isReadOnly) {
                                      handleDataChange(
                                        subType,
                                        startYear,
                                        "jelentkezok_szama_9",
                                        e.target.value,
                                      );
                                    }
                                  }}
                                  disabled={isReadOnly}
                                  size="small"
                                  inputProps={{
                                    min: 0,
                                    style: { textAlign: "center" },
                                  }}
                                  sx={{
                                    width: "70px",
                                    backgroundColor: isReadOnly
                                      ? "#f5f5f5"
                                      : "white",
                                    "& .MuiInputBase-input": {
                                      fontWeight: isReadOnly
                                        ? "bold"
                                        : "normal",
                                      color: isReadOnly ? "#666" : "inherit",
                                    },
                                    "& .MuiOutlinedInput-root": {
                                      "& fieldset": {
                                        borderColor: isModified
                                          ? "#ffb74d"
                                          : undefined,
                                        borderWidth: isModified ? "2px" : "1px",
                                      },
                                      "&:hover fieldset": {
                                        borderColor: isModified
                                          ? "#ffb74d"
                                          : undefined,
                                      },
                                      "&.Mui-focused fieldset": {
                                        borderColor: isModified
                                          ? "#ffb74d"
                                          : undefined,
                                      },
                                    },
                                  }}
                                  placeholder="0" />
                              </TableCell>
                            );
                          })}

                          {/* 9. évfolyamra felvettek száma */}
                          {evszamok.map((schoolYear) => {
                            const startYear = parseInt(
                              schoolYear.split("/")[0],
                            );
                            const data = tableData[subType]?.[startYear];
                            const isReadOnly = isSummaryRow(subType);
                            const displayValue = isReadOnly
                              ? getCalculatedValue(
                                subType,
                                startYear,
                                "felvettek_szama_9",
                              )
                              : data?.felvettek_szama_9 || 0;

                            // Check if this specific cell has been modified by the user
                            const cellKey = `${subType}-${startYear}-felvettek_szama_9`;
                            const isModified =
                              !isReadOnly && modifiedCells[cellKey];

                            return (
                              <TableCell
                                key={`felvettek-${subType}-${startYear}`}
                                align="center"
                                sx={{ backgroundColor: "#e8f5e820" }}
                              >
                                <ZeroHidingTextField
                                  type="number"
                                  value={displayValue || 0}
                                  onChange={(e) => {
                                    if (!isReadOnly) {
                                      handleDataChange(
                                        subType,
                                        startYear,
                                        "felvettek_szama_9",
                                        e.target.value,
                                      );
                                    }
                                  }}
                                  disabled={isReadOnly}
                                  size="small"
                                  inputProps={{
                                    min: 0,
                                    style: { textAlign: "center" },
                                  }}
                                  sx={{
                                    width: "70px",
                                    backgroundColor: isReadOnly
                                      ? "#f5f5f5"
                                      : "white",
                                    "& .MuiInputBase-input": {
                                      fontWeight: isReadOnly
                                        ? "bold"
                                        : "normal",
                                      color: isReadOnly ? "#666" : "inherit",
                                    },
                                    "& .MuiOutlinedInput-root": {
                                      "& fieldset": {
                                        borderColor: isModified
                                          ? "#ffb74d"
                                          : undefined,
                                        borderWidth: isModified ? "2px" : "1px",
                                      },
                                      "&:hover fieldset": {
                                        borderColor: isModified
                                          ? "#ffb74d"
                                          : undefined,
                                      },
                                      "&.Mui-focused fieldset": {
                                        borderColor: isModified
                                          ? "#ffb74d"
                                          : undefined,
                                      },
                                    },
                                  }}
                                  placeholder="0" />
                              </TableCell>
                            );
                          })}

                          {/* 9. évfolyamra felvehető létszám */}
                          {evszamok.map((schoolYear) => {
                            const startYear = parseInt(
                              schoolYear.split("/")[0],
                            );
                            const data = tableData[subType]?.[startYear];
                            const isReadOnly = isSummaryRow(subType);
                            const displayValue = isReadOnly
                              ? getCalculatedValue(
                                subType,
                                startYear,
                                "felvettek_letszam_9",
                              )
                              : data?.felvettek_letszam_9 || 0;

                            // Check if this specific cell has been modified by the user
                            const cellKey = `${subType}-${startYear}-felvettek_letszam_9`;
                            const isModified =
                              !isReadOnly && modifiedCells[cellKey];

                            return (
                              <TableCell
                                key={`letszam-${subType}-${startYear}`}
                                align="center"
                                sx={{ backgroundColor: "#fff3e020" }}
                              >
                                <ZeroHidingTextField
                                  type="number"
                                  value={displayValue || 0}
                                  onChange={(e) => {
                                    if (!isReadOnly) {
                                      handleDataChange(
                                        subType,
                                        startYear,
                                        "felvettek_letszam_9",
                                        e.target.value,
                                      );
                                    }
                                  }}
                                  disabled={isReadOnly}
                                  size="small"
                                  inputProps={{
                                    min: 0,
                                    style: { textAlign: "center" },
                                  }}
                                  sx={{
                                    width: "70px",
                                    backgroundColor: isReadOnly
                                      ? "#f5f5f5"
                                      : "white",
                                    "& .MuiInputBase-input": {
                                      fontWeight: isReadOnly
                                        ? "bold"
                                        : "normal",
                                      color: isReadOnly ? "#666" : "inherit",
                                    },
                                    "& .MuiOutlinedInput-root": {
                                      "& fieldset": {
                                        borderColor: isModified
                                          ? "#ffb74d"
                                          : undefined,
                                        borderWidth: isModified ? "2px" : "1px",
                                      },
                                      "&:hover fieldset": {
                                        borderColor: isModified
                                          ? "#ffb74d"
                                          : undefined,
                                      },
                                      "&.Mui-focused fieldset": {
                                        borderColor: isModified
                                          ? "#ffb74d"
                                          : undefined,
                                      },
                                    },
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

            {/* Action Buttons */}

            {/* Status Messages */}

            {/* Snackbar for save notifications */}
            <NotificationSnackbar
              open={snackbarOpen}
              message={snackbarMessage}
              severity={snackbarSeverity}
              onClose={handleSnackbarClose}
              autoHideDuration={6000}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            />
          </Box>
        </Fade>

        <HistoryDialog
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          alapadatokId={selectedSchool?.id}
          tableName="felvettek_Szama"
          onRollbackSuccess={() => {
            setSnackbarMessage("Sikeres visszaállítás az előzményekből!");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
          }}
        />
      </PageWrapper>
    </Container>
  );
};

export default FelvettekSzama;
