import React from "react";
import { useSelector } from "react-redux";
import { Button, Box, Typography, Stack, Chip } from "@mui/material";
import {
  selectAccessToken,
  selectRefreshToken,
  selectIsTokenExpired,
  selectIsTokenExpiringSoon,
  selectIsAuthenticated,
} from "../store/slices/authSlice";
import useTokenRefresh from "../hooks/useTokenRefresh";
import { jwtDecode } from "jwt-decode";

/**
 * TokenDebugPanel - A debug component to test and monitor token refresh functionality
 * This component should only be used in development
 */
const TokenDebugPanel = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const accessToken = useSelector(selectAccessToken);
  const refreshToken = useSelector(selectRefreshToken);
  const isTokenExpired = useSelector(selectIsTokenExpired);
  const isTokenExpiringSoon = useSelector(selectIsTokenExpiringSoon);

  const { manualRefresh, checkAndRefresh } = useTokenRefresh();

  // Get token expiration info
  const getTokenInfo = (token) => {
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      const exp = new Date(decoded.exp * 1000);
      const now = new Date();
      const timeLeft = exp.getTime() - now.getTime();
      const minutesLeft = Math.floor(timeLeft / (1000 * 60));

      return {
        expires: exp.toLocaleString(),
        minutesLeft,
        isExpired: timeLeft <= 0,
      };
    } catch (error) {
      return { error: error.message };
    }
  };

  const accessTokenInfo = getTokenInfo(accessToken);
  const refreshTokenInfo = getTokenInfo(refreshToken);

  const handleManualRefresh = async () => {
    try {
      console.log("Manual refresh triggered from debug panel");
      await manualRefresh();
      console.log("Manual refresh completed successfully");
    } catch (error) {
      console.error("Manual refresh failed:", error);
    }
  };

  const handleCheckAndRefresh = async () => {
    try {
      console.log("Check and refresh triggered from debug panel");
      const result = await checkAndRefresh(true, true); // autoRefresh=true, proactive=true
      console.log("Check and refresh result:", result);
    } catch (error) {
      console.error("Check and refresh failed:", error);
    }
  };

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          p: 2,
          border: "1px solid",
          borderColor: "error.light",
          borderRadius: 1,
          bgcolor: "error.50"
        }}
      >
        <Typography color="error.main">Not authenticated - Token debug unavailable</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 2,
        border: "1px solid",
        borderColor: "info.light",
        borderRadius: 1,
        bgcolor: "info.50"
      }}
    >
      <Stack direction="column" spacing={1.5}>
        <Typography variant="h6" fontWeight="bold" color="info.dark">
          Token Debug Panel
        </Typography>

        <Box>
          <Typography fontWeight="fontWeightMedium" component="span">Status: </Typography>
          <Chip 
            size="small" 
            color={isTokenExpired ? "error" : "success"}
            label={isTokenExpired ? "Expired" : "Valid"} 
          />
          {isTokenExpiringSoon && !isTokenExpired && (
            <Chip size="small" color="warning" label="Expiring Soon" sx={{ ml: 1 }} />
          )}
        </Box>

        {accessTokenInfo && (
          <Box>
            <Typography fontWeight="fontWeightMedium">Access Token:</Typography>
            <Typography variant="body2">Expires: {accessTokenInfo.expires}</Typography>
            <Typography variant="body2">
              Time left: {accessTokenInfo.minutesLeft} minutes
            </Typography>
          </Box>
        )}

        {refreshTokenInfo && (
          <Box>
            <Typography fontWeight="fontWeightMedium">Refresh Token:</Typography>
            <Typography variant="body2">Expires: {refreshTokenInfo.expires}</Typography>
            <Typography variant="body2">
              Time left: {refreshTokenInfo.minutesLeft} minutes
            </Typography>
          </Box>
        )}

        <Stack direction="column" spacing={1}>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={handleManualRefresh}
            disabled={!refreshToken}
          >
            Manual Refresh
          </Button>
          <Button
            variant="contained"
            color="success"
            size="small"
            onClick={handleCheckAndRefresh}
            disabled={!refreshToken}
          >
            Check & Refresh
          </Button>
        </Stack>

        <Typography variant="caption" color="textSecondary">
          Check browser console for detailed logs
        </Typography>
      </Stack>
    </Box>
  );
};

export default TokenDebugPanel;
