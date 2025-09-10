import os
import sys

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from indexing.store import query_collection


def reterive_from_store(query, k=2):
    results = query_collection(query, k)
    print("results", results)
    return results


# reterive_from_store("Can we deliver order from created state?", k=3)
