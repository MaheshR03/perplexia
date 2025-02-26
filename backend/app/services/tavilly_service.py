from tavily import TavilyClient
from fastapi import HTTPException
from app.core.config import settings

def fetch_tavily_data(query: str) -> str:
    """Fetch extra topical information from Tavilly."""
    try:
        client = TavilyClient(api_key=settings.TAVILY_API_KEY) # Initialize with API key if needed
        response = client.search(query=query)
        print(response)
        return response
    except Exception as e:
        print(f"Error fetching Tavily data: {e}")
        return ""