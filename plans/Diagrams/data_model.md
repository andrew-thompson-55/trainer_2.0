```mermaid
erDiagram
    %% RELATIONSHIPS
    USER ||--|| USER_SETTINGS : "has profile"
    USER ||--o{ PLANNED_WORKOUT : "plans"
    USER ||--o{ COMPLETED_ACTIVITY : "completes"
    USER ||--o{ DAILY_LOG : "logs daily"
    
    %% The "Magic Link" between Plan and Actual
    PLANNED_WORKOUT |o--o| COMPLETED_ACTIVITY : "matched with"

    %% ENTITIES
    USER {
        uuid id PK
        string email
        string name
        string google_id
        string avatar_url
        datetime created_at
    }

    USER_SETTINGS {
        uuid user_id PK "FK -> USER.id"
        string strava_access_token
        string strava_refresh_token
        string strava_athlete_id
        datetime strava_expires_at
        float weight_kg
        int age
        string sex
        string preferred_units "imperial/metric"
    }

    PLANNED_WORKOUT {
        uuid id PK
        uuid user_id FK
        string title
        string description
        string activity_type
        datetime start_time
        datetime end_time
        string status "planned, completed, skipped"
    }

    COMPLETED_ACTIVITY {
        uuid id PK
        uuid user_id FK
        uuid planned_workout_id FK "Nullable"
        string source_type "strava, garmin, manual"
        string source_id "strava_activity_id"
        float distance_meters
        int moving_time_seconds
        float total_elevation_gain
        int average_heartrate
        json activity_data_blob "Full Strava JSON"
    }

    DAILY_LOG {
        date date PK "YYYY-MM-DD"
        uuid user_id FK
        float sleep_total
        float deep_sleep
        float rem_sleep
        int hrv_score
        int resting_hr
        int motivation
        int soreness
        int stress
        float body_weight_kg
    }