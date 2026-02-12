declare module 'exif-parser' {
  interface ExifTags {
    [key: string]: any;
    DateTimeOriginal?: number;
    Make?: string;
    Model?: string;
  }

  interface ExifResult {
    tags: ExifTags;
    imageSize: {
      width?: number;
      height?: number;
    };
  }

  interface ExifParser {
    parse(): ExifResult;
  }

  export function create(buffer: Buffer): ExifParser;
}
