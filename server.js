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

const CLIENT_ID = "a92ed195-5eaf-4711-b991-4fba4e3090e1";
const CLIENT_SECRET = "GXt8Q~mehDmsnEkyGfHcw2hecx6QFLQYrZr~btZ";
const TENANT_ID = "c495e6d6-65d0-4481-b27e-2b9364d79481";
const SHAREPOINT_SITE = "number1garage.sharepoint.com/sites/ManagerTeam";
const FILE_NAME = "Choice.xlsx";

async function getAccessToken() {
    try {
        const response = await axios.post(
            `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                scope: "https://graph.microsoft.com/.default",
                grant_type: "client_credentials",
            })
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
        const response = await axios.get(
            `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root/children`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const file = response.data.value.find(file => file.name === FILE_NAME);
        if (!file) throw new Error("File not found in SharePoint");
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
