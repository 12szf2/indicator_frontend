import { useEffect, useState } from "react";
import { useTokenValidation } from "../hooks/useTokenValidation";
import { Alert, AlertTitle, Box } from "@mui/material";

/**
 * TokenExpirationWarning - Component that shows warnings when token is about to expire
 * Displays warnings at 10 minutes, 5 minutes, and 1 minute before expiration
 */
const TokenExpirationWarning = () => {
  const { isAuthenticated, getTimeUntilExpiration } = useTokenValidation();
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [warningLevel, setWarningLevel] = useState("warning");

  useEffect(() => {
    if (!isAuthenticated) {
      setShowWarning(false);
      return;
    }

    const checkExpiration = () => {
      const timeLeft = getTimeUntilExpiration();
      if (!timeLeft || timeLeft <= 0) {
        setShowWarning(false);
        return;
      }

      const minutesLeft = Math.floor(timeLeft / (1000 * 60));

      if (minutesLeft <= 1) {
        setShowWarning(true);
        setWarningMessage(
          "Your session will expire in less than 1 minute. Please save your work."
        );
        setWarningLevel("error");
      } else if (minutesLeft <= 5) {
        setShowWarning(true);
        setWarningMessage(
          `Your session will expire in ${minutesLeft} minutes. Please save your work.`
        );
        setWarningLevel("error");
      } else if (minutesLeft <= 10) {
        setShowWarning(true);
        setWarningMessage(
          `Your session will expire in ${minutesLeft} minutes.`
        );
        setWarningLevel("warning");
      } else {
        setShowWarning(false);
      }
    };

    // Check immediately
    checkExpiration();

    // Check every 30 seconds
    const intervalId = setInterval(checkExpiration, 30 * 1000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, getTimeUntilExpiration]);

  if (!showWarning) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 9999,
        maxWidth: "400px"
      }}
    >
      <Alert severity={warningLevel}>
        <AlertTitle>Session Expiring!</AlertTitle>
        {warningMessage}
      </Alert>
    </Box>
  );
};

export default TokenExpirationWarning;
