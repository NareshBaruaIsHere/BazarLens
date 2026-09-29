from sqlalchemy import (
    Column, Integer, String, Numeric, Text, Boolean,
    ForeignKey, TIMESTAMP, Enum
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class QualityEnum(str, enum.Enum):
    good = "Good"
    moderate = "Moderate"
    poor = "Poor"

class StatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    flagged = "flagged"
    rejected = "rejected"

class RoleEnum(str, enum.Enum):
    user = "user"
    agent = "agent"
    admin = "admin"


class Category(Base):
    __tablename__ = "category"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)

    products = relationship("Product", back_populates="category")


class Location(Base):
    __tablename__ = "location"
    id = Column(Integer, primary_key=True)
    city = Column(String, nullable=False)
    thana = Column(String, nullable=False)


class Product(Base):
    __tablename__ = "product"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey("category.id"))

    category = relationship("Category", back_populates="products")


class User(Base):
    __tablename__ = "user"
    id = Column(Integer, primary_key=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    username = Column(String, unique=True, nullable=False)
    phone = Column(String)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(RoleEnum, name="user_role"), nullable=False)
    city_id = Column(Integer)
    thana_id = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP)


class PriceSubmission(Base):
    __tablename__ = "pricesubmission"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("product.id"))
    location_id = Column(Integer, ForeignKey("location.id"))
    submitted_by = Column(Integer, ForeignKey("user.id"))
    quantity = Column(Numeric)
    price = Column(Numeric)