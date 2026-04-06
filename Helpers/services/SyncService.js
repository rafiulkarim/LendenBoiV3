import axios from 'axios';
import { openDatabase } from 'react-native-sqlite-storage';
import { BASE_URL } from '../../env';
import AsyncStorage from '@react-native-async-storage/async-storage';
const db = openDatabase({ name: 'lenden_boi.db', createFromLocation: 1 });

// ─────────────────────────────────────────────
// Helper: run a SQL query (Promise-based)
// ─────────────────────────────────────────────
const runQuery = async (sql, params = []) => {
  // console.log(sql, params);

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

// ─────────────────────────────────────────────
// Helper: fetch all unsynced rows from a table
// sync_status = 'No' means not yet synced
// ─────────────────────────────────────────────
const getUnsynced = async (table) => {
  const result = await runQuery(
    `SELECT * FROM ${table} WHERE sync_status = ?`,
    ['No']
  );
  const rows = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(result.rows.item(i));
  }
  return rows;
};

// ─────────────────────────────────────────────
// Helper: fetch active shortages (no sync_status column)
// Always retrieves all rows where status = 'Active'
// ─────────────────────────────────────────────
const getActiveShortages = async () => {
  const result = await runQuery(
    `SELECT * FROM shortages WHERE status = ?`,
    ['Pending']
  );
  const rows = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(result.rows.item(i));
  }
  return rows;
};

// ─────────────────────────────────────────────
// Helper: mark rows as synced (sync_status = 'Yes')
// Uses local row `id` (integer PK) for the WHERE IN
// ─────────────────────────────────────────────
const markAsSynced = async (table, ids, idField = 'id') => {
  if (!ids || ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(', ');
  await runQuery(
    `UPDATE ${table} SET sync_status = ? WHERE ${idField} IN (${placeholders})`,
    ['Yes', ...ids]
  );
};

// ─────────────────────────────────────────────
// Main Sync Function
// onProgress(step, percent, label) — called throughout
// ─────────────────────────────────────────────
export const syncData = async (token, onProgress) => {
  // console.log('comes')
  const report = (percent, label) => {
    if (typeof onProgress === 'function') onProgress(percent, label);
  };

  // ── Step 1: Fetch unsynced rows ──────────────
  report(5, 'স্থানীয় ডেটা পড়া হচ্ছে...');

  const [clients, ledgers, shortages, expenses] = await Promise.all([
    getUnsynced('clients'),
    getUnsynced('ledgers'),
    getUnsynced('shortages'),
    // getActiveShortages(),
    getUnsynced('expenses'),
  ]);

  console.log('📊 Data counts:', {
    clients: clients.length,
    ledgers: ledgers.length,
    shortages: shortages.length,
    expenses: expenses.length
  });

  const totalCount = clients.length + ledgers.length + shortages.length + expenses.length;

  // console.log('totalCount', totalCount)

  report(15, `${totalCount} টি রেকর্ড পাওয়া গেছে`);

  if (totalCount === 0) {
    report(100, 'সিঙ্ক করার কিছু নেই');
    return {
      success: true,
      message: 'Nothing to sync.',
      synced: { clients: 0, ledgers: 0, shortages: 0, expenses: 0, total: 0 },
    };
  }

  // ── Step 2: Build payload ────────────────────
  report(25, 'ডেটা প্রস্তুত করা হচ্ছে...');

  const payload = {
    clients: clients.map(c => ({
      id: c.slug ?? c.id,
      name: c.name,
      shop_id: c.shop_id,
      phone_no: c.phone_no,
      // picture: c.picture ?? '',
      address: c.address ?? '',
      amount: c.amount,
      amount_type: c.amount_type,
      status: c.status,
      type: c.type,
      sync_status: "Yes",
      created_at: c.created_at,
      updated_at: c.updated_at,
    })),

    ledgers: ledgers.map(l => ({
      id: l.slug ?? l.id,
      shop_id: l.shop_id,
      client_id: l.client_id,
      transaction_type: l.transaction_type,
      transaction_date: l.transaction_date,
      amount: l.amount,
      comments: l.comments ?? '',
      entry_by: l.entry_by,
      sync_status: "Yes",
      created_at: l.created_at,
      updated_at: l.updated_at,
    })),

    shortages: shortages.map(s => ({
      id: s.id,
      shop_id: s.shop_id,
      title: s.title,
      status: s.status,
      created_at: s.created_at,
      updated_at: s.updated_at,
    })),

    expenses: expenses.map(e => ({
      id: e.id,
      shop_id: e.shop_id,
      title: e.title,
      amount: e.amount,
      date: e.date,
      sync_status: "Yes",
      created_at: e.created_at,
      updated_at: e.updated_at,
    })),
  };

  // console.log('payload', payload)

  // ── Step 3: Send to server ───────────────────
  report(40, `সার্ভারে আপলোড হচ্ছে... (${totalCount} রেকর্ড)`);

  const response = await axios.post(`${BASE_URL}/sync`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  // console.log('Server response:', response.data);

  if (response.data?.code != 201) {
    throw new Error(response.data?.message ?? 'Sync failed on server.');
  }

  report(70, 'সার্ভার সফলভাবে গ্রহণ করেছে');

  // ── Step 4: Mark as synced locally ──────────
  report(80, 'স্থানীয় ডেটা আপডেট হচ্ছে...');

  await Promise.all([
    clients.length > 0
      ? markAsSynced('clients', clients.map(c => c.id))
      : Promise.resolve(),

    ledgers.length > 0
      ? markAsSynced('ledgers', ledgers.map(l => l.id))
      : Promise.resolve(),

    shortages.length > 0
      ? markAsSynced('shortages', shortages.map(s => s.id))
      : Promise.resolve(),

    expenses.length > 0
      ? markAsSynced('expenses', expenses.map(e => e.id))
      : Promise.resolve(),
  ]);

  report(100, 'সিঙ্ক সম্পন্ন হয়েছে ✓');
  await AsyncStorage.setItem('last_sync_at', new Date().toISOString());

  console.log(`✅ Sync complete — clients: ${clients.length}, ledgers: ${ledgers.length}, shortages: ${shortages.length}, expenses: ${expenses.length}`);

  return {
    success: true,
    synced: {
      clients: clients.length,
      ledgers: ledgers.length,
      shortages: shortages.length,
      expenses: expenses.length,
      total: totalCount,
    },
  };
};