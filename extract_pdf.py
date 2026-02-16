import sys
import os

pdf_path = r"c:\Users\REAL TIME\Documents\willardpro\71X10M MR MAGURA.pdf"

if not os.path.exists(pdf_path):
    # Try current dir
    pdf_path = "71X10M MR MAGURA.pdf"

if not os.path.exists(pdf_path):
    print(f"File not found: {pdf_path}")
    # try searching
    for root, dirs, files in os.walk(r"c:\Users\REAL TIME\Documents\willardpro"):
        if "71X10M MR MAGURA.pdf" in files:
            pdf_path = os.path.join(root, "71X10M MR MAGURA.pdf")
            print(f"Found at {pdf_path}")
            break

try:
    from pypdf import PdfReader
except ImportError:
    print("pypdf not installed. Please run: pip install pypdf")
    sys.exit(1)

try:
    reader = PdfReader(pdf_path)
    print(f"--- START PDF CONTENT ({pdf_path}) ---")
    for page in reader.pages:
        print(page.extract_text())
    print("--- END PDF CONTENT ---")
except Exception as e:
    print(f"Error reading PDF: {e}")
