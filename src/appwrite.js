// src/appwrite.js
import { Client, Databases } from 'appwrite';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT);

const db = new Databases(client);
const DB_ID = import.meta.env.VITE_APPWRITE_DB_ID; // add this

export { client, db, DB_ID };
