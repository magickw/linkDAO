const fs = require('fs');
const path = require('path');

const slug = 'introduction';
const sanitizedSlug = slug.replace(/\.\./g, '').replace(/\//g, '');
const filename = `${sanitizedSlug}.md`;

console.log(`Looking for ${filename}...`);
console.log(`CWD: ${process.cwd()}`);

const possiblePaths = [
    // Local development from frontend directory
    path.join(process.cwd(), 'public', 'docs'),
    // Vercel deployment from root directory
    path.join(process.cwd(), 'app', 'frontend', 'public', 'docs'),
    // Direct relative path
    path.resolve('./public/docs'),
    path.resolve('./app/frontend/public/docs')
];

let docsDir = null;
let filePath = null;

for (const possiblePath of possiblePaths) {
    const tryPath = path.join(possiblePath, filename);
    console.log(`Checking: ${tryPath}`);
    if (fs.existsSync(tryPath)) {
        docsDir = possiblePath;
        filePath = tryPath;
        console.log(`Found at: ${tryPath}`);
        break;
    }
}

if (!filePath) {
    console.error('Document not found');
    process.exit(1);
}

try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    console.log(`Successfully read file. Length: ${fileContent.length}`);
} catch (error) {
    console.error('Error reading file:', error);
    process.exit(1);
}
