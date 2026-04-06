import crypto from "crypto";
const apiKey = "myEsp32SecretKeyGemma12345";
const hash = crypto.createHash("sha256").update(apiKey).digest("hex");
console.log(`API Key: ${apiKey}`);
console.log(`SHA256 Hash: ${hash}`);
