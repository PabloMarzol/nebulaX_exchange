# mixgo/utils/llm.py (updated version)
import json
import asyncio
import re
from typing import TypeVar, Type, Optional, Any, List, Dict
from pydantic import BaseModel
import os

# Import necessary libraries
import openai
import anthropic
from langchain_groq import ChatGroq

T = TypeVar('T', bound=BaseModel)

async def call_llm(
    prompt: List[Dict[str, str]],
    model_name: str,
    model_provider: str,
    pydantic_model: Type[T],
    agent_name: Optional[str] = None,
    max_retries: int = 3,
    default_factory = None,
    verbose: bool = False
) -> T:
    """
    Makes an asynchronous LLM call with retry logic.
    """
    from signals.utils.progress import progress
    
    # Call the LLM with retries
    for attempt in range(max_retries):
        try:
            if agent_name:
                progress.update_status(agent_name, None, f"Calling LLM (attempt {attempt+1}/{max_retries})")
            
            # Call appropriate LLM based on provider
            if model_provider.lower() == "groq":
                result = await _call_groq(prompt, model_name)
            elif model_provider.lower() == "openai":
                result = await _call_openai(prompt, model_name)
            elif model_provider.lower() == "anthropic":
                result = await _call_anthropic(prompt, model_name)
            else:
                raise ValueError(f"Unsupported model provider: {model_provider}")
            
            # Parse the response into the Pydantic model
            if result:
                if agent_name:
                    progress.update_status(agent_name, None, "Processing LLM response")
                
                # Debug print
                if result and verbose:
                    print(f"DEBUG - LLM response for {agent_name}: {result}")
                
                try:
                    # If response is a string, try to extract JSON from it
                    if isinstance(result, str):
                        # Look for JSON code blocks first
                        if "```json" in result:
                            json_content = result.split("```json")[1].split("```")[0]
                            try:
                                result = json.loads(json_content.strip())
                            except:
                                print("Failed to parse JSON code block")
                        # Try to parse as direct JSON
                        elif result.strip().startswith('{'):
                            try:
                                result = json.loads(result.strip())
                            except:
                                print("Failed to parse direct JSON")
                    
                    # If result is still not a dict, create default structure
                    if not isinstance(result, dict):
                        result = {"action": "hold", "quantity": 0, "confidence": 50.0, "reasoning": str(result)}
                    
                    # CRITICAL: Try to extract JSON object from reasoning field if it contains code blocks
                    if isinstance(result, dict) and "reasoning" in result:
                        reasoning = result.get("reasoning", "")
                        
                        # Look for JSON in the reasoning field - this is the key fix!
                        if "```" in reasoning:
                            # Find JSON between triple backticks
                            parts = reasoning.split("```")
                            for part in parts:
                                part = part.strip()
                                # Remove 'json' language identifier if present
                                if part.startswith('json\n'):
                                    part = part[5:].strip()
                                elif part.startswith('json '):
                                    part = part[5:].strip()
                                    
                                # Try to parse as JSON
                                if part.startswith('{') and part.endswith('}'):
                                    try:
                                        embedded_json = json.loads(part)
                                        print(f"Found embedded JSON: {embedded_json}")
                                        # Use the embedded JSON values - they override everything
                                        if "action" in embedded_json:
                                            result["action"] = embedded_json["action"]
                                        if "quantity" in embedded_json:
                                            result["quantity"] = embedded_json["quantity"]
                                        if "confidence" in embedded_json:
                                            result["confidence"] = embedded_json["confidence"]
                                        if "reasoning" in embedded_json:
                                            result["reasoning"] = embedded_json["reasoning"]
                                        break  # Stop after finding the first valid JSON
                                    except Exception as parse_error:
                                        print(f"Failed to parse JSON block: {parse_error}")
                                        continue
                        
                        # Also try direct JSON parsing if reasoning starts with {
                        elif reasoning.strip().startswith('{'):
                            try:
                                embedded_json = json.loads(reasoning.strip())
                                print(f"Found direct JSON in reasoning: {embedded_json}")
                                # Use the embedded JSON values
                                if "action" in embedded_json:
                                    result["action"] = embedded_json["action"]
                                if "quantity" in embedded_json:
                                    result["quantity"] = embedded_json["quantity"]
                                if "confidence" in embedded_json:
                                    result["confidence"] = embedded_json["confidence"]
                                if "reasoning" in embedded_json:
                                    result["reasoning"] = embedded_json["reasoning"]
                            except Exception as parse_error:
                                print(f"Failed to parse direct JSON in reasoning: {parse_error}")
                    
                    # Ensure all required fields are present with proper types
                    if "action" not in result or not result["action"]:
                        result["action"] = "hold"
                    if "quantity" not in result:
                        result["quantity"] = 0
                    if "confidence" not in result:
                        result["confidence"] = 50.0
                    if "reasoning" not in result:
                        result["reasoning"] = "No reasoning provided"
                    
                    # Ensure types are correct
                    result["action"] = str(result["action"]).lower()
                    result["quantity"] = int(float(str(result["quantity"])))  # Handle potential float strings
                    result["confidence"] = float(result["confidence"])
                    result["reasoning"] = str(result["reasoning"])
                    
                    # Create the model instance with the updated result
                    model_instance = pydantic_model.model_validate(result)
                    print(f"FINAL DECISION: {model_instance}")
                    return model_instance
                
                except Exception as e:
                    print(f"Failed to parse LLM response: {e}\nResponse: {result}")
                    if attempt == max_retries - 1:
                        if default_factory:
                            return default_factory()
                        return _create_default_response(pydantic_model)
            
        except Exception as e:
            if agent_name:
                progress.update_status(agent_name, None, f"Error in LLM call: {type(e).__name__}")
            
            print(f"LLM call attempt {attempt+1} failed: {e}")
            await asyncio.sleep(1)  # Wait before retry
            
            if attempt == max_retries - 1:
                print(f"All LLM call attempts failed. Using default response.")
                if default_factory:
                    return default_factory()
                return _create_default_response(pydantic_model)
    
    # Fallback - should not reach here but just in case
    if default_factory:
        return default_factory()
    return _create_default_response(pydantic_model)

