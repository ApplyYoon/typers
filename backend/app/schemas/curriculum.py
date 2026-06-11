from pydantic import BaseModel


class CurriculumStageResult(BaseModel):
    id: int
    mode: str
    status: str  # locked | current | completed
    best_cpm: int
    best_accuracy: int
    pass_cpm: int
    pass_accuracy: int
