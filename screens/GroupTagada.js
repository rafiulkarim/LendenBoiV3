import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  StatusBar,
  Animated,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
  NativeModules
} from 'react-native';
import {
  Card,
  Avatar,
  Text,
  FAB,
  Searchbar,
  IconButton,
  Appbar,
  Button,
  Divider,
  Snackbar,
  Checkbox,
  TextInput
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AuthContext from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openDatabase } from 'react-native-sqlite-storage';
const db = openDatabase({ name: 'lenden_boi.db', createFromLocation: 1 });
import moment from 'moment';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS
} from 'react-native-permissions';
import {
  PermissionsAndroid
} from 'react-native';
import SimCardsManager from 'react-native-sim-cards-manager';
const { SmsSender } = NativeModules;


const { width, height } = Dimensions.get('window');

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

const PAGE_SIZE = 20; // Number of contacts per page

const GroupTagada = ({ route, navigation }) => {
  const { singOut, myToken, logedInUserInfo } = React.useContext(AuthContext);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('contacts');

  // State for contacts and pagination
  const [contactList, setContactList] = useState([]);
  const [filteredContactList, setFilteredContactList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalContacts, setTotalContacts] = useState(0);
  const [totalClientDue, setTotalClientDue] = useState(0);
  const [totalSupplierDue, setTotalSupplierDue] = useState(0);
  const [searchResultsCount, setSearchResultsCount] = useState(0);

  // Selection and SMS related states
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionSearchQuery, setSelectionSearchQuery] = useState('');

  // SMS related states
  const [showSimSelection, setShowSimSelection] = useState(false);
  const [simCards, setSimCards] = useState([]);
  const [selectedSim, setSelectedSim] = useState(null);
  const [isLoadingSims, setIsLoadingSims] = useState(false);
  const [savedSimData, setSavedSimData] = useState(null);
  const [smsModalVisible, setSmsModalVisible] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsProgress, setSmsProgress] = useState({ current: 0, total: 0 });

  // SMS Template
  const [smsTemplate, setSmsTemplate] = useState(`{type}: ৳{due}
{shopName}`);

  // Snackbar states
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');

  // Ref for search timeout
  const searchTimeoutRef = useRef(null);
  const selectionSearchTimeoutRef = useRef(null);
  // Ref for flatlist
  const flatListRef = useRef(null);
  // Track mounted state
  const isMounted = useRef(true);

  // Format last transaction date
  const formatLastTransaction = useCallback((dateString) => {
    if (!dateString) return 'কোন লেনদেন নেই';

    const now = moment();
    const date = moment(dateString);
    const diffDays = now.diff(date, 'days');

    if (diffDays === 0) return 'আজ';
    if (diffDays === 1) return 'গতকাল';
    if (diffDays < 7) return `${diffDays} দিন আগে`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} সপ্তাহ আগে`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} মাস আগে`;
    return `${Math.floor(diffDays / 365)} বছর আগে`;
  }, []);

  // Generate auto SMS for a contact
  const generateAutoSms = useCallback((contact) => {
    const shopName = logedInUserInfo?.shop[0]?.title || 'আমার দোকান';

    return smsTemplate
      .replace('{type}', (contact.amount_type === 'Due' ? 'বাকি' : 'অগ্রিম'))
      .replace('{due}', (Number(contact.due) || 0).toLocaleString('bn-BD'))
      .replace('{shopName}', shopName);
  }, [logedInUserInfo, smsTemplate]);

  // Show snackbar message
  const showSnackbar = (message, type = 'success') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  // Hide snackbar
  const onDismissSnackbar = () => setSnackbarVisible(false);

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
              const settingId = `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

      // Load saved SIM selection
      const savedSim = await loadSavedSimSelection();

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

      // Set selected SIM based on saved data or default to "No SIM" option
      if (savedSim) {
        // Find matching SIM from the list
        let selected = allOptions.find(sim =>
          sim.id === savedSim.selected_sim_id ||
          (sim.isNoSimOption && savedSim.is_no_sim_option === 1)
        );

        if (selected) {
          setSelectedSim(selected);
        } else {
          // If saved SIM not found in current list, default to "No SIM"
          setSelectedSim(noSimOption);
        }
      } else {
        // No saved data, default to "No SIM" option
        setSelectedSim(noSimOption);
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

      showSnackbar('SIM তথ্য লোড করতে সমস্যা হয়েছে', 'error');
    } finally {
      setIsLoadingSims(false);
    }
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

  // Handle SIM selection
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

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      // Exiting selection mode - clear selections and search
      setSelectedContacts(new Set());
      setSelectionSearchQuery('');
    }
  };

  // Toggle contact selection
  const toggleContactSelection = (contactId) => {
    const newSelection = new Set(selectedContacts);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
      newSelection.add(contactId);
    }
    setSelectedContacts(newSelection);
  };

  // Select all contacts from filtered list
  const selectAllContacts = () => {
    const allIds = filteredContactList
      .filter(contact => contact.phone !== 'ফোন নম্বর নেই')
      .map(contact => contact.id);
    setSelectedContacts(new Set(allIds));
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedContacts(new Set());
  };

  // Send SMS to selected contacts
  const sendSmsToSelected = async () => {
    const selectedList = contactList.filter(
      contact => selectedContacts.has(contact.id) && contact.phone !== 'ফোন নম্বর নেই'
    );

    if (selectedList.length === 0) {
      showSnackbar('কোন কন্টাক্ট নির্বাচন করা হয়নি', 'error');
      return;
    }

    if (selectedSim?.isNoSimOption) {
      showSnackbar('SMS পাঠানোর জন্য একটি SIM নির্বাচন করুন', 'error');
      setShowSimSelection(true);
      return;
    }

    // Confirm before sending
    Alert.alert(
      'SMS পাঠান',
      `আপনি কি ${selectedList.length} জন কন্টাক্টে স্বয়ংক্রিয় SMS পাঠাতে চান?`,
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'পাঠান',
          onPress: () => processBulkSms(selectedList)
        }
      ]
    );
  };

  // Process bulk SMS sending
  const processBulkSms = async (contacts) => {
    setSmsModalVisible(true);
    setSendingSms(true);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      setSmsProgress({ current: i + 1, total: contacts.length });

      try {
        const autoMessage = generateAutoSms(contact);
        const phoneNumber = contact.phone.replace(/\D/g, '');

        if (phoneNumber.length >= 10) { // Basic validation
          const success = await sendSms(phoneNumber, autoMessage);
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
        } else {
          failCount++;
          console.log(`Invalid phone number for ${contact.name}: ${contact.phone}`);
        }

        // Small delay between messages to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to send SMS to ${contact.name}:`, error);
        failCount++;
      }
    }

    setSendingSms(false);

    // Show summary
    showSnackbar(
      `${successCount} টি SMS সফল, ${failCount} টি ব্যর্থ`,
      failCount === 0 ? 'success' : 'warning'
    );

    // Reset selection mode after sending
    setTimeout(() => {
      setSmsModalVisible(false);
      setSmsProgress({ current: 0, total: 0 });
      setIsSelectionMode(false);
      setSelectedContacts(new Set());
      setSelectionSearchQuery('');
    }, 2000);
  };

  // Filter contacts for selection mode (only show those with phone numbers)
  const filterContactsForSelection = useCallback((query) => {
    // First filter out contacts without phone numbers
    let filtered = contactList.filter(contact => contact.phone !== 'ফোন নম্বর নেই');

    // Then apply search if there's a query
    if (query.trim()) {
      const searchLower = query.toLowerCase().trim();
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchLower) ||
        contact.phone.includes(searchLower)
      );
    }

    setFilteredContactList(filtered);
  }, [contactList]);

  // Handle selection search input change with debounce
  const handleSelectionSearchChange = useCallback((text) => {
    setSelectionSearchQuery(text);

    // Clear previous timeout
    if (selectionSearchTimeoutRef.current) {
      clearTimeout(selectionSearchTimeoutRef.current);
    }

    // Set new timeout for debouncing
    selectionSearchTimeoutRef.current = setTimeout(() => {
      filterContactsForSelection(text);
    }, 300);
  }, [filterContactsForSelection]);

  // Fetch contacts with pagination
  const fetchContacts = useCallback(async (pageNum = 1, isRefresh = false, isLoadMore = false, searchTerm = '') => {
    // Prevent duplicate calls
    if ((loading && !isLoadMore && !isRefresh) || (loadingMore && isLoadMore)) return;

    if (isRefresh) {
      setRefreshing(true);
    } else if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    const offset = (pageNum - 1) * PAGE_SIZE;
    let query = 'SELECT id, name, phone_no, amount, type, status, amount_type, updated_at FROM clients';
    let params = [];
    let countQuery = 'SELECT COUNT(*) as total FROM clients';
    let countParams = [];

    // Add search filter if search query exists
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      const searchCondition = ' WHERE name LIKE ? OR phone_no LIKE ?';
      query += searchCondition;
      countQuery += searchCondition;
      const searchParam = `%${trimmedSearch}%`;
      params = [searchParam, searchParam];
      countParams = [searchParam, searchParam];
    }

    query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(PAGE_SIZE, offset);

    return new Promise((resolve) => {
      db.transaction(tx => {
        // 1. Get total count
        tx.executeSql(
          countQuery,
          countParams,
          (tx, countResults) => {
            const total = countResults.rows.item(0).total || 0;

            // Update search results count
            if (trimmedSearch) {
              setSearchResultsCount(total);
            }

            // 2. Fetch paginated contacts
            tx.executeSql(
              query,
              params,
              (tx, results) => {
                if (!isMounted.current) {
                  resolve();
                  return;
                }

                const rows = results.rows.raw();
                const mappedData = rows.map(item => {
                  const amount = parseFloat(item.amount) || 0;

                  return {
                    id: String(item.id),
                    name: item.name || 'নামহীন',
                    phone: item.phone_no || 'ফোন নম্বর নেই',
                    due: amount,
                    type: item.type || 'Customer',
                    status: item.status || 'active',
                    amount_type: item.amount_type || 'Due',
                    lastTransaction: formatLastTransaction(item.updated_at),
                  };
                });

                if (isLoadMore) {
                  setContactList(prev => [...prev, ...mappedData]);
                } else {
                  setContactList(mappedData);
                }

                // Check if there are more items
                const hasMoreItems = (offset + PAGE_SIZE) < total;
                setHasMore(hasMoreItems);

                setPage(pageNum);

                resolve();
              },
              (tx, error) => {
                console.error('Contacts query failed:', error.message);
                if (!isMounted.current) {
                  resolve();
                  return;
                }

                setContactList([]);
                setHasMore(false);
                resolve();
              }
            );
          },
          (tx, error) => {
            console.error('Count query failed:', error.message);
            if (!isMounted.current) {
              resolve();
              return;
            }

            setContactList([]);
            setHasMore(false);
            setSearchResultsCount(0);
            resolve();
          }
        );

        // 3. Calculate totals (only on initial load or refresh, not during search)
        if (!isLoadMore && !trimmedSearch) {
          tx.executeSql(
            `
            SELECT 
              COUNT(id) as total_contact,
              SUM(CASE 
                WHEN type='Customer' AND amount_type='Due' 
                THEN amount ELSE 0 
              END) AS clientsDue,
              SUM(CASE 
                WHEN (type='Supplier' AND amount_type='Due')
                THEN amount ELSE 0 
              END) AS supplierDue
            FROM clients
            `,
            [],
            (tx, results) => {
              if (!isMounted.current) return;

              const row = results.rows.item(0);
              setTotalClientDue(row.clientsDue || 0);
              setTotalSupplierDue(row.supplierDue || 0);
              setTotalContacts(row.total_contact || 0);
            },
            (tx, error) => {
              console.error('Totals query failed:', error.message);
            }
          );
        }
      });
    }).finally(() => {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        // Update filtered list when contacts are loaded
        if (isSelectionMode) {
          filterContactsForSelection(selectionSearchQuery);
        }
      }
    });
  }, [formatLastTransaction, isSelectionMode, selectionSearchQuery, filterContactsForSelection]);

  // Handle search input change with debounce
  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debouncing
    searchTimeoutRef.current = setTimeout(() => {
      // Reset to first page and fetch with search term
      setPage(1);
      setHasMore(true);
      fetchContacts(1, false, false, text);
    }, 300);
  }, [fetchContacts]);

  // Initial load
  useEffect(() => {
    isMounted.current = true;
    fetchContacts(1, false, false, '');
    fetchSimCards(); // Fetch SIM cards on mount

    // Cleanup on unmount
    return () => {
      isMounted.current = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (selectionSearchTimeoutRef.current) {
        clearTimeout(selectionSearchTimeoutRef.current);
      }
    };
  }, []);

  // Update filtered list when contactList changes or selection mode changes
  useEffect(() => {
    if (isSelectionMode) {
      filterContactsForSelection(selectionSearchQuery);
    }
  }, [contactList, isSelectionMode, selectionSearchQuery, filterContactsForSelection]);

  // Load more data
  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      fetchContacts(page + 1, false, true, searchQuery);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setPage(1);
    setHasMore(true);
    fetchContacts(1, true, false, searchQuery);
  };

  // Get avatar color based on name
  const getAvatarColor = useCallback((name) => {
    const colors = [
      '#4ECDC4', '#2EBCB2', '#1FABA1', '#0B8C82',
      '#4DD6CD', '#7DE3DC', '#9FEFE9', '#C9F9F6',
      '#0E6251', '#1C7C74', '#26A69A', '#38C6BB',
    ];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  }, []);

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResultsCount(0);
    setPage(1);
    setHasMore(true);

    // Clear any pending search timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    fetchContacts(1, false, false, '');
  };

  // Generate unique key for each item
  const getItemKey = useCallback((item, index) => {
    return `contact_${item.id}_${index}`;
  }, []);

  // Render contact item with checkbox in selection mode
  const renderContactItem = useCallback(({ item }) => {
    const avatarColor = getAvatarColor(item.name);
    const isSupplier = item.type === 'Supplier' || item.type === 'supplier';
    const typeColor = isSupplier ? colors.primary : colors.info;
    const indicatorColor = isSupplier ? colors.primary : colors.info;
    const isSelected = selectedContacts.has(item.id);

    let amountColor = colors.success;
    if (item.due !== 0) {
      amountColor = item.amount_type === "Due" ? colors.error : colors.success;
    }

    const handlePress = () => {
      if (isSelectionMode) {
        toggleContactSelection(item.id);
      } else {
        Keyboard.dismiss();
        navigation.navigate('SaleAndReceive', { clientId: item.id, clientName: item.name });
      }
    };

    const handleLongPress = () => {
      if (!isSelectionMode && item.phone !== 'ফোন নম্বর নেই') {
        setIsSelectionMode(true);
        toggleContactSelection(item.id);
      }
    };

    // Don't show contacts without phone numbers in selection mode
    if (isSelectionMode && item.phone === 'ফোন নম্বর নেই') {
      return null;
    }

    return (
      <TouchableOpacity
        style={[
          styles.contactCard,
          isSelected && styles.selectedContactCard
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        <View style={styles.contactCardContent}>
          {isSelectionMode && (
            <View style={styles.checkboxContainer}>
              <Checkbox
                status={isSelected ? 'checked' : 'unchecked'}
                onPress={() => toggleContactSelection(item.id)}
                color={colors.primary}
              />
            </View>
          )}

          <Avatar.Text
            size={50}
            label={item.name?.charAt(0)?.toUpperCase() || '?'}
            style={[styles.contactAvatar, { backgroundColor: avatarColor }]}
            labelStyle={styles.contactAvatarLabel}
          />

          <View style={styles.contactInfo}>
            <View style={styles.contactHeader}>
              <Text style={styles.contactName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.typeIndicatorContainer}>
                <View style={[styles.typeIndicator, { backgroundColor: indicatorColor }]} />
                <Text style={[styles.typeText, { color: typeColor }]}>
                  {isSupplier ? 'সাপ্লায়ার' : 'কাস্টমার'}
                </Text>
              </View>
            </View>

            <Text style={styles.contactPhone} numberOfLines={1}>
              {item.phone}
            </Text>

            <View style={styles.contactMeta}>
              <Text style={styles.contactMetaText} numberOfLines={1}>
                শেষ লেনদেন: {item.lastTransaction}
              </Text>
            </View>
          </View>

          <View style={styles.dueContainer}>
            <Text style={[styles.dueAmount, { color: amountColor }]}>
              ৳{(Number(item.due) || 0).toLocaleString('bn-BD')}
            </Text>
            <Text style={styles.dueLabel}>
              {item.due == 0
                ? "পরিশোধিত"
                : (item.amount_type == "Due" ? 'বাকি' : 'অগ্রিম')
              }
            </Text>
          </View>

          <IconButton
            icon="chevron-right"
            size={20}
            iconColor={colors.textPrimary}
            style={styles.contactArrow}
          />
        </View>
      </TouchableOpacity>
    );
  }, [getAvatarColor, isSelectionMode, selectedContacts, toggleContactSelection, navigation]);

  // Render footer for loading more
  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerText}>লোড হচ্ছে...</Text>
      </View>
    );
  };

  // Render empty state
  const renderEmptyList = () => {
    if (loading) return null;

    if (isSelectionMode) {
      return (
        <View style={styles.emptyContainer}>
          <IconButton
            icon="phone-off"
            size={48}
            iconColor={colors.primaryLight}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyText}>
            {selectionSearchQuery.trim()
              ? `"${selectionSearchQuery}" অনুসারে কোন কন্টাক্ট পাওয়া যায়নি`
              : 'ফোন নম্বর সহ কোন কন্টাক্ট নেই'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <IconButton
          icon="account-search"
          size={48}
          iconColor={colors.primaryLight}
          style={styles.emptyIcon}
        />
        <Text style={styles.emptyText}>
          {searchQuery.trim() ?
            `"${searchQuery}" অনুসারে কোন কাস্টমার পাওয়া যায়নি` :
            'কোন কাস্টমার যোগ করা হয়নি'}
        </Text>
      </View>
    );
  };

  // Render search header
  const renderSearchHeader = () => {
    if (searchQuery.trim() && !isSelectionMode) {
      return (
        <View style={styles.searchResultsHeader}>
          <Text style={styles.searchResultsTitle}>
            "{searchQuery}" অনুসারে ফলাফল ({searchResultsCount})
          </Text>
          <TouchableOpacity onPress={clearSearch} style={styles.clearSearchButton}>
            <Text style={styles.clearSearchText}>পরিষ্কার করুন</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
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

  // Render SMS progress modal
  const renderSmsProgressModal = () => (
    <Modal
      visible={smsModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => { }}
    >
      <View style={styles.smsModalOverlay}>
        <View style={styles.smsModalContainer}>
          <View style={styles.smsModalHeader}>
            <Text style={styles.smsModalTitle}>SMS পাঠানো হচ্ছে...</Text>
          </View>

          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.progressText}>
              {smsProgress.current} / {smsProgress.total}
            </Text>
            <Text style={styles.progressDetail}>
              {Math.round((smsProgress.current / smsProgress.total) * 100)}% সম্পন্ন
            </Text>
          </View>

          <View style={styles.simInfoContainer}>
            <Text style={styles.simInfoLabel}>SIM: </Text>
            <Text style={styles.simInfoValue}>
              {selectedSim?.displayName || 'নির্বাচন করুন'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
    Keyboard.dismiss();
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const handleLogout = () => {
    AsyncStorage.removeItem('user_info').then(() => {
      singOut();
    });
  };

  const handleTabPress = (tabId, navigateMenu) => {
    if (tabId === 'menu') {
      toggleDrawer();
    } else {
      navigation.navigate(navigateMenu)
      setActiveTab(tabId);
      Keyboard.dismiss();
    }
  };

  const isSearching = searchQuery.trim().length > 0;

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
        {/* Header */}
        <Appbar.Header style={{ backgroundColor: colors.primary }}>
          <Appbar.BackAction
            color="#fff"
            onPress={() => {
              navigation.navigate('Welcome')
            }}
          />
          <Appbar.Content
            title={isSelectionMode ? `${selectedContacts.size} টি নির্বাচিত` : (isSearching ? "খোঁজার ফলাফল" : "কাস্টমার/সাপ্লায়ার")}
            color="#fff"
          />

          {isSelectionMode ? (
            <>
              <Appbar.Action
                icon="check-all"
                color="#fff"
                onPress={selectAllContacts}
              />
              <Appbar.Action
                icon="close"
                color="#fff"
                onPress={toggleSelectionMode}
              />
            </>
          ) : (
            <>
              <Appbar.Action
                icon="message"
                color="#fff"
                onPress={() => setIsSelectionMode(true)}
              />
              <Appbar.Action
                icon="sim"
                color="#fff"
                onPress={() => setShowSimSelection(true)}
              />
              {isSearching && (
                <Appbar.Action
                  icon="close"
                  color="#fff"
                  onPress={clearSearch}
                />
              )}
            </>
          )}
        </Appbar.Header>

        {/* Selection Mode Search Bar */}
        {isSelectionMode && (
          <View style={styles.selectionSearchSection}>
            <Searchbar
              placeholder="নাম বা ফোন নম্বর দ্বারা খুঁজুন..."
              onChangeText={handleSelectionSearchChange}
              value={selectionSearchQuery}
              style={styles.selectionSearchBar}
              inputStyle={styles.searchInput}
              iconColor={colors.primary}
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.selectionInfo}>
              {filteredContactList.length} টি কন্টাক্ট (শুধুমাত্র ফোন নম্বর সহ)
            </Text>
          </View>
        )}

        {/* Selection Mode Footer */}
        {isSelectionMode && (
          <View style={styles.selectionFooter}>
            <View style={[styles.selectionInfo, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }]}>
              <Text style={[styles.selectionCount, { fontSize: 16, fontWeight: '600', color: colors.textPrimary }]}>
                {selectedContacts.size} টি নির্বাচিত
              </Text>
              <TouchableOpacity onPress={clearSelections}>
                <Text style={[styles.clearSelectionText, { fontSize: 14, color: colors.primary, fontWeight: '600' }]}>সব মুছুন</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.selectionActions}>
              <Button
                mode="contained"
                onPress={sendSmsToSelected}
                style={styles.sendSmsButton}
                labelStyle={styles.sendSmsButtonLabel}
                icon="message"
                disabled={selectedContacts.size === 0}
              >
                SMS
              </Button>
            </View>
          </View>
        )}

        {/* Drawer Component */}
        {/* <Drawer
          isOpen={drawerOpen}
          onClose={closeDrawer}
          userInfo={logedInUserInfo}
          navigation={navigation}
          onLogout={handleLogout}
          themeColors={colors}
        /> */}

        <Animated.View style={[
          styles.mainContent,
          drawerOpen && styles.mainContentShifted
        ]}>
          {/* Search Bar - Hide in selection mode */}
          {!isSelectionMode && (
            <View style={styles.fixedSearchSection}>
              <View style={styles.searchBarContainer}>
                <Searchbar
                  placeholder="নাম বা ফোন নম্বর দ্বারা খুঁজুন..."
                  onChangeText={handleSearchChange}
                  value={searchQuery}
                  style={styles.searchBar}
                  inputStyle={styles.searchInput}
                  iconColor={colors.primary}
                  placeholderTextColor="#999"
                  clearButtonMode="while-editing"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {loading && !refreshing && (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={styles.searchLoadingIndicator}
                  />
                )}
              </View>
            </View>
          )}

          {/* Contacts List */}
          <FlatList
            ref={flatListRef}
            data={isSelectionMode ? filteredContactList : contactList}
            renderItem={renderContactItem}
            keyExtractor={getItemKey}
            ListHeaderComponent={renderSearchHeader}
            contentContainerStyle={[
              styles.listContainer,
              (isSelectionMode ? filteredContactList.length === 0 : contactList.length === 0) && styles.emptyListContainer,
              isSelectionMode ? { paddingBottom: 180 } : { paddingBottom: 120 }
            ]}
            style={styles.contactsContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmptyList}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={Platform.OS === 'android'}
            keyboardShouldPersistTaps="handled"
          />
        </Animated.View>

        {/* SIM Selection Modal */}
        {renderSimSelectionModal()}

        {/* SMS Progress Modal */}
        {renderSmsProgressModal()}

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
      </SafeAreaView>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  mainContentShifted: {
    transform: [{ translateX: -width * 0.2 }],
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  fixedSearchSection: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomColor: '#e0e0e0',
    marginTop: 10
  },
  searchBarContainer: {
    position: 'relative',
  },
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    height: 48,
  },
  searchInput: {
    fontSize: 14,
  },
  searchLoadingIndicator: {
    position: 'absolute',
    right: 16,
    top: 12,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
    marginTop: 8,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  clearSearchButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primaryLightest,
    borderRadius: 8,
  },
  clearSearchText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  contactsContainer: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 40,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  selectedContactCard: {
    backgroundColor: colors.primaryLightest,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  contactCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    minHeight: 84,
  },
  checkboxContainer: {
    marginRight: 8,
  },
  contactAvatar: {
    marginRight: 12,
  },
  contactAvatarLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  contactInfo: {
    flex: 1,
    marginRight: 8,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A535C',
    flex: 1,
  },
  typeIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  typeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  contactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactMetaText: {
    fontSize: 12,
    color: '#888',
  },
  dueContainer: {
    alignItems: 'flex-end',
    marginRight: 8,
    minWidth: 80,
  },
  dueAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  dueLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  contactArrow: {
    margin: 0,
  },
  separator: {
    height: 8,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 1,
  },
  emptyIcon: {
    margin: 0,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: Platform.OS === 'ios' ? 90 : 70,
    zIndex: 1000,
  },
  // Selection Search Section
  selectionSearchSection: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectionSearchBar: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    height: 48,
    marginBottom: 8,
  },
  selectionInfo: {
    fontSize: 12,
    color: colors.textPrimary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Selection Footer
  selectionFooter: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  clearSelectionText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  selectionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sendSmsButton: {
    flex: 1,
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
  simLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  simLoadingText: {
    marginTop: 12,
    color: colors.textPrimary,
    fontSize: 14,
  },
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
  // SMS Progress Modal styles
  smsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smsModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  smsModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  smsModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  progressContainer: {
    alignItems: 'center',
    padding: 20,
  },
  progressText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 16,
  },
  progressDetail: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 8,
  },
  simInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLightest,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  simInfoLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  simInfoValue: {
    fontSize: 14,
    color: colors.primaryDark,
    marginLeft: 4,
  },
});

export default GroupTagada;