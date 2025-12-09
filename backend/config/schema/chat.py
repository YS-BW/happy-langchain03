"""Chat domain models."""
from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Dict, Any, Union


class Message(BaseModel):
    """单条消息模型"""
    role: Literal["user", "assistant", "system", "tool"]
    content: str


class ConfigurableOptions(BaseModel):
    """可配置选项，如线程ID等"""
    thread_id: str = Field(None, description="会话线程ID")
    # 可以添加更多可配置项
    # user_id: Optional[str] = Field(None, description="用户ID")


# class ModelConfig(BaseModel):
#     """模型配置选项"""
#     model: Optional[str] = Field(None, description="模型名称")
#     temperature: Optional[float] = Field(None, description="温度参数", ge=0.0, le=1.0)
#     max_tokens: Optional[int] = Field(None, description="最大token数")
#     # 可以添加更多模型参数


class ChatRequest(BaseModel):
    """聊天请求完整模型 - 支持声明式API"""
    messages: List[Message] = Field(..., description="消息列表")
    # model_config: Optional[ModelConfig] = Field(None, description="模型配置参数")
    configurable: ConfigurableOptions = Field(None, description="可配置选项")
    # metadata: Optional[Dict[str, Any]] = Field(None, description="额外元数据")