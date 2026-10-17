/* ============================================================
   Pujo Path — static reference data (Kolkata, Durga Puja 2026)
   Coordinates were geocoded from OpenStreetMap (Nominatim).
   precision: "exact" = named pandal/park/club in OSM
              "area"  = matched to the street / block it sits on
              "approx"= hand-placed, verify on arrival
   theme: 2026 themes as reported in pre-puja press/guides; null = not confirmed.
   tier: crowd draw (3 = blockbuster, 2 = popular, 1 = neighbourhood/heritage)
   ============================================================ */

window.PUJO = {};

/* Shared TomTom key: when set, every visitor gets live traffic flow + incidents.
   Restrict it to this site's domain in the TomTom dashboard. Free plan: 50,000 tile
   + 2,500 non-tile requests/day; requests over the cap are refused, not billed. */
PUJO.CONFIG = { TOMTOM_KEY: "N7laBtFJwxDkc2ENUI6uReqJKWc9guxb" };

PUJO.CENTER = [22.5626, 88.3630];
PUJO.BOUNDS = [[22.40, 88.22], [22.72, 88.56]];

/* Durga Puja 2026 — Kolkata panjika. Saptami spans two days (17–18 Oct); `to` = last day of a tithi. */
PUJO.DAYS = [
  { key: "mahalaya", date: "2026-10-10", en: "Mahalaya", bn: "মহালয়া", rites: "Devi-paksha begins · Chandipath at dawn" },
  { key: "shashthi", date: "2026-10-16", en: "Maha Shashthi", bn: "মহাষষ্ঠী", rites: "Bodhon, Amantran & Adhibas — the Goddess is unveiled" },
  { key: "saptami", date: "2026-10-17", to: "2026-10-18", en: "Maha Saptami", bn: "মহাসপ্তমী", rites: "Nabapatrika (Kola Bou) snan at dawn · Pran Pratishtha", rites2: "Saptami continues — the tithi spans two days this year" },
  { key: "ashtami", date: "2026-10-19", en: "Maha Ashtami", bn: "মহাঅষ্টমী", rites: "Pushpanjali · Kumari Puja (Belur Math) · Sandhi Puja" },
  { key: "navami", date: "2026-10-20", en: "Maha Navami", bn: "মহানবমী", rites: "Maha Aarti · Bhog · Dhunuchi naach" },
  { key: "dashami", date: "2026-10-21", en: "Bijoya Dashami", bn: "বিজয়া দশমী", rites: "Darpan Bisarjan · Sindoor Khela · Immersion" }
];

PUJO.ZONES = {
  north: { en: "North", bn: "উত্তর", color: "#e8a33d" },
  central: { en: "Central", bn: "মধ্য", color: "#d9534f" },
  south: { en: "South", bn: "দক্ষিণ", color: "#c2185b" },
  behala: { en: "Behala & New Alipore", bn: "বেহালা", color: "#8e44ad" },
  east: { en: "Kasba & Jadavpur belt", bn: "পূর্ব", color: "#16a085" },
  saltlake: { en: "Lake Town · Salt Lake · New Town", bn: "সল্টলেক", color: "#2e86de" },
  howrah: { en: "Howrah", bn: "হাওড়া", color: "#7f8c8d" }
};

PUJO.TYPES = { theme: "Theme pandal", traditional: "Sabeki (traditional)", bonedi: "Bonedi Bari (heritage home)", math: "Math / ashram" };

