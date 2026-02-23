import React, { useContext, useEffect, useState, useRef } from 'react';
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
  ActivityIndicator,
  Linking
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
  Snackbar,
  Card,
  Chip
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Contacts from 'react-native-contacts';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { openDatabase } from 'react-native-sqlite-storage';
import { IdGenerator } from '../../Helpers/Generator/IdGenerator';
import moment from 'moment';
import SimCardsManager from 'react-native-sim-cards-manager';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const SaleAndReceive = ({ navigation, route }) => {
  const { logedInUserInfo } = useContext(AuthContext);
  const clientId = route.params.clientId;
  const clientName = route.params.clientName;
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [pelam, setPelam] = useState('');
  const [dilam, setDilam] = useState('');
  const [biboron, setBiboron] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Snackbar states
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SIM states
  const [showSimSelection, setShowSimSelection] = useState(false);
  const [simCards, setSimCards] = useState([]);
  const [selectedSim, setSelectedSim] = useState(null);
  const [isLoadingSims, setIsLoadingSims] = useState(false);
  const [savedSimData, setSavedSimData] = useState(null);

  // Tooltip state
  const [showMenuModal, setShowMenuModal] = useState(false);
  const menuModalRef = useRef(null);

  // Menu options handlers
  const handleViewDetails = () => {
    setShowMenuModal(false);
    // You might want to navigate to a different screen or show a modal
    navigation.navigate('ClientDetails', { clientId, clientName });
    showSnackbar('কাস্টমার বিবরণ দেখানো হচ্ছে', 'info');
  };

  const handleViewTransactions = () => {
    setShowMenuModal(false);
    // Navigate to transaction history screen
    navigation.navigate('TransactionHistory', { clientId, clientName });
    showSnackbar('লেনদেন ইতিহাস দেখানো হচ্ছে', 'info');
  };

  const handleRefreshData = () => {
    setShowMenuModal(false);
    fetchClientData();
    showSnackbar('ডেটা রিফ্রেশ করা হয়েছে', 'success');
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Show snackbar message
  const showSnackbar = (message, type = 'success') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
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
            console.log(client)
            setClientData(client);
          } else {
            setClientData(null);
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

  // Load saved SIM selection from database
  const loadSavedSimSelection = () => {
    return new Promise((resolve) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM sms_settings WHERE shop_id = ? LIMIT 1',
          [logedInUserInfo?.shop[0]?.id],
          (tx, results) => {
            if (results.rows.length > 0) {
              const savedSim = results.rows.item(0);
              setSavedSimData(savedSim);
              console.log('Loaded saved SIM data:', savedSim);
              resolve(savedSim);
            } else {
              console.log('No saved SIM data found');
              resolve(null);
            }
          },
          (tx, error) => {
            console.error('Error loading saved SIM data:', error);
            resolve(null);
          }
        );
      });
    });
  };

  // Save SIM selection to database
  const saveSimSelectionToDb = (simData) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        // First check if setting exists
        tx.executeSql(
          'SELECT * FROM sms_settings WHERE shop_id = ?',
          [logedInUserInfo?.shop[0]?.id],
          (tx, checkResults) => {
            if (checkResults.rows.length > 0) {
              // Update existing record
              tx.executeSql(
                'UPDATE sms_settings SET selected_sim_id = ?, sim_display_name = ?, subscription_id = ?, is_no_sim_option = ?, updated_at = ? WHERE shop_id = ?',
                [
                  simData.id,
                  simData.displayName,
                  simData.subscriptionId || null,
                  simData.isNoSimOption ? 1 : 0,
                  moment().format('YYYY-MM-DD HH:mm:ss'),
                  logedInUserInfo?.shop[0]?.id
                ],
                (tx, updateResults) => {
                  console.log('SIM selection updated in database');
                  console.log(simData)
                  setSavedSimData(simData);
                  resolve(true);
                },
                (tx, updateError) => {
                  console.error('Error updating SIM selection:', updateError);
                  reject(updateError);
                }
              );
            } else {
              // Insert new record
              const settingId = IdGenerator(logedInUserInfo.id);
              tx.executeSql(
                'INSERT INTO sms_settings (id, shop_id, selected_sim_id, sim_display_name, subscription_id, is_no_sim_option, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  settingId,
                  logedInUserInfo?.shop[0]?.id,
                  simData.id,
                  simData.displayName,
                  simData.subscriptionId || null,
                  simData.isNoSimOption ? 1 : 0,
                  moment().format('YYYY-MM-DD HH:mm:ss'),
                  moment().format('YYYY-MM-DD HH:mm:ss')
                ],
                (tx, insertResults) => {
                  console.log('SIM selection saved to database');
                  console.log(simData)
                  setSavedSimData(simData);
                  resolve(true);
                },
                (tx, insertError) => {
                  console.error('Error saving SIM selection:', insertError);
                  reject(insertError);
                }
              );
            }
          },
          (tx, checkError) => {
            console.error('Error checking SIM settings:', checkError);
            reject(checkError);
          }
        );
      });
    });
  };

  // Fetch SIM cards with "No SIM" option
  const fetchSimCards = async () => {
    try {
      setIsLoadingSims(true);

      // Create table if not exists
      // createSmsSettingsTable();

      // Load saved SIM selection
      const savedSim = await loadSavedSimSelection();

      console.log('savedSim', savedSim)

      const sims = await SimCardsManager.getSimCards();

      // Format SIM cards data
      const formattedSims = sims.map((sim, index) => ({
        ...sim,
        id: sim.subscriptionId || index.toString(),
        displayName: sim.displayName || sim.carrierName || `SIM ${index + 1}`,
        isActive: true,
        phoneNumber: sim.phoneNumber || sim.number || 'নম্বর নেই',
        isNoSimOption: false // Mark as real SIM card
      }));

      // Add "No SIM card selected" option as the first item
      const noSimOption = {
        id: 'no-sim-selected',
        displayName: 'SMS পাঠাবেন না',
        isActive: false,
        phoneNumber: null,
        isNoSimOption: true,
        subscriptionId: null
      };

      // Add no SIM option to the beginning of the list
      const allOptions = [noSimOption, ...formattedSims];

      setSimCards(allOptions);

      console.log(allOptions)

      // Set selected SIM based on saved data or default to "No SIM" option
      if (savedSim) {
        // Find matching SIM from the list
        let selected = allOptions.find(sim =>
          sim.id === savedSim.selected_sim_id ||
          (sim.isNoSimOption && savedSim.is_no_sim_option === 1)
        );

        console.log('selected', selected)

        if (selected) {
          console.log('comes')
          setSelectedSim(selected);
        } else {
          // If saved SIM not found in current list, default to "No SIM"
          setSelectedSim(noSimOption);
          // Update database with default selection
          // saveSimSelectionToDb(noSimOption).catch(console.error);
        }
      } else {
        // No saved data, default to "No SIM" option
        setSelectedSim(noSimOption);
        // Save default to database
        // saveSimSelectionToDb(noSimOption).catch(console.error);
      }

    } catch (error) {
      console.error('Error fetching SIM cards:', error);

      // Even if error occurs, create the no SIM option
      const noSimOption = {
        id: 'no-sim-selected',
        displayName: 'SMS পাঠাবেন না',
        isActive: false,
        phoneNumber: null,
        isNoSimOption: true,
        subscriptionId: null
      };

      setSimCards([noSimOption]);
      setSelectedSim(noSimOption);

      // Try to save default to database
      // saveSimSelectionToDb(noSimOption).catch(console.error);

      showSnackbar('SIM তথ্য লোড করতে সমস্যা হয়েছে', 'error');
    } finally {
      setIsLoadingSims(false);
    }
  };

  // SIM card selection handler
  const handleSimSelect = async (sim) => {
    try {
      // Save to database first
      await saveSimSelectionToDb(sim);

      // Update local state
      setSelectedSim(sim);
      setShowSimSelection(false);

      showSnackbar(
        sim.isNoSimOption
          ? 'SMS পাঠানো হবে না'
          : `${sim.displayName} নির্বাচন করা হয়েছে`,
        'success'
      );
    } catch (error) {
      console.error('Error saving SIM selection:', error);
      showSnackbar('SIM নির্বাচন সংরক্ষণ করতে সমস্যা হয়েছে', 'error');
    }
  };

  // Fetch SIM cards on mount
  useEffect(() => {
    fetchSimCards();
  }, []);

  // console.log(selectedSim);

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
      // showSnackbar('দয়া করে একটি SIM নির্বাচন করুন', 'error');
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

  useEffect(() => {
    fetchClientData();
  }, []);

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || selectedDate;
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };



  const handleSubmit = () => {
    // Parse amounts
    const pelamAmount = parseFloat(pelam) || 0;
    const dilamAmount = parseFloat(dilam) || 0;

    // Validate that at least one field has positive amount
    if (pelamAmount <= 0 && dilamAmount <= 0) {
      showSnackbar('দয়া করে পেলাম বা দিলামের কমপক্ষে একটি পরিমাণ লিখুন', 'error');
      return;
    }

    let pelamTransactionType = "";
    let dilamTransactionType = "";
    if (clientData.type == "Supplier") {
      // transactionType = dilam === 'Customer' ? 'Purchase' : 'Payment';
      if (pelamAmount != 0) {
        pelamTransactionType = "Purchase"
      }
      if (dilamAmount != 0) {
        dilamTransactionType = "Payment"
      }
    } else {
      // transactionType = clientData.type === 'Supplier' ? 'Sale' : 'Receive';
      if (dilamAmount != 0) {
        dilamTransactionType = "Sale"
      }
      if (pelamAmount != 0) {
        pelamTransactionType = "Receive"
      }

    }

    console.log(pelamTransactionType, dilamTransactionType)

    setIsSubmitting(true);

    db.transaction(tx => {

      if (dilamAmount > 0) {
        const ledger1 = IdGenerator(logedInUserInfo.id);
        tx.executeSql(
          'INSERT INTO ledgers (id, client_id, transaction_type, transaction_date, amount, comments, entry_by, shop_id, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            ledger1,
            clientId,
            dilamTransactionType,
            moment(selectedDate).format('YYYY-MM-DD HH:mm:ss'),
            dilamAmount,
            biboron,
            logedInUserInfo?.id,
            logedInUserInfo?.shop[0]?.id,
            "No",
            moment().format('YYYY-MM-DD HH:mm:ss'),
            moment().format('YYYY-MM-DD HH:mm:ss')
          ],
          async (tx, ledgerResult) => {
            console.log('dilam amount submited')
          },
          (tx, ledgerError) => {
            console.log(ledgerError)
          }
        );
      }

      if (pelamAmount > 0) {
        const ledger2 = IdGenerator(logedInUserInfo.id);
        tx.executeSql(
          'INSERT INTO ledgers (id, client_id, transaction_type, transaction_date, amount, comments, entry_by, shop_id, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            ledger2,
            clientId,
            pelamTransactionType,
            moment(selectedDate).format('YYYY-MM-DD HH:mm:ss'),
            pelamAmount,
            biboron,
            logedInUserInfo?.id,
            logedInUserInfo?.shop[0]?.id,
            "No",
            moment().format('YYYY-MM-DD HH:mm:ss'),
            moment().format('YYYY-MM-DD HH:mm:ss')
          ],
          async (tx, ledgerResult) => {
            console.log('dilam amount submited')
          },
          (tx, ledgerError) => {
            console.log(ledgerError)
          }
        );
      }

      tx.executeSql(
        'SELECT * FROM ledgers WHERE client_id = ?',
        [
          clientId,
        ],
        async (tx, ledgerResult) => {
          let data = ledgerResult.rows.raw()
          console.log(data)

          let saleOrPayment = 0
          let purchaseOrReceive = 0
          if (clientData.type == "Supplier") {
            data.map((item) => {
              if (item.transaction_type == "Payment") {
                purchaseOrReceive += parseFloat(item.amount)
              } else {
                saleOrPayment += parseFloat(item.amount)
              }
            })
          } else {
            data.map((item) => {
              if (item.transaction_type == "Sale") {
                saleOrPayment += parseFloat(item.amount)
              } else {
                purchaseOrReceive += parseFloat(item.amount)
              }
            })
          }

          console.log(saleOrPayment, purchaseOrReceive)

          let dueOrAdvance = "Due";
          let dueOrAdvanceAmount = 0;
          if (saleOrPayment > purchaseOrReceive) {
            dueOrAdvance = "Due"
            dueOrAdvanceAmount = saleOrPayment - purchaseOrReceive
          } else {
            dueOrAdvance = "Advance"
            dueOrAdvanceAmount = purchaseOrReceive - saleOrPayment
          }

          console.log(dueOrAdvance, dueOrAdvanceAmount)

          tx.executeSql(
            'UPDATE clients SET updated_at = ?, amount = ?, amount_type = ?, sync_status = ?  WHERE id = ?',
            [moment().format('YYYY-MM-DD HH:mm:ss'), dueOrAdvanceAmount, dueOrAdvance, "No", clientId],
            async (tx, results) => {
              if (results.rowsAffected > 0) {
                console.log('First record updated');

                if (clientData.phone_no && clientData.phone_no.trim() !== '' && !selectedSim?.isNoSimOption && selectedSim) {
                  try {
                    const formattedAmount = new Intl.NumberFormat('en-BD').format(dueOrAdvanceAmount);
                    const shopName = logedInUserInfo?.shop[0]?.title || '';

                    let smsMessage = ''
                    if (dueOrAdvanceAmount == 0) {
                      smsMessage = `বাকি: ৳${formattedAmount}\n${shopName}`;
                    } else {
                      if (dueOrAdvance === 'Due') {
                        smsMessage = `বাকি: ৳${formattedAmount}\n${shopName}`;
                      } else {
                        smsMessage = `অগ্রিম: ৳${formattedAmount}\n${shopName}`;
                      }
                    }

                    await sendSms(clientData.phone_no, smsMessage);
                    console.log('SMS sent successfully:', smsMessage);
                  } catch (smsError) {
                    console.error('Failed to send SMS:', smsError);
                  }
                }

                setIsSubmitting(false);
                showSnackbar('লেনদেন সফলভাবে যোগ করা হয়েছে', 'success');

                // resetForm();

                setTimeout(() => {
                  navigation.replace('SaleAndReceiveDetails', {
                    clientData: clientData,
                    pelam: pelamAmount,
                    dilam: dilamAmount,
                    clientId: clientId
                  });
                }, 2000);

              } else {
                console.log('No record found with id: ' + clientId);
              }
            },
            (tx, error) => {
              console.error('Update error:', error.message);
              return false; // This will rollback the transaction
            })

        },
        (tx, ledgerError) => {
          console.log(ledgerError)
          setIsSubmitting(false);
          showSnackbar('লেনদেন সফলভাবে যোগ হয়নি', 'error');
        }
      );



    })



    // Here you can add your database logic to save the transaction

    console.log({
      clientId,
      // type: transactionType,
      pelam: pelamAmount,
      dilam: dilamAmount,
      // netAmount: Math.abs(netAmount),
      description: biboron,
      date: selectedDate,
    });

    // Reset form
    setPelam('');
    setDilam('');
    setBiboron('');
    setSelectedDate(new Date());

    // Refresh client data
    // fetchClientData();
  };

  const formatDateBangla = (date) => {
    return moment(date).format('DD MMMM YYYY');
  };

  // Render SIM selection modal
  const renderSimSelectionModal = () => (
    <Modal
      visible={showSimSelection}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSimSelection(false)}
    >
      <View style={styles.simModalOverlay}>
        <View style={styles.simModalContainer}>
          {/* Modal Header */}
          <View style={styles.simModalHeader}>
            <Text style={styles.simModalTitle}>SMS পাঠানোর SIM নির্বাচন করুন</Text>
            <TouchableOpacity
              onPress={() => setShowSimSelection(false)}
              style={styles.simModalCloseBtn}
            >
              <Text style={styles.simModalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* SIM Cards List */}
          <ScrollView style={styles.simListContainer}>
            {isLoadingSims ? (
              <View style={styles.simLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.simLoadingText}>SIM লোড হচ্ছে...</Text>
              </View>
            ) : simCards.length > 0 ? (
              simCards.map((sim) => (
                <TouchableOpacity
                  key={sim.id}
                  style={[
                    styles.simCardItem,
                    selectedSim?.id === sim.id && styles.simCardItemSelected,
                    sim.isNoSimOption && styles.noSimOptionItem
                  ]}
                  onPress={() => handleSimSelect(sim)}
                >
                  <View style={styles.simCardContent}>
                    <View style={styles.simCardLeft}>
                      <View style={[
                        styles.simIconContainer,
                        {
                          backgroundColor: sim.isNoSimOption
                            ? '#f8f9fa'
                            : (sim.isActive ? colors.primaryLightest : '#f0f0f0')
                        }
                      ]}>
                        <Icon
                          name={sim.isNoSimOption ? "message-off" : "sim"}
                          size={24}
                          color={sim.isNoSimOption ? '#888' : (sim.isActive ? colors.primary : '#888')}
                        />
                      </View>
                      <View style={styles.simInfo}>
                        <Text style={[
                          styles.simName,
                          selectedSim?.id === sim.id && styles.simNameSelected,
                          sim.isNoSimOption && styles.noSimOptionText
                        ]}>
                          {sim.displayName}
                        </Text>
                        {!sim.isNoSimOption && sim.isActive && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>সক্রিয়</Text>
                          </View>
                        )}
                        {sim.isNoSimOption && (
                          <Text style={styles.noSimDescription}>
                            শুধুমাত্র কাস্টমার যোগ করুন, SMS পাঠাবেন না
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.simCardRight}>
                      {selectedSim?.id === sim.id ? (
                        <View style={styles.selectedIndicator}>
                          <Icon
                            name="check-circle"
                            size={24}
                            color={colors.success}
                          />
                        </View>
                      ) : (
                        <View style={styles.unselectedIndicator}>
                          <Icon
                            name="circle"
                            size={24}
                            color="#ddd"
                          />
                        </View>
                      )}
                    </View>
                  </View>

                  <Divider style={styles.simDivider} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noSimContainer}>
                <Icon
                  name="sim-card-alert"
                  size={60}
                  color="#ccc"
                />
                <Text style={styles.noSimText}>কোন SIM কার্ড পাওয়া যায়নি</Text>
                <Text style={styles.noSimSubText}>
                  আপনার ডিভাইসে SIM কার্ড ইন্সার্ট করা নেই অথবা অনুমতি প্রয়োজন
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.simModalFooter}>
            <Button
              mode="outlined"
              style={styles.simModalCancelBtn}
              labelStyle={{ color: colors.textPrimary }}
              onPress={() => setShowSimSelection(false)}
            >
              বাতিল
            </Button>
            <Button
              mode="contained"
              style={styles.simModalConfirmBtn}
              labelStyle={{ color: '#fff' }}
              onPress={() => setShowSimSelection(false)}
            >
              বন্ধ করুন
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );

  const isFormValid = () => {
    const pelamAmount = parseFloat(pelam) || 0;
    const dilamAmount = parseFloat(dilam) || 0;

    // Form is valid if at least one field has positive amount
    return pelamAmount > 0 || dilamAmount > 0;
  };

  // Calculate net amount for display
  const calculateNetAmount = () => {
    const pelamAmount = parseFloat(pelam) || 0;
    const dilamAmount = parseFloat(dilam) || 0;
    const netAmount = pelamAmount - dilamAmount;

    return netAmount;
  };

  // Get transaction summary
  const getTransactionSummary = () => {
    const pelamAmount = parseFloat(pelam) || 0;
    const dilamAmount = parseFloat(dilam) || 0;
    const netAmount = calculateNetAmount();

    if (pelamAmount === 0 && dilamAmount === 0) {
      return 'পরিমাণ লিখুন';
    }

    if (netAmount === 0) {
      return 'সর্বমোট: ০ টাকা (ব্যালান্সড)';
    } else if (netAmount > 0) {
      return `সর্বমোট পেলাম: ${Math.abs(netAmount).toLocaleString('bn-BD')} টাকা`;
    } else {
      return `সর্বমোট দিলাম: ${Math.abs(netAmount).toLocaleString('bn-BD')} টাকা`;
    }
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <Appbar.Header style={{ backgroundColor: colors.primary }}>
          <Appbar.BackAction
            color="#fff"
            onPress={() => navigation.goBack()}
          />
          <Appbar.Content
            title={clientName || "Client Details"}
            color="#fff"
          />
          <Appbar.Action
            icon="dots-vertical"
            color="#fff"
            onPress={() => setShowMenuModal(true)}
          />
        </Appbar.Header>

        {/* Menu Modal - Professional Design */}
        <Modal
          visible={showMenuModal}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setShowMenuModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowMenuModal(false)}>
            <View style={styles.menuModalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.menuModalContent} ref={menuModalRef}>
                  {/* Modal Header */}
                  <View style={styles.menuModalHeader}>
                    <View style={styles.menuModalHeaderIcon}>
                      <Icon name="account-circle" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.menuModalHeaderContent}>
                      <Text style={styles.menuModalTitle}>{clientName}</Text>
                      <Text style={styles.menuModalSubtitle}>
                        {clientData?.type === 'Customer' ? 'কাস্টমার' : 'সাপ্লায়ার'}
                      </Text>
                    </View>
                  </View>

                  {/* Menu Items */}
                  <View style={styles.menuModalItems}>
                    {/* View Details */}
                    <TouchableOpacity
                      style={styles.menuModalItem}
                      onPress={() => navigation.navigate('UpdateClient', {
                        clientId: clientId
                      })}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuModalItemIcon, styles.viewDetailsIcon]}>
                        <Icon name="account-eye" size={20} color={colors.info} />
                      </View>
                      <View style={styles.menuModalItemContent}>
                        <Text style={styles.menuModalItemTitle}>আপডেট কাস্টমার/সাপ্লায়ার</Text>
                        <Text style={styles.menuModalItemSubtitle}>
                          {clientData?.phone_no || 'নম্বর নেই'}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={20} color="#ccc" />
                    </TouchableOpacity>

                    {/* Transactions History */}
                    <TouchableOpacity
                      style={styles.menuModalItem}
                      onPress={() => navigation.navigate('LendenHistory', {
                        clientId: clientId,
                        clientName: clientName,
                        clientData: clientData
                      })}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuModalItemIcon, styles.transactionsIcon]}>
                        <Icon name="chart-timeline-variant" size={20} color={colors.primary} />
                      </View>
                      <View style={styles.menuModalItemContent}>
                        <Text style={styles.menuModalItemTitle}>লেনদেন ইতিহাস</Text>
                        <Text style={styles.menuModalItemSubtitle}>
                          {clientData?.amount == 0
                            ? "পরিশোধিত"
                            : (clientData?.amount_type === "Due"
                              ? `বাকি: ${(Number(clientData?.amount) || 0).toLocaleString('bn-BD')} টাকা`
                              : `অগ্রিম: ${(Number(clientData?.amount) || 0).toLocaleString('bn-BD')} টাকা`)
                          }
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={20} color="#ccc" />
                    </TouchableOpacity>

                    {/* Refresh Data */}
                    <TouchableOpacity
                      style={styles.menuModalItem}
                      onPress={handleRefreshData}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuModalItemIcon, styles.refreshIcon]}>
                        <Icon name="database-refresh" size={20} color={colors.warning} />
                      </View>
                      <View style={styles.menuModalItemContent}>
                        <Text style={styles.menuModalItemTitle}>ডেটা রিফ্রেশ করুন</Text>
                        <Text style={styles.menuModalItemSubtitle}>
                          সর্বশেষ তথ্য আপডেট করুন
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={20} color="#ccc" />
                    </TouchableOpacity>

                    {/* Quick Actions Divider */}
                    <View style={styles.quickActionsDivider}>
                      <Text style={styles.quickActionsTitle}>দ্রুত কার্যক্রম</Text>
                    </View>

                    {/* Call Customer */}
                    {clientData?.phone_no && (
                      <TouchableOpacity
                        style={styles.menuModalItem}
                        onPress={() => {
                          setShowMenuModal(false);
                          if (clientData.phone_no) {
                            Linking.openURL(`tel:${clientData.phone_no}`);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.menuModalItemIcon, styles.callIcon]}>
                          <Icon name="phone-outgoing" size={20} color={colors.success} />
                        </View>
                        <View style={styles.menuModalItemContent}>
                          <Text style={styles.menuModalItemTitle}>কল করুন</Text>
                          <Text style={styles.menuModalItemSubtitle}>
                            {clientData.phone_no}
                          </Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#ccc" />
                      </TouchableOpacity>
                    )}

                    {/* Send Message */}
                    {clientData?.phone_no && (
                      <TouchableOpacity
                        style={styles.menuModalItem}
                        onPress={() => {
                          setShowMenuModal(false);
                          const formattedAmount = new Intl.NumberFormat('en-BD').format(clientData.amount);
                          const shopName = logedInUserInfo?.shop[0]?.title || '';

                          let smsMessage = ''
                          if (clientData.amount == 0) {
                            smsMessage = `বাকি: ৳${formattedAmount}\n${shopName}`;
                          } else {
                            if (clientData.amount === 'Due') {
                              smsMessage = `বাকি: ৳${formattedAmount}\n${shopName}`;
                            } else {
                              smsMessage = `অগ্রিম: ৳${formattedAmount}\n${shopName}`;
                            }
                          }
                          sendSms(clientData.phone_no, smsMessage)
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.menuModalItemIcon, styles.messageIcon]}>
                          <Icon name="message-text-outline" size={20} color={colors.primaryLight} />
                        </View>
                        <View style={styles.menuModalItemContent}>
                          <Text style={styles.menuModalItemTitle}>বার্তা পাঠান</Text>
                          <Text style={styles.menuModalItemSubtitle}>
                            {clientData.phone_no}
                          </Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#ccc" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Footer Actions */}
                  <View style={styles.menuModalFooter}>
                    <TouchableOpacity
                      style={styles.menuModalCancelBtn}
                      onPress={() => setShowMenuModal(false)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.menuModalCancelText}>বন্ধ করুন</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading client data...</Text>
          </View>
        ) : clientData ? (
          <ScrollView style={styles.content}>
            {/* Client Overview Card */}
            <Card style={styles.overviewCard}>
              <Card.Content>
                <View style={styles.clientHeader}>
                  <Avatar.Text
                    size={60}
                    label={clientData.name.charAt(0)}
                    style={[styles.avatar, { backgroundColor: colors.primary }]}
                    labelStyle={styles.avatarLabel}
                  />
                  <View style={styles.clientHeaderInfo}>
                    <Text style={styles.clientName}>{clientData.name}</Text>
                    <Text style={clientData.amount == 0 ? styles.successText : (clientData.amount_type === "Due" ? styles.dueText : styles.advanceText)}>
                      {clientData.amount == 0
                        ? "পরিশোধিত"
                        : (clientData.amount_type === "Due"
                          ? `বাকি: ${(Number(clientData.amount) || 0).toLocaleString('bn-BD')} টাকা`
                          : `অগ্রিম: ${(Number(clientData.amount) || 0).toLocaleString('bn-BD')} টাকা`)
                      }
                    </Text>
                    {
                      clientData.phone_no != '' ?
                        <Text style={{}}>
                          <TouchableOpacity onPress={() => {
                            if (clientData.phone_no) {
                              Linking.openURL(`tel:${clientData.phone_no}`);
                            }
                          }}>
                            <Text style={styles.phoneLink}> <Icon name="phone-in-talk" /> {clientData.phone_no || ''}</Text>
                          </TouchableOpacity>
                        </Text> : ''
                    }
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* Transaction Form Card */}
            <Card style={styles.formCard}>
              <Card.Content>
                <Text style={styles.cardTitle}>নতুন লেনদেন যোগ করুন</Text>
                <Divider style={styles.cardDivider} />

                {/* Inline Pelam and Dilam Inputs */}
                <View style={styles.inlineInputContainer}>
                  {/* Dilam (Given) Input */}
                  <View style={[styles.inlineInputWrapper, { marginRight: 5 }]}>
                    <TextInput
                      label={clientData.type == "Customer" ? "দিলাম/বিক্রি" : "দিলাম"}
                      value={dilam}
                      onChangeText={(text) => {
                        // Only allow numbers and one decimal point
                        const formattedText = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                        setDilam(formattedText);
                      }}
                      keyboardType="numeric"
                      mode="outlined"
                      style={styles.inlineInput}
                      outlineColor={colors.error}
                      activeOutlineColor={colors.error}
                      left={<TextInput.Icon icon="cash-minus" color={colors.error} />}
                      right={<TextInput.Affix text="৳" />}
                      placeholder="3000"
                    />
                    {/* <Text style={styles.inputHelperText}>
                      গ্রাহককে দিলাম
                    </Text> */}
                  </View>

                  {/* <View style={styles.inlineDividerContainer}>
                    <Text style={styles.inlineDividerText}>এবং</Text>
                    <View style={styles.inlineDividerLine} />
                  </View> */}
                  {/* Pelam (Received) Input */}
                  <View style={[styles.inlineInputWrapper, { marginLeft: 5 }]}>
                    <TextInput
                      // label="পেলাম (টাকা)"
                      label={clientData.type == "Customer" ? "পেলাম" : "পেলাম/ক্রয়"}
                      value={pelam}
                      onChangeText={(text) => {
                        // Only allow numbers and one decimal point
                        const formattedText = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                        setPelam(formattedText);
                      }}
                      keyboardType="numeric"
                      mode="outlined"
                      style={styles.inlineInput}
                      outlineColor={colors.success}
                      activeOutlineColor={colors.success}
                      left={<TextInput.Icon icon="cash-plus" color={colors.success} />}
                      right={<TextInput.Affix text="৳" />}
                      placeholder="5000"
                    />
                    {/* <Text style={styles.inputHelperText}>
                      গ্রাহক থেকে পেলাম
                    </Text> */}
                  </View>
                </View>

                {/* Transaction Summary */}
                {/* {(pelam || dilam) && (
                  <View style={[
                    styles.transactionSummary,
                    {
                      backgroundColor: calculateNetAmount() > 0 ? colors.success + '15' :
                        calculateNetAmount() < 0 ? colors.error + '15' :
                          colors.warning + '15'
                    }
                  ]}>
                    <Icon
                      name={calculateNetAmount() > 0 ? "arrow-down-circle" :
                        calculateNetAmount() < 0 ? "arrow-up-circle" : "scale-balance"}
                      size={20}
                      color={calculateNetAmount() > 0 ? colors.success :
                        calculateNetAmount() < 0 ? colors.error : colors.warning}
                    />
                    <Text style={[
                      styles.transactionSummaryText,
                      {
                        color: calculateNetAmount() > 0 ? colors.success :
                          calculateNetAmount() < 0 ? colors.error : colors.warning
                      }
                    ]}>
                      {getTransactionSummary()}
                    </Text>
                  </View>
                )} */}

                {/* Validation Message */}
                {!isFormValid() && (pelam || dilam) && (
                  <View style={styles.validationMessage}>
                    <Icon name="alert-circle" size={16} color={colors.warning} />
                    <Text style={styles.validationMessageText}>
                      কমপক্ষে একটি পরিমাণ লিখুন
                    </Text>
                  </View>
                )}

                {/* Date Picker */}
                <View style={styles.datePickerContainer}>
                  <Text style={styles.dateLabel}>তারিখ</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Icon name="calendar" size={24} color={colors.primary} />
                    <Text style={styles.dateButtonText}>
                      {formatDateBangla(selectedDate)}
                    </Text>
                    <Icon name="chevron-down" size={24} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* Date Picker Modal for Android */}
                {showDatePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                  />
                )}

                {/* Date Picker Modal for iOS */}
                {showDatePicker && Platform.OS === 'ios' && (
                  <Modal
                    transparent={true}
                    animationType="slide"
                    visible={showDatePicker}
                    onRequestClose={() => setShowDatePicker(false)}
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                          <Text style={styles.modalTitle}>তারিখ নির্বাচন করুন</Text>
                          <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                            <Icon name="close" size={24} color={colors.textPrimary} />
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={selectedDate}
                          mode="date"
                          display="spinner"
                          onChange={onDateChange}
                          textColor={colors.textPrimary}
                        />
                        <Button
                          mode="contained"
                          onPress={() => setShowDatePicker(false)}
                          style={styles.modalButton}
                          buttonColor={colors.primary}
                        >
                          নিশ্চিত করুন
                        </Button>
                      </View>
                    </View>
                  </Modal>
                )}

                {/* Description Input */}
                <TextInput
                  label="বিবরণ (ঐচ্ছিক)"
                  value={biboron}
                  onChangeText={setBiboron}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                  outlineColor={colors.primaryLight}
                  activeOutlineColor={colors.primary}
                  left={<TextInput.Icon icon="text" />}
                  placeholder="যেমন: পণ্য ক্রয়, বিক্রয়, পেমেন্ট ইত্যাদি"
                />

                {/* Submit Button */}
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={[
                    styles.submitButton,
                    {
                      backgroundColor: calculateNetAmount() > 0 ? colors.success :
                        calculateNetAmount() < 0 ? colors.error :
                          colors.primary
                    }
                  ]}
                  icon={isSubmitting ? 'loading' : 'check-circle'}
                  contentStyle={styles.submitButtonContent}
                  disabled={!isFormValid() || isSubmitting}
                >
                  <Text style={styles.submitButtonText}>
                    {isSubmitting ? 'সংরক্ষণ করা হচ্ছে...' : 'লেনদেন সংরক্ষণ করুন'}
                  </Text>
                </Button>
              </Card.Content>
            </Card>

            {/* SMS Settings Section */}
            <View style={styles.smsSettingsSection}>
              <Text style={styles.sectionTitle}>SMS সেটিংস</Text>

              <TouchableOpacity
                style={styles.simSelectionCard}
                onPress={() => setShowSimSelection(true)}
              >
                {selectedSim ? (
                  <View style={styles.selectedSimContent}>
                    <View style={styles.selectedSimLeft}>
                      <Icon
                        name={selectedSim.isNoSimOption ? "message-off" : "sim"}
                        size={28}
                        color={selectedSim.isNoSimOption ? "#888" : colors.primary}
                      />
                      <View style={styles.selectedSimInfo}>
                        <Text style={styles.selectedSimName}>
                          {selectedSim.displayName}
                        </Text>
                        <Text style={[
                          styles.selectedSimStatus,
                          { color: selectedSim.isNoSimOption ? '#666' : colors.success }
                        ]}>
                          {selectedSim.isNoSimOption
                            ? 'SIM সিলেক্ট করা নেই'
                            : (selectedSim.isActive ? 'সক্রিয় SIM' : 'নিষ্ক্রিয় SIM')}
                        </Text>
                      </View>
                    </View>
                    <Icon
                      name="chevron-right"
                      size={24}
                      color={colors.primaryLight}
                    />
                  </View>
                ) : (
                  <View style={styles.noSimSelected}>
                    <Icon
                      name="sim"
                      size={28}
                      color="#888"
                    />
                    <Text style={styles.selectSimText}>SIM নির্বাচন করুন</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.simNote}>
                {selectedSim?.isNoSimOption
                  ? 'কোন SMS পাঠানো হবে না, শুধুমাত্র কাস্টমার তথ্য সংরক্ষণ করা হবে'
                  : 'নির্বাচিত SIM দিয়ে স্বাগত বার্তা পাঠানো হবে'}
              </Text>
            </View>
            {/* SIM Selection Modal */}
            {renderSimSelectionModal()}

          </ScrollView>
        ) : (
          <View style={styles.errorContainer}>
            <Icon name="account-alert" size={80} color={colors.error} />
            <Text style={styles.errorText}>Client not found</Text>
            <Text style={styles.errorSubText}>
              The client information could not be loaded.
            </Text>
            <Icon.Button
              name="refresh"
              backgroundColor={colors.primary}
              onPress={fetchClientData}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Icon.Button>
          </View>
        )}

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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  // Overview Card
  overviewCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: colors.surface,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientHeaderInfo: {
    marginLeft: 16,
    flex: 1,
  },
  clientName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  avatarLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Form Card
  formCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: colors.surface,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  cardDivider: {
    marginBottom: 16,
    backgroundColor: colors.primaryLightest,
  },
  // Inline Input Container
  inlineInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  inlineInputWrapper: {
    flex: 1,
  },
  inlineInput: {
    backgroundColor: colors.surface,
  },
  inputHelperText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Inline Divider
  inlineDividerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    marginTop: 8,
  },
  inlineDividerText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    zIndex: 1,
  },
  inlineDividerLine: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: colors.primaryLight,
    zIndex: 0,
  },
  // Transaction Summary
  transactionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  transactionSummaryText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
    backgroundColor: colors.surface,
  },
  // Validation Message
  validationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning + '10',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  validationMessageText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
    textAlign: 'center',
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  dateButtonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  // iOS Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryLightest,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalButton: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 8,
    elevation: 2,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    borderRadius: 8,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  successText: {
    color: colors.success,
    fontSize: 15,
    fontWeight: 'bold',
  },
  dueText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: 'bold',
  },
  advanceText: {
    color: colors.success,
    fontSize: 15,
    fontWeight: 'bold',
  },
  phoneLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  snackbar: {
    backgroundColor: colors.primary,
  },
  // SMS Settings Section
  smsSettingsSection: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: colors.primaryLightest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryLighter,
  },
  simSelectionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    marginTop: 8,
  },
  selectedSimContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedSimLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedSimInfo: {
    marginLeft: 12,
    flex: 1,
  },
  selectedSimName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  selectedSimStatus: {
    fontSize: 13,
    marginTop: 2,
  },
  // No SIM Selected State
  noSimSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  selectSimText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  // SIM Note
  simNote: {
    fontSize: 12,
    color: colors.primaryDark,
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // SIM Selection Modal
  simModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  simModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  simModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  simModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
  },
  simModalCloseBtn: {
    padding: 4,
  },
  simModalCloseText: {
    fontSize: 24,
    color: '#888',
  },
  // SIM List
  simListContainer: {
    maxHeight: 400,
  },
  simCardItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  simCardItemSelected: {
    backgroundColor: colors.primaryLightest,
  },
  noSimOptionItem: {
    backgroundColor: '#f8f9fa',
  },
  simCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  simCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  simIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  simInfo: {
    flex: 1,
  },
  simName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  simNameSelected: {
    color: colors.primary,
  },
  noSimOptionText: {
    color: '#666',
    fontStyle: 'italic',
  },
  noSimDescription: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
  simCardRight: {
    marginLeft: 12,
  },
  selectedIndicator: {},
  unselectedIndicator: {},
  simDivider: {
    marginTop: 16,
    backgroundColor: '#f0f0f0',
  },
  // Loading State
  simLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  simLoadingText: {
    marginTop: 12,
    color: colors.textPrimary,
    fontSize: 14,
  },
  // No SIM State
  noSimContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noSimText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 8,
  },
  noSimSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal Footer
  simModalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  simModalCancelBtn: {
    flex: 1,
    marginRight: 8,
    borderColor: colors.primaryLight,
  },
  simModalConfirmBtn: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: colors.primary,
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
  // Section title
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  // Menu Modal - Professional Design
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  menuModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    maxHeight: '85%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    overflow: 'hidden',
  },

  // Modal Header
  menuModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.primaryLightest,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuModalHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuModalHeaderContent: {
    flex: 1,
  },
  menuModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  menuModalSubtitle: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '500',
  },

  // Menu Items Container
  menuModalItems: {
    paddingVertical: 8,
  },

  // Menu Item
  menuModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  menuModalItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  viewDetailsIcon: {
    backgroundColor: colors.info + '15',
  },
  transactionsIcon: {
    backgroundColor: colors.primary + '15',
  },
  refreshIcon: {
    backgroundColor: colors.warning + '15',
  },
  callIcon: {
    backgroundColor: colors.success + '15',
  },
  messageIcon: {
    backgroundColor: colors.primaryLight + '15',
  },
  menuModalItemContent: {
    flex: 1,
  },
  menuModalItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  menuModalItemSubtitle: {
    fontSize: 12,
    color: '#666',
  },

  // Quick Actions Section
  quickActionsDivider: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  quickActionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },

  // Footer
  menuModalFooter: {
    padding: 20,
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  menuModalCancelBtn: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  menuModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },
});

export default SaleAndReceive;