import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ScrollView, Modal, FlatList, ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { openDatabase } from 'react-native-sqlite-storage';

const db = openDatabase({ name: 'lenden_boi.db', createFromLocation: 1 });

// ────────────────────────────────────────────────────────────────────────────
// CONFIGURATION - Adjust these as needed
// ────────────────────────────────────────────────────────────────────────────
const CONFIG = {
  // Date format: 'YYYY-MM-DD' or 'DD-MM-YYYY' or timestamp
  dateFormat: 'YYYY-MM-DD',

  // Currency symbol
  currencySymbol: '৳',

  // Decimal places for amounts (set to 0 to remove decimals)
  decimalPlaces: 0,

  // Enable/disable features
  showTimeInDateColumn: false, // Set to false for grouped view
  showComments: false, // Set to false for grouped view
  showTransactionTypeIndicator: true,
  groupByDate: true, // ENABLED - Group transactions by date

  // Table column widths (adjust as needed)
  columnWidths: {
    date: 100,
    dilam: 100,
    nilam: 100,
    balance: 100,
  },

  // Colors - easily customizable
  colors: {
    primary: '#00A8A8',
    primaryLight: '#4DC9C9',
    primaryLighter: '#80D9D9',
    primaryLightest: '#E6F7F7',
    primaryDark: '#008787',
    primaryDarker: '#006666',
    success: '#28a745',
    successLight: '#d4edda',
    error: '#dc3545',
    errorLight: '#fdecea',
    background: '#f8f9fa',
    surface: '#ffffff',
    textPrimary: '#1A535C',
    textSecondary: '#6c757d',
    border: '#e0e0e0',
    warning: '#ffc107',
    warningLight: '#fff3cd',
  },

  // Month and day names (shortened)
  months: {
    short: ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন',
      'জুলাই', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'],
    full: ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']
  },

  weekDays: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'],

  // Transaction type labels
  transactionLabels: {
    purchase: 'ক্রয়',
    receive: 'প্রাপ্তি',
    sale: 'বিক্রয়',
    payment: 'পেমেন্ট',
  },

  // Which transaction types are considered "Dilam" (gave) and "Nilam" (took)
  dilamTypes: ['sale', 'payment'],
  nilamTypes: ['purchase', 'receive'],

  // Table headers
  tableHeaders: {
    date: 'তারিখ',
    description: 'বিবরণ',
    dilam: 'দিলাম',
    nilam: 'পেলাম',
    balance: 'ব্যালেন্স'
  },

  // Empty state messages
  emptyState: {
    title: 'কোন লেনদেন নেই।',
    subtitle: '{month} {year} এ কোন লেনদেন পাওয়া যায়নি'
  },

  // Date format for display (shortened - e.g., "5 এপ্রি")
  dateDisplayFormat: 'D MMM', // e.g., "5 এপ্রি"
};

// ────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ────────────────────────────────────────────────────────────────────────────

const isNilam = (type) => {
  return CONFIG.nilamTypes.includes(type?.toLowerCase());
};

const isDilam = (type) => {
  return CONFIG.dilamTypes.includes(type?.toLowerCase());
};

const typeLabel = (type) => {
  return CONFIG.transactionLabels[type?.toLowerCase()] ?? type;
};

const formatAmount = (val) => {
  const n = parseFloat(val);
  if (isNaN(n)) return `0${CONFIG.decimalPlaces > 0 ? '.' + '0'.repeat(CONFIG.decimalPlaces) : ''}`;
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: CONFIG.decimalPlaces,
    maximumFractionDigits: CONFIG.decimalPlaces
  });
};

const formatDate = (dateValue) => {
  let d;
  if (typeof dateValue === 'number') {
    d = new Date(dateValue);
  } else if (typeof dateValue === 'string') {
    if (dateValue.includes('-')) {
      d = new Date(dateValue);
    } else {
      d = new Date(parseInt(dateValue));
    }
  } else {
    d = new Date(dateValue);
  }

  if (isNaN(d.getTime())) return 'Invalid Date';

  // Format: "5 এপ্রি" (shortened, no year)
  const day = d.getDate();
  const month = CONFIG.months.short[d.getMonth()];

  return `${day} ${month}`;
};

