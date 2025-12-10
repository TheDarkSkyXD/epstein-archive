declare module 'exif-parser' {
  interface ExifData {
    tags: {
      Make?: string;
      Model?: string;
      LensModel?: string;
      LensMake?: string;
      FocalLength?: number;
      FNumber?: number;
      ExposureTime?: number;
      ISO?: number;
      DateTimeOriginal?: number;
      CreateDate?: number;
      GPSLatitude?: number;
      GPSLongitude?: number;
      GPSLatitudeRef?: string;
      GPSLongitudeRef?: string;
      ColorSpace?: number;
      Orientation?: number;
      Software?: string;
      Artist?: string;
      Copyright?: string;
      [key: string]: any;
    };
    imageSize?: {
      width?: number;
      height?: number;
    };
  }

  interface Parser {
    parse(): ExifData;
  }

  function create(buffer: Buffer): Parser;

  export = { create };
}
