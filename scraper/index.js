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
    "https://pasteking.u0k.workers.dev/9ecgk.json"
  ],

  SONYLIV_M3U: "https://raw.githubusercontent.com/cybersterr/Sony/main/stream.json",
  SUNXT_JSON: "https://netx.streamstar18.workers.dev/sun",
  NEW_M3U: "https://vt-ip.vodep39240327.workers.dev/playlist.m3u8?url=http://jiotv.be/stalker_portal/c&mac=00:1A:79:97:55:B9&deviceId1=B8F453DCDAEE02318C9FA912D9E409EE96B75AE592A70B526AA84478533C0A66&deviceId2=B8F453DCDAEE02318C9FA912D9E409EE96B75AE592A70B526AA84478533C0A66&sn=500482917046B",
};

// ================= HEADER =================
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

function section(title){
 return `\n# ---------------=== ${title} ===-------------------\n`;
}

// ================= SPORTS =================
function convertSportsJson(json){
 const out=[];

 // STREAM FORMAT
 if(json && Array.isArray(json.streams)){
  json.streams.forEach((s,i)=>{
   if(!s.url) return;

   const urlObj=new URL(s.url);
   const drm=urlObj.searchParams.get("drmLicense")||"";
   const[kid,key]=drm.split(":");
   const ua=urlObj.searchParams.get("User-Agent")||"";
   const hdnea=urlObj.searchParams.get("__hdnea__")||"";

   urlObj.searchParams.delete("drmLicense");
   urlObj.searchParams.delete("User-Agent");

   ["TATA IPL |Afternoon ⚡","TATA IPL |Night ⚡"].forEach(group=>{
    out.push(`#EXTINF:-1 tvg-id="${1100+i}" tvg-logo="https://img.u0k.workers.dev/CosmicSports.webp" group-title="${group}",${s.language||"IPL Live"}`);
    out.push(`#KODIPROP:inputstream.adaptive.license_type=clearkey`);
    out.push(`#KODIPROP:inputstream.adaptive.license_key=${kid}:${key}`);
    out.push(`#EXTHTTP:${JSON.stringify({Cookie:hdnea?`__hdnea__=${hdnea}`:"","User-Agent":ua})}`);
    out.push(urlObj.toString());
   });
  });
 }

 // PASTEKING JSON
 if(json && typeof json==="object"){
  const groups=["TATA IPL |Afternoon ⚡","TATA IPL |Night ⚡"];

  groups.forEach(srcGroup=>{
   if(json[srcGroup]?.channels){
    json[srcGroup].channels.forEach(ch=>{
     if(!ch.url) return;

     groups.forEach(targetGroup=>{
      out.push(`#EXTINF:-1 tvg-id="${ch.tvg_id}" tvg-logo="${ch.logo}" group-title="${targetGroup}",${ch.name}`);
      out.push(ch.url);
     });
    });
   }
  });
 }

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

 // IPL FIXED
 let sportsOutput=[];
 for(const u of SOURCES.SPORTS_JSON){
  const d=await safeFetch(u);
  if(!d) continue;

  const converted=convertSportsJson(d);
  if(converted) sportsOutput.push(converted);
 }

 if(sportsOutput.length){
  out.push(section("IPL 2026 | LIVE"), sportsOutput.join("\n"));
 }

 // ===== REST UNTOUCHED =====
 const hotstar=await safeFetch(SOURCES.HOTSTAR_M3U);
 if(hotstar) out.push(section("CS OTT | Jio Cinema"),hotstar);

 const zee5=await safeFetch(SOURCES.ZEE5_M3U);
 if(zee5) out.push(section("CS OTT | ZEE5"),zee5);

 const digital=await safeFetch(SOURCES.SONYLIV_M3U);
 if(digital){
  out.push(section("CS OTT | SONY LIV"), convertSonyJsonChannels(digital));
 }

 const sunxt=await safeFetch(SOURCES.SUNXT_JSON);
 if(sunxt){
  out.push(section("CS OTT | SUNXT"), convertSunxtJson(sunxt));
 }

 const jio=await safeFetch(SOURCES.JIO_JSON);
 if(jio) out.push(section("JioTv+"),convertJioJson(jio));

 const fan=await safeFetch(SOURCES.FANCODE_JSON);
 if(fan) out.push(section("FanCode | Live Events"),fan);

 const sony=await safeFetch(SOURCES.SONYLIV_JSON);
 if(sony) out.push(section("SonyLiv | Live Events"),convertSony(sony));

 const icc=await safeFetch(SOURCES.ICC_TV_JSON);
 if(icc) out.push(section("ICC TV"),icc);

 out.push(PLAYLIST_FOOTER.trim());

 fs.writeFileSync(OUTPUT_FILE,out.join("\n")+"\n");
 console.log("stream.m3u generated");
}

run();
