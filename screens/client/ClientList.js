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
} from 'react-native';
import {
  Card,
  Avatar,
  Text,
  FAB,
  Searchbar,
  IconButton,
  Appbar
} from 'react-native-paper';
import AuthContext from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openDatabase } from 'react-native-sqlite-storage';
const db = openDatabase({ name: 'lenden_boi.db', createFromLocation: 1 });
import moment from 'moment';
import Drawer from '../components/Drawer';
import BottomMenu from '../components/BottomMenu';

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

const ClientList = ({ route, navigation }) => {
  const { singOut, myToken, logedInUserInfo } = React.useContext(AuthContext);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('contacts');

  // State for contacts and pagination
  const [contactList, setContactList] = useState([]);
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

  // Ref for search timeout
  const searchTimeoutRef = useRef(null);
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

  // Fetch contacts with pagination - FIXED VERSION
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
      }
    });
  }, [formatLastTransaction]);

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

    // Cleanup on unmount
    return () => {
      isMounted.current = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

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

  // Render contact item
  const renderContactItem = useCallback(({ item }) => {
    const avatarColor = getAvatarColor(item.name);
    const isSupplier = item.type === 'Supplier' || item.type === 'supplier';
    const typeColor = isSupplier ? colors.primary : colors.info;
    const indicatorColor = isSupplier ? colors.primary : colors.info;

    let amountColor = colors.success;
    if (item.due !== 0) {
      amountColor = item.amount_type === "Due" ? colors.error : colors.success;
    }

    return (
      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => {
          Keyboard.dismiss();
          // navigation.navigate('ClientDetails', { clientId: item.id });
          navigation.navigate('SaleAndReceive', { clientId: item.id, clientName: item.name });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.contactCardContent}>
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
  }, [getAvatarColor]);

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
    if (searchQuery.trim()) {
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
            title={isSearching ? "খোঁজার ফলাফল" : "কাস্টমার/সাপ্লায়ার"}
            color="#fff"
          />
          {isSearching && (
            <Appbar.Action
              icon="close"
              color="#fff"
              onPress={clearSearch}
            />
          )}
        </Appbar.Header>

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
          drawerOpen && styles.mainContentShifted
        ]}>
          {/* Search Bar */}
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

          {/* Contacts List */}
          <FlatList
            ref={flatListRef}
            data={contactList}
            renderItem={renderContactItem}
            keyExtractor={getItemKey}
            ListHeaderComponent={renderSearchHeader}
            contentContainerStyle={[
              styles.listContainer,
              contactList.length === 0 && styles.emptyListContainer,
              { paddingBottom: 120 } // Add extra scroll height here
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

          {/* Add Client FAB - Hide during search */}
          {!isSearching && (
            <FAB
              icon="plus"
              style={[styles.fab, { backgroundColor: colors.primary }]}
              color="#fff"
              onPress={() => navigation.navigate('AddClient')}
            />
          )}

          {/* Bottom Menu - Hide during search */}
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
});

export default ClientList