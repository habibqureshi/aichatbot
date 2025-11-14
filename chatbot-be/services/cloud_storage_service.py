from google.cloud import storage
from fastapi import UploadFile
from configs import BUCKET_NAME

client = storage.Client()


def upload_file(file: UploadFile, filename: str):
    bucket = client.bucket(BUCKET_NAME)
    blob = bucket.blob(blob_name=filename)
    blob.upload_from_file(file.file, content_type=file.content_type)


def generate_presigned_url(blob_name: str, expiration: int = 3600) -> str:
    bucket = client.bucket(BUCKET_NAME)
    blob = bucket.blob(blob_name=blob_name)
    url = blob.generate_signed_url(expiration=expiration)
    return url
