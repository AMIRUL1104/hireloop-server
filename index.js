const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

// Load environment variables from .env
const port = 4000;
const uri = process.env.MONGODB_URI;

// app.use(cors());
app.use(
  cors({
    origin: ["http://localhost:3000", process.env.CLIENT_URL],
    credentials: true,
  }),
);
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // "Hireloopdb" নামে database select করা হয়েছে
    const database = client.db(process.env.DB_NAME);
    const userdb = client.db("HireloopUserDB");

    //  "jobposts" collection select করা হয়েছে
    const jobsCollection = database.collection("jobposts");
    const jobsApplicationCollection = database.collection("jobapplications");

    const companyCollection = database.collection("company");
    const userCollection = userdb.collection("user");
    // ===========================================================
    // ================= all  users   API ===============
    // ===========================================================
    app.get("/api/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // ===========================================================
    // ================= Job post API ===============
    // ===========================================================

    app.get("/api/jobs", async (req, res) => {
      try {
        const companyId = req.query.companyId || "";
        const recruiterId = req.query.recruiterId || "";
        const status = req.query.status || "";

        const query = {};

        // email filter (manage reqruiter job posts)
        if (recruiterId) {
          query.recruiterId = recruiterId;
        }
        if (companyId) {
          query.companyId = companyId;
        }
        // status filter (manage reqruiter job posts)
        if (status) {
          query.status = status;
        }

        const result = await jobsCollection.find(query).toArray();

        res.json(result);
      } catch (error) {
        res.status(500).json({
          error: "Internal Server Error",
        });
      }
    });
    app.get("/api/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const query = {
          _id: new ObjectId(id),
        };

        const result = await jobsCollection.findOne(query);

        res.send(result);
      } catch (error) {
        res.status(500).json({
          error: "Internal Server Error",
        });
      }
    });

    //  add a new JOB POST
    app.post("/api/jobs", async (req, res) => {
      const newJobposts = req.body;
      const result = await jobsCollection.insertOne(newJobposts);
      res.send(result);
    });

    // Delete a jo post
    app.delete("/api/jobs/:id", async (req, res) => {
      const id = req.params.id;

      const query = {
        _id: new ObjectId(id),
      };

      const result = await jobsCollection.deleteOne(query);

      res.send(result);
    });

    // ==========================job application API =================

    app.post("/api/application", async (req, res) => {
      const newApplication = {
        ...req.body,
        createdAt: new Date(),
      };

      const result = await jobsApplicationCollection.insertOne(newApplication);
      res.send(result);
    });

    app.get("/api/application", async (req, res) => {
      const query = {};

      // Query parameters থেকে ডাটা নেওয়া হলো
      const { applicantId, jobId } = req.query;

      if (applicantId) {
        query.applicantId = applicantId;
      }
      if (jobId) {
        query.jobId = jobId;
      }

      // চলতি মাসের প্রথম দিন এবং শেষ দিন বের করার লজিক
      const now = new Date();

      // চলতি মাসের ১ম দিন (যেমন: 2026-06-01T00:00:00.000Z)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // পরবর্তী মাসের ১ম দিন (যা চলতি মাসের শেষ দিন পর্যন্ত কাভার করবে)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // কুয়েরিতে মাসের ডেট রেঞ্জ ফিল্টার যোগ করা হলো
      query.createdAt = {
        $gte: startOfMonth.toISOString(), // বা সরাসরি startOfMonth অবজেক্ট (যদি ডাটাবেজে Date ফরম্যাটে থাকে)
        $lt: endOfMonth.toISOString(),
      };

      try {
        const cursor = jobsApplicationCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Server error", error });
      }
    });
    // ===========================================================
    // ================= company related API's ===============
    // ===========================================================

    app.get("/api/my/companies", async (req, res) => {
      try {
        const recruiterId = req.query.recruiterId || "";

        const query = {};
        if (recruiterId) {
          query.recruiterId = recruiterId;
        }

        const result = await companyCollection.find(query).toArray();

        res.json(result);
      } catch (error) {
        res.status(500).json({
          error: "Internal Server Error",
        });
      }
    });

    //  add a new company

    app.post("/api/my/companies", async (req, res) => {
      const newCompany = req.body;
      const result = await companyCollection.insertOne(newCompany);
      res.send(result);
    });

    // ===========================================================
    // Send a ping to confirm a successful connection
    // ===========================================================

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
