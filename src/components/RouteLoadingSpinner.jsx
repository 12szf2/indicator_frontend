import { useState, useEffect } from "react";
import { Box, CircularProgress, Typography, Stack } from "@mui/material";

const RouteLoadingSpinner = ({ message = "Oldal betöltése..." }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show the spinner immediately for better UX
    setIsVisible(true);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.15s ease-in-out"
      }}
    >
      <Stack direction="column" spacing={2} alignItems="center">
        <CircularProgress size={56} thickness={4} />
        <Typography variant="body1" fontWeight="medium" color="textSecondary">
          {message}
        </Typography>
      </Stack>
    </Box>
  );
};

export default RouteLoadingSpinner;
