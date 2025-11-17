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
const COL_NOTIFICATIONS = "notifications";
const REQUIRED_FIELDS = ["name", "cuisines", "location"];

const serverError = (res, err) => {
  console.error(err);
  res.status(500).json({ message: err.message || "Internal server error." });
};

const buildRestaurantPayload = (doc = {}, overrides = {}) => {
  const location =
    overrides.location ??
    doc.location ??
    [doc.address, doc.city, doc.state, doc.postcode].filter(Boolean).join(", ");

  const toList = (value) => {
    if (Array.isArray(value)) return value.map((item) => `${item}`.trim()).filter(Boolean);
    if (typeof value === "string") {
      return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    if (value == null || value === false) return [];
    return [`${value}`.trim()].filter(Boolean);
  };

  const isValidLatitude = (value) => Number.isFinite(value) && value >= -90 && value <= 90;
  const isValidLongitude = (value) => Number.isFinite(value) && value >= -180 && value <= 180;

  const toPointArray = (lon, lat) => {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    if (!isValidLongitude(lon) || !isValidLatitude(lat)) return null;
    return [lon, lat];
  };

  const normalizePointPair = (first, second) => {
    if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
    const direct = toPointArray(first, second);
    if (direct) return direct;
    if (isValidLatitude(first) && isValidLongitude(second)) {
      return toPointArray(second, first);
    }
    return null;
  };

  const parsePoint = (value) => {
    if (!value) return null;
    if (Array.isArray(value) && value.length === 2) {
      const [first, second] = value.map(Number);
      return normalizePointPair(first, second);
    }
    if (typeof value === "object") {
      if (value.type === "Point" && Array.isArray(value.coordinates)) {
        const [lon, lat] = value.coordinates;
        return toPointArray(Number(lon), Number(lat));
      }
      if (
        Object.prototype.hasOwnProperty.call(value, "longitude") &&
        Object.prototype.hasOwnProperty.call(value, "latitude")
      ) {
        const lon = Number(value.longitude);
        const lat = Number(value.latitude);
        return toPointArray(lon, lat);
      }
    }
    if (typeof value === "string") {
      const latMatch = value.match(/lat(?:itude)?\s*[:=]?\s*([-\d.]+)/i);
      const lonMatch = value.match(/(?:lng|lon|long(?:itude)?)\s*[:=]?\s*([-\d.]+)/i);
      if (latMatch && lonMatch) {
        return normalizePointPair(Number(lonMatch[1]), Number(latMatch[1]));
      }
      const match = value.match(/\[?\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\]?/);
      if (match) {
        return normalizePointPair(Number(match[1]), Number(match[2]));
      }
    }
    return null;
  };

  const mapCoordinates = parsePoint(overrides.map ?? doc.map);
  if (!mapCoordinates) {
    throw new Error(
      "Map coordinates must be provided in the format [longitude, latitude] before approval."
    );
  }

  const merged = {
    name: overrides.name ?? doc.businessName ?? doc.name,
    location,
    theme: (overrides.theme ?? doc.theme ?? "").toString(),
    ambience: toList(overrides.ambience ?? doc.ambience),
    ownerId: overrides.ownerId ?? doc.ownerId ?? doc.$id,
    cuisines: toList(overrides.cuisines ?? doc.cuisines ?? "General"),
    registrationNo: overrides.registrationNo ?? doc.registrationNo ?? "",
    email: overrides.email ?? doc.email ?? "",
    phone: overrides.phone ?? doc.phone ?? "",
    website: overrides.website ?? doc.website ?? "",
    address: overrides.address ?? doc.address ?? "",
    map: mapCoordinates,
  };

  REQUIRED_FIELDS.forEach((field) => {
    if (!merged[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  });

  return merged;
};

const logNotification = async (payload) => {
  if (!COL_NOTIFICATIONS || !payload) return null;
  try {
    return await db.createDocument(DB_ID, COL_NOTIFICATIONS, ID.unique(), payload);
  } catch (err) {
    console.warn("Failed to log notification", err);
    return null;
  }
};

const moveDocumentToRestaurants = async ({
  sourceCollection,
  documentId,
  overrides = {},
  notification,
}) => {
  const sourceDoc = await db.getDocument(DB_ID, sourceCollection, documentId);
  const payload = buildRestaurantPayload(sourceDoc, overrides);
  let createdRestaurant = null;

  try {
    console.log("Creating restaurant document", documentId, payload.map);
    createdRestaurant = await db.createDocument(DB_ID, COL_RESTAURANTS, documentId, payload);
    await db.deleteDocument(DB_ID, sourceCollection, documentId);
    if (notification) {
      await logNotification({
        restaurantId: documentId,
        ...notification,
      });
    }
    return createdRestaurant;
  } catch (err) {
    if (createdRestaurant) {
      await db.deleteDocument(DB_ID, COL_RESTAURANTS, documentId).catch(() => {});
    }
    throw err;
  }
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
    const { documentId, overrides = {} } = req.body;
    if (!documentId) {
      throw new Error("Missing documentId.");
    }

    let normalizedOverrides = { ...overrides };
    const coords = overrides?.map;
    if (Array.isArray(coords) && coords.length === 2) {
      normalizedOverrides.map = {
        longitude: coords[0],
        latitude: coords[1],
      };
    }

    const restaurantDoc = await moveDocumentToRestaurants({
      sourceCollection: COL_USER_SUBMISSIONS,
      documentId,
      overrides: { ...normalizedOverrides, type: "user" },
      notification: {
        type: "user_submission_approved",
        message: `${overrides.name || "A restaurant"} approved from user submissions.`,
      },
    });

    res.json({
      ok: true,
      message: `${restaurantDoc.name} moved to live restaurants.`,
      restaurant: restaurantDoc,
    });
  } catch (err) {
    serverError(res, err);
  }
});

app.post("/reject-user-submission", async (req, res) => {
  try {
    const { documentId } = req.body;
    await db.updateDocument(DB_ID, COL_USER_SUBMISSIONS, documentId, {
      status: "rejected",
    });
    res.json({ ok: true, message: "Submission rejected." });
  } catch (err) {
    serverError(res, err);
  }
});

app.post("/approve-restaurant-request", async (req, res) => {
  try {
    const { documentId, overrides = {} } = req.body;
    if (!documentId) {
      throw new Error("Missing documentId.");
    }

    const restaurantDoc = await moveDocumentToRestaurants({
      sourceCollection: COL_REQUESTS,
      documentId,
      overrides: { ...overrides, type: "owner" },
      notification: {
        type: "restaurant_request_approved",
        message: `${overrides.name || "A restaurant"} approved from owner requests.`,
      },
    });

    res.json({
      ok: true,
      message: `${restaurantDoc.name} approved and moved to live restaurants.`,
      restaurant: restaurantDoc,
    });
  } catch (err) {
    serverError(res, err);
  }
});

app.post("/reject-restaurant-request", async (req, res) => {
  try {
    const { documentId } = req.body;
    await db.updateDocument(DB_ID, COL_REQUESTS, documentId, {
      status: "rejected",
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
      removalReason: reason || "",
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
