/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
// import BackgroundFetch from 'react-native-background-fetch';
// import { runSync } from './screens/backup/InitBackgroundSync';

// Headless task — fires when app is completely killed (Android only)
// BackgroundFetch.registerHeadlessTask(async (event) => {
//     const { taskId, timeout } = event;

//     if (timeout) {
//         BackgroundFetch.finish(taskId);
//         return;
//     }

//     console.log('[HeadlessTask] fired:', taskId);
//     await runSync();
//     BackgroundFetch.finish(taskId);
// });

AppRegistry.registerComponent(appName, () => App);