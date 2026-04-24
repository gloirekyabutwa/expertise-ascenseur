from datetime import timedelta
from io import BytesIO
from threading import Lock
from typing import BinaryIO
from minio import Minio
from minio.error import S3Error

from app.core.config import settings

class StorageService:
    def __init__(self):
        self.client: Minio | None = None
        self.signer_client: Minio | None = None
        self.bucket_name = settings.MINIO_BUCKET_NAME
        self._bucket_ready = False
        self._bucket_lock = Lock()

    def _build_client(self, endpoint: str) -> Minio:
        return Minio(
            endpoint,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
            region="us-east-1",
        )

    def _get_client(self) -> Minio:
        if self.client is None:
            self.client = self._build_client(settings.MINIO_ENDPOINT)
        return self.client

    def _get_signer_client(self) -> Minio:
        if self.signer_client is None:
            self.signer_client = self._build_client(settings.MINIO_EXTERNAL_ENDPOINT)
        return self.signer_client

    def _ensure_bucket_exists(self):
        if self._bucket_ready:
            return

        with self._bucket_lock:
            if self._bucket_ready:
                return

            client = self._get_client()
            try:
                if not client.bucket_exists(self.bucket_name):
                    client.make_bucket(self.bucket_name)
            except S3Error as exc:
                if exc.code not in {"BucketAlreadyOwnedByYou", "BucketAlreadyExists"}:
                    raise
            self._bucket_ready = True

    def upload_file(self, file_data: BinaryIO, object_name: str, content_type: str, length: int):
        self._ensure_bucket_exists()
        try:
            self._get_client().put_object(
                self.bucket_name,
                object_name,
                file_data,
                length,
                content_type=content_type,
            )
        except S3Error as e:
            print(f"Error uploading file: {e}")
            raise e

    def upload_file_object(self, object_name: str, content: bytes, content_type: str | None = None):
        stream = BytesIO(content)
        self.upload_file(
            file_data=stream,
            object_name=object_name,
            content_type=content_type or "application/octet-stream",
            length=len(content),
        )

    def download_file_object(self, object_name: str) -> bytes:
        response = self._get_client().get_object(self.bucket_name, object_name)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    def delete_file(self, object_name: str):
        try:
            self._get_client().remove_object(self.bucket_name, object_name)
        except S3Error as exc:
            if exc.code != "NoSuchKey":
                raise

    def get_presigned_url(self, object_name: str, method: str = "GET", expires: int = 3600) -> str:
        try:
            return self._get_signer_client().get_presigned_url(
                method,
                self.bucket_name,
                object_name,
                expires=timedelta(seconds=expires),
            )
        except S3Error as e:
            print(f"Error getting presigned url: {e}")
            raise e
    
    def generate_presigned_post(self, object_name: str):
         self._ensure_bucket_exists()
         return self._get_client().presigned_put_object(
             self.bucket_name,
             object_name
         )

storage = StorageService()
