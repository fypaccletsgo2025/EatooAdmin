import 'dotenv/config';
import { Client, Databases } from "node-appwrite";

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.VITE_APPWRITE_API_KEY); // Server Key ONLY

const db = new Databases(client);
const DB_ID = process.env.VITE_APPWRITE_DB_ID;

async function createCollections() {

  // USER SUBMISSIONS
  await db.createCollection(DB_ID, "user_submissions", "User Submissions", [], true);

  await db.createStringAttribute(DB_ID, "user_submissions", "name", 100, true);
  await db.createStringAttribute(DB_ID, "user_submissions", "location", 150, true);
  await db.createStringAttribute(DB_ID, "user_submissions", "cuisines", 50, true);
  await db.createStringAttribute(DB_ID, "user_submissions", "theme", 60, false);
  await db.createStringAttribute(DB_ID, "user_submissions", "ambience", 60, false);
  await db.createStringAttribute(DB_ID, "user_submissions", "map", 60, false);
  await db.createStringAttribute(DB_ID, "user_submissions", "note", 250, false);
  await db.createStringAttribute(DB_ID, "user_submissions", "status", 20, false, "pending");
  await db.createStringAttribute(DB_ID, "user_submissions", "type", 20, false, "user");

  console.log("✅ Created: user_submissions");

  // RESTAURANT OWNER REQUESTS
  await db.createCollection(DB_ID, "restaurant_requests", "Restaurant Owner Requests", [], true);

  await db.createStringAttribute(DB_ID, "restaurant_requests", "businessName", 120, true);
  await db.createStringAttribute(DB_ID, "restaurant_requests", "registrationNo", 80, true);
  await db.createStringAttribute(DB_ID, "restaurant_requests", "email", 80, true);
  await db.createStringAttribute(DB_ID, "restaurant_requests", "phone", 30, true);
  await db.createStringAttribute(DB_ID, "restaurant_requests", "address", 200, true);
  await db.createStringAttribute(DB_ID, "restaurant_requests", "city", 80, true);
  await db.createStringAttribute(DB_ID, "restaurant_requests", "state", 80, true);
  await db.createStringAttribute(DB_ID, "restaurant_requests", "postcode", 10, true);
  await db.createStringAttribute(DB_ID, "restaurant_requests", "cuisines", 60, true);
  await db.createStringAttribute(DB_ID, "restaurant_requests", "website", 150, false);
  await db.createStringAttribute(DB_ID, "restaurant_requests", "theme", 60, false);
  await db.createStringAttribute(DB_ID, "restaurant_requests", "ambience", 60, false);
  await db.createStringAttribute(DB_ID, "restaurant_requests", "map", 60, false);
  await db.createStringAttribute(DB_ID, "restaurant_requests", "note", 250, false);
  await db.createStringAttribute(DB_ID, "restaurant_requests", "status", 20, false, "pending");
  await db.createStringAttribute(DB_ID, "restaurant_requests", "type", 20, false, "owner");

  console.log("✅ Created: restaurant_requests");

  console.log("\n🎉 ALL DONE! Collections are ready.\n");
}

createCollections().catch(console.error);
