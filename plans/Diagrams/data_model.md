```mermaid
erDiagram
    USER ||--o{ WORKOUT : "has many"
    USER ||--o{ DAILY_LOG : "logs daily"
    
    %% PK and FK are Primary key and Foreign key
    USER {
        string id PK
        string email
        string google_id
        float weight_kg
        int age
        string sex
    }

    WORKOUT {
        string id PK
        string user_id FK
        string title
        string description
        string activity_type "run, bike, etc"
        datetime start_time
        datetime end_time
        string status "planned, completed"
        json linked_activity_data "Strava Data"
    }

    DAILY_LOG {
        string date PK "YYYY-MM-DD"
        string user_id FK
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