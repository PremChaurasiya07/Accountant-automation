# async def semantic_search_and_answer(
#     user_input: str,
#     user_id: str,
#     embed_function,
#     supabase_client,
#     fallback_chain,
#     llm_chain,
#     top_k: int = 3
# ):
#     # 1. Embed the query
#     embedding = embed_function(user_input)

#     # 2. Search vector DB
#     query_resp = supabase_client.rpc(
#         "match_invoice_embeddings_user",  # Supabase function
#         {
#             "query_embedding": embedding,
#             "user_id": str(user_id),
#             "match_count": top_k
#         }
#     ).execute()

#     matches = query_resp.data or []
#     print("Matches found:", matches)

#     # 3. If matches found, build context
#     if matches:
#         context_chunks = [
#             f"[{m['chunk_type'].capitalize()}]\n{m['content'].strip()}"
#             for m in matches
#         ]
#         context_text = "\n\n".join(context_chunks)
#         print(user_input, "context_text", context_text)

#         try:
#             # 🚨 MUST await if LLM is async-compatible
#             answer = await llm_chain.ainvoke({
#                 "user_question": user_input,
#                 "retrieved_context": context_text
#             })

#             # Handle case when answer is a dict or plain string
#             if isinstance(answer, dict):
#                 return answer.get("text", "").strip()
#             elif isinstance(answer, str):
#                 return answer.strip()
#             else:
#                 return "⚠️ Unexpected LLM response format."

#         except Exception as e:
#             print("❌ LLMChain Error:", e)
#             return "⚠️ Sorry, the assistant is currently unavailable due to rate limits. Please try again later."

#     # 4. If no context found, fallback
#     try:
#         fallback = await fallback_chain.ainvoke({
#             "intent": "query",
#             "user_input": user_input
#         })
#         if isinstance(fallback, dict):
#             return fallback.get("text", "").strip()
#         elif isinstance(fallback, str):
#             return fallback.strip()
#         else:
#             return "⚠️ Unexpected fallback response format."
#     except Exception as e:
#         print("❌ FallbackChain Error:", e)
#         return "⚠️ Sorry, unable to process your query at this time."



###correct 
# import re
# import logging
# from app.core.supabase import supabase
# from app.services.embedding import get_query_embedding

# logging.basicConfig(level=logging.INFO)

# def _get_invoice_by_semantic_search(user_input: str, user_id: str, top_k: int = 3) -> list:
#     """Performs a semantic search for general content queries."""
#     logging.info(f"🧠 Performing semantic search for: '{user_input}'")
#     embedding = get_query_embedding(user_input)
#     if not embedding: return []

#     query_resp = supabase.rpc("match_invoice_embeddings_user", {
#         "query_embedding": embedding,
#         "user_id": str(user_id),
#         "match_count": top_k
#     }).execute()
    
#     all_matches = query_resp.data or []
#     matches = [m for m in all_matches if m.get('similarity', 0) > 0.35]
#     return matches

# def _get_invoice_by_attribute(user_id: str, sort_by: str = "id", ascending: bool = False) -> list:
#     """
#     Fetches a single invoice based on sorting (e.g., the latest).
#     FIX: Default sort column changed to 'id'.
#     """
#     logging.info(f"📄 Fetching invoice by recency (Latest first: {not ascending}) using column '{sort_by}'")
    
#     record_resp = supabase.from_("invoices_record") \
#         .select("id") \
#         .eq("user_id", user_id) \
#         .order(sort_by, desc=not ascending) \
#         .limit(1) \
#         .execute()
        
#     if not record_resp.data: return []

#     invoice_id = record_resp.data[0]["id"]
#     chunks_resp = supabase.from_("invoice_embeddings").select("chunk_type, content").eq("invoice_id", invoice_id).execute()
#     return chunks_resp.data or []

# def get_context_for_query(user_input: str, user_id: str) -> str:
#     """Analyzes the query and routes it to the correct retrieval strategy."""
#     matches = []
#     normalized_input = user_input.lower()

#     if any(keyword in normalized_input for keyword in ["last", "latest", "most recent"]):
#         matches = _get_invoice_by_attribute(user_id, ascending=False)
#     elif any(keyword in normalized_input for keyword in ["first", "oldest"]):
#         matches = _get_invoice_by_attribute(user_id, ascending=True)
    
