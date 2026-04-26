const axios = require("axios");
const fs = require("fs");

const OUTPUT_FILE = "stream.m3u";

// ================= SOURCES =================
const SOURCES = {
  HOTSTAR_M3U: "https://hotstar.droozy.workers.dev/",
  ZEE5_M3U: "https://zee5.droozy.workers.dev/",
  JIO_JSON: "https://raw.githubusercontent.com/cybersterr/jeeyo/main/stream.json",
  SONYLIV_JSON: "https://raw.githubusercontent.com/drmlive/sliv-live-events/main/sonyliv.json",
  FANCODE_JSON: "https://raw.githubusercontent.com/drmlive/fancode-live-events/main/fancode.json",
  ICC_TV_JSON: "https://icc.vodep39240327.workers.dev/icctv.jso",

  SPORTS_JSON: [
    "https://hs.jaj-aya-m-o-t-o.workers.dev/",
    "https://gentle-moon-6383.lrl45.workers.dev/stream.jso"
  ],

  SONYLIV_M3U: "https://cloudplay-sonyliv.pages.dev/sony.m3u",
  SUNXT_JSON: "https://netx.streamstar18.workers.dev/sun",
  NEW_M3U: "https://mactom3u.vodep39240327.workers.dev/playlist.m3u8?host=tv.saartv.cc&path=%2Fstalker_portal%2F&mac=00%3A1A%3A79%3A00%3A4D%3A84&serial=58E6A1E78FB02&device_id=6AD7860A1E2D78D9961D17DFA34D4C70D06CFFC1F807B8115F627648121C4339&device_id_2=6AD7860A1E2D78D9961D17DFA34D4C70D06CFFC1F807B8115F627648121C4339&stb_type=MAG270",
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

function convertSony(json){
 if(!json.matches) return "";

 return json.matches
 .filter(m => m.isLive)
 .map(m => {
   const url = m.dai_url || m.pub_url;
   if(!url) return null;

   return `#EXTINF:-1 tvg-logo="${m.src || ""}" group-title="SonyLiv | Sports",${m.match_name || "Sony Live"}\n${url}`;
 })
 .filter(Boolean)
 .join("\n");
}

// ================= SONY LIV LIVE EVENT PARSER =============
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

// ================= SONYLIV DIGITAL JSON =================
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

// ================= SUNXT =================
function convertSunxtJson(json){
 if(!Array.isArray(json)) return "";

 const out=[];

 json.slice(1).forEach((ch, i)=>{
  if(!ch.mpd_url) return;

  out.push(`#EXTINF:-1 tvg-id="${ch.id || 3000+i}" tvg-logo="${ch.logo || ""}" group-title="🎬 OTT | SUNXT",${ch.name || "SunXT Channel"}`);
  out.push(`#KODIPROP:inputstream.adaptive.license_type=clearkey`);
  out.push(`#KODIPROP:inputstream.adaptive.license_key=${(ch.license_url || "").split("keyid=")[1]?.split("&")[0] || ""}:${(ch.license_url || "").split("key=")[1] || ""}`);
  out.push(`#EXTHTTP:${JSON.stringify({"User-Agent": ch.user_agent || ""})}`);
  out.push(ch.mpd_url);
 });

 return out.join("\n");
}

// ================= SPORTS =================
function convertSportsJson(json){
 if(!json || !Array.isArray(json.streams)) return "";

 const out=[];

 json.streams.forEach((s,i)=>{
  if(!s.url) return;

  const urlObj = new URL(s.url);

  const drm = urlObj.searchParams.get("drmLicense") || "";
  const [kid,key] = drm.split(":");

  const ua =
    urlObj.searchParams.get("User-Agent") ||
    urlObj.searchParams.get("user-agent") ||
    "";

  const hdnea =
    urlObj.searchParams.get("__hdnea__") ||
    urlObj.searchParams.get("hdnea") ||
    "";

  // Remove extra params from final URL
  urlObj.searchParams.delete("drmLicense");
  urlObj.searchParams.delete("User-Agent");
  urlObj.searchParams.delete("user-agent");

  const name =
    s.language ||
    s.channel ||
    `Sports ${i+1}`;

  const logo =
    s.logo ||
    s.tvg_logo ||
    "";

  out.push(
`#EXTINF:-1 tvg-id="${1100+i}" tvg-name="${name}" tvg-logo="${logo}" group-title="IPL LIVE",${name}`
  );

  // Add DRM only if exists
  if(kid && key){
   out.push(`#KODIPROP:inputstream.adaptive.license_type=clearkey`);
   out.push(`#KODIPROP:inputstream.adaptive.license_key=${kid}:${key}`);
  }

  out.push(
`#EXTHTTP:${JSON.stringify({
 Cookie: hdnea ? `__hdnea__=${hdnea}` : "",
 "User-Agent": ua
})}`
  );

  out.push(urlObj.toString());
 });

 return out.join("\n");
}

// ================= SAFE FETCH =================
async function safeFetch(url){
 try{
  const res=await axios.get(url,{timeout:60000});
  return res.data;
 }catch{
  return null;
 }
}

// ================= FANCODE (JQ-STYLE PARSER) =================
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

 let sportsCombined = [];
 for(const u of SOURCES.SPORTS_JSON){
  const d = await safeFetch(u);
  if(d && Array.isArray(d.streams)){
    sportsCombined = sportsCombined.concat(d.streams);
  }
 }
 if(sportsCombined.length){
  out.push(section("IPL 2026 | LIVE"), convertSportsJson({streams: sportsCombined}));
 }

 const hotstar=await safeFetch(SOURCES.HOTSTAR_M3U);
 if(hotstar) out.push(section("OTT | Jio Cinema"),hotstar);

 const zee5=await safeFetch(SOURCES.ZEE5_M3U);
if(zee5){
 const fixedZee5 = zee5.replace(/group-title="[^"]*"/g, 'group-title="🎬 OTT | ZEE5"');
 out.push(section("🎬 OTT | ZEE5"), fixedZee5);
}

 const digital = await safeFetch(SOURCES.SONYLIV_M3U);
 if(digital){
  out.push(section("🎬 OTT | SONY LIV"), convertSonyJsonChannels(digital));
 }

 const sunxt = await safeFetch(SOURCES.SUNXT_JSON);
 if(sunxt){
  out.push(section("🎬 OTT | SUNXT"), convertSunxtJson(sunxt));
 }

 const jio=await safeFetch(SOURCES.JIO_JSON);
 if(jio) out.push(section("⭕ JioTv+"),convertJioJson(jio));

 // ✅ ONLY CHANGE: fixed group-title
 let fan = await safeFetch(SOURCES.FANCODE_JSON);
 try {
  if (typeof fan === "string") fan = JSON.parse(fan);
 } catch {}

 if (fan) {
  const all = extractObjects(fan);

  const valid = all.filter(o =>
    o.match_id && (o.adfree_url || o.dai_url)
  );

  valid.sort((a, b) =>
    (a.status === "LIVE" ? 0 : 1) - (b.status === "LIVE" ? 0 : 1)
  );

  const converted = [];

  valid.forEach((e, i) => {
    converted.push(`#EXTINF:-1 tvg-id="${e.match_id}" tvg-logo="${e.src || ""}" group-title="🔸FanCode🔸| Live Events",${e.match_name || e.title}`);
    converted.push(e.adfree_url || e.dai_url);
  });

  if (converted.length) {
    out.push(section("🔸FanCode🔸| Live Events"), converted.join("\n"));
  }
 }

 const sony=await safeFetch(SOURCES.SONYLIV_JSON);
 if(sony) out.push(section("🔹SonyLiv🔹| Live Events"),convertSony(sony));

 const newm3u = await safeFetch(SOURCES.NEW_M3U);
if(newm3u){

 const allowedGroups = [
  "SPORTS | RACING",
  "SPORTS | CRICKET",
  "SPORTS | CRICKET REPLAY",
  "SPORTS | PPV LIVE EVENTS",
  "SPORTS | LALIGA",
  "SPORTS | UEFA",
  "SPORTS | SERIE A",
  "SPORTS | GENERAL",
  "TAMIL | TV",
  "TELUGU | TV",
  "MALYALAM | TV",
  "MARATHI | TV",
  "NEPALI | TV",
  "PUNJABI | TV",
  "KANNADA | TV",
  "HINDI | TV",
  "ENGLISH | UK",
  "BENGALI | TV",
  "URDU | TV",
  "ENGLISH | 24X7 MUSIC",
  "HINDI | MUSIC",
  "PUNJABI | MUSIC",
  "ENGLISH | MOVIES",
  "ENGLISH | 24x7 CLASSIC SERIES",
  "ENGLISH | 24x7 OTT SERIES",
  "HINDI | 24X7 MOVIES",
  "HINDI | 24x7 OTT SERIES",
  "ENGLISH | KIDS",
  "HINDI | KIDS",
 ].map(g => g.toUpperCase());

 const lines = newm3u.split("\n");
 const filtered = [];

 for(let i = 0; i < lines.length; i++){
  const line = lines[i];

  if(line.startsWith("#EXTINF")){
    const match = line.match(/group-title="([^"]*)"/);
    const group = match ? match[1].toUpperCase() : "";

    if(allowedGroups.some(g => group.includes(g))){

      const updatedLine = match
        ? line.replace(/group-title="[^"]*"/, `group-title="🌐 WORLD | ${group}"`)
        : line.replace('#EXTINF:-1', `#EXTINF:-1 group-title="🌐 WORLD | OTHER"`);

      filtered.push(updatedLine);

      if(lines[i+1]){
        filtered.push(lines[i+1]);
        i++;
      }
    }
  }
 }

 out.push(section("🌐 WORLD | Extra"), filtered.join("\n"));
}

 const icc=await safeFetch(SOURCES.ICC_TV_JSON);
 if(icc) out.push(section("ICC TV"),icc);

 out.push(PLAYLIST_FOOTER.trim());

 fs.writeFileSync(OUTPUT_FILE,out.join("\n")+"\n");

 console.log("stream.m3u generated");
}

run();
