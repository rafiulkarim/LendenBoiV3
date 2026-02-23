import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking
} from 'react-native';
import {
  Appbar,
  Card,
  Avatar,
  Text,
  Divider,
  TextInput,
  HelperText,
  Button,
  Portal,
  Dialog,
  Provider,
  Snackbar
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { openDatabase } from 'react-native-sqlite-storage';
import AuthContext from '../../context/AuthContext';
import moment from 'moment';

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
  const clientId = route.params.clientId;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientData, setClientData] = useState(null);
  const [editDialogVisible, setEditDialogVisible] = useState(false);

  // Snackbar states
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone_no: '',
    address: ''
  });

  // Validation errors state
  const [errors, setErrors] = useState({
    name: '',
    phone_no: '',
    address: ''
  });

  // Touched fields for validation
  const [touched, setTouched] = useState({
    name: false,
    phone_no: false,
    address: false
  });

  const onDismissSnackbar = () => setSnackbarVisible(false);

  // Validation functions
  const validateName = (name) => {
    if (!name || name.trim() === '') {
      return 'নাম আবশ্যক';
    }
    if (name.trim().length < 2) {
      return 'নাম কমপক্ষে ২ অক্ষর হতে হবে';
    }
    if (name.trim().length > 50) {
      return 'নাম সর্বোচ্চ ৫০ অক্ষর হতে পারে';
    }
    if (!/^[a-zA-Z\s\u0980-\u09FF]+$/.test(name)) {
      return 'শুধুমাত্র অক্ষর এবং স্পেস ব্যবহার করুন';
    }
    return '';
  };

  const validatePhone = (phone) => {
    if (!phone || phone.trim() === '') {
      return 'ফোন নম্বর আবশ্যক';
    }
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length !== 11) {
      return 'ফোন নম্বর ১১ ডিজিট হতে হবে';
    }
    if (!/^01[3-9]\d{8}$/.test(digitsOnly)) {
      return 'বৈধ বাংলাদেশী ফোন নম্বর দিন';
    }
    return '';
  };

  const validateAddress = (address) => {
    if (!address || address.trim() === '') {
      return ''; // Address is optional
    }
    if (address.trim().length > 200) {
      return 'ঠিকানা সর্বোচ্চ ২০০ অক্ষর হতে পারে';
    }
    return '';
  };

  // Validate all fields
  const validateForm = () => {
    const nameError = validateName(formData.name);
    const phoneError = validatePhone(formData.phone_no);
    const addressError = validateAddress(formData.address);

    setErrors({
      name: nameError,
      phone_no: phoneError,
      address: addressError
    });

    return !nameError && !phoneError && !addressError;
  };

  // Handle input change with real-time validation
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Real-time validation
    let error = '';
    switch (field) {
      case 'name':
        error = validateName(value);
        break;
      case 'phone_no':
        error = validatePhone(value);
        break;
      case 'address':
        error = validateAddress(value);
        break;
    }

    setErrors(prev => ({ ...prev, [field]: error }));
  };

  // Handle field blur
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));

    let error = '';
    switch (field) {
      case 'name':
        error = validateName(formData.name);
        break;
      case 'phone_no':
        error = validatePhone(formData.phone_no);
        break;
      case 'address':
        error = validateAddress(formData.address);
        break;
    }

    setErrors(prev => ({ ...prev, [field]: error }));
  };

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
            setFormData({
              name: client.name || '',
              phone_no: client.phone_no || '',
              address: client.address || ''
            });
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

  // Show snackbar message
  const showSnackbar = (message, type = 'success') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

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

  const handleUpdate = () => {
    dismissKeyboard();

    setTouched({
      name: true,
      phone_no: true,
      address: true
    });

    if (!validateForm()) {
      Alert.alert('ত্রুটি', 'সঠিকভাবে ফর্ম পূরণ করুন');
      return;
    }

    setSaving(true);

    db.transaction(tx => {
      tx.executeSql(
        'UPDATE clients SET name = ?, phone_no = ?, address = ?, updated_at = ?, sync_status = ? WHERE id = ?',
        [formData.name.trim(), formData.phone_no.trim(), formData.address.trim(), moment().format('YYYY-MM-DD HH:mm:ss'), "No", clientId],
        (tx, results) => {
          setSaving(false);
          if (results.rowsAffected > 0) {
            setEditDialogVisible(false);
            showSnackbar("ক্লায়েন্টের তথ্য আপডেট করা হয়েছে", "success")
            setTimeout(() => {
              navigation.replace('SaleAndReceive', {
                clientId: clientId
              })
            }, 2000)
            // Alert.alert(
            //   'সফল',
            //   'ক্লায়েন্টের তথ্য আপডেট করা হয়েছে',
            //   [
            //     {
            //       text: 'ঠিক আছে',
            //       onPress: () => {
            //         setEditDialogVisible(false);
            //         fetchClientData(); // Refresh data
            //         // Reset touched states
            //         setTouched({ name: false, phone_no: false, address: false });
            //       }
            //     }
            //   ]
            // );
          } else {
            // Alert.alert('ত্রুটি', 'আপডেট ব্যর্থ হয়েছে');
            setEditDialogVisible(false);
            showSnackbar("আপডেট ব্যর্থ হয়েছে", "error")
          }
        },
        (error) => {
          setSaving(false);
          console.error('Error updating client:', error);
          // Alert.alert('ত্রুটি', 'ডাটাবেস আপডেট করতে সমস্যা হয়েছে');
          setEditDialogVisible(false);
          showSnackbar("ডাটাবেস আপডেট করতে সমস্যা হয়েছে", "error")
        }
      );
    });
  };

  const openEditDialog = () => {
    // Reset form to current client data
    setFormData({
      name: clientData.name || '',
      phone_no: clientData.phone_no || '',
      address: clientData.address || ''
    });
    // Reset errors and touched
    setErrors({ name: '', phone_no: '', address: '' });
    setTouched({ name: false, phone_no: false, address: false });
    setEditDialogVisible(true);
  };

  const getInputStatus = (field) => {
    if (!touched[field]) return 'idle';
    return errors[field] ? 'error' : 'valid';
  };

  const getFieldIconColor = (field) => {
    const status = getInputStatus(field);
    switch (status) {
      case 'error': return colors.error;
      case 'valid': return colors.success;
      default: return colors.textSecondary;
    }
  };

  return (
    <Provider>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <Appbar.Header style={styles.header}>
            <Appbar.BackAction
              color="#fff"
              onPress={() => navigation.goBack()}
            />
            <Appbar.Content
              title="লেনদেনের বিবরণ"
              color="#fff"
            />
            {!loading && clientData && (
              <Appbar.Action
                icon="account-edit"
                color="#fff"
                onPress={openEditDialog}
              />
            )}
          </Appbar.Header>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>লোড হচ্ছে...</Text>
            </View>
          ) : clientData ? (
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
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
                          new Date(clientData.created_at).toLocaleDateString('bn-BD', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) :
                          'N/A'}
                      </Text>
                    </View>
                  </View>

                  {/* Edit Button */}
                  <View style={styles.editButtonContainer}>
                    <Button
                      mode="outlined"
                      onPress={openEditDialog}
                      style={styles.editButton}
                      icon="pencil"
                      color={colors.primary}
                    >
                      তথ্য আপডেট করুন
                    </Button>
                  </View>
                </Card.Content>
              </Card>

              {/* Transaction History Placeholder */}
              {/* <Card style={styles.historyCard}>
                <Card.Content>
                  <View style={styles.historyHeader}>
                    <Icon name="history" size={24} color={colors.primary} />
                    <Text style={styles.historyTitle}>লেনদেনের ইতিহাস</Text>
                  </View>
                  <Text style={styles.placeholderText}>
                    লেনদেনের ইতিহাস শীঘ্রই যোগ করা হবে
                  </Text>
                </Card.Content>
              </Card> */}
            </ScrollView>
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

          {/* Edit Dialog */}
          <Portal>
            <Dialog
              visible={editDialogVisible}
              onDismiss={() => setEditDialogVisible(false)}
              style={styles.dialog}
            >
              <Dialog.Title style={styles.dialogTitle}>
                ক্লায়েন্ট তথ্য আপডেট
              </Dialog.Title>
              <Dialog.ScrollArea style={styles.dialogScrollArea}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.dialogContent}>
                    {/* Name Field */}
                    <View style={styles.inputContainer}>
                      <TextInput
                        label="নাম *"
                        value={formData.name}
                        onChangeText={(text) => handleInputChange('name', text)}
                        onBlur={() => handleBlur('name')}
                        mode="outlined"
                        style={styles.input}
                        outlineColor={errors.name && touched.name ? colors.error : colors.border}
                        activeOutlineColor={colors.primary}
                        error={!!errors.name && touched.name}
                        disabled={saving}
                        left={
                          <TextInput.Icon
                            icon="account"
                            color={colors.primary}
                          />
                        }
                        right={
                          <TextInput.Icon
                            icon={touched.name ? (errors.name ? 'alert-circle' : 'check-circle') : 'pencil'}
                            color={getFieldIconColor('name')}
                          />
                        }
                      />
                      <HelperText
                        type="error"
                        visible={!!errors.name && touched.name}
                        style={styles.helperText}
                      >
                        {errors.name}
                      </HelperText>
                    </View>

                    {/* Phone Field */}
                    <View style={styles.inputContainer}>
                      <TextInput
                        label="ফোন নম্বর *"
                        value={formData.phone_no}
                        onChangeText={(text) => handleInputChange('phone_no', text)}
                        onBlur={() => handleBlur('phone_no')}
                        mode="outlined"
                        keyboardType="phone-pad"
                        style={styles.input}
                        outlineColor={errors.phone_no && touched.phone_no ? colors.error : colors.border}
                        activeOutlineColor={colors.primary}
                        error={!!errors.phone_no && touched.phone_no}
                        disabled={saving}
                        left={
                          <TextInput.Icon
                            icon="phone"
                            color={colors.primary}
                          />
                        }
                        right={
                          <TextInput.Icon
                            icon={touched.phone_no ? (errors.phone_no ? 'alert-circle' : 'check-circle') : 'pencil'}
                            color={getFieldIconColor('phone_no')}
                          />
                        }
                      />
                      <HelperText
                        type="error"
                        visible={!!errors.phone_no && touched.phone_no}
                        style={styles.helperText}
                      >
                        {errors.phone_no}
                      </HelperText>
                    </View>

                    {/* Address Field */}
                    <View style={styles.inputContainer}>
                      <TextInput
                        label="ঠিকানা (ঐচ্ছিক)"
                        value={formData.address}
                        onChangeText={(text) => handleInputChange('address', text)}
                        onBlur={() => handleBlur('address')}
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        style={styles.input}
                        outlineColor={errors.address && touched.address ? colors.error : colors.border}
                        activeOutlineColor={colors.primary}
                        error={!!errors.address && touched.address}
                        disabled={saving}
                        left={
                          <TextInput.Icon
                            icon="map-marker"
                            color={colors.primary}
                          />
                        }
                        right={
                          <TextInput.Icon
                            icon={touched.address ? (errors.address ? 'alert-circle' : 'check-circle') : 'pencil'}
                            color={getFieldIconColor('address')}
                          />
                        }
                      />
                      <HelperText
                        type="error"
                        visible={!!errors.address && touched.address}
                        style={styles.helperText}
                      >
                        {errors.address}
                      </HelperText>
                      <HelperText
                        type="info"
                        style={styles.charCountText}
                      >
                        {Number(formData.address.length).toLocaleString('bn-BD')}/২০০ অক্ষর
                      </HelperText>
                    </View>
                  </View>
                </ScrollView>
              </Dialog.ScrollArea>
              <Dialog.Actions style={styles.dialogActions}>
                <Button
                  onPress={() => setEditDialogVisible(false)}
                  style={styles.cancelButton}
                  labelStyle={styles.cancelButtonLabel}
                  disabled={saving}
                >
                  বাতিল
                </Button>
                <Button
                  mode="contained"
                  onPress={handleUpdate}
                  style={styles.saveButton}
                  labelStyle={styles.saveButtonLabel}
                  loading={saving}
                  disabled={saving || !formData.name || !formData.phone_no ||
                    !!errors.name || !!errors.phone_no || !!errors.address}
                  icon="content-save"
                >
                  {saving ? 'সেভ হচ্ছে...' : 'সংরক্ষণ'}
                </Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
          {/* Snackbar */}
          <Snackbar
            visible={snackbarVisible}
            onDismiss={onDismissSnackbar}
            duration={snackbarType === 'success' ? 3000 :
              snackbarType === 'warning' ? 4000 :
                5000}
            style={[
              styles.snackbar,
              snackbarType === 'success' ? styles.successSnackbar :
                snackbarType === 'error' ? styles.errorSnackbar :
                  snackbarType === 'warning' ? styles.warningSnackbar :
                    styles.infoSnackbar
            ]}
            action={{
              label: 'ঠিক আছে',
              onPress: onDismissSnackbar,
              labelStyle: styles.snackbarActionLabel
            }}
          >
            <Text style={styles.snackbarText}>{snackbarMessage}</Text>
          </Snackbar>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </Provider>
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
    marginBottom: 16,
  },
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
  editButtonContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  editButton: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: 8,
  },
  // History Card
  historyCard: {
    borderRadius: 16,
    elevation: 2,
    backgroundColor: colors.surface,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginLeft: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  // Dialog Styles
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    maxHeight: '80%',
  },
  dialogTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dialogScrollArea: {
    paddingHorizontal: 0,
  },
  dialogContent: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  dialogActions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
  inputContainer: {
    marginBottom: 16,
    width: '100%',
  },
  input: {
    backgroundColor: colors.surface,
  },
  helperText: {
    fontSize: 12,
    marginLeft: 8,
    color: colors.error,
  },
  charCountText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    marginRight: 8,
  },
  cancelButton: {
    marginRight: 12,
  },
  cancelButtonLabel: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    elevation: 2,
  },
  saveButtonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  // Snackbar styles
  snackbar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 8,
    elevation: 6,
  },
  successSnackbar: {
    backgroundColor: colors.success,
  },
  errorSnackbar: {
    backgroundColor: colors.error,
  },
  infoSnackbar: {
    backgroundColor: colors.info,
  },
  warningSnackbar: {
    backgroundColor: colors.warning,
  },
  snackbarText: {
    color: '#fff',
    fontSize: 14,
  },
  snackbarActionLabel: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default SaleAndReceiveDetails;