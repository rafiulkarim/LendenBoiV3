import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator
} from 'react-native';
import {
  Appbar,
  Card,
  Avatar,
  Text,
  Divider,
  Chip
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { openDatabase } from 'react-native-sqlite-storage';
const db = openDatabase({ name: 'lenden_boi.db', createFromLocation: 1 });

// Color palette
const colors = {
  primary: '#00A8A8',
  primaryLight: '#4DC9C9',
  primaryLighter: '#80D9D9',
  primaryLightest: '#E6F7F7',
  primaryDark: '#008787',
  primaryDarker: '#006666',
  success: '#28a745',
  successLight: '#d4edda',
  warning: '#ffc107',
  warningLight: '#fff3cd',
  error: '#dc3545',
  errorLight: '#f8d7da',
  background: '#f8f9fa',
  surface: '#ffffff',
  textPrimary: '#1A535C',
  textSecondary: '#6c757d',
  border: '#dee2e6',
};

const SaleAndReceiveDetails = ({ route, navigation }) => {
  const { logedInUserInfo } = useContext(AuthContext);
  // const clientData = route.params.clientData;
  const pelam = route.params.pelam;
  const dilam = route.params.dilam;
  const clientId = route.params.clientId;
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState(null)

  const fetchClientData = () => {
    setLoading(true);
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM clients WHERE id = ?',
        [clientId],
        (tx, results) => {
          if (results.rows.length > 0) {
            const client = results.rows.item(0);
            setClientData(client);
            // Assuming pelam and dilam amounts come from the client data
            // You can adjust this based on your actual data structure
            // setPelamAmount(client.pelam || 0);
            // setDilamAmount(client.dilam || 0);
            setLoading(false);
          } else {
            setClientData(null);
            setLoading(false);
          }
          setLoading(false);
        },
        error => {
          console.error('Error fetching client data:', error);
          setClientData(null);
          setLoading(false);
        }
      );
    });
  };

  useEffect(() => {
    fetchClientData();
  }, []);

  const dismissKeyboard = () => Keyboard.dismiss();

  const formatCurrency = (amount) => {
    return (Number(amount) || 0).toLocaleString('bn-BD') + ' টাকা';
  };

  const getBalanceStatus = () => {
    if (!clientData) return 'neutral';
    if (clientData.amount == 0) return 'paid';
    return clientData.amount_type === "Due" ? "due" : "advance";
  };

  const getBalanceColor = () => {
    const status = getBalanceStatus();
    switch (status) {
      case 'paid': return colors.success;
      case 'due': return colors.error;
      case 'advance': return colors.warning;
      default: return colors.textPrimary;
    }
  };

  const getBalanceText = () => {
    if (!clientData) return '';
    if (clientData.amount == 0) return "পরিশোধিত";
    if (clientData.amount_type === "Due") {
      return `বাকি: ${formatCurrency(clientData.amount)}`;
    }
    return `অগ্রিম: ${formatCurrency(clientData.amount)}`;
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction
            color="#fff"
            onPress={() => navigation.replace('Welcome')}
          />
          <Appbar.Content
            title="লেনদেনের বিবরণ"
            color="#fff"
          />
        </Appbar.Header>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>লোড হচ্ছে...</Text>
          </View>
        ) : clientData ? (
          <View style={styles.content}>
            {/* Client Info Card */}
            <Card style={styles.clientInfoCard}>
              <Card.Content>
                {/* Avatar and Basic Info */}
                <View style={styles.avatarSection}>
                  <Avatar.Text
                    size={80}
                    label={clientData.name.charAt(0)}
                    style={[styles.avatar, { backgroundColor: getBalanceColor() }]}
                    labelStyle={styles.avatarLabel}
                  />
                  <View style={styles.nameSection}>
                    <Text style={styles.clientName}>{clientData.name}</Text>
                    <Text style={[
                      styles.balanceText,
                      { color: getBalanceColor() }
                    ]}>
                      {getBalanceText()}
                    </Text>
                  </View>
                </View>

                <Divider style={styles.divider} />

                {/* Contact Info */}
                <View style={styles.infoSection}>
                  <View style={styles.infoRow}>
                    <Icon name="phone" size={20} color={colors.primary} />
                    <Text style={styles.infoLabel}>ফোন:</Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (clientData.phone_no) {
                          Linking.openURL(`tel:${clientData.phone_no}`);
                        }
                      }}
                    >
                      <Text style={styles.phoneText}>
                        {clientData.phone_no || 'নেই'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {clientData.address && (
                    <View style={styles.infoRow}>
                      <Icon name="map-marker" size={20} color={colors.primary} />
                      <Text style={styles.infoLabel}>ঠিকানা:</Text>
                      <Text style={styles.infoValue}>
                        {clientData.address}
                      </Text>
                    </View>
                  )}

                  <View style={styles.infoRow}>
                    <Icon name="calendar" size={20} color={colors.primary} />
                    <Text style={styles.infoLabel}>যোগদান:</Text>
                    <Text style={styles.infoValue}>
                      {clientData.created_at ?
                        new Date(clientData.created_at).toLocaleDateString('bn-BD') :
                        'N/A'}
                    </Text>
                  </View>
                </View>

                <Divider style={styles.divider} />

                {/* Pelam & Dilam Section */}
                <View style={styles.amountsSection}>
                  {/* <Text style={styles.sectionTitle}>বর্তমান অবস্থা</Text> */}

                  <View style={styles.amountsGrid}>
                    {/* Pelam Card */}
                    <Card style={[styles.amountCard, styles.pelamCard]}>
                      <Card.Content style={styles.amountCardContent}>
                        <View style={styles.amountIconContainer}>
                          <Icon
                            name="arrow-down-circle"
                            size={24}
                            color={colors.success}
                          />
                        </View>
                        <Text style={styles.amountLabel}>পেলাম</Text>
                        <Text style={[styles.amountValue, { color: colors.success }]}>
                          {formatCurrency(pelam)}
                        </Text>
                        {/* <Text style={styles.amountSubtext}>
                          (দিতে হবে)
                        </Text> */}
                      </Card.Content>
                    </Card>

                    {/* Dilam Card */}
                    <Card style={[styles.amountCard, styles.dilamCard]}>
                      <Card.Content style={styles.amountCardContent}>
                        <View style={styles.amountIconContainer}>
                          <Icon
                            name="arrow-up-circle"
                            size={24}
                            color={colors.error}
                          />
                        </View>
                        <Text style={styles.amountLabel}>দিলাম</Text>
                        <Text style={[styles.amountValue, { color: colors.error }]}>
                          {formatCurrency(dilam)}
                        </Text>
                        {/* <Text style={styles.amountSubtext}>
                          (পেয়েছি)
                        </Text> */}
                      </Card.Content>
                    </Card>
                  </View>

                </View>
              </Card.Content>
            </Card>
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <Icon name="account-alert" size={80} color={colors.error} />
            <Text style={styles.errorText}>ক্লায়েন্ট পাওয়া যায়নি</Text>
            <Text style={styles.errorSubText}>
              ক্লায়েন্টের তথ্য লোড করা যায়নি।
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchClientData}
            >
              <Icon name="refresh" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>আবার চেষ্টা করুন</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    elevation: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textPrimary,
  },
  // Client Info Card
  clientInfoCard: {
    borderRadius: 16,
    elevation: 4,
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  // Avatar Section
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    elevation: 3,
  },
  avatarLabel: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  nameSection: {
    marginLeft: 20,
    flex: 1,
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 8,
    backgroundColor: colors.border,
  },
  // Info Section
  infoSection: {
    paddingVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
    marginRight: 8,
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  phoneText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    flex: 1,
  },
  // Amounts Section
  amountsSection: {
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  amountsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  amountCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    elevation: 2,
  },
  pelamCard: {
    backgroundColor: colors.successLight,
  },
  dilamCard: {
    backgroundColor: colors.errorLight,
  },
  amountCardContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  amountIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  amountSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  // Net Balance Card
  netBalanceCard: {
    borderRadius: 12,
    backgroundColor: colors.primaryLightest,
    borderWidth: 1,
    borderColor: colors.primaryLighter,
  },
  netBalanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  netBalanceTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  netBalanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  netBalanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SaleAndReceiveDetails;