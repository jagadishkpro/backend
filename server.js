const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON request bodies
app.use(express.json());

// Proxy POST endpoint for authentication
app.post("/auth", async (req, res) => {
  try {
    // Define the payload for the authentication API
    const authPayload = { Grant_Type: 'client_credentials' ,client_id:'cid.9fkiaw98wjt520ej5yvw2bmzd', client_secret: 'cs1.vb2ryhejldmqbutixjbimvtac09iq0okggm076e2wpli8p87n8' };

    // Make the POST request to the authentication API
    const authResponse = await axios.post("https://auth.servicetitan.io/connect/token", authPayload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Send back the authentication response to the client
    res.json(authResponse.data);
  } catch (error) {
    console.error("Error during authentication:", error.message);
    res.status(error.response?.status || 500).json({ error: "Authentication failed." });
  }
});

// Proxy GET endpoint for fetching data
app.get("/data", async (req, res) => {
  try {
    // Extract query parameters from the request
    const { technicianId } = req.query;

    // Extract the Authorization token from the headers
    const token = req.headers.authorization;

    // Make the GET request to the data API
    const data
