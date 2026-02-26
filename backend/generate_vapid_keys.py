#!/usr/bin/env python3
"""Generate VAPID keys for Web Push notifications.
Run once, then add the output to your .env file."""

from py_vapid import Vapid

vapid = Vapid()
vapid.generate_keys()

print("Add these to your backend .env file:\n")
print(f"VAPID_PUBLIC_KEY={vapid.public_key_urlsafe_base64}")
print(f"VAPID_PRIVATE_KEY={vapid.private_key_urlsafe_base64}")
print(f"VAPID_EMAIL=mailto:admin@kingofdiamonds.com")
print(f"\nAlso add to frontend .env:")
print(f"REACT_APP_VAPID_PUBLIC_KEY={vapid.public_key_urlsafe_base64}")
