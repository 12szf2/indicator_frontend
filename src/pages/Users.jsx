import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  CircularProgress,
  Stack,
  Container,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import GroupIcon from "@mui/icons-material/Group";
import { useState } from "react";
import NotificationSnackbar from "../components/shared/NotificationSnackbar";
import { useUserManagement } from "../hooks/useUserManagement";
import {
  EditUserDialog,
  DeleteUserDialog,
  ColumnVisibilitySelector,
  TableDensitySelector,
  TableResizeControls,
  UserTable,
  TablePagination,
  Disable2FADialog,
} from "../components/UserTable";
import CreateUserDialog from "../components/CreateUserDialog";

const Users = () => {
  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showNotification = (message, severity = "success") => {
    setNotification({ open: true, message, severity });
  };

  const closeNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const {
    table,
    globalFilter,
    setGlobalFilter,
    openModify,
    setOpenModify,
    openCreate,
    setOpenCreate,
    open,
    selectedUser,
    fullScreen,
    hiddenColumns,
    setHiddenColumns,
    density,
    setDensity,
    isLoading,
    userPermissions,
    handleModify,
    handleCreateUser,
    handleCreate,
    handleDeactivateConfirm,
    handleClose,
    handleResetColumnSizing,
    openDisable2FA,
    setOpenDisable2FA,
    selectedUserFor2FA,
    handleDisable2FAConfirm,
    isDisabling2FA,
  } = useUserManagement();

  // Wrapped handlers with notification
  const handleCreateWithNotification = () => {
    const result = handleCreate();
    if (result.error) {
      showNotification(result.error, "error");
    }
  };

  const handleCreateUserWithNotification = async (newUser) => {
    const result = await handleCreateUser(newUser);
    if (result.error) {
      showNotification(result.error, "error");
    } else if (result.success) {
      showNotification(result.message || "Felhasználó sikeresen létrehozva!");
    }
  };

  const handleModifyWithNotification = async (modifiedUser) => {
    const result = await handleModify(modifiedUser);
    if (result.error) {
      showNotification(result.error, "error");
    } else if (result.success) {
      showNotification(result.message || "Felhasználó sikeresen módosítva!");
    }
  };

  const handleDeactivateConfirmWithNotification = async () => {
    const result = await handleDeactivateConfirm();
    if (result.error) {
      showNotification(result.error, "error");
    } else if (result.success) {
      showNotification(result.message || "Felhasználó sikeresen inaktiválva!");
    }
  };

  const handleDisable2FAConfirmWithNotification = async () => {
    const result = await handleDisable2FAConfirm();
    if (result.error) {
      showNotification(result.error, "error");
    } else if (result.success) {
      showNotification(result.message || "2FA sikeresen kikapcsolva!");
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Felhasználók betöltése...
        </Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ borderRadius: "16px 16px 0 0", pb: 8, bgcolor: "background.default", minHeight: "100vh" }}>
      {/* Premium Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
          pt: { xs: 8, md: 10 },
          pb: { xs: 8, md: 12 },
          px: 2,
          position: "relative",
          overflow: "hidden",
          borderRadius: "16px 16px 0 0",
        }}
      >
        <Box sx={{
          position: "absolute", top: -50, right: -50, width: 300, height: 300,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)"
        }} />
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", gap: 3, position: "relative", zIndex: 1, color: "white" }}>
            <Box sx={{ p: 2, bgcolor: "rgba(255,255,255,0.15)", borderRadius: 3, backdropFilter: "blur(10px)" }}>
              <GroupIcon sx={{ fontSize: 40 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="700" gutterBottom>
                Felhasználók Kezelése
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                Kezeld a rendszerhez tartozó felhasználói fiókokat és jogosultságokat
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ mt: { xs: -4, md: -6 }, position: "relative", zIndex: 2 }}>

        <CreateUserDialog
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          onSave={handleCreateUserWithNotification}
          userPermissions={userPermissions}
        />

        <EditUserDialog
          open={openModify}
          onClose={() => setOpenModify(false)}
          user={selectedUser}
          onSave={handleModifyWithNotification}
          fullScreen={fullScreen}
          userPermissions={userPermissions}
        />

        <DeleteUserDialog
          open={open}
          onClose={handleClose}
          user={selectedUser}
          onDelete={handleDeactivateConfirmWithNotification}
          isDeactivation={true}
        />

        <Disable2FADialog
          open={openDisable2FA}
          onClose={() => setOpenDisable2FA(false)}
          user={selectedUserFor2FA}
          onDisable2FA={handleDisable2FAConfirmWithNotification}
          isLoading={isDisabling2FA}
        />

        {/* Main Content Card */}
        <Card sx={{ boxShadow: "0 4px 20px rgba(0,0,0,0.05)", borderRadius: 4, overflow: "visible" }}>
          <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            {/* Header with Search and Actions */}

            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={3}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", lg: "center" }}
              sx={{ mb: 4 }}
            >
              {/* Left Side: Column Visibility, Density, Width */}
              <Box
                sx={{
                  display: "flex",
                  flexWrap: { xs: "wrap", md: "nowrap" },
                  alignItems: "center",
                  gap: 2,
                  flexGrow: 1,
                  mb: { xs: 1, md: 0 },
                }}
              >
                {" "}
                <ColumnVisibilitySelector
                  table={table}
                  hiddenColumns={hiddenColumns}
                  setHiddenColumns={setHiddenColumns}
                />
                <TableDensitySelector
                  density={density}
                  onDensityChange={setDensity}
                />
                <TableResizeControls
                  table={table}
                  onResetColumnSizing={handleResetColumnSizing}
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexWrap: "wrap",
                  flexGrow: 1,
                  justifyContent: "flex-end",
                }}
              >
                <TextField
                  variant="outlined"
                  size="medium"
                  placeholder="Keresés a lekérdezett adatok között"
                  value={globalFilter ?? ""}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  sx={{
                    minWidth: { xs: "100%", sm: "300px" },
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "#f8f9fa",
                    },
                  }}
                />
                {userPermissions.getAvailableUserTypes().length > 0 && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateWithNotification}
                    sx={{
                      minWidth: "160px",
                      height: "56px",
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Új felhasználó
                  </Button>
                )}
              </Box>
            </Stack>

            {/* Table Card */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <UserTable table={table} density={density} />
            </Card>

            {/* Pagination */}
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <TablePagination table={table} />
            </Box>
          </CardContent>
        </Card>
      </Container>
      <NotificationSnackbar
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={closeNotification}
      />
    </Box>
  );
};

export default Users;
