import jwt from 'jsonwebtoken';
import express from 'express';
const app = express();

// Vulnerable JWT
const token = jwt.sign({ id: 1 }, "secret"); // Hardcoded
const token2 = jwt.sign({ id: 1 }, "privateKey", { algorithm: "none" }); // None alg

// Vulnerable CORS
app.use(cors({
    origin: "*",
    credentials: true 
}));

// Unprotected Admin
app.get('/admin/dashboard', (req, res) => {
    res.send("Admin Data");
});

app.post('/api/admin/users', (req, res) => {
    // missing auth
});
