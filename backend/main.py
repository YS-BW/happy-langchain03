import asyncio
import json
from typing import AsyncGenerator
from backend.config.schema.chat import ChatRequest
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
# from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
# from backend.core.agents import agent
from contextlib import asynccontextmanager
from backend.core.agents import agent
from backend.core.agents.agent import get_or_create_agent
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
agent_instance = get_or_create_agent()
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
        async for token_chunk, metadata in agent_instance.astream(
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app)
    