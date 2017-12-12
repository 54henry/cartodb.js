/**
 * This script adds the package.json with the updated version
 * for the npm publish to the dist/public directory
 */
var fs = require('fs');
var path = require('path');
var version = require(path.join(__dirname, '../package.json')).version;
var placeholder = require(path.join(__dirname, './package.public.json'));

placeholder.version = version;

fs.writeFileSync(path.join(__dirname, '../dist/public/package.json'), JSON.stringify(placeholder, null, 2));
