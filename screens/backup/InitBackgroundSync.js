import BackgroundFetch from 'react-native-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { syncData } from '../../Helpers/services/SyncService';
import { useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import { CheckInternetConnection } from '../../Helpers/Internet/CheckInternetConnection';
import moment from 'moment';


const SYNC_INTERVAL = 120; // minutes

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
  // console.log('checkInternet', checkInternet)
  if (checkInternet.isConnected && checkInternet.isInternetReachable) {
    await runSync(myToken);
    // BackgroundFetch.configure(
    //   {
    //     minimumFetchInterval: 15,
    //     stopOnTerminate: false,
    //     startOnBoot: true,
    //     enableHeadless: true
    //   },
    //   async (taskId) => {
    //     console.log(taskId)
    //     await runSync(myToken); // outer closure variable
    //     BackgroundFetch.finish(taskId);
    //   },
    //   (err) => console.log('[BackgroundFetch] Error:', err),
    // );
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

export const runHeadLessSync = async () => {
  const { isConnected } = await NetInfo.fetch();
  if (!isConnected) {
    console.log('[Sync] No internet, skipping');
    return;
  }

  try {
    const storedData = await AsyncStorage.getItem('user_info');
    if (storedData) {
      const { token } = JSON.parse(storedData);
      console.log('token', token)

      if (!token) {
        console.warn('[Sync] No token found, skipping');
        return;
      }
      await syncData(token, '');
      await AsyncStorage.setItem('last_sync_at', new Date().toISOString());
      console.log('[Sync] Success');
    } else {
      console.log('[Sync] token not retrive');
    }
  } catch (e) {
    console.warn('[Sync] Failed:', e.message);
  }
}

// ✅ এটা শুধু configure করবে, app root থেকে একবার কল হবে
export const InitBackgroundHeadLessSync = async () => {
  BackgroundFetch.configure(
    {
      minimumFetchInterval: 15, // Android minimum
      stopOnTerminate: false,   // Android: task terminate হওয়ার পরও চলবে
      startOnBoot: true,        // ফোন restart হলেও চলবে
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    },
    async (taskId) => {
      console.log('comes InitBackgroundHeadLessSync')
      console.log('[BackgroundFetch] foreground/background event:', taskId);
      await runHeadLessSync();
      BackgroundFetch.finish(taskId);
    },
    (err) => console.log('[BackgroundFetch] configure error:', err),
  );

  // status check (optional but ভালো practice)
  const status = await BackgroundFetch.status();
  console.log('[BackgroundFetch] status:', status);
};