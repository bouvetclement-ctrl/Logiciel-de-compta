/* Tests des fonctions utilitaires de index.html (bloc <script id="pure-utils">).
   Lancer avec : node tests/run-tests.js   (aucune dépendance à installer) */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const block = html.match(/<script id="pure-utils">([\s\S]*?)<\/script>/);
if(!block) throw new Error("Bloc <script id=\"pure-utils\"> introuvable dans index.html");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(block[1], ctx);

let passed = 0, failed = 0;
function test(name, fn){
  try{ fn(); passed++; console.log("  ✓ " + name); }
  catch(e){ failed++; console.log("  ✗ " + name + "\n      " + e.message); }
}

console.log("parseFrenchNumber");
test("format français", ()=>{
  assert.strictEqual(ctx.parseFrenchNumber("1 234,56"), 1234.56);
  assert.strictEqual(ctx.parseFrenchNumber("1 234,56 €"), 1234.56);
  assert.strictEqual(ctx.parseFrenchNumber("1.234,56"), 1234.56);
  assert.strictEqual(ctx.parseFrenchNumber("-12,50"), -12.5);
});
test("format anglais", ()=>{
  assert.strictEqual(ctx.parseFrenchNumber("1,234.56"), 1234.56);
  assert.strictEqual(ctx.parseFrenchNumber("12.50"), 12.5);
  assert.strictEqual(ctx.parseFrenchNumber("0.125"), 0.125);
});
test("points de milliers seuls", ()=>{
  assert.strictEqual(ctx.parseFrenchNumber("1.234"), 1234);
  assert.strictEqual(ctx.parseFrenchNumber("12.345.678"), 12345678);
});
test("signe moins final et parenthèses", ()=>{
  assert.strictEqual(ctx.parseFrenchNumber("12,50-"), -12.5);
  assert.strictEqual(ctx.parseFrenchNumber("(12,50)"), -12.5);
  assert.strictEqual(ctx.parseFrenchNumber("+3,00"), 3);
});
test("valeurs illisibles → NaN", ()=>{
  for(const v of ["", "abc", "12abc", "1,2,3x", null, undefined, "--"]) assert.ok(Number.isNaN(ctx.parseFrenchNumber(v)), String(v));
});

console.log("parseFlexDate");
test("formats reconnus", ()=>{
  assert.strictEqual(ctx.parseFlexDate("2026-09-24"), "2026-09-24");
  assert.strictEqual(ctx.parseFlexDate("24/09/2026"), "2026-09-24");
  assert.strictEqual(ctx.parseFlexDate("4.9.2026"), "2026-09-04");
  assert.strictEqual(ctx.parseFlexDate("24/09/26"), "2026-09-24");
  assert.strictEqual(ctx.parseFlexDate("2026-9-4"), "2026-09-04");
});
test("dates invalides → chaîne vide", ()=>{
  for(const v of ["", "hier", "31/02/2026", "2026-13-01", "Solde au", null]) assert.strictEqual(ctx.parseFlexDate(v), "", String(v));
});

console.log("dates locales / périodes");
test("localMonthStr n'utilise pas l'UTC", ()=>{
  // 1er août 2026 à 00:30 heure locale : doit rester en août quel que soit le fuseau.
  assert.strictEqual(ctx.localMonthStr(new Date(2026, 7, 1, 0, 30)), "2026-08");
  assert.strictEqual(ctx.localDateStr(new Date(2026, 0, 5)), "2026-01-05");
});
test("semaines calées sur le lundi", ()=>{
  assert.strictEqual(ctx.periodKey("2026-09-21", "week"), "2026-09-21"); // lundi
  assert.strictEqual(ctx.periodKey("2026-09-27", "week"), "2026-09-21"); // dimanche
  assert.strictEqual(ctx.periodKey("2026-09-28", "week"), "2026-09-28");
  assert.strictEqual(ctx.periodKey("2026-09-24", "month"), "2026-09");
});
test("daysBetween", ()=>{
  assert.strictEqual(ctx.daysBetween("2026-03-28", "2026-03-30"), 2); // passage à l'heure d'été
  assert.strictEqual(ctx.daysBetween("x", "2026-03-30"), Infinity);
});

