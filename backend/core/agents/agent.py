from langchain.agents import create_agent
from dotenv import load_dotenv
from langchain_deepseek import ChatDeepSeek
from backend.config.schema.agent_state import AgentState
from backend.core.tools.tools import retrieve_docs, web_search
from backend.core.prompts import AGENT_PROMPT
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
import os
from langgraph.checkpoint.memory import InMemorySaver  
load_dotenv()
DB_URI = os.getenv("DB_URI")

def get_or_create_agent():
    print("🔄 正在初始化智能体检查点器和模型...")
    checkpointer = InMemorySaver()
    # async with AsyncPostgresSaver.from_conn_string(DB_URI) as checkpointer:
    #     await checkpointer.setup()
    print("✅ 数据库检查点器初始化完成")
    llm = ChatDeepSeek(model="deepseek-chat")
    tools = [retrieve_docs,web_search]
    _agent_instance = create_agent(
    model=llm, tools=tools, system_prompt=AGENT_PROMPT,
        state_schema=AgentState, checkpointer=checkpointer
    )
    print("✅ 智能体创建完成")
    return _agent_instance
