// User types - Profile and auth

export interface User {
  id: string;
  email: string;
  name: string;
  timezone?: string;
  token?: string;         // JWT token (client-side only)
  isNewUser?: boolean;    // Onboarding flag (client-side only)
}

export interface ProfileUpdate {
  name?: string;
  timezone?: string;
}
