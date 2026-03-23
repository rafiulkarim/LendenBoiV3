import React, { useState } from 'react';
import { View, StyleSheet, Keyboard, Platform } from 'react-native';
import BottomMenu from './components/BottomMenu';
import { TestIds, BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

const adUnitId = __DEV__
  ? TestIds.BANNER
  : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'; // 🔴 Replace with your real Ad Unit ID

const colors = {
  primary: '#00A8A8',
  primaryLight: '#4DC9C9',
  // ...rest of your colors
};

const MainLayout = ({ children, navigation, activeTab, setActiveTab, onToggleDrawer, showBottomUI = true }) => {
  const [adLoaded, setAdLoaded] = useState(false);

  const handleTabPress = (tabId, navigateMenu) => {
    if (tabId === 'menu') {
      onToggleDrawer?.();
    } else if (navigateMenu) {
      navigation.navigate(navigateMenu);
      setActiveTab(tabId);
    }
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      {/* Screen Content */}
      <View style={styles.content}>
        {children}
      </View>

      {/* Bottom UI: Banner + BottomMenu stacked */}
      {showBottomUI && (
        <View style={styles.bottomWrapper}>

          {/* ✅ Banner Ad sits just above BottomMenu */}
          {/* <View style={styles.bannerWrapper}>
            <BannerAd
              unitId={adUnitId}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
              requestOptions={{ requestNonPersonalizedAdsOnly: true }}
              onAdLoaded={() => {
                setAdLoaded(true)
                console.log('Ad loaded Successfully')
              }}
              onAdFailedToLoad={(error) => {
                console.error('Ad failed to load:', error);
                setAdLoaded(false);
              }}
            />
          </View> */}

          {/* <View style={styles.adMobContainer}>
            <BannerAd
              unitId={adUnitId}
              size={BannerAdSize.BANNER}
              requestOptions={{ requestNonPersonalizedAdsOnly: true }}
              onAdLoaded={() => {
                setAdLoaded(setAdLoaded)
                console.log('Ad Load Successfully')
              }}           // ✅
              onAdFailedToLoad={(error) => {
                console.error('Ad failed to load:', error.code, error.message);
                setAdLoaded(false);                           // ✅
              }}
            />
          </View> */}

          {/* ✅ BottomMenu below banner */}
          {/* <BottomMenu
            activeTab={activeTab}
            onTabPress={handleTabPress}
            themeColors={colors}
            setAdLoaded={setAdLoaded}
            TestIds={TestIds}
          /> */}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1, // Takes all space above the bottom UI
  },
  bottomWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bannerWrapper: {
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  adMobContainer: {
    position: 'absolute',
    bottom: 67,
    left: 0,
    right: 0,
    zIndex: 1000,
    // elevation: 10,
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    // paddingHorizontal: 2,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});

export default MainLayout;