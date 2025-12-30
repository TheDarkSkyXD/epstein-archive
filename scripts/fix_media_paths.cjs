
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('epstein-archive.db');

// Fix paths starting with /data/ to be local-relative
const images = db.prepare('SELECT id, path, thumbnail_path FROM media_images').all();

console.log(`Auditing ${images.length} images...`);

let fixedCount = 0;

const updateStmt = db.prepare('UPDATE media_images SET path = ?, thumbnail_path = ? WHERE id = ?');

const fixPath = (p) => {
    if (!p) return p;
    // Remove absolute prefixes and " - Copy" suffix
    let newPath = p.replace(/^\/home\/deploy\/epstein-archive\//, '')
                   .replace(/^\/Users\/veland\/Downloads\/Epstein Files\/epstein-archive\//, '')
                   .replace(/^\//, '') // Remove leading slash
                   .replace(/ - Copy/g, '') // Remove " - Copy"
                   .replace(/^images\/Epstein\//, 'images/Jeffrey Epstein/')
                   .replace(/^images\/Trump Epstein\//, 'images/Trump/')
                   .replace(/^data\/media\/images\/Epstein\//, 'data/media/images/Jeffrey Epstein/')
                   .replace(/^data\/media\/images\/Trump Epstein\//, 'data/media/images/Trump/');
    
    // Aggressive priority-based directory mappings
    const dirMappings = [
        ['images/Epstein Wexner/', 'images/Les Wexner/'],
        ['images/Jeffrey Epstein/ce8b9836-75c3-49a9-9792-af6294dce27b', 'images/Les Wexner/ce8b9836-75c3-49a9-9792-af6294dce27b'],
        ['images/Trump Epstein/', 'images/Donald Trump/'],
        ['images/Musk Epstein/', 'images/Elon Musk/'],
        ['images/Epstein/', 'images/Jeffrey Epstein/'],
        ['images/Trump/', 'images/Donald Trump/'],
        ['images/Ghislaine/', 'images/Ghislaine Maxwell/']
    ];

    let mappedPath = newPath;
    for (const [from, to] of dirMappings) {
        if (mappedPath.startsWith(from)) {
            mappedPath = to + mappedPath.slice(from.length);
            break; 
        }
        const dataPrefix = 'data/media/' + from;
        if (mappedPath.startsWith(dataPrefix)) {
            mappedPath = 'data/media/' + to + mappedPath.slice(dataPrefix.length);
            break;
        }
    }

    const getVariants = (p) => {
        const variants = [p];
        const ext = path.extname(p);
        const base = p.slice(0, -ext.length);
        
        // Add " - Copy" variants
        variants.push(base + ' - Copy' + ext);
        if (base.endsWith(' - Copy')) {
            variants.push(base.slice(0, -7) + ext);
        }
        
        // Add extension variants
        if (ext.toLowerCase() === '.jpg' || ext.toLowerCase() === '.jpeg') {
            variants.push(base + '.JPG');
            variants.push(base + '.jpg');
            variants.push(base + ' - Copy.JPG');
            variants.push(base + ' - Copy.jpg');
        } else if (ext.toLowerCase() === '.webp') {
            variants.push(base + '.webp');
            variants.push(base + ' - Copy.webp');
        }
        return [...new Set(variants)];
    };

    const searchPaths = [
        mappedPath,
        path.join('data/media', mappedPath),
        path.join('data/thumbnails', mappedPath),
        path.join('data', mappedPath),
        mappedPath.replace(/^data\/media\//, ''),
        mappedPath.replace(/^data\/thumbnails\//, '')
    ];

    for (const s of searchPaths) {
        for (const v of getVariants(s)) {
            const fullV = path.join(process.cwd(), v);
            if (fs.existsSync(fullV)) return v;
            
            // Case-insensitive fallback
            try {
                const dir = path.dirname(fullV);
                const base = path.basename(fullV).toLowerCase();
                if (fs.existsSync(dir)) {
                    const match = fs.readdirSync(dir).find(f => f.toLowerCase() === base);
                    if (match) return path.join(path.dirname(v), match);
                }
            } catch (e) {}
        }
    }
    
    return mappedPath;
};

db.transaction(() => {
    for (const img of images) {
        const newPath = fixPath(img.path);
        const newThumb = fixPath(img.thumbnail_path);
        
        if (newPath !== img.path || newThumb !== img.thumbnail_path) {
            updateStmt.run(newPath, newThumb, img.id);
            fixedCount++;
        }
    }
})();

console.log(`Fixed ${fixedCount} image paths.`);
db.close();
