const axios = require("axios");
const fs = require("fs");

const OUTPUT_FILE = "stream.m3u";

// ================= SOURCES =================
const SOURCES = {
  HOTSTAR_M3U: process.env.HOTSTAR_M3U,
  ZEE5_M3U: process.env.ZEE5_M3U,

  JIO_JSON:
    "https://raw.githubusercontent.com/cybersterr/jeeyo/main/stream.json",

  SONYLIV_JSON:
    "https://raw.githubusercontent.com/drmlive/sliv-live-events/main/sonyliv.json",

  FANCODE_JSON:
    "https://raw.githubusercontent.com/drmlive/fancode-live-events/main/fancode.json",

  ICC_TV_JSON:
    "https://icc.vodep39240327.workers.dev/icctv.jso",

  SONYLIV_M3U: process.env.SONYLIV_M3U,
  SUNXT_M3U: process.env.SUNXT_M3U,

  JSTAR_LIVE_EVENTS: process.env.JSTAR_LIVE_EVENTS,
  WORLDWIDE_EVENTS: process.env.WORLDWIDE_EVENTS,
};

// ================= PLAYLIST HEADER =================
const PLAYLIST_HEADER = `#EXTM3U
#EXTM3U x-tvg-url="https://epgshare01.online/epgshare01/epg_ripper_IN4.xml.gz"
#EXTM3U x-tvg-url="https://mitthu786.github.io/tvepg/tataplay/epg.xml.gz"
#EXTM3U x-tvg-url="https://avkb.short.gy/tsepg.xml.gz"
# ===== CosmicSports Playlist =====
# Join Telegram: @FrostDrift7
`;

const PLAYLIST_FOOTER = `
# =========================================
# This m3u link is only for educational purposes
# =========================================
`;

function section(title) {
  return `\n# ---------------=== ${title} ===-------------------\n`;
}

