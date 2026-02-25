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
  RefreshControl
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
  Snackbar,
  Chip,
  IconButton,
  Checkbox
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { openDatabase } from 'react-native-sqlite-storage';
import AuthContext from '../../context/AuthContext';
import moment from 'moment';
import 'moment/locale/bn'; // Import Bengali locale
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

const ExpenseList = ({ navigation }) => {
  const { singOut, myToken, logedInUserInfo } = React.useContext(AuthContext);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editFormVisible, setEditFormVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'today', 'week', 'month'

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    amount: '',
    date: new Date(),
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    id: '',
    title: '',
    amount: '',
    date: new Date(),
  });

  // Validation errors
  const [errors, setErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});

  // Snackbar state
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

  useEffect(() => {
    loadExpenses();
  }, []);

  useEffect(() => {
    calculateSummary();
  }, [expenses]);

  const loadExpenses = () => {
    setLoading(true);
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM expenses ORDER BY date DESC, created_at DESC',
        [],
        (_, results) => {
          const rows = results.rows;
          let expensesData = [];
          for (let i = 0; i < rows.length; i++) {
            expensesData.push(rows.item(i));
          }
          setExpenses(expensesData);
          setLoading(false);
          setRefreshing(false);
        },
        (_, error) => {
          console.error('Error loading expenses:', error);
          showSnackbar('খরচ লোড করতে ব্যর্থ হয়েছে', 'error');
          setLoading(false);
          setRefreshing(false);
        }
      );
    });
  };

  const calculateSummary = () => {
    const now = moment();
    const today = now.format('YYYY-MM-DD');
    const weekStart = now.startOf('week').format('YYYY-MM-DD');
    const monthStart = now.startOf('month').format('YYYY-MM-DD');

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

  const onRefresh = () => {
    setRefreshing(true);
    loadExpenses();
  };

  // Format currency for Bengali locale
  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('bn-BD', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
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
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleEditInputChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
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
    const formattedDate = moment(formData.date).format('YYYY-MM-DD HH:mm:ss');

    const newExpense = {
      ...formData,
      id: Id,
      amount: parseFloat(formData.amount),
      date: formattedDate,
    };

    console.log(newExpense)

    db.transaction((tx) => {
      tx.executeSql(
        'INSERT INTO expenses (id, title, amount, shop_id, user_id, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [newExpense.id, newExpense.title, newExpense.amount, logedInUserInfo?.shop[0]?.id, logedInUserInfo?.id, newExpense.date, "No"
        ],
        () => {
          showSnackbar('খরচ সফলভাবে যোগ করা হয়েছে!', 'success');
          resetForm();
          setFormVisible(false);

          // Add to local state immediately
          setExpenses(prevExpenses => [newExpense, ...prevExpenses]);
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

    const formattedDate = moment(editFormData.date).format('YYYY-MM-DD HH:mm:ss');

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

          // Update local state immediately
          setExpenses(prevExpenses =>
            prevExpenses.map(item =>
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
            // Immediately remove from local state
            setExpenses(prevExpenses => prevExpenses.filter(item => item.id !== id));

            // Delete from database in background
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
                  // Reload to restore deleted item on error
                  loadExpenses();
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
      case 'warning':
        return styles.warningSnackbar;
      default:
        return styles.infoSnackbar;
    }
  };

  const dismissKeyboard = () => Keyboard.dismiss();

  const getFilteredExpenses = () => {
    const now = moment();

    switch (filterType) {
      case 'today':
        return expenses.filter(e => moment(e.date).isSame(now, 'day'));
      case 'week':
        return expenses.filter(e => moment(e.date).isSame(now, 'week'));
      case 'month':
        return expenses.filter(e => moment(e.date).isSame(now, 'month'));
      default:
        return expenses;
    }
  };

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
            {/* Title Input */}
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

            {/* Amount Input */}
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

            {/* Date Picker */}
            <View style={styles.inputContainer}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.datePickerButton}
              >
                <View style={styles.datePickerContent}>
                  <Icon name="calendar" size={20} color={colors.primary} />
                  <Text style={styles.dateText}>
                    {moment(formData.date).format('DD MMMM YYYY', 'bn')}
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
            {/* Title Input */}
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

            {/* Amount Input */}
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

            {/* Date Picker */}
            <View style={styles.inputContainer}>
              <TouchableOpacity
                onPress={() => setShowEditDatePicker(true)}
                style={styles.datePickerButton}
              >
                <View style={styles.datePickerContent}>
                  <Icon name="calendar" size={20} color={colors.primary} />
                  <Text style={styles.dateText}>
                    {moment(editFormData.date).format('DD MMMM YYYY', 'bn')}
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

  const renderExpenseItem = ({ item }) => (
    <TouchableOpacity
      key={item.id}
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
                {moment(item.date).format('DD MMM, YYYY', 'bn')}
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

  const renderFilterChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
      <Chip
        selected={filterType === 'all'}
        onPress={() => setFilterType('all')}
        style={[styles.filterChip, filterType === 'all' && styles.selectedFilterChip]}
        textStyle={filterType === 'all' ? styles.selectedFilterText : styles.filterText}
      >
        সব খরচ
      </Chip>
      <Chip
        selected={filterType === 'today'}
        onPress={() => setFilterType('today')}
        style={[styles.filterChip, filterType === 'today' && styles.selectedFilterChip]}
        textStyle={filterType === 'today' ? styles.selectedFilterText : styles.filterText}
      >
        আজ
      </Chip>
      <Chip
        selected={filterType === 'week'}
        onPress={() => setFilterType('week')}
        style={[styles.filterChip, filterType === 'week' && styles.selectedFilterChip]}
        textStyle={filterType === 'week' ? styles.selectedFilterText : styles.filterText}
      >
        এই সপ্তাহ
      </Chip>
      <Chip
        selected={filterType === 'month'}
        onPress={() => setFilterType('month')}
        style={[styles.filterChip, filterType === 'month' && styles.selectedFilterChip]}
        textStyle={filterType === 'month' ? styles.selectedFilterText : styles.filterText}
      >
        এই মাস
      </Chip>
    </ScrollView>
  );

  const filteredExpenses = getFilteredExpenses();

  if (loading && !refreshing) {
    return (
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <SafeAreaView style={styles.container}>
          <Appbar.Header style={styles.header}>
            <Appbar.BackAction
              color="#fff"
              onPress={() => navigation.goBack()}
            />
            <Appbar.Content
              title="খরচের তালিকা"
              color="#fff"
            />
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
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <Appbar.Header style={styles.header}>
            <Appbar.BackAction
              color="#fff"
              onPress={() => navigation.goBack()}
            />
            <Appbar.Content
              title="খরচের তালিকা"
              color="#fff"
            />
            <Appbar.Action
              icon="plus"
              color="#fff"
              onPress={() => setFormVisible(true)}
            />
          </Appbar.Header>

          <View style={styles.content}>
            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
              <View style={[styles.summaryCard, { backgroundColor: colors.primaryLightest }]}>
                <Text style={styles.summaryLabel}>মোট খরচ</Text>
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

            {/* Filter Chips */}
            {renderFilterChips()}

            {/* Expenses List */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                />
              }
            >
              {filteredExpenses.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon name="cash-remove" size={48} color={colors.primaryLight} />
                  <Text style={styles.emptyTitle}>কোনো খরচ নেই</Text>
                  <Text style={styles.emptyText}>
                    আপনার প্রথম খরচ যোগ করতে + বাটনে ক্লিক করুন
                  </Text>
                </View>
              ) : (
                <View style={styles.listContainer}>
                  {filteredExpenses.map(item => renderExpenseItem({ item }))}
                </View>
              )}
            </ScrollView>
          </View>

          {/* Date Pickers */}
          {renderDatePicker(false)}
          {renderDatePicker(true)}

          {/* Add Form Dialog */}
          {renderAddForm()}

          {/* Edit Form Dialog */}
          {renderEditForm()}

          {/* Snackbar */}
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
    marginBottom: 4,
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
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedFilterChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
  },
  selectedFilterText: {
    color: '#fff',
  },
  listContainer: {
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
  warningSnackbar: {
    backgroundColor: colors.warning,
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