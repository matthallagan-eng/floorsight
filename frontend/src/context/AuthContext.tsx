import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../api/client";

interface AuthCtx {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(localStorage.getItem("token"));

  async function login(email: string, password: string) {
    const { access_token } = await api.login(email, password);
    localStorage.setItem("token", access_token);
    setToken(access_token);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
  }

  return <Ctx.Provider value={{ token, login, logout }}>{children}</Ctx.Provider>;
}
