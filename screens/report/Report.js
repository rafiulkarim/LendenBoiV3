import React, { useEffect } from 'react'
import { View, Text, StyleSheet, BackHandler, Alert, StatusBar } from 'react-native'
import { Appbar } from 'react-native-paper'

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

const Report = ({ navigation }) => {
  useEffect(() => {
    const backAction = () => {
      navigation.replace('Welcome')
      return true
    }

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    )

    return () => backHandler.remove()
  }, [])

  const goBack = () => {
    navigation.replace('Welcome')
  }

  return (
    <>
      <Appbar.Header style={{ backgroundColor: colors.primary }}>
        <Appbar.BackAction
          color="#fff"
          onPress={() => {
            navigation.navigate('Welcome')
          }}
        />
        <Appbar.Content
          title="রিপোর্ট"
          color="#fff"
        />
      </Appbar.Header>

      <View style={styles.container}>
        <Text style={styles.message}>📊 রিপোর্ট এখনো কাজ চলমান আছে...</Text>
        <Text style={styles.subMessage}>শীঘ্রই আপডেট করা হবে</Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  appbar: {
    backgroundColor: '#6200EE',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  appbarTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  message: {
    fontSize: 20,
    color: '#333',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
})

export default Report