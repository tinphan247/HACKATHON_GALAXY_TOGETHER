"""
Test Runner for Galaxy Together Backend Test Suite
"""

import unittest
import sys
import os

# Add backend parent folder to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(backend_dir)
sys.path.insert(0, parent_dir)

if __name__ == '__main__':
    loader = unittest.TestLoader()
    suite = loader.discover(start_dir=os.path.join(backend_dir, 'tests'), pattern='test_*.py')
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
