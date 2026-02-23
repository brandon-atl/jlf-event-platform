"""Shared schema helpers — response envelope, pagination."""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginationMeta(BaseModel):
    total: int
    page: int
    per_page: int


class PaginatedResponse(BaseModel, Generic[T]):
    data: list[Any]  # will hold list[T] at runtime
    meta: PaginationMeta
