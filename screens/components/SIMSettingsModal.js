import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  Text,
  Divider,
  Button
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SimCardsManager from 'react-native-sim-cards-manager';
import moment from 'moment';

// Database
import { openDatabase } from 'react-native-sqlite-storage';
import { IdGenerator } from '../../Helpers/Generator/IdGenerator';
import { AuthContext } from '../../context/AuthContext';

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
  info: '#17a2b8',
};

const SIMSettingsModal = ({
  visible,
  onClose,
  selectedSim: externalSelectedSim,
  onSimSelect: externalOnSimSelect,
  showSnackbar
}) => {
  const { logedInUserInfo } = useContext(AuthContext);

  const [simCards, setSimCards] = useState([]);
  const [selectedSim, setSelectedSim] = useState(externalSelectedSim || null);
  const [isLoadingSims, setIsLoadingSims] = useState(false);
  const [savedSimData, setSavedSimData] = useState(null);

  // Load saved SIM selection from database
  const loadSavedSimSelection = () => {
    return new Promise((resolve) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM sms_settings WHERE shop_id = ? LIMIT 1',
          [logedInUserInfo?.shop[0]?.id],
          (tx, results) => {
            if (results.rows.length > 0) {
              const savedSim = results.rows.item(0);
              setSavedSimData(savedSim);
              console.log('Loaded saved SIM data:', savedSim);
              resolve(savedSim);
            } else {
              console.log('No saved SIM data found');
              resolve(null);
            }
          },
          (tx, error) => {
            console.error('Error loading saved SIM data:', error);
            resolve(null);
          }
        );
      });
    });
  };

  // Save SIM selection to database
  const saveSimSelectionToDb = (simData) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        // First check if setting exists
        tx.executeSql(
          'SELECT * FROM sms_settings WHERE shop_id = ?',
          [logedInUserInfo?.shop[0]?.id],
          (tx, checkResults) => {
            if (checkResults.rows.length > 0) {
              // Update existing record
              tx.executeSql(
                'UPDATE sms_settings SET selected_sim_id = ?, sim_display_name = ?, subscription_id = ?, is_no_sim_option = ?, updated_at = ? WHERE shop_id = ?',
                [
                  simData.id,
                  simData.displayName,
                  simData.subscriptionId || null,
                  simData.isNoSimOption ? 1 : 0,
                  moment().format('YYYY-MM-DD HH:mm:ss'),
                  logedInUserInfo?.shop[0]?.id
                ],
                (tx, updateResults) => {
                  console.log('SIM selection updated in database');
                  setSavedSimData(simData);
                  resolve(true);
                },
                (tx, updateError) => {
                  console.error('Error updating SIM selection:', updateError);
                  reject(updateError);
                }
              );
            } else {
              // Insert new record
              const settingId = IdGenerator(logedInUserInfo.id);
              tx.executeSql(
                'INSERT INTO sms_settings (id, shop_id, selected_sim_id, sim_display_name, subscription_id, is_no_sim_option, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  settingId,
                  logedInUserInfo?.shop[0]?.id,
                  simData.id,
                  simData.displayName,
                  simData.subscriptionId || null,
                  simData.isNoSimOption ? 1 : 0,
                  moment().format('YYYY-MM-DD HH:mm:ss'),
                  moment().format('YYYY-MM-DD HH:mm:ss')
                ],
                (tx, insertResults) => {
                  console.log('SIM selection saved to database');
                  setSavedSimData(simData);
                  resolve(true);
                },
                (tx, insertError) => {
                  console.error('Error saving SIM selection:', insertError);
                  reject(insertError);
                }
              );
            }
          },
          (tx, checkError) => {
            console.error('Error checking SIM settings:', checkError);
            reject(checkError);
          }
        );
      });
    });
  };

  // Fetch SIM cards
  const fetchSimCards = async () => {
    try {
      setIsLoadingSims(true);

      // Load saved SIM selection
      const savedSim = await loadSavedSimSelection();

      const sims = await SimCardsManager.getSimCards();

      // Format SIM cards data - isActive will always be true for real SIM cards
      const formattedSims = sims.map((sim, index) => ({
        ...sim,
        id: sim.subscriptionId || index.toString(),
        displayName: sim.displayName || sim.carrierName || `SIM ${index + 1}`,
        isActive: true, // Set to true for all detected SIM cards
        phoneNumber: sim.phoneNumber || sim.number || 'নম্বর নেই',
        isNoSimOption: false // Mark as real SIM card
      }));

      // Add "No SIM card selected" option as the first item
      const noSimOption = {
        id: 'no-sim-selected',
        displayName: 'SMS পাঠাবেন না',
        isActive: false,
        phoneNumber: null,
        isNoSimOption: true,
        subscriptionId: null
      };

      // Add no SIM option to the beginning of the list
      const allOptions = [noSimOption, ...formattedSims];

      setSimCards(allOptions);

      // Set selected SIM based on external prop, saved data, or default
      if (externalSelectedSim) {
        setSelectedSim(externalSelectedSim);
      } else if (savedSim) {
        // Find matching SIM from the list
        let selected = allOptions.find(sim =>
          sim.id === savedSim.selected_sim_id ||
          (sim.isNoSimOption && savedSim.is_no_sim_option === 1)
        );

        if (selected) {
          setSelectedSim(selected);
        } else {
          // If saved SIM not found in current list, default to "No SIM"
          setSelectedSim(noSimOption);
        }
      } else {
        // No saved data, default to "No SIM" option
        setSelectedSim(noSimOption);
      }

    } catch (error) {
      console.error('Error fetching SIM cards:', error);

      // Even if error occurs, create the no SIM option
      const noSimOption = {
        id: 'no-sim-selected',
        displayName: 'SMS পাঠাবেন না',
        isActive: false,
        phoneNumber: null,
        isNoSimOption: true,
        subscriptionId: null
      };

      setSimCards([noSimOption]);
      setSelectedSim(noSimOption);

      if (showSnackbar) {
        showSnackbar('SIM তথ্য লোড করতে সমস্যা হয়েছে', 'error');
      }
    } finally {
      setIsLoadingSims(false);
    }
  };

  // Handle SIM selection
  const handleSimSelect = async (sim) => {
    try {
      // Save to database
      await saveSimSelectionToDb(sim);

      // Update local state
      setSelectedSim(sim);

      // Call external callback if provided
      if (externalOnSimSelect) {
        externalOnSimSelect(sim);
      }

      // Show success message
      if (showSnackbar) {
        showSnackbar(
          sim.isNoSimOption
            ? 'SMS পাঠানো হবে না'
            : `${sim.displayName} নির্বাচন করা হয়েছে`,
          'success'
        );
      }

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error saving SIM selection:', error);
      if (showSnackbar) {
        showSnackbar('SIM নির্বাচন সংরক্ষণ করতে সমস্যা হয়েছে', 'error');
      }
    }
  };

  // Initialize when modal opens
  useEffect(() => {
    if (visible) {
      fetchSimCards();
    }
  }, [visible]);

  // Update selectedSim when external prop changes
  useEffect(() => {
    if (externalSelectedSim) {
      setSelectedSim(externalSelectedSim);
    }
  }, [externalSelectedSim]);

  // Render SIM card item
  const renderSimCardItem = (sim) => (
    <TouchableOpacity
      key={sim.id}
      style={[
        styles.simCardItem,
        selectedSim?.id === sim.id && styles.simCardItemSelected,
        sim.isNoSimOption && styles.noSimOptionItem
      ]}
      onPress={() => handleSimSelect(sim)}
    >
      <View style={styles.simCardContent}>
        <View style={styles.simCardLeft}>
          <View style={[
            styles.simIconContainer,
            {
              backgroundColor: sim.isNoSimOption
                ? '#f8f9fa'
                : (sim.isActive ? colors.primaryLightest : '#f0f0f0')
            }
          ]}>
            <Icon
              name={sim.isNoSimOption ? "message-off" : "sim"}
              size={24}
              color={sim.isNoSimOption ? '#888' : (sim.isActive ? colors.primary : '#888')}
            />
          </View>
          <View style={styles.simInfo}>
            <Text style={[
              styles.simName,
              selectedSim?.id === sim.id && styles.simNameSelected,
              sim.isNoSimOption && styles.noSimOptionText
            ]}>
              {sim.displayName}
            </Text>
            {!sim.isNoSimOption && sim.isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>সক্রিয়</Text>
              </View>
            )}
            {sim.isNoSimOption && (
              <Text style={styles.noSimDescription}>
                শুধুমাত্র কাস্টমার যোগ করুন, SMS পাঠাবেন না
              </Text>
            )}
          </View>
        </View>

        <View style={styles.simCardRight}>
          {selectedSim?.id === sim.id ? (
            <View style={styles.selectedIndicator}>
              <Icon
                name="check-circle"
                size={24}
                color={colors.success}
              />
            </View>
          ) : (
            <View style={styles.unselectedIndicator}>
              <Icon
                name="circle-outline"
                size={24}
                color="#ddd"
              />
            </View>
          )}
        </View>
      </View>

      <Divider style={styles.simDivider} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.simModalOverlay}>
        <View style={styles.simModalContainer}>
          {/* Modal Header */}
          <View style={styles.simModalHeader}>
            <Text style={styles.simModalTitle}>SMS পাঠানোর SIM নির্বাচন করুন</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.simModalCloseBtn}
            >
              <Text style={styles.simModalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* SIM Cards List */}
          <ScrollView style={styles.simListContainer}>
            {isLoadingSims ? (
              <View style={styles.simLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.simLoadingText}>SIM লোড হচ্ছে...</Text>
              </View>
            ) : simCards.length > 0 ? (
              simCards.map((sim) => renderSimCardItem(sim))
            ) : (
              <View style={styles.noSimContainer}>
                <Icon
                  name="sim-alert"
                  size={60}
                  color="#ccc"
                />
                <Text style={styles.noSimText}>কোন SIM কার্ড পাওয়া যায়নি</Text>
                <Text style={styles.noSimSubText}>
                  আপনার ডিভাইসে SIM কার্ড ইনস্টার করা নেই অথবা অনুমতি প্রয়োজন
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.simModalFooter}>
            <Button
              mode="outlined"
              style={styles.simModalCancelBtn}
              labelStyle={{ color: colors.textPrimary }}
              onPress={onClose}
            >
              বাতিল
            </Button>
            <Button
              mode="contained"
              style={styles.simModalConfirmBtn}
              labelStyle={{ color: '#fff' }}
              onPress={onClose}
            >
              বন্ধ করুন
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  simModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  simModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  simModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  simModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
  },
  simModalCloseBtn: {
    padding: 4,
  },
  simModalCloseText: {
    fontSize: 24,
    color: '#888',
  },
  // SIM List
  simListContainer: {
    maxHeight: 400,
  },
  simCardItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  simCardItemSelected: {
    backgroundColor: colors.primaryLightest,
  },
  noSimOptionItem: {
    backgroundColor: '#f8f9fa',
  },
  simCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  simCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  simIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  simInfo: {
    flex: 1,
  },
  simName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  simNameSelected: {
    color: colors.primary,
  },
  noSimOptionText: {
    color: '#666',
    fontStyle: 'italic',
  },
  noSimDescription: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
  simCardRight: {
    marginLeft: 12,
  },
  selectedIndicator: {},
  unselectedIndicator: {},
  simDivider: {
    marginTop: 16,
    backgroundColor: '#f0f0f0',
  },
  // Loading State
  simLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  simLoadingText: {
    marginTop: 12,
    color: colors.textPrimary,
    fontSize: 14,
  },
  // No SIM State
  noSimContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noSimText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 8,
  },
  noSimSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal Footer
  simModalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  simModalCancelBtn: {
    flex: 1,
    marginRight: 8,
    borderColor: colors.primaryLight,
  },
  simModalConfirmBtn: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: colors.primary,
  },
});

export default SIMSettingsModal;
