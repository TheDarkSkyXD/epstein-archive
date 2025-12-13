import fs from 'fs';
import sharp from 'sharp';

const filePath = '/home/deploy/epstein-archive/data/media/images/12.03.25 USVI Production/DJI_0360.JPG';

(async () => {
    try {
        const metadata = await sharp(filePath).metadata();
        console.log('Sharp Metadata:', JSON.stringify(metadata, null, 2));
        if (metadata.exif) {
            console.log('EXIF Buffer found of length:', metadata.exif.length);
        }
    } catch (e) {
        console.error('Sharp Error:', e);
    }
})();
