"""Shared SlowAPI rate limiter instance.

Import `limiter` from this module in both main.py and any router
that needs rate-limiting decorators. A single Limiter instance ensures
consistent state and configuration across the entire app.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
