"""
LORE_sa Webapp Module.

This module provides a web-based interface for Local Rule-based Explanations (LORE)
of machine learning models. It includes functionality for model training, explanation
generation, and interactive visualization of decision boundaries and feature importance.

Classes
-------
Webapp
    Main webapp class for launching explanation interfaces and demo applications.
"""

from .webapp import Webapp

__all__ = [
    "Webapp"
]
