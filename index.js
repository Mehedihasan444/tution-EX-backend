const express = require("express");
const cors = require("cors");
// const jwt = require("jsonwebtoken");
// const SSLCommerzPayment = require("sslcommerz-lts");
// const cookieParser=require('cookie-parser')
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// ==========middleware==========
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rjhcvof.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const courses = client.db("TutionEX").collection("courses");


    // =================== courses crud operations ======================
    app.get("/courses", async (req, res) => {
      console.log("hit")
      const result = await courses.find().toArray();
      res.send(result);
    });
    
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // 
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
    res.send("Backend is running");
  });
  app.listen(port, () => {
    console.log(`backend is running on port ${port}`);
  });