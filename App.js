import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Circle } from 'react-native-svg';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const { width, height } = Dimensions.get('window');

export default function App() {
  const [dailyGoal, setDailyGoal] = useState(0);
  const [currentIntake, setCurrentIntake] = useState(0);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [goalReached, setGoalReached] = useState(false);
  const [lastResetDate, setLastResetDate] = useState('');

  useEffect(() => {
    loadData();
    requestNotificationPermissions();
  }, []);

  useEffect(() => {
    checkAndResetDaily();
  }, [currentIntake]);

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please enable notifications to receive water reminders!');
    }
  };

  const loadData = async () => {
    try {
      const savedGoal = await AsyncStorage.getItem('dailyGoal');
      const savedIntake = await AsyncStorage.getItem('currentIntake');
      const savedLastReset = await AsyncStorage.getItem('lastResetDate');
      const savedFirstLaunch = await AsyncStorage.getItem('isFirstLaunch');
      const savedGoalReached = await AsyncStorage.getItem('goalReached');

      if (savedFirstLaunch === null) {
        setIsFirstLaunch(true);
      } else {
        setIsFirstLaunch(false);
        if (savedGoal) setDailyGoal(parseFloat(savedGoal));
        if (savedIntake) setCurrentIntake(parseFloat(savedIntake));
        if (savedLastReset) setLastResetDate(savedLastReset);
        if (savedGoalReached === 'true') setGoalReached(true);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const checkAndResetDaily = () => {
    const today = new Date().toDateString();
    if (lastResetDate !== today) {
      resetDailyProgress();
    }
  };

  const resetDailyProgress = async () => {
    const today = new Date().toDateString();
    setCurrentIntake(0);
    setGoalReached(false);
    setLastResetDate(today);
    
    try {
      await AsyncStorage.setItem('currentIntake', '0');
      await AsyncStorage.setItem('lastResetDate', today);
      await AsyncStorage.setItem('goalReached', 'false');
    } catch (error) {
      console.error('Error resetting daily progress:', error);
    }
  };

  const saveGoal = async (goal) => {
    try {
      await AsyncStorage.setItem('dailyGoal', goal.toString());
      await AsyncStorage.setItem('isFirstLaunch', 'false');
      setDailyGoal(goal);
      setIsFirstLaunch(false);
      scheduleNotifications();
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const scheduleNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Schedule notification every 60 minutes
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time to Hydrate! 💧",
        body: "Don't forget to drink water and stay hydrated!",
        sound: true,
      },
      trigger: {
        seconds: 3600, // 60 minutes
        repeats: true,
      },
    });
  };

  const addWater = async (amount) => {
    if (goalReached) return;

    const newIntake = currentIntake + amount;
    setCurrentIntake(newIntake);

    try {
      await AsyncStorage.setItem('currentIntake', newIntake.toString());
    } catch (error) {
      console.error('Error saving intake:', error);
    }

    if (newIntake >= dailyGoal && !goalReached) {
      setGoalReached(true);
      await AsyncStorage.setItem('goalReached', 'true');
      Alert.alert(
        '🎉 Goal Achieved!',
        'Congratulations! You\'ve reached your daily water intake goal!',
        [{ text: 'Great!' }]
      );
      // Cancel notifications for the day
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  };

  const getProgressPercentage = () => {
    if (dailyGoal === 0) return 0;
    return Math.min((currentIntake / dailyGoal) * 100, 100);
  };

  const getProgressColor = () => {
    const percentage = getProgressPercentage();
    if (percentage >= 100) return '#4CAF50';
    if (percentage >= 75) return '#2196F3';
    if (percentage >= 50) return '#FF9800';
    return '#F44336';
  };

  if (isFirstLaunch) {
    return <GoalSetupScreen onGoalSet={saveGoal} />;
  }

  return (
    <LinearGradient
      colors={['#E3F2FD', '#BBDEFB', '#90CAF9']}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#E3F2FD" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Water Intake Tracker</Text>
        <Text style={styles.subtitle}>Stay Hydrated, Stay Healthy</Text>
      </View>

      <View style={styles.progressContainer}>
        <Svg width={200} height={200}>
          <Circle
            cx="100"
            cy="100"
            r="80"
            stroke="#E0E0E0"
            strokeWidth="12"
            fill="transparent"
          />
          <Circle
            cx="100"
            cy="100"
            r="80"
            stroke={getProgressColor()}
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={`${2 * Math.PI * 80}`}
            strokeDashoffset={`${2 * Math.PI * 80 * (1 - getProgressPercentage() / 100)}`}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />
        </Svg>
        
        <View style={styles.progressText}>
          <Text style={styles.currentText}>{currentIntake.toFixed(1)}L</Text>
          <Text style={styles.goalText}>of {dailyGoal}L</Text>
          <Text style={styles.percentageText}>{getProgressPercentage().toFixed(0)}%</Text>
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.addButton, goalReached && styles.disabledButton]}
          onPress={() => addWater(0.2)}
          disabled={goalReached}
        >
          <Text style={styles.buttonText}>+200ml</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addButton, goalReached && styles.disabledButton]}
          onPress={() => addWater(0.5)}
          disabled={goalReached}
        >
          <Text style={styles.buttonText}>+500ml</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addButton, goalReached && styles.disabledButton]}
          onPress={() => addWater(1.0)}
          disabled={goalReached}
        >
          <Text style={styles.buttonText}>+1L</Text>
        </TouchableOpacity>
      </View>

      {goalReached && (
        <View style={styles.celebrationContainer}>
          <Text style={styles.celebrationText}>🎉 Goal Achieved! 🎉</Text>
          <Text style={styles.celebrationSubtext}>Great job staying hydrated today!</Text>
        </View>
      )}

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.resetButton}
          activeOpacity={0.7}
          onPress={() => {
            console.log('Change Goal button pressed');
            Alert.alert(
              'Reset Goal',
              'Are you sure you want to reset your daily goal?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Reset', 
                  onPress: async () => {
                    try {
                      // Clear all stored data
                      await AsyncStorage.multiRemove([
                        'dailyGoal',
                        'currentIntake',
                        'lastResetDate',
                        'goalReached',
                        'isFirstLaunch'
                      ]);
                      // Reset all state
                      setDailyGoal(0);
                      setCurrentIntake(0);
                      setGoalReached(false);
                      setLastResetDate('');
                      setIsFirstLaunch(true);
                    } catch (error) {
                      console.error('Error resetting app:', error);
                    }
                  }
                }
              ]
            );
          }}
        >
          <Text style={styles.resetButtonText}>Change Goal</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const GoalSetupScreen = ({ onGoalSet }) => {
  const [goal, setGoal] = useState('2.5');

  const handleSetGoal = () => {
    const goalValue = parseFloat(goal);
    if (goalValue > 0 && goalValue <= 10) {
      onGoalSet(goalValue);
    } else {
      Alert.alert('Invalid Goal', 'Please enter a goal between 0.1 and 10 liters.');
    }
  };

  return (
    <LinearGradient
      colors={['#E3F2FD', '#BBDEFB', '#90CAF9']}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#E3F2FD" />
      
      <View style={styles.setupContainer}>
        <Text style={styles.setupTitle}>Welcome to Water Tracker! 💧</Text>
        <Text style={styles.setupSubtitle}>
          Let's set your daily water intake goal to help you stay hydrated.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Daily Goal (Liters)</Text>
          <TextInput
            style={styles.input}
            value={goal}
            onChangeText={setGoal}
            keyboardType="numeric"
            placeholder="2.5"
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity style={styles.setupButton} onPress={handleSetGoal}>
          <Text style={styles.setupButtonText}>Start Tracking</Text>
        </TouchableOpacity>

        <Text style={styles.setupInfo}>
          💡 Tip: The recommended daily water intake is 2-3 liters for adults.
        </Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#424242',
    textAlign: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  progressText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  currentText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  goalText: {
    fontSize: 18,
    color: '#666',
    marginTop: 4,
  },
  percentageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
    marginTop: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 80,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  celebrationContainer: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  celebrationText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  celebrationSubtext: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
  bottomContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 20,
  },
  resetButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    minWidth: 150,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  setupContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 20,
    textAlign: 'center',
  },
  setupSubtitle: {
    fontSize: 16,
    color: '#424242',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    textAlign: 'center',
  },
  setupButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  setupButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  setupInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
