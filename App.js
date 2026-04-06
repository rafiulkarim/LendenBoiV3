import React, { useState, useEffect, useRef } from 'react';
import { default as theme } from './theme.json';
import { View, StyleSheet, Image, StatusBar } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthContext from './context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Login from './screens/Login';
import Registration from './screens/Registration';
import Welcome from './screens/Welcome';
import AddClient from './screens/client/AddClient';
import Schema from './screens/sql/Schema';
import ClientList from './screens/client/ClientList';
import Report from './screens/report/Report';
import SaleAndReceive from './screens/client/SaleAndReceive';
import SaleAndReceiveDetails from './screens/client/SaleAndReceiveDetails';
import UpdateClient from './screens/client/UpdateClient';
import LendenHistory from './screens/client/LendenHistory';
import ShortageList from './screens/shortage/ShortageList';
import GroupTagada from './screens/GroupTagada';
import ExpenseList from './screens/expense/ExpenseList';
import AddExpense from './screens/expense/AddExpense';

// import PersistentAdBanner from './screens/components/PersistentAdBanner';
import BottomMenu from './screens/components/BottomMenu';
import { TestIds } from 'react-native-google-mobile-ads';
import DataBackupForcely from './screens/backup/DataBackupForcely';
import InitBackgroundSync from './screens/backup/InitBackgroundSync';
import SyncPrevData from './screens/backup/SyncPrevData';

// ✅ Added drawerOpen + setDrawerOpen to context
export const SearchContext = React.createContext({
  setGlobalSearching: () => { },
  drawerOpen: false,
  setDrawerOpen: () => { },
});

const Stack = createNativeStackNavigator();

const SCREENS_WITH_BOTTOM_MENU = ['Welcome', 'ClientList'];

export default function App({ navigation }) {
  const [isLogedIn, setIsLogedIn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState('');
  const [currentScreen, setCurrentScreen] = useState('Welcome');
  const [activeTab, setActiveTab] = useState('home');
  const [isSearching, setIsSearching] = useState(false);

  // ✅ drawerOpen lives here — shared via context
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navigationRef = useRef(null);

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const storedData = await AsyncStorage.getItem('user_info');
        if (storedData) {
          const { token, user } = JSON.parse(storedData);
          setIsLogedIn(token);
          setUserInfo(user);
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      } finally {
        setLoading(false);
      }
    };
    checkAuthState();
  }, []);

  const singIn = async (token, user) => {
    try {
      await AsyncStorage.setItem('user_info', JSON.stringify({ token, user }));
      setIsLogedIn(token);
      setUserInfo(user);
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const singOut = async () => {
    try {
      await AsyncStorage.removeItem('user_info');
      setIsLogedIn(null);
      setUserInfo(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleTabPress = (tabId, navigateMenu) => {
    if (tabId === 'menu') {
      setDrawerOpen(prev => !prev); // ✅ toggles shared drawerOpen
    } else if (navigateMenu && navigationRef.current) {
      navigationRef.current.navigate(navigateMenu);
      setActiveTab(tabId);
    }
  };

  const showBottomMenu = isLogedIn != null && SCREENS_WITH_BOTTOM_MENU.includes(currentScreen) && !isSearching;
  const showAdBanner = isLogedIn != null && !isSearching;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Image
          style={{ width: 160, height: 160 }}
          source={require('./assets/logo/lendenboi-logo.png')}
        />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ singIn, singOut, myToken: isLogedIn, logedInUserInfo: userInfo }}>
      {/* ✅ Pass drawerOpen + setDrawerOpen through context */}
      <SearchContext.Provider value={{
        setGlobalSearching: setIsSearching,
        drawerOpen,
        setDrawerOpen,
      }}>
        <StatusBar backgroundColor='#00A8A8' />

        <View style={styles.root}>

          <View style={styles.navigatorWrapper}>
            <NavigationContainer
              ref={navigationRef}
              onStateChange={() => {
                const currentRoute = navigationRef.current?.getCurrentRoute();
                if (currentRoute?.name) {
                  setCurrentScreen(currentRoute.name);
                  setIsSearching(false);
                  setDrawerOpen(false); // ✅ close drawer on screen change
                  if (currentRoute.name === 'Welcome') setActiveTab('home');
                  else if (currentRoute.name === 'ClientList') setActiveTab('contacts');
                }
              }}
            >
              <Stack.Navigator>
                {isLogedIn == null ? (
                  <>
                    <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
                    <Stack.Screen name="Registration" component={Registration} options={{ headerShown: false }} />
                  </>
                ) : (
                  <>
                    <Stack.Screen name="Welcome" component={Welcome} options={{ headerShown: false }} />
                    <Stack.Screen name="AddClient" component={AddClient} options={{ headerShown: false }} />
                    <Stack.Screen name="Schema" component={Schema} options={{ headerShown: false }} />
                    <Stack.Screen name="ClientList" component={ClientList} options={{ headerShown: false }} />
                    <Stack.Screen name="Report" component={Report} options={{ headerShown: false }} />
                    <Stack.Screen name="SaleAndReceive" component={SaleAndReceive} options={{ headerShown: false }} />
                    <Stack.Screen name="SaleAndReceiveDetails" component={SaleAndReceiveDetails} options={{ headerShown: false }} />
                    <Stack.Screen name="UpdateClient" component={UpdateClient} options={{ headerShown: false }} />
                    <Stack.Screen name="LendenHistory" component={LendenHistory} options={{ headerShown: false }} />
                    <Stack.Screen name="ShortageList" component={ShortageList} options={{ headerShown: false }} />
                    <Stack.Screen name="GroupTagada" component={GroupTagada} options={{ headerShown: false }} />
                    <Stack.Screen name="ExpenseList" component={ExpenseList} options={{ headerShown: false }} />
                    <Stack.Screen name="AddExpense" component={AddExpense} options={{ headerShown: false }} />
                    <Stack.Screen name="DataBackupForcely" component={DataBackupForcely} options={{ headerShown: false }} />
                    <Stack.Screen name="SyncPrevData" component={SyncPrevData} options={{ headerShown: false }} />
                  </>
                )}
              </Stack.Navigator>
            </NavigationContainer>
          </View>

          <View style={styles.bottomBar}>
            {/* <PersistentAdBanner /> */}
            {showBottomMenu && (
              <BottomMenu
                activeTab={activeTab}
                onTabPress={handleTabPress}
                themeColors={{
                  primary: '#00A8A8',
                  textPrimary: '#1A535C',
                }}
                TestIds={TestIds}
              />
            )}
          </View>

        </View>
      </SearchContext.Provider>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  navigatorWrapper: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});