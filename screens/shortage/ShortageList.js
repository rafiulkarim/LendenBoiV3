import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
  FlatList,       // ✅ FlatList instead of ScrollView
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
  Checkbox
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { openDatabase } from 'react-native-sqlite-storage';
import AuthContext from '../../context/AuthContext';
import { IdGenerator } from '../../Helpers/Generator/IdGenerator';

const db = openDatabase({ name: 'lenden_boi.db', createFromLocation: 1 });

const PAGE_SIZE = 10;

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
  const { logedInUserInfo } = React.useContext(AuthContext);

  // ── Pagination state ─────────────────────────────────────────────────────
  const [shortages, setShortages] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasMore = shortages.length < totalCount;

  // ── UI state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editFormVisible, setEditFormVisible] = useState(false);
  const [selectedShortage, setSelectedShortage] = useState(null);

  // ── Form errors ───────────────────────────────────────────────────────────
  const [errors, setErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});

  // ── Char counts ───────────────────────────────────────────────────────────
  const [addCharCount, setAddCharCount] = useState(0);
  const [editCharCount, setEditCharCount] = useState(0);

  // ── Snackbar ──────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'info' });

  // ── Refs ──────────────────────────────────────────────────────────────────
  const titleInputRef = useRef(null);
  const editTitleInputRef = useRef(null);
  const addTitleRef = useRef('');
  const editTitleRef = useRef('');
  const editIdRef = useRef('');

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => { initialLoad(); }, []);

  const initialLoad = () => {
    setLoading(true);
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT COUNT(*) as cnt FROM shortages', [],
        (_, result) => {
          const cnt = result.rows.item(0).cnt;
          setTotalCount(cnt);
          fetchPage(0, true);
        },
        (_, error) => { console.error('Count error:', error); setLoading(false); }
      );
    });
  };

  const fetchPage = (pageOffset, reset = false) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM shortages ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [PAGE_SIZE, pageOffset],
        (_, results) => {
          const rows = results.rows;
          const items = [];
          for (let i = 0; i < rows.length; i++) items.push(rows.item(i));

          if (reset) {
            setShortages(items);
            setOffset(items.length);
          } else {
            setShortages(prev => [...prev, ...items]);
            setOffset(prev => prev + items.length);
          }

          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        },
        (_, error) => {
          console.error('Fetch error:', error);
          showSnackbar('শর্টেজ লোড করতে ব্যর্থ হয়েছে', 'error');
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      );
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT COUNT(*) as cnt FROM shortages', [],
        (_, result) => {
          setTotalCount(result.rows.item(0).cnt);
          fetchPage(0, true);
        },
        (_, error) => { console.error('Refresh error:', error); setRefreshing(false); }
      );
    });
  };

  // ✅ FlatList calls this automatically when user scrolls near the bottom
  const handleEndReached = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchPage(offset, false);
  };

  // ── Reset helpers ─────────────────────────────────────────────────────────
  const resetForm = () => {
    addTitleRef.current = '';
    setAddCharCount(0);
    setErrors({});
  };

  const resetEditForm = () => {
    editTitleRef.current = '';
    editIdRef.current = '';
    setEditCharCount(0);
    setEditErrors({});
    setSelectedShortage(null);
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleAddShortage = () => {
    const titleValue = addTitleRef.current.trim();
    if (!titleValue) { setErrors({ title: 'শিরোনাম প্রয়োজন' }); return; }
    if (titleValue.length > 255) { setErrors({ title: 'শিরোনাম ২৫৫ অক্ষরের কম হতে হবে' }); return; }

    const Id = IdGenerator(logedInUserInfo?.id);
    const newShortage = { id: Id, title: titleValue, status: 'Pending' };

    db.transaction((tx) => {
      tx.executeSql(
        'INSERT INTO shortages (id, title, status, shop_id, user_id) VALUES (?, ?, ?, ?, ?)',
        [newShortage.id, newShortage.title, newShortage.status, logedInUserInfo?.shop[0]?.id, logedInUserInfo?.id],
        () => {
          showSnackbar('শর্টেজ সফলভাবে যোগ করা হয়েছে!', 'success');
          resetForm();
          setFormVisible(false);
          setShortages(prev => [newShortage, ...prev]);
          setTotalCount(prev => prev + 1);
          setOffset(prev => prev + 1);
        },
        (_, error) => { console.error('Add error:', error); showSnackbar('শর্টেজ যোগ করতে ব্যর্থ হয়েছে', 'error'); }
      );
    });
  };

  const handleEditShortage = () => {
    const titleValue = editTitleRef.current.trim();
    const id = editIdRef.current;
    if (!titleValue) { setEditErrors({ title: 'শিরোনাম প্রয়োজন' }); return; }
    if (titleValue.length > 255) { setEditErrors({ title: 'শিরোনাম ২৫৫ অক্ষরের কম হতে হবে' }); return; }

    db.transaction((tx) => {
      tx.executeSql(
        'UPDATE shortages SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [titleValue, id],
        () => {
          showSnackbar('শর্টেজ সফলভাবে আপডেট করা হয়েছে!', 'success');
          setEditFormVisible(false);
          resetEditForm();
          setShortages(prev =>
            prev.map(item => item.id === id ? { ...item, title: titleValue } : item)
          );
        },
        (_, error) => { console.error('Update error:', error); showSnackbar('শর্টেজ আপডেট করতে ব্যর্থ হয়েছে', 'error'); }
      );
    });
  };

  const handleToggleStatus = (id, currentStatus) => {
    const newStatus = currentStatus === 'Pending' ? 'Completed' : 'Pending';
    setShortages(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));

    db.transaction((tx) => {
      tx.executeSql(
        'UPDATE shortages SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStatus, id],
        () => showSnackbar(
          newStatus === 'Completed' ? 'শর্টেজ সম্পন্ন হিসেবে চিহ্নিত করা হয়েছে' : 'শর্টেজ পেন্ডিং হিসেবে চিহ্নিত করা হয়েছে',
          'success'
        ),
        (_, error) => {
          console.error('Toggle error:', error);
          showSnackbar('স্ট্যাটাস আপডেট করতে ব্যর্থ হয়েছে', 'error');
          setShortages(prev => prev.map(item => item.id === id ? { ...item, status: currentStatus } : item));
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
          text: 'মুছে ফেলুন', style: 'destructive',
          onPress: () => {
            setShortages(prev => prev.filter(item => item.id !== id));
            setTotalCount(prev => prev - 1);
            setOffset(prev => Math.max(0, prev - 1));

            db.transaction((tx) => {
              tx.executeSql(
                'DELETE FROM shortages WHERE id = ?', [id],
                () => showSnackbar('শর্টেজ সফলভাবে মুছে ফেলা হয়েছে', 'success'),
                (_, error) => {
                  console.error('Delete error:', error);
                  showSnackbar('শর্টেজ মুছে ফেলতে ব্যর্থ হয়েছে', 'error');
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
    setSelectedShortage(item);
    editTitleRef.current = item.title;
    editIdRef.current = item.id;
    setEditCharCount(item.title.length);
    setEditErrors({});
    setEditFormVisible(true);
    setTimeout(() => { if (editTitleInputRef.current) editTitleInputRef.current.focus(); }, 100);
  };

  // ── Snackbar ──────────────────────────────────────────────────────────────
  const showSnackbar = (message, type = 'info') => setSnackbar({ visible: true, message, type });
  const dismissSnackbar = () => setSnackbar(prev => ({ ...prev, visible: false }));
  const getSnackbarStyle = () => {
    switch (snackbar.type) {
      case 'success': return styles.successSnackbar;
      case 'error': return styles.errorSnackbar;
      case 'warning': return styles.warningSnackbar;
      default: return styles.infoSnackbar;
    }
  };

  // ── FlatList render helpers ───────────────────────────────────────────────

  // ✅ renderItem for FlatList — receives { item } not item directly
  const renderItem = ({ item }) => (
    <TouchableOpacity
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
            style={[styles.shortageTitle, item.status === 'Completed' && styles.completedTitle]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
        </View>
        <View style={styles.shortageActions}>
          <TouchableOpacity onPress={() => openEditForm(item)} style={styles.actionButton}>
            <Icon name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteShortage(item.id)} style={styles.actionButton}>
            <Icon name="delete" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ✅ ListHeaderComponent — stats bar always at top of list
  const ListHeader = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statBox}>
        <Icon name="format-list-bulleted" size={18} color={colors.primary} />
        <Text style={styles.statNumber}>{totalCount}</Text>
        <Text style={styles.statLabel}>মোট</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statBox}>
        <Icon name="clock-outline" size={18} color={colors.warning} />
        <Text style={styles.statNumber}>{shortages.filter(s => s.status === 'Pending').length}</Text>
        <Text style={styles.statLabel}>পেন্ডিং</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statBox}>
        <Icon name="check-circle-outline" size={18} color={colors.success} />
        <Text style={styles.statNumber}>{shortages.filter(s => s.status === 'Completed').length}</Text>
        <Text style={styles.statLabel}>সম্পন্ন</Text>
      </View>
    </View>
  );

  // ✅ ListFooterComponent — spinner while loading more, or "all seen" text
  const ListFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.loadMoreContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadMoreText}>লোড হচ্ছে...</Text>
        </View>
      );
    }
    if (!hasMore && shortages.length > 0) {
      return <Text style={styles.endText}>── সব {totalCount}টি দেখা হয়েছে ──</Text>;
    }
    return null;
  };

  // ✅ ListEmptyComponent — shown when data array is empty
  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="clipboard-text-outline" size={48} color={colors.primaryLight} />
      <Text style={styles.emptyTitle}>কোনো শর্টেজ নেই</Text>
      <Text style={styles.emptyText}>আপনার প্রথম শর্টেজ যোগ করতে + বাটনে ক্লিক করুন</Text>
    </View>
  );

  // ── Forms ─────────────────────────────────────────────────────────────────
  const renderAddForm = () => (
    <Portal>
      <Dialog
        visible={formVisible}
        onDismiss={() => { setFormVisible(false); resetForm(); }}
        style={styles.dialog}
      >
        <Dialog.Title style={styles.dialogTitle}>নতুন শর্টেজ যোগ করুন</Dialog.Title>
        <Dialog.ScrollArea style={styles.dialogScrollArea}>
          <View style={styles.dialogContent}>
            <View style={styles.inputContainer}>
              <TextInput
                ref={titleInputRef}
                label="শিরোনাম *"
                defaultValue=""
                onChangeText={(text) => {
                  addTitleRef.current = text;
                  setAddCharCount(text.length);
                  if (errors.title) setErrors({});
                }}
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
                returnKeyType="done"
                blurOnSubmit={true}
                textAlignVertical="top"
              />
              <HelperText type="error" visible={!!errors.title} style={styles.helperText}>
                {errors.title}
              </HelperText>
              <Text style={styles.charCountText}>{addCharCount}/২৫৫</Text>
            </View>
          </View>
        </Dialog.ScrollArea>
        <Dialog.Actions style={styles.dialogActions}>
          <Button onPress={() => { setFormVisible(false); resetForm(); }} style={styles.cancelButton} labelStyle={styles.cancelButtonLabel}>
            বাতিল
          </Button>
          <Button mode="contained" onPress={handleAddShortage} style={styles.saveButton} labelStyle={styles.saveButtonLabel}>
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
        onDismiss={() => { setEditFormVisible(false); resetEditForm(); }}
        style={styles.dialog}
      >
        <Dialog.Title style={styles.dialogTitle}>শর্টেজ আপডেট করুন</Dialog.Title>
        <Dialog.ScrollArea style={styles.dialogScrollArea}>
          <View style={styles.dialogContent}>
            <View style={styles.inputContainer}>
              <TextInput
                key={selectedShortage?.id}
                ref={editTitleInputRef}
                label="শিরোনাম *"
                defaultValue={selectedShortage?.title ?? ''}
                onChangeText={(text) => {
                  editTitleRef.current = text;
                  setEditCharCount(text.length);
                  if (editErrors.title) setEditErrors({});
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
                returnKeyType="done"
                blurOnSubmit={true}
                textAlignVertical="top"
              />
              <HelperText type="error" visible={!!editErrors.title} style={styles.helperText}>
                {editErrors.title}
              </HelperText>
              <Text style={styles.charCountText}>{editCharCount}/২৫৫</Text>
            </View>
          </View>
        </Dialog.ScrollArea>
        <Dialog.Actions style={styles.dialogActions}>
          <Button onPress={() => { setEditFormVisible(false); resetEditForm(); }} style={styles.cancelButton} labelStyle={styles.cancelButtonLabel}>
            বাতিল
          </Button>
          <Button mode="contained" onPress={handleEditShortage} style={styles.saveButton} labelStyle={styles.saveButtonLabel}>
            আপডেট করুন
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <Appbar.Header style={styles.header}>
            <Appbar.BackAction color="#fff" onPress={() => navigation.goBack()} />
            <Appbar.Content title="শর্টেজ লিস্ট" color="#fff" />
          </Appbar.Header>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>শর্টেজ লোড হচ্ছে...</Text>
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <Provider>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <Appbar.Header style={styles.header}>
            <Appbar.BackAction color="#fff" onPress={() => navigation.goBack()} />
            <Appbar.Content title="শর্টেজ লিস্ট" color="#fff" />
            <Appbar.Action
              icon="plus"
              color="#fff"
              onPress={() => {
                setFormVisible(true);
                setTimeout(() => { if (titleInputRef.current) titleInputRef.current.focus(); }, 100);
              }}
            />
          </Appbar.Header>

          <View style={styles.content}>
            {/* ✅ FlatList replaces ScrollView + manual map */}
            <FlatList
              data={shortages}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}

              // ── Pagination ─────────────────────────────────────────────
              onEndReached={handleEndReached}        // fires when near bottom
              onEndReachedThreshold={0.3}            // trigger at 30% from bottom

              // ── Pull-to-refresh ────────────────────────────────────────
              refreshing={refreshing}
              onRefresh={onRefresh}

              // ── Header / Footer / Empty ────────────────────────────────
              ListHeaderComponent={<ListHeader />}
              ListFooterComponent={<ListFooter />}
              ListEmptyComponent={<ListEmpty />}

              // ── Performance ────────────────────────────────────────────
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.flatListContent}
              removeClippedSubviews={true}
              initialNumToRender={PAGE_SIZE}
              maxToRenderPerBatch={PAGE_SIZE}
              windowSize={5}
            />
          </View>

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
  header: { backgroundColor: colors.primary, elevation: 4, height: 56 },
  content: { flex: 1, padding: 12 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 14, color: colors.textPrimary },

  // ✅ FlatList content container — ensures empty state is centered
  flatListContent: { flexGrow: 1, paddingBottom: 8 },

  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
    elevation: 1,
  },
  statBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statNumber: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginTop: 2 },
  statLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },
  statDivider: { width: 1, height: '70%', backgroundColor: colors.border, alignSelf: 'center' },

  shortageItem: { backgroundColor: colors.surface, borderRadius: 8, marginBottom: 6, elevation: 1 },
  shortageContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  shortageTitle: { fontSize: 14, color: colors.textPrimary, fontWeight: '400', flex: 1, marginLeft: 6, lineHeight: 18 },
  completedTitle: { textDecorationLine: 'line-through', color: colors.textSecondary },
  shortageActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
  actionButton: { padding: 4, marginLeft: 2 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginTop: 12, marginBottom: 4 },
  emptyText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },

  loadMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  loadMoreText: { fontSize: 13, color: colors.textSecondary },
  endText: { textAlign: 'center', fontSize: 11, color: colors.textSecondary, paddingVertical: 16 },

  dialog: { backgroundColor: colors.surface, borderRadius: 16 },
  dialogTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  dialogScrollArea: { paddingHorizontal: 0 },
  dialogContent: { paddingHorizontal: 20, paddingVertical: 4 },
  dialogActions: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 4 },
  inputContainer: { marginBottom: 12, width: '100%' },
  input: { backgroundColor: colors.surface, fontSize: 14 },
  helperText: { fontSize: 11, marginLeft: 8, color: colors.error },
  charCountText: { fontSize: 10, color: colors.textSecondary, textAlign: 'right', marginRight: 8, marginTop: 2 },
  cancelButton: { marginRight: 8 },
  cancelButtonLabel: { color: colors.textSecondary, fontSize: 14 },
  saveButton: { backgroundColor: colors.primary, borderRadius: 6, elevation: 1 },
  saveButtonLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  snackbar: { position: 'absolute', bottom: 12, left: 12, right: 12, borderRadius: 6, elevation: 4 },
  successSnackbar: { backgroundColor: colors.success },
  errorSnackbar: { backgroundColor: colors.error },
  infoSnackbar: { backgroundColor: colors.info },
  warningSnackbar: { backgroundColor: colors.warning },
  snackbarContent: { flexDirection: 'row', alignItems: 'center' },
  snackbarText: { color: '#fff', fontSize: 13, marginLeft: 6, flex: 1 },
  snackbarActionLabel: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
});

export default ShortageList;