import {
  Box,
  Drawer,
  Typography as Text,
  Menu,
  MenuItem,
  IconButton,
  AppBar,
  Toolbar,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  Avatar,
  Stack
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
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
  MdBugReport,
} from "react-icons/md";


import { Link, useNavigate, useLocation } from "react-router-dom";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLogoutMutation, indicatorApi } from "../store/api/apiSlice";
import {
  logout,
  selectUser,
  selectUserRole,
  selectUserPermissions,
  selectUserTableAccess,
} from "../store/slices/authSlice";
import { FiChevronDown } from "react-icons/fi";
import UserRoleBadge from "./UserRoleBadge";
import SchoolSelector from "./SchoolSelector";
import toast from "react-hot-toast";
import {
  TextField,
  InputAdornment,
  IconButton as MuiIconButton,
  Tooltip,
} from "@mui/material";
import { useRecentPages } from "../hooks/useRecentPages";
import AliasModeBanner from "./AliasModeBanner";
import PageNumbering from "../common/PageNumbering";
import BugReportDialog from "./BugReportDialog";

// Function to get the page number for a given link
const getPageNumber = (link) => {
  return PageNumbering[link] || null;
};

// Function to get the display name with page number prefix
const getDisplayName = (item) => {
  const pageNumber = getPageNumber(item.link);
  return pageNumber ? `${pageNumber}. ${item.name}` : item.name;
};

