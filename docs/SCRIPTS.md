# Helper Scripts

This project includes auxiliary scripts to assist with maintenance and debugging.

## Backup Script (`backup_script.ps1`)

**Location**: Root directory
**Language**: PowerShell

This script creates a full backup of the source code, excluding heavy dependencies and build artifacts.

### Key Features:
*   **Uses Robocopy**: Efficiently copies files.
*   **Exclusions**: Automatically excludes `node_modules`, `.git`, `.firebase` cache, `dist` folder, and `.gemini` agent data to keep the backup lightweight.
*   **Compression**: Zips the resulting folder into `Stanchion_CRM_Backup.zip`.

### Usage:
Run from a PowerShell terminal in the project root:
```powershell
.\backup_script.ps1
```

## PDF Extractor (`extract_pdf.py`)

**Location**: Root directory
**Language**: Python
**Dependencies**: `pypdf`

This script is likely used for testing or debugging PDF reading capabilities, or extracting data from specific PDF files (e.g., `71X10M MR MAGURA.pdf` referenced in the code).

### Usage:
1.  Ensure you have Python installed.
2.  Install the dependency: `pip install pypdf`
3.  Run the script:
    ```bash
    python extract_pdf.py
    ```
