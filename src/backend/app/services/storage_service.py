import os
import uuid
from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO

from fastapi import HTTPException, UploadFile
from app.config import settings


class StorageService(ABC):
    """Abstract base class for file storage services."""

    @abstractmethod
    async def save_receipt(self, file: UploadFile) -> str:
        """Save a receipt file and return its URL/path."""
        pass

    @abstractmethod
    def validate_receipt_file(self, file: UploadFile) -> None:
        """Validate that the file meets requirements."""
        pass


class LocalStorageService(StorageService):
    """Local filesystem storage implementation."""

    def __init__(self, upload_dir: str | None = None):
        self.upload_dir = Path(upload_dir or getattr(settings, 'UPLOAD_DIR', './uploads/receipts'))
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        # Allowed MIME types
        self.allowed_types = {
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf'
        }

        # File extensions mapping
        self.extensions = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'application/pdf': '.pdf'
        }

        # Max file size (10MB)
        self.max_size = 10 * 1024 * 1024

    def validate_receipt_file(self, file: UploadFile) -> None:
        """Validate file size and type."""
        # Check content type
        if file.content_type not in self.allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file.content_type} not allowed. "
                       f"Allowed types: {', '.join(self.allowed_types)}"
            )

        # Reset file position to beginning
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning

        if file_size > self.max_size:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {self.max_size / 1024 / 1024:.1f}MB"
            )

    async def save_receipt(self, file: UploadFile) -> str:
        """Save file to local storage and return URL path."""
        self.validate_receipt_file(file)

        # Generate unique filename
        file_uuid = uuid.uuid4()
        extension = self.extensions.get(file.content_type, '.bin')
        filename = f"{file_uuid}{extension}"
        file_path = self.upload_dir / filename

        try:
            # Save file
            contents = await file.read()
            with open(file_path, 'wb') as f:
                f.write(contents)

            # Return URL path that can be served
            return f"/uploads/receipts/{filename}"

        except Exception as e:
            # Clean up file if something went wrong
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save file: {str(e)}"
            )


# Global storage service instance
storage_service = LocalStorageService()