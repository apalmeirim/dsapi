export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const folderId = process.env.GOOGLE_PHOTOS_FOLDER_ID;

    if (!clientId || !clientSecret || !refreshToken || !folderId) {
      return res.status(500).json({ error: "Missing Google Drive env vars." });
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error("Failed to get Google access token: " + JSON.stringify(tokenData));
    }

    const accessToken = tokenData.access_token;
    const query = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
    const filesUrl =
      "https://www.googleapis.com/drive/v3/files" +
      `?q=${encodeURIComponent(query)}` +
      "&orderBy=createdTime desc" +
      "&pageSize=3" +
      "&fields=files(id,name,createdTime,webViewLink)";

    const filesRes = await fetch(filesUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const filesData = await filesRes.json();
    const files = (filesData.files || []).map((file) => ({
      id: file.id,
      name: file.name,
      createdTime: file.createdTime,
      viewLink: file.webViewLink,
      imageUrl: `https://drive.google.com/uc?export=view&id=${file.id}`,
    }));

    res.status(200).json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}
