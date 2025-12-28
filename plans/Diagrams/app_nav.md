```mermaid
graph TD
    Root[_layout.tsx] --> AuthProvider[AuthProvider Context]
    AuthProvider --> StackNavigator

    subgraph "(auth)"
    StackNavigator --> Login[LoginScreen]
    StackNavigator --> Onboarding[OnboardingScreen]
    end

    subgraph "(tabs)"
    StackNavigator --> Tabs[TabNavigator]
    Tabs --> Itinerary["ItineraryScreen (Home)"]
    Tabs --> Calendar[CalendarScreen]
    Tabs --> Coach[ai coach chat screen]
    Tabs --> Tracker["TrackerScreen (Daily Log)"]
    Tabs --> Settings[SettingsScreen]
    end

    subgraph "Modals / Detail Views"
    Itinerary --> WorkoutDetails[WorkoutDetailsScreen]
    Calendar --> WorkoutDetails
    WorkoutDetails --> EditWorkout[EditWorkoutScreen]
    Itinerary --> AddWorkout[AddWorkoutScreen]
    end

    subgraph "Shared Components"
    WorkoutDetails --> StatsGrid["StatsGrid (Grid View)"]
    WorkoutDetails --> StatsGraph["StatsGraphs (Bar View)"]
    EditWorkout --> WorkoutForm["WorkoutForm (Reusable UI)"]
    AddWorkout --> WorkoutForm
    Tracker --> MetricSlider[MetricSlider]
    Tracker --> DurationInput[DurationInput]
    end