// Organized navigation items with categories
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
        name: "Szakmai vizsga",
        icon: MdAssessment,
        link: "/szakmai-vizsga",
        tableName: "szakmai_vizsga_eredmenyek",
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
        name: "Szakmai bemutatók, konferenciák",
        icon: MdEvent,
        link: "/szakmai-bemutatok-konferenciak",
        tableName: "oktato_egyeb_tev",
      },
      {
        name: "Lemorzsolódás",
        icon: MdTrendingUp,
        link: "/lemorzsolodas",
        tableName: "lemorzsolodas",
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
        name: "Szakmai továbbképzések",
        icon: MdSchool,
        link: "/szakmai-tovabbkepzesek",
        tableName: "szakmai_tovabbkepzesek",
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
        name: "Pályázatok",
        icon: MdStar,
        link: "/palyazatok",
        tableName: "palyazatok",
      },
      {
        name: "Szervezetfejlesztés",
        icon: MdStar,
        link: "/szervezetfejlesztes",
        tableName: "szervezetfejlesztes",
      },
      {
        name: "Duális képzőhelyek száma",
        icon: MdStar,
        link: "/dualis-kepzohelyek-szama",
        tableName: "dualis_kepzohelyek",
      },
      {
        name: "Innovációs tevékenységek",
        icon: MdStar,
        link: "/innovacios-tevekenysegek",
        tableName: "innovacios_tevekenysegek",
      },
      {
        name: "Pályaorientáció",
        icon: MdStar,
        link: "/palyaorientacio",
        tableName: "palya_orientacio",
      },
      {
        name: "Szakképzés zöldítése",
        icon: MdStar,
        link: "/szakkepzes-zolditese",
        tableName: "szakkepzes_zolditese",
      },
      {
        name: "Digitális kompetencia",
        icon: MdStar,
        link: "/digitalis-kompetencia",
        tableName: "digitalis_kompetencia",
      },
      {
        name: "Együttműködések száma",
        icon: MdStar,
        link: "/egyuttmukudesek-szama",
        tableName: "egyuttmukudesek_szama",
      },
      {
        name: "Tanulmányi eredmény",
        icon: MdSchool,
        link: "/tanulmani-eredmeny",
        tableName: "tanulmanyi_eredmeny",
      },
      {
        name: "Hiányzás",
        icon: MdEvent,
        link: "/hianyzas",
        tableName: "hianyzas",
      },
      {
        name: "Projektek",
        icon: MdWork,
        link: "/projektek",
        tableName: "projektek",
      },
      {
        name: "Nyelvvizsgák száma",
        icon: MdSchool,
        link: "/nyelvvizsgak-szama",
        tableName: "nyelvvizsgak_szama",
      },
    ],
  },
  // EDUCATION: {
  //   name: "Oktatási eredmények",
  //   icon: MdAssessment,
  //   items: [
  //     {
  //       name: "Kompetencia",
  //       icon: MdBook,
  //       link: "/kompetencia",
  //       tableName: "kompetencia",
  //     },
  //     {
  //       name: "Országos kompetenciamérés",
  //       icon: MdAssessment,
  //       link: "/orszagos-kompetenciameres",
  //       tableName: "kompetencia",
  //     },
  //     {
  //       name: "NSZFH mérések",
  //       icon: MdAssessment,
  //       link: "/nszfh-meresek",
  //       tableName: "nszfh",
  //     },
  //     {
  //       name: "Vizsgaeredmények",
  //       icon: MdAssessment,
  //       link: "/vizsgaeredmenyek",
  //       tableName: "vizsgaeredmenyek",
  //     },
  //     {
  //       name: "Elégedettség mérés",
  //       icon: MdAssessment,
  //       link: "/elegedettseg-meres-eredmenyei",
  //       tableName: "elegedettseg_meres",
  //     },
  //   ],
  // },
  // ACHIEVEMENTS: {
  //   name: "Eredmények és elismerések",
  //   icon: MdStar,
  //   items: [
  //     {
  //       name: "Versenyek",
  //       icon: MdStar,
  //       link: "/versenyek",
  //       tableName: "versenyek",
  //     },
  //     {
  //       name: "Intézményi elismerések",
  //       icon: MdStar,
  //       link: "/intezmenyi-elismeresek",
  //       tableName: "intezmenyi_nevelesi_mutatok",
  //     },
  //   ],
  // },
  // CAREER: {
  //   name: "Pályakövetés",
  //   icon: MdWork,
  //   items: [
  //     {
  //       name: "Elhelyezkedési mutató",
  //       icon: MdAssessment,
  //       link: "/elhelyezkedesi-mutato",
  //       tableName: "elhelyezkedes",
  //     },
  //     {
  //       name: "Végzettek elégedettsége",
  //       icon: MdStar,
  //       link: "/vegzettek-elegedettsege",
  //       tableName: "elegedettseg",
  //     },
  //     {
  //       name: "Szakképzési munkaszerződés - SZMSZ",
  //       icon: MdWork,
  //       link: "/szakkepzesi-munkaszerződes-arany",
  //       tableName: "szmsz",
  //     },
  //   ],
  // },
  // PROGRAMS: {
  //   name: "Speciális programok",
  //   icon: MdTrendingUp,
  //   items: [
  //     {
  //       name: "Felnőttképzés",
  //       icon: MdBook,
  //       link: "/felnottkepzes",
  //       tableName: "alkalmazottak_munkaugy",
  //     },
  //     {
  //       name: "Műhelyiskola",
  //       icon: MdSchool,
  //       link: "/muhelyiskolai-reszszakmat",
  //       tableName: "muhelyiskola",
  //     },
  //     {
  //       name: "Dobbantó program",
  //       icon: MdTrendingUp,
  //       link: "/dobbanto-program-aranya",
  //       tableName: "dobbanto",
  //     },
  //     {
  //       name: "Intézményi nevelési mutatók",
  //       icon: MdGavel,
  //       link: "/intezmenyi-nevelesi-mutatok",
  //       tableName: "intezmenyi_nevelesi_mutatok",
  //     },
  //   ],
  // },
  // EVENTS: {
  //   name: "Események és aktivitás",
  //   icon: MdEvent,
  //   items: [
  //     {
  //       name: "Egy oktatóra jutó diákok",
  //       icon: MdBookmark,
  //       link: "/oktato_per_diak",
  //       tableName: "egy_oktatora_juto_tanulo",
  //     },
  //     {
  //       name: "Egy oktatóra jutó össz diák",
  //       icon: MdBookmark,
  //       link: "/egy-oktatora-juto-ossz-diak",
  //       tableName: "egy_oktatora_juto_tanulo",
  //     },
  //     {
  //       name: "Oktatók egyéb tev.",
  //       icon: MdWork,
  //       link: "/oktato-egyeb-tev",
  //       tableName: "oktato-egyeb-tev",
  //     },
  //   ],
  // },
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

// Flatten all items for backwards compatibility
const AllLinkItems = Object.values(NavigationCategories).reduce(
  (acc, category) => {
    return [...acc, ...category.items];
  },
  [],
);

