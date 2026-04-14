const axios = require("axios");
const fs = require("fs");

const OUTPUT_FILE = "stream.m3u";

// ================= SOURCES =================
const SOURCES = {
  HOTSTAR_M3U: "https://hotstar.droozy.workers.dev/",
  ZEE5_M3U: "https://zee5.droozy.workers.dev/",
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

// ================= HEADER =================
const PLAYLIST_HEADER = `#EXTM3U\n# ===== CosmicSports Playlist =====`;
const PLAYLIST_FOOTER = `\n# END`;

function section(title) {
  return `\n# === ${title} ===\n`;
}

// ================= HOTSTAR =================
function convertHotstarJson(json){
 if(!Array.isArray(json)) return "";
 return json.map(ch=>{
  if(!ch.m3u8_url) return "";
  return `#EXTINF:-1 tvg-logo="${ch.logo}" group-title="${ch.group}",${(ch.name||"").split(",").pop()}
#EXTVLCOPT:http-user-agent=${ch.user_agent}
#EXTHTTP:${JSON.stringify(ch.headers||{})}
${ch.m3u8_url}`;
 }).join("\n");
}

// ================= ZEE5 =================
function convertZee5Json(json){
 if(!json) return "";
 return Object.values(json).map(ch=>{
  if(!ch.url) return "";
  return `#EXTINF:-1 tvg-logo="${ch.tvg_logo}" group-title="${ch.group_title}",${(ch.channel_name||"").split(",").pop()}
#EXTVLCOPT:http-user-agent=${ch.user_agent}
#EXTHTTP:${JSON.stringify(ch.headers||{})}
${ch.url}`;
 }).join("\n");
}

// ================= JIO =================
function convertJioJson(json){
 if(!json) return "";
 return Object.entries(json).map(([id,ch])=>{
  if(!ch.url) return "";
  return `#EXTINF:-1 tvg-id="${id}" tvg-logo="${ch.tvg_logo}" group-title="JIOTV+ | ${ch.group_title}",${ch.channel_name}
${ch.url}`;
 }).join("\n");
}

// ================= SONY JSON =================
function convertSonyJsonChannels(json){
 if(!json) return "";
 return Object.entries(json).map(([id,ch])=>{
  if(!ch.url) return "";
  return `#EXTINF:-1 tvg-id="${id}" tvg-logo="${ch.tvg_logo||""}" group-title="CS OTT | SONY LIV",${ch.channel_name||id}
${ch.url}`;
 }).join("\n");
}

// ================= SUNXT =================
function convertSunxtJson(json){
 if(!Array.isArray(json)) return "";
 return json.map((ch,i)=>{
  if(!ch.mpd_url) return "";
  return `#EXTINF:-1 tvg-id="${ch.id||i}" tvg-logo="${ch.logo||""}" group-title="CS OTT | SUNXT",${ch.name}
${ch.mpd_url}`;
 }).join("\n");
}

// ================= SPORTS =================
function convertSportsJson(json){
 if(!json?.streams) return "";
 return json.streams.map((s,i)=>{
  if(!s.url) return "";
  return `#EXTINF:-1 tvg-id="${i}" group-title="IPL LIVE",${s.language||"IPL"}
${s.url}`;
 }).join("\n");
}

// ================= SAFE FETCH =================
async function safeFetch(url){
 try{
  const res = await axios.get(url,{timeout:60000});
  return res.data;
 }catch{
  return null;
 }
}

// ================= MAIN =================
async function run(){

 const out=[];
 out.push(PLAYLIST_HEADER);

 // SPORTS
 let sportsCombined=[];
 for(const u of SOURCES.SPORTS_JSON){
  const d=await safeFetch(u);
  if(d?.streams) sportsCombined=sportsCombined.concat(d.streams);
 }
 if(sportsCombined.length){
  out.push(section("IPL"), convertSportsJson({streams:sportsCombined}));
 }

 // HOTSTAR
 const hotstar=await safeFetch(SOURCES.HOTSTAR_M3U);
 if(hotstar) out.push(section("HOTSTAR"), convertHotstarJson(hotstar));

 // ZEE5
 const zee5=await safeFetch(SOURCES.ZEE5_M3U);
 if(zee5) out.push(section("ZEE5"), convertZee5Json(zee5));

 // SONY
 const sony=await safeFetch(SOURCES.SONYLIV_M3U);
 if(sony) out.push(section("SONY"), convertSonyJsonChannels(sony));

 // SUNXT
 const sunxt=await safeFetch(SOURCES.SUNXT_JSON);
 if(sunxt) out.push(section("SUNXT"), convertSunxtJson(sunxt));

 // JIO
 const jio=await safeFetch(SOURCES.JIO_JSON);
 if(jio) out.push(section("JIO"), convertJioJson(jio));

 out.push(PLAYLIST_FOOTER);

 fs.writeFileSync(OUTPUT_FILE,out.join("\n"));
 console.log("DONE");
}

run();
