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
        cuisines: 'Coffee, Bakery',
        theme: 'Cozy cafe',
        ambience: ['Warm', 'Relaxed'],
        contact: '+61 3 9123 0001',
        map: null,
        note: 'Cozy spot with amazing croissants',
        status: 'pending',
        type: 'user',
      },
      {
        name: 'Sushi Corner',
        cuisines: 'Japanese',
        theme: 'Minimalist sushi bar',
        ambience: ['Quiet', 'Intimate'],
        contact: '+61 3 9123 0002',
        map: null,
        note: 'Small sushi stall near the fountain',
        status: 'pending',
        type: 'user',
      },
      {
        name: 'Burger Town',
        cuisines: 'American, Fast Food',
        theme: 'Retro diner',
        ambience: ['Casual', 'Lively'],
        contact: '+61 3 9123 0003',
        map: null,
        note: 'Affordable burgers, good for students',
        status: 'pending',
        type: 'user',
      },
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
        address: '18 Jalan PJU 8/5A',
        city: 'Petaling Jaya',
        state: 'Selangor',
        postcode: '47810',
        cuisines: 'Western',
        website: 'https://sunsetgrill.example.com',
        theme: 'Seaside grill',
        ambience: ['Open-air', 'Sunset views', 'Romantic'],
        note: 'Outdoor seating available',
        status: 'pending',
        type: 'owner',
      },
      {
        businessName: 'Noodle Haven',
        registrationNo: 'RG-1002',
        email: 'owner2@noodle.com',
        phone: '+60123456702',
        address: '45 Lorong Love Lane',
        city: 'George Town',
        state: 'Penang',
        postcode: '10200',
        cuisines: 'Chinese',
        website: '',
        theme: 'Heritage noodle house',
        ambience: ['Traditional', 'Bustling', 'Street-style'],
        note: 'Authentic handmade noodles',
        status: 'pending',
        type: 'owner',
      },
      {
        businessName: 'Taco Fiesta',
        registrationNo: 'RG-1003',
        email: 'owner3@taco.com',
        phone: '+60123456703',
        address: '78 Jalan Sutera',
        city: 'Iskandar Puteri',
        state: 'Johor',
        postcode: '79100',
        cuisines: 'Mexican',
        website: 'https://tacofiesta.example.com',
        theme: 'Fiesta cantina',
        ambience: ['Festive', 'Colorful', 'Live music'],
        note: 'Live music on weekends',
        status: 'pending',
        type: 'owner',
      },
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
