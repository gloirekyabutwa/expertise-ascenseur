import io
from typing import BinaryIO
from minio import Minio
from minio.error import S3Error

from app.core.config import settings

class StorageService:
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        
        # Secondary client for generating external-facing URLs (Hardening #5)
        # We use the external endpoint here so the signature matches the Host header
        # sent by the user's browser (e.g. localhost:9000 vs minio:9000).
        self.signer_client = Minio(
             settings.MINIO_EXTERNAL_ENDPOINT,
             access_key=settings.MINIO_ACCESS_KEY,
             secret_key=settings.MINIO_SECRET_KEY,
             secure=settings.MINIO_SECURE,
             region="us-east-1", # Force region to avoid network lookup on localhost
        )
        
        self.bucket_name = settings.MINIO_BUCKET_NAME
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        if not self.client.bucket_exists(self.bucket_name):
            self.client.make_bucket(self.bucket_name)

    def upload_file(self, file_data: BinaryIO, object_name: str, content_type: str, length: int):
        try:
            self.client.put_object(
                self.bucket_name,
                object_name,
                file_data,
                length,
                content_type=content_type,
            )
        except S3Error as e:
            print(f"Error uploading file: {e}")
            raise e

    def get_presigned_url(self, object_name: str, method: str = "GET") -> str:
        try:
            # Use signer_client (external host) for generation
            return self.signer_client.get_presigned_url(
                method,
                self.bucket_name,
                object_name,
            )
        except S3Error as e:
            print(f"Error getting presigned url: {e}")
            raise e
    
    def generate_presigned_post(self, object_name: str):
         # Provides dictionary with 'url' and 'fields'
         return self.client.presigned_put_object(
             self.bucket_name,
             object_name
         )

storage = StorageService()
