const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 3000;

// middleware 
app.use(cors({
    origin: [
        'http://localhost:5173' // client side 
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bjwj9uc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// own middleware
const logger = (req, res, next) => {
    console.log('log: info', req.method, req.url);
    next();
}

// verifyToken
const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    // console.log('token in the middleware', token);
    if (!token) {
        return res.status(401).send({ message: 'unauthorize access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorize access' })
        }
        req.user = decoded;
        next();
    })
}

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

        // create mongoDB database for featuredEmployee
        const featuredEmployeeCollections = client.db("dreamJobsDB").collection("featuredEmployee");



        // auth related api
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            console.log('user for token', user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })

            //set cookies
            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            })
                .send({ success: true });
        })

        // clear cookie after logout
        app.post('/logout', logger, async (req, res) => {
            const user = req.body;
            console.log('logging out', user);
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })

        //--------------Start------------------- get API ------------------------------

        // get categories
        app.get('/categories', async (req, res) => {
            const result = await categoryCollections.find().toArray();
            res.send(result);
        })

        app.get('/allJobs', async (req, res) => {
            const result = await jobsCollections.find().toArray();
            res.send(result)
        })

        // get jobs filtering by category
        app.get('/jobs', async (req, res) => {
            const jobCategory = req.query.jobCategory; // Get the jobCategory from the query parameter
            const query = jobCategory ? { jobCategory } : {}; // Create a query to filter by jobCategory if it exists

            const result = await jobsCollections.find(query).toArray();
            res.send(result);
        });

        // get jobs filtering by user email
        app.get('/perUserJobs', logger, verifyToken, async (req, res) => {
            const userEmail = req.query.email; // Get the userEmail from the query parameter
            // const query = { userEmail: userEmail }; // Create a query to filter by userEmail if it exists

            // console.log('token owner info', req.user);
            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            let query = {};
            if (req.query?.email) {
                query = { userEmail: userEmail }
            }

            // console.log(query);
            const result = await jobsCollections.find(query).toArray();
            res.send(result);
        });

        // get Featured Employee
        app.get('/featuredEmployee', async (req, res) => {
            const result = await featuredEmployeeCollections.find().toArray();
            res.send(result);
        })

        //--------------End------------------- get API ------------------------------



        // delete cart api
        app.delete('/jobsDelete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await jobsCollections.deleteOne(query);
            res.send(result);
        });

        // update api data for product
        app.put('/jobUpdate/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateJob = req.body;
            const newUpdatedJob = {
                $set: {
                    bannerURL: updateJob.bannerURL,
                    companyLogoURL: updateJob.companyLogoURL,
                    jobTitle: updateJob.jobTitle,
                    salaryRange: updateJob.salaryRange,
                    userName: updateJob.userName,
                    jobDescription: updateJob.jobDescription,
                    userName: updateJob.userName,
                    jobApplicants: updateJob.jobApplicants,
                    jobCategory: updateJob.jobCategory
                }
            }
            const result = await jobsCollections.updateOne(filter, newUpdatedJob, options);
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
        app.get('/appliedJobs', logger, verifyToken, async (req, res) => {
            // const { email } = req.query;
            // const query = { email };

            // verify user for secure api
            console.log('token owner info', req.user);
            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }

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