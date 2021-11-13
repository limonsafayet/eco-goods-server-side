const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const admin = require("firebase-admin");
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

var serviceAccount = require("./eco-goods-ltd-firebase-adminsdk.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(cors())
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2in19.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('eco_goods');
        const usersCollection = database.collection('users');
        const productsCollection = database.collection('products');


        const roombookings = database.collection('roombookings')


        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            //console.log(result);
            res.json(result);
        });

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        })

        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find({});
            const rooms = await cursor.toArray();
            res.send(rooms);
        });

        app.post('/products', async (req, res) => {
            const room = req.body;
            const result = await productsCollection.insertOne(room);
            res.send(result);
        });

        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })


        // GET API FOR ROOMBOOK
        app.get('/roombookings', async (req, res) => {
            const cursor = roombookings.find({});
            const roombooks = await cursor.toArray();
            res.send(roombooks);
        });

        // GET API FOR ROOMBOOK TO GET DATA BY USER EMAIL
        app.get('/roombookings/:email', async (req, res) => {
            const email = req.params.email;
            console.log(email)
            const query = { clientEmail: email };
            const roombooks = await roombookings.find(query).toArray();
            res.send(roombooks);
        });

        // POST API FOR ROOMBOOK
        app.post('/roombookings', async (req, res) => {
            const roombook = req.body;
            const result = await roombookings.insertOne(roombook);
            res.send(result);
        });

        // DELETE API FOR ROOMBOOK
        app.delete('/roombookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await roombookings.deleteOne(query);
            res.send(result);
        })

        // UPDATE API FOR ROOMBOOK
        app.put('/roombookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const roombook = await roombookings.findOne(filter);
            const newStatus = roombook.status == "true" ? "false" : "true";
            const updateStatus = { $set: { status: newStatus } };
            const result = await roombookings.updateOne(filter, updateStatus)
            res.send(result);
        })

    } finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Running Server!!!');
})

app.listen(port, () => {
    console.log(port)
})