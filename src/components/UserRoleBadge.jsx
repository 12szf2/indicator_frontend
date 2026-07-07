import { Box, Chip } from "@mui/material";

const UserRoleBadge = ({ role, permissions }) => {
  const getDisplayRole = (role, permissions) => {
    // Map internal roles to Hungarian display names
    if (permissions?.isSuperadmin) return "Fejlesztő";
    if (permissions?.isHSZC && permissions?.isAdmin) return "HSZC Admin";
    if (permissions?.isHSZC && permissions?.isPrivileged)
      return "HSZC Privilegizált";
    if (permissions?.isHSZC && permissions?.isStandard) return "HSZC Általános";
    if (permissions?.isAdmin && !permissions?.isHSZC) return "Iskolai Admin";
    if (permissions?.isPrivileged && !permissions?.isHSZC)
      return "Iskolai Privilegizált";
    if (permissions?.isStandard && !permissions?.isHSZC)
      return "Iskolai Általános";

    // Fallback to role name
    return role || "Ismeretlen";
  };

  const getRoleColor = (role, permissions) => {
    if (permissions?.isSuperadmin) return "error";
    if (permissions?.isAdmin) return "warning";
    if (permissions?.isPrivileged) return "info";
    if (permissions?.isStandard) return "success";
    return "default";
  };

  const getRoleIcon = (permissions) => {
    if (permissions?.isSuperadmin) return "👨‍💻";
    if (permissions?.isAdmin) return "🛡️";
    if (permissions?.isPrivileged) return "⭐";
    if (permissions?.isStandard) return "👤";
    return "👤";
  };

  const displayRole = getDisplayRole(role, permissions);

  return (
    <Box display="inline-flex" alignItems="center">
      <Chip
        color={getRoleColor(role, permissions)}
        variant="outlined"
        size="small"
        label={`${getRoleIcon(permissions)} ${displayRole}`}
      />
      {permissions?.isHSZC && (
        <Chip 
          sx={{ ml: 1 }} 
          color="info" 
          variant="filled" 
          size="small" 
          label="HSZC" 
        />
      )}
    </Box>
  );
};

export default UserRoleBadge;
