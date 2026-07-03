import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Stack,
  Alert,
  Collapse,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  IconButton,
} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import GroupIcon from "@mui/icons-material/Group";
import AssessmentIcon from "@mui/icons-material/Assessment";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import StarIcon from "@mui/icons-material/Star";
import WorkIcon from "@mui/icons-material/Work";
import PersonIcon from "@mui/icons-material/Person";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DataIcon from "@mui/icons-material/DataUsage";
import SettingsIcon from "@mui/icons-material/Settings";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import StorageIcon from "@mui/icons-material/Storage";
import TimerIcon from "@mui/icons-material/Timer";
import HistoryIcon from "@mui/icons-material/History";
import CloseIcon from "@mui/icons-material/Close";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import {
  MdPerson,
  MdMenu,
  MdHome,
  MdStar,
  MdBookmark,
  MdUpload,
  MdSettings,
  MdGroup,
  MdBook,
  MdSchool,
  MdAssessment,
  MdEvent,
  MdTrendingUp,
  MdGavel,
  MdWork,
  MdClose,
  MdSearch,
  MdInfo,
  MdAccessible,
  MdHistory,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import TokenDebugPanel from "../components/TokenDebugPanel";
import CacheBuster from "../components/CacheBuster";
import {
  selectUserPermissions,
  selectUserTableAccess,
  selectUser,
  selectSelectedSchool,
  selectIsInAliasMode,
  enableAliasMode,
} from "../store/slices/authSlice";
import CacheDebugPanel from "../components/CacheDebugPanel";
import { useRecentPages } from "../hooks/useRecentPages";
import AliasModeDialog from "../components/AliasModeDialog";

import { useCheckHealthQuery } from "../store/api/healthSlice";
import { useRedirectNotification } from "../hooks/useRedirectNotification";

// Import navigation categories for recent pages functionality
const NavigationCategories = {
  GENERAL: {
    name: "Általános",
    icon: MdHome,
    items: [
      { name: "Főoldal", icon: MdHome, link: "/dashboard", tableName: null },
      {
        name: "Alapadatok",
        icon: MdSettings,
        link: "/alapadatok",
        tableName: null,
      },
      {
        name: "Iskolák",
        icon: MdSchool,
        link: "/schools",
        tableName: "alapadatok",
      },
    ],
  },
  INDICATORS: {
    name: "Indikátorok",
    icon: MdGroup,
    items: [
      {
        name: "Tanulólétszám",
        icon: MdGroup,
        link: "/tanulo_letszam",
        tableName: "tanulo_letszam",
      },
      {
        name: "Felvettek száma",
        icon: MdGroup,
        link: "/felvettek_szama",
        tableName: "felvettek_szama",
      },
      {
        name: "Sajátos nevelésű (SNI)",
        icon: MdAccessible,
        link: "/sajatos-nevelesi-igenyu-tanulok-aranya",
        tableName: "sajatos_nevelesu_tanulok",
      },
      {
        name: "HH tanulók aránya",
        icon: MdAccessible,
        link: "/hatranyos-helyezu-tanulok-aranya",
        tableName: "hh_es_hhh_nevelesu_tanulok",
      },
      {
        name: "Kompetencia",
        icon: MdBook,
        link: "/kompetencia",
        tableName: "kompetencia",
      },

      {
        name: "NSZFH mérések",
        icon: MdAssessment,
        link: "/nszfh-meresek",
        tableName: "nszfh",
      },
      {
        name: "Vizsgaeredmények",
        icon: MdAssessment,
        link: "/vizsgaeredmenyek",
        tableName: "vizsgaeredmenyek",
      },
      {
        name: "Elégedettség mérés",
        icon: MdAssessment,
        link: "/elegedettseg-meres-eredmenyei",
        tableName: "elegedettseg_meres",
      },
      {
        name: "Versenyek",
        icon: MdStar,
        link: "/versenyek",
        tableName: "versenyek",
      },
      {
        name: "Intézményi elismerések",
        icon: MdStar,
        link: "/intezmenyi-elismeresek",
        tableName: "intezmenyi_nevelesi_mutatok",
      },
      {
        name: "Elhelyezkedési mutató",
        icon: MdAssessment,
        link: "/elhelyezkedesi-mutato",
        tableName: "elhelyezkedes",
      },
      {
        name: "Végzettek elégedettsége",
        icon: MdStar,
        link: "/vegzettek-elegedettsege",
        tableName: "elegedettseg",
      },
      {
        name: "Szakképzési munkaszerződés - SZMSZ",
        icon: MdWork,
        link: "/szakkepzesi-munkaszerződes-arany",
        tableName: "szmsz",
      },
      {
        name: "Felnőttképzés",
        icon: MdBook,
        link: "/felnottkepzes",
        tableName: "alkalmazottak_munkaugy",
      },
      {
        name: "Műhelyiskola",
        icon: MdSchool,
        link: "/muhelyiskolai-reszszakmat",
        tableName: "muhelyiskola",
      },
      {
        name: "Dobbantó program",
        icon: MdTrendingUp,
        link: "/dobbanto-program-aranya",
        tableName: "dobbanto",
      },
      {
        name: "Intézményi nevelési mutatók",
        icon: MdGavel,
        link: "/intezmenyi-nevelesi-mutatok",
        tableName: "intezmenyi_nevelesi_mutatok",
      },
      {
        name: "Hiányzás",
        icon: MdBookmark,
        link: "/hianyzas",
        tableName: "hianyzas",
      },
      {
        name: "Egy oktatóra jutó diákok",
        icon: MdBookmark,
        link: "/oktato_per_diak",
        tableName: "egy_oktatora_juto_tanulo",
      },
      {
        name: "Egy oktatóra jutó össz diák",
        icon: MdBookmark,
        link: "/egy-oktatora-juto-ossz-diak",
        tableName: "egy_oktatora_juto_tanulo",
      },
      {
        name: "Oktatók egyéb tev.",
        icon: MdWork,
        link: "/oktato-egyeb-tev",
        tableName: "oktato-egyeb-tev",
      },
      {
        name: "Tanulmányi eredmény",
        icon: MdSchool,
        link: "/tanulmani-eredmeny",
        tableName: "tanulmanyi_eredmeny",
      },
    ],
  },
  ADMIN: {
    name: "Adminisztráció",
    icon: MdSettings,
    items: [
      {
        name: "Adatok importálása",
        icon: MdUpload,
        link: "/adat-import",
        tableName: null,
      },
      {
        name: "Felhasználók",
        icon: MdPerson,
        link: "/users",
        tableName: "user",
      },
      {
        name: "Tábla kezelés",
        icon: MdSettings,
        link: "/table-management",
        tableName: null,
      },
      {
        name: "Rendszer naplók",
        icon: MdBookmark,
        link: "/logs",
        tableName: "log",
      },
    ],
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showDebugPanels, setShowDebugPanels] = useState(false);
  const [showAliasModeDialog, setShowAliasModeDialog] = useState(false);

  // Use redirect notification hook to handle access denied notifications
  useRedirectNotification();

  const user = useSelector(selectUser);
  const userPermissions = useSelector(selectUserPermissions);
  const tableAccess = useSelector(selectUserTableAccess);
  const selectedSchool = useSelector(selectSelectedSchool);
  const isInAliasMode = useSelector(selectIsInAliasMode);
  const selectedSchoolName =
    typeof selectedSchool === "string"
      ? selectedSchool
      : selectedSchool?.name ||
        selectedSchool?.schoolName ||
        selectedSchool?.intezmenyNev ||
        "";

  // Initialize recent pages hook
  const { recentPages, clearRecentPages, removeRecentPage } =
    useRecentPages(NavigationCategories);

  const isSuperadmin = userPermissions?.isSuperadmin || false;
  const isAdmin = userPermissions?.isAdmin || false;
  const isHSZC = userPermissions?.isHSZC || false;

  const handleEnableAliasMode = (selectedUser) => {
    dispatch(enableAliasMode(selectedUser));
  };

  const { data: healthResponse, error: healthError } = useCheckHealthQuery();

  // Extract health data from the response structure
  // Success case: healthResponse directly contains the health data
  // Error case: healthError.data contains the health data (like HTTP 503 with health info)
  const healthData = healthResponse || healthError?.data;

  useEffect(() => {
    console.log("Health check response:", healthResponse);
    console.log("Health check data:", healthData);
    console.log("Health check error:", healthError);
  }, [healthResponse, healthData, healthError]);

  // Helper functions for health data formatting
  const formatUptime = (seconds) => {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatMemory = (bytes) => {
    if (!bytes) return "N/A";
    const mb = (bytes / 1024 / 1024).toFixed(1);
    return `${mb} MB`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString("hu-HU");
  };

  // Get overall system health status
  const getSystemHealth = () => {
    if (!healthData) return { status: "unknown", color: "default" };

    // If we have health data, use it regardless of HTTP error status
    const overallStatus = healthData.status;

    // Calculate health based on available services
    const services = healthData.services || {};
    const serviceStatuses = Object.values(services);
    const totalServices = serviceStatuses.length;
    const healthyServices = serviceStatuses.filter(
      (service) => service.status === "healthy",
    ).length;
    const unhealthyServices = totalServices - healthyServices;

    // If overall status is healthy and no unhealthy services
    if (overallStatus === "healthy" && unhealthyServices === 0) {
      return { status: "healthy", color: "success" };
    } else if (unhealthyServices > 0 || overallStatus === "degraded") {
      return { status: "degraded", color: "warning" };
    } else {
      return { status: "unhealthy", color: "error" };
    }
  };

  // Quick access items based on user permissions
  const getQuickAccessItems = () => {
    const items = [];

    // Always available
    items.push({
      title: "Alapadatok",
      description: "Intézmény alapadatainak megtekintése és szerkesztése",
      icon: <SettingsIcon />,
      color: "primary",
      route: "/alapadatok",
    });

    if (tableAccess && Array.isArray(tableAccess)) {
      const accessibleTables = tableAccess.map((access) => access.tableName);

      if (accessibleTables.includes("tanulo_letszam")) {
        items.push({
          title: "Tanulólétszám",
          description: "Tanulók létszámadatainak kezelése",
          icon: <GroupIcon />,
          color: "secondary",
          route: "/tanulo_letszam",
        });
      }

      if (accessibleTables.includes("kompetencia")) {
        items.push({
          title: "Kompetenciamérés",
          description: "Kompetenciamérés eredményeinek nyomon követése",
          icon: <AssessmentIcon />,
          color: "success",
          route: "/kompetencia",
        });
      }

      if (accessibleTables.includes("versenyek")) {
        items.push({
          title: "Versenyek",
          description: "Versenyeredmények és díjak kezelése",
          icon: <StarIcon />,
          color: "warning",
          route: "/versenyek",
        });
      }

      if (accessibleTables.includes("szakmai_eredmenyek")) {
        items.push({
          title: "Szakmai eredmények",
          description: "Szakmai, közismereti és kulturális eredmények",
          icon: <TrendingUpIcon />,
          color: "info",
          route: "/versenyek",
        });
      }

      if (accessibleTables.includes("elhelyezkedesi_mutato")) {
        items.push({
          title: "Elhelyezkedési mutató",
          description: "Végzettek elhelyezkedési adatainak követése",
          icon: <WorkIcon />,
          color: "success",
          route: "/elhelyezkedesi-mutato",
        });
      }
    }

    // Admin and superadmin specific items
    if (isAdmin || isSuperadmin) {
      items.push({
        title: "Adatok importálása",
        description: "Adatok importálása a Kréta rendszerből",
        icon: <DataIcon />,
        color: "error",
        route: "/adat-import",
      });
    }

    if (isSuperadmin) {
      items.push({
        title: "Felhasználók",
        description: "Felhasználók és jogosultságok kezelése",
        icon: <PersonIcon />,
        color: "primary",
        route: "/users",
      });

      items.push({
        title: "Táblák",
        description: "Adatbázis táblák kezelése",
        icon: <SettingsIcon />,
        color: "secondary",
        route: "/table-management",
      });

      items.push({
        title: "Iskolák",
        description: "Összes iskola megtekintése és kezelése",
        icon: <SchoolIcon />,
        color: "secondary",
        route: "/schools",
      });
    }

    return items.slice(0, 8); // Limit to 8 items for better layout
  };

  const quickAccessItems = getQuickAccessItems();

  // User type description
  const getUserTypeDescription = () => {
    if (isSuperadmin)
      return "Teljes rendszerhez való hozzáférés minden funkcióval";
    if (isAdmin) return "Adminisztrátori jogosultságok az intézmény adataihoz";
    if (isHSZC) return "HSZC szintű hozzáférés több intézmény adataihoz";
    return "Alapszintű hozzáférés az intézmény adataihoz";
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 9) return "Jó reggelt";
    if (hour < 18) return "Szép napot";
    return "Jó estét";
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          mb: 4,
          background: "linear-gradient(135deg, rgba(102,126,234,0.9) 0%, rgba(118,75,162,0.9) 100%)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          color: "white",
          borderRadius: 4,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.2)",
          border: "1px solid rgba(255, 255, 255, 0.18)"
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
            position: "relative",
            zIndex: 1
          }}
        >
          <Box>
            <Typography
              variant="h3"
              component="h1"
              sx={{ fontWeight: 800, mb: 1, letterSpacing: "-0.5px" }}
            >
              {getGreeting()}, {user?.name || "Felhasználó"}!
            </Typography>
            {selectedSchoolName && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, mt: 2 }}>
                <SchoolIcon sx={{ opacity: 0.9 }} fontSize="small" />
                <Typography variant="body1" sx={{ opacity: 0.9, fontWeight: 500 }}>
                  {selectedSchoolName}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ opacity: 0.75 }} fontSize="small" />
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                {getUserTypeDescription()}
              </Typography>
            </Box>
          </Box>
          {/* Right side actions and status */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            {/* Health Chip moved here */}
            {healthData ? (
                (() => {
                  const systemHealth = getSystemHealth();
                  const statusLabels = {
                    healthy: "Rendszer online",
                    degraded: "Részleges leállás",
                    unhealthy: "Problémás",
                    unknown: "Ismeretlen",
                  };
                  return (
                    <Chip
                      label={statusLabels[systemHealth.status]}
                      color={systemHealth.color}
                      size="small"
                      icon={systemHealth.status === "healthy" ? <CheckCircleIcon /> : <ErrorIcon />}
                      sx={{ 
                        backgroundColor: "rgba(255,255,255,0.2)", 
                        color: "white", 
                        fontWeight: 600,
                        border: "1px solid rgba(255,255,255,0.3)",
                        backdropFilter: "blur(4px)",
                        '& .MuiChip-icon': { color: "white" }
                      }}
                    />
                  );
                })()
            ) : healthError ? (
              <Chip label="Offline" color="error" size="small" icon={<ErrorIcon />} />
            ) : (
              <Chip label="Ellenőrzés..." color="default" size="small" />
            )}

            {/* Alias Mode Button for Superadmins */}
            {isSuperadmin && !isInAliasMode && (
              <Button
                variant="contained"
                color="inherit"
                startIcon={<SupervisorAccountIcon />}
                onClick={() => setShowAliasModeDialog(true)}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(5px)",
                  boxShadow: "none",
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.35)",
                    boxShadow: "none",
                  },
                }}
              >
                Alias mód
              </Button>
            )}
          </Box>
        </Box>

        {/* Decorative background circles */}
        <Box sx={{
          position: 'absolute', top: -50, right: -50, width: 200, height: 200, 
          borderRadius: '50%', background: 'rgba(255,255,255,0.1)', zIndex: 0
        }} />
        <Box sx={{
          position: 'absolute', bottom: -80, right: 100, width: 150, height: 150, 
          borderRadius: '50%', background: 'rgba(255,255,255,0.05)', zIndex: 0
        }} />
      </Paper>

      {/* Alias Mode Dialog */}
      <AliasModeDialog
        open={showAliasModeDialog}
        onClose={() => setShowAliasModeDialog(false)}
        onSelectUser={handleEnableAliasMode}
      />
      {/* Recently Used Pages Section */}
      {recentPages && recentPages.length > 0 && (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 2,
              justifyContent: "space-between",
            }}
          >
            <Typography
              variant="h5"
              component="h2"
              sx={{ mb: 3, fontWeight: "bold" }}
            >
              Utoljára használt oldalak
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 4 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={clearRecentPages}
                startIcon={<CloseIcon />}
              >
                Előzmények törlése
              </Button>
            </Box>
          </Box>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            {recentPages.slice(0, 5).map((page) => {
              const categoryInfo = Object.values(NavigationCategories).find(
                (cat) => cat.items.some((item) => item.link === page.link),
              );
              const categoryName = categoryInfo?.name;

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={page.link}>
                  <Card
                    sx={{
                      height: "100%",
                      cursor: "pointer",
                      borderRadius: 3,
                      borderLeft: "4px solid",
                      borderLeftColor: "primary.main",
                      boxShadow: "0 2px 12px 0 rgba(0,0,0,0.03)",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 8px 24px 0 rgba(0,0,0,0.1)",
                      },
                    }}
                    onClick={() => navigate(page.link)}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          mb: 1.5,
                        }}
                      >
                        <Box sx={{ 
                          mr: 2, 
                          p: 1, 
                          borderRadius: 2, 
                          backgroundColor: "primary.50", 
                          color: "primary.main",
                          display: "flex" 
                        }}>
                          <HistoryIcon fontSize="small" />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="subtitle1"
                            component="h3"
                            sx={{ fontWeight: 600, lineHeight: 1.2, mb: 0.5 }}
                          >
                            {page.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            sx={{ mb: 1, fontSize: '0.8rem' }}
                          >
                            {categoryName}
                          </Typography>

                          <Typography variant="caption" color="text.disabled">
                            {page.timestamp &&
                              new Date(page.timestamp).toLocaleDateString(
                                "hu-HU",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRecentPage(page.link);
                          }}
                          sx={{ p: 0.5, opacity: 0.5, '&:hover': { opacity: 1 } }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            title: "Elérhető funkciók",
            value: quickAccessItems.length,
            icon: <DataIcon sx={{ fontSize: 40, color: "primary.main" }} />,
            color: "primary"
          },
          {
            title: "Tábla jogosultságok",
            value: tableAccess ? tableAccess.length : 0,
            icon: <AssessmentIcon sx={{ fontSize: 40, color: "success.main" }} />,
            color: "success"
          },
          {
            title: "Felhasználói szint",
            value: isSuperadmin ? "Fejlesztő" : isAdmin ? "Admin" : isHSZC ? "HSZC" : "Alapszint",
            icon: <PersonIcon sx={{ fontSize: 40, color: "info.main" }} />,
            color: "info"
          },
          {
            title: "Aktivitási index",
            value: "Kiváló",
            icon: <TrendingUpIcon sx={{ fontSize: 40, color: "warning.main" }} />,
            color: "warning"
          }
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                borderRadius: 4,
                boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                border: "1px solid rgba(0,0,0,0.03)",
                position: "relative",
                overflow: "hidden",
                "&:hover": {
                  transform: "translateY(-6px)",
                  boxShadow: "0 12px 28px 0 rgba(0,0,0,0.08)",
                  "& .stat-icon-bg": {
                    transform: "scale(1.2)",
                    opacity: 0.15
                  }
                },
              }}
            >
              <CardContent sx={{ position: "relative", zIndex: 1, p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography color="textSecondary" variant="body2" fontWeight={600} textTransform="uppercase" letterSpacing={0.5} gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    p: 1.5, 
                    borderRadius: '50%', 
                    backgroundColor: `${stat.color}.light`, 
                    display: 'flex',
                    opacity: 0.8
                  }}>
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
              {/* Decorative background shape */}
              <Box className="stat-icon-bg" sx={{
                position: "absolute",
                right: -20,
                bottom: -20,
                width: 100,
                height: 100,
                borderRadius: "50%",
                backgroundColor: `${stat.color}.main`,
                opacity: 0.05,
                transition: "all 0.4s ease",
                zIndex: 0
              }} />
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Access Section */}
      <Typography
        variant="h5"
        component="h2"
        sx={{ mb: 3, fontWeight: "bold" }}
      >
        Gyors hozzáférés
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickAccessItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <Card
              sx={{
                height: "100%",
                cursor: "pointer",
                borderRadius: 4,
                boxShadow: "0 2px 12px 0 rgba(0,0,0,0.03)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                border: "1px solid rgba(0,0,0,0.03)",
                position: "relative",
                overflow: "hidden",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 8px 24px 0 rgba(0,0,0,0.08)",
                  "& .quick-icon-bg": {
                    transform: "scale(1.5)",
                    opacity: 0.1
                  }
                },
              }}
              onClick={() => navigate(item.route)}
            >
              <CardContent sx={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", p: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2, flex: 1 }}>
                  <Box sx={{ 
                    mr: 2, 
                    p: 1.2,
                    borderRadius: 3,
                    backgroundColor: `${item.color}.50`,
                    color: `${item.color}.main`,
                    display: "flex",
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)"
                  }}>
                    {item.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" component="h3" sx={{ mb: 0.5, fontWeight: 600, fontSize: "1.05rem", lineHeight: 1.2 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ lineHeight: 1.4, fontSize: '0.85rem' }}>
                      {item.description}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "flex-start", mt: "auto" }}>
                  <Button 
                    size="small" 
                    color={item.color} 
                    sx={{ 
                      fontWeight: 600, 
                      borderRadius: 2,
                      textTransform: "none",
                      px: 2,
                      backgroundColor: `${item.color}.50`,
                      '&:hover': {
                        backgroundColor: `${item.color}.100`,
                      }
                    }}
                  >
                    Megnyitás
                  </Button>
                </Box>
              </CardContent>
              {/* Decorative hover background */}
              <Box className="quick-icon-bg" sx={{
                position: "absolute",
                left: -20,
                top: -20,
                width: 80,
                height: 80,
                borderRadius: "50%",
                backgroundColor: `${item.color}.main`,
                opacity: 0,
                transition: "all 0.4s ease",
                zIndex: 0
              }} />
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Detailed Health Status Section - Only show if health data is available */}
      {healthData && (
        <>
          <Typography
            variant="h5"
            component="h2"
            sx={{ mb: 3, fontWeight: "bold" }}
          >
            Rendszer részletek
          </Typography>

          {/* Services Overview */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: "100%",
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
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <CheckCircleIcon sx={{ mr: 1, color: "success.main" }} />
                    <Typography variant="h6">Backend Szolgáltatások</Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2" color="textSecondary">
                      Összes:
                    </Typography>
                    <Typography variant="h4" color="primary.main">
                      {healthData.services
                        ? Object.keys(healthData.services).length
                        : 0}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2" color="textSecondary">
                      Egészséges:
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color="success.main"
                    >
                      {healthData.services
                        ? Object.values(healthData.services).filter(
                          (service) => service.status === "healthy",
                        ).length
                        : 0}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="body2" color="textSecondary">
                      Problémás:
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color="error.main"
                    >
                      {healthData.services
                        ? Object.values(healthData.services).filter(
                          (service) => service.status !== "healthy",
                        ).length
                        : 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: "100%",
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
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <TimerIcon sx={{ mr: 1, color: "info.main" }} />
                    <Typography variant="h6">Gateway</Typography>
                  </Box>
                  <Typography variant="h4" sx={{ mb: 1 }}>
                    {formatUptime(healthData.gateway?.uptime || 0)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ mb: 1 }}
                  >
                    Működési idő
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {healthData.gateway?.version
                      ? `v${healthData.gateway.version}`
                      : "Verzió ismeretlen"}{" "}
                    | {healthData.gateway?.timestamp ? formatTimestamp(healthData.gateway.timestamp) : "Ismeretlen időpont"}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: "100%",
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
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <StorageIcon sx={{ mr: 1, color: "primary.main" }} />
                    <Typography variant="h6">Adatbázis</Typography>
                  </Box>
                  {(() => {
                    // Check if we have direct database info or through services
                    const directDb = healthData.database;
                    const mainService = healthData.services?.main_service;
                    const dbFromService = mainService?.healthData?.database;

                    // Use direct database info if available, otherwise try service data
                    const dbInfo = directDb || dbFromService;
                    const dbStatus = dbInfo?.status;

                    if (!dbInfo) {
                      return (
                        <Box sx={{ textAlign: "center" }}>
                          <Chip
                            label="Nincs adat"
                            color="default"
                            size="small"
                          />
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            sx={{ mt: 1 }}
                          >
                            Adatbázis információ nem elérhető
                          </Typography>
                        </Box>
                      );
                    }

                    return (
                      <>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 1,
                          }}
                        >
                          <Typography variant="body2" color="textSecondary">
                            Állapot:
                          </Typography>
                          <Chip
                            label={
                              dbStatus === "connected" || dbStatus === "healthy"
                                ? "Kapcsolódva"
                                : "Lecsatlakozva"
                            }
                            color={
                              dbStatus === "connected" || dbStatus === "healthy"
                                ? "success"
                                : "error"
                            }
                            size="small"
                          />
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Typography variant="body2" color="textSecondary">
                            Válaszidő:
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {dbInfo.responseTime || "N/A"}
                          </Typography>
                        </Box>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Individual Services */}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
            Szolgáltatások részletei
          </Typography>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            {healthData.services &&
              Object.entries(healthData.services).map(
                ([serviceName, serviceData]) => (
                  <Grid item xs={12} md={6} key={serviceName}>
                    <Card
                      sx={{
                        height: "100%",
                        borderRadius: 4,
                        boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        border:
                          serviceData.status !== "healthy"
                            ? "2px solid"
                            : "1px solid rgba(0,0,0,0.03)",
                        borderColor:
                          serviceData.status === "unhealthy"
                            ? "error.main"
                            : serviceData.status !== "healthy"
                              ? "warning.main"
                              : "rgba(0,0,0,0.03)",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: "0 12px 28px 0 rgba(0,0,0,0.08)",
                        },
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            mb: 2,
                          }}
                        >
                          <Typography variant="h6">
                            {serviceName
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Typography>
                          <Chip
                            label={
                              serviceData.status === "healthy"
                                ? "Egészséges"
                                : "Problémás"
                            }
                            color={
                              serviceData.status === "healthy"
                                ? "success"
                                : "error"
                            }
                            size="small"
                            icon={
                              serviceData.status === "healthy" ? (
                                <CheckCircleIcon />
                              ) : (
                                <ErrorIcon />
                              )
                            }
                          />
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            gutterBottom
                          >
                            Utolsó ellenőrzés:{" "}
                            {formatTimestamp(serviceData.lastCheck)}
                          </Typography>
                          {serviceData.healthData?.version && (
                            <Typography variant="body2" color="textSecondary">
                              Verzió: {serviceData.healthData.version}
                            </Typography>
                          )}
                        </Box>

                        {/* Error message for unhealthy services */}
                        {serviceData.status !== "healthy" &&
                          serviceData.error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                              <Typography variant="body2" fontWeight="bold">
                                Hiba:
                              </Typography>
                              <Typography variant="body2">
                                {serviceData.error}
                              </Typography>
                            </Alert>
                          )}

                        {/* Service-specific memory and uptime data - only show if service is healthy */}
                        {serviceData.status === "healthy" &&
                          serviceData.healthData ? (
                          <>
                            {serviceData.healthData.memory && (
                              <Box sx={{ mb: 1 }}>
                                <Typography
                                  variant="body2"
                                  fontWeight="bold"
                                  gutterBottom
                                >
                                  Memória:
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    mb: 0.5,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="textSecondary"
                                  >
                                    RSS:
                                  </Typography>
                                  <Typography variant="caption">
                                    {formatMemory(
                                      serviceData.healthData.memory.rss,
                                    )}
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="textSecondary"
                                  >
                                    Heap használt:
                                  </Typography>
                                  <Typography variant="caption">
                                    {formatMemory(
                                      serviceData.healthData.memory.heapUsed,
                                    )}
                                  </Typography>
                                </Box>
                              </Box>
                            )}

                            {serviceData.healthData.uptime && (
                              <Box>
                                <Typography
                                  variant="body2"
                                  fontWeight="bold"
                                  gutterBottom
                                >
                                  Működési idő:{" "}
                                  {formatUptime(serviceData.healthData.uptime)}
                                </Typography>
                              </Box>
                            )}
                          </>
                        ) : (
                          serviceData.status !== "healthy" && (
                            <Box sx={{ textAlign: "center", py: 2 }}>
                              <ErrorIcon
                                sx={{
                                  fontSize: 48,
                                  color: "error.main",
                                  mb: 1,
                                }}
                              />
                              <Typography variant="body2" color="error">
                                A szolgáltatás nem elérhető
                              </Typography>
                              <Typography
                                variant="caption"
                                color="textSecondary"
                              >
                                Memória és működési idő adatok nem elérhetők
                              </Typography>
                            </Box>
                          )
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ),
              )}
          </Grid>
        </>
      )}

      {/* Health Error Alert - Only show if no health data is available */}
      {healthError && !healthData && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body1" fontWeight="bold">
            Rendszer állapot ellenőrzése sikertelen
          </Typography>
          <Typography variant="body2">
            A backend szerver nem elérhető vagy hibás válaszokat ad.
          </Typography>
        </Alert>
      )}

      {/* HTTP Error but with Health Data Alert */}
      {healthError && healthData && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body1" fontWeight="bold">
            Rendszer állapot problémás (HTTP {healthError.status || "hiba"})
          </Typography>
          <Typography variant="body2">
            A backend szerver hibás válaszokat ad, de részleges
            állapotinformációk elérhetők.
          </Typography>
        </Alert>
      )}

      {/* Degraded System Alert */}
      {healthData && healthData.status === "degraded" && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body1" fontWeight="bold">
            Részlegesen működő rendszer
          </Typography>
          <Typography variant="body2">
            Egy vagy több szolgáltatás nem működik megfelelően.
            {healthData.services &&
              ` ${Object.values(healthData.services).filter(
                (service) => service.status !== "healthy",
              ).length
              } szolgáltatás problémás a ${Object.keys(healthData.services).length
              } szolgáltatásból.`}
          </Typography>
        </Alert>
      )}

      {/* Recent Activity / Instructions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: "100%",
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
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Használati útmutató
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <SchoolIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Alapadatok"
                    secondary="Kezdje az intézmény alapadatainak ellenőrzésével és frissítésével"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <GroupIcon color="secondary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Tanulói adatok"
                    secondary="Vigye fel vagy importálja a tanulói létszám adatokat"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AssessmentIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Eredmények"
                    secondary="Rögzítse a különböző mérések és versenyek eredményeit"
                  />
                </ListItem>
                {(isAdmin || isSuperadmin) && (
                  <ListItem>
                    <ListItemIcon>
                      <DataIcon color="error" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Adatimport"
                      secondary="Importáljon adatokat közvetlenül a Kréta rendszerből"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: "100%",
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
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Jogosultságok
              </Typography>
              {tableAccess && tableAccess.length > 0 ? (
                <Stack spacing={1}>
                  {tableAccess.slice(0, 5).map((access, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="body2">
                        {access.tableName}
                      </Typography>
                      <Stack direction="row" spacing={0.5}>
                        {access.permissionsDetails?.canRead && (
                          <Chip label="Olvasás" size="small" color="info" />
                        )}
                        {access.permissionsDetails?.canCreate && (
                          <Chip
                            label="Létrehozás"
                            size="small"
                            color="success"
                          />
                        )}
                        {access.permissionsDetails?.canUpdate && (
                          <Chip
                            label="Módosítás"
                            size="small"
                            color="warning"
                          />
                        )}
                        {access.permissionsDetails?.canDelete && (
                          <Chip label="Törlés" size="small" color="error" />
                        )}
                      </Stack>
                    </Box>
                  ))}
                  {tableAccess.length > 5 && (
                    <Typography variant="body2" color="textSecondary">
                      ... és még {tableAccess.length - 5} jogosultság
                    </Typography>
                  )}
                </Stack>
              ) : (
                <Alert severity="info">
                  Nincsenek specifikus tábla jogosultságok beállítva.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Debug Panel Section - Only for privileged users */}
      {(isSuperadmin || isAdmin) && (
        <Card
          sx={{
            mb: 3,
            borderRadius: 4,
            boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)",
            border: "1px solid rgba(0,0,0,0.03)",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography variant="h6">Fejlesztői eszközök</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={showDebugPanels}
                    onChange={(e) => setShowDebugPanels(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  showDebugPanels
                    ? "Debug panel elrejtése"
                    : "Debug panel megjelenítése"
                }
              />
            </Box>

            <Collapse in={showDebugPanels}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Ezek a eszközök csak fejlesztési és hibakeresési célokra
                szolgálnak.
              </Alert>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <Typography variant="h6" component="h3">
                    Gyorsítótár kezelés:
                  </Typography>
                  <CacheBuster />
                </Box>
                <TokenDebugPanel />
                <CacheDebugPanel />
              </Box>
            </Collapse>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
