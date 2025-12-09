from pydantic import BaseModel
from typing import List

class Citation(BaseModel):
    id: int
    title: str
    source: str
    snippet: str | None = None
    

class RetrieveResult(BaseModel):
    citations: List[Citation]
    
    def __str__(self) -> str:
        """自定义字符串表示，便于 LLM 理解"""
        if not self.citations:
            return "检索结果：未找到相关文档。"
        
        result = f"检索到 {len(self.citations)} 个相关文档：\n\n"
        for citation in self.citations:
            result += f"[{citation.id}]\n"
            result += f"标题：{citation.title}\n"
            result += f"来源：{citation.source}\n"
            if citation.snippet:
                result += f"摘要：{citation.snippet}\n"
            result += "\n"
        
        return result