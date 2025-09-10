from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv

load_dotenv()

model = os.getenv("MODEL") or "gpt-3.5-turbo"
temperature = os.getenv("TEMPERATURE") or 0.7  # 0.0 - 1.0

llm = ChatOpenAI(
        model=model,
        temperature=temperature,
        api_key=os.getenv("OPENAI_API_KEY")  # this is the API key for the OpenAI API
    )   