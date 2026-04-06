import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  Modal,
  BackHandler
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { syncData } from '../../Helpers/services/SyncService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AuthContext from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const colors = {
  primary: '#00A8A8',
  primaryLight: '#4DC9C9',
  primaryLighter: '#80D9D9',
  primaryLightest: '#E6F7F7',
  primaryDark: '#008787',
  primaryDarker: '#006666',
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  background: '#f8f9fa',
  surface: '#ffffff',
  textPrimary: '#1A535C',
  info: '#17a2b8',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
};

const DataBackupForcely = ({ navigation }) => {
  const { myToken } = useContext(AuthContext)
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupStats, setBackupStats] = useState({
    totalBackups: 0,
    lastBackupSize: '০ KB',
    successRate: 100
  });
  const [syncStats, setSyncStats] = useState(null); // { clients, ledgers, shortages, expenses, total }

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const backAction = () => {
    navigation.replace('Welcome');
    return true;
  }

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    loadLastSync();
    loadBackupStats();
    startPulseAnimation();

    // Listen for real-time connectivity changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => {
      unsubscribe();
      // Stop pulse loop on unmount to prevent updates on unmounted component
      if (pulseAnimRef.current) pulseAnimRef.current.stop();
    };
  }, []);

  useEffect(() => {
    if (!status || showProgressModal) return;
    fadeAnim.setValue(0);
    const anim = Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(4000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);
    anim.start(({ finished }) => {
      if (finished) {
        // Defer state update out of animation frame
        setTimeout(() => setStatus(''), 0);
      }
    });
    return () => anim.stop();
  }, [status, showProgressModal]);

  const pulseAnimRef = useRef(null);

  const startPulseAnimation = () => {
    // Defer past the initial render cycle to avoid useInsertionEffect warning
    setTimeout(() => {
      pulseAnimRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimRef.current.start();
    }, 0);
  };

  const loadBackupStats = async () => {
    try {
      const total = await AsyncStorage.getItem('total_backups');
      const size = await AsyncStorage.getItem('last_backup_size');
      setBackupStats({
        totalBackups: total ? parseInt(total) : 0,
        lastBackupSize: size || '০ KB',
        successRate: 100
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadLastSync = async () => {
    const time = await AsyncStorage.getItem('last_sync_at');
    if (time) {
      setLastSync(formatDateTime(time));
    }
  };

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('bn-BD', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      relative: getRelativeTime(date)
    };
  };

  const getRelativeTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'এখনই';
    if (diffMins < 60) return `${diffMins} মিনিট আগে`;
    if (diffHours < 24) return `${diffHours} ঘন্টা আগে`;
    if (diffDays < 7) return `${diffDays} দিন আগে`;
    return date.toLocaleDateString('bn-BD');
  };

  const updateProgress = (progress) => {
    setBackupProgress(progress);
    Animated.timing(progressAnim, {
      toValue: progress / 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };



  const handleBackup = async () => {
    const state = await NetInfo.fetch();

    if (!state.isConnected) {
      Alert.alert(
        'সংযোগ ত্রুটি',
        'সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',
        [
          { text: 'বাতিল', style: 'cancel' },
          { text: 'পুনরায় চেষ্টা', onPress: handleBackup }
        ]
      );
      return;
    }

    setShowConfirmModal(false);
    setShowProgressModal(true);
    setBackupProgress(0);
    setSyncStats(null);
    animateButton();

    try {
      setLoading(true);
      setStatusType('loading');

      // Real progress driven by SyncService steps
      const handleProgress = (percent, label) => {
        updateProgress(percent);
        setStatus(label);
      };

      const result = await syncData(myToken, handleProgress);

      const newTime = new Date().toISOString();
      await AsyncStorage.setItem('last_sync_at', newTime);

      const newTotalBackups = backupStats.totalBackups + 1;
      await AsyncStorage.setItem('total_backups', newTotalBackups.toString());

      if (result?.synced) {
        setSyncStats(result.synced);
        await AsyncStorage.setItem('last_sync_stats', JSON.stringify(result.synced));
      }

      setBackupStats(prev => ({ ...prev, totalBackups: newTotalBackups }));
      setLastSync(formatDateTime(newTime));
      setStatusType('success');
      setStatus(
        result?.message === 'Nothing to sync.'
          ? 'সিঙ্ক করার নতুন ডেটা নেই। সব আপ-টু-ডেট!'
          : `সিঙ্ক সম্পন্ন! মোট ${result?.synced?.total ?? 0} টি রেকর্ড সংরক্ষিত হয়েছে।`
      );

      // setTimeout(() => setShowProgressModal(false), 1800);

    } catch (error) {
      console.error('Sync error:', error);
      setStatusType('error');
      setStatus(`ব্যাকআপ ব্যর্থ: ${error?.message ?? 'অজানা ত্রুটি'}`);
      // setTimeout(() => setShowProgressModal(false), 2500);
    } finally {
      setLoading(false);
    }
  };


  const animateButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ✅ Confirm Modal — inline JSX, NOT a nested component */}
      <Modal
        transparent
        visible={showConfirmModal}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.modalIconContainer}>
              <Icon name="cloud-upload" size={48} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>ব্যাকআপ নিশ্চিত করুন</Text>
            <Text style={styles.modalText}>
              আপনার অ্যাপ্লিকেশনের সমস্ত ডেটা সুরক্ষিত ক্লাউড স্টোরেজে ব্যাকআপ করা হবে।
              আপনার ডেটার আকারের উপর নির্ভর করে প্রক্রিয়াটি কিছুক্ষণ সময় নিতে পারে।
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleBackup}
              >
                <Text style={styles.modalButtonConfirmText}>ব্যাকআপ</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ✅ Progress Modal — inline JSX, NOT a nested component */}
      <Modal
        transparent
        visible={showProgressModal}
        animationType="fade"
        onRequestClose={() => {
          if (!loading) setShowProgressModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.progressModalContent}>
            <View style={styles.progressIconContainer}>
              {backupProgress === 100 ? (
                <Icon name="check-circle" size={56} color={colors.success} />
              ) : (
                <Icon name="cloud-upload" size={56} color={colors.primary} />
              )}
            </View>

            <Text style={styles.progressTitle}>
              {backupProgress === 100 ? 'ব্যাকআপ সম্পূর্ণ!' : 'ব্যাকআপ প্রক্রিয়াধীন...'}
            </Text>

            <Text style={styles.progressStatus}>{status}</Text>

            <View style={styles.progressBarContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>

            <Text style={styles.progressPercentage}>{Math.round(backupProgress)}%</Text>

            {backupProgress === 100 && (
              <>
                <View style={styles.successAnimation}>
                  <Icon name="check-circle" size={24} color={colors.success} />
                  <Text style={styles.successText}>ব্যাকআপ সফল হয়েছে</Text>
                </View>

                {/* Sync stats breakdown */}
                {/* {syncStats && syncStats.total > 0 && (
                  <View style={styles.syncStatsContainer}>
                    <Text style={styles.syncStatsTitle}>সিঙ্ক বিবরণ</Text>
                    <View style={styles.syncStatsGrid}>
                      <View style={styles.syncStatItem}>
                        <Icon name="account-group" size={18} color={colors.primary} />
                        <Text style={styles.syncStatValue}>{syncStats.clients}</Text>
                        <Text style={styles.syncStatLabel}>কাস্টমার</Text>
                      </View>
                      <View style={styles.syncStatItem}>
                        <Icon name="book-open-variant" size={18} color={colors.info} />
                        <Text style={styles.syncStatValue}>{syncStats.ledgers}</Text>
                        <Text style={styles.syncStatLabel}>লেজার</Text>
                      </View>
                      <View style={styles.syncStatItem}>
                        <Icon name="alert-circle-outline" size={18} color={colors.warning} />
                        <Text style={styles.syncStatValue}>{syncStats.shortages}</Text>
                        <Text style={styles.syncStatLabel}>ঘাটতি</Text>
                      </View>
                      <View style={styles.syncStatItem}>
                        <Icon name="cash-minus" size={18} color={colors.error} />
                        <Text style={styles.syncStatValue}>{syncStats.expenses}</Text>
                        <Text style={styles.syncStatLabel}>খরচ</Text>
                      </View>
                    </View>
                    <View style={styles.syncStatTotal}>
                      <Text style={styles.syncStatTotalText}>মোট {syncStats.total} টি রেকর্ড</Text>
                    </View>
                  </View>
                )} */}

                {syncStats && syncStats.total === 0 && (
                  <View style={styles.nothingToSyncBox}>
                    <Icon name="check-all" size={20} color={colors.success} />
                    <Text style={styles.nothingToSyncText}>সব ডেটা আগেই সিঙ্ক হয়েছে</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeProgressButton}
                  onPress={() => setShowProgressModal(false)}
                >
                  <Text style={styles.closeProgressButtonText}>বন্ধ করুন</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.badge}>
            <Icon name="shield-check" size={16} color={colors.primary} />
            <Text style={styles.badgeText}>সুরক্ষিত ব্যাকআপ</Text>
          </View>
        </View>

        <Animated.View style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.iconContainer}>
            <Icon name="cloud-upload-outline" size={56} color={colors.primary} />
          </View>
        </Animated.View>

        <Text style={styles.title}>ডেটা ব্যাকআপ</Text>
      </View>

      {/* Last Backup Card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ব্যাকআপ ইতিহাস</Text>
        <View style={styles.historyCard}>
          <View style={styles.historyIcon}>
            <Icon name="calendar-clock" size={24} color={colors.primary} />
          </View>
          <View style={styles.historyContent}>
            <Text style={styles.historyLabel}>শেষ সফল ব্যাকআপ</Text>
            {lastSync ? (
              <>
                <Text style={styles.historyDate}>{lastSync.date}</Text>
                <Text style={styles.historyTime}>{lastSync.time}</Text>
                <View style={styles.relativeBadge}>
                  <Icon name="clock-outline" size={12} color={colors.gray600} />
                  <Text style={styles.relativeText}>{lastSync.relative}</Text>
                </View>
              </>
            ) : (
              <View style={styles.noBackupContainer}>
                <Icon name="alert-circle-outline" size={20} color={colors.warning} />
                <Text style={styles.noBackupText}>কোনো ব্যাকআপ ইতিহাস পাওয়া যায়নি</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Backup Button */}
      <Animated.View style={[styles.buttonWrapper, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={() => setShowConfirmModal(true)}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator color={colors.surface} size="small" />
              <Text style={styles.buttonText}>ব্যাকআপ প্রক্রিয়াধীন...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <Icon name="cloud-upload" size={24} color={colors.surface} />
              <Text style={styles.buttonText}>ব্যাকআপ নিন</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Internet Connection Alert */}
      {!isConnected ? (
        <View style={styles.internetAlertContainer}>
          <View style={styles.internetAlertIconBox}>
            <Icon name="wifi-off" size={22} color="#fff" />
          </View>
          <View style={styles.internetAlertTextWrapper}>
            <Text style={styles.internetAlertTitle}>ইন্টারনেট সংযোগ নেই</Text>
            <Text style={styles.internetAlertSub}>
              ব্যাকআপ করতে সক্রিয় ইন্টারনেট সংযোগ প্রয়োজন
            </Text>
          </View>
          <View style={styles.internetAlertPulse} />
        </View>
      ) : (
        <View style={styles.internetConnectedContainer}>
          <Icon name="wifi-check" size={16} color={colors.success} />
          <Text style={styles.internetConnectedText}>ইন্টারনেট সংযুক্ত</Text>
        </View>
      )}

      {/* Status Message */}
      {status !== '' && !showProgressModal && (
        <Animated.View
          style={[
            styles.statusContainer,
            statusType === 'success' && styles.statusSuccess,
            statusType === 'error' && styles.statusError,
            statusType === 'loading' && styles.statusLoading,
            { opacity: fadeAnim }
          ]}
        >
          <Icon
            name={
              statusType === 'success' ? 'check-circle' :
                statusType === 'error' ? 'alert-circle' :
                  'loading'
            }
            size={20}
            color={
              statusType === 'success' ? colors.success :
                statusType === 'error' ? colors.error :
                  colors.primary
            }
          />
          <Text style={styles.statusText}>{status}</Text>
        </Animated.View>
      )}

      {/* Footer Note */}
      <View style={styles.footer}>
        <Icon name="information-outline" size={14} color={colors.gray400} />
        <Text style={styles.footerText}>
          ব্যাকআপগুলি স্বয়ংক্রিয়ভাবে এনক্রিপ্ট করা হয় এবং নিরাপদে সংরক্ষণ করা হয়
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLightest,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
    marginLeft: 6,
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  historyContent: {
    flex: 1,
  },
  historyLabel: {
    fontSize: 12,
    color: colors.gray600,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 14,
    color: colors.gray600,
    marginBottom: 6,
  },
  relativeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relativeText: {
    fontSize: 12,
    color: colors.gray500,
    marginLeft: 4,
  },
  noBackupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noBackupText: {
    fontSize: 14,
    color: colors.gray500,
    marginLeft: 8,
  },
  buttonWrapper: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
    marginLeft: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusSuccess: {
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  statusError: {
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  statusLoading: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    color: colors.gray700,
    marginLeft: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 12,
    color: colors.gray400,
    marginLeft: 6,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 48,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 6,
  },
  modalButtonCancel: {
    backgroundColor: colors.gray100,
  },
  modalButtonCancelText: {
    color: colors.gray700,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  modalButtonConfirmText: {
    color: colors.surface,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Progress Modal Styles
  progressModalContent: {
    width: width - 48,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  progressIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 12,
  },
  progressStatus: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: colors.gray200,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 20,
  },
  successAnimation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  successText: {
    fontSize: 14,
    color: colors.success,
    marginLeft: 8,
    fontWeight: '500',
  },
  closeProgressButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  closeProgressButtonText: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  // Internet Connection Alert
  internetAlertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  internetAlertIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  internetAlertTextWrapper: {
    flex: 1,
  },
  internetAlertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 2,
  },
  internetAlertSub: {
    fontSize: 12,
    color: '#9f1239',
    lineHeight: 16,
  },
  internetAlertPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
    marginLeft: 8,
  },
  internetConnectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignSelf: 'center',
  },
  internetConnectedText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
    marginLeft: 6,
  },
  // Sync Stats inside Progress Modal
  syncStatsContainer: {
    width: '100%',
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  syncStatsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray500,
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  syncStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  syncStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginHorizontal: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  syncStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray900,
    marginTop: 4,
    marginBottom: 2,
  },
  syncStatLabel: {
    fontSize: 10,
    color: colors.gray500,
    fontWeight: '500',
  },
  syncStatTotal: {
    marginTop: 10,
    alignItems: 'center',
  },
  syncStatTotalText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  nothingToSyncBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  nothingToSyncText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default DataBackupForcely;