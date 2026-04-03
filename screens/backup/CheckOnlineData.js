
import axios from 'axios';
import { openDatabase } from 'react-native-sqlite-storage';
import { BASE_URL } from '../../env';
const db = openDatabase({ name: 'lenden_boi.db', createFromLocation: 1 })

// ─────────────────────────────────────────────
// Helper: run a SQL query (Promise-based)
// ─────────────────────────────────────────────
const runQuery = async (sql, params = []) => {
  console.log(sql, params);

  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        sql,
        params,
        (_, result) => {
          // console.log('Query successful:', sql);
          resolve(result);
        },
        (_, error) => {
          const msg = error?.message ?? error ?? 'Unknown SQL error';
          console.error(`SQL Error on: ${sql}\nParams: ${JSON.stringify(params)}\nError: ${msg}`);
          reject(new Error(msg));
          return true; // Return true to rollback transaction
        }
      );
    }, (error) => {
      // Transaction error callback
      console.error(`Transaction error: ${error}`);
      reject(new Error(`Transaction failed: ${error}`));
    });
  });
};

const getClients = async (table) => {
  const result = await runQuery(
    `SELECT COUNT(id) as total FROM ${table}`,
    []
  );

  return result.rows.item(0).total; // ✅ correct count
};

export const CheckOnlineData = async (token, navigation) => {
  try {
    console.log('comes');

    // 1. Get local data count
    const totalLocalClient = await getClients('clients');
    console.log('totalLocalClient', totalLocalClient);

    if (totalLocalClient == 0) {
      // 2. Call API to check server data
      const response = await axios.get(`${BASE_URL}/data-check`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const totalServerClient = response?.data?.data || 0;
      console.log('totalServerClient', totalServerClient);

      console.log('totalLocalClient', totalLocalClient);
      console.log('totalServerClient', totalServerClient);

      // 3. Main condition
      if (totalLocalClient == 0 && totalServerClient?.clients > 0) {
        console.log('Redirecting to SyncPrevData...');
        navigation.replace('SyncPrevData');
      } else {
        console.log('No need to sync');
      }
    } else {
      console.log('Already have data');
    }

  } catch (error) {
    console.error('CheckOnlineData Error:', error);
  }
};