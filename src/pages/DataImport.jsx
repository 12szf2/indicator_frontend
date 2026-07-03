import { useState, useEffect } from "react";
import { fields } from "../tableData/tanuloTanugyiData";
import { mapEmployeeData } from "../tableData/alkalmazottMunkaugyiData";
import { mapTanuloAdatszolgaltatasData } from "../tableData/tanuloAdatszolgaltatasData";
import { mapOktatoAdatszolgaltatasData } from "../tableData/oktatoAdatszolgaltatasData";
import {
  useAddTanugyiAdatokMutation,
  useGetTanugyiAdatokQuery,
  useAddAlkalmazottAdatokMutation,
  useGetAlkalmazottAdatokQuery,
  useAddTanuloAdatszolgaltatasMutation,
  useGetTanuloAdatszolgaltatasQuery,
  useAddOktatoAdatszolgaltatasMutation,
  useGetOktatoAdatszolgaltatasQuery,
} from "../store/api/apiSlice";
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  AlertTitle,
  Chip,
} from "@mui/material";
import { CustomSheetUploader } from "../components/CustomSheetUploader";
import { useSelector } from "react-redux";
import { selectUser, selectSelectedSchool } from "../store/slices/authSlice";
import {
  validateTanugyiFile,
  validateAlkalmazottFile,
  validateTanuloAdatszolgaltatasFile,
  validateOktatoAdatszolgaltatasFile,
} from "../utils/fileValidation";

