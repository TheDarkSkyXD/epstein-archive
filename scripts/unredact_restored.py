import os
import sys
import argparse
import tempfile
import logging
from pathlib import Path
from pdf2image import convert_from_path
import pytesseract
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def unredact_pdf(input_path, output_dir, brightness_threshold=1, highlight=0):
    """
    Simulates 'unredaction' by converting PDF pages to images and running OCR.
    This bypasses text-layer redactions where the underlying image might still contain info
    (though proper redaction flattens images).
    More importantly, it handles "Image-only" PDFs that have no text layer.
    """
    input_file = Path(input_path)
    if not input_file.exists():
        logger.error(f"Input file not found: {input_path}")
        sys.exit(1)

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Target output filename as expected by ingest_pipeline.ts
    # "original_UNREDACTED.pdf"
    output_filename = f"{input_file.stem}_UNREDACTED.pdf"
    final_output = output_path / output_filename

    logger.info(f"Processing {input_file} -> {final_output}")

    try:
        # Convert PDF to images
        # 300 DPI is standard for OCR
        images = convert_from_path(str(input_file), dpi=300)
        
        pdf_pages = []
        for i, img in enumerate(images):
            # Run OCR on the image to get a searchable PDF page
            # pytesseract.image_to_pdf_or_hocr returns bytes
            pdf_bytes = pytesseract.image_to_pdf_or_hocr(img, extension='pdf')
            
            # Save temporary page
            temp_page = output_path / f"temp_page_{i}.pdf"
            with open(temp_page, 'wb') as f:
                f.write(pdf_bytes)
            pdf_pages.append(temp_page)
            
        # Merge pages back into one PDF
        # We can use PyPDF2 or just rely on the fact that we return the path 
        # and let the pipeline extract text from this new PDF.
        # Actually, ingest_pipeline.ts extracts text from the PDF.
        # So we need a valid PDF with text layer.
        
        # Simple merge using pypdf/PyPDF2 (if available) or just simple concatenation if they are PDF bytes? 
        # No, valid PDF structure requires merging.
        # Let's use a simple approach: Tesseract can output a single PDF from multiple images if passed a list?
        # No, pytesseract wrapper processes one image.
        
        # Alternative: Just return the text? 
        # ingest_pipeline.ts expects a PDF file path to read from.
        
        from PyPDF2 import PdfMerger
        merger = PdfMerger()
        for page_path in pdf_pages:
            merger.append(str(page_path))
            
        merger.write(str(final_output))
        merger.close()
        
        # Cleanup temp pages
        for page_path in pdf_pages:
            page_path.unlink()
            
        logger.info(f"Successfully created unredacted PDF at {final_output}")
        
    except Exception as e:
        logger.error(f"Failed to process PDF: {e}")
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Unredact/OCR PDF Tool")
    parser.add_argument("-i", "--input", required=True, help="Input PDF path")
    parser.add_argument("-o", "--output", required=True, help="Output directory")
    # Ignored arguments to match legacy interface
    parser.add_argument("-b", "--brightness", help="Brightness threshold (legacy, ignored)")
    parser.add_argument("--highlight", help="Highlight removed redactions (legacy, ignored)")
    
    args = parser.parse_args()
    
    unredact_pdf(args.input, args.output)
