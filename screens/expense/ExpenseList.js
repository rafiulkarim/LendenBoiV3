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
  RefreshControl,
  FlatList
} from 'react-native';
import {
  Appbar,
  Text,
  TextInput,
  HelperText,
  Button,
  Portal,
  Dialog,
  Provider,
  Snackbar,
  Chip,
  Searchbar,
  Menu,
  IconButton,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { openDatabase } from 'react-native-sqlite-storage';
import AuthContext from '../../context/AuthContext';
import moment from 'moment';
import 'moment/locale/bn';
import { IdGenerator } from '../../Helpers/Generator/IdGenerator';
import DateTimePicker from '@react-native-community/datetimepicker';

// Set moment locale to Bengali
moment.locale('bn');

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
  info: '#17a2b8',
  background: '#f8f9fa',
  surface: '#ffffff',
  textPrimary: '#1A535C',
  textSecondary: '#6c757d',
  border: '#dee2e6',
};

// Pagination constants
const PAGE_SIZE = 20;

const ExpenseList = ({ navigation }) => {
  const { logedInUserInfo } = React.useContext(AuthContext);

  // State
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  // Form state
  const [formVisible, setFormVisible] = useState(false);
  const [editFormVisible, setEditFormVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    amount: '',
    date: new Date(),
  });

  const [editFormData, setEditFormData] = useState({
    id: '',
    title: '',
    amount: '',
    date: new Date(),
  });

  // Validation errors
  const [errors, setErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    type: 'info',
  });

  // Summary stats
  const [summary, setSummary] = useState({
    total: 0,
    today: 0,
    week: 0,
    month: 0,
  });

  // Filter options
  const filterOptions = [
    { label: 'সব খরচ', value: 'all', icon: 'format-list-bulleted' },
    { label: 'আজ', value: 'today', icon: 'calendar-today' },
    { label: 'গতকাল', value: 'yesterday', icon: 'calendar-arrow-left' },
    { label: 'এই সপ্তাহ', value: 'week', icon: 'calendar-week' },
    { label: 'এই মাস', value: 'month', icon: 'calendar-month' },
    { label: 'এই বছর', value: 'year', icon: 'calendar' },
  ];

  // Sort options
  const sortOptions = [
    { label: 'নতুন প্রথম', value: 'date_desc', icon: 'sort-calendar-descending' },
    { label: 'পুরাতন প্রথম', value: 'date_asc', icon: 'sort-calendar-ascending' },
    { label: 'সবচেয়ে বেশি', value: 'amount_desc', icon: 'sort-numeric-descending' },
    { label: 'সবচেয়ে কম', value: 'amount_asc', icon: 'sort-numeric-ascending' },
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    calculateSummary();
  }, [expenses]);

  // Load initial data
  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([
      loadExpenses(1, true, filterType, sortBy, searchQuery),
      loadTotalCount(filterType, searchQuery),
    ]);
    setLoading(false);
  };

  // Get WHERE clause based on filters
  const getWhereClause = (type, search = '') => {
    let whereClause = `WHERE shop_id = '${logedInUserInfo?.shop[0]?.id}'`;

    switch (type) {
      case 'today': {
        const today = moment().locale('en').format('YYYY-MM-DD');
        whereClause += ` AND date(date) = '${today}'`;
        break;
      }
      case 'yesterday': {
        const yesterday = moment().locale('en').subtract(1, 'day').format('YYYY-MM-DD');
        whereClause += ` AND date(date) = '${yesterday}'`;
        break;
      }
      case 'week': {
        // Use clone() to avoid mutating the moment object
        const weekStart = moment().clone().locale('en').startOf('isoWeek').format('YYYY-MM-DD');
        const weekEnd = moment().clone().locale('en').endOf('isoWeek').format('YYYY-MM-DD');
        whereClause += ` AND date(date) BETWEEN '${weekStart}' AND '${weekEnd}'`;
        break;
      }
      case 'month': {
        const monthStart = moment().clone().locale('en').startOf('month').format('YYYY-MM-DD');
        const monthEnd = moment().clone().locale('en').endOf('month').format('YYYY-MM-DD');
        whereClause += ` AND date(date) BETWEEN '${monthStart}' AND '${monthEnd}'`;
        break;
      }
      case 'year': {
        const yearStart = moment().clone().locale('en').startOf('year').format('YYYY-MM-DD');
        const yearEnd = moment().clone().locale('en').endOf('year').format('YYYY-MM-DD');
        whereClause += ` AND date(date) BETWEEN '${yearStart}' AND '${yearEnd}'`;
        break;
      }
      default:
        break;
    }

    if (search.trim()) {
      whereClause += ` AND title LIKE '%${search}%'`;
    }

    return whereClause;
  };

  // Get ORDER BY clause based on sort option
  const getOrderClause = (sort) => {
    switch (sort) {
      case 'date_asc':
        return 'ORDER BY date ASC, created_at ASC';
      case 'amount_desc':
        return 'ORDER BY amount DESC, date DESC';
      case 'amount_asc':
        return 'ORDER BY amount ASC, date DESC';
      default:
        return 'ORDER BY date DESC, created_at DESC';
    }
  };

  // ─── FIX: loadExpenses now accepts the latest filter/sort/search values ─────
  const loadExpenses = (
    pageNum = 1,
    reset = false,
    currentFilterType = filterType,
    currentSortBy = sortBy,
    currentSearchQuery = searchQuery,
  ) => {
    return new Promise((resolve) => {
      const offset = (pageNum - 1) * PAGE_SIZE;
      const whereClause = getWhereClause(currentFilterType, currentSearchQuery);
      const orderClause = getOrderClause(currentSortBy);

      const query = `
        SELECT * FROM expenses 
        ${whereClause} 
        ${orderClause} 
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `;

      db.transaction((tx) => {
        tx.executeSql(
          query,
          [],
          (_, results) => {
            const rows = results.rows;
            let expensesData = [];
            for (let i = 0; i < rows.length; i++) {
              expensesData.push(rows.item(i));
            }

            setExpenses(prev => reset ? expensesData : [...prev, ...expensesData]);
            setHasMore(expensesData.length === PAGE_SIZE);
            setPage(pageNum);
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
            resolve(expensesData);
          },
          (_, error) => {
            console.error('Error loading expenses:', error);
            showSnackbar('খরচ লোড করতে ব্যর্থ হয়েছে', 'error');
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
            resolve([]);
          }
        );
      });
    });
  };

  // ─── FIX: loadTotalCount also accepts the latest filter/search values ────────
  const loadTotalCount = (
    currentFilterType = filterType,
    currentSearchQuery = searchQuery,
  ) => {
    return new Promise((resolve) => {
      const whereClause = getWhereClause(currentFilterType, currentSearchQuery);

      const query = `
        SELECT COUNT(*) as count FROM expenses 
        ${whereClause}
      `;

      db.transaction((tx) => {
        tx.executeSql(
          query,
          [],
          (_, results) => {
            const count = results.rows.item(0).count;
            setTotalCount(count);
            resolve(count);
          },
          (_, error) => {
            console.error('Error loading count:', error);
            resolve(0);
          }
        );
      });
    });
  };

  // ─── FIX: pass the new value directly so the query uses it immediately ───────
  const handleFilterChange = (value) => {
    setFilterType(value);
    setFilterMenuVisible(false);
    setPage(1);
    setExpenses([]);
    setLoading(true);
    Promise.all([
      loadExpenses(1, true, value, sortBy, searchQuery),
      loadTotalCount(value, searchQuery),
    ]).then(() => setLoading(false));
  };

  // ─── FIX: same pattern for sort ──────────────────────────────────────────────
  const handleSortChange = (value) => {
    setSortBy(value);
    setSortMenuVisible(false);
    setPage(1);
    setExpenses([]);
    setLoading(true);
    Promise.all([
      loadExpenses(1, true, filterType, value, searchQuery),
      loadTotalCount(filterType, searchQuery),
    ]).then(() => setLoading(false));
  };

  // ─── FIX: same pattern for search ────────────────────────────────────────────
  const handleSearch = () => {
    setPage(1);
    setExpenses([]);
    setLoading(true);
    Promise.all([
      loadExpenses(1, true, filterType, sortBy, searchQuery),
      loadTotalCount(filterType, searchQuery),
    ]).then(() => setLoading(false));
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setPage(1);
    setExpenses([]);
    setLoading(true);
    // Pass empty string directly — state hasn't cleared yet
    Promise.all([
      loadExpenses(1, true, filterType, sortBy, ''),
      loadTotalCount(filterType, ''),
    ]).then(() => setLoading(false));
  };

  // Load more items for pagination
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      loadExpenses(page + 1, false, filterType, sortBy, searchQuery);
    }
  };

  // Refresh data
  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadExpenses(1, true, filterType, sortBy, searchQuery);
    loadTotalCount(filterType, searchQuery);
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    const today = moment().format('YYYY-MM-DD');
    const weekStart = moment().clone().startOf('isoWeek').format('YYYY-MM-DD');
    const monthStart = moment().clone().startOf('month').format('YYYY-MM-DD');

    let total = 0;
    let todayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;

    expenses.forEach(expense => {
      const amount = parseFloat(expense.amount) || 0;
      const expenseDate = moment(expense.date).format('YYYY-MM-DD');

      total += amount;

      if (expenseDate === today) {
        todayTotal += amount;
      }

      if (expenseDate >= weekStart) {
        weekTotal += amount;
      }

      if (expenseDate >= monthStart) {
        monthTotal += amount;
      }
    });

    setSummary({
      total,
      today: todayTotal,
      week: weekTotal,
      month: monthTotal,
    });
  };

  // Format currency for Bengali locale
  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('bn-BD', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  // Format date for display (Bengali)
  const formatDisplayDate = (date) => {
    return moment(date).format('DD MMMM YYYY');
  };

  // Format date for storage (English)
  const formatStorageDate = (date) => {
    return moment(date).locale('en').format('YYYY-MM-DD HH:mm:ss');
  };

  // Format short date for display (Bengali)
  const formatShortDisplayDate = (date) => {
    return moment(date).format('DD MMM, YYYY');
  };

  // Get active filter label
  const getActiveFilterLabel = () => {
    const filter = filterOptions.find(f => f.value === filterType);
    return filter ? filter.label : 'সব খরচ';
  };

  // Get active sort label
  const getActiveSortLabel = () => {
    const sort = sortOptions.find(s => s.value === sortBy);
    return sort ? sort.label : 'নতুন প্রথম';
  };

  // Get human-readable date range for the active filter (Bengali)
  const getFilterDateRange = () => {
    switch (filterType) {
      case 'today':
        return moment().format('DD MMMM YYYY');
      case 'yesterday':
        return moment().subtract(1, 'day').format('DD MMMM YYYY');
      case 'week': {
        const start = moment().clone().startOf('isoWeek').format('DD');
        const end = moment().clone().endOf('isoWeek').format('DD MMMM YYYY');
        return `${start} - ${end}`;
      }
      case 'month': {
        const start = moment().clone().startOf('month').format('DD');
        const end = moment().clone().endOf('month').format('DD MMMM YYYY');
        return `${start} - ${end}`;
      }
      case 'year': {
        const start = moment().clone().startOf('year').format('DD MMM');
        const end = moment().clone().endOf('year').format('DD MMM YYYY');
        return `${start} - ${end}`;
      }
      default:
        return null;
    }
  };

  // Validate add form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'শিরোনাম প্রয়োজন';
    } else if (formData.title.length > 255) {
      newErrors.title = 'শিরোনাম ২৫৫ অক্ষরের কম হতে হবে';
    }

    if (!formData.amount) {
      newErrors.amount = 'টাকার পরিমাণ প্রয়োজন';
    } else if (isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'বৈধ টাকার পরিমাণ দিন';
    }

    if (!formData.date) {
      newErrors.date = 'তারিখ প্রয়োজন';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate edit form
  const validateEditForm = () => {
    const newErrors = {};

    if (!editFormData.title.trim()) {
      newErrors.title = 'শিরোনাম প্রয়োজন';
    } else if (editFormData.title.length > 255) {
      newErrors.title = 'শিরোনাম ২৫৫ অক্ষরের কম হতে হবে';
    }

    if (!editFormData.amount) {
      newErrors.amount = 'টাকার পরিমাণ প্রয়োজন';
    } else if (isNaN(editFormData.amount) || parseFloat(editFormData.amount) <= 0) {
      newErrors.amount = 'বৈধ টাকার পরিমাণ দিন';
    }

    if (!editFormData.date) {
      newErrors.date = 'তারিখ প্রয়োজন';
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleEditInputChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    if (editErrors[field]) {
      setEditErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, date: selectedDate }));
      if (errors.date) {
        setErrors(prev => ({ ...prev, date: null }));
      }
    }
  };

  const handleEditDateChange = (event, selectedDate) => {
    setShowEditDatePicker(false);
    if (selectedDate) {
      setEditFormData(prev => ({ ...prev, date: selectedDate }));
      if (editErrors.date) {
        setEditErrors(prev => ({ ...prev, date: null }));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
      amount: '',
      date: new Date(),
    });
    setErrors({});
  };

  const resetEditForm = () => {
    setEditFormData({
      id: '',
      title: '',
      amount: '',
      date: new Date(),
    });
    setEditErrors({});
    setSelectedExpense(null);
  };

  const handleAddExpense = () => {
    if (!validateForm()) {
      return;
    }

    const Id = IdGenerator(logedInUserInfo?.id);
    const formattedDate = formatStorageDate(formData.date);

    const newExpense = {
      id: Id,
      title: formData.title,
      amount: parseFloat(formData.amount),
      date: formattedDate,
      shop_id: logedInUserInfo?.shop[0]?.id,
      user_id: logedInUserInfo?.id,
      status: "No"
    };

    db.transaction((tx) => {
      tx.executeSql(
        'INSERT INTO expenses (id, title, amount, shop_id, user_id, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [newExpense.id, newExpense.title, newExpense.amount, newExpense.shop_id, newExpense.user_id, newExpense.date, newExpense.status],
        () => {
          showSnackbar('খরচ সফলভাবে যোগ করা হয়েছে!', 'success');
          resetForm();
          setFormVisible(false);
          setExpenses(prev => [newExpense, ...prev]);
          setTotalCount(prev => prev + 1);
        },
        (_, error) => {
          console.error('Error adding expense:', error);
          showSnackbar('খরচ যোগ করতে ব্যর্থ হয়েছে', 'error');
        }
      );
    });
  };

  const handleEditExpense = () => {
    if (!validateEditForm()) {
      return;
    }

    const formattedDate = formatStorageDate(editFormData.date);

    const updatedExpense = {
      ...editFormData,
      amount: parseFloat(editFormData.amount),
      date: formattedDate,
    };

    db.transaction((tx) => {
      tx.executeSql(
        'UPDATE expenses SET title = ?, amount = ?, date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [updatedExpense.title, updatedExpense.amount, updatedExpense.date, updatedExpense.id],
        () => {
          showSnackbar('খরচ সফলভাবে আপডেট করা হয়েছে!', 'success');
          setEditFormVisible(false);
          resetEditForm();
          setExpenses(prev =>
            prev.map(item =>
              item.id === updatedExpense.id
                ? { ...item, title: updatedExpense.title, amount: updatedExpense.amount, date: updatedExpense.date }
                : item
            )
          );
        },
        (_, error) => {
          console.error('Error updating expense:', error);
          showSnackbar('খরচ আপডেট করতে ব্যর্থ হয়েছে', 'error');
        }
      );
    });
  };

  const handleDeleteExpense = (id) => {
    Alert.alert(
      'খরচ মুছে ফেলুন',
      'আপনি কি নিশ্চিত যে আপনি এই খরচটি মুছে ফেলতে চান?',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'মুছে ফেলুন',
          style: 'destructive',
          onPress: () => {
            setExpenses(prev => prev.filter(item => item.id !== id));
            setTotalCount(prev => prev - 1);

            db.transaction((tx) => {
              tx.executeSql(
                'DELETE FROM expenses WHERE id = ?',
                [id],
                () => {
                  showSnackbar('খরচ সফলভাবে মুছে ফেলা হয়েছে', 'success');
                },
                (_, error) => {
                  console.error('Error deleting expense:', error);
                  showSnackbar('খরচ মুছে ফেলতে ব্যর্থ হয়েছে', 'error');
                  onRefresh();
                }
              );
            });
          }
        }
      ]
    );
  };

  const openEditForm = (item) => {
    setSelectedExpense(item);
    setEditFormData({
      id: item.id,
      title: item.title,
      amount: item.amount.toString(),
      date: new Date(item.date),
    });
    setEditFormVisible(true);
  };

  const showSnackbar = (message, type = 'info') => {
    setSnackbar({
      visible: true,
      message,
      type,
    });
  };

  const dismissSnackbar = () => {
    setSnackbar(prev => ({ ...prev, visible: false }));
  };

  const getSnackbarStyle = () => {
    switch (snackbar.type) {
      case 'success':
        return styles.successSnackbar;
      case 'error':
        return styles.errorSnackbar;
      default:
        return styles.infoSnackbar;
    }
  };

  const dismissKeyboard = () => Keyboard.dismiss();

  // Render header with search and filters
  const renderHeader = () => (
    <View style={styles.headerSection}>
      <View style={styles.searchRow}>
        <Searchbar
          placeholder="খরচ খুঁজুন..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor={colors.primary}
          onSubmitEditing={handleSearch}
          onIconPress={handleSearch}
          onClearIconPress={clearSearch}
        />
        <View style={styles.filterButtons}>
          <Menu
            visible={filterMenuVisible}
            onDismiss={() => setFilterMenuVisible(false)}
            anchor={
              <IconButton
                icon="filter"
                size={24}
                iconColor={filterType !== 'all' ? colors.primary : colors.textSecondary}
                onPress={() => setFilterMenuVisible(true)}
                style={styles.filterIcon}
              />
            }
          >
            {filterOptions.map(option => (
              <Menu.Item
                key={option.value}
                onPress={() => handleFilterChange(option.value)}
                title={option.label}
                leadingIcon={option.icon}
                titleStyle={filterType === option.value ? styles.activeMenuItem : {}}
              />
            ))}
          </Menu>

          <Menu
            visible={sortMenuVisible}
            onDismiss={() => setSortMenuVisible(false)}
            anchor={
              <IconButton
                icon="sort"
                size={24}
                iconColor={colors.textSecondary}
                onPress={() => setSortMenuVisible(true)}
                style={styles.filterIcon}
              />
            }
          >
            {sortOptions.map(option => (
              <Menu.Item
                key={option.value}
                onPress={() => handleSortChange(option.value)}
                title={option.label}
                leadingIcon={option.icon}
                titleStyle={sortBy === option.value ? styles.activeMenuItem : {}}
              />
            ))}
          </Menu>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFilters}>
        <Chip
          icon="filter"
          onClose={filterType !== 'all' ? () => handleFilterChange('all') : undefined}
          style={[styles.filterChip, filterType !== 'all' && styles.activeFilterChip]}
        >
          {getActiveFilterLabel()}
        </Chip>
        <Chip
          icon="sort"
          style={styles.filterChip}
        >
          {getActiveSortLabel()}
        </Chip>
        {searchQuery !== '' && (
          <Chip
            icon="magnify"
            onClose={clearSearch}
            style={styles.filterChip}
          >
            "{searchQuery}"
          </Chip>
        )}
      </ScrollView>

    </View>
  );

  // Render summary cards
  const renderSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={[styles.summaryCard, { backgroundColor: colors.primaryLightest }]}>
        <View style={styles.summaryCardHeader}>
          <Text style={styles.summaryLabel}>মোট খরচ</Text>
          {getFilterDateRange() && (
            <View style={styles.summaryDateBadge}>
              <Icon name="calendar-range" size={12} color={colors.primary} />
              <Text style={styles.summaryDateText}>{getFilterDateRange()}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.summaryAmount, { color: colors.primary }]}>
          ৳ {formatCurrency(summary.total)}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <View style={[styles.summarySmallCard, { backgroundColor: colors.warningLight }]}>
          <Icon name="calendar-today" size={16} color={colors.warning} />
          <Text style={styles.summarySmallLabel}>আজ</Text>
          <Text style={[styles.summarySmallAmount, { color: colors.warning }]}>
            ৳ {formatCurrency(summary.today)}
          </Text>
        </View>
        <View style={[styles.summarySmallCard, { backgroundColor: colors.info + '20' }]}>
          <Icon name="calendar-week" size={16} color={colors.info} />
          <Text style={styles.summarySmallLabel}>সপ্তাহ</Text>
          <Text style={[styles.summarySmallAmount, { color: colors.info }]}>
            ৳ {formatCurrency(summary.week)}
          </Text>
        </View>
        <View style={[styles.summarySmallCard, { backgroundColor: colors.successLight }]}>
          <Icon name="calendar-month" size={16} color={colors.success} />
          <Text style={styles.summarySmallLabel}>মাস</Text>
          <Text style={[styles.summarySmallAmount, { color: colors.success }]}>
            ৳ {formatCurrency(summary.month)}
          </Text>
        </View>
      </View>
    </View>
  );

  // Render expense item
  const renderExpenseItem = ({ item }) => (
    <TouchableOpacity
      style={styles.expenseItem}
      onPress={() => openEditForm(item)}
      activeOpacity={0.7}
    >
      <View style={styles.expenseContent}>
        <View style={styles.expenseMainInfo}>
          <View style={styles.expenseHeader}>
            <Text style={styles.expenseTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.expenseAmount}>
              ৳ {formatCurrency(item.amount)}
            </Text>
          </View>
          <View style={styles.expenseFooter}>
            <View style={styles.dateContainer}>
              <Icon name="calendar" size={12} color={colors.textSecondary} />
              <Text style={styles.expenseDate}>
                {formatShortDisplayDate(item.date)}
              </Text>
            </View>
            <View style={styles.expenseActions}>
              <TouchableOpacity
                onPress={() => handleDeleteExpense(item.id)}
                style={styles.actionButton}
              >
                <Icon name="delete" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render footer with loading indicator
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerText}>আরো লোড হচ্ছে...</Text>
      </View>
    );
  };

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="cash-remove" size={48} color={colors.primaryLight} />
      <Text style={styles.emptyTitle}>কোনো খরচ নেই</Text>
      <Text style={styles.emptyText}>
        {searchQuery ? 'অনুসন্ধানের সাথে মিলে যায়নি' : 'আপনার প্রথম খরচ যোগ করতে + বাটনে ক্লিক করুন'}
      </Text>
    </View>
  );

  // Render date picker
  const renderDatePicker = (isEdit = false) => {
    if (isEdit) {
      return showEditDatePicker && (
        <DateTimePicker
          value={editFormData.date}
          mode="date"
          display="default"
          onChange={handleEditDateChange}
          maximumDate={new Date()}
        />
      );
    }

    return showDatePicker && (
      <DateTimePicker
        value={formData.date}
        mode="date"
        display="default"
        onChange={handleDateChange}
        maximumDate={new Date()}
      />
    );
  };

  // Render add form dialog
  const renderAddForm = () => (
    <Portal>
      <Dialog
        visible={formVisible}
        onDismiss={() => {
          setFormVisible(false);
          resetForm();
        }}
        style={styles.dialog}
      >
        <Dialog.Title style={styles.dialogTitle}>নতুন খরচ যোগ করুন</Dialog.Title>
        <Dialog.ScrollArea style={styles.dialogScrollArea}>
          <View style={styles.dialogContent}>
            <View style={styles.inputContainer}>
              <TextInput
                label="শিরোনাম *"
                value={formData.title}
                onChangeText={(text) => handleInputChange('title', text)}
                mode="outlined"
                multiline
                numberOfLines={2}
                maxLength={255}
                error={!!errors.title}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                left={<TextInput.Icon icon="format-title" />}
              />
              <HelperText type="error" visible={!!errors.title} style={styles.helperText}>
                {errors.title}
              </HelperText>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                label="টাকার পরিমাণ *"
                value={formData.amount}
                onChangeText={(text) => handleInputChange('amount', text)}
                mode="outlined"
                keyboardType="numeric"
                error={!!errors.amount}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                left={<TextInput.Icon icon="currency-bdt" />}
              />
              <HelperText type="error" visible={!!errors.amount} style={styles.helperText}>
                {errors.amount}
              </HelperText>
            </View>

            <View style={styles.inputContainer}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.datePickerButton}
              >
                <View style={styles.datePickerContent}>
                  <Icon name="calendar" size={20} color={colors.primary} />
                  <Text style={styles.dateText}>
                    {formatDisplayDate(formData.date)}
                  </Text>
                </View>
                <Icon name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {errors.date && (
                <HelperText type="error" visible={true} style={styles.helperText}>
                  {errors.date}
                </HelperText>
              )}
            </View>
          </View>
        </Dialog.ScrollArea>
        <Dialog.Actions style={styles.dialogActions}>
          <Button
            onPress={() => {
              setFormVisible(false);
              resetForm();
            }}
            style={styles.cancelButton}
            labelStyle={styles.cancelButtonLabel}
          >
            বাতিল
          </Button>
          <Button
            mode="contained"
            onPress={handleAddExpense}
            style={styles.saveButton}
            labelStyle={styles.saveButtonLabel}
          >
            খরচ যোগ করুন
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  // Render edit form dialog
  const renderEditForm = () => (
    <Portal>
      <Dialog
        visible={editFormVisible}
        onDismiss={() => {
          setEditFormVisible(false);
          resetEditForm();
        }}
        style={styles.dialog}
      >
        <Dialog.Title style={styles.dialogTitle}>খরচ সম্পাদনা করুন</Dialog.Title>
        <Dialog.ScrollArea style={styles.dialogScrollArea}>
          <View style={styles.dialogContent}>
            <View style={styles.inputContainer}>
              <TextInput
                label="শিরোনাম *"
                value={editFormData.title}
                onChangeText={(text) => handleEditInputChange('title', text)}
                mode="outlined"
                multiline
                numberOfLines={2}
                maxLength={255}
                error={!!editErrors.title}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                left={<TextInput.Icon icon="format-title" />}
              />
              <HelperText type="error" visible={!!editErrors.title} style={styles.helperText}>
                {editErrors.title}
              </HelperText>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                label="টাকার পরিমাণ *"
                value={editFormData.amount}
                onChangeText={(text) => handleEditInputChange('amount', text)}
                mode="outlined"
                keyboardType="numeric"
                error={!!editErrors.amount}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                left={<TextInput.Icon icon="currency-bdt" />}
              />
              <HelperText type="error" visible={!!editErrors.amount} style={styles.helperText}>
                {editErrors.amount}
              </HelperText>
            </View>

            <View style={styles.inputContainer}>
              <TouchableOpacity
                onPress={() => setShowEditDatePicker(true)}
                style={styles.datePickerButton}
              >
                <View style={styles.datePickerContent}>
                  <Icon name="calendar" size={20} color={colors.primary} />
                  <Text style={styles.dateText}>
                    {formatDisplayDate(editFormData.date)}
                  </Text>
                </View>
                <Icon name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {editErrors.date && (
                <HelperText type="error" visible={true} style={styles.helperText}>
                  {editErrors.date}
                </HelperText>
              )}
            </View>
          </View>
        </Dialog.ScrollArea>
        <Dialog.Actions style={styles.dialogActions}>
          <Button
            onPress={() => {
              setEditFormVisible(false);
              resetEditForm();
            }}
            style={styles.cancelButton}
            labelStyle={styles.cancelButtonLabel}
          >
            বাতিল
          </Button>
          <Button
            mode="contained"
            onPress={handleEditExpense}
            style={styles.saveButton}
            labelStyle={styles.saveButtonLabel}
          >
            আপডেট করুন
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  // Loading state
  if (loading) {
    return (
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <SafeAreaView style={styles.container}>
          <Appbar.Header style={styles.header}>
            <Appbar.BackAction color="#fff" onPress={() => navigation.goBack()} />
            <Appbar.Content title="খরচের তালিকা" color="#fff" />
          </Appbar.Header>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>খরচ লোড হচ্ছে...</Text>
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    );
  }

  // Main render
  return (
    <Provider>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <SafeAreaView style={styles.container}>
          <Appbar.Header style={styles.header}>
            <Appbar.BackAction color="#fff" onPress={() => navigation.goBack()} />
            <Appbar.Content title="খরচের তালিকা" color="#fff" />
            <Appbar.Action icon="plus" color="#fff" onPress={() => setFormVisible(true)} />
          </Appbar.Header>

          <View style={styles.content}>
            {renderHeader()}
            {renderSummary()}

            <FlatList
              data={expenses}
              renderItem={renderExpenseItem}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              onEndReached={loadMore}
              onEndReachedThreshold={0.3}
              ListEmptyComponent={renderEmpty}
              ListFooterComponent={renderFooter}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                />
              }
              contentContainerStyle={styles.listContainer}
            />
          </View>

          {renderDatePicker(false)}
          {renderDatePicker(true)}
          {renderAddForm()}
          {renderEditForm()}

          <Snackbar
            visible={snackbar.visible}
            onDismiss={dismissSnackbar}
            duration={2000}
            style={[styles.snackbar, getSnackbarStyle()]}
            action={{
              label: 'ঠিক আছে',
              onPress: dismissSnackbar,
              labelStyle: styles.snackbarActionLabel,
            }}
          >
            <View style={styles.snackbarContent}>
              <Icon
                name={snackbar.type === 'success' ? 'check-circle' : 'information'}
                size={18}
                color="#fff"
              />
              <Text style={styles.snackbarText}>{snackbar.message}</Text>
            </View>
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
    elevation: 0,
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
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  headerSection: {
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchBar: {
    flex: 1,
    backgroundColor: colors.surface,
    elevation: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    height: 48,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 48,
  },
  filterButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterIcon: {
    margin: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  activeFilters: {
    flexDirection: 'row',
    marginTop: 4,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    height: 32,
  },
  activeFilterChip: {
    backgroundColor: colors.primaryLightest,
    borderColor: colors.primary,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '18',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  summaryDateText: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '500',
  },
  activeMenuItem: {
    color: colors.primary,
    fontWeight: '500',
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  summarySmallCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  summarySmallLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginVertical: 4,
  },
  summarySmallAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  expenseItem: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
    elevation: 1,
  },
  expenseContent: {
    flex: 1,
  },
  expenseMainInfo: {
    flex: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  expenseTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginRight: 8,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  expenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  expenseActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  dialogTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  dialogScrollArea: {
    maxHeight: 400,
    paddingHorizontal: 0,
  },
  dialogContent: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.surface,
    fontSize: 14,
  },
  helperText: {
    fontSize: 11,
    marginTop: -4,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  dialogActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    marginRight: 8,
  },
  cancelButtonLabel: {
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonLabel: {
    color: '#fff',
  },
  snackbar: {
    borderRadius: 8,
    margin: 16,
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
  snackbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  snackbarText: {
    color: '#fff',
    fontSize: 14,
  },
  snackbarActionLabel: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default ExpenseList;