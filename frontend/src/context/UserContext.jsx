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

  const register = useCallback(async (data) => {
    const response = await registerService(data);
    setUserInfo(response.user);
    return response;
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
      logout,
      isAuthenticated: Boolean(userInfo?.id),
    }),
    [userInfo, loading, checkSession, login, register, logout],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
