from chromadb import Embeddings
from langchain_chroma import Chroma
import os
import logging
logger = logging.getLogger(__name__)
from langchain_ollama import OllamaEmbeddings
from dotenv import load_dotenv
load_dotenv()
CHROMADB_PRESIST = os.environ.get("CHROMADB_PRESIST")
DOCS_INDEX_NAME = os.environ.get("DOCS_INDEX_NAME")

def init_vectorstore(embedding_model: Embeddings) -> Chroma:
    """初始化向量存储"""
    logger.info(f"Initializing Chroma vector store at {CHROMADB_PRESIST}")
    
    # 创建持久化目录
    os.makedirs(CHROMADB_PRESIST, exist_ok=True)
    
    # 初始化Chroma
    vectorstore = Chroma(
        persist_directory=CHROMADB_PRESIST,
        embedding_function=embedding_model,
        collection_name=DOCS_INDEX_NAME,
        collection_metadata={"hnsw:space": "cosine"}
    )
    
    return vectorstore

def get_embeddings_model() -> Embeddings:
    return OllamaEmbeddings(
        model = "qwen3-embedding:4b"
    )

# gpt_3_5 = ChatOpenAI(model="gpt-3.5-turbo-0125", temperature=0, streaming=True)
# claude_3_haiku = ChatAnthropic(
#     model="claude-3-haiku-20240307",
#     temperature=0,
#     max_tokens=4096,
#     anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY", "not_provided"),
# )
# fireworks_mixtral = ChatFireworks(
#     model="accounts/fireworks/models/mixtral-8x7b-instruct",
#     temperature=0,
#     max_tokens=16384,
#     fireworks_api_key=os.environ.get("FIREWORKS_API_KEY", "not_provided"),
# )
# gemini_pro = ChatGoogleGenerativeAI(
#     model="gemini-pro",
#     temperature=0,
#     max_tokens=16384,
#     convert_system_message_to_human=True,
#     google_api_key=os.environ.get("GOOGLE_API_KEY", "not_provided"),
# )
# cohere_command = ChatCohere(
#     model="command",
#     temperature=0,
#     cohere_api_key=os.environ.get("COHERE_API_KEY", "not_provided"),
# )
# llm = gpt_3_5.configurable_alternatives(
#     # This gives this field an id
#     # When configuring the end runnable, we can then use this id to configure this field
#     ConfigurableField(id="llm"),
#     default_key="openai_gpt_3_5_turbo",
#     anthropic_claude_3_haiku=claude_3_haiku,
#     fireworks_mixtral=fireworks_mixtral,
#     google_gemini_pro=gemini_pro,
#     cohere_command=cohere_command,
# ).with_fallbacks(
#     [gpt_3_5, claude_3_haiku, fireworks_mixtral, gemini_pro, cohere_command]
