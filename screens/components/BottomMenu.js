import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

const BottomMenu = ({ activeTab, onTabPress, themeColors }) => {
  const bottomTabs = [
    { id: 'home', label: 'হোম', icon: 'home-outline', activeIcon: 'home', navigate: "Welcome" },
    { id: 'contacts', label: 'কাস্টমার', icon: 'account-multiple-outline', activeIcon: 'account-multiple', navigate: "ClientList" },
    { id: 'reports', label: 'রিপোর্ট', icon: 'chart-bar', activeIcon: 'chart-bar', navigate: "Report" },
    { id: 'menu', label: 'মেনু', icon: 'menu', activeIcon: 'menu', navigate: "" },
  ];

  const handleTabPress = (tabId, navigateMenu) => {
    if (onTabPress) {
      onTabPress(tabId, navigateMenu);
    }
  };

  return (
    <View style={styles.bottomMenu}>
      {bottomTabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.bottomMenuItem}
          onPress={() => handleTabPress(tab.id, tab.navigate)}
          activeOpacity={0.7}
        >
          <IconButton
            icon={activeTab === tab.id ? tab.activeIcon : tab.icon}
            size={24}
            iconColor={activeTab === tab.id ? themeColors?.primary : themeColors?.textPrimary}
            style={styles.bottomMenuIcon}
          />
          <Text style={[
            styles.bottomMenuLabel,
            { color: activeTab === tab.id ? themeColors?.primary : themeColors?.textPrimary }
          ]}>
            {tab.label}
          </Text>

          {activeTab === tab.id && (
            <View style={[styles.activeTabIndicator, { backgroundColor: themeColors?.primary }]} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomMenu: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 100,
  },
  bottomMenuItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  bottomMenuIcon: {
    margin: 0,
  },
  bottomMenuLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  activeTabIndicator: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 3,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});

export default BottomMenu;