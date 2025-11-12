// src/appwrite.js
import { Client, Databases } from "appwrite";

const clean = (value) => (typeof value === "string" ? value.trim() : undefined);

const endpoint = clean(import.meta.env.VITE_APPWRITE_ENDPOINT);
const projectId = clean(import.meta.env.VITE_APPWRITE_PROJECT_ID);
const databaseId = clean(import.meta.env.VITE_APPWRITE_DB_ID);
const apiKey = clean(import.meta.env.VITE_APPWRITE_API_KEY);

export const APPWRITE_READY = Boolean(endpoint && projectId && databaseId);

let dbInstance = null;

if (APPWRITE_READY) {
  const client = new Client().setEndpoint(endpoint).setProject(projectId);

  if (apiKey) {
    if (typeof client.setKey === "function") {
      client.setKey(apiKey);
    } else {
      console.warn(
        "Appwrite browser SDK cannot use API keys. Keep the server key on a backend or Appwrite Function instead of exposing it to the client."
      );
    }
  }

  dbInstance = new Databases(client);
} else if (import.meta.env.DEV) {
  console.warn(
    "Missing Appwrite configuration. Define VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, and VITE_APPWRITE_DB_ID in .env before running the app."
  );
}

export const db = dbInstance;
export const DB_ID = databaseId;

export const COL_REQUESTS = "restaurant_requests";
export const COL_USER_SUBMISSIONS = "user_submissions";
export const COL_RESTAURANTS = "restaurants";
