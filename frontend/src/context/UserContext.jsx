import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getProfileService,
  loginService,
  logoutService,
  registerService,
  resendCodeService,
  verifyEmailService,
} from "../services/authServices";

export const UserContext = createContext(null);

export const UserContextProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await getProfileService();
      setUserInfo(userData);
      return userData;
    } catch {
      setUserInfo(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await loginService(credentials);
    setUserInfo(response.user);
    return response;
  }, []);

  // No account exists yet at this point — just triggers the code email.
  const register = useCallback(async (data) => {
    return registerService(data);
  }, []);

  // This is when the account actually gets created and the session starts.
  const verifyEmail = useCallback(async ({ email, code }) => {
    const response = await verifyEmailService({ email, code });
    setUserInfo(response.user);
    return response;
  }, []);

  const resendCode = useCallback(async (email) => {
    return resendCodeService(email);
  }, []);

  const logout = useCallback(async () => {
    const response = await logoutService();
    setUserInfo(null);
    return response;
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const value = useMemo(
    () => ({
      userInfo,
      loading,
      checkSession,
      login,
      register,
      verifyEmail,
      resendCode,
      logout,
      isAuthenticated: Boolean(userInfo?.id),
    }),
    [
      userInfo,
      loading,
      checkSession,
      login,
      register,
      verifyEmail,
      resendCode,
      logout,
    ],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
