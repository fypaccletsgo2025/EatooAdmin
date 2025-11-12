import express from "express";
import cors from "cors";
import "dotenv/config";
import { Client, Databases, ID, Query } from "node-appwrite";

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.VITE_APPWRITE_API_KEY);

const db = new Databases(client);
const DB_ID = process.env.VITE_APPWRITE_DB_ID;
const COL_REQUESTS = "restaurant_requests";
const COL_USER_SUBMISSIONS = "user_submissions";
const COL_RESTAURANTS = "restaurants";

const serverError = (res, err) => {
  console.error(err);
  res.status(500).json({ message: err.message || "Internal server error." });
};

app.get("/restaurant-requests", async (_req, res) => {
  try {
    const requests = await db.listDocuments(DB_ID, COL_REQUESTS, [
      Query.equal("status", "pending"),
      Query.orderDesc("$createdAt"),
      Query.limit(200),
    ]);
    res.json({ ok: true, documents: requests.documents });
  } catch (err) {
    serverError(res, err);
  }
});

app.get("/user-submissions", async (_req, res) => {
  try {
    const [pending, contacted] = await Promise.all([
      db.listDocuments(DB_ID, COL_USER_SUBMISSIONS, [
        Query.equal("status", "pending"),
        Query.orderDesc("$createdAt"),
        Query.limit(200),
      ]),
      db.listDocuments(DB_ID, COL_USER_SUBMISSIONS, [
        Query.equal("status", "contacted"),
        Query.orderDesc("$createdAt"),
        Query.limit(200),
      ]),
    ]);
    res.json({
      ok: true,
      pending: pending.documents,
      contacted: contacted.documents,
    });
  } catch (err) {
    serverError(res, err);
  }
});

app.get("/manage-restaurants", async (_req, res) => {
  try {
    const [live, contacted] = await Promise.all([
      db.listDocuments(DB_ID, COL_RESTAURANTS, [
        Query.orderDesc("$createdAt"),
        Query.limit(200),
      ]),
      db.listDocuments(DB_ID, COL_USER_SUBMISSIONS, [
        Query.equal("status", "contacted"),
        Query.orderDesc("$createdAt"),
        Query.limit(200),
      ]),
    ]);
    res.json({
      ok: true,
      live: live.documents,
      contacted: contacted.documents,
    });
  } catch (err) {
    serverError(res, err);
  }
});

app.get("/dashboard-metrics", async (_req, res) => {
  try {
    const [restaurants, ownerRequests, userSubmissions, contactedSubs] = await Promise.all([
      db.listDocuments(DB_ID, COL_RESTAURANTS, [
        Query.orderDesc("$createdAt"),
        Query.limit(6),
      ]),
      db.listDocuments(DB_ID, COL_REQUESTS, [
        Query.equal("status", "pending"),
        Query.orderDesc("$createdAt"),
        Query.limit(5),
      ]),
      db.listDocuments(DB_ID, COL_USER_SUBMISSIONS, [
        Query.equal("status", "pending"),
        Query.orderDesc("$createdAt"),
        Query.limit(5),
      ]),
      db.listDocuments(DB_ID, COL_USER_SUBMISSIONS, [
        Query.equal("status", "contacted"),
        Query.limit(1),
      ]),
    ]);

    res.json({
      ok: true,
      stats: {
        totalRestaurants: restaurants.total ?? restaurants.documents.length,
        pendingOwner: ownerRequests.total ?? ownerRequests.documents.length,
        pendingUser: userSubmissions.total ?? userSubmissions.documents.length,
        contacted: contactedSubs.total ?? contactedSubs.documents.length,
      },
      recentRestaurants: restaurants.documents,
      ownerQueue: ownerRequests.documents,
      userQueue: userSubmissions.documents,
    });
  } catch (err) {
    serverError(res, err);
  }
});

