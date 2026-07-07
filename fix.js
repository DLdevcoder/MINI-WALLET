const fs = require('fs');
let content = fs.readFileSync('MiniWallet_P2P.postman_collection.json', 'utf8');
content = content.replace(/"api",\s*"v1",\s*/g, '');
fs.writeFileSync('MiniWallet_P2P.postman_collection.json', content);
