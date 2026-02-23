import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { Appbar } from 'react-native-paper';
import { openDatabase } from 'react-native-sqlite-storage';
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
  warning: '#ffc107',
  error: '#dc3545',
  background: '#f8f9fa',
  surface: '#ffffff',
  textPrimary: '#1A535C',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  commentBg: '#F3F4F6',
};

const LendenHistory = ({ navigation, route }) => {
  const clientId = route.params.clientId
  const clientName = route.params.clientName
  const clientData = route.params.clientData
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])

  const fetchClientTransactions = () => {
    setLoading(true);
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM ledgers WHERE client_id = ? ORDER BY transaction_date DESC',
        [clientId],
        (tx, results) => {
          if (results.rows.length > 0) {
            const ledgers = results.rows.raw();
            console.log(ledgers);
            setTransactions(ledgers);
          } else {
            setTransactions([]);
          }
          setLoading(false);
        },
        error => {
          console.error('Error fetching client transactions:', error);
          setTransactions([]);
          setLoading(false);
        }
      );
    });
  };

  useEffect(() => {
    fetchClientTransactions();
  }, []);

  // Process transactions to group by date and separate dilam/pelam
  const processedData = useMemo(() => {
    const groupedByDate = {};

    transactions.forEach(transaction => {
      const date = transaction.transaction_date.split(' ')[0]; // Get only date part
      const amount = parseFloat(transaction.amount) || 0;

      if (!groupedByDate[date]) {
        groupedByDate[date] = {
          date,
          dilam: 0,
          pelam: 0,
          transactions: []
        };
      }

      if (transaction.transaction_type === 'Sale' || transaction.transaction_type === 'Payment') {
        groupedByDate[date].dilam += amount;
      } else if (transaction.transaction_type === 'Receive' || transaction.transaction_type === 'Purchase') {
        groupedByDate[date].pelam += amount;
      }

      groupedByDate[date].transactions.push(transaction);
    });

    // Convert to array and sort by date (newest first)
    return Object.values(groupedByDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((item, index) => ({
        ...item,
        id: index + 1
      }));
  }, [transactions]);

  const totals = useMemo(() => {
    const totalDilam = transactions
      .filter(t => t.transaction_type === 'Sale' || t.transaction_type === 'Payment')
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    const totalPelam = transactions
      .filter(t => t.transaction_type === 'Receive' || t.transaction_type === 'Purchase')
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    if (clientData.type === 'Customer') {
      const balance = totalPelam - totalDilam;
      return {
        dilam: totalDilam,
        pelam: totalPelam,
        balance: balance // Negative balance for customers
      };
    } else {
      const balance = totalDilam - totalPelam;
      return {
        dilam: totalDilam,
        pelam: totalPelam,
        balance,
      };
    }
  }, [transactions, clientData]);

  const formatCurrency = (amount) => `৳ ${amount.toLocaleString('bn-BD')}`;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('bn-BD', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('bn-BD', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text>লোড হচ্ছে...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header style={{ backgroundColor: colors.primary }}>
        <Appbar.BackAction
          color="#fff"
          onPress={() => navigation.goBack()}
        />
        <Appbar.Content
          title={clientName}
          color="#fff"
        />
      </Appbar.Header>

      {transactions.length === 0 ? (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
          <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center' }}>
            কোনো লেনদেন পাওয়া যায়নি
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Key Metrics - Dilam & Pelam */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.metricIcon, { backgroundColor: colors.error + '20' }]}>
                <Text style={[styles.metricIconText, { color: colors.error }]}>↑</Text>
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel}>দিয়েছেন</Text>
                <Text style={[styles.metricValue, { color: colors.error }]}>
                  {formatCurrency(totals.dilam)}
                </Text>
              </View>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.metricIcon, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.metricIconText, { color: colors.success }]}>↓</Text>
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel}>পেয়েছেন</Text>
                <Text style={[styles.metricValue, { color: colors.success }]}>
                  {formatCurrency(totals.pelam)}
                </Text>
              </View>
            </View>
          </View>

          {/* Transaction History */}
          <View style={[styles.transactionCard, { backgroundColor: colors.surface }]}>
            {/* Table Header */}
            <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.tableHeaderText, styles.colDate]}>তারিখ</Text>
              <Text style={[styles.tableHeaderText, styles.colAmount]}>দিয়েছেন</Text>
              <Text style={[styles.tableHeaderText, styles.colAmount]}>পেয়েছেন</Text>
            </View>

            {/* Table Body */}
            {processedData.map((dayItem, dayIndex) => (
              <View key={dayItem.date}>
                {/* Daily summary row */}
                <View
                  style={[
                    styles.tableRow,
                    dayIndex !== processedData.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }
                  ]}
                >
                  <Text style={[styles.tableCell, styles.colDate, { color: colors.textPrimary, fontWeight: '600' }]}>
                    {formatDate(dayItem.date)}
                  </Text>
                  <View style={[styles.tableCell, styles.colAmount]}>
                    <Text style={[styles.amountText, { color: colors.error }]}>
                      {dayItem.dilam > 0 ? formatCurrency(dayItem.dilam) : '—'}
                    </Text>
                  </View>
                  <View style={[styles.tableCell, styles.colAmount]}>
                    <Text style={[styles.amountText, { color: colors.success }]}>
                      {dayItem.pelam > 0 ? formatCurrency(dayItem.pelam) : '—'}
                    </Text>
                  </View>
                </View>

                {/* Individual transactions with comments for this day */}
                {dayItem.transactions.map((transaction, txIndex) => (
                  <View key={transaction.id} style={styles.commentContainer}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentTime}>
                        {formatTime(transaction.transaction_date)}
                      </Text>
                      <Text style={[
                        styles.commentType,
                        {
                          color: transaction.transaction_type === 'Sale' || transaction.transaction_type === 'Payment'
                            ? colors.error
                            : colors.success
                        }
                      ]}>
                        {transaction.transaction_type === 'Sale' || transaction.transaction_type === 'Payment'
                          ? 'দিয়েছেন'
                          : 'পেয়েছেন'}
                        : {formatCurrency(parseFloat(transaction.amount))}
                      </Text>
                    </View>
                    {transaction.comments && transaction.comments.trim() !== '' ? (
                      <View style={[styles.commentBubble, { backgroundColor: colors.commentBg }]}>
                        <Text style={styles.commentText}>
                          💬 {transaction.comments}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.commentBubble, { backgroundColor: colors.commentBg }]}>
                        <Text style={[styles.commentText, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                          কোনো মন্তব্য নেই
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ))}

            {processedData.length === 0 && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary }}>কোনো লেনদেন নেই</Text>
              </View>
            )}
          </View>

          {/* Extra space for footer */}
          <View style={styles.footerSpace} />
        </ScrollView>
      )}

      {/* Fixed Footer with Balance */}
      {transactions.length > 0 && (
        <View style={[styles.fixedFooter, {
          backgroundColor: colors.surface,
          borderTopColor: colors.primary,
        }]}>
          <View style={[styles.footerTotalRow, {
            backgroundColor: colors.primaryLightest,
            borderTopColor: colors.primaryLighter
          }]}>
            <Text style={[styles.footerTotalLabel, { color: totals.balance >= 0 ? colors.success : colors.error }]}>
              {
                totals.balance >= 0 ? "অগ্রিম" : "বাকি"
              }
            </Text>
            <Text style={[styles.footerTotalValue, {
              color: totals.balance >= 0 ? colors.success : colors.error
            }]}>
              {totals.balance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(totals.balance))}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  balanceBadge: {
    alignItems: 'flex-end',
  },
  balanceBadgeLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  balanceBadgeValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metricIconText: {
    fontSize: 24,
    fontWeight: '600',
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  summarySection: {
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 12,
  },
  summaryCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  summaryIconText: {
    fontSize: 24,
    fontWeight: '600',
  },
  summaryContent: {
    flex: 1,
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionHeader: {
    marginBottom: 16,
  },
  transactionHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  transactionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
  },
  transactionStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  transactionStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionStatValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  tableCell: {
    fontSize: 14,
  },
  colDate: {
    flex: 1.5,
  },
  colAmount: {
    flex: 1,
    alignItems: 'flex-end',
    textAlign: 'right',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Comment styles
  commentContainer: {
    marginLeft: 20,
    marginBottom: 12,
    marginTop: 4,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  commentTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  commentType: {
    fontSize: 11,
    fontWeight: '500',
  },
  commentBubble: {
    padding: 10,
    borderRadius: 12,
    borderTopLeftRadius: 4,
    marginRight: 20,
  },
  commentText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  statsCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statItemLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statItemValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 12,
  },
  footerSpace: {
    height: 20,
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  footerContent: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
  },
  footerItemLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerItemValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  footerDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 8,
  },
  footerTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  footerTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerTotalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LendenHistory;