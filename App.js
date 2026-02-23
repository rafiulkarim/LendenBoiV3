import React, { useState, useEffect } from 'react';
import * as eva from '@eva-design/eva';
import { ApplicationProvider, IconRegistry, Button, Card, Layout, Text } from '@ui-kitten/components';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import { default as theme } from './theme.json'; // optional custom theme
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

const Stack = createNativeStackNavigator();

export default function App({ navigation }) {
  const [isLogedIn, setIsLogedIn] = useState(null);
  const [loading, setLoading] = useState(true); // Start with true to show splash
  const [userInfo, setUserInfo] = useState('');

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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Image style={{ width: 160, height: 160 }} source={require('./assets/logo/lendenboi-logo.png')} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ singIn, singOut, myToken: isLogedIn, logedInUserInfo: userInfo }}>
      <StatusBar backgroundColor='#00A8A8' />
      <IconRegistry icons={EvaIconsPack} />
      {/* <ApplicationProvider
        {...eva}
        theme={{ ...eva.light, ...theme }}
      > */}
      <NavigationContainer>
        <Stack.Navigator>
          {
            isLogedIn == null ? (
              <>
                <Stack.Screen
                  name="Login"
                  component={Login}
                  options={{
                    title: '',
                    headerStyle: {
                      backgroundColor: '#FF751A',
                    },
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="Registration"
                  component={Registration}
                  options={{
                    title: '',
                    headerStyle: {
                      backgroundColor: '#FF751A',
                    },
                    headerShown: false,
                  }}
                />
              </>
            ) : (
              <>
                <Stack.Screen
                  name="Welcome"
                  component={Welcome}
                  options={{
                    title: '',
                    headerStyle: {
                      backgroundColor: '#FF751A',
                    },
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="AddClient"
                  component={AddClient}
                  options={{
                    title: '',
                    headerStyle: {
                      backgroundColor: '#FF751A',
                    },
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="Schema"
                  component={Schema}
                  options={{
                    title: '',
                    headerStyle: {
                      backgroundColor: '#FF751A',
                    },
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="ClientList"
                  component={ClientList}
                  options={{
                    title: '',
                    headerStyle: {
                      backgroundColor: '#FF751A',
                    },
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="Report"
                  component={Report}
                  options={{
                    title: '',
                    headerStyle: {
                      backgroundColor: '#FF751A',
                    },
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="SaleAndReceive"
                  component={SaleAndReceive}
                  options={{
                    title: '',
                    headerStyle: {
                      backgroundColor: '#FF751A',
                    },
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="SaleAndReceiveDetails"
                  component={SaleAndReceiveDetails}
                  options={{
                    title: '',
                    headerStyle: {
                      backgroundColor: '#FF751A',
                    },
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="UpdateClient"
                  component={UpdateClient}
                  options={{
                    title: '',
                    headerStyle: {
                      backgroundColor: '#FF751A',
                    },
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="LendenHistory"
                  component={LendenHistory}
                  options={{
                    title: '',
                    headerStyle: {
                      backgroundColor: '#FF751A',
                    },
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="ShortageList"
                  component={ShortageList}
                  options={{
                    title: '',
                    headerStyle: {
                      backgroundColor: '#FF751A',
                    },
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="GroupTagada"
                  component={GroupTagada}
                  options={{
                    title: '',
                    headerStyle: {
                      backgroundColor: '#FF751A',
                    },
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="ExpenseList"
                  component={ExpenseList}
                  options={{
                    title: '',
                    headerStyle: {
                      backgroundColor: '#FF751A',
                    },
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="AddExpense"
                  component={AddExpense}
                  options={{
                    title: '',
                    headerStyle: {
                      backgroundColor: '#FF751A',
                    },
                    headerShown: false,
                  }}
                />
              </>
            )
          }

        </Stack.Navigator>
      </NavigationContainer>
      {/* </ApplicationProvider> */}
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({});