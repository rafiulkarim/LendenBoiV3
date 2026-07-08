/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import BackgroundFetch from 'react-native-background-fetch';
import { runHeadLessSync } from './screens/backup/InitBackgroundSync';

// ✅ App killed/terminated অবস্থায়ও (Android) এই headless task চলবে
const MyHeadlessTask = async (event) => {
    const { taskId, timeout } = event;

    if (timeout) {
        console.log('[HeadlessTask] TIMEOUT:', taskId);
        BackgroundFetch.finish(taskId);
        return;
    }

    console.log('[BackgroundFetch HeadlessTask] start:', taskId);
    await runHeadLessSync();
    BackgroundFetch.finish(taskId);
};

BackgroundFetch.registerHeadlessTask(MyHeadlessTask);

AppRegistry.registerComponent(appName, () => App);