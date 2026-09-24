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

console.log(`\n${passed} réussi(s), ${failed} échoué(s)`);
process.exit(failed ? 1 : 0);
