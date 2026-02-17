import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { API_BASE } from '../fetch/config';

// 🛑 REPLACE WITH YOUR WEB CLIENT ID
const WEB_CLIENT_ID = '247141696720-6upuejdua6clh49utvobf6a007pthgtd.apps.googleusercontent.com';

type User = {
  id: string;
  email: string;
  name: string;
  token: string;
  isNewUser: boolean;
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: (data: any) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

// Internal provider (does not wrap with GoogleOAuthProvider)
const AuthProviderInternal = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Web-specific Google Login using implicit flow
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        // Send access token to web-specific backend endpoint
        await exchangeGoogleAccessToken(tokenResponse.access_token);
      } catch (error) {
        console.error("Google Sign In Error", error);
        alert("Login cancelled or failed");
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error("Google Login Error:", error);
      alert("Login cancelled or failed");
      setIsLoading(false);
    },
    flow: 'implicit', // Use implicit flow to get access token
    scope: 'openid email profile', // Request OpenID scope
  });

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      googleLogin(); // This triggers the Google popup
    } catch (error) {
      console.error("Google Sign In Error", error);
      alert("Login cancelled or failed");
      setIsLoading(false);
    }
  };

  // Exchange Google access token for our JWT (web-specific endpoint)
  const exchangeGoogleAccessToken = async (accessToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/google/web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      });

      if (!res.ok) throw new Error("Backend login failed");

      const backendData = await res.json();

      const sessionUser = {
        ...backendData.user,
        token: backendData.token,
        isNewUser: backendData.isNewUser
      };

      setUser(sessionUser);
      localStorage.setItem('chimera_token', backendData.token);
      localStorage.setItem('chimera_user_info', JSON.stringify(backendData.user));

    } catch (e) {
      console.error(e);
      alert("Backend connection failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Verify Token Validity (Backend Check)
  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  };

  // Load Session on Startup
  useEffect(() => {
    const loadSession = async () => {
      try {
        const token = localStorage.getItem('chimera_token');
        const userInfoStr = localStorage.getItem('chimera_user_info');

        if (token && userInfoStr) {
          // Check if token is still valid
          const isValid = await verifyToken(token);
          if (isValid) {
            const userInfo = JSON.parse(userInfoStr);
            setUser({ ...userInfo, token, isNewUser: false });
          } else {
            await signOut();
          }
        }
      } catch (e) {
        console.log("Error loading session", e);
      }
      setIsLoading(false);
    };
    loadSession();
  }, []);

  // Routing Protection (Gatekeeper)
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isRoot = segments.length === 0;

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && (inAuthGroup || isRoot)) {
      if (user.isNewUser) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [user, segments, isLoading]);

  const signOut = async () => {
    // No need to sign out from Google on web - just clear local storage
    localStorage.removeItem('chimera_token');
    localStorage.removeItem('chimera_user_info');
    setUser(null);
  };

  const completeOnboarding = async (data: any) => {
    if (!user) return;
    try {
      await fetch(`${API_BASE}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(data)
      });

      const updatedUser = { ...user, isNewUser: false };
      setUser(updatedUser);
      localStorage.setItem('chimera_user_info', JSON.stringify(updatedUser));
      router.replace('/(tabs)');
    } catch (e) {
      alert("Failed to save profile.");
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      await fetch(`${API_BASE}/users/me`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      await signOut();
    } catch (e) {
      alert("Failed to delete account");
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      signInWithGoogle,
      signOut,
      completeOnboarding,
      deleteAccount
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Main export wraps with GoogleOAuthProvider
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <GoogleOAuthProvider clientId={WEB_CLIENT_ID}>
      <AuthProviderInternal>
        {children}
      </AuthProviderInternal>
    </GoogleOAuthProvider>
  );
};