#     if not matches:
#         matches = _get_invoice_by_semantic_search(user_input, user_id)

#     if matches:
#         logging.info(f"✅ Found {len(matches)} relevant context chunks.")
#         context_chunks = [f"Context from invoice chunk (type: {m['chunk_type']}):\n---\n{m['content'].strip()}" for m in matches]
#         return "\n\n".join(context_chunks)
    
#     logging.warning("❌ No relevant invoice information was found for this query.")
#     return "No relevant invoice information was found for this query."


import re
import logging
from app.core.supabase import supabase
from app.services.embedding import get_query_embedding

logging.basicConfig(level=logging.INFO)

def _get_invoice_by_number(invoice_no_str: str, user_id: str) -> list:
    """Performs a direct database lookup for a specific invoice number."""
    logging.info(f"🔢 Performing direct lookup for invoice number containing: '{invoice_no_str}'")
    
    # First, find the specific invoice ID using a LIKE query
    record_resp = supabase.from_("invoices_record") \
        .select("id") \
        .eq("user_id", user_id) \
        .like("invoice_no", f"%{invoice_no_str}%") \
        .limit(1) \
        .execute()
        
    if not record_resp.data:
        return []

    # Now fetch all content chunks for that specific invoice ID
    invoice_id = record_resp.data[0]["id"]
    chunks_resp = supabase.from_("invoice_embeddings") \
        .select("chunk_type, content") \
        .eq("invoice_id", invoice_id) \
        .execute()
        
    return chunks_resp.data or []

def _get_invoice_by_attribute(user_id: str, sort_by: str = "id", ascending: bool = False) -> list:
    """Fetches a single invoice based on sorting (e.g., the latest)."""
    logging.info(f"📄 Fetching invoice by recency (Latest first: {not ascending}) using column '{sort_by}'")
    
    record_resp = supabase.from_("invoices_record").select("id").eq("user_id", user_id).order(sort_by, desc=not ascending).limit(1).execute()
        
    if not record_resp.data: return []

    invoice_id = record_resp.data[0]["id"]
    chunks_resp = supabase.from_("invoice_embeddings").select("chunk_type, content").eq("invoice_id", invoice_id).execute()
    return chunks_resp.data or []

def _get_invoice_by_semantic_search(user_input: str, user_id: str, top_k: int = 3) -> list:
    """Performs a semantic search for general content queries."""
    logging.info(f"🧠 Performing semantic search for: '{user_input}'")
    embedding = get_query_embedding(user_input)
    if not embedding: return []

    query_resp = supabase.rpc("match_invoice_embeddings_user", {
        "query_embedding": embedding, "user_id": str(user_id), "match_count": top_k
    }).execute()
    
    all_matches = query_resp.data or []
    return [m for m in all_matches if m.get('similarity', 0) > 0.35]

def get_context_for_query(user_input: str, user_id: str) -> str:
    """
    Analyzes the query and routes it to the correct retrieval strategy.
    """
    matches = []
    normalized_input = user_input.strip().lower()

    # --- NEW, SMARTER ROUTING LOGIC ---
    # Strategy 1: Temporal Search (e.g., "last sale")
    if any(keyword in normalized_input for keyword in ["last", "latest", "most recent", "first", "oldest"]):
        is_oldest = any(keyword in normalized_input for keyword in ["first", "oldest"])
        matches = _get_invoice_by_attribute(user_id, ascending=is_oldest)
    
    # Strategy 2: Direct Number Lookup (e.g., "057", "invoice 57")
    # This regex looks for a sequence of 2 or more digits.
    if not matches:
        number_match = re.search(r'\b\d{2,}\b', normalized_input)
        if number_match:
            matches = _get_invoice_by_number(number_match.group(0), user_id)
    
    # Strategy 3: Semantic Search (Fallback for everything else)
    if not matches:
        matches = _get_invoice_by_semantic_search(user_input, user_id)

    # --- Format the results ---
    if matches:
        logging.info(f"✅ Found {len(matches)} relevant context chunks.")
        context_chunks = [f"Context from invoice chunk (type: {m['chunk_type']}):\n---\n{m['content'].strip()}" for m in matches]
        return "\n\n".join(context_chunks)
    
    logging.warning("❌ No relevant invoice information was found for this query.")
    return "No relevant invoice information was found for this query."