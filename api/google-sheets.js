const crypto = require("crypto");

const tokenEndpoint = "https://oauth2.googleapis.com/token";
const sheetsBaseUrl = "https://sheets.googleapis.com/v4/spreadsheets";
const spreadsheetScope = "https://www.googleapis.com/auth/spreadsheets";
const tokenCache = {
  accessToken: "",
  expiresAt: 0,
};

class SheetsConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "SheetsConfigError";
    this.code = "SHEETS_CONFIG";
  }
}

function isSheetsConfigured() {
  try {
    getServiceAccountCredentials();
    return true;
  } catch {
    return false;
  }
}

function getServiceAccountCredentials() {
  const jsonPayload = readJsonCredential();
  const clientEmail =
    jsonPayload?.client_email || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
  const privateKey =
    jsonPayload?.private_key || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "";

  if (!clientEmail || !privateKey) {
    throw new SheetsConfigError(
      "Google Sheets service account env vars are not configured.",
    );
  }

  return {
    clientEmail,
    privateKey: String(privateKey).replace(/\\n/g, "\n"),
  };
}

function readJsonCredential() {
  const raw =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    decodeBase64(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 || "");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new SheetsConfigError("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }
}

function decodeBase64(value) {
  if (!value) return "";
  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return "";
  }
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.accessToken && tokenCache.expiresAt - 60 > now) {
    return tokenCache.accessToken;
  }

  const { clientEmail, privateKey } = getServiceAccountCredentials();
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: spreadsheetScope,
      aud: tokenEndpoint,
      exp: now + 3600,
      iat: now,
    }),
  );
  const unsignedJwt = `${header}.${claim}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsignedJwt)
    .sign(privateKey);
  const jwt = `${unsignedJwt}.${base64Url(signature)}`;

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || "Token request failed.");
  }

  tokenCache.accessToken = payload.access_token || "";
  tokenCache.expiresAt = now + Number(payload.expires_in || 3600);
  return tokenCache.accessToken;
}

function base64Url(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

async function sheetsFetch(path, options = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${sheetsBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const payload = text ? safeJson(text) : {};
  if (!response.ok) {
    const message = payload?.error?.message || text || `Sheets API HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function getValues(spreadsheetId, range, valueRenderOption = "FORMATTED_VALUE") {
  const params = new URLSearchParams({ valueRenderOption });
  const encodedRange = encodeURIComponent(range);
  const payload = await sheetsFetch(`/${spreadsheetId}/values/${encodedRange}?${params}`);
  return payload.values || [];
}

async function updateValues(
  spreadsheetId,
  range,
  values,
  valueInputOption = "USER_ENTERED",
) {
  const params = new URLSearchParams({ valueInputOption });
  const encodedRange = encodeURIComponent(range);
  return sheetsFetch(`/${spreadsheetId}/values/${encodedRange}?${params}`, {
    method: "PUT",
    body: JSON.stringify({ values }),
  });
}

async function batchUpdateValues(
  spreadsheetId,
  data,
  valueInputOption = "USER_ENTERED",
) {
  return sheetsFetch(`/${spreadsheetId}/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ valueInputOption, data }),
  });
}

async function appendValues(
  spreadsheetId,
  range,
  values,
  valueInputOption = "USER_ENTERED",
) {
  const params = new URLSearchParams({
    valueInputOption,
    insertDataOption: "INSERT_ROWS",
  });
  const encodedRange = encodeURIComponent(range);
  return sheetsFetch(`/${spreadsheetId}/values/${encodedRange}:append?${params}`, {
    method: "POST",
    body: JSON.stringify({ values }),
  });
}

async function batchUpdateSpreadsheet(spreadsheetId, requests) {
  return sheetsFetch(`/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ requests }),
  });
}

async function readSheetRows(spreadsheetId, sheetName, range = "A:ZZ") {
  const values = await getValues(spreadsheetId, `${quoteSheetName(sheetName)}!${range}`);
  const headers = (values[0] || []).map((header) => String(header || "").trim());
  const rows = values.slice(1).map((cells, index) => {
    const row = { __rowNumber: index + 2, __cells: cells };
    headers.forEach((header, columnIndex) => {
      if (header) row[header] = cells[columnIndex] ?? "";
    });
    return row;
  });
  return { headers, rows, values };
}

async function ensureHeaders(spreadsheetId, sheetName, requiredHeaders) {
  const values = await getValues(spreadsheetId, `${quoteSheetName(sheetName)}!1:1`);
  const headers = (values[0] || []).map((header) => String(header || "").trim());
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (!missing.length) return headers;

  const startIndex = headers.length;
  const endIndex = startIndex + missing.length - 1;
  await updateValues(
    spreadsheetId,
    `${quoteSheetName(sheetName)}!${columnLetter(startIndex)}1:${columnLetter(endIndex)}1`,
    [missing],
  );
  return [...headers, ...missing];
}

function quoteSheetName(name) {
  return `'${String(name || "").replaceAll("'", "''")}'`;
}

function columnLetter(index) {
  let number = Number(index) + 1;
  let letters = "";
  while (number > 0) {
    const remainder = (number - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    number = Math.floor((number - 1) / 26);
  }
  return letters;
}

function extractSpreadsheetId(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return text;
}

module.exports = {
  SheetsConfigError,
  appendValues,
  batchUpdateSpreadsheet,
  batchUpdateValues,
  columnLetter,
  ensureHeaders,
  extractSpreadsheetId,
  getValues,
  isSheetsConfigured,
  quoteSheetName,
  readSheetRows,
  updateValues,
};
