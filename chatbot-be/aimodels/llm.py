from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv

load_dotenv()

small_model = os.getenv("MODEL") or "gpt-5-mini-2025-08-07"
reasoning_model = "gpt-5.4"
temperature = os.getenv("TEMPERATURE") or 0  # 0.0 - 1.0

llm = ChatOpenAI(
        model=reasoning_model,
        temperature=temperature,
        api_key=os.getenv("OPENAI_API_KEY")  # this is the API key for the OpenAI API
    )   
small_llm = llm = ChatOpenAI(
        model=small_model,
        temperature=temperature,
        api_key=os.getenv("OPENAI_API_KEY")  # this is the API key for the OpenAI API
    )  