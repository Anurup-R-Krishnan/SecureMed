import hashlib
import os
from django.conf import settings
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _get_key():
    raw = getattr(settings, 'LAB_FILE_ENCRYPTION_KEY', None)
    if raw:
        if isinstance(raw, str):
            raw_bytes = raw.encode()
        else:
            raw_bytes = bytes(raw)
        if len(raw_bytes) == 32:
            return raw_bytes
        return hashlib.sha256(raw_bytes).digest()
    return hashlib.sha256(settings.SECRET_KEY.encode()).digest()


def encrypt_bytes(data: bytes) -> bytes:
    key = _get_key()
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, data, None)
    return nonce + ciphertext


def decrypt_bytes(payload: bytes) -> bytes:
    key = _get_key()
    nonce = payload[:12]
    ciphertext = payload[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None)
