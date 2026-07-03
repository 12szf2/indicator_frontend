import { formatHuNum } from "../../../utils/formatters";
import PageLoadingOverlay from "../../../components/shared/PageLoadingOverlay";
import React, { useState, useEffect } from "react";
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
  Chip,
  Snackbar,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useSelector } from "react-redux";
import PageWrapper from "../../PageWrapper";
import LockStatusIndicator from "../../../components/LockStatusIndicator";
import LockedTableWrapper from "../../../components/LockedTableWrapper";
import InfoSzakmaiBemutatokKonferenciak from "./info_szakmai_bemutatok_konferenciak";
import TitleSzakmaiBemutatokKonferenciak from "./title_szakmai_bemutatok_konferenciak";
import {
  useGetSzakmaiRendezvenyekBySchoolAndYearQuery,
  useAddSzakmaiRendezvenyekMutation,
  useUpdateSzakmaiRendezvenyekMutation,
} from "../../../store/api/apiSlice";
import { getCurrentSchoolYearStart } from "../../../utils/dateUtils";
import ExportDOMTableToExcel from "../../../components/ExportDOMTableToExcel";
import HistoryDialog from "../../../components/HistoryDialog";
import HistoryIcon from "@mui/icons-material/History";
import ZeroHidingTextField from "../../../components/shared/ZeroHidingTextField";