console.log("sécurité");
test("escapeHtml", ()=>{
  assert.strictEqual(ctx.escapeHtml(`<img src=x onerror="a('b')">&`), "&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;");
  assert.strictEqual(ctx.escapeHtml(null), "");
});
test("isSafeId", ()=>{
  assert.ok(ctx.isSafeId(ctx.uid()));
  assert.ok(!ctx.isSafeId("a');alert(1);('"));
  assert.ok(!ctx.isSafeId(""));
  assert.ok(!ctx.isSafeId(42));
});
test("csvCell", ()=>{
  assert.strictEqual(ctx.csvCell("simple"), "simple");
  assert.strictEqual(ctx.csvCell('a;b "c"'), '"a;b ""c"""');
});

console.log("import OFX / QIF");
test("OFX v1 (SGML sans balises fermantes)", ()=>{
  const ofx = `OFXHEADER:100
DATA:OFXSGML
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260921
<TRNAMT>-42,90
<FITID>123
<NAME>CB CARREFOUR
<MEMO>PARIS 15
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260925120000[+2:CEST]
<TRNAMT>2500.00
<NAME>VIR SALAIRE &amp; PRIME
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
  assert.ok(ctx.looksLikeOfx(ofx));
  const rows = ctx.parseOfx(ofx);
  assert.strictEqual(rows.length, 2);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(rows[0])), { date:"2026-09-21", label:"CB CARREFOUR PARIS 15", amount:"-42,90" });
  assert.strictEqual(rows[1].date, "2026-09-25");
  assert.strictEqual(rows[1].label, "VIR SALAIRE & PRIME");
  assert.strictEqual(ctx.parseFrenchNumber(rows[1].amount), 2500);
});
test("OFX v2 (XML)", ()=>{
  const ofx = `<?xml version="1.0"?><OFX><STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260102</DTPOSTED><TRNAMT>-5.5</TRNAMT><NAME>BOULANGERIE</NAME><MEMO>BOULANGERIE</MEMO></STMTTRN></OFX>`;
  const rows = ctx.parseOfx(ofx);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].label, "BOULANGERIE");
  assert.strictEqual(rows[0].date, "2026-01-02");
});
test("QIF jour/mois (français)", ()=>{
  const qif = "!Type:Bank\nD24/09/2026\nT-1 234,56\nPLOYER\nMseptembre\n^\nD01/10/26\nT15.00\nPREMBOURSEMENT\n^\n";
  assert.ok(ctx.looksLikeQif(qif));
  const rows = ctx.parseQif(qif);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].date, "2026-09-24");
  assert.strictEqual(rows[0].label, "LOYER septembre");
  assert.strictEqual(ctx.parseFrenchNumber(rows[0].amount), -1234.56);
  assert.strictEqual(rows[1].date, "2026-10-01");
});
test("QIF mois/jour (américain) détecté", ()=>{
  const rows = ctx.parseQif("!Type:Bank\nD09/24'2026\nT-10\nPA\n^\nD10/01/2026\nT-3\nPB\n^");
  assert.strictEqual(rows[0].date, "2026-09-24");
  assert.strictEqual(rows[1].date, "2026-10-01");
});
test("un CSV n'est ni OFX ni QIF", ()=>{
  const csv = "Date;Libellé;Montant\n24/09/2026;CAFE;-2";
  assert.ok(!ctx.looksLikeOfx(csv) && !ctx.looksLikeQif(csv));
});

console.log(`\n${passed} réussi(s), ${failed} échoué(s)`);
process.exit(failed ? 1 : 0);
