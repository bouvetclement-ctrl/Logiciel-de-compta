/**
 * Script Google Apps Script de sauvegarde pour « Comptes de la famille ».
 *
 * Installation (une seule fois) :
 *  1. https://script.google.com → Nouveau projet → collez ce fichier à la place du contenu.
 *  2. Paramètres du projet (roue dentée) → Propriétés du script → Ajouter :
 *       TOKEN = une longue phrase secrète (ex. générée par un gestionnaire de mots de passe)
 *  3. Déployer → Nouveau déploiement → type « Application Web »
 *       Exécuter en tant que : Moi · Qui a accès : Tout le monde
 *  4. Copiez l'URL qui se termine par /exec dans l'application, avec le même code secret.
 *
 * Sans propriété TOKEN, le script accepte toutes les requêtes (ancien comportement) :
 * toute personne connaissant l'URL pourrait alors lire vos opérations.
 */
const FILE_NAME = "comptes-famille.json";

function isAuthorized_(e) {
  const expected = PropertiesService.getScriptProperties().getProperty("TOKEN");
  if (!expected) return true;
  return !!(e && e.parameter && e.parameter.token === expected);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getFile_() {
  const files = DriveApp.getFilesByName(FILE_NAME);
  return files.hasNext() ? files.next() : null;
}

function doGet(e) {
  if (!isAuthorized_(e)) return json_({ error: "unauthorized" });
  const file = getFile_();
  if (!file) return json_({});
  return ContentService.createTextOutput(file.getBlob().getDataAsString())
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (!isAuthorized_(e)) return json_({ error: "unauthorized" });
  const body = e.postData && e.postData.contents;
  try {
    const data = JSON.parse(body);
    if (!data || typeof data !== "object") throw new Error("format");
  } catch (err) {
    return json_({ error: "invalid_json" });
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const file = getFile_();
    if (file) file.setContent(body);
    else DriveApp.createFile(FILE_NAME, body, MimeType.PLAIN_TEXT);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}
