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
} from 'react-native';
import {
  Card,
  Avatar,
  Text,
  FAB,
  Searchbar,
  IconButton,
} from 'react-native-paper';
import AuthContext from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openDatabase } from 'react-native-sqlite-storage';
const db = openDatabase({ name: 'lenden_boi.db', createFromLocation: 1 });
import moment from 'moment';
import Drawer from './components/Drawer';
import BottomMenu from './components/BottomMenu';

const { width, height } = Dimensions.get('window');

const Welcome = ({ navigation }) => {
  const { singOut, myToken, logedInUserInfo } = React.useContext(AuthContext);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAdBanner, setShowAdBanner] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [contactList, setContactList] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchBarRef = useRef(null);
  const flatListRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const [totalClient, setTotalClient] = useState(0)
  const [totalClientDue, setTotalClientDue] = useState(0)
  const [totalSupplierDue, setTotalSupplierDue] = useState(0)

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

  const findLastTransaction = useCallback((date) => {
    if (!date) return 'কোনো লেনদেন নেই';

    try {
      const today = moment();
      const inputDate = moment(date);

      if (!inputDate.isValid()) return 'তারিখ অকার্যকর';

      const diffInDays = today.diff(inputDate, 'days');
      const diffInMonths = today.diff(inputDate, 'months');
      const diffInYears = today.diff(inputDate, 'years');

      if (diffInDays === 0) return 'আজ';
      if (diffInDays === 1) return 'গতকাল';
      if (diffInDays <= 30) return `${diffInDays} দিন আগে`;
      if (diffInMonths === 1) return '১ মাস আগে';
      if (diffInMonths <= 12) return `${diffInMonths} মাস আগে`;
      if (diffInYears === 1) return '১ বছর আগে';
      if (diffInYears > 1) return `${diffInYears} বছর আগে`;

      return inputDate.format('DD-MM-YYYY');
    } catch (error) {
      console.error('Error in findLastTransaction:', error);
      return 'তারিখ প্রক্রিয়াকরণে ত্রুটি';
    }
  }, []);

  // Fetch last 100 clients
  const fetchLast100Contacts = useCallback((isRefresh = false) => {
    if (loading && !isRefresh) return;

    setLoading(true);
    setRefreshing(isRefresh);

    db.transaction(tx => {
      // =========================
      // 1. Fetch last 100 clients for UI
      // =========================
      tx.executeSql(
        'SELECT * FROM clients ORDER BY updated_at DESC LIMIT 100',
        [],
        (tx, results) => {
          const rows = results.rows.raw();
          console.log(rows)

          const mappedData = rows.map(item => {
            const amount = parseFloat(item.amount) || 0;

            return {
              id: item.id,
              name: item.name || 'নামহীন',
              phone: item.phone_no || 'ফোন নম্বর নেই',
              due: amount,
              type: item.type || 'Customer',
              status: item.status || 'active',
              amount_type: item.amount_type || 'Due',
              lastTransaction: findLastTransaction(item.updated_at),
            };
          });

          setContactList(mappedData);
        },
        (tx, error) => {
          console.error('List query failed:', error.message);
        }
      );

      // =========================
      // 2. Calculate totals from ALL clients
      // =========================
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
          const row = results.rows.item(0);

          console.log(row.clientsDue, row.supplierDue, row.total_contact)

          setTotalClientDue(row.clientsDue || 0);
          setTotalSupplierDue(row.supplierDue || 0);
          setTotalClient(row.total_contact || 0);
        },
        (tx, error) => {
          console.error('Totals query failed:', error.message);
        }
      );
    });

    setLoading(false);
    setRefreshing(false);
  }, [loading, findLastTransaction]);


  // Search function with debounce (on key up)
  const searchContacts = useCallback((searchText) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setSearchLoading(true);

    searchTimeoutRef.current = setTimeout(() => {
      if (searchText.trim() === '') {
        setFilteredContacts(contactList);
        setSearchLoading(false);
        return;
      }

      let sqlQuery = 'SELECT * FROM clients';
      let queryParams = [];

      if (searchText.trim() !== '') {
        // Search in entire database for name or phone number
        sqlQuery += ' WHERE name LIKE ? OR phone_no LIKE ?';
        const searchParam = `%${searchText}%`;
        queryParams = [searchParam, searchParam];
      }

      sqlQuery += ' ORDER BY updated_at DESC LIMIT 100';

      db.transaction(tx => {
        tx.executeSql(
          sqlQuery,
          queryParams,
          (tx, results) => {
            const clients = results.rows.raw();
            const data = clients.map(item => ({
              id: item.id,
              name: item.name || 'নামহীন',
              phone: item.phone_no || 'ফোন নম্বর নেই',
              due: parseFloat(item.amount) || 0,
              type: item.type || 'customer',
              status: item.status || 'active',
              amount_type: item.amount_type || 'Due',
              lastTransaction: findLastTransaction(item.updated_at)
            }));

            setFilteredContacts(data);
            setSearchLoading(false);
          },
          (tx, error) => {
            console.error('Search query failed:', error.message);
            setSearchLoading(false);
          },
        );
      });
    }, 300); // 300ms debounce for on-key-up search
  }, [contactList, findLastTransaction]);

  useEffect(() => {
    fetchLast100Contacts(true); // Initial load
  }, []);

  // Handle search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setIsSearching(false);
      setFilteredContacts(contactList);
      return;
    }

    setIsSearching(true);
    searchContacts(searchQuery);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, contactList, searchContacts]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLast100Contacts(true);
  }, [fetchLast100Contacts]);

  const quickActions = [
    { id: 1, url: 'ShortageList', icon: 'alert', label: 'শর্টেজ লিস্ট', color: colors.error, bgColor: '#FFEBEE' },
    { id: 2, url: 'GroupTagada', icon: 'bell-ring', label: 'গ্রুপ তাগাদা', color: colors.info, bgColor: '#E3F2FD' },
    { id: 3, url: 'BackupRestore', icon: 'backup-restore', label: 'ডাটা ব্যাকআপ', color: colors.primary, bgColor: colors.primaryLightest },
    { id: 4, url: 'ExpenseList', icon: 'currency-bdt', label: 'খরচ', color: colors.warning, bgColor: '#FFF3E0' },
  ];

  const handleLogout = () => {
    AsyncStorage.removeItem('user_info').then(() => {
      singOut();
    });
  };

  const handleSearchFocus = () => {
    setIsSearching(true);
  };

  const handleSearchBlur = () => {
    if (searchQuery === '') {
      setIsSearching(false);
    }
  };

  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
    if (text.trim() !== '') {
      setIsSearching(true);
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearching(false);
    Keyboard.dismiss();
    setFilteredContacts(contactList);
  }, [contactList]);

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

  const handleTabPress = (tabId, navigateMenu) => {
    if (tabId === 'menu') {
      toggleDrawer();
    } else if (navigateMenu) {
      navigation.navigate(navigateMenu);
      setActiveTab(tabId);
    }
    Keyboard.dismiss();
  };

  const supplierCount = useMemo(() =>
    contactList.filter(contact => contact.type === 'supplier').length,
    [contactList]
  );

  const customerCount = useMemo(() =>
    contactList.filter(contact => contact.type === 'customer').length,
    [contactList]
  );

  const headerBackground = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [colors.primary, colors.primaryDark],
    extrapolate: 'clamp',
  });

  const renderContactItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => {
        Keyboard.dismiss();
        navigation.navigate('SaleAndReceive', { clientId: item.id, clientName: item.name });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.contactCardContent}>
        <Avatar.Text
          size={50}
          label={item.name?.charAt(0) || '?'}
          style={[
            styles.contactAvatar,
            item.type === 'supplier'
              ? { backgroundColor: colors.primaryLight }
              : { backgroundColor: colors.info }
          ]}
          labelStyle={styles.contactAvatarLabel}
        />

        <View style={styles.contactInfo}>
          <View style={styles.contactHeader}>
            <Text style={styles.contactName} numberOfLines={1}>
              {item.name}
              <View style={{ paddingLeft: 5, paddingBottom: 5 }}>
                <View style={[
                  styles.typeIndicator,
                  item.type === 'supplier'
                    ? { backgroundColor: colors.primary }
                    : ''
                ]} />
              </View>
            </Text>

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
          <Text style={[
            styles.dueAmount,
            item.due == 0
              ? { color: colors.success }
              : (item.amount_type == "Due"
                ? { color: colors.error }
                : { color: colors.success }
              )
          ]}>
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
  ), []);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  const getItemLayout = useCallback((data, index) => ({
    length: 84,
    offset: 84 * index,
    index,
  }), []);

  const ItemSeparator = useCallback(() => (
    <View style={styles.separator} />
  ), []);

  const ListFooterComponent = useCallback(() => {
    if (searchQuery.trim() !== '' || !loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerText}>লোড হচ্ছে...</Text>
      </View>
    );
  }, [loading, searchQuery]);

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <IconButton
        icon="magnify"
        size={48}
        iconColor={colors.textPrimary}
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
        {searchQuery ? `"${searchQuery}" এর জন্য কোনো ফলাফল পাওয়া যায়নি` : 'কোনো কন্টাক্ট নেই'}
      </Text>
    </View>
  ), [searchQuery]);

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <View style={styles.quickActionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.quickActionItem}
            onPress={() => navigation.navigate(action.url)}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: action.bgColor }]}>
              <IconButton
                icon={action.icon}
                iconColor={action.color}
                size={22}
                style={styles.quickActionIconButton}
              />
            </View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const AdBanner = () => (
    <View style={styles.adBanner}>
      <View style={styles.adContent}>
        <View style={[styles.adIcon, { backgroundColor: colors.primaryLightest }]}>
          <IconButton
            icon="star"
            iconColor={colors.primary}
            size={24}
            style={styles.adIconButton}
          />
        </View>
        <View style={styles.adTextContainer}>
          <Text style={styles.adTitle}>প্রিমিয়াম সংস্করণ</Text>
          <Text style={styles.adDescription}>আরও ফিচার আনলক করুন</Text>
        </View>
        <TouchableOpacity style={[styles.adButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.adButtonText}>আপগ্রেড</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.adCloseButton}
        onPress={() => setShowAdBanner(false)}
      >
        <IconButton
          icon="close"
          size={16}
          iconColor={colors.textPrimary}
          style={styles.closeIcon}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

        {/* Drawer Component */}
        <Drawer
          isOpen={drawerOpen}
          onClose={closeDrawer}
          userInfo={logedInUserInfo}
          navigation={navigation}
          onLogout={handleLogout}
          themeColors={colors}
        />

        <Animated.View style={[
          styles.mainContent,
          drawerOpen
        ]}>
          <Animated.View style={[styles.headerBackground, { backgroundColor: headerBackground }]} />

          <View style={styles.header}>

            <View style={styles.headerContent}>
              <Avatar.Icon
                size={50}
                icon="store"
                style={[styles.avatar, { backgroundColor: colors.primaryLight }]}
                color="#fff"
              />
              <View style={styles.headerTextContainer}>
                <Text style={styles.greeting}>স্বাগতম!</Text>
                <Text style={styles.subtitle}>আপনার ব্যবসায়িক সমাধান</Text>
              </View>
            </View>

            <IconButton
              icon="logout"
              iconColor="#fff"
              size={24}
              onPress={() => navigation.navigate('Schema')}
            />
          </View>

          {!isSearching && (
            <>
              <View style={styles.statsContainer}>
                <Card style={[styles.statCard, { marginRight: 6 }]}>
                  <Card.Content style={styles.statContent}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <IconButton
                          icon="account-group"
                          iconColor={colors.primary}
                          size={18}
                          style={{ margin: 0, padding: 0, marginRight: 4 }}
                        />
                        <Text style={styles.statLabel}>সাপ্লাইয়ার পাবে</Text>
                      </View>
                      <Text style={[styles.statNumber, { color: colors.textPrimary, textAlign: 'right' }]}>
                        ৳{Number(totalSupplierDue || 0).toLocaleString('bn-BD')}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>

                <Card style={[styles.statCard, { marginLeft: 6 }]}>
                  <Card.Content style={styles.statContent}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <IconButton
                          icon="account"
                          iconColor={colors.warning}
                          size={20}
                          style={{ margin: 0, padding: 0, marginRight: 4 }}
                        />
                        <Text style={styles.statLabel}>কাস্টমারের বাকি</Text>
                      </View>
                      <Text style={[styles.statNumber, { color: colors.textPrimary, textAlign: 'right' }]}>
                        ৳{Number(totalClientDue || 0).toLocaleString('bn-BD')}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              </View>

              <View style={styles.quickActionsWrapper}>
                {renderQuickActions()}
              </View>
            </>
          )}

          {!isSearching && showAdBanner && (
            <View style={styles.bannerContainer}>
              <AdBanner />
            </View>
          )}

          <View style={styles.fixedSearchSection}>
            <View style={styles.searchBarContainer}>
              <Searchbar
                ref={searchBarRef}
                placeholder="নাম বা ফোন নম্বর সার্চ করুন..."
                onChangeText={handleSearchChange}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                value={searchQuery}
                style={styles.searchBar}
                inputStyle={styles.searchInput}
                iconColor={colors.primary}
                placeholderTextColor="#999"
                elevation={1}
                returnKeyType="search"
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                }}
                icon={searchQuery ? "close" : "magnify"}
                onIconPress={() => {
                  if (searchQuery) {
                    handleClearSearch();
                  } else {
                    if (searchBarRef.current) {
                      searchBarRef.current.focus();
                    }
                  }
                }}
                right={null}
              />
              {searchLoading && (
                <View style={styles.searchLoadingIndicator}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </View>
          </View>

          <View style={styles.contactsContainer}>
            <Text style={styles.searchResultsTitle}>
              {isSearching ? 'খুঁজে পাওয়া গেছে' : 'সকল'} কন্টাক্ট
              ({isSearching ? filteredContacts.length : totalClient})
            </Text>

            <FlatList
              ref={flatListRef}
              data={filteredContacts}
              renderItem={renderContactItem}
              keyExtractor={keyExtractor}
              getItemLayout={getItemLayout}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={21}
              removeClippedSubviews={Platform.OS === 'android'}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={ItemSeparator}
              ListFooterComponent={ListFooterComponent}
              ListEmptyComponent={ListEmptyComponent}
              onRefresh={handleRefresh}
              refreshing={refreshing}
              contentContainerStyle={[
                styles.listContainer,
                filteredContacts.length === 0 && styles.emptyListContainer,
                { paddingBottom: 120 } // Add extra scroll height here
              ]}
            />
          </View>

          {!isSearching && (
            <FAB
              icon="account-plus"
              label={'নতুন যোগ করুন'}
              style={[styles.fab, { backgroundColor: colors.primary }]}
              onPress={() => {
                Keyboard.dismiss();
                navigation.navigate('AddClient')
              }}
              color="#fff"
            />
          )}

          {!isSearching && (
            <BottomMenu
              activeTab={activeTab}
              onTabPress={handleTabPress}
              themeColors={colors}
            />
          )}
        </Animated.View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

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
  menuButton: {
    marginLeft: -8,
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: width * 0.8,
    maxWidth: 320,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 16,
  },
  drawerHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
    position: 'relative',
  },
  drawerHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  drawerUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  drawerUserEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  drawerUserBusiness: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  drawerCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 45 : 15,
    right: 8,
  },
  drawerContent: {
    flex: 1,
  },
  drawerSection: {
    paddingVertical: 8,
  },
  drawerSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  drawerItemIcon: {
    margin: 0,
    marginRight: 12,
  },
  drawerItemLabel: {
    fontSize: 16,
    color: '#1A535C',
    fontWeight: '500',
  },
  drawerLogoutItem: {
    backgroundColor: '#FFEBEE',
    marginTop: 8,
  },
  drawerDivider: {
    marginVertical: 8,
    marginHorizontal: 16,
    height: 1,
  },
  versionContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#666',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Keep this for the icon button alignment
    zIndex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'left',
  },
  avatar: {
    marginRight: 12,
  },
  headerTextContainer: {
    flexDirection: 'column',
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 10,
    marginTop: -30,
    zIndex: 1,
  },
  statCard: {
    flex: 1,
    elevation: 3,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  quickActionsWrapper: {
    marginHorizontal: 16,
    marginBottom: 10,
    position: 'relative',
    zIndex: 2,
  },
  quickActionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 9,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 9,
  },
  quickActionItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 70,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickActionIconButton: {
    margin: 0,
  },
  quickActionLabel: {
    fontSize: 11,
    color: '#1A535C',
    textAlign: 'center',
    fontWeight: '500',
  },
  bannerContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  adBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    position: 'relative',
  },
  adContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adIcon: {
    borderRadius: 8,
    padding: 4,
    marginRight: 12,
  },
  adIconButton: {
    margin: 0,
  },
  adTextContainer: {
    flex: 1,
  },
  adTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A535C',
    marginBottom: 2,
  },
  adDescription: {
    fontSize: 12,
    color: '#666',
  },
  adButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  adButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  adCloseButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 1,
  },
  closeIcon: {
    margin: 0,
  },
  fixedSearchSection: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    zIndex: 10,
  },
  searchBarContainer: {
    position: 'relative',
  },
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
  },
  searchInput: {
    fontSize: 14,
  },
  searchLoadingIndicator: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  contactsContainer: {
    flex: 1,
    paddingHorizontal: 16
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A535C',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  contactCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    minHeight: 84,
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
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A535C',
    marginRight: 8,
    flex: 1,
  },
  typeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    marginTop: 20,
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
});

export default Welcome;