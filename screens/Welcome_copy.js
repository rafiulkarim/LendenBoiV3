import React, { useState, useRef, useEffect, useMemo, useCallback, useDebounce } from 'react';
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
  ScrollView
} from 'react-native';
import {
  Card,
  Avatar,
  Text,
  FAB,
  useTheme,
  Searchbar,
  IconButton,
  Divider,
} from 'react-native-paper';
import AuthContext from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openDatabase } from 'react-native-sqlite-storage';
const db = openDatabase({ name: 'lenden_boi.db', createFromLocation: 1 });
import moment from 'moment';

const { width, height } = Dimensions.get('window');

const Welcome = ({ navigation }) => {
  const { singOut, myToken, logedInUserInfo } = React.useContext(AuthContext);
  const [visibleMenu, setVisibleMenu] = useState(null);
  const [showAdBanner, setShowAdBanner] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [contactList, setContactList] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const theme = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchBarRef = useRef(null);
  const drawerAnimation = useRef(new Animated.Value(width)).current;
  const flatListRef = useRef(null);
  const searchTimeoutRef = useRef(null);

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

  const fetchAllContacts = useCallback((searchText = '') => {
    setSearchLoading(true);

    let sqlQuery = 'SELECT * FROM clients';
    let queryParams = [];

    if (searchText.trim() !== '') {
      // Search in entire database for name or phone number
      sqlQuery += ' WHERE name LIKE ? OR phone_no LIKE ?';
      const searchParam = `%${searchText}%`;
      queryParams = [searchParam, searchParam];
    }

    sqlQuery += ' ORDER BY updated_at DESC LIMIT 30';

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
            lastTransaction: findLastTransaction(item.updated_at)
          }));

          if (searchText.trim() === '') {
            setContactList(data);
          }
          setFilteredContacts(data);
          setSearchLoading(false);
        },
        (tx, error) => {
          console.error('Search query failed:', error.message);
          setSearchLoading(false);
        },
      );
    });
  }, [findLastTransaction]);

  const fetchContacts = useCallback((pageNum = 0, isRefresh = false) => {
    if ((loading && !isRefresh) || (!isRefresh && !hasMore)) return;

    setLoading(true);
    const limit = 30;
    const offset = pageNum * limit;

    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM clients ORDER BY updated_at DESC LIMIT ? OFFSET ?',
        [limit, offset],
        (tx, results) => {
          const clients = results.rows.raw();

          if (clients.length === 0) {
            setHasMore(false);
          } else {
            const data = clients.map(item => ({
              id: item.id,
              name: item.name || 'নামহীন',
              phone: item.phone_no || 'ফোন নম্বর নেই',
              due: parseFloat(item.amount) || 0,
              type: item.type || 'customer',
              status: item.status || 'active',
              lastTransaction: findLastTransaction(item.updated_at)
            }));

            if (isRefresh) {
              setContactList(data);
              setPage(1);
            } else {
              setContactList(prev => [...prev, ...data]);
              setPage(prev => prev + 1);
            }

            if (clients.length < limit) {
              setHasMore(false);
            }
          }

          setLoading(false);
          setRefreshing(false);
        },
        (tx, error) => {
          console.error('Query failed:', error.message);
          setLoading(false);
          setRefreshing(false);
        },
      );
    });
  }, [loading, hasMore, findLastTransaction]);

  useEffect(() => {
    fetchContacts(0, true); // Initial load
  }, []);

  // Search function with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim() === '') {
      setIsSearching(false);
      setFilteredContacts(contactList);
      return;
    }

    setIsSearching(true);

    // Debounce search by 300ms to avoid too many database queries
    searchTimeoutRef.current = setTimeout(() => {
      fetchAllContacts(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, contactList, fetchAllContacts]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    fetchContacts(0, true);
  }, [fetchContacts]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore && searchQuery.trim() === '') {
      fetchContacts(page);
    }
  }, [loading, hasMore, page, fetchContacts, searchQuery]);

  const quickActions = [
    { id: 1, icon: 'alert', label: 'শর্টেজ লিস্ট', color: colors.error, bgColor: '#FFEBEE' },
    { id: 2, icon: 'bell-ring', label: 'গ্রুপ তাগাদা', color: colors.info, bgColor: '#E3F2FD' },
    { id: 3, icon: 'backup-restore', label: 'ডাটা ব্যাকআপ', color: colors.primary, bgColor: colors.primaryLightest },
    { id: 4, icon: 'currency-bdt', label: 'খরচ', color: colors.warning, bgColor: '#FFF3E0' },
  ];

  const bottomTabs = [
    { id: 'home', label: 'হোম', icon: 'home-outline', activeIcon: 'home' },
    { id: 'contacts', label: 'কাস্টমার', icon: 'account-multiple-outline', activeIcon: 'account-multiple' },
    { id: 'reports', label: 'রিপোর্ট', icon: 'chart-bar', activeIcon: 'chart-bar' },
    { id: 'menu', label: 'মেনু', icon: 'menu', activeIcon: 'menu' },
  ];

  const Logout = () => {
    setTimeout(() => {
      AsyncStorage.removeItem('user_info');
      singOut();
    }, 3000);
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
    if (drawerOpen) {
      Animated.timing(drawerAnimation, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setDrawerOpen(false);
      });
    } else {
      setDrawerOpen(true);
      Animated.timing(drawerAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnimation, {
      toValue: width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setDrawerOpen(false);
    });
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

  const handleTabPress = (tabId) => {
    if (tabId === 'menu') {
      toggleDrawer();
    } else if (tabId === 'reports') {
      // Handle reports
    } else {
      setActiveTab(tabId);
      Keyboard.dismiss();
    }
  };

  const renderContactItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => {
        Keyboard.dismiss();
        // navigation.navigate('ClientDetails', { clientId: item.id });
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
              <View style={{paddingLeft: 5, paddingBottom: 5}}>
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
            item.due > 0 ? { color: colors.error } : { color: colors.success }
          ]}>
            ৳{(Number(item.due) || 0).toLocaleString('bn-BD')}
          </Text>
          <Text style={styles.dueLabel}>
            {item.due > 0 ? 'বাকি' : 'পরিশোধিত'}
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

  const CustomDrawer = () => {
    if (!drawerOpen) return null;

    return (
      <View style={styles.drawerOverlay}>
        <TouchableOpacity
          style={styles.drawerBackdrop}
          activeOpacity={1}
          onPress={closeDrawer}
        />

        <Animated.View
          style={[
            styles.drawerContainer,
            {
              transform: [{ translateX: drawerAnimation }]
            }
          ]}
        >
          <View style={[styles.drawerHeader, { backgroundColor: colors.primary }]}>
            <View style={styles.drawerHeaderContent}>
              <Avatar.Icon
                size={60}
                icon="account-circle"
                style={{ backgroundColor: colors.primaryLight }}
                color="#fff"
              />
              <View style={styles.drawerHeaderText}>
                <Text style={styles.drawerUserName}>
                  {logedInUserInfo?.name || 'ব্যবহারকারী'}
                </Text>
                <Text style={styles.drawerUserEmail}>
                  {logedInUserInfo?.email || 'user@example.com'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={closeDrawer}
              style={styles.drawerCloseButton}
            >
              <IconButton icon="close" iconColor="#fff" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.drawerContent}>
            <View style={styles.drawerSection}>
              <Text style={styles.drawerSectionTitle}>মেনু</Text>
            </View>

            <Divider style={styles.drawerDivider} />

            <TouchableOpacity
              style={styles.drawerLogoutItem}
              onPress={() => {
                closeDrawer();
                Logout();
              }}
            >
              <IconButton
                icon="logout"
                iconColor={colors.error}
                size={24}
                style={styles.drawerItemIcon}
              />
              <Text style={[styles.drawerItemLabel, { color: colors.error }]}>
                লগ আউট
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <View style={styles.quickActionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.quickActionItem}
            onPress={() => console.log(action.label)}
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

  const BottomMenu = () => (
    <View style={styles.bottomMenu}>
      {bottomTabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.bottomMenuItem}
          onPress={() => handleTabPress(tab.id)}
          activeOpacity={0.7}
        >
          <IconButton
            icon={activeTab === tab.id ? tab.activeIcon : tab.icon}
            size={24}
            iconColor={activeTab === tab.id ? colors.primary : colors.textPrimary}
            style={styles.bottomMenuIcon}
          />
          <Text style={[
            styles.bottomMenuLabel,
            { color: activeTab === tab.id ? colors.primary : colors.textPrimary }
          ]}>
            {tab.label}
          </Text>

          {activeTab === tab.id && (
            <View style={styles.activeTabIndicator} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

        <CustomDrawer />

        <Animated.View style={[
          styles.mainContent,
          drawerOpen && styles.mainContentShifted
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
                    <IconButton icon="account-group" iconColor={colors.primary} size={24} />
                    <View>
                      <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{supplierCount}</Text>
                      <Text style={styles.statLabel}>সাপ্লাইয়ার</Text>
                    </View>
                  </Card.Content>
                </Card>
                <Card style={[styles.statCard, { marginLeft: 6 }]}>
                  <Card.Content style={styles.statContent}>
                    <IconButton icon="account" iconColor={colors.warning} size={24} />
                    <View>
                      <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{customerCount}</Text>
                      <Text style={styles.statLabel}>কাস্টমার</Text>
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
              {isSearching ? 'খুঁজে পাওয়া গেছে' : 'সকল'} কন্টাক্ট ({filteredContacts.length})
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
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              onRefresh={handleRefresh}
              refreshing={refreshing}
              contentContainerStyle={[
                styles.listContainer,
                filteredContacts.length === 0 && styles.emptyListContainer
              ]}
            />
          </View>

          {!isSearching && showAdBanner && (
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

          {!isSearching && showAdBanner && (
            <BottomMenu />
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
    marginBottom: 4,
  },
  drawerUserEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
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
  },
  drawerItemActive: {
    backgroundColor: '#E6F7F7',
  },
  drawerItemIcon: {
    margin: 0,
    marginRight: 12,
  },
  drawerItemLabel: {
    fontSize: 16,
    color: '#1A535C',
  },
  drawerDivider: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  drawerLogoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
    marginHorizontal: 16,
    marginBottom: 16,
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
    justifyContent: 'space-between',
    zIndex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingHorizontal: 16,
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
  bottomMenu: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 100,
  },
  bottomMenuItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  bottomMenuIcon: {
    margin: 0,
  },
  bottomMenuLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  activeTabIndicator: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 3,
    backgroundColor: '#00A8A8',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});

export default Welcome;