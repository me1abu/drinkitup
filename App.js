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

// Water facts for notifications
const waterFacts = [
  "Drinking water helps maintain the balance of body fluids",
  "Water helps energize muscles and prevents fatigue",
  "Water helps keep skin looking good and healthy",
  "Water helps your kidneys work properly",
  "Water helps maintain normal bowel function",
  "Drinking water can help control calories",
  "Water helps transport nutrients throughout your body",
  "Staying hydrated improves concentration and alertness",
  "Water helps regulate body temperature",
  "Drinking water can help prevent headaches",
  "Water helps lubricate and cushion joints",
  "Staying hydrated supports healthy digestion",
  "Water helps flush out toxins from your body",
  "Drinking water can boost your mood",
  "Water helps maintain healthy blood pressure"
];

export default function App() {
  const [dailyGoal, setDailyGoal] = useState(0);
  const [currentIntake, setCurrentIntake] = useState(0);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [goalReached, setGoalReached] = useState(false);
  const [lastResetDate, setLastResetDate] = useState('');

  useEffect(() => {
    loadData();
    requestNotificationPermissions();
    setupNotificationListener();
  }, []);

  useEffect(() => {
    checkAndResetDaily();
  }, [currentIntake]);

  useEffect(() => {
    // Update persistent notification when intake changes
    if (!isFirstLaunch && dailyGoal > 0) {
      updatePersistentNotification();
    }
  }, [currentIntake, dailyGoal, isFirstLaunch]);

  const setupNotificationListener = () => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('📨 Notification received:', notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification response:', response);
      handleNotificationResponse(response);
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  };

  const handleNotificationResponse = (response) => {
    const { actionIdentifier, notification } = response;
    
    if (actionIdentifier === 'add-200ml') {
      console.log('➕ Adding 200ml from notification');
      addWater(0.2);
    } else if (actionIdentifier === 'dismiss') {
      console.log('❌ Notification dismissed');
    }
  };

  const updatePersistentNotification = async () => {
    try {
      const remainingIntake = Math.max(0, dailyGoal - currentIntake);
      const percentage = getProgressPercentage();
      
      // Cancel existing persistent notification
      await Notifications.cancelScheduledNotificationAsync('persistent-status');
      
      // Ensure notification categories are set up first
      await Notifications.setNotificationCategoryAsync('persistent-status-actions', [
        {
          identifier: 'add-200ml',
          buttonTitle: '+200ml',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: 'dismiss',
          buttonTitle: 'Dismiss',
          options: {
            isDestructive: true,
            isAuthenticationRequired: false,
          },
        },
      ]);
      
      // Create new persistent notification with action button
      await Notifications.scheduleNotificationAsync({
        identifier: 'persistent-status',
        content: {
          title: `💧 ${currentIntake.toFixed(1)}L / ${dailyGoal}L`,
          body: `Remaining: ${remainingIntake.toFixed(1)}L (${percentage.toFixed(0)}% complete)`,
          sound: false,
          sticky: true, // This makes it persistent
          autoDismiss: false,
          data: { type: 'persistent-status' },
          categoryIdentifier: 'persistent-status-actions', // Add action buttons for quick water tracking
        },
        trigger: null, // Immediate and persistent
      });
      
      console.log('📱 Persistent notification updated with action buttons');
    } catch (error) {
      console.error('❌ Error updating persistent notification:', error);
    }
  };

  const requestNotificationPermissions = async () => {
    try {
      console.log('🔐 Requesting notification permissions...');
      
      // Check current permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('📱 Current permission status:', existingStatus);
      
      let finalStatus = existingStatus;
      
      // Only ask if permissions have not been determined
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('📱 New permission status:', finalStatus);
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ Notification permission denied');
        Alert.alert(
          'Permission Needed', 
          'Please enable notifications in your device settings to receive water reminders!',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // This would ideally open device settings
              console.log('User wants to open settings');
            }}
          ]
        );
        return false;
      }
      
      console.log('✅ Notification permissions granted');
      return true;
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return false;
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
      // Update persistent notification after reset
      await updatePersistentNotification();
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
    try {
      console.log('🔄 Scheduling notifications...');
      
      // Cancel existing notifications first
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ Cancelled existing notifications');
      
      // Check notification permissions
      const { status } = await Notifications.getPermissionsAsync();
      console.log('📱 Notification permission status:', status);
      
      if (status !== 'granted') {
        console.log('❌ Notifications not permitted');
        return;
      }
      
      // Schedule custom notifications with water facts and action buttons
      const notifications = [
        {
          id: 'morning-reminder',
          title: "Good Morning! ☀️",
          body: getRandomWaterFact(),
          trigger: {
            hour: 8,
            minute: 0,
            repeats: true,
          }
        },
        {
          id: 'mid-morning',
          title: "Hydration Check! 💧",
          body: getRandomWaterFact(),
          trigger: {
            hour: 10,
            minute: 30,
            repeats: true,
          }
        },
        {
          id: 'lunch-reminder',
          title: "Lunch Hydration! 🍽️",
          body: getRandomWaterFact(),
          trigger: {
            hour: 12,
            minute: 0,
            repeats: true,
          }
        },
        {
          id: 'afternoon',
          title: "Afternoon Hydration! 🌤️",
          body: getRandomWaterFact(),
          trigger: {
            hour: 15,
            minute: 0,
            repeats: true,
          }
        },
        {
          id: 'evening',
          title: "Evening Hydration! 🌅",
          body: getRandomWaterFact(),
          trigger: {
            hour: 18,
            minute: 0,
            repeats: true,
          }
        }
      ];
      
      // Schedule each notification with custom actions
      for (const notification of notifications) {
        const scheduledId = await Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title,
            body: notification.body,
            sound: true,
            data: { type: 'water-reminder' },
            // Add custom actions for the notification
            categoryIdentifier: 'water-reminder-actions',
          },
          trigger: notification.trigger,
        });
        console.log(`✅ Scheduled ${notification.id}:`, scheduledId);
      }
      
      // Set up notification categories with action buttons
      await Notifications.setNotificationCategoryAsync('water-reminder-actions', [
        {
          identifier: 'add-200ml',
          buttonTitle: '+200ml',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: 'dismiss',
          buttonTitle: 'Dismiss',
          options: {
            isDestructive: true,
            isAuthenticationRequired: false,
          },
        },
      ]);


      
      // Create initial persistent notification
      await updatePersistentNotification();
      
      // Schedule a test notification for 1 minute from now
      const testId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test Custom Notification 🧪",
          body: getRandomWaterFact(),
          sound: true,
          categoryIdentifier: 'water-reminder-actions',
        },
        trigger: {
          seconds: 60, // 1 minute from now
        },
      });
      console.log('🧪 Test notification scheduled:', testId);
      
      // List all scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('📋 Total scheduled notifications:', scheduledNotifications.length);
      scheduledNotifications.forEach((notification, index) => {
        console.log(`  ${index + 1}. ${notification.content.title} - ${notification.trigger}`);
      });
      
    } catch (error) {
      console.error('❌ Error scheduling notifications:', error);
      Alert.alert(
        'Notification Error',
        'Failed to schedule notifications. Please check your notification permissions.',
        [{ text: 'OK' }]
      );
    }
  };

  const getRandomWaterFact = () => {
    return waterFacts[Math.floor(Math.random() * waterFacts.length)];
  };

  const addWater = async (amount) => {
    console.log(`💧 Adding ${amount}L water. Current: ${currentIntake}L, Goal: ${dailyGoal}L, GoalReached: ${goalReached}`);
    
    if (goalReached) {
      console.log('❌ Goal already reached, cannot add more water');
      return;
    }

    const newIntake = currentIntake + amount;
    console.log(`📊 New intake will be: ${newIntake}L`);
    
    setCurrentIntake(newIntake);

    try {
      await AsyncStorage.setItem('currentIntake', newIntake.toString());
    } catch (error) {
      console.error('Error saving intake:', error);
    }

    // Update persistent notification when water is added
    await updatePersistentNotification();

    // Check if goal is reached with more precise comparison
    if (newIntake >= dailyGoal && !goalReached && dailyGoal > 0) {
      console.log(`🎉 Goal reached! ${newIntake}L >= ${dailyGoal}L`);
      setGoalReached(true);
      await AsyncStorage.setItem('goalReached', 'true');
      
      // Show achievement notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🎉 Goal Achieved!",
          body: "Congratulations! You've reached your daily water intake goal!",
          sound: true,
        },
        trigger: null,
      });
      
      // Cancel scheduled notifications but keep persistent notification
      await Notifications.cancelAllScheduledNotificationsAsync();
      // Update persistent notification to show goal achieved
      await updatePersistentNotification();
      
      // Show alert after a short delay to avoid conflicts
      setTimeout(() => {
        Alert.alert(
          '🎉 Goal Achieved!',
          'Congratulations! You\'ve reached your daily water intake goal!',
          [{ text: 'Great!' }]
        );
      }, 500);
    } else {
      console.log(`📈 Progress: ${newIntake}L / ${dailyGoal}L (${((newIntake / dailyGoal) * 100).toFixed(1)}%)`);
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
                      // Cancel all notifications including persistent
                      await Notifications.cancelAllScheduledNotificationsAsync();
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

        {/* Debug button for testing notifications */}
        <TouchableOpacity
          style={[styles.resetButton, { marginTop: 10, backgroundColor: '#9C27B0' }]}
          activeOpacity={0.7}
          onPress={async () => {
            console.log('🔧 Debug button pressed');
            
            // Check permissions
            const { status } = await Notifications.getPermissionsAsync();
            console.log('📱 Current permission status:', status);
            
            // List scheduled notifications
            const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
            console.log('📋 Scheduled notifications:', scheduledNotifications.length);
            
            // Show current app state
            console.log(`📊 Current State: Intake=${currentIntake}L, Goal=${dailyGoal}L, GoalReached=${goalReached}`);
            
            Alert.alert(
              'Debug Info',
              `Current State:\nIntake: ${currentIntake}L\nGoal: ${dailyGoal}L\nGoal Reached: ${goalReached}\n\nPermissions: ${status}\nScheduled: ${scheduledNotifications.length}`,
              [{ text: 'OK' }]
            );
          }}
        >
          <Text style={styles.resetButtonText}>Debug State</Text>
        </TouchableOpacity>

        {/* Custom Notification Testing Panel */}
        <TouchableOpacity
          style={[styles.resetButton, { marginTop: 10, backgroundColor: '#FF9800' }]}
          activeOpacity={0.7}
          onPress={async () => {
            Alert.alert(
              'Custom Notification Testing',
              'Choose a test scenario:',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Water Fact + Actions', 
                  onPress: async () => {
                    await Notifications.scheduleNotificationAsync({
                      content: {
                        title: "Time to Hydrate! 💧",
                        body: getRandomWaterFact(),
                        sound: true,
                        categoryIdentifier: 'water-reminder-actions',
                      },
                      trigger: null,
                    });
                  }
                },
                { 
                  text: 'Goal Achievement', 
                  onPress: async () => {
                    await Notifications.scheduleNotificationAsync({
                      content: {
                        title: "🎉 Goal Achieved!",
                        body: "Congratulations! You've reached your daily water intake goal!",
                        sound: true,
                      },
                      trigger: null,
                    });
                  }
                },
                { 
                  text: 'Update Persistent', 
                  onPress: async () => {
                    await updatePersistentNotification();
                    Alert.alert('Success', 'Persistent notification updated with action buttons!');
                  }
                },
                { 
                  text: 'Force Refresh Persistent', 
                  onPress: async () => {
                    // Cancel and recreate the persistent notification
                    await Notifications.cancelScheduledNotificationAsync('persistent-status');
                    setTimeout(async () => {
                      await updatePersistentNotification();
                      Alert.alert('Success', 'Persistent notification refreshed!');
                    }, 1000);
                  }
                }
              ]
            );
          }}
        >
          <Text style={styles.resetButtonText}>Test Custom Notifications</Text>
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
    alignItems: 'center',
    width: '100%',
    marginBottom: 30,
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 30,
    minWidth: 120,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
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
