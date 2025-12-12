const fs = require('fs');
const path = require('path');
const os = require('os');
const child_process = require('child_process');

// Configuration
const DOCS_DIR = path.join(__dirname, '../docs');
const S2_REPORT_PATH = path.join(DOCS_DIR, 'mindgraphsim_s2_qa_run.yaml');
const S3_REPORT_PATH = path.join(DOCS_DIR, 'mindgraphsim_s3_model_comparison.yaml');
const S5_SPEC_PATH = path.join(DOCS_DIR, 'specs/s5_narratives_export.yaml');
const OUTPUT_PATH = path.join(DOCS_DIR, 'lab_report_v1.yaml');

// Helper to read file safely
function readFile(p) {
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  return null;
}

// Simple YAML-ish extractor (since we can't assume js-yaml)
// We treat the file content as a string block and indent it under a new key.
function indentBlock(text, spaces = 2) {
  if (!text) return '  null';
  return text.split('\n').map(line => ' '.repeat(spaces) + line).join('\n');
}

// Get System Info
function getSystemInfo() {
  const node = process.version;
  const platform = os.platform();
  const arch = os.arch();
  // Try getting git hash
  let gitHash = 'unknown';
  try {
    gitHash = child_process.execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) { }

  return `
system:
  timestamp: "${new Date().toISOString()}"
  node_version: "${node}"
  platform: "${platform}"
  arch: "${arch}"
  git_hash: "${gitHash}"
`.trim();
}

// Main Execution
console.log("Generating MindGraphSim Lab Report v1...");

const s2Content = readFile(S2_REPORT_PATH);
const s3Content = readFile(S3_REPORT_PATH);
const sysContent = getSystemInfo();

if (!s2Content && !s3Content) {
  console.error("Error: No input reports found (S2 or S3). Run QA/Model Comparison first.");
  process.exit(1);
}

// Construct Unified YAML
// We embed the raw content of previous reports under specific keys to preserve their structure
// or we try to strip their top-level keys if possible. For simplicity, we'll strip known root keys.

// Helper to strip root key from existing YAML content
function stripRoot(content, rootKey) {
  if (!content) return null;
  const lines = content.split('\n');
  if (lines[0].startsWith(rootKey + ':')) {
    return lines.slice(1).join('\n').trim(); // Return content without root
  }
  return content;
}

// Basic YAML-to-Object Parser (robust enough for our generated reports)

function parseYaml(text) {
  if (!text) return {};
  const obj = {};
  const lines = text.split('\n');
  let currentKey = null;
  let currentObj = obj;
  let indentLevel = 0;
  const stack = [{ obj, indent: -1 }]; // Stack of {obj, key?, indent}

  // This is a very simplified parser for the specific depth-2 structure we generate
  // It won't handle complex YAML but handles key: val and indented blocks.
  // Actually, for reliability without deps, let's just use regex for the specific fields we know exist
  // or build a clean object if we parsed indentation correctly.

  // Alternative: Build 'data' object manually from regexes since schema is known
  return text; // Fallback to raw string if we don't implement full parser
}

// Regex Extractor for Known Fields
function matchVal(text, key) {
  const re = new RegExp(`${key}:\\s*(.+)`);
  const m = text.match(re);
  return m ? m[1].replace(/["']/g, "").trim() : null;
}

function parseS2(text) {
  // Extract summary stats or full tree?
  // Let's just wrap the text in a JSON string for now if parsing is too risky without a library.
  // But valid JSON is a requirement. 
  // Let's use a simpler approach: The input YAMLs are regular.
  // We can try to map them line by line.
  const result = {};
  const lines = text.split('\n');
  let currentSection = result;
  // This is too brittle.
  // STRATEGY CHANGE: Since we control the inputs, we can just regex the important parts for the JSON summary.
  return {
    raw_yaml: text,
    metrics: {
      density: parseFloat(matchVal(text, 'density')) || 0,
      patterns: parseInt(matchVal(text, 'patterns')) || 0
    }
  };
}

// ... actually, the goal is just to have a JSON mirror.
// If I can't robustly parse YAML to JSON without a library, I should probably output JSON from the source harnesses.
// But I can't change harnesses easily.
// I will output a JSON that contains the *text* of the YAMLs as string fields, plus the system info as object.
// This meets "machine readable" wrapper requirement without risking bad parsing.
// { meta: ..., system: {...}, qa_s2_yaml: "...", s3_yaml: "..." }
// Does this satisfy "Reduce friction to export narratives and JSON for external tools"?
// External tools probably want the data.
// Okay, I will try a slightly better parser.

function simpleYamlParse(str) {
  const result = {};
  const lines = str.split('\n').filter(l => l.trim().length > 0 && !l.trim().startsWith('#'));
  const stack = [result];
  const indentStack = [-1];

  lines.forEach(line => {
    const indent = line.search(/\S/);
    const content = line.trim();
    if (content.startsWith('- ')) {
      // list item
      const val = content.substring(2);
      const parent = stack[stack.length - 1];
      if (Array.isArray(parent)) parent.push(val);
      // basic support only
    } else if (content.includes(':')) {
      const parts = content.split(':');
      const key = parts[0].trim();
      let val = parts.slice(1).join(':').trim();

      // Check indent
      while (indent <= indentStack[indentStack.length - 1]) {
        indentStack.pop();
        stack.pop();
      }

      const parent = stack[stack.length - 1];

      if (!val) {
        // Object or array start
        const newObj = {};
        parent[key] = newObj;
        stack.push(newObj);
        indentStack.push(indent);
      } else {
        // Primitive
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val === 'true') val = true;
        if (val === 'false') val = false;
        if (!isNaN(parseFloat(val))) val = parseFloat(val);
        parent[key] = val;
      }
    }
  });
  return result;
}

// Execution
const s2Obj = simpleYamlParse(s2Content || '');
const s3Obj = simpleYamlParse(s3Content || '');

// Clean up root keys if present in parsed obj
const s2Root = Object.keys(s2Obj)[0];
const s2Data = s2Root && s2Root.startsWith('mindgraphsim_s2') ? s2Obj[s2Root] : s2Obj;

const s3Root = Object.keys(s3Obj)[0];
const s3Data = s3Root && s3Root.startsWith('mindgraphsim_s3') ? s3Obj[s3Root] : s3Obj;


// YAML Output Construction (Strings)
const s2Body = indentBlock(stripRoot(s2Content, 'mindgraphsim_s2_qa_run'), 2);
const s3Body = indentBlock(stripRoot(s3Content, 'mindgraphsim_s3_model_comparison'), 2);
const sysBody = indentBlock(sysContent.replace('system:', ''), 2);

const reportYaml = `mindgraphsim_lab_report_v1:
  meta:
    generated_by: "scripts/generate_lab_report.cjs"
    version: "1.0"
  
  system_info:
${sysBody}

  qa_s2_results:
${s2Body}

  s3_model_comparison:
${s3Body}
`;

fs.writeFileSync(OUTPUT_PATH, reportYaml);
console.log(`Report written to: ${OUTPUT_PATH}`);

// JSON Output (Optional)
if (process.argv.includes('--json')) {
  const reportJson = {
    meta: { generated_by: "scripts/generate_lab_report.cjs", version: "1.0" },
    system_info: simpleYamlParse(sysContent).system,
    qa_s2_results: s2Data,
    s3_model_comparison: s3Data
  };
  const jsonPath = OUTPUT_PATH.replace('.yaml', '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(reportJson, null, 2));
  console.log(`JSON Mirror written to: ${jsonPath}`);
}

