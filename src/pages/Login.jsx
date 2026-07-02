import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Card,
  CardContent,
  Stack,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
  Link,
  alpha,
  keyframes,
  styled,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useLoginMutation, useGoogleLoginMutation } from "../store/api/apiSlice";
import { GoogleLogin } from "@react-oauth/google";
import {
  loginStart,
  loginSuccess,
  loginFailure,
  clearError,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  selectMustChangePassword,
} from "../store/slices/authSlice";
import { parseApiError } from "../utils/tableAccessUtils";
import ForgotPasswordDialog from "../components/ForgotPasswordDialog";

const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const GlassCard = styled(Card)(({ theme }) => ({
  background: alpha(theme.palette.background.paper, 0.7),
  backdropFilter: "blur(20px)",
  borderRadius: "24px",
  boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
  border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
  overflow: "hidden",
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: alpha(theme.palette.background.paper, 0.6),
    transition: "all 0.2s ease-in-out",
    "&:hover": {
      backgroundColor: alpha(theme.palette.background.paper, 0.9),
    },
    "&.Mui-focused": {
      backgroundColor: theme.palette.background.paper,
      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.15)}`,
    },
  },
}));

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const otpRefs = useRef([]);
  const [trustDevice, setTrustDevice] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [isGoogleLoginAttempt, setIsGoogleLoginAttempt] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const mustChangePassword = useSelector(selectMustChangePassword);
  const [errorMessage, setErrorMessage] = useState("");

  const handleOtpChange = (e, index) => {
    const value = e.target.value;
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    setTwoFactorCode(newOtp.join(""));

    if (value && index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0 && otpRefs.current[index - 1]) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").slice(0, 6).split("");
    if (pasteData.some(char => isNaN(char))) return;
    const newOtp = [...otp];
    pasteData.forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    setTwoFactorCode(newOtp.join(""));

    const lastIndex = Math.min(pasteData.length, 5);
    if (otpRefs.current[lastIndex]) {
      otpRefs.current[lastIndex].focus();
    }
  };

  useEffect(() => {
    dispatch(clearError());
    setErrorMessage("");
  }, [dispatch, setErrorMessage]);

  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        dispatch(loginFailure("Bejelentkezés időtúllépés miatt sikertelen"));
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [loading, dispatch]);

  useEffect(() => {
    if (error) {
      console.error("Login error:", error);
      const message = parseApiError(error);
      setErrorMessage(message);
    }
  }, [error]);

  const [loginMutation] = useLoginMutation();
  const [googleLoginMutation] = useGoogleLoginMutation();

  if (isAuthenticated) {
    // If must change password, redirect to profile with flag
    if (mustChangePassword) {
      return <Navigate to="/profile?mustChangePassword=true" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isGoogleLoginAttempt && (!email || !password)) {
      dispatch(loginFailure("Email és jelszó megadása kötelező"));
      return;
    }

    if (requires2FA && !twoFactorCode) {
      dispatch(loginFailure("Kétlépcsős kód megadása kötelező"));
      return;
    }

    dispatch(loginStart());
    try {
      let result;
      if (isGoogleLoginAttempt) {
        const payload = {
          idToken: googleIdToken,
        };
        const trustedDeviceToken = localStorage.getItem("trustedDeviceToken");
        if (trustedDeviceToken) {
          payload.trustedDeviceToken = trustedDeviceToken;
        }
        if (requires2FA) {
          payload.twoFactorCode = twoFactorCode;
          payload.trustDevice = trustDevice;
        }
        result = await googleLoginMutation(payload).unwrap();
      } else {
        const payload = { email, password };

        const trustedDeviceToken = localStorage.getItem("trustedDeviceToken");
        if (trustedDeviceToken) {
          payload.trustedDeviceToken = trustedDeviceToken;
        }

        if (requires2FA) {
          payload.twoFactorCode = twoFactorCode;
          payload.trustDevice = trustDevice;
        }
        result = await loginMutation(payload).unwrap();
      }

      if (result.requires2FA) {
        setRequires2FA(true);
        if (result.isGoogleLogin) {
          setIsGoogleLoginAttempt(true);
          setGoogleIdToken(result.idToken);
        }
        dispatch(clearError()); // Clear loading and error state without failing
        dispatch(loginFailure(null)); // Specifically setting to null to stop loading indicator
        return;
      }

      if (result.trustedDeviceToken) {
        localStorage.setItem("trustedDeviceToken", result.trustedDeviceToken);
      }

      dispatch(loginSuccess(result));

      // If must change password, navigate to profile
      if (result.mustChangePassword) {
        navigate("/profile?mustChangePassword=true", { replace: true });
      }
    } catch (err) {
      // Ignore AbortError caused by strict mode double-fetching or rapid clicks
      if (err.name === "AbortError" || err.message?.includes("AbortError") || err.error?.includes("AbortError")) {
        return;
      }

      const errorMsg = parseApiError(err);
      dispatch(
        loginFailure(
          errorMsg || "Hiba történt a bejelentkezés során"
        )
      );
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    dispatch(loginStart());
    try {
      const payload = {
        idToken: credentialResponse.credential,
      };
      
      const trustedDeviceToken = localStorage.getItem("trustedDeviceToken");
      if (trustedDeviceToken) {
        payload.trustedDeviceToken = trustedDeviceToken;
      }

      const result = await googleLoginMutation(payload).unwrap();

      if (result.requires2FA) {
        setRequires2FA(true);
        setIsGoogleLoginAttempt(true);
        setGoogleIdToken(result.idToken);
        dispatch(clearError());
        dispatch(loginFailure(null));
        return;
      }

      if (result.trustedDeviceToken) {
        localStorage.setItem("trustedDeviceToken", result.trustedDeviceToken);
      }

      dispatch(loginSuccess(result));
      if (result.mustChangePassword) {
        navigate("/profile?mustChangePassword=true", { replace: true });
      }
    } catch (err) {
      const errorMsg = parseApiError(err);
      dispatch(
        loginFailure(
          errorMsg || "Hiba történt a Google bejelentkezés során"
        )
      );
    }
  };

  const handleGoogleError = () => {
    dispatch(loginFailure("Google bejelentkezés megszakítva vagy sikertelen."));
  };


  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(-45deg, #0d3a5ad3, #3c83bad3, #18567ad3, #093d5fd3)",
        backgroundSize: "400% 400%",
        animation: `${gradientAnimation} 15s ease infinite`,
        p: 2,
      }}
    >
      <Container maxWidth="xs" disableGutters>
        <GlassCard>
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            <Stack spacing={4}>
              <Box className="flex items-center justify-center flex-col">
                <Box
                  component="img"
                  src="https://cms.hodmezovasarhelyi.szc.edir.hu/uploads/HSZC_logo_color_tomb_k_4b19d45dc7.png"
                  alt="HSZC Logo"
                  sx={{
                    width: "100%",
                    maxWidth: 180,
                    height: "auto",
                    mb: 2,
                    filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.1))",
                  }}
                />
                <Typography variant="h5" component="h1" fontWeight="700" color="text.primary">
                  Indikátor Rendszer
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Jelentkezz be a folytatáshoz
                </Typography>
              </Box>

              {errorMessage && (
                <Alert severity="error" sx={{ borderRadius: "12px", boxShadow: "sm" }}>
                  {errorMessage}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
                <Stack spacing={2.5}>
                  {!requires2FA ? (
                    <>
                      <StyledTextField
                        type="email"
                        label="Email cím"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="pelda@email.hu"
                        required
                        fullWidth
                        variant="outlined"
                      />

                      <StyledTextField
                        type={showPassword ? "text" : "password"}
                        label="Jelszó"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Add meg a jelszavad"
                        required
                        fullWidth
                        variant="outlined"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <Typography variant="body2" textAlign="center" color="primary.main" fontWeight="500">
                        Kétlépcsős azonosítás (2FA) szükséges a bejelentkezéshez.
                      </Typography>
                      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                        {otp.map((data, index) => (
                          <StyledTextField
                            key={index}
                            inputRef={(el) => (otpRefs.current[index] = el)}
                            type="text"
                            value={data}
                            onChange={(e) => handleOtpChange(e, index)}
                            onKeyDown={(e) => handleOtpKeyDown(e, index)}
                            onPaste={handleOtpPaste}
                            variant="outlined"
                            inputProps={{
                              maxLength: 2,
                              style: { textAlign: "center", fontSize: "1.2rem", fontWeight: 700, padding: "10px" }
                            }}
                            sx={{ width: 45 }}
                            autoFocus={index === 0}
                          />
                        ))}
                      </Stack>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={trustDevice}
                            onChange={(e) => setTrustDevice(e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Megbízható eszköz (nem kér kódot 30 napig)"
                      />
                    </>
                  )}

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    color="primary"
                    fullWidth
                    disabled={loading}
                    sx={{
                      mt: 2,
                      borderRadius: "12px",
                      py: 1.5,
                      textTransform: "none",
                      fontSize: "1.05rem",
                      fontWeight: 600,
                      boxShadow: "0 4px 14px 0 rgba(0,118,255,0.39)",
                      "&:hover": {
                        boxShadow: "0 6px 20px rgba(0,118,255,0.23)",
                      }
                    }}
                  >
                    {loading ? (
                      <>
                        <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                        Betöltés...
                      </>
                    ) : requires2FA ? (
                      "Kód ellenőrzése"
                    ) : (
                      "Bejelentkezés"
                    )}
                  </Button>

                  {requires2FA && (
                    <Button
                      variant="text"
                      fullWidth
                      disabled={loading}
                      onClick={() => {
                        setRequires2FA(false);
                        setIsGoogleLoginAttempt(false);
                        setGoogleIdToken("");
                        setTwoFactorCode("");
                        setOtp(new Array(6).fill(""));
                      }}
                      sx={{ textTransform: "none", borderRadius: "12px", fontWeight: 600 }}
                    >
                      Vissza
                    </Button>
                  )}

                  {!requires2FA && (
                    <Box sx={{ textAlign: "center", pt: 1 }}>
                      <Link
                        component="button"
                        type="button"
                        variant="body2"
                        onClick={() => setForgotPasswordOpen(true)}
                        sx={{
                          fontWeight: 500,
                          textDecoration: "none",
                          "&:hover": { textDecoration: "underline" }
                        }}
                      >
                        Elfelejtett jelszó?
                      </Link>
                    </Box>
                  )}
                  
                  {!requires2FA && (
                    <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Vagy jelentkezz be Google fiókkal
                      </Typography>
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        theme="filled_blue"
                        shape="rectangular"
                        text="signin_with"
                        size="large"
                      />
                    </Box>
                  )}
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </GlassCard>

        <ForgotPasswordDialog
          open={forgotPasswordOpen}
          onClose={() => setForgotPasswordOpen(false)}
        />
      </Container>
    </Box >
  );
}