async def _call_groq(messages, model_name):
    """Call Groq API."""
    try:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")
        
        # ChatGroq in LangChain has a different interface than we expected
        client = ChatGroq(
            api_key=api_key,
            model=model_name or "llama-3.3-70b-versatile"
        )
        
        # Convert the messages to the expected format
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({"role": msg["role"], "content": msg["content"]})
        
        # Use ainvoke method for async call
        response = await client.ainvoke(formatted_messages)
        
        # Parse content from response based on LangChain's format
        content = response.content
        
        # Return the raw content for parsing in the main function
        # This allows the main parsing logic to handle JSON extraction
        return content
            
    except Exception as e:
        print(f"Groq API error: {e}")
        raise

async def _call_openai(messages, model_name):
    """Call OpenAI API."""
    try:
        response = await openai.chat.completions.create(
            model=model_name,
            messages=[{"role": msg["role"], "content": msg["content"]} for msg in messages],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"OpenAI API error: {e}")
        raise

async def _call_anthropic(messages, model_name):
    """Call Anthropic API."""
    try:
        # Convert the messages format to Anthropic's format
        system = next((msg["content"] for msg in messages if msg["role"] == "system"), None)
        content = []
        for msg in messages:
            if msg["role"] == "user":
                content.append({"type": "text", "text": msg["content"]})
            elif msg["role"] == "assistant":
                content.append({"type": "text", "text": msg["content"]})
        
        response = await anthropic.messages.create(
            model=model_name,
            system=system,
            messages=content,
            max_tokens=1000,
        )
        return json.loads(response.content[0].text)
    except Exception as e:
        print(f"Anthropic API error: {e}")
        raise

def _create_default_response(model_class: Type[T]) -> T:
    """Creates a safe default response based on the model's fields."""
    default_values = {}
    for field_name, field in model_class.model_fields.items():
        if field.annotation == str:
            default_values[field_name] = "Error in analysis, using default"
        elif field.annotation == float:
            default_values[field_name] = 0.0
        elif field.annotation == int:
            default_values[field_name] = 0
        elif hasattr(field.annotation, "__origin__") and field.annotation.__origin__ == dict:
            default_values[field_name] = {}
        else:
            # For other types (like Literal), try to use the first allowed value
            if hasattr(field.annotation, "__args__"):
                default_values[field_name] = field.annotation.__args__[0]
            else:
                default_values[field_name] = None
    
    return model_class(**default_values)