// ================= FETCH RAW M3U =================
async function fetchM3U(url, name) {
  try {
    if (!url) {
      console.log(`${name}: Secret URL missing`);
      return "";
    }

    console.log(`Fetching ${name}...`);

    const res = await axios.get(url.trim(), {
      timeout: 60000,
      responseType: "text",
      maxRedirects: 10,
      validateStatus: () => true,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    console.log(
      `${name}: HTTP ${res.status} | ${String(res.data || "").length} bytes`
    );

    if (res.status < 200 || res.status >= 300) {
      return "";
    }

    return String(res.data || "").trim();

  } catch (error) {
    console.error(
      `${name} fetch error:`,
      error.message
    );

    return "";
  }
}

// ================= FETCH JSON =================
async function fetchJSON(url, name) {
  try {
    if (!url) {
      console.log(`${name}: URL missing`);
      return null;
    }

    console.log(`Fetching ${name}...`);

    const res = await axios.get(url.trim(), {
      timeout: 60000,
      responseType: "text",
      maxRedirects: 10,
      validateStatus: () => true,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    console.log(
      `${name}: HTTP ${res.status} | ${String(res.data || "").length} bytes`
    );

    if (res.status < 200 || res.status >= 300) {
      return null;
    }

    const text = String(res.data || "").trim();

    if (!text) return null;

    return JSON.parse(text);

  } catch (error) {
    console.error(
      `${name} JSON error:`,
      error.message
    );

    return null;
  }
}

// ================= FORCE GROUP =================
function forceGroup(content, groupName) {
  if (!content) return "";

  const lines = String(content).split(/\r?\n/);
  const out = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Remove source M3U header only
    if (line === "#EXTM3U") continue;

    if (line.startsWith("#EXTINF")) {
      let updated = line;

      if (/group-title="[^"]*"/i.test(updated)) {
        updated = updated.replace(
          /group-title="[^"]*"/i,
          `group-title="${groupName}"`
        );
      } else {
        updated = updated.replace(
          "#EXTINF:-1",
          `#EXTINF:-1 group-title="${groupName}"`
        );
      }

      out.push(updated);
      continue;
    }

    // Keep ALL other M3U lines exactly
    out.push(line);
  }

  return out.join("\n").trim();
}

// ================= JIO =================
function convertJioJson(json) {
  if (!json) return "";

  const out = [];
  const channels = json.channels || json;

  for (const id in channels) {
    const ch = channels[id];

    if (!ch || !ch.url) continue;

    const cookie =
      `hdnea=${ch.url.match(/__hdnea__=([^&]*)/)?.[1] || ""}`;

    const category =
      (ch.group_title || "GENERAL").toUpperCase();

    out.push(
`#EXTINF:-1 tvg-id="${ch.tvg_id || id}" tvg-logo="${ch.tvg_logo || ""}" group-title="⭕️ JIOTV+ | ${category}",${ch.channel_name || id}`
    );

    out.push(
      `#KODIPROP:inputstream.adaptive.license_type=clearkey`
    );

    if (ch.kid && ch.key) {
      out.push(
`#KODIPROP:inputstream.adaptive.license_key=${ch.kid}:${ch.key}`
      );
    } else if (ch.key) {
      out.push(
`#KODIPROP:inputstream.adaptive.license_key=${ch.key}`
      );
    }

    out.push(
`#EXTHTTP:${JSON.stringify({
  Cookie: cookie,
  "User-Agent": ch.user_agent || ""
})}`
    );

    out.push(ch.url);
  }

  return out.join("\n");
}

// ================= SONYLIV LIVE EVENTS =================
function convertSony(json) {
  if (!json || !json.matches) return "";

  return json.matches
    .filter(m => m.isLive)
    .map(m => {
      const url = m.dai_url || m.pub_url;

      if (!url) return null;

      return `#EXTINF:-1 tvg-logo="${m.src || ""}" group-title="🔹️SonyLiv Live🔹️",${m.match_name || "Sony Live"}\n${url}`;
    })
    .filter(Boolean)
    .join("\n");
}

// ================= SONYLIV DIGITAL =================
function convertSonyJsonChannels(content) {
  if (!content) return "";

  const out = [];
  const lines = String(content).split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line.startsWith("#EXTINF")) continue;

    if (line.includes('tvg-id="CloudPlay"')) {
      continue;
    }

    const updatedLine =
      /group-title="[^"]*"/.test(line)
        ? line.replace(
            /group-title="[^"]*"/,
            'group-title="🎬 OTT | SONY LIV"'
          )
        : line.replace(
            "#EXTINF:-1",
            '#EXTINF:-1 group-title="🎬 OTT | SONY LIV"'
          );

    out.push(updatedLine);

    // Keep metadata lines until URL
    let j = i + 1;

    while (j < lines.length) {
      const next = lines[j].trim();

      if (next.startsWith("#EXTINF")) break;

      out.push(next);

      if (
        next.startsWith("http://") ||
        next.startsWith("https://")
      ) {
        j++;
        break;
      }

      j++;
    }

    i = j - 1;
  }

  return out.join("\n");
}

