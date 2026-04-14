const axios = require("axios");
const fs = require("fs");

const OUTPUT_FILE = "stream.m3u";

// ================= SOURCES =================
const SOURCES = {
  HOTSTAR_M3U: "https://hotstar.droozy.workers.dev/",
  ZEE5_M3U: "https://zee5.droozy.workers.dev",
  JIO_JSON: "https://raw.githubusercontent.com/cybersterr/jeeyo/main/stream.json",
  SONYLIV_JSON: "https://raw.githubusercontent.com/drmlive/sliv-live-events/main/sonyliv.json",
  FANCODE_JSON: "https://fanco.vodep39240327.workers.dev/",
  ICC_TV_JSON: "https://icc.vodep39240327.workers.dev/icctv.jso",

  SPORTS_JSON: [
    "https://sports.vodep39240327.workers.dev/sports111.json",
    "https://gentle-moon-6383.lrl45.workers.dev/stream.json"
  ],

  SONYLIV_M3U: "https://raw.githubusercontent.com/cybersterr/Sony/main/stream.json",
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

// ================= HOTSTAR =================
function convertHotstarJson(json){
 if(!Array.isArray(json)) return "";

 const out=[];
 json.forEach((ch)=>{
  if(!ch.m3u8_url) return;

  out.push(`#EXTINF:-1 tvg-logo="${ch.logo}" group-title="${ch.group}",${(ch.name || "").split(",").pop()}`);
  out.push(`#EXTVLCOPT:http-user-agent=${ch.user_agent}`);
  out.push(`#EXTHTTP:${JSON.stringify(ch.headers || {})}`);
  out.push(ch.m3u8_url);
 });

 return out.join("\n");
}

// ================= ZEE5 =================
function convertZee5Json(json){
 if(!json || typeof json !== "object") return "";

 const out=[];
 for(const id in json){
  const ch = json[id];
  if(!ch.url) continue;

  out.push(`#EXTINF:-1 tvg-logo="${ch.tvg_logo}" group-title="${ch.group_title}",${(ch.channel_name || "").split(",").pop()}`);
  out.push(`#EXTVLCOPT:http-user-agent=${ch.user_agent}`);
  out.push(`#EXTHTTP:${JSON.stringify(ch.headers || {})}`);
  out.push(ch.url);
 }

 return out.join("\n");
}

// ================= SPORTS (RESTORED ONLY) =================
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

  out.push(`#EXTINF:-1 tvg-id="${1100+i}" tvg-logo="https://i.ibb.co/9HfRQcP2/unnamed-removebg-preview.png" group-title="IPL LIVE",${s.language || "IPL Live"}`);
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

 // HOTSTAR
 const hotstar=await safeFetch(SOURCES.HOTSTAR_M3U);
 if(hotstar) out.push(section("CS OTT | Jio Cinema"),convertHotstarJson(hotstar));

 // ZEE5
 const zee5=await safeFetch(SOURCES.ZEE5_M3U);
 if(zee5) out.push(section("CS OTT | ZEE5"),convertZee5Json(zee5));

 const digital = await safeFetch(SOURCES.SONYLIV_M3U);
 if(digital){
  out.push(section("CS OTT | SONY LIV"), convertSonyJsonChannels(digital));
 }

 const sunxt = await safeFetch(SOURCES.SUNXT_JSON);
 if(sunxt){
  out.push(section("CS OTT | SUNXT"), convertSunxtJson(sunxt));
 }

 const jio=await safeFetch(SOURCES.JIO_JSON);
 if(jio) out.push(section("JioTv+"),convertJioJson(jio));

 const sony=await safeFetch(SOURCES.SONYLIV_JSON);
 if(sony) out.push(section("SonyLiv | Live Events"),convertSony(sony));

 const icc=await safeFetch(SOURCES.ICC_TV_JSON);
 if(icc) out.push(section("ICC TV"),icc);

 out.push(PLAYLIST_FOOTER.trim());

 fs.writeFileSync(OUTPUT_FILE,out.join("\n")+"\n");

 console.log("stream.m3u generated");
}

run();