/* id, English, Bengali, zone, type, tier, [lat,lng], precision, theme2026, note */
PUJO.PUJAS = [
  ["bagbazar", "Bagbazar Sarbojanin", "বাগবাজার সার্বজনীন", "north", "traditional", 3, [22.60470, 88.36613], "exact", null, "One of Kolkata's oldest community pujas (since 1919). Ek-chala sabeki protima and a famous Sindoor Khela on Dashami."],
  ["kumartuli-park", "Kumartuli Park", "কুমোরটুলি পার্ক", "north", "theme", 3, [22.59950, 88.36000], "approx", "The Ganga", "Right by the idol-makers' quarter — walk the Kumartuli lanes before you go."],
  ["kumartuli-sarbojanin", "Kumartuli Sarbojanin", "কুমোরটুলি সার্বজনীন", "north", "traditional", 2, [22.59850, 88.35900], "approx", null, "Classic protima from the artisans' own neighbourhood."],
  ["ahiritola-sarbojanin", "Ahiritola Sarbojanin", "আহিরীটোলা সার্বজনীন", "north", "theme", 2, [22.59537, 88.35542], "area", null, "Riverside north-Kolkata favourite; pairs with Kumartuli on foot."],
  ["ahiritola-jubak", "Ahiritola Jubak Brinda", "আহিরীটোলা যুবকবৃন্দ", "north", "theme", 2, [22.59500, 88.35850], "approx", null, "Known for detailed craft-heavy pandals."],
  ["nalin-sarkar", "Nalin Sarkar Street", "নলিন সরকার স্ট্রিট", "north", "theme", 2, [22.59535, 88.37340], "exact", null, "Lane-pandal tucked off Hatibagan — tight entry, go early."],
  ["hatibagan-sarbojanin", "Hatibagan Sarbojanin", "হাতিবাগান সার্বজনীন", "north", "theme", 3, [22.59496, 88.37093], "area", "Rhythmless, Orderless", "On Bidhan Sarani — expect barricades along the tram road."],
  ["hatibagan-nabin-pally", "Hatibagan Nabin Pally", "হাতিবাগান নবীন পল্লী", "north", "theme", 2, [22.59300, 88.37100], "approx", null, "Award-winning lane puja near Hatibagan market."],
  ["kashi-bose-lane", "Kashi Bose Lane", "কাশী বোস লেন", "north", "theme", 2, [22.59101, 88.36896], "area", null, "Off Bidhan Sarani; known for artistic installations."],
  ["jagat-mukherjee-park", "Jagat Mukherjee Park", "জগৎ মুখার্জি পার্ক", "north", "theme", 2, [22.60131, 88.36665], "exact", null, "Large-format pandals near Shyambazar."],
  ["shobhabazar-rajbari", "Shobhabazar Rajbari", "শোভাবাজার রাজবাড়ি", "north", "bonedi", 2, [22.59683, 88.36719], "exact", null, "Raja Nabakrishna Deb's puja, since 1757. Thakur-dalan, chandmala decor, aristocratic rituals."],
  ["tala-prattoy", "Tala Prattoy", "টালা প্রত্যয়", "north", "theme", 3, [22.61167, 88.38419], "exact", "Biyojon (Detachment)", "101st year. Massive crowds after dusk — Belgachia Metro is closest."],
  ["chaltabagan", "Chaltabagan Lohapatty", "চালতাবাগান লোহাপট্টি", "north", "traditional", 2, [22.58518, 88.37208], "exact", null, "Famous for the grand, ornate ek-chala protima."],
  ["sikdar-bagan", "Sikdar Bagan", "শিকদার বাগান", "north", "theme", 1, [22.59250, 88.37000], "approx", null, "Heritage neighbourhood puja off Bidhan Sarani."],
  ["simla-byayam", "Simla Byayam Samity", "সিমলা ব্যায়াম সমিতি", "north", "traditional", 1, [22.58892, 88.37018], "area", null, "Founded by revolutionaries in 1926; Swami Vivekananda's birthplace is next door."],
  ["chhatubabu-latubabu", "Chhatubabu–Latubabu Bari", "ছাতুবাবু লাটুবাবুর বাড়ি", "north", "bonedi", 1, [22.58845, 88.36591], "area", null, "Ramdulal Sarkar's family puja on Ramdulal Sarkar Street, since 1770."],
  ["dumdum-tarun-sangha", "Dum Dum Park Tarun Sangha", "দমদম পার্ক তরুণ সংঘ", "saltlake", "theme", 3, [22.61500, 88.41300], "approx", "Kolkata's merchant history", "Part of the Dum Dum Park cluster — four big pujas within a 10-min walk."],
  ["dumdum-bharat-chakra", "Dum Dum Park Bharat Chakra", "দমদম পার্ক ভারত চক্র", "saltlake", "theme", 2, [22.61600, 88.41500], "approx", null, "Dum Dum Park cluster."],
  ["dumdum-tarun-dal", "Dum Dum Park Tarun Dal", "দমদম পার্ক তরুণ দল", "saltlake", "theme", 2, [22.61142, 88.41019], "area", null, "Dum Dum Park cluster."],
  ["sreebhumi", "Sreebhumi Sporting Club", "শ্রীভূমি স্পোর্টিং ক্লাব", "saltlake", "theme", 3, [22.60032, 88.40259], "exact", "Hawa Mahal replica", "Kolkata's most crowded pandal. Lake Town traffic is heavily regulated — go after midnight or before noon."],
  ["lake-town-adhibasi", "Lake Town Adhibasi Brinda", "লেক টাউন অধিবাসীবৃন্দ", "saltlake", "theme", 2, [22.60300, 88.40000], "approx", null, "Two minutes from Sreebhumi."],
  ["college-square", "College Square", "কলেজ স্কোয়ার", "central", "traditional", 3, [22.57453, 88.36446], "exact", null, "Idol reflected in the pond with a famous light show. Opposite Coffee House."],
  ["md-ali-park", "Mohammad Ali Park", "মহম্মদ আলি পার্ক", "central", "theme", 3, [22.57724, 88.36074], "exact", null, "Big-budget themes on Chittaranjan Avenue; MG Road Metro."],
  ["santosh-mitra-square", "Santosh Mitra Square (Lebutala)", "সন্তোষ মিত্র স্কোয়ার", "central", "theme", 3, [22.56586, 88.36554], "exact", "Vande Mataram", "Known for spectacular replicas and gold Durga. Sealdah side, very long queues."],
  ["janbazar-rashmoni", "Rani Rashmoni Bari, Janbazar", "রানি রাসমণির বাড়ি", "central", "bonedi", 1, [22.55600, 88.35700], "approx", null, "Family puja of Rani Rashmoni, founder of Dakshineswar temple."],
  ["ekdalia-evergreen", "Ekdalia Evergreen", "একডালিয়া এভারগ্রিন", "south", "theme", 3, [22.52125, 88.36794], "area", "Somnath Temple", "Gariahat cluster — combine with Singhi Park & Hindustan Park."],
  ["singhi-park", "Singhi Park", "সিংহী পার্ক", "south", "theme", 2, [22.52122, 88.36301], "exact", null, "Gariahat cluster, Dover Lane side."],
  ["hindustan-park", "Hindustan Park Sarbojanin", "হিন্দুস্থান পার্ক", "south", "theme", 2, [22.51769, 88.36334], "exact", null, "Gariahat cluster."],
  ["deshapriya-park", "Deshapriya Park", "দেশপ্রিয় পার্ক", "south", "theme", 3, [22.51844, 88.35352], "exact", null, "Rashbehari crossing — Kalighat / Jatin Das Park Metro."],
  ["tridhara", "Tridhara Sammilani", "ত্রিধারা সম্মিলনী", "south", "theme", 3, [22.51958, 88.35535], "exact", null, "Across Rashbehari from Deshapriya Park."],
  ["66-pally", "66 Pally", "৬৬ পল্লী", "south", "theme", 2, [22.51200, 88.35100], "approx", null, "Near Rashbehari; often socially-themed pandals."],
  ["badamtala", "Badamtala Ashar Sangha", "বাদামতলা আষাঢ় সংঘ", "south", "theme", 3, [22.51793, 88.34416], "exact", null, "Kalighat — multiple Asian Paints Sharad Samman wins."],
  ["shiv-mandir", "Shiv Mandir Sarbojanin (Lake Market)", "শিব মন্দির সার্বজনীন", "south", "theme", 2, [22.51800, 88.35120], "approx", null, "Lake Market / Lake Terrace pocket."],
  ["maddox-square", "Maddox Square", "ম্যাডক্স স্কোয়ার", "south", "traditional", 3, [22.52651, 88.35485], "exact", null, "Kolkata's adda capital — sabeki protima, crowds sitting on the lawn till dawn."],
  ["bakulbagan", "Bakulbagan Sarbojanin", "বকুলবাগান সার্বজনীন", "south", "theme", 2, [22.52770, 88.35018], "area", null, "Bhowanipore, near Jatin Das Park Metro."],
  ["ballygunge-cultural", "Ballygunge Cultural Association", "বালিগঞ্জ কালচারাল", "south", "theme", 2, [22.51588, 88.35582], "exact", null, "Lake View Road."],
  ["samaj-sebi", "Samaj Sebi Sangha", "সমাজসেবী সংঘ", "south", "traditional", 2, [22.51435, 88.35585], "area", null, "Lake View Road, strong on tradition and bhog."],
  ["jodhpur-park", "Jodhpur Park Sarbojanin", "যোধপুর পার্ক সার্বজনীন", "east", "theme", 2, [22.50463, 88.36549], "exact", null, "Near South City Mall; easy cab drop."],
  ["selimpur-pally", "Selimpur Pally", "সেলিমপুর পল্লী", "east", "theme", 2, [22.50493, 88.37446], "area", null, "Dhakuria."],
  ["babubagan", "Babubagan Club", "বাবুবাগান ক্লাব", "east", "theme", 2, [22.50793, 88.36864], "area", null, "Dhakuria — combines with Selimpur and Jodhpur Park."],
  ["hindustan-club", "Hindustan Club", "হিন্দুস্থান ক্লাব", "south", "theme", 1, [22.52040, 88.36402], "area", null, "Gariahat pocket."],
  ["chetla-agrani", "Chetla Agrani Club", "চেতলা অগ্রণী", "behala", "theme", 3, [22.51645, 88.33713], "exact", null, "Heavy crowds; Kalighat Metro then a short auto."],
  ["suruchi-sangha", "Suruchi Sangha", "সুরুচি সংঘ", "behala", "theme", 3, [22.50910, 88.33418], "exact", "Utsho (The Source)", "New Alipore Block H — one of the city's most-visited pandals."],
  ["alipore-sarbojanin", "Alipore Sarbojanin", "আলিপুর সার্বজনীন", "behala", "theme", 2, [22.52377, 88.33056], "area", "Ramayana", "81st year."],
  ["mudiali", "Mudiali Club", "মুদিয়ালি ক্লাব", "behala", "theme", 2, [22.51008, 88.34645], "exact", "Folk tales", "Near Kalighat / Tollygunge."],
  ["naktala-udayan", "Naktala Udayan Sangha", "নাকতলা উদয়ন সংঘ", "east", "theme", 3, [22.47449, 88.36657], "exact", null, "Netaji / Gitanjali Metro."],
  ["behala-notun-dal", "Behala Notun Dal", "বেহালা নূতন দল", "behala", "theme", 2, [22.49450, 88.31500], "approx", null, "Behala cluster along Diamond Harbour Road."],
  ["barisha-club", "Barisha Club", "বড়িশা ক্লাব", "behala", "theme", 2, [22.48071, 88.31295], "exact", null, "Behala cluster."],
  ["sahajatri", "Behala Sahajatri", "বেহালা সহযাত্রী", "behala", "theme", 2, [22.48800, 88.31400], "approx", null, "Behala cluster."],
  ["ajeya-sanghati", "Ajeya Sanghati", "অজেয় সংহতি", "behala", "theme", 2, [22.49050, 88.31700], "approx", null, "Behala cluster."],
  ["kasba-bosepukur", "Bosepukur Sitala Mandir", "বোসপুকুর শীতলা মন্দির", "east", "theme", 2, [22.51500, 88.39200], "approx", null, "Kasba cluster — known for craft-material pandals."],
  ["bosepukur-talbagan", "Bosepukur Talbagan", "বোসপুকুর তালবাগান", "east", "theme", 2, [22.51300, 88.39300], "approx", null, "Kasba cluster."],
  ["rajdanga-naba-uday", "Rajdanga Naba Uday Sangha", "রাজডাঙা নব উদয় সংঘ", "east", "theme", 2, [22.51432, 88.39264], "area", null, "Kasba cluster, off EM Bypass."],
  ["fd-block", "FD Block Salt Lake", "এফডি ব্লক", "saltlake", "theme", 2, [22.57925, 88.41413], "area", null, "Salt Lake's grandest; long lines after 7 pm."],
  ["ae-block", "AE Block Salt Lake", "এই ব্লক", "saltlake", "theme", 1, [22.59983, 88.41224], "area", null, "Sector I."],
  ["bj-block", "BJ Block Salt Lake", "বিজে ব্লক", "saltlake", "theme", 2, [22.59022, 88.42675], "area", null, "Sector II."],
  ["newtown-sarbojanin", "New Town Sarbojanin", "নিউটাউন সার্বজনীন", "saltlake", "theme", 1, [22.57885, 88.47166], "area", "Padma-Bhushan", "Action Area I."],
  ["belur-math", "Belur Math", "বেলুড় মঠ", "howrah", "math", 3, [22.63261, 88.35599], "exact", null, "Ramakrishna Mission HQ. Kumari Puja on Ashtami morning draws huge crowds; ferry from Bagbazar ghat."]
].map(function (r) {
  return { id: r[0], name: r[1], bn: r[2], zone: r[3], type: r[4], tier: r[5], ll: r[6], precision: r[7], theme: r[8], note: r[9] };
});

