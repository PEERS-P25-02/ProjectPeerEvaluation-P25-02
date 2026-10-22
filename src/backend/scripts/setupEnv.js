// Prepare the root .env file using the root .env.example as the defaults.
// Run with npm run setup:env after installing dependencies.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');

// Check the environment of the command running this script. Unset values
// allow local setup; explicitly non-development values stop it before writing.
const appEnv = process.env.APP_ENV || 'development';
const nodeEnv = process.env.NODE_ENV;
if (appEnv !== 'development' || (nodeEnv && nodeEnv !== 'development')) {
  throw new Error('Environment setup is for local development only.');
}

// Resolve paths relative to this script so they work regardless of the
// directory from which the command was started.
const envPath = path.resolve(__dirname, '../../../.env');
const examplePath = path.resolve(__dirname, '../../../.env.example');
const template = fs.readFileSync(examplePath, 'utf8');

// Turn the template's KEY=value entries into an object. Parsing does not
// load these settings into the running process's environment.
const defaults = dotenv.parse(template);
const exists = fs.existsSync(envPath);

// Keep an existing file's text, including comments and custom settings.
// For a new file, build the initial contents from the template's settings.
let content = exists
  ? fs.readFileSync(envPath, 'utf8')
  : Object.entries(defaults)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n';
const current = dotenv.parse(content);

// Also check the saved configuration: a development command must not
// modify a file explicitly marked for another environment.
if (
  (current.APP_ENV && current.APP_ENV !== 'development') ||
  (current.NODE_ENV && current.NODE_ENV !== 'development')
) {
  throw new Error('Existing configuration is not for local development.');
}

// Preserve Windows or Unix line endings when adding settings.
const newline = content.includes('\r\n') ? '\r\n' : '\n';

// Track whether a write is needed and how many ordinary settings were added.
// JWT_SECRET is handled separately below.
let changed = !exists;
let added = 0;

// Ensure each added setting starts on its own line, even when the existing
// file has no final newline.
function appendSetting(key, value) {
  if (content && !content.endsWith('\n')) content += newline;
  content += `${key}=${value}${newline}`;
}

// Add defaults only for keys that are absent. Existing values, including
// deliberately empty ones, stay unchanged. Handle the JWT secret separately.
for (const [key, value] of Object.entries(defaults)) {
  if (key === 'JWT_SECRET' || Object.hasOwn(current, key)) continue;
  appendSetting(key, value);
  added++;
  changed = true;
}

// Reuse a configured JWT signing secret. Generate one only when it is
// missing, blank, or matches the template or known old development placeholder.
if (
  !current.JWT_SECRET?.trim() ||
  current.JWT_SECRET === defaults.JWT_SECRET ||
  current.JWT_SECRET === 'dev_secret_key'
) {
  // Use cryptographically secure randomness: 32 bytes become 64 hex characters.
  const secret = crypto.randomBytes(32).toString('hex');
  if (Object.hasOwn(current, 'JWT_SECRET')) {
    // Replace every assignment so duplicate entries cannot restore an old key.
    content = content.replace(
      /^[ \t]*(?:export[ \t]+)?JWT_SECRET[ \t]*=[^\r\n]*/gm,
      `JWT_SECRET=${secret}`,
    );
  } else {
    appendSetting('JWT_SECRET', secret);
  }
  changed = true;
}

// Write only when something changed. New files request owner-only read/write
// permissions (0600). The 'wx' flag prevents overwriting a file created after
// the initial existence check; 'w' updates a file that already existed.
if (changed) {
  fs.writeFileSync(envPath, content, {
    encoding: 'utf8',
    mode: 0o600,
    flag: exists ? 'w' : 'wx',
  });
}

// Report the result without printing configuration values or the secret.
console.log(
  changed
    ? `Local backend configuration prepared (${added} missing settings added).`
    : 'Local backend configuration already exists; no changes needed.',
);
