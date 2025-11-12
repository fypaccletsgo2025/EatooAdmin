import express from "express";
import cors from "cors";
import "dotenv/config";
import { Client, Databases, Query } from "node-appwrite";

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
    const { documentId } = req.body;
    const submission = await db.getDocument(DB_ID, COL_USER_SUBMISSIONS, documentId);

    const restaurantDoc = await db.createDocument(DB_ID, COL_RESTAURANTS, documentId, {
      name: submission.name,
      location: submission.location,
      cuisine: submission.cuisine,
      contact: submission.contact || "",
      note: submission.note || "",
      status: "live",
      type: "user",
    });

    await db.deleteDocument(DB_ID, COL_USER_SUBMISSIONS, documentId);

    res.json({
      ok: true,
      message: `${submission.name} moved to live restaurants.`,
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
    const { documentId } = req.body;
    const request = await db.getDocument(DB_ID, COL_REQUESTS, documentId);

    const restaurantDoc = await db.createDocument(DB_ID, COL_RESTAURANTS, documentId, {
      businessName: request.businessName,
      registrationNo: request.registrationNo,
      email: request.email,
      phone: request.phone,
      address: request.address,
      city: request.city,
      state: request.state,
      postcode: request.postcode,
      cuisine: request.cuisine,
      website: request.website || "",
      note: request.note || "",
      status: "live",
      type: "owner",
    });

    await db.deleteDocument(DB_ID, COL_REQUESTS, documentId);

    res.json({
      ok: true,
      message: `${request.businessName} approved and moved to live restaurants.`,
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
