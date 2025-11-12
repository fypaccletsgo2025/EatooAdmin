// seed.js
import 'dotenv/config';
import { Client, Databases, ID } from 'node-appwrite';

const client = new Client();
client.setEndpoint(process.env.VITE_APPWRITE_ENDPOINT);
client.setProject(process.env.VITE_APPWRITE_PROJECT_ID);
client.setKey(process.env.VITE_APPWRITE_API_KEY);   // Check if this method exists in your version
client.setSelfSigned();                            // Add this if you’re using self‑signed/local cert

const db = new Databases(client);
const DB_ID = process.env.VITE_APPWRITE_DB_ID;
const COL_USER = 'user_submissions';
const COL_OWNER = 'restaurant_requests';

async function seed() {
  try {
    const users = [
      { name: 'Example A', location: 'City X', cuisine: 'Thai', contact: '0123456', note: 'Note A', status: 'pending', type: 'user' },
      { name: 'Example B', location: 'City Y', cuisine: 'Brazilian', contact: '0198765', note: 'Note B', status: 'pending', type: 'user' },
    ];

    for (const u of users) {
      await db.createDocument(DB_ID, COL_USER, ID.unique(), u);
      console.log('User submission inserted:', u.name);
    }

    const owners = [
      { businessName: 'Business 1', registrationNo: 'R-100', email: 'one@example.com', phone: '012-1111', address: 'Addr1', city: 'City1', state: 'State1', postcode: '10000', cuisine: 'Mexican', website: '', note: 'Note1', status: 'pending', type: 'owner' },
      { businessName: 'Business 2', registrationNo: 'R-200', email: 'two@example.com', phone: '013-2222', address: 'Addr2', city: 'City2', state: 'State2', postcode: '20000', cuisine: 'Italian', website: 'https://business2.com', note: '', status: 'pending', type: 'owner' },
      { businessName: 'Business 3', registrationNo: 'R-300', email: 'three@example.com', phone: '014-3333', address: 'Addr3', city: 'City3', state: 'State3', postcode: '30000', cuisine: 'Indian', website: 'https://business3.com', note: 'Note3', status: 'pending', type: 'owner' },
    ];

    for (const o of owners) {
      await db.createDocument(DB_ID, COL_OWNER, ID.unique(), o);
      console.log('Owner request inserted:', o.businessName);
    }

    console.log('🎉 Seeding complete.');
  } catch (error) {
    console.error('❌ Seeding error:', error);
  }
}

seed();
