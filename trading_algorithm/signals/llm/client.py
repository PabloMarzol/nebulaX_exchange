from typing import Any, Dict, Type, TypeVar
from pydantic import BaseModel

T = TypeVar('T', bound=BaseModel)

class LLMClient:
    """Client for interacting with LLM services."""
    
    def __init__(self, model_name: str, model_provider: str):
        """
        Initialize the LLM client.
        
        Args:
            model_name: Name of the LLM model to use
            model_provider: Provider of the LLM model (e.g., OpenAI)
        """
        self.model_name = model_name
        self.model_provider = model_provider
    
    async def generate_decision(
        self, 
        context: Dict[str, Any], 
        system_prompt: str,
        output_model: Type[T],
        verbose: bool = False
    ) -> T:
        """
        Generate a structured decision using the LLM.
        """
        # Import here to avoid circular imports
        from signals.utils.llm import call_llm
        
        # Format the prompt with context info and explicitly ask for JSON
        user_prompt = (
            f"Please analyze the following trading signals and make a decision for {context['ticker']}.\n\n"
            f"Signals: {context['signals']}\n\n"
            f"Current Position: {context['position']}\n\n"
            f"Current Price: ${context['price']:,.2f}\n\n"
            f"Available Cash: ${context['cash']:,.2f}\n\n"
            f"Portfolio Context: {context['portfolio_context']}\n\n"
            f"Generate a trading decision with action, quantity, confidence, and reasoning.\n\n"
            f"IMPORTANT: Your response must be a valid JSON object with these keys:\n"
            f"- action: One of 'buy', 'sell', 'short', 'cover', or 'hold'\n"
            f"- quantity: Integer number of shares to trade\n"
            f"- confidence: Your confidence level from 0-100\n"
            f"- reasoning: Detailed explanation for the decision\n\n"
            f"Example format:\n"
            f"{{\n"
            f"  \"action\": \"buy\",\n"
            f"  \"quantity\": 100,\n"
            f"  \"confidence\": 75.5,\n"
            f"  \"reasoning\": \"Strong bullish signals...\"\n"
            f"}}\n\n"
            f"RESPOND ONLY WITH A VALID JSON OBJECT WITH THESE EXACT KEYS."
        )
        
        # Call the LLM with retry logic
        return await call_llm(
            prompt=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model_name=self.model_name,
            model_provider=self.model_provider,
            pydantic_model=output_model,
            agent_name="mixgo_agent",
            max_retries=3,
            verbose = verbose
        )