// ================= ICC TV =================
function convertIccTvJson(json) {
  if (!json) {
    console.log("ICC TV: Empty JSON");
    return "";
  }

  const events =
    Array.isArray(json.live)
      ? json.live
      : Array.isArray(json.matches)
        ? json.matches
        : [];

  console.log(`ICC TV events found: ${events.length}`);

  if (!events.length) return "";

  const out = [];

  events.forEach((match, index) => {
    try {
      const playback = match.playback || {};
      const fields = match.fields || {};

      const playbackUrl =
        playback.playbackUrl ||
        playback.url ||
        playback.mpd ||
        "";

      if (!playbackUrl) {
        console.log(
          `ICC event ${index}: No playback URL`
        );
        return;
      }

      const videoId =
        fields.videoId ||
        match.videoId ||
        match._entityId ||
        `icc-${index}`;

      const title =
        match.title ||
        match.name ||
        "ICC Live";

      const logo =
        match.thumbnail?.thumbnailUrl ||
        match.thumbnail?.url ||
        match.image ||
        "";

      const audioTrack =
        playback.audioTracks?.[0]?.displayName ||
        "English";

      const jwk =
        playback.keys?.jwk ||
        playback.jwk ||
        null;

      const hexKey =
        playback.keys?.hex ||
        playback.key ||
        "";

      let userAgent = "";
      let referer = "";
      let origin = "";

      const headers =
        playback.headers || [];

      if (Array.isArray(headers)) {
        headers.forEach(header => {
          const index = String(header).indexOf(":");

          if (index === -1) return;

          const key =
            String(header)
              .substring(0, index)
              .trim()
              .toLowerCase();

          const value =
            String(header)
              .substring(index + 1)
              .trim();

          if (key === "user-agent") {
            userAgent = value;
          }

          if (key === "referer") {
            referer = value;
          }

          if (key === "origin") {
            origin = value;
          }
        });
      }

      // Supports object-style headers too
      if (
        headers &&
        !Array.isArray(headers) &&
        typeof headers === "object"
      ) {
        userAgent =
          headers["User-Agent"] ||
          headers["user-agent"] ||
          userAgent;

        referer =
          headers["Referer"] ||
          headers["referer"] ||
          referer;

        origin =
          headers["Origin"] ||
          headers["origin"] ||
          origin;
      }

      out.push(
`#EXTINF:-1 tvg-id="${videoId}" tvg-logo="${logo}" tvg-lang="${audioTrack}" group-title="📺 ICC TV",${audioTrack} | ${title}`
      );

      out.push(
        `#KODIPROP:inputstream=inputstream.adaptive`
      );

      out.push(
        `#KODIPROP:inputstream.adaptive.manifest_type=mpd`
      );

      out.push(
        `#KODIPROP:inputstream.adaptive.license_type=com.clearkey.alpha`
      );

      if (
        jwk &&
        typeof jwk === "object" &&
        Array.isArray(jwk.keys) &&
        jwk.keys.length
      ) {
        out.push(
`#KODIPROP:inputstream.adaptive.license_key=${JSON.stringify(jwk)}`
        );
      } else if (hexKey) {
        out.push(
`#KODIPROP:inputstream.adaptive.license_key=${hexKey}`
        );
      }

      if (userAgent) {
        out.push(
`#EXTVLCOPT:http-user-agent=${userAgent}`
        );
      }

      if (referer) {
        out.push(
`#EXTVLCOPT:http-referrer=${referer}`
        );
      }

      if (origin) {
        out.push(
`#EXTVLCOPT:http-origin=${origin}`
        );
      }

      const extHttp = {};

      if (referer) extHttp.referer = referer;
      if (origin) extHttp.origin = origin;

      if (Object.keys(extHttp).length) {
        out.push(
`#EXTHTTP:${JSON.stringify(extHttp)}`
        );
      }

      out.push(playbackUrl);

    } catch (error) {
      console.error(
        `ICC event ${index} conversion error:`,
        error.message
      );
    }
  });

  return out.join("\n");
}

// ================= FANCODE =================
function extractObjects(obj, arr = []) {
  if (Array.isArray(obj)) {
    obj.forEach(o =>
      extractObjects(o, arr)
    );
  } else if (
    obj &&
    typeof obj === "object"
  ) {
    arr.push(obj);

    Object.values(obj).forEach(v =>
      extractObjects(v, arr)
    );
  }

  return arr;
}

