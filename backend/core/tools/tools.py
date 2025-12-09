from langchain.tools import tool
from backend.rag import get_vectorstore
from backend.config.schema.retrieve import RetrieveResult, Citation
@tool
def retrieve_docs(query: str):
    """检索文档,生成内容
    
    Args:
        query: 查询字符串
        
    Returns:
        tuple: (检索到的文档列表, 序列化的文档字符串)
    """
   # 1️⃣ 获取向量存储
    vectorstore = get_vectorstore()
   # 2️⃣ 检索
    retrieved_docs = vectorstore.as_retriever(search_kwargs={"k": 3}).invoke(query)
    # 3️⃣ 初始化应用队列
    citations: list[Citation] = []
    # 4️⃣ 封装数据
    for idx, doc in enumerate(retrieved_docs, start=1):
        # 安全获取 metadata 字段，提供默认值
        metadata = doc.metadata if doc.metadata else {}
        doc_id = int(metadata.get("id", idx))
        citations.append(
            Citation(
                id=doc_id,
                title=metadata.get("title", "未命名文档"),
                source=metadata.get("source", "未知来源"),
                snippet=doc.page_content[:500] if doc.page_content else "",
            )
        )
    return RetrieveResult(citations=citations)
"""
Document(
    page_content="这是文档的实际文本内容...",  # str - 主要内容
    metadata={                                 # dict - 元数据
        "source": "https://example.com/doc1.pdf",
        "page": 3,
        "title": "LangChain文档",
        "chunk_id": "chunk_001"
    }
)
"""