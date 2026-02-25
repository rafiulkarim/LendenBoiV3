import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
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
import 'moment/locale/bn';
import { IdGenerator } from '../../Helpers/Generator/IdGenerator';

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

const ShortageList = ({ navigation }) => {
  const { singOut, myToken, logedInUserInfo } = React.useContext(AuthContext);
  const [shortages, setShortages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editFormVisible, setEditFormVisible] = useState(false);
  const [selectedShortage, setSelectedShortage] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    title: '',
  });

  // Local input states for immediate feedback
  const [localTitle, setLocalTitle] = useState('');
  const [editLocalTitle, setEditLocalTitle] = useState('');

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    id: '',
    title: '',
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

  // Refs for input fields
  const titleInputRef = useRef(null);
  const editTitleInputRef = useRef(null);

  // Flag to prevent focus loss
  const isEditFormVisible = useRef(false);

  useEffect(() => {
    loadShortages();
  }, []);

  const loadShortages = () => {
    setLoading(true);
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM shortages ORDER BY created_at DESC',
        [],
        (_, results) => {
          const rows = results.rows;
          let shortagesData = [];
          for (let i = 0; i < rows.length; i++) {
            shortagesData.push(rows.item(i));
          }
          console.log(shortagesData)
          setShortages(shortagesData);
          setLoading(false);
          setRefreshing(false);
        },
        (_, error) => {
          console.error('Error loading shortages:', error);
          showSnackbar('শর্টেজ লোড করতে ব্যর্থ হয়েছে', 'error');
          setLoading(false);
          setRefreshing(false);
        }
      );
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadShortages();
  };

  // Validate add form
  const validateForm = () => {
    const newErrors = {};
    const titleValue = localTitle || formData.title;

    if (!titleValue.trim()) {
      newErrors.title = 'শিরোনাম প্রয়োজন';
    } else if (titleValue.length > 255) {
      newErrors.title = 'শিরোনাম ২৫৫ অক্ষরের কম হতে হবে';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate edit form
  const validateEditForm = () => {
    const newErrors = {};
    const titleValue = editLocalTitle || editFormData.title;

    if (!titleValue.trim()) {
      newErrors.title = 'শিরোনাম প্রয়োজন';
    } else if (titleValue.length > 255) {
      newErrors.title = 'শিরোনাম ২৫৫ অক্ষরের কম হতে হবে';
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Optimized input handler for create form
  const handleInputChange = (field, value) => {
    // Update local state immediately for smooth typing
    if (field === 'title') {
      setLocalTitle(value);
    }

    // Update form data without requestAnimationFrame to prevent lag
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // FIXED: Optimized input handler for edit form - NO requestAnimationFrame
  const handleEditInputChange = (field, value) => {
    // Update local state immediately for smooth typing
    if (field === 'title') {
      setEditLocalTitle(value);
    }

    // Update edit form data immediately - NO requestAnimationFrame
    setEditFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (editErrors[field]) {
      setEditErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
    });
    setLocalTitle('');
    setErrors({});
  };

  const resetEditForm = () => {
    setEditFormData({
      id: '',
      title: '',
    });
    setEditLocalTitle('');
    setEditErrors({});
    setSelectedShortage(null);
    isEditFormVisible.current = false;
  };

  const handleAddShortage = () => {
    // Get the current value from local state or form data
    const titleValue = localTitle || formData.title;

    // Update form data with local value
    setFormData(prev => ({ ...prev, title: titleValue }));

    if (!validateForm()) {
      return;
    }

    const Id = IdGenerator(logedInUserInfo?.id);

    const newShortage = {
      id: Id,
      title: titleValue,
      status: 'Pending',
    };

    db.transaction((tx) => {
      tx.executeSql(
        'INSERT INTO shortages (id, title, status, shop_id, user_id) VALUES (?, ?, ?, ?, ?)',
        [newShortage.id, newShortage.title, newShortage.status, logedInUserInfo?.shop[0]?.id, logedInUserInfo?.id],
        () => {
          showSnackbar('শর্টেজ সফলভাবে যোগ করা হয়েছে!', 'success');
          resetForm();
          setFormVisible(false);

          // Add to local state immediately
          setShortages(prevShortages => [newShortage, ...prevShortages]);
        },
        (_, error) => {
          console.error('Error adding shortage:', error);
          showSnackbar('শর্টেজ যোগ করতে ব্যর্থ হয়েছে', 'error');
        }
      );
    });
  };

  // FIXED: Handle edit with proper state management
  const handleEditShortage = () => {
    // Get the current value from local state
    const titleValue = editLocalTitle;

    if (!titleValue.trim()) {
      setEditErrors({ title: 'শিরোনাম প্রয়োজন' });
      return;
    }

    if (titleValue.length > 255) {
      setEditErrors({ title: 'শিরোনাম ২৫৫ অক্ষরের কম হতে হবে' });
      return;
    }

    const updatedShortage = {
      id: editFormData.id,
      title: titleValue,
    };

    db.transaction((tx) => {
      tx.executeSql(
        'UPDATE shortages SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [updatedShortage.title, updatedShortage.id],
        () => {
          showSnackbar('শর্টেজ সফলভাবে আপডেট করা হয়েছে!', 'success');
          setEditFormVisible(false);
          resetEditForm();

          // Update local state immediately
          setShortages(prevShortages =>
            prevShortages.map(item =>
              item.id === updatedShortage.id
                ? { ...item, title: updatedShortage.title }
                : item
            )
          );
        },
        (_, error) => {
          console.error('Error updating shortage:', error);
          showSnackbar('শর্টেজ আপডেট করতে ব্যর্থ হয়েছে', 'error');
        }
      );
    });
  };

  const handleToggleStatus = (id, currentStatus) => {
    const newStatus = currentStatus === 'Pending' ? 'Completed' : 'Pending';

    // Immediately update local state for instant UI feedback
    setShortages(prevShortages =>
      prevShortages.map(item =>
        item.id === id
          ? { ...item, status: newStatus }
          : item
      )
    );

    // Update database in background
    db.transaction((tx) => {
      tx.executeSql(
        'UPDATE shortages SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStatus, id],
        () => {
          showSnackbar(
            newStatus === 'Completed'
              ? 'শর্টেজ সম্পন্ন হিসেবে চিহ্নিত করা হয়েছে'
              : 'শর্টেজ পেন্ডিং হিসেবে চিহ্নিত করা হয়েছে',
            'success'
          );
        },
        (_, error) => {
          console.error('Error updating status:', error);
          showSnackbar('স্ট্যাটাস আপডেট করতে ব্যর্থ হয়েছে', 'error');
          // Revert local state on error
          setShortages(prevShortages =>
            prevShortages.map(item =>
              item.id === id
                ? { ...item, status: currentStatus }
                : item
            )
          );
        }
      );
    });
  };

  const handleDeleteShortage = (id) => {
    Alert.alert(
      'শর্টেজ মুছে ফেলুন',
      'আপনি কি নিশ্চিত যে আপনি এই শর্টেজটি মুছে ফেলতে চান?',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'মুছে ফেলুন',
          style: 'destructive',
          onPress: () => {
            // Immediately remove from local state
            setShortages(prevShortages => prevShortages.filter(item => item.id !== id));

            // Delete from database in background
            db.transaction((tx) => {
              tx.executeSql(
                'DELETE FROM shortages WHERE id = ?',
                [id],
                () => {
                  showSnackbar('শর্টেজ সফলভাবে মুছে ফেলা হয়েছে', 'success');
                },
                (_, error) => {
                  console.error('Error deleting shortage:', error);
                  showSnackbar('শর্টেজ মুছে ফেলতে ব্যর্থ হয়েছে', 'error');
                  // Reload to restore deleted item on error
                  loadShortages();
                }
              );
            });
          }
        }
      ]
    );
  };

  // FIXED: Open edit form with proper state initialization
  const openEditForm = (item) => {
    setSelectedShortage(item);
    setEditFormData({
      id: item.id,
      title: item.title,
    });
    setEditLocalTitle(item.title);
    setEditErrors({});
    isEditFormVisible.current = true;
    setEditFormVisible(true);

    // Focus input after dialog is opened
    setTimeout(() => {
      if (editTitleInputRef.current) {
        editTitleInputRef.current.focus();
      }
    }, 100);
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

  // Updated renderAddForm with optimized input
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
        <Dialog.Title style={styles.dialogTitle}>নতুন শর্টেজ যোগ করুন</Dialog.Title>
        <Dialog.ScrollArea style={styles.dialogScrollArea}>
          <View style={styles.dialogContent}>
            {/* Title Input - Optimized */}
            <View style={styles.inputContainer}>
              <TextInput
                ref={titleInputRef}
                label="শিরোনাম *"
                value={localTitle}
                onChangeText={(text) => handleInputChange('title', text)}
                mode="outlined"
                multiline
                numberOfLines={3}
                maxLength={255}
                error={!!errors.title}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                autoCorrect={false}
                spellCheck={false}
                keyboardType="default"
                returnKeyType="done"
                blurOnSubmit={true}
                textAlignVertical="top"
              />
              <HelperText type="error" visible={!!errors.title} style={styles.helperText}>
                {errors.title}
              </HelperText>
              <Text style={styles.charCountText}>
                {(localTitle.length).toLocaleString('bn-BD')}/২৫৫
              </Text>
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
            onPress={handleAddShortage}
            style={styles.saveButton}
            labelStyle={styles.saveButtonLabel}
          >
            শর্টেজ যোগ করুন
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  // FIXED: Updated renderEditForm with proper input handling
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
        <Dialog.Title style={styles.dialogTitle}>শর্টেজ আপডেট করুন</Dialog.Title>
        <Dialog.ScrollArea style={styles.dialogScrollArea}>
          <View style={styles.dialogContent}>
            {/* Title Input - FIXED: No unnecessary re-renders */}
            <View style={styles.inputContainer}>
              <TextInput
                ref={editTitleInputRef}
                label="শিরোনাম *"
                value={editLocalTitle}
                onChangeText={(text) => {
                  // Direct update without any delays
                  setEditLocalTitle(text);
                  setEditFormData(prev => ({ ...prev, title: text }));
                  if (editErrors.title) {
                    setEditErrors(prev => ({ ...prev, title: null }));
                  }
                }}
                mode="outlined"
                multiline
                numberOfLines={3}
                maxLength={255}
                error={!!editErrors.title}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                autoCorrect={false}
                spellCheck={false}
                keyboardType="default"
                returnKeyType="done"
                blurOnSubmit={true}
                textAlignVertical="top"
                // Prevent dialog from closing on blur
                onBlur={() => {
                  if (isEditFormVisible.current) {
                    // Keep focus if form is still visible
                    setTimeout(() => {
                      if (editTitleInputRef.current && editFormVisible) {
                        editTitleInputRef.current.focus();
                      }
                    }, 100);
                  }
                }}
              />
              <HelperText type="error" visible={!!editErrors.title} style={styles.helperText}>
                {editErrors.title}
              </HelperText>
              <Text style={styles.charCountText}>
                {(editLocalTitle.length).toLocaleString('bn-BD')}/২৫৫
              </Text>
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
            onPress={handleEditShortage}
            style={styles.saveButton}
            labelStyle={styles.saveButtonLabel}
          >
            আপডেট করুন
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const renderShortageItem = ({ item }) => (
    <TouchableOpacity
      key={item.id}
      style={styles.shortageItem}
      onPress={() => handleToggleStatus(item.id, item.status)}
      activeOpacity={0.7}
    >
      <View style={styles.shortageContent}>
        <View style={styles.checkboxContainer}>
          <Checkbox
            status={item.status === 'Completed' ? 'checked' : 'unchecked'}
            onPress={() => handleToggleStatus(item.id, item.status)}
            color={colors.primary}
            uncheckedColor={colors.border}
          />
          <Text
            style={[
              styles.shortageTitle,
              item.status === 'Completed' && styles.completedTitle
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
        </View>
        <View style={styles.shortageActions}>
          <TouchableOpacity
            onPress={() => openEditForm(item)}
            style={styles.actionButton}
          >
            <Icon name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteShortage(item.id)}
            style={styles.actionButton}
          >
            <Icon name="delete" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

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
              title="শর্টেজ লিস্ট"
              color="#fff"
            />
          </Appbar.Header>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>শর্টেজ লোড হচ্ছে...</Text>
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
              title="শর্টেজ লিস্ট"
              color="#fff"
            />
            <Appbar.Action
              icon="plus"
              color="#fff"
              onPress={() => {
                setFormVisible(true);
                // Focus input after dialog is opened
                setTimeout(() => {
                  if (titleInputRef.current) {
                    titleInputRef.current.focus();
                  }
                }, 100);
              }}
            />
          </Appbar.Header>

          <View style={styles.content}>
            {/* Stats Card - Compact */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Icon name="format-list-bulleted" size={18} color={colors.primary} />
                <Text style={styles.statNumber}>{shortages.length}</Text>
                <Text style={styles.statLabel}>মোট</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Icon name="clock-outline" size={18} color={colors.warning} />
                <Text style={styles.statNumber}>
                  {shortages.filter(s => s.status === 'Pending').length}
                </Text>
                <Text style={styles.statLabel}>পেন্ডিং</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Icon name="check-circle-outline" size={18} color={colors.success} />
                <Text style={styles.statNumber}>
                  {shortages.filter(s => s.status === 'Completed').length}
                </Text>
                <Text style={styles.statLabel}>সম্পন্ন</Text>
              </View>
            </View>

            {/* Shortages List - Ultra Compact */}
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
              {shortages.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon name="clipboard-text-outline" size={48} color={colors.primaryLight} />
                  <Text style={styles.emptyTitle}>কোনো শর্টেজ নেই</Text>
                  <Text style={styles.emptyText}>
                    আপনার প্রথম শর্টেজ যোগ করতে + বাটনে ক্লিক করুন
                  </Text>
                </View>
              ) : (
                <View style={styles.listContainer}>
                  {shortages.map(item => renderShortageItem({ item }))}
                </View>
              )}
            </ScrollView>
          </View>

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
    elevation: 4,
    height: 56,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textPrimary,
  },
  // Compact Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
    elevation: 1,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  // Ultra Compact List
  listContainer: {
    paddingBottom: 8,
  },
  shortageItem: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 6,
    elevation: 1,
  },
  shortageContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shortageTitle: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '400',
    flex: 1,
    marginLeft: 6,
    lineHeight: 18,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    textDecorationColor: colors.textSecondary,
    color: colors.textSecondary,
  },
  shortageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  actionButton: {
    padding: 4,
    marginLeft: 2,
  },
  // Compact Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  bottomPadding: {
    height: 12,
  },
  // Dialog Styles
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  dialogTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dialogScrollArea: {
    paddingHorizontal: 0,
  },
  dialogContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  dialogActions: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 4,
  },
  inputContainer: {
    marginBottom: 12,
    width: '100%',
  },
  input: {
    backgroundColor: colors.surface,
    fontSize: 14,
    // minHeight: 80,
  },
  helperText: {
    fontSize: 11,
    marginLeft: 8,
    color: colors.error,
  },
  charCountText: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'right',
    marginRight: 8,
    marginTop: 2,
  },
  cancelButton: {
    marginRight: 8,
  },
  cancelButtonLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    elevation: 1,
  },
  saveButtonLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Compact Snackbar
  snackbar: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    borderRadius: 6,
    elevation: 4,
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
  snackbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  snackbarText: {
    color: '#fff',
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
  },
  snackbarActionLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default ShortageList;