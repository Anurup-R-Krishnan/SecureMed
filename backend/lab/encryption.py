import os
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

# 32 bytes = 256 bits key
# In production, this MUST be loaded from a secure environment variable or Vault
# Generating a random one for demo if not present
backend_encryption_key_hex = os.environ.get('LAB_ENCRYPTION_KEY', os.urandom(32).hex())

class AESEncryption:
    def __init__(self, key_hex=None):
        self.key = bytes.fromhex(key_hex or backend_encryption_key_hex)
        if len(self.key) != 32:
            raise ValueError("Encryption key must be 32 bytes (64 hex chars) for AES-256")

    def encrypt(self, data: bytes) -> bytes:
        iv = os.urandom(12) # 96-bit nonce for GCM
        encryptor = Cipher(
            algorithms.AES(self.key),
            modes.GCM(iv),
            backend=default_backend()
        ).encryptor()
        
        ciphertext = encryptor.update(data) + encryptor.finalize()
        
        # Return IV + Tag + Ciphertext suitable for storage
        # GCM tag is available after finalize()
        return iv + encryptor.tag + ciphertext

    def decrypt(self, data: bytes) -> bytes:
        # Extract IV (12 bytes), Tag (16 bytes), Ciphertext (rest)
        if len(data) < 28:
            raise ValueError("Invalid encrypted data")
            
        iv = data[:12]
        tag = data[12:28]
        ciphertext = data[28:]
        
        decryptor = Cipher(
            algorithms.AES(self.key),
            modes.GCM(iv, tag),
            backend=default_backend()
        ).decryptor()
        
        return decryptor.update(ciphertext) + decryptor.finalize()

# Helper for file wrapper
def encrypt_file(file_obj):
    data = file_obj.read()
    encryption = AESEncryption()
    encrypted_data = encryption.encrypt(data)
    return encrypted_data # Return bytes

def decrypt_file_content(encrypted_data):
    encryption = AESEncryption()
    return encryption.decrypt(encrypted_data)
