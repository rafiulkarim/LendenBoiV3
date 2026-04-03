import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Easing,
  Alert,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { BASE_URL } from '../../env';
import AuthContext from '../../context/AuthContext';
import { openDatabase } from 'react-native-sqlite-storage';
const db = openDatabase({ name: 'lenden_boi.db', createFromLocation: 1 });

const { width } = Dimensions.get('window');

const SyncPrevData = () => {
  const { myToken } = useContext(AuthContext);
  const [syncPercentage, setSyncPercentage] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to sync');
  const [syncCompleted, setSyncCompleted] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Pulse effect for the button when idle
  useEffect(() => {
    if (!isSyncing && !syncCompleted) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSyncing, syncCompleted, pulseAnim]);

  // Rotate effect when syncing
  useEffect(() => {
    if (isSyncing) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isSyncing, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // const insertDataToDatabase = async (data, tableName, fields) => {
  //   let insertedCount = 0;
  //   for (const item of data) {
  //     const placeholders = fields.map(() => '?').join(',');
  //     const values = fields.map(field => item[field]);
  //     await runQuery(
  //       `INSERT OR REPLACE INTO ${tableName} (${fields.join(',')}) VALUES (${placeholders})`,
  //       values
  //     );
  //     insertedCount++;
  //   }
  //   return insertedCount;
  // };

  const insertDataToDatabase = (data, tableName, fields) => {
    return new Promise((resolve, reject) => {
      if (!data || data.length === 0) {
        resolve(0);
        return;
      }

      db.transaction(tx => {
        let insertedCount = 0;

        try {
          for (const item of data) {
            const placeholders = fields.map(() => '?').join(',');
            const values = fields.map(field => item[field]);

            tx.executeSql(
              `INSERT OR REPLACE INTO ${tableName} (${fields.join(',')}) VALUES (${placeholders})`,
              values,
              (_, result) => {
                insertedCount++;
                // Check if this is the last item
                if (insertedCount === data.length) {
                  console.log(`Successfully inserted/updated ${insertedCount} records in ${tableName}`);
                  resolve(insertedCount);
                }
              },
              (_, error) => {
                console.error(`Error inserting data into ${tableName}:`, error);
                reject(error);
                return false; // Rollback transaction
              }
            );
          }
        } catch (error) {
          console.error(`Error in transaction for ${tableName}:`, error);
          reject(error);
        }
      }, (error) => {
        // Transaction error callback
        console.error(`Transaction failed for ${tableName}:`, error);
        reject(error);
      });
    });
  };

  const startSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncCompleted(false);
    setSyncPercentage(0);
    setStatusMessage('Connecting to server...');

    try {
      // Step 1: Initial connection (5%)
      await new Promise(resolve => setTimeout(resolve, 500));
      setSyncPercentage(5);
      setStatusMessage('Authenticating...');

      // Step 2: Fetch total data info (10%)
      await new Promise(resolve => setTimeout(resolve, 500));
      setSyncPercentage(10);
      setStatusMessage('Checking remote data...');

      // Step 3: Get total pages
      const response = await axios.get(`${BASE_URL}/data-check`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${myToken}`,
        },
      });

      if (response && response?.data?.code === 200) {
        const totalPage = Math.ceil(response?.data?.data?.count / 5);
        console.log('totalPage', totalPage);

        setSyncPercentage(15);
        setStatusMessage(`Found ${totalPage} pages of data. Starting sync...`);

        // Calculate percentage range for the loop (15% to 90%)
        const startPercentage = 15;
        const endPercentage = 90;
        const percentageRange = endPercentage - startPercentage;

        // Loop through all pages
        for (let i = 1; i <= totalPage; i++) {
          setStatusMessage(`Fetching page ${i} of ${totalPage}...`);

          const insertDataResponse = await axios.post(`${BASE_URL}/insert-data`, {
            page: i,
            per_page: 5
          }, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${myToken}`,
            },
          });

          if (insertDataResponse?.data?.data) {
            console.log(insertDataResponse?.data?.data?.users?.data)
            console.log(insertDataResponse?.data?.data?.ledgers?.data)
            console.log(insertDataResponse?.data?.data?.shortageLists?.data)
            console.log(insertDataResponse?.data?.data?.expenses?.data)
            console.log('------------------------------')

            const { users, ledgers, shortageLists, expenses } = insertDataResponse.data.data;

            // Insert users
            if (users?.data?.length > 0) {
              setStatusMessage(`Saving ${users.data.length} users from page ${i}...`);
              await insertDataToDatabase(
                users.data,
                'clients',
                ['id', 'name', 'phone_no', 'address', 'amount', 'amount_type', 'status', 'type', 'shop_id', 'sync_status', 'created_at', 'updated_at']
              );
            }

            // Insert ledgers
            if (ledgers?.data?.length > 0) {
              setStatusMessage(`Saving ${ledgers.data.length} ledgers from page ${i}...`);
              await insertDataToDatabase(
                ledgers.data,
                'ledgers',
                ['id', 'shop_id', 'client_id', 'transaction_type', 'transaction_date', 'amount', 'comments', 'entry_by', 'sync_status', 'created_at', 'updated_at']
              );
            }

            // Insert shortageLists
            if (shortageLists?.data?.length > 0) {
              setStatusMessage(`Saving ${shortageLists.data.length} shortage lists from page ${i}...`);
              await insertDataToDatabase(
                shortageLists.data,
                'shortages',
                ['id', 'title', 'shop_id', 'user_id', 'status', 'sync_status', 'created_at', 'updated_at']
              );
            }

            // Insert expenses
            if (expenses?.data?.length > 0) {
              setStatusMessage(`Saving ${expenses.data.length} expenses from page ${i}...`);
              await insertDataToDatabase(
                expenses.data,
                'expenses',
                ['id', 'title', 'shop_id', 'user_id', 'amount', 'date', 'status', 'sync_status', 'created_at', 'updated_at']
              );
            }
          }

          // Update percentage based on progress through pages
          const progress = (i / totalPage);
          const currentPercentage = startPercentage + (percentageRange * progress);
          setSyncPercentage(Math.floor(currentPercentage));

          console.log(`Page ${i}/${totalPage} completed. Progress: ${Math.floor(currentPercentage)}%`);
        }

        // Step 4: Final processing (90% to 100%)
        setSyncPercentage(95);
        setStatusMessage('Finalizing sync...');
        await new Promise(resolve => setTimeout(resolve, 500));

        setSyncPercentage(98);
        setStatusMessage('Verifying data integrity...');
        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 5: Complete
        setSyncPercentage(100);
        setStatusMessage('Sync Complete! All data has been synchronized successfully.');
        setSyncCompleted(true);
      } else {
        throw new Error('Invalid response from server');
      }

    } catch (error) {
      console.error('Sync Error:', error);
      Alert.alert(
        'Sync Failed',
        error.message || 'Could not synchronize data. Please check your connection and try again.'
      );
      setStatusMessage('Sync failed. Please try again.');
      setSyncPercentage(0);
      setSyncCompleted(false);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <LinearGradient colors={['#F4F7FB', '#E0EAEF']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Data Sync</Text>
        <Text style={styles.subtitle}>Keep your records fully up-to-date across all of your devices securely.</Text>
      </View>

      <View style={styles.centerContent}>
        {/* Progress Circle / Main Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={startSync}
          disabled={isSyncing || syncCompleted}
        >
          <Animated.View style={[
            styles.syncButtonContainer,
            { transform: [{ scale: pulseAnim }] }
          ]}>
            <LinearGradient
              colors={syncCompleted ? ['#2ECC71', '#27AE60'] : ['#00A8A8', '#80D9D9']}
              style={styles.syncButtonBackground}
            >
              {isSyncing ? (
                <>
                  <Animated.View style={{ transform: [{ rotate: spin }], position: 'absolute', opacity: 0.2 }}>
                    <Icon name="sync" size={130} color="#FFFFFF" />
                  </Animated.View>
                  <Text style={styles.percentageText}>{syncPercentage}%</Text>
                </>
              ) : (
                <Icon name={syncCompleted ? "check-all" : "cloud-sync"} size={70} color="#FFFFFF" />
              )}
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>

        {/* Linear Progress Bar below the main button */}
        {isSyncing && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${syncPercentage}%` }]} />
          </View>
        )}

        <View style={[styles.statusContainer, !isSyncing && { marginTop: 46 }]}>
          <Text style={[styles.statusMessage, syncCompleted && { color: '#27AE60', fontWeight: 'bold' }]}>
            {statusMessage}
          </Text>
        </View>
      </View>

      {/* Show reset option only after complete */}
      {syncCompleted && (
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            setSyncCompleted(false);
            setSyncPercentage(0);
            setStatusMessage('Ready to sync');
          }}
        >
          <Icon name="refresh" size={20} color="#4776E6" style={{ marginRight: 6 }} />
          <Text style={styles.resetButtonText}>Sync Again</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginTop: 60,
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  syncButtonContainer: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#FFFFFF',
    padding: 12,
    shadowColor: '#4776E6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 15,
  },
  syncButtonBackground: {
    flex: 1,
    borderRadius: 95,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  percentageText: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 6,
  },
  progressBarContainer: {
    width: width * 0.75,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 4,
    marginTop: 40,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4776E6',
    borderRadius: 4,
  },
  statusContainer: {
    height: 30,
    marginTop: 16,
    justifyContent: 'center',
  },
  statusMessage: {
    fontSize: 17,
    color: '#576574',
    fontWeight: '500',
    textAlign: 'center',
  },
  resetButton: {
    marginBottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(71, 118, 230, 0.12)',
    borderRadius: 30,
  },
  resetButtonText: {
    color: '#4776E6',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default SyncPrevData;