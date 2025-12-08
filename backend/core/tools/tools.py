from langchain.tools import tool
from backend.rag import get_vectorstore

@tool
def retrieve_docs(query: str):
    """检索文档,生成内容
    
    Args:
        query: 查询字符串
        
    Returns:
        tuple: (检索到的文档列表, 序列化的文档字符串)
    """
    try:
        vectorstore = get_vectorstore()
        retriever = vectorstore.as_retriever(search_kwargs={"k": 2})
        retrieved_docs = retriever.invoke(query)
        serialized = "\n\n".join(
            (f"Source: {doc.metadata}\nContent: {doc.page_content}")
            for doc in retrieved_docs
        )
        return retrieved_docs, serialized
    except Exception as e:
        return [], f"检索文档时出错: {str(e)}"