// Function to filter navigation items based on user's table access
const getAccessibleNavItems = (tableAccess, userPermissions) => {
  // Superadmin bypasses all permission checks and gets all items
  if (userPermissions?.isSuperadmin) {
    return AllLinkItems;
  }

  if (!tableAccess || !Array.isArray(tableAccess) || tableAccess.length === 0) {
    // If no table access info, only show dashboard
    return AllLinkItems.filter((item) => item.link === "/dashboard");
  }

  const accessibleTableNames = tableAccess.map((access) => access.tableName);

  return AllLinkItems.filter((item) => {
    // Always show dashboard
    if (item.link === "/dashboard") {
      return true;
    }

    // For items without tableName, apply special rules
    if (item.tableName === null) {
      // Data import - check if user has admin permissions or access to any data tables
      if (item.link === "/adat-import") {
        return (
          userPermissions?.isAdmin ||
          userPermissions?.isSuperadmin ||
          accessibleTableNames.some((name) =>
            [
              "alapadatok",
              "tanulo_letszam",
              "kompetencia",
              "tanugyi_adatok",
            ].includes(name),
          )
        );
      }

      // Table management - only for superadmins
      if (item.link === "/table-management") {
        return (
          userPermissions?.isSuperadmin ||
          (userPermissions?.isHSZC && userPermissions?.isAdmin)
        );
      }

      // Alapadatok - only if user has alapadatok table access
      if (item.link === "/alapadatok") {
        return accessibleTableNames.includes("alapadatok");
      }

      // Schools - only if user has alapadatok table access
      if (item.link === "/schools") {
        return accessibleTableNames.includes("alapadatok");
      }

      // For other items without tableName, don't show them unless explicitly handled above
      return false;
    }

    // Special case for logs - only superadmins can access
    if (item.tableName === "log") {
      return userPermissions?.isSuperadmin;
    }

    // Special case for users - check both superadmin and table access
    if (item.tableName === "user") {
      return (
        userPermissions?.isSuperadmin || accessibleTableNames.includes("user")
      );
    }

    // Show items that the user has table access to
    return accessibleTableNames.includes(item.tableName);
  });
};

// Function to organize accessible items by categories
const getOrganizedAccessibleItems = (tableAccess, userPermissions) => {
  const accessibleItems = getAccessibleNavItems(tableAccess, userPermissions);
  const organizedCategories = {};

  // Group accessible items by category
  Object.entries(NavigationCategories).forEach(([categoryKey, category]) => {
    const categoryItems = category.items.filter((item) =>
      accessibleItems.some((accessible) => accessible.link === item.link),
    );

    if (categoryItems.length > 0) {
      // Sort category items by page number
      const sortedCategoryItems = categoryItems.sort((a, b) => {
        const aNumber = getPageNumber(a.link);
        const bNumber = getPageNumber(b.link);

        // Items with page numbers come first, sorted numerically
        if (aNumber && bNumber) return aNumber - bNumber;
        if (aNumber && !bNumber) return -1;
        if (!aNumber && bNumber) return 1;

        // If neither has a page number, sort alphabetically
        return a.name.localeCompare(b.name);
      });

      organizedCategories[categoryKey] = {
        ...category,
        items: sortedCategoryItems,
      };
    }
  });

  return organizedCategories;
};

