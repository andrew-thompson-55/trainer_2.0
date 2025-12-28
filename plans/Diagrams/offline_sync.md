```mermaid
flowchart TD
    subgraph Offline ["Offline Mode"]
    A[User Creates Workout] -->|"Generates temp-123"| B(Save to Cache)
    B --> C{Add to Queue}
    end

    subgraph Queue ["The Queue"]
    %% Fixed quotes from previous step included here
    C -->|"CREATE payload: {id: temp-123}"| Q1[Queue Item 1: CREATE]
    Q1 -->|User Edits temp-123| Q2[Queue Item 2: UPDATE]
    end

    %% THE FIX: defined a clean ID 'Sync' and put text in quotes
    subgraph Sync ["Sync Process (Online)"]
    StartSync((Network Restored)) --> ReadQ[Read Queue Item 1]
    ReadQ -->|Strip temp ID| SendCreate[POST /workouts]
    
    SendCreate -->|Server Response| CheckStatus{Status Code}
    
    CheckStatus -->|200 OK| SuccessPath[Get Real ID: 555]
    CheckStatus -->|404/422| ZombiePath[Zombie Item]
    CheckStatus -->|500/Network| RetryPath[Retry Later]

    SuccessPath --> SwapLogic[🔍 Search & Replace]
    SwapLogic -->|Find temp-123 in Queue| UpdateQ2[Update Item 2: /workouts/555]
    UpdateQ2 --> RemoveQ1[Remove Item 1]
    RemoveQ1 --> NextItem[Process Item 2]

    ZombiePath --> Kill[☠️ Remove Item]
    Kill --> NextItem
    end