app.post("/contact-user-submission", async (req, res) => {
  try {
    const { documentId } = req.body;
    await db.updateDocument(DB_ID, COL_USER_SUBMISSIONS, documentId, { status: "contacted" });
    res.json({ ok: true, message: "Submission marked as contacted." });
  } catch (err) {
    serverError(res, err);
  }
});

app.post("/approve-user-submission", async (req, res) => {
  try {
    const { documentId, overrides } = req.body;
    const submission = await db.getDocument(DB_ID, COL_USER_SUBMISSIONS, documentId);

    const name = overrides?.name || submission.name;
    if (!name) {
      throw new Error("Missing restaurant name.");
    }

    const restaurantDoc = await db.createDocument(DB_ID, COL_RESTAURANTS, documentId, {
      name,
      cuisine: overrides?.cuisine || submission.cuisine,
      city: overrides?.city || submission.city || submission.location || "",
      state: overrides?.state || submission.state || "",
      address: overrides?.address || submission.address || "",
      contact: overrides?.contact || submission.contact || "",
      phone: overrides?.phone || submission.phone || "",
      email: overrides?.email || submission.email || "",
      website: overrides?.website || submission.website || "",
      note: submission.note || "",
      status: "live",
      type: "user",
      ownerId: submission.ownerId || submission.$id,
    });

    await db.deleteDocument(DB_ID, COL_USER_SUBMISSIONS, documentId);

    res.json({
      ok: true,
      message: `${name} moved to live restaurants.`,
      restaurant: restaurantDoc,
    });
  } catch (err) {
    serverError(res, err);
  }
});

app.post("/reject-user-submission", async (req, res) => {
  try {
    const { documentId, reason } = req.body;
    await db.updateDocument(DB_ID, COL_USER_SUBMISSIONS, documentId, {
      status: "rejected",
      note: reason || "",
    });
    res.json({ ok: true, message: "Submission rejected." });
  } catch (err) {
    serverError(res, err);
  }
});

app.post("/approve-restaurant-request", async (req, res) => {
  try {
    const { documentId, overrides = {} } = req.body;
    const request = await db.getDocument(DB_ID, COL_REQUESTS, documentId);

    const name = overrides.name || request.businessName || request.name;
    if (!name) {
      throw new Error("Missing restaurant name.");
    }

    const restaurantDoc = await db.createDocument(DB_ID, COL_RESTAURANTS, ID.unique(), {
      name,
      businessName: overrides.businessName || request.businessName || name,
      registrationNo: overrides.registrationNo || request.registrationNo || "",
      email: overrides.email || request.email || "",
      phone: overrides.phone || request.phone || "",
      address: overrides.address || request.address || "",
      city: overrides.city || request.city || "",
      state: overrides.state || request.state || "",
      postcode: overrides.postcode || request.postcode || "",
      cuisine: overrides.cuisine || request.cuisine || "",
      website: overrides.website || request.website || "",
      note: overrides.note || request.note || "",
      status: "live",
      type: "owner",
      ownerId: overrides.ownerId || request.ownerId || request.$id || ID.unique(),
    });

    await db.deleteDocument(DB_ID, COL_REQUESTS, documentId);

    res.json({
      ok: true,
      message: `${name} approved and moved to live restaurants.`,
      restaurant: restaurantDoc,
    });
  } catch (err) {
    serverError(res, err);
  }
});

app.post("/reject-restaurant-request", async (req, res) => {
  try {
    const { documentId, reason } = req.body;
    await db.updateDocument(DB_ID, COL_REQUESTS, documentId, {
      status: "rejected",
      note: reason || "",
    });
    res.json({ ok: true, message: "Restaurant request rejected." });
  } catch (err) {
    serverError(res, err);
  }
});

app.post("/remove-restaurant", async (req, res) => {
  try {
    const { documentId, reason } = req.body;
    await db.updateDocument(DB_ID, COL_RESTAURANTS, documentId, {
      status: "removed",
      note: reason || "",
    });
    res.json({ ok: true, message: "Restaurant removed from the catalog." });
  } catch (err) {
    serverError(res, err);
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