const getDateOnly = (dateValue) => {
  let d;
  if (typeof dateValue === 'number') {
    d = new Date(dateValue);
  } else if (typeof dateValue === 'string') {
    if (dateValue.includes('-')) {
      d = new Date(dateValue);
    } else {
      d = new Date(parseInt(dateValue));
    }
  } else {
    d = new Date(dateValue);
  }

  if (isNaN(d.getTime())) return null;

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDateRangeForMonth = (year, month) => {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
  return { startDate, endDate };
};

// Group transactions by date and calculate daily totals
const groupTransactionsByDate = (transactions) => {
  const grouped = {};

  transactions.forEach(transaction => {
    const dateKey = getDateOnly(transaction.transaction_date);
    if (!dateKey) return;

    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: dateKey,
        dateFormatted: formatDate(transaction.transaction_date),
        dilamTotal: 0,
        nilamTotal: 0,
        transactions: [],
        balance: 0
      };
    }

    const amount = parseFloat(transaction.amount) || 0;

    if (isDilam(transaction.transaction_type)) {
      grouped[dateKey].dilamTotal += amount;
    }

    if (isNilam(transaction.transaction_type)) {
      grouped[dateKey].nilamTotal += amount;
    }

    grouped[dateKey].transactions.push(transaction);
  });

  // Calculate daily balance and convert to array
  const groupedArray = Object.values(grouped);
  groupedArray.forEach(day => {
    day.balance = day.nilamTotal - day.dilamTotal;
  });

  // Sort by date (newest first)
  groupedArray.sort((a, b) => new Date(b.date) - new Date(a.date));

  return groupedArray;
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function OwnerReport({ navigation }) {
  const { logedInUserInfo } = useContext(AuthContext);
  const currentYear = new Date().getFullYear();

  // State variables
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showYearModal, setShowYearModal] = useState(false);
  const [ledgers, setLedgers] = useState([]);
  const [groupedData, setGroupedData] = useState([]);
  const [expandedDates, setExpandedDates] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate year list
  const yearRange = {
    start: currentYear - 2,
    end: currentYear + 0
  };

  const years = [];
  for (let i = yearRange.start; i <= yearRange.end; i++) {
    years.push(i);
  }

  // Fetch ledgers when month or year changes
  useEffect(() => {
    fetchLedgers();
  }, [monthIndex, selectedYear]);

  // Update grouped data when ledgers change
  useEffect(() => {
    if (CONFIG.groupByDate && ledgers.length > 0) {
      const grouped = groupTransactionsByDate(ledgers);
      setGroupedData(grouped);
    } else {
      setGroupedData([]);
    }
  }, [ledgers]);

  const fetchLedgers = () => {
    setLoading(true);
    setError(null);

    const { startDate, endDate } = getDateRangeForMonth(selectedYear, monthIndex);
    const shopId = logedInUserInfo?.shop?.[0]?.id;

    if (!shopId) {
      console.error('Shop ID not found');
      setError('দোকানের তথ্য পাওয়া যায়নি');
      setLoading(false);
      return;
    }

    db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM ledgers 
         WHERE shop_id = ? 
         AND date(transaction_date) BETWEEN ? AND ? 
         ORDER BY transaction_date DESC`,
        [shopId, startDate, endDate],
        (tx, results) => {
          const rows = [];
          console.log(results.rows.raw())
          for (let i = 0; i < results.rows.length; i++) {
            rows.push(results.rows.item(i));
          }
          setLedgers(rows);
          setLoading(false);
        },
        (tx, error) => {
          console.error('Query failed:', error.message);
          setError('ডাটা লোড করতে ব্যর্থ হয়েছে');
          setLedgers([]);
          setLoading(false);
          return false;
        }
      );
    });
  };

  // Calculate monthly totals
  const totalDilam = ledgers.filter(r => isDilam(r.transaction_type))
    .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  const totalNilam = ledgers.filter(r => isNilam(r.transaction_type))
    .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  const netBalance = totalNilam - totalDilam;

  // Toggle expand/collapse for date groups
  const toggleExpand = (dateKey) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  // Transaction Row Component (for expanded view)
  const TransactionRow = ({ item, index }) => {
    const dilam = isDilam(item.transaction_type);
    const nilam = isNilam(item.transaction_type);

    return (
      <View style={[
        styles.subRow,
        index % 2 === 0 ? styles.subRowEven : styles.subRowOdd
      ]}>
        <View style={styles.subRowIcon}>
          <Icon
            name={dilam ? "arrow-up" : "arrow-down"}
            size={10}
            color={dilam ? CONFIG.colors.error : CONFIG.colors.success}
          />
        </View>
        <View style={styles.subRowType}>
          <Text style={styles.subRowTypeText}>{typeLabel(item.transaction_type)}</Text>
        </View>
        <View style={styles.subRowAmount}>
          <Text style={[
            styles.subRowAmountText,
            dilam ? styles.dilamText : styles.nilamText
          ]}>
            {CONFIG.currencySymbol}{formatAmount(item.amount)}
          </Text>
        </View>
        {CONFIG.showComments && !!item.comments && (
          <View style={styles.subRowComment}>
            <Text style={styles.subRowCommentText} numberOfLines={1}>
              {item.comments}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Daily Group Component
  const DailyGroup = ({ group }) => {
    const isExpanded = expandedDates[group.date];
    const totalTransactions = group.transactions.length;

    return (
      <View style={styles.groupContainer}>
        {/* Date Header - Tappable */}
        <TouchableOpacity
          style={styles.groupHeader}
          onPress={() => toggleExpand(group.date)}
          activeOpacity={0.7}
        >
          <View style={styles.groupHeaderLeft}>
            <Icon
              name={isExpanded ? "chevron-down" : "chevron-forward"}
              size={18}
              color={CONFIG.colors.textPrimary}
            />
            <Text style={styles.groupDate}>{group.dateFormatted}</Text>
          </View>

          <View style={styles.groupHeaderRight}>
            {/* Dilam Amount - Always show, even if 0 */}
            <View style={styles.groupDilam}>
              <Icon name="arrow-up" size={10} color={CONFIG.colors.error} />
              <Text style={styles.groupDilamText}>
                {CONFIG.currencySymbol}{formatAmount(group.dilamTotal)}
              </Text>
            </View>

            {/* Nilam Amount - Always show, even if 0 */}
            <View style={styles.groupNilam}>
              <Icon name="arrow-down" size={10} color={CONFIG.colors.success} />
              <Text style={styles.groupNilamText}>
                {CONFIG.currencySymbol}{formatAmount(group.nilamTotal)}
              </Text>
            </View>

            {/* Daily Balance - No plus/minus sign */}
            <View style={[
              styles.groupBalance,
              group.balance >= 0 ? styles.positiveBalance : styles.negativeBalance
            ]}>
              <Text style={styles.groupBalanceText}>
                {CONFIG.currencySymbol}{formatAmount(Math.abs(group.balance))}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded Transactions List */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.subHeader}>
              <Text style={styles.subHeaderText}>বিবরণ</Text>
              <Text style={styles.subHeaderAmount}>টাকা</Text>
            </View>
            {group.transactions.map((transaction, idx) => (
              <TransactionRow key={transaction.id || idx} item={transaction} index={idx} />
            ))}
          </View>
        )}
      </View>
    );
  };

  // Year Modal Component
  const YearModal = () => (
    <Modal
      visible={showYearModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowYearModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowYearModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>বছর নির্বাচন করুন</Text>
            <TouchableOpacity onPress={() => setShowYearModal(false)}>
              <Icon name="close" size={24} color={CONFIG.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {years.map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.yearItem,
                  selectedYear === year && styles.selectedYearItem
                ]}
                onPress={() => {
                  setSelectedYear(year);
                  setShowYearModal(false);
                }}
              >
                <Text style={[
                  styles.yearText,
                  selectedYear === year && styles.selectedYearText
                ]}>
                  {year}
                </Text>
                {selectedYear === year && (
                  <Icon name="checkmark" size={20} color={CONFIG.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Summary Cards Component - No plus/minus signs
  const SummaryCards = () => (
    <View style={styles.summaryContainer}>
      <View style={[styles.summaryCard, { backgroundColor: CONFIG.colors.errorLight }]}>
        <Icon name="arrow-up-circle-outline" size={18} color={CONFIG.colors.error} />
        <Text style={styles.summaryLabel}>মোট দিলাম</Text>
        <Text style={[styles.summaryValue, { color: CONFIG.colors.error, textAlign: 'right' }]}>
          {CONFIG.currencySymbol}{formatAmount(totalDilam)}
        </Text>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: CONFIG.colors.successLight }]}>
        <Icon name="arrow-down-circle-outline" size={18} color={CONFIG.colors.success} />
        <Text style={styles.summaryLabel}>মোট পেলাম</Text>
        <Text style={[styles.summaryValue, { color: CONFIG.colors.success, textAlign: 'right' }]}>
          {CONFIG.currencySymbol}{formatAmount(totalNilam)}
        </Text>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: CONFIG.colors.primaryLightest }]}>
        <Icon name="calculator-outline" size={18} color={CONFIG.colors.primary} />
        <Text style={styles.summaryLabel}>মাসিক নেট ব্যালেন্স</Text>
        <Text style={[
          styles.summaryValue,
          { color: netBalance >= 0 ? CONFIG.colors.success : CONFIG.colors.error, textAlign: 'right' }
        ]}>
          {CONFIG.currencySymbol}{formatAmount(Math.abs(netBalance))}
        </Text>
      </View>
    </View>
  );

  // Table Header Component for Grouped View
  const GroupedTableHeader = () => (
    <View style={styles.groupedTableHeader}>
      <Text style={[styles.groupedHeaderText, styles.headerDate]}>তারিখ</Text>
      <Text style={[styles.groupedHeaderText, styles.headerDilam]}>দিলাম</Text>
      <Text style={[styles.groupedHeaderText, styles.headerNilam]}>পেলাম</Text>
      <Text style={[styles.groupedHeaderText, styles.headerBalance]}>ব্যালেন্স</Text>
    </View>
  );

  // Empty State Component
  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="document-text-outline" size={72} color={CONFIG.colors.primaryLighter} />
      <Text style={styles.emptyText}>{CONFIG.emptyState.title}</Text>
      <Text style={styles.emptySubText}>
        {CONFIG.emptyState.subtitle
          .replace('{month}', CONFIG.months.full[monthIndex])
          .replace('{year}', selectedYear)}
      </Text>
    </View>
  );

  // Error State Component
  const ErrorState = () => (
    <View style={styles.emptyState}>
      <Icon name="alert-circle-outline" size={72} color={CONFIG.colors.error} />
      <Text style={styles.emptyText}>ত্রুটি!</Text>
      <Text style={styles.emptySubText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchLedgers}>
        <Text style={styles.retryButtonText}>পুনরায় চেষ্টা করুন</Text>
      </TouchableOpacity>
    </View>
  );

  // Main Render
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={CONFIG.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>মালিকের রিপোর্ট (দৈনিক)</Text>
        <TouchableOpacity onPress={fetchLedgers} style={styles.refreshBtn}>
          <Icon name="refresh-outline" size={20} color={CONFIG.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.pill} onPress={() => setShowYearModal(true)}>
          <Text style={styles.pillText}>{selectedYear}</Text>
          <Icon name="chevron-down" size={14} color={CONFIG.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.monthSelector}>
          <Icon name="calendar-outline" size={14} color={CONFIG.colors.textPrimary} />
          <Text style={styles.monthText}>{CONFIG.months.full[monthIndex]}</Text>
          <TouchableOpacity
            onPress={() => setMonthIndex(i => Math.max(0, i - 1))}
            style={styles.arrowBtn}
          >
            <Icon name="chevron-back" size={14} color={CONFIG.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMonthIndex(i => Math.min(11, i + 1))}
            style={styles.arrowBtn}
          >
            <Icon name="chevron-forward" size={14} color={CONFIG.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Year Modal */}
      <YearModal />

      {/* Summary Cards */}
      <SummaryCards />

      {/* Grouped View Header */}
      <GroupedTableHeader />

      {/* Content - Grouped by Date */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={CONFIG.colors.primary} />
        </View>
      ) : error ? (
        <ErrorState />
      ) : groupedData.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={groupedData}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => <DailyGroup group={item} />}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// STYLES
// ────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CONFIG.colors.background
  },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: CONFIG.colors.border,
    backgroundColor: CONFIG.colors.surface,
  },
  backBtn: {
    marginRight: 12,
    padding: 2
  },
  refreshBtn: {
    marginLeft: 'auto',
    padding: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: CONFIG.colors.textPrimary
  },

  // filter
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CONFIG.colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: CONFIG.colors.border,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CONFIG.colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 10,
    backgroundColor: CONFIG.colors.surface,
  },
  pillText: {
    fontSize: 13,
    color: CONFIG.colors.textPrimary,
    marginRight: 4,
    fontWeight: '500'
  },
  monthSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CONFIG.colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: CONFIG.colors.surface,
  },
  monthText: {
    flex: 1,
    fontSize: 13,
    color: CONFIG.colors.textPrimary,
    marginLeft: 6,
    marginRight: 4,
    fontWeight: '500'
  },
  arrowBtn: {
    borderWidth: 0.5,
    borderColor: CONFIG.colors.primaryLight,
    borderRadius: 4,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },

  // modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: CONFIG.colors.surface,
    borderRadius: 16,
    width: '80%',
    maxHeight: '70%',
    padding: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: CONFIG.colors.primaryLightest,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: CONFIG.colors.textPrimary
  },
  yearItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedYearItem: {
    backgroundColor: CONFIG.colors.primaryLightest
  },
  yearText: {
    fontSize: 16,
    color: CONFIG.colors.textPrimary
  },
  selectedYearText: {
    color: CONFIG.colors.primary,
    fontWeight: '600'
  },

  // summary
  summaryContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8
  },
  summaryCard: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 3,
    elevation: 1,
  },
  summaryLabel: {
    fontSize: 10,
    color: CONFIG.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    width: '100%',
  },

  // grouped table header
  groupedTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: CONFIG.colors.primary,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
  },
  groupedHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerDate: {
    flex: 2,
    textAlign: 'left',
  },
  headerDilam: {
    flex: 1.5,
    textAlign: 'right',
  },
  headerNilam: {
    flex: 1.5,
    textAlign: 'right',
  },
  headerBalance: {
    flex: 1.5,
    textAlign: 'right',
  },

  // group container
  groupContainer: {
    backgroundColor: CONFIG.colors.surface,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: CONFIG.colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: CONFIG.colors.border,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  groupDate: {
    fontSize: 14,
    fontWeight: '600',
    color: CONFIG.colors.textPrimary,
    marginLeft: 8,
    textAlign: 'left',
  },
  transactionCount: {
    backgroundColor: CONFIG.colors.primaryLightest,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  transactionCountText: {
    fontSize: 10,
    color: CONFIG.colors.primary,
    fontWeight: '500',
  },
  groupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 3,
    justifyContent: 'flex-end',
    gap: 8,
  },
  groupDilam: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CONFIG.colors.errorLight,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 70,
    justifyContent: 'flex-end',
  },
  groupDilamText: {
    fontSize: 12,
    fontWeight: '600',
    color: CONFIG.colors.error,
    marginLeft: 3,
    textAlign: 'right',
  },
  groupNilam: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CONFIG.colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 70,
    justifyContent: 'flex-end',
  },
  groupNilamText: {
    fontSize: 12,
    fontWeight: '600',
    color: CONFIG.colors.success,
    marginLeft: 3,
    textAlign: 'right',
  },
  groupBalance: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 70,
    alignItems: 'flex-end',
  },
  positiveBalance: {
    backgroundColor: CONFIG.colors.successLight,
  },
  negativeBalance: {
    backgroundColor: CONFIG.colors.errorLight,
  },
  groupBalanceText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
  },

  // expanded content
  expandedContent: {
    backgroundColor: '#fafafa',
    paddingTop: 8,
    paddingBottom: 8,
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 8,
    marginBottom: 4,
    borderRadius: 4,
  },
  subHeaderText: {
    fontSize: 11,
    fontWeight: '500',
    color: CONFIG.colors.textSecondary,
    textAlign: 'left',
    flex: 2,
  },
  subHeaderAmount: {
    fontSize: 11,
    fontWeight: '500',
    color: CONFIG.colors.textSecondary,
    textAlign: 'right',
    flex: 1,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 6,
  },
  subRowEven: {
    backgroundColor: '#ffffff',
  },
  subRowOdd: {
    backgroundColor: '#f5f5f5',
  },
  subRowIcon: {
    width: 24,
    alignItems: 'center',
  },
  subRowType: {
    flex: 2,
  },
  subRowTypeText: {
    fontSize: 12,
    color: CONFIG.colors.textPrimary,
    textAlign: 'left',
  },
  subRowAmount: {
    flex: 1,
    alignItems: 'flex-end',
  },
  subRowAmountText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
  },
  subRowComment: {
    flex: 1.5,
    marginLeft: 8,
  },
  subRowCommentText: {
    fontSize: 10,
    color: CONFIG.colors.textSecondary,
    textAlign: 'left',
  },
  dilamText: {
    color: CONFIG.colors.error,
  },
  nilamText: {
    color: CONFIG.colors.success,
  },

  // list
  listContainer: {
    paddingBottom: 20,
    paddingTop: 4,
  },

  // states
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80
  },
  emptyText: {
    fontSize: 14,
    color: CONFIG.colors.textPrimary,
    marginTop: 12,
    fontWeight: '500'
  },
  emptySubText: {
    fontSize: 12,
    color: CONFIG.colors.primaryLight,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: CONFIG.colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});