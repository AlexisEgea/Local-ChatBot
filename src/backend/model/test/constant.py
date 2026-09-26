"""Test provider identifiers and fixed reply."""

PROVIDER_ID = "Test Provider"
COMPANY_ID = "Test Company"
MODEL_ID = "Test Model"

REPLY = r'''Here’s a very simple Python function that takes two arguments and returns their sum:

```python
def add(a, b):
    """
    Return the sum of two values.

    Parameters
    ----------
    a : numeric
        First operand (int, float, complex, etc.).
    b : numeric
        Second operand.

    Returns
    -------
    numeric
        a + b
    """
    return a + b
```

### Quick usage

```python
print(add(3, 5))          # → 8
print(add(2.5, 4.1))      # → 6.6
print(add(-1, 1))         # → 0
```

### One‑liner alternative (if you prefer a lambda)

```python
add = lambda a, b: a + b
```

Both versions work exactly the same; just pick the style you like!
'''
