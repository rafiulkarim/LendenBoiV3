import React, { useContext, useEffect, useState, useRef } from 'react';
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

moment.locale('bn');

const db = openDatabase({ name: 'lenden_boi.db', createFromLocation: 1 });

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

const PAGE_SIZE = 10;

const ExpenseList = ({ navigation }) => {
  const { logedInUserInfo } = React.useContext(AuthContext);

  // ── List state ───────────────────────────────────────────────────────────────
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  // ── Dialog visibility ────────────────────────────────────────────────────────
  const [formVisible, setFormVisible] = useState(false);
  const [editFormVisible, setEditFormVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);

  // ── Date state (dates are fine in state — they don't cause typing issues) ────
  const [addDate, setAddDate] = useState(new Date());
  const [editDate, setEditDate] = useState(new Date());

  // ── Validation errors ────────────────────────────────────────────────────────
  const [errors, setErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});

  // ── Char counts for display only ─────────────────────────────────────────────
  const [addTitleCount, setAddTitleCount] = useState(0);
  const [editTitleCount, setEditTitleCount] = useState(0);

  // ── Snackbar ─────────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'info' });

  // ── Summary ──────────────────────────────────────────────────────────────────
  const [summary, setSummary] = useState({ total: 0, today: 0, week: 0, month: 0 });

  // ✅ KEY FIX: text input values live in refs, NOT state
  const addTitleRef = useRef('');
  const addAmountRef = useRef('');
  const editTitleRef = useRef('');
  const editAmountRef = useRef('');
  const editIdRef = useRef('');

  // ── Filter / sort options ────────────────────────────────────────────────────
  const filterOptions = [
    { label: 'সব খরচ', value: 'all', icon: 'format-list-bulleted' },
    { label: 'আজ', value: 'today', icon: 'calendar-today' },
    { label: 'গতকাল', value: 'yesterday', icon: 'calendar-arrow-left' },
    { label: 'এই সপ্তাহ', value: 'week', icon: 'calendar-week' },
    { label: 'এই মাস', value: 'month', icon: 'calendar-month' },
    { label: 'এই বছর', value: 'year', icon: 'calendar' },
  ];

  const sortOptions = [
    { label: 'নতুন প্রথম', value: 'date_desc', icon: 'sort-calendar-descending' },
    { label: 'পুরাতন প্রথম', value: 'date_asc', icon: 'sort-calendar-ascending' },
    { label: 'সবচেয়ে বেশি', value: 'amount_desc', icon: 'sort-numeric-descending' },
    { label: 'সবচেয়ে কম', value: 'amount_asc', icon: 'sort-numeric-ascending' },
  ];

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { calculateSummary(); }, [expenses]);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([
      loadExpenses(1, true, filterType, sortBy, searchQuery),
      loadTotalCount(filterType, searchQuery),
    ]);
    setLoading(false);
  };

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
      default: break;
    }
    if (search.trim()) whereClause += ` AND title LIKE '%${search}%'`;
    return whereClause;
  };

  const getOrderClause = (sort) => {
    switch (sort) {
      case 'date_asc': return 'ORDER BY date ASC, created_at ASC';
      case 'amount_desc': return 'ORDER BY amount DESC, date DESC';
      case 'amount_asc': return 'ORDER BY amount ASC, date DESC';
      default: return 'ORDER BY date DESC, created_at DESC';
    }
  };

  const loadExpenses = (
    pageNum = 1, reset = false,
    currentFilterType = filterType,
    currentSortBy = sortBy,
    currentSearchQuery = searchQuery,
  ) => new Promise((resolve) => {
    const offset = (pageNum - 1) * PAGE_SIZE;
    const whereClause = getWhereClause(currentFilterType, currentSearchQuery);
    const orderClause = getOrderClause(currentSortBy);
    const query = `SELECT * FROM expenses ${whereClause} ${orderClause} LIMIT ${PAGE_SIZE} OFFSET ${offset}`;

    db.transaction((tx) => {
      tx.executeSql(query, [],
        (_, results) => {
          const rows = results.rows;
          const expensesData = [];
          for (let i = 0; i < rows.length; i++) expensesData.push(rows.item(i));
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
          setLoading(false); setLoadingMore(false); setRefreshing(false);
          resolve([]);
        }
      );
    });
  });

  const loadTotalCount = (
    currentFilterType = filterType,
    currentSearchQuery = searchQuery,
  ) => new Promise((resolve) => {
    const whereClause = getWhereClause(currentFilterType, currentSearchQuery);
    const query = `SELECT COUNT(*) as count FROM expenses ${whereClause}`;
    db.transaction((tx) => {
      tx.executeSql(query, [],
        (_, results) => { const c = results.rows.item(0).count; setTotalCount(c); resolve(c); },
        (_, error) => { console.error('Error loading count:', error); resolve(0); }
      );
    });
  });

  const handleFilterChange = (value) => {
    setFilterType(value);
    setFilterMenuVisible(false);
    setPage(1); setExpenses([]); setLoading(true);
    Promise.all([
      loadExpenses(1, true, value, sortBy, searchQuery),
      loadTotalCount(value, searchQuery),
    ]).then(() => setLoading(false));
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    setSortMenuVisible(false);
    setPage(1); setExpenses([]); setLoading(true);
    Promise.all([
      loadExpenses(1, true, filterType, value, searchQuery),
      loadTotalCount(filterType, searchQuery),
    ]).then(() => setLoading(false));
  };

  const handleSearch = () => {
    setPage(1); setExpenses([]); setLoading(true);
    Promise.all([
      loadExpenses(1, true, filterType, sortBy, searchQuery),
      loadTotalCount(filterType, searchQuery),
    ]).then(() => setLoading(false));
  };

  const clearSearch = () => {
    setSearchQuery('');
    setPage(1); setExpenses([]); setLoading(true);
    Promise.all([
      loadExpenses(1, true, filterType, sortBy, ''),
      loadTotalCount(filterType, ''),
    ]).then(() => setLoading(false));
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      loadExpenses(page + 1, false, filterType, sortBy, searchQuery);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadExpenses(1, true, filterType, sortBy, searchQuery);
    loadTotalCount(filterType, searchQuery);
  };

  const calculateSummary = () => {
    const today = moment().format('YYYY-MM-DD');
    const weekStart = moment().clone().startOf('isoWeek').format('YYYY-MM-DD');
    const monthStart = moment().clone().startOf('month').format('YYYY-MM-DD');
    let total = 0, todayTotal = 0, weekTotal = 0, monthTotal = 0;
    expenses.forEach(expense => {
      const amount = parseFloat(expense.amount) || 0;
      const expenseDate = moment(expense.date).format('YYYY-MM-DD');
      total += amount;
      if (expenseDate === today) todayTotal += amount;
      if (expenseDate >= weekStart) weekTotal += amount;
      if (expenseDate >= monthStart) monthTotal += amount;
    });
    setSummary({ total, today: todayTotal, week: weekTotal, month: monthTotal });
  };

  const formatCurrency = (amount) =>
    parseFloat(amount || 0).toLocaleString('bn-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const formatDisplayDate = (date) => moment(date).format('DD MMMM YYYY');
  const formatStorageDate = (date) => moment(date).locale('en').format('YYYY-MM-DD HH:mm:ss');
  const formatShortDisplayDate = (date) => moment(date).format('DD MMM, YYYY');

  const getActiveFilterLabel = () => filterOptions.find(f => f.value === filterType)?.label ?? 'সব খরচ';
  const getActiveSortLabel = () => sortOptions.find(s => s.value === sortBy)?.label ?? 'নতুন প্রথম';

  const getFilterDateRange = () => {
    switch (filterType) {
      case 'today': return moment().format('DD MMMM YYYY');
      case 'yesterday': return moment().subtract(1, 'day').format('DD MMMM YYYY');
      case 'week': return `${moment().clone().startOf('isoWeek').format('DD')} - ${moment().clone().endOf('isoWeek').format('DD MMMM YYYY')}`;
      case 'month': return `${moment().clone().startOf('month').format('DD')} - ${moment().clone().endOf('month').format('DD MMMM YYYY')}`;
      case 'year': return `${moment().clone().startOf('year').format('DD MMM')} - ${moment().clone().endOf('year').format('DD MMM YYYY')}`;
      default: return null;
    }
  };

  // ── Reset helpers ────────────────────────────────────────────────────────────
  const resetForm = () => {
    addTitleRef.current = '';
    addAmountRef.current = '';
    setAddTitleCount(0);
    setAddDate(new Date());
    setErrors({});
  };

  const resetEditForm = () => {
    editTitleRef.current = '';
    editAmountRef.current = '';
    editIdRef.current = '';
    setEditTitleCount(0);
    setEditDate(new Date());
    setEditErrors({});
    setSelectedExpense(null);
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  const handleAddExpense = () => {
    // ✅ Read from refs
    const titleValue = addTitleRef.current.trim();
    const amountValue = addAmountRef.current.trim();
    const newErrors = {};
    if (!titleValue) newErrors.title = 'শিরোনাম প্রয়োজন';
    else if (titleValue.length > 255) newErrors.title = 'শিরোনাম ২৫৫ অক্ষরের কম হতে হবে';
    if (!amountValue) newErrors.amount = 'টাকার পরিমাণ প্রয়োজন';
    else if (isNaN(amountValue) || parseFloat(amountValue) <= 0) newErrors.amount = 'বৈধ টাকার পরিমাণ দিন';
    if (!addDate) newErrors.date = 'তারিখ প্রয়োজন';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    const Id = IdGenerator(logedInUserInfo?.id);
    const formattedDate = formatStorageDate(addDate);
    const newExpense = {
      id: Id, title: titleValue, amount: parseFloat(amountValue),
      date: formattedDate, shop_id: logedInUserInfo?.shop[0]?.id,
      user_id: logedInUserInfo?.id, status: 'No',
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
        (_, error) => { console.error('Error adding expense:', error); showSnackbar('খরচ যোগ করতে ব্যর্থ হয়েছে', 'error'); }
      );
    });
  };

  const handleEditExpense = () => {
    // ✅ Read from refs
    const titleValue = editTitleRef.current.trim();
    const amountValue = editAmountRef.current.trim();
    const id = editIdRef.current;
    const newErrors = {};
    if (!titleValue) newErrors.title = 'শিরোনাম প্রয়োজন';
    else if (titleValue.length > 255) newErrors.title = 'শিরোনাম ২৫৫ অক্ষরের কম হতে হবে';
    if (!amountValue) newErrors.amount = 'টাকার পরিমাণ প্রয়োজন';
    else if (isNaN(amountValue) || parseFloat(amountValue) <= 0) newErrors.amount = 'বৈধ টাকার পরিমাণ দিন';
    if (!editDate) newErrors.date = 'তারিখ প্রয়োজন';
    if (Object.keys(newErrors).length > 0) { setEditErrors(newErrors); return; }

    const formattedDate = formatStorageDate(editDate);
    db.transaction((tx) => {
      tx.executeSql(
        'UPDATE expenses SET title = ?, amount = ?, date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [titleValue, parseFloat(amountValue), formattedDate, id],
        () => {
          showSnackbar('খরচ সফলভাবে আপডেট করা হয়েছে!', 'success');
          setEditFormVisible(false);
          resetEditForm();
          setExpenses(prev =>
            prev.map(item =>
              item.id === id
                ? { ...item, title: titleValue, amount: parseFloat(amountValue), date: formattedDate }
                : item
            )
          );
        },
        (_, error) => { console.error('Error updating expense:', error); showSnackbar('খরচ আপডেট করতে ব্যর্থ হয়েছে', 'error'); }
      );
    });
  };

  const handleDeleteExpense = (id) => {
    Alert.alert('খরচ মুছে ফেলুন', 'আপনি কি নিশ্চিত যে আপনি এই খরচটি মুছে ফেলতে চান?', [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: 'মুছে ফেলুন', style: 'destructive',
        onPress: () => {
          setExpenses(prev => prev.filter(item => item.id !== id));
          setTotalCount(prev => prev - 1);
          db.transaction((tx) => {
            tx.executeSql('DELETE FROM expenses WHERE id = ?', [id],
              () => showSnackbar('খরচ সফলভাবে মুছে ফেলা হয়েছে', 'success'),
              (_, error) => { console.error('Error deleting expense:', error); showSnackbar('খরচ মুছে ফেলতে ব্যর্থ হয়েছে', 'error'); onRefresh(); }
            );
          });
        }
      }
    ]);
  };

  const openEditForm = (item) => {
    setSelectedExpense(item);
    // ✅ Store in refs, not state
    editTitleRef.current = item.title;
    editAmountRef.current = item.amount.toString();
    editIdRef.current = item.id;
    setEditTitleCount(item.title.length);
    setEditDate(new Date(item.date));
    setEditErrors({});
    setEditFormVisible(true);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setAddDate(selectedDate);
      if (errors.date) setErrors(prev => ({ ...prev, date: null }));
    }
  };

  const handleEditDateChange = (event, selectedDate) => {
    setShowEditDatePicker(false);
    if (selectedDate) {
      setEditDate(selectedDate);
      if (editErrors.date) setEditErrors(prev => ({ ...prev, date: null }));
    }
  };

  const showSnackbar = (message, type = 'info') => setSnackbar({ visible: true, message, type });
  const dismissSnackbar = () => setSnackbar(prev => ({ ...prev, visible: false }));
  const getSnackbarStyle = () => {
    switch (snackbar.type) {
      case 'success': return styles.successSnackbar;
      case 'error': return styles.errorSnackbar;
      default: return styles.infoSnackbar;
    }
  };

  // ── Render sections ──────────────────────────────────────────────────────────
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
              <IconButton icon="filter" size={24}
                iconColor={filterType !== 'all' ? colors.primary : colors.textSecondary}
                onPress={() => setFilterMenuVisible(true)} style={styles.filterIcon} />
            }
          >
            {filterOptions.map(option => (
              <Menu.Item key={option.value} onPress={() => handleFilterChange(option.value)}
                title={option.label} leadingIcon={option.icon}
                titleStyle={filterType === option.value ? styles.activeMenuItem : {}} />
            ))}
          </Menu>
          <Menu
            visible={sortMenuVisible}
            onDismiss={() => setSortMenuVisible(false)}
            anchor={
              <IconButton icon="sort" size={24} iconColor={colors.textSecondary}
                onPress={() => setSortMenuVisible(true)} style={styles.filterIcon} />
            }
          >
            {sortOptions.map(option => (
              <Menu.Item key={option.value} onPress={() => handleSortChange(option.value)}
                title={option.label} leadingIcon={option.icon}
                titleStyle={sortBy === option.value ? styles.activeMenuItem : {}} />
            ))}
          </Menu>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFilters}>
        <Chip icon="filter" onClose={filterType !== 'all' ? () => handleFilterChange('all') : undefined}
          style={[styles.filterChip, filterType !== 'all' && styles.activeFilterChip]}>
          {getActiveFilterLabel()}
        </Chip>
        <Chip icon="sort" style={styles.filterChip}>{getActiveSortLabel()}</Chip>
        {searchQuery !== '' && (
          <Chip icon="magnify" onClose={clearSearch} style={styles.filterChip}>
            "{searchQuery}"
          </Chip>
        )}
      </ScrollView>
    </View>
  );

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
        <Text style={[styles.summaryAmount, { color: colors.primary }]}>৳ {formatCurrency(summary.total)}</Text>
      </View>
      <View style={styles.summaryRow}>
        <View style={[styles.summarySmallCard, { backgroundColor: colors.warningLight }]}>
          <Icon name="calendar-today" size={16} color={colors.warning} />
          <Text style={styles.summarySmallLabel}>আজ</Text>
          <Text style={[styles.summarySmallAmount, { color: colors.warning }]}>৳ {formatCurrency(summary.today)}</Text>
        </View>
        <View style={[styles.summarySmallCard, { backgroundColor: colors.info + '20' }]}>
          <Icon name="calendar-week" size={16} color={colors.info} />
          <Text style={styles.summarySmallLabel}>সপ্তাহ</Text>
          <Text style={[styles.summarySmallAmount, { color: colors.info }]}>৳ {formatCurrency(summary.week)}</Text>
        </View>
        <View style={[styles.summarySmallCard, { backgroundColor: colors.successLight }]}>
          <Icon name="calendar-month" size={16} color={colors.success} />
          <Text style={styles.summarySmallLabel}>মাস</Text>
          <Text style={[styles.summarySmallAmount, { color: colors.success }]}>৳ {formatCurrency(summary.month)}</Text>
        </View>
      </View>
    </View>
  );

  const renderExpenseItem = ({ item }) => (
    <TouchableOpacity style={styles.expenseItem} onPress={() => openEditForm(item)} activeOpacity={0.7}>
      <View style={styles.expenseContent}>
        <View style={styles.expenseMainInfo}>
          <View style={styles.expenseHeader}>
            <Text style={styles.expenseTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.expenseAmount}>৳ {formatCurrency(item.amount)}</Text>
          </View>
          <View style={styles.expenseFooter}>
            <View style={styles.dateContainer}>
              <Icon name="calendar" size={12} color={colors.textSecondary} />
              <Text style={styles.expenseDate}>{formatShortDisplayDate(item.date)}</Text>
            </View>
            <View style={styles.expenseActions}>
              <TouchableOpacity onPress={() => handleDeleteExpense(item.id)} style={styles.actionButton}>
                <Icon name="delete" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerText}>আরো লোড হচ্ছে...</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="cash-remove" size={48} color={colors.primaryLight} />
      <Text style={styles.emptyTitle}>কোনো খরচ নেই</Text>
      <Text style={styles.emptyText}>
        {searchQuery ? 'অনুসন্ধানের সাথে মিলে যায়নি' : 'আপনার প্রথম খরচ যোগ করতে + বাটনে ক্লিক করুন'}
      </Text>
    </View>
  );

  // ✅ Add Form — uncontrolled TextInputs, no value prop
  const renderAddForm = () => (
    <Portal>
      <Dialog visible={formVisible} onDismiss={() => { setFormVisible(false); resetForm(); }} style={styles.dialog}>
        <Dialog.Title style={styles.dialogTitle}>নতুন খরচ যোগ করুন</Dialog.Title>
        <Dialog.ScrollArea style={styles.dialogScrollArea}>
          <View style={styles.dialogContent}>

            <View style={styles.inputContainer}>
              <TextInput
                label="শিরোনাম *"
                // ✅ defaultValue, no value prop
                defaultValue=""
                onChangeText={(text) => {
                  addTitleRef.current = text;
                  setAddTitleCount(text.length);
                  if (errors.title) setErrors(prev => ({ ...prev, title: null }));
                }}
                mode="outlined"
                multiline
                numberOfLines={2}
                maxLength={255}
                error={!!errors.title}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                autoCorrect={false}
                spellCheck={false}
                textAlignVertical="top"
                left={<TextInput.Icon icon="format-title" />}
              />
              <HelperText type="error" visible={!!errors.title} style={styles.helperText}>{errors.title}</HelperText>
              <Text style={styles.charCountText}>{addTitleCount}/২৫৫</Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                label="টাকার পরিমাণ *"
                // ✅ defaultValue, no value prop
                defaultValue=""
                onChangeText={(text) => {
                  addAmountRef.current = text;
                  if (errors.amount) setErrors(prev => ({ ...prev, amount: null }));
                }}
                mode="outlined"
                keyboardType="numeric"
                error={!!errors.amount}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                left={<TextInput.Icon icon="currency-bdt" />}
              />
              <HelperText type="error" visible={!!errors.amount} style={styles.helperText}>{errors.amount}</HelperText>
            </View>

            <View style={styles.inputContainer}>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
                <View style={styles.datePickerContent}>
                  <Icon name="calendar" size={20} color={colors.primary} />
                  <Text style={styles.dateText}>{formatDisplayDate(addDate)}</Text>
                </View>
                <Icon name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {errors.date && <HelperText type="error" visible={true} style={styles.helperText}>{errors.date}</HelperText>}
            </View>

          </View>
        </Dialog.ScrollArea>
        <Dialog.Actions style={styles.dialogActions}>
          <Button onPress={() => { setFormVisible(false); resetForm(); }} style={styles.cancelButton} labelStyle={styles.cancelButtonLabel}>
            বাতিল
          </Button>
          <Button mode="contained" onPress={handleAddExpense} style={styles.saveButton} labelStyle={styles.saveButtonLabel}>
            খরচ যোগ করুন
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  // ✅ Edit Form — key prop forces remount for correct defaultValue, no value prop
  const renderEditForm = () => (
    <Portal>
      <Dialog visible={editFormVisible} onDismiss={() => { setEditFormVisible(false); resetEditForm(); }} style={styles.dialog}>
        <Dialog.Title style={styles.dialogTitle}>খরচ সম্পাদনা করুন</Dialog.Title>
        <Dialog.ScrollArea style={styles.dialogScrollArea}>
          <View style={styles.dialogContent}>

            <View style={styles.inputContainer}>
              <TextInput
                // ✅ key forces remount when editing a different item
                key={`title-${selectedExpense?.id}`}
                label="শিরোনাম *"
                // ✅ defaultValue instead of value
                defaultValue={selectedExpense?.title ?? ''}
                onChangeText={(text) => {
                  editTitleRef.current = text;
                  setEditTitleCount(text.length);
                  if (editErrors.title) setEditErrors(prev => ({ ...prev, title: null }));
                }}
                mode="outlined"
                multiline
                numberOfLines={2}
                maxLength={255}
                error={!!editErrors.title}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                autoCorrect={false}
                spellCheck={false}
                textAlignVertical="top"
                left={<TextInput.Icon icon="format-title" />}
              />
              <HelperText type="error" visible={!!editErrors.title} style={styles.helperText}>{editErrors.title}</HelperText>
              <Text style={styles.charCountText}>{editTitleCount}/২৫৫</Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                // ✅ key forces remount when editing a different item
                key={`amount-${selectedExpense?.id}`}
                label="টাকার পরিমাণ *"
                // ✅ defaultValue instead of value
                defaultValue={selectedExpense?.amount?.toString() ?? ''}
                onChangeText={(text) => {
                  editAmountRef.current = text;
                  if (editErrors.amount) setEditErrors(prev => ({ ...prev, amount: null }));
                }}
                mode="outlined"
                keyboardType="numeric"
                error={!!editErrors.amount}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                left={<TextInput.Icon icon="currency-bdt" />}
              />
              <HelperText type="error" visible={!!editErrors.amount} style={styles.helperText}>{editErrors.amount}</HelperText>
            </View>

            <View style={styles.inputContainer}>
              <TouchableOpacity onPress={() => setShowEditDatePicker(true)} style={styles.datePickerButton}>
                <View style={styles.datePickerContent}>
                  <Icon name="calendar" size={20} color={colors.primary} />
                  <Text style={styles.dateText}>{formatDisplayDate(editDate)}</Text>
                </View>
                <Icon name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {editErrors.date && <HelperText type="error" visible={true} style={styles.helperText}>{editErrors.date}</HelperText>}
            </View>

          </View>
        </Dialog.ScrollArea>
        <Dialog.Actions style={styles.dialogActions}>
          <Button onPress={() => { setEditFormVisible(false); resetEditForm(); }} style={styles.cancelButton} labelStyle={styles.cancelButtonLabel}>
            বাতিল
          </Button>
          <Button mode="contained" onPress={handleEditExpense} style={styles.saveButton} labelStyle={styles.saveButtonLabel}>
            আপডেট করুন
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  if (loading) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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

  return (
    <Provider>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
              }
              contentContainerStyle={styles.listContainer}
            />
          </View>

          {showDatePicker && (
            <DateTimePicker value={addDate} mode="date" display="default"
              onChange={handleDateChange} maximumDate={new Date()} />
          )}
          {showEditDatePicker && (
            <DateTimePicker value={editDate} mode="date" display="default"
              onChange={handleEditDateChange} maximumDate={new Date()} />
          )}

          {renderAddForm()}
          {renderEditForm()}

          <Snackbar
            visible={snackbar.visible}
            onDismiss={dismissSnackbar}
            duration={2000}
            style={[styles.snackbar, getSnackbarStyle()]}
            action={{ label: 'ঠিক আছে', onPress: dismissSnackbar, labelStyle: styles.snackbarActionLabel }}
          >
            <View style={styles.snackbarContent}>
              <Icon name={snackbar.type === 'success' ? 'check-circle' : 'information'} size={18} color="#fff" />
              <Text style={styles.snackbarText}>{snackbar.message}</Text>
            </View>
          </Snackbar>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, elevation: 0 },
  content: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
  headerSection: { marginBottom: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  searchBar: {
    flex: 1, backgroundColor: colors.surface, elevation: 0,
    borderWidth: 1, borderColor: colors.border, borderRadius: 8, height: 48,
  },
  searchInput: { fontSize: 14, minHeight: 48 },
  filterButtons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  filterIcon: { margin: 0, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  activeFilters: { flexDirection: 'row', marginTop: 4 },
  filterChip: { marginRight: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, height: 32 },
  activeFilterChip: { backgroundColor: colors.primaryLightest, borderColor: colors.primary },
  activeMenuItem: { color: colors.primary, fontWeight: '500' },
  summaryCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  summaryDateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '18', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  summaryDateText: { fontSize: 11, color: colors.primaryDark, fontWeight: '500' },
  summaryContainer: { marginBottom: 16 },
  summaryCard: { padding: 16, borderRadius: 12, marginBottom: 12 },
  summaryLabel: { fontSize: 14, color: colors.textSecondary },
  summaryAmount: { fontSize: 24, fontWeight: 'bold' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  summarySmallCard: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  summarySmallLabel: { fontSize: 12, color: colors.textSecondary, marginVertical: 4 },
  summarySmallAmount: { fontSize: 14, fontWeight: 'bold' },
  listContainer: { flexGrow: 1, paddingBottom: 16 },
  expenseItem: { backgroundColor: colors.surface, borderRadius: 8, marginBottom: 8, padding: 12, elevation: 1 },
  expenseContent: { flex: 1 },
  expenseMainInfo: { flex: 1 },
  expenseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  expenseTitle: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginRight: 8 },
  expenseAmount: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  expenseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateContainer: { flexDirection: 'row', alignItems: 'center' },
  expenseDate: { fontSize: 11, color: colors.textSecondary, marginLeft: 4 },
  expenseActions: { flexDirection: 'row' },
  actionButton: { padding: 4, marginLeft: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginTop: 12, marginBottom: 4 },
  emptyText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  footerLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  footerText: { fontSize: 12, color: colors.textSecondary },
  dialog: { backgroundColor: colors.surface, borderRadius: 16 },
  dialogTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
  dialogScrollArea: { maxHeight: 400, paddingHorizontal: 0 },
  dialogContent: { padding: 16 },
  inputContainer: { marginBottom: 12 },
  input: { backgroundColor: colors.surface, fontSize: 14 },
  helperText: { fontSize: 11, marginTop: -4 },
  charCountText: { fontSize: 10, color: colors.textSecondary, textAlign: 'right', marginRight: 4, marginTop: 2 },
  datePickerButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface,
  },
  datePickerContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { fontSize: 14, color: colors.textPrimary },
  dialogActions: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  cancelButton: { marginRight: 8 },
  cancelButtonLabel: { color: colors.textSecondary },
  saveButton: { backgroundColor: colors.primary },
  saveButtonLabel: { color: '#fff' },
  snackbar: { borderRadius: 8, margin: 16 },
  successSnackbar: { backgroundColor: colors.success },
  errorSnackbar: { backgroundColor: colors.error },
  infoSnackbar: { backgroundColor: colors.info },
  snackbarContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  snackbarText: { color: '#fff', fontSize: 14 },
  snackbarActionLabel: { color: '#fff', fontWeight: '600' },
});

export default ExpenseList;