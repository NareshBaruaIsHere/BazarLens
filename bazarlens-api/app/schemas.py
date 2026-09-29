from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ProductOut(BaseModel):
    id: int
    name: str
    category_id: Optional[int]

    class Config:
        from_attributes = True

class PriceSubmissionOut(BaseModel):
    id: int
    product_id: Optional[int]
    location_id: Optional[int]
    price: float
    quantity: float
    submitted_at: Optional[datetime]

    class Config:
        from_attributes = True