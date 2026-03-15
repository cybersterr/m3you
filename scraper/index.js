const axios = require("axios");
const fs = require("fs");

const OUTPUT_FILE = "stream.m3u";

// ================= SOURCES =================
const SOURCES = {
  HOTSTAR_M3U: "https://voot.vodep39240327.workers.dev?voot.m3u",
  ZEE5_M3U: "https://join-vaathala1-for-more.vodep39240327.workers.dev/zee5.m3u",
  JIO_JSON: "https://raw.githubusercontent.com/sixpg/jio/main/stream.json",
  SONYLIV_JSON: "https://raw.githubusercontent.com/drmlive/sliv-live-events/main/sonyliv.json",
  FANCODE_JSON: "https://fanco.vodep39240327.workers.dev/",
  ICC_TV_JSON: "https://icc.vodep39240327.workers.dev/icctv.jso",
  SPORTS_JSON: "https://sports.vodep39240327.workers.dev/sports.json",

  LOCAL_JSON: [
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/local-tamil-tv/",
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/local-tamil-tv/page/2",
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/local-tamil-tv/page/3",
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/local-tamil-tv/page/4",
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/local-tamil-tv/page/5",
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/local-tamil-tv/page/6",
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/local-tamil-tv/page/7",
  ],

  TELUGU_JSON: [
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/telugu-tv/",
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/telugu-tv/page/2",
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/telugu-tv/page/3",
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/telugu-tv/page/4",
  ],
};

// ================= PLAYLIST HEADER =================
const PLAYLIST_HEADER = `#EXTM3U
#EXTM3U x-tvg-url="https://epgshare01.online/epgshare01/epg_ripper_IN4.xml.gz"
#EXTM3U x-tvg-url="https://mitthu786.github.io/tvepg/tataplay/epg.xml.gz"
#EXTM3U x-tvg-url="https://avkb.short.gy/tsepg.xml.gz"
# ===== CosmicSports Playlist =====
# Join Telegram: @FrostDrift7
`;

// ================= PLAYLIST FOOTER =================
const PLAYLIST_FOOTER = `
# =========================================
# This m3u link is only for educational purposes
# =========================================
`;

function section(title) {
  return `\n# ---------------=== ${title} ===-------------------\n`;
}

// ================= LOCAL TELUGU JSON =================
function convertLocalTelugu(jsonArray) {
  if (!Array.isArray(jsonArray)) return "";

  const out = [];

  jsonArray.forEach((ch) => {
    if (!ch.stream_url) return;

    const name = ch.title || "Unknown";
    const logo = ch.image || "";

    out.push(
      `#EXTINF:-1 tvg-name="${name}" tvg-logo="${logo}" group-title="CS 📺 | Local Channel Telugu",${name}`,
      ch.stream_url
    );
  });

  return out.join("\n");
}

// ================= LOCAL TAMIL JSON =================
function convertLocalTamil(jsonArray) {
  if (!Array.isArray(jsonArray)) return "";

  const out = [];

  jsonArray.forEach((ch) => {
    if (!ch.stream_url) return;

    const name = ch.title || "Unknown";
    const logo = ch.image || "";

    out.push(
      `#EXTINF:-1 tvg-name="${name}" tvg-logo="${logo}" group-title="CS 📺 | Local Channel Tamil",${name}`,
      ch.stream_url
    );
  });

  return out.join("\n");
}

// ================= JIO =================
function convertJioJson(json) {
  if (!json) return "";

  const out = [];

  for (const id in json) {
    const ch = json[id];

    const cookie = `hdnea=${ch.url.match(/__hdnea__=([^&]*)/)?.[1] || ""}`;

    const category = (ch.group_title || "GENERAL").toUpperCase();

    out.push(
      `#EXTINF:-1 tvg-id="${id}" tvg-logo="${ch.tvg_logo}" group-title="JIOTV+ | ${category}",${ch.channel_name}`,
      `#KODIPROP:inputstream.adaptive.license_type=clearkey`,
      `#KODIPROP:inputstream.adaptive.license_key=${ch.kid}:${ch.key}`,
      `#EXTHTTP:${JSON.stringify({
        Cookie: cookie,
        "User-Agent": ch.user_agent,
      })}`,
      ch.url
    );
  }

  return out.join("\n");
}

// ================= SPORTS JSON =================
function convertSportsJson(json) {
  if (!json || !Array.isArray(json.streams)) return "";

  const out = [];

  json.streams.forEach((s, i) => {
    if (!s.url) return;

    const urlObj = new URL(s.url);

    const drm = urlObj.searchParams.get("drmLicense") || "";
    const [kid, key] = drm.split(":");

    const ua = urlObj.searchParams.get("User-Agent") || "";
    const hdnea = urlObj.searchParams.get("__hdnea__") || "";

    urlObj.searchParams.delete("drmLicense");
    urlObj.searchParams.delete("User-Agent");

    out.push(
      `#EXTINF:-1 tvg-id="${1100 + i}" tvg-logo="https://img.u0k.workers.dev/CosmicSports.webp" group-title="SPORTS",${s.language}`,
      `#KODIPROP:inputstream.adaptive.license_type=clearkey`,
      `#KODIPROP:inputstream.adaptive.license_key=${kid}:${key}`,
      `#EXTHTTP:${JSON.stringify({
        Cookie: hdnea ? `__hdnea__=${hdnea}` : "",
        "User-Agent": ua,
      })}`,
      urlObj.toString()
    );
  });

  return out.join("\n");
}

// ================= SAFE FETCH =================
async function safeFetch(url, name, retries = 2) {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const res = await axios.get(url, {
        timeout: 60000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });

      console.log(`✅ Loaded ${name}`);
      return res.data;
    } catch (err) {
      console.warn(`⚠️ Attempt ${attempt} failed for ${name}`);

      if (attempt > retries) {
        console.warn(`❌ Skipped ${name}`);
        return null;
      }

      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

// ================= MAIN =================
async function run() {
  const out = [];
  out.push(PLAYLIST_HEADER.trim());

  const jio = await safeFetch(SOURCES.JIO_JSON, "JIO");
  if (jio) out.push(section("JIOTV+"), convertJioJson(jio));

  const sports = await safeFetch(SOURCES.SPORTS_JSON, "Sports");
  if (sports) out.push(section("MATCHES"), convertSportsJson(sports));

  out.push(PLAYLIST_FOOTER.trim());

  fs.writeFileSync(OUTPUT_FILE, out.join("\n") + "\n");

  console.log(`✅ ${OUTPUT_FILE} generated successfully`);
}

run();
