// components/PersistentAdBanner.js
import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const adUnitId = __DEV__
  ? TestIds.ADAPTIVE_BANNER  // ✅ Correct test ID for adaptive banner
  : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';

// ✅ Full screen width — no horizontal padding so ad fills the bar
const { width } = Dimensions.get('window');

const PersistentAdBanner = () => {
  const [adLoaded, setAdLoaded] = useState(false);

  return (
    <View style={styles.adMobContainer}>
      <BannerAd
        unitId={adUnitId}
        // ✅ anchored_adaptive_banner(width) — lowercase function call, pass screen width
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdLoaded={() => {
          setAdLoaded(true);
          console.log('Ad loaded successfully');
        }}
        onAdFailedToLoad={(error) => {
          console.error('Ad failed to load:', error.code, error.message);
          setAdLoaded(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  adMobContainer: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    width: '100%',
    paddingVertical: 5
  },
});

export default PersistentAdBanner;