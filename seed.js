// seed.js
import 'dotenv/config';
import { Client, Databases, ID } from 'node-appwrite';

const client = new Client();
client.setEndpoint(process.env.VITE_APPWRITE_ENDPOINT);
client.setProject(process.env.VITE_APPWRITE_PROJECT_ID);
client.setKey(process.env.VITE_APPWRITE_API_KEY);
client.setSelfSigned(); // if using self-signed/local cert

const db = new Databases(client);
const DB_ID = process.env.VITE_APPWRITE_DB_ID;
const COL_USER = 'user_submissions';
const COL_OWNER = 'restaurant_requests';

async function seed() {
  try {
    // --- USER SUBMISSIONS ---
    const users = [
      {
        name: 'Cafe Aroma',
        location: 'Bangsar',
        cuisine: 'Coffee & Bakery',
        contact: 'user1@example.com',
        note: 'Cozy spot with amazing croissants',
        status: 'pending',
        type: 'user'
      },
      {
        name: 'Sushi Corner',
        location: 'KLCC',
        cuisine: 'Japanese',
        contact: 'user2@example.com',
        note: 'Small sushi stall near the fountain',
        status: 'pending',
        type: 'user'
      },
      {
        name: 'Burger Town',
        location: 'Petaling Jaya',
        cuisine: 'Fast Food',
        contact: 'user3@example.com',
        note: 'Affordable burgers, good for students',
        status: 'pending',
        type: 'user'
      }
    ];

    for (const u of users) {
      await db.createDocument(DB_ID, COL_USER, ID.unique(), u);
      console.log('User submission inserted:', u.name);
    }

    // --- OWNER REQUESTS ---
    const owners = [
      {
        businessName: 'Sunset Grill',
        registrationNo: 'RG-1001',
        email: 'owner1@sunset.com',
        phone: '+60123456701',
        address: '12 Ocean Drive',
        city: 'Kuala Lumpur',
        state: 'KL',
        postcode: '50000',
        cuisine: 'Western',
        website: 'http://sunsetgrill.com',
        note: 'Outdoor seating available',
        status: 'pending',
        type: 'owner'
      },
      {
        businessName: 'Noodle Haven',
        registrationNo: 'RG-1002',
        email: 'owner2@noodle.com',
        phone: '+60123456702',
        address: '45 Street Lane',
        city: 'Penang',
        state: 'Penang',
        postcode: '10200',
        cuisine: 'Chinese',
        website: '',
        note: 'Authentic handmade noodles',
        status: 'pending',
        type: 'owner'
      },
      {
        businessName: 'Taco Fiesta',
        registrationNo: 'RG-1003',
        email: 'owner3@taco.com',
        phone: '+60123456703',
        address: '78 Market Street',
        city: 'Johor Bahru',
        state: 'Johor',
        postcode: '80000',
        cuisine: 'Mexican',
        website: 'http://tacofiesta.com',
        note: 'Live music on weekends',
        status: 'pending',
        type: 'owner'
      }
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
