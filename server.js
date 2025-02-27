require("dotenv").config({ path: "/etc/secrets/.env" });
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const XLSX = require("xlsx");


const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json());


app.use(cors());

const CLIENT_ID_SS = process.env.CLIENT_ID_SS;
const CLIENT_SECRET_SS = process.env.CLIENT_SECRET_SS;
const ST_KEY_SS = process.env.ST_KEY_SS;

app.get("/fetch-data", async (req, res) => {
  try {
    const authPayload = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID_SS,
      client_secret: CLIENT_SECRET_SS,
    });

    const authResponse = await axios.post(
      "https://auth.servicetitan.io/connect/token",
      authPayload.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = `Bearer ${authResponse.data.access_token}`;

    const dataResponse = await axios.get(
      'https://api.servicetitan.io/dispatch/v2/tenant/1721346453/zones?page=1&pageSize=300&includeTotal=true',
      {
        headers: {
          Authorization: accessToken,
          "st-app-key": ST_KEY_SS,
        },
      }
    );

    res.json(dataResponse.data);
  } catch (error) {
    console.error("Error fetching data:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: "Request failed." });
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

async function getDriveId(accessToken, siteId) {
    try {
        const response = await axios.get(
            `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        return response.data.value[0].id; 
    } catch (error) {
        console.error("Error getting Drive ID:", error.response?.data || error.message);
        throw new Error("Failed to get Drive ID");
    }
}

async function getFileId(accessToken, siteId, driveId) {
    try {
        const filePath = "Manager Drive/Home Warranties/Choice"; // Adjust if necessary
        const apiUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${filePath}:/children`;

        console.log("Fetching File ID from:", apiUrl); 

        const response = await axios.get(apiUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        console.log("Drive API Response:", response.data); 

        if (!response.data || !response.data.value) {
            throw new Error("Unexpected API response: Missing 'value' field.");
        }

        const file = response.data.value.find(item => item.name === FILE_NAME);

        if (!file) {
            throw new Error(`File '${FILE_NAME}' not found in SharePoint.`);
        }

        console.log("File ID Found:", file.id); 
        return file.id;
    } catch (error) {
        console.error("Error getting File ID:", error.response?.data || error.message);
        throw new Error("Failed to get File ID");
    }
}

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


function parseExcelData(buffer) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0]; 
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);
    return jsonData;
}


app.get("/get-excel-data", async (req, res) => {
    try {
        const fileBuffer = await fetchExcelFile();
        const jsonData = parseExcelData(fileBuffer);
        res.json(jsonData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



app.get("/", (req, res) => {
  res.send("Proxy server is running!");
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
