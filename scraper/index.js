const axios = require("axios");
const fs = require("fs");

const OUTPUT_FILE = "stream.m3u";

// ================= SOURCES =================
const SOURCES = {
  HOTSTAR_M3U: "https://voot.vodep39240327.workers.dev?voot.m3u",
  ZEE5_M3U: "https://join-vaathala1-for-more.vodep39240327.workers.dev/zee5.m3u",
  JIO_JSON: "https://raw.githubusercontent.com/cybersterr/jeeyo/main/stream.json",
  SONYLIV_JSON: "https://raw.githubusercontent.com/drmlive/sliv-live-events/main/sonyliv.json",
  FANCODE_JSON: "https://fanco.vodep39240327.workers.dev/",
  ICC_TV_JSON: "https://icc.vodep39240327.workers.dev/icctv.jso",

  SPORTS_JSON: [
    "https://sports.vodep39240327.workers.dev/sports111.json",
    "https://gentle-moon-6383.lrl45.workers.dev/stream.json"
  ],

  SONYLIV_M3U: "https://raw.githubusercontent.com/cybersterr/Sony/main/stream.json",
  SUNXT_JSON: "https://netx.streamstar18.workers.dev/sun", // ✅ ADDED
  NEW_M3U: "https://vt-ip.vodep39240327.workers.dev/playlist.m3u8?url=http://jiotv.be/stalker_portal/c&mac=00:1A:79:97:55:B9&deviceId1=B8F453DCDAEE02318C9FA912D9E409EE96B75AE592A70B526AA84478533C0A66&deviceId2=B8F453DCDAEE02318C9FA912D9E409EE96B75AE592A70B526AA84478533C0A66&sn=500482917046B",
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
 for(const id in json){
  const ch=json[id];
  const cookie=`hdnea=${ch.url.match(/__hdnea__=([^&]*)/)?.[1]||""}`;
  const category=(ch.group_title||"GENERAL").toUpperCase();

  out.push(`#EXTINF:-1 tvg-id="${id}" tvg-logo="${ch.tvg_logo}" group-title="JIOTV+ | ${category}",${ch.channel_name}`);
  out.push(`#KODIPROP:inputstream.adaptive.license_type=clearkey`);
  out.push(`#KODIPROP:inputstream.adaptive.license_key=${ch.kid}:${ch.key}`);
  out.push(`#EXTHTTP:${JSON.stringify({Cookie:cookie,"User-Agent":ch.user_agent})}`);
  out.push(ch.url);
 }
 return out.join("\n");
}

// ================= SONYLIV =================
function convertSony(json){
 if(!json.matches) return "";
 return json.matches.filter(m=>m.isLive).map(m=>{
  const url=m.dai_url||m.pub_url;
  if(!url) return null;
  return `#EXTINF:-1 tvg-logo="${m.src}" group-title="SonyLiv | Sports",${m.match_name}\n${url}`;
 }).filter(Boolean).join("\n");
}

