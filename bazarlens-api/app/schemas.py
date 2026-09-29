from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator


class LoginInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)
    remember: bool = False


class SignupInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    city: str = Field(min_length=1, max_length=100)
    thana: str = Field(min_length=1, max_length=100, validation_alias=AliasChoices("thana", "area"))
    password: str = Field(min_length=8, max_length=128)
    confirmPassword: str
    agreeTerms: bool


class ProfileInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    city: str = Field(min_length=1, max_length=100)
    thana: str = Field(min_length=1, max_length=100, validation_alias=AliasChoices("thana", "area"))
    avatarUrl: str = Field(default="", max_length=2048)


class ChangePasswordInput(BaseModel):
    currentPassword: str
    password: str = Field(min_length=8, max_length=128)
    confirmPassword: str


class ProductInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=100)
    unit: str = Field(min_length=1, max_length=20)
    active: bool = True


class MarketInput(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    area: str = Field(min_length=1, max_length=100)
    district: str = Field(min_length=1, max_length=100)
    division: str = Field(min_length=1, max_length=100)
    active: bool = True


class SubmissionInput(BaseModel):
    productId: UUID
    marketId: UUID
    unit: str = Field(min_length=1, max_length=20)
    quality: str = Field(default="Not recorded", max_length=60)
    price: float = Field(gt=0, le=100000000)
    date: date
    note: str = Field(default="", max_length=1000)
    evidenceUrl: str = Field(default="", max_length=2048)


class ReviewInput(BaseModel):
    status: Literal["verified", "rejected"]
    reason: str = Field(default="", max_length=1000)


class AlertInput(BaseModel):
    productId: UUID
    area: str = Field(default="", max_length=100)
    direction: Literal["above", "below"]
    targetPrice: float = Field(gt=0, le=100000000)
    enabled: bool = True


class SettingsInput(BaseModel):
    defaultArea: str = ""
    emailAlerts: bool = False
    inAppNotifications: bool = True
    compactTables: bool = False


class UserCreateInput(ProfileInput):
    role: Literal["user", "agent", "admin"] = "user"
    status: Literal["active", "blocked"] = "active"
    password: str = Field(min_length=8, max_length=128)


class UserUpdateInput(ProfileInput):
    role: Literal["user", "agent", "admin"]
    status: Literal["active", "blocked"]


class ORMOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)
