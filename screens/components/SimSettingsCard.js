import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Text
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const colors = {
  primary: '#00A8A8',
  primaryLight: '#4DC9C9',
  primaryLighter: '#80D9D9',
  primaryLightest: '#E6F7F7',
  primaryDark: '#008787',
  primaryDarker: '#006666',
  success: '#28a745',
  textPrimary: '#1A535C',
};

const SimSettingsCard = ({ selectedSim, onPress }) => {
  console.log(selectedSim)
  return (
    <View style={styles.smsSettingsSection}>
      <Text style={styles.sectionTitle}>SMS সেটিংস</Text>

      <TouchableOpacity
        style={styles.simSelectionCard}
        onPress={onPress}
      >
        {selectedSim ? (
          <View style={styles.selectedSimContent}>
            <View style={styles.selectedSimLeft}>
              <Icon
                source={selectedSim.isNoSimOption ? "message-off" : "sim"}
                size={28}
                color={selectedSim.isNoSimOption ? "#888" : colors.primary}
              />
              <View style={styles.selectedSimInfo}>
                <Text style={styles.selectedSimName}>
                  {selectedSim.displayName}
                </Text>
                <Text style={[
                  styles.selectedSimStatus,
                  { color: selectedSim.isNoSimOption ? '#666' : colors.success }
                ]}>
                  {selectedSim.isNoSimOption
                    ? 'SIM সিলেক্ট করা নেই'
                    : (selectedSim.isActive ? 'সক্রিয় SIM' : 'নিষ্ক্রিয় SIM')}
                </Text>
              </View>
            </View>
            <Icon
              name="chevron-right"
              size={24}
              color={colors.primaryLight}
            />
          </View>
        ) : (
          <View style={styles.noSimSelected}>
            <Icon
              name="sim"
              size={28}
              color="#888"
            />
            <Text style={styles.selectSimText}>SIM নির্বাচন করুন</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.simNote}>
        {selectedSim?.isNoSimOption
          ? 'কোন SMS পাঠানো হবে না, শুধুমাত্র কাস্টমার তথ্য সংরক্ষণ করা হবে'
          : 'নির্বাচিত SIM দিয়ে স্বাগত বার্তা পাঠানো হবে'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  smsSettingsSection: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: colors.primaryLightest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryLighter,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  simSelectionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  selectedSimContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedSimLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedSimInfo: {
    marginLeft: 12,
    flex: 1,
  },
  selectedSimName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  selectedSimStatus: {
    fontSize: 13,
    marginTop: 2,
  },
  noSimSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  selectSimText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  simNote: {
    fontSize: 12,
    color: colors.primaryDark,
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default SimSettingsCard;