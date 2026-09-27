"""Test provider identifiers and fixed reply."""

PROVIDER_ID = "Test Provider"
COMPANY_ID = "Test Company"
MODEL_ID = "Test Model"

REPLY = r'''**Complex Number**

A complex number is an ordered pair of real numbers \((a,b)\) that is commonly written in the form  

\[
z = a + bi,
\]

where

* \(a\) is the **real part** \(\Re(z)\),
* \(b\) is the **imaginary part** \(\Im(z)\),  
* \(i\) is the imaginary unit, defined by \(i^{2} = -1\).

---

### Key Features

| Feature | Description |
|---------|-------------|
| **Field** | The set of all complex numbers, denoted \(\mathbb{C}\), forms an algebraically closed field: every non‑zero element has a multiplicative inverse, and every polynomial with complex coefficients has a root in \(\mathbb{C}\). |
| **Addition** | \((a+bi) + (c+di) = (a+c) + (b+d)i\). |
| **Multiplication** | \((a+bi)(c+di) = (ac-bd) + (ad+bc)i\). |
| **Complex Conjugate** | \(\overline{a+bi} = a-bi\). |
| **Modulus (Absolute Value)** | \(|a+bi| = \sqrt{a^{2}+b^{2}}\). |
| **Polar Representation** | \(z = r(\cos\theta + i\sin\theta) = re^{i\theta}\), where \(r=|z|\) and \(\theta = \arg(z)\). |
| **Division** | \(\dfrac{a+bi}{c+di} = \dfrac{(a+bi)(c-di)}{c^{2}+d^{2}}\). |

---

### Examples

1. \(3 + 4i\)  
   *Real part:* 3, *Imaginary part:* 4.  
   *Modulus:* \(5\) (because \(3^{2}+4^{2}=25\)).

2. \(-2i = 0 - 2i\)  
   *Real part:* 0, *Imaginary part:* \(-2\).

3. \(i^{3} = i^{2}\cdot i = (-1)\cdot i = -i\).

---

### Applications

* **Engineering & Physics** – phasors, impedance, wave equations.  
* **Mathematics** – solving quadratic equations, complex analysis, Fourier transforms.  
* **Computer Science** – graphics, signal processing, cryptography.  

--- 

**Bottom line:** A complex number extends the real numbers by adding a unit \(i\) with the property \(i^{2}=-1\), allowing the algebraic manipulation of quantities that naturally involve rotations and oscillations.

Certainly! Below is a simple example of a Python class for handling complex numbers. This class includes methods for addition, subtraction, multiplication, division, and comparison.

```python
class ComplexNumber:
    def __init__(self, real, imag):
        self.real = real
        self.imag = imag

    def __str__(self):
        return f"{self.real} + {self.imag}i"

    def __add__(self, other):
        if isinstance(other, ComplexNumber):
            real_sum = self.real + other.real
            imag_sum = self.imag + other.imag
            return ComplexNumber(real_sum, imag_sum)
        else:
            raise TypeError("Both operands must be ComplexNumber objects")

    def __sub__(self, other):
        if isinstance(other, ComplexNumber):
            real_difference = self.real - other.real
            imag_difference = self.imag - other.imag
            return ComplexNumber(real_difference, imag_difference)
        else:
            raise TypeError("Both operands must be ComplexNumber objects")

    def __mul__(self, other):
        if isinstance(other, ComplexNumber):
            real_product = self.real * other.real - self.imag * other.imag
            imag_product = self.imag * other.real + self.real * other.imag
            return ComplexNumber(real_product, imag_product)
        else:
            raise TypeError("Both operands must be ComplexNumber objects")

    def __truediv__(self, other):
        if isinstance(other, ComplexNumber):
            denominator_squared = other.real * other.real + other.imag * other.imag
            reciprocal_real = self.real / denominator_squared
            reciprocal_imag = self.imag / denominator_squared
            return ComplexNumber(reciprocal_real, reciprocal_imag)
        else:
            raise TypeError("Both operands must be ComplexNumber objects")

    def __eq__(self, other):
        if isinstance(other, ComplexNumber):
            return self.real == other.real and self.imag == other.imag
        else:
            return False

    def __ne__(self, other):
        return not self.__eq__(other)

    def __lt__(self, other):
        if isinstance(other, ComplexNumber):
            return self.real < other.real or (self.real == other.real and self.imag < other.imag)
        else:
            return False

    def __le__(self, other):
        if isinstance(other, ComplexNumber):
            return self.real <= other.real or (self.real == other.real and self.imag <= other.imag)
        else:
            return False

    def __gt__(self, other):
        if isinstance(other, ComplexNumber):
            return self.real > other.real or (self.real == other.real and self.imag > other.imag)
        else:
            return False

    def __ge__(self, other):
        if isinstance(other, ComplexNumber):
            return self.real >= other.real or (self.real == other.real and self.imag >= other.imag)
        else:
            return False

# Example usage:
complex_num1 = ComplexNumber(3, 4)
complex_num2 = ComplexNumber(2, 5)

# Addition
result_addition = complex_num1 + complex_num2
print(result_addition)  # Output: (5, 9)

# Subtraction
result_subtraction = complex_num1 - complex_num2
print(result_subtraction)  # Output: (1, 4)

# Multiplication
result_multiplication = complex_num1 * complex_num2
print(result_multiplication)  # Output: (7, 20)

# Division
result_division = complex_num1 / complex_num2
print(result_division)  # Output: (1.5, 0.8660254037844386)

# Comparison
print(complex_num1 == complex_num2)  # Output: True
print(complex_num1 != complex_num2)  # Output: False
print(complex_num1 < complex_num2)  # Output: True
print(complex_num1 <= complex_num2)  # Output: True
print(complex_num1 > complex_num2)  # Output: False
print(complex_num1 >= complex_num2)  # Output: False
```

This class `ComplexNumber` provides basic operations such as addition, subtraction, multiplication, and division on complex numbers, along with comparisons between them.
'''
