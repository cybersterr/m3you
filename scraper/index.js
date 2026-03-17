const axios = require("axios");
const fs = require("fs");

const OUTPUT_FILE = "stream.m3u";

// ================= SOURCES =================
const SOURCES = {
  HOTSTAR_M3U: "https://voot.vodep39240327.workers.dev?voot.m3u",
  ZEE5_M3U: "https://join-vaathala1-for-more.vodep39240327.workers.dev/zee5.m3u",
  JIO_JSON: "https://raw.githubusercontent.com/vaathala00/jow/main/output.json",
  SONYLIV_JSON: "https://raw.githubusercontent.com/drmlive/sliv-live-events/main/sonyliv.json",
  FANCODE_JSON: "https://fanco.vodep39240327.workers.dev/",
  ICC_TV_JSON: "https://icc.vodep39240327.workers.dev/icctv.jso",
  SPORTS_JSON: "https://sports.vodep39240327.workers.dev/sports.json",
  SONGHAR_SONYLIV: "https://raw.githubusercontent.com/Sflex0719/SonGharLive/main/SL.m3u",

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

const PLAYLIST_FOOTER = `
# =========================================
# This m3u link is only for educational purposes
# =========================================
`;

function section(title) {
  return `\n# ---------------=== ${title} ===-------------------\n`;
}

// ================= LOCAL TELUGU =================
function convertLocalTelugu(jsonArray) {
  if (!Array.isArray(jsonArray)) return "";
  const out=[];
  jsonArray.forEach(ch=>{
    if(!ch.stream_url) return;
    out.push(`#EXTINF:-1 tvg-name="${ch.title}" tvg-logo="${ch.image}" group-title="CS 📺 | Local Channel Telugu",${ch.title}`);
    out.push(ch.stream_url);
  });
  return out.join("\n");
}

// ================= LOCAL TAMIL =================
function convertLocalTamil(jsonArray) {
  if (!Array.isArray(jsonArray)) return "";
  const out=[];
  jsonArray.forEach(ch=>{
    if(!ch.stream_url) return;
    out.push(`#EXTINF:-1 tvg-name="${ch.title}" tvg-logo="${ch.image}" group-title="CS 📺 | Local Channel Tamil",${ch.title}`);
    out.push(ch.stream_url);
  });
  return out.join("\n");
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

// ================= FANCODE =================
function convertFan(json){
 if(!json.matches) return "";
 return json.matches.filter(m=>m.status==="LIVE").map(m=>{
  const url=m.adfree_url||m.dai_url;
  if(!url) return null;
  return `#EXTINF:-1 tvg-logo="${m.src}" group-title="FanCode | Sports",${m.match_name}\n${url}`;
 }).filter(Boolean).join("\n");
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

  out.push(`#EXTINF:-1 tvg-id="${1100+i}" tvg-logo="https://img.u0k.workers.dev/CosmicSports.webp" group-title="MATCHES",${s.language}`);
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

 // LOCAL TELUGU
 let telugu=[];
 for(const u of SOURCES.TELUGU_JSON){
  const d=await safeFetch(u);
  if(Array.isArray(d)) telugu=telugu.concat(d);
 }
 if(telugu.length) out.push(section("CS 📺 | Local Channel Telugu"),convertLocalTelugu(telugu));

 // LOCAL TAMIL
 let tamil=[];
 for(const u of SOURCES.LOCAL_JSON){
  const d=await safeFetch(u);
  if(Array.isArray(d)) tamil=tamil.concat(d);
 }
 if(tamil.length) out.push(section("CS 📺 | Local Channel Tamil"),convertLocalTamil(tamil));

 // HOTSTAR
 const hotstar=await safeFetch(SOURCES.HOTSTAR_M3U);
 if(hotstar) out.push(section("CS OTT | Jio Cinema"),hotstar);

 // ZEE5
 const zee5=await safeFetch(SOURCES.ZEE5_M3U);
 if(zee5) out.push(section("CS OTT | ZEE5"),zee5);

 // JIO
 const jio=await safeFetch(SOURCES.JIO_JSON);
 if(jio) out.push(section("Jiotv+"),convertJioJson(jio));

 // MATCHES
 const sports=await safeFetch(SOURCES.SPORTS_JSON);
 if(sports) out.push(section("Cricket | Live"),convertSportsJson(sports));

 // SONYLIV EVENTS
 const sony=await safeFetch(SOURCES.SONYLIV_JSON);
 if(sony) out.push(section("SonyLiv | Sports"),convertSony(sony));

 // FANCODE
 const fan=await safeFetch(SOURCES.FANCODE_JSON);
 if(fan) out.push(section("FanCode | Sports"),convertFan(fan));

 // ICC
 const icc=await safeFetch(SOURCES.ICC_TV_JSON);
 if(icc) out.push(section("ICC TV"),icc);

 // SONYLIV DIGITAL (FORCE SINGLE FOLDER)
 const digital=await safeFetch(SOURCES.SONGHAR_SONYLIV);
 if(digital){
  const fixed=digital.split("\n").map(l=>{
    if(l.startsWith("#EXTINF")){
      return l.replace(/group-title="[^"]*"/,'group-title="CS OTT | SONY LIV"');
    }
    return l;
  }).join("\n");

  out.push(section("CS OTT | Sony Liv"),fixed);
 }

 out.push(PLAYLIST_FOOTER.trim());

 fs.writeFileSync(OUTPUT_FILE,out.join("\n")+"\n");

 console.log("stream.m3u generated");
}

run();
