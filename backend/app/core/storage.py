import os
import uuid
import mimetypes
from pathlib import Path
from typing import Tuple, Dict, Any, Optional
from fastapi import UploadFile, HTTPException, status

ALLOWED_EXTENSIONS = {
    ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".png", ".jpg", ".jpeg",
    ".csv", ".json", ".txt", ".zip"
}

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "image/png",
    "image/jpeg",
    "image/pjpeg",
    "text/csv",
    "application/json",
    "text/plain",
    "application/zip",
    "application/x-zip-compressed",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class StorageService:
    """
    Abstract interface for supporting document storage.
    Easily replaceable with AWS S3, Google Cloud Storage, or MinIO.
    """
    def save_file(self, upload_file: UploadFile) -> Dict[str, Any]:
        raise NotImplementedError

    def get_file_path(self, storage_key: str) -> Path:
        raise NotImplementedError


class LocalStorageService(StorageService):
    def __init__(self, upload_dir: Optional[str] = None):
        if upload_dir is None:
            # Default to backend/uploads
            base_path = Path(__file__).resolve().parent.parent.parent
            self.upload_dir = base_path / "uploads"
        else:
            self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def validate_file(self, upload_file: UploadFile) -> Tuple[str, str]:
        filename = upload_file.filename or "unknown_document"
        ext = os.path.splitext(filename)[1].lower()

        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File extension '{ext}' is not supported. Allowed formats: PDF, DOCX, XLSX, PNG, JPG.",
            )

        content_type = upload_file.content_type
        if not content_type:
            content_type, _ = mimetypes.guess_type(filename)

        if content_type and content_type.lower() not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"MIME type '{content_type}' is not permitted for proposal uploads.",
            )

        return filename, ext

    def save_file(self, upload_file: UploadFile) -> Dict[str, Any]:
        original_filename, ext = self.validate_file(upload_file)

        document_id = str(uuid.uuid4())
        safe_filename = f"{document_id}{ext}"
        destination = self.upload_dir / safe_filename

        file_size = 0
        try:
            with open(destination, "wb") as buffer:
                while chunk := upload_file.file.read(1024 * 64):  # 64KB chunks
                    file_size += len(chunk)
                    if file_size > MAX_FILE_SIZE:
                        buffer.close()
                        if destination.exists():
                            destination.unlink()
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"File exceeds maximum permissible size of {MAX_FILE_SIZE // (1024 * 1024)}MB.",
                        )
                    buffer.write(chunk)
        except HTTPException:
            raise
        except Exception as exc:
            if destination.exists():
                destination.unlink()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error saving file to disk: {str(exc)}",
            )

        return {
            "document_id": document_id,
            "original_filename": original_filename,
            "stored_filename": safe_filename,
            "file_size": file_size,
            "mime_type": upload_file.content_type or "application/octet-stream",
            "file_url": f"/api/v1/applications/documents/{document_id}/download",
            "file_path": str(destination),
        }

    def get_file_path(self, storage_key: str) -> Path:
        # Prevent path traversal attacks
        safe_key = os.path.basename(storage_key)
        # Check files matching safe_key or safe_key + extension
        for f in self.upload_dir.glob(f"{safe_key}*"):
            if f.is_file():
                return f
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requested document was not found on the server.",
        )


storage_service = LocalStorageService()
