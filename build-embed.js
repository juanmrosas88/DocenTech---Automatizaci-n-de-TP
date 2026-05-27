const fs = require('fs');
const code = fs.readFileSync('Code.gs', 'utf8');
const escaped = code.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
fs.writeFileSync(
  'code-gs-embed.js',
  '/** Backend GAS - mantener alineado con Code.gs */\nwindow.DOCENTECH_CODE_GS = `' + escaped + '`;\n'
);
