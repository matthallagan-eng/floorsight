from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Machine, User
from ..schemas import MachineOut

router = APIRouter(prefix="/machines", tags=["machines"])


@router.get("", response_model=list[MachineOut])
def list_machines(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return db.query(Machine).filter(Machine.owner_id == current_user.id).all()