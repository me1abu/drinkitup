# Water Intake Tracker

A beautiful and intuitive React Native app to help you stay hydrated by tracking your daily water intake with smart reminders.

## Features

- **Daily Goal Setting**: Set your personalized daily water intake goal
- **Progress Tracking**: Visual circular progress indicator showing your daily progress
- **Quick Add Buttons**: Easy one-tap buttons to add 200ml, 500ml, or 1L of water
- **Smart Notifications**: Hourly reminders to drink water (stops when goal is reached)
- **Daily Reset**: Automatically resets progress at midnight
- **Goal Celebration**: Special celebration when you reach your daily goal
- **Local Storage**: All data is saved locally using AsyncStorage
- **Beautiful UI**: Modern gradient design with smooth animations

## App Logic Flow

1. **First Launch**: User sets their daily water intake goal (in liters)
2. **Data Persistence**: Goal and progress are saved in AsyncStorage
3. **Notifications**: Repeating notifications every 60 minutes to remind drinking water
4. **Water Tracking**: User taps "+200ml", "+500ml", or "+1L" buttons to log intake
5. **Goal Achievement**: When total intake ≥ goal, celebration is shown and notifications stop
6. **Daily Reset**: At midnight, progress automatically resets for the new day

## Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Install Expo CLI** (if not already installed):
   ```bash
   npm install -g expo-cli
   ```

3. **Start the Development Server**:
   ```bash
   npm start
   # or
   expo start
   ```

4. **Run on Device/Simulator**:
   - Scan the QR code with Expo Go app on your phone
   - Press 'a' for Android emulator
   - Press 'i' for iOS simulator

## Dependencies

- `expo`: React Native framework
- `@react-native-async-storage/async-storage`: Local data storage
- `expo-notifications`: Push notifications
- `expo-linear-gradient`: Beautiful gradient backgrounds
- `react-native-svg`: SVG components for progress circle
- `expo-device`: Device information
- `expo-constants`: App constants

## Project Structure

```
water-intake-tracker/
├── App.js                 # Main app component
├── package.json           # Dependencies and scripts
├── app.json              # Expo configuration
├── assets/               # App icons and images
└── README.md             # This file
```

## Usage

1. **First Time Setup**:
   - Enter your daily water intake goal (recommended: 2-3 liters)
   - Tap "Start Tracking"

2. **Daily Usage**:
   - View your progress in the circular indicator
   - Tap the water amount buttons when you drink
   - Receive notifications every hour to stay hydrated
   - Celebrate when you reach your goal!

3. **Changing Goals**:
   - Tap "Change Goal" to reset and set a new daily target

## Technical Details

- **State Management**: React hooks (useState, useEffect)
- **Data Persistence**: AsyncStorage for local data
- **Notifications**: Expo Notifications with 60-minute intervals
- **UI Components**: Custom progress circle, gradient backgrounds, animated buttons
- **Responsive Design**: Adapts to different screen sizes

## Permissions

The app requires notification permissions to send water reminders. Users will be prompted to allow notifications on first launch.

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the MIT License.

