import moment from 'moment';
import React from 'react'
import { View } from 'react-native'
import { Button } from 'react-native-paper'

import { openDatabase } from 'react-native-sqlite-storage';
const db = openDatabase({ name: 'lenden_boi.db', createFromLocation: 1 });

const Schema = () => {

  const tableCreate = () => {
    db.transaction(function (txn) {
      // txn.executeSql(
      //   "SELECT name FROM sqlite_master WHERE type='table' AND name='clients'",
      //   [],
      //   function (tx, res) {
      //     txn.executeSql('DROP TABLE IF EXISTS clients', [],
      //       () => console.log("Clients table dropped successfully"),
      //       (error) => console.error("Error dropping clients table:", error)
      //     );
      //     txn.executeSql(
      //       `CREATE TABLE IF NOT EXISTS clients (
      //             id VARCHAR(25),
      //             name VARCHAR(100),
      //             phone_no VARCHAR(20),
      //             address VARCHAR(200),
      //             amount VARCHAR(200),
      //             amount_type VARCHAR(20),
      //             status VARCHAR(20),
      //             type VARCHAR(20),
      //             shop_id INTEGER(10),
      //             sync_status VARCHAR(20),
      //             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //             updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      //         )`,
      //       [],
      //       () => console.log("Clients table created successfully"),
      //       (error) => console.error("Error creating clients table:", error)
      //     );
      //   },
      //   (error) => console.error("Error checking clients table:", error) // Log if the SELECT query fails
      // );

      // txn.executeSql(
      //   "SELECT name FROM sqlite_master WHERE type='table' AND name='ledgers'",
      //   [],
      //   function (tx, res) {
      //     txn.executeSql('DROP TABLE IF EXISTS ledgers', [],
      //       () => console.log("Ledgers table dropped successfully"),
      //       (error) => console.error("Error dropping ledgers table:", error)
      //     );
      //     txn.executeSql(
      //       `CREATE TABLE IF NOT EXISTS ledgers (
      //             id VARCHAR(25),
      //             client_id VARCHAR(100),
      //             transaction_type VARCHAR(20),
      //             transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //             amount VARCHAR(200),
      //             comments VARCHAR(255),
      //             entry_by INTEGER(10),
      //             shop_id INTEGER(10),
      //             sync_status VARCHAR(10),
      //             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //             updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      //         )`,
      //       [],
      //       () => console.log("ledgers table created successfully"),
      //       (error) => console.error("Error creating ledgers table:", error)
      //     );
      //   },
      //   (error) => console.error("Error checking ledgers table:", error) // Log if the SELECT query fails
      // );

      // txn.executeSql(
      //   "SELECT name FROM sqlite_master WHERE type='table' AND name='sms_settings'",
      //   [],
      //   function (tx, res) {
      //     txn.executeSql('DROP TABLE IF EXISTS sms_settings', [],
      //       () => console.log("sms_settings table dropped successfully"),
      //       (error) => console.error("Error dropping sms_settings table:", error)
      //     );
      //     txn.executeSql(
      //       `CREATE TABLE IF NOT EXISTS sms_settings (
      //         id TEXT PRIMARY KEY,
      //         shop_id INTEGER(10),
      //         selected_sim_id INTEGER(10),
      //         sim_display_name VARCHAR(255),
      //         subscription_id INTEGER(10),
      //         is_no_sim_option INTEGER DEFAULT 0,
      //         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      //       )`,
      //       [],
      //       () => console.log("sms_settings table created successfully"),
      //       (error) => console.error("Error creating sms_settings table:", error)
      //     );
      //   },
      //   (error) => console.error("Error checking sms_settings table:", error) // Log if the SELECT query fails
      // );

      // txn.executeSql(
      //   "SELECT name FROM sqlite_master WHERE type='table' AND name='shortages'",
      //   [],
      //   function (tx, res) {
      //     txn.executeSql('DROP TABLE IF EXISTS shortages', [],
      //       () => console.log("shortages table dropped successfully"),
      //       (error) => console.error("Error dropping shortages table:", error)
      //     );
      //     txn.executeSql(
      //       `CREATE TABLE IF NOT EXISTS shortages (
      //         id VARCHAR(25),
      //         title VARCHAR(255),
      //         shop_id INTEGER(10),
      //         user_id INTEGER(10),
      //         status VARCHAR(20),
      //         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      //         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      //       )`,
      //       [],
      //       () => console.log("shortages table created successfully"),
      //       (error) => console.error("Error creating shortages table:", error)
      //     );
      //   },
      //   (error) => console.error("Error checking shortages table:", error) // Log if the SELECT query fails
      // );

      txn.executeSql(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='expenses'",
        [],
        function (tx, res) {
          txn.executeSql('DROP TABLE IF EXISTS expenses', [],
            () => console.log("expenses table dropped successfully"),
            (error) => console.error("Error dropping expenses table:", error)
          );
          txn.executeSql(
            `CREATE TABLE IF NOT EXISTS expenses (
              id VARCHAR(25),
              title VARCHAR(255),
              shop_id INTEGER(10),
              user_id INTEGER(10),
              amount DECIMAL(10,2),
              transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              status VARCHAR(20),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            [],
            () => console.log("expenses table created successfully"),
            (error) => console.error("Error creating expenses table:", error)
          );
        },
        (error) => console.error("Error checking expenses table:", error) // Log if the SELECT query fails
      );
    });


    // db.transaction(tx => {
    //   const clients = [];

    //   // Date range setup
    //   const startDate = new Date('2024-01-01');
    //   const today = new Date();
    //   const totalDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)); // Days between

    //   // Generate 500 records
    //   for (let i = 0; i < 500; i++) {
    //     const id = `${12345678910 + i}`;
    //     const name = `Rafi ${i + 1}`;

    //     // Generate phone number: "01" + 9 digits (111111111 to 999999999)
    //     const phoneSuffix = String(11111111 + (i % 88888889)).padStart(8, '0');
    //     const phone_no = `018${phoneSuffix}`;

    //     // Generate created_at date (spread evenly from 2024-01-01 to today)
    //     const daysOffset = Math.floor((i * totalDays) / 500);
    //     const createdDate = new Date(startDate);
    //     createdDate.setDate(startDate.getDate() + daysOffset);
    //     const created_at = createdDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    //     const updated_at = createdDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    //     // Generate sample data for other fields
    //     const address = `Address ${i + 1}, City ${(i % 10) + 1}`;
    //     const amount = (Math.random() * 10000).toFixed(2);
    //     const status = "Active";
    //     const type = "Customer";
    //     const shopId = 4;
    //     const sync_status = "No"

    //     const amountType = i % 10 == 0 ? "Advance" : "Due";

    //     // Push ALL 7 values that match SQL placeholders
    //     clients.push([id, name, phone_no, address, amount, status, created_at, updated_at, type, amountType, shopId]);
    //   }

    //   // Execute each insert
    //   clients.forEach((clientData, index) => {
    //     tx.executeSql(
    //       'INSERT INTO clients (id, name, phone_no, address, amount, status, created_at, updated_at, type, amount_type, shop_id, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    //       clientData,
    //       (tx, results) => {
    //         if (index === clients.length - 1) {
    //           console.log(`All ${clients.length} records inserted`);
    //         }
    //       },
    //       (tx, error) => {
    //         console.error(`Insert failed at index ${index}:`, error.message);
    //         return false;
    //       }
    //     );
    //   });
    // },
    //   (error) => {
    //     console.error('Transaction error:', error);
    //   },
    //   () => {
    //     console.log('Transaction completed successfully');
    //   });

    // db.transaction(tx => {
    //   tx.executeSql(
    //     'SELECT * FROM clients',
    //     [],
    //     (tx, results) => {
    //       console.log(results.rows.raw()); // Output number of rows affected
    //     },
    //     (tx, error) => {
    //       console.error('Insert failed:', error.message);
    //     },
    //   );
    // });

    // db.transaction(tx => {
    //   tx.executeSql(
    //     'UPDATE clients SET created_at = ?, updated_at = ?, amount = ?  WHERE id = ?',
    //     ["2026-01-23", "2026-01-23", 0, "12345679409"],
    //     (tx, results) => {
    //       if (results.rowsAffected > 0) {
    //         console.log('First record updated');
    //       } else {
    //         console.log('No record found with id: 12345679409');
    //       }
    //     },
    //     (tx, error) => {
    //       console.error('Update error:', error.message);
    //       return false; // This will rollback the transaction
    //     }
    //   );

    //   tx.executeSql(
    //     'UPDATE clients SET created_at = ?, updated_at = ? WHERE id = ?',
    //     ["2026-01-22", "2026-01-22", "12345679408"],
    //     (tx, results) => {
    //       if (results.rowsAffected > 0) {
    //         console.log('Second record updated');
    //       } else {
    //         console.log('No record found with id: 12345679408');
    //       }
    //     },
    //     (tx, error) => {
    //       console.error('Update error:', error.message);
    //       return false;
    //     }
    //   );

    //   tx.executeSql(
    //     'UPDATE clients SET created_at = ?, updated_at = ?, type = ? WHERE id = ?',
    //     ["2026-01-21", "2026-01-21", 'Supplier', "12345679407"],
    //     (tx, results) => {
    //       if (results.rowsAffected > 0) {
    //         console.log('Third record updated');
    //       } else {
    //         console.log('No record found with id: 12345679407');
    //       }
    //     },
    //     (tx, error) => {
    //       console.error('Update error:', error.message);
    //       return false;
    //     }
    //   );
    // },
    //   (error) => {
    //     console.error('Transaction failed:', error);
    //   },
    //   () => {
    //     console.log('Transaction completed successfully');
    //   });

    // db.transaction(tx => {
    //   tx.executeSql(
    //     'SELECT * FROM clients ORDER BY updated_at DESC',
    //     [],
    //     (tx, results) => {
    //       console.log(results.rows.raw()); // Output number of rows affected
    //     },
    //     (tx, error) => {
    //       console.error('Insert failed:', error.message);
    //     },
    //   );
    // });

  }

  const allTableData = () => {
    db.transaction(function (txn) {
      // txn.executeSql(
      //   'INSERT INTO sms_settings (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
      //   [1, "no-sim-selected", moment().format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')],
      //   (tx, results) => {
      //     console.log(`SIM data inserted Successfully`);
      //   },
      //   (tx, error) => {
      //     console.error(`Insert failed :`, error.message);
      //   }
      // );

      txn.executeSql(
        `SELECT * FROM sim_settings`,
        [],
        (tx, results) => {
          console.log(results.rows.raw())
        },
        (error) => console.error("Error creating ledgers table:", error)
      )
    })
  }


  return (
    <>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Button style={{
        }}
          onPress={() => tableCreate()} mode='contained'
        >Delete All table and Generate table</Button>


        <Button style={{
        }}
          onPress={() => allTableData()} mode='contained'
        >All table Data</Button>
      </View>
    </>
  )
}

export default Schema
