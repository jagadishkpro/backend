const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON request bodies
app.use(express.json());

// Enable CORS
app.use(cors());

// Proxy POST endpoint for authentication
app.post("/auth", async (req, res) => {
  try {
    // Define the payload for the authentication API
    const authPayload = { grant_type: 'client_credentials' ,client_id:'cid.9fkiaw98wjt520ej5yvw2bmzd', client_secret: 'cs1.vb2ryhejldmqbutixjbimvtac09iq0okggm076e2wpli8p87n8' };

    // Make the POST request to the authentication API
    const authResponse = await axios.post("https://auth.servicetitan.io/connect/token", authPayload, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
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
    

    // Extract the Authorization token from the headers
    const token = req.headers.authorization;
	const stkey = req.headers.stappkey;

    // Make the GET request to the data API
    const dataResponse = await axios.get('https://api.servicetitan.io/dispatch/v2/tenant/1721346453/zones?page=1&pageSize=300&includeTotal=true', {
      headers: {
        Authorization: token, // Send the token as a Bearer token
		'st-app-key': stkey
      },
    });

    // Send back the data response to the client
    res.json(dataResponse.data);
  } catch (error) {
    console.error("Error fetching data:", error.message);
    res.status(error.response?.status || 500).json({ error: "Data retrieval failed." });
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Proxy server is running!");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