const SidebarContent = ({ onClose, ...rest }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [itemSearch, setItemSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState(() => {
    // Check if we have saved state
    try {
      const saved = sessionStorage.getItem('navExpandedCategories');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error reading nav state", e);
    }

    let currentPath = decodeURIComponent(location.pathname);
    if (currentPath !== "/" && currentPath.endsWith("/")) {
      currentPath = currentPath.slice(0, -1);
    }

    const initialState = {
      GENERAL: false,
      FIXED_GENERAL: false,
      INDICATORS: true,
    };

    // Determine if FIXED_GENERAL should be open
    const isFixedItem = [
      "/dashboard", "/alapadatok", "/adat-import",
      "/schools", "/users", "/logs"
    ].includes(currentPath);

    if (isFixedItem) {
      initialState.FIXED_GENERAL = true;
    }

    // Determine if any dynamic category should be open
    Object.entries(NavigationCategories).forEach(([categoryKey, category]) => {
      const hasActiveItem = category.items.some(
        (item) => item.link === currentPath,
      );
      if (hasActiveItem) {
        initialState[categoryKey] = true;
      }
    });

    return initialState;
  });

  // Save state whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem('navExpandedCategories', JSON.stringify(expandedCategories));
    } catch (e) {
      // ignore
    }
  }, [expandedCategories]);

  const tableAccess = useSelector(selectUserTableAccess);
  const userPermissions = useSelector(selectUserPermissions);


  // Add keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Only trigger shortcuts when not in an input field
      if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA"
      ) {
        return;
      }

      // Ctrl/Cmd + K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        const searchInput = document.querySelector(
          'input[placeholder*="Keresés"]',
        );
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Escape to clear search or close mobile menu
      if (event.key === "Escape") {
        if (itemSearch) {
          setItemSearch("");
        } else if (onClose) {
          onClose();
        }
      }

      // Ctrl/Cmd + H to go to dashboard
      if ((event.ctrlKey || event.metaKey) && event.key === "h") {
        event.preventDefault();
        navigate("/dashboard");
        if (onClose) onClose();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [itemSearch, navigate, onClose]);

  // Get navigation items that the user has access to
  const accessibleNavItems = useMemo(() => {
    return getAccessibleNavItems(tableAccess, userPermissions);
  }, [tableAccess, userPermissions]);

  // Initialize recent pages hook
  useRecentPages(NavigationCategories);

  // Separate fixed items (first 5) and scrollable items - memoized to prevent infinite re-renders
  const fixedItems = useMemo(() => {
    const items = accessibleNavItems.filter(
      (item) =>
        item.link === "/dashboard" ||
        item.link === "/alapadatok" ||
        item.link === "/adat-import" ||
        item.link === "/schools" ||
        item.link === "/users" ||
        item.link === "/logs",
    );

    return items;
  }, [accessibleNavItems]);

  // Get organized categories
  const organizedCategories = useMemo(() => {
    return getOrganizedAccessibleItems(tableAccess, userPermissions);
  }, [tableAccess, userPermissions]);

  // Find which category contains the current active page and expand it
  useEffect(() => {
    let currentPath = decodeURIComponent(location.pathname);
    if (currentPath !== "/" && currentPath.endsWith("/")) {
      currentPath = currentPath.slice(0, -1);
    }

    let activeCategoryKey = null;

    // Check if current path is in fixed items
    const isInFixedItems = fixedItems.some((item) => item.link === currentPath);
    if (isInFixedItems) {
      // Az "Általános" részleget mindig nyitva tartjuk, ha valamelyik aloldalán vagyunk
      setExpandedCategories((prev) => {
        if (prev.FIXED_GENERAL) return prev;
        return {
          ...prev,
          FIXED_GENERAL: true,
        };
      });
      return;
    }

    // Find the category that contains the current path
    Object.entries(NavigationCategories).forEach(([categoryKey, category]) => {
      const hasActiveItem = category.items.some(
        (item) => item.link === currentPath,
      );
      if (hasActiveItem) {
        activeCategoryKey = categoryKey;
      }
    });

    // If we found an active category, expand it
    if (activeCategoryKey) {
      setExpandedCategories((prev) => {
        if (prev[activeCategoryKey]) return prev;
        return {
          ...prev,
          [activeCategoryKey]: true,
        };
      });
    }
  }, [fixedItems, location.pathname]);

  // Helper function to check if a category contains the active page
  const isCategoryActive = (categoryKey) => {
    const category = NavigationCategories[categoryKey];
    if (!category) return false;
    return category.items.some((item) => item.link === decodeURIComponent(location.pathname));
  };

  // Helper function to check if fixed general category is active
  const isFixedGeneralActive = () => {
    let currentPath = decodeURIComponent(location.pathname);
    if (currentPath !== "/" && currentPath.endsWith("/")) {
      currentPath = currentPath.slice(0, -1);
    }
    return fixedItems.some((item) => item.link === currentPath);
  };

  const scrollableItems = useMemo(() => {
    const items = accessibleNavItems.filter(
      (item) =>
        item.link !== "/dashboard" &&
        item.link !== "/alapadatok" &&
        item.link !== "/adat-import" &&
        item.link !== "/schools" &&
        item.link !== "/users" &&
        item.link !== "/logs",
    );

    // Sort scrollable items by page number
    return items.sort((a, b) => {
      const aNumber = getPageNumber(a.link);
      const bNumber = getPageNumber(b.link);

      // Items with page numbers come first, sorted numerically
      if (aNumber && bNumber) return aNumber - bNumber;
      if (aNumber && !bNumber) return -1;
      if (!aNumber && bNumber) return 1;

      // If neither has a page number, sort alphabetically
      return a.name.localeCompare(b.name);
    });
  }, [accessibleNavItems]);

  // Filter scrollable items based on search (search by name or page number)
  const filteredScrollableItems = scrollableItems.filter((item) => {
    const pageNumber = getPageNumber(item.link);
    const searchValue = itemSearch.trim();

    if (!searchValue) return true;

    // Search by name
    if (item.name.toLowerCase().includes(searchValue.toLowerCase())) {
      return true;
    }

    // Search by page number - handle both "11" and "11." formats
    if (pageNumber) {
      const pageNumberStr = pageNumber.toString();
      const searchClean = searchValue.replace(/\.$/, ""); // Remove trailing dot

      // Check if search matches the number (with or without dot)
      if (
        pageNumberStr === searchClean ||
        pageNumberStr.includes(searchClean)
      ) {
        return true;
      }

      // Also check if search with dot matches the formatted display name
      if (
        searchValue.includes(".") &&
        getDisplayName(item).toLowerCase().includes(searchValue.toLowerCase())
      ) {
        return true;
      }
    }

    return false;
  });

  // Filter categories based on search (search by name or page number)
  const filteredCategories = Object.entries(organizedCategories).reduce(
    (acc, [key, category]) => {
      // Skip the GENERAL category since its items are already shown in the fixed section
      if (key === "GENERAL") {
        return acc;
      }

      const filteredItems = category.items.filter((item) => {
        const pageNumber = getPageNumber(item.link);
        const searchValue = itemSearch.trim();

        if (!searchValue) return true;

        // Exclude fixed items
        if (fixedItems.some((fixed) => fixed.link === item.link)) {
          return false;
        }

        // Search by name
        if (item.name.toLowerCase().includes(searchValue.toLowerCase())) {
          return true;
        }

        // Search by page number - handle both "11" and "11." formats
        if (pageNumber) {
          const pageNumberStr = pageNumber.toString();
          const searchClean = searchValue.replace(/\.$/, ""); // Remove trailing dot

          // Check if search matches the number (with or without dot)
          if (
            pageNumberStr === searchClean ||
            pageNumberStr.includes(searchClean)
          ) {
            return true;
          }

          // Also check if search with dot matches the formatted display name
          if (
            searchValue.includes(".") &&
            getDisplayName(item)
              .toLowerCase()
              .includes(searchValue.toLowerCase())
          ) {
            return true;
          }
        }

        return false;
      });

      if (filteredItems.length > 0) {
        acc[key] = { ...category, items: filteredItems };
      }
      return acc;
    },
    {},
  );

  const toggleCategory = (categoryKey) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  return (
    <Box
      sx={{
        transition: "all 0.3s ease-in-out",
        borderRight: "1px solid",
        borderColor: "divider",
        width: { xs: "100%", md: 256 },
        position: "fixed",
        height: "100vh",
        bgcolor: "background.paper",
        boxShadow: { xs: 1, md: 3 },
        zIndex: 1000,
        display: "flex",
        flexDirection: "column"
      }}
      {...rest}
    >
      <Box sx={{ bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
        <Box sx={{ height: 80, display: "flex", alignItems: "center", mx: 3, justifyContent: "space-between" }}>
          <Box component={Link} to="/dashboard" onClick={onClose} sx={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img
              src="https://cms.hodmezovasarhelyi.szc.edir.hu/uploads/HSZC_logo_color_tomb_k_4b19d45dc7.png"
              alt="HSZC Logo"
              style={{ maxWidth: "140px", height: "auto", objectFit: "contain", transition: "all 0.2s ease-in-out" }}
            />
          </Box>
          <IconButton sx={{ display: { xs: "flex", md: "none" } }} onClick={onClose} size="small">
            <MdClose />
          </IconButton>
        </Box>

        <Box sx={{ mx: 2, my: 2 }}>
          <TextField
            placeholder="Keresés... (Ctrl+K)"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            size="small"
            fullWidth
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                transition: "all 0.2s ease-in-out",
                backgroundColor: "rgba(0,0,0,0.02)",
                "&:hover": { boxShadow: "0 2px 8px rgba(0,0,0,0.1)", backgroundColor: "rgba(0,0,0,0.03)" },
                "&.Mui-focused": { boxShadow: "0 2px 12px rgba(66, 153, 225, 0.3)", backgroundColor: "white" },
              },
              "& .MuiOutlinedInput-input": { fontSize: "14px" },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MdSearch style={{ color: itemSearch ? "#4299E1" : "#9CA3AF" }} />
                </InputAdornment>
              ),
              endAdornment: itemSearch !== "" ? (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Keresés törlése"
                    onClick={() => {
                      setItemSearch("");
                      setTimeout(() => {
                        const searchInput = document.querySelector('input[placeholder*="Keresés"]');
                        if (searchInput) searchInput.focus();
                      }, 100);
                    }}
                    edge="end"
                    size="small"
                    sx={{ color: "gray.500", transition: "all 0.2s ease-in-out", "&:hover": { color: "error.main", bgcolor: "error.light", transform: "scale(1.1)" } }}
                  >
                    <MdClose />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          {itemSearch && (
            <Text variant="caption" sx={{ color: "text.secondary", mt: 1, ml: 1, display: "block" }}>
              {Object.keys(filteredCategories).length === 0 && filteredScrollableItems.length === 0
                ? "Nincs találat"
                : `${filteredScrollableItems.length} találat`}
            </Text>
          )}
        </Box>

        <Box sx={{ mb: 1 }}>
          <ListItemButton
            onClick={() => toggleCategory("FIXED_GENERAL")}
            sx={{
              mx: 2, p: 1.5, borderRadius: 3, transition: "all 0.2s ease-in-out",
              bgcolor: isFixedGeneralActive() ? "primary.50" : "grey.50",
              "&:hover": { bgcolor: isFixedGeneralActive() ? "primary.100" : "grey.100", transform: "translateY(-1px)", boxShadow: 1 }
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: isFixedGeneralActive() ? "primary.main" : "grey.600" }}>
              <MdHome size={20} />
            </ListItemIcon>
            <ListItemText
              primary="Általános"
              primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: isFixedGeneralActive() ? 700 : 600, color: isFixedGeneralActive() ? "primary.main" : "text.primary" }}
            />
            <FiChevronDown style={{ transform: expandedCategories["FIXED_GENERAL"] ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s", color: isFixedGeneralActive() ? "#1976d2" : "#9e9e9e" }} />
          </ListItemButton>

          <Collapse in={expandedCategories["FIXED_GENERAL"]} timeout="auto" unmountOnExit={false} appear={false}>
            <List component="div" disablePadding sx={{ mt: 0.5 }}>
              {fixedItems.map((link) => (
                <NavItem key={link.name} icon={link.icon} to={link.link} link={link.link} onClick={() => onClose()}>
                  {getDisplayName(link)}
                </NavItem>
              ))}
            </List>
          </Collapse>
        </Box>

        {filteredScrollableItems.length > 0 && (
          <Box sx={{ mx: 2, my: 1 }}>
            <Divider />
          </Box>
        )}
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          scrollBehavior: "smooth",
          pb: 2,
          pt: 1,
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": { background: "rgba(0,0,0,0.15)", borderRadius: "10px", "&:hover": { background: "rgba(0,0,0,0.25)" } },
        }}
      >
        {!itemSearch
          ? Object.entries(filteredCategories).map(([categoryKey, category]) => (
            <Box key={categoryKey} sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => toggleCategory(categoryKey)}
                sx={{
                  mx: 2, p: 1.5, borderRadius: 3, transition: "all 0.2s ease-in-out",
                  bgcolor: isCategoryActive(categoryKey) ? "primary.50" : "transparent",
                  "&:hover": { bgcolor: isCategoryActive(categoryKey) ? "primary.100" : "grey.50" }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isCategoryActive(categoryKey) ? "primary.main" : "grey.600" }}>
                  {React.createElement(category.icon, { size: 20 })}
                </ListItemIcon>
                <ListItemText
                  primary={category.name}
                  primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: isCategoryActive(categoryKey) ? 700 : 600, color: isCategoryActive(categoryKey) ? "primary.main" : "text.primary" }}
                />
                <FiChevronDown style={{ transform: expandedCategories[categoryKey] ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s", color: isCategoryActive(categoryKey) ? "#1976d2" : "#9e9e9e" }} />
              </ListItemButton>

              <Collapse in={expandedCategories[categoryKey]} timeout="auto" unmountOnExit appear={false}>
                <List component="div" disablePadding sx={{ mt: 0.5 }}>
                  {category.items.map((link) => (
                    <NavItem key={link.name} icon={link.icon} to={link.link} link={link.link} onClick={() => onClose()}>
                      {getDisplayName(link)}
                    </NavItem>
                  ))}
                </List>
              </Collapse>
            </Box>
          ))
          : filteredScrollableItems
            .sort((a, b) => {
              const searchValue = itemSearch.trim();
              const searchClean = searchValue.replace(/\.$/, "");
              if (searchClean && !isNaN(searchClean)) {
                const aNumber = getPageNumber(a.link);
                const bNumber = getPageNumber(b.link);
                const searchNum = parseInt(searchClean);
                if (aNumber === searchNum && bNumber !== searchNum) return -1;
                if (bNumber === searchNum && aNumber !== searchNum) return 1;
                if (aNumber && bNumber) return aNumber - bNumber;
                if (aNumber && !bNumber) return -1;
                if (!aNumber && bNumber) return 1;
              }
              return a.name.localeCompare(b.name);
            })
            .map((link) => (
              <NavItem key={link.name} icon={link.icon} to={link.link} link={link.link} onClick={() => onClose()}>
                {getDisplayName(link)}
              </NavItem>
            ))}

        {itemSearch && Object.keys(filteredCategories).length === 0 && filteredScrollableItems.length === 0 && (
          <Box sx={{ mx: 2, my: 1 }}>
            <Text variant="body2" color="text.secondary">Nincs találat a keresésre</Text>
          </Box>
        )}
        {!itemSearch && Object.keys(filteredCategories).length === 0 && (
          <Box sx={{ mx: 2, my: 1 }}>
            <Text variant="body2" color="text.secondary">Nincs további elérhető menü a jogosultságai alapján</Text>
          </Box>
        )}
      </Box>

      <Box sx={{ py: 2, borderTop: "1px solid", borderColor: "divider", textAlign: "center" }}>
        <Text variant="caption" color="text.secondary">
          v{import.meta.env.PACKAGE_VERSION}
        </Text>
      </Box>
    </Box>
  );
};

