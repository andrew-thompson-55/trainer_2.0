import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';
import { STORAGE_KEYS } from '../storage/keys';

// 👇 NATIVE LIBRARY (No more expo-auth-session)
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { API_BASE } from '../fetch/config';

// 🛑 REPLACE WITH YOUR WEB CLIENT ID
// Even though this is a native app, we use the WEB ID for configuration to get the ID Token.
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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // 1. Configure Native Google Sign In
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID, 
      offlineAccess: false,
    });
  }, []);

  // 2. The Login Action
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      await GoogleSignin.hasPlayServices();
      
      // Opens the Native System Dialog (Fast & Secure)
      const userInfo = await GoogleSignin.signIn();
      
      // Get the ID Token to send to Backend
      const idToken = userInfo.data?.idToken || userInfo.idToken;

      if (idToken) {
        await exchangeGoogleToken(idToken);
      } else {
        throw new Error("No ID Token found");
      }
    } catch (error) {
      console.log("Google Sign In Error", error);
      alert("Login cancelled or failed");
      setIsLoading(false);
    }
  };

  const exchangeGoogleToken = async (googleToken: string) => {
    try {
        const res = await fetch(`${API_BASE}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: googleToken }),
        });

        if (!res.ok) throw new Error("Backend login failed");
        
        const backendData = await res.json();
        
        const sessionUser = { 
            ...backendData.user, 
            token: backendData.token, 
            isNewUser: backendData.isNewUser 
        };
        
        setUser(sessionUser);
        await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, backendData.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(backendData.user));
        
    } catch (e) {
        console.error(e);
        alert("Backend connection failed."); // check render logs. login pased on phone but is failing on backend. check if token is being sent correctly and if backend endpoint is correct.
    } finally {
        setIsLoading(false);
    }
  };

  // 3. Verify Token Validity (Backend Check)
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

  // 4. Load Session on Startup
  useEffect(() => {
    const loadSession = async () => {
      try {
        const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
        const userInfoStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_INFO);
        
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

  // 5. Routing Protection (Gatekeeper)
  // 5. Routing Protection (The Strict Gatekeeper)
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isRoot = segments.length === 0; // 👈 Check if we are at "/"

    if (!user && !inAuthGroup) {
      // ⛔️ Not logged in? Go to the Auth Room.
      router.replace('/(auth)/login');
    } else if (user && (inAuthGroup || isRoot)) {
      // ✅ Logged in but stuck in the Auth Room? Get out!
      if (user.isNewUser) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    }
    // Note: If user is logged in and NOT in auth group (e.g. inside tabs), 
    // we do nothing. They are where they belong.
  }, [user, segments, isLoading]);

  const signOut = async () => {
    try {
        await GoogleSignin.signOut();
    } catch (e) {
        console.log("Error signing out of Google", e);
    }
    await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_INFO);
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
        await AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(updatedUser));
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