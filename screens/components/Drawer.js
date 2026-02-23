import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Avatar, Text, IconButton, Divider, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const Drawer = ({
  isOpen,
  onClose,
  userInfo,
  navigation,
  onLogout,
  themeColors
}) => {

  console.log(userInfo)
  const drawerAnimation = new Animated.Value(width);

  useEffect(() => {
    if (isOpen) {
      Animated.timing(drawerAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(drawerAnimation, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const drawerItems = [
    {
      id: 'dashboard',
      label: 'ড্যাশবোর্ড',
      icon: 'view-dashboard',
      onPress: () => {
        onClose();
        navigation.navigate('Welcome');
      }
    },
    {
      id: 'contacts',
      label: 'কন্টাক্টস',
      icon: 'account-multiple',
      onPress: () => {
        onClose();
        navigation.navigate('ClientList');
      }
    },
    {
      id: 'reports',
      label: 'রিপোর্টস',
      icon: 'chart-bar',
      onPress: () => {
        onClose();
        navigation.navigate('Report');
      }
    },
    {
      id: 'transactions',
      label: 'লেনদেন',
      icon: 'cash-multiple',
      onPress: () => {
        onClose();
        navigation.navigate('Transactions');
      }
    },
    {
      id: 'settings',
      label: 'সেটিংস',
      icon: 'cog',
      onPress: () => {
        onClose();
        navigation.navigate('Settings');
      }
    },
    {
      id: 'backup',
      label: 'ব্যাকআপ',
      icon: 'backup-restore',
      onPress: () => {
        onClose();
        navigation.navigate('Backup');
      }
    },
    {
      id: 'about',
      label: 'অ্যাপ সম্পর্কে',
      icon: 'information',
      onPress: () => {
        onClose();
        navigation.navigate('About');
      }
    },
  ];

  return (
    <View style={styles.drawerOverlay}>
      <TouchableOpacity
        style={styles.drawerBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      <Animated.View
        style={[
          styles.drawerContainer,
          {
            transform: [{ translateX: drawerAnimation }],
            backgroundColor: themeColors?.surface || '#fff'
          }
        ]}
      >
        <View style={[styles.drawerHeader, { backgroundColor: themeColors?.primary }]}>
          <View style={styles.drawerHeaderContent}>
            <Avatar.Icon
              size={60}
              icon="account-circle"
              style={{ backgroundColor: themeColors?.primaryLight || '#4DC9C9' }}
              color="#fff"
            />
            <View style={styles.drawerHeaderText}>
              <Text style={styles.drawerUserName}>
                {userInfo?.name || 'ব্যবহারকারী'}
              </Text>
              <Text style={styles.drawerUserEmail}>
                {userInfo?.cell_phone || 'ফোন নম্বর নাই'}
              </Text>
              <Text style={styles.drawerUserBusiness}>
                {userInfo?.shop[0]?.title || 'দোকানের নাম নাই'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.drawerCloseButton}
          >
            <IconButton icon="close" iconColor="#fff" size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.drawerContent}>
          <View style={styles.drawerSection}>
            <Text style={[styles.drawerSectionTitle, { color: themeColors?.textPrimary }]}>
              প্রধান মেনু
            </Text>
          </View>

          {drawerItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.drawerItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <IconButton
                icon={item.icon}
                iconColor={themeColors?.primary}
                size={24}
                style={styles.drawerItemIcon}
              />
              <Text style={[styles.drawerItemLabel, { color: themeColors?.textPrimary }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}

          <Divider style={[styles.drawerDivider, { backgroundColor: themeColors?.primaryLighter }]} />

          <View style={styles.drawerSection}>
            <Text style={[styles.drawerSectionTitle, { color: themeColors?.textPrimary }]}>
              অ্যাকাউন্ট
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.drawerItem, styles.drawerLogoutItem]}
            onPress={() => {
              onClose();
              onLogout();
            }}
            activeOpacity={0.7}
          >
            <IconButton
              icon="logout"
              iconColor={themeColors?.error || '#dc3545'}
              size={24}
              style={styles.drawerItemIcon}
            />
            <Text style={[styles.drawerItemLabel, { color: themeColors?.error || '#dc3545' }]}>
              লগ আউট
            </Text>
          </TouchableOpacity>

          <View style={styles.versionContainer}>
            <Text style={[styles.versionText, { color: themeColors?.textPrimary }]}>
              সংস্করণ 1.0.0
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: width * 0.8,
    maxWidth: 320,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 16,
  },
  drawerHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
    position: 'relative',
  },
  drawerHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  drawerUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  drawerUserEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  drawerUserBusiness: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  drawerCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 45 : 15,
    right: 8,
  },
  drawerContent: {
    flex: 1,
  },
  drawerSection: {
    paddingVertical: 8,
  },
  drawerSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  drawerItemIcon: {
    margin: 0,
    marginRight: 12,
  },
  drawerItemLabel: {
    fontSize: 16,
    color: '#1A535C',
    fontWeight: '500',
  },
  drawerLogoutItem: {
    backgroundColor: '#FFEBEE',
    marginTop: 8,
  },
  drawerDivider: {
    marginVertical: 8,
    marginHorizontal: 16,
    height: 1,
  },
  versionContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#666',
  },
});

export default Drawer;