const NavItem = ({ icon, children, onClick, ...rest }) => {
  const location = useLocation();
  const { to, link, ...otherProps } = rest;
  const targetLink = to || link;
  const isActive = targetLink && decodeURIComponent(location.pathname) === targetLink;

  const handleClick = (e) => {
    if (onClick) onClick(e);
  };

  const IconComponent = icon;

  return (
    <ListItemButton
      component={Link}
      to={targetLink}
      onClick={handleClick}
      selected={isActive}
      sx={{
        mx: 2,
        borderRadius: 2,
        mb: 0.5,
        p: 1.5,
        transition: "all 0.2s ease-in-out",
        ...(isActive && {
          bgcolor: "primary.50",
          borderLeft: "4px solid",
          borderColor: "primary.main",
          color: "primary.main",
          "&:hover": {
            bgcolor: "primary.100",
          }
        }),
        ...(!isActive && {
          color: "text.secondary",
          "&:hover": {
            bgcolor: "grey.50",
            transform: "translateX(4px)",
          }
        })
      }}
      {...otherProps}
    >
      {IconComponent && (
        <ListItemIcon sx={{
          minWidth: 40,
          color: isActive ? "primary.main" : "grey.500"
        }}>
          <IconComponent size={20} />
        </ListItemIcon>
      )}
      <ListItemText
        primary={children}
        primaryTypographyProps={{
          fontSize: "0.875rem",
          fontWeight: isActive ? 600 : 500,
        }}
      />
    </ListItemButton>
  );
};

