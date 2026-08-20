const axios = require("axios");
const fs = require("fs");

const OUTPUT_FILE = "stream.m3u";

// ================= SOURCES =================
const SOURCES = {
  HOTSTAR_M3U: process.env.HOTSTAR_M3U,
  ZEE5_M3U: process.env.ZEE5_M3U,

  JIO_JSON: "https://raw.githubusercontent.com/cybersterr/jeeyo/main/stream.json",
  SONYLIV_JSON: "https://raw.githubusercontent.com/drmlive/sliv-live-events/main/sonyliv.json",
  FANCODE_JSON: "https://raw.githubusercontent.com/drmlive/fancode-live-events/main/fancode.json",

  ICC_TV_JSON: "https://raw.githubusercontent.com/doctor-8trange/nexphi0/refs/heads/main/data/icc.json",

  SONYLIV_M3U: process.env.SONYLIV_M3U,
  SUNXT_M3U: process.env.SUNXT_M3U,
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

// ================= JIO =================
function convertJioJson(json){
 const out=[];

 const channels = json.channels || json;

 for(const id in channels){

  const ch = channels[id];

  if(!ch || !ch.url) continue;

  const cookie =
   `hdnea=${ch.url.match(/__hdnea__=([^&]*)/)?.[1] || ""}`;

  const category =
   (ch.group_title || "GENERAL").toUpperCase();

  out.push(
`#EXTINF:-1 tvg-id="${ch.tvg_id || id}" tvg-logo="${ch.tvg_logo || ""}" group-title="⭕️ JIOTV+ | ${category}",${ch.channel_name || id}`
  );

  out.push(`#KODIPROP:inputstream.adaptive.license_type=clearkey`);

  if(ch.kid && ch.key){
   out.push(`#KODIPROP:inputstream.adaptive.license_key=${ch.kid}:${ch.key}`);
  }else if(ch.key){
   out.push(`#KODIPROP:inputstream.adaptive.license_key=${ch.key}`);
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
function convertSony(json){
 if(!json.matches) return "";

 return json.matches
 .filter(m => m.isLive)
 .map(m => {
   const url = m.dai_url || m.pub_url;
   if(!url) return null;

   return `#EXTINF:-1 tvg-logo="${m.src || ""}" group-title="🔹️SonyLiv Live🔹️",${m.match_name || "Sony Live"}\n${url}`;
 })
 .filter(Boolean)
 .join("\n");
}

// ================= SONYLIV DIGITAL M3U =================
function convertSonyJsonChannels(json){
 if(!json) return "";

 const out=[];

 const lines = typeof json === "string"
  ? json.split("\n")
  : [];

 if(lines.length){

  for(let i=0;i<lines.length;i++){

   const line = lines[i].trim();

   if(line.startsWith("#EXTINF")){

    if(line.includes('tvg-id="CloudPlay"')){
      i++;
      continue;
    }

    const updatedLine = line.match(/group-title="[^"]*"/)
      ? line.replace(/group-title="[^"]*"/, 'group-title="🎬 OTT | SONY LIV"')
      : line.replace('#EXTINF:-1', '#EXTINF:-1 group-title="🎬 OTT | SONY LIV"');

    out.push(updatedLine);

    if(lines[i+1]){
      out.push(lines[i+1].trim());
      i++;
    }
   }
  }

  return out.join("\n");
 }

 if(typeof json !== "object") return "";

 for(const id in json){
  const ch = json[id];
  if(!ch.url) continue;

  const tvgId   = ch.tvg_id || `${id}.in`;
  const tvgName = ch.tvg_name || ch.channel_name || id;
  const logo    = ch.tvg_logo || "";
  const name    = ch.channel_name || id;

  out.push(
`#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${tvgName}" group-title="🎬 OTT | SONY LIV" tvg-logo="${logo}",${name}`
  );
  out.push(ch.url);
 }

 return out.join("\n");
}

// ================= ICC TV JSON TO M3U =================
function convertIccTvJson(json){
 if(!json || !Array.isArray(json.live)) return "";

 const out = [];

 json.live.forEach((match) => {

  const playback = match.playback || {};
  const fields = match.fields || {};
  const keys = playback.keys || {};

  const playbackUrl = playback.playbackUrl || "";
  if(!playbackUrl) return;

  const videoId =
   fields.videoId ||
   match._entityId ||
   "";

  const title =
   match.title ||
   "ICC Live";

  const logo =
   match.thumbnail?.thumbnailUrl ||
   "";

  const audioTrack =
   playback.audioTracks?.[0]?.displayName ||
   "English";

  const jwk =
   keys.jwk ||
   {};

  const hexKey =
   keys.hex ||
   "";

  // Extract dynamic headers
  const headers = playback.headers || [];

  let userAgent = "";
  let referer = "";
  let origin = "";

  headers.forEach((header) => {
    const index = header.indexOf(":");
    if(index === -1) return;

    const key = header.substring(0, index).trim().toLowerCase();
    const value = header.substring(index + 1).trim();

    if(key === "user-agent") userAgent = value;
    if(key === "referer") referer = value;
    if(key === "origin") origin = value;
  });

  out.push(
`#EXTINF:-1 tvg-id="${videoId}" tvg-logo="${logo}" tvg-lang="${audioTrack}" group-title="Cricket",${audioTrack} | ${title}`
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

  // Prefer JWK format exactly like requested
  if(jwk && Array.isArray(jwk.keys) && jwk.keys.length){
   out.push(
`#KODIPROP:inputstream.adaptive.license_key=${JSON.stringify(jwk)}`
   );
  }else if(hexKey){
   out.push(
`#KODIPROP:inputstream.adaptive.license_key=${hexKey}`
   );
  }

  if(userAgent){
   out.push(
`#EXTVLCOPT:http-user-agent=${userAgent}`
   );
  }

  if(referer){
   out.push(
`#EXTVLCOPT:http-referrer=${referer}`
   );
  }

  if(origin){
   out.push(
`#EXTVLCOPT:http-origin=${origin}`
   );
  }

  const extHttp = {};

  if(referer){
   extHttp.referer = referer;
  }

  if(origin){
   extHttp.origin = origin;
  }

  if(Object.keys(extHttp).length){
   out.push(
`#EXTHTTP:${JSON.stringify(extHttp)}`
   );
  }

  out.push(playbackUrl);
 });

 return out.join("\n");
}

// ================= SAFE FETCH =================
async function safeFetch(url){
 try{
  if(!url) return null;

  const res = await axios.get(url,{
   timeout:60000,
   responseType:"text"
  });

  const contentType =
   res.headers["content-type"] ||
   "";

  if(
   contentType.includes("application/json") ||
   contentType.includes("text/json")
  ){
   try{
    return JSON.parse(res.data);
   }catch{
    return res.data;
   }
  }

  // Try parsing JSON even when server sends wrong content-type
  if(typeof res.data === "string"){
   const trimmed = res.data.trim();

   if(
    trimmed.startsWith("{") ||
    trimmed.startsWith("[")
   ){
    try{
     return JSON.parse(trimmed);
    }catch{}
   }
  }

  return res.data;

 }catch{
  return null;
 }
}

// ================= FANCODE =================
function extractObjects(obj, arr = []) {
 if (Array.isArray(obj)) {
  obj.forEach(o => extractObjects(o, arr));
 } else if (obj && typeof obj === "object") {
  arr.push(obj);
  Object.values(obj).forEach(v => extractObjects(v, arr));
 }
 return arr;
}

// ================= MAIN =================
async function run(){

 const out=[];
 out.push(PLAYLIST_HEADER.trim());

 // ================= HOTSTAR =================
 // Generated exactly as received from HOTSTAR_M3U
 const hotstar = await safeFetch(SOURCES.HOTSTAR_M3U);

 if(hotstar){
  out.push(
   section("OTT | Jio Cinema"),
   typeof hotstar === "string"
    ? hotstar
    : String(hotstar)
  );
 }

 // ================= ZEE5 =================
 const zee5 = await safeFetch(SOURCES.ZEE5_M3U);

 if(zee5){
  const zee5Content =
   typeof zee5 === "string"
    ? zee5
    : String(zee5);

  const fixedZee5 = zee5Content.replace(
   /group-title="[^"]*"/g,
   'group-title="🎬 OTT | ZEE5"'
  );

  out.push(
   section("🎬 OTT | ZEE5"),
   fixedZee5
  );
 }

 // ================= SONYLIV DIGITAL =================
 const digital = await safeFetch(SOURCES.SONYLIV_M3U);

 if(digital){
  out.push(
   section("🎬 OTT | SONY LIV"),
   convertSonyJsonChannels(digital)
  );
 }

 // ================= SUNXT =================
 // Direct M3U passthrough - generated exactly as received
 const sunxt = await safeFetch(SOURCES.SUNXT_M3U);

 if(sunxt){
  out.push(
   section("🎬 OTT | SUNXT"),
   typeof sunxt === "string"
    ? sunxt
    : String(sunxt)
  );
 }

 // ================= JIOTV+ =================
 const jio = await safeFetch(SOURCES.JIO_JSON);

 if(jio){
  out.push(
   section("⭕ JioTv+"),
   convertJioJson(jio)
  );
 }

 // ================= FANCODE =================
 let fan = await safeFetch(SOURCES.FANCODE_JSON);

 try {
  if (typeof fan === "string"){
   fan = JSON.parse(fan);
  }
 } catch {}

 if (fan) {

  const all = extractObjects(fan);

  const valid = all.filter(o =>
   o.match_id &&
   (o.adfree_url || o.dai_url)
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
    e.adfree_url || e.dai_url
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
 const sony = await safeFetch(SOURCES.SONYLIV_JSON);

 if(sony){
  out.push(
   section("🔹SonyLiv🔹| Live Events"),
   convertSony(sony)
  );
 }

 // ================= ICC TV =================
 const icc = await safeFetch(SOURCES.ICC_TV_JSON);

 if(icc){
  const convertedIcc =
   convertIccTvJson(icc);

  if(convertedIcc){
   out.push(
    section("ICC TV"),
    convertedIcc
   );
  }
 }

 out.push(PLAYLIST_FOOTER.trim());

 fs.writeFileSync(
  OUTPUT_FILE,
  out.join("\n") + "\n"
 );

 console.log("stream.m3u generated");
}

run();
