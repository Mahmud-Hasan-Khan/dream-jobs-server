const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 3000;

// middleware 
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bjwj9uc.mongodb.net/?retryWrites=true&w=majority`;

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
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // create mongoDB database for Products
        const categoryCollections = client.db("dreamJobsDB").collection("categories");

        // create mongoDB database for jobs
        const jobsCollections = client.db("dreamJobsDB").collection("jobs");

        // create mongoDB database for Applied Jobs
        const appliedJobsCollections = client.db("dreamJobsDB").collection("appliedJobs");

        //--------------Start------------------- get API ------------------------------

        // get categories
        app.get('/categories', async (req, res) => {
            const result = await categoryCollections.find().toArray();
            res.send(result);
        })

        // get jobs filtering by category
        app.get('/jobs', async (req, res) => {
            const jobCategory = req.query.jobCategory; // Get the jobCategory from the query parameter
            const query = jobCategory ? { jobCategory } : {}; // Create a query to filter by jobCategory if it exists

            const result = await jobsCollections.find(query).toArray();
            res.send(result);
        });

        // get jobs filtering by user email
        app.get('/jobs', async (req, res) => {
            const userEmail = req.query.userEmail; // Get the userEmail from the query parameter
            const query = userEmail ? { userEmail } : {}; // Create a query to filter by userEmail if it exists

            const result = await jobsCollections.find(query).toArray();
            res.send(result);
        });



        // get each job by id
        app.get('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await jobsCollections.findOne(query);
            res.send(result);
        });

        //  Applied jobs
        app.get('/appliedJobs', async (req, res) => {
            const { email } = req.query;
            const query = { email };
            const result = await appliedJobsCollections.find(query).toArray();
            res.send(result)
        })
        //--------------End------------------- GET API ------------------------------



        //--------------Start------------------- POST API ------------------------------
        // cerate API for products
        app.post('/jobs', async (req, res) => {
            const product = req.body;
            const result = await jobsCollections.insertOne(product);
            res.send(result);
        });

        app.post('/appliedJobs', async (req, res) => {
            const cart = req.body;
            const result = await appliedJobsCollections.insertOne(cart);
            res.send(result);
        });
        //--------------End------------------- POST API ------------------------------


        //--------------Start------------------- PATCH API ------------------------------
        app.patch('/jobs/:id/incrementApplicants', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await jobsCollections.updateOne(query, { $inc: { jobApplicants: 1 } });

            if (result.matchedCount === 1 && result.modifiedCount === 1) {
                res.status(200).send('Job applicants incremented successfully');
            } else {
                res.status(404).send('Job not found or applicants count not updated');
            }
        })

        //--------------End------------------- PATCH API ------------------------------

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('dream jobs server is running')
});

app.listen(port, () => {
    console.log(`dream jobs server is running on port ${port}`);
});