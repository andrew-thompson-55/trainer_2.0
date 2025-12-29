import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

// 🛑 REPLACE WITH YOUR CLIENT ID FROM GOOGLE CLOUD CONSOLE
const GOOGLE_WEB_CLIENT_ID = '627552405695-pvcsvugq5hro67q7q05gshsttgcs1adh.apps.googleusercontent.com';
// const ANDROID_CLIENT_ID = ; // android client ID is in the helper docs, unused currently.
const API_BASE = 'https://trainer-2-0.onrender.com/v1';

WebBrowser.maybeCompleteAuthSession();

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
  signInWithGoogle: () => void;
  signOut: () => void;
  completeOnboarding: (data: any) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();

 const [request, response, promptAsync] = Google.useAuthRequest({
  // 1. Use the WEB CLIENT ID for all platforms
  androidClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_WEB_CLIENT_ID,
  webClientId: GOOGLE_WEB_CLIENT_ID,

  // 2. Force the Proxy Redirect
  redirectUri: makeRedirectUri({
      useProxy: true,
      scheme: 'chimeramobileapp'
  })
});

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      exchangeGoogleToken(id_token);
    }
  }, [response]);

  const exchangeGoogleToken = async (googleToken: string) => {
    setIsLoading(true);
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
        await SecureStore.setItemAsync('chimera_token', backendData.token);
        await AsyncStorage.setItem('chimera_user_info', JSON.stringify(backendData.user));
        
    } catch (e) {
        console.error(e);
        setError('Unable to sign in. Please try again.');
    } finally {
        setIsLoading(false);
    }
  };

  // Load Session on Startup
  useEffect(() => {
    const loadSession = async () => {
      try {
        const token = await SecureStore.getItemAsync('chimera_token');
        const userInfoStr = await AsyncStorage.getItem('chimera_user_info');
        
        if (token && userInfoStr) {
        // Verify token is still valid
        const isValid = await verifyToken(token);
        if (isValid) {
            const userInfo = JSON.parse(userInfoStr);
            setUser({ ...userInfo, token, isNewUser: false });
        } else {
            // Token expired, clear it
            await signOut();
        }
        }
      } catch (e) {
        console.error('Failed to load session:', e);
        // Maybe clear corrupted data
        await SecureStore.deleteItemAsync('chimera_token');
        await AsyncStorage.removeItem('chimera_user_info');
      }
      setIsLoading(false);
    };
    loadSession();
  }, []);

  // Protected Routes
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
        router.replace('/login');
    } else if (user && inAuthGroup) {
        if (inAuthGroup) {
            if (user.isNewUser) {
            router.replace('/onboarding');
            } else {
            router.replace('/(tabs)');
            }
        }
    }
  }, [user, isLoading]);

  const signOut = async () => {
    await SecureStore.deleteItemAsync('chimera_token');
    await AsyncStorage.removeItem('chimera_user_info');
    setUser(null);
  };

  type OnboardingData = {
    firstName: string;
    lastName: string;
    // whatever fields you collect
  };

  const completeOnboarding = async (data: OnboardingData) => {
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
        await AsyncStorage.setItem('chimera_user_info', JSON.stringify(updatedUser));
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
        signOut();
    } catch (e) {
        alert("Failed to delete account");
    }
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        isLoading: isLoading || !request, 
        signInWithGoogle: () => promptAsync(), 
        signOut, 
        completeOnboarding,
        deleteAccount 
    }}>
      {children}
    </AuthContext.Provider>
  );
};