```mermaid
sequenceDiagram
    participant User
    participant App as Chimera Mobile
    participant Google as Google Identity
    participant API as Python Backend
    participant DB as Database

    Note over User, App: Phase 1: The Handshake
    User->>App: Taps "Continue with Google"
    App->>Google: promptAsync() (Open Browser Modal)
    User->>Google: Enters Credentials
    Google-->>App: Returns "id_token" (JWT Identity)

    Note over App, DB: Phase 2: The Exchange
    App->>API: POST /auth/google { token: id_token }
    API->>Google: Verify Token Integrity
    Google-->>API: Token Valid (email: user@gmail.com)
    
    API->>DB: SELECT * FROM users WHERE email = ...
    alt User Exists
        DB-->>API: Returns User Record
        API-->>App: { token: "session_jwt", isNewUser: false }
    else User is New
        API->>DB: INSERT INTO users (email, name...)
        DB-->>API: Returns New ID
        API-->>App: { token: "session_jwt", isNewUser: true }
    end

    Note over App: Phase 3: Routing
    App->>App: Store Token (SecureStore)
    
    alt isNewUser == true
        App->>User: Redirect to /onboarding
        User->>App: Enters Age, Weight, Goals
        App->>API: PUT /users/profile
        API-->>App: 200 OK
        App->>User: Redirect to Home (Tabs)
    else isNewUser == false
        App->>User: Redirect to Home (Tabs)
    end