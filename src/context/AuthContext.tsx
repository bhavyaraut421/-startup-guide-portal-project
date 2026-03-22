import React, { createContext, useContext, useEffect, useState } from "react";

type User = {
  id: number;
  name: string;
  email: string;
  stage: string;
  bio?: string;
  profilePicture?: string | null;
};

interface AuthContextType {
  isLoggedIn: boolean;
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;

    try {
      return JSON.parse(storedUser) as User;
    } catch {
      return null;
    }
  });

  const refreshUser = async () => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      setToken(null);
      setUser(null);
      return;
    }

    try {
      const res = await fetch("/api/me", {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch user");
      }

      const refreshedUser: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        stage: data.user.stage,
        bio: data.user.bio || "",
        profilePicture: data.user.profilePicture || null,
      };

      setUser(refreshedUser);
      setToken(storedToken);

      localStorage.setItem("token", storedToken);
      localStorage.setItem("user", JSON.stringify(refreshedUser));
    } catch (error) {
      console.error("refreshUser error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = (newToken: string, newUser: User) => {
    const normalizedUser: User = {
      ...newUser,
      bio: newUser.bio || "",
      profilePicture: newUser.profilePicture || null,
    };

    setToken(newToken);
    setUser(normalizedUser);

    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!token,
        token,
        user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};