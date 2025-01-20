const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/auth', async (req, res) => {
    try {
        const { username, password } = req.body;
        const response = await fetch('https://auth.servicetitan.io/connect/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Grant_Type: 'client_credentials' ,client_id:'cid.9fkiaw98wjt520ej5yvw2bmzd', client_secret: 'cs1.vb2ryhejldmqbutixjbimvtac09iq0okggm076e2wpli8p87n8' }),
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error in /auth:', error);
        res.status(500).json({ error: 'Failed to fetch auth key' });
    }
});

app.get('/technicians', async (req, res) => {
    try {
        const authKey = req.headers['authorization'];
        const response = await fetch('https://api.servicetitan.com/technicians', {
            method: 'GET',
            headers: { Authorization: authKey },
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error in /technicians:', error);
        res.status(500).json({ error: 'Failed to fetch technicians' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