/* Pre-built circuits. mode: foot | car */
PUJO.CIRCUITS = [
  {
    id: "north-heritage", name: "Uttar Kolkata Heritage Walk", bn: "উত্তরের ঐতিহ্য", mode: "foot", hours: "4–5 h",
    start: "Shobhabazar Sutanuti Metro", color: "#e8a33d",
    blurb: "Artisans' lanes of Kumartuli, a 1757 Rajbari and the lane-pandals of Hatibagan — the soul of the city's Pujo.",
    stops: ["bagbazar", "jagat-mukherjee-park", "kumartuli-park", "kumartuli-sarbojanin", "ahiritola-jubak", "ahiritola-sarbojanin", "shobhabazar-rajbari", "kashi-bose-lane", "sikdar-bagan", "hatibagan-sarbojanin", "nalin-sarkar"]
  },
  {
    id: "central-classics", name: "Central Classics", bn: "মধ্য কলকাতা", mode: "foot", hours: "2–3 h",
    start: "MG Road Metro", color: "#d9534f",
    blurb: "Md Ali Park's theme, College Square's lake-lit protima and Lebutala's spectacle — then Coffee House.",
    stops: ["md-ali-park", "college-square", "santosh-mitra-square", "janbazar-rashmoni"]
  },
  {
    id: "south-gariahat", name: "Rashbehari–Gariahat Loop", bn: "দক্ষিণের রাউন্ড", mode: "foot", hours: "4–6 h",
    start: "Kalighat Metro", color: "#c2185b",
    blurb: "The densest cluster in the city: Badamtala to Ekdalia, ending with adda at Maddox Square.",
    stops: ["badamtala", "66-pally", "deshapriya-park", "tridhara", "shiv-mandir", "ballygunge-cultural", "samaj-sebi", "hindustan-park", "singhi-park", "ekdalia-evergreen", "hindustan-club", "maddox-square"]
  },
  {
    id: "behala-alipore", name: "New Alipore & Behala by Cab", bn: "বেহালা অভিযান", mode: "car", hours: "3–4 h",
    start: "Kalighat / Tollygunge", color: "#8e44ad",
    blurb: "Big-ticket theme pandals of Chetla, Suruchi and the Diamond Harbour Road strip.",
    stops: ["chetla-agrani", "alipore-sarbojanin", "mudiali", "suruchi-sangha", "ajeya-sanghati", "sahajatri", "behala-notun-dal", "barisha-club"]
  },
  {
    id: "east-kasba", name: "Kasba–Dhakuria Craft Trail", bn: "কসবা-ঢাকুরিয়া", mode: "car", hours: "2–3 h",
    start: "Gariahat / Ruby", color: "#16a085",
    blurb: "Craft-material pandals of Bosepukur and the Dhakuria trio.",
    stops: ["jodhpur-park", "babubagan", "selimpur-pally", "rajdanga-naba-uday", "kasba-bosepukur", "bosepukur-talbagan"]
  },
  {
    id: "lake-town-saltlake", name: "Lake Town · Dum Dum · Salt Lake", bn: "উত্তর-পূর্ব", mode: "car", hours: "3–5 h",
    start: "Dum Dum / Ultadanga", color: "#2e86de",
    blurb: "Sreebhumi's mega-pandal, the four-in-one Dum Dum Park cluster and Salt Lake's blocks.",
    stops: ["tala-prattoy", "dumdum-tarun-dal", "dumdum-tarun-sangha", "dumdum-bharat-chakra", "lake-town-adhibasi", "sreebhumi", "ae-block", "bj-block", "fd-block"]
  },
  {
    id: "bonedi", name: "Bonedi Bari Trail", bn: "বনেদি বাড়ির পুজো", mode: "car", hours: "3 h",
    start: "Shobhabazar", color: "#b8860b",
    blurb: "Centuries-old family pujas in thakur-dalans, ending across the river at Belur Math.",
    stops: ["janbazar-rashmoni", "chhatubabu-latubabu", "shobhabazar-rajbari", "bagbazar", "belur-math"]
  }
];