export default function DataImport() {
  const [tanugyiData, setTanugyiData] = useState(null);
  const [alkalmazottData, setAlkalmazottData] = useState(null);
  const [tanuloAdatszolgaltatasData, setTanuloAdatszolgaltatasData] =
    useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [tanugyiValidationError, setTanugyiValidationError] = useState(null);
  const [alkalmazottValidationError, setAlkalmazottValidationError] =
    useState(null);
  const [
    tanuloAdatszolgaltatasValidationError,
    setTanuloAdatszolgaltatasValidationError,
  ] = useState(null);
  const [oktatoAdatszolgaltatasData, setOktatoAdatszolgaltatasData] =
    useState(null);
  const [
    oktatoAdatszolgaltatasValidationError,
    setOktatoAdatszolgaltatasValidationError,
  ] = useState(null);

  const currentUser = useSelector(selectUser);
  const selectedSchool = useSelector(selectSelectedSchool);

  // Always use the current school year start
  const currentYearStart =
    new Date().getMonth() >= 8
      ? new Date().getFullYear()
      : new Date().getFullYear() - 1;

  // Tanügyi adatok API hooks
  const [addTanugyiAdatok] = useAddTanugyiAdatokMutation();
  const {
    data: tanugyiDataFromAPI,
    isLoading: tanugyiLoading,
  } = useGetTanugyiAdatokQuery({
    alapadatok_id: selectedSchool?.id,
    ev: currentYearStart,
  });

  // Alkalmazott adatok API hooks
  const [addAlkalmazottAdatok] = useAddAlkalmazottAdatokMutation();
  const {
    data: alkalmazottDataFromAPI,
    isLoading: alkalmazottLoading,
  } = useGetAlkalmazottAdatokQuery({
    alapadatok_id: selectedSchool?.id,
    tanev_kezdete: currentYearStart,
  });

  // Tanuló adatszolgáltatás API hooks
  const [addTanuloAdatszolgaltatas] =
    useAddTanuloAdatszolgaltatasMutation();
  const {
    data: tanuloAdatszolgaltatasDataFromAPI,
    isLoading: tanuloAdatszolgaltatasLoading,
  } = useGetTanuloAdatszolgaltatasQuery({
    alapadatok_id: selectedSchool?.id,
    tanev_kezdete: currentYearStart,
  });

  // Oktató adatszolgáltatás API hooks
  const [addOktatoAdatszolgaltatas] = useAddOktatoAdatszolgaltatasMutation();
  const {
    data: oktatoAdatszolgaltatasDataFromAPI,
    isLoading: oktatoAdatszolgaltatasLoading,
  } = useGetOktatoAdatszolgaltatasQuery({
    alapadatok_id: selectedSchool?.id,
    tanev_kezdete: currentYearStart,
  });

  // Tanügyi adatok effect
  useEffect(() => {
    if (tanugyiData && !tanugyiValidationError) {
      tanugyiData.forEach((item) => {
        if (!item.uj_Szkt_agazat_tipusa || !item.uj_szkt_szakma_tipusa) {
          setTanugyiValidationError("Tanügyi adatok validáció hiba");
        }
      });

      addTanugyiAdatok({
        alapadatok_id: selectedSchool?.id,
        tanev_kezdete: currentYearStart,
        tanugyi_adatok: tanugyiData,
        userId: currentUser?.id,
      });
    }
  }, [
    tanugyiData,
    addTanugyiAdatok,
    tanugyiValidationError,
    selectedSchool,
    currentYearStart,
  ]);

  // Alkalmazott adatok effect
  useEffect(() => {
    if (alkalmazottData && !alkalmazottValidationError) {
      const oktatokData = alkalmazottData.filter((item) => {
        const munkakor = item.Munkakor || item.munkakor || "";
        return (
          munkakor.toLowerCase().includes("oktató") ||
          munkakor.toLowerCase().includes("tanár")
        );
      });

      if (oktatokData.length > 0) {
        const transformedData = oktatokData.map((item) => {
          const transformedItem = { ...item };
          if (transformedItem.TanevKezdete) {
            transformedItem.TanevKezdete =
              parseInt(transformedItem.TanevKezdete) || currentYearStart;
          } else {
            transformedItem.TanevKezdete = currentYearStart;
          }
          // ... (rest of transformation)
          if (transformedItem.KotelezoOraszama) {
            transformedItem.KotelezoOraszama =
              parseInt(String(transformedItem.KotelezoOraszama).trim()) || 0;
          } else {
            transformedItem.KotelezoOraszama = 0;
          }
          if (transformedItem.Oraszam) {
            transformedItem.Oraszam =
              parseFloat(String(transformedItem.Oraszam).trim()) || 0.0;
          } else {
            transformedItem.Oraszam = 0.0;
          }
          if (transformedItem.FeladattalTerheltOraszam) {
            transformedItem.FeladattalTerheltOraszam =
              parseFloat(
                String(transformedItem.FeladattalTerheltOraszam).trim(),
              ) || 0.0;
          } else {
            transformedItem.FeladattalTerheltOraszam = 0.0;
          }
          if (transformedItem.PedagogusHetiOraszama) {
            transformedItem.PedagogusHetiOraszama =
              parseFloat(
                String(transformedItem.PedagogusHetiOraszama).trim(),
              ) || 0.0;
          } else {
            transformedItem.PedagogusHetiOraszama = 0.0;
          }
          return transformedItem;
        });

        addAlkalmazottAdatok({
          alapadatok_id: selectedSchool?.id,
          alkalmazottak_munkaugy: transformedData,
        });
      }
    }
  }, [
    alkalmazottData,
    addAlkalmazottAdatok,
    alkalmazottValidationError,
    selectedSchool,
    currentYearStart,
  ]);

  // Tanuló adatszolgáltatás effect
  useEffect(() => {
    if (tanuloAdatszolgaltatasData && !tanuloAdatszolgaltatasValidationError) {
      addTanuloAdatszolgaltatas({
        alapadatok_id: selectedSchool?.id,
        tanev_kezdete: currentYearStart,
        tanulo_adatszolgaltatas: tanuloAdatszolgaltatasData,
      });
    }
  }, [
    tanuloAdatszolgaltatasData,
    addTanuloAdatszolgaltatas,
    tanuloAdatszolgaltatasValidationError,
    selectedSchool,
    currentYearStart,
  ]);

  // Oktató adatszolgáltatás effect
  useEffect(() => {
    if (oktatoAdatszolgaltatasData && !oktatoAdatszolgaltatasValidationError) {
      addOktatoAdatszolgaltatas({
        alapadatok_id: selectedSchool?.id,
        tanev_kezdete: currentYearStart,
        oktato_adatszolgaltatas: oktatoAdatszolgaltatasData,
      });
    }
  }, [
    oktatoAdatszolgaltatasData,
    addOktatoAdatszolgaltatas,
    oktatoAdatszolgaltatasValidationError,
    selectedSchool,
    currentYearStart,
  ]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setTanugyiValidationError(null);
    setAlkalmazottValidationError(null);
    setTanuloAdatszolgaltatasValidationError(null);
    setOktatoAdatszolgaltatasValidationError(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Nincs adat";
    try {
      return (
        dateString.split("T")[0].replace(/-/g, ".") +
        ". " +
        dateString.split("T")[1].slice(0, 8)
      );
    } catch (error) {
      console.warn("Invalid date string", dateString, error);
      return dateString;
    }
  };

  const isValidDateLike = (value) => {
    if (!value) return false;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp);
  };

  const getRecordTimestamp = (record) => {
    if (!record || typeof record !== "object") {
      return null;
    }

    const preferredKeys = [
      "createAt",
      "createdAt",
      "updatedAt",
      "create_at",
      "created_at",
      "updated_at",
      "importedAt",
      "imported_at",
      "betoltes_datuma",
      "betoltes_datum",
      "datum",
      "date",
    ];

    for (const key of preferredKeys) {
      const value = record[key];
      if (isValidDateLike(value)) {
        return value;
      }
    }

    const dynamicEntry = Object.entries(record).find(([key, value]) => {
      if (typeof value !== "string" && typeof value !== "number") {
        return false;
      }
      const looksLikeDateField =
        /(create|update|import|date|datum|ido|time)/i.test(key);
      return looksLikeDateField && isValidDateLike(value);
    });

    return dynamicEntry ? dynamicEntry[1] : null;
  };

  const toTimestampMs = (value) => {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : -1;
  };

  const getLatestLoadedDate = (records) => {
    if (!Array.isArray(records) || records.length === 0) {
      return "Nincs adat erre a tanévre";
    }

    const latestRecord = records.reduce((latest, current) => {
      const latestTs = getRecordTimestamp(latest);
      const currentTs = getRecordTimestamp(current);

      if (!latestTs) return current;
      if (!currentTs) return latest;

      return toTimestampMs(currentTs) > toTimestampMs(latestTs)
        ? current
        : latest;
    });

    const latestTimestamp = getRecordTimestamp(latestRecord);
    return latestTimestamp
      ? formatDate(latestTimestamp)
      : "Nincs dátummező az adatokban";
  };

  const isLoading =
    tanugyiLoading ||
    alkalmazottLoading ||
    tanuloAdatszolgaltatasLoading ||
    oktatoAdatszolgaltatasLoading;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {isLoading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="70vh"
        >
          <CircularProgress size={60} />
        </Box>
      ) : (
        <>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            align="center"
            sx={{ mb: 4, fontWeight: "bold" }}
          >
            Adatok Feltöltése
          </Typography>

          <Paper
            elevation={0}
            sx={{
              width: "100%",
              borderRadius: 4,
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.05)",
              border: "1px solid rgba(0,0,0,0.03)",
              overflow: "hidden"
            }}
          >
            <Tabs value={tabValue} onChange={handleTabChange}
              scrollButtons="auto"
              centered
              allowScrollButtonsMobile>
              <Tab label="Tanügyi Adatok" />
              <Tab label="Alkalmazottak Munkaugyi Adatai" />
              {/* TODO: Uncomment when done */}
              <Tab label="Tanuló Adatszolgáltatás" />
              <Tab label="Oktató Adatszolgáltatás" />
            </Tabs>

            {/* Tanügyi Adatok Tab */}
            {tabValue === 0 && (
              <Box sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>
                  Tanügyi Adatok Feltöltése
                </Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <AlertTitle>Tanügyi fájl követelmények</AlertTitle>A fájlnak
                  tartalmaznia kell az alábbi adatokat:
                  <strong>
                    Oktatási azonosítója, Osztály, Új Szkt Ágazat Tipusa, Új
                    Szkt Szakma Tipusa, Tanuló Jogviszonya{" "}
                  </strong>
                </Alert>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    <strong>Tárgyévi betöltött adatok:</strong>{" "}
                    {getLatestLoadedDate(tanugyiDataFromAPI)}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    <strong>
                      Rendszerben lévő összes adat száma erre a tanévre:
                    </strong>{" "}
                    <Chip
                      label={
                        tanugyiDataFromAPI && Array.isArray(tanugyiDataFromAPI)
                          ? tanugyiDataFromAPI.length
                          : 0
                      }
                      color="primary"
                      size="small"
                    />
                  </Typography>
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    border: "1px solid rgba(0,0,0,0.03)",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 28px 0 rgba(0,0,0,0.08)",
                    },
                  }}
                >
                  {tanugyiValidationError && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      <AlertTitle>Hibás fájltípus!</AlertTitle>
                      {tanugyiValidationError}
                    </Alert>
                  )}
                  <CustomSheetUploader
                    onFileUpload={async (data) => {
                      const headers =
                        data.length > 0 ? Object.keys(data[0]) : [];
                      const validation = validateTanugyiFile(headers);
                      if (!validation.isValid) {
                        setTanugyiValidationError(validation.error);
                        setTanugyiData(null);
                        return;
                      }
                      setTanugyiValidationError(null);
                      setTanugyiData(
                        data.map((item) => {
                          const newItem = {};
                          fields.forEach((field) => {
                            newItem[field.key] = item[field.label] || "";
                          });
                          return newItem;
                        }),
                      );
                    }}
                    onError={(error) => {
                      setTanugyiValidationError(
                        `Fájl beolvasási hiba: ${error.message || error}`,
                      );
                    }}
                    maxFileSize={5 * 1024 * 1024}
                    showPreview={true}
                    maxPreviewRows={10}
                    uploadMessage="Húzd ide a tanügyi Excel vagy CSV fájlt vagy kattints a tallózáshoz"
                    loadingMessage="Tanügyi fájl feldolgozása..."
                  />
                  {tanugyiData && !tanugyiValidationError && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      <AlertTitle>Sikeresen feldolgozva!</AlertTitle>
                      {tanugyiData.length} tanügyi adat lett feldolgozva.
                    </Alert>
                  )}
                </Paper>
              </Box>
            )}

            {/* Alkalmazottak Tab */}
            {tabValue === 1 && (
              <Box sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>
                  Alkalmazottak Munkaugyi Adatai
                </Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <AlertTitle>Fontos tudnivalók</AlertTitle>
                  • Csak azok az alkalmazottak kerülnek feltöltésre, akiknek a
                  munkakör oszlopában szerepel az "oktató" vagy "tanár" szó.
                  <br />• A fájlnak tartalmaznia kell legalább egyet az alábbi
                  oszlopok közül:
                  <strong>
                    {" "}
                    Munkakör, Pedagógus fokozat, Foglalkoztatási jogviszony,
                    Pedagógus oktatási azonosító
                  </strong>
                </Alert>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    <strong>Tárgyévi betöltött adatok:</strong>{" "}
                    {getLatestLoadedDate(alkalmazottDataFromAPI)}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    <strong>Betöltött oktatók száma erre a tanévre:</strong>{" "}
                    <Chip
                      label={
                        alkalmazottDataFromAPI &&
                          Array.isArray(alkalmazottDataFromAPI)
                          ? alkalmazottDataFromAPI.length
                          : 0
                      }
                      color="secondary"
                      size="small"
                    />
                  </Typography>
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    border: "1px solid rgba(0,0,0,0.03)",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 28px 0 rgba(0,0,0,0.08)",
                    },
                  }}
                >
                  {alkalmazottValidationError && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      <AlertTitle>Hibás fájltípus!</AlertTitle>
                      {alkalmazottValidationError}
                    </Alert>
                  )}
                  <CustomSheetUploader
                    onFileUpload={async (data) => {
                      const headers =
                        data.length > 0 ? Object.keys(data[0]) : [];
                      const validation = validateAlkalmazottFile(headers);
                      if (!validation.isValid) {
                        setAlkalmazottValidationError(validation.error);
                        setAlkalmazottData(null);
                        return;
                      }
                      setAlkalmazottValidationError(null);
                      const mappedData = mapEmployeeData(data);
                      setAlkalmazottData(mappedData);
                    }}
                    onError={(error) => {
                      setAlkalmazottValidationError(
                        `Fájl beolvasási hiba: ${error.message || error}`,
                      );
                    }}
                    maxFileSize={5 * 1024 * 1024}
                    showPreview={true}
                    maxPreviewRows={10}
                    uploadMessage="Húzd ide az alkalmazotti Excel vagy CSV fájlt vagy kattints a tallózáshoz"
                    loadingMessage="Alkalmazotti fájl feldolgozása..."
                  />
                  {alkalmazottData && !alkalmazottValidationError && (
                    <Box sx={{ mt: 2 }}>
                      <Alert severity="success">
                        <AlertTitle>Sikeresen feldolgozva!</AlertTitle>
                        {alkalmazottData.length} alkalmazotti adat lett
                        feldolgozva.
                      </Alert>
                      {alkalmazottData.filter((item) => {
                        const munkakor = item.Munkakor || item.munkakor || "";
                        return (
                          munkakor.toLowerCase().includes("oktató") ||
                          munkakor.toLowerCase().includes("tanár")
                        );
                      }).length !== alkalmazottData.length && (
                          <Alert severity="warning" sx={{ mt: 1 }}>
                            <AlertTitle>Szűrés alkalmazva</AlertTitle>
                            Csak{" "}
                            {
                              alkalmazottData.filter((item) => {
                                const munkakor =
                                  item.Munkakor || item.munkakor || "";
                                return (
                                  munkakor.toLowerCase().includes("oktató") ||
                                  munkakor.toLowerCase().includes("tanár")
                                );
                              }).length
                            }{" "}
                            oktató/tanár kerül feltöltésre a{" "}
                            {alkalmazottData.length} alkalmazottból.
                          </Alert>
                        )}
                    </Box>
                  )}
                </Paper>
              </Box>
            )}

            {/* Tanuló Adatszolgáltatás Tab */}
            {tabValue === 2 && (
              <Box sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>
                  Tanuló Adatszolgáltatás Feltöltése
                </Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <AlertTitle>Követelmények</AlertTitle>A fájlnak tartalmaznia
                  kell a tanuló adatszolgáltatáshoz szükséges oszlopokat, pl.:
                  <strong>
                    {" "}
                    Tanuló (Oktatási azonosító), Intézmény OM azonosító
                  </strong>
                </Alert>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    <strong>Tárgyévi betöltött adatok:</strong>{" "}
                    {getLatestLoadedDate(tanuloAdatszolgaltatasDataFromAPI)}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    <strong>Betöltött adatok száma erre a tanévre:</strong>{" "}
                    <Chip
                      label={
                        tanuloAdatszolgaltatasDataFromAPI &&
                          Array.isArray(tanuloAdatszolgaltatasDataFromAPI)
                          ? tanuloAdatszolgaltatasDataFromAPI.length
                          : 0
                      }
                      color="success"
                      size="small"
                    />
                  </Typography>
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    border: "1px solid rgba(0,0,0,0.03)",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 28px 0 rgba(0,0,0,0.08)",
                    },
                  }}
                >
                  {tanuloAdatszolgaltatasValidationError && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      <AlertTitle>Hibás fájltípus!</AlertTitle>
                      {tanuloAdatszolgaltatasValidationError}
                    </Alert>
                  )}
                  <CustomSheetUploader
                    onFileUpload={async (data) => {
                      const headers =
                        data.length > 0 ? Object.keys(data[0]) : [];
                      const validation =
                        validateTanuloAdatszolgaltatasFile(headers);
                      if (!validation.isValid) {
                        setTanuloAdatszolgaltatasValidationError(
                          validation.error,
                        );
                        setTanuloAdatszolgaltatasData(null);
                        return;
                      }
                      setTanuloAdatszolgaltatasValidationError(null);
                      const mappedData = mapTanuloAdatszolgaltatasData(data);
                      setTanuloAdatszolgaltatasData(mappedData);
                    }}
                    onError={(error) => {
                      setTanuloAdatszolgaltatasValidationError(
                        `Fájl beolvasási hiba: ${error.message || error}`,
                      );
                    }}
                    maxFileSize={5 * 1024 * 1024}
                    showPreview={true}
                    maxPreviewRows={10}
                    uploadMessage="Húzd ide a tanuló adatszolgáltatás Excel vagy CSV fájlt vagy kattints a tallózáshoz"
                    loadingMessage="Fájl feldolgozása..."
                  />
                  {tanuloAdatszolgaltatasData &&
                    !tanuloAdatszolgaltatasValidationError && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        <AlertTitle>Sikeresen feldolgozva!</AlertTitle>
                        {tanuloAdatszolgaltatasData.length} adat sor lett
                        feldolgozva.
                      </Alert>
                    )}
                </Paper>
              </Box>
            )}

            {/* Oktató Adatszolgáltatás Tab */}
            {tabValue === 3 && (
              <Box sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>
                  Oktató Adatszolgáltatás Feltöltése
                </Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <AlertTitle>Követelmények</AlertTitle>A fájlnak tartalmaznia
                  kell az oktató adatszolgáltatáshoz szükséges oszlopokat, pl.:
                  <strong>
                    {" "}
                    Oktató (Oktatási azonosító), Intézmény OM azonosító, Oktató
                    oktatott tárgykategória
                  </strong>
                </Alert>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    <strong>Tárgyévi betöltött adatok:</strong>{" "}
                    {getLatestLoadedDate(oktatoAdatszolgaltatasDataFromAPI)}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    <strong>Betöltött adatok száma erre a tanévre:</strong>{" "}
                    <Chip
                      label={
                        oktatoAdatszolgaltatasDataFromAPI &&
                          Array.isArray(oktatoAdatszolgaltatasDataFromAPI)
                          ? oktatoAdatszolgaltatasDataFromAPI.length
                          : 0
                      }
                      color="secondary"
                      size="small"
                    />
                  </Typography>
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    border: "1px solid rgba(0,0,0,0.03)",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 28px 0 rgba(0,0,0,0.08)",
                    },
                  }}
                >
                  {oktatoAdatszolgaltatasValidationError && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      <AlertTitle>Hibás fájltípus!</AlertTitle>
                      {oktatoAdatszolgaltatasValidationError}
                    </Alert>
                  )}
                  <CustomSheetUploader
                    onFileUpload={async (data) => {
                      const headers =
                        data.length > 0 ? Object.keys(data[0]) : [];
                      const validation =
                        validateOktatoAdatszolgaltatasFile(headers);
                      if (!validation.isValid) {
                        setOktatoAdatszolgaltatasValidationError(
                          validation.error,
                        );
                        setOktatoAdatszolgaltatasData(null);
                        return;
                      }
                      setOktatoAdatszolgaltatasValidationError(null);
                      const mappedData = mapOktatoAdatszolgaltatasData(data);
                      setOktatoAdatszolgaltatasData(mappedData);
                    }}
                    onError={(error) => {
                      setOktatoAdatszolgaltatasValidationError(
                        `Fájl beolvasási hiba: ${error.message || error}`,
                      );
                    }}
                    maxFileSize={5 * 1024 * 1024}
                    showPreview={true}
                    maxPreviewRows={10}
                    uploadMessage="Húzd ide az oktató adatszolgáltatás Excel vagy CSV fájlt vagy kattints a tallózáshoz"
                    loadingMessage="Fájl feldolgozása..."
                  />
                  {oktatoAdatszolgaltatasData &&
                    !oktatoAdatszolgaltatasValidationError && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        <AlertTitle>Sikeresen feldolgozva!</AlertTitle>
                        {oktatoAdatszolgaltatasData.length} adat sor lett
                        feldolgozva.
                      </Alert>
                    )}
                </Paper>
              </Box>
            )}
          </Paper>
        </>
      )}
    </Container>
  );
}