const MobileNav = ({ onOpen, ...rest }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const userRole = useSelector(selectUserRole);
  const userPermissions = useSelector(selectUserPermissions);
  const [logoutMutation] = useLogoutMutation();

  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);
  const [bugReportOpen, setBugReportOpen] = useState(false);

  useRecentPages(NavigationCategories);

  const handleEmergencyLogout = useCallback(() => {
    toast("Azonnali kijelentkezés\nHelyi kijelentkezést hajt végre API hívás nélkül.", {
      icon: 'ℹ️',
      duration: 2000,
    });
    dispatch(indicatorApi.util.resetApiState());
    dispatch(logout());
    navigate("/login");
  }, [dispatch, navigate]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        handleEmergencyLogout();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleEmergencyLogout]);

  const handleLogout = async () => {
    const loadingToast = toast.loading("Kijelentkezés...");

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Logout request timed out")), 3000),
      );
      await Promise.race([logoutMutation().unwrap(), timeoutPromise]);
      toast.success("Sikeres kijelentkezés\nA szerver kijelentkeztette Önt.", {
        id: loadingToast,
        duration: 2000,
      });
    } catch (error) {
      toast("Helyi kijelentkezés\nSzerver kapcsolat megszakadt, de a helyi kijelentkezés megtörtént.", {
        icon: '⚠️',
        id: loadingToast,
        duration: 3000,
      });
    } finally {
      dispatch(indicatorApi.util.resetApiState());
      dispatch(logout());
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    }
  };

  return (
    <AppBar
      position="static"
      color="default"
      elevation={0}
      sx={{
        bgcolor: 'white',
        borderBottom: '1px solid',
        borderColor: 'divider',
        ml: { md: "256px" },
        width: { md: "calc(100% - 256px)" },
      }}
      {...rest}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onOpen}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
          <SchoolSelector />
        </Box>

        <Stack direction="row" spacing={2} alignItems="center">
          <Tooltip title="Hibabejelentés">
            <IconButton onClick={() => setBugReportOpen(true)} sx={{ bgcolor: 'error.50', color: 'error.main', '&:hover': { bgcolor: 'error.100' } }}>
              <MdBugReport size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Változások naplója">
            <IconButton component={Link} to="/changelog" sx={{ bgcolor: 'primary.50', color: 'primary.main', '&:hover': { bgcolor: 'primary.100' } }}>
              <MdHistory size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Az oldal fejlesztés alatt áll.">
            <IconButton sx={{ bgcolor: 'warning.50', color: 'warning.main', '&:hover': { bgcolor: 'warning.100' } }}>
              <MdInfo size={20} />
            </IconButton>
          </Tooltip>

          <Box onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', p: 0.5, borderRadius: 2, '&:hover': { bgcolor: 'grey.50' } }}>
            <Stack direction="column" sx={{ display: { xs: 'none', md: 'flex' }, mr: 1, alignItems: 'flex-end' }}>
              <Text variant="body2" sx={{ fontWeight: 600 }}>{user?.name || user?.email || "User"}</Text>
              <UserRoleBadge role={userRole} permissions={userPermissions} />
            </Stack>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              <MdPerson size={20} />
            </Avatar>
            <FiChevronDown style={{ marginLeft: '4px' }} />
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={openMenu}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => { setAnchorEl(null); navigate("/profile"); }}>Profil</MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); handleLogout(); }}>Kijelentkezés</MenuItem>
          </Menu>
        </Stack>
      </Toolbar>

      <BugReportDialog
        open={bugReportOpen}
        onClose={() => setBugReportOpen(false)}
      />
    </AppBar>
  );
};

export default function Navigation({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const appBackground = "#F3F4F6"; // MUI equivalent of gray.100

  return (
    <>
      <AliasModeBanner />
      <Box sx={{ minHeight: "100vh", bgcolor: appBackground }}>
        <Box sx={{ display: { xs: "none", md: "block" }, bgcolor: "white" }}>
          <SidebarContent onClose={() => setIsOpen(false)} />
        </Box>
        <Drawer
          anchor="left"
          open={isOpen}
          onClose={() => setIsOpen(false)}
          PaperProps={{
            sx: { width: { xs: "100%", sm: 300 } }
          }}
        >
          <SidebarContent onClose={() => setIsOpen(false)} />
        </Drawer>
        <MobileNav onOpen={() => setIsOpen(true)} />
        <Box sx={{ ml: { xs: 0, md: "256px" }, p: 3 }}>
          {children}
        </Box>
      </Box>
    </>
  );
}