export default function SzakmaiBemutatokKonferenciak() {
  const selectedSchool = useSelector((state) => state.auth.selectedSchool);
  const currentYear = getCurrentSchoolYearStart();
  const schoolYears = [
    `${currentYear - 3}/${currentYear - 2}. tanév`,
    `${currentYear - 2}/${currentYear - 1}. tanév`,
    `${currentYear - 1}/${currentYear}. tanév`,
    `${currentYear}/${currentYear + 1}. tanév`,
  ];

  const yearNumbers = [
    currentYear - 3,
    currentYear - 2,
    currentYear - 1,
    currentYear,
  ];

  const eventCategories = [
    {
      category: "szakmai_bemutatok",
      title: "Szakmai bemutatók",
      description: "Szakmai bemutatók és ismeretterjesztő előadások",
      backgroundColor: "#e8f5e8",
      nameField: "szakmai_bemutatok_neve",
      numberField: "szakmai_bemutatok_letszam",
    },
    {
      category: "konferenciak",
      title: "Konferenciák",
      description: "Szakmai konferenciák és tudományos rendezvények",
      backgroundColor: "#fff3e0",
      nameField: "konferenciak_neve",
      numberField: "konferenciak_letszam",
    },
    {
      category: "szakmai_rendezvenyek",
      title: "Szakmai rendezvények",
      description: "Egyéb szakmai rendezvények és programok",
      backgroundColor: "#f0f8ff",
      nameField: "egyeb_rendezvenyek_neve",
      numberField: "egyeb_rendezvenyek_letszam",
    },
  ];

  // API Hooks
  // We fetch data for the current year, but ideally we should fetch for all years shown or use individual queries.
  // The backend currently fetches by tanev. For multiple years, we need to fetch multiple times or use a generalized query.
  // Actually, let's fetch for all 4 years.
  const query1 = useGetSzakmaiRendezvenyekBySchoolAndYearQuery(
    { alapadatokId: selectedSchool?.id, tanev: yearNumbers[0] },
    { skip: !selectedSchool },
  );
  const query2 = useGetSzakmaiRendezvenyekBySchoolAndYearQuery(
    { alapadatokId: selectedSchool?.id, tanev: yearNumbers[1] },
    { skip: !selectedSchool },
  );
  const query3 = useGetSzakmaiRendezvenyekBySchoolAndYearQuery(
    { alapadatokId: selectedSchool?.id, tanev: yearNumbers[2] },
    { skip: !selectedSchool },
  );
  const query4 = useGetSzakmaiRendezvenyekBySchoolAndYearQuery(
    { alapadatokId: selectedSchool?.id, tanev: yearNumbers[3] },
    { skip: !selectedSchool },
  );

  const [addSzakmaiRendezvenyek] = useAddSzakmaiRendezvenyekMutation();
  const [updateSzakmaiRendezvenyek] = useUpdateSzakmaiRendezvenyekMutation();

  // Initialize data structure
  const [eventData, setEventData] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savedData, setSavedData] = useState({});
  const [apiDataMap, setApiDataMap] = useState({}); // To keep track of IDs for updating
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // Load data from API
  useEffect(() => {
    if (
      !query1.isFetching &&
      !query2.isFetching &&
      !query3.isFetching &&
      !query4.isFetching
    ) {
      const allApiData = [
        ...(query1.data || []),
        ...(query2.data || []),
        ...(query3.data || []),
        ...(query4.data || []),
      ];

      const newApiDataMap = {};
      const newEventData = {};

      eventCategories.forEach((cat) => {
        newEventData[cat.category] = { neve: {}, letszam: {} };
        yearNumbers.forEach((year) => {
          newEventData[cat.category].neve[year] = "";
          newEventData[cat.category].letszam[year] = "0";
        });
      });

      allApiData.forEach((item) => {
        const year = item.tanev_kezdete;
        newApiDataMap[year] = item;

        eventCategories.forEach((cat) => {
          newEventData[cat.category].neve[year] = item[cat.nameField] || "";
          newEventData[cat.category].letszam[year] =
            item[cat.numberField]?.toString() || "0";
        });
      });

      setApiDataMap(newApiDataMap);
      setEventData(JSON.parse(JSON.stringify(newEventData)));
      setSavedData(JSON.parse(JSON.stringify(newEventData)));
      setIsModified(false);
    }
  }, [
    query1.data,
    query2.data,
    query3.data,
    query4.data,
    query1.isFetching,
    query2.isFetching,
    query3.isFetching,
    query4.isFetching,
    selectedSchool,
  ]);

  // Handle data changes
  const handleDataChange = (category, fieldType, year, value) => {
    setEventData((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [fieldType]: {
          ...prev[category][fieldType],
          [year]: value,
        },
      },
    }));
    setIsModified(true);
  };

  const handleSave = async () => {
    if (!selectedSchool) {
      setSnackbarMessage("Kérjük, válasszon intézményt!");
      setSnackbarSeverity("warning");
      setSnackbarOpen(true);
      return;
    }

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    const changedYears = new Set();
    yearNumbers.forEach((year) => {
      let yearChanged = false;
      eventCategories.forEach((cat) => {
        if (
          eventData[cat.category].neve[year] !==
          savedData[cat.category].neve[year] ||
          eventData[cat.category].letszam[year] !==
          savedData[cat.category].letszam[year]
        ) {
          yearChanged = true;
        }
      });
      if (yearChanged) changedYears.add(year);
    });

    if (changedYears.size === 0) {
      setSnackbarMessage("Nincsenek mentendő változások.");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
      setIsSaving(false);
      return;
    }

    for (const year of changedYears) {
      const existingRecord = apiDataMap[year];
      const payload = {
        alapadatok_id: selectedSchool.id,
        tanev_kezdete: year,
        szakmai_bemutatok_neve: eventData.szakmai_bemutatok.neve[year],
        szakmai_bemutatok_letszam: parseInt(
          eventData.szakmai_bemutatok.letszam[year] || 0,
        ),
        konferenciak_neve: eventData.konferenciak.neve[year],
        konferenciak_letszam: parseInt(
          eventData.konferenciak.letszam[year] || 0,
        ),
        egyeb_rendezvenyek_neve: eventData.szakmai_rendezvenyek.neve[year],
        egyeb_rendezvenyek_letszam: parseInt(
          eventData.szakmai_rendezvenyek.letszam[year] || 0,
        ),
      };

      try {
        if (existingRecord?.id) {
          await updateSzakmaiRendezvenyek({
            id: existingRecord.id,
            ...payload,
          }).unwrap();
        } else {
          await addSzakmaiRendezvenyek(payload).unwrap();
        }
        successCount++;
      } catch (err) {
        console.error("Save error:", err);
        errorCount++;
      }
    }

    if (errorCount === 0) {
      setSnackbarMessage("Minden adat sikeresen elmentve!");
      setSnackbarSeverity("success");
      setSavedData(JSON.parse(JSON.stringify(eventData)));
      setIsModified(false);
    } else {
      setSnackbarMessage(`Hiba történt ${errorCount} év mentése során!`);
      setSnackbarSeverity("error");
    }
    setSnackbarOpen(true);
    setIsSaving(false);
  };

  const handleReset = () => {
    if (savedData && Object.keys(savedData).length > 0) {
      setEventData(JSON.parse(JSON.stringify(savedData)));
      setIsModified(false);
    }
  };

  return (
    <PageWrapper
      titleContent={<TitleSzakmaiBemutatokKonferenciak />}
      infoContent={<InfoSzakmaiBemutatokKonferenciak />}
    >
      <Box>
        <LockStatusIndicator tableName="szakmai_bemutatok_konferenciak" />
        <PageLoadingOverlay
          isLoading={
            query1?.isFetching ||
            query2?.isFetching ||
            query3?.isFetching ||
            query4?.isFetching
          }
        />

        <Card
          sx={{ position: "sticky", top: 0, zIndex: 20, backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(8px)", width: "100%", p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", borderRadius: "8px 8px 8px 8px", mb: 3, p: 2, display: "flex", flexDirection: "row", gap: 2 }}
        >
          <ExportDOMTableToExcel
            tableId=".MuiTable-root"
            fileName="export_adatok"
          />
          <LockedTableWrapper tableName="szakmai_bemutatok_konferenciak">
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
              disabled={
                !isModified ||
                isSaving ||
                !savedData ||
                Object.keys(savedData).length === 0
              }
            >
              Visszaállítás
            </Button>
          </LockedTableWrapper>
        </Card>

        {/* Status Messages */}
        {isModified && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Mentetlen módosítások vannak. Ne felejtsd el menteni a
            változtatásokat!
          </Alert>
        )}

        {/* Main Data Tables */}
        {eventCategories.map((categoryData) => (
          <Card key={categoryData.category} sx={{ mb: 3 }}>
            <CardContent>
              <Typography
                variant="h6"
                component="h2"
                gutterBottom
                sx={{
                  color: "#1976d2",
                  fontWeight: "bold",
                  textTransform: "capitalize",
                }}
              >
                {categoryData.title}
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {categoryData.description}
              </Typography>

              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ overflowX: "auto" }}
              >
                <Table size="small" sx={{ minWidth: 800 }}>
                  <TableHead>
                    <TableRow
                      sx={{ backgroundColor: categoryData.backgroundColor }}
                    >
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          verticalAlign: "middle",
                          minWidth: 150,
                          textAlign: "center",
                        }}
                      >
                        Témakörök
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          minWidth: 150,
                          backgroundColor: "#f0f8ff",
                        }}
                      >
                        Információk
                      </TableCell>
                      {schoolYears.map((yearLabel) => (
                        <TableCell
                          key={yearLabel}
                          align="center"
                          sx={{
                            fontWeight: "bold",
                            minWidth: 120,
                            backgroundColor: "#f0f8ff",
                          }}
                        >
                          {formatHuNum(yearLabel)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Row 1: Tevékenységek színterei (Text input) */}
                    <TableRow sx={{ backgroundColor: "white" }}>
                      <TableCell
                        rowSpan={2}
                        sx={{
                          fontWeight: "bold",
                          textAlign: "center",
                          verticalAlign: "middle",
                        }}
                      >
                        {formatHuNum(categoryData.title)}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "medium",
                          textAlign: "left",
                          backgroundColor: "#f5f5f5",
                        }}
                      >
                        tevékenységek színterei
                      </TableCell>
                      {yearNumbers.map((year) => (
                        <TableCell key={`neve-${year}`} align="center">
                          <ZeroHidingTextField
                            multiline
                            minRows={1}
                            maxRows={4}
                            value={eventData[categoryData.category]?.neve?.[year] || 0}
                            onChange={(e) =>
                              handleDataChange(
                                categoryData.category,
                                "neve",
                                year,
                                e.target.value,
                              )
                            }
                            size="small"
                            fullWidth
                            placeholder="rendezvény neve kerül ide"
                            disabled={!selectedSchool}
                            placeholder="0" />
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Row 2: Bevont tanulók száma (Number input) */}
                    <TableRow sx={{ backgroundColor: "white" }}>
                      <TableCell
                        sx={{
                          fontWeight: "medium",
                          textAlign: "left",
                          backgroundColor: "#f5f5f5",
                        }}
                      >
                        bevont tanulók száma (fő)
                      </TableCell>
                      {yearNumbers.map((year) => (
                        <TableCell key={`letszam-${year}`} align="center">
                          <ZeroHidingTextField
                            type="number"
                            value={eventData[categoryData.category]?.letszam?.[
                              year
                            ] || 0}
                            onChange={(e) =>
                              handleDataChange(
                                categoryData.category,
                                "letszam",
                                year,
                                e.target.value,
                              )
                            }
                            size="small"
                            inputProps={{
                              min: 0,
                              step: 1,
                              style: { textAlign: "center" },
                            }}
                            sx={{ width: "80px" }}
                            placeholder="létszám"
                            disabled={!selectedSchool}
                            placeholder="0" />
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        ))}

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
        tableName="szakmaiRendezvenyek"
        onRollbackSuccess={() => {
          setSnackbarMessage("Sikeres visszaállítás az előzményekből!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        }}
      />
    </PageWrapper>
  );
}
