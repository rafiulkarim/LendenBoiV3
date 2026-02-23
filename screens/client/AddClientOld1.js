import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Alert,
  Platform,
  PermissionsAndroid,
  FlatList,
  Modal,
  NativeModules,
} from 'react-native';
import {
  Appbar,
  RadioButton,
  TextInput,
  Button,
  Avatar,
  Text,
  List,
  Searchbar,
  Divider,
  Snackbar
} from 'react-native-paper';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Contacts from 'react-native-contacts';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { openDatabase } from 'react-native-sqlite-storage';
import { IdGenerator } from '../../Helpers/Generator/IdGenerator';
import moment from 'moment';

// IMPORTANT: Add this import for AuthContext
import { AuthContext } from '../../context/AuthContext';

// Import SIM Settings Components
// import SIMSettingsModal from '../components/SIMSettingsModal';
// import SimSettingsCard from '../components/SimSettingsCard';

const db = openDatabase({ name: 'lenden_boi.db', createFromLocation: 1 });
const { SmsSender } = NativeModules;

// Color palette
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
};

// Improved helper function to normalize text for search
const normalizeBengaliText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export default function AddClientOld1({ navigation }) {
  const { logedInUserInfo } = useContext(AuthContext);
  const [type, setType] = useState('Customer');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [openingBalanceType, setOpeningBalanceType] = useState('Due');
  const [notes, setNotes] = useState('');

  // Validation states
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [isTouched, setIsTouched] = useState({
    name: false,
    phone: false,
  });

  // Phonebook states
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('denied');

  // Snackbar states
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SIM states - simplified
  const [showSimSettings, setShowSimSettings] = useState(false);
  const [selectedSim, setSelectedSim] = useState(null);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Show snackbar message
  const showSnackbar = (message, type = 'success') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  // Request SMS permissions
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.SEND_SMS,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        ]);

        const smsGranted = granted[PermissionsAndroid.PERMISSIONS.SEND_SMS] === PermissionsAndroid.RESULTS.GRANTED;
        const phoneGranted = granted[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === PermissionsAndroid.RESULTS.GRANTED;

        return smsGranted && phoneGranted;
      } catch (err) {
        console.error('Permission request error:', err);
        return false;
      }
    }
    return true;
  };

  // Send SMS function
  const sendSms = async (phoneNumber, message) => {
    // Check if "No SIM card selected" option is chosen
    if (selectedSim?.isNoSimOption) {
      console.log('SMS sending skipped - No SIM selected option chosen');
      return true; // Return true since user chose not to send SMS
    }

    if (!selectedSim) {
      showSnackbar('দয়া করে একটি SIM নির্বাচন করুন', 'error');
      return false;
    }

    try {
      // Request permissions first
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        showSnackbar('SMS পাঠানোর অনুমতি প্রয়োজন', 'error');
        return false;
      }

      // Send SMS via native module
      const result = await SmsSender.sendSms(
        phoneNumber,
        message,
        selectedSim.subscriptionId
      );

      console.log('SMS sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      showSnackbar('SMS পাঠাতে সমস্যা হয়েছে', 'error');
      return false;
    }
  };

  // Hide snackbar
  const onDismissSnackbar = () => setSnackbarVisible(false);

  // Request Contacts Permission
  const requestContactsPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'কন্টাক্ট এক্সেস প্রয়োজন',
            message: 'এই অ্যাপটি আপনার কন্টাক্ট পড়ার অনুমতি প্রয়োজন',
            buttonNeutral: 'পরে জিজ্ঞাসা করুন',
            buttonNegative: 'বাতিল',
            buttonPositive: 'ঠিক আছে',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setPermissionStatus('granted');
          return true;
        } else {
          Alert.alert(
            'অনুমতি ডিনাই',
            'আপনার কন্টাক্ট এক্সেস করতে হবে ফোনবুক ব্যবহার করার জন্য'
          );
          return false;
        }
      } else {
        const result = await request(PERMISSIONS.IOS.CONTACTS);
        if (result === RESULTS.GRANTED) {
          setPermissionStatus('granted');
          return true;
        }
        return false;
      }
    } catch (err) {
      console.warn(err);
      showSnackbar('অনুমতি চাইতে সমস্যা হয়েছে', 'error');
      return false;
    }
  };

  // Check Permission Status
  const checkPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const status = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS
        );
        setPermissionStatus(status ? 'granted' : 'denied');
        return status;
      } else {
        const result = await check(PERMISSIONS.IOS.CONTACTS);
        setPermissionStatus(result);
        return result === RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  // Load Contacts
  const loadContacts = async () => {
    try {
      setIsLoadingContacts(true);

      // Check permission first
      const hasPermission = await checkPermission();

      if (!hasPermission) {
        const granted = await requestContactsPermission();
        if (!granted) {
          setIsLoadingContacts(false);
          showSnackbar('কন্টাক্ট অ্যাক্সেস অনুমতি প্রয়োজন', 'error');
          return;
        }
      }

      // Load all contacts
      Contacts.getAll()
        .then(contacts => {
          const formattedContacts = contacts
            .filter(contact =>
              (contact.givenName || contact.familyName) &&
              contact.phoneNumbers &&
              contact.phoneNumbers.length > 0
            )
            .map(contact => {
              const contactName = `${contact.givenName || ''} ${contact.familyName || ''}`.trim();

              return {
                id: contact.recordID || Math.random().toString(),
                name: contactName,
                phoneNumbers: contact.phoneNumbers.map(p => {
                  const cleanNumber = p.number.replace(/\D/g, '');
                  return cleanNumber;
                }),
                emailAddresses: contact.emailAddresses ? contact.emailAddresses.map(e => e.email) : [],
                thumbnailPath: contact.thumbnailPath,
              };
            })
            .sort((a, b) => {
              return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
            });

          console.log('Loaded contacts:', formattedContacts.length);
          setContacts(formattedContacts);
          setFilteredContacts(formattedContacts);
          setShowContactsModal(true);

          if (formattedContacts.length === 0) {
            showSnackbar('কোন কন্টাক্ট পাওয়া যায়নি', 'info');
          }
        })
        .catch(error => {
          console.error('Error loading contacts:', error);
          showSnackbar('কন্টাক্ট লোড করতে সমস্যা হয়েছে', 'error');
        })
        .finally(() => {
          setIsLoadingContacts(false);
        });

    } catch (error) {
      console.error('Error in loadContacts:', error);
      setIsLoadingContacts(false);
      showSnackbar('কন্টাক্ট লোড করতে সমস্যা হয়েছে', 'error');
    }
  };

  // Filter contacts based on search
  const filterContacts = (query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    const normalizedQuery = normalizeBengaliText(query);
    const phoneDigits = query.replace(/\D/g, '');

    const filtered = contacts.filter(contact => {
      const normalizedContactName = normalizeBengaliText(contact.name);
      if (normalizedContactName.includes(normalizedQuery)) {
        return true;
      }

      if (phoneDigits && contact.phoneNumbers.some(phone => {
        return phone.includes(phoneDigits);
      })) {
        return true;
      }

      return false;
    });

    setFilteredContacts(filtered);
  };

  // Select contact from list
  const selectContact = (contact) => {
    setName(contact.name);

    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      let phoneNumber = contact.phoneNumbers[0];
      if (phoneNumber.length === 11 && phoneNumber.startsWith('01')) {
        setPhone(phoneNumber);
      } else if (phoneNumber.length === 13 && phoneNumber.startsWith('880')) {
        setPhone(phoneNumber.substring(2));
      } else {
        setPhone(phoneNumber);
      }
    }

    if (contact.emailAddresses && contact.emailAddresses.length > 0) {
      setEmail(contact.emailAddresses[0]);
    }

    setShowContactsModal(false);
    setSearchQuery('');
    showSnackbar('কন্টাক্ট নির্বাচন করা হয়েছে', 'success');
  };

  // Validate name field
  const validateName = (text, showError = false) => {
    if (!text.trim()) {
      if (showError) setNameError('নাম বাধ্যতামূলক');
      return false;
    }

    if (text.trim().length < 2) {
      if (showError) setNameError('নাম কমপক্ষে ২ অক্ষরের হতে হবে');
      return false;
    }

    const nameRegex = /^[a-zA-Z\u0980-\u09FF\s\.\-]+$/;
    if (!nameRegex.test(text)) {
      if (showError) setNameError('শুধুমাত্র বর্ণ এবং স্পেস ব্যবহার করুন');
      return false;
    }

    if (showError) setNameError('');
    return true;
  };

  // Validate phone field
  const validatePhone = (text, showError = false) => {
    const phoneDigits = text.replace(/\D/g, '');

    if (showError) setPhoneError('');
    return true;
  };

  // Validate entire form
  const validateForm = (showErrors = false) => {
    const isNameValid = validateName(name, showErrors);
    const isPhoneValid = validatePhone(phone, showErrors);

    return isNameValid && isPhoneValid;
  };

  // Handle form submission
  const handleSubmit = async () => {
    const isValid = validateForm(true);

    if (!isValid) {
      showSnackbar('দয়া করে সব বাধ্যতামূলক ফিল্ড সঠিকভাবে পূরণ করুন', 'error');
      return;
    }

    setIsSubmitting(true);

    const clientId = IdGenerator(logedInUserInfo.id);
    const clientData = {
      type,
      name: name.trim(),
      phone: phone.replace(/\D/g, ''),
      email: email.trim() || null,
      address: address.trim() || null,
      openingBalance: openingBalance ? parseFloat(openingBalance) : 0,
      openingBalanceType,
      notes: notes.trim() || null,
      createdAt: moment().format('YYYY-MM-DD HH:mm:ss')
    };

    db.transaction(tx => {
      // First check if phone number already exists
      tx.executeSql(
        'SELECT * FROM clients WHERE phone_no = ? AND shop_id = ?',
        [clientData.phone, logedInUserInfo?.shop[0]?.id],
        (tx, checkResult) => {
          if (type === 'Customer' && clientData.phone && clientData.phone.trim() !== '') {
            if (checkResult.rows.length > 0) {
              const existingClient = checkResult.rows.item(0);
              console.log('existingClient', existingClient);

              if (existingClient.type === 'Customer') {
                setIsSubmitting(false);
                showSnackbar('এই মোবাইল নম্বরটি ইতিমধ্যে রেজিস্টার্ড আছে', 'error');
                return;
              }
            }
          }

          // Insert client
          tx.executeSql(
            'INSERT INTO clients (id, name, phone_no, address, amount, amount_type, status, type, shop_id, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              clientId,
              clientData.name,
              clientData.phone,
              clientData.address,
              clientData.openingBalance,
              clientData.openingBalanceType,
              "Active",
              clientData.type,
              logedInUserInfo?.shop[0]?.id,
              "No",
              clientData.createdAt,
              clientData.createdAt
            ],
            async (tx, clientResult) => {
              if (clientResult.rowsAffected > 0 && clientData.openingBalance > 0) {
                const ledgerId = IdGenerator(logedInUserInfo.id);

                let transactionType = null;
                let smsMessage = '';

                if (type == "Supplier") {
                  transactionType = clientData.openingBalanceType === 'Due' ? 'Purchase' : 'Payment';
                } else {
                  transactionType = clientData.openingBalanceType === 'Due' ? 'Sale' : 'Receive';
                }

                tx.executeSql(
                  'INSERT INTO ledgers (id, client_id, transaction_type, transaction_date, amount, comments, entry_by, shop_id, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                  [
                    ledgerId,
                    clientId,
                    transactionType,
                    clientData.createdAt,
                    clientData.openingBalance,
                    'Opening Balance',
                    logedInUserInfo?.id,
                    logedInUserInfo?.shop[0]?.id,
                    "No",
                    clientData.createdAt,
                    clientData.createdAt
                  ],
                  async (tx, ledgerResult) => {
                    // Send SMS if phone number exists and not using "No SIM" option
                    if (clientData.phone && clientData.phone.trim() !== '' && !selectedSim?.isNoSimOption && selectedSim) {
                      try {
                        const formattedAmount = new Intl.NumberFormat('en-BD').format(clientData.openingBalance);
                        const shopName = logedInUserInfo?.shop[0]?.title || 'আমার দোকান';

                        if (type === "Supplier") {
                          if (clientData.openingBalanceType === 'Due') {
                            smsMessage = `বাকি: ৳${formattedAmount}\n${shopName}`;
                          } else {
                            smsMessage = `অগ্রিম: ৳${formattedAmount}\n${shopName}`;
                          }
                        } else {
                          if (clientData.openingBalanceType === 'Due') {
                            smsMessage = `বাকি: ৳${formattedAmount}\n${shopName}`;
                          } else {
                            smsMessage = `অগ্রিম: ৳${formattedAmount}\n${shopName}`;
                          }
                        }

                        await sendSms(clientData.phone, smsMessage);
                        console.log('SMS sent successfully:', smsMessage);
                      } catch (smsError) {
                        console.error('Failed to send SMS:', smsError);
                      }
                    }

                    setIsSubmitting(false);
                    showSnackbar(
                      `${type === 'Customer' ? 'কাস্টমার' : 'সাপ্লায়ার'} সফলভাবে যোগ করা হয়েছে!`,
                      'success'
                    );

                    resetForm();

                    setTimeout(() => {
                      navigation.replace('Welcome');
                    }, 2000);
                  },
                  (tx, ledgerError) => {
                    setIsSubmitting(false);
                    console.error('Ledger insert failed:', ledgerError.message);

                    showSnackbar(
                      `${type === 'Customer' ? 'কাস্টমার' : 'সাপ্লায়ার'} যোগ করা হয়েছে, কিন্তু লেজার এন্ট্রি ত্রুটি!`,
                      'warning'
                    );

                    resetForm();
                    setTimeout(() => {
                      navigation.replace('Welcome');
                    }, 2000);
                  }
                );
              } else if (clientResult.rowsAffected > 0) {
                // Send welcome SMS if not using "No SIM" option
                if (clientData.phone && clientData.phone.trim() !== '' && !selectedSim?.isNoSimOption && selectedSim) {
                  try {
                    const shopName = logedInUserInfo?.shop[0]?.name || 'আমার দোকান';
                    const smsMessage = `${clientData.name} কে ${type === 'Customer' ? 'কাস্টমার' : 'সাপ্লায়ার'} হিসাবে যোগ করা হয়েছে।\n${shopName}`;

                    await sendSms(clientData.phone, smsMessage);
                    console.log('Welcome SMS sent successfully');
                  } catch (smsError) {
                    console.error('Failed to send welcome SMS:', smsError);
                  }
                }

                setIsSubmitting(false);
                showSnackbar(
                  `${type === 'Customer' ? 'কাস্টমার' : 'সাপ্লায়ার'} সফলভাবে যোগ করা হয়েছে!`,
                  'success'
                );

                resetForm();
                setTimeout(() => {
                  navigation.replace('Welcome');
                }, 2000);
              } else {
                setIsSubmitting(false);
                showSnackbar('কাস্টমার যোগ করতে সমস্যা হয়েছে', 'error');
              }
            },
            (tx, clientError) => {
              setIsSubmitting(false);
              console.error('Client insert failed:', clientError.message);

              let errorMessage = 'ডেটা সেভ করতে সমস্যা হয়েছে';

              if (clientError.message.includes('UNIQUE constraint failed') ||
                clientError.message.includes('duplicate')) {
                errorMessage = 'এই মোবাইল নম্বরটি ইতিমধ্যে রেজিস্টার্ড আছে';
              } else if (clientError.message.includes('NOT NULL constraint failed')) {
                errorMessage = 'কিছু প্রয়োজনীয় তথ্য দেওয়া হয়নি';
              } else if (clientError.message.includes('FOREIGN KEY constraint failed')) {
                errorMessage = 'দোকান তথ্য পাওয়া যায়নি';
              }

              showSnackbar(errorMessage, 'error');
            }
          );
        },
        (tx, checkError) => {
          setIsSubmitting(false);
          console.error('Phone check failed:', checkError.message);
          showSnackbar('মোবাইল নম্বর চেক করতে সমস্যা হয়েছে', 'error');
        }
      );
    }, (transactionError) => {
      setIsSubmitting(false);
      console.error('Transaction error:', transactionError);
      showSnackbar('ডাটাবেস ট্রানজ্যাকশন ত্রুটি', 'error');
    }, () => {
      console.log('Transaction completed successfully');
    });
  };

  // Helper function to reset form
  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setOpeningBalance('');
    setOpeningBalanceType('Due');
    setNotes('');
    setNameError('');
    setPhoneError('');
    setIsTouched({ name: false, phone: false });
  };

  // Handle name input change
  const handleNameChange = (text) => {
    setName(text);
    if (isTouched.name) {
      validateName(text, true);
    }
  };

  // Handle phone input change
  const handlePhoneChange = (text) => {
    setPhone(text);
    if (isTouched.phone) {
      validatePhone(text, true);
    }
  };

  // Handle blur events
  const handleNameBlur = () => {
    setIsTouched(prev => ({ ...prev, name: true }));
    validateName(name, true);
  };

  const handlePhoneBlur = () => {
    setIsTouched(prev => ({ ...prev, phone: true }));
    validatePhone(phone, true);
  };

  // Check form validity on every change
  useEffect(() => {
    const isValid = validateForm(false);
    setIsFormValid(isValid);
  }, [name, phone]);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, []);

  // Render contact item
  const renderContactItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => selectContact(item)}
      style={styles.contactItem}
    >
      <View style={styles.contactInfo}>
        {item.thumbnailPath ? (
          <Avatar.Image
            size={48}
            source={{ uri: item.thumbnailPath }}
            style={styles.avatar}
          />
        ) : (
          <Avatar.Text
            size={48}
            label={item.name.charAt(0)}
            style={styles.avatar}
            labelStyle={styles.avatarLabel}
          />
        )}
        <View style={styles.contactDetails}>
          <Text style={styles.contactName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.contactPhone} numberOfLines={1}>
            {item.phoneNumbers[0] || 'নম্বর নেই'}
          </Text>
          {item.emailAddresses && item.emailAddresses.length > 0 && (
            <Text style={styles.contactEmail} numberOfLines={1}>
              {item.emailAddresses[0]}
            </Text>
          )}
        </View>
      </View>
      <Divider />
    </TouchableOpacity>
  );

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        {/* Header */}
        <Appbar.Header style={{ backgroundColor: colors.primary }}>
          <Appbar.BackAction
            color="#fff"
            onPress={() => {
              navigation.navigate('Welcome')
            }}
          />
          <Appbar.Content
            title="নতুন কাস্টমার/সাপ্লায়ার"
            color="#fff"
          />
        </Appbar.Header>

        <ScrollView style={styles.content}>
          {/* Profile + Radio */}
          <View style={styles.row}>
            <TouchableOpacity>
              <Avatar.Icon
                size={56}
                icon="account"
                style={[styles.surface, { backgroundColor: colors.primaryLight }]}
              />
            </TouchableOpacity>

            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioBox,
                  type === 'Customer' && [styles.radioBoxActive, { borderColor: colors.primary }],
                ]}
                onPress={() => setType('Customer')}
              >
                <RadioButton
                  value="Customer"
                  status={type === 'Customer' ? 'checked' : 'unchecked'}
                  onPress={() => setType('Customer')}
                  color={colors.primary}
                />
                <Text style={{ color: colors.textPrimary }}>কাস্টমার</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.radioBox,
                  type === 'Supplier' && [styles.radioBoxActive, { borderColor: colors.primary }],
                ]}
                onPress={() => setType('Supplier')}
              >
                <RadioButton
                  value="Supplier"
                  status={type === 'Supplier' ? 'checked' : 'unchecked'}
                  onPress={() => setType('Supplier')}
                  color={colors.primary}
                />
                <Text style={{ color: colors.textPrimary }}>সাপ্লায়ার</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Connect from phone */}
          <Button
            icon="account-plus"
            mode="outlined"
            style={[styles.connectBtn, { borderColor: colors.primary }]}
            labelStyle={{ color: colors.primary }}
            onPress={loadContacts}
            loading={isLoadingContacts}
            disabled={isLoadingContacts}
          >
            ফোনবুক থেকে যোগ করি
          </Button>

          {/* Name Input */}
          <View style={styles.inputContainer}>
            <TextInput
              label="নাম *"
              value={name}
              onChangeText={handleNameChange}
              onBlur={handleNameBlur}
              mode="outlined"
              left={<TextInput.Icon icon="account" color={colors.primaryLight} />}
              style={styles.input}
              outlineColor={nameError ? colors.error : colors.primaryLight}
              activeOutlineColor={nameError ? colors.error : colors.primary}
              error={!!nameError}
            />
            {nameError ? (
              <Text style={styles.errorText}>{nameError}</Text>
            ) : null}
          </View>

          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <TextInput
              label="মোবাইল নম্বর"
              value={phone}
              onChangeText={handlePhoneChange}
              onBlur={handlePhoneBlur}
              keyboardType="phone-pad"
              mode="outlined"
              left={<TextInput.Icon icon="phone" color={colors.primaryLight} />}
              style={styles.input}
              outlineColor={phoneError ? colors.error : colors.primaryLight}
              activeOutlineColor={phoneError ? colors.error : colors.primary}
              error={!!phoneError}
            />
            {phoneError ? (
              <Text style={styles.errorText}>{phoneError}</Text>
            ) : null}
          </View>

          {/* Address Input */}
          <TextInput
            label="ঠিকানা"
            value={address}
            onChangeText={setAddress}
            mode="outlined"
            multiline
            numberOfLines={2}
            left={<TextInput.Icon icon="map-marker" color={colors.primaryLight} />}
            style={[styles.input, styles.multilineInput]}
            outlineColor={colors.primaryLight}
            activeOutlineColor={colors.primary}
          />

          {/* Opening Balance Section */}
          <View style={styles.openingBalanceContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              পূর্বের {openingBalanceType == "Due" ? "বাকি" : "অগ্রিম"} যোগ করুন
            </Text>

            <View style={styles.balanceInputRow}>
              <TextInput
                label="টাকার পরিমাণ"
                value={openingBalance}
                onChangeText={setOpeningBalance}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.balanceInput]}
                outlineColor={colors.primaryLight}
                activeOutlineColor={colors.primary}
              />

              <View style={styles.balanceTypeGroup}>
                <TouchableOpacity
                  style={[
                    styles.balanceTypeBtn,
                    openingBalanceType === 'Due' && [styles.balanceTypeActive, { backgroundColor: colors.primary }],
                  ]}
                  onPress={() => setOpeningBalanceType('Due')}
                >
                  <Text style={[
                    styles.balanceTypeText,
                    openingBalanceType === 'Due' && styles.balanceTypeTextActive
                  ]}>
                    বাকি
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.balanceTypeBtn,
                    openingBalanceType === 'Advance' && [styles.balanceTypeActive, { backgroundColor: colors.primary }],
                  ]}
                  onPress={() => setOpeningBalanceType('Advance')}
                >
                  <Text style={[
                    styles.balanceTypeText,
                    openingBalanceType === 'Advance' && styles.balanceTypeTextActive
                  ]}>
                    অগ্রিম
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* SMS Settings Section - Using the component */}
          {/* <SimSettingsCard
            selectedSim={selectedSim}
            onPress={() => setShowSimSettings(true)}
          /> */}

        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <Button
            mode="contained"
            disabled={!isFormValid || isSubmitting}
            style={[
              styles.submitBtn,
              {
                backgroundColor: isFormValid ? colors.primary : colors.primaryLighter
              }
            ]}
            labelStyle={{ color: '#fff' }}
            onPress={handleSubmit}
            loading={isSubmitting}
          >
            {isSubmitting ? 'সেভ হচ্ছে...' : 'নিশ্চিত'}
          </Button>
        </View>

        {/* SIM Settings Modal */}
        {/* <SIMSettingsModal
          visible={showSimSettings}
          onClose={() => setShowSimSettings(false)}
          selectedSim={selectedSim}
          onSimSelect={(sim) => setSelectedSim(sim)}
          showSnackbar={showSnackbar}
        /> */}

        {/* Snackbar for success/error messages */}
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

        {/* Contacts Modal */}
        <Modal
          visible={showContactsModal}
          animationType="slide"
          onRequestClose={() => {
            setShowContactsModal(false);
            setSearchQuery('');
          }}
        >
          <View style={styles.modalContainer}>
            <Appbar.Header style={{ backgroundColor: colors.primary }}>
              <Appbar.BackAction
                color="#fff"
                onPress={() => {
                  setShowContactsModal(false);
                  setSearchQuery('');
                }}
              />
              <Appbar.Content
                title="কন্টাক্ট নির্বাচন করুন"
                color="#fff"
                titleStyle={styles.modalTitle}
              />
              {filteredContacts.length > 0 && (
                <Appbar.Action
                  icon="close"
                  color="#fff"
                  onPress={() => {
                    setShowContactsModal(false);
                    setSearchQuery('');
                  }}
                />
              )}
            </Appbar.Header>

            <View style={styles.searchContainer}>
              <Searchbar
                placeholder="নাম বা নম্বর দিয়ে খুঁজুন..."
                onChangeText={filterContacts}
                value={searchQuery}
                style={styles.searchBar}
                autoFocus={true}
                inputStyle={styles.searchInput}
                placeholderTextColor="#666"
              />
              {searchQuery.length > 0 && (
                <Button
                  onPress={() => {
                    setSearchQuery('');
                    setFilteredContacts(contacts);
                  }}
                  style={styles.clearSearchBtn}
                >
                  Clear
                </Button>
              )}
            </View>

            {filteredContacts.length > 0 ? (
              <FlatList
                data={filteredContacts}
                keyExtractor={(item) => item.id}
                renderItem={renderContactItem}
                contentContainerStyle={styles.contactsList}
                initialNumToRender={20}
                maxToRenderPerBatch={50}
                windowSize={10}
                ListHeaderComponent={
                  <Text style={styles.resultsCount}>
                    {filteredContacts.length} কন্টাক্ট পাওয়া গেছে
                  </Text>
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      কন্টাক্ট পাওয়া যায়নি
                    </Text>
                  </View>
                }
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Avatar.Icon
                  size={80}
                  icon="contacts"
                  style={styles.emptyIcon}
                />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'কোন কন্টাক্ট পাওয়া যায়নি' : 'কোন কন্টাক্ট নেই'}
                </Text>
                {!searchQuery && (
                  <Button
                    mode="contained"
                    onPress={loadContacts}
                    style={styles.retryButton}
                  >
                    আবার চেষ্টা করুন
                  </Button>
                )}
              </View>
            )}
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: '#e0e0e0',
  },
  radioGroup: {
    flexDirection: 'row',
    marginLeft: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  radioBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flex: 1,
    marginHorizontal: 4,
  },
  radioBoxActive: {
    borderColor: '#00A8A8',
  },
  connectBtn: {
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 1,
  },
  inputContainer: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
  },
  multilineInput: {
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 8,
  },
  openingBalanceContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1A535C',
  },
  balanceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceInput: {
    flex: 1,
    marginRight: 8,
  },
  balanceTypeGroup: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  balanceTypeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginHorizontal: 2,
  },
  balanceTypeActive: {
    borderColor: '#00A8A8',
  },
  balanceTypeText: {
    color: '#666',
  },
  balanceTypeTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  submitBtn: {
    borderRadius: 24,
    paddingVertical: 6,
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  searchInput: {
    fontSize: 16,
  },
  clearSearchBtn: {
    marginLeft: 8,
  },
  contactsList: {
    paddingBottom: 20,
  },
  contactItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactDetails: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  avatarLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  resultsCount: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f5f5f5',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    backgroundColor: '#e0e0e0',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    marginTop: 10,
    backgroundColor: colors.primary,
  },
});