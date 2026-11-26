"use strict";

function parseReceipt(text, category = () => "Market") {
 const rows = [], totals = [];
 const normalize = value => value.toLocaleUpperCase("tr-TR").normalize("NFD")
  .replace(/\p{Diacritic}/gu, "").replace(/ı/g, "I");
 let store = "", date = "", pendingName = "";
 for (const line of text.split(/\r?\n/)) {
  const s = line.trim().replace(/[−–]/g, "-").replace(/(\d)\s*([,.])\s*(\d{2})(?!\d)/g, "$1$2$3");
  if (!s) continue;
  const label = normalize(s);
  if (!store) {
   const market = label.match(/^(?:\d{3,}\s+)?(MIGROS JET|MMM MIGROS|MM MIGROS|MIGROS|SOK|BIM|A\s*101|CARREFOUR\s*SA|FILE|HAKMAR|METRO|ONUR|TARIM KREDI)\b/);
   if (market) store = ({MIGROS:"Migros", "MM MIGROS":"Migros", "MMM MIGROS":"Migros", "MIGROS JET":"Migros Jet", "TARIM KREDI":"Tarım Kredi", SOK:"ŞOK", BIM:"BİM", FILE:"FİLE"})[market[1]] || market[1].replace(/\s+/g, "");
  }
  const foundDate = s.match(/^(?:TAR[İI]H\s*[:.]?\s*)?(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s|$)/i);
  if (foundDate) {
   const [, day, month, year] = foundDate;
   const iso = [year, month.padStart(2,"0"), day.padStart(2,"0")].join("-");
   const time = Date.parse(iso);
   if (Number.isFinite(time) && new Date(time).toISOString().slice(0,10) === iso) date ||= iso;
   pendingName = "";
   continue;
  }

  const money = s.match(/^(.*?)\s*[₺*]?\s*(-?\d{1,8}(?:[. ]\d{3})*,\d{2}|-?\d{1,8}\.\d{2})\s*(-)?\s*(?:TL|TRY|₺|[ABCD])?$/i);
  const heading = normalize((money?.[1] ?? s).trim()).replace(/[:*]+$/, "").trim();
  const rank = /^(?:ODENECEK(?:\s+TUTAR)?|GENEL\s+TOPLAM|TOPLAM\s+TUTAR)$/.test(heading) ? 2 :
   /^(?:TOPLAM|TOP|TUTAR)$/.test(heading) ? 1 : 0;
  const discount = /\b(?:INDIRIM\w*|ISKONTO\w*|KAMPANYA\w*|TASARRUF\w*)\b/.test(heading);
  const metadata = /^(?:TOP\s*KDV|KDV|ARA\s+TOPLAM|ARA\s+TOP|NAKIT|KREDI|KART|PARA USTU|POS|BANKA|TARIH|SAAT|FIS|FATURA|BELGE|MERSIS|VKN|TEL|ADRES|Z NO|EKU|TES(E|E)KKUR|SUBE)\b/.test(heading);
  if (rank || metadata) {
   pendingName = "";
   if (!rank) continue;
  }
  if (!money) {
   if (!metadata && !rank && !discount && /\p{L}/u.test(s) && s.length < 70) pendingName = s;
   continue;
  }
  const raw = money[2];
  const cents = Math.round(Number(raw.includes(",") ? raw.replace(/[. ]/g, "").replace(",", ".") : raw) * 100);
  if (rank) {
   if (cents > 0 && !money[3]) totals.push({rank, cents});
   continue;
  }
  if (totals.length) continue;
  let name = money[1].replace(/\s*%\s*\d{1,2}\s*$/, "").trim();
  const quantity = /^(\d+(?:[,.]\d+)?)\s*(?:kg|gr|g|adet)?\s*[x×]\s*$/i.exec(name);
  const unitPrice = /^\d+(?:[,.]\d+)?\s*(?:kg|gr|g|adet)?\s*[x×]\s*\d+[,.]\d{2}\s*$/i.test(s);
  if (unitPrice) {
   if (pendingName && quantity) {
    const extended = Math.round(Number(quantity[1].replace(",", ".")) * cents);
    if (extended > 0) rows.push({name: pendingName, cents: extended, category: category(pendingName), calculated: true});
    pendingName = "";
   }
   continue;
  }
  if (discount || cents < 0 || money[3]) {
   const previous = rows.at(-1);
   const reduction = Math.abs(cents);
   if (previous && previous.cents > reduction) {
    previous.cents -= reduction;
    if (!previous.name.endsWith(" (indirimli)")) previous.name += " (indirimli)";
   } else if (reduction) {
    rows.push({name: "İndirim kontrolü: " + (name || "İndirim"), cents: -reduction, category: "Market"});
   }
   pendingName = "";
   continue;
  }
  name ||= pendingName;
  pendingName = "";
  if (name && cents > 0) {
   const prior = rows.at(-1);
   if (prior?.calculated && prior.name === name) rows.pop();
   rows.push({name, cents, category: category(name)});
  }
 }
 const highest = Math.max(0, ...totals.map(t => t.rank));
 const amounts = new Set(totals.filter(t => t.rank === highest).map(t => t.cents));
 return {
  rows: rows.map(({name, cents, category}) => ({name, amount: cents / 100, category})),
  total: amounts.size === 1 ? amounts.values().next().value / 100 : null,
  store, date
 };
}

if (typeof module !== "undefined") module.exports = {parseReceipt};
