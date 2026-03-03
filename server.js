require("dotenv").config();
const path = require("path");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

let appAccessToken = null;
let tokenExpiresAt = 0;

app.use(express.static(path.join(__dirname, "public")));

async function getAppAccessToken() {
  const now = Date.now();
  if (appAccessToken && now < tokenExpiresAt) {
    return appAccessToken;
  }

  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    throw new Error("Variables d'environnement Twitch manquantes (TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET)");
  }

  const tokenUrl = new URL("https://id.twitch.tv/oauth2/token");
  tokenUrl.searchParams.set("client_id", TWITCH_CLIENT_ID);
  tokenUrl.searchParams.set("client_secret", TWITCH_CLIENT_SECRET);
  tokenUrl.searchParams.set("grant_type", "client_credentials");

  const response = await fetch(tokenUrl, { method: "POST" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Impossible d'obtenir le token Twitch: ${response.status} ${text}`);
  }

  const tokenData = await response.json();
  appAccessToken = tokenData.access_token;
  tokenExpiresAt = now + Math.max((tokenData.expires_in - 60) * 1000, 0);

  return appAccessToken;
}

async function getUsersByLogin(logins) {
  if (!logins.length) {
    return [];
  }

  const token = await getAppAccessToken();
  const url = new URL("https://api.twitch.tv/helix/users");
  for (const login of logins) {
    url.searchParams.append("login", login);
  }

  const response = await fetch(url, {
    headers: {
      "Client-Id": TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erreur Twitch /users: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.data || [];
}

async function getLiveStreamsByUserIds(userIds) {
  if (!userIds.length) {
    return [];
  }

  const token = await getAppAccessToken();
  const url = new URL("https://api.twitch.tv/helix/streams");
  for (const userId of userIds) {
    url.searchParams.append("user_id", userId);
  }

  const response = await fetch(url, {
    headers: {
      "Client-Id": TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erreur Twitch /streams: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.data || [];
}

app.get("/api/streams", async (req, res) => {
  try {
    const rawChannels = req.query.channels;
    if (!rawChannels) {
      return res.status(400).json({ error: "Le paramètre 'channels' est requis" });
    }

    const channels = String(rawChannels)
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    const uniqueChannels = [...new Set(channels)];
    if (!uniqueChannels.length) {
      return res.status(400).json({ error: "Aucun pseudo valide" });
    }

    const users = await getUsersByLogin(uniqueChannels);
    const usersByLogin = new Map(users.map((user) => [user.login.toLowerCase(), user]));
    const userIds = users.map((user) => user.id);

    const liveStreams = await getLiveStreamsByUserIds(userIds);
    const liveByLogin = new Map(liveStreams.map((stream) => [stream.user_login.toLowerCase(), stream]));

    const result = uniqueChannels.map((login) => {
      const user = usersByLogin.get(login);
      const stream = liveByLogin.get(login);

      if (!user) {
        return {
          login,
          exists: false,
          isLive: false,
          error: "Pseudo introuvable"
        };
      }

      if (!stream) {
        return {
          login: user.login,
          displayName: user.display_name,
          profileImageUrl: user.profile_image_url,
          exists: true,
          isLive: false
        };
      }

      return {
        login: stream.user_login,
        displayName: stream.user_name,
        profileImageUrl: user.profile_image_url,
        exists: true,
        isLive: true,
        title: stream.title,
        gameName: stream.game_name,
        viewerCount: stream.viewer_count,
        startedAt: stream.started_at,
        thumbnailUrl: stream.thumbnail_url
          .replace("{width}", "640")
          .replace("{height}", "360")
      };
    });

    res.json({ channels: result });
  } catch (error) {
    res.status(500).json({
      error: "Impossible de récupérer les streams Twitch",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur démarré: http://localhost:${PORT}`);
});
