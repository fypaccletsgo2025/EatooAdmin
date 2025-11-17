// updateCollections.js
import { Client, Databases } from "node-appwrite";
import dotenv from "dotenv";

dotenv.config();

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.VITE_APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = process.env.VITE_APPWRITE_DB_ID;

async function addAttributeIfMissing(collectionId, attrConfig) {
  try {
    await databases.createStringAttribute(
      DB_ID,
      collectionId,
      attrConfig.key,
      attrConfig.size,
      attrConfig.required,
      attrConfig.default ?? null
    );
    console.log(`✅ Added attribute "${attrConfig.key}" to ${collectionId}`);
  } catch (err) {
    if (err?.type === "attribute_already_exists") {
      console.log(`⚠️ Attribute "${attrConfig.key}" already exists in ${collectionId}`);
    } else {
      console.error(`❌ Error adding ${attrConfig.key} to ${collectionId}:`, err.message);
    }
  }
}

async function main() {
  const updates = [
  {
    collection: "user_submissions",
    attrs: [
      { key: "status", size: 50, required: false },
      { key: "type", size: 50, required: false },
      { key: "location", size: 100, required: false }, // 👈 NEW
    ],
  },
  {
    collection: "restaurant_requests",
    attrs: [
      { key: "status", size: 50, required: false },
      { key: "type", size: 50, required: false },
      { key: "location", size: 100, required: false }, // 👈 NEW
    ],
  },
];


  for (const { collection, attrs } of updates) {
    console.log(`\n🔧 Updating collection: ${collection}`);
    for (const attr of attrs) {
      await addAttributeIfMissing(collection, attr);
    }
  }
}

main().catch(console.error);
