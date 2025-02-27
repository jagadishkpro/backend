require('dotenv').config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const XLSX = require("xlsx");


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

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const TENANT_ID = process.env.TENANT_ID;
const SHAREPOINT_SITE = process.env.SHAREPOINT_SITE;
const FILE_NAME = process.env.FILE_NAME;


async function getAccessToken() {
    try {
        const response = await axios.post(
            `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                scope: "https://graph.microsoft.com/.default",
                grant_type: "client_credentials",
            }),
  { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        return response.data.access_token;
    } catch (error) {
        console.error("Error getting access token:", error.response?.data || error.message);
        throw new Error("Failed to authenticate");
    }
}

// 🔹 Get SharePoint Site ID
async function getSiteId(accessToken) {
    try {
        const response = await axios.get(
            `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_SITE}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        return response.data.id;
    } catch (error) {
        console.error("Error getting Site ID:", error.response?.data || error.message);
        throw new Error("Failed to get Site ID");
    }
}

// 🔹 Get Drive ID (Document Library)
async function getDriveId(accessToken, siteId) {
    try {
        const response = await axios.get(
            `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        return response.data.value[0].id; // First drive (usually "Documents")
    } catch (error) {
        console.error("Error getting Drive ID:", error.response?.data || error.message);
        throw new Error("Failed to get Drive ID");
    }
}

// 🔹 Get File ID
async function getFileId(accessToken, siteId, driveId) {
    try {
        const filePath = "Manager Drive/Home Warranties/Choice"; // Adjust if necessary
        const apiUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${filePath}:/children`;

        console.log("Fetching File ID from:", apiUrl); // Debugging: Log the request URL

        const response = await axios.get(apiUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        console.log("Drive API Response:", response.data); // Debugging: Log the full response

        if (!response.data || !response.data.value) {
            throw new Error("Unexpected API response: Missing 'value' field.");
        }

        const file = response.data.value.find(item => item.name === FILE_NAME);

        if (!file) {
            throw new Error(`File '${FILE_NAME}' not found in SharePoint.`);
        }

        console.log("File ID Found:", file.id); // Debugging: Log the File ID
        return file.id;
    } catch (error) {
        console.error("Error getting File ID:", error.response?.data || error.message);
        throw new Error("Failed to get File ID");
    }
}

// 🔹 Fetch Excel File
async function fetchExcelFile() {
    try {
        const accessToken = await getAccessToken();
        const siteId = await getSiteId(accessToken);
        const driveId = await getDriveId(accessToken, siteId);
        const fileId = await getFileId(accessToken, siteId, driveId);

        const response = await axios.get(
            `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${fileId}/content`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
                responseType: "arraybuffer",
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching Excel file:", error.response?.data || error.message);
        throw new Error("Failed to fetch Excel file");
    }
}

// 🔹 Convert Excel to JSON
function parseExcelData(buffer) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0]; // Read the first sheet
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);
    return jsonData;
}

// 🔹 API Endpoint to Get Excel Data
app.get("/get-excel-data", async (req, res) => {
    try {
        const fileBuffer = await fetchExcelFile();
        const jsonData = parseExcelData(fileBuffer);
        res.json(jsonData);
    } catch (error) {
        res.status(500).json({ error: error.message });
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
