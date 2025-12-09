import asyncio
import json
from typing import AsyncGenerator
from backend.config.schema.chat import ChatRequest
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from backend.core.agents.agent import agent
load_dotenv()

print("✅ Agentic RAG Agent enabled")
print("🧠 Agent decides when to use tools autonomously")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# @app.post("/chat/stream")

# async def chat_stream(request: ChatRequest):
#     """流式聊天接口-updates"""
    
#     async def event_stream() -> AsyncGenerator[str, None]:
#         async for chunk in agent.astream(
#             {"messages": [{"role": "user", "content": request.question}]},
#             stream_mode="updates",
#             stream_subgraphs=True
#         ):
            
#             chunk_data = {
#                 "type": "chunk",
#                 "data": chunk,
#                 "timestamp": asyncio.get_event_loop().time()
#             }
#             yield f"data: {json.dumps(chunk_data, ensure_ascii=False, default=str)}\n\n"
  

#     return StreamingResponse(
#         event_stream(),
#         media_type="text/event-stream",  # ✅ SSE标准格式
#         headers={
#             "Cache-Control": "no-cache",
#             "Connection": "keep-alive",
#             "X-Accel-Buffering": "no"
#         }
#     )
"""
  {
  "type": "chunk",
  "data": {
    "model": {
      "messages": [单个完整消息对象]
    }
  }
}
"""    
@app.post("/chat/messages")
async def chat_stream(request: ChatRequest):
    
    input_dict = {
        "messages": [msg.model_dump() for msg in request.messages]
    }
    
    # 构建配置参数
    config_dict = {}
    if request.configurable:
        config_dict["configurable"] = request.configurable.model_dump(exclude_none=True)
    
    async def gen():
        # ✅ astream() 返回异步迭代器
        async for token_chunk, metadata in agent.astream(
            input_dict,
            config=config_dict if config_dict else None,
            stream_mode="messages"
        ):
            node = metadata['langgraph_node']
            
            for block in token_chunk.content_blocks:
                if node == "model":
                    if block["type"] == "text":
                        yield f"data: {json.dumps({'text': block['text']})}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(gen(), media_type="text/event-stream")
"""
{
  "type": "chunk", 
  "data": [
    "content='你好'...",  // 内容片段
    {元数据对象}           // 元数据
  ]
}
"""



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app)