// ================= MAIN =================
async function run() {

  const out = [];

  out.push(PLAYLIST_HEADER.trim());

  // ================= HOTSTAR =================
  const hotstar =
    await fetchM3U(
      SOURCES.HOTSTAR_M3U,
      "HOTSTAR"
    );

  if (hotstar) {
    out.push(
      section("🎬 OTT | JIOHOTSTAR"),
      forceGroup(
        hotstar,
        "🎬 OTT | JIOHOTSTAR"
      )
    );
  }

  // ================= ZEE5 =================
  const zee5 =
    await fetchM3U(
      SOURCES.ZEE5_M3U,
      "ZEE5"
    );

  if (zee5) {
    out.push(
      section("🎬 OTT | ZEE5"),
      forceGroup(
        zee5,
        "🎬 OTT | ZEE5"
      )
    );
  }

  // ================= SONYLIV DIGITAL =================
  const digital =
    await fetchM3U(
      SOURCES.SONYLIV_M3U,
      "SONYLIV DIGITAL"
    );

  if (digital) {
    out.push(
      section("🎬 OTT | SONY LIV"),
      convertSonyJsonChannels(digital)
    );
  }

  // ================= SUNXT =================
  const sunxt =
    await fetchM3U(
      SOURCES.SUNXT_M3U,
      "SUNXT"
    );

  if (sunxt) {
    out.push(
      section("🎬 OTT | SUNXT"),
      forceGroup(
        sunxt,
        "🎬 OTT | SUNXT"
      )
    );
  }

  // ================= JIO =================
  const jio =
    await fetchJSON(
      SOURCES.JIO_JSON,
      "JIO"
    );

  if (jio) {
    const converted =
      convertJioJson(jio);

    if (converted) {
      out.push(
        section("⭕ JioTv+"),
        converted
      );
    }
  }

  // ================= FANCODE =================
  const fan =
    await fetchJSON(
      SOURCES.FANCODE_JSON,
      "FANCODE"
    );

  if (fan) {
    const all =
      extractObjects(fan);

    const valid =
      all.filter(o =>
        o.match_id &&
        (
          o.adfree_url ||
          o.dai_url
        )
      );

    valid.sort((a, b) =>
      (a.status === "LIVE" ? 0 : 1) -
      (b.status === "LIVE" ? 0 : 1)
    );

    const converted = [];

    valid.forEach((e) => {
      converted.push(
`#EXTINF:-1 tvg-id="${e.match_id}" tvg-logo="${e.src || ""}" group-title="🔸FanCode🔸| Live Events",${e.match_name || e.title}`
      );

      converted.push(
        e.adfree_url ||
        e.dai_url
      );
    });

    if (converted.length) {
      out.push(
        section("🔸FanCode🔸| Live Events"),
        converted.join("\n")
      );
    }
  }

  // ================= SONYLIV LIVE EVENTS =================
  const sony =
    await fetchJSON(
      SOURCES.SONYLIV_JSON,
      "SONYLIV LIVE EVENTS"
    );

  if (sony) {
    const converted =
      convertSony(sony);

    if (converted) {
      out.push(
        section("🔹SonyLiv🔹| Live Events"),
        converted
      );
    }
  }

  // ================= ICC TV =================
  const icc =
    await fetchJSON(
      SOURCES.ICC_TV_JSON,
      "ICC TV"
    );

  if (icc) {
    const converted =
      convertIccTvJson(icc);

    if (converted) {
      out.push(
        section("📺 ICC TV"),
        converted
      );
    } else {
      console.log(
        "ICC TV conversion produced no channels"
      );
    }
  }

  // ================= JSTAR =================
  const jstar =
    await fetchM3U(
      SOURCES.JSTAR_LIVE_EVENTS,
      "JSTAR LIVE EVENTS"
    );

  if (jstar) {
    out.push(
      section("🔴 LIVE | JSTAR LIVE EVENTS"),
      forceGroup(
        jstar,
        "🔴 LIVE | JSTAR LIVE EVENTS"
      )
    );
  }

  // ================= WORLDWIDE =================
  const worldwide =
    await fetchM3U(
      SOURCES.WORLDWIDE_EVENTS,
      "WORLDWIDE EVENTS"
    );

  if (worldwide) {
    out.push(
      section("🔵 LIVE | WORLDWIDE EVENTS"),
      forceGroup(
        worldwide,
        "🔵 LIVE | WORLDWIDE EVENTS"
      )
    );
  }

  out.push(PLAYLIST_FOOTER.trim());

  fs.writeFileSync(
    OUTPUT_FILE,
    out.join("\n") + "\n",
    "utf8"
  );

  console.log(
    "stream.m3u generated successfully"
  );
}

run().catch(error => {
  console.error(
    "Fatal error:",
    error
  );

  process.exit(1);
});
