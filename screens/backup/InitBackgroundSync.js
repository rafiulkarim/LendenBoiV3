import BackgroundFetch from 'react-native-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { syncData } from '../../Helpers/services/SyncService';
import { useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import { CheckInternetConnection } from '../../Helpers/Internet/CheckInternetConnection';
import moment from 'moment';


const SYNC_INTERVAL = 60; // minutes

const isDue = async () => {
  const last = await AsyncStorage.getItem('last_sync_at');
  console.log(last)
  if (!last) return true;
  console.log(moment().diff(moment(last), 'minutes'), 'min')
  return moment().diff(moment(last), 'minutes') >= SYNC_INTERVAL;
};

export const runSync = async (myToken) => {
  // const { myToken } = useContext(AuthContext)
  // console.log('comes runSync', myToken)
  const { isConnected } = await NetInfo.fetch();
  if (!isConnected || !(await isDue())) return;

  try {
    await syncData(myToken, '');
    await AsyncStorage.setItem('last_sync_at', new Date().toISOString());
  } catch (e) {
    console.warn('[Sync] Failed:', e.message);
  }
};

const InitBackgroundSync = async (myToken) => {
  // console.log('comes InitBackgroundSync', myToken)
  const checkInternet = await CheckInternetConnection()
  // console.log(checkInternet)
  if (checkInternet.isConnected && checkInternet.isInternetReachable) {
    await runSync(myToken);
  }
  // BackgroundFetch.configure(
  //   {
  //     minimumFetchInterval: 15,
  //     stopOnTerminate: false,
  //     startOnBoot: true,
  //     enableHeadless: true
  //   },
  //   async (taskId, myToken) => {
  //     await runSync(myToken);
  //     BackgroundFetch.finish(taskId);
  //   },
  //   (err) => console.log('[BackgroundFetch] Error:', err),
  // );
}


export default InitBackgroundSync;