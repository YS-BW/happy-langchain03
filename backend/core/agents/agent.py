from langchain.agents import create_agent
import os
from dotenv import load_dotenv
from langchain_deepseek import ChatDeepSeek
from backend.core.tools.tools import retrieve_docs
from backend.core.prompts import AGENT_PROMPT
load_dotenv()

llm = ChatDeepSeek(
    model="deepseek-chat"
)

tools = [retrieve_docs]


agent = create_agent(
    model=llm,
    tools=tools,
    system_prompt=AGENT_PROMPT,
    # middleware=middleware
)
