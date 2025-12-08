import logging
import bs4
from langchain_community.document_loaders import WebBaseLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings
from langchain_chroma import Chroma
from dotenv import load_dotenv
import os
load_dotenv()

# ✅ 正确配置日志，不要再 from logging import log
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

def get_vectorstore():
    """获取向量数据库（自动判断是否需要创建）"""
    
    persist_dir = os.getenv("CHROMADB_PRESIST")
    collection_name = os.getenv("DOCS_INDEX_NAME")
    
    embeddings = OllamaEmbeddings(
        model=os.getenv("OLLAMA_EMBEDDING_MODEL"),
    )
    
    # ✅ 检查向量库是否已存在
    if persist_dir and os.path.exists(persist_dir) and os.listdir(persist_dir):
        log.info("✅ 检测到已有向量库，直接加载...")
        vectorstore = Chroma(
            collection_name=collection_name,
            embedding_function=embeddings,
            persist_directory=persist_dir,
        )
        log.info(f"✅ 向量库加载成功! 文档数量: {vectorstore._collection.count()}")
        return vectorstore
    
    # ❌ 向量库不存在，创建新的
    log.info("⏳ 向量库不存在，开始创建...")
    
    bs4_strainer = bs4.SoupStrainer()
    loader = WebBaseLoader(
        web_paths=[
            "https://docs.langchain.com/oss/python/langchain/knowledge-base",
        ],
    )
    docs = loader.load()
    log.info(f"✅ 共加载{len(docs)}条文档")
    
    text_split = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    docs = text_split.split_documents(docs)
    
    vectorstore = Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=persist_dir,
    )
    
    vectorstore.add_documents(docs)
    log.info("✅ 向量库创建并添加文档成功!")
    return vectorstore



if __name__ == "__main__":
    get_vectorstore()