/* Emergency numbers (India / West Bengal / Kolkata Police) */
PUJO.EMERGENCY = [
  { label: "National Emergency", num: "112", icon: "🆘", primary: true },
  { label: "Police", num: "100", icon: "🚓" },
  { label: "Ambulance", num: "102", icon: "🚑" },
  { label: "Fire", num: "101", icon: "🚒" },
  { label: "Women Helpline", num: "1091", icon: "🛡️" },
  { label: "Child Helpline", num: "1098", icon: "🧒" },
  { label: "Kolkata Traffic Police", num: "1073", icon: "🚦" },
  { label: "Lalbazar Control Room", num: "03322143024", display: "033-2214-3024", icon: "📞" }
];

/* Puja-time traffic advisory zones. These follow the pattern Kolkata Police
   enforces every year (no-parking / one-way / no-entry for goods vehicles around
   blockbuster pandals). Shown as advisory — live closures come from TomTom. */
PUJO.ADVISORIES = [
  { name: "Lake Town – VIP Road (Sreebhumi)", ll: [22.6015, 88.4035], r: 900, level: "high", text: "Heavy regulation on Lake Town Link Rd & VIP Rd service lanes; frequent diversions after 6 pm. No parking near Sreebhumi." },
  { name: "Bidhan Sarani (Hatibagan–Shyambazar)", ll: [22.5960, 88.3705], r: 700, level: "high", text: "Bidhan Sarani one-way/no-entry windows in the evening; walk from Shyambazar or Girish Park Metro." },
  { name: "Rashbehari Ave – Deshapriya Park", ll: [22.5185, 88.3540], r: 650, level: "high", text: "Rashbehari crossing slows to a crawl; vehicles diverted around Sarat Bose Rd." },
  { name: "Gariahat – Ekdalia Road", ll: [22.5195, 88.3670], r: 600, level: "medium", text: "Ekdalia & Dover Lane pockets closed to cars in peak hours." },
  { name: "College Street – MG Road", ll: [22.5755, 88.3630], r: 600, level: "medium", text: "Chittaranjan Ave and College St congested; parking restricted." },
  { name: "Sealdah – Santosh Mitra Square", ll: [22.5660, 88.3655], r: 550, level: "high", text: "Lebutala lanes closed to vehicles; queue control near Sealdah." },
  { name: "New Alipore Block H – Chetla", ll: [22.5125, 88.3355], r: 800, level: "high", text: "Suruchi & Chetla: barricaded queues, auto/cab drops only at designated points." },
  { name: "Dum Dum Park – Jessore Rd", ll: [22.6135, 88.4120], r: 650, level: "medium", text: "Lanes inside Dum Dum Park closed to cars in evenings." },
  { name: "Tala – Belgachia", ll: [22.6110, 88.3830], r: 550, level: "medium", text: "Tala Prattoy queues spill onto Belgachia Rd; walk from Belgachia Metro." }
];

