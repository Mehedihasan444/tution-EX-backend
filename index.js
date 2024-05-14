const express = require("express");
const cors = require("cors");
// const jwt = require("jsonwebtoken");
const SSLCommerzPayment = require("sslcommerz-lts");
// const cookieParser=require('cookie-parser')
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// ==========middleware==========
app.use(
  cors({
    origin: ["http://localhost:5173",],
    credentials: true,
  })
);
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hv3u7m5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
// ssl commerz cresentials
const store_id = process.env.storeID;
const store_passwd = process.env.storePasswd;
const is_live = false; //true for live, false for sandbox

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const cart = client.db("course_selling").collection("cart");
    const users = client.db("course_selling").collection("users");
    const courses = client.db("course_selling").collection("courses");
    const discussion = client.db("course_selling").collection("discussion");
     // =================== discussion crud operations =======================
     app.post("/discussion", async (req, res) => {
      const course = req.body;
      const result = await discussion.insertOne(course);
      res.send(result);
    });
    app.get("/discussion", async (req, res) => {
      const result = await discussion.find().toArray();
      res.send(result);
    });
    app.get("/discussion/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await discussion.findOne(query);
      res.send(result);
    });
    // ===================  crud operations ======================
 
    // get all courses added by individual user
    app.get("/courses/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "author.author_email": email };
      const result = await courses.find(query).toArray();
      res.send(result);
    });
    // post a course
    app.post("/courses", async (req, res) => {
      const course = req.body;
      const result = await courses.insertOne(course);
      res.send(result);
    });

    // get a specific course
    app.get("/users/courses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await courses.findOne(query);
      res.send(result);
    });

    // Get all courses
    // app.get("/courses", async (req, res) => {
    //   const result = await courses.find().toArray();
    //   res.send(result);
    // });
    app.get("/courses", async (req, res) => {
      let queryObj = {};
      let sortObj = {};
      const category = req.query.category;
      const sortField = req.query.sortField;
      const sortOrder = req.query.sortOrder;
      const page = Number(req.query.page);
      const limit = Number(req.query.limit);
      const skip = (page - 1) * limit;
      const courseName = req.query.courseName;
      // console.log(category, sortField, sortOrder,productName, limit,skip)
      if (category) {
        queryObj.category = category;
      }
      if (brand) {
        queryObj.brand = brand;
      }
      if (sortField && sortOrder) {
        if (sortOrder == "rating") {
          sortObj["rating"] = "desc";
        } else {
          sortObj[sortField] = sortOrder;
        }
      }
      if (courseName) {
        const searchTerm = new RegExp(courseName, "i"); // 'i' for case-insensitive search
        queryObj.name = searchTerm;
      }
      const result = await products
        .find(queryObj)
        .skip(skip)
        .limit(limit)
        .sort(sortObj)
        .toArray();
      const count = await courses.estimatedDocumentCount();
      res.send({ result, count });
    });

    // cart post operation
    app.post("/cart", async (req, res) => {
      const item = req.body;
      const { _id, ...rest } = item;
      const query = { title: rest.title, email: rest.email };
      const isExist = await cart.findOne(query);
      if (isExist) {
        return res.send({ message: "already exists" });
      }

      const result = await cart.insertOne(rest);
      res.send(result);
    });

    // get cart items based on user email
    app.get("/cart/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await cart.find(query).toArray();
      res.send(result);
    });
    // delete items from cart
    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await cart.deleteOne(query);
      res.send(result);
    });

    // post user info
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await users.insertOne(user);
      res.send(result);
    });

    // get user info
    app.get("/admin/users", async (req, res) => {
   
      const result = await users.find().toArray();
      res.send(result);
    });
    // get user info
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await users.findOne(query);
      res.send(result);
    });

    // for payment
    app.post("/payment", async (req, res) => {
      const tran_id = new ObjectId().toString();
      const id = new ObjectId().toString();

      const cartItem = req.body;
      const email = cartItem.userEmail;
      const courses = cartItem.courses; // No need to spread here, assuming courses is an array

      // New properties to add to each course
      const newProperties = {
        purchase: false,
        payment: false,
      };

      // Destructure the original array and add new properties to each object
      const modifiedArray = courses?.map((obj) => {
        // Destructure the object and add new properties
        return {
          ...obj, // Spread the original properties
          ...newProperties, // Add new properties
        };
      });

      // Assuming id is defined somewhere else
      const result = await users.updateOne(
        { email: email },
        {
          $addToSet: { // Use $addToSet to add unique elements to an array
            purchaseList: { $each: modifiedArray }
          }
        }
      );

      const data = {
        total_amount: cartItem?.total_bill,
        currency: "USD",
        tran_id: tran_id,
        success_url: `http://localhost:5000/user/payment/success/${tran_id}?email=${email}`,
        fail_url: `http://localhost:5000/user/payment/fail/${tran_id}?email=${email}`,
        cancel_url: "http://localhost:3030/cancel",
        ipn_url: "http://localhost:3030/ipn",
        shipping_method: "Courier",
        product_name: "combine food",
        product_category: "Mix category",
        product_profile: "general",
        cus_name: cartItem?.userName,
        cus_email: cartItem?.userEmail,
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
      };
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });
        console.log("Redirecting to: ", GatewayPageURL);
      });

      app.post("/user/payment/success/:tranId", async (req, res) => {
        const result = await users.updateOne(
          {
            email: req.query.email,
            purchaseList: {
              $elemMatch: {
                purchase: false,
                payment: false,
              },
            },
          },
          {
            $set: {
              "purchaseList.$.purchase": true,
              "purchaseList.$.payment": true,
              transactionId: req.params.tranId,
            },
          }
        );
        if (result.modifiedCount > 0) {
          res.redirect(
            `http://localhost:5173/payment-complete/${req.params.tranId}`
          );
        }

        const cartIds = await cart.find().toArray();
        const ids = cartIds.map((x) => x._id);
        const query = { _id: { $in: ids } };
        await cart.deleteMany(query);
      });
      app.post("/user/payment/fail/:tranId", async (req, res) => {
   
       
          res.redirect(
            `http://localhost:5173/payment-failed/${req.params.tranId}`
          );
        
      });
    });

    // checking whether a user admin or not 
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        email: email,
        role: "admin",
      };
      const result = await users.findOne(query);
      if (result) {
        res.send({ admin: true });
      } else {
        res.send({ admin: false });
      }
   
    });
// delete a user
    app.delete("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await users.deleteOne(query);
      res.send(result);
    });

    // make a user admin
    app.patch("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await users.updateOne(filter, updatedDoc);
      res.send(result);
    });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
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
