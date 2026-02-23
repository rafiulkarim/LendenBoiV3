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

const ShortageList = ({ navigation }) => {
  const { singOut, myToken, logedInUserInfo } = React.useContext(AuthContext);
  const [shortages, setShortages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editFormVisible, setEditFormVisible] = useState(false);
  const [selectedShortage, setSelectedShortage] = useState(null);

  // Form state - removed status
  const [formData, setFormData] = useState({
    id: '',
    title: '',
  });

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

  useEffect(() => {
    loadShortages();
  }, []);

  const generateId = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `SH-${timestamp}-${randomStr}`.toUpperCase();
  };

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

    if (!formData.title.trim()) {
      newErrors.title = 'শিরোনাম প্রয়োজন';
    } else if (formData.title.length > 255) {
      newErrors.title = 'শিরোনাম ২৫৫ অক্ষরের কম হতে হবে';
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

  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
    });
    setErrors({});
  };

  const resetEditForm = () => {
    setEditFormData({
      id: '',
      title: '',
    });
    setEditErrors({});
    setSelectedShortage(null);
  };

  const handleAddShortage = () => {
    if (!validateForm()) {
      return;
    }

    const Id = IdGenerator(logedInUserInfo?.id);

    const newShortage = {
      ...formData,
      id: Id,
      status: 'Pending', // Default status
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

  const handleEditShortage = () => {
    if (!validateEditForm()) {
      return;
    }

    const updatedShortage = {
      ...editFormData,
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

  const openEditForm = (item) => {
    setSelectedShortage(item);
    setEditFormData({
      id: item.id,
      title: item.title,
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
            {/* Title Input */}
            <View style={styles.inputContainer}>
              <TextInput
                label="শিরোনাম *"
                value={formData.title}
                onChangeText={(text) => handleInputChange('title', text)}
                mode="outlined"
                multiline
                numberOfLines={3}
                maxLength={255}
                error={!!errors.title}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />
              <HelperText type="error" visible={!!errors.title} style={styles.helperText}>
                {errors.title}
              </HelperText>
              <Text style={styles.charCountText}>
                {(formData.title.length).toLocaleString('bn-BD')}/২৫৫
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
        <Dialog.Title style={styles.dialogTitle}>শর্টেজ সম্পাদনা করুন</Dialog.Title>
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
                numberOfLines={3}
                maxLength={255}
                error={!!editErrors.title}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />
              <HelperText type="error" visible={!!editErrors.title} style={styles.helperText}>
                {editErrors.title}
              </HelperText>
              <Text style={styles.charCountText}>
                {(editFormData.title.length).toLocaleString('bn-BD')}/২৫৫
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
              onPress={() => setFormVisible(true)}
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

export default ShortageList;