PUJO.LINKS = {
  traffic: "https://www.facebook.com/KolkataTrafficPolice",
  trafficX: "https://x.com/KolkataPolice",
  metro: "https://mtp.indianrailways.gov.in/",
  gmapsTraffic: "https://www.google.com/maps/@22.5626,88.3630,13z/data=!5m1!1e1"
};
/* Kolkata Metro stations — OpenStreetMap export (Overpass), Oct 2026 */
PUJO.METRO = [["Central", 22.57249, 88.35874], ["Park Street", 22.55516, 88.35012], ["Kavi Nazrul", 22.46425, 88.38046], ["Shahid Khudiram", 22.46598, 88.39154], ["Kavi Subhash (Blue Line)", 22.47217, 88.39796], ["Netaji", 22.48099, 88.346], ["Mahanayak Uttam Kumar", 22.49477, 88.34509], ["Dum Dum", 22.62111, 88.3929], ["Rabindra Sarobar", 22.50722, 88.34549], ["Kalighat", 22.51688, 88.34584], ["Jatin Das Park", 22.52415, 88.34647], ["Netaji Bhavan", 22.53318, 88.34593], ["Rabindra Sadan", 22.54149, 88.34735], ["Maidan", 22.54947, 88.34879], ["Chandni Chowk", 22.56701, 88.35416], ["Esplanade (Line 1)", 22.56361, 88.35121], ["Mahatma Gandhi Road", 22.58092, 88.36133], ["Girish Park", 22.58714, 88.36294], ["Shobhabazar Sutanuti", 22.59588, 88.3652], ["Shyambazar", 22.60133, 88.3725], ["Belgachia", 22.60592, 88.38639], ["Noapara", 22.63984, 88.39413], ["Nalban", 22.57334, 88.42122], ["Karunamoyee", 22.58638, 88.42153], ["Central Park", 22.59047, 88.41562], ["City Centre", 22.5871, 88.40789], ["Bengal Chemical", 22.58007, 88.4013], ["Salt Lake Stadium", 22.57311, 88.40309], ["Phoolbagan", 22.57213, 88.39024], ["Salt Lake Sector V", 22.58094, 88.42909], ["Baranagar", 22.65308, 88.3806], ["Behala Bazar", 22.49876, 88.31739], ["Behala Chowrasta", 22.48735, 88.31338], ["Sealdah", 22.56661, 88.36978], ["Dakshineshwar", 22.65403, 88.36375], ["Thakurpukur", 22.46437, 88.30753], ["Sakher Bazar", 22.47485, 88.30996], ["Taratala", 22.50769, 88.32038], ["Joka", 22.45235, 88.30182], ["Hemanta Mukhopadhyay", 22.51485, 88.40143], ["Kavi Sukanta", 22.5053, 88.401], ["Jyotirindra Nandi", 22.49563, 88.39845], ["Satyajit Ray", 22.48468, 88.39264], ["Mahakaran", 22.57208, 88.35053], ["Howrah", 22.58336, 88.34035], ["Howrah Maidan", 22.58386, 88.334], ["Majerhat", 22.51915, 88.32366], ["Esplanade (Line 2)", 22.56413, 88.35028], ["Kavi Subhash", 22.47111, 88.3981], ["Beleghata", 22.55071, 88.40399], ["Barun Sengupta", 22.54381, 88.39928], ["Ritwik Ghatak", 22.533, 88.39642], ["VIP Bazar", 22.52468, 88.39623], ["Jai Hind", 22.64731, 88.4373], ["Jessore Road", 22.63926, 88.42977], ["Dum Dum Cantonment", 22.63759, 88.41216]];