// ================= SONYLIV DIGITAL JSON =================
function convertSonyJsonChannels(json){
 if(!json || typeof json !== "object") return "";

 const out=[];

 for(const id in json){
  const ch = json[id];
  if(!ch.url) continue;

  out.push(`#EXTINF:-1 tvg-id="${id}" tvg-logo="${ch.tvg_logo || ""}" group-title="CS OTT | SONY LIV",${ch.channel_name || id}`);
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

  out.push(`#EXTINF:-1 tvg-id="${ch.id || 3000+i}" tvg-logo="${ch.logo || ""}" group-title="CS OTT | SUNXT",${ch.name || "SunXT Channel"}`);
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

  const urlObj=new URL(s.url);
  const drm=urlObj.searchParams.get("drmLicense")||"";
  const[kid,key]=drm.split(":");
  const ua=urlObj.searchParams.get("User-Agent")||"";
  const hdnea=urlObj.searchParams.get("__hdnea__")||"";

  urlObj.searchParams.delete("drmLicense");
  urlObj.searchParams.delete("User-Agent");

  out.push(`#EXTINF:-1 tvg-id="${1100+i}" tvg-logo="https://img.u0k.workers.dev/CosmicSports.webp" group-title="IPL LIVE",${s.language || "IPL Live"}`);
  out.push(`#KODIPROP:inputstream.adaptive.license_type=clearkey`);
  out.push(`#KODIPROP:inputstream.adaptive.license_key=${kid}:${key}`);
  out.push(`#EXTHTTP:${JSON.stringify({Cookie:hdnea?`__hdnea__=${hdnea}`:"","User-Agent":ua})}`);
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

// ================= MAIN =================
async function run(){

 const out=[];
 out.push(PLAYLIST_HEADER.trim());

 // 1️⃣ IPL (TOP)
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

 // 2️⃣ Jio Cinema
 const hotstar=await safeFetch(SOURCES.HOTSTAR_M3U);
 if(hotstar) out.push(section("CS OTT | Jio Cinema"),hotstar);

 // 3️⃣ ZEE5
 const zee5=await safeFetch(SOURCES.ZEE5_M3U);
 if(zee5) out.push(section("CS OTT | ZEE5"),zee5);

 // 4️⃣ SONYLIV DIGITAL
 const digital = await safeFetch(SOURCES.SONYLIV_M3U);
 if(digital){
  out.push(section("CS OTT | SONY LIV"), convertSonyJsonChannels(digital));
 }

 // 4.5️⃣ SUNXT (ADDED)
 const sunxt = await safeFetch(SOURCES.SUNXT_JSON);
 if(sunxt){
  out.push(section("CS OTT | SUNXT"), convertSunxtJson(sunxt));
 }

 // 5️⃣ JIOTV+
 const jio=await safeFetch(SOURCES.JIO_JSON);
 if(jio) out.push(section("JioTv+"),convertJioJson(jio));

 // 6️⃣ FANCODE
 const fan=await safeFetch(SOURCES.FANCODE_JSON);
 if(fan) out.push(section("FanCode | Live Events"),fan);

 // 7️⃣ SONYLIV EVENTS
 const sony=await safeFetch(SOURCES.SONYLIV_JSON);
 if(sony) out.push(section("SonyLiv | Live Events"),convertSony(sony));

 // 8️⃣ NEW M3U (FILTERED)
const newm3u = await safeFetch(SOURCES.NEW_M3U);
if(newm3u){

 const allowedGroups = [
  "SPORTS",
  "SPORTS | CRICKET",
  "SPORTS | PPV EVENTS",
  "SPORTS | LALIGA",
  "SPORTS | UEFA",
  "SPORTS | SERIE A",
  "TAMIL",
  "TELUGU",
  "MALYALAM",
  "MARATHI",
  "NEPALI",
  "PUNJABI",
  "KANNADA",
  "HINDI",
  "ENGLISH",
  "BANGLA/BENGALI",
  "URDU",
  "ENGLISH MUSIC",
  "HINDI 24X7 MUSIC",
  "PUNJABI 24X7 MUSIC",
  "ENGLISH MOVIES",
  "HINDI MOVIES",
  "KIDS"
 ].map(g => g.toUpperCase());

 const lines = newm3u.split("\n");
 const filtered = [];

 for(let i = 0; i < lines.length; i++){
  const line = lines[i];

  if(line.startsWith("#EXTINF")){
    const match = line.match(/group-title="([^"]*)"/);
    const group = match ? match[1].toUpperCase() : "";

    if(allowedGroups.includes(group)){
      const updatedLine = match
        ? line.replace(/group-title="[^"]*"/, `group-title="CS-W | ${group}"`)
        : line.replace('#EXTINF:-1', `#EXTINF:-1 group-title="CS-W | OTHER"`);

      filtered.push(updatedLine);

      if(lines[i+1]){
        filtered.push(lines[i+1]);
        i++;
      }
    }
  }
 }

 out.push(section("CS-W | Extra"), filtered.join("\n"));
}

 // ICC (unchanged)
 const icc=await safeFetch(SOURCES.ICC_TV_JSON);
 if(icc) out.push(section("ICC TV"),icc);

 out.push(PLAYLIST_FOOTER.trim());

 fs.writeFileSync(OUTPUT_FILE,out.join("\n")+"\n");

 console.log("stream.m3u generated");
}

run();
