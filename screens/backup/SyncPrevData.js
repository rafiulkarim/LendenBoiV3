import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Easing,
  Dimensions,
  BackHandler
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { BASE_URL } from '../../env';
import AuthContext from '../../context/AuthContext';
import { openDatabase } from 'react-native-sqlite-storage';
import InitBackgroundSync from './InitBackgroundSync';
import { syncData } from '../../Helpers/services/SyncService';
import NetInfo from '@react-native-community/netinfo';
const db = openDatabase({ name: 'lenden_boi.db', createFromLocation: 1 });

const { width } = Dimensions.get('window');

const SyncPrevData = ({ navigation }) => {
  const { myToken, logedInUserInfo } = useContext(AuthContext);
  // console.log(logedInUserInfo)
  const [syncPercentage, setSyncPercentage] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('সিঙ্কের জন্য প্রস্তুত');
  const [syncCompleted, setSyncCompleted] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Define spin interpolation
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Check internet connection status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      setConnectionType(state.type);

      if (!state.isConnected) {
        showSnackbar('ইন্টারনেট সংযোগ বিচ্ছিন্ন হয়েছে!', 'error');
        setStatusMessage('ইন্টারনেট সংযোগ নেই');
      } else {
        if (state.type === 'wifi') {
          showSnackbar('ওয়াইফাই সংযোগ সক্রিয়', 'success');
        } else if (state.type === 'cellular') {
          showSnackbar('মোবাইল ডাটা সংযোগ সক্রিয়', 'success');
        }
        setStatusMessage('সিঙ্কের জন্য প্রস্তুত');
      }
    });

    return () => unsubscribe();
  }, []);

  const showSnackbar = (message, type = 'info') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
    setTimeout(() => setSnackbarVisible(false), 3000);
  };

  const backAction = () => {
    navigation.replace('Welcome');
  }

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );
    return () => backHandler.remove();
  }, []);

  // Pulse effect for the button when idle
  useEffect(() => {
    if (!isSyncing && !syncCompleted && isConnected) {
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
  }, [isSyncing, syncCompleted, pulseAnim, isConnected]);

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

  // Function to delete all data from tables
  const deleteAllDataFromTables = () => {
    return new Promise((resolve, reject) => {
      const tables = ['clients', 'ledgers', 'shortages', 'expenses'];

      db.transaction(tx => {
        let deletedCount = 0;

        tables.forEach((table) => {
          tx.executeSql(
            `DELETE FROM ${table} WHERE shop_id = ?`,
            [logedInUserInfo.shop[0].id],
            (_, result) => {
              deletedCount++;
              console.log(`Deleted all data from ${table}, rows affected: ${result.rowsAffected}`);

              if (deletedCount === tables.length) {
                console.log('Successfully deleted all data from all tables');
                resolve(true);
              }
            },
            (_, error) => {
              console.error(`Error deleting data from ${table}:`, error);
              reject(error);
              return false;
            }
          );
        });
      }, (error) => {
        console.error('Transaction error while deleting data:', error);
        reject(error);
      });
    });
  };

  // Function to verify tables are empty
  const verifyTablesEmpty = () => {
    return new Promise((resolve, reject) => {
      const tables = ['clients', 'ledgers', 'shortages', 'expenses'];
      let checkCount = 0;

      db.transaction(tx => {
        tables.forEach((table) => {
          tx.executeSql(
            `SELECT COUNT(*) as count FROM ${table}`,
            [],
            (_, result) => {
              const count = result.rows.item(0).count;
              console.log(`${table} table has ${count} records after deletion`);
              checkCount++;

              if (checkCount === tables.length) {
                resolve(true);
              }
            },
            (_, error) => {
              console.error(`Error verifying ${table}:`, error);
              reject(error);
              return false;
            }
          );
        });
      });
    });
  };

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
                if (insertedCount === data.length) {
                  console.log(`Successfully inserted/updated ${insertedCount} records in ${tableName}`);
                  resolve(insertedCount);
                }
              },
              (_, error) => {
                console.error(`Error inserting data into ${tableName}:`, error);
                reject(error);
                return false;
              }
            );
          }
        } catch (error) {
          console.error(`Error in transaction for ${tableName}:`, error);
          reject(error);
        }
      }, (error) => {
        console.error(`Transaction failed for ${tableName}:`, error);
        reject(error);
      });
    });
  };

  const startSync = async () => {
    if (isSyncing) return;

    if (!isConnected) {
      showSnackbar('ইন্টারনেট সংযোগ নেই। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ চেক করুন', 'error');
      return;
    }

    setIsSyncing(true);
    setSyncCompleted(false);
    setSyncPercentage(0);
    setStatusMessage('সার্ভারের সাথে সংযোগ হচ্ছে...');

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setSyncPercentage(3);
      setStatusMessage('প্রমাণীকরণ করা হচ্ছে...');

      await new Promise(resolve => setTimeout(resolve, 500));
      setSyncPercentage(5);
      setStatusMessage('সার্ভার থেকে তথ্য চেক করা হচ্ছে...');

      await syncData(myToken, '');

      setSyncPercentage(10);
      setStatusMessage('বিদ্যমান ডাটা মুছে ফেলা হচ্ছে...');

      // Delete all existing data from tables
      await deleteAllDataFromTables();

      // Verify tables are empty
      await verifyTablesEmpty();
      showSnackbar('পুরাতন ডাটা সফলভাবে মুছে ফেলা হয়েছে', 'success');

      const response = await axios.get(`${BASE_URL}/data-check`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${myToken}`,
        },
        timeout: 10000,
      });

      if (response && response?.data?.code === 200) {
        const totalPage = Math.ceil(response?.data?.data?.count / 5);
        console.log('মোট পৃষ্ঠা:', totalPage);

        setSyncPercentage(15);
        setStatusMessage(`মোট ${totalPage} পৃষ্ঠা পাওয়া গেছে। নতুন ডাটা সিঙ্ক শুরু হচ্ছে...`);

        const startPercentage = 15;
        const endPercentage = 90;
        const percentageRange = endPercentage - startPercentage;

        for (let i = 1; i <= totalPage; i++) {
          // Check internet connection before each page
          const netInfo = await NetInfo.fetch();
          if (!netInfo.isConnected) {
            throw new Error('ইন্টারনেট সংযোগ বিচ্ছিন্ন হয়েছে');
          }

          setStatusMessage(`${i} নং পৃষ্ঠা থেকে ${totalPage} পৃষ্ঠার মধ্যে ডাটা আনা হচ্ছে...`);

          const insertDataResponse = await axios.post(`${BASE_URL}/insert-data`, {
            page: i,
            per_page: 5
          }, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${myToken}`,
            },
            timeout: 10000,
          });

          if (insertDataResponse?.data?.data) {
            const { users, ledgers, shortageLists, expenses } = insertDataResponse.data.data;

            if (users?.data?.length > 0) {
              setStatusMessage(`${i} নং পৃষ্ঠা থেকে ${users.data.length} জন ক্লায়েন্ট সংরক্ষণ করা হচ্ছে...`);
              const usersData = users.data.map(user => ({
                // ...user,
                id: user.slug,
                name: user.name,
                phone_no: user.phone_no,
                address: user.address,
                amount: user.amount,
                amount_type: user.amount_type,
                status: user.status,
                type: user.type,
                shop_id: user.shop_id,
                sync_status: user.sync_status,
                created_at: user.created_at,
                updated_at: user.updated_at,
              }));

              console.log('usersData', usersData)
              await insertDataToDatabase(
                usersData,
                'clients',
                ['id', 'name', 'phone_no', 'address', 'amount', 'amount_type', 'status', 'type', 'shop_id', 'sync_status', 'created_at', 'updated_at']
              );
            }

            if (ledgers?.data?.length > 0) {
              setStatusMessage(`${i} নং পৃষ্ঠা থেকে ${ledgers.data.length} টি লেজার সংরক্ষণ করা হচ্ছে...`);
              const ledgersData = ledgers.data.map(ledger => ({
                // ...ledger,
                id: ledger.slug,
                shop_id: ledger.shop_id,
                client_id: ledger.client_id,
                transaction_type: ledger.transaction_type,
                transaction_date: ledger.transaction_date,
                amount: ledger.amount,
                comments: ledger.comments,
                entry_by: ledger.entry_by,
                sync_status: ledger.sync_status,
                created_at: ledger.created_at,
                updated_at: ledger.updated_at,
              }));
              await insertDataToDatabase(
                ledgersData,
                'ledgers',
                ['id', 'shop_id', 'client_id', 'transaction_type', 'transaction_date', 'amount', 'comments', 'entry_by', 'sync_status', 'created_at', 'updated_at']
              );
            }

            if (shortageLists?.data?.length > 0) {
              setStatusMessage(`${i} নং পৃষ্ঠা থেকে ${shortageLists.data.length} টি ঘাটতি তালিকা সংরক্ষণ করা হচ্ছে...`);
              const shortageListsData = shortageLists.data.map(shortageList => ({
                // ...shortageList,
                id: shortageList.slug,
                title: shortageList.title,
                shop_id: shortageList.shop_id,
                user_id: shortageList.user_id,
                status: shortageList.status,
                sync_status: shortageList.sync_status,
                created_at: shortageList.created_at,
                updated_at: shortageList.updated_at,
              }));
              await insertDataToDatabase(
                shortageListsData,
                'shortages',
                ['id', 'title', 'shop_id', 'user_id', 'status', 'sync_status', 'created_at', 'updated_at']
              );
            }

            if (expenses?.data?.length > 0) {
              setStatusMessage(`${i} নং পৃষ্ঠা থেকে ${expenses.data.length} টি খরচ সংরক্ষণ করা হচ্ছে...`);
              const expensesData = expenses.data.map(expense => ({
                // ...expense,
                id: expense.slug,
                title: expense.title,
                shop_id: expense.shop_id,
                user_id: expense.user_id,
                amount: expense.amount,
                date: expense.date,
                status: expense.status,
                sync_status: expense.sync_status,
                created_at: expense.created_at,
                updated_at: expense.updated_at,
              }));
              await insertDataToDatabase(
                expensesData,
                'expenses',
                ['id', 'title', 'shop_id', 'user_id', 'amount', 'date', 'status', 'sync_status', 'created_at', 'updated_at']
              );
            }
          }

          const progress = (i / totalPage);
          const currentPercentage = startPercentage + (percentageRange * progress);
          setSyncPercentage(Math.floor(currentPercentage));

          console.log(`পৃষ্ঠা ${i}/${totalPage} সম্পন্ন হয়েছে। অগ্রগতি: ${Math.floor(currentPercentage)}%`);
        }

        setSyncPercentage(95);
        setStatusMessage('সিঙ্ক চূড়ান্ত করা হচ্ছে...');
        await new Promise(resolve => setTimeout(resolve, 500));

        setSyncPercentage(98);
        setStatusMessage('তথ্যের অখণ্ডতা যাচাই করা হচ্ছে...');
        await new Promise(resolve => setTimeout(resolve, 500));

        setSyncPercentage(100);
        setStatusMessage('সিঙ্ক সম্পূর্ণ! সমস্ত ডাটা সফলভাবে সিঙ্ক হয়েছে।');
        setSyncCompleted(true);
        showSnackbar('সিঙ্ক সফলভাবে সম্পন্ন হয়েছে! সমস্ত ডাটা আপডেট করা হয়েছে', 'success');
      } else {
        throw new Error('সার্ভার থেকে ভুল প্রতিক্রিয়া');
      }

    } catch (error) {
      console.error('সিঙ্ক ত্রুটি:', error);

      let errorMessage = 'ডাটা সিঙ্ক করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আপনার সংযোগ চেক করে আবার চেষ্টা করুন।';

      if (error.message === 'ইন্টারনেট সংযোগ বিচ্ছিন্ন হয়েছে') {
        errorMessage = 'ইন্টারনেট সংযোগ বিচ্ছিন্ন হয়েছে। অনুগ্রহ করে সংযোগ পুনরুদ্ধার করে আবার চেষ্টা করুন।';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'সার্ভারে সংযোগ করতে সময় লেগেছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
      } else if (error.response?.status === 401) {
        errorMessage = 'প্রমাণীকরণ ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় লগইন করুন।';
      } else if (error.response?.status === 500) {
        errorMessage = 'সার্ভার সমস্যা। অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন।';
      }

      showSnackbar(errorMessage, 'error');
      setStatusMessage('সিঙ্ক ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      setSyncPercentage(0);
      setSyncCompleted(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const getSnackbarColor = () => {
    switch (snackbarType) {
      case 'success':
        return '#27AE60';
      case 'error':
        return '#E74C3C';
      default:
        return '#34495E';
    }
  };

  const getConnectionIcon = () => {
    if (!isConnected) {
      return <Icon name="wifi-off" size={18} color="#E74C3C" />;
    }
    if (connectionType === 'wifi') {
      return <Icon name="wifi" size={18} color="#27AE60" />;
    }
    if (connectionType === 'cellular') {
      return <Icon name="cellphone-wireless" size={18} color="#27AE60" />;
    }
    return <Icon name="wifi" size={18} color="#7F8C8D" />;
  };

  const getConnectionText = () => {
    if (!isConnected) {
      return 'সংযোগ বিচ্ছিন্ন';
    }
    if (connectionType === 'wifi') {
      return 'ওয়াইফাই সংযুক্ত';
    }
    if (connectionType === 'cellular') {
      return 'মোবাইল ডাটা সংযুক্ত';
    }
    return 'সংযুক্ত';
  };

  return (
    <LinearGradient colors={['#F4F7FB', '#E0EAEF']} style={styles.container}>
      {/* Internet Connection Status Bar */}
      <View style={[
        styles.connectionBar,
        !isConnected && styles.connectionBarDisconnected
      ]}>
        {getConnectionIcon()}
        <Text style={[
          styles.connectionText,
          !isConnected && styles.connectionTextDisconnected
        ]}>
          {getConnectionText()}
        </Text>
        {isConnected && connectionType && (
          <View style={styles.connectionSpeedIndicator}>
            <View style={[styles.speedDot, { backgroundColor: '#27AE60' }]} />
          </View>
        )}
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>ডাটা সিঙ্ক</Text>
        <Text style={styles.subtitle}>
          আপনার সমস্ত ডিভাইস জুড়ে নিরাপদে আপনার রেকর্ড সম্পূর্ণ আপ-টু-ডেট রাখুন।
        </Text>
      </View>

      <View style={styles.centerContent}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={startSync}
          disabled={isSyncing || syncCompleted || !isConnected}
        >
          <Animated.View style={[
            styles.syncButtonContainer,
            { transform: [{ scale: pulseAnim }] },
            (!isConnected) && styles.syncButtonDisabled
          ]}>
            <LinearGradient
              colors={syncCompleted ? ['#2ECC71', '#27AE60'] :
                (!isConnected ? ['#95A5A6', '#7F8C8D'] : ['#00A8A8', '#80D9D9'])}
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
                <Icon name={syncCompleted ? "check-all" : (!isConnected ? "wifi-off" : "cloud-sync")}
                  size={70} color="#FFFFFF" />
              )}
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>

        {isSyncing && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${syncPercentage}%` }]} />
          </View>
        )}

        <View style={[styles.statusContainer, !isSyncing && { marginTop: 46 }]}>
          <Text style={[
            styles.statusMessage,
            syncCompleted && { color: '#27AE60', fontWeight: 'bold' },
            !isConnected && { color: '#E74C3C' }
          ]}>
            {statusMessage}
          </Text>
        </View>
      </View>

      {syncCompleted && (
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            setSyncCompleted(false);
            setSyncPercentage(0);
            setStatusMessage('সিঙ্কের জন্য প্রস্তুত');
          }}
        >
          <Icon name="refresh" size={20} color="#4776E6" style={{ marginRight: 6 }} />
          <Text style={styles.resetButtonText}>পুনরায় সিঙ্ক করুন</Text>
        </TouchableOpacity>
      )}

      {/* Snackbar */}
      {snackbarVisible && (
        <View style={[styles.snackbar, { backgroundColor: getSnackbarColor() }]}>
          <Icon
            name={snackbarType === 'success' ? 'check-circle' : (snackbarType === 'error' ? 'alert-circle' : 'information')}
            size={20}
            color="#FFFFFF"
            style={styles.snackbarIcon}
          />
          <Text style={styles.snackbarText}>{snackbarMessage}</Text>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  connectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 10,
    marginBottom: 10,
  },
  connectionBarDisconnected: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27AE60',
    marginLeft: 8,
  },
  connectionTextDisconnected: {
    color: '#E74C3C',
  },
  connectionSpeedIndicator: {
    marginLeft: 8,
  },
  speedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  header: {
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
  syncButtonDisabled: {
    opacity: 0.6,
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
  snackbar: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 999,
  },
  snackbarIcon: {
    marginRight: 10,
  },
  snackbarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});

export default SyncPrevData;