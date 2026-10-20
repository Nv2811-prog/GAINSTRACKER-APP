// Syntax-check every inline <script> in the app HTML (compile only, nothing runs).
// node syncheck.mjs [file.html]  → exit 0 = OK, 1 = syntax error (prints line in the HTML file)
import fs from 'node:fs';
import vm from 'node:vm';
const file = process.argv[2] || decodeURIComponent(new URL('../../Gainstracker app not complete.html', import.meta.url).pathname);
const html = fs.readFileSync(file, 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, n = 0, bad = 0;
while ((m = re.exec(html))) {
  n++;
  const startLine = html.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length;
  try { new vm.Script(m[1], { filename: 'inline-script-' + n }); }
  catch (e) {
    bad++;
    const ln = (String(e.stack).match(/inline-script-\d+:(\d+)/) || [])[1];
    console.log(`SYNTAX ERROR in <script> #${n}: ${e.message}` + (ln ? ` — HTML line ~${startLine + (+ln) - 1}` : ''));
  }
}
console.log(bad ? `FAIL (${bad}/${n} scripts)` : `OK (${n} script${n === 1 ? '' : 's'}, ${html.split('\n').length} lines)`);
process.exit(bad ? 1 : 0);
